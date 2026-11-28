/* normalization-lab-scene.js — the "Normalization Lab" scene, in the same
   Designed-to-Scale isometric vocabulary as the Relational-Model lesson. A
   table is a dashed card (a logical region) with a name pill on top, its
   columns drawn as header chips, and its rows as thin stacked iso tiles.
   Repeated / offending cells are tinted a warning tone; foreign keys are
   routed dashed connectors between two cards.

   This is a STEPPED lab: one fixed snapshot per step. Input: a view-snapshot
   { view, note }. Output: { svg, layer, rail, note, flows }.

   Views: 'unnormalized', 'anomalies', '1nf', '2nf', '3nf', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* ── a WIDE table: region, name pill, a row of column header chips, and the
   body drawn as a stack of iso tiles (one per row). Repeated/offending rows
   are tinted via rowTones; haloRows glow. Returns geometry for pointers. ── */
function wideTable(x, y, w, h, name, cols, rowTones, opts = {}) {
  const cx = x + w / 2;
  const shadows = [], solids = [], halos = [], badges = [];
  badges.push(region(x, y, w, h, '', { r: 18 }));
  badges.push(pill(cx, y - 2, name, { icon: opts.nameIcon || 'grid', cls: 'pill--sst', w: 150 }));

  // column header chips spread across the card width
  const n = cols.length;
  const colGap = (w - 36) / n;
  const colY = y + 44;
  const colPos = [];
  cols.forEach((c, i) => {
    const ccx = x + 18 + colGap * (i + 0.5);
    badges.push(pill(ccx, colY, c.label, { w: colGap - 10, icon: c.icon, cls: c.hot ? 'pill--sst' : '' }));
    colPos.push({ cx: ccx, cy: colY });
  });

  // body: stacked iso tiles, one per row
  const rx = opts.rx || Math.min(250, (w - 70) / 2);
  const gap = opts.gap || 38;
  const top0 = colY + 54;
  const halo = opts.haloRows || [];
  const ghost = opts.ghostRows || [];
  const rows = [];
  for (let i = 0; i < rowTones.length; i++) {
    const cyi = top0 + i * gap;
    const t = isoTile(cx, cyi, rx, rowTones[i] || 'slate', { h: 13, halo: halo.includes(i), ghost: ghost.includes(i) });
    if (t.halo) halos.push(t.halo);
    shadows.push(t.shadow); solids.push(t.g);
    rows.push({ cx, cy: cyi, top: t.top, base: t.base, verts: t.verts });
  }
  return { cx, x, y, w, h, rows, colPos, colY, shadows, solids, halos, badges };
}

/* ── a compact SCHEMA card: region, name pill, columns as a vertical stack of
   chips (PK/FK iconed). Returns per-column anchor points for FK routing. ── */
function schemaCard(x, y, w, name, cols, opts = {}) {
  const cx = x + w / 2;
  const badges = [];
  const top0 = y + 54;
  const rowH = 38;
  const h = opts.h || (top0 - y + cols.length * rowH + 10);
  badges.push(region(x, y, w, h, '', { r: 18 }));
  badges.push(pill(cx, y, name, { icon: opts.nameIcon || 'grid', cls: 'pill--sst', w: w - 44 }));
  const colPos = [];
  cols.forEach((c, i) => {
    const ccy = top0 + i * rowH;
    const ic = c.key ? 'key' : c.fk ? 'merge' : null;
    badges.push(pill(cx, ccy, c.label, { w: w - 34, icon: ic, cls: (c.key || c.hot) ? 'pill--sst' : '' }));
    colPos.push({ cx, cy: ccy, left: x, right: x + w, key: !!c.key, fk: !!c.fk, label: c.label });
  });
  return { cx, x, y, w, h, colPos, badges };
}

