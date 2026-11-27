/* read-write-quorum-scene.js — the "Read/Write Quorum" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs and
   labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'problem' (write one / read another → stale), 'write' (write quorum W),
   'read' (read quorum R), 'overlap' (W+R>N forces intersection), 'tune'
   (sliding W vs R), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* the three replicas sit in a row across the middle band */
const RY = 338, RRX = 66, RBH = 52;
const REPL = [
  { key: 'R1', x: 312 },
  { key: 'R2', x: 540 },
  { key: 'R3', x: 768 },
];

export function renderReadWriteQuorumScene(snap, opts = {}) {
  const view = snap.view || 'problem';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  /* ── TUNE: two columns, no replica row ─────────────────────────────────── */
  if (view === 'tune') {
    const col = (x, title, icon, mat, rows) => {
      badges.push(region(x, 96, 300, 404, '', { r: 22 }));
      badges.push(pill(x + 150, 116, title, { icon, w: 236 }));
      const head = isoCube(x + 150, 176, 60, 54, mat, { icon, iconSize: 22 });
      shadows.push(head.shadow); solids.push(head.g);
      rows.forEach((t, i) => badges.push(pill(x + 150, 300 + i * 46, t, { icon: t[0] === '+' ? 'check' : 'alert', w: 270 })));
    };
    col(110, 'W = N, R = 1', 'search', 'green', [
      '+ any one replica answers a read',
      '+ reads are fast & cheap',
      '− a write needs every replica up',
      '− one node down blocks all writes',
    ]);
    col(630, 'W = 1, R = N', 'bolt', 'amber', [
      '+ a write needs just one ack',
      '+ writes stay available',
      '− a read must poll every replica',
      '− reads are slow & costly',
    ]);
    badges.push(pill(VW / 2, 540, 'balanced:  W = R = ⌈(N+1)/2⌉ = 2', { icon: 'gauge', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── all replica-row views ─────────────────────────────────────────────── */
  // per-view state: mat, sub(version), halo, dim
  const V5 = 'v5', V4 = 'v4';
  let state = {};
  if (view === 'problem') {
    state = { R1: { mat: 'green', sub: V5, halo: true }, R2: { mat: 'slate', sub: V4 }, R3: { mat: 'rose', sub: V4, halo: true } };
  } else if (view === 'write') {
    state = { R1: { mat: 'green', sub: V5, halo: true }, R2: { mat: 'green', sub: V5, halo: true }, R3: { mat: 'slate', sub: V4, dim: true } };
  } else if (view === 'read') {
    state = { R1: { mat: 'slate', sub: V5, dim: true }, R2: { mat: 'blue', sub: V5, halo: true }, R3: { mat: 'blue', sub: V4, halo: true } };
  } else if (view === 'overlap') {
    state = { R1: { mat: 'green', sub: V5 }, R2: { mat: 'lilac', sub: V5, halo: true }, R3: { mat: 'blue', sub: V4 } };
  } else { // recap
    state = { R1: { mat: 'green', sub: V5, halo: true }, R2: { mat: 'green', sub: V5, halo: true }, R3: { mat: 'green', sub: V5, halo: true } };
  }

  const cubes = {};
  REPL.forEach((r, i) => {
    const st = state[r.key] || { mat: 'slate', sub: V4 };
    const c = isoCube(r.x, RY, RRX, RBH, st.mat, {
      icon: 'database', label: r.key, sub: st.sub, iconSize: 20,
      halo: !!st.halo, ghost: !!st.dim,
    });
    cubes[r.key] = c;
    shadows.push(c.shadow); if (st.halo) halos.push(c.halo); solids.push(c.g);
  });

  // client cubes: writer top-left, reader top-right
  const writer = isoCube(150, 150, 48, 52, 'blue', { icon: 'app', label: 'Writer', iconSize: 20 });
  const reader = isoCube(900, 150, 48, 52, 'blue', { icon: 'app', label: 'Reader', iconSize: 20 });

  function writeTo(keys, animate) {
    keys.forEach((k, idx) => {
      const c = cubes[k];
      const e = edge([
        V(writer.verts.E.x - 2, writer.front[1]),
        V((writer.verts.E.x + c.verts.N.x) / 2, writer.front[1] + 40),
        V(c.verts.N.x, c.verts.N.y - 2),
      ], { arrow: true });
      guides.push(e.guide);
      if (animate && idx === 0) railOut = e.d;
    });
  }
  function readFrom(keys, animate) {
    keys.forEach((k, idx) => {
      const c = cubes[k];
      const e = edge([
        V(c.verts.N.x, c.verts.N.y - 2),
        V((reader.verts.W.x + c.verts.N.x) / 2, reader.front[1] + 40),
        V(reader.verts.W.x - 2, reader.front[1]),
      ], { arrow: true, dashed: true });
      guides.push(e.guide);
      if (animate && idx === 0) railIn = e.d;
    });
  }

  if (view === 'problem') {
    shadows.push(writer.shadow); solids.push(writer.g);
    shadows.push(reader.shadow); solids.push(reader.g);
    writeTo(['R1'], true);
    readFrom(['R3'], true);
    badges.push(pill(writer.x + 150, 150, 'write v5 → R1', { icon: 'bolt', cls: 'pill--sst' }));
    badges.push(pill(reader.x - 150, 150, 'read v4 ← R3', { icon: 'search', cls: 'pill--sst' }));
    badges.push(region(690, 420, 300, 120, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="840" y="468" text-anchor="middle">STALE READ</text>`);
    badges.push(cap(840, 500, 'write and read missed each other'));
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 }, { id: 'in', kind: 'read', speed: 150, size: 5 });
  }

  else if (view === 'write') {
    shadows.push(writer.shadow); solids.push(writer.g);
    writeTo(['R1', 'R2', 'R3'], true);
    badges.push(pill(VW / 2, 150, 'W = 2 of 3  ·  return after two acks', { icon: 'bolt' }));
    badges.push(region(246, 440, 588, 120, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="540" y="488" text-anchor="middle">WRITE QUORUM  ·  R1, R2 ACKED v5</text>`);
    badges.push(cap(768, 420, 'R3 still catching up'));
    flows.push({ id: 'out', kind: 'write', speed: 160, size: 6 });
  }

  else if (view === 'read') {
    shadows.push(reader.shadow); solids.push(reader.g);
    readFrom(['R2', 'R3'], true);
    badges.push(pill(VW / 2, 150, 'R = 2 of 3  ·  keep the newest version', { icon: 'search' }));
    badges.push(region(426, 440, 528, 120, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="690" y="488" text-anchor="middle">READ QUORUM  ·  max(v5, v4) = v5</text>`);
    flows.push({ id: 'in', kind: 'read', speed: 160, size: 5 });
  }

  else if (view === 'overlap') {
    shadows.push(writer.shadow); solids.push(writer.g);
    shadows.push(reader.shadow); solids.push(reader.g);
    writeTo(['R1', 'R2'], true);
    readFrom(['R2', 'R3'], true);
    // the two sets as dashed regions, sharing R2
    badges.push(region(228, 268, 430, 150, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="330" y="298" text-anchor="middle">WRITE SET  W={R1,R2}</text>`);
    badges.push(region(452, 268, 408, 150, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="760" y="298" text-anchor="middle">READ SET  R={R2,R3}</text>`);
    badges.push(pill(540, 470, 'W + R > N   (2 + 2 > 3)', { icon: 'check' }));
    badges.push(cap(540, 506, 'the sets must share R2 — which holds v5'));
    flows.push({ id: 'out', kind: 'write', speed: 160, size: 6 }, { id: 'in', kind: 'read', speed: 160, size: 5 });
  }

  else { // recap
    badges.push(region(228, 268, 632, 150, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="540" y="300" text-anchor="middle">EVERY REPLICA CURRENT · OVERLAP GUARANTEED</text>`);
    const tags = ['W + R > N → overlap', 'read sees latest write', 'split W/R to tune latency'];
    tags.forEach((t, i) => badges.push(pill(540, 460 + i * 44, t, { icon: 'check', w: 300 })));
  }

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
  <svg class="scene scene--read-write-quorum" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Read/write quorum">
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
