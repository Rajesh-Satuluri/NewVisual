/* star-schema-scene.js — the "Star Schema" scene, in the same Designed-to-Scale
   isometric vocabulary as the relational-model / DBMS lessons. The signature
   form is a radial STAR: a central fact table (an amber iso cube) ringed by four
   dimension tables (blue / green / lilac / slate cubes), each tied to the center
   by a single foreign-key spoke. Analytic reads flow along those spokes into the
   fact; snowflaking chains extra sub-tables off one arm.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, note, flows }.

   Views: 'normalized', 'fact', 'star', 'query', 'snowflake', 'recap'. */

import { iso3dDefs, isoCube, pill, edge, isoGrid, ISO } from '../engine/iso3d.js';

const { A, V } = ISO;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const VW = 1040;

/* fact table (top-rhombus centre) and the four points of the star */
const FX = 548, FY = 300;
const DIMS = {
  date:     { x: 548, y: 138, tone: 'blue',  icon: 'clock',       label: 'dim_date' },
  product:  { x: 762, y: 300, tone: 'green', icon: 'grid',        label: 'dim_product' },
  customer: { x: 334, y: 300, tone: 'lilac', icon: 'app',         label: 'dim_customer' },
  store:    { x: 548, y: 462, tone: 'slate', icon: 'folder',      label: 'dim_store' },
};

