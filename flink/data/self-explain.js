// Self-explain (Feynman technique) active-recall prompts for the Flink SPA "Uber Edition".
// Each module key maps to an array of prompts. A learner explains the concept in their own
// words, then reveals the model answer and checks their explanation against keyPoints.

export const SELF_EXPLAIN = {
  m01: [
    {
      prompt: 'In your own words, explain why Uber would reach for Apache Flink instead of a nightly batch job to power surge pricing and fraud detection on ride R-4471.',
      keyPoints: [
        'Batch adds hours of latency; Flink processes events as they arrive',
        'Continuous, always-on computation over unbounded streams',
        'Low end-to-end latency (sub-second) with high throughput',
        'Correctness via event-time semantics + exactly-once state'
      ],
      modelAnswer: `<p>Surge pricing and fraud scoring are <strong>decisions that must happen now</strong>. A nightly batch job would price a ride on data that is up to 24 hours stale, and would flag a stolen card long after the trip ended.</p>
<p>Flink is a <strong>true stream processor</strong>: it keeps a continuously running dataflow that consumes events (GPS pings, payment attempts) the moment they are produced and emits results with <strong>sub-second latency</strong>. Unlike a batch engine that waits to accumulate a full dataset, Flink computes incrementally over an <em>unbounded</em> stream.</p>
<p>Critically, it does this <strong>without sacrificing correctness</strong>: Flink gives you event-time processing (so out-of-order pings are handled by their real timestamps), managed keyed state (per-driver, per-rider aggregates), and <strong>exactly-once</strong> guarantees through checkpointing. That combination — low latency, high throughput, and strong consistency — is why Uber scores fraud in &lt;100ms rather than overnight.</p>`
    },
    {
      prompt: 'Explain the difference between Flink and a request/response microservice for computing a 1-minute rolling count of GPS pings per driver.',
      keyPoints: [
        'Flink maintains state across events; a stateless service recomputes',
        'Stream processor pushes results; microservice pulls on request',
        'Flink gives fault-tolerant, scalable state out of the box',
        'Built-in windowing vs hand-rolled time bucketing'
      ],
      modelAnswer: `<p>A microservice is typically <strong>request-driven and stateless</strong>: each call would have to query a datastore, aggregate the last minute of pings, and respond. You hand-roll the time bucketing, the storage, the scaling, and the failure recovery.</p>
<p>Flink is <strong>data-driven</strong>. You declare a <code>keyBy(driverId)</code> and a 1-minute window once, and Flink continuously maintains per-driver state, advances it as each ping arrives, and <strong>pushes</strong> the rolling count downstream. The state is partitioned by key, checkpointed for exactly-once recovery, and rescales with parallelism — none of which you build yourself.</p>
<p>At 1M pings/sec, the stateless-service approach collapses under repeated aggregation reads; Flink's incremental, in-memory (or RocksDB-backed) state handles it as a first-class concern.</p>`
    }
  ],

  m02: [
    {
      prompt: 'Explain the difference between a bounded and an unbounded stream, and give an Uber example of each.',
      keyPoints: [
        'Bounded = finite, known start and end (a dataset/file)',
        'Unbounded = infinite, no defined end, processed continuously',
        'Flink treats batch as a special case of streaming',
        'Unbounded needs windowing + watermarks to produce results'
      ],
      modelAnswer: `<p>An <strong>unbounded</strong> stream has a beginning but <em>no end</em> — it is conceptually infinite. The live firehose of 1M GPS pings/sec is unbounded: new pings keep arriving forever, so you can never "read it all" before computing. You must emit incremental results, which is why unbounded processing needs <strong>windows</strong> (to slice the infinite stream into finite chunks) and <strong>watermarks</strong> (to decide when a chunk is complete).</p>
<p>A <strong>bounded</strong> stream is finite with a known end — for example, reprocessing <em>yesterday's</em> archived ride events from S3. You can process it start-to-finish.</p>
<p>Flink's model is that <strong>batch is a special case of streaming</strong>: the same DataStream/SQL API runs over bounded sources (enabling batch optimizations like sorting) or unbounded ones, so Uber can reuse one pipeline for both live scoring and historical backfill.</p>`
    },
    {
      prompt: 'Explain how true (native) streaming differs from micro-batch (e.g., Spark Structured Streaming) and why it matters for scoring fraud in under 100ms.',
      keyPoints: [
        'Native: one record at a time through a long-running dataflow',
        'Micro-batch: buffers records into small batches, processes per interval',
        'Micro-batch latency is bounded by batch interval',
        'Native streaming gives lower, more consistent per-event latency'
      ],
      modelAnswer: `<p><strong>True streaming</strong> (Flink) runs a long-lived operator graph; each record flows through operator-to-operator as it arrives, so latency is essentially the processing time of one event — ideal for a &lt;100ms fraud decision.</p>
<p><strong>Micro-batch</strong> (classic Spark Structured Streaming) discretizes the stream into tiny batches on a fixed trigger interval. Even a 100ms interval means an event that arrives at the start of a batch waits for the batch to close before processing, and you pay per-batch scheduling overhead. Latency is <em>floored by</em> the batch interval and is burstier.</p>
<p>For fraud on a payment attempt, you want the decision tied to the event, not to a clock tick. Native streaming delivers lower and more <strong>predictable tail latency</strong>, which is what a &lt;100ms SLA actually demands.</p>`
    }
  ],

  m03: [
    {
      prompt: 'Explain the roles of the JobManager, TaskManager, and task slots in a running Flink cluster.',
      keyPoints: [
        'JobManager = coordinator (scheduling, checkpoints, recovery)',
        'TaskManager = worker process that runs subtasks',
        'Task slot = unit of resource/parallelism on a TaskManager',
        'Slots share managed memory; one slot runs a pipeline of chained subtasks'
      ],
      modelAnswer: `<p>The <strong>JobManager</strong> is the brain. It receives the job, builds the execution graph, schedules subtasks onto slots, coordinates checkpoints, and orchestrates recovery on failure. Its components are the Dispatcher, the ResourceManager, and a per-job JobMaster.</p>
<p>A <strong>TaskManager</strong> is a worker JVM. It provides compute and memory, runs the actual operator subtasks, and exchanges data with other TaskManagers over the network.</p>
<p>A <strong>task slot</strong> is a TaskManager's unit of scheduling — a fixed share of its managed memory. Each slot can run one <em>slice</em> of the pipeline (a chain of subtasks). A TaskManager with 4 slots can run 4 parallel pipelines. Slots isolate memory but share CPU, and by default subtasks of different operators from the same job can share a slot (slot sharing), which keeps the whole pipeline co-located.</p>`
    },
    {
      prompt: 'Explain the progression from StreamGraph to JobGraph to ExecutionGraph. What happens at each stage?',
      keyPoints: [
        'StreamGraph: logical dataflow from your API calls (client)',
        'JobGraph: optimized logical graph with operator chaining (client)',
        'ExecutionGraph: parallelized physical graph on JobManager',
        'ExecutionGraph has one subtask per parallel instance of each operator'
      ],
      modelAnswer: `<p><strong>StreamGraph</strong> — built on the client straight from your API calls (map, keyBy, window...). It is the raw <em>logical</em> dataflow, one node per operator, no optimization.</p>
<p><strong>JobGraph</strong> — still on the client, the StreamGraph is optimized: adjacent operators that can run together are fused via <strong>operator chaining</strong> into a single vertex, cutting serialization and thread hand-offs. This compact logical graph is what gets submitted to the JobManager.</p>
<p><strong>ExecutionGraph</strong> — the JobManager expands the JobGraph by <strong>parallelism</strong>. Each JobVertex becomes N ExecutionVertices (one per parallel subtask), and the data exchanges between them become intermediate result partitions. This is the <em>physical</em>, schedulable graph the JobManager deploys onto slots.</p>
<p>So the pipeline goes logical → optimized-logical → parallel-physical, moving from client to cluster.</p>`
    }
  ],

  m04: [
    {
      prompt: 'Explain the difference between Application Mode, Session Mode, and (legacy) Per-Job Mode for deploying a Flink job.',
      keyPoints: [
        'Session: shared cluster runs many jobs, cheap startup, weak isolation',
        'Application: dedicated cluster per application, main() runs on JobManager',
        'Per-Job: one cluster per job, main() runs on client (deprecated)',
        'Application Mode is preferred for production isolation'
      ],
      modelAnswer: `<p><strong>Session Mode</strong> runs a long-lived cluster onto which you submit multiple jobs. Startup is fast and resources are shared, but jobs share TaskManagers, so one job's failure or resource hunger can hurt others. Good for many short/ad-hoc jobs.</p>
<p><strong>Application Mode</strong> spins up a <em>dedicated</em> cluster per application. Crucially the <code>main()</code> method runs on the <strong>JobManager</strong>, not the client — the client just ships the jars. This gives strong resource isolation and relieves the client, making it the recommended production mode for something like Uber's fraud pipeline.</p>
<p><strong>Per-Job Mode</strong> also gave one cluster per job but ran <code>main()</code> on the client; it is deprecated in favor of Application Mode, which does the same isolation more efficiently.</p>`
    },
    {
      prompt: 'Walk through the lifecycle states a Flink job passes through from submission to completion, and what a RESTARTING state signifies.',
      keyPoints: [
        'CREATED → RUNNING are the main active states',
        'FAILING/RESTARTING on exception, driven by restart strategy',
        'FINISHED (bounded), CANCELED, or FAILED are terminal',
        'RESTARTING means recovering from last checkpoint, not a fresh start'
      ],
      modelAnswer: `<p>A job is <strong>CREATED</strong> when the ExecutionGraph is built, then <strong>RUNNING</strong> once subtasks are deployed and processing. On an unhandled exception it enters <strong>FAILING</strong>, cancels remaining tasks, and if a restart strategy allows, moves to <strong>RESTARTING</strong>.</p>
<p><strong>RESTARTING is a recovery, not a reset</strong>: Flink redeploys the graph and restores state from the <em>last successful checkpoint</em>, then resumes consuming from the checkpointed source offsets. This is how exactly-once survives failures.</p>
<p>Terminal states: <strong>FINISHED</strong> (a bounded job that ran to completion), <strong>CANCELED</strong> (operator-requested stop), or <strong>FAILED</strong> (restart attempts exhausted). A streaming fraud job normally never reaches FINISHED — it runs until canceled or it exhausts restarts.</p>`
    }
  ],

  m05: [
    {
      prompt: 'Explain how slot sharing works and why it is enabled by default.',
      keyPoints: [
        'Subtasks of different operators from one job can share a slot',
        'Needed slots = max operator parallelism, not sum of parallelisms',
        'Keeps a full pipeline co-located, balancing resource use',
        'Slot sharing groups can isolate heavy operators when needed'
      ],
      modelAnswer: `<p><strong>Slot sharing</strong> lets subtasks of <em>different</em> operators from the same job run in one slot, as long as they are different operators. This means a cluster needs only as many slots as the <strong>highest</strong> operator parallelism — not the sum across operators.</p>
<p>Example: a source at parallelism 4, a window at 4, and a sink at 4 fit into just 4 slots, each holding one vertical slice of the whole pipeline. Without sharing you'd need 12.</p>
<p>It is on by default because it balances load (a light source and a heavy window co-locate so slots are evenly utilized) and simplifies resource planning. When a particular operator is a CPU hog, you can assign it a distinct <strong>slot sharing group</strong> to force it onto its own slots.</p>`
    },
    {
      prompt: 'Explain what key groups are and why Flink uses them rather than hashing each key to a subtask directly.',
      keyPoints: [
        'Key groups are the atomic unit of state redistribution',
        'Number of key groups = max parallelism (fixed at job start)',
        'Keys hash to key groups; key groups assign to subtasks',
        'Enables efficient rescaling without rehashing every key'
      ],
      modelAnswer: `<p>A <strong>key group</strong> is a bucket of keys and the <em>atomic unit</em> by which Flink distributes and redistributes keyed state. The total number of key groups equals the job's <strong>maxParallelism</strong>, which is fixed at job start.</p>
<p>Each key is hashed to a key group, and each subtask owns a contiguous <em>range</em> of key groups. Flink does not hash keys directly to subtasks because that would scatter state and make rescaling require re-hashing and shuffling <em>every single key</em>.</p>
<p>With key groups, rescaling just reassigns whole key-group ranges to the new set of subtasks — state moves in group-sized chunks. That is why maxParallelism caps how far you can ever rescale, and why you set it deliberately (e.g., per-driver state for millions of drivers) before going live.</p>`
    }
  ],

  m06: [
    {
      prompt: 'Explain the difference between map, keyBy, and a ProcessFunction, and when you would reach for each.',
      keyPoints: [
        'map = stateless 1:1 transform',
        'keyBy = partition stream by key (enables keyed state/windows)',
        'ProcessFunction = low-level access to events, state, and timers',
        'keyBy is a logical repartition, not an operator that emits records'
      ],
      modelAnswer: `<p><strong>map</strong> is a stateless one-in-one-out transform — e.g., parse a raw GPS ping into a typed record.</p>
<p><strong>keyBy</strong> is not a transformation that emits records; it is a <em>logical repartition</em> that hash-partitions the stream by a key (say <code>driverId</code>) so all events for a key land on the same subtask. It is the prerequisite for keyed state and keyed windows.</p>
<p><strong>ProcessFunction</strong> is the low-level primitive: on a keyed stream it gives you direct access to <strong>per-key state</strong>, <strong>event-time and processing-time timers</strong>, and the ability to emit to side outputs. You'd use it for custom logic a window can't express — e.g., "flag a driver if 3 failed payments occur within 100ms, then set a timer to clear the flag." Prefer map/filter for simple cases and ProcessFunction when you need state plus timers.</p>`
    },
    {
      prompt: 'Explain operator chaining: what it does, its benefits, and when you might disable it.',
      keyPoints: [
        'Fuses consecutive operators into one task/thread',
        'Eliminates serialization and network/thread hand-off between them',
        'Requires same parallelism and a forward (one-to-one) connection',
        'Disable to isolate a slow operator or to aid profiling/backpressure diagnosis'
      ],
      modelAnswer: `<p><strong>Operator chaining</strong> fuses a sequence of operators (e.g., source → map → filter) into a single task that runs in one thread on one slot. Records are passed by direct method call instead of being serialized and shipped, which dramatically cuts latency and overhead.</p>
<p>Chaining requires the operators to have the <strong>same parallelism</strong> and a <strong>forward/one-to-one</strong> connection (no keyBy/rebalance in between), and both to permit chaining.</p>
<p>You might <strong>disable</strong> it (<code>disableChaining()</code> / <code>startNewChain()</code>) to put an expensive operator on its own thread so it doesn't stall its neighbors, to isolate backpressure, or to get clearer per-operator metrics when profiling the Uber pipeline.</p>`
    }
  ],

  m07: [
    {
      prompt: 'Explain what a source and a sink are in Flink, and why the Kafka source needs to track offsets in state.',
      keyPoints: [
        'Source ingests external data into the dataflow',
        'Sink writes results to an external system',
        'Kafka source stores consumed offsets in Flink checkpoints',
        'Checkpointed offsets enable replay-based exactly-once recovery'
      ],
      modelAnswer: `<p>A <strong>source</strong> is the operator that pulls data in — e.g., the Kafka source reading the <code>gps-pings</code> topic. A <strong>sink</strong> writes results out — e.g., a FileSink to S3 or a JDBC sink to the surge-price table.</p>
<p>The Kafka source stores the <strong>consumed offsets inside Flink's checkpoints</strong>, not in Kafka's consumer-group offset alone. On recovery, Flink restores state <em>and</em> rewinds the Kafka consumer to the exact offsets captured in that checkpoint, then replays. Because the state snapshot and the source position are consistent, no ping is lost or double-counted — this replay-from-checkpointed-offset mechanism is the backbone of <strong>exactly-once</strong> on the ingest side.</p>`
    },
    {
      prompt: 'Explain how a transactional (two-phase-commit) sink achieves end-to-end exactly-once when writing to Kafka.',
      keyPoints: [
        'Pre-commit: write data within a transaction on checkpoint',
        'Commit: finalize transactions only after checkpoint completes',
        'Ties external commit to Flink checkpoint barriers (2PC)',
        'On failure, uncommitted transactions are aborted, avoiding duplicates'
      ],
      modelAnswer: `<p>End-to-end exactly-once needs the <em>output</em> to be atomic with the checkpoint, which Flink does via <strong>two-phase commit</strong> coordinated by the checkpoint:</p>
<ul>
<li><strong>Pre-commit:</strong> as a checkpoint barrier flows through, the sink flushes buffered data into an <em>open Kafka transaction</em> and persists the transaction's handle in state. The data is written but not yet visible (read_committed consumers can't see it).</li>
<li><strong>Commit:</strong> once the JobManager confirms the whole checkpoint succeeded, it notifies the sink, which <strong>commits</strong> the Kafka transaction, making the records visible.</li>
</ul>
<p>If the job fails before commit, recovery restores to the last checkpoint and the dangling transaction is <strong>aborted</strong> — so partial/duplicate writes never become visible. This binding of external commit to checkpoint completion is what makes the surge-price output exactly-once, not just at-least-once.</p>`
    }
  ],

  m08: [
    {
      prompt: 'Explain the difference between event time, processing time, and ingestion time, using a GPS ping on ride R-4471.',
      keyPoints: [
        'Event time = when the event actually occurred (embedded timestamp)',
        'Processing time = wall-clock time at the operator',
        'Ingestion time = time the event entered Flink',
        'Event time gives deterministic, reproducible results despite delays'
      ],
      modelAnswer: `<p><strong>Event time</strong> is when the ping was <em>generated on the phone</em> — the timestamp baked into the record (e.g., 12:00:03.100). It reflects reality regardless of network delay.</p>
<p><strong>Ingestion time</strong> is when that ping <em>entered Flink</em> at the source (maybe 12:00:05 after a mobile network lag) — assigned by Flink, so it's stable but not the true occurrence.</p>
<p><strong>Processing time</strong> is the <em>wall clock</em> on the TaskManager when the operator handles it (maybe 12:00:06) — fast and simple but non-deterministic: a replay or a slow task yields different window assignments.</p>
<p>For correct surge windows you want <strong>event time</strong>: a ping delayed 3 seconds still lands in the window for 12:00:03, so results are deterministic and reproducible across reruns and recoveries. That determinism is why Uber uses event time despite needing watermarks to handle the lateness.</p>`
    },
    {
      prompt: 'Explain why processing time is appealing yet dangerous for computing per-minute ride demand, and when it is actually fine.',
      keyPoints: [
        'Processing time is simple and lowest-latency (no watermarks)',
        'But results are non-deterministic and sensitive to delays/backpressure',
        'Out-of-order and replayed data land in the wrong windows',
        'Fine when you only need "roughly now" and don\'t reprocess'
      ],
      modelAnswer: `<p><strong>Processing time</strong> is tempting because it needs no watermarks, no timestamps, and gives the lowest latency — a window just closes when the clock ticks past its end.</p>
<p>The danger: it is <strong>non-deterministic</strong>. If the pipeline backpressures or a reprocess runs faster, the same ping lands in a different minute, so demand counts change between runs. Network delays and out-of-order arrivals are silently mis-bucketed, which would distort surge pricing.</p>
<p>It's <strong>acceptable</strong> when you genuinely just want "what's happening roughly right now," never reprocess history, and can tolerate approximate boundaries — e.g., a coarse live ops dashboard. For anything auditable or reprocessable, use event time.</p>`
    }
  ],

  m09: [
    {
      prompt: 'Explain what a watermark is and how a bounded-out-of-orderness watermark decides when an event-time window can fire.',
      keyPoints: [
        'Watermark = assertion that no events older than T will arrive',
        'It advances event-time clock through the pipeline',
        'Bounded-OOO watermark = max timestamp seen minus the allowed lag',
        'A window fires when the watermark passes its end'
      ],
      modelAnswer: `<p>A <strong>watermark</strong> is a special record flowing with the stream that asserts "event time has advanced to T; expect no more events with timestamp &lt; T." It is how Flink tracks the progress of <em>event time</em>.</p>
<p>A <strong>bounded-out-of-orderness</strong> strategy with, say, 5 seconds of lag emits a watermark of <code>(max event timestamp seen so far) − 5s</code>. This tolerates pings that arrive up to 5s late relative to the newest one.</p>
<p>An event-time window <strong>fires when the watermark reaches or passes the window's end</strong>: once Flink is "confident" (per the bound) that all pings for 12:00:00–12:00:05 have arrived, it closes and emits that surge window. The trade-off is direct: a larger bound tolerates more lateness but delays every result.</p>`
    },
    {
      prompt: 'Explain idleness and late data: what problem does watermark idleness solve, and what are the options for handling a late GPS ping?',
      keyPoints: [
        'Watermark = min across all input partitions/subtasks',
        'An idle partition stalls the global watermark',
        'withIdleness marks quiet partitions so others can advance time',
        'Late data: drop (default), allowedLateness, or side output'
      ],
      modelAnswer: `<p>A downstream operator's watermark is the <strong>minimum</strong> over all its input channels. If one Kafka partition goes quiet (a region with no rides at 3am), its watermark stops advancing and <em>holds back the whole job</em>, so no windows fire.</p>
<p><strong>Idleness</strong> (<code>withIdleness(Duration)</code>) fixes this: a partition that produces nothing for the timeout is temporarily marked idle and excluded from the min, letting the active partitions advance event time.</p>
<p>For a ping that arrives <em>after</em> its window's watermark (truly <strong>late</strong>), the options are: (1) <strong>drop</strong> it — the default; (2) <strong>allowedLateness</strong> — keep the window state a while longer so a late ping re-fires an updated result; (3) <strong>side output</strong> — route late pings to a separate stream for auditing or correction. Uber typically combines a small allowedLateness with a late-data side output so nothing is silently lost.</p>`
    }
  ],

  m10: [
    {
      prompt: 'Explain the difference between tumbling, sliding, and session windows, with an Uber use case for each.',
      keyPoints: [
        'Tumbling: fixed, non-overlapping, each event in exactly one window',
        'Sliding: fixed size + slide step, windows overlap, events in several',
        'Session: dynamic, gap-based, closes after inactivity',
        'Choose by whether you need discrete buckets, smooth rolling metrics, or activity bursts'
      ],
      modelAnswer: `<p><strong>Tumbling</strong> windows are fixed-size and non-overlapping; each event belongs to exactly one. Use for discrete buckets — "rides per 1-minute interval per zone" for surge.</p>
<p><strong>Sliding</strong> windows have a fixed size plus a smaller slide; they overlap, so an event can fall in multiple. Use for smooth rolling metrics — "average speed over the last 5 minutes, updated every 1 minute" to detect anomalies.</p>
<p><strong>Session</strong> windows are dynamic: they group events separated by less than a configurable inactivity <em>gap</em> and close once the gap elapses. Use for activity bursts — "group all GPS pings of a single continuous trip, where a 10-minute silence means the trip ended." Session window sizes vary per key because they're driven by the data, not the clock.</p>`
    },
    {
      prompt: 'Explain how a window trigger, allowed lateness, and the window state interact when late data arrives.',
      keyPoints: [
        'Trigger decides WHEN to emit (default: on watermark past window end)',
        'allowedLateness keeps window state after the first firing',
        'Late events within that period re-trigger and update output',
        'State is purged only after window end + allowedLateness'
      ],
      modelAnswer: `<p>A <strong>trigger</strong> controls <em>when</em> a window emits. The default event-time trigger fires once, when the watermark passes the window end.</p>
<p><strong>allowedLateness</strong> extends how long the window's <em>state is retained</em> after that first firing. During this grace period, each late event that still belongs to the window <strong>re-fires the trigger</strong>, and the window emits an <em>updated</em> result (downstream must handle these as updates/retractions).</p>
<p>The window's accumulated state (the partial aggregate) is only <strong>purged</strong> once the watermark passes <code>window end + allowedLateness</code>; after that, even later events are dropped or sent to a side output. So the three cooperate: trigger = emit timing, allowedLateness = how long to stay correctable, state lifetime = window end + lateness.</p>`
    }
  ],

  m11: [
    {
      prompt: 'Explain the difference between keyed state and operator state, and give an example of each.',
      keyPoints: [
        'Keyed state is scoped per key on a keyed stream',
        'Operator state is scoped per parallel operator instance',
        'Keyed: ValueState/ListState/MapState per driver',
        'Operator state example: Kafka source partition offsets'
      ],
      modelAnswer: `<p><strong>Keyed state</strong> exists only on a <em>keyed</em> stream and is partitioned <strong>per key</strong>. Each key (e.g., each <code>driverId</code>) has its own independent state, and a subtask only sees the keys in its key-group range. Primitives: <code>ValueState</code> (one value per key — a driver's running ping count), <code>ListState</code>, <code>MapState</code>, aggregating/reducing state.</p>
<p><strong>Operator state</strong> is scoped to a <em>parallel operator instance</em>, not to a key. The canonical example is the <strong>Kafka source storing its partition offsets</strong> — each source subtask holds the offsets of the partitions it reads. It's also used by sinks for buffered-but-uncommitted data. On rescaling, operator state is redistributed (e.g., round-robin / union) across the new instances.</p>
<p>Rule of thumb: per-entity logic → keyed state; per-connector/per-instance bookkeeping → operator state.</p>`
    },
    {
      prompt: 'Explain the trade-offs between the heap-based state backend and RocksDB, and what state TTL does.',
      keyPoints: [
        'HashMap/heap backend: state in JVM memory, fastest, limited by RAM/GC',
        'RocksDB: on-disk (off-heap), supports state larger than memory',
        'RocksDB enables incremental checkpoints; heap does full snapshots',
        'TTL expires state entries to bound unbounded key spaces'
      ],
      modelAnswer: `<p>The <strong>HashMapStateBackend</strong> keeps state as objects on the JVM heap: lowest latency, but capped by available memory and exposed to GC pauses — fine for small state.</p>
<p><strong>EmbeddedRocksDBStateBackend</strong> stores state in an off-heap, on-disk LSM store. It is slower per access (serialization + disk), but holds <strong>state far larger than memory</strong> and supports <strong>incremental checkpoints</strong> (only changed SST files are uploaded), whereas the heap backend always takes full snapshots. For per-driver state across millions of drivers, RocksDB is the production choice.</p>
<p><strong>State TTL</strong> attaches an expiration to state entries so they're cleaned up after a period of inactivity. Without it, an ever-growing key space (every rider/driver ever seen) would leak memory/disk forever. TTL bounds state size — e.g., drop a rider's session state 24h after their last event.</p>`
    }
  ],

  m12: [
    {
      prompt: 'Explain what a checkpoint barrier is and how it produces a globally consistent snapshot of a distributed job.',
      keyPoints: [
        'Barriers are injected by sources and flow with the data',
        'A barrier separates pre-snapshot from post-snapshot records',
        'Operators snapshot state when barriers arrive on all inputs',
        'Based on Chandy-Lamport asynchronous distributed snapshots'
      ],
      modelAnswer: `<p>A <strong>checkpoint barrier</strong> is a marker the JobManager tells the sources to inject into the stream. It flows in-band with the records and <em>separates</em> records that belong "before" the checkpoint from those "after."</p>
<p>When an operator receives the barrier on an input, everything before it has been incorporated into that operator's state. Once the operator has received the barrier on <strong>all</strong> its input channels (this is barrier <em>alignment</em>), it <strong>snapshots its state</strong> asynchronously and forwards the barrier downstream.</p>
<p>When barriers reach all sinks, the JobManager marks the checkpoint complete. Because every operator snapshots at the "same logical cut" defined by the barriers, the collection of per-operator snapshots forms a <strong>globally consistent</strong> state — a variant of the Chandy-Lamport algorithm — from which the whole job can recover exactly-once.</p>`
    },
    {
      prompt: 'Explain the difference between aligned and unaligned checkpoints, and why incremental checkpoints matter at Uber scale.',
      keyPoints: [
        'Aligned: operator waits for barriers on all inputs (buffers fast ones)',
        'Unaligned: barrier overtakes in-flight data, which is snapshotted too',
        'Unaligned cuts checkpoint time under backpressure',
        'Incremental: only changed state (RocksDB SSTs) is uploaded'
      ],
      modelAnswer: `<p><strong>Aligned</strong> checkpointing makes an operator wait until the barrier arrives on <em>every</em> input channel, buffering data from channels whose barrier came early. Under <strong>backpressure</strong>, a slow channel delays the barrier and checkpoints balloon or time out.</p>
<p><strong>Unaligned</strong> checkpointing lets the barrier <em>overtake</em> buffered in-flight records; those in-flight records are snapshotted as part of the checkpoint. This decouples checkpoint duration from backpressure, so checkpoints still complete quickly when the job is congested — at the cost of a larger snapshot.</p>
<p><strong>Incremental</strong> checkpoints (RocksDB) upload only the <em>changed</em> SST files since the last checkpoint instead of the full state. With terabytes of per-driver state, full snapshots every interval would saturate the network and storage; incremental keeps checkpointing cheap and frequent, which is what sustains a tight recovery point at Uber scale.</p>`
    }
  ],

  m13: [
    {
      prompt: 'Explain how Flink recovers from a TaskManager crash and still delivers exactly-once results.',
      keyPoints: [
        'JobManager detects failure, job enters FAILING/RESTARTING',
        'All affected tasks restored from the last completed checkpoint',
        'Sources rewind to checkpointed offsets and replay',
        'Transactional sinks abort uncommitted output to avoid duplicates'
      ],
      modelAnswer: `<p>When a TaskManager dies, the JobManager detects the lost heartbeat, fails the job, and (per the restart strategy) restarts it. Flink <strong>restores every operator's state from the last completed checkpoint</strong> and <strong>rewinds the sources</strong> to the offsets captured in that same checkpoint.</p>
<p>Because state and source position come from one consistent snapshot, replaying from those offsets re-derives exactly the records lost since the checkpoint — no gaps. On the output side, <strong>transactional sinks abort</strong> any transaction that was open but not committed at failure time, so no duplicate or partial writes become visible.</p>
<p>The net effect is <strong>exactly-once state</strong> and, with 2PC sinks, exactly-once end-to-end — the only visible cost is reprocessing the window of events since the last checkpoint (the recovery time).</p>`
    },
    {
      prompt: 'Explain the common restart strategies and how region (pipelined-region) failover reduces recovery cost.',
      keyPoints: [
        'fixed-delay: N restarts with a delay between them',
        'failure-rate: restart unless failures exceed a rate in an interval',
        'exponential-delay: backoff grows with repeated failures',
        'Region failover restarts only the affected connected region, not the whole job'
      ],
      modelAnswer: `<p><strong>Restart strategies</strong> decide whether and how to retry:</p>
<ul>
<li><strong>fixed-delay</strong> — up to N attempts with a fixed delay each.</li>
<li><strong>failure-rate</strong> — keep restarting unless the failure count exceeds a threshold within a time window (then fail permanently).</li>
<li><strong>exponential-delay</strong> — backoff that grows with consecutive failures, avoiding tight crash loops.</li>
<li><strong>none</strong> — fail immediately.</li>
</ul>
<p><strong>Region (pipelined-region) failover</strong> limits the blast radius. Flink partitions the graph into regions connected by pipelined exchanges; a failure only restarts the <em>region</em> containing the failed task (and downstream regions depending on lost results), not the entire job. For a wide fraud pipeline, this means one crashed subtask's region recovers while unrelated branches keep running — far cheaper than a full-job restart.</p>`
    }
  ],

  m13b: [
    {
      prompt: 'Explain the difference between a checkpoint and a savepoint, and when you use each.',
      keyPoints: [
        'Checkpoint: automatic, for fault-tolerance/recovery, Flink-owned',
        'Savepoint: manual, for planned operations (upgrades, rescaling)',
        'Checkpoints may be incremental/optimized; savepoints are self-contained portable snapshots',
        'Savepoints survive job cancellation; checkpoints are usually cleaned up'
      ],
      modelAnswer: `<p>Both are consistent snapshots of job state, but they serve different masters.</p>
<p><strong>Checkpoints</strong> are <em>automatic</em> and periodic, owned by Flink, optimized for fast recovery (often incremental, tied to the current backend layout). They exist to let the job <strong>recover from failure</strong> and are typically deleted when the job stops.</p>
<p><strong>Savepoints</strong> are <em>manually triggered</em> (or taken on stop), self-contained and portable, designed for <strong>planned lifecycle operations</strong>: upgrading your job code, bumping Flink versions, rescaling parallelism, or doing A/B migrations. A savepoint deliberately <strong>survives cancellation</strong> so you can stop a job and later resume from exactly that point.</p>
<p>Rule of thumb: checkpoints = "the machine recovers itself," savepoints = "I, the operator, am about to change something."</p>`
    },
    {
      prompt: 'Explain why stable operator UIDs and schema evolution matter when restoring a job from a savepoint.',
      keyPoints: [
        'State in a savepoint is keyed by operator UID',
        'Without explicit uid(), auto-generated IDs break on code changes',
        'Matching UIDs let Flink map saved state to the new job graph',
        'Schema evolution lets state types change (e.g., Avro/POJO) across restores'
      ],
      modelAnswer: `<p>A savepoint stores each operator's state under that operator's <strong>UID</strong>. On restore, Flink matches saved state to operators <em>by UID</em>. If you never call <code>.uid()</code>, Flink auto-generates IDs from the graph topology — so adding or reordering an operator <strong>changes the IDs</strong> and the restore fails to find the state (or maps it wrong).</p>
<p>Assigning <strong>explicit, stable UIDs</strong> to every stateful operator decouples state identity from graph position, so you can refactor the job and still restore. (<code>allowNonRestoredState</code> handles state whose operator you intentionally removed.)</p>
<p><strong>Schema evolution</strong> addresses the state's <em>type</em>: when the shape of the stored data changes (new field in an Avro record or POJO), compatible evolution rules let Flink read old state with the new schema. Together, stable UIDs + schema evolution are what make zero-data-loss upgrades of the Uber pipeline possible.</p>`
    }
  ],

  m14: [
    {
      prompt: 'Explain what backpressure is and how it propagates through a Flink pipeline.',
      keyPoints: [
        'Backpressure = downstream can\'t keep up with upstream rate',
        'Slow operator stops consuming, buffers fill',
        'Pressure propagates upstream operator by operator',
        'Eventually the source slows down (e.g., stops polling Kafka)'
      ],
      modelAnswer: `<p><strong>Backpressure</strong> is the condition where a downstream operator can't process records as fast as they arrive. The slow operator stops draining its input buffers; those buffers fill up, so the <em>upstream</em> operator can no longer hand off records and in turn slows, and so on.</p>
<p>This pressure <strong>propagates backward</strong> through the chain until it reaches the <strong>source</strong>, which then slows its own consumption — for the Kafka source, it simply polls fewer records. The system self-throttles to the speed of its slowest stage rather than overflowing memory.</p>
<p>Backpressure is normal and protective, but <em>sustained</em> backpressure signals a bottleneck (a hot key, a slow sink, under-parallelized operator) you need to investigate via the Flink UI's backpressure metrics.</p>`
    },
    {
      prompt: 'Explain how Flink\'s credit-based flow control manages backpressure between TaskManagers.',
      keyPoints: [
        'Receiver advertises available buffer credits to the sender',
        'Sender only transmits as many buffers as it has credits for',
        'Prevents overwhelming a slow receiver / TCP-level blocking',
        'Gives fine-grained, per-channel backpressure without stalling the shared TCP connection'
      ],
      modelAnswer: `<p>Across the network, Flink uses <strong>credit-based flow control</strong>. Each receiving subtask tracks its available network buffers and advertises that count as <strong>credits</strong> to the sender. The sender transmits only up to the credits it has been granted; when a receiver is slow and its buffers fill, its credit drops to zero and the sender stops sending to that channel.</p>
<p>The key benefit is <strong>granularity</strong>. Multiple logical channels multiplex over one TCP connection; without credits, one slow channel blocking the TCP stream would stall <em>all</em> channels sharing it. Credit-based control applies backpressure <strong>per channel</strong>, so a single hot driver-key partition throttles only its own channel while the rest keep flowing. It also makes checkpoint barriers less likely to get stuck behind a congested connection.</p>`
    }
  ],

  m15: [
    {
      prompt: 'Explain the concept of a dynamic table and the stream-table duality in Flink SQL.',
      keyPoints: [
        'A stream can be viewed as a continuously changing (dynamic) table',
        'Querying a dynamic table yields another dynamic table / changelog stream',
        'Duality: table ↔ changelog stream are two views of the same data',
        'Continuous queries emit results as the input evolves'
      ],
      modelAnswer: `<p>Flink SQL runs over <strong>dynamic tables</strong> — tables whose contents change over time as new records arrive. A stream of GPS pings <em>is</em> a dynamic table that keeps growing; conversely, any table can be emitted as a <strong>changelog stream</strong> of inserts/updates/deletes. This equivalence is the <strong>stream-table duality</strong>: a stream and a (changing) table are two representations of the same information.</p>
<p>A SQL query over a dynamic table is a <strong>continuous query</strong>: unlike a batch query that runs once, it runs forever, updating its result dynamic table as inputs change. That result is itself a dynamic table you can convert back to a stream and write to a sink. This is what lets Uber express "live count of rides per zone" as ordinary SQL that never stops running.</p>`
    },
    {
      prompt: 'Explain what a WATERMARK declaration in a Flink SQL CREATE TABLE statement does.',
      keyPoints: [
        'Marks a column as the event-time attribute (rowtime)',
        'Defines the watermark generation strategy inline in DDL',
        'Enables event-time windows / temporal operations in SQL',
        'WATERMARK FOR ts AS ts - INTERVAL \'5\' SECOND = bounded OOO of 5s'
      ],
      modelAnswer: `<p>In a <code>CREATE TABLE</code> DDL, the <strong>WATERMARK</strong> clause both designates the <em>event-time attribute</em> (rowtime) and defines how watermarks are generated from it:</p>
<pre><code>CREATE TABLE gps_pings (
  driver_id STRING,
  ping_ts   TIMESTAMP(3),
  WATERMARK FOR ping_ts AS ping_ts - INTERVAL '5' SECOND
) WITH ('connector' = 'kafka', ...);</code></pre>
<p>Here <code>ping_ts</code> becomes the rowtime attribute, and the watermark is <code>max(ping_ts) − 5s</code> — a bounded-out-of-orderness strategy allowing 5 seconds of lateness. This declaration is what <strong>unlocks event-time semantics in SQL</strong>: tumbling/hopping windows (TVFs), <code>MATCH_RECOGNIZE</code>, interval joins, and temporal joins all rely on this rowtime + watermark to know when event time has advanced.</p>`
    }
  ],

  m16: [
    {
      prompt: 'Explain the difference between a regular Kafka connector table and an upsert-kafka table in Flink SQL.',
      keyPoints: [
        'kafka connector = append-only (insert-only) changelog',
        'upsert-kafka interprets records as keyed upserts/deletes',
        'upsert-kafka requires a PRIMARY KEY and compacted topic semantics',
        'Null value = delete (tombstone) in upsert-kafka'
      ],
      modelAnswer: `<p>The standard <strong><code>kafka</code></strong> connector is <strong>append-only</strong>: each record is an INSERT, suited to an immutable event log like raw GPS pings.</p>
<p><strong><code>upsert-kafka</code></strong> treats the topic as a <strong>changelog keyed by a PRIMARY KEY</strong>. Each record with a key is an UPSERT (insert-or-update) for that key, and a record with a <strong>null value is a tombstone/DELETE</strong>. It can both produce such a changelog (for query results that update, like "current surge price per zone") and consume one, reconstructing the latest value per key. It pairs naturally with a log-compacted topic.</p>
<p>So: use <code>kafka</code> for facts/events, <code>upsert-kafka</code> for continuously-updated state like the latest price or latest driver status, where you care only about the most recent value per key.</p>`
    },
    {
      prompt: 'Explain how a lookup join against a JDBC table works and why it is used for enriching a stream.',
      keyPoints: [
        'Streaming side drives the join; dimension table is queried on demand',
        'FOR SYSTEM_TIME AS OF syntax on the processing-time attribute',
        'Each arriving record looks up current dimension rows (often cached)',
        'Enriches events with slowly-changing reference data without a full stream join'
      ],
      modelAnswer: `<p>A <strong>lookup join</strong> enriches a stream with reference/dimension data held in an external store (JDBC/HBase). The <strong>streaming side drives</strong> the join: for each arriving event, Flink queries the external table for matching rows <em>at that moment</em>, using the <code>FOR SYSTEM_TIME AS OF proc_time</code> syntax on a processing-time attribute.</p>
<pre><code>SELECT p.driver_id, d.home_city
FROM gps_pings AS p
JOIN drivers FOR SYSTEM_TIME AS OF p.proc_time AS d
  ON p.driver_id = d.driver_id;</code></pre>
<p>Rather than materializing and shuffling the entire dimension table as a stream, Flink issues on-demand lookups (typically with a configurable <strong>cache</strong> to cut database load). This is ideal for joining the ping stream to slowly-changing driver metadata — you pay per-key lookups instead of maintaining a full second stream's state, and you always read the <em>current</em> dimension value.</p>`
    }
  ],

  m17: [
    {
      prompt: 'Explain the difference between an append stream, a retract stream, and an upsert stream as outputs of a continuous SQL query.',
      keyPoints: [
        'Append: insert-only, results never change',
        'Retract: emits +I/-U/+U/-D (delete-then-insert to update)',
        'Upsert: emits keyed updates/deletes, needs a primary key',
        'Query semantics (aggregations, joins) determine which is produced'
      ],
      modelAnswer: `<p>How a continuous query's result changes over time determines its changelog mode:</p>
<ul>
<li><strong>Append</strong> — insert-only; past results never change (e.g., a windowed aggregate that finalizes, or a simple projection). Emits only <code>+I</code>.</li>
<li><strong>Retract</strong> — a prior result can change, so the query emits a <strong>retraction</strong> (<code>-</code>) of the old row followed by an <strong>addition</strong> (<code>+</code>) of the new one. A non-windowed <code>GROUP BY</code> count produces retract messages as counts update.</li>
<li><strong>Upsert</strong> — like retract but compacted by a <strong>primary key</strong>: it emits one upsert per key (and deletes), without the separate retraction row. Requires the sink to understand keyed updates (e.g., upsert-kafka, JDBC with PK).</li>
</ul>
<p>The operators you use (windowed vs unbounded aggregation, regular vs temporal join) decide which changelog the planner produces, and the sink must support that mode.</p>`
    },
    {
      prompt: 'Explain a temporal join and how it differs from a regular join, using surge pricing applied to rides.',
      keyPoints: [
        'Temporal join matches a fact to the dimension value AS OF event time',
        'Uses a versioned table (changelog with time + primary key)',
        'FOR SYSTEM_TIME AS OF the event-time attribute',
        'Regular join uses current/latest; temporal join reconstructs historical value'
      ],
      modelAnswer: `<p>A <strong>temporal join</strong> joins a fact stream to the version of a dimension that was valid <em>at the fact's event time</em>, using a <strong>versioned table</strong> (a changelog with a primary key and an event-time attribute).</p>
<pre><code>SELECT r.ride_id, r.fare * s.multiplier AS final_fare
FROM rides AS r
JOIN surge_prices FOR SYSTEM_TIME AS OF r.ride_time AS s
  ON r.zone_id = s.zone_id;</code></pre>
<p>Each ride is multiplied by the surge value that was in effect <strong>when the ride started</strong>, not the latest surge. Flink keeps the versioned history of <code>surge_prices</code> keyed by zone and looks up the correct version by event time.</p>
<p>A <strong>regular join</strong> would match against the <em>current</em> (latest) surge, which is wrong for billing — a ride at 5pm must use 5pm's multiplier even if the query runs later. Temporal joins give point-in-time correctness, essential for auditable pricing and for enriching CDC streams against reference data.</p>`
    }
  ],

  m18: [
    {
      prompt: 'Explain why serialization strategy matters for Flink performance and how to avoid the slow fallback.',
      keyPoints: [
        'Serialization happens on every network shuffle and state access',
        'Flink has efficient serializers for POJOs/Tuples/Avro',
        'Falling back to Kryo (generic) is much slower',
        'Use proper types / registered serializers to stay on the fast path'
      ],
      modelAnswer: `<p>Flink serializes records on <strong>every network exchange</strong> (after a keyBy/rebalance) and on <strong>every RocksDB state read/write</strong>. At 1M pings/sec, serializer efficiency dominates throughput.</p>
<p>Flink ships fast, schema-aware serializers for its native types — <strong>Tuples, POJOs (with public fields / getters-setters and a no-arg constructor), and Avro/Row</strong>. When a type doesn't fit those rules, Flink falls back to <strong>Kryo</strong>, a generic serializer that is markedly slower and produces larger payloads.</p>
<p>To stay on the fast path: design records as proper POJOs or use <code>Row</code>/Avro, avoid non-serializable or deeply generic fields, and if you must use a custom type, <strong>register a specific serializer</strong> rather than letting Kryo handle it. Watching for "falling back to Kryo" log warnings is a standard tuning step.</p>`
    },
    {
      prompt: 'Explain what data skew is in a keyed Flink job and techniques to mitigate a hot key.',
      keyPoints: [
        'Skew = uneven key distribution overloads one subtask',
        'One hot key/partition backpressures the whole job',
        'Mitigate with local pre-aggregation (combine) before keyBy',
        'Salt/split the hot key, then re-aggregate (two-phase aggregation)'
      ],
      modelAnswer: `<p><strong>Data skew</strong> occurs when keys are unevenly distributed, so one subtask receives far more records than its peers — e.g., a mega-event zone or a single bot driver dominating the pings. That subtask becomes the bottleneck, backpressures upstream, and idles the rest of the cluster.</p>
<p>Mitigations:</p>
<ul>
<li><strong>Local pre-aggregation</strong>: combine records per key <em>before</em> the shuffle (mini-batch / local-global aggregation) so far fewer records hit the hot subtask.</li>
<li><strong>Key salting / two-phase aggregation</strong>: append a random salt to the hot key to split it across subtasks, aggregate partials in parallel, then strip the salt and aggregate the partials in a second stage.</li>
<li>Increase parallelism and ensure maxParallelism gives enough key groups, and isolate the heavy operator in its own slot-sharing group.</li>
</ul>
<p>The core idea is to <strong>reduce the volume or spread the load</strong> of the hot key so no single subtask is overwhelmed.</p>`
    }
  ],

  m19: [
    {
      prompt: 'Walk through, end to end, how Uber\'s ride platform could use Flink to turn raw GPS pings into real-time surge pricing and <100ms fraud detection.',
      keyPoints: [
        'Kafka source → event-time timestamps + watermarks',
        'keyBy (zone / driver / rider) with windows + keyed state for aggregates',
        'ProcessFunction + state/timers for low-latency fraud rules',
        'Exactly-once via checkpoints + 2PC sinks to Kafka/JDBC'
      ],
      modelAnswer: `<p><strong>Ingest:</strong> a Kafka source reads the 1M pings/sec topic; each record carries an event-time timestamp, with a bounded-out-of-orderness watermark (plus idleness for quiet zones).</p>
<p><strong>Surge pricing branch:</strong> <code>keyBy(zoneId)</code> into tumbling/sliding event-time windows computes demand (rides, requests) vs supply (available drivers) per zone, producing a surge multiplier. Because results update, this is an upsert/retract stream written to <code>upsert-kafka</code> and a JDBC price table.</p>
<p><strong>Fraud branch:</strong> <code>keyBy(riderId/cardId)</code> feeds a <code>KeyedProcessFunction</code> that holds per-entity keyed state and timers to evaluate rules (velocity of payment attempts, impossible travel between pings) with <strong>sub-100ms</strong> latency, emitting alerts; it uses a late-data side output for stragglers.</p>
<p><strong>Enrichment:</strong> lookup/temporal joins add driver and pricing-version context point-in-time.</p>
<p><strong>Guarantees & ops:</strong> incremental RocksDB checkpoints give exactly-once state; 2PC Kafka/JDBC sinks give end-to-end exactly-once; stable operator UIDs + savepoints allow zero-loss upgrades and rescaling; region failover and credit-based flow control keep it resilient under load. One Flink job thus serves both pricing and fraud from the same ping stream.</p>`
    },
    {
      prompt: 'Explain the key design decisions (time, state, delivery guarantees, scaling) you would defend in a capstone review of this pipeline, and the trade-offs behind each.',
      keyPoints: [
        'Event time + watermark bound: correctness vs latency trade-off',
        'RocksDB + TTL + incremental checkpoints for large, bounded state',
        'Exactly-once (2PC) vs at-least-once: correctness vs throughput/latency',
        'maxParallelism/key groups + skew handling for future rescaling'
      ],
      modelAnswer: `<p><strong>Time:</strong> choose <em>event time</em> for deterministic, reprocessable pricing, accepting that the watermark bound adds latency — tune the bound to balance correctness against the surge-update SLA, and use idleness so sparse zones don't stall the job.</p>
<p><strong>State:</strong> use <em>RocksDB</em> because per-driver/rider state exceeds memory, with <em>incremental checkpoints</em> to keep snapshots cheap and <em>TTL</em> to bound the unbounded key space. Trade-off: slower per-access than heap, worth it for scale.</p>
<p><strong>Delivery:</strong> the fraud/billing outputs demand <em>exactly-once</em> via checkpoints + 2PC sinks; acknowledge this adds latency (commit-on-checkpoint) and throughput cost versus at-least-once, and justify it because duplicate charges or missed fraud are unacceptable.</p>
<p><strong>Scaling:</strong> set <em>maxParallelism</em> (hence key groups) high enough to rescale as ride volume grows, plan for <em>data skew</em> with local/two-phase aggregation and salting, use region failover for resilience, and rely on <em>savepoints with stable UIDs</em> for safe upgrades. Each choice trades simplicity/latency for the correctness and operability a production money-moving pipeline requires.</p>`
    }
  ]
};
