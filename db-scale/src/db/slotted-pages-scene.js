/* slotted-pages-scene.js — the "Slotted Pages" layout scene, in the same
   Designed-to-Scale isometric vocabulary as the other lessons: a page drawn as
   a dashed region with four zones (header · slot directory · free space ·
   records), record and slot chips as small rounded iso tiles, pill labels,
   dashed logical bands, routed connectors with arrows, a faded iso grid and
   particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'problem' (byte-offset holes), 'layout' (the four zones),
   'indirection' (row id → slot → record), 'delete' (free a slot),
   'compact' (slide records, rewrite offsets), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* page frame geometry (axis-aligned, like the dbms disk regions) */
const PX0 = 182, PX1 = 884, PY0 = 150, PY1 = 388;
const SLOT_Y = 206;     // slot directory band baseline
const REC_Y = 322;      // record band baseline

/* a record chip = a flat rounded iso tile sized by its byte length */
function recChip(cx, cy, rx, mat, opts = {}) {
  return isoTile(cx, cy, rx, mat, { h: rx * 0.42, halo: opts.halo, pulse: opts.pulse });
}

export function renderSlottedPagesScene(snap, opts = {}) {
  const view = snap.view || 'layout';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── the page outline + header, shared by every "page" view ───────────── */
  const pageFrame = () => {
    badges.push(region(PX0, PY0, PX1 - PX0, PY1 - PY0, '', { r: 20 }));
    badges.push(pill((PX0 + PX1) / 2, PY0 - 4, 'one page · 8 KB', { icon: 'file', cls: 'pill--sst' }));
    // header column on the far left
    const hdr = recChip(PX0 + 52, (PY0 + PY1) / 2, 34, 'slate');
    shadows.push(hdr.shadow); solids.push(hdr.g);
    badges.push(`<text class="sst-cap" x="${A(PX0 + 52)}" y="${A((PY0 + PY1) / 2 + 2)}" text-anchor="middle">HDR</text>`);
  };

  /* ── PROBLEM: records by raw offset, a hole after a delete ────────────── */
  if (view === 'problem') {
    pageFrame();
    // variable-length records packed left→right; one deleted = rose hole
    const defs = [
      { rx: 46, mat: 'lilac', id: 'r0' },
      { rx: 64, mat: 'rose',  id: 'HOLE', hole: true },
      { rx: 34, mat: 'lilac', id: 'r2' },
      { rx: 56, mat: 'lilac', id: 'r3' },
    ];
    let x = PX0 + 150;
    defs.forEach(d => {
      const cx = x + d.rx;
      if (d.hole) {
        badges.push(region(cx - d.rx, REC_Y - 30, d.rx * 2, 60, '', { r: 12 }));
        badges.push(`<text class="sst-cap" x="${A(cx)}" y="${A(REC_Y + 2)}" text-anchor="middle">hole</text>`);
      } else {
        const c = recChip(cx, REC_Y, d.rx, d.mat);
        shadows.push(c.shadow); solids.push(c.g);
        badges.push(`<text class="sst-cap" x="${A(cx)}" y="${A(REC_Y + 2)}" text-anchor="middle">${esc(d.id)}</text>`);
      }
      x += d.rx * 2 + 14;
    });
    badges.push(pill((PX0 + PX1) / 2, REC_Y + 70, 'next insert will not fit this hole', { icon: 'alert' }));
    badges.push(`<text class="iso-region__t" x="${A((PX0 + PX1) / 2)}" y="${A(PY1 + 34)}" text-anchor="middle">ADDRESS BY BYTE OFFSET → RECORDS CAN NEVER MOVE</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null,
      flows: [], note: snap.note });
  }

  /* ── the four-zone slotted page (layout / indirection / delete / compact / recap) ── */
  pageFrame();

  // slot directory: small chips growing right from just after the header
  const slotDefs = view === 'compact'
    ? ['s0', 's1', 's3', 's4']
    : ['s0', 's1', 's2', 's3', 's4'];
  const freedSlot = (view === 'delete') ? 2 : -1;
  let sx = PX0 + 118;
  const slots = slotDefs.map((id, i) => {
    const cx = sx + 22;
    const freed = (freedSlot === i);
    const c = isoTile(cx, SLOT_Y, 22, freed ? 'rose' : 'blue', { h: 10 });
    shadows.push(c.shadow); solids.push(c.g);
    badges.push(`<text class="sst-cap" x="${A(cx)}" y="${A(SLOT_Y + 1)}" text-anchor="middle">${freed ? 'free' : id}</text>`);
    sx += 56;
    return { cx, cy: SLOT_Y, id, freed };
  });
  const slotRight = sx;
  badges.push(pill(PX0 + 210, PY0 + 24, 'slot directory  →', { icon: 'listOrdered' }));

  // records: variable-length chips growing LEFT from the right edge
  const recWidths = view === 'compact'
    ? [{ rx: 46, id: 'r0' }, { rx: 36, id: 'r1' }, { rx: 56, id: 'r3' }, { rx: 40, id: 'r4' }]
    : view === 'delete'
      ? [{ rx: 46, id: 'r0' }, { rx: 36, id: 'r1' }, { rx: 56, id: 'r3' }, { rx: 40, id: 'r4' }, { rx: 44, id: 'HOLE', hole: true }]
      : [{ rx: 46, id: 'r0' }, { rx: 36, id: 'r1' }, { rx: 50, id: 'r2' }, { rx: 56, id: 'r3' }, { rx: 40, id: 'r4' }];
  let rx = PX1 - 22;
  const recs = recWidths.map((d, i) => {
    const cx = rx - d.rx;
    if (d.hole) {
      badges.push(region(cx - d.rx, REC_Y - 28, d.rx * 2, 56, '', { r: 12 }));
      badges.push(`<text class="sst-cap" x="${A(cx)}" y="${A(REC_Y + 2)}" text-anchor="middle">freed</text>`);
    } else {
      const hot = (view === 'indirection' && d.id === 'r2');
      const c = recChip(cx, REC_Y, d.rx, hot ? 'amber' : 'lilac', { halo: hot });
      shadows.push(c.shadow); if (hot) halos.push(c.halo); solids.push(c.g);
      badges.push(`<text class="sst-cap" x="${A(cx)}" y="${A(REC_Y + 2)}" text-anchor="middle">${esc(d.id)}</text>`);
    }
    rx -= d.rx * 2 + 14;
    return { cx, cy: REC_Y, id: d.id, rx: d.rx, hole: d.hole };
  });
  const recLeft = rx;
  badges.push(pill(PX1 - 150, PY1 - 22, '←  records', { icon: 'database', cls: 'pill--sst' }));

  // free-space band between the slot directory end and the leftmost record
  const freeL = Math.max(slotRight + 8, PX0 + 300);
  const freeR = Math.min(recLeft - 8, PX1 - 40);
  if (freeR > freeL + 30) {
    badges.push(region(freeL, PY0 + 54, freeR - freeL, PY1 - PY0 - 108, 'free space', { r: 14 }));
  }

  /* ── view-specific overlays ───────────────────────────────────────────── */
  if (view === 'indirection') {
    // row id → slot 2 → record r2
    const slot = slots[2], rec = recs.find(r => r.id === 'r2');
    const idPill = pill(PX0 + 40, PY1 + 44, 'row id = (page, slot 2)', { icon: 'key' });
    badges.push(idPill);
    // arrow: id pill → slot 2
    const e1 = edge([V(PX0 + 120, PY1 + 44), V(slot.cx - 30, PY1 + 20), V(slot.cx, slot.cy + 14)], { arrow: true });
    guides.push(e1.guide); railIn = e1.d;
    // arrow: slot 2 → record r2
    if (rec) {
      const e2 = edge([V(slot.cx, slot.cy + 14), V((slot.cx + rec.cx) / 2, (SLOT_Y + REC_Y) / 2), V(rec.cx, rec.cy - rec.rx * 0.42 - 4)], { arrow: true, dashed: true });
      guides.push(e2.guide); railOut = e2.d;
      badges.push(`<text class="sst-cap" x="${A((slot.cx + rec.cx) / 2 + 24)}" y="${A((SLOT_Y + REC_Y) / 2)}" text-anchor="middle">offset + length</text>`);
    }
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  if (view === 'delete') {
    badges.push(pill((PX0 + PX1) / 2, PY1 + 40, 'slot 2 freed · bytes left as a hole · other ids unchanged', { icon: 'trash' }));
  }

  if (view === 'compact') {
    badges.push(pill((PX0 + PX1) / 2, PY1 + 40, 'records slid together · slot offsets rewritten · slot #s unchanged', { icon: 'merge' }));
    // a small write rail from the slot directory into the record area
    const e = edge([V(slots[0].cx, SLOT_Y + 14), V((slots[0].cx + recLeft) / 2, (SLOT_Y + REC_Y) / 2), V(recLeft + 20, REC_Y - 26)], { arrow: true, dashed: true });
    guides.push(e.guide); railOut = e.d;
  }

  if (view === 'recap') {
    const tags = [
      ['header', 'file'], ['slot directory', 'listOrdered'],
      ['free space', 'grid'], ['records', 'database'],
    ];
    tags.forEach(([t, ic], i) => badges.push(pill((PX0 + PX1) / 2 - 240 + i * 162, PY1 + 44, t, { icon: ic, w: 150 })));
  }

  const flows = railOut ? [{ id: 'out', kind: 'write', speed: 130, size: 6 }] : [];
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
  <svg class="scene scene--slotted-pages" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Slotted page layout">
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
