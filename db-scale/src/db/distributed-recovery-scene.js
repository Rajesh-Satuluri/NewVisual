/* distributed-recovery-scene.js — the "Distributed Recovery" scene, in the
   shared Designed-to-Scale isometric vocabulary: rounded iso cubes with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'gap' (returning node is behind the leader), 'rejoin' (quarantined as
   a catching-up follower), 'catchup' (leader ships missing log entries),
   'heal' (partition heals, minority drops its divergent tail), 'cost' (catch-up
   draws leader bandwidth), 'recap' (detect → catch up → reconcile → rejoin). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const ROWY = 300;

export function renderDistributedRecoveryScene(snap, opts = {}) {
  const view = snap.view || 'gap';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a node; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'server', label, sub: o.sub || '', iconSize: 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // a small log tile, drawn as a short wide cube with a position label
  const logTile = (x, y, label, mat, o = {}) => {
    const c = isoTile(x, y, o.rx || 30, mat, { ghost: !!o.ghost, halo: !!o.halo });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    if (label) badges.push(`<text class="iso-label" x="${A(x)}" y="${A(y + 4)}" text-anchor="middle">${esc(label)}</text>`);
    return c;
  };

  /* ── GAP: returning node is 27 entries behind the leader ───────────────── */
  if (view === 'gap') {
    const lx = 300, rx = 760;
    node(lx, ROWY, 'leader', 'amber', { icon: 'wal', sub: 'log #131', rx: 50, halo: true });
    node(rx, ROWY, 'node', 'slate', { icon: 'server', sub: 'log #104', rx: 50, ghost: true });
    badges.push(pill(lx, ROWY - 100, 'committed tip · #131', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(rx, ROWY - 100, 'returned · #104', { icon: 'alert', cls: 'pill--sst' }));
    // the hole between them
    badges.push(region(430, 236, 200, 128, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="530" y="296" text-anchor="middle">GAP · 27 ENTRIES</text>`);
    badges.push(pill(530, 150, 'missed every write while it was gone', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(rx, ROWY + 118, 'serving now → STALE READS', { icon: 'alert', cls: 'pill--sst' }));
    cap(VW / 2, 470, 'a node back from a crash or partition holds an out-of-date log');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── REJOIN: quarantined as a catching-up follower ─────────────────────── */
  if (view === 'rejoin') {
    const lx = 300, rx = 760;
    node(lx, ROWY, 'leader', 'amber', { icon: 'wal', sub: 'in sync', rx: 50, halo: true });
    node(rx, ROWY, 'node', 'rose', { icon: 'server', sub: 'catching up', rx: 50 });
    // handshake probing for the matching point
    const e = edge([V(lx + 52, ROWY - 8), V(VW / 2, 236), V(rx - 52, ROWY - 8)], { dashed: true, arrow: true });
    guides.push(e.guide);
    badges.push(pill(VW / 2, 214, 'match point = #104', { icon: 'search', cls: 'pill--sst' }));
    badges.push(region(626, 230, 268, 150, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="760" y="214" text-anchor="middle">QUARANTINED</text>`);
    badges.push(pill(rx, ROWY + 120, 'no reads · no votes', { icon: 'alert', cls: 'pill--sst' }));
    cap(VW / 2, 470, 'rejoins as a follower — compares logs, stays idle until caught up');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── CATCHUP: leader ships the missing WAL entries, follower replays ───── */
  if (view === 'catchup') {
    const lx = 230, rx = 810;
    node(lx, ROWY, 'leader', 'amber', { icon: 'wal', sub: 'ships log', rx: 50, halo: true });
    node(rx, ROWY, 'node', 'green', { icon: 'server', sub: 'replays', rx: 50, halo: true });
    // a row of shipped log entries flowing left → right
    const ex = [360, 440, 520, 600, 680];
    ex.forEach((x, i) => logTile(x, ROWY, '#' + (105 + i * 6), i < 4 ? 'lilac' : 'slate', { ghost: i === 4 }));
    const e = edge([V(lx + 52, ROWY - 6), V(VW / 2, 224), V(rx - 52, ROWY - 6)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(VW / 2, 196, 'log shipping · WAL #105…#131', { icon: 'wal', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, 408, 'too far behind? → snapshot, then tail the log', { icon: 'layers', cls: 'pill--sst' }));
    cap(VW / 2, 470, 'stream the missing entries and replay until the log matches the tip');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── HEAL: partition heals, minority drops its divergent tail ──────────── */
  if (view === 'heal') {
    const majX = [180, 330, 480];
    majX.forEach((x, i) => node(x, ROWY, 'N' + (i + 1), 'green', { halo: i === 1, sub: i === 1 ? 'leader' : 'majority', icon: i === 1 ? 'wal' : 'server' }));
    const minX = [720, 880];
    minX.forEach((x, i) => node(x, ROWY, 'N' + (i + 4), 'rose', { sub: 'minority', ghost: true }));
    // the divergent tail on the minority, struck out
    logTile(800, ROWY + 118, 'divergent', 'rose', { ghost: true, rx: 44 });
    badges.push(pill(800, ROWY + 118, '', { cls: 'pill--sst' }));
    badges.push(region(118, 232, 450, 150, '', { r: 22 }));
    badges.push(pill(330, 214, 'MAJORITY · keeps its log', { icon: 'check', cls: 'pill--sst' }));
    badges.push(region(636, 232, 320, 150, '', { r: 22 }));
    badges.push(pill(800, 214, 'MINORITY · roll back', { icon: 'trash', cls: 'pill--sst' }));
    // adopt arrow
    const e = edge([V(540, ROWY - 20), V(636, 250), V(720, ROWY - 20)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(VW / 2, 446, 'adopt majority log · (AP → merge via anti-entropy)', { icon: 'merge', cls: 'pill--sst' }));
    cap(VW / 2, 486, 'uncommitted writes taken during the split are discarded on heal');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── COST: catch-up draws leader bandwidth while it serves live traffic ── */
  if (view === 'cost') {
    const lx = 300, rx = 760;
    node(lx, ROWY, 'leader', 'amber', { icon: 'wal', sub: 'bandwidth', rx: 50, halo: true });
    node(rx, ROWY, 'node', 'rose', { icon: 'server', sub: 'offline', rx: 50, ghost: true });
    // live traffic competing at the leader
    const e1 = edge([V(lx, 150), V(lx, ROWY - 54)], { arrow: true });
    guides.push(e1.guide); railIn = e1.d;
    badges.push(pill(lx, 128, 'live traffic', { icon: 'bolt', cls: 'pill--sst' }));
    // catch-up stream draining the leader
    const e2 = edge([V(lx + 52, ROWY - 6), V(VW / 2, 234), V(rx - 52, ROWY - 6)], { arrow: true });
    guides.push(e2.guide); railOut = e2.d;
    badges.push(pill(VW / 2, 206, 'snapshot + log stream', { icon: 'layers', cls: 'pill--sst' }));
    badges.push(pill(rx, ROWY + 120, 'unavailable until in-sync', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(region(140, 392, 760, 60, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="428" text-anchor="middle">BOUND HOW FAR A REPLICA MAY FALL BEHIND</text>`);
    cap(VW / 2, 486, 'recovery time is the cost — retain log for shipping, snapshot to cap rejoin');
    flows.push({ id: 'in', kind: 'read', speed: 130, size: 5 });
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: detect → catch up → reconcile → rejoin ─────────────────────── */
  const stageX = [170, 420, 650, 890];
  const stages = [
    { t: 'detect', s: 'stale log', ic: 'search', m: 'slate' },
    { t: 'catch up', s: 'ship / snapshot', ic: 'wal', m: 'amber' },
    { t: 'reconcile', s: 'drop divergence', ic: 'merge', m: 'lilac' },
    { t: 'rejoin', s: 'serve + vote', ic: 'check', m: 'green' },
  ];
  stages.forEach((st, i) => {
    node(stageX[i], ROWY, st.t, st.m, { icon: st.ic, sub: st.s, halo: i === 3 });
    if (i < stages.length - 1) {
      const e = edge([V(stageX[i] + 48, ROWY - 6), V(stageX[i + 1] - 48, ROWY - 6)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    }
  });
  badges.push(region(118, 196, 884, 150, 'one consistent history, restored', { r: 24 }));
  badges.push(pill(VW / 2, 440, 'WAL = replay · replication = stream · quorum = whose log is truth', { icon: 'layers', w: 560 }));
  flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
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
  <svg class="scene scene--distributed-recovery" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Distributed recovery">
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
