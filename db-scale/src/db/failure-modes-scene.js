/* failure-modes-scene.js — the "Nodes" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes with icon glyphs and labels, soft
   ground shadows, halos, pill badges, dashed logical regions, routed connectors
   with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'healthy' (five nodes serving), 'crash' (one fail-stops, traffic
   reroutes), 'slow' (one gray-fails and stalls), 'partition' (one side cut off
   by a network break), 'byzantine' (one lies among honest peers), 'recap'
   (the failure spectrum + the three defenses). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* five nodes on an ellipse — a little cluster you can point at */
const CC = { x: 560, y: 248 };
const RXR = 220, RYR = 116;
const NODES = [];
for (let i = 0; i < 5; i++) {
  const ang = (-90 + i * 72) * Math.PI / 180;
  NODES.push({ x: CC.x + RXR * Math.cos(ang), y: CC.y + RYR * Math.sin(ang) });
}

export function renderFailureModesScene(snap, opts = {}) {
  const view = snap.view || 'healthy';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // which node is the affected one, and (for partition) which side is cut off
  const bad = (view === 'crash' || view === 'slow' || view === 'byzantine') ? 2 : -1;
  const isolated = view === 'partition' ? [1, 2] : [];

  // render the five nodes with per-view styling
  const cubes = NODES.map((p, i) => {
    let mat = 'green', icon = 'server', ghost = false, halo = false, sub = '';
    if (i === bad) {
      if (view === 'crash') { mat = 'slate'; icon = 'trash'; ghost = true; sub = 'DOWN'; }
      else if (view === 'slow') { mat = 'amber'; icon = 'clock'; sub = 'stalling'; halo = true; }
      else if (view === 'byzantine') { mat = 'rose'; icon = 'alert'; sub = 'lying'; halo = true; }
    }
    if (isolated.includes(i)) { mat = 'lilac'; icon = 'globe'; sub = 'cut off'; }
    const c = isoCube(p.x, p.y, 50, 44, mat, {
      icon, label: 'N' + (i + 1), sub, iconSize: 18, ghost, halo,
    });
    shadows.push(c.shadow); if (halo) halos.push(c.halo); solids.push(c.g);
    return c;
  });

  const title = (t, ic) => badges.push(pill(CC.x, 92, t, { icon: ic, cls: 'pill--sst' }));

  // a client, shown only in the request-motion views
  function addClient(targetIdx, dashed) {
    const cl = isoCube(126, 300, 44, 50, 'blue', { icon: 'app', label: 'client', iconSize: 18 });
    shadows.push(cl.shadow); solids.push(cl.g);
    const t = cubes[targetIdx];
    const e = edge([
      V(cl.verts.E.x - 2, cl.front[1]),
      V((cl.verts.E.x + t.verts.W.x) / 2, (cl.front[1] + t.verts.S.y) / 2),
      V(t.verts.W.x - 4, t.verts.S.y),
    ], { arrow: true, dashed: !!dashed });
    guides.push(e.guide);
    return e.d;
  }

  /* ── HEALTHY ───────────────────────────────────────────────────────────── */
  if (view === 'healthy') {
    title('5-node cluster · all serving', 'server');
    railIn = addClient(4, false);
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    badges.push(pill(CC.x, 430, 'every node answers reads & writes', { icon: 'check', cls: 'pill--sst' }));
    cap(CC.x, 470, 'a node = CPU · RAM · disk · network, running one DB');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── CRASH ─────────────────────────────────────────────────────────────── */
  if (view === 'crash') {
    title('fail-stop · detected · rerouted', 'trash');
    railIn = addClient(4, false);
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    const down = cubes[bad];
    const dp = NODES[bad], np = NODES[1];
    badges.push(pill(down.top[0], down.verts.N.y - 26, 'heartbeat missed', { icon: 'alert', cls: 'pill--sst' }));
    // reroute: the down node's share hops to a healthy neighbour
    const nb = cubes[1];
    const rr = edge([V(down.verts.N.x, down.verts.N.y - 4), V((dp.x + np.x) / 2, dp.y - 70), V(nb.verts.S.x, nb.verts.S.y + 2)], { arrow: true, dashed: true });
    guides.push(rr.guide);
    badges.push(pill((dp.x + np.x) / 2, dp.y - 70, 'replica takes over', { icon: 'check', cls: 'pill--sst' }));
    cap(CC.x, 476, 'it does nothing further — and nothing wrong');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SLOW (gray failure) ───────────────────────────────────────────────── */
  if (view === 'slow') {
    title('still UP · still in rotation', 'clock');
    const slow = cubes[bad];
    railIn = addClient(bad, false);
    flows.push({ id: 'in', kind: 'read', speed: 70, size: 5 });   // slow particles
    badges.push(pill(slow.top[0], slow.verts.N.y - 26, 'accepts work, then stalls', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(region(740, 150, 258, 150, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="869" y="206" text-anchor="middle">TAIL LATENCY ↑</text>`);
    cap(869, 236, 'timeouts · retries · p99 blows up');
    cap(CC.x, 476, 'passes liveness checks, so it is never removed');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PARTITION ─────────────────────────────────────────────────────────── */
  if (view === 'partition') {
    // a jagged break down the middle, separating the right pair from the rest
    const bx = (NODES[0].x + NODES[1].x) / 2 + 6;
    const zig = [
      V(bx - 26, 110), V(bx + 20, 170), V(bx - 20, 230),
      V(bx + 24, 290), V(bx - 18, 350), V(bx + 22, 410), V(bx - 24, 470),
    ];
    const br = edge(zig, { dashed: true, r: 2 });
    guides.push(br.guide);
    badges.push(pill(CC.x, 92, 'NETWORK PARTITION · nodes up, link down', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(NODES[1].x + 30, NODES[1].y - 58, 'minority · 2 nodes', { icon: 'globe', cls: 'pill--sst' }));
    badges.push(pill(NODES[4].x - 20, NODES[4].y - 58, 'majority · 3 nodes', { icon: 'check', cls: 'pill--sst' }));
    cap(CC.x, 500, 'from the outside, unreachable looks exactly like crashed');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── BYZANTINE ─────────────────────────────────────────────────────────── */
  if (view === 'byzantine') {
    title('up · answering · WRONG', 'alert');
    cubes.forEach((c, i) => {
      if (i === bad) {
        badges.push(pill(c.top[0], c.verts.N.y - 26, 'says x = 9  ✗', { icon: 'alert', cls: 'pill--sst' }));
      } else {
        badges.push(cap(c.top[0], c.verts.N.y - 18, 'x = 7'));
      }
    });
    badges.push(region(360, 436, 400, 60, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="560" y="472" text-anchor="middle">4 AGREE · 1 LIES → MAJORITY VOTE WINS</text>`);
    cap(CC.x, 524, 'it does not stop — it lies; catch it with voting + checksums');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP ─────────────────────────────────────────────────────────────── */
  title('the failure spectrum', 'check');
  const tags = [
    { t: 'crash — easy', ic: 'trash' },
    { t: 'slow — sneaky', ic: 'clock' },
    { t: 'partition — ambiguous', ic: 'globe' },
    { t: 'Byzantine — expensive', ic: 'alert' },
  ];
  tags.forEach((g, i) => badges.push(pill(i < 2 ? 230 : 890, 160 + (i % 2) * 48, g.t, { icon: g.ic, w: 220 })));
  badges.push(pill(CC.x, 452, 'detection + replication + quorums', { icon: 'check', cls: 'pill--sst' }));
  cap(CC.x, 492, 'the three levers that turn node failures into non-events');
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
  <svg class="scene scene--failure-modes" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Node failure modes">
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
