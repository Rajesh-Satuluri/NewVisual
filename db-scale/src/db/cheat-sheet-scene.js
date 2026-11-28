/* cheat-sheet-scene.js — the "Cheat Sheet" scene, in the shared
   Designed-to-Scale isometric vocabulary.

   Each view is a clean themed card: a few labelled iso cubes grouped in dashed
   regions with pill labels carrying the key facts and numbers.

   Input: a view-snapshot { view, note, ... }. Output: { svg, layer, rail,
   note, flows }.

   Views: 'latency', 'storage', 'acid', 'indexes', 'distributed', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderCheatSheetScene(snap, opts = {}) {
  const view = snap.view || 'latency';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'app', label, sub: o.sub || '', iconSize: o.iconSize || 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  const opTile = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 34, o.h || 20, mat, {
      icon: o.icon || '', label, iconSize: 13, ghost: !!o.ghost, halo: !!o.halo,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── LATENCY: the ladder, fast → slow ──────────────────────────────────── */
  if (view === 'latency') {
    badges.push(region(165, 215, 710, 185, '', { r: 22 }));
    const rungs = [
      [205, 'L1', '~1 ns', 'green', 'bolt'],
      [365, 'RAM', '~100 ns', 'green', 'database'],
      [525, 'SSD', '~16 µs', 'amber', 'file'],
      [685, 'DC RTT', '~0.5 ms', 'amber', 'globe'],
      [840, 'Disk', '~10 ms', 'rose', 'clock'],
    ];
    rungs.forEach(([x, l, s, m, ic], i) => {
      node(x, 305, l, m, { icon: ic, sub: s, rx: 44, h: 36 });
      if (i < rungs.length - 1) {
        const e = edge([V(x + 44, 300), V(rungs[i + 1][0] - 44, 300)], { arrow: true });
        guides.push(e.guide);
        if (i === 0) railOut = e.d;
      }
    });
    badges.push(pill(VW / 2, 245, 'fast → slow · each rung ~100–1000×', { icon: 'gauge', cls: 'pill--sst' }));
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 5 });
    cap(VW / 2, 500, 'caching turns the slow rungs into the fast ones');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── STORAGE: B+Tree vs LSM ────────────────────────────────────────────── */
  if (view === 'storage') {
    badges.push(region(165, 170, 330, 310, '', { r: 22 }));
    node(330, 232, 'B+Tree', 'blue', { icon: 'layers', sub: 'read-optimized', rx: 58, h: 46, halo: true });
    ['in-place update', 'sorted · range scans', 'write amp on split'].forEach((t, i) =>
      badges.push(pill(330, 330 + i * 44, t, { icon: 'check', cls: 'pill--sst', w: 250 })));
    badges.push(region(545, 170, 330, 310, '', { r: 22 }));
    node(710, 232, 'LSM', 'green', { icon: 'listOrdered', sub: 'write-optimized', rx: 58, h: 46, halo: true });
    ['append + compact', 'read amp over levels', 'bloom filter skips'].forEach((t, i) =>
      badges.push(pill(710, 330 + i * 44, t, { icon: 'check', cls: 'pill--sst', w: 250 })));
    cap(VW / 2, 500, 'read-heavy → B+Tree · write-heavy → LSM');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ACID + isolation levels ───────────────────────────────────────────── */
  if (view === 'acid') {
    node(VW / 2, 210, 'ACID', 'lilac', { icon: 'check', sub: 'atomic · consistent · isolated · durable', rx: 60, h: 46, halo: true });
    badges.push(region(225, 288, 590, 200, '', { r: 22 }));
    const lvls = [
      'Read Uncommitted → dirty read',
      'Read Committed → no dirty',
      'Repeatable Read → no non-repeatable',
      'Serializable → no phantom',
    ];
    lvls.forEach((t, i) => badges.push(pill(VW / 2, 326 + i * 42, t, { icon: 'key', cls: 'pill--sst', w: 420 })));
    cap(VW / 2, 500, 'each level forbids one more anomaly, at a concurrency cost');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── INDEXES: types & when ─────────────────────────────────────────────── */
  if (view === 'indexes') {
    badges.push(region(165, 205, 710, 215, '', { r: 22 }));
    const ix = [
      [240, 'B+Tree', 'range', 'blue', 'layers', 'equality + sort'],
      [430, 'Hash', 'equality', 'amber', 'key', 'no range scans'],
      [620, 'Bitmap', 'low-card', 'green', 'grid', 'AND/OR preds'],
      [810, 'Covering', 'index-only', 'lilac', 'check', 'skips the heap'],
    ];
    ix.forEach(([x, l, s, m, ic, use]) => {
      node(x, 278, l, m, { icon: ic, sub: s, rx: 42, h: 36 });
      badges.push(pill(x, 390, use, { cls: 'pill--sst', w: 150 }));
    });
    cap(VW / 2, 500, 'match the index to the query’s access pattern');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DISTRIBUTED: CAP · replication · partitioning ─────────────────────── */
  if (view === 'distributed') {
    const groups = [
      [275, 165, 'CAP', 'C or A', 'rose', 'scale', ['partition → pick one', 'C: reject stale', 'A: answer stale']],
      [520, 410, 'Replicate', 'sync/async', 'blue', 'merge', ['sync: safe / slow', 'async: fast / lossy']],
      [765, 655, 'Partition', 'hash/range', 'green', 'grid', ['hash: even load', 'range: scans + skew']],
    ];
    groups.forEach(([cx, rx0, l, s, m, ic, items]) => {
      badges.push(region(rx0, 165, 220, 320, '', { r: 20 }));
      node(cx, 232, l, m, { icon: ic, sub: s, rx: 52, h: 42, halo: true });
      items.forEach((t, i) => badges.push(pill(cx, 322 + i * 44, t, { icon: 'check', cls: 'pill--sst', w: 196 })));
    });
    cap(VW / 2, 500, 'three distributed trade-offs you choose on purpose');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the whole sheet ────────────────────────────────────────────── */
  badges.push(region(205, 175, 630, 315, '', { r: 24 }));
  node(VW / 2, 155, 'Cheat Sheet', 'slate', { icon: 'scroll', sub: 'one page', rx: 56, h: 40, halo: true });
  const lines = [
    'latency ladder — cache the slow rungs',
    'B+Tree read · LSM write',
    'ACID + isolation you dial',
    'match the index to the query',
    'CAP · sync/async · hash/range',
  ];
  lines.forEach((t, i) => badges.push(pill(VW / 2, 255 + i * 44, t, { icon: 'check', cls: 'pill--sst', w: 420 })));
  cap(VW / 2, 500, 'the whole course, compressed');
  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--cheat-sheet" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Cheat sheet">
    ${iso3dDefs()}
    ${grid}
    <g class="ground">${halos.join('')}${shadows.join('')}</g>
    <g class="regions">${regionBadges.join('')}</g>
    ${guides.join('')}
    ${rails}
    <g class="solids">${solids.join('')}</g>
    <g class="overlays">${overlays.join('')}</g>
    <g class="badges">${otherBadges.join('')}</g>
    <g class="flow-layer"></g>
  </svg>`;

  const wrap = document.createElement('div');
  wrap.innerHTML = svgStr;
  const svg = wrap.querySelector('svg');
  return {
    svg,
    layer: svg.querySelector('.flow-layer'),
    rail: (id) => svg.querySelector('#rail-' + id),
    flows: flows || [],
    note: note || '',
  };
}
