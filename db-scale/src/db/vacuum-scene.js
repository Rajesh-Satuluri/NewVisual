/* vacuum-scene.js — the "VACUUM" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes/slabs with icon glyphs and labels,
   soft ground shadows, halos, pill badges, dashed logical regions, routed
   connectors with arrows, a faded iso grid, and particle rails.

   A table is drawn as a row of pages; each page is a small cluster of tuple
   slots. Live tuples are green, dead tuples rose, reclaimed/free slots a ghosted
   slate. VACUUM sweeps the dead to free, and inserts refill the holes.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'bloat', 'mark', 'reclaim', 'full', 'tradeoff', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* material for a slot state */
const SLOT_MAT = { live: 'green', dead: 'rose', free: 'slate' };

/* a page = a tidy iso cluster of up to 6 tuple slots around (cx,cy).
   Pushes tiles into the given arrays; returns the page's screen bounds. */
function page(cx, cy, states, arr) {
  const { shadows, solids } = arr;
  states.forEach((s, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = cx + (col - 1) * 32 - row * 16;
    const y = cy + row * 26 + (col - 1) * 8;
    const t = isoTile(x, y, 15, SLOT_MAT[s] || 'slate', { ghost: s === 'free', halo: false });
    shadows.push(t.shadow); solids.push(t.g);
  });
}

