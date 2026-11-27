/* partitioning-scene.js — the "Partitioning" scene, in the shared Designed-to-
   Scale isometric vocabulary: rounded iso cubes/slabs with icon glyphs and
   labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'big' (one node overflowing), 'split' (keyspace cut into N
   partitions), 'route' (a keyed request hits exactly one owner), 'skew' (a
   hot partition), 'tradeoff' (range vs hash), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a stack of data tiles = a node's share of the dataset */
function dataStack(cx, topY, rx, tone, layers, opts = {}) {
  const tiles = [];
  for (let i = layers - 1; i >= 0; i--) {
    tiles.push(isoTile(cx, topY + i * 15, rx, tone, { h: rx * 0.3, halo: opts.halo && i === 0 }));
  }
  return tiles;
}

export function renderPartitioningScene(snap, opts = {}) {
  const view = snap.view || 'split';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  /* ── BIG: one node buckling under the whole dataset ────────────────────── */
  if (view === 'big') {
    const node = isoCube(VW / 2, 150, 104, 92, 'rose', { icon: 'server', label: 'one node', sub: 'holds everything', halo: true });
    shadows.push(node.shadow); halos.push(node.halo); solids.push(node.g);
    const stack = dataStack(VW / 2, 300, 110, 'lilac', 5, {});
    stack.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    badges.push(pill(VW / 2, 470, 'disk full · writes capped · RAM maxed', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(VW / 2 - 190, 92, 380, 408, '', { r: 24 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="524" text-anchor="middle">ONE MACHINE IS THE CEILING</text>`);
    const e = edge([V(190, 150), V(VW / 2 - node.rx - 6, 150)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(pill(190, 120, 'all writes', { icon: 'bolt', cls: 'pill--sst' }));
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── TRADEOFF: range vs hash, two columns ──────────────────────────────── */
  if (view === 'tradeoff') {
    const col = (x, title, icon, mat, rows) => {
      badges.push(region(x, 92, 300, 408, '', { r: 22 }));
      badges.push(pill(x + 150, 112, title, { icon, w: 232 }));
      const head = isoCube(x + 150, 172, 60, 54, mat, { icon, iconSize: 22 });
      shadows.push(head.shadow); solids.push(head.g);
      rows.forEach((t, i) => badges.push(pill(x + 150, 298 + i * 46, t, { icon: t[0] === '+' ? 'check' : 'alert', w: 270 })));
    };
    col(110, 'Range partitioning', 'listOrdered', 'blue', [
      '+ keys stay sorted',
      '+ fast range scans',
      '− adjacent keys co-locate',
      '− hot ranges overload one node',
    ]);
    col(630, 'Hash partitioning', 'merge', 'green', [
      '+ even, smooth load',
      '+ no natural hot spots',
      '− range scans hit every node',
      '− sorted order is lost',
    ]);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── the partition row (split / route / skew / recap) ──────────────────── */
  const defs = [
    { x: 176, mat: 'green', label: 'P0', range: 'a–f' },
    { x: 404, mat: 'blue',  label: 'P1', range: 'g–m' },
    { x: 632, mat: 'amber', label: 'P2', range: 'n–s' },
    { x: 860, mat: 'lilac', label: 'P3', range: 't–z' },
  ];
  const CY = 262;
  const hotIdx = view === 'skew' ? 2 : -1;
  const hitIdx = view === 'route' ? 2 : -1;

  const cubes = defs.map((d, i) => {
    const mat = i === hotIdx ? 'rose' : d.mat;
    const c = isoCube(d.x, CY, 86, 74, mat, {
      icon: 'server', label: d.label, sub: 'keys ' + d.range, iconSize: 20,
      halo: i === hotIdx || i === hitIdx,
    });
    cubes_push(c, i === hotIdx || i === hitIdx);
    return c;
  });
  function cubes_push(c, glow) { shadows.push(c.shadow); if (glow) halos.push(c.halo); solids.push(c.g); }

  // each partition carries a small data slab beneath it
  defs.forEach((d, i) => {
    const layers = i === hotIdx ? 4 : 2;
    const stack = dataStack(d.x, CY + 108, 62, i === hotIdx ? 'rose' : 'slate', layers, {});
    stack.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
  });

  if (view === 'split') {
    badges.push(region(120, 150, 824, 94, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="178" text-anchor="middle">ONE KEYSPACE  a … z  —  CUT INTO 4 DISJOINT PARTITIONS</text>`);
    badges.push(cap(VW / 2, 470, 'each node owns a slice · no node holds it all'));
    defs.forEach(d => badges.push(pill(d.x, 214, d.range, { cls: 'pill--sst' })));
  }

  else if (view === 'route') {
    // a client routes a keyed request to exactly the owning partition (P2)
    const client = isoCube(VW / 2, 70, 56, 20, 'blue', { icon: 'app', label: 'get("paris")', iconSize: 16 });
    shadows.push(client.shadow); solids.push(client.g);
    const target = cubes[hitIdx];
    const e = edge([V(VW / 2, client.base[1] - 6), V(target.top[0], 150), V(target.top[0], target.verts.N.y - 4)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(pill(target.top[0], 206, 'owns n–s → HIT', { icon: 'check', cls: 'pill--sst' }));
    badges.push(cap(VW / 2, 470, 'router sends the key straight to its one owner — the other 3 stay idle'));
    [0, 1, 3].forEach(i => badges.push(`<text class="sst-cap" x="${A(defs[i].x)}" y="${A(206)}" text-anchor="middle">skipped</text>`));
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
  }

  else if (view === 'skew') {
    badges.push(pill(defs[hotIdx].x, 190, 'HOT · 70% of traffic', { icon: 'alert', cls: 'pill--sst' }));
    [0, 1, 3].forEach(i => badges.push(`<text class="sst-cap" x="${A(defs[i].x)}" y="${A(190)}" text-anchor="middle">idle</text>`));
    const hot = cubes[hotIdx];
    const e = edge([V(120, 150), V(hot.top[0] - 70, 206), V(hot.top[0], hot.verts.N.y - 4)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(pill(150, 128, 'celebrity key', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(cap(VW / 2, 470, 'a bad key or one hot value overloads a single partition'));
    flows.push({ id: 'in', kind: 'write', speed: 110, size: 7 });
  }

  else if (view === 'recap') {
    badges.push(region(120, 150, 824, 94, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="178" text-anchor="middle">DIVIDE THE KEYSPACE · SCALE CAPACITY & WRITES</text>`);
    const tags = ['pick a good key', 'spread the load', 'route by owner', 'watch for skew'];
    tags.forEach((t, i) => badges.push(pill(176 + i * 228, 214, t, { icon: 'check', cls: 'pill--sst' })));
    badges.push(cap(VW / 2, 470, 'more nodes = more room and more throughput, if the keys spread evenly'));
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
  <svg class="scene scene--partitioning" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Partitioning across nodes">
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
