/* disk-io-scene.js — the "Disk I/O" scene, in the same Designed-to-Scale
   isometric vocabulary as the other Storage-Engine lessons: rounded iso cubes,
   soft ground shadows, halos, pill badges, dashed logical regions, routed
   connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'bottleneck' (RAM-vs-disk latency wall), 'hdd' (platter + arm),
   'ssd' (flash pages / erase blocks / channels), 'cost' (anatomy of one I/O),
   'amplification' (write amplification), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a vertical stack of flat tiles, nearest painted last */
function stack(cx, topY, rx, tone, layers, opts = {}) {
  const tiles = [];
  for (let i = layers - 1; i >= 0; i--) {
    tiles.push(isoTile(cx, topY + i * 16, rx, tone, { h: rx * 0.3, halo: opts.halo && i === 0, pulse: opts.pulse }));
  }
  return tiles;
}

export function renderDiskIoScene(snap, opts = {}) {
  const view = snap.view || 'bottleneck';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── BOTTLENECK: the latency cliff between RAM and disk ────────────────── */
  if (view === 'bottleneck') {
    // CPU — a tall, fast silicon tower (blue), label in nanoseconds
    const cpu = isoCube(300, 196, 76, 150, 'blue', { icon: 'bolt', label: 'CPU + RAM', sub: '~100 ns', halo: true, iconSize: 26 });
    shadows.push(cpu.shadow); halos.push(cpu.halo); solids.push(cpu.g);
    badges.push(pill(300, 92, 'nanoseconds', { icon: 'clock', cls: 'pill--sst' }));

    // disk — a short, slow platter (lilac) sitting far lower; the "wall" between
    const disk = stack(740, 300, 92, 'lilac', 3, {});
    disk.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    badges.push(pill(740, 236, 'milliseconds', { icon: 'clock' }));
    badges.push(`<text class="sst-cap" x="740" y="${A(disk[disk.length - 1].base[1] + 18)}" text-anchor="middle">disk — ~10 ms per read</text>`);

    // the gulf between them
    const e = edge([V(cpu.verts.E.x - 2, cpu.front[1]), V(520, cpu.front[1] + 40), V(disk[0].top[0] - 60, disk[0].top[1] + 6)], { arrow: true, dashed: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(region(446, 150, 232, 150, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="562" y="226" text-anchor="middle">100,000× SLOWER</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'read', speed: 80, size: 5 }], note: snap.note });
  }

  /* ── HDD: platter + seek arm + three cost components ──────────────────── */
  if (view === 'hdd') {
    const px = 452, py = 236;
    // platter as a flat disc (wide tile) with concentric track rings
    const platter = isoTile(px, py, 150, 'slate', { h: 24 });
    shadows.push(platter.shadow); solids.push(platter.g);
    // track rings (ellipses on the top face)
    for (let i = 1; i <= 3; i++) {
      const rr = 40 * i;
      overlays.push(`<ellipse cx="${px}" cy="${py}" rx="${A(rr)}" ry="${A(rr * 0.5)}" fill="none" stroke="#9aa3b0" stroke-width="1.4" stroke-dasharray="3 5" opacity="0.7"/>`);
    }
    // target sector (rose dot on the outer track)
    const sx = px + 104, sy = py + 10;
    overlays.push(`<ellipse cx="${A(sx)}" cy="${A(sy)}" rx="12" ry="7" fill="#de9f97" stroke="#26211b" stroke-width="1.6"/>`);
    // spindle
    overlays.push(`<ellipse cx="${px}" cy="${py}" rx="9" ry="5" fill="#26211b"/>`);
    // seek arm: pivot at upper-right, head reaching the target sector
    const pivX = px + 196, pivY = py - 88;
    overlays.push(`<line x1="${A(pivX)}" y1="${A(pivY)}" x2="${A(sx + 6)}" y2="${A(sy - 4)}" stroke="#6b4fbb" stroke-width="7" stroke-linecap="round"/>`);
    overlays.push(`<circle cx="${A(pivX)}" cy="${A(pivY)}" r="9" fill="#6b4fbb" stroke="#26211b" stroke-width="1.6"/>`);
    badges.push(pill(px, 108, 'spinning platter · 7200 rpm', { icon: 'database', cls: 'pill--sst' }));

    // three cost component pills on the right
    const comps = [
      { y: 182, t: '1 · seek — arm to track', ic: 'search' },
      { y: 238, t: '2 · rotate — platter to sector', ic: 'merge' },
      { y: 294, t: '3 · transfer — read bytes', ic: 'bolt' },
    ];
    comps.forEach(c => badges.push(pill(840, c.y, c.t, { icon: c.ic, w: 250 })));

    // rotation arrow
    overlays.push(`<path d="M${A(px - 120)} ${A(py + 40)} A 130 65 0 0 1 ${A(px - 150)} ${A(py - 8)}" fill="none" stroke="#2f8a43" stroke-width="2.4" marker-end="url(#arrow)"/>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null,
      flows: [], note: snap.note });
  }

  /* ── SSD: erase blocks of flash pages, parallel channels ──────────────── */
  if (view === 'ssd') {
    badges.push(pill(520, 96, 'SSD · no moving parts', { icon: 'bolt', cls: 'pill--sst' }));
    // three erase blocks (regions), each a 2×2 grid of flash-page cubes (green)
    const blockX = [250, 500, 750];
    blockX.forEach((bx, bi) => {
      badges.push(region(bx - 96, 150, 192, 196, '', { r: 18 }));
      badges.push(pill(bx, 142, 'erase block', { icon: 'layers' }));
      const pageXY = [[bx - 44, 210], [bx + 44, 232], [bx - 44, 278], [bx + 44, 300]];
      pageXY.forEach(([x, y], pi) => {
        const hot = bi === 0 && pi === 0;
        const c = isoCube(x, y, 34, 36, hot ? 'rose' : 'green', { iconSize: 0, pulse: hot });
        shadows.push(c.shadow); solids.push(c.g);
      });
      // channel rail from the top into each block
      const e = edge([V(bx, 118), V(bx, 150)], { arrow: true });
      guides.push(e.guide);
      if (bi === 0) railIn = e.d;
    });
    badges.push(`<text class="sst-cap" x="520" y="392" text-anchor="middle">pages read in parallel across channels · random read ≈ sequential read</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: railIn ? [{ id: 'in', kind: 'read', speed: 170, size: 5 }] : [], note: snap.note });
  }

  /* ── COST: stacked cost bars, HDD vs SSD ──────────────────────────────── */
  if (view === 'cost') {
    // helper to draw a labelled cost bar as a stack of iso cubes rising from baseY
    const baseY = 356;
    function bar(cx, segs, title) {
      let y = baseY;
      segs.forEach((s) => {
        const h = s.ms * 18 + 10;
        const c = isoCube(cx, y - h, 58, h, s.mat, { label: s.lbl, sub: s.ms + ' ms', iconSize: 0 });
        shadows.push(c.shadow); solids.push(c.g);
        y -= (h + 6);
      });
      badges.push(pill(cx, baseY + 42, title, { icon: 'file' }));
    }
    bar(330, [
      { ms: 4, lbl: 'seek', mat: 'lilac' },
      { ms: 4, lbl: 'rotate', mat: 'amber' },
      { ms: 0.1, lbl: 'transfer', mat: 'blue' },
    ], 'HDD · ~8 ms');
    bar(720, [
      { ms: 0.05, lbl: 'transfer', mat: 'blue' },
    ], 'SSD · ~0.05 ms');
    badges.push(region(590, 150, 260, 206, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="720" y="176" text-anchor="middle">NO SEEK · NO ROTATE</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null,
      flows: [], note: snap.note });
  }

  /* ── AMPLIFICATION: one small write → full-block rewrite ──────────────── */
  if (view === 'amplification') {
    // small logical write (amber) on the left
    const w = isoCube(200, 236, 40, 44, 'amber', { icon: 'wal', label: 'write', sub: '1 KB', iconSize: 18 });
    shadows.push(w.shadow); solids.push(w.g);
    badges.push(pill(200, 150, 'logical write', { icon: 'wal', cls: 'pill--sst' }));

    // → a full erase block (region) of pages that must be rewritten (rose)
    badges.push(region(452, 150, 300, 212, '', { r: 18 }));
    badges.push(pill(602, 142, 'erase block · rewritten whole', { icon: 'trash' }));
    const pageXY = [[520, 210], [610, 232], [700, 210], [520, 288], [610, 310], [700, 288]];
    pageXY.forEach(([x, y]) => {
      const c = isoCube(x, y, 34, 36, 'rose', { iconSize: 0 });
      shadows.push(c.shadow); solids.push(c.g);
    });
    // connector showing the blow-up
    const e = edge([V(w.verts.E.x - 2, w.front[1]), V(380, w.front[1]), V(452 - 6, 256)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(`<text class="sst-cap" x="602" y="392" text-anchor="middle">read → erase → rewrite · write amplification burns throughput &amp; wears flash</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut,
      flows: [{ id: 'out', kind: 'write', speed: 120, size: 6 }], note: snap.note });
  }

  /* ── RECAP: the two devices, two cost shapes ──────────────────────────── */
  const hdd = isoCube(330, 210, 86, 110, 'lilac', { icon: 'database', label: 'HDD', sub: 'sequential wins', halo: true, iconSize: 26 });
  shadows.push(hdd.shadow); halos.push(hdd.halo); solids.push(hdd.g);
  const ssd = isoCube(716, 210, 86, 110, 'green', { icon: 'bolt', label: 'SSD', sub: 'random reads cheap', halo: true, iconSize: 26 });
  shadows.push(ssd.shadow); halos.push(ssd.halo); solids.push(ssd.g);

  const hTags = ['seek', 'rotate', 'transfer'];
  hTags.forEach((t, i) => badges.push(pill(330, 346 + i * 40, t, { icon: 'clock', w: 160 })));
  const sTags = ['no seek', 'erase blocks', 'batch writes'];
  sTags.forEach((t, i) => badges.push(pill(716, 346 + i * 40, t, { icon: 'check', w: 170 })));
  badges.push(pill(VW / 2, 110, 'match the access pattern to the device', { icon: 'target', cls: 'pill--sst' }));

  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null,
    flows: [], note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--disk-io" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Disk I/O">
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
