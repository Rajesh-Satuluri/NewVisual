/* sstable-scene.js — the "SSTable" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes/tiles with icon glyphs and labels,
   soft ground shadows, halos, pill badges, dashed logical regions, routed
   connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'flush-in' (a MemTable flush lands as an unstructured dump),
   'sorted' (sorted + immutable), 'blocks' (fixed-size data blocks),
   'index' (sparse index → one block read), 'levels' (many SSTables, read
   amplification), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a vertical stack of SSTable blocks. Returns [{i, cx, cy}] back→front
   (i = n-1 first so the lowest/nearest block paints last). */
function blockStack(cx, topY, rx, mat, n, gap, opts = {}) {
  const bodyH = opts.bodyH != null ? opts.bodyH : rx * 0.26;
  const hot = opts.hot || [];
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const cy = topY + i * gap;
    const t = isoTile(cx, cy, rx, hot.includes(i) ? 'rose' : mat, {
      h: bodyH, halo: opts.halo === i,
    });
    out.push({ i, cx, cy, t });
  }
  return out;
}

export function renderSstableScene(snap, opts = {}) {
  const view = snap.view || 'blocks';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const flows = [];

  const paint = (arr) => arr.forEach(b => {
    shadows.push(b.t.shadow); if (b.t.halo && b.halo) halos.push(b.t.halo); solids.push(b.t.g);
  });
  const paintHalo = (arr) => arr.forEach(b => { shadows.push(b.t.shadow); if (b.t.halo) halos.push(b.t.halo); solids.push(b.t.g); });

  /* ── FLUSH-IN: MemTable → an unstructured dump ─────────────────────────── */
  if (view === 'flush-in') {
    const mem = isoCube(250, 170, 78, 70, 'green', {
      icon: 'listOrdered', label: 'MemTable', sub: 'sorted, in RAM', halo: true, iconSize: 24,
    });
    shadows.push(mem.shadow); halos.push(mem.halo); solids.push(mem.g);

    const fileCx = 672, topY = 212, rx = 104, gap = 28, n = 6;
    const stack = blockStack(fileCx, topY, rx, 'lilac', n, gap, { hot: [0, 1, 2, 3, 4, 5] });
    paintHalo(stack);

    // flush rail: MemTable → top of the file
    const fe = edge([
      V(mem.verts.E.x - 2, mem.front[1]),
      V((mem.verts.E.x + fileCx) / 2, topY - 24),
      V(fileCx - rx * 0.4, topY - 6),
    ], { arrow: true });
    guides.push(fe.guide); railIn = fe.d;
    flows.push({ id: 'in', kind: 'flush', speed: 150, size: 6 });

    badges.push(pill(fileCx, topY - 44, 'flat dump · unsorted', { icon: 'file', cls: 'pill--sst' }));
    badges.push(region(fileCx - rx - 26, topY - 24, (rx + 26) * 2, gap * (n - 1) + 92, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="${A(fileCx)}" y="${A(topY + gap * (n - 1) + 52)}" text-anchor="middle">A KEY COULD BE ANYWHERE · FULL SCAN</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SORTED / BLOCKS / INDEX / RECAP all draw one SSTable block stack ──── */
  if (view === 'sorted' || view === 'blocks' || view === 'recap') {
    const cx = view === 'recap' ? 420 : 500;
    const topY = 170, rx = 112, gap = 30, n = 6;
    const stack = blockStack(cx, topY, rx, 'green', n, gap);
    paint(stack);

    const keys = ['a – c', 'd – f', 'g – k', 'l – p', 'q – t', 'u – z'];
    // right-hand captions, aligned to each block (top → bottom = i 0..n-1)
    for (let i = 0; i < n; i++) {
      const cy = topY + i * gap;
      const txt = view === 'blocks' ? `block ${i} · ${keys[i]}` : keys[i];
      badges.push(`<text class="sst-cap" x="${A(cx + rx + 16)}" y="${A(cy + 5)}" text-anchor="start">${esc(txt)}</text>`);
    }
    // a small up-arrow on the left marking ascending order
    const ae = edge([V(cx - rx - 20, topY + gap * (n - 1) + 6), V(cx - rx - 20, topY - 6)], { arrow: true, dashed: true });
    guides.push(ae.guide);
    badges.push(`<text class="sst-cap" x="${A(cx - rx - 34)}" y="${A(topY + gap * (n - 1) / 2)}" text-anchor="end" transform="rotate(-90 ${A(cx - rx - 34)} ${A(topY + gap * (n - 1) / 2)})">keys ascending</text>`);

    if (view === 'sorted') {
      badges.push(pill(cx, topY - 44, 'SORTED by key', { icon: 'listOrdered', cls: 'pill--sst' }));
      badges.push(pill(cx + rx + 150, topY - 10, 'immutable · write once', { icon: 'key', w: 220 }));
    } else if (view === 'blocks') {
      badges.push(pill(cx, topY - 44, 'fixed-size 4 KB data blocks', { icon: 'file', w: 262, cls: 'pill--sst' }));
      badges.push(`<text class="sst-cap" x="${A(cx)}" y="${A(topY + gap * (n - 1) + 62)}" text-anchor="middle">a block is the unit of disk I/O</text>`);
    } else {
      // recap: four property pills on the right
      badges.push(pill(cx, topY - 44, 'one SSTable', { icon: 'database', cls: 'pill--sst' }));
      const tags = ['sorted', 'immutable', '4 KB blocks', 'sparse index'];
      tags.forEach((t, i) => badges.push(pill(760, 140 + i * 58, t, { icon: 'check', w: 210 })));
    }

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── INDEX: sparse index on the left points at one hot block ────────────── */
  if (view === 'index') {
    const cx = 712, topY = 168, rx = 100, gap = 30, n = 5;
    const hotBlock = 2;
    const stack = blockStack(cx, topY, rx, 'green', n, gap, { hot: [hotBlock], halo: hotBlock });
    paintHalo(stack);
    badges.push(pill(cx, topY - 42, 'data blocks', { icon: 'file', cls: 'pill--sst' }));

    // right-hand first-key captions
    const firsts = ['a', 'g', 'n', 's', 'w'];
    for (let i = 0; i < n; i++) {
      badges.push(`<text class="sst-cap" x="${A(cx + rx + 14)}" y="${A(topY + i * gap + 5)}" text-anchor="start">first: ${esc(firsts[i])}</text>`);
    }

    // the sparse index as a tall panel on the left
    const ix = 236, iy = 150, iw = 180, ih = gap * (n - 1) + 96;
    badges.push(region(ix - iw / 2, iy, iw, ih, '', { r: 20 }));
    badges.push(pill(ix, iy + 16, 'sparse index', { icon: 'search', w: 160 }));
    for (let i = 0; i < n; i++) {
      const ey = iy + 54 + i * gap;
      const hot = i === hotBlock;
      badges.push(`<text class="sst-cap" x="${A(ix)}" y="${A(ey + 4)}" text-anchor="middle"${hot ? ' style="font-weight:700"' : ''}>${esc(firsts[i])} → blk ${i}</text>`);
    }

    // arrow from the matched index entry to the hot block's west vertex
    const ey = iy + 54 + hotBlock * gap;
    const me = edge([
      V(ix + iw / 2 - 6, ey),
      V((ix + iw / 2 + (cx - rx)) / 2, topY + hotBlock * gap),
      V(cx - rx - 4, topY + hotBlock * gap),
    ], { arrow: true });
    guides.push(me.guide); railIn = me.d;
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });

    badges.push(pill(cx, topY + gap * (n - 1) + 62, 'binary-search → ONE block read', { icon: 'check', w: 316, cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LEVELS: many SSTables, one read fans across them ───────────────────── */
  if (view === 'levels') {
    const xs = [226, 420, 614, 808];
    const topY = 248, rx = 76, gap = 22, n = 4;
    const probeY = 118;
    xs.forEach((x, k) => {
      const stack = blockStack(x, topY, rx, k === 0 ? 'rose' : 'lilac', n, gap, {});
      paint(stack);
      badges.push(`<text class="sst-cap" x="${A(x)}" y="${A(topY + gap * (n - 1) + 54)}" text-anchor="middle">SSTable ${k + 1}</text>`);
      // a probe edge from the central read point down into each table
      const pe = edge([V(VW / 2, probeY), V(x, topY - 28), V(x, topY - 8)], { arrow: true, dashed: k !== 0 });
      guides.push(pe.guide);
      if (k === 0) railIn = pe.d;
    });
    badges.push(pill(VW / 2, probeY - 22, 'one read · which table?', { icon: 'search', cls: 'pill--sst' }));
    badges.push(region(xs[0] - rx - 24, topY - 36, (xs[3] - xs[0]) + (rx + 24) * 2, gap * (n - 1) + 100, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="${A(VW / 2)}" y="${A(topY + gap * (n - 1) + 78)}" text-anchor="middle">READ AMPLIFICATION · PROBE EVERY TABLE</text>`);
    flows.push({ id: 'in', kind: 'read', speed: 170, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  // fallback: blocks
  const stack = blockStack(500, 170, 112, 'green', 6, 30);
  paint(stack);
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
  <svg class="scene scene--sstable" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="SSTable on-disk layout">
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
