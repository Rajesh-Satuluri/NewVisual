/* ============================================================
   Redshift — Learn / Fundamentals (authentic, AWS-doc aligned)
   home · intro · architecture · ra3-managed-storage · serverless ·
   columnar-storage
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const Kit = viz.RedshiftKit;
  viz.P = viz.P || {}; viz.P.redshift = viz.P.redshift || {};
  const B = (viz.P.redshift.Modules = viz.P.redshift.Modules || {});

  /* ── Home (custom hero) ─────────────────────────────────── */
  B.home = {
    render(canvas) {
      canvas.innerHTML = '';
      const page = document.createElement('div'); page.className = 'mod-page';
      page.innerHTML = `
        <div class="rk-hero">
          <div class="home-hero-badge">Netflix on AWS · Amazon Redshift</div>
          <h1>How Netflix-scale analytics run on <span class="acc">Amazon Redshift</span></h1>
          <p>A guided, interactive tour of Redshift's MPP architecture — leader &amp; compute nodes, RA3 managed storage, Serverless, columnar storage and zone maps — told through a Netflix-style streaming-analytics workload on AWS.</p>
          <div class="rk-stats">
            <div class="rk-stat"><div class="rk-stat-num">MPP</div><div class="rk-stat-label">Massively parallel</div></div>
            <div class="rk-stat"><div class="rk-stat-num">1 MB</div><div class="rk-stat-label">Columnar block</div></div>
            <div class="rk-stat"><div class="rk-stat-num">RA3</div><div class="rk-stat-label">Managed storage</div></div>
            <div class="rk-stat"><div class="rk-stat-num">S3</div><div class="rk-stat-label">Spectrum data lake</div></div>
          </div>
        </div>
        <div class="rk-takeaways" style="max-width:820px;margin:1.75rem auto 0;">
          <div class="rk-takeaways-title">What you'll learn</div>
          <ul>
            <li><strong>Fundamentals</strong> — architecture, RA3 &amp; Redshift Managed Storage, Serverless, columnar storage &amp; zone maps</li>
            <li><strong>Internals</strong> — distribution styles, sort keys, compression, VACUUM/ANALYZE, query execution, result caching, materialized views</li>
            <li><strong>Scale &amp; ecosystem</strong> — WLM, concurrency scaling, Spectrum, datashares, Redshift ML, SUPER/PartiQL</li>
          </ul>
        </div>`;
      canvas.appendChild(page);
      return { destroy() {} };
    },
  };

  /* ── Content specs (kit-driven) ─────────────────────────── */
  const SPECS = {
    intro: {
      eyebrow: 'Introduction', title: 'Why Amazon Redshift?',
      subtitle: 'Redshift is a fully managed, petabyte-scale cloud data warehouse built on a massively parallel processing (MPP), columnar engine. Press Play to see why that matters for a Netflix-style workload.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/gsg/getting-started.html',
      stage: { caption: 'From raw events to answers',
        groups: [
          { id: 'src', label: 'Sources', sub: 'Netflix on AWS', nodes: [{ id: 'kinesis', label: 'Playback events', sub: 'Kinesis' }, { id: 's3lake', label: 'S3 data lake', sub: 'Parquet' }, { id: 'rds', label: 'Operational DB', sub: 'Aurora' }], connectorAfter: 'COPY · Spectrum · Federated' },
          { id: 'wh', label: 'Redshift', sub: 'MPP columnar engine', nodes: [{ id: 'load', label: 'Ingest' }, { id: 'store', label: 'Columnar store' }, { id: 'mpp', label: 'Parallel query' }], connectorAfter: 'SQL' },
          { id: 'con', label: 'Consumers', nodes: [{ id: 'bi', label: 'BI dashboards', sub: 'QuickSight' }, { id: 'ml', label: 'ML / Redshift ML' }, { id: 'adhoc', label: 'Ad-hoc SQL' }] },
        ] },
      steps: [
        { label: 'Problem', title: 'The analytics problem', on: { spot: ['src'], dim: [] },
          body: 'Netflix generates massive playback, clickstream, and billing data. Row-oriented OLTP databases choke on "scan billions of rows, aggregate a few columns" analytics.',
          facts: ['OLTP reads whole rows; analytics needs a few columns over billions of rows', 'Redshift is purpose-built OLAP: columnar + MPP'] },
        { label: 'Ingest', title: 'Get data in — three ways', on: { spot: ['src'], conn: ['src'], flow: ['kinesis', 's3lake', 'rds'] },
          body: 'Load with high-throughput <code>COPY</code> from S3, query the lake in place with <strong>Spectrum</strong>, or reach live operational data with <strong>federated query</strong>.',
          facts: ['COPY parallelizes across slices for fast bulk loads', 'Spectrum queries S3 without loading', 'Federated query reads Aurora/RDS PostgreSQL & MySQL'] },
        { label: 'MPP', title: 'Massively parallel processing', on: { spot: ['wh'], flow: ['mpp'] },
          body: 'A leader node plans the query; many compute-node <strong>slices</strong> scan and aggregate their shard of the data in parallel, then results are merged.',
          facts: ['Work is split across slices and runs concurrently', 'Columnar storage means only requested columns are read'] },
        { label: 'Serve', title: 'Serve every consumer', on: { spot: ['con'], conn: ['wh'], flow: ['bi', 'ml', 'adhoc'] },
          body: 'BI tools, in-database ML, and ad-hoc SQL all read the same governed warehouse — with result caching and concurrency scaling keeping dashboards fast under load.',
          facts: ['Result cache returns repeated queries instantly', 'Concurrency scaling absorbs bursts of concurrent users'] },
      ],
      takeaways: [
        'Redshift = managed, petabyte-scale, MPP + columnar OLAP warehouse on AWS',
        'Three ingest paths: COPY (load), Spectrum (query S3 in place), federated query (live sources)',
        'Separation of compute and storage arrives with the RA3 / Managed Storage generation',
      ],
    },

    architecture: {
      eyebrow: 'Architecture', title: 'Leader, Compute Nodes & Slices',
      subtitle: 'A Redshift cluster is a leader node coordinating one or more compute nodes, each divided into slices that process data in parallel. Press Play to trace a query through the MPP engine.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/c_high_level_system_architecture.html',
      stage: { caption: 'A Redshift provisioned cluster',
        groups: [
          { id: 'client', label: 'Client', nodes: [{ id: 'app', label: 'SQL client / BI', sub: 'JDBC · ODBC' }], connectorAfter: '↓ SQL   ↑ results' },
          { id: 'leader', label: 'Leader node', sub: 'parse · plan · compile · aggregate', nodes: [{ id: 'planner', label: 'Parser & planner' }, { id: 'compiler', label: 'Code compiler' }, { id: 'agg', label: 'Final aggregation' }], connectorAfter: '↓ compiled segments' },
          { id: 'compute', label: 'Compute nodes', sub: 'parallel execution', nodes: [
            { id: 'cn1', label: 'Compute node 1', sub: 'slices 0–3' },
            { id: 'cn2', label: 'Compute node 2', sub: 'slices 4–7' },
            { id: 'cn3', label: 'Compute node 3', sub: 'slices 8–11' } ] },
        ] },
      steps: [
        { label: 'Client', title: 'The client talks only to the leader', on: { spot: ['client'], conn: ['client'] },
          body: 'Applications connect over JDBC/ODBC to the <strong>leader node</strong> only. They never address compute nodes directly.',
          facts: ['A cluster with 2+ compute nodes has a leader node in front', 'Single-node clusters act as both leader and compute'] },
        { label: 'Leader', title: 'Leader node: plan & compile', on: { spot: ['leader'], flow: ['planner', 'compiler'], dim: [] },
          body: 'The leader parses SQL, builds the execution plan, and <strong>compiles</strong> it to C++ code, then distributes compiled segments to the compute nodes.',
          facts: ['Leader develops the query plan and compiles code', 'Compiled code is cached and reused across similar queries', 'Leader also stores catalog metadata'] },
        { label: 'Compute', title: 'Compute nodes run in parallel', on: { spot: ['compute'], conn: ['leader'], flow: ['cn1', 'cn2', 'cn3'] },
          body: 'Each compute node runs its compiled segments against its portion of the data, fully in parallel with the others.',
          facts: ['Node type sets vCPU, RAM, and slice count per node', 'Nodes communicate over a dedicated high-speed network'] },
        { label: 'Slices', title: 'Slices: the unit of parallelism', on: { spot: ['compute'], flow: ['cn1', 'cn2', 'cn3'] },
          body: 'Each compute node is divided into <strong>slices</strong>; each slice gets a share of memory and disk and processes its data shard independently. More nodes/slices → more parallelism.',
          facts: ['ra3.4xlarge = 12 vCPU / 96 GiB, 4 slices per node', 'ra3.16xlarge = 48 vCPU / 384 GiB, 16 slices per node', 'Table distribution style decides which slice holds each row'] },
        { label: 'Return', title: 'Leader aggregates and returns', on: { spot: ['leader'], conn: ['client'], flow: ['agg'] },
          body: 'Compute nodes send intermediate results back to the leader, which performs the final aggregation/sort and returns rows to the client.',
          facts: ['Final merge/aggregation happens on the leader', 'Minimizing data shuffled back to the leader is a key tuning goal'] },
      ],
      takeaways: [
        'Leader node = parse, plan, compile, final aggregate; clients connect only here',
        'Compute nodes execute compiled segments in parallel over their data',
        'Slices are the unit of parallelism; node type fixes vCPU/RAM/slice count',
      ],
    },

    ra3ManagedStorage: {
      eyebrow: 'Fundamentals', title: 'RA3 Nodes & Redshift Managed Storage',
      subtitle: 'RA3 nodes separate compute from storage: you size compute for performance and pay for storage independently via Redshift Managed Storage (RMS), backed by S3. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-clusters.html',
      stage: { caption: 'RA3 = compute sized independently of managed storage',
        groups: [
          { id: 'ra3', label: 'RA3 compute nodes', sub: 'size for performance', nodes: [
            { id: 'xlplus', label: 'ra3.xlplus', sub: '4 vCPU · 32 GiB' },
            { id: 'fourxl', label: 'ra3.4xlarge', sub: '12 vCPU · 96 GiB' },
            { id: 'sixteenxl', label: 'ra3.16xlarge', sub: '48 vCPU · 384 GiB' } ], connectorAfter: 'local SSD cache ↕ RMS' },
          { id: 'cache', label: 'Local SSD cache', sub: 'hot data on-node', nodes: [{ id: 'hot', label: 'Automatically cached hot blocks' }], connectorAfter: '↕' },
          { id: 'rms', label: 'Redshift Managed Storage (RMS)', sub: 'backed by Amazon S3', nodes: [{ id: 's3', label: 'Managed storage', sub: 'up to 128 TB/node (4xl/16xl)' }] },
        ] },
      steps: [
        { label: 'Why RA3', title: 'Decouple compute from storage', on: { spot: ['ra3'] },
          body: 'Older DC2/DS2 nodes tied storage to compute — add storage, pay for compute you didn\'t need. RA3 lets you <strong>scale compute and storage separately</strong>.',
          facts: ['RA3 is the current recommended node family', 'Pay for managed storage separately from compute'] },
        { label: 'Node sizes', title: 'Three RA3 sizes', on: { spot: ['ra3'], flow: ['xlplus', 'fourxl', 'sixteenxl'] },
          body: 'Pick the RA3 size by the compute you need; managed storage scales on its own.',
          facts: ['ra3.xlplus — 4 vCPU, 32 GiB RAM', 'ra3.4xlarge — 12 vCPU, 96 GiB RAM', 'ra3.16xlarge — 48 vCPU, 384 GiB RAM'] },
        { label: 'SSD cache', title: 'Local SSD caches hot data', on: { spot: ['cache'], conn: ['ra3'], flow: ['hot'] },
          body: 'RA3 keeps frequently accessed blocks on fast local SSD and automatically evicts cold data to RMS — hot queries stay fast without keeping everything on-node.',
          facts: ['Hot blocks served from local SSD', 'Cold blocks live in managed storage, fetched on demand'] },
        { label: 'RMS', title: 'Redshift Managed Storage', on: { spot: ['rms'], conn: ['cache'], flow: ['s3'] },
          body: 'RMS stores your data durably in <strong>Amazon S3</strong>, scaling automatically. You\'re billed for what you use, independent of the number of compute nodes.',
          facts: ['Managed storage up to 128 TB per node (ra3.4xlarge & ra3.16xlarge)', 'Storage grows automatically — no manual provisioning', 'Enables fast, elastic resize and data sharing'] },
      ],
      takeaways: [
        'RA3 separates compute from storage — size each independently',
        'Hot data is cached on local SSD; the rest lives in RMS on S3',
        'ra3.4xlarge & ra3.16xlarge support up to 128 TB managed storage per node',
      ],
    },

    serverless: {
      eyebrow: 'Fundamentals', title: 'Amazon Redshift Serverless',
      subtitle: 'Serverless runs Redshift with no clusters to manage — capacity is measured in RPUs and billed per second only while queries run. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-capacity.html',
      stage: { caption: 'Capacity auto-scales; you pay only for active work',
        groups: [
          { id: 'wg', label: 'Workgroup', sub: 'compute configuration', nodes: [{ id: 'base', label: 'Base capacity', sub: 'RPUs (floor)' }, { id: 'max', label: 'Max capacity', sub: 'RPU ceiling' }], connectorAfter: 'auto-scale on demand' },
          { id: 'rpu', label: 'RPUs', sub: '1 RPU = 16 GB memory', nodes: [{ id: 'r1', label: 'RPU' }, { id: 'r2', label: 'RPU' }, { id: 'r3', label: 'RPU' }, { id: 'r4', label: 'RPU' }], connectorAfter: 'per-second billing' },
          { id: 'ns', label: 'Namespace', sub: 'database objects + RMS', nodes: [{ id: 'db', label: 'Databases, users, data' }] },
        ] },
      steps: [
        { label: 'No clusters', title: 'No clusters to manage', on: { spot: ['wg'] },
          body: 'Serverless removes provisioning. You define a <strong>workgroup</strong> (compute) and a <strong>namespace</strong> (data), and Redshift handles capacity automatically.',
          facts: ['No node type or node count to pick', 'Great for variable or unpredictable workloads'] },
        { label: 'RPUs', title: 'Capacity in RPUs', on: { spot: ['rpu'], flow: ['r1', 'r2', 'r3', 'r4'] },
          body: 'Compute is measured in <strong>Redshift Processing Units</strong>. Each RPU provides 16 GB of memory.',
          facts: ['1 RPU = 16 GB memory', 'Base capacity configurable from 8 to 512 RPUs (newer regions support a 4-RPU minimum and up to 1024)', 'Higher base helps large ETL/data-processing jobs'] },
        { label: 'Auto-scale', title: 'Base floor, Max ceiling', on: { spot: ['wg'], flow: ['base', 'max'] },
          body: 'Base capacity is the floor; Redshift scales up toward the <strong>Max capacity</strong> ceiling when workloads demand it, then back down.',
          facts: ['Base = starting/guaranteed capacity', 'Max capacity caps spend and scale-up', 'Scaling is automatic — no intervention'] },
        { label: 'Billing', title: 'Pay per second, only when active', on: { spot: ['rpu'], conn: ['rpu'] },
          body: 'You\'re billed in <strong>RPU-hours on a per-second basis</strong> while queries run (60-second minimum per charge). Idle time isn\'t billed for compute; storage is billed separately as RMS.',
          facts: ['Per-second billing with a 60-second minimum charge', 'No charge for compute when nothing is running', 'Storage billed separately as Redshift Managed Storage'] },
      ],
      takeaways: [
        'Serverless = no clusters; workgroup (compute) + namespace (data)',
        '1 RPU = 16 GB memory; base is the floor, max the ceiling',
        'Billed per second in RPU-hours only while active (60s min); storage billed as RMS',
      ],
    },

    columnarStorage: {
      eyebrow: 'Fundamentals', title: 'Columnar Storage & Zone Maps',
      subtitle: 'Redshift stores data column-by-column in 1 MB blocks and keeps min/max metadata (zone maps) so it can skip blocks a query can\'t match. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/c_columnar_storage_disk_mem_mgmnt.html',
      stage: { caption: 'Query: SELECT country, SUM(minutes) WHERE watch_date >= 2024-01-01',
        groups: [
          { id: 'row', label: 'Row store (for contrast)', sub: 'reads whole rows', nodes: [{ id: 'rrow', label: 'row 1 · all cols' }, { id: 'rrow2', label: 'row 2 · all cols' }, { id: 'rrow3', label: 'row 3 · all cols' }] },
          { id: 'col', label: 'Columnar store', sub: '1 MB blocks per column', nodes: [
            { id: 'c-date', label: 'watch_date', sub: 'needed' },
            { id: 'c-country', label: 'country', sub: 'needed' },
            { id: 'c-minutes', label: 'minutes', sub: 'needed' },
            { id: 'c-title', label: 'title', sub: 'skipped' },
            { id: 'c-device', label: 'device', sub: 'skipped' } ], connectorAfter: 'zone maps skip blocks' },
          { id: 'zm', label: 'Zone maps', sub: 'min/max per 1 MB block', nodes: [
            { id: 'b1', label: 'block A', sub: '2019–2021 ✗' },
            { id: 'b2', label: 'block B', sub: '2022–2023 ✗' },
            { id: 'b3', label: 'block C', sub: '2024 ✓' } ] },
        ] },
      steps: [
        { label: 'Columnar', title: 'Each block holds one column', on: { spot: ['col'], dim: [], flow: ['c-date', 'c-country', 'c-minutes'] },
          body: 'Redshift stores values of a <strong>single column</strong> together in 1 MB disk blocks. Analytic queries read only the columns they reference.',
          facts: ['Each data block stores values of a single column for many rows', 'Columnar block size is 1 MB'] },
        { label: 'Skip columns', title: 'Only read needed columns', on: { spot: ['col'], flow: ['c-date', 'c-country', 'c-minutes'], dim: ['c-title', 'c-device'] },
          body: 'This query needs <code>watch_date</code>, <code>country</code>, <code>minutes</code> — so <code>title</code> and <code>device</code> blocks are never read. Row stores would read all of them.',
          facts: ['Columnar cuts I/O to just the referenced columns', 'Compression works better on like-typed column data'] },
        { label: 'Zone maps', title: 'Zone maps store min/max', on: { spot: ['zm'], flow: ['b1', 'b2', 'b3'] },
          body: 'For each 1 MB block, Redshift stores the <strong>min and max</strong> values as metadata — the "zone map".',
          facts: ['Min/max per block is stored in metadata', 'No indexes to build or maintain — zone maps are automatic'] },
        { label: 'Prune', title: 'Range-restricted scan skips blocks', on: { spot: ['zm'], flow: ['b3'], dim: ['b1', 'b2'] },
          body: 'With <code>WHERE watch_date >= 2024-01-01</code>, the query processor checks zone maps and <strong>skips blocks A and B</strong> (max &lt; 2024), scanning only block C.',
          facts: ['Range-restricted predicates let the processor skip blocks fast', 'Sorting data on the filter column makes zone maps far more effective', 'This is why sort keys matter — see the Sort Keys module'] },
      ],
      takeaways: [
        'Columnar = 1 MB blocks per column; only referenced columns are read',
        'Zone maps keep per-block min/max metadata automatically',
        'Range-restricted predicates skip non-matching blocks; sort order amplifies this',
      ],
    },
  };

  Kit.registerAll('redshift', SPECS);
})();
