/* replication-lab-scene.js — the "Replication Lab" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'setup' (leader + 2 followers in sync), 'sync' (leader waits for an
   ack), 'async' (leader acks now, followers lag), 'failover' (leader dies, a
   follower is promoted), 'staleread' (lagging follower serves old value),
   'recap' (summary). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderReplicationLabScene(snap, opts = {}) {
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
  // a small flat op tile along a lane
  const opTile = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 34, o.h || 20, mat, {
      icon: o.icon || '', label, iconSize: 13, ghost: !!o.ghost, halo: !!o.halo,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // shared geometry for the cluster: client left, leader centre-top, followers below
  const cli = { x: 150, y: 250 };
  const leader = { x: 500, y: 200 };
  const f1 = { x: 820, y: 150 };
  const f2 = { x: 820, y: 370 };

  /* ── SETUP: leader streams its log to two followers ────────────────────── */
  if (view === 'setup') {
    node(cli.x, cli.y, 'client', 'blue', { icon: 'app', sub: 'reads + writes', rx: 42, h: 36 });
    node(leader.x, leader.y, 'leader', 'green', { icon: 'database', sub: 'x = 1', rx: 56, h: 46, halo: true });
    node(f1.x, f1.y, 'follower', 'slate', { icon: 'database', sub: 'x = 1', rx: 50, h: 40 });
    node(f2.x, f2.y, 'follower', 'slate', { icon: 'database', sub: 'x = 1', rx: 50, h: 40 });
    const w = edge([V(cli.x + 36, cli.y - 6), V(leader.x - 60, leader.y + 10)], { arrow: true });
    const s1 = edge([V(leader.x + 44, leader.y - 14), V(f1.x - 54, f1.y + 8)], { arrow: true });
    const s2 = edge([V(leader.x + 44, leader.y + 22), V(f2.x - 54, f2.y - 10)], { arrow: true });
    guides.push(w.guide, s1.guide, s2.guide); railIn = w.d; railOut = s1.d;
    badges.push(pill(leader.x, leader.y + 96, 'replication log → followers', { icon: 'scroll', cls: 'pill--sst' }));
    badges.push(pill(cli.x, cli.y + 74, 'writes → leader', { icon: 'wal', cls: 'pill--sst' }));
    cap(VW / 2, 508, 'all writes go to the leader; followers replay its log in order');
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SYNC: leader waits for a follower ack before committing ────────────── */
  if (view === 'sync') {
    node(cli.x, cli.y, 'client', 'blue', { icon: 'app', sub: 'waits…', rx: 42, h: 36 });
    node(leader.x, leader.y, 'leader', 'green', { icon: 'database', sub: 'x = 2', rx: 56, h: 46, halo: true });
    node(f1.x, f1.y, 'follower', 'green', { icon: 'check', sub: 'x = 2 ✓', rx: 50, h: 40, halo: true });
    node(f2.x, f2.y, 'follower', 'slate', { icon: 'database', sub: 'x = 2', rx: 50, h: 40 });
    const w = edge([V(cli.x + 36, cli.y - 6), V(leader.x - 60, leader.y + 10)], { arrow: true });
    const ship = edge([V(leader.x + 44, leader.y - 14), V(f1.x - 54, f1.y + 8)], { arrow: true });
    const ack = edge([V(f1.x - 40, f1.y + 24), V(650, 300), V(leader.x + 30, leader.y + 34)], { arrow: true, dashed: true });
    const ship2 = edge([V(leader.x + 44, leader.y + 22), V(f2.x - 54, f2.y - 10)], { arrow: true });
    guides.push(w.guide, ship.guide, ack.guide, ship2.guide); railIn = w.d; railOut = ship.d;
    badges.push(pill(655, 160, 'wait for durable ack', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(region(380, 440, 560, 70, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${A(660)}" y="478" text-anchor="middle">DURABLE ON 2 NODES · SAFE · SLOWER COMMIT</text>`);
    cap(VW / 2, 508, 'commit pays a round trip to the follower — zero loss on failover');
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ASYNC: leader acks immediately, followers lag behind ──────────────── */
  if (view === 'async') {
    node(cli.x, cli.y, 'client', 'green', { icon: 'check', sub: 'acked now', rx: 42, h: 36, halo: true });
    node(leader.x, leader.y, 'leader', 'green', { icon: 'database', sub: 'x = 3', rx: 56, h: 46, halo: true });
    node(f1.x, f1.y, 'follower', 'amber', { icon: 'clock', sub: 'x = 2 (lag)', rx: 50, h: 40 });
    node(f2.x, f2.y, 'follower', 'amber', { icon: 'clock', sub: 'x = 2 (lag)', rx: 50, h: 40 });
    const ack = edge([V(leader.x - 60, leader.y + 10), V(cli.x + 36, cli.y - 6)], { arrow: true });
    const s1 = edge([V(leader.x + 44, leader.y - 14), V(f1.x - 54, f1.y + 8)], { arrow: true, dashed: true });
    const s2 = edge([V(leader.x + 44, leader.y + 22), V(f2.x - 54, f2.y - 10)], { arrow: true, dashed: true });
    guides.push(ack.guide, s1.guide, s2.guide); railIn = s1.d; railOut = ack.d;
    badges.push(pill(cli.x + 60, cli.y - 70, 'commit before replicas catch up', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(pill(820, 265, 'replica lag ≈ 220 ms', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(region(690, 440, 300, 70, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${A(840)}" y="478" text-anchor="middle">FAST · STALE · TAIL AT RISK</text>`);
    cap(VW / 2, 508, 'followers trail the leader; a crash can lose the unreplicated tail');
    flows.push({ id: 'out', kind: 'write', speed: 110, size: 6 });
    flows.push({ id: 'in', kind: 'write', speed: 200, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── FAILOVER: leader dies, freshest follower is promoted ──────────────── */
  if (view === 'failover') {
    node(cli.x, cli.y, 'client', 'blue', { icon: 'app', sub: 'redirected', rx: 42, h: 36 });
    node(leader.x, leader.y, 'old leader', 'rose', { icon: 'alert', sub: 'DOWN', rx: 54, h: 44, ghost: true });
    node(f1.x, f1.y, 'new leader', 'green', { icon: 'check', sub: 'promoted', rx: 52, h: 42, halo: true });
    node(f2.x, f2.y, 'follower', 'slate', { icon: 'database', sub: 'follows f1', rx: 50, h: 40 });
    const dead = edge([V(cli.x + 36, cli.y - 10), V(leader.x - 60, leader.y + 4)], { arrow: true, dashed: true });
    const redir = edge([V(cli.x + 30, cli.y - 20), V(470, 110), V(f1.x - 54, f1.y - 6)], { arrow: true });
    const rep = edge([V(f1.x - 6, f1.y + 42), V(f2.x - 6, f2.y - 38)], { arrow: true });
    guides.push(dead.guide, redir.guide, rep.guide); railIn = redir.d; railOut = rep.d;
    badges.push(pill(leader.x - 10, leader.y + 92, 'leader failure detected', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(500, 110, 'elect freshest → promote → redirect', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(region(150, 460, 740, 70, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="498" text-anchor="middle">AVAILABILITY RESTORED · LAGGING ASYNC WRITES LOST</text>`);
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    flows.push({ id: 'out', kind: 'write', speed: 160, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── STALEREAD: lagging follower serves old value; fix = read from leader ─ */
  if (view === 'staleread') {
    node(cli.x, cli.y, 'client', 'blue', { icon: 'app', sub: 'wrote Ada', rx: 42, h: 36 });
    node(leader.x, leader.y, 'leader', 'green', { icon: 'database', sub: 'name = Ada', rx: 56, h: 46, halo: true });
    node(f1.x, f1.y, 'follower', 'rose', { icon: 'clock', sub: 'name = Ide', rx: 50, h: 40 });
    node(f2.x, f2.y, 'follower', 'slate', { icon: 'database', sub: 'name = Ada', rx: 50, h: 40 });
    // the write landed on the leader
    const w = edge([V(cli.x + 36, cli.y - 14), V(leader.x - 60, leader.y + 6)], { arrow: true });
    // stale read from the lagging follower
    const bad = edge([V(cli.x + 30, cli.y + 14), V(430, 420), V(f1.x - 54, f1.y + 24)], { arrow: true, dashed: true });
    // the fix: route the writer's own reads back to the leader
    const fix = edge([V(cli.x + 42, cli.y - 2), V(300, 200), V(leader.x - 52, leader.y - 18)], { arrow: true });
    guides.push(w.guide, bad.guide, fix.guide); railIn = w.d; railOut = fix.d;
    badges.push(pill(430, 448, 'stale read: old value', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(300, 158, 'read-your-writes → leader', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 508, 'route the writer’s own reads to the leader until the follower catches up');
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP ─────────────────────────────────────────────────────────────── */
  const lx = 300, fx1 = 740, fx2 = 740;
  node(lx, 250, 'leader', 'green', { icon: 'database', sub: 'orders writes', rx: 56, h: 46, halo: true });
  node(fx1, 180, 'follower', 'green', { icon: 'check', sub: 'replays log', rx: 48, h: 40 });
  node(fx2, 340, 'follower', 'green', { icon: 'check', sub: 'replays log', rx: 48, h: 40 });
  const r1 = edge([V(lx + 44, 236), V(fx1 - 52, 196)], { arrow: true });
  const r2 = edge([V(lx + 44, 272), V(fx2 - 52, 324)], { arrow: true });
  guides.push(r1.guide, r2.guide);
  badges.push(region(150, 120, 740, 150, 'one leader orders every write', { r: 24 }));
  const tags = ['sync = safe + slow · async = fast + stale', 'lag → stale reads, fixed by read-your-writes', 'failover promotes the freshest follower'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 440 + i * 42, t, { icon: 'check', w: 380 })));
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
  <svg class="scene scene--replication-lab" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Replication lab">
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
