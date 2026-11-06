/* ============================================================
   features/progress.js — local-first learning progress
   Tracks which screens the learner has visited, renders a meter
   and per-track counts in the sidebar, and marks visited links
   with a check. Subscribes to the `app:navigate` event bus — add
   this feature by loading the file, no router edits needed.
   Storage: localStorage key `o9scs-progress` (per-viewer only).
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var KEY = "o9scs-progress";

  // Screens that count toward "explored" (exclude pure meta/hubs).
  var EXCLUDE = { home: 1, dashboard: 1 };

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  var Progress = {
    _state: null,

    init: function () {
      this._state = load();
      var self = this;
      document.addEventListener("app:navigate", function (e) {
        var id = e && e.detail && e.detail.id;
        if (id) self.markVisited(id);
      });
      // Reflect any already-stored progress on first paint.
      this.render();
    },

    isVisited: function (id) { return !!(this._state && this._state[id]); },

    markVisited: function (id) {
      if (!id || EXCLUDE[id]) { this.render(); return; }
      var route = AV.routes && AV.routes[id];
      if (!route || !route.ready) { this.render(); return; } // only count built screens
      if (!this._state) this._state = load();
      if (!this._state[id]) { this._state[id] = Date.now(); save(this._state); }
      this.render();
    },

    reset: function () { this._state = {}; save(this._state); this.render(); },

    // Count of built, non-excluded screens (the realistic denominator today).
    _denominator: function () {
      var screens = AV.getScreens ? AV.getScreens() : [];
      var n = 0;
      screens.forEach(function (s) { if (s.ready && !EXCLUDE[s.id]) n++; });
      return n;
    },

    stats: function () {
      var done = 0, state = this._state || {};
      var screens = AV.getScreens ? AV.getScreens() : [];
      screens.forEach(function (s) { if (s.ready && !EXCLUDE[s.id] && state[s.id]) done++; });
      var total = this._denominator();
      return { done: done, total: total, pct: total ? Math.round((done / total) * 100) : 0 };
    },

    render: function () {
      var state = this._state || {};
      // Checkmarks on visited links
      document.querySelectorAll(".sidebar-link").forEach(function (a) {
        var id = a.getAttribute("data-route");
        a.classList.toggle("visited", !!state[id]);
      });
      // Per-track "visited/built" counts
      var tracks = AV.getTracks ? AV.getTracks() : [];
      tracks.forEach(function (tr) {
        var built = 0, vis = 0;
        tr.items.forEach(function (it) {
          var id = it[0], ready = !!it[2];
          if (ready && !EXCLUDE[id]) { built++; if (state[id]) vis++; }
        });
        var el = document.querySelector('[data-track-count="' + tr.id + '"]');
        if (el) el.textContent = built ? (vis + "/" + built) : "";
      });
      // Overall meter
      var host = document.getElementById("nav-progress");
      if (host) {
        var s = this.stats();
        host.innerHTML =
          '<div class="np-top"><span class="np-label">Progress</span>' +
            '<span class="np-val">' + s.done + " / " + s.total + "</span></div>" +
          '<div class="np-bar"><div class="np-fill" style="width:' + s.pct + '%"></div></div>' +
          '<div class="np-hint">' + s.pct + '% of built modules explored · <kbd>⌘K</kbd> to search</div>';
      }
    }
  };

  AV.Progress = Progress;
})();
