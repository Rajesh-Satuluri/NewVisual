/* cost-based-optimization-scene.js — the "Cost-Based Optimization" scene, in the
   shared Designed-to-Scale isometric vocabulary. A green Statistics cube feeds
   numbers into candidate plan trees (amber operator cubes over table tiles);
   costs are estimated and the cheapest plan is chosen.

   Views: 'why' | 'stats' | 'cardinality' | 'costmodel' | 'pick' | 'recap'.
   Output: { svg, layer, rail, flows, note }. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderCostBasedOptimizationScene(snap, opts = {}) {
  const view = snap.view || 'why';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  const push = (o) => { if (o.shadow) shadows.push(o.shadow); if (o.halo) halos.push(o.halo); solids.push(o.g); };

  function opCube(cx, cy, label, o = {}) {
    const c = isoCube(cx, cy, 30, 32, 'amber', { label, iconSize: 15, ...o });
    push(c); return c;
  }
  function leaf(cx, cy, tone, o = {}) {
    const t = isoTile(cx, cy, 34, tone || 'lilac', o);
    push(t); return t;
  }
  function wire(ax, ay, bx, by, o = {}) {
    const e = edge([V(ax, ay), V((ax + bx) / 2, (ay + by) / 2), V(bx, by)], { arrow: true, ...o });
    guides.push(e.guide); return e;
  }
  /* a compact plan tree: π over ⋈ over two leaf tables, root top at `top` */
  function miniTree(cx, top, o = {}) {
    const g = o.ghost ? { ghost: true } : {};
    const root = opCube(cx, top, o.rootLabel || 'π', { ...g, pulse: o.pulse });
    const mid = opCube(cx, top + 56, '⋈', g);
    const lL = leaf(cx - 36, top + 128, o.tone || 'lilac', g);
    const lR = leaf(cx + 36, top + 128, o.tone2 || 'blue', g);
    wire(lL.top[0], lL.top[1], mid.base[0], mid.base[1]);
    wire(lR.top[0], lR.top[1], mid.base[0], mid.base[1]);
    wire(mid.top[0], mid.top[1] - 2, root.base[0], root.base[1]);
    return { root, mid, lL, lR, botY: top + 128 };
  }

  /* the Statistics / catalog cube on the left, feeding every plan */
  const stats = isoCube(165, 180, 76, 84, 'green', {
    icon: 'database', label: 'Statistics', sub: 'row counts',
    ghost: view === 'why', halo: view === 'stats' || view === 'recap',
  });
  push(stats);

  function feed(toX, toY) {
    const e = edge([
      V(stats.verts.E.x, stats.front[1]),
      V((stats.verts.E.x + toX) / 2, (stats.front[1] + toY) / 2),
      V(toX - 6, toY),
    ], { arrow: true, dashed: true });
    guides.push(e.guide); railIn = e.d;
  }

  if (view === 'why') {
    badges.push(pill(600, 70, 'which plan is cheapest?', { icon: 'target' }));
    [360, 600, 840].forEach((x) => {
      miniTree(x, 160);
      badges.push(pill(x, 134, 'cost  ?', { cls: 'pill--sst' }));
    });
    feed(360, 180);
  }

  else if (view === 'stats') {
    badges.push(region(360, 120, 250, 104, ''));
    badges.push(pill(485, 116, 'users · n = 10,000', { icon: 'grid' }));
    badges.push(`<text class="sst-cap" x="485" y="200" text-anchor="middle">histogram · distinct values</text>`);
    badges.push(region(360, 256, 250, 104, ''));
    badges.push(pill(485, 252, 'orders · n = 142,000', { icon: 'grid' }));
    badges.push(`<text class="sst-cap" x="485" y="336" text-anchor="middle">min / max · null fraction</text>`);
    miniTree(830, 150);
    badges.push(pill(830, 124, 'a candidate plan', { cls: 'pill--sst' }));
    feed(360, 180);
  }

  else if (view === 'cardinality') {
    const tr = miniTree(540, 150);
    badges.push(pill(760, tr.root.top[1], 'π → 1.4k', { cls: 'pill--sst' }));
    badges.push(pill(760, tr.mid.top[1], '⋈ → 1.4k', { cls: 'pill--sst' }));
    badges.push(pill(360, tr.botY, 'orders 142k', { cls: 'pill--sst' }));
    badges.push(pill(720, tr.botY, 'users 10k', { cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="540" y="430" text-anchor="middle">estimated rows out of each step</text>`);
    feed(500, 300);
  }

  else if (view === 'costmodel') {
    const tr = miniTree(540, 150, { pulse: true });
    badges.push(pill(770, 120, 'cost = I/O + CPU', { icon: 'gauge' }));
    badges.push(pill(770, tr.mid.top[1], '⋈  +1,200', { cls: 'pill--sst' }));
    badges.push(pill(730, tr.botY, 'scan  +480', { cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="540" y="430" text-anchor="middle">each operator adds its estimated cost</text>`);
    feed(500, 300);
  }

  else if (view === 'pick') {
    const cands = [
      { x: 360, cost: '9,000', ghost: true },
      { x: 600, cost: '1,200', ghost: true },
      { x: 840, cost: '260', ghost: false },
    ];
    cands.forEach((c) => {
      miniTree(c.x, 160, {
        ghost: c.ghost, pulse: !c.ghost,
        tone: c.ghost ? 'slate' : 'green', tone2: c.ghost ? 'slate' : 'green',
      });
      badges.push(pill(c.x, 134, 'cost  ' + c.cost, c.ghost ? { cls: 'pill--sst' } : { icon: 'check' }));
    });
    badges.push(`<text class="iso-region__t" x="840" y="340" text-anchor="middle">chosen</text>`);
    feed(360, 180);
  }

  else { // recap
    miniTree(560, 160, { pulse: true, tone: 'green', tone2: 'green' });
    badges.push(pill(560, 134, 'cost 260 · cheapest', { icon: 'check' }));
    badges.push(pill(830, 170, 'good stats → good plans', { icon: 'check', w: 220 }));
    badges.push(pill(830, 228, 'stale stats → slow query', { icon: 'alert', w: 220 }));
    feed(560, 310);
  }

  const flows = railIn ? [{ id: 'in', kind: 'read', speed: 150, size: 5 }] : [];
  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
}

/* stitch the SVG together in the shared layer order (verbatim from dbms-scene) */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Cost-based optimization">
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
