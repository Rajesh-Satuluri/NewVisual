/* dbms-scene.js — the "What is a DBMS?" architecture scene, in the same
   Designed-to-Scale isometric vocabulary as the LSM-Tree lesson: rounded iso
   cubes with icon glyphs and body labels, soft ground shadows, halos, pill
   badges, dashed logical regions, routed connectors with arrows, a faded iso
   grid, and particle rails.

   Input: a view-snapshot { view, apps, note, pulse, flow, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'files' (raw-file chaos), 'layer' (one DBMS in the middle),
   'internals' (the four engines inside), 'concurrency' (many clients, one
   truth), 'schema' (data independence), 'recap'. */

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

export function renderDbmsScene(snap, opts = {}) {
  const view = snap.view || 'layer';
  const nApps = snap.apps || 1;
  const pulse = snap.pulse || opts.pulse || null;

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];                  // static connector paths
  let railIn = null, railOut = null;  // animated rails

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── clients on the left ──────────────────────────────────────────────── */
  const many = nApps >= 4;
  const appRx = many ? 40 : 54;
  const appH = many ? 46 : 62;
  const appX = 150;
  const ys = spread(nApps, 236, many ? 96 : nApps === 1 ? 0 : 150);
  const apps = ys.map((y, i) => isoCube(appX, y, appRx, appH, 'blue', {
    icon: 'app', label: nApps === 1 ? 'Client' : 'App',
    sub: nApps <= 3 ? 'queries' : '', pulse: pulse === 'client',
    iconSize: many ? 20 : 26,
  }));
  apps.forEach(a => { shadows.push(a.shadow); solids.push(a.g); });

  /* ── FILES VIEW: raw-file chaos, no manager ───────────────────────────── */
  if (view === 'files') {
    // scattered, duplicated data files each app pokes at directly (upper band,
    // so the warning line below stays clear)
    const files = [
      isoTile(578, 300, 56, 'lilac'),
      isoTile(742, 338, 56, 'lilac'),
      isoTile(624, 408, 56, 'rose'),   // the duplicated / conflicting file
      isoTile(818, 420, 56, 'lilac'),
    ];
    files.forEach(f => { shadows.push(f.shadow); solids.push(f.g); });
    badges.push(pill(700, 210, 'flat files · one format each', { icon: 'file', cls: 'pill--sst' }));

    // every app wires straight to files — crossing, tangled, overlapping
    const targets = [files[0], files[2], files[1], files[3], files[2]];
    apps.forEach((a, i) => {
      const f = targets[i % targets.length];
      const e = edge([
        V(a.verts.E.x - 2, a.front[1]),
        V((a.verts.E.x + f.top[0]) / 2, a.front[1] + 8),
        V(f.top[0] - 10, f.top[1] + 2),
      ], { arrow: true, dashed: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d;
    });

    badges.push(region(520, 258, 388, 250, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="714" y="498" text-anchor="middle">NO SHARING · NO RULES · NO CRASH SAFETY</text>`);
    badges.push(`<text class="sst-cap" x="624" y="${A(files[2].base[1] + 15)}" text-anchor="middle">same row, two copies</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: railIn ? [{ id: 'in', kind: 'read', speed: 150, size: 5 }] : [], note: snap.note });
  }

  /* ── the DBMS in the middle (layer / concurrency / schema / recap) ─────── */
  const dbmsCx = 548, dbmsCy = 168, dbmsRx = 116, dbmsH = 124;

  if (view === 'internals') {
    // the DBMS becomes a labelled region holding its four engines
    const rgX = 372, rgY = 70, rgW = 356, rgH = 300;
    badges.push(region(rgX, rgY, rgW, rgH, '', {}));
    badges.push(pill(rgX + rgW / 2, rgY - 4, 'DBMS', { icon: 'database' }));

    const parts = [
      { cx: 468, cy: 136, mat: 'blue',  icon: 'search',      label: 'Query', sub: 'engine' },
      { cx: 628, cy: 170, mat: 'amber', icon: 'merge',       label: 'Txn', sub: 'manager' },
      { cx: 468, cy: 244, mat: 'green', icon: 'layers',      label: 'Buffer', sub: 'pool' },
      { cx: 628, cy: 278, mat: 'lilac', icon: 'database',    label: 'Storage', sub: 'engine' },
    ];
    const comps = parts.map(p => isoCube(p.cx, p.cy, 54, 58, p.mat, {
      icon: p.icon, label: p.label, sub: p.sub, iconSize: 22,
      pulse: pulse === p.label.toLowerCase(),
    }));
    comps.forEach(c => { shadows.push(c.shadow); solids.push(c.g); });

    // clients fan into the region's left edge
    apps.forEach((a, i) => {
      const e = edge([
        V(a.verts.E.x - 2, a.front[1]),
        V((a.verts.E.x + rgX) / 2, a.front[1]),
        V(rgX - 6, rgY + rgH / 2),
      ], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d;
    });

    // storage engine → disk
    const diskTop = 452;
    const disk = diskStack(628, diskTop, 72, 'lilac', 2, {});
    disk.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    badges.push(`<text class="sst-cap" x="628" y="${A(disk[disk.length - 1].base[1] + 16)}" text-anchor="middle">data files</text>`);
    const se = comps[3];
    const oe = edge([V(se.base[0], se.base[1] - 6), V(se.base[0] + 4, (se.base[1] + diskTop) / 2), V(disk[0].top[0], disk[0].top[1] - 2)], { arrow: true, dashed: true });
    guides.push(oe.guide); railOut = oe.d;

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'write', speed: 130, size: 6 }],
      note: snap.note });
  }

  // one solid DBMS cube
  const dbms = isoCube(dbmsCx, dbmsCy, dbmsRx, dbmsH, 'green', {
    icon: 'database', label: 'DBMS',
    sub: snap.dbmsSub || 'one manager',
    halo: true, pulse: pulse === 'dbms',
  });
  shadows.push(dbms.shadow); halos.push(dbms.halo); solids.push(dbms.g);

  // clients fan into the DBMS
  apps.forEach((a, i) => {
    const e = edge([
      V(a.verts.E.x - 2, a.front[1]),
      V((a.verts.E.x + dbms.verts.W.x) / 2, (a.front[1] + dbms.front[1]) / 2),
      V(dbms.verts.W.x - 6, dbms.verts.W.y + 10),
    ], { arrow: true });
    guides.push(e.guide);
    if (i === 0) railIn = e.d;
  });

  // DBMS → store
  const diskTop = 456;
  const disk = diskStack(dbmsCx, diskTop, 82, 'lilac', view === 'schema' ? 3 : 2, {});
  disk.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
  const oe = edge([
    V(dbms.base[0], dbms.base[1] - 4),
    V(dbms.base[0], (dbms.base[1] + diskTop) / 2),
    V(disk[0].top[0], disk[0].top[1] - 2),
  ], { arrow: true, dashed: true });
  guides.push(oe.guide); railOut = oe.d;

  if (view === 'schema') {
    badges.push(pill(dbmsCx, 414, 'SCHEMA  ·  users(id, name, email)', { icon: 'listOrdered', cls: 'pill--sst' }));
    badges.push(region(dbmsCx - 150, 300, 300, 232, 'logical  ⟷  physical', { rot: 0, r: 22 }));
    badges.push(`<text class="sst-cap" x="${dbmsCx}" y="${A(disk[disk.length - 1].base[1] + 16)}" text-anchor="middle">bytes on disk — hidden from apps</text>`);
  } else {
    badges.push(`<text class="sst-cap" x="${dbmsCx}" y="${A(disk[disk.length - 1].base[1] + 16)}" text-anchor="middle">one shared, consistent store</text>`);
  }

  // recap: label the guarantees as small pills around the DBMS
  if (view === 'recap') {
    const tags = ['durable', 'concurrent', 'consistent', 'queryable'];
    tags.forEach((t, i) => badges.push(pill(812, 120 + i * 52, t, { icon: 'check', w: 150 })));
  }

  const flows = [{ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'write', speed: 130, size: 6 }];
  if (view === 'concurrency') flows.push({ id: 'in', kind: 'read', speed: 220, size: 5 });

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
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="What is a DBMS architecture">
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
