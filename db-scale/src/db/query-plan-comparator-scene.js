/* query-plan-comparator-scene.js — two physical plan trees side by side, in the
   shared Designed-to-Scale isometric vocabulary. Left = Nested-Loop plan,
   right = Hash-Join plan; per-view row/cost pills, est-vs-actual, and a winner.

   Input: view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note }.
   Views: two | rowest | cost | estVsAct | choice | recap. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderQueryPlanComparatorScene(snap, opts = {}) {
  const view = snap.view || 'two';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [], guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* a rounded operator node (closes over the paint arrays) */
  function node(cx, cy, label, mat, o = {}) {
    const c = isoCube(cx, cy, 46, 50, mat, {
      label, sub: o.sub, iconSize: 0, ghost: o.ghost, halo: o.halo, pulse: o.pulse,
    });
    shadows.push(c.shadow); if (c.halo) halos.push(c.halo); solids.push(c.g);
    c.cx = cx; c.cy = cy; return c;
  }
  /* a base-table leaf tile with a caption */
  function leaf(cx, cy, name, mat, o = {}) {
    const t = isoTile(cx, cy, 48, mat, { ghost: o.ghost });
    shadows.push(t.shadow); solids.push(t.g);
    badges.push(`<text class="sst-cap" x="${A(cx)}" y="${A(t.base[1] + 14)}" text-anchor="middle">${esc(name)}</text>`);
    t.cx = cx; t.cy = cy; return t;
  }
  /* child (lower) → parent (higher) connector, arrow pointing up */
  function wire(child, parent, o = {}) {
    const e = edge([V(child.top[0], child.top[1]), V(parent.base[0], parent.base[1])], { arrow: true, dashed: o.dashed });
    guides.push(e.guide);
    return e.d;
  }
  /* a pill tag beside a node (left tree → left side, right tree → right side) */
  function tag(nd, text, leftSide, o = {}) {
    const x = nd.cx + (leftSide ? -82 : 82);
    const y = (o.dy || 0) + nd.cy;
    badges.push(pill(x, y, text, { w: o.w || 0, icon: o.icon, cls: o.cls }));
  }

  /* build one bottom-up plan tree centred on cx */
  function plan(cx, joinLabel, o = {}) {
    const g = o.ghost;
    const lu = leaf(cx - 62, 440, 'users', 'blue', { ghost: g });
    const lo = leaf(cx + 62, 440, 'orders', 'lilac', { ghost: g });
    const jn = node(cx, 332, joinLabel, o.joinMat || 'amber', { ghost: g, halo: o.joinHalo });
    const fl = node(cx, 232, 'σ', 'amber', { sub: 'total>100', ghost: g });
    const pr = node(cx, 132, 'π', o.winner ? 'green' : 'amber', { sub: 'name', ghost: g, halo: o.winner });
    wire(lu, jn, { dashed: g }); wire(lo, jn, { dashed: g });
    wire(jn, fl, { dashed: g }); wire(fl, pr, { dashed: g });
    return { lu, lo, jn, fl, pr, cx };
  }

  const cxL = 290, cxR = 760;
  const leftGhost = view === 'choice';
  const rightWinner = view === 'choice' || view === 'recap';

  const L = plan(cxL, 'NL Join', { ghost: leftGhost });
  const R = plan(cxR, 'Hash Join', {
    joinMat: view === 'estVsAct' ? 'rose' : 'amber',
    joinHalo: view === 'estVsAct',
    winner: rightWinner,
  });

  // title pills
  badges.push(pill(cxL, 64, 'Plan A · Nested Loop', { icon: 'target' }));
  badges.push(pill(cxR, 64, 'Plan B · Hash Join', { icon: 'merge' }));

  // the rail runs up whichever tree is the "live" one
  const RT = view === 'choice' ? R : L;
  railIn = edge([V(RT.lu.top[0], RT.lu.top[1]), V(RT.jn.top[0], RT.jn.top[1]),
    V(RT.fl.top[0], RT.fl.top[1]), V(RT.pr.top[0], RT.pr.top[1])]).d;

  if (view === 'two') {
    badges.push(`<text class="iso-region__t" x="525" y="300" text-anchor="middle">vs</text>`);
    badges.push(`<text class="sst-cap" x="525" y="512" text-anchor="middle">same query · same result</text>`);
  }

  if (view === 'rowest') {
    tag(L.jn, '142k scanned', true, { cls: 'pill--sst' });
    tag(L.pr, '1.4k out', true);
    tag(R.jn, '1.4k out', false, { cls: 'pill--sst' });
    tag(R.pr, '1.4k out', false);
    badges.push(`<text class="iso-region__t" x="525" y="300" text-anchor="middle">same rows out — different work inside</text>`);
  }

  if (view === 'cost') {
    tag(L.jn, 'cost 8,800', true, { cls: 'pill--sst' });
    tag(L.pr, 'cost 9,000', true);
    tag(R.jn, 'cost 1,000', false, { cls: 'pill--sst' });
    tag(R.pr, 'cost 1,200', false);
    badges.push(pill(525, 512, 'compare totals', { icon: 'gauge' }));
  }

  if (view === 'estVsAct') {
    tag(R.jn, 'est 1.4k', false, { dy: -15 });
    tag(R.jn, 'act 48k', false, { dy: 17, cls: 'pill--sst' });
    badges.push(`<text class="iso-region__t" x="760" y="500" text-anchor="middle">stale stats → 34× under-estimate</text>`);
  }

  if (view === 'choice') {
    tag(L.pr, 'cost 9,000', true);
    tag(R.pr, 'cost 1,200', false);
    badges.push(`<text class="iso-region__t" x="290" y="500" text-anchor="middle">pruned</text>`);
    badges.push(pill(760, 500, 'cheaper estimate wins', { icon: 'check' }));
  }

  if (view === 'recap') {
    tag(L.pr, 'cost 9,000', true);
    tag(R.pr, 'cost 1,200', false);
    badges.push(`<text class="iso-region__t" x="525" y="512" text-anchor="middle">compare shape · rows · cost</text>`);
  }

  return assemble({
    grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
    flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note,
  });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Query plan comparator">
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
