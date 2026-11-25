// ─────────────────────────────────────────────────────────────────────────────
// Spark Structured Streaming — micro-batch incremental execution engine
//
// The HONEST KEYSTONE of this tool (the murmur2 equivalent). Pure JS, no DOM —
// importable in the browser (labs/modules) AND in Node (unit tests). Every run is
// REPEATABLE: the same input + config produce a byte-identical batch trace.
//
// This is a faithful model of Spark Structured Streaming's DOCUMENTED semantics,
// not a live Spark job. What it computes exactly:
//
//   • Trigger planning  — which records land in which micro-batch.
//   • Watermark         — max(eventTime seen) − delay, MONOTONIC non-decreasing,
//                         computed at the end of a batch and used as the threshold
//                         at the START of the next batch.
//   • Late-data drop    — a record with eventTime < current watermark is dropped
//                         (append/update only; complete mode keeps everything).
//   • Windowing         — tumbling / sliding (fixed) and session (merging) windows.
//   • Stateful agg      — per (group-key, window) aggregate, with state EVICTION
//                         once the watermark passes a window's end.
//   • Emission          — the EXACT rows per batch for each output mode:
//        append   → a window is emitted ONCE, only after the watermark passes its
//                   end (then its state is evicted).
//        update   → only rows whose aggregate changed in this batch.
//        complete → the ENTIRE result table, every batch (no drop, no eviction —
//                   so complete-mode state is unbounded; a real teaching point).
//
// References: Spark SQL "Structured Streaming Programming Guide" — Window
// Operations, Handling Late Data and Watermarking, Output Modes.
// ─────────────────────────────────────────────────────────────────────────────

// ── Aggregators ──────────────────────────────────────────────────────────────
// Each aggregator is pure: init() seeds state, add(acc, rec, field) folds one
// record in, merge(a, b) combines two partial states (used when session windows
// merge), value(acc) projects the public value.
export const AGGREGATORS = {
  count: {
    init: () => 0,
    add: (acc) => acc + 1,
    merge: (a, b) => a + b,
    value: (acc) => acc,
  },
  sum: {
    init: () => 0,
    add: (acc, rec, field = 'value') => acc + (Number(rec[field]) || 0),
    merge: (a, b) => a + b,
    value: (acc) => acc,
  },
  min: {
    init: () => null,
    add: (acc, rec, field = 'value') => {
      const v = Number(rec[field]);
      return acc == null ? v : Math.min(acc, v);
    },
    merge: (a, b) => (a == null ? b : b == null ? a : Math.min(a, b)),
    value: (acc) => acc,
  },
  max: {
    init: () => null,
    add: (acc, rec, field = 'value') => {
      const v = Number(rec[field]);
      return acc == null ? v : Math.max(acc, v);
    },
    merge: (a, b) => (a == null ? b : b == null ? a : Math.max(a, b)),
    value: (acc) => acc,
  },
};

// ── Fixed-window assignment (tumbling / sliding) ─────────────────────────────
// Window intervals are [start, end) — start inclusive, end EXCLUSIVE, exactly as
// Spark defines them. Returned sorted by start.

// Tumbling: one window per record.  window = [⌊t/size⌋·size, +size)
export function assignTumbling(t, size) {
  if (!(size > 0)) throw new Error('window size must be > 0');
  const start = Math.floor(t / size) * size;
  return [{ start, end: start + size }];
}

// Sliding: a record belongs to every window [k·slide, k·slide+size) that contains
// it. There are ⌈size/slide⌉ such windows (fewer at the stream's edge; zero if
// slide > size leaves gaps). We scan a generous k-range and keep only windows
// that actually contain t, so it is correct for any size/slide.
export function assignSliding(t, size, slide) {
  if (!(size > 0) || !(slide > 0)) throw new Error('window size and slide must be > 0');
  const out = [];
  const kLo = Math.floor((t - size) / slide);
  const kHi = Math.floor(t / slide) + 1;
  for (let k = kLo; k <= kHi; k++) {
    const start = k * slide;
    const end = start + size;
    if (start <= t && t < end) out.push({ start, end });
  }
  out.sort((a, b) => a.start - b.start);
  return out;
}

