/* ============================================================
   Engine Integrations Module
   Interactive 4-tab reference: Spark, Trino, Flink, PyIceberg.
   Each tab shows engine header, config block, code examples
   with syntax highlighting, and ShopKart usage stat cards.
   No AnimationEngine — pure interactive UI.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Styles ─────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('ei-styles')) return;
    const s = document.createElement('style');
    s.id = 'ei-styles';
    s.textContent = `
.ei-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg-1);
}

/* Tab bar */
.ei-tabbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 10px 16px 0;
  border-bottom: 1px solid var(--border-default);
  background: var(--bg-2);
  flex-shrink: 0;
}

.ei-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: none;
  border-radius: 8px 8px 0 0;
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.ei-tab:hover {
  background: var(--bg-3);
  color: var(--text-secondary);
}

.ei-tab.active {
  background: var(--bg-1);
  color: var(--text-primary);
  border-bottom-color: var(--blue);
  border-left: 1px solid var(--border-default);
  border-right: 1px solid var(--border-default);
  border-top: 1px solid var(--border-default);
}

.ei-tab-icon { font-size: 14px; line-height: 1; }

/* Content area */
.ei-content-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px 20px 32px;
}

/* Tab panels */
.ei-panel { display: none; }
.ei-panel.active { display: block; }

/* Engine header */
.ei-engine-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: var(--bg-2);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  flex-wrap: wrap;
}

.ei-engine-name-block {}
.ei-engine-name {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  display: block;
  margin-bottom: 4px;
}
.ei-engine-tagline {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  display: block;
}

.ei-engine-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: 20px;
  padding: 5px 14px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-family: var(--font-mono);
  white-space: nowrap;
  flex-shrink: 0;
}

/* Main split */
.ei-main-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

@media (max-width: 900px) {
  .ei-main-split { grid-template-columns: 1fr; }
}

.ei-panel-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 8px;
}

/* Config and code blocks */
.ei-config-block, .ei-code-block {
  background: var(--bg-2);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  overflow: hidden;
}

.ei-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-3);
  border-bottom: 1px solid var(--border-default);
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.ei-block-lang {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--bg-4);
  color: var(--text-muted);
  border-radius: 4px;
  padding: 2px 6px;
}

.ei-pre {
  padding: 12px 14px;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.65;
  color: var(--text-secondary);
  overflow-x: auto;
  margin: 0;
  white-space: pre;
}

/* Code snippet separator */
.ei-snippet-sep {
  height: 1px;
  background: var(--border-default);
  margin: 0;
}

/* Syntax tokens */
.ei-kw  { color: var(--blue); font-weight: 600; }
.ei-kw2 { color: var(--purple); }
.ei-fn  { color: var(--iceberg); }
.ei-str { color: var(--orange); }
.ei-cmt { color: var(--text-muted); font-style: italic; }
.ei-num { color: var(--green); }
.ei-op  { color: var(--text-muted); }

/* Stats row */
.ei-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 4px;
}

@media (max-width: 760px) {
  .ei-stats-row { grid-template-columns: 1fr 1fr; }
}

.ei-stat-card {
  background: var(--bg-2);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 14px 16px;
  transition: border-color 0.12s;
}

.ei-stat-card:hover { border-color: var(--border-muted); }

.ei-stat-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.ei-stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-mono);
  line-height: 1.2;
}

.ei-stat-sub {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 4px;
}

.ei-stat-value.blue   { color: var(--blue); }
.ei-stat-value.green  { color: var(--green); }
.ei-stat-value.orange { color: var(--orange); }
.ei-stat-value.purple { color: var(--purple); }
`;
    document.head.appendChild(s);
  }

  /* ── Tab content definitions ────────────────────────────── */
  const TABS = [
    {
      id: 'spark',
      label: 'Spark',
      icon: '🔥',
      engineName: 'Apache Spark 3.3+',
      tagline: "ShopKart's primary batch compute engine",
      badgeText: 'spark-3.4.2 · iceberg-1.4.3',
      config: {
        lang: 'properties',
        file: 'spark-defaults.conf',
        code: `<span class="ei-cmt"># spark-defaults.conf</span>
