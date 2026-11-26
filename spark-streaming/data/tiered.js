// B5 · Tiered Answers — the same question answered at junior / mid / senior depth.
// Shape: { m, q, junior, mid, senior }
export const TIERED = [
  { m: 'm08', q: 'What is a watermark?',
    junior: 'A way to handle late data — events older than the watermark are considered too late and dropped.',
    mid: 'A moving event-time threshold equal to max(event time seen) − a configured delay. Rows with event time below it are late. It\'s monotonic and lets Spark finalize windows and evict state.',
    senior: 'The watermark is the mechanism that makes event-time processing tractable over unbounded data: watermark = max(observed event time) − allowed lateness, monotonic by construction. It bounds state (eviction once it passes a window/key end), gates append-mode emission and outer-join nulls, and with multiple inputs is the min across them (so the slowest source gates the pipeline). You size the delay to real p99 out-of-orderness — a correctness/latency/state three-way tradeoff.' },

  { m: 'm16', q: 'How does Structured Streaming achieve exactly-once?',
    junior: 'It uses checkpoints so if it crashes it can recover without losing data.',
    mid: 'Offsets are written to a log before processing and a commit log after the sink write. On restart, an offset-logged-but-uncommitted batch is replayed. With a transactional sink that replaces by batch id, replays don\'t duplicate.',
    senior: 'End-to-end exactly-once is a contract across four legs: a replayable source (re-serve the same offsets), deterministic reprocessing, a transactional or idempotent sink (commit a batch id once), and the offset-log-before / commit-log-after protocol in the checkpoint. Remove any leg — e.g. an append-only sink — and you degrade to at-least-once (no loss, possible duplicates). It\'s correctness, not latency, and it hinges on the sink as much as the engine.' },

  { m: 'm12', q: 'Explain the output modes.',
    junior: 'Append adds new rows, complete rewrites everything, update changes rows.',
    mid: 'Append emits only finalized rows that never change (closed windows at the watermark). Update emits only rows that changed this batch. Complete re-emits the whole result and never evicts state.',
    senior: 'Output mode governs which result-table rows are written and whether state can evict. Append = finalized rows only (needs a watermark for windowed aggregations; the default, widely supported). Update = changed rows per batch (ideal for live dashboards). Complete = entire result each batch, retaining all state (only for small, fully-recomputable results). The choice follows intent: append to immutable stores, update to low-latency views.' },

  { m: 'm18', q: 'How does a stream-stream join work?',
    junior: 'It joins two streams on a key, like a normal join.',
    mid: 'Both streams are buffered in keyed state. A new row on either side probes the other side\'s buffer for matches within a time range. A watermark + time bound let old rows evict.',
    senior: 'It symmetrically buffers both inputs in keyed state and matches on an equality key plus a mandatory time-range constraint; matches emit immediately on either side\'s arrival. The time bound + per-side watermark (join watermark = their min) make state finite by permitting eviction once no future match is possible. Outer-join nulls are deliberately delayed to eviction time. State ≈ both sides\' rows within the window, so the window width is the dominant memory lever.' },

  { m: 'm05', q: 'What is the micro-batch model?',
    junior: 'Spark processes the stream in small batches instead of one record at a time.',
    mid: 'The stream is executed as a series of small bounded batch jobs, each reading a fixed offset range chosen by the trigger. It reuses the batch engine and checkpoints per batch.',
    senior: 'Micro-batch turns an unbounded stream into a sequence of bounded batch jobs, each over a planned offset range. It amortizes checkpoint/offset-log overhead across many records, reuses Catalyst and whole-stage codegen, and yields clean transactional exactly-once — at the cost of batch-interval latency. The trigger (processingTime / availableNow / once / continuous) decides batch cadence; it\'s the default because throughput and EOS usually beat raw per-event latency.' },

  { m: 'm10', q: 'How is state managed?',
    junior: 'Spark remembers aggregation results between batches in a state store.',
    mid: 'Keyed state lives in a versioned, checkpointed state store sharded across executors. The watermark drives eviction so state stays bounded. RocksDB is used for large state.',
    senior: 'Stateful operators keep per-key state in a versioned state store (HDFS- or RocksDB-backed), checkpointed each batch for fault tolerance. The watermark governs eviction (once it passes a window/key end). Size is driven by key cardinality, window width, and watermark delay; the shuffle-partition count fixes state parallelism and is immutable against a checkpoint. Unbounded state (missing watermark, wide join window, high cardinality) is the #1 production failure.' },

  { m: 'm09', q: 'What window types exist?',
    junior: 'Tumbling, sliding, and session windows.',
    mid: 'Tumbling = fixed non-overlapping. Sliding = fixed size advancing by a smaller slide (overlapping). Session = dynamic, closing after an inactivity gap.',
    senior: 'Three: tumbling (fixed, non-overlapping — one window per event), sliding (fixed size, smaller slide → overlapping, an event in several), and session (dynamic, keyed, expanding with activity and closing after a gap timeout). All are [start, end) half-open and finalize via the watermark. Choice follows the metric: tumbling for periodic buckets, sliding for rolling windows, session for activity bursts.' },

  { m: 'm15', q: 'What is in a checkpoint?',
    junior: 'Information Spark needs to recover after a crash.',
    mid: 'The offset log (what was read), the commit log (what completed), the state store, and query metadata — all in the checkpointLocation directory.',
    senior: 'The checkpoint is the durable record that makes a query recoverable and exactly-once: the offset log (WAL of per-batch input ranges, written before processing), the commit log (written after durable sink writes), the state store snapshots/changelog, and query metadata. It also encodes state schema — aggregation keys, window definitions, and state parallelism can\'t change against it. One per query; treat it as critical, backed-up state.' },

  { m: 'm04', q: 'How are Kafka offsets managed?',
    junior: 'Spark keeps track of where it read up to.',
    mid: 'Spark stores offsets in its own checkpoint (offset log), not in Kafka consumer groups. startingOffsets is only used for a brand-new query.',
    senior: 'Offsets live in Spark\'s checkpoint, decoupled from Kafka consumer-group commits — each batch\'s range is written to the offset log before processing for deterministic replay. startingOffsets (latest/earliest/explicit) seeds only a fresh query; thereafter recovery resumes from the offset log. failOnDataLoss controls behavior when retention deletes expected offsets.' },

  { m: 'm20', q: 'My stateful job is slow and memory-heavy. What do you tune?',
    junior: 'Add more memory or executors.',
    mid: 'Check state size, switch to the RocksDB state store, tighten the watermark, and cap intake with maxOffsetsPerTrigger.',
    senior: 'Diagnose first via stateOperators (rows/memory) and batchDuration vs trigger. Levers in order of impact: tighten the watermark and any join time window (biggest state reducers), move to RocksDB (off-heap, less GC), right-size shuffle partitions up front, cap intake with maxOffsetsPerTrigger, prune columns/pre-filter, and compact small files downstream. Only then scale hardware.' },

  { m: 'm13', q: 'How do you deduplicate a stream?',
    junior: 'Use dropDuplicates on the id column.',
    mid: 'dropDuplicates works but keeps unbounded state; dropDuplicatesWithinWatermark bounds it to the watermark window.',
    senior: 'dropDuplicates(keys) must retain every seen key forever to catch future duplicates → unbounded state. Prefer dropDuplicatesWithinWatermark(keys) with a watermark, which bounds the seen-key set to the lateness horizon and keeps the first occurrence. Pick keys carefully (high cardinality grows state) and size the watermark to the real duplicate-arrival gap.' },

  { m: 'm17', q: 'Stream-static vs stream-stream join?',
    junior: 'One joins a stream to a table, the other joins two streams.',
    mid: 'Stream-static joins a stream to a re-read static table (no state, no watermark) for enrichment. Stream-stream joins two live streams and needs a time bound + watermark on both sides.',
    senior: 'Stream-static: the static side is re-read per batch, holds no streaming state, needs no watermark, and only the stream drives output — ideal for dimension/enrichment lookups. Stream-stream: both sides are unbounded, buffered symmetrically in keyed state, requiring an equality key + time-range constraint + watermarks to stay finite, with matches arriving on either side and outer nulls delayed to eviction. The latter is the heavy, carefully-bounded one.' },

  { m: 'm07', q: 'Event time vs processing time?',
    junior: 'Event time is when it happened; processing time is when Spark sees it.',
    mid: 'Event time (embedded in data) gives correct results despite delays/out-of-order arrival; processing time (wall clock) is simpler but wrong for analytics when data is late.',
    senior: 'Event time is the honest clock embedded in the event; processing time is when Spark handles it. Correct windowed analytics must use event time plus watermarks to tolerate out-of-order and late arrival deterministically. Processing time is acceptable only when ordering/latency don\'t affect correctness (e.g. pure pass-through). The gap between them is exactly what watermarks manage.' },

  { m: 'm22', q: 'Walk me through an end-to-end pipeline.',
    junior: 'Read from Kafka, do some aggregation, write to a table, with a checkpoint.',
    mid: 'Read a source → parse + set a watermark → windowed aggregation and/or joins in stateful operators → write to a transactional sink with a checkpoint and a trigger. The checkpoint gives recovery and exactly-once.',
    senior: 'A single query graph: replayable source → parse/withWatermark → stateful operators (windowed aggregations, stream-stream joins) sharing one global (min) watermark → transactional sink, all under one checkpoint (offset log before, commit log after, state store). The trigger sets cadence; exactly-once comes from replayable source + deterministic reprocess + transactional sink + the log protocol. Evolving a stateful operator needs a new checkpoint; the slowest source gates eviction for the whole graph.' },

  { m: 'm06', q: 'What is continuous processing?',
    junior: 'A low-latency mode that processes records one at a time.',
    mid: 'An experimental mode giving ~1 ms latency with at-least-once guarantees and a limited set of supported operations, versus micro-batch\'s higher latency but stronger guarantees.',
    senior: 'Continuous processing trades micro-batch\'s batch-interval latency for ~millisecond latency by processing records individually with periodic epoch-based offset commits. The costs: at-least-once semantics, a restricted operator set (no complex stateful ops), and fewer source/sink integrations. Reserve it for simple ultra-low-latency map/filter paths; use micro-batch for anything stateful or requiring exactly-once.' },

  { m: 'm21', q: 'How do you monitor a streaming query?',
    junior: 'Check the Spark UI to see if it is running.',
    mid: 'Use query.lastProgress (StreamingQueryProgress) for input rows, rates, batch duration, watermark, and state stats, and a StreamingQueryListener to push metrics to alerting.',
    senior: 'StreamingQueryProgress (lastProgress/recentProgress) exposes numInputRows, input vs processed rates, batchDuration, watermark, and per-operator stateOperators (rows/memory). The health signals: batchDuration must stay under the trigger interval; input rate must not exceed processed rate; state row counts must plateau; numRowsDroppedByWatermark flags a too-tight watermark. A StreamingQueryListener (onQueryProgress) streams these to monitoring/alerting for lag and state-growth alarms.' },
];
