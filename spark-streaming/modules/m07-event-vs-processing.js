// M07 · Event vs Processing Time — Time & Windows
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock } from './_mod-ui.js';

const IQ = [
  { q: 'Define event time, processing time, and ingestion time.', a: '<p><b>Event time</b> — when the event <i>actually happened</i> at the source (embedded in the payload, e.g. an order\'s <code>ts</code>). <b>Processing time</b> — when Spark <i>processes</i> the record (wall clock on the executor). <b>Ingestion time</b> — when the record <i>entered</i> the system (e.g. Kafka\'s broker timestamp). Correct streaming analytics use <b>event time</b>, because only it reflects reality regardless of delays, retries, or replays.</p>', tip: 'Three clocks. Event time = reality; processing time = when Spark sees it; ingestion = when it hit Kafka. Analytics use event time.' },
  { q: 'Why is event time the right clock for windowed aggregations?', a: '<p>Because results must be <b>deterministic and correct regardless of when data arrives</b>. If you window by processing time, a replay, a backlog catch-up, or a slow network would put the <i>same</i> event in a <i>different</i> window each run — non-reproducible and wrong. Event-time windowing puts an event in the window of <i>when it happened</i>, so re-running the pipeline over the same data gives the same answer every time.</p>', tip: 'Event time → deterministic, replay-safe, correct. Processing time → results depend on arrival timing. Determinism is the key word.' },
  { q: 'What causes the skew between event time and processing time?', a: '<p>Network latency, mobile devices buffering offline then syncing, producer retries, Kafka consumer lag, backpressure/rate limits, GC pauses, and <b>replay/backfill</b> (reprocessing old data now). Skew is normal and variable — it\'s exactly why you need <b>watermarks</b> (M08): to decide how long to wait for late events before finalizing a window.</p>', tip: 'Many causes: network, offline devices, retries, lag, replay. Skew is normal → watermarks exist to bound the wait.' },
  { q: 'What is "out-of-order" data and why does it matter?', a: '<p>Events don\'t arrive in event-time order: an event with <code>t=10</code> may arrive <i>after</i> one with <code>t=12</code> (a phone was offline, say). It matters because a naive "window by arrival order" would misplace them. Event-time processing + windows handle out-of-order data correctly by <b>bucketing on the embedded timestamp</b>; the watermark decides how long to keep a window open for stragglers.</p>', tip: 'Out-of-order = arrival order ≠ event-time order. Event-time windows + watermark handle it; processing-time windows can\'t.' },
  { q: 'How do you tell Spark which column is the event time?', a: '<p>You don\'t set a global "event time" — you pass a <b>timestamp column</b> into <code>window(...)</code> and into <code>withWatermark("ts", "...")</code>. That column must be a true <code>TimestampType</code> (often parsed from the payload, e.g. <code>to_timestamp(col("ts")/1000)</code>). Spark then windows and watermarks on that column. Different operators can even use different time columns.</p>', tip: 'Pass the timestamp column to window() and withWatermark(). It must be a real TimestampType from the payload.' },
  { q: 'Kafka gives a timestamp column — can you just use that as event time?', a: '<p>Only if it genuinely equals your business event time. Kafka\'s <code>timestamp</code> is the <b>broker/producer append time</b>, which can differ from when the event happened (producer buffering, retries, clock settings, <code>CreateTime</code> vs <code>LogAppendTime</code>). For correctness, prefer the <b>event time embedded in the payload</b>. Use Kafka\'s timestamp only when you\'ve confirmed it reflects reality.</p>', tip: 'Kafka timestamp ≈ ingestion time, not necessarily event time. Default to the payload\'s own timestamp.' },
  { q: 'What happens to windowing if you accidentally use processing time?', a: '<p>Windows become <b>non-deterministic</b>: a backfill of yesterday\'s data would all land in <i>today\'s</i> processing-time windows; a lag spike would shift events into later windows; re-running gives different numbers. You also lose the ability to reason about <b>late data / watermarks</b>. It "works" in demos where arrival ≈ event time, then breaks in production during any delay or replay.</p>', tip: 'Processing-time windows = demo-only. They break under backfill, lag, and replay — the exact situations production hits.' },
  { q: 'When is processing time actually the right choice?', a: '<p>When you genuinely care about <b>system behavior now</b>, not business-event timing: e.g. "requests processed per minute by this cluster," health/throughput metrics, or rate monitoring where the clock <i>is</i> the processing clock. For anything describing the real world (revenue per hour, sessions, user behavior), use event time.</p>', tip: 'Processing time is right for system/throughput metrics ("what is the cluster doing now"), not business analytics.' },
  { q: 'How does event-time skew relate to watermarks and state size?', a: '<p>The watermark = <code>max(eventTime) − delay</code>; <b>delay must cover your typical skew</b> or you\'ll drop too much. But a larger delay means windows stay open longer → <b>more state retained</b> → higher memory. So skew directly sets the latency/completeness/state-size trade-off you tune with the watermark delay (M08, M10, M20).</p>', tip: 'Skew sizes the watermark delay; delay sizes state and latency. It\'s the central trade-off triangle.' },
  { q: 'Does Structured Streaming reorder data to event-time order?', a: '<p>No — it never buffers the whole stream to sort it (that\'d be unbounded). Instead it processes records as they arrive but <b>assigns each to its event-time window by timestamp</b>, keeping window state until the watermark says it\'s safe to finalize. So order of arrival doesn\'t matter for the <i>result</i>, only for <i>when</i> a window can close.</p>', tip: 'No global sort (unbounded). Records go straight into their event-time window; the watermark governs finalization, not ordering.' },
];

