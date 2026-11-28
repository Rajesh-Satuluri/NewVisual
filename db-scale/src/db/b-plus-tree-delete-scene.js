/* b-plus-tree-delete-scene.js — the "B+ Tree Delete" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso node-slabs holding sorted
   keys, soft ground shadows, halos, pill badges, dashed logical regions, routed
   connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'find' (descend to the leaf), 'simple' (remove, still half full),
   'underflow' (leaf below min fill), 'borrow' (redistribute from a sibling),
   'merge' (coalesce two leaves + drop separator), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a B+ tree node: a wide flat iso slab with its sorted keys written on top.
   returns { tile, txt, cx, cy, rx, topY, baseY } */
function bnode(cx, cy, keys, mat, opts = {}) {
  const txtStr = keys.length ? keys.join('   ') : '·';
  const rx = opts.rx != null ? opts.rx : Math.max(44, txtStr.length * 5.2 + 26);
  const h = opts.h != null ? opts.h : 26;
  const tile = isoTile(cx, cy, rx, mat, { h, halo: opts.halo, pulse: opts.pulse, ghost: opts.ghost });
  const txt = `<text class="sst-cap" x="${A(cx)}" y="${A(cy + 4)}" text-anchor="middle">${esc(txtStr)}</text>`;
  return { tile, txt, cx, cy, rx, topY: cy - tile.ry, baseY: cy + h + tile.ry };
}

/* push a node's drawables into the layer buckets */
function emit(n, buckets, labelsOnTop = true) {
  buckets.shadows.push(n.tile.shadow);
  if (n.tile.halo) buckets.halos.push(n.tile.halo);
  buckets.solids.push(n.tile.g);
  (labelsOnTop ? buckets.overlays : buckets.solids).push(n.txt);
}

