/* Apache Hudi — Incremental Query (reading/static) */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.HudiKit;

  function render(container) {
    K.injectStaticStyles();
    container.className = '';
    container.innerHTML = `
<div class="hst-page page-enter"><div class="hst-wrap">
  <h1 class="hst-h1">Incremental Query</h1>
  <p class="hst-lead">Hudi's signature capability: read <strong>only the records that changed</strong> between two instants, instead
    of rescanning the whole table. Downstream pipelines become efficient and near-real-time — process just the delta each run.</p>

  <div class="hst-code"><span class="c">-- read everything that changed after instant t2, up to t4</span>
spark.<span class="fn">read</span>.<span class="fn">format</span>(<span class="s">"hudi"</span>)
  .<span class="fn">option</span>(<span class="s">"hoodie.datasource.query.type"</span>, <span class="s">"incremental"</span>)
  .<span class="fn">option</span>(<span class="s">"hoodie.datasource.read.begin.instanttime"</span>, <span class="s">"t2"</span>)
  .<span class="fn">option</span>(<span class="s">"hoodie.datasource.read.end.instanttime"</span>,   <span class="s">"t4"</span>)
  .<span class="fn">load</span>(path)</div>

  <div class="hst-sec">Full scan vs incremental</div>
  <div class="hst-tablewrap"><table class="hst-table">
    <thead><tr><th>Instant</th><th>Table has</th><th>Incremental (t2 → t4) returns</th></tr></thead>
    <tbody>
      <tr><td class="k">t1</td><td>10.0M orders (base load)</td><td>—</td></tr>
      <tr><td class="k">t2</td><td>+120K upserts</td><td>begin (exclusive)</td></tr>
      <tr><td class="k">t3</td><td>+95K upserts</td><td>95K changed records</td></tr>
      <tr><td class="k">t4</td><td>+110K upserts</td><td>110K changed records</td></tr>
      <tr><td class="k" style="color:#34d399">total</td><td>10.3M+ orders</td><td><b style="color:#34d399">205K</b> records read — not 10.3M</td></tr>
    </tbody>
  </table></div>

  <div class="hst-sec">Why it's powerful</div>
  <div class="hst-grid">
    <div class="hst-card"><h3><span class="hst-ic">⏩</span>Cheap downstream ETL</h3><p>Materialized views and marts apply only the change set each run — no nightly full rebuilds.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">🔁</span>Replication</h3><p>Mirror just the changes to a search index, cache, or warehouse, keeping them fresh with minimal work.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">⏱</span>Exactly-once chaining</h3><p>Each run records the last instant it consumed, so the next run resumes precisely where it left off.</p></div>
  </div>

  <div class="hst-note"><b>ShopKart:</b> the fraud-scoring pipeline reads <code>orders</code> incrementally every few minutes — scoring the
    ~200K changed orders since its last checkpoint instead of the full 10M+ table, cutting cost and latency dramatically.</div>
</div></div>`;
  }

  TV.registerModule('hudi', {
    id: 'incremental-query', title: 'Incremental Query', group: 'read-ops', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
