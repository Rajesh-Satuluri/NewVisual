/* b-plus-tree-root-split-scene.js — the "B+ Tree Split" scene, in the shared
   Designed-to-Scale isometric vocabulary (rounded iso cubes, soft shadows,
   halos, pill badges, dashed regions, routed arrow connectors, faded iso grid).

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'full-path' (every node on the insert path is full), 'leaf-split'
   (leaf splits, separator copied up), 'parent-full' (the push-up overflows the
   parent), 'internal-split' (internal node splits, middle key moves up),
   'root-split' (the root splits and a new root is born, +1 level), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a B+ tree node: an iso cube whose label is its sorted keys */
function bnode(cx, cy, rx, mat, keys, opts = {}) {
  return isoCube(cx, cy, rx, opts.h != null ? opts.h : 40, mat, {
    r: opts.r != null ? opts.r : 9,
    label: keys != null ? keys : opts.label,
    sub: opts.sub || '',
    halo: opts.halo, pulse: opts.pulse, ghost: opts.ghost,
    iconSize: opts.iconSize,
  });
}

/* connector from a parent node's base down to a child node's top point */
function link(parent, child, opts = {}) {
  return edge([
    V(parent.base[0], parent.base[1] - 4),
    V((parent.base[0] + child.verts.N.x) / 2, (parent.base[1] + child.verts.N.y) / 2 + 6),
    V(child.verts.N.x, child.verts.N.y - 2),
  ], { arrow: true, dashed: opts.dashed, cls: opts.cls });
}

/* a short upward connector carrying a promoted key from (fromX,fromY) up to
   (toX,toY) — used for "copied up" / "moved up" separators */
function upLink(fromX, fromY, toX, toY, opts = {}) {
  return edge([
    V(fromX, fromY),
    V((fromX + toX) / 2, (fromY + toY) / 2),
    V(toX, toY),
  ], { arrow: true, dashed: opts.dashed, cls: opts.cls });
}

