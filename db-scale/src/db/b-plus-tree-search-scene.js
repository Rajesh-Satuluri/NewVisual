/* b-plus-tree-search-scene.js — the "B+ Tree Search" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes as tree nodes with
   their separator keys as labels, child pointers as routed arrows, a linked
   leaf chain, soft ground shadows, halos, pill badges, a faded iso grid and
   particle rails.

   ONE fixed 3-level B+ tree is drawn across every view; each view lights up a
   further step of the same root→leaf descent so the path reads continuously.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'tree' (the whole tree, target marked), 'root' (compare at root),
   'descend' (into the internal node), 'leaf' (reach the leaf, found),
   'range' (descend once then walk the leaf chain), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* the one fixed tree — node id → placement, keys, role */
const NODES = {
  root: { cx: 520, cy: 76,  rx: 74, h: 40, keys: '30 · 60', sub: 'root' },
  i0:   { cx: 196, cy: 224, rx: 60, h: 36, keys: '10 · 20', sub: 'internal' },
  i1:   { cx: 520, cy: 224, rx: 60, h: 36, keys: '42 · 54', sub: 'internal' },
  i2:   { cx: 844, cy: 224, rx: 60, h: 36, keys: '72 · 85', sub: 'internal' },
  l0:   { cx: 120, cy: 384, rx: 50, h: 30, keys: '5 · 8',   sub: '' },
  l1:   { cx: 272, cy: 384, rx: 50, h: 30, keys: '18 · 25', sub: '' },
  l2:   { cx: 424, cy: 384, rx: 50, h: 30, keys: '33 · 40', sub: '' },
  l3:   { cx: 576, cy: 384, rx: 50, h: 30, keys: '42 · 48', sub: '' },
  l4:   { cx: 728, cy: 384, rx: 50, h: 30, keys: '54 · 60', sub: '' },
  l5:   { cx: 880, cy: 384, rx: 50, h: 30, keys: '72 · 85', sub: '' },
};
const TREE_EDGES = [
  ['root', 'i0'], ['root', 'i1'], ['root', 'i2'],
  ['i0', 'l0'], ['i0', 'l1'],
  ['i1', 'l2'], ['i1', 'l3'],
  ['i2', 'l4'], ['i2', 'l5'],
];
const LEAVES = ['l0', 'l1', 'l2', 'l3', 'l4', 'l5'];

