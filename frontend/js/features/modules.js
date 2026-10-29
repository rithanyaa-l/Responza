// Modules: membership helpers, module filters and the Manage modules dialog
// normalises loaded data: every member gets a modules list, with mod = their first module
function mig(o) {
  o.members.forEach(m => {
    if (!Array.isArray(m.mods)) m.mods = m.mod ? [m.mod] : [];
    m.mod = m.mods[0] || "";
  });
  return o;
}
function ms(f) {
  return f === "__none"
    ? S.members.filter(m => !(m.mods || []).length)
    : f
      ? S.members.filter(m => (m.mods || []).includes(f))
      : S.members;
}
function sortM(L) {
  const i = m => {
    const x = S.modules.indexOf(m.mod || "");
    return x < 0 ? 999 : x;
  };
  return L.slice().sort((a, b) => i(a) - i(b));
}
function modOpts(v) {
  return (
    S.modules.map(n => `<option value="${esc(n)}" ${n === v ? "selected" : ""}>${esc(n)}</option>`).join("") +
    `<option value="" ${!v ? "selected" : ""}>Unassigned</option>`
  );
}
function fillMod(sel, v, all) {
  sel.innerHTML = all
    ? `<option value="">All modules</option>` +
      S.modules.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("") +
      `<option value="__none">Unassigned</option>`
    : modOpts("");
  sel.value = v || "";
}
function syncMods() {
  if (dmod && dmod !== "__none" && !S.modules.includes(dmod)) dmod = "";
  mset = mset.filter(x => x === "__none" || S.modules.includes(x));
  fillMod($("#dFilter"), dmod, true);
  MS(
    $("#mFilter"),
    [...S.modules, "Unassigned"],
    mset.map(x => (x === "__none" ? "Unassigned" : x)),
    a => {
      mset = a.map(x => (x === "Unassigned" ? "__none" : x));
      renderMark();
    },
    "All modules",
  );
}
function msA(a) {
  return !a.length
    ? S.members
    : S.members.filter(m => a.some(f => (f === "__none" ? !(m.mods || []).length : (m.mods || []).includes(f))));
}
function mdRender() {
  $("#mdList").innerHTML =
    S.modules
      .map(
        n =>
          `<div class="mrow" style="padding:8px 0"><div><b>${esc(n)}</b> <span class="sub">· ${S.members.filter(m => (m.mods || []).includes(n)).length} members</span></div><button class="mdel" data-mn="${esc(n)}" title="Remove module">✕</button></div>`,
      )
      .join("") || `<p class="hint">No modules yet.</p>`;
}
$("#dFilter").onchange = e => {
  dmod = e.target.value;
  render();
};
$("#modBtn").onclick = () => {
  mdRender();
  $("#mdn").value = "";
  $("#mdlg").showModal();
};
$("#mdClose").onclick = () => $("#mdlg").close();
$("#mdlg").addEventListener("close", () => route());
$("#mdAdd").onclick = () => {
  const n = $("#mdn").value.trim();
  if (!n) return;
  if (S.modules.some(x => x.toLowerCase() === n.toLowerCase())) {
    $("#mdn").select();
    return;
  }
  S.modules.push(n);
  persist();
  $("#mdn").value = "";
  mdRender();
};
$("#mdn").addEventListener("keydown", e => {
  if (e.key === "Enter") $("#mdAdd").click();
});
$("#mdList").onclick = e => {
  const b = e.target.closest(".mdel");
  if (!b) return;
  const n = b.dataset.mn;
  $("#mdlg").close();
  ask(
    "Remove module “" + n + "”?",
    "Members in this module become Unassigned. Their attendance records are kept.",
    "Remove",
    () => {
      S.modules = S.modules.filter(x => x !== n);
      S.members.forEach(m => {
        m.mods = (m.mods || []).filter(x => x !== n);
        m.mod = m.mods[0] || "";
      });
      persist();
      route();
    },
  );
};
