/* batch-processing-scene.js — the "Batch Processing" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'pileup' (one worker, huge input), 'pipeline' (immutable in → new
   out), 'mapreduce' (partitions → mappers → shuffle → reducers → output),
   'retry' (a worker dies, task reruns), 'latency' (throughput vs staleness),
   'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const MIDY = 280;

export function renderBatchProcessingScene(snap, opts = {}) {
  const view = snap.view || 'mapreduce';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a cube; caller keeps the coords — we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 44, o.h || 40, mat, {
      icon: o.icon || 'server', label, sub: o.sub || '', iconSize: o.iconSize || 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  const tile = (x, y, label, mat, o = {}) => {
    const c = isoTile(x, y, o.rx || 30, mat, { icon: o.icon || 'file', label, sub: o.sub || '', ghost: !!o.ghost });
    shadows.push(c.shadow); solids.push(c.g);
    return c;
  };

  /* ── PILEUP: a single worker dwarfed by a mountain of input ─────────────── */
  if (view === 'pileup') {
    // a stack of input tiles on the left
    const sx = 230;
    for (let i = 0; i < 5; i++) tile(sx, 200 + i * 34, i === 0 ? 'input data' : '', 'slate', { sub: i === 0 ? 'TB of logs' : '', ghost: i > 0 });
    node(700, MIDY, 'worker', 'blue', { icon: 'app', sub: 'row by row' });
    const e = edge([V(sx + 60, MIDY), V(460, MIDY - 6), V(700 - 56, MIDY)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(pill(700, 150, 'one machine · online', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(150, 410, 740, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="448" text-anchor="middle">TOO SLOW · COMPETES WITH LIVE TRAFFIC</text>`);
    cap(VW / 2, 480, 'grinding terabytes one row at a time can’t keep up');
    flows.push({ id: 'in', kind: 'read', speed: 60, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PIPELINE: immutable input → transform → new output ─────────────────── */
  if (view === 'pipeline') {
    const inX = 210, fnX = 540, outX = 870;
    node(inX, MIDY, 'input', 'slate', { icon: 'database', sub: 'read-only' });
    node(fnX, MIDY, 'job', 'amber', { icon: 'sliders', sub: 'transform' });
    node(outX, MIDY, 'output', 'green', { icon: 'layers', sub: 'new dataset' });
    const e1 = edge([V(inX + 56, MIDY), V((inX + fnX) / 2, MIDY - 6), V(fnX - 56, MIDY)], { arrow: true });
    const e2 = edge([V(fnX + 56, MIDY), V((fnX + outX) / 2, MIDY - 6), V(outX - 56, MIDY)], { arrow: true });
    guides.push(e1.guide, e2.guide); railIn = e1.d; railOut = e2.d;
    badges.push(pill(inX, 176, 'immutable', { icon: 'key', cls: 'pill--sst' }));
    badges.push(pill(outX, 176, 'brand-new', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, 466, 'output = ƒ(input) · nothing mutated in place', { icon: 'check' }));
    cap(VW / 2, 506, 'a pure transformation — re-runnable any time');
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 6 }, { id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── MAPREDUCE: partitions → mappers → shuffle → reducers → output ──────── */
  if (view === 'mapreduce') {
    const colIn = 150, colMap = 400, colRed = 740, colOut = 950;
    const ys = [170, 280, 390];
    // input partitions + mappers
    ys.forEach((y, i) => {
      tile(colIn, y, 'P' + (i + 1), 'slate', { icon: 'file', sub: 'part' });
      node(colMap, y, 'map', 'blue', { icon: 'sliders', rx: 40, h: 36 });
      const e = edge([V(colIn + 40, y), V((colIn + colMap) / 2, y - 4), V(colMap - 50, y)], { arrow: true });
      guides.push(e.guide); if (i === 0) railIn = e.d;
    });
    // reducers
    const redYs = [220, 340];
    redYs.forEach((y, j) => {
      node(colRed, y, j === 0 ? 'reduce k=A' : 'reduce k=B', 'lilac', { icon: 'merge', rx: 46, h: 38, halo: j === 0 });
    });
    // shuffle: every mapper to every reducer (grouped by key)
    ys.forEach((my) => {
      redYs.forEach((ry) => {
        const e = edge([V(colMap + 46, my), V((colMap + colRed) / 2, (my + ry) / 2 - 10), V(colRed - 52, ry)], { arrow: true, dashed: true });
        guides.push(e.guide);
      });
    });
    // output
    node(colOut, 280, 'output', 'green', { icon: 'layers', rx: 40, h: 36 });
    redYs.forEach((ry) => {
      const e = edge([V(colRed + 50, ry), V((colRed + colOut) / 2, (ry + 280) / 2 - 6), V(colOut - 46, 280)], { arrow: true });
      guides.push(e.guide); railOut = e.d;
    });
    badges.push(pill(colMap, 118, 'MAP · parallel', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(pill((colMap + colRed) / 2, 118, 'SHUFFLE · group by key', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(pill(colRed, 118, 'REDUCE', { icon: 'merge', cls: 'pill--sst' }));
    cap(VW / 2, 486, 'mappers emit key→value · shuffle regroups · reducers aggregate');
    flows.push({ id: 'in', kind: 'read', speed: 170, size: 6 }, { id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RETRY: a worker dies, its task reruns elsewhere ────────────────────── */
  if (view === 'retry') {
    const X = [180, 360, 540, 720, 900];
    X.forEach((x, i) => {
      const dead = i === 3;
      node(x, MIDY, dead ? 'worker 4' : 'worker ' + (i + 1), dead ? 'rose' : 'green',
        { icon: dead ? 'alert' : 'app', ghost: dead, sub: dead ? 'crashed' : 'ok', halo: i === 4 });
    });
    // task migrates from dead worker 4 to worker 5
    const e = edge([V(X[3], MIDY - 40), V((X[3] + X[4]) / 2, 150), V(X[4], MIDY - 40)], { arrow: true, dashed: true });
    guides.push(e.guide);
    badges.push(pill(X[3], 150, 'task lost', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(X[4], MIDY + 78, 're-run · same input', { icon: 'check', cls: 'pill--sst' }));
    badges.push(region(140, 410, 760, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="448" text-anchor="middle">IMMUTABLE INPUT → DETERMINISTIC RETRY</text>`);
    cap(VW / 2, 480, 'no partial state to unwind — the retry yields identical output');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LATENCY: high throughput, stale output ─────────────────────────────── */
  if (view === 'latency') {
    // events happen on a timeline, output lands much later
    const evY = 210, outY = 360;
    const evX = [180, 300, 420, 540];
    evX.forEach((x, i) => tile(x, evY, i === 0 ? 'events' : '', 'blue', { icon: 'listOrdered', sub: i === 0 ? 't=0' : '', ghost: i > 0 }));
    node(760, evY, 'batch job', 'amber', { icon: 'sliders', sub: 'hourly' });
    const e1 = edge([V(evX[3] + 36, evY), V(640, evY - 6), V(760 - 52, evY)], { arrow: true });
    guides.push(e1.guide); railIn = e1.d;
    node(760, outY, 'report', 'green', { icon: 'scroll', sub: '30+ min old' });
    const e2 = edge([V(760, evY + 40), V(760, (evY + outY) / 2), V(760, outY - 40)], { arrow: true });
    guides.push(e2.guide);
    badges.push(pill(360, 150, 'events arrive now', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(pill(760, outY + 70, 'result lands later', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(region(150, 430, 740, 78, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="466" text-anchor="middle">GREAT THROUGHPUT · STALE BY DESIGN</text>`);
    cap(VW / 2, 494, 'unbounded, always-fresh work belongs to stream processing');
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the map/shuffle/reduce workhorse ────────────────────────────── */
  node(230, MIDY, 'input', 'slate', { icon: 'database', sub: 'immutable' });
  node(540, MIDY, 'map·shuffle·reduce', 'blue', { icon: 'merge', rx: 58, h: 40, halo: true });
  node(850, MIDY, 'output', 'green', { icon: 'layers', sub: 'derived' });
  const er1 = edge([V(286, MIDY), V(400, MIDY - 6), V(482, MIDY)], { arrow: true });
  const er2 = edge([V(598, MIDY), V(720, MIDY - 6), V(794, MIDY)], { arrow: true });
  guides.push(er1.guide, er2.guide);
  badges.push(region(140, 408, 760, 150, 'bounded in · parallel out · retry-safe', { r: 22 }));
  const tags = ['map across partitions', 'shuffle by key', 'reduce to the answer'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 452 + i * 40, t, { icon: 'check', w: 300 })));
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
  <svg class="scene scene--batch-processing" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Batch processing: map, shuffle, reduce">
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
