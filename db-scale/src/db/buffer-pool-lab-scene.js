/* buffer-pool-lab-scene.js — the "Buffer Pool Lab" scene, in the shared
   Designed-to-Scale isometric vocabulary: a row of four buffer frames in RAM
   above a disk, a queue of page requests, and per-step highlighting of hits,
   misses, evictions and write-back flushes.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'setup' (empty pool), 'cold' (compulsory misses fill frames),
   'hit' (re-read served from RAM), 'evict' (LRU victim flushed, new page in),
   'thrash' (working set > pool, every request misses), 'recap' (warm pool). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* four buffer frames across the middle band, and the disk below */
const FRAMEY = 250;
const FX = [335, 475, 615, 755];
const DISKX = VW / 2, DISKY = 452;

export function renderBufferPoolLabScene(snap, opts = {}) {
  const view = snap.view || 'setup';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // a buffer frame; caller keeps the coords, we never read them off the cube
  const frame = (x, label, mat, o = {}) => {
    const c = isoCube(x, FRAMEY, 50, 38, mat, {
      icon: o.icon || (label ? 'file' : null), label: label || '', sub: o.sub || '',
      iconSize: 16, halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // the disk slab
  const disk = () => {
    const c = isoCube(DISKX, DISKY, 150, 40, 'slate', { icon: 'database', label: 'disk', sub: 'pages on storage', iconSize: 22 });
    shadows.push(c.shadow); solids.push(c.g);
    return c;
  };

  // the request queue across the top
  const queue = (seq, hotIdx) => {
    const qx0 = 300, step = 56, qy = 74;
    badges.push(pill(qx0 - 78, qy, 'requests →', { cls: 'pill--sst' }));
    seq.forEach((n, i) => {
      const hot = i === hotIdx;
      badges.push(pill(qx0 + i * step, qy, String(n), { cls: 'pill--sst', icon: hot ? 'target' : null, w: 42 }));
    });
  };

  /* ── SETUP: four empty frames, disk, the request stream ─────────────────── */
  if (view === 'setup') {
    FX.forEach((x, i) => frame(x, '', 'slate', { ghost: true, sub: 'free', icon: 'layers' }));
    disk();
    queue([1, 2, 3, 1, 4, 2, 5, 1], -1);
    badges.push(pill(VW / 2, FRAMEY - 92, 'buffer pool · 4 frames (RAM)', { icon: 'layers' }));
    badges.push(region(285, 182, 520, 148, '', { r: 22 }));
    cap(VW / 2, 540, 'every read checks the pool first — a hit skips the disk entirely');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── COLD: pages 1,2,3 faulted in from disk; frame 4 still free ──────────── */
  if (view === 'cold') {
    const labels = ['pg 1', 'pg 2', 'pg 3', ''];
    FX.forEach((x, i) => {
      if (i < 3) frame(x, labels[i], 'green', { sub: 'cached', icon: 'file' });
      else frame(x, '', 'slate', { ghost: true, sub: 'free', icon: 'layers' });
    });
    disk();
    queue([1, 2, 3, 1, 4, 2, 5, 1], 2);
    // three read arrows up from the disk into the filled frames
    for (let i = 0; i < 3; i++) {
      const e = edge([V(DISKX - 60 + i * 60, DISKY - 40), V(FX[i], FRAMEY + 80), V(FX[i], FRAMEY + 30)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d;
    }
    badges.push(pill(VW / 2, FRAMEY - 92, '3 compulsory misses → fetch from disk', { icon: 'alert' }));
    badges.push(pill(FX[3], FRAMEY - 70, 'still free', { cls: 'pill--sst' }));
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 6 });
    cap(VW / 2, 540, 'a cold cache can only miss — each page is a slow disk read');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── HIT: request for page 1 answered from RAM, no disk ──────────────────── */
  if (view === 'hit') {
    const labels = ['pg 1', 'pg 2', 'pg 3', ''];
    FX.forEach((x, i) => {
      if (i === 0) frame(x, labels[i], 'green', { sub: 'MRU', icon: 'file', halo: true });
      else if (i < 3) frame(x, labels[i], 'green', { sub: 'cached', icon: 'file' });
      else frame(x, '', 'slate', { ghost: true, sub: 'free', icon: 'layers' });
    });
    disk();
    queue([1, 2, 3, 1, 4, 2, 5, 1], 3);
    badges.push(pill(FX[0], FRAMEY - 72, 'HIT · served from RAM', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, FRAMEY - 100, 'request for page 1 — already cached', { icon: 'check' }));
    // a dashed "no disk needed" marker
    const e = edge([V(FX[0], FRAMEY + 30), V(FX[0] - 30, FRAMEY + 110), V(DISKX - 120, DISKY - 44)], { dashed: true });
    guides.push(e.guide);
    badges.push(pill((FX[0] + DISKX) / 2 - 70, (FRAMEY + DISKY) / 2 + 20, 'disk untouched', { icon: 'moon', cls: 'pill--sst' }));
    cap(VW / 2, 540, 'locality pays off: the re-read costs no disk I/O at all');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── EVICT: pool full, LRU victim (pg 3) flushed, pg 5 takes the frame ───── */
  if (view === 'evict') {
    const specs = [
      { l: 'pg 1', m: 'green', s: 'cached' },
      { l: 'pg 2', m: 'green', s: 'cached' },
      { l: 'pg 3', m: 'rose', s: 'LRU · dirty', halo: true },
      { l: 'pg 4', m: 'green', s: 'cached' },
    ];
    FX.forEach((x, i) => frame(x, specs[i].l, specs[i].m, { sub: specs[i].s, icon: 'file', halo: !!specs[i].halo }));
    disk();
    queue([1, 2, 3, 1, 4, 2, 5, 1], 6);
    // flush arrow: victim frame 3 writes down to disk
    const fe = edge([V(FX[2], FRAMEY + 30), V(FX[2] + 30, FRAMEY + 120), V(DISKX + 60, DISKY - 40)], { arrow: true });
    guides.push(fe.guide); railOut = fe.d;
    // incoming page 5 lands in the reclaimed frame
    const ie = edge([V(DISKX - 40, DISKY - 40), V(FX[2] - 50, FRAMEY + 110), V(FX[2], FRAMEY + 36)], { arrow: true, dashed: true });
    guides.push(ie.guide);
    badges.push(pill(FX[2], FRAMEY - 72, 'evict LRU victim', { icon: 'trash', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, FRAMEY - 100, 'pool full → reclaim least-recently-used frame', { icon: 'alert' }));
    badges.push(pill(DISKX + 150, DISKY - 6, 'dirty → flush first', { icon: 'flush', cls: 'pill--sst' }));
    flows.push({ id: 'out', kind: 'flush', speed: 150, size: 6 });
    cap(VW / 2, 540, 'a dirty victim must be written back to disk before its frame is reused');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── THRASH: 5-page working set through 4 frames — everything misses ─────── */
  if (view === 'thrash') {
    const labels = ['pg 7', 'pg 8', 'pg 9', 'pg 10'];
    FX.forEach((x, i) => frame(x, labels[i], 'rose', { sub: 'evicted next', icon: 'alert' }));
    disk();
    queue([7, 8, 9, 10, 11, 7, 8, 9], 4);
    // every frame pulls from disk — a spray of read arrows
    FX.forEach((x, i) => {
      const e = edge([V(DISKX - 90 + i * 60, DISKY - 40), V(x, FRAMEY + 85), V(x, FRAMEY + 30)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d;
    });
    badges.push(region(285, 182, 520, 150, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="206" text-anchor="middle">WORKING SET 5 &gt; 4 FRAMES · THRASH</text>`);
    badges.push(pill(VW / 2, FRAMEY - 78, 'every page evicted just before it is needed', { icon: 'alert' }));
    flows.push({ id: 'in', kind: 'read', speed: 220, size: 7 });
    cap(VW / 2, 540, 'bigger pool or a scan-resistant policy (LRU-K, CLOCK) stops the thrash');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: warm pool, high hit rate, quiet disk ────────────────────────── */
  const labels = ['pg 1', 'pg 2', 'pg 4', 'pg 5'];
  FX.forEach((x, i) => frame(x, labels[i], 'green', { sub: 'hot', icon: 'file', halo: i === 0 }));
  disk();
  badges.push(region(285, 184, 520, 150, 'warm pool · disk touched only on miss or flush', { r: 24 }));
  const tags = ['hit rate = size × policy × locality', 'dirty evictions cost a flush', 'size the pool to the working set'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 408 + i * 44, t, { icon: 'check', w: 340 })));
  cap(VW / 2, 560, 'a warm buffer pool keeps the slow disk out of the hot path');
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
  <svg class="scene scene--buffer-pool-lab" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Buffer pool lab">
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
