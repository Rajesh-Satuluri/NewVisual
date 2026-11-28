/* model-smells-scene.js — the "Model Smells & Quality" scene, on the flat schema
   CANVAS (engine/schema2d.js), not the isometric machinery of db-scale. Each
   problem view FLAGS a smell with a rose-toned card and an alert/trash chip:
   redundant repeated cells, a towering god table, a keyless table, a deeply
   nested structure. The recap view is deliberately clean — accent/green tones,
   keyed tables, check chips. Motion is CSS: cards rise in, connectors draw,
   chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'overview', 'redundancy', 'godtable', 'missingkeys', 'overnesting', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

export function renderModelSmellsScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── overview: one card mixing several entities' fields ──────────────────── */
  if (view === 'overview') {
    const cols = [
      { name: 'id', type: 'int' },
      { name: 'customer_name', type: 'text' },
      { name: 'order_total', type: 'decimal' },
      { name: 'product_sku', type: 'text' },
      { name: 'payment_ref', type: 'text' },
    ];
    const card = tableCard(370, 150, { name: 'Everything', icon: 'grid', tone: 'rose', cols, w: 300 });
    body += card.svg;
    body += chip(card.cx, card.top - 34, 'works today — will hurt', { icon: 'alert', iconVar: '--red', w: 240, delay: 0.7 });
    body += caption(card.cx, card.bottom + 44, 'A smell is a structural warning: the schema runs, but its shape will cost you later.', { delay: 1.0 });
    return assemble({ slug: 'model-smells', aria: 'A mixed card — a model that works but will hurt', body, note: snap.note });
  }

  /* ── redundancy: wide Orders card with repeated cells tinted (hot) ───────── */
  if (view === 'redundancy') {
    const cols = [
      { name: 'order_id', type: 'int', key: true },
      { name: 'customer_name', type: 'text', hot: true },
      { name: 'customer_email', type: 'text', hot: true },
      { name: 'product_name', type: 'text', hot: true },
      { name: 'product_price', type: 'decimal', hot: true },
      { name: 'qty', type: 'int' },
    ];
    const card = tableCard(330, 130, { name: 'Orders', icon: 'listOrdered', tone: 'rose', cols, w: 320 });
    body += card.svg;
    body += chip(card.right + 150, card.rowCy(2), 'repeated every row', { icon: 'alert', iconVar: '--red', w: 210, delay: 0.8 });
    body += chip(card.cx, card.top - 34, 'update anomaly', { icon: 'alert', iconVar: '--red', w: 180, delay: 0.6 });
    body += caption(card.cx, card.bottom + 44, 'Customer and product facts copied onto every order — change one email, rewrite thousands of rows.', { delay: 1.1 });
    return assemble({ slug: 'model-smells', aria: 'An Orders table with redundant repeated cells', body, note: snap.note });
  }

  /* ── god table: one very tall card, many columns ─────────────────────────── */
  if (view === 'godtable') {
    const cols = [
      { name: 'id', type: 'int' },
      { name: 'customer_name', type: 'text' },
      { name: 'customer_email', type: 'text' },
      { name: 'customer_tier', type: 'text' },
      { name: 'order_date', type: 'date' },
      { name: 'order_total', type: 'decimal' },
      { name: 'product_sku', type: 'text' },
      { name: 'product_name', type: 'text' },
      { name: 'product_price', type: 'decimal', ghost: true },
      { name: 'payment_ref', type: 'text', ghost: true },
      { name: 'payment_status', type: 'text', ghost: true },
      { name: 'shipping_addr', type: 'text', ghost: true },
      { name: 'warehouse', type: 'text', ghost: true },
      { name: '… +27 more', type: '', ghost: true },
    ];
    const card = tableCard(360, 40, { name: 'MegaTable', icon: 'grid', tone: 'rose', cols, w: 320 });
    body += card.svg;
    body += chip(card.right + 170, card.rowCy(3), 'one table, many entities', { icon: 'alert', iconVar: '--red', w: 258, delay: 0.9 });
    body += chip(card.right + 150, card.rowCy(8), 'mostly null', { icon: 'trash', iconVar: '--red', w: 170, delay: 1.0 });
    return assemble({ slug: 'model-smells', aria: 'A towering god table modelling many entities', body, note: snap.note });
  }

  /* ── missing keys: a card with no key row ────────────────────────────────── */
  if (view === 'missingkeys') {
    const cols = [
      { name: 'customer_name', type: 'text' },
      { name: 'email', type: 'text' },
      { name: 'city', type: 'text' },
      { name: 'signup', type: 'date' },
    ];
    const card = tableCard(360, 180, { name: 'Customers', icon: 'app', tone: 'rose', cols, w: 300 });
    body += card.svg;
    body += chip(card.cx, card.top - 34, 'no primary key', { icon: 'alert', iconVar: '--red', w: 190, delay: 0.7 });
    body += chip(card.right + 150, card.rowCy(1), 'duplicate rows', { icon: 'trash', iconVar: '--red', w: 190, delay: 0.9 });
    body += caption(card.cx, card.bottom + 44, 'With no key, two identical rows are indistinguishable — unaddressable, and no anchor for any relationship.', { delay: 1.1 });
    return assemble({ slug: 'model-smells', aria: 'A keyless table with duplicate rows', body, note: snap.note });
  }

  /* ── over-nesting: indented ghost cards suggest deep nesting ──────────────── */
  if (view === 'overnesting') {
    const levels = [
      { x: 180, y: 110, name: 'Customer', icon: 'app', tone: 'rose', ghost: false },
      { x: 300, y: 210, name: 'orders[]', icon: 'listOrdered', tone: 'rose', ghost: true },
      { x: 420, y: 310, name: 'line_items[]', icon: 'grid', tone: 'rose', ghost: true },
      { x: 540, y: 410, name: 'product_snapshot', icon: 'folder', tone: 'rose', ghost: true },
    ];
    let prev = null;
    levels.forEach((lv, k) => {
      const cols = lv.ghost ? [{ name: '{ … }', type: '', ghost: true }] : [{ name: 'customer_id', type: 'int', key: true }];
      const card = tableCard(lv.x, lv.y, { name: lv.name, icon: lv.icon, tone: lv.tone, cols, w: 230, delay: k * 0.18 });
      body += card.svg;
      if (prev) {
        body += connector({ x: prev.right, y: prev.bottom - 16, side: 'right' }, { x: card.left, y: card.headCy, side: 'left' }, { delay: k * 0.18 + 0.2, ghost: true }).svg;
      }
      prev = card;
    });
    body += chip(820, 150, 'nested 4 levels deep', { icon: 'alert', iconVar: '--red', w: 230, delay: 1.0 });
    body += chip(820, 196, 'tuned before it settled', { icon: 'alert', iconVar: '--red', w: 240, delay: 1.1 });
    body += caption(VW / 2, 548, 'Over-nesting buries fields level upon level; premature indexing bakes in guesses — flatten and tune last.', { delay: 1.2 });
    return assemble({ slug: 'model-smells', aria: 'A deeply nested structure flagged as a smell', body, note: snap.note });
  }

  /* ── recap: the clean, healthy shape ─────────────────────────────────────── */
  const cust = tableCard(170, 170, { name: 'Customer', icon: 'app', tone: 'accent', cols: [
    { name: 'customer_id', type: 'int', key: true },
    { name: 'name', type: 'text' },
    { name: 'email', type: 'text' },
  ], w: 250 });
  const order = tableCard(620, 198, { name: 'Order', icon: 'listOrdered', tone: 'green', cols: [
    { name: 'order_id', type: 'int', key: true },
    { name: 'customer_id', type: 'int', fk: true },
    { name: 'total', type: 'decimal' },
  ], w: 250 });
  body += cust.svg + order.svg;
  body += connector(
    { x: cust.right, y: cust.rowCy(0), side: 'right' },
    { x: order.left, y: order.rowCy(1), side: 'left' },
    { from: 'one', to: 'many', label: '1 : N', delay: 0.6 }).svg;
  const checks = ['keyed', 'normalized', 'clear entities'];
  const gap = 240, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body += chip(startX + i * gap, 548, t, { icon: 'check', iconVar: '--green', w: 200, delay: 1.0 + i * 0.1 }); });
  body += caption(VW / 2, 502, 'Clear entities, a key on every table, controlled redundancy — the model that survives.', { delay: 1.4 });
  return assemble({ slug: 'model-smells', aria: 'A clean, healthy two-table model', body, note: snap.note });
}
