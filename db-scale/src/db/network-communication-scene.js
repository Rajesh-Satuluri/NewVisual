/* network-communication-scene.js — the "Network Communication" scene, in the
   shared Designed-to-Scale isometric vocabulary: rounded iso cubes with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'shared' (one process, instant call), 'rpc' (request + reply over the
   wire), 'unreliable' (lost / duplicated / reordered), 'timeout' (no reply —
   lost or slow?), 'idempotent' (retry keyed, applied once), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* the two machines live on a middle band with the network between them */
const NAX = 236, NBX = 804, NY = 262, NRX = 74, NBH = 66;

export function renderNetworkCommunicationScene(snap, opts = {}) {
  const view = snap.view || 'rpc';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;
  const reg = (x, y, t) => `<text class="iso-region__t" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  /* ── SHARED MEMORY: one process, a call is a jump ──────────────────────── */
  if (view === 'shared') {
    badges.push(region(300, 150, 440, 300, '', { r: 24 }));
    badges.push(pill(520, 150, 'ONE PROCESS · shared memory', { icon: 'server' }));
    const caller = isoCube(420, 238, 58, 58, 'blue', { icon: 'app', label: 'caller', iconSize: 20 });
    const callee = isoCube(624, 300, 58, 58, 'green', { icon: 'merge', label: 'callee', iconSize: 20 });
    [caller, callee].forEach(c => { shadows.push(c.shadow); solids.push(c.g); });
    const e = edge([
      V(caller.verts.E.x - 2, caller.front[1]),
      V((caller.verts.E.x + callee.verts.W.x) / 2, (caller.front[1] + callee.verts.W.y) / 2),
      V(callee.verts.W.x - 4, callee.verts.W.y + 8),
    ], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(pill(520, 398, 'function call · instant · reliable · ordered', { icon: 'check', cls: 'pill--sst' }));
    badges.push(cap(520, 478, 'one address space, one clock — a call cannot be lost or doubled'));
    flows.push({ id: 'in', kind: 'read', speed: 210, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── all remote views: two machines with the network between them ──────── */
  const a = isoCube(NAX, NY, NRX, NBH, 'blue', {
    icon: 'server', label: 'Node A', sub: 'caller', iconSize: 20,
    halo: view === 'timeout',
  });
  const b = isoCube(NBX, NY, NRX, NBH, 'green', {
    icon: 'server', label: 'Node B', sub: 'callee', iconSize: 20,
    halo: view === 'idempotent',
  });
  shadows.push(a.shadow); if (view === 'timeout') halos.push(a.halo); solids.push(a.g);
  shadows.push(b.shadow); if (view === 'idempotent') halos.push(b.halo); solids.push(b.g);

  const AX = a.verts.E.x, BX = b.verts.W.x;   // inner edges of the two nodes
  const MX = (AX + BX) / 2;

  /* ── RPC: a request out, a reply back ──────────────────────────────────── */
  if (view === 'rpc') {
    badges.push(region(316, 150, 408, 70, '', { r: 20 }));
    badges.push(pill(MX, 150, 'THE NETWORK', { icon: 'merge', cls: 'pill--sst' }));
    const req = edge([V(AX - 2, NY - 12), V(MX, NY - 44), V(BX + 2, NY - 12)], { arrow: true });
    guides.push(req.guide); railIn = req.d;
    const rep = edge([V(BX + 2, NY + 20), V(MX, NY + 52), V(AX - 2, NY + 20)], { arrow: true, dashed: true });
    guides.push(rep.guide); railOut = rep.d;
    badges.push(pill(MX, NY - 70, 'request → serialized args', { icon: 'search', cls: 'pill--sst' }));
    badges.push(pill(MX, NY + 78, '← reply', { icon: 'check', cls: 'pill--sst' }));
    badges.push(cap(MX, 494, 'it looks like a call, but it is two messages and a wait'));
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── UNRELIABLE: three lanes, three fates ──────────────────────────────── */
  if (view === 'unreliable') {
    const laneY = [168, 262, 356];
    // a faint wire per lane
    laneY.forEach(y => { const w = edge([V(AX - 2, y), V(BX + 2, y)], { dashed: true }); guides.push(w.guide); });

    // lane 0 — LOST: two tiles then nothing (dropped mid-wire)
    [AX + 70, AX + 150].forEach(x => { const t = isoTile(x, laneY[0], 18, 'slate', { h: 13 }); shadows.push(t.shadow); solids.push(t.g); });
    badges.push(reg(MX + 60, laneY[0] - 2, '✕  DROPPED'));
    badges.push(pill(AX + 40, laneY[0] - 44, 'lost', { icon: 'alert', cls: 'pill--sst' }));

    // lane 1 — DUPLICATED: a pair of identical tiles arriving together
    const d1 = isoTile(MX - 16, laneY[1], 18, 'amber', { h: 13 });
    const d2 = isoTile(MX + 20, laneY[1] + 10, 18, 'amber', { h: 13, halo: true });
    [d1, d2].forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    halos.push(d2.halo);
    badges.push(pill(AX + 40, laneY[1] - 40, 'duplicated', { icon: 'alert', cls: 'pill--sst' }));

    // lane 2 — REORDERED: msg #2 ahead of msg #1
    const r2 = isoTile(MX + 30, laneY[2], 18, 'rose', { h: 13 });
    const r1 = isoTile(MX - 60, laneY[2], 18, 'slate', { h: 13 });
    [r1, r2].forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    badges.push(reg(MX - 60, laneY[2] - 24, '#1'));
    badges.push(reg(MX + 30, laneY[2] - 24, '#2'));
    badges.push(pill(AX + 48, laneY[2] - 40, 'reordered', { icon: 'alert', cls: 'pill--sst' }));

    badges.push(pill(MX, 500, 'assume every message may vanish, double, or arrive out of order', { icon: 'alert' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── TIMEOUT: request out, silence, a guess ────────────────────────────── */
  if (view === 'timeout') {
    const req = edge([V(AX - 2, NY - 12), V(MX, NY - 42), V(BX + 2, NY - 12)], { arrow: true });
    guides.push(req.guide); railIn = req.d;
    // the reply that never (visibly) comes — a ghosted, question-marked return
    const rep = edge([V(BX + 2, NY + 20), V(MX, NY + 50), V(AX - 2, NY + 20)], { dashed: true });
    guides.push(rep.guide);
    badges.push(pill(MX, NY - 68, 'request sent — now waiting…', { icon: 'search', cls: 'pill--sst' }));
    badges.push(reg(MX, NY + 42, '?'));
    badges.push(pill(MX, NY + 86, 'lost?  or just slow?  — indistinguishable', { icon: 'alert' }));
    badges.push(pill(NAX, NY - 92, 'TIMEOUT fires → assume failure', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(cap(MX, 500, 'the only signal A ever gets is silence'));
    flows.push({ id: 'in', kind: 'read', speed: 90, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── IDEMPOTENT: retry keyed, applied once ─────────────────────────────── */
  if (view === 'idempotent') {
    const req1 = edge([V(AX - 2, NY - 14), V(MX, NY - 44), V(BX + 2, NY - 14)], { arrow: true });
    guides.push(req1.guide); railIn = req1.d;
    const req2 = edge([V(AX - 2, NY + 6), V(MX, NY - 20), V(BX + 2, NY + 6)], { arrow: true, dashed: true });
    guides.push(req2.guide);
    badges.push(pill(MX, NY - 72, 'retry · same key  id=42', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(region(NBX - 112, NY + 58, 224, 70, '', { r: 20 }));
    badges.push(reg(NBX, NY + 86, 'SEEN 42 → APPLY ONCE'));
    badges.push(pill(NAX, NY - 92, 'first send may have worked', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(cap(MX, 508, 'the receiver remembers keys, so a duplicate changes nothing'));
    flows.push({ id: 'in', kind: 'read', speed: 170, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: unreliable network + the three defenses ────────────────────── */
  badges.push(region(316, 150, 408, 150, '', { r: 22 }));
  badges.push(reg(MX, 182, 'UNRELIABLE · ASYNC NETWORK'));
  const wire = edge([V(AX - 2, NY), V(MX, NY - 24), V(BX + 2, NY)], { arrow: true, dashed: true });
  guides.push(wire.guide); railIn = wire.d;
  const tags = ['timeout — bound the wait', 'retry — resend on silence', 'idempotency — dedup duplicates'];
  tags.forEach((t, i) => badges.push(pill(MX, 400 + i * 44, t, { icon: 'check', w: 330 })));
  flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
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
  <svg class="scene scene--network-communication" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Network communication between nodes">
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
