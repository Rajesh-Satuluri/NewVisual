/* scd-types-scene.js — the "SCD Types 0–6" scene, on the flat schema CANVAS
   (engine/schema2d.js). The hero is Type 2: two versioned rows for one natural
   key with surrogate key + effective_from / effective_to / is_current. Other
   views draw Type 1 (one overwritten row), Type 3 (prior-value column), Type 6
   (versioned row + overwritten current column), and a type-by-type compare
   stack.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'type1', 'type2', 'type3', 'type6', 'compare', 'recap'.
   Any unknown view falls through to the 'compare'/'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

export function renderScdTypesScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── Type 1: one overwritten row ───────────────────────────────────────── */
  if (view === 'type1') {
    const cols = [
      { name: 'customer_id', type: 'int', key: true },
      { name: 'name', type: 'text' },
      { name: 'region = West', type: 'text', hot: true },
      { name: 'city', type: 'text' },
    ];
    const card = tableCard(360, 180, { name: 'dim_customer', icon: 'app', tone: 'rose', cols, w: 320 });
    body += card.svg;
    body += chip(card.cx, card.top - 36, 'overwrite in place', { icon: 'alert', iconVar: '--red', w: 200, delay: 0.5 });
    body += connector(
      { x: card.right, y: card.rowCy(2), side: 'right' },
      { x: card.right + 40, y: card.rowCy(2), side: 'left' },
      { delay: 0.6, ghost: true }).svg;
    body += chip(card.right + 150, card.rowCy(2), 'East discarded', { icon: 'trash', iconVar: '--red', w: 184, delay: 0.8 });
    body += caption(card.cx, card.bottom + 44, 'One row per customer_id. The East value is gone — Type 1 keeps only the current truth.', { delay: 1.1 });
    return assemble({ slug: 'scd-types', aria: 'Type 1 — a single overwritten dimension row', body, note: snap.note });
  }

  /* ── Type 2: two versioned rows (hero) ─────────────────────────────────── */
  if (view === 'type2') {
    const v1 = tableCard(110, 160, {
      name: 'dim_customer · v1', icon: 'app', tone: 'slate', w: 390,
      cols: [
        { name: 'customer_sk = 1', type: 'int', key: true },
        { name: 'customer_id = 42', type: 'int' },
        { name: 'region = East', type: 'text', hot: true },
        { name: 'effective_from', type: '2019-02-01' },
        { name: 'effective_to', type: '2024-06-30' },
        { name: 'is_current', type: 'false' },
      ],
    });
    const v2 = tableCard(540, 230, {
      name: 'dim_customer · v2', icon: 'app', tone: 'accent', w: 390, delay: 0.3,
      cols: [
        { name: 'customer_sk = 2', type: 'int', key: true },
        { name: 'customer_id = 42', type: 'int' },
        { name: 'region = West', type: 'text', hot: true },
        { name: 'effective_from', type: '2024-07-01' },
        { name: 'effective_to', type: '9999-12-31' },
        { name: 'is_current', type: 'true' },
      ],
    });
    body += v1.svg + v2.svg;
    // same natural key links the two versions
    body += connector(
      { x: v1.right, y: v1.rowCy(1), side: 'right' },
      { x: v2.left, y: v2.rowCy(1), side: 'left' },
      { label: 'same customer_id', delay: 0.9 }).svg;
    body += chip(v2.right - 60, v2.top - 34, 'current version', { icon: 'check', iconVar: '--green', w: 190, delay: 1.1 });
    body += caption(VW / 2, 572, 'Two rows, one natural key. Each version has its own surrogate key and validity window; facts point at the surrogate.', { delay: 1.3 });
    return assemble({ slug: 'scd-types', aria: 'Type 2 — two versioned rows for one customer', body, note: snap.note });
  }

  /* ── Type 3: prior-value column ────────────────────────────────────────── */
  if (view === 'type3') {
    const cols = [
      { name: 'customer_id', type: 'int', key: true },
      { name: 'name', type: 'text' },
      { name: 'current_region = West', type: 'text', hot: true },
      { name: 'prior_region = East', type: 'text', hot: true },
      { name: 'effective_date', type: 'date' },
    ];
    const card = tableCard(330, 150, { name: 'dim_customer', icon: 'app', tone: 'violet', cols, w: 380 });
    body += card.svg;
    body += chip(card.cx, card.top - 36, 'one step of history', { icon: 'merge', iconVar: '--violet', w: 210, delay: 0.5 });
    body += connector(
      { x: card.right, y: card.rowCy(2), side: 'right' },
      { x: card.right, y: card.rowCy(3), side: 'right' },
      { delay: 0.7, ghost: true }).svg;
    body += chip(card.right + 140, card.rowCy(2) + 16, 'value shifts down', { icon: 'chevron', iconVar: '--violet', w: 196, delay: 0.9 });
    body += caption(card.cx, card.bottom + 44, 'One row, two columns. A new value shifts into prior_region — only the latest previous value survives.', { delay: 1.2 });
    return assemble({ slug: 'scd-types', aria: 'Type 3 — a previous-value column', body, note: snap.note });
  }

  /* ── Type 6: versioned row + overwritten current column ─────────────────── */
  if (view === 'type6') {
    const main = tableCard(120, 150, {
      name: 'dim_customer (Type 6)', icon: 'grid', tone: 'accent', w: 380,
      cols: [
        { name: 'customer_sk', type: 'int', key: true },
        { name: 'customer_id', type: 'int' },
        { name: 'region (as-of)', type: 'East', hot: true },
        { name: 'current_region', type: 'West', hot: true },
        { name: 'effective_from', type: 'date' },
        { name: 'is_current', type: 'bool' },
      ],
    });
    body += main.svg;
    body += chip(main.right + 190, main.rowCy(2), 'Type 2 · versioned', { icon: 'layers', iconVar: '--accent', w: 216, delay: 0.7 });
    body += chip(main.right + 190, main.rowCy(3), 'Type 1 · overwritten', { icon: 'bolt', iconVar: '--amber', w: 230, delay: 0.9 });
    body += connector({ x: main.right, y: main.rowCy(2), side: 'right' }, { x: main.right + 72, y: main.rowCy(2), side: 'left' }, { delay: 0.6, ghost: true }).svg;
    body += connector({ x: main.right, y: main.rowCy(3), side: 'right' }, { x: main.right + 72, y: main.rowCy(3), side: 'left' }, { delay: 0.8, ghost: true }).svg;
    body += chip(main.cx, main.top - 36, '6 = 1 + 2 + 3', { icon: 'check', iconVar: '--green', w: 160, delay: 0.4 });
    body += caption(VW / 2, main.bottom + 44, 'Ask "region as-of the sale" of the versioned column, or "region today" of the overwritten current_region — one table.', { delay: 1.1 });
    return assemble({ slug: 'scd-types', aria: 'Type 6 — a hybrid versioned-and-overwritten row', body, note: snap.note });
  }

  /* ── compare / recap: the type spectrum ────────────────────────────────── */
  const TYPES = [
    { nf: 'Type 0', label: 'retain original', sub: 'never change — e.g. original credit score', ic: 'check', iv: '--green' },
    { nf: 'Type 1', label: 'overwrite', sub: 'current value only, no history', ic: 'bolt', iv: '--red' },
    { nf: 'Type 2', label: 'new row per change', sub: 'full history — surrogate key + effective dates', ic: 'layers', iv: '--accent' },
    { nf: 'Type 3', label: 'previous-value column', sub: 'current + one prior value, same row', ic: 'merge', iv: '--violet' },
    { nf: 'Type 4', label: 'history / mini-dimension', sub: 'old versions in a separate table', ic: 'folder', iv: '--accent' },
    { nf: 'Type 6', label: 'hybrid 1 + 2 + 3', sub: 'versioned row plus overwritten current column', ic: 'grid', iv: '--violet' },
  ];
  const top = 60, h = 72, gap = 14;
  TYPES.forEach((t, k) => {
    const y = top + k * (h + gap);
    const d = k * 0.14;
    body += band(90, y, VW - 320, h, `${t.nf} — ${t.label}`, { sub: t.sub, delay: d });
    body += chip(VW - 170, y + h / 2, t.nf, { icon: t.ic, iconVar: t.iv, w: 118, delay: d + 0.2 });
  });
  return assemble({ slug: 'scd-types', aria: 'The SCD types compared from no history to full history', body, note: snap.note });
}
