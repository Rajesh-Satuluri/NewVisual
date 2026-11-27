/* oltp-cdc-kafka-stream-olap-scene.js — the capstone "OLTP → CDC → Kafka →
   Stream → OLAP" scene, in the shared Designed-to-Scale isometric vocabulary:
   rounded iso cubes with icon glyphs and labels, soft ground shadows, halos,
   pill badges, dashed logical regions, routed connectors with arrows, a faded
   iso grid and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'problem' (source vs dashboard, no direct query), 'pipeline' (all five
   stages), 'cdc' (WAL tail → event), 'process' (Kafka log + windowed stream),
   'olap' (warehouse serves the dashboard), 'recap' (one log, many views). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const ROWY = 296;

/* the five pipeline stages, left → right, with their own x coordinates */
const STAGES = [
  { key: 'oltp',   x: 140, label: 'OLTP',   sub: 'commit',  mat: 'blue',  icon: 'database' },
  { key: 'cdc',    x: 350, label: 'CDC',    sub: 'capture',  mat: 'amber', icon: 'wal' },
  { key: 'kafka',  x: 560, label: 'Kafka',  sub: 'log',      mat: 'green', icon: 'listOrdered' },
  { key: 'stream', x: 770, label: 'stream', sub: 'window',   mat: 'lilac', icon: 'merge' },
  { key: 'olap',   x: 960, label: 'OLAP',   sub: 'serve',    mat: 'slate', icon: 'grid' },
];

