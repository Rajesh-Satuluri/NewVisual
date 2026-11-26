/* buffer-pool-replacement-scene.js — the "Buffer Pool Replacement" scene, in the
   same Designed-to-Scale isometric vocabulary as the other Storage-Engine
   lessons: rounded iso cubes as page frames, ref-bit pills, dashed logical
   regions, routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'full' (pool at capacity, newcomer waiting), 'lru' (recency queue),
   'clock' (second-chance sweep), 'flooding' (sequential scan thrash),
   'lru-k' (scan-resistant promotion), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a left-to-right row of page-frame cubes */
function frameRow(cx0, cy, n, gap, rx, h, toneOf, labelOf, optOf) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const o = optOf ? optOf(i) : {};
    out.push(isoCube(cx0 + i * gap, cy, rx, h, toneOf(i), {
      label: labelOf ? labelOf(i) : '', sub: o.sub || '', iconSize: 0,
      ghost: o.ghost, pulse: o.pulse, halo: o.halo,
    }));
  }
  return out;
}

export function renderBufferPoolReplacementScene(snap, opts = {}) {
  const view = snap.view || 'full';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  let flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  const RX = 40, H = 42;

  /* ── FULL: pool at capacity, newcomer with nowhere to go ──────────────── */
  if (view === 'full') {
    badges.push(region(300, 150, 560, 248, '', { r: 22 }));
    badges.push(pill(580, 142, 'BUFFER POOL · RAM · 8 / 8 frames', { icon: 'layers' }));

    const ids = ['p3', 'p9', 'p1', 'p7', 'p5', 'p2', 'p8', 'p4'];
    const row1 = frameRow(390, 226, 4, 116, RX, H, () => 'lilac', i => ids[i]);
    const row2 = frameRow(390, 320, 4, 116, RX, H, () => 'lilac', i => ids[i + 4]);
    [...row1, ...row2].forEach(c => { shadows.push(c.shadow); solids.push(c.g); });

    // the newcomer waiting on the left
    const nw = isoCube(150, 262, 50, 56, 'blue', { label: 'p42', sub: 'miss', iconSize: 0, halo: true });
    shadows.push(nw.shadow); halos.push(nw.halo); solids.push(nw.g);
    badges.push(pill(150, 192, 'needs a frame', { icon: 'alert', cls: 'pill--sst' }));

    const e = edge([
      V(nw.verts.E.x - 2, nw.front[1]),
      V((nw.verts.E.x + 300) / 2, nw.front[1] + 6),
      V(300 - 6, 274),
    ], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    flows = [{ id: 'in', kind: 'read', speed: 150, size: 5 }];

    badges.push(`<text class="iso-region__t" x="580" y="384" text-anchor="middle">POOL FULL · AN EVICTION MUST PRECEDE THE READ</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LRU: recency queue, evict the cold end ───────────────────────────── */
  if (view === 'lru') {
    badges.push(region(250, 180, 640, 180, '', { r: 22 }));
    badges.push(pill(300, 172, 'HOT · most recent', { icon: 'bolt' }));
    badges.push(pill(840, 172, 'COLD · least recent', { icon: 'clock', cls: 'pill--sst' }));

    const ids = ['p42', 'p7', 'p1', 'p9', 'p5', 'p2'];
    const row = frameRow(320, 270, 6, 108, RX, H,
      i => i === 0 ? 'green' : i === 5 ? 'rose' : 'lilac',
      i => ids[i],
      i => i === 0 ? { halo: true, sub: 'new' } : i === 5 ? { sub: 'victim' } : {});
    row.forEach((c, i) => { shadows.push(c.shadow); if (i === 0) halos.push(c.halo); solids.push(c.g); });

    // newcomer inserts at the hot (left) end
    const nw = isoCube(150, 300, 46, 50, 'blue', { label: 'p42', iconSize: 0 });
    shadows.push(nw.shadow); solids.push(nw.g);
    const ie = edge([V(nw.verts.E.x - 2, nw.front[1]), V(250, 290), V(row[0].verts.W.x - 4, row[0].front[1])], { arrow: true });
    guides.push(ie.guide); railIn = ie.d;

    // victim leaves the cold (right) end → disk
    const victim = row[5];
    const disk = isoTile(960, 300, 46, 'slate', { h: 16 });
    shadows.push(disk.shadow); solids.push(disk.g);
    badges.push(`<text class="sst-cap" x="960" y="${A(disk.base[1] + 18)}" text-anchor="middle">written back</text>`);
    const oe = edge([V(victim.verts.E.x - 2, victim.front[1]), V(915, 300), V(disk.top[0] - 8, disk.top[1])], { arrow: true, dashed: true });
    guides.push(oe.guide); railOut = oe.d;

    flows = [{ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'write', speed: 140, size: 6 }];
    badges.push(`<text class="iso-region__t" x="570" y="346" text-anchor="middle">RECENCY ORDER · EVICT THE COLD END</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── CLOCK: second-chance sweep over reference bits ───────────────────── */
  if (view === 'clock') {
    badges.push(region(250, 200, 620, 170, '', { r: 22 }));
    badges.push(pill(560, 192, 'CLOCK · reference bit per frame', { icon: 'clock' }));

    const ids = ['p3', 'p9', 'p1', 'p7', 'p5', 'p2'];
    const bits = [1, 0, 1, 0, 1, 0];
    const handAt = 1; // the victim: first frame already at 0
    const row = frameRow(320, 288, 6, 100, RX, H,
      i => i === handAt ? 'rose' : bits[i] ? 'green' : 'lilac',
      i => ids[i], i => i === handAt ? { sub: 'victim' } : {});
    row.forEach(c => { shadows.push(c.shadow); solids.push(c.g); });

    // reference-bit pills above each frame
    row.forEach((c, i) => {
      badges.push(pill(c.top[0], 234, 'bit ' + bits[i], { w: 56, cls: bits[i] ? '' : 'pill--sst' }));
    });

    // the sweeping hand points at the victim
    const hand = row[handAt];
    badges.push(pill(hand.top[0], 352, 'hand →', { icon: 'target', cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="560" y="${A(380)}" text-anchor="middle">SET BITS GET A SECOND CHANCE · FIRST 0 IS EVICTED</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── FLOODING: sequential scan thrashes the hot working set ───────────── */
  if (view === 'flooding') {
    badges.push(region(300, 196, 540, 176, '', { r: 22 }));
    badges.push(pill(570, 188, 'POOL · flooded by a one-pass scan', { icon: 'alert', cls: 'pill--sst' }));

    // the pool is now full of use-once scan pages (amber)
    const row = frameRow(380, 280, 5, 104, RX, H, () => 'amber', i => 's' + (i + 1), () => ({ sub: 'use-once' }));
    row.forEach(c => { shadows.push(c.shadow); solids.push(c.g); });

    // the scan streams in from the left
    const scan = isoCube(150, 262, 48, 52, 'amber', { label: 'scan', sub: 'read once', iconSize: 0 });
    shadows.push(scan.shadow); solids.push(scan.g);
    const ie = edge([V(scan.verts.E.x - 2, scan.front[1]), V(300, 272), V(row[0].verts.W.x - 4, row[0].front[1])], { arrow: true });
    guides.push(ie.guide); railIn = ie.d;

    // the hot working set is being shoved out the far end → gone
    const hot1 = isoCube(930, 236, 44, 48, 'green', { label: 'p7', sub: 'hot', iconSize: 0, ghost: true });
    const hot2 = isoCube(930, 326, 44, 48, 'green', { label: 'p1', sub: 'hot', iconSize: 0, ghost: true });
    [hot1, hot2].forEach(c => { shadows.push(c.shadow); solids.push(c.g); });
    const oe = edge([V(row[4].verts.E.x - 2, row[4].front[1]), V(890, 282), V(hot1.verts.W.x - 2, 272)], { arrow: true, dashed: true });
    guides.push(oe.guide); railOut = oe.d;
    badges.push(`<text class="sst-cap" x="930" y="384" text-anchor="middle">working set evicted — will be re-read</text>`);

    flows = [{ id: 'in', kind: 'read', speed: 110, size: 5 }, { id: 'out', kind: 'write', speed: 120, size: 6 }];
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LRU-K: a second reference promotes; scan pages bounce off ────────── */
  if (view === 'lru-k') {
    // protected queue (hot, survives)
    badges.push(region(300, 150, 560, 110, '', { r: 20 }));
    badges.push(pill(360, 142, 'PROTECTED · touched ≥ 2×', { icon: 'check' }));
    const prot = frameRow(400, 206, 4, 116, RX, 38,
      () => 'green', i => ['p7', 'p1', 'p9', 'p5'][i], () => ({ sub: 'hot' }));
    prot.forEach(c => { shadows.push(c.shadow); solids.push(c.g); });

    // probation queue (newcomers / one-touch)
    badges.push(region(300, 300, 560, 110, '', { r: 20 }));
    badges.push(pill(360, 292, 'PROBATION · first touch', { icon: 'clock', cls: 'pill--sst' }));
    const prob = frameRow(400, 356, 4, 116, RX, 38,
      i => i >= 2 ? 'amber' : 'lilac', i => ['p2', 'p8', 's1', 's2'][i],
      i => i >= 2 ? { sub: 'scan' } : {});
    prob.forEach(c => { shadows.push(c.shadow); solids.push(c.g); });

    // a second reference promotes p2 upward
    const pe = edge([V(prob[0].top[0], prob[0].verts.N.y + 4), V(prob[0].top[0], 270), V(prot[3].top[0] - 20, prot[3].verts.S.y + 6)], { arrow: true });
    guides.push(pe.guide);
    badges.push(pill(640, 280, '2nd touch → promote', { icon: 'bolt' }));

    // scan pages exit from probation, never promoted
    const disk = isoTile(960, 356, 42, 'slate', { h: 14 });
    shadows.push(disk.shadow); solids.push(disk.g);
    const oe = edge([V(prob[3].verts.E.x - 2, prob[3].front[1]), V(915, 356), V(disk.top[0] - 6, disk.top[1])], { arrow: true, dashed: true });
    guides.push(oe.guide); railOut = oe.d;
    badges.push(`<text class="sst-cap" x="960" y="${A(disk.base[1] + 18)}" text-anchor="middle">scan pages leave</text>`);

    flows = [{ id: 'out', kind: 'write', speed: 150, size: 6 }];
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: three policies side by side ───────────────────────────────── */
  const cols = [
    { cx: 250, mat: 'blue', label: 'LRU', sub: 'recency', tag: 'evict the coldest' },
    { cx: 520, mat: 'green', label: 'Clock', sub: 'second-chance', tag: 'one bit, near-LRU' },
    { cx: 790, mat: 'amber', label: 'LRU-K', sub: 'frequency', tag: 'scan-resistant' },
  ];
  cols.forEach(c => {
    const cube = isoCube(c.cx, 230, 72, 78, c.mat, { label: c.label, sub: c.sub, icon: 'layers', iconSize: 22, halo: true });
    shadows.push(cube.shadow); halos.push(cube.halo); solids.push(cube.g);
    badges.push(pill(c.cx, 360, c.tag, { w: 190 }));
  });
  badges.push(pill(520, 430, 'keep the hottest working set resident', { icon: 'check', w: 360 }));
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
  <svg class="scene scene--buffer-pool-replacement" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Buffer pool replacement policy">
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