<span class="ei-kw">spark.sql.catalog.prod</span>                          = org.apache.iceberg.spark.SparkCatalog
<span class="ei-kw">spark.sql.catalog.prod.catalog-impl</span>             = org.apache.iceberg.aws.glue.GlueCatalog
<span class="ei-kw">spark.sql.catalog.prod.warehouse</span>                = s3://shopkart-lakehouse/warehouse
<span class="ei-kw">spark.sql.catalog.prod.io-impl</span>                  = org.apache.iceberg.aws.s3.S3FileIO
<span class="ei-kw">spark.sql.defaultCatalog</span>                         = prod
<span class="ei-kw">spark.sql.extensions</span>                             = org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions`,
      },
      snippets: [
        {
          file: 'create_table.sql',
          lang: 'SQL',
          code: `<span class="ei-cmt">-- DDL: Create partitioned table</span>
<span class="ei-kw">CREATE TABLE</span> prod.orders (
  order_id     <span class="ei-fn">BIGINT</span>,
  customer_id  <span class="ei-fn">BIGINT</span>,
  country      <span class="ei-fn">STRING</span>,
  total_amount <span class="ei-fn">DECIMAL</span>(<span class="ei-num">12</span>,<span class="ei-num">2</span>),
  order_date   <span class="ei-fn">DATE</span>,
  status       <span class="ei-fn">STRING</span>
) <span class="ei-kw">USING</span> iceberg
<span class="ei-kw">PARTITIONED BY</span> (country, <span class="ei-kw2">months</span>(order_date))
<span class="ei-kw">TBLPROPERTIES</span> (
  <span class="ei-str">'write.format.default'</span>            = <span class="ei-str">'parquet'</span>,
  <span class="ei-str">'write.parquet.compression-codec'</span> = <span class="ei-str">'snappy'</span>,
  <span class="ei-str">'write.metadata.compression-codec'</span> = <span class="ei-str">'gzip'</span>
);`,
        },
        {
          file: 'time_travel.sql',
          lang: 'SQL',
          code: `<span class="ei-cmt">-- Time Travel by snapshot ID</span>
<span class="ei-kw">SELECT</span> * <span class="ei-kw">FROM</span> prod.orders
<span class="ei-kw">VERSION AS OF</span> <span class="ei-num">3821904756</span>;

<span class="ei-cmt">-- Time Travel by timestamp</span>
<span class="ei-kw">SELECT</span> * <span class="ei-kw">FROM</span> prod.orders
<span class="ei-kw">TIMESTAMP AS OF</span> <span class="ei-str">'2024-01-14 23:59:59'</span>;`,
        },
      ],
      stats: [
        { label: 'Spark Version', value: '3.4.2', sub: 'iceberg-1.4.3', cls: '' },
        { label: 'Executors', value: '48', sub: 'per job average', cls: 'blue' },
        { label: 'Daily Jobs', value: '2,400', sub: 'batch + streaming', cls: 'orange' },
        { label: 'Avg Job Time', value: '4.2 min', sub: 'P50 latency', cls: 'green' },
      ],
    },
    {
      id: 'trino',
      label: 'Trino',
      icon: '🏃',
      engineName: 'Trino 420+',
      tagline: "ShopKart's interactive BI and ad-hoc query engine",
      badgeText: 'trino-428 · iceberg-connector',
      config: {
        lang: 'properties',
        file: 'catalog/iceberg.properties',
        code: `<span class="ei-cmt"># catalog/iceberg.properties</span>
<span class="ei-kw">connector.name</span>=iceberg
<span class="ei-kw">iceberg.catalog.type</span>=glue
<span class="ei-kw">hive.metastore.glue.region</span>=us-east-1
<span class="ei-kw">iceberg.file-format</span>=PARQUET
<span class="ei-kw">iceberg.compression-codec</span>=SNAPPY
<span class="ei-kw">iceberg.max-partitions-per-writer</span>=100`,
      },
      snippets: [
        {
          file: 'federated_query.sql',
          lang: 'SQL',
          code: `<span class="ei-cmt">-- Federated query: Iceberg + PostgreSQL</span>
