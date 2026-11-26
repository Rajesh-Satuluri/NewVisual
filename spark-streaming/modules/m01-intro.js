// M01 · Why Structured Streaming — Foundation
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock } from './_mod-ui.js';

export const IQ = [
  { q: 'What is Spark Structured Streaming, in one sentence?', a: '<p>A <b>high-level, declarative stream-processing engine</b> built on the Spark SQL engine: you express a streaming computation as if it were a batch query on a static table, and Spark runs it <b>incrementally and continuously</b> over an unbounded input, keeping the result up to date with exactly-once guarantees.</p>', tip: 'Lead with "declarative + incremental on the SQL engine" — that single idea distinguishes it from the old DStream API.' },
  { q: 'How does Structured Streaming differ from the legacy DStream (Spark Streaming) API?', a: '<p>DStreams are a <b>low-level RDD-based</b> API: you manipulate micro-batches of RDDs directly, work in <b>processing time</b> only, and get no query optimization. Structured Streaming is <b>DataFrame/Dataset-based</b>, runs through <b>Catalyst + Tungsten</b> (so it is optimized like batch SQL), has first-class <b>event-time + watermark</b> support, and offers <b>exactly-once</b> end-to-end. DStreams are effectively in maintenance mode.</p>', tip: 'If asked which to use for a new job: Structured Streaming, always. DStreams only appear in legacy code.' },
  { q: 'What does "treat a stream as an unbounded table" actually buy you?', a: '<p>The <b>same API and semantics as batch</b>. A windowed aggregation, a join, a dedup — you write them once and they mean the same thing on a bounded or unbounded input. It also lets Catalyst optimize streaming queries with the same machinery as batch, and makes reasoning about correctness (what row is in the result and when) tractable.</p>', tip: 'This "batch = stream" unification is the headline design goal; mention code reuse between a backfill and the live job.' },
  { q: 'Is Structured Streaming real-time? What latency can you expect?', a: '<p>By default it is <b>micro-batch</b>: latency is roughly the trigger interval plus batch processing time — typically <b>hundreds of ms to seconds</b>. The optional <b>continuous processing</b> mode reaches <b>~1 ms</b> but supports only a limited set of operations and gives at-least-once. For most pipelines (ShopStream included), second-level micro-batch latency is the right trade-off.</p>', tip: 'Never call it "real-time" unqualified — say "near-real-time micro-batch, seconds" and mention continuous mode as the low-latency exception.' },
  { q: 'When is Structured Streaming the WRONG tool?', a: '<p>When you need <b>sub-millisecond per-event latency</b> with complex operators (a CEP/alerting engine may fit better), when the workload is truly <b>request/response</b> (that is a service, not a stream), or when a problem is genuinely a <b>one-off batch</b> with no continuous input (just use batch — no checkpoint/state overhead). Also, very <b>complex event-driven state machines</b> can be awkward versus a purpose-built engine like Flink.</p>', tip: 'Showing you know when NOT to use it signals seniority more than listing features.' },
  { q: 'Structured Streaming vs Flink — the honest comparison?', a: '<p>Both do event-time, watermarks, windows, exactly-once. <b>Flink</b> is natively record-at-a-time (lower latency, richer per-event state APIs, better for complex event-driven logic). <b>Structured Streaming</b> is micro-batch-first (slightly higher latency) but wins on <b>unified batch+stream code</b>, the Spark SQL/Catalyst ecosystem, and tight <b>Delta Lake / lakehouse</b> integration. Pick by latency needs and existing stack.</p>', tip: 'Avoid "X is better"; frame it as latency + ecosystem trade-offs.' },
  { q: 'What guarantees does Structured Streaming provide end-to-end?', a: '<p><b>Exactly-once</b> end-to-end, given three conditions: a <b>replayable source</b> (e.g. Kafka offsets), <b>deterministic checkpointing</b> (the offset/commit log), and an <b>idempotent or transactional sink</b> (e.g. Delta, or <code>foreachBatch</code> with upserts). Remove any one and you fall back to at-least-once.</p>', tip: 'Memorize the triad: replayable source + checkpoint + idempotent sink. It recurs across many questions.' },
  { q: 'Why can ShopStream not just run a nightly batch job for fraud and revenue?', a: '<p>Because the <b>value of the signal decays with latency</b>. A fraudulent order flagged at midnight has already shipped; a revenue dashboard that updates once a day cannot drive Black-Friday staffing or inventory. Streaming turns "what happened yesterday" into "what is happening now," which is the whole point for fraud, personalization, and ops alerting.</p>', tip: 'Tie the choice to business value/latency, not to technology for its own sake.' },
  { q: 'Does Structured Streaming replace batch at ShopStream?', a: '<p>No — it complements it. Streaming powers <b>live</b> needs (fraud, real-time revenue, sessionization). Batch still does <b>backfills, reprocessing, heavy historical analytics, and ML training</b>. The win is that the <b>same DataFrame code</b> can run as a backfill (bounded) and as the live job (unbounded), so there is one codebase, not two.</p>', tip: 'Mention "Lambda vs Kappa": unified code pushes you toward a Kappa-style single pipeline.' },
  { q: 'What is a trigger, and what does the default do?', a: '<p>A <b>trigger</b> decides when a new micro-batch runs. The <b>default</b> fires a new batch as soon as the previous one finishes (process-as-fast-as-possible). <code>ProcessingTime("10 seconds")</code> fires on a fixed wall-clock cadence; <code>AvailableNow</code> drains all currently-available data then stops (great for incremental batch); <code>Once</code> runs a single batch. ShopStream uses a fixed interval to bound cost and latency.</p>', tip: 'Know all four triggers by name; AvailableNow vs Once is a common follow-up (AvailableNow can span multiple batches).' },
  { q: 'What are the core building blocks of a streaming query?', a: '<p><b>Source</b> (readStream) → <b>transformations</b> (the same DataFrame ops as batch, plus windows/watermarks/stateful ops) → <b>sink</b> (writeStream with an <b>output mode</b> and a <b>checkpointLocation</b>). The engine plans this into micro-batches, maintains <b>state</b> for aggregations/joins, and records progress in the <b>offset/commit log</b>.</p>', tip: 'Being able to name source → transform → sink + checkpoint + state shows you have the whole mental model.' },
  { q: 'What happens if you forget checkpointLocation?', a: '<p>The query cannot recover: on restart it has no record of which offsets were processed or what the state was, so you lose exactly-once and may reprocess or lose data. For most sinks Spark will actually error or warn. <b>checkpointLocation is mandatory for any production streaming job.</b></p>', tip: 'A classic "gotcha" question — the answer is simply: always set a durable, per-query checkpoint path.' },
];

