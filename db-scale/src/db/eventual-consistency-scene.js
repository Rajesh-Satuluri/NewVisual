/* eventual-consistency-scene.js — the "Eventual Consistency" scene, in the
   shared Designed-to-Scale isometric vocabulary: rounded iso cubes with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'diverge' (one replica ahead, two behind), 'converge' (updates fan out
   to settle), 'propagate' (write hops replica→replica), 'resolve' (two writes
   race, last-write-wins), 'tradeoff' (partitioned replica still serves),
   'recap' (all converged on v2). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* three replica slots across the middle band */
const ROWY = 300;
const X3 = [240, 520, 800];

export function renderEventualConsistencyScene(snap, opts = {}) {
  const view = snap.view || 'diverge';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a replica; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 48, o.h || 44, mat, {
      icon: o.icon || 'database', label, sub: o.sub || '', iconSize: 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── DIVERGE: one replica has v2, two still on v1 ──────────────────────── */
  if (view === 'diverge') {
    const vals = ['v2', 'v1', 'v1'];
    const mats = ['green', 'slate', 'slate'];
    X3.forEach((x, i) => {
      node(x, ROWY, 'R' + (i + 1), mats[i], { halo: i === 0, sub: vals[i] });
      badges.push(pill(x, ROWY - 94, 'holds ' + vals[i], { icon: i === 0 ? 'check' : 'clock', cls: 'pill--sst' }));
    });
    // a write arrives at R1
    const e = edge([V(X3[0], 130), V(X3[0] - 30, 196), V(X3[0], ROWY - 32)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(X3[0], 112, 'write v2', { icon: 'bolt', cls: 'pill--sst' }));
    // a read lands on R2 and sees stale
    const rd = edge([V(X3[1], 130), V(X3[1] + 34, 196), V(X3[1], ROWY - 32)], { arrow: true, dashed: true });
    guides.push(rd.guide); railIn = rd.d;
    badges.push(pill(X3[1], 112, 'read → stale v1', { icon: 'alert', cls: 'pill--sst' }));
    cap(VW / 2, 480, 'the write returned success before the other replicas heard of it');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── CONVERGE: updates fan out, all heading to v2 ──────────────────────── */
  if (view === 'converge') {
    X3.forEach((x, i) => {
      node(x, ROWY, 'R' + (i + 1), i === 0 ? 'green' : 'blue', { halo: i === 0, sub: i === 0 ? 'v2' : 'v1 → v2' });
    });
    // R1 fans out to R2 and R3
    [1, 2].forEach((i, k) => {
      const e = edge([V(X3[0] + 36, ROWY - 20), V((X3[0] + X3[i]) / 2, ROWY - 64), V(X3[i] - 24, ROWY - 20)], { arrow: true });
      guides.push(e.guide);
      if (k === 0) railOut = e.d;
    });
    badges.push(region(150, 196, 740, 150, '', { r: 22 }));
    badges.push(pill(VW / 2, 214, 'no new writes → everyone converges to v2', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 470, '“eventual” promises the end state, not the exact moment it arrives');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PROPAGATE: write hops replica → replica ───────────────────────────── */
  if (view === 'propagate') {
    X3.forEach((x, i) => {
      node(x, ROWY, 'R' + (i + 1), 'green', { halo: i === 2, sub: 'v2' });
    });
    // chained hops R1 → R2 → R3
    const h1 = edge([V(X3[0] + 36, ROWY - 16), V((X3[0] + X3[1]) / 2, ROWY - 54), V(X3[1] - 30, ROWY - 16)], { arrow: true });
    const h2 = edge([V(X3[1] + 36, ROWY - 16), V((X3[1] + X3[2]) / 2, ROWY - 54), V(X3[2] - 30, ROWY - 16)], { arrow: true });
    guides.push(h1.guide); guides.push(h2.guide); railOut = h1.d;
    badges.push(pill((X3[0] + X3[1]) / 2, ROWY - 78, 'gossip', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(pill((X3[1] + X3[2]) / 2, ROWY - 78, 'gossip', { icon: 'merge', cls: 'pill--sst' }));
    cap(VW / 2, 470, 'each replica forwards the write on — the staleness window shrinks');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RESOLVE: two writes race, last-write-wins ─────────────────────────── */
  if (view === 'resolve') {
    node(X3[0], ROWY, 'R1', 'amber', { sub: 'vA @ t7' });
    node(X3[2], ROWY, 'R3', 'rose', { sub: 'vB @ t9' });
    node(X3[1], ROWY + 8, 'R2', 'lilac', { halo: true, sub: 'resolves' });
    // two concurrent writes
    const wa = edge([V(X3[0], 128), V(X3[0] - 28, 196), V(X3[0], ROWY - 32)], { arrow: true });
    const wb = edge([V(X3[2], 128), V(X3[2] + 28, 196), V(X3[2], ROWY - 32)], { arrow: true });
    guides.push(wa.guide); guides.push(wb.guide); railOut = wa.d;
    badges.push(pill(X3[0], 110, 'client A → vA', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(pill(X3[2], 110, 'client B → vB', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(region(150, 404, 740, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="442" text-anchor="middle">CONFLICT · LAST-WRITE-WINS · t9 &gt; t7 → vB</text>`);
    cap(VW / 2, 522, 'the higher timestamp wins on every replica — deterministically');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── TRADEOFF: partitioned replica still serves, a bit behind ──────────── */
  if (view === 'tradeoff') {
    node(X3[0], ROWY, 'R1', 'green', { sub: 'v2' });
    node(X3[1], ROWY, 'R2', 'green', { sub: 'v2' });
    node(X3[2], ROWY, 'R3', 'slate', { ghost: true, sub: 'v1 · behind' });
    // partition line before R3
    const bx = (X3[1] + X3[2]) / 2;
    const zig = [V(bx - 22, 150), V(bx + 20, 212), V(bx - 20, 274), V(bx + 22, 336), V(bx - 20, 398), V(bx + 20, 456)];
    const br = edge(zig, { dashed: true, r: 2 });
    guides.push(br.guide);
    badges.push(pill(bx, 118, 'partition', { icon: 'alert', cls: 'pill--sst' }));
    // reads still served on both sides
    const rd = edge([V(X3[2], 128), V(X3[2] + 30, 196), V(X3[2], ROWY - 32)], { arrow: true, dashed: true });
    guides.push(rd.guide); railIn = rd.d;
    badges.push(pill(X3[2], 110, 'read → still answers', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(X3[0] + 140, 178, 'available · in sync', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'high availability: the cut-off replica keeps serving — just slightly stale');
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: all converged on v2 ────────────────────────────────────────── */
  X3.forEach((x, i) => node(x, ROWY, 'R' + (i + 1), 'green', { halo: i === 1, sub: 'v2' }));
  badges.push(region(150, 200, 740, 150, 'one value · eventually', { r: 24 }));
  const tags = ['accept writes anywhere', 'propagate in the background', 'converge to one value'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 442 + i * 44, t, { icon: 'check', w: 320 })));
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
  <svg class="scene scene--eventual-consistency" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Eventual consistency">
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
