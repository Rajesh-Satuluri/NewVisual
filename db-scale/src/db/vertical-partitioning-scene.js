/* vertical-partitioning-scene.js — the "Vertical Partitioning" scene, in the
   shared Designed-to-Scale isometric vocabulary: rounded iso cubes with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'wide' (one wide table), 'split' (hot/cold column groups), 'readhot'
   (read hits hot group only), 'columnar' (one partition per column), 'stitch'
   (cross-group query rejoins by key), 'recap' (two axes of partitioning). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const ROWY = 300;

/* the nine columns of the example users table */
const HOT = ['id', 'name', 'email'];
const COLD = ['avatar', 'bio', 'settings', 'prefs', 'audit', 'blob'];

export function renderVerticalPartitioningScene(snap, opts = {}) {
  const view = snap.view || 'split';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a column cube; caller keeps the coords, we never read them off the cube
  const col = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 40, o.h || 38, mat, {
      icon: o.icon || 'grid', label, sub: o.sub || '', iconSize: 15,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── WIDE: a single wide table, nine columns side by side ──────────────── */
  if (view === 'wide') {
    const cols = [...HOT, ...COLD];
    const n = cols.length, x0 = 120, step = (VW - 240) / (n - 1);
    cols.forEach((name, i) => {
      const hot = i < 3;
      col(x0 + i * step, ROWY, name, hot ? 'green' : 'slate',
        { rx: 34, h: 34, icon: hot ? 'bolt' : 'folder', sub: hot ? 'hot' : 'cold' });
    });
    badges.push(region(96, 236, VW - 192, 150, '', { r: 22 }));
    badges.push(pill(VW / 2, 214, 'users · one physical row', { icon: 'grid', cls: 'pill--sst' }));
    cap(VW / 2, 440, 'reading a name still drags avatar, bio and settings off disk');
    badges.push(pill(VW / 2, 478, 'every read pays for 9 columns, needs 3', { icon: 'alert' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SPLIT: hot group vs cold group ────────────────────────────────────── */
  if (view === 'split') {
    const hx0 = 150, cx0 = 600, step = 120;
    HOT.forEach((name, i) => col(hx0 + i * step, ROWY, name, 'green',
      { rx: 38, h: 40, icon: 'bolt', halo: i === 0 }));
    const cstep = (VW - 60 - cx0) / (COLD.length - 1);
    COLD.forEach((name, i) => col(cx0 + i * cstep, ROWY, name, 'slate',
      { rx: 30, h: 30, icon: 'folder' }));
    badges.push(region(110, 240, 400, 150, '', { r: 22 }));
    badges.push(region(560, 240, 430, 150, '', { r: 22 }));
    badges.push(pill(310, 220, 'HOT partition · id · name · email', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(pill(775, 220, 'COLD partition · avatar · bio · …', { icon: 'folder', cls: 'pill--sst' }));
    cap(VW / 2, 440, 'same rows, split by column — grouped by how often each is read');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── READHOT: a read lands on the hot group only ───────────────────────── */
  if (view === 'readhot') {
    const hx0 = 180, step = 120;
    HOT.forEach((name, i) => col(hx0 + i * step, ROWY, name, 'green',
      { rx: 38, h: 40, icon: 'bolt', halo: true, sub: 'read' }));
    const cx0 = 640, cstep = (VW - 60 - cx0) / (COLD.length - 1);
    COLD.forEach((name, i) => col(cx0 + i * cstep, ROWY, name, 'slate',
      { rx: 28, h: 28, icon: 'folder', ghost: true, sub: 'idle' }));
    // client fans a read into the hot partition
    col(130, 120, 'query', 'blue', { rx: 40, h: 36, icon: 'app' });
    const e = edge([V(150, 158), V(240, 220), V(hx0 + step, ROWY - 34)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(region(120, 244, 420, 150, '', { r: 22 }));
    badges.push(region(590, 250, 400, 136, '', { r: 22 }));
    badges.push(pill(330, 224, 'reads only the hot group', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(790, 226, 'cold group untouched', { icon: 'moon', cls: 'pill--sst' }));
    cap(VW / 2, 440, 'three slim columns, densely packed — the avatar never moves');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── COLUMNAR: one partition per column, a scan sweeps one ─────────────── */
  if (view === 'columnar') {
    const cols = [...HOT, ...COLD];
    const n = cols.length, x0 = 120, step = (VW - 240) / (n - 1);
    const scanIdx = 4;
    cols.forEach((name, i) => {
      const on = i === scanIdx;
      col(x0 + i * step, ROWY, name, on ? 'amber' : 'lilac',
        { rx: 32, h: 70, icon: on ? 'search' : 'layers', halo: on, sub: on ? 'scan' : '' });
    });
    badges.push(pill(VW / 2, 200, 'column store · one partition per column', { icon: 'layers', cls: 'pill--sst' }));
    badges.push(pill(x0 + scanIdx * step, 438, 'SUM() sweeps one contiguous run', { icon: 'search', cls: 'pill--sst' }));
    cap(VW / 2, 478, 'same-typed values pack tight and compress — the OLAP advantage');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── STITCH: cross-group query reads both and rejoins by key ───────────── */
  if (view === 'stitch') {
    const hx = 300, cx = 760;
    col(hx, ROWY, 'hot group', 'green', { rx: 58, h: 52, icon: 'bolt', halo: true, sub: 'id · name' });
    col(cx, ROWY, 'cold group', 'slate', { rx: 58, h: 52, icon: 'folder', sub: 'id · avatar' });
    col(VW / 2, 130, 'query', 'blue', { rx: 46, h: 40, icon: 'app', sub: 'name + avatar' });
    const e1 = edge([V(VW / 2 - 20, 170), V(hx + 40, 220), V(hx, ROWY - 46)], { arrow: true });
    const e2 = edge([V(VW / 2 + 20, 170), V(cx - 40, 220), V(cx, ROWY - 46)], { arrow: true });
    guides.push(e1.guide, e2.guide); railOut = e1.d;
    // the rejoin link across the two groups on the shared key
    const j = edge([V(hx + 60, ROWY + 28), V(VW / 2, ROWY + 78), V(cx - 60, ROWY + 28)], { dashed: true, arrow: true });
    guides.push(j.guide);
    badges.push(pill(VW / 2, ROWY + 102, 'rejoin on user_id', { icon: 'key', cls: 'pill--sst' }));
    cap(VW / 2, 470, 'needs both groups — an extra join is the price of the split');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: two axes of partitioning ───────────────────────────────────── */
  col(320, ROWY, 'columns', 'green', { rx: 62, h: 56, icon: 'grid', halo: true, sub: 'vertical' });
  col(760, ROWY, 'rows', 'lilac', { rx: 62, h: 56, icon: 'layers', sub: 'horizontal' });
  badges.push(region(118, 196, 884, 150, '', { r: 24 }));
  badges.push(pill(320, 206, 'VERTICAL · split by column', { icon: 'bolt', cls: 'pill--sst' }));
  badges.push(pill(760, 206, 'HORIZONTAL · split by row', { icon: 'layers', cls: 'pill--sst' }));
  const tags = ['group hot vs cold fields', 'every group keeps the key', 'split where access patterns diverge'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 430 + i * 44, t, { icon: 'check', w: 340 })));
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
  <svg class="scene scene--vertical-partitioning" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Vertical partitioning">
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
