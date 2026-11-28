/* er-to-relational-scene.js — the "ER → Relational Mapping" scene, on the flat
   schema CANVAS (engine/schema2d.js). Each step shows one mapping rule in
   action: an entity turning into a table, a 1:N turning into a foreign key, an
   N:M resolving into a join table, a 1:1 offering merge-or-unique-FK, and a
   recap that checks the rules off. Motion is CSS: cards rise, connectors draw,
   chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'overview', 'entity-table', 'one-to-many', 'many-to-many',
   'one-to-one', 'recap'. Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, caption, assemble, VW } from '../engine/schema2d.js';

const CUSTOMER_COLS = [
  { name: 'customer_id', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'email', type: 'text' },
];
const ORDER_COLS = [
  { name: 'order_id', type: 'int', key: true },
  { name: 'customer_id', type: 'int', fk: true },
  { name: 'placed_at', type: 'timestamp' },
];
const STUDENT_COLS = [
  { name: 'student_id', type: 'int', key: true },
  { name: 'name', type: 'text' },
];
const COURSE_COLS = [
  { name: 'course_id', type: 'int', key: true },
  { name: 'title', type: 'text' },
];
const ENROLL_COLS = [
  { name: 'student_id', type: 'int', key: true, fk: true },
  { name: 'course_id', type: 'int', key: true, fk: true },
  { name: 'enrolled_at', type: 'date' },
];

export function renderErToRelationalScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── overview: an ER pair, before mapping ──────────────────────────────── */
  if (view === 'overview') {
    const cust = tableCard(150, 180, { name: 'Customer', icon: 'app', tone: 'accent', cols: [
      { name: 'customer_id', ghost: true }, { name: 'name', ghost: true }, { name: 'email', ghost: true },
    ], w: 230 });
    const order = tableCard(660, 208, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: [
      { name: 'order_id', ghost: true }, { name: 'placed_at', ghost: true }, { name: 'total', ghost: true },
    ], w: 230 });
    body += cust.svg + order.svg;
    body += connector(
      { x: cust.right, y: cust.rowCy(0), side: 'right' },
      { x: order.left, y: order.rowCy(1), side: 'left' },
      { from: 'one', to: 'many', label: 'places', delay: 0.6 }).svg;
    body += chip(cust.cx, cust.top - 36, 'ER entities', { icon: 'grid', delay: 0.9 });
    body += caption(VW / 2, 500, 'An ER diagram: boxes, a line, a cardinality. The rules below turn it into tables.', { delay: 1.1 });
    return assemble({ slug: 'er-to-relational', aria: 'An ER pair awaiting mapping', body, note: snap.note });
  }

  /* ── entity-table: one entity becomes one table ────────────────────────── */
  if (view === 'entity-table') {
    const ent = tableCard(120, 200, { name: 'Customer', icon: 'app', tone: 'slate', cols: [
      { name: 'customer_id', ghost: true }, { name: 'name', ghost: true }, { name: 'email', ghost: true },
    ], w: 230 });
    const tbl = tableCard(630, 190, { name: 'customers', icon: 'grid', tone: 'accent', cols: CUSTOMER_COLS, w: 260, delay: 0.3 });
    body += ent.svg + tbl.svg;
    body += chip(ent.cx, ent.top - 36, 'entity', { icon: 'grid', delay: 0.5 });
    body += chip(tbl.cx, tbl.top - 36, 'table', { icon: 'database', delay: 0.7 });
    body += connector(
      { x: ent.right, y: ent.headCy, side: 'right' },
      { x: tbl.left, y: tbl.headCy, side: 'left' },
      { label: 'maps to', delay: 0.6 }).svg;
    body += caption(VW / 2, 500, 'Attributes become typed columns; the identifier becomes the primary key.', { delay: 1.0 });
    return assemble({ slug: 'er-to-relational', aria: 'One entity mapped to one table', body, note: snap.note });
  }

  /* ── one-to-many: the FK lives on the many side ────────────────────────── */
  if (view === 'one-to-many') {
    const cust = tableCard(150, 170, { name: 'customers', icon: 'grid', tone: 'accent', cols: CUSTOMER_COLS, w: 250 });
    const order = tableCard(640, 200, { name: 'orders', icon: 'listOrdered', tone: 'violet', cols: ORDER_COLS.map((c, i) => ({ ...c, hot: i === 1 })), w: 250 });
    body += cust.svg + order.svg;
    body += connector(
      { x: cust.right, y: cust.rowCy(0), side: 'right' },
      { x: order.left, y: order.rowCy(1), side: 'left' },
      { from: 'one', to: 'many', label: '1 : N', delay: 0.6 }).svg;
    body += chip(order.cx, order.bottom + 34, 'FK on the many side', { icon: 'key', iconVar: '--amber', w: 208, delay: 1.0 });
    body += caption(VW / 2, 548, 'orders.customer_id → customers.customer_id — the foreign key carries the 1:N.', { delay: 1.2 });
    return assemble({ slug: 'er-to-relational', aria: 'A one-to-many relationship as a foreign key', body, note: snap.note });
  }

  /* ── many-to-many: two 1:N edges into a join table ─────────────────────── */
  if (view === 'many-to-many') {
    const stud = tableCard(90, 200, { name: 'students', icon: 'app', tone: 'accent', cols: STUDENT_COLS, w: 210 });
    const join = tableCard(415, 180, { name: 'enrollments', icon: 'merge', tone: 'amber', cols: ENROLL_COLS, w: 230, delay: 0.25 });
    const course = tableCard(740, 200, { name: 'courses', icon: 'book', tone: 'green', cols: COURSE_COLS, w: 210 });
    body += stud.svg + join.svg + course.svg;
    body += connector(
      { x: stud.right, y: stud.rowCy(0), side: 'right' },
      { x: join.left, y: join.rowCy(0), side: 'left' },
      { from: 'one', to: 'many', delay: 0.6 }).svg;
    body += connector(
      { x: course.left, y: course.rowCy(0), side: 'left' },
      { x: join.right, y: join.rowCy(1), side: 'right' },
      { from: 'one', to: 'many', delay: 0.8 }).svg;
    body += chip(join.cx, join.bottom + 34, 'composite PK', { icon: 'key', iconVar: '--amber', w: 164, delay: 1.2 });
    body += caption(VW / 2, 548, 'students N:M courses becomes enrollments — two FKs whose pair is the primary key.', { delay: 1.4 });
    return assemble({ slug: 'er-to-relational', aria: 'A many-to-many resolved into a join table', body, note: snap.note });
  }

  /* ── one-to-one: merge or a unique FK ──────────────────────────────────── */
  if (view === 'one-to-one') {
    const user = tableCard(150, 200, { name: 'users', icon: 'app', tone: 'accent', cols: [
      { name: 'user_id', type: 'int', key: true },
      { name: 'email', type: 'text' },
    ], w: 250 });
    const profile = tableCard(640, 200, { name: 'profiles', icon: 'file', tone: 'violet', cols: [
      { name: 'profile_id', type: 'int', key: true },
      { name: 'user_id', type: 'int', fk: true, hot: true },
      { name: 'bio', type: 'text' },
    ], w: 250 });
    body += user.svg + profile.svg;
    body += connector(
      { x: user.right, y: user.rowCy(0), side: 'right' },
      { x: profile.left, y: profile.rowCy(1), side: 'left' },
      { from: 'one', to: 'one', label: '1 : 1', delay: 0.6 }).svg;
    body += chip(user.cx, user.bottom + 36, 'option A: merge', { icon: 'merge', w: 176, delay: 1.0 });
    body += chip(profile.cx, profile.bottom + 36, 'option B: UNIQUE FK', { icon: 'key', iconVar: '--amber', w: 204, delay: 1.1 });
    body += caption(VW / 2, 548, 'Merge both into one table, or keep them apart with a UNIQUE foreign key.', { delay: 1.3 });
    return assemble({ slug: 'er-to-relational', aria: 'A one-to-one mapped by merge or unique foreign key', body, note: snap.note });
  }

  /* ── recap: worked example + checked rules ─────────────────────────────── */
  const cust = tableCard(150, 150, { name: 'customers', icon: 'grid', tone: 'accent', cols: CUSTOMER_COLS, w: 250 });
  const order = tableCard(640, 178, { name: 'orders', icon: 'listOrdered', tone: 'violet', cols: ORDER_COLS, w: 250 });
  body += cust.svg + order.svg;
  body += connector(
    { x: cust.right, y: cust.rowCy(0), side: 'right' },
    { x: order.left, y: order.rowCy(1), side: 'left' },
    { from: 'one', to: 'many', label: '1 : N', delay: 0.6 }).svg;
  const checks = ['entity→table', '1:N→FK', 'N:M→join'];
  const gap = 262, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body += chip(startX + i * gap, 548, t, { icon: 'check', w: 196, delay: 1.0 + i * 0.1 }); });
  body += caption(VW / 2, 500, 'Apply the entity rule to every box, the relationship rules to every line.', { delay: 1.4 });
  return assemble({ slug: 'er-to-relational', aria: 'The mapping rules checked against an example', body, note: snap.note });
}
