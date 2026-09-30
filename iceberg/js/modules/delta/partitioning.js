/* Delta Lake — Partitioning & Generated Columns (reading, static) */
(function () {
  'use strict';
  const TV = window.TableViz;
  function html() {
    return `
<style>
.dp { height:100%; overflow-y:auto; padding:30px 32px 60px; }
.dp-wrap { max-width:880px; margin:0 auto; }
.dp-h1 { font-size:24px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin-bottom:8px; }
.dp-lead { font-size:14px; color:var(--text-secondary); line-height:1.7; margin-bottom:24px; }
.dp-sec { font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--brand); margin:26px 0 10px; }
.dp-cols { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media (max-width:720px){ .dp-cols{grid-template-columns:1fr;} }
.dp-card { background:var(--bg-2); border:1px solid var(--border-default); border-radius:var(--radius-lg); padding:16px 18px; }
.dp-card h3 { font-size:14px; font-weight:700; color:var(--text-primary); margin-bottom:8px; }
.dp-card p { font-size:12.5px; color:var(--text-secondary); line-height:1.6; }
.dp-tree { font-family:var(--font-mono); font-size:11.5px; line-height:1.7; color:var(--text-secondary); background:var(--code-bg); border:1px solid var(--border-default); border-radius:10px; padding:14px 16px; white-space:pre; overflow-x:auto; }
.dp-tree .d { color:var(--brand); } .dp-tree .f { color:var(--text-muted); }
.dp-code { font-family:var(--font-mono); font-size:12px; line-height:1.7; color:var(--text-secondary); background:var(--code-bg); border:1px solid var(--border-default); border-radius:10px; padding:14px 16px; white-space:pre; overflow-x:auto; }
.dp-code .k { color:var(--brand); font-weight:600; } .dp-code .c { color:var(--text-muted); }
.dp-callout { margin-top:18px; padding:12px 14px; background:var(--bg-1); border-left:3px solid var(--yellow); border-radius:8px; font-size:12.5px; color:var(--text-secondary); line-height:1.6; }
.dp-callout b { color:var(--text-primary); }
</style>
<div class="dp page-enter">
  <div class="dp-wrap">
    <h1 class="dp-h1">Partitioning & Generated Columns</h1>
    <p class="dp-lead">Partitioning physically groups a table’s files by a column’s value so queries can prune whole partitions.
      It’s the oldest data-skipping lever — powerful when the column is low-cardinality and matches how you filter, and harmful
      when it isn’t.</p>

    <div class="dp-sec">Physical layout</div>
    <div class="dp-cols">
      <div class="dp-tree"><span class="d">orders/</span>
├─ <span class="d">country=BR/</span>
│    ├─ <span class="f">part-0007.parquet</span>
│    └─ <span class="f">part-0051.parquet</span>
├─ <span class="d">country=US/</span>
│    └─ <span class="f">part-0002.parquet</span>
└─ <span class="d">country=IN/</span>
     └─ <span class="f">part-0009.parquet</span></div>
      <div class="dp-card">
        <h3>Partition pruning</h3>
        <p>A query with <code>WHERE country='BR'</code> reads only the <code>country=BR</code> directory — every other partition is
          eliminated before any file is opened. Delta records partition values in each <code>add</code> action, so pruning works
          even without directory listing.</p>
      </div>
    </div>

    <div class="dp-sec">Generated columns</div>
    <div class="dp-cols">
      <div class="dp-code"><span class="k">CREATE TABLE</span> orders (
  order_ts <span class="k">TIMESTAMP</span>,
  order_date <span class="k">DATE</span> <span class="k">GENERATED ALWAYS AS</span>
    (<span class="k">CAST</span>(order_ts <span class="k">AS DATE</span>))
) <span class="k">USING</span> DELTA
<span class="k">PARTITIONED BY</span> (order_date);</div>
      <div class="dp-card">
        <h3>Derive the partition</h3>
        <p>A generated column computes the partition value from another column. Delta both populates it on write and uses the
          generation expression to prune: a filter on <code>order_ts</code> is automatically translated into a filter on the
          <code>order_date</code> partition. No more manually maintained date columns.</p>
      </div>
    </div>

    <div class="dp-callout"><b>The over-partitioning trap.</b> Partitioning on a high-cardinality column (e.g. <code>order_id</code>
      or <code>customer_id</code>) creates millions of tiny directories and files — the exact “small files” problem that slowed
      ShopKart’s dashboards. When your access patterns don’t fit a single low-cardinality partition column, reach for
      <b>Liquid Clustering</b> instead.</div>
  </div>
</div>`;
  }
  TV.registerModule('delta', {
    id: 'partitioning', title: 'Partitioning', group: 'log', format: 'delta',
    render(container) { container.className = ''; container.innerHTML = html(); },
    destroy() { TV.AnimationControls.hide(); },
  });
})();
