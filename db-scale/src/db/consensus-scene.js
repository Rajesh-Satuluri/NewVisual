/* consensus-scene.js — the "Consensus" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes with icon glyphs and labels, soft
   ground shadows, halos, pill badges, dashed logical regions, routed connectors
   with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'problem' (peers, rival proposals, lossy net), 'define' (the three
   guarantees), 'majority' (3 of 5 accept x=7), 'flp' (crashed or slow?),
   'partition' (3 decide, 2 halt), 'recap' (one agreed value). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a row of five node slots across the middle band */
const ROWY = 288;
const X5 = [180, 370, 560, 750, 940];

export function renderConsensusScene(snap, opts = {}) {
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

  /* ── PROBLEM: 5 peers, three rival proposals, a lossy network ──────────── */
  if (view === 'problem') {
    const props = ['x=7', 'x=7', 'x=3', 'x=9', 'x=3'];
    X5.forEach((x, i) => {
      node(x, ROWY, 'N' + (i + 1), 'blue', { sub: 'proposes' });
      badges.push(pill(x, ROWY - 86, props[i], { icon: 'app', cls: 'pill--sst' }));
    });
    // a few dropped/crossed messages between peers
    const link = (a, b, drop) => {
      const e = edge([V(X5[a], ROWY + 58), V((X5[a] + X5[b]) / 2, ROWY + 96), V(X5[b], ROWY + 58)],
        { dashed: true, r: 10, arrow: !drop });
      guides.push(e.guide);
      if (drop) badges.push(pill((X5[a] + X5[b]) / 2, ROWY + 104, 'lost', { icon: 'alert', cls: 'pill--sst' }));
    };
    link(0, 1, false); link(1, 2, true); link(2, 3, false); link(3, 4, true);
    badges.push(pill(VW / 2, 120, 'lossy, asynchronous network', { icon: 'globe', cls: 'pill--sst' }));
    cap(VW / 2, 470, 'three different proposals, dropped messages — yet all five must end up on one value');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DEFINE: the three guarantees as pillars ───────────────────────────── */
  if (view === 'define') {
    const defs = [
      { x: 260, label: 'Agreement', sub: 'no two differ', mat: 'green', icon: 'check', tag: 'SAFETY' },
      { x: VW / 2, label: 'Validity', sub: 'was proposed', mat: 'green', icon: 'scale', tag: 'SAFETY' },
      { x: 780, label: 'Termination', sub: 'eventually decide', mat: 'amber', icon: 'clock', tag: 'LIVENESS' },
    ];
    defs.forEach(d => {
      node(d.x, ROWY, d.label, d.mat, { sub: d.sub, icon: d.icon, rx: 58, h: 48, halo: true });
      badges.push(pill(d.x, ROWY - 92, d.tag, { icon: d.tag === 'SAFETY' ? 'check' : 'bolt', cls: 'pill--sst' }));
    });
    badges.push(region(150, 196, 420, 236, '', { r: 24 }));
    badges.push(`<text class="iso-region__t" x="360" y="214" text-anchor="middle">NEVER BROKEN</text>`);
    badges.push(region(640, 196, 280, 236, '', { r: 24 }));
    badges.push(`<text class="iso-region__t" x="780" y="214" text-anchor="middle">MAY BE DELAYED</text>`);
    cap(VW / 2, 474, 'a correct protocol pauses rather than ever breaking agreement or validity');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── MAJORITY: 3 of 5 accept x=7, overlap blocks a rival ───────────────── */
  if (view === 'majority') {
    const accept = [0, 1, 2];
    X5.forEach((x, i) => {
      const inq = accept.includes(i);
      node(x, ROWY, 'N' + (i + 1), inq ? 'green' : 'slate',
        { halo: inq, ghost: !inq, sub: inq ? 'accept x=7' : 'idle' });
    });
    // proposer up top fans x=7 to the majority
    node(VW / 2, 120, 'proposer', 'amber', { icon: 'app', rx: 44, h: 40 });
    accept.forEach((i, k) => {
      const e = edge([V(VW / 2, 158), V((VW / 2 + X5[i]) / 2, 214), V(X5[i], ROWY - 30)], { arrow: true });
      guides.push(e.guide);
      if (k === 0) railOut = e.d;
    });
    badges.push(pill(VW / 2, 466, 'majority accepts x=7  →  DECIDED', { icon: 'check' }));
    cap(VW / 2, 506, 'a rival value can never also reach three — the shared node refuses it');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── FLP: one node silent — crashed, or just slow? ─────────────────────── */
  if (view === 'flp') {
    X5.forEach((x, i) => {
      const silent = i === 3;
      node(x, ROWY, 'N' + (i + 1), silent ? 'rose' : 'green',
        { ghost: silent, halo: !silent && i === 0, sub: silent ? 'silent?' : 'waiting' });
    });
    badges.push(pill(X5[3], ROWY - 90, 'crashed  or  just slow?', { icon: 'alert', cls: 'pill--sst' }));
    // the silent node withholds the deciding vote
    const e = edge([V(X5[3], ROWY + 56), V(X5[3] - 20, ROWY + 104), V(VW / 2, ROWY + 128)], { dashed: true, r: 10 });
    guides.push(e.guide);
    badges.push(region(150, 404, 740, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="442" text-anchor="middle">FLP · NO PURELY-LOGICAL GUARANTEE OF TERMINATION</text>`);
    badges.push(pill(VW / 2, 522, 'fix: timeouts + randomness restore progress', { icon: 'clock', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PARTITION: 3 (majority, decides) | 2 (no majority, halts) ─────────── */
  if (view === 'partition') {
    X5.forEach((x, i) => {
      const major = i <= 2;
      node(x, ROWY, 'N' + (i + 1), major ? 'green' : 'lilac',
        { halo: major && i === 0, ghost: !major, sub: major ? 'decides' : 'halts' });
    });
    const bx = (X5[2] + X5[3]) / 2;
    const zig = [V(bx - 22, 150), V(bx + 20, 210), V(bx - 20, 270), V(bx + 22, 330), V(bx - 20, 390), V(bx + 20, 448)];
    const br = edge(zig, { dashed: true, r: 2 });
    guides.push(br.guide);
    badges.push(pill(bx, 118, 'partition', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(X5[1], 178, 'MAJORITY · 3 → decides ✓', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(X5[3] + 34, 178, 'MINORITY · 2 → halts', { icon: 'alert', cls: 'pill--sst' }));
    const e = edge([V(X5[0] - 10, 150), V(X5[0] - 40, 214), V(X5[0], ROWY - 30)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    cap(VW / 2, 500, 'CP: only the majority side progresses — consistency bought with availability');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: one agreed value across the cluster ────────────────────────── */
  X5.forEach((x, i) => node(x, ROWY, 'N' + (i + 1), 'green', { halo: i === 2, sub: 'x=7' }));
  badges.push(region(118, 200, 884, 150, 'one value · agreed by all', { r: 24 }));
  const tags = ['decide by majority', 'safety over liveness', 'Paxos · Raft implement it'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 440 + i * 44, t, { icon: 'check', w: 320 })));
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
  <svg class="scene scene--consensus" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Consensus across a cluster">
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
