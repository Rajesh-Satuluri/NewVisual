/* ============================================================
   progress.js — unified interview-prep progress store
   ------------------------------------------------------------
   One place that records what the learner has attempted across the
   new interview-prep features (troubleshooting scenarios, follow-up
   chains, …) so the Readiness Dashboard can aggregate it.

   Storage: a single namespaced, versioned key (afviz-progress-v1)
   holding { v, cats: { <category>: { items: { <id>: {…} } } } }.
   Every write is try/catch-guarded and fires an "afviz:progress"
   event so any open view can live-refresh.

   It also *reads* the signals the app already persists — per-module
   quiz best scores (afviz-quiz-<id>) and visited routes
   (afviz-visited) — so the dashboard builds on existing data rather
   than starting empty. No dependencies, ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var KEY = "afviz-progress-v1";

  function load() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY));
      if (o && o.v === 1 && o.cats) return o;
    } catch (e) {}
    return { v: 1, cats: {} };
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  function emit() {
    try { window.dispatchEvent(new CustomEvent("afviz:progress")); } catch (e) {}
  }

  var Progress = {
    /* Merge `patch` into cats[cat].items[id], stamp a timestamp,
       persist, and notify listeners. Idempotent per (cat,id). */
    record: function (cat, id, patch) {
      if (!cat || !id) return;
      var s = load();
      var c = s.cats[cat] || (s.cats[cat] = { items: {} });
      var it = c.items[id] || (c.items[id] = {});
      if (patch) {
        for (var k in patch) if (patch.hasOwnProperty(k)) it[k] = patch[k];
      }
      it.ts = Date.now();
      save(s);
      emit();
    },

    /* Raw items map for a category: { <id>: {…} } (never null). */
    items: function (cat) {
      var c = load().cats[cat];
      return (c && c.items) || {};
    },

    /* Count items in a category, optionally filtered by a predicate. */
    count: function (cat, pred) {
      var items = this.items(cat), n = 0;
      for (var id in items) if (items.hasOwnProperty(id)) {
        if (!pred || pred(items[id], id)) n++;
      }
      return n;
    },

    /* Existing per-module quiz best scores, folded in for the dashboard.
       Returns { <moduleId>: { best, total } } for every quiz bank. */
    legacyQuiz: function () {
      var banks = (AV.data && AV.data.quizBanks) || {}, out = {};
      for (var id in banks) if (banks.hasOwnProperty(id)) {
        var best = 0;
        try { best = parseInt(localStorage.getItem("afviz-quiz-" + id), 10) || 0; } catch (e) {}
        out[id] = { best: best, total: banks[id].length };
      }
      return out;
    },

    /* How many modules the learner has opened (existing afviz-visited). */
    visitedCount: function () {
      try { return (JSON.parse(localStorage.getItem("afviz-visited")) || []).length; }
      catch (e) { return 0; }
    },

    /* Subscribe to progress changes; returns an unsubscribe fn. */
    on: function (cb) {
      window.addEventListener("afviz:progress", cb);
      return function () { window.removeEventListener("afviz:progress", cb); };
    },

    /* Clear one category, or everything. */
    reset: function (cat) {
      var s = load();
      if (cat) delete s.cats[cat]; else s.cats = {};
      save(s);
      emit();
    }
  };

  AV.Progress = Progress;
})();
