/* ============================================================
   progress.js — DECICDViz.Progress
   Browser-local learning state: which modules were visited, which
   were explicitly completed, quiz results, bookmarks, and a spaced
   revision queue. Backed by localStorage; every read/write is
   wrapped so a private window or blocked storage never breaks the
   app — it just falls back to an in-memory copy for the session.

   Completion is meaningful: visiting a module does NOT complete it.
   A module is complete only when the learner marks it complete or
   passes its check. Progress is local to one browser and is not
   synced across devices.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  var KEY = "decicd-progress-v1";
  var SCHEMA = 2; // bumped in Iteration 9 (added competency + review)

  function emptyState() {
    return {
      schemaVersion: SCHEMA,
      visited: {},     // id -> last ISO timestamp
      completed: {},   // id -> ISO timestamp
      bookmarks: {},   // id -> { title, route, at }
      revision: {},    // id -> { title, route, at }
      quiz: null,      // { best, total, attempts, lastAt }
      labs: {},        // id -> { solved:bool, at, hints, attempts }
      competency: {},  // id -> { checksSeen, checksCorrect, lastAt }
      review: {}       // id -> { nextAt(ms), interval(days), misses, lastAt }
    };
  }

  // Migrate an older saved state to the current schema in place.
  // v1 lacked competency/review/schemaVersion — defaults fill in and
  // nothing is lost; old visited/completed/labs are preserved as-is.
  function migrate(s) {
    if (!s.competency) s.competency = {};
    if (!s.review) s.review = {};
    s.schemaVersion = SCHEMA;
    return s;
  }

  var mem = null;       // in-memory fallback / cache
  var listeners = [];

  function load() {
    if (mem) return mem;
    var s = emptyState();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          Object.keys(s).forEach(function (k) {
            if (parsed[k] != null) s[k] = parsed[k];
          });
        }
      }
    } catch (e) { /* storage blocked — use defaults in memory */ }
    mem = migrate(s);
    return mem;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* ignore */ }
    emit();
  }

  function emit() {
    listeners.forEach(function (cb) { try { cb(mem); } catch (e) {} });
  }

  // Curriculum = unique module ids from the RetailFlow learning path,
  // minus the pure learning/reference routes (they aren't "completed").
  var SKIP = { interview: 1, quiz: 1, glossary: 1, "master-map": 1, home: 1 };
  function curriculum() {
    var ids = [], seen = {};
    var path = (NS.RetailFlow && NS.RetailFlow.learningPath) || [];
    path.forEach(function (st) {
      (st.ids || []).forEach(function (id) {
        if (!seen[id] && !SKIP[id]) { seen[id] = 1; ids.push(id); }
      });
    });
    return ids;
  }

  var Progress = {
    all: function () { return load(); },

    on: function (cb) {
      if (typeof cb === "function") listeners.push(cb);
      return function () {
        var i = listeners.indexOf(cb);
        if (i !== -1) listeners.splice(i, 1);
      };
    },

    // ── Visits ───────────────────────────────────────────────
    visit: function (id) {
      if (!id) return;
      var s = load();
      s.visited[id] = new Date().toISOString();
      save();
    },
    isVisited: function (id) { return !!load().visited[id]; },
    lastVisited: function () {
      var s = load(), best = null, bestT = 0;
      Object.keys(s.visited).forEach(function (id) {
        var t = Date.parse(s.visited[id]) || 0;
        if (t > bestT) { bestT = t; best = id; }
      });
      return best;
    },

    // ── Completion ───────────────────────────────────────────
    isComplete: function (id) { return !!load().completed[id]; },
    setComplete: function (id, done) {
      var s = load();
      if (done === false) delete s.completed[id];
      else s.completed[id] = new Date().toISOString();
      save();
      return !!s.completed[id];
    },
    toggleComplete: function (id) { return this.setComplete(id, !this.isComplete(id)); },

    // ── Bookmarks ────────────────────────────────────────────
    isBookmarked: function (id) { return !!load().bookmarks[id]; },
    toggleBookmark: function (id, title, route) {
      var s = load();
      if (s.bookmarks[id]) delete s.bookmarks[id];
      else s.bookmarks[id] = { title: title || id, route: route || id, at: new Date().toISOString() };
      save();
      return !!s.bookmarks[id];
    },
    bookmarks: function () {
      var s = load();
      return Object.keys(s.bookmarks).map(function (id) {
        return { id: id, title: s.bookmarks[id].title, route: s.bookmarks[id].route, at: s.bookmarks[id].at };
      }).sort(function (a, b) { return (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0); });
    },

    // ── Revision queue ───────────────────────────────────────
    addRevision: function (id, title, route) {
      var s = load();
      s.revision[id] = { title: title || id, route: route || id, at: new Date().toISOString() };
      save();
    },
    removeRevision: function (id) { var s = load(); delete s.revision[id]; save(); },
    inRevision: function (id) { return !!load().revision[id]; },
    revisionQueue: function () {
      var s = load();
      return Object.keys(s.revision).map(function (id) {
        return { id: id, title: s.revision[id].title, route: s.revision[id].route, at: s.revision[id].at };
      }).sort(function (a, b) { return (Date.parse(a.at) || 0) - (Date.parse(b.at) || 0); });
    },

    // ── Quiz ─────────────────────────────────────────────────
    recordQuiz: function (score, total) {
      var s = load();
      var prev = s.quiz || { best: 0, total: total, attempts: 0 };
      s.quiz = {
        best: Math.max(prev.best || 0, score),
        total: total,
        attempts: (prev.attempts || 0) + 1,
        lastAt: new Date().toISOString()
      };
      save();
      return s.quiz;
    },
    quiz: function () { return load().quiz; },

    // ── Labs ─────────────────────────────────────────────────
    recordLab: function (id, solved) {
      var s = load();
      var prev = s.labs[id] || {};
      s.labs[id] = { solved: !!solved || !!prev.solved, at: new Date().toISOString(),
        hints: prev.hints || 0, attempts: (prev.attempts || 0) + 1 };
      save();
    },
    // Richer lab evidence: records attempts, hints used, solved.
    recordLabEvidence: function (id, ev) {
      ev = ev || {};
      var s = load();
      var prev = s.labs[id] || { attempts: 0, hints: 0 };
      s.labs[id] = {
        solved: !!ev.solved || !!prev.solved,
        hints: Math.max(prev.hints || 0, ev.hints || 0),
        attempts: (prev.attempts || 0) + 1,
        at: new Date().toISOString()
      };
      save();
    },

    // ── Competency evidence ──────────────────────────────────
    recordKnowledgeCheck: function (id, correct) {
      if (!id) return;
      var s = load();
      var c = s.competency[id] || { checksSeen: 0, checksCorrect: 0 };
      c.checksSeen += 1;
      if (correct) c.checksCorrect += 1;
      c.lastAt = new Date().toISOString();
      s.competency[id] = c;
      save();
    },

    // Mastery stage 0–5 derived from real interactions (not time on page):
    // 1 Understand · 2 Implement · 3 Apply · 4 Diagnose · 5 Integrate.
    masteryStage: function (id) {
      var s = load();
      var c = s.competency[id] || { checksSeen: 0, checksCorrect: 0 };
      var stage = 0;
      if (s.visited[id]) stage = 1;
      if (c.checksCorrect >= 1) stage = Math.max(stage, 2);
      if (s.completed[id]) stage = Math.max(stage, 3);
      if (c.checksSeen >= 2 && c.checksCorrect >= c.checksSeen) stage = Math.max(stage, 4);
      // Integrated: this lesson appears in a completed capstone milestone.
      var caps = (NS.Capstone && NS.Capstone.milestones) || [];
      for (var i = 0; i < caps.length; i++) {
        if (s.completed["cap-" + caps[i].n] && (caps[i].lessons || []).indexOf(id) !== -1) { stage = 5; break; }
      }
      return stage;
    },
    masteryLabel: function (stage) {
      return ["Not started", "Understand", "Implement", "Apply", "Diagnose", "Integrate"][stage] || "Not started";
    },
    // Summary across all curriculum lessons: count per stage.
    masterySummary: function () {
      var ids = (NS.Curriculum && NS.Curriculum.lessonIds()) || curriculum();
      var buckets = [0, 0, 0, 0, 0, 0];
      var self = this;
      ids.forEach(function (id) { buckets[self.masteryStage(id)]++; });
      return { total: ids.length, buckets: buckets };
    },

    // ── Spaced review (missed concepts resurface) ────────────
    DAY: 86400000,
    scheduleReview: function (id, correct) {
      if (!id) return;
      var s = load();
      var r = s.review[id] || { interval: 1, misses: 0 };
      if (correct) {
        // promote: longer interval each success (1→2→4→8 days); drop at >8.
        r.interval = (r.interval || 1) * 2;
        if (r.interval > 8) { delete s.review[id]; save(); return; }
      } else {
        r.interval = 1; r.misses = (r.misses || 0) + 1;
      }
      r.lastAt = new Date().toISOString();
      r.nextAt = Date.now() + r.interval * this.DAY;
      s.review[id] = r;
      save();
    },
    reviews: function () {
      var s = load(), now = Date.now();
      return Object.keys(s.review).map(function (id) {
        var r = s.review[id];
        return { id: id, nextAt: r.nextAt, interval: r.interval, misses: r.misses, due: (r.nextAt || 0) <= now };
      }).sort(function (a, b) { return (a.nextAt || 0) - (b.nextAt || 0); });
    },
    dueReviews: function () { return this.reviews().filter(function (r) { return r.due; }); },

    // ── Stats ────────────────────────────────────────────────
    stats: function () {
      var ids = curriculum(), s = load();
      var complete = 0, visited = 0;
      ids.forEach(function (id) {
        if (s.completed[id]) complete++;
        if (s.visited[id]) visited++;
      });
      return {
        total: ids.length,
        complete: complete,
        visited: visited,
        pct: ids.length ? Math.round((complete / ids.length) * 100) : 0
      };
    },
    curriculum: curriculum,

    // Next recommended module: first curriculum id not yet complete.
    recommended: function () {
      var ids = curriculum(), s = load();
      for (var i = 0; i < ids.length; i++) {
        if (!s.completed[ids[i]]) return ids[i];
      }
      return null;
    },

    // ── Export / reset ───────────────────────────────────────
    exportJSON: function () { return JSON.stringify(load(), null, 2); },
    reset: function () { mem = emptyState(); save(); }
  };

  NS.Progress = Progress;
})();
