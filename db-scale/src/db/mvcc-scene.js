/* mvcc-scene.js — the "MVCC" scene, in the shared Designed-to-Scale isometric
   vocabulary: rounded iso cubes/tiles, soft ground shadows, halos, pill badges,
   dashed logical regions, routed connectors with arrows, a faded iso grid, and
   particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'contention' (lock queue), 'versions' (the version stack), 'snapshot'
   (two txns, two snapshots), 'nolock' (parallel read + write), 'tradeoff'
   (lock-free reads vs version bloat), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a vertical stack of row-version tiles, oldest at the bottom.
   versions: [{ mat, ghost?, halo? }] given bottom→top. returns the tile objs. */
function versionStack(cx, bottomY, rx, versions, out, gap = 40) {
  const tiles = [];
  versions.forEach((v, i) => {
    const t = isoTile(cx, bottomY - i * gap, rx, v.mat, { halo: !!v.halo, ghost: !!v.ghost });
    tiles.push(t);
  });
  // paint far (lower/older) first so nearer versions sit on top
  tiles.forEach(t => { out.shadows.push(t.shadow); if (t.halo) out.halos.push(t.halo); });
  tiles.forEach(t => out.solids.push(t.g));
  return tiles;
}

export function renderMvccScene(snap, opts = {}) {
  const view = snap.view || 'versions';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const out = { shadows, halos, solids };

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const flows = [];

  /* ── CONTENTION: one copy, one lock, a queue of readers ─────────────────── */
  if (view === 'contention') {
    const writer = isoCube(214, 250, 58, 70, 'amber', { icon: 'merge', label: 'Writer', sub: 'UPDATE 42', iconSize: 22 });
    shadows.push(writer.shadow); solids.push(writer.g);

    const row = isoTile(548, 262, 70, 'rose', { halo: true });
    shadows.push(row.shadow); halos.push(row.halo); solids.push(row.g);
    badges.push(pill(548, 196, 'row 42 · exclusive lock', { icon: 'key', cls: 'pill--sst' }));

    // writer → row (the active write)
    const we = edge([V(writer.verts.E.x - 2, writer.front[1]), V((writer.verts.E.x + row.top[0]) / 2, row.top[1]), V(row.top[0] - 12, row.top[1] + 2)], { arrow: true });
    guides.push(we.guide); railOut = we.d;

    // three readers queued on the right, each blocked at the lock
    const ys = [150, 262, 374];
    ys.forEach((y, i) => {
      const r = isoCube(846, y, 44, 48, 'blue', { icon: 'app', label: 'Reader', iconSize: 18 });
      shadows.push(r.shadow); solids.push(r.g);
      const e = edge([V(r.verts.W.x + 2, r.front[1]), V((r.verts.W.x + row.verts.E.x) / 2, row.top[1] + 4), V(row.verts.E.x + 8, row.top[1] + 2)], { arrow: true, dashed: true });
      guides.push(e.guide);
    });
    badges.push(region(770, 104, 170, 332, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="855" y="426" text-anchor="middle">WAITING ON LOCK</text>`);
    badges.push(`<text class="sst-cap" x="548" y="${A(row.base[1] + 20)}" text-anchor="middle">reads serialize behind the write</text>`);
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut, flows, note: snap.note });
  }

  /* ── TRADE-OFF: two columns ─────────────────────────────────────────────── */
  if (view === 'tradeoff') {
    badges.push(region(96, 96, 360, 404, '', { r: 22 }));
    badges.push(pill(276, 118, 'Lock-free reads', { icon: 'check', w: 230 }));
    const head = isoCube(276, 196, 60, 56, 'green', { icon: 'bolt', iconSize: 22 });
    shadows.push(head.shadow); halos.push(head.halo); solids.push(head.g);
    ['+ readers never wait', '+ consistent snapshots', '+ writes run in parallel'].forEach((t, i) =>
      badges.push(pill(276, 300 + i * 46, t, { icon: 'check', w: 300 })));

    badges.push(region(584, 96, 360, 404, '', { r: 22 }));
    badges.push(pill(764, 118, 'Version bloat', { icon: 'alert', w: 230 }));
    // a heap of dead version tiles
    const heap = [[720, 210], [800, 232], [756, 268], [820, 288]];
    heap.forEach(([x, y]) => { const t = isoTile(x, y, 34, 'lilac', { ghost: true }); shadows.push(t.shadow); solids.push(t.g); });
    const live = isoTile(764, 212, 34, 'rose', { halo: true }); shadows.push(live.shadow); halos.push(live.halo); solids.push(live.g);
    ['− dead versions accumulate', '− scans skip over corpses', '− VACUUM must reclaim them'].forEach((t, i) =>
      badges.push(pill(764, 356 + i * 46, t, { icon: 'alert', w: 300 })));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── all stack-based views share one logical row in the centre ──────────── */
  const CX = 548, BOTTOM = 388, RX = 70;

  if (view === 'versions') {
    const tiles = versionStack(CX, BOTTOM, RX, [
      { mat: 'lilac', ghost: true },   // v1 (retired)
      { mat: 'lilac' },                // v2 (retired)
      { mat: 'green', halo: true },    // v3 (current)
    ], out);
    badges.push(region(CX - 150, 190, 300, 280, '', { r: 22 }));
    badges.push(pill(CX, 174, 'ONE LOGICAL ROW', { icon: 'listOrdered', w: 230 }));
    const tags = ['v1 · xmin 7 · xmax 42', 'v2 · xmin 42 · xmax 88', 'v3 · xmin 88 · current'];
    tiles.forEach((t, i) => badges.push(pill(CX + 206, t.top[1] + 4, tags[i], { icon: i === 2 ? 'check' : 'clock', w: 220, cls: 'pill--sst' })));

    // writer appends the newest version
    const writer = isoCube(214, 250, 56, 66, 'amber', { icon: 'merge', label: 'UPDATE', sub: 'tx 88', iconSize: 22 });
    shadows.push(writer.shadow); solids.push(writer.g);
    const top = tiles[tiles.length - 1];
    const we = edge([V(writer.verts.E.x - 2, writer.front[1]), V((writer.verts.E.x + top.top[0]) / 2, top.top[1] - 6), V(top.top[0] - 12, top.top[1])], { arrow: true });
    guides.push(we.guide); railOut = we.d;
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut, flows, note: snap.note });
  }

  if (view === 'snapshot') {
    const tiles = versionStack(CX, BOTTOM, RX, [
      { mat: 'lilac', ghost: true },
      { mat: 'green' },                // v2 — older txn sees this
      { mat: 'rose', halo: true },     // v3 — newer txn sees this
    ], out);
    badges.push(pill(CX, 174, 'same row · two snapshots', { icon: 'listOrdered', w: 240 }));

    const older = isoCube(190, 236, 52, 60, 'blue', { icon: 'app', label: 'tx 70', sub: 'started early', iconSize: 20 });
    const newer = isoCube(906, 236, 52, 60, 'blue', { icon: 'app', label: 'tx 95', sub: 'started late', iconSize: 20 });
    [older, newer].forEach(c => { shadows.push(c.shadow); solids.push(c.g); });

    const v2 = tiles[1], v3 = tiles[2];
    const eA = edge([V(older.verts.E.x - 2, older.front[1]), V((older.verts.E.x + v2.verts.W.x) / 2, v2.top[1] + 4), V(v2.verts.W.x + 8, v2.top[1] + 2)], { arrow: true });
    guides.push(eA.guide); railIn = eA.d;
    const eB = edge([V(newer.verts.W.x + 2, newer.front[1]), V((newer.verts.W.x + v3.verts.E.x) / 2, v3.top[1] + 4), V(v3.verts.E.x - 8, v3.top[1] + 2)], { arrow: true });
    guides.push(eB.guide); railOut = eB.d;
    badges.push(pill(v2.top[0] - 150, v2.top[1] + 4, 'sees v2', { icon: 'check', w: 96, cls: 'pill--sst' }));
    badges.push(pill(v3.top[0] + 150, v3.top[1] + 4, 'sees v3', { icon: 'check', w: 96, cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="${CX}" y="${A(tiles[0].base[1] + 18)}" text-anchor="middle">both read at once — no waiting</text>`);
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  if (view === 'nolock') {
    const tiles = versionStack(CX, BOTTOM, RX, [
      { mat: 'lilac', ghost: true },
      { mat: 'green' },                // reader's version
      { mat: 'rose', halo: true },     // writer just appended
    ], out);
    const reader = isoCube(190, 250, 54, 62, 'blue', { icon: 'app', label: 'SELECT', sub: 'reads v2', iconSize: 20 });
    const writer = isoCube(906, 250, 54, 62, 'amber', { icon: 'merge', label: 'UPDATE', sub: 'adds v3', iconSize: 20 });
    [reader, writer].forEach(c => { shadows.push(c.shadow); solids.push(c.g); });

    const v2 = tiles[1], v3 = tiles[2];
    const er = edge([V(reader.verts.E.x - 2, reader.front[1]), V((reader.verts.E.x + v2.verts.W.x) / 2, v2.top[1] + 4), V(v2.verts.W.x + 8, v2.top[1] + 2)], { arrow: true });
    guides.push(er.guide); railIn = er.d;
    const ew = edge([V(writer.verts.W.x + 2, writer.front[1]), V((writer.verts.W.x + v3.verts.E.x) / 2, v3.top[1] - 4), V(v3.verts.E.x - 8, v3.top[1] + 2)], { arrow: true });
    guides.push(ew.guide); railOut = ew.d;
    badges.push(pill(CX, 174, 'no lock between them', { icon: 'check', w: 230 }));
    badges.push(`<text class="iso-region__t" x="${CX}" y="${A(tiles[0].base[1] + 20)}" text-anchor="middle">READ ∥ WRITE · SAME ROW</text>`);
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  // recap: current version glows, dead versions ghosted, a VACUUM broom waits
  const tiles = versionStack(CX, BOTTOM, RX, [
    { mat: 'lilac', ghost: true },
    { mat: 'lilac', ghost: true },
    { mat: 'green', halo: true },
  ], out);
  badges.push(pill(CX, 174, 'current version · snapshot read', { icon: 'check', w: 270 }));
  const reader = isoCube(190, 250, 54, 62, 'blue', { icon: 'app', label: 'reader', sub: 'lock-free', iconSize: 20 });
  shadows.push(reader.shadow); solids.push(reader.g);
  const top = tiles[2];
  const er = edge([V(reader.verts.E.x - 2, reader.front[1]), V((reader.verts.E.x + top.verts.W.x) / 2, top.top[1] + 4), V(top.verts.W.x + 8, top.top[1] + 2)], { arrow: true });
  guides.push(er.guide); railIn = er.d;
  const vac = isoCube(846, 320, 50, 56, 'slate', { icon: 'trash', label: 'VACUUM', sub: 'reclaims', iconSize: 20 });
  shadows.push(vac.shadow); solids.push(vac.g);
  const ev = edge([V(vac.verts.W.x + 2, vac.front[1]), V((vac.verts.W.x + tiles[0].verts.E.x) / 2, tiles[0].top[1] + 2), V(tiles[0].verts.E.x - 6, tiles[0].top[1] + 2)], { arrow: true, dashed: true });
  guides.push(ev.guide);
  ['non-blocking reads', 'consistent snapshot', 'needs VACUUM'].forEach((t, i) =>
    badges.push(pill(206, 150 + i * 52, t, { icon: 'check', w: 196 })));
  flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null, flows, note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--mvcc" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="MVCC multi-version concurrency control">
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
