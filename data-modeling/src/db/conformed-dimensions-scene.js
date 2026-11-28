/* conformed-dimensions-scene.js — the "Conformed Dimensions" scene, on the flat
   schema CANVAS (engine/schema2d.js). The hero is two fact tables sharing ONE
   central dimension: first as silos with private date dimensions, then conformed
   into a single shared dim_date / dim_product the two facts drill across.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'two-marts', 'silo', 'conform', 'shared', 'drill-across', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

const FACT_SALES = [
  { name: 'sale_id', type: 'bigint', key: true },
  { name: 'date_key', type: 'int', fk: true },
  { name: 'product_key', type: 'int', fk: true },
  { name: 'units_sold', type: 'int' },
];
const FACT_INV = [
  { name: 'inv_id', type: 'bigint', key: true },
  { name: 'date_key', type: 'int', fk: true },
  { name: 'product_key', type: 'int', fk: true },
  { name: 'units_on_hand', type: 'int' },
];
const DIM_DATE = [
  { name: 'date_key', type: 'int', key: true },
  { name: 'full_date', type: 'date' },
  { name: 'month', type: 'text' },
  { name: 'year', type: 'int' },
];
const DIM_PRODUCT = [
  { name: 'product_key', type: 'int', key: true },
  { name: 'sku', type: 'text' },
  { name: 'category', type: 'text' },
];

/* two facts flanking a shared center of dim_date (top) + dim_product (bottom) */
function sharedStar(body, { dateTone = 'amber' } = {}) {
  const date = tableCard(410, 56, { name: 'dim_date', icon: 'clock', tone: dateTone, cols: DIM_DATE, w: 220 });
  const product = tableCard(410, 360, { name: 'dim_product', icon: 'folder', tone: 'green', cols: DIM_PRODUCT, w: 220 });
  const sales = tableCard(70, 210, { name: 'fact_sales', icon: 'database', tone: 'accent', cols: FACT_SALES, w: 240 });
  const inv = tableCard(730, 210, { name: 'fact_inventory', icon: 'layers', tone: 'violet', cols: FACT_INV, w: 240 });
  body.s += date.svg + product.svg + sales.svg + inv.svg;
  // sales → both shared dims (left side of dims)
  body.s += connector({ x: sales.right, y: sales.rowCy(1), side: 'right' }, { x: date.left, y: date.rowCy(0), side: 'left' }, { from: 'many', to: 'one', delay: 0.8 }).svg;
  body.s += connector({ x: sales.right, y: sales.rowCy(2), side: 'right' }, { x: product.left, y: product.rowCy(0), side: 'left' }, { from: 'many', to: 'one', delay: 0.95 }).svg;
  // inventory → both shared dims (right side of dims)
  body.s += connector({ x: inv.left, y: inv.rowCy(1), side: 'left' }, { x: date.right, y: date.rowCy(0), side: 'right' }, { from: 'many', to: 'one', delay: 1.05 }).svg;
  body.s += connector({ x: inv.left, y: inv.rowCy(2), side: 'left' }, { x: product.right, y: product.rowCy(0), side: 'right' }, { from: 'many', to: 'one', delay: 1.2 }).svg;
  return { date, product, sales, inv };
}

