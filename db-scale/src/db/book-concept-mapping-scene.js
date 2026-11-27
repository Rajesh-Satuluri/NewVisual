/* book-concept-mapping-scene.js — the "Book Concept Mapping" scene, in the
   shared Designed-to-Scale isometric vocabulary.

   A reference page's scene is a clean visual index: a book cube and its parts
   on the left, the matching course lessons on the right, joined by a "maps to"
   arrow, all grouped in dashed regions with pill labels.

   Input: a view-snapshot { view, note, ... }. Output: { svg, layer, rail,
   note, flows }.

   Views: 'overview' (both books), 'di-storage', 'di-distributed',
   'ddia-single', 'ddia-distributed', 'ddia-derived', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderBookConceptMappingScene(snap, opts = {}) {
  const view = snap.view || 'overview';

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

  // shared "book part → course lessons" mapping layout
  const mapView = (L, R, caption) => {
    // left: the book part
    badges.push(region(165, 150, 330, 338, '', { r: 22 }));
    node(330, 206, L.title, 'blue', { icon: 'book', sub: L.sub, rx: 58, h: 46, halo: true });
    L.items.forEach((t, i) => badges.push(pill(330, 302 + i * 42, t, { cls: 'pill--sst', w: 290 })));
    // right: the matching course lessons
    badges.push(region(545, 150, 330, 338, '', { r: 22 }));
    node(710, 206, R.title, 'green', { icon: 'layers', sub: R.sub, rx: 58, h: 46 });
    R.items.forEach((t, i) => badges.push(pill(710, 302 + i * 42, t, { icon: 'check', w: 290 })));
    // the mapping arrow
    const e = edge([V(498, 250), V(520, 250), V(542, 250)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(520, 206, 'maps to', { icon: 'merge', cls: 'pill--sst' }));
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 5 });
    cap(VW / 2, 500, caption);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  };

  /* ── OVERVIEW: the two books side by side with their parts ──────────────── */
  if (view === 'overview') {
    badges.push(region(170, 150, 320, 340, '', { r: 22 }));
    node(330, 214, 'Database Internals', 'blue', { icon: 'book', sub: 'A. Petrov', rx: 62, h: 48, halo: true });
    ['Part I · Storage Engines', 'Part II · Distributed Systems'].forEach((t, i) =>
      badges.push(pill(330, 328 + i * 44, t, { icon: 'database', cls: 'pill--sst', w: 272 })));
    badges.push(region(550, 150, 320, 340, '', { r: 22 }));
    node(710, 214, 'Designing DIA', 'green', { icon: 'book', sub: 'M. Kleppmann', rx: 62, h: 48, halo: true });
    ['Part I · Foundations', 'Part II · Distributed Data', 'Part III · Derived Data'].forEach((t, i) =>
      badges.push(pill(710, 320 + i * 42, t, { icon: 'layers', cls: 'pill--sst', w: 272 })));
    cap(VW / 2, 500, 'how it works · how to design with it');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DATABASE INTERNALS · Part I → storage engines ─────────────────────── */
  if (view === 'di-storage') {
    return mapView(
      { title: 'DI · Part I', sub: 'Storage Engines', items: ['B-Trees', 'Log-Structured (LSM)', 'Pages & file layout', 'Buffer & recovery'] },
      { title: 'Course', sub: 'Storage lessons', items: ['b-tree · b+tree', 'lsm · sstable', 'pages · slotted', 'buffer-pool · wal'] },
      'Petrov Part I → the storage-engine track');
  }

  /* ── DATABASE INTERNALS · Part II → distributed ────────────────────────── */
  if (view === 'di-distributed') {
    return mapView(
      { title: 'DI · Part II', sub: 'Distributed', items: ['Failure detection', 'Leader election', 'Replication', 'Consensus'] },
      { title: 'Course', sub: 'Distributed lessons', items: ['heartbeats', 'leader-election', 'replication · quorum', 'raft · consensus'] },
      'Petrov Part II → the distributed-systems track');
  }

  /* ── DDIA · Part I → foundations ───────────────────────────────────────── */
  if (view === 'ddia-single') {
    return mapView(
      { title: 'DDIA · I', sub: 'Foundations', items: ['Data models', 'Storage & retrieval', 'Transactions', 'Encoding'] },
      { title: 'Course', sub: 'Foundation lessons', items: ['relational-model', 'b-tree vs lsm', 'isolation · mvcc', 'records-tuples'] },
      'Kleppmann Part I → foundations, storage, transactions');
  }

  /* ── DDIA · Part II → distributed data ─────────────────────────────────── */
  if (view === 'ddia-distributed') {
    return mapView(
      { title: 'DDIA · II', sub: 'Distributed Data', items: ['Replication', 'Partitioning', 'Trouble w/ distributed', 'Consistency & consensus'] },
      { title: 'Course', sub: 'Scaling lessons', items: ['replication-models', 'hash · range · hashing', 'partial-failure', 'cap · consistency'] },
      'Kleppmann Part II → replication, partitioning, consistency');
  }

  /* ── DDIA · Part III → derived data ────────────────────────────────────── */
  if (view === 'ddia-derived') {
    return mapView(
      { title: 'DDIA · III', sub: 'Derived Data', items: ['Batch processing', 'Stream processing', 'Change data capture', 'Derived & integration'] },
      { title: 'Course', sub: 'Data-intensive lessons', items: ['batch-processing', 'stream · event-logs', 'cdc', 'materialized-views'] },
      'Kleppmann Part III → batch, stream, CDC, derived data');
  }

  /* ── RECAP: the whole map in one frame ─────────────────────────────────── */
  badges.push(region(165, 150, 330, 300, '', { r: 22 }));
  node(330, 212, 'Database Internals', 'blue', { icon: 'book', sub: 'how it works', rx: 60, h: 46, halo: true });
  ['I · Storage engines', 'II · Distributed systems'].forEach((t, i) =>
    badges.push(pill(330, 328 + i * 42, t, { icon: 'check', cls: 'pill--sst', w: 272 })));
  badges.push(region(545, 150, 330, 300, '', { r: 22 }));
  node(710, 212, 'Designing DIA', 'green', { icon: 'book', sub: 'how to design', rx: 60, h: 46, halo: true });
  ['I · Foundations', 'II · Distributed data', 'III · Derived data'].forEach((t, i) =>
    badges.push(pill(710, 320 + i * 40, t, { icon: 'check', cls: 'pill--sst', w: 272 })));
  badges.push(pill(VW / 2, 488, 'every lesson has a home in the grid', { icon: 'target', w: 360 }));
  cap(VW / 2, 500, 'the map in one view');
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
  <svg class="scene scene--book-concept-mapping" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Book concept mapping">
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
