/* schema-constraints-scene.js — the "Schema & Constraints" scene, in the same
   Designed-to-Scale isometric vocabulary as the other Foundations lessons: a
   central table CARD (a dashed region holding a header pill and stacked record
   tiles), a client on the left inserting rows along an animated rail, constraint
   pill-badges on the right, and a rejected ('rose') row bounced out with a label.

   Input: a view-snapshot { view, note, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'schema' (the typed contract), 'domain' (NOT NULL / type), 'pk'
   (primary key), 'fk' (foreign key), 'check' (CHECK / UNIQUE), 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

export function renderSchemaConstraintsScene(snap, opts = {}) {
  const view = snap.view || 'schema';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── the client on the left, trying to INSERT rows ────────────────────── */
  const client = isoCube(150, 236, 50, 60, 'blue', { icon: 'app', label: 'Client', sub: 'INSERT' });
  shadows.push(client.shadow); solids.push(client.g);

  /* ── the central users table card ─────────────────────────────────────── */
  function usersCard() {
    badges.push(region(310, 92, 320, 312, ''));
    badges.push(pill(470, 110, 'users', { icon: 'grid' }));
    const tones = ['green', 'slate', 'slate', 'slate'];
    for (let i = 3; i >= 0; i--) {
      const t = isoTile(470, 172 + i * 44, 104, tones[i], {});
      shadows.push(t.shadow); solids.push(t.g);
    }
  }
  usersCard();

  // client → card: the write rail
  {
    const e = edge([
      V(client.verts.E.x - 2, client.front[1]),
      V((client.verts.E.x + 310) / 2, client.front[1]),
      V(310 - 6, 248),
    ], { arrow: true });
    guides.push(e.guide); railIn = e.d;
  }

  /* ── constraint pill-badges on the right ──────────────────────────────── */
  function constraints(list) {
    list.forEach((c, i) => badges.push(pill(862, 150 + i * 50, c.t, { icon: c.ic, w: 182 })));
  }

  /* ── a rejected ('rose') row bounced out of the card ──────────────────── */
  function rejected(reason) {
    const bad = isoTile(246, 452, 58, 'rose', {});
    shadows.push(bad.shadow); solids.push(bad.g);
    const e = edge([
      V(316, 384),
      V(300, 420),
      V(bad.top[0] + 36, bad.top[1] - 2),
    ], { arrow: true, dashed: true });
    guides.push(e.guide);
    badges.push(`<text class="iso-region__t" x="246" y="${A(bad.base[1] + 26)}" text-anchor="middle">${esc(reason)}</text>`);
  }

  if (view === 'schema') {
    constraints([{ t: 'name : type', ic: 'grid' }]);
    badges.push(`<text class="sst-cap" x="470" y="432" text-anchor="middle">id INT  ·  name TEXT  ·  email TEXT</text>`);
  } else if (view === 'domain') {
    constraints([{ t: 'NOT NULL', ic: 'check' }, { t: 'TYPE match', ic: 'check' }]);
    rejected('null email → rejected');
  } else if (view === 'pk') {
    constraints([{ t: 'PRIMARY KEY id', ic: 'key' }]);
    rejected('duplicate id → rejected');
  } else if (view === 'fk') {
    // the FK pill sits high, clear of the orders card below-right
    badges.push(pill(862, 150, 'FOREIGN KEY', { icon: 'merge', w: 182 }));
    // a second, smaller orders table card
    badges.push(region(712, 320, 232, 180, ''));
    badges.push(pill(828, 336, 'orders', { icon: 'grid' }));
    const o0 = isoTile(828, 392, 76, 'lilac', {});
    const o1 = isoTile(828, 430, 76, 'lilac', {});
    [o1, o0].forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    // orders.user_id → users primary key
    const link = edge([
      V(752, 372),
      V(650, 320),
      V(574, 262),
    ], { arrow: true, dashed: true });
    guides.push(link.guide);
    badges.push(`<text class="sst-cap" x="828" y="${A(o0.base[1] + 22)}" text-anchor="middle">user_id → users.id</text>`);
    rejected('orphan order → rejected');
  } else if (view === 'check') {
    constraints([{ t: 'CHECK age ≥ 0', ic: 'check' }, { t: 'UNIQUE email', ic: 'check' }]);
    rejected('breaks rule → rejected');
  } else if (view === 'recap') {
    constraints([
      { t: 'NOT NULL', ic: 'check' },
      { t: 'PRIMARY KEY', ic: 'key' },
      { t: 'FOREIGN KEY', ic: 'merge' },
      { t: 'CHECK', ic: 'check' },
      { t: 'UNIQUE', ic: 'check' },
    ]);
    badges.push(`<text class="sst-cap" x="470" y="432" text-anchor="middle">the DB guards every write</text>`);
  }

  const flows = [{ id: 'in', kind: 'write', speed: 140, size: 6 }];
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
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Schema and constraints">
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
