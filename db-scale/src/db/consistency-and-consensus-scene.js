/* consistency-and-consensus-scene.js — the "Consistency & Consensus" scene, in
   the shared Designed-to-Scale isometric vocabulary: rounded iso cubes with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'weak' (replicas drift, clients disagree), 'ladder' (guarantee ladder),
   'causal' (A→B preserved, concurrent free), 'broadcast' (leader+quorum total
   order), 'cost' (partition: majority acts, minority halts), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const ROWY = 300;

export function renderConsistencyAndConsensusScene(snap, opts = {}) {
  const view = snap.view || 'ladder';

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

  /* ── WEAK: three replicas mid-drift, two clients read different values ──── */
  if (view === 'weak') {
    const RX = [300, 540, 780];
    const vals = ['v = 7', 'v = 7', 'v = 5'];
    const mats = ['green', 'green', 'rose'];
    RX.forEach((x, i) => {
      node(x, ROWY, 'R' + (i + 1), mats[i], { sub: i === 2 ? 'stale' : 'fresh' });
      badges.push(pill(x, ROWY - 86, vals[i], { icon: i === 2 ? 'alert' : 'check', cls: 'pill--sst' }));
    });
    // two clients below, reading from different replicas
    const c1x = 420, c2x = 700, cy = 486;
    node(c1x, cy, 'client A', 'blue', { icon: 'app', rx: 40, h: 38 });
    node(c2x, cy, 'client B', 'blue', { icon: 'app', rx: 40, h: 38 });
    const e1 = edge([V(c1x, cy - 36), V(RX[0] + 8, ROWY + 54)], { arrow: true });
    const e2 = edge([V(c2x, cy - 36), V(RX[2] - 8, ROWY + 54)], { arrow: true });
    guides.push(e1.guide, e2.guide); railIn = e1.d;
    badges.push(pill(c1x, cy + 60, 'reads 7', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(c2x, cy + 60, 'reads 5', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, 150, 'write still propagating…', { icon: 'merge', cls: 'pill--sst' }));
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LADDER: a vertical ladder of consistency guarantees ───────────────── */
  if (view === 'ladder') {
    const rungs = [
      { t: 'eventual', s: 'copies converge someday', mat: 'rose', ic: 'alert' },
      { t: 'read-your-writes', s: 'see your own updates', mat: 'amber', ic: 'check' },
      { t: 'monotonic reads', s: 'time never goes backward', mat: 'amber', ic: 'check' },
      { t: 'causal', s: 'cause before effect', mat: 'green', ic: 'merge' },
      { t: 'linearizable', s: 'acts as one copy', mat: 'lilac', ic: 'target' },
    ];
    const cx = VW / 2, topY = 120, stepY = 76, rw = 440, rh = 56;
    rungs.forEach((r, i) => {
      const y = topY + (rungs.length - 1 - i) * stepY; // eventual at bottom, linearizable on top
      badges.push(region(cx - rw / 2, y - rh / 2, rw, rh, '', { r: 16 }));
      badges.push(pill(cx - 96, y, r.t, { icon: r.ic, cls: 'pill--sst', w: 196 }));
      cap(cx + 104, y + 4, r.s);
    });
    // a "stronger" arrow climbing the left side
    const ax = cx - rw / 2 - 48;
    const ar = edge([V(ax, topY + (rungs.length - 1) * stepY + 10), V(ax, topY - 10)], { arrow: true });
    guides.push(ar.guide);
    badges.push(pill(ax, topY - 36, 'stronger', { icon: 'target', cls: 'pill--sst' }));
    badges.push(pill(ax, topY + (rungs.length - 1) * stepY + 42, 'more coordination', { icon: 'clock', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── CAUSAL: A→B preserved everywhere; concurrent writes may reorder ───── */
  if (view === 'causal') {
    const RX = [260, 540, 820];
    RX.forEach((x, i) => node(x, ROWY, 'R' + (i + 1), 'green', { sub: 'applies A→B' }));
    // the causal chain A then B, shown as ordered badges above each replica
    RX.forEach((x) => {
      badges.push(pill(x - 34, ROWY - 96, 'A', { icon: 'check', cls: 'pill--sst', w: 54 }));
      badges.push(pill(x + 34, ROWY - 96, 'B', { icon: 'check', cls: 'pill--sst', w: 54 }));
      const ar = edge([V(x - 20, ROWY - 82), V(x + 20, ROWY - 82)], { arrow: true, r: 2 });
      guides.push(ar.guide);
    });
    badges.push(pill(VW / 2, 128, 'B happened-after A → A before B on every replica', { icon: 'merge', cls: 'pill--sst' }));
    // a partition line that does NOT stop progress
    const bx = (RX[1] + RX[2]) / 2;
    const zig = [V(bx - 18, 196), V(bx + 16, 250), V(bx - 16, 304), V(bx + 16, 358), V(bx - 16, 408)];
    const br = edge(zig, { dashed: true, r: 2 });
    guides.push(br.guide);
    badges.push(pill(bx, 176, 'partition — both sides keep serving', { icon: 'check', cls: 'pill--sst' }));
    badges.push(region(150, 440, 740, 72, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="482" text-anchor="middle">CAUSAL ORDER NEEDS NO AGREEMENT · STAYS AVAILABLE</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── BROADCAST: leader sequences a log, quorum commits, all deliver same ── */
  if (view === 'broadcast') {
    const leaderX = VW / 2, leaderY = 132;
    node(leaderX, leaderY, 'leader', 'amber', { icon: 'listOrdered', rx: 46, h: 40, sub: 'sequences' });
    const FX = [230, 430, 630, 830];
    const fy = 330;
    FX.forEach((x, i) => {
      const inq = i < 3;
      node(x, fy, 'N' + (i + 1), inq ? 'green' : 'slate',
        { halo: inq && i === 0, ghost: !inq, sub: inq ? 'commits #4' : 'lagging' });
      const e = edge([V(leaderX, leaderY + 46), V((leaderX + x) / 2, 232), V(x, fy - 32)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    // an ordered log strip under the leader
    const logX = VW / 2 - 108, logY = 470;
    ['#1', '#2', '#3', '#4'].forEach((lbl, i) => {
      const tx = logX + i * 74;
      const t = isoTile(tx, logY, 30, i === 3 ? 'lilac' : 'green', { h: 16 });
      shadows.push(t.shadow); solids.push(t.g);
      badges.push(`<text class="sst-cap" x="${A(tx)}" y="${A(logY + 2)}" text-anchor="middle">${lbl}</text>`);
    });
    badges.push(pill(VW / 2, 418, 'total order: every node delivers #1 #2 #3 #4', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, 528, 'entry #4 committed once a quorum (3 of 4) stores it', { icon: 'target', cls: 'pill--sst' }));
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── COST: partition — majority commits, minority halts ────────────────── */
  if (view === 'cost') {
    const X5 = [180, 370, 560, 760, 950];
    X5.forEach((x, i) => {
      const major = i <= 2;
      node(x, ROWY, 'N' + (i + 1), major ? 'green' : 'rose',
        { halo: major && i === 0, ghost: !major, sub: major ? 'commits' : 'halts' });
    });
    const bx = (X5[2] + X5[3]) / 2;
    const zig = [V(bx - 20, 160), V(bx + 18, 218), V(bx - 18, 276), V(bx + 18, 334), V(bx - 18, 392), V(bx + 18, 448)];
    const br = edge(zig, { dashed: true, r: 2 });
    guides.push(br.guide);
    badges.push(pill(bx, 128, 'partition', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(X5[1], 196, 'MAJORITY · quorum ✓ · linearizable', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(X5[3] + 40, 196, 'MINORITY · no quorum · unavailable', { icon: 'alert', cls: 'pill--sst' }));
    // the write reaches only the majority side
    const e = edge([V(X5[0] - 10, 160), V(X5[0] - 40, 220), V(X5[0], ROWY - 30)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    cap(VW / 2, 500, 'a majority round-trip adds latency; the minority side stops to keep one order');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the ladder and its engine ──────────────────────────────────── */
  node(VW / 2, 200, 'consensus', 'amber', { icon: 'listOrdered', rx: 52, h: 44, sub: 'leader + quorum', halo: true });
  badges.push(region(150, 300, 740, 190, 'one ladder · one engine', { r: 24 }));
  const tags = ['eventual → causal → linearizable', 'causal is the ceiling for availability', 'linearizable needs consensus', 'climb only as high as you must'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 346 + i * 40, t, { icon: 'check', w: 380 })));
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
  <svg class="scene scene--consistency-and-consensus" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Consistency and consensus">
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
