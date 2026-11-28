/* role-playing-dimensions-scene.js — the "Role-Playing Dimensions" scene, on the
   flat schema CANVAS (engine/schema2d.js). The hero visual is ONE dim_date reached
   by THREE foreign keys of a single fact, each a different role, later surfaced as
   three aliased views.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'three-dates', 'one-dim', 'aliases', 'query', 'recap-join', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

/* the fact: three date foreign keys, each a role */
const FCT_ORDERS = [
  { name: 'order_id', type: 'int', key: true },
  { name: 'order_date_key', type: 'int', fk: true },
  { name: 'ship_date_key', type: 'int', fk: true },
  { name: 'due_date_key', type: 'int', fk: true },
  { name: 'amount', type: 'decimal' },
];
/* the one calendar */
const DIM_DATE = [
  { name: 'date_key', type: 'int', key: true },
  { name: 'full_date', type: 'date' },
  { name: 'month', type: 'text' },
  { name: 'quarter', type: 'text' },
  { name: 'is_holiday', type: 'bool' },
];
const ROLES = [
  { fk: 'order_date_key', idx: 1, lbl: 'order', view: 'dim_order_date' },
  { fk: 'ship_date_key', idx: 2, lbl: 'ship', view: 'dim_ship_date' },
  { fk: 'due_date_key', idx: 3, lbl: 'due', view: 'dim_due_date' },
];

export function renderRolePlayingDimensionsScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── fact alone, highlighting its three dates ──────────────────────────── */
  if (view === 'three-dates') {
    const cols = FCT_ORDERS.map((c, i) => ({ ...c, hot: i >= 1 && i <= 3 }));
    const card = tableCard(395, 170, { name: 'fct_orders', icon: 'database', tone: 'violet', cols, w: 250 });
    body += card.svg;
    ['order', 'ship', 'due'].forEach((t, i) => {
      body += chip(card.right + 150, card.rowCy(i + 1), `${t} date`, { icon: 'clock', iconVar: '--amber', w: 150, delay: 0.6 + i * 0.14 });
      body += connector(
        { x: card.right, y: card.rowCy(i + 1), side: 'right' },
        { x: card.right + 40, y: card.rowCy(i + 1), side: 'left' },
        { delay: 0.5 + i * 0.14, ghost: true }).svg;
    });
    body += caption(card.cx, card.bottom + 44, 'One order row names three moments — placed, shipped, promised — each a real calendar date.', { delay: 1.1 });
    return assemble({ slug: 'role-playing-dimensions', aria: 'A fact table carrying three date columns', body, note: snap.note });
  }

  /* ── the anti-pattern: three identical calendar tables ─────────────────── */
  if (view === 'one-dim') {
    const names = ['dim_order_date', 'dim_ship_date', 'dim_due_date'];
    const cols = DIM_DATE.slice(0, 4);
    names.forEach((n, i) => {
      const card = tableCard(60 + i * 330, 150, { name: n, icon: 'clock', tone: 'rose', cols, w: 300 });
      body += card.svg;
    });
    body += chip(VW / 2, 470, 'same rows, tripled', { icon: 'alert', iconVar: '--red', w: 200, delay: 0.9 });
    body += caption(VW / 2, 528, 'Three copies of one calendar — identical rows, tripled storage, three places for a holiday flag to drift.', { delay: 1.1 });
    return assemble({ slug: 'role-playing-dimensions', aria: 'Three identical calendar tables', body, note: snap.note });
  }

  /* ── star-ish views: one dim_date reached by three FKs ─────────────────── */
  const fact = tableCard(120, 190, { name: 'fct_orders', icon: 'database', tone: 'violet', cols: FCT_ORDERS, w: 250 });
  const dim = tableCard(690, 196, { name: 'dim_date', icon: 'clock', tone: 'accent', cols: DIM_DATE, w: 250 });
  body += fact.svg + dim.svg;

  ROLES.forEach((r, i) => {
    body += connector(
      { x: fact.right, y: fact.rowCy(r.idx), side: 'right' },
      { x: dim.left, y: dim.rowCy(0), side: 'left' },
      { from: 'many', to: 'one', label: r.lbl, delay: 0.7 + i * 0.18 }).svg;
  });

  if (view === 'query' || view === 'recap-join') {
    const sql = view === 'recap-join'
      ? 'JOIN dim_date o · JOIN dim_date s · JOIN dim_date d'
      : 'dim_order_date · dim_ship_date · dim_due_date';
    body += chip(VW / 2, 500, sql, { icon: 'search', iconVar: '--accent', w: 420, delay: 1.3 });
    body += caption(VW / 2, 548, view === 'recap-join'
      ? 'One query joins the single calendar three times — aliased order, ship and due — all on an indexed key.'
      : 'Three zero-copy views alias dim_date — distinct names in the BI layer, one physical table underneath.', { delay: 1.5 });
  } else if (view === 'recap') {
    const checks = ['one table', 'three roles', 'aliased views'];
    const gap = 210, startX = VW / 2 - (checks.length - 1) * gap / 2;
    checks.forEach((t, i) => { body += chip(startX + i * gap, 500, t, { icon: 'check', iconVar: '--green', w: 180, delay: 1.3 + i * 0.12 }); });
    body += caption(VW / 2, 548, 'Build the calendar once; reference it in many roles; alias each role in a view.', { delay: 1.7 });
  } else {
    // 'aliases'
    body += caption(VW / 2, 528, 'order_date_key, ship_date_key, due_date_key all → dim_date.date_key — the role lives in the key.', { delay: 1.4 });
  }
  return assemble({ slug: 'role-playing-dimensions', aria: 'One dim_date referenced by three foreign keys of a fact', body, note: snap.note });
}
