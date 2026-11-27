/* mock-interview-scene.js — the "Mock Interview" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'prompt' (clarify the ask), 'requirements' (numbers → levers),
   'storage' (LSM write path), 'reads' (bloom + compaction), 'durability'
   (WAL + replicate), 'scale' (partition by series/time), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderMockInterviewScene(snap, opts = {}) {
  const view = snap.view || 'prompt';

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

  /* ── PROMPT: the ask + the clarifying questions that frame it ──────────── */
  if (view === 'prompt') {
    node(VW / 2, 200, 'time-series DB', 'lilac', { icon: 'database', sub: 'write-heavy', rx: 70, h: 48, halo: true });
    const qs = [
      { x: 210, label: 'write rate?', icon: 'bolt' },
      { x: 410, label: 'read shape?', icon: 'search' },
      { x: 620, label: 'retention?', icon: 'clock' },
      { x: 820, label: 'ordering?', icon: 'listOrdered' },
    ];
    qs.forEach(q => {
      opTile(q.x, 400, q.label, 'blue', { icon: q.icon, rx: 42 });
      const e = edge([V(VW / 2, 248), V(q.x, 378)], { arrow: true, dashed: true }); guides.push(e.guide);
    });
    badges.push(pill(VW / 2, 300, 'clarify before you design', { icon: 'alert', cls: 'pill--sst' }));
    cap(VW / 2, 480, 'thirty seconds of scoping beats designing the wrong system');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── REQUIREMENTS: each number maps to a design lever ─────────────────── */
  if (view === 'requirements') {
    const rows = [
      { y: 170, req: '1M writes/s', lever: 'sequential writes', icon: 'bolt', mat: 'amber' },
      { y: 270, req: '1% recent reads', lever: 'cache hot, defer', icon: 'search', mat: 'blue' },
      { y: 370, req: '30-day retention', lever: 'drop old segments', icon: 'trash', mat: 'rose' },
    ];
    rows.forEach(r => {
      node(290, r.y, r.req, r.mat, { icon: r.icon, rx: 60, h: 34 });
      node(730, r.y, r.lever, 'green', { icon: 'sliders', rx: 64, h: 34 });
      const e = edge([V(354, r.y), V(664, r.y)], { arrow: true }); guides.push(e.guide);
    });
    badges.push(pill(290, 110, 'requirement', { cls: 'pill--sst' }));
    badges.push(pill(730, 110, 'design lever', { icon: 'sliders', cls: 'pill--sst' }));
    cap(VW / 2, 470, 'every requirement should move exactly one lever');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── STORAGE: the LSM write path, chosen over B+Tree ──────────────────── */
  if (view === 'storage') {
    node(220, 250, 'write', 'blue', { icon: 'bolt', sub: 'PUT', rx: 42, h: 36 });
    node(430, 250, 'memtable', 'green', { icon: 'listOrdered', sub: 'RAM, sorted', rx: 50, h: 42 });
    node(680, 250, 'flush', 'amber', { icon: 'flush', sub: 'when full', rx: 44, h: 38 });
    node(880, 250, 'SSTable', 'lilac', { icon: 'file', sub: 'immutable', rx: 48, h: 42 });
    [[262, 388], [480, 636], [724, 832]].forEach(([a, b]) => { const e = edge([V(a, 250), V(b, 250)], { arrow: true }); guides.push(e.guide); railOut = railOut || e.d; });
    badges.push(pill(VW / 2, 350, 'every write is sequential', { icon: 'check', cls: 'pill--sst' }));
    opTile(430, 420, 'B+Tree: random writes thrash disk — rejected', 'rose', { icon: 'trash', rx: 230, ghost: true });
    cap(VW / 2, 480, 'pick decisively — LSM, and name the trade you accept');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── READS: bloom filters skip SSTables; compaction bounds the count ───── */
  if (view === 'reads') {
    node(170, 250, 'point read', 'blue', { icon: 'search', sub: 'key?', rx: 48, h: 40 });
    const tbls = [430, 560, 690, 820];
    tbls.forEach((x, i) => {
      const hit = i === 3;
      node(x, 250, 'SST ' + i, hit ? 'green' : 'slate', { icon: hit ? 'check' : 'file', sub: hit ? 'found' : 'skip', rx: 40, h: 34, halo: hit, ghost: !hit });
      opTile(x, 170, 'bloom', 'amber', { icon: 'key', rx: 30 });
    });
    const e = edge([V(218, 250), V(390, 250)], { arrow: true }); guides.push(e.guide);
    badges.push(pill(VW / 2, 110, 'bloom: "definitely not here" → skip, no disk read', { icon: 'key', cls: 'pill--sst' }));
    badges.push(region(380, 330, 510, 56, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="635" y="362" text-anchor="middle">LEVELED COMPACTION BOUNDS HOW MANY TABLES A READ PROBES</text>`);
    cap(VW / 2, 440, 'recent reads hit the memtable and L0 — already cached');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DURABILITY: WAL + fsync, then replicate the log ───────────────────── */
  if (view === 'durability') {
    node(230, 250, 'write', 'blue', { icon: 'bolt', rx: 42, h: 36 });
    node(430, 250, 'WAL', 'amber', { icon: 'wal', sub: 'fsync', rx: 46, h: 42, halo: true });
    node(650, 250, 'memtable', 'green', { icon: 'listOrdered', sub: 'RAM', rx: 48, h: 40 });
    [[272, 388], [476, 606]].forEach(([a, b]) => { const e = edge([V(a, 250), V(b, 250)], { arrow: true }); guides.push(e.guide); railOut = railOut || e.d; });
    node(430, 420, 'follower', 'slate', { icon: 'server', sub: 'promotable', rx: 48, h: 38 });
    node(650, 420, 'follower', 'slate', { icon: 'server', sub: 'streamed', rx: 48, h: 38 });
    const er = edge([V(430, 296), V(430, 384)], { arrow: true, dashed: true }); guides.push(er.guide);
    const er2 = edge([V(452, 292), V(628, 388)], { arrow: true, dashed: true }); guides.push(er2.guide);
    badges.push(pill(VW / 2, 150, 'log first, fsync, then memtable', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(760, 420, 'sync vs async = durability SLA', { icon: 'clock', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'WAL survives crashes; a replicated log survives machines');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SCALE: partition by series, segment by time, split hot series ─────── */
  if (view === 'scale') {
    const shards = [
      { x: 250, label: 'series A', mat: 'blue', hot: false },
      { x: 520, label: 'series B', mat: 'rose', hot: true },
      { x: 790, label: 'series C', mat: 'amber', hot: false },
    ];
    shards.forEach(s => {
      node(s.x, 220, s.label, s.mat, { icon: 'grid', sub: s.hot ? 'HOT' : 'shard', rx: 50, h: 42, halo: s.hot });
      [0, 1, 2].forEach(i => opTile(s.x - 60 + i * 60, 370, 't' + i, 'slate', { icon: 'clock', rx: 26 }));
    });
    badges.push(pill(250, 150, 'partition by series', { cls: 'pill--sst' }));
    badges.push(pill(790, 150, 'segment by time', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(pill(520, 150, 'hot series → split further', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(150, 420, 740, 56, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="452" text-anchor="middle">TIME SEGMENTS MAKE RETENTION A CHEAP WHOLE-SEGMENT DROP</text>`);
    cap(VW / 2, 505, 'volunteer the failure mode — hot shard — before they ask');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the arc of the answer ──────────────────────────────────────── */
  const arc = ['clarify', 'requirements', 'structure', 'reads', 'durability', 'scale'];
  const icons = ['alert', 'sliders', 'database', 'search', 'wal', 'grid'];
  arc.forEach((t, i) => {
    const x = 170 + i * 140;
    node(x, 250, t, i === arc.length - 1 ? 'green' : 'slate', { icon: icons[i], rx: 40, h: 34, halo: i === arc.length - 1 });
    if (i < arc.length - 1) { const e = edge([V(x + 40, 250), V(x + 100, 250)], { arrow: true }); guides.push(e.guide); }
  });
  badges.push(region(150, 150, 740, 60, 'trade off out loud at every turn', { r: 20 }));
  badges.push(pill(VW / 2, 400, 'reusable on any "design the storage for X" prompt', { icon: 'check', w: 440 }));
  cap(VW / 2, 470, 'they grade the reasoning, not the recall');
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
  <svg class="scene scene--mock-interview" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Mock interview">
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
