/* bplus-tree-lab-scene.js — the "B+ Tree Lab" scene, in the shared Designed-to-
   Scale isometric vocabulary. Builds a small-order (max 3 keys) B+ tree insert
   by insert, showing leaves filling, splitting, the separator riding up, linked
   leaves, and a root split.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'empty' (one empty leaf), 'leaf' (filled [1·2·3]), 'split1' (first
   split → root 3), 'grow' (3 linked leaves under [3·5]), 'rootsplit' (height 3),
   'recap' (balanced tree + invariants). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderBplusTreeLabScene(snap, opts = {}) {
  const view = snap.view || 'empty';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a tree node; caller keeps the coords, we never read them back off the cube
  const node = (cx, cy, keys, mat, o = {}) => {
    const rx = o.rx || 58, h = o.h || 34;
    const c = isoCube(cx, cy, rx, h, mat, {
      label: keys, sub: o.sub || '', halo: !!o.halo, ghost: !!o.ghost,
      icon: o.icon, iconSize: 15,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return { cx, cy, rx, ry: rx * 0.5, h, topY: cy - rx * 0.5, botY: cy + rx * 0.5 + h };
  };

  // parent → child connector, computed from caller-held coords only
  const link = (p, c, o = {}) => {
    const e = edge([
      V(p.cx, p.botY - 4),
      V((p.cx + c.cx) / 2, (p.botY + c.topY) / 2),
      V(c.cx, c.topY + 2),
    ], { arrow: !!o.arrow, r: 14 });
    guides.push(e.guide);
    return e;
  };

  // dashed sibling link between two leaves (range-scan chain)
  const leafChain = (a, b) => {
    const e = edge([V(a.cx + a.rx * 0.6, a.botY - a.h * 0.5), V(b.cx - b.rx * 0.6, b.botY - b.h * 0.5)],
      { dashed: true, r: 4 });
    guides.push(e.guide);
  };

  /* ── EMPTY: one empty leaf, a queue of keys ────────────────────────────── */
  if (view === 'empty') {
    badges.push(pill(VW / 2, 88, 'insert in order → 1 2 3 4 5 6 7 8', { icon: 'listOrdered', cls: 'pill--sst' }));
    node(VW / 2, 272, '(empty leaf)', 'slate', { ghost: true, rx: 74 });
    badges.push(pill(VW / 2, 392, 'order = max 3 keys per node', { icon: 'key', cls: 'pill--sst' }));
    badges.push(region(300, 180, 440, 190, '', { r: 22 }));
    cap(VW / 2, 470, 'one node = one disk page — we keep the tree shallow so lookups read few pages');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LEAF: single leaf filled to [1·2·3] ───────────────────────────────── */
  if (view === 'leaf') {
    badges.push(pill(VW / 2, 88, 'inserted 1 · 2 · 3', { icon: 'check', cls: 'pill--sst' }));
    node(VW / 2, 268, '1 · 2 · 3', 'lilac', { halo: true, rx: 82, sub: 'leaf · FULL' });
    const e = edge([V(VW / 2, 150), V(VW / 2, 214)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    badges.push(pill(VW / 2, 406, 'keys stay sorted inside the node', { icon: 'listOrdered' }));
    cap(VW / 2, 466, 'height 1 — one more key overflows this leaf and forces a split');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SPLIT1: insert 4 → split, separator 3 rides up to a new root ───────── */
  if (view === 'split1') {
    badges.push(pill(VW / 2, 78, 'insert 4 → overflow → split', { icon: 'alert', cls: 'pill--sst' }));
    const root = node(VW / 2, 168, '3', 'amber', { halo: true, rx: 50, sub: 'new root' });
    const l1 = node(360, 372, '1 · 2', 'lilac', { rx: 70 });
    const l2 = node(680, 372, '3 · 4', 'lilac', { rx: 70 });
    link(root, l1, { arrow: true });
    link(root, l2, { arrow: true });
    badges.push(pill(360, 300, '< 3', { cls: 'pill--sst' }));
    badges.push(pill(680, 300, '≥ 3', { cls: 'pill--sst' }));
    cap(VW / 2, 486, 'the middle key 3 is copied up — height grows 1 → 2, tree stays balanced');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── GROW: three linked leaves under root [3·5] ────────────────────────── */
  if (view === 'grow') {
    badges.push(pill(VW / 2, 74, 'inserted 5, 6 → another split', { icon: 'check', cls: 'pill--sst' }));
    const root = node(VW / 2, 158, '3 · 5', 'amber', { rx: 62 });
    const l1 = node(260, 372, '1 · 2', 'lilac', { rx: 64 });
    const l2 = node(VW / 2, 372, '3 · 4', 'lilac', { rx: 64 });
    const l3 = node(780, 372, '5 · 6', 'lilac', { rx: 64 });
    link(root, l1, { arrow: true });
    link(root, l2, { arrow: true });
    link(root, l3, { arrow: true });
    leafChain(l1, l2);
    leafChain(l2, l3);
    badges.push(pill(VW / 2, 300, 'leaves linked → range scans walk sideways', { icon: 'merge', cls: 'pill--sst' }));
    cap(VW / 2, 486, 'all data lives in the leaves, chained left-to-right for ordered scans');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ROOTSPLIT: height 3 — new root over two internals, four leaves ────── */
  if (view === 'rootsplit') {
    badges.push(pill(VW / 2, 60, 'inserted 7, 8 → root overflows → root split', { icon: 'alert', cls: 'pill--sst' }));
    const root = node(VW / 2, 132, '5', 'green', { halo: true, rx: 46, sub: 'new root' });
    const i1 = node(330, 288, '3', 'amber', { rx: 46 });
    const i2 = node(710, 288, '7', 'amber', { rx: 46 });
    const lx = [180, 420, 620, 860];
    const lk = ['1 · 2', '3 · 4', '5 · 6', '7 · 8'];
    const leaves = lx.map((x, k) => node(x, 452, lk[k], 'lilac', { rx: 52 }));
    link(root, i1, { arrow: true });
    link(root, i2, { arrow: true });
    link(i1, leaves[0], { arrow: true });
    link(i1, leaves[1], { arrow: true });
    link(i2, leaves[2], { arrow: true });
    link(i2, leaves[3], { arrow: true });
    for (let k = 0; k < leaves.length - 1; k++) leafChain(leaves[k], leaves[k + 1]);
    badges.push(pill(VW / 2, 540, 'height 3 indexes millions at real fanout', { icon: 'gauge' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: balanced tree + invariant tags ─────────────────────────────── */
  const root = node(VW / 2, 138, '5', 'green', { rx: 46 });
  const i1 = node(330, 286, '3', 'amber', { rx: 46 });
  const i2 = node(710, 286, '7', 'amber', { rx: 46 });
  const lx = [180, 420, 620, 860];
  const lk = ['1 · 2', '3 · 4', '5 · 6', '7 · 8'];
  const leaves = lx.map((x, k) => node(x, 446, lk[k], 'lilac', { rx: 52 }));
  link(root, i1, { arrow: true }); link(root, i2, { arrow: true });
  link(i1, leaves[0], { arrow: true }); link(i1, leaves[1], { arrow: true });
  link(i2, leaves[2], { arrow: true }); link(i2, leaves[3], { arrow: true });
  for (let k = 0; k < leaves.length - 1; k++) leafChain(leaves[k], leaves[k + 1]);
  badges.push(region(120, 512, 800, 70, '', { r: 20 }));
  badges.push(`<text class="iso-region__t" x="${VW / 2}" y="544" text-anchor="middle">SORTED · BALANCED · HALF-FULL · LINKED LEAVES</text>`);
  cap(VW / 2, 568, 'the four invariants held through every insert — why B+ trees run on-disk indexes');
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
  <svg class="scene scene--bplus-tree-lab" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="B+ tree lab — building a tree by inserting keys">
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