// Dispatch for fixed windows.
export function assignFixedWindows(t, spec) {
  if (spec.type === 'tumbling') return assignTumbling(t, spec.size);
  if (spec.type === 'sliding') return assignSliding(t, spec.size, spec.slide);
  throw new Error(`assignFixedWindows: unsupported window type "${spec.type}"`);
}

// ── Trigger planning ─────────────────────────────────────────────────────────
// Partition a flat record list into the micro-batches Spark would form.
//   { type:'once' }                      → one batch with everything.
//   { type:'availableNow', maxEventsPerBatch? } → all data, optionally split into
//        fixed-size batches in arrival order (models maxOffsetsPerTrigger).
//   { type:'processingTime', interval, maxEventsPerBatch? } → bucket by
//        ⌊(arrivalTime − t0)/interval⌋, INCLUDING empty intermediate buckets so a
//        trigger that fires on an empty interval is visible as a no-op batch.
// arrivalTime defaults to eventTime when not supplied.
export function planBatches(records, trigger = { type: 'once' }) {
  const recs = records.map((r, i) => ({ ...r, _seq: i }));
  const splitByMax = (arr, max) => {
    if (!max || arr.length <= max) return [arr];
    const out = [];
    for (let i = 0; i < arr.length; i += max) out.push(arr.slice(i, i + max));
    return out;
  };

  if (trigger.type === 'once') return recs.length ? [recs] : [[]];

  if (trigger.type === 'availableNow') {
    if (!recs.length) return [[]];
    return splitByMax(recs, trigger.maxEventsPerBatch);
  }

  if (trigger.type === 'processingTime') {
    if (!(trigger.interval > 0)) throw new Error('processingTime trigger needs interval > 0');
    if (!recs.length) return [[]];
    const withArr = recs.map((r) => ({ ...r, arrivalTime: r.arrivalTime ?? r.eventTime }));
    const t0 = Math.min(...withArr.map((r) => r.arrivalTime));
    const bucket = (r) => Math.floor((r.arrivalTime - t0) / trigger.interval);
    const maxB = Math.max(...withArr.map(bucket));
    const batches = Array.from({ length: maxB + 1 }, () => []);
    for (const r of withArr) batches[bucket(r)].push(r);
    // Deterministic within-batch order: arrivalTime, then eventTime, then seq.
    batches.forEach((b) =>
      b.sort((a, c) => a.arrivalTime - c.arrivalTime || a.eventTime - c.eventTime || a._seq - c._seq)
    );
    // Expand oversized buckets if a per-batch cap is set.
    if (trigger.maxEventsPerBatch) {
      return batches.flatMap((b) => (b.length ? splitByMax(b, trigger.maxEventsPerBatch) : [b]));
    }
    return batches;
  }

  throw new Error(`Unknown trigger type: ${trigger.type}`);
}

// ── Session-window helpers ───────────────────────────────────────────────────
// A session for a key is a maximal run of events each within `gap` of the next.
// Modeled as [start, end) where end = (max eventTime in session) + gap. Two
// sessions merge iff their intervals overlap (s.start < other.end). Coalescing
// after each insert handles transitive merges (a new event bridging two sessions).
function coalesceSessions(list, agg) {
  const sorted = [...list].sort((a, b) => a.start - b.start);
  const out = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start < last.end) {
      last.end = Math.max(last.end, s.end);
      last.acc = agg.merge(last.acc, s.acc);
    } else {
      out.push({ start: s.start, end: s.end, acc: s.acc });
    }
  }
  return out;
}

