// M21 · Monitoring & Listeners — Lakehouse & Ops  (engine-driven: E1 trace)
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock } from './_mod-ui.js';
import { MicroBatchQuery } from '../sim/microbatch-engine.js';

export const IQ = [
  { q: 'How do you observe a running streaming query?', a: '<p><b>StreamingQueryProgress</b> — emitted per batch, available via <code>query.lastProgress</code> / <code>query.recentProgress</code> and through a <b>StreamingQueryListener</b>. It reports <code>batchId</code>, <code>numInputRows</code>, <code>inputRowsPerSecond</code>, <code>processedRowsPerSecond</code>, <code>durationMs</code> (per phase), <code>eventTime</code> watermark, and <code>stateOperators</code> (state rows, memory, rows dropped by watermark). Plus the <b>Spark UI</b> Structured Streaming tab visualizes these over time.</p>', tip: 'StreamingQueryProgress per batch (lastProgress/recentProgress + listener) + Spark UI streaming tab. Know the key fields.' },
  { q: 'What is the single most important health metric?', a: '<p><b>batchDuration vs the trigger interval.</b> If <code>durationMs.triggerExecution</code> persistently approaches or exceeds the trigger interval, the query <b>can\'t keep up</b> → lag grows without bound. The companion signal is <b>inputRowsPerSecond &gt; processedRowsPerSecond</b> sustained (ingesting faster than processing). Either means you\'re falling behind and need more parallelism, less state, or rate limiting (M05, M20).</p>', tip: 'batchDuration < trigger interval (with headroom). And input rate must not exceed processed rate. The #1 health check.' },
  { q: 'What is a StreamingQueryListener and what are its callbacks?', a: '<p>A listener you register on the <code>SparkSession.streams</code> to receive query lifecycle events: <b>onQueryStarted</b>, <b>onQueryProgress</b> (per-batch progress — the main one, for metrics/alerting), and <b>onQueryTerminated</b> (including the exception if it failed). You use it to push metrics to <b>Prometheus/Datadog/CloudWatch</b>, log, or alert — the programmatic hook for production monitoring beyond the UI.</p>', tip: 'onQueryStarted / onQueryProgress / onQueryTerminated. Register on spark.streams; push to Prometheus/Datadog/alerts.' },
  { q: 'What do the durationMs sub-fields tell you?', a: '<p>They break batch time into phases: <b>addBatch</b> (actual data processing — usually the bulk), <b>getOffset/latestOffset</b> (source offset fetch), <b>walCommit</b> (writing the offset log), <b>queryPlanning</b>, and <b>triggerExecution</b> (the total). If <b>addBatch</b> dominates you\'re compute/state-bound; if <b>getOffset</b> is high your source is slow; if <b>walCommit</b> is high your checkpoint storage is slow. This phase breakdown drives targeted tuning.</p>', tip: 'addBatch=processing, getOffset=source, walCommit=checkpoint IO, triggerExecution=total. The breakdown localizes the bottleneck.' },
  { q: 'How do you monitor state size and late-data drops?', a: '<p>In <code>stateOperators</code> of each progress: <b>numRowsTotal</b> (retained state rows), <b>memoryUsedBytes</b>, <b>numRowsUpdated/Removed</b>, and <b>numRowsDroppedByWatermark</b>. Rising <code>numRowsTotal</code>/<code>memoryUsedBytes</code> batch-over-batch = a <b>state leak</b> (no/weak watermark, complete mode, cardinality blowup). A high <code>numRowsDroppedByWatermark</code> = watermark too tight → undercounting. Both are key production alerts (M08, M10).</p>', tip: 'stateOperators: numRowsTotal/memoryUsedBytes (leak if rising), numRowsDroppedByWatermark (too-tight watermark). Core alerts.' },
  { q: 'What does "input rate > processed rate" indicate and how do you fix it?', a: '<p>You\'re <b>ingesting faster than you can process</b> → growing lag. Fixes: increase <b>parallelism</b> (more Kafka partitions + executor cores, adequate <code>shuffle.partitions</code>), <b>reduce per-batch work</b> (tighter state, less shuffle, cheaper aggregations), <b>rate-limit</b> ingest (<code>maxOffsetsPerTrigger</code>) to bound batch size, or scale the cluster. Sustained, it\'s the clearest "add capacity" signal (M20).</p>', tip: 'Ingesting > processing → lag. Fix: parallelism, cheaper batches, rate limit, or scale out. The capacity signal.' },
  { q: 'How do you track end-to-end latency / data freshness?', a: '<p>Compare the <b>event-time watermark</b> in progress to wall-clock now: <code>now − watermark</code> ≈ how far behind real time the query is (data freshness / lag). Also watch the <b>trend of batchId timing</b>. For true end-to-end you add source-to-sink timestamps. The watermark-vs-now gap is the quickest proxy for "how stale is my output."</p>', tip: 'now − event-time watermark ≈ data freshness/lag. Quick proxy for output staleness; add src/sink timestamps for true E2E.' },
  { q: 'How should you alert on a streaming job in production?', a: '<p>Via the <b>listener → metrics backend</b>: alert on (1) <b>batchDuration &gt; threshold</b> (near the trigger interval), (2) <b>processed &lt; input rate</b> sustained, (3) <b>state/memory</b> trending up, (4) <b>numRowsDroppedByWatermark</b> spikes, (5) <b>query terminated</b> with an exception (onQueryTerminated), and (6) <b>no progress</b> for N minutes (stuck). Pair with <b>supervised restart</b> so transient failures self-heal (M16).</p>', tip: 'Alert: batch duration, input>processed, state/memory up, drops, termination, no-progress. Pair with supervised restart.' },
  { q: 'What does the Spark UI Structured Streaming tab show?', a: '<p>Per query: timelines of <b>input/processing rate</b>, <b>batch duration</b>, <b>operation duration</b> (the durationMs phases), and <b>state metrics</b> over recent batches — the visual version of the progress stream. It\'s the first place to look for "is it keeping up and is state stable," before wiring external dashboards. Useful for ad-hoc diagnosis; listeners are for continuous alerting.</p>', tip: 'Spark UI streaming tab = visual input/processing rate, batch duration, state over time. First-look diagnosis.' },
  { q: 'What are leading indicators that a streaming job is about to fail?', a: '<p><b>Creeping batchDuration</b> toward the trigger interval, <b>steadily rising state/memory</b> (GC pressure → OOM), <b>growing lag</b> (watermark-vs-now widening), <b>increasing task failures/retries</b>, and <b>checkpoint/commit latency</b> climbing. Catching these <i>trends</i> (not just thresholds) via the listener lets you intervene — scale, tighten state, rate-limit — before an outage (M20).</p>', tip: 'Trends: batchDuration creeping, state/memory rising, lag widening, retries up, checkpoint latency up. Watch trends, not just thresholds.' },
];

