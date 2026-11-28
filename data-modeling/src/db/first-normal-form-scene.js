/* first-normal-form-scene.js — the "First Normal Form (1NF)" scene, on the flat
   schema CANVAS (engine/schema2d.js). The hero move is a DECOMPOSITION: the
   un-normalized wide table shows its offending multi-valued cell tinted rose with
   an alert chip naming the anomaly; the fix step splits a child table out and
   joins it 1:N with a crow's-foot connector. Motion is CSS: cards rise, the
   connector draws on, chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'unf', 'problem', 'atomic', '1nf', 'floor', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

const CUSTOMERS_1NF = [
  { name: 'customer_id', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'email', type: 'text' },
];
const PHONES = [
  { name: 'phone_id', type: 'int', key: true },
  { name: 'customer_id', type: 'int', fk: true },
  { name: 'phone', type: 'text' },
];

/* the split-out customers 1:N phones pair, shared by 1nf / floor / recap */
function splitPair(body, { phoneGhost = false, delay = 0 } = {}) {
  const cust = tableCard(170, 190, { name: 'customers', icon: 'app', tone: 'accent', cols: CUSTOMERS_1NF, w: 250, delay });
  const phones = tableCard(620, 210, { name: 'phones', icon: 'listOrdered', tone: 'green', cols: PHONES.map(c => ({ ...c, ghost: phoneGhost })), w: 250, delay: delay + 0.15 });
  body.s += cust.svg + phones.svg;
  body.s += connector(
    { x: cust.right, y: cust.rowCy(0), side: 'right' },
    { x: phones.left, y: phones.rowCy(1), side: 'left' },
    { from: 'one', to: 'many', label: '1 : N', delay: delay + 0.6 }).svg;
  return { cust, phones };
}

