// Roles: options, Manage roles dialog, role filter and search
function roleOpts(v) {
  return (
    `<option value="">No role</option>` +
    S.roles.map(n => `<option value="${esc(n)}" ${n === v ? "selected" : ""}>${esc(n)}</option>`).join("")
  );
}
function fillRole(sel, all, v) {
  sel.innerHTML =
    (all ? `<option value="">All roles</option>` : `<option value="">No role</option>`) +
    S.roles.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
  sel.value = v || "";
}
function rdRender() {
  $("#rdList").innerHTML =
    S.roles
      .map(
        n =>
          `<div class="mrow" style="padding:8px 0"><div><b>${esc(n)}</b> <span class="sub">· ${S.members.filter(m => m.role === n).length} members</span></div><button class="mdel" data-rn="${esc(n)}" title="Remove role">✕</button></div>`,
      )
      .join("") || `<p class="hint">No roles yet.</p>`;
}
const openRoles = () => {
  rdRender();
  $("#rdn").value = "";
  $("#rdlg").showModal();
  $("#rdn").focus();
};
$("#roleBtn").onclick = $("#roleBtn2").onclick = openRoles;
$("#modBtn2").onclick = $("#modBtn").onclick;
$("#rdClose").onclick = () => $("#rdlg").close();
$("#rdlg").addEventListener("close", () => route());
$("#rdAdd").onclick = () => {
  const n = $("#rdn").value.trim();
  if (!n) return;
  if (S.roles.some(x => x.toLowerCase() === n.toLowerCase())) {
    $("#rdn").select();
    return;
  }
  S.roles.push(n);
  persist();
  $("#rdn").value = "";
  rdRender();
  toast("Role added");
};
$("#rdn").addEventListener("keydown", e => {
  if (e.key === "Enter") $("#rdAdd").click();
});
$("#rdList").onclick = e => {
  const b = e.target.closest(".mdel");
  if (!b) return;
  const n = b.dataset.rn;
  $("#rdlg").close();
  ask("Remove role “" + n + "”?", "Members with this role will show as “No role”.", "Remove", () => {
    S.roles = S.roles.filter(x => x !== n);
    S.members.forEach(m => {
      if (m.role === n) m.role = "";
    });
    persist();
    route();
    toast("Role removed");
  });
};
$("#rFilter").onchange = e => {
  drole = e.target.value;
  render();
};
["qd", "qm"].forEach(
  id =>
    ($("#" + id).oninput = e => {
      qry = e.target.value.trim().toLowerCase();
      $("#qd").value = $("#qm").value = e.target.value;
      view === "mark" ? renderMark() : render();
    }),
);
