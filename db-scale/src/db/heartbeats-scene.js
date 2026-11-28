/* heartbeats-scene.js — the "Heartbeats" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes with icon glyphs and labels, soft
   ground shadows, halos, pill badges, dashed logical regions, routed connectors
   with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'ping' (one beat + a watching timer), 'interval' (frequent vs sparse),
   'alltoall' (the O(N²) mesh), 'gossip' (ping a few random peers), 'indirect'
   (probe a silent node via a helper), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* N node centres evenly placed on an iso-squashed ellipse */
function ring(n, cx, cy, rx, ry, rot = -90) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (rot + i * 360 / n) * Math.PI / 180;
    out.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return out;
}

export function renderHeartbeatsScene(snap, opts = {}) {
  const view = snap.view || 'ping';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a node cube at raw centre {x,y}; caller keeps the centre for routing
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 42, o.h || 42, mat, {
      icon: o.icon || 'server', label, sub: o.sub || '', iconSize: o.iconSize || 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── PING: one node beats to a monitor ─────────────────────────────────── */
  if (view === 'ping') {
    const nx = 250, ny = 256, mx = 790, my = 256;
    node(nx, ny, 'node', 'green', { sub: 'alive' });
    node(mx, my, 'monitor', 'blue', { icon: 'search', sub: 'watches' });
    const e = edge([V(nx + 46, ny - 6), V((nx + mx) / 2, ny - 48), V(mx - 46, my - 6)], { arrow: true });
    guides.push(e.guide); railIn = e.d;
    badges.push(pill((nx + mx) / 2, 132, 'heartbeat every interval', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(pill(mx, 150, 'timer reset ✓', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(nx, 372, '“I’m alive”', { icon: 'check', cls: 'pill--sst' }));
    badges.push(region(640, 332, 300, 116, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="790" y="378" text-anchor="middle">SILENCE &gt; TIMEOUT → SUSPECT</text>`);
    badges.push(cap(790, 408, 'no beat in T seconds and you’re presumed dead'));
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── INTERVAL: frequent vs sparse, two columns ─────────────────────────── */
  if (view === 'interval') {
    const col = (x, title, mat, beats, rows) => {
      badges.push(region(x, 104, 300, 400, '', { r: 22 }));
      badges.push(pill(x + 150, 126, title, { icon: 'clock', w: 258 }));
      node(x + 150, 196, 'monitor', mat, { icon: 'search', iconSize: 20, rx: 54, h: 50 });
      for (let i = 0; i < beats; i++) {
        const t = isoTile(x + 44 + i * (212 / beats), 300, 9, 'amber', { h: 8 });
        shadows.push(t.shadow); solids.push(t.g);
      }
      badges.push(cap(x + 150, 332, beats + ' beats / round'));
      rows.forEach((r, i) => badges.push(pill(x + 150, 372 + i * 46, r, { icon: r[0] === '+' ? 'check' : 'alert', w: 270 })));
    };
    col(110, 'Frequent · short timeout', 'green', 10, ['+ detects death fast', '− floods the network']);
    col(630, 'Sparse · long timeout', 'amber', 3, ['+ barely any traffic', '− slow to notice death']);
    badges.push(pill(VW / 2, 552, 'tune the interval: detection speed vs overhead', { icon: 'gauge', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── ALL-TO-ALL: the O(N²) mesh ────────────────────────────────────────── */
  if (view === 'alltoall') {
    const pts = ring(5, 540, 262, 214, 120);
    // every pair, drawn under the nodes
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const e = edge([V(pts[i].x, pts[i].y), V(pts[j].x, pts[j].y)], {});
        guides.push(e.guide);
        if (i === 0 && j === 1) railIn = e.d;
      }
    }
    pts.forEach((p, i) => node(p.x, p.y, 'N' + (i + 1), 'blue', { rx: 38, h: 38, iconSize: 16 }));
    badges.push(pill(540, 96, 'every node pings every other', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(region(350, 436, 380, 60, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="540" y="472" text-anchor="middle">N × (N−1) = 20 MESSAGES · O(N²)</text>`);
    badges.push(cap(540, 522, 'double the cluster, quadruple the chatter'));
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── GOSSIP: ping a few random peers ───────────────────────────────────── */
  if (view === 'gossip') {
    const pts = ring(5, 540, 262, 214, 120);
    const links = [[0, 1], [1, 3], [2, 4], [3, 0], [4, 2]];   // sparse ≈ O(N)
    links.forEach((lk, i) => {
      const e = edge([V(pts[lk[0]].x, pts[lk[0]].y), V(pts[lk[1]].x, pts[lk[1]].y)], { arrow: true, dashed: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d;
    });
    pts.forEach((p, i) => node(p.x, p.y, 'N' + (i + 1), 'green', { rx: 38, h: 38, iconSize: 16, halo: i === 0 }));
    badges.push(pill(540, 96, 'ping a few random peers · gossip membership', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(region(360, 436, 360, 60, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="540" y="472" text-anchor="middle">≈ N MESSAGES · O(N) · SCALES</text>`);
    badges.push(cap(540, 522, 'knowledge spreads epidemically — everyone learns, cheaply'));
    flows.push({ id: 'in', kind: 'write', speed: 170, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── INDIRECT: probe a silent node via a helper ────────────────────────── */
  if (view === 'indirect') {
    const Ax = 200, Ay = 318, Bx = 540, By = 168, Cx = 848, Cy = 318;
    node(Ax, Ay, 'A', 'blue', { sub: 'suspects C' });
    node(Bx, By, 'B', 'green', { sub: 'helper' });
    node(Cx, Cy, 'C', 'amber', { sub: 'quiet', halo: true });
    // direct ping — maybe lost
    const e1 = edge([V(Ax + 42, Ay - 2), V((Ax + Cx) / 2, Ay + 40), V(Cx - 42, Cy - 2)], { dashed: true });
    guides.push(e1.guide);
    badges.push(pill((Ax + Cx) / 2, Ay + 66, 'direct ping — lost?', { icon: 'alert', cls: 'pill--sst' }));
    // A → B request (animated)
    const e2 = edge([V(Ax + 24, Ay - 22), V(Bx - 46, By + 8)], { arrow: true });
    guides.push(e2.guide); railIn = e2.d;
    // B → C indirect probe
    const e3 = edge([V(Bx + 46, By + 8), V(Cx - 24, Cy - 22)], { arrow: true, dashed: true });
    guides.push(e3.guide);
    badges.push(pill(Bx, 108, 'A asks B to probe C', { icon: 'search', cls: 'pill--sst' }));
    badges.push(region(300, 452, 440, 60, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="520" y="488" text-anchor="middle">C ANSWERS B → ALIVE, JUST A LOST PACKET</text>`);
    badges.push(cap(520, 536, 'indirect probes turn a shaky single ping into a second opinion'));
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP ─────────────────────────────────────────────────────────────── */
  const pts = ring(5, 540, 230, 210, 96);
  const links = [[0, 2], [1, 3], [2, 4]];
  links.forEach(lk => { const e = edge([V(pts[lk[0]].x, pts[lk[0]].y), V(pts[lk[1]].x, pts[lk[1]].y)], { dashed: true }); guides.push(e.guide); });
  pts.forEach((p, i) => node(p.x, p.y, 'N' + (i + 1), 'green', { rx: 34, h: 34, iconSize: 15 }));
  badges.push(pill(540, 92, 'a healthy, self-aware cluster', { icon: 'check', cls: 'pill--sst' }));
  const tags = ['beat = liveness signal', 'tune the interval', 'gossip → O(N)', 'indirect probes kill false alarms'];
  tags.forEach((t, i) => badges.push(pill(i % 2 ? 790 : 290, 420 + Math.floor(i / 2) * 48, t, { icon: 'check', w: 300 })));
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
  <svg class="scene scene--heartbeats" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Heartbeats and failure detection">
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
