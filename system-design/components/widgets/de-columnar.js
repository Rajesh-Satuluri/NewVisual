// ── Columnar file format (live canvas sim) ──────────────────────────────────
// A Parquet file is row groups, each storing data by column with min/max stats.
// A query reads only the columns it projects, in only the row groups whose
// stats can match the filter (predicate push-down). Toggle projection and the
// predicate and watch the bytes read collapse versus a full scan.
//
// mount(container) → cleanup()

import { makeScaffold, makePalette, fitCanvas, rafLoop, roundRect, withAlpha, label } from './_sim.js';

const COLS = ['id', 'date', 'product', 'amount', 'region'];
const RGS = 4;
const PROJECT = new Set([3, 4]);          // SELECT amount, region
const MATCH = [true, false, true, false]; // which row groups the predicate can match

export function mount(container) {
  let projectOn = true, predicateOn = true;
  let scan = 0;                             // reveal pointer over row groups

  const { canvas, $ } = makeScaffold(container, {
    controls: `
      <div class="sim-note" id="cz-note"></div>
      <div class="wg-btnrow">
        <button class="sd-btn sd-btn-primary" id="cz-proj">🧮 Projection: on</button>
        <button class="sd-btn" id="cz-pred">🔎 Predicate push-down: on</button>
      </div>`,
    caption: 'Query: SELECT amount, region WHERE region = "EU". Projection reads only two of five columns; push-down uses each row group’s min/max stats to skip groups that can’t match. The engine touches a small corner of the file instead of all of it.',
  });

  const ctx = fitCanvas(canvas, 660, 300);
  const { pal, stop: stopPal } = makePalette(canvas);
  const note = $('#cz-note');

  $('#cz-proj').addEventListener('click', (e) => { projectOn = !projectOn; e.target.textContent = `🧮 Projection: ${projectOn ? 'on' : 'off'}`; scan = 0; });
  $('#cz-pred').addEventListener('click', (e) => { predicateOn = !predicateOn; e.target.textContent = `🔎 Predicate push-down: ${predicateOn ? 'on' : 'off'}`; scan = 0; });

  function step(dt) { if (scan < RGS) scan = Math.min(RGS, scan + dt * 1.6); }

  const OX = 70, OY = 70, CW = 92, CH = 34, GAP = 4;

  function cellRead(rg, c) {
    if (predicateOn && !MATCH[rg]) return false;     // whole row group skipped
    if (projectOn && !PROJECT.has(c)) return false;  // column not projected
    return true;
  }

  function draw() {
    ctx.clearRect(0, 0, 660, 300);
    // column headers
    COLS.forEach((cn, c) => {
      const x = OX + c * (CW + GAP);
      const proj = projectOn && PROJECT.has(c);
      label(ctx, cn, x + CW / 2, OY - 14, { color: proj ? pal.green : pal.text3, size: 10, weight: proj ? 800 : 600 });
    });

    let read = 0;
    const shown = Math.floor(scan + 0.001);
    for (let rg = 0; rg < RGS; rg++) {
      const y = OY + rg * (CH + GAP + 6);
      const revealed = rg < shown || scan >= RGS;
      const skipped = predicateOn && !MATCH[rg];
      // row-group label
      label(ctx, `RG${rg}`, OX - 30, y + CH / 2, { color: skipped ? pal.text3 : pal.text2, size: 10, weight: 700, align: 'center' });
      for (let c = 0; c < COLS.length; c++) {
        const x = OX + c * (CW + GAP);
        roundRect(ctx, x, y, CW, CH, 4);
        const willRead = cellRead(rg, c);
        if (revealed && willRead) { ctx.fillStyle = withAlpha(pal.green, 0.42); ctx.fill(); ctx.strokeStyle = pal.green; ctx.lineWidth = 1.2; ctx.stroke(); read++; }
        else if (skipped) { ctx.fillStyle = withAlpha(pal.bg3, 0.35); ctx.fill(); }
        else { ctx.fillStyle = withAlpha(pal.bg3, 0.6); ctx.fill(); }
      }
      if (skipped) label(ctx, '⤼ skipped by min/max', OX + 5 * (CW + GAP) + 6, y + CH / 2, { color: pal.text3, size: 9, weight: 600, align: 'left' });
    }

    const total = RGS * COLS.length;
    note.innerHTML = `chunks read <b style="color:var(--green)">${read}</b> of ${total} · ${Math.round((1 - read / total) * 100)}% of the file skipped`;
  }

  const stopRaf = rafLoop((dt) => { step(dt); draw(); });
  return () => { stopRaf(); stopPal(); };
}
