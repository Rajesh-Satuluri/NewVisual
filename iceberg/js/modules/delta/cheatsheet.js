/* ============================================================
   Delta Lake — Cheat Sheets
   Tabbed reference: DDL, DML, Time Travel, Maintenance, Properties.
   All examples use ShopKart production context. Delta bucket.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  function injectStyles() {
    if (document.getElementById('dcs-styles')) return;
    const s = document.createElement('style');
    s.id = 'dcs-styles';
    s.textContent = `
.dcs-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.dcs-header { padding:14px 24px; border-bottom:1px solid var(--border-default); background:var(--bg-2); flex-shrink:0; display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.dcs-header h1 { font-size:18px; font-weight:700; color:var(--text-primary); margin:0 0 2px; }
.dcs-header p { font-size:12px; color:var(--text-muted); margin:0; }
.dcs-print { padding:7px 14px; border-radius:var(--radius-sm); border:1px solid var(--border-default); background:var(--bg-3); color:var(--text-secondary); font-size:12px; cursor:pointer; flex-shrink:0; }
.dcs-print:hover { background:var(--bg-4); color:var(--text-primary); }
.dcs-tabs { display:flex; gap:0; border-bottom:1px solid var(--border-default); background:var(--bg-2); flex-shrink:0; overflow-x:auto; }
.dcs-tab { padding:10px 20px; font-size:12px; font-weight:600; color:var(--text-muted); cursor:pointer; border:none; background:none; border-bottom:2px solid transparent; transition:color .12s, border-color .12s; white-space:nowrap; }
.dcs-tab:hover { color:var(--text-secondary); }
.dcs-tab.active { color:var(--brand); border-bottom-color:var(--brand); }
.dcs-body { flex:1; overflow-y:auto; padding:20px 24px; }
.dcs-content { max-width:920px; margin:0 auto; display:none; }
.dcs-content.visible { display:block; }
.dcs-section { margin-bottom:32px; }
.dcs-section-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:12px; display:flex; align-items:center; gap:8px; }
.dcs-section-title::after { content:''; flex:1; height:1px; background:var(--border-subtle); }
.dcs-snippet-group { display:flex; flex-direction:column; gap:12px; }
.dcs-snippet { border:1px solid var(--border-default); border-radius:var(--radius); background:var(--bg-2); overflow:hidden; }
.dcs-snippet-header { padding:8px 14px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border-subtle); background:var(--bg-3); }
.dcs-snippet-title { font-size:12px; font-weight:600; color:var(--text-secondary); }
.dcs-copy-btn { font-size:10px; padding:3px 8px; border-radius:4px; border:1px solid var(--border-default); background:var(--bg-4); color:var(--text-muted); cursor:pointer; transition:all .12s; }
.dcs-copy-btn:hover { background:var(--bg-3); color:var(--text-primary); }
.dcs-copy-btn.copied { color:var(--green); border-color:var(--green); }
.dcs-code { padding:14px 16px; font-family:var(--font-mono); font-size:11.5px; color:var(--text-secondary); line-height:1.7; white-space:pre; overflow-x:auto; background:var(--code-bg); }
.dcs-code .k { color:var(--brand); font-weight:600; } .dcs-code .s { color:var(--orange); } .dcs-code .n { color:var(--purple); } .dcs-code .c { color:var(--text-muted); font-style:italic; } .dcs-code .fn { color:#e8c07a; } .dcs-code .t { color:var(--blue); }
.dcs-note { font-size:11.5px; color:var(--text-secondary); background:var(--bg-1); border-left:3px solid var(--brand); border-radius:0 6px 6px 0; padding:8px 12px; line-height:1.55; margin-bottom:12px; }
.dcs-note strong { color:var(--brand); }
.dcs-props-table { width:100%; border-collapse:collapse; }
.dcs-props-table th { text-align:left; font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; padding:6px 12px; border-bottom:1px solid var(--border-default); }
.dcs-props-table td { padding:7px 12px; border-bottom:1px solid var(--border-subtle); font-size:12px; color:var(--text-secondary); vertical-align:top; }
.dcs-props-table tr:last-child td { border-bottom:none; }
.dcs-props-table td:first-child { font-family:var(--font-mono); font-size:11px; color:var(--green); white-space:nowrap; }
.dcs-props-table td:nth-child(2) { font-family:var(--font-mono); font-size:11px; color:var(--orange); }
`;
    document.head.appendChild(s);
  }

  const TABS = [
    { id: 'ddl', label: 'DDL' },
    { id: 'dml', label: 'DML' },
    { id: 'timetravel', label: 'Time Travel' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'properties', label: 'Properties' },
  ];

  const DDL_SECTIONS = [
    {
      title: 'CREATE TABLE',
      snippets: [
        {
          title: 'Delta table (ShopKart orders)',
          code: `<span class="c">-- Spark SQL / Databricks</span>
<span class="k">CREATE TABLE</span> shopkart.orders (
  order_id       <span class="t">BIGINT</span>,
  customer_id    <span class="t">BIGINT</span>,
  order_date     <span class="t">DATE</span>,
  country        <span class="t">STRING</span>,
  total_amount   <span class="t">DECIMAL(12,2)</span>,
  order_status   <span class="t">STRING</span>,
  updated_at     <span class="t">TIMESTAMP</span>
)
<span class="k">USING</span> DELTA
<span class="k">CLUSTER BY</span> (customer_id, order_date)   <span class="c">-- liquid clustering</span>
<span class="k">TBLPROPERTIES</span> (
  <span class="s">'delta.enableDeletionVectors'</span> = <span class="s">'true'</span>
);`,
        },
        {
          title: 'CREATE TABLE AS SELECT (CTAS)',
          code: `<span class="k">CREATE TABLE</span> shopkart.daily_summary
<span class="k">USING</span> DELTA
<span class="k">PARTITIONED BY</span> (order_date)
<span class="k">AS SELECT</span>
  order_date, country,
  <span class="fn">count</span>(*) <span class="k">AS</span> orders,
  <span class="fn">sum</span>(total_amount) <span class="k">AS</span> revenue
<span class="k">FROM</span> shopkart.orders
<span class="k">GROUP BY</span> order_date, country;`,
        },
        {
          title: 'Convert existing Parquet → Delta',
          code: `<span class="c">-- In place, no data copy</span>
<span class="k">CONVERT TO DELTA</span> parquet.\`s3://shopkart/orders\`
<span class="k">PARTITIONED BY</span> (order_date <span class="t">DATE</span>);`,
        },
      ],
    },
    {
      title: 'ALTER TABLE — Schema Evolution',
      snippets: [
        {
          title: 'Add, rename, drop columns',
          code: `<span class="c">-- Add column (metadata-only; old files read null)</span>
<span class="k">ALTER TABLE</span> shopkart.orders <span class="k">ADD COLUMN</span> loyalty_tier <span class="t">STRING</span>;

<span class="c">-- Rename column (needs column mapping)</span>
<span class="k">ALTER TABLE</span> shopkart.orders <span class="k">RENAME COLUMN</span> total_amount <span class="k">TO</span> amount;

<span class="c">-- Drop column (needs column mapping)</span>
<span class="k">ALTER TABLE</span> shopkart.orders <span class="k">DROP COLUMN</span> legacy_flag;

<span class="c">-- Enable column mapping first</span>
<span class="k">ALTER TABLE</span> shopkart.orders <span class="k">SET TBLPROPERTIES</span> (
  <span class="s">'delta.columnMapping.mode'</span> = <span class="s">'name'</span>);`,
        },
        {
          title: 'Change clustering keys (liquid)',
          code: `<span class="c">-- Clustering keys can evolve without full rewrite</span>
<span class="k">ALTER TABLE</span> shopkart.orders
  <span class="k">CLUSTER BY</span> (country, order_date);`,
        },
      ],
    },
  ];

  const DML_SECTIONS = [
    {
      title: 'Write Operations',
      snippets: [
        {
          title: 'INSERT (append)',
          code: `<span class="k">INSERT INTO</span> shopkart.orders
<span class="k">SELECT</span> * <span class="k">FROM</span> staging.kafka_batch;</span>`,
        },
        {
          title: 'UPDATE / DELETE',
          code: `<span class="k">UPDATE</span> shopkart.orders
  <span class="k">SET</span> order_status = <span class="s">'DELIVERED'</span>, updated_at = <span class="fn">current_timestamp</span>()
  <span class="k">WHERE</span> order_id = <span class="n">9000012345</span>;

<span class="c">-- GDPR erasure (fast with deletion vectors)</span>
<span class="k">DELETE FROM</span> shopkart.orders <span class="k">WHERE</span> customer_id = <span class="n">7841290</span>;`,
        },
        {
          title: 'MERGE INTO (CDC upsert)',
          code: `<span class="k">MERGE INTO</span> shopkart.orders t
<span class="k">USING</span> staging.cdc_batch s
  <span class="k">ON</span> t.order_id = s.order_id <span class="k">AND</span> t.order_date = s.order_date
<span class="k">WHEN MATCHED AND</span> s.op = <span class="s">'D'</span> <span class="k">THEN DELETE</span>
<span class="k">WHEN MATCHED</span> <span class="k">THEN UPDATE SET</span> *
<span class="k">WHEN NOT MATCHED</span> <span class="k">THEN INSERT</span> *;`,
        },
        {
          title: 'replaceWhere (selective overwrite)',
          code: `<span class="c">-- Replace only one country's rows, atomically</span>
df.write.<span class="fn">format</span>(<span class="s">"delta"</span>)
  .<span class="fn">option</span>(<span class="s">"replaceWhere"</span>, <span class="s">"country = 'BR'"</span>)
  .<span class="fn">mode</span>(<span class="s">"overwrite"</span>)
  .<span class="fn">saveAsTable</span>(<span class="s">"shopkart.orders"</span>);</span>`,
        },
      ],
    },
  ];

  const TT_SECTIONS = [
    {
      title: 'Query History',
      snippets: [
        {
          title: 'VERSION / TIMESTAMP AS OF',
          code: `<span class="k">SELECT</span> * <span class="k">FROM</span> shopkart.orders <span class="k">VERSION AS OF</span> <span class="n">842</span>;
<span class="k">SELECT</span> * <span class="k">FROM</span> shopkart.orders <span class="k">TIMESTAMP AS OF</span> <span class="s">'2026-08-01 00:00:00'</span>;

<span class="c">-- DataFrame API</span>
spark.<span class="fn">read</span>.<span class="fn">option</span>(<span class="s">"versionAsOf"</span>, <span class="n">842</span>)
  .<span class="fn">table</span>(<span class="s">"shopkart.orders"</span>);`,
        },
        {
          title: 'DESCRIBE HISTORY',
          code: `<span class="k">DESCRIBE HISTORY</span> shopkart.orders <span class="k">LIMIT</span> <span class="n">10</span>;
<span class="c">-- version, timestamp, operation, operationParameters,
--   operationMetrics, userName</span>`,
        },
      ],
    },
    {
      title: 'Rollback',
      snippets: [
        {
          title: 'RESTORE to a version / time',
          code: `<span class="c">-- Incident recovery: undo a bad batch in seconds</span>
<span class="k">RESTORE TABLE</span> shopkart.orders <span class="k">TO VERSION AS OF</span> <span class="n">842</span>;
<span class="k">RESTORE TABLE</span> shopkart.orders <span class="k">TO TIMESTAMP AS OF</span> <span class="s">'2026-08-01 01:30:00'</span>;</span>`,
        },
      ],
    },
  ];

  const MAINT_SECTIONS = [
    {
      title: 'Compaction & Clustering',
      snippets: [
        {
          title: 'OPTIMIZE (bin-pack)',
          code: `<span class="c">-- Compact small files into right-sized ones</span>
<span class="k">OPTIMIZE</span> shopkart.orders;

<span class="c">-- Scope to recent partitions</span>
<span class="k">OPTIMIZE</span> shopkart.orders <span class="k">WHERE</span> order_date &gt;= <span class="s">'2026-08-01'</span>;`,
        },
        {
          title: 'OPTIMIZE … ZORDER BY',
          code: `<span class="c">-- Multi-column data locality (non-clustered tables)</span>
<span class="k">OPTIMIZE</span> shopkart.orders
  <span class="k">ZORDER BY</span> (customer_id, country);</span>`,
        },
      ],
    },
    {
      title: 'Cleanup',
      snippets: [
        {
          title: 'VACUUM',
          code: `<span class="c">-- Default retention is 7 days</span>
<span class="k">VACUUM</span> shopkart.orders;
<span class="k">VACUUM</span> shopkart.orders <span class="k">RETAIN</span> <span class="n">168</span> <span class="k">HOURS</span>;
<span class="k">VACUUM</span> shopkart.orders <span class="k">DRY RUN</span>;   <span class="c">-- preview deletions</span>`,
        },
        {
          title: 'Change Data Feed',
          code: `<span class="k">ALTER TABLE</span> shopkart.orders <span class="k">SET TBLPROPERTIES</span> (
  <span class="s">'delta.enableChangeDataFeed'</span> = <span class="s">'true'</span>);

<span class="k">SELECT</span> * <span class="k">FROM</span> <span class="fn">table_changes</span>(<span class="s">'shopkart.orders'</span>, <span class="n">840</span>, <span class="n">842</span>);</span>`,
        },
      ],
    },
  ];

  const PROPERTIES = [
    { key: 'delta.enableDeletionVectors', default: 'false', desc: 'Merge-on-read deletes/updates via row bitmaps instead of full-file rewrites' },
    { key: 'delta.enableChangeDataFeed', default: 'false', desc: 'Emit row-level change data (CDF) readable via table_changes()' },
    { key: 'delta.columnMapping.mode', default: 'none', desc: 'name | id — enables rename/drop column without rewriting data' },
    { key: 'delta.checkpointInterval', default: '10', desc: 'Commits between Parquet checkpoints (bounds read-time log replay)' },
    { key: 'delta.deletedFileRetentionDuration', default: 'interval 7 days', desc: 'How long tombstoned files survive for VACUUM / time travel' },
    { key: 'delta.logRetentionDuration', default: 'interval 30 days', desc: 'How long commit history is kept in the _delta_log' },
    { key: 'delta.dataSkippingNumIndexedCols', default: '32', desc: 'Number of leading columns for which min/max stats are collected' },
    { key: 'delta.targetFileSize', default: null, desc: 'Target size for OPTIMIZE output files (e.g. 128mb)' },
    { key: 'delta.autoOptimize.optimizeWrite', default: 'false', desc: 'Coalesce small files during writes' },
    { key: 'delta.autoOptimize.autoCompact', default: 'false', desc: 'Compact small files automatically after writes' },
    { key: 'delta.minReaderVersion / minWriterVersion', default: '1 / 2', desc: 'Protocol versions; raised automatically when a table feature is enabled' },
    { key: 'delta.appendOnly', default: 'false', desc: 'Forbid updates/deletes — enforce an append-only table' },
  ];

  function snippetHtml(snip) {
    return `<div class="dcs-snippet">
      <div class="dcs-snippet-header">
        <div class="dcs-snippet-title">${snip.title}</div>
        <button class="dcs-copy-btn" data-code="${encodeURIComponent(snip.code.replace(/<[^>]+>/g, ''))}">Copy</button>
      </div>
      <div class="dcs-code">${snip.code}</div>
    </div>`;
  }
  function sectionHtml(sec) {
    return `<div class="dcs-section">
      <div class="dcs-section-title">${sec.title}</div>
      <div class="dcs-snippet-group">${sec.snippets.map(snippetHtml).join('')}</div>
    </div>`;
  }

  function render(container) {
    injectStyles();
    const propsRows = PROPERTIES.map(p =>
      `<tr><td>${p.key}</td><td>${p.default || '—'}</td><td>${p.desc}</td></tr>`).join('');

    container.className = '';
    container.innerHTML = `
<div class="dcs-page page-enter">
  <div class="dcs-header">
    <div>
      <h1>Cheat Sheets</h1>
      <p>Delta Lake — quick reference for DDL, DML, time travel, maintenance, and properties</p>
    </div>
    <button class="dcs-print" type="button" onclick="window.print()" title="Print or save as PDF">Print / Save PDF</button>
  </div>
  <div class="dcs-tabs">
    ${TABS.map((t, i) => `<button class="dcs-tab${i === 0 ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
  </div>
  <div class="dcs-body">
    <div class="dcs-content visible" id="dcs-ddl">
      <div class="dcs-note"><strong>ShopKart context:</strong> tables use Unity Catalog on S3. Deletion vectors and liquid clustering are on by default; column mapping is enabled where renames/drops are needed.</div>
      ${DDL_SECTIONS.map(sectionHtml).join('')}
    </div>
    <div class="dcs-content" id="dcs-dml">
      <div class="dcs-note"><strong>Write patterns:</strong> streaming appends land every 2 minutes; the hourly MERGE handles CDC upserts; replaceWhere backfills a single country atomically without touching the rest of the table.</div>
      ${DML_SECTIONS.map(sectionHtml).join('')}
    </div>
    <div class="dcs-content" id="dcs-timetravel">
      <div class="dcs-note"><strong>Incident recovery:</strong> note the version before any bulk DML (DESCRIBE HISTORY). RESTORE TABLE … TO VERSION AS OF undoes a bad batch in seconds — as long as VACUUM hasn’t passed retention.</div>
      ${TT_SECTIONS.map(sectionHtml).join('')}
    </div>
    <div class="dcs-content" id="dcs-maintenance">
      <div class="dcs-note"><strong>ShopKart schedule:</strong> OPTIMIZE runs nightly (2 AM UTC), VACUUM daily (3 AM UTC, 7-day retention). Deletion-vector tables are compacted by OPTIMIZE to materialize deletes.</div>
      ${MAINT_SECTIONS.map(sectionHtml).join('')}
    </div>
    <div class="dcs-content" id="dcs-properties">
      <div class="dcs-note"><strong>Key toggles:</strong> enable deletion vectors for fast point deletes, change data feed for incremental consumers, and column mapping before any rename/drop. Enabling a feature raises the table’s protocol version automatically.</div>
      <div class="dcs-section">
        <div class="dcs-section-title">Table Properties Reference</div>
        <div class="dcs-snippet"><div style="overflow-x:auto">
          <table class="dcs-props-table">
            <thead><tr><th>Property</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>${propsRows}</tbody>
          </table>
        </div></div>
      </div>
    </div>
  </div>
</div>`;

    container.querySelectorAll('.dcs-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.dcs-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        container.querySelectorAll('.dcs-content').forEach(c => c.classList.remove('visible'));
        const target = container.querySelector(`#dcs-${btn.dataset.tab}`);
        if (target) target.classList.add('visible');
      });
    });

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.dcs-copy-btn');
      if (!btn) return;
      const raw = decodeURIComponent(btn.dataset.code);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(raw).then(() => {
          btn.textContent = 'Copied!'; btn.classList.add('copied');
          setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1800);
        }).catch(() => {});
      }
    });
  }

  TV.registerModule('delta', {
    id: 'cheatsheet', title: 'Cheat Sheets', group: 'learn', format: 'delta',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
