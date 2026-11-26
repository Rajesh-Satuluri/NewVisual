// M09 · Windows — Time & Windows  (engine-driven: assign* + MicroBatchQuery)
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock } from './_mod-ui.js';
import { assignTumbling, assignSliding, MicroBatchQuery } from '../sim/microbatch-engine.js';

export const IQ = [
  { q: 'What are the three window types and how do they differ?', a: '<p><b>Tumbling</b> — fixed-size, <b>non-overlapping</b>, contiguous; each event is in <b>exactly one</b> window (e.g. revenue per 5 min). <b>Sliding</b> — fixed <b>size</b> with a smaller <b>slide</b>; windows <b>overlap</b>, so an event can be in <b>multiple</b> windows (e.g. a 10-min moving average updated every 1 min). <b>Session</b> — <b>dynamic</b> windows that group events separated by less than a <b>gap</b>; length depends on activity (e.g. a user\'s browsing session that ends after 30 min idle).</p>', tip: 'Tumbling = 1 window/event, no overlap. Sliding = overlap, N windows/event. Session = gap-defined, dynamic length.' },
  { q: 'What is the interval convention for windows?', a: '<p><b>[start, end)</b> — start <b>inclusive</b>, end <b>exclusive</b>. An event at exactly the boundary <code>t = end</code> belongs to the <i>next</i> window, not the one ending there. A tumbling window of size 5 covers <code>[0,5)</code>, <code>[5,10)</code>, … so <code>t=5</code> is in <code>[5,10)</code>. This end-exclusivity prevents double-counting boundary events.</p>', tip: '[start, end) — end-exclusive. t at the boundary goes to the NEXT window. Prevents boundary double-count.' },
  { q: 'For a sliding window, how many windows does one event belong to?', a: '<p><code>⌈size / slide⌉</code> windows (fewer at the stream\'s very start). A 10-min window sliding every 2 min → each event is in <b>5</b> windows. This is why sliding windows cost more <b>state and compute</b>: every record fans out into multiple windows. If <code>slide ≥ size</code> you get gaps (some events in zero windows) — usually a misconfiguration.</p>', tip: '⌈size/slide⌉ windows per event. Smaller slide → more overlap → more state. slide ≥ size leaves gaps.' },
  { q: 'How is a session window defined and when does it close?', a: '<p>A session is a <b>maximal run of events</b> where each consecutive pair is within the <b>gap timeout</b>. A new event within <code>gap</code> of the session <b>extends</b> it; a quiet period longer than <code>gap</code> <b>closes</b> it. Two sessions <b>merge</b> if a bridging event arrives between them. The window end is effectively <code>lastEventTime + gap</code>, finalized when the watermark passes it — so session length is data-driven, not fixed.</p>', tip: 'Gap-timeout runs; extend within gap, close after gap, merge on a bridging event. End = lastEvent + gap.' },
  { q: 'Give a real use case for each window type.', a: '<p><b>Tumbling</b>: "revenue per hour", "orders per 5-min bucket" — clean non-overlapping reporting buckets. <b>Sliding</b>: "10-minute moving average refreshed every minute", fraud "X events in any rolling 5-min span". <b>Session</b>: "user browsing sessions", "group clicks until 30-min inactivity", device connection sessions. Choose by whether you need fixed buckets, rolling metrics, or activity-bounded grouping.</p>', tip: 'Tumbling = fixed reports; Sliding = rolling/moving metrics; Session = activity/behavior grouping.' },
  { q: 'Why do sliding and session windows need careful state management?', a: '<p><b>Sliding</b>: each event fans into multiple overlapping windows → state grows ∝ overlap factor. <b>Session</b>: sessions can grow and <b>merge</b>, and you don\'t know the final size ahead of time → variable, potentially large per-key state. Both lean heavily on the <b>watermark</b> to evict closed windows/sessions; without a tight-enough delay, state balloons (M10, M20).</p>', tip: 'Sliding fans out; sessions merge/grow. Both need the watermark to evict, or state balloons.' },
  { q: 'Can you combine a window with a groupBy key?', a: '<p>Yes — <code>groupBy(window(...), col("category"))</code> aggregates per (window, key) pair. State is then keyed by <b>window × key</b>, so cardinality is windows × distinct keys — a major driver of state size. This is the standard shape: "revenue per 5-min window <b>per category</b>".</p>', tip: 'groupBy(window, key) → state keyed by window×key. Cardinality = #windows × #keys; watch it for state size.' },
  { q: 'How does Spark express a tumbling window in the API?', a: '<p><code>window(eventTimeCol, "5 minutes")</code> — a single duration = tumbling. <b>Sliding</b> adds a slide: <code>window(col, "10 minutes", "1 minute")</code> (size, then slide). <b>Session</b>: <code>session_window(col, "30 minutes")</code> (gap). The <code>window</code> column it produces is a struct with <code>.start</code> and <code>.end</code>.</p>', tip: 'window(col,"5 min")=tumbling; window(col,"10 min","1 min")=sliding; session_window(col,"30 min")=session.' },
  { q: 'What happens to a window with no events?', a: '<p>Nothing is emitted — Spark only materializes windows that <b>contain data</b>. There are no "empty window" rows; a gap in event time simply produces no window. (This is unlike some batch tooling that fills empty buckets. If you need zero-filled buckets you join against a generated calendar of windows downstream.)</p>', tip: 'No data → no window row. Spark never emits empty windows; zero-fill downstream if you need it.' },
  { q: 'Tumbling vs sliding — what\'s the cost trade-off?', a: '<p>Tumbling is <b>cheapest</b>: one window per event, minimal state, clean buckets — but coarse (you only learn results at bucket boundaries). Sliding gives <b>smoother, more frequent</b> rolling results but multiplies state and compute by the overlap factor <code>⌈size/slide⌉</code>. Use the largest slide that still meets your freshness requirement.</p>', tip: 'Tumbling = cheap but coarse. Sliding = smooth but costs ⌈size/slide⌉×. Pick the largest acceptable slide.' },
];

