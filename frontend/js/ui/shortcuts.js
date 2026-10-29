// Keyboard shortcuts: / search, T theme, arrows change month
document.addEventListener("keydown", e => {
  if (e.target.matches("input,select,textarea") || e.metaKey || e.ctrlKey || document.querySelector("dialog[open]"))
    return;
  if (e.key === "/") {
    e.preventDefault();
    (view === "mark" ? $("#qm") : $("#qd")).focus();
  } else if (e.key === "t" || e.key === "T") $("#themeBtn").click();
  else if (view === "dash" && e.key === "ArrowLeft") $("#prev").click();
  else if (view === "dash" && e.key === "ArrowRight") $("#next").click();
});
