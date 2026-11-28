/* document-modeling-scene.js — "Document Modeling" on the NoSQL canvas
   (engine/nosql2d.js). The hero is a document that UNFOLDS as a nested JSON tree.
   Views contrast a scattered relational trio against one embedded aggregate.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).
   Views: 'doc', 'scattered', 'embed', 'nested', 'growth', 'recap'. Unknown → recap. */

import { docCard, kvStore, arrow, chip, tag, caption, assemble, VW } from '../engine/nosql2d.js';

/* the flat-ish user document (setup) */
const USER_FLAT = [
  { k: '_id', v: '"u#42"' },
  { k: 'name', v: '"Ada Lovelace"' },
  { k: 'email', v: '"ada@analytical.io"' },
  { k: 'address', v: '{', depth: 0 },
  { k: 'city', v: '"London"', depth: 1 },
  { k: 'zip', v: '"EC1A"', depth: 1 },
  { v: '}', depth: 0 },
];

/* the fully-embedded aggregate (embed / recap) */
const USER_EMBED = [
  { k: '_id', v: '"u#42"' },
  { k: 'name', v: '"Ada Lovelace"' },
  { k: 'address', v: '{', depth: 0, embed: true },
  { k: 'city', v: '"London"', depth: 1, embed: true },
  { k: 'zip', v: '"EC1A"', depth: 1, embed: true },
  { v: '}', depth: 0, embed: true },
  { k: 'orders', v: '[', depth: 0, embed: true },
  { k: '0', v: '{ sku:"A1", qty:2 }', depth: 1, embed: true },
  { k: '1', v: '{ sku:"B7", qty:1 }', depth: 1, embed: true },
  { v: ']', depth: 0, embed: true },
];

export function renderDocumentModelingScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── setup: one document unfolding ─────────────────────────────────────── */
  if (view === 'doc') {
    const card = docCard(370, 150, { name: 'user', icon: 'file', tone: 'accent', w: 300, lines: USER_FLAT });
    body += card.svg;
    body += chip(card.cx, card.top - 30, 'one document', { icon: 'file', delay: 0.9 });
    body += caption(VW / 2, card.bottom + 44, 'Scalars plus a nested address object — the whole record is one self-contained tree.', { delay: 1.1 });
    return assemble({ slug: 'document-modeling', aria: 'A user document as a nested JSON tree', body, note: snap.note });
  }

  /* ── problem: the same user scattered across three relational tables ────── */
  if (view === 'scattered') {
    const users = kvStore(90, 170, { title: 'users', icon: 'grid', tone: 'slate', w: 250, rows: [
      { k: 'user_id', v: '42' }, { k: 'name', v: 'Ada Lovelace' },
    ] });
    const addr = kvStore(400, 150, { title: 'addresses', icon: 'grid', tone: 'slate', w: 250, rows: [
      { k: 'user_id', v: '42' }, { k: 'city', v: 'London' }, { k: 'zip', v: 'EC1A' },
    ] });
    const orders = kvStore(710, 170, { title: 'orders', icon: 'grid', tone: 'slate', w: 250, rows: [
      { k: 'user_id', v: '42' }, { k: 'sku', v: 'A1' },
    ] });
    body += users.svg + addr.svg + orders.svg;
    body += arrow({ x: users.right, y: users.rowCy(0), side: 'right' }, { x: addr.left, y: addr.rowCy(0), side: 'left' }, { label: 'join', delay: 0.9 }).svg;
    body += arrow({ x: addr.right, y: addr.rowCy(0), side: 'right' }, { x: orders.left, y: orders.rowCy(0), side: 'left' }, { label: 'join', delay: 1.1 }).svg;
    body += caption(VW / 2, 500, 'One object, three tables — reassembling the user the app wants means a join across all three.', { delay: 1.5 });
    return assemble({ slug: 'document-modeling', aria: 'The user normalized across three tables', body, note: snap.note });
  }

  /* ── growth: unbounded array + duplicated shared sub-object ─────────────── */
  if (view === 'growth') {
    const lines = [
      { k: '_id', v: '"u#42"' },
      { k: 'name', v: '"Ada Lovelace"' },
      { k: 'events', v: '[', depth: 0, hot: true },
      { k: '…', v: '1_240_000 elements', depth: 1, hot: true },
      { v: ']  // → 16 MB ceiling', depth: 0, hot: true },
      { k: 'product', v: '{ … copied per order }', depth: 0, embed: true },
    ];
    const card = docCard(360, 140, { name: 'user', icon: 'file', tone: 'rose', w: 330, lines });
    body += card.svg;
    body += chip(card.right + 120, card.lineY(3), 'unbounded growth', { icon: 'alert', iconVar: '--red', w: 192, delay: 1.0 });
    body += chip(card.right + 120, card.lineY(5), 'duplicated fact', { icon: 'alert', iconVar: '--amber', w: 176, delay: 1.2 });
    body += caption(VW / 2, card.bottom + 40, 'An unbounded array strains the size limit; a shared sub-object is duplicated across every document.', { delay: 1.4 });
    return assemble({ slug: 'document-modeling', aria: 'An over-embedded document straining its limits', body, note: snap.note });
  }

  /* ── embed / nested / recap: the embedded aggregate, one read ──────────── */
  const name = view === 'nested' ? 'user · orders[]' : 'user';
  const card = docCard(370, 120, { name, icon: 'file', tone: 'accent', w: 320, lines: USER_EMBED });
  body += card.svg;
  if (view === 'nested') {
    body += chip(card.right + 110, card.lineY(7), 'array of sub-objects', { icon: 'layers', iconVar: '--violet', w: 206, delay: 1.2 });
    body += caption(VW / 2, card.bottom + 36, 'orders is a nested array — an owned one-to-many, stored in place with no join table.', { delay: 1.5 });
  } else {
    body += tag(card.cx, card.top - 24, 'the aggregate', { tone: 'violet', delay: 1.3 });
    const label = view === 'recap' ? 'GET user → whole tree, 0 joins' : 'one read · zero joins';
    body += chip(VW / 2, card.bottom + 24, label, { icon: 'bolt', iconVar: '--green', w: 300, delay: 1.4 });
    body += caption(VW / 2, card.bottom + 64, 'address and orders embedded inside the user — the whole aggregate returned in a single request.', { delay: 1.6 });
  }
  return assemble({ slug: 'document-modeling', aria: 'The user aggregate embedded in one document', body, note: snap.note });
}
