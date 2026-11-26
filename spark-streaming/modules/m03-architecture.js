// M03 · Architecture & Components — Architecture
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock } from './_mod-ui.js';

export const IQ = [
  { q: 'Walk me through the components of a running Structured Streaming query.', a: '<p><b>Driver</b> — runs the <b>micro-batch planner</b>: on each trigger it reads new offsets from the source, builds the logical/physical plan via <b>Catalyst</b>, and schedules tasks. <b>Executors</b> run those tasks and host the <b>State Store</b> (partitioned by key) for stateful ops. The <b>source</b> supplies replayable offsets; the <b>sink</b> receives the result; the <b>checkpoint</b> (offset log + commit log + state snapshots) makes it all recoverable. The driver also updates the <b>watermark</b> after each batch.</p>', tip: 'Name all five: driver/planner, executors, state store, source/sink, checkpoint. Then mention the watermark is driver-maintained.' },
  { q: 'What does the driver do on each trigger (the micro-batch lifecycle)?', a: '<p>1) Ask the source for the <b>offset range</b> of new data; 2) write those offsets to the <b>offset log</b> (WAL) <i>before</i> processing; 3) plan + schedule the batch across executors; 4) executors read the data, update <b>state</b>, compute the result; 5) the sink commits; 6) write the <b>commit log</b> entry; 7) advance the <b>watermark</b>. The offset-before / commit-after ordering is what enables exactly-once recovery (M15–M16).</p>', tip: 'The offset-log-before, commit-log-after sequence is the single most important detail — it recurs in every fault-tolerance question.' },
  { q: 'How does Catalyst/Tungsten apply to streaming?', a: '<p>A streaming query is compiled by the <b>same Catalyst optimizer</b> as batch: it produces a logical plan, optimizes it (predicate pushdown, projection pruning, etc.), and generates a physical plan with <b>Tungsten</b> whole-stage codegen. The difference is an <b>IncrementalExecution</b> that threads <b>state</b> and <b>watermark</b> operators through the plan and runs it per micro-batch. So you get batch-grade optimization for streaming.</p>', tip: 'Say "same Catalyst, plus IncrementalExecution that carries state + watermark." That phrasing signals real understanding.' },
  { q: 'What is the State Store and where does it live?', a: '<p>A <b>versioned, fault-tolerant key-value store</b> that holds the state for stateful operators (aggregations, joins, dedup, flatMapGroupsWithState). It is <b>partitioned by grouping key</b> and lives <b>on the executors</b>, checkpointed to durable storage each batch. Default is an in-memory/HDFS-backed store; <b>RocksDB</b> is the production choice for large state (M10, M20).</p>', tip: 'Mention RocksDB state store for large state — a very common tuning follow-up.' },
  { q: 'Why does changing the number of shuffle partitions break a running query?', a: '<p>State is <b>partitioned by key across a fixed number of partitions</b> (<code>spark.sql.shuffle.partitions</code>), and that number is baked into the <b>checkpoint</b>. Changing it would reshuffle keys to different partitions, so the state could no longer be located correctly on restart. Spark therefore pins it for the life of a query — you must start a new checkpoint to change it (M15).</p>', tip: 'Classic gotcha. The reason is state partitioning, not performance — say that explicitly.' },
  { q: 'Driver vs executor failure — what happens to a streaming query?', a: '<p><b>Executor failure</b>: tasks (and their state partitions) are <b>recomputed/reloaded</b> from the last checkpointed state version on another executor — the batch retries, no data loss. <b>Driver failure</b>: the query stops; on restart (same checkpoint) it reads the <b>offset log</b> to find the last planned batch, replays it from the source, and resumes exactly-once. Use cluster/supervised mode to auto-restart the driver.</p>', tip: 'Separate the two clearly: executor = transparent retry from state; driver = restart from offset log.' },
  { q: 'What exactly is stored in the checkpoint directory?', a: '<p>Per query: the <b>offset log</b> (offsets planned per batch, written before processing), the <b>commit log</b> (batches confirmed complete), <b>state store snapshots + deltas</b> (versioned per batch), and <b>metadata</b> (query id, sources). On restart Spark uses offset vs commit logs to decide which batch to replay. It must be a <b>durable, query-specific</b> path (e.g. S3/HDFS).</p>', tip: 'offset log + commit log + state + metadata. The offset-vs-commit comparison is how recovery decides what to redo.' },
  { q: 'How is parallelism determined in a streaming query?', a: '<p>Source parallelism (e.g. Kafka <b>partitions</b>) sets input task count; stateful operators run with <code>spark.sql.shuffle.partitions</code> tasks, each owning a slice of the key space. More Kafka partitions + enough executor cores = more throughput, but the <b>shuffle-partition count is fixed by the checkpoint</b>, so size it up front for peak load (M20).</p>', tip: 'Two knobs: source partitions (input) and shuffle partitions (state). The latter cannot change later — plan for peak.' },
  { q: 'What maintains and advances the watermark, and when?', a: '<p>The <b>driver</b> tracks the max event time observed across the batch and, at the <b>end of the batch</b>, sets the global watermark to <code>max(eventTime) − delay</code> (monotonic). That value becomes the threshold used at the <b>start of the next batch</b> to drop late rows and evict state. With multiple input streams, the global watermark is the <b>minimum</b> across them (M08).</p>', tip: 'Driver-maintained, end-of-batch computed, next-batch applied, min across streams. Those four facts cover most watermark architecture questions.' },
  { q: 'Micro-batch vs continuous processing at the architecture level?', a: '<p><b>Micro-batch</b>: the driver plans discrete batches; each is a normal Spark job (seconds latency, exactly-once, all operators). <b>Continuous</b>: long-running tasks poll the source and process records one at a time (~1 ms latency) with periodic async offset checkpoints — but only map-like/select/filter operators and <b>at-least-once</b> today. Same API, very different execution (M06).</p>', tip: 'Micro-batch = many short jobs; continuous = long-lived tasks. Know the operator + guarantee limits of continuous mode.' },
  { q: 'How does backpressure / input rate limiting work?', a: '<p>You cap how much data a batch ingests with source options — e.g. Kafka <code>maxOffsetsPerTrigger</code> (or <code>maxBytesPerTrigger</code>). This bounds batch size so processing time stays under the trigger interval and the cluster isn\'t overwhelmed after a lag spike. There is no automatic magic backpressure like old DStreams — you set explicit limits (M04, M20).</p>', tip: 'Name maxOffsetsPerTrigger. Emphasize it is explicit, not automatic, in Structured Streaming.' },
  { q: 'Why must batch duration stay below the trigger interval?', a: '<p>If a micro-batch takes <b>longer than the trigger interval</b>, the next batch cannot start on time, so lag <b>accumulates indefinitely</b> and latency grows without bound. Healthy operation needs <code>processingTime(batch) &lt; triggerInterval</code> with headroom. You monitor this via <code>StreamingQueryProgress</code> (batchDuration vs trigger) and fix it with more parallelism, less state, or rate limiting (M20, M21).</p>', tip: 'This is the #1 streaming health metric. "batchDuration must stay under the trigger interval" — memorize it.' },
];

