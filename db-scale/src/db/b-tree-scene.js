/* b-tree-scene.js — the "B-Tree" scene, in the Designed-to-Scale isometric
   vocabulary (rounded iso cubes, soft shadows, halos, pill badges, dashed
   regions, routed arrow connectors, faded iso grid, particle rails).

   Input: a view-snapshot { view, keys, target, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'binary' (a too-tall binary tree), 'node' (one fat page-node),
   'tree' (shallow 3-level B-Tree), 'search' (a descent path), 'balance'
   (balanced, sorted, logarithmic height), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a B-Tree node: an iso cube whose label is its sorted keys */
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

export function renderBTreeScene(snap, opts = {}) {
  const view = snap.view || 'tree';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  const push = (c) => { shadows.push(c.shadow); if (c.halo) halos.push(c.halo); solids.push(c.g); };

  /* ── BINARY: a tall, seek-heavy binary tree ───────────────────────────── */
  if (view === 'binary') {
    // levels of small single-key nodes; width kept small so the TALLNESS reads
    const levels = [
      [{ x: 430, k: '50' }],
      [{ x: 330, k: '25' }, { x: 530, k: '75' }],
      [{ x: 280, k: '12' }, { x: 380, k: '37' }, { x: 480, k: '62' }, { x: 580, k: '88' }],
    ];
    const ys = [70, 150, 230];
    const nodeMap = [];
    levels.forEach((row, li) => {
      nodeMap[li] = row.map(n => {
        const c = bnode(n.x, ys[li], 28, 'blue', n.k, { h: 26, r: 7, iconSize: 0 });
        push(c);
        return c;
      });
    });
    // parent → child links
    nodeMap[0].forEach((p, i) => { const e = link(p, nodeMap[1][i * 2]); guides.push(e.guide); const e2 = link(p, nodeMap[1][i * 2 + 1]); guides.push(e2.guide); });
    nodeMap[1].forEach((p, i) => { const e = link(p, nodeMap[2][i * 2]); guides.push(e.guide); const e2 = link(p, nodeMap[2][i * 2 + 1]); guides.push(e2.guide); });
    // the descent carries on down — faded ellipsis + ghost level
    overlays.push(`<text class="sst-cap" x="430" y="300" text-anchor="middle" style="font-size:22px;letter-spacing:4px">⋮</text>`);
    const ghosts = [250, 350, 450, 610].map(x => bnode(x, 348, 26, 'blue', '', { h: 24, r: 7, ghost: true }));
    ghosts.forEach(push);
    overlays.push(`<text class="sst-cap" x="430" y="398" text-anchor="middle">…about 20 levels for a million rows</text>`);

    // a tall bracket region on the right calling out the height
    badges.push(region(690, 52, 250, 326, '', { r: 22 }));
    badges.push(pill(815, 150, '≈ 20 levels', { icon: 'layers', cls: 'pill--sst' }));
    badges.push(pill(815, 206, '1 seek per level', { icon: 'clock' }));
    badges.push(pill(815, 262, '≈ 20 random seeks', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="815" y="352" text-anchor="middle">DEPTH IS THE ENEMY</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null,
      flows: [], note: snap.note });
  }

  /* ── NODE: one fat node = one page, hundreds of keys ──────────────────── */
  if (view === 'node') {
    const cx = 520, cy = 150, rx = 330;
    const page = isoCube(cx, cy, rx, 66, 'lilac', { r: 14, halo: true });
    push(page);
    badges.push(pill(cx, 70, 'one node  =  one 8 KB page', { icon: 'file', cls: 'pill--sst' }));

    // a row of sorted key cells across the top face
    const nKeys = snap.keys || 9;
    const slotW = (rx * 2 - 70) / nKeys;
    const x0 = cx - rx + 52;
    const keyVals = ['7', '16', '29', '41', '58', '70', '83', '91', '…'];
    const keyXs = [];
    for (let i = 0; i < nKeys; i++) {
      const kx = x0 + i * slotW + slotW / 2;
      keyXs.push(kx);
      badges.push(pill(kx, cy - 4, keyVals[i % keyVals.length], { w: Math.min(50, slotW - 8), cls: '' }));
    }
    badges.push(`<text class="sst-cap" x="${cx}" y="${A(cy + 58)}" text-anchor="middle">hundreds of sorted keys · pointers between them</text>`);

    // child-pointer stubs between keys, down to small child tiles
    const childXs = [keyXs[1], keyXs[4], keyXs[7]];
    childXs.forEach((kx, i) => {
      const ch = isoTile(kx, 372, 52, 'green', { h: 18 });
      push(ch);
      const e = edge([V(kx, cy + 50), V(kx, (cy + 50 + ch.verts.N.y) / 2), V(ch.verts.N.x, ch.verts.N.y - 2)], { arrow: true });
      guides.push(e.guide);
    });
    badges.push(`<text class="sst-cap" x="520" y="418" text-anchor="middle">each pointer leads to another page</text>`);
    badges.push(pill(878, 150, 'fan-out ≈ 256', { icon: 'merge' }));

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null,
      flows: [], note: snap.note });
  }

  /* ── build a shared 3-level tree (used by tree / search / balance / recap) */
  const highlight = view === 'search' ? [0, 1, 1] : null; // path: root, internal[1], leaf under it

  const rootY = 96, midY = 232, leafY = 368;
  const root = bnode(520, rootY, 92, highlight ? 'amber' : 'lilac', '29 · 58', { h: 46, halo: true, pulse: !!highlight });
  const midXs = [300, 520, 740];
  const midKeys = ['7 · 16', '37 · 50', '70 · 83'];
  const mids = midXs.map((x, i) => bnode(x, midY, 72, highlight && i === highlight[1] ? 'amber' : 'lilac', midKeys[i], { h: 42, pulse: highlight && i === highlight[1] }));
  const leafXs = [206, 332, 458, 582, 708, 834];
  const leafKeys = ['3·5', '9·14', '20·26', '42·55', '62·68', '88·95'];
  // which leaf is on the highlighted path (under mid index 1 → a middle leaf)
  const hotLeaf = 3;
  const leaves = leafXs.map((x, i) => bnode(x, leafY, 56, highlight && i === hotLeaf ? 'rose' : 'green', leafKeys[i], { h: 34, pulse: highlight && i === hotLeaf }));

  if (view === 'tree' || view === 'search' || view === 'balance' || view === 'recap') {
    push(root); mids.forEach(push); leaves.forEach(push);

    // links root → mids
    mids.forEach((m, i) => {
      const on = highlight && i === highlight[1];
      const e = link(root, m, { cls: on ? 'is-hot' : '' });
      guides.push(e.guide);
    });
    // links mids → leaves (2 each)
    mids.forEach((m, i) => {
      [i * 2, i * 2 + 1].forEach(li => {
        const on = highlight && i === highlight[1] && li === hotLeaf;
        const e = link(m, leaves[li], { cls: on ? 'is-hot' : '' });
        guides.push(e.guide);
      });
    });

    // level labels on the left
    if (view !== 'recap') {
      badges.push(pill(92, rootY, 'root', { icon: 'key', cls: 'pill--sst' }));
      badges.push(pill(92, midY, 'internal', { icon: 'layers' }));
      badges.push(pill(92, leafY, 'leaves', { icon: 'file' }));
    }

    if (view === 'tree') {
      badges.push(pill(520, 460, 'fan-out ≈ 256  →  3 levels index 16 M rows', { icon: 'merge', cls: 'pill--sst' }));
    }

    if (view === 'search') {
      const tgt = snap.target || '42';
      badges.push(pill(900, rootY, 'seek 1', { icon: 'search', cls: 'pill--sst' }));
      badges.push(pill(900, midY, 'seek 2', { icon: 'search', cls: 'pill--sst' }));
      badges.push(pill(900, leafY, 'seek 3', { icon: 'search', cls: 'pill--sst' }));
      badges.push(pill(520, 460, `find ${esc(tgt)} · 3 page reads vs 30 seeks`, { icon: 'check' }));
      // read rail down the hot path for a flow particle
      const e = edge([
        V(root.base[0], root.base[1] - 4),
        V(mids[1].top[0], mids[1].verts.N.y - 2),
        V(mids[1].base[0], mids[1].base[1] - 4),
        V(leaves[hotLeaf].verts.N.x, leaves[hotLeaf].verts.N.y - 2),
      ], { cls: 'is-hot' });
      railIn = e.d;
    }

    if (view === 'balance') {
      // a baseline under all leaves: same depth
      const by = A(leafY + leaves[0].ry + leaves[0].bodyH + 14);
      badges.push(`<line class="iso-seam" x1="176" y1="${by}" x2="864" y2="${by}" stroke-dasharray="5 6"/>`);
      badges.push(`<text class="sst-cap" x="520" y="${by + 18}" text-anchor="middle">every leaf at the same depth — always balanced, keys sorted left → right</text>`);
      badges.push(pill(214, 70, '1 M rows → height 3', { icon: 'check' }));
      badges.push(pill(820, 70, '10 M rows → height 4', { icon: 'check' }));
      badges.push(pill(520, 40, 'height grows like log₂₅₆(rows)', { icon: 'gauge', cls: 'pill--sst' }));
    }

    if (view === 'recap') {
      const tags = [
        ['node = page', 'file'],
        ['fan-out ≈ 256', 'merge'],
        ['height 3–4', 'layers'],
        ['sorted → range scans', 'listOrdered'],
      ];
      tags.forEach((t, i) => badges.push(pill(895, 96 + i * 52, t[0], { icon: t[1], w: 196 })));
      badges.push(pill(520, 462, 'any row in a handful of page reads', { icon: 'check', cls: 'pill--sst' }));
    }

    const flows = railIn ? [{ id: 'in', kind: 'read', speed: 150, size: 5 }] : [];
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null, flows, note: snap.note });
  }

  // fallback
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
  <svg class="scene scene--b-tree" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="B-Tree index structure">
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
