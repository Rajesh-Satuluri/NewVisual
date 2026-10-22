// Watermark Propagation Lab — set each source partition's watermark and toggle
// idleness; watch the operator watermark track the MIN of non-idle inputs and
// decide which event-time window can fire. Real rule (sim/engine.js).
import { operatorWatermark } from '../sim/engine.js';

const WINDOW_END = 60; // the window [50s, 60s) fires when watermark >= 60

export function mount(container) {
  const parts = [
    { wm: 72, idle: false },
    { wm: 58, idle: false },
    { wm: 65, idle: false },
    { wm: 40, idle: false },
  ];

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">💧 Lab · Watermark Propagation</div>
        <h1 class="module-title">Watermark Propagation Lab</h1>
        <p class="module-subtitle">A downstream operator's watermark is the <strong>minimum</strong> across its input partitions — so one lagging (or idle) partition holds everyone back. Drag each partition's watermark and toggle idleness to see the operator watermark and whether the window <code>[50s, 60s)</code> fires. Real rule, deterministic.</p>
      </div>
      <div class="tab-content active">
        <div id="wl-parts"></div>
        <div id="wl-out"></div>
        <div class="lab-ledger">🔎 <strong>Honesty ledger:</strong> the operator watermark is computed as <code>min()</code> over non-idle inputs — exactly Flink's rule for combining input-channel watermarks. <code>withIdleness()</code> is modelled by excluding a partition from the min. No events are actually streamed; this is a faithful model of the propagation rule.</div>
      </div>
    </div>`;

  const partsEl = container.querySelector('#wl-parts');
  const outEl = container.querySelector('#wl-out');

  function renderParts() {
    partsEl.innerHTML = parts.map((p, i) => `
      <div class="wl-part ${p.idle ? 'idle' : ''}">
        <div class="wl-part-head">
          <span>Partition ${i}</span>
          <label class="wl-idle"><input type="checkbox" data-idle="${i}" ${p.idle ? 'checked' : ''} /> idle</label>
        </div>
        <div class="wl-part-ctl">
          <input type="range" data-wm="${i}" min="0" max="100" step="1" value="${p.wm}" ${p.idle ? 'disabled' : ''} aria-label="Partition ${i} watermark" />
          <span class="wl-wm-val">${p.idle ? '—' : p.wm + 's'}</span>
        </div>
      </div>`).join('');
    partsEl.querySelectorAll('[data-wm]').forEach(el => el.addEventListener('input', () => {
      parts[Number(el.dataset.wm)].wm = Number(el.value); render();
    }));
    partsEl.querySelectorAll('[data-idle]').forEach(el => el.addEventListener('change', () => {
      parts[Number(el.dataset.idle)].idle = el.checked; render();
    }));
  }

  function render() {
    renderParts();
    const idleSet = new Set(parts.map((p, i) => p.idle ? i : -1).filter(i => i >= 0));
    const opWm = operatorWatermark(parts.map(p => p.wm), idleSet);
    const fires = opWm != null && opWm >= WINDOW_END;
    const allIdle = opWm == null;
    outEl.innerHTML = `
      <div class="wl-result ${fires ? 'fires' : allIdle ? 'stalled' : 'waiting'}">
        <div class="wl-op">
          <div class="wl-op-label">Operator watermark</div>
          <div class="wl-op-val">${allIdle ? 'frozen' : opWm + 's'}</div>
        </div>
        <div class="wl-verdict">
          ${allIdle
            ? '⚠️ <strong>Every input is idle</strong> — the watermark cannot advance and <em>no</em> window fires. This is the classic "pipeline looks frozen" incident.'
            : fires
              ? '✅ Operator watermark has passed 60s → window <code>[50s, 60s)</code> <strong>fires</strong> and emits its result.'
              : `⏳ Window <code>[50s, 60s)</code> is <strong>held open</strong>: the slowest non-idle partition pins the watermark at ${opWm}s (&lt; 60s). Mark a truly-silent partition idle to let it advance.`}
        </div>
      </div>`;
  }

  render();
  return () => {};
}
