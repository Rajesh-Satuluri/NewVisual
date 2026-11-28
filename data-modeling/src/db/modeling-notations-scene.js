/* modeling-notations-scene.js — the "Modeling Notations" scene, on the flat
   schema CANVAS (engine/schema2d.js), not the isometric machinery of db-scale.
   One Customer–Order model, redrawn in three notations. Because the canvas
   speaks in flat cards + crow's-foot connectors, Chen and UML are APPROXIMATED
   with chips and captions — the body text says so. Motion is CSS: cards rise in,
   connectors draw themselves, cardinality chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'overview', 'chen', 'crowsfoot', 'uml', 'compare', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

const CUSTOMER_COLS = [
  { name: 'customer_id', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'email', type: 'text' },
];
const ORDER_COLS = [
  { name: 'order_id', type: 'int', key: true },
  { name: 'customer_id', type: 'int', fk: true },
  { name: 'total', type: 'decimal' },
];

export function renderModelingNotationsScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── Chen: boxes + a diamond-ish relationship chip + 1 / N on the edges ──── */
  if (view === 'chen') {
    const cust = tableCard(130, 220, { name: 'Customer', icon: 'app', tone: 'accent', cols: [] });
    const order = tableCard(660, 220, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: [] });
    body += cust.svg + order.svg;
    body += connector({ x: cust.right, y: cust.headCy, side: 'right' }, { x: order.left, y: order.headCy, side: 'left' }, { delay: 0.5 }).svg;
    body += chip(VW / 2, cust.headCy, '◇ places', { icon: 'merge', w: 150, delay: 1.0 });
    body += chip(cust.right + 70, cust.headCy - 44, '1', { w: 44, delay: 1.2 });
    body += chip(order.left - 70, order.headCy - 44, 'N', { w: 44, delay: 1.3 });
    body += chip(cust.cx, cust.top - 34, 'entity', { icon: 'grid', delay: 0.8 });
    body += chip(order.cx, order.top - 34, 'entity', { icon: 'grid', delay: 0.9 });
    body += caption(VW / 2, 470, 'Chen (approximated): rectangles are entities, the diamond is the relationship, 1 / N give cardinality.', { delay: 1.5 });
    return assemble({ slug: 'modeling-notations', aria: 'Customer–Order in Chen notation', body, note: snap.note });
  }

  /* ── UML: classes joined by a line with multiplicity labels ──────────────── */
  if (view === 'uml') {
    const cust = tableCard(170, 150, { name: 'Customer', icon: 'app', tone: 'slate', cols: CUSTOMER_COLS, w: 250 });
    const order = tableCard(620, 178, { name: 'Order', icon: 'listOrdered', tone: 'slate', cols: ORDER_COLS, w: 250 });
    body += cust.svg + order.svg;
    body += connector({ x: cust.right, y: cust.rowCy(0), side: 'right' }, { x: order.left, y: order.rowCy(1), side: 'left' }, { delay: 0.6 }).svg;
    body += chip(cust.cx, cust.top - 34, '«class»', { delay: 0.8 });
    body += chip(order.cx, order.top - 34, '«class»', { delay: 0.9 });
    body += chip(cust.right + 56, cust.rowCy(0) - 30, '1', { w: 44, delay: 1.1 });
    body += chip(order.left - 56, order.rowCy(1) - 30, '0..*', { w: 56, delay: 1.2 });
    body += caption(VW / 2, 548, 'UML: each entity is a class; multiplicities 1 and 0..* sit at the line ends — a customer has zero or more orders.', { delay: 1.3 });
    return assemble({ slug: 'modeling-notations', aria: 'Customer–Order in UML class notation', body, note: snap.note });
  }

  /* ── compare: three mini-renditions of the same relationship ─────────────── */
  if (view === 'compare') {
    const cols = [
      { cx: 173, label: 'Chen', kind: 'chen' },
      { cx: 520, label: 'Crow’s-foot', kind: 'foot' },
      { cx: 867, label: 'UML', kind: 'uml' },
    ];
    cols.forEach((c, k) => {
      const d = k * 0.25;
      body += band(c.cx - 150, 120, 300, 300, c.label, { delay: d });
      const a = tableCard(c.cx - 130, 200, { name: 'Cust', icon: 'app', tone: 'accent', cols: [], w: 110, delay: d + 0.12 });
      const b = tableCard(c.cx + 20, 300, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: [], w: 110, delay: d + 0.2 });
      body += a.svg + b.svg;
      if (c.kind === 'chen') {
        body += connector({ x: a.right, y: a.headCy, side: 'right' }, { x: b.left, y: b.headCy, side: 'left' }, { delay: d + 0.35 }).svg;
        body += chip((a.right + b.left) / 2, (a.headCy + b.headCy) / 2, '◇', { w: 40, delay: d + 0.7 });
        body += caption(c.cx, 400, 'boxes · diamond · 1 / N', { delay: d + 0.8 });
      } else if (c.kind === 'foot') {
        body += connector({ x: a.right, y: a.headCy, side: 'right' }, { x: b.left, y: b.headCy, side: 'left' }, { from: 'one', to: 'many', delay: d + 0.35 }).svg;
        body += caption(c.cx, 400, 'tables · bar / foot', { delay: d + 0.8 });
      } else {
        body += connector({ x: a.right, y: a.headCy, side: 'right' }, { x: b.left, y: b.headCy, side: 'left' }, { delay: d + 0.35 }).svg;
        body += chip(a.right + 24, a.headCy - 22, '1', { w: 36, delay: d + 0.7 });
        body += chip(b.left - 24, b.headCy - 22, '0..*', { w: 52, delay: d + 0.8 });
        body += caption(c.cx, 400, 'classes · multiplicities', { delay: d + 0.9 });
      }
    });
    body += caption(VW / 2, 470, 'Same Customer–Order relationship, three notations — the marks differ, the relationship does not.', { delay: 1.1 });
    return assemble({ slug: 'modeling-notations', aria: 'One relationship in three notations side by side', body, note: snap.note });
  }

  /* ── overview / crowsfoot / recap: the crow's-foot model ─────────────────── */
  const cust = tableCard(170, 150, { name: 'Customer', icon: 'app', tone: 'accent', cols: CUSTOMER_COLS, w: 250 });
  const order = tableCard(620, 178, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: ORDER_COLS, w: 250 });
  body += cust.svg + order.svg;
  body += connector(
    { x: cust.right, y: cust.rowCy(0), side: 'right' },
    { x: order.left, y: order.rowCy(1), side: 'left' },
    { from: 'one', to: 'many', label: '1 : N', delay: 0.6 }).svg;

  if (view === 'recap') {
    const checks = ['Chen', 'Crow’s-foot', 'UML'];
    const gap = 212, startX = VW / 2 - (checks.length - 1) * gap / 2;
    checks.forEach((t, i) => { body += chip(startX + i * gap, 548, t, { icon: 'check', w: 176, delay: 1.0 + i * 0.1 }); });
    body += caption(VW / 2, 502, 'One model every notation agrees on — entities, relationship and cardinality under the marks.', { delay: 1.4 });
  } else {
    body += caption(VW / 2, 548, 'Customer places many Order — a 1:N relationship carried by the foreign key order.customer_id.', { delay: 1.1 });
  }
  return assemble({ slug: 'modeling-notations', aria: 'Customer and Order in crow’s-foot notation', body, note: snap.note });
}
