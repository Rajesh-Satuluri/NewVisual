/* hot-partitions-scene.js — the "Hot Partitions" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'skewed' (4 partitions, one on fire), 'onekey' (hot key hashes to one
   node), 'salted' (one key → K sub-keys across partitions), 'cache' (cache +
   replicas absorb reads), 'fanout' (scatter-gather read of K sub-keys),
   'recap' (load balanced, not just data). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a row of four partition slots across the middle band */
const ROWY = 300;
const X4 = [210, 430, 650, 870];

export function renderHotPartitionsScene(snap, opts = {}) {
  const view = snap.view || 'skewed';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a partition node; caller keeps the coords, we never read them back
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 48, o.h || 44, mat, {
      icon: o.icon || 'database', label, sub: o.sub || '', iconSize: 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── SKEWED: four even partitions, one hot and haloed ──────────────────── */
  if (view === 'skewed') {
    const hot = 1;
    X4.forEach((x, i) => {
      const isHot = i === hot;
      node(x, ROWY, 'P' + (i + 1), isHot ? 'rose' : 'slate',
        { halo: isHot, ghost: !isHot, sub: isHot ? 'ON FIRE' : 'idle', icon: 'database' });
    });
    // a client above rains requests onto the hot partition
    node(VW / 2, 118, 'clients', 'blue', { icon: 'app', rx: 46, h: 40 });
    const e = edge([V(VW / 2, 156), V((VW / 2 + X4[hot]) / 2, 214), V(X4[hot], ROWY - 32)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(X4[hot], ROWY - 104, 'hot key: user:celebrity', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, 470, 'each partition holds ¼ of the data — load is nowhere near ¼', { icon: 'gauge' }));
    cap(VW / 2, 510, 'balanced storage, wildly unbalanced traffic');
    flows.push({ id: 'out', kind: 'read', speed: 120, size: 7 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ONEKEY: the hot key deterministically hashes to a single partition ── */
  if (view === 'onekey') {
    X4.forEach((x, i) => {
      const isHot = i === 1;
      node(x, ROWY, 'P' + (i + 1), isHot ? 'rose' : 'slate',
        { halo: isHot, ghost: !isHot, sub: isHot ? 'owner' : '' });
    });
    // a hash box routes the one key to P2 only
    node(VW / 2, 120, 'hash(key)', 'amber', { icon: 'merge', rx: 52, h: 40 });
    const e = edge([V(VW / 2, 160), V((VW / 2 + X4[1]) / 2, 216), V(X4[1], ROWY - 32)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(X4[1], ROWY - 104, 'always → P2', { icon: 'key', cls: 'pill--sst' }));
    badges.push(region(140, 418, 760, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="456" text-anchor="middle">ONE KEY · ONE PARTITION · BY DESIGN</text>`);
    cap(VW / 2, 528, 'hashing spreads keys, not the requests for a single key');
    flows.push({ id: 'out', kind: 'read', speed: 130, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SALTED: one key → K sub-keys, each on a different partition ────────── */
  if (view === 'salted') {
    X4.forEach((x, i) => {
      node(x, ROWY, 'P' + (i + 1), 'green',
        { halo: false, sub: 'key#' + i });
    });
    // the salting box fans K writes out to all four partitions
    node(VW / 2, 118, 'key#0…#3', 'amber', { icon: 'layers', rx: 54, h: 40 });
    X4.forEach((x, i) => {
      const e = edge([V(VW / 2, 156), V((VW / 2 + x) / 2, 216), V(x, ROWY - 32)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    badges.push(pill(VW / 2, 470, 'one hot key → K salted sub-keys across K partitions', { icon: 'check' }));
    cap(VW / 2, 510, 'write load divides by ~K — no single node stays hot');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── CACHE: a cache + read replicas absorb the read torrent ─────────────── */
  if (view === 'cache') {
    // clients → cache (hits short-circuit) ; misses → partition + replicas
    node(260, 128, 'clients', 'blue', { icon: 'app', rx: 46, h: 40 });
    const cache = node(VW / 2, 128, 'cache', 'amber', { icon: 'bolt', rx: 50, h: 40, halo: true });
    const e1 = edge([V(306, 150), V(430, 150), V(VW / 2 - 54, 142)], { arrow: true });
    guides.push(e1.guide); railIn = e1.d;
    // the hot partition plus two read replicas along the bottom
    node(430, ROWY + 20, 'P2', 'rose', { sub: 'misses', ghost: true });
    node(640, ROWY + 20, 'replica', 'lilac', { sub: 'reads' });
    node(830, ROWY + 20, 'replica', 'lilac', { sub: 'reads' });
    const e2 = edge([V(VW / 2, 168), V(520, 230), V(430, ROWY - 12)], { arrow: true, dashed: true });
    guides.push(e2.guide);
    const e3 = edge([V(VW / 2 + 40, 168), V(660, 236), V(640, ROWY - 12)], { arrow: true });
    guides.push(e3.guide); railOut = e3.d;
    const e4 = edge([V(VW / 2 + 54, 164), V(820, 238), V(830, ROWY - 12)], { arrow: true });
    guides.push(e4.guide);
    badges.push(pill(VW / 2, 92, 'cache hit → never touches the partition', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(640, ROWY + 118, 'dedicated read replicas fan the load out', { icon: 'layers', cls: 'pill--sst' }));
    cap(VW / 2, 528, 'salt the writes · cache and replicate the reads');
    flows.push({ id: 'in', kind: 'read', speed: 140, size: 7 });
    flows.push({ id: 'out', kind: 'read', speed: 120, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── FANOUT: a read must scatter-gather all K sub-keys ──────────────────── */
  if (view === 'fanout') {
    X4.forEach((x, i) => node(x, ROWY, 'P' + (i + 1), 'green', { sub: 'key#' + i }));
    const reader = node(VW / 2, 118, 'reader', 'blue', { icon: 'search', rx: 48, h: 40 });
    // scatter out to all four, then a merge badge
    X4.forEach((x, i) => {
      const e = edge([V(VW / 2, 156), V((VW / 2 + x) / 2, 216), V(x, ROWY - 32)], { arrow: true, dashed: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    badges.push(pill(VW / 2, 462, 'scatter-gather: read all K sub-keys, then merge', { icon: 'merge' }));
    badges.push(region(150, 486, 740, 70, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="524" text-anchor="middle">+ ROUND-TRIPS · + MERGE COST · PICK K BY HAND</text>`);
    cap(VW / 2, 90, 'balance bought with fan-out and complexity');
    flows.push({ id: 'out', kind: 'read', speed: 130, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: load balanced, not just data ───────────────────────────────── */
  X4.forEach((x, i) => node(x, ROWY, 'P' + (i + 1), 'green', { sub: 'balanced' }));
  badges.push(region(118, 150, 804, 110, 'even load, not just even data', { r: 24 }));
  const tags = ['salt write-hot keys', 'cache + replicate read-hot keys', 'measure per-key load'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 420 + i * 44, t, { icon: 'check', w: 340 })));
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
  <svg class="scene scene--hot-partitions" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Hot partitions and how to spread their load">
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