const PALETTE = ['#06B6D4', '#F59E0B', '#8B5CF6', '#10B981', '#EC4899', '#3B82F6', '#EF4444', '#14B8A6', '#A855F7'];
const EVENTS = [1, 2, 4, 7, 8, 12, 13, 18].map((t, i) => ({ id: 'e' + i, eventTime: t, value: 1 }));

function windowsFor(cfg) {
  // Returns array of { start, end, members:[eventId...] } for the current config.
  const map = new Map(); // key start|end -> members
  if (cfg.type === 'session') {
    // simulate session windows via the engine's grouping (single key, complete-ish read of state)
    const q = new MicroBatchQuery({ window: { type: 'session', gap: cfg.gap }, outputMode: 'update', aggregate: { fn: 'count' } });
    q.run([EVENTS]); // one batch; read retained + emitted via final state
    // reconstruct membership by scanning sessions in final state
    const rows = q.stateRows();
    rows.forEach((r) => {
      const members = EVENTS.filter((e) => e.eventTime >= r.window.start && e.eventTime < r.window.end).map((e) => e.id);
      map.set(r.window.start + '|' + r.window.end, { start: r.window.start, end: r.window.end, members });
    });
  } else {
    EVENTS.forEach((e) => {
      const ws = cfg.type === 'tumbling' ? assignTumbling(e.eventTime, cfg.size) : assignSliding(e.eventTime, cfg.size, cfg.slide);
      ws.forEach((w) => {
        const k = w.start + '|' + w.end;
        if (!map.has(k)) map.set(k, { start: w.start, end: w.end, members: [] });
        map.get(k).members.push(e.id);
      });
    });
  }
  return [...map.values()].sort((a, b) => a.start - b.start || a.end - b.end);
}

