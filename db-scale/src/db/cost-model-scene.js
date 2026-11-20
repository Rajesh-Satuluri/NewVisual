/* cost-model-scene.js — the "Cost Model" scene, in the same Designed-to-Scale
   isometric vocabulary as the other Query-Engine lessons.

   One physical plan tree (Seq Scan + Index Scan → Hash Join → Filter → Project)
   is progressively annotated with cost: first I/O at the leaves, then CPU at the
   operators, then cumulative costs rolled up to the root, then the row estimates
   that drive — and distort — the whole number.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'why', 'io', 'cpu', 'combine', 'cardinality', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderCostModelScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  const hot = (k) => view === k;

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const pushCube = (c) => { shadows.push(c.shadow); if (c.halo) halos.push(c.halo); solids.push(c.g); };

  /* ── the physical plan tree (assembled bottom-up), centred ──────────────── */
  const cx = 500;

  const usersScan = isoTile(cx - 40, 452, 52, 'lilac', { halo: hot('io') });
  const ordersScan = isoTile(cx + 100, 452, 52, 'blue', { halo: hot('io') });
  pushCube(usersScan); pushCube(ordersScan);
  badges.push(`<text class="sst-cap" x="${A(cx - 40)}" y="${A(usersScan.base[1] + 15)}" text-anchor="middle">Seq Scan · users</text>`);
  badges.push(`<text class="sst-cap" x="${A(cx + 100)}" y="${A(ordersScan.base[1] + 15)}" text-anchor="middle">Index Scan · orders</text>`);

  const join = isoCube(cx, 340, 50, 54, 'amber', { label: 'Hash Join', sub: '⋈', iconSize: 0, halo: hot('cpu') });
  const filt = isoCube(cx, 234, 48, 52, 'amber', { label: 'Filter', sub: 'total>100', iconSize: 0, halo: hot('cpu') });
  const projMat = hot('cardinality') ? 'green' : (hot('recap') ? 'green' : 'green');
  const proj = isoCube(cx, 128, 48, 52, projMat, { label: 'Project', sub: 'name', iconSize: 0, halo: hot('recap') });

  // edges upward (the cost accumulation / pull path)
  const eU = edge([V(usersScan.top[0], usersScan.top[1] - 2), V((usersScan.top[0] + join.base[0]) / 2, join.base[1] + 16), V(join.base[0] - 10, join.base[1] - 2)], { arrow: true });
  const eO = edge([V(ordersScan.top[0], ordersScan.top[1] - 2), V((ordersScan.top[0] + join.base[0]) / 2, join.base[1] + 16), V(join.base[0] + 10, join.base[1] - 2)], { arrow: true });
  const eJF = edge([V(join.top[0], join.top[1] - 2), V(filt.base[0], (filt.base[1] + join.top[1]) / 2), V(filt.base[0], filt.base[1] - 2)], { arrow: true });
  const eFP = edge([V(filt.top[0], filt.top[1] - 2), V(proj.base[0], (proj.base[1] + filt.top[1]) / 2), V(proj.base[0], proj.base[1] - 2)], { arrow: true });
  guides.push(eU.guide, eO.guide, eJF.guide, eFP.guide);
  pushCube(join); pushCube(filt); pushCube(proj);
  railIn = eU.d;

  // a cost pill to the right of a node
  const costPill = (node, text, highlight) =>
    badges.push(pill(node.verts.E.x + 60, node.front[1], text, { cls: highlight ? '' : 'pill--sst', w: 104 }));
  // a smaller tag to the LEFT of a node (row estimates)
  const leftTag = (node, text, highlight) =>
    badges.push(pill(node.verts.W.x - 56, node.front[1], text, { cls: highlight ? '' : 'pill--sst', w: 96 }));

  /* ── per-view annotations ─────────────────────────────────────────────── */
  if (view === 'why') {
    costPill(proj, 'cost = ?', true);
    badges.push(pill(cx, 70, 'reduce a plan to one number', { icon: 'gauge', cls: 'pill--sst', w: 250 }));
  }

  if (view === 'io') {
    costPill(usersScan, 'pages 120', false);
    costPill(ordersScan, 'pages 60', false);
    badges.push(`<text class="sst-cap" x="880" y="430" text-anchor="middle">sequential &lt; random</text>`);
    badges.push(pill(cx, 70, 'I/O cost = pages × weight', { icon: 'file', cls: 'pill--sst', w: 230 }));
  }

  if (view === 'cpu') {
    costPill(join, 'rows 1.4k', false);
    costPill(filt, 'rows 1.4k', false);
    badges.push(`<text class="sst-cap" x="700" y="130" text-anchor="middle">compare · hash · copy</text>`);
    badges.push(pill(cx, 70, 'CPU cost = rows × weight', { icon: 'gauge', cls: 'pill--sst', w: 230 }));
  }

  if (view === 'combine') {
    costPill(usersScan, 'cost 40', false);
    costPill(ordersScan, 'cost 30', false);
    costPill(join, 'cost 120', false);
    costPill(filt, 'cost 180', false);
    costPill(proj, 'cost 260', true);
    badges.push(`<text class="iso-region__t" x="824" y="300" text-anchor="middle">child costs roll up</text>`);
    badges.push(pill(cx, 70, 'Σ to the root', { icon: 'merge', cls: 'pill--sst', w: 150 }));
  }

  if (view === 'cardinality') {
    leftTag(usersScan, '~10k', false);
    leftTag(join, 'est 1.4k', true);
    leftTag(filt, 'est 1.4k', false);
    costPill(join, 'cost 8.9k', true);
    costPill(proj, 'cost 9k', true);
    badges.push(`<text class="iso-region__t" x="${A(cx)}" y="548" text-anchor="middle">a wrong row estimate compounds up the tree</text>`);
    badges.push(pill(cx, 70, 'cardinality drives cost', { icon: 'alert', cls: 'pill--sst', w: 220 }));
  }

  if (view === 'recap') {
    costPill(proj, 'cost 260', true);
    badges.push(`<text class="sst-cap" x="${A(cx)}" y="548" text-anchor="middle">cost = I/O + CPU, weighted by rows</text>`);
    badges.push(pill(cx, 70, 'one number per plan', { icon: 'check', cls: 'pill--sst', w: 200 }));
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
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Cost model">
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
