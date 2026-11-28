/* entities-attributes-scene.js — the "Entities & Attributes" scene, on the flat
   schema CANVAS (engine/schema2d.js). An entity type is a flat table card; an
   instance is a small chip; each attribute kind gets its own visual treatment —
   simple rows, a composite sub-card, a ghosted derived row, and a multivalued
   attribute split into its own 1:N table. Motion is CSS: cards rise in, rows
   slide in, connectors draw, chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'entity', 'simple', 'composite', 'derived', 'multivalued', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, caption, assemble, VW } from '../engine/schema2d.js';

const SIMPLE_COLS = [
  { name: 'customer_id', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'email', type: 'text' },
  { name: 'signup_date', type: 'date' },
];

export function renderEntitiesAttributesScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── entity type vs instance ───────────────────────────────────────────── */
  if (view === 'entity') {
    const x = 390, y = 170, w = 280;
    const cols = [
      { name: 'customer_id', type: '…', ghost: true },
      { name: 'name', type: '…', ghost: true },
      { name: 'email', type: '…', ghost: true },
    ];
    const card = tableCard(x, y, { name: 'Customer', icon: 'app', tone: 'accent', cols, w });
    body += card.svg;
    body += chip(card.cx, y - 34, 'entity type', { icon: 'grid', delay: 0.4 });
    // two instances — concrete rows that fill the template
    const insY = card.bottom + 56;
    body += caption(card.cx, card.bottom + 32, 'Every real customer is an instance of this one type:', { delay: 0.7 });
    body += chip(card.cx - 150, insY, '#1024 · Ada Lovelace', { icon: 'check', w: 212, delay: 0.95 });
    body += chip(card.cx + 150, insY, '#1025 · Grace Hopper', { icon: 'check', w: 212, delay: 1.1 });
    return assemble({ slug: 'entities-attributes', aria: 'An entity type and its instances', body, note: snap.note });
  }

  /* ── simple attributes ─────────────────────────────────────────────────── */
  if (view === 'simple') {
    const x = 390, y = 160, w = 300;
    const card = tableCard(x, y, { name: 'Customer', icon: 'app', tone: 'accent', cols: SIMPLE_COLS, w });
    body += card.svg;
    body += chip(card.cx, y - 34, 'atomic · single-valued · typed', { icon: 'check', w: 266, delay: 0.5 });
    body += caption(card.cx, card.bottom + 40, 'Four simple attributes — each an atomic fact drawn from one domain, and each exactly one column.', { delay: 0.8 });
    return assemble({ slug: 'entities-attributes', aria: 'An entity with simple attributes', body, note: snap.note });
  }

  /* ── composite attribute → sub-parts ───────────────────────────────────── */
  if (view === 'composite') {
    const x = 220, y = 165, w = 270;
    const cols = [
      { name: 'customer_id', type: 'int', key: true },
      { name: 'name', type: 'composite', hot: true },
      { name: 'email', type: 'text' },
      { name: 'signup_date', type: 'date' },
    ];
    const card = tableCard(x, y, { name: 'Customer', icon: 'app', tone: 'accent', cols, w });
    body += card.svg;
    // sub-card listing the parts of `name`
    const sub = tableCard(620, 150, {
      name: 'name', icon: 'layers', tone: 'amber', w: 220,
      cols: [{ name: 'first_name', type: 'text' }, { name: 'last_name', type: 'text' }],
      delay: 0.5,
    });
    body += sub.svg;
    body += connector(
      { x: card.right, y: card.rowCy(1), side: 'right' },
      { x: sub.left, y: sub.headCy, side: 'left' },
      { delay: 0.9, ghost: true, label: 'decomposes' }).svg;
    body += caption(VW / 2, 520, 'One composite attribute, named parts — "name" is one attribute but two columns once you store first_name and last_name.', { delay: 1.3 });
    return assemble({ slug: 'entities-attributes', aria: 'A composite attribute expanded into sub-parts', body, note: snap.note });
  }

  /* ── derived attribute ─────────────────────────────────────────────────── */
  if (view === 'derived') {
    const x = 300, y = 150, w = 300;
    const cols = [
      { name: 'customer_id', type: 'int', key: true },
      { name: 'email', type: 'text' },
      { name: 'signup_date', type: 'date' },
      { name: 'birth_date', type: 'date' },
      { name: 'age', type: 'derived', ghost: true },
    ];
    const card = tableCard(x, y, { name: 'Customer', icon: 'app', tone: 'accent', cols, w });
    body += card.svg;
    body += chip(card.right + 150, card.rowCy(4), 'age = f(birth_date)', { icon: 'sliders', w: 224, delay: 0.7 });
    body += connector(
      { x: card.right, y: card.rowCy(4), side: 'right' },
      { x: card.right + 28, y: card.rowCy(4), side: 'left' },
      { delay: 0.55, ghost: true }).svg;
    body += caption(card.cx, card.bottom + 44, 'The derived row is ghosted: its value comes from a formula, not from its own stored fact. Compute it live, or store and maintain it.', { delay: 1.0 });
    return assemble({ slug: 'entities-attributes', aria: 'A derived attribute computed from another', body, note: snap.note });
  }

  /* ── multivalued attribute → split-out entity ──────────────────────────── */
  if (view === 'multivalued') {
    const cust = tableCard(200, 170, {
      name: 'Customer', icon: 'app', tone: 'accent', w: 260,
      cols: [
        { name: 'customer_id', type: 'int', key: true },
        { name: 'name', type: 'text' },
        { name: 'email', type: 'text' },
        { name: 'phones', type: 'many ⨉', hot: true },
      ],
    });
    const phone = tableCard(620, 182, {
      name: 'Phone', icon: 'listOrdered', tone: 'violet', w: 250, delay: 0.5,
      cols: [
        { name: 'phone_id', type: 'int', key: true },
        { name: 'customer_id', type: 'int', fk: true },
        { name: 'number', type: 'text' },
      ],
    });
    body += cust.svg + phone.svg;
    body += connector(
      { x: cust.right, y: cust.rowCy(3), side: 'right' },
      { x: phone.left, y: phone.rowCy(1), side: 'left' },
      { from: 'one', to: 'many', label: '1 : N', delay: 0.9 }).svg;
    body += caption(VW / 2, 540, 'phones is multivalued — it becomes its own Phone entity, one row per number, joined back to Customer by a foreign key.', { delay: 1.3 });
    return assemble({ slug: 'entities-attributes', aria: 'A multivalued attribute split into a separate table', body, note: snap.note });
  }

  /* ── recap ─────────────────────────────────────────────────────────────── */
  const x = 390, y = 150, w = 300;
  const card = tableCard(x, y, {
    name: 'Customer', icon: 'app', tone: 'accent', w,
    cols: [
      { name: 'customer_id', type: 'int', key: true },
      { name: 'first_name', type: 'text' },
      { name: 'last_name', type: 'text' },
      { name: 'email', type: 'text' },
      { name: 'birth_date', type: 'date' },
      { name: 'age', type: 'derived', ghost: true },
    ],
  });
  body += card.svg;
  const kinds = ['simple', 'composite', 'derived', 'multivalued'];
  const gap = 230, startX = VW / 2 - (kinds.length - 1) * gap / 2;
  kinds.forEach((t, i) => { body += chip(startX + i * gap, 548, t, { icon: 'check', w: 190, delay: 1.0 + i * 0.1 }); });
  body += caption(VW / 2, 500, 'One entity type, described by attributes of every kind — simple, composite, derived and multivalued, over the key.', { delay: 1.4 });
  return assemble({ slug: 'entities-attributes', aria: 'An entity and the kinds of attribute that describe it', body, note: snap.note });
}
