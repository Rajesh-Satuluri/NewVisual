/* rebalancing-scene.js — the "Rebalancing" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes as nodes with stacked partition tiles,
   soft ground shadows, halos, pill badges, dashed logical regions, routed
   connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'drift' (3 nodes, uneven stacks), 'naive' (mod-N reshuffles all),
   'minimal' (new node pulls 1 partition each), 'schemes' (fixed vs dynamic),
   'throttle' (gradual migration vs live traffic), 'recap' (balanced stacks). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const ROWY = 300;

export function renderRebalancingScene(snap, opts = {}) {
  const view = snap.view || 'drift';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a node base cube; caller keeps coords, never read back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 50, o.h || 40, mat, {
      icon: o.icon || 'server', label, sub: o.sub || '', iconSize: 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // a stack of partition tiles sitting ABOVE a node top (x, topY), count tiles
  const stack = (x, topY, count, mat, o = {}) => {
    const step = 20, rx = o.rx || 34;
    for (let i = 0; i < count; i++) {
      const ty = topY - i * step;
      const t = isoTile(x, ty, rx, mat, { h: 13, ghost: o.ghost });
      shadows.push(t.shadow); solids.push(t.g);
    }
  };

  /* ── DRIFT: three nodes with very uneven partition stacks ──────────────── */
  if (view === 'drift') {
    const X = [230, 520, 810];
    const counts = [6, 2, 1];
    const mats = ['rose', 'green', 'green'];
    X.forEach((x, i) => {
      node(x, ROWY, 'node ' + (i + 1), 'slate', { sub: counts[i] + ' parts' });
      stack(x, ROWY - 34, counts[i], mats[i], {});
    });
    badges.push(pill(X[0], 70, 'hot · overloaded', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(X[2], 236, 'idle', { icon: 'check', cls: 'pill--sst' }));
    badges.push(region(140, 392, 760, 86, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="430" text-anchor="middle">LOAD SKEWED · ONE NODE DOES ALL THE WORK</text>`);
    cap(VW / 2, 508, 'growth, failures and hot keys all tilt a cluster out of balance');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── NAIVE: mod-N, a 4th node joins, nearly all keys must move ─────────── */
  if (view === 'naive') {
    const X = [180, 400, 620, 860];
    X.forEach((x, i) => {
      const joining = i === 3;
      node(x, ROWY, joining ? 'new node' : 'node ' + (i + 1), joining ? 'amber' : 'slate',
        { sub: joining ? 'joins' : 'remaps', halo: joining, ghost: joining });
      stack(x, ROWY - 34, joining ? 0 : 3, 'rose', {});
    });
    // migration arrows criss-crossing — everything moves
    for (let i = 0; i < 3; i++) {
      const e = edge([V(X[i], ROWY - 96), V((X[i] + X[(i + 1)]) / 2, 150), V(X[(i + 1) % 4], ROWY - 70)], { arrow: true, dashed: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    }
    badges.push(pill(VW / 2, 92, 'node = hash(key) mod N', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, 470, 'N: 3 → 4  ⇒  modulus changes for ~every key', { icon: 'alert' }));
    cap(VW / 2, 510, 'adding one node reshuffles almost the entire dataset');
    flows.push({ id: 'out', kind: 'write', speed: 140, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── MINIMAL: partition layer, new node pulls 1 partition from each ────── */
  if (view === 'minimal') {
    const X = [180, 400, 620, 860];
    X.forEach((x, i) => {
      const joining = i === 3;
      node(x, ROWY, joining ? 'new node' : 'node ' + (i + 1), joining ? 'green' : 'slate',
        { sub: joining ? 'fills up' : 'gives 1', halo: joining });
      stack(x, ROWY - 34, joining ? 0 : 2, 'green', {});
    });
    // one tidy arrow from each old node to the newcomer
    for (let i = 0; i < 3; i++) {
      const e = edge([V(X[i], ROWY - 76), V((X[i] + X[3]) / 2, 168), V(X[3], ROWY - 50)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    }
    badges.push(pill(VW / 2, 92, 'key → partition → node', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, 470, 'each node gives up ~1/(N+1) of its partitions', { icon: 'check' }));
    cap(VW / 2, 510, 'reassign whole partitions — only ~1/N of the data moves');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SCHEMES: fixed (many partitions) vs dynamic (split/merge) ─────────── */
  if (view === 'schemes') {
    // left: fixed — two nodes each holding a bundle of small partitions
    const LX = [220, 420];
    LX.forEach((x, i) => {
      node(x, ROWY, 'node', 'slate', { rx: 44, sub: 'bundle' });
      stack(x, ROWY - 30, 4, 'lilac', { rx: 28 });
    });
    badges.push(region(140, 150, 380, 300, '', { r: 22 }));
    badges.push(pill(320, 176, 'FIXED · 256 partitions', { icon: 'grid', cls: 'pill--sst' }));
    badges.push(pill(320, 474, 'reassign bundles of whole partitions', { icon: 'check', cls: 'pill--sst' }));
    // right: dynamic — one big partition splitting into two
    const RX = 760;
    node(RX, ROWY, 'node', 'slate', { rx: 44, sub: 'splits' });
    const big = isoTile(RX, ROWY - 34, 40, 'rose', { h: 16 });
    shadows.push(big.shadow); solids.push(big.g);
    const sA = isoTile(RX - 30, ROWY - 70, 26, 'green', { h: 13 });
    const sB = isoTile(RX + 30, ROWY - 70, 26, 'green', { h: 13 });
    shadows.push(sA.shadow, sB.shadow); solids.push(sA.g, sB.g);
    const e1 = edge([V(RX, ROWY - 50), V(RX - 30, ROWY - 58)], { arrow: true });
    const e2 = edge([V(RX, ROWY - 50), V(RX + 30, ROWY - 58)], { arrow: true });
    guides.push(e1.guide, e2.guide);
    badges.push(region(600, 150, 320, 300, '', { r: 22 }));
    badges.push(pill(RX, 176, 'DYNAMIC · split on size', { icon: 'layers', cls: 'pill--sst' }));
    badges.push(pill(RX, 474, 'partition grows → split in two', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 528, 'both move whole partitions — never individual keys');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── THROTTLE: gradual migration against live query traffic ────────────── */
  if (view === 'throttle') {
    const src = 300, dst = 760;
    node(src, ROWY, 'source', 'slate', { sub: 'serving' });
    stack(src, ROWY - 34, 3, 'green', {});
    node(dst, ROWY, 'target', 'blue', { sub: 'serving' });
    stack(dst, ROWY - 34, 1, 'green', {});
    // throttled partition move across the middle
    const mv = edge([V(src + 20, ROWY - 70), V(VW / 2, 180), V(dst - 20, ROWY - 46)], { arrow: true });
    guides.push(mv.guide); railOut = mv.d;
    badges.push(pill(VW / 2, 150, 'throttled · a few partitions at a time', { icon: 'clock', cls: 'pill--sst' }));
    // live client traffic still flowing to both
    const cli = isoCube(VW / 2, 462, 44, 36, 'amber', { icon: 'app', label: 'clients', iconSize: 16 });
    shadows.push(cli.shadow); solids.push(cli.g);
    const q1 = edge([V(VW / 2 - 30, 452), V(src, ROWY + 44)], { arrow: true });
    const q2 = edge([V(VW / 2 + 30, 452), V(dst, ROWY + 44)], { arrow: true });
    guides.push(q1.guide, q2.guide); railIn = q1.d;
    badges.push(pill(VW / 2, 540, 'queries keep flowing · data stays available', { icon: 'check' }));
    flows.push({ id: 'out', kind: 'write', speed: 110, size: 5 });
    flows.push({ id: 'in', kind: 'read', speed: 170, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: four nodes, even balanced stacks ───────────────────────────── */
  const X = [180, 400, 620, 860];
  X.forEach((x, i) => {
    node(x, ROWY, 'node ' + (i + 1), 'green', { halo: i === 1 });
    stack(x, ROWY - 34, 2, 'green', {});
  });
  badges.push(region(130, 404, 780, 150, 'even load · minimal movement · no downtime', { r: 24 }));
  const tags = ['move ~1/N, not everything', 'reassign partitions, not keys', 'gradual & online'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 440 + i * 42, t, { icon: 'check', w: 320 })));
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
  <svg class="scene scene--rebalancing" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Rebalancing a cluster">
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
