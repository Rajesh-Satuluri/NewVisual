/* concept-map-scene.js — the "Concept Map" scene, in the shared Designed-to-
   Scale isometric vocabulary: the eight course areas as rounded iso cubes wired
   into a dependency graph, with the current cluster lifted by a halo and a
   dashed region. Pill badges, routed connectors with arrows, a faded iso grid.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, flows, note }.

   Views: 'overview' (all eight areas connected), 'foundations', 'storage',
   'query', 'transactions', 'distributed' (each highlights one cluster), 'recap'
   (the whole stack, bottom to top). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* the eight areas — coordinates kept here, never read back off a cube */
const AREA = {
  foundations:  { x: 520, y: 448, label: 'Foundations', mat: 'slate', icon: 'book', sub: 'model · SQL' },
  storage:      { x: 320, y: 338, label: 'Storage', mat: 'lilac', icon: 'database', sub: 'pages · trees' },
  query:        { x: 720, y: 338, label: 'Query', mat: 'blue', icon: 'search', sub: 'plan · execute' },
  transactions: { x: 520, y: 270, label: 'Transactions', mat: 'amber', icon: 'merge', sub: 'ACID · locks' },
  replication:  { x: 300, y: 150, label: 'Replication', mat: 'green', icon: 'layers', sub: 'copies' },
  consensus:    { x: 560, y: 150, label: 'Consensus', mat: 'rose', icon: 'check', sub: 'agreement' },
  dataintensive:{ x: 820, y: 150, label: 'Data-Intensive', mat: 'green', icon: 'globe', sub: 'streams' },
  labs:         { x: 165, y: 258, label: 'Labs', mat: 'amber', icon: 'sliders', sub: 'hands-on' },
};

/* directed dependency edges: [child, parent] — child builds on / feeds parent */
const DEPS = [
  ['foundations', 'storage'], ['foundations', 'query'],
  ['storage', 'query'], ['storage', 'transactions'], ['query', 'transactions'],
  ['transactions', 'replication'], ['transactions', 'consensus'],
  ['storage', 'replication'], ['replication', 'dataintensive'], ['consensus', 'dataintensive'],
];

export function renderConceptMapScene(snap, opts = {}) {
  const view = snap.view || 'overview';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw an area cube; highlight → halo, dim → ghost
  const area = (key, state) => {
    const a = AREA[key];
    const c = isoCube(a.x, a.y, 58, 40, a.mat, {
      icon: a.icon, label: a.label, sub: a.sub, iconSize: 16,
      halo: state === 'on', ghost: state === 'dim',
    });
    shadows.push(c.shadow); if (state === 'on') halos.push(c.halo); solids.push(c.g);
  };

  // draw every dependency edge (arrow points child → parent, "builds on")
  const drawDeps = () => {
    DEPS.forEach(([c, p]) => {
      const C = AREA[c], P = AREA[p];
      const mid = V((C.x + P.x) / 2, (C.y + P.y) / 2);
      const e = edge([V(C.x, C.y - 22), mid, V(P.x, P.y + 40)], { arrow: true, r: 14 });
      guides.push(e.guide);
    });
  };

  // render the full map; `hot` is a Set of highlighted keys ('' → all plain)
  const drawMap = (hot) => {
    drawDeps();
    Object.keys(AREA).forEach(k => {
      const state = !hot ? 'plain' : hot.has(k) ? 'on' : 'dim';
      area(k, state);
    });
  };

  /* ── OVERVIEW: all eight areas, nothing dimmed ─────────────────────────── */
  if (view === 'overview') {
    drawMap(null);
    badges.push(pill(VW / 2, 508, 'every arrow means “builds on” — read the map bottom to top', { icon: 'layers', cls: 'pill--sst', w: 560 }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── FOUNDATIONS ───────────────────────────────────────────────────────── */
  if (view === 'foundations') {
    drawMap(new Set(['foundations']));
    badges.push(region(380, 410, 300, 86, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${AREA.foundations.x}" y="458" text-anchor="middle">THE DECLARATIVE BASE</text>`);
    badges.push(pill(AREA.foundations.x, 520, 'relational model + SQL — everything above assumes it', { icon: 'book', cls: 'pill--sst', w: 520 }));
    cap(VW / 2, 508, '');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── STORAGE ───────────────────────────────────────────────────────────── */
  if (view === 'storage') {
    drawMap(new Set(['foundations', 'storage']));
    badges.push(region(180, 300, 290, 90, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${AREA.storage.x}" y="348" text-anchor="middle">THE STORAGE TOWER</text>`);
    badges.push(pill(AREA.storage.x, 518, 'pages → buffer pool → B+tree / LSM → WAL', { icon: 'database', cls: 'pill--sst', w: 440 }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── QUERY ─────────────────────────────────────────────────────────────── */
  if (view === 'query') {
    drawMap(new Set(['foundations', 'storage', 'query']));
    badges.push(region(580, 300, 290, 90, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${AREA.query.x}" y="348" text-anchor="middle">RIDES ON STORAGE</text>`);
    badges.push(pill(AREA.query.x, 518, 'parse → plan → optimize → execute', { icon: 'search', cls: 'pill--sst', w: 400 }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── TRANSACTIONS ──────────────────────────────────────────────────────── */
  if (view === 'transactions') {
    drawMap(new Set(['storage', 'query', 'transactions']));
    badges.push(region(380, 232, 290, 80, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${AREA.transactions.x}" y="276" text-anchor="middle">THE KNOT</text>`);
    badges.push(pill(AREA.transactions.x, 508, 'ACID over the WAL · isolation over the pages', { icon: 'merge', cls: 'pill--sst', w: 460 }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DISTRIBUTED ───────────────────────────────────────────────────────── */
  if (view === 'distributed') {
    drawMap(new Set(['transactions', 'replication', 'consensus', 'dataintensive']));
    badges.push(region(220, 112, 680, 80, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="156" text-anchor="middle">COORDINATING MANY COPIES OF THE NODE</text>`);
    badges.push(pill(VW / 2, 508, 'replication ships the WAL · consensus decides what the copies agree on', { icon: 'globe', cls: 'pill--sst', w: 600 }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the whole stack, bottom to top ─────────────────────────────── */
  drawMap(null);
  badges.push(region(150, 100, 740, 420, '', { r: 26 }));
  badges.push(pill(VW / 2, 508, 'model → storage → queries → transactions → distribution', { icon: 'layers', cls: 'pill--sst', w: 560 }));
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
  <svg class="scene scene--concept-map" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Course concept map">
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
