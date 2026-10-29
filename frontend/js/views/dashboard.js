// Dashboard view: stats, summary cards, register, member summary, month navigation, date jump
// Days that are not working days (settings: workDays, holidays) are flagged we:true and skipped.
function days(y, m) {
  const n = new Date(y, m + 1, 0).getDate(),
    a = [];
  for (let d = 1; d <= n; d++) {
    const k = ky(y, m, d);
    a.push({ d, w: new Date(y, m, d).getDay(), we: !isWorkDay(k), k });
  }
  return a;
}
// per-member counts for every status in the month, plus the attendance rate
function stats(id, y, m) {
  const c = zeroCounts();
  days(y, m).forEach(x => {
    if (x.we) return;
    const v = (S.att[x.k] || {})[id];
    if (v in c) c[v]++;
  });
  return { c, rate: rateOf(c) };
}
function dayCount(k, L) {
  L = L || FM;
  const e = S.att[k] || {};
  let p = 0,
    mk = 0;
  L.forEach(mm => {
    const c = e[mm.id];
    if (stOf(c)) {
      mk++;
      if (isAtt(c)) p++;
    }
  });
  return { p, mk };
}
const sortCmp = (v, per) => {
  const nm = (a, b) => a.name.localeCompare(b.name),
    [kind, code] = v.split(":");
  return (
    {
      name: nm,
      nameZ: (a, b) => b.name.localeCompare(a.name),
      role: (a, b) => (a.role || "~").localeCompare(b.role || "~") || nm(a, b),
      high: (a, b) => (per(b).rate ?? -1) - (per(a).rate ?? -1),
      low: (a, b) => (per(a).rate ?? 101) - (per(b).rate ?? 101),
      most: (a, b) => (per(b).c[code] || 0) - (per(a).c[code] || 0),
      fewest: (a, b) => (per(a).c[code] || 0) - (per(b).c[code] || 0),
    }[kind] || nm
  );
};

