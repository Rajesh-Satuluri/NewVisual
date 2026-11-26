/* why-databases-scene.js — the "Why Databases?" scene, in the same
   Designed-to-Scale isometric vocabulary as the LSM-Tree and DBMS lessons:
   rounded iso cubes with icon glyphs and labels, soft shadows, halos, pill
   badges, dashed logical regions, routed arrow connectors, a faded iso grid,
   and particle rails.

   Input: a view-snapshot { view, note, dbmsSub, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'sheet' (one shared spreadsheet, no coordination), then the database
   earning one guarantee per step: 'persist', 'concurrent', 'query',
   'integrity', 'recap'. */

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

export function renderWhyDatabasesScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  const pulse = snap.pulse || opts.pulse || null;

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];                  // static connector paths
  let railIn = null, railOut = null;  // animated rails

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── clients on the left ──────────────────────────────────────────────── */
  const nApps = view === 'concurrent' ? 5 : 3;
  const many = nApps >= 4;
  const appRx = many ? 40 : 54;
  const appH = many ? 46 : 62;
  const appX = 150;
  const ys = spread(nApps, 236, many ? 96 : 150);
  const apps = ys.map((y) => isoCube(appX, y, appRx, appH, 'blue', {
    icon: 'server', label: 'Client',
    sub: nApps <= 3 ? 'edits' : '', pulse: pulse === 'client',
    iconSize: many ? 20 : 26,
  }));
  apps.forEach(a => { shadows.push(a.shadow); solids.push(a.g); });

  /* ── SHEET VIEW: one shared spreadsheet, every app poking at it ────────── */
  if (view === 'sheet') {
    // a grid of flat tiles = the spreadsheet; one rose tile = a conflicting cell
    const gx0 = 520, gy0 = 200, cols = 3, rows = 3, cw = 72, ch = 34;
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = gx0 + c * cw;
        const cy = gy0 + r * ch + c * 16; // iso stagger
        const tone = (r === 1 && c === 1) ? 'rose' : 'slate';
        const t = isoTile(cx, cy, 34, tone, { h: 10 });
        cells.push(t);
      }
    }
    cells.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    badges.push(pill(632, 150, 'one shared sheet', { icon: 'file', cls: 'pill--sst' }));

    // every client wires straight into the sheet — tangled, dashed, no order
    const centreCell = cells[4]; // middle cell (the contested one)
    apps.forEach((a, i) => {
      const tgt = cells[[0, 4, 8][i % 3]];
      const e = edge([
        V(a.verts.E.x - 2, a.front[1]),
        V((a.verts.E.x + tgt.top[0]) / 2, a.front[1] + 6),
        V(tgt.top[0] - 8, tgt.top[1] + 2),
      ], { arrow: true, dashed: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d;
    });

    badges.push(region(468, 150, 320, 288, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="628" y="476" text-anchor="middle">LOST UPDATES · NO HISTORY · BREAKS AT SCALE</text>`);
    badges.push(`<text class="sst-cap" x="${A(centreCell.top[0])}" y="${A(centreCell.base[1] + 30)}" text-anchor="middle">two people, same cell</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: railIn ? [{ id: 'in', kind: 'read', speed: 150, size: 5 }] : [], note: snap.note });
  }

  /* ── the DATABASE in the middle (persist / concurrent / query / … ) ────── */
  const dbmsCx = 548, dbmsCy = 168, dbmsRx = 116, dbmsH = 124;
  const dbms = isoCube(dbmsCx, dbmsCy, dbmsRx, dbmsH, 'green', {
    icon: 'database', label: 'Database',
    sub: snap.dbmsSub || 'the contract',
    halo: true, pulse: view === 'concurrent' || pulse === 'dbms',
  });
  shadows.push(dbms.shadow); halos.push(dbms.halo); solids.push(dbms.g);

  // clients fan into the database
  apps.forEach((a, i) => {
    const e = edge([
      V(a.verts.E.x - 2, a.front[1]),
      V((a.verts.E.x + dbms.verts.W.x) / 2, (a.front[1] + dbms.front[1]) / 2),
      V(dbms.verts.W.x - 6, dbms.verts.W.y + 10),
    ], { arrow: true });
    guides.push(e.guide);
    if (i === 0) railIn = e.d;
  });

  // database → durable store
  const diskTop = 456;
  const disk = diskStack(dbmsCx, diskTop, 82, 'lilac', 2, {});
  disk.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
  const oe = edge([
    V(dbms.base[0], dbms.base[1] - 4),
    V(dbms.base[0], (dbms.base[1] + diskTop) / 2),
    V(disk[0].top[0], disk[0].top[1] - 2),
  ], { arrow: true, dashed: true });
  guides.push(oe.guide); railOut = oe.d;

  if (view === 'query') {
    badges.push(pill(dbmsCx, 414, "WHERE total > 100", { icon: 'search', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="${A(dbmsCx)}" y="${A(disk[disk.length - 1].base[1] + 16)}" text-anchor="middle">index seek — not a full scan</text>`);
  } else if (view === 'persist') {
    badges.push(`<text class="sst-cap" x="${A(dbmsCx)}" y="${A(disk[disk.length - 1].base[1] + 16)}" text-anchor="middle">survives crash &amp; restart</text>`);
  } else {
    badges.push(`<text class="sst-cap" x="${A(dbmsCx)}" y="${A(disk[disk.length - 1].base[1] + 16)}" text-anchor="middle">one shared, consistent store</text>`);
  }

  // integrity: a bad row is bounced off the database
  if (view === 'integrity') {
    const bad = isoTile(812, 150, 48, 'rose', { h: 16 });
    shadows.push(bad.shadow); solids.push(bad.g);
    const be = edge([
      V(bad.verts.W.x + 4, bad.front[1]),
      V((bad.verts.W.x + dbms.verts.E.x) / 2, (bad.front[1] + dbms.front[1]) / 2 - 6),
      V(dbms.verts.E.x + 6, dbms.verts.E.y + 6),
    ], { arrow: true, dashed: true });
    guides.push(be.guide);
    badges.push(`<text class="iso-region__t" x="812" y="${A(bad.base[1] + 22)}" text-anchor="middle">rejected</text>`);
  }

  // recap: the four guarantees as small pills
  if (view === 'recap') {
    const tags = ['persistent', 'concurrent', 'correct', 'queryable'];
    tags.forEach((t, i) => badges.push(pill(820, 120 + i * 52, t, { icon: 'check', w: 150 })));
  }

  const flows = [{ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'write', speed: 130, size: 6 }];
  if (view === 'concurrent') flows.push({ id: 'in', kind: 'read', speed: 220, size: 5 });

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
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Why databases architecture">
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
