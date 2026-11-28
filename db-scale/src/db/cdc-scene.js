/* cdc-scene.js — the "Change Data Capture" scene, in the shared Designed-to-Scale
   isometric vocabulary: rounded iso cubes with icon glyphs and labels, soft
   ground shadows, halos, pill badges, dashed logical regions, routed connectors
   with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'dualwrite' (app writes DB + index separately), 'tap' (CDC reads the
   WAL), 'decode' (connector decodes commits into change events), 'fanout' (event
   log feeds many consumers), 'tradeoff' (lag + re-delivery), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderCdcScene(snap, opts = {}) {
  const view = snap.view || 'tap';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a node; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'server', label, sub: o.sub || '', iconSize: o.iconSize || 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // a small change-event tile on the rail
  const evt = (x, y, mat, o = {}) => {
    const t = isoTile(x, y, o.rx || 22, mat, { halo: !!o.halo, ghost: !!o.ghost });
    shadows.push(t.shadow); if (o.halo) halos.push(t.halo); solids.push(t.g);
    return t;
  };

  /* ── DUALWRITE: app writes DB and index separately, race ───────────────── */
  if (view === 'dualwrite') {
    const ax = 190, ay = 268;
    node(ax, ay, 'app', 'blue', { icon: 'app', sub: 'writes twice' });
    const dbx = 640, dby = 180, ixx = 640, ixy = 372;
    node(dbx, dby, 'database', 'amber', { icon: 'database', sub: 'committed' });
    node(ixx, ixy, 'search index', 'lilac', { icon: 'search', sub: 'write failed', ghost: true });
    const e1 = edge([V(ax + 44, ay - 10), V((ax + dbx) / 2, dby + 18), V(dbx - 48, dby + 12)], { arrow: true });
    const e2 = edge([V(ax + 44, ay + 12), V((ax + ixx) / 2, ixy - 18), V(ixx - 48, ixy - 6)], { arrow: true, dashed: true });
    guides.push(e1.guide, e2.guide); railOut = e1.d;
    badges.push(pill(dbx, dby - 70, 'order #42 ✓', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(ixx, ixy + 72, 'order #42 ✗ lost', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill((ax + ixx) / 2, ixy - 44, 'no shared transaction', { icon: 'alert', cls: 'pill--sst' }));
    cap(VW / 2, 508, 'two separate writes — one can fail, lag, or reorder');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── TAP: the WAL already records every commit; CDC reads it ───────────── */
  if (view === 'tap') {
    const appx = 170, appy = 150;
    node(appx, appy, 'app', 'blue', { icon: 'app', sub: 'commits' });
    const dbx = 170, dby = 360;
    node(dbx, dby, 'database', 'amber', { icon: 'database', sub: 'applies' });
    const ea = edge([V(appx, appy + 44), V(dbx, dby - 48)], { arrow: true });
    guides.push(ea.guide);
    // the WAL: a row of log-record tiles across the middle
    const walY = 268, walXs = [430, 500, 570, 640, 710, 780];
    walXs.forEach((x, i) => evt(x, walY, 'amber', {}));
    badges.push(region(396, 214, 430, 110, '', { r: 20 }));
    badges.push(pill(611, 198, 'WRITE-AHEAD LOG · every commit, in order', { icon: 'wal', cls: 'pill--sst' }));
    const ew = edge([V(dbx + 46, dby - 20), V(396, walY + 40), V(418, walY + 6)], { arrow: true });
    guides.push(ew.guide);
    // CDC reads the tail of the log
    const cdcx = 920, cdcy = 268;
    node(cdcx, cdcy, 'CDC', 'green', { icon: 'merge', sub: 'reads log', halo: true });
    const ec = edge([V(walXs[5] + 24, walY), V(cdcx - 48, cdcy)], { arrow: true });
    guides.push(ec.guide); railOut = ec.d;
    cap(VW / 2, 508, 'a change that isn’t in the log never happened — so read the log');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DECODE: connector turns WAL records into change events ────────────── */
  if (view === 'decode') {
    const walY = 170, walXs = [210, 280, 350, 420];
    walXs.forEach((x) => evt(x, walY, 'amber', {}));
    badges.push(pill(315, 120, 'WAL records', { icon: 'wal', cls: 'pill--sst' }));
    const connx = 520, conny = 268;
    node(connx, conny, 'connector', 'green', { icon: 'merge', sub: 'decode', halo: true, rx: 52 });
    const ein = edge([V(420 + 22, walY + 8), V(connx - 40, conny - 40), V(connx - 20, conny - 18)], { arrow: true });
    guides.push(ein.guide); railIn = ein.d;
    // decoded events out to the event log
    const logY = 372, logXs = [690, 760, 830, 900];
    const ops = ['green', 'blue', 'rose', 'green'];
    logXs.forEach((x, i) => evt(x, logY, ops[i], { halo: i === 0 }));
    badges.push(region(656, 330, 300, 86, '', { r: 18 }));
    badges.push(pill(806, 316, 'EVENT LOG · {op, before, after, lsn}', { icon: 'listOrdered', cls: 'pill--sst' }));
    const eout = edge([V(connx + 40, conny + 18), V(connx + 90, logY - 30), V(logXs[0] - 20, logY - 14)], { arrow: true });
    guides.push(eout.guide); railOut = eout.d;
    badges.push(pill(connx, conny + 92, 'snapshot first, then tail the log', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 512, 'each commit → a structured change event, published in order');
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── FANOUT: one event log feeds many derived systems ──────────────────── */
  if (view === 'fanout') {
    const logX = 250, logY = 268;
    node(logX, logY, 'event log', 'green', { icon: 'listOrdered', sub: 'ordered', halo: true, rx: 52 });
    // the change-event tiles streaming out of the log
    const tileXs = [330, 388, 446];
    tileXs.forEach((x, i) => evt(x, logY, 'green', {}));
    const consumers = [
      { x: 780, y: 140, label: 'search', mat: 'lilac', icon: 'search', off: 'offset 1240' },
      { x: 820, y: 268, label: 'cache', mat: 'blue', icon: 'bolt', off: 'offset 1180' },
      { x: 780, y: 396, label: 'warehouse', mat: 'slate', icon: 'database', off: 'offset 980' },
    ];
    consumers.forEach((c, i) => {
      node(c.x, c.y, c.label, c.mat, { icon: c.icon, sub: c.off.replace('offset ', '@ ') });
      const e = edge([V(logX + 54, logY + (i - 1) * 10), V((logX + c.x) / 2, c.y), V(c.x - 48, c.y)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    badges.push(pill(VW / 2, 474, 'each consumer reads at its own offset · replayable from 0', { icon: 'check' }));
    cap(VW / 2, 512, 'every derived system is a function of the one ordered log');
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── TRADEOFF: lag + at-least-once re-delivery ─────────────────────────── */
  if (view === 'tradeoff') {
    const dbx = 200, dby = 268;
    node(dbx, dby, 'database', 'amber', { icon: 'database', sub: 'now' });
    const conx = 840, cony = 268;
    node(conx, cony, 'consumer', 'lilac', { icon: 'search', sub: 'idempotent', halo: true });
    // a long rail of events, two of them duplicated
    const ry = 268;
    const xs = [320, 390, 460, 530, 600, 600, 680, 750];
    const dup = [4, 5];
    xs.forEach((x, i) => {
      const isDup = dup.includes(i);
      evt(x, ry - (isDup && i === 5 ? 30 : 0), isDup ? 'rose' : 'green', { halo: i === 5 });
    });
    const er = edge([V(dbx + 46, dby), V(conx - 48, cony)], { arrow: true });
    guides.push(er.guide); railOut = er.d;
    badges.push(pill(500, 150, 'trails the source by freshness lag', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(pill(600, 372, 're-delivered (at-least-once)', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(conx, cony + 84, 'apply twice = apply once', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 512, 'events arrive late and can repeat — the consumer must absorb both');
    flows.push({ id: 'out', kind: 'write', speed: 160, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: one log of changes, many systems in sync ───────────────────── */
  const dbx = 180, dby = 268;
  node(dbx, dby, 'database', 'amber', { icon: 'database', sub: 'source' });
  const logx = 440, logy = 268;
  node(logx, logy, 'change log', 'green', { icon: 'listOrdered', sub: 'ordered', halo: true, rx: 50 });
  const erl = edge([V(dbx + 46, dby), V(logx - 50, logy)], { arrow: true });
  guides.push(erl.guide);
  badges.push(pill((dbx + logx) / 2, dby - 60, 'tap the WAL', { icon: 'wal', cls: 'pill--sst' }));
  const sinks = [{ y: 150, l: 'search', m: 'lilac', ic: 'search' }, { y: 268, l: 'cache', m: 'blue', ic: 'bolt' }, { y: 386, l: 'warehouse', m: 'slate', ic: 'database' }];
  sinks.forEach((s, i) => {
    node(820, s.y, s.l, s.m, { icon: s.ic, sub: 'derived' });
    const e = edge([V(logx + 52, logy + (i - 1) * 10), V(660, s.y), V(820 - 48, s.y)], { arrow: true });
    guides.push(e.guide);
  });
  badges.push(region(118, 456, 884, 74, 'tap the log · stream the change · many views, one truth', { r: 22 }));
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
  <svg class="scene scene--cdc" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Change Data Capture">
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