export function renderFirstNormalFormScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  const body = { s: '' };

  /* ── unf: a multi-valued cell tinted rose ──────────────────────────────── */
  if (view === 'unf') {
    const cols = [
      { name: 'customer_id', type: 'int', key: true },
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text' },
      { name: 'phones', type: '"555-1, 555-2, 555-3"', hot: true },
    ];
    const card = tableCard(290, 180, { name: 'Customer', icon: 'app', tone: 'rose', cols, w: 440 });
    body.s += card.svg;
    body.s += chip(card.cx, card.top - 34, 'repeating group — many values in one cell', { icon: 'alert', iconVar: '--red', w: 356, delay: 0.5 });
    body.s += caption(VW / 2, card.bottom + 46, 'The phones cell holds a comma-packed list — the engine sees one opaque string, not three phones.', { delay: 0.9 });
    return assemble({ slug: 'first-normal-form', aria: 'An un-normalized table with a multi-valued cell', body: body.s, note: snap.note });
  }

  /* ── problem: nothing the engine does well works on the cell ───────────── */
  if (view === 'problem') {
    const cols = [
      { name: 'customer_id', type: 'int', key: true },
      { name: 'email', type: 'text' },
      { name: 'phones', type: '"555-1, 555-2, 555-3"', hot: true },
    ];
    const card = tableCard(130, 200, { name: 'Customer', icon: 'app', tone: 'rose', cols, w: 420 });
    body.s += card.svg;
    const fails = [
      ['filter', "WHERE phone = '555-2'"],
      ['constrain', 'UNIQUE / NOT NULL'],
      ['index', 'fast lookup'],
      ['join', 'on a single phone'],
    ];
    fails.forEach(([a, b], i) => {
      body.s += chip(760, 170 + i * 64, `no ${a}`, { icon: 'alert', iconVar: '--red', w: 150, delay: 0.5 + i * 0.12 });
      body.s += caption(760, 170 + i * 64 + 30, b, { delay: 0.6 + i * 0.12 });
    });
    body.s += connector(
      { x: card.right, y: card.rowCy(2), side: 'right' },
      { x: 685, y: 300, side: 'left' },
      { ghost: true, delay: 0.4 }).svg;
    body.s += caption(VW / 2, card.bottom + 44, 'A value buried in a list opts its column out of everything a relational engine is good at.', { delay: 1.2 });
    return assemble({ slug: 'first-normal-form', aria: 'Why a multi-valued cell cannot be queried', body: body.s, note: snap.note });
  }

  /* ── atomic: phone1/phone2/phone3 — atomic but a repeating group ───────── */
  if (view === 'atomic') {
    const cols = [
      { name: 'customer_id', type: 'int', key: true },
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text' },
      { name: 'phone1', type: 'text', hot: true },
      { name: 'phone2', type: 'text', hot: true },
      { name: 'phone3', type: 'text', hot: true },
    ];
    const card = tableCard(300, 110, { name: 'Customer', icon: 'app', tone: 'amber', cols, w: 300 });
    body.s += card.svg;
    body.s += chip(card.cx, card.top - 30, 'atomic — but still a repeating group', { icon: 'alert', iconVar: '--amber', w: 320, delay: 0.5 });
    body.s += chip(card.right + 170, card.rowCy(4), 'a 4th phone? no column', { icon: 'alert', iconVar: '--amber', w: 230, delay: 1.0 });
    body.s += connector(
      { x: card.right, y: card.rowCy(4), side: 'right' },
      { x: card.right + 55, y: card.rowCy(4), side: 'left' },
      { ghost: true, delay: 0.8 }).svg;
    body.s += caption(VW / 2, card.bottom + 40, 'Each cell is atomic now — but phone1/phone2/phone3 bakes a fixed limit into the schema.', { delay: 1.2 });
    return assemble({ slug: 'first-normal-form', aria: 'Atomic values that still form a repeating group', body: body.s, note: snap.note });
  }

  /* ── 1nf: the decomposition — customers 1:N phones ─────────────────────── */
  if (view === '1nf') {
    const { cust, phones } = splitPair(body, { delay: 0 });
    body.s += chip((cust.right + phones.left) / 2, cust.top - 34, 'repeating group → child table', { icon: 'check', w: 266, delay: 1.0 });
    body.s += caption(VW / 2, Math.max(cust.bottom, phones.bottom) + 44, 'One row per phone, each carrying a foreign key home — now every phone is a value you can query.', { delay: 1.2 });
    return assemble({ slug: 'first-normal-form', aria: 'A repeating group decomposed into a child table joined 1:N', body: body.s, note: snap.note });
  }

  /* ── floor: 1NF is necessary, not sufficient ───────────────────────────── */
  if (view === 'floor') {
    const { cust, phones } = splitPair(body, { delay: 0 });
    body.s += chip((cust.right + phones.left) / 2, cust.top - 34, '1NF — the floor', { icon: 'layers', w: 186, delay: 1.0 });
    const rungs = ['1NF ✓ atomic + keyed', '2NF · no partial dep', '3NF · no transitive dep'];
    rungs.forEach((t, i) => {
      body.s += chip(VW / 2 - 300 + i * 300, 500, t, { icon: i === 0 ? 'check' : 'chevron', w: 230, delay: 1.2 + i * 0.12 });
    });
    body.s += caption(VW / 2, 552, 'Atomic and keyed is the entry fee — redundancy and anomalies are what the higher forms go after next.', { delay: 1.7 });
    return assemble({ slug: 'first-normal-form', aria: '1NF as the necessary-but-not-sufficient floor', body: body.s, note: snap.note });
  }

  /* ── recap: customers 1:N phones + check chips ─────────────────────────── */
  const { cust, phones } = splitPair(body, { delay: 0 });
  const checks = ['atomic cells', 'no repeating groups', 'a key per row'];
  const gap = 262, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body.s += chip(startX + i * gap, 548, t, { icon: 'check', w: 230, delay: 1.0 + i * 0.1 }); });
  body.s += caption(VW / 2, 500, 'One value per cell, no repeating groups, a key on every row — the 1NF floor.', { delay: 1.4 });
  return assemble({ slug: 'first-normal-form', aria: 'Recap of first normal form', body: body.s, note: snap.note });
}
