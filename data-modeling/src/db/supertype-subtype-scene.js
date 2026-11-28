/* supertype-subtype-scene.js — the "Supertype / Subtype" scene, on the flat
   schema CANVAS (engine/schema2d.js). A Payment supertype sits over CardPayment
   and BankTransfer subtypes; later steps show the two directions of discovery
   and the three table mappings (single-table with NULLs, table-per-type with
   joins, per-concrete). Motion is CSS: cards rise, connectors draw, chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'hierarchy', 'generalization', 'single-table', 'table-per-type',
   'compare', 'recap'. Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

const PAYMENT_COLS = [
  { name: 'payment_id', type: 'int', key: true },
  { name: 'amount', type: 'decimal' },
  { name: 'paid_at', type: 'timestamp' },
];
const CARD_COLS = [
  { name: 'card_last4', type: 'char(4)' },
  { name: 'expires', type: 'date' },
];
const BANK_COLS = [
  { name: 'iban', type: 'text' },
  { name: 'bank_name', type: 'text' },
];

/* the Payment-over-subtypes hierarchy, reused by several views */
function hierarchy(delay = 0) {
  const sup = tableCard(395, 60, { name: 'Payment', icon: 'scale', tone: 'accent', cols: PAYMENT_COLS, w: 250, delay });
  const card = tableCard(150, 360, { name: 'CardPayment', icon: 'app', tone: 'violet', cols: CARD_COLS, w: 240, delay: delay + 0.2 });
  const bank = tableCard(650, 360, { name: 'BankTransfer', icon: 'database', tone: 'green', cols: BANK_COLS, w: 240, delay: delay + 0.3 });
  let svg = sup.svg + card.svg + bank.svg;
  svg += connector(
    { x: sup.cx - 40, y: sup.bottom, side: 'left' },
    { x: card.cx, y: card.top, side: 'left' },
    { to: 'one', label: 'is-a', delay: delay + 0.6 }).svg;
  svg += connector(
    { x: sup.cx + 40, y: sup.bottom, side: 'right' },
    { x: bank.cx, y: bank.top, side: 'right' },
    { to: 'one', label: 'is-a', delay: delay + 0.75 }).svg;
  return { sup, card, bank, svg };
}

export function renderSupertypeSubtypeScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── hierarchy: supertype over two subtypes ────────────────────────────── */
  if (view === 'hierarchy') {
    const h = hierarchy();
    body += h.svg;
    body += chip(h.sup.right + 110, h.sup.headCy, 'supertype', { icon: 'layers', w: 150, delay: 1.0 });
    body += caption(VW / 2, 300, 'Shared attributes live up in Payment; each subtype adds only its own.', { delay: 1.2 });
    return assemble({ slug: 'supertype-subtype', aria: 'A payment type hierarchy', body, note: snap.note });
  }

  /* ── generalization: two directions onto the same hierarchy ────────────── */
  if (view === 'generalization') {
    const h = hierarchy();
    body += h.svg;
    body += chip(h.sup.cx, h.sup.top - 36, 'generalize ↑ (bottom-up)', { icon: 'chevron', w: 236, delay: 1.0 });
    body += chip(VW / 2, 300, 'specialize ↓ (top-down)', { icon: 'chevron', w: 220, delay: 1.2 });
    body += caption(VW / 2, 540, 'Lift shared attributes up, or push specific ones down — the same hierarchy either way.', { delay: 1.4 });
    return assemble({ slug: 'supertype-subtype', aria: 'Generalization versus specialization', body, note: snap.note });
  }

  /* ── single-table: one wide table + discriminator + NULL-prone cols ────── */
  if (view === 'single-table') {
    const cols = [
      { name: 'payment_id', type: 'int', key: true },
      { name: 'type', type: 'enum', hot: true },
      { name: 'amount', type: 'decimal' },
      { name: 'paid_at', type: 'timestamp' },
      { name: 'card_last4', type: 'char(4)', ghost: true },
      { name: 'iban', type: 'text', ghost: true },
    ];
    const t = tableCard(360, 110, { name: 'payments', icon: 'grid', tone: 'accent', cols, w: 320 });
    body += t.svg;
    body += chip(t.right + 150, t.rowCy(1), 'discriminator', { icon: 'sliders', w: 176, delay: 0.7 });
    body += connector(
      { x: t.right, y: t.rowCy(1), side: 'right' },
      { x: t.right + 24, y: t.rowCy(1), side: 'left' }, { delay: 0.6, ghost: true }).svg;
    body += chip(t.right + 150, t.rowCy(4) + 16, 'NULL off-type', { icon: 'alert', iconVar: '--red', w: 176, delay: 0.9 });
    body += connector(
      { x: t.right, y: t.rowCy(4), side: 'right' },
      { x: t.right + 24, y: t.rowCy(4), side: 'left' }, { delay: 0.8, ghost: true }).svg;
    body += caption(VW / 2, 560, 'One table, join-free — but card_last4 and iban are NULL for every off-type row.', { delay: 1.1 });
    return assemble({ slug: 'supertype-subtype', aria: 'Single-table mapping with a discriminator', body, note: snap.note });
  }

  /* ── table-per-type: supertype + dense subtype tables ──────────────────── */
  if (view === 'table-per-type') {
    const sup = tableCard(395, 70, { name: 'payments', icon: 'grid', tone: 'accent', cols: PAYMENT_COLS, w: 250 });
    const card = tableCard(130, 360, { name: 'card_payments', icon: 'app', tone: 'violet', cols: [
      { name: 'payment_id', type: 'int', key: true, fk: true }, ...CARD_COLS,
    ], w: 250, delay: 0.25 });
    const bank = tableCard(660, 360, { name: 'bank_transfers', icon: 'database', tone: 'green', cols: [
      { name: 'payment_id', type: 'int', key: true, fk: true }, ...BANK_COLS,
    ], w: 250, delay: 0.35 });
    body += sup.svg + card.svg + bank.svg;
    body += connector(
      { x: card.right, y: card.rowCy(0), side: 'right' },
      { x: sup.cx - 30, y: sup.bottom, side: 'left' },
      { from: 'one', to: 'one', delay: 0.7 }).svg;
    body += connector(
      { x: bank.left, y: bank.rowCy(0), side: 'left' },
      { x: sup.cx + 30, y: sup.bottom, side: 'right' },
      { from: 'one', to: 'one', delay: 0.85 }).svg;
    body += chip(VW / 2, 300, 'PK = FK → payments', { icon: 'key', iconVar: '--amber', w: 208, delay: 1.1 });
    body += caption(VW / 2, 560, 'Every table dense, no NULLs — but a full card payment needs a join to payments.', { delay: 1.3 });
    return assemble({ slug: 'supertype-subtype', aria: 'A table per subtype, keyed to the supertype', body, note: snap.note });
  }

  /* ── compare: three mappings side by side ──────────────────────────────── */
  if (view === 'compare') {
    const panels = [
      { label: 'Single-table', sub: 'one wide table', cost: 'NULLs', icon: 'alert', iconVar: '--red' },
      { label: 'Table-per-type', sub: 'supertype + subtypes', cost: 'joins', icon: 'merge', iconVar: '--accent' },
      { label: 'Per-concrete', sub: 'one table each', cost: 'UNIONs', icon: 'layers', iconVar: '--violet' },
    ];
    const w = 300, gap = 20, total = panels.length * w + (panels.length - 1) * gap;
    const x0 = (VW - total) / 2;
    panels.forEach((p, i) => {
      const x = x0 + i * (w + gap);
      body += band(x, 120, w, 300, p.label, { sub: p.sub, delay: i * 0.15 });
      body += chip(x + w / 2, 300, 'cost: ' + p.cost, { icon: p.icon, iconVar: p.iconVar, w: 180, delay: 0.5 + i * 0.15 });
    });
    body += caption(VW / 2, 500, 'Pick by workload: read whole instances fast, keep tables dense, or query each type alone.', { delay: 1.1 });
    return assemble({ slug: 'supertype-subtype', aria: 'Three mappings of a type hierarchy compared', body, note: snap.note });
  }

  /* ── recap: the hierarchy + checked mappings ───────────────────────────── */
  const h = hierarchy();
  body += h.svg;
  const checks = ['single-table', 'table-per-type'];
  const gap = 300, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body += chip(startX + i * gap, 300, t, { icon: 'check', w: 212, delay: 1.0 + i * 0.1 }); });
  body += caption(VW / 2, 540, 'Shared attributes up, specific attributes down — then map by workload.', { delay: 1.3 });
  return assemble({ slug: 'supertype-subtype', aria: 'The supertype/subtype pattern summarised', body, note: snap.note });
}
