// ── Row-store vs column-store (live canvas sim) ─────────────────────────────
// The same table, stored two ways. Run an analytical aggregate (SUM over one
// column) or a transactional point lookup (one row), and watch which cells each
// layout must read. Row storage reads whole rows; column storage reads whole
// columns — so each wins the opposite workload.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const COLS = ['id', 'date', 'product', 'amount', 'region'];
const ROWS = 7;
const AMOUNT_COL = 3, TARGET_ROW = 3;

export function mount(container) {
  let mode = 'agg';                 // 'agg' | 'point'
  let rowP = 0, colP = 0;           // reveal pointers (cells shown)

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="rc-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="rc-agg">Σ Aggregate: SUM(amount)</button>
        <button class="sd-btn" id="rc-point">🔎 Point: WHERE id = 3</button>
      </div>`,
    caption: 'An analytical query aggregates one column over all rows; a transactional query fetches one whole row. Column storage reads only the amount column for the aggregate, while row storage must read every cell — the 10×+ scan win that puts analytics on column-stores.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#rc-note');

  // reveal order: row-store is row-major, column-store is column-major
  function cellsFor(store) {
    const want = (r, c) => mode === 'agg' ? (c === AMOUNT_COL) : (r === TARGET_ROW);
    const list = [];
    if (store === 'row') {
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS.length; c++) {
        // row-store: to satisfy an aggregate it scans every cell; a point read grabs one row
        if (mode === 'agg' || r === TARGET_ROW) list.push({ r, c, hit: want(r, c) });
      }
    } else {
      for (let c = 0; c < COLS.length; c++) for (let r = 0; r < ROWS; r++) {
        // column-store: aggregate reads just the amount column; a point read must
        // scan the id column to locate, then gather that row's other columns
        if (mode === 'agg') { if (c === AMOUNT_COL) list.push({ r, c, hit: true }); }
        else { if (c === 0 || r === TARGET_ROW) list.push({ r, c, hit: r === TARGET_ROW }); }
      }
    }
    return list;
  }
  let rowList = cellsFor('row'), colList = cellsFor('col');

  function reset() { rowP = 0; colP = 0; rowList = cellsFor('row'); colList = cellsFor('col'); }
  $('#rc-agg').addEventListener('click', () => { mode = 'agg'; reset(); });
  $('#rc-point').addEventListener('click', () => { mode = 'point'; reset(); });

  function step(dt) {
    const sp = 22;            // cells per second
    if (rowP < rowList.length) rowP = Math.min(rowList.length, rowP + dt * sp);
    if (colP < colList.length) colP = Math.min(colList.length, colP + dt * sp);
  }

  const CW = 46, CH = 26, GAP = 3;
  function grid(ox, oy, title, list, p, tone) {
    const gw = COLS.length * (CW + GAP);
    label(ctx, title, ox + gw / 2, oy - 26, { color: pal[tone], size: 12, weight: 800 });
    // header
    COLS.forEach((cn, c) => {
      const x = ox + c * (CW + GAP);
      label(ctx, cn, x + CW / 2, oy - 8, { color: pal.text3, size: 9, weight: 700 });
    });
    const shown = Math.floor(p);
    const readSet = new Set(list.slice(0, shown).map(e => e.r + ',' + e.c));
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS.length; c++) {
      const x = ox + c * (CW + GAP), y = oy + r * (CH + GAP);
      const key = r + ',' + c;
      const read = readSet.has(key);
      const isHit = read && (mode === 'agg' ? c === AMOUNT_COL : r === TARGET_ROW);
      roundRect(ctx, x, y, CW, CH, 4);
      if (isHit) { ctx.fillStyle = withAlpha(pal.green, 0.4); ctx.fill(); ctx.strokeStyle = pal.green; ctx.lineWidth = 1.2; ctx.stroke(); }
      else if (read) { ctx.fillStyle = withAlpha(pal.amber, 0.26); ctx.fill(); }
      else { ctx.fillStyle = withAlpha(pal.bg3, 0.55); ctx.fill(); }
    }
    return list.slice(0, shown).length;
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    const read1 = grid(60, 60, '📦 Row-store', rowList, rowP, 'blue');
    const read2 = grid(390, 60, '🧱 Column-store', colList, colP, 'accent');
    const total1 = rowList.length, total2 = colList.length;
    const qlabel = mode === 'agg' ? 'SUM(amount) over all rows' : 'fetch row WHERE id = 3';
    const winner = read1 === read2 ? '' : (read1 < read2 ? 'row-store' : 'column-store');
    note.innerHTML = `query: <b>${qlabel}</b> · cells read — row-store <b style="color:var(--blue)">${read1}</b>, column-store <b style="color:var(--accent)">${read2}</b>${winner ? ` · <b style="color:var(--green)">${winner} wins</b>` : ''}`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
