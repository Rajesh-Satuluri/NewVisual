// Gate 7 (I71–I72) — Interview Master question bank.
// Categories across the whole curriculum. Each question carries a concise model
// answer; many include a two-level depth toggle (core vs senior nuance).
// Technically careful: exactly-once never overstated; no invented numbers.

export const CATEGORIES = [
  { id: 'fund', label: 'Fundamentals', icon: '🧱' },
  { id: 'kafka', label: 'Kafka', icon: '📨' },
  { id: 'flink', label: 'Flink', icon: '🌀' },
  { id: 'cloud', label: 'Cloud', icon: '☁️' },
  { id: 'design', label: 'System design', icon: '📐' },
];

export const QUESTIONS = [
  // ── Fundamentals ────────────────────────────────────────────────
  { cat: 'fund', q: 'What is the difference between event time and processing time?',
    a: 'Event time is when the event actually happened (carried in the record); processing time is when the system observes it. They diverge because of network delay, retries, and buffering, so correct time-based results use event time.',
    senior: 'Event time makes results deterministic and reprocessable; processing time is easier but non-deterministic. Event-time processing requires watermarks to reason about completeness and to bound state.' },
  { cat: 'fund', q: 'What is a watermark and what two things does it control?',
    a: 'A watermark is a moving threshold = max observed event time − allowed lateness. It controls (1) when windowed/stateful results finalize and (2) how long state is retained (older state is evicted).',
    senior: 'With multiple inputs the engine tracks a single global watermark driven by the slowest source, so one lagging input holds back all stateful finalization — a common source of "nothing is emitting" incidents.' },
  { cat: 'fund', q: 'Explain the delivery guarantees: at-most-once, at-least-once, exactly-once.',
    a: 'At-most-once: may drop, never duplicates. At-least-once: never drops, may duplicate. Exactly-once (effectively-once): each event reflected once in the result.',
    senior: 'Exactly-once is a property of source + engine + sink together: a replayable source, checkpointed offsets/state, and an idempotent/transactional sink. The checkpoint alone only guarantees correct replay — the sink must make replay harmless.' },
  { cat: 'fund', q: 'Why is a partition (or shard) the unit of both parallelism and ordering?',
    a: 'Each partition is an independent ordered log consumed by one worker at a time within a group. Order holds within a partition; parallelism scales with partition count. Cross-partition order is not guaranteed.',
    senior: 'This is why key choice matters: same key → same partition → preserved per-key order, but a skewed key creates a hot partition that caps throughput at single-worker speed.' },
  { cat: 'fund', q: 'What is backpressure and how does a healthy system respond?',
    a: 'Backpressure is when input outpaces processing; lag grows. A healthy system propagates the slowdown upstream (slows consumption) rather than buffering unboundedly or dropping data.',
    senior: 'Watch consumer lag trend, not instantaneous value: steadily rising lag at normal input means throughput < input and you must scale out or optimize the hot path; retention becomes a data-loss risk if lag approaches it.' },
  { cat: 'fund', q: 'Tumbling vs sliding vs session windows?',
    a: 'Tumbling: fixed, non-overlapping buckets (each event in one). Sliding: fixed size with a smaller slide, overlapping (each event in several). Session: gap-based, variable length, closes after inactivity.',
    senior: 'Sliding windows cost more state because of overlap; session windows need per-key timeout state. All are bounded by the watermark, which decides when each closes.' },

  // ── Kafka ───────────────────────────────────────────────────────
  { cat: 'kafka', q: 'How does Kafka achieve exactly-once semantics?',
    a: 'Via idempotent producers (dedup by producer id + sequence number) and transactions (atomic writes across partitions + consumer offset commit), enabling exactly-once for read-process-write within Kafka.',
    senior: 'EOS is scoped to Kafka-to-Kafka read-process-write. Writing to an external non-transactional system is not covered — you still need idempotency there. Transactions add latency and require careful isolation-level config on consumers (read_committed).' },
  { cat: 'kafka', q: 'What is a consumer group and how are partitions assigned?',
    a: 'A consumer group shares the partitions of the subscribed topics so work scales out. Each partition is assigned to exactly one consumer in the group; more consumers than partitions leaves some idle.',
    senior: 'Membership changes trigger rebalances. Prefer cooperative/incremental rebalancing and static membership to avoid stop-the-world pauses and reprocessing on scale events.' },
  { cat: 'kafka', q: 'What does the replication factor give you, and what is the ISR?',
    a: 'Replication factor N keeps N copies of each partition on different brokers for durability. The ISR (in-sync replicas) are the replicas caught up to the leader; a message is committed once the required in-sync replicas have it.',
    senior: 'acks=all + min.insync.replicas ensures a write is on enough replicas before acknowledging, trading latency for durability. Unclean leader election trades durability for availability — usually disabled for correctness.' },
  { cat: 'kafka', q: 'How do you preserve ordering while scaling throughput?',
    a: 'Order is per partition, so choose a partition key that groups events needing order (e.g. the same entity). Scale by adding partitions, accepting that order holds only within a key.',
    senior: 'Repartitioning changes key→partition mapping and can break ordering for in-flight keys; plan partition count ahead. For a hot key, salting restores parallelism but requires downstream re-aggregation to recover per-key order.' },

  // ── Flink ───────────────────────────────────────────────────────
  { cat: 'flink', q: 'How does Flink provide exactly-once?',
    a: 'Through asynchronous distributed snapshots (checkpoints via the Chandy-Lamport-style barrier algorithm) of operator state + source offsets. On failure it restores the last complete checkpoint and replays from those offsets.',
    senior: 'End-to-end exactly-once also needs sinks that participate: either idempotent writes or a two-phase-commit transactional sink aligned to checkpoints. Without that, Flink is exactly-once internally but at-least-once at the sink.' },
  { cat: 'flink', q: 'What is keyed state and where does it live?',
    a: 'State scoped to a key (e.g. per entity): counters, window contents, join buffers. It is partitioned by key across tasks and backed by a state backend; the RocksDB backend keeps it off-heap on disk for large state.',
    senior: 'RocksDB enables incremental checkpoints and very large state at some per-access latency cost; the heap backend is faster but memory-bound. State is checkpointed for recovery and bounded via time-to-live / watermarks.' },
  { cat: 'flink', q: 'Difference between a checkpoint and a savepoint?',
    a: 'Both are consistent snapshots. Checkpoints are automatic, periodic, for fault recovery (and may be cleaned up). Savepoints are user-triggered, retained, for planned operations: upgrades, rescaling, code changes.',
    senior: 'Savepoints are the mechanism for stateful application lifecycle: stop-with-savepoint then resume on new code/parallelism. Some state-schema changes are incompatible and require state migration.' },
  { cat: 'flink', q: 'How does Flink handle late events?',
    a: 'Watermarks define lateness; events past the allowed lateness are dropped from windows by default, or can be sent to a side output for separate handling. Allowed lateness can keep a window updatable for a grace period.',
    senior: 'There is a trade-off: longer allowed lateness means larger retained state and later finalization. Side outputs let you capture dropped-late events for audit/reconciliation instead of losing them silently.' },

  // ── Cloud ───────────────────────────────────────────────────────
  { cat: 'cloud', q: 'Kinesis Data Streams vs Amazon MSK — when each?',
    a: 'Kinesis: AWS-native, low-ops, shard-based, tight Lambda/Firehose integration. MSK: managed Apache Kafka when you need the Kafka API/ecosystem (Connect, Streams, Schema Registry) or portability.',
    senior: 'Kinesis scales by shards (1 MB/s write, 2 MB/s read shared per shard). MSK gives full Kafka semantics incl. transactions/EOS. Choose by ecosystem lock-in tolerance, team Kafka skills, and per-throughput cost at scale.' },
  { cat: 'cloud', q: 'What is an Event Hubs Throughput Unit, and how do you scale?',
    a: 'A Standard Throughput Unit allows up to 1 MB/s or 1,000 events/s ingress and up to 2 MB/s egress, shared across the namespace. Scale by adding TUs (Auto-inflate) or moving to Premium (PUs) / Dedicated (CUs).',
    senior: 'Partitions set at creation cannot be decreased and cap consumer parallelism; TUs are a separate throughput lever. Event Hubs exposes a Kafka-protocol endpoint, so the Kafka client works against it.' },
  { cat: 'cloud', q: 'Why is Databricks Structured Streaming "micro-batch by default"?',
    a: 'It processes data in small batches on a trigger interval rather than one event at a time, reusing Spark\'s engine so batch and streaming share one API. A separate real-time mode exists for sub-second needs.',
    senior: 'OSS continuous mode is not supported on Databricks; use processingTime="0 seconds" for lowest micro-batch latency or real-time mode for operational sub-second. availableNow replaced the deprecated Trigger.Once for incremental batch.' },
  { cat: 'cloud', q: 'How does the medallion architecture work and why layer it?',
    a: 'Bronze (raw, append-only, full history) → silver (cleaned, deduped, conformed) → gold (aggregated, business-facing). Each layer is a Delta table streamed into the next; quality rises left to right.',
    senior: 'Keeping raw bronze means you can reprocess when a cleaning bug or new requirement appears. Delta-to-Delta hops are exactly-once; bronze/silver are typically streaming tables, gold often materialized views for correct aggregates.' },

  // ── System design ───────────────────────────────────────────────
  { cat: 'design', q: 'Design a real-time fraud-detection pipeline. What are the key decisions?',
    a: 'Ingest events into a replayable log (Kafka/Kinesis) keyed by entity for order; process with a stateful engine (Flink) doing windowed/keyed scoring; serve low-latency lookups; land raw to a lakehouse for retraining.',
    senior: 'Key trade-offs: watermark lateness vs detection latency; per-key state size (bound with TTL/RocksDB); exactly-once only where it matters (scoring can tolerate at-least-once with idempotent actions); hot-key mitigation; and a replay path for model updates.' },
  { cat: 'design', q: 'How would you guarantee no double-charge in an order pipeline?',
    a: 'Key by order id to preserve per-order ordering; make the payment step idempotent (dedupe on order/transaction id); use a transactional or idempotent sink so replays after failure cannot re-charge.',
    senior: 'Treat the external payment gateway edge as at-least-once and enforce idempotency keys there. Use the saga/outbox pattern for cross-service consistency; reconcile with the raw log; test under forced failover to prove no duplicate side effects.' },
  { cat: 'design', q: 'Choose between micro-batch and per-event processing for a use case.',
    a: 'Per-event (Flink) for sub-second latency and complex event processing. Micro-batch (Databricks) for analytics/lakehouse integration, SQL-first teams, and when seconds of latency are acceptable.',
    senior: 'Consider operational model (managed lakehouse vs streaming cluster), exactly-once story (Delta-to-Delta vs transactional sinks), state size, and team skills. Latency SLO is the first filter; cost and ecosystem usually decide the rest.' },
  { cat: 'design', q: 'How do you size partitions/shards for a target throughput?',
    a: 'Compute ingress = events/s × avg size. Divide by a per-partition target (your planning number) for Kafka, or by the 1 MB/s per-shard write cap for Kinesis. Add headroom for peaks and future growth.',
    senior: 'State assumptions explicitly (compression, headers, record-rate caps). Over-partitioning adds overhead and rebalance cost; under-partitioning caps parallelism. Remember repartitioning has ordering implications, so plan for peak + growth up front.' },
];
