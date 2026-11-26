// M08 · Watermarks — Time & Windows  (engine-driven: MicroBatchQuery)
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock, esc } from './_mod-ui.js';
import { MicroBatchQuery } from '../sim/microbatch-engine.js';

export const IQ = [
  { q: 'What is a watermark in Structured Streaming?', a: '<p>A <b>moving threshold on event time</b> that represents "I believe I have seen all data up to this point." It is computed as <code>watermark = max(event time seen so far) − delay</code> and only ever <b>moves forward</b> (monotonic). Any event with <code>eventTime &lt; watermark</code> is considered <b>too late</b> and is dropped; windows whose end is ≤ the watermark can be <b>finalized and evicted</b> from state.</p>', tip: 'max(eventTime) − delay, monotonic. It does two jobs: drop late data AND finalize/evict closed windows.' },
  { q: 'How exactly is the watermark computed and when does it take effect?', a: '<p>At the <b>end of each micro-batch</b> the driver sets <code>watermark = max(prev_watermark, maxEventTimeObserved − delay)</code> — the <code>max</code> with the previous value guarantees monotonicity even if a batch has only old data. Crucially, the <b>new watermark applies to the NEXT batch</b>: within the batch that first observes a high event time, nothing is dropped yet; the raised threshold filters the following batch.</p>', tip: 'End-of-batch compute, next-batch apply. The one-batch lag is why a brand-new high timestamp never drops its own batch-mates.' },
  { q: 'What does the watermark delay (withWatermark duration) control?', a: '<p>The <b>grace period</b> for late data: how far behind the max event time you keep accepting stragglers. Larger delay → fewer drops, <b>more completeness</b>, but windows stay open longer → <b>more state + higher latency</b>. Smaller delay → faster finalization and less state, but more late events dropped. It\'s the core <b>completeness vs latency vs state-size</b> trade-off; set it to cover your real skew (M07).</p>', tip: 'Delay = grace period. Bigger = more complete but more state/latency. Size it to your observed skew.' },
  { q: 'Why must the watermark be monotonic (never go backwards)?', a: '<p>If it could retreat, a window you already <b>finalized and evicted</b> might need to reopen — but its state is gone, so results would be wrong or non-deterministic. Monotonicity guarantees "once closed, stays closed." That\'s why the formula takes <code>max(prev, maxEventTime − delay)</code>: a batch full of old data cannot drag the threshold backward.</p>', tip: 'Monotonic = "once a window closes it never reopens." The max(prev, …) term enforces it.' },
  { q: 'Walk through what happens to a late event.', a: '<p>When a batch arrives, each record is checked: if <code>eventTime &lt; current watermark</code>, it\'s <b>dropped</b> (not added to any window\'s state) and shows up as a dropped-row metric. If <code>eventTime ≥ watermark</code>, it\'s accepted into its event-time window. So a straggler within the grace period still updates its (correct, historical) window; one beyond the grace period is silently discarded.</p>', tip: 'eventTime < watermark → dropped before state. Within grace → still updates its true window. The check is strict <.' },
  { q: 'With multiple input streams, what is the global watermark?', a: '<p>The <b>minimum</b> of the per-stream watermarks. Spark can only safely finalize a window once <b>every</b> input has passed it — a fast stream can\'t be allowed to evict state a slow stream might still contribute to. So one lagging source holds the whole query\'s watermark back (a common cause of "my windows never finalize").</p>', tip: 'Multi-stream watermark = MIN across streams. One slow source stalls finalization for everyone.' },
  { q: 'What is the relationship between watermark and output mode?', a: '<p><b>Append</b> emits a window <b>only once, when it closes</b> (window end ≤ watermark), then evicts — so append <b>requires</b> a watermark for aggregations. <b>Update</b> emits changed rows each batch and uses the watermark to evict closed windows. <b>Complete</b> ignores the watermark entirely — it re-emits all state every batch and <b>never drops or evicts</b>, so state grows unbounded (M12).</p>', tip: 'Append needs the watermark (emit-on-close). Complete ignores it (unbounded state). Update uses it to evict.' },
  { q: 'What goes wrong if the watermark delay is too small? Too large?', a: '<p><b>Too small</b>: legitimate late events are dropped → <b>undercounting</b>, and you may not even notice (drops are silent). <b>Too large</b>: windows and state linger → <b>memory bloat</b>, slower finalization, higher latency, and append results arrive very late. You pick the smallest delay that still captures the vast majority of your real-world skew.</p>', tip: 'Too small → silent undercount. Too large → state bloat + latency. Tune to real skew, erring slightly generous.' },
  { q: 'Does a watermark delay a non-aggregating query (plain filter)?', a: '<p>For purely <b>stateless</b> operations (select/filter/map) a watermark has no windows to close and no state to evict, so it\'s not needed. Watermarks matter for <b>stateful</b> ops: windowed aggregations, stream-stream joins, <code>dropDuplicates</code>, and <code>[flat]MapGroupsWithState</code> — anything that holds state keyed by time and must know when to release it.</p>', tip: 'Stateless ops don\'t need a watermark. It\'s for stateful: windows, joins, dedup, mapGroupsWithState.' },
  { q: 'How do you observe late/dropped data in production?', a: '<p>Via <code>StreamingQueryProgress</code> — the <code>stateOperators</code> section reports <code>numRowsDroppedByWatermark</code> per batch, plus state row counts and memory. Watching that number tells you if your delay is too tight. There is <b>no dead-letter</b> for watermark drops by default; if you need late data, widen the delay, or branch late records off before the watermark with a separate path (M21).</p>', tip: 'numRowsDroppedByWatermark in StreamingQueryProgress. No DLQ by default — widen delay or branch late data manually.' },
];

