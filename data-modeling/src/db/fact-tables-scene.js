/* fact-tables-scene.js — the "Fact Tables" scene, on the flat schema CANVAS
   (engine/schema2d.js). The hero visual is a fact card with its two column
   groups made explicit — foreign keys (context) and measures (quantity) — plus
   an additivity stack and a tall-vs-wide shape contrast.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'anatomy', 'grain', 'measures', 'additivity', 'shape', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW, VH } from '../engine/schema2d.js';

/* the fact table: 3 foreign keys (rows 0-2) + 4 measures (rows 3-6) */
const FACT_FULL = [
  { name: 'date_key', type: 'int', fk: true },
  { name: 'product_key', type: 'int', fk: true },
  { name: 'store_key', type: 'int', fk: true },
  { name: 'quantity', type: 'int' },
  { name: 'revenue', type: 'numeric' },
  { name: 'discount_amount', type: 'numeric' },
  { name: 'cost', type: 'numeric' },
];

/* build the fact card with optional row-group highlighting */
function factCard(hotFrom, hotTo) {
  const cols = FACT_FULL.map((c, i) => ({ ...c, hot: hotFrom != null && i >= hotFrom && i <= hotTo }));
  return tableCard(395, 150, { name: 'fact_sales', icon: 'database', tone: 'accent', cols, w: 250, delay: 0 });
}

export function renderFactTablesScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── anatomy: the two column groups named ──────────────────────────────── */
  if (view === 'anatomy') {
    const fact = factCard();
    body += fact.svg;
    body += chip(fact.left - 140, fact.rowCy(1), 'foreign keys', { icon: 'merge', iconVar: '--accent', w: 160, delay: 0.9 });
    body += chip(fact.right + 150, fact.rowCy(4.5), 'measures', { icon: 'gauge', iconVar: '--green', w: 150, delay: 1.05 });
    body += caption(VW / 2, fact.bottom + 42, 'Every column is a foreign key (which members) or a measure (how much) — nothing descriptive.', { delay: 1.3 });
    return assemble({ slug: 'fact-tables', aria: 'The anatomy of a fact table', body, note: snap.note });
  }

  /* ── grain: the declared grain over the fact ───────────────────────────── */
  if (view === 'grain') {
    const fact = factCard();
    body += fact.svg;
    body += chip(fact.cx, fact.top - 36, 'grain: one line on one receipt', { icon: 'grid', iconVar: '--violet', w: 300, delay: 0.9 });
    body += caption(VW / 2, fact.bottom + 42, 'The grain is one English sentence. It fixes every key and every measure the table may hold.', { delay: 1.2 });
    return assemble({ slug: 'fact-tables', aria: 'The grain of a fact table', body, note: snap.note });
  }

  /* ── measures: the measure rows highlighted ────────────────────────────── */
  if (view === 'measures') {
    const fact = factCard(3, 6);
    body += fact.svg;
    body += chip(fact.right + 150, fact.rowCy(4.5), 'numeric · aggregable', { icon: 'gauge', iconVar: '--green', w: 200, delay: 1.0 });
    body += caption(VW / 2, fact.bottom + 42, 'Store atomic per-line values and aggregate at query time — never a pre-summed subtotal.', { delay: 1.3 });
    return assemble({ slug: 'fact-tables', aria: 'The measures of a fact table', body, note: snap.note });
  }

  /* ── additivity: a stack of three tagged measures ──────────────────────── */
  if (view === 'additivity') {
    const ROWS = [
      { y: 70, name: 'revenue', kind: 'additive', sub: 'sum across every dimension, time included', icon: 'check', iv: '--green' },
      { y: 236, name: 'balance', kind: 'semi-additive', sub: 'sum across accounts — but not over time (average / latest)', icon: 'clock', iv: '--amber' },
      { y: 402, name: 'margin_pct', kind: 'non-additive', sub: 'never sum — re-derive from additive parts (Σmargin ÷ Σrevenue)', icon: 'alert', iv: '--red' },
    ];
    ROWS.forEach((r, k) => {
      const d = k * 0.25;
      body += band(90, r.y, VW - 180, 128, `${r.name} — ${r.kind}`, { sub: r.sub, delay: d });
      body += chip(VW - 180, r.y + 64, r.kind.split('-')[0], { icon: r.icon, iconVar: r.iv, w: 128, delay: d + 0.25 });
    });
    body += caption(VW / 2, 560, 'Additivity decides which dimensions a measure may be summed over — tag it so no dashboard sums the wrong column.', { delay: 1.0 });
    return assemble({ slug: 'fact-tables', aria: 'Measure additivity: additive, semi-additive, non-additive', body, note: snap.note });
  }

  /* ── shape: tall narrow fact vs short wide dimension ───────────────────── */
  if (view === 'shape') {
    const fact = tableCard(120, 130, { name: 'fact_sales', icon: 'database', tone: 'accent', cols: FACT_FULL, w: 200, delay: 0 });
    const DIM = [
      { name: 'product_key', type: 'int', key: true },
      { name: 'name · category · brand', type: 'text' },
      { name: 'department · supplier · size', type: 'text' },
    ];
    const dim = tableCard(620, 210, { name: 'dim_product', icon: 'folder', tone: 'amber', cols: DIM, w: 320, delay: 0.3 });
    body += fact.svg + dim.svg;
    body += chip(fact.cx, fact.bottom + 36, 'tall · narrow · billions of rows', { icon: 'layers', iconVar: '--accent', w: 288, delay: 1.0 });
    body += chip(dim.cx, dim.bottom + 36, 'short · wide · few rows', { icon: 'folder', iconVar: '--amber', w: 230, delay: 1.1 });
    body += caption(VW / 2, 560, 'The fact carries the volume; the dimension carries the vocabulary — opposite silhouettes by design.', { delay: 1.3 });
    return assemble({ slug: 'fact-tables', aria: 'Fact tall and narrow versus dimension short and wide', body, note: snap.note });
  }

  /* ── recap fallback: the fact card ─────────────────────────────────────── */
  const fact = factCard();
  body += fact.svg;
  body += chip(fact.left - 140, fact.rowCy(1), 'FKs', { icon: 'merge', iconVar: '--accent', w: 92, delay: 0.9 });
  body += chip(fact.right + 140, fact.rowCy(4.5), 'measures', { icon: 'gauge', iconVar: '--green', w: 150, delay: 1.0 });
  body += chip(fact.cx, fact.top - 36, 'grain: one sale line', { icon: 'grid', iconVar: '--violet', w: 224, delay: 1.1 });
  body += caption(VW / 2, fact.bottom + 42, 'Measures + foreign keys at one grain, nothing descriptive — the fact table at the heart of the star.', { delay: 1.4 });
  return assemble({ slug: 'fact-tables', aria: 'A fact table: measures and foreign keys at one grain', body, note: snap.note });
}
