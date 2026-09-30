/* Apache Hudi — Query Planner (reading/static) */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.HudiKit;

  function render(container) {
    K.injectStaticStyles();
    container.className = '';
    container.innerHTML = `
<div class="hst-page page-enter"><div class="hst-wrap">
  <h1 class="hst-h1">Query Planner</h1>
  <p class="hst-lead">A read whittles down how much data it touches in stages. Hudi leans on its <strong>metadata table</strong> to
    avoid slow storage listings, then prunes partitions and files by their statistics before reading anything.</p>

  <div class="hst-sec">Pruning pipeline — <code>WHERE country='BR' AND order_date='2026-09-06'</code></div>
  <div class="hst-code"><span class="c">stage                      candidates      technique</span>
list via metadata table    all partitions  <span class="k">no storage listing</span>
partition pruning          country=BR only  partition path filter
file/stats skipping        3 file groups    base-file min/max (col_stats)
read-optimized vs snapshot base ⊕ logs?     query type decides log merge
<span class="k">→ read 3 file slices</span>            (of thousands)   data actually scanned</div>

  <div class="hst-sec">What each stage uses</div>
  <div class="hst-grid">
    <div class="hst-card"><h3><span class="hst-ic">🗂</span>Metadata table</h3><p>The internal MoR table serves the file list and column stats directly — no expensive <code>LIST</code> calls against object storage.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">🧭</span>Partition pruning</h3><p>The partition path (e.g. <code>country=BR</code>) eliminates whole partitions that cannot match.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">📊</span>Column stats skipping</h3><p>Per-file min/max/null stats in the metadata table drop base files whose ranges can't satisfy the predicate.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">⚖️</span>Query type</h3><p>Read-optimized skips log merging for speed; snapshot merges logs for freshness — chosen per query.</p></div>
  </div>

  <div class="hst-note"><b>The metadata table is the big win at scale:</b> on object stores, listing millions of files is often the
    slowest part of planning. Serving the file list and stats from a compact internal table turns that into a fast lookup —
    the same idea Iceberg's manifests and Delta's checkpoints solve in their own ways.</div>
</div></div>`;
  }

  TV.registerModule('hudi', {
    id: 'query-planner', title: 'Query Planner', group: 'read-ops', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
