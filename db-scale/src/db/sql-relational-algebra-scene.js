/* sql-relational-algebra-scene.js — the "SQL → Relational Algebra" scene, in the
   same Designed-to-Scale isometric vocabulary as the other Foundations lessons.

   Left: the SQL query you wrote, one clause per line, with the active clause
   lit. Right: the operator tree the engine compiles it into, assembled
   bottom-up — leaf relations users/orders, a ⋈ join, a σ selection, a π
   projection — with the operator for the current clause pulsing.

   Input: a view-snapshot { view, pulse, note }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'intro', 'from', 'where', 'select', 'tree', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderSqlRelationalAlgebraScene(snap, opts = {}) {
  const view = snap.view || 'intro';
  const pulse = snap.pulse || opts.pulse || null;

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── which tree nodes are present for this view ───────────────────────── */
  const show = {
    leaves: true,
    join: view !== 'intro',
    sigma: view === 'where' || view === 'select' || view === 'tree' || view === 'recap',
    pi: view === 'select' || view === 'tree' || view === 'recap',
  };

  /* ── LEFT: the SQL panel ──────────────────────────────────────────────── */
  badges.push(region(40, 90, 300, 300, '', { r: 18 }));
  badges.push(pill(190, 110, 'SQL (declarative)', { icon: 'search', cls: 'pill--sst' }));

  const lines = [
    'SELECT name',
    'FROM users',
    'JOIN orders ON id = user_id',
    'WHERE total > 100',
  ];
  const activeByView = {
    intro: [], from: [1, 2], where: [3], select: [0], tree: [], recap: [],
  };
  const active = activeByView[view] || [];
  const lineY = [162, 204, 246, 288];
  lines.forEach((ln, i) => {
    const on = active.includes(i);
    const cls = on ? 'iso-region__t' : 'sst-cap';
    badges.push(`<text class="${cls}" x="64" y="${lineY[i]}" text-anchor="start">${esc(ln)}</text>`);
  });

  /* ── RIGHT: the operator tree (assembled bottom-up) ───────────────────── */
  // leaf relations
  const usersT = isoTile(560, 452, 52, 'blue',  { label: 'users',  halo: false });
  const ordersT = isoTile(732, 452, 52, 'lilac', { label: 'orders', halo: false });
  // isoTile has no label support, so draw captions under each leaf
  pushCube(usersT); pushCube(ordersT);
  badges.push(`<text class="sst-cap" x="560" y="${A(usersT.base[1] + 16)}" text-anchor="middle">users</text>`);
  badges.push(`<text class="sst-cap" x="732" y="${A(ordersT.base[1] + 16)}" text-anchor="middle">orders</text>`);

  const treeCx = 646;
  const join = isoCube(treeCx, 330, 46, 52, 'amber', { label: '⋈', sub: 'join', iconSize: 0, pulse: pulse === 'join', halo: view === 'from' });
  const sigma = isoCube(treeCx, 224, 46, 52, 'amber', { label: 'σ', sub: 'where', iconSize: 0, pulse: pulse === 'sigma', halo: view === 'where' });
  const pi = isoCube(treeCx, 118, 46, 52, 'amber', { label: 'π', sub: 'select', iconSize: 0, pulse: pulse === 'pi', halo: view === 'select' });

  // edges: leaves → join
  if (show.join) {
    const eU = edge([V(usersT.top[0], usersT.top[1] - 2), V((usersT.top[0] + join.base[0]) / 2, join.base[1] + 18), V(join.base[0] - 10, join.base[1] - 2)], { arrow: true });
    const eO = edge([V(ordersT.top[0], ordersT.top[1] - 2), V((ordersT.top[0] + join.base[0]) / 2, join.base[1] + 18), V(join.base[0] + 10, join.base[1] - 2)], { arrow: true });
    guides.push(eU.guide, eO.guide);
    railIn = eU.d;
  }
  // join → sigma
  if (show.sigma) {
    const e = edge([V(join.top[0], join.top[1] - 2), V(sigma.base[0], (sigma.base[1] + join.top[1]) / 2), V(sigma.base[0], sigma.base[1] - 2)], { arrow: true });
    guides.push(e.guide);
  }
  // sigma → pi
  if (show.pi) {
    const e = edge([V(sigma.top[0], sigma.top[1] - 2), V(pi.base[0], (pi.base[1] + sigma.top[1]) / 2), V(pi.base[0], pi.base[1] - 2)], { arrow: true });
    guides.push(e.guide);
  }

  // paint the present nodes (bottom-up so upper nodes sit on top)
  if (show.join) pushCube(join);
  if (show.sigma) pushCube(sigma);
  if (show.pi) pushCube(pi);

  /* ── per-view extras ──────────────────────────────────────────────────── */
  if (view === 'intro') {
    badges.push(pill(700, 150, 'operator tree', { icon: 'layers', cls: 'pill--sst' }));
  }
  if (view === 'tree') {
    badges.push(pill(646, 52, 'π( σ( users ⋈ orders ) )', { icon: 'merge', cls: 'pill--sst', w: 260 }));
  }
  if (view === 'recap') {
    badges.push(pill(646, 52, 'π( σ( users ⋈ orders ) )', { icon: 'merge', cls: 'pill--sst', w: 260 }));
    const rw = edge([V(sigma.verts.E.x + 4, sigma.front[1]), V(812, 360), V(ordersT.top[0] + 36, ordersT.top[1] - 6)], { arrow: true, dashed: true });
    guides.push(rw.guide);
    badges.push(`<text class="iso-region__t" x="868" y="300" text-anchor="middle">push σ down</text>`);
    badges.push(`<text class="sst-cap" x="868" y="322" text-anchor="middle">fewer rows joined</text>`);
  }

  const flows = railIn ? [{ id: 'in', kind: 'read', speed: 150, size: 5 }] : [];
  if (railOut) flows.push({ id: 'out', kind: 'write', speed: 130, size: 6 });

  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });

  function pushCube(c) { shadows.push(c.shadow); if (c.halo) halos.push(c.halo); solids.push(c.g); }
}

/* stitch the SVG together in the shared layer order (verbatim from dbms-scene) */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="SQL to relational algebra">
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
