/* isolation-levels-scene.js — the "Isolation Levels" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes/tiles with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'anomalies' (the three read phenomena), 'readcommitted',
   'repeatable', 'serializable' (two-transaction schedules), 'ladder' (the four
   levels as rungs with an anomaly matrix), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* small free-standing caption */
function cap(x, y, text, cls = 'sst-cap') {
  return `<text class="${cls}" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(text)}</text>`;
}
/* a ✓ / ✗ mark drawn as caption text */
function mark(x, y, ok) {
  return `<text class="iso-region__t" x="${A(x)}" y="${A(y)}" text-anchor="middle" style="font-size:19px">${ok ? '✓' : '✗'}</text>`;
}

export function renderIsolationLevelsScene(snap, opts = {}) {
  const view = snap.view || 'anomalies';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── ANOMALIES: three mini-cases side by side ─────────────────────────── */
  if (view === 'anomalies') {
    const cases = [
      { x: 198, title: 'Dirty read', mat: 'rose', tag: 'reads uncommitted', lo: 'T2 reads', hi: 'T1 not committed' },
      { x: 520, title: 'Non-repeatable', mat: 'amber', tag: 'row changes mid-txn', lo: 'read = 100', hi: 'read = 250' },
      { x: 842, title: 'Phantom', mat: 'lilac', tag: 'range gains rows', lo: '3 rows', hi: '4 rows' },
    ];
    cases.forEach(c => {
      badges.push(region(c.x - 138, 96, 276, 380, '', { r: 22 }));
      badges.push(pill(c.x, 118, c.title, { icon: 'alert', w: 220, cls: 'pill--sst' }));
      // two reads of the same thing, giving different answers
      const a = isoCube(c.x - 58, 236, 48, 52, c.mat, { icon: 'search', label: 'read', iconSize: 18 });
      const b = isoCube(c.x + 58, 300, 48, 52, c.mat, { icon: 'search', label: 'read', iconSize: 18 });
      [a, b].forEach(k => { shadows.push(k.shadow); solids.push(k.g); });
      const e = edge([V(a.verts.E.x - 4, a.front[1]), V(c.x, 272), V(b.verts.W.x + 4, b.front[1])], { arrow: true, dashed: true });
      guides.push(e.guide);
      badges.push(cap(c.x - 58, A(a.base[1] + 16), c.lo));
      badges.push(cap(c.x + 58, A(b.base[1] + 16), c.hi));
      badges.push(cap(c.x, 452, c.tag, 'iso-region__t'));
    });
    badges.push(pill(VW / 2, 56, 'three transactions · three ways a read lies', { icon: 'alert' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── LADDER: four stepped rungs + anomaly matrix ──────────────────────── */
  if (view === 'ladder') {
    const rungs = [
      { label: 'Read Uncommitted', sub: 'forbids nothing', mat: 'rose',  dirty: 0, nonrep: 0, phantom: 0 },
      { label: 'Read Committed',   sub: 'no dirty reads',  mat: 'amber', dirty: 1, nonrep: 0, phantom: 0 },
      { label: 'Repeatable Read',  sub: '+ stable rows',   mat: 'blue',  dirty: 1, nonrep: 1, phantom: 0 },
      { label: 'Serializable',     sub: '+ no phantoms',   mat: 'green', dirty: 1, nonrep: 1, phantom: 1 },
    ];
    const baseX = 232, baseY = 430, stepX = 150, stepY = 86;
    // matrix column x's for the three anomalies, to the right
    const colX = [720, 820, 920];
    const colHdr = ['dirty', 'non-rep', 'phantom'];
    colX.forEach((cx, i) => badges.push(cap(cx, 92, colHdr[i], 'iso-region__t')));
    badges.push(cap(820, 70, 'FORBIDDEN?', 'iso-region__t'));

    rungs.forEach((r, i) => {
      const cx = baseX + i * stepX, cy = baseY - i * stepY;
      const c = isoCube(cx, cy, 72, 48, r.mat, { icon: 'layers', label: r.label.split(' ')[0] === 'Read' ? r.label.replace('Read ', 'R. ') : r.label, sub: r.sub, iconSize: 18, halo: i === 3 });
      shadows.push(c.shadow); if (i === 3) halos.push(c.halo); solids.push(c.g);
      // matrix row aligned to this rung's height
      const rowY = cy + 4;
      badges.push(mark(colX[0], rowY, r.dirty));
      badges.push(mark(colX[1], rowY, r.nonrep));
      badges.push(mark(colX[2], rowY, r.phantom));
      badges.push(cap(colX[2] + 92, rowY - 4, i === 0 ? 'fastest' : i === 3 ? 'safest' : '', 'iso-region__t'));
    });
    // climbing arrow up the steps
    const e = edge([V(baseX, baseY + 70), V(baseX + 3 * stepX, baseY - 3 * stepY + 70)], { arrow: true });
    guides.push(e.guide);
    badges.push(pill(baseX + 150, baseY + 96, 'more isolation → less concurrency', { icon: 'gauge', w: 320 }));
    badges.push(region(672, 72, 300, 404, '', { r: 22 }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── two-transaction schedule views (RC / RR / Serializable) ───────────── */
  // level config: which anomalies are blocked at this rung
  const LVL = {
    readcommitted: { title: 'Read Committed', blocked: ['dirty read'], open: ['non-repeatable', 'phantom'], mat: 'amber', snap: false, serial: false },
    repeatable:    { title: 'Repeatable Read', blocked: ['dirty read', 'non-repeatable'], open: ['phantom'], mat: 'blue', snap: true, serial: false },
    serializable:  { title: 'Serializable', blocked: ['dirty read', 'non-repeatable', 'phantom'], open: [], mat: 'green', snap: true, serial: true },
  };
  if (LVL[view]) {
    const L = LVL[view];
    // two transaction lanes
    const laneY = [196, 372];
    const lanes = ['T1  (writer)', 'T2  (reader)'];
    lanes.forEach((t, i) => {
      badges.push(region(120, laneY[i] - 70, 800, 140, '', { r: 20 }));
      badges.push(pill(190, laneY[i] - 48, t, { icon: i === 0 ? 'merge' : 'search', w: 160, cls: 'pill--sst' }));
    });
    // T1: write then commit
    const w1 = isoCube(300, laneY[0], 56, 56, L.mat, { icon: 'merge', label: 'WRITE', iconSize: 20 });
    const c1 = isoCube(560, laneY[0], 56, 56, L.mat, { icon: 'check', label: 'COMMIT', iconSize: 20, halo: true });
    [w1, c1].forEach(k => { shadows.push(k.shadow); solids.push(k.g); });
    halos.push(c1.halo);
    const te = edge([V(w1.verts.E.x - 4, w1.front[1]), V(c1.verts.W.x + 4, c1.front[1])], { arrow: true });
    guides.push(te.guide);
    // T2: read before commit (hidden), read after commit
    const r1 = isoCube(430, laneY[1], 56, 56, 'rose', { icon: 'search', label: 'read', iconSize: 20, ghost: true });
    const r2 = isoCube(690, laneY[1], 56, 56, L.snap ? 'blue' : 'rose', { icon: 'search', label: 'read', iconSize: 20 });
    [r1, r2].forEach(k => { shadows.push(k.shadow); solids.push(k.g); });
    const re = edge([V(r1.verts.E.x - 4, r1.front[1]), V(r2.verts.W.x + 4, r2.front[1])], { arrow: true });
    guides.push(re.guide);
    // the "no dirty read" barrier between T1's uncommitted write and T2's early read
    const bx = (c1.top[0] + r1.top[0]) / 2;
    badges.push(cap(430, A(r1.base[1] + 18), 'uncommitted → hidden'));
    badges.push(cap(690, A(r2.base[1] + 18), L.snap ? 'snapshot value (stable)' : 'latest committed'));
    // snapshot band for RR / serializable
    if (L.snap) {
      badges.push(region(372, laneY[1] - 86, 376, 24, '', { r: 10 }));
      badges.push(cap(560, laneY[1] - 70, 'FROZEN SNAPSHOT — same row reads the same', 'iso-region__t'));
    }
    if (L.serial) {
      badges.push(pill(VW / 2, 500, 'schedule ≡ some serial order · conflicts abort', { icon: 'check', w: 440 }));
    }
    // status pills: what's blocked / open
    let py = 100;
    L.blocked.forEach(b => { badges.push(pill(VW - 180, py, '✓ ' + b + ' blocked', { icon: 'check', w: 240 })); py += 40; });
    L.open.forEach(b => { badges.push(pill(VW - 180, py, '✗ ' + b + ' open', { icon: 'alert', w: 240 })); py += 40; });
    badges.push(pill(240, 92, L.title, { icon: 'gauge' }));

    // a read rail along T2's lane
    const rr = edge([V(150, laneY[1] + 36), V(900, laneY[1] + 36)], {});
    railIn = rr.d; guides.push(rr.guide);
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the dial ──────────────────────────────────────────────────── */
  const levels = [
    { x: 200, label: 'Read Uncommitted', mat: 'rose',  tag: 'fastest' },
    { x: 410, label: 'Read Committed',   mat: 'amber', tag: 'default' },
    { x: 620, label: 'Repeatable Read',  mat: 'blue',  tag: 'most apps' },
    { x: 830, label: 'Serializable',     mat: 'green', tag: 'safest' },
  ];
  levels.forEach((lv, i) => {
    const cy = 300;
    const c = isoCube(lv.x, cy, 70, 52, lv.mat, { icon: 'layers', label: lv.label.replace('Read ', 'R. '), iconSize: 18, halo: i === 2 });
    shadows.push(c.shadow); if (i === 2) halos.push(c.halo); solids.push(c.g);
    badges.push(cap(lv.x, A(c.base[1] + 18), lv.tag));
    if (i < levels.length - 1) {
      const e = edge([V(c.verts.E.x - 2, c.front[1]), V(levels[i + 1].x - 72, cy + 26)], { arrow: true });
      guides.push(e.guide);
    }
  });
  badges.push(pill(VW / 2, 150, 'pick the weakest level your data can survive', { icon: 'check', w: 460 }));
  badges.push(cap(VW / 2, 180, 'correctness  ◀───────────▶  concurrency', 'iso-region__t'));
  badges.push(cap(VW / 2, 420, 'safety climbs left → right · throughput falls', 'iso-region__t'));
  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--isolation-levels" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Isolation levels">
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
