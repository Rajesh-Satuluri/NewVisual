/* second-normal-form-scene.js — the "Second Normal Form (2NF)" scene, on the flat
   schema CANVAS (engine/schema2d.js). The hero move is a DECOMPOSITION: the
   composite-key order_lines table shows its partial-dependency columns tinted
   rose with an alert chip, then the fix splits a products table out and joins it
   1:N by a crow's-foot foreign key. Motion is CSS: cards rise, connectors draw
   on, chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'table', 'partial', '2nf', 'rule', 'note', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

const ORDER_LINES_2NF = [
  { name: 'order_id', type: 'int', key: true },
  { name: 'product_id', type: 'int', key: true, fk: true },
  { name: 'qty', type: 'int' },
];
const PRODUCTS = [
  { name: 'product_id', type: 'int', key: true },
  { name: 'product_name', type: 'text' },
  { name: 'product_price', type: 'decimal' },
];

/* the split order_lines 1:N products pair, shared by 2nf / recap */
function splitPair(body, { delay = 0 } = {}) {
  const lines = tableCard(170, 190, { name: 'order_lines', icon: 'listOrdered', tone: 'accent', cols: ORDER_LINES_2NF, w: 250, delay });
  const products = tableCard(620, 200, { name: 'products', icon: 'grid', tone: 'green', cols: PRODUCTS, w: 250, delay: delay + 0.15 });
  body.s += lines.svg + products.svg;
  body.s += connector(
    { x: products.left, y: products.rowCy(0), side: 'left' },
    { x: lines.right, y: lines.rowCy(1), side: 'right' },
    { from: 'one', to: 'many', label: '1 : N', delay: delay + 0.6 }).svg;
  return { lines, products };
}

