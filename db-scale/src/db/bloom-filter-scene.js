/* bloom-filter-scene.js — the "Bloom Filter" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes/tiles with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, k, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'probe-all' (a miss sweeps every SSTable), 'bitarray' (an empty
   filter), 'insert' (set k bits), 'query' (definitely-not vs maybe), 'fpr'
   (a false positive), 'recap' (filters skip the useless files). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a horizontal row of bit cells; bits = array of 0/1. Returns the tiles so
   callers can hang hash arrows off individual cells. */
function bitRow(cx, cy, bits, out) {
  const n = bits.length, gap = 44;
  const x0 = cx - (n - 1) * gap / 2;
  const tiles = bits.map((b, i) => {
    const t = isoTile(x0 + i * gap, cy, 17, b ? 'green' : 'slate', { h: 11, halo: !!b && out.haloSet });
    out.shadows.push(t.shadow); if (b && out.haloSet) out.halos.push(t.halo); out.solids.push(t.g);
    out.badges.push(`<text class="sst-cap" x="${x0 + i * gap}" y="${A(t.base[1] + 13)}" text-anchor="middle">${b ? 1 : 0}</text>`);
    return t;
  });
  return { tiles, x0, gap };
}

/* dashed hash arrows from a source cube's east vertex to the given cells */
function hashArrows(src, tiles, idxs, guides, lift) {
  idxs.forEach((ci, n) => {
    const c = tiles[ci];
    const e = edge([
      V(src.verts.E.x, src.verts.E.y),
      V((src.verts.E.x + c.top[0]) / 2, c.top[1] - (lift || 54) - n * 6),
      V(c.top[0], c.top[1] - 2),
    ], { arrow: true, dashed: true });
    guides.push(e.guide);
  });
}

