// ── Spark shuffle (live canvas sim) ─────────────────────────────────────────
// Stage 1 tasks produce keyed records; stage 2 tasks each own a key. A narrow
// transformation keeps each partition in place (no movement); a wide one
// shuffles — records fly to the task owning their key, an all-to-all transfer.
// Toggle and watch the cross-network movement appear.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const N = 4;
const KEYCOL = ['blue', 'green', 'amber', 'accent2'];

export function mount(container) {
  let wide = true;
  let runs = 0, shuffled = 0, local = 0;
  const flying = [];
  // stage-1 tasks: each holds a few keyed records
  const tasks = Array.from({ length: N }, () => Array.from({ length: 3 }, () => Math.floor(Math.random() * N)));

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="sh-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="sh-run">▶ Run stage</button>
        <button class="sd-btn" id="sh-mode">🔀 Transformation: wide (shuffle)</button>
      </div>`,
    caption: 'A narrow transformation (map, filter) keeps each partition self-contained — no network. A wide one (join, groupBy) shuffles: every task routes each record to the task owning its key, an all-to-all transfer over disk and network. That movement is the dominant cost, so tuning is largely shuffle avoidance.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#sh-note');

  const S1X = 140, S2X = 520, rowY = r => 58 + r * 60;

  function run() {
    runs++;
    tasks.forEach((recs, from) => recs.forEach((key, k) => {
      const to = wide ? key : from;
      flying.push({ from, to, key, p: 0, slot: k });
      if (to === from) local++; else shuffled++;
    }));
  }
  $('#sh-run').addEventListener('click', run);
  $('#sh-mode').addEventListener('click', (e) => { wide = !wide; e.target.textContent = `🔀 Transformation: ${wide ? 'wide (shuffle)' : 'narrow (no shuffle)'}`; });

  let autoAcc = 0;
  function step(dt) {
    autoAcc += dt; if (autoAcc >= 2.6) { autoAcc = 0; run(); }
    for (let i = flying.length - 1; i >= 0; i--) { flying[i].p += dt * 0.9; if (flying[i].p >= 1.15) flying.splice(i, 1); }
  }

  function taskBox(x, r, label1, sub, col) {
    roundRect(ctx, x - 48, rowY(r) - 22, 96, 44, 8);
    ctx.fillStyle = withAlpha(col, 0.1); ctx.fill();
    ctx.strokeStyle = withAlpha(col, 0.7); ctx.lineWidth = 1.4; ctx.stroke();
    label(ctx, label1, x, rowY(r) - 6, { color: pal.text, size: 10, weight: 700 });
    label(ctx, sub, x, rowY(r) + 9, { color: pal.text3, size: 8, weight: 600 });
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    label(ctx, '🟦 Stage 1 (map)', S1X, 22, { color: pal.text2, size: 11, weight: 800 });
    label(ctx, wide ? '🟥 Stage 2 (after shuffle)' : '🟩 Stage 2 (narrow)', S2X, 22, { color: pal.text2, size: 11, weight: 800 });

    for (let r = 0; r < N; r++) {
      taskBox(S1X, r, `task ${r}`, 'partition', pal.accent);
      taskBox(S2X, r, `task ${r}`, `owns key ${r}`, wide ? pal.red : pal.green);
      // static records sitting in stage-1 tasks (faint)
      tasks[r].forEach((key, k) => { ctx.fillStyle = withAlpha(pal[KEYCOL[key]], 0.5); roundRect(ctx, S1X - 40 + k * 20, rowY(r) + 16, 14, 8, 2); ctx.fill(); });
    }

    // flying records
    for (const f of flying) {
      const p = Math.min(1, f.p);
      const x0 = S1X + 48, x1 = S2X - 48;
      const y0 = rowY(f.from), y1 = rowY(f.to);
      const x = x0 + (x1 - x0) * p, y = y0 + (y1 - y0) * p;
      ctx.fillStyle = pal[KEYCOL[f.key]];
      roundRect(ctx, x - 6, y - 5, 12, 10, 2); ctx.fill();
    }

    const pct = runs ? Math.round(shuffled / (shuffled + local) * 100) : 0;
    note.innerHTML = `mode <b style="color:var(--${wide ? 'red' : 'green'})">${wide ? 'wide' : 'narrow'}</b> · records moved across network <b style="color:var(--red)">${shuffled}</b> · kept local <b style="color:var(--green)">${local}</b>${wide ? ` · ${pct}% shuffled` : ''}`;
  }

  run();
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
