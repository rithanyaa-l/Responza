// Scroll lock behind dialogs, help guide, click-outside close, custom select dropdown
(() => {
  let y = 0,
    on = false;
  const lock = () => {
    if (on) return;
    on = true;
    y = window.scrollY;
    document.body.style.top = -y + "px";
    document.body.classList.add("noscroll");
  };
  const unlock = () => {
    if (!on) return;
    on = false;
    document.body.classList.remove("noscroll");
    document.body.style.top = "";
    window.scrollTo(0, y);
  };
  const sync = () => (document.querySelector("dialog[open]") ? lock() : unlock());
  new MutationObserver(sync).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
  sync();
  // month picker + module dropdowns are popovers: keep the page still while they are open
  const guard = e => {
    if ($("#mpop").hidden && !document.querySelector(".msp:not([hidden])")) return;
    const t = e.target;
    if (t && t.closest && t.closest(".msp")) return;
    e.preventDefault();
  };
  addEventListener("wheel", guard, { passive: false });
  addEventListener("touchmove", guard, { passive: false });
})();

// help guide
$("#fHelp").onclick = e => {
  e.preventDefault();
  $("#helpdlg").showModal();
  $("#helpdlg").scrollTop = 0;
};
$("#helpClose").onclick = $("#helpClose2").onclick = () => $("#helpdlg").close();
$("#helpToc").onclick = e => {
  const b = e.target.closest("button[data-t]");
  if (b) document.getElementById(b.dataset.t).scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
};

// click outside a popup closes it
(() => {
  let down = false;
  const out = (e, d) => {
    const r = d.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  document.addEventListener(
    "pointerdown",
    e => {
      const d = e.target;
      down = !!(d.matches && d.matches("dialog[open]") && out(e, d));
    },
    true,
  );
  document.addEventListener(
    "click",
    e => {
      const d = e.target;
      if (down && d.matches && d.matches("dialog[open]") && out(e, d)) d.close();
      down = false;
    },
    true,
  );
})();

// ===== modern dropdown (replaces the native list for mouse users) =====
(() => {
  let pn = null,
    cs = null;
  const close = () => {
    if (pn) {
      pn.remove();
      pn = null;
      cs = null;
    }
  };
  function open(s) {
    close();
    cs = s;
    const p = document.createElement("div");
    p.className = "ddp";
    p.setAttribute("role", "listbox");
    const opt = o =>
      `<button type="button" class="ddo${o.selected ? " on" : ""}" data-i="${[...s.options].indexOf(o)}" role="option"${o.disabled ? " disabled" : ""}>${esc(o.textContent)}</button>`;
    p.innerHTML = [...s.children]
      .map(o =>
        o.tagName === "OPTGROUP"
          ? `<div class="ddg">${esc(o.label)}</div>` + [...o.children].map(opt).join("")
          : opt(o),
      )
      .join("");
    (s.closest("dialog") || document.body).append(p);
    pn = p;
    const r = s.getBoundingClientRect(),
      below = innerHeight - r.bottom - 12,
      up = below < 200 && r.top > below,
      h = Math.min(320, Math.max(140, up ? r.top - 12 : below)),
      w = Math.max(r.width, 180);
    p.style.cssText =
      `left:${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px;min-width:${w}px;max-height:${h}px;` +
      (up ? `bottom:${innerHeight - r.top + 4}px` : `top:${r.bottom + 4}px`);
    const on = p.querySelector(".ddo.on") || p.querySelector(".ddo");
    if (on) {
      on.focus({ preventScroll: true });
      on.scrollIntoView({ block: "nearest" });
    }
    p.onclick = e => {
      const b = e.target.closest(".ddo");
      if (!b || b.disabled) return;
      const t = cs;
      close();
      t.value = t.options[+b.dataset.i].value;
      t.dispatchEvent(new Event("change", { bubbles: true }));
      t.focus();
    };
    p.onkeydown = e => {
      const bs = [...p.querySelectorAll(".ddo:not(:disabled)")],
        i = bs.indexOf(document.activeElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        (bs[i + 1] || bs[0]).focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        (bs[i - 1] || bs[bs.length - 1]).focus();
      }
    };
  }
  document.addEventListener(
    "pointerdown",
    e => {
      const t = e.target;
      if (pn && !(t.closest && t.closest(".ddp"))) {
        const same = t.closest && t.closest("select") === cs;
        close();
        if (same) {
          e.preventDefault();
          return;
        }
      }
      const s = t.closest && t.closest("select");
      if (!s || e.pointerType !== "mouse" || s.disabled || s.multiple) return;
      e.preventDefault();
      s.focus();
      open(s);
    },
    true,
  );
  document.addEventListener(
    "keydown",
    e => {
      if (e.key === "Escape" && pn) {
        e.preventDefault();
        e.stopPropagation();
        const t = cs;
        close();
        t && t.focus();
        return;
      }
      const s = e.target;
      if (s && s.matches && s.matches("select") && !s.disabled && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        e.stopPropagation();
        open(s);
      }
    },
    true,
  );
  addEventListener(
    "scroll",
    e => {
      if (pn && !(e.target.nodeType === 1 && e.target.closest(".ddp"))) close();
    },
    true,
  );
  addEventListener("resize", close);
})();
