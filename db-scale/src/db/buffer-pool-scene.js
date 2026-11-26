/* buffer-pool-scene.js — the "Buffer Pool" scene, in the same Designed-to-Scale
   isometric vocabulary as the other Storage-Engine lessons: rounded iso cubes
   with icon glyphs and labels, soft ground shadows, halos, pill badges, dashed
   logical regions, routed connectors with arrows, a faded iso grid, particle
   rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'gap' (RAM vs disk chasm), 'pool' (frames caching pages), 'pagetable'
   (page_id → frame lookup), 'hitmiss' (two read paths), 'dirty' (pin & dirty
   frames), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a short stack of disk tiles = the data file on disk */
function diskStack(cx, topY, rx, tone, layers, opts = {}) {
  const tiles = [];
  for (let i = layers - 1; i >= 0; i--) {
    tiles.push(isoTile(cx, topY + i * 16, rx, tone, { h: rx * 0.3, halo: opts.halo && i === 0, pulse: opts.pulse }));
  }
  return tiles; // nearest (i=0) last so it paints on top
}

/* a grid of RAM frames (rows × cols of small tiles). tones[k] overrides a
   frame's material by flat index; returns { tiles, at(i) } */
function frameGrid(cx, topY, cols, rows, cell, tones = {}) {
  const tiles = [];
  const at = [];
  const startX = cx - (cols - 1) * cell / 2;
  let k = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++, k++) {
      const fx = startX + c * cell;
      const fy = topY + r * (cell * 0.56);
      const t = isoTile(fx, fy, cell * 0.44, tones[k] || 'slate', { h: cell * 0.22 });
      tiles.push(t); at.push(t);
    }
  }
  return { tiles, at };
}

