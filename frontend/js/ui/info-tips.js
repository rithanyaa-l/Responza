// Info tooltips on each dashboard card
// built from the live settings, so the formula and status names always match the database
const attNames = () =>
  STS()
    .filter(s => s.attended)
    .map(s => esc(s.label))
    .join(", ") || "none";
const INFO = {
  trend: () =>
    `<b>About the monthly trend</b>Attendance for each working day of the selected month.<ul><li><strong>Attendance %</strong> = ${esc(rateFormula())}.</li><li>Use <em>Module</em>, <em>Member</em> and <em>Metric</em> to narrow the view. “Status breakdown” stacks every status per day.</li><li>Hover a bar for exact values. Non-working days and holidays are skipped.</li></ul>`,
  members: () =>
    `<b>About the member summary</b>One row per member for the selected month, with a count for each status and an attendance bar.<ul><li>Counted as attended: ${attNames()}.</li><li>Use <em>Sort</em> to rank by attendance or by any status.</li></ul>`,
};
$("#insI").onclick = e => {
  const b = e.currentTarget,
    o = b.parentElement.classList.toggle("open");
  b.setAttribute("aria-expanded", String(o));
};
document.querySelectorAll(".info .ib").forEach(b => {
  if (b.id === "insI") return;
  b.onclick = () => {
    const w = b.parentElement,
      o = !w.classList.contains("open");
    document.querySelectorAll(".info.open").forEach(x => {
      x.classList.remove("open");
      x.firstElementChild.setAttribute("aria-expanded", "false");
    });
    w.classList.toggle("open", o);
    b.setAttribute("aria-expanded", String(o));
  };
});
document.addEventListener("click", e => {
  if (!e.target.closest(".info"))
    document.querySelectorAll(".info.open").forEach(w => {
      w.classList.remove("open");
      w.firstElementChild.setAttribute("aria-expanded", "false");
    });
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape")
    document.querySelectorAll(".info.open").forEach(w => {
      w.classList.remove("open");
      w.firstElementChild.setAttribute("aria-expanded", "false");
    });
});
