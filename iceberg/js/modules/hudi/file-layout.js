/* Apache Hudi — File Groups & Slices (reading/static) */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.HudiKit;

  function render(container) {
    K.injectStaticStyles();
    container.className = '';
    container.innerHTML = `
<div class="hst-page page-enter"><div class="hst-wrap">
  <h1 class="hst-h1">File Groups &amp; Slices</h1>
  <p class="hst-lead">Hudi organizes a partition's data into <strong>file groups</strong>. A file group holds every version
    (<strong>file slice</strong>) of a set of records, identified by a stable <code>FileID</code>. This structure is what lets
    upserts always land in the same place and lets Merge-on-Read append cheaply.</p>

  <div class="hst-sec">One file group over time (MoR)</div>
  <div class="hst-code"><span class="c">file group  fileId = a8f… (partition country=BR)</span>

  slice @ t1:  base_a8f_t1<span class="s">.parquet</span>
  slice @ t2:  base_a8f_t1<span class="s">.parquet</span>  + .a8f_t2<span class="s">.log.1</span>        <span class="c"># deltacommit</span>
  slice @ t3:  base_a8f_t1<span class="s">.parquet</span>  + .a8f_t2<span class="s">.log.1</span> + .log.2
  slice @ t4:  base_a8f_t4<span class="s">.parquet</span>                       <span class="c"># compaction → new base</span></div>

  <div class="hst-sec">The pieces</div>
  <div class="hst-grid">
    <div class="hst-card"><h3><span class="hst-ic">📦</span>File group</h3><p>All versions of a record set within a partition, keyed by a stable FileID. Upserts to those keys always target this group.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">🧩</span>File slice</h3><p>One version of a group at an instant: a base file plus the log files written against it since the last compaction.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">🗄</span>Base file</h3><p>Columnar Parquet — the compacted, read-optimized bulk of the records.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">🧾</span>Log file</h3><p>Row-oriented Avro deltas (MoR only) holding updates/deletes, merged with the base on read until compaction.</p></div>
  </div>

  <div class="hst-note"><b>Why it matters:</b> because a record's key maps to a single file group, Hudi rewrites or appends to a
    bounded set of files per write — never the whole table. Compaction turns a base+logs slice back into a clean base file,
    keeping reads fast. (A Copy-on-Write table simply has no log files — each write produces a new base slice directly.)</div>
</div></div>`;
  }

  TV.registerModule('hudi', {
    id: 'file-layout', title: 'File Groups & Slices', group: 'read-ops', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
