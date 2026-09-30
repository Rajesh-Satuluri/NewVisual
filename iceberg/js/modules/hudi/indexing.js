/* Apache Hudi — Indexing (reading/static) */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.HudiKit;

  function render(container) {
    K.injectStaticStyles();
    container.className = '';
    container.innerHTML = `
<div class="hst-page page-enter"><div class="hst-wrap">
  <h1 class="hst-h1">Indexing</h1>
  <p class="hst-lead">The index is what makes Hudi upserts fast. It maps a <strong>record key → the file group that holds it</strong>,
    so a write updates the right files instead of scanning the whole table. This record-level index is Hudi's defining
    capability among open table formats.</p>

  <div class="hst-sec">How an upsert uses the index</div>
  <div class="hst-code"><span class="c">1.</span> incoming record  { order_id: ord_4410, ... }
<span class="c">2.</span> index probe       ord_4410  →  fileId a8f (country=BR)
<span class="c">3.</span> tag &amp; route      record tagged with fileId a8f
<span class="c">4.</span> write             update lands in file group a8f only</div>

  <div class="hst-sec">Index types</div>
  <div class="hst-tablewrap"><table class="hst-table">
    <thead><tr><th>Index</th><th>How it works</th><th>Best for</th></tr></thead>
    <tbody>
      <tr><td class="k">Bloom</td><td>Bloom filters stored in base-file footers; candidate files probed, then confirmed. Default for many setups.</td><td>Keys roughly ordered by time; general purpose</td></tr>
      <tr><td class="k">Simple</td><td>Joins incoming keys against keys read from storage — no filter, just a lookup.</td><td>Smaller tables or when Bloom upkeep isn't worth it</td></tr>
      <tr><td class="k">Bucket</td><td>Hashes keys into a fixed number of buckets (file groups) — O(1) routing, no probe.</td><td>High-throughput streaming with stable key cardinality</td></tr>
      <tr><td class="k">Record-level (RLI)</td><td>A dedicated partition of the metadata table maps every key → location. Fast, global, and scalable.</td><td>Large tables needing global uniqueness / fast upserts</td></tr>
      <tr><td class="k">HBase</td><td>External HBase holds the key → location map — global and low-latency, at the cost of a dependency.</td><td>Very large scale with an existing HBase</td></tr>
    </tbody>
  </table></div>

  <div class="hst-note"><b>Global vs non-global:</b> a non-global index enforces key uniqueness within a partition (fast); a
    global index enforces it across the whole table (needed when a record can change partitions). Record-level and HBase
    indexes are global; Bloom/simple are typically partition-scoped.</div>
</div></div>`;
  }

  TV.registerModule('hudi', {
    id: 'indexing', title: 'Indexing', group: 'read-ops', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
