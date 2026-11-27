/* virtual-nodes-scene.js — the "Virtual Nodes" scene, in the shared
   Designed-to-Scale isometric vocabulary: a hash RING drawn as a routed guide,
   rounded iso cubes for physical machines, small tiles for vnode ticks (coloured
   by owning machine), soft shadows, halos, pill badges, dashed regions, a faded
   iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'single' (one token/node → uneven arcs), 'lumpy' (a join hands over one
   big arc), 'scatter' (each node owns many small vnodes), 'lookup' (key → vnode →
   machine), 'rebalance' (joiner pulls slivers from every node), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* ring geometry — an iso-squashed ellipse centred on the ground */
const C = { x: VW / 2, y: 300 };
const RRX = 212, RRY = 120;
const ringPt = (deg, kx = 1, ky = 1) => {
  const a = (deg - 90) * Math.PI / 180;
  return { x: C.x + RRX * kx * Math.cos(a), y: C.y + RRY * ky * Math.sin(a) };
};

const MATS = ['green', 'blue', 'amber', 'lilac', 'rose'];

export function renderVirtualNodesScene(snap, opts = {}) {
  const view = snap.view || 'scatter';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // the shared ring guide + an orbiting particle rail
  const ringPts = [];
  for (let d = 0; d <= 360; d += 12) { const p = ringPt(d); ringPts.push(V(p.x, p.y)); }
  const ring = edge(ringPts, { r: 60 });
  guides.push(ring.guide); railIn = ring.d;

  // a physical machine centred on a ring degree
  const nodeAt = (deg, label, mat, o = {}) => {
    const p = ringPt(deg);
    const c = isoCube(p.x, p.y - 22, o.rx || 32, o.h || 32, mat, {
      icon: 'server', label, iconSize: 15, halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return { p, c };
  };
  // a small vnode tick sitting on the ring at a degree, coloured by owner
  const vtick = (deg, mat, o = {}) => {
    const p = ringPt(deg, 1.0, 1.0);
    const t = isoTile(p.x, p.y, o.rx || 8, mat, { h: o.h || 7, halo: !!o.halo });
    shadows.push(t.shadow); if (o.halo) halos.push(t.halo); solids.push(t.g);
    return p;
  };
  // a key dot just outside the ring
  const keyAt = (deg, mat, o = {}) => {
    const p = ringPt(deg, 1.18, 1.22);
    const t = isoTile(p.x, p.y, o.rx || 12, mat, { h: 10, halo: !!o.halo });
    shadows.push(t.shadow); if (o.halo) halos.push(t.halo); solids.push(t.g);
    return p;
  };

  /* ── SINGLE: one token per node, arcs come out uneven ──────────────────── */
  if (view === 'single') {
    badges.push(pill(C.x, C.y - 6, 'hash ring · 0 … 2³²', { icon: 'merge', cls: 'pill--sst' }));
    // four nodes placed at deliberately uneven degrees → unequal clockwise arcs
    const pts = [10, 70, 95, 240];
    pts.forEach((d, i) => nodeAt(d, MATS[i].toUpperCase().slice(0, 1), MATS[i]));
    // mark the longest arc (from 240 clockwise round to 10) as a hotspot
    badges.push(pill(ringPt(320, 1.5, 1.72).x, ringPt(320, 1.5, 1.72).y, 'huge arc → hotspot', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(ringPt(82, 1.6, 1.9).x, ringPt(82, 1.6, 1.9).y, 'tiny arcs', { icon: 'gauge', cls: 'pill--sst' }));
    badges.push(cap(C.x, C.y + 18, 'random points leave arcs long and short — load follows'));
    badges.push(pill(C.x, 520, 'one token per node → 2× load skew', { icon: 'alert' }));
    flows.push({ id: 'in', kind: 'read', speed: 90, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LUMPY: a join carves its whole arc out of one neighbour ───────────── */
  if (view === 'lumpy') {
    badges.push(pill(C.x, C.y - 6, 'hash ring', { icon: 'merge', cls: 'pill--sst' }));
    nodeAt(10, 'A', 'green');
    nodeAt(120, 'B', 'green');
    nodeAt(250, 'C', 'green');
    const E = nodeAt(185, 'NEW', 'amber', { halo: true, rx: 34 });  // joins between B(120) and C(250)
    // the arc (120,185] it takes was all B→C's; highlight it as moving
    for (let d = 124; d <= 184; d += 8) vtick(d, 'rose', { rx: 9, h: 8 });
    badges.push(pill(ringPt(185, 1.5, 1.7).x, ringPt(185, 1.5, 1.7).y, 'NEW node', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(pill(ringPt(150, 1.66, 1.98).x, ringPt(150, 1.66, 1.98).y, 'one big arc moves', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(118, 408, 804, 150, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="${C.x}" y="462" text-anchor="middle">ONLY ONE NEIGHBOUR SHARES THE WORK · EVERY OTHER NODE IDLE</text>`);
    cap(C.x, 540, 'single-token joins are bursty and lopsided');
    flows.push({ id: 'in', kind: 'write', speed: 120, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SCATTER: each physical node owns many interleaved vnodes ──────────── */
  if (view === 'scatter') {
    badges.push(pill(C.x, C.y - 6, 'hash ring · vnodes', { icon: 'merge', cls: 'pill--sst' }));
    const anchors = [18, 110, 200, 290];
    anchors.forEach((d, i) => nodeAt(d, MATS[i].toUpperCase().slice(0, 1), MATS[i]));
    // many small ticks, owner interleaved around the whole ring
    for (let d = 6; d < 360; d += 9) {
      const owner = Math.floor(d / 9) % 4;
      vtick(d, MATS[owner]);
    }
    badges.push(cap(C.x, C.y + 18, 'each colour is one machine — many small arcs, not one'));
    badges.push(pill(C.x, 520, 'vnodes interleave → load evens out', { icon: 'gauge' }));
    flows.push({ id: 'in', kind: 'read', speed: 90, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LOOKUP: key → nearest vnode → owning machine ──────────────────────── */
  if (view === 'lookup') {
    badges.push(pill(C.x, C.y - 6, 'key → vnode → machine', { icon: 'merge', cls: 'pill--sst' }));
    const anchors = [18, 110, 200, 290];
    anchors.forEach((d, i) => nodeAt(d, MATS[i].toUpperCase().slice(0, 1), MATS[i]));
    for (let d = 6; d < 360; d += 9) {
      const owner = Math.floor(d / 9) % 4;
      vtick(d, MATS[owner]);
    }
    // a key lands at ~150°, nearest clockwise vnode is at 156° owned by machine (156/9)%4
    const keyDeg = 150, vDeg = 156;
    const owner = Math.floor(vDeg / 9) % 4;
    const kp = keyAt(keyDeg, 'slate', { halo: true });
    const vp = ringPt(vDeg, 1.0, 1.0);
    const np = ringPt(anchors[owner]);
    // highlight the chosen vnode
    const vt = isoTile(vp.x, vp.y, 11, MATS[owner], { h: 9, halo: true });
    shadows.push(vt.shadow); halos.push(vt.halo); solids.push(vt.g);
    // arrows: key → vnode, vnode → machine
    const e1 = edge([V(kp.x, kp.y - 4), V(vp.x, vp.y - 8)], { arrow: true });
    const e2 = edge([V(vp.x, vp.y - 8), V((vp.x + np.x) / 2, (vp.y + np.y) / 2 - 40), V(np.x, np.y - 30)], { arrow: true, dashed: true });
    guides.push(e1.guide, e2.guide); railOut = e1.d;
    badges.push(pill(kp.x, kp.y - 34, 'key', { icon: 'key', cls: 'pill--sst' }));
    badges.push(pill(ringPt(vDeg, 1.52, 1.72).x, ringPt(vDeg, 1.52, 1.72).y, 'nearest vnode', { icon: 'target', cls: 'pill--sst' }));
    badges.push(pill(np.x, np.y + 54, 'owner = ' + MATS[owner].toUpperCase().slice(0, 1), { icon: 'server', cls: 'pill--sst' }));
    badges.push(cap(C.x, 540, 'one extra hop: the vnode names its physical owner'));
    flows.push({ id: 'out', kind: 'read', speed: 110, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── REBALANCE: a joiner pulls small slivers from every machine ────────── */
  if (view === 'rebalance') {
    badges.push(pill(C.x, C.y - 6, 'join = parallel slivers', { icon: 'merge', cls: 'pill--sst' }));
    const anchors = [18, 110, 200, 290];
    anchors.forEach((d, i) => nodeAt(d, MATS[i].toUpperCase().slice(0, 1), MATS[i]));
    // existing vnodes (4 owners), plus the joiner's new vnodes slotted between them
    for (let d = 6; d < 360; d += 9) vtick(d, MATS[Math.floor(d / 9) % 4]);
    // joiner E drops a spray of amber-free colour (rose) vnodes all around
    const newDegs = [30, 75, 128, 171, 220, 266, 312, 348];
    newDegs.forEach(d => vtick(d, 'rose', { rx: 10, h: 9, halo: true }));
    // a central joiner node with arrows reaching out to a few of its new vnodes
    const jx = C.x, jy = 300;
    const jc = isoCube(jx, jy - 20, 30, 30, 'rose', { icon: 'server', label: 'E', iconSize: 15, halo: true });
    shadows.push(jc.shadow); halos.push(jc.halo); solids.push(jc.g);
    newDegs.slice(0, 5).forEach((d, i) => {
      const vp = ringPt(d, 1.0, 1.0);
      const e = edge([V(jx, jy - 20), V(vp.x, vp.y - 4)], { arrow: true, dashed: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    badges.push(pill(C.x, 520, 'E pulls a little from every node — in parallel', { icon: 'bolt' }));
    flows.push({ id: 'out', kind: 'write', speed: 140, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: many tiny arcs per machine, even load ──────────────────────── */
  badges.push(pill(C.x, C.y - 6, 'hash ring · vnodes', { icon: 'merge', cls: 'pill--sst' }));
  const anchors = [18, 110, 200, 290];
  anchors.forEach((d, i) => nodeAt(d, MATS[i].toUpperCase().slice(0, 1), MATS[i]));
  for (let d = 5; d < 360; d += 8) vtick(d, MATS[Math.floor(d / 8) % 4], { rx: 7, h: 6 });
  badges.push(cap(C.x, C.y + 18, '~1/N keys move · load stays flat · O(1) lookup'));
  const tags = ['even load', 'parallel rebalancing', 'the real-world default'];
  tags.forEach((t, i) => badges.push(pill(C.x, 452 + i * 40, t, { icon: 'check', w: 230 })));
  flows.push({ id: 'in', kind: 'read', speed: 90, size: 5 });
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
  <svg class="scene scene--virtual-nodes" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Virtual nodes on a hash ring">
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