function drawWindows(canvas, cfg, windows) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);
  const pad = 40, evY = 56;
  const tMax = Math.max(...windows.map((w) => w.end), ...EVENTS.map((e) => e.eventTime)) + 1;
  const X = (t) => pad + (t / tMax) * (W - pad * 2);

  // time ticks
  ctx.strokeStyle = 'rgba(148,163,184,0.1)'; ctx.fillStyle = 'rgba(148,163,184,0.6)';
  ctx.font = '10px ui-monospace,monospace'; ctx.textAlign = 'center';
  for (let t = 0; t <= tMax; t += 2) {
    ctx.beginPath(); ctx.moveTo(X(t), evY - 18); ctx.lineTo(X(t), H - 26); ctx.stroke();
    ctx.fillText('t' + t, X(t), H - 10);
  }

  // window bands stacked in rows
  const rowH = 26, baseY = evY + 24;
  windows.forEach((w, i) => {
    const col = PALETTE[i % PALETTE.length];
    const y = baseY + (i % 6) * (rowH + 4);
    const x0 = X(w.start), x1 = X(w.end);
    ctx.fillStyle = col + '2a'; ctx.strokeStyle = col + 'bb'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(x0, y, Math.max(x1 - x0, 6), rowH, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.font = '9px ui-monospace,monospace'; ctx.textAlign = 'left';
    ctx.fillText(`[${w.start},${w.end}) ×${w.members.length}`, x0 + 4, y + 16);
  });

  // events on top
  EVENTS.forEach((e) => {
    ctx.beginPath(); ctx.arc(X(e.eventTime), evY, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#E2E8F0'; ctx.fill(); ctx.strokeStyle = '#0A0E1A'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(226,232,240,0.9)'; ctx.font = '9px ui-monospace,monospace'; ctx.textAlign = 'center';
    ctx.fillText(e.id, X(e.eventTime), evY - 12);
  });
  ctx.textAlign = 'left';
}

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p>A <b>window</b> groups events by their event time into buckets you aggregate over. Three shapes, each a different answer to "how do I slice time?"</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>🟦 Tumbling</h4><p>Fixed size, <b>no overlap</b>, contiguous. Each event in <b>exactly one</b> window. "Revenue per 5 minutes." Cheapest.</p></div>
      <div class="ss-card"><h4>🟨 Sliding</h4><p>Fixed <b>size</b> + smaller <b>slide</b> → <b>overlapping</b> windows. Each event in <code>⌈size/slide⌉</code> windows. "10-min moving average every minute." Costs more state.</p></div>
      <div class="ss-card"><h4>🟪 Session</h4><p><b>Dynamic</b> windows closed by a <b>gap</b> of inactivity; adjacent events merge. "A user's browse session, ending after 30 min idle." Variable size.</p></div>
      <div class="ss-card"><h4>📐 [start, end)</h4><p>Start inclusive, <b>end exclusive</b>. A boundary event <code>t=end</code> belongs to the <i>next</i> window — no double-counting.</p></div>
    </div>
    <h3>State cost scales with window shape</h3>
    <p>Combine a window with a key — <code>groupBy(window(...), "category")</code> — and state is keyed by <b>window × key</b>. Sliding multiplies that by the overlap factor; sessions grow and merge unpredictably. All three rely on the <b>watermark</b> (M08) to evict finished windows — without it, state grows forever.</p>
    <div class="ss-callout"><b>Empty windows don't exist:</b> Spark only emits windows that actually contain data. If you need zero-filled buckets, join against a generated calendar downstream.</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>The same 8 ShopStream events, re-bucketed by the <b>real E1 engine</b>. Each colored band is a window the engine produces — note how sliding fans one event into several, and sessions grow/merge around gaps.</p></div>
  <div class="ss-controls">
    <label style="font-size:12.5px;color:var(--text-secondary)">Type:
      <select id="m09-type" class="ss-btn" style="margin-left:6px">
        <option value="tumbling">Tumbling</option><option value="sliding">Sliding</option><option value="session">Session</option>
      </select></label>
    <label id="m09-size-wrap" style="font-size:12.5px;color:var(--text-secondary)">Size:
      <input type="range" id="m09-size" min="2" max="8" step="1" value="5" style="vertical-align:middle">
      <span id="m09-size-v" style="font-family:var(--font-mono)">5</span></label>
    <label id="m09-slide-wrap" style="font-size:12.5px;color:var(--text-secondary);display:none">Slide:
      <input type="range" id="m09-slide" min="1" max="6" step="1" value="2" style="vertical-align:middle">
      <span id="m09-slide-v" style="font-family:var(--font-mono)">2</span></label>
    <label id="m09-gap-wrap" style="font-size:12.5px;color:var(--text-secondary);display:none">Gap:
      <input type="range" id="m09-gap" min="1" max="6" step="1" value="3" style="vertical-align:middle">
      <span id="m09-gap-v" style="font-family:var(--font-mono)">3</span></label>
  </div>
  <div class="ss-canvas-wrap"><canvas id="m09-canvas" width="720" height="260"></canvas></div>
  <div class="ss-metrics">
    <div class="ss-metric"><div class="k"># windows</div><div class="v" id="m09-nw">—</div></div>
    <div class="ss-metric"><div class="k">Windows per event (max)</div><div class="v" id="m09-fan">—</div></div>
  </div>
  <div class="ss-callout" id="m09-why">—</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream uses all three</h3>
    <ul>
      <li><b>Tumbling</b> — the finance dashboard: <code>revenue per 1-hour window per category</code>. Clean, non-overlapping buckets that reconcile exactly with daily totals.</li>
      <li><b>Sliding</b> — fraud detection: <code>count of orders per card in any rolling 5-minute window, updated every minute</code>. Overlap catches a burst that straddles a fixed boundary, which tumbling would split and miss.</li>
      <li><b>Session</b> — product analytics: a shopper's <b>browsing session</b> groups all clicks until <b>30 minutes</b> of inactivity, so "pages per session" and "session → purchase rate" reflect real visits, however long.</li>
    </ul>
    <div class="ss-callout">The fraud team deliberately chose <b>sliding over tumbling</b>: an attacker placing 10 orders at 10:04–10:06 would split 5/5 across two tumbling 5-min buckets and trip no threshold — but a rolling window sees all 10 together and fires the alert.</div>
  </div>`;

  const code = `
  ${codeBlock('PySpark', `from pyspark.sql.functions import window, session_window, sum as _sum, count

# Tumbling — revenue per hour per category
(orders.withWatermark("event_time", "10 minutes")
   .groupBy(window("event_time", "1 hour"), "category")
   .agg(_sum("amount").alias("revenue")))

# Sliding — rolling 5-min order count per card, refreshed each minute
(orders.withWatermark("event_time", "10 minutes")
   .groupBy(window("event_time", "5 minutes", "1 minute"), "card_id")
   .agg(count("*").alias("orders_5m")))

# Session — browsing sessions, 30-min inactivity gap
(clicks.withWatermark("event_time", "30 minutes")
   .groupBy(session_window("event_time", "30 minutes"), "user_id")
   .agg(count("*").alias("page_views")))`)}
  ${codeBlock('Scala', `orders.withWatermark("event_time", "10 minutes")
  .groupBy(window($"event_time", "5 minutes", "1 minute"), $"card_id")
  .agg(count("*").as("orders_5m"))

clicks.withWatermark("event_time", "30 minutes")
  .groupBy(session_window($"event_time", "30 minutes"), $"user_id")
  .agg(count("*").as("page_views"))`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M09 · Time & Windows',
    title: 'Windows',
    subtitle: 'Tumbling, sliding and session — three ways to bucket event time',
    definition: {
      formal: 'A window groups events by event time for aggregation. Tumbling windows are fixed-size, contiguous and non-overlapping (one window per event); sliding windows have a size and a smaller slide, overlapping so each event falls in ⌈size/slide⌉ windows; session windows are dynamic, bounded by a gap of inactivity and merging when bridged. All use the [start, end) half-open convention and rely on the watermark to finalize and evict completed windows.',
      easy: 'A window is a time bucket you add things up over. Tumbling buckets are fixed and side-by-side (revenue each hour). Sliding buckets overlap so you get a smooth rolling number (a 5-minute count updated every minute). Session buckets stretch to fit a burst of activity and end after a quiet gap (one shopping visit). The clever part is which events land in which buckets — this demo shows exactly that.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '🪟 Window Builder', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const canvas = container.querySelector('#m09-canvas');
  const typeSel = container.querySelector('#m09-type');
  const size = container.querySelector('#m09-size'), sizeV = container.querySelector('#m09-size-v');
  const slide = container.querySelector('#m09-slide'), slideV = container.querySelector('#m09-slide-v');
  const gap = container.querySelector('#m09-gap'), gapV = container.querySelector('#m09-gap-v');
  const sizeWrap = container.querySelector('#m09-size-wrap'), slideWrap = container.querySelector('#m09-slide-wrap'), gapWrap = container.querySelector('#m09-gap-wrap');
  const nwEl = container.querySelector('#m09-nw'), fanEl = container.querySelector('#m09-fan'), whyEl = container.querySelector('#m09-why');

  function render() {
    const type = typeSel.value;
    sizeWrap.style.display = type === 'session' ? 'none' : '';
    slideWrap.style.display = type === 'sliding' ? '' : 'none';
    gapWrap.style.display = type === 'session' ? '' : 'none';
    sizeV.textContent = size.value; slideV.textContent = slide.value; gapV.textContent = gap.value;

    let cfg, why;
    if (type === 'tumbling') {
      cfg = { type: 'tumbling', size: +size.value };
      why = `<b>Tumbling(size=${size.value})</b> — contiguous <code>[0,${size.value}), [${size.value},${+size.value*2})…</code> buckets. Every event sits in exactly one; no overlap, smallest state.`;
    } else if (type === 'sliding') {
      cfg = { type: 'sliding', size: +size.value, slide: +slide.value };
      const fan = Math.ceil(+size.value / +slide.value);
      why = `<b>Sliding(size=${size.value}, slide=${slide.value})</b> — windows start every ${slide.value}t and span ${size.value}t, so they overlap and each event lands in up to <b>⌈${size.value}/${slide.value}⌉ = ${fan}</b> windows. More overlap → more state/compute.`;
    } else {
      cfg = { type: 'session', gap: +gap.value };
      why = `<b>Session(gap=${gap.value})</b> — events within ${gap.value}t of each other merge into one session; a quiet stretch longer than ${gap.value}t starts a new one. Window length is driven by the data, not fixed.`;
    }
    const windows = windowsFor(cfg);
    drawWindows(canvas, cfg, windows);
    nwEl.textContent = windows.length;
    const counts = {};
    windows.forEach((w) => w.members.forEach((m) => { counts[m] = (counts[m] || 0) + 1; }));
    fanEl.textContent = Math.max(1, ...Object.values(counts));
    whyEl.innerHTML = why;
  }

  [typeSel, size, slide, gap].forEach((el) => el.addEventListener('input', render));
  render();
}

export default { mount };