function drawLatency(canvas, now) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);
  const ml = 70, mr = 20, tMax = 100;
  const xOf = (t) => ml + (t / tMax) * (W - ml - mr);
  const streamY = 72, batchY = 168;
  // orders at fixed event times
  const orders = [8, 18, 27, 39, 52, 61, 73, 86, 94];
  const batchBoundary = 100; // nightly flush
  ctx.font = '12px ui-monospace,monospace';

  // lane labels
  ctx.fillStyle = '#10B981'; ctx.fillText('Streaming', 8, streamY - 22);
  ctx.fillStyle = '#F59E0B'; ctx.fillText('Nightly batch', 8, batchY - 22);
  // lane baselines
  for (const [y, c] of [[streamY, 'rgba(16,185,129,0.35)'], [batchY, 'rgba(245,158,11,0.35)']]) {
    ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(ml, y); ctx.lineTo(xOf(tMax), y); ctx.stroke();
  }
  // batch boundary line
  ctx.strokeStyle = 'rgba(245,158,11,0.5)'; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(xOf(batchBoundary), 40); ctx.lineTo(xOf(batchBoundary), batchY + 18); ctx.stroke();
  ctx.setLineDash([]); ctx.fillStyle = 'rgba(245,158,11,0.8)'; ctx.fillText('00:00 flush', xOf(batchBoundary) - 64, 36);

  let streamLat = [], batchLat = [];
  for (const t of orders) {
    const x = xOf(t);
    const seen = t <= now;
    // order dot (same event on both lanes)
    for (const y of [streamY, batchY]) {
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = seen ? '#64748B' : 'rgba(100,116,139,0.3)'; ctx.fill();
    }
    if (!seen) continue;
    // streaming: processed immediately (tiny latency)
    ctx.beginPath(); ctx.arc(x + 3, streamY, 4, 0, Math.PI * 2); ctx.fillStyle = '#10B981'; ctx.fill();
    streamLat.push(2);
    // batch: result only at boundary if boundary passed
    if (now >= batchBoundary) {
      ctx.strokeStyle = 'rgba(245,158,11,0.55)'; ctx.beginPath(); ctx.moveTo(x, batchY); ctx.lineTo(xOf(batchBoundary), batchY); ctx.stroke();
      ctx.beginPath(); ctx.arc(xOf(batchBoundary), batchY, 4, 0, Math.PI * 2); ctx.fillStyle = '#F59E0B'; ctx.fill();
    }
    batchLat.push(batchBoundary - t);
  }
  // now cursor
  ctx.strokeStyle = '#06B6D4'; ctx.beginPath(); ctx.moveTo(xOf(now), 40); ctx.lineTo(xOf(now), 196); ctx.stroke();
  ctx.fillStyle = '#06B6D4'; ctx.fillText('now', xOf(now) + 4, 52);
  ctx.fillStyle = 'rgba(148,163,184,0.7)'; ctx.fillText('time →', xOf(tMax) - 40, 210);

  const avg = (a) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0);
  return { stream: avg(streamLat), batch: now >= batchBoundary ? avg(batchLat) : (orders.filter(t => t <= now).length ? '—' : 0) };
}

