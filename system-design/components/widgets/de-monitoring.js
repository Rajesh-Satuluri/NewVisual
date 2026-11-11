// ── Pipeline monitoring & SLA (live canvas sim) ─────────────────────────────
// Scheduled pipeline runs land as duration bars against an SLA deadline. On-time
// runs keep freshness green; a slow or missed run breaches the SLA and fires an
// alert. Watch freshness climb between runs and reset on each success.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  const runs = [];        // {start, dur, breach}
  let T = 0, nextRun = 1.5, lastSuccess = 0, onTime = 0, breaches = 0, forceSlow = false, running = null;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="mn-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="mn-slow">🐢 Make next run slow</button>
      </div>`,
    caption: 'A pipeline’s SLA is a freshness deadline. The monitor compares each run’s completion against it: on-time runs keep the data fresh (green), a slow or missed run breaches the SLA and alerts — ideally before any stakeholder sees stale numbers. Freshness is the heartbeat signal.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#mn-note');

  const SLA = 2.2;        // seconds allowed per run
  $('#mn-slow').addEventListener('click', () => { forceSlow = true; });

  const VSPAN = 10, LEFT = 60, RIGHT = 624, Y = 150;
  const xFor = t => LEFT + ((t - (T - VSPAN)) / VSPAN) * (RIGHT - LEFT);

  function step(dt) {
    T += dt * 0.8;
    if (!running && T >= nextRun) {
      const slow = forceSlow || Math.random() < 0.18;
      forceSlow = false;
      running = { start: T, dur: slow ? SLA + 1 + Math.random() : 0.8 + Math.random() * 1.0, breach: false };
    }
    if (running && T >= running.start + running.dur) {
      running.breach = running.dur > SLA;
      if (running.breach) breaches++; else { onTime++; lastSuccess = T; }
      runs.push(running); running = null; nextRun = T + 1 + Math.random() * 0.6;
    }
    while (runs.length && runs[0].start < T - VSPAN - 1) runs.shift();
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    label(ctx, 'pipeline runs vs SLA deadline', 330, 30, { color: pal.text2, size: 12, weight: 800 });

    // baseline
    ctx.strokeStyle = withAlpha(pal.border, 0.9); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(LEFT, Y); ctx.lineTo(RIGHT, Y); ctx.stroke();

    // completed runs as bars
    const drawRun = (r, live) => {
      const x0 = xFor(r.start); let end = live ? Math.min(r.start + r.dur, T) : r.start + r.dur;
      const x1 = xFor(end);
      if (x1 < LEFT - 4) return;
      const overSla = (end - r.start) > SLA;
      const col = (live ? (overSla ? pal.red : pal.accent) : (r.breach ? pal.red : pal.green));
      roundRect(ctx, Math.max(LEFT, x0), Y - 16, Math.max(3, x1 - Math.max(LEFT, x0)), 32, 4);
      ctx.fillStyle = withAlpha(col, 0.45); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke();
      // SLA tick for this run
      const sx = xFor(r.start + SLA);
      if (sx > LEFT && sx < RIGHT) { ctx.strokeStyle = withAlpha(pal.amber, 0.8); ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, Y - 24); ctx.lineTo(sx, Y + 24); ctx.stroke(); ctx.setLineDash([]); }
      if (!live && r.breach && x1 > LEFT) label(ctx, '🚨 SLA breach', (x0 + x1) / 2, Y - 26, { color: pal.red, size: 9, weight: 800 });
    };
    runs.forEach(r => drawRun(r, false));
    if (running) drawRun(running, true);

    label(ctx, '┆ = SLA deadline', RIGHT, Y + 40, { color: pal.amber, size: 9, weight: 600, align: 'right' });

    // freshness gauge
    const freshness = T - lastSuccess;
    const fcol = freshness > SLA * 1.6 ? pal.red : freshness > SLA ? pal.amber : pal.green;
    label(ctx, '🫀 freshness (since last success)', 150, 230, { color: pal.text2, size: 10, weight: 700, align: 'left' });
    roundRect(ctx, 150, 244, 300, 14, 5); ctx.fillStyle = withAlpha(pal.bg3, 0.6); ctx.fill();
    roundRect(ctx, 150, 244, 300 * Math.min(1, freshness / (SLA * 2)), 14, 5); ctx.fillStyle = fcol; ctx.fill();
    label(ctx, `${freshness.toFixed(1)}s`, 462, 251, { color: fcol, size: 10, weight: 800, align: 'left' });

    note.innerHTML = `on-time <b style="color:var(--green)">${onTime}</b> · SLA breaches <b style="color:var(--red)">${breaches}</b> · freshness <b style="color:var(--${fcol === pal.green ? 'green' : fcol === pal.amber ? 'amber' : 'red'})">${freshness.toFixed(1)}s</b> (SLA ${SLA}s)`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
