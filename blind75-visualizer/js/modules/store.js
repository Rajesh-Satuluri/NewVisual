/*
 * store.js — localStorage-backed persistence for progress, notes, review flags
 * and UI preferences. Everything is namespaced under "blind75:" so it never
 * collides with the other visualizers hosted on the same GitHub Pages origin.
 */
(function () {
  var KEY = "blind75:v1";

  // Preferences that are safe + useful to carry across devices. Device-local
  // UI state (sidebar collapse, open panels, collapsed categories, last-viewed
  // problem, the one-time legacy-migration flag) is deliberately NOT synced, so
  // collapsing the sidebar on a laptop never rearranges the phone.
  var SYNC_PREFS = ["theme", "codeMode", "blur", "setFilter", "workspace"];

  var DEFAULT = {
    status: {},     // problemId -> "not-started" | "learning" | "solved"
    review: {},     // problemId -> true (flagged for review)
    notes: {},      // problemId -> string
    links: {},      // problemId -> [{name,url}, {name,url}] (animation/visualization links)
    codeEdits: {},  // problemId -> { "<approachIndex>:<mode>": editedSource } (user code edits)
    logicEdits: {}, // problemId -> { "<approachIndex>": editedMarkdown } (user logic edits)
    srs: {},        // problemId -> { ease, interval(days), reps, lapses, due(ms), last(ms) }
    activity: {},   // "YYYY-MM-DD" -> count of solves/reviews that day (for the heatmap + streak)
    pyStatus: {},   // pythonTopicId -> "not-started" | "learning" | "learned" | "mastered"
    pyChallenge: {},// pythonTopicId -> true once the mini-challenge is marked done
    prefs: {
      theme: "dark",
      codeMode: "rcs",       // "rcs" | "plain"
      blur: false,           // blur logic + code until revealed
      setFilter: "all",      // "all" (NeetCode 150) | "blind75"
      workspace: "dsa",      // "dsa" | "python"
      lastTopic: null,       // last Python topic viewed
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
      data.logicEdits = data.logicEdits || {};
      data.srs = data.srs || {};
      data.activity = data.activity || {};
      data.pyStatus = data.pyStatus || {};
      data.pyChallenge = data.pyChallenge || {};
      data.prefs = Object.assign({}, DEFAULT.prefs, data.prefs || {});
      data.prefs.collapsedCats = data.prefs.collapsedCats || {};
      return data;
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT));
    }
  }

  var state = load();

  // True only while we are applying buckets pulled FROM the cloud, so the
  // resulting save() does not immediately echo the same data back up again.
  var cloudApplying = false;

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* private mode / quota — fail silently, app still works in-memory */
    }
    // Let the (optional) cloud-sync layer push changes to other devices.
    // It only ships notes/codeEdits/logicEdits and debounces internally, so
    // firing on every save is harmless when sync is off or idle.
    if (!cloudApplying && window.BLIND75 && window.BLIND75.cloud &&
        typeof window.BLIND75.cloud.onLocalChange === "function") {
      try { window.BLIND75.cloud.onLocalChange(); } catch (e) { /* never break a save */ }
    }
  }

  // ---- one-time migration from the retired standalone tools (M6.1) ----
  // The old sql-visualizer / pyspark-visualizer lived on this same origin and
  // stored progress under "sql:v1" / "pyspark:v1", keyed by bare problem id.
  // The unified store namespaces problem ids as "<stack>:<id>", so translate
  // each legacy entry once. Existing unified progress always wins (no clobber).
  function migrateLegacy() {
    if (state.prefs.legacyMigrated) return;
    [["sql", "sql:v1"], ["spark", "pyspark:v1"]].forEach(function (pair) {
      var stack = pair[0], raw;
      try { raw = localStorage.getItem(pair[1]); } catch (e) { return; }
      if (!raw) return;
      var old; try { old = JSON.parse(raw); } catch (e) { return; }
      var ns = function (id) { return stack + ":" + id; };
      var id;
      for (id in (old.status || {})) if (state.status[ns(id)] == null) state.status[ns(id)] = old.status[id];
      for (id in (old.review || {})) if (state.review[ns(id)] == null) state.review[ns(id)] = old.review[id];
      for (id in (old.notes || {})) if (state.notes[ns(id)] == null) state.notes[ns(id)] = old.notes[id];
      for (id in (old.srs || {})) if (state.srs[ns(id)] == null) state.srs[ns(id)] = old.srs[id];
      for (var d in (old.activity || {})) state.activity[d] = (state.activity[d] || 0) + old.activity[d];
    });
    state.prefs.legacyMigrated = true;
    save();
  }
  try { migrateLegacy(); } catch (e) { /* never let migration break boot */ }

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
      // Changing a *syncable* preference bumps the prefs clock so the cloud
      // merge (last-write-wins across devices) knows this device is newer.
      if (SYNC_PREFS.indexOf(key) !== -1) state.prefs._syncAt = Date.now();
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

    // ---- logic edits (per problem + approach index) ----
    getLogicEdit: function (id, ai) {
      var m = state.logicEdits[id];
      var v = m && m["" + ai];
      return v == null ? null : v;
    },
    setLogicEdit: function (id, ai, text) {
      if (!state.logicEdits[id]) state.logicEdits[id] = {};
      state.logicEdits[id]["" + ai] = text;
      save();
    },
    clearLogicEdit: function (id, ai) {
      var m = state.logicEdits[id];
      if (!m) return;
      delete m["" + ai];
      if (!Object.keys(m).length) delete state.logicEdits[id];
      save();
    },

    // ---- Python-for-DSA topic progress ----
    // States: "not-started" | "learning" | "learned" | "mastered".
    getPyStatus: function (id) {
      return state.pyStatus[id] || "not-started";
    },
    setPyStatus: function (id, value) {
      if (!value || value === "not-started") delete state.pyStatus[id];
      else state.pyStatus[id] = value;
      save();
    },
    countPy: function (ids, value) {
      var n = 0;
      for (var i = 0; i < ids.length; i++) if ((state.pyStatus[ids[i]] || "not-started") === value) n++;
      return n;
    },
    // Weighted readiness across the given topic ids: learning 0.34, learned 0.75, mastered 1.
    pyReadiness: function (ids) {
      if (!ids.length) return 0;
      var total = 0;
      for (var i = 0; i < ids.length; i++) {
        var s = state.pyStatus[ids[i]] || "not-started";
        total += s === "mastered" ? 1 : s === "learned" ? 0.75 : s === "learning" ? 0.34 : 0;
      }
      return Math.round((total / ids.length) * 100);
    },
    isPyChallengeDone: function (id) { return !!state.pyChallenge[id]; },
    setPyChallengeDone: function (id, done) {
      if (done) state.pyChallenge[id] = true;
      else delete state.pyChallenge[id];
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
      state.logicEdits = incoming.logicEdits || {};
      state.srs = incoming.srs || {};
      state.activity = incoming.activity || {};
      state.pyStatus = incoming.pyStatus || {};
      state.pyChallenge = incoming.pyChallenge || {};
      state.prefs = Object.assign({}, DEFAULT.prefs, incoming.prefs || {});
      state.prefs.collapsedCats = state.prefs.collapsedCats || {};
      save();
    },

    // ---- cloud sync (FULL coverage: all learning state) ----
    // The list of preference keys that participate in sync (read by the merge
    // layer so it knows exactly which pref keys to carry).
    syncPrefKeys: function () { return SYNC_PREFS.slice(); },

    // Snapshot every synced bucket for upload. Progress, SRS, activity, review
    // flags, challenge flags, links, notes and code/logic edits all travel; so
    // does the safe pref subset, tagged with its last-change clock for LWW.
    cloudBuckets: function () {
      return {
        notes:       deep(state.notes),
        links:       deep(state.links),
        codeEdits:   deep(state.codeEdits),
        logicEdits:  deep(state.logicEdits),
        status:      deep(state.status),
        pyStatus:    deep(state.pyStatus),
        srs:         deep(state.srs),
        review:      deep(state.review),
        activity:    deep(state.activity),
        pyChallenge: deep(state.pyChallenge),
        prefs:       pickSyncPrefs(),
        prefsAt:     state.prefs._syncAt || 0
      };
    },
    // Adopt a fully-merged bundle pulled from / produced by the cloud layer.
    // Returns true if anything actually changed (so the UI can re-render).
    applyCloudBuckets: function (b) {
      if (!b) return false;
      var before = syncSig();
      cloudApplying = true;
      if (b.notes)       state.notes = b.notes;
      if (b.links)       state.links = b.links;
      if (b.codeEdits)   state.codeEdits = b.codeEdits;
      if (b.logicEdits)  state.logicEdits = b.logicEdits;
      if (b.status)      state.status = b.status;
      if (b.pyStatus)    state.pyStatus = b.pyStatus;
      if (b.srs)         state.srs = b.srs;
      if (b.review)      state.review = b.review;
      if (b.activity)    state.activity = b.activity;
      if (b.pyChallenge) state.pyChallenge = b.pyChallenge;
      if (b.prefs) {
        for (var i = 0; i < SYNC_PREFS.length; i++) {
          var k = SYNC_PREFS[i];
          if (b.prefs[k] !== undefined) state.prefs[k] = b.prefs[k];
        }
      }
      if (b.prefsAt) state.prefs._syncAt = b.prefsAt;
      save();
      cloudApplying = false;
      return before !== syncSig();
    }
  };

  // ---- cloud-sync helpers ----
  function deep(o) { return JSON.parse(JSON.stringify(o || {})); }
  function pickSyncPrefs() {
    var out = {};
    for (var i = 0; i < SYNC_PREFS.length; i++) {
      var k = SYNC_PREFS[i];
      if (state.prefs[k] !== undefined) out[k] = state.prefs[k];
    }
    return out;
  }
  // A stable signature of everything that syncs, used to detect real changes.
  function syncSig() {
    return JSON.stringify([
      state.status, state.pyStatus, state.srs, state.review, state.activity,
      state.pyChallenge, state.notes, state.links, state.codeEdits,
      state.logicEdits, pickSyncPrefs()
    ]);
  }

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
