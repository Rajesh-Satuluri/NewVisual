/* synchronous-replication-scene.js — the "Synchronous Replication" scene, in the
   shared Designed-to-Scale isometric vocabulary: rounded iso cubes with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'flow' (write → replicate → ack → OK), 'durable' (leader dies, replica
   promoted with full data), 'latency' (the round-trip cost), 'stall' (a slow
   replica blocks every write), 'semisync' (wait for any one ack), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* fixed layout — client (left) → leader (middle) → three replicas (right) */
const CLX = 138, CLY = 250, CLRX = 46, CLH = 54;
const LX = 452, LY = 214, LRX = 74, LH = 74;
const RPX = 776, RRX = 56, RH = 50;
const RPY = [112, 250, 388];

export function renderSynchronousReplicationScene(snap, opts = {}) {
  const view = snap.view || 'flow';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  /* ── per-view state ─────────────────────────────────────────────────────── */
  // leader: { mat, sub, ghost, halo }
  // replica i: { mat, sub, ghost, halo }
  let leaderSt = { mat: 'green', sub: 'accepts writes' };
  let repSt = [
    { mat: 'green', sub: 'ack ✓' },
    { mat: 'green', sub: 'ack ✓' },
    { mat: 'green', sub: 'ack ✓' },
  ];
  if (view === 'durable') {
    leaderSt = { mat: 'rose', sub: '✕ crashed', ghost: true };
    repSt = [
      { mat: 'green', sub: 'has write' },
      { mat: 'amber', sub: 'NEW leader', halo: true },
      { mat: 'green', sub: 'has write' },
    ];
  } else if (view === 'stall') {
    leaderSt = { mat: 'amber', sub: 'blocked' };
    repSt = [
      { mat: 'green', sub: 'ack ✓' },
      { mat: 'green', sub: 'ack ✓' },
      { mat: 'slate', sub: '✕ DOWN', ghost: true },
    ];
  } else if (view === 'semisync') {
    leaderSt = { mat: 'green', sub: 'accepts writes' };
    repSt = [
      { mat: 'green', sub: 'ack ✓', halo: true },
      { mat: 'amber', sub: 'lagging…' },
      { mat: 'amber', sub: 'lagging…' },
    ];
  }

  /* ── place the nodes ────────────────────────────────────────────────────── */
  const client = isoCube(CLX, CLY, CLRX, CLH, 'blue', { icon: 'app', label: 'Client', iconSize: 20 });
  shadows.push(client.shadow); solids.push(client.g);

  const leader = isoCube(LX, LY, LRX, LH, leaderSt.mat, {
    icon: 'database', label: 'Leader', sub: leaderSt.sub, iconSize: 22,
    halo: !!leaderSt.halo, ghost: !!leaderSt.ghost,
  });
  shadows.push(leader.shadow); if (leaderSt.halo) halos.push(leader.halo); solids.push(leader.g);

  const reps = RPY.map((ry, i) => {
    const st = repSt[i];
    const c = isoCube(RPX, ry, RRX, RH, st.mat, {
      icon: 'database', label: 'Replica ' + (i + 1), sub: st.sub, iconSize: 18,
      halo: !!st.halo, ghost: !!st.ghost,
    });
    shadows.push(c.shadow); if (st.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  });

  // a dashed region framing the replica set
  badges.push(region(RPX - 150, 66, 300, 468, '', { r: 24 }));
  badges.push(pill(RPX, 92, 'synchronous replicas', { icon: 'layers', cls: 'pill--sst' }));

  /* ── edges leader ↔ replicas (shared by most views) ─────────────────────── */
  const repEdge = (i, { dashed, ack } = {}) => {
    const r = reps[i];
    const pts = ack
      ? [V(r.verts.W.x + 2, r.front[1]), V((LX + RPX) / 2, (r.front[1] + leader.front[1]) / 2 + 14), V(leader.verts.E.x - 2, leader.front[1] + 10)]
      : [V(leader.verts.E.x - 2, leader.front[1] - 6), V((LX + RPX) / 2, (r.front[1] + leader.front[1]) / 2 - 8), V(r.verts.W.x - 2, r.front[1])];
    return edge(pts, { arrow: true, dashed: !!dashed });
  };

  // client ↔ leader
  const clToLeader = edge([
    V(client.verts.E.x - 2, client.front[1]),
    V((client.verts.E.x + leader.verts.W.x) / 2, (client.front[1] + leader.front[1]) / 2),
    V(leader.verts.W.x - 4, leader.front[1]),
  ], { arrow: true });

  /* ── FLOW: the four numbered steps ──────────────────────────────────────── */
  if (view === 'flow') {
    guides.push(clToLeader.guide); railOut = clToLeader.d;
    badges.push(pill((client.verts.E.x + leader.verts.W.x) / 2, (client.front[1] + leader.front[1]) / 2 - 30, '① write', { icon: 'bolt', cls: 'pill--sst' }));
    reps.forEach((r, i) => { const e = repEdge(i); guides.push(e.guide); });
    const back = repEdge(1, { ack: true, dashed: true });
    guides.push(back.guide); railIn = back.d;
    badges.push(pill((LX + RPX) / 2, 150, '② replicate', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(pill((LX + RPX) / 2, 352, '③ acks', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(LX, 420, '④ then OK → client', { icon: 'check', cls: 'pill--sst' }));
    badges.push(cap(VW / 2, 500, 'the client hears "committed" only after the replicas ack'));
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 }, { id: 'in', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DURABLE: leader dies, data safe on replicas ────────────────────────── */
  if (view === 'durable') {
    // committed write already on the replicas; promote the middle one
    reps.forEach((r, i) => { const e = repEdge(i, { dashed: true }); guides.push(e.guide); });
    badges.push(pill(LX, LY - LH - 2, 'leader crash — 0 writes lost', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(RPX - 150, 66, 300, 468, '', { r: 24 }));
    badges.push(`<text class="iso-region__t" x="${RPX}" y="520" text-anchor="middle">RPO = 0 · EVERY COMMITTED WRITE SURVIVES</text>`);
    // promote arrow from dead leader to new leader (replica 2)
    const promote = edge([V(leader.verts.E.x - 2, leader.front[1] + 12), V((LX + RPX) / 2, 250), V(reps[1].verts.W.x - 2, reps[1].front[1])], { arrow: true });
    guides.push(promote.guide); railOut = promote.d;
    badges.push(pill((LX + RPX) / 2, 224, 'promote', { icon: 'bolt', cls: 'pill--sst' }));
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LATENCY: the client waits out the full round-trip ──────────────────── */
  if (view === 'latency') {
    guides.push(clToLeader.guide);
    reps.forEach((r, i) => { const e = repEdge(i); guides.push(e.guide); });
    const back = repEdge(2, { ack: true, dashed: true });   // slowest replica
    guides.push(back.guide); railIn = back.d;
    const okEdge = edge([
      V(leader.verts.W.x - 2, leader.front[1] + 12),
      V((client.verts.E.x + leader.verts.W.x) / 2, (client.front[1] + leader.front[1]) / 2 + 20),
      V(client.verts.E.x - 2, client.front[1] + 10),
    ], { arrow: true, dashed: true });
    guides.push(okEdge.guide); railOut = okEdge.d;
    badges.push(pill(CLX, CLY + CLH + 6, 'blocked, waiting', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(pill(RPX, RPY[2] + RH + 2, 'slowest replica', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(region(120, 452, 800, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="498" text-anchor="middle">WRITE LATENCY = LOCAL + ROUND-TRIP TO THE SLOWEST REPLICA</text>`);
    flows.push({ id: 'in', kind: 'read', speed: 70, size: 5 }, { id: 'out', kind: 'read', speed: 70, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── STALL: a slow replica blocks every write ───────────────────────────── */
  if (view === 'stall') {
    guides.push(clToLeader.guide); railOut = clToLeader.d;
    // healthy replicas acked; the down one never will
    const e0 = repEdge(0); guides.push(e0.guide);
    const e1 = repEdge(1); guides.push(e1.guide);
    const e2 = repEdge(2, { dashed: true }); guides.push(e2.guide);
    badges.push(pill((LX + RPX) / 2, RPY[2] - 6, 'waiting for ack…', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(pill(CLX, CLY + CLH + 6, 'write hangs', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(120, 452, 800, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="498" text-anchor="middle">ONE STALLED REPLICA → ALL WRITES BLOCK</text>`);
    flows.push({ id: 'out', kind: 'write', speed: 120, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SEMISYNC: wait for any one ack ─────────────────────────────────────── */
  if (view === 'semisync') {
    guides.push(clToLeader.guide);
    reps.forEach((r, i) => { const e = repEdge(i, { dashed: i !== 0 }); guides.push(e.guide); });
    const back = repEdge(0, { ack: true, dashed: true });   // the one fast ack
    guides.push(back.guide); railIn = back.d;
    const okEdge = edge([
      V(leader.verts.W.x - 2, leader.front[1] + 12),
      V((client.verts.E.x + leader.verts.W.x) / 2, (client.front[1] + leader.front[1]) / 2 + 20),
      V(client.verts.E.x - 2, client.front[1] + 10),
    ], { arrow: true });
    guides.push(okEdge.guide); railOut = okEdge.d;
    badges.push(pill(RPX, RPY[0] - RH - 2, 'first ack wins', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(LX, 430, 'OK after any 1 of 3', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(region(120, 476, 800, 68, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="514" text-anchor="middle">DURABLE ON TWO NODES · A LAGGARD CAN’T STALL IT</text>`);
    flows.push({ id: 'in', kind: 'read', speed: 170, size: 5 }, { id: 'out', kind: 'read', speed: 170, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP ──────────────────────────────────────────────────────────────── */
  guides.push(clToLeader.guide); railOut = clToLeader.d;
  reps.forEach((r, i) => { const e = repEdge(i); guides.push(e.guide); });
  const back = repEdge(1, { ack: true, dashed: true });
  guides.push(back.guide); railIn = back.d;
  const tags = ['no committed write lost', 'cost: write round-trip', 'stall risk → semi-sync'];
  tags.forEach((t, i) => badges.push(pill(LX - 2, 408 + i * 40, t, { icon: 'check', w: 300 })));
  flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 }, { id: 'in', kind: 'read', speed: 150, size: 5 });
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
  <svg class="scene scene--synchronous-replication" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Synchronous replication">
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
