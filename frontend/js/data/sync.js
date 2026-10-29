// Database sync: app/config holds members/modules/roles, days/<date> holds one day
let DOK = false,
  DB = null,
  SY = { cfg: "", days: {} },
  KN = new Set(),
  QN = 0,
  Q = Promise.resolve(),
  PEND = false,
  RO = false,
  CFG = null,
  DAYS = null,
  rT = 0;
function cfgOf(s) {
  return { members: s.members, modules: s.modules, roles: s.roles };
}
function dayOf(s, k) {
  return {
    att: Object.assign({}, s.att[k] || {}),
    lead: s.lead[k] || "",
    sub: s.sub[k] || null,
    subM: Object.assign({}, s.subM[k] || {}),
  };
}
function dayKeys(s) {
  return new Set([...Object.keys(s.att), ...Object.keys(s.lead), ...Object.keys(s.sub), ...Object.keys(s.subM)]);
}
function syncState(t, err) {
  const c = $("#syncChip");
  if (!c) return;
  c.textContent = t;
  c.classList.toggle("err", !!err);
}
function enq(fn) {
  QN++;
  syncState("Saving…");
  Q = Q.then(fn)
    .then(() => {}, onWErr)
    .then(() => {
      QN--;
      if (!QN) {
        if (!RO) syncState("All changes saved");
        if (PEND) {
          PEND = false;
          applySnap();
        }
      }
    });
}
function onWErr(e) {
  const c = e && e.code;
  if (c === "unauthenticated") return;
  if (c === "forbidden") {
    syncState("Not saved", true);
    toast("Your role doesn’t allow that change.");
  } else if (c === "quota_exceeded") {
    syncState("Not saved", true);
    toast("That change is too large to save.");
  } else {
    syncState("Not saved", true);
    toast((e && e.message) || "Couldn’t save that change. Check your connection and try again.");
  }
  PEND = true;
}
// app/config is one document and writes are last-writer-wins, so apply only this client's edits
// (base -> mine) onto the latest stored copy instead of overwriting what others changed meanwhile
function mergeList(b, m, t) {
  b = b || [];
  m = m || [];
  const add = m.filter(x => !b.includes(x)),
    del = b.filter(x => !m.includes(x));
  return [...t.filter(x => !del.includes(x)), ...add.filter(x => !t.includes(x))];
}
function mergeMembers(b, m, t) {
  const B = new Map((b || []).map(x => [x.id, x])),
    M = new Map((m || []).map(x => [x.id, x])),
    out = [];
  t.forEach(x => {
    if (B.has(x.id) && !M.has(x.id)) return;
    const mx = M.get(x.id);
    out.push(mx && !eq(mx, B.get(x.id)) ? mx : x);
  });
  (m || []).forEach(x => {
    if (!B.has(x.id) && !out.some(y => y.id === x.id)) out.push(x);
  });
  return out;
}
async function writeCfg(base, mine) {
  const ref = DB.doc("app/config"),
    g = await ref.get(),
    t = g.exists ? g.data() || {} : {},
    arr = a => (Array.isArray(a) ? a : []);
  const modules = mergeList(base.modules, mine.modules, arr(t.modules)),
    roles = mergeList(base.roles, mine.roles, arr(t.roles)),
    members = mergeMembers(base.members, mine.members, arr(t.members)).map(m => {
      const mods = arr(m.mods).filter(x => modules.includes(x));
      return Object.assign({}, m, { mods, mod: mods[0] || "" });
    });
  await ref.set({ members, modules, roles });
}
async function writeDay(k, patch) {
  const ref = DB.doc("days/" + k);
  if (!KN.has(k)) {
    const g = await ref.get();
    if (g.exists) KN.add(k);
  }
  if (KN.has(k)) {
    try {
      await ref.update(patch);
      return;
    } catch (e) {
      if (e && e.code !== "invalid_argument") throw e;
    }
  }
  await ref.set(dayOf(S, k));
  KN.add(k);
}
function persist() {
  if (RO || !DB || !CFG || !DAYS || !DOK) return;
  const c = JSON.stringify(cfgOf(S));
  if (c !== SY.cfg) {
    const base = JSON.parse(SY.cfg || "{}"),
      mine = JSON.parse(c);
    SY.cfg = c;
    enq(() => writeCfg(base, mine));
  }
  new Set([...dayKeys(S), ...Object.keys(SY.days)]).forEach(k => {
    const n = dayOf(S, k),
      o = SY.days[k] || { att: {}, lead: "", sub: null, subM: {} },
      p = {};
    const at = {};
    new Set([...Object.keys(n.att), ...Object.keys(o.att)]).forEach(id => {
      if ((n.att[id] || "") !== (o.att[id] || "")) at[id] = n.att[id] || "";
    });
    if (Object.keys(at).length) p.att = at;
    if (n.lead !== o.lead) p.lead = n.lead;
    if (!eq(n.sub, o.sub)) p.sub = n.sub;
    const sm = {};
    new Set([...Object.keys(n.subM), ...Object.keys(o.subM)]).forEach(g => {
      if (!eq(n.subM[g], o.subM[g])) sm[g] = n.subM[g] || null;
    });
    if (Object.keys(sm).length) p.subM = sm;
    if (!Object.keys(p).length) return;
    SY.days[k] = clone(n);
    enq(() => writeDay(k, p));
  });
}
function applySnap() {
  if (!CFG || !DAYS || !SET) return;
  if (QN) {
    PEND = true;
    return;
  }
  // shared data is untrusted: keep only well-formed members, names and status codes
  const n = empty(),
    c = CFG,
    strs = a => (Array.isArray(a) ? a.filter(x => typeof x === "string") : []);
  n.members = Array.isArray(c.members)
    ? clone(c.members)
        .filter(
          m =>
            m &&
            typeof m === "object" &&
            typeof m.id === "string" &&
            /^[A-Za-z0-9_-]{1,64}$/.test(m.id) &&
            typeof m.name === "string",
        )
        .map(m =>
          Object.assign(m, {
            role: typeof m.role === "string" ? m.role : "",
            mods: strs(m.mods),
            mod: typeof m.mod === "string" ? m.mod : "",
          }),
        )
    : [];
  n.modules = strs(c.modules);
  n.roles = strs(c.roles);
  KN = new Set();
  Object.keys(DAYS).forEach(k => {
    const d = DAYS[k] || {};
    KN.add(k);
    const a = {};
    Object.entries(d.att || {}).forEach(([id, v]) => {
      if (stOf(v)) a[id] = v;
    });
    if (Object.keys(a).length) n.att[k] = a;
    if (typeof d.lead === "string" && d.lead) n.lead[k] = d.lead;
    if (d.sub) n.sub[k] = d.sub;
    const sm = {};
    Object.entries(d.subM || {}).forEach(([g, v]) => {
      if (v) sm[g] = v;
    });
    if (Object.keys(sm).length) n.subM[k] = sm;
  });
  S = mig(n);
  SY = { cfg: JSON.stringify(cfgOf(S)), days: {} };
  dayKeys(S).forEach(k => (SY.days[k] = clone(dayOf(S, k))));
  clearTimeout(rT);
  rT = setTimeout(() => {
    if (!document.body.classList.contains("locked")) route();
  }, 60);
  checkGate();
}
