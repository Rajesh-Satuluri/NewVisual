/* ============================================================
   tooltip.js — global delegated tooltip for [data-tooltip]
   Positions a single #tooltip element near the hovered/focused target.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.DECICDViz = window.DECICDViz || {});
  var el = null;

  function node() {
    if (!el) el = document.getElementById("tooltip");
    return el;
  }

  function show(target) {
    var t = node();
    if (!t || !target) return;
    var txt = target.getAttribute("data-tooltip");
    if (!txt) return;
    t.textContent = txt;
    t.classList.remove("hidden");
    // Force layout so we can measure before positioning.
    t.classList.add("visible");
    var r = target.getBoundingClientRect();
    var tr = t.getBoundingClientRect();
    var top = r.top - tr.height - 8;
    if (top < 8) top = r.bottom + 8; // flip below if no room above
    var left = r.left + r.width / 2 - tr.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tr.width - 8));
    t.style.top = Math.round(top) + "px";
    t.style.left = Math.round(left) + "px";
  }

  function hide() {
    var t = node();
    if (!t) return;
    t.classList.remove("visible");
    t.classList.add("hidden");
  }

  function closest(target) {
    return target && target.closest ? target.closest("[data-tooltip]") : null;
  }

  document.addEventListener("mouseover", function (e) {
    var tgt = closest(e.target);
    if (tgt) show(tgt);
  });
  document.addEventListener("mouseout", function (e) {
    if (closest(e.target)) hide();
  });
  document.addEventListener("focusin", function (e) {
    var tgt = closest(e.target);
    if (tgt) show(tgt);
  });
  document.addEventListener("focusout", hide);
  // Hide on scroll inside the canvas so it doesn't float detached.
  document.addEventListener("scroll", hide, true);

  AV.Tooltip = { show: show, hide: hide };
})();
