/* transactions-scene.js — the "ACID Transactions" scene, in the shared
   Designed-to-Scale isometric vocabulary: rounded iso cubes with icon glyphs
   and labels, soft ground shadows, halos, pill badges, dashed logical regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'partial' (a crash mid-transfer destroys money), 'txn' (wrap the two
   writes in BEGIN…COMMIT), 'acid' (the four guarantees), 'commit' (one durable
   flush), 'rollback' (undo the whole unit), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderTransactionsScene(snap, opts = {}) {
  const view = snap.view || 'txn';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── ACID: four pillars, no accounts ──────────────────────────────────── */
  if (view === 'acid') {
    badges.push(region(150, 118, 740, 300, '', { r: 22 }));
    badges.push(pill(520, 100, 'ACID — the four guarantees', { icon: 'check', w: 300 }));
    const pillars = [
      { cx: 262, mat: 'blue',  icon: 'merge',    label: 'Atomicity',   sub: 'all or nothing' },
      { cx: 440, mat: 'green', icon: 'check',    label: 'Consistency', sub: 'rules always hold' },
      { cx: 618, mat: 'amber', icon: 'layers',   label: 'Isolation',   sub: 'as if alone' },
      { cx: 796, mat: 'lilac', icon: 'database', label: 'Durability',  sub: 'survives a crash' },
    ];
    pillars.forEach(p => {
      const c = isoCube(p.cx, 206, 66, 92, p.mat, { icon: p.icon, label: p.label, sub: p.sub, iconSize: 24 });
      shadows.push(c.shadow); solids.push(c.g);
    });
    badges.push(`<text class="sst-cap" x="520" y="${A(438)}" text-anchor="middle">every committed transaction keeps all four promises</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn: null, railOut: null, flows: [], note: snap.note });
  }

  /* ── all other views draw the two accounts A and B ────────────────────── */
  const AX = 300, BX = 780, ACY = 210, BCY = 210, ARX = 78, AH = 92;

  const debited = view === 'partial';
  const accA = isoCube(AX, ACY, ARX, AH, debited ? 'rose' : 'blue', {
    icon: 'server', label: 'Account A', sub: debited ? '−$100' : '$500', iconSize: 24,
  });
  const accB = isoCube(BX, BCY, ARX, AH, 'green', {
    icon: 'server', label: 'Account B', sub: view === 'partial' ? '$200 (unchanged)' : '$300', iconSize: 24,
  });
  shadows.push(accA.shadow); solids.push(accA.g);
  shadows.push(accB.shadow); solids.push(accB.g);

  const flows = [];

  if (view === 'partial') {
    // debit A, then a crash breaks the link before B is credited
    const e = edge([
      V(accA.verts.E.x - 2, accA.front[1]),
      V((AX + BX) / 2 - 40, accA.front[1] - 18),
    ], { arrow: true });
    guides.push(e.guide); railOut = e.d;
    // broken second half — dashed, no arrow, with a fault burst
    const brk = edge([
      V((AX + BX) / 2 + 40, accB.front[1] - 18),
      V(accB.verts.W.x + 2, accB.front[1]),
    ], { dashed: true });
    guides.push(brk.guide);
    badges.push(pill((AX + BX) / 2, accA.front[1] - 60, 'CRASH mid-transfer', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="${(AX + BX) / 2}" y="${A(96)}" text-anchor="middle">⚡ $100 DEBITED · NEVER CREDITED</text>`);
    badges.push(`<text class="sst-cap" x="${(AX + BX) / 2}" y="${A(360)}" text-anchor="middle">money vanished — the halves must be one unit</text>`);
    flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  // txn / commit / rollback: both accounts enclosed in a transaction region
  badges.push(region(AX - 140, 128, (BX - AX) + 280, 232, '', { r: 24 }));
  const begin = view === 'rollback' ? 'BEGIN … ROLLBACK' : 'BEGIN … COMMIT';
  badges.push(pill((AX + BX) / 2, 112, begin, { icon: 'merge', w: 280 }));

  // the transfer connector between the two accounts (inside the unit)
  const link = edge([
    V(accA.verts.E.x - 2, accA.front[1]),
    V((AX + BX) / 2, accA.front[1] - 20),
    V(accB.verts.W.x + 2, accB.front[1]),
  ], { arrow: true });
  guides.push(link.guide); railOut = link.d;
  flows.push({ id: 'out', kind: 'write', speed: 150, size: 6 });

  if (view === 'txn') {
    badges.push(pill((AX + BX) / 2, accA.front[1] + 60, 'two writes · one unit', { icon: 'check', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="${(AX + BX) / 2}" y="${A(348)}" text-anchor="middle">they succeed together or not at all</text>`);
  }

  else if (view === 'commit') {
    // one store beneath, both writes flow down together at COMMIT
    const store = isoTile((AX + BX) / 2, 452, 96, 'lilac', { halo: true });
    shadows.push(store.shadow); halos.push(store.halo); solids.push(store.g);
    const down = edge([
      V((AX + BX) / 2, accA.front[1] + 40),
      V((AX + BX) / 2, 420),
      V(store.top[0], store.top[1] - 2),
    ], { arrow: true });
    guides.push(down.guide); railIn = down.d;
    badges.push(pill((AX + BX) / 2, accA.front[1] + 66, 'COMMIT · durable at once', { icon: 'database', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="${(AX + BX) / 2}" y="${A(store.base[1] + 16)}" text-anchor="middle">every change persisted together</text>`);
    flows.push({ id: 'in', kind: 'write', speed: 150, size: 6 });
  }

  else if (view === 'rollback') {
    badges.push(pill((AX + BX) / 2, accA.front[1] + 60, 'a write failed → ROLLBACK', { icon: 'alert', cls: 'pill--sst' }));
    badges.push(`<text class="iso-region__t" x="${(AX + BX) / 2}" y="${A(352)}" text-anchor="middle">WHOLE UNIT UNDONE — AS IF IT NEVER RAN</text>`);
    // the cost reminder
    badges.push(pill((AX + BX) / 2, 404, 'cost: locks + undo log vs raw speed', { icon: 'clock', w: 330 }));
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
  <svg class="scene scene--transactions" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="ACID transactions">
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
