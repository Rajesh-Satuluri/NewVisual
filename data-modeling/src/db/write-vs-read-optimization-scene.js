/* write-vs-read-optimization-scene.js — "Write vs Read Optimization" on the NoSQL
   canvas (engine/nosql2d.js). The hero contrast: a write FANNING OUT into many
   follower feeds (read-optimized) versus a read GATHERING from many sources
   (write-optimized), shown side by side as two strategy columns.

   Input: a view-snapshot { view, note }.
   Views: 'dial', 'fanout-write', 'fanout-read', 'ratio', 'celebrity', 'recap'.
   Unknown → recap. */

import { band, docCard, itemRow, kvStore, arrow, chip, tag, caption, assemble, VW } from '../engine/nosql2d.js';

/* a small post document, reused across views */
function postCard(x, y, tone, delay) {
  return docCard(x, y, {
    name: 'post', icon: 'file', tone, w: 220, delay,
    lines: [
      { k: 'id', v: '"p#88"' },
      { k: 'author', v: '"ada"' },
      { k: 'text', v: '"shipped it"' },
    ],
  });
}

export function renderWriteVsReadOptimizationScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── setup: the dial between the two strategies ────────────────────────── */
  if (view === 'dial') {
    body += band(80, 150, 400, 300, 'Read-optimized', { sub: 'cheap reads · heavy writes', delay: 0.3 });
    body += band(560, 150, 400, 300, 'Write-optimized', { sub: 'cheap writes · heavy reads', delay: 0.5 });
    body += chip(280, 220, 'fan out on write', { icon: 'wal', iconVar: '--accent', w: 200, delay: 0.9 });
    body += chip(280, 290, 'read = 1 lookup', { icon: 'bolt', iconVar: '--green', w: 190, delay: 1.1 });
    body += chip(760, 220, 'store once', { icon: 'wal', iconVar: '--green', w: 160, delay: 1.0 });
    body += chip(760, 290, 'read = gather N', { icon: 'search', iconVar: '--amber', w: 200, delay: 1.2 });
    body += chip(VW / 2, 390, 'one dial — pick a side', { icon: 'sliders', iconVar: '--violet', w: 240, delay: 1.5 });
    body += caption(VW / 2, 500, 'Making reads cheap makes writes dear, and the reverse — modeling is choosing which operation pays.', { delay: 1.7 });
    return assemble({ slug: 'write-vs-read-optimization', aria: 'The dial between read-optimized and write-optimized layouts', body, note: snap.note });
  }

  /* ── fanout-write: one post copied into every follower feed ────────────── */
  if (view === 'fanout-write') {
    const post = postCard(80, 210, 'accent', 0.3);
    body += post.svg;
    body += chip(post.cx, post.top - 26, 'ada posts', { icon: 'wal', iconVar: '--accent', w: 150, delay: 0.9 });
    const feeds = ['feed · bob', 'feed · cas', 'feed · dot', 'feed · eve'];
    feeds.forEach((f, i) => {
      const fy = 150 + i * 72;
      const kv = kvStore(680, fy, { title: f, icon: 'layers', tone: 'violet', w: 280, delay: 0.6 + i * 0.12, rows: [{ k: 'p#88', v: 'copy', hot: true }] });
      body += kv.svg;
      body += arrow({ x: post.right, y: post.cy, side: 'right' }, { x: kv.left, y: kv.rowCy(0), side: 'left' }, { delay: 1.1 + i * 0.12 }).svg;
    });
    body += chip(430, 470, '1 post → N writes, N copies', { icon: 'alert', iconVar: '--amber', w: 280, delay: 1.7 });
    body += caption(VW / 2, 520, 'The write fans out a copy into every follower feed — heavy writes now, but each read is a single lookup.', { delay: 1.9 });
    return assemble({ slug: 'write-vs-read-optimization', aria: 'A post fanning out on write into many follower feeds', body, note: snap.note });
  }

  /* ── fanout-read: the read gathers from every followed account ─────────── */
  if (view === 'fanout-read') {
    const sources = ['posts · ada', 'posts · ben', 'posts · cas', 'posts · dot'];
    sources.forEach((sname, i) => {
      const fy = 150 + i * 72;
      const kv = kvStore(80, fy, { title: sname, icon: 'file', tone: 'green', w: 260, delay: 0.3 + i * 0.1, rows: [{ k: 'latest', v: '1 write' }] });
      body += kv.svg;
    });
    const feed = kvStore(640, 230, { title: 'timeline (assembled)', icon: 'merge', tone: 'amber', w: 320, delay: 0.9, rows: [
      { k: 'merge', v: '4 queries', hot: true }, { k: 'sort', v: 'by time' },
    ] });
    body += feed.svg;
    sources.forEach((_, i) => {
      const fy = 150 + i * 72 + 25;
      body += arrow({ x: 340, y: fy, side: 'right' }, { x: feed.left, y: feed.rowCy(0), side: 'left' }, { delay: 1.2 + i * 0.1 }).svg;
    });
    body += chip(feed.cx, feed.top - 26, 'gather on read', { icon: 'search', iconVar: '--amber', w: 190, delay: 1.7 });
    body += caption(VW / 2, 520, 'Each post is stored once; the read queries every followed account and merges — cheap writes, gather-heavy reads.', { delay: 1.9 });
    return assemble({ slug: 'write-vs-read-optimization', aria: 'A read gathering a timeline from many source partitions', body, note: snap.note });
  }

  /* ── ratio: the read:write ratio tips the dial ─────────────────────────── */
  if (view === 'ratio') {
    body += band(80, 150, 400, 280, 'Read-heavy', { sub: 'scroll often · post rarely', delay: 0.3 });
    body += band(560, 150, 400, 280, 'Write-heavy', { sub: 'log constantly · read seldom', delay: 0.5 });
    body += chip(280, 230, 'reads ≫ writes', { icon: 'gauge', iconVar: '--accent', w: 200, delay: 0.9 });
    body += chip(280, 310, '→ fan-out-on-write', { icon: 'bolt', iconVar: '--green', w: 230, delay: 1.1 });
    body += tag(280, 370, 'precompute the read', { tone: 'accent', delay: 1.3 });
    body += chip(760, 230, 'writes ≫ reads', { icon: 'gauge', iconVar: '--amber', w: 200, delay: 1.0 });
    body += chip(760, 310, '→ fan-out-on-read', { icon: 'search', iconVar: '--amber', w: 230, delay: 1.2 });
    body += tag(760, 370, 'assemble on read', { tone: 'violet', delay: 1.4 });
    body += caption(VW / 2, 490, 'Make the dominant operation the cheap one: a high read:write ratio precomputes, a write-heavy one assembles on read.', { delay: 1.7 });
    return assemble({ slug: 'write-vs-read-optimization', aria: 'The read-to-write ratio deciding which side to optimize', body, note: snap.note });
  }

  /* ── celebrity: huge fan-out breaks the write side ─────────────────────── */
  if (view === 'celebrity') {
    const post = postCard(80, 210, 'rose', 0.3);
    body += post.svg;
    body += chip(post.cx, post.top - 26, 'celebrity posts', { icon: 'bolt', iconVar: '--red', w: 190, delay: 0.9 });
    const tiers = ['feed · follower 1', 'feed · follower 2', 'feed · …', 'feed · 10,000,000'];
    tiers.forEach((f, i) => {
      const fy = 150 + i * 70;
      const kv = kvStore(680, fy, { title: f, icon: 'layers', tone: 'rose', w: 280, delay: 0.6 + i * 0.1, rows: [{ k: 'p#88', v: 'copy', hot: i === 3 }] });
      body += kv.svg;
      body += arrow({ x: post.right, y: post.cy, side: 'right' }, { x: kv.left, y: kv.rowCy(0), side: 'left' }, { delay: 1.1 + i * 0.1, ghost: i === 2 }).svg;
    });
    body += chip(430, 460, '1 post → 10M writes', { icon: 'alert', iconVar: '--red', w: 240, delay: 1.7 });
    body += chip(430, 505, 'hybrid: pull in on read', { icon: 'merge', iconVar: '--green', w: 240, delay: 1.9 });
    body += caption(VW / 2, 545, 'Huge fan-out turns one write into millions — so celebrities are stored once and merged in at read time instead.', { delay: 2.1 });
    return assemble({ slug: 'write-vs-read-optimization', aria: 'The celebrity fan-out problem on the write side', body, note: snap.note });
  }

  /* ── recap: the two strategies side by side ────────────────────────────── */
  body += band(80, 140, 400, 320, 'Fan-out on write', { sub: 'read-optimized', delay: 0.3 });
  body += band(560, 140, 400, 320, 'Fan-out on read', { sub: 'write-optimized', delay: 0.5 });
  const postR = postCard(140, 180, 'accent', 0.7);
  body += postR.svg;
  const fw = kvStore(300, 185, { title: 'N feeds', icon: 'layers', tone: 'violet', w: 150, delay: 1.0, rows: [{ k: 'copy', v: '×N', hot: true }] });
  body += fw.svg;
  body += arrow({ x: postR.right, y: postR.cy, side: 'right' }, { x: fw.left, y: fw.rowCy(0), side: 'left' }, { delay: 1.3 }).svg;
  body += chip(280, 420, 'writes: N · reads: 1', { icon: 'bolt', iconVar: '--green', w: 220, delay: 1.5 });
  const srcA = kvStore(600, 180, { title: 'posts · ada', icon: 'file', tone: 'green', w: 150, delay: 0.9, rows: [{ k: 'latest', v: '1' }] });
  const srcB = kvStore(600, 270, { title: 'posts · ben', icon: 'file', tone: 'green', w: 150, delay: 1.0, rows: [{ k: 'latest', v: '1' }] });
  body += srcA.svg + srcB.svg;
  const fr = kvStore(800, 220, { title: 'timeline', icon: 'merge', tone: 'amber', w: 140, delay: 1.1, rows: [{ k: 'merge', v: 'N', hot: true }] });
  body += fr.svg;
  body += arrow({ x: srcA.right, y: srcA.rowCy(0), side: 'right' }, { x: fr.left, y: fr.rowCy(0), side: 'left' }, { delay: 1.3 }).svg;
  body += arrow({ x: srcB.right, y: srcB.rowCy(0), side: 'right' }, { x: fr.left, y: fr.rowCy(0), side: 'left' }, { delay: 1.4 }).svg;
  body += chip(760, 420, 'writes: 1 · reads: N', { icon: 'search', iconVar: '--amber', w: 220, delay: 1.6 });
  body += caption(VW / 2, 500, 'No layout is cheap on both sides — pick the dominant operation and make it O(1), letting the rare one pay.', { delay: 1.9 });
  return assemble({ slug: 'write-vs-read-optimization', aria: 'Fan-out-on-write and fan-out-on-read compared side by side', body, note: snap.note });
}
