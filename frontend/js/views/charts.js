// Charts: monthly trend and yearly overview (SVG)
// metrics: attendance %, a stacked breakdown, or one series per status from settings
const MET = () => [["rate", "Attendance %"], ["mix", "Status breakdown"], ...STS().map(s => [s.code, s.label])];
let mf = { mod: "", mem: "", met: "rate", type: "bar" },
  yf = { y: now.getFullYear(), mod: "", mem: "", met: "rate", type: "bar" };
const Z = zeroCounts;
function cnt(L, k) {
  const e = S.att[k] || {},
    o = Z();
  L.forEach(m => {
    const c = e[m.id];
    if (c in o) o[c]++;
  });
  return o;
}
function sumC(a, b) {
  for (const k in b) a[k] = (a[k] || 0) + b[k];
  return a;
}
function rateOf(o) {
  const t = markSum(o);
  return t ? Math.round((attSum(o) / t) * 100) : null;
}
function pick(f) {
  let L = ms(f.mod);
  if (f.mem) L = L.filter(m => m.id === f.mem);
  return L;
}
function scope(f) {
  const m = S.members.find(x => x.id === f.mem);
  return m ? m.name : f.mod ? (f.mod === "__none" ? "Unassigned" : f.mod) : "All modules";
}
function seriesFor(met, rows) {
  if (met === "rate") return [{ n: "Attendance %", c: "var(--brand)", v: rows.map(rateOf) }];
  if (met === "mix") return STS().map(s => ({ n: s.label, c: s.color, v: rows.map(o => o[s.code]) }));
  return [{ n: stLabel(met), c: stColor(met), v: rows.map(o => o[met]) }];
}
function chart(o) {
  const W = 980,
    H = 205,
    l = 44,
    r = 14,
    t = 14,
    b = 30,
    w = W - l - r,
    h = H - t - b,
    n = o.labels.length,
    st = o.type === "stack";
  let max = o.pct
    ? 100
    : Math.max(
        1,
        ...(st
          ? o.labels.map((_, i) => o.series.reduce((a, s) => a + (s.v[i] || 0), 0))
          : o.series.flatMap(s => s.v.map(v => v || 0))),
      );
  if (!o.pct) max = Math.ceil(max / 4) * 4;
  const step = w / Math.max(n, 1),
    X = i => l + step * (i + 0.5),
    Y = v => t + h - (v / max) * h,
    bw = Math.min(30, step * 0.62);
  let g = "";
  for (let i = 0; i <= 4; i++) {
    const v = (max * i) / 4;
    g += `<line x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${l - 8}" y="${Y(v) + 4}" text-anchor="end">${Math.round(v)}${o.pct ? "%" : ""}</text>`;
  }
  const ev = Math.ceil(n / 16);
  o.labels.forEach((x, i) => {
    if (i % ev === 0) g += `<text x="${X(i)}" y="${H - 10}" text-anchor="middle">${x}</text>`;
  });
  if (st) {
    o.labels.forEach((_, i) => {
      let acc = 0;
      o.series.forEach(s => {
        const v = s.v[i] || 0;
        if (v) {
          g += `<rect x="${X(i) - bw / 2}" y="${Y(acc + v)}" width="${bw}" height="${Y(acc) - Y(acc + v)}" fill="${s.c}"/>`;
          acc += v;
        }
      });
    });
  } else if (o.type === "bar") {
    o.series.forEach(s =>
      s.v.forEach((v, i) => {
        if (v != null)
          g += `<rect x="${X(i) - bw / 2}" y="${Y(v)}" width="${bw}" height="${Math.max(Y(0) - Y(v), v ? 2 : 0)}" rx="3" fill="${s.c}" opacity=".9"/>`;
      }),
    );
  } else {
    o.series.forEach(s => {
      const pts = s.v.map((v, i) => (v == null ? null : [X(i), Y(v)])).filter(Boolean);
      if (!pts.length) return;
      const d = pts.map((p, k) => (k ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" "),
        z = pts[pts.length - 1][0].toFixed(1),
        f0 = pts[0][0].toFixed(1);
      g +=
        `<path d="${d} L${z} ${Y(0)} L${f0} ${Y(0)}Z" fill="${s.c}" opacity=".12"/><path d="${d}" fill="none" stroke="${s.c}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` +
        pts
          .map(
            p =>
              `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="var(--surface)" stroke="${s.c}" stroke-width="2"/>`,
          )
          .join("");
    });
  }
  o.labels.forEach((_, i) => {
    g += `<rect class="hit" data-i="${i}" x="${X(i) - step / 2}" y="${t}" width="${step}" height="${h}"><title>${o.tips[i]}: ${o.series.map(s => s.n + " " + (s.v[i] == null ? "—" : s.v[i] + (o.pct ? "%" : ""))).join(" · ")}</title></rect>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;font:11px Inter,sans-serif;fill:var(--muted)">${g}</svg>`;
}
const leg = ss => ss.map(s => `<span><i class="dot" style="background:${s.c}"></i>${esc(s.n)}</span>`).join("");
function fillCtl(p, f) {
  fillMod($(`#${p}Mod`), f.mod, true);
  const L = ms(f.mod);
  if (f.mem && !L.some(m => m.id === f.mem)) f.mem = "";
  $(`#${p}Mem`).innerHTML =
    `<option value="">All members</option>` +
    L.map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("");
  $(`#${p}Mem`).value = f.mem;
  $(`#${p}Met`).innerHTML = MET()
    .map(m => `<option value="${esc(m[0])}">${esc(m[1])}</option>`)
    .join("");
  $(`#${p}Met`).value = f.met;
  document.querySelectorAll(`#${p}Type button`).forEach(b => b.classList.toggle("on", b.dataset.t === f.type));
}
function renderCharts() {
  fillCtl("mf", mf);
  fillCtl("yf", yf);
  const ys = [...new Set([now.getFullYear(), yf.y, ...Object.keys(S.att).map(k => +k.slice(0, 4))])].sort(
    (a, b) => b - a,
  );
  $("#yfYear").innerHTML = ys.map(y => `<option>${y}</option>`).join("");
  $("#yfYear").value = yf.y;
  // monthly
  const L1 = pick(mf),
    ds = days(cur.y, cur.m).filter(x => !x.we),
    r1 = ds.map(x => cnt(L1, x.k)),
    s1 = seriesFor(mf.met, r1),
    t1 = mf.met === "mix" ? "stack" : mf.type;
  setH(
    $("#mChart"),
    chart({
      labels: ds.map(x => String(x.d)),
      tips: ds.map(x => x.d + " " + MNS[cur.m]),
      series: s1,
      type: t1,
      pct: mf.met === "rate",
    }),
  );
  $("#mLeg").innerHTML = leg(s1);
  const mr = rateOf(r1.reduce((a, o) => sumC(a, o), Z()));
  $("#mSub").textContent =
    MN[cur.m] + " " + cur.y + " · " + scope(mf) + (mr === null ? " · no data yet" : " · month average " + mr + "%");
  // yearly
  const L2 = pick(yf),
    r2 = MN.map((_, i) =>
      days(yf.y, i)
        .filter(x => !x.we)
        .reduce((a, x) => sumC(a, cnt(L2, x.k)), Z()),
    ),
    s2 = seriesFor(yf.met, r2),
    t2 = yf.met === "mix" ? "stack" : yf.type;
  setH(
    $("#yChart"),
    chart({ labels: MNS, tips: MN.map(m => m + " " + yf.y), series: s2, type: t2, pct: yf.met === "rate" }),
  );
  $("#yLeg").innerHTML = leg(s2);
  const rs = r2.map(rateOf),
    ok = rs.filter(v => v !== null),
    yr = rateOf(r2.reduce((a, o) => sumC(a, o), Z()));
  $("#ySub").textContent =
    yf.y +
    " · " +
    scope(yf) +
    (ok.length
      ? " · year average " +
        yr +
        " % · best " +
        MNS[rs.indexOf(Math.max(...ok))] +
        " (" +
        Math.max(...ok) +
        "%) · lowest " +
        MNS[rs.indexOf(Math.min(...ok))] +
        " (" +
        Math.min(...ok) +
        "%)"
      : " · no data yet");
}
[
  ["mf", mf],
  ["yf", yf],
].forEach(([p, f]) => {
  $(`#${p}Mod`).onchange = e => {
    f.mod = e.target.value;
    f.mem = "";
    renderCharts();
  };
  $(`#${p}Mem`).onchange = e => {
    f.mem = e.target.value;
    renderCharts();
  };
  $(`#${p}Met`).onchange = e => {
    f.met = e.target.value;
    renderCharts();
  };
  document.querySelectorAll(`#${p}Type button`).forEach(
    b =>
      (b.onclick = () => {
        f.type = b.dataset.t;
        renderCharts();
      }),
  );
});
$("#yfYear").onchange = e => {
  yf.y = +e.target.value;
  renderCharts();
};
$("#yChart").onclick = e => {
  const h = e.target.closest(".hit");
  if (h) {
    dsel = null;
    cur = { y: yf.y, m: +h.dataset.i };
    render();
    toast("Dashboard switched to " + MN[cur.m] + " " + cur.y);
  }
};
let insView = "trend";
function setIns(v) {
  insView = v;
  $("#paneTrend").hidden = v !== "trend";
  $("#paneMem").hidden = v !== "members";
  $("#mSub").hidden = v !== "trend";
  $("#rankSub").hidden = v !== "members";
  $("#insT").textContent = v === "trend" ? "Monthly trend" : "Member summary";
  $("#insTip").innerHTML = INFO[v]();
  document.querySelectorAll("#insTab button").forEach(b => b.classList.toggle("on", b.dataset.v === v));
}
document.querySelectorAll("#insTab button").forEach(b => (b.onclick = () => setIns(b.dataset.v)));
$("#rgM").onchange = e => {
  dsel = null;
  cur.m = +e.target.value;
  render();
};
$("#rgY").onchange = e => {
  dsel = null;
  cur.y = +e.target.value;
  render();
};
