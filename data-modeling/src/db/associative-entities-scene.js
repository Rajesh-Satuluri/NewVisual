/* associative-entities-scene.js — the "Associative Entities" scene, on the flat
   schema CANVAS (engine/schema2d.js). The arc is one shape changing: a plain
   Student–Course many-to-many with homeless attributes, the relationship
   promoted to an Enrollment box, its composite key, its own outward
   relationships, and a recap. Motion is CSS: cards rise, connectors draw, chips
   pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'problem', 'promote', 'key', 'relates', 'lifecycle', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, caption, assemble, VW } from '../engine/schema2d.js';

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
  { name: 'grade', type: 'char' },
  { name: 'enrolled_at', type: 'date' },
];

function studentCourse(body, studY = 150, courseY = 200) {
  const stud = tableCard(90, studY, { name: 'Student', icon: 'app', tone: 'accent', cols: STUDENT_COLS, w: 210 });
  const course = tableCard(740, courseY, { name: 'Course', icon: 'book', tone: 'green', cols: COURSE_COLS, w: 210 });
  return { stud, course, svg: stud.svg + course.svg };
}

export function renderAssociativeEntitiesScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── problem: a plain M:N with homeless attributes ─────────────────────── */
  if (view === 'problem') {
    const sc = studentCourse(body, 200, 200);
    body += sc.svg;
    body += connector(
      { x: sc.stud.right, y: sc.stud.rowCy(0), side: 'right' },
      { x: sc.course.left, y: sc.course.rowCy(0), side: 'left' },
      { from: 'many', to: 'many', label: 'N : M', delay: 0.6 }).svg;
    body += chip(VW / 2, 330, 'grade?  enrolled_at?', { icon: 'alert', iconVar: '--red', w: 220, delay: 1.0 });
    body += caption(VW / 2, 500, 'The grade depends on both sides at once — it fits on neither Student nor Course.', { delay: 1.2 });
    return assemble({ slug: 'associative-entities', aria: 'A many-to-many with attributes that have no home', body, note: snap.note });
  }

  /* ── promote: the Enrollment entity appears between them ────────────────── */
  if (view === 'promote') {
    const sc = studentCourse(body, 210, 210);
    const enr = tableCard(405, 180, { name: 'Enrollment', icon: 'merge', tone: 'amber', cols: ENROLL_COLS, w: 230, delay: 0.35 });
    body += sc.svg + enr.svg;
    body += connector(
      { x: sc.stud.right, y: sc.stud.rowCy(0), side: 'right' },
      { x: enr.left, y: enr.rowCy(0), side: 'left' },
      { from: 'one', to: 'many', delay: 0.7 }).svg;
    body += connector(
      { x: sc.course.left, y: sc.course.rowCy(0), side: 'left' },
      { x: enr.right, y: enr.rowCy(1), side: 'right' },
      { from: 'one', to: 'many', delay: 0.9 }).svg;
    body += chip(enr.cx, enr.top - 36, 'associative entity', { icon: 'grid', delay: 1.1 });
    body += caption(VW / 2, 540, 'The relationship becomes a box: Enrollment holds grade and enrolled_at.', { delay: 1.3 });
    return assemble({ slug: 'associative-entities', aria: 'The relationship promoted to an Enrollment entity', body, note: snap.note });
  }

  /* ── key: the composite primary key ────────────────────────────────────── */
  if (view === 'key') {
    const enr = tableCard(395, 170, { name: 'Enrollment', icon: 'merge', tone: 'amber', cols: ENROLL_COLS.map((c, i) => ({ ...c, hot: i < 2 })), w: 250 });
    body += enr.svg;
    body += chip(enr.right + 170, enr.rowCy(0), 'composite', { icon: 'key', iconVar: '--amber', w: 150, delay: 0.7 });
    body += connector(
      { x: enr.right, y: enr.rowCy(0), side: 'right' },
      { x: enr.right + 24, y: enr.rowCy(0), side: 'left' }, { delay: 0.6, ghost: true }).svg;
    body += connector(
      { x: enr.right, y: enr.rowCy(1), side: 'right' },
      { x: enr.right + 24, y: enr.rowCy(1), side: 'left' }, { delay: 0.7, ghost: true }).svg;
    body += chip(enr.cx, enr.bottom + 36, 'PK (student_id, course_id)', { icon: 'key', iconVar: '--amber', w: 256, delay: 1.0 });
    body += caption(VW / 2, 520, 'The pair identifies the row — one enrolment per (student, course), or a surrogate id.', { delay: 1.2 });
    return assemble({ slug: 'associative-entities', aria: 'The composite key of the associative entity', body, note: snap.note });
  }

  /* ── relates: the associative entity points outward ────────────────────── */
  if (view === 'relates') {
    const stud = tableCard(90, 120, { name: 'Student', icon: 'app', tone: 'accent', cols: STUDENT_COLS, w: 200 });
    const enr = tableCard(400, 130, { name: 'Enrollment', icon: 'merge', tone: 'amber', cols: ENROLL_COLS, w: 240 });
    const course = tableCard(760, 120, { name: 'Course', icon: 'book', tone: 'green', cols: COURSE_COLS, w: 190 });
    const pay = tableCard(400, 400, { name: 'Payment', icon: 'scale', tone: 'violet', cols: [
      { name: 'payment_id', type: 'int', key: true },
      { name: 'enrollment_id', type: 'int', fk: true, hot: true },
      { name: 'amount', type: 'decimal' },
    ], w: 240, delay: 0.3 });
    body += stud.svg + enr.svg + course.svg + pay.svg;
    body += connector(
      { x: stud.right, y: stud.rowCy(0), side: 'right' },
      { x: enr.left, y: enr.rowCy(0), side: 'left' },
      { from: 'one', to: 'many', delay: 0.6 }).svg;
    body += connector(
      { x: course.left, y: course.rowCy(0), side: 'left' },
      { x: enr.right, y: enr.rowCy(1), side: 'right' },
      { from: 'one', to: 'many', delay: 0.7 }).svg;
    body += connector(
      { x: enr.cx, y: enr.bottom, side: 'right' },
      { x: pay.cx, y: pay.top, side: 'left' },
      { from: 'one', to: 'many', delay: 0.9 }).svg;
    body += caption(VW / 2, 560, 'Enrollment is a real entity: it can own relationships of its own, out to Payment.', { delay: 1.2 });
    return assemble({ slug: 'associative-entities', aria: 'The associative entity with its own outward relationship', body, note: snap.note });
  }

  /* ── lifecycle: identity + lifecycle makes it an entity ────────────────── */
  if (view === 'lifecycle') {
    const enr = tableCard(395, 150, { name: 'Enrollment', icon: 'merge', tone: 'amber', cols: ENROLL_COLS, w: 250 });
    body += enr.svg;
    const stages = ['created', 'graded', 'withdrawn'];
    const gap = 230, startX = VW / 2 - (stages.length - 1) * gap / 2;
    stages.forEach((t, i) => {
      body += chip(startX + i * gap, 430, t, { icon: 'clock', delay: 0.8 + i * 0.15, w: 150 });
      if (i < stages.length - 1) {
        body += connector(
          { x: startX + i * gap + 75, y: 430, side: 'right' },
          { x: startX + (i + 1) * gap - 75, y: 430, side: 'left' },
          { to: 'many', delay: 1.0 + i * 0.15 }).svg;
      }
    });
    body += caption(VW / 2, 510, 'It is created, graded, perhaps withdrawn — its own identity and lifecycle. That makes it an entity.', { delay: 1.5 });
    return assemble({ slug: 'associative-entities', aria: 'The associative entity has its own lifecycle', body, note: snap.note });
  }

  /* ── recap: Student–Enrollment–Course + checks ─────────────────────────── */
  const stud = tableCard(90, 160, { name: 'Student', icon: 'app', tone: 'accent', cols: STUDENT_COLS, w: 200 });
  const enr = tableCard(400, 150, { name: 'Enrollment', icon: 'merge', tone: 'amber', cols: ENROLL_COLS, w: 240 });
  const course = tableCard(760, 160, { name: 'Course', icon: 'book', tone: 'green', cols: COURSE_COLS, w: 190 });
  body += stud.svg + enr.svg + course.svg;
  body += connector(
    { x: stud.right, y: stud.rowCy(0), side: 'right' },
    { x: enr.left, y: enr.rowCy(0), side: 'left' },
    { from: 'one', to: 'many', delay: 0.6 }).svg;
  body += connector(
    { x: course.left, y: course.rowCy(0), side: 'left' },
    { x: enr.right, y: enr.rowCy(1), side: 'right' },
    { from: 'one', to: 'many', delay: 0.8 }).svg;
  const checks = ['M:N + attributes', 'promote to entity', 'composite key'];
  const gap = 262, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body += chip(startX + i * gap, 548, t, { icon: 'check', w: 212, delay: 1.1 + i * 0.1 }); });
  body += caption(VW / 2, 500, 'A pairing that carries facts is an entity between the two sides it joins.', { delay: 1.4 });
  return assemble({ slug: 'associative-entities', aria: 'The associative entity pattern, summarised', body, note: snap.note });
}
