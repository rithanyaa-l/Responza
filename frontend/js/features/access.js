// Manage access (admins only): list users with username, role and email; add, edit and remove them.
// New and reset passwords are temporary: the user picks their own at next sign-in.
let accUsers = [];
let accEditing = null; // username being edited, or null when adding

const roleOptions = selected =>
  Object.entries(ROLE_LABELS)
    .map(([k, label]) => `<option value="${k}"${k === selected ? " selected" : ""}>${esc(label)}</option>`)
    .join("");

async function accLoad() {
  try {
    accUsers = await apiRequest("GET", "users");
  } catch (e) {
    $("#accMsg").textContent = e.message || "Couldn’t load users.";
    return;
  }
  $("#accMsg").textContent = "";
  $("#accCount").textContent = accUsers.length + (accUsers.length === 1 ? " user" : " users");
  $("#accList").innerHTML =
    `<table class="acctable"><thead><tr><th>Username</th><th>Email</th><th>Role</th><th><span class="vh">Actions</span></th></tr></thead><tbody>` +
    accUsers
      .map(u => {
        const self = u.username === ME.username;
        return (
          `<tr><td><b>${esc(u.username)}</b>${self ? ' <span class="tag">You</span>' : ""}` +
          (u.mustChangePassword ? '<br><span class="sub">Temporary password</span>' : "") +
          `</td><td>${u.email ? esc(u.email) : '<span class="sub">—</span>'}</td>` +
          `<td><span class="role role-${esc(u.role)}">${esc(ROLE_LABELS[u.role] || u.role)}</span></td>` +
          `<td class="acts"><button type="button" class="btn acc-edit" data-u="${esc(u.username)}">Edit</button>` +
          (self ? "" : `<button type="button" class="btn acc-del" data-u="${esc(u.username)}">Remove</button>`) +
          `</td></tr>`
        );
      })
      .join("") +
    `</tbody></table>`;
}

function openUserForm(username) {
  accEditing = username || null;
  const u = accUsers.find(x => x.username === username);
  $("#usrT").textContent = u ? "Edit " + u.username : "Add user";
  $("#usrName").value = u ? u.username : "";
  $("#usrName").disabled = !!u;
  $("#usrEmail").value = u ? u.email : "";
  $("#usrRole").innerHTML = roleOptions(u ? u.role : "manager");
  $("#usrPass").value = "";
  $("#usrPassLabel").textContent = u ? "Reset password (leave blank to keep)" : "Temporary password";
  $("#usrErr").textContent = "";
  $("#usrSave").textContent = u ? "Save changes" : "Add user";
  $("#usrdlg").showModal();
  (u ? $("#usrEmail") : $("#usrName")).focus();
}

async function saveUser() {
  const b = $("#usrSave");
  b.disabled = true;
  $("#usrErr").textContent = "";
  const body = { email: $("#usrEmail").value.trim(), role: $("#usrRole").value };
  const password = $("#usrPass").value;
  try {
    if (accEditing) {
      if (password) body.password = password;
      await apiRequest("PUT", "users/" + encodeURIComponent(accEditing), body);
      toast(password ? accEditing + " updated · they must choose a new password" : accEditing + " updated");
    } else {
      body.username = $("#usrName").value.trim();
      body.password = password;
      await apiRequest("POST", "users", body);
      toast(body.username.toLowerCase() + " added · share the temporary password with them");
    }
    $("#usrdlg").close();
    await accLoad();
  } catch (e) {
    $("#usrErr").textContent = e.message || "Couldn’t save the user.";
  } finally {
    b.disabled = false;
  }
}

function removeUser(username) {
  $("#accdlg").close();
  ask(
    "Remove " + username + "?",
    username + " will no longer be able to sign in. Attendance records are not affected.",
    "Remove",
    async () => {
      try {
        await apiRequest("DELETE", "users/" + encodeURIComponent(username));
        toast(username + " removed");
      } catch (e) {
        toast(e.message || "Couldn’t remove the user.");
      }
      $("#accdlg").showModal();
      await accLoad();
    },
  );
}

$("#accBtn").onclick = async () => {
  $("#accList").innerHTML = "";
  $("#accdlg").showModal();
  await accLoad();
};
$("#accClose").onclick = () => $("#accdlg").close();
$("#accAdd").onclick = () => openUserForm(null);
$("#accList").onclick = e => {
  const edit = e.target.closest(".acc-edit"),
    del = e.target.closest(".acc-del");
  if (edit) openUserForm(edit.dataset.u);
  if (del) removeUser(del.dataset.u);
};
$("#usrCancel").onclick = () => $("#usrdlg").close();
$("#usrSave").onclick = saveUser;
$("#usrdlg").addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.tagName === "INPUT") {
    e.preventDefault();
    saveUser();
  }
});
