/* pages-scene.js — the "Pages" scene, in the same Designed-to-Scale isometric
   vocabulary as the other Storage-Engine lessons: rounded iso cubes and tiles,
   soft ground shadows, halos, pill badges, dashed logical regions, routed
   connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'unit' (one byte, whole block), 'grid' (file cut into equal pages),
   'anatomy' (header / records / free space), 'io' (whole page to RAM and back),
   'sizes' (4/8/16 KB trade-off), 'addressing' (page_id × size = offset). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a short stack of disk tiles = a data file on disk */
function diskStack(cx, topY, rx, tone, layers, opts = {}) {
  const tiles = [];
  for (let i = layers - 1; i >= 0; i--) {
    tiles.push(isoTile(cx, topY + i * 16, rx, tone, { h: rx * 0.3, halo: opts.halo && i === 0, pulse: opts.pulse }));
  }
  return tiles; // nearest (i=0) last so it paints on top
}

export function renderPagesScene(snap, opts = {}) {
  const view = snap.view || 'grid';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── UNIT: you want one byte, you pay for the whole block ──────────────── */
  if (view === 'unit') {
    // a data file as a column of page tiles; one page haloed as "the block"
    const cx = 540, topY = 150, rx = 150;
    const n = 5;
    const hot = 2;
    const tiles = [];
    for (let i = n - 1; i >= 0; i--) {
      tiles.push(isoTile(cx, topY + i * 44, rx, i === hot ? 'amber' : 'slate', { h: 30, halo: i === hot }));
    }
    tiles.forEach(t => { shadows.push(t.shadow); if (t.halo) halos.push(t.halo); solids.push(t.g); });
    badges.push(pill(cx, topY - 48, 'data file on disk', { icon: 'file', cls: 'pill--sst' }));

    // the wanted field: a tiny marker pointing into the hot block
    const block = tiles[n - 1 - hot];
    badges.push(pill(846, block.top[1], 'want: 1 field', { icon: 'key', w: 128 }));
    const e = edge([
      V(790, block.top[1]),
      V(block.verts.E.x + 8, block.top[1]),
    ], { arrow: true, dashed: true });
    guides.push(e.guide);
    railIn = e.d;
    badges.push(`<text class="sst-cap" x="${cx}" y="${A(tiles[0].base[1] + 18)}" text-anchor="middle">must read the whole block — not the byte</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: railIn ? [{ id: 'in', kind: 'read', speed: 150, size: 5 }] : [], note: snap.note });
  }

  /* ── GRID: the file as a neat grid of equal pages ─────────────────────── */
  if (view === 'grid') {
    const cols = 4, rows = 4;
    const rx = 58, gx = 64, gy = 30, ox = 544, oy = 150;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // iso placement: step right-down and left-down
        const cx = ox + (c - r) * gx;
        const cy = oy + (c + r) * gy;
        const t = isoTile(cx, cy, rx, 'lilac', { h: 18 });
        shadows.push(t.shadow); solids.push(t.g);
      }
    }
    badges.push(pill(544, 108, '8 KB each · fixed size', { icon: 'file', cls: 'pill--sst' }));
    badges.push(region(300, 132, 500, 352, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="550" y="470" text-anchor="middle">page N  →  offset  N × page_size</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null,
      flows: [], note: snap.note });
  }

  /* ── ANATOMY: one big page split into header / records / free space ───── */
  if (view === 'anatomy') {
    const cx = 540, cy = 200, rx = 210, bodyH = 150;
    const page = isoCube(cx, cy, rx, bodyH, 'slate', { r: 16 });
    shadows.push(page.shadow); solids.push(page.g);

    // three stacked zone tiles sitting on the page top face, front-to-back
    const header = isoTile(cx, cy - 2, rx * 0.86, 'blue', { h: 10 });
    const records = isoTile(cx, cy + 46, rx * 0.86, 'green', { h: 10 });
    const free = isoTile(cx, cy + 94, rx * 0.86, 'slate', { h: 10, ghost: true });
    [header, records, free].forEach(t => { shadows.push(t.shadow); solids.push(t.g); });

    badges.push(pill(cx, cy - 66, 'one page', { icon: 'file' }));
    badges.push(pill(cx + 300, header.top[1], 'header', { icon: 'listOrdered', w: 150 }));
    badges.push(pill(cx + 300, records.top[1], 'records', { icon: 'database', w: 150 }));
    badges.push(pill(cx + 300, free.top[1], 'free space', { icon: 'layers', w: 150 }));
    [[header, 'header'], [records, 'records'], [free, 'free']].forEach(([t]) => {
      const e = edge([V(t.verts.E.x + 4, t.top[1]), V(cx + 224, t.top[1])], { dashed: true });
      guides.push(e.guide);
    });
    badges.push(`<text class="sst-cap" x="${cx}" y="${A(page.base[1] + 16)}" text-anchor="middle">every page uses the same layout</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null,
      flows: [], note: snap.note });
  }

  /* ── IO: a whole page travels disk → RAM and back ─────────────────────── */
  if (view === 'io') {
    // disk file on the right, RAM frame on the left
    const disk = diskStack(800, 300, 96, 'lilac', 3, {});
    disk.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    badges.push(pill(800, 230, 'disk · data file', { icon: 'database', cls: 'pill--sst' }));

    const ram = isoCube(250, 212, 96, 104, 'green', { icon: 'layers', label: 'RAM', sub: 'page frame', halo: true });
    shadows.push(ram.shadow); halos.push(ram.halo); solids.push(ram.g);

    // the page in transit (amber tile between them)
    const pageT = isoTile(540, 258, 70, 'amber', { h: 20, halo: true });
    shadows.push(pageT.shadow); halos.push(pageT.halo); solids.push(pageT.g);
    badges.push(pill(540, 196, 'whole page', { icon: 'file' }));

    // read rail: disk → RAM (upper), write rail: RAM → disk (lower)
    const er = edge([
      V(disk[0].top[0] - 8, disk[0].top[1] - 2),
      V(540, 232),
      V(ram.verts.E.x + 6, ram.front[1] - 14),
    ], { arrow: true });
    guides.push(er.guide); railIn = er.d;

    const ew = edge([
      V(ram.verts.E.x + 6, ram.front[1] + 20),
      V(540, 330),
      V(disk[0].top[0] - 8, disk[0].top[1] + 20),
    ], { arrow: true, dashed: true });
    guides.push(ew.guide); railOut = ew.d;

    badges.push(pill(395, 180, 'read', { w: 96 }));
    badges.push(pill(395, 372, 'write', { w: 96 }));

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 6 }, { id: 'out', kind: 'write', speed: 150, size: 6 }],
      note: snap.note });
  }

  /* ── SIZES: 4 / 8 / 16 KB page-size trade-off ─────────────────────────── */
  if (view === 'sizes') {
    const specs = [
      { cx: 270, rx: 54, kb: '4 KB',  mat: 'blue',  tag: 'less waste · random read' },
      { cx: 540, rx: 72, kb: '8 KB',  mat: 'green', tag: 'balanced middle ground', halo: true },
      { cx: 820, rx: 96, kb: '16 KB', mat: 'amber', tag: 'more throughput · scan' },
    ];
    specs.forEach(s => {
      const c = isoCube(s.cx, 220, s.rx, s.rx * 0.9, s.mat, { icon: 'file', label: s.kb, halo: s.halo, iconSize: 22 });
      shadows.push(c.shadow); if (c.halo) halos.push(c.halo); solids.push(c.g);
      badges.push(`<text class="sst-cap" x="${s.cx}" y="${A(c.base[1] + 18)}" text-anchor="middle">${esc(s.tag)}</text>`);
    });
    badges.push(pill(270, 120, 'small · pinpoint', { icon: 'search', w: 184 }));
    badges.push(pill(820, 120, 'large · scan', { icon: 'bolt', w: 184 }));

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null,
      flows: [], note: snap.note });
  }

  /* ── ADDRESSING / RECAP: page_id × page_size = offset ─────────────────── */
  // a short file of pages, one indexed, with the arithmetic called out
  const cx = 540, topY = 160, rx = 150;
  const n = 4, pick = 2;
  const tiles = [];
  for (let i = n - 1; i >= 0; i--) {
    tiles.push(isoTile(cx, topY + i * 50, rx, i === pick ? 'green' : 'lilac', { h: 28, halo: i === pick }));
  }
  tiles.forEach(t => { shadows.push(t.shadow); if (t.halo) halos.push(t.halo); solids.push(t.g); });
  badges.push(pill(cx, topY - 48, 'data file', { icon: 'file', cls: 'pill--sst' }));

  const target = tiles[n - 1 - pick];
  badges.push(pill(846, target.top[1], 'page 2', { icon: 'key', w: 120 }));
  const e = edge([V(792, target.top[1]), V(target.verts.E.x + 8, target.top[1])], { arrow: true });
  guides.push(e.guide); railIn = e.d;

  const tags = ['page id', '× page size', '= file offset'];
  tags.forEach((t, i) => badges.push(pill(214, 164 + i * 52, t, { icon: 'check', w: 168 })));
  badges.push(`<text class="sst-cap" x="${cx}" y="${A(tiles[0].base[1] + 18)}" text-anchor="middle">the page is the unit of I/O, caching &amp; addressing</text>`);

  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
    flows: railIn ? [{ id: 'in', kind: 'read', speed: 150, size: 5 }] : [], note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--pages" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Database pages">
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
