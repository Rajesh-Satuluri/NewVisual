/* database-files-scene.js — the "Database Files" storage scene, in the same
   Designed-to-Scale isometric vocabulary as the other lessons: rounded iso
   cubes with icon glyphs and body labels, soft ground shadows, halos, pill
   badges, dashed logical regions, routed connectors with arrows, a faded iso
   grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'heap' (one file = a stack of pages), 'hierarchy' (file → page →
   record), 'organization' (heap / sorted / hashed), 'segments' (data / index /
   overflow), 'growth' (append extents), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a vertical stack of page tiles = a data file. nearest (i=0) paints last. */
function pageStack(cx, topY, rx, tone, layers, opts = {}) {
  const tiles = [];
  for (let i = layers - 1; i >= 0; i--) {
    tiles.push(isoTile(cx, topY + i * 15, rx, tone, {
      h: rx * 0.28,
      halo: opts.halo && i === 0,
      pulse: opts.pulse && (opts.pulseAll || i < (opts.pulseN || 0)),
    }));
  }
  return tiles;
}

export function renderDatabaseFilesScene(snap, opts = {}) {
  const view = snap.view || 'heap';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── HEAP: one data file as a tall stack of pages ─────────────────────── */
  if (view === 'heap') {
    const cx = VW / 2, topY = 150, rx = 150;
    const stack = pageStack(cx, topY, rx, 'lilac', 8, { halo: true });
    stack.forEach((t, i) => { shadows.push(t.shadow); if (i === stack.length - 1) halos.push(t.halo); solids.push(t.g); });

    badges.push(pill(cx, 112, 'users.dat', { icon: 'file', cls: 'pill--sst' }));
    const bottom = stack[0];
    badges.push(`<text class="sst-cap" x="${cx}" y="${A(bottom.base[1] + 16)}" text-anchor="middle">8 fixed-size pages · the physical home of the users table</text>`);
    badges.push(pill(cx + 300, 190, 'one file on disk', { icon: 'database' }));
    badges.push(pill(cx + 300, 242, 'a sequence of pages', { icon: 'layers' }));

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── HIERARCHY: file → page → record, three labelled levels ───────────── */
  if (view === 'hierarchy') {
    const fileC = isoCube(210, 196, 92, 118, 'lilac', { icon: 'file', label: 'File', sub: 'users.dat', halo: true });
    shadows.push(fileC.shadow); halos.push(fileC.halo); solids.push(fileC.g);
    badges.push(pill(210, 92, 'unit of allocation', { icon: 'database' }));

    // a single page lifted out of the file
    const page = isoTile(540, 212, 108, 'blue', { h: 34, halo: true });
    shadows.push(page.shadow); halos.push(page.halo); solids.push(page.g);
    badges.push(pill(540, 118, 'Page · 4–16 KB', { icon: 'layers', cls: 'pill--sst' }));
    badges.push(pill(540, 300, 'unit of I/O', { icon: 'database' }));

    // records as a neat column of pills to the right
    const rX = 858;
    [0, 1, 2, 3].forEach(i => badges.push(pill(rX, 150 + i * 44, `record ${i + 1}`, { icon: 'listOrdered', w: 128 })));
    badges.push(pill(rX, 150 + 4 * 44 + 6, 'unit of data', { icon: 'key' }));

    // arrows: file → page → records
    const e1 = edge([V(fileC.verts.E.x - 2, fileC.front[1]), V((fileC.verts.E.x + page.verts.W.x) / 2, fileC.front[1]), V(page.verts.W.x - 6, page.verts.W.y + 8)], { arrow: true });
    guides.push(e1.guide); railIn = e1.d;
    const e2 = edge([V(page.verts.E.x - 2, page.front[1] - 6), V((page.verts.E.x + rX) / 2, 210), V(rX - 70, 196)], { arrow: true, dashed: true });
    guides.push(e2.guide); railOut = e2.d;

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'read', speed: 170, size: 5 }], note: snap.note });
  }

  /* ── ORGANIZATION: heap / sorted / hashed, three file layouts ─────────── */
  if (view === 'organization') {
    const cols = [
      { cx: 234, tone: 'blue',  title: 'Heap',   sub: 'append anywhere', cap: 'cheap writes · full scans', order: [3, 1, 4, 2] },
      { cx: 520, tone: 'green', title: 'Sorted', sub: 'ordered by key',  cap: 'binary search · costly inserts', order: [1, 2, 3, 4] },
      { cx: 806, tone: 'amber', title: 'Hashed', sub: 'bucket by hash',  cap: 'point lookups · no ranges', order: [2, 4, 1, 3] },
    ];
    cols.forEach(c => {
      const topY = 190, rx = 104;
      const stack = pageStack(c.cx, topY, rx, c.tone, 4);
      stack.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
      badges.push(pill(c.cx, 120, c.title, { icon: 'file', cls: 'pill--sst' }));
      badges.push(pill(c.cx, 162, c.sub, { w: 150 }));
      const bottom = stack[0];
      badges.push(`<text class="sst-cap" x="${c.cx}" y="${A(bottom.base[1] + 16)}" text-anchor="middle">${esc(c.cap)}</text>`);
    });
    badges.push(region(120, 96, 800, 260, '', { r: 24 }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── SEGMENTS: data / index / overflow segments of one table ──────────── */
  if (view === 'segments') {
    const rgX = 150, rgY = 96, rgW = 740, rgH = 300;
    badges.push(region(rgX, rgY, rgW, rgH, '', {}));
    badges.push(pill(rgX + rgW / 2, rgY - 4, 'users  ·  one table, many segments', { icon: 'database' }));

    const segs = [
      { cx: 300, tone: 'lilac', icon: 'layers',      label: 'Data',     sub: 'segment', n: 5 },
      { cx: 520, tone: 'green', icon: 'search',      label: 'Index',    sub: 'segment', n: 3 },
      { cx: 740, tone: 'amber', icon: 'merge',       label: 'Overflow', sub: 'segment', n: 2 },
    ];
    segs.forEach(s => {
      const topY = 176, rx = 86;
      const stack = pageStack(s.cx, topY, rx, s.tone, s.n);
      stack.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
      const bottom = stack[0];
      badges.push(pill(s.cx, 140, s.label, { icon: s.icon, cls: 'pill--sst' }));
      badges.push(`<text class="sst-cap" x="${s.cx}" y="${A(bottom.base[1] + 16)}" text-anchor="middle">${esc(s.sub)} · contiguous extent</text>`);
    });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── GROWTH: a file appending new extents at the end ──────────────────── */
  if (view === 'growth') {
    const cx = 420, topY = 130, rx = 128;
    // original extent (solid) + newly appended extents (one pulsing on top)
    const base = pageStack(cx, topY + 4 * 15, rx, 'lilac', 4);
    base.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    // appended extent on top — pulsing to read as "just allocated"
    const grown = pageStack(cx, topY, rx, 'green', 4, { pulse: true, pulseAll: true });
    grown.forEach((t, i) => { shadows.push(t.shadow); if (i === grown.length - 1) { /* no halo */ } solids.push(t.g); });

    badges.push(pill(cx, 92, 'users.dat', { icon: 'file', cls: 'pill--sst' }));
    const bottom = base[0];
    badges.push(`<text class="sst-cap" x="${cx}" y="${A(bottom.base[1] + 16)}" text-anchor="middle">original extent (4 pages) + new extent appended</text>`);

    badges.push(pill(cx + 360, 150, 'grows by extents', { icon: 'merge' }));
    badges.push(pill(cx + 360, 202, 'not row-by-row', { w: 160 }));
    badges.push(pill(cx + 360, 254, 'pages stay contiguous', { icon: 'check' }));
    badges.push(pill(cx + 360, 306, 'some slack at the tail', { icon: 'alert' }));

    // a write rail flowing into the new extent
    const e = edge([V(cx + 300, 140), V(cx + 150, 150), V(cx + rx * 0.4, topY + 8)], { arrow: true, dashed: true });
    guides.push(e.guide); railOut = e.d;

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut,
      flows: [{ id: 'out', kind: 'write', speed: 130, size: 6 }], note: snap.note });
  }

  /* ── RECAP: the three units, labelled ─────────────────────────────────── */
  const fileC = isoCube(260, 210, 96, 120, 'lilac', { icon: 'file', label: 'File', sub: 'allocation', halo: true });
  shadows.push(fileC.shadow); halos.push(fileC.halo); solids.push(fileC.g);
  const page = isoTile(540, 224, 100, 'blue', { h: 32, halo: true });
  shadows.push(page.shadow); halos.push(page.halo); solids.push(page.g);
  const rec = isoCube(812, 212, 72, 78, 'amber', { icon: 'listOrdered', label: 'Record', sub: 'data', halo: true });
  shadows.push(rec.shadow); halos.push(rec.halo); solids.push(rec.g);

  badges.push(pill(260, 104, 'unit of allocation', { icon: 'database' }));
  badges.push(pill(540, 126, 'Page · unit of I/O', { icon: 'layers', cls: 'pill--sst' }));
  badges.push(pill(812, 104, 'unit of data', { icon: 'key' }));

  const a1 = edge([V(fileC.verts.E.x - 2, fileC.front[1]), V((fileC.verts.E.x + page.verts.W.x) / 2, fileC.front[1]), V(page.verts.W.x - 6, page.verts.W.y + 8)], { arrow: true });
  guides.push(a1.guide); railIn = a1.d;
  const a2 = edge([V(page.verts.E.x - 2, page.front[1] - 4), V((page.verts.E.x + rec.verts.W.x) / 2, 210), V(rec.verts.W.x - 6, rec.verts.W.y + 8)], { arrow: true });
  guides.push(a2.guide); railOut = a2.d;

  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
    flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'read', speed: 170, size: 5 }], note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--database-files" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Database files on disk">
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