export function renderConformedDimensionsScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  const body = { s: '' };

  /* ── two-marts / silo: two facts, each with a PRIVATE date dimension ─────── */
  if (view === 'two-marts' || view === 'silo') {
    const broken = view === 'silo';
    const dSales = tableCard(90, 70, { name: 'dim_date_sales', icon: 'clock', tone: broken ? 'rose' : 'amber', w: 230, cols: [
      { name: 'date_key', type: 'int', key: true }, { name: 'full_date', type: 'date' } ] });
    const dInv = tableCard(720, 70, { name: 'dim_date_inv', icon: 'clock', tone: broken ? 'rose' : 'amber', w: 230, cols: [
      { name: 'date_key', type: 'int', key: true }, { name: 'full_date', type: 'date' } ] });
    const sales = tableCard(90, 240, { name: 'fact_sales', icon: 'database', tone: 'accent', cols: FACT_SALES, w: 230 });
    const inv = tableCard(720, 240, { name: 'fact_inventory', icon: 'layers', tone: 'violet', cols: FACT_INV, w: 230 });
    body.s += dSales.svg + dInv.svg + sales.svg + inv.svg;
    body.s += band(60, 48, 290, 500, 'Sales mart', { delay: 0 });
    body.s += band(690, 48, 290, 500, 'Inventory mart', { delay: 0.1 });
    body.s += connector({ x: sales.right - 80, y: sales.top, side: 'left' }, { x: dSales.cx, y: dSales.bottom, side: 'right' }, { from: 'many', to: 'one', delay: 0.7 }).svg;
    body.s += connector({ x: inv.left + 80, y: inv.top, side: 'right' }, { x: dInv.cx, y: dInv.bottom, side: 'left' }, { from: 'many', to: 'one', delay: 0.8 }).svg;

    if (broken) {
      body.s += chip(VW / 2, 300, 'keys don’t match', { icon: 'alert', iconVar: '--red', w: 190, delay: 1.0 });
      body.s += connector({ x: dSales.right, y: dSales.rowCy(0), side: 'right' }, { x: dInv.left, y: dInv.rowCy(0), side: 'left' }, { delay: 1.1, ghost: true }).svg;
      body.s += caption(VW / 2, 572, 'date_key = 42 means different days in each mart — fact_sales and fact_inventory cannot be joined on day.', { delay: 1.4 });
    } else {
      body.s += chip(VW / 2, 300, 'compare by product & day?', { icon: 'search', iconVar: '--accent', w: 270, delay: 1.0 });
      body.s += caption(VW / 2, 572, 'Two processes the business wants to line up — whether you can depends on how their dimensions were built.', { delay: 1.3 });
    }
    return assemble({ slug: 'conformed-dimensions', aria: 'Two data marts measuring two processes', body: body.s, note: snap.note });
  }

  /* ── conform: two private dims collapse into one authoritative dim_date ───── */
  if (view === 'conform') {
    const dSales = tableCard(70, 90, { name: 'dim_date_sales', icon: 'clock', tone: 'rose', w: 210, cols: [
      { name: 'date_key', type: 'int', key: true }, { name: 'full_date', type: 'date' } ] });
    const dInv = tableCard(70, 330, { name: 'dim_date_inv', icon: 'clock', tone: 'rose', w: 210, cols: [
      { name: 'date_key', type: 'int', key: true }, { name: 'full_date', type: 'date' } ] });
    const conf = tableCard(620, 190, { name: 'dim_date', icon: 'clock', tone: 'green', cols: DIM_DATE, w: 250 });
    body.s += dSales.svg + dInv.svg + conf.svg;
    body.s += connector({ x: dSales.right, y: dSales.rowCy(0), side: 'right' }, { x: conf.left, y: conf.rowCy(0), side: 'left' }, { delay: 0.7, ghost: true }).svg;
    body.s += connector({ x: dInv.right, y: dInv.rowCy(0), side: 'right' }, { x: conf.left, y: conf.rowCy(0), side: 'left' }, { delay: 0.85, ghost: true }).svg;
    body.s += chip(conf.cx, conf.top - 28, 'conformed — defined once', { icon: 'check', iconVar: '--green', w: 240, delay: 1.1 });
    body.s += caption(VW / 2, 560, 'Two private copies collapse into one authoritative dim_date — same keys, same attributes, one definition.', { delay: 1.4 });
    return assemble({ slug: 'conformed-dimensions', aria: 'Two private dimensions conformed into one', body: body.s, note: snap.note });
  }

  /* ── shared / drill-across / recap: the shared-center star ───────────────── */
  const anchors = sharedStar(body, {});

  if (view === 'drill-across') {
    body.s += chip(anchors.sales.cx, anchors.sales.bottom + 34, 'Σ by product · day', { icon: 'gauge', iconVar: '--accent', w: 210, delay: 1.3 });
    body.s += chip(anchors.inv.cx, anchors.inv.bottom + 34, 'Σ by product · day', { icon: 'gauge', iconVar: '--violet', w: 210, delay: 1.4 });
    body.s += caption(VW / 2, 560, 'Aggregate each fact to the shared grain, then join the small results on date_key & product_key — sell-through.', { delay: 1.6 });
  } else if (view === 'recap') {
    const checks = ['shared keys', 'one definition', 'drill-across'];
    const gap = 200, startX = VW / 2 - (checks.length - 1) * gap / 2;
    checks.forEach((t, i) => { body.s += chip(startX + i * gap, 548, t, { icon: 'check', iconVar: '--green', w: 180, delay: 1.4 + i * 0.12 }); });
  } else {
    body.s += chip(VW / 2, 292, 'shared', { icon: 'merge', iconVar: '--green', w: 120, delay: 1.3 });
    body.s += caption(VW / 2, 560, 'One dim_date and one dim_product at the center — both facts reference the same rows, so they can be compared.', { delay: 1.5 });
  }
  return assemble({ slug: 'conformed-dimensions', aria: 'Two fact tables sharing conformed dimensions', body: body.s, note: snap.note });
}
