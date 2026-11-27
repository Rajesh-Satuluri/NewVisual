/* locking-scene.js — the "Locking & Deadlocks" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'race' (uncoordinated writers clobber a row), 'modes' (shared vs
   exclusive locks), 'twophase' (2PL growing/shrinking phases), 'deadlock' (a
   wait-for cycle), 'detect' (victim aborted to break the cycle), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a transaction actor cube */
function txn(cx, cy, label, sub, mat, opts = {}) {
  return isoCube(cx, cy, 58, 60, mat, {
    icon: opts.icon || 'merge', label, sub, iconSize: 22,
    halo: !!opts.halo, ghost: !!opts.ghost, pulse: !!opts.pulse,
  });
}

export function renderLockingScene(snap, opts = {}) {
  const view = snap.view || 'race';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  const push = (c, glow) => { shadows.push(c.shadow); if (glow && c.halo) halos.push(c.halo); solids.push(c.g); };

  /* ── RACE: two writers, one row, no coordination ──────────────────────── */
  if (view === 'race') {
    const t1 = txn(180, 150, 'Txn A', 'writes', 'blue', { halo: true });
    const t2 = txn(180, 400, 'Txn B', 'writes', 'green', { halo: true });
    push(t1, true); push(t2, true);

    const row = isoTile(700, 280, 74, 'rose', { halo: true });
    shadows.push(row.shadow); halos.push(row.halo); solids.push(row.g);
    badges.push(pill(700, 198, 'balance = 100', { icon: 'file', cls: 'pill--sst' }));

    [t1, t2].forEach((t, i) => {
      const e = edge([
        V(t.verts.E.x - 2, t.front[1]),
        V((t.verts.E.x + row.top[0]) / 2, (t.front[1] + row.top[1]) / 2),
        V(row.top[0] - 12, row.top[1] + 2),
      ], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d; else railOut = e.d;
    });
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 }, { id: 'out', kind: 'write', speed: 150, size: 6 });

    badges.push(region(560, 200, 300, 230, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="710" y="448" text-anchor="middle">BOTH READ 100 · BOTH WRITE 150 · ONE UPDATE LOST</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── MODES: shared readers coexist; an exclusive writer blocks all ─────── */
  if (view === 'modes') {
    const row = isoTile(548, 300, 86, 'rose', { halo: true });
    shadows.push(row.shadow); halos.push(row.halo); solids.push(row.g);
    badges.push(pill(548, 214, 'row R', { icon: 'file', cls: 'pill--sst' }));

    // three shared readers on the left — all granted
    const readers = [120, 300, 480].map((y, i) => {
      const c = txn(165, y, 'S' + (i + 1), 'read', 'blue');
      push(c);
      const e = edge([V(c.verts.E.x - 2, c.front[1]), V(380, c.front[1]), V(row.verts.W.x + 6, row.verts.W.y + 10)], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d;
      return c;
    });
    readers.forEach((c, i) => badges.push(pill(165, [120, 300, 480][i] + 86, 'S-lock ✓', { icon: 'check', w: 112 })));
    flows.push({ id: 'in', kind: 'read', speed: 180, size: 5 });

    // one exclusive writer on the right — blocked while readers hold S
    const w = txn(900, 300, 'X', 'write', 'amber', { icon: 'key' });
    push(w);
    const be = edge([V(w.verts.W.x + 2, w.front[1]), V(row.verts.E.x - 6, row.verts.E.y + 10)], { arrow: true, dashed: true });
    guides.push(be.guide);
    badges.push(pill(900, 386, 'X-lock BLOCKED', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="548" y="${A(row.base[1] + 20)}" text-anchor="middle">many readers OR one writer — never both</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── TWO-PHASE: a growing phase then a shrinking phase ─────────────────── */
  if (view === 'twophase') {
    // a "mountain" of lock count: up the acquire slope, down the release slope
    const base = 440, peakX = 548, peakY = 150;
    const up = [120, 270, 420].map((x, i) => {
      const c = isoCube(x, base - i * 100, 40, 44, 'green', { icon: 'key', label: '+' + (i + 1), iconSize: 16 });
      push(c); return c;
    });
    const peak = isoCube(peakX, peakY, 50, 52, 'rose', { icon: 'key', label: 'peak', sub: 'all held', iconSize: 18, halo: true });
    shadows.push(peak.shadow); halos.push(peak.halo); solids.push(peak.g);
    const down = [676, 826, 952].map((x, i) => {
      const c = isoCube(x, peakY + 100 + i * 100, 40, 44, 'blue', { icon: 'check', label: '−' + (i + 1), iconSize: 16 });
      push(c); return c;
    });
    const chain = [...up, peak, ...down];
    for (let i = 0; i < chain.length - 1; i++) {
      const a = chain[i], b = chain[i + 1];
      const e = edge([V(a.top[0], a.top[1]), V(b.top[0], b.top[1])], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d;
    }
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 5 });
    badges.push(pill(270, base + 60, 'GROWING · acquire only', { icon: 'key', cls: 'pill--sst' }));
    badges.push(pill(826, base + 60, 'SHRINKING · release only', { icon: 'check', cls: 'pill--sst' }));
    badges.push(region(70, 90, 420, 420, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="548" y="540" text-anchor="middle">NO LOCK RE-ACQUIRED AFTER THE FIRST RELEASE → SERIALIZABLE</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DEADLOCK: a wait-for cycle ────────────────────────────────────────── */
  if (view === 'deadlock') {
    const t1 = txn(230, 150, 'T1', 'holds A', 'blue', { halo: true });
    const t2 = txn(866, 450, 'T2', 'holds B', 'green', { halo: true });
    push(t1, true); push(t2, true);
    const rowA = isoTile(230, 450, 66, 'rose'); shadows.push(rowA.shadow); solids.push(rowA.g);
    const rowB = isoTile(866, 150, 66, 'amber'); shadows.push(rowB.shadow); solids.push(rowB.g);
    badges.push(pill(230, 372, 'row A', { icon: 'file', cls: 'pill--sst' }));
    badges.push(pill(866, 232, 'row B', { icon: 'file', cls: 'pill--sst' }));

    // T1 holds A (solid), wants B (dashed); T2 holds B (solid), wants A (dashed)
    const hA = edge([V(t1.verts.S.x, t1.base[1] - 10), V(rowA.top[0], rowA.top[1] - 2)], { arrow: true });
    const hB = edge([V(t2.verts.N.x, t2.verts.N.y), V(rowB.base[0], rowB.base[1] - 6)], { arrow: true });
    guides.push(hA.guide, hB.guide);
    const wB = edge([V(t1.verts.E.x - 2, t1.front[1]), V(548, 150), V(rowB.verts.W.x + 6, rowB.verts.W.y + 8)], { arrow: true, dashed: true });
    const wA = edge([V(t2.verts.W.x + 2, t2.front[1]), V(548, 450), V(rowA.verts.E.x - 6, rowA.verts.E.y + 8)], { arrow: true, dashed: true });
    guides.push(wB.guide, wA.guide);
    railIn = wB.d; railOut = wA.d;
    flows.push({ id: 'in', kind: 'write', speed: 120, size: 6 }, { id: 'out', kind: 'write', speed: 120, size: 6 });

    badges.push(pill(548, 150, 'T1 waits for B', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(pill(548, 450, 'T2 waits for A', { icon: 'clock', cls: 'pill--sst' }));
    badges.push(region(360, 250, 376, 100, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="548" y="306" text-anchor="middle">WAIT-FOR CYCLE · BOTH STUCK FOREVER</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── DETECT: abort a victim to break the cycle ─────────────────────────── */
  if (view === 'detect') {
    const t1 = txn(230, 150, 'T1', 'survives', 'green', { halo: true });
    const t2 = txn(866, 450, 'T2', 'VICTIM', 'rose', { icon: 'trash', ghost: true });
    push(t1, true); push(t2);
    const rowA = isoTile(230, 450, 66, 'rose'); shadows.push(rowA.shadow); solids.push(rowA.g);
    const rowB = isoTile(866, 150, 66, 'amber'); shadows.push(rowB.shadow); solids.push(rowB.g);
    badges.push(pill(230, 372, 'row A', { icon: 'file', cls: 'pill--sst' }));
    badges.push(pill(866, 232, 'row B', { icon: 'file', cls: 'pill--sst' }));

    // T1 now proceeds: acquires both locks; the victim edge is cut
    const hA = edge([V(t1.verts.S.x, t1.base[1] - 10), V(rowA.top[0], rowA.top[1] - 2)], { arrow: true });
    const wB = edge([V(t1.verts.E.x - 2, t1.front[1]), V(548, 150), V(rowB.verts.W.x + 6, rowB.verts.W.y + 8)], { arrow: true });
    guides.push(hA.guide, wB.guide);
    railIn = wB.d;
    flows.push({ id: 'in', kind: 'write', speed: 160, size: 6 });

    badges.push(pill(548, 320, 'wait-for graph: cycle found', { icon: 'search', cls: 'pill--sst' }));
    badges.push(pill(866, 536, 'T2 rolled back', { icon: 'trash', cls: 'pill--sst' }));
    badges.push(region(140, 100, 480, 420, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="548" y="100" text-anchor="middle">VICTIM ABORTED → CYCLE BROKEN → T1 COMMITS</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP ─────────────────────────────────────────────────────────────── */
  const hub = isoCube(548, 230, 104, 108, 'green', { icon: 'key', label: 'Lock manager', sub: 'isolation', halo: true, iconSize: 30 });
  shadows.push(hub.shadow); halos.push(hub.halo); solids.push(hub.g);
  const row = isoTile(548, 470, 82, 'lilac'); shadows.push(row.shadow); solids.push(row.g);
  const oe = edge([V(hub.base[0], hub.base[1] - 4), V(hub.base[0], (hub.base[1] + 450) / 2), V(row.top[0], row.top[1] - 2)], { arrow: true, dashed: true });
  guides.push(oe.guide); railOut = oe.d;
  flows.push({ id: 'out', kind: 'write', speed: 140, size: 6 });
  const tags = ['S/X modes', 'two-phase locking', 'cycle detection', 'abort a victim'];
  tags.forEach((t, i) => badges.push(pill(858, 130 + i * 52, t, { icon: 'check', w: 176 })));
  badges.push(pill(190, 210, 'serializable', { icon: 'check', w: 150 }));
  badges.push(pill(190, 262, 'latency ↑ when hot', { icon: 'clock', w: 176 }));
  badges.push(`<text class="sst-cap" x="548" y="${A(row.base[1] + 18)}" text-anchor="middle">correctness bought with waiting</text>`);

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
  <svg class="scene scene--locking" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Locking and deadlocks">
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
