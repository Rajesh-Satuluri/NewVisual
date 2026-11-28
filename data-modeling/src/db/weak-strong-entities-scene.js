/* weak-strong-entities-scene.js — the "Weak & Strong Entities" scene, on the
   flat schema CANVAS (engine/schema2d.js). A strong entity is an accent card
   with its own amber key; a weak entity is a rose card with no key of its own,
   marked by a chip; the identifying relationship is a 1:N connector carrying the
   owner's key down; the partial key is a second amber key row. Motion is CSS:
   cards rise, rows slide, connectors draw, chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'strong', 'weak', 'identifying', 'partialkey', 'example', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, caption, assemble, VW } from '../engine/schema2d.js';

const ORDER_COLS = [
  { name: 'order_id', type: 'int', key: true },
  { name: 'placed_at', type: 'timestamp' },
  { name: 'total', type: 'decimal' },
  { name: 'status', type: 'text' },
];

export function renderWeakStrongEntitiesScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── strong entity standing alone ──────────────────────────────────────── */
  if (view === 'strong') {
    const x = 390, y = 160, w = 290;
    const card = tableCard(x, y, { name: 'Order', icon: 'listOrdered', tone: 'accent', cols: ORDER_COLS, w });
    body += card.svg;
    body += chip(card.cx, y - 34, 'strong entity', { icon: 'check', w: 164, delay: 0.5 });
    body += caption(card.cx, card.bottom + 42, 'Order has its own primary key, order_id — it is identified from within and exists on its own.', { delay: 0.8 });
    return assemble({ slug: 'weak-strong-entities', aria: 'A strong entity with its own key', body, note: snap.note });
  }

  /* ── weak entity — no key of its own ───────────────────────────────────── */
  if (view === 'weak') {
    const x = 390, y = 160, w = 290;
    const card = tableCard(x, y, {
      name: 'OrderLine', icon: 'file', tone: 'rose', w,
      cols: [
        { name: 'line_no', type: 'int' },
        { name: 'product_id', type: 'int' },
        { name: 'qty', type: 'int' },
        { name: 'price', type: 'decimal' },
      ],
    });
    body += card.svg;
    body += chip(card.cx, y - 34, 'weak entity — no key', { icon: 'alert', iconVar: '--red', w: 226, delay: 0.5 });
    body += caption(card.cx, card.bottom + 42, 'No row here identifies itself. "Line 2" is meaningless without the order it belongs to.', { delay: 0.8 });
    return assemble({ slug: 'weak-strong-entities', aria: 'A weak entity with no key of its own', body, note: snap.note });
  }

  /* ── identifying relationship — owner key flows down ───────────────────── */
  if (view === 'identifying') {
    const order = tableCard(150, 175, { name: 'Order', icon: 'listOrdered', tone: 'accent', cols: ORDER_COLS, w: 250 });
    const line = tableCard(620, 185, {
      name: 'OrderLine', icon: 'file', tone: 'rose', w: 260, delay: 0.5,
      cols: [
        { name: 'order_id', type: 'int', fk: true },
        { name: 'line_no', type: 'int' },
        { name: 'product_id', type: 'int' },
        { name: 'qty', type: 'int' },
      ],
    });
    body += order.svg + line.svg;
    body += connector(
      { x: order.right, y: order.rowCy(0), side: 'right' },
      { x: line.left, y: line.rowCy(0), side: 'left' },
      { from: 'one', to: 'many', label: 'identifies', delay: 0.9 }).svg;
    body += caption(VW / 2, 540, 'The identifying relationship carries order.order_id down into every OrderLine — a reference that is part of identity, 1:N.', { delay: 1.3 });
    return assemble({ slug: 'weak-strong-entities', aria: 'An identifying relationship from owner to weak entity', body, note: snap.note });
  }

  /* ── partial key → composite primary key ───────────────────────────────── */
  if (view === 'partialkey') {
    const x = 380, y = 150, w = 300;
    const card = tableCard(x, y, {
      name: 'OrderLine', icon: 'file', tone: 'rose', w,
      cols: [
        { name: 'order_id', type: 'borrowed', key: true, hot: true },
        { name: 'line_no', type: 'partial', key: true, hot: true },
        { name: 'product_id', type: 'int' },
        { name: 'qty', type: 'int' },
      ],
    });
    body += card.svg;
    body += chip(card.right + 150, card.rowCy(0), 'from the owner', { icon: 'merge', w: 188, delay: 0.7 });
    body += chip(card.right + 150, card.rowCy(1), 'unique within order', { icon: 'key', iconVar: '--amber', w: 220, delay: 0.85 });
    body += connector({ x: card.right, y: card.rowCy(0), side: 'right' }, { x: card.right + 26, y: card.rowCy(0), side: 'left' }, { delay: 0.6, ghost: true }).svg;
    body += connector({ x: card.right, y: card.rowCy(1), side: 'right' }, { x: card.right + 26, y: card.rowCy(1), side: 'left' }, { delay: 0.75, ghost: true }).svg;
    body += caption(card.cx, card.bottom + 44, 'The full primary key is composite: (order_id, line_no). Neither half is unique alone; together they identify the line.', { delay: 1.1 });
    return assemble({ slug: 'weak-strong-entities', aria: 'A weak entity with a composite partial key', body, note: snap.note });
  }

  /* ── two designs side by side ──────────────────────────────────────────── */
  if (view === 'example') {
    const natural = tableCard(120, 175, {
      name: 'OrderLine', icon: 'file', tone: 'rose', w: 270,
      cols: [
        { name: 'order_id', type: 'int', key: true },
        { name: 'line_no', type: 'int', key: true },
        { name: 'product_id', type: 'int' },
        { name: 'qty', type: 'int' },
      ],
    });
    const surrogate = tableCard(650, 175, {
      name: 'OrderLine', icon: 'file', tone: 'accent', w: 270, delay: 0.4,
      cols: [
        { name: 'order_line_id', type: 'int', key: true },
        { name: 'order_id', type: 'int', fk: true },
        { name: 'line_no', type: 'int' },
        { name: 'product_id', type: 'int' },
      ],
    });
    body += natural.svg + surrogate.svg;
    body += chip(natural.cx, natural.top - 34, 'natural composite key', { icon: 'key', iconVar: '--amber', w: 232, delay: 0.7 });
    body += chip(surrogate.cx, surrogate.top - 34, 'surrogate key', { icon: 'bolt', w: 172, delay: 0.9 });
    body += caption(natural.cx, natural.bottom + 40, '(order_id, line_no) — faithful, but every reference carries both.', { delay: 1.1 });
    body += caption(surrogate.cx, surrogate.bottom + 40, 'order_line_id — now a strong entity; order_id is an ordinary FK.', { delay: 1.25 });
    return assemble({ slug: 'weak-strong-entities', aria: 'Composite natural key versus a surrogate key', body, note: snap.note });
  }

  /* ── recap ─────────────────────────────────────────────────────────────── */
  const order = tableCard(150, 175, { name: 'Order', icon: 'listOrdered', tone: 'accent', cols: ORDER_COLS, w: 250 });
  const line = tableCard(620, 185, {
    name: 'OrderLine', icon: 'file', tone: 'rose', w: 260,
    cols: [
      { name: 'order_id', type: 'int', key: true },
      { name: 'line_no', type: 'int', key: true },
      { name: 'product_id', type: 'int' },
      { name: 'qty', type: 'int' },
    ],
  });
  body += order.svg + line.svg;
  body += connector(
    { x: order.right, y: order.rowCy(0), side: 'right' },
    { x: line.left, y: line.rowCy(0), side: 'left' },
    { from: 'one', to: 'many', label: 'identifies', delay: 0.9 }).svg;
  const checks = ['identifying rel', 'partial key'];
  const gap = 300, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body += chip(startX + i * gap, 548, t, { icon: 'check', w: 212, delay: 1.2 + i * 0.12 }); });
  body += caption(VW / 2, 500, 'Order owns OrderLine: an identifying relationship supplies the key, a partial key completes it.', { delay: 1.5 });
  return assemble({ slug: 'weak-strong-entities', aria: 'An owner entity and its weak entity', body, note: snap.note });
}
