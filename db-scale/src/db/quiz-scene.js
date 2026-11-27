/* quiz-scene.js — the "Course Quiz" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes with icon glyphs and labels, soft
   ground shadows, halos, pill badges, dashed logical regions, a faded iso grid.

   Input: a view-snapshot { view, q, prompt, options[], correct, note }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'q1'…'q6' (a question card: the options as A–D cubes, the correct one
   haloed green), 'recap' (the mechanisms checked). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function renderQuizScene(snap, opts = {}) {
  const view = snap.view || 'q1';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'app', label, sub: o.sub || '', iconSize: o.iconSize || 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── QUESTION CARD: options as A–D cubes, correct one haloed green ─────── */
  if (view !== 'recap') {
    const options = Array.isArray(snap.options) ? snap.options : [];
    const correct = typeof snap.correct === 'number' ? snap.correct : -1;
    const n = options.length || 4;

    // question card
    badges.push(region(180, 120, 680, 96, '', { r: 22 }));
    badges.push(pill(VW / 2, 150, 'Q' + (snap.q || '') + ' · pick one', { icon: 'target', cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="196" text-anchor="middle">${esc((snap.prompt || '').toUpperCase())}</text>`);

    // option cubes, centred row
    const span = Math.min(760, n * 200);
    const step = n > 1 ? span / (n - 1) : 0;
    const startX = VW / 2 - span / 2;
    const oy = 370;
    options.forEach((opt, i) => {
      const x = n > 1 ? startX + i * step : VW / 2;
      const right = i === correct;
      node(x, oy, LETTERS[i], right ? 'green' : 'slate', {
        icon: right ? 'check' : 'file',
        sub: opt,
        rx: Math.min(66, (span / n) * 0.44 + 24), h: 42,
        halo: right, ghost: !right,
      });
    });
    badges.push(pill(VW / 2, 470, 'correct answer: ' + (correct >= 0 ? LETTERS[correct] : '?'), { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 508, 'reveal the why in the callout — not just the letter');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the six mechanisms checked ─────────────────────────────────── */
  const checks = [
    { x: 230, label: 'LSM write', icon: 'wal', mat: 'green' },
    { x: 423, label: 'tree height', icon: 'layers', mat: 'blue' },
    { x: 616, label: 'isolation', icon: 'merge', mat: 'amber' },
    { x: 809, label: 'MVCC', icon: 'layers', mat: 'lilac' },
  ];
  checks.forEach(c => node(c.x, 230, c.label, c.mat, { icon: c.icon, sub: '✓', rx: 50, h: 40, halo: true }));
  node(330, 400, 'replication lag', 'rose', { icon: 'clock', sub: '✓', rx: 56, h: 38, halo: true });
  node(700, 400, 'Raft quorum', 'green', { icon: 'check', sub: '✓', rx: 56, h: 38, halo: true });
  badges.push(region(150, 150, 740, 160, 'six mechanisms, six sentences', { r: 24 }));
  cap(VW / 2, 480, 'explain the why in one line each — re-run the ones you missed');
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
  <svg class="scene scene--quiz" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Course quiz">
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
