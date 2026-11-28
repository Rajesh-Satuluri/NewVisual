/* partition-clustering-keys-scene.js — "Partition & Clustering Keys" on the NoSQL
   canvas (engine/nosql2d.js). The hero is physical routing: rows hash into partition
   bins by the partition key, then sort within by the clustering key; a bad key skews.

   Input: a view-snapshot { view, note }.
   Views: 'twopart', 'route', 'sort', 'query', 'skew', 'recap'. Unknown → recap. */

import { partition, itemRow, kvStore, sweep, arrow, chip, tag, caption, assemble, VW } from '../engine/nosql2d.js';

export function renderPartitionClusteringKeysScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── twopart: the compound key split into its two jobs ─────────────────── */
  if (view === 'twopart') {
    body += chip(VW / 2, 110, 'PRIMARY KEY  ( user_id , ts )', { icon: 'key', w: 320, delay: 0.3 });
    const a = kvStore(140, 200, {
      title: 'partition key', icon: 'grid', tone: 'accent', w: 360, delay: 0.7,
      rows: [{ k: 'user_id', v: 'which node / partition' }, { k: 'job', v: 'placement + co-location' }],
    });
    const b = kvStore(560, 200, {
      title: 'clustering key', icon: 'listOrdered', tone: 'violet', w: 360, delay: 0.95,
      rows: [{ k: 'ts', v: 'order within partition' }, { k: 'job', v: 'range reads' }],
    });
    body += a.svg + b.svg;
    body += tag(a.left + 90, a.top - 16, 'where', { tone: 'accent', delay: 1.3 });
    body += tag(b.left + 90, b.top - 16, 'order', { tone: 'violet', delay: 1.4 });
    body += caption(VW / 2, 420, 'One compound key, two jobs: the partition key places the row, the clustering key orders it within the partition.', { delay: 1.6 });
    return assemble({ slug: 'partition-clustering-keys', aria: 'A compound key split into partition and clustering parts', body, note: snap.note });
  }

  /* ── route: rows hashing into partition bins by partition key ───────────── */
  if (view === 'route') {
    const src = kvStore(60, 200, {
      title: 'rows', icon: 'database', tone: 'slate', w: 230, delay: 0.3,
      rows: [{ k: 'user_id', v: '42' }, { k: 'user_id', v: '43' }, { k: 'user_id', v: '42' }],
    });
    body += src.svg;
    const bins = [
      partition(420, 150, { label: 'p#0', sub: 'node A', tone: 'accent', w: 180, h: 200, delay: 0.8, items: [{ t: 'user_id=42', tone: 'accent' }, { t: 'user_id=42', tone: 'accent' }] }),
      partition(640, 150, { label: 'p#1', sub: 'node B', tone: 'green', w: 180, h: 200, delay: 0.95, items: [{ t: 'user_id=43', tone: 'green' }] }),
      partition(860, 150, { label: 'p#2', sub: 'node C', tone: 'violet', w: 150, h: 200, delay: 1.1, items: [] }),
    ];
    bins.forEach(b => { body += b.svg; });
    body += chip(355, 130, 'hash(user_id)', { icon: 'merge', iconVar: '--accent', w: 160, delay: 0.6 });
    body += arrow({ x: src.right, y: src.rowCy(0), side: 'right' }, { x: bins[0].left, y: bins[0].slotCy(0), side: 'left' }, { delay: 1.3 }).svg;
    body += arrow({ x: src.right, y: src.rowCy(1), side: 'right' }, { x: bins[1].left, y: bins[1].slotCy(0), side: 'left' }, { delay: 1.45 }).svg;
    body += caption(VW / 2, 430, 'The partition key is hashed to a node — same key co-locates, different keys scatter across the ring.', { delay: 1.7 });
    return assemble({ slug: 'partition-clustering-keys', aria: 'Rows routing into partitions by hash of the partition key', body, note: snap.note });
  }

  /* ── sort: rows within one partition sorted by clustering key ───────────── */
  if (view === 'sort') {
    const p = partition(330, 130, {
      label: 'user_id = 42', sub: 'one partition', tone: 'accent', w: 380, h: 280, delay: 0.3,
      items: [
        { t: 'ts = 09:31   login', tone: 'accent' },
        { t: 'ts = 11:04   view', tone: 'accent' },
        { t: 'ts = 13:40   cart', tone: 'accent' },
        { t: 'ts = 15:12   checkout', tone: 'violet' },
        { t: 'ts = 16:18   logout', tone: 'violet' },
      ],
    });
    body += p.svg;
    body += chip(p.right + 150, p.slotCy(2), 'sorted by ts', { icon: 'listOrdered', iconVar: '--accent', w: 164, delay: 1.0 });
    body += tag(p.cx, p.top - 22, 'ordered sequence', { tone: 'violet', delay: 1.2 });
    body += caption(VW / 2, p.bottom + 34, 'Within the partition the clustering key fixes the on-disk order — an ordered run you can seek into and range-scan.', { delay: 1.5 });
    return assemble({ slug: 'partition-clustering-keys', aria: 'Rows sorted within a partition by the clustering key', body, note: snap.note });
  }

  /* ── query: one partition selected, clustering range swept ─────────────── */
  if (view === 'query') {
    const p = partition(340, 130, {
      label: 'user_id = 42', sub: 'one partition', tone: 'accent', w: 360, h: 280, delay: 0.3,
      items: [
        { t: 'ts = 09:31   login', tone: 'slate' },
        { t: 'ts = 13:40   cart', tone: 'accent' },
        { t: 'ts = 15:12   checkout', tone: 'accent' },
        { t: 'ts = 16:18   logout', tone: 'accent' },
        { t: 'ts = 18:02   login', tone: 'accent' },
      ],
    });
    body += p.svg;
    const sweepTop = p.slotCy(1) - 16;
    body += sweep(352, sweepTop, 336, p.slotCy(4) + 16 - sweepTop, { delay: 1.1 });
    body += chip(p.cx, p.top - 22, 'user_id=42 AND ts > last_week', { icon: 'search', iconVar: '--accent', w: 320, delay: 1.4 });
    body += chip(VW / 2, p.bottom + 28, 'one seek · one contiguous range', { icon: 'bolt', iconVar: '--green', w: 300, delay: 1.6 });
    body += caption(VW / 2, p.bottom + 66, 'Partition key equality plus a clustering-key range: one node, one seek — the shape your key must be modeled to serve.', { delay: 1.8 });
    return assemble({ slug: 'partition-clustering-keys', aria: 'A query selecting one partition and sweeping a clustering range', body, note: snap.note });
  }

  /* ── skew: low-cardinality partition key piles onto one hot bin ────────── */
  if (view === 'skew') {
    const hot = partition(120, 140, {
      label: 'country = US', sub: 'partition', tone: 'rose', w: 250, h: 300, delay: 0.4, hot: true,
      items: [
        { t: 'row', tone: 'rose' }, { t: 'row', tone: 'rose' }, { t: 'row', tone: 'rose' },
        { t: 'row', tone: 'rose' }, { t: 'row', tone: 'rose' }, { t: '… millions', tone: 'rose' },
      ],
    });
    const b = partition(420, 140, { label: 'country = IS', sub: 'partition', tone: 'slate', w: 230, h: 300, delay: 0.7, items: [{ t: 'row', tone: 'slate' }] });
    const c = partition(700, 140, { label: 'country = LU', sub: 'partition', tone: 'slate', w: 230, h: 300, delay: 0.85, items: [{ t: 'row', tone: 'slate' }] });
    body += hot.svg + b.svg + c.svg;
    body += chip(hot.cx, hot.top - 22, 'hot partition', { icon: 'bolt', iconVar: '--red', w: 150, delay: 1.3 });
    body += caption(VW / 2, 480, 'A low-cardinality partition key sends most rows and traffic to one node — it saturates while its peers sit idle.', { delay: 1.6 });
    return assemble({ slug: 'partition-clustering-keys', aria: 'A low-cardinality partition key creating a hot partition', body, note: snap.note });
  }

  /* ── recap: a well-chosen key — even spread, sorted within ──────────────── */
  const bins = [
    partition(90, 150, { label: 'user#42', sub: 'node A', tone: 'accent', w: 280, h: 230, delay: 0.3, items: [{ t: 'ts=09:31', tone: 'accent' }, { t: 'ts=13:40', tone: 'accent' }, { t: 'ts=16:18', tone: 'violet' }] }),
    partition(390, 150, { label: 'user#43', sub: 'node B', tone: 'green', w: 280, h: 230, delay: 0.5, items: [{ t: 'ts=10:02', tone: 'green' }, { t: 'ts=14:55', tone: 'violet' }] }),
    partition(690, 150, { label: 'user#44', sub: 'node C', tone: 'violet', w: 280, h: 230, delay: 0.7, items: [{ t: 'ts=08:10', tone: 'violet' }, { t: 'ts=12:20', tone: 'accent' }, { t: 'ts=17:40', tone: 'green' }] }),
  ];
  bins.forEach(b => { body += b.svg; });
  body += chip(VW / 2, 110, 'even spread · sorted within', { icon: 'scale', iconVar: '--green', w: 280, delay: 1.0 });
  body += caption(VW / 2, 440, 'A high-cardinality partition key spreads load across nodes; the clustering key orders each partition for range reads.', { delay: 1.4 });
  return assemble({ slug: 'partition-clustering-keys', aria: 'A well-chosen compound key spreading load and sorting within', body, note: snap.note });
}
