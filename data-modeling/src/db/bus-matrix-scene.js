/* bus-matrix-scene.js — the "Kimball Bus Matrix" scene, on the flat schema CANVAS
   (engine/schema2d.js). The hero visual is a GRID (not a star): business processes
   down the rows, conformed dimensions across the columns, a mark at every cell where
   a process uses a dimension. Built from band() rows, chip() marks and caption()/text
   labels.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'processes', 'dimensions', 'matrix', 'conformed', 'sequence', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW, VH } from '../engine/schema2d.js';

const PROCESSES = ['Sales', 'Returns', 'Inventory', 'Shipping'];
const DIMS = ['Date', 'Product', 'Customer', 'Store', 'Promotion'];
/* which dimensions each process uses (indices into DIMS) */
const USES = {
  Sales: [0, 1, 2, 3, 4],
  Returns: [0, 1, 2, 3],
  Inventory: [0, 1, 3],
  Shipping: [0, 1, 2, 3],
};

/* grid geometry */
const LABEL_CX = 158, LABEL_W = 190;
const COL_X0 = 272, COL_W = 144;          // 272 .. 992
const ROW_Y0 = 176, ROW_H = 74;           // 4 rows → 176 .. 472
const HEAD_Y = 148;
const colCx = (j) => COL_X0 + j * COL_W + COL_W / 2;
const rowCy = (i) => ROW_Y0 + i * ROW_H + ROW_H / 2;

/* a label at the top of a column */
function colHead(j, highlight, delay) {
  const cx = colCx(j);
  const fill = highlight ? 'var(--accent)' : 'var(--ink, #15202b)';
  return `<text class="sc-fade" x="${cx}" y="${HEAD_Y}" text-anchor="middle" style="animation-delay:${delay}s;fill:${fill};font:700 13.5px var(--sans, system-ui)">${DIMS[j]}</text>`;
}

/* faint grid rules spanning the matrix body */
function gridLines() {
  let s = '';
  const top = ROW_Y0, bot = ROW_Y0 + PROCESSES.length * ROW_H;
  const leftX = COL_X0 - LABEL_W + 12;
  // vertical separators before each column + the label divider
  for (let j = 0; j <= DIMS.length; j++) {
    const x = COL_X0 + j * COL_W;
    s += `<line class="sc-div" x1="${x}" y1="${top}" x2="${x}" y2="${bot}"/>`;
  }
  s += `<line class="sc-div" x1="${COL_X0}" y1="${top}" x2="${COL_X0}" y2="${bot}"/>`;
  // horizontal separators
  for (let i = 0; i <= PROCESSES.length; i++) {
    const y = ROW_Y0 + i * ROW_H;
    s += `<line class="sc-div" x1="${leftX}" y1="${y}" x2="${COL_X0 + DIMS.length * COL_W}" y2="${y}"/>`;
  }
  return s;
}

/* render the full matrix. opts: { hotCols:[], hotRow:int } */
function matrix(opts = {}) {
  const hotCols = opts.hotCols || [];
  const hotRow = (opts.hotRow == null) ? -1 : opts.hotRow;
  let s = gridLines();
  // column headers
  DIMS.forEach((_, j) => { s += colHead(j, hotCols.includes(j), 0.3 + j * 0.08); });
  // process row labels (left) as chips
  PROCESSES.forEach((p, i) => {
    const active = i === hotRow;
    s += chip(LABEL_CX, rowCy(i), p, {
      icon: 'database', iconVar: active ? '--accent' : '--violet',
      w: LABEL_W, delay: 0.4 + i * 0.1,
    });
  });
  // marks
  PROCESSES.forEach((p, i) => {
    USES[p].forEach((j) => {
      const dim = hotCols.length === 0 || hotCols.includes(j);
      const row = hotRow < 0 || i === hotRow;
      const lit = dim && row;
      s += chip(colCx(j), rowCy(i), '✓', {
        iconVar: lit ? '--green' : '--ink-2', w: 34,
        delay: 0.7 + (i * DIMS.length + j) * 0.03,
      });
    });
  });
  return s;
}

