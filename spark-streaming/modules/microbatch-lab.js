// Micro-Batch Lab (L2) — a free-form sandbox on the E1 keystone engine.
//
// Author an event stream, choose the trigger, window, watermark delay, output
// mode and aggregate, then step through the micro-batches Spark would form and
// read the exact per-batch trace (watermark, dropped, emitted, retained state).
// Everything is computed by sim/microbatch-engine.js — nothing is scripted, so
// any change re-derives the whole trace deterministically.
//
// PAGE route → self-wires its tabs via initTabs(container).

import { createModuleShell, initTabs } from '../components/module-shell.js';
import { MicroBatchQuery, planBatches } from '../sim/microbatch-engine.js';

const PRESETS = {
  shopstream: { label: 'ShopStream orders', events: '2,4,8,11,14,7,21,25,6,12,31,45', arrivals: '' },
  late: { label: 'Lots of late data', events: '5,9,12,3,18,8,22,6,30,15', arrivals: '0,1,2,3,4,5,6,7,8,9' },
  bursty: { label: 'Bursty / out-of-order', events: '1,2,3,20,21,22,4,5,40,41', arrivals: '' },
};

const STYLE_ID = 'mbl-styles';
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
  .mbl-wrap{display:flex;flex-direction:column;gap:16px}
  .mbl-scenario{background:var(--bg-card);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:12px;padding:12px 16px;font-size:13px;line-height:1.6;color:var(--text-secondary)}
  .mbl-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  @media(max-width:760px){.mbl-grid{grid-template-columns:1fr}}
  .mbl-field{display:flex;flex-direction:column;gap:5px;background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:10px 12px}
  .mbl-field label{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;color:var(--text-muted)}
  .mbl-field input[type=text],.mbl-field select{background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-primary);border-radius:7px;padding:7px 9px;font-size:13px;font-family:var(--font-mono);width:100%}
  .mbl-row{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center}
  .mbl-row .seg{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--text-secondary)}
  .mbl-row input[type=range]{accent-color:var(--accent);max-width:120px}
  .mbl-row b{font-family:var(--font-mono);color:var(--text-primary)}
  .mbl-presets{display:flex;flex-wrap:wrap;gap:8px}
  .mbl-chip{background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-secondary);border-radius:999px;padding:5px 11px;font-size:12px;cursor:pointer}
  .mbl-chip:hover{border-color:var(--accent);color:var(--accent)}
  .mbl-btn{background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-primary);border-radius:8px;padding:7px 12px;font-size:13px;cursor:pointer;font-weight:600}
  .mbl-btn:hover{border-color:var(--accent)}
  .mbl-btn:disabled{opacity:.4;cursor:not-allowed}
  .mbl-btn.primary{background:var(--accent);border-color:var(--accent);color:#0A0E1A}
  .mbl-counter{font-family:var(--font-mono);font-size:13px;color:var(--text-primary);font-weight:700}
  .mbl-canvas-wrap{background:#0A0E1A;border:1px solid var(--border);border-radius:12px;padding:12px}
  .mbl-canvas-wrap canvas{width:100%;max-width:860px;display:block;margin:0 auto}
  .mbl-cols{display:grid;grid-template-columns:1.3fr 1fr;gap:14px}
  @media(max-width:760px){.mbl-cols{grid-template-columns:1fr}}
  .mbl-card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden}
  .mbl-card h4{margin:0;padding:10px 14px;font-size:12.5px;color:var(--text-primary);border-bottom:1px solid var(--border);background:var(--bg-surface)}
  .mbl-tbl{width:100%;border-collapse:collapse;font-size:12px;font-family:var(--font-mono)}
  .mbl-tbl th{text-align:left;color:var(--text-muted);font-weight:600;padding:5px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.04em}
  .mbl-tbl td{padding:5px 10px;color:var(--text-primary);border-top:1px solid color-mix(in srgb,var(--border) 55%,transparent)}
  .mbl-tbl tr.cur td{background:color-mix(in srgb,var(--accent) 13%,transparent)}
  .mbl-tbl td.drop{color:var(--red)}
  .mbl-empty{padding:12px 14px;color:var(--text-muted);font-size:12px;font-style:italic}
  .mbl-emit b{font-family:var(--font-mono)}
  `;
  document.head.appendChild(s);
}

const winLabel = (w) => `[${w.start}, ${w.end})`;
const fmtWm = (v) => (isFinite(v) ? v : '−∞');
const keyStr = (r) => (r.key == null ? '' : r.key + ' ');

function parseNums(str) {
  return String(str || '')
    .split(/[\s,]+/)
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x));
}

function buildEvents(eventsStr, arrivalsStr) {
  const ets = parseNums(eventsStr).slice(0, 40);
  const arr = parseNums(arrivalsStr);
  return ets.map((et, i) => ({ eventTime: et, arrivalTime: arr.length === ets.length ? arr[i] : et }));
}

function cfgFrom(state) {
  const window =
    state.wtype === 'tumbling'
      ? { type: 'tumbling', size: state.size }
      : state.wtype === 'sliding'
      ? { type: 'sliding', size: state.size, slide: state.slide }
      : { type: 'session', gap: state.gap };
  return {
    window,
    watermarkDelay: state.delay,
    outputMode: state.mode,
    aggregate: { fn: state.agg, field: 'value' },
  };
}

function triggerFrom(state) {
  if (state.trigger === 'once') return { type: 'once' };
  if (state.trigger === 'availableNow') return { type: 'availableNow', maxEventsPerBatch: state.maxEvents };
  return { type: 'processingTime', interval: state.interval };
}

function drawTimeline(canvas, batches, trace, cursor, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0A0E1A';
  ctx.fillRect(0, 0, W, H);
  const evs = batches.flatMap((b, bi) => b.map((r, ri) => ({ ...r, batch: bi, ri })));
  const maxEt = Math.max(10, ...evs.map((e) => e.eventTime));
  const tMax = Math.ceil((maxEt + (state.size || 10)) / 5) * 5;
  const ml = 44, mr = 20, baseY = H - 46;
  const xOf = (t) => ml + (t / tMax) * (W - ml - mr);

  ctx.font = '10px ui-monospace,monospace';
  // gridlines by window type
  const step = state.wtype === 'sliding' ? state.slide : state.wtype === 'tumbling' ? state.size : 0;
  if (step > 0) {
    for (let s = 0; s <= tMax; s += step) {
      const x = xOf(s);
      ctx.strokeStyle = 'rgba(148,163,184,0.15)';
      ctx.beginPath(); ctx.moveTo(x, 28); ctx.lineTo(x, baseY); ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.55)';
      ctx.fillText(String(s), x + 2, baseY + 14);
    }
  }
  ctx.fillStyle = 'rgba(148,163,184,0.7)';
  ctx.fillText('event time →', W - 108, baseY + 30);

  // watermark (append/update)
  if (cursor > 0 && state.mode !== 'complete' && trace[cursor - 1]) {
    const wm = trace[cursor - 1].watermarkAfter;
    if (isFinite(wm) && wm >= 0 && wm <= tMax) {
      const x = xOf(wm);
      ctx.strokeStyle = '#06B6D4'; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, baseY); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#06B6D4';
      ctx.fillText(`watermark = ${wm}`, Math.min(x + 4, W - 110), 16);
    }
  }

  for (const ev of evs) {
    const processed = ev.batch < cursor;
    const current = ev.batch === cursor - 1;
    const wmB = processed && trace[ev.batch] ? trace[ev.batch].watermarkBefore : null;
    const dropped = processed && state.mode !== 'complete' && isFinite(wmB) && ev.eventTime < wmB;
    const x = xOf(ev.eventTime);
    const y = baseY - 16 - (ev.ri % 7) * 15;
    ctx.beginPath(); ctx.arc(x, y, current ? 7 : 5.5, 0, Math.PI * 2);
    if (!processed) ctx.fillStyle = 'rgba(148,163,184,0.28)';
    else if (dropped) ctx.fillStyle = '#EF4444';
    else ctx.fillStyle = current ? '#F59E0B' : '#10B981';
    ctx.fill();
    if (current) { ctx.strokeStyle = '#FDE68A'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1; }
    if (dropped) { ctx.strokeStyle = '#EF4444'; ctx.beginPath(); ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.stroke(); }
  }

  const leg = [['#10B981', 'processed'], ['#F59E0B', 'this batch'], ['#EF4444', 'dropped'], ['rgba(148,163,184,0.4)', 'pending']];
  let lx = ml; ctx.font = '11px ui-monospace,monospace';
  for (const [c, label] of leg) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(lx, 14, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(203,213,225,0.85)'; ctx.fillText(label, lx + 10, 18);
    lx += 24 + ctx.measureText(label).width + 14;
  }
}

function labHTML() {
  return `
  <div class="mbl-wrap">
    <div class="mbl-scenario">
      Author an event stream and watch exactly how Spark plans it into <b>micro-batches</b> and
      executes each one. The whole trace is computed by the real engine — change any control and it
      re-derives. (Processing-time trigger groups by <b>arrival time</b>; if you leave arrivals blank,
      arrival = event time.)
    </div>

    <div class="mbl-grid">
      <div class="mbl-field">
        <label>Event times</label>
        <input type="text" id="mbl-events" value="${PRESETS.shopstream.events}">
        <div class="mbl-presets">${Object.entries(PRESETS)
          .map(([k, v]) => `<span class="mbl-chip" data-preset="${k}">${v.label}</span>`)
          .join('')}</div>
      </div>
      <div class="mbl-field">
        <label>Arrival times (optional, same count)</label>
        <input type="text" id="mbl-arrivals" placeholder="blank → arrival = event time">
        <div class="mbl-row" style="margin-top:4px">
          <span class="seg">Trigger
            <select id="mbl-trigger">
              <option value="processingTime">processingTime</option>
              <option value="availableNow">availableNow</option>
              <option value="once">once</option>
            </select>
          </span>
          <span class="seg" id="mbl-interval-wrap">interval <input type="range" id="mbl-interval" min="5" max="30" step="5" value="10"><b id="mbl-interval-v">10</b></span>
        </div>
      </div>
    </div>

    <div class="mbl-row" style="background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;padding:12px 16px">
      <span class="seg">Window
        <select id="mbl-wtype">
          <option value="tumbling">tumbling</option>
          <option value="sliding">sliding</option>
          <option value="session">session</option>
        </select>
      </span>
      <span class="seg" id="mbl-size-wrap">size <input type="range" id="mbl-size" min="5" max="25" step="5" value="10"><b id="mbl-size-v">10</b></span>
      <span class="seg" id="mbl-slide-wrap" style="display:none">slide <input type="range" id="mbl-slide" min="5" max="20" step="5" value="5"><b id="mbl-slide-v">5</b></span>
      <span class="seg" id="mbl-gap-wrap" style="display:none">gap <input type="range" id="mbl-gap" min="3" max="15" step="1" value="5"><b id="mbl-gap-v">5</b></span>
      <span class="seg">watermark <input type="range" id="mbl-delay" min="0" max="15" step="1" value="5"><b id="mbl-delay-v">5</b></span>
      <span class="seg">mode
        <select id="mbl-mode"><option>append</option><option>update</option><option>complete</option></select>
      </span>
      <span class="seg">agg
        <select id="mbl-agg"><option value="count">count</option><option value="sum">sum(value)</option></select>
      </span>
    </div>

    <div class="mbl-row">
      <button class="mbl-btn" id="mbl-reset">⟲ Reset</button>
      <button class="mbl-btn" id="mbl-back">◀ Back</button>
      <button class="mbl-btn primary" id="mbl-step">Step ▶</button>
      <button class="mbl-btn" id="mbl-play">⏯ Play</button>
      <span class="mbl-counter" id="mbl-counter">Batch 0 / 0</span>
    </div>

    <div class="mbl-canvas-wrap"><canvas id="mbl-canvas" width="860" height="230"></canvas></div>

    <div class="mbl-cols">
      <div class="mbl-card">
        <h4>Batch trace</h4>
        <div id="mbl-trace"><div class="mbl-empty">Press Step ▶ to run the first batch.</div></div>
      </div>
      <div class="mbl-card">
        <h4>Current batch</h4>
        <div id="mbl-current"><div class="mbl-empty">—</div></div>
      </div>
    </div>
  </div>`;
}

function howHTML() {
  return `
  <div style="max-width:760px;font-size:14px;line-height:1.75;color:var(--text-secondary)">
    <p>This sandbox runs the real <b>micro-batch engine</b> (<code>sim/microbatch-engine.js</code>).
    Your event list is planned into batches by the chosen <b>trigger</b>, then each batch is executed:
    late rows are dropped, windows accumulate state, the watermark advances, and rows are emitted per
    the output mode.</p>
    <ul>
      <li><b>Trigger</b> — <code>processingTime</code> buckets events by arrival interval (empty intervals
      appear as no-op batches); <code>availableNow</code> drains everything (optionally split); <code>once</code>
      runs a single batch.</li>
      <li><b>Watermark</b> = <code>max(eventTime) − delay</code>, monotonic. A row with
      <code>eventTime &lt; watermark</code> is dropped (append/update).</li>
      <li><b>Windows</b> — tumbling (one per row), sliding (overlapping), session (merge within the gap).</li>
      <li><b>Output mode</b> — append (emit a window once on close), update (changed rows), complete
      (full table, no eviction).</li>
    </ul>
    <p style="color:var(--text-muted);font-size:12.5px">Deterministic by construction — same inputs ⇒ identical
    trace (18 Node unit tests).</p>
  </div>`;
}

export function mount(container) {
  injectStyles();
  container.innerHTML = createModuleShell({
    tag: 'Lab · Micro-Batches',
    title: 'Micro-Batch Lab',
    subtitle: 'author a stream, pick a trigger/window/watermark/mode, and step through the exact batch trace',
    tabs: [
      { id: 'lab', label: '🧪 Lab', content: labHTML() },
      { id: 'how', label: '📖 How it works', content: howHTML() },
    ],
  });
  initTabs(container);

  const $ = (id) => container.querySelector(id);
  const state = {
    events: PRESETS.shopstream.events, arrivals: '',
    trigger: 'processingTime', interval: 10, maxEvents: 3,
    wtype: 'tumbling', size: 10, slide: 5, gap: 5,
    delay: 5, mode: 'append', agg: 'count',
    cursor: 0, batches: [], trace: [], playing: false, timer: null,
  };
  const canvas = $('#mbl-canvas');

  function recompute() {
    state.events = $('#mbl-events').value;
    state.arrivals = $('#mbl-arrivals').value;
    const evs = buildEvents(state.events, state.arrivals);
    const batches = evs.length ? planBatches(evs, triggerFrom(state)) : [];
    state.batches = batches.slice(0, 40); // safety cap
    state.trace = evs.length ? new MicroBatchQuery(cfgFrom(state)).run(state.batches).trace : [];
    if (state.cursor > state.batches.length) state.cursor = state.batches.length;
  }

  function render() {
    const N = state.batches.length;
    $('#mbl-counter').textContent = `Batch ${state.cursor} / ${N}`;
    $('#mbl-back').disabled = state.cursor === 0;
    $('#mbl-step').disabled = state.cursor >= N;

    drawTimeline(canvas, state.batches, state.trace, state.cursor, state);

    // trace table
    if (state.cursor === 0) {
      $('#mbl-trace').innerHTML = `<div class="mbl-empty">Press Step ▶ to run the first batch.</div>`;
    } else {
      const rows = state.trace.slice(0, state.cursor).map((e, i) => {
        const wm = `${fmtWm(e.watermarkBefore)}→${e.watermarkAfter}`;
        return `<tr class="${i === state.cursor - 1 ? 'cur' : ''}"><td>${i + 1}</td><td>${e.input}</td><td class="${e.droppedCount ? 'drop' : ''}">${e.droppedCount}</td><td>${wm}</td><td>${e.emitted.length}</td><td>${e.state.length}</td></tr>`;
      }).join('');
      $('#mbl-trace').innerHTML = `<table class="mbl-tbl"><thead><tr><th>batch</th><th>in</th><th>drop</th><th>watermark</th><th>emit</th><th>state</th></tr></thead><tbody>${rows}</tbody></table>`;
    }

    // current batch detail
    if (state.cursor === 0) {
      $('#mbl-current').innerHTML = `<div class="mbl-empty">—</div>`;
    } else {
      const e = state.trace[state.cursor - 1];
      const emit = e.emitted.length
        ? `<table class="mbl-tbl"><thead><tr><th>window</th><th>val</th></tr></thead><tbody>${e.emitted
            .map((r) => `<tr><td>${keyStr(r)}${winLabel(r.window)}</td><td>${r.value}</td></tr>`)
            .join('')}</tbody></table>`
        : `<div class="mbl-empty">nothing emitted</div>`;
      const dropLine = e.droppedCount
        ? `<div style="padding:8px 14px;color:var(--red);font-size:12px">${e.droppedCount} late record${e.droppedCount === 1 ? '' : 's'} dropped</div>`
        : '';
      $('#mbl-current').innerHTML =
        `<div class="mbl-emit" style="padding:8px 14px;font-size:12.5px;color:var(--text-secondary)">Batch ${state.cursor}: <b>${e.input}</b> in, watermark <b>${fmtWm(e.watermarkBefore)}→${e.watermarkAfter}</b>, <b>${e.emitted.length}</b> emitted, <b>${e.state.length}</b> in state.</div>${dropLine}<div style="padding:0 0 6px"><div style="padding:6px 14px 2px;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);font-weight:700">Emitted this batch</div>${emit}</div>`;
    }
  }

  function stopPlay() {
    state.playing = false;
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
    $('#mbl-play').classList.remove('primary');
  }
  function reapply() { stopPlay(); state.cursor = 0; recompute(); render(); }
  function syncVisibility() {
    $('#mbl-interval-wrap').style.display = state.trigger === 'processingTime' ? '' : 'none';
    $('#mbl-size-wrap').style.display = state.wtype === 'session' ? 'none' : '';
    $('#mbl-slide-wrap').style.display = state.wtype === 'sliding' ? '' : 'none';
    $('#mbl-gap-wrap').style.display = state.wtype === 'session' ? '' : 'none';
  }

  // Controls
  container.querySelectorAll('[data-preset]').forEach((chip) =>
    chip.addEventListener('click', () => {
      const p = PRESETS[chip.dataset.preset];
      $('#mbl-events').value = p.events;
      $('#mbl-arrivals').value = p.arrivals;
      reapply();
    })
  );
  $('#mbl-events').addEventListener('change', reapply);
  $('#mbl-arrivals').addEventListener('change', reapply);
  $('#mbl-trigger').addEventListener('change', (e) => { state.trigger = e.target.value; syncVisibility(); reapply(); });
  $('#mbl-interval').addEventListener('input', (e) => { state.interval = Number(e.target.value); $('#mbl-interval-v').textContent = e.target.value; reapply(); });
  $('#mbl-wtype').addEventListener('change', (e) => { state.wtype = e.target.value; syncVisibility(); reapply(); });
  $('#mbl-size').addEventListener('input', (e) => { state.size = Number(e.target.value); $('#mbl-size-v').textContent = e.target.value; reapply(); });
  $('#mbl-slide').addEventListener('input', (e) => { state.slide = Number(e.target.value); $('#mbl-slide-v').textContent = e.target.value; reapply(); });
  $('#mbl-gap').addEventListener('input', (e) => { state.gap = Number(e.target.value); $('#mbl-gap-v').textContent = e.target.value; reapply(); });
  $('#mbl-delay').addEventListener('input', (e) => { state.delay = Number(e.target.value); $('#mbl-delay-v').textContent = e.target.value; reapply(); });
  $('#mbl-mode').addEventListener('change', (e) => { state.mode = e.target.value; reapply(); });
  $('#mbl-agg').addEventListener('change', (e) => { state.agg = e.target.value; reapply(); });

  $('#mbl-step').addEventListener('click', () => { if (state.cursor < state.batches.length) { state.cursor++; render(); } if (state.cursor >= state.batches.length) stopPlay(); });
  $('#mbl-back').addEventListener('click', () => { if (state.cursor > 0) { state.cursor--; render(); } });
  $('#mbl-reset').addEventListener('click', () => { stopPlay(); state.cursor = 0; render(); });
  $('#mbl-play').addEventListener('click', () => {
    if (state.playing) { stopPlay(); return; }
    if (state.cursor >= state.batches.length) state.cursor = 0;
    state.playing = true; $('#mbl-play').classList.add('primary');
    state.timer = setInterval(() => {
      if (state.cursor < state.batches.length) { state.cursor++; render(); }
      if (state.cursor >= state.batches.length) stopPlay();
    }, 1200);
  });

  syncVisibility();
  recompute();
  render();
  return () => stopPlay();
}

export default { mount };
