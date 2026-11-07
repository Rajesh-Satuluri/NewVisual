/* ============================================================
   data/progress-store.js — unified, versioned progress store
   Kafka convention: a single versioned key, categorised records, a small
   API, and a change event so open views live-refresh. All reads/writes
   are try/catch-guarded (private mode / blocked storage safe).

   Key:   o9scs-progress-v1
   Shape: { <category>: { <id>: { ...fields, ts } } }
          categories: "visited", "mastery", "quiz", "selfx", "review"
   Event: window dispatches "o9scs:progress" on every write.

   API:
     record(category, id, fields)  -> merges fields (+ts) and persists
     get(category, id)             -> record | null
     all(category)                 -> { id: record }   (whole category)
     counts(category)              -> number of ids in a category
     reset(category?)              -> clears one category, or everything

   STATUS: core implemented (store + API). features/progress.js is migrated
   to read this (UPGRADE) in the mastery iteration; until then it is an
   additive, independent store.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.SolverViz = window.SolverViz || {});
  var KEY = "o9scs-progress-v1";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function save(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("o9scs:progress")); } catch (e) {}
  }

  NS.ProgressStore = {
    key: KEY,
    record: function (category, id, fields) {
      if (!category || !id) return;
      var db = load();
      db[category] = db[category] || {};
      var prev = db[category][id] || {};
      var merged = {};
      var k;
      for (k in prev) if (Object.prototype.hasOwnProperty.call(prev, k)) merged[k] = prev[k];
      if (fields) for (k in fields) if (Object.prototype.hasOwnProperty.call(fields, k)) merged[k] = fields[k];
      merged.ts = Date.now();
      db[category][id] = merged;
      save(db);
      return merged;
    },
    get: function (category, id) {
      var db = load();
      return (db[category] && db[category][id]) || null;
    },
    all: function (category) {
      var db = load();
      return db[category] || {};
    },
    counts: function (category) {
      return Object.keys(this.all(category)).length;
    },
    reset: function (category) {
      if (!category) { save({}); return; }
      var db = load();
      delete db[category];
      save(db);
    }
  };
})();
