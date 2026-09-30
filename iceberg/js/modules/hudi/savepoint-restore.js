/* Apache Hudi — Savepoint & Restore (reading/static) */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.HudiKit;

  function render(container) {
    K.injectStaticStyles();
    container.className = '';
    container.innerHTML = `
<div class="hst-page page-enter"><div class="hst-wrap">
  <h1 class="hst-h1">Savepoint &amp; Restore</h1>
  <p class="hst-lead">Hudi's recovery tools. A <strong>savepoint</strong> pins an instant so cleaning never removes the files it needs;
    <strong>restore</strong> rolls the whole table back to a chosen instant; and <strong>markers</strong> let a failed write be rolled
    back cleanly. Together they make bad batches recoverable in minutes.</p>

  <div class="hst-sec">The three mechanisms</div>
  <div class="hst-grid">
    <div class="hst-card"><h3><span class="hst-ic">📌</span>Savepoint</h3><p>Marks an instant as protected. Cleaning will not delete the file slices that instant references — a guaranteed recovery point for compliance or risky migrations.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">↩️</span>Restore</h3><p>Rolls the entire table back to a savepoint or instant by undoing later commits — used to recover from a bad pipeline run.</p></div>
    <div class="hst-card"><h3><span class="hst-ic">🚩</span>Markers</h3><p>Track the data files a write is creating. If the write fails, its markers identify exactly which partial files to delete on rollback.</p></div>
  </div>

  <div class="hst-code"><span class="c"># pin a recovery point before a risky migration</span>
hudi-cli&gt; savepoint create --commit <span class="s">20260906090000</span>

<span class="c"># a bad batch shipped — roll the table back</span>
hudi-cli&gt; savepoint rollback --savepoint <span class="s">20260906090000</span>

<span class="c"># SQL restore to an instant</span>
<span class="k">CALL</span> restore_to_instant(table =&gt; <span class="s">'orders'</span>, instant =&gt; <span class="s">'20260906090000'</span>);</div>

  <div class="hst-sec">Savepoint/restore vs time travel</div>
  <div class="hst-note"><b>Time travel reads the past; restore changes the present.</b> A time-travel query views an old instant without
    moving the table head. Restore actually resets the table to that instant. Savepoints guarantee the target instant survives
    cleaning so a restore is always possible within your recovery window. <b>ShopKart</b> savepoints the pre-close instant every
    night, so a bad finance batch can be rolled back in minutes.</div>
</div></div>`;
  }

  TV.registerModule('hudi', {
    id: 'savepoint-restore', title: 'Savepoint & Restore', group: 'services', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
