/* failure-detection-scene.js — the "Failure Detection" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs and
   labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'problem' (one silent node, three explanations), 'timeout' (probe +
   clock → suspect), 'phi' (history → rising suspicion gauge), 'falsepos'
   (healthy node wrongly evicted, flapping), 'tradeoff' (completeness vs
   accuracy), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderFailureDetectionScene(snap, opts = {}) {
  const view = snap.view || 'problem';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  /* ── TRADEOFF: two columns, no detector/target pair ────────────────────── */
  if (view === 'tradeoff') {
    const col = (x, title, icon, mat, rows) => {
      badges.push(region(x, 96, 300, 404, '', { r: 22 }));
      badges.push(pill(x + 150, 116, title, { icon, w: 248 }));
      const hx = x + 150, hy = 176;
      const head = isoCube(hx, hy, 60, 54, mat, { icon, iconSize: 22 });
      shadows.push(head.shadow); solids.push(head.g);
      rows.forEach((t, i) => badges.push(pill(x + 150, 300 + i * 46, t, { icon: t[0] === '+' ? 'check' : 'alert', w: 272 })));
    };
    col(110, 'Completeness', 'search', 'green', [
      '+ suspects every real failure',
      '+ reacts fast — short timeout',
      '− short T accuses live nodes',
      '− false positives → failover churn',
    ]);
    col(630, 'Accuracy', 'check', 'blue', [
      '+ never accuses a live node',
      '+ no needless failovers',
      '− long T → slow to spot a crash',
      '− real failures linger unnoticed',
    ]);
    badges.push(pill(VW / 2, 540, 'async network → you cannot max both', { icon: 'gauge', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── a detector (observer) on the left, a target on the right ──────────── */
  const DX = 210, DY = 262, TX = 740, TY = 262;

  // target material/label per view
  let tMat = 'green', tIcon = 'server', tSub = 'alive?', tGhost = false, tHalo = false;
  if (view === 'problem') { tMat = 'slate'; tSub = 'silent'; }
  else if (view === 'timeout') { tMat = 'amber'; tSub = 'no reply'; tHalo = true; }
  else if (view === 'phi') { tMat = 'amber'; tSub = 'quiet'; }
  else if (view === 'falsepos') { tMat = 'green'; tSub = 'slow, not dead'; tHalo = true; }
  else if (view === 'recap') { tMat = 'green'; tSub = 'watched'; }

  const detector = isoCube(DX, DY, 56, 58, 'blue', { icon: 'search', label: 'Detector', sub: 'observer', iconSize: 22 });
  shadows.push(detector.shadow); solids.push(detector.g);

  const target = isoCube(TX, TY, 56, 58, tMat, { icon: tIcon, label: 'Node B', sub: tSub, iconSize: 22, ghost: tGhost, halo: tHalo });
  shadows.push(target.shadow); if (tHalo) halos.push(target.halo); solids.push(target.g);

  // the probe edge (detector → target), reused as a rail where it animates
  const probe = edge([
    V(detector.verts.E.x - 2, detector.front[1]),
    V((detector.verts.E.x + target.verts.W.x) / 2, DY - 30),
    V(target.verts.W.x - 4, target.front[1]),
  ], { arrow: true, dashed: view === 'problem' });
  guides.push(probe.guide);

  /* ── PROBLEM: three possible explanations for silence ──────────────────── */
  if (view === 'problem') {
    railIn = probe.d;
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    badges.push(pill((DX + TX) / 2, DY - 64, 'request · no reply', { icon: 'alert', cls: 'pill--sst' }));
    const causes = [
      { t: 'CRASHED', s: 'B is gone', ic: 'trash' },
      { t: 'SLOW', s: 'B is swamped', ic: 'clock' },
      { t: 'PARTITIONED', s: 'packet dropped', ic: 'globe' },
    ];
    causes.forEach((c, i) => {
      const x = 430 + i * 200;
      badges.push(pill(x, 430, c.t, { icon: c.ic, cls: 'pill--sst' }));
      badges.push(cap(x, 462, c.s));
    });
    badges.push(region(330, 404, 606, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="394" text-anchor="middle">INDISTINGUISHABLE FROM THE OUTSIDE</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── TIMEOUT: probe, a clock to T, then suspect ────────────────────────── */
  if (view === 'timeout') {
    railOut = probe.d;
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 5 });
    // a timeout clock sitting under the probe
    const clk = isoCube((DX + TX) / 2, 150, 42, 40, 'slate', { icon: 'clock', iconSize: 20 });
    shadows.push(clk.shadow); solids.push(clk.g);
    badges.push(pill((DX + TX) / 2, 104, 'wait up to  T', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(pill(TX, TY + 92, 'SUSPECTED', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(cap(TX, TY + 122, 'no reply within T → assume dead'));
    badges.push(pill(DX, DY + 92, 'probe sent', { icon: 'search', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PHI: reply-time history feeds a rising suspicion gauge ─────────────── */
  if (view === 'phi') {
    railOut = probe.d;
    flows.push({ id: 'out', kind: 'read', speed: 130, size: 5 });
    // history: a row of past reply-time ticks beneath the probe
    const hx0 = 300, hN = 7;
    for (let i = 0; i < hN; i++) {
      const h = 14 + (i % 3) * 10 + (i > 4 ? i * 6 : 0);
      const t = isoTile(hx0 + i * 34, 150, 13, i >= hN - 2 ? 'rose' : 'slate', { h });
      shadows.push(t.shadow); solids.push(t.g);
    }
    badges.push(pill(300 + (hN - 1) * 34 / 2, 104, 'reply-time history', { icon: 'listOrdered', cls: 'pill--sst' }));
    // the suspicion gauge: a rising stack of bars under node B
    const gx = TX, gy0 = 440;
    const bars = [0, 1, 2, 3, 4];
    bars.forEach(i => {
      const on = i <= 3;
      const t = isoTile(gx - 68 + i * 34, gy0 - i * 10, 14, on ? (i >= 3 ? 'rose' : 'amber') : 'slate', { h: 14 + i * 10, halo: i === 3 });
      shadows.push(t.shadow); if (i === 3) halos.push(t.halo); solids.push(t.g);
    });
    badges.push(pill(gx, 388, 'φ suspicion  ↑', { icon: 'gauge', cls: 'pill--sst' }));
    badges.push(cap(gx, 500, 'act at a threshold — not a fixed timeout'));
    badges.push(cap(DX, DY + 92, 'learns B’s normal rhythm'));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── FALSEPOS: a healthy-but-slow node wrongly evicted, then flapping ──── */
  if (view === 'falsepos') {
    railOut = probe.d;
    flows.push({ id: 'out', kind: 'read', speed: 90, size: 5 });   // slow reply
    badges.push(pill((DX + TX) / 2, 150, 'T set too low', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(TX, TY + 92, 'wrongly DEAD', { icon: 'trash', cls: 'pill--sst' }));
    // a flapping loop beside the target: evicted → rejoin → evicted
    const fx = TX, fy = 452;
    const loop = edge([
      V(fx - 90, fy), V(fx, fy + 36), V(fx + 90, fy),
      V(fx + 40, fy - 24), V(fx - 40, fy - 24), V(fx - 90, fy),
    ], { dashed: true, arrow: true });
    guides.push(loop.guide);
    badges.push(`<text class="iso-region__t" x="${fx}" y="${A(fy + 6)}" text-anchor="middle">FLAPPING</text>`);
    badges.push(cap(fx, fy + 70, 'evict → rejoin → evict · churn costs more than the hiccup'));
    badges.push(cap(DX, DY + 92, 'one missed probe, verdict: dead'));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: the detector watches, and only ever suspects ───────────────── */
  railOut = probe.d;
  flows.push({ id: 'out', kind: 'read', speed: 140, size: 5 });
  badges.push(pill((DX + TX) / 2, 150, 'probe · observe · suspect', { icon: 'search', cls: 'pill--sst' }));
  const tags = ['suspect, never know', 'timeout → verdict', 'φ → tunable suspicion', 'tune: complete ⟷ accurate'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 392 + i * 44, t, { icon: 'check', w: 320 })));
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
  <svg class="scene scene--failure-detection" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Failure detection">
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
