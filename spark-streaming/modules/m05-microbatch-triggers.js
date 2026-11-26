// M05 · Micro-Batch & Triggers — Architecture  (engine-driven: uses E1 planBatches)
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock } from './_mod-ui.js';
import { planBatches } from '../sim/microbatch-engine.js';

export const IQ = [
  { q: 'What is a trigger, and what are the trigger types?', a: '<p>A <b>trigger</b> decides <i>when</i> the driver kicks off the next micro-batch. Types: <b>processingTime(interval)</b> — fire every N (the default-style fixed cadence); <b>default/unspecified</b> — start the next batch as soon as the previous finishes (back-to-back); <b>once</b> — process all currently available data in one batch and stop (deprecated, batch-like); <b>availableNow</b> — process all available data but in <b>multiple</b> batches honoring rate limits, then stop; and <b>continuous(interval)</b> — the experimental low-latency non-micro-batch mode (M06).</p>', tip: 'Five: processingTime, default (asap), once, availableNow, continuous. Know availableNow replaced once.' },
  { q: 'processingTime vs the default (unspecified) trigger?', a: '<p><b>Default</b>: the next batch starts <b>immediately</b> after the previous one commits — lowest latency, but the batch cadence is irregular (driven by processing time). <b>processingTime="10 seconds"</b>: batches fire on a <b>fixed wall-clock interval</b>; if a batch finishes early the driver <b>waits</b> for the next tick, if it runs long the next fires late. Fixed intervals give predictable cadence and let the cluster idle between batches.</p>', tip: 'Default = back-to-back (fastest). processingTime = fixed cadence with waiting. Mention the "finishes early → waits" detail.' },
  { q: 'What is availableNow and why did it replace Trigger.Once?', a: '<p><b>Trigger.Once</b> processes <i>all</i> available data in a <b>single giant batch</b> — which can blow up memory/state and ignores <code>maxOffsetsPerTrigger</code>. <b>availableNow</b> processes all currently-available data too, but across <b>many bounded micro-batches</b> that <b>respect rate limits</b>, then stops. It\'s the modern choice for scheduled/incremental batch jobs (run a stream like a cron job, catch up safely, exit).</p>', tip: 'once = one huge batch, ignores limits. availableNow = many bounded batches then stop. That\'s the upgrade.' },
  { q: 'Why must batch processing time stay under the trigger interval?', a: '<p>If a batch takes <b>longer than the interval</b>, the next can\'t start on time and <b>lag grows without bound</b> — latency climbs forever. Healthy: <code>batchDuration &lt; triggerInterval</code> with headroom. You watch <code>batchDuration</code> vs trigger in <code>StreamingQueryProgress</code> and fix with more parallelism, less state, or tighter rate limits (M20, M21).</p>', tip: 'The #1 health metric. "batchDuration must stay under the trigger interval." Memorize it.' },
  { q: 'How do rate limits interact with triggers?', a: '<p>Rate limits (<code>maxOffsetsPerTrigger</code>, <code>maxFilesPerTrigger</code>) cap <b>how much</b> each triggered batch ingests; the trigger controls <b>when</b>. Together they bound batch size so processing fits inside the interval. After a lag spike, the limit splits the backlog across many triggers so the job catches up steadily instead of attempting one oversized batch. <code>availableNow</code> specifically honors these limits (unlike <code>once</code>).</p>', tip: 'Trigger = when, rate limit = how much. They combine to keep batchDuration bounded.' },
  { q: 'What happens if a batch finishes faster than the processingTime interval?', a: '<p>The driver <b>idles until the next tick</b> — it does not start early. This is intended: fixed cadence, predictable latency, and the cluster can do other work (or scale down) in the gap. If you want it to immediately start the next batch instead, use the <b>default</b> trigger (no interval).</p>', tip: 'processingTime early-finish → the driver waits. Only the default trigger goes back-to-back.' },
  { q: 'Can you change the trigger on a running query?', a: '<p>No — not on a live query. You stop it and restart (same checkpoint) with the new trigger. The trigger isn\'t baked into the checkpoint the way shuffle partitions are, so a restart with a different trigger is fine; you just can\'t hot-swap it. Other things <b>are</b> pinned by the checkpoint (shuffle partitions, source set) and need a new checkpoint to change.</p>', tip: 'Trigger: stop + restart to change (checkpoint-safe). Contrast with shuffle partitions which need a NEW checkpoint.' },
  { q: 'How would you run a streaming pipeline as a scheduled nightly job?', a: '<p>Use <b>Trigger.AvailableNow</b>: schedule the same streaming code to run (Airflow/Databricks Jobs/cron), it reads everything accumulated since the last run across bounded batches, honors rate limits, updates the checkpoint, and <b>exits</b>. You get streaming\'s exactly-once + incremental semantics with batch-like scheduling and cost — no always-on cluster.</p>', tip: 'availableNow + a scheduler = "incremental batch." Cheapest way to get exactly-once without a 24/7 cluster.' },
  { q: 'What does StreamingQueryProgress tell you about triggers/batches?', a: '<p>Per batch: <code>batchId</code>, <code>numInputRows</code>, <code>inputRowsPerSecond</code>, <code>processedRowsPerSecond</code>, and <code>durationMs</code> broken into phases (addBatch, getOffset, walCommit, queryPlanning). The key comparison is <b>batchDuration vs trigger interval</b> and <b>inputRate vs processedRate</b> — if input &gt; processed persistently, you\'re falling behind (M21).</p>', tip: 'numInputRows, durationMs phases, input vs processed rate. Falling behind = inputRate > processedRate.' },
];

