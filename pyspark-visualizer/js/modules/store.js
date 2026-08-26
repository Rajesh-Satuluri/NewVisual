/*
 * store.js — localStorage-backed persistence for progress, notes, review flags
 * and UI preferences. Everything is namespaced under "blind75:" so it never
 * collides with the other visualizers hosted on the same GitHub Pages origin.
 */
(function () {
  var KEY = "pyspark:v1";

  var DEFAULT = {
    status: {},     // problemId -> "not-started" | "learning" | "solved"
    review: {},     // problemId -> true (flagged for review)
    notes: {},      // problemId -> string
    links: {},      // problemId -> [{name,url}, {name,url}] (animation/visualization links)
    prefs: {
      theme: "dark",
      codeMode: "rcs",       // "rcs" | "plain"
      blur: false,           // blur logic + code until revealed
      setFilter: "all",      // "all" (NeetCode 150) | "blind75"
      lastProblem: null,
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

  window.PYSPARK.store = {
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
      state.prefs = Object.assign({}, DEFAULT.prefs, incoming.prefs || {});
      state.prefs.collapsedCats = state.prefs.collapsedCats || {};
      save();
    }
  };
})();
