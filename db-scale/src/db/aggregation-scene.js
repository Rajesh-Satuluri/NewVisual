/* aggregation-scene.js — the "Aggregation" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes, flat row tiles,
   pills, dashed regions, routed connectors and particle rails.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note }.

   Views: 'idea' (collapse), 'hash' (hash buckets), 'sort' (sorted sweep),
   'memory' (spill), 'partial' (parallel), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const GROUP_MAT = { A: 'blue', B: 'amber', C: 'lilac' };

export function renderAggregationScene(snap, opts = {}) {
  const view = snap.view || 'idea';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── local helpers ──────────────────────────────────────────────────── */
  const tile = (cx, cy, rx, mat, o = {}) => {
    const t = isoTile(cx, cy, rx, mat, o);
    shadows.push(t.shadow); if (t.halo) halos.push(t.halo); solids.push(t.g);
    return t;
  };
  const cube = (cx, cy, rx, h, mat, o = {}) => {
    const c = isoCube(cx, cy, rx, h, mat, o);
    shadows.push(c.shadow); if (c.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  const cap = (x, y, text) => badges.push(`<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(text)}</text>`);
  const rtext = (x, y, text) => badges.push(`<text class="iso-region__t" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(text)}</text>`);
  const conn = (ax, ay, bx, by, o = {}) => {
    const e = edge([V(ax, ay), V((ax + bx) / 2, (ay + by) / 2), V(bx, by)], { arrow: true, ...o });
    guides.push(e.guide); return e.d;
  };

  /* a vertical pile of thin row tiles, coloured by group key */
  function inputPile(keys, cx, topY, step = 40) {
    const tiles = [];
    keys.forEach((k, i) => tiles.push(tile(cx, topY + i * step, 46, GROUP_MAT[k] || 'slate', { h: 12 })));
    return { cx, topY, botY: topY + (keys.length - 1) * step, tiles };
  }

  /* one green result tile + its caption */
  function resultTile(cx, cy, label) {
    const t = tile(cx, cy, 52, 'green', { h: 16 });
    cap(cx, A(t.base[1] + 15), label);
    return t;
  }

  const UNSORTED = ['B', 'A', 'C', 'A', 'B', 'A', 'C', 'B'];
  const SORTED = ['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C'];

  /* ── IDEA / RECAP : pile → Γ → three results ────────────────────────── */
  if (view === 'idea' || view === 'recap') {
    const pile = inputPile(UNSORTED, 250, 130);
    cap(250, 108, 'orders · 8 rows');
    rtext(250, A(pile.botY + 54), 'colour = user_id');

    const g = cube(540, 250, 52, 56, 'amber', { label: 'Γ', sub: 'group', halo: view === 'recap' });
    badges.push(pill(540, 70, view === 'recap' ? 'aggregate = collapse rows' : 'GROUP BY → one row per group', { icon: 'layers' }));

    railIn = conn(pile.cx + 54, (pile.topY + pile.botY) / 2, g.verts.W.x - 6, g.front[1]);

    const outs = [['A · 3', 180], ['B · 3', 270], ['C · 2', 360]];
    outs.forEach(([lbl, cy]) => {
      const r = resultTile(840, cy, lbl);
      conn(g.verts.E.x + 2, g.front[1], r.verts.W.x - 4, r.front[1]);
    });
    cap(840, 118, 'one row per group');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── HASH : rows hash into three buckets ────────────────────────────── */
  if (view === 'hash') {
    const pile = inputPile(UNSORTED, 210, 130);
    cap(210, 108, 'orders');
    badges.push(pill(540, 66, 'hash aggregation', { icon: 'database' }));

    const buckets = { A: 170, B: 270, C: 370 };
    const bpos = {};
    Object.entries(buckets).forEach(([k, cy]) => {
      const b = tile(548, cy, 60, 'slate', { h: 18 });
      bpos[k] = b;
      cap(548, cy + 4, 'bucket ' + k);
    });
    cap(548, 470, 'key → bucket, accumulate');

    // a few rows routed to their bucket
    pile.tiles.forEach((t, i) => {
      const k = UNSORTED[i];
      const d = conn(t.verts.E.x - 2, t.front[1], bpos[k].verts.W.x - 4, bpos[k].front[1], { dashed: true });
      if (i === 0) railIn = d;
    });

    const outs = { A: '3', B: '3', C: '2' };
    Object.entries(buckets).forEach(([k, cy]) => {
      const r = resultTile(860, cy, k + ' · ' + outs[k]);
      conn(bpos[k].verts.E.x + 2, bpos[k].front[1], r.verts.W.x - 4, r.front[1]);
    });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 170, size: 5 }], note: snap.note });
  }

  /* ── SORT : sorted pile, cursor sweep, boundary emits ───────────────── */
  if (view === 'sort') {
    const pile = inputPile(SORTED, 320, 120, 42);
    cap(320, 98, 'sorted by user_id');
    badges.push(pill(320, 70, 'sort aggregation', { icon: 'listOrdered' }));
    rtext(620, 96, 'one pass over sorted rows');

    // cursor sweep down the pile
    railIn = (() => {
      const e = edge([V(pile.cx + 60, pile.topY - 6), V(pile.cx + 60, pile.botY + 12)], { dashed: true, arrow: true });
      guides.push(e.guide); return e.d;
    })();

    // emit a result at each group boundary
    const outs = [['A · 3', 150], ['B · 3', 270], ['C · 2', 380]];
    outs.forEach(([lbl, cy]) => {
      const r = resultTile(760, cy, lbl);
      conn(pile.cx + 64, pile.topY + 20 + (cy - 150) * 0.4, r.verts.W.x - 4, r.front[1]);
    });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── MEMORY : buckets in RAM, overflow spills to disk ───────────────── */
  if (view === 'memory') {
    const pile = inputPile(UNSORTED, 180, 140);
    cap(180, 118, 'orders');
    badges.push(pill(560, 64, 'memory-bound', { icon: 'database' }));

    badges.push(region(430, 110, 280, 230, '', { r: 20 }));
    rtext(570, 132, 'groups held in RAM');
    const inRam = [160, 235, 310];
    inRam.forEach((cy, i) => { tile(560, cy, 58, 'slate', { h: 16 }); cap(560, cy + 3, 'group ' + 'ABC'[i]); });
    railIn = conn(pile.cx + 54, (pile.topY + pile.botY) / 2, 430 - 6, 225);

    // a 4th bucket spilling to disk
    const spill = tile(560, 410, 54, 'rose', { h: 16 });
    cap(560, spill.base[1] + 14, 'group D …');
    const disk = tile(830, 430, 72, 'lilac', { h: 20 });
    cap(830, disk.base[1] + 15, 'spilled to disk');
    const e = edge([V(spill.verts.E.x, spill.front[1]), V((spill.verts.E.x + disk.top[0]) / 2, 440), V(disk.verts.W.x - 4, disk.front[1])], { dashed: true, arrow: true });
    guides.push(e.guide);
    rtext(700, 500, 'too many groups → spill');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── PARTIAL : two workers pre-aggregate, leader combines ───────────── */
  if (view === 'partial') {
    badges.push(pill(540, 60, 'partial → final', { icon: 'server' }));

    // two input slices
    const p1 = inputPile(['B', 'A', 'C', 'A'], 150, 120, 40);
    const p2 = inputPile(['B', 'A', 'C', 'B'], 150, 330, 40);
    cap(150, 98, 'slice 1'); cap(150, 308, 'slice 2');

    const w1 = cube(430, 180, 46, 50, 'blue', { icon: 'server', label: 'Worker', sub: 'partial', iconSize: 18 });
    const w2 = cube(430, 360, 46, 50, 'blue', { icon: 'server', label: 'Worker', sub: 'partial', iconSize: 18 });
    railIn = conn(p1.cx + 54, (p1.topY + p1.botY) / 2, w1.verts.W.x - 6, w1.front[1]);
    conn(p2.cx + 54, (p2.topY + p2.botY) / 2, w2.verts.W.x - 6, w2.front[1]);

    const leader = cube(700, 270, 54, 58, 'green', { icon: 'layers', label: 'Combine', sub: 'final', halo: true, iconSize: 20 });
    conn(w1.verts.E.x + 2, w1.front[1], leader.verts.W.x - 6, leader.front[1] - 10);
    conn(w2.verts.E.x + 2, w2.front[1], leader.verts.W.x - 6, leader.front[1] + 10);

    const outs = [['A · 3', 200], ['B · 3', 290], ['C · 2', 380]];
    outs.forEach(([lbl, cy]) => {
      const r = resultTile(910, cy, lbl);
      conn(leader.verts.E.x + 2, leader.front[1], r.verts.W.x - 4, r.front[1]);
    });
    rtext(565, 500, 'sums of sums, counts of counts');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  // fallback
  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
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
  <svg class="scene scene--agg" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Aggregation">
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
