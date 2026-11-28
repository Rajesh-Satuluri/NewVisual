/* bridge-tables-scene.js — the "Bridge Tables" scene, on the flat schema CANVAS
   (engine/schema2d.js). The hero is a bridge table resolving a many-to-many: a
   joint bank account owned by two customers, the double-count a naive join
   creates, and the weighting factor that splits the measure back to the truth.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'many-to-many', 'double-count', 'bridge', 'weight', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

const FACT_BALANCE = [
  { name: 'account_key', type: 'int', fk: true },
  { name: 'as_of_date', type: 'date' },
  { name: 'balance', type: 'decimal' },
];
const DIM_ACCOUNT = [
  { name: 'account_key', type: 'int', key: true },
  { name: 'account_no', type: 'text' },
  { name: 'opened_on', type: 'date' },
];
const DIM_CUSTOMER = [
  { name: 'customer_key', type: 'int', key: true },
  { name: 'name', type: 'text' },
];

export function renderBridgeTablesScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── many-to-many: fact → account → customer, M:N between the dims ──────── */
  if (view === 'many-to-many') {
    const fact = tableCard(70, 190, { name: 'fact_balance', icon: 'database', tone: 'violet', cols: FACT_BALANCE, w: 230 });
    const acct = tableCard(410, 170, { name: 'dim_account', icon: 'app', tone: 'accent', cols: DIM_ACCOUNT, w: 230 });
    const cust = tableCard(770, 180, { name: 'dim_customer', icon: 'folder', tone: 'green', cols: DIM_CUSTOMER, w: 210 });
    body += fact.svg + acct.svg + cust.svg;
    body += connector(
      { x: fact.right, y: fact.rowCy(0), side: 'right' },
      { x: acct.left, y: acct.rowCy(0), side: 'left' },
      { from: 'many', to: 'one', label: 'N : 1', delay: 0.6 }).svg;
    body += connector(
      { x: acct.right, y: acct.rowCy(0), side: 'right' },
      { x: cust.left, y: cust.rowCy(0), side: 'left' },
      { from: 'many', to: 'many', label: 'M : N', delay: 0.9 }).svg;
    body += chip(acct.cx, acct.top - 36, 'account 500: owners 42 + 43', { icon: 'alert', iconVar: '--amber', w: 280, delay: 1.1 });
    body += caption(VW / 2, 500, 'A joint account has many owners and a customer has many accounts — dim_account and dim_customer are many-to-many.', { delay: 1.4 });
    return assemble({ slug: 'bridge-tables', aria: 'A many-to-many between account and customer', body, note: snap.note });
  }

  /* ── double-count: the measure fans out ────────────────────────────────── */
  if (view === 'double-count') {
    const acct = tableCard(380, 150, {
      name: 'joint account 500', icon: 'app', tone: 'rose', w: 280,
      cols: [
        { name: 'account_key = 500', type: 'int', key: true },
        { name: 'balance = $1,000', type: 'decimal', hot: true },
      ],
    });
    body += acct.svg;
    const c42 = tableCard(120, 330, { name: 'customer 42', icon: 'folder', tone: 'slate', w: 230, delay: 0.3,
      cols: [{ name: 'balance → $1,000', type: '', hot: true }] });
    const c43 = tableCard(690, 330, { name: 'customer 43', icon: 'folder', tone: 'slate', w: 230, delay: 0.4,
      cols: [{ name: 'balance → $1,000', type: '', hot: true }] });
    body += c42.svg + c43.svg;
    body += connector({ x: acct.left, y: acct.rowCy(1), side: 'left' }, { x: c42.right, y: c42.rowCy(0), side: 'right' }, { from: 'one', to: 'many', delay: 0.7 }).svg;
    body += connector({ x: acct.right, y: acct.rowCy(1), side: 'right' }, { x: c43.left, y: c43.rowCy(0), side: 'left' }, { from: 'one', to: 'many', delay: 0.8 }).svg;
    body += chip(VW / 2, 470, 'SUM(balance) = $2,000', { icon: 'alert', iconVar: '--red', w: 250, delay: 1.1 });
    body += caption(VW / 2, 520, 'The single $1,000 fact fans out to each owner — summed across customers it double-counts to $2,000.', { delay: 1.4 });
    return assemble({ slug: 'bridge-tables', aria: 'A measure double-counting across a many-to-many', body, note: snap.note });
  }

  /* ── bridge / weight / recap: the resolving bridge table ───────────────── */
  const withWeight = view === 'weight' || view === 'recap';
  const acct = tableCard(60, 200, { name: 'dim_account', icon: 'app', tone: 'accent', cols: DIM_ACCOUNT, w: 210 });
  const bridgeCols = [
    { name: 'account_key', type: 'int', fk: true },
    { name: 'customer_key', type: 'int', fk: true },
  ];
  if (withWeight) bridgeCols.push({ name: 'weight', type: '0.5', hot: true });
  const bridge = tableCard(415, 200, { name: 'bridge_account_owner', icon: 'merge', tone: 'amber', cols: bridgeCols, w: 230, delay: 0.3 });
  const cust = tableCard(775, 200, { name: 'dim_customer', icon: 'folder', tone: 'green', cols: DIM_CUSTOMER, w: 205, delay: 0.5 });
  body += acct.svg + bridge.svg + cust.svg;

  body += connector(
    { x: acct.right, y: acct.rowCy(0), side: 'right' },
    { x: bridge.left, y: bridge.rowCy(0), side: 'left' },
    { from: 'one', to: 'many', label: '1 : N', delay: 0.7 }).svg;
  body += connector(
    { x: bridge.right, y: bridge.rowCy(1), side: 'right' },
    { x: cust.left, y: cust.rowCy(0), side: 'left' },
    { from: 'many', to: 'one', label: 'N : 1', delay: 0.9 }).svg;

  body += chip(bridge.cx, bridge.top - 36, 'one row per pairing', { icon: 'check', iconVar: '--green', w: 210, delay: 1.1 });
  if (view === 'weight') {
    body += chip(VW / 2, 470, 'SUM(balance × weight) = $1,000', { icon: 'scale', iconVar: '--accent', w: 310, delay: 1.3 });
    body += caption(VW / 2, 520, 'Each owner weighted 0.5 (summing to 1.0) — the allocated balances total back to exactly $1,000.', { delay: 1.5 });
  } else if (view === 'recap') {
    body += chip(VW / 2, 470, 'M:N resolved · measure allocated', { icon: 'check', iconVar: '--green', w: 320, delay: 1.3 });
    body += caption(VW / 2, 520, 'fact → account → bridge (weight) → customer — a many-to-many made queryable without double-counting.', { delay: 1.5 });
  } else {
    body += caption(VW / 2, 500, 'The bridge carries a foreign key to each side; the joint account contributes one row per owner.', { delay: 1.3 });
  }
  return assemble({ slug: 'bridge-tables', aria: 'A bridge table resolving a many-to-many', body, note: snap.note });
}
