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

  /* ============================================================
     copySim — deterministic COPY INTO loader for the P0-B workshop.
     Pure: given rows (each tagged with an `issue`) and COPY options,
     decide per-row load/reject and apply the ON_ERROR policy.
     Mirrors real Snowflake semantics without executing anything.
     ============================================================ */
  // Does a single row parse, given the file-format options?
  function rowResult(issue, opts) {
    switch (issue) {
      case 'ok':           return { ok: true };
      case 'quoted_comma': return opts.enclosed
        ? { ok: true }
        : { ok: false, reason: 'Unquoted comma split the field → too many columns. Set FIELD_OPTIONALLY_ENCLOSED_BY = \'"\'.' };
      case 'empty_number': return opts.nullIf
        ? { ok: true }
        : { ok: false, reason: "Empty string cannot cast to NUMBER. Add NULL_IF = ('') so blanks load as NULL." };
      case 'bad_date':     return opts.dateDMY
        ? { ok: true }
        : { ok: false, reason: "Date '15/01/2024' not recognised by AUTO. Set DATE_FORMAT = 'DD/MM/YYYY'." };
      case 'overflow':     return { ok: false, reason: 'Numeric value out of range for the target NUMBER — a real data error, not a format fix.' };
      default:             return { ok: true };
    }
  }

  /**
   * Simulate one COPY INTO over a single file.
   * @param rows  [{ id, cells:[], issue }]
   * @param opts  { onError:'ABORT_STATEMENT'|'CONTINUE'|'SKIP_FILE', enclosed, nullIf, dateDMY }
   * @returns { rows:[{...,status,reason}], loaded, rejected, status, statusText, note }
   */
  function copySim(rows, opts) {
    const evaluated = rows.map(r => {
      const res = rowResult(r.issue, opts);
      return { ...r, status: res.ok ? 'loaded' : 'error', reason: res.ok ? null : res.reason };
    });
    const anyError = evaluated.some(r => r.status === 'error');
    const policy = opts.onError || 'ABORT_STATEMENT';

    if (policy === 'ABORT_STATEMENT' && anyError) {
      const first = evaluated.find(r => r.status === 'error');
      return {
        rows: evaluated.map(r => ({ ...r, status: 'aborted' })),
        loaded: 0, rejected: evaluated.length, status: 'aborted',
        statusText: 'Load aborted — ON_ERROR = ABORT_STATEMENT fails the whole statement on the first bad row.',
        note: `First error: ${first.reason}`,
      };
    }
    if (policy === 'SKIP_FILE' && anyError) {
      return {
        rows: evaluated.map(r => ({ ...r, status: 'skipped' })),
        loaded: 0, rejected: evaluated.length, status: 'skipped',
        statusText: 'File skipped — ON_ERROR = SKIP_FILE discards the entire file when any row errors.',
        note: 'Good rows in the file are NOT loaded. Use CONTINUE to load good rows and quarantine the rest.',
      };
    }
    const loaded = evaluated.filter(r => r.status === 'loaded').length;
    const rejected = evaluated.length - loaded;
    return {
      rows: evaluated, loaded, rejected,
      status: rejected ? 'partial' : 'success',
      statusText: rejected
        ? `Loaded ${loaded} row(s); ${rejected} rejected and routed to quarantine (ON_ERROR = CONTINUE).`
        : `All ${loaded} row(s) loaded cleanly.`,
      note: rejected ? 'Rejected rows should be captured (reason + source) for triage and reload — never dropped silently.' : '',
    };
  }

  /* ============================================================
     Incremental / MERGE / CDC / idempotency reducers (P0-C).
     Pure and deterministic: fold a batch of change events into a
     target-table state under a chosen strategy. Target is an array
     of records; business key = order_id; source order = lsn.
     ============================================================ */
  function newTargetState() { return { rows: [], seenEvents: {}, loadedFiles: {}, history: [] }; }
  function cloneState(s) {
    return { rows: s.rows.map(r => ({ ...r })), seenEvents: { ...s.seenEvents },
             loadedFiles: { ...s.loadedFiles }, history: s.history.slice() };
  }
  function keyIndex(rows, id) { return rows.findIndex(r => r.order_id === id); }
  function stripEvent(e) { return { order_id: e.order_id, customer_id: e.customer_id, status: e.status, amount: e.amount, updated_at: e.updated_at, lsn: e.lsn }; }
  // Collapse to one event per business key, keeping the highest lsn (deterministic).
  function dedupLatest(events) {
    const m = {};
    events.forEach(e => { if (!m[e.order_id] || e.lsn > m[e.order_id].lsn) m[e.order_id] = e; });
    return Object.values(m).sort((a, b) => a.lsn - b.lsn);
  }

  const STRATEGIES = {
    append:        'Blind append',
    dedup_insert:  'Dedup + insert-only',
    merge:         'MERGE (upsert, no delete)',
    merge_cdc:     'MERGE with delete handling',
    copy_tracking: 'COPY file-load tracking',
    force_reload:  'COPY FORCE = TRUE',
    cdc_replay:    'CDC replay (event-id + lsn)',
  };

  /**
   * Apply one batch of events to target state under a strategy.
   * @returns { state, stats:{inserted,updated,deleted,ignored,rejected}, count }
   */
  function applyBatch(state, batch, strategy) {
    const s = cloneState(state);
    const stats = { inserted: 0, updated: 0, deleted: 0, ignored: 0, rejected: 0 };
    const events = batch.events || [];
    const fileId = batch.id;

    function upsert(e, handleDelete) {
      const i = keyIndex(s.rows, e.order_id);
      if (e.op === 'd') {
        if (handleDelete) { if (i >= 0) { s.rows.splice(i, 1); stats.deleted++; } else stats.ignored++; }
        else stats.ignored++;                       // insert/update-only MERGE ignores deletes
        return;
      }
      if (i >= 0) { s.rows[i] = stripEvent(e); stats.updated++; }
      else { s.rows.push(stripEvent(e)); stats.inserted++; }
    }

    switch (strategy) {
      case 'append':
      case 'force_reload':
        events.forEach(e => { s.rows.push({ ...e }); stats.inserted++; });
        break;
      case 'dedup_insert':
        events.forEach(e => {
          if (s.seenEvents[e.event_id]) { stats.ignored++; return; }
          s.seenEvents[e.event_id] = 1;
          if (keyIndex(s.rows, e.order_id) >= 0) stats.ignored++;
          else { s.rows.push(stripEvent(e)); stats.inserted++; }
        });
        break;
      case 'merge': {
        const collapsed = dedupLatest(events);
        stats.ignored += events.length - collapsed.length;
        collapsed.forEach(e => upsert(e, false));
        break;
      }
      case 'merge_cdc':
      case 'cdc_replay': {
        const fresh = events.filter(e => { if (s.seenEvents[e.event_id]) return false; s.seenEvents[e.event_id] = 1; return true; });
        const collapsed = dedupLatest(fresh);
        stats.ignored += (events.length - fresh.length) + (fresh.length - collapsed.length);
        collapsed.forEach(e => upsert(e, true));
        break;
      }
      case 'copy_tracking':
        if (s.loadedFiles[fileId]) { stats.ignored += events.length; }
        else { s.loadedFiles[fileId] = 1; events.forEach(e => { s.rows.push({ ...e }); stats.inserted++; }); }
        break;
      default:
        events.forEach(e => { s.rows.push({ ...e }); stats.inserted++; });
    }
    s.history.push({ batch: batch.label, strategy, stats: { ...stats }, count: s.rows.length });
    return { state: s, stats, count: s.rows.length };
  }

  /** Seed the target from an initial snapshot (always a clean keyed load). */
  function seedTarget(snapshot) {
    let st = newTargetState();
    return applyBatch(st, { id: 'snapshot', label: 'Initial snapshot', events: snapshot }, 'merge_cdc').state;
  }

  /** Watermark pick: which events a high-water mark would select. */
  function watermarkPick(events, column, mark) {
    return events.filter(e => (column === 'lsn' ? e.lsn > mark : new Date(e.updated_at) > new Date(mark)));
  }

  return { deriveMetrics, ramp, fmtInt, fmtDur, SIM_SECONDS, copySim, rowResult,
           applyBatch, seedTarget, newTargetState, dedupLatest, watermarkPick, STRATEGIES };
});
