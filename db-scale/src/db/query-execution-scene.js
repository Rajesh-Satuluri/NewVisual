/* query-execution-scene.js — the "Query Execution" scene, in the same
   Designed-to-Scale isometric vocabulary as the other Query-Engine lessons.

   A physical plan tree (Scan · Scan → Join → Filter → Project) is executed as a
   pull-based iterator tree: control flows down, rows pipeline up. Blocking
   operators break the pipeline; vectorized execution pushes batches.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'overview', 'iterator', 'pipeline', 'blocking', 'vectorized', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderQueryExecutionScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  const hot = (k) => view === k;

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const pushCube = (c) => { shadows.push(c.shadow); if (c.halo) halos.push(c.halo); solids.push(c.g); };

  /* ── the physical plan tree (bottom-up), centred ──────────────────────── */
  const treeCx = 540;

  // leaves: the two scans over a small disk
  const usersScan = isoTile(452, 452, 50, 'blue', { halo: hot('iterator') });
  const ordersScan = isoTile(632, 452, 50, 'lilac', { halo: hot('blocking') });
  pushCube(usersScan); pushCube(ordersScan);
  badges.push(`<text class="sst-cap" x="452" y="${A(usersScan.base[1] + 15)}" text-anchor="middle">Scan · users</text>`);
  badges.push(`<text class="sst-cap" x="632" y="${A(ordersScan.base[1] + 15)}" text-anchor="middle">Scan · orders</text>`);

  const join = isoCube(treeCx, 332, 50, 54, 'amber', {
    label: 'Join', sub: 'hash', iconSize: 0,
    halo: hot('blocking'), pulse: hot('blocking'),
  });
  const filt = isoCube(treeCx, 224, 48, 52, 'amber', { label: 'Filter', sub: 'total>100', iconSize: 0 });
  const proj = isoCube(treeCx, 118, 48, 52, 'green', { label: 'Project', sub: 'name', iconSize: 0, halo: hot('recap') });

  // edges upward = the iterator pull path / row flow
  const eU = edge([V(usersScan.top[0], usersScan.top[1] - 2), V((usersScan.top[0] + join.base[0]) / 2, join.base[1] + 16), V(join.base[0] - 10, join.base[1] - 2)], { arrow: true });
  const eO = edge([V(ordersScan.top[0], ordersScan.top[1] - 2), V((ordersScan.top[0] + join.base[0]) / 2, join.base[1] + 16), V(join.base[0] + 10, join.base[1] - 2)], { arrow: true });
  const eJF = edge([V(join.top[0], join.top[1] - 2), V(filt.base[0], (filt.base[1] + join.top[1]) / 2), V(filt.base[0], filt.base[1] - 2)], { arrow: true });
  const eFP = edge([V(filt.top[0], filt.top[1] - 2), V(proj.base[0], (proj.base[1] + filt.top[1]) / 2), V(proj.base[0], proj.base[1] - 2)], { arrow: true });
  guides.push(eU.guide, eO.guide, eJF.guide, eFP.guide);
  pushCube(join); pushCube(filt); pushCube(proj);

  // default animated rail: rows pulled up the first leaf→join edge
  railIn = eU.d;

  /* ── per-view extras ──────────────────────────────────────────────────── */
  if (view === 'overview') {
    badges.push(pill(treeCx, 60, 'executor walks the plan', { icon: 'bolt', cls: 'pill--sst', w: 220 }));
    // a dashed downward "pull" path from the root to a leaf
    const pull = edge([V(proj.verts.E.x + 6, proj.front[1]), V(840, 300), V(usersScan.verts.E.x + 6, usersScan.front[1] - 30), V(usersScan.verts.E.x - 4, usersScan.front[1])], { arrow: true, dashed: true });
    guides.push(pull.guide);
    badges.push(`<text class="sst-cap" x="862" y="300" text-anchor="middle">pull from the root</text>`);
    railIn = pull.d;
  }

  if (view === 'iterator') {
    badges.push(pill(treeCx, 60, 'iterator model', { icon: 'layers', cls: 'pill--sst' }));
    badges.push(pill(860, 180, 'open()', { cls: 'pill--sst', w: 120 }));
    badges.push(pill(860, 230, 'next()', { cls: 'pill--sst', w: 120 }));
    badges.push(pill(860, 280, 'close()', { cls: 'pill--sst', w: 120 }));
    badges.push(`<text class="sst-cap" x="860" y="150" text-anchor="middle">every operator:</text>`);
  }

  if (view === 'pipeline') {
    badges.push(pill(treeCx, 60, 'pipelined', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="868" y="286" text-anchor="middle">one row at a time</text>`);
    badges.push(`<text class="sst-cap" x="868" y="308" text-anchor="middle">no intermediates</text>`);
  }

  if (view === 'blocking') {
    badges.push(pill(treeCx, 60, 'pipeline breaker', { icon: 'alert', cls: 'pill--sst', w: 176 }));
    // materialized build side next to the join
    const buf = region(690, 300, 150, 92, '', { r: 16 });
    badges.push(buf);
    badges.push(`<text class="iso-region__t" x="765" y="338" text-anchor="middle">must read</text>`);
    badges.push(`<text class="iso-region__t" x="765" y="360" text-anchor="middle">all input first</text>`);
  }

  if (view === 'vectorized') {
    badges.push(pill(treeCx, 60, 'vectorized', { icon: 'layers', cls: 'pill--sst' }));
    // a batch of rows on the filter→project edge
    const bx = 756;
    for (let i = 0; i < 4; i++) {
      const b = isoTile(bx, 250 + i * 24, 20, 'green', {});
      pushCube(b);
    }
    badges.push(`<text class="sst-cap" x="${bx}" y="238" text-anchor="middle">a batch of rows</text>`);
  }

  if (view === 'recap') {
    badges.push(pill(treeCx, 60, 'plan → result rows', { icon: 'check', cls: 'pill--sst', w: 200 }));
    // green result tiles above the root
    const r1 = isoTile(460, 108, 24, 'green', {});
    const r2 = isoTile(510, 92, 24, 'green', {});
    const r3 = isoTile(560, 108, 24, 'green', {});
    [r1, r2, r3].forEach(pushCube);
    badges.push(`<text class="sst-cap" x="510" y="64" text-anchor="middle">result rows</text>`);
  }

  const flows = railIn ? [{ id: 'in', kind: 'read', speed: 150, size: 5 }] : [];
  if (railOut) flows.push({ id: 'out', kind: 'write', speed: 130, size: 6 });

  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
}

/* stitch the SVG together in the shared layer order (verbatim from dbms-scene) */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Query execution">
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
