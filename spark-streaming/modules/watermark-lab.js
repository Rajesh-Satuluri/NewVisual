// L3 · Watermark Lab — Labs  (engine-driven: MicroBatchQuery)
// Slide the watermark delay over a stream with late events and watch the
// completeness <-> latency <-> state-size trade-off move in real time.
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock } from './_mod-ui.js';
import { MicroBatchQuery } from '../sim/microbatch-engine.js';

const IQ = [
  { q: 'What three things does the watermark delay trade off?', a: '<p><b>Completeness</b> (how many late events are kept vs dropped), <b>latency</b> (how long until a window finalizes in append mode), and <b>state size</b> (how long windows stay open in memory). A <b>larger</b> delay buys completeness at the cost of latency + state; a <b>smaller</b> delay is lean and fast but drops more late data. You pick the smallest delay that captures the vast majority of real skew.</p>', tip: 'Completeness ↔ latency ↔ state. Bigger delay = more complete, slower, more state. Tune to real skew.' },
  { q: 'How is "completeness" affected by the delay?', a: '<p>An event is dropped when <code>eventTime &lt; watermark</code>. Since <code>watermark = max(eventTime) − delay</code>, a bigger delay lowers the threshold, so <b>fewer</b> late events fall below it → higher completeness. The dropped events never reach their window, so a too-tight delay causes <b>silent undercounting</b> — you only see it via <code>numRowsDroppedByWatermark</code> (M21).</p>', tip: 'Bigger delay → lower threshold → fewer drops → more complete. Drops are silent; watch numRowsDroppedByWatermark.' },
  { q: 'How does the delay affect latency (in append mode)?', a: '<p>Append emits a window <b>only when it closes</b> (window end ≤ watermark). A bigger delay holds the watermark further back, so windows <b>close later</b> → higher emit latency. A size-5 window with a 10-unit delay finalizes ~15 units after it starts. Update/complete modes emit continuously so they\'re less latency-sensitive, but append latency is directly the window size + watermark delay.</p>', tip: 'Append latency ≈ window size + watermark delay. Bigger delay = later finalization. Update/complete emit sooner.' },
  { q: 'How does the delay affect state size?', a: '<p>Windows stay in state until the watermark passes their end; a bigger delay keeps them open <b>longer</b>, so <b>more windows (and keys) are retained simultaneously</b> → more memory. State ≈ open windows × distinct keys, and the delay directly sets how many windows are "open" at once. This is why an over-generous watermark is a common cause of state bloat (M10).</p>', tip: 'Bigger delay → windows open longer → more retained → more state. Delay sizes the open-window count.' },
  { q: 'How do you choose the right delay in practice?', a: '<p>Measure your <b>real skew distribution</b> (event-time vs arrival): pick a delay that covers the <b>95–99th percentile</b> of lateness, so you keep almost all data without over-provisioning state/latency. Monitor <code>numRowsDroppedByWatermark</code> — if it rises, widen; if state/latency hurt and drops are ~0, you can tighten. Reconcile the tiny tail (ultra-late) with a nightly batch job if exactness matters (M07, M21).</p>', tip: 'Cover the 95–99th percentile of real skew. Monitor drops; widen/tighten from there; batch-reconcile the tail.' },
  { q: 'Does the delay interact with the output mode?', a: '<p>Yes. <b>Append</b> depends on the watermark to define "final," so delay directly sets its latency and requires a watermark. <b>Update</b> uses the watermark to evict but emits current values each batch (less latency-bound). <b>Complete</b> <b>ignores</b> the watermark entirely — no drops, no eviction, unbounded state — so the delay has <b>no effect</b> on completeness/state there (M12).</p>', tip: 'Append: delay = latency + requires wm. Update: evicts on wm. Complete: ignores wm entirely (delay irrelevant).' },
  { q: 'Why can a bigger watermark make results arrive late AND risk memory?', a: '<p>Both follow from windows staying open longer. Append can\'t emit a window until the watermark passes its end, so a bigger delay <b>postpones emission</b> (latency); and all those not-yet-closed windows <b>remain in state</b> (memory). So the same knob that improves completeness simultaneously worsens latency and state — the central tension this lab visualizes.</p>', tip: 'Longer-open windows cause both later emission (latency) and more retained state (memory). One knob, two costs.' },
  { q: 'What happens at delay = 0?', a: '<p>The watermark equals <code>max(eventTime)</code>, so <b>any</b> out-of-order event (eventTime below the current max) is <b>dropped</b> — only perfectly in-order data survives. State and latency are minimal (windows close immediately), but completeness is at the mercy of ordering. Delay 0 is viable only if your source is effectively in-order; real streams need some grace.</p>', tip: 'Delay 0 → watermark = max eventTime → all out-of-order data dropped. Minimal state/latency, poor completeness.' },
];