export function renderOltpCdcKafkaStreamOlapScene(snap, opts = {}) {
  const view = snap.view || 'pipeline';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a cube; caller keeps the coords, we never read them back off the cube
  const cube = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 44, o.h || 40, mat, {
      icon: o.icon, label, sub: o.sub || '', iconSize: 17,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // draw the whole stage row; `focus` is a stage key to highlight (others fade)
  const drawStages = (focus) => {
    STAGES.forEach(s => {
      const on = !focus || s.key === focus;
      cube(s.x, ROWY, s.label, s.mat, {
        icon: s.icon, sub: s.sub, halo: focus === s.key, ghost: focus && !on,
      });
    });
  };

  // connect consecutive stages with routed arrows along the band
  const connectStages = (fromIdx, toIdx, asRail) => {
    for (let i = fromIdx; i < toIdx; i++) {
      const a = STAGES[i].x, b = STAGES[i + 1].x;
      const e = edge([V(a + 40, ROWY), V((a + b) / 2, ROWY - 4), V(b - 40, ROWY)], { arrow: true });
      guides.push(e.guide);
      if (asRail && i === fromIdx) railOut = e.d;
    }
  };

  /* ── PROBLEM: source db vs dashboard, direct analytics forbidden ───────── */
  if (view === 'problem') {
    const sx = 250, dx = 800, ny = 290;
    cube(sx, ny, 'OLTP', 'blue', { icon: 'database', sub: 'orders' });
    cube(dx, ny, 'dashboard', 'rose', { icon: 'gauge', sub: 'revenue/min' });
    badges.push(pill(sx, ny - 92, 'order row committed', { icon: 'check', cls: 'pill--sst' }));
    // the tempting-but-forbidden heavy query arrow
    const e = edge([V(dx - 44, ny - 6), V(VW / 2, ny - 44), V(sx + 44, ny - 6)], { arrow: true, dashed: true });
    guides.push(e.guide);
    badges.push(pill(VW / 2, ny - 58, 'heavy GROUP BY scans', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(150, 398, 740, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="436" text-anchor="middle">ANALYTICS ON OLTP · LOCKS · CACHE THRASH · SLOW CHECKOUT</text>`);
    cap(VW / 2, 470, 'the dashboard must never query the transactional database directly');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PIPELINE: all five stages wired, order event at the source ────────── */
  if (view === 'pipeline') {
    drawStages(null);
    connectStages(0, 4, true);
    STAGES.forEach(s => badges.push(pill(s.x, ROWY + 96, s.key, { cls: 'pill--sst' })));
    badges.push(pill(STAGES[0].x, ROWY - 94, 'order #8842', { icon: 'check', cls: 'pill--sst' }));
    badges.push(region(70, 180, 904, 40, 'OLTP → CDC → KAFKA → STREAM → OLAP', { r: 16 }));
    cap(VW / 2, 500, 'one committed change flows left to right — each stage does one job');
    flows.push({ id: 'out', kind: 'write', speed: 120, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── CDC: the commit hits the WAL; the connector tails it into an event ── */
  if (view === 'cdc') {
    const dbx = 230, walx = 520, cdcx = 820, ny = 290;
    cube(dbx, ny, 'OLTP', 'blue', { icon: 'database', sub: 'commit' });
    // the WAL as a short row of ordered log tiles
    const walY = ny + 2;
    const tileXs = [walx - 66, walx - 22, walx + 22, walx + 66];
    tileXs.forEach((tx, i) => {
      const t = isoTile(tx, walY, 20, i === tileXs.length - 1 ? 'amber' : 'slate', { halo: i === tileXs.length - 1 });
      shadows.push(t.shadow); if (i === tileXs.length - 1) halos.push(t.halo); solids.push(t.g);
    });
    cube(cdcx, ny, 'CDC', 'amber', { icon: 'wal', sub: 'connector', halo: true });
    badges.push(pill(dbx, ny - 92, 'INSERT orders', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(walx, ny - 86, 'write-ahead log · ordered', { icon: 'listOrdered', cls: 'pill--sst' }));
    badges.push(pill(cdcx, ny - 92, '{op:insert, after:{…}}', { icon: 'merge', cls: 'pill--sst' }));
    const e1 = edge([V(dbx + 44, ny), V((dbx + walx) / 2, ny - 4), V(walx - 92, walY)], { arrow: true });
    const e2 = edge([V(walx + 92, walY), V((walx + cdcx) / 2, ny - 4), V(cdcx - 44, ny)], { arrow: true });
    guides.push(e1.guide, e2.guide); railOut = e2.d;
    cap(VW / 2, 470, 'CDC tails the WAL the database already writes — commit order kept, zero query load');
    flows.push({ id: 'out', kind: 'write', speed: 140, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PROCESS: Kafka replayable log + a windowing stream operator ────────── */
  if (view === 'process') {
    const logY = 236;
    const logXs = [160, 212, 264, 316, 368, 420, 472];
    const headIdx = 5;
    logXs.forEach((lx, i) => {
      const t = isoTile(lx, logY, 24, i <= headIdx ? 'green' : 'slate',
        { ghost: i > headIdx, halo: i === headIdx });
      shadows.push(t.shadow); if (i === headIdx) halos.push(t.halo); solids.push(t.g);
    });
    badges.push(pill(300, logY - 70, 'Kafka topic · partitioned · replayable', { icon: 'listOrdered', cls: 'pill--sst' }));
    badges.push(pill(logXs[0] - 6, logY + 56, 'offset 0', { cls: 'pill--sst' }));
    badges.push(pill(logXs[headIdx], logY + 56, 'head', { icon: 'check', cls: 'pill--sst' }));
    // consumer reads at an offset and feeds the stream operator
    const opx = 720, opy = 356;
    cube(opx, opy, 'stream', 'lilac', { icon: 'merge', sub: 'enrich + window', halo: true });
    const e = edge([V(logXs[headIdx], logY + 28), V(logXs[headIdx] + 80, opy - 50), V(opx - 44, opy - 10)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    // the windowed aggregate it produces
    cube(930, opy, 'revenue', 'blue', { icon: 'gauge', sub: '/ minute' });
    const e2 = edge([V(opx + 44, opy), V((opx + 930) / 2, opy - 4), V(930 - 44, opy)], { arrow: true });
    guides.push(e2.guide);
    badges.push(pill(opx, opy + 92, 'event-time windows · late data', { icon: 'clock', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'consume from an offset, join + fold a flood of events into one live running total');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── OLAP: the aggregate lands in the warehouse, dashboard reads it ─────── */
  if (view === 'olap') {
    drawStages('olap');
    connectStages(0, 4, false);
    const dash = { x: 960, y: 452 };
    cube(dash.x, dash.y, 'dashboard', 'rose', { icon: 'gauge', sub: 'reads ms' });
    const e = edge([V(STAGES[4].x, ROWY + 40), V(dash.x, (ROWY + dash.y) / 2), V(dash.x, dash.y - 40)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(STAGES[4].x, ROWY - 94, 'columnar warehouse', { icon: 'grid', cls: 'pill--sst' }));
    badges.push(region(70, 400, 560, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="350" y="438" text-anchor="middle">ORDERED · REPLAYABLE · DECOUPLED · OLTP SAFE</text>`);
    cap(350, 470, 'each stage adds a little lag — the price of seconds-fresh, isolated analytics');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: one log in the middle, many derived views fan out ───────────── */
  const logx = 420, logy = 256;
  cube(180, logy, 'OLTP', 'blue', { icon: 'database', sub: 'source' });
  cube(logx, logy, 'log', 'green', { icon: 'listOrdered', sub: 'changes', halo: true });
  const e0 = edge([V(180 + 44, logy), V((180 + logx) / 2, logy - 4), V(logx - 44, logy)], { arrow: true });
  guides.push(e0.guide);
  const sinks = [
    { x: 740, y: 150, label: 'OLAP', icon: 'grid' },
    { x: 820, y: 256, label: 'search', icon: 'search' },
    { x: 740, y: 362, label: 'cache', icon: 'bolt' },
    { x: 940, y: 256, label: 'ML feats', icon: 'sliders' },
  ];
  sinks.forEach(s => {
    cube(s.x, s.y, s.label, 'slate', { icon: s.icon, h: 34, rx: 40 });
    const e = edge([V(logx + 44, logy), V((logx + s.x) / 2, (logy + s.y) / 2 - 6), V(s.x - 40, s.y)], { arrow: true });
    guides.push(e.guide);
  });
  badges.push(region(70, 440, 904, 120, 'an ordered, replayable log of changes · many fresh, independent views', { r: 22 }));
  cap(VW / 2, 540, 'OLTP → CDC → Kafka → stream → OLAP — the backbone of modern data systems');
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
  <svg class="scene scene--oltp-cdc-kafka-stream-olap" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="OLTP to OLAP streaming pipeline">
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