export function renderSecondNormalFormScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  const body = { s: '' };

  /* ── table: the composite-key wide table, setup ────────────────────────── */
  if (view === 'table') {
    const cols = [
      { name: 'order_id', type: 'int', key: true },
      { name: 'product_id', type: 'int', key: true },
      { name: 'qty', type: 'int' },
      { name: 'product_name', type: 'text' },
      { name: 'product_price', type: 'decimal' },
    ];
    const card = tableCard(360, 150, { name: 'order_lines', icon: 'listOrdered', tone: 'accent', cols, w: 320 });
    body.s += card.svg;
    body.s += chip(card.cx, card.top - 34, 'composite key: (order_id, product_id)', { icon: 'key', iconVar: '--amber', w: 330, delay: 0.5 });
    body.s += caption(VW / 2, card.bottom + 46, 'Already in 1NF — atomic and keyed. The trouble hides in which part of the key each column depends on.', { delay: 0.9 });
    return assemble({ slug: 'second-normal-form', aria: 'A table keyed on two columns', body: body.s, note: snap.note });
  }

  /* ── partial: product columns depend on part of the key, tinted ────────── */
  if (view === 'partial') {
    const cols = [
      { name: 'order_id', type: 'int', key: true },
      { name: 'product_id', type: 'int', key: true },
      { name: 'qty', type: 'int' },
      { name: 'product_name', type: 'text', hot: true },
      { name: 'product_price', type: 'decimal', hot: true },
    ];
    const card = tableCard(160, 150, { name: 'order_lines', icon: 'listOrdered', tone: 'rose', cols, w: 320 });
    body.s += card.svg;
    body.s += chip(card.cx, card.top - 34, 'partial dependency → repeated', { icon: 'alert', iconVar: '--red', w: 282, delay: 0.5 });
    // arrows from product_id (part of key) to the two part-dependent columns
    body.s += connector(
      { x: card.right, y: card.rowCy(1), side: 'right' },
      { x: card.right, y: card.rowCy(3), side: 'right' },
      { label: 'product_id →', delay: 0.8 }).svg;
    body.s += connector(
      { x: card.right, y: card.rowCy(1), side: 'right' },
      { x: card.right, y: card.rowCy(4), side: 'right' },
      { delay: 1.0 }).svg;
    body.s += chip(card.right + 210, card.rowCy(3) + 16, 'name & price need only product_id', { icon: 'alert', iconVar: '--red', w: 330, delay: 1.2 });
    body.s += caption(VW / 2, card.bottom + 44, 'Both depend on product_id alone, so every line selling the product repeats its name and price.', { delay: 1.4 });
    return assemble({ slug: 'second-normal-form', aria: 'Partial dependencies tinted on a composite-key table', body: body.s, note: snap.note });
  }

  /* ── 2nf: the decomposition — order_lines 1:N products ─────────────────── */
  if (view === '2nf') {
    const { lines, products } = splitPair(body, { delay: 0 });
    body.s += chip((lines.right + products.left) / 2, lines.top - 34, 'partial deps → products table', { icon: 'check', w: 286, delay: 1.0 });
    body.s += caption(VW / 2, Math.max(lines.bottom, products.bottom) + 44, 'Each product stored once; order_lines points at it by foreign key. Update a price in one place.', { delay: 1.2 });
    return assemble({ slug: 'second-normal-form', aria: 'Partial attributes decomposed into a products table joined 1:N', body: body.s, note: snap.note });
  }

  /* ── rule: qty depends on the WHOLE composite key ──────────────────────── */
  if (view === 'rule') {
    const cols = [
      { name: 'order_id', type: 'int', key: true, hot: true },
      { name: 'product_id', type: 'int', key: true, fk: true, hot: true },
      { name: 'qty', type: 'int' },
    ];
    const card = tableCard(360, 200, { name: 'order_lines', icon: 'listOrdered', tone: 'accent', cols, w: 300 });
    body.s += card.svg;
    // both key rows arrow to qty
    body.s += connector(
      { x: card.right, y: card.rowCy(0), side: 'right' },
      { x: card.right, y: card.rowCy(2), side: 'right' },
      { delay: 0.6 }).svg;
    body.s += connector(
      { x: card.right, y: card.rowCy(1), side: 'right' },
      { x: card.right, y: card.rowCy(2), side: 'right' },
      { label: '→ qty', delay: 0.8 }).svg;
    body.s += chip(card.cx, card.top - 34, '(order_id, product_id) → qty', { icon: 'key', iconVar: '--amber', w: 300, delay: 0.4 });
    body.s += chip(card.right + 180, card.rowCy(2), 'needs the WHOLE key', { icon: 'check', w: 230, delay: 1.1 });
    body.s += caption(VW / 2, card.bottom + 46, '2NF: every non-key attribute depends on the whole key. qty needs both columns, so it legitimately stays.', { delay: 1.3 });
    return assemble({ slug: 'second-normal-form', aria: 'A non-key attribute depending on the whole composite key', body: body.s, note: snap.note });
  }

  /* ── note: single-column key ⇒ already 2NF ─────────────────────────────── */
  if (view === 'note') {
    const cols = [
      { name: 'product_id', type: 'int', key: true, hot: true },
      { name: 'product_name', type: 'text' },
      { name: 'product_price', type: 'decimal' },
    ];
    const card = tableCard(390, 200, { name: 'products', icon: 'grid', tone: 'green', cols, w: 260 });
    body.s += card.svg;
    body.s += chip(card.cx, card.top - 34, 'single-column key — no part to depend on', { icon: 'check', w: 350, delay: 0.5 });
    body.s += chip(card.right + 160, card.rowCy(0), 'already in 2NF', { icon: 'check', w: 200, delay: 0.9 });
    body.s += connector(
      { x: card.right, y: card.rowCy(0), side: 'right' },
      { x: card.right + 60, y: card.rowCy(0), side: 'left' },
      { ghost: true, delay: 0.7 }).svg;
    body.s += caption(VW / 2, card.bottom + 46, 'A lone key column has no part, so a partial dependency cannot exist — only composite keys can violate 2NF.', { delay: 1.2 });
    return assemble({ slug: 'second-normal-form', aria: 'A single-column key satisfies 2NF automatically', body: body.s, note: snap.note });
  }

  /* ── recap: order_lines 1:N products + check chips ─────────────────────── */
  const { lines, products } = splitPair(body, { delay: 0 });
  const checks = ['no partial deps', 'whole-key dependency', 'composite keys only'];
  const gap = 262, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body.s += chip(startX + i * gap, 548, t, { icon: 'check', w: 236, delay: 1.0 + i * 0.1 }); });
  body.s += caption(VW / 2, 500, 'Every non-key attribute depends on the whole key — partial dependencies split out, duplication gone.', { delay: 1.4 });
  return assemble({ slug: 'second-normal-form', aria: 'Recap of second normal form', body: body.s, note: snap.note });
}
