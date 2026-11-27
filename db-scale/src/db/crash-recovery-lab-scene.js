/* crash-recovery-lab-scene.js — the "Crash Recovery Lab" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes/tiles with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'setup' (4 txns in flight, checkpoint, crash), 'wal' (the durable log
   + checkpoint survive), 'analysis' (forward scan → winners/losers), 'redo'
   (replay history onto pages), 'undo' (roll back losers + CLRs), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const VH = 600;

/* WAL strip geometry — a row of log records across the middle band */
const LOGY = 322;
const LOGX0 = 150;
const LOGDX = 96;
const logX = (i) => LOGX0 + i * LOGDX;

export function renderCrashRecoveryLabScene(snap, opts = {}) {
  const view = snap.view || 'setup';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // a boxy object; caller keeps the coords, never read back off the cube
  const box = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 40, o.h || 34, mat, {
      icon: o.icon || 'listOrdered', label, sub: o.sub || '', iconSize: o.iconSize || 15,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // a flat log record tile
  const rec = (i, label, mat, o = {}) => {
    const x = logX(i);
    const c = isoTile(x, LOGY, o.rx || 40, mat, { label, sub: o.sub || '', icon: o.icon || '', iconSize: 14, ghost: !!o.ghost, halo: !!o.halo });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return x;
  };

  // the 8-slot log record plan, reused across views
  // i:   0      1      2       3      4       5      6       7
  //      ckpt   T1w    T2w     T3w    T1 cmt  T4w    T3 cmt  (crash)
  const RECS = [
    { lsn: '#1100', label: 'CKPT', mat: 'amber', icon: 'target', sub: 'checkpoint' },
    { lsn: '#1120', label: 'T1 w', mat: 'slate', sub: 'A=5' },
    { lsn: '#1140', label: 'T2 w', mat: 'slate', sub: 'B=9' },
    { lsn: '#1160', label: 'T3 w', mat: 'slate', sub: 'C=2' },
    { lsn: '#1175', label: 'T1 ✓', mat: 'green', icon: 'check', sub: 'commit' },
    { lsn: '#1185', label: 'T4 w', mat: 'slate', sub: 'D=7' },
    { lsn: '#1200', label: 'T3 ✓', mat: 'green', icon: 'check', sub: 'commit' },
  ];

  const drawLog = (opts2 = {}) => {
    RECS.forEach((r, i) => {
      const dim = opts2.dim ? opts2.dim(i) : false;
      const hot = opts2.hot ? opts2.hot(i) : false;
      rec(i, r.lsn, r.mat, { sub: r.label, icon: r.icon || 'listOrdered', ghost: dim, halo: hot });
    });
    badges.push(pill(logX(0), LOGY - 78, 'last checkpoint', { icon: 'target', cls: 'pill--sst' }));
  };

  // the crash marker (jagged bolt) at the right end of the log
  const crashMark = (label) => {
    const cx = logX(7) - 6;
    const zig = [V(cx - 10, LOGY - 118), V(cx + 16, LOGY - 70), V(cx - 14, LOGY - 40), V(cx + 14, LOGY + 2), V(cx - 12, LOGY + 40), V(cx + 12, LOGY + 78)];
    const br = edge(zig, { dashed: true, r: 2 });
    guides.push(br.guide);
    badges.push(pill(cx + 10, LOGY - 128, label || 'CRASH', { icon: 'bolt', cls: 'pill--sst' }));
  };

  /* ── SETUP: 4 txns in flight, a checkpoint, then the crash ─────────────── */
  if (view === 'setup') {
    drawLog();
    crashMark('CRASH · power lost');
    // the buffer pool, about to vanish
    box(VW / 2, 118, 'buffer pool', 'rose', { icon: 'layers', rx: 58, h: 30, sub: 'volatile · lost', ghost: true });
    badges.push(pill(VW / 2, 70, 'memory wiped on crash', { icon: 'alert', cls: 'pill--sst' }));
    // winners / losers banner (not yet known to recovery, but shown to the reader)
    badges.push(region(120, 402, 800, 92, '', { r: 18 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="440" text-anchor="middle">T1 ✓ · T3 ✓ COMMITTED  —  T2 · T4 STILL OPEN</text>`);
    cap(VW / 2, 472, 'data files on disk are half-updated — some committed writes never flushed');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── WAL: the durable log + checkpoint survive; data files untrusted ───── */
  if (view === 'wal') {
    drawLog({ hot: (i) => i === 0 });
    crashMark('fsync boundary');
    // disk region under the log
    badges.push(region(118, LOGY - 46, logX(6) - 118 + 56, 92, '', { r: 16 }));
    badges.push(pill(logX(3), LOGY - 78, 'WAL · durable to last fsync', { icon: 'wal', cls: 'pill--sst' }));
    // untrusted data files, off to the right
    box(VW / 2, 118, 'data files', 'slate', { icon: 'database', rx: 56, h: 30, sub: 'partial · untrusted', ghost: true });
    badges.push(pill(VW / 2, 70, 'recovery rebuilds from the log', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 476, 'replay forward from the checkpoint — never from the beginning of time');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ANALYSIS: forward scan, winners vs losers ────────────────────────── */
  if (view === 'analysis') {
    drawLog({ hot: (i) => i === 4 || i === 6 });
    // forward scan arrow along the log
    const e = edge([V(logX(0), LOGY - 44), V(logX(3), LOGY - 52), V(logX(6) + 40, LOGY - 44)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(logX(2), LOGY - 80, 'scan forward →', { icon: 'search', cls: 'pill--sst' }));
    flows.push({ id: 'out', kind: 'read', speed: 150, size: 6 });
    // winners / losers tables
    badges.push(region(150, 404, 360, 96, '', { r: 16 }));
    badges.push(`<text class="iso-region__t" x="330" y="440" text-anchor="middle">WINNERS · committed</text>`);
    badges.push(pill(330, 470, 'T1 ✓   T3 ✓', { icon: 'check', cls: 'pill--sst' }));
    badges.push(region(540, 404, 360, 96, '', { r: 16 }));
    badges.push(`<text class="iso-region__t" x="720" y="440" text-anchor="middle">LOSERS · still open</text>`);
    badges.push(pill(720, 470, 'T2 ✗   T4 ✗', { icon: 'alert', cls: 'pill--sst' }));
    cap(VW / 2, 528, 'also rebuilds the dirty page table — where redo must begin');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── REDO: replay all changes onto the pages ──────────────────────────── */
  if (view === 'redo') {
    drawLog({ hot: (i) => i >= 1 });
    // three data pages above; redo arrows land on them
    const PX = [360, 560, 760];
    const pc = PX.map((x, i) => box(x, 150, 'page ' + (i + 1), 'blue', { icon: 'file', rx: 38, h: 26, sub: 'LSN gated' }));
    PX.forEach((x, i) => {
      const e = edge([V(logX(i + 1), LOGY - 40), V((logX(i + 1) + x) / 2, 230), V(x, 150 + 44)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railOut = e.d;
    });
    badges.push(pill(VW / 2, 92, 'replay every change — winners AND losers', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(region(150, 404, 760, 86, '', { r: 16 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="440" text-anchor="middle">REPEAT HISTORY → EXACT PRE-CRASH STATE</text>`);
    cap(VW / 2, 470, 'each page LSN skips changes already on disk — redo is idempotent');
    flows.push({ id: 'out', kind: 'write', speed: 140, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── UNDO: roll back losers, append CLRs ──────────────────────────────── */
  if (view === 'undo') {
    drawLog({ dim: (i) => i === 4 || i === 6, hot: (i) => i === 2 || i === 5 });
    // backward scan arrow
    const e = edge([V(logX(6) + 40, LOGY - 46), V(logX(3), LOGY - 54), V(logX(1), LOGY - 46)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(logX(4), LOGY - 82, '← walk losers backward', { icon: 'chevron', cls: 'pill--sst' }));
    // CLRs appended after the crash point
    rec(7, '#1205', 'lilac', { sub: 'CLR T4', icon: 'scroll' });
    rec(8, '#1206', 'lilac', { sub: 'CLR T2', icon: 'scroll' });
    badges.push(pill(logX(7.5), LOGY + 74, 'CLR · crash-safe undo', { icon: 'scroll', cls: 'pill--sst' }));
    badges.push(region(150, 404, 760, 86, '', { r: 16 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="440" text-anchor="middle">REVERSE T2 &amp; T4 — NO UNCOMMITTED WORK REMAINS</text>`);
    cap(VW / 2, 470, 'a CLR records each reversal, so a crash during recovery resumes cleanly');
    flows.push({ id: 'out', kind: 'write', speed: 140, size: 5 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: winners kept, losers erased ───────────────────────────────── */
  const WX = [300, 500];
  WX.forEach((x, i) => box(x, 230, 'T' + (i === 0 ? '1' : '3') + ' ✓', 'green', { icon: 'check', halo: true, sub: 'durable' }));
  const LX = [640, 840];
  LX.forEach((x, i) => box(x, 230, 'T' + (i === 0 ? '2' : '4') + ' ✗', 'rose', { icon: 'trash', ghost: true, sub: 'erased' }));
  badges.push(region(140, 150, 760, 80, 'ACID restored after a hard crash', { r: 20 }));
  const tags = ['Analysis → winners / losers', 'Redo → repeat history', 'Undo → roll back losers (CLRs)'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 360 + i * 44, t, { icon: 'check', w: 320 })));
  cap(VW / 2, 516, 'recovery time is bounded by how recent the last checkpoint was');
  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--crash-recovery-lab" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Crash recovery lab: ARIES analysis, redo, undo">
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
