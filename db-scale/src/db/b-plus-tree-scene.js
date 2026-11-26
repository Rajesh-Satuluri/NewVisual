/* b-plus-tree-scene.js — the "B+ Tree" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes with key labels, soft ground shadows,
   halos, pill badges, dashed logical regions, routed connectors with arrows, a
   faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'btree-recap' (values in every node), 'separation' (routers vs data
   leaves), 'fanout' (keys-only packs more keys), 'linked' (sibling-linked
   leaves), 'range' (descend once, walk the chain), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;

const VW = 1040;

/* shared 3-level layout: root → 2 internal → 4 leaves */
const ROOT = { cx: 520, cy: 96, rx: 60, keys: '40' };
const INTERNAL = [
  { cx: 360, cy: 216, rx: 54, keys: '12 · 25' },
  { cx: 680, cy: 216, rx: 54, keys: '55 · 78' },
];
const LEAVES = [
  { cx: 250, cy: 366, rx: 46, keys: '1–11' },
  { cx: 450, cy: 366, rx: 46, keys: '12–39' },
  { cx: 590, cy: 366, rx: 46, keys: '40–62' },
  { cx: 790, cy: 366, rx: 46, keys: '63–99' },
];
const CHILDREN = [[0, 1], [2, 3]]; // internal i → leaf indices

