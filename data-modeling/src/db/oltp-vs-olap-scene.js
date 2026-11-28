/* oltp-vs-olap-scene.js — the "OLTP vs OLAP" scene, on the flat schema CANVAS
   (engine/schema2d.js). The hero contrast is SHAPE: a normalized cluster of
   small OLTP tables vs a wide denormalized OLAP star, and the ETL bridge that
   reshapes one into the other.

   Input: a view-snapshot { view, note }.
   Output: { svg, layer, rail, flows, note } (shell contract).

   Views: 'contrast', 'oltp', 'olap', 'workload', 'bridge', 'recap'.
   Any unknown view falls through to the 'recap' path. */

import { tableCard, connector, chip, band, caption, assemble, VW, VH } from '../engine/schema2d.js';

/* normalized OLTP tables — small, single-purpose */
const ORDERS = [
  { name: 'order_id', type: 'int', key: true },
  { name: 'customer_id', type: 'int', fk: true },
  { name: 'placed_at', type: 'timestamp' },
];
const CUSTOMERS = [
  { name: 'customer_id', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'city', type: 'text' },
];
const ITEMS = [
  { name: 'item_id', type: 'int', key: true },
  { name: 'order_id', type: 'int', fk: true },
  { name: 'product_id', type: 'int', fk: true },
  { name: 'qty', type: 'int' },
];
const PRODUCTS = [
  { name: 'product_id', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'price', type: 'numeric' },
];
/* denormalized OLAP tables */
const FACT = [
  { name: 'date_key', type: 'int', fk: true },
  { name: 'customer_key', type: 'int', fk: true },
  { name: 'product_key', type: 'int', fk: true },
  { name: 'quantity', type: 'int' },
  { name: 'revenue', type: 'numeric' },
];
const DIM_CUSTOMER = [
  { name: 'customer_key', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'city', type: 'text' },
  { name: 'region', type: 'text' },
];
const DIM_PRODUCT = [
  { name: 'product_key', type: 'int', key: true },
  { name: 'name', type: 'text' },
  { name: 'category', type: 'text' },
];

/* draw the normalized OLTP cluster of 4 small tables */
function oltpCluster(body) {
  const orders = tableCard(70, 110, { name: 'orders', icon: 'listOrdered', tone: 'accent', cols: ORDERS, w: 210, delay: 0 });
  const customers = tableCard(70, 330, { name: 'customers', icon: 'app', tone: 'green', cols: CUSTOMERS, w: 210, delay: 0.1 });
  const items = tableCard(360, 90, { name: 'order_items', icon: 'grid', tone: 'violet', cols: ITEMS, w: 210, delay: 0.2 });
  const products = tableCard(360, 330, { name: 'products', icon: 'folder', tone: 'amber', cols: PRODUCTS, w: 210, delay: 0.3 });
  body += orders.svg + customers.svg + items.svg + products.svg;
  body += connector({ x: orders.left, y: orders.rowCy(1), side: 'left' }, { x: customers.left, y: customers.rowCy(0), side: 'left' }, { from: 'many', to: 'one', delay: 0.6 }).svg;
  body += connector({ x: items.left, y: items.rowCy(1), side: 'left' }, { x: orders.right, y: orders.rowCy(0), side: 'right' }, { from: 'many', to: 'one', delay: 0.7 }).svg;
  body += connector({ x: items.right, y: items.rowCy(2), side: 'right' }, { x: products.right, y: products.rowCy(0), side: 'right' }, { from: 'many', to: 'one', delay: 0.8 }).svg;
  return body;
}

/* draw the OLAP star: fact centered, two dims flanking */
function olapStar(body, factTone = 'accent') {
  const fact = tableCard(410, 190, { name: 'fact_sales', icon: 'database', tone: factTone, cols: FACT, w: 230, delay: 0 });
  const dimc = tableCard(80, 150, { name: 'dim_customer', icon: 'app', tone: 'green', cols: DIM_CUSTOMER, w: 220, delay: 0.2 });
  const dimp = tableCard(740, 170, { name: 'dim_product', icon: 'folder', tone: 'amber', cols: DIM_PRODUCT, w: 220, delay: 0.3 });
  body += fact.svg + dimc.svg + dimp.svg;
  body += connector({ x: fact.left, y: fact.rowCy(1), side: 'left' }, { x: dimc.right, y: dimc.rowCy(0), side: 'right' }, { from: 'many', to: 'one', label: 'N : 1', delay: 0.7 }).svg;
  body += connector({ x: fact.right, y: fact.rowCy(2), side: 'right' }, { x: dimp.left, y: dimp.rowCy(0), side: 'left' }, { from: 'many', to: 'one', label: 'N : 1', delay: 0.8 }).svg;
  return { body, fact, dimc, dimp };
}

