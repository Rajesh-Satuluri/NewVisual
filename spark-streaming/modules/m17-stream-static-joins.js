// M17 · Stream–Static Joins — Joins  (no engine: enrichment lookup demo)
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock, esc } from './_mod-ui.js';

export const IQ = [
  { q: 'What is a stream-static join and when do you use it?', a: '<p>Joining a <b>streaming</b> DataFrame to a <b>static</b> (batch) DataFrame — typically to <b>enrich</b> each streaming row with reference/dimension data: look up a product\'s category/price from a product table, a user\'s segment from a profile table, a store\'s region, etc. The stream drives output; the static side is a lookup table. It\'s the most common join in practice because enrichment is everywhere.</p>', tip: 'Stream ⋈ static table = enrichment/dimension lookup. The stream drives; the static side is reference data.' },
  { q: 'Does a stream-static join hold state or need a watermark?', a: '<p><b>No</b> to both. There\'s <b>no streaming state buffered</b> for the static side and <b>no watermark</b> required — each streaming row is matched against the current static table and emitted. This makes stream-static joins <b>cheap and simple</b> compared to stream-stream joins, which must buffer both sides. It\'s essentially a per-batch lookup.</p>', tip: 'No state, no watermark — just a per-batch lookup. Much lighter than stream-stream.' },
  { q: 'How often is the static side read, and is it refreshed?', a: '<p>The static DataFrame is <b>re-read per micro-batch</b> (or served from cache). If the underlying table <b>changes</b>, whether the stream sees the change depends on caching/the source: an uncached file/Delta source is re-read each batch so updates are picked up; a <code>.cache()</code>d DataFrame is frozen until refreshed. For reliably-fresh dimensions, read an uncached <b>Delta</b> table (each batch sees the latest snapshot) or periodically unpersist/reload.</p>', tip: 'Re-read per batch (or cached). Uncached Delta → sees updates; cached → frozen until refresh. Know the caching behavior.' },
  { q: 'Which join types are supported for stream-static?', a: '<p>The <b>stream side must be preserved</b>, so: <b>inner</b>, and <b>left outer</b> when the <b>stream is on the left</b> (stream ⟕ static) — unmatched stream rows pass with nulls. You <b>cannot</b> right/full outer in a way that would require emitting unmatched <i>static</i> rows (the stream is unbounded; there\'s no "end" at which to emit static-only rows). So: inner, or left-outer with the stream on the left.</p>', tip: 'Inner, or left-outer with stream on the LEFT. Can\'t emit unmatched static-only rows (stream never ends).' },
  { q: 'Why is a broadcast join especially relevant here?', a: '<p>Dimension tables are often <b>small</b>, so Spark can <b>broadcast</b> the static side to every executor, turning the join into a <b>local hash lookup</b> with <b>no shuffle</b> — very fast. For small-enough static tables this happens automatically (or via <code>broadcast()</code>). Broadcasting the dimension is the standard optimization for enrichment joins (M20).</p>', tip: 'Small static table → broadcast → no-shuffle local lookup. The go-to optimization for enrichment.' },
  { q: 'What happens to in-flight data if the static table is updated mid-stream?', a: '<p>With an <b>uncached</b> re-read source, the <b>next batch</b> uses the updated table — so a product price change takes effect from that batch forward (older batches already emitted with the old value). There\'s <b>no re-processing</b> of already-emitted stream rows. If you need a specific as-of version, join against a <b>time-versioned</b> source (e.g. Delta time travel) rather than "latest."</p>', tip: 'Update visible next batch forward; no reprocessing of past rows. Need as-of semantics → versioned/time-travel source.' },
  { q: 'Stream-static vs stream-stream — summarize the trade-offs.', a: '<p><b>Stream-static</b>: no state, no watermark, cheap, re-read/broadcast dimension, inner/left-outer only — for <b>enrichment</b>. <b>Stream-stream</b>: both sides buffered in state, requires time bound + watermark, heavy, supports more outer variants — for <b>correlating two live streams</b>. Reach for stream-static whenever one side is reference data; reserve stream-stream for genuine two-stream correlation (M18).</p>', tip: 'Static = cheap enrichment (no state). Stream-stream = heavy correlation (dual state + watermark). Pick by what the second side is.' },
  { q: 'Can you join a stream to the result of a batch aggregation?', a: '<p>Yes — compute a <b>static</b> aggregate (e.g. per-category average price, a precomputed model table) as a batch DataFrame and join the stream to it. It behaves like any static side: re-read per batch, broadcastable, no watermark. A common pattern for <b>scoring/enrichment</b> with precomputed features. If the aggregate must stay live, you\'d instead need a stream-stream or a periodic refresh.</p>', tip: 'Stream ⋈ batch-aggregate/feature table = static join. Precomputed features/scoring pattern; refresh periodically if needed.' },
  { q: 'What are common pitfalls with stream-static joins?', a: '<p>(1) <b>Caching the static side</b> and expecting live updates (it\'s frozen). (2) Expecting <b>right/full outer</b> to emit unmatched static rows (unsupported). (3) A <b>large, non-broadcast</b> static table causing a shuffle every batch (slow) — broadcast or pre-filter it. (4) Assuming already-emitted rows get <b>re-enriched</b> when the table changes (they don\'t). Know these and enrichment joins are trivial and fast.</p>', tip: 'Cached-frozen, unsupported outer, big non-broadcast shuffle, no retro re-enrichment. Avoid these four.' },
  { q: 'How does a broadcast stream-static join avoid a shuffle?', a: '<p>Spark ships a <b>copy of the small static table to every executor</b> and builds a local hash map keyed by the join key. Each streaming partition then looks up matches <b>locally</b> — no data movement across the network for the join. Contrast with a shuffle (sort-merge) join, which repartitions both sides by key every batch. Broadcast is why enrichment against a small dimension is nearly free.</p>', tip: 'Broadcast = static table copied to all executors → local hash lookup, zero shuffle. Nearly free for small dims.' },
];

