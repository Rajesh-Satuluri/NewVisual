// Per-module quiz bank. A "Test Yourself" section auto-appears on any module
// whose id has an entry here. Add `mXX: [...]` as modules are built.
// Each: { q, options:[...], answer:<0-based index>, explanation }

export const QUIZ_BANK = {
  m01: [
    {
      q: 'What is the core reason Flink achieves lower latency than Spark Streaming?',
      options: [
        'Flink runs on faster hardware',
        'Flink processes each event on arrival, while Spark Streaming uses micro-batches',
        'Flink compresses events before processing',
        'Flink skips fault tolerance to go faster',
      ],
      answer: 1,
      explanation: 'Spark Streaming buffers events into micro-batches (≥ ~100ms), adding inherent latency. Flink is a true streaming engine — operators receive one event at a time, so latency is bounded only by processing time (sub-10ms).',
    },
    {
      q: 'Which mechanism gives Flink exactly-once state consistency?',
      options: [
        'ACK/NACK message tracking',
        'External Redis writes on every event',
        'Chandy-Lamport distributed snapshots (checkpoint barriers)',
        'Two-phase locking on the source',
      ],
      answer: 2,
      explanation: 'Flink periodically injects checkpoint barriers into the sources. When an operator receives the barrier on all inputs it snapshots its state to durable storage. On failure, all operators restore to the last complete checkpoint — exactly-once without idempotent sinks.',
    },
    {
      q: 'What was Apache Storm\'s most significant weakness for enterprise use?',
      options: [
        'It was too slow (minutes of latency)',
        'It had no built-in state management',
        'It could only read from Kafka',
        'It had no programming API at all',
      ],
      answer: 1,
      explanation: 'Storm was genuinely low-latency but had no built-in state — every stateful operation required an external call (Redis/Cassandra), adding latency and failure points. It also offered only at-most-once semantics and no event time.',
    },
    {
      q: 'In micro-batch processing, what is the unit of processing?',
      options: [
        'A single event',
        'A time window (small batch of events)',
        'One partition per second',
        'A full day of data',
      ],
      answer: 1,
      explanation: 'In micro-batch the unit of processing is a time window; operators never see individual events. In true streaming the unit of processing is a single event — the key conceptual contrast to make in an interview.',
    },
    {
      q: 'When did Uber adopt Apache Flink in production?',
      options: ['2011', '2013', '2016', '2020'],
      answer: 2,
      explanation: 'Uber adopted Flink in 2016 for real-time fraud detection and ETA calculation, catching fraud within ~10ms per event. 100+ Flink jobs run at Uber today.',
    },
  ],

  m02: [
    {
      q: 'What distinguishes an unbounded stream from a bounded stream?',
      options: [
        'An unbounded stream is always smaller than a bounded stream',
        'An unbounded stream has a defined start but no defined end; a bounded stream has both',
        'A bounded stream can only be read from Kafka',
        'An unbounded stream cannot be processed by Flink',
      ],
      answer: 1,
      explanation: 'A bounded stream has a known start and end (a finite dataset, i.e. batch). An unbounded stream has a start but no end — like Uber\'s continuous feed of GPS pings. Flink treats batch as a special case of streaming over bounded data.',
    },
    {
      q: 'Why is a micro-batch engine not considered "true streaming"?',
      options: [
        'It cannot connect to Kafka',
        'It groups events into small time-based batches, so no event is processed individually',
        'It processes events one at a time but slowly',
        'It only works on bounded data',
      ],
      answer: 1,
      explanation: 'A micro-batch engine collects events for a short interval and then processes them together, so the processing unit is a batch, not an event. True streaming (Flink) hands each record to operators immediately on arrival, enabling sub-second end-to-end latency for Uber\'s <100ms fraud checks.',
    },
    {
      q: 'In a true streaming dataflow, how does data move between operators?',
      options: [
        'Operators poll a shared database on a timer',
        'Records are pipelined continuously from one operator to the next',
        'Each operator writes a file that the next operator reads',
        'All records are collected before the next operator starts',
      ],
      answer: 1,
      explanation: 'Flink pipelines records: upstream operators push records downstream as they are produced, so multiple operators run concurrently on different records of the same stream. This continuous pipelining is what keeps latency low for 1M GPS pings/sec.',
    },
    {
      q: 'Which statement about processing an unbounded stream is TRUE?',
      options: [
        'You must wait for all data to arrive before producing any result',
        'Results are produced incrementally and continuously as events arrive',
        'The stream must first be converted to a bounded dataset',
        'Only the last event in the stream matters',
      ],
      answer: 1,
      explanation: 'Because an unbounded stream never ends, you cannot wait for "all" data — Flink produces incremental, continuous results (often via windows and watermarks). This lets surge pricing update continuously rather than once per day.',
    },
  ],

  m03: [
    {
      q: 'Which three components make up the Flink JobManager?',
      options: [
        'Dispatcher, ResourceManager, JobMaster',
        'TaskManager, Slot, Buffer',
        'Source, Operator, Sink',
        'Client, Scheduler, Checkpointer',
      ],
      answer: 0,
      explanation: 'The JobManager comprises the Dispatcher (accepts submissions, starts a JobMaster per job, hosts the UI), the ResourceManager (manages task slots across TaskManagers), and the JobMaster (coordinates execution of a single job, including checkpoints).',
    },
    {
      q: 'What is a task slot in a TaskManager?',
      options: [
        'A network port used for shuffles',
        'A unit of resource isolation that can run one parallel pipeline of subtasks',
        'A checkpoint storage directory',
        'A thread pool shared by all jobs on the cluster',
      ],
      answer: 1,
      explanation: 'A task slot represents a fixed slice of a TaskManager\'s managed memory and can execute one slice of the job\'s parallel pipeline. Slots isolate memory (not CPU) between tasks; with slot sharing, subtasks from different operators of the same job can share one slot.',
    },
    {
      q: 'What is the relationship between the JobGraph and the ExecutionGraph?',
      options: [
        'They are two names for the same object',
        'The ExecutionGraph is the parallelized, physical version of the logical JobGraph',
        'The JobGraph is created at runtime from the ExecutionGraph',
        'The ExecutionGraph runs on the client, the JobGraph on the cluster',
      ],
      answer: 1,
      explanation: 'The client builds a logical JobGraph (operators and chaining). The JobMaster expands it into the ExecutionGraph — the physical plan where each operator becomes N parallel subtasks (execution vertices) connected by intermediate result partitions.',
    },
    {
      q: 'Which process actually executes the subtasks (operator instances) of a job?',
      options: [
        'The Dispatcher',
        'The ResourceManager',
        'The TaskManager (worker)',
        'The client JVM',
      ],
      answer: 2,
      explanation: 'TaskManagers are the worker processes; each offers task slots and runs the operator subtasks, buffering and exchanging records over the network. The JobManager only coordinates — it does not run operator logic on Uber\'s GPS stream.',
    },
  ],

  m04: [
    {
      q: 'In which deployment mode is the main() method executed on the JobManager rather than the client?',
      options: [
        'Session mode',
        'Per-job mode',
        'Application mode',
        'Local mode',
      ],
      answer: 2,
      explanation: 'In Application mode, the job\'s main() runs on the JobManager (the cluster is dedicated to one application), reducing client load and bandwidth. In Session and per-job modes the client runs main() and ships the JobGraph to the cluster.',
    },
    {
      q: 'What characterizes Session mode?',
      options: [
        'A new dedicated cluster is spun up per job and torn down on completion',
        'Multiple jobs share one long-running cluster and its TaskManager slots',
        'The job runs entirely in the client JVM',
        'Each operator gets its own JobManager',
      ],
      answer: 1,
      explanation: 'Session mode runs a long-lived cluster that accepts many jobs sharing its resources — fast startup and good for short jobs, but jobs can interfere (resource contention, shared failure domain). Per-job/Application modes isolate each job in its own cluster.',
    },
    {
      q: 'After the client submits a job, what does the scheduler do first?',
      options: [
        'Immediately writes results to the sink',
        'Requests the required task slots from the ResourceManager and deploys subtasks to them',
        'Triggers a savepoint',
        'Compiles the SQL to bytecode',
      ],
      answer: 1,
      explanation: 'Scheduling turns the ExecutionGraph into running tasks: the JobMaster requests slots from the ResourceManager, then deploys each subtask to a slot on a TaskManager. Only once deployed and connected do tasks transition toward RUNNING.',
    },
    {
      q: 'Which sequence of task states is correct during normal startup?',
      options: [
        'RUNNING → CREATED → DEPLOYING → FINISHED',
        'CREATED → SCHEDULED → DEPLOYING → RUNNING',
        'DEPLOYING → RUNNING → SCHEDULED → CREATED',
        'SCHEDULED → FINISHED → RUNNING → CREATED',
      ],
      answer: 1,
      explanation: 'A task progresses CREATED → SCHEDULED (slot requested) → DEPLOYING (code/state shipped to the slot) → RUNNING, and finally FINISHED (bounded) or FAILED/CANCELED. Knowing this lifecycle helps diagnose a job stuck in SCHEDULED (no free slots).',
    },
  ],

  m05: [
    {
      q: 'What is a subtask in Flink?',
      options: [
        'A checkpoint of operator state',
        'One parallel instance of an operator',
        'A savepoint metadata file',
        'A network buffer',
      ],
      answer: 1,
      explanation: 'An operator with parallelism N is executed as N subtasks, each processing a slice of the stream. For keyBy(driver_id) at parallelism 128, each of the 128 subtasks handles a subset of drivers\' key groups.',
    },
    {
      q: 'What does slot sharing allow?',
      options: [
        'Two different jobs to share one task slot',
        'Subtasks of different operators from the same job to run in the same slot',
        'A slot to hold more than one checkpoint',
        'TaskManagers to share CPU cores equally',
      ],
      answer: 1,
      explanation: 'By default, subtasks of different operators within a single job can share a slot (slot sharing). This means the number of slots a job needs equals its highest operator parallelism, improving resource utilization and co-locating a full pipeline.',
    },
    {
      q: 'Why does maxParallelism (via key groups) matter for rescaling a keyed stream?',
      options: [
        'It caps how many TaskManagers the cluster can have',
        'Keyed state is partitioned into a fixed number of key groups; you can only rescale up to that count',
        'It controls the checkpoint interval',
        'It determines the watermark delay',
      ],
      answer: 1,
      explanation: 'Keyed state is assigned to a fixed number of key groups determined by maxParallelism. On rescale, whole key groups are redistributed to subtasks, so parallelism can never exceed maxParallelism. Set it deliberately up front — it cannot be changed without a state migration.',
    },
    {
      q: 'If a source operator has parallelism 4 and a downstream keyBy operator has parallelism 8, what happens between them?',
      options: [
        'The job fails because parallelism must match',
        'A redistributing (hash) exchange repartitions records by key across the 8 subtasks',
        'Only 4 of the 8 downstream subtasks ever receive data',
        'Records are broadcast to all 8 subtasks',
      ],
      answer: 1,
      explanation: 'A keyBy introduces a hash partitioning (redistributing) exchange: each record is routed to one of the 8 downstream subtasks by key hash, regardless of upstream parallelism. Mismatched parallelism is fine — it just forces a network shuffle.',
    },
  ],

  m06: [
    {
      q: 'What is the key difference between map and flatMap?',
      options: [
        'map can emit zero or many records; flatMap emits exactly one',
        'flatMap can emit zero, one, or many records per input; map emits exactly one',
        'They are identical',
        'flatMap can only be used after keyBy',
      ],
      answer: 1,
      explanation: 'map is 1-to-1 (one output per input). flatMap is 1-to-N — it can emit zero, one, or many records via the collector, making it ideal for splitting or filtering-and-transforming in one step.',
    },
    {
      q: 'Why does operator chaining improve performance?',
      options: [
        'It increases parallelism automatically',
        'It fuses chained operators into one task thread, avoiding serialization and network/thread hand-offs',
        'It compresses the state backend',
        'It reduces the number of checkpoints needed',
      ],
      answer: 1,
      explanation: 'Chaining fuses consecutive one-to-one operators (e.g. map → filter) into a single task running in one thread. Records are passed by method call rather than being serialized and buffered, eliminating per-record overhead — crucial at 1M pings/sec.',
    },
    {
      q: 'Which operator gives you access to timers and keyed state for custom event-driven logic?',
      options: [
        'filter',
        'reduce',
        'KeyedProcessFunction (process)',
        'map',
      ],
      answer: 2,
      explanation: 'A KeyedProcessFunction exposes processElement plus registerable event-time/processing-time timers and keyed state. Uber\'s fraud logic uses it to track per-driver state and fire a timer-based alert within 100ms.',
    },
    {
      q: 'What does keyBy(driver_id) do to the stream?',
      options: [
        'Sorts the entire stream by driver_id',
        'Logically partitions the stream so all records with the same driver_id go to the same subtask',
        'Removes duplicate driver_id records',
        'Reduces parallelism to 1',
      ],
      answer: 1,
      explanation: 'keyBy hash-partitions the stream by key so every record with the same driver_id is routed to the same downstream subtask, enabling per-key (per-driver) keyed state and aggregation. It is a logical partitioning, not a sort.',
    },
  ],

  m07: [
    {
      q: 'In the modern Flink Kafka source (FLIP-27), what is the role of the SplitEnumerator?',
      options: [
        'It deserializes each record',
        'It runs on the JobManager and assigns Kafka partitions (splits) to the parallel source readers',
        'It commits offsets to the sink',
        'It triggers checkpoints',
      ],
      answer: 1,
      explanation: 'The SplitEnumerator runs on the JobManager and discovers and assigns splits (Kafka topic partitions) to the SourceReaders on the TaskManagers. This cleanly separates work discovery from reading and supports dynamic partition discovery.',
    },
    {
      q: 'How does the Flink Kafka sink achieve end-to-end exactly-once?',
      options: [
        'By deduplicating records in the consumer',
        'Via a two-phase commit (2PC) that ties Kafka transactions to Flink checkpoints',
        'By writing every record twice and comparing',
        'By using at-least-once and idempotent keys only',
      ],
      answer: 1,
      explanation: 'The Kafka sink implements TwoPhaseCommitSinkFunction semantics: it writes to a Kafka transaction during processing (pre-commit at checkpoint) and commits the transaction only after the checkpoint completes. A failure before commit aborts the transaction, so no partial output is visible.',
    },
    {
      q: 'What determines when FileSink closes ("rolls") the current file into a finalized part file?',
      options: [
        'Only when the job stops',
        'A rolling policy based on file size, rollover interval, and inactivity timeout',
        'Every single record',
        'Only on manual savepoints',
      ],
      answer: 1,
      explanation: 'FileSink uses a RollingPolicy: a part file rolls when it reaches a max size, after a max rollover interval, or after an inactivity timeout. In-progress files are promoted to finished only when the related checkpoint completes, preserving exactly-once.',
    },
    {
      q: 'Where does Flink store the Kafka consumer offsets for exactly-once recovery?',
      options: [
        'Only in Kafka\'s __consumer_offsets, independent of Flink',
        'As part of the Flink checkpoint, so offsets and operator state are restored together',
        'In a local file on the client',
        'It does not track offsets',
      ],
      answer: 1,
      explanation: 'Flink stores Kafka offsets in its own checkpoints so that on recovery the source rewinds to the exact offset matching the restored operator state. Committing offsets back to Kafka is optional and only for external monitoring, not for correctness.',
    },
  ],

  m08: [
    {
      q: 'What is event time?',
      options: [
        'The time a record is processed by an operator',
        'The time the event actually occurred, embedded in the record',
        'The time the record entered the Flink source',
        'The system clock of the JobManager',
      ],
      answer: 1,
      explanation: 'Event time is the timestamp of when the event actually happened (e.g. when a GPS ping was emitted by the phone), carried in the record itself. It yields deterministic, reproducible results regardless of processing delays — essential for correct windowing.',
    },
    {
      q: 'Which time semantic gives non-deterministic results that depend on cluster speed and load?',
      options: [
        'Event time',
        'Ingestion time',
        'Processing time',
        'Watermark time',
      ],
      answer: 2,
      explanation: 'Processing time uses the operator\'s wall-clock when a record is handled. It is lowest-latency and simplest, but results vary with load, delays, and reprocessing — a replay of the same data can land in different windows.',
    },
    {
      q: 'What is ingestion time?',
      options: [
        'The time the event occurred at the device',
        'The time assigned when the record enters Flink at the source, used for all downstream operators',
        'The time the record is written to the sink',
        'The checkpoint timestamp',
      ],
      answer: 1,
      explanation: 'Ingestion time stamps each record with the source operator\'s wall-clock on entry. It sits between event and processing time: more stable than processing time across operators, but still cannot account for delays before the record reached Flink.',
    },
    {
      q: 'In PyFlink, what is the role of a timestamp assigner within a WatermarkStrategy?',
      options: [
        'It compresses the record',
        'It extracts the event-time timestamp from each record (e.g. from a ping\'s event_ts field)',
        'It assigns records to key groups',
        'It commits Kafka offsets',
      ],
      answer: 1,
      explanation: 'A timestamp assigner tells Flink which field holds the event time, e.g. WatermarkStrategy.for_bounded_out_of_orderness(...).with_timestamp_assigner(lambda e, ts: e.event_ts). Without it, Flink cannot order events or advance watermarks in event time.',
    },
  ],

  m09: [
    {
      q: 'For a bounded-out-of-orderness strategy with delay Δ, how is the watermark computed?',
      options: [
        'W = currentProcessingTime',
        'W = maxEventTimeSeen − Δ',
        'W = minEventTimeSeen + Δ',
        'W = Δ only',
      ],
      answer: 1,
      explanation: 'A bounded-out-of-orderness watermark is W = (maximum event timestamp observed so far) − Δ. It asserts "no events older than W should still arrive," tolerating out-of-order lateness up to Δ before an event is treated as late.',
    },
    {
      q: 'When an operator has multiple input channels, what watermark does it propagate downstream?',
      options: [
        'The maximum watermark across inputs',
        'The minimum watermark across all input channels',
        'The average of input watermarks',
        'The watermark of the first channel only',
      ],
      answer: 1,
      explanation: 'An operator\'s event-time clock is the minimum of the watermarks from all its input channels — it can only be as advanced as its slowest input. This is why one stalled Kafka partition can hold back windows across the whole job.',
    },
    {
      q: 'Why configure idleness in a WatermarkStrategy?',
      options: [
        'To skip checkpoints during quiet periods',
        'So an idle source partition is excluded from the min-watermark calculation and does not stall event-time progress',
        'To drop late events automatically',
        'To increase parallelism when idle',
      ],
      answer: 1,
      explanation: 'with_idleness marks a partition idle after a timeout so it stops contributing to the min-watermark computation. Without it, a quiet partition (e.g. a region with no rides at 4am) keeps the global watermark pinned and windows never fire.',
    },
    {
      q: 'What is the correct way to capture events that arrive after the watermark (late data) without losing them?',
      options: [
        'Increase the checkpoint interval',
        'Route them to a side output via allowed lateness / lateness tagging',
        'Reduce parallelism to 1',
        'Switch to processing time',
      ],
      answer: 1,
      explanation: 'Late events (past the watermark and beyond allowed lateness) can be sent to a side output stream instead of being silently dropped, letting you log or reprocess them. Allowed lateness additionally keeps a window\'s state around to re-fire for moderately late records.',
    },
  ],

  m10: [
    {
      q: 'How does a sliding window differ from a tumbling window?',
      options: [
        'Sliding windows never overlap; tumbling windows always overlap',
        'Sliding windows overlap (size > slide), so an event can belong to multiple windows; tumbling windows are fixed, non-overlapping',
        'Tumbling windows are only for processing time',
        'Sliding windows can only be 1 second long',
      ],
      answer: 1,
      explanation: 'A tumbling window partitions time into fixed, non-overlapping chunks (each event in exactly one). A sliding window has a size and a smaller slide, so windows overlap and an event may fall into several — e.g. a 5-min surge metric updated every 1 min.',
    },
    {
      q: 'What defines the boundaries of a session window?',
      options: [
        'A fixed clock interval',
        'A gap of inactivity — the window closes when no events arrive for the configured gap duration',
        'The number of events, regardless of time',
        'The checkpoint interval',
      ],
      answer: 1,
      explanation: 'Session windows group events separated by gaps smaller than a session gap; a window ends after that gap of inactivity. They have no fixed size — useful for a driver\'s continuous activity session that ends when they go offline.',
    },
    {
      q: 'What is the advantage of an incremental aggregation (ReduceFunction/AggregateFunction) over a ProcessWindowFunction that iterates all elements?',
      options: [
        'It fires the window earlier',
        'It aggregates eagerly as events arrive, storing only the running result instead of buffering every element',
        'It provides access to the window metadata',
        'It disables watermarks',
      ],
      answer: 1,
      explanation: 'Incremental aggregation combines each arriving record into a single running value, so window state is O(1) per key rather than O(n). A ProcessWindowFunction alone buffers all elements until the window fires — fine for small windows, costly at Uber scale.',
    },
    {
      q: 'What does allowed lateness do to a window after the watermark has passed its end?',
      options: [
        'It immediately deletes the window',
        'It keeps the window state for an extra period so late-but-within-lateness events re-trigger the window computation',
        'It converts the window to processing time',
        'It merges the window with the next one',
      ],
      answer: 1,
      explanation: 'With allowed lateness, Flink retains a fired window\'s state for an additional duration; qualifying late events update and re-emit the result. Once allowed lateness expires, state is purged and further late events go to the side output (if configured).',
    },
  ],

  m11: [
    {
      q: 'What is the difference between keyed state and operator state?',
      options: [
        'Keyed state is global; operator state is per-key',
        'Keyed state is scoped to each key on a keyed stream; operator state is scoped to each parallel operator instance',
        'They are identical',
        'Operator state can only be a ValueState',
      ],
      answer: 1,
      explanation: 'Keyed state is partitioned per key (only accessible after keyBy) — e.g. a running count per driver_id. Operator state is bound to a parallel subtask regardless of keys — e.g. Kafka source offsets held per reader instance.',
    },
    {
      q: 'Which state primitive would you use to store a running count per key?',
      options: [
        'MapState',
        'ListState',
        'ValueState',
        'BroadcastState',
      ],
      answer: 2,
      explanation: 'ValueState<T> holds a single updatable value per key — ideal for a per-driver running count or last-seen timestamp. ListState appends many values, and MapState stores key/value entries, per Flink key.',
    },
    {
      q: 'What is the main trade-off of the RocksDB state backend versus the heap (HashMap) state backend?',
      options: [
        'RocksDB is faster but cannot be checkpointed',
        'RocksDB stores state on disk (off-heap) so it holds state larger than memory, at the cost of per-access serialization overhead',
        'The heap backend supports larger state than RocksDB',
        'RocksDB cannot support keyed state',
      ],
      answer: 1,
      explanation: 'RocksDB keeps state on local disk (with serialization on each read/write) and supports incremental checkpoints and very large state. The heap backend keeps live objects in JVM memory — fastest access but bounded by heap and limited to full checkpoints.',
    },
    {
      q: 'What does State TTL accomplish?',
      options: [
        'It compresses checkpoints',
        'It automatically expires and cleans up state entries after a configured time-to-live',
        'It increases parallelism of stateful operators',
        'It forces exactly-once semantics',
      ],
      answer: 1,
      explanation: 'State TTL expires entries after a configured duration (e.g. on last access or last write), preventing unbounded state growth. For a per-driver fraud counter you set a TTL so inactive drivers\' state is reclaimed instead of accumulating forever.',
    },
  ],

  m12: [
    {
      q: 'Flink\'s checkpointing algorithm is based on which classic distributed-systems algorithm?',
      options: [
        'Paxos',
        'Chandy-Lamport distributed snapshots',
        'Raft',
        'Two-phase commit',
      ],
      answer: 1,
      explanation: 'Flink uses a variant of the Chandy-Lamport asynchronous snapshot algorithm. Checkpoint barriers flow through the dataflow; when an operator has received the barrier from all inputs, it snapshots its state — producing a globally consistent cut without stopping the stream.',
    },
    {
      q: 'What problem do unaligned checkpoints solve compared to aligned checkpoints?',
      options: [
        'They reduce state size',
        'Under backpressure, they let barriers overtake buffered records so checkpoints complete without waiting for barrier alignment',
        'They remove the need for a state backend',
        'They guarantee at-least-once instead of exactly-once',
      ],
      answer: 1,
      explanation: 'Aligned checkpoints make a fast input wait at the barrier until all inputs align, which can stall badly under backpressure. Unaligned checkpoints snapshot in-flight buffered data along with state so the barrier can pass immediately — faster checkpoints under load, at the cost of larger checkpoint size.',
    },
    {
      q: 'What does an incremental checkpoint store?',
      options: [
        'The entire state every time',
        'Only the changes (new RocksDB SST files) since the last checkpoint',
        'Only the JobGraph',
        'Only the Kafka offsets',
      ],
      answer: 1,
      explanation: 'With RocksDB, incremental checkpoints upload only the SST files that changed since the previous checkpoint rather than the full state. This dramatically cuts checkpoint duration and network I/O for large state — important when per-driver state spans millions of keys.',
    },
    {
      q: 'What is the practical difference between exactly-once and at-least-once checkpointing mode?',
      options: [
        'At-least-once uses no checkpoints',
        'Exactly-once aligns barriers so each record affects state once; at-least-once skips alignment, so some records may be reprocessed and counted more than once after recovery',
        'Exactly-once is slower only because it writes to disk twice',
        'They produce identical results',
      ],
      answer: 1,
      explanation: 'In exactly-once mode Flink aligns barriers so, after recovery, each record is reflected in state exactly once. At-least-once skips alignment for lower latency, but records in flight during the checkpoint may be processed again on restore, risking double counting.',
    },
  ],

  m13: [
    {
      q: 'On failure, how does Flink recover state with exactly-once semantics?',
      options: [
        'It replays the entire stream from the beginning',
        'It restores all operators from the last completed checkpoint and rewinds sources to the matching offsets',
        'It asks the sink to resend records',
        'It restarts only the failed subtask with empty state',
      ],
      answer: 1,
      explanation: 'Flink rolls the whole job back to the last successful checkpoint: operator state is restored and sources rewind to the offsets captured in that checkpoint. Reprocessing from there, combined with transactional sinks, yields exactly-once end to end.',
    },
    {
      q: 'What does the fixed-delay restart strategy do?',
      options: [
        'Restarts the job immediately an unlimited number of times',
        'Restarts up to N times, waiting a fixed delay between attempts, then fails the job permanently',
        'Restarts only if the failure rate exceeds a threshold',
        'Takes a savepoint before each restart',
      ],
      answer: 1,
      explanation: 'fixed-delay attempts a bounded number of restarts, pausing a fixed delay between each. If all attempts are exhausted, the job fails. The delay avoids hammering a dependency (e.g. a briefly unavailable Kafka broker) in a tight loop.',
    },
    {
      q: 'What is the benefit of region (pipelined-region) failover over full-job restart?',
      options: [
        'It disables checkpointing',
        'It restarts only the connected region of tasks affected by the failure, not the entire job',
        'It increases parallelism of the failed region',
        'It converts the job to batch mode',
      ],
      answer: 1,
      explanation: 'Region failover restarts only the failed pipelined region (and regions depending on its lost output) instead of every task. For embarrassingly parallel or loosely connected graphs this restores far faster and keeps unaffected regions running.',
    },
    {
      q: 'End-to-end exactly-once requires what from the sink?',
      options: [
        'Nothing — the source alone guarantees it',
        'A transactional (two-phase commit) or idempotent sink so replayed records after recovery do not produce duplicate external output',
        'The sink must drop all late data',
        'The sink must run at parallelism 1',
      ],
      answer: 1,
      explanation: 'Internal exactly-once covers Flink state, but external output needs a transactional sink (commit tied to checkpoints) or an idempotent sink. Otherwise, records reprocessed after a restart would be written to the external system twice.',
    },
  ],

  m13b: [
    {
      q: 'What is the primary difference between a savepoint and a checkpoint?',
      options: [
        'Savepoints are automatic and short-lived; checkpoints are manual',
        'Savepoints are user-triggered, portable snapshots for operational tasks (upgrades, migration); checkpoints are automatic and managed by Flink for failure recovery',
        'Checkpoints can be used to rescale; savepoints cannot',
        'They are stored in the same format and are interchangeable in all cases',
      ],
      answer: 1,
      explanation: 'Checkpoints are triggered automatically for fault tolerance and are owned/cleaned up by Flink (often in an optimized format). Savepoints are triggered manually, kept in a stable, portable format, and are meant for planned operations like upgrades, A/B testing, and cluster migration.',
    },
    {
      q: 'Why should you assign stable UIDs to stateful operators?',
      options: [
        'To increase their parallelism',
        'So Flink can match saved state to the correct operator when restoring from a savepoint after code changes',
        'To reduce checkpoint size',
        'To enable processing time',
      ],
      answer: 1,
      explanation: 'State in a savepoint is keyed by operator UID. If you rely on auto-generated IDs, changing the job graph shifts them and the restore fails to map state. Explicit uid() values let you refactor the pipeline while still restoring each operator\'s state.',
    },
    {
      q: 'How does restoring from a savepoint allow rescaling a keyed operator to a new parallelism?',
      options: [
        'It discards the old keyed state',
        'Keyed state is organized into key groups that are redistributed across the new set of subtasks (up to maxParallelism)',
        'It replays the source from offset 0',
        'It only works if parallelism stays the same',
      ],
      answer: 1,
      explanation: 'Keyed state is partitioned into a fixed number of key groups (set by maxParallelism). On restore, Flink reassigns whole key groups to the new subtasks, so you can scale up or down — but never beyond maxParallelism, which is fixed at job inception.',
    },
    {
      q: 'What enables schema evolution of state when upgrading a job from a savepoint?',
      options: [
        'Switching to processing time',
        'Using an evolvable serializer (e.g. POJO or Avro) so added/removed fields can be migrated on restore',
        'Deleting the savepoint and starting fresh',
        'Setting parallelism to 1',
      ],
      answer: 1,
      explanation: 'With evolution-friendly serializers (POJO, Avro), Flink can migrate state when fields are added or removed during restore. Opaque serializers like Kryo generally do not support schema evolution, so design state types with evolution in mind.',
    },
  ],

  m14: [
    {
      q: 'Which pair of metrics best indicates backpressure on an operator?',
      options: [
        'numRecordsIn and numRecordsOut only',
        'The busyTimeMsPerSecond and backPressuredTimeMsPerSecond metrics',
        'checkpointDuration and stateSize',
        'CPU load of the JobManager',
      ],
      answer: 1,
      explanation: 'Flink exposes backPressuredTimeMsPerSecond (time a task spent unable to emit because downstream was full) and busyTimeMsPerSecond (time actively processing). A high backpressured ratio means this task is being held back by a slower downstream operator.',
    },
    {
      q: 'What is credit-based flow control in Flink\'s network stack?',
      options: [
        'A billing mechanism for cloud usage',
        'Downstream subtasks advertise available buffer credits so upstream only sends data when buffers exist, propagating backpressure smoothly',
        'A way to prioritize checkpoint barriers over data',
        'A scheduler that assigns slots by credit score',
      ],
      answer: 1,
      explanation: 'With credit-based flow control, each downstream input channel announces how many buffers (credits) it has free; upstream sends at most that many buffers. This prevents TCP buffer bloat and lets backpressure propagate per-channel, quickly and gracefully.',
    },
    {
      q: 'A common ROOT CAUSE of backpressure in a Flink job is:',
      options: [
        'Too many checkpoints succeeding',
        'A slow sink or an under-provisioned/skewed operator that cannot keep up with input rate',
        'Watermarks advancing too quickly',
        'Using event time instead of processing time',
      ],
      answer: 1,
      explanation: 'Backpressure typically originates at the slowest stage — often a slow external sink (e.g. a throttled database), a skewed key causing one hot subtask, or an under-parallelized operator. The pressure then propagates upstream to the source, capping throughput.',
    },
    {
      q: 'Which is a legitimate fix for backpressure caused by data skew on a hot key?',
      options: [
        'Disable checkpointing',
        'Add a local pre-aggregation or two-phase aggregation / salt the key to spread load before the final keyed aggregation',
        'Lower the parallelism of all operators to 1',
        'Switch from Kafka to a file source',
      ],
      answer: 1,
      explanation: 'Skew concentrates load on one subtask. A two-phase (combine then aggregate) approach or key salting distributes the pre-aggregation across subtasks and then combines partial results, relieving the hot key without changing the final result.',
    },
  ],

  m15: [
    {
      q: 'In Flink SQL, what is a dynamic table?',
      options: [
        'A table whose schema changes every row',
        'A table that continuously changes over time as the underlying stream evolves; querying it produces a continuous result',
        'A temporary table deleted after each query',
        'A table stored only in RocksDB',
      ],
      answer: 1,
      explanation: 'Flink models a stream as a dynamic table that changes as records arrive. A continuous query over it produces another dynamic table (and an associated changelog stream), unifying batch SQL semantics with streaming.',
    },
    {
      q: 'In a Flink SQL DDL, what does a WATERMARK clause define?',
      options: [
        'The primary key of the table',
        'How event-time watermarks are generated from a rowtime column (e.g. event_ts − INTERVAL for out-of-orderness)',
        'The checkpoint interval',
        'The Kafka consumer group',
      ],
      answer: 1,
      explanation: 'The WATERMARK FOR rowtime_column AS expression clause marks a column as the event-time attribute and defines watermark generation, e.g. WATERMARK FOR event_ts AS event_ts - INTERVAL \'5\' SECOND. Without it, event-time windows in SQL cannot fire.',
    },
    {
      q: 'Which Flink SQL construct expresses a tumbling window aggregation in modern Flink?',
      options: [
        'GROUP BY HOP(...)',
        'GROUP BY window_start, window_end using the TUMBLE table-valued function',
        'ORDER BY event_ts',
        'PARTITION BY driver_id',
      ],
      answer: 1,
      explanation: 'Modern Flink SQL uses windowing table-valued functions: SELECT ... FROM TABLE(TUMBLE(TABLE rides, DESCRIPTOR(event_ts), INTERVAL \'1\' MINUTE)) GROUP BY window_start, window_end, driver_id. HOP is the sliding-window TVF.',
    },
    {
      q: 'What is a key advantage of the Table API / Flink SQL over the DataStream API for analysts?',
      options: [
        'It cannot use event time',
        'It offers a declarative, relational interface with the same streaming semantics, lowering the barrier to real-time analytics',
        'It runs only in batch mode',
        'It bypasses checkpointing',
      ],
      answer: 1,
      explanation: 'The Table API and SQL provide a declarative relational layer on top of the same runtime (watermarks, state, exactly-once). Analysts write SQL instead of imperative DataStream code, while Flink\'s planner optimizes and executes it as a streaming job.',
    },
  ],

  m16: [
    {
      q: 'When would you use the upsert-kafka connector instead of the regular kafka connector?',
      options: [
        'When the topic has no key',
        'When you need to materialize a changelog as a compacted keyed stream where each key holds its latest value (and deletes via tombstones)',
        'When you only read, never write',
        'When exactly-once is not required',
      ],
      answer: 1,
      explanation: 'upsert-kafka interprets the topic as a changelog keyed by the primary key: each record is an upsert for its key, and null values are tombstone deletes. It is ideal for maintaining a continuously updated per-key view (e.g. latest surge multiplier per zone).',
    },
    {
      q: 'What is a lookup join in Flink SQL?',
      options: [
        'A join that broadcasts both tables',
        'A join where streaming rows are enriched by looking up the latest matching rows in an external table (e.g. JDBC) on demand',
        'A join that only works on two streams',
        'A self-join on the same topic',
      ],
      answer: 1,
      explanation: 'A lookup join enriches each streaming record by querying an external system (JDBC, HBase, etc.) keyed by the join condition, typically for dimension lookups like mapping driver_id to driver profile. Results can be cached to reduce external load.',
    },
    {
      q: 'How does the Flink JDBC sink behave with respect to delivery guarantees by default?',
      options: [
        'It always provides exactly-once with any database',
        'It provides at-least-once by default; exactly-once requires an idempotent/upsert write (on a primary key) or an XA-capable database',
        'It never writes duplicates under any failure',
        'It cannot batch writes',
      ],
      answer: 1,
      explanation: 'The JDBC sink batches and flushes with at-least-once semantics by default. To avoid duplicates after recovery you use upsert statements keyed by a primary key (idempotent writes) or the XA-based exactly-once JDBC sink where the database supports XA transactions.',
    },
    {
      q: 'In the connector architecture, what is the role of a format (e.g. JSON, Avro, Debezium)?',
      options: [
        'It decides the parallelism of the source',
        'It defines how bytes from the connector are (de)serialized into rows',
        'It triggers checkpoints',
        'It manages task slots',
      ],
      answer: 1,
      explanation: 'A format plugs into a connector to encode/decode the byte payload, e.g. JSON or Avro for value serialization, or debezium-json to interpret CDC changelog events. Connector (transport) and format (serialization) are orthogonal and composed in the DDL.',
    },
  ],

  m17: [
    {
      q: 'What is a retract stream?',
      options: [
        'A stream that only ever inserts rows',
        'A changelog stream that emits retraction (delete) messages followed by updated (insert) messages when a prior result changes',
        'A stream with no watermarks',
        'A stream that drops late data',
      ],
      answer: 1,
      explanation: 'A retract stream encodes updates as a retract of the old value plus an insert of the new value. Non-windowed aggregations (e.g. a running COUNT GROUP BY zone) produce retract streams because earlier emitted results must be corrected as new data arrives.',
    },
    {
      q: 'What distinguishes an interval join from a regular (unbounded) join in Flink SQL?',
      options: [
        'An interval join requires both sides to be bounded',
        'An interval join bounds the join to a time window between the two streams\' timestamps, allowing state to be cleaned up; a regular join keeps state indefinitely',
        'A regular join is always faster',
        'An interval join cannot use event time',
      ],
      answer: 1,
      explanation: 'An interval join matches rows whose timestamps fall within a relative time bound (e.g. ride.event_ts BETWEEN payment.event_ts - 10 MIN AND payment.event_ts). The time bound lets Flink expire old state, unlike a regular join that must retain all rows forever.',
    },
    {
      q: 'What does a temporal join (FOR SYSTEM_TIME AS OF) accomplish?',
      options: [
        'It joins two append-only streams with no time semantics',
        'It joins a stream against the version of a changing dimension table that was valid at each row\'s event time',
        'It deduplicates a stream',
        'It computes a Top-N ranking',
      ],
      answer: 1,
      explanation: 'A temporal (versioned-table) join looks up the dimension row valid as of each stream record\'s time — e.g. converting a fare using the exchange rate that applied at the ride\'s timestamp. This gives point-in-time-correct enrichment rather than only the latest value.',
    },
    {
      q: 'Which pattern implements streaming deduplication in Flink SQL?',
      options: [
        'SELECT DISTINCT on all columns',
        'ROW_NUMBER() OVER (PARTITION BY key ORDER BY event_ts) and keeping row rank = 1',
        'GROUP BY with HAVING COUNT > 1',
        'A regular inner join',
      ],
      answer: 1,
      explanation: 'Deduplication uses ROW_NUMBER() OVER (PARTITION BY dedup_key ORDER BY proctime/event_ts) and filters WHERE rn = 1 to keep the first (or last) row per key. The same ROW_NUMBER pattern with rn <= N expresses streaming Top-N.',
    },
  ],

  m18: [
    {
      q: 'Why is Kryo serialization generally the least desirable option for Flink state and network transfer?',
      options: [
        'It cannot serialize any type',
        'It is a slow, generic fallback with large payloads and poor schema evolution; POJO/Avro serializers are much faster and evolvable',
        'It only works in batch mode',
        'It disables checkpointing',
      ],
      answer: 1,
      explanation: 'Kryo is Flink\'s generic fallback used when a type is not a recognized POJO/Tuple/Avro type. It is slower, produces larger serialized forms, and does not support schema evolution well. Designing types as POJOs or Avro lets Flink use its efficient built-in serializers.',
    },
    {
      q: 'Which RocksDB-related tuning most directly improves read-heavy stateful performance?',
      options: [
        'Disabling checkpoints',
        'Allocating sufficient block cache / managed memory and using SSDs for local state storage',
        'Reducing maxParallelism to 1',
        'Switching to processing time',
      ],
      answer: 1,
      explanation: 'RocksDB reads benefit from a large enough block cache (served from Flink managed memory) and fast local disks (SSD/NVMe). Starving RocksDB of memory or placing its files on slow disks causes read amplification and stalls at Uber-scale key counts.',
    },
    {
      q: 'What does enabling object reuse do, and what is the caveat?',
      options: [
        'It caches checkpoints; no caveat',
        'It lets operators reuse record objects to reduce GC pressure, but user code must not hold references to records across calls',
        'It doubles parallelism automatically',
        'It compresses the state backend with no downside',
      ],
      answer: 1,
      explanation: 'Object reuse avoids allocating a new object per record, cutting GC overhead in hot paths. The caveat: Flink may mutate the reused object after your function returns, so retaining or caching a reference to an input record leads to corruption.',
    },
    {
      q: 'Data skew in a keyed aggregation is best described as:',
      options: [
        'Clock drift between TaskManagers',
        'An uneven key distribution so a few subtasks process far more records than others, becoming a bottleneck',
        'Checkpoints taking uneven amounts of time',
        'Watermarks arriving out of order',
      ],
      answer: 1,
      explanation: 'Skew occurs when some keys are far hotter than others (e.g. a single busy airport zone), overloading the subtasks that own those keys while others idle. Remedies include two-phase aggregation, key salting, or local pre-aggregation to balance the load.',
    },
  ],

  m19: [
    {
      q: 'In the Uber fraud pipeline, why is the stream keyed by driver_id before the windowed aggregation?',
      options: [
        'To sort rides alphabetically',
        'So all events for a given driver are routed to the same subtask, enabling per-driver keyed state and aggregation',
        'To reduce the number of Kafka partitions',
        'To disable watermarks',
      ],
      answer: 1,
      explanation: 'keyBy(driver_id) guarantees every event for a driver lands on the same subtask, so per-driver windows and keyed state (counts, last location, running fare) are consistent. This per-key routing is the foundation of detecting anomalies per driver.',
    },
    {
      q: 'Why implement the fraud-detection step as a KeyedProcessFunction rather than a simple window?',
      options: [
        'It is the only operator that can read from Kafka',
        'It gives fine-grained access to keyed state and event-time timers, so a suspicious pattern can trigger an alert within 100ms rather than only at window close',
        'It automatically parallelizes better than any window',
        'It removes the need for checkpointing',
      ],
      answer: 1,
      explanation: 'A KeyedProcessFunction can inspect each event against per-driver state and register timers, emitting a fraud alert the instant a threshold is crossed — meeting the <100ms requirement. A fixed window would only evaluate at its boundary, adding latency.',
    },
    {
      q: 'What combination gives the Uber pipeline true end-to-end exactly-once output?',
      options: [
        'Processing time plus an idempotent cache',
        'Checkpointed source offsets and operator state plus a transactional (2PC) sink committing on checkpoint completion',
        'At-least-once checkpoints and a plain JDBC insert',
        'Disabling watermarks and using session mode',
      ],
      answer: 1,
      explanation: 'Exactly-once end to end needs the source offsets and operator state captured in checkpoints and a transactional sink (e.g. Kafka 2PC) that commits only when the checkpoint completes. On recovery the source rewinds and uncommitted output is aborted, so no duplicates reach downstream systems.',
    },
    {
      q: 'Why is event time (with watermarks) chosen over processing time for the Uber ride-aggregation pipeline?',
      options: [
        'Processing time is not supported by Kafka',
        'Event time yields deterministic, correct windows despite out-of-order GPS pings and network delays, and is reproducible on replay',
        'Event time removes the need for keyBy',
        'Processing time cannot be checkpointed',
      ],
      answer: 1,
      explanation: 'GPS pings arrive out of order and delayed over mobile networks. Event time with watermarks assigns each ping to the window of when it actually occurred, giving correct, reproducible aggregates — a processing-time result would shift with cluster load and replays.',
    },
  ],
};
