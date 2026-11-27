/* partitioning-strategies-scene.js — the "Partitioning Strategies" scene, in the
   shared Designed-to-Scale isometric vocabulary: rounded iso cubes with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'problem' (one overloaded node), 'bykey' (range vs hash placement),
   'local' (scatter/gather secondary read), 'global' (term-partitioned index),
   'routing' (routing tier maps key → owner), 'recap' (split/index/route/
   rebalance). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const ROWY = 300;
/* four partition slots across the middle band */
const X4 = [205, 445, 685, 925];

export function renderPartitioningStrategiesScene(snap, opts = {}) {
  const view = snap.view || 'bykey';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a node; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'database', label, sub: o.sub || '', iconSize: 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── PROBLEM: one node, overloaded ─────────────────────────────────────── */
  if (view === 'problem') {
    node(VW / 2, 278, 'node', 'rose', { rx: 70, h: 60, icon: 'database', sub: 'everything', halo: true });
    badges.push(pill(VW / 2, 158, 'ALL rows · ALL requests', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(VW / 2 - 230, 262, 'disk full', { icon: 'layers', cls: 'pill--sst' }));
    badges.push(pill(VW / 2 + 230, 262, 'CPU maxed', { icon: 'bolt', cls: 'pill--sst' }));
    // many clients piling on
    [-3, -1.5, 0, 1.5, 3].forEach((k, i) => {
      const cx = VW / 2 + k * 70;
      const e = edge([V(cx, 430), V(cx * 0.5 + VW / 4, 372), V(VW / 2, 316)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d;
    });
    badges.push(region(150, 408, 740, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="446" text-anchor="middle">ONE NODE CANNOT HOLD OR SERVE IT ALL</text>`);
    cap(VW / 2, 522, 'the dataset must be split across many nodes');
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── BYKEY: range (sorted bands) vs hash (uniform) ─────────────────────── */
  if (view === 'bykey') {
    // left half: range; right half: hash
    const rangeLabels = ['A–F', 'G–M'];
    const hashLabels = ['h→0', 'h→1'];
    const LX = [185, 375], RX = [665, 855];
    LX.forEach((x, i) => node(x, ROWY, rangeLabels[i], 'green', { sub: 'sorted', rx: 44, icon: 'listOrdered' }));
    RX.forEach((x, i) => node(x, ROWY, hashLabels[i], 'blue', { sub: 'uniform', rx: 44, icon: 'merge' }));
    badges.push(region(118, 206, 348, 206, '', { r: 22 }));
    badges.push(region(574, 206, 348, 206, '', { r: 22 }));
    badges.push(pill(280, 224, 'RANGE · keys in order', { icon: 'listOrdered', cls: 'pill--sst' }));
    badges.push(pill(760, 224, 'HASH · hash(key)', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(pill(280, 440, 'scans fast · hotspot risk', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(760, 440, 'load even · no scans', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'two ways to assign a primary key to a partition');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LOCAL: secondary read scatters to every partition ─────────────────── */
  if (view === 'local') {
    X4.forEach((x, i) => node(x, ROWY, 'P' + (i + 1), 'slate',
      { sub: 'own index', rx: 44, icon: 'database', halo: true }));
    // a coordinator up top fans the query to all four
    node(VW / 2, 128, 'query', 'amber', { icon: 'search', rx: 44, h: 40, sub: 'colour=red' });
    X4.forEach((x, k) => {
      const e = edge([V(VW / 2, 166), V((VW / 2 + x) / 2, 222), V(x, ROWY - 30)], { arrow: true });
      guides.push(e.guide);
      if (k === 0) railOut = e.d;
    });
    badges.push(pill(VW / 2, 470, 'SCATTER → ask all · GATHER ← merge', { icon: 'alert', cls: 'pill--sst' }));
    cap(VW / 2, 510, 'local index: cheap write, but every read fans out');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── GLOBAL: term-partitioned index, read hits one partition ───────────── */
  if (view === 'global') {
    X4.forEach((x, i) => {
      const hit = i === 1;
      node(x, ROWY, ['red', 'blue', 'green', 'white'][i], hit ? 'green' : 'slate',
        { sub: hit ? 'term=red' : 'other terms', rx: 44, icon: 'layers', halo: hit, ghost: !hit });
    });
    node(VW / 2, 128, 'query', 'amber', { icon: 'search', rx: 44, h: 40, sub: 'colour=red' });
    // single arrow to the one owning index partition
    const e = edge([V(VW / 2, 166), V((VW / 2 + X4[1]) / 2, 224), V(X4[1], ROWY - 30)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(X4[1], 182, 'the one “red” partition', { icon: 'check', cls: 'pill--sst' }));
    // write fan-out shown faint on the right
    badges.push(pill(VW / 2, 470, 'READ → one partition · WRITE → several (remote)', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 510, 'global index: focused read, but writes update remote partitions');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ROUTING: a routing tier maps key → owner ──────────────────────────── */
  if (view === 'routing') {
    X4.forEach((x, i) => {
      const owner = i === 2;
      node(x, ROWY, 'P' + (i + 1), owner ? 'green' : 'slate',
        { sub: owner ? 'owner' : '', rx: 44, icon: 'database', halo: owner, ghost: !owner });
    });
    // client → router → owner
    node(180, 130, 'client', 'blue', { icon: 'app', rx: 42, h: 38, sub: 'key k' });
    node(VW / 2, 130, 'router', 'amber', { icon: 'globe', rx: 48, h: 42, sub: 'partition map' });
    const e1 = edge([V(222, 150), V(380, 150), V(VW / 2 - 52, 134)], { arrow: true });
    guides.push(e1.guide); railIn = e1.d;
    const e2 = edge([V(VW / 2, 172), V((VW / 2 + X4[2]) / 2, 226), V(X4[2], ROWY - 30)], { arrow: true });
    guides.push(e2.guide); railOut = e2.d;
    badges.push(pill(VW / 2, 470, 'proxy · smart client · gossip', { icon: 'globe', cls: 'pill--sst' }));
    cap(VW / 2, 510, 'routing finds the owning partition; rebalancing keeps the map honest');
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: split · index · route · rebalance ──────────────────────────── */
  X4.forEach((x, i) => node(x, ROWY, 'P' + (i + 1), 'green', { rx: 44, icon: 'database', halo: i === 1 }));
  badges.push(region(118, 200, 884, 160, 'four decisions behind every partitioned store', { r: 24 }));
  const tags = ['split — range or hash', 'index — local or global', 'route — proxy, client or gossip', 'rebalance — as the cluster grows'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 428 + i * 40, t, { icon: 'check', w: 360 })));
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
  <svg class="scene scene--partitioning-strategies" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Partitioning strategies">
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
