/* query-analysis-scene.js — semantic analysis / binding. The AST sits centre
   stage; the analyzer resolves every name against the CATALOG on the right,
   type-checks it, rejects bad references, and expands `*`. Same Designed-to-
   Scale isometric vocabulary as dbms-scene.js. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a compact AST node */
function node(cx, cy, label, mat, opts = {}) {
  return isoCube(cx, cy, 40, 44, mat, { label, sub: opts.sub, icon: opts.icon, iconSize: 18, pulse: opts.pulse, halo: opts.halo });
}
/* a thin tree edge from parent base to child top */
function treeEdge(a, b) {
  return edge([V(a.base[0], a.base[1] - 2), V((a.base[0] + b.top[0]) / 2, (a.base[1] + b.top[1]) / 2), V(b.top[0], b.top[1] + 2)], {});
}

export function renderQueryAnalysisScene(snap, opts = {}) {
  const view = snap.view || 'bind';
  const bound = view === 'recap';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── client on the left feeds the AST ─────────────────────────────────── */
  const client = isoCube(140, 236, 48, 56, 'blue', { icon: 'app', label: 'Analyzer', sub: 'binds', iconSize: 22 });
  shadows.push(client.shadow); solids.push(client.g);

  /* ── the AST (same skeleton in every view) ────────────────────────────── */
  const leafMat = bound ? 'green' : 'slate';
  const nSelect = node(470, 108, 'Select', bound ? 'green' : 'amber', { sub: 'name' });
  const nFrom   = node(400, 214, 'From', bound ? 'green' : 'blue', { sub: '⋈' });
  const nWhere  = node(560, 214, 'Where', bound ? 'green' : 'blue', { sub: 'σ' });
  const nUsers  = node(338, 320, 'users', leafMat, {});
  const nOrders = node(452, 320, 'orders', leafMat, {});
  const nTotal  = node(584, 320, 'total', leafMat, {});
  const astNodes = [nSelect, nFrom, nWhere, nUsers, nOrders, nTotal];

  // tree skeleton
  guides.push(treeEdge(nSelect, nFrom).guide, treeEdge(nSelect, nWhere).guide,
    treeEdge(nFrom, nUsers).guide, treeEdge(nFrom, nOrders).guide, treeEdge(nWhere, nTotal).guide);
  astNodes.forEach(n => { shadows.push(n.shadow); solids.push(n.g); });

  // client → Select  (the rail)
  const ein = edge([
    V(client.verts.E.x - 2, client.front[1]),
    V((client.verts.E.x + nSelect.verts.W.x) / 2, (client.front[1] + nSelect.front[1]) / 2),
    V(nSelect.verts.W.x - 6, nSelect.verts.W.y + 8),
  ], { arrow: true });
  guides.push(ein.guide); railIn = ein.d;

  /* ── the catalog on the right (schemas + two table cards) ─────────────── */
  const cat = isoCube(848, 132, 72, 80, 'green', { icon: 'database', label: 'Catalog', sub: 'schemas', halo: view === 'catalog' });
  shadows.push(cat.shadow); if (view === 'catalog') halos.push(cat.halo); solids.push(cat.g);

  // users card
  badges.push(region(772, 238, 152, 92, ''));
  badges.push(pill(848, 240, 'users', { icon: 'grid' }));
  badges.push(`<text class="sst-cap" x="848" y="300" text-anchor="middle">id · name · email</text>`);
  // orders card
  badges.push(region(772, 346, 152, 92, ''));
  badges.push(pill(848, 348, 'orders', { icon: 'grid' }));
  badges.push(`<text class="sst-cap" x="848" y="408" text-anchor="middle">id · user_id · total</text>`);

  // a dashed edge from an AST leaf to its catalog card
  const bindEdge = (leaf, cardY, arrowMiss) => edge([
    V(leaf.verts.E.x - 2, leaf.front[1]),
    V((leaf.verts.E.x + 772) / 2, (leaf.front[1] + cardY) / 2),
    V((arrowMiss ? 760 : 772 - 6), cardY),
  ], { arrow: true, dashed: true });

  if (view === 'bind' || view === 'catalog') {
    guides.push(bindEdge(nUsers, 284).guide, bindEdge(nOrders, 392).guide);
    badges.push(pill(470, 470, 'bind names to objects', { icon: 'key', cls: 'pill--sst' }));
    if (view === 'catalog') badges.push(`<text class="sst-cap" x="470" y="500" text-anchor="middle">every reference checked against the catalog</text>`);
  }

  if (view === 'types') {
    const e = bindEdge(nTotal, 392);
    guides.push(e.guide);
    badges.push(pill(470, 470, 'type check', { icon: 'check', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="640" y="392" text-anchor="middle">numeric ✓</text>`);
  }

  if (view === 'error') {
    const bad = node(648, 320, 'emial', 'rose', {});
    shadows.push(bad.shadow); solids.push(bad.g);
    guides.push(treeEdge(nWhere, bad).guide);
    const e = bindEdge(bad, 300, true);
    guides.push(e.guide);
    badges.push(`<text class="iso-region__t" x="648" y="372" text-anchor="middle">unknown column — rejected</text>`);
  }

  if (view === 'expand') {
    const cols = ['id', 'name', 'email'];
    cols.forEach((c, i) => {
      const t = isoTile(420 + i * 44, 178, 20, 'lilac', {});
      shadows.push(t.shadow); solids.push(t.g);
    });
    badges.push(`<text class="sst-cap" x="464" y="150" text-anchor="middle">*  →  id, name, email</text>`);
    badges.push(pill(470, 470, 'expand  *  &amp; inline views', { icon: 'layers', cls: 'pill--sst' }));
  }

  if (view === 'recap') {
    badges.push(pill(470, 470, 'every reference resolved &amp; typed', { icon: 'check', cls: 'pill--sst' }));
  }

  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
    flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Query analysis — binding the AST to the catalog">
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
