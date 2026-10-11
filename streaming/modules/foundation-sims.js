// Foundations interactive simulators (I32/I33/I34/I35) — all driven by the
// tested deterministic engine in sim/stream-engine.js. Canvas is dark-bg for
// theme-independent legibility.
import {
  generateEvents, computeWatermarks, tumblingWindowOf, slidingWindowsOf,
  runTumblingAggregation, KeyedCounter, simulateBackpressure,
} from '../sim/stream-engine.js';
import { setupCanvas, clear, roundRect, C, metricsPanel, controlRow, btn, slider, legendRow } from '../components/sim-ui.js';

// Return a cleanup fn aggregator
function raf(fn) { const h = requestAnimationFrame(fn); return () => cancelAnimationFrame(h); }

// ── f02: event card ──────────────────────────────────────────────────────
export function eventCard(host, scenario) {
  const e = scenario.sampleEvent;
  const rows = Object.entries(e).map(([k, v]) =>
    `<tr><td style="color:var(--text3);padding:3px 14px 3px 0">${k}</td><td style="font-family:var(--mono);color:var(--text)">${JSON.stringify(v)}</td></tr>`).join('');
  host.innerHTML = `<div class="card"><table style="font-size:13px">${rows}</table></div>`;
}

// ── f15: pipeline diagram ────────────────────────────────────────────────
export function pipelineDiagram(host, scenario) {
  const stages = scenario.pipeline;
  host.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:16px 0">
    ${stages.map((s, i) => `<span class="pill" style="background:var(--accent-lo);color:var(--accent2);text-transform:none;font-size:12px;padding:8px 12px">${s}</span>${i < stages.length - 1 ? '<span style="color:var(--text3)">→</span>' : ''}`).join('')}
  </div>`;
}

// ── f06: event-time vs processing-time skew ──────────────────────────────
export function skewSim(host, scenario) {
  let seed = 7, maxDelay = 4;
  host.innerHTML = `
    ${controlRow(slider('f06-delay', 'Max network delay', 0, 8, maxDelay) + btn('f06-regen', '🎲 New data'))}
    <canvas id="f06-cv"></canvas>
    ${legendRow([{ color: C.keyA, label: 'event (event-time truth)' }, { color: C.cyan2, label: 'same event by arrival order' }])}`;
  const cv = host.querySelector('#f06-cv');
  function draw() {
    const events = generateEvents({ seed, count: 14, maxDelay, keys: [scenario.short] });
    const { ctx, w, h } = setupCanvas(cv, host.clientWidth - 36, 220);
    clear(ctx, w, h);
    const pad = 40, span = w - pad * 2, n = 14;
    const x = (t) => pad + (span * (t - 1)) / (n + (maxDelay || 1));
    // two lanes
    const topY = 70, botY = 160;
    ctx.fillStyle = C.text; ctx.font = '12px sans-serif';
    ctx.fillText('Event time (when it happened)', pad, 34);
    ctx.fillText('Arrival order (what the pipeline sees)', pad, 124);
    ctx.strokeStyle = C.axis; ctx.beginPath(); ctx.moveTo(pad, topY); ctx.lineTo(w - pad, topY); ctx.moveTo(pad, botY); ctx.lineTo(w - pad, botY); ctx.stroke();
    const byArrival = [...events];
    // top: by event time
    [...events].sort((a, b) => a.eventTime - b.eventTime).forEach(e => {
      const px = x(e.eventTime);
      ctx.fillStyle = C.keyA; roundRect(ctx, px - 9, topY - 11, 18, 22, 5); ctx.fill();
      ctx.fillStyle = '#042f3a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(e.eventTime, px, topY + 4); ctx.textAlign = 'left';
    });
    // bottom: by arrival, label with event time, line connecting
    byArrival.forEach((e, i) => {
      const px = pad + (span * i) / (n - 1);
      ctx.strokeStyle = e.delay > 0 ? 'rgba(239,68,68,.5)' : 'rgba(34,211,238,.35)';
      ctx.beginPath(); ctx.moveTo(x(e.eventTime), topY + 11); ctx.lineTo(px, botY - 11); ctx.stroke();
      ctx.fillStyle = e.delay > 0 ? C.late : C.cyan2; roundRect(ctx, px - 9, botY - 11, 18, 22, 5); ctx.fill();
      ctx.fillStyle = '#042f3a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(e.eventTime, px, botY + 4); ctx.textAlign = 'left';
    });
  }
  draw();
  host.querySelector('#f06-delay').addEventListener('input', (ev) => { maxDelay = +ev.target.value; host.querySelector('#f06-delay-val').textContent = maxDelay; draw(); });
  host.querySelector('#f06-regen').addEventListener('click', () => { seed = (seed * 7 + 13) % 100000; draw(); });
  return () => {};
}

// ── f07: watermark simulator ─────────────────────────────────────────────
export function watermarkSim(host, scenario) {
  let seed = 11, allowed = 2, maxDelay = 5;
  host.innerHTML = `
    ${controlRow(slider('f07-allowed', 'Allowed lateness', 0, 6, allowed) + slider('f07-delay', 'Max delay', 0, 8, maxDelay) + btn('f07-regen', '🎲 New data'))}
    <canvas id="f07-cv"></canvas>
    ${legendRow([{ color: C.keyA, label: 'on-time event' }, { color: C.late, label: 'late event' }, { color: C.wm, label: 'watermark' }])}
    <div id="f07-metrics"></div>`;
  const cv = host.querySelector('#f07-cv');
  function draw() {
    const events = generateEvents({ seed, count: 16, maxDelay, keys: [scenario.short] });
    const wm = computeWatermarks(events, allowed);
    const windowSize = 3;
    const { classified } = runTumblingAggregation({ events, windowSize, allowedLateness: allowed, keyed: false });
    const lateCount = classified.filter(c => c.status === 'late').length;
    const { ctx, w, h } = setupCanvas(cv, host.clientWidth - 36, 260);
    clear(ctx, w, h);
    const pad = 40, span = w - pad * 2;
    const maxEt = Math.max(...events.map(e => e.eventTime)) + 1;
    const x = (t) => pad + (span * t) / maxEt;
    const baseY = 150;
    // window bands
    for (let s = 1; s <= maxEt; s += windowSize) {
      const w1 = tumblingWindowOf(s, windowSize);
      ctx.fillStyle = (Math.floor((s - 1) / windowSize) % 2) ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(x(w1.start - 1), 30, x(w1.end) - x(w1.start - 1), baseY - 20);
      ctx.fillStyle = C.text3; ctx.font = '10px sans-serif'; ctx.fillText(`[${w1.start}-${w1.end}]`, x(w1.start - 1) + 4, 26);
    }
    // axis
    ctx.strokeStyle = C.axis; ctx.beginPath(); ctx.moveTo(pad, baseY); ctx.lineTo(w - pad, baseY); ctx.stroke();
    ctx.fillStyle = C.text; ctx.font = '11px sans-serif'; ctx.fillText('event time →', w - pad - 70, baseY + 20);
    // events in arrival order placed at their event time
    const statusById = Object.fromEntries(classified.map(c => [c.id, c.status]));
    wm.forEach((e) => {
      const px = x(e.eventTime);
      const late = statusById[e.id] === 'late';
      ctx.fillStyle = late ? C.late : C.keyA;
      roundRect(ctx, px - 8, baseY - 20, 16, 20, 4); ctx.fill();
      ctx.fillStyle = late ? '#fff' : '#042f3a'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(e.eventTime, px, baseY - 6); ctx.textAlign = 'left';
    });
    // watermark progression (as a stepped amber line over arrival index)
    ctx.strokeStyle = C.wm; ctx.lineWidth = 2; ctx.beginPath();
    wm.forEach((e, i) => { const px = pad + (span * i) / (wm.length - 1); const py = baseY + 30 + (baseY - 30) * 0; const wy = baseY + 70 - (e.watermark / maxEt) * 50; if (i === 0) ctx.moveTo(px, wy); else ctx.lineTo(px, wy); });
    ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = C.wm; ctx.font = '11px sans-serif'; ctx.fillText('watermark = maxEventTime − allowedLateness', pad, baseY + 48);

    host.querySelector('#f07-metrics').innerHTML = metricsPanel([
      { label: 'Allowed lateness', value: allowed, color: C.wm },
      { label: 'On-time events', value: events.length - lateCount, color: C.ok },
      { label: 'Late events', value: lateCount, color: C.late },
    ]);
  }
  draw();
  host.querySelector('#f07-allowed').addEventListener('input', e => { allowed = +e.target.value; host.querySelector('#f07-allowed-val').textContent = allowed; draw(); });
  host.querySelector('#f07-delay').addEventListener('input', e => { maxDelay = +e.target.value; host.querySelector('#f07-delay-val').textContent = maxDelay; draw(); });
  host.querySelector('#f07-regen').addEventListener('click', () => { seed = (seed * 7 + 13) % 100000; draw(); });
  return () => {};
}

// ── f08: window animator ─────────────────────────────────────────────────
export function windowSim(host, scenario) {
  let type = 'tumbling', size = 3, slide = 1, seed = 5;
  host.innerHTML = `
    ${controlRow(`
      <label class="sim-slider"><span>Type</span><select id="f08-type" style="background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:6px">
        <option value="tumbling">Tumbling (no overlap)</option><option value="sliding">Sliding (overlap)</option></select></label>
      ${slider('f08-size', 'Window size', 2, 6, size)} ${slider('f08-slide', 'Slide', 1, 4, slide)} ${btn('f08-regen', '🎲 New data')}`)}
    <canvas id="f08-cv"></canvas>
    <div id="f08-metrics"></div>`;
  const cv = host.querySelector('#f08-cv');
  const slideWrap = () => host.querySelector('#f08-slide').closest('.sim-slider');
  function draw() {
    slideWrap().style.display = type === 'sliding' ? '' : 'none';
    const events = generateEvents({ seed, count: 12, maxDelay: 0, keys: [scenario.short] });
    const maxEt = Math.max(...events.map(e => e.eventTime));
    const windows = [];
    if (type === 'tumbling') { for (let s = 1; s <= maxEt; s += size) windows.push({ start: s, end: s + size - 1 }); }
    else { for (let s = 1; s <= maxEt; s += slide) windows.push({ start: s, end: s + size - 1 }); }
    const { ctx, w, h } = setupCanvas(cv, host.clientWidth - 36, 60 + windows.length * 26 + 50);
    clear(ctx, w, h);
    const pad = 36, span = w - pad * 2;
    const x = (t) => pad + (span * (t - 0.5)) / maxEt;
    // events row
    events.forEach(e => { const px = x(e.eventTime); ctx.fillStyle = C.keyA; roundRect(ctx, px - 8, 20, 16, 20, 4); ctx.fill(); ctx.fillStyle = '#042f3a'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(e.eventTime, px, 34); ctx.textAlign = 'left'; });
    // window bars
    windows.forEach((win, i) => {
      const y = 60 + i * 26;
      const x1 = x(win.start) - span / maxEt / 2, x2 = x(win.end) + span / maxEt / 2;
      ctx.fillStyle = i % 2 ? 'rgba(6,182,212,0.18)' : 'rgba(167,139,250,0.18)';
      roundRect(ctx, x1, y, Math.max(10, x2 - x1), 18, 5); ctx.fill();
      const cnt = events.filter(e => e.eventTime >= win.start && e.eventTime <= win.end).length;
      ctx.fillStyle = C.textHi; ctx.font = '10px sans-serif'; ctx.fillText(`[${win.start}-${win.end}] count=${cnt}`, x1 + 6, y + 13);
    });
    host.querySelector('#f08-metrics').innerHTML = metricsPanel([
      { label: 'Window type', value: type, color: C.cyan2 },
      { label: 'Windows produced', value: windows.length },
      { label: 'Events', value: events.length },
    ]);
  }
  draw();
  host.querySelector('#f08-type').addEventListener('change', e => { type = e.target.value; draw(); });
  host.querySelector('#f08-size').addEventListener('input', e => { size = +e.target.value; host.querySelector('#f08-size-val').textContent = size; draw(); });
  host.querySelector('#f08-slide').addEventListener('input', e => { slide = +e.target.value; host.querySelector('#f08-slide-val').textContent = slide; draw(); });
  host.querySelector('#f08-regen').addEventListener('click', () => { seed = (seed * 7 + 13) % 100000; draw(); });
  return () => {};
}

// ── f10: checkpoint / crash / recover ────────────────────────────────────
export function checkpointSim(host, scenario) {
  const events = generateEvents({ seed: 20, count: 10, keys: ['A', 'B', scenario.short] });
  let idx = 0, cp = null;
  const counter = new KeyedCounter();
  host.innerHTML = `
    ${controlRow(btn('cp-step', '▶ Process next', true) + btn('cp-snap', '📸 Checkpoint') + btn('cp-crash', '💥 Crash & recover') + btn('cp-reset', '↺ Reset'))}
    <div id="cp-state"></div>
    <div id="cp-log" style="font-family:var(--mono);font-size:12px;color:var(--text2);margin-top:12px;min-height:40px"></div>`;
  const log = (m) => { const el = host.querySelector('#cp-log'); el.innerHTML = m + '<br>' + el.innerHTML; };
  function render() {
    host.querySelector('#cp-state').innerHTML = metricsPanel([
      { label: 'Offset processed', value: counter.offset, color: C.cyan2 },
      { label: 'Checkpoint offset', value: cp ? cp.offset : '—', color: C.wm },
      ...Object.entries(counter.totals()).map(([k, v]) => ({ label: `count[${k}]`, value: v, color: C.ok })),
    ]);
  }
  render();
  host.querySelector('#cp-step').addEventListener('click', () => {
    if (idx >= events.length) { log('(no more events)'); return; }
    const e = events[idx++]; counter.process(e); log(`processed event #${e.id} key=${e.key} → offset ${counter.offset}`); render();
  });
  host.querySelector('#cp-snap').addEventListener('click', () => { cp = counter.snapshot(); log(`📸 checkpoint @ offset ${cp.offset}: ${JSON.stringify(cp.state)}`); render(); });
  host.querySelector('#cp-crash').addEventListener('click', () => {
    if (!cp) { log('⚠ no checkpoint yet — crash would lose everything!'); return; }
    counter.restore(cp); idx = cp.offset; log(`💥 crashed → restored offset ${cp.offset}, state ${JSON.stringify(cp.state)} (no loss, no reset)`); render();
  });
  host.querySelector('#cp-reset').addEventListener('click', () => { idx = 0; cp = null; counter.state.clear(); counter.offset = 0; host.querySelector('#cp-log').innerHTML = ''; render(); });
  return () => {};
}

