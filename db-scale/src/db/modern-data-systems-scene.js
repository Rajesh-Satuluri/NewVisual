/* modern-data-systems-scene.js — the "Modern Data Systems" capstone scene, in
   the shared Designed-to-Scale isometric vocabulary: rounded iso cubes with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'tangle' (one app dual-writing to five stores), 'layers' (ingest →
   log → process → serve), 'backbone' (CDC → log → consumers at offsets),
   'process' (batch vs stream off one log), 'cost' (each engine a new box/lag),
   'recap' (source of truth → log → derived stores). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderModernDataSystemsScene(snap, opts = {}) {
  const view = snap.view || 'layers';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a cube; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'server', label, sub: o.sub || '', iconSize: 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  // a small flat tile (used for log segments)
  const tile = (x, y, mat, o = {}) => {
    const c = isoTile(x, y, o.rx || 26, mat, { label: o.label || '', sub: o.sub || '', ghost: !!o.ghost });
    shadows.push(c.shadow); solids.push(c.g);
    return c;
  };
  const arrow = (x1, y1, x2, y2, o = {}) => {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - (o.lift || 0);
    const e = edge([V(x1, y1), V(mx, my), V(x2, y2)], { arrow: true, dashed: !!o.dashed, r: o.r || 6 });
    guides.push(e.guide);
    return e;
  };

  /* ── TANGLE: one app dual-writing to five stores, no source of truth ────── */
  if (view === 'tangle') {
    const appx = VW / 2, appy = 130;
    node(appx, appy, 'app', 'amber', { icon: 'app', rx: 44, h: 40, sub: 'dual-writes' });
    const stores = [
      { x: 150, l: 'OLTP', ic: 'database', m: 'blue' },
      { x: 360, l: 'cache', ic: 'bolt', m: 'rose' },
      { x: 560, l: 'search', ic: 'search', m: 'lilac' },
      { x: 760, l: 'OLAP', ic: 'grid', m: 'green' },
      { x: 930, l: 'index', ic: 'layers', m: 'slate' },
    ];
    const sy = 330;
    stores.forEach(s => {
      node(s.x, sy, s.l, s.m, { icon: s.ic, sub: 'written directly' });
      arrow(appx, appy + 28, s.x, sy - 30, { lift: 18 });
    });
    badges.push(pill(appx, appy - 74, 'who holds the truth?', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(110, 398, 830, 86, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="436" text-anchor="middle">FIVE COPIES · ANY FAILED WRITE DRIFTS THEM APART</text>`);
    cap(VW / 2, 470, 'ad-hoc dual-writes from app code have no single source of truth');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LAYERS: ingest → log → process → serve, flowing left to right ──────── */
  if (view === 'layers') {
    const cols = [
      { x: 140, y: 250, l: 'OLTP', ic: 'database', m: 'blue', sub: 'ingest', cap: 'INGEST' },
      { x: 390, y: 250, l: 'log', ic: 'listOrdered', m: 'amber', sub: 'backbone', cap: 'TRANSPORT' },
      { x: 640, y: 250, l: 'jobs', ic: 'sliders', m: 'lilac', sub: 'batch + stream', cap: 'PROCESS' },
      { x: 900, y: 250, l: 'serve', ic: 'grid', m: 'green', sub: 'derived stores', cap: 'SERVE' },
    ];
    cols.forEach((c, i) => {
      node(c.x, c.y, c.l, c.m, { icon: c.ic, sub: c.sub, rx: 48, h: 44, halo: i === 1 });
      badges.push(pill(c.x, 150, c.cap, { icon: 'check', cls: 'pill--sst' }));
      if (i > 0) arrow(cols[i - 1].x + 30, c.y, c.x - 30, c.y, { lift: 10 });
    });
    // a couple of derived serving stores fanning off the serve column
    node(900, 400, 'OLAP', 'green', { icon: 'grid', rx: 34, h: 30, sub: '' });
    node(770, 400, 'cache', 'rose', { icon: 'bolt', rx: 34, h: 30, sub: '' });
    node(1010 - 70, 400, 'search', 'lilac', { icon: 'search', rx: 34, h: 30, sub: '' });
    badges.push(pill(VW / 2, 478, 'data flows one way: write once, derive the rest', { icon: 'check' }));
    cap(VW / 2, 516, 'each layer does one job well; nothing writes backwards');
    railOut = arrow(cols[0].x + 30, 250, cols[3].x - 30, 250, { lift: 10 }).d;
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── BACKBONE: CDC → ordered log → consumers at independent offsets ─────── */
  if (view === 'backbone') {
    // source on the left
    node(140, 250, 'OLTP', 'blue', { icon: 'database', sub: 'source of truth' });
    badges.push(pill(140, 158, 'CDC feed', { icon: 'merge', cls: 'pill--sst' }));
    // the log: a row of ordered tiles across the middle
    const lx0 = 300, lgap = 56, ly = 250;
    const logX = [];
    for (let i = 0; i < 7; i++) { const x = lx0 + i * lgap; logX.push(x); tile(x, ly, i === 6 ? 'amber' : 'slate', { label: '' }); }
    badges.push(pill((lx0 + logX[6]) / 2, 168, 'durable ordered log', { icon: 'listOrdered', cls: 'pill--sst' }));
    arrow(176, ly, lx0 - 18, ly, { lift: 8 });
    // three consumers reading at their own offsets
    const cons = [
      { x: 740, y: 150, l: 'OLAP', ic: 'grid', m: 'green', off: 2, sub: 'offset 5' },
      { x: 900, y: 250, l: 'search', ic: 'search', m: 'lilac', off: 4, sub: 'offset 3' },
      { x: 740, y: 352, l: 'cache', ic: 'bolt', m: 'rose', off: 5, sub: 'offset 2' },
    ];
    cons.forEach(c => {
      node(c.x, c.y, c.l, c.m, { icon: c.ic, sub: c.sub, rx: 38, h: 34 });
      arrow(logX[c.off], ly, c.x - 24, c.y, { lift: 12, dashed: true });
    });
    badges.push(pill(VW / 2, 470, 'new store? replay the log into it — no app changes', { icon: 'check' }));
    cap(VW / 2, 508, 'producers and consumers are decoupled by the log');
    railOut = arrow(176, ly, lx0 - 18, ly, { lift: 8 }).d;
    flows.push({ id: 'out', kind: 'write', speed: 160, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PROCESS: one log feeds a batch job and a stream job ────────────────── */
  if (view === 'process') {
    // the log in the middle-left
    const lx0 = 150, lgap = 54, ly = 270;
    const logX = [];
    for (let i = 0; i < 6; i++) { const x = lx0 + i * lgap; logX.push(x); tile(x, ly, 'slate', {}); }
    badges.push(pill((lx0 + logX[5]) / 2, 190, 'one source log', { icon: 'listOrdered', cls: 'pill--sst' }));
    // batch job (big, high throughput) upper right
    node(760, 150, 'batch', 'green', { icon: 'grid', rx: 54, h: 48, sub: 'bounded · recompute' });
    badges.push(pill(760, 70, 'high throughput · exact', { icon: 'check', cls: 'pill--sst' }));
    arrow(logX[5], ly, 760 - 36, 180, { lift: 20 });
    // stream job (low latency) lower right
    node(760, 392, 'stream', 'amber', { icon: 'bolt', rx: 48, h: 42, sub: 'continuous · live' });
    badges.push(pill(760, 468, 'low latency · fresh', { icon: 'check', cls: 'pill--sst' }));
    arrow(logX[5], ly, 760 - 32, 366, { lift: 20, dashed: true });
    // both agree
    node(960, 270, 'metric', 'lilac', { icon: 'target', rx: 34, h: 30, sub: 'agrees' });
    arrow(760 + 40, 172, 960 - 24, 256, { lift: 10 });
    arrow(760 + 36, 372, 960 - 24, 288, { lift: 10 });
    cap(VW / 2, 516, 'batch and stream derive from the same log — their answers match');
    railOut = arrow(logX[5], ly, 760 - 36, 180, { lift: 20 }).d;
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── COST: each added engine is power + a new box + a new place to lag ──── */
  if (view === 'cost') {
    node(150, 250, 'source', 'blue', { icon: 'database', sub: 'truth', halo: true });
    const lx = 330, ly = 250;
    tile(lx, ly, 'amber', { label: 'log' });
    arrow(186, ly, lx - 20, ly, { lift: 8 });
    const derived = [
      { x: 560, y: 150, l: 'OLAP', ic: 'grid', m: 'green', lag: 'lag 200ms' },
      { x: 760, y: 150, l: 'search', ic: 'search', m: 'lilac', lag: 'lag 400ms' },
      { x: 560, y: 352, l: 'cache', ic: 'bolt', m: 'rose', lag: 'lag 80ms' },
      { x: 760, y: 352, l: 'view', ic: 'layers', m: 'slate', lag: 'lag 150ms' },
      { x: 940, y: 250, l: 'ML', ic: 'sliders', m: 'green', lag: 'lag 1s' },
    ];
    derived.forEach(d => {
      node(d.x, d.y, d.l, d.m, { icon: d.ic, sub: 'derived', rx: 38, h: 34 });
      arrow(lx + 18, ly, d.x - 24, d.y, { lift: 12, dashed: true });
      badges.push(pill(d.x, d.y - 58, d.lag, { icon: 'clock', cls: 'pill--sst' }));
    });
    badges.push(region(470, 428, 420, 72, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${680}" y="462" text-anchor="middle">EACH BOX: MORE POWER · MORE OPS · MORE LAG</text>`);
    cap(VW / 2, 522, 'derived stores are eventually consistent — add an engine only when needed');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: source of truth → log backbone → many derived stores ────────── */
  node(140, 250, 'source', 'blue', { icon: 'database', sub: 'one truth', halo: true });
  const rlx = 340, rly = 250;
  for (let i = 0; i < 4; i++) tile(rlx + i * 50, rly, i === 3 ? 'amber' : 'slate', {});
  badges.push(pill(rlx + 75, 168, 'replayable log backbone', { icon: 'listOrdered', cls: 'pill--sst' }));
  arrow(176, rly, rlx - 18, rly, { lift: 8 });
  const serve = [
    { x: 720, y: 150, l: 'OLAP', ic: 'grid', m: 'green' },
    { x: 900, y: 150, l: 'search', ic: 'search', m: 'lilac' },
    { x: 720, y: 352, l: 'cache', ic: 'bolt', m: 'rose' },
    { x: 900, y: 352, l: 'views', ic: 'layers', m: 'slate' },
  ];
  badges.push(region(650, 96, 320, 390, '', { r: 22 }));
  badges.push(`<text class="iso-region__t" x="${810}" y="124" text-anchor="middle">DERIVED SERVING STORES</text>`);
  serve.forEach(s => {
    node(s.x, s.y, s.l, s.m, { icon: s.ic, sub: '', rx: 38, h: 34 });
    arrow(rlx + 150, rly, s.x - 24, s.y, { lift: 14, dashed: true });
  });
  cap(VW / 2, 524, 'compose specialized engines around one source of truth');
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
  <svg class="scene scene--modern-data-systems" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Modern data systems architecture">
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
