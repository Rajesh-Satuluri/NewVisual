/* raft-concepts-scene.js — the "Raft Concepts" scene, in the shared Designed-to-
   Scale isometric vocabulary: rounded iso cubes with icon glyphs and labels,
   soft ground shadows, halos, pill badges, dashed logical regions, routed
   connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'problem' (five peers, no vocabulary), 'states' (the three-state
   cycle), 'terms' (a term clock climbing, one leader each), 'log' (one
   replicated log, majority commit), 'tradeoff' (leader crash → failover gap),
   'recap' (the parts assembled). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const ROWY = 288;
const X5 = [180, 370, 560, 750, 940];

export function renderRaftConceptsScene(snap, opts = {}) {
  const view = snap.view || 'states';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;
  const tag = (x, y, t) => `<text class="iso-region__t" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a node; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 48, o.h || 44, mat, {
      icon: o.icon || 'server', label, sub: o.sub || '', iconSize: 19,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  // a row of little log cells
  const logCells = (x0, y, mats, cw = 24) => {
    mats.forEach((m, i) => {
      if (!m) { const t = isoTile(x0 + i * (cw + 5), y, cw / 2, 'slate', { h: 10, ghost: true }); shadows.push(t.shadow); solids.push(t.g); return; }
      const t = isoTile(x0 + i * (cw + 5), y, cw / 2, m, { h: 14 });
      shadows.push(t.shadow); solids.push(t.g);
    });
  };

  /* ── PROBLEM: five peers, tangled, no vocabulary ───────────────────────── */
  if (view === 'problem') {
    const orders = [
      ['blue', 'green', 'amber'],
      ['green', 'blue', 'amber'],
      ['amber', 'green', 'blue'],
      ['blue', 'amber', 'green'],
      ['green', 'amber', 'blue'],
    ];
    X5.forEach((x, i) => {
      const c = node(x, ROWY, 'node ' + (i + 1), 'slate', { sub: 'own view' });
      logCells(x - 40, c.base[1] + 14, orders[i], 24);
    });
    badges.push(pill(VW / 2, 128, 'who leads? what order? what’s decided?', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(150, 404, 740, 92, '', { r: 20 }));
    badges.push(tag(VW / 2, 442, 'EVERYTHING AT ONCE · NO NAMES FOR THE PARTS'));
    cap(VW / 2, 478, 'Paxos is correct but famously hard to follow');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── STATES: the three-state cycle ─────────────────────────────────────── */
  if (view === 'states') {
    const fx = 220, cx = 560, lx = 900, y = 262;
    node(fx, y, 'follower', 'blue', { icon: 'server', sub: 'passive' });
    node(cx, y, 'candidate', 'amber', { icon: 'target', sub: 'campaigning', halo: true });
    node(lx, y, 'leader', 'green', { icon: 'check', sub: 'handles writes', halo: true });
    // follower → candidate (timeout)
    const e1 = edge([V(fx + 54, y - 24), V((fx + cx) / 2, y - 70), V(cx - 54, y - 24)], { arrow: true });
    guides.push(e1.guide); railOut = e1.d;
    badges.push(pill((fx + cx) / 2, y - 84, 'election timeout', { icon: 'clock', cls: 'pill--sst' }));
    // candidate → leader (majority)
    const e2 = edge([V(cx + 54, y - 24), V((cx + lx) / 2, y - 70), V(lx - 54, y - 24)], { arrow: true });
    guides.push(e2.guide);
    badges.push(pill((cx + lx) / 2, y - 84, 'wins majority', { icon: 'check', cls: 'pill--sst' }));
    // leader/candidate → follower (higher term) — return arc along the bottom
    const e3 = edge([V(lx - 10, y + 70), V(VW / 2, y + 128), V(fx + 10, y + 70)], { arrow: true, dashed: true });
    guides.push(e3.guide);
    badges.push(pill(VW / 2, y + 140, 'sees a higher term → step down', { icon: 'alert', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'every node is exactly one of these three at any moment');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── TERMS: a logical clock climbing, one leader per term ───────────────── */
  if (view === 'terms') {
    const TX = [200, 520, 840], ty = 250;
    const mats = ['slate', 'amber', 'green'];
    const leaders = ['leader A', 'leader B', 'leader C'];
    TX.forEach((x, i) => {
      node(x, ty, 'term ' + (i + 1), mats[i], { icon: 'target', sub: leaders[i], halo: i === 2 });
      if (i < 2) {
        const e = edge([V(x + 52, ty), V((x + TX[i + 1]) / 2, ty - 36), V(TX[i + 1] - 52, ty)], { arrow: true });
        guides.push(e.guide);
        if (i === 0) railOut = e.d;
        badges.push(pill((x + TX[i + 1]) / 2, ty - 50, 'election', { icon: 'bolt', cls: 'pill--sst' }));
      }
    });
    badges.push(pill(VW / 2, 120, 'term = logical clock · counts elections, not seconds', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(region(120, 372, 800, 96, '', { r: 20 }));
    badges.push(tag(VW / 2, 408, 'AT MOST ONE LEADER PER TERM · HIGHER TERM ALWAYS WINS'));
    cap(VW / 2, 500, 'every message carries its term, so stale leaders detect themselves');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LOG: one replicated log, leader on top, majority commit ────────────── */
  if (view === 'log') {
    const laneY = [138, 212, 286, 360, 434];
    const labelX = 158, cell0 = 300, cw = 76, nCells = 5;
    const lanes = ['Leader', 'F1', 'F2', 'F3', 'F4'];
    const filled = [5, 4, 4, 3, 3];
    lanes.forEach((nm, li) => {
      const y = laneY[li];
      node(labelX, y, nm, li === 0 ? 'amber' : 'slate', { rx: 42, h: 28, icon: li === 0 ? 'check' : 'server', sub: li === 0 ? 'leader' : 'follower', halo: li === 0 });
      for (let k = 0; k < nCells; k++) {
        const x = cell0 + k * cw;
        const has = k < filled[li];
        const committed = k < 3;
        const mat = !has ? null : committed ? 'green' : li === 0 ? 'amber' : 'blue';
        if (!has) { const t = isoTile(x, y, 24, 'slate', { h: 12, ghost: true }); shadows.push(t.shadow); solids.push(t.g); }
        else {
          const t = isoTile(x, y, 24, mat, { h: 16 }); shadows.push(t.shadow); solids.push(t.g);
          if (li === 0) badges.push(cap(x, y - 32, '#' + (k + 1) + '·t' + (committed ? '1' : '2')));
        }
      }
    });
    for (let li = 1; li < 5; li++) {
      const e = edge([V(labelX, laneY[0] + 22), V(labelX, laneY[li] - 8)], { arrow: true, dashed: true });
      guides.push(e.guide);
      if (li === 1) railOut = e.d;
    }
    const bx = cell0 + 3 * cw - cw / 2;
    badges.push(`<path class="iso-edge is-dashed" d="M${A(bx)} 110 L${A(bx)} 470"/>`);
    badges.push(pill(cell0 + cw, 96, 'COMMITTED · majority holds #1–#3', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(cell0 + 4 * cw - 10, 96, 'replicating…', { icon: 'clock', cls: 'pill--sst' }));
    cap(VW / 2, 508, 'only the leader appends; an entry commits once a majority stores it');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── TRADEOFF: leader crashes → writes stall → fullest log must win ─────── */
  if (view === 'tradeoff') {
    const crashed = 2;
    const fill = [3, 5, 0, 4, 2]; // log lengths; crashed node shown ghosted
    X5.forEach((x, i) => {
      if (i === crashed) { node(x, ROWY, 'leader', 'rose', { icon: 'alert', sub: 'crashed', ghost: true }); return; }
      const best = i === 1;
      const c = node(x, ROWY, 'F' + i, best ? 'green' : 'slate', { sub: best ? 'fullest log' : 'follower', halo: best });
      logCells(x - 40, c.base[1] + 14, Array.from({ length: 5 }, (_, k) => k < fill[i] ? (best ? 'green' : 'blue') : null), 22);
    });
    // a client write bounces off the dead leader
    const e = edge([V(X5[crashed], 118), V(X5[crashed], ROWY - 40)], { arrow: true, dashed: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(pill(X5[crashed], 102, 'writes stall — no leader', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(X5[1], 150, 'only a node with every committed entry may win', { icon: 'check', cls: 'pill--sst' }));
    badges.push(region(118, 420, 804, 86, '', { r: 20 }));
    badges.push(tag(VW / 2, 454, 'FAILOVER GAP · ~HUNDREDS OF ms UNTIL A NEW LEADER'));
    cap(VW / 2, 522, 'strong leadership: one bottleneck, one brief pause on crash');
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the parts assembled ────────────────────────────────────────── */
  X5.forEach((x, i) => {
    const c = node(x, ROWY, i === 0 ? 'leader' : 'node', i === 0 ? 'amber' : 'green', { sub: i === 0 ? 'term 3' : 'in sync', icon: i === 0 ? 'check' : 'server', halo: i === 0 });
    logCells(x - 40, c.base[1] + 14, ['green', 'green', 'green'], 24);
  });
  for (const i of [1, 2, 3, 4]) {
    const e = edge([V(X5[0] + (X5[i] > X5[0] ? 28 : -28), ROWY - 28), V((X5[0] + X5[i]) / 2, ROWY - 70), V(X5[i], ROWY - 28)], { arrow: true, dashed: true });
    guides.push(e.guide);
    if (i === 1) railOut = e.d;
  }
  badges.push(pill(VW / 2, 120, 'states · term · one log · majority · safety', { icon: 'check', cls: 'pill--sst' }));
  badges.push(region(150, 430, 740, 72, '', { r: 20 }));
  badges.push(tag(VW / 2, 470, 'ONE LEADER · ONE LOG · ONE AGREED ORDER'));
  cap(VW / 2, 526, 'the vocabulary behind etcd · Consul · CockroachDB · TiKV');
  flows.push({ id: 'out', kind: 'write', speed: 150, size: 5 });
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
  <svg class="scene scene--raft-concepts" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Raft concepts">
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
