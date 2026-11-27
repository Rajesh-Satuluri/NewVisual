/* strong-consistency-scene.js — the "Strong Consistency" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs and
   labels, soft ground shadows, halos, pill badges, dashed logical regions, routed
   connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'skew' (two clients read different values), 'single' (3 replicas = one
   logical copy), 'commit' (write blocks on majority ack), 'order' (one shared
   timeline), 'partition' (minority refuses), 'recap' (one truth). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* three replica slots across the middle band */
const ROWY = 300;
const X3 = [260, 520, 780];

export function renderStrongConsistencyScene(snap, opts = {}) {
  const view = snap.view || 'single';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a node; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'database', label, sub: o.sub || '', iconSize: 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── SKEW: two clients read two different "latest" values ──────────────── */
  if (view === 'skew') {
    const cx1 = 180, cx2 = 860, clienty = 140;
    node(cx1, clienty, 'client A', 'blue', { icon: 'app', rx: 42, h: 38 });
    node(cx2, clienty, 'client B', 'blue', { icon: 'app', rx: 42, h: 38 });
    X3.forEach((x, i) => {
      const lag = i === 2;
      node(x, ROWY, 'R' + (i + 1), lag ? 'rose' : 'green',
        { ghost: lag, sub: lag ? 'x = 1 (stale)' : 'x = 2' });
    });
    const eA = edge([V(cx1, clienty + 40), V((cx1 + X3[0]) / 2, 230), V(X3[0], ROWY - 30)], { arrow: true });
    const eB = edge([V(cx2, clienty + 40), V((cx2 + X3[2]) / 2, 230), V(X3[2], ROWY - 30)], { arrow: true });
    guides.push(eA.guide, eB.guide); railIn = eA.d;
    badges.push(pill(cx1, clienty - 70, 'reads x = 2', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(cx2, clienty - 70, 'reads x = 1', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(150, 404, 740, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="442" text-anchor="middle">SAME KEY · TWO "CURRENT" VALUES</text>`);
    cap(VW / 2, 474, 'a lazy replica lags behind — and a read lands on it');
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SINGLE: three replicas presenting one logical copy ────────────────── */
  if (view === 'single') {
    X3.forEach((x, i) => node(x, ROWY, 'R' + (i + 1), 'green', { halo: i === 1, sub: 'x = 2' }));
    badges.push(region(190, 212, 660, 176, 'one logical copy', { r: 24 }));
    badges.push(pill(VW / 2, 466, 'every read → latest committed value', { icon: 'check' }));
    cap(VW / 2, 506, 'physically three, logically one — always current');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── COMMIT: write blocks until a majority acknowledges ────────────────── */
  if (view === 'commit') {
    node(VW / 2, 120, 'leader', 'amber', { icon: 'server', rx: 44, h: 40, sub: 'routes write' });
    X3.forEach((x, i) => {
      const acked = i <= 1;
      node(x, ROWY, 'R' + (i + 1), acked ? 'green' : 'slate',
        { halo: acked, sub: acked ? 'ack ✓' : 'pending' });
      const e = edge([V(VW / 2, 158), V((VW / 2 + x) / 2, 224), V(x, ROWY - 30)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    badges.push(pill(VW / 2, 462, 'commit = majority (2 of 3) acknowledged', { icon: 'check' }));
    cap(VW / 2, 502, 'the client blocks here until a majority has the write');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ORDER: one shared timeline of operations ──────────────────────────── */
  if (view === 'order') {
    const ty = 300, x0 = 150, x1 = 930;
    const line = edge([V(x0, ty), V(x1, ty)], { arrow: true });
    guides.push(line.guide);
    const ops = [
      { x: 250, t: 'write x=1', mat: 'blue', ic: 'app' },
      { x: 450, t: 'write x=2', mat: 'amber', ic: 'app' },
      { x: 650, t: 'read → 2', mat: 'green', ic: 'check' },
      { x: 830, t: 'read → 2', mat: 'green', ic: 'check' },
    ];
    ops.forEach(o => node(o.x, ty - 8, '', o.mat, { icon: o.ic, rx: 30, h: 28 }));
    ops.forEach(o => badges.push(pill(o.x, ty - 92, o.t, { cls: 'pill--sst' })));
    badges.push(pill(x0 + 70, ty + 86, 'past', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(pill(x1 - 70, ty + 86, 'now', { icon: 'clock', cls: 'pill--sst' }));
    cap(VW / 2, 470, 'one total order — no read ever sees an earlier value than a prior read');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PARTITION: minority side refuses rather than serve stale ──────────── */
  if (view === 'partition') {
    X3.forEach((x, i) => {
      const major = i <= 1;
      node(x, ROWY, 'R' + (i + 1), major ? 'green' : 'lilac',
        { halo: major && i === 0, ghost: !major, sub: major ? 'serves' : 'refuses' });
    });
    const bx = (X3[1] + X3[2]) / 2;
    const zig = [V(bx - 22, 150), V(bx + 20, 212), V(bx - 20, 274), V(bx + 22, 336), V(bx - 20, 398), V(bx + 20, 456)];
    const br = edge(zig, { dashed: true, r: 2 });
    guides.push(br.guide);
    badges.push(pill(bx, 118, 'partition', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(X3[0] + 30, 182, 'MAJORITY · serves', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(X3[2], 182, 'MINORITY · 503', { icon: 'alert', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'consistency kept, availability sacrificed — the CP corner of CAP');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: one truth, one order ───────────────────────────────────────── */
  X3.forEach((x, i) => node(x, ROWY, 'R' + (i + 1), 'green', { halo: i === 1 }));
  badges.push(region(118, 200, 884, 160, 'one copy · one timeline', { r: 24 }));
  const tags = ['commit on majority', 'reads never go stale', 'CP under partition'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 440 + i * 44, t, { icon: 'check', w: 300 })));
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
  <svg class="scene scene--strong-consistency" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Strong consistency">
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
