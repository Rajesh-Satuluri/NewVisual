/* materialized-views-scene.js — the "Materialized Views" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'slowquery' (every read re-runs the join+aggregate), 'materialize'
   (compute once, store the result), 'fastread' (reads hit the stored result),
   'refresh' (keep fresh: full vs incremental), 'tradeoff' (read cost down,
   write/storage cost up), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderMaterializedViewsScene(snap, opts = {}) {
  const view = snap.view || 'materialize';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a node; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'database', label, sub: o.sub || '', iconSize: o.iconSize || 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  // a flat tile (a stored row / base shard); caller keeps coords
  const tile = (x, y, rx, mat, o = {}) => {
    const c = isoTile(x, y, rx, mat, { h: o.h, ghost: !!o.ghost, halo: !!o.halo });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // a "big base tables" stack of three staggered tiles at (x,y)
  const baseStack = (x, y, mat, ghost) => {
    tile(x, y + 22, 66, mat, { h: 16, ghost });
    tile(x, y + 2, 66, mat, { h: 16, ghost });
    tile(x, y - 18, 66, mat, { h: 16, ghost });
  };

  /* ── SLOWQUERY: every read drags the full join+aggregate ───────────────── */
  if (view === 'slowquery') {
    const readerX = 170, baseX = 760, baseY = 268;
    node(readerX, 268, 'reader', 'blue', { icon: 'app', sub: 'dashboard' });
    baseStack(baseX, baseY, 'slate', false);
    badges.push(pill(baseX, baseY - 86, 'orders ⋈ customers · millions of rows', { icon: 'database', cls: 'pill--sst' }));
    // a heavy query arrow that has to reach all the way across to the base tables
    const e = edge([V(readerX + 48, 262), V((readerX + baseX) / 2, 236), V(baseX - 92, baseY)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill((readerX + baseX) / 2, 196, 'JOIN + GROUP BY — on every read', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(region(118, 392, 804, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="430" text-anchor="middle">A PLAIN VIEW IS JUST A SAVED QUERY · THE COST REPEATS</text>`);
    cap(VW / 2, 462, 'seconds of CPU and I/O for a number that barely changes');
    flows.push({ id: 'out', kind: 'read', speed: 120, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── MATERIALIZE: run the query once, store the result ─────────────────── */
  if (view === 'materialize') {
    const baseX = 240, baseY = 268, viewX = 820;
    baseStack(baseX, baseY, 'slate', false);
    badges.push(pill(baseX, baseY - 86, 'base tables', { icon: 'database', cls: 'pill--sst' }));
    // the engine evaluates once, writing out a compact result
    node(VW / 2, 150, 'evaluate once', 'amber', { icon: 'bolt', rx: 52, h: 40, iconSize: 20 });
    const e1 = edge([V(baseX + 70, baseY - 8), V((baseX + VW / 2) / 2, 180), V(VW / 2 - 56, 176)], { arrow: true });
    guides.push(e1.guide); railIn = e1.d;
    const e2 = edge([V(VW / 2 + 56, 176), V((VW / 2 + viewX) / 2, 196), V(viewX - 60, 252)], { arrow: true });
    guides.push(e2.guide); railOut = e2.d;
    // the stored materialized result — one compact cube
    node(viewX, 266, 'mat. view', 'green', { icon: 'layers', halo: true, sub: 'stored result' });
    badges.push(pill(viewX, 352, 'precomputed · on disk', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 470, 'the heavy join + aggregate runs a single time, not per request');
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 6 });
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── FASTREAD: many readers hit the small stored result ────────────────── */
  if (view === 'fastread') {
    const viewX = VW / 2, viewY = 150;
    node(viewX, viewY, 'mat. view', 'green', { icon: 'layers', rx: 52, h: 40, halo: true, sub: 'stored result' });
    // base tables sit idle, off to the side and ghosted
    baseStack(210, 300, 'slate', true);
    badges.push(pill(210, 214, 'base tables · untouched', { icon: 'moon', cls: 'pill--sst' }));
    // three readers fan up into the view
    const RX = [560, 720, 880], ry = 360;
    RX.forEach((x, i) => {
      node(x, ry, 'reader', 'blue', { icon: 'app', rx: 40, h: 36, iconSize: 16 });
      const e = edge([V(x, ry - 34), V((x + viewX) / 2, 250), V(viewX + (i - 1) * 30, viewY + 54)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    badges.push(pill(viewX + 150, viewY, '~8 ms reads', { icon: 'clock', cls: 'pill--sst' }));
    cap(VW / 2, 470, 'reads scan a compact stored result — durable and queryable, like a cache that lasts');
    flows.push({ id: 'out', kind: 'read', speed: 170, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── REFRESH: keep it fresh — full rebuild vs incremental events ───────── */
  if (view === 'refresh') {
    const baseX = 220, baseY = 286, viewX = 820, viewY = 286;
    baseStack(baseX, baseY, 'slate', false);
    badges.push(pill(baseX, baseY - 92, 'source changes', { icon: 'database', cls: 'pill--sst' }));
    node(viewX, viewY, 'mat. view', 'green', { icon: 'layers', halo: true, sub: 'updated in place' });

    // top rail: full refresh (dashed, periodic)
    const f = edge([V(baseX + 70, baseY - 30), V(VW / 2, 150), V(viewX - 60, viewY - 30)], { arrow: true, dashed: true });
    guides.push(f.guide);
    badges.push(pill(VW / 2, 138, 'FULL REFRESH · recompute on a schedule', { icon: 'clock', cls: 'pill--sst' }));

    // bottom rail: incremental, per-change events
    const inc = edge([V(baseX + 70, baseY + 20), V(VW / 2, 392), V(viewX - 60, viewY + 20)], { arrow: true });
    guides.push(inc.guide); railOut = inc.d;
    badges.push(pill(VW / 2, 404, 'INCREMENTAL · apply each change event', { icon: 'merge', cls: 'pill--sst' }));
    cap(VW / 2, 470, 'full refresh is simple but stale between runs; incremental stays fresh per event');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── TRADEOFF: read cost down, storage + write cost up ─────────────────── */
  if (view === 'tradeoff') {
    // left column: READ — cheap now
    const lX = 320;
    node(lX, 240, 'fast reads', 'green', { icon: 'check', rx: 50, h: 40, halo: true, sub: 'ms, precomputed' });
    badges.push(pill(lX, 150, 'READ COST ↓', { icon: 'check', cls: 'pill--sst' }));
    badges.push(region(150, 196, 340, 220, '', { r: 22 }));
    // right column: WRITE + STORAGE — the price
    const rX = 740;
    node(rX, 206, 'write work', 'amber', { icon: 'bolt', rx: 44, h: 38, sub: 'maintain on change' });
    node(rX, 346, 'storage', 'lilac', { icon: 'layers', rx: 44, h: 38, sub: 'extra copy' });
    badges.push(pill(rX, 132, 'WRITE + SPACE COST ↑', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(560, 170, 360, 266, '', { r: 22 }));
    badges.push(pill(VW / 2, 470, 'staleness window unless maintained incrementally', { icon: 'clock', cls: 'pill--sst' }));
    cap(VW / 2, 506, 'materialize the read-heavy, slowly-changing results — not write-churned data');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: compute once, read many ────────────────────────────────────── */
  const baseX = 230, baseY = 286, viewX = 560, readX = 880;
  baseStack(baseX, baseY, 'slate', false);
  badges.push(pill(baseX, baseY - 92, 'source', { icon: 'database', cls: 'pill--sst' }));
  node(viewX, 280, 'mat. view', 'green', { icon: 'layers', halo: true, sub: 'derived result' });
  node(readX, 280, 'reader', 'blue', { icon: 'app', sub: 'instant' });
  const a = edge([V(baseX + 70, baseY), V((baseX + viewX) / 2, 250), V(viewX - 56, 278)], { arrow: true });
  guides.push(a.guide); railIn = a.d;
  const b = edge([V(viewX + 56, 278), V((viewX + readX) / 2, 252), V(readX - 50, 278)], { arrow: true });
  guides.push(b.guide); railOut = b.d;
  badges.push(region(140, 380, 760, 150, 'compute once · read many · maintained from change', { r: 24 }));
  const tags = ['precompute + store', 'reads hit the result', 'refresh sets freshness'];
  tags.forEach((t, i) => badges.push(pill(300 + i * 240, 430, t, { icon: 'check', w: 210 })));
  flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
  flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
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
  <svg class="scene scene--materialized-views" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Materialized views">
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
