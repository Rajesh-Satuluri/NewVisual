// ── Watermarking & late data (live canvas sim) ──────────────────────────────
// Events arrive out of order on an event-time axis. A watermark advances at
// (max event time seen − allowed lateness); when it passes a window's end the
// window fires. Events behind the watermark are late and get dropped. Adjust
// the lateness margin and inject a late event.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const VSPAN = 11, WIN = 2.5;

export function mount(container) {
  let T = 8, lateness = 1.2, maxEt = 8, spawnAcc = 0;
  let onTime = 0, late = 0, fired = 0, lastFired = -1;
  const events = [];      // {et, late}

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="wm-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="wm-late">⏱️ Inject late event</button>
        <button class="sd-btn" id="wm-up">💧 Lateness +</button>
        <button class="sd-btn" id="wm-dn">💧 Lateness −</button>
      </div>`,
    caption: 'The watermark = max event time seen − allowed lateness. It advances as data flows; when it passes a window’s end the window fires. Events arriving behind the watermark are late and dropped. A bigger lateness margin catches more stragglers but fires later — the freshness-vs-completeness dial.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#wm-note');

  const LEFT = 60, RIGHT = 624, Y = 170;
  function watermark() { return maxEt - lateness; }
  const xFor = et => LEFT + ((et - (T - VSPAN)) / VSPAN) * (RIGHT - LEFT);

  function addEvent(et) {
    const isLate = et < watermark();
    events.push({ et, late: isLate });
    if (isLate) late++; else { onTime++; maxEt = Math.max(maxEt, et); }
  }
  $('#wm-late').addEventListener('click', () => addEvent(watermark() - 0.4 - Math.random() * 1.2));
  $('#wm-up').addEventListener('click', () => { lateness = Math.min(3, lateness + 0.4); });
  $('#wm-dn').addEventListener('click', () => { lateness = Math.max(0.2, lateness - 0.4); });

  function step(dt) {
    T += dt * 0.7;
    spawnAcc += dt;
    while (spawnAcc >= 0.55) {
      spawnAcc -= 0.55;
      // mostly on-time (slightly out of order), occasionally a straggler
      const et = Math.random() < 0.18 ? T - 0.8 - Math.random() * 1.6 : T - Math.random() * 0.4;
      addEvent(et);
    }
    while (events.length && events[0].et < T - VSPAN - 1) events.shift();
    // fire windows the watermark has passed
    const wk = Math.floor(watermark() / WIN) - 1;
    if (wk > lastFired && wk >= 0) { lastFired = wk; fired++; }
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    const wm = watermark();
    // windows
    const startK = Math.floor((T - VSPAN) / WIN), endK = Math.floor(T / WIN);
    for (let k = startK; k <= endK; k++) {
      const a = k * WIN, b = a + WIN;
      let x0 = Math.max(LEFT, xFor(a)), x1 = Math.min(RIGHT, xFor(b));
      if (x1 <= LEFT || x0 >= RIGHT) continue;
      const firedW = wm >= b;
      const count = events.filter(e => !e.late && e.et >= a && e.et < b).length;
      roundRect(ctx, x0, Y - 60, Math.max(2, x1 - x0), 120, 5);
      ctx.fillStyle = withAlpha(firedW ? pal.green : pal.accent, 0.1); ctx.fill();
      ctx.strokeStyle = withAlpha(firedW ? pal.green : pal.accent, 0.5); ctx.lineWidth = 1; ctx.stroke();
      if (x1 - x0 > 26) label(ctx, `Σ${count}`, (x0 + x1) / 2, Y - 46, { color: firedW ? pal.green : pal.accent, size: 11, weight: 800 });
      if (firedW && x1 - x0 > 30) label(ctx, '🔥 fired', (x0 + x1) / 2, Y + 48, { color: pal.green, size: 8, weight: 700 });
    }

    // axis
    ctx.strokeStyle = withAlpha(pal.border, 0.9); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(LEFT, Y); ctx.lineTo(RIGHT, Y); ctx.stroke();

    // watermark line
    const wx = xFor(wm);
    if (wx > LEFT && wx < RIGHT) {
      ctx.strokeStyle = pal.amber; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(wx, Y - 66); ctx.lineTo(wx, Y + 54); ctx.stroke(); ctx.setLineDash([]);
      label(ctx, '💧 watermark', wx, Y - 74, { color: pal.amber, size: 10, weight: 800 });
    }

    // events
    for (const e of events) {
      const x = xFor(e.et); if (x < LEFT - 4 || x > RIGHT + 4) continue;
      ctx.fillStyle = e.late ? pal.red : pal.blue;
      ctx.beginPath(); ctx.arc(x, Y, 5, 0, Math.PI * 2); ctx.fill();
      if (e.late) label(ctx, '✕', x, Y - 14, { color: pal.red, size: 9, weight: 800 });
    }

    note.innerHTML = `allowed lateness <b style="color:var(--amber)">${lateness.toFixed(1)}s</b> · on-time <b style="color:var(--blue)">${onTime}</b> · late (dropped) <b style="color:var(--red)">${late}</b> · windows fired <b style="color:var(--green)">${fired}</b>`;
  }

  for (let i = 0; i < 6; i++) addEvent(T - VSPAN + 2 + i * 1.2);
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
