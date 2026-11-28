/* three-schema-architecture-scene.js — the "Three-Schema Architecture" scene, on
   the flat schema CANVAS (engine/schema2d.js), not the isometric machinery of
   db-scale. This draws the ANSI-SPARC levels: many external views on top, one
   conceptual schema in the middle, and the internal storage schema at the bottom,
   with the data independence the split buys. Motion is CSS — cards rise, rows
   slide, connectors draw, chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'overview', 'external', 'conceptual', 'internal', 'independence',
   'recap'. Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

/* the conceptual schema's entities, shown as rows of one shared card */
const SCHEMA_COLS = [
  { name: 'Customer', key: true },
  { name: 'Order' },
  { name: 'Product' },
];

/* the internal (storage) view of one table — concrete typed rows */
const STORED_COLS = [
  { name: 'customer_id', type: 'bigint', key: true },
  { name: 'region', type: 'char(2)' },
  { name: 'email', type: 'varchar(160)' },
];

/* the three ANSI-SPARC level bands, each with a representative row of chips.
   Shared by the 'overview' and 'independence' views. `insulate` adds the data-
   independence boundary chips between the bands. */
function schemaStack(insulate) {
  const LEVELS = [
    { y: 18, label: 'External', sub: 'one tailored view per user group',
      chips: [['Sales view', 'layers'], ['Billing view', 'layers'], ['Ops view', 'layers']] },
    { y: 186, label: 'Conceptual', sub: 'the one community schema',
      chips: [['entities', 'grid'], ['relationships', 'merge'], ['constraints', 'key']] },
    { y: 354, label: 'Internal', sub: 'files, pages, indexes & access paths',
      chips: [['files', 'file'], ['indexes', 'search'], ['pages', 'database']] },
  ];
  let s = '';
  LEVELS.forEach((lv, k) => {
    const d = k * 0.2;
    s += band(40, lv.y, VW - 80, 156, lv.label, { sub: lv.sub, delay: d });
    const cy = lv.y + 78, gap = 180, startX = 640 - (lv.chips.length - 1) * gap / 2;
    lv.chips.forEach(([t, ic], i) => {
      s += chip(startX + i * gap, cy, t, { icon: ic, w: 160, delay: d + 0.15 + i * 0.08 });
    });
    // data-independence boundary markers
    if (insulate && k < LEVELS.length - 1) {
      const lbl = k === 0 ? 'logical independence ↑' : 'physical independence ↑';
      const ic = k === 0 ? 'layers' : 'database';
      s += chip(270, lv.y + 170, lbl, { icon: ic, w: 236, delay: d + 0.55 });
    }
  });
  return s;
}

export function renderThreeSchemaArchitectureScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── overview: the three level bands ───────────────────────────────────── */
  if (view === 'overview') {
    body += schemaStack(false);
    return assemble({ slug: 'three-schema-architecture', aria: 'External, conceptual and internal schema levels', body, note: snap.note });
  }

  /* ── independence: the bands, with insulating boundary chips ───────────── */
  if (view === 'independence') {
    body += schemaStack(true);
    body += caption(VW / 2, 540, 'Each boundary absorbs change below it, so the layer above keeps its stable interface.', { delay: 1.1 });
    return assemble({ slug: 'three-schema-architecture', aria: 'The two kinds of data independence', body, note: snap.note });
  }

  /* ── external: several views, each connecting down to one shared schema ── */
  if (view === 'external') {
    const views = [
      tableCard(110, 70, { name: 'Sales view', icon: 'layers', tone: 'accent', cols: [{ name: 'customer' }, { name: 'contact' }], w: 220 }),
      tableCard(410, 70, { name: 'Billing view', icon: 'layers', tone: 'amber', cols: [{ name: 'account' }, { name: 'balance' }], w: 220, delay: 0.1 }),
      tableCard(710, 70, { name: 'Ops view', icon: 'layers', tone: 'green', cols: [{ name: 'order' }, { name: 'status' }], w: 220, delay: 0.2 }),
    ];
    views.forEach(v => { body += v.svg; });
    const schema = tableCard(380, 370, { name: 'Conceptual schema', icon: 'grid', tone: 'violet', cols: SCHEMA_COLS, w: 280, delay: 0.4 });
    body += schema.svg;
    body += chip(schema.cx, schema.top - 34, 'one shared schema', { icon: 'database', w: 194, delay: 0.7 });
    views.forEach((v, i) => {
      body += connector(
        { x: v.cx, y: v.bottom, side: 'right' },
        { x: schema.cx, y: schema.top, side: 'left' },
        { delay: 0.8 + i * 0.1 }).svg;
    });
    body += caption(VW / 2, schema.bottom + 44, 'Each external schema is a view — a renamed subset of the one conceptual schema, storing nothing of its own.', { delay: 1.3 });
    return assemble({ slug: 'three-schema-architecture', aria: 'External views over one conceptual schema', body, note: snap.note });
  }

  /* ── conceptual: one region holding the whole community design ─────────── */
  if (view === 'conceptual') {
    body += band(110, 90, 820, 400, 'Conceptual schema', { sub: 'all entities, relationships & constraints — no storage detail', delay: 0 });
    const cust = tableCard(210, 170, { name: 'Customer', icon: 'app', tone: 'accent', cols: [{ name: 'customer_id', type: 'int', key: true }, { name: 'name', type: 'text' }], w: 240, delay: 0.2 });
    const order = tableCard(600, 200, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: [{ name: 'order_id', type: 'int', key: true }, { name: 'customer_id', type: 'int', fk: true }], w: 240, delay: 0.3 });
    body += cust.svg + order.svg;
    body += connector(
      { x: cust.right, y: cust.rowCy(0), side: 'right' },
      { x: order.left, y: order.rowCy(1), side: 'left' },
      { from: 'one', to: 'many', label: '1 : N', delay: 0.6 }).svg;
    const cons = [['NOT NULL', 'key'], ['UNIQUE', 'key'], ['FOREIGN KEY', 'merge'], ['CHECK', 'check']];
    const gap = 200, startX = VW / 2 - (cons.length - 1) * gap / 2;
    cons.forEach(([t, ic], i) => { body += chip(startX + i * gap, 430, t, { icon: ic, w: 174, delay: 0.9 + i * 0.1 }); });
    body += caption(VW / 2, 528, 'One community schema, shared by every external view and implemented by the internal one.', { delay: 1.4 });
    return assemble({ slug: 'three-schema-architecture', aria: 'The single conceptual schema with its constraints', body, note: snap.note });
  }

  /* ── internal: one stored table annotated with storage chips ───────────── */
  if (view === 'internal') {
    const card = tableCard(200, 190, { name: 'customer', icon: 'database', tone: 'slate', cols: STORED_COLS, w: 290 });
    body += card.svg;
    const notes = [
      ['heap file', 'file', 0],
      ['B-tree idx · customer_id', 'search', 1],
      ['42 pages · 8 KB', 'database', 2],
    ];
    notes.forEach(([t, ic, i]) => {
      body += chip(card.right + 170, card.rowCy(i), t, { icon: ic, w: 250, delay: 0.5 + i * 0.12 });
      body += connector(
        { x: card.right, y: card.rowCy(i), side: 'right' },
        { x: card.right + 24, y: card.rowCy(i), side: 'left' },
        { delay: 0.45 + i * 0.12, ghost: true }).svg;
    });
    body += caption(VW / 2, card.bottom + 56, 'The internal schema is the only level that mentions bytes — files, pages, indexes and access paths.', { delay: 1.0 });
    return assemble({ slug: 'three-schema-architecture', aria: 'The internal storage schema of one table', body, note: snap.note });
  }

  /* ── recap (fallback): the three-band stack + the three layer checks ───── */
  body += schemaStack(false);
  const checks = ['views', 'conceptual', 'storage'];
  const gap = 230, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body += chip(startX + i * gap, 552, t, { icon: 'check', w: 186, delay: 0.9 + i * 0.1 }); });
  body += caption(VW / 2, 528, 'Views over a shared design over storage — each layer changeable behind a stable interface.', { delay: 1.3 });
  return assemble({ slug: 'three-schema-architecture', aria: 'Recap: three isolated schema layers', body, note: snap.note });
}