export function renderVacuumScene(snap, opts = {}) {
  const view = snap.view || 'bloat';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const arr = { shadows, solids };

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── a horizontal row of pages = the table file ───────────────────────── */
  function tableRow(cy, pageStates, label) {
    const xs = [312, 500, 688, 876];
    pageStates.forEach((st, i) => page(xs[i], cy, st, arr));
    const x0 = xs[0] - 70, x1 = xs[pageStates.length - 1] + 70;
    badges.push(region(x0, cy - 78, x1 - x0, 150, '', { r: 22 }));
    if (label) badges.push(pill((x0 + x1) / 2, cy - 92, label, { icon: 'database', cls: 'pill--sst' }));
    return { x0, x1, cy };
  }

  const D = 'dead', L = 'live', F = 'free';

  /* ── BLOAT: pages crowded with dead tuples ────────────────────────────── */
  if (view === 'bloat') {
    tableRow(250, [
      [D, D, L, D, D, D],
      [D, L, D, D, D, L],
      [L, D, D, D, D, D],
      [D, D, D, L, D, D],
    ], 'users  ·  table file');
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="350" text-anchor="middle">DEAD TUPLES CROWD OUT THE LIVE</text>`);
    badges.push(pill(892, 150, 'file keeps growing', { icon: 'alert', w: 196 }));
    badges.push(pill(170, 250, '5 live rows', { icon: 'check', w: 150 }));
    badges.push(pill(170, 300, 'per 25 tuples read', { icon: 'search', w: 190 }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── MARK: VACUUM sweeps; dead → free ─────────────────────────────────── */
  if (view === 'mark') {
    const t = tableRow(250, [
      [F, F, L, D, D, D],
      [D, L, D, D, D, L],
      [L, D, D, D, D, D],
      [D, D, D, L, D, D],
    ], 'VACUUM in progress');
    // a sweep rail running left → right across the table
    const e = edge([V(t.x0 + 20, t.cy + 2), V(t.x1 - 20, t.cy + 2)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(pill(360, 168, 'swept · reclaimable', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(760, 168, 'still scanning →', { icon: 'search', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="${VW / 2}" y="352" text-anchor="middle">dead to every snapshot → marked free</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── RECLAIM: holes refilled by new inserts, same file ────────────────── */
  if (view === 'reclaim') {
    const t = tableRow(250, [
      [L, F, L, L, F, L],
      [L, L, F, L, L, F],
      [F, L, L, F, L, L],
      [L, L, L, F, L, L],
    ], 'lean again  ·  same file');
    // a write rail bringing new rows into freed slots
    const e = edge([V(170, 430), V(360, 430), V(500, t.cy + 60)], { arrow: true, dashed: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(170, 390, 'new INSERT', { icon: 'bolt', w: 150 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="350" text-anchor="middle">FREED SLOTS REUSED IN PLACE</text>`);
    badges.push(pill(892, 150, 'visibility map: clean', { icon: 'check', w: 216 }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut,
      flows: [{ id: 'out', kind: 'write', speed: 150, size: 6 }], note: snap.note });
  }

  /* ── FULL: plain VACUUM (reuse in place) vs VACUUM FULL (rewrite+shrink) ─ */
  if (view === 'full') {
    // left column — plain VACUUM: same page count, holes inside
    badges.push(region(140, 96, 320, 418, '', { r: 22 }));
    badges.push(pill(300, 116, 'Plain VACUUM', { icon: 'database', w: 220 }));
    const leftStates = [[L, F, L, L, F, L], [F, L, L, F, L, L], [L, L, F, L, L, F], [L, F, L, L, L, F]];
    leftStates.forEach((st, i) => page(300, 200 + i * 86, st, arr));
    badges.push(`<text class="sst-cap" x="300" y="498" text-anchor="middle">4 pages · reused in place, file unchanged</text>`);

    // right column — VACUUM FULL: compact new file, fewer pages, locked
    badges.push(region(580, 96, 320, 418, '', { r: 22 }));
    badges.push(pill(740, 116, 'VACUUM FULL', { icon: 'bolt', w: 220 }));
    const rightStates = [[L, L, L, L, L, L], [L, L, L, L, L, L]];
    rightStates.forEach((st, i) => page(740, 232 + i * 96, st, arr));
    badges.push(pill(740, 406, 'EXCLUSIVE LOCK', { icon: 'alert', cls: 'pill--sst', w: 210 }));
    badges.push(`<text class="sst-cap" x="740" y="498" text-anchor="middle">2 pages · rewritten, disk returned to OS</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── TRADE-OFF: cadence, two columns ──────────────────────────────────── */
  if (view === 'tradeoff') {
    const col = (x, title, icon, mat, rows) => {
      badges.push(region(x, 92, 300, 408, '', { r: 22 }));
      badges.push(pill(x + 150, 112, title, { icon, w: 240 }));
      const head = isoCube(x + 150, 170, 62, 56, mat, { icon, iconSize: 22 });
      shadows.push(head.shadow); solids.push(head.g);
      rows.forEach((tx, i) => badges.push(pill(x + 150, 300 + i * 46, tx, { icon: tx[0] === '+' ? 'check' : 'alert', w: 272 })));
    };
    col(110, 'Vacuum too rarely', 'clock', 'rose', [
      '− table bloats, scans slow',
      '− dead tuples never freed',
      '− txid wraparound looms',
      '+ almost no background I/O',
    ]);
    col(630, 'Vacuum too aggressively', 'bolt', 'amber', [
      '+ bloat stays near zero',
      '+ visibility map always fresh',
      '− workers burn I/O & CPU',
      '− competes with live queries',
    ]);
    badges.push(`<text class="sst-cap" x="${VW / 2}" y="540" text-anchor="middle">autovacuum is a dial — tune it to each table’s write rate</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── RECAP: MVCC + VACUUM, two halves of one cycle ────────────────────── */
  const verCube = isoCube(360, 210, 96, 92, 'green', { icon: 'layers', label: 'MVCC', sub: 'writes versions', halo: true });
  shadows.push(verCube.shadow); halos.push(verCube.halo); solids.push(verCube.g);
  const vacCube = isoCube(700, 210, 96, 92, 'lilac', { icon: 'trash', label: 'VACUUM', sub: 'reclaims dead', halo: true });
  shadows.push(vacCube.shadow); halos.push(vacCube.halo); solids.push(vacCube.g);

  const fwd = edge([V(verCube.verts.E.x + 2, 200), V(530, 176), V(vacCube.verts.W.x - 2, 200)], { arrow: true });
  const back = edge([V(vacCube.verts.Sb.x, vacCube.base[1] - 10), V(530, 340), V(verCube.verts.Sb.x, verCube.base[1] - 10)], { arrow: true, dashed: true });
  guides.push(fwd.guide, back.guide);
  badges.push(pill(530, 150, 'dead tuples', { icon: 'trash', cls: 'pill--sst' }));
  badges.push(pill(530, 360, 'free space', { icon: 'check', cls: 'pill--sst' }));

  const tags = ['lean tables', 'fast scans', 'no wraparound', 'runs automatically'];
  tags.forEach((t, i) => badges.push(pill(892, 130 + i * 52, t, { icon: 'check', w: 190 })));
  badges.push(`<text class="sst-cap" x="530" y="470" text-anchor="middle">versioning gives; VACUUM takes back when it’s safe</text>`);

  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--vacuum" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="VACUUM reclaiming dead tuples">
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