function render() {
  $("#mlabel").textContent = MN[cur.m] + " " + cur.y;
  if (drole && !S.roles.includes(drole)) drole = "";
  FM = sortM(ms(dmod)).filter(m => !drole || m.role === drole);
  syncMods();
  fillRole($("#rFilter"), true, drole);
  $("#dCal").innerHTML = calHTML("d", cur.y, cur.m, dsel || "", true);

  const ds = days(cur.y, cur.m),
    dsr = ds.filter(x => !x.we),
    tk = todayKey(),
    st = STS();
  const sk = dsel || tk,
    swork = isWorkDay(sk),
    ptitle = dsel ? "Attended on " + keyDate(sk).getDate() + " " + MNS[keyDate(sk).getMonth()] : "Attended today";

  // KPIs
  const per = FM.map(mm => stats(mm.id, cur.y, cur.m));
  const rated = per.filter(p => p.rate !== null),
    avg = rated.length ? Math.round(rated.reduce((a, p) => a + p.rate, 0) / rated.length) : null;
  const tdy = dayCount(sk),
    working = dsr.length,
    marked = dsr.filter(x => dayCount(x.k).mk).length;
  const kp = [
    ["Team size", FM.length, "", dmod ? (dmod === "__none" ? "Unassigned" : esc(dmod)) : "active members", "👥"],
    [
      ptitle,
      tdy.mk ? tdy.p : null,
      " / " + FM.length,
      tdy.mk ? "standup logged" : !swork ? esc(offLabel(sk).toLowerCase()) + " · not tracked" : "not logged yet",
      "🟢",
    ],
    ["Days logged", marked, " / " + working, "working days in " + MN[cur.m], "🗓️"],
    ["Avg. attendance", avg, "%", "for " + MN[cur.m] + " " + cur.y, "📈"],
  ];
  const sig = JSON.stringify(kp),
    still = sig === lastSig;
  lastSig = sig;
  $("#kpis").innerHTML = kp
    .map(
      (k, i) =>
        `<div class="card kpi${still ? " still" : ""}" style="--i:${i}"${i === 1 ? ' data-go title="Open Mark attendance"' : ""}><i class="ico">${k[4]}</i><small>${esc(k[0])}</small><b ${k[1] === null ? "" : `data-n="${k[1]}" data-s="${esc(k[2])}"`}>${k[1] === null ? "—" : k[1] + k[2]}</b><span>${k[3]}</span></div>`,
    )
    .join("");
  if (!still) countUp($("#kpis"));

  renderCharts();
  // Register: one column per working day, then a count column per status, then the rate
  const rgsv = $("#rgSort").value,
    rgar = (a, d) => (rgsv === a ? " ▲" : rgsv === d ? " ▼" : ""),
    cols = dsr.length + st.length + 2;
  let h =
    `<tr><th class="name" data-sort="name" title="Click to sort" style="top:0;z-index:3">Member${rgar("name", "nameZ")}</th>` +
    dsr
      .map(
        x =>
          `<th class="day ${x.k === tk ? "td" : ""}" data-k="${x.k}"${leadTip(x.k)}>${x.d}<i>${esc(DN1[x.w])}</i></th>`,
      )
      .join("") +
    st
      .map(
        s =>
          `<th class="pct" data-sort="st:${esc(s.code)}" title="Click to sort by ${esc(s.label)}" style="color:${s.color}">${esc(s.code)}${rgar("fewest:" + s.code, "most:" + s.code)}</th>`,
      )
      .join("") +
    `<th class="pct" data-sort="rate" title="Click to sort">Rate${rgar("low", "high")}</th></tr>`;
  const RL = regList(),
    grpOn = $("#rgMod").value !== "none",
    gOrder = [];
  RL.forEach(x => {
    if (!gOrder.includes(x._g)) gOrder.push(x._g);
  });
  RL.forEach((mm, ix, arr) => {
    const s = stats(mm.id, cur.y, cur.m),
      open = !grpOn || !!qry || !!$("#rgFilt").value || (mm._g in rgState ? rgState[mm._g] : gOrder[0] === mm._g);
    if (grpOn && (ix === 0 || arr[ix - 1]._g !== mm._g)) {
      const n = arr.filter(x => x._g === mm._g).length;
      h += `<tr class="rgh${open ? "" : " shut"}" data-g="${esc(mm._g || "")}" tabindex="0" role="button" aria-expanded="${open}"><td colspan="${cols}"><i class="chev">▾</i>${esc(mm._g || "Unassigned")}<span class="gct">${n} member${n > 1 ? "s" : ""}</span></td></tr>`;
    }
    h +=
      `<tr data-g="${esc(mm._g || "")}"${open ? "" : " hidden"}><td class="name"><b>${esc(mm.name)}</b><span>${esc(mm.role || "")}${(mm.mods || []).length ? " · " + esc(mm.mods.join(", ")) : ""}</span></td>` +
      dsr
        .map(x => {
          const c = (S.att[x.k] || {})[mm.id] || "";
          return `<td data-k="${x.k}"><span class="cell${c ? " on" : ""}"${c ? ` style="--c:${stColor(c)}"` : ""} title="${esc(c ? stLabel(c) : "Not marked")}">${c ? esc(c) : "·"}</span></td>`;
        })
        .join("") +
      st.map(x => `<td class="pct">${s.c[x.code]}</td>`).join("") +
      `<td class="pct">${s.rate === null ? "—" : s.rate + "%"}</td></tr>`;
  });
  if (!RL.length)
    h += `<tr><td colspan="${cols}" style="padding:30px;color:var(--muted)">${FM.filter(match).length ? "No members match this filter. Change the filter or clear the search." : "No members here yet. Add a team member or pick another module."}</td></tr>`;
  $("#reg").innerHTML = h;
  rgSync();
  $("#dJump").value = dsel || "";
  $("#rgM").innerHTML = MN.map((n, i) => `<option value="${i}">${esc(n)}</option>`).join("");
  $("#rgM").value = cur.m;
  const rgYs = [...new Set([now.getFullYear(), cur.y, ...Object.keys(S.att).map(k => +k.slice(0, 4))])].sort(
    (a, b) => b - a,
  );
  $("#rgY").innerHTML = rgYs.map(y => `<option>${y}</option>`).join("");
  $("#rgY").value = cur.y;

  // Member summary: a count column per status and an attendance bar
  const pm = new Map(FM.map((mm, i) => [mm.id, per[i]]));
  const rows = FM.filter(match)
    .slice()
    .sort(sortCmp($("#memSort").value, m => pm.get(m.id)));
  $("#rankSub").textContent = MN[cur.m] + " " + cur.y;
  $("#rank").innerHTML =
    `<tr><th style="text-align:left;padding:10px 12px">Member</th>${st.map(s => `<th style="color:${s.color}">${esc(s.label)}</th>`).join("")}<th style="text-align:left;padding-left:12px">Attendance</th></tr>` +
    rows
      .map(mm => {
        const s = pm.get(mm.id);
        return `<tr><td><b>${esc(mm.name)}</b><br><span class="sub">${esc(mm.role || "")}${(mm.mods || []).length ? " · " + esc(mm.mods.join(", ")) : ""}</span></td>${st.map(x => `<td>${s.c[x.code]}</td>`).join("")}<td><div style="display:flex;gap:10px;align-items:center"><div class="prog" style="flex:1"><i style="width:${s.rate || 0}%"></i></div><b style="min-width:38px">${s.rate === null ? "—" : s.rate + "%"}</b></div></td></tr>`;
      })
      .join("");
}
$("#prev").onclick = () => {
  dsel = null;
  cur.m--;
  if (cur.m < 0) {
    cur.m = 11;
    cur.y--;
  }
  render();
};
$("#next").onclick = () => {
  dsel = null;
  cur.m++;
  if (cur.m > 11) {
    cur.m = 0;
    cur.y++;
  }
  render();
};
$("#todayBtn").onclick = () => {
  dsel = null;
  cur = { y: now.getFullYear(), m: now.getMonth() };
  render();
  setTimeout(() => {
    const t = document.querySelector("th.td");
    t && t.scrollIntoView({ inline: "center", block: "nearest" });
  }, 0);
};
$("#memSort").onchange = render;
$("#kpis").onclick = e => {
  if (e.target.closest("[data-go]")) {
    if (dsel) {
      md = dsel;
      const q = dsel.split("-").map(Number);
      mcal = { y: q[0], m: q[1] - 1 };
    }
    go("mark");
  }
};
function regList() {
  const L0 = FM.filter(match),
    per = {};
  L0.forEach(m => (per[m.id] = stats(m.id, cur.y, cur.m)));
  const [fk, fc] = $("#rgFilt").value.split(":"),
    L = L0.filter(m => {
      const s = per[m.id];
      return fk === "low"
        ? s.rate !== null && s.rate < SET.thresholds.low
        : fk === "has"
          ? (s.c[fc] || 0) > 0
          : fk === "clean"
            ? s.rate !== null && STS().every(x => x.attended || !s.c[x.code])
            : true;
    });
  const nm = (a, b) => a.name.localeCompare(b.name),
    cmp = sortCmp($("#rgSort").value, m => per[m.id]);
  const mi = x => {
      const k = S.modules.indexOf(x);
      return k < 0 ? 999 : k;
    },
    mo = $("#rgMod").value;
  const mc =
    mo === "az"
      ? (a, b) => (a._g || "~").localeCompare(b._g || "~")
      : mo === "za"
        ? (a, b) => (b._g || "").localeCompare(a._g || "")
        : mo === "list"
          ? (a, b) => mi(a._g) - mi(b._g)
          : () => 0;
  const base = mo === "none" ? L.map(m => Object.assign({}, m, { _g: "" })) : expandG(L, dmod).filter(rowOk);
  return base.sort((a, b) => mc(a, b) || cmp(a, b) || nm(a, b));
}
$("#rgSort").onchange =
  $("#rgMod").onchange =
  $("#rgFilt").onchange =
    () => {
      render();
    };
