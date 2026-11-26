// E2 · Checkpoint engine — a pure, deterministic model of Structured Streaming's
// exactly-once recovery: offset log (written BEFORE a batch) + commit log (written
// AFTER the sink), crash at any phase, replay on restart, and the difference an
// idempotent/transactional sink makes (exactly-once) vs an append sink
// (at-least-once → duplicates). No Spark, no cluster — semantics match the
// programming guide and are unit-tested against hand-computed vectors.
//
// Lifecycle per micro-batch (exactly as Spark orders it):
//   1 planOffsets     — determine the offset range of new data
//   2 writeOffsetLog  — persist {batchId → range} to the WAL  (BEFORE processing)
//   3 process         — compute the batch result
//   4 writeSink       — write results to the sink
//   5 writeCommitLog  — persist "batchId committed"           (AFTER the sink)
// The offset-before / commit-after ordering is what makes recovery exactly-once.

export const PHASES = ['planOffsets', 'writeOffsetLog', 'process', 'writeSink', 'writeCommitLog'];

// Partition a flat record list into fixed-size batches with contiguous offset
// ranges [start, end).  records: [{ id, ... }].
export function planBatches(records, batchSize) {
  if (!(batchSize > 0)) throw new Error('batchSize must be > 0');
  const batches = [];
  for (let i = 0; i < records.length; i += batchSize) {
    const end = Math.min(i + batchSize, records.length);
    batches.push({ batchId: batches.length, start: i, end, records: records.slice(i, end) });
  }
  return batches;
}

// The sink.  mode:
//   'exactlyOnce' — idempotent/transactional: writing a batchId that is already
//                   present REPLACES it (no duplicates on replay).
//   'atLeastOnce' — plain append: replaying a batch appends its rows again
//                   (duplicates when a crash lands after writeSink, before commit).
export class Sink {
  constructor(mode = 'exactlyOnce') {
    if (!['exactlyOnce', 'atLeastOnce'].includes(mode)) throw new Error(`bad sink mode "${mode}"`);
    this.mode = mode;
    this.rows = []; // [{ recordId, batchId }]
  }
  write(batchId, records) {
    if (this.mode === 'exactlyOnce') {
      // transactional: drop any prior rows for this batch, then write (replace).
      this.rows = this.rows.filter((r) => r.batchId !== batchId);
    }
    for (const rec of records) this.rows.push({ recordId: rec.id, batchId });
  }
  // Duplicate recordIds currently in the sink.
  duplicates() {
    const seen = new Map();
    for (const r of this.rows) seen.set(r.recordId, (seen.get(r.recordId) || 0) + 1);
    return [...seen.entries()].filter(([, n]) => n > 1).map(([id, n]) => ({ id, count: n }));
  }
  ids() { return this.rows.map((r) => r.recordId); }
}

// A checkpointed query: offset log + commit log + sink, with crash injection.
export class CheckpointSim {
  constructor({ sinkMode = 'exactlyOnce' } = {}) {
    this.sinkMode = sinkMode;
    this.reset();
  }
  reset() {
    this.offsetLog = new Map(); // batchId → { start, end }
    this.commitLog = new Set(); // committed batchIds
    this.sink = new Sink(this.sinkMode);
    this.trace = [];
    return this;
  }

  // Run batches in order. `crash` = { batchId, phase } halts the run the instant
  // that phase of that batch is reached: that phase and all later ones in the run
  // do NOT happen (nor any later batch). Returns a per-phase trace up to the crash.
  run(batches, crash = null) {
    for (const b of batches) {
      for (const phase of PHASES) {
        if (crash && crash.batchId === b.batchId && crash.phase === phase) {
          this.trace.push({ batchId: b.batchId, phase, done: false, crashed: true });
          return { crashedAt: { batchId: b.batchId, phase }, completed: false };
        }
        this._applyPhase(b, phase);
        this.trace.push({ batchId: b.batchId, phase, done: true, crashed: false });
      }
    }
    return { crashedAt: null, completed: true };
  }

  _applyPhase(b, phase) {
    switch (phase) {
      case 'planOffsets': break; // compute only
      case 'writeOffsetLog': this.offsetLog.set(b.batchId, { start: b.start, end: b.end }); break;
      case 'process': break; // compute only
      case 'writeSink': this.sink.write(b.batchId, b.records); break;
      case 'writeCommitLog': this.commitLog.add(b.batchId); break;
    }
  }

  // Recovery on restart: compare offset log vs commit log. Any batch that was
  // offset-logged but NOT committed is replayed (re-read from its logged offsets,
  // reprocessed, re-written, committed). Then processing continues with the
  // remaining batches. Returns the recovery trace.
  recover(allBatches) {
    const byId = new Map(allBatches.map((b) => [b.batchId, b]));
    const recovery = [];

    // 1) Replay any offset-logged-but-uncommitted batch (at most the last one in
    //    a single-stream query, but we handle the general set for completeness).
    const toReplay = [...this.offsetLog.keys()].filter((id) => !this.commitLog.has(id)).sort((a, c) => a - c);
    for (const id of toReplay) {
      const b = byId.get(id);
      // re-read SAME offsets from the offset log (replayable source), reprocess, re-sink, commit.
      this.sink.write(id, b.records);
      this.commitLog.add(id);
      recovery.push({ batchId: id, action: 'replayed', from: this.offsetLog.get(id) });
    }

    // 2) Continue with batches that were never started (no offset-log entry).
    const maxLogged = this.offsetLog.size ? Math.max(...this.offsetLog.keys()) : -1;
    for (const b of allBatches) {
      if (b.batchId <= maxLogged) continue;
      this.offsetLog.set(b.batchId, { start: b.start, end: b.end });
      this.sink.write(b.batchId, b.records);
      this.commitLog.add(b.batchId);
      recovery.push({ batchId: b.batchId, action: 'processed-new', from: { start: b.start, end: b.end } });
    }
    return recovery;
  }

  // Did every input record land in the sink at least once? (no data loss)
  coversAll(records) {
    const got = new Set(this.sink.ids());
    return records.every((r) => got.has(r.id));
  }
}

// Convenience: run to an optional crash, then recover, and report the outcome.
export function simulateRecovery(records, batchSize, { crash = null, sinkMode = 'exactlyOnce' } = {}) {
  const batches = planBatches(records, batchSize);
  const sim = new CheckpointSim({ sinkMode });
  const runResult = sim.run(batches, crash);
  const recovery = crash ? sim.recover(batches) : [];
  return {
    batches,
    runResult,
    recovery,
    sinkIds: sim.sink.ids(),
    duplicates: sim.sink.duplicates(),
    coversAll: sim.coversAll(records),
    offsetLog: [...sim.offsetLog.entries()].map(([batchId, range]) => ({ batchId, ...range })),
    commitLog: [...sim.commitLog].sort((a, b) => a - b),
    sim,
  };
}
