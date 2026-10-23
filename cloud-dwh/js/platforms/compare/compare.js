/* ============================================================
   Compare — Snowflake vs Redshift vs Fabric.
   Overview matrix + six side-by-side deep-dives + an animated
   "Watch It Run" — registered into CDWH.P.compare.Modules.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.compare = viz.P.compare || {};
  const B = (viz.P.compare.Modules = viz.P.compare.Modules || {});
  const Kit = viz.RedshiftKit;

  function esc(s) { return String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }

  const NAMES = { sf: 'Snowflake', rs: 'Amazon Redshift', fb: 'Microsoft Fabric' };

  /* ── Side-by-side concept content ───────────────────────── */
  const CONCEPTS = {
    'architecture': {
      title: 'Architecture', icon: '🏛️',
      intro: 'All three separate storage from compute — but they provision and bill that compute very differently: Snowflake\'s virtual warehouses, Redshift\'s nodes/slices (or Serverless RPUs), and Fabric\'s shared capacity.',
      takeaway: 'Compute/storage separation is universal now. The real difference is the compute unit: independent <b>virtual warehouses</b> (Snowflake), <b>MPP nodes & slices</b> or RPUs (Redshift), or one <b>shared capacity</b> in CUs across all workloads (Fabric).',
      sf: { points: ['Three layers: cloud services, virtual warehouses, storage', 'Each virtual warehouse is independent compute over shared data', 'Multi-cluster warehouses isolate workloads', 'Per-second credit billing; auto-suspend/resume'] },
      rs: { points: ['Leader node + compute nodes divided into slices (MPP)', 'RA3 separates compute from Redshift Managed Storage (S3)', 'Provisioned clusters or Serverless (RPUs)', 'Slice count fixed by node type'] },
      fb: { points: ['Unified SaaS; distributed engine over OneLake', 'Compute = one capacity (CUs) shared by every workload', 'Warehouse (T-SQL) and Lakehouse (Spark) share storage', 'Bursting + smoothing instead of cluster sizing'] },
    },
    'storage': {
      title: 'Storage & Data Skipping', icon: '🗄️',
      intro: 'Every engine is columnar and skips data using per-chunk metadata — they differ in chunk size, how skipping is tuned, and (crucially) how open the format is.',
      takeaway: 'All prune via columnar metadata. <b>Fabric is open Delta/Parquet</b> (one copy for all engines); Snowflake micro-partitions and Redshift blocks are engine-managed (Snowflake now also reads/writes Iceberg). Tuning differs: clustering keys vs sort keys vs V-Order.',
      sf: { points: ['Auto-created micro-partitions (~16 MB)', 'Per-partition min/max metadata → pruning', 'Clustering keys improve pruning on big tables', 'Proprietary storage (plus native Iceberg tables)'] },
      rs: { points: ['Columnar 1 MB blocks', 'Zone maps: per-block min/max → block skipping', 'Sort keys (compound/interleaved) drive skipping', 'Column encodings (AZ64/ZSTD…) cut I/O'] },
      fb: { points: ['Open Delta Lake (Parquet) in OneLake', 'V-Order write-time optimization speeds reads', 'Statistics + file compaction', 'One open copy read by Spark, T-SQL, Direct Lake'] },
    },
    'scaling': {
      title: 'Scaling & Concurrency', icon: '⚡',
      intro: 'Scaling-up makes one query faster; scaling-out handles many concurrent queries. Each platform has a distinct mechanism for the concurrency burst.',
      takeaway: 'Scale <b>up</b> for a single heavy query; scale <b>out</b> for concurrency. Snowflake uses <b>multi-cluster warehouses</b>, Redshift uses <b>concurrency scaling</b> (transient clusters + daily credits), Fabric uses <b>capacity bursting/smoothing</b>.',
      sf: { points: ['Resize warehouse (XS→4XL) to scale up', 'Multi-cluster warehouses auto scale-out for concurrency', 'Auto-suspend when idle, resume on demand', 'Each workload on its own warehouse = isolation'] },
      rs: { points: ['Elastic resize (minutes) or classic resize', 'Concurrency scaling: transient clusters on bursts', 'WLM queues isolate workloads; Auto WLM', 'Serverless auto-scales (RPUs) with no clusters'] },
      fb: { points: ['One capacity autoscales via bursting', 'Smoothing spreads spikes to avoid throttling', 'Pause/resume capacity to control cost', 'All workloads share the capacity (watch contention)'] },
    },
    'query-lake': {
      title: 'Querying the Data Lake', icon: '🪣',
      intro: 'Cold/historical data often lives in object storage. Each warehouse can query it without full ingestion — but the mechanism and billing differ.',
      takeaway: 'All can query the lake in place. <b>Redshift Spectrum</b> bills per data scanned in S3; <b>Fabric shortcuts</b> virtualize external storage into OneLake with no copy; <b>Snowflake external tables</b> (and Iceberg) read cloud storage directly.',
      sf: { points: ['External tables over S3 / Azure / GCS', 'Native Apache Iceberg tables', 'Materialized views can accelerate them'], code: "CREATE EXTERNAL TABLE ... \n  LOCATION = @ext_stage;" },
      rs: { points: ['Spectrum queries S3 via external tables', 'Separate elastic fleet; billed per TB scanned', 'Partition + columnar formats to cut scan'], code: "CREATE EXTERNAL SCHEMA lake\n  FROM DATA CATALOG ...;" },
      fb: { points: ['Shortcuts virtualize S3/ADLS/GCS into OneLake', 'No copy — query in place with any engine', 'Delta shortcuts appear in the SQL endpoint'], code: "-- Create a OneLake shortcut\n-- to s3://bucket/path (no copy)" },
    },
    'governance': {
      title: 'Governance & Security', icon: '🔐',
      intro: 'All three offer fine-grained security (row/column/masking) plus role-based access — they differ in the surrounding governance platform.',
      takeaway: 'RLS, CLS, and masking are table stakes everywhere. The ecosystem governance layer differs: <b>Lake Formation</b> (Redshift/AWS), <b>Microsoft Purview</b> (Fabric), and Snowflake\'s built-in policies/Horizon.',
      sf: { points: ['RBAC roles; row access & masking policies', 'Object tagging & tag-based masking', 'Horizon governance; data classification', 'Per-account, cross-cloud'] },
      rs: { points: ['AWS IAM + database RBAC roles', 'Column- & row-level security', 'Lake Formation for fine-grained lake grants', 'KMS encryption, SSL in transit'] },
      fb: { points: ['RLS, CLS, dynamic data masking', 'Microsoft Purview: catalog, lineage, labels', 'OneLake security + workspace roles/domains', 'Sensitivity labels travel with the data'] },
    },
    'ecosystem': {
      title: 'Ecosystem, Sharing & Cost', icon: '🔌',
      intro: 'The biggest practical differentiator is ecosystem fit — which cloud and BI stack you already live in — followed by the sharing model and pricing.',
      takeaway: 'Pick by ecosystem: <b>Snowflake</b> is cross-cloud with rich data sharing; <b>Redshift</b> is AWS-native (S3/Glue/SageMaker/QuickSight); <b>Fabric</b> is Microsoft/Power BI with native Direct Lake. Pricing models: credits vs node-hours/RPU-seconds vs capacity CUs.',
      sf: { points: ['Cross-cloud (AWS/Azure/GCP)', 'Secure data sharing + Marketplace', 'Snowpark for Python/ML; Cortex AI', 'Per-second credit billing'] },
      rs: { points: ['AWS-native: S3, Glue, SageMaker, QuickSight', 'Datashares (live, cross-account)', 'Redshift ML via SageMaker', 'Node-hours or RPU-seconds + RMS storage'] },
      fb: { points: ['Microsoft 365 / Power BI; native Direct Lake', 'OneLake sharing; Fabric Marketplace', 'Fabric ML + Copilot across workloads', 'Capacity (CUs) + storage; pause when idle'] },
    },
  };

  const CONCEPT_ORDER = ['architecture', 'storage', 'scaling', 'query-lake', 'governance', 'ecosystem'];

  /* ── Overview matrix ────────────────────────────────────── */
  const MATRIX = [
    ['Core model', 'Multi-cluster shared-data', 'Provisioned MPP + Serverless', 'Unified SaaS on OneLake'],
    ['Compute / storage', 'Fully separated', 'Separated on RA3 (RMS)', 'Separated (OneLake)'],
    ['Storage format', 'Micro-partitions (+ Iceberg)', 'Columnar 1 MB blocks', 'Open Delta (Parquet)'],
    ['Data skipping', 'Partition metadata + clustering', 'Zone maps + sort keys', 'V-Order + statistics'],
    ['Compute unit', 'Virtual warehouse (credits)', 'RA3 nodes / RPUs', 'Capacity / CUs (F-SKU)'],
    ['Scale-out', 'Multi-cluster warehouses', 'Concurrency scaling', 'Capacity burst/smooth'],
    ['Query the lake', 'External / Iceberg tables', 'Spectrum (S3)', 'Shortcuts (no copy)'],
    ['Replicate sources', 'Connectors / Streams', 'Federated query', 'Mirroring (CDC)'],
    ['BI integration', 'Connectors (BI tools)', 'Connectors (QuickSight…)', 'Direct Lake (native Power BI)'],
    ['In-database ML', 'Snowpark ML / Cortex', 'Redshift ML (SageMaker)', 'Fabric ML / Copilot'],
    ['Governance', 'RBAC + policies / Horizon', 'IAM/RBAC + Lake Formation', 'Purview + RLS/CLS/DDM'],
    ['Sharing', 'Secure data sharing', 'Datashares', 'OneLake sharing'],
    ['Pricing', 'Per-second credits', 'Node-hours or RPU-seconds', 'Capacity (CUs) + storage'],
    ['Ecosystem fit', 'Cross-cloud', 'AWS-native', 'Microsoft / Power BI'],
  ];

  /* ── Renderers ──────────────────────────────────────────── */
  function side(kind, data) {
    return '<div class="cmp-col cmp-col--' + kind + '">' +
      '<div class="cmp-col__head"><span class="cmp-col__dot"></span><span class="cmp-col__title">' + NAMES[kind] + '</span></div>' +
      '<div class="cmp-col__body"><ul class="cmp-points">' +
      data.points.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>' +
      (data.code ? '<div class="cmp-code">' + esc(data.code) + '</div>' : '') +
      '</div></div>';
  }
  function jumpLinks(currentId) {
    const links = CONCEPT_ORDER.filter(id => id !== currentId)
      .map(id => '<a data-go="cmp-' + id + '">' + esc(CONCEPTS[id].title) + '</a>').join('');
    return '<div class="cmp-jump"><span class="cmp-jump__label">Compare more</span>' + links +
      '<a data-go="overview">↩ At a Glance</a></div>';
  }
  function wire(page) {
    page.querySelectorAll('.cmp-jump a[data-go]').forEach(a =>
      a.addEventListener('click', () => viz.navigate && viz.navigate(a.dataset.go)));
  }

  function conceptModule(id) {
    return { render(canvas) {
      const c = CONCEPTS[id];
      canvas.innerHTML = '';
      const page = document.createElement('div'); page.className = 'cmp-page';
      page.innerHTML =
        '<h1 class="cmp-h1">' + c.icon + ' ' + esc(c.title) + '</h1>' +
        '<p class="cmp-lead">' + esc(c.intro) + '</p>' +
        '<div class="cmp-cols">' + side('sf', c.sf) + side('rs', c.rs) + side('fb', c.fb) + '</div>' +
        '<div class="cmp-takeaway"><span class="cmp-takeaway__icon">💡</span>' +
        '<span class="cmp-takeaway__txt"><b>Bottom line —</b> ' + c.takeaway + '</span></div>' +
        jumpLinks(id);
      canvas.appendChild(page);
      wire(page);
      return { destroy() {} };
    }};
  }

  CONCEPT_ORDER.forEach(id => {
    const key = ('cmp-' + id).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    B[key] = conceptModule(id);
  });

  /* ── Overview (matrix) ──────────────────────────────────── */
  B.overview = { render(canvas) {
    canvas.innerHTML = '';
    const page = document.createElement('div'); page.className = 'cmp-page';
    const th = '<tr><th class="rk-td-dim">Dimension</th>' +
      '<th style="color:#29b5e8">❄️ Snowflake</th><th style="color:#4da3e0">🔶 Redshift</th><th style="color:#13a884">🟢 Fabric</th></tr>';
    const rows = MATRIX.map(r => '<tr><td class="rk-td-dim">' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td><td>' + esc(r[3]) + '</td></tr>').join('');
    const jump = '<div class="cmp-jump"><span class="cmp-jump__label">Deep dive</span>' +
      CONCEPT_ORDER.map(id => '<a data-go="cmp-' + id + '">' + esc(CONCEPTS[id].title) + '</a>').join('') +
      '<a data-go="cmp-watch">🎬 Same Query, 3 Engines</a></div>';
    page.innerHTML =
      '<div class="cmp-hero-badge">⇄ Compare · same workload, three warehouses</div>' +
      '<h1 class="cmp-h1">Snowflake vs Redshift vs Fabric — At a Glance</h1>' +
      '<p class="cmp-lead">Three cloud data warehouses that all separate compute from storage and skip data with columnar metadata. ' +
      'They differ most in how compute is provisioned, how open the storage format is, how BI connects, and which ecosystem they fit. ' +
      'Pick a topic below to see the mechanism side by side.</p>' +
      '<div class="rk-table-wrap"><table class="rk-table"><thead>' + th + '</thead><tbody>' + rows + '</tbody></table></div>' +
      jump;
    canvas.appendChild(page);
    wire(page);
    return { destroy() {} };
  }};

  /* ── Watch It Run (animated, via the shared kit) ────────── */
  if (Kit) {
    B.cmpWatch = Kit.makeModule({
      eyebrow: '🎬 Watch It Run', title: 'Same Query, Three Engines',
      subtitle: 'A dashboard query over 2 years of Netflix watch events — see how each warehouse skips data and serves it fast. Press Play.',
      stage: { caption: 'SELECT country, SUM(minutes) WHERE watch_date >= 2024-01-01',
        groups: [
          { id: 'q', label: 'The query', nodes: [{ id: 'sql', label: 'Range filter on a huge table', sub: '2 years → last 12 months' }], connectorAfter: 'three engines, three mechanisms' },
          { id: 'engines', label: 'How each skips data', nodes: [
            { id: 'esf', label: 'Snowflake', sub: 'micro-partitions' },
            { id: 'ers', label: 'Redshift', sub: 'zone maps + sort key' },
            { id: 'efb', label: 'Fabric', sub: 'Direct Lake + V-Order' } ], connectorAfter: 'serve' },
          { id: 'serve', label: 'Serve the dashboard', nodes: [{ id: 'fast', label: 'Fast result, minimal scan' }] },
        ] },
      steps: [
        { label: 'Query', title: 'One query, a selective range filter', on: { spot: ['q'], flow: ['sql'] },
          body: 'The dashboard asks for the last 12 months from a table holding 2 years of events. The winning move on every platform is to <strong>read less data</strong>.',
          facts: ['Range-restricted predicate on a date column', 'Goal: skip everything outside the window'] },
        { label: 'Snowflake', title: 'Snowflake prunes micro-partitions', on: { spot: ['engines'], flow: ['esf'], dim: ['ers', 'efb'] },
          body: 'Cloud Services checks each micro-partition\'s min/max date and prunes those outside the range before any warehouse scans.',
          facts: ['~16 MB auto micro-partitions', 'Clustering on the date tightens pruning', 'Result cache serves exact repeats free'] },
        { label: 'Redshift', title: 'Redshift skips blocks via zone maps', on: { spot: ['engines'], flow: ['ers'], dim: ['esf', 'efb'] },
          body: 'If the table is sorted on watch_date, each 1 MB block holds a tight range, so zone maps skip blocks outside the last 12 months.',
          facts: ['1 MB blocks + per-block min/max', 'Sort key on the date is what makes skipping work', 'Result cache on the leader for repeats'] },
        { label: 'Fabric', title: 'Fabric serves it with Direct Lake', on: { spot: ['engines'], flow: ['efb'], dim: ['esf', 'ers'] },
          body: 'The Delta files are V-Ordered in OneLake; Direct Lake loads only the needed columns/segments straight into Power BI — fast and fresh, no import.',
          facts: ['Open Delta + V-Order for fast reads', 'Direct Lake: import speed, DirectQuery freshness', 'Within capacity guardrails or it falls back'] },
        { label: 'Result', title: 'Same answer, three mechanisms', on: { spot: ['serve'], conn: ['engines'], flow: ['fast'] },
          body: 'All three return the dashboard quickly by scanning a fraction of the data — micro-partition pruning, zone-map block skipping, and V-Ordered Direct Lake reads are the same idea in three forms.',
          facts: ['Columnar + metadata skipping is universal', 'Tuning differs: clustering vs sort keys vs V-Order', 'Ecosystem fit usually decides the choice'] },
      ],
      takeaways: [
        'The same selective query wins the same way everywhere: read less data',
        'Snowflake prunes micro-partitions, Redshift skips blocks via zone maps + sort keys, Fabric uses V-Ordered Direct Lake',
        'Mechanisms rhyme; pick the platform on ecosystem, openness, and BI integration',
      ],
    });
  }
})();
