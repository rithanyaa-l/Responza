// Multi-select dropdown used for module pickers
function closeMS() {
  document.querySelectorAll(".msp:not([hidden])").forEach(p => (p.hidden = true));
}
document.addEventListener("click", e => {
  if (!e.target.closest(".ms,.msp")) closeMS();
});
addEventListener(
  "scroll",
  e => {
    const t = e.target;
    if (!(t.nodeType === 1 && t.closest(".msp"))) closeMS();
  },
  true,
);
addEventListener("resize", closeMS);
function MS(host, opts, sel, cb, ph) {
  sel = sel.filter(x => opts.includes(x));
  if (host._p) host._p.remove();
  host.className = "ms";
  host.innerHTML = '<button type="button" class="msb"></button><div class="msp" hidden></div>';
  host._p = host.lastChild;
  const b = host.firstChild,
    p = host.lastChild,
    lab = () => {
      b.textContent = !sel.length
        ? ph
        : sel.length === opts.length && opts.length > 1
          ? "All modules (" + opts.length + ")"
          : sel.length > 2
            ? sel.length + " modules selected"
            : sel.join(", ");
    };
  p.innerHTML =
    '<div class="msa"><button type="button" data-a="1">Select all</button><button type="button" data-a="0">Clear</button></div>' +
    (opts
      .map(
        (o, i) => `<label><input type="checkbox" data-i="${i}"${sel.includes(o) ? " checked" : ""}>${esc(o)}</label>`,
      )
      .join("") || '<p class="hint" style="padding:6px">No modules yet.</p>');
  const sync = () => {
    p.querySelectorAll("input").forEach(c => (c.checked = sel.includes(opts[c.dataset.i])));
    lab();
    cb(sel.slice());
  };
  b.onclick = () => {
    const was = !p.hidden;
    closeMS();
    if (was) return;
    (host.closest("dialog") || document.body).append(p);
    const r = b.getBoundingClientRect(),
      below = innerHeight - r.bottom - 12,
      up = below < 180 && r.top > below,
      h = Math.min(280, Math.max(120, up ? r.top - 12 : below));
    p.style.cssText =
      `left:${r.left}px;width:${Math.max(r.width, 190)}px;max-height:${h}px;` +
      (up ? `bottom:${innerHeight - r.top + 4}px` : `top:${r.bottom + 4}px`);
    p.hidden = false;
  };
  p.onclick = e => {
    const a = e.target.dataset.a;
    if (a !== undefined) {
      sel = a === "1" ? opts.slice() : [];
      sync();
    }
  };
  p.onchange = e => {
    const o = opts[e.target.dataset.i];
    sel = e.target.checked ? [...sel, o] : sel.filter(x => x !== o);
    sync();
  };
  host.onkeydown = e => {
    if (e.key === "Enter") e.stopPropagation();
  };
  lab();
}
