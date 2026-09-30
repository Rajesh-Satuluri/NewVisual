/* Apache Hudi — Architecture (reading/static, with layout diagram) */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.HudiKit;

  function render(container) {
    K.injectStaticStyles();
    container.className = '';
    container.innerHTML = `
<div class="hst-page page-enter"><div class="hst-wrap">
  <h1 class="hst-h1">Hudi Architecture</h1>
  <p class="hst-lead">A Hudi table is <strong>data files organized into file groups</strong> plus a <strong>timeline</strong> in
    <code>.hoodie/</code> that records every action. Records are routed to file groups by their key via an <strong>index</strong>,
    which is what makes upserts fast.</p>

  <div class="hst-sec">On-storage layout</div>
  <div class="hst-code"><span class="c">orders/                              # table root</span>
  <span class="t">.hoodie/</span>                            <span class="c"># the timeline (source of truth)</span>
    20260906090000.<span class="k">commit</span>            <span class="c"># completed instant</span>
    20260906091500.<span class="k">deltacommit</span>       <span class="c"># MoR log append</span>
    20260906093000.<span class="k">compaction</span>.requested
    <span class="t">metadata/</span>                        <span class="c"># internal MoR metadata table</span>
  country=BR/
    <span class="fn">fileId-a8f_</span>...<span class="s">.parquet</span>          <span class="c"># base file (file group a8f)</span>
    .<span class="fn">fileId-a8f_</span>...<span class="s">.log.1</span>          <span class="c"># avro log (same file group)</span>
  country=US/
    <span class="fn">fileId-3c2_</span>...<span class="s">.parquet</span></div>

  <div class="hst-sec">The building blocks</div>
  <div class="hst-grid">
    <div class="hst-card"><h3><span class="hst-ic">🕒</span>Timeline</h3><p>An ordered log of <em>instants</em> in <code>.hoodie/</code>. Each instant = action (commit / deltacommit / compaction / clean / rollback) + state (requested → inflight → completed) + a monotonic time.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">📦</span>File group</h3><p>A FileID grouping all versions of a set of records within a partition. Upserts to those keys always land in the same file group.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">🧩</span>File slice</h3><p>One version of a file group: a base Parquet file + any Avro log files written since the last compaction.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">🔑</span>Record key + index</h3><p>Every record has a key; the index maps keys → file groups so an upsert edits the right files instead of scanning everything.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">🗂</span>Metadata table</h3><p>An internal MoR Hudi table under <code>.hoodie/metadata</code> holding the file list, column stats, and record index — avoids slow storage listings.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">⚖️</span>Table type</h3><p>Copy-on-Write rewrites base files on write; Merge-on-Read appends log files and merges on read. Chosen per table.</p></div>
  </div>

  <div class="hst-note"><b>Read it top-down:</b> a reader consults the timeline for the latest completed instant, uses the
    metadata table to find the file slices, then reads base files (and merges log files for MoR). Writers append a new instant
    only after the data files are safely written — that atomic timeline transition is the commit.</div>
</div></div>`;
  }

  TV.registerModule('hudi', {
    id: 'architecture', title: 'Architecture', group: 'start', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
