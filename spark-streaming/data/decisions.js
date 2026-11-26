// B3 · Decision Drills — pick the right architectural choice and defend it.
// Shape: { m, q, options:[{t, ok:bool, why}], principle }
export const DECISIONS = [
  { m: 'm12', q: 'You write windowed revenue to an immutable Delta warehouse table for BI. Which output mode?',
    options: [
      { t: 'append', ok: true, why: 'Windowed results are finalized once at the watermark; file/warehouse sinks require append. Correct.' },
      { t: 'update', ok: false, why: 'Update emits changing rows repeatedly — wrong for an immutable warehouse table and unsupported by most file sinks in this shape.' },
      { t: 'complete', ok: false, why: 'Complete rewrites the entire result each batch and never evicts state — infeasible for an unbounded warehouse table.' },
    ], principle: 'Append for finalized rows to immutable stores; update for live dashboards; complete only for small full results.' },

  { m: 'm08', q: 'Events can arrive up to ~8 minutes late in practice (p99). What watermark delay do you set?',
    options: [
      { t: '0 (no lateness)', ok: false, why: 'Drops the ~8-minute-late tail — real data loss.' },
      { t: '~10 minutes', ok: true, why: 'Covers the real p99 lateness with a small buffer; keeps state bounded without dropping valid data.' },
      { t: '24 hours', ok: false, why: 'Hugely inflates state and delays every window by a day for no benefit.' },
    ], principle: 'Size the watermark to real p99 out-of-orderness — not zero, not "to be safe" huge.' },

  { m: 'm18', q: 'A stream-stream join\'s dual-side state is exhausting memory. First lever?',
    options: [
      { t: 'Tighten the join time-range window', ok: true, why: 'State ≈ rows within the window on both sides; narrowing it is the biggest, most direct reduction.' },
      { t: 'Add more executors', ok: false, why: 'Helps capacity but does not reduce the fundamental state size; treats the symptom.' },
      { t: 'Switch to complete output mode', ok: false, why: 'Irrelevant to join buffering and would retain even more state.' },
    ], principle: 'For stream-stream joins, the width of the time constraint is the dominant lever on state.' },

  { m: 'm16', q: 'You need exactly-once into a system that only supports appends (no transactions).',
    options: [
      { t: 'Accept at-least-once', ok: false, why: 'Sometimes acceptable, but the requirement was exactly-once — not yet satisfied.' },
      { t: 'foreachBatch with idempotent writes keyed by batchId', ok: true, why: 'Record/skip committed batchIds so replays are idempotent — exactly-once on an append-only target.' },
      { t: 'Disable the checkpoint', ok: false, why: 'Destroys recovery and any correctness guarantee.' },
    ], principle: 'On non-transactional sinks, achieve exactly-once via batchId-keyed idempotent writes in foreachBatch.' },

  { m: 'm05', q: 'A nightly job must process all new data since yesterday, then stop. Trigger?',
    options: [
      { t: 'processingTime="1 hour"', ok: false, why: 'Runs forever on an interval — it never stops on its own.' },
      { t: 'availableNow', ok: true, why: 'Drains all available data in bounded batches and terminates — ideal for scheduled incremental jobs.' },
      { t: 'continuous', ok: false, why: 'A long-running low-latency mode, the opposite of a batch-and-stop job.' },
    ], principle: 'availableNow = incremental batch over the streaming code path, then stop.' },

  { m: 'm20', q: 'A stateful job on a small cluster over-shards state with 200 shuffle partitions. You want 16. When do you change it?',
    options: [
      { t: 'Any time; just restart', ok: false, why: 'Shuffle partitions fix state parallelism; changing it against an existing checkpoint is incompatible.' },
      { t: 'Before the first run against a fresh checkpoint', ok: true, why: 'State layout is fixed at first run — set it before, or start a new checkpoint.' },
      { t: 'Never, it is immutable forever', ok: false, why: 'You can change it with a new checkpoint — just not against the existing one.' },
    ], principle: 'State parallelism (shuffle partitions) is baked into the checkpoint; set it up front.' },

  { m: 'm17', q: 'You must enrich an orders stream with slowly-changing product attributes. Join type?',
    options: [
      { t: 'Stream-stream join', ok: false, why: 'Overkill and stateful — the dimension is not a live stream; you\'d need watermarks and time bounds needlessly.' },
      { t: 'Stream-static join', ok: true, why: 'The dimension is a (re-read) static table; no state, no watermark — exactly right for enrichment.' },
      { t: 'No join; hardcode values', ok: false, why: 'Unmaintainable and wrong when the dimension changes.' },
    ], principle: 'Enrichment against a table = stream-static join (stateless side).' },

  { m: 'm13', q: 'You must deduplicate a high-volume event stream by event_id without unbounded state.',
    options: [
      { t: 'dropDuplicates(["event_id"])', ok: false, why: 'Without a watermark the seen-key set grows forever.' },
      { t: 'dropDuplicatesWithinWatermark(["event_id"]) + watermark', ok: true, why: 'Bounds dedup state to the watermark horizon — finite memory.' },
      { t: 'distinct() each batch', ok: false, why: 'distinct is not a streaming dedup across batches and would not bound cross-batch state correctly.' },
    ], principle: 'Prefer dropDuplicatesWithinWatermark so dedup state is bounded.' },

  { m: 'm22', q: 'You need to change the window size of a running, checkpointed aggregation.',
    options: [
      { t: 'Edit the code and redeploy on the same checkpoint', ok: false, why: 'Window definition changes break checkpoint/state compatibility — results corrupt or the query fails.' },
      { t: 'Deploy with a new checkpoint (and backfill if needed)', ok: true, why: 'A changed stateful definition needs a fresh checkpoint; backfill history if continuity matters.' },
      { t: 'Switch to complete mode', ok: false, why: 'Does not address checkpoint incompatibility.' },
    ], principle: 'Changing keys/windows/stateful ops requires a new checkpoint — treat it as state schema.' },

  { m: 'm06', q: 'A fraud-scoring path needs ~10 ms latency on simple per-event transforms. Mode?',
    options: [
      { t: 'Micro-batch with 1s trigger', ok: false, why: 'Batch-interval latency (~seconds) misses the 10 ms target.' },
      { t: 'Continuous processing', ok: true, why: '~ms latency for map/filter-style ops — fits, accepting at-least-once and limited operations.' },
      { t: 'Complete output mode', ok: false, why: 'Unrelated to latency and heavier.' },
    ], principle: 'Continuous mode for ms-latency simple pipelines; micro-batch for everything stateful/analytical.' },

  { m: 'm14', q: 'One stream must land in both a Delta table and a Kafka topic with a single consistent batch.',
    options: [
      { t: 'Two separate writeStream queries', ok: false, why: 'Two independent checkpoints/queries — no single-batch consistency and double the read.' },
      { t: 'foreachBatch that writes both sinks', ok: true, why: 'One batch DataFrame fanned out to both targets within the same micro-batch, one checkpoint.' },
      { t: 'complete mode to both', ok: false, why: 'Does not provide multi-sink fan-out.' },
    ], principle: 'Fan-out to multiple sinks from one batch using foreachBatch.' },

  { m: 'm10', q: 'An interviewer asks for a streaming global Top-10 by revenue written each batch.',
    options: [
      { t: 'agg.orderBy(desc).limit(10) in append mode', ok: false, why: 'Global sort/limit on a stream in append mode is unsupported.' },
      { t: 'Aggregate, then Top-N per batch inside foreachBatch (overwrite)', ok: true, why: 'Compute the aggregate as state; rank/limit within each batch and overwrite the target.' },
      { t: 'dropDuplicates then limit', ok: false, why: 'Dedup is not ranking; limit on a stream is still unsupported in append.' },
    ], principle: 'Ordered Top-N over a stream: aggregate, then rank in foreachBatch.' },

  { m: 'm04', q: 'Topic retention deleted offsets your checkpoint expects; the job crashes on restart. You must keep it running.',
    options: [
      { t: 'Delete the checkpoint and start over', ok: false, why: 'Loses all state and reprocesses everything — usually worse and not always possible.' },
      { t: 'Set failOnDataLoss=false (accept possible loss)', ok: true, why: 'Lets the query skip the vanished offsets and continue, with a documented at-least-once/loss tradeoff.' },
      { t: 'Increase maxOffsetsPerTrigger', ok: false, why: 'Unrelated to missing offsets.' },
    ], principle: 'failOnDataLoss=false tolerates retention gaps — but document the correctness tradeoff.' },

  { m: 'm21', q: 'Latency is creeping up over hours. What do you check first?',
    options: [
      { t: 'batchDuration vs trigger interval + stateOperators size in lastProgress', ok: true, why: 'If batch duration exceeds the trigger or state is ballooning, the query falls behind — the root cause is there.' },
      { t: 'Rewrite in Scala', ok: false, why: 'Premature; the metrics tell you the actual bottleneck first.' },
      { t: 'Add complete mode', ok: false, why: 'Would worsen state and latency.' },
    ], principle: 'Diagnose with StreamingQueryProgress (batch duration, rates, stateOperators) before changing code.' },

  { m: 'm09', q: 'You need overlapping 1-hour metrics refreshed every 5 minutes.',
    options: [
      { t: 'Tumbling 1-hour window', ok: false, why: 'Non-overlapping — refreshes only once an hour, not every 5 minutes.' },
      { t: 'Sliding window: size 1 hour, slide 5 minutes', ok: true, why: 'Overlapping windows advancing every 5 minutes give the rolling 1-hour view.' },
      { t: 'Session window', ok: false, why: 'Activity-gap based — not a fixed rolling hour.' },
    ], principle: 'Rolling fixed-duration metrics = sliding window (size + smaller slide).' },

  { m: 'm16', q: 'Your sink is Delta (transactional). A node crashes after sink write, before commit. What happens, and do you act?',
    options: [
      { t: 'Data is lost; you must replay manually', ok: false, why: 'No manual action needed; the offset log makes it replayable automatically.' },
      { t: 'On restart Spark replays the batch; Delta replaces it — no duplicates, no loss', ok: true, why: 'Offset-logged-not-committed → replay; the transactional sink overwrites that batch id. Exactly-once holds.' },
      { t: 'The query produces duplicates permanently', ok: false, why: 'Duplicates only occur with append-only sinks, not transactional ones.' },
    ], principle: 'With a transactional sink, replay of an uncommitted batch is automatic and duplicate-free.' },
];