<span class="ei-kw">SELECT</span> o.country,
       <span class="ei-fn">COUNT</span>(*) <span class="ei-kw">AS</span> orders,
       <span class="ei-fn">SUM</span>(o.total_amount) <span class="ei-kw">AS</span> revenue,
       <span class="ei-fn">AVG</span>(c.lifetime_value) <span class="ei-kw">AS</span> avg_ltv
<span class="ei-kw">FROM</span> iceberg.prod.orders o
<span class="ei-kw">JOIN</span> postgresql.crm.customers c <span class="ei-kw">ON</span> o.customer_id = c.id
<span class="ei-kw">WHERE</span> o.order_date >= <span class="ei-fn">CURRENT_DATE</span> - <span class="ei-kw">INTERVAL</span> <span class="ei-str">'30'</span> <span class="ei-kw">DAY</span>
<span class="ei-kw">GROUP BY</span> o.country
<span class="ei-kw">ORDER BY</span> revenue <span class="ei-kw">DESC</span>;`,
        },
        {
          file: 'ctas_summary.sql',
          lang: 'SQL',
          code: `<span class="ei-cmt">-- CTAS: create partitioned summary table</span>
<span class="ei-kw">CREATE TABLE</span> iceberg.prod.monthly_revenue
<span class="ei-kw">WITH</span> (partitioning = <span class="ei-fn">ARRAY</span>[<span class="ei-str">'month(order_date)'</span>])
<span class="ei-kw">AS SELECT</span>
  country,
  <span class="ei-fn">DATE_TRUNC</span>(<span class="ei-str">'month'</span>, order_date) <span class="ei-kw">AS</span> month,
  <span class="ei-fn">SUM</span>(total_amount)            <span class="ei-kw">AS</span> revenue
<span class="ei-kw">FROM</span> iceberg.prod.orders
<span class="ei-kw">GROUP BY</span> <span class="ei-num">1</span>, <span class="ei-num">2</span>;`,
        },
      ],
      stats: [
        { label: 'Trino Version', value: '428', sub: 'coordinator HA', cls: '' },
        { label: 'BI Queries/Day', value: '3,200', sub: 'Superset + Metabase', cls: 'blue' },
        { label: 'P95 Latency', value: '2.1s', sub: 'ad-hoc queries', cls: 'green' },
        { label: 'Coordinators', value: '2', sub: 'active-active', cls: 'orange' },
      ],
    },
    {
      id: 'flink',
      label: 'Flink',
      icon: '⚡',
      engineName: 'Apache Flink 1.17+',
      tagline: "ShopKart's real-time CDC and streaming ingestion engine",
      badgeText: 'flink-1.18.1 · iceberg-1.4.3',
      config: {
        lang: 'SQL',
        file: 'flink_catalog_setup.sql',
        code: `<span class="ei-cmt">-- Create Iceberg catalog in Flink</span>
<span class="ei-kw">CREATE CATALOG</span> iceberg_catalog <span class="ei-kw">WITH</span> (
  <span class="ei-str">'type'</span>             = <span class="ei-str">'iceberg'</span>,
  <span class="ei-str">'catalog-type'</span>     = <span class="ei-str">'glue'</span>,
  <span class="ei-str">'warehouse'</span>        = <span class="ei-str">'s3://shopkart-lakehouse/warehouse'</span>,
  <span class="ei-str">'property-version'</span> = <span class="ei-str">'1'</span>
);

<span class="ei-cmt">-- Create streaming source from Kafka CDC</span>
<span class="ei-kw">CREATE TABLE</span> order_updates_cdc (
  order_id   <span class="ei-fn">BIGINT</span>,
  status     <span class="ei-fn">STRING</span>,
  event_ts   <span class="ei-fn">TIMESTAMP</span>(<span class="ei-num">3</span>),
  <span class="ei-kw">WATERMARK FOR</span> event_ts <span class="ei-kw">AS</span> event_ts - <span class="ei-kw">INTERVAL</span> <span class="ei-str">'5'</span> <span class="ei-kw">SECOND</span>
) <span class="ei-kw">WITH</span> (
  <span class="ei-str">'connector'</span> = <span class="ei-str">'kafka'</span>,
  <span class="ei-str">'topic'</span>     = <span class="ei-str">'order-status-updates'</span>,
  <span class="ei-str">'format'</span>    = <span class="ei-str">'debezium-json'</span>
);`,
      },
      snippets: [
        {
          file: 'streaming_insert.sql',
          lang: 'SQL',
          code: `<span class="ei-cmt">-- Streaming insert into Iceberg (exactly-once)</span>