// Events with varied lateness (arrival implied by batch order). Tumbling size 5.
const BATCHES = [
  [{ id: 'a', eventTime: 1, cat: 'x' }, { id: 'b', eventTime: 2, cat: 'x' }, { id: 'c', eventTime: 4, cat: 'x' }],
  [{ id: 'd', eventTime: 6, cat: 'x' }, { id: 'e', eventTime: 9, cat: 'x' }],           // advances max to 9
  [{ id: 'f', eventTime: 3, cat: 'x' }, { id: 'g', eventTime: 7, cat: 'x' }, { id: 'h', eventTime: 12, cat: 'x' }],
  [{ id: 'i', eventTime: 5, cat: 'x' }, { id: 'j', eventTime: 8, cat: 'x' }, { id: 'k', eventTime: 16, cat: 'x' }],
  [{ id: 'l', eventTime: 2, cat: 'x' }, { id: 'm', eventTime: 14, cat: 'x' }, { id: 'n', eventTime: 19, cat: 'x' }],
];
const TOTAL = BATCHES.flat().length;

function drawLab(canvas, trace, delay) {
  const ctx = canvas.getContext('2d'); const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);
  const pad = 42, axisY = H - 40;
  const allT = BATCHES.flat().map((r) => r.eventTime);
  const tMax = Math.max(...allT) + 2;
  const X = (t) => pad + (t / tMax) * (W - pad * 2);
  const laneY = (bi) => 40 + bi * 30;

  // time grid
  ctx.fillStyle = 'rgba(148,163,184,0.6)'; ctx.font = '10px ui-monospace,monospace'; ctx.textAlign = 'center';
  for (let t = 0; t <= tMax; t += 2) {
    ctx.strokeStyle = 'rgba(148,163,184,0.08)'; ctx.beginPath(); ctx.moveTo(X(t), 28); ctx.lineTo(X(t), axisY); ctx.stroke();
    ctx.fillText('t' + t, X(t), axisY + 16);
  }
  // final watermark line
  const finalWm = trace[trace.length - 1].watermarkAfter;
  if (finalWm > Number.NEGATIVE_INFINITY) {
    ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(finalWm), 28); ctx.lineTo(X(finalWm), axisY); ctx.stroke();
    ctx.fillStyle = 'rgba(239,68,68,0.07)'; ctx.fillRect(pad, 28, X(finalWm) - pad, axisY - 28);
    ctx.fillStyle = '#EF4444'; ctx.font = 'bold 10px ui-monospace,monospace';
    ctx.fillText('final wm=' + finalWm, X(finalWm), 22);
  }
  // events per batch lane; colored green (kept) or red (dropped)
  const droppedIds = new Set(trace.flatMap((e) => e.dropped.map((r) => r.id)));
  BATCHES.forEach((batch, bi) => {
    const y = laneY(bi);
    ctx.fillStyle = 'rgba(148,163,184,0.5)'; ctx.textAlign = 'right'; ctx.font = '9px ui-monospace,monospace';
    ctx.fillText('b' + bi, pad - 6, y + 3);
    batch.forEach((r) => {
      const dropped = droppedIds.has(r.id);
      ctx.beginPath(); ctx.arc(X(r.eventTime), y, 6, 0, Math.PI * 2);
      ctx.fillStyle = dropped ? '#EF4444' : '#10B981'; ctx.fill();
      ctx.strokeStyle = '#0A0E1A'; ctx.lineWidth = 1.5; ctx.stroke();
    });
  });
  ctx.textAlign = 'left';
}

