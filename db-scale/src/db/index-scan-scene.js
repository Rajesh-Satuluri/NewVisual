/* index-scan-scene.js — "Seq Scan vs Index Scan" access-path scene, in the
   shared Designed-to-Scale isometric vocabulary (rounded iso cubes, pills,
   dashed regions, routed connectors, particle rails).

   Two lanes: a TOP lane that sequentially sweeps every page of a table, and a
   BOTTOM lane that descends a B+Tree index and fetches only the matching pages.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'twoways', 'index', 'indexscan', 'selectivity', 'choose', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

const NPAGES = 8;
const PG_X0 = 352, PG_STEP = 74, PG_RX = 32, PG_H = 14;

/* a horizontal row of page tiles. green = fetched, ghost = skipped. */
function pageRow(y, greenSet, ghostSet) {
  const tiles = [];
  for (let i = 0; i < NPAGES; i++) {
    const cx = PG_X0 + i * PG_STEP;
    const mat = greenSet && greenSet.has(i) ? 'green' : 'lilac';
    tiles.push(isoTile(cx, y, PG_RX, mat, { h: PG_H, ghost: ghostSet ? ghostSet.has(i) : false }));
  }
  return tiles;
}
function pageTop(y, i) { return V(PG_X0 + i * PG_STEP, y - PG_RX * 0.5 - 2); }

/* a tiny B+Tree: root over two leaves, all amber cubes */
function bptree(ox, oy, opts = {}) {
  const root = isoCube(ox, oy, 30, 30, 'amber', { label: opts.label || '', icon: 'layers', iconSize: 15, ghost: opts.ghost });
  const l1 = isoCube(ox - 54, oy + 92, 24, 24, 'amber', { ghost: opts.ghost });
  const l2 = isoCube(ox + 54, oy + 92, 24, 24, 'amber', { ghost: opts.ghost });
  return { root, l1, l2 };
}

