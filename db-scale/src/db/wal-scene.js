/* wal-scene.js — the "Write-Ahead Log (WAL)" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes/slabs with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'risk' (a page torn in place), 'wal' (log before heap), 'order' (the
   write-ahead ordering), 'replay' (recovery by replay), 'tradeoff', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const LOGX = 500, LOGY = 300, LOGRX = 150;

/* a jagged red crack down the front face of a cube — a torn page */
function fault(cube) {
  const a = cube.verts.S, b = cube.verts.Sb;
  const n = 5, pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const jitter = (i > 0 && i < n) ? (i % 2 ? 15 : -15) : 0;
    const x = a.x + (b.x - a.x) * t + jitter;
    const y = a.y + (b.y - a.y) * t;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `<polyline points="${pts.join(' ')}" fill="none" stroke="#e5484d" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`;
}

export function renderWalScene(snap, opts = {}) {
  const view = snap.view || 'wal';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── TRADE-OFF: two columns, no tower ─────────────────────────────────── */
  if (view === 'tradeoff') {
    const col = (x, title, ic, mat, rows) => {
      badges.push(region(x, 92, 300, 408, '', { r: 22 }));
      badges.push(pill(x + 150, 112, title, { icon: ic, w: 240 }));
      const head = isoCube(x + 150, 174, 62, 56, mat, { icon: ic, iconSize: 22 });
      shadows.push(head.shadow); solids.push(head.g);
      rows.forEach((t, i) => badges.push(pill(x + 150, 300 + i * 48, t, { icon: t[0] === '+' ? 'check' : 'alert', w: 276 })));
    };
    col(110, 'The cost', 'scale', 'rose', [
      '− every change written twice',
      '− fsync adds commit latency',
      '− log must be archived & trimmed',
    ]);
    col(630, 'The payoff', 'check', 'green', [
      '+ sequential log writes are cheap',
      '+ random page writes deferred',
      '+ durability you cannot fake',
    ]);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── RISK: one page overwritten in place, torn by a crash ─────────────── */
  if (view === 'risk') {
    const page = isoCube(520, 300, 104, 96, 'lilac', { icon: 'file', label: 'Data page', sub: '8 KB · in place', iconSize: 26 });
    shadows.push(page.shadow); solids.push(page.g);
    overlays.push(fault(page));
    badges.push(region(360, 150, 320, 300, '', { r: 22 }));
    badges.push(pill(520, 168, 'overwrite in place', { icon: 'file', cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="520" y="436" text-anchor="middle">CRASH MID-WRITE · TORN PAGE · NO TRACE</text>`);
    badges.push(`<text class="sst-cap" x="520" y="${A(page.base[1] + 18)}" text-anchor="middle">part new, part old — unrecoverable</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── all remaining views: the log + the heap pages ────────────────────── */
  const hasWriter = (view === 'wal' || view === 'order');
  const ghostPage = (view === 'order');
  const logHalo = (view !== 'replay');

  let writer = null;
  if (hasWriter) {
    writer = isoCube(150, 250, 54, 62, 'blue', { icon: 'app', label: 'Writer', sub: 'change', iconSize: 24 });
    shadows.push(writer.shadow); solids.push(writer.g);
  }

  const log = isoCube(LOGX, LOGY, LOGRX, 40, 'amber', {
    icon: 'listOrdered', label: 'WAL', sub: 'append-only log', iconSize: 22, halo: logHalo,
  });
  shadows.push(log.shadow); if (logHalo) halos.push(log.halo); solids.push(log.g);

  const pg1 = isoCube(810, 222, 70, 56, 'lilac', { icon: 'file', label: 'Page', sub: 'heap', iconSize: 20, ghost: ghostPage });
  const pg2 = isoCube(832, 322, 70, 56, 'lilac', { icon: 'file', label: 'Page', sub: 'heap', iconSize: 20, ghost: ghostPage });
  [pg1, pg2].forEach(p => { shadows.push(p.shadow); solids.push(p.g); });

  badges.push(pill(LOGX, 168, 'LSN grows →', { icon: 'listOrdered', cls: 'pill--sst' }));

  if (view === 'wal') {
    const e = edge([
      V(writer.verts.E.x - 2, writer.front[1]),
      V((writer.verts.E.x + log.verts.W.x) / 2, (writer.front[1] + log.front[1]) / 2),
      V(log.verts.W.x - 6, log.verts.W.y + 6),
    ], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    badges.push(`<text class="sst-cap" x="820" y="${A(pg2.base[1] + 18)}" text-anchor="middle">heap not yet touched</text>`);
  }

  else if (view === 'order') {
    const e1 = edge([
      V(writer.verts.E.x - 2, writer.front[1]),
      V((writer.verts.E.x + log.verts.W.x) / 2, (writer.front[1] + log.front[1]) / 2),
      V(log.verts.W.x - 6, log.verts.W.y + 6),
    ], { arrow: true });
    guides.push(e1.guide); railIn = e1.d;
    const e2 = edge([
      V(log.verts.E.x - 2, log.front[1]),
      V((log.verts.E.x + pg2.verts.W.x) / 2, log.front[1] + 8),
      V(pg2.verts.W.x - 6, pg2.verts.W.y + 6),
    ], { arrow: true, dashed: true });
    guides.push(e2.guide); railOut = e2.d;
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 }, { id: 'out', kind: 'write', speed: 150, size: 6 });
    badges.push(pill(312, 190, '1 · log → disk (fsync)', { icon: 'check', w: 208 }));
    badges.push(pill(690, 252, '2 · page may flush', { icon: 'file', w: 196 }));
  }

  else if (view === 'replay') {
    overlays.push(fault(pg1)); overlays.push(fault(pg2));
    const e = edge([
      V(log.verts.E.x - 2, log.front[1]),
      V((log.verts.E.x + pg1.verts.W.x) / 2, log.front[1] - 10),
      V(pg1.verts.W.x - 6, pg1.verts.W.y + 6),
    ], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    flows.push({ id: 'in', kind: 'read', speed: 170, size: 5 });
    badges.push(pill(500, 418, 'replay LSN 0 → end', { icon: 'listOrdered', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="820" y="${A(pg2.base[1] + 18)}" text-anchor="middle">torn pages rebuilt from log</text>`);
  }

  else if (view === 'recap') {
    const e = edge([V(log.verts.W.x + 10, log.verts.W.y + 4), V(log.verts.E.x - 10, log.verts.E.y + 4)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    flows.push({ id: 'in', kind: 'write', speed: 160, size: 5 });
    const tags = ['durable', 'fast recovery', 'ships to replicas'];
    tags.forEach((t, i) => badges.push(pill(828, 150 + i * 56, t, { icon: 'check', w: 180 })));
    badges.push(`<text class="sst-cap" x="820" y="${A(pg2.base[1] + 18)}" text-anchor="middle">pages are just a cache of the log</text>`);
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
  <svg class="scene scene--wal" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Write-ahead log and recovery">
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
