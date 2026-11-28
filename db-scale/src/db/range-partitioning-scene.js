/* range-partitioning-scene.js — the "Range Partitioning" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'scatter' (a range query fans out to every partition), 'ranges' (the
   sorted key line cut into contiguous buckets), 'routing' (routing table + a
   scan overlapping two ranges), 'hotspot' (monotonic keys burn the newest
   range), 'split' (a hot range splits and half moves away), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* four partition slots across the middle band, plus a key-line band up top */
const ROWY = 320;
const P4 = [180, 440, 700, 940];
const KEYY = 150;            // sorted key-line band

export function renderRangePartitioningScene(snap, opts = {}) {
  const view = snap.view || 'ranges';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a partition cube; caller keeps the coords, we never read them back
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 50, o.h || 44, mat, {
      icon: o.icon || 'database', label, sub: o.sub || '', iconSize: 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // a sorted key-line of lettered ticks across the top; returns the x of each tick
  const KEYS = ['A', 'D', 'G', 'J', 'M', 'P', 'S', 'V', 'Z'];
  const keyX = (i) => 150 + i * ((VW - 300) / (KEYS.length - 1));
  const drawKeyLine = (bounds) => {
    // bounds: array of tick-indices where a range boundary sits
    const x0 = keyX(0), x1 = keyX(KEYS.length - 1);
    overlays.push(`<line class="iso-seam" x1="${A(x0)}" y1="${A(KEYY)}" x2="${A(x1)}" y2="${A(KEYY)}"/>`);
    KEYS.forEach((k, i) => {
      const x = keyX(i);
      overlays.push(`<line class="iso-seam" x1="${A(x)}" y1="${A(KEYY - 6)}" x2="${A(x)}" y2="${A(KEYY + 6)}"/>`);
      overlays.push(`<text class="sst-cap" x="${A(x)}" y="${A(KEYY - 14)}" text-anchor="middle">${esc(k)}</text>`);
    });
    (bounds || []).forEach(i => {
      const x = keyX(i);
      overlays.push(`<line class="iso-edge is-dashed" x1="${A(x)}" y1="${A(KEYY - 26)}" x2="${A(x)}" y2="${A(KEYY + 26)}"/>`);
    });
  };

  const PART_MATS = ['blue', 'green', 'amber', 'lilac'];
  const RANGE_LBL = ['A–F', 'G–M', 'N–S', 'T–Z'];

  /* ── SCATTER: hashing spreads a range across all partitions ─────────────── */
  if (view === 'scatter') {
    P4.forEach((x, i) => node(x, ROWY, 'P' + (i + 1), 'slate', { sub: 'hashed' }));
    // a scan up top fans out to every partition
    node(VW / 2, 120, 'range scan', 'rose', { icon: 'search', rx: 54, h: 40 });
    P4.forEach((x, i) => {
      const e = edge([V(VW / 2, 158), V((VW / 2 + x) / 2, 230), V(x, ROWY - 32)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    badges.push(region(120, 406, 800, 96, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="444" text-anchor="middle">ONE WEEK OF KEYS · SPREAD ACROSS EVERY PARTITION</text>`);
    cap(VW / 2, 486, 'adjacent keys hash apart — the scan must touch all four nodes');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RANGES: sorted key line cut into contiguous buckets ────────────────── */
  if (view === 'ranges') {
    drawKeyLine([2, 4, 6]);          // boundaries after F, M, S
    P4.forEach((x, i) => node(x, ROWY, 'P' + (i + 1), PART_MATS[i], { sub: RANGE_LBL[i] }));
    // drop each bucket segment down to its partition
    const segX = [[0, 2], [2, 4], [4, 6], [6, 8]];
    segX.forEach((seg, i) => {
      const mid = (keyX(seg[0]) + keyX(seg[1])) / 2;
      const e = edge([V(mid, KEYY + 30), V((mid + P4[i]) / 2, 240), V(P4[i], ROWY - 34)], { arrow: true });
      guides.push(e.guide);
    });
    badges.push(pill(VW / 2, 470, 'contiguous ranges · sorted order preserved', { icon: 'check' }));
    cap(VW / 2, 510, 'neighbouring keys stay together — and the partitions stay ordered');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ROUTING: routing table + a scan overlapping two ranges ─────────────── */
  if (view === 'routing') {
    drawKeyLine([2, 4, 6]);
    // highlight the G–P scan span on the key line
    const sx = keyX(2), ex = keyX(5);
    overlays.push(`<rect class="iso-region" x="${A(sx)}" y="${A(KEYY - 22)}" width="${A(ex - sx)}" height="44" rx="10"/>`);
    overlays.push(`<text class="iso-pill__t" x="${A((sx + ex) / 2)}" y="${A(KEYY + 40)}" text-anchor="middle">scan: G … P</text>`);
    P4.forEach((x, i) => {
      const hit = i === 1 || i === 2;      // P2 (G–M) and P3 (N–S)
      node(x, ROWY, 'P' + (i + 1), hit ? PART_MATS[i] : 'slate',
        { halo: hit, ghost: !hit, sub: RANGE_LBL[i] });
    });
    // routing arrows only to the two overlapping partitions
    [1, 2].forEach((i, k) => {
      const e = edge([V((sx + ex) / 2, KEYY + 52), V((((sx + ex) / 2) + P4[i]) / 2, 250), V(P4[i], ROWY - 34)], { arrow: true });
      guides.push(e.guide);
      if (k === 0) railOut = e.d;
    });
    badges.push(pill(300, 236, 'routing table: A–F→P1  G–M→P2', { icon: 'listOrdered', cls: 'pill--sst' }));
    badges.push(pill(760, 236, 'N–S→P3  T–Z→P4', { icon: 'listOrdered', cls: 'pill--sst' }));
    cap(VW / 2, 490, 'a scan overlaps only P2 + P3 — two partitions answer, pre-sorted');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── HOTSPOT: monotonic keys all land in the newest range ───────────────── */
  if (view === 'hotspot') {
    drawKeyLine([2, 4, 6]);
    P4.forEach((x, i) => {
      const hot = i === 3;             // newest range P4
      node(x, ROWY, 'P' + (i + 1), hot ? 'rose' : 'slate',
        { halo: hot, ghost: !hot, sub: hot ? 'all writes' : 'idle' });
    });
    // a write source dumps everything onto the newest range
    node(VW / 2, 120, 'now()', 'amber', { icon: 'clock', rx: 46, h: 40 });
    const e = edge([V(VW / 2, 158), V((VW / 2 + P4[3]) / 2, 236), V(P4[3], ROWY - 34)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(P4[3], 232, 'newest range · HOT', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(120, 408, 800, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="446" text-anchor="middle">MONOTONIC KEY · ONE PARTITION TAKES EVERY WRITE</text>`);
    cap(VW / 2, 526, 'even placement ≠ even load — sequential keys build a bottleneck');
    flows.push({ id: 'out', kind: 'write', speed: 120, size: 7 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SPLIT: hot range splits, half moves to an idle node ────────────────── */
  if (view === 'split') {
    const X5 = [160, 360, 560, 760, 950];
    const mats = ['blue', 'green', 'amber', 'rose', 'lilac'];
    const subs = ['A–F', 'G–M', 'N–S', 'T–W', 'X–Z'];
    X5.forEach((x, i) => {
      const fresh = i === 3 || i === 4;   // the two halves of the former hot range
      node(x, ROWY, 'P' + (i + 1), mats[i], { halo: fresh, sub: subs[i] });
    });
    // show the split boundary between P4 and the new P5
    const bx = (X5[3] + X5[4]) / 2;
    const br = edge([V(bx, 220), V(bx, ROWY + 90)], { dashed: true, r: 2 });
    guides.push(br.guide);
    // a hand-off arrow from the old hot range to the freshly carved partition
    const mv = edge([V(X5[3], 232), V((X5[3] + X5[4]) / 2, 196), V(X5[4], 232)], { arrow: true });
    guides.push(mv.guide); railOut = mv.d;
    badges.push(pill(bx, 170, 'split T–Z → T–W | X–Z', { icon: 'scale', cls: 'pill--sst' }));
    badges.push(pill(X5[4], ROWY + 96, 'half moved to an idle node', { icon: 'merge', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'split the hot range at its midpoint — load halves, order preserved');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: sorted ranges, cheap scans, mind the hotspot ────────────────── */
  drawKeyLine([2, 4, 6]);
  P4.forEach((x, i) => node(x, ROWY, 'P' + (i + 1), PART_MATS[i], { halo: i === 3, sub: RANGE_LBL[i] }));
  badges.push(region(118, 410, 884, 150, 'range partitioning', { r: 24 }));
  const tags = ['sorted ranges → cheap scans', 'routing table picks overlap', 'split hot ranges to even load'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 444 + i * 42, t, { icon: 'check', w: 340 })));
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
  <svg class="scene scene--range-partitioning" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Range partitioning">
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
