/* dimension-tables-scene.js — the "Dimension Tables" scene, on the flat schema
   CANVAS (engine/schema2d.js). The hero is a wide, denormalized dimension card
   keyed by a surrogate, plus the star join from a lean fact to that dimension
   and a date-hierarchy drill.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'anatomy', 'attributes', 'surrogate', 'hierarchy', 'slice', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

const DIM_CUSTOMER = [
  { name: 'customer_key', type: 'int', key: true },
  { name: 'customer_id', type: 'text' },
  { name: 'full_name', type: 'text' },
  { name: 'city', type: 'text' },
  { name: 'state', type: 'text' },
  { name: 'country', type: 'text' },
  { name: 'segment', type: 'text' },
];
const DIM_PRODUCT = [
  { name: 'product_key', type: 'int', key: true },
  { name: 'sku', type: 'text' },
  { name: 'product_name', type: 'text' },
  { name: 'brand', type: 'text' },
  { name: 'category', type: 'text' },
  { name: 'department', type: 'text' },
];
const DIM_DATE = [
  { name: 'date_key', type: 'int', key: true },
  { name: 'full_date', type: 'date' },
  { name: 'month', type: 'text' },
  { name: 'quarter', type: 'text' },
  { name: 'year', type: 'int' },
];
const FACT_SALES = [
  { name: 'sale_id', type: 'bigint', key: true },
  { name: 'customer_key', type: 'int', fk: true },
  { name: 'product_key', type: 'int', fk: true },
  { name: 'quantity', type: 'int' },
  { name: 'net_amount', type: 'decimal' },
];

export function renderDimensionTablesScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── single wide-dimension views: anatomy / attributes / surrogate ───────── */
  if (view === 'anatomy' || view === 'attributes' || view === 'surrogate') {
    const isProduct = view === 'attributes';
    const base = isProduct ? DIM_PRODUCT : DIM_CUSTOMER;
    const name = isProduct ? 'dim_product' : 'dim_customer';
    const cols = base.map((c, i) => ({
      ...c,
      hot: (view === 'attributes' && i >= 3) || (view === 'surrogate' && i === 0),
    }));
    const w = 300, x = 300, y = 120;
    const card = tableCard(x, y, { name, icon: 'folder', tone: 'green', cols, w });
    body += card.svg;

    if (view === 'anatomy') {
      body += chip(card.cx, y - 30, 'dimension — the who / what / where', { icon: 'folder', iconVar: '--green', w: 300, delay: 0.5 });
      body += caption(card.cx, card.bottom + 38, 'Few rows, many descriptive attributes — the context every fact borrows.', { delay: 0.85 });
    } else if (view === 'attributes') {
      body += chip(card.right + 128, card.rowCy(4), 'wide & denormalized', { icon: 'layers', iconVar: '--green', w: 210, delay: 0.7 });
      body += connector(
        { x: card.right, y: card.rowCy(4), side: 'right' },
        { x: card.right + 18, y: card.rowCy(4), side: 'left' },
        { delay: 0.6, ghost: true }).svg;
      body += caption(card.cx, card.bottom + 38, 'brand → category → department flattened in — no join to read a label.', { delay: 0.9 });
    } else {
      body += chip(card.right + 132, card.rowCy(0), 'surrogate PK — warehouse-minted', { icon: 'key', iconVar: '--amber', w: 290, delay: 0.6 });
      body += chip(card.right + 132, card.rowCy(1), 'natural key — just an attribute', { icon: 'merge', iconVar: '--accent', w: 270, delay: 0.8 });
      body += connector({ x: card.right, y: card.rowCy(0), side: 'right' }, { x: card.right + 18, y: card.rowCy(0), side: 'left' }, { delay: 0.5, ghost: true }).svg;
      body += connector({ x: card.right, y: card.rowCy(1), side: 'right' }, { x: card.right + 18, y: card.rowCy(1), side: 'left' }, { delay: 0.7, ghost: true }).svg;
      body += caption(card.cx, card.bottom + 38, 'Facts point at customer_key — source renumbering never reaches them.', { delay: 1.0 });
    }
    return assemble({ slug: 'dimension-tables', aria: 'A wide dimension table keyed by a surrogate', body, note: snap.note });
  }

  /* ── hierarchy view: dim_date with a drill-up chain ──────────────────────── */
  if (view === 'hierarchy') {
    const w = 260, x = 110, y = 170;
    const card = tableCard(x, y, { name: 'dim_date', icon: 'clock', tone: 'violet', cols: DIM_DATE, w });
    body += card.svg;
    const levels = ['full_date', 'month', 'quarter', 'year'];
    const lx = 560, lgap = 92;
    let prev = null;
    levels.forEach((lv, i) => {
      const cy = y + 30 + i * lgap;
      const c = chip(lx, cy, lv, { icon: 'chevron', iconVar: '--violet', w: 180, delay: 0.7 + i * 0.18 });
      body += c;
      if (prev) {
        body += connector({ x: lx, y: prev + 13, side: 'right' }, { x: lx, y: cy - 13, side: 'right' }, { from: 'many', to: 'one', delay: 0.8 + i * 0.18, ghost: true }).svg;
      }
      prev = cy;
    });
    body += connector(
      { x: card.right, y: card.rowCy(1), side: 'right' },
      { x: lx - 90, y: y + 30, side: 'left' },
      { delay: 1.0, ghost: true }).svg;
    body += caption(VW / 2, 548, 'day rolls up to month, quarter, year — every level a column, so drill-down is a GROUP BY.', { delay: 1.5 });
    return assemble({ slug: 'dimension-tables', aria: 'A date dimension with its hierarchy as columns', body, note: snap.note });
  }

  /* ── slice / recap: lean fact joined to a wide dimension ─────────────────── */
  const fact = tableCard(130, 190, { name: 'fact_sales', icon: 'database', tone: 'accent', cols: FACT_SALES, w: 250 });
  const dim = tableCard(620, 150, { name: 'dim_customer', icon: 'folder', tone: 'green', cols: DIM_CUSTOMER, w: 270 });
  body += fact.svg + dim.svg;
  body += connector(
    { x: fact.right, y: fact.rowCy(1), side: 'right' },
    { x: dim.left, y: dim.rowCy(0), side: 'left' },
    { from: 'many', to: 'one', label: 'N : 1', delay: 0.8 }).svg;

  if (view === 'recap') {
    const checks = ['surrogate key', 'wide', 'few rows', 'readable'];
    const gap = 210, startX = VW / 2 - (checks.length - 1) * gap / 2;
    checks.forEach((t, i) => { body += chip(startX + i * gap, 530, t, { icon: 'check', iconVar: '--green', w: 174, delay: 1.1 + i * 0.1 }); });
    body += caption(VW / 2, 572, 'Lean fact, wide readable dimension — joined on the surrogate key.', { delay: 1.5 });
  } else {
    body += chip(dim.cx, dim.bottom + 34, 'GROUP BY segment, city…', { icon: 'sliders', iconVar: '--green', w: 250, delay: 1.1 });
    body += caption(VW / 2, 560, 'The fact supplies the SUM; dim_customer attributes supply every filter, group-by and label.', { delay: 1.4 });
  }
  return assemble({ slug: 'dimension-tables', aria: 'A lean fact joined to a wide dimension', body, note: snap.note });
}
