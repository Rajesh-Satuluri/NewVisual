/* follow-the-query-scene.js — the "Follow the Query" lab scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes as plan operators,
   pill badges, routed connectors with arrows, a faded iso grid and particle
   rails for rows climbing the plan.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, flows, note }.

   Views: 'submit' (the SQL enters, four stages ahead), 'parse' (text → tokens →
   parse tree → AST), 'logical' (relational-algebra operator tree), 'physical'
   (two candidate plans priced, cheaper wins), 'execute' (pull iterators drive
   rows up the tree), 'recap' (the full SQL→…→rows pipeline). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* operator-tree slots — coordinates kept here, never read back off a cube */
const TREE = {
  scanL:  { x: 300, y: 414 },
  scanR:  { x: 740, y: 414 },
  join:   { x: 520, y: 312 },
  filter: { x: 520, y: 210 },
  sort:   { x: 520, y: 110 },
};

export function renderFollowTheQueryScene(snap, opts = {}) {
  const view = snap.view || 'submit';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw an operator cube; caller keeps the coords
  const op = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 54, o.h || 34, mat, {
      icon: o.icon || 'layers', label, sub: o.sub || '', iconSize: 17,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // a flat stage tile for the horizontal pipeline rows
  const stage = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 56, o.h || 30, mat, {
      icon: o.icon || 'chevron', label, sub: o.sub || '', iconSize: 16,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // connect two tree slots child->parent with an upward arrow (rows flow up)
  const link = (child, parent, o = {}) => {
    const pts = [V(child.x, child.y - 24), V((child.x + parent.x) / 2, (child.y + parent.y) / 2), V(parent.x, parent.y + 40)];
    const e = edge(pts, { arrow: true, cls: o.cls });
    guides.push(e.guide);
    return e.d;
  };

  /* ── SUBMIT: the SQL enters; four stages stand ahead ───────────────────── */
  if (view === 'submit') {
    op(VW / 2, 150, 'SELECT …', 'blue', { icon: 'search', rx: 96, h: 40, sub: 'your query' });
    badges.push(pill(VW / 2, 86, 'orders ⋈ customers · WHERE total > 100 · ORDER BY total', { icon: 'scroll', cls: 'pill--sst', w: 560 }));
    const names = ['parse', 'logical plan', 'optimize', 'execute'];
    const sx = [200, 440, 680, 900];
    names.forEach((n, i) => {
      const c = isoTile(sx[i], 340, 58, 'slate', { ghost: true });
      shadows.push(c.shadow); solids.push(c.g);
      badges.push(pill(sx[i], 340, n, { cls: 'pill--sst' }));
      if (i < names.length - 1) {
        const e = edge([V(sx[i] + 62, 340), V(sx[i + 1] - 62, 340)], { arrow: true });
        guides.push(e.guide);
      }
    });
    const e0 = edge([V(VW / 2, 206), V(VW / 2, 270), V(200, 322)], { arrow: true });
    guides.push(e0.guide);
    badges.push(region(132, 300, 836, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="372" text-anchor="middle">FOUR STAGES BEFORE A SINGLE ROW IS READ</text>`);
    cap(VW / 2, 470, 'the same text becomes a plan, then concrete operators, then rows');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PARSE: text → tokens → parse tree → AST ───────────────────────────── */
  if (view === 'parse') {
    const steps = [
      { x: 150, label: 'SQL text', mat: 'blue', icon: 'scroll', sub: 'characters' },
      { x: 400, label: 'tokens', mat: 'amber', icon: 'listOrdered', sub: 'lexer' },
      { x: 650, label: 'parse tree', mat: 'green', icon: 'merge', sub: 'grammar' },
      { x: 895, label: 'AST', mat: 'lilac', icon: 'check', sub: 'validated' },
    ];
    steps.forEach((s, i) => {
      op(s.x, 250, s.label, s.mat, { icon: s.icon, sub: s.sub, rx: 66, h: 38, halo: i === 3 });
      if (i < steps.length - 1) {
        const e = edge([V(s.x + 72, 250), V(steps[i + 1].x - 72, 250)], { arrow: true });
        guides.push(e.guide);
      }
    });
    badges.push(pill(650, 150, 'analysis checks names & types vs the catalog', { icon: 'search', cls: 'pill--sst', w: 440 }));
    const e = edge([V(650, 168), V(650, 206)], { arrow: true, dashed: true });
    guides.push(e.guide);
    badges.push(region(80, 330, 880, 86, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="378" text-anchor="middle">GRAMMAR CHECKED · NAMES RESOLVED · STILL NO DISK I/O</text>`);
    cap(VW / 2, 460, 'a mistyped column is caught here, before planning begins');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── the operator tree, shared by logical / physical / execute ─────────── */
  const drawTree = (o = {}) => {
    const T = TREE;
    // edges first (under solids)
    link(T.scanL, T.join);
    link(T.scanR, T.join);
    const spine1 = link(T.join, T.filter);
    const spine2 = link(T.filter, T.sort);
    // result arrow out the top
    const eTop = edge([V(T.sort.x, T.sort.y - 24), V(T.sort.x, T.sort.y - 68)], { arrow: true });
    guides.push(eTop.guide);
    // operators
    op(T.scanL.x, T.scanL.y, o.scanL || 'Scan orders', o.scanLmat || 'slate', { icon: 'database', sub: o.scanLsub || 'leaf' });
    op(T.scanR.x, T.scanR.y, o.scanR || 'Scan customers', o.scanRmat || 'slate', { icon: 'database', sub: o.scanRsub || 'leaf' });
    op(T.join.x, T.join.y, o.join || 'Join', o.joinmat || 'green', { icon: 'merge', sub: o.joinsub || 'o.cust_id = c.id' });
    op(T.filter.x, T.filter.y, o.filter || 'Filter', o.filtermat || 'amber', { icon: 'search', sub: o.filtersub || 'total > 100' });
    op(T.sort.x, T.sort.y, o.sort || 'Sort', o.sortmat || 'lilac', { icon: 'listOrdered', sub: o.sortsub || 'total DESC', halo: !!o.sortHalo });
    badges.push(pill(T.sort.x, T.sort.y - 84, 'result rows', { icon: 'check', cls: 'pill--sst' }));
    return { spine1, spine2 };
  };

  /* ── LOGICAL: the relational-algebra tree ──────────────────────────────── */
  if (view === 'logical') {
    drawTree();
    badges.push(pill(190, 150, 'what to compute,', { icon: 'layers', cls: 'pill--sst' }));
    badges.push(pill(190, 188, 'not yet how', { cls: 'pill--sst' }));
    cap(VW / 2, 500, 'scans at the leaves → join → filter → sort → result at the root');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PHYSICAL: two candidate plans priced, cheaper wins ────────────────── */
  if (view === 'physical') {
    drawTree({
      scanL: 'Index Scan', scanLmat: 'blue', scanLsub: 'on total ✓',
      scanR: 'Scan customers', scanRmat: 'slate', scanRsub: 'build side',
      join: 'Hash Join', joinmat: 'green', joinsub: 'probe orders',
      filter: 'Filter', filtermat: 'amber', filtersub: 'pushed into scan',
      sort: 'Sort', sortmat: 'lilac', sortsub: 'total DESC', sortHalo: true,
    });
    badges.push(pill(198, 150, '✗ seq scan + nested loop', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(198, 190, 'cost ≈ 920', { icon: 'gauge', cls: 'pill--sst' }));
    badges.push(pill(848, 150, '✓ index scan + hash join', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(848, 190, 'cost ≈ 180 — chosen', { icon: 'gauge', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'the optimizer prices every candidate and keeps the cheapest plan');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── EXECUTE: pull iterators drive rows up the tree ────────────────────── */
  if (view === 'execute') {
    const { spine1 } = drawTree({
      scanL: 'Index Scan', scanLmat: 'blue', scanLsub: 'reads pages',
      scanR: 'Scan customers', scanRmat: 'blue', scanRsub: 'hash build',
      join: 'Hash Join', joinmat: 'green', joinsub: 'probing',
      filter: 'Filter', filtermat: 'amber', filtersub: 'total > 100',
      sort: 'Sort', sortmat: 'lilac', sortsub: 'ordering', sortHalo: true,
    });
    // rows climb the spine: join → filter → sort
    railOut = spine1;
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    badges.push(pill(198, 150, 'pull: root asks down,', { icon: 'chevron', cls: 'pill--sst' }));
    badges.push(pill(198, 190, 'rows flow up', { icon: 'bolt', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'demand-driven: each operator pulls rows from its children');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the full horizontal pipeline ───────────────────────────────── */
  const pipe = [
    { label: 'SQL', mat: 'blue', icon: 'scroll' },
    { label: 'Parse', mat: 'amber', icon: 'merge' },
    { label: 'Plan', mat: 'green', icon: 'layers' },
    { label: 'Optimize', mat: 'rose', icon: 'gauge' },
    { label: 'Execute', mat: 'lilac', icon: 'bolt' },
    { label: 'Rows', mat: 'green', icon: 'check' },
  ];
  const px = [120, 290, 460, 630, 800, 955];
  pipe.forEach((s, i) => {
    stage(px[i], 268, s.label, s.mat, { icon: s.icon, rx: 56, h: 32, halo: i === pipe.length - 1 });
    if (i < pipe.length - 1) {
      const e = edge([V(px[i] + 60, 268), V(px[i + 1] - 60, 268)], { arrow: true });
      guides.push(e.guide);
    }
  });
  railOut = edge([V(px[0] + 60, 268), V(px[5] - 60, 268)], {}).d;
  flows.push({ id: 'out', kind: 'read', speed: 170, size: 5 });
  badges.push(region(70, 190, 900, 150, 'one query · the full pipeline', { r: 24 }));
  badges.push(pill(VW / 2, 392, 'EXPLAIN ANALYZE prints the plan + real rows & time per operator', { icon: 'search', cls: 'pill--sst', w: 620 }));
  cap(VW / 2, 452, 'text in, sorted rows out — compiled and run in milliseconds');
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
  <svg class="scene scene--follow-the-query" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Follow the query through the engine">
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