export function renderOltpVsOlapScene(snap, opts = {}) {
  const view = snap.view || 'recap';
  let body = '';

  /* ── contrast: two labelled regions, write side vs read side ───────────── */
  if (view === 'contrast') {
    body += band(60, 90, 420, 380, 'OLTP — record it', { sub: 'normalized · row-oriented · many tiny writes', delay: 0 });
    body += band(560, 90, 420, 380, 'OLAP — make sense of it', { sub: 'denormalized · column-oriented · huge scans', delay: 0.2 });
    body += chip(270, 250, 'point lookups', { icon: 'search', iconVar: '--accent', w: 160, delay: 0.6 });
    body += chip(270, 320, 'latency-critical', { icon: 'bolt', iconVar: '--amber', w: 174, delay: 0.75 });
    body += chip(770, 250, 'full scans', { icon: 'gauge', iconVar: '--green', w: 148, delay: 0.7 });
    body += chip(770, 320, 'throughput', { icon: 'layers', iconVar: '--violet', w: 148, delay: 0.85 });
    body += caption(VW / 2, 520, 'The same business facts, two opposite jobs — recording them vs analyzing them.', { delay: 1.1 });
    return assemble({ slug: 'oltp-vs-olap', aria: 'OLTP and OLAP as two opposite workloads', body, note: snap.note });
  }

  /* ── oltp: the normalized cluster ──────────────────────────────────────── */
  if (view === 'oltp') {
    body = oltpCluster(body);
    body += chip(760, 150, 'normalized (3NF)', { icon: 'check', iconVar: '--green', w: 186, delay: 1.0 });
    body += chip(760, 220, 'row-oriented', { icon: 'listOrdered', iconVar: '--accent', w: 160, delay: 1.1 });
    body += chip(760, 290, 'point lookup', { icon: 'search', iconVar: '--violet', w: 158, delay: 1.2 });
    body += caption(VW / 2, 545, 'Each fact stored once across small tables — a write touches one short row. Tuned for concurrent writes.', { delay: 1.4 });
    return assemble({ slug: 'oltp-vs-olap', aria: 'A normalized OLTP cluster of small tables', body, note: snap.note });
  }

  /* ── olap: the wide star ───────────────────────────────────────────────── */
  if (view === 'olap') {
    const r = olapStar(body);
    body = r.body;
    body += chip(VW / 2, 520, 'column-oriented · one join hop · scan-optimized', { icon: 'gauge', iconVar: '--green', w: 400, delay: 1.1 });
    body += caption(VW / 2, 558, 'Dimensions are wide and redundant on purpose — a report never has to chase a join.', { delay: 1.3 });
    return assemble({ slug: 'oltp-vs-olap', aria: 'A wide denormalized OLAP star schema', body, note: snap.note });
  }

  /* ── workload: a heavy scan contending on the OLTP store ───────────────── */
  if (view === 'workload') {
    body = oltpCluster(body);
    body += chip(770, 180, 'analytical SCAN', { icon: 'alert', iconVar: '--red', w: 190, delay: 0.95 });
    body += chip(770, 250, 'holds locks', { icon: 'alert', iconVar: '--red', w: 160, delay: 1.05 });
    body += chip(770, 320, 'I/O starved', { icon: 'alert', iconVar: '--red', w: 158, delay: 1.15 });
    body += caption(VW / 2, 545, 'A report scanning millions of rows locks the tables and floods the cache the live writes depend on.', { delay: 1.4 });
    return assemble({ slug: 'oltp-vs-olap', aria: 'An analytical scan contending with writes on the OLTP store', body, note: snap.note });
  }

  /* ── bridge: OLTP → ETL → OLAP ─────────────────────────────────────────── */
  if (view === 'bridge') {
    const oltp = tableCard(70, 220, { name: 'orders (OLTP)', icon: 'listOrdered', tone: 'accent', cols: ORDERS, w: 230, delay: 0 });
    const olap = tableCard(740, 200, { name: 'fact_sales (OLAP)', icon: 'database', tone: 'violet', cols: FACT, w: 230, delay: 0.3 });
    body += oltp.svg + olap.svg;
    body += band(360, 230, 320, 150, 'ETL / ELT', { sub: 'extract · transform · load', delay: 0.5 });
    body += connector({ x: oltp.right, y: oltp.rowCy(1), side: 'right' }, { x: 360, y: 305, side: 'left' }, { to: 'many', delay: 0.9 }).svg;
    body += connector({ x: 680, y: 305, side: 'right' }, { x: olap.left, y: olap.rowCy(1), side: 'left' }, { to: 'many', delay: 1.1 }).svg;
    body += chip(520, 420, 'refreshed copy · bounded staleness', { icon: 'clock', iconVar: '--amber', w: 320, delay: 1.3 });
    body += caption(VW / 2, 540, 'The pipeline reshapes normalized OLTP rows into the denormalized star — the warehouse is a periodic copy.', { delay: 1.5 });
    return assemble({ slug: 'oltp-vs-olap', aria: 'An ETL pipeline bridging OLTP and OLAP', body, note: snap.note });
  }

  /* ── recap fallback ────────────────────────────────────────────────────── */
  body += band(60, 110, 420, 340, 'OLTP', { sub: 'normalized · row-oriented · writes', delay: 0 });
  body += band(560, 110, 420, 340, 'OLAP', { sub: 'denormalized · column-oriented · scans', delay: 0.15 });
  body += chip(270, 230, 'system of record', { icon: 'database', iconVar: '--accent', w: 196, delay: 0.5 });
  body += chip(270, 310, 'point lookups', { icon: 'search', iconVar: '--violet', w: 160, delay: 0.6 });
  body += chip(770, 230, 'analytical copy', { icon: 'gauge', iconVar: '--green', w: 176, delay: 0.55 });
  body += chip(770, 310, 'huge scans', { icon: 'layers', iconVar: '--amber', w: 150, delay: 0.65 });
  body += connector({ x: 480, y: 280, side: 'right' }, { x: 560, y: 280, side: 'left' }, { to: 'many', label: 'ETL', delay: 0.9 }).svg;
  body += caption(VW / 2, 512, 'Normalize the record for writes; denormalize a copy into a star for reads — ETL bridges them.', { delay: 1.2 });
  return assemble({ slug: 'oltp-vs-olap', aria: 'OLTP and OLAP bridged by ETL', body, note: snap.note });
}
