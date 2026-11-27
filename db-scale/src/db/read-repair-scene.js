/* read-repair-scene.js — the "Read Repair" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes with icon glyphs and labels, soft
   ground shadows, halos, pill badges, dashed logical regions, routed connectors
   with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'drift' (two fresh replicas, one stale), 'compare' (read fans out,
   versions return), 'repair' (serve newest + write back to laggard), 'cold'
   (hot key healed, cold key stale), 'recap' (reads + anti-entropy), 'practice'
   (tune R). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* three replica slots across the lower band */
const REPY = 322;
const R3 = [230, 520, 810];

export function renderReadRepairScene(snap, opts = {}) {
  const view = snap.view || 'drift';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a replica node; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 48, o.h || 44, mat, {
      icon: o.icon || 'database', label, sub: o.sub || '', iconSize: 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── DRIFT: three replicas, two fresh (v7), one stale (v6) ─────────────── */
  if (view === 'drift') {
    const vers = ['v7', 'v7', 'v6'];
    R3.forEach((x, i) => {
      const stale = i === 2;
      node(x, REPY, 'R' + (i + 1), stale ? 'rose' : 'green',
        { sub: stale ? 'stale' : 'fresh', halo: stale });
      badges.push(pill(x, REPY - 92, 'key K = ' + vers[i], { icon: stale ? 'alert' : 'check', cls: 'pill--sst' }));
    });
    badges.push(region(140, 206, 760, 70, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="246" text-anchor="middle">SAME KEY · DIFFERENT VERSIONS · NOBODY NOTICES</text>`);
    cap(VW / 2, 470, 'a missed write left R3 behind — and the gap will not close on its own');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── COMPARE: coordinator reads all three, versions come back ──────────── */
  if (view === 'compare') {
    node(VW / 2, 118, 'coordinator', 'blue', { icon: 'app', rx: 50, h: 42, sub: 'reads R=3' });
    const vers = ['v7', 'v7', 'v6'];
    R3.forEach((x, i) => {
      const stale = i === 2;
      node(x, REPY, 'R' + (i + 1), stale ? 'rose' : 'green', { sub: vers[i] });
      const e = edge([V(VW / 2, 158), V((VW / 2 + x) / 2, 232), V(x, REPY - 32)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    badges.push(pill(VW / 2, 206, 'compare versions: v7, v7, v6', { icon: 'search', cls: 'pill--sst' }));
    cap(VW / 2, 474, 'reading several copies turns an invisible drift into a visible disagreement');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── REPAIR: serve newest to client, write it back to the laggard ──────── */
  if (view === 'repair') {
    node(VW / 2, 118, 'coordinator', 'blue', { icon: 'app', rx: 50, h: 42, sub: 'picks v7' });
    R3.forEach((x, i) => {
      const healed = i === 2;
      node(x, REPY, 'R' + (i + 1), 'green', { sub: healed ? 'v6 → v7' : 'v7', halo: healed });
    });
    // client up-left receives the fresh value
    const client = isoCube(150, 118, 42, 38, 'amber', { icon: 'globe', label: 'client', iconSize: 16 });
    shadows.push(client.shadow); solids.push(client.g);
    const toClient = edge([V(198, 130), V(260, 128), V(VW / 2 - 56, 128)], { arrow: true });
    guides.push(toClient.guide); railOut = toClient.d;
    // write-back to the stale replica
    const back = edge([V(VW / 2, 158), V((VW / 2 + R3[2]) / 2 + 40, 236), V(R3[2], REPY - 32)], { arrow: true, cls: '' });
    guides.push(back.guide); railIn = back.d;
    badges.push(pill(R3[2], REPY + 96, 'read repair: write v7 back', { icon: 'wal', cls: 'pill--sst' }));
    badges.push(pill(330, 90, 'serve newest (v7)', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 474, 'the reader gets fresh data; the laggard is healed as a side-effect of the read');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 5 });
    flows.push({ id: 'in', kind: 'write', speed: 140, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── COLD: hot key healed by traffic, cold key stays stale ─────────────── */
  if (view === 'cold') {
    // hot key (top row) — all green, pulsed by reads
    const HX = [300, 540, 780], HOTY = 210;
    HX.forEach((x, i) => node(x, HOTY, 'R' + (i + 1), 'green', { rx: 42, h: 36, sub: 'v9', icon: 'database' }));
    badges.push(pill(150, HOTY, 'HOT key', { icon: 'bolt', cls: 'pill--sst' }));
    const hotRead = edge([V(210, HOTY), V(250, HOTY - 2), V(HX[0] - 36, HOTY - 2)], { arrow: true });
    guides.push(hotRead.guide); railOut = hotRead.d;
    // cold key (bottom row) — one stale, never read
    const CX = [300, 540, 780], COLDY = 392;
    CX.forEach((x, i) => {
      const stale = i === 1;
      node(x, COLDY, 'R' + (i + 1), stale ? 'rose' : 'slate', { rx: 42, h: 36, sub: stale ? 'v2 stale' : 'v4', icon: 'database', ghost: !stale, halo: stale });
    });
    badges.push(pill(150, COLDY, 'COLD key', { icon: 'moon', cls: 'pill--sst' }));
    badges.push(pill(CX[1], COLDY + 84, 'no read → never repaired', { icon: 'alert', cls: 'pill--sst' }));
    cap(VW / 2, 500, 'read repair heals only what traffic touches — cold keys drift until something else sweeps them');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: reads heal hot path, anti-entropy covers the rest ──────────── */
  if (view === 'recap') {
    R3.forEach((x, i) => node(x, REPY, 'R' + (i + 1), 'green', { halo: i === 1, sub: 'in sync' }));
    badges.push(region(140, 150, 760, 96, '', { r: 22 }));
    badges.push(pill(330, 186, 'read repair · heals hot keys inline', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(730, 186, 'anti-entropy · sweeps cold keys', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, REPY + 96, 'together → full convergence', { icon: 'check', w: 280 }));
    cap(VW / 2, 500, 'inline healing on the read path, background healing everywhere else');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PRACTICE: tune the read count R ───────────────────────────────────── */
  node(VW / 2, 120, 'coordinator', 'blue', { icon: 'app', rx: 50, h: 42, sub: 'read count R' });
  const R5 = [160, 335, 520, 705, 880];
  R5.forEach((x, i) => {
    const read = i < 3;
    node(x, REPY, 'R' + (i + 1), read ? 'green' : 'slate', { rx: 42, h: 36, ghost: !read, sub: read ? 'compared' : 'skipped', icon: 'database' });
    if (read) {
      const e = edge([V(VW / 2, 162), V((VW / 2 + x) / 2, 236), V(x, REPY - 28)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    }
  });
  badges.push(pill(VW / 2, 206, 'R = 3 → more copies compared per read', { icon: 'search', cls: 'pill--sst' }));
  badges.push(region(120, 440, 800, 70, '', { r: 18 }));
  badges.push(`<text class="iso-region__t" x="${VW / 2}" y="480" text-anchor="middle">HIGHER R · FASTER CONVERGENCE · MORE WORK PER READ</text>`);
  flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
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
  <svg class="scene scene--read-repair" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Read repair across replicas">
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