// Fixed batches of ShopStream orders; some arrive late relative to the advancing
// max event time. Tumbling windows of size 5, count aggregation.
const BATCHES = [
  [{ id: 'a', eventTime: 1 }, { id: 'b', eventTime: 2 }, { id: 'c', eventTime: 4 }],
  [{ id: 'd', eventTime: 6 }, { id: 'e', eventTime: 8 }],            // advances max to 8
  [{ id: 'f', eventTime: 3 }, { id: 'g', eventTime: 9 }, { id: 'h', eventTime: 11 }], // f may be late
  [{ id: 'i', eventTime: 5 }, { id: 'j', eventTime: 13 }],           // i likely late
  [{ id: 'k', eventTime: 14 }, { id: 'l', eventTime: 7 }],           // l likely late
];

function drawWM(canvas, trace, cursor, delay) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);
  const pad = 42, axisY = H - 56;
  const allT = BATCHES.flat().map((r) => r.eventTime);
  const tMax = Math.max(...allT, delay) + 2;
  const X = (t) => pad + (t / tMax) * (W - pad * 2);

  // axis
  ctx.strokeStyle = 'rgba(148,163,184,0.4)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pad, axisY); ctx.lineTo(W - pad, axisY); ctx.stroke();
  ctx.fillStyle = 'rgba(148,163,184,0.7)'; ctx.font = '10px ui-monospace,monospace'; ctx.textAlign = 'center';
  for (let t = 0; t <= tMax; t += 2) {
    ctx.fillText('t' + t, X(t), axisY + 16);
    ctx.strokeStyle = 'rgba(148,163,184,0.1)'; ctx.beginPath(); ctx.moveTo(X(t), 28); ctx.lineTo(X(t), axisY); ctx.stroke();
  }
  ctx.fillStyle = '#06B6D4'; ctx.fillText('event time →', W / 2, H - 14);

  if (cursor < 0) {
    ctx.fillStyle = 'rgba(148,163,184,0.6)'; ctx.font = '12px ui-monospace,monospace';
    ctx.fillText('Press ▶ to process batch 0', W / 2, 60); ctx.textAlign = 'left'; return;
  }
  const e = trace[cursor];

  // watermark line (after this batch)
  const wm = e.watermarkAfter;
  if (wm > Number.NEGATIVE_INFINITY) {
    ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(wm), 28); ctx.lineTo(X(wm), axisY); ctx.stroke();
    ctx.fillStyle = '#EF4444'; ctx.font = 'bold 11px ui-monospace,monospace'; ctx.textAlign = 'center';
    ctx.fillText('watermark = ' + wm, X(wm), 22);
    // shaded "late zone" to the left
    ctx.fillStyle = 'rgba(239,68,68,0.08)'; ctx.fillRect(pad, 28, X(wm) - pad, axisY - 28);
  }
  // maxEventTime marker
  ctx.strokeStyle = '#F59E0B'; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(X(e.maxEventTime), 28); ctx.lineTo(X(e.maxEventTime), axisY); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#F59E0B'; ctx.textAlign = 'center';
  ctx.fillText('max evt = ' + e.maxEventTime, X(e.maxEventTime), axisY + 34);

  // records of current batch
  const dropIds = new Set(e.dropped.map((r) => r.id));
  const y = axisY - 24;
  BATCHES[cursor].forEach((r) => {
    const late = dropIds.has(r.id);
    const col = late ? '#EF4444' : '#10B981';
    ctx.beginPath(); ctx.arc(X(r.eventTime), y, 8, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#0A0E1A'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#0A0E1A'; ctx.font = 'bold 10px ui-monospace,monospace'; ctx.textAlign = 'center';
    ctx.fillText(r.id, X(r.eventTime), y + 3);
    if (late) { ctx.fillStyle = '#EF4444'; ctx.font = '9px ui-monospace,monospace'; ctx.fillText('DROPPED', X(r.eventTime), y - 14); }
  });
  ctx.textAlign = 'left';
}

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p>A <b>watermark</b> answers the one question unbounded streaming can't dodge: <i>"when is it safe to say a time window is finished?"</i> It's a moving line on event time:</p>
    <div class="ss-callout" style="border-left-color:var(--red,#EF4444);text-align:center;font-family:var(--font-mono)"><b>watermark = max(event time seen) − delay</b> &nbsp;·&nbsp; monotonic (never moves back)</div>
    <div class="ss-grid">
      <div class="ss-card"><h4>🗑️ Drops late data</h4><p>Any record with <code>eventTime &lt; watermark</code> is too late — discarded before it touches state.</p></div>
      <div class="ss-card"><h4>✅ Finalizes windows</h4><p>A window whose <b>end ≤ watermark</b> can be emitted (append) and <b>evicted</b> from state — the engine won't wait for more.</p></div>
      <div class="ss-card"><h4>⏳ The delay = grace period</h4><p>How long you wait for stragglers. Bigger = more complete but more state + latency. Size it to your real skew (M07).</p></div>
      <div class="ss-card"><h4>⬆️ End-of-batch, next-batch apply</h4><p>Computed when a batch ends; the raised threshold filters the <b>next</b> batch — so a new high timestamp never drops its own batch-mates.</p></div>
    </div>
    <h3>Monotonicity — "once closed, stays closed"</h3>
    <p>The <code>max(previous, maxEventTime − delay)</code> form means a batch of only-old data can't drag the line backward. That guarantee is what lets Spark safely <b>evict</b> a finalized window's state: it will never need to reopen it.</p>
    <div class="ss-callout"><b>Multi-stream:</b> the global watermark is the <b>minimum</b> across inputs — Spark can only finalize once <i>every</i> source has passed the window. One lagging stream stalls finalization for all of them.</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>Step real <b>E1-engine</b> batches of ShopStream orders. Watch the red <b>watermark</b> advance as <code>max(event time) − delay</code>, and watch orders that fall left of it get <b>dropped</b>. Change the delay to trade completeness against state.</p></div>
  <div class="ss-controls">
    <button class="ss-btn primary" id="m08-step">Next batch ▶</button>
    <button class="ss-btn" id="m08-back">◀ Back</button>
    <button class="ss-btn" id="m08-reset">⟲ Reset</button>
    <label style="font-size:12.5px;color:var(--text-secondary);margin-left:8px">Watermark delay:
      <input type="range" id="m08-delay" min="0" max="8" step="1" value="2" style="vertical-align:middle">
      <span id="m08-delay-v" style="font-family:var(--font-mono)">2</span></label>
  </div>
  <div class="ss-canvas-wrap"><canvas id="m08-canvas" width="720" height="240"></canvas></div>
  <div class="ss-metrics">
    <div class="ss-metric"><div class="k">Batch</div><div class="v" id="m08-bi">—</div></div>
    <div class="ss-metric"><div class="k">Watermark now</div><div class="v" id="m08-wm">—</div></div>
    <div class="ss-metric"><div class="k">Dropped this batch</div><div class="v" id="m08-drop">—</div></div>
    <div class="ss-metric"><div class="k">Total dropped</div><div class="v" id="m08-tdrop">—</div></div>
  </div>
  <div class="ss-callout" id="m08-expl">—</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream picks a watermark delay</h3>
    <p>ShopStream's revenue-per-5-minute pipeline saw real-world skew: ~95% of orders arrive within <b>2 minutes</b> of happening, but mobile stragglers can trail by up to <b>10 minutes</b>. The team set <code>withWatermark("event_time", "10 minutes")</code> — generous enough to catch nearly all stragglers.</p>
    <p>The cost: each 5-minute window stays in state for ~15 minutes before finalizing, so state memory and append latency rose. During Black Friday that extra state pushed executors close to their memory limit, so they re-measured: 99.5% of orders were in within <b>4 minutes</b>. They tightened the delay to <b>5 minutes</b>, halving retained state and accepting a <b>0.5% undercount</b> of ultra-late orders (reconciled later by a nightly batch job).</p>
    <div class="ss-callout">The watermark is where ShopStream dials the <b>completeness ↔ latency ↔ cost</b> trade-off. They monitor <code>numRowsDroppedByWatermark</code> to make sure "too tight" never becomes "silently wrong."</div>
  </div>`;

  const code = `
  ${codeBlock('PySpark', `revenue = (orders
    .withWatermark("event_time", "5 minutes")       # grace period for late orders
    .groupBy(window(col("event_time"), "5 minutes"), col("category"))
    .agg(sum("amount").alias("revenue")))

# append: each window is emitted ONCE, when watermark passes its end, then evicted
(revenue.writeStream.outputMode("append")
    .format("delta").option("checkpointLocation", "s3://shopstream/chk/rev")
    .start())`)}
  ${codeBlock('Scala', `val revenue = orders
  .withWatermark("event_time", "5 minutes")
  .groupBy(window($"event_time", "5 minutes"), $"category")
  .agg(sum($"amount").as("revenue"))`)}
  ${codeBlock('Observing drops (StreamingQueryProgress)', `# query.lastProgress["stateOperators"][0]:
#   "numRowsDroppedByWatermark": 42,     <- late orders discarded; if high, widen delay
#   "numRowsTotal": 1800, "memoryUsedBytes": ...`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M08 · Time & Windows',
    title: 'Watermarks',
    subtitle: 'The moving event-time threshold that drops late data and finalizes windows',
    definition: {
      formal: 'A watermark is a monotonically increasing event-time threshold, computed at the end of each micro-batch as max(previous watermark, max observed event time − configured delay) and applied to the subsequent batch. Records with event time below the watermark are dropped as late; stateful windows whose end is at or below the watermark are finalized and evicted. The delay sets the late-data grace period, trading completeness against state size and latency.',
      easy: 'A watermark is Spark\'s line for "I\'ve probably seen everything up to here." It\'s the newest event time minus a grace period you choose, and it only moves forward. Anything older than the line is dropped as too-late, and any time-window that ends before the line is declared finished and cleared from memory. A bigger grace period catches more stragglers but keeps more in memory.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '💧 Watermark Stepper', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const canvas = container.querySelector('#m08-canvas');
  const delay = container.querySelector('#m08-delay'), delayV = container.querySelector('#m08-delay-v');
  const biEl = container.querySelector('#m08-bi'), wmEl = container.querySelector('#m08-wm');
  const dropEl = container.querySelector('#m08-drop'), tdropEl = container.querySelector('#m08-tdrop');
  const explEl = container.querySelector('#m08-expl');

  let trace = [], cursor = -1;

  function recompute(keepCursor) {
    const q = new MicroBatchQuery({
      window: { type: 'tumbling', size: 5 },
      watermarkDelay: +delay.value,
      outputMode: 'append',
      aggregate: { fn: 'count' },
    });
    trace = q.run(BATCHES).trace;
    if (!keepCursor) cursor = -1;
    else cursor = Math.min(cursor, trace.length - 1);
    render();
  }

  function fmtWm(v) { return v === Number.NEGATIVE_INFINITY ? '−∞' : String(v); }

  function render() {
    delayV.textContent = delay.value;
    drawWM(canvas, trace, cursor, +delay.value);
    if (cursor < 0) {
      biEl.textContent = '—'; wmEl.textContent = '−∞'; dropEl.textContent = '—';
      tdropEl.textContent = '0';
      explEl.innerHTML = 'The watermark starts at <b>−∞</b> — nothing can be late before the first batch. Press <b>Next batch ▶</b>.';
      return;
    }
    const e = trace[cursor];
    biEl.textContent = cursor;
    wmEl.textContent = fmtWm(e.watermarkAfter);
    dropEl.textContent = e.droppedCount;
    dropEl.style.color = e.droppedCount ? 'var(--red,#EF4444)' : 'var(--text-primary)';
    tdropEl.textContent = trace.slice(0, cursor + 1).reduce((s, x) => s + x.droppedCount, 0);
    const dropNames = e.dropped.map((r) => `<code>${esc(r.id)}</code>(t${r.eventTime})`).join(', ');
    const emitNames = e.emitted.map((r) => `[${r.window.start},${r.window.end})=${r.value}`).join(' ');
    explEl.innerHTML =
      `<b>Batch ${cursor}:</b> max event time = <b>${e.maxEventTime}</b>, so watermark = max(${fmtWm(e.watermarkBefore)}, ${e.maxEventTime}−${delay.value}) = <b style="color:var(--red,#EF4444)">${fmtWm(e.watermarkAfter)}</b>.`
      + (e.droppedCount
          ? `<br>🗑️ <b>Dropped</b> ${dropNames} — event time below the watermark that was in force (${fmtWm(e.watermarkBefore)}).`
          : `<br>✅ No drops this batch.`)
      + (emitNames ? `<br>📤 <b>Finalized windows</b> (append): ${emitNames}.` : `<br>⏳ No windows closed yet.`);
  }

  container.querySelector('#m08-step').addEventListener('click', () => {
    if (cursor < trace.length - 1) { cursor++; render(); }
  });
  container.querySelector('#m08-back').addEventListener('click', () => {
    if (cursor >= 0) { cursor--; render(); }
  });
  container.querySelector('#m08-reset').addEventListener('click', () => { cursor = -1; render(); });
  delay.addEventListener('input', () => recompute(true));

  recompute(false);
}

export default { mount };
