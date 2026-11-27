/* derived-data-scene.js — the "Derived Data" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'dualwrite' (app hand-writes four systems), 'classify' (record vs
   derived), 'fanout' (ordered log fans out one-way), 'rebuild' (replay builds a
   fresh view), 'lag' (freshness gap), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderDerivedDataScene(snap, opts = {}) {
  const view = snap.view || 'fanout';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a node; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'database', label, sub: o.sub || '', iconSize: o.iconSize || 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // a flat log-segment tile row, positions kept locally
  const logRow = (cx, cy, n, mat, o = {}) => {
    const gap = o.gap || 46, w = o.w || 40;
    const x0 = cx - (n - 1) * gap / 2;
    for (let i = 0; i < n; i++) {
      const t = isoTile(x0 + i * gap, cy, w, mat, { h: o.h || 14, ghost: o.ghost });
      shadows.push(t.shadow); solids.push(t.g);
    }
    return { x0, gap, right: x0 + (n - 1) * gap };
  };

  /* ── DUALWRITE: the app writes to four systems by hand ─────────────────── */
  if (view === 'dualwrite') {
    const ax = VW / 2, ay = 118;
    node(ax, ay, 'app', 'blue', { icon: 'app', rx: 48, h: 40 });
    const tx = [170, 420, 630, 880], ty = 330;
    const labels = [['record', 'database'], ['search', 'search'], ['cache', 'bolt'], ['warehouse', 'grid']];
    tx.forEach((x, i) => {
      node(x, ty, labels[i][0], i === 0 ? 'amber' : 'slate', { icon: labels[i][1], sub: i === 0 ? 'row' : 'copy' });
      const e = edge([V(ax, ay + 44), V((ax + x) / 2, ay + 120), V(x, ty - 36)], { arrow: true, dashed: i > 0 });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    badges.push(pill(ax, ay - 70, '4 writes, by hand', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(120, 408, 800, 86, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="446" text-anchor="middle">PARTIAL FAILURE · RACES · NO SINGLE ORDER</text>`);
    cap(VW / 2, 522, 'any write can fail or race — the four copies drift apart');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── CLASSIFY: one system of record vs three derived views ─────────────── */
  if (view === 'classify') {
    const rx = 250, ry = 300;
    node(rx, ry, 'record', 'amber', { icon: 'database', rx: 54, h: 48, halo: true, sub: 'source of truth' });
    badges.push(pill(rx, ry - 96, 'each fact, written once', { icon: 'check', cls: 'pill--sst' }));
    badges.push(region(120, 196, 300, 240, 'SYSTEM OF RECORD', { r: 22, rot: 0 }));

    const dx = [620, 820, 720], dy = [258, 258, 392];
    const dlab = [['index', 'search'], ['cache', 'bolt'], ['warehouse', 'grid']];
    dx.forEach((x, i) => node(x, dy[i], dlab[i][0], 'slate', { icon: dlab[i][1], sub: 'derived' }));
    badges.push(region(540, 196, 420, 268, 'DERIVED · RECOMPUTABLE', { r: 22 }));
    cap(VW / 2, 520, 'if you can rebuild it from the record, it is derived — not the truth');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── FANOUT: ordered log fans one-way to three derived views ───────────── */
  if (view === 'fanout') {
    const recx = 150, recy = 300;
    node(recx, recy, 'record', 'amber', { icon: 'database', rx: 48, h: 44, halo: true, sub: 'of truth' });
    // ordered log as a tile row across the middle
    const logY = 212;
    const lr = logRow(560, logY, 6, 'green', { gap: 52, w: 44, h: 15 });
    badges.push(pill(560, logY - 62, 'ordered change log · append-only', { icon: 'listOrdered', cls: 'pill--sst' }));
    // record → log
    const e0 = edge([V(recx + 42, recy - 20), V(340, logY + 40), V(lr.x0 - 20, logY)], { arrow: true });
    guides.push(e0.guide); railOut = e0.d;
    // log → three derived views on the right
    const dx = 900, dys = [150, 300, 450];
    const dlab = [['index', 'search'], ['cache', 'bolt'], ['warehouse', 'grid']];
    dys.forEach((y, i) => {
      node(dx, y, dlab[i][0], 'slate', { icon: dlab[i][1], sub: 'subscribes' });
      const e = edge([V(lr.right + 22, logY + 4), V((lr.right + dx) / 2, (logY + y) / 2), V(dx - 42, y - 10)], { arrow: true });
      guides.push(e.guide);
    });
    cap(VW / 2, 540, 'one writer, one order — every derived view applies the same events');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── REBUILD: a fresh index replays the whole log ──────────────────────── */
  if (view === 'rebuild') {
    const logY = 180;
    const lr = logRow(VW / 2, logY, 8, 'green', { gap: 56, w: 46, h: 15 });
    badges.push(pill(VW / 2, logY - 58, 'replay from offset 0 →', { icon: 'listOrdered', cls: 'pill--sst' }));
    // live index (dim) and new index (halo) both below, both fed by the log
    const liveX = 330, newX = 720, ny = 390;
    node(liveX, ny, 'index v1', 'slate', { icon: 'search', sub: 'live', ghost: true });
    node(newX, ny, 'index v2', 'lilac', { icon: 'search', sub: 'rebuilding', halo: true });
    const eL = edge([V(lr.x0, logY + 26), V(liveX, logY + 150), V(liveX, ny - 40)], { arrow: true, dashed: true });
    const eN = edge([V(lr.right, logY + 26), V(newX, logY + 150), V(newX, ny - 40)], { arrow: true });
    guides.push(eL.guide, eN.guide); railOut = eN.d;
    badges.push(pill(newX, ny + 92, 'build beside the old, then cut over', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 548, 'a derived view is a function of the log — replay reconstructs it exactly');
    flows.push({ id: 'out', kind: 'write', speed: 130, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LAG: derived view trails the record by a freshness gap ────────────── */
  if (view === 'lag') {
    const recx = 230, recy = 300, derx = 810, dery = 300;
    node(recx, recy, 'record', 'amber', { icon: 'database', rx: 48, h: 44, sub: 'offset 1800' });
    node(derx, dery, 'index', 'slate', { icon: 'search', rx: 48, h: 44, sub: 'offset 1792' });
    const e = edge([V(recx + 44, recy - 8), V(VW / 2, 236), V(derx - 44, dery - 8)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(recx, recy - 92, 'has the newest write', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(derx, dery - 92, 'a few events behind', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(region(430, 206, 200, 190, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="530" y="300" text-anchor="middle">FRESHNESS GAP</text>`);
    cap(VW / 2, 470, 'correct, just behind — for up-to-the-moment reads, ask the record');
    flows.push({ id: 'out', kind: 'read', speed: 170, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: one record, one log, reproducible views ────────────────────── */
  const recx = 180, recy = 300;
  node(recx, recy, 'record', 'amber', { icon: 'database', rx: 46, h: 44, halo: true, sub: 'of truth' });
  const logY = 300;
  const lr = logRow(520, logY, 5, 'green', { gap: 50, w: 42, h: 14 });
  const e0 = edge([V(recx + 42, recy), V(lr.x0 - 24, logY)], { arrow: true });
  guides.push(e0.guide);
  const dx = 880, dys = [180, 300, 420];
  const dlab = [['index', 'search'], ['cache', 'bolt'], ['warehouse', 'grid']];
  dys.forEach((y, i) => {
    node(dx, y, dlab[i][0], 'slate', { icon: dlab[i][1] });
    const e = edge([V(lr.right + 22, logY), V((lr.right + dx) / 2, (logY + y) / 2), V(dx - 42, y - 8)], { arrow: true });
    guides.push(e.guide);
  });
  badges.push(region(118, 470, 884, 92, 'one record · one ordered log · reproducible derived views', { r: 22 }));
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
  <svg class="scene scene--derived-data" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Derived data and systems of record">
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
