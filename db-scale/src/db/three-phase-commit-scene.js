/* three-phase-commit-scene.js — the "Three-Phase Commit" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'block' (2PC coordinator crash strands participants), 'phases' (the
   three rounds side by side), 'walk' (one txn down all three phases),
   'recover' (a survivor polls and finishes), 'partition' (a split diverges),
   'recap' (non-blocking vs partition-proof). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const COORDY = 118;
const PARTY = 348;
const PX = [200, 430, 660, 890];   // four participant slots

export function renderThreePhaseCommitScene(snap, opts = {}) {
  const view = snap.view || 'phases';

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

  /* ── BLOCK: 2PC coordinator crashes mid-decision, participants frozen ───── */
  if (view === 'block') {
    node(VW / 2, COORDY, 'coordinator', 'rose', { icon: 'alert', rx: 50, h: 40, sub: 'crashed' });
    badges.push(pill(VW / 2, COORDY - 60, '✗ died after votes, before decision', { icon: 'alert', cls: 'pill--sst' }));
    PX.forEach((x, i) => {
      node(x, PARTY, 'P' + (i + 1), 'slate', { ghost: true, sub: 'voted yes' });
      const e = edge([V(x, PARTY - 44), V((x + VW / 2) / 2, 240), V(VW / 2, COORDY + 52)], { dashed: true });
      guides.push(e.guide);
      badges.push(pill(x, PARTY + 76, 'blocked · holds locks', { icon: 'key', cls: 'pill--sst' }));
    });
    badges.push(region(150, 300, 740, 140, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="470" text-anchor="middle">2PC BLOCKS · NO ONE CAN SAFELY DECIDE</text>`);
    cap(VW / 2, 502, 'voted yes but never heard commit — stuck until the coordinator returns');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PHASES: three labeled rounds across the band ──────────────────────── */
  if (view === 'phases') {
    node(VW / 2, COORDY, 'coordinator', 'amber', { icon: 'app', rx: 50, h: 40 });
    const labels = ['1 · can-commit?', '2 · pre-commit', '3 · do-commit'];
    const cols = ['blue', 'lilac', 'green'];
    const bx = [230, 520, 810];
    bx.forEach((x, i) => {
      badges.push(region(x - 128, 206, 256, 232, '', { r: 20 }));
      badges.push(pill(x, 226, labels[i], { icon: i === 2 ? 'check' : 'merge', cls: 'pill--sst' }));
      node(x, PARTY, 'P' + (i + 1), cols[i], { halo: i === 1, sub: ['vote', 'ack', 'commit'][i] });
      const e = edge([V(VW / 2, COORDY + 50), V((VW / 2 + x) / 2, 230), V(x, PARTY - 44)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    cap(VW / 2, 500, 'a broadcast and an acknowledgement, three times over');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── WALK: one transaction stepping down the three phases ───────────────── */
  if (view === 'walk') {
    node(VW / 2, COORDY, 'coordinator', 'amber', { icon: 'app', rx: 50, h: 40 });
    const stops = [
      { y: 210, t: 'can-commit? → all vote YES', mat: 'blue', ic: 'check' },
      { y: 300, t: 'pre-commit → all ACK', mat: 'lilac', ic: 'merge' },
      { y: 392, t: 'do-commit → committed', mat: 'green', ic: 'check' },
    ];
    let prevY = COORDY + 50;
    stops.forEach((s, i) => {
      badges.push(pill(VW / 2, s.y, s.t, { icon: s.ic, w: 360, cls: 'pill--sst' }));
      const e = edge([V(VW / 2, prevY), V(VW / 2, s.y - 22)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
      prevY = s.y + 22;
    });
    node(260, 470, 'P1', 'green', { sub: 'done' });
    node(520, 470, 'P2', 'green', { sub: 'done' });
    node(780, 470, 'P3', 'green', { sub: 'done' });
    flows.push({ id: 'out', kind: 'write', speed: 140, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECOVER: coordinator dead, a survivor polls and finishes ──────────── */
  if (view === 'recover') {
    node(VW / 2, COORDY, 'coordinator', 'rose', { icon: 'alert', rx: 50, h: 40, sub: 'crashed' });
    badges.push(pill(VW / 2, COORDY - 60, '✗ coordinator down', { icon: 'alert', cls: 'pill--sst' }));
    node(PX[0], PARTY, 'recovery', 'amber', { icon: 'app', halo: true, sub: 'takes over' });
    PX.slice(1).forEach((x, i) => {
      node(x, PARTY, 'P' + (i + 2), 'green', { sub: 'saw pre-commit' });
      const e = edge([V(PX[0] + 46, PARTY), V((PX[0] + x) / 2, PARTY - 40), V(x - 46, PARTY)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    badges.push(region(150, 300, 740, 150, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="474" text-anchor="middle">SAW PRE-COMMIT → FINISH COMMIT · NON-BLOCKING</text>`);
    cap(VW / 2, 506, 'a survivor infers the outcome and completes it — no wait on the dead node');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PARTITION: the split diverges — one side commits, one aborts ──────── */
  if (view === 'partition') {
    node(300, PARTY, 'P1', 'green', { sub: 'commits' });
    node(430, PARTY, 'P2', 'green', { sub: 'commits' });
    node(680, PARTY, 'P3', 'rose', { sub: 'aborts' });
    node(820, PARTY, 'P4', 'rose', { sub: 'aborts' });
    const bx = (430 + 680) / 2;
    const zig = [V(bx - 22, 160), V(bx + 20, 222), V(bx - 20, 284), V(bx + 22, 346), V(bx - 20, 408), V(bx + 20, 466)];
    const br = edge(zig, { dashed: true, r: 2 });
    guides.push(br.guide);
    badges.push(pill(bx, 128, 'network partition', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(365, 232, 'saw pre-commit → COMMIT', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(750, 232, 'timed out → ABORT', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(180, 430, 680, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="468" text-anchor="middle">HALVES DIVERGE · 3PC IS NOT PARTITION-SAFE</text>`);
    cap(VW / 2, 540, 'consensus (Paxos, Raft) is needed to stay correct across a split');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: non-blocking, but not partition-proof ──────────────────────── */
  node(VW / 2, COORDY, 'coordinator', 'amber', { icon: 'app', rx: 50, h: 40 });
  PX.forEach((x, i) => node(x, PARTY, 'P' + (i + 1), 'green', { halo: i === 1 }));
  badges.push(region(118, 430, 884, 128, '', { r: 24 }));
  const tags = ['pre-commit → non-blocking under crashes', 'extra round trip of latency', 'still unsafe under partitions → use Raft'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 462 + i * 36, t, { icon: i === 2 ? 'alert' : 'check', w: 440, cls: 'pill--sst' })));
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
  <svg class="scene scene--three-phase-commit" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Three-phase commit">
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
