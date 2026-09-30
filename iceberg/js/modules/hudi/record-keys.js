/* Apache Hudi — Keys & Precombine (reading/static) */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.HudiKit;

  function render(container) {
    K.injectStaticStyles();
    container.className = '';
    container.innerHTML = `
<div class="hst-page page-enter"><div class="hst-wrap">
  <h1 class="hst-h1">Keys &amp; Precombine</h1>
  <p class="hst-lead">Hudi is record-key centric — this is what makes upserts, deletes, and de-duplication first-class. Three write
    configs define a record's identity and how conflicts resolve.</p>

  <div class="hst-code"><span class="c"># the three that define identity + conflict resolution</span>
hoodie.datasource.write.<span class="k">recordkey</span>.field   = <span class="s">"order_id"</span>
hoodie.datasource.write.<span class="k">partitionpath</span>.field = <span class="s">"country"</span>
hoodie.datasource.write.<span class="k">precombine</span>.field  = <span class="s">"updated_at"</span></div>

  <div class="hst-sec">What each one does</div>
  <div class="hst-tablewrap"><table class="hst-table">
    <thead><tr><th>Config</th><th>Role</th><th>ShopKart example</th></tr></thead>
    <tbody>
      <tr><td class="k">recordkey.field</td><td>The primary key that uniquely identifies a record. Drives index lookups and upsert/delete targeting.</td><td><code>order_id</code> (or a composite <code>order_id,line_no</code>)</td></tr>
      <tr><td class="k">partitionpath.field</td><td>Determines the storage partition a record lands in. A record's key is unique within its partition.</td><td><code>country</code> → <code>country=BR/</code></td></tr>
      <tr><td class="k">precombine.field</td><td>Tie-breaker: when two records share a key in the same batch, the higher precombine value wins (last-writer-wins).</td><td><code>updated_at</code> timestamp</td></tr>
    </tbody>
  </table></div>

  <div class="hst-sec">Precombine in action</div>
  <p class="hst-lead" style="margin-bottom:12px">A CDC micro-batch contains two events for the same order. Hudi keeps only the one
    with the greater <code>updated_at</code> before writing — so the table never stores a stale duplicate.</p>
  <div class="hst-code"><span class="c"># incoming batch (same key ord_4410)</span>
{ order_id: ord_4410, status: SHIPPED,   updated_at: <span class="s">10:02:11</span> }
{ order_id: ord_4410, status: DELIVERED, updated_at: <span class="s">10:05:48</span> }   <span class="c">← wins</span>

<span class="c"># written record</span>
{ order_id: ord_4410, status: DELIVERED, updated_at: <span class="s">10:05:48</span> }</div>

  <div class="hst-note"><b>Why it matters:</b> correct keys + precombine give exactly-once-style semantics on ingest — the index
    finds the existing record, precombine resolves ordering, and the result is a clean upsert with no duplicates, even when the
    source delivers events out of order.</div>
</div></div>`;
  }

  TV.registerModule('hudi', {
    id: 'record-keys', title: 'Keys & Precombine', group: 'write-ops', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