// ── The query ────────────────────────────────────────────────────────────────
export class MicroBatchQuery {
  // config:
  //   window:        { type:'tumbling', size } | { type:'sliding', size, slide }
  //                  | { type:'session', gap }
  //   watermarkDelay: number (ms), default 0
  //   outputMode:    'append' | 'update' | 'complete', default 'append'
  //   groupBy:       field name to group by in addition to the window (optional)
  //   aggregate:     { fn:'count'|'sum'|'min'|'max', field?:'value' }, default count
  constructor(config = {}) {
    this.config = config;
    this.window = config.window || { type: 'tumbling', size: 10 };
    this.delay = config.watermarkDelay || 0;
    this.mode = config.outputMode || 'append';
    this.groupBy = config.groupBy || null;
    const aggSpec = config.aggregate || { fn: 'count' };
    this.agg = AGGREGATORS[aggSpec.fn];
    if (!this.agg) throw new Error(`Unknown aggregate fn "${aggSpec.fn}"`);
    this.field = aggSpec.field || 'value';
    if (!['append', 'update', 'complete'].includes(this.mode)) {
      throw new Error(`Unknown output mode "${this.mode}"`);
    }
    if (this.window.type === 'session' && this.mode === 'complete') {
      // Spark supports append/update for session windows; complete would retain
      // all sessions forever. We allow it but it never evicts (documented).
    }
    this.reset();
  }

  // Full deterministic reset — same config + same input ⇒ identical trace.
  reset() {
    this.watermark = Number.NEGATIVE_INFINITY; // nothing is late before the first batch
    this.maxEventTime = Number.NEGATIVE_INFINITY;
    this.batchIndex = 0;
    this.fixedState = new Map(); // id → { key, window:{start,end}, acc }
    this.sessionState = new Map(); // keyVal → [{ start, end, acc }]
    return this;
  }

  _keyOf(rec) {
    return this.groupBy ? String(rec[this.groupBy]) : '__all__';
  }

  _rowOf(keyVal, window, acc, closed) {
    return {
      key: keyVal === '__all__' ? null : keyVal,
      window: { start: window.start, end: window.end },
      value: this.agg.value(acc),
      closed: !!closed,
    };
  }

  _sortRows(rows) {
    return rows.sort(
      (a, b) =>
        String(a.key).localeCompare(String(b.key)) ||
        a.window.start - b.window.start ||
        a.window.end - b.window.end
    );
  }

  // Process ONE micro-batch of records. Returns the full per-batch trace entry.
  processBatch(records = []) {
    const complete = this.mode === 'complete';
    const wmBefore = this.watermark;
    const dropped = [];
    const accepted = [];

    // 1) Advance the observed max event time (over all input, incl. late rows).
    for (const r of records) {
      if (r.eventTime > this.maxEventTime) this.maxEventTime = r.eventTime;
    }

    // 2) Late-data filter (append/update only). In complete mode nothing is late.
    for (const r of records) {
      if (!complete && r.eventTime < wmBefore) dropped.push(r);
      else accepted.push(r);
    }

    // 3) Fold accepted records into state.
    if (this.window.type === 'session') {
      this._ingestSession(accepted);
    } else {
      this._ingestFixed(accepted);
    }

    // 4) New watermark = max(prev, maxEventTime − delay). Monotonic by construction.
    const wmAfter =
      this.maxEventTime === Number.NEGATIVE_INFINITY
        ? wmBefore
        : Math.max(wmBefore, this.maxEventTime - this.delay);
    this.watermark = wmAfter;

    // 5) Emission + eviction per output mode.
    const emitted =
      this.window.type === 'session'
        ? this._emitSession(wmBefore, wmAfter, accepted, complete)
        : this._emitFixed(wmBefore, wmAfter, complete);

    const entry = {
      index: this.batchIndex,
      input: records.length,
      accepted: accepted.length,
      droppedCount: dropped.length,
      dropped: dropped.map((r) => ({ ...r })),
      maxEventTime: this.maxEventTime,
      watermarkBefore: wmBefore,
      watermarkAfter: wmAfter,
      emitted,
      state: this.stateRows(),
    };
    this.batchIndex++;
    return entry;
  }

  // ── fixed-window ingest / emit ─────────────────────────────────────────────
  _ingestFixed(accepted) {
    for (const r of accepted) {
      const keyVal = this._keyOf(r);
      for (const w of assignFixedWindows(r.eventTime, this.window)) {
        const id = `${keyVal}\u0001${w.start}\u0001${w.end}`;
        let g = this.fixedState.get(id);
        if (!g) {
          g = { key: keyVal, window: w, acc: this.agg.init(), touched: false };
          this.fixedState.set(id, g);
        }
        g.acc = this.agg.add(g.acc, r, this.field);
        g.touched = true;
      }
    }
  }