export function renderBPlusTreeRootSplitScene(snap, opts = {}) {
  const view = snap.view || 'full-path';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const push = (c) => { shadows.push(c.shadow); if (c.halo) halos.push(c.halo); solids.push(c.g); };
  const flows = [];

  /* ── FULL-PATH: every node on the insert path is full ─────────────────── */
  if (view === 'full-path') {
    const rootY = 100, midY = 236, leafY = 372;
    const root = bnode(520, rootY, 96, 'rose', '18·34·52·70', { h: 46, halo: true });
    const midXs = [300, 520, 740];
    const midKeys = ['…', '38·44·48·50', '…'];
    const mids = midXs.map((x, i) => bnode(x, midY, 74, i === 1 ? 'rose' : 'lilac', midKeys[i], { h: 42, halo: i === 1 }));
    const leafXs = [206, 332, 458, 582, 708, 834];
    const leafKeys = ['3·9', '12·15', '21·27', '45·46·47·48', '58·63', '80·92'];
    const hot = 3;
    const leaves = leafXs.map((x, i) => bnode(x, leafY, 56, i === hot ? 'rose' : 'green', leafKeys[i], { h: 34, halo: i === hot }));

    push(root); mids.forEach(push); leaves.forEach(push);
    mids.forEach((m, i) => { const e = link(root, m, { cls: i === 1 ? 'is-hot' : '' }); guides.push(e.guide); });
    mids.forEach((m, i) => [i * 2, i * 2 + 1].forEach(li => {
      const e = link(m, leaves[li], { cls: (i === 1 && li === hot) ? 'is-hot' : '' }); guides.push(e.guide);
    }));

    badges.push(pill(92, rootY, 'root · FULL', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(92, midY, 'parent · FULL', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(92, leafY, 'leaf · FULL', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(520, 458, 'insert 49 → no room anywhere on the path', { icon: 'key', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LEAF-SPLIT: leaf becomes two, separator COPIED up ────────────────── */
  if (view === 'leaf-split') {
    const parent = bnode(520, 118, 96, 'lilac', '…38 · [45] · 50…', { h: 46 });
    push(parent);
    badges.push(pill(820, 118, 'parent gains 45', { icon: 'key' }));

    const left = bnode(360, 352, 74, 'green', '45·46', { h: 38 });
    const right = bnode(680, 352, 74, 'green', '47·48·49', { h: 38 });
    push(left); push(right);

    // the copied-up separator, rising from the right leaf's first key to the parent
    const sep = pill(520, 232, '45  copied up', { icon: 'bolt', cls: 'pill--sst' });
    const eUp = upLink(right.verts.N.x, right.verts.N.y - 2, parent.base[0] + 2, parent.base[1] - 2, { cls: 'is-hot' });
    guides.push(eUp.guide);
    // parent → the two new leaves
    guides.push(link(parent, left).guide);
    guides.push(link(parent, right).guide);
    badges.push(sep);

    // sibling chain pointer between the two leaves (B+ leaves stay linked)
    const chain = edge([V(left.verts.E.x - 4, left.front[1]), V((left.verts.E.x + right.verts.W.x) / 2, left.front[1] + 6), V(right.verts.W.x + 4, right.front[1])], { arrow: true, dashed: true });
    guides.push(chain.guide);
    badges.push(`<text class="sst-cap" x="520" y="${A(left.base[1] + 20)}" text-anchor="middle">two half-full leaves, still chained — key 45 kept in the leaf</text>`);
    badges.push(pill(520, 462, 'leaf split: separator COPIED up (key stays below)', { icon: 'file', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PARENT-FULL: the pushed-up separator overflows the parent ────────── */
  if (view === 'parent-full') {
    const node = bnode(520, 190, 150, 'rose', '12 · 38 · 45 · 60', { h: 58, halo: true });
    push(node);
    badges.push(pill(520, 96, 'internal node · already FULL', { icon: 'alert', cls: 'pill--sst' }));

    // the incoming separator with nowhere to land
    const incoming = bnode(520, 352, 40, 'amber', '45', { h: 30, r: 7 });
    push(incoming);
    const eUp = upLink(incoming.verts.N.x, incoming.verts.N.y - 2, node.base[0], node.base[1] - 2, { cls: 'is-hot' });
    guides.push(eUp.guide);
    badges.push(pill(778, 352, 'separator from the leaf split', { icon: 'key' }));
    badges.push(`<text class="iso-region__t" x="520" y="${A(node.verts.N.y - 26)}" text-anchor="middle">NO FREE SLOT — THE SPLIT MUST CASCADE UP</text>`);
    badges.push(pill(520, 462, 'a split at one level can force a split at the level above', { icon: 'merge', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── INTERNAL-SPLIT: node splits, MIDDLE key MOVES up ─────────────────── */
  if (view === 'internal-split') {
    // the grandparent slot that will receive the promoted middle key
    const gp = bnode(520, 104, 88, 'lilac', '…receives 45…', { h: 42 });
    push(gp);

    // the two internal halves — middle key 45 is GONE from both
    const left = bnode(340, 348, 84, 'lilac', '12 · 38', { h: 44 });
    const right = bnode(700, 348, 84, 'lilac', '50 · 60', { h: 44 });
    push(left); push(right);

    // the promoted middle key, moving up (not copied)
    const mid = pill(520, 230, '45  moves up', { icon: 'bolt', cls: 'pill--sst' });
    const eUp = upLink(520, 300, gp.base[0], gp.base[1] - 2, { cls: 'is-hot' });
    guides.push(eUp.guide);
    guides.push(link(gp, left).guide);
    guides.push(link(gp, right).guide);
    badges.push(mid);
    badges.push(`<text class="sst-cap" x="340" y="${A(left.base[1] + 18)}" text-anchor="middle">keys &lt; 45</text>`);
    badges.push(`<text class="sst-cap" x="700" y="${A(right.base[1] + 18)}" text-anchor="middle">keys &gt; 45</text>`);
    badges.push(pill(520, 462, 'internal split: middle key MOVES up — removed from both halves', { icon: 'layers', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ROOT-SPLIT: the root splits, a NEW root is born, height +1 ───────── */
  if (view === 'root-split') {
    // the brand-new root, minted above everything
    const newRoot = bnode(520, 74, 70, 'green', '45', { h: 40, halo: true, sub: 'new root' });
    push(newRoot);
    badges.push(pill(820, 74, 'NEW ROOT created', { icon: 'bolt', cls: 'pill--sst' }));

    // the two halves of the old root — now internal nodes
    const left = bnode(300, 196, 78, 'lilac', '12 · 38', { h: 42 });
    const right = bnode(740, 196, 78, 'lilac', '50 · 60', { h: 42 });
    push(left); push(right);
    guides.push(link(newRoot, left).guide);
    guides.push(link(newRoot, right).guide);
    badges.push(`<text class="sst-cap" x="520" y="150" text-anchor="middle">the old root, split in two — now internal nodes</text>`);

    // ghosted subtrees beneath, to imply the unchanged lower levels at equal depth
    const subXs = [206, 394, 646, 834];
    const subs = subXs.map(x => bnode(x, 320, 52, 'lilac', '', { h: 30, ghost: true }));
    subs.forEach(push);
    [left, left, right, right].forEach((p, i) => { guides.push(link(p, subs[i], { dashed: true }).guide); });
    const leafXs = [160, 252, 348, 440, 600, 692, 788, 880];
    const leaves = leafXs.map(x => bnode(x, 420, 36, 'green', '', { h: 22, ghost: true }));
    leaves.forEach(push);

    // a baseline: every leaf still at equal depth
    const by = A(420 + leaves[0].ry + leaves[0].bodyH + 12);
    badges.push(`<line class="iso-seam" x1="120" y1="${by}" x2="920" y2="${by}" stroke-dasharray="5 6"/>`);
    badges.push(`<text class="sst-cap" x="520" y="${by + 18}" text-anchor="middle">every leaf still at the same depth — the tree grew at the TOP</text>`);
    badges.push(pill(170, 74, 'height 3 → 4', { icon: 'layers', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the three rules + a balanced tree ─────────────────────────── */
  // a small, neutral 3-level tree
  const rootY = 110, midY = 236, leafY = 356;
  const root = bnode(470, rootY, 78, 'lilac', '45', { h: 42 });
  const midXs = [300, 640];
  const mids = midXs.map((x, i) => bnode(x, midY, 66, 'lilac', i === 0 ? '12·38' : '50·60', { h: 38 }));
  const leafXs = [214, 360, 548, 724];
  const leaves = leafXs.map((x) => bnode(x, leafY, 50, 'green', '', { h: 30 }));
  push(root); mids.forEach(push); leaves.forEach(push);
  mids.forEach(m => guides.push(link(root, m).guide));
  guides.push(link(mids[0], leaves[0]).guide); guides.push(link(mids[0], leaves[1]).guide);
  guides.push(link(mids[1], leaves[2]).guide); guides.push(link(mids[1], leaves[3]).guide);
  const by = A(leafY + leaves[0].ry + leaves[0].bodyH + 12);
  badges.push(`<line class="iso-seam" x1="176" y1="${by}" x2="760" y2="${by}" stroke-dasharray="5 6"/>`);
  badges.push(`<text class="sst-cap" x="468" y="${by + 18}" text-anchor="middle">all leaves equidistant from the root</text>`);

  const tags = [
    ['leaf split: COPY key up', 'file'],
    ['internal split: MOVE key up', 'layers'],
    ['root split: +1 level', 'gauge'],
    ['splits cascade only as needed', 'merge'],
  ];
  tags.forEach((t, i) => badges.push(pill(892, 108 + i * 54, t[0], { icon: t[1], w: 240 })));
  badges.push(pill(468, 54, 'B+ trees grow at the top', { icon: 'check', cls: 'pill--sst' }));

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
  <svg class="scene scene--b-plus-tree-root-split" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="B+ Tree cascading split and root split">
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
