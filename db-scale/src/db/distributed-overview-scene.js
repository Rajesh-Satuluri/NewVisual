/* distributed-overview-scene.js — the "Distributed DB" section-overview scene,
   in the shared Designed-to-Scale isometric vocabulary: rounded iso cubes with
   icon glyphs and labels, soft ground shadows, halos, pill badges, dashed
   logical regions, routed connectors with arrows, a faded iso grid, particle
   rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'single' (one bounded node), 'cluster' (many nodes, one logical DB),
   'scale' (add nodes → throughput), 'fault' (a node dies, replicas serve),
   'tradeoff' (what you gain vs pay), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a cluster node = a small server cube */
function node(cx, cy, mat, label, sub, opts = {}) {
  return isoCube(cx, cy, 46, 50, mat, { icon: 'server', label, sub, iconSize: 18, ...opts });
}

/* a horizontal capacity / throughput bar made of filled + empty cells */
function bar(cx, y, cells, filled, label) {
  const cw = 26, gap = 5, n = cells, w = n * cw + (n - 1) * gap;
  const x0 = cx - w / 2;
  let s = '';
  for (let i = 0; i < n; i++) {
    const on = i < filled;
    s += `<rect x="${A(x0 + i * (cw + gap))}" y="${A(y)}" width="${cw}" height="18" rx="4"
      fill="${on ? '#6b4fbb' : 'none'}" stroke="${on ? '#6b4fbb' : '#b5bfcc'}" stroke-width="1.5" opacity="${on ? 0.85 : 0.6}"/>`;
  }
  if (label) s += `<text class="sst-cap" x="${A(cx)}" y="${A(y + 40)}" text-anchor="middle">${esc(label)}</text>`;
  return s;
}

export function renderDistributedOverviewScene(snap, opts = {}) {
  const view = snap.view || 'cluster';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  /* ── TRADE-OFF: two columns, no cluster ───────────────────────────────── */
  if (view === 'tradeoff') {
    const col = (x, title, icon, mat, rows) => {
      badges.push(region(x, 96, 300, 400, '', { r: 22 }));
      badges.push(pill(x + 150, 116, title, { icon, w: 232 }));
      const head = node(x + 150, 176, mat, '', '', { iconSize: 20 });
      shadows.push(head.shadow); solids.push(head.g);
      rows.forEach((t, i) => badges.push(pill(x + 150, 298 + i * 46, t, { icon: t[0] === '+' ? 'check' : 'alert', w: 270 })));
    };
    col(110, 'What you gain', 'check', 'green', [
      '+ scale past one machine',
      '+ survive node failure',
      '+ data close to users',
      '+ throughput grows with nodes',
    ]);
    col(630, 'What you pay', 'alert', 'rose', [
      '− network coordination',
      '− consistency is now a choice',
      '− partial failure is normal',
      '− far harder to operate',
    ]);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── client on the left (all cluster views) ───────────────────────────── */
  const client = isoCube(140, 250, 48, 56, 'blue', { icon: 'app', label: 'Clients', sub: 'one endpoint', iconSize: 22 });
  shadows.push(client.shadow); solids.push(client.g);

  /* ── SINGLE: one bounded node ─────────────────────────────────────────── */
  if (view === 'single') {
    const only = isoCube(560, 250, 104, 110, 'green', { icon: 'server', label: 'One node', sub: 'the whole DB', halo: true });
    shadows.push(only.shadow); halos.push(only.halo); solids.push(only.g);
    const e = edge([V(client.verts.E.x - 2, client.front[1]), V((client.verts.E.x + only.verts.W.x) / 2, 250), V(only.verts.W.x - 6, only.verts.W.y + 10)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    overlays.push(bar(560, 430, 6, 5, 'CPU · RAM · disk near the ceiling'));
    badges.push(pill(820, 180, 'single point of failure', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(430, 150, 260, 300, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="560" y="178" text-anchor="middle">ONE MACHINE · ONE CEILING</text>`);
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── the cluster (cluster / scale / fault / recap) ────────────────────── */
  // partition colours — each node owns a different slice
  const MATS = ['green', 'amber', 'lilac', 'rose', 'blue', 'slate'];
  // node layout: a staggered cluster
  const base = [
    { x: 470, y: 196 }, { x: 648, y: 222 }, { x: 812, y: 268 },
    { x: 556, y: 320 }, { x: 730, y: 352 },
  ];
  let layout = base;
  let dead = -1;
  if (view === 'scale') layout = base.concat([{ x: 612, y: 430 }, { x: 806, y: 452 }]); // +2 nodes
  if (view === 'fault') dead = 1;

  const nodes = layout.map((p, i) => {
    const ghost = i === dead;
    const n = node(p.x, p.y, ghost ? 'slate' : MATS[i % MATS.length],
      ghost ? 'down' : 'node ' + (i + 1),
      ghost ? 'unreachable' : 'P' + (i + 1) + (view === 'recap' || view === 'cluster' || view === 'fault' ? ' + replica' : ''),
      { ghost });
    shadows.push(n.shadow); solids.push(n.g);
    return n;
  });

  // a dashed region enclosing the cluster = ONE logical DB
  badges.push(region(406, 150, 470, view === 'scale' ? 360 : 268, '', { r: 24 }));
  badges.push(pill(640, 176, 'ONE LOGICAL DATABASE', { icon: 'database', w: 280 }));

  // client → cluster (into the first live node)
  const entry = nodes[0];
  const ein = edge([V(client.verts.E.x - 2, client.front[1]), V((client.verts.E.x + entry.verts.W.x) / 2, 250), V(entry.verts.W.x - 6, entry.verts.W.y + 8)], { arrow: true });
  guides.push(ein.guide); railIn = ein.d;
  flows.push({ id: 'in', kind: 'read', speed: 160, size: 5 });

  if (view === 'cluster') {
    badges.push(cap(640, 470, 'data PARTITIONED for capacity · REPLICATED for durability'));
    badges.push(pill(300, 150, 'partition + replicate', { icon: 'layers', cls: 'pill--sst' }));
    flows.push({ id: 'in', kind: 'write', speed: 200, size: 5 });
  }

  if (view === 'scale') {
    overlays.push(bar(300, 470, 7, 6, 'throughput grows with nodes'));
    badges.push(pill(300, 150, '+ 2 nodes added', { icon: 'check', cls: 'pill--sst' }));
    badges.push(cap(640, 530, 'horizontal scale — add machines, not a bigger one'));
  }

  if (view === 'fault') {
    // reroute from the dead node to a live replica
    const victim = nodes[dead], repl = nodes[4];
    const rr = edge([V(victim.base[0], victim.base[1] - 6), V((victim.base[0] + repl.top[0]) / 2, 420), V(repl.top[0], repl.top[1] + 2)], { arrow: true, dashed: true });
    guides.push(rr.guide); railOut = rr.d;
    badges.push(pill(victim.top[0], victim.top[1] - 70, 'node down', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(300, 150, 'served from a replica', { icon: 'check', cls: 'pill--sst' }));
    badges.push(cap(640, 500, 'no single point of failure — the cluster keeps answering'));
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
  }

  if (view === 'recap') {
    const tags = ['partition → scale', 'replicate → availability', 'coordinate → consistency', 'the price → complexity'];
    tags.forEach((t, i) => badges.push(pill(180, 300 + i * 52, t, { icon: 'check', w: 230 })));
    badges.push(cap(640, 470, 'one logical DB, many machines'));
  }

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
  <svg class="scene scene--distributed-overview" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Distributed database overview">
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
