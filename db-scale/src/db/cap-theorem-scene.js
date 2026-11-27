/* cap-theorem-scene.js — the "CAP Theorem" scene, in the shared Designed-to-
   Scale isometric vocabulary: rounded iso cubes/slabs with icon glyphs and
   labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'three' (C·A·P as three properties), 'partition' (a network split),
   'cp' (choose consistency — minority rejects), 'ap' (choose availability —
   both sides diverge), 'cptable' (CP vs AP), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

/* a small cluster node */
function node(x, y, mat, label, opts = {}) {
  return isoCube(x, y, 42, 46, mat, { icon: opts.icon || 'server', label, sub: opts.sub || '', iconSize: 18, halo: !!opts.halo, ghost: !!opts.ghost });
}
/* a jagged vertical network break */
function breakPts(x, y0, y1, n) {
  const pts = []; const seg = (y1 - y0) / n;
  for (let i = 0; i <= n; i++) pts.push(V(x + (i % 2 ? 20 : -20), y0 + i * seg));
  return pts;
}

export function renderCapTheoremScene(snap, opts = {}) {
  const view = snap.view || 'three';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── THREE: the three properties ──────────────────────────────────────── */
  if (view === 'three') {
    badges.push(region(150, 150, 740, 258, '', { r: 24 }));
    badges.push(pill(VW / 2, 172, 'C · A · P', { icon: 'gauge' }));
    const defs = [
      { x: 290, mat: 'green', icon: 'check', label: 'Consistency', sub: 'latest write, always', c: 'every read sees the newest value' },
      { x: 540, mat: 'blue', icon: 'bolt', label: 'Availability', sub: 'always answers', c: 'every request gets a non-error reply' },
      { x: 790, mat: 'amber', icon: 'server', label: 'Partition tol.', sub: 'survives drops', c: 'keeps working when messages are lost' },
    ];
    defs.forEach(d => {
      const c = isoCube(d.x, 248, 80, 92, d.mat, { icon: d.icon, label: d.label, sub: d.sub, iconSize: 24 });
      shadows.push(c.shadow); solids.push(c.g);
      badges.push(cap(d.x, c.base[1] + 18, d.c));
    });
    badges.push(pill(VW / 2, 470, 'in a distributed store you cannot have all three at once', { icon: 'alert', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── all split views share the two-halves layout ──────────────────────── */
  const splitViews = view === 'partition' || view === 'cp' || view === 'ap';
  if (splitViews) {
    const leftPos = [[252, 212], [196, 322], [322, 338]];
    const rightPos = [[726, 212], [800, 330]];

    // majority (left) — in 'cp' one node holds the agreed truth (halo)
    leftPos.forEach(([x, y], i) => {
      const c = node(x, y, view === 'cp' && i === 0 ? 'green' : 'blue',
        i === 0 ? 'leader' : 'node', { halo: view === 'cp' && i === 0 });
      shadows.push(c.shadow); if (view === 'cp' && i === 0) halos.push(c.halo); solids.push(c.g);
    });
    // minority (right)
    rightPos.forEach(([x, y], i) => {
      const ghost = view === 'cp';           // CP: minority is shut out → dimmed
      const c = node(x, y, view === 'ap' ? 'rose' : 'slate', 'node', { ghost });
      shadows.push(c.shadow); solids.push(c.g);
    });

    badges.push(region(150, 160, 310, 300, '', { r: 22 }));
    badges.push(region(610, 160, 300, 300, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="305" y="186" text-anchor="middle">MAJORITY · 3 nodes</text>`);
    badges.push(`<text class="iso-region__t" x="760" y="186" text-anchor="middle">MINORITY · 2 nodes</text>`);

    // the jagged network break down the middle
    const br = edge(breakPts(515, 150, 470, 8), { dashed: true, cls: 'edge--break' });
    guides.push(br.guide);
    badges.push(pill(515, 150, 'NETWORK PARTITION', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(cap(515, 492, 'messages across the split are dropped'));

    if (view === 'partition') {
      // a client reaching each side, both still live
      flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
      const e = edge([V(80, 250), V(140, 300), V(196 - 46, 322)], { arrow: true });
      guides.push(e.guide); railIn = e.d;
      badges.push(pill(300, 440, 'both halves still up — but blind to each other', { icon: 'bolt', cls: 'pill--sst' }));
    }

    if (view === 'cp') {
      // a write to the minority is rejected to protect consistency
      const e = edge([V(960, 250), V(890, 300), V(800 + 46, 330)], { arrow: true, dashed: true });
      guides.push(e.guide); railIn = e.d;
      badges.push(pill(900, 224, 'write', { icon: 'bolt', cls: 'pill--sst' }));
      badges.push(pill(760, 408, '✕ REJECTED — minority can’t confirm', { icon: 'alert', cls: 'pill--sst' }));
      badges.push(pill(305, 408, 'majority serves — stays consistent', { icon: 'check', cls: 'pill--sst' }));
      flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
    }

    if (view === 'ap') {
      // both sides accept writes and diverge
      const t1 = isoTile(305, 400, 30, 'rose', { halo: true });
      const t2 = isoTile(760, 400, 30, 'rose', { halo: true });
      [t1, t2].forEach(t => { shadows.push(t.shadow); halos.push(t.halo); solids.push(t.g); });
      badges.push(pill(305, 452, 'x = 1', { icon: 'check', cls: 'pill--sst' }));
      badges.push(pill(760, 452, 'x = 2', { icon: 'check', cls: 'pill--sst' }));
      const el = edge([V(140, 250), V(150, 300), V(196 - 46, 322)], { arrow: true });
      const er = edge([V(960, 250), V(880, 300), V(800 + 46, 330)], { arrow: true });
      guides.push(el.guide, er.guide); railIn = el.d; railOut = er.d;
      badges.push(`<text class="iso-region__t" x="${VW / 2}" y="536" text-anchor="middle">BOTH ANSWER · VALUES DIVERGE · RECONCILE LATER</text>`);
      flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 }, { id: 'out', kind: 'write', speed: 150, size: 6 });
    }

    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── CPTABLE: two columns, CP vs AP ───────────────────────────────────── */
  if (view === 'cptable') {
    const col = (x, title, icon, mat, rows) => {
      badges.push(region(x, 92, 300, 418, '', { r: 22 }));
      badges.push(pill(x + 150, 112, title, { icon, w: 240 }));
      const head = isoCube(x + 150, 176, 60, 54, mat, { icon, iconSize: 22 });
      shadows.push(head.shadow); solids.push(head.g);
      rows.forEach((t, i) => badges.push(pill(x + 150, 306 + i * 46, t, { icon: t[0] === '+' ? 'check' : 'alert', w: 270 })));
    };
    col(110, 'CP · consistent', 'check', 'green', [
      '+ never returns stale data',
      '+ one agreed truth',
      '− minority goes unavailable',
      '− writes blocked in a split',
    ]);
    col(630, 'AP · available', 'bolt', 'amber', [
      '+ always answers',
      '+ every node keeps serving',
      '− reads can be stale',
      '− must reconcile conflicts',
    ]);
    badges.push(cap(VW / 2, 548, 'consensus stores lean CP · Dynamo-style stores lean AP'));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── RECAP: P is a given; the dial is C ⟷ A ───────────────────────────── */
  const pc = isoCube(VW / 2, 180, 86, 96, 'amber', { icon: 'server', label: 'Partition tol.', sub: 'not optional', halo: true, iconSize: 24 });
  shadows.push(pc.shadow); halos.push(pc.halo); solids.push(pc.g);
  badges.push(pill(VW / 2, 92, 'P is a given on a real network', { icon: 'alert', cls: 'pill--sst' }));

  const cC = isoCube(285, 400, 72, 76, 'green', { icon: 'check', label: 'Consistency', iconSize: 22 });
  const cA = isoCube(755, 400, 72, 76, 'blue', { icon: 'bolt', label: 'Availability', iconSize: 22 });
  [cC, cA].forEach(c => { shadows.push(c.shadow); solids.push(c.g); });
  const dial = edge([V(cC.verts.E.x - 4, cC.front[1]), V(VW / 2, 430), V(cA.verts.W.x + 4, cA.front[1])], { arrow: true });
  guides.push(dial.guide); railOut = dial.d;
  badges.push(pill(VW / 2, 466, 'during a partition, pick one', { icon: 'gauge', cls: 'pill--sst' }));
  badges.push(cap(VW / 2, 520, 'the choice only surfaces when the network breaks'));
  flows.push({ id: 'out', kind: 'read', speed: 170, size: 5 });

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
  <svg class="scene scene--cap-theorem" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="CAP theorem">
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
