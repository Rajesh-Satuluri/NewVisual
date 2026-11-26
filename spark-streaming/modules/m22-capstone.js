// M22 · ShopStream Capstone — the end-to-end pipeline  (engine-driven: E1 + E2 + E3)
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock, esc } from './_mod-ui.js';
import { MicroBatchQuery, planBatches } from '../sim/microbatch-engine.js';
import { CheckpointSim, planBatches as planBatches2 } from '../sim/checkpoint-engine.js';
import { StreamJoin } from '../sim/stream-join-engine.js';

export const IQ = [
  { q: 'Walk me through an end-to-end Structured Streaming pipeline, source to sink.', a: '<p>A <b>replayable source</b> (Kafka/files) exposes offsets. Each <b>micro-batch</b> the driver (1) reads a bounded offset range, (2) writes those offsets to the <b>offset log</b> (WAL) <i>before</i> processing, (3) runs the query — stateful ops (windows, joins, dedup) read/update the <b>state store</b> under a <b>watermark</b>, (4) writes results to the sink, and (5) records the batch in the <b>commit log</b>. The <b>checkpoint</b> (offset log + commit log + state) is what makes the whole thing fault-tolerant and exactly-once.</p>', tip: 'Source offsets → offset-log (before) → stateful process under watermark → sink → commit-log (after); checkpoint ties it together.' },
  { q: 'In the ShopStream pipeline, what is each engine responsible for?', a: '<p><b>E1 (micro-batch + windows + watermark):</b> turns the unbounded orders stream into <b>windowed revenue</b>, dropping late rows past the watermark. <b>E2 (checkpoint):</b> guarantees each batch lands <b>exactly once</b> even across a crash, via offset-log-before / commit-log-after. <b>E3 (stream-stream join):</b> correlates <b>add-to-cart ⋈ purchase</b> to compute conversions and surface abandoned carts. Together they form one query graph over one checkpoint.</p>', tip: 'E1 = windowed aggregation under watermark; E2 = exactly-once checkpoint/recovery; E3 = cart⋈purchase join.' },
  { q: 'How does the watermark coordinate across windows AND joins in one query?', a: '<p>A single query can have multiple stateful operators (a windowed aggregation and a stream-stream join). Spark propagates <b>one global watermark</b> — effectively the <b>minimum</b> across all inputs/operators — so a lagging stream holds back eviction everywhere. This is why mixing a slow stream into a pipeline delays <b>all</b> downstream emission (closed windows and outer-join nulls alike). You size the watermark for the <b>slowest</b> real source.</p>', tip: 'One global (min) watermark drives eviction for every stateful op; the slowest source gates the whole pipeline.' },
  { q: 'Where does exactly-once actually come from in this pipeline?', a: '<p>From the combination of (1) a <b>replayable source</b> (can re-read the same offsets), (2) <b>deterministic reprocessing</b>, (3) <b>idempotent/transactional sink writes</b> keyed by batch id, and (4) the <b>offset-log-before / commit-log-after</b> protocol. On recovery, any batch that was offset-logged but not committed is <b>replayed</b>; a transactional sink <b>replaces</b> that batch id rather than appending, so no duplicates. Remove any one leg (e.g. an append-only sink) and you drop to at-least-once.</p>', tip: 'Replayable source + deterministic reprocess + transactional/idempotent sink + offset-before/commit-after = exactly-once.' },
  { q: 'A batch crashes after the sink write but before the commit. What happens on restart?', a: '<p>The batch is in the <b>offset log</b> but not the <b>commit log</b>, so Spark treats it as <b>incomplete and replays it</b> from the exact same offsets. With a <b>transactional</b> sink the replay <b>overwrites</b> that batch id (no duplicate); with an <b>append-only</b> sink the rows are written <b>twice</b> (duplicate — at-least-once). Either way no data is <b>lost</b>; exactly-once hinges on the sink.</p>', tip: 'Offset-logged-not-committed → replay same offsets. Transactional sink: no dup. Append sink: duplicate. Never data loss.' },
  { q: 'How would you evolve this pipeline without breaking the checkpoint?', a: '<p>Safe changes: adding new output sinks, tuning triggers, adding/narrowing filters. <b>Unsafe</b> (breaks checkpoint compatibility): changing the <b>aggregation keys/type</b>, the <b>window definition</b>, adding/removing <b>stateful operators</b>, or changing <b>parallelism of stateful ops</b> — the state layout in the checkpoint no longer matches. Those require a <b>new checkpoint</b> (and often a state-migration/backfill). Treat the checkpoint as schema for your state.</p>', tip: 'Filters/sinks/triggers: safe. Changing keys/windows/stateful ops/state-parallelism: needs a new checkpoint.' },
  { q: 'What output mode fits a pipeline that both aggregates windows and feeds a dashboard?', a: '<p><b>Append</b> for the <b>final</b> windowed results you push to an immutable store/warehouse (one row per closed window, emitted at watermark). <b>Update</b> for a <b>live dashboard</b> that wants running totals of still-open windows (changed rows each batch). <b>Complete</b> only for small, fully-recomputable results. In ShopStream: append the closed revenue windows to the warehouse, update mode to a low-latency ops dashboard.</p>', tip: 'Append → immutable warehouse (closed windows); Update → live dashboard (running totals); Complete → tiny full result.' },
  { q: 'Your pipeline\'s state is growing unbounded. How do you diagnose and fix it?', a: '<p>Check <code>StreamingQueryProgress.stateOperators</code> for row counts/memory per operator (M21). Common causes: a <b>missing or too-large watermark</b> (windows/joins never evict), a <b>too-wide join time window</b> (dual-side buffers), or <b>high-cardinality keys</b> in dedup/aggregation. Fixes: define/tighten the <b>watermark</b>, <b>narrow the join time range</b> (biggest lever), switch to the <b>RocksDB</b> state store, and reduce key cardinality. Unbounded state is the #1 streaming production failure.</p>', tip: 'Read stateOperators; usual cause = missing/large watermark or wide join window; fix = tighten watermark+window, RocksDB.' },
  { q: 'Why run this as micro-batches instead of true per-event streaming?', a: '<p>Micro-batch amortizes the <b>offset-log / commit-log / checkpoint</b> overhead across many records, reuses Spark\'s <b>batch optimizer and whole-stage codegen</b>, and gives <b>exactly-once with transactional sinks</b> cleanly — at the cost of <b>batch-interval latency</b> (sub-second to seconds). True continuous processing trades that batch latency for ~ms latency but with weaker sink guarantees and fewer supported ops. For ShopStream\'s analytics + conversions, micro-batch\'s throughput and exactly-once win.</p>', tip: 'Micro-batch amortizes checkpoint cost, reuses the batch engine, gives clean exactly-once; latency = batch interval.' },
  { q: 'If you had to defend this architecture in a design review, what are its guarantees and limits?', a: '<p><b>Guarantees:</b> exactly-once end-to-end (replayable source + transactional sink + checkpoint), correct late-data handling (watermark), fault tolerance (offset/commit logs + state), and horizontal scale. <b>Limits:</b> latency bounded by batch interval; state is finite only if watermarks/time-bounds are set; some checkpoint-incompatible changes need a fresh state; and a single slow source gates the global watermark. You size watermarks for real skew, bound join windows, monitor state, and pick sinks that support transactions.</p>', tip: 'Guarantees: exactly-once, late-data-correct, fault-tolerant, scalable. Limits: batch latency, state needs bounding, checkpoint-compat, slowest-source gating.' },
];

