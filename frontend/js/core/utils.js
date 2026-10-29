// Shared helpers: DOM lookup, dates, escaping, toasts, avatars
const $ = s => document.querySelector(s);
function ky(y, m, d) {
  return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}
const clone = o => JSON.parse(JSON.stringify(o));
const eq = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
function setH(el, h) {
  if (el.dataset.h !== h) {
    el.innerHTML = h;
    el.dataset.h = h;
  }
}
const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
function countUp(root) {
  if (reduce) return;
  root.querySelectorAll("b[data-n]").forEach(b => {
    const n = +b.dataset.n,
      t0 = performance.now();
    const f = t => {
      const p = Math.min(1, (t - t0) / 800),
        e = 1 - Math.pow(1 - p, 3);
      b.textContent = Math.round(n * e) + (b.dataset.s || "");
      if (p < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
}
let tt;
function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.classList.add("show");
  clearTimeout(tt);
  tt = setTimeout(() => t.classList.remove("show"), 2200);
}
function hue(n) {
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
function ini(n) {
  return n
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();
}
const todayKey = () => ky(now.getFullYear(), now.getMonth(), now.getDate());
const dayLabel = k => {
  const d = keyDate(k);
  return d.getDate() + " " + MNS[d.getMonth()] + " " + d.getFullYear();
};
