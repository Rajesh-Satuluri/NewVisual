// Foundations curriculum content (I30–I36) — 15 modules.
// Vendor-neutral streaming first principles. Each module = tabbed lesson.
// Modules with `sim` mount a real deterministic simulator from sim/stream-engine.js.
// Scenario-aware prose uses {ENTITY}/{KEY}/{ID} tokens filled from the active scenario.

export const FOUNDATIONS = [
  {
    id: 'f01', num: '01', icon: '💡', title: 'Why streaming?',
    idea: 'Batch answers "what happened"; streaming answers "what is happening".',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>The core shift</h3>
        <p><b>Batch processing</b> collects data into big chunks and processes them on a schedule —
        every hour, every night. You always look at the past. <b>Stream processing</b> handles each
        event as it arrives, so answers stay continuously up to date — seconds old, not hours.</p>
        <p>The world produces data as an endless flow: a {ENTITY} happens, then another, then
        another, forever. Streaming treats data as what it actually is — an <b>unbounded</b>,
        never-ending sequence — instead of pretending it ends so you can batch it.</p>
        <h3>When streaming earns its cost</h3>
        <ul class="clean">
          <li><b>Freshness matters:</b> fraud detection, alerting, live dashboards, personalization.</li>
          <li><b>Reaction matters:</b> you must <i>do</i> something the moment an event occurs.</li>
          <li><b>Volume is continuous:</b> waiting to batch would mean giant, bursty jobs.</li>
        </ul>` },
      { id: 'tradeoffs', label: '⚖️ Trade-offs', body: `
        <h3>Batch vs streaming — honest comparison</h3>
        <div class="grid cols-2">
          <div class="card"><b>Batch wins when…</b>
            <ul class="clean"><li>Results are only needed periodically</li><li>Logic needs the whole dataset (big joins, training)</li><li>Simplicity and reprocessing are priorities</li></ul></div>
          <div class="card"><b>Streaming wins when…</b>
            <ul class="clean"><li>Latency budget is seconds or sub-second</li><li>Data never "finishes"</li><li>Value decays fast (a stale fraud alert is useless)</li></ul></div>
        </div>
        <div class="lx-callout lx-info"><b>They are not enemies.</b><div>Most real platforms run both — streaming for
        fresh answers, batch for heavy historical reprocessing. The "Kappa" vs "Lambda" debate is about how much you unify them.</div></div>` },
    ],
  },
  {
    id: 'f02', num: '02', icon: '📦', title: 'Events & streams',
    idea: 'An event is an immutable fact: something happened at a point in time.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>What is an event?</h3>
        <p>An <b>event</b> records that something happened — a {ENTITY} occurred. It has a
        <b>key</b> (what it is about, e.g. <code>{KEY}</code>), a <b>value</b> (the payload), and a
        <b>timestamp</b> (when it happened). Events are <b>immutable</b>: you never edit an event,
        you append a new one.</p>
        <h3>What is a stream?</h3>
        <p>A <b>stream</b> is an append-only, ordered log of events. New events go on the end;
        old events are never changed. This log is the single source of truth — everything
        downstream is a <i>view</i> computed from it.</p>
        <div class="lx-keypoints"><div class="lx-kp-h">Key points</div><ul class="clean">
          <li>Event = immutable fact (key, value, time).</li>
          <li>Stream = ordered, append-only log of events.</li>
          <li>Ordering is only guaranteed <i>per key / per partition</i>, not globally.</li>
        </ul></div>` },
      { id: 'shape', label: '🧾 Event shape', body: `
        <h3>A concrete event</h3>
        <p>In the active scenario, a representative event looks like this:</p>
        <div id="f02-event"></div>
        <p>Notice the two times you'll meet again and again: when it <b>happened</b> and when it
        <b>arrived</b>. Confusing the two is the #1 source of streaming bugs (see Module 06).</p>` },
    ],
  },
  {
    id: 'f03', num: '03', icon: '🔀', title: 'Producers, brokers & consumers',
    idea: 'Producers write, brokers store & order, consumers read — decoupled in time.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>The three roles</h3>
        <ul class="clean">
          <li><b>Producer</b> — writes events into the log. It doesn't know or care who reads them.</li>
          <li><b>Broker</b> (the streaming platform) — durably stores events in order and serves them.</li>
          <li><b>Consumer</b> — reads events at its own pace and does work with them.</li>
        </ul>
        <h3>Why this decoupling is the whole point</h3>
        <p>Producers and consumers never talk directly. The broker's durable log sits between them,
        so they are <b>decoupled in time</b>: a consumer can be offline for an hour and catch up
        later; a slow consumer never slows the producer; you can add new consumers that re-read
        history without the producer knowing. This is the superpower a message <i>queue</i> (which
        deletes on read) does not give you.</p>
        <div class="lx-callout lx-info"><b>Log, not queue.</b><div>A streaming log keeps events after they're read (until retention expires),
        so many independent consumers can each read the same stream from their own position.</div></div>` },
    ],
  },
  {
    id: 'f04', num: '04', icon: '🧩', title: 'Partitions & shards',
    idea: 'Split the log by key so work parallelizes while order is preserved per key.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>One log can't scale — so split it</h3>
        <p>A single ordered log is a bottleneck: one writer, one reader, one disk. The fix is to
        split the stream into <b>partitions</b> (Kafka) / <b>shards</b> (Kinesis) — independent
        sub-logs that can be written and read in parallel on different machines.</p>
        <h3>The key decides the partition</h3>
        <p>An event's <b>key</b> is hashed to pick its partition. Same key → same partition →
        <b>order preserved for that key</b>. Different keys spread across partitions for parallelism.
        In the active scenario we key on <code>{KEY}</code>, so all events for one {ENTITY} stay
        ordered together while unrelated {ENTITY}s process in parallel.</p>
        <div class="lx-callout lx-warn"><b>Hot partitions.</b><div>If one key is far busier than others (a celebrity user,
        a mega-seller), its partition overloads while others idle. Choosing a good key is a real design decision — explored hands-on
        in the Kafka Partition Simulator.</div></div>` },
      { id: 'math', label: '🔢 The routing rule', body: `
        <h3>How a key becomes a partition</h3>
        <p>The platform computes <code>partition = hash(key) mod partitionCount</code>. It is
        deterministic: the same key always lands on the same partition (as long as the partition
        count doesn't change).</p>
        <div class="lx-code"><div class="lx-code-lang">concept</div><pre><code>partition = toPositive(hash(utf8(key))) % numPartitions</code></pre></div>
        <p>Kafka uses <b>murmur2</b> for this exact computation — you can watch real keys route live in
        the <b>Kafka → Partition Simulator</b>, which runs the genuine algorithm.</p>` },
    ],
  },
  {
    id: 'f05', num: '05', icon: '📍', title: 'Offsets, positions & replay',
    idea: 'Each consumer tracks its own position; rewinding it replays history.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>Position, not deletion</h3>
        <p>Every event in a partition has a monotonically increasing <b>offset</b> (Kafka) /
        <b>sequence number</b> (Kinesis). A consumer remembers "I've processed up to offset N" —
        its <b>committed position</b>. Reading doesn't delete anything.</p>
        <h3>Why this is powerful</h3>
        <ul class="clean">
          <li><b>Replay:</b> rewind the position to reprocess history (new model, fixed bug).</li>
          <li><b>Lag:</b> latest offset − committed offset = how far behind a consumer is.</li>
          <li><b>Independence:</b> each consumer group has its own positions over the same data.</li>
        </ul>
        <div class="lx-callout lx-info"><b>Commit carefully.</b><div>Commit <i>after</i> you've safely processed an event, or a crash
        between "commit" and "process" loses data (at-most-once). Commit timing is what delivery guarantees (Module 11) are all about.</div></div>` },
    ],
  },
  {
    id: 'f06', num: '06', icon: '⏱️', title: 'Event time vs processing time',
    idea: 'When it happened ≠ when you saw it. Correct results use event time.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>Two clocks</h3>
        <ul class="clean">
          <li><b>Event time</b> — when the event actually happened (stamped at the source).</li>
          <li><b>Processing time</b> — when your pipeline happened to handle it.</li>
        </ul>
        <p>These differ because of network delays, retries, mobile devices going offline, and
        backlogs. A phone in a tunnel buffers {ENTITY} events and sends them 30 seconds late — same
        event time, much later processing time.</p>
        <h3>Why it matters</h3>
        <p>If you bucket data by <b>processing time</b>, your results change depending on how fast
        your system happens to run — reprocessing yesterday's data gives different numbers. Bucketing
        by <b>event time</b> gives <b>correct, reproducible</b> results regardless of delays. The
        price: you must handle out-of-order and late data — which is exactly what watermarks solve.</p>` },
      { id: 'sim', label: '🔬 See the skew', body: `
        <h3>Out-of-order arrivals</h3>
        <p>Below, events are generated with random network delay. The <b>top row</b> is event time
        (truth); the <b>bottom row</b> is arrival order (what your pipeline sees). Watch them disagree.</p>
        <div id="f06-sim" class="sim-wrap"></div>` },
    ],
    sim: 'skew',
  },
  {
    id: 'f07', num: '07', icon: '🌊', title: 'Watermarks',
    idea: 'A watermark is the engine\'s promise: "I\'ve probably seen everything up to time T."',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>The out-of-order problem</h3>
        <p>If data can arrive late, when is it safe to say a time window is "done" and emit its
        result? Wait forever and you never produce output; fire too early and you miss stragglers.</p>
        <h3>The watermark</h3>
        <p>A <b>watermark</b> is a moving marker that flows with the stream meaning <i>"I believe all
        events with event time ≤ T have now arrived."</i> A common rule is
        <b>bounded out-of-orderness</b>: <code>watermark = maxEventTimeSeen − allowedLateness</code>.
        When the watermark passes a window's end, the window fires.</p>
        <div class="lx-keypoints"><div class="lx-kp-h">Key points</div><ul class="clean">
          <li>Watermark = progress of event time, not wall-clock time.</li>
          <li>Bigger <code>allowedLateness</code> → more correct, higher latency. It's a dial, not a free lunch.</li>
          <li>Events arriving after the watermark passed their window are <b>late</b>.</li>
        </ul></div>` },
      { id: 'sim', label: '🔬 Watermark simulator', body: `
        <h3>Tune the lateness dial</h3>
        <p>Events arrive out of order. The amber line is the watermark. Raise <b>allowed lateness</b>
        to let the watermark lag further behind — catching more stragglers on time, at the cost of
        waiting longer before windows fire. Red events arrived too late.</p>
        <div id="f07-sim" class="sim-wrap"></div>` },
    ],
    sim: 'watermarks',
  },
  {
    id: 'f08', num: '08', icon: '🪟', title: 'Windows',
    idea: 'Windows chop an endless stream into finite chunks you can aggregate.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>You can't sum an infinite stream</h3>
        <p>"Count {ENTITY}s" over an unbounded stream never finishes. <b>Windows</b> bound it:
        group events into finite buckets by time, then aggregate each bucket.</p>
        <h3>The three shapes</h3>
        <ul class="clean">
          <li><b>Tumbling</b> — fixed, non-overlapping (every 5 min, back to back). Each event in exactly one window.</li>
          <li><b>Sliding/hopping</b> — fixed size, overlapping (5-min window every 1 min). An event can be in several.</li>
          <li><b>Session</b> — dynamic; a window closes after a gap of inactivity. Great for "a user's browsing session".</li>
        </ul>
        <div class="lx-callout lx-info"><b>Windows are event-time based.</b><div>They rely on watermarks (Module 07) to know when a window
        is complete and can fire.</div></div>` },
      { id: 'sim', label: '🔬 Window animator', body: `
        <h3>Compare tumbling vs sliding</h3>
        <p>Switch window type and size; see which events fall into which windows and how the counts
        differ. Sliding windows overlap, so the same event contributes to multiple results.</p>
        <div id="f08-sim" class="sim-wrap"></div>` },
    ],
    sim: 'windows',
  },
  {
    id: 'f09', num: '09', icon: '🧠', title: 'State & stateful processing',
    idea: 'Remembering across events (counts, joins, dedup) is what makes streaming powerful — and hard.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>Stateless vs stateful</h3>
        <p><b>Stateless</b> operations handle each event alone (filter, map, reformat).
        <b>Stateful</b> operations remember things across events: running counts, window
        aggregates, joins between streams, deduplication, "have I seen this {KEY} before?".</p>
        <h3>Keyed state</h3>
        <p>State is partitioned <b>by key</b>, just like the stream. The counter for <code>{KEY}=X</code>
        lives wherever X's partition is processed. That's why repartitioning (a "shuffle") is needed
        when you change the key — the state has to move with it.</p>
        <div class="lx-callout lx-warn"><b>State must survive failure.</b><div>If a machine holding state crashes, you can't just
        start from zero. That's the job of checkpointing — Module 10.</div></div>` },
    ],
  },
  {
    id: 'f10', num: '10', icon: '💾', title: 'Checkpointing & recovery',
    idea: 'Periodic consistent snapshots of state + position let you recover exactly where you were.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>The problem</h3>
        <p>Stateful jobs run for weeks. Machines fail. Without a plan, a crash loses all in-memory
        state (every running count, every window) — catastrophic.</p>
        <h3>Checkpoints</h3>
        <p>The engine periodically takes a <b>consistent snapshot</b>: the keyed state <i>plus</i> the
        exact input positions (offsets) that produced it, saved to durable storage. On failure it
        restores the latest snapshot and resumes reading from those offsets — no data lost, no state
        reset. Flink calls the manual, portable version a <b>savepoint</b> (used for upgrades).</p>
        <div class="lx-keypoints"><div class="lx-kp-h">Key points</div><ul class="clean">
          <li>A checkpoint couples <b>state + offsets</b> — that coupling is what makes recovery correct.</li>
          <li>More frequent checkpoints → faster recovery, more overhead.</li>
          <li>Checkpoint = automatic/for-recovery; savepoint = manual/for-upgrades.</li>
        </ul></div>` },
      { id: 'sim', label: '🔬 Crash & recover', body: `
        <h3>Watch a recovery</h3>
        <p>Process some events, take a checkpoint, then "crash". Restoring the checkpoint reproduces
        the exact state and resumes from the saved offset — not from zero.</p>
        <div id="f10-sim" class="sim-wrap"></div>` },
    ],
    sim: 'checkpoint',
  },
  {
    id: 'f11', num: '11', icon: '🛡️', title: 'Delivery guarantees',
    idea: 'At-most-once, at-least-once, exactly-once — and why "exactly-once" is subtler than it sounds.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>Three levels</h3>
        <ul class="clean">
          <li><b>At-most-once</b> — may lose events, never duplicates. (Commit position before processing.)</li>
          <li><b>At-least-once</b> — never loses, may duplicate. (Process, then commit; a crash between replays.)</li>
          <li><b>Exactly-once</b> — each event affects the result once, even across failures.</li>
        </ul>
        <h3>The honest truth about exactly-once</h3>
        <p>"Exactly-once" is really <b>effectively-once processing</b>: the engine uses checkpoints +
        idempotent or transactional writes so results are correct despite retries. It holds
        <b>within a system</b> under specific conditions. <b>End-to-end</b> exactly-once also needs
        the <i>sink</i> to cooperate — transactional (e.g. Kafka transactions, a Delta table) or
        idempotent. If your sink can't do that, you fall back to at-least-once + dedup.</p>
        <div class="lx-callout lx-danger"><b>Never overstate it.</b><div>A pipeline is only end-to-end exactly-once if <i>every</i> hop —
        source, processing, and sink — supports it. Marketing says "exactly-once"; engineering checks the sink.</div></div>` },
    ],
  },
  {
    id: 'f12', num: '12', icon: '📈', title: 'Throughput, latency, lag & backpressure',
    idea: 'When consumers can\'t keep up, lag grows and backpressure pushes back through the pipeline.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>The four numbers you live by</h3>
        <ul class="clean">
          <li><b>Throughput</b> — events/sec the pipeline sustains.</li>
          <li><b>Latency</b> — time from event happening to result produced.</li>
          <li><b>Lag</b> — how far behind the consumer is (unread events piling up).</li>
          <li><b>Backpressure</b> — the signal a slow stage sends upstream to "slow down".</li>
        </ul>
        <h3>How they interact</h3>
        <p>If input rate &gt; processing rate, a queue builds: <b>lag grows</b>. A well-designed engine
        responds with <b>backpressure</b> — it slows the source rather than running out of memory. Lag
        that keeps climbing is your earliest warning that a pipeline is under-provisioned or stuck.</p>` },
      { id: 'sim', label: '🔬 Backpressure simulator', body: `
        <h3>Push the input past the limit</h3>
        <p>Raise input rate above processing rate and watch lag climb and backpressure engage. Drop it
        back below and the queue drains.</p>
        <div id="f12-sim" class="sim-wrap"></div>` },
    ],
    sim: 'backpressure',
  },
  {
    id: 'f13', num: '13', icon: '🔁', title: 'Reliability patterns',
    idea: 'Replication, idempotency, dead-letter queues and retries keep pipelines correct under failure.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>Failure is normal — design for it</h3>
        <ul class="clean">
          <li><b>Replication:</b> each partition is copied to several brokers; if the leader dies, a
          follower takes over. Durability = how many copies must acknowledge a write.</li>
          <li><b>Idempotency:</b> make reprocessing safe — "set balance to X", not "add X" — so
          at-least-once duplicates don't corrupt results.</li>
          <li><b>Dead-letter queue (DLQ):</b> route un-processable events aside instead of blocking the
          stream or crash-looping.</li>
          <li><b>Retries with backoff:</b> transient failures (a brief outage) recover on retry;
          backoff avoids hammering a struggling dependency.</li>
        </ul>
        <div class="lx-callout lx-info"><b>Idempotency is the quiet hero.</b><div>It turns the easy-and-cheap at-least-once into
        effectively-once for many real workloads — no distributed transactions required.</div></div>` },
    ],
  },
  {
    id: 'f14', num: '14', icon: '🔭', title: 'Observability',
    idea: 'You cannot operate what you cannot see: lag, throughput, checkpoint health, and errors.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>The signals that matter</h3>
        <ul class="clean">
          <li><b>Consumer lag</b> — the single most important health metric. Rising lag = trouble.</li>
          <li><b>Throughput in/out</b> — are we keeping up with the source?</li>
          <li><b>Checkpoint duration &amp; success rate</b> — failing/slow checkpoints predict bad recoveries.</li>
          <li><b>Error / DLQ rate</b> — how many events can't be processed.</li>
          <li><b>Watermark lag</b> — how far event-time progress trails wall-clock.</li>
        </ul>
        <h3>Golden rule</h3>
        <p>Alert on <b>lag trend</b> and <b>checkpoint failures</b> first — they catch most incidents
        before users notice. Build dashboards per partition/shard, because problems are often
        skewed to one hot key.</p>` },
    ],
  },
  {
    id: 'f15', num: '15', icon: '🏗️', title: 'End-to-end reference architecture',
    idea: 'Put it together: sources → streaming log → stateful processing → sinks, observable throughout.',
    tabs: [
      { id: 'why', label: '📖 What & Why', body: `
        <h3>The canonical shape</h3>
        <p>Nearly every streaming platform is the same backbone:</p>
        <ol class="clean">
          <li><b>Sources</b> — apps/devices emit events (the {ENTITY} stream).</li>
          <li><b>Ingest / log</b> — Kafka / Kinesis / Event Hubs durably stores & partitions them.</li>
          <li><b>Stream processing</b> — Flink / Kafka Streams / Spark does windowing, joins, stateful logic with checkpoints.</li>
          <li><b>Sinks</b> — results land in a warehouse, a serving store, dashboards, or another topic.</li>
          <li><b>Observability</b> — lag, throughput, checkpoint health wrap the whole thing.</li>
        </ol>
        <div id="f15-pipeline"></div>
        <div class="lx-callout lx-ok"><b>You now have the map.</b><div>Every engine and cloud section ahead is a concrete implementation of
        this same backbone. Keep the shape in mind and the specifics slot in.</div></div>` },
    ],
    sim: 'pipeline',
  },
];

export const foundationById = (id) => FOUNDATIONS.find(m => m.id === id);
