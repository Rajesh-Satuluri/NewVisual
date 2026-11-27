/* glossary-scene.js — the "Glossary" scene, in the shared Designed-to-Scale
   isometric vocabulary.

   Each view is one theme: a labelled theme cube over a dashed region holding
   that theme's essential terms as two tidy columns of pill labels.

   Input: a view-snapshot { view, note, ... }. Output: { svg, layer, rail,
   note, flows }.

   Views: 'storage', 'query', 'txn', 'distributed', 'dataint', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderGlossaryScene(snap, opts = {}) {
  const view = snap.view || 'storage';

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
  const opTile = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 34, o.h || 20, mat, {
      icon: o.icon || '', label, iconSize: 13, ghost: !!o.ghost, halo: !!o.halo,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // shared theme layout: one cube + a two-column grid of term pills
  const themeView = (title, ic, mat, terms, caption) => {
    node(VW / 2, 178, title, mat, { icon: ic, sub: terms.length + ' terms', rx: 60, h: 44, halo: true });
    badges.push(region(175, 248, 690, 250, '', { r: 24 }));
    const per = Math.ceil(terms.length / 2);
    terms.forEach((t, i) => {
      const col = i < per ? 0 : 1;
      const row = col === 0 ? i : i - per;
      const x = col === 0 ? 355 : 685;
      const y = 300 + row * 44;
      badges.push(pill(x, y, t, { icon: 'chevron', cls: 'pill--sst', w: 280 }));
    });
    cap(VW / 2, 500, caption);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  };

  if (view === 'storage') {
    return themeView('Storage engine', 'database', 'blue',
      ['Page', 'Tuple', 'Slotted page', 'Buffer pool', 'WAL', 'B+Tree', 'LSM-Tree', 'SSTable', 'Bloom filter'],
      'how bytes live on disk and get cached');
  }

  if (view === 'query') {
    return themeView('Query processing', 'search', 'green',
      ['Parser', 'AST', 'Logical plan', 'Physical plan', 'Optimizer', 'Cost model', 'Join algorithm', 'EXPLAIN'],
      'how a SQL string becomes a running plan');
  }

  if (view === 'txn') {
    return themeView('Transactions', 'merge', 'amber',
      ['ACID', 'MVCC', 'Isolation level', '2PL', 'Deadlock', 'Checkpoint', 'Vacuum', 'Dead tuple'],
      'correctness under concurrency and crashes');
  }

  if (view === 'distributed') {
    return themeView('Distributed', 'server', 'lilac',
      ['Replication', 'Leader/follower', 'Quorum', 'Partition/shard', 'Consistent hashing', 'Consensus', 'Raft', 'CAP', 'Split-brain'],
      'many nodes copying, splitting and agreeing');
  }

  if (view === 'dataint') {
    return themeView('Data-intensive', 'listOrdered', 'rose',
      ['OLTP', 'OLAP', 'CDC', 'Event log', 'Stream', 'Batch', 'Materialized view'],
      'systems built on top of databases');
  }

  /* ── RECAP: the five themes ────────────────────────────────────────────── */
  node(VW / 2, 168, 'Glossary', 'slate', { icon: 'book', sub: 'five themes', rx: 58, h: 42, halo: true });
  badges.push(region(205, 240, 630, 250, '', { r: 24 }));
  const themes = [
    ['Storage engine', 'database'],
    ['Query processing', 'search'],
    ['Transactions', 'merge'],
    ['Distributed', 'server'],
    ['Data-intensive', 'listOrdered'],
  ];
  themes.forEach(([t, ic], i) => badges.push(pill(VW / 2, 290 + i * 42, t, { icon: ic, cls: 'pill--sst', w: 360 })));
  cap(VW / 2, 500, 'learn each term beside its theme, not alone');
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
  <svg class="scene scene--glossary" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Glossary">
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
