/* dbms-architecture-scene.js — the "DBMS Architecture" scene, in the same
   Designed-to-Scale isometric vocabulary as the other Foundations lessons:
   a vertical stack of dashed layer-bands (query processor · storage manager ·
   disk) holding engine cubes, clients fanning in from the left, a request
   flowing down into the processor and writes flowing down to the files, plus
   a cross-cutting column (transactions · recovery/WAL · catalog) on the right.

   Input: a view-snapshot { view, apps, note, pulse, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'overview', 'frontdoor', 'processor', 'storage', 'crosscutting',
   'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* evenly spread N vertical slots around a centre */
function spread(n, cy, gap) {
  const out = [];
  const start = cy - (n - 1) * gap / 2;
  for (let i = 0; i < n; i++) out.push(start + i * gap);
  return out;
}

/* a short stack of disk tiles = the physical data files */
function diskStack(cx, topY, rx, tone, layers, opts = {}) {
  const tiles = [];
  for (let i = layers - 1; i >= 0; i--) {
    tiles.push(isoTile(cx, topY + i * 16, rx, tone, { h: rx * 0.3, halo: opts.halo && i === 0, pulse: opts.pulse }));
  }
  return tiles; // nearest (i=0) last so it paints on top
}

export function renderDbmsArchitectureScene(snap, opts = {}) {
  const view = snap.view || 'overview';
  const nApps = snap.apps || 3;
  const pulse = snap.pulse || opts.pulse || null;

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];                  // static connector paths
  let railIn = null, railOut = null;  // animated rails

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── clients on the left ──────────────────────────────────────────────── */
  const ys = spread(nApps, 236, 120);
  const apps = ys.map((y) => isoCube(140, y, 44, 48, 'blue', {
    icon: 'server', label: 'Client', sub: '', iconSize: 20, pulse: pulse === 'client',
  }));
  apps.forEach(a => { shadows.push(a.shadow); solids.push(a.g); });

  /* ── Band A — Query Processor ─────────────────────────────────────────── */
  const aX = 360, aY = 60, aW = 380, aH = 150, aCx = aX + aW / 2;
  badges.push(region(aX, aY, aW, aH, '', {}));
  badges.push(pill(aCx, aY - 4, 'Query Processor', { icon: 'database' }));

  const procParts = [
    { cx: 448, cy: 120, mat: 'blue',  icon: 'search', label: 'Parser' },
    { cx: 550, cy: 120, mat: 'amber', icon: 'target', label: 'Optimizer' },
    { cx: 652, cy: 120, mat: 'green', icon: 'bolt',   label: 'Executor' },
  ];
  const procPulse = view === 'processor';
  const proc = procParts.map(p => isoCube(p.cx, p.cy, 44, 48, p.mat, {
    icon: p.icon, label: p.label, iconSize: 20, pulse: procPulse,
  }));
  proc.forEach(c => { shadows.push(c.shadow); solids.push(c.g); });
  if (procPulse) badges.push(`<text class="sst-cap" x="${aCx}" y="${A(aY + aH - 8)}" text-anchor="middle">parse → plan → run</text>`);

  /* ── Band B — Storage Manager ─────────────────────────────────────────── */
  const bX = 360, bY = 230, bW = 380, bH = 134, bCx = bX + bW / 2;
  badges.push(region(bX, bY, bW, bH, '', {}));
  badges.push(pill(bCx, bY - 4, 'Storage Manager', { icon: 'layers' }));

  const storeParts = [
    { cx: 470, cy: 268, mat: 'green', icon: 'layers',   label: 'Buffer', sub: 'pool' },
    { cx: 630, cy: 268, mat: 'lilac', icon: 'database', label: 'Access', sub: 'methods' },
  ];
  const storePulse = view === 'storage';
  const store = storeParts.map(p => isoCube(p.cx, p.cy, 50, 48, p.mat, {
    icon: p.icon, label: p.label, sub: p.sub, iconSize: 20, pulse: storePulse,
  }));
  store.forEach(c => { shadows.push(c.shadow); solids.push(c.g); });
  if (storePulse) badges.push(`<text class="sst-cap" x="${bCx}" y="${A(bY + bH + 2)}" text-anchor="middle">cache hot pages · read/write files</text>`);

  /* ── Band C — the disk (physical files) ───────────────────────────────── */
  const diskTop = 466;
  const disk = diskStack(550, diskTop, 84, 'lilac', 3, {});
  disk.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
  badges.push(`<text class="sst-cap" x="550" y="${A(disk[disk.length - 1].base[1] + 16)}" text-anchor="middle">data files</text>`);

  /* ── clients fan into Band A's left edge ──────────────────────────────── */
  apps.forEach((a, i) => {
    const e = edge([
      V(a.verts.E.x - 2, a.front[1]),
      V((a.verts.E.x + aX) / 2, a.front[1]),
      V(aX - 6, aY + aH / 2),
    ], { arrow: true });
    guides.push(e.guide);
    if (i === 0) railIn = e.d;
  });

  /* ── Band A → Band B → disk (the descent) ─────────────────────────────── */
  const ab = edge([V(aCx, aY + aH - 4), V(aCx, (aY + aH + bY) / 2), V(bCx, bY + 4)], { arrow: true });
  guides.push(ab.guide);
  const bd = edge([V(bCx, bY + bH - 4), V(bCx, (bY + bH + diskTop) / 2), V(disk[0].top[0], disk[0].top[1] - 2)], { arrow: true, dashed: true });
  guides.push(bd.guide); railOut = bd.d;

  /* ── FRONT DOOR view: session wrapper around the client → processor hop ── */
  if (view === 'frontdoor') {
    badges.push(region(196, 150, 232, 170, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="312" y="312" text-anchor="middle">authenticate · open session</text>`);
    badges.push(pill(300, 168, 'Session', { icon: 'app', cls: 'pill--sst' }));
  }

  /* ── CROSS-CUTTING view: a column spanning every layer on the right ────── */
  if (view === 'crosscutting') {
    badges.push(region(765, 60, 168, 404, '', { r: 20 }));
    const cc = [
      { y: 140, text: 'Txn manager', icon: 'merge' },
      { y: 262, text: 'Recovery / WAL', icon: 'wal' },
      { y: 384, text: 'Catalog', icon: 'listOrdered' },
    ];
    cc.forEach(c => badges.push(pill(849, c.y, c.text, { icon: c.icon, w: 150 })));
    const link = edge([V(765, 262), V(748, 262), V(740, 268)], { dashed: true });
    guides.push(link.guide);
  }

  const flows = [
    { id: 'in', kind: 'read', speed: 150, size: 5 },
    { id: 'out', kind: 'write', speed: 130, size: 6 },
  ];

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
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="DBMS architecture layers">
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