export function renderBPlusTreeScene(snap, opts = {}) {
  const view = snap.view || 'recap';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  const bottomTip = (n) => V(n.cx, n.cy + n.ry * 0.5 + n.bodyH);
  const topCorner = (n) => V(n.cx, n.cy - n.ry * 0.5);

  /* draw a node cube; returns the rendered ref with its spec merged in */
  function node(spec, mat, { sub, halo, ghost } = {}) {
    const c = isoCube(spec.cx, spec.cy, spec.rx, 40, mat, {
      label: spec.keys, sub, iconSize: 20, halo: !!halo, ghost: !!ghost, r: 12,
    });
    shadows.push(c.shadow); if (halo) halos.push(c.halo); solids.push(c.g);
    return Object.assign(c, spec);
  }
  function link(parent, child, o = {}) {
    const e = edge([
      bottomTip(parent),
      V(child.cx, (bottomTip(parent).y + topCorner(child).y) / 2),
      topCorner(child),
    ], { arrow: true, dashed: o.dashed, cls: o.cls });
    guides.push(e.guide);
    return e;
  }

  /* ── BTREE-RECAP: a plain B-tree with values scattered in every node ───── */
  if (view === 'btree-recap') {
    const r = node(ROOT, 'blue', { sub: 'key + value' });
    const ins = INTERNAL.map(s => node(s, 'blue', { sub: 'key + value' }));
    const lvs = LEAVES.map(s => node(s, 'green'));
    ins.forEach(i => link(r, i));
    CHILDREN.forEach((kids, i) => kids.forEach(k => link(ins[i], lvs[k])));
    // amber "value" tiles perched on root + internal nodes → data lives there too
    [r, ...ins].forEach(n => {
      const t = isoTile(n.cx + n.rx - 12, n.cy - n.ry * 0.5 - 10, 14, 'amber');
      shadows.push(t.shadow); solids.push(t.g);
    });
    badges.push(pill(520, 470, 'values sit in every node', { icon: 'alert', cls: 'pill--sst', w: 240 }));
    badges.push(`<text class="iso-region__t" x="520" y="510" text-anchor="middle">ORDERED SCANS ZIG-ZAG THE WHOLE TREE</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SEPARATION: routers (keys only) on top, data leaves at the bottom ─── */
  if (view === 'separation') {
    badges.push(region(150, 56, 740, 232, '', { r: 22 }));
    badges.push(pill(520, 44, 'INTERNAL · routers — keys only', { icon: 'key', w: 300 }));
    badges.push(region(150, 312, 740, 128, '', { r: 22 }));
    badges.push(pill(520, 300, 'LEAVES · hold every value', { icon: 'database', w: 280 }));
    const r = node(ROOT, 'blue', { sub: 'keys' });
    const ins = INTERNAL.map(s => node(s, 'blue', { sub: 'keys' }));
    const lvs = LEAVES.map(s => node(s, 'green', { sub: 'values' }));
    ins.forEach(i => link(r, i));
    CHILDREN.forEach((kids, i) => kids.forEach(k => link(ins[i], lvs[k])));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── FANOUT: a keys-only page packs ~2× the keys of a key+value page ───── */
  if (view === 'fanout') {
    const page = (cx, title, icon, mat, cells) => {
      badges.push(pill(cx, 96, title, { icon, w: 236 }));
      const p = isoTile(cx, 250, 168, mat, { h: 30 });
      shadows.push(p.shadow); solids.push(p.g);
      // lay the cells as small pills across the page's top face
      const n = cells.length, span = 300, x0 = cx - span / 2;
      cells.forEach((c, i) => {
        const px = x0 + (span / (n - 1)) * i;
        badges.push(pill(px, 212 - (i % 2) * 2, c.t, { cls: c.v ? 'pill--sst' : '', w: 44 }));
      });
      badges.push(`<text class="sst-cap" x="${cx}" y="330" text-anchor="middle">${cells.filter(c => !c.v).length} keys per page</text>`);
    };
    // B-tree page: interleaved key(K) + value(V) → only 4 keys fit
    page(290, 'B-Tree page', 'database', 'amber',
      [{ t: 'k', v: 0 }, { t: 'val', v: 1 }, { t: 'k', v: 0 }, { t: 'val', v: 1 },
       { t: 'k', v: 0 }, { t: 'val', v: 1 }, { t: 'k', v: 0 }, { t: 'val', v: 1 }]);
    // B+ page: keys only → 8 keys fit in the same space
    page(760, 'B+ page (keys only)', 'key', 'blue',
      [{ t: 'k', v: 0 }, { t: 'k', v: 0 }, { t: 'k', v: 0 }, { t: 'k', v: 0 },
       { t: 'k', v: 0 }, { t: 'k', v: 0 }, { t: 'k', v: 0 }, { t: 'k', v: 0 }]);
    badges.push(pill(520, 430, 'same page size · keys-only packs ~2× the keys', { icon: 'merge', cls: 'pill--sst', w: 380 }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LINKED / RANGE / RECAP: full tree, leaves chained by sibling ptrs ─── */
  const hotRange = view === 'range' ? [1, 2] : [];
  const r = node(ROOT, 'blue', { sub: 'keys' });
  const ins = INTERNAL.map(s => node(s, 'blue', { sub: 'keys' }));
  const lvs = LEAVES.map((s, i) => node(s, hotRange.includes(i) ? 'green' : 'green',
    { sub: 'values', halo: hotRange.includes(i) }));
  ins.forEach((i, ix) => link(r, i, { cls: view === 'range' && ix === 0 ? 'edge-hot' : '' }));
  CHILDREN.forEach((kids, i) => kids.forEach(k =>
    link(ins[i], lvs[k], { cls: view === 'range' && k === 1 ? 'edge-hot' : '' })));

  // sibling pointers: leaf[i] → leaf[i+1] along the leaf row
  let chainD = null;
  for (let i = 0; i < lvs.length - 1; i++) {
    const a = lvs[i], b = lvs[i + 1];
    const hot = view === 'range' && i >= hotRange[0] && i < hotRange[hotRange.length - 1];
    const e = edge([
      V(a.verts.E.x - 2, a.front[1]),
      V((a.verts.E.x + b.verts.W.x) / 2, a.front[1] + 14),
      V(b.verts.W.x + 2, b.front[1]),
    ], { arrow: true, cls: 'edge-leaf' + (hot ? ' edge-hot' : '') });
    guides.push(e.guide);
    if (hot && !chainD) chainD = e.d;
  }

  if (view === 'linked') {
    badges.push(pill(520, 470, 'leaves linked left → right = sorted list', { icon: 'listOrdered', cls: 'pill--sst', w: 340 }));
  }

  if (view === 'range') {
    badges.push(pill(520, 44, 'WHERE k BETWEEN 18 AND 44', { icon: 'search', w: 300 }));
    badges.push(pill(520, 470, 'descend once → walk the leaf chain', { icon: 'bolt', cls: 'pill--sst', w: 320 }));
    if (chainD) { railIn = chainD; flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 }); }
  }

  if (view === 'recap') {
    const tags = ['keys route', 'leaves store', 'leaves linked', 'point + range'];
    tags.forEach((t, i) => badges.push(pill(520 - 255 + i * 170, 476, t, { icon: 'check', w: 158 })));
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
  <svg class="scene scene--b-plus-tree" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="B+ Tree structure">
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
