// File downloads and the Excel (.xlsx) export, built without libraries
function save(name, blob) {
  const a = document.createElement("a"),
    u = URL.createObjectURL(blob);
  a.href = u;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
  toast("Saved " + name);
}
const crcT = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = b => {
  let c = -1;
  for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
function zip(files) {
  const E = new TextEncoder(),
    parts = [],
    cen = [],
    u16 = v => [v & 255, (v >> 8) & 255],
    u32 = v => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255];
  let off = 0;
  files.forEach(f => {
    const nm = E.encode(f.n),
      d = E.encode(f.d),
      c = crc32(d),
      h = [
        0x50,
        0x4b,
        3,
        4,
        ...u16(20),
        ...u16(0x800),
        ...u16(0),
        ...u16(0),
        ...u16(0x21),
        ...u32(c),
        ...u32(d.length),
        ...u32(d.length),
        ...u16(nm.length),
        ...u16(0),
      ];
    parts.push(new Uint8Array(h), nm, d);
    cen.push(
      new Uint8Array([
        0x50,
        0x4b,
        1,
        2,
        ...u16(20),
        ...u16(20),
        ...u16(0x800),
        ...u16(0),
        ...u16(0),
        ...u16(0x21),
        ...u32(c),
        ...u32(d.length),
        ...u32(d.length),
        ...u16(nm.length),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u32(0),
        ...u32(off),
      ]),
      nm,
    );
    off += h.length + nm.length + d.length;
  });
  let cs = 0;
  cen.forEach(a => {
    parts.push(a);
    cs += a.length;
  });
  parts.push(
    new Uint8Array([
      0x50,
      0x4b,
      5,
      6,
      0,
      0,
      0,
      0,
      ...u16(files.length),
      ...u16(files.length),
      ...u32(cs),
      ...u32(off),
      0,
      0,
    ]),
  );
  return new Blob(parts, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
const colL = i => {
  let s = "";
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};
// cell styles 0-14 are fixed (header, text, totals, title, %); one tinted style per status follows from 15
const ST0 = 15,
  sx = c => {
    const i = STS().findIndex(s => s.code === c);
    return i < 0 ? 8 : ST0 + i;
  };
const tint = h =>
  [1, 3, 5]
    .map(i =>
      Math.round(parseInt(h.substr(i, 2), 16) * 0.3 + 255 * 0.7)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase();
const HD = v => ({ v, s: 1 }),
  TX = v => ({ v, s: 7 }),
  NM = v => ({ v, s: 8 }),
  PC = v => ({ v, s: 13 }),
  TL = v => ({ v, s: 9 }),
  TN = v => ({ v, s: 10 }),
  TP = v => ({ v, s: 14 });
function sheetXml(rows, w, op) {
  op = op || {};
  const fx = op.fx || 0,
    fy = op.fy || 0,
    pn =
      fx || fy
        ? `<pane${fx ? ` xSplit="${fx}"` : ""}${fy ? ` ySplit="${fy}"` : ""} topLeftCell="${colL(fx)}${fy + 1}" activePane="${fx && fy ? "bottomRight" : fy ? "bottomLeft" : "topRight"}" state="frozen"/>`
        : "";
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" showGridLines="0">' +
    pn +
    "</sheetView></sheetViews><cols>" +
    w.map((x, i) => `<col min="${i + 1}" max="${i + 1}" width="${x}" customWidth="1"/>`).join("") +
    "</cols><sheetData>" +
    rows
      .map(
        (r, y) =>
          `<row r="${y + 1}">` +
          r
            .map((c, x) => {
              if (c == null) return "";
              const o = typeof c === "object" ? c : { v: c },
                a = colL(x) + (y + 1),
                s = o.s ? ` s="${o.s}"` : "";
              if (o.v === "" || o.v == null) return o.s ? `<c r="${a}"${s}/>` : "";
              return typeof o.v === "number"
                ? `<c r="${a}"${s}><v>${o.v}</v></c>`
                : `<c r="${a}"${s} t="inlineStr"><is><t>${esc(o.v)}</t></is></c>`;
            })
            .join("") +
          "</row>",
      )
      .join("") +
    "</sheetData>" +
    (op.af ? `<autoFilter ref="${op.af}"/>` : "") +
    "</worksheet>"
  );
}
function xlsx(sh) {
  const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    P = "http://schemas.openxmlformats.org/",
    RT = P + "officeDocument/2006/relationships",
    fill = c => `<fill><patternFill patternType="solid"><fgColor rgb="FF${c}"/></patternFill></fill>`,
    n = sh.length;
  const files = [
    {
      n: "[Content_Types].xml",
      d:
        H +
        '<Types xmlns="' +
        P +
        'package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        sh
          .map(
            (_, i) =>
              `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
          )
          .join("") +
        "</Types>",
    },
    {
      n: "_rels/.rels",
      d:
        H +
        '<Relationships xmlns="' +
        P +
        'package/2006/relationships"><Relationship Id="rId1" Type="' +
        RT +
        '/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    },
    {
      n: "xl/workbook.xml",
      d:
        H +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="' +
        RT +
        '"><sheets>' +
        sh.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
        "</sheets></workbook>",
    },
    {
      n: "xl/_rels/workbook.xml.rels",
      d:
        H +
        '<Relationships xmlns="' +
        P +
        'package/2006/relationships">' +
        sh
          .map(
            (_, i) => `<Relationship Id="rId${i + 1}" Type="${RT}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
          )
          .join("") +
        `<Relationship Id="rId${n + 1}" Type="${RT}/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      n: "xl/styles.xml",
      d:
        H +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="0&quot;%&quot;"/></numFmts><fonts count="5"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="15"/><color rgb="FF1E40AF"/><name val="Calibri"/></font><font><i/><sz val="10"/><color rgb="FF5B6B82"/><name val="Calibri"/></font></fonts><fills count="' +
        (9 + STS().length) +
        '"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
        ["1E40AF", "FFFFFF", "FFFFFF", "FFFFFF", "FFFFFF", "FFFFFF", "E7EDFB", ...STS().map(s => tint(s.color))]
          .map(fill)
          .join("") +
        '</fills><borders count="2"><border/><border><left style="thin"><color rgb="FFD0DAE9"/></left><right style="thin"><color rgb="FFD0DAE9"/></right><top style="thin"><color rgb="FFD0DAE9"/></top><bottom style="thin"><color rgb="FFD0DAE9"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="' +
        (ST0 + STS().length) +
        '"><xf/><xf fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
        [3, 4, 5, 6, 7]
          .map(() => `<xf borderId="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>`)
          .join("") +
        '<xf borderId="1" applyBorder="1"/><xf borderId="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf fontId="2" fillId="8" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/><xf fontId="2" fillId="8" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf fontId="3" applyFont="1"/><xf fontId="4" applyFont="1"/><xf numFmtId="164" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="164" fontId="2" fillId="8" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>' +
        STS()
          .map(
            (_, i) =>
              `<xf fillId="${9 + i}" borderId="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>`,
          )
          .join("") +
        '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    },
  ];
  sh.forEach((s, i) => files.push({ n: `xl/worksheets/sheet${i + 1}.xml`, d: sheetXml(s.rows, s.w, s) }));
  return zip(files);
}
function buildX(p, mods) {
  const un = "Unassigned",
    mode = p.all ? "a" : p.k ? "d" : "m",
    st = STS(),
    codes = st.map(s => s.code),
    dow = k => DNS[keyDate(k).getDay()],
    rec = k => S.att[k] && Object.keys(S.att[k]).length > 0,
    key = st.map(s => s.code + " = " + s.label).join(" · "),
    leadRows = ks =>
      ks.length
        ? [
            [],
            [{ v: "Scrum taken by", s: 11 }],
            [HD("Date"), HD("Scrum taken by")],
            ...ks.map(k => {
              const d = keyDate(k);
              return [TX(String(d.getDate()).padStart(2, "0") + " " + MNS[d.getMonth()] + " " + dow(k)), TX(leadOf(k))];
            }),
          ]
        : [],
    ds = mode === "m" ? days(p.y, p.m).filter(x => !x.we) : [],
    keys =
      mode === "a"
        ? Object.keys(S.att)
            .filter(k => isWorkDay(k) && rec(k))
            .sort()
        : mode === "d"
          ? [p.k]
          : ds.map(x => x.k).filter(rec),
    ym = [...new Set(keys.map(k => k.slice(0, 7)))],
    ymLab = v => {
      const q = v.split("-").map(Number);
      return MN[q[1] - 1] + " " + q[0];
    },
    per =
      mode === "m"
        ? MN[p.m] + " " + p.y
        : mode === "d"
          ? dayLabel(p.k) + " (" + dow(p.k) + ")"
          : ym.length
            ? ymLab(ym[0]) + (ym.length > 1 ? " to " + ymLab(ym[ym.length - 1]) : "") + " · every recorded date"
            : "No attendance recorded yet",
    tally = (id, ks) => {
      const t = Z();
      ks.forEach(k => {
        const c = (S.att[k] || {})[id];
        if (c in t) t[c]++;
      });
      return t;
    },
    // members of a module, grouped by role (no role last) and then by name
    memOf = g =>
      S.members
        .filter(m => (g === un ? !(m.mods || []).length : (m.mods || []).includes(g)))
        .sort((a, b) => (a.role || "￿").localeCompare(b.role || "￿") || a.name.localeCompare(b.name)),
    rate = t => {
      const r = rateOf(t);
      return r === null ? { v: "", s: 13 } : PC(r);
    },
    trate = t => {
      const r = rateOf(t);
      return r === null ? { v: "", s: 14 } : TP(r);
    },
    mark = c => (c && stOf(c) ? { v: c, s: sx(c) } : { v: "", s: 8 }),
    attended = (L, k) => {
      const e = S.att[k] || {},
        mk = L.filter(m => stOf(e[m.id]));
      return mk.length ? TN(mk.filter(m => isAtt(e[m.id])).length) : { v: "", s: 10 };
    },
    af = (w, n) => (n ? "A3:" + colL(w.length - 1) + (3 + n) : ""),
    top = (title, note) => [[{ v: title, s: 11 }], [{ v: note, s: 12 }]],
    stHead = st.map(s => HD(s.label)),
    stW = st.map(() => 9),
    used = { summary: 1, "all data": 1 },
    out = [],
    flat = [],
    uniq = new Map(),
    sums = [];
  mods.forEach(g => {
    const L = memOf(g),
      t = Z();
    let rows,
      w,
      fx = 0,
      n = L.length;
    if (mode === "m") {
      w = [18, 26, ...ds.map(() => 7), ...stW, 13];
      fx = 2;
      rows = [
        ...top(
          g + " · attendance · " + per,
          L.length +
            " member" +
            (L.length === 1 ? "" : "s") +
            " · working days only · total row = members counted as attended on each day",
        ),
        [HD("Role"), HD("Member"), ...ds.map(x => HD(x.d + " " + DNS[x.w])), ...stHead, HD("Attendance %")],
      ];
      L.forEach(m => {
        const s = tally(
          m.id,
          ds.map(x => x.k),
        );
        for (const c in s) t[c] += s[c];
        rows.push([
          TX(m.role || ""),
          TX(m.name),
          ...ds.map(x => mark((S.att[x.k] || {})[m.id])),
          ...codes.map(c => NM(s[c])),
          rate(s),
        ]);
      });
      rows.push(
        [TL("Module total"), TL(""), ...ds.map(x => attended(L, x.k)), ...codes.map(c => TN(t[c])), trate(t)],
        [],
        [{ v: key, s: 12 }],
        ...leadRows(ds.map(x => x.k).filter(rec)),
      );
    } else if (mode === "d") {
      w = [18, 26, 14, 8, 14];
      let nm0 = 0;
      rows = [
        ...top(
          g + " · attendance · " + per,
          L.length + " member" + (L.length === 1 ? "" : "s") + " · scrum taken by " + leadOf(p.k),
        ),
        [HD("Role"), HD("Member"), HD("Date"), HD("Day"), HD("Status")],
      ];
      L.forEach(m => {
        const c = (S.att[p.k] || {})[m.id] || "";
        if (c in t) t[c]++;
        else nm0++;
        rows.push([
          TX(m.role || ""),
          TX(m.name),
          NM(p.k),
          NM(dow(p.k)),
          stOf(c) ? { v: stLabel(c), s: sx(c) } : { v: "Not marked", s: 8 },
        ]);
      });
      rows.push(
        [],
        [HD("Status"), HD("Members")],
        ...st.map(s => [{ v: s.label, s: sx(s.code) }, NM(t[s.code])]),
        [{ v: "Not marked", s: 8 }, NM(nm0)],
        [TL("Attendance %"), trate(t)],
        [TL("Scrum taken by"), TX(leadOf(p.k))],
      );
    } else {
      const dl = k => {
          const d = keyDate(k);
          return String(d.getDate()).padStart(2, "0") + " " + MNS[d.getMonth()] + " " + dow(k);
        },
        sh = [HD("Role"), HD("Member"), ...stHead, HD("Attendance %")];
      w = [18, 26, ...stW, 13, ...keys.map(() => 8)];
      fx = 2;
      rows = [
        ...top(
          g + " · all data · " + per,
          L.length +
            " member" +
            (L.length === 1 ? "" : "s") +
            " · totals, then day-by-day status for every recorded date, then month-wise summary",
        ),
        [...sh, ...keys.map(k => HD(dl(k)))],
      ];
      L.forEach(m => {
        const s = tally(m.id, keys);
        for (const c in s) t[c] += s[c];
        rows.push([
          TX(m.role || ""),
          TX(m.name),
          ...codes.map(c => NM(s[c])),
          rate(s),
          ...keys.map(k => mark((S.att[k] || {})[m.id])),
        ]);
      });
      rows.push(
        [TL("Module total"), TL(""), ...codes.map(c => TN(t[c])), trate(t), ...keys.map(k => attended(L, k))],
        [],
        [{ v: "Month-wise summary", s: 11 }],
        sh,
      );
      ym.forEach(v => {
        const ks = keys.filter(k => k.slice(0, 7) === v);
        rows.push([TL(ymLab(v)), ...Array(sh.length - 1).fill(TL(""))]);
        L.forEach(m => {
          const s = tally(m.id, ks);
          if (markSum(s)) rows.push([TX(m.role || ""), TX(m.name), ...codes.map(c => NM(s[c])), rate(s)]);
        });
      });
      rows.push([], [{ v: key + " · total row = members counted as attended on each day", s: 12 }], ...leadRows(keys));
    }
    let nm = g.replace(/[\[\]:*?\/\\]/g, "-").slice(0, 31) || "Sheet";
    if (used[nm.toLowerCase()]) nm = nm.slice(0, 26) + " (" + (out.length + 2) + ")";
    used[nm.toLowerCase()] = 1;
    out.push({ name: nm, rows, w, fx, fy: 3, af: af(w, n) });
    L.forEach(m => {
      uniq.set(m.id, m);
      keys.forEach(k => {
        const c = (S.att[k] || {})[m.id] || "";
        flat.push([
          TX(m.role || ""),
          TX(g),
          TX(m.name),
          NM(k),
          NM(dow(k)),
          stOf(c) ? { v: stLabel(c), s: sx(c) } : { v: "Not marked", s: 8 },
          TX(leadOf(k)),
        ]);
      });
    });
    sums.push([g, L.length, t]);
  });
  const T = Z();
  uniq.forEach(m => {
    const s = tally(m.id, keys);
    for (const c in s) T[c] += s[c];
  });
  const sd = mode === "d",
    sw = [22, 10, ...st.map(() => 8), ...(sd ? [12] : []), 14],
    nmk = g => (sd ? memOf(g).filter(m => !stOf((S.att[keys[0]] || {})[m.id])).length : 0),
    srow = (lab, cnt, t, nk, tot) => [
      (tot ? TL : TX)(lab),
      (tot ? TN : NM)(cnt),
      ...codes.map(c => (tot ? TN : NM)(t[c])),
      ...(sd ? [(tot ? TN : NM)(nk)] : []),
      tot ? trate(t) : rate(t),
    ],
    srows = [
      ...top(SET.appName + " · module-wise summary", "Period: " + per + " · Attendance % = " + rateFormula()),
      [HD("Module"), HD("Members"), ...stHead, ...(sd ? [HD("Not marked")] : []), HD("Attendance %")],
      ...sums.map(x => srow(x[0], x[1], x[2], nmk(x[0]), false)),
      srow(
        "All modules (each member once)",
        uniq.size,
        T,
        sd ? [...uniq.values()].filter(m => !stOf((S.att[keys[0]] || {})[m.id])).length : 0,
        true,
      ),
    ];
  srows.push(
    [],
    [{ v: "Scrum taken by", s: 11 }],
    [HD("Date"), HD("Day"), HD("Scrum taken by")],
    ...keys.map(k => [NM(k), NM(dow(k)), TX(leadOf(k))]),
  );
  // All Data: role, module, member, date order, so rows group the same way as the columns
  const sortText = (cell, i) => (i === 0 && !cell.v ? "￿" : String(cell.v ?? "")); // no role sorts last
  flat.sort((a, b) => {
    for (let i = 0; i < 4; i++) {
      const d = sortText(a[i], i).localeCompare(sortText(b[i], i));
      if (d) return d;
    }
    return 0;
  });
  const fw = [18, 16, 26, 13, 8, 14, 20],
    fl = [
      ...top(
        "All data · module-wise · " + per,
        "One row per role, module, member and date, with who took the scrum. Use the filter arrows in row 3 to narrow by role, module, member, date or status.",
      ),
      [HD("Role"), HD("Module"), HD("Member"), HD("Date"), HD("Day"), HD("Status"), HD("Scrum taken by")],
      ...flat,
    ];
  return xlsx([
    { name: "Summary", rows: srows, w: sw, fy: 3 },
    ...out,
    { name: "All Data", rows: fl, w: fw, fy: 3, af: flat.length ? "A3:G" + (3 + flat.length) : "" },
  ]);
}
let xSel = [],
  bulkSel = [];
let xMode = "m";
function xShow() {
  $("#xMonthRow").hidden = xMode !== "m";
  $("#xDayRow").hidden = xMode !== "d";
  document.querySelectorAll("#xSeg button").forEach(b => b.classList.toggle("on", b.dataset.v === xMode));
}
document.querySelectorAll("#xSeg button").forEach(
  b =>
    (b.onclick = () => {
      xMode = b.dataset.v;
      xShow();
    }),
);
function openX(from) {
  const all = [...S.modules, "Unassigned"],
    mk = from === "mark",
    base = mk ? md.split("-").map(Number) : [cur.y, cur.m + 1, 1],
    ys = [...new Set([now.getFullYear(), base[0], ...Object.keys(S.att).map(k => +k.slice(0, 4))])].sort(
      (a, b) => b - a,
    );
  $("#xM").innerHTML = MN.map((n, i) => `<option value="${i}">${esc(n)}</option>`).join("");
  $("#xY").innerHTML = ys.map(y => `<option>${y}</option>`).join("");
  $("#xM").value = base[1] - 1;
  $("#xY").value = base[0];
  $("#xD").value = mk
    ? md
    : dsel || ky(cur.y, cur.m, cur.y === now.getFullYear() && cur.m === now.getMonth() ? now.getDate() : 1);
  xMode = mk ? "d" : "a";
  xShow();
  xSel = mk && mset.length ? mset.map(x => (x === "__none" ? "Unassigned" : x)) : all.slice();
  MS($("#xMods"), all, xSel, a => (xSel = a), "Select modules");
  $("#xdlg").showModal();
}
$("#xlsBtn").onclick = () => openX("mark");
$("#xlsBtn2").onclick = () => openX("dash");
$("#xCancel").onclick = () => $("#xdlg").close();
$("#xGo").onclick = () => {
  const mods = [...S.modules, "Unassigned"].filter(x => xSel.includes(x));
  if (!mods.length) {
    toast("Select at least one module");
    return;
  }
  let y,
    m,
    k = "",
    all = false;
  if (xMode === "a") {
    if (!Object.keys(S.att).some(d => Object.keys(S.att[d]).length)) {
      toast("No attendance recorded yet");
      return;
    }
    all = true;
  } else if (xMode === "d") {
    const v = $("#xD").value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      toast("Pick a date to export");
      return;
    }
    const q = v.split("-").map(Number);
    if (!isWorkDay(v)) {
      toast(offLabel(v) + " isn’t tracked — pick a working day");
      return;
    }
    y = q[0];
    m = q[1] - 1;
    k = v;
  } else {
    y = +$("#xY").value;
    m = +$("#xM").value;
  }
  save("Attendance_" + (all ? "All-data" : k || MN[m] + "_" + y) + "_by-module.xlsx", buildX({ y, m, k, all }, mods));
  $("#xdlg").close();
  toast("Excel exported");
};
