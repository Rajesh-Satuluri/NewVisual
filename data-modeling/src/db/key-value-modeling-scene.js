/* key-value-modeling-scene.js — "Key-Value Modeling" on the NoSQL canvas
   (engine/nosql2d.js). The hero is the kvStore: composite keys addressing opaque
   values, with a GET lighting one hot slot in O(1).

   Input: a view-snapshot { view, note }.
   Views: 'dict', 'get', 'keydesign', 'opaque', 'usecases', 'recap'. Unknown → recap. */

import { kvStore, docCard, chip, tag, caption, band, arrow, assemble, VW } from '../engine/nosql2d.js';

/* the core key-value store */
const ROWS = [
  { k: 'user:42:cart', v: '{ items:[…], total:$80 }' },
  { k: 'session:abc123', v: '{ uid:42, csrf:… }' },
  { k: 'counter:page:home', v: '18402' },
  { k: 'flag:dark_mode', v: 'on' },
];

export function renderKeyValueModelingScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── setup: the dictionary ─────────────────────────────────────────────── */
  if (view === 'dict') {
    const kv = kvStore(330, 150, { title: 'key → value store', icon: 'key', tone: 'accent', w: 400, delay: 0.3, keyW: 180, rows: ROWS });
    body += kv.svg;
    body += chip(kv.cx, kv.top - 26, 'one key, one opaque value', { icon: 'database', delay: 1.2 });
    body += caption(VW / 2, kv.bottom + 40, 'A distributed dictionary: put a value in under a key, get it back by that exact key — the store never looks inside.', { delay: 1.5 });
    return assemble({ slug: 'key-value-modeling', aria: 'A key-value store as a dictionary of opaque values', body, note: snap.note });
  }

  /* ── technique: GET by exact key — one hot slot, O(1) ──────────────────── */
  if (view === 'get') {
    const kv = kvStore(360, 150, { title: 'key → value store', icon: 'key', tone: 'accent', w: 400, delay: 0.3, keyW: 180, rows: [
      { k: 'user:42:cart', v: '{ items:[…], total:$80 }', hot: true },
      { k: 'session:abc123', v: '{ uid:42, csrf:… }' },
      { k: 'counter:page:home', v: '18402' },
      { k: 'flag:dark_mode', v: 'on' },
    ] });
    body += kv.svg;
    body += chip(170, kv.rowCy(0), 'GET user:42:cart', { icon: 'search', iconVar: '--accent', w: 210, delay: 1.1 });
    body += arrow({ x: 275, y: kv.rowCy(0), side: 'right' }, { x: kv.left, y: kv.rowCy(0), side: 'left' }, { delay: 1.3 }).svg;
    body += chip(kv.right + 110, kv.rowCy(0), 'O(1) hit', { icon: 'bolt', iconVar: '--green', w: 140, delay: 1.5 });
    body += caption(VW / 2, kv.bottom + 40, 'The key hashes straight to one slot and returns it — O(1) at any scale, with no scan over the other keys.', { delay: 1.7 });
    return assemble({ slug: 'key-value-modeling', aria: 'A GET hashing to one hot slot in O(1)', body, note: snap.note });
  }

  /* ── technique: designing the composite key ────────────────────────────── */
  if (view === 'keydesign') {
    const kv = kvStore(300, 130, { title: 'composite keys encode access', icon: 'key', tone: 'violet', w: 440, delay: 0.3, keyW: 230, rows: [
      { k: 'user:{id}:cart', v: "a user's cart" },
      { k: 'session:{token}', v: 'a login session' },
      { k: 'counter:page:{slug}', v: 'a view counter' },
      { k: 'flag:{name}', v: 'a feature flag' },
    ] });
    body += kv.svg;
    body += chip(kv.cx, kv.top - 26, 'namespace : id : field', { icon: 'sliders', iconVar: '--violet', w: 236, delay: 1.2 });
    body += caption(VW / 2, kv.bottom + 40, 'Design keys the app can construct from data it already holds — the key is the query, pre-answered by naming convention.', { delay: 1.5 });
    return assemble({ slug: 'key-value-modeling', aria: 'Composite keys encoding the access pattern', body, note: snap.note });
  }

  /* ── tradeoff: the value is opaque — no query inside ───────────────────── */
  if (view === 'opaque') {
    const kv = kvStore(90, 170, { title: 'key → value', icon: 'key', tone: 'accent', w: 360, delay: 0.3, keyW: 150, rows: [
      { k: 'user:42:cart', v: '◼ opaque blob' },
      { k: 'user:43:cart', v: '◼ opaque blob' },
      { k: 'user:44:cart', v: '◼ opaque blob' },
    ] });
    body += kv.svg;
    const card = docCard(560, 170, { name: 'what you CANNOT do', icon: 'alert', tone: 'rose', w: 360, delay: 0.6, lines: [
      { k: 'filter', v: 'carts where total > $100', hot: true },
      { k: 'scan', v: 'all carts for user 42', hot: true },
      { k: 'join', v: 'cart ⋈ user', hot: true },
      { v: '// no server-side query' },
    ] });
    body += card.svg;
    body += chip(card.cx, card.top - 24, 'value is opaque', { icon: 'alert', iconVar: '--red', w: 180, delay: 1.5 });
    body += caption(VW / 2, Math.max(kv.bottom, card.bottom) + 40, 'The store cannot filter, scan or join inside the value — a second access path is a second key you maintain by hand.', { delay: 1.7 });
    return assemble({ slug: 'key-value-modeling', aria: 'An opaque value the store cannot query inside', body, note: snap.note });
  }

  /* ── tradeoff: use cases ───────────────────────────────────────────────── */
  if (view === 'usecases') {
    body += band(70, 150, 440, 300, 'GREAT FIT', { sub: 'access by one known key', delay: 0.3 });
    body += band(560, 150, 400, 300, 'WRONG TOOL', { sub: 'needs a query over contents', delay: 0.5 });
    const kv = kvStore(95, 210, { tone: 'green', w: 390, delay: 0.8, keyW: 180, rows: [
      { k: 'page:home', v: 'cached HTML' },
      { k: 'session:{token}', v: 'user state' },
      { k: 'counter:views', v: 'INCR' },
      { k: 'flag:dark_mode', v: 'on' },
    ] });
    body += kv.svg;
    const card = docCard(590, 210, { name: 'ask the key cannot answer', icon: 'search', tone: 'rose', w: 340, delay: 1.0, lines: [
      { k: 'q1', v: 'orders last week', hot: true },
      { k: 'q2', v: 'users sorted by spend', hot: true },
      { v: '// use a document / SQL store' },
    ] });
    body += card.svg;
    body += caption(VW / 2, 490, 'Caches, sessions, counters and flags are read by one exact key at microsecond latency; anything ad-hoc belongs in another store.', { delay: 1.4 });
    return assemble({ slug: 'key-value-modeling', aria: 'Key-value use cases versus the wrong tool', body, note: snap.note });
  }

  /* ── recap: the key encodes access, the value is the whole aggregate ───── */
  const kv = kvStore(300, 140, { title: 'key encodes access · value is the aggregate', icon: 'key', tone: 'accent', w: 440, delay: 0.3, keyW: 210, rows: [
    { k: 'user:42:cart', v: '{ whole cart }', hot: true },
    { k: 'session:abc123', v: '{ whole session }' },
    { k: 'counter:page:home', v: '18402' },
    { k: 'flag:dark_mode', v: 'on' },
  ] });
  body += kv.svg;
  body += tag(kv.cx, kv.top - 24, 'the key is the query', { tone: 'violet', delay: 1.3 });
  body += chip(VW / 2, kv.bottom + 28, 'design the key · serialize the aggregate', { icon: 'bolt', iconVar: '--green', w: 340, delay: 1.5 });
  body += caption(VW / 2, kv.bottom + 68, 'Two decisions make the whole model: the composite key that encodes the access pattern, and the aggregate serialized as the value.', { delay: 1.7 });
  return assemble({ slug: 'key-value-modeling', aria: 'Composite keys returning whole serialized aggregates in O(1)', body, note: snap.note });
}
