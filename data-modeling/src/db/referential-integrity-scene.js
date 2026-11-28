/* referential-integrity-scene.js — the "Referential Integrity" scene, on the flat
   schema CANVAS (engine/schema2d.js), not the isometric machinery of db-scale.
   The 'fk' view draws orders → customers with a 'referential integrity' chip;
   'orphan' deletes the parent row and leaves the children dangling (rose tint +
   alert); 'actions' lists the four referential actions as chips; 'deferred' draws
   an employees self-reference and notes deferring to COMMIT; 'enforce' contrasts
   database vs app enforcement; 'recap' shows orders → customers with check chips.
   Motion is CSS: cards rise in, connectors draw, chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'fk', 'orphan', 'actions', 'deferred', 'enforce', 'recap'.
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
  { name: 'total', type: 'dec' },
];

export function renderReferentialIntegrityScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── orphan: the parent row is deleted, children dangle ──────────────────── */
  if (view === 'orphan') {
    const custCols = CUSTOMER_COLS.map((c, i) => ({ ...c, ghost: i === 0, hot: false }));
    const cust = tableCard(140, 190, { name: 'Customer', icon: 'app', tone: 'rose', cols: custCols, w: 250 });
    const orderCols = ORDER_COLS.map((c, i) => ({ ...c, hot: i === 1 }));
    const order = tableCard(630, 210, { name: 'Order', icon: 'listOrdered', tone: 'rose', cols: orderCols, w: 250, delay: 0.2 });
    body += cust.svg + order.svg;
    body += connector({ x: cust.right, y: cust.rowCy(0), side: 'right' }, { x: order.left, y: order.rowCy(1), side: 'left' }, { from: 'one', to: 'many', delay: 0.6, ghost: true }).svg;
    body += chip(cust.right + 30, cust.rowCy(0), 'deleted', { icon: 'trash', iconVar: '--red', w: 120, delay: 0.9 });
    body += chip(order.cx, order.top - 34, 'orphaned rows', { icon: 'alert', iconVar: '--red', w: 190, delay: 1.0 });
    body += caption(VW / 2, 548, 'Delete the referenced customer and the orders point at nothing — dangling references, hidden until a join hits them.', { delay: 1.2 });
    return assemble({ slug: 'referential-integrity', aria: 'A deleted customer leaving orphaned orders', body, note: snap.note });
  }

  /* ── actions: the four referential actions as chips + captions ───────────── */
  if (view === 'actions') {
    const rows = [
      { y: 120, t: 'ON DELETE CASCADE', icon: 'merge', w: 240, d: 'delete the children along with the parent' },
      { y: 240, t: 'ON DELETE RESTRICT', icon: 'alert', w: 240, d: 'refuse the delete while any child still references it' },
      { y: 360, t: 'ON DELETE SET NULL', icon: 'flush', w: 250, d: 'keep the children but detach — set the FK to null' },
      { y: 480, t: 'ON DELETE NO ACTION', icon: 'clock', w: 250, d: 'defer the check to the end of the statement' },
    ];
    rows.forEach((r, i) => {
      body += chip(VW / 2, r.y, r.t, { icon: r.icon, w: r.w, delay: 0.3 + i * 0.15 });
      body += caption(VW / 2, r.y + 30, r.d, { delay: 0.45 + i * 0.15 });
    });
    return assemble({ slug: 'referential-integrity', aria: 'The four referential actions', body, note: snap.note });
  }

  /* ── deferred: an employees self-reference + a note on deferring ─────────── */
  if (view === 'deferred') {
    const emp = tableCard(380, 200, { name: 'Employee', icon: 'app', tone: 'accent', cols: [
      { name: 'employee_id', type: 'int', key: true },
      { name: 'manager_id', type: 'int', fk: true },
      { name: 'name', type: 'text' },
    ], w: 280 });
    body += emp.svg;
    // self-reference: exit right from manager_id, loop back to employee_id on the right edge
    body += connector({ x: emp.right, y: emp.rowCy(1), side: 'right' }, { x: emp.right, y: emp.rowCy(0), side: 'right' }, { from: 'many', to: 'one', label: 'manager_id', delay: 0.6 }).svg;
    body += chip(emp.cx, emp.top - 34, 'self-reference', { icon: 'merge', w: 170, delay: 0.95 });
    body += chip(VW / 2, 470, 'circular? DEFERRABLE — check at COMMIT', { icon: 'clock', w: 360, delay: 1.1 });
    body += caption(VW / 2, 548, 'manager_id references employee_id in the same table; circular cycles defer the check to COMMIT, after both rows exist.', { delay: 1.25 });
    return assemble({ slug: 'referential-integrity', aria: 'An employees self-reference with deferred circular constraints', body, note: snap.note });
  }

  /* ── enforce: database vs app enforcement ────────────────────────────────── */
  if (view === 'enforce') {
    const db = tableCard(140, 200, { name: 'In the database', icon: 'database', tone: 'green', cols: [
      { name: 'FK constraint', type: '' },
      { name: 'every writer', type: '' },
      { name: 'always on', type: '' },
    ], w: 290 });
    const app = tableCard(610, 200, { name: 'In the app only', icon: 'app', tone: 'rose', cols: [
      { name: 'one code path', type: '', ghost: true },
      { name: 'scripts bypass it', type: '', ghost: true },
      { name: 'one bug = orphan', type: '', ghost: true },
    ], w: 290, delay: 0.2 });
    body += db.svg + app.svg;
    body += chip(db.cx, db.top - 34, 'enforced for all', { icon: 'check', iconVar: '--green', w: 190, delay: 0.9 });
    body += chip(app.cx, app.top - 34, 'one path away from broken', { icon: 'alert', iconVar: '--red', w: 270, delay: 1.0 });
    body += caption(VW / 2, 548, 'A foreign key in the schema holds for every writer; an app-only check guards just the one path through it.', { delay: 1.2 });
    return assemble({ slug: 'referential-integrity', aria: 'Database enforcement versus app-only enforcement', body, note: snap.note });
  }

  /* ── fk / recap: orders → customers, every reference resolving ───────────── */
  const cust = tableCard(170, 190, { name: 'Customer', icon: 'app', tone: 'accent', cols: CUSTOMER_COLS, w: 250 });
  const order = tableCard(620, 210, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: ORDER_COLS, w: 250, delay: 0.2 });
  body += cust.svg + order.svg;
  body += connector(
    { x: cust.right, y: cust.rowCy(0), side: 'right' },
    { x: order.left, y: order.rowCy(1), side: 'left' },
    { from: 'one', to: 'many', label: 'FK', delay: 0.6 }).svg;

  if (view === 'recap') {
    const checks = ['no orphans', 'actions chosen', 'every FK resolves'];
    const gap = 240, startX = VW / 2 - (checks.length - 1) * gap / 2;
    checks.forEach((t, i) => { body += chip(startX + i * gap, 500, t, { icon: 'check', iconVar: '--green', w: 220, delay: 1.0 + i * 0.1 }); });
    body += caption(VW / 2, 548, 'FK constraint, referential actions and deferred checks — enforced in the schema, every foreign key resolves.', { delay: 1.4 });
  } else {
    body += chip(VW / 2, 470, 'referential integrity', { icon: 'check', iconVar: '--green', w: 240, delay: 1.0 });
    body += caption(VW / 2, 548, 'order.customer_id must match a real customer — the database refuses to store a reference to nothing.', { delay: 1.2 });
  }
  return assemble({ slug: 'referential-integrity', aria: 'Orders referencing customers with referential integrity', body, note: snap.note });
}
