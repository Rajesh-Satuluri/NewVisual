/* grain-scene.js — the "Declaring the Grain" scene, on the flat schema CANVAS
   (engine/schema2d.js). The hero is the grain SENTENCE pinning a concrete fact
   row, the star of dimensions the grain allows, a fine-vs-coarse comparison, and
   the mixed-grain failure case.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'statement', 'row', 'dimensions', 'finevscoarse', 'mixed', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

const FACT_DAILY = [
  { name: 'date_key', type: 'int', key: true, fk: true },
  { name: 'product_key', type: 'int', key: true, fk: true },
  { name: 'store_key', type: 'int', key: true, fk: true },
  { name: 'units_sold', type: 'int' },
  { name: 'net_sales', type: 'decimal' },
];

function dimCard(x, y, name, icon, tone, keyName, delay) {
  return tableCard(x, y, { name, icon, tone, w: 210, delay, cols: [
    { name: keyName, type: 'int', key: true },
  ] });
}

export function renderGrainScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── statement: the grain sentence as the hero ───────────────────────────── */
  if (view === 'statement') {
    body += band(160, 160, VW - 320, 200, 'The grain', { sub: 'the business meaning of one fact row', delay: 0 });
    const words = ['product', 'store', 'day'];
    const gap = 210, startX = VW / 2 - (words.length - 1) * gap / 2;
    body += caption(VW / 2, 250, 'one row per…', { delay: 0.4 });
    words.forEach((w, i) => {
      body += chip(startX + i * gap, 300, w, { icon: 'grid', iconVar: '--accent', w: 160, delay: 0.6 + i * 0.2 });
    });
    body += caption(VW / 2, 430, 'Say it in plain words first — the columns follow from the sentence, not the other way round.', { delay: 1.3 });
    return assemble({ slug: 'grain', aria: 'The grain stated as a sentence', body, note: snap.note });
  }

  /* ── row: the grain pins one concrete fact row ───────────────────────────── */
  if (view === 'row') {
    const cols = [
      { name: 'date_key = 2024-03-01', type: '', hot: true },
      { name: 'product_key = 44', type: '', hot: true },
      { name: 'store_key = 7', type: '', hot: true },
      { name: 'units_sold = 128', type: '' },
      { name: 'net_sales = 3,840', type: '' },
    ];
    const w = 320, x = VW / 2 - w / 2, y = 150;
    const card = tableCard(x, y, { name: 'fact_daily_sales — one row', icon: 'grid', tone: 'accent', cols, w });
    body += card.svg;
    body += chip(card.cx, y - 30, 'product 44 · store 7 · 2024-03-01', { icon: 'target', iconVar: '--accent', w: 310, delay: 0.5 });
    body += caption(card.cx, card.bottom + 40, 'The grain pins exactly one row — one product, one store, one day — and names what the measures mean.', { delay: 0.9 });
    return assemble({ slug: 'grain', aria: 'The grain pinning one concrete fact row', body, note: snap.note });
  }

  /* ── dimensions / recap: the fact at grain + its allowed dimensions ──────── */
  if (view === 'dimensions' || view === 'recap') {
    const fact = tableCard(410, 220, { name: 'fact_daily_sales', icon: 'grid', tone: 'accent', cols: FACT_DAILY, w: 240 });
    const product = dimCard(410, 60, 'dim_product', 'folder', 'green', 'product_key', 0.3);
    const store = dimCard(70, 250, 'dim_store', 'app', 'violet', 'store_key', 0.45);
    const date = dimCard(770, 250, 'dim_date', 'clock', 'amber', 'date_key', 0.6);
    body += fact.svg + product.svg + store.svg + date.svg;

    body += connector({ x: fact.cx - 40, y: fact.top, side: 'left' }, { x: product.cx, y: product.bottom, side: 'right' }, { from: 'many', to: 'one', delay: 0.9 }).svg;
    body += connector({ x: fact.left, y: fact.rowCy(2), side: 'left' }, { x: store.right, y: store.rowCy(0), side: 'right' }, { from: 'many', to: 'one', delay: 1.0 }).svg;
    body += connector({ x: fact.right, y: fact.rowCy(0), side: 'right' }, { x: date.left, y: date.rowCy(0), side: 'left' }, { from: 'many', to: 'one', delay: 1.1 }).svg;

    if (view === 'recap') {
      const checks = ['declared first', 'fine', 'uniform'];
      const gap = 180, startX = VW / 2 - (checks.length - 1) * gap / 2;
      checks.forEach((t, i) => { body += chip(startX + i * gap, 548, t, { icon: 'check', iconVar: '--green', w: 158, delay: 1.3 + i * 0.12 }); });
    } else {
      body += caption(VW / 2, 560, 'Each noun in the grain — product, store, day — is one dimension. Customer is below the grain and cannot attach.', { delay: 1.4 });
    }
    return assemble({ slug: 'grain', aria: 'A fact at its declared grain with the dimensions it allows', body, note: snap.note });
  }

  /* ── finevscoarse: two bands comparing grains ────────────────────────────── */
  if (view === 'finevscoarse') {
    body += band(60, 90, 450, 410, 'Fine grain', { sub: 'one row per sale line', delay: 0 });
    body += band(530, 90, 450, 410, 'Coarse grain', { sub: 'one row per store per month', delay: 0.2 });
    const fineRows = ['120M rows', 'every detail kept', 'roll up to any level', 'answers future questions'];
    const coarseRows = ['0.4M rows', 'pre-aggregated, fast', 'cannot split back down', 'detail is gone for good'];
    fineRows.forEach((r, i) => body += chip(285, 180 + i * 72, r, { icon: i < 3 ? 'check' : 'check', iconVar: '--green', w: 360, delay: 0.4 + i * 0.12 }));
    coarseRows.forEach((r, i) => {
      const ok = i < 2;
      body += chip(755, 180 + i * 72, r, { icon: ok ? 'check' : 'alert', iconVar: ok ? '--green' : '--red', w: 360, delay: 0.5 + i * 0.12 });
    });
    body += caption(VW / 2, 540, 'You can always roll a fine grain up — never split a coarse grain back down. Model finer when unsure.', { delay: 1.3 });
    return assemble({ slug: 'grain', aria: 'Fine versus coarse grain compared', body, note: snap.note });
  }

  /* ── mixed: the failure case — two grains in one table ───────────────────── */
  const cols = [
    { name: 'row_type = LINE', type: 'detail', hot: true },
    { name: 'sale_id = 9921', type: 'bigint' },
    { name: 'net_sales = 59', type: 'decimal' },
    { name: 'row_type = DAY_TOTAL', type: 'aggregate', ghost: true },
    { name: 'net_sales = 3,840', type: 'decimal', ghost: true },
  ];
  const w = 320, x = VW / 2 - w / 2, y = 130;
  const card = tableCard(x, y, { name: 'fact_sales — MIXED grain', icon: 'alert', tone: 'rose', cols, w });
  body += card.svg;
  body += chip(card.right + 120, card.rowCy(2), 'SUM double-counts!', { icon: 'alert', iconVar: '--red', w: 210, delay: 0.7 });
  body += connector({ x: card.right, y: card.rowCy(2), side: 'right' }, { x: card.right + 15, y: card.rowCy(2), side: 'left' }, { delay: 0.6, ghost: true }).svg;
  body += caption(card.cx, card.bottom + 40, 'The DAY_TOTAL row already contains the LINE rows — one table must hold exactly one grain. Split into two tables.', { delay: 1.0 });
  return assemble({ slug: 'grain', aria: 'A fact table that wrongly mixes two grains', body, note: snap.note });
}
