/* bcnf-scene.js — the "Boyce–Codd Normal Form" scene, on the flat schema CANVAS
   (engine/schema2d.js). Hero visual is DECOMPOSITION: a teaching table with
   overlapping candidate keys where instructor → course (a non-key determinant,
   tinted rose + an alert chip), split into teaches(instructor → course) and
   enrolment(student, instructor) joined by a foreign-key connector.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'table', 'problem', 'rule', 'bcnf', 'tradeoff', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

/* the all-key teaching table — every column is part of some candidate key. */
const TEACHING = [
  { name: 'student', type: 'text', key: true },
  { name: 'course', type: 'text', key: true },
  { name: 'instructor', type: 'text' },
];
/* decomposed: the determinant gets its own table and becomes the key. */
const TEACHES = [
  { name: 'instructor', type: 'text', key: true },
  { name: 'course', type: 'text' },
];
const ENROLMENT = [
  { name: 'student', type: 'text', key: true },
  { name: 'instructor', type: 'text', fk: true },
];

export function renderBcnfScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── single-table views: table / problem ───────────────────────────────── */
  if (view === 'table' || view === 'problem') {
    const problem = view === 'problem';
    // in problem view, tint the instructor row (the non-key determinant's target
    // of trouble) and the course it determines.
    const cols = TEACHING.map((c, i) => ({ ...c, hot: problem && (i === 1 || i === 2) }));
    const x = 330, y = 170, w = 300;
    const card = tableCard(x, y, { name: 'teaching', icon: 'book', tone: problem ? 'rose' : 'accent', cols, w });
    body += card.svg;

    if (problem) {
      body += chip(card.right + 158, card.rowCy(2), 'determinant, not a key', { icon: 'alert', iconVar: '--red', w: 236, delay: 0.7 });
      // show the offending dependency as a ghost arrow instructor → course
      body += connector(
        { x: card.right, y: card.rowCy(2), side: 'right' },
        { x: card.right, y: card.rowCy(1), side: 'right' },
        { delay: 0.5, ghost: true, label: 'instructor → course' }).svg;
      body += caption(card.cx, card.bottom + 44, 'instructor → course, yet instructor is not a candidate key — so the pair repeats on every student row.', { delay: 0.95 });
    } else {
      body += chip(card.left - 150, card.rowCy(0), '(student, course)', { icon: 'key', iconVar: '--amber', w: 184, delay: 0.6 });
      body += chip(card.left - 150, card.rowCy(2), '(student, instructor)', { icon: 'key', iconVar: '--amber', w: 204, delay: 0.75 });
      body += caption(card.cx, card.bottom + 44, 'Two overlapping candidate keys share student — so every column is prime, and the table is already in 3NF.', { delay: 0.95 });
    }
    return assemble({ slug: 'bcnf', aria: 'A teaching table with overlapping candidate keys', body, note: snap.note });
  }

  /* ── decomposition views: bcnf / tradeoff / recap ──────────────────────── */
  if (view === 'bcnf' || view === 'tradeoff' || view === 'recap') {
    const enrol = tableCard(150, 200, { name: 'enrolment', icon: 'listOrdered', tone: 'accent', cols: ENROLMENT, w: 250 });
    const teaches = tableCard(630, 200, { name: 'teaches', icon: 'book', tone: 'green', cols: TEACHES, w: 250 });
    body += enrol.svg + teaches.svg;

    // many enrolments → one instructor, carried by the FK on instructor
    body += connector(
      { x: enrol.right, y: enrol.rowCy(1), side: 'right' },
      { x: teaches.left, y: teaches.rowCy(0), side: 'left' },
      { from: 'many', to: 'one', label: 'N : 1', delay: 0.7 }).svg;

    if (view === 'recap') {
      body += chip(enrol.cx, 420, 'every determinant a key', { icon: 'check', iconVar: '--green', w: 220, delay: 1.1 });
      body += chip(teaches.cx, 420, 'instructor → course', { icon: 'check', iconVar: '--green', w: 200, delay: 1.2 });
      body += caption(VW / 2, 500, 'teaches keys on instructor, enrolment keys on student — no non-key determinant remains. BCNF reached.', { delay: 1.5 });
    } else if (view === 'tradeoff') {
      body += chip(VW / 2, 420, '(student, course) → instructor now spans both tables', { icon: 'alert', iconVar: '--amber', w: 404, delay: 1.0 });
      body += caption(VW / 2, 500, 'BCNF removes the last redundancy — but this dependency is no longer checkable in one table. Sometimes 3NF is kept.', { delay: 1.3 });
    } else {
      body += caption(VW / 2, 480, 'instructor → course gets its own table, so the determinant becomes the key. The join on instructor is lossless.', { delay: 1.2 });
    }
    return assemble({ slug: 'bcnf', aria: 'teaching decomposed into enrolment and teaches by a foreign key', body, note: snap.note });
  }

  /* ── rule view: every determinant must be a candidate key ──────────────── */
  const TESTS = [
    { y: 110, x: '(student, course)', arrow: '→  instructor, …', verdict: 'is a candidate key', ok: true },
    { y: 290, x: 'instructor', arrow: '→  course', verdict: 'is NOT a candidate key', ok: false },
  ];
  body += band(90, 40, VW - 180, 56, 'BCNF — for every X → Y, X must be a candidate key', { sub: 'the stricter clause 3NF almost reaches', delay: 0 });
  TESTS.forEach((t, k) => {
    const d = 0.3 + k * 0.3;
    body += band(90, t.y, VW - 180, 150, `${t.x}   ${t.arrow}`, { sub: t.ok ? 'determinant identifies the row' : 'determinant cannot identify the row — the defect', delay: d });
    body += chip(VW - 200, t.y + 75, t.verdict, {
      icon: t.ok ? 'check' : 'alert',
      iconVar: t.ok ? '--green' : '--red',
      w: t.ok ? 192 : 224, delay: d + 0.25,
    });
  });
  body += caption(VW / 2, 540, 'One failing dependency is enough: instructor → course with instructor no key means the table fails BCNF.', { delay: 1.1 });
  return assemble({ slug: 'bcnf', aria: 'The BCNF determinant test', body, note: snap.note });
}
