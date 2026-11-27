/* leader-election-scene.js — the "Leader Election" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'why' (two leaders clash), 'election' (a candidate campaigns),
   'majority' (a majority crowns one leader), 'split' (a partition, majority
   rule blocks split-brain), 'reelect' (dead leader → new term), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* five node centres on an iso-squashed ring — kept as plain {x,y} so geometry
   never reads coordinates off cube return objects */
const CC = { x: 560, y: 266 };
const RX = 214, RY = 116;
function ring(n = 5) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (-90 + i * (360 / n)) * Math.PI / 180;
    out.push({ x: CC.x + RX * Math.cos(a), y: CC.y + RY * Math.sin(a) });
  }
  return out;
}

export function renderLeaderElectionScene(snap, opts = {}) {
  const view = snap.view || 'election';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;
  const NRX = 46, NBH = 44;

  // draw a node at {x,y} with per-node styling; returns nothing we read back
  const node = (p, o = {}) => {
    const c = isoCube(p.x, p.y, o.rx || NRX, o.h || NBH, o.mat || 'slate', {
      icon: o.icon || 'server', label: o.label || '', sub: o.sub || '',
      iconSize: 17, halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── WHY: two self-appointed leaders issue conflicting orders ──────────── */
  if (view === 'why') {
    badges.push(pill(CC.x, 92, 'two coordinators, no agreement', { icon: 'alert', cls: 'pill--sst' }));
    const L1 = { x: 360, y: 210 }, L2 = { x: 760, y: 210 }, S = { x: 560, y: 410 };
    node(L1, { mat: 'amber', icon: 'bolt', label: 'Leader A', sub: 'set x = 1', halo: true, rx: 56, h: 52 });
    node(L2, { mat: 'amber', icon: 'bolt', label: 'Leader B', sub: 'set x = 2', halo: true, rx: 56, h: 52 });
    const store = isoCube(S.x, S.y, 66, 46, 'lilac', { icon: 'database', label: 'shared state', iconSize: 18 });
    shadows.push(store.shadow); solids.push(store.g);
    // both write conflicting values down into the one state
    const e1 = edge([V(L1.x + 30, L1.y + 54), V((L1.x + S.x) / 2, 350), V(S.x - 30, S.y - 16)], { arrow: true });
    const e2 = edge([V(L2.x - 30, L2.y + 54), V((L2.x + S.x) / 2, 350), V(S.x + 30, S.y - 16)], { arrow: true });
    guides.push(e1.guide, e2.guide); railOut = e1.d; railIn = e2.d;
    badges.push(region(430, 300, 260, 60, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="560" y="336" text-anchor="middle">CONFLICT · x = 1 ⨯ x = 2</text>`);
    cap(CC.x, 486, 'two leaders acting at once corrupt the one thing they share');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 }, { id: 'in', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  const P = ring(5);

  /* ── ELECTION: node 0 is a candidate, asks the rest for votes ──────────── */
  if (view === 'election') {
    badges.push(pill(CC.x, 92, 'no leader → call an election', { icon: 'target', cls: 'pill--sst' }));
    P.forEach((p, i) => node(p, i === 0
      ? { mat: 'blue', icon: 'target', label: 'N1', sub: 'candidate', halo: true }
      : { mat: 'slate', icon: 'server', label: 'N' + (i + 1), sub: 'voter' }));
    // RequestVote out to every peer
    P.forEach((p, i) => {
      if (i === 0) return;
      const e = edge([V(P[0].x, P[0].y + 8), V((P[0].x + p.x) / 2, (P[0].y + p.y) / 2 - 6), V(p.x, p.y - 8)], { arrow: true, dashed: true });
      guides.push(e.guide);
      if (i === 1) railOut = e.d;
    });
    cap(CC.x, 500, '“RequestVote” — will you back me for this term?');
    flows.push({ id: 'out', kind: 'read', speed: 170, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── MAJORITY: a quorum of votes crowns one leader ─────────────────────── */
  if (view === 'majority') {
    badges.push(pill(CC.x, 92, '3 of 5 = majority → LEADER', { icon: 'check', cls: 'pill--sst' }));
    const voters = [1, 2];                 // these two back N1; N1 votes for itself → 3
    P.forEach((p, i) => node(p, i === 0
      ? { mat: 'amber', icon: 'bolt', label: 'N1', sub: 'LEADER · term 1', halo: true, rx: 52, h: 50 }
      : voters.includes(i)
        ? { mat: 'green', icon: 'check', label: 'N' + (i + 1), sub: 'voted N1' }
        : { mat: 'slate', icon: 'server', label: 'N' + (i + 1), sub: '—' }));
    // votes flow from the two backers into the leader
    voters.forEach((i, k) => {
      const p = P[i];
      const e = edge([V(p.x, p.y - 8), V((p.x + P[0].x) / 2, (p.y + P[0].y) / 2), V(P[0].x, P[0].y + 8)], { arrow: true });
      guides.push(e.guide);
      if (k === 0) railIn = e.d;
    });
    cap(CC.x, 500, 'a majority can only ever back ONE candidate — uniqueness guaranteed');
    flows.push({ id: 'in', kind: 'read', speed: 160, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SPLIT: a partition — only the majority side may elect ─────────────── */
  if (view === 'split') {
    // minority = right pair {1,2}; majority = {0,3,4} on the left
    const minority = [1, 2];
    P.forEach((p, i) => node(p, i === 0
      ? { mat: 'amber', icon: 'bolt', label: 'N1', sub: 'LEADER', halo: true }
      : minority.includes(i)
        ? { mat: 'lilac', icon: 'clock', label: 'N' + (i + 1), sub: 'no quorum' }
        : { mat: 'green', icon: 'check', label: 'N' + (i + 1), sub: 'majority' }));
    // jagged break between the two groups (right of centre)
    const bx = 648;
    const zig = [V(bx - 22, 108), V(bx + 20, 168), V(bx - 18, 228), V(bx + 22, 288), V(bx - 16, 348), V(bx + 20, 408), V(bx - 20, 468)];
    const br = edge(zig, { dashed: true, r: 2 });
    guides.push(br.guide);
    badges.push(pill(bx, 92, 'NETWORK PARTITION', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(430, 150, 'left · 3 nodes → quorum', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(788, 150, 'right · 2 nodes → stuck', { icon: 'clock', cls: 'pill--sst' }));
    cap(CC.x, 506, 'majority rule means at most ONE side can elect — no split-brain');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── REELECT: the leader dies, a new term elects a successor ───────────── */
  if (view === 'reelect') {
    const dead = 0, fresh = 2;
    P.forEach((p, i) => node(p, i === dead
      ? { mat: 'slate', icon: 'trash', label: 'N1', sub: 'DEAD', ghost: true }
      : i === fresh
        ? { mat: 'amber', icon: 'bolt', label: 'N3', sub: 'LEADER · term 2', halo: true, rx: 52, h: 50 }
        : { mat: 'green', icon: 'check', label: 'N' + (i + 1), sub: 'voted N3' }));
    badges.push(pill(P[dead].x, P[dead].y - 70, 'heartbeat timeout', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(pill(CC.x, 92, 'leader lost → term 1 → term 2', { icon: 'target', cls: 'pill--sst' }));
    // the three live backers vote the new leader in
    [1, 3, 4].forEach((i, k) => {
      const p = P[i];
      const e = edge([V(p.x, p.y - 6), V((p.x + P[fresh].x) / 2, (p.y + P[fresh].y) / 2), V(P[fresh].x, P[fresh].y + 6)], { arrow: true, dashed: true });
      guides.push(e.guide);
      if (k === 0) railIn = e.d;
    });
    cap(CC.x, 504, 'a higher term supersedes the stale leader, even if it comes back');
    flows.push({ id: 'in', kind: 'read', speed: 160, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: one leader, followers in line ──────────────────────────────── */
  badges.push(pill(CC.x, 92, 'one leader per term, by majority', { icon: 'bolt', cls: 'pill--sst' }));
  P.forEach((p, i) => node(p, i === 0
    ? { mat: 'amber', icon: 'bolt', label: 'N1', sub: 'leader', halo: true, rx: 52, h: 50 }
    : { mat: 'green', icon: 'check', label: 'N' + (i + 1), sub: 'follower' }));
  P.forEach((p, i) => {
    if (i === 0) return;
    const e = edge([V(P[0].x, P[0].y + 8), V((P[0].x + p.x) / 2, (P[0].y + p.y) / 2), V(p.x, p.y - 8)], { arrow: true });
    guides.push(e.guide);
    if (i === 1) railOut = e.d;
  });
  const tags = ['majority vote', 'terms supersede', 'no split-brain'];
  tags.forEach((t, i) => badges.push(pill(i === 0 ? 210 : i === 2 ? 910 : CC.x, i === 1 ? 470 : 150, t, { icon: 'check', w: 180 })));
  cap(CC.x, 506, 'pick one coordinator, agree on it, re-elect when it dies');
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
  <svg class="scene scene--leader-election" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Leader election">
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
