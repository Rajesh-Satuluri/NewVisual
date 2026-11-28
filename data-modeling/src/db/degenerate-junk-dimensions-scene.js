/* degenerate-junk-dimensions-scene.js — the "Degenerate & Junk Dimensions"
   scene, on the flat schema CANVAS (engine/schema2d.js). Two hero ideas: a fact
   whose order_number is a dimension key with no table to join to (degenerate),
   and a cluster of low-cardinality flags folded into one small junk dimension.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'degenerate', 'flags-scattered', 'junk', 'combined', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

export function renderDegenerateJunkDimensionsScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── degenerate: a key in the fact with an empty dim to its side ────────── */
  if (view === 'degenerate') {
    const fact = tableCard(150, 150, {
      name: 'fact_sales', icon: 'database', tone: 'accent', w: 300,
      cols: [
        { name: 'date_key', type: 'int', fk: true },
        { name: 'customer_key', type: 'int', fk: true },
        { name: 'product_key', type: 'int', fk: true },
        { name: 'order_number', type: 'text', hot: true },
        { name: 'line_amount', type: 'decimal' },
      ],
    });
    body += fact.svg;
    // the empty dimension it would (but won't) join to — ghosted
    const empty = tableCard(640, 190, {
      name: 'dim_order?', icon: 'folder', tone: 'slate', w: 280, delay: 0.3,
      cols: [
        { name: 'order_number', type: 'text', key: true, ghost: true },
        { name: '(no attributes)', type: '—', ghost: true },
      ],
    });
    body += empty.svg;
    body += connector(
      { x: fact.right, y: fact.rowCy(3), side: 'right' },
      { x: empty.left, y: empty.rowCy(0), side: 'left' },
      { from: 'many', to: 'one', delay: 0.7, ghost: true }).svg;
    body += chip(empty.cx, empty.top - 36, 'nothing to join to', { icon: 'alert', iconVar: '--amber', w: 206, delay: 1.0 });
    body += chip(fact.cx, fact.top - 36, 'degenerate dimension', { icon: 'key', iconVar: '--amber', w: 230, delay: 0.5 });
    body += caption(VW / 2, fact.bottom + 44, 'order_number stays in the fact — the dimension it would point at has only the key and no attributes.', { delay: 1.2 });
    return assemble({ slug: 'degenerate-junk-dimensions', aria: 'A degenerate dimension key in the fact table', body, note: snap.note });
  }

  /* ── flags-scattered: thin flags loose in the fact ─────────────────────── */
  if (view === 'flags-scattered') {
    const fact = tableCard(120, 130, {
      name: 'fact_sales', icon: 'database', tone: 'rose', w: 300,
      cols: [
        { name: 'date_key', type: 'int', fk: true },
        { name: 'product_key', type: 'int', fk: true },
        { name: 'is_gift', type: 'bool', hot: true },
        { name: 'payment_type', type: 'text', hot: true },
        { name: 'order_channel', type: 'text', hot: true },
        { name: 'is_promo', type: 'bool', hot: true },
        { name: 'line_amount', type: 'decimal' },
      ],
    });
    body += fact.svg;
    const flags = [
      { t: 'is_gift · Y/N', d: 0.6 },
      { t: 'payment · card/cash/voucher', d: 0.75 },
      { t: 'channel · web/app/store', d: 0.9 },
      { t: 'is_promo · Y/N', d: 1.05 },
    ];
    flags.forEach((f, i) => { body += chip(730, 180 + i * 70, f.t, { icon: 'sliders', iconVar: '--red', w: 300, delay: f.d }); });
    body += chip(fact.cx, fact.top - 34, 'low-cardinality clutter', { icon: 'alert', iconVar: '--red', w: 232, delay: 0.4 });
    body += caption(VW / 2, fact.bottom + 42, 'Four thin flags loose in the fact (or four trivial dims) — each too small to deserve a dimension.', { delay: 1.2 });
    return assemble({ slug: 'degenerate-junk-dimensions', aria: 'Low-cardinality flags scattered in the fact', body, note: snap.note });
  }

  /* ── junk: the flags folded into one dimension of combinations ──────────── */
  if (view === 'junk') {
    const junk = tableCard(300, 120, {
      name: 'dim_junk', icon: 'folder', tone: 'green', w: 440,
      cols: [
        { name: 'junk_sk', type: 'int', key: true },
        { name: 'is_gift', type: 'bool' },
        { name: 'payment_type', type: 'text' },
        { name: 'order_channel', type: 'text' },
        { name: 'is_promo', type: 'bool' },
      ],
    });
    body += junk.svg;
    body += chip(junk.cx, junk.top - 36, 'distinct combinations', { icon: 'layers', iconVar: '--green', w: 220, delay: 0.5 });
    body += chip(junk.right + 140, junk.rowCy(0), '2 × 3 × 3 × 2 = 36 rows', { icon: 'grid', iconVar: '--accent', w: 260, delay: 0.9 });
    body += connector({ x: junk.right, y: junk.rowCy(2), side: 'right' }, { x: junk.right + 20, y: junk.rowCy(2), side: 'left' }, { delay: 0.7, ghost: true }).svg;
    body += caption(junk.cx, junk.bottom + 48, 'One small table holds each realistic flag combination, keyed by junk_sk — reached from the fact by one FK.', { delay: 1.2 });
    return assemble({ slug: 'degenerate-junk-dimensions', aria: 'A junk dimension of flag combinations', body, note: snap.note });
  }

  /* ── combined / recap: the tidy fact with both keys ────────────────────── */
  const fact = tableCard(120, 170, {
    name: 'fact_sales', icon: 'database', tone: 'accent', w: 290,
    cols: [
      { name: 'date_key', type: 'int', fk: true },
      { name: 'customer_key', type: 'int', fk: true },
      { name: 'order_number', type: 'text', hot: true },
      { name: 'junk_sk', type: 'int', fk: true, hot: true },
      { name: 'line_amount', type: 'decimal' },
    ],
  });
  const junk = tableCard(640, 200, {
    name: 'dim_junk', icon: 'folder', tone: 'green', w: 280, delay: 0.3,
    cols: [
      { name: 'junk_sk', type: 'int', key: true },
      { name: 'is_gift', type: 'bool' },
      { name: 'payment_type', type: 'text' },
      { name: 'order_channel', type: 'text' },
    ],
  });
  body += fact.svg + junk.svg;
  body += connector(
    { x: fact.right, y: fact.rowCy(3), side: 'right' },
    { x: junk.left, y: junk.rowCy(0), side: 'left' },
    { from: 'many', to: 'one', label: 'N : 1', delay: 0.7 }).svg;
  body += chip(fact.right + 20, fact.rowCy(2) - 46, 'degenerate — no table', { icon: 'key', iconVar: '--amber', w: 240, delay: 1.0 });
  if (view === 'recap') {
    body += chip(VW / 2, 500, 'lean fact, meaningful dimensions', { icon: 'check', iconVar: '--green', w: 300, delay: 1.2 });
    body += caption(VW / 2, 548, 'Degenerate order_number groups line items; junk_sk replaces four flags — the fact stays tidy.', { delay: 1.4 });
  } else {
    body += caption(VW / 2, junk.bottom + 48, 'Both tidy-ups in one fact: order_number (degenerate, no join) and a single junk_sk for all the flags.', { delay: 1.2 });
  }
  return assemble({ slug: 'degenerate-junk-dimensions', aria: 'A tidy fact with a degenerate key and a junk FK', body, note: snap.note });
}
