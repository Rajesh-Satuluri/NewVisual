/* aggregate-tables-scene.js — the "Aggregate Tables" scene, on the flat schema
   CANVAS (engine/schema2d.js). The hero visual is the base fact (huge, fine grain)
   rolling up into a small aggregate fact (coarse grain), with a navigator chip that
   routes each query to the smallest table that answers it.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'base', 'rollup', 'aggregate', 'navigation', 'tradeoff', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW, VH } from '../engine/schema2d.js';

/* base fact: one row per product, store, day */
const BASE = [
  { name: 'date_key', type: 'int', fk: true },
  { name: 'product_key', type: 'int', fk: true },
  { name: 'store_key', type: 'int', fk: true },
  { name: 'units', type: 'int' },
  { name: 'revenue', type: 'decimal' },
];
/* aggregate fact: one row per category, month */
const AGG = [
  { name: 'month_key', type: 'int', fk: true },
  { name: 'category_key', type: 'int', fk: true },
  { name: 'units', type: 'int' },
  { name: 'revenue', type: 'decimal' },
];

export function renderAggregateTablesScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── base fact alone ───────────────────────────────────────────────────── */
  if (view === 'base') {
    const card = tableCard(395, 170, { name: 'fct_sales', icon: 'database', tone: 'accent', cols: BASE, w: 250 });
    body += card.svg;
    body += chip(card.cx, card.top - 30, 'grain: product × store × day', { icon: 'grid', iconVar: '--accent', w: 280, delay: 0.5 });
    body += chip(card.right + 140, card.cy, '≈ 1.8B rows', { icon: 'layers', iconVar: '--amber', w: 170, delay: 0.8 });
    body += caption(card.cx, card.bottom + 44, 'The base fact is at the finest grain — flexible enough to answer anything, and correctly enormous.', { delay: 1.1 });
    return assemble({ slug: 'aggregate-tables', aria: 'The base fact table at the atomic grain', body, note: snap.note });
  }

  /* ── problem: full scan of the base for a coarse query ─────────────────── */
  if (view === 'rollup') {
    const card = tableCard(130, 180, { name: 'fct_sales', icon: 'database', tone: 'rose', cols: BASE.map(c => ({ ...c, hot: true })), w: 250 });
    body += card.svg;
    const q = tableCard(680, 230, { name: 'monthly × category', icon: 'search', tone: 'slate', cols: [{ name: 'few hundred totals', ghost: true }], w: 250 });
    body += q.svg;
    body += connector(
      { x: card.right, y: card.cy, side: 'right' },
      { x: q.left, y: q.rowCy(0), side: 'left' },
      { from: 'many', to: 'one', label: 'scan 1.8B', delay: 0.8 }).svg;
    body += chip(card.cx, card.top - 30, 'FULL SCAN', { icon: 'alert', iconVar: '--red', w: 150, delay: 1.2 });
    body += caption(VW / 2, 540, 'A coarse question scans all 1.8B atomic rows to return a few hundred totals — on every refresh.', { delay: 1.3 });
    return assemble({ slug: 'aggregate-tables', aria: 'A coarse query scanning the entire base fact', body, note: snap.note });
  }

  /* ── base rolls up into the aggregate: aggregate / navigation / tradeoff / recap ── */
  const base = tableCard(110, 140, { name: 'fct_sales', icon: 'database', tone: 'accent', cols: BASE, w: 250 });
  const agg = tableCard(680, 180, { name: 'agg_sales_month', icon: 'layers', tone: 'green', cols: AGG, w: 250 });
  body += base.svg + agg.svg;
  body += chip(base.cx, base.top - 28, '1.8B rows', { icon: 'layers', iconVar: '--amber', w: 140, delay: 0.5 });
  body += chip(agg.cx, agg.top - 28, '~40K rows', { icon: 'check', iconVar: '--green', w: 140, delay: 0.7 });
  body += connector(
    { x: base.right, y: base.rowCy(3), side: 'right' },
    { x: agg.left, y: agg.rowCy(2), side: 'left' },
    { from: 'many', to: 'one', label: 'SUM rollup', delay: 0.9 }).svg;

  if (view === 'navigation' || view === 'recap') {
    body += chip(VW / 2, 470, 'aggregate navigator', { icon: 'sliders', iconVar: '--violet', w: 240, delay: 1.2 });
    body += connector(
      { x: agg.cx - 80, y: 458, side: 'left' },
      { x: agg.cx, y: agg.bottom, side: 'left' },
      { delay: 1.3, ghost: true }).svg;
    body += caption(VW / 2, 540, view === 'recap'
      ? 'The navigator picks the smallest table per query — monthly to the 40K aggregate, daily to the 1.8B base.'
      : 'Coarse queries route to the aggregate (40K), fine drill-downs fall through to the base (1.8B) — transparently.', { delay: 1.5 });
  } else if (view === 'tradeoff') {
    body += chip(VW / 2, 470, 'refresh on every base load', { icon: 'clock', iconVar: '--amber', w: 290, delay: 1.2 });
    body += caption(VW / 2, 540, 'The aggregate must be refreshed with the base — an unrefreshed aggregate is a fast wrong answer.', { delay: 1.4 });
  } else {
    // 'aggregate'
    body += caption(VW / 2, 500, 'Same facts, coarser grain — daily→monthly, product→category. The aggregate sits beside the base, not instead of it.', { delay: 1.2 });
  }
  return assemble({ slug: 'aggregate-tables', aria: 'Base fact rolling up into a small aggregate fact', body, note: snap.note });
}
