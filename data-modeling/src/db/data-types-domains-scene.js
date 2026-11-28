/* data-types-domains-scene.js — the "Data Types & Domains" scene, on the flat
   schema CANVAS (engine/schema2d.js). A domain is a type plus its legal values,
   so this scene leans on the typed-row half of a table card: the type column is
   emphasised, constraints and enumerated values ride alongside as chips, and a
   mistyped column is flagged in red beside its correct twin.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'domain', 'primitives', 'constraints', 'enum', 'mismatch', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

export function renderDataTypesDomainsScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── domain: a Product card with every type emphasised ──────────────────── */
  if (view === 'domain') {
    const cols = [
      { name: 'product_id', type: 'int', hot: true },
      { name: 'name', type: 'text', hot: true },
      { name: 'price', type: 'decimal', hot: true },
      { name: 'created', type: 'date', hot: true },
      { name: 'in_stock', type: 'bool', hot: true },
    ];
    const card = tableCard(395, 148, { name: 'Product', icon: 'grid', tone: 'accent', cols, w: 250 });
    body += card.svg;
    body += chip(card.right + 120, card.headCy, 'domain = type', { icon: 'layers', w: 176, delay: 0.55 });
    body += caption(card.cx, card.bottom + 44, 'Each attribute’s type names the domain — the set of legal values it may hold.', { delay: 0.95 });
    return assemble({ slug: 'data-types-domains', aria: 'A Product entity with every attribute type emphasised', body, note: snap.note });
  }

  /* ── primitives: Product with varied narrowest types ────────────────────── */
  if (view === 'primitives') {
    const cols = [
      { name: 'product_id', type: 'int' },
      { name: 'name', type: 'varchar(120)' },
      { name: 'price', type: 'decimal' },
      { name: 'created', type: 'timestamp' },
      { name: 'in_stock', type: 'boolean' },
    ];
    const card = tableCard(395, 148, { name: 'Product', icon: 'grid', tone: 'accent', cols, w: 250 });
    body += card.svg;
    body += chip(card.right + 150, card.cy, 'narrowest type wins', { icon: 'target', w: 222, delay: 0.6 });
    body += caption(card.cx, card.bottom + 44, 'int, varchar(n), decimal, timestamp, boolean — the narrowest primitive each fact allows.', { delay: 1.0 });
    return assemble({ slug: 'data-types-domains', aria: 'Product columns given narrow primitive types', body, note: snap.note });
  }

  /* ── constraints: Product with constraint chips narrowing the domain ────── */
  if (view === 'constraints') {
    const cols = [
      { name: 'product_id', type: 'int', key: true },
      { name: 'name', type: 'varchar(120)', hot: true },
      { name: 'price', type: 'decimal', hot: true },
      { name: 'created', type: 'date' },
    ];
    const card = tableCard(380, 160, { name: 'Product', icon: 'grid', tone: 'accent', cols, w: 250 });
    body += card.svg;
    body += chip(card.right + 140, card.rowCy(1), 'NOT NULL', { icon: 'check', w: 150, delay: 0.55 });
    body += chip(card.right + 150, card.rowCy(2), 'CHECK price > 0', { icon: 'check', w: 200, delay: 0.68 });
    body += connector(
      { x: card.right, y: card.rowCy(1), side: 'right' },
      { x: card.right + 40, y: card.rowCy(1), side: 'left' }, { delay: 0.5, ghost: true }).svg;
    body += connector(
      { x: card.right, y: card.rowCy(2), side: 'right' },
      { x: card.right + 40, y: card.rowCy(2), side: 'left' }, { delay: 0.58, ghost: true }).svg;
    body += caption(card.cx, card.bottom + 44, 'NOT NULL and CHECK shrink a broad type down to its exact legal set.', { delay: 1.0 });
    return assemble({ slug: 'data-types-domains', aria: 'Constraints narrowing a Product domain', body, note: snap.note });
  }

  /* ── enum: Order.status with its enumerated domain as chips ─────────────── */
  if (view === 'enum') {
    const cols = [
      { name: 'order_id', type: 'int', key: true },
      { name: 'customer_id', type: 'int', fk: true },
      { name: 'status', type: 'enum', hot: true },
      { name: 'total', type: 'decimal' },
    ];
    const card = tableCard(150, 160, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols, w: 250 });
    body += card.svg;
    body += band(560, 176, 360, 170, 'status domain', { sub: 'a closed, controlled vocabulary', delay: 0.4 });
    const values = ['new', 'paid', 'shipped'];
    values.forEach((v, i) => { body += chip(740, 240 + i * 40, v, { icon: 'check', w: 150, delay: 0.7 + i * 0.12 }); });
    body += connector(
      { x: card.right, y: card.rowCy(2), side: 'right' },
      { x: 560, y: 220, side: 'left' },
      { to: 'one', delay: 0.6 }).svg;
    body += caption(VW / 2, 540, 'status draws from the enumerated domain {new, paid, shipped} — nothing else is legal.', { delay: 1.2 });
    return assemble({ slug: 'data-types-domains', aria: 'An enumerated domain for Order.status', body, note: snap.note });
  }

  /* ── mismatch: a mistyped column flagged beside its correct twin ────────── */
  if (view === 'mismatch') {
    body += band(60, 120, 440, 320, 'Loose typing', { sub: 'data the model can no longer trust', delay: 0 });
    body += band(540, 120, 440, 320, 'Correct typing', { sub: 'the database can validate it', delay: 0.15 });

    const badCols = [
      { name: 'product_id', type: 'int' },
      { name: 'created', type: 'text', hot: true },
      { name: 'price', type: 'float', hot: true },
    ];
    const goodCols = [
      { name: 'product_id', type: 'int' },
      { name: 'created', type: 'date' },
      { name: 'price', type: 'decimal' },
    ];
    const bad = tableCard(155, 168, { name: 'Product', icon: 'grid', tone: 'rose', cols: badCols, w: 250, delay: 0.25 });
    const good = tableCard(635, 168, { name: 'Product', icon: 'grid', tone: 'green', cols: goodCols, w: 250, delay: 0.35 });
    body += bad.svg + good.svg;
    body += chip(bad.cx, bad.bottom + 34, 'dates sort wrong · money drifts', { icon: 'alert', iconVar: '--red', w: 278, delay: 0.95 });
    body += chip(good.cx, good.bottom + 34, 'sortable · exact · validated', { icon: 'check', w: 250, delay: 1.05 });
    return assemble({ slug: 'data-types-domains', aria: 'A mistyped Product beside its correctly-typed twin', body, note: snap.note });
  }

  /* ── recap: Product + the three domain layers as checks ─────────────────── */
  const cols = [
    { name: 'product_id', type: 'int', key: true },
    { name: 'name', type: 'varchar(120)' },
    { name: 'price', type: 'decimal' },
    { name: 'status', type: 'enum' },
  ];
  const card = tableCard(395, 150, { name: 'Product', icon: 'grid', tone: 'accent', cols, w: 250 });
  body += card.svg;
  const checks = ['type', 'constraint', 'enum'];
  const gap = 230, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body += chip(startX + i * gap, 548, t, { icon: 'check', w: 176, delay: 0.9 + i * 0.1 }); });
  body += caption(VW / 2, 500, 'Type, constraint and enumeration — the three layers that define a trustworthy domain.', { delay: 1.3 });
  return assemble({ slug: 'data-types-domains', aria: 'The three layers of a domain on a Product entity', body, note: snap.note });
}
