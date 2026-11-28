/* scd-overview-scene.js — the "Slowly-Changing Dimensions" scene, on the flat
   schema CANVAS (engine/schema2d.js). The hero idea is the SCD PROBLEM: a
   dimension row whose attribute drifts (East → West), the facts that still point
   at it, and the ambiguity an in-place overwrite creates for the past.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'change', 'history', 'overwrite-problem', 'spectrum', 'types', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

const CUSTOMER_EAST = [
  { name: 'customer_id', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'region', type: 'text' },
  { name: 'city', type: 'text' },
];
const FACT_SALES = [
  { name: 'sale_id', type: 'int', key: true },
  { name: 'customer_id', type: 'int', fk: true },
  { name: 'sold_at', type: 'date' },
  { name: 'amount', type: 'decimal' },
];

export function renderScdOverviewScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── single dimension-row view: change ─────────────────────────────────── */
  if (view === 'change') {
    const cols = CUSTOMER_EAST.map((c, i) => ({ ...c, hot: i === 2 }));
    const card = tableCard(230, 170, { name: 'dim_customer', icon: 'app', tone: 'accent', cols, w: 300 });
    body += card.svg;

    // the source reports a new value for region
    body += connector(
      { x: card.right, y: card.rowCy(2), side: 'right' },
      { x: card.right + 40, y: card.rowCy(2), side: 'left' },
      { delay: 0.5, ghost: true }).svg;
    body += chip(card.right + 150, card.rowCy(2), 'East → West', { icon: 'bolt', iconVar: '--amber', w: 170, delay: 0.7 });
    body += chip(card.cx, card.top - 36, 'source change', { icon: 'alert', iconVar: '--amber', w: 170, delay: 0.4 });
    body += caption(card.cx, card.bottom + 44, 'customer_id 42 is unchanged; its region attribute slowly changes from East to West.', { delay: 1.0 });
    return assemble({ slug: 'scd-overview', aria: 'A dimension row whose region attribute changes', body, note: snap.note });
  }

  /* ── fact → dimension views: history / overwrite-problem / recap ────────── */
  if (view === 'history' || view === 'overwrite-problem' || view === 'recap') {
    const overwrite = view === 'overwrite-problem';
    const recap = view === 'recap';
    const dimCols = CUSTOMER_EAST.map((c, i) => ({
      ...c,
      name: i === 2 ? (overwrite ? 'region = West' : (recap ? 'region (current=West)' : 'region = East')) : c.name,
      hot: i === 2,
    }));
    const fact = tableCard(120, 196, { name: 'fact_sales', icon: 'database', tone: 'violet', cols: FACT_SALES, w: 250 });
    const dim = tableCard(640, 180, { name: 'dim_customer', icon: 'app', tone: overwrite ? 'rose' : 'accent', cols: dimCols, w: 280 });
    body += fact.svg + dim.svg;

    body += connector(
      { x: fact.right, y: fact.rowCy(1), side: 'right' },
      { x: dim.left, y: dim.rowCy(0), side: 'left' },
      { from: 'many', to: 'one', label: 'N : 1', delay: 0.7 }).svg;

    if (overwrite) {
      body += chip(dim.cx, dim.top - 36, 'overwritten in place', { icon: 'alert', iconVar: '--red', w: 220, delay: 1.0 });
      body += caption(VW / 2, dim.bottom + 48, 'Old East sales still join to this row — now reported as West. "East or West?" is unanswerable.', { delay: 1.3 });
    } else if (recap) {
      body += chip(dim.cx, dim.top - 36, 'history preserved', { icon: 'check', iconVar: '--green', w: 196, delay: 1.0 });
      body += caption(VW / 2, dim.bottom + 48, 'Past facts keep East, current reads West — two versions, so every era stays answerable.', { delay: 1.3 });
    } else {
      body += chip(fact.cx, fact.top - 36, 'booked while East', { icon: 'clock', iconVar: '--accent', w: 196, delay: 1.0 });
      body += caption(VW / 2, dim.bottom + 48, 'These sales were recorded when customer 42 lived in the East — and still point at that one row.', { delay: 1.3 });
    }
    return assemble({ slug: 'scd-overview', aria: 'Facts pointing at a changing dimension row', body, note: snap.note });
  }

  /* ── spectrum view: the per-attribute choice ───────────────────────────── */
  if (view === 'spectrum') {
    body += band(80, 120, 400, 300, 'Overwrite', { sub: 'current truth — the old value is discarded', delay: 0 });
    body += band(560, 120, 400, 300, 'Preserve', { sub: 'keep history — add a version of the row', delay: 0.2 });
    body += chip(280, 250, 'region = West', { icon: 'bolt', iconVar: '--red', w: 180, delay: 0.5 });
    body += chip(280, 320, 'no history kept', { icon: 'alert', iconVar: '--red', w: 190, delay: 0.65 });
    body += chip(760, 230, 'v1 region = East', { icon: 'check', iconVar: '--green', w: 196, delay: 0.5 });
    body += chip(760, 300, 'v2 region = West', { icon: 'check', iconVar: '--green', w: 196, delay: 0.65 });
    body += chip(760, 370, 'surrogate + dates', { icon: 'key', iconVar: '--amber', w: 206, delay: 0.8 });
    body += caption(VW / 2, 490, 'The question is asked per attribute: overwrite for "where are they now", version for "where were they then".', { delay: 1.1 });
    return assemble({ slug: 'scd-overview', aria: 'The per-attribute overwrite-or-preserve choice', body, note: snap.note });
  }

  /* ── types view: the spectrum of SCD types ─────────────────────────────── */
  const TYPES = [
    { nf: 'Type 0', label: 'retain original', sub: 'never changes — keep the first value forever', tone: 'slate', ic: 'check' },
    { nf: 'Type 1', label: 'overwrite', sub: 'no history — current value only (lossy)', tone: 'rose', ic: 'alert' },
    { nf: 'Type 2', label: 'new row per change', sub: 'full history — surrogate key + effective dates', tone: 'accent', ic: 'layers' },
    { nf: 'Type 3', label: 'previous-value column', sub: 'one step of history in an extra column', tone: 'slate', ic: 'merge' },
    { nf: 'Type 4', label: 'history table', sub: 'move old versions to a separate table', tone: 'slate', ic: 'folder' },
    { nf: 'Type 6', label: 'hybrid 1 + 2 + 3', sub: 'a Type-2 row plus current-value columns', tone: 'violet', ic: 'grid' },
  ];
  const top = 60, h = 72, gap = 14;
  TYPES.forEach((t, k) => {
    const y = top + k * (h + gap);
    const d = k * 0.14;
    body += band(90, y, VW - 320, h, `${t.nf} — ${t.label}`, { sub: t.sub, delay: d });
    body += chip(VW - 170, y + h / 2, t.nf, { icon: t.ic, iconVar: t.tone === 'rose' ? '--red' : t.tone === 'accent' ? '--accent' : t.tone === 'violet' ? '--violet' : '--green', w: 118, delay: d + 0.2 });
  });
  return assemble({ slug: 'scd-overview', aria: 'The SCD types as a spectrum of history-keeping', body, note: snap.note });
}
