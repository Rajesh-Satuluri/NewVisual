/* quorum-scene.js — the "Quorum" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes with icon glyphs and labels, soft
   ground shadows, halos, pill badges, dashed logical regions, routed connectors
   with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'why' (two peers decide opposite things), 'majority' (3 of 5 =
   quorum), 'intersect' (two majorities share a node), 'partition' (3 acts, 2
   halts), 'even' (6 nodes tie 3–3), 'recap' (one quorum, one truth). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a row of five node slots across the middle band */
const ROWY = 288;
const X5 = [180, 370, 560, 750, 940];

export function renderQuorumScene(snap, opts = {}) {
  const view = snap.view || 'majority';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a node; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'server', label, sub: o.sub || '', iconSize: 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── WHY: two lone peers, a split, two opposite calls ──────────────────── */
  if (view === 'why') {
    const lx = 300, rx = 820, ny = 268;
    node(lx, ny, 'node', 'blue', { sub: 'decides' });
    node(rx, ny, 'node', 'blue', { sub: 'decides' });
    badges.push(pill(lx, ny - 86, 'order = PAID', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(rx, ny - 86, 'order = CANCELLED', { icon: 'alert', cls: 'pill--sst' }));
    // jagged break down the middle
    const bx = VW / 2;
    const zig = [V(bx - 24, 120), V(bx + 20, 180), V(bx - 20, 240), V(bx + 22, 300), V(bx - 22, 360), V(bx + 20, 420)];
    const br = edge(zig, { dashed: true, r: 2 });
    guides.push(br.guide);
    badges.push(pill(bx, 104, 'network split', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(150, 404, 740, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="442" text-anchor="middle">BOTH THINK THEY WON · SPLIT-BRAIN</text>`);
    cap(VW / 2, 474, 'no rule says which decision is the real one');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── MAJORITY: 5 nodes, 3 highlighted as the quorum ────────────────────── */
  if (view === 'majority') {
    const quorum = [0, 1, 2];
    X5.forEach((x, i) => {
      const inq = quorum.includes(i);
      node(x, ROWY, 'N' + (i + 1), inq ? 'green' : 'slate',
        { halo: inq, ghost: !inq, sub: inq ? 'votes' : 'idle' });
    });
    // a proposer up top fans a write to the three quorum nodes
    node(VW / 2, 120, 'proposer', 'amber', { icon: 'app', rx: 44, h: 40 });
    quorum.forEach((i, k) => {
      const e = edge([V(VW / 2, 158), V((VW / 2 + X5[i]) / 2, 214), V(X5[i], ROWY - 30)], { arrow: true });
      guides.push(e.guide);
      if (k === 0) railOut = e.d;
    });
    badges.push(pill(VW / 2, 466, 'quorum = ⌈5 / 2⌉ + 1 = 3 nodes', { icon: 'check' }));
    cap(VW / 2, 506, 'a proposal passes only once a majority has voted yes');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── INTERSECT: two 3-of-5 majorities overlapping on the middle node ───── */
  if (view === 'intersect') {
    X5.forEach((x, i) => {
      const shared = i === 2;
      node(x, ROWY, 'N' + (i + 1), shared ? 'lilac' : 'green',
        { halo: shared, sub: shared ? 'in both' : '' });
    });
    // two dashed majority regions that overlap at the centre node
    badges.push(region(118, 196, 500, 198, '', { r: 22 }));
    badges.push(region(500, 196, 500, 198, '', { r: 22 }));
    badges.push(pill(300, 214, 'majority A = {N1,N2,N3}', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(812, 214, 'majority B = {N3,N4,N5}', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(X5[2], ROWY + 92, 'shared node', { icon: 'key', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'two majorities can never be disjoint — they always share a node');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PARTITION: 3 (quorum, acts) | 2 (no quorum, halts) ────────────────── */
  if (view === 'partition') {
    X5.forEach((x, i) => {
      const major = i <= 2;
      node(x, ROWY, 'N' + (i + 1), major ? 'green' : 'lilac',
        { halo: major && i === 0, ghost: !major, sub: major ? 'acts' : 'halts' });
    });
    const bx = (X5[2] + X5[3]) / 2;
    const zig = [V(bx - 22, 150), V(bx + 20, 210), V(bx - 20, 270), V(bx + 22, 330), V(bx - 20, 390), V(bx + 20, 448)];
    const br = edge(zig, { dashed: true, r: 2 });
    guides.push(br.guide);
    badges.push(pill(bx, 118, 'partition', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(X5[1], 178, 'MAJORITY · 3 → quorum ✓', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(X5[3] + 34, 178, 'MINORITY · 2 → no quorum', { icon: 'alert', cls: 'pill--sst' }));
    // a write lands on the majority side only
    const e = edge([V(X5[0] - 10, 150), V(X5[0] - 40, 214), V(X5[0], ROWY - 30)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    cap(VW / 2, 500, 'only one side can hold a majority — so only one side acts');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── EVEN: 6 nodes split 3–3, no majority, deadlock ────────────────────── */
  if (view === 'even') {
    const X6 = [150, 310, 470, 610, 770, 930];
    X6.forEach((x, i) => {
      node(x, ROWY, 'N' + (i + 1), 'rose', { sub: i < 3 ? '' : '' });
    });
    const bx = VW / 2;
    const zig = [V(bx - 22, 150), V(bx + 20, 212), V(bx - 20, 274), V(bx + 22, 336), V(bx - 20, 398), V(bx + 20, 456)];
    const br = edge(zig, { dashed: true, r: 2 });
    guides.push(br.guide);
    badges.push(pill(bx, 118, 'even split', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(310, 178, '3 nodes · no majority', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(770, 178, '3 nodes · no majority', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(260, 404, 520, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${bx}" y="442" text-anchor="middle">TIE · NEITHER SIDE CAN ACT · DEADLOCK</text>`);
    badges.push(pill(bx, 522, 'odd N avoids ties → run 3, 5 or 7', { icon: 'check', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: one quorum, one truth ──────────────────────────────────────── */
  X5.forEach((x, i) => node(x, ROWY, 'N' + (i + 1), 'green', { halo: i === 2 }));
  badges.push(region(118, 200, 884, 160, 'one quorum · one truth', { r: 24 }));
  const tags = ['majority to act', 'majorities always overlap', 'prefer odd N'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 440 + i * 44, t, { icon: 'check', w: 300 })));
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
  <svg class="scene scene--quorum" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Quorum and majorities">
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
