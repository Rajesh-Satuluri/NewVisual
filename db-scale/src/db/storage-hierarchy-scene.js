/* storage-hierarchy-scene.js — the "Storage Hierarchy" scene, in the same
   Designed-to-Scale isometric vocabulary as the LSM-Tree and DBMS lessons:
   rounded iso cubes, soft shadows, halos, pill badges, dashed regions, routed
   connectors with arrows, a faded iso grid and particle rails.

   The signature form here is a PYRAMID of tiers — rounded iso cubes of
   decreasing width stacked upward, fast+small at the top, slow+big at the
   bottom — with a latency pill beside each.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'pyramid', 'latency' (the RAM→disk cliff), 'volatile' (RAM vs disk),
   'pageio' (sequential vs random), 'bufferpool' (cache hot pages), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* tiers, bottom (index 0, biggest/slowest) → top (smallest/fastest) */
const TIERS = [
  { key: 'network', name: 'Network',   mat: 'slate', lat: '~100 ms', icon: 'globe' },
  { key: 'disk',    name: 'Disk',      mat: 'lilac', lat: '~10 ms',  icon: 'database' },
  { key: 'ssd',     name: 'SSD',       mat: 'lilac', lat: '~100 µs', icon: 'layers' },
  { key: 'ram',     name: 'RAM',       mat: 'green', lat: '~100 ns', icon: 'layers' },
  { key: 'cache',   name: 'CPU cache', mat: 'amber', lat: '~1 ns',   icon: 'bolt' },
  { key: 'reg',     name: 'Registers', mat: 'blue',  lat: '<1 ns',   icon: 'key' },
];
const CX = 500;
function tierGeom(i) { return { cx: CX, cy: 470 - i * 70, rx: Math.max(40, 150 - i * 22) }; }

