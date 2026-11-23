/* explain-analyze-scene.js — the "EXPLAIN ANALYZE" scene, in the same Designed-
   to-Scale isometric vocabulary as the other Query-Engine lessons.

   A single physical plan TREE (Seq/Index scans → Hash Join → Filter → Project)
   annotated, per view, with estimate pills, then actual-rows/time pills, a
   stale-stats gap, the time bottleneck, and a bottom-up reading order.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'explain', 'analyze', 'gap', 'bottleneck', 'readup', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderExplainAnalyzeScene(snap, opts = {}) {
  const view = snap.view || 'recap';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const pushCube = (c) => { shadows.push(c.shadow); if (c.halo) halos.push(c.halo); solids.push(c.g); };
  const hot = (k) => view === k;

  /* ── the plan tree, assembled bottom-up (centre x≈520) ────────────────── */
  const treeCx = 520;

  // leaves: the two access methods
  const usersScan = isoTile(430, 452, 50, 'blue', {});
  const ordersScan = isoTile(610, 452, 50, 'lilac', { halo: hot('gap') || hot('bottleneck') ? false : false });
  pushCube(usersScan); pushCube(ordersScan);
  badges.push(`<text class="sst-cap" x="430" y="${A(usersScan.base[1] + 15)}" text-anchor="middle">Index Scan · users</text>`);
  badges.push(`<text class="sst-cap" x="610" y="${A(ordersScan.base[1] + 15)}" text-anchor="middle">Seq Scan · orders</text>`);

  // the join is the hot node for 'gap' and 'bottleneck'
  const joinHot = hot('gap') || hot('bottleneck');
  const join = isoCube(treeCx, 332, 50, 54, joinHot ? 'rose' : 'amber', { label: 'Hash Join', sub: '⋈', iconSize: 0, halo: hot('bottleneck') });
  const filt = isoCube(treeCx, 224, 48, 52, 'amber', { label: 'Filter', sub: 'total>100', iconSize: 0 });
  const proj = isoCube(treeCx, 118, 48, 52, 'green', { label: 'Project', sub: 'name', iconSize: 0 });

  // edges upward (execution / pull order)
  const eU = edge([V(usersScan.top[0], usersScan.top[1] - 2), V((usersScan.top[0] + join.base[0]) / 2, join.base[1] + 16), V(join.base[0] - 10, join.base[1] - 2)], { arrow: true });
  const eO = edge([V(ordersScan.top[0], ordersScan.top[1] - 2), V((ordersScan.top[0] + join.base[0]) / 2, join.base[1] + 16), V(join.base[0] + 10, join.base[1] - 2)], { arrow: true });
  const eJF = edge([V(join.top[0], join.top[1] - 2), V(filt.base[0], (filt.base[1] + join.top[1]) / 2), V(filt.base[0], filt.base[1] - 2)], { arrow: true });
  const eFP = edge([V(filt.top[0], filt.top[1] - 2), V(proj.base[0], (proj.base[1] + filt.top[1]) / 2), V(proj.base[0], proj.base[1] - 2)], { arrow: true });
  guides.push(eU.guide, eO.guide, eJF.guide, eFP.guide);
  pushCube(join); pushCube(filt); pushCube(proj);
  railIn = eU.d;

  /* pill helpers: a right-hand annotation column at x≈760 / x≈880 */
  const estPill = (node, txt, x) => pill(x, node.front[1], txt, { cls: 'pill--sst', w: 150 });

  /* ── per-view annotations ─────────────────────────────────────────────── */
  if (view === 'explain') {
    badges.push(pill(treeCx, 60, 'EXPLAIN · plan only, no run', { icon: 'search', cls: 'pill--sst', w: 250 }));
    badges.push(estPill(proj, 'est 1.4k · cost 260', 800));
    badges.push(estPill(filt, 'est 1.4k · cost 180', 800));
    badges.push(estPill(join, 'est 1.4k · cost 120', 800));
    badges.push(estPill(ordersScan, 'est 142k · cost 90', 800));
    badges.push(`<text class="sst-cap" x="800" y="${A(proj.front[1] - 26)}" text-anchor="middle">optimizer's guess</text>`);
  }

  if (view === 'analyze') {
    badges.push(pill(treeCx, 60, 'ANALYZE · real rows + time', { icon: 'clock', cls: 'pill--sst', w: 250 }));
    const pair = (node, est, act) => {
      badges.push(pill(770, node.front[1], est, { cls: 'pill--sst', w: 132 }));
      badges.push(pill(912, node.front[1], act, { cls: '', w: 132 }));
    };
    pair(proj, 'est 1.4k', 'act 1.5k · 12ms');
    pair(filt, 'est 1.4k', 'act 1.5k · 8ms');
    pair(join, 'est 1.4k', 'act 1.5k · 6ms');
    badges.push(`<text class="sst-cap" x="770" y="${A(proj.front[1] - 26)}" text-anchor="middle">estimate</text>`);
    badges.push(`<text class="sst-cap" x="912" y="${A(proj.front[1] - 26)}" text-anchor="middle">actual</text>`);
  }

  if (view === 'gap') {
    badges.push(pill(770, join.front[1] - 18, 'est 1.4k', { cls: 'pill--sst', w: 120 }));
    badges.push(pill(770, join.front[1] + 18, 'actual 48k', { cls: '', w: 120 }));
    badges.push(`<text class="iso-region__t" x="865" y="${A(join.front[1] + 70)}" text-anchor="middle">estimate 34× off → stale stats</text>`);
    badges.push(pill(treeCx, 60, 'estimated vs actual', { icon: 'alert', cls: 'pill--sst', w: 210 }));
  }

  if (view === 'bottleneck') {
    badges.push(pill(790, join.front[1], 'actual 220ms', { cls: '', w: 150 }));
    badges.push(pill(790, proj.front[1], '12ms', { cls: 'pill--sst', w: 90 }));
    badges.push(pill(790, filt.front[1], '8ms', { cls: 'pill--sst', w: 90 }));
    badges.push(`<text class="iso-region__t" x="815" y="${A(join.front[1] + 46)}" text-anchor="middle">most of the time is here</text>`);
    badges.push(pill(treeCx, 60, 'optimize this node first', { icon: 'target', cls: 'pill--sst', w: 220 }));
  }

  if (view === 'readup') {
    const up = edge([V(ordersScan.verts.W.x - 10, ordersScan.front[1]), V(360, join.front[1]), V(360, filt.front[1]), V(360, proj.front[1]), V(proj.verts.W.x - 8, proj.front[1])], { arrow: true, dashed: true });
    guides.push(up.guide);
    badges.push(`<text class="sst-cap" x="300" y="${A(join.front[1] + 40)}" text-anchor="middle">1 scan</text>`);
    badges.push(`<text class="sst-cap" x="300" y="${A(filt.front[1])}" text-anchor="middle">2 join → 3 filter</text>`);
    badges.push(`<text class="sst-cap" x="300" y="${A(proj.front[1] - 30)}" text-anchor="middle">4 project</text>`);
    badges.push(pill(treeCx, 60, 'read bottom-up', { icon: 'layers', cls: 'pill--sst', w: 170 }));
  }

  if (view === 'recap') {
    badges.push(pill(treeCx, 60, 'EXPLAIN ANALYZE · your tuning tool', { icon: 'check', cls: 'pill--sst', w: 300 }));
    badges.push(pill(810, proj.front[1], 'est ≈ actual ✓', { cls: 'pill--sst', w: 150 }));
    badges.push(pill(810, filt.front[1], 'rows + time', { cls: 'pill--sst', w: 150 }));
    badges.push(pill(810, join.front[1], 'find the hot node', { cls: 'pill--sst', w: 170 }));
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
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="EXPLAIN ANALYZE plan">
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
