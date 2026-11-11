// ── Quadtree spatial index (live canvas sim) ────────────────────────────────
// "Find businesses near me" needs a spatial index, not a full scan. A quadtree
// recursively splits space into four quadrants wherever points get dense, so a
// radius query only has to look inside the handful of cells it overlaps. Watch
// the tree subdivide around clusters, then move the query and see which cells
// it prunes to.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, withAlpha, label } from './_sim.js';

export function mount(container) {
  const W = 640, H = 300, CAP = 2;
  let points = [];
  let query = { x: 320, y: 150, r: 70 };

  function seed(n) { for (let i = 0; i < n; i++) points.push({ x: 30 + Math.random() * (W - 60), y: 25 + Math.random() * (H - 50) }); }
  seed(26);

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="qt-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="qt-move">🎯 Move query</button>
        <button class="sd-btn" id="qt-add">＋ Add points</button>
        <button class="sd-btn" id="qt-clr">Reset</button>
        <label class="wg-switch">radius
          <input type="range" id="qt-r" min="35" max="130" step="5" value="70" style="width:110px">
        </label>
      </div>`,
    caption: 'The tree only subdivides where points cluster, so dense areas get fine-grained cells and empty space stays coarse. A radius query descends only into cells that overlap the circle (highlighted) — pruning the rest instead of scanning every point.',
  });

  const ctx = fitCanvas(canvas, W, H);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#qt-note');

  // recursive subdivision → list of leaf rects with their points
  function build(x, y, w, h, pts, out) {
    if (pts.length <= CAP || w < 40 || h < 30) { out.push({ x, y, w, h, pts }); return; }
    const hw = w / 2, hh = h / 2;
    const quads = [[x, y], [x + hw, y], [x, y + hh], [x + hw, y + hh]];
    for (const [qx, qy] of quads) {
      const sub = pts.filter(p => p.x >= qx && p.x < qx + hw && p.y >= qy && p.y < qy + hh);
      build(qx, qy, hw, hh, sub, out);
    }
  }
  function rectHitsCircle(r, q) {
    const nx = Math.max(r.x, Math.min(q.x, r.x + r.w)), ny = Math.max(r.y, Math.min(q.y, r.y + r.h));
    return Math.hypot(nx - q.x, ny - q.y) <= q.r;
  }

  $('#qt-move').addEventListener('click', () => { query.x = 60 + Math.random() * (W - 120); query.y = 50 + Math.random() * (H - 100); });
  $('#qt-add').addEventListener('click', () => seed(8));
  $('#qt-clr').addEventListener('click', () => { points = []; seed(26); });
  $('#qt-r').addEventListener('input', e => query.r = +e.target.value);

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const leaves = []; build(0, 0, W, H, points, leaves);
    let examined = 0, found = 0;
    for (const lf of leaves) {
      const hit = rectHitsCircle(lf, query);
      if (hit) examined += lf.pts.length;
      ctx.strokeStyle = hit ? withAlpha(pal.accent, 0.8) : withAlpha(pal.border, 0.7);
      ctx.lineWidth = hit ? 1.5 : 1;
      ctx.strokeRect(lf.x + 0.5, lf.y + 0.5, lf.w - 1, lf.h - 1);
      if (hit) { ctx.fillStyle = withAlpha(pal.accent, 0.06); ctx.fillRect(lf.x, lf.y, lf.w, lf.h); }
    }
    // query circle
    ctx.beginPath(); ctx.arc(query.x, query.y, query.r, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(pal.green, 0.08); ctx.fill();
    ctx.strokeStyle = withAlpha(pal.green, 0.8); ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
    // points
    for (const p of points) {
      const inside = Math.hypot(p.x - query.x, p.y - query.y) <= query.r;
      if (inside) found++;
      ctx.fillStyle = inside ? pal.green : withAlpha(pal.text2, 0.8);
      ctx.beginPath(); ctx.arc(p.x, p.y, inside ? 5.5 : 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = pal.green; ctx.beginPath(); ctx.arc(query.x, query.y, 4, 0, Math.PI * 2); ctx.fill();
    note.innerHTML = `points <b>${points.length}</b> · leaf cells <b>${leaves.length}</b> · cells touched by query <b style="color:var(--accent)">${leaves.filter(l => rectHitsCircle(l, query)).length}</b> · points examined <b>${examined}</b> vs scanning all <b>${points.length}</b> · found <b style="color:var(--green)">${found}</b>`;
  }

  const stopRaf = rafLoop(() => draw());
  return () => { stopRaf(); stopPal(); };
}
