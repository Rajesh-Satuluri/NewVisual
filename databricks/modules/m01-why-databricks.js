import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M01 · Foundation',
    title: 'Why Databricks',
    subtitle: 'From Spark\'s academic roots to the Lakehouse — why Databricks exists',
    tabs: [
      { id: 'origins',   label: '🎓 Origins' },
      { id: 'problem',   label: '⚠️ The Problem' },
      { id: 'lakehouse', label: '🏛️ The Solution' },
      { id: 'amazon',    label: '📦 Amazon Story' },
      { id: 'iq',        label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-origins').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">From Berkeley Lab to $43 Billion Company</div>
        <div class="section-desc">How a research project became the foundation of modern data engineering</div>
      </div>
      <div class="db-timeline">
        <div class="db-tl-item">
          <div class="db-tl-year">2009</div>
          <div class="db-tl-content">
            <strong>Apache Spark Born at Berkeley AMPLab</strong>
            <p>Matei Zaharia's PhD project: in-memory cluster computing 100× faster than MapReduce. Resilient Distributed Datasets (RDDs) enable fault-tolerant parallel computation without writing to disk between every step.</p>
          </div>
        </div>
        <div class="db-tl-item">
          <div class="db-tl-year">2013</div>
          <div class="db-tl-content">
            <strong>Spark Donated to Apache; Databricks Founded</strong>
            <p>The Berkeley team (Zaharia, Ion Stoica, Patrick Wendell, Reynold Xin, Andy Konwinski) spins out Databricks. Mission: build a managed platform so companies don't have to operate Spark clusters themselves.</p>
          </div>
        </div>
        <div class="db-tl-item">
          <div class="db-tl-year">2017</div>
          <div class="db-tl-content">
            <strong>Delta Lake Introduced</strong>
            <p>ACID transactions on object storage (S3, ADLS, GCS). Solves the "data swamp" problem — unreliable, inconsistent data lakes that required hours of repair after failures.</p>
          </div>
        </div>
        <div class="db-tl-item">
          <div class="db-tl-year">2020</div>
          <div class="db-tl-content">
            <strong>Lakehouse Paper Published</strong>
            <p>Databricks coins "Lakehouse" — a single platform combining the low cost and flexibility of a data lake with the reliability and performance of a data warehouse. One copy of data, all workloads.</p>
          </div>
        </div>
        <div class="db-tl-item">
          <div class="db-tl-year">2021</div>
          <div class="db-tl-content">
            <strong>Unity Catalog &amp; Photon Engine</strong>
            <p>Unity Catalog brings centralized governance across all data assets. Photon (vectorized C++ runtime) delivers 2–4× query speedup vs JVM Spark on SQL workloads — without changing SQL code.</p>
          </div>
        </div>
        <div class="db-tl-item">
          <div class="db-tl-year">2023</div>
          <div class="db-tl-content">
            <strong>$43B Valuation; MosaicML Acquisition</strong>
            <p>Databricks acquires MosaicML for $1.3B to add enterprise LLM training and serving. DBRX open-source model released. The platform expands to cover AI/ML at scale alongside its data engineering roots.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#tab-problem').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">The Data Architecture Problem</div>
        <div class="section-desc">Before Databricks: two systems, two copies of data, endless pain</div>
      </div>
      <div class="db-two-col">
        <div class="db-arch-box db-arch-bad">
          <div class="db-arch-title">❌ Legacy Two-System Architecture</div>
          <div class="db-arch-diagram">
            <div class="db-arch-node">Data Lake (S3)<br/><small>cheap, flexible, unreliable</small></div>
            <div class="db-arch-arrow">↕ ETL jobs (hours of pipeline)</div>
            <div class="db-arch-node">Data Warehouse<br/><small>fast, reliable, expensive</small></div>
          </div>
          <ul class="db-prob-list">
            <li>🔁 Data copied twice — stale, inconsistent</li>
            <li>💸 Warehouse costs 10–100× lake storage</li>
            <li>📊 BI on warehouse; ML on lake — different tools</li>
            <li>🐛 ETL pipeline failures corrupt warehouse silently</li>
            <li>⏱️ Hours of downtime to recover from bad loads</li>
            <li>🚫 No time travel — can't replay or audit history</li>
          </ul>
        </div>
        <div class="db-arch-box db-arch-good">
          <div class="db-arch-title">✅ Lakehouse Architecture</div>
          <div class="db-arch-diagram">
            <div class="db-arch-node">Object Storage (S3)<br/><small>Delta Lake tables</small></div>
            <div class="db-arch-row">
              <div class="db-arch-mini">SQL / BI</div>
              <div class="db-arch-mini">ML / AI</div>
              <div class="db-arch-mini">Streaming</div>
            </div>
          </div>
          <ul class="db-prob-list">
            <li>✓ One copy of data — all workloads read the same files</li>
            <li>✓ ACID transactions — no corrupt partial writes</li>
            <li>✓ Time travel — query any historical snapshot</li>
            <li>✓ Schema enforcement — bad data rejected at write</li>
            <li>✓ 10× cheaper than warehouse at same reliability</li>
            <li>✓ BI, ML, streaming from one platform</li>
          </ul>
        </div>
      </div>
      <div class="db-callout">
        <strong>The Core Insight:</strong> The gap between data lake and data warehouse is not about storage format — it's about the metadata layer. Delta Lake adds a transaction log on top of Parquet files, turning a "dumb" S3 bucket into an ACID-compliant table store.
      </div>
    </div>
  `;

  container.querySelector('#tab-lakehouse').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">The Databricks Lakehouse Platform</div>
        <div class="section-desc">Three layers that work together: Storage, Compute, Governance</div>
      </div>
      <div class="db-platform">
        <div class="db-platform-layer db-layer-gov">
          <div class="db-layer-label">Governance</div>
          <div class="db-layer-items">
            <div class="db-layer-item">Unity Catalog</div>
            <div class="db-layer-item">Delta Sharing</div>
            <div class="db-layer-item">Data Lineage</div>
          </div>
        </div>
        <div class="db-platform-layer db-layer-compute">
          <div class="db-layer-label">Compute</div>
          <div class="db-layer-items">
            <div class="db-layer-item">All-Purpose Clusters</div>
            <div class="db-layer-item">Job Clusters</div>
            <div class="db-layer-item">SQL Warehouses (Photon)</div>
            <div class="db-layer-item">Model Serving</div>
          </div>
        </div>
        <div class="db-platform-layer db-layer-storage">
          <div class="db-layer-label">Storage</div>
          <div class="db-layer-items">
            <div class="db-layer-item">Delta Lake (ACID)</div>
            <div class="db-layer-item">Parquet on S3/ADLS/GCS</div>
            <div class="db-layer-item">Transaction Log</div>
          </div>
        </div>
      </div>
      <div class="db-stat-grid">
        <div class="db-stat-card"><div class="db-stat-num">100×</div><div class="db-stat-lbl">Spark vs MapReduce (in-memory)</div></div>
        <div class="db-stat-card"><div class="db-stat-num">2–4×</div><div class="db-stat-lbl">Photon speedup vs JVM Spark</div></div>
        <div class="db-stat-card"><div class="db-stat-num">10×</div><div class="db-stat-lbl">Cheaper than dedicated warehouse</div></div>
        <div class="db-stat-card"><div class="db-stat-num">$0</div><div class="db-stat-lbl">Cost when cluster is off</div></div>
      </div>
    </div>
  `;

  container.querySelector('#tab-amazon').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Amazon's Data Platform at Scale</div>
        <div class="section-desc">How Amazon uses the Databricks Lakehouse for its data engineering workloads</div>
      </div>
      <div class="db-hero-row">
        <div class="db-hero-stat"><div class="db-hero-num">500 PB+</div><div class="db-hero-lbl">Data in Amazon's Lakehouse</div></div>
        <div class="db-hero-stat"><div class="db-hero-num">50,000+</div><div class="db-hero-lbl">Daily Databricks jobs</div></div>
        <div class="db-hero-stat"><div class="db-hero-num">3 zones</div><div class="db-hero-lbl">Bronze / Silver / Gold</div></div>
      </div>
      <div class="db-story-flow">
        <div class="db-story-step">
          <div class="db-step-num">1</div>
          <div class="db-step-body">
            <strong>Raw ingestion → Bronze (S3)</strong>
            <p>Kafka topics (orders, clicks, inventory) land as Delta tables in S3. Auto-loader picks up new files within seconds. Schema is stored as-is — no transformation yet. Bronze retains history forever for audit and replay.</p>
          </div>
        </div>
        <div class="db-story-step">
          <div class="db-step-num">2</div>
          <div class="db-step-body">
            <strong>Clean &amp; Conform → Silver (S3)</strong>
            <p>Structured Streaming jobs deduplicate, validate types, and join dimension tables. An iPhone 15 Pro order (AMZ-24601) gets enriched with product catalog data, customer tier (Prime), and regional warehouse assignment.</p>
          </div>
        </div>
        <div class="db-story-step">
          <div class="db-step-num">3</div>
          <div class="db-step-body">
            <strong>Aggregate → Gold (S3)</strong>
            <p>Pre-aggregated tables power dashboards: hourly GMV by category, Prime conversion rate, fulfillment SLA breach rate. Gold tables are optimized with ZORDER on (date, category_id) for fast BI queries via SQL Warehouse + Photon.</p>
          </div>
        </div>
        <div class="db-story-step">
          <div class="db-step-num">4</div>
          <div class="db-step-body">
            <strong>ML on Silver → Model Serving</strong>
            <p>Recommendation model trained on Silver-level order history. MLflow tracks 200+ experiments. Winning model registered in Unity Catalog and served via a real-time endpoint (P99 &lt;50ms) for the product page.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What problem does Databricks solve that vanilla Apache Spark on EMR does not?',
      a: 'Databricks adds the managed control plane on top of Spark: collaborative notebooks, one-click cluster management, built-in Delta Lake (ACID + schema enforcement), Unity Catalog (governance), MLflow (experiment tracking), and Photon (C++ vectorized runtime). On raw EMR you manage all of this yourself — patching Spark versions, writing custom job schedulers, implementing your own governance. The platform dramatically reduces operational overhead and adds reliability guarantees that Spark alone cannot provide.'
    },
    {
      q: 'Why is the Lakehouse better than a separate data lake + data warehouse?',
      a: 'A two-system architecture requires ETL pipelines to move data from lake to warehouse — creating staleness, duplication, and a new failure surface. The Lakehouse stores one copy of data as Delta Lake tables on object storage. All workloads (SQL analytics, ML training, streaming) read the same files through a unified compute layer. This eliminates the ETL step, cuts storage costs (object storage is 10× cheaper than warehouse storage), and ensures everyone works with the same version of truth.'
    },
    {
      q: 'What is a Databricks Unit (DBU) and how is cost controlled?',
      a: 'A DBU is Databricks\' billing unit — a normalized measure of processing capacity per hour. Cost = DBUs consumed × price per DBU (varies by cloud, cluster type, and tier). Key cost controls: (1) auto-termination — idle clusters shut down automatically; (2) spot instances for batch jobs reduce cost 60–80%; (3) SQL Warehouses auto-suspend when idle; (4) cluster policies enforce max node counts; (5) job clusters (ephemeral) vs all-purpose clusters (shared but billed per use). Photon reduces job duration, indirectly reducing total DBUs consumed.'
    },
    {
      q: 'How does Databricks ensure ACID guarantees on object storage (S3)?',
      a: 'Delta Lake implements ACID via a transaction log — a directory of JSON commit files at _delta_log/. Every write (INSERT, UPDATE, DELETE, MERGE) appends a new commit file describing the operation atomically. Readers always check the log to determine which Parquet data files are valid for their snapshot. Conflicts between concurrent writers are detected via optimistic concurrency control — if two writers both try to modify overlapping files, one gets a ConcurrentModificationException and must retry. S3\'s strong read-after-write consistency (since 2020) makes this reliable without external locking.'
    },
  ]);

  const style = document.createElement('style');
  style.textContent = `
    .db-timeline { display:flex; flex-direction:column; gap:0; }
    .db-tl-item { display:flex; gap:20px; padding:16px 0 16px 20px; border-left:2px solid var(--border); margin-left:44px; position:relative; }
    .db-tl-item::before { content:''; position:absolute; left:-7px; top:22px; width:12px; height:12px; border-radius:50%; background:var(--accent); }
    .db-tl-year { font-size:12px; font-weight:700; color:var(--accent); min-width:36px; margin-top:2px; margin-left:-56px; }
    .db-tl-content strong { display:block; margin-bottom:4px; color:var(--text); }
    .db-tl-content p { font-size:13px; color:var(--text2); line-height:1.6; }
    .db-two-col { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
    .db-arch-box { border-radius:12px; padding:20px; }
    .db-arch-bad { background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.3); }
    .db-arch-good { background:rgba(16,185,129,.08); border:1px solid rgba(16,185,129,.3); }
    .db-arch-title { font-weight:700; margin-bottom:14px; font-size:13px; }
    .db-arch-diagram { background:var(--bg3); border-radius:8px; padding:12px; margin-bottom:14px; display:flex; flex-direction:column; align-items:center; gap:8px; }
    .db-arch-node { background:var(--bg2); border:1px solid var(--border); border-radius:8px; padding:8px 16px; text-align:center; font-size:13px; font-weight:600; width:100%; }
    .db-arch-node small { display:block; font-weight:400; color:var(--text2); font-size:11px; }
    .db-arch-arrow { font-size:11px; color:var(--text3); }
    .db-arch-row { display:flex; gap:6px; width:100%; }
    .db-arch-mini { flex:1; background:var(--bg2); border:1px solid var(--border); border-radius:6px; padding:6px; text-align:center; font-size:11px; }
    .db-prob-list { list-style:none; display:flex; flex-direction:column; gap:6px; }
    .db-prob-list li { font-size:12px; color:var(--text2); }
    .db-callout { background:rgba(255,54,33,.08); border:1px solid rgba(255,54,33,.3); border-radius:10px; padding:14px 18px; font-size:13px; line-height:1.6; margin-top:16px; }
    .db-platform { display:flex; flex-direction:column; gap:8px; margin-bottom:24px; }
    .db-platform-layer { border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:16px; }
    .db-layer-gov { background:rgba(139,92,246,.1); border:1px solid rgba(139,92,246,.3); }
    .db-layer-compute { background:rgba(59,130,246,.1); border:1px solid rgba(59,130,246,.3); }
    .db-layer-storage { background:rgba(255,54,33,.1); border:1px solid rgba(255,54,33,.3); }
    .db-layer-label { font-weight:700; font-size:11px; min-width:80px; text-transform:uppercase; letter-spacing:.06em; color:var(--text2); }
    .db-layer-items { display:flex; gap:8px; flex-wrap:wrap; }
    .db-layer-item { font-size:12px; background:var(--bg3); border-radius:6px; padding:4px 10px; border:1px solid var(--border); }
    .db-stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    .db-stat-card { background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:16px; text-align:center; }
    .db-stat-num { font-size:24px; font-weight:800; color:var(--accent); }
    .db-stat-lbl { font-size:11px; color:var(--text3); margin-top:4px; }
    .db-hero-row { display:flex; gap:12px; margin-bottom:24px; }
    .db-hero-stat { flex:1; background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:16px; text-align:center; }
    .db-hero-num { font-size:22px; font-weight:800; color:var(--accent); }
    .db-hero-lbl { font-size:11px; color:var(--text3); margin-top:4px; }
    .db-story-flow { display:flex; flex-direction:column; gap:12px; }
    .db-story-step { display:flex; gap:16px; background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:16px; }
    .db-step-num { width:28px; height:28px; border-radius:50%; background:var(--accent); color:#fff; font-weight:800; font-size:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .db-step-body strong { display:block; margin-bottom:4px; }
    .db-step-body p { font-size:13px; color:var(--text2); line-height:1.6; }
    @media(max-width:680px){ .db-two-col,.db-stat-grid,.db-hero-row { grid-template-columns:1fr; flex-direction:column; } }
  `;
  container.appendChild(style);
}