export function renderBusMatrixScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── processes alone: four fact tables ─────────────────────────────────── */
  if (view === 'processes') {
    PROCESSES.forEach((p, i) => {
      const x = 90 + (i % 2) * 470;
      const y = 150 + Math.floor(i / 2) * 190;
      const card = tableCard(x, y, {
        name: `fct_${p.toLowerCase()}`, icon: 'database', tone: 'violet',
        cols: [{ name: 'date_key', fk: true }, { name: 'amount', type: 'measure' }],
        w: 380, delay: i * 0.12,
      });
      body += card.svg;
      body += chip(card.cx, y - 26, `${p} process`, { icon: 'bolt', iconVar: '--amber', w: 170, delay: 0.4 + i * 0.12 });
    });
    body += caption(VW / 2, 548, 'Each business process becomes one fact table at its own grain — the rows of the matrix.', { delay: 0.9 });
    return assemble({ slug: 'bus-matrix', aria: 'Four business processes as fact tables', body, note: snap.note });
  }

  /* ── conformed dimensions alone ────────────────────────────────────────── */
  if (view === 'dimensions') {
    const tones = ['accent', 'green', 'amber', 'violet', 'rose'];
    DIMS.forEach((d, i) => {
      const x = 60 + i * 192;
      const card = tableCard(x, 210, {
        name: `dim_${d.toLowerCase()}`, icon: 'folder', tone: tones[i],
        cols: [{ name: `${d.toLowerCase()}_key`, key: true }], w: 176, delay: i * 0.1,
      });
      body += card.svg;
    });
    body += chip(VW / 2, 150, 'conformed — shared identically', { icon: 'check', iconVar: '--green', w: 300, delay: 0.7 });
    body += caption(VW / 2, 360, 'Five conformed dimensions — one agreed table each, used identically by every process — the columns of the matrix.', { delay: 0.9 });
    return assemble({ slug: 'bus-matrix', aria: 'Five conformed dimensions', body, note: snap.note });
  }

  /* ── the grid: matrix / conformed / sequence / recap ───────────────────── */
  if (view === 'conformed') {
    body += matrix({ hotCols: [0, 1] });
    body += caption(VW / 2, 520, 'The dense columns — Date and Product — are the bus every fact table plugs into.', { delay: 1.4 });
    body += chip(VW / 2, 558, 'shared dimensions = integration', { icon: 'merge', iconVar: '--accent', w: 310, delay: 1.6 });
    return assemble({ slug: 'bus-matrix', aria: 'The bus matrix with the shared columns highlighted', body, note: snap.note });
  }
  if (view === 'sequence') {
    body += matrix({ hotRow: 0 });
    body += caption(VW / 2, 520, 'Deliver row by row — ship Sales with its five dimensions, then reuse them for the next process.', { delay: 1.4 });
    body += chip(VW / 2, 558, 'one row = one usable mart', { icon: 'check', iconVar: '--green', w: 270, delay: 1.6 });
    return assemble({ slug: 'bus-matrix', aria: 'The bus matrix delivered one row at a time', body, note: snap.note });
  }
  if (view === 'matrix') {
    body += matrix();
    body += caption(VW / 2, 520, 'Processes × conformed dimensions, a mark at each join — the whole warehouse plan on one page.', { delay: 1.5 });
    return assemble({ slug: 'bus-matrix', aria: 'The Kimball bus matrix grid', body, note: snap.note });
  }

  /* ── recap (fallback) ──────────────────────────────────────────────────── */
  body += matrix();
  body += caption(VW / 2, 520, 'Rows are facts, columns are conformed dimensions, marks are joins — the bus planned before the tables.', { delay: 1.5 });
  body += chip(VW / 2, 558, 'plan the bus first', { icon: 'grid', iconVar: '--accent', w: 210, delay: 1.7 });
  return assemble({ slug: 'bus-matrix', aria: 'The Kimball bus matrix, recap', body, note: snap.note });
}
