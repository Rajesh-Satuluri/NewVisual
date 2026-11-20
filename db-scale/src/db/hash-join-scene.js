/* hash-join-scene.js — the "Join Algorithms / Hash Join" scene, in the shared
   Designed-to-Scale isometric vocabulary (rounded iso cubes/tiles, pills, dashed
   regions, routed connectors with arrows, a faded grid, particle rails).

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'phases' (build ↔ probe overview), 'build', 'probe', 'memory'
   (spill), 'when' (equi vs range), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a vertical stack of relation rows (thin tiles); returns tiles + anchors */
function relStack(cx, topY, n, tone, opts = {}) {
  const rx = opts.rx || 52, gap = opts.gap || 18;
  const tiles = [];
  for (let i = n - 1; i >= 0; i--) {
    tiles.push(isoTile(cx, topY + i * gap, rx, tone, { h: rx * 0.26, pulse: opts.pulse, ghost: opts.ghost }));
  }
  // tiles[0] is the lowest row (paints last/on top)
  return { tiles, top: [cx, topY], bottomY: topY + (n - 1) * gap, rx };
}

export function renderHashJoinScene(snap, opts = {}) {
  const view = snap.view || 'phases';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  const push = (o) => { shadows.push(o.shadow); if (o.halo) halos.push(o.halo); solids.push(o.g); };
  const pushStack = (s) => s.tiles.forEach(push);

  /* ── build (small) relation, left ── */
  const buildHot = view === 'build';
  const build = relStack(210, 150, 3, 'blue', { rx: 50, pulse: buildHot });
  pushStack(build);
  badges.push(`<text class="sst-cap" x="210" y="${A(build.bottomY + 64)}" text-anchor="middle">users · build (small)</text>`);

  /* ── probe (large) relation, right ── */
  const probeHot = view === 'probe';
  const probe = relStack(850, 120, 5, 'lilac', { rx: 50, pulse: probeHot });
  pushStack(probe);
  badges.push(`<text class="sst-cap" x="850" y="${A(probe.bottomY + 64)}" text-anchor="middle">orders · probe (big)</text>`);

  /* ── hash table: a 3×2 grid of buckets, centre ── */
  const bx = [452, 520, 588], by = [236, 292];
  const buckets = [];
  for (const y of by) for (const x of bx) {
    const spill = view === 'memory' && x === bx[2] && y === by[1];
    const t = isoTile(x, y, 30, spill ? 'rose' : 'slate', { h: 10 });
    buckets.push({ t, x, y });
    push(t);
  }
  badges.push(pill(520, 170, 'hash table', { icon: 'layers' }));

  /* build → table (hash each row into a bucket) */
  if (view === 'phases' || view === 'build' || view === 'recap') {
    const e = edge([
      V(build.tiles[0].verts.E.x - 4, build.top[1] + 8),
      V(360, 210),
      V(buckets[0].x - 18, buckets[0].y),
    ], { arrow: true, dashed: view === 'phases' });
    guides.push(e.guide); railIn = e.d;
    if (view === 'build') badges.push(`<text class="sst-cap" x="360" y="186" text-anchor="middle">hash key → bucket</text>`);
  }

  /* probe → table (look each row up) */
  if (view === 'phases' || view === 'probe' || view === 'recap') {
    const e = edge([
      V(probe.tiles[0].verts.W.x + 4, probe.top[1] + 8),
      V(690, 200),
      V(buckets[2].x + 18, buckets[2].y),
    ], { arrow: true, dashed: view === 'phases' });
    guides.push(e.guide);
    if (view === 'probe' || view === 'recap') railIn = e.d; // probe is the headline motion
    if (view === 'probe') badges.push(`<text class="sst-cap" x="690" y="176" text-anchor="middle">O(1) lookup</text>`);
  }

  /* emitted matches, bottom-centre (probe / recap) */
  if (view === 'probe' || view === 'recap') {
    const m1 = isoTile(478, 452, 34, 'green', { h: 12 });
    const m2 = isoTile(556, 468, 34, 'green', { h: 12 });
    push(m1); push(m2);
    const oe = edge([V(520, 320), V(520, 400), V(m1.top[0] + 10, m1.top[1] - 2)], { arrow: true });
    guides.push(oe.guide); railOut = oe.d;
    badges.push(`<text class="sst-cap" x="520" y="${A(m2.base[1] + 16)}" text-anchor="middle">joined rows</text>`);
  }

  /* per-view framing */
  if (view === 'phases') {
    badges.push(pill(210, 92, 'build', { icon: 'database', cls: 'pill--sst' }));
    badges.push(pill(850, 92, 'probe', { icon: 'search', cls: 'pill--sst' }));
    badges.push(region(396, 196, 248, 150, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="520" y="376" text-anchor="middle">two phases, two passes</text>`);
  }

  if (view === 'build') badges.push(pill(520, 372, 'build hash table', { icon: 'database' }));
  if (view === 'probe') badges.push(pill(850, 372, 'probe & match', { icon: 'search' }));

  if (view === 'memory') {
    badges.push(region(400, 194, 240, 160, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="520" y="150" text-anchor="middle">must fit in RAM</text>`);
    // the overflowing bucket spills to a disk tile below
    const spilled = buckets[buckets.length - 1];
    const disk = isoTile(690, 430, 46, 'lilac', { h: 16 });
    push(disk);
    const e = edge([V(spilled.x + 6, spilled.y + 10), V(660, 370), V(disk.top[0] - 6, disk.top[1] - 2)], { arrow: true, dashed: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(`<text class="sst-cap" x="690" y="${A(disk.base[1] + 16)}" text-anchor="middle">spill → grace hash</text>`);
    badges.push(pill(520, 372, 'partition & spill', { icon: 'file' }));
  }

  if (view === 'when') {
    badges.push(`<text class="sst-cap" x="520" y="392" text-anchor="middle" fill="var(--good, #2f8a43)">large unsorted equi-join  ✓</text>`);
    badges.push(`<text class="sst-cap" x="520" y="416" text-anchor="middle" fill="var(--bad, #c0392b)">range join  a.x &lt; b.y  ✗</text>`);
    badges.push(pill(520, 372, 'equi-joins only', { icon: 'check' }));
  }

  if (view === 'recap') {
    badges.push(pill(520, 372, 'one build pass + one probe pass', { icon: 'check', w: 300 }));
  }

  const flows = [];
  if (railIn) flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
  if (railOut) flows.push({ id: 'out', kind: 'write', speed: 130, size: 6 });

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
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Hash join algorithm">
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