export function renderBPlusTreeDeleteScene(snap, opts = {}) {
  const view = snap.view || 'find';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const B = { shadows, halos, solids, overlays };

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const flows = [];

  /* parent → child connector */
  const link = (par, child, o = {}) => {
    const e = edge([
      V(child.cx, par.baseY - 6),
      V(child.cx, (par.baseY + child.topY) / 2),
      V(child.cx, child.topY + 2),
    ], { arrow: true, dashed: o.dashed });
    guides.push(e.guide);
    return e.d;
  };
  /* sibling chain (B+ leaves are linked left→right) */
  const chain = (leaves) => {
    for (let i = 0; i < leaves.length - 1; i++) {
      const a = leaves[i], b = leaves[i + 1];
      const e = edge([V(a.cx + a.rx - 4, a.cy + 6), V(b.cx - b.rx + 4, b.cy + 6)], { dashed: true });
      guides.push(e.guide);
    }
  };

  /* ── FIND: the full two-level tree, descent path highlighted ───────────── */
  if (view === 'find') {
    const root = bnode(520, 108, ['11', '30', '42'], 'blue', { rx: 108 });
    emit(root, B);
    const lx = [180, 400, 640, 870];
    const leafKeys = [['3', '5'], ['11', '14', '19'], ['30', '37'], ['42', '55', '66']];
    const leaves = lx.map((x, i) => bnode(x, 318, leafKeys[i], i === 2 ? 'rose' : 'green', { rx: 78, halo: i === 2 }));
    leaves.forEach((lf, i) => { emit(lf, B); });
    // descent path: root → leaf[2]
    const d = link(root, leaves[2]);
    railIn = d;
    // non-highlighted parent links (static, dashed faint)
    leaves.forEach((lf, i) => { if (i !== 2) link(root, lf, { dashed: true }); });
    chain(leaves);
    badges.push(pill(520, 60, 'delete key 37', { icon: 'trash', cls: 'pill--sst' }));
    badges.push(pill(640, 378, 'target leaf', { icon: 'target', w: 150 }));
    badges.push(`<text class="sst-cap" x="520" y="${A(430)}" text-anchor="middle">leaves linked left → right · all at the same depth</text>`);
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SIMPLE: one leaf, key removed, still ≥ half full ──────────────────── */
  if (view === 'simple') {
    const par = bnode(520, 110, ['11', '30', '42'], 'blue', { rx: 108 });
    emit(par, B);
    const before = bnode(330, 320, ['11', '14', '19'], 'green', { rx: 92 });
    const after = bnode(720, 320, ['11', '14'], 'green', { rx: 82, halo: true });
    emit(before, B); emit(after, B);
    link(par, before, { dashed: true });
    const arr = edge([V(before.cx + before.rx, 320), V(525, 320), V(after.cx - after.rx, 320)], { arrow: true });
    guides.push(arr.guide);
    badges.push(pill(330, 268, 'before', { w: 110 }));
    badges.push(pill(720, 268, 'after · still ≥ min', { icon: 'check', w: 190 }));
    badges.push(`<text class="sst-cap" x="525" y="300" text-anchor="middle">remove 19</text>`);
    badges.push(`<text class="iso-region__t" x="520" y="${A(430)}" text-anchor="middle">LEAF STAYS HALF FULL · NO RESTRUCTURING</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── UNDERFLOW: leaf drops below the minimum ───────────────────────────── */
  if (view === 'underflow') {
    const par = bnode(520, 110, ['11', '30', '42'], 'blue', { rx: 108 });
    emit(par, B);
    const before = bnode(330, 320, ['30', '37'], 'green', { rx: 78 });
    const after = bnode(720, 320, ['30'], 'rose', { rx: 70, halo: true });
    emit(before, B); emit(after, B);
    link(par, after, { dashed: true });
    const arr = edge([V(before.cx + before.rx, 320), V(525, 320), V(after.cx - after.rx, 320)], { arrow: true });
    guides.push(arr.guide);
    badges.push(pill(330, 268, 'before', { w: 110 }));
    badges.push(pill(720, 262, 'under-full!', { icon: 'alert', w: 160 }));
    badges.push(`<text class="sst-cap" x="525" y="300" text-anchor="middle">remove 37</text>`);
    badges.push(region(628, 282, 184, 86, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="520" y="${A(432)}" text-anchor="middle">ONE KEY LEFT · BELOW MINIMUM FILL</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── BORROW: redistribute a key from a richer sibling ──────────────────── */
  if (view === 'borrow') {
    const par = bnode(520, 110, ['19', '42'], 'amber', { rx: 96, halo: true });
    emit(par, B);
    const sib = bnode(300, 330, ['11', '14'], 'green', { rx: 78 });
    const leaf = bnode(690, 330, ['19', '30'], 'green', { rx: 78, halo: true });
    emit(sib, B); emit(leaf, B);
    link(par, sib, { dashed: true });
    link(par, leaf, { dashed: true });
    // the borrowed key travels sibling → under-full leaf
    const mv = edge([V(sib.cx + sib.rx - 4, 318), V(495, 300), V(leaf.cx - leaf.rx + 4, 318)], { arrow: true });
    guides.push(mv.guide); railIn = mv.d;
    // separator update link from parent down
    badges.push(pill(300, 280, 'spare key', { icon: 'check', w: 150 }));
    badges.push(pill(690, 280, 'now ≥ min', { icon: 'check', w: 150 }));
    badges.push(pill(495, 268, 'move 19 across', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(pill(520, 62, 'separator updated → 19', { icon: 'key', cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="520" y="${A(434)}" text-anchor="middle">REDISTRIBUTE · HEIGHT UNCHANGED</text>`);
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── MERGE: coalesce two leaves, pull the separator down ───────────────── */
  if (view === 'merge') {
    const par = bnode(520, 104, ['42'], 'blue', { rx: 92 });
    emit(par, B);
    // the dropped separator (30) pulled out of the parent
    badges.push(pill(360, 150, 'separator 30 dropped', { icon: 'trash', cls: 'pill--sst' }));
    const drop = edge([V(455, 128), V(420, 210), V(470, 292)], { arrow: true, dashed: true });
    guides.push(drop.guide);
    const sib = bnode(330, 330, ['11', '14'], 'green', { rx: 78 });
    const leaf = bnode(690, 330, ['30'], 'rose', { rx: 70 });
    emit(sib, B); emit(leaf, B);
    // coalesce arrow
    const co = edge([V(leaf.cx - leaf.rx + 4, 330), V(510, 330), V(sib.cx + sib.rx - 4, 330)], { arrow: true });
    guides.push(co.guide); railIn = co.d;
    const merged = bnode(520, 470, ['11', '14', '30'], 'green', { rx: 96, halo: true });
    emit(merged, B);
    const mlink = edge([V(sib.cx, 356), V(sib.cx, 420), V(merged.cx - 20, merged.topY)], { dashed: true });
    const mlink2 = edge([V(leaf.cx, 356), V(leaf.cx, 420), V(merged.cx + 20, merged.topY)], { dashed: true });
    guides.push(mlink.guide, mlink2.guide);
    badges.push(pill(690, 282, 'cannot spare', { icon: 'alert', w: 160 }));
    badges.push(pill(520, 430, 'one merged leaf', { icon: 'merge', w: 180 }));
    badges.push(`<text class="iso-region__t" x="520" y="${A(528)}" text-anchor="middle">UNDERFLOW MAY CASCADE UP · HEIGHT CAN DROP</text>`);
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: a healthy tree + the rule pills ────────────────────────────── */
  const root = bnode(380, 116, ['19', '42'], 'blue', { rx: 92 });
  emit(root, B);
  const lx = [210, 400, 590];
  const leafKeys = [['3', '11', '14'], ['19', '30'], ['42', '55']];
  const leaves = lx.map((x, i) => bnode(x, 320, leafKeys[i], 'green', { rx: 72 }));
  leaves.forEach(lf => emit(lf, B));
  leaves.forEach(lf => link(root, lf, { dashed: true }));
  chain(leaves);
  badges.push(`<text class="sst-cap" x="380" y="402" text-anchor="middle">balanced · every leaf at the same depth</text>`);
  const tags = ['remove key in leaf', 'borrow from a sibling', 'else merge + drop separator', 'rebalance up the tree'];
  tags.forEach((t, i) => badges.push(pill(830, 150 + i * 56, t, { icon: 'check', w: 230 })));
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
  <svg class="scene scene--b-plus-tree-delete" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="B+ tree delete, borrow and merge">
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
