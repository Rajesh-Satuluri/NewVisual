/* follow-the-transaction-scene.js — the "Follow the Transaction" lab scene, in
   the shared Designed-to-Scale isometric vocabulary: rounded iso cubes with icon
   glyphs and labels, soft ground shadows, halos, pill badges, dashed logical
   regions, routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'intro' (transfer + two rows + reader), 'snapshot' (txn & reader pin
   snapshots), 'writes' (new uncommitted versions + locks), 'isolation' (reader
   still on old versions), 'commit' (WAL commit record, versions flip visible),
   'recap' (A·C·I·D traced to the mechanics). */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* fixed layout anchors (kept in our own vars — never read back off a cube) */
const TXNX = 190, TXNY = 250;        // the transaction actor (left)
const RDRX = 190, RDRY = 430;        // the concurrent reader (lower left)
const ROWAX = 560, ROWAY = 196;      // row A band
const ROWBX = 560, ROWBY = 384;      // row B band
const WALX = 900, WALY = 250;        // WAL / durability (right)
const VER_DX = 150;                  // spacing between version tiles

export function renderFollowTheTransactionScene(snap, opts = {}) {
  const view = snap.view || 'intro';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  const flows = [];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);
  const cap = (x, y, t) => `<text class="sst-cap" x="${A(x)}" y="${A(y)}" text-anchor="middle">${esc(t)}</text>`;

  // draw an actor/store cube; caller keeps the coords, we never read them back
  const cube = (x, y, label, mat, o = {}) => {
    const c = isoCube(x, y, o.rx || 46, o.h || 42, mat, {
      icon: o.icon || 'server', label, sub: o.sub || '', iconSize: o.iconSize || 18,
      halo: !!o.halo, ghost: !!o.ghost,
    });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  // a flat version tile (a row version), ghosted when superseded/invisible
  const ver = (x, y, mat, o = {}) => {
    const c = isoTile(x, y, o.rx || 40, mat, { ghost: !!o.ghost, halo: !!o.halo });
    shadows.push(c.shadow); if (o.halo) halos.push(c.halo); solids.push(c.g);
    return c;
  };

  /* ── common: the transaction actor and the concurrent reader ───────────── */
  const drawActors = (txnActive, readerSees) => {
    cube(TXNX, TXNY, 'txn 42', txnActive ? 'amber' : 'slate',
      { icon: 'app', sub: txnActive ? 'BEGIN' : 'done', halo: txnActive });
    cube(RDRX, RDRY, 'reader', 'blue', { icon: 'search', sub: readerSees });
  };

  /* ── INTRO: the transfer statement, two rows, a reader ─────────────────── */
  if (view === 'intro') {
    drawActors(true, 'SUM A+B');
    // row A and row B, single committed version each
    ver(ROWAX, ROWAY, 'green'); badges.push(pill(ROWAX, ROWAY - 2, 'A = 500', { icon: 'database', cls: 'pill--sst' }));
    ver(ROWBX, ROWBY, 'green'); badges.push(pill(ROWBX, ROWBY - 2, 'B = 300', { icon: 'database', cls: 'pill--sst' }));
    // the SQL program up top
    badges.push(region(300, 92, 440, 56, '', { r: 16 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="116" text-anchor="middle">BEGIN · UPDATE A −=100 · UPDATE B +=100 · COMMIT</text>`);
    // txn intends to touch both rows
    let e = edge([V(TXNX + 40, TXNY - 20), V(380, 150), V(ROWAX - 48, ROWAY)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    e = edge([V(TXNX + 40, TXNY + 10), V(380, 330), V(ROWBX - 48, ROWBY)], { arrow: true });
    guides.push(e.guide);
    // reader sums both
    e = edge([V(RDRX + 40, RDRY - 6), V(430, 440), V(ROWBX - 48, ROWBY + 20)], { arrow: true, dashed: true });
    guides.push(e.guide);
    badges.push(pill(ROWBX + 120, ROWBY + 60, 'reader total = 800', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 540, 'both rows must move together — and no reader may catch them mid-move');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── SNAPSHOT: BEGIN pins snapshots for txn and reader ─────────────────── */
  if (view === 'snapshot') {
    drawActors(true, 'snapshot');
    ver(ROWAX, ROWAY, 'green'); badges.push(pill(ROWAX, ROWAY - 2, 'A = 500', { icon: 'database', cls: 'pill--sst' }));
    ver(ROWBX, ROWBY, 'green'); badges.push(pill(ROWBX, ROWBY - 2, 'B = 300', { icon: 'database', cls: 'pill--sst' }));
    badges.push(region(300, 150, 520, 300, '', { r: 24 }));
    badges.push(`<text class="iso-region__t" x="${VW / 2}" y="176" text-anchor="middle">SNAPSHOT · newest versions committed before BEGIN</text>`);
    badges.push(pill(TXNX, TXNY - 78, 'txn 42 opened', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(RDRX, RDRY + 74, 'reader snapshot', { icon: 'check', cls: 'pill--sst' }));
    // both actors point at the same committed versions
    let e = edge([V(TXNX + 40, TXNY), V(380, 196), V(ROWAX - 46, ROWAY)], { arrow: true, dashed: true });
    guides.push(e.guide);
    e = edge([V(RDRX + 40, RDRY), V(380, 384), V(ROWBX - 46, ROWBY)], { arrow: true, dashed: true });
    guides.push(e.guide);
    cap(VW / 2, 540, 'each transaction freezes a stable view — committed values only');
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── WRITES: new uncommitted versions + locks ──────────────────────────── */
  if (view === 'writes') {
    drawActors(true, 'waits');
    // row A: old (ghosted-ish, still live) + new uncommitted
    ver(ROWAX, ROWAY, 'green'); badges.push(pill(ROWAX, ROWAY - 2, 'A = 500', { cls: 'pill--sst' }));
    ver(ROWAX + VER_DX, ROWAY, 'amber', { halo: true }); badges.push(pill(ROWAX + VER_DX, ROWAY - 2, 'A = 400 ✎', { icon: 'key', cls: 'pill--sst' }));
    // row B: old + new uncommitted
    ver(ROWBX, ROWBY, 'green'); badges.push(pill(ROWBX, ROWBY - 2, 'B = 300', { cls: 'pill--sst' }));
    ver(ROWBX + VER_DX, ROWBY, 'amber', { halo: true }); badges.push(pill(ROWBX + VER_DX, ROWBY - 2, 'B = 400 ✎', { icon: 'key', cls: 'pill--sst' }));
    // write arrows from txn to the NEW versions
    let e = edge([V(TXNX + 40, TXNY - 20), V(420, 150), V(ROWAX + VER_DX - 46, ROWAY - 20)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    e = edge([V(TXNX + 40, TXNY + 10), V(420, 330), V(ROWBX + VER_DX - 46, ROWBY - 20)], { arrow: true });
    guides.push(e.guide);
    badges.push(pill(ROWAX + VER_DX, ROWAY + 54, 'locked', { icon: 'key', cls: 'pill--sst' }));
    badges.push(pill(ROWBX + VER_DX, ROWBY + 54, 'locked', { icon: 'key', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, 512, 'new versions tagged txn 42 · uncommitted', { icon: 'alert' }));
    cap(VW / 2, 548, 'writers block writers via row locks — but readers are never blocked');
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── ISOLATION: reader still follows the OLD versions ──────────────────── */
  if (view === 'isolation') {
    drawActors(true, 'A=500 B=300');
    ver(ROWAX, ROWAY, 'green', { halo: true }); badges.push(pill(ROWAX, ROWAY - 2, 'A = 500', { icon: 'check', cls: 'pill--sst' }));
    ver(ROWAX + VER_DX, ROWAY, 'amber', { ghost: true }); badges.push(pill(ROWAX + VER_DX, ROWAY - 2, 'A = 400 ⨯', { cls: 'pill--sst' }));
    ver(ROWBX, ROWBY, 'green', { halo: true }); badges.push(pill(ROWBX, ROWBY - 2, 'B = 300', { icon: 'check', cls: 'pill--sst' }));
    ver(ROWBX + VER_DX, ROWBY, 'amber', { ghost: true }); badges.push(pill(ROWBX + VER_DX, ROWBY - 2, 'B = 400 ⨯', { cls: 'pill--sst' }));
    // reader arrows to the OLD versions only
    let e = edge([V(RDRX + 40, RDRY - 10), V(430, 230), V(ROWAX - 46, ROWAY + 18)], { arrow: true, dashed: true });
    guides.push(e.guide); railIn = e.d;
    e = edge([V(RDRX + 40, RDRY + 6), V(430, 384), V(ROWBX - 46, ROWBY)], { arrow: true, dashed: true });
    guides.push(e.guide);
    badges.push(region(ROWAX + VER_DX - 70, 150, 220, 300, '', { r: 22 }));
    badges.push(`<text class="iso-region__t" x="${ROWAX + VER_DX + 40}" y="176" text-anchor="middle">INVISIBLE TO READER</text>`);
    badges.push(pill(RDRX + 130, RDRY + 70, 'total still = 800', { icon: 'check', cls: 'pill--sst' }));
    cap(VW / 2, 548, 'the reader’s snapshot predates the commit — no dirty read is possible');
    flows.push({ id: 'in', kind: 'read', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── COMMIT: WAL commit record, versions flip visible, locks drop ──────── */
  if (view === 'commit') {
    drawActors(false, 'A=400 B=400');
    ver(ROWAX, ROWAY, 'green', { ghost: true }); badges.push(pill(ROWAX, ROWAY - 2, 'A = 500', { cls: 'pill--sst' }));
    ver(ROWAX + VER_DX, ROWAY, 'green', { halo: true }); badges.push(pill(ROWAX + VER_DX, ROWAY - 2, 'A = 400 ✓', { icon: 'check', cls: 'pill--sst' }));
    ver(ROWBX, ROWBY, 'green', { ghost: true }); badges.push(pill(ROWBX, ROWBY - 2, 'B = 300', { cls: 'pill--sst' }));
    ver(ROWBX + VER_DX, ROWBY, 'green', { halo: true }); badges.push(pill(ROWBX + VER_DX, ROWBY - 2, 'B = 400 ✓', { icon: 'check', cls: 'pill--sst' }));
    // the WAL on the right, receiving a commit record
    cube(WALX, WALY, 'WAL', 'amber', { icon: 'wal', sub: 'fsync', halo: true });
    let e = edge([V(TXNX + 40, TXNY), V(VW / 2, 120), V(WALX - 48, WALY - 10)], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    badges.push(pill(WALX, WALY - 78, 'commit record', { icon: 'check', cls: 'pill--sst' }));
    badges.push(pill(VW / 2, 508, 'commit point · atomic & durable', { icon: 'check' }));
    badges.push(pill(ROWAX + VER_DX, ROWAY + 54, 'unlocked', { cls: 'pill--sst' }));
    badges.push(pill(ROWBX + VER_DX, ROWBY + 54, 'unlocked', { cls: 'pill--sst' }));
    cap(VW / 2, 548, 'one durable WAL write flips both new versions visible — together');
    flows.push({ id: 'out', kind: 'flush', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── RECAP: A·C·I·D traced to the mechanics ────────────────────────────── */
  cube(TXNX, TXNY + 90, 'txn 42', 'slate', { icon: 'app', sub: 'committed' });
  const letters = [
    { x: 420, t: 'A', sub: 'commit point flips all', mat: 'amber', ic: 'check' },
    { x: 580, t: 'C', sub: 'invariants hold', mat: 'green', ic: 'scale' },
    { x: 740, t: 'I', sub: 'snapshots & versions', mat: 'blue', ic: 'layers' },
    { x: 900, t: 'D', sub: 'WAL survives crash', mat: 'lilac', ic: 'wal' },
  ];
  letters.forEach(L => cube(L.x, 250, L.t, L.mat, { icon: L.ic, sub: L.sub, rx: 50, h: 46 }));
  badges.push(region(360, 158, 600, 184, 'ACID = four consequences of one design', { r: 24 }));
  badges.push(pill(VW / 2, 470, 'versions + row locks + a WAL commit point', { icon: 'check', w: 360 }));
  badges.push(pill(VW / 2, 512, 'ABORT? the new versions are simply never shown', { icon: 'check', w: 360 }));
  cap(VW / 2, 552, 'a transaction is versions waiting on one durable flip');
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
  <svg class="scene scene--follow-txn" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Follow the transaction">
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
