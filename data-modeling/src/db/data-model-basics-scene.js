/* data-model-basics-scene.js — the "Data Model Basics" scene, on the flat
   schema CANVAS (engine/schema2d.js), not the isometric machinery of db-scale.
   An entity is a flat table card (tinted header + typed rows); a primary key is
   an amber key badge; a relationship is a self-drawing connector with crow's-foot
   cardinality. Motion is CSS: cards rise in, attribute rows slide in, the
   connector draws itself, the cardinality chip pops.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'entity', 'attributes', 'keys', 'relationship', 'levels', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

const CUSTOMER_COLS = [
  { name: 'customer_id', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'email', type: 'text' },
  { name: 'signup_date', type: 'date' },
];
const ORDER_COLS = [
  { name: 'order_id', type: 'int', key: true },
  { name: 'customer_id', type: 'int', fk: true },
  { name: 'placed_at', type: 'timestamp' },
  { name: 'total', type: 'decimal' },
];

export function renderDataModelBasicsScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── single-entity views: entity / attributes / keys ───────────────────── */
  if (view === 'entity' || view === 'attributes' || view === 'keys') {
    const x = 380, y = 150, w = 280;
    let cols;
    if (view === 'entity') {
      cols = [
        { name: 'customer_id', type: '…', ghost: true },
        { name: 'name', type: '…', ghost: true },
        { name: 'email', type: '…', ghost: true },
      ];
    } else {
      cols = CUSTOMER_COLS.map((c, i) => ({ ...c, key: view === 'keys' && i === 0, hot: view === 'keys' && i === 0 }));
    }
    const card = tableCard(x, y, { name: 'Customer', icon: 'app', tone: 'accent', cols, w });
    body += card.svg;

    if (view === 'entity') {
      body += chip(card.cx, y - 36, 'entity', { icon: 'grid', delay: 0.4 });
      body += caption(card.cx, card.bottom + 40, 'An entity is a kind of thing worth storing. Every real customer is an instance of it.', { delay: 0.7 });
    } else if (view === 'attributes') {
      body += caption(card.cx, card.bottom + 40, 'Four typed attributes — each a named fact drawn from a domain.', { delay: 0.7 });
    } else {
      body += chip(card.right + 140, card.rowCy(0), 'PK — unique · not null', { icon: 'key', iconVar: '--amber', w: 232, delay: 0.5 });
      body += connector(
        { x: card.right, y: card.rowCy(0), side: 'right' },
        { x: card.right + 24, y: card.rowCy(0), side: 'left' },
        { delay: 0.4, ghost: true }).svg;
      body += caption(card.cx, card.bottom + 40, 'The primary key is the instance’s identity — what every relationship will point at.', { delay: 0.8 });
    }
    return assemble({ slug: 'data-model-basics', aria: 'Entity on the schema canvas', body, note: snap.note });
  }

  /* ── two-entity views: relationship / recap ────────────────────────────── */
  if (view === 'relationship' || view === 'recap') {
    const cust = tableCard(170, 150, { name: 'Customer', icon: 'app', tone: 'accent', cols: CUSTOMER_COLS, w: 250 });
    const order = tableCard(620, 178, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: ORDER_COLS, w: 250 });
    body += cust.svg + order.svg;
    body += connector(
      { x: cust.right, y: cust.rowCy(0), side: 'right' },
      { x: order.left, y: order.rowCy(1), side: 'left' },
      { from: 'one', to: 'many', label: '1 : N', delay: 0.6 }).svg;

    if (view === 'recap') {
      const checks = ['entities', 'attributes', 'keys', 'relationships'];
      const gap = 212, startX = VW / 2 - (checks.length - 1) * gap / 2;
      checks.forEach((t, i) => { body += chip(startX + i * gap, 548, t, { icon: 'check', w: 176, delay: 1.0 + i * 0.1 }); });
      body += caption(VW / 2, 502, 'Entities · attributes · keys · relationships — the four pieces every later model reshapes.', { delay: 1.4 });
    } else {
      body += caption(VW / 2, 548, 'order.customer_id → customer.customer_id — a foreign key carries the 1:N relationship.', { delay: 1.1 });
    }
    return assemble({ slug: 'data-model-basics', aria: 'Two linked entities on the schema canvas', body, note: snap.note });
  }

  /* ── levels view: conceptual → logical → physical ──────────────────────── */
  const LEVELS = [
    { y: 18, label: 'Conceptual', sub: 'entities & relationships — no technology',
      cust: [], order: [], from: null, to: null, lbl: 'places', custTone: 'accent', ordTone: 'violet' },
    { y: 186, label: 'Logical', sub: 'tables, columns, primary & foreign keys',
      cust: [{ name: 'customer_id', key: true }], order: [{ name: 'order_id', key: true }, { name: 'customer_id', fk: true }],
      from: 'one', to: 'many', lbl: '1 : N' },
    { y: 354, label: 'Physical', sub: 'types, indexes, storage for one engine',
      cust: [{ name: 'customer_id', type: 'bigint', key: true }], order: [{ name: 'order_id', type: 'bigint', key: true }, { name: 'customer_id', type: 'bigint', fk: true }],
      from: 'one', to: 'many', lbl: 'idx' },
  ];
  LEVELS.forEach((lv, k) => {
    const d = k * 0.25;
    body += band(40, lv.y, VW - 80, 156, lv.label, { sub: lv.sub, delay: d });
    const cust = tableCard(486, lv.y + 28, { name: 'Customer', icon: 'app', tone: 'accent', cols: lv.cust, w: 205, delay: d + 0.12 });
    const order = tableCard(742, lv.y + 28, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: lv.order, w: 205, delay: d + 0.2 });
    body += cust.svg + order.svg;
    body += connector(
      { x: cust.right, y: cust.headCy, side: 'right' },
      { x: order.left, y: order.headCy, side: 'left' },
      { from: lv.from, to: lv.to, label: lv.lbl, delay: d + 0.35 }).svg;
  });
  return assemble({ slug: 'data-model-basics', aria: 'One model at three levels of detail', body, note: snap.note });
}
