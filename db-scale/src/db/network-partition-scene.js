/* network-partition-scene.js — the "Network Partition" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'split' (one switch fails → two islands), 'ambiguous' (silence could
   mean crash/slow/partition), 'cp' (majority writes, minority read-only),
   'ap' (both sides write, diverge), 'cap' (the fork: CP vs AP), 'recap'
   (healed cluster, behavior designed in advance). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const ROWY = 288;
const X5 = [180, 370, 560, 750, 940];

export function renderNetworkPartitionScene(snap, opts = {}) {
  const view = snap.view || 'split';

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

  // a jagged vertical break centred on bx between yTop and yBot
  const breakAt = (bx, yTop, yBot, label, labelY) => {
    const steps = 6, zig = [];
    for (let i = 0; i <= steps; i++) {
      const y = yTop + (yBot - yTop) * (i / steps);
      zig.push(V(bx + (i % 2 === 0 ? -22 : 20), y));
    }
    const br = edge(zig, { dashed: true, r: 2 });
    guides.push(br.guide);
    if (label) badges.push(pill(bx, labelY != null ? labelY : yTop - 16, label, { icon: 'alert', cls: 'pill--sst' }));
  };

  /* ── SPLIT: one switch fails → two islands, all alive ──────────────────── */
  if (view === 'split') {
    X5.forEach((x, i) => {
      node(x, ROWY, 'N' + (i + 1), 'blue', { sub: 'alive' });
    });
    const bx = (X5[2] + X5[3]) / 2;
    breakAt(bx, 150, 452, 'switch down', 118);
    badges.push(pill(X5[1], 186, 'ISLAND A · 3 nodes', { icon: 'globe', cls: 'pill--sst' }));
    badges.push(pill(X5[3] + 30, 186, 'ISLAND B · 2 nodes', { icon: 'globe', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'every node is healthy — they simply cannot reach each other');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── AMBIGUOUS: silence could be crash / slow / partition ───────────────── */
  if (view === 'ambiguous') {
    node(260, ROWY, 'sender', 'amber', { icon: 'app', rx: 48, h: 42 });
    node(800, ROWY, 'peer', 'slate', { icon: 'server', ghost: true, sub: 'silent' });
    // a probe that gets no answer
    const e = edge([V(260 + 48, ROWY - 6), V(540, 250), V(800 - 50, ROWY - 10)], { arrow: true, dashed: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(540, 206, 'ping… no reply', { icon: 'clock', cls: 'pill--sst' }));
    // three possible explanations
    const opts3 = [
      { t: 'crashed?', ic: 'alert' },
      { t: 'just slow?', ic: 'clock' },
      { t: 'partitioned?', ic: 'globe' },
    ];
    badges.push(region(632, 392, 360, 150, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="812" y="420" text-anchor="middle">INDISTINGUISHABLE</text>`);
    opts3.forEach((o, i) => badges.push(pill(812, 452 + i * 34, o.t, { icon: o.ic, cls: 'pill--sst', w: 180 })));
    cap(VW / 2, 120, 'all three cases look identical: a message sent, nothing heard back');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── CP: majority writes, minority goes read-only ──────────────────────── */
  if (view === 'cp') {
    X5.forEach((x, i) => {
      const major = i <= 2;
      node(x, ROWY, 'N' + (i + 1), major ? 'green' : 'slate',
        { halo: major && i === 0, ghost: !major, sub: major ? 'writes' : 'read-only' });
    });
    const bx = (X5[2] + X5[3]) / 2;
    breakAt(bx, 150, 452, 'partition', 118);
    badges.push(pill(X5[1], 186, 'MAJORITY · quorum ✓', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(X5[3] + 30, 186, 'MINORITY · halts writes', { icon: 'alert', cls: 'pill--sst' }));
    // a write accepted on the majority side only
    const e = edge([V(X5[0] - 12, 150), V(X5[0] - 40, 214), V(X5[0], ROWY - 30)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    cap(VW / 2, 500, 'consistency kept: one majority, one truth — minority waits');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── AP: both sides keep writing, diverge ──────────────────────────────── */
  if (view === 'ap') {
    X5.forEach((x, i) => {
      node(x, ROWY, 'N' + (i + 1), 'rose', { halo: i === 0 || i === 4, sub: 'writes' });
    });
    const bx = (X5[2] + X5[3]) / 2;
    breakAt(bx, 150, 452, 'partition', 118);
    // writes land on both sides
    const eL = edge([V(X5[0] - 12, 150), V(X5[0] - 40, 214), V(X5[0], ROWY - 30)], { arrow: true });
    const eR = edge([V(X5[4] + 12, 150), V(X5[4] + 40, 214), V(X5[4], ROWY - 30)], { arrow: true });
    guides.push(eL.guide); guides.push(eR.guide); railOut = eL.d;
    badges.push(pill(X5[1], 186, 'A: value = X', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(pill(X5[3] + 30, 186, 'B: value = Y', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(region(150, 404, 740, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="442" text-anchor="middle">BOTH LIVE · VERSIONS DIVERGE · RECONCILE LATER</text>`);
    cap(VW / 2, 522, 'availability kept: nobody is told no — merge the two truths on heal');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── CAP: the fork between CP and AP ────────────────────────────────────── */
  if (view === 'cap') {
    node(VW / 2, 130, 'partition', 'amber', { icon: 'globe', rx: 50, h: 42, sub: 'in progress' });
    // left branch: CP
    node(300, 330, 'CP', 'green', { icon: 'check', rx: 52, h: 46, halo: true, sub: 'consistent' });
    // right branch: AP
    node(760, 330, 'AP', 'rose', { icon: 'bolt', rx: 52, h: 46, halo: true, sub: 'available' });
    const eL = edge([V(VW / 2 - 20, 176), V(420, 250), V(300, 296)], { arrow: true });
    const eR = edge([V(VW / 2 + 20, 176), V(640, 250), V(760, 296)], { arrow: true });
    guides.push(eL.guide); guides.push(eR.guide);
    badges.push(pill(300, 430, 'minority halts → no divergence', { icon: 'check', cls: 'pill--sst', w: 300 }));
    badges.push(pill(300, 468, 'good for: balances, inventory', { icon: 'key', cls: 'pill--sst', w: 300 }));
    badges.push(pill(760, 430, 'both serve → diverge, then merge', { icon: 'alert', cls: 'pill--sst', w: 300 }));
    badges.push(pill(760, 468, 'good for: carts, counters, likes', { icon: 'key', cls: 'pill--sst', w: 300 }));
    cap(VW / 2, 528, 'you keep consistency OR availability — never both during the split');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: healed cluster, behavior designed in advance ───────────────── */
  X5.forEach((x, i) => node(x, ROWY, 'N' + (i + 1), 'green', { halo: i === 2, sub: 'reunited' }));
  badges.push(region(118, 196, 884, 150, 'partition healed · behavior was designed in', { r: 24 }));
  const tags = ['partitions are inevitable', 'pick CP or AP per data', 'plan the heal in advance'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 436 + i * 44, t, { icon: 'check', w: 320 })));
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
  <svg class="scene scene--network-partition" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Network partition">
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
