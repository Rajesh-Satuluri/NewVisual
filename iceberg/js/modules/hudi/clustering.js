/* Apache Hudi — Clustering (reading/static) */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.HudiKit;

  function render(container) {
    K.injectStaticStyles();
    container.className = '';
    container.innerHTML = `
<div class="hst-page page-enter"><div class="hst-wrap">
  <h1 class="hst-h1">Clustering</h1>
  <p class="hst-lead">Clustering reorganizes data <em>without changing record values</em> — it rewrites file groups to improve layout:
    coalescing small files into right-sized ones and <strong>sorting/co-locating</strong> by chosen columns so queries skip more.</p>

  <div class="hst-code"><span class="c"># two goals, one service</span>
1. bin-pack     many small files  → fewer right-sized files
2. sort/z-order co-locate by cols → tighter min/max → better skipping

hoodie.clustering.plan.strategy.sort.columns = <span class="s">"country,order_date"</span></div>

  <div class="hst-sec">Clustering vs compaction</div>
  <div class="hst-tablewrap"><table class="hst-table">
    <thead><tr><th>Service</th><th>Purpose</th><th>Changes layout?</th></tr></thead>
    <tbody>
      <tr><td class="k">Compaction</td><td>Merge MoR log files into base files (materialize updates).</td><td>Same file groups, new base slice.</td></tr>
      <tr><td class="k">Clustering</td><td>Rewrite data into new file groups sorted/sized for better reads.</td><td>New file groups, data re-laid-out.</td></tr>
    </tbody>
  </table></div>

  <div class="hst-sec">How it runs</div>
  <div class="hst-grid">
    <div class="hst-card"><h3><span class="hst-ic">🗓</span>Scheduled</h3><p>A <code>replacecommit</code> plans which file groups to cluster; execution rewrites them and marks the old ones replaced.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">🧵</span>Inline or async</h3><p>Run alongside writes or as a separate job so ingestion latency isn't affected.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">🔎</span>Better skipping</h3><p>Sorting by frequently-filtered columns tightens per-file min/max ranges, so queries read fewer files.</p></div>
  </div>

  <div class="hst-note"><b>ShopKart:</b> orders arrive keyed by time, but analysts filter by <code>country</code> + <code>order_date</code>.
    Async clustering on those columns cut files scanned per dashboard query by ~80% without pausing ingestion.</div>
</div></div>`;
  }

  TV.registerModule('hudi', {
    id: 'clustering', title: 'Clustering', group: 'services', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
