// ── Metrics time-series + alerting (live canvas sim) ────────────────────────
// A monitoring system ingests a stream of metric samples, stores them as a time
// series, and fires an alert when a value crosses a threshold. Watch a live
// metric scroll by, drag the threshold, inject a spike, and see the alert trip.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, withAlpha, label } from './_sim.js';

export function mount(container) {
  const N = 140;              // samples shown
  const buf = new Array(N).fill(40);
  let threshold = 75, value = 40, spike = 0, paused = false;
  let alerts = 0, alerting = false, acc = 0;

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="ms-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="ms-spike">⚡ Inject spike</button>
        <button class="sd-btn" id="ms-pause">⏸ Pause</button>
        <label class="wg-switch">threshold
          <input type="range" id="ms-th" min="30" max="95" step="1" value="75" style="width:120px">
          <b id="ms-thv" style="color:var(--text)">75</b>
        </label>
      </div>`,
    caption: 'Samples are ingested continuously and appended to a time series. When the latest value crosses the threshold the system enters an alerting state and fires an alert — the core loop behind Prometheus/Datadog-style monitoring.',
  });

  const ctx = fitCanvas(canvas, 640, 280);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#ms-note');

  $('#ms-spike').addEventListener('click', () => spike += 45);
  $('#ms-pause').addEventListener('click', (e) => { paused = !paused; e.target.textContent = paused ? '▶ Resume' : '⏸ Pause'; });
  $('#ms-th').addEventListener('input', e => { threshold = +e.target.value; $('#ms-thv').textContent = threshold; });

  function step(dt) {
    if (paused) return;
    acc += dt;
    while (acc >= 0.08) {       // ~12 samples/sec
      acc -= 0.08;
      value += (Math.random() - 0.5) * 8 + spike; spike *= 0.6;
      value = Math.max(5, Math.min(100, value));
      buf.push(value); buf.shift();
      const was = alerting; alerting = value > threshold;
      if (alerting && !was) alerts++;
    }
  }

  function py(v) { return 240 - (v / 100) * 210; }

  function draw() {
    ctx.clearRect(0, 0, 640, 280);
    // grid
    ctx.strokeStyle = withAlpha(pal.border, 0.6); ctx.lineWidth = 1;
    for (let g = 0; g <= 100; g += 25) { ctx.beginPath(); ctx.moveTo(40, py(g)); ctx.lineTo(630, py(g)); ctx.stroke(); label(ctx, '' + g, 28, py(g), { color: pal.text3, size: 9, align: 'right' }); }
    // threshold line
    ctx.strokeStyle = pal.red; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(40, py(threshold)); ctx.lineTo(630, py(threshold)); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, `threshold ${threshold}`, 628, py(threshold) - 9, { color: pal.red, size: 10, weight: 700, align: 'right' });
    // series
    const col = alerting ? pal.red : pal.green;
    ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = col;
    for (let i = 0; i < N; i++) { const x = 40 + (i / (N - 1)) * 590, y = py(buf[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    // fill under
    ctx.lineTo(630, 240); ctx.lineTo(40, 240); ctx.closePath(); ctx.fillStyle = withAlpha(col, 0.12); ctx.fill();
    // head dot
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(630, py(buf[N - 1]), 4, 0, Math.PI * 2); ctx.fill();
    if (alerting) label(ctx, '🚨 ALERTING', 335, 20, { color: pal.red, size: 14, weight: 800 });
    note.innerHTML = `value <b>${Math.round(value)}</b> · threshold <b>${threshold}</b> · state <b style="color:var(--${alerting ? 'red' : 'green'})">${alerting ? 'ALERTING' : 'OK'}</b> · alerts fired <b>${alerts}</b>`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
