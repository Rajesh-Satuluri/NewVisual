/* conceptual-logical-physical-scene.js — the "Conceptual · Logical · Physical"
   scene, on the flat schema CANVAS (engine/schema2d.js), not the isometric
   machinery of db-scale. One model is drawn three times: a conceptual picture of
   entities and relationships, a logical design of tables and keys, and a physical
   schema of concrete types and indexes. The three level bands carry the lesson.
   Motion is CSS — cards rise, rows slide, connectors draw, chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'overview', 'conceptual', 'logical', 'physical', 'mapping', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

/* logical-level columns: tables, typed, with primary & foreign keys */
const CUSTOMER_COLS = [
  { name: 'customer_id', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'email', type: 'text' },
];
const ORDER_COLS = [
  { name: 'order_id', type: 'int', key: true },
  { name: 'customer_id', type: 'int', fk: true },
  { name: 'total', type: 'decimal' },
];

/* physical-level columns: concrete engine types */
const PHYS_CUSTOMER_COLS = [
  { name: 'customer_id', type: 'bigint', key: true },
  { name: 'name', type: 'varchar(80)' },
  { name: 'email', type: 'varchar(160)' },
];
const PHYS_ORDER_COLS = [
  { name: 'order_id', type: 'bigint', key: true },
  { name: 'customer_id', type: 'bigint', fk: true },
  { name: 'total', type: 'numeric(12,2)' },
];

/* the three stacked level bands, each holding a mini Customer+Order pair. Shared
   by the 'overview' and 'mapping' views. `refine` adds the down-arrow chips. */
function levelStack(refine) {
  const LEVELS = [
    { y: 18, label: 'Conceptual', sub: 'entities & relationships — no technology',
      cust: [], order: [], from: null, to: null, lbl: 'places' },
    { y: 186, label: 'Logical', sub: 'tables, columns, primary & foreign keys',
      cust: [{ name: 'customer_id', key: true }], order: [{ name: 'order_id', key: true }, { name: 'customer_id', fk: true }],
      from: 'one', to: 'many', lbl: '1 : N' },
    { y: 354, label: 'Physical', sub: 'types, indexes, storage for one engine',
      cust: [{ name: 'customer_id', type: 'bigint', key: true }], order: [{ name: 'order_id', type: 'bigint', key: true }, { name: 'customer_id', type: 'bigint', fk: true }],
      from: 'one', to: 'many', lbl: 'idx' },
  ];
  let s = '';
  LEVELS.forEach((lv, k) => {
    const d = k * 0.25;
    s += band(40, lv.y, VW - 80, 156, lv.label, { sub: lv.sub, delay: d });
    const cust = tableCard(486, lv.y + 28, { name: 'Customer', icon: 'app', tone: 'accent', cols: lv.cust, w: 205, delay: d + 0.12 });
    const order = tableCard(742, lv.y + 28, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: lv.order, w: 205, delay: d + 0.2 });
    s += cust.svg + order.svg;
    s += connector(
      { x: cust.right, y: cust.headCy, side: 'right' },
      { x: order.left, y: order.headCy, side: 'left' },
      { from: lv.from, to: lv.to, label: lv.lbl, delay: d + 0.35 }).svg;
    // between-band 'refine' markers for the mapping view
    if (refine && k < LEVELS.length - 1) {
      s += chip(300, lv.y + 170, 'refine ↓', { icon: 'chevron', w: 150, delay: d + 0.5 });
    }
  });
  return s;
}

export function renderConceptualLogicalPhysicalScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── overview: the three stacked level bands ───────────────────────────── */
  if (view === 'overview') {
    body += levelStack(false);
    return assemble({ slug: 'conceptual-logical-physical', aria: 'One model at three levels of detail', body, note: snap.note });
  }

  /* ── mapping: the same bands, emphasising increasing detail ────────────── */
  if (view === 'mapping') {
    body += levelStack(true);
    body += caption(VW / 2, 540, 'Each level down refines the one above — and costs more to unwind.', { delay: 1.1 });
    return assemble({ slug: 'conceptual-logical-physical', aria: 'Refining the model down the three levels', body, note: snap.note });
  }

  /* ── conceptual: two header-only entities, a plain 'places' relationship ── */
  if (view === 'conceptual') {
    const cust = tableCard(150, 255, { name: 'Customer', icon: 'app', tone: 'accent', cols: [], w: 300 });
    const order = tableCard(590, 255, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: [], w: 300 });
    body += cust.svg + order.svg;
    body += chip(cust.cx, cust.top - 34, 'entity', { icon: 'grid', delay: 0.4 });
    body += chip(order.cx, order.top - 34, 'entity', { icon: 'grid', delay: 0.5 });
    body += connector(
      { x: cust.right, y: cust.headCy, side: 'right' },
      { x: order.left, y: order.headCy, side: 'left' },
      { label: 'places', delay: 0.6 }).svg;
    body += caption(VW / 2, cust.bottom + 56, 'Entities and one relationship — the picture a stakeholder signs off. No columns, no keys, no technology.', { delay: 1.0 });
    return assemble({ slug: 'conceptual-logical-physical', aria: 'The conceptual model: entities and a relationship', body, note: snap.note });
  }

  /* ── logical: tables with keys, a 1:N crow's-foot relationship ─────────── */
  if (view === 'logical') {
    const cust = tableCard(170, 165, { name: 'Customer', icon: 'app', tone: 'accent', cols: CUSTOMER_COLS, w: 250 });
    const order = tableCard(620, 193, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: ORDER_COLS, w: 250 });
    body += cust.svg + order.svg;
    body += connector(
      { x: cust.right, y: cust.rowCy(0), side: 'right' },
      { x: order.left, y: order.rowCy(1), side: 'left' },
      { from: 'one', to: 'many', label: '1 : N', delay: 0.6 }).svg;
    body += caption(VW / 2, 512, 'order.customer_id → customer.customer_id — keys and a 1:N cardinality, independent of any engine.', { delay: 1.1 });
    return assemble({ slug: 'conceptual-logical-physical', aria: 'The logical model: tables, keys and a 1:N relationship', body, note: snap.note });
  }

  /* ── physical: concrete typed rows + an index chip ─────────────────────── */
  if (view === 'physical') {
    const cust = tableCard(170, 165, { name: 'Customer', icon: 'app', tone: 'accent', cols: PHYS_CUSTOMER_COLS, w: 270 });
    const order = tableCard(620, 193, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: PHYS_ORDER_COLS, w: 270 });
    body += cust.svg + order.svg;
    body += connector(
      { x: cust.right, y: cust.rowCy(0), side: 'right' },
      { x: order.left, y: order.rowCy(1), side: 'left' },
      { from: 'one', to: 'many', label: '1 : N', delay: 0.6 }).svg;
    body += chip(order.right + 110, order.rowCy(1), 'idx customer_id', { icon: 'search', w: 190, delay: 0.9 });
    body += connector(
      { x: order.right, y: order.rowCy(1), side: 'right' },
      { x: order.right + 24, y: order.rowCy(1), side: 'left' },
      { delay: 0.85, ghost: true }).svg;
    body += caption(VW / 2, 512, 'bigint · varchar · numeric, plus an index on the foreign key — tuned for one database engine.', { delay: 1.2 });
    return assemble({ slug: 'conceptual-logical-physical', aria: 'The physical model: concrete types and an index', body, note: snap.note });
  }

  /* ── recap (fallback): the logical model + the three level checks ──────── */
  const cust = tableCard(170, 150, { name: 'Customer', icon: 'app', tone: 'accent', cols: CUSTOMER_COLS, w: 250 });
  const order = tableCard(620, 178, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: ORDER_COLS, w: 250 });
  body += cust.svg + order.svg;
  body += connector(
    { x: cust.right, y: cust.rowCy(0), side: 'right' },
    { x: order.left, y: order.rowCy(1), side: 'left' },
    { from: 'one', to: 'many', label: '1 : N', delay: 0.6 }).svg;
  const checks = ['conceptual', 'logical', 'physical'];
  const gap = 230, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body += chip(startX + i * gap, 548, t, { icon: 'check', w: 186, delay: 1.0 + i * 0.1 }); });
  body += caption(VW / 2, 502, 'Settle the levels in order — conceptual, then logical, then physical.', { delay: 1.4 });
  return assemble({ slug: 'conceptual-logical-physical', aria: 'Recap: the three levels settled in order', body, note: snap.note });
}
