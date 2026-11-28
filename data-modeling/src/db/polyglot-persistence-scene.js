/* polyglot-persistence-scene.js — "Polyglot Persistence" on the NoSQL canvas
   (engine/nosql2d.js). The hero: one source of truth feeding several DISTINCT
   stores — a cache, a document store, a search index, a graph, a warehouse — each
   serving a different access pattern.

   Input: a view-snapshot { view, note }.
   Views: 'onesize', 'map-stores', 'shapes', 'sync', 'complexity', 'recap'.
   Unknown → recap. */

import { docCard, kvStore, partition, itemRow, accessList, band, arrow, chip, tag, caption, assemble, VW } from '../engine/nosql2d.js';

export function renderPolyglotPersistenceScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── setup: one DB asked to do everything ──────────────────────────────── */
  if (view === 'onesize') {
    const al = accessList(90, 150, {
      title: 'Access patterns', icon: 'target', tone: 'accent', w: 360, delay: 0.3,
      patterns: [
        { t: 'transactions / integrity', done: true },
        { t: 'full-text search', done: false, hot: true },
        { t: 'session lookups', done: false, hot: true },
        { t: 'recommendations (graph)', done: false, hot: true },
        { t: 'analytics / rollups', done: false, hot: true },
      ],
    });
    body += al.svg;
    const db = kvStore(600, 220, { title: 'one database', icon: 'database', tone: 'slate', w: 340, delay: 0.6, rows: [
      { k: 'good at', v: 'transactions' }, { k: 'clumsy at', v: 'the rest' },
    ] });
    body += db.svg;
    body += arrow({ x: al.right, y: al.bottom - 60, side: 'right' }, { x: db.left, y: db.rowCy(0), side: 'left' }, { delay: 1.2 }).svg;
    body += chip(db.cx, db.top - 24, 'one size fits none', { icon: 'alert', iconVar: '--amber', w: 220, delay: 1.5 });
    body += caption(VW / 2, 500, 'One engine is strong at one family of patterns and clumsy at the others — a real app needs them all at once.', { delay: 1.7 });
    return assemble({ slug: 'polyglot-persistence', aria: 'One database asked to serve every access pattern', body, note: snap.note });
  }

  /* ── map-stores: each pattern routed to its own store ──────────────────── */
  if (view === 'map-stores') {
    const src = kvStore(80, 250, { title: 'system of record', icon: 'database', tone: 'accent', w: 230, delay: 0.3, rows: [
      { k: 'relational', v: 'truth' },
    ] });
    body += src.svg;
    const stores = [
      { t: 'cache', ic: 'bolt', tone: 'amber', pat: 'sessions', y: 92 },
      { t: 'document', ic: 'file', tone: 'violet', pat: 'catalog', y: 178 },
      { t: 'search', ic: 'search', tone: 'green', pat: 'full-text', y: 264 },
      { t: 'graph', ic: 'merge', tone: 'rose', pat: 'recommend', y: 350 },
      { t: 'warehouse', ic: 'layers', tone: 'slate', pat: 'analytics', y: 436 },
    ];
    stores.forEach((s, i) => {
      const kv = kvStore(620, s.y, { title: s.t, icon: s.ic, tone: s.tone, w: 300, delay: 0.7 + i * 0.1, rows: [{ k: s.pat, v: 'O(1) fit', hot: true }] });
      body += kv.svg;
      body += arrow({ x: src.right, y: src.rowCy(0), side: 'right' }, { x: kv.left, y: kv.rowCy(0), side: 'left' }, { delay: 1.1 + i * 0.1 }).svg;
    });
    body += caption(VW / 2, 548, 'Each access pattern routed to the engine that answers it cheapest — cache, document, search, graph, warehouse.', { delay: 1.9 });
    return assemble({ slug: 'polyglot-persistence', aria: 'Access patterns mapped to purpose-built stores', body, note: snap.note });
  }

  /* ── shapes: the same product in many shapes ───────────────────────────── */
  if (view === 'shapes') {
    body += chip(VW / 2, 90, 'one product · five shapes', { icon: 'layers', iconVar: '--violet', w: 280, delay: 0.3 });
    const rows = kvStore(70, 150, { title: 'relational · rows', icon: 'grid', tone: 'accent', w: 270, delay: 0.5, rows: [
      { k: 'product_id', v: 'A1' }, { k: 'price_fk', v: '→ prices' },
    ] });
    body += rows.svg;
    const doc = docCard(380, 150, { name: 'document', icon: 'file', tone: 'violet', w: 280, delay: 0.7, lines: [
      { k: 'id', v: '"A1"' }, { k: 'name', v: '"Widget"' }, { k: 'specs', v: '{ … }', embed: true },
    ] });
    body += doc.svg;
    const idx = kvStore(700, 150, { title: 'search · inverted', icon: 'search', tone: 'green', w: 270, delay: 0.9, rows: [
      { k: '"widget"', v: '→ A1' }, { k: '"gadget"', v: '→ A1' },
    ] });
    body += idx.svg;
    const cache = kvStore(170, 400, { title: 'cache · blob', icon: 'bolt', tone: 'amber', w: 290, delay: 1.1, rows: [
      { k: 'prod:A1', v: '{blob}', hot: true },
    ] });
    body += cache.svg;
    const graph = kvStore(580, 400, { title: 'graph · node', icon: 'merge', tone: 'rose', w: 290, delay: 1.3, rows: [
      { k: 'A1', v: '— bought-with → B7' },
    ] });
    body += graph.svg;
    body += caption(VW / 2, 520, 'The same product is rows, a document, an inverted index, a cache blob and a graph node — each shaped for its query.', { delay: 1.7 });
    return assemble({ slug: 'polyglot-persistence', aria: 'One product projected into five different store shapes', body, note: snap.note });
  }

  /* ── sync: CDC stream projects changes outward ─────────────────────────── */
  if (view === 'sync') {
    const src = kvStore(80, 230, { title: 'system of record', icon: 'database', tone: 'accent', w: 250, delay: 0.3, rows: [
      { k: 'write', v: 'lands here', hot: true },
    ] });
    body += src.svg;
    const stream = kvStore(380, 235, { title: 'change stream (CDC)', icon: 'wal', tone: 'violet', w: 240, delay: 0.7, rows: [
      { k: 'event', v: 'A1 updated' },
    ] });
    body += stream.svg;
    body += arrow({ x: src.right, y: src.rowCy(0), side: 'right' }, { x: stream.left, y: stream.rowCy(0), side: 'left' }, { label: 'emit', delay: 1.1 }).svg;
    const consumers = [
      { t: 'search', ic: 'search', tone: 'green', y: 140 },
      { t: 'cache', ic: 'bolt', tone: 'amber', y: 235 },
      { t: 'warehouse', ic: 'layers', tone: 'slate', y: 330 },
    ];
    consumers.forEach((c, i) => {
      const kv = kvStore(720, c.y, { title: c.t, icon: c.ic, tone: c.tone, w: 240, delay: 1.0 + i * 0.12, rows: [{ k: 'project', v: 'A1' }] });
      body += kv.svg;
      body += arrow({ x: stream.right, y: stream.rowCy(0), side: 'right' }, { x: kv.left, y: kv.rowCy(0), side: 'left' }, { delay: 1.4 + i * 0.12 }).svg;
    });
    body += chip(VW / 2, 420, 'one ordered log → replay any projection', { icon: 'scroll', iconVar: '--accent', w: 340, delay: 1.9 });
    body += caption(VW / 2, 500, 'Writes hit the source of truth, which emits an ordered change stream — consumers project it into each derived store.', { delay: 2.1 });
    return assemble({ slug: 'polyglot-persistence', aria: 'A change stream projecting writes into the other stores', body, note: snap.note });
  }

  /* ── complexity: each store is another burden ──────────────────────────── */
  if (view === 'complexity') {
    body += band(70, 140, 900, 300, 'Six engines running', { sub: 'six ops playbooks · six lagging copies', delay: 0.3 });
    const items = [
      { pk: 'relational', type: 'truth', tone: 'accent', cells: ['scale', 'backup', 'secure'] },
      { pk: 'document', type: 'catalog', tone: 'violet', cells: ['scale', 'monitor', 'lags'] },
      { pk: 'search', type: 'full-text', tone: 'green', cells: ['reindex', 'monitor', 'lags'] },
      { pk: 'warehouse', type: 'analytics', tone: 'slate', cells: ['ETL', 'cost', 'lags'] },
    ];
    items.forEach((it, i) => { body += itemRow(130, 175 + i * 52, { ...it, w: 620, delay: 0.7 + i * 0.12, hot: i > 0 }).svg; });
    body += chip(820, 230, 'eventual consistency', { icon: 'clock', iconVar: '--amber', w: 230, delay: 1.5 });
    body += chip(820, 300, 'N ops burdens', { icon: 'alert', iconVar: '--red', w: 190, delay: 1.7 });
    body += caption(VW / 2, 500, 'Each store added is another system to run and another copy that lags the truth — fit bought with complexity.', { delay: 1.9 });
    return assemble({ slug: 'polyglot-persistence', aria: 'The operational complexity of running many stores', body, note: snap.note });
  }

  /* ── recap: one source feeding many purpose-built stores ───────────────── */
  const src = kvStore(80, 240, { title: 'source of truth', icon: 'database', tone: 'accent', w: 230, delay: 0.3, rows: [
    { k: 'relational', v: 'truth' },
  ] });
  body += src.svg;
  const stores = [
    { t: 'cache', ic: 'bolt', tone: 'amber', pat: 'sessions', y: 120 },
    { t: 'document', ic: 'file', tone: 'violet', pat: 'catalog', y: 210 },
    { t: 'search', ic: 'search', tone: 'green', pat: 'full-text', y: 300 },
    { t: 'graph', ic: 'merge', tone: 'rose', pat: 'recommend', y: 390 },
  ];
  stores.forEach((s, i) => {
    const kv = kvStore(640, s.y, { title: s.t, icon: s.ic, tone: s.tone, w: 300, delay: 0.7 + i * 0.1, rows: [{ k: s.pat, v: 'fit', hot: true }] });
    body += kv.svg;
    body += arrow({ x: src.right, y: src.rowCy(0), side: 'right' }, { x: kv.left, y: kv.rowCy(0), side: 'left' }, { delay: 1.1 + i * 0.1 }).svg;
  });
  body += tag(src.cx, src.top - 24, 'CDC feeds each', { tone: 'violet', delay: 1.6 });
  body += caption(VW / 2, 500, 'Shape the choice of store to the query, as you shape the data to the query — paying complexity only where a pattern earns it.', { delay: 1.9 });
  return assemble({ slug: 'polyglot-persistence', aria: 'One source of truth feeding several purpose-built stores', body, note: snap.note });
}
