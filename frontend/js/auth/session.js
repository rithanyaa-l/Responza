// Signed-in user: sign-in screen, first-sign-in password change, user menu, sign out, and the
// role-based look of the page. The server enforces every permission; this only hides what a role
// can't use. Roles: admin (everything), manager (attendance, members, modules, roles), viewer (read-only).
let ME = null;
const ROLE_LABELS = { admin: "Admin", manager: "Program Manager", viewer: "Viewer" };
const isAdmin = () => !!ME && ME.role === "admin";
const canEdit = () => !!ME && ME.role !== "viewer";

function applyRole() {
  document.body.classList.toggle("is-admin", isAdmin());
  document.body.classList.toggle("read-only", !canEdit());
  RO = !canEdit();
  const role = ROLE_LABELS[ME.role] || ME.role;
  $("#userAv").textContent = ME.username.slice(0, 2).toUpperCase();
  $("#userAv").style.setProperty("--h", hue(ME.username));
  $("#userName").textContent = ME.username;
  $("#userRole").textContent = role;
  $("#userRole").dataset.role = ME.role;
  $("#userMenuName").textContent = ME.username + " · " + role;
  $("#userMenuEmail").textContent = ME.email || "No email set";
  $("#userBtn").title = "Signed in as " + ME.username + " (" + role + ")";
  $("#userBox").hidden = false;
}

// user menu in the header: Change password, Sign out
function setUserMenu(open) {
  $("#userMenu").hidden = !open;
  $("#userBtn").setAttribute("aria-expanded", String(open));
  if (open) $("#userMenu button").focus();
}
$("#userBtn").onclick = () => setUserMenu($("#userMenu").hidden);
document.addEventListener("click", e => {
  if (!e.target.closest("#userBox")) setUserMenu(false);
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("#userMenu").hidden) {
    setUserMenu(false);
    $("#userBtn").focus();
  }
});

// renders a small form inside the full-page gate card
function gateForm(title, message, fields, submitLabel, onSubmit) {
  gateShow(title, message, false);
  $("#gB").innerHTML =
    `<form id="gForm" class="gform" novalidate>` +
    fields
      .map(
        f =>
          `<label class="fld"><span>${esc(f.label)}</span><input id="${f.id}" type="${f.type || "text"}" autocomplete="${f.auto}" maxlength="200" required></label>`,
      )
      .join("") +
    `<p class="hint gerr" id="gErr" role="alert"></p><button class="btn pri" type="submit" id="gGo">${esc(submitLabel)}</button></form>`;
  const form = $("#gForm"),
    err = $("#gErr"),
    go = $("#gGo");
  form.onsubmit = async e => {
    e.preventDefault();
    err.textContent = "";
    go.disabled = true;
    try {
      await onSubmit(id => $("#" + id).value);
    } catch (x) {
      err.textContent = (x && x.message) || "Something went wrong. Try again.";
    } finally {
      if (document.body.contains(go)) go.disabled = false;
    }
  };
  $("#" + fields[0].id).focus();
}

function showLogin(message) {
  gateForm(
    "Sign in",
    message || "Sign in with your username and password.",
    [
      { id: "lgUser", label: "Username", auto: "username" },
      { id: "lgPass", label: "Password", type: "password", auto: "current-password" },
    ],
    "Sign in",
    async val => {
      const username = val("lgUser").trim(),
        password = val("lgPass");
      if (!username || !password) throw { message: "Enter your username and password." };
      try {
        ME = await apiRequest("POST", "auth/login", { username, password });
      } catch (e) {
        throw { message: e.status === 401 ? "Wrong username or password." : e.message };
      }
      boot();
    },
  );
}

// new accounts and reset passwords are temporary: choose your own before using the tracker
function showForcedPasswordChange() {
  gateForm(
    "Choose a new password",
    "Signed in as " + ME.username + ". Your password is temporary, so choose your own to continue.",
    [
      { id: "fpCur", label: "Current password", type: "password", auto: "current-password" },
      { id: "fpNew", label: "New password", type: "password", auto: "new-password" },
      { id: "fpRep", label: "Repeat new password", type: "password", auto: "new-password" },
    ],
    "Save password",
    async val => {
      await changePassword(val("fpCur"), val("fpNew"), val("fpRep"));
      ME.mustChangePassword = false;
      toast("Password changed");
      boot();
    },
  );
}

async function changePassword(current, next, repeat) {
  if (!current || !next) throw { message: "Fill in every field." };
  if (next !== repeat) throw { message: "The new passwords don’t match." };
  await apiRequest("POST", "auth/password", { current, next });
}

let lost = false;
function sessionLost() {
  if (lost || !ME) return;
  lost = true;
  ME = null;
  if (DB) DB.close();
  DB = null;
  document.querySelectorAll("dialog[open]").forEach(d => d.close());
  showLogin("Your session ended or your access changed. Please sign in again.");
}

async function signOut() {
  try {
    await apiRequest("POST", "auth/logout");
  } catch (e) {}
  location.reload();
}

// my own account changed (role, password reset, removed): reload my details
async function refreshMe() {
  try {
    ME = await apiRequest("GET", "auth/me");
  } catch (e) {
    if (e.status === 401) sessionLost();
    return;
  }
  if (ME.mustChangePassword) {
    showForcedPasswordChange();
    return;
  }
  applyRole();
  route();
}

$("#logoutBtn").onclick = signOut;
$("#pwBtn").onclick = () => {
  setUserMenu(false);
  ["pwCur", "pwNew", "pwRep"].forEach(id => ($("#" + id).value = ""));
  $("#pwErr").textContent = "";
  $("#pwdlg").showModal();
  $("#pwCur").focus();
};
$("#pwCancel").onclick = () => $("#pwdlg").close();
$("#pwSave").onclick = async () => {
  const b = $("#pwSave");
  b.disabled = true;
  $("#pwErr").textContent = "";
  try {
    await changePassword($("#pwCur").value, $("#pwNew").value, $("#pwRep").value);
    $("#pwdlg").close();
    toast("Password changed. Other devices were signed out.");
  } catch (e) {
    $("#pwErr").textContent = e.message || "Couldn’t change the password.";
  } finally {
    b.disabled = false;
  }
};
