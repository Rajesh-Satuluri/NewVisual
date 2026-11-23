/* logical-plan-scene.js — the "Logical Plan" scene, in the same Designed-to-Scale
   isometric vocabulary as the other lessons.

   A relational-algebra tree, assembled bottom-up: leaf relations users/orders,
   a ⋈ join, a σ selection, a π projection. Per view the tree is annotated — the
   bound AST condensing into it, the operators named, the "what not how" framing,
   an equivalent (σ-pushed-down) shape, and the untouched leaves.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'convert', 'operators', 'declarative', 'equiv', 'noalgo', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderLogicalPlanScene(snap, opts = {}) {
  const view = snap.view || 'operators';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  function pushCube(c) { shadows.push(c.shadow); if (c.halo) halos.push(c.halo); solids.push(c.g); }

  /* ── the algebra tree (always present), assembled bottom-up ───────────── */
  const treeCx = 560;
  const usersT = isoTile(480, 442, 52, 'blue', {});
  const ordersT = isoTile(640, 442, 52, 'lilac', {});
  const join = isoCube(treeCx, 332, 46, 52, 'amber', { label: '⋈', sub: 'join', iconSize: 0, halo: view === 'operators' });
  const sigma = isoCube(treeCx, 226, 46, 52, 'amber', { label: 'σ', sub: 'total>100', iconSize: 0 });
  const pi = isoCube(treeCx, 120, 46, 52, 'amber', { label: 'π', sub: 'name', iconSize: 0, halo: view === 'recap' });

  // edges: leaves → join
  const eU = edge([V(usersT.top[0], usersT.top[1] - 2), V((usersT.top[0] + join.base[0]) / 2, join.base[1] + 16), V(join.base[0] - 10, join.base[1] - 2)], { arrow: true });
  const eO = edge([V(ordersT.top[0], ordersT.top[1] - 2), V((ordersT.top[0] + join.base[0]) / 2, join.base[1] + 16), V(join.base[0] + 10, join.base[1] - 2)], { arrow: true });
  guides.push(eU.guide, eO.guide);
  // join → sigma, sigma → pi
  const eJS = edge([V(join.top[0], join.top[1] - 2), V(sigma.base[0], (sigma.base[1] + join.top[1]) / 2), V(sigma.base[0], sigma.base[1] - 2)], { arrow: true });
  const eSP = edge([V(sigma.top[0], sigma.top[1] - 2), V(pi.base[0], (pi.base[1] + sigma.top[1]) / 2), V(pi.base[0], pi.base[1] - 2)], { arrow: true });
  guides.push(eJS.guide, eSP.guide);
  railIn = eU.d; // default: data climbs from the users leaf

  // leaf captions
  const usersCap = view === 'noalgo' ? 'users · no scan chosen' : 'users';
  const ordersCap = view === 'noalgo' ? 'orders · no scan chosen' : 'orders';
  badges.push(`<text class="sst-cap" x="480" y="${A(usersT.base[1] + 16)}" text-anchor="middle">${esc(usersCap)}</text>`);
  badges.push(`<text class="sst-cap" x="640" y="${A(ordersT.base[1] + 16)}" text-anchor="middle">${esc(ordersCap)}</text>`);

  /* ── CONVERT: a faded AST on the left, an arrow into the tree ─────────── */
  if (view === 'convert') {
    badges.push(region(70, 110, 250, 300, '', { r: 18 }));
    badges.push(pill(195, 128, 'bound AST', { icon: 'listOrdered', cls: 'pill--sst' }));
    const ast = [
      isoCube(195, 196, 34, 38, 'slate', { label: 'Select', iconSize: 0, ghost: true }),
      isoCube(150, 286, 30, 34, 'slate', { label: 'From', iconSize: 0, ghost: true }),
      isoCube(240, 286, 30, 34, 'slate', { label: 'Where', iconSize: 0, ghost: true }),
      isoCube(150, 366, 26, 30, 'slate', { label: 'users', iconSize: 0, ghost: true }),
      isoCube(240, 366, 26, 30, 'slate', { label: 'total', iconSize: 0, ghost: true }),
    ];
    ast.forEach(pushCube);
    const arrow = edge([V(330, 250), V(400, 250), V(usersT.verts.W.x - 8, 300)], { arrow: true });
    guides.push(arrow.guide);
    railIn = arrow.d; // the rewrite itself is the animated flow
    badges.push(pill(470, 150, 'AST → logical plan', { icon: 'merge', cls: 'pill--sst', w: 220 }));
  }

  /* paint the tree (bottom-up so upper nodes sit on top) */
  pushCube(usersT); pushCube(ordersT);
  pushCube(join); pushCube(sigma); pushCube(pi);

  /* ── per-view annotations ─────────────────────────────────────────────── */
  if (view === 'operators') {
    badges.push(pill(760, 120, 'σ  π  ⋈', { icon: 'layers', cls: 'pill--sst', w: 150 }));
    badges.push(`<text class="sst-cap" x="760" y="196" text-anchor="middle">π — keep name</text>`);
    badges.push(`<text class="sst-cap" x="760" y="232" text-anchor="middle">σ — keep total&gt;100</text>`);
    badges.push(`<text class="sst-cap" x="760" y="268" text-anchor="middle">⋈ — join on user_id</text>`);
  }
  if (view === 'declarative') {
    badges.push(region(760, 150, 230, 150, 'what, not how', { r: 20 }));
    badges.push(`<text class="sst-cap" x="875" y="330" text-anchor="middle">no scan · no join algorithm</text>`);
  }
  if (view === 'equiv') {
    // an equivalent shape: σ also drawn pushed down, below the join
    const sigmaLow = isoCube(410, 356, 38, 44, 'amber', { label: 'σ', sub: 'early', iconSize: 0, ghost: true });
    pushCube(sigmaLow);
    const rw = edge([V(sigma.verts.W.x - 4, sigma.front[1]), V(360, 290), V(sigmaLow.top[0], sigmaLow.top[1] - 4)], { arrow: true, dashed: true });
    guides.push(rw.guide);
    badges.push(`<text class="iso-region__t" x="300" y="430" text-anchor="middle">same result, different shape</text>`);
    badges.push(pill(812, 150, 'push σ down', { icon: 'merge', cls: 'pill--sst', w: 170 }));
    badges.push(`<text class="sst-cap" x="812" y="190" text-anchor="middle">filter before the join</text>`);
  }
  if (view === 'noalgo') {
    badges.push(pill(788, 430, 'leaves = tables, not methods', { icon: 'database', cls: 'pill--sst', w: 250 }));
  }
  if (view === 'recap') {
    badges.push(pill(788, 120, 'ready for the optimizer', { icon: 'check', cls: 'pill--sst', w: 220 }));
    ['σ selects', 'π projects', '⋈ joins'].forEach((t, i) =>
      badges.push(`<text class="sst-cap" x="788" y="${180 + i * 30}" text-anchor="middle">${esc(t)}</text>`));
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
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Logical plan — relational-algebra tree">
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
