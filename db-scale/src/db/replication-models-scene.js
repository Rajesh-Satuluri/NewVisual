/* replication-models-scene.js — the "Replication Models" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs and
   labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'single' (one copy, single point of failure), 'overview' (three
   topologies side by side), 'single-leader' (1 leader → followers),
   'multi-leader' (two leaders collide on a key), 'leaderless' (write/read
   quorum over equal replicas), 'recap' (the one axis). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const ROWY = 300;

export function renderReplicationModelsScene(snap, opts = {}) {
  const view = snap.view || 'overview';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a node; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'server', label, sub: o.sub || '', iconSize: o.iconSize || 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── SINGLE: one copy, a single point of failure ───────────────────────── */
  if (view === 'single') {
    const cx = VW / 2, cy = 272;
    node(cx, 120, 'clients', 'blue', { icon: 'app', rx: 44, h: 40, sub: 'all traffic' });
    node(cx, cy, 'DB', 'amber', { icon: 'database', rx: 54, h: 52, halo: true, sub: 'only copy' });
    const e = edge([V(cx, 158), V(cx, cy - 36)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(cx, cy + 108, 'single point of failure', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(300, 410, 440, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${cx}" y="448" text-anchor="middle">NO FAILOVER · NO READ SCALING</text>`);
    cap(cx, 522, 'lose this machine and the data is unreachable');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── OVERVIEW: three topologies across one axis ────────────────────────── */
  if (view === 'overview') {
    // single-leader cluster (left)
    node(190, 210, 'L', 'green', { rx: 34, h: 32, halo: true, sub: 'leader' });
    node(120, 330, 'f', 'slate', { rx: 28, h: 26, ghost: true });
    node(260, 330, 'f', 'slate', { rx: 28, h: 26, ghost: true });
    guides.push(edge([V(190, 244), V(120, 304)], { arrow: true }).guide);
    guides.push(edge([V(190, 244), V(260, 304)], { arrow: true }).guide);
    badges.push(pill(190, 150, '1 writer', { icon: 'check', cls: 'pill--sst' }));

    // multi-leader cluster (middle)
    node(470, 240, 'L', 'green', { rx: 32, h: 30, halo: true });
    node(610, 240, 'L', 'green', { rx: 32, h: 30, halo: true });
    guides.push(edge([V(502, 240), V(578, 240)], { arrow: true }).guide);
    node(540, 350, 'f', 'slate', { rx: 26, h: 24, ghost: true });
    badges.push(pill(540, 170, 'a few writers', { icon: 'merge', cls: 'pill--sst' }));

    // leaderless cluster (right)
    const ring = [[850, 220], [930, 290], [900, 380], [800, 380], [770, 290]];
    ring.forEach(([x, y]) => node(x, y, '', 'lilac', { rx: 24, h: 22 }));
    badges.push(pill(850, 160, 'any writer', { icon: 'globe', cls: 'pill--sst' }));

    badges.push(pill(190, 446, 'single-leader', { icon: 'check', w: 190 }));
    badges.push(pill(540, 446, 'multi-leader', { icon: 'merge', w: 190 }));
    badges.push(pill(850, 446, 'leaderless', { icon: 'globe', w: 190 }));
    // the axis beneath
    const ax = edge([V(140, 500), V(930, 500)], { arrow: true });
    guides.push(ax.guide);
    cap(190, 528, 'simpler · consistent');
    cap(850, 528, 'available · local');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SINGLE-LEADER: one leader streams to followers ────────────────────── */
  if (view === 'single-leader') {
    const lx = VW / 2, ly = 190;
    node(lx, 110, 'writes', 'blue', { icon: 'app', rx: 40, h: 36 });
    node(lx, ly + 40, 'leader', 'green', { rx: 50, h: 46, halo: true, icon: 'database', sub: 'accepts writes' });
    guides.push(edge([V(lx, 146), V(lx, ly)], { arrow: true }).guide);
    const fx = [230, 520, 810];
    fx.forEach((x, i) => {
      node(x, 420, 'follower ' + (i + 1), 'slate', { rx: 42, h: 38, sub: 'replays log', icon: 'layers' });
      const e = edge([V(lx, ly + 90), V((lx + x) / 2, 360), V(x, 384)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    badges.push(pill(lx, 290, 'replication log', { icon: 'listOrdered', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'one node orders every write → followers replay it → no conflicts');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── MULTI-LEADER: two leaders collide on one key ──────────────────────── */
  if (view === 'multi-leader') {
    const lx = 300, rx = 740, ny = 250;
    node(lx, 120, 'client A', 'blue', { icon: 'app', rx: 36, h: 32 });
    node(rx, 120, 'client B', 'blue', { icon: 'app', rx: 36, h: 32 });
    node(lx, ny, 'leader · west', 'green', { rx: 48, h: 44, halo: true, icon: 'database' });
    node(rx, ny, 'leader · east', 'green', { rx: 48, h: 44, halo: true, icon: 'database' });
    guides.push(edge([V(lx, 152), V(lx, ny - 36)], { arrow: true }).guide);
    guides.push(edge([V(rx, 152), V(rx, ny - 36)], { arrow: true }).guide);
    // cross-replication
    const xr = edge([V(lx + 52, ny), V(VW / 2, ny - 18), V(rx - 52, ny)], { arrow: true, dashed: true });
    guides.push(xr.guide);
    railOut = xr.d;
    badges.push(pill(lx, ny - 86, 'x = "red"', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(rx, ny - 86, 'x = "blue"', { icon: 'check', cls: 'pill--sst' }));
    badges.push(region(300, 374, 440, 96, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="414" text-anchor="middle">SAME KEY · TWO VALUES · WRITE CONFLICT</text>`);
    badges.push(pill(VW / 2, 500, 'resolve: last-write-wins · version vectors · merge', { icon: 'alert', cls: 'pill--sst' }));
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LEADERLESS: write quorum + read quorum over equal replicas ────────── */
  if (view === 'leaderless') {
    const X5 = [180, 370, 560, 750, 940];
    X5.forEach((x, i) => {
      const inW = i < 3;
      node(x, ROWY, 'R' + (i + 1), inW ? 'lilac' : 'slate',
        { halo: inW, ghost: !inW, sub: inW ? 'W set' : '' });
    });
    node(VW / 2, 120, 'client', 'blue', { icon: 'app', rx: 44, h: 40 });
    [0, 1, 2].forEach((i, k) => {
      const e = edge([V(VW / 2, 158), V((VW / 2 + X5[i]) / 2, 214), V(X5[i], ROWY - 30)], { arrow: true });
      guides.push(e.guide);
      if (k === 0) railOut = e.d;
    });
    badges.push(pill(VW / 2, 452, 'W + R > N  →  read set meets write set', { icon: 'check' }));
    badges.push(pill(300, 396, 'write to W', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(pill(760, 396, 'read from R', { icon: 'search', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'overlapping quorums guarantee a read sees the latest write');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the one axis, three homes ──────────────────────────────────── */
  node(200, ROWY, 'single', 'green', { rx: 48, h: 44, halo: true, icon: 'check', sub: '1 writer' });
  node(VW / 2, ROWY, 'multi', 'amber', { rx: 48, h: 44, halo: true, icon: 'merge', sub: 'few writers' });
  node(840, ROWY, 'leaderless', 'lilac', { rx: 48, h: 44, halo: true, icon: 'globe', sub: 'any writer' });
  const ax = edge([V(150, 404), V(900, 404)], { arrow: true });
  guides.push(ax.guide);
  badges.push(region(118, 150, 884, 96, 'who may accept a write?', { r: 24 }));
  cap(200, 440, 'consistent · simple');
  cap(840, 440, 'available · local');
  badges.push(pill(VW / 2, 496, 'then choose: synchronous (safe) vs asynchronous (fast)', { icon: 'clock', w: 300 }));
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
  <svg class="scene scene--replication-models" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Replication models">
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
