/* Apache Hudi — Concurrency (OCC), reading/static */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.HudiKit;

  function render(container) {
    K.injectStaticStyles();
    container.className = '';
    container.innerHTML = `
<div class="hst-page page-enter"><div class="hst-wrap">
  <h1 class="hst-h1">Concurrency (OCC)</h1>
  <p class="hst-lead">A single writer needs no locking — Hudi serializes its own actions on the timeline. For
    <strong>multiple concurrent writers</strong>, Hudi uses <strong>optimistic concurrency control</strong> with an external
    <strong>lock provider</strong> to guard the commit, so overlapping writes never corrupt the table.</p>

  <div class="hst-sec">How OCC resolves a conflict</div>
  <div class="hst-code"><span class="c">writer A and writer B both start from instant t7</span>
1. both write their data files (no lock held yet)
2. at commit, each takes the lock briefly
3. A commits t8  ✓
4. B checks: do my touched file groups overlap A's?
     no overlap  → B commits t9  ✓
     overlap     → <span class="k">abort</span> B (conflict) → retry</div>

  <div class="hst-sec">Lock providers</div>
  <div class="hst-tablewrap"><table class="hst-table">
    <thead><tr><th>Provider</th><th>Notes</th></tr></thead>
    <tbody>
      <tr><td class="k">Zookeeper</td><td>Common for on-prem/Hadoop clusters.</td></tr>
      <tr><td class="k">Hive Metastore</td><td>Reuses an existing HMS as the lock coordinator.</td></tr>
      <tr><td class="k">DynamoDB</td><td>Managed, serverless locking on AWS.</td></tr>
      <tr><td class="k">Filesystem</td><td>Simple lock file — for limited/testing setups.</td></tr>
    </tbody>
  </table></div>

  <div class="hst-note"><b>Single-writer is the happy path.</b> Because table services (compaction, clustering, cleaning) can run
    async, many pipelines keep <em>one</em> writer plus async services and avoid multi-writer locking entirely. Turn on OCC only
    when two independent jobs must write the same table concurrently — set
    <code>hoodie.write.concurrency.mode=optimistic_concurrency_control</code> and a lock provider.</div>
</div></div>`;
  }

  TV.registerModule('hudi', {
    id: 'concurrency', title: 'Concurrency (OCC)', group: 'services', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
