/* table-scan-scene.js — the "Table Scan" access-method scene, in the shared
   Designed-to-Scale isometric vocabulary: a table drawn as a row of page tiles,
   a scan cursor sweeping across them, and a σ filter that keeps a few rows and
   discards the rest.

   Input: a view-snapshot { view, note, pulse }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'seq', 'pages', 'filter', 'whenok', 'whenbad', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const PN = 8;                 // pages in the table
const PX0 = 300, PDX = 96;    // first page x, page spacing
const PY = 300;               // page row y

export function renderTableScanScene(snap, opts = {}) {
  const view = snap.view || 'seq';
  const pulse = snap.pulse || opts.pulse || null;

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* operator cube helper */
  const op = (cx, cy, label, sub, icon, mat = 'amber') =>
    isoCube(cx, cy, 48, 54, mat, { icon, label, sub, iconSize: 20, pulse: pulse === label });

  /* ── client on the left ─────────────────────────────────────────────── */
  const client = isoCube(140, 150, 50, 58, 'blue', { icon: 'app', label: 'Query', sub: 'scan', iconSize: 24 });
  shadows.push(client.shadow); solids.push(client.g);

  /* ── the table: a row of page tiles ─────────────────────────────────── */
  const pages = [];
  for (let i = 0; i < PN; i++) {
    const tone = view === 'whenbad' ? (i === PN - 1 ? 'green' : 'rose')
      : view === 'whenok' ? 'green'
      : 'lilac';
    const t = isoTile(PX0 + i * PDX, PY, 40, tone);
    pages.push(t); shadows.push(t.shadow); solids.push(t.g);
  }
  const firstX = pages[0].top[0], lastX = pages[PN - 1].top[0];

  /* client → table (static feed) */
  const ce = edge([
    V(client.verts.E.x - 2, client.front[1]),
    V(240, 276),
    V(firstX - 40, 276),
  ], { arrow: true, dashed: true });
  guides.push(ce.guide);

  /* ── FILTER view: pages → σ → kept / discarded ──────────────────────── */
  if (view === 'filter') {
    const sg = op(560, 162, 'σ', 'total > 100', 'search');
    shadows.push(sg.shadow); solids.push(sg.g);

    // pages up into σ (this carries the read particles)
    const up = edge([V(560, 292), V(560, 238)], { arrow: true });
    guides.push(up.guide); railIn = up.d;

    // kept rows (green, upper right)
    const kept = [isoTile(878, 150, 34, 'green'), isoTile(916, 178, 34, 'green')];
    kept.forEach(k => { shadows.push(k.shadow); solids.push(k.g); });
    const ke = edge([V(sg.verts.E.x, sg.front[1]), V(760, 150), V(kept[0].top[0] - 22, kept[0].top[1])], { arrow: true });
    guides.push(ke.guide);

    // discarded rows (rose, lower right)
    const disc = [isoTile(838, 428, 30, 'rose'), isoTile(884, 450, 30, 'rose'), isoTile(930, 424, 30, 'rose'), isoTile(866, 474, 30, 'rose')];
    disc.forEach(d => { shadows.push(d.shadow); solids.push(d.g); });
    const de = edge([V(sg.base[0] + 6, sg.base[1] - 10), V(720, 404), V(840, 430)], { arrow: true, dashed: true });
    guides.push(de.guide);

    badges.push(pill(300, 150, 'WHERE total > 100', { icon: 'search', cls: 'pill--sst' }));
    badges.push(pill(878, 112, 'kept', { icon: 'check', w: 96 }));
    badges.push(`<text class="iso-region__t" x="884" y="516" text-anchor="middle">most rows read, then discarded</text>`);
    badges.push(`<text class="sst-cap" x="${A((firstX + lastX) / 2)}" y="${A(pages[0].base[1] + 22)}" text-anchor="middle">page 1  …  page ${PN}</text>`);

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── all other views: a scan cursor sweeps the page row ─────────────── */
  const sweep = edge([
    V(firstX - 40, 276), V(firstX, 276), V(lastX, 276), V(lastX + 40, 276),
  ], { arrow: true });
  guides.push(sweep.guide); railIn = sweep.d;

  if (view === 'pages') {
    // hint the rows packed inside the first few pages
    for (let p = 0; p < 3; p++) {
      for (let k = 0; k < 3; k++) {
        const r = isoTile(pages[p].top[0], pages[p].top[1] - 6 - k * 9, 22, 'slate', { h: 5 });
        solids.push(r.g);
      }
    }
    badges.push(region(262, 250, 300, 118, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="412" y="240" text-anchor="middle">whole pages, not single rows</text>`);
    badges.push(pill(690, 150, 'pages → buffer pool', { icon: 'layers' }));
    badges.push(`<text class="sst-cap" x="${A((firstX + lastX) / 2)}" y="${A(pages[0].base[1] + 22)}" text-anchor="middle">8 KB each · rows packed inside</text>`);
  } else if (view === 'whenbad') {
    badges.push(pill(648, 150, 'unselective = wasteful', { icon: 'alert' }));
    badges.push(`<text class="iso-region__t" x="${A((firstX + lastX) / 2)}" y="440" text-anchor="middle">read every page to return a single row</text>`);
    badges.push(`<text class="sst-cap" x="${A(lastX)}" y="${A(pages[PN - 1].base[1] + 22)}" text-anchor="middle">1 match</text>`);
  } else if (view === 'whenok') {
    badges.push(pill(648, 150, 'touches most rows → scan is best', { icon: 'check' }));
    badges.push(`<text class="sst-cap" x="${A((firstX + lastX) / 2)}" y="${A(pages[0].base[1] + 22)}" text-anchor="middle">sequential I/O — cheapest access pattern</text>`);
  } else if (view === 'recap') {
    badges.push(pill(648, 150, 'simple; right for big reads', { icon: 'check' }));
    badges.push(`<text class="sst-cap" x="${A((firstX + lastX) / 2)}" y="${A(pages[0].base[1] + 22)}" text-anchor="middle">read it all, filter as you go</text>`);
  } else { // seq
    badges.push(pill(648, 150, 'read every page', { icon: 'file' }));
    badges.push(`<text class="sst-cap" x="${A((firstX + lastX) / 2)}" y="${A(pages[0].base[1] + 22)}" text-anchor="middle">page 1  …  page ${PN}</text>`);
  }

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
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Table scan access method">
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
