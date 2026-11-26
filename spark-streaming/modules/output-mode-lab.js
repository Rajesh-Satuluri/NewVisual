// Output-Mode Lab (L1) — the flagship interactive that proves the depth bar.
//
// Runs THREE MicroBatchQuery instances (append / update / complete) in lockstep
// over the SAME ShopStream micro-batches, so you can see, batch by batch, the
// exact rows each output mode emits — all driven by the real E1 keystone engine
// (sim/microbatch-engine.js). Nothing here is scripted; every row comes from the
// engine, so changing the window size or watermark delay re-derives everything.
//
// PAGE route → must self-wire its tabs via initTabs(container).

import { createModuleShell, initTabs } from '../components/module-shell.js';
import { MicroBatchQuery } from '../sim/microbatch-engine.js';

// ── ShopStream scenario ──────────────────────────────────────────────────────
// Orders counted into N-second tumbling windows. Each batch is one 10s trigger.
// eventTime is in seconds. One deliberately-late order (et 6 in batch 2) shows
// how append/update DROP it while complete KEEPS it — the key teaching contrast.
const BATCHES = [
  [{ eventTime: 2 }, { eventTime: 4 }, { eventTime: 8 }],              // B0
  [{ eventTime: 11 }, { eventTime: 14 }, { eventTime: 7 }],            // B1
  [{ eventTime: 21 }, { eventTime: 25 }, { eventTime: 6 }, { eventTime: 12 }], // B2 (et6 late)
  [{ eventTime: 31 }],                                                 // B3
  [{ eventTime: 45 }],                                                 // B4
];
const N = BATCHES.length;
const EVENTS = BATCHES.flatMap((b, bi) => b.map((r, ri) => ({ ...r, batch: bi, ri })));
const T_MAX = 50;
const MODES = ['append', 'update', 'complete'];

