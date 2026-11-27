/* raft-consensus-scene.js — the "Raft Consensus" scene, in the shared Designed-
   to-Scale isometric vocabulary: rounded iso cubes with icon glyphs and labels,
   soft ground shadows, halos, pill badges, dashed logical regions, routed
   connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'problem' (five peers, divergent logs), 'election' (a candidate wins a
   majority of votes), 'log' (leader replicates its log), 'commit' (a majority
   commits an entry), 'partition' (minority stalls), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* five node centres on a gentle pentagon ring */
function ring() {
  const cx = 540, cy = 262, rxr = 212, ryr = 118;
  const out = [];
  for (let i = 0; i < 5; i++) {
    const a = (-90 + i * 72) * Math.PI / 180;
    out.push({ x: cx + rxr * Math.cos(a), y: cy + ryr * Math.sin(a) });
  }
  return out; // [top, upper-right, lower-right, lower-left, upper-left]
}

export function renderRaftConsensusScene(snap, opts = {}) {
  const view = snap.view || 'problem';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;
  const tag = (x, y, t) => `<text class="iso-region__t" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // push a node cube, return its handle
  const NRX = 50, NBH = 48;
  function node(x, y, mat, label, sub, o = {}) {
    const c = isoCube(x, y, o.rx || NRX, o.bodyH || NBH, mat, {
      icon: o.icon || 'server', label, sub, iconSize: 20, halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  }
  // a little row of log cells under/near a point
  function logCells(x0, y, mats, cw = 26) {
    mats.forEach((m, i) => {
      if (!m) return;
      const t = isoTile(x0 + i * (cw + 6), y, cw / 2, m, { h: 16 });
      shadows.push(t.shadow); solids.push(t.g);
    });
  }

  /* ── PROBLEM: five peers, each with a slightly different little log ─────── */
  if (view === 'problem') {
    const P = ring();
    const orders = [
      ['blue', 'green', 'amber'],
      ['green', 'blue', 'amber'],
      ['blue', 'amber', 'green'],
      ['amber', 'green', 'blue'],
      ['green', 'amber', 'blue'],
    ];
    P.forEach((p, i) => {
      const c = node(p.x, p.y, 'slate', 'node ' + (i + 1), 'own log');
      logCells(p.x - 48, c.base[1] + 16, orders[i], 26);
    });
    badges.push(pill(540, 262, 'who decides the order?', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(300, 436, 480, 66, '', { r: 20 }));
    badges.push(tag(540, 474, 'FIVE LOGS DRIFTING APART · NO SINGLE TRUTH'));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ELECTION: a candidate collects a majority of votes ────────────────── */
  if (view === 'election') {
    const P = ring();
    const cand = P[0];
    // candidate
    const cc = node(cand.x, cand.y, 'rose', 'candidate', 'term 1', { halo: true, icon: 'target' });
    badges.push(pill(cand.x, cand.y - cc.ry - 46, 'bumps term → 1', { icon: 'target', cls: 'pill--sst' }));
    // the four peers; two grant votes (checks), two not yet
    const grant = [true, false, true, false]; // P[1..4]
    P.slice(1).forEach((p, i) => {
      const c = node(p.x, p.y, grant[i] ? 'green' : 'slate', 'node', grant[i] ? 'voted ✓' : '…');
      const e = edge([V(p.x, p.y - c.ry - 2), V((p.x + cand.x) / 2, (p.y + cand.y) / 2 - 20), V(cand.x + (p.x > cand.x ? 1 : -1) * 30, cand.y)],
        { arrow: true, dashed: !grant[i] });
      guides.push(e.guide);
      if (grant[i] && railIn == null) railIn = e.d;
      badges.push(pill((p.x + cand.x) / 2, (p.y + cand.y) / 2 - 20, grant[i] ? 'vote' : 'RequestVote', { icon: grant[i] ? 'check' : 'search', cls: 'pill--sst' }));
    });
    badges.push(pill(cand.x, cand.y + cc.base[1] - cand.y + 26, '3 / 5 votes → LEADER', { icon: 'check', cls: 'pill--sst' }));
    badges.push(cap(540, 520, 'a majority can crown only one leader per term'));
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LOG / COMMIT: five stacked log lanes, leader on top ────────────────── */
  if (view === 'log' || view === 'commit') {
    const committing = view === 'commit';
    const laneY = [130, 206, 282, 358, 434];
    const labelX = 158, cell0 = 300, cw = 74, nCells = 5;
    const lanes = ['Leader', 'F1', 'F2', 'F3', 'F4'];
    // per-lane how many entries present
    const filled = committing ? [5, 4, 4, 3, 3] : [5, 3, 2, 3, 1];
    const leaderCube = [];
    lanes.forEach((nm, li) => {
      const y = laneY[li];
      const c = node(labelX, y, li === 0 ? 'amber' : 'slate', nm, li === 0 ? 'leader' : 'follower',
        { rx: 42, bodyH: 30, halo: li === 0 });
      leaderCube[li] = c;
      // entry cells
      for (let k = 0; k < nCells; k++) {
        const x = cell0 + k * cw;
        const has = k < filled[li];
        const committed = committing && k < 3; // first 3 entries are committed
        const mat = !has ? null : committed ? 'green' : li === 0 ? 'amber' : 'blue';
        if (!has) {
          // empty slot outline via ghost tile
          const t = isoTile(x, y, 24, 'slate', { h: 12, ghost: true });
          shadows.push(t.shadow); solids.push(t.g);
        } else {
          const t = isoTile(x, y, 24, mat, { h: 16 });
          shadows.push(t.shadow); solids.push(t.g);
          if (li === 0) badges.push(cap(x, y - 34, '#' + (k + 1)));
        }
      }
    });
    // replication arrows leader → followers (write flow)
    for (let li = 1; li < 5; li++) {
      const e = edge([V(labelX, laneY[0] + 24), V(labelX, laneY[li] - 10)], { arrow: true, dashed: true });
      guides.push(e.guide);
      if (li === 1) railOut = e.d;
    }
    if (committing) {
      const bx = cell0 + 3 * cw - cw / 2;
      badges.push(`<path class="iso-edge is-dashed" d="M${A(bx)} 104 L${A(bx)} 470"/>`);
      badges.push(pill(cell0 + cw, 92, 'COMMITTED · majority holds #1–#3', { icon: 'check', cls: 'pill--sst' }));
      badges.push(pill(cell0 + 4 * cw, 92, 'not yet', { icon: 'clock', cls: 'pill--sst' }));
      badges.push(cap(540, 506, 'once ⌈N/2⌉+1 nodes store an entry, it is committed & applied'));
    } else {
      badges.push(pill(cell0 + cw, 92, 'leader appends, then AppendEntries →', { icon: 'listOrdered', cls: 'pill--sst' }));
      badges.push(cap(540, 506, 'only the leader appends — followers copy its log in order'));
    }
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PARTITION: majority keeps going, minority stalls ──────────────────── */
  if (view === 'partition') {
    const P = ring();
    // left/majority = top, lower-left, upper-left (indices 0,3,4); right/minority = 1,2
    const major = [0, 3, 4], minor = [1, 2];
    const DIV = 606;
    badges.push(region(70, 120, DIV - 70 - 16, 420, '', { r: 22 }));
    badges.push(region(DIV + 16, 120, 980 - (DIV + 16), 420, '', { r: 22 }));
    // partition divider
    badges.push(`<path class="iso-edge is-dashed" d="M${A(DIV)} 110 L${A(DIV)} 544"/>`);
    badges.push(pill(DIV, 108, 'NETWORK PARTITION', { icon: 'alert', cls: 'pill--sst' }));
    major.forEach((i, k) => {
      node(P[i].x, P[i].y, k === 0 ? 'amber' : 'green', k === 0 ? 'leader' : 'node', k === 0 ? 'term 1' : 'follower', { halo: k === 0 });
    });
    minor.forEach(i => node(P[i].x, P[i].y, 'slate', 'node', 'no quorum', { ghost: true }));
    badges.push(pill(300, 500, 'MAJORITY · keeps committing', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(820, 500, 'MINORITY · stalls', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(cap(820, 150, '2 of 5 — can’t elect, can’t commit'));
    // one commit flow on the majority side
    const e = edge([V(P[4].x, P[4].y + 60), V(P[0].x - 40, P[0].y + 120), V(P[3].x, P[3].y + 60)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: every node holds the same committed log ────────────────────── */
  const P = ring();
  P.forEach((p, i) => {
    const c = node(p.x, p.y, i === 0 ? 'amber' : 'green', i === 0 ? 'leader' : 'node', i === 0 ? 'term 1' : 'in sync', { halo: i === 0 });
    logCells(p.x - 48, c.base[1] + 16, ['green', 'green', 'green'], 26);
  });
  // a gentle ring of replication arrows leader → neighbours
  [1, 4].forEach((i, k) => {
    const e = edge([V(P[0].x + (P[i].x > P[0].x ? 26 : -26), P[0].y + 30), V((P[0].x + P[i].x) / 2, (P[0].y + P[i].y) / 2 + 10), V(P[i].x, P[i].y - 10)], { arrow: true, dashed: true });
    guides.push(e.guide);
    if (k === 0) railOut = e.d;
  });
  badges.push(pill(540, 262, 'one agreed history', { icon: 'check', cls: 'pill--sst' }));
  badges.push(region(286, 452, 508, 66, '', { r: 20 }));
  badges.push(tag(540, 490, 'ELECT · REPLICATE · COMMIT — SAME ORDER EVERYWHERE'));
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
  <svg class="scene scene--raft-consensus" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Raft consensus">
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