// ── Shared ShopStream dataset ───────────────────────────────────────────────
// Orders stream (eventTime, revenue) → E1 windowed revenue + E2 checkpoint.
const ORDERS = [
  { id: 'o1', eventTime: 2, value: 40 }, { id: 'o2', eventTime: 5, value: 25 },
  { id: 'o3', eventTime: 8, value: 60 }, { id: 'o4', eventTime: 11, value: 15 },
  { id: 'o5', eventTime: 14, value: 30 }, { id: 'o6', eventTime: 7, value: 50 }, // o6 arrives late (past watermark)
  { id: 'o7', eventTime: 17, value: 45 }, { id: 'o8', eventTime: 20, value: 20 },
];
// Cart ⋈ purchase streams → E3 join.
const JOIN_BATCHES = [
  { left: [{ id: 'cart-u1', key: 'u1', eventTime: 1 }, { id: 'cart-u2', key: 'u2', eventTime: 2 }], right: [] },
  { left: [{ id: 'cart-u3', key: 'u3', eventTime: 4 }], right: [{ id: 'buy-u1', key: 'u1', eventTime: 3 }] },
  { left: [], right: [{ id: 'buy-u2', key: 'u2', eventTime: 9 }] },
  { left: [{ id: 'cart-u4', key: 'u4', eventTime: 12 }], right: [{ id: 'buy-u3', key: 'u3', eventTime: 6 }] },
  { left: [], right: [{ id: 'buy-u5', key: 'u5', eventTime: 18 }] },
];

