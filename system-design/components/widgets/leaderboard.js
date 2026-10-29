// ── Real-time leaderboard (live canvas sim) ─────────────────────────────────
// A leaderboard is a sorted set (e.g. Redis ZSET): scores update constantly and
// ranks re-sort in real time. The trick is that a single score change only
// needs an O(log n) update, not a full re-sort of millions of players. Bump
// scores and watch players slide up and down to their new ranks.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

export function mount(container) {
  const NAMES = ['Mia', 'Leo', 'Ava', 'Noah', 'Zoe', 'Kai', 'Ivy', 'Max', 'Eli', 'Nora'];
  let players = NAMES.map((n, i) => ({ name: n, score: 500 + Math.floor(Math.random() * 400), y: 0, ty: 0, flash: 0 }));
  let auto = true, acc = 0, updates = 0;

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="lb-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="lb-score">🎯 Random score</button>
        <button class="sd-btn" id="lb-boost">🚀 Boost leader-chaser</button>
        <label class="wg-switch"><input type="checkbox" id="lb-auto" checked> live traffic</label>
      </div>`,
    caption: 'Each score change is a single O(log n) update into a sorted set, and only the affected ranks shift — you never re-sort the whole board. That\'s why a leaderboard with millions of players still updates a rank the instant a score lands.',
  });

  const ctx = fitCanvas(canvas, 640, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#lb-note');
  const ROWH = 27, TOP = 14;

  function resort() {
    players.sort((a, b) => b.score - a.score);
    players.forEach((p, i) => p.ty = TOP + i * ROWH);
  }
  resort(); players.forEach(p => p.y = p.ty);

  function bump(idx, amt) { players[idx].score += amt; players[idx].flash = 1; updates++; resort(); }
  $('#lb-score').addEventListener('click', () => bump(Math.floor(Math.random() * players.length), 40 + Math.floor(Math.random() * 160)));
  $('#lb-boost').addEventListener('click', () => { const i = players.findIndex((p, k) => k > 0); if (i >= 0) bump(i, 120 + Math.floor(Math.random() * 120)); });
  $('#lb-auto').addEventListener('change', e => auto = e.target.checked);

  function step(dt) {
    if (auto) { acc += dt; if (acc >= 0.9) { acc = 0; bump(Math.floor(Math.random() * players.length), 20 + Math.floor(Math.random() * 90)); } }
    players.forEach(p => {
      p.y += (p.ty - p.y) * Math.min(1, dt * 7);
      if (p.flash > 0) p.flash = Math.max(0, p.flash - dt * 1.4);
    });
  }

  function draw() {
    ctx.clearRect(0, 0, 640, 300);
    const maxS = Math.max(...players.map(p => p.score));
    // draw in rank order; rank = index after sort
    players.forEach((p) => {
      const rank = players.indexOf(p);
      const y = p.y, barW = 60 + (p.score / maxS) * 430;
      const top3 = rank < 3;
      const col = rank === 0 ? pal.amber : rank === 1 ? pal.accent2 : rank === 2 ? pal.blue : pal.accent;
      // rank badge
      label(ctx, `#${rank + 1}`, 22, y + ROWH / 2 - 3, { color: top3 ? col : pal.text3, size: 12, weight: 800, align: 'left' });
      roundRect(ctx, 56, y + 2, barW, ROWH - 6, 6);
      ctx.fillStyle = withAlpha(col, 0.18 + p.flash * 0.5); ctx.fill();
      ctx.strokeStyle = withAlpha(col, 0.6); ctx.lineWidth = 1; ctx.stroke();
      label(ctx, `${top3 ? ['🥇', '🥈', '🥉'][rank] + ' ' : ''}${p.name}`, 66, y + ROWH / 2 - 3, { color: pal.text, size: 12, weight: top3 ? 800 : 600, align: 'left' });
      label(ctx, `${p.score}`, 56 + barW - 8, y + ROWH / 2 - 3, { color: pal.text, size: 11, weight: 700, align: 'right' });
    });
    note.innerHTML = `players <b>${players.length}</b> · leader <b style="color:var(--amber)">${players[0].name} (${players[0].score})</b> · score updates <b>${updates}</b> · each update is <b>O(log n)</b>, no full re-sort`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
