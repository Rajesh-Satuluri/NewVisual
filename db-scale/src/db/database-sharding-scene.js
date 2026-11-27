/* database-sharding-scene.js — the "Database Sharding" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes/slabs with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'vertical' (one maxed-out DB), 'shard' (rows split across independent
   DBs), 'route' (a router hits one shard), 'crossshard' (scatter-gather across
   all shards), 'hotspot' (a skewed key overloads one shard), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* the four shards, spread across the lower-right field */
const SHARDS = [
  { x: 320, key: 'A–F' },
  { x: 520, key: 'G–M' },
  { x: 720, key: 'N–S' },
  { x: 920, key: 'T–Z' },
];
const SHARD_CY = 300, SHARD_RX = 72, SHARD_H = 62;

/* draw the shard row; opts: { hot: idx, ghostOthers, dim, labelState } */
function shardRow({ shadows, halos, solids, badges }, opts = {}) {
  return SHARDS.map((s, i) => {
    const hot = opts.hot === i;
    const ghost = opts.ghostOthers && opts.hot != null && opts.hot !== i;
    const mat = hot ? 'rose' : opts.mat || 'lilac';
    const c = isoCube(s.x, SHARD_CY, SHARD_RX, SHARD_H, mat, {
      icon: 'database', label: 'shard ' + (i + 1), sub: s.key, iconSize: 20,
      halo: hot, ghost,
    });
    shadows.push(c.shadow); if (hot) halos.push(c.halo); solids.push(c.g);
    badges.push(pill(s.x, SHARD_CY - SHARD_RX - 6, s.key, { cls: 'pill--sst' }));
    return c;
  });
}

