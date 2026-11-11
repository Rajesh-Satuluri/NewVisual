// ── Windowed click aggregation (live canvas sim) ────────────────────────────
// Ad clicks arrive as a firehose. You can't store and count them per-request —
// you aggregate into fixed time windows (tumbling windows): events land in the
// currently-open window, and when the window closes its total is emitted
// downstream and a fresh window opens. Duplicates are deduped so a double-fired
// click isn't billed twice. Watch events stream in, the window close, and
// aggregates flow out.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  const WINDOW = 4;           // seconds per window
  let t = 0, count = 0, seen = 0;
  let dedup = true, mode = 'steady';
  const RATE = { steady: 3, spike: 9 };
  let allowed = 0, dupes = 0, emittedTotal = 0;
  const parts = [];           // incoming event dots
  const emitted = [];         // closed-window aggregates {n, age}
  let spawnAcc = 0, winId = 1;

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="ca-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="ca-click">Click</button>
        <button class="sd-btn" id="ca-dup">Inject duplicate</button>
        <label class="wg-switch"><input type="checkbox" id="ca-dd" checked> dedup</label>
        <span class="wg-seg" role="group" aria-label="Traffic">
          <button class="wg-seg-btn active" data-mode="steady">Steady</button>
          <button class="wg-seg-btn" data-mode="spike">Spike</button>
        </span>
      </div>`,
    caption: 'Events land in the open window; when its countdown hits zero the total is emitted downstream and a new window opens (a tumbling window). Dedup drops repeat clicks so the same impression is never counted twice.',
  });

  const ctx = fitCanvas(canvas, 640, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#ca-note');
  const BX = 300, BY = 90, BW = 150, BH = 130;

  function spawn(dup) {
    parts.push({ x: 10, y: 150 + (Math.random() * 50 - 25), vx: 150 + Math.random() * 40, dup: !!dup, state: 'travel', life: 1 });
  }
  $('#ca-click').addEventListener('click', () => spawn(false));
  $('#ca-dup').addEventListener('click', () => spawn(true));
  $('#ca-dd').addEventListener('change', e => dedup = e.target.checked);
  controls.querySelectorAll('.wg-seg-btn').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode; controls.querySelectorAll('.wg-seg-btn').forEach(x => x.classList.toggle('active', x === b));
  }));

  function step(dt) {
    spawnAcc += RATE[mode] * dt;
    while (spawnAcc >= 1) { spawn(Math.random() < 0.18); spawnAcc -= 1; }
    // window timer
    t += dt;
    if (t >= WINDOW) {
      t = 0; emitted.unshift({ n: count, age: 0, id: winId++ }); if (emitted.length > 4) emitted.pop();
      emittedTotal += count; count = 0; seen = 0;
    }
    emitted.forEach(e => e.age += dt);
    for (const p of parts) {
      if (p.state === 'travel') {
        p.x += p.vx * dt;
        if (p.x >= BX) {
          if (p.dup && dedup) { p.state = 'reject'; p.vy = -70; dupes++; }
          else { count++; seen++; if (p.dup) dupes++; else allowed++; p.state = 'absorb'; p.life = 0.5; }
        }
      } else if (p.state === 'reject') { p.x += 40 * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= dt; }
      else { p.life -= dt * 2; }
    }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
  }

  function draw() {
    ctx.clearRect(0, 0, 640, 300);
    label(ctx, 'click events', 70, 110, { color: pal.text3, size: 11, align: 'left' });
    // open window bucket
    roundRect(ctx, BX, BY, BW, BH, 12); ctx.fillStyle = withAlpha(pal.accent, 0.1); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = withAlpha(pal.accent, 0.8); ctx.stroke();
    label(ctx, `⏱ window #${winId}`, BX + BW / 2, BY - 14, { color: pal.text2, size: 12, weight: 700 });
    label(ctx, `${count}`, BX + BW / 2, BY + BH / 2 - 4, { color: pal.text, size: 34, weight: 800 });
    label(ctx, 'clicks so far', BX + BW / 2, BY + BH / 2 + 24, { color: pal.text3, size: 10 });
    // countdown arc
    const frac = 1 - t / WINDOW, cxp = BX + BW / 2, cyp = BY + BH + 24;
    ctx.beginPath(); ctx.strokeStyle = withAlpha(pal.border, 1); ctx.lineWidth = 4; ctx.arc(cxp, cyp, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = pal.green; ctx.lineWidth = 4; ctx.arc(cxp, cyp, 14, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    label(ctx, `${(WINDOW - t).toFixed(1)}s`, cxp, cyp + 34, { color: pal.text3, size: 10 });
    // emitted aggregates
    label(ctx, '→ emitted', 500, BY - 14, { color: pal.green, size: 12, weight: 700, align: 'left' });
    emitted.forEach((e, i) => {
      const y = BY + 6 + i * 36, a = Math.max(0.35, 1 - e.age / 16);
      ctx.globalAlpha = a; roundRect(ctx, 500, y, 120, 28, 6);
      ctx.fillStyle = withAlpha(pal.green, 0.16); ctx.fill(); ctx.strokeStyle = withAlpha(pal.green, 0.5); ctx.lineWidth = 1; ctx.stroke();
      label(ctx, `#${e.id}: ${e.n} clicks`, 560, y + 14, { color: pal.text, size: 11, weight: 600 }); ctx.globalAlpha = 1;
    });
    // particles
    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.state === 'reject' ? pal.red : p.dup ? pal.amber : pal.accent2;
      ctx.beginPath(); ctx.arc(p.x, Math.min(p.y, 250), p.dup ? 5 : 6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    note.innerHTML = `window closes every <b>${WINDOW}s</b> · counted <b style="color:var(--green)">${allowed}</b> · duplicates ${dedup ? 'dropped' : 'kept'} <b style="color:var(--amber)">${dupes}</b> · total emitted <b>${emittedTotal}</b>`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