const PRESETS = {
  steady: { label: 'Steady arrivals', recs: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18].map((t, i) => ({ id: 'o' + i, eventTime: t, arrivalTime: t })) },
  bursty: { label: 'Bursty (backlog)', recs: [0, 1, 2, 3, 4, 10, 10, 11, 11, 12, 12, 13].map((t, i) => ({ id: 'o' + i, eventTime: t, arrivalTime: t })) },
};

const PALETTE = ['#06B6D4', '#F59E0B', '#8B5CF6', '#10B981', '#EC4899', '#3B82F6', '#EF4444', '#14B8A6'];

function drawPlan(canvas, recs, batches) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);
  const pad = 40, axisY = H - 46;
  const times = recs.map((r) => r.arrivalTime ?? r.eventTime);
  const tMax = Math.max(1, ...times);
  const X = (t) => pad + (t / tMax) * (W - pad * 2);

  // map each record seq -> batch index
  const batchOf = new Map();
  batches.forEach((b, bi) => b.forEach((r) => batchOf.set(r.id, bi)));

  // axis
  ctx.strokeStyle = 'rgba(148,163,184,0.4)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pad, axisY); ctx.lineTo(W - pad, axisY); ctx.stroke();
  ctx.fillStyle = 'rgba(148,163,184,0.75)'; ctx.font = '11px ui-monospace,monospace'; ctx.textAlign = 'center';
  for (let t = 0; t <= tMax; t += Math.max(1, Math.round(tMax / 10))) {
    ctx.fillText('t' + t, X(t), axisY + 16);
    ctx.strokeStyle = 'rgba(148,163,184,0.12)'; ctx.beginPath(); ctx.moveTo(X(t), 24); ctx.lineTo(X(t), axisY); ctx.stroke();
  }

  // batch bands (background rectangles spanning each batch's arrival range)
  batches.forEach((b, bi) => {
    if (!b.length) return;
    const bt = b.map((r) => r.arrivalTime ?? r.eventTime);
    const x0 = X(Math.min(...bt)) - 10, x1 = X(Math.max(...bt)) + 10;
    const col = PALETTE[bi % PALETTE.length];
    ctx.fillStyle = col + '22'; ctx.strokeStyle = col + '99'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x0, 30, Math.max(x1 - x0, 20), axisY - 36, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.font = 'bold 11px ui-monospace,monospace';
    ctx.fillText('batch ' + bi, (x0 + x1) / 2, 44);
  });

  // record dots
  recs.forEach((r) => {
    const t = r.arrivalTime ?? r.eventTime;
    const bi = batchOf.get(r.id);
    const col = bi == null ? '#64748B' : PALETTE[bi % PALETTE.length];
    const y = axisY - 20;
    ctx.beginPath(); ctx.arc(X(t), y, 7, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = '#0A0E1A'; ctx.lineWidth = 2; ctx.stroke();
  });
  ctx.textAlign = 'left';
}

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p>A <b>trigger</b> is the clock: it decides <i>when</i> the driver starts the next micro-batch. The same stream, planned under different triggers, produces completely different batch boundaries — and that controls latency, cost, and whether you can keep up.</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>⏱️ processingTime(interval)</h4><p>Fire on a fixed wall-clock cadence. Finishes early → the driver waits. Predictable latency; cluster idles between batches.</p></div>
      <div class="ss-card"><h4>⚡ default (unspecified)</h4><p>Start the next batch the instant the last commits — back-to-back, lowest latency, irregular cadence.</p></div>
      <div class="ss-card"><h4>📦 availableNow</h4><p>Drain all available data across <b>many bounded</b> batches (honoring rate limits), then stop. The modern "incremental batch."</p></div>
      <div class="ss-card"><h4>🅾️ once (deprecated)</h4><p>All available data in <b>one</b> batch, then stop — ignores rate limits. Replaced by availableNow.</p></div>
    </div>
    <h3>The micro-batch lifecycle</h3>
    <p>Each trigger runs the same seven steps: read new <b>offsets</b> → write them to the <b>offset log</b> → plan → executors update <b>state</b> → sink commits → write the <b>commit log</b> → advance the <b>watermark</b>. The offset-before / commit-after ordering is the backbone of exactly-once (M15).</p>
    <div class="ss-callout"><b>Health rule:</b> <code>batchDuration &lt; triggerInterval</code>, always. If a batch runs longer than the interval, lag grows forever and latency never recovers (M21).</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>Watch the <b>real E1 engine's</b> <code>planBatches()</code> group the same arrivals into micro-batches as you change the trigger. Each colored band is one batch the driver would run.</p></div>
  <div class="ss-controls">
    <label style="font-size:12.5px;color:var(--text-secondary)">Arrivals:
      <select id="m05-preset" class="ss-btn" style="margin-left:6px">
        <option value="steady">Steady</option><option value="bursty">Bursty (backlog)</option>
      </select></label>
    <label style="font-size:12.5px;color:var(--text-secondary)">Trigger:
      <select id="m05-trig" class="ss-btn" style="margin-left:6px">
        <option value="processingTime">processingTime(interval)</option>
        <option value="availableNow">availableNow</option>
        <option value="once">once</option>
      </select></label>
    <label id="m05-ivl-wrap" style="font-size:12.5px;color:var(--text-secondary)">Interval:
      <input type="range" id="m05-ivl" min="2" max="10" step="1" value="4" style="vertical-align:middle">
      <span id="m05-ivl-v" style="font-family:var(--font-mono)">4</span></label>
    <label id="m05-cap-wrap" style="font-size:12.5px;color:var(--text-secondary);display:none">Max/batch:
      <input type="range" id="m05-cap" min="1" max="8" step="1" value="3" style="vertical-align:middle">
      <span id="m05-cap-v" style="font-family:var(--font-mono)">3</span></label>
  </div>
  <div class="ss-canvas-wrap"><canvas id="m05-canvas" width="720" height="240"></canvas></div>
  <div class="ss-metrics">
    <div class="ss-metric"><div class="k"># batches planned</div><div class="v" id="m05-nb">—</div></div>
    <div class="ss-metric"><div class="k">Largest batch</div><div class="v" id="m05-mx">—</div></div>
  </div>
  <div class="ss-callout" id="m05-why">—</div>`;

  const story = `
  <div class="ss-prose">
    <h3>Three ShopStream jobs, three triggers</h3>
    <p>ShopStream runs the <b>same codebase</b> with different triggers per use case:</p>
    <ul>
      <li><b>Live revenue dashboard</b> → <code>processingTime="10 seconds"</code>. Predictable 10s refresh; <code>maxOffsetsPerTrigger=2.5M</code> keeps each batch under the interval even at Black Friday peak.</li>
      <li><b>Fraud scoring</b> → <b>default trigger</b> (no interval). Back-to-back batches for the lowest possible latency on suspicious orders.</li>
      <li><b>Nightly feature export to the lakehouse</b> → <b>availableNow</b>, launched by the scheduler at 2am. Drains the day's accumulated orders across bounded batches, updates the checkpoint, and exits — no 24/7 cluster bill.</li>
    </ul>
    <div class="ss-callout">When the fraud job once fell behind, the fix wasn't a new trigger — it was <b>more shuffle partitions + a rate limit</b> so <code>batchDuration</code> dropped back under the interval. The trigger controls cadence; keeping up is a capacity problem.</div>
  </div>`;

  const code = `
  <div class="ss-prose"><p>Setting the trigger is one call on <code>writeStream</code>:</p></div>
  ${codeBlock('PySpark', `# Fixed cadence — live dashboard
(revenue.writeStream.outputMode("update").format("delta")
    .option("checkpointLocation", "s3://shopstream/chk/revenue")
    .trigger(processingTime="10 seconds")
    .start())

# Back-to-back — lowest latency fraud scoring
(scored.writeStream.format("kafka")
    .option("checkpointLocation", "s3://shopstream/chk/fraud")
    .start())   # no .trigger() => default: next batch as soon as the last finishes

# Incremental batch — nightly export, run by a scheduler, then exits
(features.writeStream.format("delta")
    .option("checkpointLocation", "s3://shopstream/chk/features")
    .trigger(availableNow=True)
    .start().awaitTermination())`)}
  ${codeBlock('Scala', `import org.apache.spark.sql.streaming.Trigger

revenue.writeStream.outputMode("update").format("delta")
  .option("checkpointLocation", "s3://shopstream/chk/revenue")
  .trigger(Trigger.ProcessingTime("10 seconds"))
  .start()

features.writeStream.format("delta")
  .option("checkpointLocation", "s3://shopstream/chk/features")
  .trigger(Trigger.AvailableNow())   // many bounded batches, then stop
  .start().awaitTermination()`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M05 · Architecture',
    title: 'Micro-Batch & Triggers',
    subtitle: 'How the driver decides when a batch runs — and how arrivals split into batches',
    definition: {
      formal: 'A trigger determines when the driver initiates each micro-batch: processingTime fires on a fixed interval (idling if a batch finishes early), the default trigger runs batches back-to-back, availableNow drains all available data across multiple rate-limited batches then stops, and once (deprecated) does so in a single batch. Each triggered batch executes the offset-log → process → commit-log → watermark lifecycle, and must complete within the trigger interval or lag accumulates unbounded.',
      easy: 'The trigger is how often Spark wakes up to process a new chunk of data. Set it to a fixed interval for a steady refresh, leave it off for fastest-possible, or use availableNow to drain everything once and stop (great for a nightly job). The golden rule: each chunk must finish before the next is due, or you fall behind forever.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '⏭️ Trigger Planner', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const canvas = container.querySelector('#m05-canvas');
  const presetSel = container.querySelector('#m05-preset');
  const trigSel = container.querySelector('#m05-trig');
  const ivl = container.querySelector('#m05-ivl'), ivlV = container.querySelector('#m05-ivl-v');
  const cap = container.querySelector('#m05-cap'), capV = container.querySelector('#m05-cap-v');
  const ivlWrap = container.querySelector('#m05-ivl-wrap'), capWrap = container.querySelector('#m05-cap-wrap');
  const nbEl = container.querySelector('#m05-nb'), mxEl = container.querySelector('#m05-mx');
  const whyEl = container.querySelector('#m05-why');

  function render() {
    const recs = PRESETS[presetSel.value].recs;
    const type = trigSel.value;
    ivlWrap.style.display = type === 'processingTime' ? '' : 'none';
    capWrap.style.display = type === 'availableNow' ? '' : 'none';
    ivlV.textContent = ivl.value; capV.textContent = cap.value;

    let trigger, why;
    if (type === 'processingTime') {
      trigger = { type: 'processingTime', interval: +ivl.value };
      why = `<b>processingTime(interval=${ivl.value})</b> — the engine buckets arrivals into fixed <code>${ivl.value}</code>-wide windows of arrival time; each non-empty bucket is one batch. Bigger interval → fewer, larger batches (more latency, less overhead).`;
    } else if (type === 'availableNow') {
      trigger = { type: 'availableNow', maxEventsPerBatch: +cap.value };
      why = `<b>availableNow(max/batch=${cap.value})</b> — all available data is drained now, but split into bounded batches of ≤ <code>${cap.value}</code> records each, then the query stops. This is how a backlog is caught up safely.`;
    } else {
      trigger = { type: 'once' };
      why = `<b>once</b> — <i>all</i> available data goes into a <b>single</b> batch, ignoring any rate limit, then the query stops. One huge batch is exactly the risk <code>availableNow</code> was built to remove.`;
    }

    const batches = planBatches(recs, trigger).filter((b) => b.length);
    drawPlan(canvas, recs, batches);
    nbEl.textContent = batches.length;
    mxEl.textContent = Math.max(0, ...batches.map((b) => b.length));
    whyEl.innerHTML = why;
  }

  [presetSel, trigSel, ivl, cap].forEach((el) => el.addEventListener('input', render));
  render();
}

export default { mount };
