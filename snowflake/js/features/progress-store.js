/* ============================================================
   ProgressStore — namespaced localStorage progress records for
   the interview-simulator labs. One record per "area"
   (troubleshooting, decisions, chains, answers, query-opt, cost,
   design, rbac, loading, traps, sql, ...). Every lab writes here
   so the Readiness Dashboard (Phase 3) can aggregate later.

   Record shape (per area):
     sviz-prog-<area> = { items: { <scenarioId>: { done:true, correct:bool, ts } } }
   ============================================================ */

(function () {
  'use strict';

  const PREFIX = 'sviz-prog-';

  function _read(area) {
    try {
      return JSON.parse(localStorage.getItem(PREFIX + area) || 'null') || { items: {} };
    } catch (_) {
      return { items: {} };
    }
  }

  function _write(area, rec) {
    try { localStorage.setItem(PREFIX + area, JSON.stringify(rec)); } catch (_) {}
  }

  const ProgressStore = {
    /** Mark a scenario attempted. `correct` is optional (undefined = not graded). */
    record(area, id, correct) {
      if (!area || !id) return;
      const rec = _read(area);
      const prev = rec.items[id] || {};
      rec.items[id] = {
        done: true,
        // once correct, stay correct — best-effort like the quiz engine
        correct: correct === true || prev.correct === true,
        ts: Date.now(),
      };
      _write(area, rec);
      document.dispatchEvent(new CustomEvent('sviz:progress', { detail: { area, id } }));
    },

    /** Has this scenario been completed? */
    isDone(area, id) {
      return !!(_read(area).items[id] && _read(area).items[id].done);
    },

    /**
     * Summary for one area given the total number of scenarios that exist.
     * @returns {{attempted:number, correct:number, total:number, pct:number}}
     */
    summary(area, total) {
      const items = _read(area).items;
      const ids = Object.keys(items);
      const attempted = ids.length;
      const correct = ids.filter(k => items[k].correct).length;
      const t = total || attempted;
      const pct = t ? Math.round((attempted / t) * 100) : 0;
      return { attempted, correct, total: t, pct };
    },

    /** Raw items map for an area (used by the dashboard). */
    items(area) { return _read(area).items; },

    reset(area) { _write(area, { items: {} }); },
  };

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.ProgressStore = ProgressStore;
})();