export function renderBPlusTreeSearchScene(snap, opts = {}) {
  const view = snap.view || 'tree';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* per-view highlight sets */
  let path = [], found = null, range = [], stop = null;
  if (view === 'root') path = ['root'];
  else if (view === 'descend') path = ['root', 'i1'];
  else if (view === 'leaf') { path = ['root', 'i1']; found = 'l3'; }
  else if (view === 'range') { path = ['root', 'i1']; range = ['l3', 'l4']; stop = 'l5'; }
  else if (view === 'recap') { path = ['root', 'i1']; found = 'l3'; range = ['l3', 'l4']; }

  const pathSet = new Set(path);
  const rangeSet = new Set(range);

  /* build every node once */
  const C = {};
  for (const id of Object.keys(NODES)) {
    const d = NODES[id];
    let mat, halo = false;
    if (id === found) { mat = 'rose'; halo = true; }
    else if (rangeSet.has(id)) { mat = 'green'; halo = true; }
    else if (pathSet.has(id)) { mat = 'amber'; halo = true; }
    else if (id[0] === 'l') mat = 'blue';
    else mat = 'lilac';
    const c = isoCube(d.cx, d.cy, d.rx, d.h, mat, { label: d.keys, sub: d.sub, r: 10, halo });
    C[id] = c;
    shadows.push(c.shadow); if (halo) halos.push(c.halo); solids.push(c.g);
  }

  /* child pointers (parent base → child top); the active descent is arrowed */
  TREE_EDGES.forEach(([p, ch]) => {
    const P = C[p], Ch = C[ch];
    const active = pathSet.has(p) && (pathSet.has(ch) || ch === found);
    const e = edge([
      V(P.base[0], P.base[1] - 4),
      V((P.base[0] + Ch.top[0]) / 2, (P.base[1] + Ch.top[1]) / 2),
      V(Ch.top[0], Ch.top[1] - 2),
    ], { arrow: active, dashed: !active, r: 12 });
    guides.push(e.guide);
  });

  /* linked leaf chain (sibling pointers), walked segments arrowed */
  for (let i = 0; i < LEAVES.length - 1; i++) {
    const Li = C[LEAVES[i]], Lj = C[LEAVES[i + 1]];
    const walk = rangeSet.has(LEAVES[i]) && rangeSet.has(LEAVES[i + 1]);
    const e = edge([V(Li.verts.E.x, Li.verts.E.y), V(Lj.verts.W.x, Lj.verts.W.y)],
      { arrow: walk, dashed: !walk, r: 6 });
    guides.push(e.guide);
  }
  badges.push(`<text class="sst-cap" x="${VW / 2}" y="${A(C.l0.base[1] + 20)}" text-anchor="middle">leaves hold every key in sorted order, chained left → right</text>`);

  /* descent rail + flow for the search views */
  const seq = [...path]; if (found) seq.push(found);
  if (seq.length >= 2) {
    const pts = seq.map(id => V(C[id].top[0], C[id].top[1] + C[id].ry));
    const e = edge(pts, { arrow: true, cls: 'is-rail' });
    guides.push(e.guide); railIn = e.d;
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
  }

  /* ── per-view captions & badges ───────────────────────────────────────── */
  if (view === 'tree') {
    badges.push(pill(VW / 2, 28, 'SELECT … WHERE id = 42', { icon: 'search', cls: 'pill--sst', w: 260 }));
    badges.push(pill(VW / 2, 470, 'scanning every leaf is O(n) — millions of reads', { icon: 'alert', w: 380 }));
  }
  else if (view === 'root') {
    badges.push(pill(VW / 2, 28, 'looking for id = 42', { icon: 'search', cls: 'pill--sst' }));
    badges.push(pill(744, 150, '42 ∈ [30, 60) → middle child', { icon: 'key', w: 250 }));
    badges.push(`<text class="sst-cap" x="${VW / 2}" y="470" text-anchor="middle">one page read — binary-search the root's separators</text>`);
  }
  else if (view === 'descend') {
    badges.push(pill(VW / 2, 28, 'looking for id = 42', { icon: 'search', cls: 'pill--sst' }));
    badges.push(pill(760, 224, '42 ≥ 42 → right pointer', { icon: 'key', w: 230 }));
    badges.push(`<text class="sst-cap" x="${VW / 2}" y="470" text-anchor="middle">two pages read — one more comparison picks the leaf</text>`);
  }
  else if (view === 'leaf') {
    badges.push(pill(VW / 2, 28, 'looking for id = 42', { icon: 'search', cls: 'pill--sst' }));
    badges.push(pill(576, 476, 'id = 42 found → row pointer', { icon: 'check', cls: 'pill--sst', w: 250 }));
    badges.push(pill(864, 120, '3 reads, not millions', { icon: 'gauge', w: 210 }));
  }
  else if (view === 'range') {
    badges.push(pill(VW / 2, 28, 'WHERE id BETWEEN 42 AND 60', { icon: 'search', cls: 'pill--sst', w: 300 }));
    badges.push(region(506, 332, 296, 112, '', { r: 18 }));
    badges.push(pill(652, 320, 'walk the leaf chain', { icon: 'check', cls: 'pill--sst', w: 190 }));
    badges.push(pill(880, 320, '72 > 60 · stop', { icon: 'alert', w: 160 }));
    const w = edge([V(C.l3.verts.E.x, C.l3.verts.E.y), V(C.l4.verts.W.x, C.l4.verts.W.y)], { arrow: true, r: 6 });
    railOut = w.d;
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 5 });
    badges.push(`<text class="sst-cap" x="${VW / 2}" y="474" text-anchor="middle">descend once, then stream siblings — no re-descending</text>`);
  }
  else if (view === 'recap') {
    const tags = [
      ['point lookup', 'root → leaf, ≈ height reads'],
      ['range scan', 'descend once, walk the chain'],
      ['sorted leaves', 'both stay O(log n) + sequential'],
    ];
    tags.forEach(([t, s], i) => badges.push(pill(176, 300 + i * 50, t + ' — ' + s, { icon: 'check', w: 300 })));
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
  <svg class="scene scene--b-plus-tree-search" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="B+ Tree search">
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
