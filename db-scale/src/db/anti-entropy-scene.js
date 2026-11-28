/* anti-entropy-scene.js — the "Anti-Entropy" scene, in the shared Designed-to-
   Scale isometric vocabulary: rounded iso cubes with icon glyphs and labels,
   soft ground shadows, halos, pill badges, dashed logical regions, routed
   connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'cold' (read-repair misses cold keys), 'sweep' (background compare of
   all keys), 'merkle' (root hashes differ → descend), 'diff' (ship only the
   differing leaf), 'tradeoff' (cost vs convergence), 'recap' (reactive +
   proactive). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const ROWY = 300;

export function renderAntiEntropyScene(snap, opts = {}) {
  const view = snap.view || 'sweep';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a node; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'server', label, sub: o.sub || '', iconSize: 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // a small key tile at (x,y); mat conveys state (green=synced, rose=diverged)
  const keyTile = (x, y, mat, o = {}) => {
    const c = isoTile(x, y, o.rx || 26, mat, { halo: !!o.halo, ghost: !!o.ghost });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── COLD: read-repair heals the hot key, cold keys stay diverged ──────── */
  if (view === 'cold') {
    const rax = 250, rbx = 790;
    node(rax, ROWY, 'replica A', 'blue', { sub: 'up to date' });
    node(rbx, ROWY, 'replica B', 'slate', { sub: 'missed writes' });
    // a client reads the one hot key → it gets repaired
    node(VW / 2, 120, 'client', 'amber', { icon: 'app', rx: 44, h: 40 });
    const e = edge([V(VW / 2, 158), V((VW / 2 + rbx) / 2, 210), V(rbx, ROWY - 34)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(rbx, ROWY - 108, 'hot key: read → repaired', { icon: 'check', cls: 'pill--sst' }));
    // the cold keys never read, never fixed
    const cx = [430, 500, 570, 640];
    cx.forEach((x, i) => keyTile(x, 456, 'rose', { ghost: i % 2 === 1 }));
    badges.push(region(392, 420, 290, 84, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${(392 + 682) / 2}" y="412" text-anchor="middle">COLD KEYS · NEVER READ · STILL DIVERGED</text>`);
    cap(VW / 2, 540, 'read-repair only touches keys a client actually asks for');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SWEEP: a background task compares the full keyspace ────────────────── */
  if (view === 'sweep') {
    const rax = 230, rbx = 810;
    node(rax, ROWY, 'replica A', 'green', { sub: 'all keys' });
    node(rbx, ROWY, 'replica B', 'green', { sub: 'all keys' });
    // the sweeper sits between and walks both key rows
    node(VW / 2, 132, 'anti-entropy', 'lilac', { icon: 'sliders', sub: 'sweeper', rx: 58, h: 42 });
    const el = edge([V(VW / 2 - 40, 170), V((VW / 2 + rax) / 2, 222), V(rax + 10, ROWY - 34)], { arrow: true, dashed: true });
    const er = edge([V(VW / 2 + 40, 170), V((VW / 2 + rbx) / 2, 222), V(rbx - 10, ROWY - 34)], { arrow: true, dashed: true });
    guides.push(el.guide, er.guide); railOut = er.d;
    // a full row of keys under each replica
    [rax, rbx].forEach(bx => {
      const xs = [bx - 66, bx - 22, bx + 22, bx + 66];
      xs.forEach((x, i) => keyTile(x, 440, 'green', { ghost: false }));
    });
    badges.push(pill(VW / 2, 468, 'compares every key — hot and cold', { icon: 'check' }));
    cap(VW / 2, 520, 'convergence runs on a schedule, not on read traffic');
    flows.push({ id: 'out', kind: 'write', speed: 140, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── MERKLE: two hash trees; roots differ → descend the mismatch ───────── */
  if (view === 'merkle') {
    // draw a small binary tree of hash tiles for each replica
    const tree = (ox, mats) => {
      const rootY = 150, midY = 262, leafY = 374;
      const root = [ox, rootY];
      const mids = [[ox - 90, midY], [ox + 90, midY]];
      const leaves = [[ox - 135, leafY], [ox - 45, leafY], [ox + 45, leafY], [ox + 135, leafY]];
      // connectors
      mids.forEach(m => { const e = edge([V(root[0], root[1] + 22), V(m[0], m[1] - 20)]); guides.push(e.guide); });
      leaves.forEach((l, i) => { const m = mids[i < 2 ? 0 : 1]; const e = edge([V(m[0], m[1] + 20), V(l[0], l[1] - 18)]); guides.push(e.guide); });
      keyTile(root[0], root[1], mats.root, { rx: 30, halo: mats.root === 'rose' });
      mids.forEach((m, i) => keyTile(m[0], m[1], mats.mids[i], { rx: 26 }));
      leaves.forEach((l, i) => keyTile(l[0], l[1], mats.leaves[i], { rx: 22 }));
    };
    tree(290, { root: 'rose', mids: ['green', 'rose'], leaves: ['green', 'green', 'rose', 'green'] });
    tree(770, { root: 'rose', mids: ['green', 'rose'], leaves: ['green', 'green', 'green', 'green'] });
    badges.push(pill(290, 112, 'replica A root', { icon: 'layers', cls: 'pill--sst' }));
    badges.push(pill(770, 112, 'replica B root', { icon: 'layers', cls: 'pill--sst' }));
    // compare the two roots
    const ce = edge([V(338, 150), V(VW / 2, 120), V(722, 150)], { dashed: true, arrow: true });
    guides.push(ce.guide);
    badges.push(pill(VW / 2, 96, 'roots differ ✗', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, 404, 'descend only the mismatching subtree', { icon: 'search' }));
    cap(VW / 2, 460, 'equal roots would end it in one compare; unequal → walk down');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DIFF: isolate to one leaf range, ship only those keys ─────────────── */
  if (view === 'diff') {
    const rax = 250, rbx = 790;
    node(rax, ROWY, 'replica A', 'green', { sub: 'source' });
    node(rbx, ROWY, 'replica B', 'green', { sub: 'target' });
    // key rows; only one key differs and crosses
    const ax = [rax - 66, rax - 22, rax + 22, rax + 66];
    const bx = [rbx - 66, rbx - 22, rbx + 22, rbx + 66];
    ax.forEach((x, i) => keyTile(x, 448, i === 2 ? 'amber' : 'green', { halo: i === 2 }));
    bx.forEach((x, i) => keyTile(x, 448, i === 2 ? 'amber' : 'green', { halo: i === 2 }));
    badges.push(pill(ax[2], 500, 'differing leaf', { icon: 'target', cls: 'pill--sst' }));
    // only the one differing key ships across
    const e = edge([V(ax[2], 418), V(VW / 2, 360), V(bx[2], 418)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(VW / 2, 336, 'ship only this key', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(region(150, 540, 740, 42, 'cost scales with divergence, not dataset size', { r: 16 }));
    cap(VW / 2, 150, 'a 1 TB store that is 99% identical costs a few hashes + a tiny slice');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── TRADEOFF: steady background cost vs convergence guarantee ──────────── */
  if (view === 'tradeoff') {
    node(340, ROWY, 'sweeper', 'lilac', { icon: 'sliders', sub: 'background', rx: 54 });
    node(720, ROWY, 'live traffic', 'blue', { icon: 'app', sub: 'foreground', rx: 54 });
    // they contend for the same CPU/bandwidth
    const e = edge([V(394, ROWY), V(VW / 2, ROWY - 30), V(666, ROWY)], { dashed: true, arrow: true });
    guides.push(e.guide);
    badges.push(pill(VW / 2, ROWY - 70, 'share CPU & bandwidth', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(region(130, 430, 360, 92, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="310" y="462" text-anchor="middle">COST · CPU + BANDWIDTH</text>`);
    badges.push(region(550, 430, 360, 92, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="730" y="462" text-anchor="middle">GAIN · WHOLE-SET CONVERGENCE</text>`);
    badges.push(pill(310, 496, 'steady background drain', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(pill(730, 496, 'bounded divergence window', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 560, 'tune the sweep rate: too fast steals live capacity, too slow leaves drift');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: reactive read-repair + proactive anti-entropy ──────────────── */
  node(300, ROWY, 'read-repair', 'blue', { icon: 'search', sub: 'reactive', rx: 56 });
  node(740, ROWY, 'anti-entropy', 'lilac', { icon: 'sliders', sub: 'proactive', rx: 56 });
  badges.push(pill(300, ROWY - 92, 'on the read path · hot keys', { icon: 'bolt', cls: 'pill--sst' }));
  badges.push(pill(740, ROWY - 92, 'background sweep · every key', { icon: 'check', cls: 'pill--sst' }));
  badges.push(region(140, 420, 760, 150, 'together: divergence is always temporary', { r: 24 }));
  const tags = ['instant healing of read keys', 'Merkle trees sweep the rest', 'whole dataset converges'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 452 + i * 42, t, { icon: 'check', w: 320 })));
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
  <svg class="scene scene--anti-entropy" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Anti-entropy and Merkle-tree reconciliation">
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
