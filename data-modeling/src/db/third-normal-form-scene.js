/* third-normal-form-scene.js — the "Third Normal Form (3NF)" scene, on the flat
   schema CANVAS (engine/schema2d.js). The hero visual is DECOMPOSITION: a wide
   orders table whose customer_city / customer_zip depend transitively on
   customer_id (offending rows tinted rose + an alert chip), split into orders +
   customers joined by a foreign-key connector with crow's-foot cardinality.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'table', 'problem', '3nf', 'rule', 'target', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

/* the wide orders table — order_id is the key, but the customer_* columns
   describe the customer, not the order. */
const ORDERS_WIDE = [
  { name: 'order_id', type: 'int', key: true },
  { name: 'placed_at', type: 'timestamp' },
  { name: 'customer_id', type: 'int' },
  { name: 'customer_city', type: 'text' },
  { name: 'customer_zip', type: 'text' },
];
/* decomposed: orders keeps the FK, customers owns the transitive attributes. */
const ORDERS_SLIM = [
  { name: 'order_id', type: 'int', key: true },
  { name: 'placed_at', type: 'timestamp' },
  { name: 'customer_id', type: 'int', fk: true },
];
const CUSTOMERS = [
  { name: 'customer_id', type: 'int', key: true },
  { name: 'customer_city', type: 'text' },
  { name: 'customer_zip', type: 'text' },
];

export function renderThirdNormalFormScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── single wide-table views: table / problem ──────────────────────────── */
  if (view === 'table' || view === 'problem') {
    const problem = view === 'problem';
    const cols = ORDERS_WIDE.map((c, i) => ({ ...c, hot: problem && i >= 3 }));
    const x = 300, y = 150, w = 270;
    const card = tableCard(x, y, { name: 'orders', icon: 'listOrdered', tone: problem ? 'rose' : 'accent', cols, w });
    body += card.svg;

    // brace the two transitive rows and name what links them
    const braceY = card.rowCy(3);
    body += connector(
      { x: card.right, y: card.rowCy(2), side: 'right' },
      { x: card.right, y: card.rowCy(4), side: 'right' },
      { delay: 0.5, ghost: true }).svg;

    if (problem) {
      body += chip(card.right + 150, braceY, 'transitive dependency', { icon: 'alert', iconVar: '--red', w: 236, delay: 0.7 });
      body += caption(card.cx, card.bottom + 44, 'customer_id → customer_city, customer_zip — repeated on every order, so one move means many rewrites.', { delay: 0.95 });
    } else {
      body += chip(card.right + 150, braceY, 'describe the customer', { icon: 'merge', iconVar: '--accent', w: 222, delay: 0.7 });
      body += caption(card.cx, card.bottom + 44, 'order_id → customer_id → customer_city, customer_zip — a non-key attribute depends on a non-key.', { delay: 0.95 });
    }
    return assemble({ slug: 'third-normal-form', aria: 'A wide orders table with a transitive dependency', body, note: snap.note });
  }

  /* ── decomposition views: 3nf / target / recap ─────────────────────────── */
  if (view === '3nf' || view === 'target' || view === 'recap') {
    const orders = tableCard(150, 180, { name: 'orders', icon: 'listOrdered', tone: 'accent', cols: ORDERS_SLIM, w: 250 });
    const customers = tableCard(630, 196, { name: 'customers', icon: 'app', tone: 'green', cols: CUSTOMERS, w: 250 });
    body += orders.svg + customers.svg;

    // many orders → one customer, carried by the foreign key
    body += connector(
      { x: orders.right, y: orders.rowCy(2), side: 'right' },
      { x: customers.left, y: customers.rowCy(0), side: 'left' },
      { from: 'many', to: 'one', label: 'N : 1', delay: 0.7 }).svg;

    if (view === 'recap') {
      const checks = ['1NF', '2NF', '3NF'];
      const gap = 150, startX = VW / 2 - (checks.length - 1) * gap / 2;
      checks.forEach((t, i) => { body += chip(startX + i * gap, 470, t, { icon: 'check', iconVar: '--green', w: 112, delay: 1.1 + i * 0.12 }); });
      body += caption(VW / 2, 528, 'orders.customer_id → customers.customer_id — the transitive chain decomposed, every fact stored once.', { delay: 1.5 });
    } else if (view === 'target') {
      body += chip(VW / 2, 470, 'OLTP default', { icon: 'target', iconVar: '--accent', w: 156, delay: 1.0 });
      body += caption(VW / 2, 528, '3NF: redundancy gone, writes clean — one indexed foreign-key join rejoins the row when a read needs it.', { delay: 1.3 });
    } else {
      body += caption(VW / 2, 500, 'customer facts moved to their own table; orders keeps only a foreign key. Decomposition is lossless.', { delay: 1.2 });
    }
    return assemble({ slug: 'third-normal-form', aria: 'orders and customers split by a foreign key', body, note: snap.note });
  }

  /* ── rule view: the key, the whole key, nothing but the key ────────────── */
  const RULES = [
    { y: 70,  nf: '1NF', label: 'the key', sub: 'atomic values — one value per cell, a key per row', tone: 'slate' },
    { y: 236, nf: '2NF', label: 'the whole key', sub: 'no dependence on part of a composite key', tone: 'slate' },
    { y: 402, nf: '3NF', label: 'nothing but the key', sub: 'no dependence on another non-key attribute', tone: 'accent' },
  ];
  RULES.forEach((r, k) => {
    const d = k * 0.25;
    const active = r.tone === 'accent';
    body += band(90, r.y, VW - 180, 128, `${r.nf} — depend on ${r.label}`, { sub: r.sub, delay: d });
    body += chip(VW - 180, r.y + 64, r.nf, {
      icon: active ? 'target' : 'check',
      iconVar: active ? '--accent' : '--green',
      w: 112, delay: d + 0.25,
    });
  });
  body += caption(VW / 2, 560, '“The key, the whole key, and nothing but the key.” 3NF owns the last clause.', { delay: 1.0 });
  return assemble({ slug: 'third-normal-form', aria: 'The three normal forms as one rule', body, note: snap.note });
}