// Scatter: x = event time, y = arrival/processing time. Diagonal = "on time".
// Points above the diagonal arrived later than they happened (skew/lateness).
const SCENARIOS = {
  mild: { label: 'Mild skew', pts: [[1,1.3],[2,2.1],[3,3.6],[4,4.2],[5,5.8],[6,6.3],[7,7.9],[8,8.4]] },
  offline: { label: 'Offline device', pts: [[1,1.2],[2,2.1],[3,3.2],[4,8.5],[5,8.7],[6,6.3],[7,7.4],[8,8.6]] },
  backfill: { label: 'Backfill / replay', pts: [[1,9.0],[2,9.1],[3,9.2],[4,9.3],[5,9.4],[6,9.5],[7,9.6],[8,9.7]] },
};

function drawSkew(canvas, pts) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);
  const pad = 54, max = 10;
  const PX = (t) => pad + (t / max) * (W - pad * 2);
  const PY = (t) => (H - pad) - (t / max) * (H - pad * 2);

  // grid
  ctx.strokeStyle = 'rgba(148,163,184,0.12)'; ctx.lineWidth = 1;
  ctx.font = '10px ui-monospace,monospace'; ctx.fillStyle = 'rgba(148,163,184,0.7)'; ctx.textAlign = 'center';
  for (let t = 0; t <= max; t += 2) {
    ctx.beginPath(); ctx.moveTo(PX(t), PY(0)); ctx.lineTo(PX(t), PY(max)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PX(0), PY(t)); ctx.lineTo(PX(max), PY(t)); ctx.stroke();
    ctx.fillText('t' + t, PX(t), PY(0) + 16);
    ctx.textAlign = 'right'; ctx.fillText('t' + t, PX(0) - 8, PY(t) + 3); ctx.textAlign = 'center';
  }
  // axes labels
  ctx.fillStyle = '#06B6D4'; ctx.font = 'bold 11px ui-monospace,monospace';
  ctx.fillText('event time →', (PX(0) + PX(max)) / 2, H - 14);
  ctx.save(); ctx.translate(16, (PY(0) + PY(max)) / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#F59E0B'; ctx.fillText('processing time →', 0, 0); ctx.restore();

  // on-time diagonal (arrival == event)
  ctx.strokeStyle = 'rgba(16,185,129,0.55)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(PX(0), PY(0)); ctx.lineTo(PX(max), PY(max)); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(16,185,129,0.8)'; ctx.textAlign = 'left'; ctx.font = '10px ui-monospace,monospace';
  ctx.fillText('on-time (arrival = event)', PX(5.4), PY(6.1));

  // points
  pts.forEach(([ev, pr]) => {
    const skew = pr - ev;
    const col = skew <= 0.5 ? '#10B981' : skew <= 2 ? '#F59E0B' : '#EF4444';
    // vertical skew line
    ctx.strokeStyle = col + '66'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PX(ev), PY(ev)); ctx.lineTo(PX(ev), PY(pr)); ctx.stroke();
    ctx.beginPath(); ctx.arc(PX(ev), PY(pr), 6, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#0A0E1A'; ctx.lineWidth = 2; ctx.stroke();
  });
  ctx.textAlign = 'left';
}

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p>Every streaming record carries <b>two clocks</b>, and confusing them is the single most common streaming bug.</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>🕐 Event time</h4><p>When it <b>actually happened</b> at the source — embedded in the payload (an order's <code>ts</code>). Reflects reality no matter what delays occur. <b>Use this for analytics.</b></p></div>
      <div class="ss-card"><h4>⚙️ Processing time</h4><p>When <b>Spark processes</b> the record — wall clock on the executor. Shifts with lag, replays, and backfills.</p></div>
      <div class="ss-card"><h4>📨 Ingestion time</h4><p>When it <b>entered the system</b> — e.g. Kafka's broker timestamp. Between the other two; not your business event time.</p></div>
      <div class="ss-card"><h4>↔️ Skew</h4><p>processing − event. Caused by network, offline devices, retries, lag, replay. Variable and normal — watermarks bound it (M08).</p></div>
    </div>
    <h3>Why event time wins</h3>
    <p>Window by <b>event time</b> and the result is <b>deterministic</b>: re-run the pipeline over the same data — after a crash, a backfill, a replay — and every event lands in the same window, so you get the same numbers. Window by <b>processing time</b> and a backfill of yesterday's orders would all pile into <i>today's</i> windows; a lag spike would shift events later. It "works" in demos (where arrival ≈ event) and breaks in production.</p>
    <div class="ss-callout"><b>Spark doesn't reorder the stream</b> (that would need unbounded buffering). It drops each record straight into its event-time window by timestamp and keeps the window's state open until the <b>watermark</b> says stragglers won't come — so arrival order affects <i>when a window closes</i>, never the <i>result</i>.</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>Each dot is an event: <b>x = when it happened</b> (event time), <b>y = when Spark saw it</b> (processing time). On the green diagonal = on time; above it = skewed/late. Switch scenarios to see why processing-time windowing is unsafe.</p></div>
  <div class="ss-controls" id="m07-btns">
    ${Object.entries(SCENARIOS).map(([k, s], i) => `<button class="ss-btn${i === 0 ? ' primary' : ''}" data-sc="${k}">${s.label}</button>`).join('')}
  </div>
  <div class="ss-canvas-wrap"><canvas id="m07-canvas" width="720" height="300"></canvas></div>
  <div class="ss-metrics">
    <div class="ss-metric"><div class="k">Max skew</div><div class="v" id="m07-skew">—</div></div>
    <div class="ss-metric"><div class="k">Out-of-order?</div><div class="v" id="m07-ooo" style="font-size:14px">—</div></div>
  </div>
  <div class="ss-callout" id="m07-why">—</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream's two clocks</h3>
    <p>A ShopStream shopper adds items to a cart on the train, loses signal in a tunnel, and the app buffers the events. Ten minutes later signal returns and the <b>whole batch floods in at once</b>. Those events <i>happened</i> at 09:02 (event time) but Spark <i>sees</i> them at 09:12 (processing time) — a 10-minute skew.</p>
    <p>ShopStream's "revenue per 5-minute window" must bill that order to the <b>09:00–09:05</b> window (when it happened), not 09:10–09:15. Because the pipeline windows on the payload's event time, it does — and when the data team later <b>backfills</b> a day of orders to fix a bug, every order still lands in its correct historical window and the totals match exactly.</p>
    <div class="ss-callout">The one place ShopStream uses <b>processing time</b>: the ops dashboard's "orders ingested per minute by the cluster" — that metric is genuinely about what the system is doing right now, not when orders happened.</div>
  </div>`;

  const code = `
  <div class="ss-prose"><p>Parse event time from the payload, then window on it — never on arrival:</p></div>
  ${codeBlock('PySpark', `from pyspark.sql.functions import from_json, col, to_timestamp, window, sum as _sum

orders = (raw.select(from_json(col("value").cast("string"), order_schema).alias("o"))
    .select("o.*")
    # event time comes from the PAYLOAD, not kafka's 'timestamp' column:
    .withColumn("event_time", to_timestamp(col("ts") / 1000)))

revenue = (orders
    .withWatermark("event_time", "10 minutes")      # tolerate 10-min skew (M08)
    .groupBy(window(col("event_time"), "5 minutes"), col("category"))
    .agg(_sum("amount").alias("revenue")))
# an order that HAPPENED at 09:02 but ARRIVES at 09:12 still lands in 09:00-09:05`)}
  ${codeBlock('Scala', `val orders = raw
  .select(from_json($"value".cast("string"), orderSchema).as("o")).select("o.*")
  .withColumn("event_time", to_timestamp($"ts" / 1000))

val revenue = orders
  .withWatermark("event_time", "10 minutes")
  .groupBy(window($"event_time", "5 minutes"), $"category")
  .agg(sum($"amount").as("revenue"))`)}
  ${codeBlock('Anti-pattern (do NOT do this)', `# Windowing on current_timestamp() = PROCESSING time.
# A backfill or lag spike silently reassigns events to the wrong windows.
orders.groupBy(window(current_timestamp(), "5 minutes")).count()  # non-deterministic`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M07 · Time & Windows',
    title: 'Event vs Processing Time',
    subtitle: 'The two clocks every record carries — and why analytics must use event time',
    definition: {
      formal: 'Event time is the timestamp at which an event occurred at its source (carried in the record); processing time is the wall-clock time at which the engine processes it; ingestion time is when it entered the system. Structured Streaming performs windowing and watermarking on a designated event-time column, assigning each record to the window of when it occurred regardless of arrival order, yielding deterministic, replay-safe results.',
      easy: 'Each event has two times: when it really happened (event time) and when Spark got around to it (processing time). Phones go offline, networks lag, and data gets replayed — so these two drift apart. For anything about the real world (revenue, sessions), you must group by when things happened, or a backfill or a slow network will file events under the wrong time.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '⏱️ Two-Clock Skew', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const canvas = container.querySelector('#m07-canvas');
  const skewEl = container.querySelector('#m07-skew');
  const oooEl = container.querySelector('#m07-ooo');
  const whyEl = container.querySelector('#m07-why');

  const WHY = {
    mild: 'Small, steady skew — arrivals lag events by under a second or two. Event-time windows place each order correctly; a tiny watermark delay covers the stragglers.',
    offline: 'A device went offline at <b>t4</b> and flushed much later. Event-time windowing still files t4 in <i>its own</i> window; processing-time windowing would wrongly dump it into a much later window.',
    backfill: 'A <b>replay/backfill</b>: old events (t1–t8) are all reprocessed <i>now</i>. Event time keeps every order in its true historical window so totals match the original run; processing time would collapse them all into one current window — totally wrong.',
  };

  function selectSc(k) {
    const pts = SCENARIOS[k].pts;
    drawSkew(canvas, pts);
    const skews = pts.map(([e, p]) => p - e);
    skewEl.textContent = Math.max(...skews).toFixed(1) + 't';
    const ooo = pts.some(([, p], i) => i > 0 && p < pts[i - 1][1]);
    oooEl.textContent = ooo ? 'Yes — out of order' : 'No';
    oooEl.style.color = ooo ? 'var(--yellow,#F59E0B)' : 'var(--green,#10B981)';
    whyEl.innerHTML = WHY[k];
    container.querySelectorAll('#m07-btns .ss-btn').forEach((b) => b.classList.toggle('primary', b.dataset.sc === k));
  }
  container.querySelector('#m07-btns').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sc]'); if (b) selectSc(b.dataset.sc);
  });
  selectSc('mild');
}

export default { mount };
