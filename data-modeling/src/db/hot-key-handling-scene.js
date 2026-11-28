/* hot-key-handling-scene.js — "Hot Keys & Write Sharding" on the NoSQL canvas
   (engine/nosql2d.js). The hero is a row of partition bins: level bars when load
   spreads, one red pulsing bin when a key goes hot, then a salted key fanning
   across every bin to flatten the skew again.

   Input: a view-snapshot { view, note }.
   Views: 'even', 'hotspot', 'causes', 'shard', 'readfanout', 'recap'. Unknown → recap. */

import { partition, kvStore, arrow, chip, tag, caption, assemble, VW } from '../engine/nosql2d.js';

/* four partition bins in a row, equal height */
const XS = [60, 305, 550, 795];
const PW = 210;
const PH = 230;
const PTOP = 150;

export function renderHotKeyHandlingScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── even: four balanced partitions ────────────────────────────────────── */
  if (view === 'even') {
    const loads = [
      { label: 'hash → p0', items: [{ t: 'user#7' }, { t: 'user#3' }] },
      { label: 'hash → p1', items: [{ t: 'user#9' }, { t: 'user#1' }] },
      { label: 'hash → p2', items: [{ t: 'user#4' }, { t: 'user#8' }] },
      { label: 'hash → p3', items: [{ t: 'user#2' }, { t: 'user#6' }] },
    ];
    loads.forEach((p, i) => {
      body += partition(XS[i], PTOP, {
        label: p.label, sub: `partition ${i}`, tone: 'accent', w: PW, h: PH, delay: 0.3 + i * 0.12,
        items: p.items.map(it => ({ ...it, tone: 'accent' })),
      }).svg;
    });
    body += chip(VW / 2, 110, 'load spreads evenly · skew ≈ 1.0', { icon: 'gauge', iconVar: '--green', w: 300, delay: 1.1 });
    body += caption(VW / 2, 430, 'Varied keys hash across every partition — capacity is the sum of all four nodes.', { delay: 1.3 });
    return assemble({ slug: 'hot-key-handling', aria: 'Four partitions carrying balanced load', body, note: snap.note });
  }

  /* ── hotspot: one saturated partition, three idle ──────────────────────── */
  if (view === 'hotspot') {
    const bins = [
      { label: 'hash → p0', sub: 'idle', tone: 'slate', hot: false, items: [{ t: '—' }] },
      { label: 'celebrity#1', sub: 'HOT partition', tone: 'rose', hot: true, items: [
        { t: 'write', tone: 'rose', hot: true }, { t: 'write', tone: 'rose', hot: true },
        { t: 'write', tone: 'rose', hot: true }, { t: 'throttled', tone: 'rose', hot: true },
      ] },
      { label: 'hash → p2', sub: 'idle', tone: 'slate', hot: false, items: [{ t: '—' }] },
      { label: 'hash → p3', sub: 'idle', tone: 'slate', hot: false, items: [{ t: '—' }] },
    ];
    bins.forEach((b, i) => {
      body += partition(XS[i], PTOP, {
        label: b.label, sub: b.sub, tone: b.tone, hot: b.hot, w: PW, h: PH, delay: 0.3 + i * 0.12,
        items: b.items,
      }).svg;
    });
    body += chip(VW / 2, 110, 'skew ≈ 8× · cluster capped at one node', { icon: 'bolt', iconVar: '--red', w: 330, delay: 1.1 });
    body += caption(VW / 2, 430, 'Every celebrity#1 request hashes to one partition — it saturates while the neighbours sit idle.', { delay: 1.3 });
    return assemble({ slug: 'hot-key-handling', aria: 'One hot partition saturated while three sit idle', body, note: snap.note });
  }

  /* ── causes: the three ways a key turns hot ────────────────────────────── */
  if (view === 'causes') {
    const celeb = partition(70, 150, {
      label: 'celebrity#1', sub: 'popularity skew', tone: 'rose', hot: true, w: 280, h: 190, delay: 0.3,
      items: [{ t: 'trending product', tone: 'rose', hot: true }, { t: 'viral user', tone: 'rose', hot: true }, { t: 'one huge tenant', tone: 'rose', hot: true }],
    });
    const lowcard = kvStore(380, 170, {
      title: 'low cardinality', icon: 'alert', tone: 'amber', w: 280, delay: 0.5,
      rows: [{ k: 'status', v: 'active | inactive' }, { k: 'country', v: 'US  (90% of rows)' }, { k: '→', v: 'few partitions used' }],
    });
    const mono = kvStore(690, 170, {
      title: 'monotonic key', icon: 'clock', tone: 'violet', w: 280, delay: 0.7,
      rows: [{ k: 'id', v: '1001 → 1002 → 1003' }, { k: 'ts', v: '12:00 → 12:01 …' }, { k: '→', v: 'always newest partition' }],
    });
    body += celeb.svg + lowcard.svg + mono.svg;
    body += caption(VW / 2, 440, 'Popularity skew, a low-cardinality flag, and a monotonic key all funnel traffic onto a single partition.', { delay: 1.4 });
    return assemble({ slug: 'hot-key-handling', aria: 'The three classic causes of a hot key', body, note: snap.note });
  }

  /* ── shard: one logical key salted across every partition ──────────────── */
  if (view === 'shard') {
    const src = kvStore(60, 250, {
      title: 'logical key', icon: 'key', tone: 'accent', w: 230, delay: 0.3,
      rows: [{ k: 'PK', v: 'PROD#A1' }, { k: 'salt', v: 'hash(itemId) % N' }],
    });
    body += src.svg;
    const shards = ['PROD#A1#0', 'PROD#A1#1', 'PROD#A1#2', 'PROD#A1#3'];
    const SX = [400, 560, 720, 880];
    const parts = shards.map((lbl, i) => partition(SX[i], 150, {
      label: lbl, sub: `shard ${i}`, tone: 'green', w: 148, h: 220, delay: 0.6 + i * 0.12,
      items: [{ t: 'writes', tone: 'green' }],
    }));
    parts.forEach(p => { body += p.svg; });
    parts.forEach((p, i) => {
      body += arrow({ x: src.right, y: src.rowCy(1), side: 'right' }, { x: p.left, y: p.headCy, side: 'left' }, { delay: 1.0 + i * 0.1 }).svg;
    });
    body += chip(VW / 2, 110, 'one key → N shards · skew divided by N', { icon: 'merge', iconVar: '--green', w: 320, delay: 1.5 });
    body += caption(VW / 2, 420, 'The shard suffix fans one hot key across N partitions — each now carries a fair share of the writes.', { delay: 1.7 });
    return assemble({ slug: 'hot-key-handling', aria: 'One logical key salted into N shards across partitions', body, note: snap.note });
  }

  /* ── readfanout: reading the whole key scatters across shards ───────────── */
  if (view === 'readfanout') {
    const shards = ['PROD#A1#0', 'PROD#A1#1', 'PROD#A1#2', 'PROD#A1#3'];
    const parts = shards.map((lbl, i) => partition(XS[i], 150, {
      label: lbl, sub: `shard ${i}`, tone: 'accent', w: PW, h: 180, delay: 0.3 + i * 0.1,
      items: [{ t: 'read', tone: 'accent' }],
    }));
    parts.forEach(p => { body += p.svg; });
    const gather = kvStore(360, 400, {
      title: 'gather + merge', icon: 'merge', tone: 'violet', w: 320, delay: 0.9,
      rows: [{ k: 'read PROD#A1', v: '= N shard reads' }, { k: 'then', v: 'merge results' }],
    });
    body += gather.svg;
    parts.forEach((p, i) => {
      body += arrow({ x: p.cx, y: p.bottom, side: 'right' }, { x: gather.left + 30 + i * 60, y: gather.top, side: 'left' }, { delay: 1.1 + i * 0.1 }).svg;
    });
    body += chip(VW / 2, 110, 'one read → N shard reads (scatter-gather)', { icon: 'search', iconVar: '--amber', w: 340, delay: 1.5 });
    body += caption(VW / 2, 545, 'The write spread is paid back on reads: the whole logical key means querying every shard and merging.', { delay: 1.7 });
    return assemble({ slug: 'hot-key-handling', aria: 'A read of the whole key fanning out across every shard', body, note: snap.note });
  }

  /* ── recap: salted key spread, bars level again ────────────────────────── */
  const bins = [
    { label: 'PROD#A1#0', items: [{ t: 'writes' }, { t: 'writes' }] },
    { label: 'PROD#A1#1', items: [{ t: 'writes' }, { t: 'writes' }] },
    { label: 'PROD#A1#2', items: [{ t: 'writes' }, { t: 'writes' }] },
    { label: 'PROD#A1#3', items: [{ t: 'writes' }, { t: 'writes' }] },
  ];
  bins.forEach((b, i) => {
    body += partition(XS[i], PTOP, {
      label: b.label, sub: `shard ${i}`, tone: 'green', w: PW, h: PH, delay: 0.3 + i * 0.12,
      items: b.items.map(it => ({ ...it, tone: 'green' })),
    }).svg;
  });
  body += tag(VW / 2, 120, 'skew ≈ 1.0 restored', { tone: 'green', delay: 1.1 });
  body += chip(VW / 2, 420, 'high-cardinality keys spread for free · salt the hot ones', { icon: 'gauge', iconVar: '--green', w: 420, delay: 1.3 });
  body += caption(VW / 2, 470, 'Level bars = full capacity: pick non-monotonic keys, salt the few that stay hot, and pay the read fan-out.', { delay: 1.5 });
  return assemble({ slug: 'hot-key-handling', aria: 'The salted key spread evenly with bars level again', body, note: snap.note });
}
