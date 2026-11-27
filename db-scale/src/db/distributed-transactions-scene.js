/* distributed-transactions-scene.js — the "Distributed Transactions" scene, in
   the shared Designed-to-Scale isometric vocabulary: rounded iso cubes with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'problem' (two shards, a crash between the writes), 'coordinator' (a
   coordinator above the shards), 'prepare' (PREPARE out, YES votes back),
   'commit' (COMMIT out, both shards flip), 'blocked' (coordinator down,
   participants stuck prepared), 'recap' (atomic across nodes, at a price). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* coordinator and two participant shards */
const COORDX = VW / 2, COORDY = 130;
const SHX = [330, 710], SHY = 316;

export function renderDistributedTransactionsScene(snap, opts = {}) {
  const view = snap.view || 'coordinator';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a node; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 52, o.h || 46, mat, {
      icon: o.icon || 'database', label, sub: o.sub || '', iconSize: 19,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  const coordinator = (o = {}) =>
    node(COORDX, COORDY, 'coordinator', o.mat || 'amber',
      { icon: 'app', rx: 48, h: 42, halo: o.halo, ghost: o.ghost, sub: o.sub || '' });

  /* ── PROBLEM: two shards, transfer, a crash lands between the writes ────── */
  if (view === 'problem') {
    node(SHX[0], SHY, 'shard A', 'blue', { sub: 'debit Alice −$100' });
    node(SHX[1], SHY, 'shard B', 'slate', { sub: 'credit Bob +$100', ghost: true });
    badges.push(pill(SHX[0], SHY - 92, 'balance: 100 → 0', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(SHX[1], SHY - 92, 'balance: 0 → 0 ✗', { icon: 'alert', cls: 'pill--sst' }));
    // the transfer edge, broken by a crash in the middle
    const mx = (SHX[0] + SHX[1]) / 2;
    const e = edge([V(SHX[0] + 52, SHY - 10), V(mx, SHY - 40), V(SHX[1] - 52, SHY - 10)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    const zig = [V(mx - 20, SHY - 86), V(mx + 18, SHY - 50), V(mx - 18, SHY - 14), V(mx + 18, SHY + 22)];
    const br = edge(zig, { dashed: true, r: 2 });
    guides.push(br.guide);
    badges.push(pill(mx, SHY + 54, 'CRASH between writes', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(150, 420, 740, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="458" text-anchor="middle">HALF-APPLIED · $100 VANISHES</text>`);
    cap(VW / 2, 500, 'a local commit on each shard is not an atomic commit across both');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── COORDINATOR: referee above the two shards ─────────────────────────── */
  if (view === 'coordinator') {
    coordinator({ halo: true, sub: 'owns outcome' });
    node(SHX[0], SHY, 'shard A', 'blue', { sub: 'participant' });
    node(SHX[1], SHY, 'shard B', 'blue', { sub: 'participant' });
    SHX.forEach((x, i) => {
      const e = edge([V(COORDX, COORDY + 52), V((COORDX + x) / 2, (COORDY + SHY) / 2), V(x, SHY - 36)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    badges.push(pill(VW / 2, 470, 'no node decides alone — the coordinator does', { icon: 'check' }));
    cap(VW / 2, 510, 'atomic commitment: all participants reach the same verdict');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PREPARE: PREPARE out, YES votes back ──────────────────────────────── */
  if (view === 'prepare') {
    coordinator({ sub: 'collecting votes' });
    node(SHX[0], SHY, 'shard A', 'green', { halo: true, sub: 'prepared · YES' });
    node(SHX[1], SHY, 'shard B', 'green', { halo: true, sub: 'prepared · YES' });
    SHX.forEach((x, i) => {
      const e = edge([V(COORDX, COORDY + 52), V((COORDX + x) / 2, (COORDY + SHY) / 2), V(x, SHY - 36)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    badges.push(pill(COORDX, COORDY - 78, 'PHASE 1 · PREPARE', { icon: 'listOrdered', cls: 'pill--sst' }));
    badges.push(pill(SHX[0], SHY + 96, 'lock + stage durably', { icon: 'key', cls: 'pill--sst' }));
    badges.push(pill(SHX[1], SHY + 96, 'lock + stage durably', { icon: 'key', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'commit requires a unanimous YES — one NO aborts everything');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── COMMIT: verdict fans out, both shards flip permanent ──────────────── */
  if (view === 'commit') {
    coordinator({ mat: 'green', halo: true, sub: 'decision: COMMIT' });
    node(SHX[0], SHY, 'shard A', 'green', { sub: 'committed ✓' });
    node(SHX[1], SHY, 'shard B', 'green', { sub: 'committed ✓' });
    SHX.forEach((x, i) => {
      const e = edge([V(COORDX, COORDY + 52), V((COORDX + x) / 2, (COORDY + SHY) / 2), V(x, SHY - 36)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    badges.push(pill(COORDX, COORDY - 78, 'PHASE 2 · COMMIT', { icon: 'check', cls: 'pill--sst' }));
    badges.push(region(190, 418, 660, 86, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="454" text-anchor="middle">BOTH SHARDS FLIP TOGETHER · ATOMIC</text>`);
    cap(VW / 2, 528, 'debit and credit become visible as one indivisible step');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── BLOCKED: coordinator down after PREPARE, participants stuck ────────── */
  if (view === 'blocked') {
    coordinator({ mat: 'rose', ghost: true, sub: 'crashed' });
    // a break across the links
    node(SHX[0], SHY, 'shard A', 'lilac', { sub: 'prepared · waiting' });
    node(SHX[1], SHY, 'shard B', 'lilac', { sub: 'prepared · waiting' });
    SHX.forEach((x, i) => {
      const mx = (COORDX + x) / 2, my = (COORDY + SHY) / 2;
      const e = edge([V(COORDX, COORDY + 52), V(mx, my), V(x, SHY - 36)], { dashed: true });
      guides.push(e.guide);
      badges.push(pill(mx, my, '✗', { icon: 'alert', cls: 'pill--sst' }));
    });
    badges.push(pill(COORDX, COORDY - 78, 'COORDINATOR DOWN', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(SHX[0], SHY + 96, 'locks held 🔒', { icon: 'key', cls: 'pill--sst' }));
    badges.push(pill(SHX[1], SHY + 96, 'locks held 🔒', { icon: 'key', cls: 'pill--sst' }));
    badges.push(region(150, 428, 740, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="466" text-anchor="middle">BLOCKED · LOCKS HELD INDEFINITELY</text>`);
    cap(VW / 2, 508, 'prepared participants cannot decide alone — they wait for a dead referee');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: atomic across nodes, at a price ────────────────────────────── */
  coordinator({ mat: 'green', halo: true, sub: 'prepare → commit' });
  node(SHX[0], SHY, 'shard A', 'green', {});
  node(SHX[1], SHY, 'shard B', 'green', {});
  SHX.forEach((x) => {
    const e = edge([V(COORDX, COORDY + 52), V((COORDX + x) / 2, (COORDY + SHY) / 2), V(x, SHY - 36)], { arrow: true });
    guides.push(e.guide);
  });
  badges.push(region(118, 416, 884, 150, 'all-or-nothing across nodes', { r: 24 }));
  const tags = ['unanimous vote to commit', 'coordinator can block on crash', 'prefer co-location or sagas'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 452 + i * 42, t, { icon: 'check', w: 320 })));
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
  <svg class="scene scene--distributed-transactions" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Distributed transactions">
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
