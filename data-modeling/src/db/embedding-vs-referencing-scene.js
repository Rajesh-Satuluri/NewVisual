/* embedding-vs-referencing-scene.js — "Embedding vs Referencing" on the NoSQL
   canvas (engine/nosql2d.js). The hero is a docCard with embedded violet sub-doc
   rows contrasted against a docCard with a ref line + an arrow to a second docCard.

   Input: a view-snapshot { view, note }.
   Views: 'choice', 'embed', 'reference', 'rule', 'hybrid', 'recap'. Unknown → recap. */

import { docCard, band, arrow, chip, tag, caption, assemble, VW } from '../engine/nosql2d.js';

export function renderEmbeddingVsReferencingScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── setup: the choice — one order, two ways to model its relationships ─── */
  if (view === 'choice') {
    const card = docCard(370, 150, { name: 'order', icon: 'file', tone: 'accent', w: 300, lines: [
      { k: '_id', v: '"o#1001"' },
      { k: 'total', v: '$80' },
      { k: 'customer', v: '… embed or ref?', hot: true },
      { k: 'items', v: '… embed or ref?', hot: true },
    ] });
    body += card.svg;
    body += chip(card.cx - 120, card.top - 30, 'embed?', { icon: 'layers', iconVar: '--violet', w: 120, delay: 0.9 });
    body += chip(card.cx + 120, card.top - 30, 'reference?', { icon: 'key', iconVar: '--accent', w: 136, delay: 1.0 });
    body += caption(VW / 2, card.bottom + 44, 'Every relationship forces one choice: nest the related entity inside the document, or store its id and fetch it separately.', { delay: 1.2 });
    return assemble({ slug: 'embedding-vs-referencing', aria: 'An order document facing the embed-or-reference choice', body, note: snap.note });
  }

  /* ── technique: embed — everything nested, one read, duplication ────────── */
  if (view === 'embed') {
    const card = docCard(370, 120, { name: 'order', icon: 'file', tone: 'violet', w: 320, lines: [
      { k: '_id', v: '"o#1001"' },
      { k: 'customer', v: '{', depth: 0, embed: true },
      { k: 'name', v: '"Ada"', depth: 1, embed: true },
      { v: '}', depth: 0, embed: true },
      { k: 'items', v: '[', depth: 0, embed: true },
      { k: '0', v: '{ product:"Widget", price:$40 }', depth: 1, embed: true },
      { k: '1', v: '{ product:"Gizmo", price:$40 }', depth: 1, embed: true },
      { v: ']', depth: 0, embed: true },
    ] });
    body += card.svg;
    body += tag(card.cx, card.top - 24, 'embedded', { tone: 'violet', delay: 1.4 });
    body += chip(card.right + 120, card.lineY(1), 'one read', { icon: 'bolt', iconVar: '--green', w: 140, delay: 1.5 });
    body += chip(card.right + 120, card.lineY(5), 'product duplicated', { icon: 'alert', iconVar: '--amber', w: 198, delay: 1.7 });
    body += caption(VW / 2, card.bottom + 40, 'Customer and items nested inside — one read returns the whole order, but the shared product is copied into every order.', { delay: 1.9 });
    return assemble({ slug: 'embedding-vs-referencing', aria: 'An order with embedded customer and items', body, note: snap.note });
  }

  /* ── technique: reference — a pointer + an arrow to a separate doc ──────── */
  if (view === 'reference') {
    const order = docCard(90, 180, { name: 'order', icon: 'file', tone: 'accent', w: 300, lines: [
      { k: '_id', v: '"o#1001"' },
      { k: 'total', v: '$80' },
      { k: 'customer_id', v: '"u#42"', ref: true },
    ] });
    const user = docCard(620, 180, { name: 'user', icon: 'file', tone: 'green', w: 300, lines: [
      { k: '_id', v: '"u#42"' },
      { k: 'name', v: '"Ada Lovelace"' },
      { k: 'tier', v: '"gold"' },
    ] });
    body += order.svg + user.svg;
    body += arrow(order.refAnchor(2), { x: user.left, y: user.lineY(0), side: 'left' }, { label: '2nd read', delay: 1.3 }).svg;
    body += tag(order.cx, order.top - 24, 'reference', { tone: 'accent', delay: 1.5 });
    body += chip(user.cx, user.top - 24, 'one copy', { icon: 'check', iconVar: '--green', w: 140, delay: 1.6 });
    body += caption(VW / 2, Math.max(order.bottom, user.bottom) + 40, 'The order stores only customer_id; the user lives once in its own collection — no duplication, but a second read resolves it.', { delay: 1.8 });
    return assemble({ slug: 'embedding-vs-referencing', aria: 'An order referencing a separate user document by id', body, note: snap.note });
  }

  /* ── technique: the decision rule — two columns ─────────────────────────── */
  if (view === 'rule') {
    body += band(80, 150, 400, 300, 'EMBED', { sub: 'owned · bounded · read together', delay: 0.3 });
    body += band(560, 150, 400, 300, 'REFERENCE', { sub: 'shared · unbounded · large', delay: 0.5 });
    const embedCard = docCard(110, 230, { name: 'order', icon: 'file', tone: 'violet', w: 240, delay: 0.8, lines: [
      { k: 'items', v: '[', embed: true },
      { k: '…', v: 'owned line items', depth: 1, embed: true },
      { v: ']', embed: true },
    ] });
    const refCard = docCard(590, 230, { name: 'order', icon: 'file', tone: 'accent', w: 240, delay: 1.0, lines: [
      { k: 'product_id', v: '"p#A1"', ref: true },
      { k: 'author_id', v: '"u#9"', ref: true },
      { k: 'log_id', v: '"→ unbounded"', ref: true },
    ] });
    body += embedCard.svg + refCard.svg;
    body += caption(VW / 2, 490, 'Three questions settle it: ownership, boundedness, access. Embed owned+bounded+read-together; reference shared, unbounded, or large.', { delay: 1.4 });
    return assemble({ slug: 'embedding-vs-referencing', aria: 'The embed-versus-reference decision rule in two columns', body, note: snap.note });
  }

  /* ── hybrid / recap: embed a stable summary + reference the full doc ────── */
  const order = docCard(90, 150, { name: 'order', icon: 'file', tone: 'accent', w: 320, lines: [
    { k: '_id', v: '"o#1001"' },
    { k: 'items', v: '[', depth: 0, embed: true },
    { k: '0', v: '{ name:"Widget", price:$40 }', depth: 1, embed: true },
    { v: ']  // owned, embedded', depth: 0, embed: true },
    { k: 'product_summary', v: '{ name, price }', embed: true },
    { k: 'product_id', v: '"p#A1"', ref: true },
  ] });
  const product = docCard(650, 170, { name: 'product', icon: 'file', tone: 'green', w: 300, lines: [
    { k: '_id', v: '"p#A1"' },
    { k: 'name', v: '"Widget"' },
    { k: 'stock', v: '240' },
    { k: 'reviews', v: '[ … ]' },
  ] });
  body += order.svg + product.svg;
  body += arrow(order.refAnchor(5), { x: product.left, y: product.lineY(0), side: 'left' }, { label: 'full doc', delay: 1.4 }).svg;
  body += tag(order.cx, order.top - 24, 'hybrid', { tone: 'violet', delay: 1.5 });
  const msg = view === 'recap' ? 'owned embedded · shared referenced' : 'summary embedded + full referenced';
  body += chip(VW / 2, Math.max(order.bottom, product.bottom) + 28, msg, { icon: 'merge', iconVar: '--green', w: 330, delay: 1.6 });
  body += caption(VW / 2, Math.max(order.bottom, product.bottom) + 68, 'A stable summary embedded for the one-read path, plus a reference to the full product for live stock and reviews.', { delay: 1.8 });
  return assemble({ slug: 'embedding-vs-referencing', aria: 'A hybrid order embedding a summary and referencing the full product', body, note: snap.note });
}
