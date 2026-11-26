/* memtable-wal-scene.js — the "MemTable & WAL" write-path scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs and
   body labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'dilemma' (fast-vs-durable), 'memtable' (sorted RAM buffer),
   'volatile' (a crash wipes RAM), 'wal' (append-ahead log), 'recovery'
   (replay + flush), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* an append-only log drawn as a left-to-right row of flat amber tiles */
function walLog(x0, cy, n, rx, opts = {}) {
  const gap = rx * 1.46;
  const tiles = [];
  for (let i = 0; i < n; i++) {
    tiles.push(isoTile(x0 + i * gap, cy, rx, opts.mat || 'amber', {
      h: rx * 0.4, halo: opts.haloLast && i === n - 1, ghost: opts.ghostN != null && i < opts.ghostN,
    }));
  }
  return tiles;
}

export function renderMemtableWalScene(snap, opts = {}) {
  const view = snap.view || 'memtable';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const flows = [];

  /* ── DILEMMA: two tempting-but-flawed options ─────────────────────────── */
  if (view === 'dilemma') {
    // option A — straight to disk: durable but slow random I/O
    badges.push(region(120, 104, 356, 392, '', { r: 22 }));
    badges.push(pill(298, 124, 'A · write straight to disk', { icon: 'database', w: 290 }));
    const wA = isoCube(230, 196, 44, 50, 'blue', { icon: 'app', label: 'Writer', iconSize: 20 });
    const dA = isoCube(230, 356, 72, 66, 'rose', { icon: 'file', label: 'sorted file', sub: 'on disk', iconSize: 20 });
    [wA, dA].forEach(c => { shadows.push(c.shadow); solids.push(c.g); });
    const eA = edge([V(wA.base[0], wA.base[1] - 4), V(230, 288), V(dA.top[0], dA.top[1] - 2)], { arrow: true });
    guides.push(eA.guide); railIn = eA.d;
    badges.push(pill(298, 300, 'random seek per write', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="298" y="${A(dA.base[1] + 20)}" text-anchor="middle">durable — but ~9 ms each</text>`);

    // option B — RAM only: fast but volatile
    badges.push(region(564, 104, 356, 392, '', { r: 22 }));
    badges.push(pill(742, 124, 'B · buffer in RAM only', { icon: 'layers', w: 290 }));
    const mB = isoCube(742, 300, 78, 76, 'green', { icon: 'listOrdered', label: 'RAM buffer', sub: 'in memory', iconSize: 22 });
    shadows.push(mB.shadow); solids.push(mB.g);
    const crash = isoTile(742 + 118, 262, 26, 'rose', { halo: true });
    shadows.push(crash.shadow); halos.push(crash.halo); solids.push(crash.g);
    badges.push(pill(742 + 150, 262, 'crash', { icon: 'alert', w: 96 }));
    badges.push(`<text class="sst-cap" x="742" y="${A(mB.base[1] + 20)}" text-anchor="middle">fast — but lost on a crash</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'write', speed: 120, size: 6 }], note: snap.note });
  }

  /* writer cube shared by the remaining views */
  const writer = isoCube(158, 168, 48, 56, 'blue', { icon: 'app', label: 'Writer', sub: 'PUT / DELETE', iconSize: 22 });

  /* ── MEMTABLE: sorted in-RAM buffer ───────────────────────────────────── */
  if (view === 'memtable' || view === 'volatile') {
    const crashed = view === 'volatile';
    shadows.push(writer.shadow); solids.push(writer.g);

    const mem = isoCube(560, 212, 104, 96, 'green', {
      icon: 'listOrdered', label: 'MemTable', sub: 'sorted · in RAM',
      halo: !crashed, ghost: crashed,
    });
    shadows.push(mem.shadow); if (!crashed) halos.push(mem.halo); solids.push(mem.g);

    // little sorted keys sitting on top of the MemTable
    const keys = [-54, -18, 18, 54];
    keys.forEach((dx, i) => {
      const t = isoTile(560 + dx, 150 + Math.abs(dx) * 0.04, 15, crashed ? 'rose' : 'slate', { h: 10, ghost: crashed });
      shadows.push(t.shadow); solids.push(t.g);
    });

    const e = edge([V(writer.verts.E.x - 2, writer.front[1]), V((writer.verts.E.x + mem.verts.W.x) / 2, writer.front[1] + 6), V(mem.verts.W.x - 6, mem.verts.W.y + 8)], { arrow: true });
    guides.push(e.guide); railIn = e.d;

    if (!crashed) {
      badges.push(pill(560, 300, 'balanced tree / skip list · O(log n)', { icon: 'merge', cls: 'pill--sst', w: 318 }));
      badges.push(pill(writer.top[0], 92, 'writes', { icon: 'bolt', cls: 'pill--sst' }));
      badges.push(`<text class="sst-cap" x="560" y="${A(mem.base[1] + 22)}" text-anchor="middle">no disk I/O on the write path</text>`);
      flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    } else {
      badges.push(region(430, 118, 320, 236, 'RAM — volatile', { r: 22, rot: 0 }));
      const bolt = isoTile(560 + 150, 170, 26, 'rose', { halo: true });
      shadows.push(bolt.shadow); halos.push(bolt.halo); solids.push(bolt.g);
      badges.push(pill(560 + 184, 170, 'crash', { icon: 'alert', w: 96 }));
      badges.push(`<text class="iso-region__t" x="560" y="${A(mem.base[1] + 30)}" text-anchor="middle">EVERY UN-FLUSHED WRITE IS LOST</text>`);
    }

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null, flows, note: snap.note });
  }

  /* ── WAL: append to the log before the MemTable ───────────────────────── */
  if (view === 'wal') {
    shadows.push(writer.shadow); solids.push(writer.g);

    const mem = isoCube(600, 182, 96, 86, 'green', { icon: 'listOrdered', label: 'MemTable', sub: 'sorted · in RAM', halo: true });
    shadows.push(mem.shadow); halos.push(mem.halo); solids.push(mem.g);

    // the WAL — an append-only row of tiles along the bottom
    const wal = walLog(360, 432, 6, 28, { haloLast: true });
    wal.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    const tail = wal[wal.length - 1];
    halos.push(tail.halo);
    badges.push(region(316, 388, 408, 108, '', { r: 18 }));
    badges.push(pill(360, 400, 'WAL · append-only log on disk', { icon: 'scroll', cls: 'pill--sst', w: 318 }));

    // 1) writer appends to the WAL tail (sequential), 2) writer updates MemTable
    const e1 = edge([V(writer.base[0], writer.base[1] - 2), V(writer.base[0], 408), V(tail.top[0] - 2, tail.top[1] - 2)], { arrow: true });
    guides.push(e1.guide); railIn = e1.d;
    const e2 = edge([V(writer.verts.E.x - 2, writer.front[1]), V((writer.verts.E.x + mem.verts.W.x) / 2, writer.front[1]), V(mem.verts.W.x - 6, mem.verts.W.y + 8)], { arrow: true });
    guides.push(e2.guide); railOut = e2.d;

    badges.push(pill(300, 300, '1 · append (sequential)', { icon: 'check', cls: 'pill--sst', w: 236 }));
    badges.push(pill(600, 290, '2 · update (in RAM)', { icon: 'merge', cls: 'pill--sst', w: 236 }));
    badges.push(pill(876, 150, 'durable before ack', { icon: 'bolt', w: 198 }));

    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 }, { id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECOVERY: replay the WAL, flush a full MemTable to an SSTable ─────── */
  if (view === 'recovery') {
    // WAL at bottom-left, partly discarded (ghosted) once covered by a flush
    const wal = walLog(150, 452, 6, 26, { ghostN: 2 });
    wal.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    badges.push(pill(150, 420, 'WAL', { icon: 'scroll', cls: 'pill--sst', w: 92 }));
    badges.push(`<text class="sst-cap" x="206" y="${A(wal[0].base[1] + 22)}" text-anchor="middle">covered segment discarded</text>`);

    // rebuilt MemTable (centre)
    const mem = isoCube(470, 212, 96, 86, 'green', { icon: 'listOrdered', label: 'MemTable', sub: 'rebuilt / full', halo: true });
    shadows.push(mem.shadow); halos.push(mem.halo); solids.push(mem.g);

    // replay: WAL -> MemTable (a read-coloured rail climbing up)
    const er = edge([V(wal[3].top[0], wal[3].top[1] - 2), V(wal[3].top[0] + 40, 330), V(mem.verts.W.x - 6, mem.verts.W.y + 10)], { arrow: true });
    guides.push(er.guide); railIn = er.d;
    badges.push(pill(360, 338, 'replay on restart', { icon: 'check', cls: 'pill--sst', w: 212 }));

    // flush: full MemTable -> immutable SSTable (right)
    const sst = isoCube(812, 316, 78, 70, 'lilac', { icon: 'file', label: 'SSTable', sub: 'immutable', iconSize: 22 });
    shadows.push(sst.shadow); solids.push(sst.g);
    const ef = edge([V(mem.verts.E.x - 2, mem.front[1]), V((mem.verts.E.x + sst.verts.W.x) / 2, (mem.front[1] + sst.top[1]) / 2), V(sst.verts.W.x - 6, sst.verts.W.y + 8)], { arrow: true, dashed: true });
    guides.push(ef.guide); railOut = ef.d;
    badges.push(pill(648, 232, 'flush when full', { icon: 'flush', cls: 'pill--sst', w: 196 }));
    badges.push(`<text class="sst-cap" x="812" y="${A(sst.base[1] + 20)}" text-anchor="middle">sorted sweep to disk</text>`);

    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'flush', speed: 130, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the whole write path, left → right ────────────────────────── */
  shadows.push(writer.shadow); solids.push(writer.g);

  const wal = walLog(290, 436, 5, 26, {});
  wal.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
  badges.push(region(250, 396, 368, 96, '', { r: 18 }));
  badges.push(pill(300, 408, 'WAL · sequential · durable', { icon: 'scroll', cls: 'pill--sst', w: 268 }));

  const mem = isoCube(540, 190, 92, 84, 'green', { icon: 'listOrdered', label: 'MemTable', sub: 'sorted · fast', halo: true });
  shadows.push(mem.shadow); halos.push(mem.halo); solids.push(mem.g);

  const sst = isoCube(824, 300, 76, 68, 'lilac', { icon: 'file', label: 'SSTable', sub: 'immutable', iconSize: 22 });
  shadows.push(sst.shadow); solids.push(sst.g);

  const e1 = edge([V(writer.base[0], writer.base[1] - 2), V(writer.base[0], 412), V(wal[0].top[0] - 2, wal[0].top[1] - 2)], { arrow: true });
  guides.push(e1.guide); railIn = e1.d;
  const e2 = edge([V(writer.verts.E.x - 2, writer.front[1]), V((writer.verts.E.x + mem.verts.W.x) / 2, writer.front[1]), V(mem.verts.W.x - 6, mem.verts.W.y + 8)], { arrow: true });
  guides.push(e2.guide);
  const e3 = edge([V(mem.verts.E.x - 2, mem.front[1]), V((mem.verts.E.x + sst.verts.W.x) / 2, (mem.front[1] + sst.top[1]) / 2), V(sst.verts.W.x - 6, sst.verts.W.y + 8)], { arrow: true, dashed: true });
  guides.push(e3.guide); railOut = e3.d;

  const tags = ['append once, durable', 'sorted in RAM, fast', 'replay to recover', 'flush full → SSTable'];
  tags.forEach((t, i) => badges.push(pill(876, 128 + i * 52, t, { icon: 'check', w: 212 })));

  flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 }, { id: 'out', kind: 'flush', speed: 130, size: 6 });
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
  <svg class="scene scene--memtable-wal" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="MemTable and Write-Ahead Log write path">
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
