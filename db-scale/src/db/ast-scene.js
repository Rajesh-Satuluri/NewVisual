/* ast-scene.js — the "AST" scene: a verbose parse tree distilling into a
   compact Abstract Syntax Tree, in the shared Designed-to-Scale isometric
   vocabulary. Input: { view, note }. Output: { svg, layer, rail, flows, note }.

   Views: 'distill' (parse tree → AST side by side), 'noise' (keyword/punct
   nodes dropped), 'semantic' (labelled operation nodes), 'compact' (AST alone),
   'uniform' (AST feeding downstream stages), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a small tree node — a compact labelled iso cube */
function node(cx, cy, label, mat, opts = {}) {
  return isoCube(cx, cy, 40, 44, mat, { label, ghost: opts.ghost, pulse: opts.pulse, r: 9 });
}
/* a routed parent→child edge (parent base → child top vertex) */
function wire(a, b, opts = {}) {
  return edge([
    V(a.base[0], a.base[1] - 4),
    V((a.base[0] + b.verts.N.x) / 2, (a.base[1] + b.verts.N.y) / 2),
    V(b.verts.N.x, b.verts.N.y),
  ], { arrow: opts.arrow !== false, dashed: opts.dashed });
}

export function renderAstScene(snap, opts = {}) {
  const view = snap.view || 'distill';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  const showParse = view === 'distill' || view === 'noise';
  const astX = showParse ? 780 : 540;

  /* ── the compact AST (always drawn) ──────────────────────────────────── */
  const a0 = node(astX, 100, 'Select', 'green');
  const a1 = node(astX, 230, 'Filter', 'amber');
  const a2 = node(astX, 360, 'Join', 'amber');
  const a3 = node(astX - 92, 470, 'users', 'lilac');
  const a4 = node(astX + 92, 470, 'orders', 'lilac');
  const astNodes = [a3, a4, a2, a1, a0]; // paint leaves/low first, root last

  const w01 = wire(a0, a1), w12 = wire(a1, a2), w23 = wire(a2, a3), w24 = wire(a2, a4);
  [w01, w12, w23, w24].forEach(w => guides.push(w.guide));
  astNodes.forEach(n => { shadows.push(n.shadow); solids.push(n.g); });

  /* ── the verbose parse tree (distill / noise only) ───────────────────── */
  if (showParse) {
    const drop = view === 'noise';
    const kw = (mat) => drop ? 'rose' : mat;        // keywords/punct tint red when dropped
    const p0 = node(230, 90, 'query', 'slate', { ghost: true });
    const p1 = node(140, 192, 'SELECT', kw('amber'), { ghost: true });
    const p2 = node(232, 192, 'proj', 'slate', { ghost: true });
    const p3 = node(330, 192, 'FROM', kw('amber'), { ghost: true });
    const p4 = node(168, 300, 'name', 'lilac', { ghost: true });
    const p5 = node(262, 300, ',', kw('slate'), { ghost: true });
    const p6 = node(356, 300, 'users', 'lilac', { ghost: true });
    const p7 = node(426, 110, 'WHERE', kw('amber'), { ghost: true });
    const pts = [p4, p5, p6, p2, p1, p3, p7, p0];
    [[p0, p1], [p0, p2], [p0, p3], [p2, p4], [p2, p5], [p3, p6], [p0, p7]]
      .forEach(([a, b]) => guides.push(wire(a, b, { arrow: false }).guide));
    pts.forEach(n => { shadows.push(n.shadow); solids.push(n.g); });

    // the distill arrow: parse tree → AST
    const da = edge([V(474, 250), V(610, 190), V(a0.verts.W.x - 6, a0.verts.W.y + 8)], { arrow: true });
    guides.push(da.guide); railIn = da.d;
    badges.push(pill(606, 58, 'parse tree → AST', { icon: 'merge' }));
    if (drop) {
      badges.push(`<text class="iso-region__t" x="286" y="446" text-anchor="middle">keywords &amp; punctuation dropped</text>`);
    }
  } else {
    railIn = w01.d; // a read particle runs down the AST chain
  }

  /* ── per-view annotations on the AST ─────────────────────────────────── */
  if (view === 'semantic') {
    badges.push(pill(astX, 58, 'operations + operands', { icon: 'layers' }));
    badges.push(`<text class="sst-cap" x="${A(astX + 66)}" y="100" text-anchor="start">projection: name</text>`);
    badges.push(`<text class="sst-cap" x="${A(astX + 66)}" y="230" text-anchor="start">σ  total &gt; 100</text>`);
    badges.push(`<text class="sst-cap" x="${A(astX + 66)}" y="360" text-anchor="start">⋈  on user_id</text>`);
  } else if (view === 'compact') {
    badges.push(pill(astX, 58, 'compact tree', { icon: 'layers' }));
    badges.push(`<text class="sst-cap" x="${A(astX)}" y="536" text-anchor="middle">≈ 20 parse nodes  →  5 AST nodes</text>`);
  } else if (view === 'uniform') {
    badges.push(pill(astX, 58, 'one canonical AST', { icon: 'check' }));
    const stages = ['analyzer', 'planner', 'optimizer'];
    stages.forEach((s, i) => {
      const py = 118 + i * 58;
      const e = edge([V(a1.verts.E.x, a1.verts.E.y), V(a1.verts.E.x + 120, py), V(776, py)], { arrow: true, dashed: true });
      guides.push(e.guide);
      badges.push(pill(876, py, s, { icon: 'check', w: 150 }));
    });
  } else if (view === 'recap') {
    badges.push(pill(astX, 58, 'the query’s canonical form', { icon: 'check' }));
  } else if (view === 'distill') {
    badges.push(`<text class="sst-cap" x="${A(astX)}" y="536" text-anchor="middle">same meaning, a fraction of the nodes</text>`);
  }

  const flows = railIn ? [{ id: 'in', kind: 'read', speed: 150, size: 5 }] : [];
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
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Abstract syntax tree">
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
