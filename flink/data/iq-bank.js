// Per-module interview question bank (content/rendering split).
// Modules render from here; the Study Hub aggregates across all keys.
// Add a `mXX: [...]` entry as each module is built.

export const IQ_BANK = {
  m01: [
    {
      q: 'Why did Uber choose Apache Flink over Spark Streaming?',
      difficulty: 'medium',
      a: `Spark Streaming uses <strong>micro-batch processing</strong> — it buffers events into small time windows (minimum ~100ms) and processes them as mini-batches. This introduces inherent latency and jitter. Flink processes events <strong>one at a time as they arrive</strong> (true streaming), achieving sub-10ms latency.
    <br><br>Additionally, Flink has <strong>first-class event time support with watermarks</strong>, which Spark Streaming lacked at the time. For GPS event processing where events arrive out-of-order from tunnels/buildings, this was critical.
    <br><br>Flink also provides <strong>exactly-once state consistency</strong> via asynchronous checkpointing with Chandy-Lamport barriers, while early Spark Streaming offered only at-least-once guarantees.`,
      tip: 'Mention: micro-batch vs true streaming, event time watermarks, and exactly-once via checkpointing. These three points cover 80% of Uber\'s decision criteria.',
    },
    {
      q: 'What fundamental problem does Flink solve that Hadoop cannot?',
      difficulty: 'easy',
      a: `Hadoop MapReduce is <strong>fundamentally batch-oriented</strong>. It reads all input data, processes it, writes output — then stops. This works for historical analytics but fails for real-time needs because:
    <br><br>1. <strong>Latency</strong>: A Hadoop job takes minutes to hours. Fraud detection requiring < 100ms is impossible.
    <br><br>2. <strong>Unbounded data</strong>: Hadoop reads a finite dataset. Uber's GPS stream never ends — you can't process "all GPS data" in batch.
    <br><br>3. <strong>State across time</strong>: Hadoop has no concept of time-series state. Tracking "driver moved 50mph average over last 5 minutes" requires complex workarounds.
    <br><br>Flink treats data as an <strong>infinite, continuously arriving stream</strong> and maintains state across time natively.`,
      tip: 'Key phrase to use: "bounded vs unbounded datasets" and "event-driven vs scheduled processing".',
    },
    {
      q: 'What is the difference between micro-batch and true streaming?',
      difficulty: 'easy',
      a: `<strong>Micro-batch</strong> (Spark Streaming, early Kafka Streams): Events are buffered into small time windows, then processed as a batch. Even with a 100ms window, you have 100ms of minimum latency + processing time. The processing model is fundamentally batch — operators don't see individual events.
    <br><br><strong>True streaming</strong> (Flink, Storm): Each event is processed immediately upon arrival. No buffering. Operators receive one event at a time. State is updated per-event. Latency is bounded only by processing time (typically < 10ms).
    <br><br>For Uber, the difference matters for ETA: a micro-batch approach updates ETA every 100ms+ while Flink updates it every GPS ping (~1s real-world interval but processed immediately).`,
      tip: 'Draw the contrast clearly: "In micro-batch, the unit of processing is a time window. In true streaming, the unit of processing is a single event."',
    },
    {
      q: 'Why did Apache Storm fail to gain widespread adoption despite being the first true streaming engine?',
      difficulty: 'medium',
      a: `Storm had four critical weaknesses that prevented enterprise adoption:
    <br><br>1. <strong>No state management</strong>: Storm had no built-in state. Every stateful operation required an external call (Redis, Cassandra), adding network latency and failure points.
    <br><br>2. <strong>At-most-once semantics</strong>: Messages could be lost. No replay on failure. This was unacceptable for financial calculations.
    <br><br>3. <strong>No event time</strong>: Storm only knew processing time — when it received an event, not when the event occurred. Out-of-order events produced wrong results.
    <br><br>4. <strong>Complex programming model</strong>: Bolts and spouts required significant boilerplate. No high-level SQL or Table API.
    <br><br>Flink addressed all four: built-in RocksDB state, exactly-once via checkpoints, native event time + watermarks, and a rich DataStream/SQL API.`,
      tip: 'Mention these four by name: state, semantics, event time, and developer experience.',
    },
    {
      q: 'How does Flink\'s approach to fault tolerance differ from Storm\'s?',
      difficulty: 'hard',
      a: `Storm used an <strong>ACK/NACK mechanism</strong> — each message was tracked with a 20-byte token. If a bolt failed to ACK within a timeout, Storm replayed the message. This gave at-most-once or at-least-once semantics but required careful user-side idempotency.
    <br><br>Flink uses <strong>Chandy-Lamport distributed snapshots</strong> (checkpoint barriers). Periodically, the JobManager injects a barrier into every source. Barriers flow through the DAG. When an operator receives a barrier on all inputs, it saves its state to durable storage (HDFS/S3). On failure, Flink restores all operators to the last complete checkpoint and replays from that point.
    <br><br>This gives <strong>exactly-once end-to-end</strong> without requiring idempotent sinks. The cost is slightly increased memory/disk usage and periodic latency spikes during checkpointing.`,
      tip: 'Use the term "Chandy-Lamport distributed snapshots" — it signals deep knowledge. Follow up with "the barrier aligns all inputs before snapshotting" if asked for more detail.',
    },
  ],

  m02: [
    {
      q: 'What is the difference between a bounded and an unbounded stream in Flink?',
      difficulty: 'easy',
      a: `A <strong>bounded stream</strong> has a defined start and end — a finite dataset (e.g., yesterday's ride log file). Flink can process it in batch execution mode, where it may sort by time, use blocking shuffles, and optimize knowing all data is available.
    <br><br>An <strong>unbounded stream</strong> has a start but no end — Uber's GPS ping feed at 1M events/sec never completes. It must be processed incrementally and continuously, which forces decisions about <strong>when</strong> results are "complete enough" to emit (windows, watermarks, triggers).
    <br><br>Flink's DataStream API treats both uniformly: a bounded source is just an unbounded one that happens to signal end-of-stream. This is Flink's "batch is a special case of streaming" philosophy.`,
      tip: 'Say "batch is a special case of streaming in Flink" — it is the core design principle that distinguishes Flink from Spark (which did the reverse).',
    },
    {
      q: 'Explain why true streaming matters for Uber\'s fraud detection versus micro-batch.',
      difficulty: 'medium',
      a: `Fraud on a ride like <strong>R-4471</strong> must be caught in <strong>&lt;100ms</strong> — before payment is authorized. With micro-batch, the minimum latency is the batch interval itself: a 500ms interval means fraud is never caught faster than 500ms, blowing the SLA regardless of processing speed.
    <br><br>With true streaming, each GPS ping and payment event is evaluated the instant it arrives. The fraud ProcessFunction updates per-rider state per-event and can fire an alert immediately via a timer or side output.
    <br><br>Micro-batch also introduces <strong>jitter</strong>: an event arriving at the start of a batch waits the full interval; one at the end barely waits. This non-deterministic latency makes tight SLAs unpredictable.`,
      tip: 'Frame it as an SLA argument: "micro-batch floors your latency at the batch interval; you cannot beat 100ms with a 500ms batch."',
    },
    {
      q: 'Is Flink "latency-first" or "throughput-first"? How does it achieve both?',
      difficulty: 'hard',
      a: `Flink is designed to deliver <strong>both low latency and high throughput</strong>, tuned via the <strong>network buffer timeout</strong>.
    <br><br>Records flow between operators in network buffers. Flink flushes a buffer either when it is full (maximizes throughput — amortizes network cost) or when a timeout expires (bounds latency). The <code>execution.buffer-timeout</code> setting controls this: set it to 0 for minimum latency (flush every record), higher for maximum throughput (fill buffers).
    <br><br>Default is ~100ms. For Uber's 1M pings/sec at 100ms SLA, you lower it to a few ms, trading some throughput per-buffer for tighter latency. This is a continuous dial, not a binary choice — unlike micro-batch where the interval forces a single tradeoff.`,
      tip: 'Mention the buffer-timeout knob by name. It shows you understand Flink lets you trade latency vs throughput on a slider, not a switch.',
    },
    {
      q: 'What does it mean that Flink is a "dataflow" engine?',
      difficulty: 'medium',
      a: `Flink models a job as a <strong>directed acyclic graph (DAG) of operators</strong> — sources, transformations, and sinks connected by data channels. Data <strong>flows continuously</strong> through this graph; operators are long-running and process records as they stream through, rather than being invoked batch-by-batch.
    <br><br>This differs from a batch engine's stage-by-stage execution, where stage N must fully complete before stage N+1 starts. In Flink's pipelined dataflow, all operators run <strong>simultaneously</strong> and records pipeline through them — a GPS ping can be mapped, keyed, and windowed while the next ping is already being ingested.
    <br><br>This pipelining is what enables true streaming with low end-to-end latency.`,
      tip: 'Contrast "pipelined execution" (Flink streaming) with "staged/blocking execution" (classic batch). All operators live at once in Flink.',
    },
  ],

  m03: [
    {
      q: 'What are the components of the Flink JobManager?',
      difficulty: 'medium',
      a: `The JobManager is the master process and has three internal components:
    <br><br>1. <strong>Dispatcher</strong>: Exposes the REST endpoint for job submission, starts a JobMaster per submitted job, and runs the Web UI.
    <br><br>2. <strong>ResourceManager</strong>: Manages <strong>task slots</strong> — the unit of resource allocation. It requests/releases TaskManagers from the cluster manager (YARN, Kubernetes, standalone) and hands slots to JobMasters.
    <br><br>3. <strong>JobMaster</strong>: One per job. It manages the execution of a single JobGraph — scheduling tasks, coordinating checkpoints, and reacting to failures.
    <br><br>So "JobManager" is really Dispatcher + ResourceManager + (one JobMaster per job).`,
      tip: 'Name all three and stress that there is one JobMaster per job but one Dispatcher/ResourceManager per cluster.',
    },
    {
      q: 'What is a task slot, and how does it relate to a TaskManager?',
      difficulty: 'easy',
      a: `A <strong>TaskManager</strong> (worker) is a JVM process that executes tasks. Each TaskManager offers a fixed number of <strong>task slots</strong>, configured by <code>taskmanager.numberOfTaskSlots</code>.
    <br><br>A <strong>slot</strong> represents a fixed slice of the TaskManager's <strong>managed memory</strong> (not CPU — CPU is not isolated). It can hold one parallel pipeline of subtasks. If a TaskManager has 32GB managed memory and 4 slots, each slot gets 8GB of managed memory, isolating state backends from each other.
    <br><br>The total parallelism a cluster can run equals the sum of all slots across all TaskManagers. For 1M pings/sec you size TaskManagers and slots so that total slots ≥ job parallelism.`,
      tip: 'Clarify that slots isolate memory, NOT CPU. This is a common follow-up trap in interviews.',
    },
    {
      q: 'Walk through how a JobGraph becomes an ExecutionGraph.',
      difficulty: 'hard',
      a: `There are four graph representations as a job flows from client to cluster:
    <br><br>1. <strong>StreamGraph</strong>: Built on the client from your DataStream API calls — the logical operator DAG.
    <br><br>2. <strong>JobGraph</strong>: The StreamGraph is optimized — chainable operators are fused into <strong>operator chains</strong> (single tasks) to avoid serialization/network between them. This is what's submitted to the Dispatcher.
    <br><br>3. <strong>ExecutionGraph</strong>: The JobMaster expands the JobGraph by <strong>parallelism</strong> — each JobVertex becomes N ExecutionVertices (one per parallel subtask). This is the physical, schedulable plan.
    <br><br>4. <strong>Physical deployment</strong>: ExecutionVertices are deployed into slots on TaskManagers as running Tasks.
    <br><br>The key transformation is JobGraph→ExecutionGraph: logical operators are parallelized into concrete subtasks.`,
      tip: 'Knowing all four names (StreamGraph, JobGraph, ExecutionGraph, physical) is a strong signal. The JobGraph→ExecutionGraph step is where parallelism is applied.',
    },
    {
      q: 'What is operator chaining and why does Flink do it?',
      difficulty: 'medium',
      a: `<strong>Operator chaining</strong> fuses consecutive operators (e.g., <code>map → filter → flatMap</code>) into a single task that runs in one thread within one slot.
    <br><br>Benefits: it eliminates <strong>serialization, network/buffer handoff, and thread-switching</strong> between chained operators — records are passed as direct method calls. This dramatically increases throughput and cuts latency.
    <br><br>Flink chains operators only when they have the <strong>same parallelism</strong> and a <strong>forward (one-to-one) connection</strong> with no repartitioning. A <code>keyBy</code> breaks the chain because it requires a network shuffle (hash partitioning).
    <br><br>You can control it: <code>.disableChaining()</code>, <code>.startNewChain()</code>, or globally via <code>env.disable_operator_chaining()</code> — useful for isolating a hot operator for profiling.`,
      tip: 'Note that keyBy breaks chaining (shuffle needed), and that you disable chaining mainly to get clean per-operator metrics when debugging.',
    },
  ],

  m04: [
    {
      q: 'Compare application mode, session mode, and per-job mode.',
      difficulty: 'medium',
      a: `These are the three deployment modes, differing in <strong>where the job\'s main() runs</strong> and <strong>cluster lifetime</strong>:
    <br><br><strong>Session mode</strong>: One long-running cluster hosts many jobs. main() runs on the client. Jobs share TaskManagers — cheap for many small jobs but no resource isolation; one job's crash can affect others.
    <br><br><strong>Per-job mode</strong> (deprecated): A dedicated cluster is spun up per job; main() runs on the client. Good isolation but client must do heavy lifting (jar upload, graph generation).
    <br><br><strong>Application mode</strong> (recommended): A dedicated cluster per application, and crucially main() runs on the <strong>JobManager</strong>, not the client. This offloads graph building from the client and gives full isolation — the standard for production jobs like Uber's fraud pipeline.`,
      tip: 'Lead with "application mode runs main() on the JobManager" — that is the distinguishing modern answer and per-job is deprecated in favor of it.',
    },
    {
      q: 'Describe the lifecycle states a Flink task goes through.',
      difficulty: 'medium',
      a: `An individual task (ExecutionVertex) transitions through:
    <br><br><code>CREATED → SCHEDULED → DEPLOYING → INITIALIZING → RUNNING → FINISHED</code>
    <br><br><strong>CREATED</strong>: task exists in the ExecutionGraph. <strong>SCHEDULED</strong>: the scheduler has requested a slot. <strong>DEPLOYING</strong>: task is being shipped to a TaskManager slot. <strong>INITIALIZING</strong>: operator state is being restored (e.g., from a checkpoint) before processing. <strong>RUNNING</strong>: actively processing records. <strong>FINISHED</strong>: completed (only for bounded input).
    <br><br>Failure paths: <strong>CANCELING → CANCELED</strong> (on cancel) or <strong>FAILED</strong> (on error, triggering the restart strategy). A streaming job over unbounded data normally stays in RUNNING indefinitely.`,
      tip: 'Mention that INITIALIZING is where state restore happens — a newer state that interviewers like to hear, since it separates "deployed" from "ready to process".',
    },
    {
      q: 'What happens, step by step, when you submit a job to a Flink cluster?',
      difficulty: 'hard',
      a: `1. The <strong>client</strong> (or JobManager in application mode) builds the StreamGraph, optimizes it into a <strong>JobGraph</strong>, and submits it to the <strong>Dispatcher</strong> via REST.
    <br><br>2. The Dispatcher starts a <strong>JobMaster</strong> for this job.
    <br><br>3. The JobMaster builds the <strong>ExecutionGraph</strong> (applies parallelism) and requests slots from the <strong>ResourceManager</strong>.
    <br><br>4. The ResourceManager allocates slots (requesting new TaskManagers from Kubernetes/YARN if needed) and hands them to the JobMaster.
    <br><br>5. The JobMaster <strong>deploys</strong> ExecutionVertices into slots; TaskManagers start the tasks (DEPLOYING → INITIALIZING → RUNNING).
    <br><br>6. Sources begin reading; the JobMaster starts the <strong>checkpoint coordinator</strong> to inject barriers periodically.`,
      tip: 'Hit the handoffs: Client → Dispatcher → JobMaster → ResourceManager → TaskManagers. Interviewers want to see you know who talks to whom.',
    },
    {
      q: 'What is the difference between scheduling and deployment of a task?',
      difficulty: 'easy',
      a: `<strong>Scheduling</strong> is the logical decision of <strong>which slot</strong> a task should run in — the scheduler requests slots from the ResourceManager and assigns tasks to them, honoring slot-sharing and location constraints. This is the SCHEDULED state.
    <br><br><strong>Deployment</strong> is the physical act of <strong>shipping the task</strong> (its code, config, and assigned state handles) to the chosen TaskManager and starting it there. This is the DEPLOYING state.
    <br><br>In short: scheduling decides <em>where</em>; deployment makes it <em>happen</em>. Flink's default <strong>pipelined region scheduling</strong> schedules whole connected regions together so a streaming pipeline starts atomically.`,
      tip: 'A one-liner nails it: "scheduling picks the slot, deployment ships the task to it." Bonus: mention pipelined region scheduling.',
    },
  ],

  m05: [
    {
      q: 'What is the difference between parallelism and a subtask?',
      difficulty: 'easy',
      a: `<strong>Parallelism</strong> is the number of parallel instances of an operator. If a <code>keyBy().process()</code> operator has parallelism 8, Flink runs 8 copies of it.
    <br><br>A <strong>subtask</strong> is one of those parallel instances — one physical thread processing a subset of the data. Operator with parallelism 8 = 8 subtasks, each handling roughly 1/8 of the keyed stream.
    <br><br>For Uber at 1M pings/sec, you might set the window operator's parallelism to 128 so each subtask handles ~8K pings/sec. Parallelism can be set per-operator (<code>.set_parallelism(n)</code>), per-job (<code>env.set_parallelism(n)</code>), or cluster-default.`,
      tip: 'One sentence: "parallelism is the count; a subtask is one instance." Then give the Uber sizing example to show you think about throughput per subtask.',
    },
    {
      q: 'Explain slot sharing. Why does Flink enable it by default?',
      difficulty: 'medium',
      a: `<strong>Slot sharing</strong> lets subtasks from <strong>different operators of the same job</strong> share a single slot, as long as they belong to the same <strong>slot sharing group</strong> (default: all operators share one group).
    <br><br>So a slot can hold one full parallel pipeline — e.g., <code>source → map → keyBy → window → sink</code> subtasks all in one slot. Benefits:
    <br><br>1. <strong>Fewer slots needed</strong>: a job needs only as many slots as its <em>highest</em> operator parallelism, not the sum of all operators.
    <br><br>2. <strong>Better resource balance</strong>: a heavy operator (window) and a light one (source) co-locate, evening out CPU use.
    <br><br>You can isolate a heavy operator with <code>.slot_sharing_group("name")</code> to give it dedicated slots.`,
      tip: 'Key takeaway: "a job needs slots equal to its max operator parallelism, not the sum." That is the number interviewers test.',
    },
    {
      q: 'What is max parallelism, and why can\'t you change it after a job starts?',
      difficulty: 'hard',
      a: `<strong>Max parallelism</strong> (<code>setMaxParallelism</code>) defines the number of <strong>key groups</strong> — the atomic units into which keyed state is partitioned. Default is derived from parallelism (roundup to power of 2, between 128 and 32768).
    <br><br>Each key is hashed to a key group; key groups are distributed across subtasks. When you rescale, Flink reassigns whole <strong>key groups</strong> to subtasks — never individual keys — which is why rescaling is efficient and correct.
    <br><br>You <strong>cannot change max parallelism</strong> after the first checkpoint/savepoint because it would change the key-group → key mapping, making existing state unrestorable. Your actual parallelism can only scale up to maxParallelism.
    <br><br><strong>Set it deliberately at launch</strong> — too low caps future scaling; too high adds metadata overhead and limits per-subtask key groups.`,
      tip: 'The phrase to use is "key groups are the unit of state redistribution." Stress that maxParallelism is fixed for the life of the job — set it high enough up front.',
    },
    {
      q: 'How does Flink rescale a keyed stateful job? What constrains it?',
      difficulty: 'hard',
      a: `To rescale, you take a <strong>savepoint</strong>, stop the job, and restart with a new parallelism. Flink redistributes state by reassigning <strong>key groups</strong> to the new set of subtasks. Because each key group's keys travel together, state stays correct and no key is split across subtasks.
    <br><br>Constraints:
    <br><br>1. New parallelism must be <strong>≤ maxParallelism</strong> (number of key groups). You can't have more subtasks than key groups.
    <br><br>2. For even load, parallelism should ideally <strong>divide evenly into maxParallelism</strong>, otherwise some subtasks get more key groups than others (skew).
    <br><br>Flink 1.x can also do this via <strong>reactive mode</strong> (adaptive scheduler auto-rescales to available slots). For Uber's surge spikes, you'd savepoint and scale the window operator up during peak hours.`,
      tip: 'Mention that parallelism must be ≤ maxParallelism and that uneven division causes key-group skew. Reactive/adaptive mode is a nice bonus to name.',
    },
  ],

  m06: [
    {
      q: 'Explain the difference between map, flatMap, and filter.',
      difficulty: 'easy',
      a: `All three are stateless one-input transformations:
    <br><br><strong>map</strong>: 1 input → exactly 1 output. Transforms each record (e.g., parse a raw GPS ping into a typed event).
    <br><br><strong>flatMap</strong>: 1 input → 0..N outputs via a collector. Useful for splitting (one batched message into many pings) or filtering-plus-transforming in one pass.
    <br><br><strong>filter</strong>: 1 input → 0 or 1 output. Keeps records where a predicate is true (e.g., drop pings with invalid coordinates).
    <br><br>flatMap is the most general of the three — map and filter are special cases of it.`,
      tip: 'Describe them by cardinality: map is 1→1, filter is 1→0or1, flatMap is 1→0..N. That framing instantly shows you understand them.',
    },
    {
      q: 'What does keyBy do, and what is its performance implication?',
      difficulty: 'medium',
      a: `<code>keyBy</code> logically partitions a stream by a key, so all records with the same key are routed to the <strong>same subtask</strong>. This is what enables keyed state and keyed windows — e.g., <code>keyBy(ping -> ping.ride_id)</code> ensures all of R-4471's pings land on one subtask that holds that ride's state.
    <br><br>Mechanically, keyBy applies a <strong>hash partition</strong>: <code>key.hashCode() → key group → subtask</code>. This requires a <strong>network shuffle</strong> (records serialized and sent across the network), so it <strong>breaks operator chaining</strong> and adds cost.
    <br><br>The big risk is <strong>key skew</strong>: if one key (a hot airport zone) gets disproportionate traffic, its subtask becomes a bottleneck. keyBy is logical, not physical — it does not reduce data.`,
      tip: 'Stress that keyBy triggers a shuffle and watch for key skew. Interviewers love the follow-up "what if one key is 10x hotter than the rest?"',
    },
    {
      q: 'When would you use reduce versus a ProcessFunction?',
      difficulty: 'medium',
      a: `<strong>reduce</strong> (and aggregate) is for <strong>incremental aggregation</strong> on a keyed/windowed stream — combine the running result with each new element (e.g., running sum of fare, max speed). It's efficient (stores only the accumulator) but limited: no access to timers, no multiple outputs, no raw state control.
    <br><br><strong>ProcessFunction</strong> (KeyedProcessFunction) is the low-level primitive giving full power:
    <br><br>• Access to <strong>keyed state</strong> (ValueState/MapState/etc.)
    <br><br>• <strong>Event-time and processing-time timers</strong> (fire callbacks)
    <br><br>• <strong>Side outputs</strong> (multiple output streams, e.g., fraud alerts)
    <br><br>• Access to the current key, timestamp, and watermark.
    <br><br>Uber's fraud detection uses a KeyedProcessFunction because it needs timers (debounce) and side outputs (alert vs. normal path) — things reduce can't do.`,
      tip: 'Rule of thumb: "reduce for simple incremental math; ProcessFunction when you need state + timers + side outputs." Timers are the biggest differentiator.',
    },
    {
      q: 'What partitioning strategies does Flink offer besides keyBy?',
      difficulty: 'hard',
      a: `Beyond <code>keyBy</code> (hash partition), Flink offers several physical partitioning operators:
    <br><br><strong>rebalance()</strong>: Round-robin to all downstream subtasks — the go-to fix for <strong>skew</strong> after a filter that unevenly thins data.
    <br><br><strong>rescale()</strong>: Round-robin but only to a local subset of downstream subtasks — cheaper than rebalance (avoids full network shuffle) when parallelisms are multiples.
    <br><br><strong>broadcast()</strong>: Sends every record to <strong>all</strong> downstream subtasks — used for broadcast state (e.g., pushing updated fraud rules to all subtasks).
    <br><br><strong>shuffle()</strong>: Random partition.
    <br><br><strong>forward()</strong>: One-to-one, same-parallelism (default, enables chaining).
    <br><br><strong>global()</strong>: Everything to subtask 0 (rare, avoid at scale).
    <br><br>And <strong>custom partitionCustom()</strong> for your own logic.`,
      tip: 'Knowing rebalance (skew fix) and broadcast (broadcast state) covers 90% of real use. Mention rescale as the cheaper local variant of rebalance.',
    },
  ],

  m07: [
    {
      q: 'How does the Flink Kafka source achieve parallel, scalable reads?',
      difficulty: 'medium',
      a: `The modern <code>KafkaSource</code> (FLIP-27 unified Source API) splits work between a <strong>SplitEnumerator</strong> and <strong>SourceReaders</strong>:
    <br><br><strong>SplitEnumerator</strong> runs on the JobManager. It discovers Kafka <strong>partitions</strong> (each partition = one "split") and assigns splits to reader subtasks. It also handles dynamic partition discovery when topics grow.
    <br><br><strong>SourceReaders</strong> run on TaskManagers (one per parallel subtask). Each reader consumes its assigned partitions, deserializes records, and extracts timestamps/watermarks.
    <br><br>Parallelism is bounded by partition count: if a topic has 128 partitions, source parallelism beyond 128 leaves readers idle. For 1M pings/sec, you provision enough Kafka partitions so each reader subtask handles a manageable share.`,
      tip: 'Name the FLIP-27 split: SplitEnumerator (JM, assigns partitions) + SourceReader (TM, reads them). Note source parallelism is capped by partition count.',
    },
    {
      q: 'How does Flink guarantee exactly-once when writing to Kafka?',
      difficulty: 'hard',
      a: `The Kafka sink uses <strong>two-phase commit (2PC)</strong> tied to Flink's checkpoints, leveraging Kafka's <strong>transactions</strong>:
    <br><br><strong>Phase 1 (pre-commit)</strong>: Between checkpoints, the sink writes records to Kafka inside an open transaction (not yet visible to consumers). When a checkpoint barrier arrives, the sink <strong>flushes and pre-commits</strong> — the transaction is prepared but not committed — and stores the transaction ID in state.
    <br><br><strong>Phase 2 (commit)</strong>: Once the JobManager confirms the <em>entire</em> checkpoint succeeded (<code>notifyCheckpointComplete</code>), the sink <strong>commits</strong> the Kafka transaction, making records visible.
    <br><br>On failure, Flink restores the last checkpoint and aborts dangling transactions. Consumers must use <code>isolation.level=read_committed</code> to only see committed data. This gives true end-to-end exactly-once.`,
      tip: 'Say "two-phase commit aligned with checkpoints" and remember the consumer side: read_committed. The transaction ID being in state is the detail that impresses.',
    },
    {
      q: 'What guarantees does FileSink provide, and how?',
      difficulty: 'medium',
      a: `<code>FileSink</code> gives <strong>exactly-once</strong> for file output via a <strong>rolling / commit-on-checkpoint</strong> scheme:
    <br><br>Data is written to <strong>in-progress</strong> part files. On each checkpoint, in-progress files are moved to <strong>pending</strong>. Only after the checkpoint <em>completes</em> are pending files <strong>committed</strong> (renamed/finalized to visible). On failure, uncommitted (in-progress/pending) files are discarded and reprocessed.
    <br><br>Because committing uses atomic rename/finalize operations tied to checkpoint completion, no partial or duplicate data becomes visible. You configure <strong>rolling policy</strong> (part size / rollover interval / inactivity) and a <strong>bucket assigner</strong> (e.g., date/hour partitions for Uber's ride archive to S3/HDFS).`,
      tip: 'Key phrase: "in-progress → pending → committed, finalized only on checkpoint completion." Same commit-on-checkpoint pattern as the Kafka 2PC sink.',
    },
    {
      q: 'What makes a Flink sink transactional versus idempotent, and when do you use each?',
      difficulty: 'hard',
      a: `There are two ways to achieve end-to-end exactly-once at the sink:
    <br><br><strong>Transactional (2PC) sink</strong>: Buffers writes in a transaction and commits only on checkpoint completion (Kafka, FileSink). Works even when the external system can't deduplicate, but adds commit latency (data visible only after checkpoint) and requires the system to support transactions.
    <br><br><strong>Idempotent sink</strong>: Writes immediately but uses an upsert key so replaying the same record overwrites rather than duplicates (e.g., JDBC/Elasticsearch upsert keyed by primary key). Lower latency, simpler, but requires a natural unique key and an upsert-capable sink.
    <br><br>For Uber: ride archive → transactional FileSink; "latest driver location" table → idempotent upsert keyed by driver_id.`,
      tip: 'Frame the tradeoff: transactional works anywhere but adds checkpoint-visibility latency; idempotent is lower-latency but needs a unique key and upsert support.',
    },
  ],

  m08: [
    {
      q: 'What are the three notions of time in Flink?',
      difficulty: 'easy',
      a: `<strong>Event time</strong>: when the event <em>actually occurred</em> at the source — the timestamp embedded in the GPS ping (e.g., the phone's clock when R-4471 pinged). Deterministic and replayable.
    <br><br><strong>Processing time</strong>: the wall-clock time of the machine when Flink <em>processes</em> the event. Lowest latency, no watermarks needed, but non-deterministic — results depend on system speed and load.
    <br><br><strong>Ingestion time</strong>: the time the event <em>entered Flink</em> (assigned at the source). A middle ground — more stable than event time but still doesn't reflect real occurrence time.
    <br><br>Production streaming (fraud, ETA, billing) almost always uses <strong>event time</strong> for correctness under out-of-order and delayed data.`,
      tip: 'Define all three, then say "use event time for correctness, processing time only when latency matters more than accuracy." Ingestion time is rarely used today.',
    },
    {
      q: 'Why is processing time insufficient for Uber\'s analytics?',
      difficulty: 'medium',
      a: `GPS pings arrive <strong>out of order and delayed</strong> — a driver passes through a tunnel, and 5 seconds of pings buffer on the phone, then arrive in a burst. With processing time, those pings get bucketed into whatever window is open <em>when they arrive</em>, not when they occurred.
    <br><br>Consequences: a "5-minute speed average" window would mis-assign tunnel pings, producing wrong speeds and ETAs. Results also become <strong>non-reproducible</strong> — reprocessing the same data later (replay from Kafka) yields different window assignments.
    <br><br>Event time fixes this: each ping carries its true timestamp, so it lands in the correct window regardless of arrival order, and reprocessing is deterministic.`,
      tip: 'The killer point is reproducibility: "with event time, replaying from Kafka gives identical results; with processing time it does not." Interviewers love that.',
    },
    {
      q: 'How do you assign timestamps and watermarks in Flink?',
      difficulty: 'medium',
      a: `You attach a <strong>WatermarkStrategy</strong> to the source (or via <code>assign_timestamps_and_watermarks</code>), which bundles two things:
    <br><br>1. A <strong>TimestampAssigner</strong> — extracts the event-time timestamp from each record (e.g., read <code>ping.event_ts</code>).
    <br><br>2. A <strong>WatermarkGenerator</strong> — emits watermarks tracking event-time progress.
    <br><br>In PyFlink:
    <br><br><code>WatermarkStrategy.for_bounded_out_of_orderness(Duration.of_seconds(5)).with_timestamp_assigner(MyAssigner())</code>
    <br><br>Best practice is to assign at the <strong>source</strong> (the KafkaSource takes a WatermarkStrategy directly) so per-partition watermarks are generated correctly before any shuffle. Assigning after a keyBy loses per-partition ordering information.`,
      tip: 'Say "assign watermarks at the source, not after keyBy" and know the two pieces: TimestampAssigner + WatermarkGenerator. The for_bounded_out_of_orderness factory is the common one.',
    },
    {
      q: 'Can a single Flink job mix event time and processing time?',
      difficulty: 'hard',
      a: `Yes. Since Flink 1.12, event time is the default but <strong>time characteristic is no longer a global job setting</strong> — it's chosen per operation.
    <br><br>You can use <strong>event-time windows/timers</strong> for correctness-critical paths (billing, fraud scoring on R-4471) while using <strong>processing-time timers</strong> for operational concerns (e.g., a timeout that fires after N seconds of wall-clock inactivity, or periodic state cleanup).
    <br><br>A KeyedProcessFunction exposes both: <code>ctx.timer_service().register_event_time_timer(...)</code> and <code>register_processing_time_timer(...)</code>. A common pattern: event-time logic for the result, plus a processing-time timer as a safety net to flush/alert if an expected event never arrives (so a stalled watermark doesn't hang the pipeline forever).`,
      tip: 'Yes — and give the pattern: event-time for correctness, a processing-time timer as a wall-clock safety net against stalled watermarks. That nuance is senior-level.',
    },
  ],

  m09: [
    {
      q: 'What is a watermark and what does it assert?',
      difficulty: 'easy',
      a: `A <strong>watermark</strong> is a special record that flows in-band with the stream carrying a timestamp <code>W(t)</code>. It asserts: <strong>"no more events with event time ≤ t are expected"</strong> — event time has progressed to t.
    <br><br>Watermarks are how Flink decides when to <strong>fire event-time windows and timers</strong>. A window for [10:00, 10:05) fires when a watermark ≥ 10:05 arrives, signaling that window is "complete."
    <br><br>They are a <strong>heuristic</strong>, not a guarantee — they trade completeness for progress. A tighter watermark (small delay) gives lower latency but risks more late events; a looser one waits longer, catching more stragglers at the cost of latency.`,
      tip: 'Define it as an assertion: "no events older than t will arrive." Then flag it as a heuristic balancing latency vs completeness — the core tradeoff.',
    },
    {
      q: 'How is a bounded-out-of-orderness watermark computed?',
      difficulty: 'medium',
      a: `For <strong>bounded out-of-orderness</strong> with a delay Δ (the "boundedOutOfOrderness" duration), the watermark is:
    <br><br><code>W = maxEventTimeSeen − Δ − 1ms</code>
    <br><br>The generator tracks the <strong>maximum event-time timestamp observed so far</strong> and subtracts the allowed lateness bound Δ. So if the latest ping is at 10:00:30 and Δ = 5s, the watermark is ~10:00:25 — Flink assumes any event older than 25s past the max has probably already arrived.
    <br><br>Choosing Δ is an SLA decision: measure your real out-of-orderness (p99 delay) from Kafka. For Uber GPS, Δ might be a few seconds to absorb tunnel/signal delays. Too small → excessive late data; too large → windows fire slowly.`,
      tip: 'Write the formula: W = maxEventTime − Δ. Then say "choose Δ from your p99 observed lateness." Showing you measure it (not guess) is the senior signal.',
    },
    {
      q: 'What is watermark idleness and why does it matter?',
      difficulty: 'hard',
      a: `Flink's event-time clock for an operator is the <strong>minimum watermark across all its input channels/partitions</strong> — a window only fires when <em>every</em> upstream input has advanced past the window end.
    <br><br>Problem: if one Kafka partition goes <strong>idle</strong> (no traffic — e.g., a low-activity city at 3am), its watermark stops advancing, pinning the operator's min-watermark and <strong>stalling all windows</strong> even though other partitions are flowing.
    <br><br>Fix: <code>WatermarkStrategy...with_idleness(Duration.of_minutes(1))</code>. After the timeout, the idle partition is <strong>marked idle and excluded</strong> from the min-watermark computation, so the active partitions' watermarks can advance. When the partition sees data again, it rejoins.`,
      tip: 'The key mechanism is "operator watermark = min over all inputs." Idleness prevents one silent partition from freezing event time. Interviewers test this constantly.',
    },
    {
      q: 'How does Flink handle late data, and what are side outputs?',
      difficulty: 'medium',
      a: `An event is <strong>late</strong> if it arrives after the watermark has already passed its event time (i.e., after its window would have fired).
    <br><br>Flink gives three options:
    <br><br>1. <strong>Allowed lateness</strong> (<code>.allowed_lateness(Duration...)</code>): the window keeps its state for an extra grace period after firing; late events within that period re-fire the window (an update). State is purged after.
    <br><br>2. <strong>Side output for late data</strong> (<code>.side_output_late_data(tag)</code>): events later than allowed-lateness are routed to a separate stream instead of being silently dropped — you can log, alert, or reconcile them (e.g., Uber's delayed billing adjustments).
    <br><br>3. <strong>Default</strong>: drop silently.
    <br><br>Side outputs (<code>OutputTag</code>) are a general mechanism for emitting a secondary stream from a ProcessFunction — also used for fraud alerts.`,
      tip: 'Name all three: allowed lateness (re-fire), side output (capture, don\'t lose), or drop. Stress that without a side output, late data silently vanishes — a classic production bug.',
    },
  ],

  m10: [
    {
      q: 'Compare tumbling, sliding, and session windows.',
      difficulty: 'easy',
      a: `<strong>Tumbling</strong>: fixed-size, non-overlapping, contiguous windows. Every event belongs to exactly one window (e.g., "fare total per 5-minute block"). Defined by size only.
    <br><br><strong>Sliding</strong>: fixed-size windows that <strong>overlap</strong>, defined by size + slide. E.g., a 5-minute window sliding every 1 minute gives a smoothed "rides in the last 5 minutes, updated each minute." An event can belong to multiple windows (size/slide of them).
    <br><br><strong>Session</strong>: dynamic, gap-based windows — a window stays open while events keep arriving within a <strong>session gap</strong>, and closes after a period of inactivity. No fixed size. Perfect for "a rider's activity session" that ends after 15 min of no interaction.
    <br><br>Tumbling and sliding are <em>aligned to the epoch</em>; session windows are per-key and data-driven.`,
      tip: 'Contrast on overlap and determinism: tumbling (no overlap), sliding (overlap, one event in many windows), session (gap-driven, variable size).',
    },
    {
      q: 'What is a window trigger and when would you customize it?',
      difficulty: 'medium',
      a: `A <strong>Trigger</strong> determines <em>when</em> a window's results are computed and emitted. The default <strong>EventTimeTrigger</strong> fires once, when the watermark passes the window end.
    <br><br>You customize a trigger for <strong>early or late firing</strong>:
    <br><br>• <strong>Early results</strong>: fire every N seconds or every K elements <em>before</em> the window closes — useful for a live-updating dashboard (surge pricing preview) that can't wait for the full window.
    <br><br>• <strong>Late updates</strong>: combined with allowed lateness, re-fire when late events arrive.
    <br><br>A trigger returns FIRE, FIRE_AND_PURGE, CONTINUE, or PURGE. <strong>ContinuousEventTimeTrigger</strong> and <strong>CountTrigger</strong> are built-in options. Note: firing computes a result; <strong>purging</strong> clears window state.`,
      tip: 'Separate "fire" (emit a result) from "purge" (clear state). Mention early-firing for live dashboards as the classic reason to customize.',
    },
    {
      q: 'What is the difference between incremental aggregation and a full ProcessWindowFunction?',
      difficulty: 'hard',
      a: `<strong>Incremental aggregation</strong> (ReduceFunction / AggregateFunction): combines each element into an accumulator <em>as it arrives</em>. Only the <strong>accumulator</strong> is stored per window — tiny state, no buffering of raw events. But you lose access to window metadata and all elements.
    <br><br><strong>ProcessWindowFunction</strong>: receives an <strong>iterable of all elements</strong> at fire time, plus window metadata (start/end) and state. Powerful (e.g., compute median, access window bounds) but <strong>buffers every element</strong> until the window fires — expensive state at 1M pings/sec.
    <br><br><strong>Best practice — combine them</strong>: pass an AggregateFunction <em>plus</em> a ProcessWindowFunction. Flink aggregates incrementally (small state) and hands the single pre-aggregated result to the ProcessWindowFunction, which adds window metadata. You get efficiency <em>and</em> context.`,
      tip: 'The senior answer is the combination: "aggregate incrementally, then pass the accumulator to a ProcessWindowFunction for metadata." Never buffer all raw events at Uber scale.',
    },
    {
      q: 'How do allowed lateness and window state purging interact?',
      difficulty: 'medium',
      a: `When a window fires (watermark passes window end), Flink emits a result but — if <strong>allowed lateness &gt; 0</strong> — <strong>keeps the window state</strong> for that extra grace period instead of purging it.
    <br><br>During the grace period, each <strong>late event</strong> that still falls within allowed lateness triggers a <strong>re-fire</strong>, emitting an updated result (downstream must handle updates/retractions). Only after <code>windowEnd + allowedLateness</code> passes is the window state <strong>purged</strong>.
    <br><br>The tradeoff: longer allowed lateness = more correct results under straggling data, but <strong>more state retained</strong> (every live window holds its contents/accumulator longer) and more downstream updates. For Uber billing you might allow a few minutes; for a real-time surge dashboard, little to none.`,
      tip: 'Key point: allowed lateness delays purging and causes re-fires (updates). State cost grows with the lateness window — balance correctness vs memory.',
    },
  ],

  m11: [
    {
      q: 'What is the difference between keyed state and operator state?',
      difficulty: 'medium',
      a: `<strong>Keyed state</strong> is bound to a <strong>key</strong> and only accessible on a keyed stream (after <code>keyBy</code>). Flink automatically scopes it to the current key — each key (each ride/driver) has its own isolated ValueState/MapState/etc. This is the dominant kind: per-ride fraud counters, per-driver last location.
    <br><br><strong>Operator state</strong> is bound to a <strong>parallel operator instance</strong> (subtask), not a key. There's one state per subtask. Classic use: a Kafka source storing its <strong>partition offsets</strong>. It's redistributed on rescale via schemes like <strong>even-split</strong> or <strong>union</strong> redistribution.
    <br><br>Rule of thumb: keyed state for per-entity logic; operator state for source/sink bookkeeping that isn't keyed.`,
      tip: 'Keyed = per key (needs keyBy); operator = per subtask (Kafka offsets are the canonical example). Mention operator state has union/even-split redistribution on rescale.',
    },
    {
      q: 'When would you use ValueState vs ListState vs MapState?',
      difficulty: 'easy',
      a: `All three are <strong>keyed</strong> state primitives:
    <br><br><strong>ValueState&lt;T&gt;</strong>: a single value per key. E.g., the last known location or running fraud score for a ride. Access with <code>.value()</code> / <code>.update()</code>.
    <br><br><strong>ListState&lt;T&gt;</strong>: a list per key, append-only semantics. E.g., buffer recent pings for R-4471 before windowing. <code>.add()</code> / <code>.get()</code>.
    <br><br><strong>MapState&lt;K,V&gt;</strong>: a keyed map per key. E.g., per-ride counts by event-type, or a feature map. Crucially, with RocksDB each entry is a <strong>separate key</strong>, so you can read/update one entry without deserializing the whole map — much cheaper than storing a HashMap in ValueState.
    <br><br>Prefer MapState over "ValueState of a map" for large/partial-access maps.`,
      tip: 'The MapState efficiency point is the one to drop: "with RocksDB, MapState lets you touch one entry without deserializing the whole structure." That beats a map-in-ValueState.',
    },
    {
      q: 'Compare the HashMap (heap) state backend with the RocksDB state backend.',
      difficulty: 'hard',
      a: `<strong>HashMapStateBackend</strong>: keeps state as objects on the <strong>JVM heap</strong>. Fastest access (no serialization on read), but state size is bounded by heap memory and large state risks GC pauses/OOM. Checkpoints snapshot the full heap state.
    <br><br><strong>EmbeddedRocksDBStateBackend</strong>: keeps state in <strong>RocksDB</strong>, an on-disk LSM store (off-heap, spills to local disk). State can be <strong>far larger than memory</strong> (TBs), with no GC pressure since it's off-heap/serialized. Access requires serialization (slower), and it supports <strong>incremental checkpoints</strong> (only changed SST files uploaded).
    <br><br>Choice: HashMap for small, latency-critical state; RocksDB for large state (Uber's millions of concurrent rides/drivers). RocksDB + incremental checkpoints is the production default at scale.`,
      tip: 'Decision rule: "RocksDB when state &gt; memory or you need incremental checkpoints; HashMap for small, hot state." Mention incremental checkpoints are RocksDB-only.',
    },
    {
      q: 'How does state TTL work, and why is it critical at Uber scale?',
      difficulty: 'medium',
      a: `<strong>State TTL</strong> (<code>StateTtlConfig</code>) attaches an expiration to keyed state so stale entries are <strong>automatically cleaned up</strong>, preventing unbounded state growth.
    <br><br>Key options:
    <br><br>• <strong>Update type</strong>: refresh the TTL on write only (<code>OnCreateAndWrite</code>) or on read too (<code>OnReadAndWrite</code>).
    <br><br>• <strong>Visibility</strong>: whether expired-but-not-yet-cleaned values are returned (<code>NeverReturnExpired</code> for correctness).
    <br><br>• <strong>Cleanup</strong>: in RocksDB via the <strong>compaction filter</strong> (cleans during background compaction), plus incremental/full-snapshot cleanup.
    <br><br>Critical for Uber: without TTL, per-ride state for completed rides would accumulate forever — millions of dead keys bloating RocksDB and slowing checkpoints. TTL (e.g., expire ride state 1 hour after completion) keeps state size bounded and stable.`,
      tip: 'Stress unbounded-state prevention: "keyed state never disappears on its own — completed-ride keys live forever unless you set TTL or clear() them." A top production gotcha.',
    },
  ],

  m12: [
    {
      q: 'Explain the Chandy-Lamport algorithm as Flink applies it to checkpointing.',
      difficulty: 'hard',
      a: `Flink's checkpointing is an <strong>asynchronous barrier snapshot</strong>, derived from Chandy-Lamport distributed snapshots:
    <br><br>1. The <strong>checkpoint coordinator</strong> (JobManager) periodically injects a <strong>checkpoint barrier</strong> (with an ID) into every source.
    <br><br>2. Barriers flow downstream <strong>in-band</strong> with records. When a source gets the barrier, it snapshots its offsets.
    <br><br>3. At an operator with multiple inputs, <strong>barrier alignment</strong> occurs: the operator waits until it has received the barrier on <em>all</em> input channels, buffering faster inputs, so its snapshot reflects a consistent cut.
    <br><br>4. Once aligned, the operator <strong>asynchronously</strong> snapshots its state to durable storage and forwards the barrier downstream.
    <br><br>5. When all operators (including sinks) acknowledge, the coordinator marks the checkpoint complete.
    <br><br>The snapshot is asynchronous so processing barely pauses — the key innovation over naive stop-the-world snapshots.`,
      tip: 'Say "asynchronous barrier snapshotting" and emphasize alignment creates a consistent global cut, while async upload means minimal stall. Those two words win the question.',
    },
    {
      q: 'What is barrier alignment, and what problem does unaligned checkpointing solve?',
      difficulty: 'hard',
      a: `<strong>Aligned checkpointing</strong>: at a multi-input operator, when a barrier arrives on one channel, the operator <strong>blocks that channel</strong> and buffers its records until the barrier arrives on <em>all</em> channels, then snapshots. Under <strong>backpressure</strong>, a slow channel delays the barrier, so alignment can take a long time — checkpoint duration balloons and may time out.
    <br><br><strong>Unaligned checkpointing</strong> (Flink 1.11+): the barrier <strong>overtakes</strong> buffered records — the operator snapshots immediately and includes the <strong>in-flight buffered data</strong> (the records between barriers) as part of the checkpoint. This decouples checkpoint duration from backpressure, so checkpoints still complete under heavy load.
    <br><br>Tradeoff: unaligned checkpoints store in-flight data, so they're <strong>larger</strong>. Use them when checkpoints time out under backpressure (Uber surge spikes); aligned otherwise.`,
      tip: 'The one-liner: "unaligned checkpoints let the barrier jump the queue and snapshot in-flight buffers, so checkpoint time doesn\'t depend on backpressure — at the cost of bigger checkpoints."',
    },
    {
      q: 'What are incremental checkpoints and which backend supports them?',
      difficulty: 'medium',
      a: `<strong>Incremental checkpoints</strong> upload only the state that <strong>changed since the last checkpoint</strong>, rather than the full state every time. Only the <strong>RocksDB backend</strong> supports them.
    <br><br>Mechanism: RocksDB stores state in immutable <strong>SST files</strong> (LSM-tree). An incremental checkpoint references previously-uploaded SST files and uploads only the <strong>new/changed</strong> ones. This makes each checkpoint far cheaper for large, slowly-changing state.
    <br><br>For Uber with TB-scale state and short checkpoint intervals, full checkpoints would re-upload terabytes each time — infeasible. Incremental checkpointing uploads only deltas.
    <br><br>Caveat: because checkpoints share SST files, <strong>recovery</strong> may need to assemble state from multiple checkpoints, and checkpoint cleanup must track file references. The HashMap backend always does full snapshots.`,
      tip: 'RocksDB only, via SST-file deltas. Mention the recovery caveat (shared files across checkpoints) to show depth beyond "it uploads less."',
    },
    {
      q: 'What is the difference between exactly-once and at-least-once checkpointing in Flink?',
      difficulty: 'medium',
      a: `This is the <strong>checkpointing mode</strong> (<code>CheckpointingMode</code>), which controls barrier handling:
    <br><br><strong>EXACTLY_ONCE</strong> (default): uses <strong>barrier alignment</strong> — operators wait for barriers on all inputs so each record is reflected in state exactly once across a recovery. Correct state, but alignment adds latency under backpressure.
    <br><br><strong>AT_LEAST_ONCE</strong>: operators <strong>do not align</strong> — they snapshot as soon as the first barrier arrives and keep processing records from faster channels. On recovery, some records between barriers may be <strong>reprocessed</strong>, so counts/state can be over-counted.
    <br><br>Note this is about <strong>state consistency</strong>; true <strong>end-to-end</strong> exactly-once also requires transactional/idempotent sinks (2PC). Use at-least-once only for latency-sensitive jobs tolerant of duplicates (e.g., approximate monitoring), never for billing or fraud.`,
      tip: 'Distinguish state-level from end-to-end: exactly-once state (alignment) is necessary but not sufficient — you also need a 2PC/idempotent sink for true end-to-end guarantees.',
    },
  ],

  m13: [
    {
      q: 'What happens, step by step, when a TaskManager fails?',
      difficulty: 'medium',
      a: `1. The JobManager <strong>detects</strong> the failure (heartbeat timeout / lost connection).
    <br><br>2. It transitions affected tasks to FAILED and consults the <strong>restart strategy</strong> to decide whether/when to restart.
    <br><br>3. It <strong>cancels and restarts</strong> the affected tasks (by default, with region failover, only the affected pipelined region — not the whole job).
    <br><br>4. Tasks are <strong>redeployed</strong> into available slots (requesting a new TaskManager from Kubernetes/YARN if needed).
    <br><br>5. Each restarted operator <strong>restores its state from the last completed checkpoint</strong> (INITIALIZING state).
    <br><br>6. <strong>Sources rewind</strong> to the offsets stored in that checkpoint (e.g., Kafka consumer resets to checkpointed offsets) and reprocessing resumes.
    <br><br>Because sources rewind and state is consistent, the net effect is exactly-once — no data lost or double-counted.`,
      tip: 'The two load-bearing facts: operators restore state from the last checkpoint, and sources rewind to checkpointed offsets. Together that is what makes recovery exactly-once.',
    },
    {
      q: 'Compare Flink\'s restart strategies.',
      difficulty: 'medium',
      a: `Configured via <code>restart-strategy</code>:
    <br><br><strong>fixed-delay</strong>: restart up to N times with a fixed delay between attempts. Simple; good when failures are transient.
    <br><br><strong>failure-rate</strong>: restart as long as the failure <em>rate</em> stays under a threshold (e.g., ≤3 failures per 5 min), else fail the job. Prevents an endless crash-loop on a persistent problem.
    <br><br><strong>exponential-delay</strong>: back off exponentially between restarts (up to a max), resetting after stability — avoids hammering a struggling downstream system.
    <br><br><strong>none</strong> (no-restart): fail immediately.
    <br><br>Default is fixed-delay when checkpointing is enabled. For production (Uber), failure-rate or exponential-delay is preferred so a bad poison record or down dependency doesn't thrash the cluster forever.`,
      tip: 'Name fixed-delay, failure-rate, exponential-delay, none. Recommend failure-rate/exponential for prod to avoid infinite crash-loops on a persistent failure.',
    },
    {
      q: 'What is region failover and why is it more efficient than full restart?',
      difficulty: 'hard',
      a: `Flink's default failover is <strong>RestartPipelinedRegionFailoverStrategy</strong>. The ExecutionGraph is split into <strong>pipelined regions</strong> — sets of tasks connected by pipelined (streaming) data exchanges. A keyBy/shuffle boundary with blocking exchange separates regions.
    <br><br>On a task failure, Flink restarts only the <strong>region(s) affected</strong> by that failure, not the entire job. In a fully pipelined streaming job (all forward/pipelined edges), one region often spans the whole pipeline, so it may restart everything — but in jobs with blocking exchanges (batch, or jobs with multiple independent pipelines), only the broken region restarts.
    <br><br>Benefit: less recomputation and faster recovery, since unaffected regions keep running or reuse intermediate results. It minimizes the blast radius of a single failure.`,
      tip: 'Define a region as tasks connected by pipelined exchanges; failover restarts only the affected region. Note that a fully-pipelined streaming job is often one big region, so the benefit is biggest with blocking boundaries.',
    },
    {
      q: 'What does "end-to-end exactly-once" require beyond Flink\'s internal checkpointing?',
      difficulty: 'hard',
      a: `Internal checkpointing only guarantees exactly-once for <strong>Flink's own state</strong>. End-to-end requires both the <strong>source</strong> and <strong>sink</strong> to participate:
    <br><br><strong>Source</strong> must be <strong>replayable</strong> — able to rewind to a checkpointed position (Kafka offsets, file position). A non-replayable source (e.g., a plain socket) can't achieve exactly-once; failed records are simply lost.
    <br><br><strong>Sink</strong> must be <strong>transactional (2PC)</strong> or <strong>idempotent</strong> so that replayed records after recovery don't create duplicates downstream. A plain "fire-and-forget" sink gives at-least-once at best.
    <br><br>So the full chain is: replayable source + Flink checkpointed state + transactional/idempotent sink. For Uber billing: Kafka source (replay) → checkpointed state → Kafka/JDBC 2PC/upsert sink. Break any link and the guarantee degrades to at-least-once.`,
      tip: 'Frame it as a chain of three links: replayable source + checkpointed state + transactional/idempotent sink. "Exactly-once is end-to-end only if every link supports it."',
    },
  ],

  m13b: [
    {
      q: 'What is the difference between a checkpoint and a savepoint?',
      difficulty: 'medium',
      a: `Both are consistent snapshots of job state, but they serve different purposes and have different ownership:
    <br><br><strong>Checkpoint</strong>: <em>automatic</em>, periodic, managed by Flink for <strong>fault tolerance/recovery</strong>. Optimized for fast, frequent writes (may be incremental, backend-specific format). Owned by Flink — deleted when superseded (unless retained). You don't manually trigger them.
    <br><br><strong>Savepoint</strong>: <em>manually triggered</em>, for <strong>operational</strong> use — upgrades, migrations, rescaling, A/B deployments. Written in a <strong>portable, self-contained, canonical format</strong> (not incremental), owned by the <strong>user</strong> — it lives until you delete it.
    <br><br>Rule of thumb: checkpoints = Flink's recovery mechanism; savepoints = your deliberate "save game" for planned operations. You stop-with-savepoint to upgrade R-4471's fraud job, then restore from it.`,
      tip: 'Contrast on ownership/purpose/format: checkpoint = automatic recovery (Flink-owned, maybe incremental); savepoint = manual operations (user-owned, portable). The "save game" analogy lands well.',
    },
    {
      q: 'Why are operator UIDs critical for savepoint restore?',
      difficulty: 'hard',
      a: `State in a savepoint is keyed by <strong>operator ID</strong>. If you don't set explicit <code>.uid("...")</code> on stateful operators, Flink <strong>auto-generates</strong> IDs from the job topology (operator position/hash). Any change to the graph — adding an operator, reordering, even some refactors — changes those auto-generated IDs, so on restore Flink <strong>can't match saved state to operators</strong> and fails (or silently drops state).
    <br><br>By assigning <strong>stable, explicit UIDs</strong>, you decouple state identity from topology. You can then evolve the job (add operators, change parallelism) and still restore the matching state by UID.
    <br><br>This is the single most important savepoint best practice: <strong>set a UID on every stateful operator from day one</strong>. Retrofitting UIDs later breaks compatibility with existing savepoints.`,
      tip: 'The mantra: "set an explicit .uid() on every stateful operator from day one." Without it, auto-generated IDs break restore the moment you change the graph.',
    },
    {
      q: 'How does rescaling work when restoring from a savepoint?',
      difficulty: 'hard',
      a: `Savepoints store keyed state grouped into <strong>key groups</strong> (the atomic unit of state redistribution; count = maxParallelism). When you restore with a new parallelism, Flink <strong>reassigns whole key groups</strong> to the new set of subtasks.
    <br><br>Because each key group's keys stay together and each key deterministically hashes to one key group, state redistribution is correct and no key is split. New parallelism must be <strong>≤ maxParallelism</strong>.
    <br><br><strong>Operator state</strong> rescales differently: <strong>even-split</strong> redistribution (list state split across new subtasks) or <strong>union</strong> redistribution (every subtask gets the full list — used for things like Kafka offset lists).
    <br><br>Workflow: <code>stop-with-savepoint</code> → restart with new <code>-p</code> parallelism from the savepoint. For Uber's surge, you rescale the fraud operator up for peak and back down after.`,
      tip: 'Keyed state rescales by key groups (≤ maxParallelism); operator state by even-split or union. Naming all three redistribution schemes signals real depth.',
    },
    {
      q: 'How do you handle state schema evolution across job upgrades?',
      difficulty: 'medium',
      a: `When you restore a savepoint into an upgraded job whose state classes changed, Flink attempts <strong>state schema evolution</strong> — migrating old serialized state to the new schema.
    <br><br>Supported with evolution-friendly serializers: <strong>POJOs</strong> (can add/remove/rename-by-order fields within limits) and especially <strong>Avro</strong> (full schema-resolution rules: add fields with defaults, etc.). On restore, Flink detects the serializer/schema change and migrates state via <code>TypeSerializerSnapshot</code> compatibility checks.
    <br><br><strong>Not well supported</strong>: Kryo (opaque, no evolution — avoid for long-lived state), or changing a field's type incompatibly.
    <br><br>Best practices: use Avro (or well-defined POJOs) for state, add fields rather than removing, give new fields defaults, and test restore in staging before upgrading R-4471's production fraud job.`,
      tip: 'Say "Avro and POJOs support schema evolution; Kryo does not." The actionable advice — add fields with defaults, avoid Kryo for durable state — is what seniors give.',
    },
  ],

  m14: [
    {
      q: 'What is backpressure and how does Flink surface it in metrics?',
      difficulty: 'medium',
      a: `<strong>Backpressure</strong> occurs when an operator produces records faster than its downstream can consume. The slow consumer's input buffers fill, which propagates upstream (buffers fill back toward the source), throttling the whole pipeline to the speed of its slowest operator.
    <br><br>Flink's Web UI/metrics expose two per-task ratios (sampled from task-thread state):
    <br><br>• <strong>busyTimeMsPerSecond / busy %</strong>: fraction of time the task is actively processing. A near-100% busy task is a <strong>bottleneck</strong> (it's the cause).
    <br><br>• <strong>backPressuredTimeMsPerSecond / backpressured %</strong>: fraction of time the task is <strong>blocked</strong> waiting to emit because downstream buffers are full (it's the victim).
    <br><br>Diagnosis: walk downstream until you find the <strong>first task that is busy ~100% but NOT backpressured</strong> — that's the real bottleneck.`,
      tip: 'The diagnostic rule is gold: "find the first operator that is busy but not backpressured — that one is the root cause." Backpressured operators are victims, not culprits.',
    },
    {
      q: 'Explain credit-based flow control in Flink\'s network stack.',
      difficulty: 'hard',
      a: `<strong>Credit-based flow control</strong> governs data transfer between TaskManagers over the network. Each <strong>receiving</strong> subtask advertises <strong>credits</strong> = the number of free network buffers it currently has for a given input channel. The <strong>sender only transmits</strong> as many buffers as the receiver has credits for.
    <br><br>Benefits over the old TCP-based scheme:
    <br><br>1. A single slow channel no longer blocks an entire <strong>shared TCP connection</strong> (multiplexed channels are isolated — one slow key group doesn't stall unrelated ones).
    <br><br>2. Backpressure propagates <strong>precisely and quickly</strong> — the sender learns of downstream congestion via credit announcements rather than TCP's coarse flow control.
    <br><br>3. Enables faster, finer-grained barrier handling.
    <br><br>Buffers are split into <strong>exclusive</strong> (per-channel) and <strong>floating</strong> (shared pool) buffers, tuned via network memory config.`,
      tip: 'Core idea: "receivers grant credits = free buffers; senders never overrun them." Mention it isolates slow channels on a shared connection — the key win over raw TCP backpressure.',
    },
    {
      q: 'Walk through how you would diagnose and fix backpressure in a production job.',
      difficulty: 'hard',
      a: `<strong>Diagnose</strong>: In the Web UI, trace the pipeline downstream and find the <strong>first operator that is busy ~100% but not backpressured</strong> — the bottleneck. Check its subtask-level metrics to see if it's <strong>uniform</strong> (all subtasks hot = capacity problem) or <strong>skewed</strong> (one subtask hot = data skew).
    <br><br><strong>Fixes by cause</strong>:
    <br><br>• <strong>Insufficient capacity</strong>: increase that operator's <strong>parallelism</strong> (and the partitions feeding it); add TaskManagers.
    <br><br>• <strong>Data skew</strong> (hot key — e.g., a busy airport zone): add a <strong>salt/local pre-aggregation</strong> (two-phase aggregation), or <code>rebalance</code> after a filter.
    <br><br>• <strong>Slow external call</strong> in a sink/enrichment: use <strong>async I/O</strong> instead of blocking lookups; batch writes.
    <br><br>• <strong>GC/state pressure</strong>: switch to RocksDB, tune memory, reduce serialization (object reuse).
    <br><br>• <strong>Slow sink</strong>: scale the sink, increase buffer/batch size.`,
      tip: 'Structure the answer as diagnose → classify (skew vs capacity vs slow-I/O) → targeted fix. Mentioning async I/O for slow lookups and two-phase aggregation for skew shows production experience.',
    },
    {
      q: 'Is backpressure always bad? How does it interact with checkpointing?',
      difficulty: 'medium',
      a: `Backpressure itself is a <strong>natural, healthy mechanism</strong> — it's Flink throttling the source to match sustainable throughput, preventing OOM from unbounded buffering. Transient backpressure during a spike is fine.
    <br><br>It becomes a <strong>problem</strong> when it's <strong>sustained</strong>: growing consumer lag, rising end-to-end latency (breaking Uber's 100ms fraud SLA), and — critically — <strong>checkpoint impact</strong>. With <strong>aligned</strong> checkpointing, backpressure delays barrier propagation, so alignment stalls and <strong>checkpoints take longer or time out</strong>, risking failed checkpoints and larger recovery gaps.
    <br><br>Mitigations: fix the bottleneck (scale/skew), or enable <strong>unaligned checkpointing</strong> so checkpoint duration is decoupled from backpressure. But unaligned checkpoints only mask the symptom for checkpointing — latency/lag still need the real fix.`,
      tip: 'Nuance wins here: "backpressure is healthy short-term; sustained backpressure breaks latency SLAs and stalls aligned checkpoints." Unaligned checkpointing helps checkpoints but not latency.',
    },
  ],

  m15: [
    {
      q: 'What is a dynamic table and the stream-table duality in Flink SQL?',
      difficulty: 'medium',
      a: `Flink SQL treats a stream as a continuously-updating <strong>dynamic table</strong>. The <strong>stream-table duality</strong> says a stream and a table are two views of the same thing:
    <br><br>• A <strong>stream → table</strong>: as records arrive, they are conceptually appended/updated into a table that grows over time.
    <br><br>• A <strong>table → stream</strong>: changes to the table (inserts, updates, deletes) are emitted as a <strong>changelog stream</strong>.
    <br><br>A continuous query over a dynamic table produces another dynamic table, which is converted back to a stream. So "SELECT count(*) ... GROUP BY city" isn't a one-shot result — it's a <strong>continuously updated</strong> table, emitting new counts as rides stream in.
    <br><br>This is why Flink SQL is genuinely streaming, not just batch SQL over a snapshot.`,
      tip: 'The phrase "a stream is a dynamic table; a continuous query produces a changelog" captures the whole mental model. Stress it is continuously updated, not one-shot.',
    },
    {
      q: 'How do you define event time and watermarks in a Flink SQL DDL?',
      difficulty: 'medium',
      a: `In the <code>CREATE TABLE</code> DDL you declare a timestamp column and a <strong>WATERMARK</strong> clause:
    <br><br><code>CREATE TABLE pings (<br>&nbsp;&nbsp;ride_id STRING,<br>&nbsp;&nbsp;speed DOUBLE,<br>&nbsp;&nbsp;event_time TIMESTAMP(3),<br>&nbsp;&nbsp;WATERMARK FOR event_time AS event_time - INTERVAL '5' SECOND<br>) WITH ('connector'='kafka', ...);</code>
    <br><br>The <code>WATERMARK FOR event_time AS ...</code> defines the watermark as <code>maxEventTime − 5s</code> (bounded out-of-orderness). <code>event_time</code> is now the table's <strong>rowtime</strong> attribute, usable in windowing.
    <br><br>You can also populate a rowtime from Kafka metadata or derive it with computed columns. For processing time, declare a column <code>proc_time AS PROCTIME()</code>. The watermark declaration is what unlocks event-time windowing in SQL.`,
      tip: 'Know the exact syntax: WATERMARK FOR &lt;col&gt; AS &lt;col&gt; - INTERVAL \'5\' SECOND. Mention PROCTIME() for processing time. This is a very common SQL screening question.',
    },
    {
      q: 'Write a tumbling-window aggregation in Flink SQL. What are window TVFs?',
      difficulty: 'medium',
      a: `Modern Flink SQL uses <strong>windowing table-valued functions (TVFs)</strong> like <code>TUMBLE</code>, <code>HOP</code>, <code>CUMULATE</code>, replacing the older grouped-window functions.
    <br><br><code>SELECT window_start, window_end, ride_id, AVG(speed) AS avg_speed<br>FROM TABLE(<br>&nbsp;&nbsp;TUMBLE(TABLE pings, DESCRIPTOR(event_time), INTERVAL '5' MINUTES)<br>)<br>GROUP BY window_start, window_end, ride_id;</code>
    <br><br>The TVF <code>TUMBLE(TABLE t, DESCRIPTOR(rowtime), size)</code> assigns each row to a window and exposes <code>window_start</code>/<code>window_end</code> columns; you then <code>GROUP BY</code> them plus your keys.
    <br><br>This computes a 5-minute average speed per ride, emitting one row per window when the watermark passes <code>window_end</code>. <code>HOP</code> adds a slide; <code>CUMULATE</code> gives early cumulative results.`,
      tip: 'Use the TVF syntax (TUMBLE(TABLE ..., DESCRIPTOR(...), INTERVAL ...)) — it is the current standard and signals you are up to date vs the deprecated GROUP BY TUMBLE(...) form.',
    },
    {
      q: 'What is the difference between the Table API and SQL, and when use each?',
      difficulty: 'easy',
      a: `Both sit on the <strong>same relational engine and optimizer</strong> and are fully interoperable — you can mix them and convert to/from DataStream.
    <br><br><strong>SQL</strong>: declarative text queries (<code>table_env.sql_query("SELECT ...")</code>). Best for analysts, quick iteration, and queries that are naturally expressed in SQL. Portable and familiar.
    <br><br><strong>Table API</strong>: a <strong>fluent/programmatic</strong> API in Python/Java (<code>table.group_by(...).select(...)</code>). Best when queries are built dynamically in code, need IDE type-checking, or integrate tightly with application logic.
    <br><br>They compile to the <strong>same logical plan</strong> and get the same optimizations, so performance is identical. Choose based on authoring ergonomics — many teams use SQL for the bulk and the Table API where they need programmatic construction.`,
      tip: 'Emphasize they share one optimizer and compile identically, so it is a style/ergonomics choice, not a performance one. That nuance is the expected answer.',
    },
  ],

  m16: [
    {
      q: 'How do connectors and formats differ in Flink?',
      difficulty: 'easy',
      a: `A <strong>connector</strong> defines <em>how</em> to talk to an external system — the transport and protocol (Kafka, filesystem/S3, JDBC, Elasticsearch, etc.), including partition discovery, offsets, transactions, and fault-tolerance integration.
    <br><br>A <strong>format</strong> defines <em>how records are serialized/deserialized</em> — the byte ↔ row encoding (JSON, Avro, Protobuf, CSV, Parquet, ORC, <code>debezium-json</code>, etc.).
    <br><br>They compose independently: a Kafka connector can read <strong>JSON</strong> or <strong>Avro</strong>; a filesystem connector can write <strong>Parquet</strong> or <strong>CSV</strong>. In SQL DDL you specify both: <code>'connector'='kafka'</code> and <code>'format'='avro'</code> (or <code>'value.format'</code>).
    <br><br>For Uber: Kafka + Avro (with Schema Registry) for the ping stream; filesystem + Parquet for the analytical archive.`,
      tip: 'One line: "connector = how to reach the system; format = how to encode the bytes." They mix and match, declared separately in DDL.',
    },
    {
      q: 'What is upsert-kafka and how does it differ from the regular Kafka connector?',
      difficulty: 'hard',
      a: `The regular <code>kafka</code> connector treats a topic as an <strong>append-only</strong> stream — every record is an insert. It can't represent updates or deletes.
    <br><br><code>upsert-kafka</code> treats a compacted topic as a <strong>changelog keyed by the message key</strong>. Each record is an <strong>upsert</strong> (insert-or-update) on its key; a record with a <strong>null value</strong> is a <strong>delete (tombstone)</strong>. It reads/writes a <strong>keyed, continuously-updated table</strong>.
    <br><br>Use it for maintaining materialized state in Kafka — e.g., "latest fare per ride" or "current driver status" — where you want the newest value per key, not a log of all changes. It <strong>requires a PRIMARY KEY</strong> in the DDL and pairs with Kafka <strong>log compaction</strong>.
    <br><br>So: <code>kafka</code> = append-only log; <code>upsert-kafka</code> = changelog/materialized table keyed by PK, with tombstone deletes.`,
      tip: 'Contrast append-only (kafka) vs changelog-keyed-by-PK (upsert-kafka). Mention null value = delete tombstone and that it needs a PRIMARY KEY — those two details prove you have used it.',
    },
    {
      q: 'What is a lookup join and how do you make it efficient?',
      difficulty: 'hard',
      a: `A <strong>lookup join</strong> enriches a streaming table by querying an <strong>external table on demand</strong> (JDBC, HBase, Hive) for each incoming row — e.g., join each GPS ping with the <strong>driver dimension table</strong> to add driver tier/vehicle.
    <br><br>Syntax uses <code>FOR SYSTEM_TIME AS OF</code>:
    <br><br><code>SELECT p.*, d.tier FROM pings AS p<br>JOIN drivers FOR SYSTEM_TIME AS OF p.proc_time AS d<br>ON p.driver_id = d.id;</code>
    <br><br>Efficiency levers:
    <br><br>• <strong>Lookup cache</strong>: enable the connector's cache (<code>lookup.cache = PARTIAL</code>, with max-rows and TTL) so repeated keys aren't re-queried.
    <br><br>• <strong>Async lookups</strong>: connectors supporting async I/O overlap external calls instead of blocking per row.
    <br><br>• <strong>keyBy before the join</strong> to improve cache locality.
    <br><br>Without caching, a high-rate stream hammers the external DB and causes backpressure.`,
      tip: 'FOR SYSTEM_TIME AS OF is the lookup-join signature. The efficiency story — cache (TTL) + async lookups — is what separates a correct answer from a production-grade one.',
    },
    {
      q: 'How does the Kafka SQL connector achieve exactly-once, and what must you configure?',
      difficulty: 'medium',
      a: `The Kafka SQL sink achieves exactly-once via <strong>two-phase commit using Kafka transactions</strong>, tied to checkpoints — same mechanism as the DataStream Kafka sink.
    <br><br>You configure:
    <br><br>• <code>'sink.delivery-guarantee' = 'exactly-once'</code>
    <br><br>• <code>'sink.transactional-id-prefix' = '...'</code> — a unique prefix so transactions are identifiable/recoverable (must be unique per sink to avoid transaction-id clashes).
    <br><br>• <strong>Checkpointing must be enabled</strong> — the commit happens on checkpoint completion, so without checkpoints you get no exactly-once.
    <br><br>Also mind Kafka's <code>transaction.max.timeout.ms</code> must exceed your checkpoint interval + downtime, or transactions can expire during recovery and lose data. Downstream consumers must use <code>isolation.level=read_committed</code>.
    <br><br>Alternatively <code>'sink.delivery-guarantee'='at-least-once'</code> for lower latency without 2PC.`,
      tip: 'Name the three configs: delivery-guarantee=exactly-once, transactional-id-prefix, and checkpointing enabled. The transaction.max.timeout.ms &gt; checkpoint interval gotcha is a strong senior detail.',
    },
  ],

  m17: [
    {
      q: 'Explain append, retract, and upsert changelog streams.',
      difficulty: 'hard',
      a: `Flink SQL results are <strong>changelog streams</strong> of rows tagged with a <strong>RowKind</strong>. There are three modes:
    <br><br><strong>Append-only</strong>: only <code>+I</code> (INSERT) rows — results never change once emitted (e.g., a simple filter or tumbling-window aggregate that emits final results). Any sink can consume these.
    <br><br><strong>Retract</strong>: emits <code>+I</code>/<code>-D</code> and for updates a <strong>pair</strong>: <code>-U</code> (retract old) then <code>+U</code> (add new). Used by non-windowed aggregations (e.g., running <code>COUNT(*) GROUP BY city</code>) where a prior result must be corrected.
    <br><br><strong>Upsert</strong>: emits <code>+U</code>/<code>+I</code> keyed by a <strong>primary key</strong> (plus <code>-D</code> for deletes) — a single upsert per key instead of a retract/add pair. More compact; requires the sink to support upserts (upsert-kafka, JDBC with PK).
    <br><br>The mode a query produces depends on its operators; the sink must be able to consume that changelog mode.`,
      tip: 'The RowKind vocabulary (+I, -U, +U, -D) is the giveaway of real SQL depth. Stress that the sink must support whatever changelog mode the query produces (append vs retract vs upsert).',
    },
    {
      q: 'Compare regular, interval, and temporal joins in Flink SQL.',
      difficulty: 'hard',
      a: `<strong>Regular join</strong> (<code>a JOIN b ON ...</code>): both sides are fully materialized as state — <strong>unbounded state growth</strong> since any future row from either side may match. Correct but dangerous at scale without state TTL. Produces a retract stream.
    <br><br><strong>Interval join</strong>: join rows within a <strong>time bound</strong>, e.g., <code>a.ts BETWEEN b.ts - INTERVAL '10' MINUTE AND b.ts</code>. State is bounded — old rows outside the interval are evicted via watermarks. Good for "pings and payments within 10 min of each other."
    <br><br><strong>Temporal join</strong> (<code>FOR SYSTEM_TIME AS OF</code>): join a stream against a <strong>versioned table</strong> at the <em>correct point in time</em> — e.g., join a fare event with the <strong>exchange rate that was valid at that event's time</strong>. State is the versioned table, bounded by what's needed.
    <br><br>Prefer interval/temporal joins in production to bound state.`,
      tip: 'The key axis is state: regular = unbounded (needs TTL), interval = time-bounded, temporal = versioned-table at event time. Recommending interval/temporal to bound state is the senior takeaway.',
    },
    {
      q: 'How do you express a streaming Top-N and deduplication in Flink SQL?',
      difficulty: 'medium',
      a: `Both use <code>ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)</code> in a subquery, filtered by the rank.
    <br><br><strong>Top-N</strong> (e.g., top-3 highest-fare rides per city, continuously updated):
    <br><br><code>SELECT * FROM (<br>&nbsp;&nbsp;SELECT *, ROW_NUMBER() OVER (PARTITION BY city ORDER BY fare DESC) AS rn<br>&nbsp;&nbsp;FROM rides)<br>WHERE rn &lt;= 3;</code>
    <br><br>This produces an <strong>updating (retract/upsert)</strong> stream as ranks change.
    <br><br><strong>Deduplication</strong> = Top-1 ordered by time — keep the first (or last) row per key:
    <br><br><code>... ROW_NUMBER() OVER (PARTITION BY ride_id ORDER BY proc_time ASC) AS rn ... WHERE rn = 1;</code>
    <br><br>Ordering by <strong>ASC</strong> keeps the first event per key (drop duplicates); <strong>DESC</strong> keeps the latest. Flink optimizes <code>rn = 1</code> into an efficient dedup operator.`,
      tip: 'One pattern covers both: ROW_NUMBER() OVER (PARTITION BY key ORDER BY ...). rn &lt;= N is Top-N; rn = 1 is dedup. Note dedup by time ASC = keep first, DESC = keep latest.',
    },
    {
      q: 'How does Flink SQL consume Change Data Capture (CDC) streams?',
      difficulty: 'medium',
      a: `Flink reads database change streams (from Debezium/Maxwell, or Flink CDC connectors) as <strong>changelog streams</strong> using CDC-aware formats like <code>debezium-json</code> or the <strong>Flink CDC</strong> connectors (e.g., <code>mysql-cdc</code>, <code>postgres-cdc</code>).
    <br><br>Each CDC record carries an operation (<code>+I</code>/<code>-U</code>/<code>+U</code>/<code>-D</code>), so Flink interprets inserts, updates, and deletes natively — the upstream DB table becomes a <strong>dynamic table</strong> in Flink, kept in sync.
    <br><br>Flink CDC connectors typically do an initial <strong>snapshot</strong> (consistent full read) then switch to <strong>incremental binlog</strong> streaming, giving exactly-once with checkpointing. You can then join this changelog with streams (temporal join), materialize it into another store, or power a real-time dimension table (e.g., the live drivers table for ping enrichment).`,
      tip: 'Say CDC arrives as a changelog (+I/-U/+U/-D) via debezium-json or Flink CDC connectors, with snapshot→binlog phases. The "DB table becomes a Flink dynamic table" framing is the clean mental model.',
    },
  ],

  m18: [
    {
      q: 'How does Flink serialize data, and why does type matter for performance?',
      difficulty: 'hard',
      a: `Flink has its own serialization stack chosen by <strong>type</strong>, and the choice is a major performance lever:
    <br><br><strong>POJOs / Flink tuples / primitives</strong>: use Flink's efficient built-in <strong>POJO serializer</strong> — compact, fast, supports schema evolution, and allows partial field access. Best choice.
    <br><br><strong>Avro</strong>: efficient and evolution-friendly; good for durable state and Kafka.
    <br><br><strong>Kryo (fallback)</strong>: if a type isn't recognized as a POJO (e.g., it lacks a no-arg constructor or public fields), Flink falls back to <strong>Kryo</strong> — significantly slower, larger, and <strong>no schema evolution</strong>. This is a common silent performance killer.
    <br><br>Serialization happens on every network shuffle, every state access (RocksDB), and every checkpoint — so a Kryo fallback can dominate CPU. Verify types register as POJOs; enable <code>disableGenericTypes</code> to fail loudly if Kryo would be used.`,
      tip: 'The actionable insight: "make sure your records are POJOs so you avoid the slow Kryo fallback." Mention disableGenericTypes to catch accidental Kryo in CI.',
    },
    {
      q: 'What are the most impactful RocksDB tuning knobs at scale?',
      difficulty: 'hard',
      a: `For large keyed state (Uber's millions of rides), RocksDB tuning matters:
    <br><br>• <strong>Managed memory</strong>: Flink sizes RocksDB block cache + write buffers from the slot's managed memory — give TaskManagers enough and let Flink manage it (<code>state.backend.rocksdb.memory.managed=true</code>).
    <br><br>• <strong>Incremental checkpoints</strong>: essential — upload only changed SST files.
    <br><br>• <strong>Local SSDs</strong>: put <code>state.backend.rocksdb.localdir</code> on fast local NVMe (not network disk); multiple dirs to spread I/O.
    <br><br>• <strong>Predefined options</strong>: <code>SPINNING_DISK_OPTIMIZED_HIGH_MEM</code> / <code>FLASH_SSD_OPTIMIZED</code> presets tune compaction/buffers.
    <br><br>• <strong>Bloom filters</strong> to cut read amplification on point lookups.
    <br><br>• <strong>Timers in RocksDB</strong> vs heap — heap timers are faster if they fit; RocksDB if they're huge.
    <br><br>Also reduce state: use MapState for partial access, set TTL, and enable the compaction filter for cleanup.`,
      tip: 'Lead with managed memory + incremental checkpoints + local SSD — the three biggest wins. Bloom filters and predefined options show depth. Always tie back to "and reduce state size itself."',
    },
    {
      q: 'What is object reuse and when is it safe to enable?',
      difficulty: 'medium',
      a: `By default, Flink creates <strong>fresh objects</strong> for records passed between chained operators (defensive copying), which is safe but adds allocation/GC pressure.
    <br><br>With <strong>object reuse</strong> enabled (<code>env.get_config().enable_object_reuse()</code>), Flink <strong>reuses the same object instances</strong> across records within an operator chain, cutting allocations and GC — a meaningful throughput gain in hot pipelines.
    <br><br><strong>Risk</strong>: your operator must <strong>not hold references</strong> to incoming objects beyond the current call (e.g., stashing a record in a list/state and mutating it later), and must not mutate inputs it forwards — because the object may be overwritten by the next record. If your functions are "read, transform, emit, forget," it's safe.
    <br><br>Enable it when you've verified operators don't retain or mutate shared references; it's an easy win for stateless transformation chains.`,
      tip: 'Say it is a throughput win (less GC) but only safe if operators do not retain/mutate forwarded objects. "Read-transform-emit-forget functions are safe" is the rule to state.',
    },
    {
      q: 'How do you detect and mitigate data skew in a keyed Flink job?',
      difficulty: 'hard',
      a: `<strong>Detect</strong>: in the Web UI, compare <strong>per-subtask</strong> records-in/bytes and busy %. If one subtask is far hotter than the rest, you have <strong>key skew</strong> — a dominant key (e.g., a mega-busy airport zone, or a null/default key) lands all its data on one subtask.
    <br><br><strong>Mitigate</strong>:
    <br><br>1. <strong>Two-phase / local aggregation</strong>: pre-aggregate with a <strong>salted key</strong> (<code>keyBy(key + random_bucket)</code>) to spread the hot key across subtasks, then re-aggregate by the real key. Flink SQL offers <code>MiniBatch</code> + <code>LocalGlobal</code> aggregation and split-distinct for exactly this.
    <br><br>2. <strong>Isolate hot keys</strong>: route known hot keys to dedicated handling.
    <br><br>3. <strong>Rebalance after filters</strong> that unevenly thin data (<code>.rebalance()</code>).
    <br><br>4. Fix <strong>bad keys</strong> (nulls/defaults collapsing to one partition).
    <br><br>Increasing parallelism alone does NOT fix skew — the hot key still goes to one subtask.`,
      tip: 'The crucial point: "raising parallelism does not fix skew — the hot key still hashes to one subtask." Two-phase aggregation with a salted key (or SQL LocalGlobal/MiniBatch) is the real fix.',
    },
  ],

  m19: [
    {
      q: 'Design the end-to-end Uber real-time fraud pipeline. What are the stages?',
      difficulty: 'hard',
      a: `A production pipeline for ride R-4471 at 1M pings/sec:
    <br><br>1. <strong>Ingest</strong>: <code>KafkaSource</code> reading the GPS/payment topics, with a <strong>WatermarkStrategy</strong> (bounded out-of-orderness + idleness) assigned at the source for correct event time.
    <br><br>2. <strong>Parse/validate</strong>: a <code>map</code>/<code>flatMap</code> to deserialize (Avro) and drop invalid coordinates — chained for speed.
    <br><br>3. <strong>keyBy(ride_id)</strong>: partition so all of a ride's events co-locate (enables keyed state).
    <br><br>4. <strong>Window / enrich</strong>: tumbling or sliding windows for speed/behavior features; temporal/lookup join to the driver dimension table.
    <br><br>5. <strong>Fraud KeyedProcessFunction</strong>: per-ride state + timers; scores each event, emits alerts to a <strong>side output</strong> within the 100ms SLA.
    <br><br>6. <strong>Exactly-once sinks</strong>: alerts → Kafka (2PC); features → upsert-kafka/JDBC; archive → FileSink Parquet to S3.
    <br><br>Checkpointing (RocksDB, incremental, unaligned under load) ties it all together for exactly-once.`,
      tip: 'Narrate the DAG: source+watermarks → parse → keyBy(ride_id) → window/enrich → fraud ProcessFunction (state+timers+side output) → exactly-once sinks, with checkpointing as the backbone. Hitting each stage in order is the win.',
    },
    {
      q: 'Why keyBy(ride_id) before the fraud logic, and what are its risks?',
      difficulty: 'medium',
      a: `<strong>Why</strong>: fraud scoring is <strong>per-ride stateful</strong> — you track R-4471's speed history, route, payment attempts. <code>keyBy(ride_id)</code> guarantees all of a ride's events land on the <strong>same subtask</strong>, which is what makes <strong>keyed state</strong> (ValueState/MapState) and <strong>per-ride timers</strong> possible. Without it you can't maintain correct per-ride context.
    <br><br><strong>Risks</strong>:
    <br><br>• It triggers a <strong>network shuffle</strong> (hash partition) and <strong>breaks operator chaining</strong>.
    <br><br>• <strong>Key skew</strong>: if ride_id were replaced by, say, city_id, a mega-city would overload one subtask. ride_id is high-cardinality so skew is usually mild, but a null/default ride_id would collapse to one subtask.
    <br><br>• <strong>State accumulation</strong>: each ride's keyed state persists until explicitly cleared or TTL'd — completed rides must be expired or state grows unbounded.`,
      tip: 'Tie keyBy to "it is what unlocks keyed state and per-key timers." Then flag the three risks: shuffle cost, skew (with high-cardinality ride_id this is mild), and state cleanup via TTL.',
    },
    {
      q: 'How does the fraud ProcessFunction meet the <100ms SLA while staying exactly-once?',
      difficulty: 'hard',
      a: `<strong>Low latency</strong>:
    <br><br>• It's a <code>KeyedProcessFunction</code> processing <strong>each event immediately</strong> (true streaming, no window wait for the alert path) — scoring happens in-line per event.
    <br><br>• Uses fast <strong>keyed state</strong> (MapState for partial access) and avoids blocking external calls — any enrichment uses <strong>async I/O</strong> or a cached lookup join, not synchronous DB calls.
    <br><br>• A <strong>processing-time timer</strong> can act as a debounce/timeout safety net; alerts go to a <strong>side output</strong> for immediate downstream action.
    <br><br><strong>Exactly-once</strong>:
    <br><br>• State is captured by <strong>asynchronous checkpoints</strong> (RocksDB, incremental) so the scoring state survives failure consistently.
    <br><br>• The alert sink is <strong>transactional (2PC)</strong> or idempotent, and the source is replayable (Kafka offsets in checkpoint) — so a recovery never loses or double-fires an alert.
    <br><br>The async checkpoint barely stalls processing, preserving the latency budget.`,
      tip: 'Separate the two goals: latency comes from per-event processing + async I/O + side output; exactly-once comes from async checkpointed state + replayable source + transactional sink. Note async checkpoints keep the latency budget intact.',
    },
    {
      q: 'What operational concerns would you monitor for this pipeline in production?',
      difficulty: 'medium',
      a: `Key signals for the R-4471 pipeline:
    <br><br>• <strong>Kafka consumer lag</strong>: the #1 health metric — rising lag means you can't keep up with 1M pings/sec.
    <br><br>• <strong>Backpressure / busy %</strong>: locate bottleneck operators before lag builds.
    <br><br>• <strong>End-to-end latency</strong>: track the fraud-alert path against the 100ms SLA (e.g., event-time to alert).
    <br><br>• <strong>Checkpoint metrics</strong>: duration, size, alignment time, and <strong>failure rate</strong> — failing/slow checkpoints threaten recovery and signal backpressure.
    <br><br>• <strong>State size growth</strong>: watch RocksDB size / key count to catch missing TTL (completed-ride leak).
    <br><br>• <strong>Restart count / uptime</strong>: frequent restarts indicate poison records or unstable dependencies.
    <br><br>• <strong>Watermark lag / idleness</strong>: a stalled watermark hangs event-time windows.
    <br><br>Alert on lag, checkpoint failures, and SLA breaches; dashboard the rest.`,
      tip: 'Lead with consumer lag + checkpoint health + end-to-end latency vs SLA — the three an on-call engineer watches first. Mention state-size growth as the sneaky one that signals a TTL leak.',
    },
  ],
};
