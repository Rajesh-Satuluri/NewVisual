/* concurrency-lab-scene.js — the "Concurrency Lab" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'setup' (T1 & T2 target one row), 'anomaly' (interleaved lost
   update), 'locking' (T1 holds lock, T2 waits), 'deadlock' (wait-for cycle),
   'resolve' (abort victim, retry), 'recap' (summary). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderConcurrencyLabScene(snap, opts = {}) {
  const view = snap.view || 'setup';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a cube; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'app', label, sub: o.sub || '', iconSize: o.iconSize || 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  // a small flat op tile along a transaction lane
  const opTile = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 34, o.h || 20, mat, {
      icon: o.icon || '', label, iconSize: 13, ghost: !!o.ghost, halo: !!o.halo,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── SETUP: two transactions aim at one shared row ─────────────────────── */
  if (view === 'setup') {
    const t1x = 230, t2x = 810, ty = 180, rowx = VW / 2, rowy = 360;
    node(t1x, ty, 'T1', 'blue', { icon: 'sliders', sub: 'txn' });
    node(t2x, ty, 'T2', 'amber', { icon: 'sliders', sub: 'txn' });
    node(rowx, rowy, 'balance', 'slate', { icon: 'database', sub: '= 100', rx: 56, h: 46 });
    const e1 = edge([V(t1x + 20, ty + 40), V(t1x + 120, 300), V(rowx - 54, rowy - 20)], { arrow: true });
    const e2 = edge([V(t2x - 20, ty + 40), V(t2x - 120, 300), V(rowx + 54, rowy - 20)], { arrow: true });
    guides.push(e1.guide, e2.guide); railOut = e1.d;
    badges.push(pill(rowx, rowy + 86, 'one shared row · two writers', { icon: 'alert', cls: 'pill--sst' }));
    cap(VW / 2, 508, 'the database may interleave their steps in any order');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ANOMALY: two lanes, interleaved read/read/write/write → lost update ── */
  if (view === 'anomaly') {
    const laneY1 = 180, laneY2 = 330;
    const colX = [250, 430, 610, 790];
    // lane labels
    node(120, laneY1, 'T1', 'blue', { icon: 'sliders', rx: 40, h: 34 });
    node(120, laneY2, 'T2', 'amber', { icon: 'sliders', rx: 40, h: 34 });
    // interleave order shown by step numbers 1..4
    opTile(colX[0], laneY1, 'read 100', 'blue', { icon: 'search' });
    opTile(colX[1], laneY2, 'read 100', 'amber', { icon: 'search' });
    opTile(colX[2], laneY1, 'write 150', 'blue', { icon: 'wal' });
    opTile(colX[3], laneY2, 'write 150', 'rose', { icon: 'wal', halo: true });
    // sequence arrow weaving between lanes
    const weave = edge([V(colX[0], laneY1 + 24), V(colX[1], laneY2 - 24), V(colX[2], laneY1 + 24), V(colX[3], laneY2 - 24)], { dashed: true, r: 10 });
    guides.push(weave.guide);
    ['①', '②', '③', '④'].forEach((n, i) => {
      const lane = (i % 2 === 0) ? laneY1 : laneY2;
      badges.push(pill(colX[i], lane - 40, n + ' step', { cls: 'pill--sst' }));
    });
    // result
    node(940, 255, 'row', 'slate', { icon: 'database', sub: '= 150', rx: 48, h: 40 });
    badges.push(region(190, 398, 760, 86, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="436" text-anchor="middle">LOST UPDATE · EXPECTED 200 · GOT 150</text>`);
    cap(VW / 2, 508, 'T2 read before T1 wrote, so T2’s write clobbered T1’s');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LOCKING: T1 holds lock, T2 waits, then correct 200 ────────────────── */
  if (view === 'locking') {
    const laneY1 = 180, laneY2 = 330;
    const colX = [250, 430, 610, 790];
    node(120, laneY1, 'T1', 'blue', { icon: 'sliders', rx: 40, h: 34 });
    node(120, laneY2, 'T2', 'amber', { icon: 'sliders', rx: 40, h: 34 });
    opTile(colX[0], laneY1, 'lock+read', 'blue', { icon: 'key' });
    opTile(colX[1], laneY1, 'write 150', 'blue', { icon: 'wal' });
    opTile(colX[2], laneY1, 'commit', 'green', { icon: 'check' });
    // T2 waits then proceeds
    opTile(colX[0] + 90, laneY2, 'WAIT', 'slate', { icon: 'clock', ghost: true });
    opTile(colX[2], laneY2, 'read 150', 'amber', { icon: 'search' });
    opTile(colX[3], laneY2, 'write 200', 'green', { icon: 'wal', halo: true });
    const prog = edge([V(colX[2] + 20, laneY2), V(colX[3] - 20, laneY2)], { arrow: true });
    guides.push(prog.guide); railOut = prog.d;
    badges.push(pill(colX[1], laneY2 - 4, 'blocked on T1’s lock', { icon: 'key', cls: 'pill--sst' }));
    node(940, 255, 'row', 'green', { icon: 'database', sub: '= 200', rx: 48, h: 40, halo: true });
    badges.push(region(190, 398, 760, 86, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="436" text-anchor="middle">SERIALIZED BY THE LOCK · 200 ✓</text>`);
    cap(VW / 2, 508, 'T2 blocks until T1 commits, then reads the fresh 150');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DEADLOCK: wait-for cycle T1→B→T2→A→T1 ─────────────────────────────── */
  if (view === 'deadlock') {
    const t1 = { x: 260, y: 200 }, t2 = { x: 780, y: 200 };
    const rA = { x: 260, y: 400 }, rB = { x: 780, y: 400 };
    node(t1.x, t1.y, 'T1', 'blue', { icon: 'sliders' });
    node(t2.x, t2.y, 'T2', 'amber', { icon: 'sliders' });
    node(rA.x, rA.y, 'row A', 'slate', { icon: 'database', sub: 'locked by T1', rx: 50, h: 40 });
    node(rB.x, rB.y, 'row B', 'slate', { icon: 'database', sub: 'locked by T2', rx: 50, h: 40 });
    // holds (solid) : T1→A, T2→B
    const hA = edge([V(t1.x, t1.y + 42), V(rA.x, rA.y - 36)], { arrow: true });
    const hB = edge([V(t2.x, t2.y + 42), V(rB.x, rB.y - 36)], { arrow: true });
    // waits (dashed) : T1→B, T2→A — the cross that forms the cycle
    const wB = edge([V(t1.x + 44, t1.y + 20), V(rB.x - 54, rB.y - 24)], { arrow: true, dashed: true });
    const wA = edge([V(t2.x - 44, t2.y + 20), V(rA.x + 54, rA.y - 24)], { arrow: true, dashed: true });
    guides.push(hA.guide, hB.guide, wB.guide, wA.guide);
    badges.push(pill((t1.x + rA.x) / 2 - 70, 300, 'holds A', { icon: 'key', cls: 'pill--sst' }));
    badges.push(pill((t2.x + rB.x) / 2 + 70, 300, 'holds B', { icon: 'key', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, 250, 'waits ↔ waits', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(150, 470, 740, 70, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="508" text-anchor="middle">WAIT-FOR CYCLE · DEADLOCK · BOTH STUCK</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RESOLVE: detect cycle, abort victim T2, T1 commits, T2 retries ────── */
  if (view === 'resolve') {
    const t1 = { x: 260, y: 200 }, t2 = { x: 780, y: 200 };
    const rA = { x: 260, y: 400 }, rB = { x: 780, y: 400 };
    node(t1.x, t1.y, 'T1', 'green', { icon: 'check', sub: 'commits', halo: true });
    node(t2.x, t2.y, 'T2', 'rose', { icon: 'trash', sub: 'ABORT ↺', ghost: true });
    node(rA.x, rA.y, 'row A', 'green', { icon: 'database', sub: 'T1 → done', rx: 50, h: 40 });
    node(rB.x, rB.y, 'row B', 'slate', { icon: 'database', sub: 'freed → T1', rx: 50, h: 40 });
    // T1 now grabs both
    const g1 = edge([V(t1.x, t1.y + 42), V(rA.x, rA.y - 36)], { arrow: true });
    const g2 = edge([V(t1.x + 30, t1.y + 30), V(480, 330), V(rB.x - 54, rB.y - 28)], { arrow: true });
    guides.push(g1.guide, g2.guide); railOut = g2.d;
    badges.push(pill(VW / 2, 180, 'detector finds the cycle → pick a victim', { icon: 'search', cls: 'pill--sst' }));
    badges.push(pill(t2.x, t2.y + 92, 'rolled back, will retry', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(region(150, 470, 740, 70, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="508" text-anchor="middle">ABORT ONE · UNBLOCK THE REST · RETRY</text>`);
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP ─────────────────────────────────────────────────────────────── */
  const t1x = 260, t2x = 780, ty = 210;
  node(t1x, ty, 'T1', 'green', { icon: 'check', halo: true });
  node(t2x, ty, 'T2', 'green', { icon: 'check', halo: true });
  node(VW / 2, 360, 'row', 'green', { icon: 'database', sub: '= 200', rx: 54, h: 44 });
  badges.push(region(150, 150, 740, 150, 'isolation makes concurrency correct', { r: 24 }));
  const tags = ['lock or MVCC → safe order', 'locks can deadlock → detect + abort + retry', 'isolation level = safety vs throughput'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 452 + i * 42, t, { icon: 'check', w: 360 })));
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
  <svg class="scene scene--concurrency-lab" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Concurrency lab">
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