<span class="ei-kw">INSERT INTO</span> iceberg_catalog.prod.orders_streaming
<span class="ei-kw">SELECT</span> order_id, status, event_ts
<span class="ei-kw">FROM</span> order_updates_cdc
<span class="ei-cmt">/*+ OPTIONS('sink.parallelism'='8',</span>
<span class="ei-cmt">            'write.upsert.enabled'='true') */</span>;`,
        },
      ],
      stats: [
        { label: 'Flink Version', value: '1.18.1', sub: 'JobManager HA', cls: '' },
        { label: 'Streaming Jobs', value: '12', sub: 'always-on', cls: 'blue' },
        { label: 'Throughput', value: '5K rec/s', sub: 'peak ingestion', cls: 'orange' },
        { label: 'Exactly-Once', value: '✓', sub: 'via checkpointing', cls: 'green' },
      ],
    },
    {
      id: 'pyiceberg',
      label: 'PyIceberg',
      icon: '🐍',
      engineName: 'PyIceberg 0.7+',
      tagline: "ShopKart's data science and ML training data pipeline",
      badgeText: 'pyiceberg-0.7.1 · pyarrow-14.x',
      config: {
        lang: 'yaml',
        file: '~/.pyiceberg.yaml',
        code: `<span class="ei-cmt"># ~/.pyiceberg.yaml</span>
<span class="ei-kw">catalog</span>:
  <span class="ei-fn">default</span>:
    <span class="ei-kw2">type</span>: glue
    <span class="ei-kw2">warehouse</span>: <span class="ei-str">s3://shopkart-lakehouse/warehouse</span>
    <span class="ei-kw2">region_name</span>: <span class="ei-str">us-east-1</span>`,
      },
      snippets: [
        {
          file: 'scan_with_pushdown.py',
          lang: 'Python',
          code: `<span class="ei-kw">from</span> pyiceberg.catalog <span class="ei-kw">import</span> load_catalog
<span class="ei-kw">import</span> pyarrow <span class="ei-kw">as</span> pa

<span class="ei-cmt"># Connect to Glue catalog</span>
catalog = <span class="ei-fn">load_catalog</span>(<span class="ei-str">'default'</span>)

<span class="ei-cmt"># Scan with predicate pushdown</span>
table = catalog.<span class="ei-fn">load_table</span>(<span class="ei-str">'prod.orders'</span>)
scan = table.<span class="ei-fn">scan</span>(
    row_filter=<span class="ei-str">"country = 'BR' AND order_date >= '2024-01-01'"</span>,
    selected_fields=(<span class="ei-str">'order_id'</span>, <span class="ei-str">'customer_id'</span>, <span class="ei-str">'total_amount'</span>, <span class="ei-str">'order_date'</span>),
    limit=<span class="ei-num">10_000_000</span>
)
<span class="ei-cmt"># Convert to Arrow for pandas / polars</span>
df = scan.<span class="ei-fn">to_arrow</span>().<span class="ei-fn">to_pandas</span>()`,
        },
        {
          file: 'write_snapshot.py',
          lang: 'Python',
          code: `<span class="ei-cmt"># Write training data as new snapshot</span>
<span class="ei-kw">import</span> pyarrow <span class="ei-kw">as</span> pa
<span class="ei-kw">from</span> datetime <span class="ei-kw">import</span> datetime

