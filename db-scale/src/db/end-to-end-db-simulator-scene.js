/* end-to-end-db-simulator-scene.js — the capstone "End-to-End DB Simulator"
   scene, in the shared Designed-to-Scale isometric vocabulary: rounded iso
   cubes for each module of the stack, pill badges, routed connectors with
   arrows, a faded iso grid, and particle rails for the request travelling
   through the system.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, flows, note }.

   Views: 'submit' (client → pooled connection → server), 'parseplan' (SQL →
   AST → logical plan → optimizer → physical plan), 'execute' (executor asks the
   buffer pool; miss falls to disk), 'writewal' (WAL record first, then dirty
   page), 'commit' (fsync WAL → durable), 'replicate' (log shipped to replicas,
   rows back to client), 'recap' (the full pipeline, labelled). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderEndToEndDbSimulatorScene(snap, opts = {}) {
  const view = snap.view || 'submit';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a module cube; caller keeps the coords
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 56, o.h || 40, mat, {
      icon: o.icon || 'server', label, sub: o.sub || '', iconSize: o.iconSize || 17,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  // a small flat tile (pages, op tiles)
  const tile = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 34, o.h || 20, mat, {
      icon: o.icon || '', label, iconSize: 13, ghost: !!o.ghost, halo: !!o.halo,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── SUBMIT: client → pooled connection → server ───────────────────────── */
  if (view === 'submit') {
    node(170, 250, 'client', 'blue', { icon: 'app', sub: 'app', rx: 58, h: 42 });
    node(430, 250, 'conn pool', 'amber', { icon: 'merge', sub: 'reuse', rx: 58, h: 42 });
    node(700, 250, 'backend', 'green', { icon: 'server', sub: 'idle → busy', rx: 60, h: 44 });
    node(930, 250, 'the stack', 'slate', { icon: 'layers', sub: 'below', rx: 54, h: 40, ghost: true });
    const e1 = edge([V(228, 250), V(372, 250)], { arrow: true });
    const e2 = edge([V(488, 250), V(640, 250)], { arrow: true });
    const e3 = edge([V(760, 250), V(876, 250)], { arrow: true, dashed: true });
    guides.push(e1.guide, e2.guide, e3.guide);
    railOut = edge([V(228, 250), V(760, 250)], {}).d;
    badges.push(pill(430, 170, 'one statement over a reused connection', { icon: 'scroll', cls: 'pill--sst', w: 420 }));
    const eq = edge([V(430, 186), V(430, 222)], { arrow: true, dashed: true });
    guides.push(eq.guide);
    badges.push(region(150, 320, 740, 86, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="368" text-anchor="middle">ONE ROUND TRIP FOR THE APP · A FULL TOUR INSIDE</text>`);
    cap(VW / 2, 460, 'the pool hands the request to an idle backend — no new handshake');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PARSEPLAN: SQL → AST → logical → optimizer → physical ──────────────── */
  if (view === 'parseplan') {
    const steps = [
      { x: 160, label: 'SQL', mat: 'blue', icon: 'scroll', sub: 'text' },
      { x: 365, label: 'AST', mat: 'amber', icon: 'check', sub: 'validated' },
      { x: 570, label: 'logical', mat: 'green', icon: 'layers', sub: 'what' },
      { x: 775, label: 'optimize', mat: 'rose', icon: 'gauge', sub: 'price it' },
      { x: 940, label: 'physical', mat: 'lilac', icon: 'target', sub: 'chosen' },
    ];
    steps.forEach((s, i) => {
      node(s.x, 260, s.label, s.mat, { icon: s.icon, sub: s.sub, rx: 54, h: 38, halo: i === 4 });
      if (i < steps.length - 1) {
        const e = edge([V(s.x + 58, 260), V(steps[i + 1].x - 58, 260)], { arrow: true });
        guides.push(e.guide);
      }
    });
    badges.push(pill(570, 160, 'statistics price index vs scan, hash vs nested-loop', { icon: 'search', cls: 'pill--sst', w: 460 }));
    const e = edge([V(775, 178), V(775, 218)], { arrow: true, dashed: true });
    guides.push(e.guide);
    badges.push(region(150, 338, 740, 82, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="384" text-anchor="middle">COMPILED FROM STATISTICS · STILL NO DISK I/O</text>`);
    cap(VW / 2, 470, 'the optimizer keeps the cheapest physical plan before any read');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── EXECUTE: executor asks the buffer pool; miss falls to disk ─────────── */
  if (view === 'execute') {
    node(210, 190, 'executor', 'green', { icon: 'bolt', sub: 'pull rows', rx: 58, h: 42 });
    node(520, 190, 'buffer pool', 'blue', { icon: 'database', sub: 'pages in RAM', rx: 64, h: 46 });
    node(830, 400, 'disk', 'slate', { icon: 'database', sub: 'heap pages', rx: 60, h: 44 });
    // cached page tiles inside the pool
    tile(470, 300, 'hit', 'green', { icon: 'check', rx: 36, h: 20, halo: true });
    tile(560, 300, 'hit', 'green', { icon: 'check', rx: 36, h: 20 });
    // executor → pool (ask for page)
    const eAsk = edge([V(268, 190), V(456, 190)], { arrow: true });
    guides.push(eAsk.guide); railOut = eAsk.d;
    // pool → disk (miss)
    const eMiss = edge([V(560, 224), V(700, 320), V(770, 372)], { arrow: true, dashed: true });
    guides.push(eMiss.guide);
    // disk → pool (page back)
    const eBack = edge([V(810, 358), V(660, 270), V(574, 232)], { arrow: true });
    guides.push(eBack.guide);
    badges.push(pill(520, 112, 'hit → RAM-speed · miss → one disk read, then cached', { icon: 'gauge', cls: 'pill--sst', w: 480 }));
    badges.push(pill(690, 350, 'page fault', { icon: 'alert', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'the executor never touches disk directly — it asks the buffer pool');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── WRITEWAL: WAL record appended first, then the page is dirtied ──────── */
  if (view === 'writewal') {
    node(210, 240, 'backend', 'green', { icon: 'server', sub: 'UPDATE', rx: 58, h: 42 });
    node(560, 150, 'WAL', 'amber', { icon: 'wal', sub: 'append log', rx: 62, h: 44, halo: true });
    node(560, 400, 'buffer pool', 'blue', { icon: 'database', sub: 'page → dirty', rx: 62, h: 44 });
    node(880, 400, 'disk', 'slate', { icon: 'database', sub: 'not yet', rx: 52, h: 38, ghost: true });
    // 1) log first
    const e1 = edge([V(262, 222), V(420, 170), V(500, 158)], { arrow: true });
    guides.push(e1.guide); railOut = e1.d;
    // 2) then dirty the page
    const e2 = edge([V(262, 262), V(420, 330), V(502, 382)], { arrow: true });
    guides.push(e2.guide);
    // page NOT flushed (dashed, blocked)
    const e3 = edge([V(622, 400), V(828, 400)], { arrow: true, dashed: true });
    guides.push(e3.guide);
    badges.push(pill(430, 110, '① log before data', { icon: 'listOrdered', cls: 'pill--sst' }));
    badges.push(pill(430, 470, '② modify page, mark dirty', { icon: 'key', cls: 'pill--sst' }));
    badges.push(pill(760, 440, 'flush is lazy', { icon: 'clock', cls: 'pill--sst' }));
    cap(VW / 2, 508, 'write-ahead logging: the log is the source of truth, the page lags');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── COMMIT: fsync forces the WAL to stable storage ────────────────────── */
  if (view === 'commit') {
    node(230, 220, 'backend', 'green', { icon: 'server', sub: 'COMMIT', rx: 58, h: 42 });
    node(540, 220, 'WAL buffer', 'amber', { icon: 'wal', sub: '+ commit rec', rx: 62, h: 44 });
    node(850, 220, 'log on disk', 'lilac', { icon: 'database', sub: 'durable', rx: 60, h: 44, halo: true });
    const e1 = edge([V(288, 220), V(478, 220)], { arrow: true });
    const e2 = edge([V(602, 220), V(790, 220)], { arrow: true });
    guides.push(e1.guide, e2.guide); railOut = e2.d;
    badges.push(pill(695, 150, 'fsync() — the one disk write on the hot path', { icon: 'flush', cls: 'pill--sst', w: 440 }));
    const eq = edge([V(695, 166), V(695, 196)], { arrow: true, dashed: true });
    guides.push(eq.guide);
    badges.push(region(150, 300, 740, 90, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="350" text-anchor="middle">DURABLE ONCE THE LOG IS fsync’d · DIRTY PAGE CAN WAIT</text>`);
    cap(VW / 2, 450, 'group commit batches many transactions into a single fsync');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── REPLICATE: committed log shipped to replicas, rows back to client ──── */
  if (view === 'replicate') {
    node(230, 250, 'leader', 'green', { icon: 'server', sub: 'WAL stream', rx: 58, h: 42 });
    node(640, 150, 'replica A', 'blue', { icon: 'server', sub: 'replay log', rx: 52, h: 38 });
    node(640, 360, 'replica B', 'blue', { icon: 'server', sub: 'replay log', rx: 52, h: 38 });
    node(880, 250, 'client', 'lilac', { icon: 'app', sub: 'rows', rx: 52, h: 40, halo: true });
    const eA = edge([V(284, 232), V(470, 170), V(588, 158)], { arrow: true });
    const eB = edge([V(284, 268), V(470, 340), V(588, 352)], { arrow: true });
    guides.push(eA.guide, eB.guide); railOut = eA.d;
    // result rows back to client
    const eC = edge([V(288, 250), V(828, 250)], { arrow: true, cls: 'is-dashed' });
    guides.push(eC.guide);
    badges.push(pill(VW / 2, 250, 'rows ↑ to client', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(500, 100, 'sync waits for an ack · async does not', { icon: 'sliders', cls: 'pill--sst', w: 400 }));
    cap(VW / 2, 500, 'replication ships the log, not the pages — replicas replay the WAL');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the full horizontal pipeline ───────────────────────────────── */
  const pipe = [
    { label: 'client', mat: 'blue', icon: 'app' },
    { label: 'parse', mat: 'amber', icon: 'merge' },
    { label: 'plan', mat: 'green', icon: 'layers' },
    { label: 'execute', mat: 'rose', icon: 'bolt' },
    { label: 'buffer', mat: 'blue', icon: 'database' },
    { label: 'WAL', mat: 'amber', icon: 'wal' },
    { label: 'commit', mat: 'green', icon: 'check' },
    { label: 'replica', mat: 'lilac', icon: 'server', halo: true },
  ];
  const px = [150, 262, 374, 486, 598, 710, 822, 934];
  pipe.forEach((s, i) => {
    const c = isoCube(px[i], 258, 48, 30, s.mat, { icon: s.icon, label: s.label, iconSize: 15, halo: !!s.halo });
    shadows.push(c.shadow); if (s.halo) halos.push(c.halo); solids.push(c.g);
    if (i < pipe.length - 1) {
      const e = edge([V(px[i] + 50, 258), V(px[i + 1] - 50, 258)], { arrow: true });
      guides.push(e.guide);
    }
  });
  railOut = edge([V(px[0] + 50, 258), V(px[7] - 50, 258)], {}).d;
  flows.push({ id: 'out', kind: 'read', speed: 180, size: 5 });
  badges.push(region(150, 188, 740, 148, 'one request · the whole machine', { r: 24 }));
  badges.push(pill(VW / 2, 388, 'query processing on storage, made durable by the WAL, shipped by replication', { icon: 'layers', cls: 'pill--sst', w: 640 }));
  cap(VW / 2, 448, 'the modules are not separate topics — they are one system');
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
  <svg class="scene scene--end-to-end-db-simulator" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="End-to-end database request simulator">
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
