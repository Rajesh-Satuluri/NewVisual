/* Delta Lake — Liquid Clustering (reading, static) */
(function () {
  'use strict';
  const TV = window.TableViz;
  function html() {
    return `
<style>
.dlc { height:100%; overflow-y:auto; padding:30px 32px 60px; }
.dlc-wrap { max-width:880px; margin:0 auto; }
.dlc-h1 { font-size:24px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin-bottom:8px; }
.dlc-lead { font-size:14px; color:var(--text-secondary); line-height:1.7; margin-bottom:22px; }
.dlc-code { font-family:var(--font-mono); font-size:12px; line-height:1.7; color:var(--text-secondary); background:var(--code-bg); border:1px solid var(--border-default); border-radius:10px; padding:14px 16px; white-space:pre; overflow-x:auto; margin-bottom:22px; }
.dlc-code .k { color:var(--brand); font-weight:600; } .dlc-code .c { color:var(--text-muted); }
.dlc-tablewrap { overflow-x:auto; margin-bottom:22px; }
.dlc-table { width:100%; border-collapse:collapse; font-size:12.5px; min-width:560px; }
.dlc-table th, .dlc-table td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--border-default); vertical-align:top; }
.dlc-table th { font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); font-weight:800; }
.dlc-table td:first-child { color:var(--text-muted); white-space:nowrap; }
.dlc-table td.p { color:var(--text-secondary); } .dlc-table td.l { color:var(--text-primary); font-weight:500; }
.dlc-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; }
.dlc-card { background:var(--bg-2); border:1px solid var(--border-default); border-radius:var(--radius-lg); padding:16px; }
.dlc-card h3 { font-size:13.5px; font-weight:700; color:var(--text-primary); margin-bottom:6px; }
.dlc-card p { font-size:12px; color:var(--text-secondary); line-height:1.55; }
.dlc-sec { font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--brand); margin:24px 0 10px; }
</style>
<div class="dlc page-enter">
  <div class="dlc-wrap">
    <h1 class="dlc-h1">Liquid Clustering</h1>
    <p class="dlc-lead">Liquid Clustering is Delta’s modern replacement for both Hive-style partitioning and Z-ORDER. You declare
      <em>clustering keys</em> and Delta continuously organizes data by them — with no directory structure, no small-file skew, and
      the freedom to change keys later without rewriting the whole table.</p>

    <div class="dlc-code"><span class="k">CREATE TABLE</span> orders (…) <span class="k">USING</span> DELTA
<span class="k">CLUSTER BY</span> (country, order_date);   <span class="c">-- no PARTITIONED BY</span>

<span class="c">-- change the keys any time, incrementally:</span>
<span class="k">ALTER TABLE</span> orders <span class="k">CLUSTER BY</span> (customer_id);
<span class="k">OPTIMIZE</span> orders;   <span class="c">-- clusters only new / touched data</span></div>

    <div class="dlc-sec">Partitioning vs Liquid Clustering</div>
    <div class="dlc-tablewrap">
      <table class="dlc-table">
        <thead><tr><th></th><th>Hive partitioning</th><th>Liquid clustering</th></tr></thead>
        <tbody>
          <tr><td>Physical layout</td><td class="p">Directory per value</td><td class="l">No directories — clustered files</td></tr>
          <tr><td>High-cardinality keys</td><td class="p">Small-file explosion</td><td class="l">Handled — no skew</td></tr>
          <tr><td>Multiple keys</td><td class="p">Nested dirs, rigid order</td><td class="l">Multi-dimensional, order-free</td></tr>
          <tr><td>Changing the scheme</td><td class="p">Full table rewrite</td><td class="l">ALTER + incremental OPTIMIZE</td></tr>
          <tr><td>Skew handling</td><td class="p">Manual</td><td class="l">Automatic</td></tr>
        </tbody>
      </table>
    </div>

    <div class="dlc-grid">
      <div class="dlc-card"><h3>Incremental</h3><p>OPTIMIZE clusters only new or modified data, so maintenance cost scales with change, not table size.</p></div>
      <div class="dlc-card"><h3>Self-tuning</h3><p>No partition column to choose wrong. Pick the columns you filter on; Delta handles the physical organization.</p></div>
      <div class="dlc-card"><h3>Skip-friendly</h3><p>Clustering co-locates related rows so per-file min/max stats prune aggressively — the same skipping engine, better inputs.</p></div>
    </div>
  </div>
</div>`;
  }
  TV.registerModule('delta', {
    id: 'liquid-clustering', title: 'Liquid Clustering', group: 'log', format: 'delta',
    render(container) { container.className = ''; container.innerHTML = html(); },
    destroy() { TV.AnimationControls.hide(); },
  });
})();
