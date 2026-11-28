/* stream-processing-scene.js — the "Stream Processing" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'stale' (batch lags behind live events), 'stream' (log feeds a live
   processor), 'operators' (filter→aggregate→join chain with state),
   'windowing' (tumbling event-time windows → aggregates), 'latetime' (late
   event vs watermark), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;
const ROWY = 286;

export function renderStreamProcessingScene(snap, opts = {}) {
  const view = snap.view || 'stream';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw a cube; caller keeps the coords, we never read them back off the cube
  const node = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'server', label, sub: o.sub || '', iconSize: o.iconSize || 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  const tile = (x, y, rx, mat, o = {}) => {
    const c = isoTile(x, y, rx, mat, { h: o.h, ghost: o.ghost, halo: o.halo });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };
  // a small event marker on the ground plane (plain circle, inline fill)
  const dot = (x, y, fill, r = 6) => `<circle cx="${A(x)}" cy="${A(y)}" r="${r}" fill="${fill}" stroke="#26211b" stroke-width="1.3"/>`;

  /* ── STALE: batch job sleeps while events pile up ──────────────────────── */
  if (view === 'stale') {
    const sx = 170, mx = 530, ox = 880;
    node(sx, ROWY, 'events', 'amber', { icon: 'listOrdered', sub: 'arriving' });
    node(mx, ROWY, 'batch job', 'slate', { icon: 'clock', sub: 'runs hourly', rx: 54 });
    node(ox, ROWY, 'report', 'blue', { icon: 'file', sub: 'an hour old' });
    // a growing backlog stack behind the source
    for (let i = 0; i < 4; i++) tile(sx - 96 - i * 6, ROWY - 2 - i * 14, 30, 'rose', { h: 10, ghost: i > 1 });
    const e1 = edge([V(sx + 54, ROWY - 8), V((sx + mx) / 2, ROWY - 40), V(mx - 60, ROWY - 8)], { arrow: true });
    const e2 = edge([V(mx + 60, ROWY - 8), V((mx + ox) / 2, ROWY - 40), V(ox - 50, ROWY - 8)], { arrow: true });
    guides.push(e1.guide, e2.guide);
    badges.push(pill(sx - 108, ROWY - 108, 'backlog grows', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(pill(mx, 150, 'window = 1 hour · sleeps between runs', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(region(150, 420, 740, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="458" text-anchor="middle">RESULT IS ALWAYS A FULL WINDOW BEHIND REALITY</text>`);
    cap(VW / 2, 540, 'the answer is correct — and already out of date');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── STREAM: durable log feeds a live processor ────────────────────────── */
  if (view === 'stream') {
    const sx = 150, px = 650, ox = 930;
    node(sx, ROWY, 'source', 'blue', { icon: 'app', sub: 'emits events' });
    // the log: a rail of event tiles between source and processor
    const logXs = [280, 352, 424, 496, 568];
    logXs.forEach((x, i) => tile(x, ROWY + 2, 30, i === 4 ? 'green' : 'amber', { h: 12 }));
    node(px, ROWY, 'processor', 'green', { icon: 'bolt', sub: 'per event', rx: 50 });
    node(ox, ROWY, 'live out', 'green', { icon: 'gauge', sub: 'always fresh', halo: true });
    const eIn = edge([V(sx + 50, ROWY - 2), V(248, ROWY + 2)], { arrow: true });
    const eProc = edge([V(600, ROWY + 2), V(px - 56, ROWY - 2)], { arrow: true });
    const eOut = edge([V(px + 56, ROWY - 4), V(ox - 50, ROWY - 4)], { arrow: true });
    guides.push(eIn.guide, eProc.guide, eOut.guide);
    railIn = eProc.d; railOut = eOut.d;
    badges.push(pill(424, ROWY - 86, 'log: durable · replayable · partitioned', { icon: 'listOrdered', cls: 'pill--sst' }));
    badges.push(pill(424, ROWY + 92, 'ordered within each partition', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 512, 'read the log event-by-event — latency falls from an hour to milliseconds');
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 6 });
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── OPERATORS: filter → aggregate → join chain, stateful ──────────────── */
  if (view === 'operators') {
    const sx = 130, ox = 930;
    node(sx, ROWY, 'log', 'amber', { icon: 'listOrdered', sub: 'events' });
    const ops = [
      { x: 350, label: 'filter', icon: 'search', sub: 'drop noise', mat: 'blue', state: false },
      { x: 560, label: 'aggregate', icon: 'merge', sub: 'count / sum', mat: 'green', state: true },
      { x: 770, label: 'join', icon: 'merge', sub: 'enrich', mat: 'lilac', state: true },
    ];
    let prevRight = sx + 46;
    ops.forEach((op) => {
      node(op.x, ROWY, op.label, op.mat, { icon: op.icon, sub: op.sub });
      if (op.state) {
        tile(op.x, ROWY + 74, 32, 'slate', { h: 12 });
        badges.push(pill(op.x, ROWY + 104, 'state', { icon: 'database', cls: 'pill--sst' }));
      }
      const e = edge([V(prevRight, ROWY - 4), V(op.x - 46, ROWY - 4)], { arrow: true });
      guides.push(e.guide);
      prevRight = op.x + 46;
    });
    node(ox, ROWY, 'out', 'green', { icon: 'gauge', sub: 'stream', halo: true });
    const eOut = edge([V(prevRight, ROWY - 4), V(ox - 46, ROWY - 4)], { arrow: true });
    guides.push(eOut.guide); railOut = eOut.d;
    badges.push(pill(VW / 2, 148, 'operators chain like pipes · stateful ones checkpoint', { icon: 'sliders', cls: 'pill--sst' }));
    cap(VW / 2, 470, 'checkpointed state → a crash replays from an offset without double-counting');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── WINDOWING: tumbling event-time windows → aggregates (centerpiece) ─── */
  if (view === 'windowing') {
    const axisY = 200, x0 = 120, x1 = 920;
    // the time axis
    guides.push(`<line x1="${x0}" y1="${axisY}" x2="${x1}" y2="${axisY}" stroke="#8a8178" stroke-width="2"/>`);
    // ticks + labels at 0..20s
    const ticks = 4, span = (x1 - x0) / ticks;
    for (let i = 0; i <= ticks; i++) {
      const tx = x0 + i * span;
      guides.push(`<line x1="${A(tx)}" y1="${axisY - 6}" x2="${A(tx)}" y2="${axisY + 6}" stroke="#8a8178" stroke-width="2"/>`);
      badges.push(`<text class="sst-cap" x="${A(tx)}" y="${axisY - 14}" text-anchor="middle">${i * 5}s</text>`);
    }
    // three tumbling windows over segments [0-5],[5-10],[10-15]
    const winColors = ['blue', 'green', 'lilac'];
    const fills = { blue: '#a1bbd9', green: '#a5ca92', lilac: '#c5b6e3' };
    for (let w = 0; w < 3; w++) {
      const wx0 = x0 + w * span, ww = span;
      badges.push(region(wx0 + 6, axisY + 16, ww - 12, 70, '', { r: 14 }));
      badges.push(pill(wx0 + ww / 2, axisY + 34, 'window ' + (w + 1), { icon: 'grid', cls: 'pill--sst' }));
      // scatter a few event dots inside this window, just above the axis
      const n = 3 + (w % 2);
      for (let k = 0; k < n; k++) {
        const ex = wx0 + 18 + k * ((ww - 36) / Math.max(1, n - 1));
        overlays.push(dot(ex, axisY - 4 - (k % 2) * 10, fills[winColors[w]]));
      }
      // aggregate cube below the window
      const ax = wx0 + ww / 2;
      node(ax, 410, 'agg ' + (w + 1), winColors[w], { icon: 'merge', sub: 'count', rx: 42, h: 36 });
      const e = edge([V(ax, axisY + 92), V(ax, 410 - 30)], { arrow: true });
      guides.push(e.guide);
    }
    badges.push(pill(VW / 2, 150, 'tumbling windows · fixed, non-overlapping', { icon: 'clock', cls: 'pill--sst' }));
    cap(VW / 2, 516, 'each completed window emits exactly one aggregate — a steady drip of bounded results');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── LATETIME: event time vs processing time + watermark ───────────────── */
  if (view === 'latetime') {
    const axisY = 220, x0 = 120, x1 = 920;
    guides.push(`<line x1="${x0}" y1="${axisY}" x2="${x1}" y2="${axisY}" stroke="#8a8178" stroke-width="2"/>`);
    badges.push(`<text class="sst-cap" x="${x0 - 2}" y="${axisY - 16}" text-anchor="start">processing time →</text>`);
    // in-order events (green) arriving along processing time
    const ev = [
      { x: 210, t: 't=1' }, { x: 330, t: 't=2' }, { x: 470, t: 't=4' }, { x: 600, t: 't=5' },
    ];
    ev.forEach(e => {
      overlays.push(dot(e.x, axisY - 10, '#a5ca92'));
      badges.push(`<text class="sst-cap" x="${A(e.x)}" y="${axisY - 24}" text-anchor="middle">${e.t}</text>`);
    });
    // the watermark line: "no earlier event than t=5 should remain"
    const wmX = 690;
    guides.push(`<line x1="${wmX}" y1="${axisY - 70}" x2="${wmX}" y2="${axisY + 40}" stroke="#c98a3e" stroke-width="2.4" stroke-dasharray="6 5"/>`);
    badges.push(pill(wmX, axisY - 86, 'watermark · window closed', { icon: 'clock', cls: 'pill--sst' }));
    // the late event (rose), event-time t=3, arrives AFTER the watermark
    overlays.push(dot(800, axisY - 10, '#de9f97', 8));
    badges.push(pill(800, axisY - 42, 'late! event-time t=3', { icon: 'alert', cls: 'pill--sst' }));
    const eLate = edge([V(800, axisY - 2), V(760, axisY + 60), V(520, axisY + 60), V(470, axisY + 10)], { dashed: true, arrow: true });
    guides.push(eLate.guide);
    badges.push(region(150, 430, 740, 92, '', { r: 20 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="468" text-anchor="middle">WAIT LONGER → MORE LATENCY · CLOSE SOONER → DROP LATE DATA</text>`);
    cap(VW / 2, 548, 'event time ≠ processing time — the watermark is a bet that no earlier event remains');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP ─────────────────────────────────────────────────────────────── */
  node(170, ROWY, 'log', 'amber', { icon: 'listOrdered', sub: 'events in' });
  node(520, ROWY, 'operators', 'green', { icon: 'sliders', sub: 'windowed · stateful', rx: 56, halo: true });
  node(880, ROWY, 'fresh', 'green', { icon: 'gauge', sub: 'results out' });
  const r1 = edge([V(216, ROWY - 4), V(520 - 56, ROWY - 4)], { arrow: true });
  const r2 = edge([V(520 + 56, ROWY - 4), V(834, ROWY - 4)], { arrow: true });
  guides.push(r1.guide, r2.guide); railOut = r2.d;
  badges.push(region(118, 408, 884, 150, 'windowing · event-time correctness · exactly-once', { r: 24 }));
  const tags = ['durable replayable log', 'stateful windowed operators', 'stream = endless batch'];
  tags.forEach((t, i) => badges.push(pill(VW / 2, 436 + i * 40, t, { icon: 'check', w: 320 })));
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
  <svg class="scene scene--stream-processing" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Stream processing">
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
