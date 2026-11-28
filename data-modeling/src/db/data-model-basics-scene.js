/* data-model-basics-scene.js — the "Data Model Basics" scene, in the same
   Designed-to-Scale isometric vocabulary as the db-scale lessons. An entity is
   drawn as a dashed card (a logical region) with a name pill on top and its
   attributes as thin stacked iso tiles. Keys are coloured tiles; a foreign-key
   relationship is a routed dashed connector between two entity cards, tagged
   with a cardinality pill. A Client cube on the left feeds the model.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'entity', 'attributes', 'keys', 'relationship', 'levels', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* an entity drawn as a dashed card: name pill on top, attributes as stacked
   tiles. returns { cx, x, y, w, h, rows:[{cx,cy,top,base,verts}], shadows,
   solids, badges } */
function entityCard(x, y, w, h, name, rowCount, opts = {}) {
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

export function renderDataModelBasicsScene(snap, opts = {}) {
  const view = snap.view || 'recap';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── client on the left: it feeds the model ────────────────────────────── */
  const client = isoCube(150, 150, 50, 62, 'blue', { icon: 'app', label: 'Client', sub: 'uses model', iconSize: 24 });
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

  /* the four attributes of the Customer entity: [name, type] */
  const ATTRS = [['customer_id', 'int'], ['name', 'text'], ['email', 'text'], ['signup_date', 'date']];

  /* ── LEVELS: conceptual → logical → physical, three stacked tiers ──────── */
  if (view === 'levels') {
    const tiers = [
      { name: 'Conceptual', cy: 115, tone: 'blue', tag: 'no tech', icon: 'book', desc: 'entities & relationships only' },
      { name: 'Logical', cy: 275, tone: 'green', tag: 'normalized', icon: 'grid', desc: 'tables · columns · keys' },
      { name: 'Physical', cy: 435, tone: 'lilac', tag: 'indexed', icon: 'database', desc: 'types · indexes · storage' },
    ];

    tiers.forEach((tr) => {
      badges.push(region(160, tr.cy - 60, 720, 120, '', { r: 18 }));
      badges.push(pill(258, tr.cy, tr.name, { icon: tr.icon, cls: 'pill--sst', w: 160 }));

      const c1 = isoCube(500, tr.cy - 14, 40, 38, tr.tone, { icon: 'grid', label: 'Customer', iconSize: 16 });
      const c2 = isoCube(690, tr.cy - 14, 40, 38, tr.tone, { icon: 'listOrdered', label: 'Order', iconSize: 16 });
      shadows.push(c1.shadow, c2.shadow); solids.push(c1.g, c2.g);

      const link = edge([V(c1.verts.E.x, tr.cy - 14), V(c2.verts.W.x, tr.cy - 14)], { arrow: true });
      guides.push(link.guide);

      badges.push(pill(812, tr.cy, tr.tag, { icon: 'check', w: 118 }));
      badges.push(`<text class="sst-cap" x="595" y="${A(tr.cy + 46)}" text-anchor="middle">${esc(tr.desc)}</text>`);
    });

    /* refinement arrows down the left edge: same model, more detail */
    [[195, 177, 215], [195, 337, 375]].forEach(([x, y0, y1]) => {
      const e = edge([V(x, y0), V(x, y1)], { arrow: true, dashed: true });
      guides.push(e.guide);
    });
    badges.push(`<text class="iso-region__t" x="195" y="${A(255)}" text-anchor="middle" transform="rotate(-90 195 255)">refine</text>`);

    railIn = feed(200, tiers[0].cy);

    return assemble({
      grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }],
      note: snap.note,
    });
  }

  /* ── SINGLE-ENTITY CARD VIEWS: entity / attributes / keys ──────────────── */
  if (view === 'entity' || view === 'attributes' || view === 'keys') {
    const cardX = 360, cardW = 300, cardY = 118, cardH = 280, cx = cardX + cardW / 2;

    if (view === 'entity') {
      /* one entity, no attributes yet: a dashed card holding a single cube */
      badges.push(region(cardX, cardY, cardW, cardH, '', { r: 18 }));
      badges.push(pill(cx, cardY - 4, 'Customer', { icon: 'grid', cls: 'pill--sst' }));
      const ent = isoCube(cx, cardY + 132, 76, 66, 'slate', { icon: 'grid', label: 'Customer', sub: 'entity', iconSize: 28 });
      shadows.push(ent.shadow); solids.push(ent.g);
      badges.push(pill(cx, 74, 'entity  =  a thing we store', { icon: 'book', cls: 'pill--sst', w: 260 }));
      badges.push(`<text class="sst-cap" x="${cx}" y="${A(cardY + cardH + 22)}" text-anchor="middle">every real customer is an instance of this entity</text>`);
      railIn = feed(cardX, cardY + cardH / 2);

      return assemble({
        grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
        flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }],
        note: snap.note,
      });
    }

    /* attributes / keys: four attribute tiles, each labelled by a pill */
    const rowTones = view === 'keys'
      ? ['amber', 'slate', 'slate', 'slate']   // customer_id (PK) highlighted
      : ['slate', 'slate', 'slate', 'slate'];
    const card = entityCard(cardX, cardY, cardW, cardH, 'Customer', 4, { rowTones });
    push(card);
    railIn = feed(cardX, cardY + cardH / 2);

    card.rows.forEach((row, i) => {
      const [nm, ty] = ATTRS[i];
      const isPK = view === 'keys' && i === 0;
      const label = isPK ? 'PK:  customer_id' : `${nm} : ${ty}`;
      // thin dashed connector from the tile to its attribute pill
      const conn = edge([V(row.verts.E.x + 2, row.cy), V(762, row.cy)], { dashed: true });
      guides.push(conn.guide);
      badges.push(pill(846, row.cy, label, isPK
        ? { icon: 'key', cls: 'pill--sst', w: 176 }
        : { w: 176 }));
    });

    if (view === 'attributes') {
      badges.push(pill(cx, 74, 'attributes  describe  the entity', { icon: 'listOrdered', cls: 'pill--sst', w: 280 }));
      badges.push(`<text class="sst-cap" x="${cx}" y="${A(cardY + cardH + 22)}" text-anchor="middle">each attribute is a named, typed fact</text>`);
    } else {
      badges.push(pill(cx, 74, 'one key identifies each instance', { icon: 'key', cls: 'pill--sst', w: 290 }));
      badges.push(`<text class="iso-region__t" x="846" y="${A(card.rows[0].cy + 26)}" text-anchor="middle">unique · not null</text>`);
      badges.push(`<text class="sst-cap" x="${cx}" y="${A(cardY + cardH + 22)}" text-anchor="middle">the primary key is one of the attributes</text>`);
    }

    return assemble({
      grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }],
      note: snap.note,
    });
  }

  /* ── TWO LINKED ENTITIES: relationship (signature) · recap · fallback ──── */
  const customer = entityCard(230, 130, 260, 262, 'Customer', 4, { rowTones: ['amber', 'slate', 'slate', 'slate'] });
  const order = entityCard(590, 130, 260, 262, 'Order', 4, { rowTones: ['slate', 'rose', 'slate', 'slate'], nameIcon: 'listOrdered' });
  push(customer); push(order);

  railIn = feed(customer.x, customer.y + customer.h / 2);

  /* FK connector: an order row (its customer_id) → the Customer primary-key row */
  const src = order.rows[1];
  const dst = customer.rows[0];
  const fk = edge([
    V(src.verts.W.x + 2, src.cy),
    V((src.verts.W.x + dst.verts.E.x) / 2, (src.cy + dst.cy) / 2 - 8),
    V(dst.verts.E.x - 4, dst.cy),
  ], { arrow: true, dashed: true });
  guides.push(fk.guide); railOut = fk.d;

  const midX = (src.verts.W.x + dst.verts.E.x) / 2;
  badges.push(pill(midX, (src.cy + dst.cy) / 2 - 30, '1  :  N', { cls: 'pill--sst', w: 84 }));
  badges.push(pill(VW / 2, 470, 'FK:  order.customer_id → customer.customer_id', { icon: 'key', cls: 'pill--sst', w: 380 }));

  if (view === 'relationship') {
    badges.push(pill(VW / 2, 70, 'a relationship links two entities', { icon: 'merge', cls: 'pill--sst', w: 300 }));
    badges.push(pill(VW / 2, 516, 'cardinality:   1:1   ·   1:N   ·   N:M', { icon: 'scale', w: 320 }));
  } else {
    /* recap (and any unknown view): check off the four foundations */
    ['entities', 'attributes', 'keys', 'relationships'].forEach((t, i) =>
      badges.push(pill(930, 132 + i * 52, t, { icon: 'check', w: 164 })));
    badges.push(pill(VW / 2, 70, 'the blueprint every table is built from', { icon: 'book', cls: 'pill--sst', w: 320 }));
  }

  return assemble({
    grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
    flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'write', speed: 120, size: 5 }],
    note: snap.note,
  });
}

/* stitch the SVG together in the shared layer order (identical to the template
   scene's assemble; only the root <svg> class and aria-label differ) */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--data-model-basics" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Data model basics">
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