const STAGES = [
  { x: 70, label: 'Kafka\nSource', color: '#06B6D4', desc: 'Source exposes a replayable offset range of new ShopStream orders. The driver asks: "what\'s new since the last commit?"' },
  { x: 250, label: 'Driver\n(planner)', color: '#F59E0B', desc: 'Driver writes the new offsets to the offset log (WAL), then Catalyst plans the micro-batch and schedules tasks across executors.' },
  { x: 450, label: 'Executors\n+ State Store', color: '#8B5CF6', desc: 'Executors run the tasks, reading data and updating the key-partitioned State Store (running revenue per category). The result delta is computed.' },
  { x: 650, label: 'Delta\nSink', color: '#10B981', desc: 'The sink commits the batch (idempotently). Then the driver writes the commit-log entry and advances the watermark — recovery is now safe.' },
];

function drawArch(canvas, stage, tokenP) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);
  const boxY = 70, boxW = 120, boxH = 64;
  ctx.font = '12px ui-monospace,monospace'; ctx.textAlign = 'center';

  // connectors
  ctx.strokeStyle = 'rgba(148,163,184,0.4)'; ctx.lineWidth = 2;
  for (let i = 0; i < STAGES.length - 1; i++) {
    ctx.beginPath(); ctx.moveTo(STAGES[i].x + boxW / 2, boxY + boxH / 2);
    ctx.lineTo(STAGES[i + 1].x - boxW / 2, boxY + boxH / 2); ctx.stroke();
  }
  // checkpoint box under driver+executors
  ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.setLineDash([4, 3]);
  ctx.strokeRect(190, 168, 420, 44); ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(148,163,184,0.75)'; ctx.fillText('Checkpoint · offset log + commit log + state snapshots', 400, 194);
  ctx.strokeStyle = 'rgba(148,163,184,0.3)';
  for (const sx of [250, 450]) { ctx.beginPath(); ctx.moveTo(sx, boxY + boxH); ctx.lineTo(sx, 168); ctx.stroke(); }

  // boxes
  STAGES.forEach((s, i) => {
    const active = i === stage;
    ctx.fillStyle = active ? s.color : 'rgba(30,41,59,0.9)';
    ctx.strokeStyle = active ? s.color : 'rgba(148,163,184,0.35)';
    ctx.lineWidth = active ? 2.5 : 1.5;
    const x = s.x - boxW / 2;
    ctx.beginPath(); ctx.roundRect(x, boxY, boxW, boxH, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = active ? '#0A0E1A' : '#CBD5E1';
    s.label.split('\n').forEach((ln, k) => ctx.fillText(ln, s.x, boxY + 26 + k * 16));
  });

  // flowing token between current stage and next
  if (stage >= 0 && stage < STAGES.length - 1) {
    const a = STAGES[stage].x + boxW / 2, b = STAGES[stage + 1].x - boxW / 2;
    const tx = a + (b - a) * tokenP;
    ctx.beginPath(); ctx.arc(tx, boxY + boxH / 2, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#FDE68A'; ctx.fill();
  }
  ctx.textAlign = 'left';
}

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p>A Structured Streaming query is a <b>chain of long-running coordination</b> on top of ordinary Spark. Five pieces do all the work:</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>① Driver — micro-batch planner</h4><p>Each trigger: reads new source offsets, records them in the offset log, builds the Catalyst plan, schedules tasks, and advances the watermark at batch end.</p></div>
      <div class="ss-card"><h4>② Executors</h4><p>Run the per-batch tasks (read, transform, aggregate) in parallel across the key space — a batch is just a normal Spark job.</p></div>
      <div class="ss-card"><h4>③ State Store</h4><p>Versioned, key-partitioned KV store on the executors for stateful ops (aggregates, joins, dedup). Checkpointed every batch; RocksDB for large state.</p></div>
      <div class="ss-card"><h4>④ Source & Sink</h4><p>Replayable source (Kafka offsets) in; sink (Delta/Kafka/files) out, written per output mode and committed idempotently.</p></div>
    </div>
    <h3>⑤ The checkpoint ties it together</h3>
    <p>The <b>offset log</b> (written <i>before</i> a batch) and <b>commit log</b> (written <i>after</i>), plus <b>state snapshots</b>, let the query recover exactly where it left off. Compare offset-log vs commit-log on restart → replay the one unfinished batch. This <b>offset-before / commit-after</b> ordering is the backbone of exactly-once (M15–M16).</p>
    <div class="ss-callout"><b>Health rule:</b> each micro-batch must finish <i>faster</i> than the trigger interval, or lag grows forever. Watch <code>batchDuration</code> vs the trigger (M21).</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>Step a ShopStream micro-batch through the engine. Each stage shows what the driver/executors actually do and how the checkpoint is updated.</p></div>
  <div class="ss-canvas-wrap"><canvas id="m03-canvas" width="720" height="226"></canvas></div>
  <div class="ss-controls">
    <button class="ss-btn primary" id="m03-step">Next stage ▶</button>
    <button class="ss-btn" id="m03-play">⏯ Play</button>
    <button class="ss-btn" id="m03-reset">⟲ Reset</button>
  </div>
  <div class="ss-callout" id="m03-desc">Press <b>Next stage ▶</b> to follow a batch from the Kafka source through the driver, executors, and into the Delta sink.</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream's running cluster</h3>
    <p>ShopStream's revenue query runs on a cluster where the <b>driver</b> plans a batch every 10 seconds, <b>executors</b> process ~250k events/s across the Kafka topic's partitions, and the <b>RocksDB state store</b> holds running per-category revenue keyed and partitioned across tasks. The <b>checkpoint</b> lives on S3; the <b>Delta sink</b> commits each batch idempotently.</p>
    <p>When an executor dies mid-batch, its state partitions reload from the last checkpointed version on a healthy executor and the batch retries — no double-counted revenue. If the driver dies, a supervised restart reads the offset log and replays only the unfinished batch.</p>
    <div class="ss-callout">Capacity is planned for <b>Black Friday peak</b>: enough Kafka partitions and a fixed, generous <code>shuffle.partitions</code> (it can't be changed later without a new checkpoint), so batch duration stays under the 10s trigger even at spike load.</div>
  </div>`;

  const code = `
  <div class="ss-prose"><p>You rarely configure the architecture directly — you set the source, sink, checkpoint and a few knobs, and the engine wires the rest. The important operational options:</p></div>
  ${codeBlock('PySpark', `spark.conf.set("spark.sql.shuffle.partitions", "200")   # FIXED for the query's life

orders = (spark.readStream.format("kafka")
    .option("subscribe", "shopstream.orders")
    .option("maxOffsetsPerTrigger", 2500000)   # rate limit -> bounded batch size
    .load())

revenue = parse(orders).groupBy("category").agg(sum("amount").alias("rev"))

(revenue.writeStream
    .outputMode("update")
    .format("delta").option("path", "/lake/shopstream/revenue")
    # RocksDB state store for large state:
    .option("spark.sql.streaming.stateStore.providerClass",
            "org.apache.spark.sql.execution.streaming.state.RocksDBStateStoreProvider")
    .option("checkpointLocation", "s3://shopstream/chk/revenue")  # durable + per-query
    .trigger(processingTime="10 seconds")
    .start())`)}
  ${codeBlock('What the checkpoint dir contains', `s3://shopstream/chk/revenue/
├── offsets/        # offset log: offsets PLANNED per batch (written BEFORE)
├── commits/        # commit log: batches CONFIRMED done (written AFTER)
├── state/          # versioned state store snapshots + deltas, per partition
└── metadata        # query id, source descriptions`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M03 · Architecture',
    title: 'Architecture & Components',
    subtitle: 'Driver, executors, state store, source/sink and the checkpoint — how a query actually runs',
    definition: {
      formal: 'A Structured Streaming query executes as a sequence of micro-batch Spark jobs coordinated by the driver. The driver plans each batch from replayable source offsets (recorded in the offset log), schedules tasks on executors that update a key-partitioned, checkpointed State Store, writes results to the sink, records a commit, and advances the watermark — all recoverable from the checkpoint.',
      easy: 'The driver is the planner that decides what each 10-second batch processes; the executors do the work and hold the running totals; the checkpoint is the save file that lets the whole thing crash and resume without losing or double-counting data.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '🏗️ Dataflow', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const canvas = container.querySelector('#m03-canvas');
  const descEl = container.querySelector('#m03-desc');
  let stage = -1, tokenP = 0, raf = null, playing = false;

  function show() {
    drawArch(canvas, stage, tokenP);
    if (stage >= 0) descEl.innerHTML = `<b>${STAGES[stage].label.replace('\n', ' ')}:</b> ${STAGES[stage].desc}`;
  }
  function animateToken(done) {
    tokenP = 0;
    const step = () => {
      tokenP += 0.05;
      drawArch(canvas, stage, Math.min(tokenP, 1));
      if (tokenP < 1) raf = requestAnimationFrame(step); else done && done();
    };
    raf = requestAnimationFrame(step);
  }
  function next() {
    if (stage < STAGES.length - 1) {
      stage++; show();
      if (stage < STAGES.length - 1) animateToken();
    }
  }
  function stopPlay() { playing = false; if (raf) cancelAnimationFrame(raf); container.querySelector('#m03-play').classList.remove('primary'); }

  show();
  container.querySelector('#m03-step').addEventListener('click', () => { if (!playing) next(); });
  container.querySelector('#m03-reset').addEventListener('click', () => { stopPlay(); stage = -1; tokenP = 0; show(); });
  container.querySelector('#m03-play').addEventListener('click', (e) => {
    if (playing) { stopPlay(); return; }
    playing = true; e.target.classList.add('primary');
    if (stage >= STAGES.length - 1) { stage = -1; }
    const tick = () => {
      if (!playing) return;
      if (stage >= STAGES.length - 1) { stopPlay(); return; }
      stage++; show();
      if (stage < STAGES.length - 1) animateToken(() => { if (playing) setTimeout(tick, 600); });
      else setTimeout(() => { if (playing) stopPlay(); }, 400);
    };
    tick();
  });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

export default { mount };
