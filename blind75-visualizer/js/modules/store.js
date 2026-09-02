/*
 * store.js — localStorage-backed persistence for progress, notes, review flags
 * and UI preferences. Everything is namespaced under "blind75:" so it never
 * collides with the other visualizers hosted on the same GitHub Pages origin.
 */
(function () {
  var KEY = "blind75:v1";

  var DEFAULT = {
    status: {},     // problemId -> "not-started" | "learning" | "solved"
    review: {},     // problemId -> true (flagged for review)
    notes: {},      // problemId -> string
    links: {},      // problemId -> [{name,url}, {name,url}] (animation/visualization links)
    codeEdits: {},  // problemId -> { "<approachIndex>:<mode>": editedSource } (user code edits)
    srs: {},        // problemId -> { ease, interval(days), reps, lapses, due(ms), last(ms) }
    activity: {},   // "YYYY-MM-DD" -> count of solves/reviews that day (for the heatmap + streak)
    prefs: {
      theme: "dark",
      codeMode: "rcs",       // "rcs" | "plain"
      blur: false,           // blur logic + code until revealed
      setFilter: "all",      // "all" (NeetCode 150) | "blind75"
      lastProblem: null,
      filtersOpen: false,      // sidebar filter panel expanded?
      sidebarCollapsed: false, // desktop: sidebar hidden to give the reader full width
      collapsedCats: {}      // category -> true if collapsed in sidebar
    }
  };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT));
      var data = JSON.parse(raw);
      // shallow-merge defaults so new fields appear for old saves
      data.status = data.status || {};
      data.review = data.review || {};
      data.notes = data.notes || {};
      data.links = data.links || {};
      data.codeEdits = data.codeEdits || {};
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
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* private mode / quota — fail silently, app still works in-memory */
    }
  }

  window.BLIND75.store = {
    // ---- status ----
    getStatus: function (id) {
      return state.status[id] || "not-started";
    },
    setStatus: function (id, value) {
      if (value === "not-started") delete state.status[id];
      else state.status[id] = value;
      save();
    },
    countSolved: function () {
      var n = 0;
      for (var k in state.status) if (state.status[k] === "solved") n++;
      return n;
    },
    countLearning: function () {
      var n = 0;
      for (var k in state.status) if (state.status[k] === "learning") n++;
      return n;
    },

    // ---- review flag ----
    isReview: function (id) {
      return !!state.review[id];
    },
    toggleReview: function (id) {
      if (state.review[id]) delete state.review[id];
      else state.review[id] = true;
      save();
      return !!state.review[id];
    },

    // ---- notes ----
    getNote: function (id) {
      return state.notes[id] || "";
    },
    setNote: function (id, text) {
      if (!text) delete state.notes[id];
      else state.notes[id] = text;
      save();
    },

    // ---- animation / visualization links ----
    getLinks: function (id) {
      var arr = state.links[id] || [];
      // always return exactly two slots for a stable UI
      return [arr[0] || { name: "", url: "" }, arr[1] || { name: "", url: "" }];
    },
    setLinks: function (id, arr) {
      var cleaned = (arr || [])
        .map(function (l) { return { name: (l && l.name || "").trim(), url: (l && l.url || "").trim() }; })
        .filter(function (l) { return l.url || l.name; });
      if (cleaned.length) state.links[id] = cleaned;
      else delete state.links[id];
      save();
    },

    // ---- prefs ----
    getPref: function (key) {
      return state.prefs[key];
    },
    setPref: function (key, value) {
      state.prefs[key] = value;
      save();
    },
    isCatCollapsed: function (cat) {
      return !!state.prefs.collapsedCats[cat];
    },
    setCatCollapsed: function (cat, collapsed) {
      if (collapsed) state.prefs.collapsedCats[cat] = true;
      else delete state.prefs.collapsedCats[cat];
      save();
    },

    // ---- code edits (per problem + approach index + mode) ----
    getCodeEdit: function (id, ai, mode) {
      var m = state.codeEdits[id];
      var v = m && m[ai + ":" + mode];
      return v == null ? null : v;
    },
    setCodeEdit: function (id, ai, mode, text) {
      if (!state.codeEdits[id]) state.codeEdits[id] = {};
      state.codeEdits[id][ai + ":" + mode] = text;
      save();
    },
    clearCodeEdit: function (id, ai, mode) {
      var m = state.codeEdits[id];
      if (!m) return;
      delete m[ai + ":" + mode];
      if (!Object.keys(m).length) delete state.codeEdits[id];
      save();
    },

    // ---- spaced repetition (SM-2 lite) ----
    // Ratings: "again" | "hard" | "good" | "easy".
    getSrs: function (id) {
      return state.srs[id] || null;
    },
    // Apply a grade, reschedule the card, log the review as activity.
    reviewCard: function (id, rating) {
      var DAY = 86400000;
      var now = Date.now();
      var rec = state.srs[id] || { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now, last: 0 };
      if (rating === "again") {
        rec.reps = 0; rec.lapses++; rec.ease = Math.max(1.3, rec.ease - 0.2); rec.interval = 0;
      } else if (rating === "hard") {
        rec.ease = Math.max(1.3, rec.ease - 0.15);
        rec.interval = rec.reps === 0 ? 1 : Math.max(1, Math.round(rec.interval * 1.2));
        rec.reps++;
      } else if (rating === "good") {
        rec.interval = rec.reps === 0 ? 1 : (rec.reps === 1 ? 3 : Math.round(rec.interval * rec.ease));
        rec.reps++;
      } else if (rating === "easy") {
        rec.ease = rec.ease + 0.15;
        rec.interval = rec.reps === 0 ? 4 : Math.round(rec.interval * rec.ease * 1.3);
        rec.reps++;
      }
      rec.interval = Math.max(0, rec.interval);
      rec.last = now;
      rec.due = rating === "again" ? now : (todayStart() + rec.interval * DAY);
      state.srs[id] = rec;
      bumpActivity();
      save();
      return rec;
    },
    isScheduled: function (id) {
      return !!state.srs[id];
    },
    // Due = scheduled and its due date is today or earlier.
    isDue: function (id) {
      var rec = state.srs[id];
      return !!rec && rec.due <= todayEnd();
    },
    countDue: function (ids) {
      var n = 0;
      for (var i = 0; i < ids.length; i++) {
        var rec = state.srs[ids[i]];
        if (rec && rec.due <= todayEnd()) n++;
      }
      return n;
    },

    // ---- activity / heatmap / streak ----
    // Log a solve as activity (reviews are logged inside reviewCard).
    logSolve: function () { bumpActivity(); save(); },
    activityMap: function () { return state.activity; },
    currentStreak: function () {
      var DAY = 86400000;
      var day = todayStart();
      // allow the streak to still count if nothing done yet *today* but done yesterday
      if (!state.activity[dateStr(day)]) day -= DAY;
      var streak = 0;
      while (state.activity[dateStr(day)]) { streak++; day -= DAY; }
      return streak;
    },

    // ---- bulk ----
    reset: function () {
      state = JSON.parse(JSON.stringify(DEFAULT));
      save();
    },
    exportJSON: function () {
      return JSON.stringify(state, null, 2);
    },
    importJSON: function (json) {
      var incoming = JSON.parse(json);
      state.status = incoming.status || {};
      state.review = incoming.review || {};
      state.notes = incoming.notes || {};
      state.links = incoming.links || {};
      state.codeEdits = incoming.codeEdits || {};
      state.srs = incoming.srs || {};
      state.activity = incoming.activity || {};
      state.prefs = Object.assign({}, DEFAULT.prefs, incoming.prefs || {});
      state.prefs.collapsedCats = state.prefs.collapsedCats || {};
      save();
    }
  };

  // ---- date helpers (local-day granularity) ----
  function todayStart() { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function todayEnd() { return todayStart() + 86400000 - 1; }
  function dateStr(ms) {
    var d = new Date(ms), m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }
  function bumpActivity() {
    var k = dateStr(Date.now());
    state.activity[k] = (state.activity[k] || 0) + 1;
  }
})();
