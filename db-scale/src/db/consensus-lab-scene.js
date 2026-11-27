/* consensus-lab-scene.js — the "Consensus Lab" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'setup' (five followers, no leader), 'election' (candidate wins a
   majority), 'replicate' (leader commits at a majority of acks), 'crash'
   (minority down, commits continue), 'splitvote' (split vote → retry),
   'recap' (summary). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderConsensusLabScene(snap, opts = {}) {
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
      icon: o.icon || 'server', label, sub: o.sub || '', iconSize: o.iconSize || 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  // a small flat op tile
  const opTile = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 34, o.h || 20, mat, {
      icon: o.icon || '', label, iconSize: 13, ghost: !!o.ghost, halo: !!o.halo,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // five node positions in a wide ring around (cx, cy)
  const ring5 = (cx, cy, rx, ry) => {
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * (2 * Math.PI / 5);
      pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
    }
    return pts; // [top, upper-right, lower-right, lower-left, upper-left]
  };

  /* ── SETUP: five followers, term 1, no leader ──────────────────────────── */
  if (view === 'setup') {
    const p = ring5(VW / 2, 320, 300, 150);
    p.forEach((n, i) => node(n.x, n.y, 'N' + (i + 1), 'blue', { icon: 'server', sub: 'follower' }));
    badges.push(pill(VW / 2, 320, 'term 1 · no leader', { icon: 'target', cls: 'pill--sst' }));
    cap(VW / 2, 508, 'all nodes are followers — the cluster must elect one leader');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ELECTION: candidate requests votes, wins 3/5 ──────────────────────── */
  if (view === 'election') {
    const p = ring5(VW / 2, 320, 300, 150);
    const cand = 0;                       // top node is the candidate
    const yes = [0, 1, 4];                // candidate + two grant votes
    p.forEach((n, i) => {
      const isCand = i === cand;
      const granted = yes.includes(i);
      node(n.x, n.y, 'N' + (i + 1), isCand ? 'green' : granted ? 'green' : 'slate', {
        icon: isCand ? 'check' : granted ? 'check' : 'server',
        sub: isCand ? 'candidate' : granted ? 'voted' : 'no reply', halo: isCand,
      });
    });
    // RequestVote edges from candidate to the two granters
    [1, 4].forEach(i => {
      const e = edge([V(p[cand].x, p[cand].y + 30), V((p[cand].x + p[i].x) / 2, 300), V(p[i].x, p[i].y - 20)], { arrow: true, dashed: true });
      guides.push(e.guide); railOut = e.d;
    });
    badges.push(pill(VW / 2, 300, '3 / 5 votes → majority', { icon: 'check', cls: 'pill--sst' }));
    badges.push(region(150, 470, 740, 66, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="507" text-anchor="middle">TERM 2 · ELECTED LEADER BY MAJORITY</text>`);
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── REPLICATE: leader appends, 3/5 ack → committed ────────────────────── */
  if (view === 'replicate') {
    const leadX = 200, leadY = 310;
    node(leadX, leadY, 'leader', 'green', { icon: 'check', sub: 'term 2', rx: 52, h: 46, halo: true });
    const fy = [150, 250, 350, 450];
    const fx = 760;
    const acked = [true, true, true, false]; // majority (leader + 3) → committed
    fy.forEach((y, i) => {
      node(fx, y, 'N' + (i + 2), acked[i] ? 'green' : 'blue', {
        icon: acked[i] ? 'check' : 'server', sub: acked[i] ? 'ack' : 'lagging',
        rx: 40, h: 34,
      });
      const e = edge([V(leadX + 44, leadY - 10 + (i - 1.5) * 12), V(500, y), V(fx - 44, y)], { arrow: true });
      guides.push(e.guide); if (i === 0) railOut = e.d;
    });
    badges.push(pill(leadX, leadY + 92, 'set x = 7 appended', { icon: 'wal', cls: 'pill--sst' }));
    badges.push(region(150, 478, 740, 60, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="512" text-anchor="middle">3 / 5 PERSISTED → ENTRY COMMITTED</text>`);
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── CRASH: one follower down, majority still holds ────────────────────── */
  if (view === 'crash') {
    const leadX = 200, leadY = 310;
    node(leadX, leadY, 'leader', 'green', { icon: 'check', sub: 'term 2', rx: 52, h: 46, halo: true });
    const fy = [150, 250, 350, 450];
    const fx = 760;
    const dead = 2;
    fy.forEach((y, i) => {
      if (i === dead) {
        node(fx, y, 'N' + (i + 2), 'rose', { icon: 'alert', sub: 'CRASHED', rx: 40, h: 34, ghost: true });
        return;
      }
      node(fx, y, 'N' + (i + 2), 'green', { icon: 'check', sub: 'ack', rx: 40, h: 34 });
      const e = edge([V(leadX + 44, leadY - 10 + (i - 1.5) * 12), V(500, y), V(fx - 44, y)], { arrow: true });
      guides.push(e.guide); if (i === 0) railOut = e.d;
    });
    badges.push(pill((leadX + fx) / 2, 290, '4 reachable · majority = 3', { icon: 'check', cls: 'pill--sst' }));
    badges.push(region(150, 478, 740, 60, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="512" text-anchor="middle">MINORITY DOWN · COMMITS CONTINUE</text>`);
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SPLITVOTE: two candidates split 2–2, retry in new term ────────────── */
  if (view === 'splitvote') {
    const p = ring5(VW / 2, 310, 300, 140);
    // two candidates (top-left-ish and right), each pulling one other vote
    const cA = 4, cB = 1;              // upper-left and upper-right candidates
    const roles = { [cA]: 'candidate A', [cB]: 'candidate B', 3: 'voted A', 2: 'voted B', 0: 'unreachable' };
    const mats = { [cA]: 'amber', [cB]: 'blue', 3: 'amber', 2: 'blue', 0: 'slate' };
    p.forEach((n, i) => {
      node(n.x, n.y, 'N' + (i + 1), mats[i] || 'slate', {
        icon: (i === cA || i === cB) ? 'target' : i === 0 ? 'clock' : 'check',
        sub: roles[i] || '', halo: (i === cA || i === cB),
      });
    });
    const eA = edge([V(p[cA].x, p[cA].y + 24), V(p[3].x, p[3].y - 20)], { arrow: true, dashed: true });
    const eB = edge([V(p[cB].x, p[cB].y + 24), V(p[2].x, p[2].y - 20)], { arrow: true, dashed: true });
    guides.push(eA.guide, eB.guide);
    badges.push(pill(VW / 2, 300, '2 – 2 · no majority', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(150, 472, 740, 64, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="508" text-anchor="middle">SPLIT VOTE → TIMEOUT → TERM++ → RETRY WINS</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP ─────────────────────────────────────────────────────────────── */
  const p = ring5(VW / 2, 300, 290, 120);
  p.forEach((n, i) => node(n.x, n.y, 'N' + (i + 1), i === 0 ? 'green' : 'green', {
    icon: i === 0 ? 'check' : 'server', sub: i === 0 ? 'leader' : 'follower', halo: i === 0,
  }));
  badges.push(region(150, 150, 740, 150, 'majority vote + majority commit = one agreed value', { r: 24 }));
  const tags = ['elect one leader per term by majority', 'commit an entry once a majority persists it', 'overlapping majorities survive a minority down'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 452 + i * 42, t, { icon: 'check', w: 380 })));
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
  <svg class="scene scene--consensus-lab" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Consensus lab">
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
