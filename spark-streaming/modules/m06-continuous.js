// M06 · Continuous Processing — Architecture
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock } from './_mod-ui.js';

const IQ = [
  { q: 'What is Continuous Processing and how does it differ from micro-batch?', a: '<p><b>Micro-batch</b> (default): the driver plans discrete batches; each is a short Spark job. Latency is <b>~100ms–seconds</b>, exactly-once, all operators. <b>Continuous Processing</b> (experimental, since 2.3): <b>long-running tasks</b> poll the source and process records <b>one at a time</b> with periodic <i>asynchronous</i> offset checkpoints — latency <b>~1ms</b>, but only <b>map-like operators</b> and <b>at-least-once</b> today. Same DataFrame API, radically different execution engine.</p>', tip: 'Micro-batch = short jobs, ~sub-second, exactly-once, all ops. Continuous = long-lived tasks, ~1ms, map-only, at-least-once.' },
  { q: 'Why can\'t continuous processing do aggregations, joins, or windows?', a: '<p>Those are <b>stateful + require shuffles</b>, which continuous mode\'s record-at-a-time, no-batch-boundary execution can\'t coordinate — there\'s no micro-batch to snapshot state against. Continuous supports only <b>map-like, partition-local</b> operators: <code>select</code>, <code>where/filter</code>, <code>map</code>, projections, and simple UDFs. Anything needing state or a shuffle falls back to (or must use) micro-batch.</p>', tip: 'Map-like/partition-local only. Stateful + shuffle ops need batch boundaries, which continuous mode doesn\'t have.' },
  { q: 'What delivery guarantee does continuous processing provide?', a: '<p><b>At-least-once</b> only. Offsets are checkpointed <b>asynchronously</b> on an interval (e.g. every 1s), so after a crash some records since the last checkpoint are <b>reprocessed</b> → possible duplicates. Micro-batch, by contrast, uses the synchronous offset-log/commit-log to give <b>exactly-once</b>. If you need exactly-once, you stay on micro-batch (or dedup downstream).</p>', tip: 'Continuous = at-least-once (async checkpoints → duplicates on recovery). Exactly-once is micro-batch-only.' },
  { q: 'How does the checkpoint interval work in continuous mode?', a: '<p>You set it in the trigger: <code>trigger(continuous="1 second")</code> means "checkpoint offsets every 1 second." It\'s <b>not</b> a batch interval — records flow continuously; the number just controls <b>how often offsets are durably recorded</b>. Smaller interval = less reprocessing on failure (less duplication) but more checkpoint overhead; larger = cheaper but more replay.</p>', tip: 'continuous="1 second" = checkpoint cadence, NOT batch size. Trade-off: smaller interval, fewer dupes, more overhead.' },
  { q: 'When would you actually choose continuous processing?', a: '<p>Rarely — only when you need <b>~1ms end-to-end latency</b> on a <b>stateless, map-only</b> pipeline (e.g. simple per-record enrich/filter/route to Kafka) and can tolerate <b>at-least-once</b>. For almost everything real — aggregations, windows, joins, exactly-once — <b>micro-batch</b> is the answer, and with small intervals it already gets you to tens of milliseconds. Many teams reach for Flink instead if true per-record streaming is essential.</p>', tip: 'Only for stateless, map-only, must-be-~1ms, dup-tolerant pipelines. Otherwise micro-batch. Flink is the real-per-record alternative.' },
  { q: 'Isn\'t Structured Streaming "not real streaming" because it\'s micro-batch?', a: '<p>That critique is dated. Micro-batch gives <b>sub-second latency</b> (default trigger, tuned) which is enough for the vast majority of use cases, plus <b>exactly-once and full operator support</b> — a better trade than record-at-a-time for most. Continuous mode exists for the ~1ms niche. The "micro-batch isn\'t streaming" line matters only when you genuinely need single-digit-ms latency, which is uncommon.</p>', tip: 'Micro-batch is sub-second with exactly-once — fine for ~all workloads. The latency gap only matters at the ~1ms extreme.' },
  { q: 'Micro-batch vs Flink — architectural contrast?', a: '<p><b>Flink</b> is a true record-at-a-time dataflow engine: per-event processing, stateful ops at low latency, exactly-once via distributed snapshots (Chandy-Lamport). <b>Structured Streaming</b> is micro-batch (exactly-once via offset/commit logs) with an experimental continuous mode. Flink wins on <b>low-latency stateful</b> streaming; Spark wins on <b>unified batch+stream</b>, the Spark/lakehouse ecosystem, and SQL/DataFrame familiarity (M-reference comparison).</p>', tip: 'Flink = native per-record stateful streaming via snapshots. Spark = micro-batch + unified batch/lakehouse ecosystem.' },
  { q: 'Does continuous processing change the code you write?', a: '<p>No — the <b>DataFrame/Dataset API is identical</b>; you only change the <b>trigger</b> to <code>continuous("1 second")</code>. If the query contains an unsupported (stateful/shuffle) operator, it\'s <b>rejected at start</b>. So "going continuous" is a one-line trigger change plus a constraint that your pipeline be map-only.</p>', tip: 'Same API; just the trigger changes. Unsupported ops → the query fails to start, not silently.' },
  { q: 'What latency does each mode realistically deliver end-to-end?', a: '<p>Rough figures: <b>micro-batch, processingTime</b> → the interval + batch duration (seconds, predictable); <b>micro-batch, default trigger, tuned</b> → ~100ms–low-seconds; <b>continuous</b> → ~1ms processing (end-to-end still bounded by source/sink + checkpoint interval). Most "real-time" dashboards and alerts are perfectly served by sub-second micro-batch.</p>', tip: 'Micro-batch default-tuned ≈ 100ms; continuous ≈ 1ms. Know the order of magnitude, not exact numbers.' },
];