export function renderNormalizationLabScene(snap, opts = {}) {
  const view = snap.view || 'recap';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* client on the left — it WRITES rows into the schema */
  const client = isoCube(118, 150, 46, 60, 'blue', { icon: 'app', label: 'Client', sub: 'writes', iconSize: 22 });
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
    if (card.shadows) shadows.push(...card.shadows);
    if (card.solids) solids.push(...card.solids);
    if (card.halos) halos.push(...card.halos);
    if (card.badges) badges.push(...card.badges);
  };

  const WIDE_COLS = [
    { label: 'order_id', icon: 'key', hot: true },
    { label: 'customer_name', hot: true },
    { label: 'customer_email', hot: true },
    { label: 'product_name', hot: true },
    { label: 'price', hot: true },
    { label: 'qty' },
  ];

  /* ── single wide-table views: unnormalized / anomalies / 1nf ───────────── */
  if (view === 'unnormalized' || view === 'anomalies' || view === '1nf') {
    const x = 300, y = 118, w = 610, h = 384;
    // rows: same customer repeats (rose), same product repeats (amber)
    let tones, haloRows = [];
    if (view === '1nf') {
      tones = ['slate', 'slate', 'slate', 'slate', 'slate'];
    } else {
      tones = ['rose', 'rose', 'amber', 'amber', 'rose'];
      if (view === 'anomalies') haloRows = [0, 1, 4];
    }
    const t = wideTable(x, y, w, h, 'orders', WIDE_COLS, tones, { nameIcon: 'listOrdered', haloRows });
    push(t);
    railIn = feed(x, y + 70);

    if (view === 'unnormalized') {
      badges.push(`<text class="sst-cap" x="${t.cx}" y="${A(y + h + 24)}" text-anchor="middle">one row = the whole order · customer &amp; product facts copied onto every line</text>`);
    } else if (view === '1nf') {
      badges.push(pill(x + w - 70, y + 2, '1NF', { icon: 'check', cls: 'pill--sst', w: 92 }));
      badges.push(`<text class="sst-cap" x="${t.cx}" y="${A(y + h + 24)}" text-anchor="middle">atomic cells · no repeating groups · a key on every row</text>`);
    } else {
      // three anomaly callouts pointing at the table
      const a1 = t.rows[1], a2 = t.rows[2], a3 = t.rows[4];
      const lanes = [
        { txt: 'UPDATE: email in 3 rows', px: 930, py: 150, row: a1, icon: 'alert' },
        { txt: 'INSERT: needs an order', px: 930, py: 250, row: a2, icon: 'alert' },
        { txt: 'DELETE: loses customer', px: 930, py: 360, row: a3, icon: 'alert' },
      ];
      lanes.forEach((L) => {
        badges.push(pill(L.px, L.py, L.txt, { icon: L.icon, cls: 'pill--sst', w: 212 }));
        const e = edge([
          V(L.px - 108, L.py),
          V((L.px - 108 + L.row.verts.E.x) / 2, (L.py + L.row.cy) / 2),
          V(L.row.verts.E.x + 4, L.row.cy),
        ], { dashed: true, arrow: true });
        guides.push(e.guide);
      });
      badges.push(`<text class="sst-cap" x="${t.cx}" y="${A(y + h + 24)}" text-anchor="middle">redundancy breeds update · insert · delete anomalies</text>`);
    }

    return assemble({
      grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'write', speed: 140, size: 5 }],
      note: snap.note,
    });
  }

  /* ── 2NF: orders (left) + products (right), joined by a FK edge ────────── */
  if (view === '2nf') {
    const orders = schemaCard(250, 150, 300, 'orders', [
      { label: 'order_id', key: true },
      { label: 'customer_name', hot: true },
      { label: 'customer_email', hot: true },
      { label: 'product_id', fk: true },
      { label: 'qty' },
    ], { nameIcon: 'listOrdered' });
    const products = schemaCard(680, 180, 250, 'products', [
      { label: 'product_id', key: true },
      { label: 'name' },
      { label: 'price' },
    ], { nameIcon: 'grid' });
    push(orders); push(products);

    railIn = feed(orders.x, orders.y + 60);

    // FK: orders.product_id → products.product_id
    const src = orders.colPos[3];
    const dst = products.colPos[0];
    const fk = edge([
      V(src.right - 8, src.cy),
      V((src.right + dst.left) / 2, (src.cy + dst.cy) / 2),
      V(dst.left + 8, dst.cy),
    ], { arrow: true, dashed: true });
    guides.push(fk.guide); railOut = fk.d;

    badges.push(pill(VW / 2, 500, 'FK:  orders.product_id → products.product_id', { icon: 'merge', cls: 'pill--sst', w: 360 }));
    badges.push(`<text class="sst-cap" x="${VW / 2}" y="${A(540)}" text-anchor="middle">product facts split out — stored once, referenced by key</text>`);

    return assemble({
      grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'write', speed: 140, size: 5 }],
      note: snap.note,
    });
  }

  /* ── 3NF / recap: three cards — customers · orders · products ──────────── */
  const customers = schemaCard(70, 170, 270, 'customers', [
    { label: 'customer_id', key: true },
    { label: 'name' },
    { label: 'email' },
  ], { nameIcon: 'server' });
  const orders = schemaCard(385, 150, 270, 'orders', [
    { label: 'order_id', key: true },
    { label: 'customer_id', fk: true },
    { label: 'product_id', fk: true },
    { label: 'qty' },
  ], { nameIcon: 'listOrdered' });
  const products = schemaCard(700, 170, 270, 'products', [
    { label: 'product_id', key: true },
    { label: 'name' },
    { label: 'price' },
  ], { nameIcon: 'grid' });
  push(customers); push(orders); push(products);

  railIn = feed(orders.x, orders.y + 60);

  // FK: orders.customer_id → customers.customer_id (left)
  const srcC = orders.colPos[1], dstC = customers.colPos[0];
  const fkC = edge([
    V(srcC.left + 8, srcC.cy),
    V((srcC.left + dstC.right) / 2, (srcC.cy + dstC.cy) / 2 - 6),
    V(dstC.right - 8, dstC.cy),
  ], { arrow: true, dashed: true });
  guides.push(fkC.guide); railOut = fkC.d;

  // FK: orders.product_id → products.product_id (right)
  const srcP = orders.colPos[2], dstP = products.colPos[0];
  const fkP = edge([
    V(srcP.right - 8, srcP.cy),
    V((srcP.right + dstP.left) / 2, (srcP.cy + dstP.cy) / 2 - 6),
    V(dstP.left + 8, dstP.cy),
  ], { arrow: true, dashed: true });
  guides.push(fkP.guide);

  if (view === 'recap') {
    ['atomic', 'whole key', 'no transitive'].forEach((t, i) =>
      badges.push(pill(VW / 2 - 200 + i * 200, 500, t, { icon: 'check', cls: 'pill--sst', w: 170 })));
    badges.push(`<text class="sst-cap" x="${VW / 2}" y="${A(548)}" text-anchor="middle">the key, the whole key, and nothing but the key — each fact stored once</text>`);
  } else {
    badges.push(pill(VW / 2, 500, 'three clean tables — orders references both by key', { icon: 'merge', cls: 'pill--sst', w: 410 }));
    badges.push(`<text class="sst-cap" x="${VW / 2}" y="${A(540)}" text-anchor="middle">no partial, no transitive dependencies — anomalies gone</text>`);
  }

  return assemble({
    grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
    flows: [{ id: 'in', kind: 'write', speed: 140, size: 5 }],
    note: snap.note,
  });
}

/* stitch the SVG together in the shared layer order (identical to the template) */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--normalization-lab" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Normalization lab">
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
