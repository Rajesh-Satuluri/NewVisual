/* relational-algebra-scene.js — the "Relational Algebra" operator pipeline, in
   the same Designed-to-Scale isometric vocabulary as the LSM-Tree and DBMS
   lessons: rounded iso cubes for operators, thin iso-tile stacks for relations,
   pill badges, routed arrow connectors, a faded grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'intro', 'select' (σ), 'project' (π), 'join' (⋈), 'setops' (∪ −),
   'recap' (an operator tree). Read left → right: relation → operator → relation. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderRelationalAlgebraScene(snap, opts = {}) {
  const view = snap.view || 'intro';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* a relation = a short stack of thin iso tiles (one per row). returns the
     geometry needed to wire connectors to its left / right flanks. */
  function relStack(cx, cy, nRows, tone, o = {}) {
    const rx = o.rx || 58;
    const gap = o.gap || 15;
    const hi = o.hiRows || [];
    for (let i = nRows - 1; i >= 0; i--) {
      const t = isoTile(cx, cy + i * gap, rx, hi.includes(i) ? 'rose' : tone, {
        h: o.h || 10, halo: o.halo && i === 0,
      });
      shadows.push(t.shadow); solids.push(t.g);
    }
    if (o.cap) badges.push(`<text class="sst-cap" x="${A(cx)}" y="${A(cy + (nRows - 1) * gap + rx * 0.5 + 24)}" text-anchor="middle">${esc(o.cap)}</text>`);
    const midY = cy + (nRows - 1) * gap / 2;
    return { cx, cy, rx, midY, left: V(cx - rx, midY), right: V(cx + rx, midY), topY: cy - rx * 0.5 };
  }

  /* an operator = an amber cube carrying the operator symbol as its label */
  function op(cx, cy, label, sub, icon) {
    const c = isoCube(cx, cy, 52, 60, 'amber', { label, sub, icon, iconSize: 22, halo: true });
    shadows.push(c.shadow); halos.push(c.halo); solids.push(c.g);
    return c;
  }

  function wire(from, to, o = {}) {
    const midx = (from.x + to.x) / 2;
    const e = edge([V(from.x, from.y), V(midx, (from.y + to.y) / 2), V(to.x - 6, to.y)], { arrow: true, dashed: o.dashed });
    guides.push(e.guide);
    return e.d;
  }

  /* ── INTRO: relation → op → relation ─────────────────────────────────── */
  if (view === 'intro') {
    const inR = relStack(360, 190, 5, 'lilac', { cap: 'relation R' });
    const o = op(560, 210, 'op', 'σ π ⋈', 'merge');
    const outR = relStack(770, 190, 5, 'green', { cap: 'relation R′' });
    railIn = wire(inR.right, V(o.verts.W.x, o.verts.W.y));
    wire(V(o.verts.E.x, o.verts.E.y), outR.left);
    badges.push(pill(560, 92, 'relation  →  relation', { icon: 'layers' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: railIn ? [{ id: 'in', kind: 'read', speed: 150, size: 5 }] : [], note: snap.note });
  }

  /* ── SELECT σ: 5 rows → 2 rows ───────────────────────────────────────── */
  if (view === 'select') {
    const inR = relStack(330, 150, 5, 'lilac', { cap: 'users', hiRows: [1, 3] });
    const o = op(560, 205, 'σ', 'where', 'search');
    const outR = relStack(790, 195, 2, 'rose', { cap: '3 of 8 rows' });
    railIn = wire(inR.right, V(o.verts.W.x, o.verts.W.y));
    wire(V(o.verts.E.x, o.verts.E.y), outR.left);
    badges.push(pill(560, 96, 'σ  keeps matching rows', { icon: 'search' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── PROJECT π: wide rows → narrow rows ──────────────────────────────── */
  if (view === 'project') {
    const inR = relStack(330, 165, 4, 'lilac', { rx: 72, cap: 'users(id,name,email,country)' });
    const o = op(575, 205, 'π', 'select cols', 'grid');
    const outR = relStack(800, 175, 4, 'green', { rx: 40, cap: 'name, email' });
    railIn = wire(inR.right, V(o.verts.W.x, o.verts.W.y));
    wire(V(o.verts.E.x, o.verts.E.y), outR.left);
    badges.push(pill(575, 96, 'π  keeps chosen columns', { icon: 'grid' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── JOIN ⋈: two relations → one wider relation ──────────────────────── */
  if (view === 'join') {
    const a = relStack(300, 120, 3, 'lilac', { cap: 'users' });
    const b = relStack(300, 300, 3, 'blue', { cap: 'orders' });
    const o = op(575, 225, '⋈', 'on user_id', 'merge');
    const outR = relStack(810, 190, 4, 'green', { rx: 78, cap: 'users ⋈ orders' });
    railIn = wire(a.right, V(o.verts.W.x, o.verts.W.y - 8));
    wire(b.right, V(o.verts.W.x, o.verts.W.y + 8));
    wire(V(o.verts.E.x, o.verts.E.y), outR.left);
    badges.push(pill(575, 100, '⋈  combines on a match', { icon: 'merge' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── SET OPS ∪ − : union-compatible relations ────────────────────────── */
  if (view === 'setops') {
    const a = relStack(320, 120, 3, 'lilac', { cap: 'active users' });
    const b = relStack(320, 300, 3, 'lilac', { cap: 'paid users' });
    const o = op(575, 225, '∪ / −', 'set op', 'layers');
    const outR = relStack(810, 190, 4, 'green', { cap: 'result' });
    railIn = wire(a.right, V(o.verts.W.x, o.verts.W.y - 8));
    wire(b.right, V(o.verts.W.x, o.verts.W.y + 8));
    wire(V(o.verts.E.x, o.verts.E.y), outR.left);
    badges.push(region(250, 70, 480, 360, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="490" y="470" text-anchor="middle">both sides must share the same columns</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── RECAP: an operator TREE, built bottom-up ────────────────────────── */
  const leafA = relStack(430, 400, 2, 'lilac', { rx: 46, cap: 'users' });
  const leafB = relStack(650, 400, 2, 'blue', { rx: 46, cap: 'orders' });
  const join = op(540, 330, '⋈', '', 'merge');
  const sel = op(540, 230, 'σ', 'total>100', 'search');
  const proj = op(540, 130, 'π', 'name', 'grid');
  railIn = wire(leafA.right, V(join.verts.W.x, join.verts.W.y + 6));
  wire(leafB.left, V(join.verts.E.x, join.verts.E.y + 6));
  wire(V(join.top[0], join.verts.N.y), V(sel.base[0], sel.base[1] - 4));
  railOut = wire(V(sel.top[0], sel.verts.N.y), V(proj.base[0], proj.base[1] - 4));
  badges.push(pill(812, 150, 'a query = a tree of operators', { icon: 'layers', w: 230 }));
  badges.push(pill(812, 208, 'optimizer reshapes the tree', { icon: 'bolt', w: 230 }));
  badges.push(`<text class="sst-cap" x="540" y="86" text-anchor="middle">result relation</text>`);

  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
    flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'write', speed: 130, size: 6 }],
    note: snap.note });
}

/* stitch the SVG together in the shared layer order (verbatim from dbms-scene) */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Relational algebra operator pipeline">
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
