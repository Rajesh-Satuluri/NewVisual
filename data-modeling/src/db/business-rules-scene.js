/* business-rules-scene.js — the "Business Rules & Constraints" scene, on the flat
   schema CANVAS (engine/schema2d.js), not the isometric machinery of db-scale.
   A business rule becomes a constraint drawn on the schema: domain/key chips,
   a highlighted primary-key row for entity integrity, a foreign-key connector
   with a "no orphans" chip for referential integrity, and CHECK chips on the
   Order card. Motion is CSS: cards rise in, connectors draw, chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'overview', 'domain', 'entity-integrity', 'referential', 'check', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

const CUSTOMER_COLS = [
  { name: 'customer_id', type: 'int', key: true },
  { name: 'email', type: 'varchar' },
  { name: 'status', type: 'enum' },
];
const ORDER_COLS = [
  { name: 'order_id', type: 'int', key: true },
  { name: 'customer_id', type: 'int', fk: true },
  { name: 'total', type: 'decimal' },
  { name: 'ship_date', type: 'date' },
];

export function renderBusinessRulesScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── domain & key: one card with domain + UNIQUE constraint chips ────────── */
  if (view === 'domain') {
    const cust = tableCard(330, 160, { name: 'Customer', icon: 'app', tone: 'accent', cols: CUSTOMER_COLS, w: 280 });
    body += cust.svg;
    body += chip(cust.right + 160, cust.rowCy(0), 'PK — unique · not null', { icon: 'key', iconVar: '--amber', w: 230, delay: 0.6 });
    body += chip(cust.right + 150, cust.rowCy(1), 'UNIQUE(email)', { icon: 'key', w: 200, delay: 0.75 });
    body += chip(cust.right + 170, cust.rowCy(2), 'CHECK status IN (…)', { icon: 'check', w: 238, delay: 0.9 });
    body += connector({ x: cust.right, y: cust.rowCy(1), side: 'right' }, { x: cust.right + 48, y: cust.rowCy(1), side: 'left' }, { delay: 0.5, ghost: true }).svg;
    body += caption(cust.cx, cust.bottom + 44, 'Domain constraints bound each column’s values; a key constraint fixes identity.', { delay: 1.1 });
    return assemble({ slug: 'business-rules', aria: 'Domain and key constraints on a card', body, note: snap.note });
  }

  /* ── entity integrity: PK row highlighted + not null · unique chip ───────── */
  if (view === 'entity-integrity') {
    const cols = CUSTOMER_COLS.map((c, i) => ({ ...c, hot: i === 0 }));
    const cust = tableCard(360, 170, { name: 'Customer', icon: 'app', tone: 'accent', cols, w: 280 });
    body += cust.svg;
    body += chip(cust.right + 150, cust.rowCy(0), 'not null · unique', { icon: 'check', iconVar: '--green', w: 210, delay: 0.7 });
    body += connector({ x: cust.right, y: cust.rowCy(0), side: 'right' }, { x: cust.right + 44, y: cust.rowCy(0), side: 'left' }, { delay: 0.5, ghost: true }).svg;
    body += chip(cust.cx, cust.top - 34, 'entity integrity', { icon: 'key', iconVar: '--amber', w: 170, delay: 0.9 });
    body += caption(cust.cx, cust.bottom + 44, 'A primary key must be unique AND not null — every row has one dependable identity.', { delay: 1.1 });
    return assemble({ slug: 'business-rules', aria: 'Entity integrity — primary key unique and not null', body, note: snap.note });
  }

  /* ── check: Order card with CHECK constraint chips ───────────────────────── */
  if (view === 'check') {
    const order = tableCard(330, 150, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: ORDER_COLS, w: 280 });
    body += order.svg;
    body += chip(order.right + 170, order.rowCy(2), 'CHECK (total ≥ 0)', { icon: 'check', iconVar: '--green', w: 230, delay: 0.7 });
    body += chip(order.right + 200, order.rowCy(3), 'CHECK (ship_date ≥ order_date)', { icon: 'check', iconVar: '--green', w: 300, delay: 0.85 });
    body += connector({ x: order.right, y: order.rowCy(2), side: 'right' }, { x: order.right + 52, y: order.rowCy(2), side: 'left' }, { delay: 0.5, ghost: true }).svg;
    body += connector({ x: order.right, y: order.rowCy(3), side: 'right' }, { x: order.right + 52, y: order.rowCy(3), side: 'left' }, { delay: 0.55, ghost: true }).svg;
    body += caption(order.cx, order.bottom + 44, 'CHECK constraints enforce per-row and cross-column rules; triggers handle the rest.', { delay: 1.1 });
    return assemble({ slug: 'business-rules', aria: 'CHECK constraints on the Order card', body, note: snap.note });
  }

  /* ── overview / referential / recap: the FK-linked pair ──────────────────── */
  const cust = tableCard(170, 160, { name: 'Customer', icon: 'app', tone: 'accent', cols: CUSTOMER_COLS, w: 250 });
  const order = tableCard(620, 188, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: ORDER_COLS, w: 250 });
  body += cust.svg + order.svg;
  body += connector(
    { x: cust.right, y: cust.rowCy(0), side: 'right' },
    { x: order.left, y: order.rowCy(1), side: 'left' },
    { from: 'one', to: 'many', label: 'FK', delay: 0.6 }).svg;

  if (view === 'referential') {
    body += chip(VW / 2, 470, 'no orphans', { icon: 'check', iconVar: '--green', w: 160, delay: 1.0 });
    body += chip(VW / 2, 512, 'ON DELETE RESTRICT · CASCADE · SET NULL', { icon: 'sliders', w: 360, delay: 1.15 });
    body += caption(VW / 2, 556, 'Referential integrity: order.customer_id must reference a customer that exists.', { delay: 1.3 });
  } else if (view === 'recap') {
    const checks = ['domain', 'entity', 'referential', 'CHECK'];
    const gap = 212, startX = VW / 2 - (checks.length - 1) * gap / 2;
    checks.forEach((t, i) => { body += chip(startX + i * gap, 548, t, { icon: 'check', iconVar: '--green', w: 176, delay: 1.0 + i * 0.1 }); });
    body += caption(VW / 2, 502, 'Four integrity kinds plus CHECK — rules the schema enforces for every writer.', { delay: 1.4 });
  } else {
    body += caption(VW / 2, 548, 'Every order must belong to a customer — a foreign-key constraint the database enforces.', { delay: 1.1 });
  }
  return assemble({ slug: 'business-rules', aria: 'Customer and Order linked by a constraint', body, note: snap.note });
}
