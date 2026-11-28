/* single-table-design-scene.js — "Single-Table Design" on the NoSQL canvas
   (engine/nosql2d.js). The hero is an item collection: heterogeneous items sharing
   a partition key, sorted by sort key, swept by one query in a single read.

   Input: a view-snapshot { view, note }.
   Views: 'items', 'nojoin', 'collection', 'query', 'tradeoff', 'recap'. Unknown → recap. */

import { itemRow, partition, kvStore, accessList, sweep, arrow, chip, tag, caption, assemble, VW } from '../engine/nosql2d.js';

/* the heterogeneous items of one table (items view) */
const TABLE_ITEMS = [
  { pk: 'USER#42', sk: 'PROFILE', type: 'User', tone: 'accent', cells: ['name=Ada', 'tier=gold'] },
  { pk: 'USER#42', sk: 'ORDER#1001', type: 'Order', tone: 'violet', cells: ['total=$80', 'status=shipped'] },
  { pk: 'USER#42', sk: 'ORDER#1002', type: 'Order', tone: 'violet', cells: ['total=$20', 'status=new'] },
  { pk: 'PROD#A1', sk: 'PROFILE', type: 'Product', tone: 'green', cells: ['name=Widget', 'price=$40'] },
];

export function renderSingleTableDesignScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── problem: three relational tables + joins ──────────────────────────── */
  if (view === 'nojoin') {
    const users = kvStore(80, 180, { title: 'users', icon: 'grid', tone: 'slate', w: 240, rows: [{ k: 'user_id', v: '42' }, { k: 'name', v: 'Ada' }] });
    const orders = kvStore(400, 165, { title: 'orders', icon: 'grid', tone: 'slate', w: 240, rows: [{ k: 'order_id', v: '1001' }, { k: 'user_id', v: '42' }] });
    const items = kvStore(720, 180, { title: 'order_items', icon: 'grid', tone: 'slate', w: 240, rows: [{ k: 'order_id', v: '1001' }, { k: 'sku', v: 'A1' }] });
    body += users.svg + orders.svg + items.svg;
    body += arrow({ x: users.right, y: users.rowCy(0), side: 'right' }, { x: orders.left, y: orders.rowCy(1), side: 'left' }, { label: 'join', delay: 0.9 }).svg;
    body += arrow({ x: orders.right, y: orders.rowCy(0), side: 'right' }, { x: items.left, y: items.rowCy(0), side: 'left' }, { label: 'join', delay: 1.1 }).svg;
    body += chip(VW / 2, 110, 'no join operator in NoSQL', { icon: 'alert', iconVar: '--red', w: 260, delay: 1.4 });
    body += caption(VW / 2, 470, 'The relational read joins three tables — exactly the distributed scatter a scalable store refuses to do.', { delay: 1.6 });
    return assemble({ slug: 'single-table-design', aria: 'Three relational tables joined at read time', body, note: snap.note });
  }

  /* ── items: the one heterogeneous table ────────────────────────────────── */
  if (view === 'items') {
    body += chip(VW / 2, 92, 'one table · AppData', { icon: 'database', delay: 0.3 });
    TABLE_ITEMS.forEach((it, i) => { body += itemRow(200, 150 + i * 52, { ...it, w: 640, delay: 0.3 + i * 0.12 }).svg; });
    body += caption(VW / 2, 420, 'Users, orders and a product in one table — told apart only by overloaded PK and SK values.', { delay: 1.1 });
    return assemble({ slug: 'single-table-design', aria: 'One table holding heterogeneous item types', body, note: snap.note });
  }

  /* ── collection / query / recap: the item collection in one partition ──── */
  if (view === 'collection' || view === 'query' || view === 'recap') {
    const part = partition(360, 120, {
      label: 'PK = USER#42', sub: 'one partition', tone: 'accent', w: 320, delay: 0.3,
      items: [
        { t: 'SK=PROFILE      · Ada, gold', tone: 'accent' },
        { t: 'SK=ORDER#1001   · $80 shipped', tone: 'violet' },
        { t: 'SK=ORDER#1002   · $20 new', tone: 'violet' },
      ],
    });
    body += part.svg;
    if (view === 'collection') {
      body += chip(part.right + 130, part.slotCy(0), 'sorted by SK', { icon: 'layers', iconVar: '--accent', w: 164, delay: 1.0 });
      body += tag(part.cx, part.top - 22, 'item collection', { tone: 'violet', delay: 1.2 });
      body += caption(VW / 2, part.bottom + 40, 'Profile and both orders share PK=USER#42 — stored contiguously, sorted by sort key.', { delay: 1.4 });
    } else {
      const sweepTop = part.slotCy(0) - 17;
      body += sweep(372, sweepTop, 296, part.bottom - sweepTop - 10, { delay: 1.1 });
      body += chip(part.cx, part.top - 22, 'Query  PK = USER#42', { icon: 'search', iconVar: '--accent', w: 230, delay: 1.45 });
      const msg = view === 'recap' ? 'one read · zero joins · 3 items' : 'one read, zero joins';
      body += chip(VW / 2, part.bottom + 28, msg, { icon: 'bolt', iconVar: '--green', w: 300, delay: 1.5 });
      body += caption(VW / 2, part.bottom + 68, 'A single query sweeps the whole collection — the join, pre-computed by the choice of partition key.', { delay: 1.7 });
    }
    return assemble({ slug: 'single-table-design', aria: 'An item collection swept by one query', body, note: snap.note });
  }

  /* ── tradeoff: known patterns fast, unplanned ones expensive ───────────── */
  const al = accessList(90, 150, {
    title: 'Access patterns — fixed up front', tone: 'accent', w: 380, delay: 0.3,
    patterns: [
      { t: 'get user + orders  (PK=USER#42)', done: true },
      { t: 'get product by id  (PK=PROD#A1)', done: true },
      { t: 'get order by id    (SK=ORDER#…)', done: true },
      { t: 'orders by status   — not planned', done: false, hot: true },
    ],
  });
  body += al.svg;
  const part = partition(560, 150, {
    label: 'encoded keys', sub: 'opaque', tone: 'rose', w: 300, delay: 0.5,
    items: [{ t: 'USER#42 / ORDER#1001', tone: 'slate' }, { t: 'needs a data dictionary', tone: 'rose', hot: true }],
  });
  body += part.svg;
  body += chip(710, 360, 'new pattern → index or migration', { icon: 'alert', iconVar: '--amber', w: 300, delay: 1.3 });
  body += caption(VW / 2, 500, 'Known patterns are instant; a query the key design never anticipated needs a secondary index or a key migration.', { delay: 1.6 });
  return assemble({ slug: 'single-table-design', aria: 'The rigidity tradeoff of single-table design', body, note: snap.note });
}
