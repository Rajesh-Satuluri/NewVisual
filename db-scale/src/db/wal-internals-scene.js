/* wal-internals-scene.js — the "WAL Internals" scene, in the shared Designed-to-
   Scale isometric vocabulary: rounded iso cubes/slabs with icon glyphs and
   labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'record' (byte anatomy of one record), 'lsn' (the monotonic address),
   'buffer' (RAM WAL buffer → disk log), 'groupcommit' (many txns, one fsync),
   'segments' (fixed-size segment files), 'recap' (the whole pipeline). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderWalInternalsScene(snap, opts = {}) {
  const view = snap.view || 'record';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  /* ── RECORD: a row of field cells reading as one self-describing record ── */
  if (view === 'record') {
    const fields = [
      { k: 'LSN', mat: 'green', c: 'where it is' },
      { k: 'prev', mat: 'slate', c: 'back-ptr' },
      { k: 'txid', mat: 'blue', c: 'who' },
      { k: 'type', mat: 'blue', c: 'ins/upd' },
      { k: 'page', mat: 'lilac', c: 'what page' },
      { k: 'before', mat: 'rose', c: 'undo img' },
      { k: 'after', mat: 'rose', c: 'redo img' },
      { k: 'CRC', mat: 'amber', c: 'intact?' },
    ];
    const n = fields.length, x0 = 168, step = 100, cy = 278, rx = 38;
    badges.push(region(x0 - 58, 150, step * (n - 1) + 116, 262, '', { r: 22 }));
    badges.push(pill(VW / 2, 176, 'ONE WAL RECORD  ·  txid 42', { icon: 'file' }));
    fields.forEach((f, i) => {
      const x = x0 + i * step;
      const c = isoTile(x, cy, rx, f.mat, { h: 30 });
      shadows.push(c.shadow); solids.push(c.g);
      badges.push(`<text class="iso-region__t" x="${A(x)}" y="${A(cy - 40)}" text-anchor="middle">${esc(f.k)}</text>`);
      badges.push(cap(x, c.base[1] + 16, f.c));
    });
    // append direction rail beneath the row
    const e = edge([V(x0 - 48, 364), V(x0 + step * (n - 1) + 48, 364)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(VW / 2, 400, 'appended left → right, then sealed by CRC', { icon: 'flush', cls: 'pill--sst' }));
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LSN: records on a rising offset axis; pages remember the last LSN ── */
  if (view === 'lsn') {
    const ax0 = V(168, 430), ax1 = V(888, 150);
    const axis = edge([ax0, ax1], { arrow: true });
    guides.push(axis.guide); railOut = axis.d;
    badges.push(pill(922, 150, 'LSN →', { cls: 'pill--sst' }));
    const recs = [
      { t: 0.08, lsn: '0x1000' }, { t: 0.30, lsn: '0x1A40' },
      { t: 0.52, lsn: '0x2480' }, { t: 0.74, lsn: '0x30C0' }, { t: 0.94, lsn: '0x3E00' },
    ];
    recs.forEach((r, i) => {
      const x = ax0.x + (ax1.x - ax0.x) * r.t;
      const y = ax0.y + (ax1.y - ax0.y) * r.t;
      const c = isoTile(x, y, 30, i === recs.length - 1 ? 'amber' : 'slate', { h: 24, halo: i === recs.length - 1 });
      shadows.push(c.shadow); if (i === recs.length - 1) halos.push(c.halo); solids.push(c.g);
      badges.push(`<text class="iso-region__t" x="${A(x)}" y="${A(y - 30)}" text-anchor="middle">${esc(r.lsn)}</text>`);
    });
    badges.push(cap(ax0.x + 150, 470, 'monotonic · only ever grows'));
    // two pages, each stamping the last LSN applied
    const pages = [
      { x: 560, lsn: '0x2480', redo: false },
      { x: 760, lsn: '0x30C0', redo: true },
    ];
    pages.forEach(p => {
      const c = isoCube(p.x, 440, 60, 50, 'lilac', { icon: 'file', label: 'page', sub: 'pageLSN', iconSize: 18 });
      shadows.push(c.shadow); solids.push(c.g);
      badges.push(pill(p.x, 540, 'pageLSN ' + p.lsn, { cls: 'pill--sst' }));
    });
    badges.push(pill(300, 540, 'recLSN > pageLSN  →  redo', { icon: 'check', cls: 'pill--sst' }));
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── BUFFER: records collect in a RAM ring, flushed to the disk log ── */
  if (view === 'buffer') {
    // incoming records drop into the buffer from the top-left
    const bx = 430, by = 210;
    const buf = isoCube(bx, by, 118, 96, 'green', { icon: 'layers', label: 'WAL buffer', sub: 'RAM ring', halo: true });
    shadows.push(buf.shadow); halos.push(buf.halo); solids.push(buf.g);
    // record ticks resident in the buffer
    [-54, -18, 18, 54].forEach((dx, i) => {
      const t = isoTile(bx + dx, by - 4, 18, i === 3 ? 'amber' : 'slate', { h: 16 });
      shadows.push(t.shadow); solids.push(t.g);
    });
    // producers append into the buffer
    const inp = edge([V(150, 150), V(300, 182), V(bx - buf.rx + 10, by)], { arrow: true });
    guides.push(inp.guide); railIn = inp.d;
    badges.push(pill(190, 126, 'changes append', { icon: 'bolt', cls: 'pill--sst' }));
    // the on-disk log
    const logY = 470, log = isoCube(bx, logY, 132, 40, 'amber', { icon: 'file', label: 'log', sub: 'on disk', iconSize: 18 });
    shadows.push(log.shadow); solids.push(log.g);
    const fl = edge([V(buf.base[0], buf.base[1] - 6), V(bx, (buf.base[1] + logY) / 2), V(log.top[0], log.top[1] - 2)], { arrow: true, dashed: true });
    guides.push(fl.guide); railOut = fl.d;
    badges.push(pill(bx + 150, (buf.base[1] + logY) / 2, 'fsync on commit / full / timer', { icon: 'flush', cls: 'pill--sst' }));
    badges.push(cap(bx, log.base[1] + 16, 'durable only after the flush'));
    badges.push(region(770, 150, 230, 150, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="885" y="206" text-anchor="middle">BUFFERED</text>`);
    badges.push(cap(885, 236, '≠ durable yet'));
    flows.push({ id: 'in', kind: 'write', speed: 170, size: 5 }, { id: 'out', kind: 'write', speed: 130, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── GROUPCOMMIT: four txns batched into a single fsync ── */
  if (view === 'groupcommit') {
    const txy = [120, 220, 320, 420];
    const batch = isoCube(560, 250, 92, 84, 'green', { icon: 'merge', label: 'batch', sub: 'commit recs', halo: true });
    shadows.push(batch.shadow); halos.push(batch.halo); solids.push(batch.g);
    txy.forEach((y, i) => {
      const t = isoCube(168, y, 46, 46, 'blue', { icon: 'app', label: 'T' + (i + 1), iconSize: 18 });
      shadows.push(t.shadow); solids.push(t.g);
      const e = edge([V(t.verts.E.x - 2, t.front[1]), V(380, 250), V(batch.verts.W.x - 6, batch.verts.W.y + 8)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d;
    });
    badges.push(pill(300, 92, 'commit records pile up', { icon: 'listOrdered', cls: 'pill--sst' }));
    // one fsync to the log
    const logY = 470, log = isoCube(760, logY, 120, 40, 'amber', { icon: 'file', label: 'log', sub: 'on disk', iconSize: 18 });
    shadows.push(log.shadow); solids.push(log.g);
    const fl = edge([V(batch.base[0], batch.base[1] - 6), V(660, 380), V(log.top[0], log.top[1] - 2)], { arrow: true, dashed: true });
    guides.push(fl.guide); railOut = fl.d;
    badges.push(pill(700, 360, 'ONE fsync', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(cap(760, log.base[1] + 16, 'whole batch durable at once'));
    flows.push({ id: 'in', kind: 'write', speed: 200, size: 5 }, { id: 'out', kind: 'write', speed: 120, size: 7 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SEGMENTS: fixed-size files — archived, active, recycled ── */
  if (view === 'segments') {
    const segs = [
      { x: 180, mat: 'slate', state: 'recycled', sub: 'reused' },
      { x: 360, mat: 'lilac', state: 'archived', sub: 'backup' },
      { x: 540, mat: 'lilac', state: 'archived', sub: 'shipped' },
      { x: 720, mat: 'amber', state: 'ACTIVE', sub: 'appends', halo: true },
    ];
    const segCubes = segs.map(s => {
      const c = isoCube(s.x, 250, 74, 70, s.mat, { icon: 'file', label: '16 MB', sub: s.sub, iconSize: 18, halo: !!s.halo });
      shadows.push(c.shadow); if (s.halo) halos.push(c.halo); solids.push(c.g);
      badges.push(pill(s.x, 150, s.state, { cls: 'pill--sst' }));
      return c;
    });
    // append into the active segment
    const ap = edge([V(900, 180), V(820, 220), V(segCubes[3].top[0] + 20, segCubes[3].top[1])], { arrow: true });
    guides.push(ap.guide); railOut = ap.d;
    badges.push(pill(912, 160, 'new records', { icon: 'flush', cls: 'pill--sst' }));
    // archive hand-off + recycle loop
    const ar = edge([V(segCubes[3].verts.W.x, 360), V(540, 400), V(360, 360)], { arrow: true, dashed: true });
    guides.push(ar.guide);
    badges.push(cap(540, 418, 'filled → archived'));
    const rc = edge([V(360, 372), V(270, 420), V(180, 372)], { arrow: true, dashed: true });
    guides.push(rc.guide);
    badges.push(cap(270, 452, 'after checkpoint → recycled'));
    badges.push(pill(VW / 2, 520, 'replicas stream segments in LSN order', { icon: 'merge', cls: 'pill--sst' }));
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the whole pipeline, left → right ── */
  const stages = [
    { x: 150, mat: 'rose', icon: 'file', label: 'record', sub: 'self-describing' },
    { x: 348, mat: 'green', icon: 'listOrdered', label: 'LSN', sub: 'address' },
    { x: 546, mat: 'blue', icon: 'layers', label: 'buffer', sub: 'RAM' },
    { x: 744, mat: 'amber', icon: 'merge', label: 'group', sub: '1 fsync' },
    { x: 900, mat: 'lilac', icon: 'database', label: 'segments', sub: 'on disk' },
  ];
  const cubes = stages.map(s => isoCube(s.x, 230, 58, 64, s.mat, { icon: s.icon, label: s.label, sub: s.sub, iconSize: 20, halo: s.label === 'group' }));
  cubes.forEach((c, i) => { shadows.push(c.shadow); if (stages[i].label === 'group') halos.push(c.halo); solids.push(c.g); });
  for (let i = 0; i < cubes.length - 1; i++) {
    const a = cubes[i], b = cubes[i + 1];
    const e = edge([V(a.verts.E.x - 2, a.front[1]), V((a.verts.E.x + b.verts.W.x) / 2, a.front[1]), V(b.verts.W.x - 6, b.front[1])], { arrow: true });
    guides.push(e.guide);
    if (i === 0) railOut = e.d;
  }
  badges.push(region(96, 150, 868, 220, '', { r: 24 }));
  badges.push(`<text class="iso-region__t" x="${VW / 2}" y="178" text-anchor="middle">THE WRITE-AHEAD LOG, END TO END</text>`);
  badges.push(pill(VW / 2, 420, 'fast · durable · streamable', { icon: 'check', cls: 'pill--sst' }));
  flows.push({ id: 'out', kind: 'write', speed: 150, size: 5 });
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
  <svg class="scene scene--wal-internals" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="WAL internals">
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