table = catalog.<span class="ei-fn">load_table</span>(<span class="ei-str">'prod.ml_features'</span>)
<span class="ei-kw">with</span> table.<span class="ei-fn">update_snapshot</span>() <span class="ei-kw">as</span> update:
    table.<span class="ei-fn">append</span>(pa.<span class="ei-fn">table</span>({
        <span class="ei-str">'feature_vector'</span>: features_array,
        <span class="ei-str">'label'</span>:          labels_array,
        <span class="ei-str">'snapshot_ts'</span>:    [datetime.<span class="ei-fn">utcnow</span>()] * <span class="ei-fn">len</span>(features_array)
    }))`,
        },
      ],
      stats: [
        { label: 'PyIceberg', value: '0.7.1', sub: 'pyarrow-14.x', cls: '' },
        { label: 'ML Pipelines', value: '8', sub: 'active training jobs', cls: 'blue' },
        { label: 'Records/Run', value: '50M', sub: 'training features', cls: 'orange' },
        { label: 'Data Scientists', value: '14', sub: 'active users', cls: 'purple' },
      ],
    },
  ];

  /* ── Build a single tab panel ───────────────────────────── */
  function _buildPanel(tab) {
    const div = document.createElement('div');
    div.className = 'ei-panel';
    div.id = 'ei-panel-' + tab.id;

    // Engine header
    const header = `
      <div class="ei-engine-header">
        <div class="ei-engine-name-block">
          <span class="ei-engine-name">${tab.icon} ${tab.engineName}</span>
          <span class="ei-engine-tagline">${tab.tagline}</span>
        </div>
        <div class="ei-engine-badge">${tab.badgeText}</div>
      </div>
    `;

    // Config block
    const configHtml = `
      <div>
        <div class="ei-panel-title">Configuration</div>
        <div class="ei-config-block">
          <div class="ei-block-header">
            <span>${tab.config.file}</span>
            <span class="ei-block-lang">${tab.config.lang}</span>
          </div>
          <pre class="ei-pre">${tab.config.code}</pre>
        </div>
      </div>
    `;

    // Code snippets
    const snippetsHtml = `
      <div>
        <div class="ei-panel-title">Code Examples</div>
        <div class="ei-code-block">
          ${tab.snippets.map((sn, i) => `
            ${i > 0 ? '<div class="ei-snippet-sep"></div>' : ''}
            <div class="ei-block-header">
              <span>${sn.file}</span>
              <span class="ei-block-lang">${sn.lang}</span>
            </div>
            <pre class="ei-pre">${sn.code}</pre>
          `).join('')}
        </div>
      </div>
    `;

    // Stats row
    const statsHtml = `
      <div>
        <div class="ei-panel-title" style="margin-top:16px">ShopKart Usage</div>
        <div class="ei-stats-row">
          ${tab.stats.map(st => `
            <div class="ei-stat-card">
              <div class="ei-stat-label">${st.label}</div>
              <div class="ei-stat-value ${st.cls}">${st.value}</div>
              <div class="ei-stat-sub">${st.sub}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    div.innerHTML = `
      ${header}
      <div class="ei-main-split">
        ${configHtml}
        ${snippetsHtml}
      </div>
      ${statsHtml}
    `;

    return div;
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'engine-integrations',
    title: 'Engine Integrations',
    group: 'advanced',

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'ei-page page-enter';

      // Tab bar
      const tabbar = document.createElement('div');
      tabbar.className = 'ei-tabbar';
      tabbar.innerHTML = TABS.map((t, i) => `
        <button class="ei-tab${i === 0 ? ' active' : ''}" data-tab="${t.id}" aria-selected="${i === 0}">
          <span class="ei-tab-icon">${t.icon}</span>
          ${t.label}
        </button>
      `).join('');
      page.appendChild(tabbar);

      // Content area
      const contentArea = document.createElement('div');
      contentArea.className = 'ei-content-area';

      TABS.forEach((tab, i) => {
        const panel = _buildPanel(tab);
        if (i === 0) panel.classList.add('active');
        contentArea.appendChild(panel);
      });

      page.appendChild(contentArea);
      container.appendChild(page);

      // Wire tab clicks
      tabbar.addEventListener('click', (e) => {
        const btn = e.target.closest('.ei-tab');
        if (!btn) return;
        const tabId = btn.dataset.tab;

        tabbar.querySelectorAll('.ei-tab').forEach(b => {
          b.classList.toggle('active', b.dataset.tab === tabId);
          b.setAttribute('aria-selected', b.dataset.tab === tabId ? 'true' : 'false');
        });

        contentArea.querySelectorAll('.ei-panel').forEach(p => {
          p.classList.toggle('active', p.id === 'ei-panel-' + tabId);
        });
      });
    },

    destroy() {
      document.getElementById('ei-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['engine-integrations'] = mod;
})();
