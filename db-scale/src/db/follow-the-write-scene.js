/* follow-the-write-scene.js — the "Follow the Write" lab scene, in the shared
   Designed-to-Scale isometric vocabulary. Traces one UPDATE across four stages
   laid out left→right: client · WAL (log) · buffer-pool page · data file. Each
   view lights up the stage the lab is on and routes the relevant particle flow.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'intro' (all four stages, nothing moving yet), 'wal' (append to log),
   'bufferpool' (page dirtied in RAM), 'commit' (commit record forced to WAL),
   'flush' (dirty page drains to disk), 'recap' (the whole durable path). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* fixed stage anchors across the middle band — caller keeps every coord */
const ROWY = 286;
const CLIENT_X = 150;
const WAL_X = 420;
const PAGE_X = 680;
const DISK_X = 930;

export function renderFollowTheWriteScene(snap, opts = {}) {
  const view = snap.view || 'intro';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a cube at caller-held coords; never read geometry back off the return
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 48, o.h || 44, mat, {
      icon: o.icon || 'server', label, sub: o.sub || '', iconSize: 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // the four stages, each lit (active) or dim (ghost) per view
  const stages = (active) => {
    node(CLIENT_X, ROWY, 'client', 'blue',
      { icon: 'app', sub: 'UPDATE', halo: active === 'client', ghost: active && active !== 'client' && active !== 'all' });
    node(WAL_X, ROWY, 'WAL', 'amber',
      { icon: 'wal', sub: 'log', halo: active === 'wal', ghost: active && active !== 'wal' && active !== 'all' });
    node(PAGE_X, ROWY, 'page 7', 'green',
      { icon: 'layers', sub: active === 'dirty' || active === 'page' ? 'DIRTY' : 'buffer pool', halo: active === 'page', ghost: active && active !== 'page' && active !== 'all' && active !== 'dirty' });
    if (active === 'dirty') {
      // redraw page lit as dirty while keeping others dim
    }
    node(DISK_X, ROWY, 'data file', 'lilac',
      { icon: 'database', sub: 'on disk', halo: active === 'disk', ghost: active && active !== 'disk' && active !== 'all' });
  };

  // a routed rail from stage a-x to stage b-x along the band (above the cubes)
  const link = (ax, bx, o = {}) => {
    const y = ROWY - 70;
    const e = edge([V(ax + 48, ROWY - 20), V((ax + bx) / 2, y), V(bx - 48, ROWY - 20)],
      { arrow: true, dashed: !!o.dashed });
    guides.push(e.guide);
    return e.d;
  };

  /* ── INTRO: the four stages, labelled, nothing moving ──────────────────── */
  if (view === 'intro') {
    stages('all');
    link(CLIENT_X, WAL_X);
    link(WAL_X, PAGE_X);
    link(PAGE_X, DISK_X, { dashed: true });
    badges.push(pill(CLIENT_X, ROWY + 92, 'id=42 · 900 → 940', { icon: 'app', cls: 'pill--sst' }));
    badges.push(pill(WAL_X, 150, '1 · sequential log', { icon: 'wal', cls: 'pill--sst' }));
    badges.push(pill(PAGE_X, 150, '2 · change in RAM', { icon: 'layers', cls: 'pill--sst' }));
    badges.push(pill(DISK_X, 150, '3 · flushed later', { icon: 'database', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'one statement, four stages — durable at stage 1, settled at stage 3');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── WAL: the change appends to the log ────────────────────────────────── */
  if (view === 'wal') {
    stages('wal');
    railIn = link(CLIENT_X, WAL_X);
    link(WAL_X, PAGE_X, { dashed: true });
    link(PAGE_X, DISK_X, { dashed: true });
    badges.push(pill(WAL_X, 150, 'append + fsync → LSN 1001', { icon: 'wal', cls: 'pill--sst' }));
    badges.push(pill(WAL_X, ROWY + 96, 'DURABLE now ✓', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'the log takes the change first — one cheap sequential append');
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── BUFFERPOOL: page changed in memory, marked dirty, client answered ──── */
  if (view === 'bufferpool') {
    stages('page');
    link(CLIENT_X, WAL_X);
    railIn = link(WAL_X, PAGE_X);
    link(PAGE_X, DISK_X, { dashed: true });
    badges.push(pill(PAGE_X, 150, 'row 42 = 940 · page DIRTY', { icon: 'layers', cls: 'pill--sst' }));
    // the answer returns to the client
    const back = edge([V(PAGE_X - 40, ROWY + 34), V(VW / 2, ROWY + 150), V(CLIENT_X + 20, ROWY + 60)], { arrow: true });
    guides.push(back.guide);
    badges.push(pill(VW / 2, ROWY + 162, 'done → returned to client', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 516, 'changed in RAM, flagged dirty — no random disk write on your path');
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── COMMIT: commit record forced to WAL; data file still holds old row ── */
  if (view === 'commit') {
    stages('wal');
    link(CLIENT_X, WAL_X);
    link(WAL_X, PAGE_X);
    link(PAGE_X, DISK_X, { dashed: true });
    railIn = edge([V(CLIENT_X + 40, ROWY + 40), V(WAL_X - 120, ROWY + 150), V(WAL_X, ROWY + 60)], { arrow: true }).d;
    badges.push(pill(WAL_X, 150, 'COMMIT record → LSN 1002', { icon: 'wal', cls: 'pill--sst' }));
    badges.push(pill(DISK_X, ROWY + 96, 'still holds OLD 900', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(WAL_X - 170, 196, 340, 150, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${WAL_X}" y="236" text-anchor="middle">WRITE-AHEAD RULE · LOG BEFORE DATA</text>`);
    cap(VW / 2, 516, 'log is forced before the data page — a crash here still recovers the write');
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── FLUSH: dirty page drains to the data file in the background ────────── */
  if (view === 'flush') {
    stages('disk');
    link(CLIENT_X, WAL_X);
    link(WAL_X, PAGE_X);
    railOut = link(PAGE_X, DISK_X);
    badges.push(pill(PAGE_X, 150, 'checkpoint · page 7 clean', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(DISK_X, 150, 'on-disk row = 940 ✓', { icon: 'database', cls: 'pill--sst' }));
    badges.push(pill(WAL_X, ROWY + 96, 'WAL trimmed', { icon: 'trash', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'background writer settles the dirty page; the log behind it is recycled');
    flows.push({ id: 'out', kind: 'flush', speed: 120, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the whole durable path, all lit ────────────────────────────── */
  stages('all');
  railIn = link(CLIENT_X, WAL_X);
  link(WAL_X, PAGE_X);
  railOut = link(PAGE_X, DISK_X);
  badges.push(region(WAL_X - 60, 198, 560, 60, '', { r: 22 }));
  badges.push(`<text class="iso-region__t" x="${(WAL_X + DISK_X) / 2}" y="232" text-anchor="middle">LOG FIRST · MEMORY NEXT · DISK LAST</text>`);
  const tags = ['durable at the WAL append', 'fast — data write deferred', 'recoverable by replaying the log'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 420 + i * 44, t, { icon: 'check', w: 320 })));
  flows.push({ id: 'in', kind: 'write', speed: 150, size: 5 });
  flows.push({ id: 'out', kind: 'flush', speed: 120, size: 5 });
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
  <svg class="scene scene--follow-the-write" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Follow the write through the storage engine">
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