export function renderStarSchemaScene(snap, opts = {}) {
  const view = snap.view || 'star';

  const shadows = [], halos = [], solids = [], overlays = [], badges = [];
  const guides = [];
  let railIn = null, railOut = null;
  let flows = [{ id: 'in', kind: 'read', speed: 150, size: 5 }];

  const grid = isoGrid(VW / 2, 250, 30, 20, 30);

  /* the analytic client on the left — it issues the query against the star */
  const client = isoCube(138, 150, 48, 60, 'blue', { icon: 'search', label: 'Analytics', sub: 'SQL', iconSize: 22 });
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

  /* draw one iso-cube card; collects shadow/halo/solid, returns the cube */
  const cube = (x, y, rx, bodyH, tone, o = {}) => {
    const c = isoCube(x, y, rx, bodyH, tone, {
      icon: o.icon, label: o.label, sub: o.sub, halo: o.halo, iconSize: o.iconSize,
    });
    shadows.push(c.shadow);
    if (c.halo) halos.push(c.halo);
    solids.push(c.g);
    return c;
  };

  const cap = (cx, y, text) =>
    `<text class="sst-cap" x="${A(cx)}" y="${A(y)}" text-anchor="middle">${esc(text)}</text>`;

  /* ── 'normalized': the OLTP join mess — 7 small tables, a tangle of edges ── */
  if (view === 'normalized') {
    const t = [
      { x: 232, y: 132, label: 'orders' },
      { x: 442, y: 116, label: 'order_line' },
      { x: 650, y: 146, label: 'product' },
      { x: 846, y: 204, label: 'category' },
      { x: 318, y: 356, label: 'customer' },
      { x: 548, y: 392, label: 'address' },
      { x: 772, y: 408, label: 'region' },
    ];
    const cubes = t.map(n => cube(n.x, n.y, 62, 42, 'slate', { icon: 'file', label: n.label, iconSize: 18 }));
    // a tangle of foreign-key joins — deep chains to walk for one question
    const link = (a, b) => {
      const e = edge([V(cubes[a].front[0], cubes[a].front[1]), V(cubes[b].front[0], cubes[b].front[1])], { dashed: true });
      guides.push(e.guide);
    };
    [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 6], [1, 5], [2, 6], [1, 4]].forEach(([a, b]) => link(a, b));

    railIn = feed(cubes[0].front[0], cubes[0].front[1]);
    badges.push(pill(VW / 2, 70, 'normalized OLTP schema', { icon: 'layers', cls: 'pill--sst', w: 240 }));
    badges.push(pill(VW / 2, 506, 'revenue by region by month  =  7 joins', { icon: 'alert', cls: 'pill--sst', w: 360 }));
    badges.push(cap(VW / 2, 548, 'correct — but every analytic question walks deep join chains'));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── 'fact': ONE central fact table with grain + measure pills ──────────── */
  if (view === 'fact') {
    const fact = cube(FX, FY, 96, 62, 'amber', { icon: 'listOrdered', label: 'sales_fact', sub: '50,000 rows', iconSize: 26 });
    railIn = feed(fact.verts.W.x, fact.front[1]);
    badges.push(pill(FX, 92, 'grain:  1 line item', { icon: 'target', cls: 'pill--sst', w: 220 }));
    badges.push(pill(FX - 128, FY + 150, 'qty', { icon: 'scale', w: 92 }));
    badges.push(pill(FX + 128, FY + 150, 'amount', { icon: 'bolt', w: 108 }));
    badges.push(pill(FX, FY + 150, '+ dim keys', { icon: 'key', w: 128 }));
    badges.push(cap(FX, 536, 'one row = one measurable event · numeric measures + foreign keys'));
    return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
  }

  /* ── 'star' / 'query' / 'snowflake' / 'recap': the radial star ──────────── *
   * (also the final fallback: any unknown view renders this clean star)       */
  const isQuery = view === 'query';
  const isSnow = view === 'snowflake';
  const isRecap = view === 'recap';
  const filtered = { date: isQuery, store: isQuery };   // 2 dims highlighted as "filtered"

  const fact = cube(FX, FY, 96, 62, 'amber', { icon: 'listOrdered', label: 'sales_fact', sub: 'grain: line item', iconSize: 26 });

  // the four dimension cubes, each a point of the star
  const dc = {};
  for (const k of Object.keys(DIMS)) {
    const d = DIMS[k];
    dc[k] = cube(d.x, d.y, 76, 52, d.tone, { icon: d.icon, label: d.label, iconSize: 22, halo: !!filtered[k] });
  }

  // FK spokes: dimension → fact centre. Dashed for the plain star; arrowed
  // read-rails for the query. Collect rail ids so the particle layer can bind.
  let ri = 0;
  for (const k of Object.keys(DIMS)) {
    const d = dc[k];
    const pts = [V(d.front[0], d.front[1]), V(fact.front[0], fact.front[1])];
    const e = edge(pts, { dashed: !isQuery, arrow: isQuery });
    if (isQuery) {
      // route a read flow along this spoke, INTO the fact centre
      if (ri === 0) { railIn = e.d; guides.push(e.guide); }
      else if (ri === 1) { railOut = e.d; guides.push(e.guide); }
      else {
        const id = 'd' + ri;
        guides.push(`<path id="rail-${id}" class="rail" d="${e.d}"/>`);
        guides.push(e.guide);
        flows.push({ id, kind: 'read', speed: 150, size: 5 });
      }
      ri++;
    } else {
      guides.push(e.guide);
    }
  }

  if (isQuery) {
    // two read-rails ride on rail-in / rail-out, the rest on injected rails
    flows = [
      { id: 'in', kind: 'read', speed: 150, size: 5 },
      { id: 'out', kind: 'read', speed: 150, size: 5 },
      ...flows.filter(f => f.id.startsWith('d')),
    ];
  } else {
    // the analytics client still issues the query against the star
    railIn = feed(dc.customer.verts.W.x, dc.customer.front[1]);
  }

  // snowflake: chain dim_category → dim_department off the dim_product arm
  if (isSnow) {
    const cat = cube(866, 212, 60, 44, 'green', { icon: 'folder', label: 'dim_category', iconSize: 18 });
    const dep = cube(962, 128, 56, 40, 'green', { icon: 'folder', label: 'dim_department', iconSize: 17 });
    const e1 = edge([V(dc.product.front[0], dc.product.front[1]), V(cat.front[0], cat.front[1])], { dashed: true });
    const e2 = edge([V(cat.front[0], cat.front[1]), V(dep.front[0], dep.front[1])], { dashed: true });
    guides.push(e1.guide, e2.guide);
    badges.push(pill(760, 500, 'dim_product arm:  3 hops', { icon: 'merge', cls: 'pill--sst', w: 240 }));
  }

  // labels & captions per view
  if (isQuery) {
    badges.push(pill(DIMS.date.x, 74, 'filter', { icon: 'search', w: 96 }));
    badges.push(pill(DIMS.store.x, 556, 'filter', { icon: 'search', w: 96 }));
    badges.push(pill(FX, FY + 150, 'SUM(amount)', { icon: 'bolt', cls: 'pill--sst', w: 150 }));
    badges.push(cap(VW / 2, 592, 'star join · filter dimensions · aggregate one measure · 4 single-hop joins'));
  } else if (isRecap) {
    ['one grain', 'numeric facts', 'conformed dims'].forEach((tx, i) =>
      badges.push(pill(944, 150 + i * 52, tx, { icon: 'check', w: 168 })));
    badges.push(cap(VW / 2, 592, 'one grain · numeric facts · denormalized dimensions · shallow joins'));
  } else if (isSnow) {
    badges.push(cap(VW / 2, 592, 'snowflaking normalizes a dimension — less redundancy, more joins'));
  } else {
    badges.push(pill(VW / 2, 592 - 18, 'the star:  fact table + 4 dimensions, one hop each', { icon: 'target', cls: 'pill--sst', w: 380 }));
  }

  return assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note: snap.note });
}

/* stitch the SVG together in the shared layer order (identical to the template
   relational-model-scene assemble, root tag retargeted to scene--star-schema) */
function assemble({ grid, halos, shadows, solids, overlays, badges, guides, railIn, railOut, flows, note }) {
  const VH = 600;
  const regionBadges = badges.filter(b => b.includes('iso-region'));
  const otherBadges = badges.filter(b => !b.includes('iso-region'));
  const rails = (railIn ? `<path id="rail-in" class="rail" d="${railIn}"/>` : '')
    + (railOut ? `<path id="rail-out" class="rail" d="${railOut}"/>` : '');

  const svgStr = `
  <svg class="scene scene--star-schema" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Star schema">
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
