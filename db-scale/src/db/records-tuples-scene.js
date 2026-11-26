/* records-tuples-scene.js — the "Records & Tuples" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes & tiles, soft
   ground shadows, halos, pill badges, dashed logical regions, routed arrows,
   a faded iso grid and particle rails.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'row' (logical tuple → bytes), 'layout' (four record sections),
   'fixed-var' (fixed offsets vs variable tail), 'header' (null bitmap),
   'rowid' (packed page + row id), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;

const VW = 1040;

/* a flat caption under a tile/cube base */
function cap(cx, y, text) {
  return `<text class="sst-cap" x="${A(cx)}" y="${A(y)}" text-anchor="middle">${text}</text>`;
}

export function renderRecordsTuplesScene(snap, opts = {}) {
  const view = snap.view || 'row';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  let flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── ROW: a logical tuple that must become bytes ─────────────────────── */
  if (view === 'row') {
    const t = isoCube(360, 212, 98, 112, 'blue', {
      icon: 'listOrdered', label: 'users row', sub: 'id · name · email', halo: true,
    });
    shadows.push(t.shadow); halos.push(t.halo); solids.push(t.g);
    badges.push(pill(360, 92, 'a logical tuple', { icon: 'app', cls: 'pill--sst' }));

    const disk = isoTile(752, 300, 96, 'lilac', { h: 34 });
    shadows.push(disk.shadow); solids.push(disk.g);
    badges.push(cap(752, A(disk.base[1] + 16), 'flat bytes on disk'));
    badges.push(pill(752, 190, '? how are columns encoded ?', { icon: 'file', cls: 'pill--sst' }));

    const e = edge([
      V(t.verts.E.x - 2, t.front[1]),
      V((t.verts.E.x + disk.top[0]) / 2, t.front[1] + 6),
      V(disk.top[0] - 8, disk.top[1] - 2),
    ], { arrow: true, dashed: true });
    guides.push(e.guide); railIn = e.d;
    flows = [{ id: 'in', kind: 'write', speed: 150, size: 6 }];

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LAYOUT: the four sections of a record, left to right ─────────────── */
  if (view === 'layout') {
    badges.push(pill(VW / 2, 96, 'RECORD BYTE LAYOUT', { icon: 'file' }));
    badges.push(region(196, 168, 700, 176, '', { r: 22 }));

    const segs = [
      { cx: 300, mat: 'slate', icon: 'file',        lab: 'header',    cap: 'len · txn · flags' },
      { cx: 470, mat: 'amber', icon: 'grid',        lab: 'bitmap',    cap: 'null bits' },
      { cx: 640, mat: 'green', icon: 'key',         lab: 'fixed',     cap: 'int · bool' },
      { cx: 810, mat: 'lilac', icon: 'scroll',      lab: 'variable',  cap: 'varchar tail' },
    ];
    const cubes = segs.map(s => isoCube(s.cx, 234, 62, 64, s.mat, { icon: s.icon, label: s.lab, iconSize: 20 }));
    cubes.forEach((c, i) => {
      shadows.push(c.shadow); solids.push(c.g);
      badges.push(cap(segs[i].cx, A(c.base[1] + 14), segs[i].cap));
    });
    // thin arrows showing byte order left→right
    for (let i = 0; i < cubes.length - 1; i++) {
      const a = cubes[i], b = cubes[i + 1];
      const e = edge([V(a.verts.E.x - 4, a.front[1]), V(b.verts.W.x + 4, b.front[1])], { arrow: true });
      guides.push(e.guide);
    }
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows: [], note: snap.note });
  }

  /* ── FIXED-VAR: fixed offsets vs variable tail ───────────────────────── */
  if (view === 'fixed-var') {
    const fixed = isoCube(336, 224, 92, 104, 'green', { icon: 'key', label: 'fixed', sub: 'known offsets' });
    shadows.push(fixed.shadow); solids.push(fixed.g);
    badges.push(cap(336, A(fixed.base[1] + 15), 'read = jump to offset'));

    // offset ticks beside the fixed cube
    badges.push(pill(336, 104, 'INT @0 · BOOL @4 · ptr @5', { icon: 'listOrdered', cls: 'pill--sst' }));

    const vari = isoCube(716, 224, 92, 104, 'amber', { icon: 'scroll', label: 'variable', sub: 'len-prefixed' });
    shadows.push(vari.shadow); solids.push(vari.g);
    badges.push(cap(716, A(vari.base[1] + 15), 'stored in the tail'));
    badges.push(pill(716, 104, "'ada@x.io' · len=9", { icon: 'file', cls: 'pill--sst' }));

    // the fixed field holds a pointer INTO the variable tail
    const e = edge([
      V(fixed.verts.E.x - 2, fixed.front[1] + 8),
      V((fixed.verts.E.x + vari.verts.W.x) / 2, fixed.front[1] + 30),
      V(vari.verts.W.x + 4, vari.front[1] + 8),
    ], { arrow: true, dashed: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(cap(VW / 2, A(fixed.front[1] + 66), '(offset, length) pointer'));
    flows = [{ id: 'in', kind: 'read', speed: 170, size: 5 }];

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── HEADER: the null bitmap, one bit per column ─────────────────────── */
  if (view === 'header') {
    const hdr = isoCube(360, 222, 94, 100, 'slate', { icon: 'file', label: 'header', sub: 'len · txn · flags' });
    shadows.push(hdr.shadow); solids.push(hdr.g);
    badges.push(pill(360, 100, 'record header', { icon: 'file', cls: 'pill--sst' }));

    // a row of bit tiles = the null bitmap (0 = present green, 1 = null rose)
    const bits = [0, 0, 1, 0, 1, 0];
    const bx0 = 596, gap = 56;
    badges.push(pill(bx0 + (bits.length - 1) * gap / 2, 116, 'null bitmap · 1 bit / column', { icon: 'grid', cls: 'pill--sst' }));
    bits.forEach((bit, i) => {
      const t = isoTile(bx0 + i * gap, 236, 22, bit ? 'rose' : 'green', { h: 14 });
      shadows.push(t.shadow); solids.push(t.g);
      badges.push(`<text class="iso-pill__t" x="${A(bx0 + i * gap)}" y="${A(t.top[1] + 5)}" text-anchor="middle">${bit}</text>`);
      badges.push(cap(bx0 + i * gap, A(t.base[1] + 14), 'c' + (i + 1)));
    });
    badges.push(cap(bx0 + (bits.length - 1) * gap / 2, 320, 'c3 & c5 are NULL → 0 payload bytes'));

    const e = edge([V(hdr.verts.E.x - 2, hdr.front[1]), V(bx0 - 36, hdr.front[1]), V(bx0 - 36, 236)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    flows = [{ id: 'in', kind: 'read', speed: 160, size: 5 }];

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ROWID: records packed in a page, addressed by (page, slot) ──────── */
  if (view === 'rowid') {
    badges.push(region(432, 150, 436, 250, 'page 7', { r: 22 }));
    badges.push(pill(650, 134, '8 KB page', { icon: 'file' }));

    // four record tiles packed inside the page
    const recs = [
      isoTile(540, 220, 58, 'lilac', { h: 24 }),
      isoTile(760, 236, 58, 'lilac', { h: 24 }),
      isoTile(540, 320, 58, 'rose',  { h: 24 }),   // the addressed record (slot 3)
      isoTile(760, 336, 58, 'lilac', { h: 24 }),
    ];
    recs.forEach((t, i) => { shadows.push(t.shadow); solids.push(t.g); badges.push(cap(t.top[0], A(t.top[1] + 5), 'slot ' + i)); });

    // row id pointer from the left into slot 2 (the rose record)
    const idp = pill(228, 250, 'row id = (7, 2)', { icon: 'key', cls: 'pill--sst' });
    badges.push(idp);
    const target = recs[2];
    const e = edge([
      V(300, 250),
      V(400, 250),
      V(target.verts.W.x - 8, target.top[1]),
    ], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    flows = [{ id: 'in', kind: 'read', speed: 150, size: 6 }];

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the record, its sections, and its address ────────────────── */
  const rec = isoCube(430, 216, 104, 118, 'green', {
    icon: 'listOrdered', label: 'record', sub: 'bytes in a page', halo: true,
  });
  shadows.push(rec.shadow); halos.push(rec.halo); solids.push(rec.g);
  badges.push(cap(430, A(rec.base[1] + 16), 'one encoded tuple'));

  const tags = ['header + flags', 'null bitmap', 'fixed @ offsets', 'variable tail', 'row id = (page, slot)'];
  tags.forEach((t, i) => badges.push(pill(788, 96 + i * 54, t, { icon: 'check', w: 190 })));

  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows: [], note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--records-tuples" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Records and tuples byte layout">
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
