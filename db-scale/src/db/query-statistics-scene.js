/* query-statistics-scene.js — the "Query Statistics" scene, in the same
   Designed-to-Scale isometric vocabulary as the other Query-Engine lessons:
   a green Statistics cube on the left and a histogram of isometric bars whose
   heights are the per-bucket row counts. Views walk from the raw numbers, to
   the distribution, to selectivity, to stale stats, to a refresh.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note }.

   Views: 'what', 'histogram', 'selectivity', 'stale', 'refresh', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* histogram geometry — bars share a common base line, taller bars rise up */
const BAR_RX = 32, BASE_Y = 400;
function barX(i) { return 440 + i * 82; }
function bar(i, h, mat, opts = {}) {
  const cx = barX(i);
  const cy = BASE_Y - BAR_RX * 0.5 - h;   // keep the base of every bar on BASE_Y
  return isoCube(cx, cy, BAR_RX, h, mat, { r: 6, ghost: opts.ghost, pulse: opts.pulse, halo: opts.halo });
}

// stored distribution (row counts per bucket) and the true/shifted one for 'stale'
const HEIGHTS = [200, 175, 70, 38, 20, 10, 5];
const TRUE_HEIGHTS = [70, 90, 120, 150, 120, 80, 45];   // reality moved right
const RANGES = ['0–50', '50–100', '100–150', '150–200', '200–300', '300–500', '500+'];
const THRESH_IDX = 2;                                   // first bucket kept by total > 100

export function renderQueryStatisticsScene(snap, opts = {}) {
  const view = snap.view || 'what';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── Statistics cube (always present, left) ───────────────────────────── */
  const statsHalo = view === 'refresh';
  const stats = isoCube(170, 160, 78, 84, 'green', {
    icon: 'database', label: 'Statistics', sub: 'per column', halo: statsHalo,
    pulse: view === 'refresh',
  });
  shadows.push(stats.shadow); if (stats.halo) halos.push(stats.halo); solids.push(stats.g);

  /* ── the histogram bars ───────────────────────────────────────────────── */
  const kept = HEIGHTS.slice(THRESH_IDX).reduce((a, b) => a + b, 0);
  const totalH = HEIGHTS.reduce((a, b) => a + b, 0);
  const pct = Math.round(kept / totalH * 100);
  const threshX = (barX(THRESH_IDX - 1) + barX(THRESH_IDX)) / 2 + BAR_RX * 0.5;

  const faint = view === 'what';
  const bars = HEIGHTS.map((h, i) => {
    let mat = 'blue', ghost = faint;
    if (view === 'selectivity') { mat = i >= THRESH_IDX ? 'green' : 'blue'; ghost = i < THRESH_IDX; }
    return bar(i, h, mat, { ghost });
  });
  bars.forEach(b => { shadows.push(b.shadow); solids.push(b.g); });

  // value-range captions under the bars (skip on 'what', where bars are faint)
  if (view !== 'what' && view !== 'stale') {
    RANGES.forEach((r, i) => {
      badges.push(`<text class="sst-cap" x="${A(barX(i))}" y="${A(BASE_Y + 24)}" text-anchor="middle">${esc(r)}</text>`);
    });
  }

  /* ── per-view content ─────────────────────────────────────────────────── */
  if (view === 'what') {
    const facts = ['rows  142,000', 'distinct  9,240', 'nulls  0%', 'min 0 · max 920'];
    facts.forEach((t, i) => badges.push(pill(770, 112 + i * 52, t, { icon: 'listOrdered', w: 230 })));
    badges.push(`<text class="iso-region__t" x="660" y="470" text-anchor="middle">a few numbers stand in for the whole column</text>`);
  }

  if (view === 'histogram') {
    badges.push(pill(686, 92, 'value distribution', { icon: 'layers' }));
    const e = edge([
      V(stats.verts.E.x - 2, stats.top[1] + 4),
      V((stats.verts.E.x + barX(0)) / 2, 300),
      V(barX(0) - 36, 340),
    ], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(`<text class="sst-cap" x="686" y="${A(BASE_Y + 46)}" text-anchor="middle">buckets by value →</text>`);
  }

  if (view === 'selectivity') {
    // threshold line cutting the histogram at the 100 boundary
    const line = edge([V(threshX, 120), V(threshX, BASE_Y + 8)], { dashed: true });
    guides.push(line.guide);
    badges.push(pill(threshX, 104, 'total > 100', { icon: 'search', cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="760" y="150" text-anchor="middle">≈ ${pct}% of rows match</text>`);
    badges.push(`<text class="sst-cap" x="520" y="150" text-anchor="middle">discarded</text>`);
    // a read rail along the surviving buckets
    const e = edge([V(barX(THRESH_IDX) - 30, 200), V(barX(6) + 20, 210)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
  }

  if (view === 'stale') {
    // overlay the true (shifted) distribution as rose ghost bars, nudged right
    const trueBars = TRUE_HEIGHTS.map((h, i) => {
      const cx = barX(i) + 16;
      const cy = BASE_Y - BAR_RX * 0.5 - h;
      return isoCube(cx, cy, BAR_RX * 0.8, h, 'rose', { r: 6, ghost: true });
    });
    trueBars.forEach(b => { shadows.push(b.shadow); solids.push(b.g); });
    badges.push(pill(690, 92, 'stale stats → bad estimate', { icon: 'alert' }));
    badges.push(`<text class="iso-region__t" x="690" y="470" text-anchor="middle">data moved — the stored stats did not</text>`);
    badges.push(`<text class="sst-cap" x="430" y="150" text-anchor="middle">stored</text>`);
    badges.push(`<text class="sst-cap" x="860" y="200" text-anchor="middle">reality</text>`);
  }

  if (view === 'refresh') {
    // a sample tile feeding back into the stats cube
    const sample = isoTile(560, 300, 60, 'lilac', {});
    shadows.push(sample.shadow); solids.push(sample.g);
    badges.push(`<text class="sst-cap" x="560" y="${A(sample.base[1] + 14)}" text-anchor="middle">random sample</text>`);
    const e = edge([
      V(sample.verts.W.x + 6, sample.top[1] + 2),
      V((sample.verts.W.x + stats.verts.E.x) / 2, 250),
      V(stats.verts.E.x - 4, stats.top[1] + 6),
    ], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(pill(690, 92, 'ANALYZE samples the table', { icon: 'search' }));
    badges.push(`<text class="iso-region__t" x="690" y="470" text-anchor="middle">stats refreshed — estimates line up again</text>`);
  }

  if (view === 'recap') {
    badges.push(pill(690, 92, 'good stats → good plans', { icon: 'check' }));
    const e = edge([
      V(stats.verts.E.x - 2, stats.top[1] + 4),
      V((stats.verts.E.x + barX(0)) / 2, 300),
      V(barX(0) - 36, 340),
    ], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(`<text class="iso-region__t" x="690" y="470" text-anchor="middle">the optimizer’s model of your data</text>`);
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
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Query statistics scene">
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