// E1 trace drives the REAL metrics (numInputRows, dropped, state rows, watermark);
// batch durations/rates are a labeled SIMULATION derived deterministically.
const BATCHES = [
  [{ id: 'a', eventTime: 1, cat: 'books' }, { id: 'b', eventTime: 2, cat: 'toys' }, { id: 'c', eventTime: 3, cat: 'books' }],
  [{ id: 'd', eventTime: 6, cat: 'toys' }, { id: 'e', eventTime: 7, cat: 'books' }, { id: 'f', eventTime: 8, cat: 'home' }, { id: 'g', eventTime: 8, cat: 'toys' }],
  [{ id: 'h', eventTime: 11, cat: 'books' }, { id: 'i', eventTime: 3, cat: 'toys' }],   // i is late -> dropped
  [{ id: 'j', eventTime: 13, cat: 'home' }, { id: 'k', eventTime: 14, cat: 'books' }, { id: 'l', eventTime: 15, cat: 'toys' }, { id: 'm', eventTime: 16, cat: 'home' }, { id: 'n', eventTime: 16, cat: 'books' }],
  [{ id: 'o', eventTime: 19, cat: 'toys' }],
];
const TRIGGER_MS = 1000;
// deterministic pseudo-duration: base + per-row cost + state cost (ms)
function batchDuration(e) { return 120 + e.input * 110 + e.state.length * 40; }