export function renderBufferPoolScene(snap, opts = {}) {
  const view = snap.view || 'pool';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── GAP VIEW: RAM vs disk latency chasm ──────────────────────────────── */
  if (view === 'gap') {
    // RAM: a tiny, fast green cube on the left
    const ram = isoCube(300, 230, 74, 72, 'green', { icon: 'bolt', label: 'RAM', sub: '~100 ns', halo: true });
    shadows.push(ram.shadow); halos.push(ram.halo); solids.push(ram.g);

    // disk: a heavy lilac stack far on the right
    const disk = diskStack(760, 236, 92, 'lilac', 3, {});
    disk.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    const dlab = isoCube(760, 190, 90, 86, 'lilac', { icon: 'database', label: 'Disk', sub: '~10 ms' });
    shadows.push(dlab.shadow); solids.push(dlab.g);

    // the chasm between them
    badges.push(region(392, 150, 276, 230, '', { r: 22 }));
    badges.push(pill(530, 138, '100,000× slower', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="530" y="270" text-anchor="middle">THE LATENCY CHASM</text>`);

    // a read crawling across the gap toward disk
    const e = edge([V(ram.verts.E.x - 2, ram.front[1]), V(530, 300), V(dlab.verts.W.x + 6, dlab.front[1])], { arrow: true, dashed: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(`<text class="sst-cap" x="530" y="360" text-anchor="middle">one uncached read = thousands of RAM reads</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'read', speed: 70, size: 6 }], note: snap.note });
  }

  /* ── common disk file at the bottom for pool-family views ──────────────── */
  const diskTop = 470, diskCx = 548;

  /* ── POOL VIEW: frames caching pages above the disk ───────────────────── */
  if (view === 'pool') {
    badges.push(region(300, 70, 496, 232, '', {}));
    badges.push(pill(548, 60, 'BUFFER POOL · RAM', { icon: 'layers' }));

    const tones = { 0: 'green', 1: 'blue', 2: 'green', 3: 'blue', 5: 'green', 6: 'blue' };
    const fg = frameGrid(548, 128, 4, 2, 112, tones);
    fg.tiles.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    badges.push(`<text class="sst-cap" x="548" y="300" text-anchor="middle">eight fixed frames · one page each</text>`);

    const disk = diskStack(diskCx, diskTop, 96, 'lilac', 3, {});
    disk.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    badges.push(`<text class="sst-cap" x="${diskCx}" y="${A(disk[disk.length - 1].base[1] + 16)}" text-anchor="middle">pages on disk</text>`);

    // a page copied up from disk into a frame
    const target = fg.at[4];
    const up = edge([V(disk[0].top[0] - 40, disk[0].top[1] - 2), V(target.top[0], (disk[0].top[1] + target.base[1]) / 2), V(target.top[0], target.base[1] - 2)], { arrow: true, dashed: true });
    guides.push(up.guide); railIn = up.d;

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── PAGETABLE VIEW: page_id → frame lookup ───────────────────────────── */
  if (view === 'pagetable') {
    // the page table on the left as a stack of mapping pills
    badges.push(region(96, 110, 250, 250, '', { r: 18 }));
    badges.push(pill(221, 100, 'PAGE TABLE', { icon: 'listOrdered' }));
    const rows = [['page 7', 'frame 0'], ['page 42', 'frame 3'], ['page 13', 'frame 5'], ['page 88', '—']];
    rows.forEach((row, i) => {
      badges.push(pill(170, 150 + i * 46, row[0], { w: 108, cls: 'pill--sst' }));
      badges.push(`<text class="sst-cap" x="238" y="${155 + i * 46}" text-anchor="middle">→</text>`);
      badges.push(pill(300, 150 + i * 46, row[1], { w: 90 }));
    });

    // frame grid on the right, frame 3 highlighted as the target
    badges.push(region(452, 110, 496, 232, '', {}));
    badges.push(pill(700, 100, 'FRAMES · RAM', { icon: 'layers' }));
    const tones = { 0: 'green', 3: 'rose', 5: 'green' };
    const fg = frameGrid(700, 168, 4, 2, 112, tones);
    fg.tiles.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    badges.push(`<text class="sst-cap" x="${A(fg.at[3].top[0])}" y="${A(fg.at[3].base[1] + 14)}" text-anchor="middle">frame 3</text>`);

    // arrow from "page 42 → frame 3" mapping into frame 3
    const e = edge([V(345, 196), V(fg.at[3].verts.W.x - 24, fg.at[3].front[1]), V(fg.at[3].verts.W.x - 4, fg.at[3].front[1])], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(`<text class="sst-cap" x="700" y="330" text-anchor="middle">O(1) hash lookup decides hit or miss</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── HITMISS VIEW: two read paths contrasted ──────────────────────────── */
  if (view === 'hitmiss') {
    // requester on the left
    const client = isoCube(140, 230, 50, 60, 'blue', { icon: 'app', label: 'Query' });
    shadows.push(client.shadow); solids.push(client.g);

    // HIT path — top: straight to a resident frame
    const hitFrame = isoCube(470, 128, 60, 58, 'green', { icon: 'check', label: 'frame', sub: 'resident' });
    shadows.push(hitFrame.shadow); solids.push(hitFrame.g);
    badges.push(pill(470, 72, 'HIT · from RAM', { icon: 'bolt' }));
    const hit = edge([V(client.verts.N.x + 6, client.verts.N.y + 4), V(300, 150), V(hitFrame.verts.W.x - 6, hitFrame.front[1])], { arrow: true });
    guides.push(hit.guide); railIn = hit.d;

    // MISS path — bottom: evict + disk fetch + fill
    const missFrame = isoCube(470, 300, 60, 58, 'slate', { icon: 'layers', label: 'frame', sub: 'free' });
    shadows.push(missFrame.shadow); solids.push(missFrame.g);
    badges.push(pill(470, 374, 'MISS · evict + disk read', { icon: 'alert', cls: 'pill--sst' }));
    const miss1 = edge([V(client.verts.S.x + 4, client.verts.S.y - 2), V(300, 322), V(missFrame.verts.W.x - 6, missFrame.front[1])], { arrow: true, dashed: true });
    guides.push(miss1.guide);
    const disk = diskStack(760, 320, 82, 'lilac', 2, {});
    disk.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    const miss2 = edge([V(disk[0].top[0] - 30, disk[0].top[1] - 2), V((disk[0].top[0] + missFrame.base[0]) / 2, missFrame.base[1]), V(missFrame.verts.E.x + 6, missFrame.front[1])], { arrow: true, dashed: true });
    guides.push(miss2.guide); railOut = miss2.d;
    badges.push(`<text class="sst-cap" x="760" y="${A(disk[disk.length - 1].base[1] + 16)}" text-anchor="middle">disk fetch</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 220, size: 5 }, { id: 'out', kind: 'read', speed: 90, size: 6 }], note: snap.note });
  }

  /* ── DIRTY VIEW: pinned & dirty frames, write-back to disk ─────────────── */
  if (view === 'dirty') {
    badges.push(region(300, 70, 496, 232, '', {}));
    badges.push(pill(548, 60, 'BUFFER POOL', { icon: 'layers' }));
    const tones = { 1: 'amber', 4: 'rose', 0: 'green', 6: 'green' };
    const fg = frameGrid(548, 128, 4, 2, 112, tones);
    fg.tiles.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });

    // label the pinned (amber) and dirty (rose) frames
    badges.push(pill(fg.at[1].top[0], fg.at[1].top[1] - 36, 'PINNED · in use', { icon: 'key', cls: 'pill--sst' }));
    badges.push(pill(fg.at[4].top[0], fg.at[4].base[1] + 26, 'DIRTY · modified', { icon: 'alert', cls: 'pill--sst' }));

    const disk = diskStack(diskCx, diskTop, 96, 'lilac', 3, {});
    disk.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    badges.push(`<text class="sst-cap" x="${diskCx}" y="${A(disk[disk.length - 1].base[1] + 16)}" text-anchor="middle">write dirty page back before reuse</text>`);

    // dirty frame flushes down to disk (write rail)
    const df = fg.at[4];
    const wb = edge([V(df.base[0], df.base[1] - 4), V(df.base[0] + 10, (df.base[1] + diskTop) / 2), V(disk[0].top[0] + 30, disk[0].top[1] - 2)], { arrow: true, dashed: true });
    guides.push(wb.guide); railOut = wb.d;

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut,
      flows: [{ id: 'out', kind: 'write', speed: 140, size: 6 }], note: snap.note });
  }

  /* ── RECAP VIEW: the whole pool, disk barely moving ───────────────────── */
  badges.push(region(300, 70, 496, 232, '', {}));
  badges.push(pill(548, 60, 'BUFFER POOL', { icon: 'layers' }));
  const tones = { 0: 'green', 1: 'blue', 2: 'green', 3: 'green', 4: 'blue', 5: 'green', 6: 'green', 7: 'blue' };
  const fg = frameGrid(548, 128, 4, 2, 112, tones);
  fg.tiles.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
  badges.push(`<text class="sst-cap" x="548" y="300" text-anchor="middle">page table · pin counts · dirty bits</text>`);

  const disk = diskStack(diskCx, diskTop, 96, 'lilac', 3, {});
  disk.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
  badges.push(`<text class="sst-cap" x="${diskCx}" y="${A(disk[disk.length - 1].base[1] + 16)}" text-anchor="middle">disk barely moves</text>`);

  const tags = ['hit rate 96%', 'RAM speed', 'miss → disk'];
  tags.forEach((t, i) => badges.push(pill(878, 120 + i * 52, t, { icon: 'check', w: 158 })));

  const rareMiss = edge([V(disk[0].top[0] - 40, disk[0].top[1] - 2), V(fg.at[7].top[0], (disk[0].top[1] + fg.at[7].base[1]) / 2), V(fg.at[7].top[0], fg.at[7].base[1] - 2)], { arrow: true, dashed: true });
  guides.push(rareMiss.guide); railIn = rareMiss.d;

  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
    flows: [{ id: 'in', kind: 'read', speed: 170, size: 5 }], note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--buffer-pool" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Buffer pool">
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
