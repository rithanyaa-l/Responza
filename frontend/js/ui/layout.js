// Toolbar groups, field labels, collapsible cards, section nav and entrance animation
function grp(label, items) {
  const g = document.createElement("div");
  g.className = "tg g-" + label.toLowerCase();
  g.innerHTML = `<small>${label}</small><div class="c"></div>`;
  const c = g.lastChild;
  items.forEach(i => c.append(typeof i === "string" ? $("#" + i) : i));
  return g;
}
(() => {
  const d = $("#qd").parentElement,
    m = $("#qm").parentElement,
    mo = document.querySelector("#vDash .month");
  d.classList.add("toolbar");
  d.append(
    grp("Filter", ["qd", "dFilter", "rFilter", "dClear"]),
    grp("Period", [mo, "dJump", "todayBtn"]),
    grp("Manage", ["roleBtn2", "modBtn2", "addBtn2", "mapBtn2", "setBtn2"]),
    grp("Export", ["xlsBtn2", "csvBtn"]),
  );
  m.classList.add("toolbar");
  m.append(
    grp("Filter", ["qm", "mFilter", "mClear"]),
    grp("Manage", ["roleBtn", "modBtn", "addBtn", "mapBtn", "setBtn"]),
    grp("Export", ["xlsBtn"]),
    grp("Action", ["allP"]),
  );
})();
const CAP = {
  mfMod: "Module",
  mfMem: "Member",
  mfMet: "Metric",
  yfYear: "Year",
  yfMod: "Module",
  yfMem: "Member",
  yfMet: "Metric",
  rgM: "Month",
  rgY: "Year",
  rgSort: "Sort members",
  rgFilt: "Filter members",
  rgMod: "Group modules",
  memSort: "Sort by",
};
Object.entries(CAP).forEach(([id, t]) => {
  const el = $("#" + id),
    l = document.createElement("label");
  l.className = "fld";
  l.innerHTML = "<span>" + t + "</span>";
  el.replaceWith(l);
  l.append(el);
});
document.querySelectorAll(".card").forEach(c => {
  const h = c.querySelector(":scope>.head");
  if (!h) return;
  c.classList.add("hasT");
  const b = document.createElement("button");
  b.className = "tgl";
  b.title = "Collapse / expand";
  b.setAttribute("aria-label", "Collapse or expand section");
  b.textContent = "⌃";
  b.onclick = () => c.classList.toggle("collapsed");
  h.append(b);
});
document.querySelectorAll(".snav").forEach(n => {
  n.querySelector("button[data-t]").classList.add("on");
  n.onclick = e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.ca !== undefined) {
      const cs = n.closest("#vDash,#vMark").querySelectorAll(".card.hasT"),
        all = [...cs].every(c => c.classList.contains("collapsed"));
      cs.forEach(c => c.classList.toggle("collapsed", !all));
      b.textContent = all ? "Collapse all" : "Expand all";
      return;
    }
    const t = document.getElementById(b.dataset.t);
    t.classList.remove("collapsed");
    n.querySelectorAll("button[data-t]").forEach(x => x.classList.toggle("on", x === b));
    spyLock = Date.now() + (reduce ? 150 : 900);
    t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    setTimeout(updSpy, reduce ? 200 : 950);
  };
});
let spyLock = 0;
function updSpy() {
  if (Date.now() < spyLock) return;
  const nav = document.querySelector(view === "mark" ? "#vMark .snav" : "#vDash .snav");
  if (!nav) return;
  const bs = [...nav.querySelectorAll("button[data-t]")],
    line = nav.getBoundingClientRect().bottom + 30;
  let c = bs[0];
  bs.forEach(b => {
    const el = document.getElementById(b.dataset.t);
    if (el && el.getBoundingClientRect().top <= line) c = b;
  });
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) c = bs[bs.length - 1];
  bs.forEach(b => b.classList.toggle("on", b === c));
}
let spyT = 0;
addEventListener(
  "scroll",
  () => {
    if (spyT) return;
    spyT = requestAnimationFrame(() => {
      spyT = 0;
      updSpy();
    });
  },
  { passive: true },
);
const setSh = () =>
  document.documentElement.style.setProperty("--sh", document.querySelector(".site").offsetHeight + "px");
setSh();
addEventListener("resize", setSh);
["#vDash", "#vMark"].forEach(v =>
  document
    .querySelectorAll(`${v}>header,${v}>section:not(.kpis),${v}>.card`)
    .forEach((el, i) => el.style.setProperty("--i", i)),
);
