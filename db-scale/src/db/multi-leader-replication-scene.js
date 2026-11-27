/* multi-leader-replication-scene.js — the "Multi-Leader Replication" scene, in
   the shared Designed-to-Scale isometric vocabulary: rounded iso cubes with
   icon glyphs and labels, soft ground shadows, halos, pill badges, dashed
   logical regions, routed connectors with arrows, a faded iso grid, and
   particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'single' (one leader, far clients lag), 'multi' (a leader per region,
   cross-replicating), 'conflict' (two leaders, same key, two values), 'resolve'
   (reconcile to one value), 'tradeoff' (gain vs pay), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderMultiLeaderReplicationScene(snap, opts = {}) {
  const view = snap.view || 'multi';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  /* ── TRADEOFF: two columns, no map ─────────────────────────────────────── */
  if (view === 'tradeoff') {
    const col = (x, title, icon, mat, rows) => {
      badges.push(region(x, 96, 300, 404, '', { r: 22 }));
      badges.push(pill(x + 150, 116, title, { icon, w: 236 }));
      const head = isoCube(x + 150, 176, 60, 54, mat, { icon, iconSize: 22 });
      shadows.push(head.shadow); solids.push(head.g);
      rows.forEach((t, i) => badges.push(pill(x + 150, 300 + i * 46, t, { icon: t[0] === '+' ? 'check' : 'alert', w: 272 })));
    };
    col(110, 'What you gain', 'check', 'green', [
      '+ writes served locally, low latency',
      '+ survives a whole region going dark',
      '+ accepts writes while offline',
    ]);
    col(630, 'What you pay', 'alert', 'amber', [
      '− concurrent writes can conflict',
      '− must detect & resolve conflicts',
      '− only eventual consistency',
    ]);
    badges.push(pill(VW / 2, 542, 'great across regions — if conflicts are rare or mergeable', { icon: 'gauge', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── SINGLE: one leader, clients near & far ────────────────────────────── */
  if (view === 'single') {
    const LX = 560, LY = 210;
    const leader = isoCube(LX, LY, 92, 84, 'green', { icon: 'database', label: 'Leader', sub: 'sole writer', halo: true, iconSize: 22 });
    shadows.push(leader.shadow); halos.push(leader.halo); solids.push(leader.g);

    // a near client (left) and two far clients (right) that pay the round-trip
    const clients = [
      { x: 150, y: 150, tag: 'local', far: false },
      { x: 150, y: 330, tag: 'local', far: false },
      { x: 930, y: 180, tag: 'far · +180ms', far: true },
      { x: 930, y: 360, tag: 'far · +180ms', far: true },
    ];
    clients.forEach((c, i) => {
      const cl = isoCube(c.x, c.y, 42, 48, c.far ? 'rose' : 'blue', { icon: 'app', label: 'client', iconSize: 16 });
      shadows.push(cl.shadow); solids.push(cl.g);
      const fromRight = c.x > LX;
      const e = edge([
        fromRight ? V(cl.verts.W.x + 2, cl.front[1]) : V(cl.verts.E.x - 2, cl.front[1]),
        V((c.x + LX) / 2, (c.y + LY) / 2 + 10),
        fromRight ? V(leader.verts.E.x - 4, leader.verts.E.y + 6) : V(leader.verts.W.x + 4, leader.verts.W.y + 6),
      ], { arrow: true, dashed: c.far });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
      badges.push(pill(c.x, c.y + 52, c.tag, { icon: c.far ? 'clock' : 'check', cls: 'pill--sst' }));
    });
    badges.push(region(406, 96, 308, 70, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="560" y="138" text-anchor="middle">ONE WRITE PATH · BOTTLENECK · SPOF</text>`);
    cap(560, 476, 'every write funnels here — distance becomes latency');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── MULTI / CONFLICT / RESOLVE / RECAP: a ring of regional leaders ─────── */
  // three leaders, one per region, placed in a wide triangle
  const LEADERS = [
    { x: 250, y: 200, region: 'US' },
    { x: 790, y: 200, region: 'EU' },
    { x: 520, y: 428, region: 'ASIA' },
  ];

  if (view === 'multi' || view === 'recap') {
    const cubes = LEADERS.map((L, i) => {
      const c = isoCube(L.x, L.y, 72, 66, 'green', { icon: 'database', label: 'Leader', sub: L.region, halo: true, iconSize: 20 });
      shadows.push(c.shadow); halos.push(c.halo); solids.push(c.g);
      return c;
    });
    // cross-replication: dashed links between every pair of leaders
    const pairs = [[0, 1], [1, 2], [2, 0]];
    pairs.forEach(([a, b], i) => {
      const ca = cubes[a], cb = cubes[b];
      const e = edge([V(ca.top[0], ca.top[1] + 2), V((LEADERS[a].x + LEADERS[b].x) / 2, (LEADERS[a].y + LEADERS[b].y) / 2), V(cb.top[0], cb.top[1] + 2)], { arrow: true, dashed: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d;
    });
    if (view === 'multi') {
      // a local client writing into each leader
      LEADERS.forEach((L, i) => {
        const cx = L.x + (L.x < 520 ? -130 : L.x > 520 ? 130 : 0);
        const cy = L.y + (L.y > 300 ? 120 : -120);
        const cl = isoCube(cx, cy, 36, 40, 'blue', { icon: 'app', label: L.region + ' app', iconSize: 15 });
        shadows.push(cl.shadow); solids.push(cl.g);
        const c = cubes[i];
        const e = edge([V(cx, cy + 4), V((cx + L.x) / 2, (cy + L.y) / 2), V(c.top[0], c.top[1] + 2)], { arrow: true });
        guides.push(e.guide);
        if (i === 0) railOut = e.d;
      });
      badges.push(pill(VW / 2, 92, 'every region writes locally, replicates to the rest', { icon: 'check', cls: 'pill--sst' }));
      flows.push({ id: 'out', kind: 'write', speed: 150, size: 5 }, { id: 'in', kind: 'read', speed: 120, size: 5 });
    } else {
      badges.push(region(300, 92, 440, 56, '', { r: 20 }));
      badges.push(`<text class="iso-region__t" x="520" y="126" text-anchor="middle">WRITE ANYWHERE · REPLICATE ASYNC · RESOLVE</text>`);
      const tags = [
        { x: 200, t: 'write on any leader' },
        { x: 520, t: 'async cross-replication' },
        { x: 840, t: 'converge via resolution' },
      ];
      tags.forEach(g => badges.push(pill(g.x, 520, g.t, { icon: 'check', w: 268 })));
      flows.push({ id: 'in', kind: 'read', speed: 120, size: 5 });
    }
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── CONFLICT: two leaders take clashing writes to the same key ────────── */
  if (view === 'conflict') {
    const AX = 300, BX = 740, LY = 210;
    const la = isoCube(AX, LY, 80, 72, 'green', { icon: 'database', label: 'Leader US', iconSize: 20 });
    const lb = isoCube(BX, LY, 80, 72, 'green', { icon: 'database', label: 'Leader EU', iconSize: 20 });
    [la, lb].forEach(c => { shadows.push(c.shadow); solids.push(c.g); });

    // a client over each, writing a different value for the SAME key x
    const specs = [
      { cx: AX, cl: la, val: 'x = 1', clx: AX - 160, cly: 110 },
      { cx: BX, cl: lb, val: 'x = 2', clx: BX + 160, cly: 110 },
    ];
    specs.forEach((s, i) => {
      const cl = isoCube(s.clx, s.cly, 34, 38, 'blue', { icon: 'app', label: 'write', iconSize: 15 });
      shadows.push(cl.shadow); solids.push(cl.g);
      const e = edge([V(s.clx, s.cly + 4), V((s.clx + s.cx) / 2, (s.cly + LY) / 2), V(s.cl.top[0], s.cl.top[1] + 2)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
      // the stored value tile under each leader
      const vt = isoTile(s.cx, LY + 150, 46, 'rose', { h: 30, halo: true });
      shadows.push(vt.shadow); halos.push(vt.halo); solids.push(vt.g);
      badges.push(pill(s.cx, LY + 150, s.val, { icon: 'alert', cls: 'pill--sst' }));
    });
    // the clash in the middle
    const clash = edge([V(la.verts.E.x - 2, LY + 150), V(VW / 2, LY + 176), V(lb.verts.W.x + 2, LY + 150)], { dashed: true });
    guides.push(clash.guide);
    badges.push(region(380, 300, 280, 96, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="520" y="340" text-anchor="middle">CONFLICT</text>`);
    cap(520, 372, 'same key, two values, neither saw the other');
    badges.push(pill(VW / 2, 92, 'concurrent writes before replication catches up', { icon: 'alert', cls: 'pill--sst' }));
    flows.push({ id: 'out', kind: 'write', speed: 160, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RESOLVE: two values reconcile into one agreed result ──────────────── */
  if (view === 'resolve') {
    const leftV = isoCube(230, 180, 58, 50, 'rose', { icon: 'alert', label: 'x = 1', sub: 't = 5', iconSize: 18 });
    const rightV = isoCube(810, 180, 58, 50, 'rose', { icon: 'alert', label: 'x = 2', sub: 't = 7', iconSize: 18 });
    [leftV, rightV].forEach(c => { shadows.push(c.shadow); solids.push(c.g); });
    const resolver = isoCube(520, 300, 86, 78, 'green', { icon: 'merge', label: 'resolve', sub: 'last-write-wins', halo: true, iconSize: 22 });
    shadows.push(resolver.shadow); halos.push(resolver.halo); solids.push(resolver.g);
    // both values feed into the resolver
    const e1 = edge([V(leftV.verts.E.x - 2, leftV.front[1]), V(360, 290), V(resolver.verts.W.x + 2, resolver.verts.W.y + 4)], { arrow: true, dashed: true });
    const e2 = edge([V(rightV.verts.W.x + 2, rightV.front[1]), V(680, 290), V(resolver.verts.E.x - 2, resolver.verts.E.y + 4)], { arrow: true, dashed: true });
    guides.push(e1.guide, e2.guide); railIn = e1.d;
    // the agreed output below
    const out = isoTile(520, 452, 54, 'green', { h: 34, halo: true });
    shadows.push(out.shadow); halos.push(out.halo); solids.push(out.g);
    const oe = edge([V(resolver.base[0], resolver.base[1] - 4), V(520, 430), V(out.top[0], out.top[1] - 2)], { arrow: true });
    guides.push(oe.guide); railOut = oe.d;
    badges.push(pill(520, 452, 'x = 2  agreed everywhere', { icon: 'check', cls: 'pill--sst' }));
    // strategy menu on the right
    const strat = ['last-write-wins (timestamp)', 'version vectors', 'CRDTs (auto-merge)', 'app-defined merge'];
    strat.forEach((t, i) => badges.push(pill(878, 360 + i * 42, t, { icon: 'merge', w: 250 })));
    badges.push(pill(VW / 2, 92, 'pick a rule so every replica ends up the same', { icon: 'check', cls: 'pill--sst' }));
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  // fallback → multi
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
  <svg class="scene scene--multi-leader-replication" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Multi-leader replication">
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
