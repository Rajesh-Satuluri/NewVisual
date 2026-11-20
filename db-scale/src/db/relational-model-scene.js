/* relational-model-scene.js — the "Relational Model" scene, in the same
   Designed-to-Scale isometric vocabulary as the DBMS / LSM lessons: a relation
   is drawn as a dashed card (a logical region) with a name pill on top and its
   rows as thin stacked iso tiles. Keys are coloured tiles, foreign keys are
   routed dashed connectors between two cards.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'table', 'tuple', 'key', 'fk', 'set', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* a relation drawn as a dashed card: name pill on top, rows as stacked tiles.
   returns { cx, rows:[{cx,cy,top,base,verts}], region, pill, shadows, solids } */
function tableCard(x, y, w, h, name, rowCount, opts = {}) {
  const cx = x + w / 2;
  const shadows = [], solids = [], badges = [];
  badges.push(region(x, y, w, h, '', { r: 18 }));
  badges.push(pill(cx, y - 4, name, { icon: opts.nameIcon || 'grid', cls: 'pill--sst' }));

  const rx = opts.rx || 100;
  const gap = opts.gap || 40;
  const top0 = y + 56;
  const tones = opts.rowTones || [];
  const ghost = opts.ghostRows || [];
  const rows = [];
  for (let i = 0; i < rowCount; i++) {
    const cyi = top0 + i * gap;
    const t = isoTile(cx, cyi, rx, tones[i] || 'slate', { h: 14, ghost: ghost.includes(i) });
    shadows.push(t.shadow); solids.push(t.g);
    rows.push({ cx, cy: cyi, top: t.top, base: t.base, verts: t.verts });
  }
  return { cx, x, y, w, h, rows, shadows, solids, badges };
}

export function renderRelationalModelScene(snap, opts = {}) {
  const view = snap.view || 'table';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── client on the left: it speaks SQL to the relation ─────────────────── */
  const client = isoCube(150, 150, 50, 62, 'blue', { icon: 'app', label: 'Client', sub: 'SQL', iconSize: 24 });
  shadows.push(client.shadow); solids.push(client.g);

  const feed = (targetX, targetY) => {
    const e = edge([
      V(client.verts.E.x - 2, client.front[1]),
      V((client.verts.E.x + targetX) / 2, (client.front[1] + targetY) / 2),
      V(targetX - 6, targetY),
    ], { arrow: true });
    guides.push(e.guide);
    return e.d;
  };

  const push = (card) => {
    shadows.push(...card.shadows); solids.push(...card.solids); badges.push(...card.badges);
  };

  if (view === 'fk' || view === 'recap') {
    /* two linked relations: users (left) ← orders (right) */
    const usersTones = ['amber', 'slate', 'slate', 'slate'];      // id col highlighted
    const users = tableCard(250, 130, 260, 262, 'users', 4, { rowTones: usersTones });
    const orders = tableCard(600, 130, 260, 262, 'orders', 4, { rowTones: ['slate', 'rose', 'slate', 'slate'], nameIcon: 'listOrdered' });
    push(users); push(orders);

    railIn = feed(users.x, users.y + users.h / 2);

    // FK connector: an orders row → the users primary-key row
    const src = orders.rows[1];
    const dst = users.rows[0];
    const fk = edge([
      V(src.verts.W.x + 2, src.cy),
      V((src.verts.W.x + dst.verts.E.x) / 2, (src.cy + dst.cy) / 2 - 8),
      V(dst.verts.E.x - 4, dst.cy),
    ], { arrow: true, dashed: true });
    guides.push(fk.guide); railOut = fk.d;

    badges.push(pill(VW / 2, 462, 'FK:  orders.user_id → users.id', { icon: 'merge', cls: 'pill--sst', w: 320 }));

    if (view === 'recap') {
      ['typed', 'keyed', 'set-based'].forEach((t, i) =>
        badges.push(pill(900, 150 + i * 52, t, { icon: 'check', w: 140 })));
    }

    return assemble({
      grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'write', speed: 120, size: 5 }],
      note: snap.note,
    });
  }

  /* ── single-card views: table / tuple / key / set ──────────────────────── */
  const cardX = 370, cardW = 300, cardY = 120, cardH = 272, cx = cardX + cardW / 2;

  let rowTones = ['slate', 'slate', 'slate', 'slate'];
  let ghostRows = [];
  if (view === 'tuple') rowTones = ['slate', 'rose', 'slate', 'slate'];
  if (view === 'key') rowTones = ['amber', 'slate', 'slate', 'slate'];
  if (view === 'set') { rowTones = ['slate', 'rose', 'rose', 'slate']; ghostRows = [2]; }

  const card = tableCard(cardX, cardY, cardW, cardH, 'users', 4, { rowTones, ghostRows });
  push(card);
  railIn = feed(cardX, cardY + cardH / 2);

  if (view === 'table') {
    badges.push(pill(cx, 78, 'relation  =  table', { icon: 'grid', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="${cx}" y="${A(cardY + cardH + 22)}" text-anchor="middle">heading + body of rows</text>`);
  } else if (view === 'tuple') {
    const cols = [['id', 'key'], ['name', null], ['email', null]];
    cols.forEach((c, i) => badges.push(pill(cx - 92 + i * 92, 70, c[0], c[1] ? { icon: c[1], w: 72 } : { w: 72 })));
    badges.push(`<text class="sst-cap" x="${cx}" y="${A(cardY + cardH + 22)}" text-anchor="middle">one row = one tuple · each column an attribute</text>`);
  } else if (view === 'key') {
    badges.push(pill(cardX + cardW + 96, cardY + 60, 'PK: id', { icon: 'key', cls: 'pill--sst', w: 120 }));
    badges.push(`<text class="iso-region__t" x="${cardX + cardW + 96}" y="${A(cardY + 92)}" text-anchor="middle">unique · not null</text>`);
    badges.push(`<text class="sst-cap" x="${cx}" y="${A(cardY + cardH + 22)}" text-anchor="middle">the primary key identifies every row</text>`);
  } else if (view === 'set') {
    badges.push(`<text class="iso-region__t" x="${card.rows[2].cx + 150}" y="${A(card.rows[2].cy + 4)}" text-anchor="middle">duplicate — not allowed</text>`);
    const dupEdge = edge([V(card.rows[2].verts.E.x + 4, card.rows[2].cy), V(card.rows[2].cx + 108, card.rows[2].cy)], { dashed: true });
    guides.push(dupEdge.guide);
    badges.push(`<text class="sst-cap" x="${cx}" y="${A(cardY + cardH + 22)}" text-anchor="middle">a relation is a set — order doesn’t matter</text>`);
  }

  return assemble({
    grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
    flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }],
    note: snap.note,
  });
}

/* stitch the SVG together in the shared layer order (identical to dbms-scene) */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Relational model">
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
