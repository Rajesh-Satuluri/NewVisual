/* sort-merge-join-scene.js — the "Sort-Merge Join" scene, in the shared
   Designed-to-Scale isometric vocabulary (rounded iso cubes & tiles, pills,
   dashed regions, routed connectors, particle rails).

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, flows, note }.

   Views: 'idea' (two unsorted inputs), 'sort' (order each side), 'merge'
   (lockstep cursors), 'presorted' (index gives sorted input), 'when'
   (trade-offs), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderSortMergeJoinScene(snap, opts = {}) {
  const view = snap.view || 'idea';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* a vertical stack of key tiles; returns [{ k, y, t }] */
  function drawStack(cx, topY, keys, mat, o = {}) {
    const gap = o.gap || 42, rx = o.rx || 50;
    const hi = o.hi || [];
    const out = [];
    keys.forEach((k, i) => {
      const y = topY + i * gap;
      const t = isoTile(cx, y, rx, hi.includes(i) ? 'green' : mat, { h: 16, ghost: o.ghost });
      shadows.push(t.shadow); solids.push(t.g);
      badges.push(`<text class="sst-cap" x="${A(cx)}" y="${A(y + 5)}" text-anchor="middle">${esc(String(k))}</text>`);
      out.push({ k, y, t });
    });
    if (o.cap) badges.push(`<text class="sst-cap" x="${A(cx)}" y="${A(topY + keys.length * gap - gap + 42)}" text-anchor="middle">${esc(o.cap)}</text>`);
    if (o.pill) badges.push(pill(cx, topY - 40, o.pill, { icon: o.pillIcon || 'listOrdered', cls: 'pill--sst' }));
    return out;
  }

  function opCube(cx, cy, sym, sub) {
    const c = isoCube(cx, cy, 46, 50, 'amber', { label: sym, sub, iconSize: 0 });
    shadows.push(c.shadow); solids.push(c.g);
    return c;
  }

  function cursor(cx, y, mat = 'rose') {
    const t = isoTile(cx, y, 15, mat, { h: 9 });
    shadows.push(t.shadow); solids.push(t.g);
    return t;
  }

  /* ── IDEA: two unsorted inputs, must be ordered first ─────────────────── */
  if (view === 'idea') {
    const L = drawStack(280, 170, [3, 1, 2], 'blue', { pill: 'users · unsorted', pillIcon: 'server', cap: 'join key = id' });
    const R = drawStack(760, 170, [2, 3, 1], 'lilac', { pill: 'orders · unsorted', pillIcon: 'file', cap: 'join key = user_id' });
    const op = opCube(520, 250, '⋈', 'sort-merge');
    badges.push(pill(520, 110, 'sort, then merge', { icon: 'merge' }));
    const e1 = edge([V(L[1].t.verts.E.x + 2, L[1].y), V(op.verts.W.x - 6, op.verts.W.y + 6)], { arrow: true });
    const e2 = edge([V(R[1].t.verts.W.x - 2, R[1].y), V(op.verts.E.x + 6, op.verts.E.y + 6)], { arrow: true });
    guides.push(e1.guide, e2.guide); railIn = e1.d;
    badges.push(`<text class="iso-region__t" x="520" y="340" text-anchor="middle">neither side is ordered yet</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── SORT: order each side on the join key ───────────────────────────── */
  if (view === 'sort') {
    // users: unsorted (ghost) -> arrow -> sorted
    drawStack(200, 180, [3, 1, 2], 'blue', { ghost: true, pill: 'unsorted', pillIcon: 'server' });
    const Ls = drawStack(400, 180, [1, 2, 3], 'blue', { pill: 'sorted', pillIcon: 'check', cap: 'by id' });
    const ea = edge([V(200 + 56, 222), V(400 - 56, 222)], { arrow: true });
    guides.push(ea.guide); railIn = ea.d;
    // orders: unsorted (ghost) -> arrow -> sorted
    drawStack(640, 180, [2, 3, 1], 'lilac', { ghost: true, pill: 'unsorted', pillIcon: 'file' });
    drawStack(840, 180, [1, 2, 3], 'lilac', { pill: 'sorted', pillIcon: 'check', cap: 'by user_id' });
    const eb = edge([V(640 + 56, 222), V(840 - 56, 222)], { arrow: true });
    guides.push(eb.guide);
    // spill tile
    const spill = isoTile(400, 400, 50, 'lilac', { h: 16 });
    shadows.push(spill.shadow); solids.push(spill.g);
    const es = edge([V(Ls[2].t.base[0], Ls[2].t.base[1] - 4), V(400, 388)], { arrow: true, dashed: true });
    guides.push(es.guide);
    badges.push(`<text class="sst-cap" x="400" y="${A(spill.base[1] + 16)}" text-anchor="middle">large runs spill to disk</text>`);
    badges.push(pill(520, 100, 'sort each side by key', { icon: 'listOrdered' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── MERGE: lockstep cursors, emit matches ───────────────────────────── */
  if (view === 'merge') {
    const L = drawStack(300, 170, [1, 2, 3], 'blue', { pill: 'users · sorted', pillIcon: 'check', hi: [1] });
    const R = drawStack(740, 170, [1, 2, 3], 'lilac', { pill: 'orders · sorted', pillIcon: 'check', hi: [1] });
    // cursors at the current (matching) row
    const cl = cursor(300 - 78, L[1].y);
    const cr = cursor(740 + 78, R[1].y);
    const em = edge([V(cl.top[0] + 10, cl.top[1]), V(520, 300), V(cr.top[0] - 10, cr.top[1])], { arrow: false });
    guides.push(em.guide); railIn = em.d;
    // emitted matched row
    const outT = isoTile(520, 430, 56, 'green', { h: 18 });
    shadows.push(outT.shadow); solids.push(outT.g);
    const eo = edge([V(520, 320), V(520, 404)], { arrow: true });
    guides.push(eo.guide);
    badges.push(`<text class="sst-cap" x="520" y="${A(outT.base[1] + 16)}" text-anchor="middle">matched row (key = 2)</text>`);
    badges.push(pill(520, 100, 'advance the smaller key', { icon: 'merge' }));
    badges.push(`<text class="iso-region__t" x="520" y="250" text-anchor="middle">equal keys → emit a match</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── PRESORTED: index delivers one side already sorted ───────────────── */
  if (view === 'presorted') {
    // B+Tree feeding a sorted users stack
    const root = isoCube(250, 150, 36, 40, 'amber', { label: 'idx', iconSize: 0 });
    const lf1 = isoCube(205, 250, 30, 34, 'amber', { label: '', iconSize: 0 });
    const lf2 = isoCube(305, 250, 30, 34, 'amber', { label: '', iconSize: 0 });
    [root, lf1, lf2].forEach(c => { shadows.push(c.shadow); solids.push(c.g); });
    guides.push(edge([V(root.base[0] - 6, root.base[1] - 4), V(lf1.top[0], lf1.top[1])], { arrow: false }).guide);
    guides.push(edge([V(root.base[0] + 6, root.base[1] - 4), V(lf2.top[0], lf2.top[1])], { arrow: false }).guide);
    badges.push(pill(250, 100, 'B+Tree index', { icon: 'layers' }));
    badges.push(`<text class="sst-cap" x="250" y="310" text-anchor="middle">already ordered by user_id</text>`);
    const L = drawStack(470, 170, [1, 2, 3], 'blue', { pill: 'users · pre-sorted', pillIcon: 'check' });
    const ei = edge([V(lf2.verts.E.x + 2, 250), V(470 - 54, L[1].y)], { arrow: true });
    guides.push(ei.guide); railIn = ei.d;
    const R = drawStack(780, 170, [1, 2, 3], 'lilac', { pill: 'orders · sorted', pillIcon: 'check' });
    cursor(470 - 70, L[1].y); cursor(780 + 70, R[1].y);
    badges.push(`<text class="iso-region__t" x="625" y="470" text-anchor="middle">NO SORT — STRAIGHT TO MERGE</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── WHEN IT WINS ────────────────────────────────────────────────────── */
  if (view === 'when') {
    const L = drawStack(300, 180, [1, 2, 3], 'blue', { pill: 'sorted output', pillIcon: 'check' });
    const R = drawStack(560, 180, [1, 2, 3], 'lilac', { pill: 'range join ✓', pillIcon: 'check' });
    badges.push(pill(300, 360, 'large inputs', { icon: 'check', w: 170 }));
    badges.push(pill(560, 360, 'pre-sorted data', { icon: 'check', w: 170 }));
    badges.push(pill(300, 410, 'range joins (< >)', { icon: 'check', w: 170 }));
    badges.push(pill(560, 410, 'ORDER BY needed', { icon: 'check', w: 170 }));
    badges.push(region(760, 150, 240, 230, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="880" y="250" text-anchor="middle">small + unsorted?</text>`);
    badges.push(`<text class="iso-region__t" x="880" y="280" text-anchor="middle">hash join wins</text>`);
    badges.push(pill(880, 120, 'the exception', { icon: 'alert' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [], note: snap.note });
  }

  /* ── RECAP ───────────────────────────────────────────────────────────── */
  const L = drawStack(300, 170, [1, 2, 3], 'blue', { pill: 'users · sorted', pillIcon: 'check', hi: [1] });
  const R = drawStack(740, 170, [1, 2, 3], 'lilac', { pill: 'orders · sorted', pillIcon: 'check', hi: [1] });
  const cl = cursor(300 - 78, L[1].y);
  const cr = cursor(740 + 78, R[1].y);
  const em = edge([V(cl.top[0] + 10, cl.top[1]), V(520, 300), V(cr.top[0] - 10, cr.top[1])], { arrow: false });
  guides.push(em.guide); railIn = em.d;
  const outT = isoTile(520, 430, 56, 'green', { h: 18 });
  shadows.push(outT.shadow); solids.push(outT.g);
  guides.push(edge([V(520, 320), V(520, 404)], { arrow: true }).guide);
  badges.push(pill(520, 100, 'sort once, merge linearly', { icon: 'merge' }));
  badges.push(`<text class="sst-cap" x="520" y="${A(outT.base[1] + 16)}" text-anchor="middle">O(n log n) sort + O(n+m) merge</text>`);
  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
    flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Sort-merge join">
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
