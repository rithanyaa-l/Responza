// App state: current month, selected date, view, filters, and the in-memory data (S)
let now = new Date();
let cur = { y: now.getFullYear(), m: now.getMonth() },
  S,
  dsel = null;

function leadName(k) {
  const m = S.members.find(x => x.id === (S.lead || {})[k]);
  return m ? m.name : "";
}
const leadOf = k => leadName(k) || leadLabel(),
  leadTip = k => (leadName(k) ? ` title="Scrum taken by ${esc(leadName(k))}"` : "");
const gk = g => g || "__none";
function memOfG(g) {
  return S.members.filter(m => (g ? (m.mods || []).includes(g) : !(m.mods || []).length));
}
function subInfo(k, g) {
  return S.sub[k] || (S.subM[k] || {})[gk(g)] || null;
}
function lockedIds(k) {
  const r = new Set();
  if (S.sub[k]) {
    S.members.forEach(m => r.add(m.id));
    return r;
  }
  Object.keys(S.subM[k] || {}).forEach(x => memOfG(x === "__none" ? "" : x).forEach(m => r.add(m.id)));
  return r;
}
function toggleSub(k, g) {
  if (S.sub[k]) {
    const at = typeof S.sub[k] === "object" ? S.sub[k] : { at: 0 };
    delete S.sub[k];
    S.subM[k] = {};
    [...S.modules, "__none"].forEach(x => (S.subM[k][x] = at));
  }
  const a = (S.subM[k] = S.subM[k] || {}),
    key = gk(g);
  if (a[key]) delete a[key];
  else a[key] = { at: Date.now() };
  if (!Object.keys(a).length) delete S.subM[k];
  persist();
}
function empty() {
  return { members: [], att: {}, modules: [], roles: [], lead: {}, sub: {}, subM: {} };
}
let md = ky(now.getFullYear(), now.getMonth(), now.getDate()),
  view = location.hash === "#mark" ? "mark" : "dash";
let mcal = { y: now.getFullYear(), m: now.getMonth() },
  cbk = null,
  dmod = "",
  mset = [],
  FM = [];
let lastSig = "",
  drole = "",
  qry = "";
const match = m =>
  !qry ||
  (m.name + " " + (m.role || "") + " " + (m.mods && m.mods.length ? m.mods.join(" ") : m.mod || ""))
    .toLowerCase()
    .includes(qry);
const rowOk = r =>
  !qry || (r.name + " " + (r.role || "")).toLowerCase().includes(qry) || (r._g || "").toLowerCase().includes(qry);