export function renderBloomFilterScene(snap, opts = {}) {
  const view = snap.view || 'bitarray';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const out = { shadows, halos, solids, badges, haloSet: false };

  /* ── PROBE-ALL: a miss sweeps every SSTable ───────────────────────────── */
  if (view === 'probe-all') {
    const key = isoCube(158, 250, 52, 62, 'blue', { icon: 'search', label: 'GET "k"', sub: 'absent', iconSize: 24 });
    shadows.push(key.shadow); solids.push(key.g);

    const xs = [372, 500, 628, 756, 884];
    const files = xs.map((x, i) => isoCube(x, 250, 46, 54, 'lilac', {
      icon: 'file', label: 'L' + i, sub: 'SSTable', iconSize: 18,
    }));
    files.forEach((f, i) => {
      shadows.push(f.shadow); solids.push(f.g);
      const e = edge([
        V(key.verts.E.x, key.verts.E.y),
        V((key.verts.E.x + f.verts.W.x) / 2, key.verts.E.y - 4),
        V(f.verts.W.x - 4, f.verts.W.y + 8),
      ], { arrow: true, dashed: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d;
      badges.push(pill(xs[i], 150, 'miss', { icon: 'alert', cls: 'pill--sst' }));
    });
    badges.push(region(316, 196, 616, 150, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="628" y="${A(392)}" text-anchor="middle">EVERY FILE READ · EVERY FILE EMPTY</text>`);
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null, flows, note: snap.note });
  }

  /* ── BITARRAY: an empty filter ────────────────────────────────────────── */
  if (view === 'bitarray') {
    badges.push(region(250, 196, 540, 150, '', { r: 22 }));
    badges.push(pill(520, 170, 'bit array · 14 bits', { icon: 'listOrdered', cls: 'pill--sst' }));
    bitRow(520, 268, new Array(14).fill(0), out);
    badges.push(`<text class="sst-cap" x="520" y="${A(360)}" text-anchor="middle">all zero — nothing inserted yet</text>`);
    const k = snap.k || 3;
    for (let i = 0; i < k; i++) badges.push(pill(900, 150 + i * 56, 'hash ' + (i + 1), { icon: 'key', w: 150 }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── INSERT: set k bits ───────────────────────────────────────────────── */
  if (view === 'insert') {
    const key = isoCube(158, 236, 52, 60, 'blue', { icon: 'key', label: 'PUT', sub: '"apple"', iconSize: 22 });
    shadows.push(key.shadow); solids.push(key.g);

    // two bits pre-set by an earlier key, three set now by "apple"
    const bits = new Array(14).fill(0);
    const prior = [4, 9];
    const now = [2, 7, 11];
    [...prior, ...now].forEach(i => bits[i] = 1);
    out.haloSet = true;
    const row = bitRow(600, 300, bits, out);
    out.haloSet = false;

    hashArrows(key, row.tiles, now, guides, 70);
    badges.push(pill(600, 180, 'hash "apple" → 3 positions → set to 1', { icon: 'key', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="600" y="${A(392)}" text-anchor="middle">grey bits were set by an earlier key — bits are shared</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── QUERY: definitely-not vs maybe ───────────────────────────────────── */
  if (view === 'query') {
    const bits = new Array(14).fill(0);
    [2, 4, 7, 9, 11].forEach(i => bits[i] = 1);
    const row = bitRow(620, 282, bits, out);

    const k1 = isoCube(150, 150, 46, 54, 'green', { icon: 'search', label: 'GET', sub: '"pear"', iconSize: 20 });
    const k2 = isoCube(150, 392, 46, 54, 'amber', { icon: 'search', label: 'GET', sub: '"plum"', iconSize: 20 });
    [k1, k2].forEach(c => { shadows.push(c.shadow); solids.push(c.g); });

    // "pear" hits a 0 bit (index 1) → certain miss
    hashArrows(k1, row.tiles, [1, 7, 11], guides, 58);
    // "plum" finds all three 1 → maybe
    hashArrows(k2, row.tiles, [4, 9, 11], guides, 58);

    badges.push(pill(300, 110, 'bit 1 is 0 → DEFINITELY NOT · skip', { icon: 'check', w: 300 }));
    badges.push(pill(300, 452, 'all 1 → MAYBE · read the file', { icon: 'alert', w: 282 }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── FPR: a false positive ────────────────────────────────────────────── */
  if (view === 'fpr') {
    const bits = new Array(14).fill(0);
    [1, 2, 4, 5, 7, 8, 9, 11, 12].forEach(i => bits[i] = 1); // densely filled
    const row = bitRow(600, 292, bits, out);

    const key = isoCube(158, 250, 52, 60, 'amber', { icon: 'search', label: 'GET', sub: '"ghost"', iconSize: 22 });
    shadows.push(key.shadow); solids.push(key.g);
    hashArrows(key, row.tiles, [2, 9, 11], guides, 64); // all happen to be 1

    badges.push(pill(600, 176, 'all 3 bits set — by coincidence', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(846, 170, 'says MAYBE', { icon: 'alert', w: 170 }));
    badges.push(pill(846, 226, 'key is absent', { icon: 'check', w: 170 }));
    badges.push(pill(846, 300, 'more bits/key', { icon: 'sliders', w: 170 }));
    badges.push(pill(846, 356, '↓ false positives', { icon: 'gauge', w: 170 }));
    badges.push(`<text class="sst-cap" x="600" y="${A(384)}" text-anchor="middle">a wasted read — never a wrong answer (no false negatives)</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── RECAP: filters skip the useless files ────────────────────────────── */
  const key = isoCube(150, 250, 50, 60, 'blue', { icon: 'search', label: 'GET "k"', iconSize: 22 });
  shadows.push(key.shadow); solids.push(key.g);

  const specs = [
    { x: 420, verdict: 'skip', mat: 'green' },
    { x: 620, verdict: 'read', mat: 'amber' },
    { x: 820, verdict: 'skip', mat: 'green' },
  ];
  specs.forEach((s, i) => {
    const f = isoCube(s.x, 236, 46, 56, 'lilac', { icon: 'file', label: 'L' + i, sub: 'SSTable', iconSize: 18 });
    shadows.push(f.shadow); solids.push(f.g);
    // the little in-RAM bloom filter in front of each file
    const bf = isoTile(s.x, 356, 30, s.mat, { h: 16, halo: s.verdict === 'read' });
    shadows.push(bf.shadow); if (s.verdict === 'read') halos.push(bf.halo); solids.push(bf.g);
    badges.push(`<text class="sst-cap" x="${s.x}" y="${A(bf.base[1] + 14)}" text-anchor="middle">${s.verdict === 'read' ? 'maybe → read' : 'no → skip'}</text>`);
    const e = edge([
      V(key.verts.E.x, key.verts.E.y),
      V((key.verts.E.x + f.verts.W.x) / 2, key.verts.E.y - 6 - i * 4),
      V(f.verts.W.x - 4, f.verts.W.y + 6),
    ], { arrow: true, dashed: s.verdict === 'skip' });
    guides.push(e.guide);
    if (s.verdict === 'read') railIn = e.d;
  });
  badges.push(region(360, 196, 560, 220, '', { r: 22 }));
  badges.push(`<text class="iso-region__t" x="640" y="${A(430)}" text-anchor="middle">PROBE ONLY THE FILES THAT MIGHT HELP</text>`);
  [ 'no false negatives', 'tunable FP rate', 'kilobytes of RAM' ].forEach((t, i) =>
    badges.push(pill(150, 356 + i * 52, t, { icon: 'check', w: 200 })));
  flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null, flows, note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--bloom-filter" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Bloom filter">
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
