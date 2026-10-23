/* ============================================================
   modes.js — learning-mode selector + difficulty badge helper
   Modes: learn | explore | build | debug | interview
   Sets <body data-mode="…"> so CSS can gate content, persists the
   choice, and emits "apilab:mode". Also exposes AV.ui.setDifficulty
   for modules to tag a lesson's level in the toolbar.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var KEY = "apilab-mode";
  var MODES = ["learn", "explore", "build", "debug", "interview"];

  function current() {
    var m = null;
    try { m = localStorage.getItem(KEY); } catch (e) {}
    return MODES.indexOf(m) !== -1 ? m : "learn";
  }

  function apply(mode) {
    document.body.setAttribute("data-mode", mode);
    var pills = document.querySelectorAll(".mode-pill");
    pills.forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-mode") === mode); });
    try { localStorage.setItem(KEY, mode); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("apilab:mode", { detail: { mode: mode } })); } catch (e) {}
  }

  function init() {
    apply(current());
    var sel = document.getElementById("mode-selector");
    if (sel) {
      sel.addEventListener("click", function (e) {
        var btn = e.target.closest(".mode-pill");
        if (btn) apply(btn.getAttribute("data-mode"));
      });
    }
    // Clear the per-lesson difficulty badge whenever we navigate; the
    // incoming module re-sets it in its render().
    window.addEventListener("afviz:navigate", function () { AV.ui.setDifficulty(null); });
  }

  AV.ui = AV.ui || {};
  AV.ui.getMode = current;

  // Wire a .tabstrip (buttons with data-tab) to .tab-panel[data-tab].
  AV.ui.wireTabs = function (root) {
    if (!root) return;
    var strip = root.querySelector(".tabstrip");
    if (!strip) return;
    strip.addEventListener("click", function (e) {
      var btn = e.target.closest(".tab");
      if (!btn) return;
      var id = btn.getAttribute("data-tab");
      strip.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("active", t === btn); });
      root.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-tab") === id); });
    });
  };
  AV.ui.setDifficulty = function (level) {
    var el = document.getElementById("diff-badge");
    if (!el) return;
    if (!level) { el.hidden = true; el.textContent = ""; el.className = "diff-badge"; return; }
    el.hidden = false;
    el.textContent = level;
    el.className = "diff-badge " + String(level).toLowerCase();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
