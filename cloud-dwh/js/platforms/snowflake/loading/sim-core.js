/* ============================================================
   Loading simulator core — PURE, deterministic, DOM-free logic.

   Everything here is a pure function of its inputs so the same code
   powers the UI and the automated tests. No randomness, no Date.now,
   no globals mutated. Figures are illustrative teaching values.

   Phase 1 (P0-A): deriveMetrics() — moving pipeline counters.
   (Phase 3 will add MERGE / reconcile / idempotency reducers here.)
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api; // node --test
  const viz = (root.CDWH = root.CDWH || {});
  viz.P = viz.P || {}; viz.P.snowflake = viz.P.snowflake || {};
  viz.P.snowflake.loadingSim = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  /* Nominal simulated elapsed time per pattern (seconds) — illustrative. */
  const SIM_SECONDS = { batch_copy: 480, snowpipe: 60, streaming: 3, kafka: 8, cdc: 6 };

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  /* Linear 0..1 ramp between two stage positions, driven by cursor. */
  function ramp(activeIds, cur, fromId, toId) {
    const a = activeIds.indexOf(fromId), b = activeIds.indexOf(toId);
    if (a < 0 || b < 0 || cur < a) return 0;
    if (cur >= b) return 1;
    return (cur - a) / Math.max(1, b - a);
  }

  function fmtInt(n) { return Math.round(n).toLocaleString('en-US'); }
  function fmtDur(sec) {
    if (sec < 1)   return '<1s';
    if (sec < 60)  return Math.round(sec) + 's';
    const m = Math.floor(sec / 60), s = Math.round(sec % 60);
    return s ? `${m}m ${s}s` : `${m}m`;
  }

  /**
   * Derive the eight pipeline counters for a pattern at cursor `cur`.
   * @param pattern  one ingest-pipelines pattern object (has totals, fileBased, id)
   * @param activeIds ordered list of active stage ids for that pattern
   * @param cur      current active-stage index (-1 = idle/not started)
   * @returns {object} display-ready metric strings + raw numbers (for tests)
   */
  function deriveMetrics(pattern, activeIds, cur) {
    const n = activeIds.length;
    const T = pattern.totals || { files: 0, rows: 0, rejected: 0 };
    const idle = cur < 0;
    const done = cur >= n - 1 && n > 0;

    const rowsParsedN   = idle ? 0 : Math.round(T.rows * ramp(activeIds, cur, 'parse', 'raw'));
    const rowsInsertedN = idle ? 0 : Math.round(T.rows * ramp(activeIds, cur, 'execute', 'raw'));
    const rejectedN     = idle ? 0 : Math.round((T.rejected || 0) * ramp(activeIds, cur, 'validate', 'reconcile'));

    let filesDiscN = null, filesLoadN = null, backlogN = null;
    if (pattern.fileBased) {
      filesDiscN = idle ? 0 : Math.round((T.files || 0) * ramp(activeIds, cur, 'discover', 'execute'));
      filesLoadN = idle ? 0 : Math.round((T.files || 0) * ramp(activeIds, cur, 'execute', 'raw'));
      backlogN   = Math.max(0, filesDiscN - filesLoadN);
    }

    const secs = SIM_SECONDS[pattern.id] || 60;
    const elapsed = idle ? 0 : secs * clamp((cur + 1) / Math.max(1, n), 0, 1);

    let status;
    if (idle) status = 'Idle — select a pattern and step through the lifecycle';
    else if (done) status = 'Pipeline complete — rows curated & reconciled ✓';
    else {
      const role = { upstream: 'Upstream', snowflake: 'Ingesting', table: 'Transforming', ops: 'Monitoring' };
      const st = pattern.detail[activeIds[cur]];
      status = `${role[st ? st.role : 'snowflake'] || 'Running'} — ${st ? st.title : ''}`;
    }

    return {
      // raw numbers (tests assert on these)
      raw: { filesDiscovered: filesDiscN, filesLoaded: filesLoadN, rowsParsed: rowsParsedN,
             rowsInserted: rowsInsertedN, rowsRejected: rejectedN, backlog: backlogN,
             elapsedSec: Math.round(elapsed), done, idle },
      // display strings (UI renders these)
      filesDiscovered: pattern.fileBased ? fmtInt(filesDiscN) : '—',
      filesLoaded:     pattern.fileBased ? fmtInt(filesLoadN) : '—',
      rowsParsed:      fmtInt(rowsParsedN),
      rowsInserted:    fmtInt(rowsInsertedN),
      rowsRejected:    fmtInt(rejectedN),
      backlog:         pattern.fileBased ? fmtInt(backlogN) : '—',
      duration:        fmtDur(elapsed),
      status,
    };
  }

  return { deriveMetrics, ramp, fmtInt, fmtDur, SIM_SECONDS };
});
