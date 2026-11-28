/* surrogate-natural-keys-scene.js — the "Surrogate vs Natural Keys" scene, on the
   flat schema CANVAS (engine/schema2d.js), not the isometric machinery of db-scale.
   The 'two' view sets the natural-keyed card beside a surrogate-keyed one; 'natural'
   shows a natural PK leaking into every FK (rose tint + warn); 'surrogate' shows a
   stable surrogate PK plus a UNIQUE on the natural key; 'flavors' compares sequence
   vs UUID vs ULID/snowflake; 'choose' gives the OLTP default; 'recap' states the
   stability-vs-meaning trade. Motion is CSS: cards rise in, connectors draw, chips pop.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'two', 'natural', 'surrogate', 'flavors', 'choose', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW } from '../engine/schema2d.js';

export function renderSurrogateNaturalKeysScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── two: natural-keyed card beside surrogate-keyed card ─────────────────── */
  if (view === 'two') {
    const nat = tableCard(120, 180, { name: 'Customer', icon: 'app', tone: 'violet', cols: [
      { name: 'email', type: 'text', key: true },
      { name: 'name', type: 'text' },
      { name: 'signup_date', type: 'date' },
    ], w: 300 });
    const sur = tableCard(620, 180, { name: 'Customer', icon: 'app', tone: 'accent', cols: [
      { name: 'customer_id', type: 'int', key: true },
      { name: 'email', type: 'text' },
      { name: 'name', type: 'text' },
      { name: 'signup_date', type: 'date' },
    ], w: 300, delay: 0.2 });
    body += nat.svg + sur.svg;
    body += chip(nat.cx, nat.top - 34, 'natural key', { icon: 'key', iconVar: '--amber', w: 160, delay: 0.7 });
    body += chip(sur.cx, sur.top - 34, 'surrogate key', { icon: 'key', iconVar: '--amber', w: 170, delay: 0.85 });
    body += caption(VW / 2, 548, 'Same entity, two choices of primary key — a meaningful email, or an invented customer_id.', { delay: 1.1 });
    return assemble({ slug: 'surrogate-natural-keys', aria: 'A natural-keyed card beside a surrogate-keyed card', body, note: snap.note });
  }

  /* ── natural: email PK leaking into the FK on Order ──────────────────────── */
  if (view === 'natural') {
    const cust = tableCard(130, 190, { name: 'Customer', icon: 'app', tone: 'rose', cols: [
      { name: 'email', type: 'text', key: true, hot: true },
      { name: 'name', type: 'text' },
    ], w: 250 });
    const order = tableCard(620, 210, { name: 'Order', icon: 'listOrdered', tone: 'rose', cols: [
      { name: 'order_id', type: 'int', key: true },
      { name: 'customer_email', type: 'text', fk: true, hot: true },
      { name: 'total', type: 'dec' },
    ], w: 250, delay: 0.2 });
    body += cust.svg + order.svg;
    body += connector({ x: cust.right, y: cust.rowCy(0), side: 'right' }, { x: order.left, y: order.rowCy(1), side: 'left' }, { from: 'one', to: 'many', label: 'FK', delay: 0.6 }).svg;
    body += chip(cust.cx, cust.top - 34, 'PK leaks + changes', { icon: 'alert', iconVar: '--red', w: 210, delay: 0.9 });
    body += caption(VW / 2, 548, 'The email is the key — so changing it rewrites every FK, and the value leaks into every child row.', { delay: 1.2 });
    return assemble({ slug: 'surrogate-natural-keys', aria: 'A natural email key leaking into every foreign key', body, note: snap.note });
  }

  /* ── surrogate: stable surrogate PK + UNIQUE natural key ─────────────────── */
  if (view === 'surrogate') {
    const cust = tableCard(130, 190, { name: 'Customer', icon: 'app', tone: 'accent', cols: [
      { name: 'customer_id', type: 'int', key: true },
      { name: 'email', type: 'text' },
      { name: 'name', type: 'text' },
    ], w: 250 });
    const order = tableCard(620, 210, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: [
      { name: 'order_id', type: 'int', key: true },
      { name: 'customer_id', type: 'int', fk: true },
      { name: 'total', type: 'dec' },
    ], w: 250, delay: 0.2 });
    body += cust.svg + order.svg;
    body += connector({ x: cust.right, y: cust.rowCy(0), side: 'right' }, { x: order.left, y: order.rowCy(1), side: 'left' }, { from: 'one', to: 'many', label: 'FK', delay: 0.6 }).svg;
    body += chip(cust.right + 140, cust.rowCy(1), 'UNIQUE(email)', { icon: 'key', iconVar: '--green', w: 190, delay: 0.85 });
    body += connector({ x: cust.right, y: cust.rowCy(1), side: 'right' }, { x: cust.right + 42, y: cust.rowCy(1), side: 'left' }, { delay: 0.75, ghost: true }).svg;
    body += chip(VW / 2, 470, 'surrogate PK — stable · small FK', { icon: 'check', iconVar: '--green', w: 300, delay: 1.0 });
    body += caption(VW / 2, 548, 'The surrogate never changes, so the FK never moves; email stays UNIQUE, keeping its real-world guarantee.', { delay: 1.2 });
    return assemble({ slug: 'surrogate-natural-keys', aria: 'A surrogate primary key with a UNIQUE natural key', body, note: snap.note });
  }

  /* ── flavors: sequence vs UUID vs ULID/snowflake ─────────────────────────── */
  if (view === 'flavors') {
    const rows = [
      { y: 130, t: 'Auto-increment sequence', icon: 'listOrdered', w: 270, d: 'compact + index-local — but centralized and guessable' },
      { y: 270, t: 'UUID (v4)', icon: 'globe', w: 160, d: 'random + distributed — 16 bytes, and random inserts split pages' },
      { y: 410, t: 'ULID / snowflake id', icon: 'clock', w: 230, d: 'time-sortable: distributed like a UUID, index-local like a sequence' },
    ];
    rows.forEach((r, i) => {
      body += chip(VW / 2, r.y, r.t, { icon: r.icon, w: r.w, delay: 0.4 + i * 0.18 });
      body += caption(VW / 2, r.y + 32, r.d, { delay: 0.55 + i * 0.18 });
    });
    return assemble({ slug: 'surrogate-natural-keys', aria: 'Three surrogate key flavors compared', body, note: snap.note });
  }

  /* ── choose: the OLTP default ────────────────────────────────────────────── */
  if (view === 'choose') {
    body += chip(VW / 2, 130, 'OLTP default', { icon: 'target', iconVar: '--green', w: 180, delay: 0.4 });
    const picks = ['surrogate PK', 'UNIQUE natural key', 'small, stable FKs'];
    const gap = 300, startX = VW / 2 - (picks.length - 1) * gap / 2;
    picks.forEach((t, i) => { body += chip(startX + i * gap, 250, t, { icon: 'check', iconVar: '--green', w: 240, delay: 0.6 + i * 0.12 }); });
    body += chip(VW / 2, 370, 'natural-only: immutable codes', { icon: 'sliders', w: 290, delay: 1.05 });
    body += caption(VW / 2, 420, 'A pure natural key only when the value is truly immutable — an ISO code, a fixed standard id.', { delay: 1.2 });
    body += caption(VW / 2, 470, 'Never put a natural PK on anything a human might one day edit.', { delay: 1.35 });
    return assemble({ slug: 'surrogate-natural-keys', aria: 'The OLTP default — surrogate PK plus unique natural key', body, note: snap.note });
  }

  /* ── recap: the durable compromise ───────────────────────────────────────── */
  const cust = tableCard(160, 190, { name: 'Customer', icon: 'app', tone: 'accent', cols: [
    { name: 'customer_id', type: 'int', key: true },
    { name: 'email', type: 'text' },
    { name: 'name', type: 'text' },
  ], w: 250 });
  const order = tableCard(630, 210, { name: 'Order', icon: 'listOrdered', tone: 'violet', cols: [
    { name: 'order_id', type: 'int', key: true },
    { name: 'customer_id', type: 'int', fk: true },
  ], w: 250, delay: 0.2 });
  body += cust.svg + order.svg;
  body += connector({ x: cust.right, y: cust.rowCy(0), side: 'right' }, { x: order.left, y: order.rowCy(1), side: 'left' }, { from: 'one', to: 'many', label: 'FK', delay: 0.6 }).svg;
  const checks = ['stable', 'compact', 'meaning kept'];
  const gap = 240, startX = VW / 2 - (checks.length - 1) * gap / 2;
  checks.forEach((t, i) => { body += chip(startX + i * gap, 500, t, { icon: 'check', iconVar: '--green', w: 200, delay: 1.0 + i * 0.1 }); });
  body += caption(VW / 2, 548, 'Surrogate PK for stability, UNIQUE natural key for meaning — the compromise everything else rests on.', { delay: 1.4 });
  return assemble({ slug: 'surrogate-natural-keys', aria: 'The durable surrogate-plus-unique-natural compromise', body, note: snap.note });
}
