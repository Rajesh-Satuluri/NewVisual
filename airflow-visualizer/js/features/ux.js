/* ============================================================
   ux.js — progress tracking, Prev/Next pager, swipe, first-run tip
   All wired through the router's afviz:navigate / afviz:mounted bus.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var VISITED = "afviz-visited", TOURED = "afviz-toured";

  function readSet(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } }
  function writeSet(k, a) { try { localStorage.setItem(k, JSON.stringify(a)); } catch (e) {} }

  // Ordered route list from the curated sidebar DOM order.
  function order() {
    var seen = {}, out = [];
    document.querySelectorAll(".sidebar-link[data-route]").forEach(function (a) {
      var id = a.getAttribute("data-route");
      if (!seen[id]) { seen[id] = 1; out.push(id); }
    });
    return out;
  }

  // ── Progress meter (sidebar) + visited checkmarks ─────────
  var meter, fill, meterLabel;
  function ensureMeter() {
    if (meter) return;
    var sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    meter = document.createElement("div");
    meter.className = "nav-progress";
    meter.innerHTML =
      '<div class="nav-progress-top"><span>Progress</span><span class="nav-progress-count"></span></div>' +
      '<div class="nav-progress-bar"><div class="nav-progress-fill"></div></div>';
    sidebar.insertBefore(meter, sidebar.firstChild);
    fill = meter.querySelector(".nav-progress-fill");
    meterLabel = meter.querySelector(".nav-progress-count");
  }
  function totalRoutes() { return Object.keys(AV.routes || {}).length || order().length; }
  function refreshProgress() {
    ensureMeter();
    var visited = readSet(VISITED);
    var total = totalRoutes();
    var vset = {};
    visited.forEach(function (id) { vset[id] = 1; });
    document.querySelectorAll(".sidebar-link[data-route]").forEach(function (a) {
      a.classList.toggle("visited", !!vset[a.getAttribute("data-route")]);
    });
    var n = visited.filter(function (id) { return (AV.routes || {})[id]; }).length;
    var pct = total ? Math.round(n / total * 100) : 0;
    if (fill) fill.style.width = pct + "%";
    if (meterLabel) meterLabel.textContent = n + " / " + total;
    return { n: n, total: total };
  }
  function recordVisit(id) {
    if (!id) return;
    var v = readSet(VISITED);
    if (v.indexOf(id) === -1) {
      v.push(id);
      writeSet(VISITED, v);
      var p = refreshProgress();
      if (p.n === p.total && p.total > 1) {
        try { if (!localStorage.getItem("afviz-completed")) { localStorage.setItem("afviz-completed", "1"); if (AV.toast) AV.toast("🎉 You've explored every module!"); } } catch (e) {}
      }
    } else { refreshProgress(); }
  }

  // ── Prev / Next pager (appended into the module) ───────────
  function buildPager(id) {
    var container = document.getElementById("module-container");
    if (!container) return;
    var seq = order();
    var i = seq.indexOf(id);
    if (i === -1) return;
    var prev = i > 0 ? seq[i - 1] : null;
    var next = i < seq.length - 1 ? seq[i + 1] : null;
    var routesMap = AV.routes || {};
    function label(rid) { return (routesMap[rid] && routesMap[rid].title) || rid; }
    var pager = document.createElement("nav");
    pager.className = "module-pager";
    pager.setAttribute("aria-label", "Module pager");
    pager.innerHTML =
      (prev ? '<a class="pager-btn prev" href="#' + prev + '"><span class="pager-dir">← Previous</span><span class="pager-name">' + label(prev) + "</span></a>" : '<span class="pager-btn empty"></span>') +
      (next ? '<a class="pager-btn next" href="#' + next + '"><span class="pager-dir">Next →</span><span class="pager-name">' + label(next) + "</span></a>" : '<span class="pager-btn empty"></span>');
    container.appendChild(pager);
  }

  // ── Swipe between modules (touch), guarded ─────────────────
  function initSwipe() {
    var canvas = document.getElementById("canvas");
    if (!canvas) return;
    var x0 = 0, y0 = 0, tracking = false;
    canvas.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) { tracking = false; return; }
      var t = e.target;
      if (t.closest && t.closest("pre, code, table, .table-wrap, .arch-canvas, .code-viewer, input[type=range], .cmdk-overlay")) { tracking = false; return; }
      tracking = true; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    canvas.addEventListener("touchend", function (e) {
      if (!tracking) return; tracking = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dx) < 70 || Math.abs(dy) > 45) return;
      var seq = order();
      var cur = (AV.router && AV.router.currentId) || (location.hash || "").replace(/^#/, "").split("/")[0];
      var i = seq.indexOf(cur);
      if (i === -1) return;
      if (dx < 0 && i < seq.length - 1) location.hash = "#" + seq[i + 1];
      else if (dx > 0 && i > 0) location.hash = "#" + seq[i - 1];
    }, { passive: true });
  }

  // ── First-run tip (once) ───────────────────────────────────
  function firstRunTip() {
    var seen; try { seen = localStorage.getItem(TOURED); } catch (e) { seen = "1"; }
    if (seen) return;
    var pop = document.createElement("div");
    pop.className = "welcome-pop";
    pop.innerHTML =
      '<div class="welcome-title">👋 Welcome to the Airflow Visualizer</div>' +
      '<ul class="welcome-tips">' +
        "<li>Press <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd> to jump to any module</li>" +
        "<li>Use <kbd>Space</kbd> to play animations, <kbd>←</kbd>/<kbd>→</kbd> to step</li>" +
        "<li>Your progress is tracked in the sidebar</li>" +
      "</ul>" +
      '<button class="welcome-dismiss btn btn-primary">Got it</button>';
    document.body.appendChild(pop);
    requestAnimationFrame(function () { pop.classList.add("show"); });
    pop.querySelector(".welcome-dismiss").addEventListener("click", function () {
      pop.classList.remove("show");
      try { localStorage.setItem(TOURED, "1"); } catch (e) {}
      setTimeout(function () { if (pop.parentNode) pop.parentNode.removeChild(pop); }, 300);
    });
  }

  // ── Wire to the navigation bus ─────────────────────────────
  window.addEventListener("afviz:navigate", function (e) {
    recordVisit(e.detail && e.detail.id);
  });
  window.addEventListener("afviz:mounted", function (e) {
    buildPager(e.detail && e.detail.id);
  });

  function boot() {
    refreshProgress();
    initSwipe();
    setTimeout(firstRunTip, 900);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
