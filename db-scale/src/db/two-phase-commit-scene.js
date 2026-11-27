/* two-phase-commit-scene.js — the "Two-Phase Commit" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'problem' (nodes decide alone → torn), 'prepare' (phase 1 votes),
   'commit' (phase 2 global commit), 'abort' (one NO → global abort),
   'blocking' (coordinator crash freezes participants), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* coordinator up top, three participants in a row below */
const COORD = { cx: 520, cy: 118, rx: 92, h: 60 };
const PART = [
  { cx: 212, cy: 400 },
  { cx: 520, cy: 400 },
  { cx: 828, cy: 400 },
];
const PRX = 70, PH = 56;

export function renderTwoPhaseCommitScene(snap, opts = {}) {
  const view = snap.view || 'problem';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  /* ── per-view configuration ─────────────────────────────────────────────── */
  // coordinator state
  let coordMat = 'green', coordLabel = 'Coordinator', coordSub = 'decides', coordDead = false, coordHalo = true;
  // participant materials + under-pills
  let partMat = ['blue', 'blue', 'blue'];
  let partPill = [null, null, null];
  // arrow mode: 'down' (coordinator → participants, read), 'apply' (write), 'none'
  let arrows = 'none', arrowKind = 'read', arrowDashed = false;

  if (view === 'problem') {
    coordMat = 'slate'; coordSub = 'none yet'; coordHalo = false;
    partMat = ['green', 'rose', 'green'];
    partPill = ['COMMIT', 'ABORT', 'COMMIT'];
  } else if (view === 'prepare') {
    coordSub = 'asks PREPARE';
    partMat = ['amber', 'amber', 'amber'];
    partPill = ['vote YES', 'vote YES', 'vote YES'];
    arrows = 'down'; arrowKind = 'read';
  } else if (view === 'commit') {
    coordSub = 'COMMIT';
    partMat = ['green', 'green', 'green'];
    partPill = ['applied', 'applied', 'applied'];
    arrows = 'apply'; arrowKind = 'write';
  } else if (view === 'abort') {
    coordMat = 'amber'; coordSub = 'ABORT';
    partMat = ['slate', 'rose', 'slate'];
    partPill = ['rolled back', 'vote NO', 'rolled back'];
    arrows = 'apply'; arrowKind = 'write'; arrowDashed = true;
  } else if (view === 'blocking') {
    coordMat = 'rose'; coordLabel = 'Coordinator'; coordSub = 'CRASHED'; coordDead = true; coordHalo = false;
    partMat = ['amber', 'amber', 'amber'];
    partPill = ['locked · waiting', 'locked · waiting', 'locked · waiting'];
    arrows = 'none';
  } else { // recap
    coordSub = 'one decision';
    partMat = ['green', 'green', 'green'];
    partPill = ['in sync', 'in sync', 'in sync'];
    arrows = 'apply'; arrowKind = 'write';
  }

  /* ── coordinator ────────────────────────────────────────────────────────── */
  const coord = isoCube(COORD.cx, COORD.cy, COORD.rx, COORD.h, coordMat, {
    icon: coordDead ? 'alert' : 'merge', label: coordLabel, sub: coordSub, iconSize: 22,
    halo: coordHalo,
  });
  shadows.push(coord.shadow); if (coordHalo) halos.push(coord.halo); solids.push(coord.g);
  if (coordDead) {
    badges.push(`<text class="iso-region__t" x="${A(COORD.cx)}" y="${A(COORD.cy - COORD.h - 18)}" text-anchor="middle">✕ NO DECISION SENT</text>`);
  }

  /* ── participants ───────────────────────────────────────────────────────── */
  const parts = PART.map((p, i) => {
    const c = isoCube(p.cx, p.cy, PRX, PH, partMat[i], {
      icon: 'database', label: 'Node ' + (i + 1), sub: 'participant', iconSize: 20,
    });
    shadows.push(c.shadow); solids.push(c.g);
    if (partPill[i]) {
      const warn = /NO|ABORT|rolled|locked/.test(partPill[i]);
      badges.push(pill(p.cx, c.base[1] + 34, partPill[i], {
        icon: warn ? 'alert' : 'check', cls: 'pill--sst',
      }));
    }
    return c;
  });

  /* ── arrows coordinator ⇄ participants ──────────────────────────────────── */
  if (arrows !== 'none') {
    parts.forEach((c, i) => {
      const from = V(coord.base[0] + (i - 1) * 10, coord.base[1] - 4);
      const mid = V((coord.base[0] + c.top[0]) / 2, (coord.base[1] + c.top[1]) / 2);
      const to = V(c.top[0], c.top[1] - 2);
      const e = edge([from, mid, to], { arrow: true, dashed: arrowDashed });
      guides.push(e.guide);
      if (i === 0) { if (arrowKind === 'read') railIn = e.d; else railOut = e.d; }
    });
    const label = arrows === 'down' ? 'PREPARE →  ← vote'
      : view === 'abort' ? 'ABORT → roll back'
        : view === 'recap' ? 'one decision, applied everywhere'
          : 'COMMIT → apply';
    badges.push(pill(COORD.cx, 220, label, { icon: arrows === 'down' ? 'search' : 'check', cls: 'pill--sst' }));
    flows.push({ id: arrowKind === 'read' ? 'in' : 'out', kind: arrowKind, speed: 150, size: 5 });
  }

  /* ── per-view overlays ──────────────────────────────────────────────────── */
  if (view === 'problem') {
    badges.push(region(96, 300, 848, 214, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="${A(520)}" y="${A(498)}" text-anchor="middle">NO AGREEMENT · TORN STATE</text>`);
    badges.push(pill(COORD.cx, 220, 'each node decides alone', { icon: 'alert', cls: 'pill--sst' }));
  } else if (view === 'prepare') {
    badges.push(cap(520, 500, 'all prepared & locked — nothing committed yet'));
  } else if (view === 'commit') {
    badges.push(cap(520, 500, 'every node durable — the transaction is visible everywhere'));
  } else if (view === 'abort') {
    badges.push(cap(520, 500, 'one NO discards everyone’s work'));
  } else if (view === 'blocking') {
    badges.push(region(96, 320, 848, 180, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="${A(520)}" y="${A(486)}" text-anchor="middle">BLOCKED · LOCKS HELD · NO PROGRESS</text>`);
    badges.push(pill(COORD.cx, 230, 'crashed after the votes', { icon: 'alert', cls: 'pill--sst' }));
  } else if (view === 'recap') {
    const tags = ['prepare: unanimous promise', 'commit: one global decision', 'atomic across all nodes', 'coordinator = single point of failure'];
    tags.forEach((t, i) => badges.push(pill(820, 108 + i * 54, t, { icon: i === 3 ? 'alert' : 'check', w: 316 })));
  }

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
  <svg class="scene scene--two-phase-commit" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Two-phase commit across nodes">
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
