/* nested-loop-join-scene.js — the "Nested Loop Join" scene, in the shared
   Designed-to-Scale isometric vocabulary. Two relations drawn as stacks of
   thin iso tiles; an outer cursor probing the inner relation (the inner loop);
   an index variant that collapses the scan into a single lookup.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note }.

   Views: 'idea', 'loops', 'indexed', 'cost', 'when', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderNestedLoopJoinScene(snap, opts = {}) {
  const view = snap.view || 'idea';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  const pushCube = (c) => { shadows.push(c.shadow); if (c.halo) halos.push(c.halo); solids.push(c.g); };
  const pushTile = (t) => { shadows.push(t.shadow); solids.push(t.g); };

  /* a relation = a vertical stack of thin tiles; returns per-row anchor points */
  function relStack(cx, cyTop, n, tone, o = {}) {
    const rx = o.rx || 52, gap = o.gap || 24;
    const rows = [];
    for (let i = 0; i < n; i++) rows.push({ x: cx, y: cyTop + i * gap });
    for (let i = n - 1; i >= 0; i--) {
      const toneI = (o.hi != null && o.hi === i) ? (o.hiTone || 'rose')
        : (o.match != null && o.match === i) ? 'green' : tone;
      pushTile(isoTile(cx, cyTop + i * gap, rx, toneI, { h: rx * 0.3, ghost: o.ghost }));
    }
    return { cx, cyTop, n, rx, gap, rows, left: cx - rx, right: cx + rx, bottom: cyTop + (n - 1) * gap };
  }

  const cap = (x, y, t) => badges.push(`<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`);
  const note = (x, y, t) => badges.push(`<text class="iso-region__t" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`);

  /* layout anchors */
  const OX = 300, OY = 170, IX = 760, IY = 150;
  const opCube = () => { const c = isoCube(520, 70, 52, 56, 'amber', { label: '⋈', sub: 'nested loop', iconSize: 0 }); pushCube(c); return c; };

  /* connector from an outer row to an inner row */
  function probe(oRow, iRow, o = {}) {
    const e = edge([
      V(OX + 52, oRow.y + 6),
      V((OX + IX) / 2, (oRow.y + iRow.y) / 2 - 6),
      V(IX - 56, iRow.y + 6),
    ], { arrow: true, dashed: o.dashed });
    guides.push(e.guide);
    return e.d;
  }

  if (view === 'idea' || view === 'loops') {
    opCube();
    const outer = relStack(OX, OY, 4, 'blue', { hi: 0 });
    const inner = relStack(IX, IY, 5, 'lilac');
    cap(OX, outer.bottom + 70, 'users (outer)');
    cap(IX, inner.bottom + 70, 'orders (inner)');
    // fan from the highlighted outer row to every inner row = the inner loop
    inner.rows.forEach((ir, i) => { const d = probe(outer.rows[0], ir); if (i === 0) railIn = d; });
    if (view === 'idea') {
      badges.push(pill(520, 300, 'for each outer row → scan inner', { icon: 'merge' }));
    } else {
      note(520, 470, 'N × M comparisons');
      cap(520, 498, '4 outer × 5 inner = 20 probes');
      badges.push(pill(520, 300, 'loop inside a loop', { icon: 'merge' }));
    }
  }

  else if (view === 'indexed') {
    opCube();
    const outer = relStack(OX, OY, 4, 'blue', { hi: 0 });
    cap(OX, outer.bottom + 70, 'users (outer)');
    const inner = relStack(IX, IY, 5, 'lilac', { ghost: true });
    cap(IX, inner.bottom + 70, 'orders (ghosted)');
    // a small B+Tree to the right = the index
    const root = isoCube(880, 150, 34, 38, 'amber', { label: 'idx', iconSize: 0 });
    const lf1 = isoCube(840, 250, 28, 32, 'amber', { iconSize: 0 });
    const lf2 = isoCube(920, 250, 28, 32, 'amber', { iconSize: 0 });
    [root, lf1, lf2].forEach(pushCube);
    const target = isoTile(IX, inner.rows[2].y, 52, 'green', { h: 15 }); pushTile(target);
    guides.push(edge([V(root.base[0], root.base[1] - 4), V(lf2.top[0], lf2.top[1])], { arrow: true }).guide);
    // outer cursor → index root → matched inner row (one cheap lookup)
    const e1 = edge([V(OX + 52, outer.rows[0].y + 6), V(690, 110), V(root.top[0] - 6, root.top[1])], { arrow: true });
    guides.push(e1.guide); railIn = e1.d;
    guides.push(edge([V(lf2.base[0], lf2.base[1] - 4), V(target.top[0] + 6, target.top[1])], { arrow: true, dashed: true }).guide);
    badges.push(pill(300, 360, 'index nested loop', { icon: 'layers' }));
    note(820, 330, 'scan → single lookup');
  }

  else if (view === 'cost') {
    opCube();
    const outer = relStack(OX, OY, 4, 'blue');
    const inner = relStack(IX, IY, 5, 'lilac');
    cap(OX, outer.bottom + 70, 'users');
    cap(IX, inner.bottom + 70, 'orders');
    inner.rows.forEach((ir, i) => { const d = probe(outer.rows[1], ir, { dashed: true }); if (i === 0) railIn = d; });
    badges.push(pill(OX, 380, 'plain:  N·M = 20', { icon: 'alert' }));
    badges.push(pill(IX, 380, 'indexed:  N·log M = 8', { icon: 'check' }));
    badges.push(pill(520, 300, 'comparisons dominate', { icon: 'gauge' }));
  }

  else if (view === 'when') {
    // two mini scenarios side by side
    const a = relStack(260, 180, 2, 'blue');
    const ai = relStack(430, 170, 2, 'green', { rx: 44 });
    cap(345, 110, 'small outer + indexed inner');
    note(345, 300, 'a win  ✓');
    const d = edge([V(260 + 52, a.rows[0].y + 6), V(430 - 44, ai.rows[0].y + 6)], { arrow: true }); guides.push(d.guide); railIn = d.d;
    const b = relStack(700, 170, 5, 'rose', { rx: 48 });
    const bi = relStack(880, 160, 5, 'rose', { rx: 48 });
    cap(790, 110, 'two big unindexed tables');
    note(790, 320, 'a disaster  ✗');
    b.rows.forEach((br) => guides.push(edge([V(700 + 48, br.y + 4), V(880 - 48, bi.rows[2].y + 4)], { dashed: true }).guide));
  }

  else { // recap
    const op = opCube();
    const outer = relStack(OX, OY, 4, 'blue');
    const inner = relStack(IX, IY, 5, 'lilac', { match: 2 });
    cap(OX, outer.bottom + 70, 'users');
    cap(IX, inner.bottom + 70, 'orders');
    const e1 = edge([V(OX + 52, outer.rows[1].y), V(op.base[0] - 20, op.base[1] + 10), V(op.verts.W.x - 4, op.verts.W.y + 8)], { arrow: true });
    const e2 = edge([V(IX - 56, inner.rows[2].y), V(op.base[0] + 20, op.base[1] + 10), V(op.verts.E.x + 4, op.verts.E.y + 8)], { arrow: true });
    guides.push(e1.guide, e2.guide); railIn = e1.d;
    const out = isoTile(520, 300, 46, 'green', { h: 14 }); pushTile(out);
    cap(520, 360, 'matched pair');
    badges.push(pill(520, 430, 'always correct · often slow', { icon: 'check' }));
  }

  const flows = railIn ? [{ id: 'in', kind: 'read', speed: 150, size: 5 }] : [];
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
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Nested loop join">
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
