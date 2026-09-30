/* Apache Hudi — Metadata Table (reading/static) */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.HudiKit;

  function render(container) {
    K.injectStaticStyles();
    container.className = '';
    container.innerHTML = `
<div class="hst-page page-enter"><div class="hst-wrap">
  <h1 class="hst-h1">Metadata Table</h1>
  <p class="hst-lead">Listing millions of files on object storage is slow. Hudi keeps an <strong>internal Merge-on-Read table</strong>
    under <code>.hoodie/metadata</code> that serves the file list, column stats, bloom filters, and a record index — so planning
    is a fast lookup instead of a storage crawl.</p>

  <div class="hst-code"><span class="c">.hoodie/metadata/   (an internal MoR Hudi table)</span>
  <span class="k">files</span>            partition → file list (no LIST calls)
  <span class="k">column_stats</span>     per-file min/max/null for skipping
  <span class="k">bloom_filters</span>    per-file bloom filters for the index
  <span class="k">record_index</span>     record key → file group (RLI)</span></div>

  <div class="hst-sec">The partitions it holds</div>
  <div class="hst-grid">
    <div class="hst-card"><h3><span class="hst-ic">🗂</span>files</h3><p>The authoritative file list per partition — replaces expensive object-store listings during planning.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">📊</span>column_stats</h3><p>Per-file min/max/null counts that drive data skipping without opening the files.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">🌸</span>bloom_filters</h3><p>Centralized bloom filters so the Bloom index probes candidates without reading base-file footers.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">🔑</span>record_index</h3><p>The record-level index: key → file group, giving fast global upsert routing at scale.</p></div>
  </div>

  <div class="hst-note"><b>It's a Hudi table itself:</b> the metadata table is Merge-on-Read, so updates to it are cheap log appends
    compacted over time — the same mechanics as the data table. Enable it with
    <code>hoodie.metadata.enable=true</code> (default on modern versions).</div>
</div></div>`;
  }

  TV.registerModule('hudi', {
    id: 'metadata-table', title: 'Metadata Table', group: 'services', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
