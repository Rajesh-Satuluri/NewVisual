/* physical-plan-scene.js — the "Physical Plan" scene, in the same Designed-to-
   Scale isometric vocabulary as the other Query-Engine lessons.

   A logical operator tree (ghost, left) is rewritten into a runnable PHYSICAL
   tree (right): Seq/Index scans at the leaves, a Hash Join, a Filter and a
   Project above, each a pull-based iterator, each annotated with a cost.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'convert', 'access', 'join', 'iterators', 'cost', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderPhysicalPlanScene(snap, opts = {}) {
  const view = snap.view || 'recap';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const pushCube = (c) => { shadows.push(c.shadow); if (c.halo) halos.push(c.halo); solids.push(c.g); };

  /* ── LEFT: the ghost logical tree (only when converting) ──────────────── */
  if (view === 'convert') {
    badges.push(region(70, 90, 230, 350, '', { r: 18 }));
    badges.push(pill(185, 110, 'logical plan', { icon: 'layers', cls: 'pill--sst' }));
    const lU = isoTile(145, 404, 32, 'blue', { ghost: true });
    const lO = isoTile(225, 404, 32, 'lilac', { ghost: true });
    const lJoin = isoCube(185, 330, 34, 38, 'amber', { label: '⋈', iconSize: 0, ghost: true });
    const lSig = isoCube(185, 250, 34, 38, 'amber', { label: 'σ', iconSize: 0, ghost: true });
    const lPi = isoCube(185, 170, 34, 38, 'amber', { label: 'π', iconSize: 0, ghost: true });
    [lU, lO, lJoin, lSig, lPi].forEach(pushCube);
    // faint internal wires
    guides.push(edge([V(lU.top[0], lU.top[1] - 2), V(lJoin.base[0] - 6, lJoin.base[1] - 2)], {}).guide);
    guides.push(edge([V(lO.top[0], lO.top[1] - 2), V(lJoin.base[0] + 6, lJoin.base[1] - 2)], {}).guide);
    guides.push(edge([V(lJoin.top[0], lJoin.top[1] - 2), V(lSig.base[0], lSig.base[1] - 2)], {}).guide);
    guides.push(edge([V(lSig.top[0], lSig.top[1] - 2), V(lPi.base[0], lPi.base[1] - 2)], {}).guide);
  }

  /* ── RIGHT: the physical tree (assembled bottom-up) ───────────────────── */
  const treeCx = 650;
  const hot = (k) => view === k;

  // leaves: the two access methods
  const usersScan = isoTile(560, 452, 52, 'blue', { halo: hot('access') });
  const ordersScan = isoTile(742, 452, 52, 'lilac', { halo: hot('access') });
  pushCube(usersScan); pushCube(ordersScan);
  badges.push(`<text class="sst-cap" x="560" y="${A(usersScan.base[1] + 15)}" text-anchor="middle">Seq Scan · users</text>`);
  badges.push(`<text class="sst-cap" x="742" y="${A(ordersScan.base[1] + 15)}" text-anchor="middle">Index Scan · orders</text>`);

  const join = isoCube(treeCx, 332, 50, 54, 'amber', { label: 'Hash Join', sub: '⋈', iconSize: 0, halo: hot('join') });
  const filt = isoCube(treeCx, 224, 48, 52, 'amber', { label: 'Filter', sub: 'total>100', iconSize: 0 });
  const proj = isoCube(treeCx, 118, 48, 52, 'green', { label: 'Project', sub: 'name', iconSize: 0 });

  // edges upward (the iterator pull path)
  const eU = edge([V(usersScan.top[0], usersScan.top[1] - 2), V((usersScan.top[0] + join.base[0]) / 2, join.base[1] + 16), V(join.base[0] - 10, join.base[1] - 2)], { arrow: true });
  const eO = edge([V(ordersScan.top[0], ordersScan.top[1] - 2), V((ordersScan.top[0] + join.base[0]) / 2, join.base[1] + 16), V(join.base[0] + 10, join.base[1] - 2)], { arrow: true });
  const eJF = edge([V(join.top[0], join.top[1] - 2), V(filt.base[0], (filt.base[1] + join.top[1]) / 2), V(filt.base[0], filt.base[1] - 2)], { arrow: true });
  const eFP = edge([V(filt.top[0], filt.top[1] - 2), V(proj.base[0], (proj.base[1] + filt.top[1]) / 2), V(proj.base[0], proj.base[1] - 2)], { arrow: true });
  guides.push(eU.guide, eO.guide, eJF.guide, eFP.guide);
  pushCube(join); pushCube(filt); pushCube(proj);

  /* ── per-view extras ──────────────────────────────────────────────────── */
  if (view === 'convert') {
    const arrow = edge([V(312, 200), V(430, 150), V(proj.verts.W.x - 8, proj.front[1])], { arrow: true, dashed: true });
    guides.push(arrow.guide);
    badges.push(pill(400, 112, 'logical → physical', { icon: 'merge', cls: 'pill--sst', w: 196 }));
    railIn = arrow.d;
  } else {
    railIn = eU.d;
  }

  if (view === 'access') {
    badges.push(pill(treeCx, 70, 'access methods', { icon: 'database', cls: 'pill--sst' }));
  }

  if (view === 'join') {
    const algos = [['Hash Join', true], ['Nested Loop', false], ['Merge Join', false]];
    algos.forEach(([name, on], i) => {
      badges.push(pill(912, 150 + i * 50, name, { icon: 'merge', cls: on ? '' : 'pill--sst', w: 150 }));
    });
    badges.push(`<text class="sst-cap" x="912" y="128" text-anchor="middle">one logical ⋈ →</text>`);
  }

  if (view === 'iterators') {
    badges.push(pill(treeCx, 70, 'iterator model', { icon: 'layers', cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="868" y="300" text-anchor="middle">rows pulled</text>`);
    badges.push(`<text class="sst-cap" x="868" y="322" text-anchor="middle">up the tree</text>`);
  }

  if (view === 'cost') {
    const tag = (node, c) => badges.push(pill(node.verts.E.x + 58, node.front[1], 'cost ' + c, { cls: 'pill--sst', w: 92 }));
    tag(proj, 260); tag(filt, 180); tag(join, 120);
    badges.push(pill(560, 548, 'Σ = plan cost', { icon: 'gauge', cls: 'pill--sst', w: 150 }));
  }

  if (view === 'recap') {
    badges.push(pill(treeCx, 70, 'the executor runs this', { icon: 'check', cls: 'pill--sst', w: 210 }));
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
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Physical plan">
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
