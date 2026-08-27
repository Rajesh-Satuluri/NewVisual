/*
 * store.js — localStorage-backed persistence for progress, notes, review flags,
 * spaced-repetition schedule, daily activity, and UI preferences. Namespaced
 * under "sql:" so it never collides with the other visualizers on this origin.
 */
(function () {
  var KEY = "sql:v1";
  var DAY = 86400000;

  var DEFAULT = {
    status: {},     // problemId -> "not-started" | "learning" | "solved"
    review: {},     // problemId -> true (flagged for review)
    notes: {},      // problemId -> string
    links: {},      // problemId -> [{name,url},{name,url}]
    srs: {},        // problemId -> {ease, interval(days), reps, lapses, due(ms), last(ms)}
    activity: {},   // "YYYY-MM-DD" -> count
    prefs: {
      theme: "dark",
      codeMode: "rcs",       // "rcs" | "plain"
      blur: false,
      lastProblem: null,
      filtersOpen: false,        // §7 filter drawer
      sidebarCollapsed: false,   // §5 desktop collapse
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
      data.links = data.links || {};
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
    catch (e) { /* private mode / quota — in-memory only */ }
  }

  // ---- date helpers (browser Date is fine in the app) ----
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }
  function todayStart() { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function todayEnd() { return todayStart() + DAY - 1; }
  function logActivity() {
    var k = todayKey();
    state.activity[k] = (state.activity[k] || 0) + 1;
  }

  window.SQLLAB.store = {
    // ---- status ----
    getStatus: function (id) { return state.status[id] || "not-started"; },
    setStatus: function (id, value) {
      var prev = state.status[id] || "not-started";
      if (value === "not-started") delete state.status[id];
      else state.status[id] = value;
      // log activity only on a fresh transition TO solved
      if (value === "solved" && prev !== "solved") logActivity();
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

    // ---- notes ----
    getNote: function (id) { return state.notes[id] || ""; },
    setNote: function (id, text) { if (!text) delete state.notes[id]; else state.notes[id] = text; save(); },

    // ---- links (kept for import/export compat; UI removed for SQL) ----
    getLinks: function (id) {
      var arr = state.links[id] || [];
      return [arr[0] || { name: "", url: "" }, arr[1] || { name: "", url: "" }];
    },
    setLinks: function (id, arr) {
      var cleaned = (arr || [])
        .map(function (l) { return { name: (l && l.name || "").trim(), url: (l && l.url || "").trim() }; })
        .filter(function (l) { return l.url || l.name; });
      if (cleaned.length) state.links[id] = cleaned; else delete state.links[id];
      save();
    },

    // ---- spaced repetition (SM-2 lite) ----
    getSrs: function (id) { return state.srs[id] || null; },
    isScheduled: function (id) { return !!state.srs[id]; },
    isDue: function (id) { var c = state.srs[id]; return !!c && c.due <= todayEnd(); },
    countDue: function (ids) {
      var n = 0, self = this;
      (ids || []).forEach(function (id) { if (self.isDue(id)) n++; });
      return n;
    },
    reviewCard: function (id, rating) {
      var now = Date.now();
      var c = state.srs[id] || { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now, last: 0 };
      if (rating === "again") {
        c.reps = 0; c.lapses++; c.ease = Math.max(1.3, c.ease - 0.2); c.interval = 0; c.due = now;
      } else if (rating === "hard") {
        c.ease = Math.max(1.3, c.ease - 0.15);
        c.interval = c.reps === 0 ? 1 : Math.round(c.interval * 1.2);
        c.reps++;
        c.due = todayStart() + c.interval * DAY;
      } else if (rating === "good") {
        c.interval = c.reps === 0 ? 1 : (c.reps === 1 ? 3 : Math.round(c.interval * c.ease));
        c.reps++;
        c.due = todayStart() + c.interval * DAY;
      } else if (rating === "easy") {
        c.ease = c.ease + 0.15;
        c.interval = c.reps === 0 ? 4 : Math.round(c.interval * c.ease * 1.3);
        c.reps++;
        c.due = todayStart() + c.interval * DAY;
      }
      c.last = now;
      state.srs[id] = c;
      logActivity();
      save();
      return c;
    },

    // ---- activity / streak ----
    getActivity: function () { return state.activity; },
    currentStreak: function () {
      var streak = 0;
      var d = new Date(); d.setHours(0, 0, 0, 0);
      // tolerate "nothing yet today": start counting from yesterday if today empty
      function key(dt) {
        return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
      }
      if (!state.activity[key(d)]) d.setTime(d.getTime() - DAY);
      while (state.activity[key(d)]) { streak++; d.setTime(d.getTime() - DAY); }
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
      state.links = incoming.links || {};
      state.srs = incoming.srs || {};
      state.activity = incoming.activity || {};
      state.prefs = Object.assign({}, DEFAULT.prefs, incoming.prefs || {});
      state.prefs.collapsedCats = state.prefs.collapsedCats || {};
      save();
    }
  };
})();