// ── f12: backpressure ────────────────────────────────────────────────────
export function backpressureSim(host) {
  let input = 100, proc = 80;
  host.innerHTML = `
    ${controlRow(slider('bp-in', 'Input rate', 20, 160, input, 10) + slider('bp-proc', 'Processing rate', 20, 160, proc, 10))}
    <canvas id="bp-cv"></canvas>
    <div id="bp-metrics"></div>`;
  const cv = host.querySelector('#bp-cv');
  function draw() {
    const series = simulateBackpressure({ steps: 24, inputRate: input, processRate: proc });
    const { ctx, w, h } = setupCanvas(cv, host.clientWidth - 36, 220);
    clear(ctx, w, h);
    const pad = 40, span = w - pad * 2, maxLag = Math.max(10, ...series.map(s => s.lag));
    ctx.strokeStyle = C.axis; ctx.beginPath(); ctx.moveTo(pad, h - 30); ctx.lineTo(w - pad, h - 30); ctx.stroke();
    ctx.fillStyle = C.text; ctx.font = '11px sans-serif'; ctx.fillText('consumer lag over time', pad, 20);
    ctx.beginPath(); ctx.strokeStyle = input > proc ? C.err : C.ok; ctx.lineWidth = 2;
    series.forEach((s, i) => { const px = pad + (span * i) / (series.length - 1); const py = (h - 30) - ((h - 60) * s.lag) / maxLag; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
    ctx.stroke(); ctx.lineWidth = 1;
    const last = series[series.length - 1];
    host.querySelector('#bp-metrics').innerHTML = metricsPanel([
      { label: 'Input rate', value: input + '/s', color: C.cyan2 },
      { label: 'Process rate', value: proc + '/s', color: C.cyan },
      { label: 'Final lag', value: last.lag, color: last.lag > 0 ? C.err : C.ok },
      { label: 'Backpressure', value: input > proc ? 'ON' : 'off', color: input > proc ? C.err : C.ok },
    ]);
  }
  draw();
  host.querySelector('#bp-in').addEventListener('input', e => { input = +e.target.value; host.querySelector('#bp-in-val').textContent = input; draw(); });
  host.querySelector('#bp-proc').addEventListener('input', e => { proc = +e.target.value; host.querySelector('#bp-proc-val').textContent = proc; draw(); });
  return () => {};
}

export const SIMS = {
  skew: skewSim, watermarks: watermarkSim, windows: windowSim,
  checkpoint: checkpointSim, backpressure: backpressureSim,
};
