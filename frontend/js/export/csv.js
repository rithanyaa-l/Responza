// CSV export of the register currently on screen (one count column per status from settings)
$("#csvBtn").onclick = () => {
  const ds = days(cur.y, cur.m).filter(x => !x.we),
    L = regList();
  if (!L.length) {
    toast("No members to export");
    return;
  }
  const q = v => {
    let t = String(v == null ? "" : v);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return '"' + t.replace(/"/g, '""') + '"';
  };
  const rows = [
    [
      "Role",
      "Module",
      "Member",
      ...ds.map(x => String(x.d).padStart(2, "0") + " " + MNS[cur.m] + " " + DNS[x.w]),
      ...STS().map(s => s.label),
      "Attendance %",
    ],
  ];
  L.forEach(mm => {
    const s = stats(mm.id, cur.y, cur.m);
    rows.push([
      mm.role || "",
      mm._g || "Unassigned",
      mm.name,
      ...ds.map(x => {
        const c = (S.att[x.k] || {})[mm.id];
        return c ? stLabel(c) : "";
      }),
      ...STS().map(x => s.c[x.code]),
      s.rate === null ? "" : s.rate,
    ]);
  });
  rows.push(
    [],
    ["Scrum taken by", "", "", ...ds.map(x => (S.att[x.k] && Object.keys(S.att[x.k]).length ? leadOf(x.k) : ""))],
  );
  save(
    "Attendance_" + MN[cur.m] + "_" + cur.y + ".csv",
    new Blob(["﻿" + rows.map(r => r.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }),
  );
};
