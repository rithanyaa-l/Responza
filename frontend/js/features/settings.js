// Settings dialog: edits the app/settings document (names, statuses, working days, holidays).
// Saving replaces the document (fields not shown here, such as the colour thresholds, are kept
// as they are); the backend validates it and every open page re-renders from the new values.
let setDraft = null;
const SET_TEXT = ["appName", "tagline", "orgName", "logo", "leadLabel", "locale"];
function openSettings() {
  setDraft = clone(SET);
  setRender();
  $("#setMsg").textContent = "";
  $("#setdlg").showModal();
}
function setRender() {
  const d = setDraft;
  SET_TEXT.forEach(k => ($("#set_" + k).value = d[k] || ""));
  $("#setSt").innerHTML = d.statuses
    .map(
      s =>
        `<div class="strow"><input class="st-code" value="${esc(s.code)}" maxlength="3" aria-label="Code" placeholder="Code"><input class="st-label" value="${esc(s.label)}" maxlength="40" aria-label="Label" placeholder="Label"><input class="st-color" type="color" value="${esc(s.color)}" aria-label="Colour"><label class="chk"><input type="checkbox" class="st-att"${s.attended ? " checked" : ""}>Attended</label><label class="chk"><input type="radio" name="stdef" class="st-def"${d.defaultStatus === s.code ? " checked" : ""}>Default</label><button type="button" class="mdel st-del" title="Remove status">✕</button></div>`,
    )
    .join("");
  $("#setDays").innerHTML = DNL.map(
    (n, w) =>
      `<label class="chk"><input type="checkbox" data-w="${w}"${d.workDays.includes(w) ? " checked" : ""}>${esc(n)}</label>`,
  ).join("");
  $("#setHol").innerHTML =
    d.holidays
      .map(
        h =>
          `<div class="strow"><input type="date" class="h-date" value="${esc(h.date)}" aria-label="Date"><input class="h-name" value="${esc(h.name)}" placeholder="Name" maxlength="60" aria-label="Holiday name"><button type="button" class="mdel h-del" title="Remove holiday">✕</button></div>`,
      )
      .join("") || `<p class="hint" style="margin:0">No holidays set.</p>`;
}
// read the form back into the draft (before re-rendering or saving)
function setRead() {
  const d = setDraft,
    rows = s => [...document.querySelectorAll(s)];
  SET_TEXT.forEach(k => (d[k] = $("#set_" + k).value.trim()));
  const sr = rows("#setSt .strow");
  d.statuses = sr.map(r => ({
    code: r.querySelector(".st-code").value.trim(),
    label: r.querySelector(".st-label").value.trim(),
    color: r.querySelector(".st-color").value,
    attended: r.querySelector(".st-att").checked,
  }));
  const di = sr.findIndex(r => r.querySelector(".st-def").checked);
  d.defaultStatus = di >= 0 ? d.statuses[di].code : "";
  d.workDays = rows("#setDays input:checked").map(x => +x.dataset.w);
  d.holidays = rows("#setHol .strow")
    .map(r => ({ date: r.querySelector(".h-date").value, name: r.querySelector(".h-name").value.trim() }))
    .filter(h => h.date);
}
$("#setSt").onclick = e => {
  const b = e.target.closest(".st-del");
  if (!b) return;
  const i = [...document.querySelectorAll("#setSt .strow")].indexOf(b.closest(".strow"));
  setRead();
  setDraft.statuses.splice(i, 1);
  setRender();
};
$("#setHol").onclick = e => {
  const b = e.target.closest(".h-del");
  if (!b) return;
  const i = [...document.querySelectorAll("#setHol .strow")].indexOf(b.closest(".strow"));
  setRead();
  setDraft.holidays.splice(i, 1);
  setRender();
};
$("#setStAdd").onclick = () => {
  setRead();
  setDraft.statuses.push({
    code: "",
    label: "",
    color: STS().length ? STS()[STS().length - 1].color : "#000000",
    attended: false,
  });
  setRender();
  const c = [...document.querySelectorAll("#setSt .st-code")].pop();
  c && c.focus();
};
$("#setHolAdd").onclick = () => {
  setRead();
  setDraft.holidays.push({ date: "", name: "" });
  setRender();
  const c = [...document.querySelectorAll("#setHol .h-date")].pop();
  c && c.focus();
};
async function setSave() {
  const b = $("#setSave");
  b.disabled = true;
  $("#setMsg").textContent = "";
  try {
    await DB.doc("app/settings").set(setDraft);
    $("#setdlg").close();
    toast("Settings saved");
  } catch (e) {
    $("#setMsg").textContent = (e && e.message) || "Couldn’t save the settings. Try again.";
  } finally {
    b.disabled = false;
  }
}
$("#setSave").onclick = () => {
  setRead();
  // statuses being removed that existing records still use: their marks are hidden, not deleted
  const keep = new Set(setDraft.statuses.map(s => s.code)),
    used = {};
  Object.values(S.att).forEach(d =>
    Object.values(d).forEach(c => {
      if (!keep.has(c)) used[c] = (used[c] || 0) + 1;
    }),
  );
  const gone = Object.keys(used);
  if (!gone.length) {
    setSave();
    return;
  }
  $("#setdlg").close();
  ask(
    "Remove status " + gone.join(", ") + "?",
    gone.map(c => used[c] + " mark" + (used[c] > 1 ? "s" : "") + " use " + c).join(", ") +
      ". They stay in the database but are hidden until a status with the same code is added back.",
    "Save",
    async () => {
      $("#setdlg").showModal();
      await setSave();
    },
    true,
  );
};
$("#setCancel").onclick = () => $("#setdlg").close();
$("#setBtn").onclick = $("#setBtn2").onclick = openSettings;
