/* lsm-compaction-scene.js — the "LSM Compaction" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso SSTable tiles grouped
   into levels, a k-way merge node, dashed logical regions, routed connectors
   with arrows, pill badges, a faded iso grid, and particle rails (read/write/
   compact).

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'pileup' (unmerged SSTables degrade reads/space), 'merge' (k-way
   merge of sorted runs), 'dedup' (newest-wins + tombstone drop), 'tiered'
   (size-tiered compaction), 'leveled' (leveled compaction pyramid), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderLsmCompactionScene(snap, opts = {}) {
  const view = snap.view || 'pileup';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* a labelled SSTable tile */
  function sst(cx, cy, rx, tone, opts2 = {}) {
    const t = isoTile(cx, cy, rx, tone, { halo: opts2.halo, ghost: opts2.ghost });
    shadows.push(t.shadow); if (opts2.halo) halos.push(t.halo); solids.push(t.g);
    if (opts2.cap) badges.push(`<text class="sst-cap" x="${A(cx)}" y="${A(t.base[1] + 15)}" text-anchor="middle">${esc(opts2.cap)}</text>`);
    return t;
  }

  /* ── PILE-UP: many unmerged SSTables, every read probes them all ───────── */
  if (view === 'pileup') {
    const reader = isoCube(148, 250, 60, 70, 'blue', { icon: 'search', label: 'Reader', sub: 'GET k', iconSize: 24 });
    shadows.push(reader.shadow); solids.push(reader.g);

    // a leaning pile of SSTables (a couple hot/stale in rose)
    const n = 9, cx0 = 520, topY = 96;
    const stale = { 2: 1, 5: 1, 7: 1 };
    const tiles = [];
    for (let i = 0; i < n; i++) {
      const cx = cx0 + i * 6;
      const cy = topY + i * 34;
      tiles.push(sst(cx, cy, 86, stale[i] ? 'rose' : 'lilac', { halo: i === 0 }));
    }
    badges.push(region(cx0 - 130, topY - 30, 320, n * 34 + 92, '', { r: 22 }));
    badges.push(pill(cx0 + 30, topY - 46, 'L0 · flushes keep piling up', { icon: 'file', cls: 'pill--sst' }));

    // read probe: reader → top of pile, then a dashed spine down through all
    const e = edge([V(reader.verts.E.x - 2, reader.front[1]), V(cx0 - 60, topY + 6), V(tiles[0].top[0] - 20, tiles[0].top[1])], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    const spine = edge([V(cx0 - 90, topY + 12), V(cx0 - 90, topY + (n - 1) * 34 + 20)], { dashed: true });
    guides.push(spine.guide);
    badges.push(`<text class="iso-region__t" x="${cx0 - 90}" y="${A(topY + n * 34 + 46)}" text-anchor="middle">PROBE EVERY FILE · STALE VERSIONS LINGER</text>`);
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null, flows, note: snap.note });
  }

  /* ── MERGE: k sorted inputs → k-way merge → one sorted output ──────────── */
  if (view === 'merge') {
    const inX = 236, inYs = [118, 206, 294, 382];
    const ins = inYs.map((y, i) => sst(inX, y, 60, 'lilac', { cap: `run ${i + 1} · sorted` }));
    badges.push(pill(inX, 76, 'sorted SSTables', { icon: 'file', cls: 'pill--sst' }));

    const merge = isoCube(560, 250, 74, 82, 'amber', { icon: 'merge', label: 'k-way', sub: 'merge', halo: true, iconSize: 24 });
    shadows.push(merge.shadow); halos.push(merge.halo); solids.push(merge.g);

    const out = sst(856, 250, 76, 'green', { cap: 'one key · once', halo: true });
    badges.push(pill(856, 150, 'fewer · larger', { icon: 'check', cls: 'pill--sst' }));

    ins.forEach((t, i) => {
      const e = edge([V(t.verts.E.x - 4, t.front[1]), V((t.verts.E.x + merge.verts.W.x) / 2, merge.top[1]), V(merge.verts.W.x - 6, merge.verts.W.y)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d;
    });
    const oe = edge([V(merge.verts.E.x - 4, merge.front[1]), V((merge.verts.E.x + out.top[0]) / 2, merge.front[1]), V(out.verts.W.x - 6, out.verts.W.y)], { arrow: true });
    guides.push(oe.guide); railOut = oe.d;

    badges.push(`<text class="iso-region__t" x="546" y="500" text-anchor="middle">SORTED INPUTS → ONE LINEAR SWEEP → SORTED OUTPUT</text>`);
    flows.push({ id: 'in', kind: 'compact', speed: 150, size: 5 }, { id: 'out', kind: 'compact', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DEDUP: newest-wins per key; tombstone cancels then is dropped ─────── */
  if (view === 'dedup') {
    // example A — key 42: three versions collapse to the newest
    badges.push(pill(250, 80, 'key 42 · three versions', { icon: 'key', cls: 'pill--sst' }));
    const a1 = sst(250, 140, 56, 'slate', { cap: '42 → A  (old)' });
    const a2 = sst(250, 220, 56, 'slate', { cap: '42 → B  (newer)' });
    const a3 = sst(250, 300, 56, 'amber', { cap: '42 → C  (newest)' });
    const outA = sst(250, 418, 60, 'green', { cap: 'keep 42 → C', halo: true });
    [a1, a2, a3].forEach(t => {
      const e = edge([V(t.base[0], t.base[1] - 6), V(250, (t.base[1] + outA.top[1]) / 2), V(outA.top[0], outA.top[1] - 2)], { arrow: true, dashed: true });
      guides.push(e.guide);
    });

    // example B — key 99: tombstone wins, then is dropped at the bottom level
    badges.push(pill(760, 80, 'key 99 · deleted', { icon: 'trash', cls: 'pill--sst' }));
    const b1 = sst(760, 140, 56, 'slate', { cap: '99 → Z  (old)' });
    const b2 = sst(760, 220, 56, 'rose', { cap: '99 ⌀ tombstone' });
    const outB = isoTile(760, 418, 60, 'lilac', { ghost: true });
    solids.push(outB.g);
    badges.push(`<text class="sst-cap" x="760" y="${A(outB.base[1] + 15)}" text-anchor="middle">row gone · tombstone dropped</text>`);
    [b1, b2].forEach(t => {
      const e = edge([V(t.base[0], t.base[1] - 6), V(760, (t.base[1] + outB.top[1]) / 2), V(outB.top[0], outB.top[1] - 2)], { arrow: true, dashed: true });
      guides.push(e.guide);
    });

    badges.push(`<text class="iso-region__t" x="520" y="520" text-anchor="middle">NEWEST WINS · OVERWRITES &amp; DEAD ROWS RECLAIMED</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows, note: snap.note });
  }

  /* ── SIZE-TIERED: similar-size tables accumulate, merge into one bigger ── */
  if (view === 'tiered') {
    badges.push(pill(300, 82, 'a tier of similar-size tables', { icon: 'layers', cls: 'pill--sst' }));
    const tier = [0, 1, 2, 3].map(i => sst(150 + i * 108, 210 + (i % 2) * 10, 48, 'lilac', { cap: `~S` }));

    const merge = isoCube(628, 248, 64, 72, 'amber', { icon: 'merge', label: 'merge', sub: 'tier', iconSize: 22 });
    shadows.push(merge.shadow); solids.push(merge.g);
    const big = sst(856, 250, 92, 'green', { cap: '~4S · one bigger file', halo: true });

    tier.forEach((t, i) => {
      const e = edge([V(t.verts.E.x - 4, t.front[1]), V(merge.verts.W.x - 40, merge.top[1] + (i - 1.5) * 8), V(merge.verts.W.x - 6, merge.verts.W.y)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d;
    });
    const oe = edge([V(merge.verts.E.x - 4, merge.front[1]), V(big.verts.W.x - 6, big.verts.W.y)], { arrow: true });
    guides.push(oe.guide); railOut = oe.d;

    badges.push(pill(500, 410, 'few, big merges → low write-amp', { icon: 'check', w: 330 }));
    badges.push(pill(500, 452, 'but ↑ read-amp & ↑ space-amp', { icon: 'alert', w: 330 }));
    flows.push({ id: 'in', kind: 'compact', speed: 150, size: 5 }, { id: 'out', kind: 'compact', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LEVELED: non-overlapping per level, each ~10× the one above ───────── */
  if (view === 'leveled') {
    const rows = [
      { y: 120, n: 1, rx: 44, tone: 'blue',  label: 'L0', note: 'new flush' },
      { y: 250, n: 4, rx: 44, tone: 'green', label: 'L1', note: '~10× · non-overlapping' },
      { y: 392, n: 8, rx: 44, tone: 'lilac', label: 'L2', note: '~100×' },
    ];
    rows.forEach(r => {
      badges.push(`<text class="iso-region__t" x="96" y="${A(r.y + 6)}" text-anchor="middle">${r.label}</text>`);
      const span = (r.n - 1) * (r.rx * 2 + 14);
      const x0 = 520 - span / 2;
      let first = null, last = null;
      for (let i = 0; i < r.n; i++) {
        const cx = x0 + i * (r.rx * 2 + 14);
        const t = sst(cx, r.y, r.rx, r.tone, {});
        if (i === 0) first = t; last = t;
      }
      badges.push(`<text class="sst-cap" x="${A(last.base[0] + r.rx + 60)}" y="${A(r.y + 4)}" text-anchor="middle">${esc(r.note)}</text>`);
    });
    // cascade arrows L0 → L1 → L2
    const ar1 = edge([V(520, 148), V(520, 214)], { arrow: true, dashed: true });
    const ar2 = edge([V(520, 286), V(520, 356)], { arrow: true, dashed: true });
    guides.push(ar1.guide, ar2.guide); railOut = ar1.d;
    badges.push(pill(300, 500, 'low read & space amp', { icon: 'check', w: 260 }));
    badges.push(pill(740, 500, '↑ write amp (rewrite per level)', { icon: 'alert', w: 320 }));
    flows.push({ id: 'out', kind: 'compact', speed: 130, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the three-way amplification trade ──────────────────────────── */
  const core = isoCube(520, 196, 104, 112, 'amber', { icon: 'merge', label: 'Compaction', sub: 'background merge', halo: true });
  shadows.push(core.shadow); halos.push(core.halo); solids.push(core.g);

  const disk = isoTile(520, 452, 92, 'lilac', {});
  shadows.push(disk.shadow); solids.push(disk.g);
  badges.push(`<text class="sst-cap" x="520" y="${A(disk.base[1] + 16)}" text-anchor="middle">fewer, merged SSTables</text>`);
  const oe = edge([V(core.base[0], core.base[1] - 4), V(520, (core.base[1] + disk.top[1]) / 2), V(disk.top[0], disk.top[1] - 2)], { arrow: true, dashed: true });
  guides.push(oe.guide); railOut = oe.d;

  const left = ['spends write-amp', 'in the background'];
  left.forEach((t, i) => badges.push(pill(180, 150 + i * 46, t, { icon: 'flush', w: 212 })));
  const tags = ['↓ read amplification', '↓ space amplification', 'size-tiered → writes', 'leveled → reads'];
  tags.forEach((t, i) => badges.push(pill(864, 120 + i * 56, t, { icon: 'check', w: 212 })));

  flows.push({ id: 'out', kind: 'compact', speed: 130, size: 6 });
  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut, flows, note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--lsm-compaction" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="LSM compaction merging SSTables">
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
