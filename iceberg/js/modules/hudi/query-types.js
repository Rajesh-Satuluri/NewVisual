/* Apache Hudi — Query Types (reading/static) */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.HudiKit;

  function render(container) {
    K.injectStaticStyles();
    container.className = '';
    container.innerHTML = `
<div class="hst-page page-enter"><div class="hst-wrap">
  <h1 class="hst-h1">Query Types</h1>
  <p class="hst-lead">A Hudi table (especially Merge-on-Read) can be read in three ways. The choice trades <strong>freshness</strong>
    against <strong>read speed</strong> — you pick per query, not per table.</p>

  <div class="hst-tablewrap"><table class="hst-table">
    <thead><tr><th>Query type</th><th>What it reads</th><th>Trade-off</th></tr></thead>
    <tbody>
      <tr><td class="k">Snapshot</td><td>Base files <em>merged with</em> log files — the latest committed state, including un-compacted updates.</td><td>Freshest data; pays a read-time merge on MoR tables.</td></tr>
      <tr><td class="k">Read-optimized (RO)</td><td>Base (Parquet) files only — ignores un-compacted log files.</td><td>Fastest, pure columnar reads; may miss the very latest updates until compaction.</td></tr>
      <tr><td class="k">Incremental</td><td>Only records that changed between two instants.</td><td>Minimal work for downstream pipelines; not a full-table view.</td></tr>
    </tbody>
  </table></div>

  <div class="hst-sec">Snapshot vs Read-optimized on a MoR table</div>
  <div class="hst-code"><span class="c"># snapshot: base ⊕ logs (fresh, merges on read)</span>
<span class="k">SELECT</span> * <span class="k">FROM</span> orders_rt;        <span class="c"># _rt view = real-time / snapshot</span>

<span class="c"># read-optimized: base only (fast, may lag until compaction)</span>
<span class="k">SELECT</span> * <span class="k">FROM</span> orders_ro;        <span class="c"># _ro view = read-optimized</span></div>

  <div class="hst-note"><b>ShopKart:</b> dashboards that must show the newest order status use the <em>snapshot</em> (real-time) view;
    heavy analytical batch jobs use the <em>read-optimized</em> view for speed and rely on frequent compaction to keep it fresh.
    A Copy-on-Write table has no logs, so snapshot and read-optimized are effectively the same.</div>
</div></div>`;
  }

  TV.registerModule('hudi', {
    id: 'query-types', title: 'Query Types', group: 'read-ops', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
