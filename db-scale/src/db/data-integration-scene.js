/* data-integration-scene.js — the "Data Integration" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'tangle' (N² point-to-point dual writes), 'log' (one ordered log,
   stores subscribe), 'order' (numbered sequence + per-consumer cursors),
   'replay' (a new store replays the whole log), 'async' (consumers trail the
   head by lag), 'recap' (one log spine, many derived stores). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderDataIntegrationScene(snap, opts = {}) {
  const view = snap.view || 'log';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a store cube; caller keeps the coords, never read back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 44, o.h || 40, mat, {
      icon: o.icon || 'database', label, sub: o.sub || '', iconSize: 17,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // one log cell (a flat amber tile) at (x,y); returns its kept center
  const cell = (x, y, label, o = {}) => {
    const t = isoTile(x, y, o.rx || 34, o.mat || 'amber', { ghost: !!o.ghost, halo: !!o.halo });
    shadows.push(t.shadow); if (o.halo) halos.push(t.halo); solids.push(t.g);
    if (label) badges.push(`<text class="sst-cap" x="${A(x)}" y="${A(y + 4)}" text-anchor="middle">${esc(label)}</text>`);
    return { x, y };
  };

  /* ── TANGLE: five stores, every pair wired (N² dual writes) ─────────────── */
  if (view === 'tangle') {
    const cx = 520, cy = 268, R = 300, Ry = 150;
    const defs = [
      { lbl: 'OLTP', ic: 'database', mat: 'blue' },
      { lbl: 'search', ic: 'search', mat: 'green' },
      { lbl: 'cache', ic: 'layers', mat: 'rose' },
      { lbl: 'warehouse', ic: 'database', mat: 'lilac' },
      { lbl: 'service', ic: 'app', mat: 'slate' },
    ];
    const pts = defs.map((d, i) => {
      const a = -Math.PI / 2 + i * (2 * Math.PI / 5);
      return { x: cx + R * Math.cos(a), y: cy + Ry * Math.sin(a) };
    });
    // all pairs: N² tangle of dual-write links (drawn behind the cubes)
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const e = edge([V(pts[i].x, pts[i].y), V(pts[j].x, pts[j].y)], { dashed: true, r: 2 });
        guides.push(e.guide);
      }
    }
    pts.forEach((p, i) => node(p.x, p.y, defs[i].lbl, defs[i].mat, { icon: defs[i].ic, sub: 'dual-writes' }));
    badges.push(pill(cx, 70, 'N stores → up to N² links', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(150, 470, 740, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${cx}" y="508" text-anchor="middle">RACES · DRIFT · NO AGREED ORDER</text>`);
    cap(cx, 540, 'two writes land in different orders at different stores');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LOG: source → one ordered log → subscribing stores ────────────────── */
  if (view === 'log') {
    const srcX = 150, srcY = 280;
    node(srcX, srcY, 'OLTP', 'blue', { icon: 'database', sub: 'source' });
    // central ordered log: a short column of amber cells
    const logX = 470, logY0 = 150, dy = 86;
    const logCells = [];
    for (let i = 0; i < 4; i++) logCells.push(cell(logX, logY0 + i * dy, '#' + (i + 1)));
    badges.push(pill(logX, logY0 - 56, 'ordered log', { icon: 'listOrdered', cls: 'pill--sst' }));
    // source publishes into the log
    const ein = edge([V(srcX + 30, srcY - 20), V(logX - 120, 220), V(logX - 40, logY0 + dy)], { arrow: true });
    guides.push(ein.guide); railIn = ein.d;
    // three subscribers on the right
    const subs = [
      { y: 150, lbl: 'search', ic: 'search', mat: 'green' },
      { y: 280, lbl: 'cache', ic: 'layers', mat: 'rose' },
      { y: 410, lbl: 'warehouse', ic: 'database', mat: 'lilac' },
    ];
    const subX = 850;
    subs.forEach((s, k) => {
      node(subX, s.y, s.lbl, s.mat, { icon: s.ic, sub: 'consumer' });
      const e = edge([V(logX + 40, logY0 + dy * 1.5), V((logX + subX) / 2, s.y), V(subX - 46, s.y)], { arrow: true });
      guides.push(e.guide);
      if (k === 0) railOut = e.d;
    });
    badges.push(pill(500, 506, 'publish once · subscribe many', { icon: 'check' }));
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ORDER: numbered sequence + per-consumer cursors ───────────────────── */
  if (view === 'order') {
    const y = 210, x0 = 150, dx = 118, n = 6;
    const xs = [];
    for (let i = 0; i < n; i++) { const x = x0 + i * dx; xs.push(x); cell(x, y, '#' + (i + 1)); }
    badges.push(pill(VW / 2, 120, 'one total order — same sequence for every consumer', { icon: 'listOrdered', cls: 'pill--sst' }));
    // two consumers reading at different offsets
    const cons = [
      { x: xs[5], lbl: 'search', ic: 'search', mat: 'green', off: '#6' },
      { x: xs[3], lbl: 'warehouse', ic: 'database', mat: 'lilac', off: '#4' },
    ];
    const cy = 400;
    cons.forEach((c, k) => {
      node(c.x, cy, c.lbl, c.mat, { icon: c.ic, sub: 'at ' + c.off });
      const e = edge([V(c.x, y + 28), V(c.x, cy - 32)], { arrow: true });
      guides.push(e.guide);
      badges.push(pill(c.x, 300, 'cursor ' + c.off, { icon: 'chevron', cls: 'pill--sst' }));
      if (k === 0) railOut = e.d;
    });
    cap(VW / 2, 500, 'each consumer keeps its own cursor and resumes where it left off');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── REPLAY: a new store replays the whole log from offset 0 ────────────── */
  if (view === 'replay') {
    const y = 200, x0 = 150, dx = 118, n = 6;
    const xs = [];
    for (let i = 0; i < n; i++) { const x = x0 + i * dx; xs.push(x); cell(x, y, '#' + (i + 1)); }
    badges.push(pill(VW / 2, 112, 'durable history · offset 0 → head', { icon: 'listOrdered', cls: 'pill--sst' }));
    // sweep arrow across the whole log
    const sweep = edge([V(xs[0] - 10, y + 70), V(xs[n - 1] + 10, y + 70)], { arrow: true, r: 2 });
    guides.push(sweep.guide); railOut = sweep.d;
    badges.push(pill(VW / 2, y + 100, 'replay', { icon: 'chevron', cls: 'pill--sst' }));
    // the fresh store catching up
    const nx = VW / 2;
    node(nx, 410, 'new store', 'green', { icon: 'app', sub: 'rebuilding', halo: true });
    const e = edge([V(xs[n - 1] + 10, y + 70), V(nx + 120, 360), V(nx + 46, 410)], { arrow: true });
    guides.push(e.guide);
    cap(VW / 2, 506, 'point a fresh consumer at offset 0 and let it rebuild its own copy');
    flows.push({ id: 'out', kind: 'read', speed: 220, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ASYNC: consumers trail the head by some lag ───────────────────────── */
  if (view === 'async') {
    const y = 200, x0 = 150, dx = 118, n = 6;
    const xs = [];
    for (let i = 0; i < n; i++) { const x = x0 + i * dx; xs.push(x); cell(x, y, '#' + (i + 1), { halo: i === n - 1 }); }
    badges.push(pill(xs[n - 1], y - 56, 'head · #6', { icon: 'bolt', cls: 'pill--sst' }));
    // two consumers behind the head
    const cons = [
      { x: xs[4], lbl: 'search', ic: 'search', mat: 'green', sub: '1 behind' },
      { x: xs[2], lbl: 'warehouse', ic: 'database', mat: 'lilac', sub: '3 behind' },
    ];
    const cy = 400;
    cons.forEach(c => {
      node(c.x, cy, c.lbl, c.mat, { icon: c.ic, sub: c.sub });
      const e = edge([V(c.x, y + 28), V(c.x, cy - 32)], { arrow: true });
      guides.push(e.guide);
    });
    badges.push(region(118, 342, 804, 150, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="470" text-anchor="middle">EVENTUALLY CONSISTENT · CONSUMERS MUST BE IDEMPOTENT</text>`);
    cap(VW / 2, 540, 'a read right after a write may hit a store that has not applied it yet');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: one log spine, many derived stores ─────────────────────────── */
  const sx = 150, sy = 290;
  node(sx, sy, 'OLTP', 'blue', { icon: 'database', sub: 'source' });
  const logX = 430, logY0 = 170, dy = 80;
  for (let i = 0; i < 4; i++) cell(logX, logY0 + i * dy, '#' + (i + 1), { halo: i === 1 });
  badges.push(pill(logX, logY0 - 54, 'the log · source of truth', { icon: 'listOrdered', cls: 'pill--sst' }));
  const ein2 = edge([V(sx + 30, sy - 20), V(logX - 110, 240), V(logX - 40, logY0 + dy)], { arrow: true });
  guides.push(ein2.guide);
  const derived = [
    { y: 150, lbl: 'search', ic: 'search', mat: 'green' },
    { y: 290, lbl: 'cache', ic: 'layers', mat: 'rose' },
    { y: 430, lbl: 'warehouse', ic: 'database', mat: 'lilac' },
  ];
  const dX = 820;
  derived.forEach(s => {
    node(dX, s.y, s.lbl, s.mat, { icon: s.ic, sub: 'derived' });
    const e = edge([V(logX + 40, logY0 + dy * 1.5), V((logX + dX) / 2, s.y), V(dX - 46, s.y)], { arrow: true });
    guides.push(e.guide);
  });
  badges.push(pill(VW / 2, 522, 'one ordered log · deterministic · rebuildable', { icon: 'check', w: 360 }));
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
  <svg class="scene scene--data-integration" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Data integration via one ordered log">
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
