/* interview-center-scene.js — the "Interview Center" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'overview' (the four areas), 'storage' (B+Tree vs LSM), 'query'
   (parse → optimize → execute), 'txn' (isolation + MVCC vs locking),
   'distributed' (replicate / partition / consensus), 'howto' (the four framing
   moves), 'recap' (summary). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderInterviewCenterScene(snap, opts = {}) {
  const view = snap.view || 'overview';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'app', label, sub: o.sub || '', iconSize: o.iconSize || 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  const opTile = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 34, o.h || 20, mat, {
      icon: o.icon || '', label, iconSize: 13, ghost: !!o.ghost, halo: !!o.halo,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── OVERVIEW: one interview, four areas it probes ─────────────────────── */
  if (view === 'overview') {
    const cx = VW / 2, cy = 170;
    node(cx, cy, 'interview', 'lilac', { icon: 'target', sub: 'db internals', rx: 58, h: 46 });
    const areas = [
      { x: 230, label: 'storage', mat: 'green', icon: 'database', sub: 'bytes + index' },
      { x: 423, label: 'query', mat: 'blue', icon: 'search', sub: 'plan + run' },
      { x: 616, label: 'transactions', mat: 'amber', icon: 'merge', sub: 'isolation' },
      { x: 809, label: 'distributed', mat: 'rose', icon: 'globe', sub: 'scale out' },
    ];
    const ay = 380;
    areas.forEach(a => {
      node(a.x, ay, a.label, a.mat, { icon: a.icon, sub: a.sub, rx: 50, h: 40 });
      const e = edge([V(cx, cy + 46), V(a.x, ay - 44)], { arrow: true, dashed: true });
      guides.push(e.guide);
    });
    badges.push(pill(cx, cy + 92, 'depth, not breadth — they drill one branch', { icon: 'chevron', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'name the workload first, then reason the branch');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── STORAGE: B+Tree (read-opt) vs LSM (write-opt), index the hot cols ─── */
  if (view === 'storage') {
    node(290, 230, 'B+Tree', 'blue', { icon: 'layers', sub: 'read-optimized', rx: 54, h: 44 });
    node(750, 230, 'LSM-tree', 'green', { icon: 'wal', sub: 'write-optimized', rx: 54, h: 44 });
    node(290, 380, 'in-place', 'slate', { icon: 'file', sub: 'random writes', rx: 44, h: 34 });
    node(750, 380, 'flush runs', 'slate', { icon: 'flush', sub: 'sequential', rx: 44, h: 34 });
    [[290], [750]].forEach(([x]) => { const e = edge([V(x, 274), V(x, 342)], { arrow: true }); guides.push(e.guide); });
    node(VW / 2, 300, 'index', 'amber', { icon: 'key', sub: 'hot columns', rx: 44, h: 36, halo: true });
    badges.push(pill(290, 160, 'range scans, point reads', { cls: 'pill--sst' }));
    badges.push(pill(750, 160, 'ingest-heavy, then compact', { cls: 'pill--sst' }));
    badges.push(region(150, 438, 740, 48, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="466" text-anchor="middle">INDEX THE COLUMNS THAT FILTER OR SORT — NOT EVERY ONE</text>`);
    cap(VW / 2, 505, 'write-optimized vs read-optimized — let the workload pick');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── QUERY: parse → optimize (stats) → execute; join by input shape ────── */
  if (view === 'query') {
    const laneY = 210;
    const stages = [
      { x: 210, label: 'parse', icon: 'scroll', mat: 'slate' },
      { x: 410, label: 'optimize', icon: 'gauge', mat: 'amber' },
      { x: 610, label: 'execute', icon: 'bolt', mat: 'green' },
    ];
    stages.forEach((s, i) => {
      node(s.x, laneY, s.label, s.mat, { icon: s.icon, rx: 46, h: 38 });
      if (i < stages.length - 1) { const e = edge([V(s.x + 46, laneY), V(stages[i + 1].x - 46, laneY)], { arrow: true }); guides.push(e.guide); railOut = railOut || e.d; }
    });
    node(880, laneY, 'rows', 'blue', { icon: 'listOrdered', rx: 42, h: 34 });
    const er = edge([V(656, laneY), V(838, laneY)], { arrow: true }); guides.push(er.guide);
    node(410, 350, 'stats', 'lilac', { icon: 'search', sub: 'cardinality', rx: 40, h: 32 });
    const es = edge([V(410, 318), V(410, laneY + 40)], { arrow: true, dashed: true }); guides.push(es.guide);
    const joins = ['nested loop', 'hash join', 'merge join'];
    joins.forEach((j, i) => opTile(300 + i * 160, 430, j, 'slate', { icon: 'merge' }));
    badges.push(pill(VW / 2, 480, 'pick the join by input shape + sortedness', { icon: 'merge', cls: 'pill--sst' }));
    cap(VW / 2, 508, 'read EXPLAIN: access method, join order, est vs actual rows');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── TXN: isolation levels (anomaly each allows) + MVCC vs locking ─────── */
  if (view === 'txn') {
    const levels = [
      { y: 170, label: 'Read Committed', sub: 'non-repeatable', mat: 'rose' },
      { y: 270, label: 'Repeatable Read', sub: 'phantoms', mat: 'amber' },
      { y: 370, label: 'Serializable', sub: 'none — safe', mat: 'green' },
    ];
    levels.forEach((l, i) => node(320, l.y, l.label, l.mat, { icon: 'merge', sub: l.sub, rx: 58, h: 34, halo: i === 2 }));
    badges.push(pill(320, 110, 'level → anomaly it still allows', { icon: 'alert', cls: 'pill--sst' }));
    node(720, 220, 'MVCC', 'blue', { icon: 'layers', sub: 'snapshot, no block', rx: 54, h: 42 });
    node(720, 380, 'locking', 'slate', { icon: 'key', sub: 'block → deadlock', rx: 54, h: 42 });
    badges.push(pill(720, 150, 'mechanism: versions vs locks', { icon: 'key', cls: 'pill--sst' }));
    cap(VW / 2, 480, 'name the anomaly, then the mechanism — level → anomaly → MVCC/lock');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DISTRIBUTED: replicate (HA) · partition (size) · consensus (quorum) ─ */
  if (view === 'distributed') {
    const cols = [
      { x: 230, label: 'replicate', sub: 'availability', icon: 'layers', mat: 'blue' },
      { x: 520, label: 'partition', sub: 'size', icon: 'grid', mat: 'amber' },
      { x: 810, label: 'consensus', sub: 'majority', icon: 'check', mat: 'green' },
    ];
    cols.forEach(c => {
      node(c.x, 220, c.label, c.mat, { icon: c.icon, sub: c.sub, rx: 52, h: 44 });
      [-70, 0, 70].forEach((dx, i) => opTile(c.x + dx, 370, '', 'slate', { icon: 'server', rx: 26, h: 18, halo: c.label === 'consensus' && i < 2 }));
    });
    badges.push(pill(230, 150, 'sync safe · async lags', { cls: 'pill--sst' }));
    badges.push(pill(520, 150, 'consistent hashing', { cls: 'pill--sst' }));
    badges.push(pill(810, 150, 'quorum ⌊n/2⌋+1', { cls: 'pill--sst' }));
    badges.push(region(150, 420, 740, 56, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="452" text-anchor="middle">CAP: UNDER A PARTITION, CHOOSE CONSISTENCY OR AVAILABILITY</text>`);
    cap(VW / 2, 505, 'watch for hot keys — a celebrity row defeats any sharding');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── HOWTO: restate → trade-offs → pick → justify ──────────────────────── */
  if (view === 'howto') {
    const steps = [
      { x: 200, label: 'restate', icon: 'scroll', mat: 'slate' },
      { x: 410, label: 'trade-offs', icon: 'scale', mat: 'amber' },
      { x: 620, label: 'pick', icon: 'target', mat: 'blue' },
      { x: 830, label: 'justify', icon: 'check', mat: 'green' },
    ];
    steps.forEach((s, i) => {
      node(s.x, 250, s.label, s.mat, { icon: s.icon, sub: 'move ' + (i + 1), rx: 48, h: 40, halo: i === 3 });
      if (i < steps.length - 1) { const e = edge([V(s.x + 48, 250), V(steps[i + 1].x - 48, 250)], { arrow: true }); guides.push(e.guide); railOut = railOut || e.d; }
    });
    badges.push(pill(VW / 2, 160, 'the STAR of system design', { icon: 'target', cls: 'pill--sst' }));
    badges.push(region(150, 330, 740, 60, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="364" text-anchor="middle">THINK OUT LOUD · STATE ASSUMPTIONS · DECIDE</text>`);
    cap(VW / 2, 440, 'memorize the four moves, not the answers');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP ─────────────────────────────────────────────────────────────── */
  const areas = [
    { x: 230, label: 'storage', mat: 'green', icon: 'database' },
    { x: 423, label: 'query', mat: 'blue', icon: 'search' },
    { x: 616, label: 'txn', mat: 'amber', icon: 'merge' },
    { x: 809, label: 'distributed', mat: 'rose', icon: 'globe' },
  ];
  areas.forEach(a => node(a.x, 250, a.label, a.mat, { icon: a.icon, sub: 'trade-off', rx: 50, h: 40, halo: true }));
  badges.push(region(150, 150, 740, 170, 'four areas, one trade-off each', { r: 24 }));
  badges.push(pill(VW / 2, 420, 'restate → trade-offs → pick → justify', { icon: 'target', w: 420 }));
  badges.push(pill(VW / 2, 464, 'mechanism, then cost, then workload', { icon: 'check', w: 380 }));
  cap(VW / 2, 508, 'walk in with the map — steer the conversation');
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
  <svg class="scene scene--interview-center" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Interview center">
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
