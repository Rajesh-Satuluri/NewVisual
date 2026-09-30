/* Delta Lake — Change Data Feed (reading/static) */
(function () {
  'use strict';
  const TV = window.TableViz;
  const ROWS = [
    { id: 'ord_5521', amt: '420.00', t: 'insert', v: 848, cls: 'ins' },
    { id: 'ord_4410', amt: '180.00 → 198.00', t: 'update_preimage / postimage', v: 849, cls: 'upd' },
    { id: 'ord_3277', amt: '95.00', t: 'delete', v: 849, cls: 'del' },
  ];
  function html() {
    const rows = ROWS.map(r =>
      `<tr><td class="m">${r.id}</td><td class="m">${r.amt}</td><td><span class="dcf-t ${r.cls}">${r.t}</span></td><td class="m">${r.v}</td></tr>`).join('');
    return `
<style>
.dcf { height:100%; overflow-y:auto; padding:30px 32px 60px; }
.dcf-wrap { max-width:880px; margin:0 auto; }
.dcf-h1 { font-size:24px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin-bottom:8px; }
.dcf-lead { font-size:14px; color:var(--text-secondary); line-height:1.7; margin-bottom:20px; }
.dcf-code { font-family:var(--font-mono); font-size:12px; line-height:1.7; color:var(--text-secondary); background:var(--code-bg); border:1px solid var(--border-default); border-radius:10px; padding:14px 16px; white-space:pre; overflow-x:auto; margin-bottom:20px; }
.dcf-code .k { color:var(--brand); font-weight:600; } .dcf-code .c { color:var(--text-muted); } .dcf-code .s { color:var(--orange); }
.dcf-sec { font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--brand); margin:22px 0 10px; }
.dcf-tablewrap { overflow-x:auto; margin-bottom:20px; }
.dcf-table { width:100%; border-collapse:collapse; font-size:12.5px; min-width:520px; }
.dcf-table th, .dcf-table td { text-align:left; padding:9px 12px; border-bottom:1px solid var(--border-default); }
.dcf-table th { font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); font-weight:800; }
.dcf-table td.m { font-family:var(--font-mono); font-size:11px; color:var(--text-secondary); }
.dcf-t { font-size:9.5px; font-weight:800; text-transform:uppercase; letter-spacing:.03em; padding:2px 8px; border-radius:999px; }
.dcf-t.ins{background:var(--green-subtle);color:var(--green);} .dcf-t.upd{background:var(--yellow-subtle);color:var(--yellow);} .dcf-t.del{background:var(--red-subtle);color:var(--red);}
.dcf-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; }
.dcf-card { background:var(--bg-2); border:1px solid var(--border-default); border-radius:var(--radius-lg); padding:16px; }
.dcf-card h3 { font-size:13.5px; font-weight:700; color:var(--text-primary); margin-bottom:6px; }
.dcf-card p { font-size:12px; color:var(--text-secondary); line-height:1.55; }
</style>
<div class="dcf page-enter">
  <div class="dcf-wrap">
    <h1 class="dcf-h1">Change Data Feed (CDF)</h1>
    <p class="dcf-lead">CDF makes Delta emit <em>row-level</em> changes between versions — inserts, deletes, and both the before and
      after image of updates. Downstream jobs read just what changed instead of recomputing the whole table, powering incremental
      ETL, materialized views, and replication out of ShopKart’s <code>orders</code> table.</p>

    <div class="dcf-code"><span class="c">-- enable once</span>
<span class="k">ALTER TABLE</span> orders <span class="k">SET TBLPROPERTIES</span> (<span class="s">'delta.enableChangeDataFeed'</span> = <span class="s">'true'</span>);

<span class="c">-- read only what changed between versions 847 and 849</span>
<span class="k">SELECT</span> * <span class="k">FROM</span> table_changes(<span class="s">'orders'</span>, 847, 849);
spark.<span class="k">read</span>.<span class="k">option</span>(<span class="s">"readChangeFeed"</span>,<span class="s">"true"</span>).<span class="k">option</span>(<span class="s">"startingVersion"</span>,847)…</div>

    <div class="dcf-sec">table_changes('orders', 847, 849)</div>
    <div class="dcf-tablewrap">
      <table class="dcf-table">
        <thead><tr><th>order_id</th><th>total_amount</th><th>_change_type</th><th>_commit_version</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="dcf-grid">
      <div class="dcf-card"><h3>Incremental ETL</h3><p>Propagate only changed orders into downstream marts — no full reloads.</p></div>
      <div class="dcf-card"><h3>Materialized views</h3><p>Keep aggregates fresh by applying the change feed instead of recomputing.</p></div>
      <div class="dcf-card"><h3>Replication</h3><p>Mirror changes to another system (search index, cache, warehouse) row-by-row.</p></div>
    </div>
  </div>
</div>`;
  }
  TV.registerModule('delta', {
    id: 'change-data-feed', title: 'Change Data Feed', group: 'advanced', format: 'delta',
    render(container) { container.className = ''; container.innerHTML = html(); },
    destroy() { TV.AnimationControls.hide(); },
  });
})();
