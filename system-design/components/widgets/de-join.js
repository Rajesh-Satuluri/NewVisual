// ── Join strategies (live canvas sim) ───────────────────────────────────────
// Broadcast vs shuffle join across executors. Broadcast ships one small table
// to every executor; the big table never moves. Shuffle repartitions both big
// tables across the network. Toggle and watch the data movement.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const EX = 3;   // executors

export function mount(container) {
  let mode = 'broadcast';
  const flying = [];      // {x, y, tx, ty, p, kind}
  let moved = 0, runs = 0;

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="jn-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="jn-run">▶ Run join</button>
        <button class="sd-btn" id="jn-mode">📡 Strategy: broadcast</button>
      </div>`,
    caption: 'Broadcast: a small table is copied to every executor and the big table is joined in place — no shuffle. Shuffle: both big tables are repartitioned by key across the network so matching keys meet. If a small side exists, broadcasting it is often an order-of-magnitude win.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#jn-note');

  const SMALLX = 90, BIGX = 90, exX = 440, exY = i => 70 + i * 80;

  function run() {
    runs++;
    if (mode === 'broadcast') {
      // small table copied to each executor (3 small units), big table stays
      for (let e = 0; e < EX; e++) flying.push({ x: SMALLX, y: 70, tx: exX, ty: exY(e), p: 0, kind: 'small' });
      moved += EX;  // only small copies move
    } else {
      // shuffle: both tables repartitioned → many units cross to executors
      for (let e = 0; e < EX; e++) {
        for (let k = 0; k < 3; k++) flying.push({ x: SMALLX, y: 210, tx: exX, ty: exY(e) - 8, p: Math.random() * -0.3, kind: 'a' });
        for (let k = 0; k < 3; k++) flying.push({ x: BIGX, y: 70, tx: exX, ty: exY(e) + 8, p: Math.random() * -0.3, kind: 'b' });
      }
      moved += EX * 6;
    }
  }
  $('#jn-run').addEventListener('click', run);
  $('#jn-mode').addEventListener('click', (e) => { mode = mode === 'broadcast' ? 'shuffle' : 'broadcast'; moved = 0; runs = 0; flying.length = 0; e.target.textContent = `📡 Strategy: ${mode}`; });

  let autoAcc = 0;
  function step(dt) {
    autoAcc += dt; if (autoAcc >= 2.8) { autoAcc = 0; run(); }
    for (let i = flying.length - 1; i >= 0; i--) { flying[i].p += dt * 0.8; if (flying[i].p >= 1.2) flying.splice(i, 1); }
  }

  function tbl(x, y, title, big, col) {
    const w = big ? 86 : 64, h = big ? 84 : 44;
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 8);
    ctx.fillStyle = withAlpha(col, 0.12); ctx.fill();
    ctx.strokeStyle = withAlpha(col, 0.8); ctx.lineWidth = 1.6; ctx.stroke();
    label(ctx, title, x, y - (big ? 8 : 0), { color: pal.text, size: 10, weight: 700 });
    if (big) label(ctx, 'big · TBs', x, y + 10, { color: pal.text3, size: 8, weight: 600 });
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);

    if (mode === 'broadcast') {
      tbl(BIGX, 170, '🗄️ big table', true, pal.blue);
      tbl(SMALLX, 60, '📇 small', false, pal.green);
      label(ctx, 'stays put ✓', BIGX, 220, { color: pal.green, size: 9, weight: 700 });
    } else {
      tbl(SMALLX, 70, '🗄️ table A', false, pal.blue);
      tbl(SMALLX, 210, '🗄️ table B', false, pal.amber);
      label(ctx, 'both shuffle →', SMALLX, 250, { color: pal.red, size: 9, weight: 700 });
    }

    // executors
    for (let e = 0; e < EX; e++) {
      const y = exY(e);
      roundRect(ctx, exX - 44, y - 26, 150, 52, 9);
      ctx.fillStyle = withAlpha(pal.accent, 0.08); ctx.fill();
      ctx.strokeStyle = withAlpha(pal.accent, 0.6); ctx.lineWidth = 1.3; ctx.stroke();
      label(ctx, `⚙️ executor ${e}`, exX + 30, y - 10, { color: pal.text2, size: 10, weight: 700 });
      if (mode === 'broadcast') label(ctx, '+ local join vs big part', exX + 30, y + 10, { color: pal.text3, size: 8, weight: 600 });
    }

    // flying units
    for (const f of flying) {
      if (f.p < 0) continue;
      const p = Math.min(1, f.p);
      const x = f.x + (f.tx - f.x) * p, y = f.y + (f.ty - f.y) * p;
      const col = f.kind === 'small' ? pal.green : f.kind === 'a' ? pal.blue : pal.amber;
      ctx.fillStyle = col; roundRect(ctx, x - 6, y - 5, 12, 10, 2); ctx.fill();
    }

    note.innerHTML = `strategy <b style="color:var(--${mode === 'broadcast' ? 'green' : 'red'})">${mode}</b> · data units moved over network <b style="color:var(--${mode === 'broadcast' ? 'green' : 'red'})">${moved}</b> · ${mode === 'broadcast' ? 'big table never shuffles' : 'both tables repartitioned'}`;
  }

  run();
  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