const STYLE_ID = 'oml-styles';
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
  .oml-wrap{display:flex;flex-direction:column;gap:18px}
  .oml-scenario{background:var(--bg-card);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:12px;padding:14px 18px;font-size:13.5px;line-height:1.65;color:var(--text-secondary)}
  .oml-scenario b{color:var(--text-primary)}
  .oml-canvas-wrap{background:#0A0E1A;border:1px solid var(--border);border-radius:12px;padding:12px}
  .oml-canvas-wrap canvas{width:100%;max-width:840px;display:block;margin:0 auto}
  .oml-controls{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;padding:12px 16px}
  .oml-controls .grp{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text-secondary)}
  .oml-controls input[type=range]{accent-color:var(--accent)}
  .oml-btn{background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-primary);border-radius:8px;padding:7px 12px;font-size:13px;cursor:pointer;font-weight:600}
  .oml-btn:hover{border-color:var(--accent);color:var(--accent-text,var(--accent))}
  .oml-btn:disabled{opacity:.4;cursor:not-allowed}
  .oml-btn.primary{background:var(--accent);border-color:var(--accent);color:#0A0E1A}
  .oml-counter{font-family:var(--font-mono);font-size:13px;color:var(--text-primary);font-weight:700}
  .oml-batchbar{display:flex;flex-wrap:wrap;gap:16px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px 16px;font-size:12.5px;color:var(--text-secondary)}
  .oml-batchbar .k{color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;font-size:10px;font-weight:700;display:block}
  .oml-batchbar .v{font-family:var(--font-mono);font-size:14px;color:var(--text-primary);font-weight:700}
  .oml-panels{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  @media(max-width:860px){.oml-panels{grid-template-columns:1fr}}
  .oml-panel{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:0;overflow:hidden;display:flex;flex-direction:column}
  .oml-panel h4{margin:0;padding:12px 14px;font-size:13px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)}
  .oml-panel.append h4{background:color-mix(in srgb,var(--green) 14%,transparent);color:var(--green)}
  .oml-panel.update h4{background:color-mix(in srgb,var(--blue) 14%,transparent);color:var(--blue)}
  .oml-panel.complete h4{background:color-mix(in srgb,var(--purple) 14%,transparent);color:var(--purple)}
  .oml-panel .sub{font-size:10.5px;color:var(--text-muted);padding:8px 14px 2px;text-transform:uppercase;letter-spacing:.05em;font-weight:700}
  .oml-tbl{width:100%;border-collapse:collapse;font-size:12.5px;font-family:var(--font-mono)}
  .oml-tbl th{text-align:left;color:var(--text-muted);font-weight:600;padding:4px 14px;font-size:10.5px}
  .oml-tbl td{padding:4px 14px;color:var(--text-primary);border-top:1px solid color-mix(in srgb,var(--border) 60%,transparent)}
  .oml-tbl tr.new td{background:color-mix(in srgb,var(--accent) 12%,transparent)}
  .oml-empty{padding:10px 14px 14px;color:var(--text-muted);font-size:12px;font-style:italic}
  .oml-statesz{padding:8px 14px 12px;font-size:11.5px;color:var(--text-secondary)}
  .oml-statesz b{font-family:var(--font-mono);color:var(--text-primary)}
  .oml-why{background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;padding:14px 18px;font-size:13px;line-height:1.7;color:var(--text-secondary)}
  .oml-why b{color:var(--text-primary)}
  .oml-why .tag{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);margin-bottom:6px}
  `;
  document.head.appendChild(s);
}

const winLabel = (w) => `[${w.start}, ${w.end})`;

// Replay all three modes for a given window size + watermark delay.
function computeRuns(size, delay) {
  const runs = {};
  for (const mode of MODES) {
    const q = new MicroBatchQuery({
      window: { type: 'tumbling', size },
      watermarkDelay: delay,
      outputMode: mode,
      aggregate: { fn: 'count' },
    });
    runs[mode] = BATCHES.map((b) => q.processBatch(b));
  }
  return runs;
}

// Build the sink (downstream table) contents for a mode at a given cursor.
function sinkAt(mode, entries, cursor) {
  if (cursor === 0) return [];
  if (mode === 'complete') return entries[cursor - 1].emitted.slice();
  const map = new Map();
  for (let i = 0; i < cursor; i++) {
    for (const r of entries[i].emitted) map.set(winLabel(r.window), r); // append & update: upsert by window
  }
  return [...map.values()].sort((a, b) => a.window.start - b.window.start);
}

function rowsTable(rows, newKeys) {
  if (!rows.length) return '<div class="oml-empty">— nothing —</div>';
  return `<table class="oml-tbl"><thead><tr><th>window (s)</th><th>orders</th></tr></thead><tbody>${rows
    .map(
      (r) =>
        `<tr class="${newKeys && newKeys.has(winLabel(r.window)) ? 'new' : ''}"><td>${winLabel(
          r.window
        )}</td><td>${r.value}</td></tr>`
    )
    .join('')}</tbody></table>`;
}

function drawCanvas(canvas, runs, cursor, size) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0A0E1A';
  ctx.fillRect(0, 0, W, H);
  const ml = 44, mr = 20, baseY = H - 46;
  const xOf = (t) => ml + (t / T_MAX) * (W - ml - mr);

  // window gridlines
  ctx.font = '10px ui-monospace,monospace';
  for (let s = 0; s <= T_MAX; s += size) {
    const x = xOf(s);
    ctx.strokeStyle = 'rgba(148,163,184,0.16)';
    ctx.beginPath(); ctx.moveTo(x, 28); ctx.lineTo(x, baseY); ctx.stroke();
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.fillText(String(s), x + 2, baseY + 14);
  }
  ctx.fillStyle = 'rgba(148,163,184,0.7)';
  ctx.fillText('event time (s) →', W - 128, baseY + 30);

  // watermark (append/update share it)
  if (cursor > 0) {
    const wm = runs.append[cursor - 1].watermarkAfter;
    if (isFinite(wm) && wm >= 0) {
      const x = xOf(wm);
      ctx.strokeStyle = '#06B6D4';
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, baseY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#06B6D4';
      ctx.fillText(`watermark = ${wm}`, Math.min(x + 4, W - 110), 16);
    }
  }

  // events
  for (const ev of EVENTS) {
    const processed = ev.batch < cursor;
    const current = ev.batch === cursor - 1;
    const wmBefore = processed ? runs.append[ev.batch].watermarkBefore : null;
    const dropped = processed && isFinite(wmBefore) && ev.eventTime < wmBefore;
    const x = xOf(ev.eventTime);
    const y = baseY - 16 - ev.ri * 16;
    ctx.beginPath();
    ctx.arc(x, y, current ? 7 : 5.5, 0, Math.PI * 2);
    if (!processed) { ctx.fillStyle = 'rgba(148,163,184,0.28)'; }
    else if (dropped) { ctx.fillStyle = '#EF4444'; }
    else { ctx.fillStyle = current ? '#F59E0B' : '#10B981'; }
    ctx.fill();
    if (current) { ctx.strokeStyle = '#FDE68A'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1; }
    if (dropped) { // strike through dropped
      ctx.strokeStyle = '#EF4444'; ctx.beginPath();
      ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.stroke();
    }
  }

  // legend
  const leg = [['#10B981', 'processed'], ['#F59E0B', 'this batch'], ['#EF4444', 'dropped (late)'], ['rgba(148,163,184,0.4)', 'not yet read']];
  let lx = ml;
  ctx.font = '11px ui-monospace,monospace';
  for (const [c, label] of leg) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(lx, 14, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(203,213,225,0.85)'; ctx.fillText(label, lx + 10, 18);
    lx += 24 + ctx.measureText(label).width + 16;
  }
}

function labHTML() {
  return `
  <div class="oml-wrap">
    <div class="oml-scenario">
      <b>ShopStream</b> counts orders into <b>tumbling windows</b>. Below, the <i>same</i> order
      stream is fed to all three output modes at once, one 10-second micro-batch at a time.
      Watch when each mode emits a window — and note the one <b style="color:var(--red)">late order</b>
      (event time 6, arriving in batch 2) that append &amp; update <b>drop</b> but complete <b>keeps</b>.
    </div>

    <div class="oml-controls">
      <button class="oml-btn" id="oml-reset">⟲ Reset</button>
      <button class="oml-btn" id="oml-back">◀ Back</button>
      <button class="oml-btn primary" id="oml-step">Step ▶</button>
      <button class="oml-btn" id="oml-play">⏯ Play</button>
      <span class="oml-counter" id="oml-counter">Batch 0 / ${N}</span>
      <span class="grp">Window size <input type="range" id="oml-size" min="5" max="20" step="5" value="10"><b id="oml-size-v">10s</b></span>
      <span class="grp">Watermark delay <input type="range" id="oml-delay" min="0" max="15" step="5" value="5"><b id="oml-delay-v">5s</b></span>
    </div>

    <div class="oml-canvas-wrap"><canvas id="oml-canvas" width="840" height="240"></canvas></div>

    <div class="oml-batchbar">
      <div><span class="k">Records in batch</span><span class="v" id="oml-bb-in">—</span></div>
      <div><span class="k">Watermark</span><span class="v" id="oml-bb-wm">—</span></div>
      <div><span class="k">Dropped (late)</span><span class="v" id="oml-bb-drop">—</span></div>
    </div>

    <div class="oml-panels">
      ${MODES.map(
        (m) => `
      <div class="oml-panel ${m}">
        <h4>${m[0].toUpperCase() + m.slice(1)} <span style="font-size:10px;opacity:.8">${
          m === 'append' ? 'closed windows' : m === 'update' ? 'changed rows' : 'full table'
        }</span></h4>
        <div class="sub">Emitted this batch</div>
        <div id="oml-emit-${m}"><div class="oml-empty">— nothing —</div></div>
        <div class="sub">Sink contents</div>
        <div id="oml-sink-${m}"><div class="oml-empty">— empty —</div></div>
        <div class="oml-statesz" id="oml-state-${m}"></div>
      </div>`
      ).join('')}
    </div>

    <div class="oml-why">
      <span class="tag">Why these rows?</span>
      <div id="oml-why">Press <b>Step ▶</b> to feed the first micro-batch.</div>
    </div>
  </div>`;
}

function howHTML() {
  return `
  <div style="max-width:760px;font-size:14px;line-height:1.75;color:var(--text-secondary)">
    <p>This lab is driven by the real <b>micro-batch engine</b> (<code>sim/microbatch-engine.js</code>) —
    the same deterministic, unit-tested keystone the modules use. Three independent query instances run
    over the identical batch sequence; the only difference is the <b>output mode</b>.</p>
    <h3 style="color:var(--text-primary)">The three modes</h3>
    <ul>
      <li><b style="color:var(--green)">Append</b> — a window's row is emitted <b>once</b>, only after the
      watermark passes the window's end; then its state is evicted. This is why append output never changes
      a row it already wrote, and why it <b>requires a watermark</b> for windowed aggregation.</li>
      <li><b style="color:var(--blue)">Update</b> — every batch emits the rows whose aggregate <b>changed</b>
      in that batch. A window can be emitted many times as new orders land, then is evicted once the
      watermark passes it.</li>
      <li><b style="color:var(--purple)">Complete</b> — the <b>entire result table</b> is emitted every
      batch, unchanged rows included. Complete mode <b>never drops late data and never evicts state</b>,
      so its state is <b>unbounded</b> — watch the late order (et 6) raise the <code>[0, 10)</code> count
      in complete only.</li>
    </ul>
    <h3 style="color:var(--text-primary)">Watermark</h3>
    <p>After each batch the watermark becomes <code>max(event time seen) − delay</code> and only ever moves
    forward. In append/update a record with <code>eventTime &lt; watermark</code> is dropped as late.
    Increase the watermark delay to keep late orders; shrink it to drop more and close windows sooner.</p>
    <p style="color:var(--text-muted);font-size:12.5px">Honest by construction: every number above is computed
    by the engine, not scripted. Same inputs ⇒ identical result (verified by 18 Node unit tests).</p>
  </div>`;
}

export function mount(container) {
  injectStyles();
  container.innerHTML = createModuleShell({
    tag: 'Lab · Output Modes',
    title: 'Output-Mode Lab',
    subtitle: 'append vs update vs complete — the exact rows each emits, batch by batch, on one ShopStream stream',
    tabs: [
      { id: 'lab', label: '🧪 Lab', content: labHTML() },
      { id: 'how', label: '📖 How it works', content: howHTML() },
    ],
  });
  initTabs(container);

  const state = { cursor: 0, size: 10, delay: 5, playing: false, timer: null, runs: computeRuns(10, 5) };
  const $ = (id) => container.querySelector(id);
  const canvas = $('#oml-canvas');

  function recompute() {
    state.runs = computeRuns(state.size, state.delay);
    if (state.cursor > N) state.cursor = N;
  }

  function render() {
    const { cursor, size, runs } = state;
    $('#oml-counter').textContent = `Batch ${cursor} / ${N}`;
    $('#oml-size-v').textContent = `${size}s`;
    $('#oml-delay-v').textContent = `${state.delay}s`;
    $('#oml-back').disabled = cursor === 0;
    $('#oml-step').disabled = cursor >= N;

    drawCanvas(canvas, runs, cursor, size);

    // batch bar (append/update share the watermark + drop count)
    if (cursor === 0) {
      $('#oml-bb-in').textContent = '—';
      $('#oml-bb-wm').textContent = '—';
      $('#oml-bb-drop').textContent = '—';
    } else {
      const e = runs.append[cursor - 1];
      const wmB = isFinite(e.watermarkBefore) ? e.watermarkBefore : '−∞';
      $('#oml-bb-in').textContent = String(e.input);
      $('#oml-bb-wm').textContent = `${wmB} → ${e.watermarkAfter}`;
      $('#oml-bb-drop').textContent = String(e.droppedCount);
    }

    for (const m of MODES) {
      const entries = runs[m];
      const emitted = cursor === 0 ? [] : entries[cursor - 1].emitted;
      const sink = sinkAt(m, entries, cursor);
      const newKeys = new Set(emitted.map((r) => winLabel(r.window)));
      $(`#oml-emit-${m}`).innerHTML = rowsTable(emitted, null);
      $(`#oml-sink-${m}`).innerHTML = rowsTable(sink, newKeys);
      const stateSize = cursor === 0 ? 0 : entries[cursor - 1].state.length;
      $(`#oml-state-${m}`).innerHTML = `State retained: <b>${stateSize}</b> window${stateSize === 1 ? '' : 's'}`;
    }

    $('#oml-why').innerHTML = whyText(state);
  }

  function whyText(st) {
    const { cursor, runs } = st;
    if (cursor === 0) return 'Press <b>Step ▶</b> to feed the first micro-batch.';
    const e = runs.append[cursor - 1];
    const a = e.emitted.length;
    const u = runs.update[cursor - 1].emitted.length;
    const c = runs.complete[cursor - 1].emitted.length;
    const wmB = isFinite(e.watermarkBefore) ? e.watermarkBefore : '−∞';
    let msg = `<b>Batch ${cursor}:</b> ${e.input} record${e.input === 1 ? '' : 's'} in; watermark ${wmB} → <b>${e.watermarkAfter}</b>`;
    if (e.droppedCount) msg += `; <b style="color:var(--red)">${e.droppedCount} late record dropped</b> (append &amp; update only — complete kept it)`;
    msg += `. <b style="color:var(--green)">Append</b> emitted ${a} closed window${a === 1 ? '' : 's'}`;
    msg += a ? ' (watermark just passed their end).' : ' (no window has closed yet).';
    msg += ` <b style="color:var(--blue)">Update</b> emitted ${u} changed row${u === 1 ? '' : 's'}.`;
    msg += ` <b style="color:var(--purple)">Complete</b> re-emitted its full ${c}-row table.`;
    return msg;
  }

  function stopPlay() {
    state.playing = false;
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
    $('#oml-play').classList.remove('primary');
  }

  $('#oml-step').addEventListener('click', () => { if (state.cursor < N) { state.cursor++; render(); } if (state.cursor >= N) stopPlay(); });
  $('#oml-back').addEventListener('click', () => { if (state.cursor > 0) { state.cursor--; render(); } });
  $('#oml-reset').addEventListener('click', () => { stopPlay(); state.cursor = 0; render(); });
  $('#oml-play').addEventListener('click', () => {
    if (state.playing) { stopPlay(); return; }
    if (state.cursor >= N) state.cursor = 0;
    state.playing = true;
    $('#oml-play').classList.add('primary');
    state.timer = setInterval(() => {
      if (state.cursor < N) { state.cursor++; render(); }
      if (state.cursor >= N) stopPlay();
    }, 1300);
  });
  $('#oml-size').addEventListener('input', (e) => { state.size = Number(e.target.value); recompute(); render(); });
  $('#oml-delay').addEventListener('input', (e) => { state.delay = Number(e.target.value); recompute(); render(); });

  render();
  return () => stopPlay();
}

export default { mount };