export function mount(container) {
  injectModStyles();
  const concept = `
  <div class="ss-prose">
    <p>Spark <b>Structured Streaming</b> lets you write a streaming job as if it were a <b>batch query over a table</b> — and Spark runs it incrementally, forever, keeping the answer current. It is built on the same <b>Spark SQL (Catalyst + Tungsten)</b> engine as batch, so the same optimizations and the same DataFrame API apply.</p>
    <h3>The problem it solves</h3>
    <p>Classic batch answers "what happened <i>yesterday</i>." For fraud, live revenue, personalization and on-call alerting, that is too late — the value of a signal <b>decays with latency</b>. Structured Streaming turns the question into "what is happening <b>now</b>," continuously.</p>
    <h3>Why not the old DStream API?</h3>
    <ul>
      <li><b>DStreams</b> — low-level RDDs, processing-time only, no query optimizer. In maintenance mode.</li>
      <li><b>Structured Streaming</b> — DataFrames through Catalyst/Tungsten, first-class <b>event time + watermarks</b>, <b>exactly-once</b> end-to-end, and <b>one codebase</b> for batch and streaming.</li>
    </ul>
    <h3>The mental model (the rest of this course)</h3>
    <ol>
      <li>A stream is an <b>unbounded input table</b> (M02).</li>
      <li>A query is an <b>incremental view</b> the engine keeps up to date (M02–M03).</li>
      <li><b>Triggers</b> decide when each micro-batch runs (M05); <b>watermarks</b> bound lateness and state (M08); <b>output modes</b> decide what gets emitted (M12).</li>
    </ol>
    <div class="ss-callout">Latency reality check: default micro-batch latency is <b>seconds</b>, not microseconds. Continuous mode reaches ~1&nbsp;ms but supports only limited operations. Don't call it "real-time" unqualified.</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>Same ShopStream orders, two architectures. Press play and watch end-to-end latency: streaming processes each order on arrival; the nightly batch holds everything until the 00:00 flush.</p></div>
  <div class="ss-canvas-wrap"><canvas id="m01-canvas" width="860" height="230"></canvas></div>
  <div class="ss-controls">
    <button class="ss-btn primary" id="m01-play">▶ Play</button>
    <button class="ss-btn" id="m01-reset">⟲ Reset</button>
  </div>
  <div class="ss-metrics">
    <div class="ss-metric"><div class="k">Avg latency · streaming</div><div class="v" id="m01-sl" style="color:var(--green)">0</div></div>
    <div class="ss-metric"><div class="k">Avg latency · nightly batch</div><div class="v" id="m01-bl" style="color:var(--yellow)">0</div></div>
  </div>
  <div class="ss-caption">Streaming latency stays ~constant and tiny; batch latency is <b>(flush time − order time)</b> — an order placed at 00:01 waits almost 24h. That gap is why ShopStream streams.</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream — the running example</h3>
    <p>Throughout this course, <b>ShopStream</b> is a high-traffic store whose <b>orders</b> and <b>clickstream</b> flow through Kafka at ~<b>250k events/s</b>, often <b>out of order and late</b>. We turn them into:</p>
    <ul>
      <li><b>Real-time revenue</b> — per-category revenue in 1-minute windows for the ops dashboard.</li>
      <li><b>Sessionized browsing</b> — 30-minute session windows over clicks.</li>
      <li><b>Fraud flags</b> — stateful rules on the order stream, within seconds.</li>
      <li><b>An exactly-once Delta lakehouse</b> — orders upserted via <code>foreachBatch</code> + <code>MERGE</code>.</li>
    </ul>
    <p>The pipeline uses a <b>10-second trigger</b>, a <b>5-minute watermark</b>, and writes <b>exactly-once to Delta</b>. Every module applies a concept to this one story, so the numbers stay consistent end to end (capstone: M22).</p>
    <div class="ss-callout">Why streaming for ShopStream: a fraud signal is worthless after the order ships; a revenue dashboard that refreshes daily can't drive Black-Friday staffing. Streaming makes both <b>actionable now</b>.</div>
  </div>`;

  const code = `
  <div class="ss-prose"><p>The same ShopStream job — notice how little separates it from batch: <code>readStream</code>/<code>writeStream</code>, an output mode, and a checkpoint.</p></div>
  ${codeBlock('PySpark', `from pyspark.sql.functions import col, window, sum as _sum

orders = (spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", "broker:9092")
    .option("subscribe", "shopstream.orders")
    .load()
    .selectExpr("CAST(value AS STRING) AS json", "timestamp")
    # ... parse json into event_time, category, amount ...
)

revenue = (orders
    .withWatermark("event_time", "5 minutes")
    .groupBy(window("event_time", "1 minute"), col("category"))
    .agg(_sum("amount").alias("revenue")))

query = (revenue.writeStream
    .outputMode("update")
    .format("console")
    .trigger(processingTime="10 seconds")
    .option("checkpointLocation", "/chk/shopstream-revenue")
    .start())

query.awaitTermination()`)}
  ${codeBlock('Scala', `import org.apache.spark.sql.functions._

val revenue = orders
  .withWatermark("event_time", "5 minutes")
  .groupBy(window($"event_time", "1 minute"), $"category")
  .agg(sum("amount").as("revenue"))

val query = revenue.writeStream
  .outputMode("update")
  .format("console")
  .trigger(Trigger.ProcessingTime("10 seconds"))
  .option("checkpointLocation", "/chk/shopstream-revenue")
  .start()`)}
  <div class="ss-prose"><p>Swap <code>readStream</code>→<code>read</code> and <code>writeStream</code>→<code>write</code> and the <i>same</i> aggregation runs as a bounded backfill. That is the unification payoff.</p></div>`;

  container.innerHTML = createModuleShell({
    tag: 'M01 · Foundation',
    title: 'Why Structured Streaming',
    subtitle: 'The declarative, incremental stream engine on Spark SQL — and why ShopStream needs it',
    definition: {
      formal: 'Structured Streaming is a scalable, fault-tolerant stream-processing engine built on the Spark SQL engine. You express streaming computations declaratively (as batch-like DataFrame/SQL queries) and the engine executes them incrementally and continuously over an unbounded input, maintaining the result with exactly-once guarantees.',
      easy: 'Write your streaming job like a normal query over a table. Spark keeps re-running it for you, a little at a time, forever — and keeps the answer correct and up to date.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '📊 Batch vs Stream', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const canvas = container.querySelector('#m01-canvas');
  const sl = container.querySelector('#m01-sl'), bl = container.querySelector('#m01-bl');
  let now = 0, raf = null, playing = false;
  const frame = () => {
    now = Math.min(110, now + 0.7);
    const m = drawLatency(canvas, now);
    sl.textContent = m.stream; bl.textContent = m.batch;
    if (now >= 110) { playing = false; container.querySelector('#m01-play').textContent = '▶ Play'; return; }
    raf = requestAnimationFrame(frame);
  };
  drawLatency(canvas, 0);
  container.querySelector('#m01-play').addEventListener('click', (e) => {
    if (playing) { playing = false; cancelAnimationFrame(raf); e.target.textContent = '▶ Play'; return; }
    if (now >= 110) now = 0;
    playing = true; e.target.textContent = '⏸ Pause'; raf = requestAnimationFrame(frame);
  });
  container.querySelector('#m01-reset').addEventListener('click', () => {
    playing = false; cancelAnimationFrame(raf); now = 0;
    const m = drawLatency(canvas, 0); sl.textContent = m.stream; bl.textContent = m.batch;
    container.querySelector('#m01-play').textContent = '▶ Play';
  });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

export default { mount };
