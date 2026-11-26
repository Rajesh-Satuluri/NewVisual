/* query-optimization-scene.js — the "Query Optimization" scene, in the same
   Designed-to-Scale isometric vocabulary as the other lessons: plan trees of
   amber operator cubes over relation tiles, cost pills, and result-preserving
   rewrites drawn as the plan reshapes.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'space', 'rewrite', 'pushdown', 'joinorder', 'search', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderQueryOptimizationScene(snap, opts = {}) {
  const view = snap.view || 'space';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  const pushCube = (c) => { shadows.push(c.shadow); if (c.halo) halos.push(c.halo); solids.push(c.g); };

  /* an operator cube (σ / π / ⋈) with its symbol as the label */
  const op = (cx, cy, sym, sub, mat, o = {}) =>
    isoCube(cx, cy, o.rx || 44, o.h || 48, mat || 'amber', {
      label: sym, sub, iconSize: 0, pulse: o.pulse, halo: o.halo, ghost: o.ghost,
    });

  /* a leaf relation tile with a caption underneath */
  const tbl = (cx, cy, name, mat, o = {}) => {
    const t = isoTile(cx, cy, o.rx || 46, mat || 'blue', { ghost: o.ghost });
    pushCube(t);
    badges.push(`<text class="sst-cap" x="${A(cx)}" y="${A(t.base[1] + 15)}" text-anchor="middle">${esc(name)}</text>`);
    return t;
  };

  /* an upward routed connector from a lower node `a` to an upper node `b` */
  const wire = (a, b, o = {}) => {
    const e = edge([
      V(a.top[0], a.top[1] - 2),
      V((a.top[0] + b.base[0]) / 2, (a.top[1] + b.base[1]) / 2),
      V(b.base[0], b.base[1] - 2),
    ], { arrow: true, dashed: o.dashed });
    guides.push(e.guide);
    return e;
  };

  const costPill = (cx, cy, text, tone) =>
    badges.push(pill(cx, cy, text, { icon: 'gauge', cls: tone === 'bad' ? 'pill--sst' : 'pill--sst', w: 120 }));

  /* ── 'space': a fan of three equivalent plans, each with a cost ───────── */
  if (view === 'space') {
    badges.push(pill(VW / 2, 70, 'many plans · one answer', { icon: 'target', cls: 'pill--sst', w: 240 }));
    const cols = [
      { cx: 240, cost: '9,000', tone: 'bad', mat: 'amber' },
      { cx: 540, cost: '1,200', tone: 'mid', mat: 'amber' },
      { cx: 840, cost: '260', tone: 'good', mat: 'green' },
    ];
    cols.forEach((c) => {
      // a tiny 3-node tree
      const l1 = tbl(c.cx - 44, 300, 'users', 'blue', { rx: 34 });
      const l2 = tbl(c.cx + 44, 300, 'orders', 'lilac', { rx: 34 });
      const j = op(c.cx, 210, '⋈', '', c.mat, { rx: 34, h: 38 });
      const r = op(c.cx, 132, 'π', '', c.mat, { rx: 34, h: 38 });
      wire(l1, j); wire(l2, j); wire(j, r);
      pushCube(j); pushCube(r);
      badges.push(pill(c.cx, 372, 'cost ' + c.cost, { icon: 'gauge', cls: 'pill--sst', w: 120 }));
      if (c.tone === 'good') badges.push(`<text class="iso-region__t" x="${c.cx}" y="408" text-anchor="middle">cheapest</text>`);
    });
    return done();
  }

  /* ── 'rewrite': one tree + a toolbox of equivalence rules ─────────────── */
  if (view === 'rewrite') {
    badges.push(pill(360, 72, 'equivalence rules', { icon: 'target', cls: 'pill--sst', w: 200 }));
    const l1 = tbl(300, 360, 'users', 'blue');
    const l2 = tbl(470, 360, 'orders', 'lilac');
    const j = op(385, 262, '⋈', 'join', 'amber');
    const s = op(385, 170, 'σ', 'total>100', 'amber');
    const p = op(385, 82, 'π', 'name', 'amber');
    wire(l1, j); wire(l2, j); wire(j, s); wire(s, p);
    pushCube(j); pushCube(s); pushCube(p);
    const rules = ['predicate pushdown', 'projection pushdown', 'join reordering'];
    badges.push(region(690, 110, 300, 210, '', { r: 16 }));
    rules.forEach((rl, i) => badges.push(pill(840, 150 + i * 56, rl, { icon: 'check', cls: 'pill--sst', w: 240 })));
    return done();
  }

  /* ── 'pushdown': before vs after, σ pushed onto the orders leaf ───────── */
  if (view === 'pushdown') {
    badges.push(pill(300, 70, 'before', { icon: 'alert', cls: 'pill--sst', w: 120 }));
    badges.push(pill(760, 70, 'after', { icon: 'check', cls: 'pill--sst', w: 120 }));

    // BEFORE: σ sits high, above the join
    {
      const l1 = tbl(232, 360, 'users', 'blue', { rx: 40 });
      const l2 = tbl(372, 360, 'orders', 'lilac', { rx: 40 });
      const j = op(302, 270, '⋈', 'join', 'amber', { rx: 40, h: 44 });
      const s = op(302, 184, 'σ', 'total>100', 'rose', { rx: 40, h: 44 });
      const p = op(302, 104, 'π', 'name', 'amber', { rx: 40, h: 44 });
      const eU = wire(l1, j); wire(l2, j); wire(j, s); wire(s, p);
      pushCube(j); pushCube(s); pushCube(p);
      railIn = eU.d;
      badges.push(pill(302, 420, 'cost 9,000', { icon: 'gauge', cls: 'pill--sst', w: 130 }));
    }
    // AFTER: σ pushed down onto the orders leaf
    {
      const l1 = tbl(690, 360, 'users', 'blue', { rx: 40 });
      const l2 = tbl(832, 360, 'orders', 'lilac', { rx: 40 });
      const s = op(832, 270, 'σ', 'total>100', 'green', { rx: 36, h: 40 });   // low, on the leaf
      const j = op(761, 196, '⋈', 'join', 'amber', { rx: 40, h: 44 });
      const p = op(761, 110, 'π', 'name', 'amber', { rx: 40, h: 44 });
      wire(l1, j); wire(l2, s); wire(s, j); wire(j, p);
      pushCube(s); pushCube(j); pushCube(p);
      badges.push(pill(761, 420, 'cost 1,200', { icon: 'gauge', cls: 'pill--sst', w: 130 }));
    }
    // the rewrite arrow + annotation
    const rw = edge([V(360, 150), V(540, 150), V(700, 230)], { arrow: true, dashed: true });
    guides.push(rw.guide);
    badges.push(`<text class="iso-region__t" x="540" y="135" text-anchor="middle">filter early</text>`);
    return done();
  }

  /* ── 'joinorder': two join orders, different intermediate sizes ───────── */
  if (view === 'joinorder') {
    badges.push(pill(VW / 2, 66, 'join order decides cost', { icon: 'target', cls: 'pill--sst', w: 240 }));
    // LEFT: (A ⋈ B) ⋈ C — big intermediate
    {
      const a = tbl(190, 350, 'A', 'blue', { rx: 34 });
      const b = tbl(300, 350, 'B', 'lilac', { rx: 34 });
      const j1 = op(245, 258, '⋈', 'big', 'rose', { rx: 34, h: 38 });
      const c = tbl(380, 258, 'C', 'amber', { rx: 34 });
      const j2 = op(312, 160, '⋈', '', 'amber', { rx: 34, h: 38 });
      wire(a, j1); wire(b, j1); wire(j1, j2); wire(c, j2);
      pushCube(j1); pushCube(j2);
      badges.push(pill(290, 430, 'cost 42,000', { icon: 'gauge', cls: 'pill--sst', w: 140 }));
      badges.push(`<text class="sst-cap" x="245" y="300" text-anchor="middle">(A ⋈ B) first</text>`);
    }
    // RIGHT: A ⋈ (B ⋈ C) — small intermediate
    {
      const b = tbl(690, 350, 'B', 'lilac', { rx: 34 });
      const c = tbl(800, 350, 'C', 'amber', { rx: 34 });
      const j1 = op(745, 258, '⋈', 'small', 'green', { rx: 34, h: 38 });
      const a = tbl(660, 258, 'A', 'blue', { rx: 34 });
      const j2 = op(700, 160, '⋈', '', 'amber', { rx: 34, h: 38 });
      wire(b, j1); wire(c, j1); wire(j1, j2); wire(a, j2);
      pushCube(j1); pushCube(j2);
      badges.push(pill(745, 430, 'cost 620', { icon: 'gauge', cls: 'pill--sst', w: 130 }));
      badges.push(`<text class="sst-cap" x="745" y="300" text-anchor="middle">(B ⋈ C) first</text>`);
    }
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="500" text-anchor="middle">small intermediates win</text>`);
    return done();
  }

  /* ── 'search': a chosen plan amid faded candidates ────────────────────── */
  if (view === 'search') {
    badges.push(pill(VW / 2, 66, 'search → cheapest plan', { icon: 'target', cls: 'pill--sst', w: 240 }));
    // faded candidate trees around the edges
    const ghosts = [[200, 180], [230, 400], [840, 180], [820, 400]];
    ghosts.forEach(([cx, cy]) => {
      const l1 = tbl(cx - 36, cy + 70, '', 'slate', { rx: 26, ghost: true });
      const l2 = tbl(cx + 36, cy + 70, '', 'slate', { rx: 26, ghost: true });
      const j = op(cx, cy, '⋈', '', 'slate', { rx: 26, h: 30, ghost: true });
      wire(l1, j, { dashed: true }); wire(l2, j, { dashed: true });
      pushCube(j);
      const dd = edge([V(cx, cy - 20), V(VW / 2, 250), V(VW / 2, 250)], { dashed: true });
      guides.push(dd.guide);
    });
    // the chosen plan, center, green
    const l1 = tbl(492, 390, 'users', 'blue');
    const l2 = tbl(632, 390, 'orders', 'lilac');
    const s = op(632, 300, 'σ', '', 'green', { rx: 36, h: 40 });
    const j = op(562, 222, '⋈', 'join', 'green', { halo: true });
    const p = op(562, 134, 'π', 'name', 'green', { halo: true });
    wire(l1, j); wire(l2, s); wire(s, j); wire(j, p);
    pushCube(s); pushCube(j); pushCube(p);
    badges.push(pill(562, 466, 'cost 260 · chosen', { icon: 'check', cls: 'pill--sst', w: 180 }));
    return done();
  }

  /* ── 'recap': the optimized plan, calm ────────────────────────────────── */
  {
    badges.push(pill(VW / 2, 70, 'same result · less work', { icon: 'check', cls: 'pill--sst', w: 230 }));
    const l1 = tbl(492, 400, 'users', 'blue');
    const l2 = tbl(632, 400, 'orders', 'lilac');
    const s = op(632, 308, 'σ', 'total>100', 'green', { rx: 36, h: 40 });
    const j = op(562, 222, '⋈', 'join', 'amber', { halo: true });
    const p = op(562, 130, 'π', 'name', 'amber');
    const eU = wire(l1, j); wire(l2, s); wire(s, j); wire(j, p);
    pushCube(s); pushCube(j); pushCube(p);
    railIn = eU.d;
    badges.push(pill(562, 474, 'cost 260', { icon: 'gauge', cls: 'pill--sst', w: 120 }));
    return done();
  }

  function done() {
    const flows = railIn ? [{ id: 'in', kind: 'read', speed: 150, size: 5 }] : [];
    if (railOut) flows.push({ id: 'out', kind: 'write', speed: 130, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }
}

/* stitch the SVG together in the shared layer order (verbatim from dbms-scene) */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Query optimization">
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
