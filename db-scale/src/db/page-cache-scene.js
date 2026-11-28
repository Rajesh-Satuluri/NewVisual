/* page-cache-scene.js — the "Page Cache" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes/slabs with icon glyphs and labels,
   soft ground shadows, halos, pill badges, dashed logical regions, routed
   connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'stack' (the four-layer I/O stack), 'oscache' (a pool miss served by
   the OS cache), 'double' (the same page cached twice), 'direct' (O_DIRECT
   skips the OS cache), 'tradeoff' (rely vs own), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* the four layers of the I/O stack, top → bottom */
const CX = 540, RX = 108;
const LAYERS = [
  { key: 'app',  cy: 86,  mat: 'blue',  icon: 'app',      label: 'Application', sub: 'issues reads' },
  { key: 'pool', cy: 216, mat: 'green', icon: 'layers',   label: 'Buffer Pool', sub: 'DBMS-managed RAM' },
  { key: 'osc',  cy: 346, mat: 'amber', icon: 'database', label: 'OS Page Cache', sub: 'kernel-managed RAM' },
  { key: 'disk', cy: 476, mat: 'lilac', icon: 'file',     label: 'Disk', sub: 'data files' },
];

export function renderPageCacheScene(snap, opts = {}) {
  const view = snap.view || 'stack';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── TRADE-OFF: two columns, no tower ─────────────────────────────────── */
  if (view === 'tradeoff') {
    const col = (x, title, icon, mat, rows) => {
      badges.push(region(x, 92, 300, 408, '', { r: 22 }));
      badges.push(pill(x + 150, 112, title, { icon, w: 220 }));
      const head = isoCube(x + 150, 170, 62, 56, mat, { icon, iconSize: 22 });
      shadows.push(head.shadow); solids.push(head.g);
      rows.forEach((t, i) => badges.push(pill(x + 150, 300 + i * 46, t, { icon: t[0] === '+' ? 'check' : 'alert', w: 268 })));
    };
    col(110, 'Lean on the OS cache', 'database', 'amber', [
      '+ zero buffer-pool code',
      '+ free readahead & eviction',
      '− double caching wastes RAM',
      '− no control of flush timing',
    ]);
    col(630, 'Bypass with O_DIRECT', 'layers', 'green', [
      '+ one copy per page',
      '+ full control of memory',
      '− must write caching yourself',
      '− mmap hides page-fault stalls',
    ]);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── all other views draw the layer tower ─────────────────────────────── */
  const ghost = {};               // keys of layers to render dim
  const halo = {};                // keys to glow
  if (view === 'direct') ghost.osc = true;
  if (view === 'recap') { ghost.osc = true; halo.pool = true; }

  const cubes = {};
  LAYERS.forEach(L => {
    const c = isoCube(CX, L.cy, RX, 44, L.mat, {
      icon: L.icon, label: L.label, sub: L.sub, iconSize: 22,
      ghost: !!ghost[L.key], halo: !!halo[L.key],
    });
    cubes[L.key] = c;
    shadows.push(c.shadow); if (halo[L.key]) halos.push(c.halo); solids.push(c.g);
  });

  // left-side name tags are already on the cubes; add a right-hand caption rail
  const CY = {}; LAYERS.forEach(L => { CY[L.key] = L.cy; });
  const yOf = k => CY[k];

  /* read rail descends on the right; write rail ascends on the left */
  const RIGHT = 720, LEFT = 360;

  function readRail(fromY, toY) {
    const e = edge([V(RIGHT, fromY), V(RIGHT, toY)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    // stubs linking the rail to the top & bottom layers it spans
  }
  function writeRail(fromY, toY) {
    const e = edge([V(LEFT, fromY), V(LEFT, toY)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
  }

  const flows = [];

  if (view === 'stack') {
    readRail(yOf('app') + 20, yOf('disk') + 20);
    writeRail(yOf('disk') + 20, yOf('app') + 20);
    badges.push(pill(RIGHT, yOf('app') - 40, 'read: query falls through', { icon: 'search', cls: 'pill--sst' }));
    badges.push(pill(LEFT, yOf('disk') + 86, 'write: back down to disk', { icon: 'flush', cls: 'pill--sst' }));
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'write', speed: 150, size: 6 });
  }

  else if (view === 'oscache') {
    // a read misses the pool and is served by the OS cache — rail stops there
    readRail(yOf('app') + 20, yOf('osc') + 20);
    cubes.disk.ghostNote = true;
    // a hot page glowing in the OS cache layer
    const pg = isoTile(CX + 150, yOf('osc') - 2, 30, 'rose', { halo: true });
    shadows.push(pg.shadow); halos.push(pg.halo); solids.push(pg.g);
    badges.push(pill(RIGHT, yOf('pool') - 6, 'pool MISS', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(CX + 150, yOf('osc') + 60, 'still in RAM → HIT', { icon: 'check', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="${CX}" y="${A(yOf('disk') + 90)}" text-anchor="middle">disk never touched</text>`);
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
  }

  else if (view === 'double') {
    readRail(yOf('app') + 20, yOf('disk') + 20);
    writeRail(yOf('disk') + 20, yOf('app') + 20);
    // the SAME page, resident in both the buffer pool and the OS cache
    const p1 = isoTile(CX + 150, yOf('pool') - 2, 30, 'rose', { halo: true });
    const p2 = isoTile(CX + 150, yOf('osc') - 2, 30, 'rose', { halo: true });
    [p1, p2].forEach(p => { shadows.push(p.shadow); halos.push(p.halo); solids.push(p.g); });
    const br = edge([V(CX + 150 + 34, yOf('pool')), V(CX + 230, (yOf('pool') + yOf('osc')) / 2), V(CX + 150 + 34, yOf('osc'))], { dashed: true });
    guides.push(br.guide);
    badges.push(pill(CX + 262, (yOf('pool') + yOf('osc')) / 2, 'same 8 KB page', { icon: 'alert', w: 170 }));
    badges.push(`<text class="iso-region__t" x="${CX + 206}" y="${A(yOf('osc') + 78)}" text-anchor="middle">TWO COPIES · RAM WASTED</text>`);
    flows.push({ id: 'in', kind: 'read', speed: 170, size: 5 }, { id: 'out', kind: 'write', speed: 170, size: 6 });
  }

  else if (view === 'direct') {
    // rail skips the ghosted OS cache: pool → out to the right → straight to disk
    const e = edge([
      V(cubes.pool.verts.E.x - 4, yOf('pool') + 20),
      V(RIGHT + 20, yOf('pool') + 20),
      V(RIGHT + 20, yOf('disk') + 20),
      V(cubes.disk.verts.E.x - 4, yOf('disk') + 20),
    ], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    writeRail(yOf('disk') + 20, yOf('pool') + 20);
    badges.push(pill(RIGHT + 20, yOf('osc') + 20, 'O_DIRECT · skip cache', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="${CX}" y="${A(yOf('osc') + 70)}" text-anchor="middle">OS page cache bypassed</text>`);
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'write', speed: 150, size: 6 });
  }

  else if (view === 'recap') {
    // buffer pool is the single owned cache; OS cache ghosted; rail pool → disk
    const e = edge([
      V(cubes.pool.verts.E.x - 4, yOf('pool') + 20),
      V(RIGHT, yOf('pool') + 20),
      V(RIGHT, yOf('disk') + 20),
      V(cubes.disk.verts.E.x - 4, yOf('disk') + 20),
    ], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    const tags = ['one copy per page', 'DBMS owns eviction', 'controls flush timing', 'memory you can tune'];
    tags.forEach((t, i) => badges.push(pill(190, 150 + i * 56, t, { icon: 'check', w: 196 })));
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
  }

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
  <svg class="scene scene--page-cache" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Page cache and the I/O stack">
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