export function renderIndexScanScene(snap, opts = {}) {
  const view = snap.view || 'twoways';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  const TOP_Y = 168, BOT_Y = 474, TREE_X = 250, TREE_Y = 322;

  const pushCube = (c, halo) => { shadows.push(c.shadow); if (halo && c.halo) halos.push(c.halo); solids.push(c.g); };
  const pushTiles = (ts) => ts.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });

  /* ── TOP lane: sequential scan over every page ───────────────────────── */
  function buildTop({ dim, sweep, cost }) {
    const client = isoCube(140, TOP_Y - 18, 38, 46, 'blue', { icon: 'app', label: 'scan', iconSize: 20, ghost: dim });
    pushCube(client);
    const pages = pageRow(TOP_Y, null, dim ? new Set([...Array(NPAGES).keys()]) : null);
    pushTiles(pages);
    badges.push(pill(224, 98, 'Seq Scan', { icon: 'search' }));
    if (sweep) {
      const pts = [V(client.verts.E.x - 2, client.front[1])];
      for (let i = 0; i < NPAGES; i++) pts.push(pageTop(TOP_Y, i));
      const e = edge(pts, { arrow: true });
      guides.push(e.guide);
      railIn = railIn || e.d;
    }
    if (cost != null) badges.push(pill(910, TOP_Y - 2, 'cost ' + cost, { icon: 'gauge', cls: 'pill--sst' }));
    return { client, pages };
  }

  /* ── BOTTOM lane: index scan via a B+Tree ────────────────────────────── */
  function buildBottom({ green, ghostRest, path, label, cost, ghostTree }) {
    const greenSet = new Set(green || []);
    const ghostSet = ghostRest ? new Set([...Array(NPAGES).keys()].filter(i => !greenSet.has(i))) : null;
    const pages = pageRow(BOT_Y, greenSet, ghostSet);
    pushTiles(pages);
    const t = bptree(TREE_X, TREE_Y, { ghost: ghostTree });
    pushCube(t.root); pushCube(t.l1); pushCube(t.l2);
    // root → leaves
    [t.l1, t.l2].forEach(l => {
      const e = edge([V(t.root.base[0], t.root.base[1] - 6), V(l.top[0], l.top[1] - 2)], { arrow: false });
      guides.push(e.guide);
    });
    badges.push(pill(224, BOT_Y - 150, 'Index Scan', { icon: 'layers' }));
    if (label) badges.push(`<text class="sst-cap" x="${TREE_X}" y="${A(t.l1.base[1] + 20)}" text-anchor="middle">${esc(label)}</text>`);
    if (path && (green || []).length) {
      // leaf → each matching page
      (green || []).forEach((i, k) => {
        const e = edge([
          V(t.l2.verts.E.x - 2, t.l2.front[1]),
          V((t.l2.verts.E.x + pageTop(BOT_Y, i).x) / 2, t.l2.front[1] + 8),
          pageTop(BOT_Y, i),
        ], { arrow: true });
        guides.push(e.guide);
        if (k === 0) railIn = e.d;
      });
    }
    if (cost != null) badges.push(pill(910, BOT_Y - 2, 'cost ' + cost, { icon: 'gauge', cls: 'pill--sst' }));
    return { tree: t, pages };
  }

  if (view === 'twoways') {
    buildTop({ sweep: true });
    buildBottom({ green: [3, 4], path: true });
    badges.push(region(300, 262, 620, 2, '', { r: 1 }));
    badges.push(`<text class="iso-region__t" x="610" y="258" text-anchor="middle">SAME ROWS · TWO ACCESS PATHS</text>`);
  } else if (view === 'index') {
    buildTop({ dim: true });
    buildBottom({ label: 'sorted key → page location' });
    badges.push(pill(700, 300, 'the index · a sorted B+Tree', { icon: 'layers', cls: 'pill--sst' }));
  } else if (view === 'indexscan') {
    buildTop({ dim: true });
    buildBottom({ green: [3, 4], ghostRest: true, path: true });
    badges.push(`<text class="sst-cap" x="648" y="${A(BOT_Y + 40)}" text-anchor="middle">fetch 2 pages, skip the other 6</text>`);
  } else if (view === 'selectivity') {
    buildTop({ sweep: true, cost: 40 });
    buildBottom({ green: [3, 4], path: true, cost: 3 });
    badges.push(`<text class="iso-region__t" x="610" y="258" text-anchor="middle">FEW MATCH → INDEX WINS · MOST MATCH → SCAN WINS</text>`);
    badges.push(region(300, 262, 620, 2, '', { r: 1 }));
  } else if (view === 'choose') {
    // optimizer weighs both costs, routes to the cheaper (index) lane
    const opt = isoCube(520, 250, 46, 52, 'amber', { icon: 'target', label: 'plan', iconSize: 22, halo: true });
    pushCube(opt, true);
    buildTop({ dim: true, cost: 40 });
    buildBottom({ green: [3, 4], path: true, cost: 3 });
    [[V(opt.verts.N.x, opt.top[1] + 4), V(opt.top[0], TOP_Y + 30)],
     [V(opt.base[0], opt.base[1] - 6), V(opt.base[0], BOT_Y - 150)]].forEach((p, k) => {
      const e = edge(p, { arrow: true, dashed: k === 0 });
      guides.push(e.guide);
    });
    badges.push(pill(520, 150, 'cost decides the path', { icon: 'gauge' }));
  } else { // recap
    buildTop({ dim: true });
    buildBottom({ green: [3, 4], path: true });
    badges.push(pill(700, 300, 'index = fast selective reads', { icon: 'check', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="610" y="258" text-anchor="middle">paid for in space + write cost</text>`);
  }

  const flows = railIn ? [{ id: 'in', kind: 'read', speed: 150, size: 5 }] : [];
  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null, flows, note: snap.note });
}

/* stitch the SVG together in the shared layer order (verbatim from dbms-scene) */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Sequential scan versus index scan">
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
