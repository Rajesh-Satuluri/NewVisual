/* materialized-aggregates-scene.js — "Materialized Aggregates" on the NoSQL canvas
   (engine/nosql2d.js). The hero contrast: a partition stacked with raw LIKE events
   (scanned at read time) versus one maintained counter item read in O(1).

   Input: a view-snapshot { view, note }.
   Views: 'want-total', 'scanproblem', 'maintain', 'fastread', 'drift', 'recap'.
   Unknown → recap. */

import { partition, kvStore, itemRow, accessList, sweep, arrow, chip, tag, caption, assemble, VW } from '../engine/nosql2d.js';

/* the raw LIKE items piling up in post#9's partition */
const RAW_LIKES = [
  { t: 'LIKE · user#11', tone: 'violet' },
  { t: 'LIKE · user#27', tone: 'violet' },
  { t: 'LIKE · user#34', tone: 'violet' },
  { t: 'LIKE · user#52', tone: 'violet' },
  { t: 'LIKE · user#61', tone: 'violet' },
  { t: '… millions more', tone: 'rose', hot: true },
];

export function renderMaterializedAggregatesScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── setup: the read asks for one number ───────────────────────────────── */
  if (view === 'want-total') {
    const al = accessList(90, 170, {
      title: 'Access pattern', icon: 'target', tone: 'accent', w: 360, delay: 0.3,
      patterns: [
        { t: 'show like count for post#9', done: false, hot: true },
        { t: '… on every feed render', done: false },
      ],
    });
    body += al.svg;
    const part = partition(590, 150, {
      label: 'PK = POST#9', sub: 'raw truth', tone: 'violet', w: 320, delay: 0.6,
      items: RAW_LIKES,
    });
    body += part.svg;
    body += arrow({ x: al.right, y: al.bottom - 40, side: 'right' }, { x: part.left, y: part.headCy + 20, side: 'left' }, { label: 'how many?', delay: 1.2 }).svg;
    body += caption(VW / 2, 520, 'The feed wants one number — the like count — out of one LIKE item per user who liked the post.', { delay: 1.5 });
    return assemble({ slug: 'materialized-aggregates', aria: 'A read asking for a count over a partition of raw items', body, note: snap.note });
  }

  /* ── problem: COUNT(*) scans the whole partition ───────────────────────── */
  if (view === 'scanproblem') {
    const part = partition(360, 120, {
      label: 'PK = POST#9', sub: 'scan to count', tone: 'rose', w: 320, delay: 0.3, hot: true,
      items: RAW_LIKES,
    });
    body += part.svg;
    const sweepTop = part.slotCy(0) - 16;
    body += sweep(372, sweepTop, 296, part.bottom - sweepTop - 10, { delay: 1.0 });
    body += chip(part.cx, part.top - 22, 'COUNT(*) — read every item', { icon: 'search', iconVar: '--red', w: 282, delay: 1.3 });
    body += chip(part.right + 150, part.slotCy(5), 'unbounded read cost', { icon: 'alert', iconVar: '--red', w: 216, delay: 1.5 });
    body += caption(VW / 2, part.bottom + 40, 'No aggregate-on-read at scale: the count scans the whole partition — millions of items, on every render.', { delay: 1.7 });
    return assemble({ slug: 'materialized-aggregates', aria: 'Counting by scanning the whole partition', body, note: snap.note });
  }

  /* ── maintain: a write stores the fact AND increments the counter ──────── */
  if (view === 'maintain') {
    const part = partition(80, 150, {
      label: 'PK = POST#9', sub: 'raw events', tone: 'violet', w: 300, delay: 0.3,
      items: [
        { t: 'LIKE · user#11', tone: 'violet' },
        { t: 'LIKE · user#27', tone: 'violet' },
        { t: 'LIKE · user#88  (new)', tone: 'accent', hot: true },
      ],
    });
    body += part.svg;
    const sum = kvStore(640, 190, {
      title: 'POST#9 / META', icon: 'layers', tone: 'accent', w: 320, delay: 0.6,
      rows: [{ k: 'likes_count', v: '8  →  9', hot: true }],
    });
    body += sum.svg;
    body += chip(VW / 2, 110, 'one write · two updates', { icon: 'wal', iconVar: '--accent', w: 240, delay: 0.3 });
    body += arrow({ x: part.right, y: part.slotCy(2), side: 'right' }, { x: sum.left, y: sum.rowCy(0), side: 'left' }, { label: '+= 1', delay: 1.2 }).svg;
    body += caption(VW / 2, 470, 'The like writes the raw item and atomically increments the maintained counter — write amplification, paid once per event.', { delay: 1.6 });
    return assemble({ slug: 'materialized-aggregates', aria: 'A write storing the raw fact and incrementing the aggregate', body, note: snap.note });
  }

  /* ── fastread: the read is one point lookup of the summary item ────────── */
  if (view === 'fastread') {
    const al = accessList(90, 190, {
      title: 'Access pattern', icon: 'target', tone: 'accent', w: 340, delay: 0.3,
      patterns: [{ t: 'GET POST#9 / META', done: true }],
    });
    body += al.svg;
    const sum = kvStore(600, 180, {
      title: 'POST#9 / META', icon: 'layers', tone: 'accent', w: 340, delay: 0.5,
      rows: [{ k: 'likes_count', v: '9', hot: true }],
    });
    body += sum.svg;
    body += arrow({ x: al.right, y: al.rowCy ? al.rowCy(0) : al.bottom - 30, side: 'right' }, { x: sum.left, y: sum.rowCy(0), side: 'left' }, { label: 'O(1)', delay: 1.1 }).svg;
    body += chip(sum.cx, sum.top - 24, 'one item read', { icon: 'bolt', iconVar: '--green', w: 180, delay: 1.4 });
    body += caption(VW / 2, 470, 'The read is a single point lookup of likes_count — O(1), whether the post has nine likes or nine million.', { delay: 1.6 });
    return assemble({ slug: 'materialized-aggregates', aria: 'Reading the materialized counter in one lookup', body, note: snap.note });
  }

  /* ── drift: the counter disagrees with the raw truth ───────────────────── */
  if (view === 'drift') {
    const part = partition(80, 140, {
      label: 'PK = POST#9', sub: 'ground truth', tone: 'violet', w: 300, delay: 0.3,
      items: [
        { t: 'LIKE · user#11', tone: 'violet' },
        { t: 'LIKE · user#27', tone: 'violet' },
        { t: '… 9 items total', tone: 'green' },
      ],
    });
    body += part.svg;
    const sum = kvStore(640, 170, {
      title: 'POST#9 / META', icon: 'layers', tone: 'rose', w: 320, delay: 0.6,
      rows: [{ k: 'likes_count', v: '7  (drifted)', hot: true }],
    });
    body += sum.svg;
    body += chip(sum.cx, sum.top - 24, 'lost update → drift', { icon: 'alert', iconVar: '--red', w: 220, delay: 1.2 });
    body += arrow({ x: part.right, y: part.slotCy(2), side: 'right' }, { x: sum.left, y: sum.rowCy(0), side: 'left' }, { label: 'reconcile', delay: 1.4, ghost: true }).svg;
    body += caption(VW / 2, 480, 'The counter says 7 but the items total 9: atomic increments prevent races, periodic reconciliation heals the drift.', { delay: 1.7 });
    return assemble({ slug: 'materialized-aggregates', aria: 'A drifted counter reconciled against the raw items', body, note: snap.note });
  }

  /* ── recap: raw events + one maintained summary item ───────────────────── */
  const part = partition(80, 150, {
    label: 'PK = POST#9', sub: 'raw events', tone: 'violet', w: 300, delay: 0.3,
    items: [
      { t: 'LIKE · user#11', tone: 'violet' },
      { t: 'LIKE · user#27', tone: 'violet' },
      { t: 'LIKE · user#88', tone: 'violet' },
    ],
  });
  body += part.svg;
  const sum = kvStore(640, 190, {
    title: 'POST#9 / META', icon: 'layers', tone: 'accent', w: 320, delay: 0.6,
    rows: [{ k: 'likes_count', v: '9', hot: true }],
  });
  body += sum.svg;
  body += tag(sum.cx, sum.top - 24, 'materialized aggregate', { tone: 'violet', delay: 1.2 });
  body += arrow({ x: part.right, y: part.slotCy(1), side: 'right' }, { x: sum.left, y: sum.rowCy(0), side: 'left' }, { label: 'maintain on write', delay: 1.0 }).svg;
  body += chip(VW / 2, 470, 'write: O(n) events · read: O(1)', { icon: 'bolt', iconVar: '--green', w: 300, delay: 1.5 });
  body += caption(VW / 2, 510, 'Precompute on write what SQL would GROUP BY on read — every read then serves the finished number in O(1).', { delay: 1.7 });
  return assemble({ slug: 'materialized-aggregates', aria: 'Raw events beside one maintained summary item', body, note: snap.note });
}
