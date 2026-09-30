/* Apache Hudi — Why Hudi? (reading/static) */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.HudiKit;

  function render(container) {
    K.injectStaticStyles();
    container.className = '';
    container.innerHTML = `
<div class="hst-page page-enter"><div class="hst-wrap">
  <h1 class="hst-h1">Why Apache Hudi?</h1>
  <p class="hst-lead">ShopKart ingests order changes from MySQL binlogs and Kafka every few minutes. The lake needs
    <strong>fast record-level upserts</strong>, <strong>efficient incremental pulls</strong>, and <strong>near-real-time
    freshness</strong> — the exact problems Apache Hudi was built for. Hudi is record-key centric: every row has a key, so
    updates and deletes target individual records instead of rewriting the world.</p>

  <div class="hst-sec">Problems Hudi solves</div>
  <div class="hst-grid">
    <div class="hst-card"><h3><span class="hst-ic">🔀</span>Streaming upserts</h3><p>MySQL/Kafka CDC lands as upserts keyed by order_id. Hudi finds and updates just the affected file groups via its index — no full rewrite.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">⏩</span>Incremental pulls</h3><p>Downstream jobs read only records changed since the last instant, instead of rescanning the whole table each run.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">⚡</span>Near-real-time</h3><p>Merge-on-Read appends cheap Avro log files so new data is queryable within minutes; compaction keeps reads fast later.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">🧹</span>Self-managing</h3><p>Built-in table services — compaction, clustering, cleaning — run inline or async to keep file sizes and history healthy.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">↩️</span>Recoverable</h3><p>The timeline plus savepoints let you roll back a bad batch or restore to an earlier instant.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">🔑</span>Primary keys</h3><p>First-class record keys and a precombine field give correct de-duplication and last-writer-wins semantics on ingest.</p></div>
  </div>

  <div class="hst-sec">Where Hudi fits among open table formats</div>
  <p class="hst-lead" style="margin-bottom:12px">All three (Hudi, Iceberg, Delta) add ACID, time travel, and schema evolution over
    columnar files. Hudi's center of gravity is <strong>record-level streaming ingestion</strong>: primary keys, pluggable
    indexes, and incremental queries are first-class rather than add-ons.</p>
  <div class="hst-note"><b>ShopKart:</b> the <code>orders</code> table takes ~5M CDC events every few minutes. As a
    Merge-on-Read Hudi table, those land as log appends (sub-minute), while an async compaction keeps analytical reads fast —
    and analysts pull only the day's changed orders via an incremental query.</div>
</div></div>`;
  }

  TV.registerModule('hudi', {
    id: 'why-hudi', title: 'Why Hudi?', group: 'start', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
