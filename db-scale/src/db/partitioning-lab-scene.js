/* partitioning-lab-scene.js — the "Partitioning Lab" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'setup' (one node holds all keys), 'hashpart' (hash % 3 spreads
   evenly), 'hotpart' (a hot key overloads one node), 'rebalance' (naive add
   remaps everything), 'consistent' (hash ring + virtual nodes), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderPartitioningLabScene(snap, opts = {}) {
  const view = snap.view || 'setup';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a cube; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'app', label, sub: o.sub || '', iconSize: o.iconSize || 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  // a small flat op tile
  const opTile = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 34, o.h || 20, mat, {
      icon: o.icon || '', label, iconSize: 13, ghost: !!o.ghost, halo: !!o.halo,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  const router = { x: 170, y: 250 };

  /* ── SETUP: one node owns the whole key space ──────────────────────────── */
  if (view === 'setup') {
    node(router.x, router.y, 'client', 'blue', { icon: 'app', sub: 'all keys', rx: 42, h: 36 });
    node(VW / 2 + 60, 290, 'node 1', 'rose', { icon: 'database', sub: 'A … Z', rx: 70, h: 56, halo: true });
    const e = edge([V(router.x + 36, router.y), V(380, 300), V(VW / 2 + 60 - 76, 300)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(pill(VW / 2 + 60, 290 + 108, 'every read + write lands here', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(690, 150, 240, 300, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="${A(810)}" y="186" text-anchor="middle">ONE PARTITION</text>`);
    cap(VW / 2, 508, 'one machine caps throughput and storage — we must shard the key space');
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── HASHPART: hash(key) % 3 spreads keys across three nodes ────────────── */
  if (view === 'hashpart') {
    node(router.x, router.y, 'hash()', 'lilac', { icon: 'key', sub: '% 3', rx: 46, h: 40, halo: true });
    const nx = [540, 740, 940], ny = [160, 300, 440];
    const mats = ['green', 'green', 'green'];
    const subs = ['~1/3 keys', '~1/3 keys', '~1/3 keys'];
    for (let i = 0; i < 3; i++) {
      node(nx[i], ny[i], 'node ' + (i + 1), mats[i], { icon: 'database', sub: subs[i], rx: 52, h: 42 });
      const e = edge([V(router.x + 40, router.y + (i - 1) * 14), V(380, ny[i]), V(nx[i] - 56, ny[i])], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    }
    badges.push(pill(router.x, router.y + 84, 'key → hash(key) % 3', { icon: 'key', cls: 'pill--sst' }));
    badges.push(region(300, 500, 440, 46, '', { r: 16 }));
    badges.push(`<text class="iso-region__t" x="${A(520)}" y="528" text-anchor="middle">EVEN LOAD · 1-HOP LOOKUPS</text>`);
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── HOTPART: one hot key overloads a single partition ─────────────────── */
  if (view === 'hotpart') {
    node(router.x, router.y, 'hash()', 'lilac', { icon: 'key', sub: 'hot key', rx: 46, h: 40 });
    const nx = [540, 740, 940], ny = [160, 300, 440];
    const mats = ['rose', 'slate', 'slate'];
    const subs = ['SATURATED', 'idle', 'idle'];
    for (let i = 0; i < 3; i++) {
      node(nx[i], ny[i], 'node ' + (i + 1), mats[i], { icon: i === 0 ? 'bolt' : 'database', sub: subs[i], rx: 52, h: 42, halo: i === 0 });
    }
    // fat hot flow to node 1, thin flows to the others
    const hot = edge([V(router.x + 40, router.y - 8), V(380, ny[0]), V(nx[0] - 56, ny[0])], { arrow: true });
    const c2 = edge([V(router.x + 40, router.y + 6), V(380, ny[1]), V(nx[1] - 56, ny[1])], { arrow: true, dashed: true });
    const c3 = edge([V(router.x + 40, router.y + 18), V(380, ny[2]), V(nx[2] - 56, ny[2])], { arrow: true, dashed: true });
    guides.push(hot.guide, c2.guide, c3.guide); railOut = hot.d;
    badges.push(pill(nx[0], ny[0] - 54, '90% of traffic → 1 key', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(300, 500, 440, 46, '', { r: 16 }));
    badges.push(`<text class="iso-region__t" x="${A(520)}" y="528" text-anchor="middle">HOT PARTITION · SKEW HASHING CAN’T FIX</text>`);
    flows.push({ id: 'out', kind: 'read', speed: 90, size: 7 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── REBALANCE: naive % 4 remaps almost everything ─────────────────────── */
  if (view === 'rebalance') {
    node(router.x, router.y, 'hash()', 'amber', { icon: 'key', sub: '% 3 → % 4', rx: 46, h: 40 });
    const nx = [500, 680, 860], ny = [150, 150, 150];
    for (let i = 0; i < 3; i++) {
      node(nx[i], ny[i], 'node ' + (i + 1), 'amber', { icon: 'database', sub: 'reshuffled', rx: 48, h: 40 });
    }
    node(680, 400, 'node 4', 'green', { icon: 'database', sub: 'new', rx: 52, h: 42, halo: true });
    // migration arrows between all nodes
    const m1 = edge([V(nx[0] + 40, ny[0] + 20), V(680 - 40, 400 - 30)], { arrow: true, dashed: true });
    const m2 = edge([V(nx[1], ny[1] + 40), V(680, 400 - 42)], { arrow: true, dashed: true });
    const m3 = edge([V(nx[2] - 40, ny[2] + 20), V(680 + 40, 400 - 30)], { arrow: true, dashed: true });
    const inE = edge([V(router.x + 40, router.y - 40), V(360, 150), V(nx[0] - 54, ny[0] + 6)], { arrow: true });
    guides.push(m1.guide, m2.guide, m3.guide, inE.guide); railIn = inE.d; railOut = m2.d;
    badges.push(pill(VW / 2 + 30, 300, 'modulus changed → ~3/4 keys move', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(region(380, 470, 600, 64, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${A(680)}" y="506" text-anchor="middle">HUGE MIGRATION · NETWORK + DISK SATURATED</text>`);
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    flows.push({ id: 'out', kind: 'write', speed: 120, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── CONSISTENT: hash ring + virtual nodes, only ~1/N keys move ─────────── */
  if (view === 'consistent') {
    const cx = 560, cy = 290, R = 170;
    // the ring
    badges.push(`<circle cx="${A(cx)}" cy="${A(cy)}" r="${A(R)}" fill="none" class="iso-edge is-dashed"/>`);
    badges.push(`<text class="iso-region__t" x="${A(cx)}" y="${A(cy - R - 16)}" text-anchor="middle">HASH RING</text>`);
    // physical nodes as colored arcs (virtual nodes shown as small tiles around ring)
    const mats = ['green', 'blue', 'amber', 'lilac'];
    const vlabels = ['n1', 'n2', 'n3', 'n4'];
    // 8 virtual-node positions around the ring, interleaving owners
    const owner = [0, 1, 2, 0, 1, 3, 2, 3];
    for (let i = 0; i < 8; i++) {
      const ang = (-90 + i * 45) * Math.PI / 180;
      const vx = cx + Math.cos(ang) * R;
      const vy = cy + Math.sin(ang) * R * 0.74;
      opTile(vx, vy, vlabels[owner[i]], mats[owner[i]], { rx: 24, h: 14, halo: owner[i] === 3 });
    }
    node(router.x, cy, 'key', 'slate', { icon: 'key', sub: 'clockwise →', rx: 42, h: 36 });
    const e = edge([V(router.x + 38, cy), V(cx - R - 6, cy)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(pill(cx, cy, 'n4 joins → steals 1 arc', { icon: 'merge', cls: 'pill--sst', w: 220 }));
    badges.push(pill(880, 200, 'virtual nodes even the arcs', { icon: 'layers', cls: 'pill--sst' }));
    badges.push(region(340, 490, 440, 46, '', { r: 16 }));
    badges.push(`<text class="iso-region__t" x="${A(560)}" y="518" text-anchor="middle">ONLY ~1/N KEYS MOVE</text>`);
    cap(VW / 2, 560, 'a key maps to the first node clockwise; joins steal one arc, not the ring');
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP ─────────────────────────────────────────────────────────────── */
  const nx = [300, 520, 740], ny = 250;
  ['green', 'blue', 'amber'].forEach((m, i) => node(nx[i], ny, 'shard ' + (i + 1), m, { icon: 'database', sub: '~1/N keys', rx: 50, h: 42, halo: true }));
  badges.push(region(150, 120, 740, 150, 'partition to scale past one node', { r: 24 }));
  const tags = ['hash for even spread + 1-hop lookups', 'watch for hot keys — skew hashing can’t fix', 'consistent hashing + vnodes → only ~1/N moves'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 420 + i * 42, t, { icon: 'check', w: 400 })));
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
  <svg class="scene scene--partitioning-lab" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Partitioning lab">
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
