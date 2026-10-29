// Month picker popover on the dashboard
const mpop = $("#mpop"),
  mlab = $("#mlabel");
let mpY = cur.y,
  mpAt = 0;
function mpDraw() {
  $("#mpYear").textContent = mpY;
  $("#mpGrid").innerHTML = MN.map(
    (n, i) =>
      `<button type="button" class="pm${mpY === cur.y && i === cur.m ? " on" : ""}${mpY === now.getFullYear() && i === now.getMonth() ? " now" : ""}" data-m="${i}">${n.slice(0, 3)}</button>`,
  ).join("");
}
function mpClose() {
  mpop.hidden = true;
  mlab.setAttribute("aria-expanded", "false");
}
mlab.onclick = () => {
  if (!mpop.hidden) {
    mpClose();
    return;
  }
  closeMS();
  mpY = cur.y;
  mpDraw();
  mpop.hidden = false;
  mpAt = Date.now();
  const r = mlab.getBoundingClientRect(),
    w = mpop.offsetWidth,
    h = mpop.offsetHeight;
  mpop.style.left = Math.round(Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8)) + "px";
  mpop.style.top = Math.round(r.bottom + h + 14 > innerHeight && r.top > h + 14 ? r.top - h - 6 : r.bottom + 6) + "px";
  mlab.setAttribute("aria-expanded", "true");
};
$("#mpPrev").onclick = () => {
  mpY--;
  mpDraw();
};
$("#mpNext").onclick = () => {
  mpY++;
  mpDraw();
};
$("#mpGrid").onclick = e => {
  const b = e.target.closest(".pm");
  if (!b) return;
  dsel = null;
  cur = { y: mpY, m: +b.dataset.m };
  mpClose();
  render();
};
$("#mpNow").onclick = () => {
  dsel = null;
  cur = { y: now.getFullYear(), m: now.getMonth() };
  mpClose();
  render();
};
document.addEventListener("click", e => {
  if (!e.target.closest("#mpop,#mlabel")) mpClose();
});
addEventListener(
  "scroll",
  e => {
    const t = e.target;
    if (Date.now() - mpAt < 300) return;
    if (!(t.nodeType === 1 && t.closest && t.closest("#mpop"))) mpClose();
  },
  true,
);
addEventListener("resize", mpClose);
document.addEventListener("keydown", e => {
  if (e.key === "Escape") mpClose();
});
