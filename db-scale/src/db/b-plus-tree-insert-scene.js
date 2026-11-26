/* b-plus-tree-insert-scene.js — the "B+ Tree Insert" scene, in the shared
   Designed-to-Scale isometric vocabulary (rounded iso cubes, soft shadows,
   halos, pill badges, dashed regions, routed arrow connectors, faded iso grid,
   particle rails).

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'find' (descend to a full leaf), 'simple' (insert with room to spare),
   'overflow' (a full leaf overflows), 'split' (leaf split + separator copied
   up), 'parent' (parent absorbs the separator, height unchanged), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a tree node (internal or leaf): an iso cube whose label is its sorted keys */
function bnode(cx, cy, rx, mat, keys, opts = {}) {
  return isoCube(cx, cy, rx, opts.h != null ? opts.h : 38, mat, {
    r: opts.r != null ? opts.r : 9,
    label: keys != null ? keys : opts.label,
    sub: opts.sub || '',
    halo: opts.halo, pulse: opts.pulse, ghost: opts.ghost,
    iconSize: opts.iconSize,
  });
}

/* parent base → child top connector */
function link(parent, child, opts = {}) {
  return edge([
    V(parent.base[0], parent.base[1] - 4),
    V((parent.base[0] + child.verts.N.x) / 2, (parent.base[1] + child.verts.N.y) / 2 + 6),
    V(child.verts.N.x, child.verts.N.y - 2),
  ], { arrow: true, dashed: opts.dashed, cls: opts.cls });
}

/* horizontal sibling-pointer link between two adjacent leaves (the leaf chain) */
function sibling(a, b) {
  return edge([
    V(a.verts.E.x - 2, a.front[1]),
    V(b.verts.W.x + 2, b.front[1]),
  ], { arrow: true, dashed: true, cls: 'is-chain' });
}

