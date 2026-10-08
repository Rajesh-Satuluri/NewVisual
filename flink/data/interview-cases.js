// =====================================================================
// Interview corner-case catalogue.  Every hard, scenario-style question a
// 4-YOE→senior Flink interview actually asks — each one answered THROUGH
// canonical ride R-4471 (see ride-story.js) and, where code helps, tied to
// a verified PyFlink snippet key (see pyflink-snippets.py/.js).
//
// shape of a case:
//   id, module, concept, difficulty: easy|medium|hard,
//   scenario  — the concrete situation on R-4471
//   breaks    — what goes wrong if you get it wrong (the trap)
//   answer    — interview-grade explanation (HTML allowed)
//   config    — real Flink/Kafka config keys that matter here
//   snippet   — key into PYFLINK (optional)
//   anchor    — { stage } or { incident } in the ride story (optional)
// =====================================================================

export const INTERVIEW_CASES = [
  // ---------------- Watermarks (m09) ----------------
  {
    id: 'wm-late-event', module: 'm09', concept: 'watermarks', difficulty: 'medium',
    scenario: 'R-4471’s driver goes through the Durgam Cheruvu underpass. A GPS ping with event_time=+21s is buffered and arrives at +34s, after the watermark for +21s has passed.',
    breaks: 'With bounded-out-of-orderness of only 10s, +21s is already "closed". Without allowedLateness the ping is dropped and the distance/speed for that window is understated.',
    answer: `A watermark W(t) asserts "no event with event_time ≤ t should still arrive". <code>forBoundedOutOfOrderness(10s)</code> sets W = maxEventTime − 10s, so it tolerates 10s of reordering. This ping is 13s late — past the watermark — so it would normally be dropped. The fix is <code>allowedLateness(2 min)</code> on the window: late events within that grace window <strong>re-fire</strong> the window with an updated result. Beyond allowedLateness you must use <code>sideOutputLateData</code> (see wm-side-output) or the data is lost.`,
    config: ['WatermarkStrategy.forBoundedOutOfOrderness', 'allowedLateness', 'sideOutputLateData'],
    snippet: 'watermark_strategy', anchor: { incident: 'DEFECT-1' },
  },
  {
    id: 'wm-idle-partition', module: 'm09', concept: 'watermarks', difficulty: 'hard',
    scenario: 'At 03:10 the ride-events topic is quiet in one city; Kafka partition 11 emits nothing for 40s while R-4471 flows on partition 7.',
    breaks: 'The operator watermark is the MIN across its input partitions. One silent partition pins the global watermark in the past, so NO window anywhere fires — the pipeline looks frozen though data is flowing.',
    answer: `This is the classic "my windows stopped firing" incident. Flink advances an operator’s watermark to the minimum of its inputs’ watermarks, so a single idle partition holds everyone back. <code>WatermarkStrategy.withIdleness(15s)</code> marks a source partition idle after 15s of silence; idle partitions are excluded from the min, letting the global watermark advance. Trade-off: if that partition later wakes with old events, they may be late — acceptable because the alternative is a stalled job.`,
    config: ['WatermarkStrategy.withIdleness', 'pipeline.auto-watermark-interval'],
    snippet: 'watermark_strategy', anchor: { incident: 'DEFECT-3' },
  },
  {
    id: 'wm-tuning', module: 'm09', concept: 'watermarks', difficulty: 'medium',
    scenario: 'Product wants surge decisions within ~15s, but tunnels cause up to ~12s of reordering on R-4471’s pings.',
    breaks: 'Set bounded-out-of-orderness too low → correct events counted as late. Too high → every window waits longer, adding latency to surge detection.',
    answer: `Bounded-out-of-orderness is a direct <strong>latency vs completeness</strong> dial. Watermark lag = your out-of-orderness bound, and a window only fires once the watermark passes window-end, so the bound is added to every window’s firing latency. Measure the real p99 event lateness from production (histogram of ingest−event time), set the bound near p99 (~12s here), and catch the rare tail with a short allowedLateness instead of inflating the bound for everyone.`,
    config: ['forBoundedOutOfOrderness', 'allowedLateness'],
    anchor: { incident: 'DEFECT-1' },
  },

  // ---------------- Event time (m08) ----------------
  {
    id: 'time-billing-vs-dashboard', module: 'm08', concept: 'event-time', difficulty: 'easy',
    scenario: 'The accept-latency metric for R-4471 is wait = DRIVER_ACCEPTED − RIDE_REQUESTED. The ops dashboard also shows "rides/sec right now".',
    breaks: 'Use processing time for the wait metric and a replay/backfill produces different numbers each run; use event time for the live "right now" tile and it lags during catch-up.',
    answer: `Pick the time semantic per use case. <strong>Billing / SLA / anything replayable</strong> → <code>event time</code>: the rider’s wait is defined by phone clocks, so results are deterministic across reprocessing. <strong>Live liveness tiles / alerting on "is data flowing"</strong> → <code>processing time</code>: you want wall-clock, and determinism doesn’t matter. Ingestion time is the rare middle ground when producers lack reliable clocks.`,
    config: ['WatermarkStrategy', 'TimestampAssigner'],
    snippet: 'keyed_state_wait_time', anchor: { stage: 'DRIVER_ACCEPTED' },
  },

  // ---------------- Windows (m10) ----------------
  {
    id: 'win-never-fires', module: 'm10', concept: 'windows', difficulty: 'hard',
    scenario: 'The per-minute demand window for R-4471’s cell shows zero output even though events are visibly arriving.',
    breaks: 'Engineers blame the window; the real cause is almost always the watermark not advancing (idle source, wrong timestamp assigner, or event_time in the wrong unit).',
    answer: `Event-time windows fire when the <strong>watermark</strong> crosses window-end, not when wall-clock does. "Window never fires" ⇒ debug the watermark: (1) is a TimestampAssigner attached and reading the right field/unit (ms vs s)? (2) is a source partition idle and pinning the min watermark (see wm-idle-partition)? (3) is there simply no event past window-end yet to push the watermark? Check the <code>currentOutputWatermark</code> metric before touching the window.`,
    config: ['pipeline.auto-watermark-interval', 'currentOutputWatermark (metric)'],
    snippet: 'keyby_window_agg', anchor: { stage: 'LOCATION_UPDATED' },
  },
  {
    id: 'win-late-side-output', module: 'm10', concept: 'windows', difficulty: 'medium',
    scenario: 'R-4471’s second stuck ping is 3m10s late — beyond the 2-min allowedLateness.',
    breaks: 'Without a side output it is silently discarded; telemetry under-reports with no trace.',
    answer: `<code>allowedLateness(2 min)</code> keeps window state around for 2 min after firing so moderately late events re-fire it. Events later than that go to a <code>sideOutputLateData(tag)</code> stream you drain separately (e.g. to a reconciliation topic/table). Rule of thumb: allowedLateness for events you’ll still act on; side output for audit so nothing is lost silently. Longer allowedLateness = more retained window state.`,
    config: ['allowedLateness', 'sideOutputLateData', 'OutputTag'],
    snippet: 'late_data_side_output', anchor: { incident: 'DEFECT-2' },
  },
  {
    id: 'win-session-gap', module: 'm10', concept: 'windows', difficulty: 'medium',
    scenario: 'The pre-trip phase of R-4471 (search→assigned→accepted→arriving→arrived) is irregular; a fixed 1-min tumbling window splits it awkwardly.',
    breaks: 'Tumbling/sliding windows impose fixed boundaries that cut a single logical session in half.',
    answer: `Use a <strong>session window</strong> with an inactivity gap (e.g. 90s). Session windows have no fixed boundaries — they grow per key until a gap of silence, then close. Flink implements them by creating a window per event and <strong>merging</strong> overlapping ones (hence a session window needs a merging trigger/aggregator). Perfect for "activity until the user goes quiet", which is exactly the pre-trip phase.`,
    config: ['EventTimeSessionWindows.withGap'],
    anchor: { stage: 'DRIVER_ARRIVED' },
  },

  // ---------------- State (m11) ----------------
  {
    id: 'state-backend-choice', module: 'm11', concept: 'state', difficulty: 'medium',
    scenario: 'Per-driver state (last trip, trajectory buffer, fraud features) across a region grows past what fits in JVM heap.',
    breaks: 'HashMap (heap) backend with large state → long GC pauses and OOM; also forces full-snapshot checkpoints that take minutes.',
    answer: `Choose <strong>RocksDB</strong> when state exceeds heap or you need incremental checkpoints: it stores state off-heap on local disk (no GC), scales to TBs, and on an LSM tree only uploads <em>changed</em> SSTables per checkpoint. Choose <strong>HashMap</strong> when state is small and you need &lt;1ms reads (e.g. low-cardinality fraud scoring). Enable incremental: <code>EmbeddedRocksDBStateBackend(True)</code>.`,
    config: ['state.backend: rocksdb', 'state.backend.incremental', 'EmbeddedRocksDBStateBackend'],
    snippet: 'rocksdb_backend', anchor: { stage: 'DRIVER_SEARCHING' },
  },
  {
    id: 'state-ttl-growth', module: 'm11', concept: 'state', difficulty: 'medium',
    scenario: 'Drivers who logged off weeks ago still have keyed state; RocksDB keeps growing and checkpoints slow down.',
    breaks: 'Unbounded keyed state is the #1 cause of a Flink job degrading over weeks; nothing evicts old keys automatically unless you ask.',
    answer: `Attach <code>StateTtlConfig</code> to the descriptor. Each entry carries a timestamp; expired entries are hidden on read and physically removed either lazily (next access) or in the background via the <strong>RocksDB compaction filter</strong>. Set visibility to NeverReturnExpired for correctness. Here: expire driver state after 24h of inactivity so the backend doesn’t grow to TBs for idle drivers.`,
    config: ['StateTtlConfig', 'enableTimeToLive', 'cleanupInRocksdbCompactFilter'],
    snippet: 'state_ttl',
  },
  {
    id: 'state-schema-evolution', module: 'm11', concept: 'state', difficulty: 'hard',
    scenario: 'You add a field to the per-ride state class and redeploy R-4471’s pipeline from a savepoint.',
    breaks: 'A non-evolvable serializer (e.g. generic Kryo) makes the restore fail — state can’t be read back.',
    answer: `Flink supports <strong>state schema evolution</strong> only for evolvable serializers — POJO and Avro. Added/removed fields and type-compatible changes restore cleanly; renames and incompatible type changes do not. Avoid Kryo for long-lived state. On restore, Flink runs serializer-compatibility checks and migrates state if compatible, else fails fast. Pair this with stable <code>uid()</code>s so state maps to the right operator.`,
    config: ['POJO/Avro serializers', 'uid()', 'state.backend'],
    snippet: 'savepoint_uid',
  },
  {
    id: 'state-broadcast-rules', module: 'm11', concept: 'state', difficulty: 'hard',
    scenario: 'Ops change surge multipliers through the day; every keyed ride stream must price against the latest rules.',
    breaks: 'A per-event external lookup for rules adds latency and a failure point; keyed state can’t hold global rules.',
    answer: `Use <strong>broadcast state</strong>: broadcast the low-volume rules stream to every subtask with a <code>MapStateDescriptor</code>, then <code>connect</code> it to the keyed ride stream and process with a <code>KeyedBroadcastProcessFunction</code>. Each subtask reads the latest rules locally — no external call. Caveat worth stating: broadcast state in PyFlink needs Flink ≥ 1.16; older clusters make this a Java-only path.`,
    config: ['MapStateDescriptor', 'broadcast()', 'KeyedBroadcastProcessFunction'],
    snippet: 'broadcast_surge_rules',
  },

  // ---------------- Checkpointing (m12) ----------------
  {
    id: 'cp-aligned-vs-unaligned', module: 'm12', concept: 'checkpointing', difficulty: 'hard',
    scenario: 'During the airport surge, R-4471’s pipeline is backpressured; checkpoints start timing out.',
    breaks: 'Aligned checkpoints make fast inputs WAIT at the barrier for slow ones; under backpressure the barrier crawls through buffers and the checkpoint times out → repeated failed checkpoints → no recovery point.',
    answer: `Aligned checkpoints block an operator’s already-arrived barriers until barriers arrive on <em>all</em> inputs, so under backpressure alignment time explodes. <strong>Unaligned checkpoints</strong> (<code>enableUnalignedCheckpoints()</code>) let barriers overtake buffered in-flight data and snapshot that in-flight data as part of the checkpoint, so checkpoint time is decoupled from backpressure. Cost: larger checkpoints (in-flight data stored). Use unaligned when backpressure is real; keep aligned when state is huge and backpressure rare.`,
    config: ['execution.checkpointing.unaligned', 'execution.checkpointing.timeout', 'execution.checkpointing.aligned-checkpoint-timeout'],
    snippet: 'checkpoint_config', anchor: { incident: 'DEFECT-6' },
  },
  {
    id: 'cp-exactly-once-mechanics', module: 'm12', concept: 'checkpointing', difficulty: 'hard',
    scenario: 'A TaskManager running R-4471 is reclaimed at trip minute 9.',
    breaks: 'Confusing "checkpoint" with "no data replay" — exactly-once means exactly-once STATE effect, achieved by rewinding sources and replaying.',
    answer: `Flink uses Chandy-Lamport barriers: the JobManager injects a barrier into sources; as it flows, each operator snapshots state to durable storage (S3). On the TM loss, Flink restores all operators to the last complete checkpoint and <strong>rewinds the Kafka source to the checkpointed offsets</strong>, replaying ~37s of events. State effects are exactly-once because the restored state + replay reconstruct the exact pre-crash position; external side effects need a transactional/idempotent sink (see eos cases).`,
    config: ['CheckpointingMode.EXACTLY_ONCE', 'execution.checkpointing.interval'],
    snippet: 'checkpoint_config', anchor: { incident: 'DEFECT-4' },
  },

  // ---------------- Savepoints (m13) ----------------
  {
    id: 'sp-uid-rescale', module: 'm13', concept: 'savepoints', difficulty: 'hard',
    scenario: 'Traffic doubles; you rescale R-4471’s job from parallelism 16 → 48 via a savepoint, and also ship a small code change.',
    breaks: 'No explicit uid() → Flink auto-generates operator IDs from the graph; the code change shifts them and the restore fails to map state. Also, rescaling past maxParallelism is impossible.',
    answer: `Two rules. (1) Set a stable <code>uid()</code> on every stateful operator so savepoint state maps back across code changes — auto-generated IDs break on topology edits. (2) Rescaling redistributes <strong>key groups</strong>; you can rescale up to but not beyond <code>pipeline.max-parallelism</code> (key-group count), which is fixed at first run — so set it high (e.g. 720) up front. Flow: <code>flink stop --savepointPath …</code> then <code>flink run -s … -p 48</code>.`,
    config: ['uid()', 'pipeline.max-parallelism', 'flink stop --savepointPath'],
    snippet: 'savepoint_uid', anchor: { stage: 'JOB_UPGRADE' },
  },
  {
    id: 'sp-vs-cp', module: 'm13', concept: 'savepoints', difficulty: 'easy',
    scenario: 'You need to (a) survive a crash and (b) do a planned upgrade of R-4471’s job.',
    breaks: 'Treating them as interchangeable — checkpoints are owned/cleaned by Flink and may be incremental/format-specific; relying on one for a planned migration is fragile.',
    answer: `<strong>Checkpoint</strong> = automatic, periodic, owned by Flink, optimized for fast recovery (often incremental, may be deleted on cancel). <strong>Savepoint</strong> = user-triggered, self-contained, canonical format, meant for planned ops: upgrades, rescaling, A/B migration, cluster moves. Mental model: checkpoint = automatic recovery backup; savepoint = deliberate, portable snapshot you manage.`,
    config: ['RETAIN_ON_CANCELLATION', 'state.savepoints.dir'],
    anchor: { stage: 'JOB_UPGRADE' },
  },

  // ---------------- Fault tolerance / exactly-once sink (m14) ----------------
  {
    id: 'eos-duplicate-charge', module: 'm14', concept: 'exactly-once', difficulty: 'hard',
    scenario: 'The billing DB times out writing R-4471’s ₹523.50 charge; the job restarts from checkpoint and re-emits PAYMENT_COMPLETED.',
    breaks: 'At-least-once + non-idempotent sink = the rider is charged twice. Checkpointing alone does NOT prevent duplicate external side effects.',
    answer: `Exactly-once <em>end-to-end</em> needs a transactional or idempotent sink. Two real options: (1) <strong>Kafka transactional sink</strong> (<code>DeliveryGuarantee.EXACTLY_ONCE</code>) — Flink’s 2-phase commit: pre-commit on checkpoint, commit on checkpoint-complete; a replay aborts the uncommitted txn. (2) <strong>Upsert sink keyed by ride_id</strong> — a replayed charge overwrites instead of inserting. For payments, prefer the idempotent PK upsert; it’s simpler and robust to partial failures.`,
    config: ['DeliveryGuarantee.EXACTLY_ONCE', 'transaction.timeout.ms', 'PRIMARY KEY ... NOT ENFORCED'],
    snippet: 'kafka_sink_eos', anchor: { incident: 'DEFECT-5' },
  },
  {
    id: 'eos-txn-timeout-trap', module: 'm14', concept: 'exactly-once', difficulty: 'hard',
    scenario: 'Under load, checkpoints for R-4471 occasionally take 11 minutes; the Kafka EOS sink uses default transaction timeout.',
    breaks: 'If a Kafka transaction outlives transaction.timeout.ms, the broker aborts it → committed-but-rolled-back data = data loss; if the prefix/timeout is misconfigured you get duplicates on restart.',
    answer: `The subtle EOS pitfall: Flink commits the sink transaction only when a checkpoint completes, so <code>transaction.timeout.ms</code> must be <strong>larger than your worst-case checkpoint interval</strong> (here &gt; 11 min) — but also <strong>≤ the broker’s</strong> <code>transaction.max.timeout.ms</code> (default 15 min) or the producer is rejected. Set it to 15 min on both. Also keep a unique <code>transactionalIdPrefix</code> per sink so recovering jobs fence zombie producers.`,
    config: ['transaction.timeout.ms', 'transaction.max.timeout.ms', 'transactionalIdPrefix'],
    snippet: 'kafka_sink_eos', anchor: { incident: 'DEFECT-5' },
  },
  {
    id: 'eos-twophase-pyflink', module: 'm14', concept: 'exactly-once', difficulty: 'medium',
    scenario: 'You want a custom 2-phase-commit sink to a service that isn’t Kafka or JDBC, in PyFlink.',
    breaks: 'Reaching for TwoPhaseCommitSinkFunction in Python — it doesn’t exist there.',
    answer: `A custom <code>TwoPhaseCommitSinkFunction</code> is <strong>Java/Scala only</strong>. In PyFlink the honest paths are: compose built-in transactional/idempotent sinks (KafkaSink EXACTLY_ONCE, JDBC upsert by PK), or make the downstream write idempotent (dedupe by ride_id/payment_id). If you genuinely need bespoke 2PC semantics, implement that sink in Java and call it, or push idempotency to the external system. Stating this trade-off is itself a senior-level answer.`,
    config: ['KafkaSink EXACTLY_ONCE', 'JDBC upsert PK'],
    snippet: 'two_phase_commit_workaround',
  },

  // ---------------- Backpressure (m15) ----------------
  {
    id: 'bp-detect', module: 'm15', concept: 'backpressure', difficulty: 'medium',
    scenario: 'R-4471’s pipeline lags; consumer offset grows and latency climbs.',
    breaks: 'Guessing the bottleneck instead of reading the metrics; "add parallelism" blindly often doesn’t help if the sink is the choke.',
    answer: `Diagnose with metrics, don’t guess. Flink’s web UI colors backpressured tasks; programmatically read <code>busyTimeMsPerSecond</code> (≈1000 = saturated) and <code>backPressuredTimeMsPerSecond</code> per subtask. Walk the DAG from the sink upstream: the <strong>first</strong> task that is busy≈1000 while its downstream is backpressured is the bottleneck. Flink’s credit-based flow control propagates backpressure upstream to the source so nothing is dropped — the source just reads slower.`,
    config: ['busyTimeMsPerSecond', 'backPressuredTimeMsPerSecond', 'taskmanager.network.memory.buffer-debloat.enabled'],
    anchor: { incident: 'DEFECT-6' },
  },
  {
    id: 'bp-skew-vs-sink', module: 'm15', concept: 'backpressure', difficulty: 'hard',
    scenario: 'One subtask is at busy≈1000 during the airport surge while its siblings idle.',
    breaks: 'Treating data skew like a slow sink: scaling parallelism won’t fix a hot key — the hot key still lands on one subtask.',
    answer: `Two different root causes, two different fixes. <strong>Slow sink</strong> (all subtasks backpressured evenly) → speed up or batch the sink, or increase sink parallelism. <strong>Data skew</strong> (one subtask hot, rest idle — the airport cell) → the fix is key redesign, not more slots: two-phase (local/global) aggregation that salts the hot key across N buckets, pre-aggregates, then strips the salt and combines. Diagnose by comparing per-subtask records-in before changing anything.`,
    config: ['two-phase aggregation', 'numRecordsInPerSecond (per subtask)'],
    snippet: 'hot_key_two_phase', anchor: { incident: 'DEFECT-6' },
  },

  // ---------------- Parallelism (m05) ----------------
  {
    id: 'par-hot-key', module: 'm05', concept: 'parallelism', difficulty: 'hard',
    scenario: 'The RGIA airport s2 cell carries 40x normal demand; keyBy(s2_cell_id) sends it all to one subtask.',
    breaks: 'keyBy distributes by key hash, not by load — one hot key = one hot subtask no matter how many slots you add.',
    answer: `keyBy hashes each key to a key group, and key groups map to subtasks, so a single hot key cannot be spread by adding parallelism. Fix with <strong>two-phase aggregation</strong>: phase 1 keys by <code>cell#salt</code> (salt ∈ 0..31) to spread load and pre-aggregate; phase 2 strips the salt and re-aggregates per real cell. This is the canonical hot-key mitigation and converts one hot subtask into 32 balanced ones.`,
    config: ['two-phase aggregation', 'pipeline.max-parallelism'],
    snippet: 'hot_key_two_phase', anchor: { incident: 'DEFECT-6' },
  },
  {
    id: 'par-keygroups-rescale', module: 'm05', concept: 'parallelism', difficulty: 'medium',
    scenario: 'You set parallelism 16 at launch; six months later you need 48.',
    breaks: 'maxParallelism defaults from initial parallelism; if it was fixed low, you literally cannot scale past it without a state-rebuild.',
    answer: `Parallelism (runtime subtask count) is distinct from <strong>maxParallelism</strong> = the number of <em>key groups</em>, the atomic unit of state redistribution, fixed at first run. You can rescale freely up to maxParallelism but never beyond it without reprocessing from scratch. Always set <code>pipeline.max-parallelism</code> generously (e.g. 720) up front — it’s cheap and future-proofs rescaling.`,
    config: ['pipeline.max-parallelism', 'parallelism.default'],
    snippet: 'bootstrap_env', anchor: { stage: 'JOB_UPGRADE' },
  },

  // ---------------- Operators / data flow (m06/m07) ----------------
  {
    id: 'op-enrich-async', module: 'm07', concept: 'operators', difficulty: 'hard',
    scenario: 'Each R-4471 event must be enriched with the driver’s rating/vehicle from a profile store.',
    breaks: 'A synchronous per-event lookup serializes on network latency and tanks throughput; and PyFlink has no async-I/O operator.',
    answer: `In Java you’d use <strong>Async I/O</strong> (RichAsyncFunction) to overlap many in-flight lookups. In PyFlink that operator doesn’t exist — the idiomatic path is a <strong>Table API lookup join</strong> against the driver-profile table, which the planner batches and caches (<code>lookup.cache=PARTIAL</code>). For point-in-time correctness use a temporal join (<code>FOR SYSTEM_TIME AS OF</code>). Naming this Java/PyFlink gap is the senior move.`,
    config: ['lookup.cache', 'lookup.partial-cache.max-rows', 'FOR SYSTEM_TIME AS OF'],
    snippet: 'async_io_workaround', anchor: { stage: 'DRIVER_ASSIGNED' },
  },
  {
    id: 'op-dedup', module: 'm06', concept: 'operators', difficulty: 'medium',
    scenario: 'An at-least-once upstream occasionally double-produces R-4471 events after a producer retry.',
    breaks: 'Double-counting demand/distance if you don’t dedupe.',
    answer: `Dedupe with keyed state: key by a natural idempotency key (ride_id+event_type+event_time or an event UUID), keep a <code>ValueState</code> "seen" flag with TTL, and drop repeats. In SQL, the equivalent is <code>ROW_NUMBER() OVER (PARTITION BY id ORDER BY proc_time) = 1</code> (deduplication pattern). TTL bounds the state so the "seen" set doesn’t grow forever.`,
    config: ['ValueState + StateTtlConfig', 'ROW_NUMBER() dedup'],
    snippet: 'keyed_state_wait_time',
  },

  // ---------------- Connectors / SQL (m16/m17) ----------------
  {
    id: 'conn-offset-commit', module: 'm16', concept: 'connectors', difficulty: 'medium',
    scenario: 'When does R-4471’s KafkaSource commit offsets, and what if the job crashes before that?',
    breaks: 'Assuming offsets commit per-record; they don’t — committing early would lose data on crash.',
    answer: `The unified <code>KafkaSource</code> commits offsets back to Kafka <strong>only on a completed checkpoint</strong> — and those committed offsets are for monitoring; the real source of truth is the offsets stored <em>in the checkpoint</em>. On crash, Flink restores from the checkpoint and rewinds to the checkpointed offsets, replaying anything after. This coupling of offset-commit to checkpoint is what makes the source side exactly-once.`,
    config: ['KafkaOffsetsInitializer.committedOffsets', 'execution.checkpointing.interval'],
    snippet: 'kafka_source', anchor: { stage: 'RIDE_REQUESTED' },
  },
  {
    id: 'sql-surge-cep', module: 'm17', concept: 'flink-sql', difficulty: 'hard',
    scenario: 'Detect a surge onset: 3 consecutive rising per-minute demand counts in one cell — in PyFlink.',
    breaks: 'Reaching for the DataStream CEP library in Python — it’s JVM-only.',
    answer: `The DataStream CEP library (Pattern API) is Java/Scala only. In PyFlink, express pattern detection as SQL <code>MATCH_RECOGNIZE</code> run through the Table API: <code>PATTERN (RISE{3})</code> with <code>DEFINE RISE AS RISE.demand &gt; PREV(RISE.demand)</code> over demand rows partitioned by cell and ordered by window_end. This is the real, supported Python path for CEP and runs on the same cluster.`,
    config: ['MATCH_RECOGNIZE', 'TableEnvironment.sql_query'],
    snippet: 'sql_surge_match_recognize', anchor: { incident: 'DEFECT-6' },
  },
];

// group helper: cases by module
export function casesByModule(id) {
  return INTERVIEW_CASES.filter((c) => c.module === id);
}
// group helper: cases by concept
export function casesByConcept(concept) {
  return INTERVIEW_CASES.filter((c) => c.concept === concept);
}

export default INTERVIEW_CASES;
