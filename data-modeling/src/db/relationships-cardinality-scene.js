/* relationships-cardinality-scene.js — the "Relationships & Cardinality" scene,
   on the flat schema CANVAS (engine/schema2d.js). Relationships are self-drawing
   connectors whose crow's-foot / single-bar markers carry the cardinality: a bar
   means "one", a crow's-foot means "many". One-to-one draws a bar at each end,
   one-to-many a bar and a foot, many-to-many resolves into a central join card,
   and a unary relationship loops a connector from a card back to itself. Motion
   is CSS: cards rise, connectors draw, chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'setup', 'one-to-one', 'one-to-many', 'many-to-many',
   'participation', 'recap'. Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, caption, assemble, VW } from '../engine/schema2d.js';

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

export function renderRelationshipsCardinalityScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── setup: a relationship whose shape is unknown ──────────────────────── */
  if (view === 'setup') {
    const cust = tableCard(150, 200, { name: 'Customer', icon: 'app', tone: 'accent', cols: CUSTOMER_COLS, w: 250 });
    const order = tableCard(640, 200, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: ORDER_COLS, w: 250 });
    body += cust.svg + order.svg;
    body += connector(
      { x: cust.right, y: cust.rowCy(1), side: 'right' },
      { x: order.left, y: order.rowCy(1), side: 'left' },
      { label: 'places', delay: 0.7 }).svg;
    body += caption(VW / 2, 500, 'Customer places Order. The link exists — but how many of each side take part? That count is its cardinality.', { delay: 1.1 });
    return assemble({ slug: 'relationships-cardinality', aria: 'Two entities joined by an uncounted relationship', body, note: snap.note });
  }

  /* ── one-to-one ────────────────────────────────────────────────────────── */
  if (view === 'one-to-one') {
    const cust = tableCard(150, 200, { name: 'Customer', icon: 'app', tone: 'accent', cols: CUSTOMER_COLS, w: 250 });
    const card = tableCard(640, 200, {
      name: 'LoyaltyCard', icon: 'target', tone: 'green', w: 250,
      cols: [
        { name: 'card_id', type: 'int', key: true },
        { name: 'customer_id', type: 'int · unique', fk: true },
        { name: 'points', type: 'int' },
      ],
    });
    body += cust.svg + card.svg;
    body += connector(
      { x: cust.right, y: cust.rowCy(0), side: 'right' },
      { x: card.left, y: card.rowCy(1), side: 'left' },
      { from: 'one', to: 'one', label: '1 : 1', delay: 0.7 }).svg;
    body += caption(VW / 2, 500, 'A single bar at each end. One customer, one loyalty card — a foreign key made exclusive by a UNIQUE constraint.', { delay: 1.1 });
    return assemble({ slug: 'relationships-cardinality', aria: 'A one-to-one relationship', body, note: snap.note });
  }

  /* ── one-to-many ───────────────────────────────────────────────────────── */
  if (view === 'one-to-many') {
    const cust = tableCard(150, 200, { name: 'Customer', icon: 'app', tone: 'accent', cols: CUSTOMER_COLS, w: 250 });
    const order = tableCard(640, 200, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: ORDER_COLS, w: 250 });
    body += cust.svg + order.svg;
    body += connector(
      { x: cust.right, y: cust.rowCy(0), side: 'right' },
      { x: order.left, y: order.rowCy(1), side: 'left' },
      { from: 'one', to: 'many', label: '1 : N', delay: 0.7 }).svg;
    body += caption(VW / 2, 500, 'A bar at Customer, a crow’s-foot at Order. One customer, many orders — and the foreign key lives on the many side.', { delay: 1.1 });
    return assemble({ slug: 'relationships-cardinality', aria: 'A one-to-many relationship', body, note: snap.note });
  }

  /* ── many-to-many → join entity ────────────────────────────────────────── */
  if (view === 'many-to-many') {
    const student = tableCard(90, 150, {
      name: 'Student', icon: 'app', tone: 'accent', w: 230,
      cols: [{ name: 'student_id', type: 'int', key: true }, { name: 'name', type: 'text' }],
    });
    const course = tableCard(720, 150, {
      name: 'Course', icon: 'book', tone: 'violet', w: 230, delay: 0.2,
      cols: [{ name: 'course_id', type: 'int', key: true }, { name: 'title', type: 'text' }],
    });
    const enr = tableCard(405, 330, {
      name: 'Enrollment', icon: 'merge', tone: 'amber', w: 230, delay: 0.5,
      cols: [
        { name: 'student_id', type: 'int', fk: true },
        { name: 'course_id', type: 'int', fk: true },
        { name: 'grade', type: 'text' },
      ],
    });
    body += student.svg + course.svg + enr.svg;
    body += connector(
      { x: student.right, y: student.rowCy(0), side: 'right' },
      { x: enr.left, y: enr.rowCy(0), side: 'left' },
      { from: 'one', to: 'many', label: '1 : N', delay: 0.9 }).svg;
    body += connector(
      { x: course.left, y: course.rowCy(0), side: 'left' },
      { x: enr.right, y: enr.rowCy(1), side: 'right' },
      { from: 'one', to: 'many', label: '1 : N', delay: 1.05 }).svg;
    body += caption(VW / 2, 548, 'Student N:M Course becomes two 1:N links through Enrollment — one row per student per course, home to grade.', { delay: 1.4 });
    return assemble({ slug: 'relationships-cardinality', aria: 'A many-to-many relationship resolved by a join entity', body, note: snap.note });
  }

  /* ── participation & degree ────────────────────────────────────────────── */
  if (view === 'participation') {
    // unary self-relationship: Employee manages Employee
    const emp = tableCard(330, 175, {
      name: 'Employee', icon: 'app', tone: 'accent', w: 300,
      cols: [
        { name: 'employee_id', type: 'int', key: true },
        { name: 'name', type: 'text' },
        { name: 'manager_id', type: 'int · null', fk: true },
      ],
    });
    body += emp.svg;
    // loop from manager_id (many: reports) back to employee_id (one: manager)
    body += connector(
      { x: emp.right, y: emp.rowCy(2), side: 'right' },
      { x: emp.right, y: emp.rowCy(0), side: 'right' },
      { from: 'many', to: 'one', label: 'manages', delay: 0.7 }).svg;
    body += chip(emp.cx, emp.top - 34, 'unary · self-relationship', { icon: 'merge', w: 248, delay: 0.5 });
    // participation chips
    body += chip(VW / 2 - 160, 500, 'total — must take part', { icon: 'check', iconVar: '--green', w: 236, delay: 1.0 });
    body += chip(VW / 2 + 160, 500, 'partial — may take part', { icon: 'alert', w: 236, delay: 1.15 });
    body += caption(VW / 2, 548, 'manager_id is a foreign key back into Employee — a unary link. Total participation is NOT NULL; partial allows a null.', { delay: 1.4 });
    return assemble({ slug: 'relationships-cardinality', aria: 'Participation and a unary self-relationship', body, note: snap.note });
  }

  /* ── recap ─────────────────────────────────────────────────────────────── */
  const cust = tableCard(150, 180, { name: 'Customer', icon: 'app', tone: 'accent', cols: CUSTOMER_COLS, w: 250 });
  const order = tableCard(640, 180, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: ORDER_COLS, w: 250 });
  body += cust.svg + order.svg;
  body += connector(
    { x: cust.right, y: cust.rowCy(0), side: 'right' },
    { x: order.left, y: order.rowCy(1), side: 'left' },
    { from: 'one', to: 'many', label: '1 : N', delay: 0.7 }).svg;
  const checks = ['1:1', '1:N', 'N:M'];
  const gap = 230, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body += chip(startX + i * gap, 548, t, { icon: 'check', w: 150, delay: 1.0 + i * 0.1 }); });
  body += caption(VW / 2, 500, 'Three shapes, counted on both sides — refine with participation and degree and the keys follow on their own.', { delay: 1.3 });
  return assemble({ slug: 'relationships-cardinality', aria: 'The relationship shapes, counted on both sides', body, note: snap.note });
}
