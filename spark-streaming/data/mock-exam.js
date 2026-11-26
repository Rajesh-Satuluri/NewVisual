// B7 · Mock Interview — a curated 45-minute Structured Streaming interview set,
// phased like a real loop: warm-up, core, deep-dive, coding, scenario.
// Shape: { phase, mins, q, model, m }
export const MOCK = {
  totalMins: 45,
  questions: [
    // ── Warm-up (~5 min) ──
    { phase: 'Warm-up', mins: 2, m: 'm01', q: 'In one sentence, what is Spark Structured Streaming?',
      model: 'A declarative stream-processing engine that models a stream as an unbounded, ever-growing table and runs the same DataFrame/SQL query you\'d run on batch — incrementally and continuously — with first-class event time and exactly-once.' },
    { phase: 'Warm-up', mins: 3, m: 'm02', q: 'What is the "unbounded table" model and the result table?',
      model: 'The input stream is an input table to which rows are continuously appended; your query is an incremental view over it, and Spark maintains a result table. The output mode (append/update/complete) decides which result rows are written to the sink each batch.' },

    // ── Core (~12 min) ──
    { phase: 'Core', mins: 4, m: 'm08', q: 'Define a watermark precisely and explain what it controls.',
      model: 'watermark = max(event time observed) − allowed-lateness delay, and it is monotonic. Rows with event time below it are late (dropped in append/update). It bounds state by enabling eviction once it passes a window/key end, gates append-mode emission and outer-join nulls, and with multiple inputs is the minimum across them. You size the delay to real p99 out-of-orderness.' },
    { phase: 'Core', mins: 4, m: 'm12', q: 'Compare the three output modes and when you\'d use each.',
      model: 'Append emits only finalized rows that never change (closed windows at the watermark) — for immutable stores; the default. Update emits only rows that changed this batch — for live dashboards. Complete re-emits the whole result and never evicts state — only for small, fully-recomputable results.' },
    { phase: 'Core', mins: 4, m: 'm05', q: 'Explain the micro-batch model and the trigger options.',
      model: 'The stream runs as a sequence of bounded batch jobs over planned offset ranges. Triggers: default (ASAP), processingTime (fixed interval, the workhorse), availableNow (drain all then stop — for scheduled incremental jobs), once (legacy), continuous (~ms latency, at-least-once, limited ops). Micro-batch amortizes checkpoint overhead and reuses the batch engine, trading batch-interval latency.' },

    // ── Deep-dive (~12 min) ──
    { phase: 'Deep-dive', mins: 6, m: 'm16', q: 'Walk me through exactly-once end-to-end. Where can it break?',
      model: 'Four legs: a replayable source (re-serve the same offsets), deterministic reprocessing, a transactional/idempotent sink (commit a batch id once), and the offset-log-before / commit-log-after protocol in the checkpoint. On restart, an offset-logged-but-uncommitted batch is replayed; a transactional sink overwrites that batch id → no duplicates. It breaks (→ at-least-once) if the sink is append-only, if reprocessing is non-deterministic, or if the source can\'t replay. It never loses data, but exactly-once is a correctness property, not latency.' },
    { phase: 'Deep-dive', mins: 6, m: 'm18', q: 'How does a stream-stream join stay bounded, and how do outer joins behave?',
      model: 'Both inputs are buffered symmetrically in keyed state; matching needs an equality key plus a mandatory time-range constraint. A watermark on both sides (join watermark = their min) + the time bound let Spark prove no future match is possible and evict — that\'s what makes state finite. Outer-join null-padded rows emit only at eviction (delayed), so e.g. abandoned carts surface when the watermark passes the window. State ≈ both sides\' rows within the window, so the window width is the dominant memory lever.' },

    // ── Coding (~8 min) ──
    { phase: 'Coding', mins: 8, m: 'm22', q: 'Sketch a pipeline: Kafka orders → 5-min windowed revenue → Delta, exactly-once, 30s batches. What are the must-haves?',
      model: 'readStream.format("kafka") → from_json with explicit schema → withWatermark("event_time","10 minutes") → groupBy(window("event_time","5 minutes")).agg(sum) → writeStream.format("delta").outputMode("append").option("checkpointLocation", …).trigger(processingTime="30 seconds"). Must-haves: explicit schema, a watermark (so append windows finalize), a stable checkpointLocation, a transactional sink (Delta) for exactly-once, and append mode for finalized windows.' },

    // ── Scenario / incident (~8 min) ──
    { phase: 'Scenario', mins: 4, m: 'm10', q: 'A stateful job OOMs after a few days. How do you diagnose and fix it?',
      model: 'Check lastProgress.stateOperators for growing numRowsTotal/memory and batchDuration vs trigger. Usual cause: missing/too-large watermark (no eviction), a too-wide join time window, or high-cardinality keys. Fix: define/tighten the watermark, narrow the join window (biggest lever), switch to the RocksDB state store, reduce key cardinality. Only then scale hardware.' },
    { phase: 'Scenario', mins: 4, m: 'm20', q: 'You need to change the aggregation keys of a running, checkpointed query. What\'s the catch and the plan?',
      model: 'The checkpoint encodes state schema — aggregation keys, window definitions, stateful operators, and state parallelism (shuffle partitions) can\'t change against it or the state layout won\'t match. Plan: deploy with a new checkpoint directory (and backfill history if continuity matters). Safe changes without a new checkpoint are filters, sinks, and triggers.' },
  ],
};
