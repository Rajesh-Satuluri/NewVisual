/* transactions-at-scale-scene.js — the "Transactions at Scale" scene (DDIA
   ch.7), in the shared Designed-to-Scale isometric vocabulary: rounded iso
   cubes with icon glyphs and labels, soft ground shadows, halos, pill badges,
   dashed logical regions, routed connectors with arrows, a faded iso grid, and
   particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'anomaly' (two txns clobber one row), 'ladder' (four isolation
   levels), 'snapshot' (two frozen MVCC views), 'serializable' (serial / 2PL /
   SSI), 'distributed' (2PC across two shards), 'recap' (rising cost). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const ROWY = 300;

export function renderTransactionsAtScaleScene(snap, opts = {}) {
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
      icon: o.icon || 'app', label, sub: o.sub || '', iconSize: o.iconSize || 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── ANOMALY: two txns read 100, both write, one update is lost ────────── */
  if (view === 'anomaly') {
    const txA = 230, txB = 810, ry = 150, rowX = VW / 2, rowY = 330;
    node(txA, ry, 'Txn A', 'blue', { icon: 'app', sub: 'read 100' });
    node(txB, ry, 'Txn B', 'green', { icon: 'app', sub: 'read 100' });
    const row = isoTile(rowX, rowY, 86, 'amber', { h: 30 });
    shadows.push(row.shadow); solids.push(row.g);
    badges.push(pill(rowX, rowY - 2, 'balance = 100', { icon: 'database', cls: 'pill--sst' }));
    // both read the same row
    const ra = edge([V(txA, ry + 56), V(txA + 60, 240), V(rowX - 70, rowY - 14)], { arrow: true, dashed: true });
    const rb = edge([V(txB, ry + 56), V(txB - 60, 240), V(rowX + 70, rowY - 14)], { arrow: true, dashed: true });
    guides.push(ra.guide, rb.guide);
    // both write back 150
    const wa = edge([V(rowX - 40, rowY + 18), V(txA + 90, 430), V(txA + 20, 470)], { arrow: true });
    const wb = edge([V(rowX + 40, rowY + 18), V(txB - 90, 430), V(txB - 20, 470)], { arrow: true });
    guides.push(wa.guide); railOut = wb.d; guides.push(wb.guide);
    badges.push(pill(txA + 20, 492, 'write 150 ✓', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(txB - 20, 492, 'write 150 ✗ lost', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(150, 440, 740, 96, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="470" text-anchor="middle">LOST UPDATE · B OVERWRITES A, +50 VANISHES</text>`);
    cap(VW / 2, 560, 'both read 100, both added 50 — the result should be 200, not 150');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LADDER: four isolation levels as rising rungs ─────────────────────── */
  if (view === 'ladder') {
    const rungs = [
      { label: 'Read Uncommitted', sub: 'no guarantees', mat: 'rose', y: 420, blocks: 'dirty writes only' },
      { label: 'Read Committed', sub: 'no dirty reads', mat: 'amber', y: 350, blocks: '+ dirty reads' },
      { label: 'Snapshot', sub: 'stable read view', mat: 'blue', y: 280, blocks: '+ read skew' },
      { label: 'Serializable', sub: 'as if serial', mat: 'green', y: 210, blocks: '+ write skew · all' },
    ];
    rungs.forEach((r, i) => {
      const x = 240 + i * 190;
      node(x, r.y, r.label, r.mat, { icon: i === 3 ? 'check' : 'layers', sub: r.sub, halo: i === 3, rx: 70, h: 40 });
      badges.push(pill(x, r.y - 70, r.blocks, { icon: 'check', cls: 'pill--sst' }));
    });
    // a rising arrow along the rungs
    const e = edge([V(190, 450), V(200, 240), V(1010, 190)], { arrow: true, dashed: true });
    guides.push(e.guide);
    badges.push(pill(130, 250, 'stronger', { icon: 'chevron', cls: 'pill--sst' }));
    cap(VW / 2, 540, 'each rung forbids more anomalies — and costs more to enforce');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SNAPSHOT: two txns each with their own frozen MVCC view ────────────── */
  if (view === 'snapshot') {
    node(230, 150, 'Txn A', 'blue', { icon: 'app', sub: 'began @ t1' });
    node(810, 150, 'Txn B', 'green', { icon: 'app', sub: 'began @ t2' });
    // the MVCC version chain in the middle
    const vx = [430, 560, 690], vy = 330;
    const vlabels = ['v1 @t0', 'v2 @t1', 'v3 @t2'];
    vx.forEach((x, i) => {
      const t = isoTile(x, vy, 56, i === 2 ? 'lilac' : 'amber', { h: 26 });
      shadows.push(t.shadow); solids.push(t.g);
      badges.push(pill(x, vy - 2, vlabels[i], { cls: 'pill--sst' }));
    });
    badges.push(region(380, 288, 360, 92, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="560" y="316" text-anchor="middle">MVCC VERSION CHAIN</text>`);
    // A reads v2, B reads v3 — each sees its own snapshot
    const ea = edge([V(230, 206), V(300, 300), V(vx[1] - 50, vy - 10)], { arrow: true });
    const eb = edge([V(810, 206), V(740, 300), V(vx[2] + 50, vy - 10)], { arrow: true });
    guides.push(ea.guide, eb.guide);
    railOut = ea.d;
    badges.push(pill(360, 236, 'A reads v2 — frozen', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(760, 236, 'B reads v3 — frozen', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 470, 'readers never block writers — each txn sees the snapshot from its start');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SERIALIZABLE: three implementations side by side ───────────────────── */
  if (view === 'serializable') {
    const cols = [
      { x: 220, label: 'Serial', sub: 'one thread', mat: 'green', tag: 'in-RAM · simple', icon: 'listOrdered' },
      { x: VW / 2, label: '2PL', sub: 'locks', mat: 'amber', tag: 'blocks · deadlocks', icon: 'key' },
      { x: 820, label: 'SSI', sub: 'optimistic', mat: 'blue', tag: 'abort on conflict', icon: 'bolt' },
    ];
    cols.forEach((c) => {
      badges.push(region(c.x - 140, 150, 280, 300, '', { r: 20 }));
      node(c.x, 250, c.label, c.mat, { icon: c.icon, sub: c.sub, halo: true, rx: 60, h: 42 });
      badges.push(pill(c.x, 180, c.tag, { icon: 'check', cls: 'pill--sst' }));
    });
    badges.push(pill(cols[1].x, 490, 'all three ⇒ result = some one-at-a-time order', { icon: 'check' }));
    cap(VW / 2, 540, 'three different machines, one guarantee: serializable execution');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DISTRIBUTED: 2PC across two shards, coordinator holds the line ─────── */
  if (view === 'distributed') {
    const coord = VW / 2, cy = 140;
    node(coord, cy, 'coordinator', 'blue', { icon: 'app', sub: '2PC', rx: 56, h: 40 });
    const s1 = 250, s2 = 790, sy = 340;
    node(s1, sy, 'shard A', 'amber', { icon: 'database', sub: 'locked', halo: true });
    node(s2, sy, 'shard B', 'amber', { icon: 'database', sub: 'locked', halo: true });
    const e1 = edge([V(coord - 30, cy + 54), V(s1 + 40, 240), V(s1, sy - 30)], { arrow: true });
    const e2 = edge([V(coord + 30, cy + 54), V(s2 - 40, 240), V(s2, sy - 30)], { arrow: true });
    guides.push(e1.guide, e2.guide); railOut = e1.d;
    badges.push(pill(s1 - 10, 250, 'prepare → OK, hold locks', { icon: 'key', cls: 'pill--sst' }));
    badges.push(pill(s2 + 10, 250, 'prepare → OK, hold locks', { icon: 'key', cls: 'pill--sst' }));
    badges.push(region(150, 420, 740, 96, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="450" text-anchor="middle">BOTH BLOCK UNTIL THE COORDINATOR SAYS COMMIT</text>`);
    cap(VW / 2, 540, 'a txn across partitions = 2PC: locks held on every shard while it waits');
    flows.push({ id: 'out', kind: 'write', speed: 140, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: cost rising from weak → serializable → distributed ──────────── */
  node(190, 380, 'weak', 'rose', { icon: 'layers', sub: 'cheap, risky', rx: 60, h: 36 });
  node(430, 320, 'snapshot', 'amber', { icon: 'layers', sub: 'MVCC', rx: 60, h: 38 });
  node(660, 260, 'serializable', 'green', { icon: 'check', sub: 'airtight', halo: true, rx: 64, h: 40 });
  node(900, 190, '+ distributed', 'blue', { icon: 'globe', sub: '2PC · slow', rx: 66, h: 42 });
  const e = edge([V(190, 400), V(430, 342), V(660, 282), V(900, 212)], { arrow: true, dashed: true });
  guides.push(e.guide);
  badges.push(region(120, 440, 800, 110, 'know your isolation · keep txns single-partition', { r: 22 }));
  const tags = ['pick isolation deliberately', 'serializable only where it matters', 'avoid cross-partition txns'];
  tags.forEach((t, i) => badges.push(pill(300 + i * 230, 500, t, { icon: 'check', cls: 'pill--sst' })));
  cap(VW / 2, 572, 'correctness under concurrency is a budget — spend it where the data demands');
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
  <svg class="scene scene--transactions-at-scale" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Transactions at scale">
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
