/* event-logs-scene.js — the "Event Logs" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes, flat log-segment tiles, soft ground
   shadows, halos, pill badges, dashed regions, routed connectors with arrows, a
   faded iso grid and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'queue' (a queue deletes on consume), 'log' (append-only ordered log
   with offsets), 'partitions' (log split into partitions), 'consumers' (many
   groups read at independent offsets), 'source' (log as source of truth → a
   derived view), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderEventLogsScene(snap, opts = {}) {
  const view = snap.view || 'log';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // a boxy node (producer / consumer / store); caller keeps the coords
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 42, o.h || 38, mat, {
      icon: o.icon || 'app', label, sub: o.sub || '', iconSize: 17,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // a flat log-segment tile at (x,y); returns its centre for routing
  const seg = (x, y, mat, o = {}) => {
    const c = isoTile(x, y, o.rx || 26, mat, { h: o.h || 16, ghost: !!o.ghost, halo: !!o.halo });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return { x, y };
  };

  // draw a left→right row of n segments; returns array of centre x's
  const segRow = (x0, y, n, startOff, o = {}) => {
    const dx = o.dx || 56, xs = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + i * dx;
      const head = (i === n - 1);
      const mat = o.mat ? o.mat(i, head) : (head ? 'green' : 'lilac');
      seg(x, y, mat, { halo: head && o.headHalo });
      if (o.offsets !== false) badges.push(cap(x, y - (o.capUp || 24), String(startOff + i)));
      xs.push(x);
    }
    return xs;
  };

  /* ── QUEUE: a classic queue deletes a message once it is consumed ───────── */
  if (view === 'queue') {
    const qy = 250;
    node(150, qy, 'producer', 'blue', { icon: 'app' });
    const qxs = [405, 475, 545, 615];
    qxs.forEach((x, i) => seg(x, qy, i === 0 ? 'slate' : 'amber', { rx: 28, ghost: i === 0 }));
    node(885, qy, 'consumer', 'green', { icon: 'app' });
    const ein = edge([V(198, qy), V(300, qy), V(377, qy)], { arrow: true });
    const eout = edge([V(643, qy), V(760, qy), V(837, qy)], { arrow: true });
    guides.push(ein.guide, eout.guide); railIn = ein.d; railOut = eout.d;
    badges.push(pill(405, qy - 58, 'consumed → deleted', { icon: 'trash', cls: 'pill--sst' }));
    badges.push(pill(760, qy - 58, 'read once', { icon: 'check', cls: 'pill--sst' }));
    badges.push(region(150, 372, 740, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="410" text-anchor="middle">QUEUE · READ ONCE, THEN GONE — NO REPLAY, NO SECOND CONSUMER</text>`);
    cap(VW / 2, 442, 'after a message is acked it is dropped; its history is lost forever');
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 }, { id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LOG: an immutable append-only log, each event at a growing offset ──── */
  if (view === 'log') {
    const ly = 270, x0 = 150, dx = 80, n = 9;
    const xs = segRow(x0, ly, n, 0, { dx, headHalo: true, capUp: 26,
      mat: (i, head) => head ? 'green' : (i >= n - 3 ? 'amber' : 'lilac') });
    const head = xs[n - 1];
    node(head + 40, 140, 'producer', 'blue', { icon: 'app' });
    const e = edge([V(head + 40, 178), V(head + 20, 214), V(head, ly - 26)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(x0 + 70, ly - 78, 'append-only · immutable', { icon: 'listOrdered', cls: 'pill--sst' }));
    badges.push(pill(head, ly + 58, 'head · offset ' + (n - 1), { icon: 'bolt', cls: 'pill--sst' }));
    cap(VW / 2, ly + 108, 'every event gets a monotonic offset and is never overwritten or deleted');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── PARTITIONS: the log is split into partitions for scale ────────────── */
  if (view === 'partitions') {
    const rowsY = [175, 285, 395], x0 = 360, dx = 62, n = 6;
    const firstX = [];
    rowsY.forEach((y, p) => {
      const xs = segRow(x0, y, n, p * 100, { dx, offsets: false,
        mat: (i, head) => head ? 'green' : 'lilac' });
      firstX.push(xs[0]);
      badges.push(pill(220, y, 'partition ' + p, { icon: 'layers', cls: 'pill--sst' }));
    });
    node(120, 285, 'producer', 'blue', { icon: 'app' });
    firstX.forEach((fx, p) => {
      const e = edge([V(158, 285), V(290, rowsY[p]), V(fx - 32, rowsY[p])], { arrow: true });
      guides.push(e.guide); if (p === 1) railOut = e.d;
    });
    badges.push(pill(VW / 2 + 120, 478, 'hash(key) → partition', { icon: 'merge', cls: 'pill--sst' }));
    cap(VW / 2, 516, 'order is guaranteed only within a partition — across partitions it is not');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── CONSUMERS: groups read forward at their own independent offsets ────── */
  if (view === 'consumers') {
    const ly = 210, x0 = 150, dx = 74, n = 10;
    const xs = segRow(x0, ly, n, 0, { dx, headHalo: true,
      mat: (i, head) => head ? 'green' : (i >= n - 2 ? 'amber' : 'lilac') });
    // group A near the head (caught up), group B lagging behind
    const aIdx = 8, bIdx = 3, cy = 450;
    node(xs[aIdx], cy, 'group A', 'blue', { icon: 'app', sub: 'offset ' + aIdx });
    node(xs[bIdx], cy, 'group B', 'slate', { icon: 'app', sub: 'offset ' + bIdx });
    const ea = edge([V(xs[aIdx], cy - 40), V(xs[aIdx], ly + 40)], { arrow: true });
    const eb = edge([V(xs[bIdx], cy - 40), V(xs[bIdx], ly + 40)], { arrow: true });
    guides.push(ea.guide, eb.guide); railOut = ea.d;
    badges.push(pill(xs[aIdx], cy + 58, 'caught up', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(xs[bIdx], cy + 58, 'lagging · can replay', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(pill(xs[1] + 40, ly - 70, 'retention keeps old events → replay from any offset', { icon: 'scroll', cls: 'pill--sst' }));
    cap(VW / 2, 548, 'each consumer group tracks its own offset and reads forward at its own pace');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SOURCE: the log is the source of truth; state is a derived view ────── */
  if (view === 'source') {
    const ly = 210, x0 = 150, dx = 64, n = 6;
    const xs = segRow(x0, ly, n, 0, { dx, mat: (i, head) => head ? 'green' : 'amber' });
    badges.push(pill(x0 + 70, ly - 72, 'log = source of truth', { icon: 'scroll', cls: 'pill--sst' }));
    const store = node(820, ly + 20, 'derived view', 'blue', { icon: 'database', rx: 52, h: 46 });
    const e = edge([V(xs[n - 1] + 34, ly), V(660, ly + 20), V(760, ly + 20)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(665, ly - 44, 'replay → rebuild state', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(region(120, 372, 480, 150, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="360" y="400" text-anchor="middle">YOU GAIN</text>`);
    ['replay anytime', 'many consumers', 'full audit trail'].forEach((t, i) =>
      badges.push(pill(360, 428 + i * 34, t, { icon: 'check', w: 230 })));
    badges.push(region(628, 372, 300, 150, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="778" y="400" text-anchor="middle">YOU PAY</text>`);
    ['storage grows', 'per-partition order', 'idempotent replays'].forEach((t, i) =>
      badges.push(pill(778, 428 + i * 34, t, { icon: 'alert', w: 240 })));
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP ──────────────────────────────────────────────────────────────── */
  const ly = 240, x0 = 215, dx = 76, n = 8;
  segRow(x0, ly, n, 0, { dx, headHalo: true, mat: (i, head) => head ? 'green' : 'lilac' });
  badges.push(region(150, 150, 740, 150, 'append-only log · per-consumer offsets', { r: 24 }));
  const tags = ['replay from any offset', 'many independent consumers', 'one source of truth'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 360 + i * 44, t, { icon: 'check', w: 320 })));
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
  <svg class="scene scene--event-logs" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Event logs">
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