let rgState = {};
function rgSync() {
  const b = $("#rgAll");
  if (!b) return;
  const hs = [...document.querySelectorAll("#reg tr.rgh")];
  b.hidden = !hs.length;
  b.textContent = hs.every(h => !h.classList.contains("shut")) ? "Collapse all" : "Expand all";
}
function rgToggle(tr, force) {
  const g = tr.dataset.g,
    open = force !== undefined ? force : tr.classList.contains("shut");
  rgState[g] = open;
  tr.classList.toggle("shut", !open);
  tr.setAttribute("aria-expanded", String(open));
  document.querySelectorAll("#reg tr[data-g]:not(.rgh)").forEach(r => {
    if (r.dataset.g === g) r.hidden = !open;
  });
}
$("#reg").onclick = e => {
  const sh = e.target.closest("th[data-sort]");
  if (sh) {
    const c = $("#rgSort").value,
      k = sh.dataset.sort;
    $("#rgSort").value =
      k === "name"
        ? c === "name"
          ? "nameZ"
          : "name"
        : k === "rate"
          ? c === "high"
            ? "low"
            : "high"
          : (c === "most:" + k.slice(3) ? "fewest:" : "most:") + k.slice(3);
    render();
    return;
  }
  const t = e.target.closest("tr.rgh");
  if (t) {
    rgToggle(t);
    rgSync();
  }
};
$("#reg").onkeydown = e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches("tr.rgh")) {
    e.preventDefault();
    rgToggle(e.target);
    rgSync();
  }
};
$("#rgAll").onclick = () => {
  const hs = [...document.querySelectorAll("#reg tr.rgh")];
  if (!hs.length) return;
  const allOpen = hs.every(h => !h.classList.contains("shut"));
  hs.forEach(h => rgToggle(h, !allOpen));
  rgSync();
};

function hlCol(k) {
  document.querySelectorAll("#reg .colhl").forEach(x => x.classList.remove("colhl"));
  const els = [...document.querySelectorAll('#reg [data-k="' + k + '"]')];
  els.forEach(x => x.classList.add("colhl"));
  const th = els[0];
  if (th) {
    const sc = $("#reg").parentElement;
    sc.scrollLeft = Math.max(0, th.offsetLeft - sc.clientWidth / 2 + th.offsetWidth / 2);
  }
  setTimeout(() => els.forEach(x => x.classList.remove("colhl")), 2600);
}
$("#dJump").onchange = e => {
  const v = e.target.value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    dsel = null;
    render();
    return;
  }
  const q = v.split("-").map(Number);
  dsel = v;
  cur = { y: q[0], m: q[1] - 1 };
  render();
  hlCol(v);
  toast(dayLabel(v) + (isWorkDay(v) ? "" : " · " + offLabel(v).toLowerCase() + ", not tracked"));
};
