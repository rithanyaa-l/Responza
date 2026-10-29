// Switching between the Dashboard and Mark attendance views
$("#fDash").onclick = e => {
  e.preventDefault();
  go("dash");
};
$("#fMark").onclick = e => {
  e.preventDefault();
  go("mark");
};
$("#fTop").onclick = e => {
  e.preventDefault();
  scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth" });
};
function route() {
  syncMods();
  const m = view === "mark";
  $("#vMark").hidden = !m;
  $("#vDash").hidden = m;
  $("#tabM").classList.toggle("on", m);
  $("#tabD").classList.toggle("on", !m);
  m ? renderMark() : render();
}
function go(v) {
  view = v;
  route();
  window.scrollTo(0, 0);
  setTimeout(updSpy, 0);
}
$("#tabD").onclick = e => {
  e.preventDefault();
  go("dash");
};
$("#tabM").onclick = e => {
  e.preventDefault();
  go("mark");
};
$("#toDash").onclick = () => go("dash");
