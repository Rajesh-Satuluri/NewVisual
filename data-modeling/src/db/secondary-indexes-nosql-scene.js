/* secondary-indexes-nosql-scene.js — "Secondary Indexes (GSI/LSI)" on the NoSQL canvas
   (engine/nosql2d.js). The hero is reprojection: base items re-bucketed under a new key,
   and the write fan-out that keeps every index current.

   Input: a view-snapshot { view, note }.
   Views: 'gap', 'reproject', 'gsi', 'lsi', 'writecost', 'recap'. Unknown → recap. */

import { itemRow, partition, kvStore, accessList, arrow, chip, tag, band, caption, assemble, VW } from '../engine/nosql2d.js';

/* the base table items, keyed by (user_id, ts) */
const BASE_ITEMS = [
  { pk: 'USER#42', sk: 'ts#0931', type: 'Order', tone: 'accent', cells: ['status=shipped', '$80'] },
  { pk: 'USER#42', sk: 'ts#1104', type: 'Order', tone: 'accent', cells: ['status=new', '$20'] },
  { pk: 'USER#43', sk: 'ts#1020', type: 'Order', tone: 'violet', cells: ['status=shipped', '$55'] },
];

export function renderSecondaryIndexesNosqlScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── gap: a non-key query the base table can't serve ───────────────────── */
  if (view === 'gap') {
    body += chip(VW / 2, 92, 'base table · keyed by (user_id, ts)', { icon: 'database', w: 300, delay: 0.3 });
    BASE_ITEMS.forEach((it, i) => { body += itemRow(240, 140 + i * 52, { ...it, w: 560, delay: 0.3 + i * 0.12 }).svg; });
    body += chip(VW / 2, 340, 'query: status = shipped ?', { icon: 'search', iconVar: '--red', w: 240, delay: 1.1 });
    body += chip(VW / 2, 390, 'no partition → full table scan', { icon: 'alert', iconVar: '--red', w: 270, delay: 1.3 });
    body += caption(VW / 2, 470, 'The base key serves (user_id, ts). A query on status has no partition to seek to — the only path is a full scan.', { delay: 1.6 });
    return assemble({ slug: 'secondary-indexes-nosql', aria: 'A non-key query the base table cannot serve', body, note: snap.note });
  }

  /* ── reproject / gsi: base items re-bucketed under a new key ────────────── */
  if (view === 'reproject' || view === 'gsi') {
    const base = kvStore(60, 190, {
      title: 'base table · (user_id, ts)', icon: 'database', tone: 'slate', w: 300, delay: 0.3,
      rows: [
        { k: 'USER#42 · 0931', v: 'shipped' },
        { k: 'USER#42 · 1104', v: 'new' },
        { k: 'USER#43 · 1020', v: 'shipped' },
      ],
    });
    body += base.svg;
    const shipped = partition(620, 140, {
      label: 'status = shipped', sub: 'index partition', tone: 'accent', w: 330, h: 150, delay: 0.9,
      items: [{ t: 'USER#42 · 0931', tone: 'accent' }, { t: 'USER#43 · 1020', tone: 'violet' }],
    });
    const fresh = partition(620, 320, {
      label: 'status = new', sub: 'index partition', tone: 'green', w: 330, h: 110, delay: 1.05,
      items: [{ t: 'USER#42 · 1104', tone: 'green' }],
    });
    body += shipped.svg + fresh.svg;
    body += arrow({ x: base.right, y: base.rowCy(0), side: 'right' }, { x: shipped.left, y: shipped.slotCy(0), side: 'left' }, { label: 'reproject', delay: 1.3 }).svg;
    body += arrow({ x: base.right, y: base.rowCy(1), side: 'right' }, { x: fresh.left, y: fresh.slotCy(0), side: 'left' }, { delay: 1.45 }).svg;
    if (view === 'gsi') {
      body += chip(VW / 2, 92, 'GSI · partition=status, sort=ts', { icon: 'search', iconVar: '--accent', w: 310, delay: 0.5 });
      body += chip(785, 470, 'own partitioning · eventually consistent', { icon: 'clock', iconVar: '--amber', w: 320, delay: 1.6 });
      body += caption(VW / 2, 520, 'A GSI gives status its own partition key and partitioning, maintained asynchronously — so reads are eventually consistent.', { delay: 1.8 });
    } else {
      body += chip(VW / 2, 92, 'secondary index · a reprojection', { icon: 'layers', iconVar: '--accent', w: 300, delay: 0.5 });
      body += caption(VW / 2, 500, 'The same items re-bucketed under status — rows that shared no base partition now sit together, queried as their own table.', { delay: 1.7 });
    }
    return assemble({ slug: 'secondary-indexes-nosql', aria: 'Base items reprojected into an index under a new key', body, note: snap.note });
  }

  /* ── lsi: same partition key, alternate sort key ───────────────────────── */
  if (view === 'lsi') {
    const byTs = partition(90, 150, {
      label: 'USER#42', sub: 'base · sort by ts', tone: 'accent', w: 360, h: 240, delay: 0.3,
      items: [{ t: 'ts#0931 · $80', tone: 'accent' }, { t: 'ts#1104 · $20', tone: 'accent' }, { t: 'ts#1340 · $55', tone: 'accent' }],
    });
    const byAmt = partition(590, 150, {
      label: 'USER#42', sub: 'LSI · sort by amount', tone: 'violet', w: 360, h: 240, delay: 0.7,
      items: [{ t: '$20 · ts#1104', tone: 'violet' }, { t: '$55 · ts#1340', tone: 'violet' }, { t: '$80 · ts#0931', tone: 'violet' }],
    });
    body += byTs.svg + byAmt.svg;
    body += arrow({ x: byTs.right, y: byTs.slotCy(1), side: 'right' }, { x: byAmt.left, y: byAmt.slotCy(1), side: 'left' }, { label: 're-sort', delay: 1.2 }).svg;
    body += chip(VW / 2, 110, 'same partition key · new sort key', { icon: 'listOrdered', iconVar: '--violet', w: 300, delay: 1.0 });
    body += chip(byAmt.cx, byAmt.bottom + 26, 'strongly consistent', { icon: 'check', iconVar: '--green', w: 190, delay: 1.5 });
    body += caption(VW / 2, byAmt.bottom + 66, 'An LSI keeps the partition key and only re-orders within it — maintained on the same node, so reads are strongly consistent.', { delay: 1.7 });
    return assemble({ slug: 'secondary-indexes-nosql', aria: 'A local secondary index re-sorting within the same partition', body, note: snap.note });
  }

  /* ── writecost: one base write fans out to each index ──────────────────── */
  if (view === 'writecost') {
    const write = chip(150, 300, 'PutItem', { icon: 'wal', iconVar: '--accent', w: 150, delay: 0.3 });
    body += write;
    const base = kvStore(400, 120, { title: 'base table', icon: 'database', tone: 'accent', w: 230, delay: 0.6, rows: [{ k: 'write', v: '1' }] });
    const g1 = kvStore(400, 230, { title: 'GSI · status', icon: 'search', tone: 'violet', w: 230, delay: 0.75, rows: [{ k: 'write', v: '+1' }] });
    const g2 = kvStore(400, 340, { title: 'GSI · region', icon: 'search', tone: 'violet', w: 230, delay: 0.9, rows: [{ k: 'write', v: '+1' }] });
    const l1 = kvStore(400, 450, { title: 'LSI · amount', icon: 'listOrdered', tone: 'green', w: 230, delay: 1.05, rows: [{ k: 'write', v: '+1' }] });
    [base, g1, g2, l1].forEach(c => { body += c.svg; });
    body += arrow({ x: 225, y: 313, side: 'right' }, { x: base.left, y: base.rowCy(0), side: 'left' }, { delay: 1.2 }).svg;
    body += arrow({ x: 225, y: 313, side: 'right' }, { x: g1.left, y: g1.rowCy(0), side: 'left' }, { delay: 1.3 }).svg;
    body += arrow({ x: 225, y: 313, side: 'right' }, { x: g2.left, y: g2.rowCy(0), side: 'left' }, { delay: 1.4 }).svg;
    body += arrow({ x: 225, y: 313, side: 'right' }, { x: l1.left, y: l1.rowCy(0), side: 'left' }, { delay: 1.5 }).svg;
    body += chip(820, 300, '1 write → 4 writes', { icon: 'alert', iconVar: '--red', w: 210, delay: 1.7 });
    body += tag(820, 345, 'writeAmp 4×', { tone: 'rose', delay: 1.8 });
    body += caption(VW / 2, 540, 'Every base write fans out to each index — three indexes turn one write into four, and each index is a full copy to store.', { delay: 2.0 });
    return assemble({ slug: 'secondary-indexes-nosql', aria: 'One base write fanning out to three indexes', body, note: snap.note });
  }

  /* ── recap: base table + an index per access pattern ───────────────────── */
  const al = accessList(70, 150, {
    title: 'Access patterns → paths', tone: 'accent', w: 380, delay: 0.3,
    patterns: [
      { t: 'user’s orders by time   → base key', done: true },
      { t: 'orders by status        → GSI', done: true },
      { t: 'orders by region        → GSI', done: true },
      { t: 'user’s orders by amount → LSI', done: true },
    ],
  });
  body += al.svg;
  const base = kvStore(540, 160, { title: 'base + indexes', icon: 'layers', tone: 'violet', w: 410, delay: 0.7, rows: [
    { k: 'base (user_id, ts)', v: 'serves its pattern' },
    { k: 'GSI status / region', v: 'eventually consistent' },
    { k: 'LSI amount', v: 'strongly consistent' },
    { k: 'write amplification', v: '4×  · each a copy' },
  ] });
  body += base.svg;
  body += chip(745, 130, 'index per pattern', { icon: 'target', iconVar: '--accent', w: 200, delay: 1.3 });
  body += caption(VW / 2, 470, 'The base key serves one pattern; an index reprojects the data for each of the rest — paid for in write fan-out and storage.', { delay: 1.6 });
  return assemble({ slug: 'secondary-indexes-nosql', aria: 'A base table and an index per access pattern', body, note: snap.note });
}
