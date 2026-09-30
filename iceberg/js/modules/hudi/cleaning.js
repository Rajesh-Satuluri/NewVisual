/* Apache Hudi — Cleaning (reading/static) */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.HudiKit;

  function render(container) {
    K.injectStaticStyles();
    container.className = '';
    container.innerHTML = `
<div class="hst-page page-enter"><div class="hst-wrap">
  <h1 class="hst-h1">Cleaning</h1>
  <p class="hst-lead">Every upsert, delete, and compaction leaves older <strong>file slices</strong> behind — that history is what powers
    time travel, rollback, and readers still mid-scan. <strong>Cleaning</strong> removes slices beyond the retention policy to
    reclaim storage, while keeping enough history to stay safe.</p>

  <div class="hst-code"><span class="c"># retain the last N commits' worth of file slices</span>
hoodie.cleaner.policy         = <span class="s">KEEP_LATEST_COMMITS</span>
hoodie.cleaner.commits.retained = <span class="s">10</span>

<span class="c"># or retain by wall-clock time</span>
hoodie.cleaner.policy = <span class="s">KEEP_LATEST_BY_HOURS</span>
hoodie.cleaner.hours.retained = <span class="s">72</span></div>

  <div class="hst-sec">Retention policies</div>
  <div class="hst-tablewrap"><table class="hst-table">
    <thead><tr><th>Policy</th><th>Keeps</th><th>Use when</th></tr></thead>
    <tbody>
      <tr><td class="k">KEEP_LATEST_COMMITS</td><td>File slices from the last N commits.</td><td>You reason about history in commits (most common).</td></tr>
      <tr><td class="k">KEEP_LATEST_BY_HOURS</td><td>Slices newer than N hours.</td><td>Time-bounded recovery / SLA windows.</td></tr>
      <tr><td class="k">KEEP_LATEST_FILE_VERSIONS</td><td>The last N versions of each file group.</td><td>Bounding storage per file group directly.</td></tr>
    </tbody>
  </table></div>

  <div class="hst-note"><b>The trade-off (same as VACUUM / expire_snapshots):</b> longer retention means deeper time travel and safer
    long-running readers, but more storage. Cleaning never removes a slice still referenced by a query within the window — set
    retention above your longest reader and your rollback needs.</div>
</div></div>`;
  }

  TV.registerModule('hudi', {
    id: 'cleaning', title: 'Cleaning', group: 'services', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
