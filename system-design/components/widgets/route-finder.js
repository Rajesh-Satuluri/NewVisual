// ── Shortest-path routing (live canvas sim) ─────────────────────────────────
// Turn-by-turn routing is a shortest-path search over a graph. This runs a
// breadth-first search from the start that expands a frontier outward until it
// reaches the destination, then traces the path back. Watch the search sweep
// the map and the route light up — then add obstacles and rerun.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, withAlpha, label } from './_sim.js';

export function mount(container) {
  const COLS = 24, ROWS = 11;
  let obst = [];
  let dist = [], parent = [], queue = [], visited = 0, path = null, running = false;
  const start = { c: 1, r: 5 }, end = { c: COLS - 2, r: 5 };

  const { canvas, controls, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="rf-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="rf-go">🧭 Find route</button>
        <button class="sd-btn" id="rf-obs">🧱 Randomize obstacles</button>
        <button class="sd-btn" id="rf-clr">Clear</button>
      </div>`,
    caption: 'BFS explores the map in rings of equal distance from the start, so the first time it reaches the destination it has found a shortest route. Real maps weight roads by travel time (Dijkstra/A*), but the expanding-frontier idea is the same.',
  });

  const ctx = fitCanvas(canvas, 640, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#rf-note');
  const CW = 640 / COLS, CH = 300 / ROWS;
  const key = (c, r) => r * COLS + c;
  const blocked = (c, r) => c < 0 || r < 0 || c >= COLS || r >= ROWS || obst[key(c, r)];

  function randObstacles() {
    obst = new Array(COLS * ROWS).fill(false);
    const near = (c, r, cell) => Math.abs(c - cell.c) <= 1 && Math.abs(r - cell.r) <= 1;
    for (let i = 0; i < COLS * ROWS * 0.17; i++) {
      const c = Math.floor(Math.random() * COLS), r = Math.floor(Math.random() * ROWS);
      if (near(c, r, start) || near(c, r, end)) continue;   // keep A/B reachable
      obst[key(c, r)] = true;
    }
    reset();
  }
  function reset() { dist = []; parent = []; queue = []; path = null; running = false; visited = 0; }
  function run() {
    reset();
    dist[key(start.c, start.r)] = 0; queue = [{ ...start }]; running = true;
  }

  $('#rf-go').addEventListener('click', run);
  $('#rf-obs').addEventListener('click', randObstacles);
  $('#rf-clr').addEventListener('click', () => { obst = new Array(COLS * ROWS).fill(false); reset(); });

  function stepBFS() {
    let budget = 14;             // cells per frame → watchable sweep
    while (budget-- > 0 && queue.length) {
      const cur = queue.shift();
      if (cur.c === end.c && cur.r === end.r) {
        // build path
        path = []; let k = key(cur.c, cur.r);
        while (k != null) { path.push(k); k = parent[k]; }
        running = false; return;
      }
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = cur.c + dc, nr = cur.r + dr, nk = key(nc, nr);
        if (blocked(nc, nr) || dist[nk] != null) continue;
        dist[nk] = dist[key(cur.c, cur.r)] + 1; parent[nk] = key(cur.c, cur.r); visited++;
        queue.push({ c: nc, r: nr });
      }
    }
    if (!queue.length) running = false;
  }

  function draw() {
    if (running) stepBFS();
    ctx.clearRect(0, 0, 640, 300);
    const maxD = Math.max(1, ...dist.filter(d => d != null));
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = c * CW, y = r * CH, k = key(c, r);
      if (obst[k]) { ctx.fillStyle = withAlpha(pal.text3, 0.5); ctx.fillRect(x + 1, y + 1, CW - 2, CH - 2); continue; }
      if (dist[k] != null) { ctx.fillStyle = withAlpha(pal.blue, 0.12 + 0.5 * (dist[k] / maxD)); ctx.fillRect(x + 1, y + 1, CW - 2, CH - 2); }
      else { ctx.fillStyle = withAlpha(pal.border, 0.25); ctx.fillRect(x + 1, y + 1, CW - 2, CH - 2); }
    }
    // frontier
    queue.forEach(q => { ctx.fillStyle = withAlpha(pal.accent2, 0.8); ctx.fillRect(q.c * CW + 1, q.r * CH + 1, CW - 2, CH - 2); });
    // path
    if (path) path.forEach(k => { const c = k % COLS, r = (k / COLS) | 0; ctx.fillStyle = withAlpha(pal.amber, 0.95); ctx.fillRect(c * CW + 1, r * CH + 1, CW - 2, CH - 2); });
    // start/end
    const mark = (cell, col, t) => { ctx.fillStyle = col; ctx.fillRect(cell.c * CW + 1, cell.r * CH + 1, CW - 2, CH - 2); label(ctx, t, cell.c * CW + CW / 2, cell.r * CH + CH / 2, { color: '#fff', size: 11, weight: 800 }); };
    mark(start, pal.green, 'A'); mark(end, pal.red, 'B');
    const status = path ? `route found: ${path.length - 1} steps` : running ? 'searching…' : queue.length === 0 && visited > 0 && !path ? 'no route (blocked in)' : 'press Find route';
    note.innerHTML = `${status} · cells explored <b>${visited}</b>${path ? ` · <b style="color:var(--amber)">shortest path = ${path.length - 1} hops</b>` : ''}`;
  }

  randObstacles(); run();
  const stopRaf = rafLoop(() => draw());
  return () => { stopRaf(); stopPal(); };
}
