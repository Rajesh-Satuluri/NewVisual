/* split-brain-scene.js — the "Split-Brain" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes with icon glyphs and labels, soft
   ground shadows, halos, pill badges, dashed logical regions, routed connectors
   with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'problem' (a split hides the leader; the far side elects its own),
   'diverge' (two leaders write conflicting values), 'quorum' (only the majority
   side can crown a leader), 'fencing' (the resource rejects a stale epoch),
   'tradeoff' (CP halts minority vs AP merges later), 'recap' (quorum + fencing
   = one brain). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const ROWY = 300;
/* five node slots across the band */
const X5 = [180, 370, 560, 750, 940];

export function renderSplitBrainScene(snap, opts = {}) {
  const view = snap.view || 'problem';

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

  // a jagged partition break through the middle band
  const splitAt = (bx, top = 130, bot = 440) => {
    const steps = 6, zig = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      zig.push(V(bx + (i % 2 ? 20 : -22), top + (bot - top) * t));
    }
    const br = edge(zig, { dashed: true, r: 2 });
    guides.push(br.guide);
  };

  /* ── PROBLEM: split hides the leader, far side crowns its own ──────────── */
  if (view === 'problem') {
    // left side: original leader + 1 follower; right side: 2 followers -> new leader
    node(200, ROWY, 'leader', 'amber', { sub: 'alive', halo: true, icon: 'target' });
    node(400, ROWY, 'F1', 'slate', { sub: 'with L' });
    node(640, ROWY, 'F2', 'slate', { sub: 'lost L' });
    node(880, ROWY, 'new L', 'rose', { sub: 'elected', halo: true, icon: 'target' });
    splitAt(VW / 2);
    badges.push(pill(VW / 2, 112, 'network partition', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(300, 206, 'original leader — never died', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(760, 206, 'can’t see L → elects one', { icon: 'alert', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'the leader is hidden, not dead — so the far side makes a second one');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DIVERGE: two leaders writing conflicting values ───────────────────── */
  if (view === 'diverge') {
    node(240, ROWY, 'leader A', 'amber', { sub: 'writes', halo: true, icon: 'target', rx: 50 });
    node(800, ROWY, 'leader B', 'rose', { sub: 'writes', halo: true, icon: 'target', rx: 50 });
    // each writes into its own store
    const sA = isoTile(240, 150, 58, 'blue', {});
    shadows.push(sA.shadow); solids.push(sA.g);
    const sB = isoTile(800, 150, 58, 'blue', {});
    shadows.push(sB.shadow); solids.push(sB.g);
    const eA = edge([V(240, ROWY - 34), V(240, 182)], { arrow: true });
    guides.push(eA.guide); railOut = eA.d;
    const eB = edge([V(800, ROWY - 34), V(800, 182)], { arrow: true });
    guides.push(eB.guide); railIn = eB.d;
    badges.push(pill(240, 120, 'balance = 90', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(800, 120, 'balance = 40', { icon: 'check', cls: 'pill--sst' }));
    splitAt(VW / 2, 110, 420);
    badges.push(pill(VW / 2, 96, 'partition', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(150, 404, 740, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="442" text-anchor="middle">TWO TRUTHS · DIVERGED · CANNOT RECONCILE</text>`);
    cap(VW / 2, 474, 'both commit — the single source of truth has forked');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── QUORUM: only the majority (3) side may crown a leader ──────────────── */
  if (view === 'quorum') {
    X5.forEach((x, i) => {
      const major = i <= 2;
      const isLeader = i === 0;
      node(x, ROWY, isLeader ? 'leader' : 'N' + (i + 1), isLeader ? 'green' : major ? 'green' : 'lilac',
        { halo: isLeader, ghost: !major, sub: major ? (isLeader ? 'quorum' : 'votes') : 'stands down',
          icon: isLeader ? 'target' : 'server' });
    });
    splitAt((X5[2] + X5[3]) / 2, 150, 450);
    badges.push(pill((X5[2] + X5[3]) / 2, 120, 'partition', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(X5[1], 186, 'MAJORITY · 3 → quorum ✓', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(X5[3] + 34, 186, 'MINORITY · 2 → no quorum', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, 466, 'only a majority can elect — no second brain forms', { icon: 'check' }));
    cap(VW / 2, 506, 'two majorities must overlap, so at most one side can ever lead');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── FENCING: resource rejects the stale epoch ─────────────────────────── */
  if (view === 'fencing') {
    // new leader (epoch 8) and stale leader (epoch 7) both aim at one resource
    node(230, 250, 'new L', 'green', { sub: 'epoch 8', halo: true, icon: 'target', rx: 48 });
    node(230, 440, 'old L', 'rose', { sub: 'epoch 7', ghost: true, icon: 'target', rx: 48 });
    const res = isoCube(780, 330, 66, 52, 'lilac', { icon: 'database', label: 'storage', sub: 'keeps max epoch', iconSize: 22 });
    shadows.push(res.shadow); solids.push(res.g);
    // accepted write
    const eOk = edge([V(290, 250), V(540, 290), V(714, 320)], { arrow: true });
    guides.push(eOk.guide); railOut = eOk.d;
    badges.push(pill(500, 262, 'write @ epoch 8  ✓ accepted', { icon: 'check', cls: 'pill--sst' }));
    // rejected write
    const eNo = edge([V(290, 440), V(540, 400), V(714, 356)], { dashed: true });
    guides.push(eNo.guide);
    badges.push(pill(500, 430, 'write @ epoch 7  ✗ refused', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(780, 230, 'highest seen = 8', { icon: 'key', cls: 'pill--sst' }));
    cap(VW / 2, 520, 'the resource itself fences out the stale leader — lower epoch is rejected');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── TRADEOFF: CP halts minority vs AP merges later ────────────────────── */
  if (view === 'tradeoff') {
    // left column: CP
    badges.push(region(96, 150, 400, 300, '', { r: 22 }));
    badges.push(pill(296, 176, 'CP · prevent split-brain', { icon: 'check', cls: 'pill--sst' }));
    node(210, 300, 'majority', 'green', { sub: 'serves', halo: true, icon: 'target' });
    node(390, 300, 'minority', 'slate', { sub: 'read-only', ghost: true });
    cap(296, 430, 'consistent — minority gives up availability');
    // right column: AP
    badges.push(region(544, 150, 400, 300, '', { r: 22 }));
    badges.push(pill(744, 176, 'AP · tolerate, merge later', { icon: 'merge', cls: 'pill--sst' }));
    node(658, 300, 'side A', 'blue', { sub: 'writes' });
    node(838, 300, 'side B', 'rose', { sub: 'writes' });
    const em = edge([V(694, 300), V(802, 300)], { dashed: true, arrow: true });
    guides.push(em.guide);
    cap(744, 430, 'available — but inherits every conflict');
    cap(VW / 2, 522, 'no free lunch: pay in availability, or pay in reconciliation');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: quorum + fencing = one brain ───────────────────────────────── */
  X5.forEach((x, i) => node(x, ROWY, i === 0 ? 'leader' : 'N' + (i + 1), 'green',
    { halo: i === 0, sub: i === 0 ? 'epoch n' : '', icon: i === 0 ? 'target' : 'server' }));
  badges.push(region(118, 190, 884, 150, 'one authoritative brain · always', { r: 24 }));
  const tags = ['quorum: only a majority leads', 'fencing: stale epoch refused', 'keep N odd — add a witness'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 430 + i * 44, t, { icon: 'check', w: 320 })));
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
  <svg class="scene scene--split-brain" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Split-brain and its prevention">
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
