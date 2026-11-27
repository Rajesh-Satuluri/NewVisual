/* consistent-hashing-scene.js — the "Consistent Hashing" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes for nodes, small
   tiles for keys, a hash RING drawn as a routed guide, soft shadows, halos,
   pill badges, dashed regions, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'modulo' (hash % N reshuffle storm), 'ring' (keys+nodes on one ring),
   'add' (insert a node, few keys move), 'remove' (drop a node, few keys move),
   'vnodes' (virtual nodes smooth the load), 'recap'. */

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

export function renderConsistentHashingScene(snap, opts = {}) {
  const view = snap.view || 'ring';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  /* ── MODULO: naive hash % N — change N, nearly everything remaps ───────── */
  if (view === 'modulo') {
    const keys = [];
    const kN = 10, kx0 = 150, kstep = 82;
    for (let i = 0; i < kN; i++) {
      const moved = i !== 4;                         // all but one remap
      const t = isoTile(kx0 + i * kstep, 150, 26, moved ? 'rose' : 'slate', { h: 20 });
      shadows.push(t.shadow); solids.push(t.g); keys.push(t);
    }
    badges.push(pill(VW / 2, 104, 'bucket = hash(key) % N', { icon: 'merge' }));
    // the node row below
    const nodes = [];
    const nN = 5, nx0 = 236, nstep = 150;
    for (let i = 0; i < nN; i++) {
      const c = isoCube(nx0 + i * nstep, 420, 44, 44, 'blue', { icon: 'server', label: 'N' + i, iconSize: 18 });
      shadows.push(c.shadow); solids.push(c.g); nodes.push(c);
    }
    // every key re-points to a (new) node — a tangle of remap arrows
    keys.forEach((k, i) => {
      const n = nodes[(i * 7 + 2) % nodes.length];
      const e = edge([V(k.base[0], k.base[1] - 4), V(n.top[0], n.top[1] - 2)], { arrow: true, dashed: i !== 4 });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    badges.push(region(120, 360, 800, 150, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="500" text-anchor="middle">ADD ONE NODE → 94% OF KEYS REMAP · RESHUFFLE STORM</text>`);
    badges.push(cap(kx0 + 4 * kstep, keys[4].base[1] + 16, 'the lucky one'));
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── all ring views share the ring guide + a particle orbit ───────────── */
  const ringPts = [];
  for (let d = 0; d <= 360; d += 12) { const p = ringPt(d); ringPts.push(V(p.x, p.y)); }
  const ring = edge(ringPts, { r: 60 });
  guides.push(ring.guide); railIn = ring.d;
  badges.push(pill(C.x, C.y - 6, 'hash ring · 0 … 2³²', { icon: 'merge', cls: 'pill--sst' }));

  // place a node cube centred on a ring degree
  const nodeAt = (deg, label, mat, o = {}) => {
    const p = ringPt(deg);
    const c = isoCube(p.x, p.y - 22, o.rx || 34, o.h || 34, mat, {
      icon: 'server', label, iconSize: 16, halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  // place a key dot just outside the ring
  const keyAt = (deg, mat, o = {}) => {
    const p = ringPt(deg, 1.16, 1.2);
    const t = isoTile(p.x, p.y, o.rx || 13, mat, { h: 11, halo: !!o.halo });
    shadows.push(t.shadow); if (o.halo) halos.push(t.halo); solids.push(t.g);
    return t;
  };

  const NODES = [{ d: 18, l: 'A' }, { d: 110, l: 'B' }, { d: 200, l: 'C' }, { d: 290, l: 'D' }];
  const KEYS = [350, 40, 70, 135, 165, 212, 232, 258, 312, 338];

  if (view === 'ring') {
    NODES.forEach(n => nodeAt(n.d, n.l, 'green'));
    KEYS.forEach(d => keyAt(d, 'slate'));
    badges.push(cap(C.x, C.y + 18, 'a key is owned by the first node clockwise'));
    badges.push(pill(C.x, 496, 'nodes & keys share one keyspace', { icon: 'check', cls: 'pill--sst' }));
    flows.push({ id: 'in', kind: 'read', speed: 90, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  if (view === 'add') {
    NODES.forEach(n => nodeAt(n.d, n.l, 'green'));
    const E = nodeAt(245, 'E', 'amber', { halo: true });      // new node between C(200) and D(290)
    // keys in (200, 245] now move to E; everything else is untouched
    KEYS.forEach(d => keyAt(d, d > 200 && d <= 245 ? 'rose' : 'slate', { halo: d > 200 && d <= 245 }));
    badges.push(pill(ringPt(245, 1.52, 1.64).x, ringPt(245, 1.52, 1.64).y, 'NEW node E', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(cap(C.x, C.y + 46, 'only keys between E and C move — ~20%'));
    badges.push(pill(C.x, 496, 'the other 80% never budge', { icon: 'check', cls: 'pill--sst' }));
    flows.push({ id: 'in', kind: 'read', speed: 90, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  if (view === 'remove') {
    nodeAt(18, 'A', 'green');
    nodeAt(110, 'B', 'rose', { ghost: true, halo: true });    // B leaves
    nodeAt(200, 'C', 'green');
    nodeAt(290, 'D', 'green');
    // B owned keys in (18, 110]; they fall to the next clockwise node, C
    KEYS.forEach(d => keyAt(d, d > 18 && d <= 110 ? 'rose' : 'slate', { halo: d > 18 && d <= 110 }));
    badges.push(pill(ringPt(110).x - 150, ringPt(110).y - 30, 'B leaves', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(cap(C.x, C.y + 18, "B's keys slide to the next node — the rest stay"));
    badges.push(pill(C.x, 496, 'no global reshuffle', { icon: 'check', cls: 'pill--sst' }));
    flows.push({ id: 'in', kind: 'read', speed: 90, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  if (view === 'vnodes') {
    // each physical node scatters MANY virtual points around the ring
    const mats = ['green', 'blue', 'amber', 'lilac'];
    const labels = ['A', 'B', 'C', 'D'];
    // one labelled anchor per node + a spray of small vnode ticks
    NODES.forEach((n, i) => nodeAt(n.d, labels[i], mats[i]));
    for (let d = 0; d < 360; d += 15) {
      const owner = Math.floor((d / 15)) % 4;           // interleaved vnodes
      const p = ringPt(d, 1.0, 1.0);
      const t = isoTile(p.x, p.y, 8, mats[owner], { h: 7 });
      shadows.push(t.shadow); solids.push(t.g);
    }
    badges.push(cap(C.x, C.y + 18, 'each node owns many small arcs, not one big one'));
    badges.push(pill(C.x, 496, 'virtual nodes even out the load', { icon: 'gauge', cls: 'pill--sst' }));
    flows.push({ id: 'in', kind: 'read', speed: 90, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP ────────────────────────────────────────────────────────────── */
  const mats = ['green', 'blue', 'amber', 'lilac'];
  NODES.forEach((n, i) => nodeAt(n.d, n.l, mats[i]));
  nodeAt(245, 'E', 'rose');
  for (let d = 7; d < 360; d += 11) {
    const p = ringPt(d, 1.0, 1.0);
    const t = isoTile(p.x, p.y, 7, mats[Math.floor(d / 11) % 4], { h: 6 });
    shadows.push(t.shadow); solids.push(t.g);
  }
  badges.push(cap(C.x, C.y + 18, '~1/N keys move · load stays even'));
  const tags = ['stable membership', 'even load', 'O(1) lookup'];
  tags.forEach((t, i) => badges.push(pill(C.x, 452 + i * 40, t, { icon: 'check', w: 190 })));
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
  <svg class="scene scene--consistent-hashing" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Consistent hashing ring">
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
