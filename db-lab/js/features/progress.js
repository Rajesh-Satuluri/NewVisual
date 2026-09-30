/* ============================================================
   progress.js — localStorage-backed learning progress.
   Tracks: viewed concepts, quiz scores, per-domain mastery,
   recently-viewed, and last route (for "Continue Learning").
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  var KEY = "dblab-progress-v1";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  var state = load();
  state.viewed = state.viewed || {};       // conceptId -> timestamp
  state.quiz = state.quiz || {};           // conceptId -> { correct, total, at }
  state.recent = state.recent || [];       // [conceptId] most-recent-first
  state.last = state.last || null;         // last concept id opened

  var Progress = {
    markViewed: function (conceptId) {
      state.viewed[conceptId] = Date.now();
      state.last = conceptId;
      state.recent = [conceptId].concat(state.recent.filter(function (id) { return id !== conceptId; })).slice(0, 12);
      save(state);
    },
    recordQuiz: function (conceptId, correct, total) {
      state.quiz[conceptId] = { correct: correct, total: total, at: Date.now() };
      save(state);
    },
    isViewed: function (id) { return !!state.viewed[id]; },
    quizFor: function (id) { return state.quiz[id] || null; },
    recent: function () { return state.recent.slice(); },
    last: function () { return state.last; },

    // Domain mastery: blend of coverage (viewed) and quiz accuracy.
    domainStats: function (domain) {
      var all = (DL.concepts || []).filter(function (c) { return c.domain === domain; });
      var total = all.length || 1;
      var viewed = 0, qCorrect = 0, qTotal = 0;
      all.forEach(function (c) {
        if (state.viewed[c.id]) viewed++;
        var q = state.quiz[c.id];
        if (q) { qCorrect += q.correct; qTotal += q.total; }
      });
      var coverage = viewed / total;
      var accuracy = qTotal ? qCorrect / qTotal : null;
      // Mastery = 70% coverage + 30% accuracy (accuracy only counts once quizzed).
      var mastery = accuracy === null ? coverage * 0.7 : coverage * 0.7 + accuracy * 0.3;
      return { total: total, viewed: viewed, coverage: coverage, accuracy: accuracy, mastery: mastery };
    },

    // Weak areas: concepts quizzed below 60%, most-wrong first.
    weakConcepts: function (limit) {
      var out = [];
      Object.keys(state.quiz).forEach(function (id) {
        var q = state.quiz[id];
        if (q.total && q.correct / q.total < 0.6) {
          out.push({ id: id, ratio: q.correct / q.total });
        }
      });
      out.sort(function (a, b) { return a.ratio - b.ratio; });
      return limit ? out.slice(0, limit) : out;
    },

    overall: function () {
      var all = DL.concepts || [];
      var viewed = all.filter(function (c) { return state.viewed[c.id]; }).length;
      return { viewed: viewed, total: all.length };
    },

    reset: function () { state = { viewed: {}, quiz: {}, recent: [], last: null }; save(state); },
  };

  DL.Progress = Progress;
})();
