/*
 * store.js — localStorage-backed persistence for progress, notes, review flags,
 * spaced-repetition schedule, activity log, and UI preferences. Namespaced under
 * "pyspark:" so it never collides with the other visualizers on the shared origin.
 */
(function () {
  var KEY = "pyspark:v1";
  var DAY = 86400000;

  var DEFAULT = {
    status: {},     // problemId -> "not-started" | "learning" | "solved"
    review: {},     // problemId -> true (flagged for review)
    notes: {},      // problemId -> string
    srs: {},        // problemId -> {ease, interval(days), reps, lapses, due(ms), last(ms)}
    activity: {},   // "YYYY-MM-DD" -> count
    prefs: {
      theme: "dark",
      codeMode: "rcs",       // "rcs" | "plain"
      blur: false,
      setFilter: "all",      // "all" | "Easy" | "Medium" | "Hard"
      lastProblem: null,
      filtersOpen: false,    // filters drawer in the sidebar
      sidebarCollapsed: false,
      collapsedCats: {}
    }
  };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT));
      var data = JSON.parse(raw);
      data.status = data.status || {};
      data.review = data.review || {};
      data.notes = data.notes || {};
      data.srs = data.srs || {};
      data.activity = data.activity || {};
      data.prefs = Object.assign({}, DEFAULT.prefs, data.prefs || {});
      data.prefs.collapsedCats = data.prefs.collapsedCats || {};
      return data;
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT));
    }
  }

  var state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { /* private mode / quota — fail silently */ }
  }

  // ---- date helpers ----
  function dayKey(d) {
    d = d || new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }
  function todayStart() { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function todayEnd() { return todayStart() + DAY - 1; }
  function bumpActivity() {
    var k = dayKey();
    state.activity[k] = (state.activity[k] || 0) + 1;
  }

  window.PYSPARK.store = {
    // ---- status ----
    getStatus: function (id) { return state.status[id] || "not-started"; },
    setStatus: function (id, value) {
      var prev = state.status[id] || "not-started";
      if (value === "not-started") delete state.status[id];
      else state.status[id] = value;
      // log activity only on a fresh transition *to* solved
      if (value === "solved" && prev !== "solved") bumpActivity();
      save();
    },
    countSolved: function () { var n = 0; for (var k in state.status) if (state.status[k] === "solved") n++; return n; },
    countLearning: function () { var n = 0; for (var k in state.status) if (state.status[k] === "learning") n++; return n; },

    // ---- review flag ----
    isReview: function (id) { return !!state.review[id]; },
    toggleReview: function (id) {
      if (state.review[id]) delete state.review[id]; else state.review[id] = true;
      save(); return !!state.review[id];
    },
    countReview: function () { var n = 0; for (var k in state.review) if (state.review[k]) n++; return n; },

    // ---- notes ----
    getNote: function (id) { return state.notes[id] || ""; },
    setNote: function (id, text) { if (!text) delete state.notes[id]; else state.notes[id] = text; save(); },

    // ---- spaced repetition (SM-2 lite) ----
    getSrs: function (id) { return state.srs[id] || null; },
    isScheduled: function (id) { return !!state.srs[id]; },
    isDue: function (id) { var c = state.srs[id]; return !!c && c.due <= todayEnd(); },
    countDue: function (ids) {
      var self = this, n = 0;
      (ids || []).forEach(function (id) { if (self.isDue(id)) n++; });
      return n;
    },
    reviewCard: function (id, rating) {
      var c = state.srs[id] || { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: 0, last: 0 };
      var now = Date.now();
      if (rating === "again") {
        c.reps = 0; c.lapses++; c.ease = Math.max(1.3, c.ease - 0.2); c.interval = 0; c.due = now;
      } else if (rating === "hard") {
        c.ease = Math.max(1.3, c.ease - 0.15);
        c.interval = c.reps === 0 ? 1 : Math.round(c.interval * 1.2);
        c.reps++; c.due = todayStart() + c.interval * DAY;
      } else if (rating === "good") {
        c.interval = c.reps === 0 ? 1 : (c.reps === 1 ? 3 : Math.round(c.interval * c.ease));
        c.reps++; c.due = todayStart() + c.interval * DAY;
      } else if (rating === "easy") {
        c.ease = c.ease + 0.15;
        c.interval = c.reps === 0 ? 4 : Math.round(c.interval * c.ease * 1.3);
        c.reps++; c.due = todayStart() + c.interval * DAY;
      }
      c.last = now;
      state.srs[id] = c;
      bumpActivity();
      save();
      return c;
    },

    // ---- activity / streak ----
    getActivity: function () { return state.activity; },
    activityOn: function (d) { return state.activity[dayKey(d)] || 0; },
    currentStreak: function () {
      var streak = 0;
      var d = new Date(); d.setHours(0, 0, 0, 0);
      // tolerate "nothing yet today": start counting from yesterday if today is empty
      if (!state.activity[dayKey(d)]) d.setTime(d.getTime() - DAY);
      while (state.activity[dayKey(d)]) { streak++; d.setTime(d.getTime() - DAY); }
      return streak;
    },

    // ---- prefs ----
    getPref: function (key) { return state.prefs[key]; },
    setPref: function (key, value) { state.prefs[key] = value; save(); },
    isCatCollapsed: function (cat) { return !!state.prefs.collapsedCats[cat]; },
    setCatCollapsed: function (cat, collapsed) {
      if (collapsed) state.prefs.collapsedCats[cat] = true; else delete state.prefs.collapsedCats[cat];
      save();
    },

    // ---- bulk ----
    reset: function () { state = JSON.parse(JSON.stringify(DEFAULT)); save(); },
    exportJSON: function () { return JSON.stringify(state, null, 2); },
    importJSON: function (json) {
      var incoming = JSON.parse(json);
      state.status = incoming.status || {};
      state.review = incoming.review || {};
      state.notes = incoming.notes || {};
      state.srs = incoming.srs || {};
      state.activity = incoming.activity || {};
      state.prefs = Object.assign({}, DEFAULT.prefs, incoming.prefs || {});
      state.prefs.collapsedCats = state.prefs.collapsedCats || {};
      save();
    }
  };
})();
