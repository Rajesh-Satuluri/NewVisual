/* query-optimizer-lab-scene.js — the "Query Optimizer Lab" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs and
   labels, soft shadows, halos, pill badges, dashed regions, routed connectors,
   a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'setup' (3-table join, many candidate plans), 'stats' (row counts &
   selectivity), 'access' (seq scan vs index scan), 'joins' (join order &
   algorithm), 'pick' (two costed plans, cheapest chosen), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const ROWY = 300;

export function renderQueryOptimizerLabScene(snap, opts = {}) {
  const view = snap.view || 'setup';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // a box; caller keeps the coords, we never read them back off the cube
  const box = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 50, o.h || 36, mat, {
      icon: o.icon || 'database', label, sub: o.sub || '', iconSize: 16,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  // connect parent (px,py) down to child (cx,cy) with an arrowed guide
  const link = (px, py, cx, cy) => {
    const e = edge([V(px, py + 26), V((px + cx) / 2, (py + cy) / 2 + 8), V(cx, cy - 30)], { arrow: true });
    guides.push(e.guide);
    return e;
  };

  /* ── SETUP: a 3-table join and a cloud of candidate plans ───────────────── */
  if (view === 'setup') {
    badges.push(pill(VW / 2, 88, 'SELECT … FROM A JOIN B JOIN C WHERE A.k = ?', { icon: 'search', cls: 'pill--sst', w: 440 }));
    const TX = [300, 520, 740];
    ['A', 'B', 'C'].forEach((t, i) => box(TX[i], ROWY, t, 'blue', { sub: 'table' }));
    badges.push(region(150, 384, 740, 110, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="420" text-anchor="middle">JOIN ORDER × ALGORITHM × ACCESS PATH</text>`);
    const tags = ['A⋈B⋈C', 'C⋈B⋈A', 'seq vs index', 'hash vs loop'];
    tags.forEach((t, i) => badges.push(pill(240 + i * 190, 466, t + ' ?', { icon: 'chevron', cls: 'pill--sst' })));
    cap(VW / 2, 520, 'many equivalent plans — which runs fastest? the optimizer must choose without running them');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── STATS: row counts drive cardinality estimates ──────────────────────── */
  if (view === 'stats') {
    const TX = [300, 560, 820];
    const info = [
      { t: 'A', rows: '1,000,000 rows', mat: 'blue' },
      { t: 'B', rows: '50,000 rows', mat: 'blue' },
      { t: 'C', rows: '200 rows', mat: 'blue' },
    ];
    info.forEach((d, i) => {
      box(TX[i], ROWY, d.t, d.mat, { sub: 'table' });
      badges.push(pill(TX[i], ROWY - 86, d.rows, { icon: 'listOrdered', cls: 'pill--sst' }));
    });
    badges.push(pill(300, ROWY + 92, "filter A.status='new' → 2%", { icon: 'target', cls: 'pill--sst' }));
    badges.push(pill(300, ROWY + 132, 'est. 20,000 rows', { icon: 'gauge', cls: 'pill--sst' }));
    cap(VW / 2, 512, 'from table stats (row counts, histograms) the optimizer estimates rows out of every operator');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ACCESS: seq scan vs index scan on the filtered table ───────────────── */
  if (view === 'access') {
    const tx = VW / 2, ty = 150;
    box(tx, ty, 'A', 'blue', { sub: "status='new'" });
    const lx = 320, rx = 760, cy = 360;
    box(lx, cy, 'Seq Scan', 'amber', { icon: 'scroll', sub: 'read all 1M' });
    box(rx, cy, 'Index Scan', 'green', { icon: 'search', sub: 'seek 20k', halo: true });
    link(tx, ty, lx, cy);
    link(tx, ty, rx, cy);
    badges.push(pill(lx, cy + 86, 'cost ≈ 10,000', { icon: 'gauge', cls: 'pill--sst' }));
    badges.push(pill(rx, cy + 86, 'cost ≈ 300 ✓', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 512, 'a selective filter on an indexed column → the index scan wins; a broad filter → the seq scan wins');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    const e = edge([V(tx, ty + 26), V(rx, cy - 30)], { arrow: true });
    railOut = e.d;
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── JOINS: join order & algorithm shrink the intermediate ──────────────── */
  if (view === 'joins') {
    // left tree: (A⋈B) first — huge intermediate
    badges.push(pill(300, 96, 'order: (A⋈B)⋈C', { icon: 'alert', cls: 'pill--sst' }));
    box(300, 150, '⋈ C', 'slate', { icon: 'merge', sub: 'hash' });
    box(210, 300, '⋈', 'rose', { icon: 'merge', sub: '≈1M rows' });
    box(390, 300, 'C', 'blue', { sub: '200' });
    box(130, 430, 'A', 'blue', { sub: '1M' });
    box(290, 430, 'B', 'blue', { sub: '50k' });
    link(300, 150, 210, 300); link(300, 150, 390, 300);
    link(210, 300, 130, 430); link(210, 300, 290, 430);
    // right tree: (B⋈C) first — tiny intermediate (preferred)
    badges.push(pill(760, 96, 'order: A⋈(B⋈C) ✓', { icon: 'check', cls: 'pill--sst' }));
    box(760, 150, '⋈ A', 'green', { icon: 'merge', sub: 'hash', halo: true });
    box(670, 300, 'A', 'blue', { sub: '1M' });
    box(850, 300, '⋈', 'green', { icon: 'merge', sub: '≈400 rows' });
    box(770, 430, 'B', 'blue', { sub: '50k' });
    box(930, 430, 'C', 'blue', { sub: '200' });
    link(760, 150, 670, 300); link(760, 150, 850, 300);
    link(850, 300, 770, 430); link(850, 300, 930, 430);
    cap(VW / 2, 512, 'push the most selective join first to keep intermediate rows small; pick loop / hash / merge per input');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PICK: two fully-costed candidate plans, cheapest chosen ────────────── */
  if (view === 'pick') {
    // candidate 1 (expensive)
    badges.push(region(120, 120, 380, 320, '', { r: 20 }));
    badges.push(pill(310, 148, 'plan #1', { icon: 'scroll', cls: 'pill--sst' }));
    box(310, 210, '⋈', 'slate', { icon: 'merge', sub: 'nested loop' });
    box(220, 350, 'Seq A', 'amber', { icon: 'scroll', sub: '1M' });
    box(400, 350, '⋈ BC', 'slate', { icon: 'merge' });
    link(310, 210, 220, 350); link(310, 210, 400, 350);
    badges.push(pill(310, 416, 'cost 48,200', { icon: 'gauge', cls: 'pill--sst' }));
    // candidate 2 (cheap, chosen)
    badges.push(region(540, 120, 380, 320, '', { r: 20 }));
    badges.push(pill(730, 148, 'plan #2 ✓ chosen', { icon: 'check', cls: 'pill--sst' }));
    box(730, 210, '⋈', 'green', { icon: 'merge', sub: 'hash', halo: true });
    box(640, 350, 'Index A', 'green', { icon: 'search', sub: '20k' });
    box(820, 350, '⋈ BC', 'green', { icon: 'merge', sub: '400' });
    link(730, 210, 640, 350); link(730, 210, 820, 350);
    badges.push(pill(730, 416, 'cost 1,900', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 512, 'every candidate gets a cost from the model; the optimizer keeps the cheapest — bad stats → bad estimate → bad plan');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP ──────────────────────────────────────────────────────────────── */
  box(VW / 2, 180, 'EXPLAIN', 'green', { icon: 'search', rx: 58, h: 40, halo: true, sub: 'the winner' });
  badges.push(region(150, 286, 740, 210, 'cost-based optimization', { r: 24 }));
  const steps = ['enumerate equivalent plans', 'estimate rows from stats', 'cost each via the model', 'keep the cheapest plan'];
  steps.forEach((t, i) => badges.push(pill(VW / 2, 330 + i * 42, (i + 1) + '. ' + t, { icon: 'check', w: 340 })));
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
  <svg class="scene scene--query-optimizer-lab" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Query optimizer lab">
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
