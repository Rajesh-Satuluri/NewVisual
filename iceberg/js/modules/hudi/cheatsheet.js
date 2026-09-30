/* Apache Hudi — Cheat Sheets (tabbed reference). Hudi bucket. */
(function () {
  'use strict';
  const TV = window.TableViz;

  function injectStyles() {
    if (document.getElementById('hcs-styles')) return;
    const s = document.createElement('style');
    s.id = 'hcs-styles';
    s.textContent = `
.hcs-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.hcs-header { padding:14px 24px; border-bottom:1px solid var(--border-default); background:var(--bg-2); flex-shrink:0; display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.hcs-header h1 { font-size:18px; font-weight:700; color:var(--text-primary); margin:0 0 2px; }
.hcs-header p { font-size:12px; color:var(--text-muted); margin:0; }
.hcs-print { padding:7px 14px; border-radius:var(--radius-sm); border:1px solid var(--border-default); background:var(--bg-3); color:var(--text-secondary); font-size:12px; cursor:pointer; flex-shrink:0; }
.hcs-print:hover { background:var(--bg-4); color:var(--text-primary); }
.hcs-tabs { display:flex; border-bottom:1px solid var(--border-default); background:var(--bg-2); flex-shrink:0; overflow-x:auto; }
.hcs-tab { padding:10px 20px; font-size:12px; font-weight:600; color:var(--text-muted); cursor:pointer; border:none; background:none; border-bottom:2px solid transparent; white-space:nowrap; }
.hcs-tab:hover { color:var(--text-secondary); }
.hcs-tab.active { color:var(--brand); border-bottom-color:var(--brand); }
.hcs-body { flex:1; overflow-y:auto; padding:20px 24px; }
.hcs-content { max-width:920px; margin:0 auto; display:none; }
.hcs-content.visible { display:block; }
.hcs-section { margin-bottom:32px; }
.hcs-section-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:12px; display:flex; align-items:center; gap:8px; }
.hcs-section-title::after { content:''; flex:1; height:1px; background:var(--border-subtle); }
.hcs-snippet-group { display:flex; flex-direction:column; gap:12px; }
.hcs-snippet { border:1px solid var(--border-default); border-radius:var(--radius); background:var(--bg-2); overflow:hidden; }
.hcs-snippet-header { padding:8px 14px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border-subtle); background:var(--bg-3); }
.hcs-snippet-title { font-size:12px; font-weight:600; color:var(--text-secondary); }
.hcs-copy-btn { font-size:10px; padding:3px 8px; border-radius:4px; border:1px solid var(--border-default); background:var(--bg-4); color:var(--text-muted); cursor:pointer; }
.hcs-copy-btn:hover { background:var(--bg-3); color:var(--text-primary); }
.hcs-copy-btn.copied { color:var(--green); border-color:var(--green); }
.hcs-code { padding:14px 16px; font-family:var(--font-mono); font-size:11.5px; color:var(--text-secondary); line-height:1.7; white-space:pre; overflow-x:auto; background:var(--code-bg); }
.hcs-code .k { color:var(--brand); font-weight:600; } .hcs-code .s { color:var(--orange); } .hcs-code .n { color:var(--purple); } .hcs-code .c { color:var(--text-muted); font-style:italic; } .hcs-code .fn { color:#e8c07a; } .hcs-code .t { color:#5ab0ff; }
.hcs-note { font-size:11.5px; color:var(--text-secondary); background:var(--bg-1); border-left:3px solid var(--brand); border-radius:0 6px 6px 0; padding:8px 12px; line-height:1.55; margin-bottom:12px; }
.hcs-note b { color:var(--brand); }
.hcs-props-table { width:100%; border-collapse:collapse; }
.hcs-props-table th { text-align:left; font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; padding:6px 12px; border-bottom:1px solid var(--border-default); }
.hcs-props-table td { padding:7px 12px; border-bottom:1px solid var(--border-subtle); font-size:12px; color:var(--text-secondary); vertical-align:top; }
.hcs-props-table tr:last-child td { border-bottom:none; }
.hcs-props-table td:first-child { font-family:var(--font-mono); font-size:11px; color:var(--green); white-space:nowrap; }
.hcs-props-table td:nth-child(2) { font-family:var(--font-mono); font-size:11px; color:var(--orange); }
`;
    document.head.appendChild(s);
  }

  const TABS = [
    { id: 'ddl', label: 'DDL' }, { id: 'dml', label: 'DML' }, { id: 'query', label: 'Queries' },
    { id: 'services', label: 'Table Services' }, { id: 'config', label: 'Config' },
  ];

  const DDL = [{ title: 'Create table (Spark SQL)', snippets: [
    { title: 'Merge-on-Read table', code: `<span class="k">CREATE TABLE</span> shopkart.orders (
  order_id <span class="t">STRING</span>, customer_id <span class="t">STRING</span>,
  country <span class="t">STRING</span>, total_amount <span class="t">DECIMAL(12,2)</span>,
  order_status <span class="t">STRING</span>, updated_at <span class="t">TIMESTAMP</span>
) <span class="k">USING</span> hudi
<span class="k">PARTITIONED BY</span> (country)
<span class="k">TBLPROPERTIES</span> (
  type = <span class="s">'mor'</span>,
  primaryKey = <span class="s">'order_id'</span>,
  preCombineField = <span class="s">'updated_at'</span>
);` },
    { title: 'DataFrame write options', code: `df.<span class="fn">write</span>.<span class="fn">format</span>(<span class="s">"hudi"</span>)
  .<span class="fn">option</span>(<span class="s">"hoodie.table.name"</span>, <span class="s">"orders"</span>)
  .<span class="fn">option</span>(RECORDKEY_FIELD, <span class="s">"order_id"</span>)
  .<span class="fn">option</span>(PARTITIONPATH_FIELD, <span class="s">"country"</span>)
  .<span class="fn">option</span>(PRECOMBINE_FIELD, <span class="s">"updated_at"</span>)
  .<span class="fn">option</span>(TABLE_TYPE, <span class="s">"MERGE_ON_READ"</span>)` },
  ] }];

  const DML = [{ title: 'Write operations', snippets: [
    { title: 'Upsert (default)', code: `df.<span class="fn">write</span>.<span class="fn">format</span>(<span class="s">"hudi"</span>)
  .<span class="fn">option</span>(OPERATION, <span class="s">"upsert"</span>)
  .<span class="fn">mode</span>(<span class="s">"append"</span>).<span class="fn">save</span>(path)</span>` },
    { title: 'Insert / Bulk insert', code: `<span class="c"># known-new records</span>
.<span class="fn">option</span>(OPERATION, <span class="s">"insert"</span>)
<span class="c"># fastest initial load / backfill</span>
.<span class="fn">option</span>(OPERATION, <span class="s">"bulk_insert"</span>)` },
    { title: 'Delete (keyed) & Insert overwrite', code: `<span class="k">DELETE FROM</span> orders <span class="k">WHERE</span> order_id = <span class="s">'ord_3277'</span>;

<span class="k">INSERT OVERWRITE</span> orders
<span class="k">PARTITION</span> (country = <span class="s">'BR'</span>)
<span class="k">SELECT</span> * <span class="k">FROM</span> corrected_br;   <span class="c">-- replacecommit</span>` },
    { title: 'MERGE INTO', code: `<span class="k">MERGE INTO</span> orders t <span class="k">USING</span> cdc s
  <span class="k">ON</span> t.order_id = s.order_id
<span class="k">WHEN MATCHED AND</span> s.op=<span class="s">'D'</span> <span class="k">THEN DELETE</span>
<span class="k">WHEN MATCHED</span> <span class="k">THEN UPDATE SET</span> *
<span class="k">WHEN NOT MATCHED</span> <span class="k">THEN INSERT</span> *;` },
  ] }];

  const QUERY = [{ title: 'Query types', snippets: [
    { title: 'Snapshot / Read-optimized', code: `<span class="c"># snapshot (real-time): base ⊕ logs</span>
spark.<span class="fn">read</span>.<span class="fn">format</span>(<span class="s">"hudi"</span>).<span class="fn">load</span>(path)
<span class="c"># read-optimized: base files only (fast)</span>
.<span class="fn">option</span>(<span class="s">"hoodie.datasource.query.type"</span>, <span class="s">"read_optimized"</span>)` },
    { title: 'Incremental', code: `spark.<span class="fn">read</span>.<span class="fn">format</span>(<span class="s">"hudi"</span>)
  .<span class="fn">option</span>(QUERY_TYPE, <span class="s">"incremental"</span>)
  .<span class="fn">option</span>(BEGIN_INSTANTTIME, <span class="s">"20260906090000"</span>)
  .<span class="fn">load</span>(path)</span>` },
    { title: 'Time travel', code: `spark.<span class="fn">read</span>.<span class="fn">format</span>(<span class="s">"hudi"</span>)
  .<span class="fn">option</span>(<span class="s">"as.of.instant"</span>, <span class="s">"20260906090000"</span>)
  .<span class="fn">load</span>(path)</span>` },
  ] }];

  const SERVICES = [{ title: 'Table services', snippets: [
    { title: 'Compaction (MoR)', code: `<span class="c"># inline every N delta commits</span>
hoodie.compact.inline = <span class="s">true</span>
hoodie.compact.inline.max.delta.commits = <span class="n">5</span>
<span class="c"># or run async / via CLI</span>
<span class="k">CALL</span> run_compaction(op =&gt; <span class="s">'run'</span>, table =&gt; <span class="s">'orders'</span>);` },
    { title: 'Clustering & Cleaning', code: `<span class="c"># clustering (sort/right-size)</span>
hoodie.clustering.inline = <span class="s">true</span>
hoodie.clustering.plan.strategy.sort.columns = <span class="s">"country,order_date"</span>
<span class="c"># cleaning (retention)</span>
hoodie.cleaner.policy = <span class="s">KEEP_LATEST_COMMITS</span>
hoodie.cleaner.commits.retained = <span class="n">10</span>` },
    { title: 'Savepoint / Restore', code: `hudi-cli&gt; savepoint create --commit <span class="s">20260906090000</span>
hudi-cli&gt; savepoint rollback --savepoint <span class="s">20260906090000</span>
<span class="k">CALL</span> restore_to_instant(table =&gt; <span class="s">'orders'</span>, instant =&gt; <span class="s">'20260906090000'</span>);` },
  ] }];

  const PROPS = [
    { key: 'hoodie.table.type', default: 'COPY_ON_WRITE', desc: 'COPY_ON_WRITE or MERGE_ON_READ — the table type' },
    { key: 'hoodie.datasource.write.recordkey.field', default: '—', desc: 'Primary key field(s) identifying a record' },
    { key: 'hoodie.datasource.write.partitionpath.field', default: '—', desc: 'Field(s) that form the partition path' },
    { key: 'hoodie.datasource.write.precombine.field', default: '—', desc: 'Tie-breaker field; larger value wins on same key' },
    { key: 'hoodie.datasource.write.operation', default: 'upsert', desc: 'upsert | insert | bulk_insert | insert_overwrite | delete' },
    { key: 'hoodie.index.type', default: 'BLOOM', desc: 'BLOOM | SIMPLE | BUCKET | RECORD_INDEX | HBASE' },
    { key: 'hoodie.metadata.enable', default: 'true', desc: 'Enable the internal metadata table (file list, stats, index)' },
    { key: 'hoodie.compact.inline', default: 'false', desc: 'Run compaction inline with writes (MoR)' },
    { key: 'hoodie.cleaner.commits.retained', default: '10', desc: 'Commits of history to retain when cleaning' },
    { key: 'hoodie.write.concurrency.mode', default: 'single_writer', desc: 'single_writer or optimistic_concurrency_control (multi-writer)' },
  ];

  function snip(s) { return `<div class="hcs-snippet"><div class="hcs-snippet-header"><div class="hcs-snippet-title">${s.title}</div><button class="hcs-copy-btn" data-code="${encodeURIComponent(s.code.replace(/<[^>]+>/g, ''))}">Copy</button></div><div class="hcs-code">${s.code}</div></div>`; }
  function sec(x) { return `<div class="hcs-section"><div class="hcs-section-title">${x.title}</div><div class="hcs-snippet-group">${x.snippets.map(snip).join('')}</div></div>`; }

  function render(container) {
    injectStyles();
    const rows = PROPS.map(p => `<tr><td>${p.key}</td><td>${p.default || '—'}</td><td>${p.desc}</td></tr>`).join('');
    container.className = '';
    container.innerHTML = `
<div class="hcs-page page-enter">
  <div class="hcs-header"><div><h1>Cheat Sheets</h1><p>Apache Hudi — quick reference for DDL, DML, queries, table services, and config</p></div>
    <button class="hcs-print" type="button" onclick="window.print()" title="Print or save as PDF">Print / Save PDF</button></div>
  <div class="hcs-tabs">${TABS.map((t, i) => `<button class="hcs-tab${i === 0 ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}</div>
  <div class="hcs-body">
    <div class="hcs-content visible" id="hcs-ddl"><div class="hcs-note"><b>ShopKart context:</b> the orders table is Merge-on-Read, keyed by order_id, partitioned by country, precombined on updated_at.</div>${DDL.map(sec).join('')}</div>
    <div class="hcs-content" id="hcs-dml"><div class="hcs-note"><b>Write patterns:</b> streaming CDC uses upsert (deltacommit); backfills use bulk_insert; corrections use insert overwrite (replacecommit).</div>${DML.map(sec).join('')}</div>
    <div class="hcs-content" id="hcs-query"><div class="hcs-note"><b>Read choices:</b> dashboards use the snapshot (real-time) view; heavy analytics use read-optimized; downstream pipelines use incremental.</div>${QUERY.map(sec).join('')}</div>
    <div class="hcs-content" id="hcs-services"><div class="hcs-note"><b>Schedule:</b> async compaction every few commits, nightly clustering on (country, order_date), cleaning retains the last 10 commits; savepoint before risky migrations.</div>${SERVICES.map(sec).join('')}</div>
    <div class="hcs-content" id="hcs-config"><div class="hcs-note"><b>Essentials:</b> set table type, recordkey, partitionpath, and precombine on every table. Pick the index for your write pattern; keep the metadata table on.</div>
      <div class="hcs-section"><div class="hcs-section-title">Common Write Configs</div><div class="hcs-snippet"><div style="overflow-x:auto"><table class="hcs-props-table"><thead><tr><th>Property</th><th>Default</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table></div></div></div>
    </div>
  </div>
</div>`;
    container.querySelectorAll('.hcs-tab').forEach(btn => btn.addEventListener('click', () => {
      container.querySelectorAll('.hcs-tab').forEach(b => b.classList.remove('active')); btn.classList.add('active');
      container.querySelectorAll('.hcs-content').forEach(c => c.classList.remove('visible'));
      const t = container.querySelector(`#hcs-${btn.dataset.tab}`); if (t) t.classList.add('visible');
    }));
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.hcs-copy-btn'); if (!btn) return;
      const raw = decodeURIComponent(btn.dataset.code);
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(raw).then(() => { btn.textContent = 'Copied!'; btn.classList.add('copied'); setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1800); }).catch(() => {});
    });
  }

  TV.registerModule('hudi', {
    id: 'cheatsheet', title: 'Cheat Sheets', group: 'learn', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
