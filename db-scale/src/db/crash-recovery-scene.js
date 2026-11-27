/* crash-recovery-scene.js — the "Crash Recovery" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes/tiles with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'crash' (torn files + intact log), 'aries' (the three passes),
   'analyze' (scan forward), 'redo' (replay forward), 'undo' (walk backward),
   'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a row of heap pages; `state` per page: 'ok' | 'stale' | 'dirty' */
function heapRow(cx, cy, n, gap, states) {
  const start = cx - (n - 1) * gap / 2;
  const out = [];
  for (let i = 0; i < n; i++) {
    const st = states[i] || 'ok';
    const mat = st === 'stale' ? 'slate' : st === 'dirty' ? 'rose' : 'green';
    out.push({ tile: isoTile(start + i * gap, cy, 30, mat, { halo: st === 'dirty' }), x: start + i * gap, st });
  }
  return out;
}

export function renderCrashRecoveryScene(snap, opts = {}) {
  const view = snap.view || 'aries';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* shared geometry: a WAL slab low-centre, a heap-page row above it */
  const HEAP_CX = 540, HEAP_CY = 212, HEAP_GAP = 92;
  const WAL_CX = 540, WAL_CY = 430, WAL_RX = 150;

  /* ── ARIES: three labelled phase cubes, the log feeding them ───────────── */
  if (view === 'aries') {
    badges.push(region(300, 92, 460, 150, '', { r: 22 }));
    badges.push(pill(530, 104, 'ARIES  ·  three passes over the WAL', { icon: 'merge', w: 320 }));
    const phases = [
      { cx: 400, mat: 'blue',  icon: 'search', label: 'Analyze', sub: 'who & what' },
      { cx: 530, mat: 'amber', icon: 'bolt',   label: 'Redo',    sub: 'repeat history' },
      { cx: 660, mat: 'rose',  icon: 'trash',  label: 'Undo',    sub: 'roll back' },
    ];
    const cubes = phases.map(p => isoCube(p.cx, 150, 52, 52, p.mat, { icon: p.icon, label: p.label, sub: p.sub, iconSize: 20 }));
    cubes.forEach((c, i) => {
      shadows.push(c.shadow); solids.push(c.g);
      if (i < cubes.length - 1) {
        const e = edge([V(cubes[i].verts.E.x - 2, cubes[i].front[1]), V(cubes[i + 1].verts.W.x + 2, cubes[i + 1].front[1])], { arrow: true });
        guides.push(e.guide);
      }
    });
    // the WAL + last checkpoint below, feeding the passes
    const wal = isoCube(WAL_CX, WAL_CY, WAL_RX, 40, 'amber', { icon: 'listOrdered', label: 'Write-Ahead Log', sub: 'the one surviving truth', iconSize: 20 });
    shadows.push(wal.shadow); solids.push(wal.g);
    const ck = isoTile(WAL_CX - WAL_RX + 34, WAL_CY - 2, 24, 'green', { halo: true });
    shadows.push(ck.shadow); halos.push(ck.halo); solids.push(ck.g);
    badges.push(pill(WAL_CX - WAL_RX + 34, WAL_CY + 60, 'last checkpoint', { icon: 'target', cls: 'pill--sst' }));
    const up = edge([V(WAL_CX, wal.verts.N.y - 2), V(WAL_CX, 230)], { arrow: true, dashed: true });
    guides.push(up.guide); railIn = up.d;
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── all other views draw the heap row + WAL slab ──────────────────────── */
  const states = view === 'crash'
    ? ['ok', 'stale', 'dirty', 'stale']
    : view === 'redo'
      ? ['ok', 'dirty', 'dirty', 'dirty']       // after replay: matches crash instant
      : view === 'undo' || view === 'recap'
        ? ['ok', 'ok', 'ok', 'ok']              // losers erased, winners kept
        : ['ok', 'stale', 'dirty', 'stale'];    // analyze = same torn files as crash

  const pages = heapRow(HEAP_CX, HEAP_CY, 4, HEAP_GAP, states);
  pages.forEach(p => { shadows.push(p.tile.shadow); if (p.st === 'dirty') halos.push(p.tile.halo); solids.push(p.tile.g); });
  badges.push(pill(HEAP_CX, HEAP_CY - 66, 'heap pages  ·  on disk', { icon: 'file', cls: 'pill--sst' }));

  // the WAL slab
  const walMat = 'amber';
  const wal = isoCube(WAL_CX, WAL_CY, WAL_RX, 42, walMat, { icon: 'listOrdered', label: 'Write-Ahead Log', sub: 'intact', iconSize: 20 });
  shadows.push(wal.shadow); solids.push(wal.g);
  const ck = isoTile(WAL_CX - WAL_RX + 30, WAL_CY - 2, 22, 'green', {});
  shadows.push(ck.shadow); solids.push(ck.g);

  if (view === 'crash') {
    // a red fault bolt across the heap; the WAL survives
    badges.push(pill(760, 150, 'POWER LOST', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="${HEAP_CX}" y="${A(HEAP_CY + 74)}" text-anchor="middle">stale · committed-but-not-flushed · uncommitted-but-flushed</text>`);
    badges.push(region(HEAP_CX - 210, HEAP_CY - 48, 420, 110, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${HEAP_CX}" y="${A(HEAP_CY - 30)}" text-anchor="middle">TORN STATE — TRUST NOTHING HERE</text>`);
    badges.push(pill(WAL_CX, WAL_CY + 70, 'the log is complete & ordered', { icon: 'check', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  if (view === 'analyze') {
    // scan forward from checkpoint → right; annotate in-flight + dirty counts
    const e = edge([V(ck.top[0], ck.top[1] - 2), V(WAL_CX + WAL_RX - 24, WAL_CY - 2)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(pill(WAL_CX, WAL_CY + 70, 'scan forward from checkpoint', { icon: 'search', cls: 'pill--sst' }));
    badges.push(pill(250, 150, '2 txns in-flight', { icon: 'merge', w: 180 }));
    badges.push(pill(250, 202, '4 pages dirty', { icon: 'alert', w: 180 }));
    badges.push(`<text class="sst-cap" x="${HEAP_CX}" y="${A(HEAP_CY + 74)}" text-anchor="middle">no writes yet — just reading the log</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  if (view === 'redo') {
    // replay WAL → heap, forward (upward) arrow
    const e = edge([V(WAL_CX, wal.verts.N.y - 2), V(HEAP_CX, HEAP_CY + 34)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(760, 150, 'repeat history →', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="${HEAP_CX}" y="${A(HEAP_CY + 74)}" text-anchor="middle">every change replayed — page LSN skips what's already there</text>`);
    badges.push(pill(WAL_CX, WAL_CY + 70, 'heap now = crash instant', { icon: 'check', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut,
      flows: [{ id: 'out', kind: 'write', speed: 140, size: 6 }], note: snap.note });
  }

  if (view === 'undo') {
    // walk backward: heap → WAL (downward) arrow, reversing losers
    const e = edge([V(HEAP_CX, HEAP_CY + 34), V(WAL_CX, wal.verts.N.y - 2)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(760, 150, '← walk backward', { icon: 'trash', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="${HEAP_CX}" y="${A(HEAP_CY + 74)}" text-anchor="middle">2 unfinished txns reversed — winners untouched</text>`);
    badges.push(pill(WAL_CX, WAL_CY + 70, 'each undo logged as a CLR', { icon: 'listOrdered', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut,
      flows: [{ id: 'out', kind: 'write', speed: 140, size: 6 }], note: snap.note });
  }

  // recap: clean heap, guarantee pills
  badges.push(`<text class="sst-cap" x="${HEAP_CX}" y="${A(HEAP_CY + 74)}" text-anchor="middle">exactly the committed work — nothing more, nothing less</text>`);
  const tags = ['committed present', 'uncommitted gone', 'crash-safe recovery'];
  tags.forEach((t, i) => badges.push(pill(820, 140 + i * 54, t, { icon: 'check', w: 196 })));
  badges.push(pill(WAL_CX, WAL_CY + 70, 'durability + atomicity restored', { icon: 'check', cls: 'pill--sst' }));
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
  <svg class="scene scene--crash-recovery" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Crash recovery with ARIES">
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