function drawDash(canvas, trace, cursor) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);
  const pad = 46, axisY = H - 34, topY = 26;
  const n = trace.length;
  const durs = trace.map(batchDuration);
  const maxD = Math.max(TRIGGER_MS * 1.1, ...durs);
  const BX = (i) => pad + (i + 0.5) * ((W - pad * 2) / n);
  const BY = (v) => axisY - (v / maxD) * (axisY - topY);

  // trigger-interval threshold line
  ctx.strokeStyle = '#EF4444'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pad, BY(TRIGGER_MS)); ctx.lineTo(W - pad, BY(TRIGGER_MS)); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#EF4444'; ctx.font = '10px ui-monospace,monospace'; ctx.textAlign = 'left';
  ctx.fillText('trigger interval = ' + TRIGGER_MS + 'ms (must stay under)', pad + 4, BY(TRIGGER_MS) - 5);

  // axis
  ctx.strokeStyle = 'rgba(148,163,184,0.4)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pad, axisY); ctx.lineTo(W - pad, axisY); ctx.stroke();
  ctx.fillStyle = 'rgba(148,163,184,0.6)'; ctx.font = '10px ui-monospace,monospace'; ctx.textAlign = 'center';

  const bw = Math.min(50, (W - pad * 2) / n - 12);
  trace.forEach((e, i) => {
    const d = durs[i];
    const over = d > TRIGGER_MS;
    const active = i === cursor;
    ctx.fillStyle = over ? (active ? '#EF4444' : 'rgba(239,68,68,0.5)') : (active ? '#10B981' : 'rgba(16,185,129,0.45)');
    const x = BX(i) - bw / 2;
    ctx.beginPath(); ctx.roundRect(x, BY(d), bw, axisY - BY(d), 4); ctx.fill();
    if (active) { ctx.strokeStyle = over ? '#EF4444' : '#10B981'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = active ? '#E2E8F0' : 'rgba(148,163,184,0.7)';
    ctx.fillText(d + 'ms', BX(i), BY(d) - 6);
    ctx.fillStyle = 'rgba(148,163,184,0.7)'; ctx.fillText('b' + i, BX(i), axisY + 15);
  });
  ctx.textAlign = 'left';
}

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p>A streaming query runs forever, so <b>observing</b> it is as important as writing it. Spark exposes per-batch <b>StreamingQueryProgress</b> — the pulse of the query.</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>📊 StreamingQueryProgress</h4><p>Per batch: <code>numInputRows</code>, input/processed <b>rate</b>, <code>durationMs</code> phases, event-time <b>watermark</b>, and <code>stateOperators</code> (rows, memory, drops).</p></div>
      <div class="ss-card"><h4>📡 StreamingQueryListener</h4><p><code>onQueryStarted</code> / <code>onQueryProgress</code> / <code>onQueryTerminated</code> — push metrics to Prometheus/Datadog, log, and alert.</p></div>
      <div class="ss-card"><h4>⏱️ #1 metric</h4><p><b>batchDuration &lt; trigger interval</b>, always. And <b>processed rate ≥ input rate</b>. Breach either = falling behind.</p></div>
      <div class="ss-card"><h4>🗄️ State & drops</h4><p>Rising <code>numRowsTotal</code>/<code>memoryUsedBytes</code> = leak. High <code>numRowsDroppedByWatermark</code> = watermark too tight.</p></div>
    </div>
    <h3>Reading the durationMs breakdown</h3>
    <p><b>addBatch</b> (processing) · <b>getOffset</b> (source) · <b>walCommit</b> (checkpoint IO) · <b>triggerExecution</b> (total). Whichever phase dominates localizes the bottleneck — compute/state, a slow source, or slow checkpoint storage (M20).</p>
    <div class="ss-callout"><b>Data freshness</b> ≈ <code>now − event-time watermark</code> — the quickest proxy for how stale your output is. Alert on the <i>trends</i> (creeping batchDuration, rising state, widening lag), not just thresholds, to intervene before an outage.</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>A live <b>QueryProgress dashboard</b> driven by the <b>real E1 engine</b> — <code>numInputRows</code>, dropped rows, state size and the watermark are the engine's actual per-batch output. <i>(Batch durations/rates are a labeled deterministic model of processing cost.)</i> Watch batch 1 & 3's bars approach the red trigger-interval line as input and state grow.</p></div>
  <div class="ss-controls">
    <button class="ss-btn primary" id="m21-step">Next batch ▶</button>
    <button class="ss-btn" id="m21-back">◀ Back</button>
    <button class="ss-btn" id="m21-reset">⟲ Reset</button>
  </div>
  <div class="ss-canvas-wrap"><canvas id="m21-canvas" width="720" height="210"></canvas></div>
  <div class="ss-metrics">
    <div class="ss-metric"><div class="k">numInputRows</div><div class="v" id="m21-in">—</div></div>
    <div class="ss-metric"><div class="k">droppedByWatermark</div><div class="v" id="m21-drop">—</div></div>
    <div class="ss-metric"><div class="k">state rows</div><div class="v" id="m21-state">—</div></div>
    <div class="ss-metric"><div class="k">batchDuration</div><div class="v" id="m21-dur">—</div></div>
    <div class="ss-metric"><div class="k">watermark</div><div class="v" id="m21-wm">—</div></div>
  </div>
  <div class="ss-callout" id="m21-health">—</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream's streaming SRE dashboard</h3>
    <p>ShopStream registers a <b>StreamingQueryListener</b> that ships every <code>onQueryProgress</code> to <b>Prometheus</b>, with Grafana panels for input vs processed rate, batch duration vs the 10s trigger, state memory, and <code>numRowsDroppedByWatermark</code>. PagerDuty alerts fire on: batch duration &gt; 8s, processed &lt; input for 5 min, state memory trending up 3 batches running, and <code>onQueryTerminated</code> with an exception.</p>
    <p>During Black Friday the dashboard showed batch duration <b>creeping from 3s toward 9s</b> as order volume spiked and state grew — <i>before</i> any lag was user-visible. The on-call engineer bumped <code>shuffle.partitions</code> headroom and tightened the watermark, dropping duration back to 4s. The <b>trend</b>, caught early via the listener, prevented an outage.</p>
    <div class="ss-callout">A separate alert on <b>no progress for 3 minutes</b> catches a <i>stuck</i> query (e.g. a hung source) that threshold-based rate alerts would miss — paired with supervised restart so most blips self-heal.</div>
  </div>`;

  const code = `
  ${codeBlock('Scala — StreamingQueryListener for metrics/alerting', `spark.streams.addListener(new StreamingQueryListener {
  def onQueryStarted(e: QueryStartedEvent): Unit = log.info(s"started \${e.id}")
  def onQueryProgress(e: QueryProgressEvent): Unit = {
    val p = e.progress
    pushMetric("input_rows", p.numInputRows)
    pushMetric("input_rps", p.inputRowsPerSecond)
    pushMetric("processed_rps", p.processedRowsPerSecond)
    pushMetric("batch_ms", p.durationMs.get("triggerExecution"))
    p.stateOperators.foreach { s =>
      pushMetric("state_rows", s.numRowsTotal)
      pushMetric("state_mem", s.memoryUsedBytes)
      pushMetric("dropped_by_watermark", s.numRowsDroppedByWatermark)
    }
  }
  def onQueryTerminated(e: QueryTerminatedEvent): Unit =
    e.exception.foreach(ex => alert(s"query \${e.id} died: \$ex"))
})`)}
  ${codeBlock('PySpark — reading lastProgress', `p = query.lastProgress
print(p["numInputRows"], p["inputRowsPerSecond"], p["processedRowsPerSecond"])
print(p["durationMs"])                       # {'addBatch':..., 'walCommit':..., 'triggerExecution':...}
print(p["stateOperators"][0]["numRowsDroppedByWatermark"])`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M21 · Lakehouse & Ops',
    title: 'Monitoring & Listeners',
    subtitle: 'StreamingQueryProgress, listeners, and the metrics that predict trouble',
    definition: {
      formal: 'Structured Streaming exposes per-batch StreamingQueryProgress (via query.lastProgress/recentProgress and StreamingQueryListener callbacks onQueryStarted/onQueryProgress/onQueryTerminated) reporting input and processed rates, durationMs phase breakdown, the event-time watermark, and stateOperators metrics including retained rows, memory, and rows dropped by watermark. The primary health conditions are batch duration staying below the trigger interval and processed rate meeting input rate; listeners feed external metrics and alerting.',
      easy: 'Because a streaming job never stops, you watch its vital signs each batch: how many rows came in, how fast it processed them, how long the batch took, how much memory the state uses, and how many late rows it dropped. The golden rule is that each batch must finish before the next is due. A listener lets you ship these numbers to a dashboard and get paged when the trend turns bad — ideally before users notice.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '📡 Live Dashboard', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const q = new MicroBatchQuery({ window: { type: 'tumbling', size: 5 }, watermarkDelay: 2, outputMode: 'update', groupBy: 'cat', aggregate: { fn: 'count' } });
  const trace = q.run(BATCHES).trace;
  let cursor = -1;
  const canvas = container.querySelector('#m21-canvas');
  const inEl = container.querySelector('#m21-in'), dropEl = container.querySelector('#m21-drop');
  const stateEl = container.querySelector('#m21-state'), durEl = container.querySelector('#m21-dur');
  const wmEl = container.querySelector('#m21-wm'), healthEl = container.querySelector('#m21-health');
  const fmtWm = (v) => (v === Number.NEGATIVE_INFINITY ? '−∞' : String(v));

  function render() {
    drawDash(canvas, trace, cursor);
    if (cursor < 0) {
      inEl.textContent = '—'; dropEl.textContent = '—'; stateEl.textContent = '—'; durEl.textContent = '—'; wmEl.textContent = '−∞';
      healthEl.innerHTML = 'Press <b>Next batch ▶</b> to stream per-batch progress into the dashboard.';
      return;
    }
    const e = trace[cursor];
    const dur = batchDuration(e);
    inEl.textContent = e.input;
    dropEl.textContent = e.droppedCount;
    dropEl.style.color = e.droppedCount ? 'var(--red,#EF4444)' : 'var(--text-primary)';
    stateEl.textContent = e.state.length;
    durEl.textContent = dur + 'ms';
    durEl.style.color = dur > TRIGGER_MS ? 'var(--red,#EF4444)' : 'var(--green,#10B981)';
    wmEl.textContent = fmtWm(e.watermarkAfter);
    const over = dur > TRIGGER_MS;
    healthEl.innerHTML = over
      ? `🔴 <b>Batch ${cursor}: UNHEALTHY</b> — batchDuration <b>${dur}ms &gt; ${TRIGGER_MS}ms</b> trigger interval. The next batch can't start on time → lag will grow. Add parallelism, tighten state, or rate-limit (M20).`
      : `🟢 <b>Batch ${cursor}: healthy</b> — ${dur}ms < ${TRIGGER_MS}ms trigger, ${e.input} rows in, ${e.droppedCount} dropped, ${e.state.length} state rows. Processing comfortably keeps up.`
      + (e.droppedCount ? ` ⚠️ <span style="color:var(--yellow,#F59E0B)">${e.droppedCount} late row(s) dropped by the watermark — check the delay if this rises.</span>` : '');
  }

  container.querySelector('#m21-step').addEventListener('click', () => { if (cursor < trace.length - 1) { cursor++; render(); } });
  container.querySelector('#m21-back').addEventListener('click', () => { if (cursor >= 0) { cursor--; render(); } });
  container.querySelector('#m21-reset').addEventListener('click', () => { cursor = -1; render(); });
  render();
}

export default { mount };