// Static product dimension (lookup table).
const PRODUCTS = {
  'p-100': { name: 'Wireless Mouse', category: 'electronics', price: 24.99 },
  'p-200': { name: 'Yoga Mat', category: 'fitness', price: 39.00 },
  'p-300': { name: 'Coffee Beans 1kg', category: 'grocery', price: 18.50 },
  'p-400': { name: 'Desk Lamp', category: 'home', price: 45.00 },
};
// Streaming orders (some reference an unknown product -> left-outer null).
const ORDERS = [
  { id: 'o1', product_id: 'p-100', qty: 2 },
  { id: 'o2', product_id: 'p-300', qty: 1 },
  { id: 'o3', product_id: 'p-999', qty: 1 }, // unknown product
  { id: 'o4', product_id: 'p-200', qty: 3 },
  { id: 'o5', product_id: 'p-400', qty: 1 },
];

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p>A <b>stream-static join</b> enriches each streaming row with <b>reference data</b> from a static table — the single most common join in real pipelines. Orders get their product category and price; clicks get the user's segment; transactions get the store's region.</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>🪶 No state, no watermark</h4><p>Nothing is buffered for the static side and no watermark is needed — each streaming row is matched against the current table and emitted. Cheap and simple.</p></div>
      <div class="ss-card"><h4>🔁 Re-read per batch</h4><p>The static side is read (or cached) each micro-batch. Uncached Delta → updates picked up next batch; <code>.cache()</code>d → frozen until refreshed.</p></div>
      <div class="ss-card"><h4>📡 Broadcast the dimension</h4><p>Small static tables are <b>broadcast</b> to every executor → a local hash lookup, <b>no shuffle</b>. The standard enrichment optimization.</p></div>
      <div class="ss-card"><h4>↩️ Inner / left-outer only</h4><p>The stream side is preserved: <b>inner</b>, or <b>left-outer with the stream on the left</b>. You can't emit unmatched <i>static</i> rows — the stream never ends.</p></div>
    </div>
    <h3>Updates take effect going forward</h3>
    <p>If the dimension changes mid-stream (uncached source), the <b>next batch</b> uses the new values — already-emitted rows are <b>not re-enriched</b>. For as-of-a-version semantics, join against a <b>time-versioned</b> source (Delta time travel) instead of "latest."</p>
    <div class="ss-callout"><b>vs stream-stream (M18):</b> stream-static holds <b>no state</b> and needs <b>no watermark</b> — it's a per-batch lookup. Reserve the heavy, dual-buffered stream-stream join for correlating two genuine live streams.</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>Each streaming <b>order</b> is looked up against the static <b>product dimension</b> and enriched with category + price. Toggle the join type: <b>inner</b> drops the unknown product; <b>left-outer</b> keeps it with null enrichment. Change a product's price to see that <b>future</b> orders pick it up.</p></div>
  <div class="ss-controls">
    <button class="ss-btn primary" id="m17-step">Next order ▶</button>
    <button class="ss-btn" id="m17-reset">⟲ Reset</button>
    <label style="font-size:12.5px;color:var(--text-secondary);margin-left:8px">Join:
      <select id="m17-type" class="ss-btn" style="margin-left:4px">
        <option value="inner">inner</option><option value="leftOuter">left outer</option>
      </select></label>
    <label style="font-size:12.5px;color:var(--text-secondary)">Update p-100 price:
      <input type="range" id="m17-price" min="10" max="60" step="1" value="25" style="vertical-align:middle">
      <span id="m17-price-v" style="font-family:var(--font-mono)">$25</span></label>
  </div>
  <div class="ss-grid" style="grid-template-columns:1fr 1fr">
    <div class="ss-card"><h4>📦 Static product dimension</h4><div id="m17-dim"></div></div>
    <div class="ss-card"><h4>🌊 Enriched output stream</h4><div id="m17-out"></div></div>
  </div>
  <div class="ss-callout" id="m17-expl">Press <b>Next order ▶</b> to stream orders through the enrichment join.</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream enriches every order</h3>
    <p>ShopStream's order stream carries only <code>product_id</code> and <code>qty</code>. To compute revenue-by-category, each order is <b>joined to a static product table</b> (≈50k products) to pull <code>category</code> and <code>price</code>. The table is small enough to <b>broadcast</b>, so enrichment is a local hash lookup with <b>no shuffle</b> — it adds negligible latency to the 10-second batches.</p>
    <p>The product table is a <b>Delta table</b> read <b>uncached</b>, so when merchandising changes a price at 2pm, orders from the <b>2pm batch onward</b> use the new price automatically — no restart, no reprocessing of earlier orders. For an occasional order referencing a <b>just-created</b> product not yet in the dimension, a <b>left-outer</b> join keeps the order (null category) rather than dropping revenue, and a nightly backfill fixes the category.</p>
    <div class="ss-callout">Because it's a stream-static join, there's <b>no watermark and no join state</b> to tune — all the reliability work (checkpoint, exactly-once) comes from the sink, not the join.</div>
  </div>`;

  const code = `
  ${codeBlock('PySpark', `# Static dimension (Delta, UNCACHED so price updates are picked up each batch)
products = spark.read.format("delta").load("/lake/dim/products")  # product_id, category, price

orders = spark.readStream.format("kafka").option("subscribe", "orders").load()
orders = parse(orders)   # product_id, qty, event_time

# Broadcast enrichment join — no state, no watermark, no shuffle
from pyspark.sql.functions import broadcast, col
enriched = (orders.join(broadcast(products), "product_id", "left")   # left-outer keeps unknown products
    .withColumn("revenue", col("qty") * col("price")))

revenue = enriched.groupBy("category").agg(sum("revenue").alias("rev"))`)}
  ${codeBlock('Scala', `val products = spark.read.format("delta").load("/lake/dim/products")

val enriched = orders.join(broadcast(products), Seq("product_id"), "left")
  .withColumn("revenue", $"qty" * $"price")`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M17 · Joins',
    title: 'Stream–Static Joins',
    subtitle: 'Enriching a stream with a reference table — no state, no watermark',
    definition: {
      formal: 'A stream-static join matches each row of a streaming DataFrame against a static (batch) DataFrame, typically to enrich streaming records with reference/dimension data. It buffers no streaming state and requires no watermark; the static side is re-read per micro-batch (or cached) and, when small, broadcast to executors for a shuffle-free local lookup. Supported types preserve the stream side: inner, and left-outer with the stream on the left.',
      easy: 'This is a lookup: every streaming record gets extra columns pulled from a reference table — an order gets its product\'s category and price. It\'s cheap because nothing is remembered between batches and no watermark is needed; the small table is copied to every worker for a fast local match. If you change the table, new records use the new values, but already-processed ones aren\'t redone.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '🔗 Enrichment Lookup', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const dimEl = container.querySelector('#m17-dim');
  const outEl = container.querySelector('#m17-out');
  const typeSel = container.querySelector('#m17-type');
  const price = container.querySelector('#m17-price'), priceV = container.querySelector('#m17-price-v');
  const explEl = container.querySelector('#m17-expl');
  let cursor = -1;

  function currentProducts() {
    const p = JSON.parse(JSON.stringify(PRODUCTS));
    p['p-100'].price = +price.value; // live edit of the dimension
    return p;
  }

  function renderDim() {
    const p = currentProducts();
    dimEl.innerHTML = `<table class="ss-tbl"><thead><tr><th>product_id</th><th>category</th><th>price</th></tr></thead><tbody>${
      Object.entries(p).map(([id, v]) => `<tr${id === 'p-100' ? ' class="new"' : ''}><td>${esc(id)}</td><td>${esc(v.category)}</td><td>$${v.price.toFixed(2)}</td></tr>`).join('')
    }</tbody></table>`;
  }

  function render() {
    priceV.textContent = '$' + price.value;
    renderDim();
    const p = currentProducts();
    const rows = [];
    for (let i = 0; i <= cursor; i++) {
      const o = ORDERS[i];
      const prod = p[o.product_id];
      if (!prod && typeSel.value === 'inner') continue; // inner drops unmatched
      const cat = prod ? prod.category : '∅ null';
      const rev = prod ? (o.qty * prod.price).toFixed(2) : '—';
      rows.push({ id: o.id, pid: o.product_id, cat, rev, miss: !prod });
    }
    outEl.innerHTML = rows.length
      ? `<table class="ss-tbl"><thead><tr><th>order</th><th>product</th><th>category</th><th>revenue</th></tr></thead><tbody>${
          rows.map((r, i) => `<tr${i === rows.length - 1 ? ' class="new"' : ''}><td>${esc(r.id)}</td><td>${esc(r.pid)}</td><td style="${r.miss ? 'color:var(--yellow,#F59E0B)' : ''}">${esc(r.cat)}</td><td>${r.rev === '—' ? '—' : '$' + r.rev}</td></tr>`).join('')
        }</tbody></table>`
      : '<div style="color:var(--text-muted);font-size:12px;padding:6px">— no output yet —</div>';

    if (cursor < 0) { explEl.innerHTML = 'Press <b>Next order ▶</b> to stream orders through the enrichment join.'; return; }
    const o = ORDERS[cursor];
    const prod = p[o.product_id];
    explEl.innerHTML = prod
      ? `<b>Order ${esc(o.id)}</b> looked up <code>${esc(o.product_id)}</code> → enriched with <b>${esc(prod.category)}</b> @ $${prod.price.toFixed(2)}, revenue = ${o.qty} × $${prod.price.toFixed(2)} = <b>$${(o.qty * prod.price).toFixed(2)}</b>. No state kept; pure per-batch lookup.`
      : (typeSel.value === 'inner'
          ? `<b>Order ${esc(o.id)}</b> references unknown <code>${esc(o.product_id)}</code> — <b>inner</b> join <b>drops it</b> (lost revenue!). A left-outer would keep it.`
          : `<b>Order ${esc(o.id)}</b> references unknown <code>${esc(o.product_id)}</code> — <b>left-outer</b> keeps it with <b>null</b> category, so no revenue is silently dropped; a backfill fixes the category later.`);
  }

  container.querySelector('#m17-step').addEventListener('click', () => { if (cursor < ORDERS.length - 1) { cursor++; render(); } });
  container.querySelector('#m17-reset').addEventListener('click', () => { cursor = -1; render(); });
  typeSel.addEventListener('change', render);
  price.addEventListener('input', render);
  render();
}

export default { mount };
