// Light / dark theme
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("scrum-theme", t);
  } catch (e) {}
  $("#themeBtn").textContent = t === "dark" ? "☀️" : "🌙";
}
let th = null;
try {
  th = localStorage.getItem("scrum-theme");
} catch (e) {}
setTheme(th || (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light"));
$("#themeBtn").onclick = () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
