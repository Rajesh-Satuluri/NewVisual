/* denormalization-scene.js — the "Denormalization Tradeoffs" scene, on the flat
   schema CANVAS (engine/schema2d.js), not the isometric machinery of db-scale.
   Denormalization is normalization run in reverse: the 'normalized' view is a
   tangle of small tables and FK connectors (many joins); the 'denorm' view folds
   them into one wide card (redundancy, no joins). 'patterns' lists the shapes,
   'cost' flags the returning update anomalies (rose tint + warn), 'when' gives the
   decision, and 'recap' shows the reversible trade. Motion is CSS: cards rise in,
   connectors draw, chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'normalized', 'denorm', 'patterns', 'cost', 'when', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

/* the wide, folded OrderView used by denorm / cost / recap */
const WIDE_COLS = [
  { name: 'order_id', type: 'int', key: true },
  { name: 'customer_id', type: 'int', fk: true },
  { name: 'customer_name', type: 'text' },
  { name: 'customer_email', type: 'text' },
  { name: 'product_name', type: 'text' },
  { name: 'product_price', type: 'dec' },
  { name: 'qty', type: 'int' },
];

export function renderDenormalizationScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── normalized: four small tables, a tangle of FK connectors ────────────── */
  if (view === 'normalized') {
    const cust = tableCard(110, 190, { name: 'Customer', icon: 'app', tone: 'accent', cols: [
      { name: 'customer_id', type: 'int', key: true },
      { name: 'name', type: 'text' },
    ], w: 210 });
    const order = tableCard(430, 110, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: [
      { name: 'order_id', type: 'int', key: true },
      { name: 'customer_id', type: 'int', fk: true },
      { name: 'placed_at', type: 'ts' },
    ], w: 210, delay: 0.1 });
    const prod = tableCard(430, 360, { name: 'Product', icon: 'folder', tone: 'amber', cols: [
      { name: 'product_id', type: 'int', key: true },
      { name: 'name', type: 'text' },
      { name: 'price', type: 'dec' },
    ], w: 210, delay: 0.2 });
    const line = tableCard(760, 250, { name: 'OrderLine', icon: 'grid', tone: 'green', cols: [
      { name: 'order_id', type: 'int', fk: true },
      { name: 'product_id', type: 'int', fk: true },
      { name: 'qty', type: 'int' },
    ], w: 210, delay: 0.3 });
    body += cust.svg + order.svg + prod.svg + line.svg;
    body += connector({ x: cust.right, y: cust.rowCy(0), side: 'right' }, { x: order.left, y: order.rowCy(1), side: 'left' }, { from: 'one', to: 'many', delay: 0.5 }).svg;
    body += connector({ x: order.right, y: order.rowCy(0), side: 'right' }, { x: line.left, y: line.rowCy(0), side: 'left' }, { from: 'one', to: 'many', delay: 0.6 }).svg;
    body += connector({ x: prod.right, y: prod.rowCy(0), side: 'right' }, { x: line.left, y: line.rowCy(1), side: 'left' }, { from: 'one', to: 'many', delay: 0.7 }).svg;
    body += chip(VW / 2, 560, 'one order view = 5 joins', { icon: 'merge', iconVar: '--amber', w: 250, delay: 1.1 });
    body += caption(VW / 2, 40, 'Every fact in one place — ideal for writes, but one read must stitch four tables back together.', { delay: 1.0 });
    return assemble({ slug: 'denormalization', aria: 'Four normalized tables joined to build one view', body, note: snap.note });
  }

  /* ── denorm: one wide card folds the joined data together ─────────────────── */
  if (view === 'denorm') {
    const cols = WIDE_COLS.map((c, i) => ({ ...c, hot: i >= 2 && i <= 5 }));
    const card = tableCard(320, 120, { name: 'OrderView', icon: 'merge', tone: 'accent', cols, w: 400 });
    body += card.svg;
    body += chip(card.right + 150, card.rowCy(3), 'facts copied in', { icon: 'merge', iconVar: '--amber', w: 190, delay: 0.9 });
    body += chip(card.cx, card.top - 34, 'one read · no join', { icon: 'check', iconVar: '--green', w: 200, delay: 0.7 });
    body += caption(card.cx, card.bottom + 44, 'Customer and product facts folded onto the order row — the four-table join collapses into one read.', { delay: 1.1 });
    return assemble({ slug: 'denormalization', aria: 'One wide OrderView folding the joined tables together', body, note: snap.note });
  }

  /* ── patterns: the named denormalization shapes, as chips + captions ──────── */
  if (view === 'patterns') {
    const rows = [
      { y: 110, t: 'Summary / rollup tables', icon: 'layers', w: 260, d: 'pre-aggregated counts and totals, refreshed on a schedule' },
      { y: 230, t: 'Derived columns', icon: 'sliders', w: 210, d: 'store order_total once instead of re-summing the lines each read' },
      { y: 350, t: 'Materialized views', icon: 'database', w: 230, d: 'a join result persisted on disk and refreshed incrementally' },
      { y: 470, t: 'Precomputed wide tables', icon: 'merge', w: 270, d: 'fold related rows into one — the read skips every join' },
    ];
    rows.forEach((r, i) => {
      body += chip(VW / 2, r.y, r.t, { icon: r.icon, w: r.w, delay: 0.3 + i * 0.15 });
      body += caption(VW / 2, r.y + 30, r.d, { delay: 0.45 + i * 0.15 });
    });
    return assemble({ slug: 'denormalization', aria: 'Four denormalization patterns', body, note: snap.note });
  }

  /* ── cost: the wide card, redundant cells tinted, consistency warning ─────── */
  if (view === 'cost') {
    const cols = WIDE_COLS.map((c, i) => ({ ...c, hot: i >= 2 && i <= 5 }));
    const card = tableCard(320, 130, { name: 'OrderView', icon: 'merge', tone: 'rose', cols, w: 400 });
    body += card.svg;
    body += chip(card.right + 150, card.rowCy(3), 'repeated every row', { icon: 'alert', iconVar: '--red', w: 210, delay: 0.9 });
    body += chip(card.cx, card.top - 34, 'update anomaly returns', { icon: 'alert', iconVar: '--red', w: 230, delay: 0.7 });
    body += caption(card.cx, card.bottom + 44, 'Change one email and every copy must be rewritten in lockstep — forget a path and the copies drift.', { delay: 1.1 });
    return assemble({ slug: 'denormalization', aria: 'The denormalized card with redundant cells flagged', body, note: snap.note });
  }

  /* ── when: the decision — do / don't ─────────────────────────────────────── */
  if (view === 'when') {
    const yes = ['reads ≫ writes', 'join is measured', 'copied facts rarely change'];
    const gap = 300, startX = VW / 2 - (yes.length - 1) * gap / 2;
    body += chip(VW / 2, 120, 'denormalize when…', { icon: 'target', iconVar: '--green', w: 220, delay: 0.4 });
    yes.forEach((t, i) => { body += chip(startX + i * gap, 230, t, { icon: 'check', iconVar: '--green', w: 240, delay: 0.6 + i * 0.12 }); });
    body += chip(VW / 2, 360, 'keep it controlled', { icon: 'sliders', w: 210, delay: 1.0 });
    body += caption(VW / 2, 410, 'Denormalize only the query that hurts; keep the normalized tables as the source of truth.', { delay: 1.15 });
    body += chip(VW / 2, 470, 'never when writes dominate', { icon: 'alert', iconVar: '--red', w: 270, delay: 1.3 });
    return assemble({ slug: 'denormalization', aria: 'When to denormalize — the decision', body, note: snap.note });
  }

  /* ── recap: normalized source of truth ⇄ denormalized read layer ──────────── */
  const src = tableCard(140, 200, { name: 'Normalized', icon: 'grid', tone: 'green', cols: [
    { name: 'source of truth', type: '', ghost: true },
    { name: 'Customer', type: '1' },
    { name: 'Order · Line', type: 'n' },
  ], w: 230 });
  const read = tableCard(670, 200, { name: 'OrderView', icon: 'merge', tone: 'accent', cols: [
    { name: 'read layer', type: '', ghost: true },
    { name: 'wide · folded', type: '' },
    { name: 'rebuildable', type: '' },
  ], w: 230, delay: 0.2 });
  body += src.svg + read.svg;
  body += connector({ x: src.right, y: src.cy, side: 'right' }, { x: read.left, y: read.cy, side: 'left' }, { label: '⇄ reversible', delay: 0.6 }).svg;
  const checks = ['deliberate', 'measured', 'reversible'];
  const gap = 240, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body += chip(startX + i * gap, 500, t, { icon: 'check', iconVar: '--green', w: 200, delay: 1.0 + i * 0.1 }); });
  body += caption(VW / 2, 548, 'Normalized for truth, a rebuildable denormalized layer for speed — a deliberate, reversible trade.', { delay: 1.4 });
  return assemble({ slug: 'denormalization', aria: 'A normalized source of truth and a reversible denormalized read layer', body, note: snap.note });
}
