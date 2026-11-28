/* functional-dependencies-scene.js — the "Functional Dependencies" scene, on the
   flat schema CANVAS (engine/schema2d.js). An FD is drawn as a determinant row
   with a self-drawing connector fanning out to the attributes it settles; keys
   are the same arrow aimed at the whole row; the two villains (partial &
   transitive) are tinted rose on a composite-key card; closure grows as popping
   chips. Motion is CSS: cards rise, arrows draw on, chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'fd', 'key-fd', 'partial-transitive', 'closure', 'why', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

export function renderFunctionalDependenciesScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── fd: X → Y, a single determinant settling two attributes ───────────── */
  if (view === 'fd') {
    const cols = [
      { name: 'customer_id', type: 'int', key: true, hot: true },
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text' },
    ];
    const card = tableCard(180, 190, { name: 'Customer', icon: 'app', tone: 'accent', cols, w: 260 });
    body += card.svg;
    // determinant chip + an FD arrow to a {name, email} target chip
    body += chip(card.cx, card.top - 36, 'X → Y  (X determines Y)', { icon: 'key', iconVar: '--amber', w: 262, delay: 0.3 });
    const tx = card.right + 180;
    body += chip(tx, card.rowCy(1) + 16, '{ name, email }', { w: 190, delay: 0.9 });
    body += connector(
      { x: card.right, y: card.rowCy(0), side: 'right' },
      { x: tx - 95, y: card.rowCy(1) + 16, side: 'left' },
      { label: '→', delay: 0.6 }).svg;
    body += caption(VW / 2, card.bottom + 46, 'Fix customer_id and name and email are decided — the arrow is a rule about every possible row.', { delay: 1.1 });
    return assemble({ slug: 'functional-dependencies', aria: 'A functional dependency X determines Y', body, note: snap.note });
  }

  /* ── key-fd: the key fans out to every attribute ───────────────────────── */
  if (view === 'key-fd') {
    const cols = [
      { name: 'customer_id', type: 'int', key: true, hot: true },
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text' },
      { name: 'signup_date', type: 'date' },
    ];
    const card = tableCard(210, 150, { name: 'Customer', icon: 'app', tone: 'accent', cols, w: 270 });
    body += card.svg;
    // one FD arrow from the key row to each non-key attribute row
    [1, 2, 3].forEach((i, k) => {
      const tx = card.right + 150;
      body += connector(
        { x: card.right, y: card.rowCy(0), side: 'right' },
        { x: card.right, y: card.rowCy(i), side: 'right' },
        { delay: 0.5 + k * 0.12 }).svg;
      body += chip(tx, card.rowCy(i), ['name', 'email', 'signup_date'][k], { icon: 'check', w: 150, delay: 0.8 + k * 0.12 });
    });
    body += chip(card.cx, card.top - 34, 'customer_id → whole row', { icon: 'key', iconVar: '--amber', w: 232, delay: 0.3 });
    body += caption(VW / 2, card.bottom + 44, 'A superkey determines every other attribute. A candidate key is one with nothing to spare.', { delay: 1.3 });
    return assemble({ slug: 'functional-dependencies', aria: 'A key is an FD that determines the whole row', body, note: snap.note });
  }

  /* ── partial-transitive: the two villains, tinted on a composite key ────── */
  if (view === 'partial-transitive') {
    const cols = [
      { name: 'student_id', type: 'int', key: true },
      { name: 'course_id', type: 'int', key: true },
      { name: 'grade', type: 'char' },
      { name: 'course_title', type: 'text', hot: true },
      { name: 'instructor', type: 'text' },
      { name: 'instructor_email', type: 'text', hot: true },
    ];
    const card = tableCard(150, 90, { name: 'enrollments', icon: 'grid', tone: 'rose', cols, w: 280 });
    body += card.svg;
    body += chip(card.cx, card.top - 30, 'composite key — two villains hide here', { icon: 'alert', iconVar: '--red', w: 330, delay: 0.3 });
    // partial: course_title ← course_id (part of key)
    body += connector(
      { x: card.right, y: card.rowCy(1), side: 'right' },
      { x: card.right, y: card.rowCy(3), side: 'right' },
      { label: 'partial', delay: 0.7 }).svg;
    body += chip(card.right + 180, card.rowCy(3), 'course_id → title', { icon: 'alert', iconVar: '--red', w: 200, delay: 1.0 });
    // transitive: instructor_email ← instructor (non-key)
    body += connector(
      { x: card.right, y: card.rowCy(4), side: 'right' },
      { x: card.right, y: card.rowCy(5), side: 'right' },
      { label: 'transitive', delay: 0.9 }).svg;
    body += chip(card.right + 190, card.rowCy(5), 'instructor → email', { icon: 'alert', iconVar: '--red', w: 210, delay: 1.2 });
    body += caption(VW / 2, card.bottom + 40, 'Partial depends on part of the key; transitive depends through a non-key. Both store a fact against the wrong thing.', { delay: 1.4 });
    return assemble({ slug: 'functional-dependencies', aria: 'Partial and transitive dependencies tinted on a composite-key table', body, note: snap.note });
  }

  /* ── closure: grow {A}+ by applying FDs in turn ────────────────────────── */
  if (view === 'closure') {
    // the given FDs, as a stacked list on the left
    body += band(70, 150, 300, 230, 'Given FDs', { sub: 'three rules that hold on the table', delay: 0 });
    ['A → B', 'B → C', 'C → D'].forEach((t, i) => {
      body += chip(220, 212 + i * 52, t, { icon: 'merge', w: 150, delay: 0.3 + i * 0.12 });
    });
    // closure building up on the right
    body += caption(760, 180, 'Attribute closure of {A}', { delay: 0.6 });
    const steps = ['{A}', '{A, B}', '{A, B, C}', '{A, B, C, D}'];
    steps.forEach((t, i) => {
      body += chip(760, 226 + i * 52, t, { icon: i === steps.length - 1 ? 'check' : 'chevron', w: 170, delay: 0.9 + i * 0.18 });
    });
    // arrow linking FDs to the growing closure
    body += connector(
      { x: 370, y: 265, side: 'right' },
      { x: 675, y: 300, side: 'left' },
      { label: 'apply', delay: 1.0 }).svg;
    body += chip(760, 226 + steps.length * 52 + 8, 'A is a candidate key', { icon: 'key', iconVar: '--amber', w: 220, delay: 1.9 });
    body += caption(VW / 2, 560, 'Seed with A, keep applying FDs whose left side you hold. {A}⁺ reaches every attribute, so A is a key.', { delay: 2.1 });
    return assemble({ slug: 'functional-dependencies', aria: 'Attribute closure growing to reveal a candidate key', body, note: snap.note });
  }

  /* ── why: each normal form is one FD rule, as bands ────────────────────── */
  if (view === 'why') {
    const rows = [
      { label: '2NF', sub: 'no non-key attribute depends on PART of a key — no partial dependencies', tone: '--amber' },
      { label: '3NF', sub: 'no non-key attribute depends on the key THROUGH another non-key — no transitive dependencies', tone: '--violet' },
      { label: 'BCNF', sub: 'every determinant X of any FD X → Y is itself a key', tone: '--green' },
    ];
    rows.forEach((r, i) => {
      const y = 120 + i * 130;
      body += band(80, y, VW - 160, 104, r.label, { sub: r.sub, delay: i * 0.22 });
      body += chip(VW - 150, y + 52, ['no partial', 'no transitive', 'determinant = key'][i], { icon: 'check', w: 196, delay: 0.3 + i * 0.22 });
    });
    body += caption(VW / 2, 548, 'Each rung is one statement about which functional dependencies are allowed — nothing more.', { delay: 0.9 });
    return assemble({ slug: 'functional-dependencies', aria: 'The normal forms as rules about functional dependencies', body, note: snap.note });
  }

  /* ── recap: the FD card + the four ideas as checks ─────────────────────── */
  const cols = [
    { name: 'customer_id', type: 'int', key: true, hot: true },
    { name: 'name', type: 'text' },
    { name: 'email', type: 'text' },
  ];
  const card = tableCard(390, 150, { name: 'Customer', icon: 'app', tone: 'accent', cols, w: 260 });
  body += card.svg;
  body += connector(
    { x: card.right, y: card.rowCy(0), side: 'right' },
    { x: card.right, y: card.rowCy(1), side: 'right' },
    { label: '→', delay: 0.5 }).svg;
  body += connector(
    { x: card.right, y: card.rowCy(0), side: 'right' },
    { x: card.right, y: card.rowCy(2), side: 'right' },
    { delay: 0.6 }).svg;
  body += chip(card.cx, card.top - 34, 'X → Y', { icon: 'key', iconVar: '--amber', w: 120, delay: 0.3 });
  const checks = ['determines', 'keys are FDs', 'closure finds keys', 'every NF is an FD rule'];
  const gap = 230, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body += chip(startX + i * gap, 548, t, { icon: 'check', w: 200, delay: 1.0 + i * 0.1 }); });
  body += caption(VW / 2, 500, 'Determines · keys · partial & transitive · closure — the grammar every later lesson speaks.', { delay: 1.4 });
  return assemble({ slug: 'functional-dependencies', aria: 'Recap of functional dependencies', body, note: snap.note });
}