function analyze(delay, mode) {
  const q = new MicroBatchQuery({ window: { type: 'tumbling', size: 5 }, watermarkDelay: delay, outputMode: mode, groupBy: 'cat', aggregate: { fn: 'count' } });
  const trace = q.run(BATCHES).trace;
  const dropped = trace.reduce((s, e) => s + e.droppedCount, 0);
  const kept = TOTAL - dropped;
  const peakState = Math.max(...trace.map((e) => e.state.length));
  // append latency proxy: window size + delay
  const latency = 5 + delay;
  return { trace, dropped, kept, completeness: Math.round((kept / TOTAL) * 100), peakState, latency };
}

export function mount(container) {
  injectModStyles();

  const lab = `
  <div class="ss-prose"><p>One stream, lots of out-of-order events. Slide the <b>watermark delay</b> and watch the <b>real E1 engine</b> recompute what's kept (green) vs dropped (red), and how the three costs move. Find the sweet spot: high completeness without runaway state or latency.</p></div>
  <div class="ss-controls">
    <label style="font-size:13px;color:var(--text-secondary)">Watermark delay:
      <input type="range" id="wl-delay" min="0" max="16" step="1" value="2" style="vertical-align:middle;width:220px">
      <span id="wl-delay-v" style="font-family:var(--font-mono);font-size:15px;color:var(--accent)">2</span></label>
    <label style="font-size:13px;color:var(--text-secondary)">Mode:
      <select id="wl-mode" class="ss-btn" style="margin-left:4px">
        <option value="append">append</option><option value="update">update</option><option value="complete">complete</option>
      </select></label>
  </div>
  <div class="ss-canvas-wrap"><canvas id="wl-canvas" width="720" height="220"></canvas></div>
  <div class="ss-metrics">
    <div class="ss-metric"><div class="k">Completeness</div><div class="v" id="wl-comp">—</div></div>
    <div class="ss-metric"><div class="k">Dropped / total</div><div class="v" id="wl-drop" style="font-size:16px">—</div></div>
    <div class="ss-metric"><div class="k">Append latency</div><div class="v" id="wl-lat" style="font-size:16px">—</div></div>
    <div class="ss-metric"><div class="k">Peak state</div><div class="v" id="wl-state" style="font-size:16px">—</div></div>
  </div>
  <div class="ss-callout" id="wl-verdict">—</div>
  <div id="wl-bars" style="margin-top:12px"></div>`;

  const how = `
  <div class="ss-prose">
    <h3>What you're seeing</h3>
    <p>The watermark is <code>max(event time) − delay</code>, shown as the red line. Events to its <b>left are dropped</b> (red); to its right, <b>kept</b> (green). As you raise the delay, the line slides left, rescuing more late events — but every window now stays open longer.</p>
    <h3>The three readouts</h3>
    <ul>
      <li><b>Completeness</b> — % of events kept (not dropped). Rises with delay.</li>
      <li><b>Append latency</b> — window size + delay: how long until a window finalizes in append mode. Rises with delay.</li>
      <li><b>Peak state</b> — the most windows/keys held at once (real engine output). Rises with delay.</li>
    </ul>
    <div class="ss-callout"><b>The lesson:</b> one knob, moving three things in tension. The craft is picking the <b>smallest delay that keeps nearly all your real data</b> — covering the 95–99th percentile of actual skew — so you don't pay for completeness you don't need in latency and memory. In <b>complete</b> mode the watermark is ignored entirely: nothing drops, nothing evicts, so the delay does nothing and state is unbounded.</div>
  </div>`;

  const code = `
  ${codeBlock('PySpark', `# The one knob this lab explores:
events.withWatermark("event_time", f"{delay} seconds") \\
    .groupBy(window("event_time", "5 seconds")) \\
    .count()

# append -> finalize latency = window + watermark; requires a watermark
# update -> evicts on watermark, emits current values each batch
# complete -> IGNORES the watermark: no drops, no eviction, unbounded state`)}`;

  container.innerHTML = createModuleShell({
    tag: 'Lab · Watermarks',
    title: 'Watermark Lab',
    subtitle: 'Feel the completeness ↔ latency ↔ state trade-off by moving one slider',
    tabs: [
      { id: 'lab', label: '💧 Lab', content: lab },
      { id: 'how', label: '📖 How it works', content: how },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const delay = container.querySelector('#wl-delay'), delayV = container.querySelector('#wl-delay-v');
  const modeSel = container.querySelector('#wl-mode');
  const canvas = container.querySelector('#wl-canvas');
  const compEl = container.querySelector('#wl-comp'), dropEl = container.querySelector('#wl-drop');
  const latEl = container.querySelector('#wl-lat'), stateEl = container.querySelector('#wl-state');
  const verdictEl = container.querySelector('#wl-verdict'), barsEl = container.querySelector('#wl-bars');

  function bar(label, pct, color) {
    return `<div style="margin:4px 0"><div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">${label}</div>
      <div style="background:var(--bg-elevated);border-radius:5px;height:14px;overflow:hidden"><div style="width:${Math.min(100, pct)}%;height:100%;background:${color};transition:width .15s"></div></div></div>`;
  }

  function render() {
    delayV.textContent = delay.value;
    const complete = modeSel.value === 'complete';
    const a = analyze(+delay.value, modeSel.value);
    drawLab(canvas, a.trace, +delay.value);
    compEl.textContent = complete ? '100%' : a.completeness + '%';
    compEl.style.color = (complete || a.completeness >= 90) ? 'var(--green,#10B981)' : a.completeness >= 70 ? 'var(--yellow,#F59E0B)' : 'var(--red,#EF4444)';
    dropEl.textContent = complete ? `0 / ${TOTAL}` : `${a.dropped} / ${TOTAL}`;
    latEl.textContent = modeSel.value === 'append' ? a.latency + ' units' : 'n/a (' + modeSel.value + ')';
    stateEl.textContent = a.peakState + (complete ? ' ↑∞' : '');
    stateEl.style.color = complete ? 'var(--red,#EF4444)' : 'var(--text-primary)';

    const compPct = complete ? 100 : a.completeness;
    const latPct = (a.latency / 21) * 100;
    const statePct = (a.peakState / 8) * 100;
    barsEl.innerHTML = bar('Completeness (higher = better)', compPct, 'var(--green,#10B981)')
      + bar('Append latency (lower = better)', latPct, 'var(--yellow,#F59E0B)')
      + bar('Peak state / memory (lower = better)', Math.min(100, statePct), 'var(--purple,#8B5CF6)');

    verdictEl.innerHTML = complete
      ? `<b>complete mode:</b> the watermark is <b>ignored</b> — nothing is dropped (100% complete) but <b>nothing evicts</b>, so state grows <b>unbounded</b>. The delay slider has no effect here. Use complete only for tiny, bounded key spaces.`
      : (+delay.value === 0
          ? `<b>delay 0:</b> watermark = max(event time), so <b>every out-of-order event is dropped</b> (completeness ${a.completeness}%). Minimal state (${a.peakState}) & latency (${a.latency}), but you lose late data. Only viable for in-order sources.`
          : a.completeness >= 90
            ? `🟢 <b>Good balance:</b> delay ${delay.value} keeps <b>${a.completeness}%</b> of events (${a.dropped} dropped) at peak state <b>${a.peakState}</b>${modeSel.value === 'append' ? ` and ${a.latency}-unit latency` : ''}. Raising it further mostly adds state/latency for little completeness gain.`
            : `🟡 <b>Tightening hurts completeness:</b> delay ${delay.value} drops <b>${a.dropped}</b> of ${TOTAL} events (${a.completeness}% complete). Cheap on state (${a.peakState}) but you're undercounting — widen the delay to rescue late data.`);
  }

  delay.addEventListener('input', render);
  modeSel.addEventListener('change', render);
  render();
}

export default { mount };
