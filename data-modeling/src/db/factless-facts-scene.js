/* factless-facts-scene.js — the "Factless Fact Tables" scene, on the flat schema
   CANVAS (engine/schema2d.js). The hero visual is a fact card whose columns are ALL
   foreign keys with no measure, counted by an implied COUNT(*)=1; and a coverage
   fact set beside an event fact to surface "what did not happen".

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'no-measures', 'event', 'count', 'coverage', 'what-didnt-happen', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW, VH } from '../engine/schema2d.js';

/* event fact: all FKs, no measure */
const ATTENDANCE = [
  { name: 'student_key', type: 'int', fk: true },
  { name: 'class_key', type: 'int', fk: true },
  { name: 'date_key', type: 'int', fk: true },
];
/* coverage fact: eligibility, also all FKs */
const COVERAGE = [
  { name: 'product_key', type: 'int', fk: true },
  { name: 'store_key', type: 'int', fk: true },
  { name: 'week_key', type: 'int', fk: true },
];
const SALES = [
  { name: 'product_key', type: 'int', fk: true },
  { name: 'store_key', type: 'int', fk: true },
  { name: 'week_key', type: 'int', fk: true },
  { name: 'revenue', type: 'decimal' },
];

export function renderFactlessFactsScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── single event fact: no-measures / event / count ────────────────────── */
  if (view === 'no-measures' || view === 'event' || view === 'count') {
    const card = tableCard(395, 185, { name: 'fct_attendance', icon: 'database', tone: 'accent', cols: ATTENDANCE, w: 250 });
    body += card.svg;

    if (view === 'no-measures') {
      // show the missing measure row as a ghost slot beneath
      body += chip(card.right + 150, card.cy, 'no measure column', { icon: 'alert', iconVar: '--amber', w: 220, delay: 0.7 });
      body += connector(
        { x: card.right, y: card.cy, side: 'right' },
        { x: card.right + 36, y: card.cy, side: 'left' },
        { delay: 0.6, ghost: true }).svg;
      body += caption(card.cx, card.bottom + 44, 'Only foreign keys — student, class, date. There is no "how much" to store; the row itself is the fact.', { delay: 1.0 });
    } else if (view === 'event') {
      body += chip(card.cx, card.top - 30, 'one row = one event', { icon: 'bolt', iconVar: '--violet', w: 220, delay: 0.5 });
      body += caption(card.cx, card.bottom + 44, 'Student S attended class C on date D — who, what, when. The grain is one row per event.', { delay: 0.9 });
    } else {
      // count
      body += chip(card.right + 150, card.cy, 'COUNT(*) = 1', { icon: 'check', iconVar: '--green', w: 180, delay: 0.7 });
      body += connector(
        { x: card.right, y: card.cy, side: 'right' },
        { x: card.right + 50, y: card.cy, side: 'left' },
        { from: 'many', to: 'one', delay: 0.6 }).svg;
      body += caption(card.cx, card.bottom + 44, 'The measure is implied: an invisible 1 on every row. Counting rows is the only aggregation needed.', { delay: 1.0 });
    }
    return assemble({ slug: 'factless-facts', aria: 'A factless event fact of only foreign keys', body, note: snap.note });
  }

  /* ── coverage alone ────────────────────────────────────────────────────── */
  if (view === 'coverage') {
    const card = tableCard(395, 185, { name: 'fct_promo_coverage', icon: 'folder', tone: 'amber', cols: COVERAGE, w: 260 });
    body += card.svg;
    body += chip(card.cx, card.top - 30, 'what COULD happen', { icon: 'target', iconVar: '--amber', w: 230, delay: 0.5 });
    body += caption(card.cx, card.bottom + 44, 'One row per product-on-promotion per store per week — eligible combinations, sold or not.', { delay: 0.9 });
    return assemble({ slug: 'factless-facts', aria: 'A factless coverage fact of eligible combinations', body, note: snap.note });
  }

  /* ── coverage minus events: what-didnt-happen / recap ──────────────────── */
  const cov = tableCard(120, 175, { name: 'fct_promo_coverage', icon: 'folder', tone: 'amber', cols: COVERAGE, w: 260 });
  const sales = tableCard(660, 175, { name: 'fct_sales', icon: 'database', tone: 'accent', cols: SALES, w: 260 });
  body += cov.svg + sales.svg;
  body += chip(cov.cx, cov.top - 28, 'eligible', { icon: 'target', iconVar: '--amber', w: 130, delay: 0.5 });
  body += chip(sales.cx, sales.top - 28, 'actually sold', { icon: 'check', iconVar: '--green', w: 160, delay: 0.7 });
  body += connector(
    { x: cov.right, y: cov.cy, side: 'right' },
    { x: sales.left, y: sales.rowCy(0), side: 'left' },
    { label: 'coverage − events', delay: 0.9 }).svg;

  if (view === 'recap') {
    body += chip(VW / 2, 500, 'count rows', { icon: 'listOrdered', iconVar: '--green', w: 160, delay: 1.3 });
    body += chip(VW / 2 - 200, 500, 'events', { icon: 'bolt', iconVar: '--violet', w: 150, delay: 1.2 });
    body += chip(VW / 2 + 200, 500, 'coverage', { icon: 'folder', iconVar: '--amber', w: 160, delay: 1.4 });
    body += caption(VW / 2, 548, 'Keys, no measures — count the rows for what happened, subtract events from coverage for what didn’t.', { delay: 1.6 });
  } else {
    // what-didnt-happen
    body += chip(VW / 2, 500, 'sold NOTHING this week', { icon: 'search', iconVar: '--red', w: 280, delay: 1.3 });
    body += caption(VW / 2, 548, 'Coverage (eligible) minus events (sold) = the promotions that drew zero sales — the non-event made visible.', { delay: 1.5 });
  }
  return assemble({ slug: 'factless-facts', aria: 'A coverage fact set against an event fact to find non-events', body, note: snap.note });
}
