/* ============================================================
   keyboard.js — animation transport shortcuts
   Delegates to whatever control bar is currently mounted
   (SolverViz.activeControls). Theme/help/Esc live in app.js.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});

  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return;
    // A modal open? Let app.js handle Escape; ignore transport keys.
    var modal = document.getElementById("kbd-modal");
    if (modal && !modal.classList.contains("hidden")) return;

    var ac = AV.activeControls;
    if (!ac) return;

    switch (e.key) {
      case " ":
      case "Spacebar":
        e.preventDefault();
        if (ac.toggle) ac.toggle();
        break;
      case "ArrowRight":
        e.preventDefault();
        if (ac.next) ac.next();
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (ac.prev) ac.prev();
        break;
      case "r":
      case "R":
        if (ac.reset) ac.reset();
        break;
      default:
        break;
    }
  });
})();
