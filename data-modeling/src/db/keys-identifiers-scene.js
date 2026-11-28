/* keys-identifiers-scene.js — the "Keys & Identifiers" scene, on the flat
   schema CANVAS (engine/schema2d.js). Keys are badges and highlights: candidate
   keys glow as hot rows, a primary key wears the amber key badge, alternate keys
   sit beside the card as UNIQUE chips, composite keys stack two key rows, and a
   foreign key is a self-drawing connector with crow's-foot cardinality.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'candidate', 'primary', 'composite', 'foreign', 'surrogate', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

export function renderKeysIdentifiersScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── candidate: Customer with both candidate keys highlighted ───────────── */
  if (view === 'candidate') {
    const cols = [
      { name: 'customer_id', type: 'int', hot: true },
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text', hot: true },
      { name: 'signup_date', type: 'date' },
    ];
    const card = tableCard(395, 158, { name: 'Customer', icon: 'app', tone: 'accent', cols, w: 250 });
    body += card.svg;
    body += chip(card.right + 130, card.rowCy(0), 'candidate key', { icon: 'key', iconVar: '--amber', w: 192, delay: 0.5 });
    body += chip(card.right + 130, card.rowCy(2), 'candidate key', { icon: 'key', iconVar: '--amber', w: 192, delay: 0.62 });
    body += caption(card.cx, card.bottom + 44, 'Both customer_id and email are minimal unique columns — each is a candidate key.', { delay: 0.85 });
    return assemble({ slug: 'keys-identifiers', aria: 'Candidate keys highlighted on a Customer entity', body, note: snap.note });
  }

  /* ── primary: customer_id as PK, email as alternate key ─────────────────── */
  if (view === 'primary') {
    const cols = [
      { name: 'customer_id', type: 'int', key: true, hot: true },
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text' },
      { name: 'signup_date', type: 'date' },
    ];
    const card = tableCard(395, 158, { name: 'Customer', icon: 'app', tone: 'accent', cols, w: 250 });
    body += card.svg;
    body += chip(card.right + 128, card.rowCy(0), 'PRIMARY KEY', { icon: 'key', iconVar: '--amber', w: 186, delay: 0.5 });
    body += chip(card.right + 140, card.rowCy(2), 'alternate · UNIQUE', { icon: 'check', w: 210, delay: 0.64 });
    body += connector(
      { x: card.right, y: card.rowCy(2), side: 'right' },
      { x: card.right + 36, y: card.rowCy(2), side: 'left' },
      { delay: 0.5, ghost: true }).svg;
    body += caption(card.cx, card.bottom + 44, 'One candidate is promoted to primary key; email stays unique as an alternate key.', { delay: 0.95 });
    return assemble({ slug: 'keys-identifiers', aria: 'Primary and alternate keys on a Customer entity', body, note: snap.note });
  }

  /* ── composite: OrderLine with a two-column primary key ─────────────────── */
  if (view === 'composite') {
    const cols = [
      { name: 'order_id', type: 'int', key: true, hot: true },
      { name: 'line_no', type: 'int', key: true, hot: true },
      { name: 'product_id', type: 'int', fk: true },
      { name: 'qty', type: 'int' },
    ];
    const card = tableCard(395, 150, { name: 'OrderLine', icon: 'listOrdered', tone: 'violet', cols, w: 250 });
    body += card.svg;
    body += chip(card.right + 150, (card.rowCy(0) + card.rowCy(1)) / 2, 'composite PRIMARY KEY', { icon: 'key', iconVar: '--amber', w: 232, delay: 0.55 });
    body += caption(card.cx, card.bottom + 44, 'Neither column is unique alone — the pair (order_id, line_no) is one composite key.', { delay: 0.9 });
    return assemble({ slug: 'keys-identifiers', aria: 'A composite primary key on OrderLine', body, note: snap.note });
  }

  /* ── foreign: Customer ─< Order joined by a foreign key ─────────────────── */
  if (view === 'foreign') {
    const custCols = [
      { name: 'customer_id', type: 'int', key: true, hot: true },
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text' },
    ];
    const orderCols = [
      { name: 'order_id', type: 'int', key: true },
      { name: 'customer_id', type: 'int', fk: true, hot: true },
      { name: 'placed_at', type: 'timestamp' },
      { name: 'total', type: 'decimal' },
    ];
    const cust = tableCard(150, 172, { name: 'Customer', icon: 'app', tone: 'accent', cols: custCols, w: 250 });
    const order = tableCard(640, 170, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: orderCols, w: 250 });
    body += cust.svg + order.svg;
    body += connector(
      { x: cust.right, y: cust.rowCy(0), side: 'right' },
      { x: order.left, y: order.rowCy(1), side: 'left' },
      { from: 'one', to: 'many', label: '1 : N', delay: 0.6 }).svg;
    body += caption(VW / 2, 540, 'order.customer_id is a foreign key referencing customer.customer_id — one customer, many orders.', { delay: 1.15 });
    return assemble({ slug: 'keys-identifiers', aria: 'A foreign key linking Order to Customer', body, note: snap.note });
  }

  /* ── surrogate: natural-key vs surrogate-key designs side by side ────────── */
  if (view === 'surrogate') {
    body += band(60, 120, 440, 320, 'Natural key', { sub: 'email carries meaning — but can change', delay: 0 });
    body += band(540, 120, 440, 320, 'Surrogate key', { sub: 'customer_id is invented — and stable', delay: 0.15 });

    const natCols = [
      { name: 'email', type: 'text', key: true, hot: true },
      { name: 'name', type: 'text' },
      { name: 'signup_date', type: 'date' },
    ];
    const surCols = [
      { name: 'customer_id', type: 'int', key: true, hot: true },
      { name: 'email', type: 'text' },
      { name: 'name', type: 'text' },
      { name: 'signup_date', type: 'date' },
    ];
    const nat = tableCard(155, 168, { name: 'Customer', icon: 'app', tone: 'amber', cols: natCols, w: 250, delay: 0.25 });
    const sur = tableCard(635, 168, { name: 'Customer', icon: 'app', tone: 'accent', cols: surCols, w: 250, delay: 0.35 });
    body += nat.svg + sur.svg;
    body += chip(nat.cx, nat.bottom + 34, 'PK changes when email changes', { icon: 'alert', iconVar: '--red', w: 270, delay: 0.9 });
    body += chip(sur.cx, sur.bottom + 34, 'PK never changes · email UNIQUE', { icon: 'check', w: 280, delay: 1.0 });
    return assemble({ slug: 'keys-identifiers', aria: 'Natural-key versus surrogate-key designs', body, note: snap.note });
  }

  /* ── recap: Customer 1:N Order with the key family as checks ────────────── */
  const custCols = [
    { name: 'customer_id', type: 'int', key: true },
    { name: 'email', type: 'text' },
    { name: 'name', type: 'text' },
  ];
  const orderCols = [
    { name: 'order_id', type: 'int', key: true },
    { name: 'customer_id', type: 'int', fk: true },
    { name: 'total', type: 'decimal' },
  ];
  const cust = tableCard(170, 150, { name: 'Customer', icon: 'app', tone: 'accent', cols: custCols, w: 250 });
  const order = tableCard(620, 168, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: orderCols, w: 250 });
  body += cust.svg + order.svg;
  body += connector(
    { x: cust.right, y: cust.rowCy(0), side: 'right' },
    { x: order.left, y: order.rowCy(1), side: 'left' },
    { from: 'one', to: 'many', label: '1 : N', delay: 0.6 }).svg;

  const checks = ['primary', 'alternate', 'foreign'];
  const gap = 240, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body += chip(startX + i * gap, 548, t, { icon: 'check', w: 186, delay: 1.0 + i * 0.1 }); });
  body += caption(VW / 2, 500, 'Primary identifies, alternate keeps its own uniqueness, foreign links — one key family.', { delay: 1.4 });
  return assemble({ slug: 'keys-identifiers', aria: 'The key family on two linked entities', body, note: snap.note });
}
