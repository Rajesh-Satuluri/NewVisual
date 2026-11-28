/* fact-table-types-scene.js — the "Transaction · Periodic · Accumulating" scene,
   on the flat schema CANVAS (engine/schema2d.js). The hero is the contrast of
   three fact-table GRAINS: a single fact card per grain (transaction / periodic /
   accumulating), then a three-band comparison of their write patterns and an
   additivity stack.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'transaction', 'periodic', 'accumulating', 'compare', 'additivity',
   'recap'. Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

const TRANSACTION = [
  { name: 'sale_id', type: 'bigint', key: true },
  { name: 'date_key', type: 'int', fk: true },
  { name: 'product_key', type: 'int', fk: true },
  { name: 'store_key', type: 'int', fk: true },
  { name: 'quantity', type: 'int' },
  { name: 'net_amount', type: 'decimal' },
];
const PERIODIC = [
  { name: 'snapshot_date', type: 'date', key: true },
  { name: 'account_key', type: 'int', fk: true },
  { name: 'balance', type: 'decimal' },
  { name: 'interest_accrued', type: 'decimal' },
  { name: 'status', type: 'text' },
];
const ACCUMULATING = [
  { name: 'order_id', type: 'bigint', key: true },
  { name: 'order_date_key', type: 'int', fk: true },
  { name: 'ship_date_key', type: 'int', fk: true },
  { name: 'deliver_date_key', type: 'int', fk: true },
  { name: 'order_to_ship_days', type: 'int' },
  { name: 'ship_to_deliver_days', type: 'int' },
];

/* a single hero fact card, centered, with a tag chip above and a caption below */
function singleFact(name, icon, tone, cols, tag, tagVar, cap) {
  let body = '';
  const w = 300, x = VW / 2 - w / 2, y = 128;
  const card = tableCard(x, y, { name, icon, tone, cols, w });
  body += card.svg;
  body += chip(card.cx, y - 30, tag, { icon: 'grid', iconVar: tagVar, w: tag.length * 7.6 + 46, delay: 0.5 });
  body += caption(card.cx, card.bottom + 40, cap, { delay: 0.85 });
  return body;
}

export function renderFactTableTypesScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  if (view === 'transaction') {
    body += singleFact('fact_sales', 'database', 'accent', TRANSACTION,
      'grain: one row per event', '--accent',
      'Inserted once, never updated — the finest grain, rolls up any way a dimension allows.');
    return assemble({ slug: 'fact-table-types', aria: 'A transaction fact table at event grain', body, note: snap.note });
  }

  if (view === 'periodic') {
    const cols = PERIODIC.map((c, i) => ({ ...c, hot: i === 2 }));
    body += singleFact('fact_account_daily', 'clock', 'violet', cols,
      'grain: one row per account per day', '--violet',
      'State sampled on a clock — one dense row per entity per period, balance semi-additive across time.');
    return assemble({ slug: 'fact-table-types', aria: 'A periodic snapshot fact table', body, note: snap.note });
  }

  if (view === 'accumulating') {
    const cols = ACCUMULATING.map((c, i) => ({ ...c, hot: i >= 1 && i <= 3 }));
    let b = '';
    const w = 310, x = VW / 2 - w / 2, y = 120;
    const card = tableCard(x, y, { name: 'fact_order_pipeline', icon: 'listOrdered', tone: 'green', cols, w });
    b += card.svg;
    b += chip(card.cx, y - 30, 'grain: one row per order', { icon: 'grid', iconVar: '--green', w: 220, delay: 0.5 });
    b += chip(card.right + 128, card.rowCy(2), 'UPDATED as it advances', { icon: 'bolt', iconVar: '--amber', w: 220, delay: 0.75 });
    b += connector(
      { x: card.right, y: card.rowCy(2), side: 'right' },
      { x: card.right + 18, y: card.rowCy(2), side: 'left' },
      { delay: 0.6, ghost: true }).svg;
    b += caption(card.cx, card.bottom + 36, 'Three date FKs fill in as the order ships and delivers; lag measured in place.', { delay: 0.95 });
    body += b;
    return assemble({ slug: 'fact-table-types', aria: 'An accumulating snapshot fact table', body, note: snap.note });
  }

  /* ── compare / recap: three grains as side-by-side column bands ──────────── */
  if (view === 'compare' || view === 'recap') {
    const recap = view === 'recap';
    const cols = [
      { label: 'Transaction', sub: 'one row per event', tone: '--accent',
        rows: ['sale_id, date, store…', 'INSERT only', 'never updated'], tag: 'event grain' },
      { label: 'Periodic', sub: 'one row per period', tone: '--violet',
        rows: ['snapshot_date, acct…', 'INSERT only', 'dense, regular'], tag: 'period grain' },
      { label: 'Accumulating', sub: 'one row per process', tone: '--amber',
        rows: ['order, ship, deliver…', 'INSERT then UPDATE', 'tracks milestone lag'], tag: 'process grain' },
    ];
    const bw = 300, gap = 20, total = cols.length * bw + (cols.length - 1) * gap;
    const startX = (VW - total) / 2;
    const by = 92, bh = 392;
    cols.forEach((c, i) => {
      const bx = startX + i * (bw + gap);
      const d = i * 0.18;
      body += band(bx, by, bw, bh, c.label, { sub: c.sub, delay: d });
      c.rows.forEach((r, k) => {
        body += chip(bx + bw / 2, by + 112 + k * 56, r, { w: bw - 44, delay: d + 0.25 + k * 0.1 });
      });
      body += chip(bx + bw / 2, by + bh - 34,
        recap ? c.label : c.tag,
        { icon: recap ? 'check' : 'layers', iconVar: recap ? '--green' : c.tone, w: bw - 90, delay: d + 0.6 });
    });
    body += caption(VW / 2, by + bh + 42,
      recap ? 'One process, three possible fact grains — the business question picks which one you build.'
            : 'Tell them apart by the write pattern, not the shape — only accumulating ever updates a row.',
      { delay: 1.1 });
    return assemble({ slug: 'fact-table-types', aria: 'Three fact-table grains compared', body, note: snap.note });
  }

  /* ── additivity: full-width stack of three bands ─────────────────────────── */
  const RULES = [
    { y: 70, label: 'Additive — sum across anything', sub: 'net_amount, quantity (transaction) — every SUM is meaningful', tone: 'accent', tag: 'SUM ✓' },
    { y: 236, label: 'Semi-additive — not across time', sub: 'balance, inventory_on_hand (periodic) — add across accounts, never across days', tone: 'amber', tag: 'avg over time' },
    { y: 402, label: 'Non-additive — never summed', sub: 'ratios & lags like days_to_ship (accumulating) — average or count, do not add', tone: 'rose', tag: 'no SUM' },
  ];
  RULES.forEach((r, k) => {
    const d = k * 0.22;
    body += band(90, r.y, VW - 180, 128, r.label, { sub: r.sub, delay: d });
    body += chip(VW - 190, r.y + 64, r.tag,
      { icon: r.tone === 'accent' ? 'check' : 'alert', iconVar: r.tone === 'accent' ? '--green' : r.tone === 'amber' ? '--amber' : '--red', w: 148, delay: d + 0.25 });
  });
  body += caption(VW / 2, 560, 'The grain — not the column type — decides which aggregation is legal.', { delay: 1.0 });
  return assemble({ slug: 'fact-table-types', aria: 'Additive, semi-additive and non-additive measures', body, note: snap.note });
}
