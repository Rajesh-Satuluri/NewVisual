/* dataflow-architecture-scene.js — the "Dataflow Architecture" scene, in the
   shared Designed-to-Scale isometric vocabulary: rounded iso cubes with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'coupled' (services share one mutable DB), 'dataflow' (write → log →
   subscribers), 'unbundle' (DB split into log + operators + views),
   'operators' (one log feeds stateful operators, each a view), 'tradeoff'
   (synchronous coupling vs asynchronous dataflow), 'recap' (one log, many
   derived views). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderDataflowArchitectureScene(snap, opts = {}) {
  const view = snap.view || 'dataflow';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a cube; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 44, o.h || 40, mat, {
      icon: o.icon || 'server', label, sub: o.sub || '', iconSize: o.iconSize || 17,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  // a flat event tile
  const tile = (x, y, mat, o = {}) => {
    const c = isoTile(x, y, o.rx || 26, mat, { halo: !!o.halo, ghost: !!o.ghost });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── COUPLED: services all bound to one shared mutable DB ───────────────── */
  if (view === 'coupled') {
    const svcX = [200, 420, 620, 840], svcY = 150;
    svcX.forEach((x, i) => node(x, svcY, 'svc ' + (i + 1), 'blue', { icon: 'app', rx: 40, h: 34, sub: 'service' }));
    const dbX = VW / 2, dbY = 360;
    node(dbX, dbY, 'shared DB', 'rose', { icon: 'database', rx: 58, h: 52, halo: true, sub: 'mutable' });
    // synchronous two-way calls from every service to the one DB
    svcX.forEach((x) => {
      const e = edge([V(x, svcY + 46), V((x + dbX) / 2, 280), V(dbX, dbY - 44)], { arrow: true });
      guides.push(e.guide);
    });
    // derived stores hanging off, drifting
    const cacheC = node(210, dbY + 20, 'cache', 'slate', { icon: 'layers', rx: 34, h: 30, ghost: true, sub: 'drifts' });
    const idxC = node(830, dbY + 20, 'index', 'slate', { icon: 'search', rx: 34, h: 30, ghost: true, sub: 'drifts' });
    const e1 = edge([V(dbX - 54, dbY + 6), V(cacheC.top[0] + 34, dbY + 20)], { arrow: true, dashed: true });
    const e2 = edge([V(dbX + 54, dbY + 6), V(idxC.top[0] - 34, dbY + 20)], { arrow: true, dashed: true });
    guides.push(e1.guide, e2.guide);
    badges.push(pill(dbX, dbY + 92, 'one point of coordination + failure', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(120, 100, 800, 100, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="118" text-anchor="middle">TIGHTLY COUPLED · SYNCHRONOUS CALLS</text>`);
    cap(VW / 2, 520, 'every service hits the same mutable store — and derived copies drift');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DATAFLOW: a write becomes an event on a durable log; subs react ────── */
  if (view === 'dataflow') {
    const logY = 300;
    // the writer
    node(150, logY, 'write', 'blue', { icon: 'app', rx: 40, h: 36, sub: 'append' });
    // the durable log: a row of event tiles
    const logX0 = 330, evN = 5, evGap = 72;
    const logXs = [];
    for (let i = 0; i < evN; i++) { const x = logX0 + i * evGap; logXs.push(x); tile(x, logY, i === evN - 1 ? 'amber' : 'lilac', { halo: i === evN - 1 }); }
    const logEnd = logXs[evN - 1];
    badges.push(region(logX0 - 44, logY - 70, evGap * evN + 24, 110, '', { r: 18 }));
    badges.push(pill((logX0 + logEnd) / 2, logY - 54, 'durable ordered log', { icon: 'listOrdered', cls: 'pill--sst' }));
    // in-rail: writer → log
    const ein = edge([V(192, logY), V(260, logY), V(logX0 - 30, logY)], { arrow: true });
    guides.push(ein.guide); railIn = ein.d;
    // subscribers reacting downstream
    const subY = [150, 300, 452], subX = 900;
    const subLbl = ['search', 'cache', 'notify'];
    subY.forEach((y, i) => {
      node(subX, y, subLbl[i], 'green', { icon: i === 0 ? 'search' : i === 1 ? 'layers' : 'globe', rx: 38, h: 32, sub: 'subscriber' });
      const e = edge([V(logEnd + 26, logY), V((logEnd + subX) / 2, (logY + y) / 2), V(subX - 40, y)], { arrow: true });
      guides.push(e.guide);
      if (i === 1) railOut = e.d;
    });
    cap(VW / 2, 520, 'producers append; subscribers consume on their own clock — decoupled in time');
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── UNBUNDLE: the database split into log + operators + views ──────────── */
  if (view === 'unbundle') {
    // three labelled columns
    badges.push(region(70, 150, 270, 300, '', { r: 20 }));
    badges.push(region(390, 150, 260, 300, '', { r: 20 }));
    badges.push(region(700, 150, 270, 300, '', { r: 20 }));
    badges.push(pill(205, 170, 'LOG · storage + order', { icon: 'listOrdered', cls: 'pill--sst' }));
    badges.push(pill(520, 170, 'OPERATORS · derive', { icon: 'sliders', cls: 'pill--sst' }));
    badges.push(pill(835, 170, 'VIEWS · read side', { icon: 'search', cls: 'pill--sst' }));
    // log column: stacked event tiles
    for (let i = 0; i < 3; i++) tile(205, 280 + i * 54, i === 0 ? 'amber' : 'lilac', { halo: i === 0 });
    // operators column
    node(520, 300, 'operator', 'green', { icon: 'sliders', rx: 44, h: 40, halo: true, sub: 'stateful' });
    // views column
    node(835, 260, 'search', 'blue', { icon: 'search', rx: 38, h: 32, sub: 'view' });
    node(835, 400, 'cache', 'blue', { icon: 'layers', rx: 38, h: 32, sub: 'view' });
    // flow between columns
    const a = edge([V(250, 300), V(340, 300), V(470, 300)], { arrow: true }); guides.push(a.guide); railIn = a.d;
    const b1 = edge([V(566, 290), V(680, 262), V(792, 260)], { arrow: true }); guides.push(b1.guide);
    const b2 = edge([V(566, 312), V(680, 398), V(792, 400)], { arrow: true }); guides.push(b2.guide); railOut = b2.d;
    badges.push(pill(VW / 2, 486, 'any view is rebuildable by replaying the log', { icon: 'check' }));
    cap(VW / 2, 522, 'one monolith → three parts, each scaling and failing on its own');
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── OPERATORS: one log feeds several stateful operators → views ───────── */
  if (view === 'operators') {
    const logX = 170, logY = 300;
    for (let i = 0; i < 3; i++) tile(logX, 230 + i * 62, i === 0 ? 'amber' : 'lilac', { halo: i === 0 });
    badges.push(pill(logX, 170, 'event log', { icon: 'listOrdered', cls: 'pill--sst' }));
    // operators in the middle, each with a view to the right
    const opY = [150, 300, 452];
    const opMeta = [
      { op: 'indexer', vic: 'search', v: 'search view' },
      { op: 'aggregator', vic: 'grid', v: 'rollup view' },
      { op: 'cache', vic: 'layers', v: 'cache view' },
    ];
    opY.forEach((y, i) => {
      node(540, y, opMeta[i].op, 'green', { icon: 'sliders', rx: 42, h: 36, halo: i === 1, sub: 'state' });
      node(880, y, opMeta[i].v, 'blue', { icon: opMeta[i].vic, rx: 38, h: 32, sub: 'read view' });
      const e1 = edge([V(logX + 32, logY), V((logX + 540) / 2, (logY + y) / 2), V(498, y)], { arrow: true });
      const e2 = edge([V(582, y), V(720, y), V(840, y)], { arrow: true });
      guides.push(e1.guide, e2.guide);
      if (i === 1) { railIn = e1.d; railOut = e2.d; }
    });
    badges.push(pill(720, 520, 'write path appends · read path serves views', { icon: 'check' }));
    cap(VW / 2, 554, 'each operator keeps local state and a materialized view current (CQRS)');
    flows.push({ id: 'in', kind: 'write', speed: 140, size: 6 });
    flows.push({ id: 'out', kind: 'read', speed: 140, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── TRADEOFF: synchronous coupling vs asynchronous dataflow ────────────── */
  if (view === 'tradeoff') {
    badges.push(region(70, 140, 420, 330, '', { r: 20 }));
    badges.push(region(560, 140, 420, 330, '', { r: 20 }));
    badges.push(pill(280, 160, 'SYNCHRONOUS · coupled', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(770, 160, 'DATAFLOW · decoupled', { icon: 'check', cls: 'pill--sst' }));
    // left: services → shared db, immediate but coupled
    node(170, 280, 'svc', 'blue', { icon: 'app', rx: 36, h: 30, sub: 'calls' });
    node(390, 280, 'DB', 'rose', { icon: 'database', rx: 44, h: 40, sub: 'blocks' });
    const le = edge([V(206, 280), V(300, 280), V(346, 280)], { arrow: true }); guides.push(le.guide);
    badges.push(pill(280, 392, 'immediate reads', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(280, 428, 'fails together', { icon: 'alert', cls: 'pill--sst' }));
    // right: log → operator → view
    node(620, 280, 'log', 'amber', { icon: 'listOrdered', rx: 34, h: 30 });
    node(770, 280, 'op', 'green', { icon: 'sliders', rx: 34, h: 30 });
    node(910, 280, 'view', 'blue', { icon: 'search', rx: 34, h: 30 });
    const re1 = edge([V(654, 280), V(736, 280)], { arrow: true });
    const re2 = edge([V(804, 280), V(876, 280)], { arrow: true });
    guides.push(re1.guide, re2.guide);
    badges.push(pill(770, 392, 'eventually consistent', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(770, 428, 'decoupled · replayable', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 520, 'trade immediacy and moving parts for decoupling, resilience and rebuilds');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: one log, many derived views ────────────────────────────────── */
  const logX = 230, logY = 300;
  for (let i = 0; i < 3; i++) tile(logX, 230 + i * 62, i === 0 ? 'amber' : 'lilac', { halo: i === 0 });
  badges.push(pill(logX, 168, 'source of truth · the log', { icon: 'listOrdered', cls: 'pill--sst' }));
  const vY = [140, 258, 376, 494], vX = 850;
  const vMeta = [
    { ic: 'search', l: 'search' }, { ic: 'layers', l: 'cache' },
    { ic: 'grid', l: 'rollups' }, { ic: 'globe', l: 'notify' },
  ];
  vY.forEach((y, i) => {
    node(vX, y, vMeta[i].l, 'green', { icon: vMeta[i].ic, rx: 36, h: 30, sub: 'derived view' });
    const e = edge([V(logX + 34, logY), V((logX + vX) / 2, (logY + y) / 2), V(vX - 38, y)], { arrow: true });
    guides.push(e.guide);
    if (i === 1) railOut = e.d;
  });
  badges.push(region(560, 110, 70, 420, '', { r: 16 }));
  cap(VW / 2, 558, 'events → log → stateful operators → materialized views: the database, inside out');
  flows.push({ id: 'out', kind: 'read', speed: 150, size: 5 });
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
  <svg class="scene scene--dataflow-architecture" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Dataflow architecture">
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
