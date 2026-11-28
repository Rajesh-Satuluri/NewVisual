/* null-semantics-scene.js — the "Null Semantics" scene, on the flat schema
   CANVAS (engine/schema2d.js). NULL is absence, so it shows as a ghosted row
   with a 'NULL' chip; three-valued logic is three chips (TRUE / FALSE /
   UNKNOWN); the pitfalls are red warning chips; handling is NOT NULL / DEFAULT
   constraint chips on a card.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'null', 'three-valued', 'keys', 'pitfalls', 'handling', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

export function renderNullSemanticsScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── null: a Customer card with a NULL (ghosted) cell ───────────────────── */
  if (view === 'null') {
    const cols = [
      { name: 'customer_id', type: 'int', key: true },
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text' },
      { name: 'phone', type: 'text', ghost: true, hot: true },
    ];
    const card = tableCard(395, 158, { name: 'Customer', icon: 'app', tone: 'accent', cols, w: 250 });
    body += card.svg;
    body += chip(card.right + 110, card.rowCy(3), 'NULL', { icon: 'alert', iconVar: '--red', w: 150, delay: 0.55 });
    body += connector(
      { x: card.right, y: card.rowCy(3), side: 'right' },
      { x: card.right + 35, y: card.rowCy(3), side: 'left' }, { delay: 0.5, ghost: true }).svg;
    body += caption(card.cx, card.bottom + 44, 'phone is NULL — unknown, not an empty string and not zero.', { delay: 0.95 });
    return assemble({ slug: 'null-semantics', aria: 'A NULL phone value on a Customer entity', body, note: snap.note });
  }

  /* ── three-valued: TRUE / FALSE / UNKNOWN as three chips ────────────────── */
  if (view === 'three-valued') {
    body += caption(VW / 2, 150, 'Ordinary logic has two outcomes. NULL adds a third.', { delay: 0.2 });
    const items = [
      { t: 'TRUE', ic: 'check', iv: '--green' },
      { t: 'FALSE', ic: 'check', iv: '--accent' },
      { t: 'UNKNOWN', ic: 'alert', iv: '--amber' },
    ];
    const gap = 250, startX = VW / 2 - (items.length - 1) * gap / 2;
    items.forEach((it, i) => {
      body += chip(startX + i * gap, 280, it.t, { icon: it.ic, iconVar: it.iv, w: 190, delay: 0.5 + i * 0.15 });
    });
    body += chip(VW / 2, 390, 'NULL = NULL  →  UNKNOWN', { icon: 'alert', iconVar: '--red', w: 300, delay: 1.0 });
    body += caption(VW / 2, 470, 'Any comparison with NULL is UNKNOWN, and a WHERE clause keeps only rows that are TRUE.', { delay: 1.25 });
    return assemble({ slug: 'null-semantics', aria: 'Three-valued logic: TRUE, FALSE, UNKNOWN', body, note: snap.note });
  }

  /* ── keys: PK never NULL, FK nullable = optional link ───────────────────── */
  if (view === 'keys') {
    const custCols = [
      { name: 'customer_id', type: 'int', key: true, hot: true },
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text' },
    ];
    const orderCols = [
      { name: 'order_id', type: 'int', key: true },
      { name: 'customer_id', type: 'int', fk: true, ghost: true, hot: true },
      { name: 'placed_at', type: 'timestamp' },
      { name: 'total', type: 'decimal' },
    ];
    const cust = tableCard(150, 172, { name: 'Customer', icon: 'app', tone: 'accent', cols: custCols, w: 250 });
    const order = tableCard(640, 170, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: orderCols, w: 250 });
    body += cust.svg + order.svg;
    body += chip(cust.cx, cust.bottom + 32, 'PK — never NULL', { icon: 'key', iconVar: '--amber', w: 192, delay: 0.7 });
    body += chip(order.cx, order.bottom + 32, 'FK NULL = no customer yet', { icon: 'alert', iconVar: '--amber', w: 258, delay: 0.82 });
    body += connector(
      { x: cust.right, y: cust.rowCy(0), side: 'right' },
      { x: order.left, y: order.rowCy(1), side: 'left' },
      { from: 'one', to: 'many', label: '0..1 : N', delay: 0.6, ghost: true }).svg;
    body += caption(VW / 2, 548, 'Entity integrity forbids a NULL primary key; a NULL foreign key means no relationship yet.', { delay: 1.2 });
    return assemble({ slug: 'null-semantics', aria: 'NULL in primary and foreign keys', body, note: snap.note });
  }

  /* ── pitfalls: three red warning chips naming the traps ─────────────────── */
  if (view === 'pitfalls') {
    body += band(150, 150, 740, 300, 'The sharp edges', { sub: 'each follows from "a comparison with NULL is UNKNOWN"', delay: 0 });
    const traps = [
      'WHERE x = NULL  →  matches nothing',
      'NOT IN (…, NULL)  →  returns nothing',
      'COUNT(col)  →  silently skips NULLs',
    ];
    traps.forEach((t, i) => {
      body += chip(VW / 2, 222 + i * 68, t, { icon: 'alert', iconVar: '--red', w: 420, delay: 0.45 + i * 0.18 });
    });
    return assemble({ slug: 'null-semantics', aria: 'Three classic NULL pitfalls', body, note: snap.note });
  }

  /* ── handling: NOT NULL / DEFAULT constraint chips ──────────────────────── */
  if (view === 'handling') {
    const cols = [
      { name: 'customer_id', type: 'int', key: true },
      { name: 'name', type: 'text', hot: true },
      { name: 'status', type: 'text', hot: true },
      { name: 'phone', type: 'text' },
    ];
    const card = tableCard(380, 160, { name: 'Customer', icon: 'app', tone: 'accent', cols, w: 250 });
    body += card.svg;
    body += chip(card.right + 128, card.rowCy(1), 'NOT NULL', { icon: 'check', w: 158, delay: 0.55 });
    body += chip(card.right + 160, card.rowCy(2), "DEFAULT 'new'", { icon: 'check', w: 212, delay: 0.68 });
    body += connector(
      { x: card.right, y: card.rowCy(1), side: 'right' },
      { x: card.right + 42, y: card.rowCy(1), side: 'left' }, { delay: 0.5, ghost: true }).svg;
    body += connector(
      { x: card.right, y: card.rowCy(2), side: 'right' },
      { x: card.right + 42, y: card.rowCy(2), side: 'left' }, { delay: 0.58, ghost: true }).svg;
    body += caption(card.cx, card.bottom + 44, 'NOT NULL forbids absence; DEFAULT fills a value so the NULL never appears.', { delay: 1.0 });
    return assemble({ slug: 'null-semantics', aria: 'NOT NULL and DEFAULT constraints handling absence', body, note: snap.note });
  }

  /* ── recap: Customer card + the three NULL ideas as checks ──────────────── */
  const cols = [
    { name: 'customer_id', type: 'int', key: true },
    { name: 'name', type: 'text' },
    { name: 'phone', type: 'text', ghost: true },
  ];
  const card = tableCard(395, 150, { name: 'Customer', icon: 'app', tone: 'accent', cols, w: 250 });
  body += card.svg;
  const checks = ['unknown', '3-valued', 'IS NULL'];
  const gap = 230, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body += chip(startX + i * gap, 548, t, { icon: 'check', w: 182, delay: 0.9 + i * 0.1 }); });
  body += caption(VW / 2, 500, 'Absence means unknown, drives three-valued logic, and is tested with IS NULL — modelled on purpose.', { delay: 1.3 });
  return assemble({ slug: 'null-semantics', aria: 'Null semantics summarised on a Customer entity', body, note: snap.note });
}
