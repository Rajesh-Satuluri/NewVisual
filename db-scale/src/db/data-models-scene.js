/* data-models-scene.js — the "Data Models" scene, in the same Designed-to-Scale
   isometric vocabulary as the DBMS and LSM-Tree lessons: rounded iso cubes with
   icon glyphs and labels, soft ground shadows, pill badges, dashed regions,
   routed connectors with arrows, a faded iso grid, and particle rails.

   The SAME facts — a user with two orders — drawn four different ways, one per
   view: relational tables, a nested document, key-value pairs, and a graph.

   Input: a view-snapshot { view, apps, note, pulse, ... }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'intro', 'relational', 'document', 'keyvalue', 'graph', 'recap'. */

import { iso3dDefs, isoCube, isoTile, pill, edge, region, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* evenly spread N vertical slots around a centre */
function spread(n, cy, gap) {
  const out = [];
  const start = cy - (n - 1) * gap / 2;
  for (let i = 0; i < n; i++) out.push(start + i * gap);
  return out;
}

export function renderDataModelsScene(snap, opts = {}) {
  const view = snap.view || 'intro';
  const nApps = snap.apps || 2;
  const pulse = snap.pulse || opts.pulse || null;

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];                  // static connector paths
  let railIn = null, railOut = null;  // animated rails

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* ── clients on the left ──────────────────────────────────────────────── */
  const appX = 150;
  const ys = spread(nApps, 236, nApps === 1 ? 0 : 150);
  const apps = ys.map((y) => isoCube(appX, y, 54, 60, 'blue', {
    icon: 'app', label: 'App', sub: 'reads', pulse: pulse === 'client', iconSize: 26,
  }));
  apps.forEach(a => { shadows.push(a.shadow); solids.push(a.g); });

  /* route every app into a single entry point on the central form */
  function fanIn(target) {
    apps.forEach((a, i) => {
      const e = edge([
        V(a.verts.E.x - 2, a.front[1]),
        V((a.verts.E.x + target.x) / 2, (a.front[1] + target.y) / 2),
        V(target.x - 6, target.y),
      ], { arrow: true });
      guides.push(e.guide);
      if (i === 0) railIn = e.d;
    });
  }

  /* ── INTRO: one neutral pile of facts, shaped by three forces ─────────── */
  if (view === 'intro') {
    const data = isoCube(560, 180, 110, 122, 'slate', { icon: 'database', label: 'Data', sub: 'the same facts', halo: true });
    shadows.push(data.shadow); halos.push(data.halo); solids.push(data.g);
    fanIn(V(data.verts.W.x, data.verts.W.y + 12));
    [['structure', 'grid'], ['operations', 'merge'], ['constraints', 'check']].forEach(([t, ic], i) =>
      badges.push(pill(828, 132 + i * 54, t, { icon: ic, w: 160 })));
    badges.push(`<text class="sst-cap" x="560" y="${A(data.base[1] + 20)}" text-anchor="middle">structure + operations = a data model</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── RELATIONAL: two flat tables joined by a key ──────────────────────── */
  if (view === 'relational') {
    const users = isoTile(524, 168, 98, 'blue', { h: 40 });
    const orders = isoTile(566, 320, 98, 'lilac', { h: 40 });
    [users, orders].forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    fanIn(V(users.verts.W.x, users.verts.W.y + 8));
    // foreign-key link users → orders
    const fk = edge([
      V(users.base[0], users.base[1] - 6),
      V((users.base[0] + orders.top[0]) / 2 - 4, (users.base[1] + orders.top[1]) / 2),
      V(orders.top[0] - 8, orders.top[1] + 2),
    ], { arrow: true, dashed: true });
    guides.push(fk.guide); railOut = fk.d;
    badges.push(pill(690, 96, 'tables + keys', { icon: 'grid', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="524" y="${A(users.top[1] - 10)}" text-anchor="middle">users</text>`);
    badges.push(`<text class="sst-cap" x="566" y="${A(orders.base[1] + 18)}" text-anchor="middle">orders · user_id → users.id</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'write', speed: 130, size: 6 }],
      note: snap.note });
  }

  /* ── DOCUMENT: one nested record embedding its orders ─────────────────── */
  if (view === 'document') {
    const doc = isoCube(548, 176, 116, 126, 'green', { icon: 'file', label: 'user', sub: '+ orders[]', halo: true });
    shadows.push(doc.shadow); halos.push(doc.halo); solids.push(doc.g);
    // two small embedded-order tiles, nested below-right
    const o1 = isoTile(690, 300, 50, 'lilac', { h: 20 });
    const o2 = isoTile(700, 330, 50, 'lilac', { h: 20 });
    [o1, o2].forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    fanIn(V(doc.verts.W.x, doc.verts.W.y + 12));
    badges.push(pill(560, 88, 'one nested document', { icon: 'file', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="696" y="${A(o2.base[1] + 16)}" text-anchor="middle">orders embedded inside</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
  }

  /* ── KEY-VALUE: a dictionary of opaque blobs ──────────────────────────── */
  if (view === 'keyvalue') {
    const kx = 500, vx = 622, kys = [148, 222, 296, 370];
    const keys = kys.map(y => isoTile(kx, y, 42, 'slate', { h: 18 }));
    const vals = kys.map(y => isoTile(vx, y, 46, 'amber', { h: 18 }));
    keys.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    vals.forEach(t => { shadows.push(t.shadow); solids.push(t.g); });
    // small key → value arrows
    keys.forEach((k, i) => {
      const e = edge([V(k.verts.E.x - 4, k.front[1]), V(vals[i].verts.W.x + 4, vals[i].front[1])], { arrow: true, r: 6 });
      guides.push(e.guide);
    });
    fanIn(V(keys[0].verts.W.x, keys[0].front[1]));
    badges.push(pill(560, 86, 'key → value', { icon: 'key', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="622" y="${A(vals[vals.length - 1].base[1] + 18)}" text-anchor="middle">values are opaque blobs</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
      flows: [{ id: 'in', kind: 'read', speed: 170, size: 5 }], note: snap.note });
  }

  /* ── GRAPH: nodes with first-class edges ──────────────────────────────── */
  if (view === 'graph') {
    const user = isoCube(548, 118, 56, 60, 'blue', { icon: 'app', label: 'user', iconSize: 22 });
    const order = isoCube(452, 318, 52, 56, 'amber', { icon: 'file', label: 'order', iconSize: 20 });
    const product = isoCube(656, 318, 52, 56, 'lilac', { icon: 'database', label: 'product', iconSize: 20 });
    [user, order, product].forEach(c => { shadows.push(c.shadow); solids.push(c.g); });
    // relationship edges
    const e1 = edge([V(user.verts.W.x + 4, user.base[1] - 10), V(order.top[0] + 6, order.top[1] - 2)], { arrow: true });
    const e2 = edge([V(order.verts.E.x - 2, order.front[1]), V(product.verts.W.x + 2, product.front[1])], { arrow: true });
    guides.push(e1.guide, e2.guide);
    fanIn(V(user.verts.W.x, user.verts.W.y + 10));
    railOut = e2.d;
    badges.push(pill(560, 64, 'nodes + edges', { icon: 'merge', cls: 'pill--sst' }));
    badges.push(`<text class="sst-cap" x="470" y="212" text-anchor="middle">placed</text>`);
    badges.push(`<text class="sst-cap" x="554" y="${A(order.front[1] - 10)}" text-anchor="middle">contains</text>`);
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut,
      flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }, { id: 'out', kind: 'write', speed: 150, size: 5 }],
      note: snap.note });
  }

  /* ── RECAP: one set of facts, four shapes to choose from ──────────────── */
  const data = isoCube(560, 150, 104, 116, 'slate', { icon: 'database', label: 'Data', sub: 'your facts', halo: true });
  shadows.push(data.shadow); halos.push(data.halo); solids.push(data.g);
  fanIn(V(data.verts.W.x, data.verts.W.y + 12));
  [['relational', 316], ['document', 472], ['key-value', 628], ['graph', 784]].forEach(([t, x]) =>
    badges.push(pill(x, 476, t, { icon: 'check', w: 146 })));
  badges.push(`<text class="iso-region__t" x="560" y="430" text-anchor="middle">PICK BY HOW YOU READ &amp; WRITE</text>`);
  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut: null,
    flows: [{ id: 'in', kind: 'read', speed: 150, size: 5 }], note: snap.note });
}

/* stitch the SVG together in the shared layer order */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--dbms" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Data models — the same facts in four shapes">
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