  _emitFixed(wmBefore, wmAfter, complete) {
    let emitted = [];
    if (complete) {
      for (const g of this.fixedState.values()) {
        emitted.push(this._rowOf(g.key, g.window, g.acc, false));
      }
    } else if (this.mode === 'update') {
      for (const g of this.fixedState.values()) {
        if (g.touched) emitted.push(this._rowOf(g.key, g.window, g.acc, g.window.end <= wmAfter));
      }
      for (const [id, g] of this.fixedState) if (g.window.end <= wmAfter) this.fixedState.delete(id);
    } else {
      // append: emit windows that CLOSE this batch (end crosses the watermark).
      for (const g of this.fixedState.values()) {
        if (g.window.end <= wmAfter && g.window.end > wmBefore) {
          emitted.push(this._rowOf(g.key, g.window, g.acc, true));
        }
      }
      for (const [id, g] of this.fixedState) if (g.window.end <= wmAfter) this.fixedState.delete(id);
    }
    // Clear the per-batch touched flags on whatever state survives.
    for (const g of this.fixedState.values()) g.touched = false;
    return this._sortRows(emitted);
  }

  // ── session-window ingest / emit ───────────────────────────────────────────
  _ingestSession(accepted) {
    const gap = this.window.gap;
    if (!(gap > 0)) throw new Error('session window needs gap > 0');
    for (const r of accepted) {
      const keyVal = this._keyOf(r);
      const list = this.sessionState.get(keyVal) || [];
      list.push({
        start: r.eventTime,
        end: r.eventTime + gap,
        acc: this.agg.add(this.agg.init(), r, this.field),
      });
      this.sessionState.set(keyVal, coalesceSessions(list, this.agg));
    }
  }

  _emitSession(wmBefore, wmAfter, accepted, complete) {
    let emitted = [];
    const touchedBy = (s) =>
      accepted.some((r) => this._keyOf(r) === s._key && r.eventTime >= s.start && r.eventTime < s.end);

    for (const [keyVal, list] of this.sessionState) {
      for (const s of list) s._key = keyVal; // transient tag for touchedBy
    }

    if (complete) {
      for (const [keyVal, list] of this.sessionState) {
        for (const s of list) emitted.push(this._rowOf(keyVal, s, s.acc, false));
      }
    } else if (this.mode === 'update') {
      for (const [keyVal, list] of this.sessionState) {
        for (const s of list) {
          if (touchedBy(s)) emitted.push(this._rowOf(keyVal, s, s.acc, s.end <= wmAfter));
        }
      }
      for (const [keyVal, list] of this.sessionState) {
        const kept = list.filter((s) => s.end > wmAfter);
        if (kept.length) this.sessionState.set(keyVal, kept);
        else this.sessionState.delete(keyVal);
      }
    } else {
      // append
      for (const [keyVal, list] of this.sessionState) {
        for (const s of list) {
          if (s.end <= wmAfter && s.end > wmBefore) emitted.push(this._rowOf(keyVal, s, s.acc, true));
        }
      }
      for (const [keyVal, list] of this.sessionState) {
        const kept = list.filter((s) => s.end > wmAfter);
        if (kept.length) this.sessionState.set(keyVal, kept);
        else this.sessionState.delete(keyVal);
      }
    }
    return this._sortRows(emitted);
  }

  // Current retained state as sorted rows (for the trace + UI).
  stateRows() {
    const rows = [];
    if (this.window.type === 'session') {
      for (const [keyVal, list] of this.sessionState) {
        for (const s of list) rows.push(this._rowOf(keyVal, s, s.acc, false));
      }
    } else {
      for (const g of this.fixedState.values()) rows.push(this._rowOf(g.key, g.window, g.acc, false));
    }
    return this._sortRows(rows);
  }

  // Run a list of pre-formed batches, returning the full trace.
  run(batches) {
    this.reset();
    const trace = batches.map((b) => this.processBatch(b));
    return { trace, finalState: this.stateRows(), finalWatermark: this.watermark };
  }
}

// Convenience: plan a flat record list into batches, then run the query.
export function runQuery(records, config, trigger = { type: 'once' }) {
  const batches = planBatches(records, trigger);
  return new MicroBatchQuery(config).run(batches);
}

export default MicroBatchQuery;
