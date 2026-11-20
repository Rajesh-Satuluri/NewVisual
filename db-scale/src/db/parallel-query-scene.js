/* parallel-query-scene.js — the "Parallel Query" scene, in the shared
   Designed-to-Scale isometric vocabulary: a table of pages up top, a row of
   worker cubes below it, and a Gather/leader cube that merges their streams.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, flows, note }.

   Views: 'idea', 'scan', 'gather', 'partial', 'limits', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a horizontal row of page tiles; returns the tile handles */
function pageRow(cx, cy, n, gap, tones) {
  const tiles = [];
  const start = cx - (n - 1) * gap / 2;
  for (let i = 0; i < n; i++) {
    const tone = Array.isArray(tones) ? tones[i] : tones;
    tiles.push(isoTile(start + i * gap, cy, 26, tone || 'lilac', { h: 12 }));
  }
  return tiles;
}

export function renderParallelQueryScene(snap, opts = {}) {
  const view = snap.view || 'idea';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  // worker lane layout (three workers by default; limits view adds a fourth)
  const nWorkers = view === 'limits' ? 4 : 3;
  const workerY = 318;
  const workerXs = nWorkers === 4 ? [250, 440, 630, 820] : [310, 520, 730];
  const gatherCx = nWorkers === 4 ? 535 : 520, gatherCy = 470;

  /* ── the table of pages across the top ──────────────────────────────── */
  // slice colouring: in 'scan'/'partial'/'recap' colour pages by owning worker
  const SLICE_TONES = ['blue', 'green', 'amber', 'rose'];
  const nPages = 8;
  let pageTones = 'lilac';
  if (view === 'scan' || view === 'partial' || view === 'recap') {
    pageTones = [];
    for (let i = 0; i < nPages; i++) pageTones.push(SLICE_TONES[Math.floor(i / (nPages / 3)) % 3]);
  } else if (view === 'limits') {
    // skew: worker 0 owns a fat slice (5 pages), the rest share 3
    pageTones = ['rose', 'rose', 'rose', 'rose', 'rose', 'green', 'amber', 'blue'];
  }
  const pages = pageRow(540, 128, nPages, 64, pageTones);
  pages.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
  badges.push(pill(540, 70, 'orders  ·  table pages', { icon: 'file', cls: 'pill--sst' }));

  /* ── the workers ────────────────────────────────────────────────────── */
  const workers = workerXs.map((x, i) => {
    const skewed = view === 'limits' && i === 0;
    return isoCube(x, workerY, skewed ? 58 : 48, skewed ? 62 : 52, skewed ? 'rose' : 'blue', {
      icon: 'server', label: 'Worker', sub: skewed ? 'skewed' : `w${i + 1}`, iconSize: 20,
    });
  });
  workers.forEach(w => { shadows.push(w.shadow); solids.push(w.g); });

  /* ── the Gather / leader ────────────────────────────────────────────── */
  const gather = isoCube(gatherCx, gatherCy, 66, 70, 'green', {
    icon: 'merge', label: 'Gather', sub: 'leader', iconSize: 22,
    halo: view === 'gather' || view === 'partial' || view === 'recap',
  });
  shadows.push(gather.shadow);
  if (gather.halo) halos.push(gather.halo);
  solids.push(gather.g);

  /* ── edges: table → each worker ─────────────────────────────────────── */
  // map each worker to the x of its slice's middle page (for slice views)
  workers.forEach((w, i) => {
    let srcX = w.top[0];
    if (Array.isArray(pageTones)) {
      // find a page tile belonging to this worker's slice colour
      const sliceTone = view === 'limits'
        ? (i === 0 ? 'rose' : SLICE_TONES[(i) % 3])
        : SLICE_TONES[i % 3];
      const owned = pages.filter((p, idx) => (Array.isArray(pageTones) ? pageTones[idx] : '') === sliceTone);
      if (owned.length) srcX = owned[Math.floor(owned.length / 2)].top[0];
    }
    const e = edge([
      V(srcX, 150),
      V((srcX + w.top[0]) / 2, 230),
      V(w.top[0], w.verts.N.y - 2),
    ], { arrow: true, dashed: view === 'idea' });
    guides.push(e.guide);
    if (i === 0) railIn = e.d;
  });

  /* ── edges: each worker → Gather ────────────────────────────────────── */
  workers.forEach((w, i) => {
    const e = edge([
      V(w.base[0], w.base[1] - 4),
      V((w.base[0] + gather.top[0]) / 2, (w.base[1] + gather.verts.N.y) / 2 + 6),
      V(gather.top[0] + (i - (nWorkers - 1) / 2) * 10, gather.verts.N.y - 2),
    ], { arrow: true });
    guides.push(e.guide);
    if (i === nWorkers - 1) railOut = e.d;
  });

  flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
  flows.push({ id: 'out', kind: 'read', speed: 170, size: 5 });

  /* ── per-view overlays ──────────────────────────────────────────────── */
  if (view === 'idea') {
    badges.push(pill(gatherCx, gatherCy + 118, 'one query · many workers', { icon: 'server' }));
  }

  if (view === 'scan') {
    badges.push(pill(workerXs[0] - 60, workerY - 96, 'parallel scan', { icon: 'search' }));
    badges.push(`<text class="sst-cap" x="540" y="185" text-anchor="middle">each worker — a slice of pages</text>`);
  }

  if (view === 'gather') {
    badges.push(region(gatherCx - 250, gatherCy - 48, 500, 150, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="${A(gatherCx)}" y="${A(gatherCy + 118)}" text-anchor="middle">partial streams merged into one</text>`);
    // a single result tile below the gather
    const res = isoTile(gatherCx, gatherCy + 150, 34, 'green', { h: 14 });
    shadows.push(res.shadow); solids.push(res.g);
    badges.push(`<text class="sst-cap" x="${A(gatherCx)}" y="${A(res.base[1] + 16)}" text-anchor="middle">result</text>`);
  }

  if (view === 'partial') {
    // each worker emits a small partial tile toward the gather
    workers.forEach((w, i) => {
      badges.push(`<text class="sst-cap" x="${A(w.top[0])}" y="${A(w.base[1] + 26)}" text-anchor="middle">partial</text>`);
    });
    const res = isoTile(gatherCx, gatherCy + 150, 34, 'green', { h: 14, halo: true });
    shadows.push(res.shadow); if (res.halo) halos.push(res.halo); solids.push(res.g);
    badges.push(pill(gatherCx, gatherCy + 118, 'partial COUNT → final sum', { icon: 'merge' }));
    badges.push(`<text class="sst-cap" x="${A(gatherCx)}" y="${A(res.base[1] + 16)}" text-anchor="middle">total</text>`);
  }

  if (view === 'limits') {
    badges.push(pill(820, 120, 'sublinear (Amdahl)', { icon: 'gauge', w: 190 }));
    badges.push(`<text class="iso-region__t" x="250" y="250" text-anchor="middle">skew + coordination cap speed-up</text>`);
    badges.push(`<text class="sst-cap" x="${A(gatherCx)}" y="${A(gatherCy + 110)}" text-anchor="middle">as fast as the slowest worker</text>`);
  }

  if (view === 'recap') {
    const res = isoTile(gatherCx, gatherCy + 150, 34, 'green', { h: 14 });
    shadows.push(res.shadow); solids.push(res.g);
    badges.push(pill(gatherCx, gatherCy + 118, 'more cores · less wall-time', { icon: 'check', w: 230 }));
    badges.push(`<text class="sst-cap" x="${A(gatherCx)}" y="${A(res.base[1] + 16)}" text-anchor="middle">one answer</text>`);
  }

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
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Parallel query execution">
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
