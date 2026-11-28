/* star-schema-scene.js — the "Star Schema" scene, on the flat schema CANVAS
   (engine/schema2d.js). The hero visual is the STAR itself: a central fact
   table with four denormalized dimension cards around it (top/bottom/left/
   right), each joined by a single N:1 crow's-foot spoke. Built fresh on the
   schema2d engine (no iso3d).

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'fact', 'star', 'dimensions', 'query', 'denorm', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW, VH } from '../engine/schema2d.js';

/* the central fact: measures + one FK per dimension, at the line-item grain */
const FACT = [
  { name: 'date_key', type: 'int', fk: true },
  { name: 'customer_key', type: 'int', fk: true },
  { name: 'product_key', type: 'int', fk: true },
  { name: 'store_key', type: 'int', fk: true },
  { name: 'quantity', type: 'int' },
  { name: 'revenue', type: 'numeric' },
];
const DIM_DATE = [
  { name: 'date_key', type: 'int', key: true },
  { name: 'month', type: 'text' },
];
const DIM_STORE = [
  { name: 'store_key', type: 'int', key: true },
  { name: 'region', type: 'text' },
];
const DIM_CUSTOMER = [
  { name: 'customer_key', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'city', type: 'text' },
  { name: 'segment', type: 'text' },
];
const DIM_PRODUCT = [
  { name: 'product_key', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'category', type: 'text' },
];
/* the flattened product dimension — a whole hierarchy in one wide row */
const DIM_PRODUCT_WIDE = [
  { name: 'product_key', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'category', type: 'text', hot: true },
  { name: 'department', type: 'text', hot: true },
  { name: 'brand', type: 'text', hot: true },
  { name: 'supplier', type: 'text' },
];

/* draw the full centered star. opts: { labelAll, productWide } */
function drawStar(opts = {}) {
  let body = '';
  const fact = tableCard(405, 180, { name: 'fact_sales', icon: 'database', tone: 'accent', cols: FACT, w: 230, delay: 0 });
  const date = tableCard(410, 40, { name: 'dim_date', icon: 'clock', tone: 'violet', cols: DIM_DATE, w: 220, delay: 0.25 });
  const store = tableCard(410, 432, { name: 'dim_store', icon: 'globe', tone: 'rose', cols: DIM_STORE, w: 220, delay: 0.3 });
  const customer = tableCard(40, 212, { name: 'dim_customer', icon: 'app', tone: 'green', cols: DIM_CUSTOMER, w: 220, delay: 0.35 });
  const product = tableCard(790, 220, { name: 'dim_product', icon: 'folder', tone: 'amber', cols: opts.productWide ? DIM_PRODUCT_WIDE : DIM_PRODUCT, w: 220, delay: 0.4 });
  body += fact.svg + date.svg + store.svg + customer.svg + product.svg;

  // four N:1 spokes, fact (many) → dimension (one)
  body += connector({ x: fact.cx, y: fact.top, side: 'left' }, { x: date.cx, y: date.bottom, side: 'left' }, { from: 'many', to: 'one', delay: 0.8 }).svg;
  body += connector({ x: fact.cx, y: fact.bottom, side: 'left' }, { x: store.cx, y: store.top, side: 'left' }, { from: 'many', to: 'one', delay: 0.9 }).svg;
  body += connector({ x: fact.left, y: fact.rowCy(1), side: 'left' }, { x: customer.right, y: customer.rowCy(0), side: 'right' }, { from: 'many', to: 'one', label: 'N : 1', delay: 1.0 }).svg;
  body += connector({ x: fact.right, y: fact.rowCy(2), side: 'right' }, { x: product.left, y: product.rowCy(0), side: 'left' }, { from: 'many', to: 'one', label: 'N : 1', delay: 1.1 }).svg;

  return { body, fact, date, store, customer, product };
}

export function renderStarSchemaScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── fact: the central table alone ─────────────────────────────────────── */
  if (view === 'fact') {
    const fact = tableCard(395, 180, { name: 'fact_sales', icon: 'database', tone: 'accent', cols: FACT, w: 250, delay: 0 });
    body += fact.svg;
    body += chip(fact.left - 150, fact.rowCy(1.5), 'foreign keys', { icon: 'merge', iconVar: '--accent', w: 160, delay: 0.9 });
    body += chip(fact.right + 150, fact.rowCy(4.5), 'measures', { icon: 'gauge', iconVar: '--green', w: 146, delay: 1.0 });
    body += chip(fact.cx, fact.bottom + 44, 'grain: one line item', { icon: 'grid', iconVar: '--violet', w: 220, delay: 1.2 });
    body += caption(VW / 2, fact.bottom + 92, 'A fact row is measures plus one foreign key per dimension — narrow, tall, nothing descriptive.', { delay: 1.4 });
    return assemble({ slug: 'star-schema', aria: 'The central fact table', body, note: snap.note });
  }

  /* ── dimensions: the star with dim_product flattened wide ──────────────── */
  if (view === 'dimensions') {
    const r = drawStar({ productWide: true });
    body = r.body;
    body += chip(r.product.cx, r.product.bottom + 34, 'flattened hierarchy', { icon: 'layers', iconVar: '--amber', w: 210, delay: 1.3 });
    return assemble({ slug: 'star-schema', aria: 'A star with a wide denormalized product dimension', body, note: snap.note });
  }

  /* ── query: the star, two dims lit for a slice-and-dice ────────────────── */
  if (view === 'query') {
    const r = drawStar();
    body = r.body;
    body += chip(VW / 2, 560, 'SUM(revenue)  GROUP BY category, month', { icon: 'search', iconVar: '--accent', w: 420, delay: 1.4 });
    return assemble({ slug: 'star-schema', aria: 'A star-schema analytical query, one join hop to each dimension', body, note: snap.note });
  }

  /* ── star / denorm / recap: the full centered star ─────────────────────── */
  const r = drawStar();
  body = r.body;
  if (view === 'denorm') {
    body += chip(VW / 2, 560, 'redundancy → simple joins · fast slicing · intuitive', { icon: 'check', iconVar: '--green', w: 440, delay: 1.4 });
  } else if (view === 'recap') {
    body += chip(VW / 2, 560, 'one fact · four dimensions · one N:1 hop each', { icon: 'target', iconVar: '--accent', w: 388, delay: 1.4 });
  }
  return assemble({ slug: 'star-schema', aria: 'A star schema: one fact table surrounded by four dimensions', body, note: snap.note });
}