export function renderStorageHierarchyScene(snap, opts = {}) {
  const view = snap.view || 'pyramid';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [], guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  // which tiers stay solid (others ghost) per view; null = all solid
  const focus = {
    latency: ['ram', 'disk'],
    volatile: ['ram', 'disk'],
    pageio: ['disk', 'ssd'],
    bufferpool: ['ram', 'disk'],
  }[view] || null;
  const showPills = (view === 'pyramid');

  const cubes = {};
  TIERS.forEach((t, i) => {
    const g = tierGeom(i);
    const bodyH = Math.max(16, g.rx * 0.26);
    const show = !focus || focus.includes(t.key);
    const c = isoCube(g.cx, g.cy, g.rx, bodyH, t.mat, {
      icon: t.icon, iconSize: Math.min(26, g.rx * 0.5), ghost: !show,
    });
    shadows.push(c.shadow); solids.push(c.g);
    cubes[t.key] = { c, g, bodyH };
    if (show) {
      badges.push(`<text class="iso-region__t" x="${A(g.cx - g.rx - 24)}" y="${A(g.cy + bodyH * 0.3)}" text-anchor="end">${esc(t.name)}</text>`);
    }
    if (showPills) {
      badges.push(pill(835, g.cy + bodyH * 0.3, t.lat, { icon: 'clock', w: 128 }));
    }
  });

  /* ── PYRAMID: the whole stack + fast/slow captions ─────────────────────── */
  if (view === 'pyramid') {
    badges.push(`<text class="iso-region__t" x="835" y="86" text-anchor="middle">fast · small · costly</text>`);
    badges.push(`<text class="iso-region__t" x="835" y="528" text-anchor="middle">slow · big · cheap</text>`);
  }

  /* ── LATENCY: the RAM → disk cliff ─────────────────────────────────────── */
  if (view === 'latency') {
    const ram = cubes.ram, disk = cubes.disk;
    const midY = (ram.g.cy + disk.g.cy) / 2;
    const e = edge([
      V(ram.g.cx + ram.g.rx + 12, ram.g.cy + ram.bodyH),
      V(712, midY),
      V(disk.g.cx + disk.g.rx + 12, disk.g.cy),
    ], { dashed: true, arrow: true });
    guides.push(e.guide);
    badges.push(`<text class="iso-region__t" x="748" y="${A(midY)}" text-anchor="start">~100,000× slower — the cliff</text>`);
    badges.push(pill(ram.g.cx + ram.g.rx + 70, ram.g.cy + ram.bodyH * 0.3, '~100 ns', { icon: 'clock', w: 118 }));
    badges.push(pill(disk.g.cx + disk.g.rx + 70, disk.g.cy + disk.bodyH * 0.3, '~10 ms', { icon: 'clock', w: 118 }));
  }

  /* ── VOLATILE vs DURABLE ───────────────────────────────────────────────── */
  if (view === 'volatile') {
    const ram = cubes.ram, disk = cubes.disk;
    badges.push(pill(ram.g.cx + ram.g.rx + 130, ram.g.cy + 4, 'lost on power-off', { icon: 'bolt', w: 198, cls: 'pill--sst' }));
    badges.push(pill(disk.g.cx + disk.g.rx + 110, disk.g.cy + 4, 'persists', { icon: 'check', w: 150 }));
    badges.push(`<text class="iso-region__t" x="${A(disk.g.cx + disk.g.rx + 130)}" y="${A(disk.g.cy + 54)}" text-anchor="middle">→ write-ahead log</text>`);
  }

  /* ── PAGE I/O: sequential vs random ────────────────────────────────────── */
  if (view === 'pageio') {
    const px0 = 700, py = 290, prx = 30, gap = 76;
    const pages = [0, 1, 2, 3].map(k => isoTile(px0 + k * gap, py, prx, 'lilac', {}));
    pages.forEach(p => { shadows.push(p.shadow); solids.push(p.g); });
    const seq = edge([V(px0 - prx - 8, py - 10), V(px0 + 3 * gap + prx + 8, py - 10)], { arrow: true });
    guides.push(seq.guide); railIn = seq.d;
    badges.push(`<text class="sst-cap" x="${A(px0 + 1.5 * gap)}" y="${A(py - 32)}" text-anchor="middle">sequential — fast</text>`);
    const rnd = edge([
      V(px0, py + 48), V(px0 + 2 * gap, py + 80), V(px0 + gap, py + 48), V(px0 + 3 * gap, py + 82),
    ], { dashed: true, arrow: true });
    guides.push(rnd.guide);
    badges.push(`<text class="sst-cap" x="${A(px0 + 1.5 * gap)}" y="${A(py + 108)}" text-anchor="middle">random — slow</text>`);
  }

  /* ── BUFFER POOL: cache hot pages in RAM ───────────────────────────────── */
  if (view === 'bufferpool') {
    const ram = cubes.ram, disk = cubes.disk;
    const colX = ram.g.cx + ram.g.rx + 120;
    badges.push(region(ram.g.cx + ram.g.rx + 24, ram.g.cy - 24, 312, (disk.g.cy - ram.g.cy) + 86, '', { r: 22 }));
    const hot = isoTile(colX, disk.g.cy - 8, 30, 'rose', { halo: true });
    shadows.push(hot.shadow); if (hot.halo) halos.push(hot.halo); solids.push(hot.g);
    const up = edge([
      V(colX, disk.g.cy - 34),
      V(colX, (ram.g.cy + disk.g.cy) / 2),
      V(colX, ram.g.cy + 10),
    ], { arrow: true });
    guides.push(up.guide); railIn = up.d;
    badges.push(pill(colX + 44, ram.g.cy - 40, 'buffer pool caches hot pages', { icon: 'layers', w: 266 }));
    badges.push(`<text class="sst-cap" x="${A(colX)}" y="${A(ram.g.cy - 6)}" text-anchor="middle">most reads hit RAM</text>`);
  }

  /* ── RECAP: the three climbing strategies ──────────────────────────────── */
  if (view === 'recap') {
    ['index', 'cache', 'log'].forEach((t, i) => badges.push(pill(862, 150 + i * 58, t, { icon: 'check', w: 150 })));
    badges.push(`<text class="iso-region__t" x="862" y="${A(150 + 3 * 58 + 6)}" text-anchor="middle">move work up the pyramid</text>`);
  }

  const flows = railIn ? [{ id: 'in', kind: 'read', speed: 150, size: 5 }] : [];
  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
}

/* stitch the SVG together in the shared layer order (mirrors db/dbms-scene.js) */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Storage hierarchy pyramid">
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
