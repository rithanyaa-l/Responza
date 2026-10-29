// Live settings from the database document app/settings: statuses, working days, holidays,
// thresholds, names and locale. Nothing here has built-in values; the page waits for this
// document and re-renders whenever anyone changes it.
let SET = null,
  MN = [],
  MNS = [],
  DNL = [],
  DNS = [],
  DN1 = [];
const STS = () => (SET ? SET.statuses : []);
const stOf = c => STS().find(s => s.code === c);
const stLabel = c => (stOf(c) || {}).label || c;
const stColor = c => (stOf(c) || {}).color || "var(--muted)";
const isAtt = c => !!(stOf(c) || {}).attended;
const defSt = () => (SET && stOf(SET.defaultStatus) ? SET.defaultStatus : (STS()[0] || {}).code);
const leadLabel = () => (SET ? SET.leadLabel : "");
const zeroCounts = () => Object.fromEntries(STS().map(s => [s.code, 0]));
const attSum = o => STS().reduce((a, s) => a + (s.attended ? o[s.code] || 0 : 0), 0);
const markSum = o => STS().reduce((a, s) => a + (o[s.code] || 0), 0);
const rateFormula = () =>
  "(" +
  STS()
    .filter(s => s.attended)
    .map(s => s.label)
    .join(" + ") +
  ") ÷ (" +
  STS()
    .map(s => s.label)
    .join(" + ") +
  ")";
const keyDate = k => {
  const q = k.split("-").map(Number);
  return new Date(q[0], q[1] - 1, q[2]);
};
const holidayOf = k => (SET ? SET.holidays.find(h => h.date === k) || null : null);
const isWorkDay = k => !!SET && SET.workDays.includes(keyDate(k).getDay()) && !holidayOf(k);
const offLabel = k => {
  const h = holidayOf(k);
  return h ? h.name || "Holiday" : "Non-working day";
};
// lower-case a label for use mid-sentence, but keep abbreviations such as "WFH" as written
const lc = l => (l === l.toUpperCase() ? l : l.toLowerCase());
const stBadge = c => `<span><i class="dot" style="background:${stColor(c)}"></i>${esc(stLabel(c))}</span>`;

function buildNames() {
  const loc = SET.locale || undefined,
    f = o => {
      try {
        return new Intl.DateTimeFormat(loc, o);
      } catch (e) {
        return new Intl.DateTimeFormat(undefined, o);
      }
    };
  const ml = f({ month: "long" }),
    msh = f({ month: "short" }),
    wl = f({ weekday: "long" }),
    ws = f({ weekday: "short" }),
    wn = f({ weekday: "narrow" });
  MN = [...Array(12)].map((_, i) => ml.format(new Date(2000, i, 1)));
  MNS = [...Array(12)].map((_, i) => msh.format(new Date(2000, i, 1)));
  // 1 Jan 2023 was a Sunday, so day index 0 = Sunday like Date.getDay()
  DNL = [...Array(7)].map((_, i) => wl.format(new Date(2023, 0, 1 + i)));
  DNS = [...Array(7)].map((_, i) => ws.format(new Date(2023, 0, 1 + i)));
  DN1 = [...Array(7)].map((_, i) => wn.format(new Date(2023, 0, 1 + i)));
}

function setOpts(sel, opts) {
  const v = sel.value;
  sel.innerHTML = opts.map(([k, t]) => `<option value="${esc(k)}">${esc(t)}</option>`).join("");
  if (opts.some(o => o[0] === v)) sel.value = v;
}

// Everything on the page that shows a name, status, legend or rule comes from SET
function applySettings(d) {
  SET = d;
  buildNames();
  const app = SET.appName,
    org = SET.orgName,
    logo = SET.logo;
  document.title = app;
  ["#brandName", "#ftName", "#ftCopy"].forEach(s => ($(s).textContent = app));
  ["#brandTag", "#ftTag"].forEach(s => ($(s).textContent = SET.tagline));
  document.querySelectorAll("img.logo").forEach(i => {
    if (logo) i.src = logo;
    i.hidden = !logo;
    i.alt = org ? org + " logo" : "";
  });
  const ic = $("link[rel=icon]");
  if (ic && logo) ic.href = logo;
  const labels = STS().map(s => lc(s.label));
  $("#heroD").textContent =
    "Log each team member’s daily scrum status (" +
    (labels.length > 1 ? labels.slice(0, -1).join(", ") + " or " + labels[labels.length - 1] : labels.join("")) +
    "), then track attendance by module, role and month to spot trends early.";
  $("#regLeg").innerHTML = STS()
    .map(s => stBadge(s.code))
    .join("");
  $("#ftKey").innerHTML = STS()
    .map(s => stBadge(s.code))
    .join("");
  const t = SET.thresholds;
  $("#calLeg").innerHTML =
    `<span><i class="dot" style="background:var(--p)"></i>${t.good}%+</span><span><i class="dot" style="background:var(--l)"></i>${t.warn}–${Math.max(t.warn, t.good - 1)}%</span><span><i class="dot" style="background:var(--a)"></i>Below ${t.warn}%</span>`;
  $("#helpStatus").innerHTML = STS()
    .map(
      s =>
        `<b style="color:${s.color}">${esc(s.label)} (${esc(s.code)})</b><span>${s.attended ? "Counts as attended." : "Lowers the attendance rate."}</span>`,
    )
    .join("");
  $("#helpRate").textContent = "Attendance % = " + rateFormula() + ".";
  $("#helpDays").textContent =
    "Working days: " +
    SET.workDays.map(w => DNL[w]).join(", ") +
    (SET.holidays.length
      ? " · " + SET.holidays.length + " holiday" + (SET.holidays.length > 1 ? "s" : "") + " set"
      : "") +
    ". Other days are not tracked.";
  $("#allP").textContent = "Mark all " + lc(stLabel(defSt()));
  setOpts($("#rgSort"), [
    ["name", "Members: Name A–Z"],
    ["nameZ", "Members: Name Z–A"],
    ["role", "Members: Role A–Z"],
    ["high", "Members: Attendance high → low"],
    ["low", "Members: Attendance low → high"],
    ...STS().flatMap(s => [
      ["most:" + s.code, "Members: Most " + s.label],
      ["fewest:" + s.code, "Members: Fewest " + s.label],
    ]),
  ]);
  setOpts($("#rgFilt"), [
    ["", "All members"],
    ["low", "Attendance below " + t.low + "%"],
    ...STS().map(s => ["has:" + s.code, "Has " + s.label]),
    ["clean", "Only attended statuses"],
  ]);
  setOpts($("#memSort"), [
    ["name", "Sort: Name (A–Z)"],
    ["high", "Sort: Attendance high → low"],
    ["low", "Sort: Attendance low → high"],
    ...STS().map(s => ["most:" + s.code, "Sort: Most " + s.label]),
  ]);
  if (mf.met !== "rate" && mf.met !== "mix" && !stOf(mf.met)) mf.met = "rate";
  if (yf.met !== "rate" && yf.met !== "mix" && !stOf(yf.met)) yf.met = "rate";
  setIns(insView);
  lastSig = "";
}
