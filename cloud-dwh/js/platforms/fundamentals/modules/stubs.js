/* fundamentals platform — Iteration 0 module skeleton (bucketed under
   CDWH.P.fundamentals). Each stub previews the concept and the three-way
   Snowflake / Redshift / Fabric mapping that Iteration 1 will flesh out. */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {}); viz.P = viz.P || {};
  viz.P.fundamentals = viz.P.fundamentals || {};
  const B = (viz.P.fundamentals.Modules = viz.P.fundamentals.Modules || {});
  function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  function makeStub(m) {
    return { render(canvas) {
      const bullets = (m.bullets || []).map(b => `<li>${esc(b)}</li>`).join('');
      const map = m.map ? `
        <div class="stub-section" style="margin-top:1rem">
          <div class="stub-section-title">How the three clouds handle it</div>
          <ul class="stub-list">
            <li><strong>Snowflake</strong> — ${esc(m.map.sf)}</li>
            <li><strong>Redshift</strong> — ${esc(m.map.rs)}</li>
            <li><strong>Fabric</strong> — ${esc(m.map.fb)}</li>
          </ul>
        </div>` : '';
      canvas.innerHTML = `
        <div class="mod-page stub-page">
          <div class="stub-head">
            <div class="stub-icon">${m.icon}</div>
            <div><h1 class="stub-title">${esc(m.label)}</h1><p class="stub-purpose">${esc(m.purpose)}</p></div>
            <span class="stub-badge">Iteration 1</span>
          </div>
          <div class="stub-section">
            <div class="stub-section-title">Planned content</div>
            <ul class="stub-list">${bullets}</ul>
          </div>
          ${map}
          <p class="stub-foot">Skeleton module — the vendor-neutral explainer, animated diagram and doc-verified mapping land in Iteration 1.</p>
        </div>`;
      return { destroy() {} };
    } };
  }

  const STUBS = {
    /* 🏛️ Foundations */
    "fundOlapOltp": { label: "OLAP vs OLTP", icon: "📊", purpose: "What a warehouse is for — analytics (OLAP) vs transactions (OLTP).",
      bullets: ["Why analytics needs a different engine than apps", "Read-heavy, column-shaped, set-based workloads"],
      map: { sf: "cloud OLAP engine, no OLTP", rs: "cloud OLAP engine on AWS", fb: "Warehouse (OLAP) + OLTP sources via mirroring" } },
    "fundArchitecture": { label: "MPP & Decoupled Compute", icon: "🏛️", purpose: "Massively parallel processing and separating storage from compute.",
      bullets: ["Shared-nothing MPP vs decoupled storage/compute", "Why elastic compute changed cloud warehousing"],
      map: { sf: "virtual warehouses over shared storage", rs: "RA3 + Redshift Managed Storage", fb: "OneLake storage + SQL compute (CU)" } },
    "fundColumnar": { label: "Columnar Storage", icon: "🧱", purpose: "Why warehouses store data by column and compress it hard.",
      bullets: ["Column vs row layout for analytics", "Encoding & compression basics"],
      map: { sf: "micro-partitions (columnar)", rs: "columnar blocks + encodings (AZ64…)", fb: "Parquet/Delta columnar in OneLake" } },

    /* 🟡 How Data Gets In */
    "fundIngestOverview": { label: "Ingestion Big Picture", icon: "🔄", purpose: "The path data takes: sources → stage → load → serve.",
      bullets: ["The universal ingestion pipeline", "Where batch, streaming and CDC each fit"],
      map: { sf: "stages → COPY / Snowpipe", rs: "S3 → COPY / streaming ingestion", fb: "OneLake shortcuts / pipelines / eventstreams" } },
    "fundIngestBatch": { label: "Batch & Bulk Load", icon: "📦", purpose: "Loading files in bulk — the workhorse of warehouse ingestion.",
      bullets: ["Staging files and bulk COPY", "File sizing, formats and parallel load"],
      map: { sf: "external/internal stages + COPY INTO", rs: "COPY from S3 (+ auto-compression)", fb: "COPY INTO / Data pipelines / Dataflows" } },
    "fundIngestStreaming": { label: "Streaming / Real-Time", icon: "🌊", purpose: "Getting fresh events in continuously, not in nightly batches.",
      bullets: ["Micro-batch vs true streaming", "Latency, ordering and throughput trade-offs"],
      map: { sf: "Snowpipe Streaming", rs: "streaming ingestion from Kinesis / MSK", fb: "Eventstreams / Real-Time Intelligence" } },
    "fundIngestCdc": { label: "CDC & Mirroring", icon: "🔁", purpose: "Keeping the warehouse in sync with operational databases.",
      bullets: ["Change Data Capture patterns", "Replication & near-real-time mirroring"],
      map: { sf: "Streams & Tasks (change tracking)", rs: "CDC via DMS / zero-ETL patterns", fb: "Database Mirroring (near real-time)" } },
    "fundElt": { label: "ETL vs ELT", icon: "⚙️", purpose: "Transform before loading, or load then transform in the warehouse?",
      bullets: ["ETL vs ELT and why ELT won in the cloud", "Where transformation runs and costs money"],
      map: { sf: "ELT with SQL / Snowpark / Dynamic Tables", rs: "ELT with SQL / stored procs / dbt", fb: "ELT with pipelines, notebooks, T-SQL" } },

    /* ⚡ Performance Mechanics */
    "fundDistribution": { label: "Distribution & Partitioning", icon: "🗂️", purpose: "How data is physically spread so parallel compute stays balanced.",
      bullets: ["Distributing rows across nodes/slices", "Partitioning & clustering for locality"],
      map: { sf: "automatic micro-partitions + clustering keys", rs: "distribution styles (KEY/EVEN/ALL/AUTO)", fb: "engine-managed distribution over Parquet" } },
    "fundPruning": { label: "Data Skipping & Pruning", icon: "🔍", purpose: "Reading less: skip blocks that can't match the query.",
      bullets: ["Min/max metadata & zone maps", "How clustering improves pruning"],
      map: { sf: "micro-partition min/max pruning", rs: "zone maps + sort keys", fb: "Parquet row-group / Delta stats skipping" } },
    "fundScaling": { label: "Elastic Compute & Concurrency", icon: "⚡", purpose: "Scaling compute up/out and isolating competing workloads.",
      bullets: ["Scale up vs scale out vs auto-scale", "Workload isolation & concurrency handling"],
      map: { sf: "multi-cluster virtual warehouses", rs: "concurrency scaling + WLM / serverless", fb: "capacity (CU) + workload management" } },
    "fundCaching": { label: "Caching & Result Reuse", icon: "💾", purpose: "Skipping work entirely by reusing recent results and data.",
      bullets: ["Result cache vs data/local cache", "When a cached answer is safe to reuse"],
      map: { sf: "result cache + warehouse cache", rs: "leader-node result cache", fb: "result set caching / Direct Lake caching" } },

    /* 📐 Data & Modeling */
    "fundModeling": { label: "Dimensional Modeling", icon: "⭐", purpose: "Star & snowflake schemas — the shape analytics data takes.",
      bullets: ["Facts, dimensions, star vs snowflake", "Grain, keys and slowly-changing dimensions"],
      map: { sf: "star schemas on relational tables", rs: "star schemas + dist/sort tuned to joins", fb: "star schemas + semantic model for BI" } },
    "fundLakehouse": { label: "Open Formats & Lakehouse", icon: "🧊", purpose: "Querying open table formats in the lake — Iceberg / Delta.",
      bullets: ["Open table formats (Iceberg, Delta, Hudi)", "Warehouse vs lakehouse convergence"],
      map: { sf: "Iceberg tables + external tables", rs: "Spectrum / lake queries over S3", fb: "Lakehouse + Direct Lake over Delta" } },

    /* 🛡️ Operations */
    "fundGovernance": { label: "Governance & Security", icon: "🔐", purpose: "Who can see what — RBAC, masking and row/column security.",
      bullets: ["RBAC model & least privilege", "Masking, row-level & column-level security"],
      map: { sf: "RBAC + masking + row access policies", rs: "IAM/DB roles + RLS/CLS + Lake Formation", fb: "roles + RLS/CLS/DDM + Purview" } },
    "fundCost": { label: "Cost Models & Tuning", icon: "💰", purpose: "What you actually pay for, and how to pay less.",
      bullets: ["Credits vs node-hours vs capacity units", "Levers: sizing, auto-suspend, pruning"],
      map: { sf: "per-second credits by warehouse size", rs: "RA3 node-hours / serverless RPU-hours", fb: "Fabric capacity (F-SKU) CUs" } },
  };

  Object.entries(STUBS).forEach(([k, m]) => { B[k] = makeStub(m); });

  /* Landing — skeleton overview of the whole section */
  B.foundationsHome = { render(canvas) {
    const groups = (viz.P.fundamentals.navGroups || []).filter(g => g.items[0].id !== 'foundations-home');
    const cards = groups.map(g => `
      <div class="home-module-card" style="cursor:default">
        <div class="home-module-card-title">${g.label}</div>
        <ul class="stub-list" style="margin:.5rem 0 0">${g.items.map(i => `<li>${i.icon} ${esc(i.label)}</li>`).join('')}</ul>
      </div>`).join('');
    canvas.innerHTML = `
      <div class="mod-page">
        <div class="home-hero">
          <div class="home-hero-badge">Fundamentals · Skeleton (Iteration 0)</div>
          <h1 class="home-hero-title">The Fundamentals of Data Warehousing</h1>
          <p class="home-hero-sub">Learn each core concept once — then see how Snowflake, Redshift and Fabric each handle it. Special focus on <strong>how data gets into the warehouse</strong>.</p>
        </div>
        <div class="home-modules-grid" style="margin-top:1.5rem">${cards}</div>
        <p class="stub-foot" style="text-align:center;margin-top:1.5rem">Use the sidebar to open any concept. Full explainers, diagrams and doc-verified mappings arrive in Iteration 1.</p>
      </div>`;
    return { destroy() {} };
  } };
})();
