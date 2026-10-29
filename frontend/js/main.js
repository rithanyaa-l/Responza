// Start-up: toasts on key actions, day rollover, first render and connection
$("#yr").textContent = now.getFullYear();
S = empty();
[
  ["mdAdd", () => S.modules.length, "Module added"],
  ["save", () => S.members.length, "Member added"],
].forEach(([id, c, m]) => {
  const o = $("#" + id).onclick;
  $("#" + id).onclick = () => {
    const n = c();
    o();
    if (c() > n) toast(m);
  };
});
[["allP", () => "All marked " + lc(stLabel(defSt()))]].forEach(([id, m]) => {
  const o = $("#" + id).onclick;
  $("#" + id).onclick = () => {
    o();
    toast(m());
  };
});
// roll "today" over at midnight when the page stays open
function rollDay() {
  const d = new Date();
  if (d.toDateString() === now.toDateString()) return;
  const ot = ky(now.getFullYear(), now.getMonth(), now.getDate()),
    oy = now.getFullYear(),
    om = now.getMonth();
  now = d;
  if (md === ot) {
    md = ky(d.getFullYear(), d.getMonth(), d.getDate());
    mcal = { y: d.getFullYear(), m: d.getMonth() };
  }
  if (!dsel && cur.y === oy && cur.m === om) cur = { y: d.getFullYear(), m: d.getMonth() };
  if (yf.y === oy) yf.y = d.getFullYear();
  $("#yr").textContent = d.getFullYear();
  if (!document.body.classList.contains("locked")) route();
}
setInterval(rollDay, 60000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) rollDay();
});
setIns("trend");
boot();
setTimeout(() => {
  const t = document.querySelector("th.td");
  t && view === "dash" && t.scrollIntoView({ inline: "center", block: "nearest" });
}, 50);
