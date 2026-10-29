// Start-up: checks the server and the session, then subscribes to settings, members and days and
// keeps the page covered until all three have loaded. Every change anyone saves arrives through these.
function gateShow(t, m, retry) {
  $("#gate").hidden = false;
  $("#gT").textContent = t;
  $("#gM").textContent = m;
  $("#gB").innerHTML = retry ? `<button class="btn pri" id="gRetry">Try again</button>` : "";
  if (retry) $("#gRetry").onclick = boot;
  document.body.classList.add("locked");
}
function gateHide() {
  $("#gate").hidden = true;
  document.body.classList.remove("locked");
}
function checkGate() {
  if (!(ME && SET && CFG && DAYS && DOK)) return;
  const was = document.body.classList.contains("locked");
  gateHide();
  if (was) route();
}
async function boot() {
  gateShow("Connecting…", "Loading the latest attendance from the server.", false);
  if (DB) DB.close();
  DB = null;
  SET = CFG = DAYS = null;
  DOK = false;
  lost = false;

  let healthy = false;
  try {
    const r = await fetch("/api/health", { cache: "no-store" });
    healthy = r.ok && (await r.json()).ok === true;
  } catch (e) {}
  if (!healthy) {
    gateShow("Can’t reach the server", "Start the backend with scripts\\start.ps1, then reload this page.", true);
    return;
  }

  try {
    ME = await apiRequest("GET", "auth/me");
  } catch (e) {
    if (e.status === 401) showLogin();
    else gateShow("Can’t reach the server", e.message || "The server didn’t answer.", true);
    return;
  }
  if (ME.mustChangePassword) {
    showForcedPasswordChange();
    return;
  }
  applyRole();

  DB = serverRuntime();
  const fail = e => {
    if (e && e.status === 401) return;
    if (!SET || !CFG || !DAYS)
      gateShow("Couldn’t load the data", (e && e.message) || "The server didn’t answer.", true);
    else syncState("Offline · reconnecting", true);
  };
  DB.onEvent(path => {
    if (path === "users/" + ME.username) refreshMe();
    if (path === "users" && $("#accdlg").open) accLoad();
  });
  DB.doc("app/settings").onSnapshot(s => {
    if (!s.exists) {
      gateShow("No settings found", "Restart the backend so it can create the starting settings.", true);
      return;
    }
    applySettings(s.data());
    if (CFG && DAYS) applySnap();
    else checkGate();
  }, fail);
  DB.doc("app/config").onSnapshot(s => {
    CFG = s.exists ? s.data() : {};
    applySnap();
  }, fail);
  DB.collection("days").onSnapshot(q => {
    const o = {};
    q.docs.forEach(d => {
      o[d.id] = d.data();
    });
    DAYS = o;
    DOK = true;
    applySnap();
  }, fail);
  syncState(RO ? "View only" : "All changes saved", RO);
}