export function renderDatabaseShardingScene(snap, opts = {}) {
  const view = snap.view || 'shard';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];
  const acc = { shadows, halos, solids, badges };

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  /* ── VERTICAL: one DB scaled to the ceiling ───────────────────────────── */
  if (view === 'vertical') {
    // clients on the left
    const clients = [150, 250, 350].map(y => isoCube(140, y, 44, 48, 'blue', { icon: 'app', label: 'App', iconSize: 18 }));
    clients.forEach(c => { shadows.push(c.shadow); solids.push(c.g); });

    const db = isoCube(560, 230, 128, 150, 'green', { icon: 'database', label: 'One DB', sub: 'scaled all the way up', halo: true, iconSize: 30 });
    shadows.push(db.shadow); halos.push(db.halo); solids.push(db.g);

    clients.forEach((c, i) => {
      const e = edge([V(c.verts.E.x - 2, c.front[1]), V((c.verts.E.x + db.verts.W.x) / 2, (c.front[1] + db.front[1]) / 2), V(db.verts.W.x - 6, db.verts.W.y + 8)], { arrow: true });
      guides.push(e.guide); if (i === 0) railIn = e.d;
    });

    badges.push(region(430, 70, 320, 70, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="590" y="112" text-anchor="middle">THE SCALE-UP WALL</text>`);
    ['CPU maxed', 'RAM maxed', '$$$ explodes'].forEach((t, i) => badges.push(pill(860, 170 + i * 48, t, { icon: 'alert', cls: 'pill--sst' })));
    badges.push(cap(560, db.base[1] + 18, 'one machine · one point of failure'));
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SHARD: rows split across four independent databases ───────────────── */
  if (view === 'shard') {
    shardRow(acc, {});
    badges.push(region(232, 210, 760, 196, '', { r: 24 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="238" text-anchor="middle">FOUR INDEPENDENT DATABASES</text>`);
    badges.push(pill(VW / 2, 470, 'rows split by shard key  ·  user_id', { icon: 'key', cls: 'pill--sst' }));
    badges.push(cap(VW / 2, 508, 'each shard = a full database holding 1/4 of the rows'));
    flows.push();
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ROUTE: a router hashes the key and hits exactly one shard ─────────── */
  if (view === 'route') {
    const cubes = shardRow(acc, {});
    // clients → router
    const client = isoCube(130, 300, 48, 54, 'blue', { icon: 'app', label: 'App', sub: 'user_id=8143', iconSize: 18 });
    shadows.push(client.shadow); solids.push(client.g);
    const router = isoCube(300, 470, 86, 54, 'amber', { icon: 'merge', label: 'router', sub: 'shard map', halo: true, iconSize: 20 });
    shadows.push(router.shadow); halos.push(router.halo); solids.push(router.g);
    const e0 = edge([V(client.verts.E.x - 2, client.front[1]), V(200, 420), V(router.verts.W.x - 6, router.verts.W.y + 6)], { arrow: true });
    guides.push(e0.guide); railIn = e0.d;
    // router → the owning shard (shard 2)
    const owner = cubes[1];
    const e1 = edge([V(router.verts.N.x + 10, router.verts.N.y), V(owner.base[0], 400), V(owner.base[0], owner.base[1] - 4)], { arrow: true });
    guides.push(e1.guide); railOut = e1.d;
    badges.push(pill(owner.base[0], SHARD_CY + SHARD_H + 44, 'hash(key) → shard 2', { icon: 'check', cls: 'pill--sst' }));
    badges.push(cap(300, router.base[1] + 16, 'one key · one shard · one hop'));
    flows.push({ id: 'in', kind: 'read', speed: 170, size: 5 }, { id: 'out', kind: 'write', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── CROSSSHARD: scatter to every shard, gather and merge ──────────────── */
  if (view === 'crossshard') {
    const cubes = shardRow(acc, { mat: 'slate' });
    const router = isoCube(VW / 2, 470, 92, 54, 'amber', { icon: 'merge', label: 'scatter / gather', iconSize: 20, halo: true });
    shadows.push(router.shadow); halos.push(router.halo); solids.push(router.g);
    // fan out to every shard
    cubes.forEach((c, i) => {
      const e = edge([V(router.verts.N.x, router.verts.N.y - 2), V(c.base[0], 410), V(c.base[0], c.base[1] - 4)], { arrow: true, dashed: true });
      guides.push(e.guide); if (i === 0) railOut = e.d;
    });
    badges.push(pill(VW / 2, 150, 'SELECT … across all users  ·  no single owner', { icon: 'search', cls: 'pill--sst' }));
    badges.push(cap(VW / 2, router.base[1] + 16, 'as slow as the slowest shard · then merge'));
    flows.push({ id: 'out', kind: 'read', speed: 200, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── HOTSPOT: a skewed key piles load on one shard ─────────────────────── */
  if (view === 'hotspot') {
    const cubes = shardRow(acc, { hot: 1, ghostOthers: true });
    // a thick flood of traffic onto the hot shard
    const hot = cubes[1];
    const e = edge([V(150, 160), V(360, 220), V(hot.base[0] - 10, hot.base[1] - SHARD_H - 10)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(pill(190, 140, 'celebrity key', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(pill(hot.base[0], SHARD_CY + SHARD_H + 44, 'HOT · overloaded', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(cap(VW / 2, 470, 'others idle while one shard melts → reshard to rebalance'));
    flows.push({ id: 'in', kind: 'write', speed: 240, size: 7 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: one logical DB over many shards behind a router ────────────── */
  const cubes = shardRow(acc, {});
  const client = isoCube(130, 250, 46, 50, 'blue', { icon: 'app', label: 'App', sub: 'one endpoint', iconSize: 18 });
  shadows.push(client.shadow); solids.push(client.g);
  const router = isoCube(300, 470, 86, 54, 'amber', { icon: 'merge', label: 'router', sub: 'shard map', halo: true, iconSize: 20 });
  shadows.push(router.shadow); halos.push(router.halo); solids.push(router.g);
  const e0 = edge([V(client.verts.E.x - 2, client.front[1]), V(210, 400), V(router.verts.W.x - 6, router.verts.W.y + 6)], { arrow: true });
  guides.push(e0.guide); railIn = e0.d;
  cubes.forEach((c, i) => {
    const e = edge([V(router.verts.N.x + 6, router.verts.N.y), V(c.base[0], 410), V(c.base[0], c.base[1] - 4)], { arrow: true, dashed: true });
    guides.push(e.guide); if (i === 0) railOut = e.d;
  });
  badges.push(region(232, 212, 760, 150, '', { r: 24 }));
  badges.push(`<text class="iso-region__t" x="${VW / 2}" y="198" text-anchor="middle">ONE LOGICAL DATABASE</text>`);
  ['scales out by adding machines', 'cost: cross-shard queries', 'cost: shard-key / rebalancing'].forEach((t, i) =>
    badges.push(pill(690, 452 + i * 42, t, { icon: i === 0 ? 'check' : 'alert', w: 300 })));
  flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'write', speed: 140, size: 5 });
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
  <svg class="scene scene--database-sharding" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Database sharding">
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
