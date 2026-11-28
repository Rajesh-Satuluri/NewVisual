/* asynchronous-replication-scene.js — the "Asynchronous Replication" scene, in
   the shared Designed-to-Scale isometric vocabulary: rounded iso cubes with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'flow' (ack first, replicate after), 'fast' (low-latency writes +
   read scaling), 'lag' (followers trail → stale reads), 'dataloss' (leader
   crash loses un-shipped writes), 'tradeoff' (fast vs lossy), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* fixed layout coordinates (kept in our own vars — cube returns have no .x/.y) */
const CLIX = 140, CLIY = 252;
const LEADX = 452, LEADY = 248, LEADRX = 74, LEADH = 66;
const REPX = 802, REPY = [160, 362], REPRX = 60, REPH = 54;

export function renderAsynchronousReplicationScene(snap, opts = {}) {
  const view = snap.view || 'flow';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  /* ── TRADE-OFF: two columns, no topology ───────────────────────────────── */
  if (view === 'tradeoff') {
    const col = (x, title, icon, mat, rows) => {
      badges.push(region(x, 96, 300, 404, '', { r: 22 }));
      badges.push(pill(x + 150, 116, title, { icon, w: 232 }));
      const head = isoCube(x + 150, 176, 60, 54, mat, { icon, iconSize: 22 });
      shadows.push(head.shadow); solids.push(head.g);
      rows.forEach((t, i) => badges.push(pill(x + 150, 300 + i * 46, t, { icon: t[0] === '+' ? 'check' : 'alert', w: 272 })));
    };
    col(110, 'What you gain', 'bolt', 'green', [
      '+ low, predictable write latency',
      '+ leader never waits on replicas',
      '+ a slow replica blocks nothing',
      '+ high write throughput',
    ]);
    col(630, 'What you risk', 'alert', 'amber', [
      '− followers serve stale reads',
      '− no read-your-writes on them',
      '− un-shipped writes lost on crash',
      '− RPO > 0 (a loss window)',
    ]);
    badges.push(pill(VW / 2, 542, 'the exact opposite corner from synchronous', { icon: 'gauge', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── all topology views: client → leader → two replicas ────────────────── */
  const dead = view === 'dataloss';
  const promoted = view === 'dataloss' ? 0 : -1;   // replica 0 is promoted

  const client = isoCube(CLIX, CLIY, 46, 52, 'blue', { icon: 'app', label: 'Client', iconSize: 18 });
  shadows.push(client.shadow); solids.push(client.g);

  const leader = isoCube(LEADX, LEADY, LEADRX, LEADH, dead ? 'slate' : 'amber', {
    icon: dead ? 'alert' : 'database', label: 'Leader',
    sub: dead ? 'CRASHED' : (view === 'lag' ? 'at v7' : 'takes writes'),
    iconSize: 22, halo: !dead, ghost: dead,
  });
  shadows.push(leader.shadow); if (!dead) halos.push(leader.halo); solids.push(leader.g);

  // leader version chip (lag / dataloss)
  if (view === 'lag' || view === 'dataloss') {
    const chip = isoTile(LEADX, LEADY - 2, 22, 'green', { halo: true });
    shadows.push(chip.shadow); halos.push(chip.halo); solids.push(chip.g);
  }

  const reps = REPY.map((ry, i) => {
    let mat = 'green', sub = 'copy', ghost = false, halo = false;
    if (view === 'lag') { mat = 'slate'; sub = i === 0 ? 'at v5 · stale' : 'at v5'; }
    if (dead) {
      if (i === promoted) { mat = 'amber'; sub = 'NEW leader · v5'; halo = true; }
      else { mat = 'slate'; sub = 'at v5'; }
    }
    const c = isoCube(REPX, ry, REPRX, REPH, mat, {
      icon: 'database', label: 'Replica ' + (i + 1), sub, iconSize: 18, ghost, halo,
    });
    shadows.push(c.shadow); if (halo) halos.push(c.halo); solids.push(c.g);
    return c;
  });

  // client → leader (the write)
  function writeRail() {
    const e = edge([
      V(client.verts.E.x - 2, client.front[1]),
      V((client.verts.E.x + leader.verts.W.x) / 2, (client.front[1] + leader.front[1]) / 2),
      V(leader.verts.W.x - 4, leader.front[1]),
    ], { arrow: true });
    guides.push(e.guide); return e.d;
  }
  // leader → replica i (background replication, dashed)
  function replRail(i, dashed = true) {
    const r = reps[i];
    const e = edge([
      V(leader.verts.E.x - 2, leader.front[1]),
      V((leader.verts.E.x + r.verts.W.x) / 2, (leader.front[1] + r.front[1]) / 2),
      V(r.verts.W.x - 4, r.front[1]),
    ], { arrow: true, dashed });
    guides.push(e.guide); return e.d;
  }
  // replica i → client (a read, dashed, arrow back toward client)
  function readRail(i) {
    const r = reps[i];
    const e = edge([
      V(r.verts.W.x - 4, r.front[1] + 6),
      V((client.verts.E.x + r.verts.W.x) / 2, r.front[1] + 70),
      V(client.verts.E.x - 2, client.front[1] + 8),
    ], { arrow: true, dashed: true });
    guides.push(e.guide); return e.d;
  }

  if (view === 'flow') {
    railOut = writeRail();
    replRail(0); replRail(1);
    badges.push(pill((CLIX + LEADX) / 2, 150, '1 · write', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(pill((CLIX + LEADX) / 2, CLIY + 92, '2 · OK (at once)', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill((LEADX + REPX) / 2, 150, '3 · replicate (background)', { icon: 'merge', cls: 'pill--sst' }));
    cap(VW / 2, 540, 'the ack (step 2) does not wait for step 3');
    flows.push({ id: 'out', kind: 'write', speed: 160, size: 6 });
  }

  else if (view === 'fast') {
    railOut = writeRail();
    replRail(0); replRail(1);
    // reads pulled from a replica
    railIn = readRail(1);
    badges.push(pill((CLIX + LEADX) / 2, 150, 'write acked at leader speed', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(pill(REPX, 470, 'replicas serve reads', { icon: 'search', cls: 'pill--sst' }));
    cap(VW / 2, 540, 'a slow or down replica never blocks a write');
    flows.push({ id: 'out', kind: 'write', speed: 180, size: 6 }, { id: 'in', kind: 'read', speed: 150, size: 5 });
  }

  else if (view === 'lag') {
    railOut = writeRail();
    replRail(0); replRail(1);
    badges.push(region(690, 248, 230, 210, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="805" y="300" text-anchor="middle">LAGGING</text>`);
    badges.push(pill(LEADX, 150, 'leader · v7', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(pill((LEADX + REPX) / 2, 150, 'behind by Δ', { icon: 'clock', cls: 'pill--sst' }));
    cap(VW / 2, 540, 'a read off a follower can miss your own just-made write');
    flows.push({ id: 'out', kind: 'write', speed: 140, size: 6 });
  }

  else if (view === 'dataloss') {
    // writes that never shipped, dying with the leader
    replRail(0, true); replRail(1, true);
    badges.push(pill(LEADX, 150, 'held v6 · v7 — never shipped', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(LEADX - 150, 318, 300, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${LEADX}" y="356" text-anchor="middle">v6 · v7  LOST</text>`);
    badges.push(cap(LEADX, 392, 'acked to the client, gone on failover'));
    badges.push(pill(REPX, 470, 'promoted — only has v5', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 540, 'acknowledged ≠ durable: RPO > 0');
  }

  else { // recap
    railOut = writeRail();
    replRail(0); replRail(1);
    railIn = readRail(1);
    const tags = ['ack now, ship later', 'fast + available', 'lag → stale reads', 'loss window on crash'];
    tags.forEach((t, i) => badges.push(pill(i < 2 ? 300 : VW / 2, i % 2 === 0 ? 470 : 512, t, { icon: i < 2 ? 'check' : 'alert', w: 236 })));
    flows.push({ id: 'out', kind: 'write', speed: 160, size: 6 }, { id: 'in', kind: 'read', speed: 150, size: 5 });
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
  <svg class="scene scene--asynchronous-replication" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Asynchronous replication">
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
