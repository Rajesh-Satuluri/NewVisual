/* partial-failure-scene.js — the "Partial Failure" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs and
   labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'single' (one node, binary), 'partial' (one of five down), 'unknown'
   (crashed/slow/unreachable look alike), 'blast' (a stuck node cascades),
   'design' (contained by a breaker/bulkhead), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* five cluster nodes laid out across the middle band (own coordinate records) */
const NODES = [
  { x: 300, y: 196 }, { x: 540, y: 168 }, { x: 760, y: 210 },
  { x: 388, y: 350 }, { x: 648, y: 368 },
];

export function renderPartialFailureScene(snap, opts = {}) {
  const view = snap.view || 'single';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  /* ── SINGLE: one node, a binary on/off ─────────────────────────────────── */
  if (view === 'single') {
    const cx = 540, cy = 230;
    const node = isoCube(cx, cy, 86, 78, 'green', { icon: 'server', label: 'one machine', sub: 'up · serving', iconSize: 26, halo: true });
    shadows.push(node.shadow); halos.push(node.halo); solids.push(node.g);
    // a client calling it
    const cl = isoCube(150, 250, 46, 50, 'blue', { icon: 'app', label: 'client', iconSize: 18 });
    shadows.push(cl.shadow); solids.push(cl.g);
    const e = edge([V(cl.verts.E.x - 2, cl.front[1]), V((cl.verts.E.x + node.verts.W.x) / 2, (cl.front[1] + node.front[1]) / 2), V(node.verts.W.x - 4, node.verts.W.y + 8)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    badges.push(pill(cx, 92, 'two states, and only two', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(cx + 230, 196, 'UP', { icon: 'check', w: 96 }));
    badges.push(pill(cx + 230, 300, 'CRASHED', { icon: 'alert', w: 120 }));
    cap(cx, 440, 'your code never sees a machine that is half alive');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── all cluster views: draw the five nodes with per-view styling ──────── */
  const bad = 2;  // node index 3 (zero-based 2) is the troubled one
  const slowView = view === 'unknown' || view === 'blast';

  const cubes = NODES.map((p, i) => {
    let mat = 'green', icon = 'server', ghost = false, halo = false, sub = 'serving';
    if (i === bad) {
      if (view === 'partial' || view === 'recap') { mat = 'slate'; icon = 'trash'; ghost = true; sub = 'DOWN'; }
      else if (view === 'unknown') { mat = 'rose'; icon = 'alert'; sub = '? ? ?'; halo = true; }
      else if (view === 'blast') { mat = 'rose'; icon = 'clock'; sub = 'stuck'; halo = true; }
      else if (view === 'design') { mat = 'slate'; icon = 'trash'; ghost = true; sub = 'isolated'; }
    }
    const c = isoCube(p.x, p.y, 48, 44, mat, { icon, label: 'N' + (i + 1), sub, iconSize: 18, ghost, halo });
    shadows.push(c.shadow); if (halo) halos.push(c.halo); solids.push(c.g);
    return c;
  });

  /* ── PARTIAL: four up, one down ────────────────────────────────────────── */
  if (view === 'partial') {
    badges.push(pill(VW / 2, 92, '5-node cluster · one down', { icon: 'server', cls: 'pill--sst' }));
    const down = cubes[bad];
    badges.push(pill(down.top[0], down.verts.N.y - 24, 'node 3 crashed', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(150, 440, 740, 96, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="482" text-anchor="middle">NO GLOBAL ON/OFF · THE SYSTEM IS PARTLY UP</text>`);
    cap(VW / 2, 516, '“is the database up?” has no yes-or-no answer');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── UNKNOWN: the silence could mean three things ──────────────────────── */
  if (view === 'unknown') {
    badges.push(pill(VW / 2, 92, 'no reply from node 3', { icon: 'alert', cls: 'pill--sst' }));
    // a client probing the bad node, getting silence
    const cl = isoCube(150, 300, 44, 50, 'blue', { icon: 'app', label: 'client', iconSize: 18 });
    shadows.push(cl.shadow); solids.push(cl.g);
    const bc = cubes[bad];
    const e = edge([V(cl.verts.E.x - 2, cl.front[1]), V((cl.verts.E.x + bc.verts.W.x) / 2, 300), V(bc.verts.W.x - 4, bc.verts.S.y)], { arrow: true, dashed: true });
    guides.push(e.guide);
    badges.push(pill((cl.verts.E.x + bc.verts.W.x) / 2, 300, 'waiting…', { icon: 'clock', cls: 'pill--sst' }));
    // three indistinguishable explanations
    const causes = ['crashed — dead', 'slow — overloaded', 'unreachable — network'];
    causes.forEach((t, i) => badges.push(pill(300 + i * 240, 476, t, { icon: 'alert', w: 210 })));
    badges.push(region(180, 452, 684, 60, '', { r: 20 }));
    cap(VW / 2, 540, 'all three look identical from the outside: no answer');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── BLAST: callers block on the stuck node and cascade ────────────────── */
  if (view === 'blast') {
    badges.push(pill(VW / 2, 92, 'stuck node · callers pile up', { icon: 'clock', cls: 'pill--sst' }));
    const stuck = cubes[bad];
    // the two neighbours that call it are themselves dragged down (rose halo'd arrows)
    [0, 1, 4].forEach((i, k) => {
      const caller = cubes[i];
      const e = edge([V(caller.verts.S.x, caller.verts.S.y + 2), V((caller.top[0] + stuck.top[0]) / 2, stuck.verts.N.y - 40), V(stuck.verts.N.x, stuck.verts.N.y - 2)], { arrow: true, dashed: true });
      guides.push(e.guide);
      if (k === 0) railOut = e.d;
    });
    badges.push(pill(stuck.top[0], stuck.verts.N.y - 26, 'holds every caller', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(150, 440, 740, 96, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="482" text-anchor="middle">CASCADING FAILURE · BLAST RADIUS GROWS</text>`);
    cap(VW / 2, 516, 'blocked threads exhaust the healthy nodes too');
    flows.push({ id: 'out', kind: 'write', speed: 80, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DESIGN: the bad node walled off by a circuit breaker / bulkhead ───── */
  if (view === 'design') {
    badges.push(pill(VW / 2, 92, 'contained · the rest serve on', { icon: 'check', cls: 'pill--sst' }));
    const bc = cubes[bad];
    // a dashed bulkhead ring around the isolated node
    badges.push(region(bc.top[0] - 96, bc.verts.N.y - 30, 192, 150, '', { r: 22 }));
    badges.push(pill(bc.top[0], bc.verts.N.y - 48, 'circuit breaker OPEN', { icon: 'alert', cls: 'pill--sst' }));
    // a client whose traffic fails over to a healthy node, skipping the bad one
    const cl = isoCube(150, 300, 44, 50, 'blue', { icon: 'app', label: 'client', iconSize: 18 });
    shadows.push(cl.shadow); solids.push(cl.g);
    const safe = cubes[3];
    const e = edge([V(cl.verts.E.x - 2, cl.front[1]), V((cl.verts.E.x + safe.verts.W.x) / 2, 340), V(safe.verts.W.x - 4, safe.verts.S.y)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(pill((cl.verts.E.x + safe.verts.W.x) / 2, 340, 'failover', { icon: 'check', cls: 'pill--sst' }));
    const tags = ['timeout every call', 'retry (idempotent)', 'bulkhead + breaker', 'redundant replica'];
    tags.forEach((t, i) => badges.push(pill(i < 2 ? 250 : 800, 150 + (i % 2) * 44, t, { icon: 'check', w: 210 })));
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP ─────────────────────────────────────────────────────────────── */
  badges.push(pill(VW / 2, 92, 'the normal condition', { icon: 'check', cls: 'pill--sst' }));
  const down = cubes[bad];
  badges.push(pill(down.top[0], down.verts.N.y - 24, 'some subset always down', { icon: 'alert', cls: 'pill--sst' }));
  const tags = ['down', 'slow', 'unreachable'];
  tags.forEach((t, i) => badges.push(pill(300 + i * 240, 452, t, { icon: 'alert', w: 180 })));
  badges.push(pill(VW / 2, 512, 'bound the wait · isolate · keep a replica ready', { icon: 'check', cls: 'pill--sst' }));
  cap(VW / 2, 552, 'design every remote call to survive a missing answer');
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
  <svg class="scene scene--partial-failure" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Partial failure in a distributed system">
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
