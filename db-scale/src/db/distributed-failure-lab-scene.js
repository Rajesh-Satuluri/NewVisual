/* distributed-failure-lab-scene.js — the "Distributed Failure Lab" scene, in
   the shared Designed-to-Scale isometric vocabulary: rounded iso cubes with
   icon glyphs and labels, soft ground shadows, halos, pill badges, dashed
   logical regions, routed connectors with arrows, a faded iso grid, and
   particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'setup' (healthy cluster gossiping), 'partition' (majority/minority
   split), 'splitbrain' (both sides write → diverge), 'quorum' (only majority
   writable), 'detect' (heartbeat timeout → suspect + fence), 'cap' (CP vs AP),
   'recap' (summary). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderDistributedFailureLabScene(snap, opts = {}) {
  const view = snap.view || 'setup';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'server', label, sub: o.sub || '', iconSize: o.iconSize || 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  const opTile = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 34, o.h || 20, mat, {
      icon: o.icon || '', label, iconSize: 13, ghost: !!o.ghost, halo: !!o.halo,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  const ring5 = (cx, cy, rx, ry) => {
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * (2 * Math.PI / 5);
      pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
    }
    return pts;
  };

  /* ── SETUP: five replicas gossiping heartbeats ─────────────────────────── */
  if (view === 'setup') {
    const p = ring5(VW / 2, 320, 300, 150);
    p.forEach((n, i) => node(n.x, n.y, 'N' + (i + 1), 'green', { icon: 'server', sub: 'up' }));
    // heartbeat links around the ring
    for (let i = 0; i < 5; i++) {
      const a = p[i], b = p[(i + 1) % 5];
      const e = edge([V(a.x, a.y), V(b.x, b.y)], { dashed: true });
      guides.push(e.guide);
    }
    badges.push(pill(VW / 2, 320, 'heartbeats · availability 100%', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 508, 'every node gossips "I’m alive" to the others');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PARTITION: majority side (3) vs minority side (2) ──────────────────── */
  if (view === 'partition') {
    const maj = [{ x: 250, y: 200 }, { x: 250, y: 360 }, { x: 390, y: 280 }];
    const min = [{ x: 790, y: 230 }, { x: 790, y: 390 }];
    badges.push(region(165, 150, 330, 290, '', { r: 22 }));
    badges.push(region(690, 180, 200, 290, '', { r: 22 }));
    maj.forEach((n, i) => node(n.x, n.y, 'N' + (i + 1), 'green', { icon: 'server', sub: 'reachable', rx: 42, h: 36 }));
    min.forEach((n, i) => node(n.x, n.y, 'N' + (i + 4), 'amber', { icon: 'server', sub: 'isolated', rx: 42, h: 36 }));
    // the dropped link — a broken dashed edge with a cut marker
    const brk = edge([V(445, 280), V(545, 310), V(690, 320)], { dashed: true });
    guides.push(brk.guide);
    badges.push(pill(VW / 2, 300, 'link dropped', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="330" y="462" text-anchor="middle">MAJORITY SIDE · 3 NODES</text>`);
    badges.push(`<text class="iso-region__t" x="790" y="492" text-anchor="middle">MINORITY · 2</text>`);
    cap(VW / 2, 525, 'each side thinks the other is down — neither can tell');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SPLITBRAIN: both sides accept writes → diverge ────────────────────── */
  if (view === 'splitbrain') {
    const maj = [{ x: 250, y: 210 }, { x: 250, y: 370 }, { x: 390, y: 290 }];
    const min = [{ x: 790, y: 240 }, { x: 790, y: 400 }];
    badges.push(region(165, 160, 330, 290, '', { r: 22 }));
    badges.push(region(690, 190, 200, 290, '', { r: 22 }));
    maj.forEach((n, i) => node(n.x, n.y, 'N' + (i + 1), 'blue', { icon: 'wal', sub: 'x = 7', rx: 42, h: 36 }));
    min.forEach((n, i) => node(n.x, n.y, 'N' + (i + 4), 'rose', { icon: 'wal', sub: 'x = 3', rx: 42, h: 36, halo: true }));
    node(150, 300, 'client', 'slate', { icon: 'app', sub: 'writes', rx: 36, h: 30 });
    node(900, 320, 'client', 'slate', { icon: 'app', sub: 'writes', rx: 36, h: 30 });
    badges.push(pill(330, 300, 'accepts x = 7', { icon: 'wal', cls: 'pill--sst' }));
    badges.push(pill(790, 320, 'accepts x = 3', { icon: 'wal', cls: 'pill--sst' }));
    badges.push(region(150, 470, 740, 66, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="507" text-anchor="middle">SPLIT-BRAIN · TWO TRUTHS · 1 CONFLICT</text>`);
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── QUORUM: only the majority side can serve writes ───────────────────── */
  if (view === 'quorum') {
    const maj = [{ x: 250, y: 210 }, { x: 250, y: 370 }, { x: 390, y: 290 }];
    const min = [{ x: 790, y: 240 }, { x: 790, y: 400 }];
    badges.push(region(165, 160, 330, 290, '', { r: 22 }));
    badges.push(region(690, 190, 200, 290, '', { r: 22 }));
    maj.forEach((n, i) => node(n.x, n.y, 'N' + (i + 1), 'green', { icon: 'check', sub: 'writable', rx: 42, h: 36, halo: i === 2 }));
    min.forEach((n, i) => node(n.x, n.y, 'N' + (i + 4), 'slate', { icon: 'book', sub: 'read-only', rx: 42, h: 36, ghost: true }));
    badges.push(pill(330, 300, 'quorum 3 / 5 ✓', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(790, 320, 'no quorum', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(150, 470, 740, 66, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="507" text-anchor="middle">ONE WRITABLE SIDE · 0 CONFLICTS</text>`);
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DETECT: heartbeat timeout → suspect → fence ───────────────────────── */
  if (view === 'detect') {
    const p = ring5(VW / 2, 300, 300, 140);
    const dead = 2;
    p.forEach((n, i) => {
      if (i === dead) { node(n.x, n.y, 'N3', 'rose', { icon: 'alert', sub: 'suspected', halo: true, ghost: true }); return; }
      node(n.x, n.y, 'N' + (i + 1), 'green', { icon: 'server', sub: 'up' });
    });
    // timed-out heartbeat edges toward the dead node
    [1, 3].forEach(i => {
      const e = edge([V(p[i].x, p[i].y), V((p[i].x + p[dead].x) / 2, (p[i].y + p[dead].y) / 2)], { dashed: true, arrow: true });
      guides.push(e.guide);
    });
    badges.push(pill(p[dead].x, p[dead].y + 92, 'fenced → role reassigned', { icon: 'key', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, 300, 'heartbeat timed out', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(region(150, 472, 740, 64, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="508" text-anchor="middle">MISSED HEARTBEATS → SUSPECT + FENCE</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── CAP: CP (reject writes) vs AP (accept, reconcile) ─────────────────── */
  if (view === 'cap') {
    badges.push(region(165, 150, 330, 300, '', { r: 22 }));
    badges.push(region(545, 150, 330, 300, '', { r: 22 }));
    // CP side: consistent, partly unavailable
    node(250, 230, 'majority', 'green', { icon: 'check', sub: 'serves', rx: 44, h: 38 });
    node(250, 380, 'minority', 'slate', { icon: 'alert', sub: 'rejects writes', rx: 44, h: 38, ghost: true });
    // AP side: available, reconcile later
    node(710, 230, 'side A', 'blue', { icon: 'wal', sub: 'accepts', rx: 44, h: 38 });
    node(710, 380, 'side B', 'amber', { icon: 'wal', sub: 'accepts', rx: 44, h: 38 });
    const rec = edge([V(710, 270), V(710, 340)], { arrow: true, dashed: true });
    guides.push(rec.guide);
    badges.push(pill(330, 300, 'CP · stay consistent', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(710, 305, 'AP · reconcile later', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="330" y="470" text-anchor="middle">CONSISTENT, PARTLY DOWN</text>`);
    badges.push(`<text class="iso-region__t" x="710" y="470" text-anchor="middle">AVAILABLE, MAY CONFLICT</text>`);
    cap(VW / 2, 508, 'a partition forces the choice — pick per workload');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP ─────────────────────────────────────────────────────────────── */
  const p = ring5(VW / 2, 300, 290, 120);
  p.forEach((n, i) => node(n.x, n.y, 'N' + (i + 1), 'green', { icon: 'check', sub: 'healthy' }));
  badges.push(region(150, 150, 740, 150, 'quorum + fencing + a deliberate CAP choice', { r: 24 }));
  const tags = ['quorum keeps only one side writable', 'heartbeats + fencing isolate the unreachable', 'partition forces a CP-or-AP choice'];
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
  <svg class="scene scene--distributed-failure-lab" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Distributed failure lab">
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
