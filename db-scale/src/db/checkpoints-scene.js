/* checkpoints-scene.js — the "Checkpoints" scene, in the shared Designed-to-Scale
   isometric vocabulary: a horizontal WAL tape of segment tiles, dirty buffer-pool
   pages flushing down, a CHECKPOINT marker line, a bounded replay window, and
   particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'growing' (unbounded log, replay from start), 'checkpoint' (flush +
   mark), 'bounded' (replay only the tail), 'trim' (recycle old segments),
   'tradeoff' (frequent vs rare), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* the WAL tape: 8 segments left → right, LSN increasing */
const SEGS = 8;
const X0 = 168, DX = 92, RX = 40, YLOG = 432;
const segX = i => X0 + i * DX;
const CK = 5;                       // checkpoint sits at the start of segment 5

export function renderCheckpointsScene(snap, opts = {}) {
  const view = snap.view || 'growing';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── TRADE-OFF: two columns, no tape ──────────────────────────────────── */
  if (view === 'tradeoff') {
    const col = (x, title, icon, mat, rows) => {
      badges.push(region(x, 92, 300, 408, '', { r: 22 }));
      badges.push(pill(x + 150, 112, title, { icon, w: 232 }));
      const head = isoCube(x + 150, 172, 62, 56, mat, { icon, iconSize: 22 });
      shadows.push(head.shadow); solids.push(head.g);
      rows.forEach((t, i) => badges.push(pill(x + 150, 300 + i * 46, t, { icon: t[0] === '+' ? 'check' : 'alert', w: 270 })));
    };
    col(110, 'Checkpoint often', 'target', 'green', [
      '+ short, bounded recovery',
      '+ small log to retain',
      '− steady flush I/O storms',
      '− competes with live writes',
    ]);
    col(630, 'Checkpoint rarely', 'clock', 'amber', [
      '+ cheap steady state',
      '+ writes stay smooth',
      '− long replay after a crash',
      '− log grows between marks',
    ]);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── which segments are active / ghosted, and where the replay starts ──── */
  const ghost = {};                 // ghosted (freed / already-persisted) segments
  let replayFrom = 0;               // first segment recovery must replay
  const hot = {};                   // highlighted replay window

  if (view === 'growing') { replayFrom = 0; }
  if (view === 'checkpoint') { replayFrom = 0; }
  if (view === 'bounded') { replayFrom = CK; for (let i = CK; i < SEGS; i++) hot[i] = true; }
  if (view === 'trim') { for (let i = 0; i < CK; i++) ghost[i] = true; replayFrom = CK; }
  if (view === 'recap') { replayFrom = CK; for (let i = CK; i < SEGS; i++) hot[i] = true; for (let i = 0; i < CK; i++) ghost[i] = true; }

  /* draw the tape */
  const tiles = [];
  for (let i = 0; i < SEGS; i++) {
    const mat = hot[i] ? 'rose' : 'amber';
    const t = isoTile(segX(i), YLOG, RX, mat, { h: 30, ghost: !!ghost[i], halo: !!hot[i] });
    tiles.push(t);
    shadows.push(t.shadow); if (hot[i]) halos.push(t.halo); solids.push(t.g);
  }
  badges.push(pill(segX(0) - 6, YLOG - 70, 'WAL · log segments', { icon: 'listOrdered', cls: 'pill--sst' }));
  badges.push(`<text class="sst-cap" x="${A(segX(SEGS - 1) + 30)}" y="${A(YLOG + 70)}" text-anchor="middle">LSN grows →</text>`);

  /* ── GROWING: unbounded log, replay from the very start ───────────────── */
  if (view === 'growing') {
    const e = edge([V(segX(0) - 30, YLOG + 46), V(segX(SEGS - 1) + 30, YLOG + 46)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(pill(segX(0) + 20, YLOG + 108, 'replay from LSN 0', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(X0 - 46, 150, 180, 150, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${A(X0 + 44)}" y="188" text-anchor="middle">NO CHECKPOINT</text>`);
    badges.push(`<text class="sst-cap" x="${A(X0 + 44)}" y="236" text-anchor="middle">recovery = whole log</text>`);
    flows.push({ id: 'in', kind: 'read', speed: 240, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* checkpoint marker line (all remaining views) */
  const ckx = segX(CK) - DX / 2 + 6;
  const mark = edge([V(ckx, YLOG - 118), V(ckx, YLOG + 58)], { dashed: true });
  guides.push(mark.guide);
  badges.push(pill(ckx, YLOG - 134, 'CHECKPOINT · LSN 5120', { icon: 'target' }));

  /* dirty buffer-pool pages that the checkpoint flushes to disk */
  if (view === 'checkpoint') {
    const bx = ckx;
    const pool = isoCube(bx, 150, 86, 70, 'green', { icon: 'layers', label: 'Buffer pool', sub: 'dirty pages', iconSize: 20 });
    shadows.push(pool.shadow); solids.push(pool.g);
    const fe = edge([V(pool.base[0], pool.base[1] - 4), V(bx, (pool.base[1] + (YLOG - 118)) / 2), V(ckx, YLOG - 112)], { arrow: true, dashed: true });
    guides.push(fe.guide); railOut = fe.d;
    badges.push(pill(bx + 150, 196, 'flush all dirty → disk', { icon: 'check', w: 230 }));
    badges.push(`<text class="sst-cap" x="${A(ckx)}" y="${A(YLOG + 88)}" text-anchor="middle">disk is caught up to here</text>`);
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  if (view === 'bounded') {
    const e = edge([V(ckx + 8, YLOG + 46), V(segX(SEGS - 1) + 30, YLOG + 46)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(region(ckx - 6, YLOG - 96, segX(SEGS - 1) + 30 - ckx, 60, '', { r: 16 }));
    badges.push(`<text class="iso-region__t" x="${A((ckx + segX(SEGS - 1) + 30) / 2)}" y="${A(YLOG - 60)}" text-anchor="middle">REPLAY WINDOW</text>`);
    badges.push(pill((ckx + segX(SEGS - 1)) / 2, YLOG + 108, 'replay only the tail', { icon: 'check', cls: 'pill--sst' }));
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  if (view === 'trim') {
    badges.push(region(X0 - 46, YLOG - 96, ckx - (X0 - 46) - 6, 60, '', { r: 16 }));
    badges.push(`<text class="iso-region__t" x="${A((X0 - 46 + ckx) / 2)}" y="${A(YLOG - 60)}" text-anchor="middle">RECYCLED · FREED</text>`);
    badges.push(pill((X0 + ckx) / 2 - 20, YLOG + 100, 'segments before mark removed', { icon: 'trash', cls: 'pill--sst', w: 272 }));
    badges.push(`<text class="sst-cap" x="${A((ckx + segX(SEGS - 1)) / 2)}" y="${A(YLOG + 88)}" text-anchor="middle">log size stays bounded</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* recap */
  const tags = ['bounds recovery time', 'bounds log size', 'a consistent reference', 'tune vs flush I/O'];
  tags.forEach((t, i) => badges.push(pill(846, 132 + i * 50, t, { icon: 'check', w: 212 })));
  const e = edge([V(ckx + 8, YLOG + 46), V(segX(SEGS - 1) + 30, YLOG + 46)], { arrow: true });
  guides.push(e.guide); railIn = e.d;
  flows.push({ id: 'in', kind: 'read', speed: 170, size: 5 });
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
  <svg class="scene scene--checkpoints" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Checkpoints and bounded recovery">
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
