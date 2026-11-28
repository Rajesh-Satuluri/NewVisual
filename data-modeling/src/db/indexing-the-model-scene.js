/* indexing-the-model-scene.js — the "Indexing the Model" scene, on the flat
   schema CANVAS (engine/schema2d.js), not the isometric machinery of db-scale.
   Indexing is a physical-model story, so the canvas stays logical: a table card
   plus index chips that attach to it. A sequential scan lights every row hot; a
   B-tree index collapses that to a single lookup; candidate columns, composite /
   covering indexes and the write-cost of over-indexing each get their own view.
   Motion is CSS: cards rise, the lookup connector draws, chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'scan', 'index', 'what', 'composite', 'cost', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

const CUSTOMER_COLS = [
  { name: 'customer_id', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'email', type: 'text' },
  { name: 'status', type: 'text' },
  { name: 'created_at', type: 'timestamp' },
];

export function renderIndexingTheModelScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── scan: a filter with no index reads every row ────────────────────────── */
  if (view === 'scan') {
    const cols = CUSTOMER_COLS.map((c, i) => ({ ...c, hot: i >= 1, tone: null }));
    const card = tableCard(300, 150, { name: 'Customer', icon: 'app', tone: 'accent', cols, w: 290 });
    body += card.svg;
    body += chip(card.cx, card.top - 36, 'WHERE email = ?', { icon: 'search', w: 200, delay: 0.5 });
    body += chip(card.right + 170, card.rowCy(2), 'Seq scan — 50,000 rows', { icon: 'alert', iconVar: '--red', w: 230, delay: 0.9 });
    body += connector(
      { x: card.right, y: card.rowCy(2), side: 'right' },
      { x: card.right + 56, y: card.rowCy(2), side: 'left' },
      { delay: 0.7, ghost: true }).svg;
    body += caption(card.cx, card.bottom + 44, 'No index on email: the engine compares every row to find one match — cost grows with the table.', { delay: 1.2 });
    return assemble({ slug: 'indexing-the-model', aria: 'A filter forcing a full sequential scan', body, note: snap.note });
  }

  /* ── index: a B-tree on email turns the scan into a lookup ───────────────── */
  if (view === 'index') {
    const cols = CUSTOMER_COLS.map((c, i) => ({ ...c, hot: i === 2 }));
    const card = tableCard(300, 150, { name: 'Customer', icon: 'app', tone: 'accent', cols, w: 290 });
    body += card.svg;
    body += chip(card.cx, card.top - 36, 'WHERE email = ?', { icon: 'search', w: 200, delay: 0.4 });
    body += chip(card.right + 150, card.rowCy(2), 'idx(email)', { icon: 'search', iconVar: '--green', w: 160, delay: 0.9 });
    body += connector(
      { x: card.right, y: card.rowCy(2), side: 'right' },
      { x: card.right + 70, y: card.rowCy(2), side: 'left' },
      { to: 'one', delay: 0.7 }).svg;
    body += chip(card.right + 150, card.rowCy(2) + 44, '~1 row read', { icon: 'check', iconVar: '--green', w: 160, delay: 1.1 });
    body += caption(card.cx, card.bottom + 44, 'A B-tree index binary-searches to the value: the same query now touches roughly one row, not 50,000.', { delay: 1.3 });
    return assemble({ slug: 'indexing-the-model', aria: 'A B-tree index turning the scan into a direct lookup', body, note: snap.note });
  }

  /* ── what: the five kinds of column worth indexing ───────────────────────── */
  if (view === 'what') {
    body += band(260, 96, VW - 520, 60, 'Index the work', { sub: 'look at the queries, not the schema — index the columns they touch', delay: 0.2 });
    const cands = [
      ['Primary key', 'key', '--amber'],
      ['Foreign keys', 'merge', '--accent'],
      ['WHERE filters', 'search', '--accent'],
      ['JOIN columns', 'merge', '--accent'],
      ['ORDER BY / GROUP BY', 'listOrdered', '--accent'],
    ];
    const cx = VW / 2;
    cands.forEach(([t, ic, iv], i) => {
      body += chip(cx, 232 + i * 56, t, { icon: ic, iconVar: iv, w: 280, delay: 0.5 + i * 0.12 });
    });
    body += caption(cx, 232 + cands.length * 56 + 6, 'Each repays an index because a query finds, connects or orders rows by it. Columns no query touches do not.', { delay: 1.3 });
    return assemble({ slug: 'indexing-the-model', aria: 'The column kinds worth indexing', body, note: snap.note });
  }

  /* ── composite: multi-column, left-to-right, covering ────────────────────── */
  if (view === 'composite') {
    const cols = [
      { name: 'order_id', type: 'int', key: true },
      { name: 'status', type: 'text', hot: true },
      { name: 'created_at', type: 'timestamp', hot: true },
      { name: 'total', type: 'decimal' },
    ];
    const card = tableCard(300, 158, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols, w: 290 });
    body += card.svg;
    body += chip(card.right + 160, card.rowCy(1), 'idx(status, created_at)', { icon: 'layers', w: 262, delay: 0.8 });
    body += chip(card.right + 160, card.rowCy(1) + 48, 'leftmost prefix wins', { icon: 'chevron', w: 220, delay: 1.0 });
    body += chip(card.right + 160, card.rowCy(1) + 96, 'covering → index-only', { icon: 'check', iconVar: '--green', w: 240, delay: 1.2 });
    body += connector(
      { x: card.right, y: card.rowCy(1), side: 'right' },
      { x: card.right + 29, y: card.rowCy(1), side: 'left' },
      { delay: 0.6, ghost: true }).svg;
    body += caption(card.cx, card.bottom + 46, 'Sorted by status first: helps status filters and status+time, not created_at alone. Cover the query and skip the table.', { delay: 1.4 });
    return assemble({ slug: 'indexing-the-model', aria: 'A composite, left-to-right index and a covering index', body, note: snap.note });
  }

  /* ── cost: over-indexing taxes every write ───────────────────────────────── */
  if (view === 'cost') {
    const card = tableCard(280, 150, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: [
      { name: 'order_id', type: 'int', key: true },
      { name: 'customer_id', type: 'int', fk: true },
      { name: 'status', type: 'text' },
      { name: 'created_at', type: 'timestamp' },
      { name: 'total', type: 'decimal' },
    ], w: 270 });
    body += card.svg;
    const idx = ['idx(customer_id)', 'idx(status)', 'idx(created_at)', 'idx(total)', 'idx(status, total)', 'idx(created_at)'];
    idx.forEach((t, i) => {
      body += chip(card.right + 180, card.top + 14 + i * 40, t, { icon: 'layers', w: 220, delay: 0.7 + i * 0.1 });
    });
    body += chip(card.cx, card.top - 34, '1 write → 7 structure updates', { icon: 'alert', iconVar: '--red', w: 280, delay: 1.5 });
    body += caption(card.cx, card.bottom + 44, 'Each index is a sorted copy to maintain: more storage, and every write amplified across all of them — index what reads need, no more.', { delay: 1.7 });
    return assemble({ slug: 'indexing-the-model', aria: 'Over-indexing: one write amplified across many indexes', body, note: snap.note });
  }

  /* ── recap: a right-sized index set for the real workload ────────────────── */
  const card = tableCard(300, 160, { name: 'Customer', icon: 'app', tone: 'accent', cols: [
    { name: 'customer_id', type: 'int', key: true },
    { name: 'email', type: 'text', hot: true },
    { name: 'status', type: 'text', hot: true },
  ], w: 290 });
  body += card.svg;
  body += chip(card.right + 150, card.rowCy(1), 'idx(email)', { icon: 'search', iconVar: '--green', w: 160, delay: 0.7 });
  body += chip(card.right + 150, card.rowCy(2), 'idx(status)', { icon: 'search', iconVar: '--green', w: 160, delay: 0.85 });
  const checks = ['PK · FK · filters', 'joins · sorts', 'composite: order matters', 'writes pay the tax'];
  const gap = 238, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body += chip(startX + i * gap, 486, t, { icon: 'check', w: 212, delay: 1.0 + i * 0.1 }); });
  body += caption(VW / 2, 540, 'Index for the queries you actually run — then measure, and keep only what earns its keep.', { delay: 1.5 });
  return assemble({ slug: 'indexing-the-model', aria: 'A right-sized set of indexes for the real query workload', body, note: snap.note });
}