const STAGES = [
  { key: 'e1', tag: 'E1', label: 'Ingest → Window', color: 'var(--cyan,#06B6D4)', hex: '#06B6D4' },
  { key: 'e2', tag: 'E2', label: 'Checkpoint', color: 'var(--green,#10B981)', hex: '#10B981' },
  { key: 'e3', tag: 'E3', label: 'Join', color: 'var(--yellow,#F59E0B)', hex: '#F59E0B' },
];

// Precompute deterministic traces from the REAL engines.
function buildE1() {
  const batches = planBatches(ORDERS, { type: 'availableNow', maxEventsPerBatch: 2 });
  const q = new MicroBatchQuery({ window: { type: 'tumbling', size: 6 }, watermarkDelay: 2, outputMode: 'append', aggregate: { fn: 'sum', field: 'value' } });
  return q.run(batches).trace; // array of per-batch trace entries
}
function buildE2(crash) {
  const batches = planBatches2(ORDERS, 2);
  const sim = new CheckpointSim({ sinkMode: 'exactlyOnce' });
  sim.run(batches, crash);
  const recovery = crash ? sim.recover(batches) : [];
  return { trace: sim.trace, recovery, duplicates: sim.sink.duplicates(), coversAll: sim.coversAll(ORDERS), commitLog: [...sim.commitLog].sort((a, b) => a - b) };
}
function buildE3() {
  const j = new StreamJoin({ joinType: 'leftOuter', watermarkDelay: 1, timeWindow: 3 });
  return j.run(JOIN_BATCHES).trace;
}

function drawPipeline(canvas, stageIdx) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);
  const boxW = 150, boxH = 70, gap = (W - STAGES.length * boxW) / (STAGES.length + 1), y = (H - boxH) / 2;
  // source chip
  ctx.font = '11px ui-monospace,monospace';
  STAGES.forEach((s, i) => {
    const x = gap + i * (boxW + gap);
    const active = i === stageIdx;
    ctx.fillStyle = active ? 'rgba(255,255,255,0.08)' : 'rgba(148,163,184,0.06)';
    ctx.strokeStyle = active ? s.hex : 'rgba(148,163,184,0.3)';
    ctx.lineWidth = active ? 2.5 : 1.3;
    ctx.beginPath(); ctx.roundRect(x, y, boxW, boxH, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = s.hex; ctx.font = 'bold 12px ui-monospace,monospace'; ctx.textAlign = 'center';
    ctx.fillText(s.tag, x + boxW / 2, y + 24);
    ctx.fillStyle = active ? '#E2E8F0' : 'rgba(148,163,184,0.75)'; ctx.font = '11px ui-monospace,monospace';
    ctx.fillText(s.label, x + boxW / 2, y + 44);
    // arrow to next
    if (i < STAGES.length - 1) {
      const ax = x + boxW, bx = x + boxW + gap;
      ctx.strokeStyle = 'rgba(148,163,184,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ax + 6, y + boxH / 2); ctx.lineTo(bx - 10, y + boxH / 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx - 10, y + boxH / 2); ctx.lineTo(bx - 16, y + boxH / 2 - 5); ctx.lineTo(bx - 16, y + boxH / 2 + 5); ctx.closePath();
      ctx.fillStyle = 'rgba(148,163,184,0.7)'; ctx.fill();
    }
  });
  // shared checkpoint bar underneath
  ctx.fillStyle = 'rgba(16,185,129,0.09)'; ctx.strokeStyle = 'rgba(16,185,129,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(gap, y + boxH + 18, W - gap * 2, 22, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#10B981'; ctx.font = '10px ui-monospace,monospace'; ctx.textAlign = 'center';
  ctx.fillText('one shared checkpoint: offset log + commit log + state store', W / 2, y + boxH + 33);
  ctx.textAlign = 'left';
}

