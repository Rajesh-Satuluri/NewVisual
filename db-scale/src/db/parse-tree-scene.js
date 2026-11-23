/* parse-tree-scene.js — the "Parse Tree" scene, in the same Designed-to-Scale
   isometric vocabulary as the DBMS/LSM lessons: rounded iso cubes as tree
   nodes, routed connectors as branches, a faded iso grid, particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'concrete' (whole grammar tree), 'rules' (interior = rules),
   'leaves' (tokens), 'verbose' (noise greyed), 'walk' (traversal), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* the parse tree for:
   SELECT name FROM users JOIN orders ON users.id = orders.user_id WHERE orders.total > 100
   (a representative subtree — enough to show rule nodes vs token leaves) */
const SPEC = [
  { id: 'query',       x: 540, y: 70,  kind: 'rule', label: 'query' },
  { id: 'selectList',  x: 300, y: 190, kind: 'rule', label: 'selectList' },
  { id: 'fromClause',  x: 540, y: 190, kind: 'rule', label: 'fromClause' },
  { id: 'whereClause', x: 780, y: 190, kind: 'rule', label: 'whereClause' },
  { id: 'kwSelect',    x: 230, y: 322, kind: 'kw',   label: 'SELECT' },
  { id: 'name',        x: 370, y: 322, kind: 'id',   label: 'name' },
  { id: 'kwFrom',      x: 480, y: 322, kind: 'kw',   label: 'FROM' },
  { id: 'users',       x: 600, y: 322, kind: 'id',   label: 'users' },
  { id: 'kwWhere',     x: 720, y: 322, kind: 'kw',   label: 'WHERE' },
  { id: 'predicate',   x: 860, y: 322, kind: 'rule', label: 'predicate' },
  { id: 'total',       x: 760, y: 454, kind: 'id',   label: 'total' },
  { id: 'gt',          x: 860, y: 454, kind: 'op',   label: '>' },
  { id: 'lit',         x: 960, y: 454, kind: 'lit',  label: '100' },
];
const EDGES = [
  ['query', 'selectList'], ['query', 'fromClause'], ['query', 'whereClause'],
  ['selectList', 'kwSelect'], ['selectList', 'name'],
  ['fromClause', 'kwFrom'], ['fromClause', 'users'],
  ['whereClause', 'kwWhere'], ['whereClause', 'predicate'],
  ['predicate', 'total'], ['predicate', 'gt'], ['predicate', 'lit'],
];

export function renderParseTreeScene(snap, opts = {}) {
  const view = snap.view || 'concrete';
  const shadows = [], halos = [], solids = [], overlays = [], badges = [], guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  const isRule = n => n.kind === 'rule';
  const matFor = (n) => {
    if (view === 'leaves') return isRule(n) ? 'slate' : 'lilac';
    return isRule(n) ? 'amber' : 'slate';
  };
  const ghostFor = (n) => view === 'verbose' && (n.kind === 'kw' || n.kind === 'op');
  const rxFor = n => isRule(n) ? 42 : 38;

  // build nodes
  const built = {};
  SPEC.forEach(n => {
    built[n.id] = isoCube(n.x, n.y, rxFor(n), 44, matFor(n), {
      label: n.label, ghost: ghostFor(n), r: 10,
    });
  });
  SPEC.forEach(n => shadows.push(built[n.id].shadow));
  SPEC.forEach(n => solids.push(built[n.id].g));

  // tree branches (parent base → child top)
  EDGES.forEach(([p, ch]) => {
    const a = built[p], b = built[ch];
    const e = edge([V(a.base[0], a.base[1] - 4), V(b.top[0], b.top[1])], {});
    guides.push(e.guide);
    if (p === 'query' && ch === 'fromClause') railIn = e.d;
  });

  // per-view annotations
  if (view === 'concrete') {
    badges.push(pill(540, 540, 'parse tree = the grammar, exactly', { icon: 'merge', cls: 'pill--sst' }));
  } else if (view === 'rules') {
    badges.push(pill(540, 540, 'interior nodes = grammar rules', { icon: 'merge' }));
    badges.push(`<text class="sst-cap" x="300" y="148" text-anchor="middle">rule</text>`);
    badges.push(`<text class="sst-cap" x="780" y="148" text-anchor="middle">rule</text>`);
  } else if (view === 'leaves') {
    badges.push(pill(540, 540, 'leaves = literal tokens', { icon: 'file' }));
    badges.push(`<text class="iso-region__t" x="475" y="410" text-anchor="middle">keywords &amp; punctuation are leaves too</text>`);
  } else if (view === 'verbose') {
    badges.push(pill(540, 540, 'verbose: keeps noise the AST drops', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="475" y="410" text-anchor="middle">greyed leaves are pure syntax</text>`);
  } else if (view === 'walk') {
    badges.push(pill(540, 540, 'traverse the structure', { icon: 'search' }));
    const order = ['query', 'selectList', 'name', 'fromClause', 'users', 'whereClause', 'predicate', 'lit'];
    const pts = order.map(id => V(built[id].front[0], built[id].front[1]));
    const e = edge(pts, { dashed: true });
    guides.push(e.guide);
    railIn = e.d;
  } else if (view === 'recap') {
    badges.push(pill(540, 540, 'precise — but bulky', { icon: 'gauge', cls: 'pill--sst' }));
  }

  const flows = railIn ? [{ id: 'in', kind: 'read', speed: 150, size: 5 }] : [];
  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
}

/* stitch the SVG together in the shared layer order (verbatim from dbms-scene) */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="SQL parse tree">
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
