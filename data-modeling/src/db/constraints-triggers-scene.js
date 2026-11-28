/* constraints-triggers-scene.js — the "Constraints & Triggers" scene, on the
   flat schema CANVAS (engine/schema2d.js), not the isometric machinery of
   db-scale. The enforcement toolkit, drawn on the schema surface: a bare table
   whose invariants still live in app code; the declarative guards (NOT NULL,
   UNIQUE, CHECK, DEFAULT) clipped to its columns; PRIMARY/FOREIGN KEY as
   constraints with an FK connector to a parent; a trigger wired to an audit
   table; and the declarative-vs-trigger trade shown as two columns. Motion is
   CSS: cards rise, the FK/trigger connectors draw, chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'overview', 'constraints', 'keys', 'triggers', 'tradeoff', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

const CUSTOMER_COLS = [
  { name: 'id', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'email', type: 'text' },
];

export function renderConstraintsTriggersScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── overview: a bare Orders table, no guards in the schema ───────────────── */
  if (view === 'overview') {
    const cols = [
      { name: 'order_id', type: 'int' },
      { name: 'order_ref', type: 'text' },
      { name: 'customer_id', type: 'int' },
      { name: 'total', type: 'decimal' },
      { name: 'status', type: 'text' },
    ];
    const card = tableCard(375, 150, { name: 'Orders', icon: 'listOrdered', tone: 'slate', cols, w: 290 });
    body += card.svg;
    body += chip(card.cx, card.top - 36, 'invariants live in app code', { icon: 'alert', iconVar: '--red', w: 250, delay: 0.7 });
    body += caption(card.cx, card.bottom + 44, 'The table trusts whatever any app writes. Put the invariants in the schema and the database holds the line for every writer.', { delay: 1.0 });
    return assemble({ slug: 'constraints-triggers', aria: 'A bare Orders table with no schema-level guards', body, note: snap.note });
  }

  /* ── constraints: the four declarative guards clipped to columns ──────────── */
  if (view === 'constraints') {
    const cols = [
      { name: 'order_id', type: 'int', key: true },
      { name: 'order_ref', type: 'text', hot: true },
      { name: 'customer_id', type: 'int', hot: true },
      { name: 'total', type: 'decimal', hot: true },
      { name: 'status', type: 'text', hot: true },
    ];
    const card = tableCard(290, 130, { name: 'Orders', icon: 'listOrdered', tone: 'accent', cols, w: 280 });
    body += card.svg;
    const guards = [
      [1, 'UNIQUE', 'key', 160],
      [2, 'NOT NULL', 'check', 170],
      [3, 'CHECK (total >= 0)', 'check', 232],
      [4, "DEFAULT 'pending'", 'sliders', 220],
    ];
    guards.forEach(([row, t, ic, w], i) => {
      const cy = card.rowCy(row);
      body += connector(
        { x: card.right, y: cy, side: 'right' },
        { x: card.right + 40, y: cy, side: 'left' },
        { delay: 0.5 + i * 0.1, ghost: true }).svg;
      body += chip(card.right + 40 + w / 2, cy, t, { icon: ic, iconVar: '--green', w, delay: 0.7 + i * 0.1 });
    });
    body += caption(card.cx, card.bottom + 44, 'Declarative: you state what must be true — NOT NULL · UNIQUE · CHECK · DEFAULT — and the engine enforces it on every write.', { delay: 1.3 });
    return assemble({ slug: 'constraints-triggers', aria: 'Declarative column and table constraints on an Orders table', body, note: snap.note });
  }

  /* ── keys: PRIMARY KEY and FOREIGN KEY as constraints ────────────────────── */
  if (view === 'keys') {
    const orderCols = [
      { name: 'order_id', type: 'int', key: true, hot: true },
      { name: 'order_ref', type: 'text' },
      { name: 'customer_id', type: 'int', fk: true, hot: true },
      { name: 'total', type: 'decimal' },
      { name: 'status', type: 'text' },
    ];
    const order = tableCard(150, 160, { name: 'Orders', icon: 'listOrdered', tone: 'accent', cols: orderCols, w: 260 });
    const cust = tableCard(650, 200, { name: 'Customer', icon: 'app', tone: 'violet', cols: CUSTOMER_COLS, w: 240 });
    body += order.svg + cust.svg;
    body += chip(order.cx, order.top - 34, 'PRIMARY KEY = UNIQUE + NOT NULL', { icon: 'key', iconVar: '--amber', w: 300, delay: 0.6 });
    body += connector(
      { x: order.right, y: order.rowCy(2), side: 'right' },
      { x: cust.left, y: cust.rowCy(0), side: 'left' },
      { from: 'many', to: 'one', label: 'FK', delay: 0.9 }).svg;
    body += caption(VW / 2, order.bottom + 54, 'A FOREIGN KEY is the built-in cross-table guard: the engine refuses an order naming a customer that does not exist.', { delay: 1.3 });
    return assemble({ slug: 'constraints-triggers', aria: 'Primary and foreign keys shown as enforcement constraints', body, note: snap.note });
  }

  /* ── triggers: procedural, cross-table logic on a write ──────────────────── */
  if (view === 'triggers') {
    const order = tableCard(180, 170, { name: 'Orders', icon: 'listOrdered', tone: 'accent', cols: [
      { name: 'order_id', type: 'int', key: true },
      { name: 'customer_id', type: 'int', fk: true },
      { name: 'total', type: 'decimal' },
      { name: 'status', type: 'text' },
    ], w: 250 });
    const audit = tableCard(640, 190, { name: 'audit_log', icon: 'scroll', tone: 'amber', cols: [
      { name: 'log_id', type: 'int', key: true },
      { name: 'order_id', type: 'int', fk: true },
      { name: 'action', type: 'text' },
      { name: 'at', type: 'timestamp' },
    ], w: 240 });
    body += order.svg + audit.svg;
    body += chip(order.cx, order.top - 34, 'AFTER INSERT ON orders', { icon: 'bolt', w: 230, delay: 0.6 });
    body += connector(
      { x: order.right, y: order.headCy, side: 'right' },
      { x: audit.left, y: audit.rowCy(0), side: 'left' },
      { to: 'many', label: 'write audit row', delay: 0.9 }).svg;
    body += caption(VW / 2, order.bottom + 48, 'A trigger runs procedural logic inside the transaction — the escape hatch for rules that span rows and tables, where a CHECK cannot reach.', { delay: 1.3 });
    return assemble({ slug: 'constraints-triggers', aria: 'A trigger writing an audit row on every insert', body, note: snap.note });
  }

  /* ── tradeoff: declarative first, triggers sparingly ─────────────────────── */
  if (view === 'tradeoff') {
    body += band(70, 130, 400, 300, 'Declarative', { sub: 'constraints — prefer these', delay: 0.2 });
    const pros = [
      ['Visible in the schema', 'search'],
      ['Checkable at a glance', 'check'],
      ['Enforced uniformly', 'check'],
      ['Optimizer can use them', 'gauge'],
    ];
    pros.forEach(([t, ic], i) => { body += chip(270, 206 + i * 52, t, { icon: ic, iconVar: '--green', w: 300, delay: 0.5 + i * 0.1 }); });

    body += band(VW - 470, 130, 400, 300, 'Triggers', { sub: 'procedural — sparingly', delay: 0.3 });
    const cons = [
      ['Logic hidden from readers', 'alert'],
      ['Fire as side effects', 'alert'],
      ['One can cascade another', 'alert'],
      ['Harder to trace & debug', 'alert'],
    ];
    cons.forEach(([t, ic], i) => { body += chip(VW - 270, 206 + i * 52, t, { icon: ic, iconVar: '--red', w: 300, delay: 0.6 + i * 0.1 }); });
    body += caption(VW / 2, 470, 'Express the rule declaratively if you can; drop to a trigger only for logic no constraint can hold.', { delay: 1.2 });
    return assemble({ slug: 'constraints-triggers', aria: 'Declarative constraints versus triggers, side by side', body, note: snap.note });
  }

  /* ── recap: the toolkit — declarative guards, a reserved trigger ──────────── */
  const card = tableCard(300, 158, { name: 'Orders', icon: 'listOrdered', tone: 'accent', cols: [
    { name: 'order_id', type: 'int', key: true },
    { name: 'customer_id', type: 'int', fk: true },
    { name: 'total', type: 'decimal' },
    { name: 'status', type: 'text' },
  ], w: 290 });
  body += card.svg;
  body += chip(card.right + 150, card.rowCy(2), 'trigger: for the rest', { icon: 'bolt', iconVar: '--amber', w: 220, delay: 1.3 });
  body += connector(
    { x: card.right, y: card.rowCy(2), side: 'right' },
    { x: card.right + 40, y: card.rowCy(2), side: 'left' },
    { delay: 1.1, ghost: true }).svg;
  const checks = ['NOT NULL', 'UNIQUE', 'CHECK', 'FK'];
  const gap = 200, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body += chip(startX + i * gap, 486, t, { icon: 'check', iconVar: '--green', w: 164, delay: 0.9 + i * 0.1 }); });
  body += caption(VW / 2, 540, 'Declarative constraints first; a trigger only for the rule they cannot express — the schema enforces, for everyone.', { delay: 1.5 });
  return assemble({ slug: 'constraints-triggers', aria: 'The enforcement toolkit: declarative guards by default, a trigger reserved', body, note: snap.note });
}
