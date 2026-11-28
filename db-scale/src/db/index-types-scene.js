/* index-types-scene.js — the "Index Types" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes/slabs with icon glyphs and labels,
   soft ground shadows, halos, pill badges, dashed logical regions, routed
   connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'scan' (no index, full table scan), 'clustered' (leaf = row),
   'secondary' (key → locator, hop back), 'covering' (index-only + composite),
   'specialized' (hash / bitmap / B+ tree + write cost), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;

const VW = 1040;

/* a vertical stack of row slabs = a heap / clustered table */
function rowStack(cx, topY, rx, n, step, toneAt, haloAt) {
  const tiles = [];
  for (let i = 0; i < n; i++) {
    const tone = toneAt ? (toneAt(i) || 'slate') : 'slate';
    tiles.push(isoTile(cx, topY + i * step, rx, tone, { h: 15, halo: haloAt ? haloAt(i) : false }));
  }
  return tiles; // i=0 (far) first, nearest (i=n-1) last so it paints on top
}

export function renderIndexTypesScene(snap, opts = {}) {
  const view = snap.view || 'scan';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── SCAN: no index, read every row ───────────────────────────────────── */
  if (view === 'scan') {
    const cx = 500, topY = 128, rx = 78, n = 8, step = 36;
    const target = 6;
    const stack = rowStack(cx, topY, rx, n, step, i => (i === target ? 'rose' : 'slate'),
      i => i === target);
    stack.forEach((t, i) => { shadows.push(t.shadow); if (i === target) halos.push(t.halo); solids.push(t.g); });

    badges.push(pill(cx, topY - 44, 'heap table · 1,000,000 rows', { icon: 'grid', cls: 'pill--sst' }));

    // a read rail sweeping the whole stack top → bottom on the right
    const railX = cx + 168;
    const e = edge([V(railX, topY - 6), V(railX, topY + (n - 1) * step + 24)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(pill(railX + 4, topY - 30, 'scan every page', { icon: 'search', cls: 'pill--sst' }));
    badges.push(pill(cx + 150, topY + target * step, 'match', { icon: 'check', w: 96 }));

    badges.push(`<text class="iso-region__t" x="${cx}" y="${A(topY + (n - 1) * step + 70)}" text-anchor="middle">COST GROWS WITH THE TABLE, NOT THE ANSWER</text>`);
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null, flows, note: snap.note });
  }

  /* ── CLUSTERED: root → leaves that ARE the rows, in key order ──────────── */
  if (view === 'clustered') {
    const root = isoCube(520, 104, 70, 40, 'lilac', { icon: 'key', label: 'root', sub: 'by id', iconSize: 18 });
    shadows.push(root.shadow); solids.push(root.g);

    const leafY = 300, xs = [206, 356, 506, 656, 806];
    const leaves = xs.map((x, i) => isoCube(x, leafY, 58, 52, 'green', {
      icon: 'listOrdered', label: 'row', sub: `id ${i * 20 + 10}`, iconSize: 18,
    }));
    leaves.forEach(l => { shadows.push(l.shadow); solids.push(l.g); });

    // root fans down to each leaf
    leaves.forEach((l, i) => {
      const e = edge([V(root.base[0], root.base[1] - 4), V((root.base[0] + l.top[0]) / 2, (root.base[1] + l.top[1]) / 2), V(l.top[0], l.top[1] - 2)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d;
    });

    // a range sweep along the sorted leaves (leaf → leaf)
    const sweep = edge(leaves.map(l => V(l.verts.S.x, l.base[1] + 18)), { arrow: true, dashed: true });
    guides.push(sweep.guide); railOut = sweep.d;

    badges.push(pill(520, leafY + 112, 'leaf = the full row · sorted by key', { icon: 'check', cls: 'pill--sst' }));
    badges.push(region(150, leafY - 54, 740, 150, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="520" y="${A(leafY + 150)}" text-anchor="middle">ONE CLUSTERED INDEX PER TABLE</text>`);
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'read', speed: 220, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SECONDARY: slim index on the left hops back to the clustered table ── */
  if (view === 'secondary') {
    // left: a slim secondary index (root + two leaf locators)
    const sRoot = isoCube(250, 120, 58, 38, 'amber', { icon: 'search', label: 'email', sub: 'index', iconSize: 18 });
    shadows.push(sRoot.shadow); solids.push(sRoot.g);
    const locs = [[180, 300], [320, 300]].map(([x, y]) => isoCube(x, y, 50, 46, 'amber', { icon: 'key', label: 'locator', iconSize: 16 }));
    locs.forEach(l => { shadows.push(l.shadow); solids.push(l.g); });
    locs.forEach(l => { const e = edge([V(sRoot.base[0], sRoot.base[1] - 4), V(l.top[0], l.top[1] - 2)], { arrow: true }); guides.push(e.guide); });
    badges.push(region(118, 70, 300, 320, '', { r: 22 }));
    badges.push(pill(250, 70, 'secondary index · key → locator', { icon: 'search', w: 282 }));

    // right: the clustered table (row stack)
    const tx = 770, topY = 150, rx = 70, n = 5, step = 40;
    const stack = rowStack(tx, topY, rx, n, step, i => (i === 1 || i === 3 ? 'green' : 'slate'));
    stack.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    badges.push(pill(tx, topY - 40, 'clustered table', { icon: 'grid', cls: 'pill--sst' }));

    // the hop: each locator points across to a row (amber, the extra hop)
    const e1 = edge([V(locs[0].verts.E.x - 2, locs[0].front[1]), V((locs[0].verts.E.x + tx) / 2, topY + 3 * step), V(tx - rx + 8, topY + 3 * step)], { arrow: true, dashed: true });
    const e2 = edge([V(locs[1].verts.E.x - 2, locs[1].front[1]), V((locs[1].verts.E.x + tx) / 2, topY + 1 * step), V(tx - rx + 8, topY + 1 * step)], { arrow: true, dashed: true });
    guides.push(e1.guide, e2.guide); railIn = e1.d;
    badges.push(pill(540, 400, 'extra hop: locator → row', { icon: 'alert', w: 220 }));
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null, flows, note: snap.note });
  }

  /* ── COVERING: index-only scan + composite key ────────────────────────── */
  if (view === 'covering') {
    // a covering index: a leaf that carries payload columns, answered in place
    const root = isoCube(360, 110, 62, 38, 'green', { icon: 'layers', label: 'covering', sub: 'index', iconSize: 18 });
    shadows.push(root.shadow); solids.push(root.g);
    const leaf = isoCube(360, 288, 82, 58, 'green', { icon: 'check', label: 'leaf', sub: 'key + payload', iconSize: 20 });
    shadows.push(leaf.shadow); solids.push(leaf.g);
    const re = edge([V(root.base[0], root.base[1] - 4), V(leaf.top[0], leaf.top[1] - 2)], { arrow: true });
    guides.push(re.guide); railIn = re.d;

    // payload columns carried alongside the key
    const cols = ['a', 'b', 'c'];
    cols.forEach((c, i) => {
      const t = isoTile(250 + i * 74, 430, 30, i === 0 ? 'amber' : 'lilac');
      shadows.push(t.shadow); solids.push(t.g);
      badges.push(`<text class="sst-cap" x="${A(250 + i * 74)}" y="${A(458)}" text-anchor="middle">${c}</text>`);
    });
    badges.push(pill(360, 500, 'composite key (a, b, c) · leftmost-prefix', { icon: 'key', cls: 'pill--sst' }));
    badges.push(pill(360, 70, 'index-only scan · answered in place', { icon: 'bolt', w: 320 }));

    // a ghosted table on the right with the hop crossed out
    const tx = 800, topY = 150, n = 4, step = 40;
    const stack = rowStack(tx, topY, 60, n, step, () => 'slate');
    stack.forEach(t => { shadows.push(t.shadow); t.g = t.g.replace('class="iso-cube', 'class="iso-cube is-ghost'); solids.push(t.g); });
    badges.push(pill(tx, topY - 40, 'table — not touched', { icon: 'file', cls: 'pill--sst' }));
    const hop = edge([V(leaf.verts.E.x - 2, leaf.front[1] - 30), V(tx - 70, topY + 2 * step)], { dashed: true });
    guides.push(hop.guide);
    badges.push(pill((leaf.verts.E.x + tx) / 2 - 10, 300, 'no hop ✕', { icon: 'check', w: 120 }));
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null, flows, note: snap.note });
  }

  /* ── SPECIALIZED: hash / bitmap / B+ tree + the write cost ─────────────── */
  if (view === 'specialized') {
    const kinds = [
      { cx: 210, mat: 'blue',  icon: 'key',         label: 'Hash',    sub: 'equality O(1)' },
      { cx: 520, mat: 'amber', icon: 'grid',        label: 'Bitmap',  sub: 'low cardinality' },
      { cx: 830, mat: 'green', icon: 'layers',      label: 'B+ Tree', sub: 'ranges + sort' },
    ];
    const cubes = kinds.map(k => isoCube(k.cx, 150, 70, 62, k.mat, { icon: k.icon, label: k.label, sub: k.sub, iconSize: 24 }));
    cubes.forEach(c => { shadows.push(c.shadow); solids.push(c.g); });
    kinds.forEach(k => badges.push(pill(k.cx, 86, k.label + ' index', { icon: k.icon, w: 180 })));

    // the shared write cost: a write rail maintaining all three
    const srcX = 520, srcY = 470;
    cubes.forEach((c, i) => {
      const e = edge([V(srcX, srcY), V((srcX + c.base[0]) / 2, (srcY + c.base[1]) / 2 + 20), V(c.base[0], c.base[1] + 6)], { arrow: true, dashed: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    const w = isoCube(srcX, srcY, 54, 44, 'rose', { icon: 'flush', label: 'write', iconSize: 18 });
    shadows.push(w.shadow); solids.push(w.g);
    badges.push(region(70, 90, 900, 150, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="520" y="${A(540)}" text-anchor="middle">EVERY WRITE MUST MAINTAIN EVERY INDEX</text>`);
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut, flows, note: snap.note });
  }

  /* ── RECAP: clustered core, secondaries pointing back, summary pills ───── */
  const core = isoCube(520, 250, 92, 78, 'green', { icon: 'key', label: 'clustered', sub: 'row order', halo: true, iconSize: 26 });
  shadows.push(core.shadow); halos.push(core.halo); solids.push(core.g);
  const sats = [[210, 150], [210, 360], [430, 470]].map(([x, y]) => isoCube(x, y, 46, 40, 'amber', { icon: 'search', label: 'secondary', iconSize: 15 }));
  sats.forEach((s, i) => {
    shadows.push(s.shadow); solids.push(s.g);
    const e = edge([V(s.verts.E.x - 2, s.front[1]), V(core.verts.W.x - 6, core.verts.W.y + 10)], { arrow: true, dashed: true });
    guides.push(e.guide); if (i === 0) railIn = e.d;
  });
  const tags = ['clustered: row order', 'secondary: points back', 'covering: no hop', 'read speed ⇄ write cost'];
  tags.forEach((t, i) => badges.push(pill(820, 150 + i * 56, t, { icon: 'check', w: 230 })));
  flows.push({ id: 'in', kind: 'read', speed: 180, size: 5 });
  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null, flows, note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--index-types" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Database index types">
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
