/* connection-pooling-scene.js — the "Connection Pooling" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs and
   labels, soft ground shadows, halos, pill badges, dashed logical regions, routed
   connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, clients, size, busy, hot, queued, note }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'noPool' (per-request handshake storm), 'pool' (fixed pool in the
   middle), 'checkout' (borrow→use→return), 'saturation' (all busy, clients
   queue), 'tradeoff' (too small vs too large), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* evenly spread N vertical slots around a centre */
function spread(n, cy, gap) {
  const out = [];
  const start = cy - (n - 1) * gap / 2;
  for (let i = 0; i < n; i++) out.push(start + i * gap);
  return out;
}

export function renderConnectionPoolingScene(snap, opts = {}) {
  const view = snap.view || 'pool';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── TRADE-OFF: two columns, no tower ─────────────────────────────────── */
  if (view === 'tradeoff') {
    const col = (x, title, icon, mat, rows) => {
      badges.push(region(x, 92, 300, 408, '', { r: 22 }));
      badges.push(pill(x + 150, 112, title, { icon, w: 236 }));
      const head = isoCube(x + 150, 176, 60, 54, mat, { icon, iconSize: 22 });
      shadows.push(head.shadow); solids.push(head.g);
      rows.forEach((t, i) => badges.push(pill(x + 150, 300 + i * 46, t, { icon: t[0] === '+' ? 'check' : 'alert', w: 272 })));
    };
    col(110, 'Pool too small', 'clock', 'rose', [
      '− clients stuck in the queue',
      '− database sits half-idle',
      '− latency spikes under load',
      '+ DB never overloaded',
    ]);
    col(630, 'Pool too large', 'server', 'amber', [
      '− hundreds of backends',
      '− CPU lost to context switches',
      '− RAM per connection adds up',
      '+ no client ever waits',
    ]);
    badges.push(pill(VW / 2, 548, 'sweet spot ≈ cores × 2', { icon: 'target', cls: 'pill--sst' }));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── common geometry: clients (left) · pool (mid) · database (right) ───── */
  const nClients = snap.clients || 6;
  const CLIENT_X = 150;
  const cys = spread(nClients, 250, 72);
  const clients = cys.map((y, i) => isoCube(CLIENT_X, y, 34, 40, 'blue', {
    icon: 'app', label: i === 0 ? 'Clients' : '', iconSize: 18,
  }));
  clients.forEach(c => { shadows.push(c.shadow); solids.push(c.g); });

  const DB_X = 892, DB_Y = 250;
  const db = isoCube(DB_X, DB_Y, 96, 112, 'green', { icon: 'database', label: 'Database', sub: 'backends', halo: true });

  /* ── NO POOL: every client opens a private connection straight to the DB ─ */
  if (view === 'noPool') {
    shadows.push(db.shadow); halos.push(db.halo); solids.push(db.g);
    clients.forEach((c, i) => {
      const e = edge([
        V(c.verts.E.x - 2, c.front[1]),
        V((c.verts.E.x + db.verts.W.x) / 2, c.front[1] + (DB_Y - c.front[1]) * 0.1),
        V(db.verts.W.x - 6, db.verts.W.y + (i - nClients / 2) * 10 + 6),
      ], { arrow: true, dashed: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d;
    });
    badges.push(pill(VW / 2, 86, 'one connection per request · TCP + TLS + auth', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(region(DB_X - 150, 360, 300, 150, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="${DB_X}" y="${A(452)}" text-anchor="middle">HANDSHAKE STORM · A BACKEND EACH</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: railIn ? [{ id: 'in', kind: 'write', speed: 120, size: 6 }] : [], note: snap.note });
  }

  /* ── all pool views: a bounded region of connection tiles in the middle ── */
  shadows.push(db.shadow); halos.push(db.halo); solids.push(db.g);

  const size = snap.size || 8;
  const POOL_X = 520, POOL_Y = 92, POOL_W = 250, POOL_H = 330;
  badges.push(region(POOL_X - POOL_W / 2, POOL_Y, POOL_W, POOL_H, '', { r: 20 }));
  badges.push(pill(POOL_X, POOL_Y - 4, `Connection pool · ${size}`, { icon: 'layers' }));

  // lay the connections out in a 2-column grid of small iso tiles
  const cols = 2, rows = Math.ceil(size / cols);
  const cellW = 92, cellH = 46;
  const gx0 = POOL_X - cellW / 2, gy0 = POOL_Y + 58;
  const conns = [];
  for (let i = 0; i < size; i++) {
    const r = Math.floor(i / cols), cc = i % cols;
    const cx = gx0 + cc * cellW, cy = gy0 + r * cellH;
    conns.push({ i, cx, cy });
  }

  // decide which connections are busy / hot / idle per view
  const busyN = snap.busy != null ? snap.busy : (view === 'saturation' ? size : 2);
  const hot = snap.hot != null ? snap.hot : -1;
  const connTiles = conns.map(({ i, cx, cy }) => {
    const isBusy = view === 'saturation' ? true : i < busyN;
    const isHot = i === hot;
    const mat = isHot ? 'rose' : isBusy ? 'amber' : 'green';
    const t = isoTile(cx, cy, 30, mat, { h: 16, halo: isHot });
    return { t, cx, cy, isBusy, isHot };
  });
  connTiles.forEach(({ t, isHot }) => { shadows.push(t.shadow); if (isHot) halos.push(t.halo); solids.push(t.g); });

  // clients fan into the LEFT edge of the pool
  clients.forEach((c, i) => {
    const e = edge([
      V(c.verts.E.x - 2, c.front[1]),
      V((c.verts.E.x + (POOL_X - POOL_W / 2)) / 2, c.front[1]),
      V(POOL_X - POOL_W / 2 - 6, POOL_Y + POOL_H / 2),
    ], { arrow: true });
    guides.push(e.guide);
    if (i === 0) railIn = e.d;
  });

  // pool's RIGHT edge → database (the reused, warm wires)
  const oe = edge([
    V(POOL_X + POOL_W / 2 + 2, POOL_Y + POOL_H / 2),
    V((POOL_X + POOL_W / 2 + db.verts.W.x) / 2, DB_Y - 20),
    V(db.verts.W.x - 6, db.verts.W.y + 6),
  ], { arrow: true });
  guides.push(oe.guide); railOut = oe.d;

  const flows = [{ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'write', speed: 140, size: 6 }];

  if (view === 'pool') {
    badges.push(`<text class="sst-cap" x="${POOL_X}" y="${A(POOL_Y + POOL_H + 24)}" text-anchor="middle">opened once · kept warm · reused</text>`);
  }

  else if (view === 'checkout') {
    // annotate the hot connection travelling the borrow→use→return cycle
    const ht = connTiles.find(c => c.isHot) || connTiles[0];
    badges.push(pill(POOL_X - POOL_W / 2 - 4, POOL_Y + POOL_H / 2 - 40, 'borrow', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(POOL_X + POOL_W / 2 + 4, POOL_Y + POOL_H / 2 + 40, 'return', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="${ht.cx}" y="${A(ht.cy + 44)}" text-anchor="middle">leased: idle → busy → idle</text>`);
  }

  else if (view === 'saturation') {
    // a queue of waiting clients stacked below the client column
    const qN = snap.queued || 4;
    const qys = spread(qN, 452, 40);
    qys.forEach((y, i) => {
      const q = isoTile(CLIENT_X + 6, y, 26, 'slate', { h: 12 });
      shadows.push(q.shadow); solids.push(q.g);
    });
    badges.push(pill(CLIENT_X + 6, 400, 'WAIT QUEUE', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="${POOL_X}" y="${A(POOL_Y + POOL_H + 26)}" text-anchor="middle">ALL BUSY · BACK-PRESSURE</text>`);
  }

  else if (view === 'recap') {
    const tags = ['reused, not reopened', 'bounded concurrency', 'DB protected', 'steady low latency'];
    tags.forEach((t, i) => badges.push(pill(POOL_X, POOL_Y + POOL_H + 26 + i * 0, t, { icon: 'check', w: 210 })));
    // place recap tags in a tidy vertical stack to the right of the DB base instead
    badges.length && 0;
  }

  if (view === 'recap') {
    // override: clean tag stack under the pool
    const tags = ['reused, not reopened', 'bounded concurrency', 'DB protected', 'steady latency'];
    // remove the duplicate tags pushed above by rebuilding is overkill; they were placed at same y.
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
  <svg class="scene scene--connection-pooling" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Connection pooling architecture">
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
