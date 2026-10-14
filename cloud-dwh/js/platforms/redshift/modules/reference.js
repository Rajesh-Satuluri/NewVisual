/* ============================================================
   Redshift — Reference: glossary/cheat-sheet, comparison matrix,
   AWS certification map, and an end-to-end capstone flow.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const Kit = viz.RedshiftKit;
  viz.P = viz.P || {}; viz.P.redshift = viz.P.redshift || {};
  const B = (viz.P.redshift.Modules = viz.P.redshift.Modules || {});

  /* ── Glossary & cheat sheet ─────────────────────────────── */
  const GLOSSARY = [
    ['Leader node', 'Parses, plans, compiles to C++, and does final aggregation. Clients connect only here.'],
    ['Compute node', 'Executes compiled segments over its data shard; divided into slices.'],
    ['Slice', 'Unit of parallelism on a compute node (own memory/disk). Count fixed by node type.'],
    ['RA3', 'Current node family that separates compute from Redshift Managed Storage (RMS).'],
    ['RMS', 'Redshift Managed Storage — S3-backed, auto-scaling storage billed separately from compute.'],
    ['RPU', 'Redshift Processing Unit (Serverless); 1 RPU = 16 GB memory, billed per second while active.'],
    ['Zone map', 'Per-1 MB-block min/max metadata enabling range-restricted block skipping.'],
    ['Distribution style', 'KEY / EVEN / ALL / AUTO — decides which slice stores each row.'],
    ['Sort key', 'Physical row order; compound (prefix) or interleaved (≤8 cols, equal weight).'],
    ['WLM', 'Workload Management — queues with memory/concurrency; Automatic WLM manages it for you.'],
    ['Concurrency scaling', 'Transient clusters that absorb query bursts; daily free credits apply.'],
    ['Spectrum', 'Query data in S3 in place via external tables; billed by data scanned.'],
    ['Datashare', 'Live, read-only cross-cluster/cross-account data access with no copies.'],
    ['SUPER / PartiQL', 'Semi-structured (JSON) type and the SQL extension to query it.'],
  ];
  const CHEATS = [
    ['Set distribution & sort', 'CREATE TABLE t (...) DISTSTYLE KEY DISTKEY (user_id) COMPOUND SORTKEY (event_date);'],
    ['Recommend encodings', 'ANALYZE COMPRESSION t;'],
    ['Reclaim & re-sort', 'VACUUM FULL t;   -- interleaved: VACUUM REINDEX t;'],
    ['Refresh stats', 'ANALYZE t;'],
    ['Fast load from S3', "COPY t FROM 's3://bucket/prefix/' IAM_ROLE 'arn:...' FORMAT AS PARQUET;"],
    ['Inspect a plan', 'EXPLAIN SELECT ...;   -- look for DS_DIST_NONE vs DS_DIST_BOTH'],
    ['External schema (Spectrum)', "CREATE EXTERNAL SCHEMA s FROM DATA CATALOG DATABASE 'db' IAM_ROLE 'arn:...';"],
    ['Materialized view', 'CREATE MATERIALIZED VIEW mv AUTO REFRESH YES AS SELECT ...;'],
  ];
  B.reference = { render(canvas) {
    canvas.innerHTML = '';
    const page = document.createElement('div'); page.className = 'mod-page';
    page.innerHTML = '<div class="mod-header"><div class="mod-eyebrow">📚 Reference</div>' +
      '<h1 class="mod-title">Glossary &amp; Cheat Sheet</h1>' +
      '<p class="mod-subtitle">Quick reference for the core Redshift terms and the commands you reach for most.</p></div>' +
      '<div class="section-title">Glossary</div>' +
      '<div class="rk-ref-grid">' + GLOSSARY.map(([t, d]) =>
        '<div class="rk-ref-item"><div class="rk-ref-term">' + t + '</div><div class="rk-ref-def">' + d + '</div></div>').join('') + '</div>' +
      '<div class="section-title" style="margin-top:2rem;">Cheat sheet</div>' +
      '<div class="rk-ref-cheats">' + CHEATS.map(([t, c]) =>
        '<div class="rk-cheat"><div class="rk-cheat-label">' + t + '</div><pre class="rk-cheat-code"><code>' +
        c.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</code></pre></div>').join('') + '</div>';
    canvas.appendChild(page);
    return { destroy() {} };
  }};

  /* ── Comparison matrix ──────────────────────────────────── */
  const COLS = ['Dimension', 'Amazon Redshift', 'Snowflake', 'Google BigQuery', 'Microsoft Fabric'];
  const ROWS = [
    ['Model', 'Provisioned MPP + Serverless', 'Multi-cluster shared data', 'Serverless (Dremel)', 'SaaS / OneLake'],
    ['Compute/storage', 'Separated on RA3 (RMS)', 'Fully separated', 'Fully separated', 'Separated (OneLake)'],
    ['Storage format', 'Columnar 1 MB blocks', 'Micro-partitions', 'Capacitor columnar', 'Delta (Parquet)'],
    ['Data skipping', 'Zone maps + sort keys', 'Partition metadata + clustering', 'Automatic', 'V-Order + stats'],
    ['Scaling', 'Resize / concurrency scaling', 'Instant warehouse resize/multi-cluster', 'Automatic slots', 'Capacity (CU) autoscale'],
    ['Query the lake', 'Spectrum (S3)', 'External tables', 'External/BigLake', 'Shortcuts / Direct Lake'],
    ['Sharing', 'Datashares', 'Secure data sharing', 'Authorized views/Analytics Hub', 'OneLake sharing'],
    ['In-DB ML', 'Redshift ML (SageMaker)', 'Snowpark ML / Cortex', 'BigQuery ML', 'Fabric ML / Copilot'],
    ['Pricing', 'Node-hours or RPU-sec', 'Credit-second', 'Per-TB scanned or slots', 'Capacity (CU) + storage'],
  ];
  B.comparison = { render(canvas) {
    canvas.innerHTML = '';
    const page = document.createElement('div'); page.className = 'mod-page';
    page.innerHTML = '<div class="mod-header"><div class="mod-eyebrow">🔬 Reference</div>' +
      '<h1 class="mod-title">Redshift vs the Field</h1>' +
      '<p class="mod-subtitle">How Amazon Redshift compares with Snowflake, BigQuery, and Microsoft Fabric across the dimensions that matter in interviews and design reviews.</p></div>' +
      '<div class="rk-table-wrap"><table class="rk-table"><thead><tr>' +
      COLS.map((c, i) => '<th' + (i === 1 ? ' class="rk-th-accent"' : '') + '>' + c + '</th>').join('') +
      '</tr></thead><tbody>' +
      ROWS.map(r => '<tr>' + r.map((c, i) =>
        (i === 0 ? '<td class="rk-td-dim">' + c + '</td>' : '<td' + (i === 1 ? ' class="rk-td-accent"' : '') + '>' + c + '</td>')).join('') + '</tr>').join('') +
      '</tbody></table></div>' +
      '<div class="rk-takeaways" style="margin-top:1.5rem;"><div class="rk-takeaways-title">How to pick</div><ul>' +
      '<li><strong>Redshift</strong> — deep AWS integration (S3, Glue, Lake Formation, SageMaker); great when your stack is on AWS.</li>' +
      '<li><strong>Snowflake</strong> — cross-cloud, effortless multi-cluster concurrency and sharing.</li>' +
      '<li><strong>BigQuery</strong> — fully serverless, pay-per-scan, strong for GCP + ad-hoc.</li>' +
      '<li><strong>Fabric</strong> — Microsoft/Power BI shops wanting one SaaS lake (OneLake) + Direct Lake BI.</li>' +
      '</ul></div>';
    canvas.appendChild(page);
    return { destroy() {} };
  }};

  /* ── AWS certification map ──────────────────────────────── */
  const CERT = [
    ['Data ingestion & storage', ['copy-unload', 'ra3-managed-storage', 'columnar-storage', 'spectrum'], 'COPY/UNLOAD, RA3 & RMS, columnar storage, Spectrum external tables'],
    ['Data modeling & performance', ['distribution-styles', 'sort-keys', 'compression', 'materialized-views', 'query-execution'], 'Distribution & sort keys, encodings, MVs, query execution'],
    ['Operations & optimization', ['wlm', 'concurrency-scaling', 'vacuum-analyze', 'result-caching', 'cost-performance'], 'WLM, concurrency scaling, maintenance, caching, cost'],
    ['Security & governance', ['iam-rbac', 'kms-encryption', 'lake-formation'], 'IAM & RBAC, KMS encryption, Lake Formation'],
    ['Analytics & ML', ['redshift-ml', 'super-partiql', 'federated-query', 'datashares'], 'Redshift ML, SUPER/PartiQL, federated query, datashares'],
  ];
  B.certification = { render(canvas) {
    canvas.innerHTML = '';
    const page = document.createElement('div'); page.className = 'mod-page';
    page.innerHTML = '<div class="mod-header"><div class="mod-eyebrow">🎓 Reference</div>' +
      '<h1 class="mod-title">AWS Certification Map</h1>' +
      '<p class="mod-subtitle">Redshift is central to the <strong>AWS Certified Data Engineer – Associate (DEA-C01)</strong> exam (the former Data Analytics – Specialty, DAS-C01, was retired in 2024). Map each study area to the modules in this tool.</p></div>' +
      CERT.map(([area, ids, blurb]) =>
        '<div class="home-module-group"><div class="home-module-group-title">' + area + '</div>' +
        '<p class="home-wh-purpose">' + blurb + '</p>' +
        '<div class="rk-chiprow">' + ids.map(id =>
          '<button class="rk-chip" data-go="' + id + '">' + id + '</button>').join('') + '</div></div>').join('');
    canvas.appendChild(page);
    page.querySelectorAll('.rk-chip').forEach(b => b.addEventListener('click', () => viz.navigate && viz.navigate(b.dataset.go)));
    return { destroy() {} };
  }};

  /* ── End-to-end capstone (kit-driven) ───────────────────── */
  B.e2eFlow = (Kit ? Kit.makeModule({
    eyebrow: '🎯 Reference', title: 'End-to-End Capstone Flow',
    subtitle: 'Follow a Netflix-style analytics request from raw events in S3 to a fast dashboard, touching every layer you\'ve learned. Press Play.',
    stage: { caption: 'Raw events → governed insight',
      groups: [
        { id: 'ingest', label: '1 · Ingest', nodes: [{ id: 'copy', label: 'COPY from S3', sub: 'split files' }, { id: 'spectrum', label: 'Spectrum', sub: 'cold history' }], connectorAfter: 'stage' },
        { id: 'model', label: '2 · Model', nodes: [{ id: 'dist', label: 'DISTKEY (join)' }, { id: 'sort', label: 'SORTKEY (date)' }, { id: 'enc', label: 'Encodings' }], connectorAfter: 'query' },
        { id: 'serve', label: '3 · Serve & scale', nodes: [{ id: 'mv', label: 'Materialized views' }, { id: 'cache', label: 'Result cache' }, { id: 'cs', label: 'Concurrency scaling' }], connectorAfter: 'govern' },
        { id: 'govern', label: '4 · Govern & share', nodes: [{ id: 'rbac', label: 'RBAC' }, { id: 'share', label: 'Datashare' }] },
      ] },
    steps: [
      { label: 'Ingest', title: 'Land the data', on: { spot: ['ingest'], flow: ['copy', 'spectrum'] },
        body: 'Load hot 90 days with parallel <code>COPY</code> (slice-aligned files); leave cold history in S3 and read via Spectrum.',
        facts: ['COPY parallelizes by file across slices', 'Spectrum queries cold S3 data in place'] },
      { label: 'Model', title: 'Model for performance', on: { spot: ['model'], flow: ['dist', 'sort', 'enc'] },
        body: 'Distribute the fact on its join key, sort on the dominant date filter, replicate small dims (ALL), and let COPY auto-compress.',
        facts: ['DISTKEY co-locates joins (DS_DIST_NONE)', 'SORTKEY powers zone-map pruning'] },
      { label: 'Serve', title: 'Keep dashboards fast', on: { spot: ['serve'], flow: ['mv', 'cache', 'cs'] },
        body: 'Precompute aggregates with materialized views, serve repeats from the result cache, and absorb the 9am burst with concurrency scaling.',
        facts: ['MVs cut repeated heavy aggregation', 'Concurrency scaling clears queue bursts'] },
      { label: 'Govern', title: 'Govern & share', on: { spot: ['govern'], flow: ['rbac', 'share'] },
        body: 'Enforce least-privilege RBAC (column/row-level where needed) and share curated tables cross-account with a datashare — no copies.',
        facts: ['RBAC roles + column/row-level security', 'Datashares give live read-only access'] },
    ],
    takeaways: [
      'One request exercises ingest → model → serve → govern end to end',
      'Each stage maps to a module you studied — this is the interview capstone',
      'Design for less I/O (dist/sort), fast serving (MV/cache/CS), and safe sharing (RBAC/datashare)',
    ],
  }) : { render(c) { c.innerHTML = '<div class="placeholder-msg"><p>Kit unavailable.</p></div>'; return { destroy() {} }; } });
})();
