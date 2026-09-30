/* ============================================================
   Progress tracker — remembers which modules the learner has
   opened, persisted in localStorage. Home roadmap reads this to
   tick completed cards. Zero deps; safe if storage is blocked.
   ============================================================ */

(function () {
  'use strict';

  const KEY = 'dv-progress';

  function load() {
    try {
      return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
    } catch (_) {
      return new Set();
    }
  }

  function save(set) {
    try {
      localStorage.setItem(KEY, JSON.stringify([...set]));
    } catch (_) {}
  }

  const Progress = {
    /** Mark a module as visited/started. Idempotent. */
    markVisited(id) {
      if (!id) return;
      const s = load();
      if (!s.has(id)) { s.add(id); save(s); }
    },

    isVisited(id) { return load().has(id); },

    all() { return [...load()]; },

    count() { return load().size; },

    reset() { save(new Set()); },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.Progress = Progress;
})();
