/* snowflake-schema-scene.js — the "Snowflake Schema" scene, on the flat schema
   CANVAS (engine/schema2d.js). The hero visual is a star dimension EXPANDING
   into a normalized chain: one wide dim_product splits into
   dim_product → dim_category → dim_department, branching off the fact.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'star-dim', 'snowflake', 'chain', 'tradeoff', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW, VH } from '../engine/schema2d.js';

const FACT = [
  { name: 'product_key', type: 'int', fk: true },
  { name: 'date_key', type: 'int', fk: true },
  { name: 'revenue', type: 'numeric' },
];
/* the flattened star dimension — hierarchy on every row */
const DIM_PRODUCT_WIDE = [
  { name: 'product_key', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'category', type: 'text', hot: true },
  { name: 'department', type: 'text', hot: true },
];
/* the normalized (snowflaked) chain */
const DIM_PRODUCT = [
  { name: 'product_key', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'category_key', type: 'int', fk: true },
];
const DIM_CATEGORY = [
  { name: 'category_key', type: 'int', key: true },
  { name: 'category', type: 'text' },
  { name: 'department_key', type: 'int', fk: true },
];
const DIM_DEPARTMENT = [
  { name: 'department_key', type: 'int', key: true },
  { name: 'department', type: 'text' },
];

/* the four-card normalized chain: fact → product → category → department */
function drawChain() {
  let body = '';
  const fact = tableCard(40, 200, { name: 'fact_sales', icon: 'database', tone: 'accent', cols: FACT, w: 210, delay: 0 });
  const product = tableCard(290, 200, { name: 'dim_product', icon: 'folder', tone: 'amber', cols: DIM_PRODUCT, w: 210, delay: 0.15 });
  const category = tableCard(540, 200, { name: 'dim_category', icon: 'layers', tone: 'violet', cols: DIM_CATEGORY, w: 210, delay: 0.3 });
  const department = tableCard(790, 215, { name: 'dim_department', icon: 'grid', tone: 'green', cols: DIM_DEPARTMENT, w: 210, delay: 0.45 });
  body += fact.svg + product.svg + category.svg + department.svg;
  body += connector({ x: fact.right, y: fact.rowCy(0), side: 'right' }, { x: product.left, y: product.rowCy(0), side: 'left' }, { from: 'many', to: 'one', label: 'N : 1', delay: 0.8 }).svg;
  body += connector({ x: product.right, y: product.rowCy(2), side: 'right' }, { x: category.left, y: category.rowCy(0), side: 'left' }, { from: 'many', to: 'one', label: 'N : 1', delay: 0.95 }).svg;
  body += connector({ x: category.right, y: category.rowCy(2), side: 'right' }, { x: department.left, y: department.rowCy(0), side: 'left' }, { from: 'many', to: 'one', label: 'N : 1', delay: 1.1 }).svg;
  return { body, fact, product, category, department };
}

export function renderSnowflakeSchemaScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── star-dim: fact + one wide denormalized dimension ──────────────────── */
  if (view === 'star-dim') {
    const fact = tableCard(170, 210, { name: 'fact_sales', icon: 'database', tone: 'accent', cols: FACT, w: 220, delay: 0 });
    const product = tableCard(560, 195, { name: 'dim_product', icon: 'folder', tone: 'amber', cols: DIM_PRODUCT_WIDE, w: 250, delay: 0.2 });
    body += fact.svg + product.svg;
    body += connector({ x: fact.right, y: fact.rowCy(0), side: 'right' }, { x: product.left, y: product.rowCy(0), side: 'left' }, { from: 'many', to: 'one', label: 'N : 1', delay: 0.8 }).svg;
    body += chip(product.cx, product.bottom + 40, 'category · department repeat per row', { icon: 'alert', iconVar: '--red', w: 320, delay: 1.1 });
    body += caption(VW / 2, product.bottom + 86, 'One wide dimension holds the whole hierarchy — the parent levels are stored on every product row.', { delay: 1.3 });
    return assemble({ slug: 'snowflake-schema', aria: 'A wide, denormalized star dimension', body, note: snap.note });
  }

  /* ── tradeoff: star vs snowflake side by side ──────────────────────────── */
  if (view === 'tradeoff') {
    body += band(60, 100, 420, 360, 'Star — denormalized', { sub: 'wide dimension · one join hop', delay: 0 });
    body += band(560, 100, 420, 360, 'Snowflake — normalized', { sub: 'dimension chain · many hops', delay: 0.2 });
    body += chip(270, 240, 'redundant, readable', { icon: 'check', iconVar: '--green', w: 212, delay: 0.6 });
    body += chip(270, 320, '1 join', { icon: 'bolt', iconVar: '--accent', w: 120, delay: 0.72 });
    body += chip(770, 240, 'compact, integrity', { icon: 'check', iconVar: '--violet', w: 206, delay: 0.66 });
    body += chip(770, 320, '3 joins', { icon: 'alert', iconVar: '--amber', w: 128, delay: 0.78 });
    body += caption(VW / 2, 512, 'Snowflake saves storage on tables that are already tiny, and costs join simplicity on every query.', { delay: 1.1 });
    return assemble({ slug: 'snowflake-schema', aria: 'Star versus snowflake tradeoff', body, note: snap.note });
  }

  /* ── snowflake / chain / recap: the normalized chain ───────────────────── */
  const r = drawChain();
  body = r.body;
  if (view === 'chain') {
    body += chip(VW / 2, 420, 'fact → product → category → department', { icon: 'merge', iconVar: '--accent', w: 400, delay: 1.3 });
    body += caption(VW / 2, 470, 'A "by department" rollup now joins through three tables — the chain the snowflake creates.', { delay: 1.5 });
  } else if (view === 'snowflake') {
    body += chip(VW / 2, 420, 'each parent level stored once', { icon: 'check', iconVar: '--green', w: 290, delay: 1.3 });
    body += caption(VW / 2, 470, 'The hierarchy is normalized into sub-dimensions — "Footwear" lives in exactly one row now.', { delay: 1.5 });
  } else {
    body += chip(VW / 2, 420, 'normalized chain — prefer the flatter star', { icon: 'target', iconVar: '--accent', w: 370, delay: 1.3 });
    body += caption(VW / 2, 470, 'A snowflake trades the star\'s one-hop simplicity for integrity and storage most warehouses don\'t need.', { delay: 1.5 });
  }
  return assemble({ slug: 'snowflake-schema', aria: 'A snowflaked dimension chain', body, note: snap.note });
}
