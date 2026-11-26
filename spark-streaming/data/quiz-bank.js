// B1 · Quiz Bank — 100+ multiple-choice questions, module-tagged.
// Shape: { m: moduleId, q, c: [choices], a: answerIndex, e: explanation }
export const QUIZ = [
  // ── M01 Why Structured Streaming ──
  { m: 'm01', q: 'What is the core mental model of Structured Streaming?', c: ['A queue of messages', 'A stream as an unbounded, ever-growing table', 'A graph of actors', 'A set of cron jobs'], a: 1, e: 'A stream is modeled as an input table to which rows are continuously appended; your query is an incremental view over it.' },
  { m: 'm01', q: 'Structured Streaming superseded which older Spark API?', c: ['DataFrames', 'DStreams (Spark Streaming)', 'RDDs', 'GraphX'], a: 1, e: 'DStreams is the legacy RDD-based streaming API; Structured Streaming replaces it with a declarative, event-time-aware engine.' },
  { m: 'm01', q: 'A key advantage of Structured Streaming over DStreams is…', c: ['It uses less memory always', 'First-class event time and the same API as batch', 'It needs no cluster', 'It only supports SQL'], a: 1, e: 'Structured Streaming offers first-class event time/watermarks and runs the same DataFrame/SQL code as batch.' },
  { m: 'm01', q: 'In Structured Streaming you mostly write…', c: ['Imperative per-record callbacks', 'Declarative DataFrame/SQL transformations', 'Raw MapReduce', 'Bytecode'], a: 1, e: 'You write declarative queries; the engine incrementalizes them.' },

  // ── M02 Unbounded Table ──
  { m: 'm02', q: 'The "result table" in Structured Streaming is…', c: ['Written in full to disk every second', 'The conceptual output table Spark maintains and updates per batch', 'Only in Kafka', 'The same as the state store'], a: 1, e: 'Spark maintains a conceptual result table; the output mode decides which of its rows are written to the sink.' },
  { m: 'm02', q: 'What determines which rows of the result table are written out?', c: ['The trigger', 'The output mode', 'The watermark', 'The checkpoint'], a: 1, e: 'append/update/complete output modes govern which result rows are emitted each batch.' },
  { m: 'm02', q: 'Incremental execution means Spark…', c: ['Recomputes everything each batch', 'Computes only the change caused by new data', 'Caches the whole stream in RAM', 'Runs once and stops'], a: 1, e: 'The engine computes just the delta to the result from each micro-batch, not a full recompute.' },

  // ── M03 Architecture ──
  { m: 'm03', q: 'Which component plans each micro-batch and tracks offsets?', c: ['Executor', 'Driver', 'State store', 'Sink'], a: 1, e: 'The driver plans batches, manages offsets and the checkpoint, and coordinates executors.' },
  { m: 'm03', q: 'Where does per-key aggregation state physically live?', c: ['Only on the driver', 'In the state store sharded across executors', 'In Kafka', 'In the offset log'], a: 1, e: 'State is held in the state store, sharded across executors and checkpointed.' },
  { m: 'm03', q: 'Spark Structured Streaming plans queries using…', c: ['Catalyst optimizer', 'A hand-written scheduler', 'Kafka Streams DSL', 'Flink runtime'], a: 0, e: 'Catalyst plans both batch and streaming queries into incremental physical plans.' },

  // ── M04 Sources & Schema ──
  { m: 'm04', q: 'Why must a streaming source be replayable?', c: ['To reduce latency', 'So uncommitted batches can be re-read for exactly-once recovery', 'To compress data', 'For schema inference'], a: 1, e: 'Replayability lets Spark re-read the exact offsets of an uncommitted batch on restart.' },
  { m: 'm04', q: 'For a streaming file source you must…', c: ['Enable schema inference', 'Supply an explicit schema', 'Use only CSV', 'Disable checkpoints'], a: 1, e: 'Streaming requires a stable, explicit schema; inference is generally disallowed.' },
  { m: 'm04', q: 'Where does Spark store Kafka read offsets?', c: ['In Kafka consumer groups', 'In its own checkpoint (offset log)', 'In Zookeeper only', 'Nowhere'], a: 1, e: 'Spark manages offsets in its checkpoint, not via Kafka consumer-group commits.' },
  { m: 'm04', q: 'startingOffsets="latest" is ignored when…', c: ['The topic is empty', 'A checkpoint already exists (recovery resumes from offset log)', 'Using the rate source', 'maxOffsetsPerTrigger is set'], a: 1, e: 'Once a checkpoint exists, recovery resumes from the offset log regardless of startingOffsets.' },

  // ── M05 Micro-Batch & Triggers ──
  { m: 'm05', q: 'The default trigger fires a new micro-batch…', c: ['Every 1 second', 'As soon as the previous batch finishes', 'Once per hour', 'Only manually'], a: 1, e: 'With no trigger set, a batch fires as soon as the prior one completes.' },
  { m: 'm05', q: 'Which trigger processes all available data in batches then stops?', c: ['processingTime', 'availableNow', 'continuous', 'default'], a: 1, e: 'availableNow drains everything available in multiple batches, then terminates.' },
  { m: 'm05', q: 'Trigger.ProcessingTime("30 seconds") does what if a batch takes 40s?', c: ['Drops data', 'The next batch starts late; latency grows if it persists', 'Crashes', 'Switches to continuous'], a: 1, e: 'Batch duration exceeding the interval causes the query to fall behind.' },
  { m: 'm05', q: 'availableNow is preferred over Trigger.Once because…', c: ['It is faster per record', 'It processes in multiple bounded batches (better for large backlogs)', 'It needs no checkpoint', 'It supports continuous mode'], a: 1, e: 'availableNow splits the backlog into batches instead of one giant batch.' },

  // ── M06 Continuous ──
  { m: 'm06', q: 'Continuous processing mode offers…', c: ['Exactly-once with all sinks', '~1 ms latency with at-least-once and limited ops', 'Higher throughput than micro-batch', 'Automatic windowing'], a: 1, e: 'Continuous mode targets ~ms latency but is at-least-once with a restricted operation set.' },
  { m: 'm06', q: 'A limitation of continuous processing is…', c: ['No Kafka support', 'Limited supported operations (e.g. aggregations)', 'No checkpoint', 'Only Scala'], a: 1, e: 'Many stateful operations are not supported in continuous mode.' },

  // ── M07 Event vs Processing Time ──
  { m: 'm07', q: 'Event time is…', c: ['When Spark processes the record', 'When the event actually occurred (embedded in data)', 'The batch id', 'The watermark'], a: 1, e: 'Event time is the honest clock embedded in the data itself.' },
  { m: 'm07', q: 'Why prefer event time over processing time for analytics?', c: ['It is faster', 'Results stay correct despite delays and out-of-order arrival', 'It needs no watermark', 'It avoids state'], a: 1, e: 'Event time yields correct windowed results regardless of when data arrives.' },
  { m: 'm07', q: 'Out-of-order data is…', c: ['A bug you must prevent', 'Normal in distributed systems, handled via event time + watermarks', 'Impossible with Kafka', 'Only a file-source issue'], a: 1, e: 'Out-of-order arrival is expected and handled by watermarks.' },

  // ── M08 Watermarks ──
  { m: 'm08', q: 'The watermark is computed as…', c: ['current time − delay', 'max(event time seen) − delay', 'min(event time) + delay', 'batch count × delay'], a: 1, e: 'Watermark = max event time observed minus the configured delay.' },
  { m: 'm08', q: 'A row is considered "late" when…', c: ['It arrives after midnight', 'Its event time is below the current watermark', 'It is a duplicate', 'Its value is null'], a: 1, e: 'Late = event time older than the watermark threshold.' },
  { m: 'm08', q: 'The watermark is guaranteed to be…', c: ['Decreasing', 'Monotonic (never moves backward)', 'Constant', 'Random'], a: 1, e: 'By construction the watermark never decreases, even if a later batch has a smaller max event time.' },
  { m: 'm08', q: 'Setting the watermark delay too SMALL causes…', c: ['Unbounded state', 'Valid late data to be dropped', 'Slower batches', 'Duplicate output'], a: 1, e: 'Too tight a delay discards legitimately late events.' },
  { m: 'm08', q: 'Setting the watermark delay too LARGE causes…', c: ['Data loss', 'More retained state and later emission', 'Processing-time semantics', 'Checkpoint corruption'], a: 1, e: 'A large delay keeps state longer and delays window finalization.' },

  // ── M09 Windows ──
  { m: 'm09', q: 'A tumbling window is…', c: ['Overlapping fixed windows', 'Fixed-size, non-overlapping windows', 'Activity-gap based', 'Infinite'], a: 1, e: 'Tumbling windows are fixed-size and non-overlapping; each event lands in one.' },
  { m: 'm09', q: 'In a sliding window an event can…', c: ['Belong to multiple overlapping windows', 'Only belong to one window', 'Never be aggregated', 'Skip the watermark'], a: 0, e: 'Sliding windows overlap, so one event may fall into several.' },
  { m: 'm09', q: 'A session window closes after…', c: ['A fixed interval', 'A gap of inactivity exceeds the timeout', 'The batch ends', 'The checkpoint'], a: 1, e: 'Session windows expand with activity and close after an inactivity gap.' },
  { m: 'm09', q: 'Windows are represented as which interval?', c: ['(start, end]', '[start, end) half-open', '[start, end] closed', 'open on both ends'], a: 1, e: 'Window intervals are half-open [start, end).' },

  // ── M10 Stateful Aggregations ──
  { m: 'm10', q: 'State eviction is driven by…', c: ['The trigger interval', 'The watermark passing a window/key end', 'The output mode only', 'Executor memory alone'], a: 1, e: 'Once the watermark passes a window end, its state is evicted.' },
  { m: 'm10', q: 'Without a watermark, a keyed aggregation\'s state…', c: ['Is capped at 1 GB', 'Can grow unbounded', 'Is dropped each batch', 'Is read-only'], a: 1, e: 'No watermark means no eviction, so state can grow without bound.' },
  { m: 'm10', q: 'For very large state you should use…', c: ['The HDFS-backed provider', 'The RocksDB state store provider', 'Memory sink', 'Continuous mode'], a: 1, e: 'RocksDB is off-heap/disk-backed and handles large state with less GC pressure.' },

  // ── M11 Arbitrary State ──
  { m: 'm11', q: 'flatMapGroupsWithState gives you…', c: ['Automatic windowing', 'Full control of per-key state and timeouts', 'Exactly-once for free', 'A SQL interface'], a: 1, e: 'It exposes per-key state with custom logic and timeout callbacks.' },
  { m: 'm11', q: 'A state timeout is used to…', c: ['Limit batch size', 'Fire a callback to expire/emit per-key state (e.g. abandoned cart)', 'Throttle Kafka', 'Compact files'], a: 1, e: 'Timeouts let you act when a key has been idle (processing- or event-time based).' },

  // ── M12 Output Modes ──
  { m: 'm12', q: 'Append mode emits…', c: ['Every result row each batch', 'Only new, finalized rows that never change', 'Only changed rows', 'Nothing'], a: 1, e: 'Append emits rows that are final (e.g. closed windows at the watermark).' },
  { m: 'm12', q: 'Update mode is ideal for…', c: ['Immutable warehouse tables', 'A live dashboard of changing aggregates', 'One-shot batch', 'Dedup'], a: 1, e: 'Update emits only changed rows — perfect for low-latency dashboards.' },
  { m: 'm12', q: 'Complete mode…', c: ['Emits the entire result each batch and never evicts state', 'Is the default', 'Only works with Kafka', 'Drops late data'], a: 0, e: 'Complete re-emits the whole result and retains all state; only for small results.' },
  { m: 'm12', q: 'Append mode for windowed aggregation emits a window…', c: ['Immediately on first event', 'When the watermark passes its end', 'Never', 'Every batch'], a: 1, e: 'A window emits once, at finalization when the watermark crosses its end.' },

  // ── M13 Deduplication ──
  { m: 'm13', q: 'Plain dropDuplicates without a watermark…', c: ['Is impossible', 'Keeps unbounded dedup state', 'Drops all rows', 'Needs continuous mode'], a: 1, e: 'Without a watermark, the set of seen keys grows forever.' },
  { m: 'm13', q: 'dropDuplicatesWithinWatermark bounds state by…', c: ['Row count', 'The watermark window', 'Partition count', 'Trigger interval'], a: 1, e: 'It limits dedup state to the watermark horizon, keeping it finite.' },

  // ── M14 Sinks ──
  { m: 'm14', q: 'foreachBatch gives you…', c: ['(batchDF, batchId) for arbitrary/idempotent writes', 'Automatic exactly-once', 'A new source', 'Windowing'], a: 0, e: 'foreachBatch is the escape hatch: write with custom transactional/idempotent logic.' },
  { m: 'm14', q: 'The memory sink is for…', c: ['Production Kafka output', 'Debugging/interactive queries', 'Exactly-once Delta writes', 'Checkpointing'], a: 1, e: 'Memory sink writes to an in-memory table for debugging, not production.' },
  { m: 'm14', q: 'An idempotent write is one that…', c: ['Runs only once ever', 'Produces the same result if replayed (e.g. keyed by batchId)', 'Never fails', 'Skips the checkpoint'], a: 1, e: 'Idempotent writes make replays safe, enabling exactly-once on append targets.' },

  // ── M15 Checkpoint ──
  { m: 'm15', q: 'The offset log is written…', c: ['After the sink write', 'Before processing a batch', 'Only on crash', 'Never'], a: 1, e: 'Offsets are logged before processing so a crash can be replayed deterministically.' },
  { m: 'm15', q: 'The commit log marks a batch…', c: ['As started', 'As durably written to the sink (complete)', 'As late', 'As a duplicate'], a: 1, e: 'The commit log is written after results are durable, marking the batch complete.' },
  { m: 'm15', q: 'The checkpoint directory contains…', c: ['Only offsets', 'Offset log + commit log + state + metadata', 'The source data', 'The Spark jar'], a: 1, e: 'The checkpoint bundles offset log, commit log, state store, and metadata.' },
  { m: 'm15', q: 'A query with no checkpointLocation…', c: ['Runs faster', 'Cannot recover and is not exactly-once', 'Uses continuous mode', 'Auto-creates one in Kafka'], a: 1, e: 'Without a checkpoint there is no recovery and no exactly-once guarantee.' },

  // ── M16 Fault Tolerance ──
  { m: 'm16', q: 'On restart, a batch that was offset-logged but NOT committed is…', c: ['Skipped', 'Replayed from the same offsets', 'Deleted', 'Marked late'], a: 1, e: 'Uncommitted batches are replayed from their logged offsets.' },
  { m: 'm16', q: 'Exactly-once end-to-end requires all of EXCEPT…', c: ['Replayable source', 'Deterministic reprocessing', 'Transactional/idempotent sink', 'Continuous mode'], a: 3, e: 'EOS needs replayable source + deterministic reprocess + transactional sink; continuous mode is unrelated (and weaker).' },
  { m: 'm16', q: 'A crash after sink write but before commit, with an APPEND-only sink, yields…', c: ['Data loss', 'Duplicates on replay (at-least-once)', 'Exactly-once', 'A corrupt checkpoint'], a: 1, e: 'Append-only sinks re-write on replay → duplicates; transactional sinks avoid this.' },
  { m: 'm16', q: 'Exactly-once never guarantees…', c: ['No data loss', 'No duplicates with a transactional sink', 'Zero latency', 'Deterministic recovery'], a: 2, e: 'EOS is about correctness, not latency.' },

  // ── M17 Stream-Static Join ──
  { m: 'm17', q: 'In a stream-static join, the static side…', c: ['Is buffered in state', 'Holds no streaming state and needs no watermark', 'Must be a stream', 'Requires a time bound'], a: 1, e: 'The static side is re-read and keeps no state; only the stream drives output.' },
  { m: 'm17', q: 'The classic stream-static use case is…', c: ['Dedup', 'Dimension/enrichment lookup', 'Session windows', 'Checkpointing'], a: 1, e: 'Enriching streaming facts with slowly-changing dimension attributes.' },

  // ── M18 Stream-Stream Join ──
  { m: 'm18', q: 'Stream-stream joins REQUIRE…', c: ['Only an equality key', 'An equality key plus a time-range constraint and watermarks', 'Complete output mode', 'A static side'], a: 1, e: 'A time bound + watermark make the dual-side buffered state finite.' },
  { m: 'm18', q: 'The join watermark across two streams is the…', c: ['Maximum of the two', 'Minimum of the two', 'Average', 'First stream\'s'], a: 1, e: 'It is the minimum, so a slow side holds eviction back.' },
  { m: 'm18', q: 'Outer-join null rows in a stream-stream join emit…', c: ['Immediately', 'At watermark eviction (delayed)', 'Never', 'Every batch'], a: 1, e: 'Null-padded unmatched rows emit only when the watermark proves no match can arrive.' },
  { m: 'm18', q: 'Why are both sides buffered in a stream-stream join?', c: ['For compression', 'Because a match can arrive on either side at any time', 'To dedup', 'For schema evolution'], a: 1, e: 'Symmetric buffering makes matching order-independent.' },

  // ── M19 Delta & MERGE ──
  { m: 'm19', q: 'Streaming MERGE (upsert) is typically run inside…', c: ['The source', 'foreachBatch', 'The watermark', 'complete mode'], a: 1, e: 'MERGE into Delta runs per-batch via foreachBatch to maintain current-state tables.' },
  { m: 'm19', q: 'Delta Lake provides which property for streaming sinks?', c: ['Weak consistency', 'ACID transactions (transactional sink)', 'No schema', 'Processing time only'], a: 1, e: 'Delta is a transactional sink enabling exactly-once and MERGE.' },
  { m: 'm19', q: 'The "small-file problem" in streaming sinks is mitigated by…', c: ['Disabling checkpoints', 'Compaction/OPTIMIZE and tuning the trigger interval', 'Using complete mode', 'More partitions'], a: 1, e: 'Frequent tiny files are compacted and the trigger interval tuned.' },

  // ── M20 Performance ──
  { m: 'm20', q: 'Which config CANNOT be changed after a checkpoint exists?', c: ['maxOffsetsPerTrigger', 'spark.sql.shuffle.partitions (state parallelism)', 'trigger interval', 'outputMode'], a: 1, e: 'Shuffle partitions fix state parallelism; changing it breaks checkpoint compatibility.' },
  { m: 'm20', q: 'The main Kafka backpressure/batch-size lever is…', c: ['maxOffsetsPerTrigger', 'checkpointLocation', 'outputMode', 'queryName'], a: 0, e: 'maxOffsetsPerTrigger caps records read per batch.' },
  { m: 'm20', q: 'The biggest lever on stream-stream join state size is…', c: ['The sink format', 'The width of the join time window', 'The trigger', 'The number of columns'], a: 1, e: 'Narrowing the time range roughly proportionally cuts buffered state.' },

  // ── M21 Monitoring ──
  { m: 'm21', q: 'Per-batch metrics are found in…', c: ['The offset log', 'StreamingQueryProgress (lastProgress)', 'The sink', 'Zookeeper'], a: 1, e: 'lastProgress exposes input rows, rates, durations, watermark, and state stats.' },
  { m: 'm21', q: 'To diagnose growing state, inspect…', c: ['numInputRows', 'stateOperators (row counts/memory)', 'queryName', 'startingOffsets'], a: 1, e: 'stateOperators reports per-operator state size — the first stop for state growth.' },
  { m: 'm21', q: 'A healthy query keeps batch duration…', c: ['Above the trigger interval', 'Below the trigger interval', 'At exactly zero', 'Equal to the watermark'], a: 1, e: 'Batch duration must stay under the trigger interval or latency grows.' },
  { m: 'm21', q: 'To push metrics to alerting, use…', c: ['A StreamingQueryListener', 'A UDF', 'The memory sink', 'complete mode'], a: 0, e: 'StreamingQueryListener callbacks (onQueryProgress etc.) feed monitoring systems.' },

  // ── M22 Capstone ──
  { m: 'm22', q: 'In one query with a window and a join, the global watermark is…', c: ['Per-operator independent', 'The minimum across inputs, gating all eviction', 'Ignored', 'The maximum'], a: 1, e: 'One global (min) watermark drives eviction for every stateful operator.' },
  { m: 'm22', q: 'Which change is SAFE against an existing checkpoint?', c: ['Changing the aggregation keys', 'Changing the window size', 'Adding a downstream filter', 'Adding a new stateful operator'], a: 2, e: 'Filters/sinks/triggers are safe; changing keys/windows/stateful ops needs a new checkpoint.' },
  { m: 'm22', q: 'Exactly-once in the capstone comes from the combination of…', c: ['Just the checkpoint', 'Replayable source + deterministic reprocess + transactional sink + offset/commit protocol', 'The trigger alone', 'complete mode'], a: 1, e: 'All legs together produce end-to-end exactly-once; remove one and you drop to at-least-once.' },
  { m: 'm22', q: 'Why micro-batch over true per-event streaming here?', c: ['Lower latency', 'Amortizes checkpoint cost, reuses the batch optimizer, clean exactly-once', 'Simpler code only', 'No state'], a: 1, e: 'Micro-batch amortizes overhead and gives clean transactional exactly-once at batch-interval latency.' },

  // ── Cross-cutting extras to clear 100 ──
  { m: 'm08', q: 'Append-mode windowed output is impossible without…', c: ['A watermark', 'RocksDB', 'A Kafka sink', 'complete mode'], a: 0, e: 'Append needs a watermark to know when a window is final.' },
  { m: 'm12', q: 'Which output mode never evicts state?', c: ['append', 'update', 'complete', 'all do'], a: 2, e: 'Complete retains the whole result, so state is never evicted.' },
  { m: 'm05', q: 'Backfilling history through streaming code is best done with…', c: ['continuous', 'availableNow', 'complete mode', 'a new cluster'], a: 1, e: 'availableNow reprocesses a backlog in bounded batches via the same code path.' },
  { m: 'm16', q: 'A replayable source is needed because…', c: ['It compresses data', 'Recovery must re-read the exact offsets of an uncommitted batch', 'It avoids watermarks', 'It speeds up joins'], a: 1, e: 'Re-reading the same offsets is what makes deterministic replay possible.' },
  { m: 'm10', q: 'State is partitioned by…', c: ['Event time', 'The grouping key', 'Batch id', 'Offset'], a: 1, e: 'Keyed state maintains each grouping key independently.' },
  { m: 'm14', q: 'noDataMicroBatches being enabled lets…', c: ['Watermarks advance so windows close during quiet periods', 'More Kafka throughput', 'Smaller files', 'Faster joins'], a: 0, e: 'Empty batches fire so the watermark still advances and windows finalize on time.' },
  { m: 'm09', q: 'session_window(col, "5 minutes") closes a session after…', c: ['5 minutes of total duration', '5 minutes of inactivity', '5 events', '5 batches'], a: 1, e: 'The gap timeout is inactivity-based.' },
  { m: 'm04', q: 'The rate source is primarily for…', c: ['Production ingestion', 'Testing/benchmarking', 'Checkpointing', 'Dedup'], a: 1, e: 'It emits synthetic rows per second for tests and demos.' },
  { m: 'm18', q: 'A pure non-equi stream-stream join (no equality key) is…', c: ['Fully supported', 'Not supported — equality + time range required', 'Faster', 'The default'], a: 1, e: 'Stream-stream joins need an equality key plus a time range.' },
  { m: 'm20', q: 'RocksDB changelog checkpointing speeds up commits by…', c: ['Skipping the sink', 'Checkpointing only the changelog instead of full snapshots', 'Disabling the watermark', 'Using memory sink'], a: 1, e: 'It writes the changelog rather than a full snapshot each commit.' },
  { m: 'm21', q: 'numRowsDroppedByWatermark rising suggests…', c: ['The sink is slow', 'The watermark delay may be too tight', 'Too many partitions', 'A checkpoint bug'], a: 1, e: 'Dropped late rows indicate the allowed lateness might be too small.' },
  { m: 'm03', q: 'Empty (no-data) micro-batches are useful because…', c: ['They reduce cost', 'They advance the watermark so windows close in quiet periods', 'They dedup', 'They compress state'], a: 1, e: 'Watermark advancement requires batches to run even with no input.' },
  { m: 'm13', q: 'Deduplication is keyed by…', c: ['The whole row always', 'The columns you pass to dropDuplicates', 'The offset', 'The batch id'], a: 1, e: 'You choose the dedup key columns.' },
  { m: 'm17', q: 'Stream-static joins need a watermark on the static side?', c: ['Yes, always', 'No — the static side holds no state', 'Only for outer joins', 'Only with Kafka'], a: 1, e: 'No watermark is needed for the static (stateless) side.' },
  { m: 'm07', q: 'Processing time is acceptable when…', c: ['You need correct event-time windows', 'Latency/ordering of events does not affect correctness', 'Data is always late', 'Using sessions'], a: 1, e: 'Processing time is fine when exact event-time semantics are not required.' },
  { m: 'm06', q: 'Compared to micro-batch, continuous mode trades…', c: ['Latency for weaker guarantees and fewer ops', 'Throughput for exactly-once', 'State for speed', 'Nothing'], a: 0, e: 'It gets ms latency at the cost of weaker guarantees and limited operations.' },
  { m: 'm15', q: 'The write-ahead log (WAL) pattern records…', c: ['Results before offsets', 'Intent (offsets) before acting', 'Only errors', 'The schema'], a: 1, e: 'WAL logs intent first so recovery is deterministic.' },
  { m: 'm11', q: 'mapGroupsWithState differs from flatMapGroupsWithState in that it…', c: ['Emits zero or many rows', 'Emits exactly one row per key', 'Has no state', 'Needs no watermark'], a: 1, e: 'mapGroupsWithState emits one row per key; flatMap can emit any number.' },
  { m: 'm22', q: 'A streaming query graph shares one…', c: ['Executor', 'Checkpoint and watermark', 'Partition', 'Sink always'], a: 1, e: 'All operators in a query share one checkpoint and one global watermark.' },
  { m: 'm19', q: 'CDC output merged into Delta mirrors a source\'s…', c: ['Schema only', 'Current state via insert/update/delete', 'Offsets', 'Watermark'], a: 1, e: 'Change Data Capture merges change events to reflect current state.' },
  { m: 'm02', q: 'A streaming query is conceptually…', c: ['A batch query that runs forever incrementally', 'A message consumer loop', 'A cron job', 'A UDF'], a: 0, e: '"Batch code that happens to run forever" is the canonical one-liner.' },
  { m: 'm01', q: 'Structured Streaming runs on top of…', c: ['A dedicated streaming cluster only', 'Spark SQL / the batch engine', 'Kafka Streams', 'Flink'], a: 1, e: 'It reuses Spark SQL — the same engine as batch.' },
  { m: 'm20', q: 'High-cardinality keys in aggregation/dedup tend to…', c: ['Shrink state', 'Grow state (more keys)', 'Have no effect', 'Disable the watermark'], a: 1, e: 'More distinct keys means more state entries.' },
  { m: 'm08', q: 'With multiple input watermarks, the safe default policy is…', c: ['max', 'min', 'average', 'first'], a: 1, e: 'min is safe — it waits for the slowest input before evicting.' },
  { m: 'm14', q: 'To write one stream to two sinks with custom logic, use…', c: ['Two queries only', 'foreachBatch (fan-out inside one batch)', 'complete mode', 'A second checkpoint'], a: 1, e: 'foreachBatch lets you write the same batch DataFrame to multiple targets idempotently.' },
  { m: 'm05', q: 'Each micro-batch reads…', c: ['The entire topic', 'A bounded offset range', 'One record', 'Random offsets'], a: 1, e: 'A batch reads a fixed, bounded offset range planned by the driver.' },
  { m: 'm16', q: 'The sink half of exactly-once must…', c: ['Append blindly', 'Commit a batch id once and ignore replays of it', 'Skip the checkpoint', 'Use processing time'], a: 1, e: 'Transactional sinks commit each batch id once, making replays idempotent.' },
  { m: 'm10', q: 'The state store is…', c: ['Stateless', 'Versioned and checkpointed between batches', 'Only in Kafka', 'Recomputed each batch'], a: 1, e: 'State is versioned and checkpointed so it survives restarts.' },
  { m: 'm22', q: 'A slow source in a multi-operator query…', c: ['Only affects its own operator', 'Holds back the global (min) watermark, delaying all downstream eviction', 'Is ignored', 'Speeds up joins'], a: 1, e: 'Because the global watermark is the min, the slowest source gates the whole pipeline.' },
];
