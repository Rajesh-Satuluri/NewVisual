/* lsm-lab-scene.js — the "LSM Lab" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes with icon glyphs and labels, soft
   ground shadows, halos, pill badges, dashed logical regions, routed connectors
   with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'empty' (fresh tree), 'write' (WAL + MemTable append), 'flush'
   (MemTable → SSTable), 'read' (probe newest→oldest, bloom skips), 'compact'
   (merge SSTables), 'recap' (the whole loop). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* anchor coordinates — kept here, never read back off cube returns */
const CLIENT = { x: 150, y: 150 };
const WAL = { x: 400, y: 150 };
const MEM = { x: 660, y: 150 };
/* disk SSTable slots: level rows below the memory band */
const L0Y = 330, L1Y = 452;
const L0X = [360, 520, 680, 840];
const L1X = [460, 740];

export function renderLsmLabScene(snap, opts = {}) {
  const view = snap.view || 'empty';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a cube; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || '', label, sub: o.sub || '', iconSize: o.iconSize || 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  // a flat SSTable tile
  const tile = (x, y, mat, o = {}) => {
    const c = isoTile(x, y, o.rx || 54, mat, { ghost: !!o.ghost, halo: !!o.halo, h: o.h });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // the memory band: WAL + MemTable, optionally ghosted/labelled
  const memoryBand = (o = {}) => {
    node(WAL.x, WAL.y, 'WAL', 'amber', { icon: 'wal', sub: o.walSub || 'append log', ghost: o.walGhost });
    node(MEM.x, MEM.y, 'MemTable', 'green', { icon: 'layers', sub: o.memSub || 'sorted · RAM', halo: o.memHalo, ghost: o.memGhost });
  };

  /* ── EMPTY: fresh tree, nothing on disk yet ────────────────────────────── */
  if (view === 'empty') {
    node(CLIENT.x, CLIENT.y, 'client', 'blue', { icon: 'app', sub: 'writes & reads' });
    memoryBand({ walSub: 'empty', memSub: 'empty · RAM' });
    badges.push(region(300, 288, 620, 216, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="610" y="316" text-anchor="middle">DISK · SSTABLE LEVELS (EMPTY)</text>`);
    badges.push(pill(610, 540, 'append-only: writes never update in place', { icon: 'check' }));
    cap(VW / 2, 578, 'memory on top, immutable sorted files below — all still empty');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── WRITE: client → WAL append + MemTable insert ──────────────────────── */
  if (view === 'write') {
    node(CLIENT.x, CLIENT.y, 'client', 'blue', { icon: 'app', sub: 'PUT k→v' });
    memoryBand({ walSub: 'k12,k27,k31…', memSub: 'sorted · RAM', memHalo: true });
    // client → WAL
    const e1 = edge([V(CLIENT.x + 40, CLIENT.y - 8), V((CLIENT.x + WAL.x) / 2, CLIENT.y - 26), V(WAL.x - 42, WAL.y - 8)], { arrow: true });
    guides.push(e1.guide); railOut = e1.d;
    // WAL → MemTable
    const e2 = edge([V(WAL.x + 42, WAL.y + 2), V((WAL.x + MEM.x) / 2, WAL.y + 20), V(MEM.x - 42, MEM.y + 2)], { arrow: true });
    guides.push(e2.guide);
    badges.push(pill(WAL.x, WAL.y - 86, 'sequential append · durable', { icon: 'wal', cls: 'pill--sst' }));
    badges.push(pill(MEM.x, MEM.y - 86, 'in-memory insert · instant', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(region(300, 300, 620, 196, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="610" y="328" text-anchor="middle">DISK · STILL EMPTY</text>`);
    cap(VW / 2, 560, 'one WAL append + one sorted in-memory insert — nothing random on disk');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── FLUSH: full MemTable streams to one immutable SSTable ──────────────── */
  if (view === 'flush') {
    memoryBand({ walSub: 'segment droppable', memSub: 'FROZEN · full', memHalo: true });
    node(CLIENT.x, CLIENT.y, 'new MemTable', 'green', { icon: 'layers', sub: 'fresh · RAM', rx: 44 });
    // the flushed SSTable lands on L0
    const t = tile(L0X[0], L0Y, 'lilac', { halo: true });
    badges.push(pill(L0X[0], L0Y + 58, 'SSTable · sorted · immutable', { icon: 'database', cls: 'pill--sst' }));
    // MemTable → SSTable (streaming flush)
    const e = edge([V(MEM.x, MEM.y + 46), V(MEM.x - 60, (MEM.y + L0Y) / 2), V(L0X[0] + 10, L0Y - 28)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(region(300, 300, 620, 206, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="700" y="326" text-anchor="middle">DISK · LEVEL 0</text>`);
    cap(VW / 2, 560, 'a frozen MemTable streams out in one sequential pass; its WAL can be dropped');
    flows.push({ id: 'out', kind: 'flush', speed: 170, size: 7 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── READ: probe MemTable then SSTables newest→oldest, bloom skips ──────── */
  if (view === 'read') {
    node(CLIENT.x, CLIENT.y, 'client', 'blue', { icon: 'app', sub: 'GET k27' });
    memoryBand({ walSub: 'append log', memSub: 'miss', memGhost: true });
    // three SSTables newest→oldest on L0; the second one holds the key
    const labels = [['S3', 'skip'], ['S2', 'HIT'], ['S1', 'skip']];
    L0X.slice(0, 3).forEach((x, i) => {
      const hit = i === 1;
      tile(x, L0Y, hit ? 'rose' : 'lilac', { halo: hit, ghost: !hit && i === 2 });
      badges.push(pill(x, L0Y - 48, (hit ? 'bloom: maybe ✓' : 'bloom: no ✗'), { icon: hit ? 'search' : 'check', cls: 'pill--sst' }));
      badges.push(pill(x, L0Y + 54, labels[i][0] + ' · ' + labels[i][1], { cls: 'pill--sst' }));
    });
    // client read ray down into the hit SSTable
    const e = edge([V(CLIENT.x, CLIENT.y + 46), V(CLIENT.x + 40, (CLIENT.y + L0Y) / 2), V(L0X[1] - 10, L0Y - 28)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(`<text class="iso-region__t" x="700" y="516" text-anchor="middle">NEWEST → OLDEST · STOP AT FIRST HIT</text>`);
    badges.push(region(300, 300, 560, 232, '', { r: 22 }));
    cap(VW / 2, 572, 'bloom filters skip SSTables that cannot hold the key — most reads touch one file');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── COMPACT: merge several L0 SSTables into one L1 SSTable ─────────────── */
  if (view === 'compact') {
    memoryBand({ walSub: 'append log', memSub: 'sorted · RAM' });
    // four small, overlapping L0 tiles (some ghosted = stale) merge down to one L1
    L0X.forEach((x, i) => {
      tile(x, L0Y, i === 3 ? 'slate' : 'lilac', { ghost: i >= 2, rx: 46 });
      const e = edge([V(x, L0Y + 20), V((x + L1X[0]) / 2 - 20, (L0Y + L1Y) / 2), V(L1X[0], L1Y - 24)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    const t = tile(L1X[0], L1Y, 'lilac', { halo: true, rx: 70 });
    badges.push(pill(L1X[0], L1Y + 60, 'merged SSTable · newest values only', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(pill(L0X[1] + 80, L0Y - 48, 'drop stale versions & tombstones', { icon: 'trash', cls: 'pill--sst' }));
    badges.push(region(300, 300, 620, 90, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="610" y="318" text-anchor="middle">LEVEL 0 · MANY SMALL FILES</text>`);
    cap(VW / 2, 556, 'rewriting data (write-amp ↑) buys fewer files and less waste (read- & space-amp ↓)');
    flows.push({ id: 'out', kind: 'compact', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the whole loop ─────────────────────────────────────────────── */
  node(CLIENT.x, CLIENT.y, 'client', 'blue', { icon: 'app', sub: 'writes' });
  memoryBand({ walSub: 'append', memSub: 'sorted · RAM', memHalo: true });
  const s0 = tile(L0X[1], L0Y, 'lilac', {});
  const s1 = tile(L1X[1], L1Y, 'lilac', { halo: true });
  // loop arrows: client→WAL→Mem→SSTable→compact
  const a1 = edge([V(CLIENT.x + 40, CLIENT.y - 6), V(WAL.x - 42, WAL.y - 6)], { arrow: true });
  const a2 = edge([V(WAL.x + 42, WAL.y + 4), V(MEM.x - 42, MEM.y + 4)], { arrow: true });
  const a3 = edge([V(MEM.x, MEM.y + 46), V(MEM.x - 40, (MEM.y + L0Y) / 2), V(L0X[1] - 6, L0Y - 26)], { arrow: true });
  const a4 = edge([V(L0X[1] + 10, L0Y + 18), V((L0X[1] + L1X[1]) / 2, (L0Y + L1Y) / 2), V(L1X[1] - 6, L1Y - 24)], { arrow: true });
  guides.push(a1.guide, a2.guide, a3.guide, a4.guide);
  railOut = a3.d;
  badges.push(pill(280, L0Y, 'flush', { icon: 'flush', cls: 'pill--sst' }));
  badges.push(pill((L0X[1] + L1X[1]) / 2 + 40, (L0Y + L1Y) / 2, 'compact', { icon: 'merge', cls: 'pill--sst' }));
  badges.push(region(300, 520, 620, 60, 'append → flush → bloom-filtered reads → compact', { r: 22 }));
  flows.push({ id: 'out', kind: 'flush', speed: 150, size: 6 });
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
  <svg class="scene scene--lsm-lab" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="LSM-tree lab">
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
