import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M02 · Foundation',
    title: 'Lakehouse Architecture',
    subtitle: 'Data warehouse + data lake unified: Delta Lake, Unity Catalog, Photon',
    tabs: [
      { id: 'overview',  label: '🏛️ Overview' },
      { id: 'layers',    label: '📐 Architecture Layers' },
      { id: 'compare',   label: '⚖️ vs Warehouse/Lake' },
      { id: 'iq',        label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-overview').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">What is a Lakehouse?</div>
        <div class="section-desc">One copy of data, all workloads — lake economics + warehouse reliability</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">1</div><div class="stat-label">Copy of data</div></div>
        <div class="stat-box"><div class="stat-val">ACID</div><div class="stat-label">Transactions on S3</div></div>
        <div class="stat-box"><div class="stat-val">10×</div><div class="stat-label">Cheaper than warehouse</div></div>
        <div class="stat-box"><div class="stat-val">BI+ML</div><div class="stat-label">All workloads unified</div></div>
      </div>
      <div class="info-grid" style="margin-top:24px">
        <div class="info-card">
          <div class="info-card-icon">🗂️</div>
          <div class="info-card-title">Delta Lake</div>
          <div class="info-card-body">ACID transaction log on top of Parquet + object storage. Turns a directory of files into a reliable, versionable table with schema enforcement.</div>
          <div class="info-card-tag">Storage Layer</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🔐</div>
          <div class="info-card-title">Unity Catalog</div>
          <div class="info-card-body">Centralized governance across all data assets. 3-level namespace: catalog.schema.table. Fine-grained ACLs, data lineage, and audit logs in one place.</div>
          <div class="info-card-tag">Governance Layer</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">⚡</div>
          <div class="info-card-title">Photon Engine</div>
          <div class="info-card-body">Vectorized C++ query engine that replaces JVM Spark for SQL. Processes 1,024-row batches with SIMD instructions — 2–8× faster on analytical queries.</div>
          <div class="info-card-tag">Compute Layer</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🔄</div>
          <div class="info-card-title">Multi-Workload Compute</div>
          <div class="info-card-body">Same Delta tables serve SQL BI dashboards, Python ML training, Structured Streaming pipelines, and R notebooks — no ETL to a separate system.</div>
          <div class="info-card-tag">Compute Layer</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🗺️</div>
          <div class="info-card-title">Open Formats</div>
          <div class="info-card-body">Delta Lake uses open Parquet files. Any engine (Spark, Trino, Flink, DuckDB) can read the files directly — no proprietary lock-in at the storage layer.</div>
          <div class="info-card-tag">Interoperability</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🕐</div>
          <div class="info-card-title">Time Travel</div>
          <div class="info-card-body">Query any historical version of a table: SELECT * FROM orders VERSION AS OF 42. Roll back bad writes instantly. No separate backup infrastructure needed.</div>
          <div class="info-card-tag">Reliability</div>
        </div>
      </div>
    </div>`;

  container.querySelector('#tab-layers').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Databricks Platform Layers</div>
        <div class="section-desc">From raw object storage to AI applications — every layer explained</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;max-width:760px">
        ${[
          { layer:'AI & Applications', color:'#FF6900', items:'Mosaic AI · Model Serving · LLM Fine-tuning · Feature Store', desc:'Train, serve, and monitor ML/AI models. Feature Store ensures training-serving consistency. Model Registry with alias-based promotion (champion/challenger).'},
          { layer:'Workloads', color:'#e05800', items:'SQL Analytics · Data Science · Data Engineering · Streaming', desc:'All four workload types read/write the same Delta tables. No ETL between systems. One cluster type (all-purpose) can handle any workload.'},
          { layer:'Compute', color:'#c04800', items:'All-Purpose Clusters · Job Clusters · SQL Warehouses · DLT Pipelines', desc:'SQL Warehouses use Photon and auto-scale for BI. Job Clusters are ephemeral for batch ETL. All-Purpose are persistent for interactive notebooks.'},
          { layer:'Orchestration', color:'#9e3a00', items:'Databricks Workflows · Delta Live Tables · MLflow Tracking', desc:'Workflows orchestrate multi-task jobs with DAG dependencies. DLT declares pipelines declaratively with built-in quality constraints (EXPECT).'},
          { layer:'Governance', color:'#7c2c00', items:'Unity Catalog · Data Lineage · Fine-grained ACLs · Audit Logs', desc:'catalog.schema.table namespace. Column-level security, row filters. Automatic lineage from Delta operations captured without instrumentation.'},
          { layer:'Storage', color:'#5a1e00', items:'Delta Lake · Parquet Files · Transaction Log · Object Storage (S3/ADLS/GCS)', desc:'ACID transactions via _delta_log. Immutable Parquet files — old versions stay until VACUUM. Schema enforcement and evolution built-in.'},
        ].map(l => `
          <div style="border-radius:10px;padding:16px 20px;background:var(--bg2);border-left:4px solid ${l.color}">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
              <span style="font-size:13px;font-weight:700;color:${l.color}">${l.layer}</span>
              <span style="font-size:11px;color:var(--text3);font-family:monospace">${l.items}</span>
            </div>
            <div style="font-size:12px;color:var(--text2);line-height:1.6">${l.desc}</div>
          </div>`).join('')}
      </div>
    </div>`;

  container.querySelector('#tab-compare').innerHTML = `
    <div class="compare-table-wrap">
      <div class="section-header">
        <div class="section-title">Lakehouse vs Data Warehouse vs Data Lake</div>
        <div class="section-desc">Why the Lakehouse wins for modern data stacks</div>
      </div>
      <table class="compare-table">
        <thead><tr>
          <th>Capability</th>
          <th>Data Lake (S3 + Parquet)</th>
          <th>Data Warehouse (Redshift/BQ)</th>
          <th>Lakehouse (Databricks)</th>
        </tr></thead>
        <tbody>
          <tr><td>Storage cost</td><td class="tag-good">Very low ($0.02/GB)</td><td class="tag-bad">High ($0.10-0.25/GB)</td><td class="tag-good">Very low ($0.02/GB)</td></tr>
          <tr><td>ACID transactions</td><td class="tag-bad">None</td><td class="tag-good">Full ACID</td><td class="tag-good">Full ACID (Delta)</td></tr>
          <tr><td>Schema enforcement</td><td class="tag-bad">None (data swamp)</td><td class="tag-good">Strict DDL</td><td class="tag-good">Enforced + evolution</td></tr>
          <tr><td>BI / SQL queries</td><td class="tag-warn">Possible (Athena/Presto)</td><td class="tag-good">Excellent</td><td class="tag-good">Excellent (Photon)</td></tr>
          <tr><td>ML / Python</td><td class="tag-good">Full access</td><td class="tag-bad">Very limited</td><td class="tag-good">Full (same tables)</td></tr>
          <tr><td>Streaming</td><td class="tag-warn">Manual complexity</td><td class="tag-bad">Batch only</td><td class="tag-good">First-class (Struct. Streaming)</td></tr>
          <tr><td>Data governance</td><td class="tag-bad">DIY</td><td class="tag-warn">Warehouse-scope only</td><td class="tag-good">Unity Catalog (cross-asset)</td></tr>
          <tr><td>Time travel</td><td class="tag-bad">None (S3 versioning = costly)</td><td class="tag-warn">Snapshots only</td><td class="tag-good">Built-in (Delta log)</td></tr>
          <tr><td>Open format</td><td class="tag-good">Yes (Parquet)</td><td class="tag-bad">Proprietary</td><td class="tag-good">Yes (Parquet + Delta)</td></tr>
          <tr><td>Data copies needed</td><td>1 (lake)</td><td>2 (lake + warehouse)</td><td class="tag-good">1 (unified)</td></tr>
        </tbody>
      </table>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'How does the Lakehouse differ from a traditional Kappa or Lambda architecture?',
      a: 'Lambda has a separate batch layer and speed layer — two codepaths, two sets of business logic to keep in sync. Kappa unifies them with streaming-only but requires reprocessing from a log for historical queries. The Lakehouse unifies by storing all data in Delta Lake tables that support both batch and streaming reads/writes via a single engine (Databricks), with no reprocessing required — historical data is already in the same format. Time travel gives you point-in-time queries without a separate batch layer.'
    },
    {
      q: 'What is the role of the Delta transaction log?',
      a: 'The _delta_log directory contains JSON files, one per commit, that record every change to the table (which Parquet files were added/removed, schema changes, statistics). Readers reconstruct the current table state by replaying the log. After 10 commits, a Parquet checkpoint file is written to speed up log replay. This log is the source of ACID guarantees, time travel, and audit history — it\'s what turns a directory of Parquet files into a managed table.'
    },
    {
      q: 'Why does the Lakehouse architecture reduce total cost compared to a two-tier lake+warehouse approach?',
      a: 'Two-tier architecture requires: (1) data stored twice — once in the lake, once loaded into the warehouse; (2) ETL pipelines to move and transform between layers; (3) compute for both the ETL and the warehouse query engine; (4) separate governance and cataloging tools for each tier. The Lakehouse eliminates ETL by serving all workloads from Delta tables directly. Storage is S3-priced. Compute is on-demand clusters that auto-terminate. Unity Catalog covers all assets. Result: 50–80% lower TCO for organizations that previously ran both a Redshift/BigQuery cluster and an S3 data lake.'
    },
  ]);
}
