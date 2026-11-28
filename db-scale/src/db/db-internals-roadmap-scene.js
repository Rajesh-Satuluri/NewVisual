/* db-internals-roadmap-scene.js — the "DB Internals Roadmap" scene, in the
   shared Designed-to-Scale isometric vocabulary: six milestone iso cubes strung
   along a winding path, with the current stop lifted by a halo, stops already
   passed shown plain and stops still ahead ghosted. Pill badges, routed
   connectors with arrows, a faded iso grid.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, flows, note }.

   Views: 'start', 'core', 'acid', 'scale', 'distributed' (each highlights one
   milestone on the path) and 'recap' (the full route, mastery reached). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* six milestones in learning order — coordinates kept here, winding bottom-left
   → right → up → back left (a snaking road). */
const MILE = [
  { key: 'start',       x: 180, y: 430, label: 'Start', mat: 'blue',  icon: 'book',     sub: 'model · SQL · pages' },
  { key: 'core',        x: 440, y: 430, label: 'Core',  mat: 'lilac', icon: 'search',   sub: 'index · execute' },
  { key: 'acid',        x: 700, y: 430, label: 'ACID',  mat: 'amber', icon: 'merge',    sub: 'txns · WAL · recovery' },
  { key: 'scale',       x: 830, y: 240, label: 'Scale', mat: 'green', icon: 'layers',   sub: 'replicate · partition' },
  { key: 'distributed', x: 540, y: 190, label: 'Distributed', mat: 'rose', icon: 'globe', sub: 'consensus · CAP' },
  { key: 'mastery',     x: 230, y: 190, label: 'Mastery', mat: 'green', icon: 'target', sub: 'labs · design' },
];

export function renderDbInternalsRoadmapScene(snap, opts = {}) {
  const view = snap.view || 'recap';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // the winding path connecting consecutive milestones, under the solids
  const drawRoad = () => {
    const pts = MILE.map(m => V(m.x, m.y - 2));
    // build gentle routed segments between each pair so the road reads as one
    const road = edge(pts, { r: 40 });
    guides.push(road.guide);
    railOut = road.d;
    // small arrowheads between stops
    for (let i = 0; i < MILE.length - 1; i++) {
      const a = MILE[i], b = MILE[i + 1];
      const e = edge([V((a.x * 0.55 + b.x * 0.45), (a.y * 0.55 + b.y * 0.45)), V((a.x * 0.45 + b.x * 0.55), (a.y * 0.45 + b.y * 0.55))], { arrow: true });
      guides.push(e.guide);
    }
  };

  // draw a milestone; state: 'on' (halo), 'done' (plain), 'ahead' (ghost)
  const stop = (m, state) => {
    const c = isoCube(m.x, m.y, 58, 40, m.mat, {
      icon: m.icon, label: m.label, sub: m.sub, iconSize: 16,
      halo: state === 'on', ghost: state === 'ahead',
    });
    shadows.push(c.shadow); if (state === 'on') halos.push(c.halo); solids.push(c.g);
  };

  const drawPath = (curIdx) => {
    drawRoad();
    MILE.forEach((m, i) => {
      stop(m, i === curIdx ? 'on' : i < curIdx ? 'done' : 'ahead');
    });
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
  };

  const INDEX = { start: 0, core: 1, acid: 2, scale: 3, distributed: 4 };

  /* ── one highlighted milestone ─────────────────────────────────────────── */
  if (view in INDEX) {
    const i = INDEX[view];
    drawPath(i);
    const m = MILE[i];
    const focus = {
      start: 'learn the primitives: row, table, key, page',
      core: 'make reads fast, then run queries',
      acid: 'correctness under concurrency and crashes',
      scale: 'copy and split the single-node engine',
      distributed: 'how independent nodes agree — and the price',
    }[view];
    badges.push(pill(m.x, m.y - 78, 'YOU ARE HERE', { icon: 'target', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, 508, focus, { icon: m.icon, cls: 'pill--sst', w: 520 }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the full route, mastery reached ────────────────────────────── */
  drawPath(5);
  badges.push(region(150, 110, 740, 150, '', { r: 26 }));
  badges.push(`<text class="iso-region__t" x="${VW / 2}" y="140" text-anchor="middle">START → CORE → ACID → SCALE → DISTRIBUTED → MASTERY</text>`);
  badges.push(pill(VW / 2, 508, 'each stop is a prerequisite for the next — loop back as needed', { icon: 'check', cls: 'pill--sst', w: 540 }));
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
  <svg class="scene scene--db-internals-roadmap" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Database internals learning roadmap">
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