export function mount(container) {
  injectModStyles();

  const E1 = buildE1();
  const E3 = buildE3();

  const concept = `
  <div class="ss-prose">
    <p>The <b>capstone</b> assembles everything into <b>one ShopStream query graph</b>: a single streaming job that reads orders and cart/purchase events, computes <b>windowed revenue</b>, correlates <b>cart ⋈ purchase</b>, and writes results — all under <b>one checkpoint</b> that makes it exactly-once and fault-tolerant.</p>
    <div class="ss-grid">
      <div class="ss-card"><h4 style="color:#06B6D4">① E1 · Ingest → Window</h4><p>Orders become bounded <b>micro-batches</b>; a <b>tumbling window + watermark</b> turns the unbounded stream into revenue per window, dropping late rows.</p></div>
      <div class="ss-card"><h4 style="color:#10B981">② E2 · Checkpoint</h4><p><b>Offset-log-before / commit-log-after</b> + a transactional sink give <b>exactly-once</b> — survive a crash with no loss and no duplicates.</p></div>
      <div class="ss-card"><h4 style="color:#F59E0B">③ E3 · Join</h4><p><b>Add-to-cart ⋈ purchase</b> within a time window: conversions emit on match, <b>abandoned carts</b> emit as outer-nulls at watermark eviction.</p></div>
    </div>
    <h3>One watermark, one checkpoint, three operators</h3>
    <p>These aren't three separate jobs — they're <b>stateful operators in one query</b>, sharing a <b>global watermark</b> (the minimum across inputs) and <b>one checkpoint directory</b>. A slow source holds back eviction everywhere; a crash replays uncommitted work for the whole graph; evolving a stateful operator means a <b>new checkpoint</b>.</p>
    <div class="ss-callout"><b>This is the whole course in one page:</b> unbounded→table (M02), micro-batch (M05), event-time + watermark (M07–M08), windows (M09), state (M10), output modes (M12), checkpoint + fault tolerance (M15–M16), and joins (M17–M18) — composed, running on the three real engines.</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>The <b>real E1+E2+E3 engines</b> running the ShopStream pipeline on one shared dataset. Pick a stage and step its batches — the topology on top shows which operator you're inspecting; everything below is live engine output, not a mock-up.</p></div>
  <div class="ss-canvas-wrap"><canvas id="m22-canvas" width="720" height="190"></canvas></div>
  <div class="ss-controls">
    ${STAGES.map((s, i) => `<button class="ss-btn${i === 0 ? ' primary' : ''}" data-stage="${i}" id="m22-stage-${i}">${s.tag} · ${s.label}</button>`).join('')}
    <span style="flex:1"></span>
    <button class="ss-btn primary" id="m22-step">Step ▶</button>
    <button class="ss-btn" id="m22-back">◀ Back</button>
    <button class="ss-btn" id="m22-reset">⟲ Reset</button>
    <label style="font-size:12.5px;color:var(--text-secondary);margin-left:8px" id="m22-crash-wrap">
      <input type="checkbox" id="m22-crash" style="vertical-align:middle"> crash before commit (batch 2)</label>
  </div>
  <div class="ss-metrics">
    <div class="ss-metric"><div class="k">Stage</div><div class="v" id="m22-stagev">E1</div></div>
    <div class="ss-metric"><div class="k">Step</div><div class="v" id="m22-stepv">—</div></div>
    <div class="ss-metric"><div class="k" id="m22-k1">Watermark</div><div class="v" id="m22-v1">—</div></div>
    <div class="ss-metric"><div class="k" id="m22-k2">Emitted</div><div class="v" id="m22-v2">—</div></div>
  </div>
  <div class="ss-callout" id="m22-expl">Pick a stage and press <b>Step ▶</b>.</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream in production, Black Friday</h3>
    <p>By the capstone, ShopStream's streaming job is doing real work: <b>windowed revenue</b> feeds the exec dashboard, the <b>cart ⋈ purchase</b> join feeds both a conversion metric and the abandoned-cart re-engagement emails, and the whole thing is checkpointed to object storage.</p>
    <p>At 00:00 on Black Friday a node died mid-batch. Because every batch wrote its <b>offsets before</b> processing and its <b>commit after</b>, the job restarted, saw one offset-logged-but-uncommitted batch, <b>replayed it</b> against the transactional warehouse sink (which replaced that batch id), and continued. The revenue numbers were <b>exactly right</b> — no double-counted orders, no gap — and nobody paged.</p>
    <div class="ss-callout">The three things that saved the night were the three engines of this course: <b>watermarks</b> kept state finite under a 50× traffic spike, the <b>checkpoint protocol</b> gave exactly-once recovery, and the <b>bounded join window</b> kept the conversion join from exhausting memory.</div>
  </div>`;

  const code = `
  ${codeBlock('PySpark', `# ── ShopStream end-to-end pipeline (one query, one checkpoint) ──
orders = (spark.readStream.format("kafka").option("subscribe","orders").load()
            .select(from_json(col("value").cast("string"), order_schema).alias("o"))
            .select("o.*")
            .withWatermark("event_time", "2 minutes"))

# E1: windowed revenue (tumbling 6 min, append closed windows)
revenue = (orders.groupBy(window("event_time", "6 minutes"))
                 .agg(sum("value").alias("revenue")))

# E3: cart arrive-stream joined to purchases within 3 min (left outer -> abandoned)
carts = cart_stream.withWatermark("cart_time", "3 minutes")
buys  = buy_stream.withWatermark("buy_time",  "3 minutes")
conversions = carts.join(buys, expr("""
      cart_user = buy_user AND
      buy_time BETWEEN cart_time AND cart_time + interval 3 minutes"""), "leftOuter")

# E2: one checkpoint makes the whole graph exactly-once & fault-tolerant
(revenue.writeStream.format("delta")           # transactional sink
        .outputMode("append")
        .option("checkpointLocation", "s3://shopstream/_ckpt/revenue")
        .trigger(processingTime="30 seconds")
        .start())`)}
  ${codeBlock('Scala', `val orders = spark.readStream.format("kafka").option("subscribe","orders").load()
  .select(from_json($"value".cast("string"), orderSchema).as("o")).select("o.*")
  .withWatermark("event_time", "2 minutes")

val revenue = orders.groupBy(window($"event_time", "6 minutes")).agg(sum("value").as("revenue"))

revenue.writeStream.format("delta").outputMode("append")
  .option("checkpointLocation", "s3://shopstream/_ckpt/revenue")
  .trigger(Trigger.ProcessingTime("30 seconds")).start()`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M22 · Capstone',
    title: 'ShopStream Capstone — the end-to-end pipeline',
    subtitle: 'All three engines composed into one fault-tolerant, exactly-once ShopStream query',
    definition: {
      formal: 'An end-to-end Structured Streaming pipeline is a single query graph of stateful operators — windowed aggregations and stream-stream joins — over replayable sources, coordinated by one global (minimum) watermark and persisted through one checkpoint (offset log written before processing, commit log after, plus the state store). With a replayable source, deterministic reprocessing, and a transactional/idempotent sink, this yields end-to-end exactly-once with correct late-data handling and fault-tolerant recovery.',
      easy: 'The capstone is the whole course running as one job: orders get turned into windowed revenue (engine 1), the job is checkpointed so a crash can\'t lose or double-count anything (engine 2), and carts are matched to purchases to measure conversions (engine 3) — all sharing one watermark and one checkpoint. It\'s exactly how a real ShopStream streaming pipeline is built and why it survives a Black-Friday node failure.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '🔗 Pipeline (E1+E2+E3)', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const canvas = container.querySelector('#m22-canvas');
  const stepEl = container.querySelector('#m22-stepv'), stageVEl = container.querySelector('#m22-stagev');
  const k1 = container.querySelector('#m22-k1'), v1 = container.querySelector('#m22-v1');
  const k2 = container.querySelector('#m22-k2'), v2 = container.querySelector('#m22-v2');
  const explEl = container.querySelector('#m22-expl');
  const crashWrap = container.querySelector('#m22-crash-wrap');
  const crashBox = container.querySelector('#m22-crash');
  const fmtWm = (v) => (v === Number.NEGATIVE_INFINITY ? '−∞' : String(v));

  let stage = 0, cursor = -1;
  let e2 = buildE2(null);

  function stageTrace() {
    if (stage === 0) return E1;
    if (stage === 1) return e2.trace;
    return E3;
  }

  function setStage(i) {
    stage = i; cursor = -1;
    STAGES.forEach((s, idx) => {
      const b = container.querySelector(`#m22-stage-${idx}`);
      b.classList.toggle('primary', idx === i);
    });
    crashWrap.style.display = i === 1 ? '' : 'none';
    render();
  }

  function render() {
    drawPipeline(canvas, stage);
    stageVEl.textContent = STAGES[stage].tag;
    const tr = stageTrace();
    if (cursor < 0) {
      stepEl.textContent = '—';
      if (stage === 0) { k1.textContent = 'Watermark'; k2.textContent = 'Emitted windows'; }
      else if (stage === 1) { k1.textContent = 'Phase'; k2.textContent = 'Committed'; }
      else { k1.textContent = 'Join watermark'; k2.textContent = 'Emitted'; }
      v1.textContent = '—'; v2.textContent = '—';
      explEl.innerHTML = `<b>${STAGES[stage].tag} · ${STAGES[stage].label}.</b> Press <b>Step ▶</b> to run this operator's batches on the real engine.`;
      return;
    }
    if (stage === 0) {
      const e = tr[cursor];
      stepEl.textContent = `batch ${e.index}`;
      k1.textContent = 'Watermark'; v1.textContent = fmtWm(e.watermarkAfter);
      k2.textContent = 'Emitted windows'; v2.textContent = e.emitted.length;
      let msg = `<b>Batch ${e.index}:</b> ingested <b>${e.input}</b> orders (accepted ${e.accepted}, dropped ${e.droppedCount} late), watermark → <b>${fmtWm(e.watermarkAfter)}</b>.`;
      if (e.emitted.length) msg += `<br>✅ <b>Closed revenue windows:</b> ${e.emitted.map((r) => `[${r.window.start},${r.window.end}) = $${r.value}`).join(', ')}.`;
      else msg += `<br>No window closed yet — revenue accumulates in state until the watermark passes a window's end.`;
      if (e.droppedCount) msg += `<br>⚠️ Dropped late order(s): ${e.dropped.map((r) => `${esc(r.id)}@t${r.eventTime}`).join(', ')}.`;
      explEl.innerHTML = msg;
    } else if (stage === 1) {
      const e = tr[cursor];
      stepEl.textContent = `batch ${e.batchId} · ${e.phase}`;
      k1.textContent = 'Phase'; v1.textContent = e.crashed ? '💥 crash' : e.phase;
      k2.textContent = 'Committed'; v2.textContent = e2.commitLog.join(',') || '—';
      let msg = `<b>Batch ${e.batchId}, phase <code>${e.phase}</code>:</b> `;
      const desc = {
        planOffsets: 'read the next offset range from the source.',
        writeOffsetLog: 'write those offsets to the WAL <i>before</i> processing (so a crash is replayable).',
        process: 'run the query (windows / join / agg) over the batch.',
        writeSink: 'write results to the transactional sink.',
        writeCommitLog: 'record the batch as committed — now it is durable and exactly-once.',
      }[e.phase] || '';
      msg += desc;
      if (e.crashed) msg += `<br>💥 <b>Crashed here.</b> This batch was offset-logged but never committed → on restart it is <b>replayed</b>.`;
      if (cursor === tr.length - 1 && crashBox.checked) {
        msg += `<br>🔁 <b>Recovery:</b> ${e2.recovery.map((r) => `batch ${r.batchId} ${r.action}`).join('; ')}. Duplicates in sink: <b>${e2.duplicates.length}</b>; all orders present: <b>${e2.coversAll ? 'yes' : 'no'}</b> → exactly-once holds.`;
      }
      explEl.innerHTML = msg;
    } else {
      const e = tr[cursor];
      stepEl.textContent = `batch ${e.index}`;
      k1.textContent = 'Join watermark'; v1.textContent = fmtWm(e.watermarkAfter);
      k2.textContent = 'Emitted'; v2.textContent = e.emitted.length;
      const inner = e.emitted.filter((x) => x.type === 'inner');
      const outer = e.emitted.filter((x) => x.type !== 'inner');
      let msg = `<b>Batch ${e.index}:</b> join watermark <b>${fmtWm(e.watermarkAfter)}</b>, buffering <b>${e.leftState.length}</b> cart + <b>${e.rightState.length}</b> purchase rows.`;
      if (inner.length) msg += `<br>✅ <b>Conversions:</b> ${inner.map((m) => `${esc(m.left.id)} ⋈ ${esc(m.right.id)}`).join(', ')}.`;
      if (outer.length) msg += `<br>⬅️ <b>Abandoned carts (outer-null at eviction):</b> ${outer.map((m) => esc((m.left || m.right).id)).join(', ')}.`;
      if (!inner.length && !outer.length) msg += `<br>No emissions — rows wait in state for a partner or for eviction.`;
      explEl.innerHTML = msg;
    }
  }

  STAGES.forEach((s, i) => container.querySelector(`#m22-stage-${i}`).addEventListener('click', () => setStage(i)));
  container.querySelector('#m22-step').addEventListener('click', () => { const tr = stageTrace(); if (cursor < tr.length - 1) { cursor++; render(); } });
  container.querySelector('#m22-back').addEventListener('click', () => { if (cursor >= 0) { cursor--; render(); } });
  container.querySelector('#m22-reset').addEventListener('click', () => { cursor = -1; render(); });
  crashBox.addEventListener('change', () => {
    e2 = buildE2(crashBox.checked ? { batchId: 2, phase: 'writeCommitLog' } : null);
    cursor = -1; render();
  });

  setStage(0);
}

export default { mount };
