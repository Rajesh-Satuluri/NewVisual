/* sequential-vs-random-io-scene.js — the "Sequential vs Random I/O" scene, in
   the Designed-to-Scale isometric vocabulary: rounded iso cubes & tiles, soft
   ground shadows, halos, pill badges, dashed logical regions, routed connectors
   with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'two' (split: contiguous sweep vs scatter), 'sequential' (one sweep +
   prefetch), 'random' (zig-zag seeks), 'numbers' (throughput bars),
   'design' (sequential-friendly structures), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a read head / disk arm glyph anchored at (x,y) */
function head(cx, cy, label) {
  return `<g class="iso-pill pill--sst"><rect x="${A(cx - 34)}" y="${A(cy - 15)}" width="68" height="30" rx="15"/>`
    + `<text class="iso-pill__t" x="${A(cx - 22)}" y="${A(cy + 4.5)}">${esc(label)}</text></g>`;
}

export function renderSequentialVsRandomIoScene(snap, opts = {}) {
  const view = snap.view || 'two';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── TWO: split comparison, the whole lesson in one picture ────────────── */
  if (view === 'two') {
    badges.push(region(70, 120, 408, 330, '', { r: 22 }));
    badges.push(region(562, 120, 408, 330, '', { r: 22 }));
    badges.push(pill(274, 108, 'SEQUENTIAL · one sweep', { icon: 'bolt' }));
    badges.push(pill(766, 108, 'RANDOM · scattered', { icon: 'search', cls: 'pill--sst' }));

    // LEFT: a contiguous run of adjacent pages, read in order
    const seq = [];
    for (let i = 0; i < 6; i++) {
      const cx = 150 + i * 54, cy = 210 + i * 27;
      const t = isoTile(cx, cy, 40, 'green', { h: 14 });
      seq.push({ t, cx, cy });
    }
    seq.forEach(s => { shadows.push(s.t.shadow); solids.push(s.t.g); });
    // one read rail straight down the run
    const re = edge([
      V(seq[0].cx - 20, seq[0].cy - 18),
      V(seq[2].cx, seq[2].cy),
      V(seq[5].cx + 20, seq[5].cy + 18),
    ], { cls: '' });
    guides.push(re.guide); railIn = re.d;
    badges.push(`<text class="sst-cap" x="274" y="428" text-anchor="middle">adjacent blocks · streamed</text>`);

    // RIGHT: the SAME count, scattered, each needing its own jump
    const rnd = [
      { cx: 620, cy: 300 }, { cx: 910, cy: 200 }, { cx: 700, cy: 410 },
      { cx: 860, cy: 360 }, { cx: 640, cy: 180 }, { cx: 800, cy: 250 },
    ];
    const rndT = rnd.map(p => isoTile(p.cx, p.cy, 40, 'rose', { h: 14 }));
    rndT.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    // zig-zag path jumping between them (static guide only, dashed)
    const order = [4, 0, 5, 1, 3, 2];
    const jpts = order.map(i => V(rnd[i].cx, rnd[i].cy - 4));
    const je = edge(jpts, { arrow: true, dashed: true });
    guides.push(je.guide);
    badges.push(`<text class="sst-cap" x="766" y="448" text-anchor="middle">a seek before every page</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'read', speed: 120, size: 5 }], note: snap.note });
  }

  /* ── SEQUENTIAL: one sweep + prefetch ──────────────────────────────────── */
  if (view === 'sequential') {
    badges.push(pill(VW / 2, 96, 'CONTIGUOUS RUN · streamed in order', { icon: 'bolt' }));
    // long row of adjacent pages going into the iso distance
    const n = 8, run = [];
    for (let i = 0; i < n; i++) {
      const cx = 240 + i * 66, cy = 300 - i * 6;
      const hot = i < 4;          // already read / being read
      const t = isoTile(cx, cy, 46, hot ? 'green' : 'lilac', { h: 16, halo: i === 3 });
      run.push({ t, cx, cy, hot });
    }
    run.forEach(s => { if (s.t.halo) halos.push(s.t.halo); shadows.push(s.t.shadow); solids.push(s.t.g); });
    run.forEach((s, i) => badges.push(`<text class="sst-cap" x="${A(s.cx)}" y="${A(s.cy - 26)}">P${i}</text>`));

    // single read rail sweeping the whole run
    const re = edge([
      V(run[0].cx - 26, run[0].cy),
      V(run[3].cx, run[3].cy),
      V(run[n - 1].cx + 26, run[n - 1].cy),
    ], {});
    guides.push(re.guide); railIn = re.d;

    // prefetch bracket over the not-yet-asked tail
    badges.push(region(run[4].cx - 44, run[n - 1].cy - 70, (n - 4) * 66 + 12, 120, 'prefetched', { r: 18 }));
    badges.push(`<text class="sst-cap" x="${A(run[2].cx)}" y="${A(run[2].cy + 54)}" text-anchor="middle">single seek at the start · then pure bandwidth</text>`);
    badges.push(head(170, 300, 'head'));

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'read', speed: 90, size: 6 }], note: snap.note });
  }

  /* ── RANDOM: scattered targets, zig-zag seeks ──────────────────────────── */
  if (view === 'random') {
    badges.push(pill(VW / 2, 92, 'SCATTERED · seek + rotate per page', { icon: 'search', cls: 'pill--sst' }));
    // a faint platter region
    badges.push(region(210, 140, 620, 330, '', { r: 150 }));

    const spots = [
      { cx: 330, cy: 250 }, { cx: 690, cy: 190 }, { cx: 500, cy: 400 },
      { cx: 760, cy: 360 }, { cx: 420, cy: 180 }, { cx: 640, cy: 300 },
      { cx: 300, cy: 380 },
    ];
    const tiles = spots.map((p, i) => isoTile(p.cx, p.cy, 38, i === 0 ? 'rose' : 'lilac', { h: 13, halo: i === 0 }));
    tiles.forEach(t => { if (t.halo) halos.push(t.halo); shadows.push(t.shadow); solids.push(t.g); });

    // the arm jumps between them: each hop a dashed arrowed edge (seek)
    const order = [4, 0, 6, 2, 5, 3, 1];
    for (let k = 0; k < order.length - 1; k++) {
      const a = spots[order[k]], b = spots[order[k + 1]];
      const e = edge([V(a.cx, a.cy - 4), V((a.cx + b.cx) / 2, (a.cy + b.cy) / 2 - 24), V(b.cx, b.cy - 4)], { arrow: true, dashed: true });
      guides.push(e.guide);
    }
    badges.push(`<text class="sst-cap" x="${VW / 2}" y="494" text-anchor="middle">every hop = a full seek + rotational wait before a tiny transfer</text>`);
    badges.push(head(spots[4].cx - 70, spots[4].cy - 30, 'arm'));

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null,
      flows: [], note: snap.note });
  }

  /* ── NUMBERS: throughput bars ──────────────────────────────────────────── */
  if (view === 'numbers') {
    badges.push(pill(VW / 2, 92, 'THROUGHPUT · same pages, different layout', { icon: 'gauge' }));
    const baseY = 440;
    // sequential: a tall stack of page tiles
    const seqN = 9, randN = 1;
    const sx = 380, rx = 680;
    for (let i = 0; i < seqN; i++) {
      const t = isoTile(sx, baseY - i * 30, 70, 'green', { h: 15, halo: i === seqN - 1 });
      if (t.halo) halos.push(t.halo);
      shadows.push(t.shadow); solids.push(t.g);
    }
    for (let i = 0; i < randN; i++) {
      const t = isoTile(rx, baseY - i * 30, 70, 'rose', { h: 15 });
      shadows.push(t.shadow); solids.push(t.g);
    }
    badges.push(pill(sx, baseY - seqN * 30 - 24, '≈ 520 MB/s', { icon: 'bolt' }));
    badges.push(pill(rx, baseY - randN * 30 - 24, '≈ 6 MB/s', { cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="${sx}" y="${baseY + 52}" text-anchor="middle">SEQUENTIAL</text>`);
    badges.push(`<text class="iso-region__t" x="${rx}" y="${baseY + 52}" text-anchor="middle">RANDOM</text>`);
    badges.push(pill(VW / 2, 300, '~100× on HDD · still several× on SSD', { icon: 'scale', cls: 'pill--sst' }));

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null,
      flows: [], note: snap.note });
  }

  /* ── DESIGN: sequential-friendly structures ────────────────────────────── */
  if (view === 'design') {
    badges.push(pill(VW / 2, 90, 'TURNING RANDOM INTO SEQUENTIAL', { icon: 'check' }));
    const groups = [
      { cx: 250, mat: 'amber', icon: 'wal',   label: 'WAL', sub: 'append-only' },
      { cx: 520, mat: 'lilac', icon: 'layers', label: 'Sorted runs', sub: 'LSM flush' },
      { cx: 790, mat: 'green', icon: 'search', label: 'Ordered scan', sub: 'read in order' },
    ];
    groups.forEach(g => {
      // a little contiguous stack under each label = sequential writes/reads
      for (let i = 0; i < 3; i++) {
        const t = isoTile(g.cx, 330 - i * 20, 56, g.mat, { h: 14 });
        shadows.push(t.shadow); solids.push(t.g);
      }
      const c = isoCube(g.cx, 200, 52, 56, g.mat, { icon: g.icon, label: g.label, sub: g.sub, iconSize: 22 });
      shadows.push(c.shadow); solids.push(c.g);
      // one clean sequential rail down into the stack
      const e = edge([V(g.cx, c.base[1] - 6), V(g.cx, 300)], { arrow: true });
      guides.push(e.guide);
    });
    // a shared sequential output rail along the bottom
    const be = edge([V(190, 400), V(520, 400), V(850, 400)], {});
    guides.push(be.guide); railOut = be.d;
    badges.push(`<text class="sst-cap" x="${VW / 2}" y="440" text-anchor="middle">each structure converts scattered writes into one big sequential stream</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut,
      flows: [{ id: 'out', kind: 'write', speed: 110, size: 6 }], note: snap.note });
  }

  /* ── RECAP ─────────────────────────────────────────────────────────────── */
  badges.push(pill(VW / 2, 110, 'SEQUENTIAL  ≫  RANDOM', { icon: 'scale' }));
  const seqC = isoCube(380, 250, 86, 92, 'green', { icon: 'bolt', label: 'Sequential', sub: 'bandwidth', halo: true });
  const rndC = isoCube(680, 250, 70, 70, 'rose', { icon: 'search', label: 'Random', sub: 'positioning' });
  [seqC, rndC].forEach(c => { if (c.halo) halos.push(c.halo); shadows.push(c.shadow); solids.push(c.g); });
  const tags = ['append logs', 'sorted runs', 'batch writes', 'ordered scans'];
  tags.forEach((t, i) => badges.push(pill(870, 170 + i * 52, t, { icon: 'check', w: 160 })));
  badges.push(`<text class="sst-cap" x="530" y="420" text-anchor="middle">positioning dominates transfer — so turn random work into sequential work</text>`);

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
  <svg class="scene scene--sequential-vs-random-io" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Sequential versus random I/O">
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