const MODES = {
  microbatch: {
    name: 'Micro-batch', latency: '~100ms – seconds', guarantee: 'Exactly-once',
    ops: 'All operators (agg, window, join, dedup)',
    color: '#06B6D4',
    note: 'The driver plans discrete batches; each is a short Spark job with synchronous offset-log/commit-log checkpointing. This is the default and the right answer for almost everything.',
  },
  continuous: {
    name: 'Continuous', latency: '~1 ms', guarantee: 'At-least-once',
    ops: 'Map-like only (select/filter/map)',
    color: '#F59E0B',
    note: 'Long-running tasks process records one at a time with async offset checkpoints. ~1ms latency, but stateless/map-only and at-least-once — a niche for the lowest-latency simple pipelines.',
  },
};

// Animated: micro-batch processes in discrete grouped pulses; continuous flows record-by-record.
function drawModes(canvas, phase) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);
  const laneH = 90, padL = 110, srcX = padL, sinkX = W - 60;
  ctx.font = '12px ui-monospace,monospace';

  const lanes = [
    { y: 56, label: 'Micro-batch', color: '#06B6D4', batch: true },
    { y: 56 + laneH + 10, label: 'Continuous', color: '#F59E0B', batch: false },
  ];

  lanes.forEach((ln) => {
    // lane baseline
    ctx.strokeStyle = 'rgba(148,163,184,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(srcX, ln.y); ctx.lineTo(sinkX, ln.y); ctx.stroke();
    // labels
    ctx.fillStyle = ln.color; ctx.textAlign = 'right'; ctx.font = 'bold 12px ui-monospace,monospace';
    ctx.fillText(ln.label, srcX - 12, ln.y + 4);
    ctx.fillStyle = 'rgba(148,163,184,0.6)'; ctx.font = '10px ui-monospace,monospace'; ctx.textAlign = 'center';
    ctx.fillText('source', srcX, ln.y - 24); ctx.fillText('sink', sinkX, ln.y - 24);

    const span = sinkX - srcX;
    if (ln.batch) {
      // records travel to a "batch gate" ~2/3, accumulate, then release in a pulse
      const gate = srcX + span * 0.62;
      ctx.setLineDash([3, 3]); ctx.strokeStyle = ln.color + '66';
      ctx.beginPath(); ctx.moveTo(gate, ln.y - 34); ctx.lineTo(gate, ln.y + 34); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = ln.color + '99'; ctx.font = '9px ui-monospace,monospace';
      ctx.fillText('batch gate', gate, ln.y + 46);
      const cyc = (phase % 1);
      // 8 records: pre-gate they march; at cyc>0.6 they burst past the gate together
      for (let i = 0; i < 8; i++) {
        const base = (cyc * 1.3 + i * 0.09) % 1.3;
        let x;
        if (base < 0.62) x = srcX + base * span;        // marching toward gate
        else x = gate + ((base - 0.62) / 0.68) * (sinkX - gate); // released as a group
        if (x > sinkX) continue;
        ctx.beginPath(); ctx.arc(x, ln.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = ln.color; ctx.fill();
      }
    } else {
      // smooth continuous flow, evenly spaced, no gate
      for (let i = 0; i < 12; i++) {
        const x = srcX + (((phase * 1.1 + i / 12) % 1) * span);
        ctx.beginPath(); ctx.arc(x, ln.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = ln.color; ctx.fill();
      }
    }
  });

  // latency callouts
  ctx.textAlign = 'center'; ctx.font = '10px ui-monospace,monospace';
  ctx.fillStyle = 'rgba(148,163,184,0.7)';
  ctx.fillText('waits for the batch → seconds, exactly-once', (srcX + sinkX) / 2, 56 + 34);
  ctx.fillText('record-by-record → ~1ms, at-least-once', (srcX + sinkX) / 2, 56 + laneH + 10 + 34);
  ctx.textAlign = 'left';
}

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p>By default, Structured Streaming is a <b>micro-batch</b> engine: the driver plans discrete batches, each a short Spark job. <b>Continuous Processing</b> is a second, experimental engine that processes records <b>one at a time</b> for ~1ms latency — at the cost of operators and guarantees.</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>⚙️ Micro-batch (default)</h4><p>Short jobs on discrete batches. <b>~100ms–seconds</b>, <b>exactly-once</b>, <b>all operators</b>. Right for almost everything.</p></div>
      <div class="ss-card"><h4>➿ Continuous (experimental)</h4><p>Long-running tasks, record-at-a-time, async offset checkpoints. <b>~1ms</b>, <b>at-least-once</b>, <b>map-like ops only</b>.</p></div>
    </div>
    <h3>Why continuous can't do aggregations/joins/windows</h3>
    <p>Those are <b>stateful and need shuffles</b>, which require <b>batch boundaries</b> to snapshot state against. Continuous mode has none — it flows record-by-record — so it supports only <b>partition-local, map-like</b> operators (<code>select</code>, <code>filter</code>, <code>map</code>). Add a stateful op and the query is <b>rejected at start</b>.</p>
    <h3>Guarantee: at-least-once</h3>
    <p>Continuous checkpoints offsets <b>asynchronously</b> (e.g. every 1s via <code>trigger(continuous="1 second")</code>), so a crash reprocesses records since the last checkpoint → <b>duplicates possible</b>. Micro-batch's synchronous offset/commit logs give <b>exactly-once</b>. Need exactly-once? Stay on micro-batch.</p>
    <div class="ss-callout"><b>The honest take:</b> "micro-batch isn't real streaming" is dated — tuned micro-batch is sub-second with exactly-once and full operators. Continuous exists only for the ~1ms, stateless, dup-tolerant niche; if you truly need native per-record stateful streaming, teams often reach for <b>Flink</b>.</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>Both lanes get the same records. Micro-batch holds them at the <b>batch gate</b> and releases a group each trigger (latency = the wait); continuous flows each record straight through (~1ms). <i>Simulated animation</i> — the trade-off is real, the speeds are illustrative.</p></div>
  <div class="ss-canvas-wrap"><canvas id="m06-canvas" width="720" height="250"></canvas></div>
  <div class="ss-controls">
    <button class="ss-btn primary" id="m06-play">⏯ Pause</button>
    <button class="ss-btn" id="m06-mb" data-mode="microbatch">Micro-batch details</button>
    <button class="ss-btn" id="m06-ct" data-mode="continuous">Continuous details</button>
  </div>
  <div class="ss-metrics">
    <div class="ss-metric"><div class="k">Mode</div><div class="v" id="m06-name" style="font-size:15px">—</div></div>
    <div class="ss-metric"><div class="k">Latency</div><div class="v" id="m06-lat" style="font-size:14px">—</div></div>
    <div class="ss-metric"><div class="k">Guarantee</div><div class="v" id="m06-grt" style="font-size:13px">—</div></div>
    <div class="ss-metric"><div class="k">Operators</div><div class="v" id="m06-ops" style="font-size:11px">—</div></div>
  </div>
  <div class="ss-callout" id="m06-note">—</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream weighs continuous mode</h3>
    <p>ShopStream's platform team evaluated continuous processing for the <b>fraud-routing</b> step — a stateless filter that tags suspicious orders and forwards them to a review topic. It's map-only, so it <i>could</i> run continuous for ~1ms latency.</p>
    <p>They declined. The downstream review system wasn't idempotent, so <b>at-least-once duplicates</b> would double-create review cases. Instead they kept <b>micro-batch with the default trigger</b>, which already delivered ~150ms end-to-end and <b>exactly-once</b> — well inside the fraud team's SLA.</p>
    <div class="ss-callout">The lesson ShopStream drew: continuous mode's ~1ms only pays off when the pipeline is <b>stateless AND the sink tolerates duplicates AND sub-second isn't enough</b>. That intersection is rare — tuned micro-batch wins almost every real decision.</div>
  </div>`;

  const code = `
  <div class="ss-prose"><p>Switching engines is a one-line trigger change — the DataFrame code is identical. The query fails to start if it contains an unsupported (stateful/shuffle) operator:</p></div>
  ${codeBlock('PySpark', `# Continuous: ~1ms, stateless/map-only, at-least-once, checkpoint offsets every 1s
(orders
    .where("amount > 500")                 # OK: map-like / partition-local
    .selectExpr("order_id", "category", "amount")
    .writeStream.format("kafka")
    .option("topic", "shopstream.high_value")
    .option("checkpointLocation", "s3://shopstream/chk/hv")
    .trigger(continuous="1 second")        # <-- the ONLY change vs micro-batch
    .start())

# This would be REJECTED AT START under continuous (stateful aggregation):
# orders.groupBy("category").count()      # needs batch boundaries -> micro-batch only`)}
  ${codeBlock('Scala', `import org.apache.spark.sql.streaming.Trigger

orders.where($"amount" > 500)
  .select("order_id", "category", "amount")
  .writeStream.format("kafka")
  .option("topic", "shopstream.high_value")
  .option("checkpointLocation", "s3://shopstream/chk/hv")
  .trigger(Trigger.Continuous("1 second"))   // one-line swap
  .start()`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M06 · Architecture',
    title: 'Continuous Processing',
    subtitle: 'The ~1ms experimental engine vs default micro-batch — and why micro-batch usually wins',
    definition: {
      formal: 'Continuous Processing is an experimental execution mode in which long-running tasks process records individually with asynchronous offset checkpointing, achieving ~1ms latency but supporting only map-like (partition-local) operators and providing at-least-once semantics. Micro-batch (the default) plans discrete batch jobs with synchronous offset-log/commit-log checkpointing, giving ~sub-second-to-seconds latency with exactly-once guarantees and full operator support.',
      easy: 'Spark normally processes data in tiny batches (fast enough for almost anything, and never loses or duplicates data). Continuous mode instead handles one record at a time for ultra-low ~1ms latency, but it can only do simple per-record work and may duplicate records after a crash. You switch by changing a single line — the trigger — but you rarely should.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '➿ Micro-batch vs Continuous', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const canvas = container.querySelector('#m06-canvas');
  const nameEl = container.querySelector('#m06-name'), latEl = container.querySelector('#m06-lat');
  const grtEl = container.querySelector('#m06-grt'), opsEl = container.querySelector('#m06-ops');
  const noteEl = container.querySelector('#m06-note');
  let phase = 0, raf = null, playing = true;

  function loop() {
    phase += 0.006;
    drawModes(canvas, phase);
    if (playing) raf = requestAnimationFrame(loop);
  }
  function selectMode(k) {
    const m = MODES[k];
    nameEl.textContent = m.name; nameEl.style.color = m.color;
    latEl.textContent = m.latency; grtEl.textContent = m.guarantee;
    opsEl.textContent = m.ops; noteEl.innerHTML = `<b>${m.name}:</b> ${m.note}`;
    container.querySelector('#m06-mb').classList.toggle('primary', k === 'microbatch');
    container.querySelector('#m06-ct').classList.toggle('primary', k === 'continuous');
  }

  drawModes(canvas, 0); loop();
  selectMode('microbatch');
  container.querySelector('#m06-play').addEventListener('click', (e) => {
    playing = !playing;
    e.target.textContent = playing ? '⏯ Pause' : '⏯ Play';
    e.target.classList.toggle('primary', playing);
    if (playing) loop(); else if (raf) cancelAnimationFrame(raf);
  });
  container.querySelector('#m06-mb').addEventListener('click', () => selectMode('microbatch'));
  container.querySelector('#m06-ct').addEventListener('click', () => selectMode('continuous'));

  return () => { if (raf) cancelAnimationFrame(raf); };
}

export default { mount };
