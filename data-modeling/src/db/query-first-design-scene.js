/* query-first-design-scene.js — "Query-First Design" on the NoSQL canvas
   (engine/nosql2d.js). The hero is the accessList: the queries the app must serve,
   enumerated first and then mapped one-for-one onto keys and collections.

   Input: a view-snapshot { view, note }.
   Views: 'entity-first', 'patterns', 'enumerate', 'map', 'newpattern', 'recap'.
   Unknown → recap. */

import { accessList, kvStore, docCard, itemRow, arrow, chip, tag, caption, assemble, VW } from '../engine/nosql2d.js';

/* the four core access patterns the app must serve */
const PATTERNS = [
  { t: 'get user by id', done: true },
  { t: "list a user's orders, newest first", done: true },
  { t: 'get an order with its line items', done: true },
  { t: 'look up a product by id', done: true },
];

export function renderQueryFirstDesignScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── setup: entity-first — three normalized tables, any query later ─────── */
  if (view === 'entity-first') {
    const users = kvStore(80, 180, { title: 'users', icon: 'grid', tone: 'slate', w: 250, rows: [{ k: 'user_id', v: '42' }, { k: 'name', v: 'Ada' }] });
    const orders = kvStore(395, 165, { title: 'orders', icon: 'grid', tone: 'slate', w: 250, rows: [{ k: 'order_id', v: '1001' }, { k: 'user_id', v: '42' }] });
    const prods = kvStore(710, 180, { title: 'products', icon: 'grid', tone: 'slate', w: 250, rows: [{ k: 'sku', v: 'A1' }, { k: 'price', v: '$40' }] });
    body += users.svg + orders.svg + prods.svg;
    body += arrow({ x: users.right, y: users.rowCy(0), side: 'right' }, { x: orders.left, y: orders.rowCy(1), side: 'left' }, { label: 'join', delay: 0.9 }).svg;
    body += arrow({ x: orders.right, y: orders.rowCy(0), side: 'right' }, { x: prods.left, y: prods.rowCy(0), side: 'left' }, { label: 'join', delay: 1.1 }).svg;
    body += chip(VW / 2, 100, 'model the data, query it any way', { icon: 'database', delay: 1.4 });
    body += caption(VW / 2, 470, 'Entity-first: normalized tables describe the domain, and any future question is answered with a new ad-hoc join.', { delay: 1.6 });
    return assemble({ slug: 'query-first-design', aria: 'Three normalized tables queried with ad-hoc joins', body, note: snap.note });
  }

  /* ── problem: the inversion — queries are the input to the model ───────── */
  if (view === 'patterns') {
    body += tag(VW / 2, 110, 'query-first', { tone: 'violet', delay: 0.4 });
    const al = accessList(340, 150, {
      title: 'Access patterns drive the model', icon: 'target', tone: 'accent', w: 380, delay: 0.5,
      patterns: [
        { t: 'get user by id', done: false },
        { t: "list a user's orders", done: false },
        { t: 'get order with line items', done: false },
        { t: 'look up a product by id', done: false },
      ],
    });
    body += al.svg;
    body += chip(al.cx, al.bottom + 30, 'no ad-hoc join · no cheap scan', { icon: 'alert', iconVar: '--red', w: 290, delay: 1.5 });
    body += caption(VW / 2, al.bottom + 70, 'With no join to fall back on, the queries are the input to the model — enumerated before any data is shaped.', { delay: 1.7 });
    return assemble({ slug: 'query-first-design', aria: 'The access-pattern list as the input to the model', body, note: snap.note });
  }

  /* ── technique: enumerate the access patterns (the hero) ────────────────── */
  if (view === 'enumerate') {
    const al = accessList(330, 130, {
      title: 'Access patterns — the exhaustive list', icon: 'target', tone: 'accent', w: 400, delay: 0.3,
      patterns: PATTERNS.map(p => ({ t: p.t, done: false })),
    });
    body += al.svg;
    body += chip(al.cx, al.top - 26, 'write every query first', { icon: 'listOrdered', iconVar: '--violet', w: 236, delay: 1.2 });
    body += caption(VW / 2, al.bottom + 40, 'Every screen and endpoint is one access pattern — list them all, exhaustively, before touching a key.', { delay: 1.5 });
    return assemble({ slug: 'query-first-design', aria: 'The exhaustive list of access patterns', body, note: snap.note });
  }

  /* ── map / recap: each pattern mapped to one key or collection ──────────── */
  if (view === 'map' || view === 'recap') {
    const al = accessList(70, 150, {
      title: 'Access patterns — all satisfied', icon: 'target', tone: 'accent', w: 380, delay: 0.3,
      patterns: PATTERNS,
    });
    body += al.svg;
    const kv = kvStore(560, 150, {
      title: 'keys & collections', icon: 'key', tone: 'green', w: 400, delay: 0.5, keyW: 180,
      rows: [
        { k: 'user:42', v: '→ user doc' },
        { k: 'PK=USER#42', v: '→ orders' },
        { k: 'order:1001', v: '→ order+items' },
        { k: 'product:A1', v: '→ product' },
      ],
    });
    body += kv.svg;
    for (let i = 0; i < 4; i++) {
      body += arrow({ x: al.right, y: al.y + 34 + 8 + i * 32 + 16, side: 'right' }, { x: kv.left, y: kv.rowCy(i), side: 'left' }, { delay: 1.0 + i * 0.12 }).svg;
    }
    const msg = view === 'recap' ? 'every pattern → one read' : 'one read each';
    body += chip(VW / 2, 500, msg, { icon: 'bolt', iconVar: '--green', w: 250, delay: 1.7 });
    body += caption(VW / 2, 540, 'Each access pattern maps to one key or collection — the data shaped to the queries, every query a single read.', { delay: 1.9 });
    return assemble({ slug: 'query-first-design', aria: 'Each access pattern mapped to a single-read key', body, note: snap.note });
  }

  /* ── tradeoff: an unplanned access pattern has no single-read home ──────── */
  const al = accessList(70, 150, {
    title: 'Access patterns', icon: 'target', tone: 'accent', w: 380, delay: 0.3,
    patterns: [
      { t: 'get user by id', done: true },
      { t: "list a user's orders", done: true },
      { t: 'look up a product by id', done: true },
      { t: 'orders by status — never planned', done: false, hot: true },
    ],
  });
  body += al.svg;
  const card = docCard(560, 150, { name: 'no key serves this', icon: 'alert', tone: 'rose', w: 340, delay: 0.6, lines: [
    { k: 'query', v: '"orders where status=new"' },
    { k: 'scan', v: 'every item — slow', hot: true },
    { k: 'or', v: 'add a secondary index' },
    { k: 'or', v: 'duplicate, reshaped' },
    { k: 'or', v: 'migrate the keys' },
  ] });
  body += card.svg;
  body += chip(card.cx, card.bottom + 28, 'new pattern → redesign', { icon: 'alert', iconVar: '--amber', w: 240, delay: 1.5 });
  body += caption(VW / 2, card.bottom + 68, 'A query the model never anticipated has no home — it needs a new index, a reshaped copy, or a key migration.', { delay: 1.7 });
  return assemble({ slug: 'query-first-design', aria: 'An unplanned access pattern with no single-read home', body, note: snap.note });
}