export function renderBPlusTreeInsertScene(snap, opts = {}) {
  const view = snap.view || 'find';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const push = (c) => { shadows.push(c.shadow); if (c.halo) halos.push(c.halo); solids.push(c.g); };

  /* ── FIND: descend the tree to the target leaf, which is already full ──── */
  if (view === 'find') {
    const root = bnode(520, 112, 92, 'lilac', '17 · 33', { h: 44, halo: true });
    push(root);
    const lx = [300, 520, 740], ly = 322;
    const lkeys = ['5 · 11', '20 · 26 · 31', '40 · 52'];
    const full = 1;
    const leaves = lx.map((x, i) => bnode(x, ly, 70, i === full ? 'rose' : 'green', lkeys[i], { h: 34, pulse: i === full }));
    leaves.forEach(push);
    leaves.forEach((lf, i) => { const e = link(root, lf, { cls: i === full ? 'is-hot' : '' }); guides.push(e.guide); });
    for (let i = 0; i < leaves.length - 1; i++) guides.push(sibling(leaves[i], leaves[i + 1]).guide);

    badges.push(pill(520, 52, 'INSERT 24  ·  descend to its leaf', { icon: 'search', cls: 'pill--sst' }));
    badges.push(pill(740, ly - 70, 'leaf chain →', { icon: 'listOrdered' }));
    badges.push(pill(leaves[full].top[0], ly + 70, 'target leaf is FULL · 3 / 3', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="520" y="470" text-anchor="middle">a key must land in sorted order — but there is no free slot</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── SIMPLE: the leaf has room — insert in place, shift neighbours ─────── */
  if (view === 'simple') {
    const before = bnode(300, 250, 86, 'slate', '20 · 26 · ·', { h: 40 });
    const after = bnode(752, 250, 86, 'green', '20 · 24 · 26', { h: 40, halo: true });
    push(before); push(after);
    // the incoming key drifts down toward the free slot, then an arrow across
    badges.push(pill(300, 150, 'leaf: 1 free slot', { icon: 'file' }));
    const key = pill(520, 118, 'insert 24', { icon: 'key', cls: 'pill--sst' });
    badges.push(key);
    const e = edge([V(before.verts.E.x - 2, before.front[1]), V(526, before.front[1]), V(after.verts.W.x + 2, after.front[1])], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(pill(526, 206, 'no split needed', { icon: 'check' }));
    badges.push(`<text class="sst-cap" x="520" y="360" text-anchor="middle">sorted order kept — the neighbours just shift right inside the page</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'write', speed: 150, size: 6 }], note: snap.note });
  }

  /* ── OVERFLOW: inserting into a full leaf overflows the page ───────────── */
  if (view === 'overflow') {
    const page = isoCube(520, 210, 300, 60, 'rose', { r: 14, halo: true });
    push(page);
    badges.push(pill(520, 118, 'leaf holds 3 — insert makes 4', { icon: 'alert', cls: 'pill--sst' }));
    const kv = ['20', '24', '26', '31'];
    const hot = 1; // the newly inserted key
    const x0 = 520 - 300 + 70, slotW = (300 * 2 - 140) / 4;
    for (let i = 0; i < 4; i++) {
      const kx = x0 + i * slotW + slotW / 2;
      badges.push(pill(kx, 206, kv[i], { w: 56, cls: i === hot ? 'pill--sst' : '' }));
      if (i === 3) badges.push(`<text class="sst-cap" x="${A(kx)}" y="246" text-anchor="middle">⤷ no slot</text>`);
    }
    badges.push(region(360, 150, 320, 150, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="520" y="330" text-anchor="middle">OVERFLOW · 4 KEYS, 3 SLOTS — A PAGE CANNOT GROW</text>`);
    badges.push(`<text class="sst-cap" x="520" y="372" text-anchor="middle">the only way to make room is to split the leaf in two</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── SPLIT: the full leaf splits; the separator key is COPIED up ───────── */
  if (view === 'split') {
    const parent = bnode(520, 96, 86, 'lilac', '17 · 33', { h: 42 });
    push(parent);
    const lL = bnode(360, 332, 78, 'green', '20 · 24', { h: 36, halo: true });
    const lR = bnode(684, 332, 78, 'green', '26 · 31', { h: 36, halo: true });
    push(lL); push(lR);
    guides.push(sibling(lL, lR).guide);
    // the separator = first key of the right leaf, COPIED up into the parent
    const up = edge([V(lR.verts.N.x, lR.verts.N.y - 2), V((lR.verts.N.x + parent.base[0]) / 2, (lR.verts.N.y + parent.base[1]) / 2), V(parent.base[0] + 10, parent.base[1] - 4)], { arrow: true, cls: 'is-hot' });
    guides.push(up.guide); railIn = up.d;
    badges.push(pill(520, 200, 'copy 26 up as separator', { icon: 'key', cls: 'pill--sst' }));
    badges.push(pill(360, 408, 'left half · 2 keys', { icon: 'file' }));
    badges.push(pill(684, 408, 'right half · 2 keys', { icon: 'file' }));
    badges.push(pill(878, 332, 'splits + 1', { icon: 'scale' }));
    badges.push(`<text class="sst-cap" x="520" y="462" text-anchor="middle">26 is COPIED (not moved) — it still lives in the right leaf, as B+ trees keep all data in leaves</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'write', speed: 150, size: 6 }], note: snap.note });
  }

  /* ── PARENT: the parent absorbs the separator; height is unchanged ─────── */
  if (view === 'parent') {
    const root = bnode(520, 104, 108, 'amber', '17 · 26 · 33', { h: 46, halo: true, pulse: true });
    push(root);
    const lx = [196, 404, 636, 844], ly = 332;
    const lkeys = ['5 · 11', '20 · 24', '26 · 31', '40 · 52'];
    const hot = 2;
    const leaves = lx.map((x, i) => bnode(x, ly, 58, i === hot ? 'green' : 'green', lkeys[i], { h: 32, halo: i === hot }));
    leaves.forEach(push);
    leaves.forEach((lf) => { const e = link(root, lf); guides.push(e.guide); });
    for (let i = 0; i < leaves.length - 1; i++) guides.push(sibling(leaves[i], leaves[i + 1]).guide);
    badges.push(pill(520, 46, 'parent gains separator 26 + child pointer', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(pill(214, 104, 'still 2 levels', { icon: 'check' }));
    badges.push(pill(846, 104, 'height unchanged', { icon: 'check' }));
    badges.push(`<text class="sst-cap" x="520" y="462" text-anchor="middle">the root had a free slot — if it had been full too, the split would cascade upward (see B+ Tree Split)</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── RECAP: the balanced result + the algorithm as pills ───────────────── */
  const root = bnode(430, 110, 96, 'lilac', '17 · 26 · 33', { h: 44, halo: true });
  push(root);
  const lx = [206, 360, 514, 668], ly = 322;
  const lkeys = ['5 · 11', '20 · 24', '26 · 31', '40 · 52'];
  const leaves = lx.map((x, i) => bnode(x, ly, 56, 'green', lkeys[i], { h: 32 }));
  leaves.forEach(push);
  leaves.forEach((lf) => { const e = link(root, lf); guides.push(e.guide); });
  for (let i = 0; i < leaves.length - 1; i++) guides.push(sibling(leaves[i], leaves[i + 1]).guide);
  const by = A(ly + leaves[0].ry + leaves[0].bodyH + 12);
  badges.push(`<line class="iso-seam" x1="150" y1="${by}" x2="724" y2="${by}" stroke-dasharray="5 6"/>`);
  badges.push(`<text class="sst-cap" x="437" y="${by + 18}" text-anchor="middle">every leaf still at the same depth — balanced, sorted, chained</text>`);
  const tags = [
    ['descend to the leaf', 'search'],
    ['insert in sorted order', 'listOrdered'],
    ['full → split the leaf', 'scale'],
    ['copy separator up', 'key'],
    ['leaves stay same depth', 'check'],
  ];
  tags.forEach((t, i) => badges.push(pill(892, 96 + i * 54, t[0], { icon: t[1], w: 210 })));
  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--b-plus-tree-insert" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="B+ Tree insert and leaf split">
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
