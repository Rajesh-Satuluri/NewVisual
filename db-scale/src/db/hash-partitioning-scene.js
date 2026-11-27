/* hash-partitioning-scene.js — the "Hash Partitioning" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'hotspot' (sequential keys clump on one node), 'hashfn' (keys flow
   through hash() and scatter evenly), 'lookup' (hash routes a point read in one
   hop), 'range' (a scan fans out to every partition), 'resize' (N:3→4 reshuffles
   most keys), 'recap' (even load, fast points, costly ranges). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const ROWY = 320;
const X3 = [230, 520, 810];
const X4 = [180, 420, 660, 900];

export function renderHashPartitioningScene(snap, opts = {}) {
  const view = snap.view || 'hashfn';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a node; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 48, o.h || 44, mat, {
      icon: o.icon || 'database', label, sub: o.sub || '', iconSize: 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // a small key chip floating at (x,y)
  const keyChip = (x, y, t, cls) => pill(x, y, t, { icon: 'key', cls: cls || 'pill--sst', w: 86 });

  /* ── HOTSPOT: sequential keys clump onto node 1 ────────────────────────── */
  if (view === 'hotspot') {
    node(X3[0], ROWY, 'P1', 'rose', { halo: true, sub: 'hot · 72%' });
    node(X3[1], ROWY, 'P2', 'slate', { ghost: true, sub: 'idle' });
    node(X3[2], ROWY, 'P3', 'slate', { ghost: true, sub: 'idle' });
    // incoming sequential keys all funnel to P1
    const keys = ['id:1001', 'id:1002', 'id:1003', 'id:1004'];
    keys.forEach((k, i) => badges.push(keyChip(150 + i * 150, 120, k)));
    keys.forEach((k, i) => {
      const e = edge([V(150 + i * 150, 138), V((150 + i * 150 + X3[0]) / 2, 210), V(X3[0], ROWY - 32)], { arrow: true });
      guides.push(e.guide); if (i === 0) railOut = e.d;
    });
    badges.push(pill(X3[0], 176, 'range A–I → all recent IDs', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(140, 418, 760, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="456" text-anchor="middle">ONE NODE SATURATED · TWO NODES WASTED</text>`);
    cap(VW / 2, 540, 'range partitioning clumps adjacent keys — traffic skews to one node');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── HASHFN: keys pass through hash() and scatter evenly ───────────────── */
  if (view === 'hashfn') {
    // the hash function box at the top-centre
    node(VW / 2, 120, 'hash()', 'amber', { icon: 'merge', rx: 58, h: 40, sub: 'uniform out' });
    // three even partitions
    X3.forEach((x, i) => node(x, ROWY, 'P' + (i + 1), 'green', { sub: '~33%' }));
    // incoming keys enter the hash
    const keys = ['user:1', 'user:2', 'user:3'];
    keys.forEach((k, i) => badges.push(keyChip(220 + i * 300, 56, k)));
    keys.forEach((k, i) => {
      const e = edge([V(220 + i * 300, 74), V(VW / 2, 96)], { arrow: true });
      guides.push(e.guide);
    });
    // hash fans out to a DIFFERENT partition than input order (scatter)
    const target = [2, 0, 1];
    target.forEach((t, i) => {
      const e = edge([V(VW / 2 + (i - 1) * 30, 158), V((VW / 2 + X3[t]) / 2, 230), V(X3[t], ROWY - 32)], { arrow: true });
      guides.push(e.guide); if (i === 0) railOut = e.d;
    });
    badges.push(region(120, 268, 820, 150, 'even load · no hotspot', { r: 22 }));
    cap(VW / 2, 540, 'the hash erases input clustering — output is an even sprinkle');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LOOKUP: hash(key) mod N routes a point read in one hop ────────────── */
  if (view === 'lookup') {
    const owner = 1;
    X3.forEach((x, i) => node(x, ROWY, 'P' + (i + 1), i === owner ? 'blue' : 'slate',
      { halo: i === owner, ghost: i !== owner, sub: i === owner ? 'owner' : '' }));
    node(VW / 2, 110, 'client', 'green', { icon: 'app', rx: 46, h: 40 });
    badges.push(keyChip(VW / 2, 172, 'get user:42', 'pill--sst'));
    badges.push(pill(VW / 2, 212, 'hash(user:42) mod 3 = 1', { icon: 'merge' }));
    // single hop straight to the owner
    const e = edge([V(VW / 2, 142), V((VW / 2 + X3[owner]) / 2, 250), V(X3[owner], ROWY - 32)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    // reply back
    const r = edge([V(X3[owner], ROWY - 32), V((VW / 2 + X3[owner]) / 2 + 40, 250), V(VW / 2 + 30, 142)], { arrow: true, dashed: true });
    guides.push(r.guide); railIn = r.d;
    badges.push(pill(X3[owner], 176, 'ONE HOP ✓', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 540, 'deterministic hash → the same key always finds its one owning node');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RANGE: a range scan fans out to every partition ───────────────────── */
  if (view === 'range') {
    X3.forEach((x, i) => node(x, ROWY, 'P' + (i + 1), 'lilac', { halo: true, sub: 'scan' }));
    node(VW / 2, 110, 'client', 'green', { icon: 'app', rx: 46, h: 40 });
    badges.push(keyChip(VW / 2, 172, 'orders: Mon', 'pill--sst'));
    // fan out to all three
    X3.forEach((x, i) => {
      const e = edge([V(VW / 2, 142), V((VW / 2 + x) / 2, 250), V(x, ROWY - 32)], { arrow: true });
      guides.push(e.guide); if (i === 0) railOut = e.d;
    });
    badges.push(pill(VW / 2, 212, 'adjacent keys scattered everywhere', { icon: 'alert' }));
    badges.push(region(140, 418, 760, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="456" text-anchor="middle">SCATTER-GATHER · HIT ALL N · MERGE</text>`);
    cap(VW / 2, 540, 'hashing destroyed ordering — one range query must sweep the whole cluster');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RESIZE: N 3→4 reshuffles most keys ────────────────────────────────── */
  if (view === 'resize') {
    X4.forEach((x, i) => node(x, ROWY, 'P' + (i + 1), i === 3 ? 'green' : 'rose',
      { halo: i === 3, ghost: i !== 3, sub: i === 3 ? 'new' : 'remap' }));
    badges.push(pill(300, 150, 'hash(key) mod 3', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(pill(740, 150, 'hash(key) mod 4', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, 192, '≠ for most keys', { icon: 'alert' }));
    // churn arrows between old partitions
    const churn = [[X4[0], X4[2]], [X4[1], X4[3]], [X4[2], X4[1]]];
    churn.forEach(([a, b], i) => {
      const e = edge([V(a, ROWY + 42), V((a + b) / 2, ROWY + 118), V(b, ROWY + 42)], { arrow: true, dashed: true });
      guides.push(e.guide);
    });
    badges.push(region(140, 452, 760, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="490" text-anchor="middle">ADD ONE NODE · NEARLY EVERY KEY MOVES</text>`);
    cap(VW / 2, 566, 'naive mod N: resizing drags most of the dataset across the network');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: even load, fast points, costly ranges ──────────────────────── */
  X3.forEach((x, i) => node(x, ROWY, 'P' + (i + 1), 'green', { halo: i === 1, sub: '~33%' }));
  badges.push(region(118, 150, 804, 110, 'hash(key) mod N → uniform load', { r: 24 }));
  const tags = ['even load · no hotspots', 'point reads: one hop', 'range scans: fan out to all N'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 440 + i * 44, t, { icon: 'check', w: 340 })));
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
  <svg class="scene scene--hash-partitioning" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Hash partitioning">
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
