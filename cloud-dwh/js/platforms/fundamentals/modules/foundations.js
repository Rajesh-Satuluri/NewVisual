/* Fundamentals · Foundations group — OLAP vs OLTP, MPP & decoupled
   compute, columnar storage. Authored for the shared FundKit. */
(function () {
  'use strict';
  const Kit = window.CDWH && window.CDWH.FundKit;
  if (!Kit) return;

  Kit.registerAll({

    /* ───────────────────────── OLAP vs OLTP ───────────────────────── */
    'fund-olap-oltp': {
      eyebrow: '🏛️ Foundations',
      title: 'OLAP vs OLTP — what a warehouse is actually for',
      lead: 'A data warehouse exists to answer <strong>analytical</strong> questions over huge amounts of history — "how many minutes did each country stream last quarter?" — not to run an app. Understanding why that job is different from a transactional database is the foundation everything else rests on.',
      sections: [
        { h: 'Two databases, two completely different jobs', p:
          '<p><strong>OLTP (Online Transaction Processing)</strong> runs the application. It handles many tiny, concurrent operations — insert an order, update a profile, read one row by its key — and must keep every one correct and durable (ACID). Think PostgreSQL, MySQL, DynamoDB behind a web app.</p>' +
          '<p><strong>OLAP (Online Analytical Processing)</strong> runs analytics. It answers a smaller number of very large questions that scan millions or billions of rows, aggregate them, and join big tables together. Think Snowflake, Redshift, or a Fabric Warehouse behind a BI dashboard.</p>' },
        { h: 'Why one database can\'t do both well', p:
          '<p>An OLTP store lays data out <strong>row by row</strong> so it can fetch or change a whole record cheaply. Analytics does the opposite: it reads a <em>few columns</em> across <em>many rows</em>, so a row store wastes enormous I/O reading columns nobody asked for.</p>' +
          '<p>There is also <strong>contention</strong>: a heavy analytical scan would lock up or starve the transactional workload that users depend on. And they scale differently — OLTP optimizes for low-latency single-row writes, OLAP for high-throughput set-based reads.</p>' },
        { h: 'The modern pattern', p:
          '<p>Keep the two systems separate and move data from the operational side into the warehouse — by batch load, streaming, or change-data-capture (the whole <code>How Data Gets In</code> group). The warehouse then becomes the single analytical copy that BI, reporting, and ML all read from.</p>' },
      ],
      diagramTitle: '🎬 From transaction to insight',
      stage: { caption: 'The journey of one watch event: app write → warehouse → dashboard',
        groups: [
          { id: 'oltp', label: 'OLTP — the app', sub: 'row-oriented, single-row ops', nodes: [
            { id: 'orders', label: 'Orders DB' }, { id: 'profiles', label: 'Profiles DB' }, { id: 'events', label: 'Playback events' } ], connectorAfter: 'capture & move' },
          { id: 'pipe', label: 'Ingestion', sub: 'batch · streaming · CDC', nodes: [ { id: 'load', label: 'Load + transform' } ], connectorAfter: 'land in the warehouse' },
          { id: 'olap', label: 'OLAP — the warehouse', sub: 'column-oriented, set-based scans', nodes: [ { id: 'wh', label: 'Analytical tables', sub: 'billions of rows' } ], connectorAfter: 'serve' },
          { id: 'serve', label: 'Consumers', nodes: [ { id: 'bi', label: 'BI dashboards' }, { id: 'ml', label: 'ML / data science' } ] },
        ] },
      steps: [
        { label: 'OLTP', title: 'The app records transactions', on: { spot: ['oltp'], flow: ['orders', 'profiles', 'events'] },
          body: 'Every signup, play, and pause is a tiny write against a <strong>row-oriented</strong> transactional database. It is tuned for correctness and low latency on single records — not for scanning history.',
          facts: ['Millions of small, concurrent operations', 'ACID guarantees per transaction', 'Reading one row by key is cheap'] },
        { label: 'Why not analyze here?', title: 'Analytics would crush the OLTP store', on: { spot: ['oltp'], dim: ['profiles'], flow: ['events'] },
          body: 'A query like "total minutes per country for 2 years" would scan the whole table, reading every column of every row — and lock resources the live app needs. Wrong tool for the job.',
          facts: ['Row layout wastes I/O on unused columns', 'Big scans contend with live traffic', 'No built-in parallelism for huge aggregates'] },
        { label: 'Move the data', title: 'Ingest into the warehouse', on: { spot: ['pipe'], flow: ['load'], conn: ['oltp'] },
          body: 'A pipeline copies the data across — in batches, as a continuous stream, or via change-data-capture — and reshapes it for analysis.',
          facts: ['Batch load, streaming, or CDC', 'Operational copy stays untouched', 'Data is modeled for querying, not for the app'] },
        { label: 'OLAP', title: 'The warehouse answers at scale', on: { spot: ['olap'], flow: ['wh'], conn: ['pipe'] },
          body: 'Stored <strong>column-by-column</strong> and queried by a parallel engine, the warehouse scans only the columns a query needs and spreads the work across many workers.',
          facts: ['Columnar storage → read only needed columns', 'Massively parallel set-based execution', 'Built for aggregates and big joins'] },
        { label: 'Serve', title: 'Insight reaches people', on: { spot: ['serve'], flow: ['bi', 'ml'], conn: ['olap'] },
          body: 'Dashboards, reports, and ML models all read from the one analytical copy — fast, consistent, and isolated from the live application.',
          facts: ['One trusted source for analytics', 'BI + ML share the same data', 'App performance is never at risk'] },
      ],
      map: {
        intro: 'All three platforms in this tool are OLAP engines — they are the analytical destination, not the operational source. The difference is how tightly they connect back to the OLTP world.',
        sf: { term: 'Cloud OLAP engine', points: ['Pure analytical warehouse; no OLTP role', 'Unistore / Hybrid Tables add transactional-style tables for mixed patterns', 'Operational data arrives via connectors, Streams, or Snowpipe'] },
        rs: { term: 'Cloud OLAP engine on AWS', points: ['Analytical MPP warehouse', 'Zero-ETL integrations pull from Aurora/RDS with no pipeline to manage', 'Federated query can read live OLTP data in place'] },
        fb: { term: 'OLAP + mirrored OLTP', points: ['Warehouse / Lakehouse are the OLAP engines', 'Database Mirroring continuously replicates OLTP sources into OneLake', 'One copy then serves BI directly'] },
      },
      takeaway: 'A warehouse is an <b>OLAP</b> system — optimized for scanning and aggregating history, the opposite of the <b>OLTP</b> databases that run your apps. You keep them separate and move data between them; everything else in this section is about doing that move and that scan efficiently.',
      compare: 'cmp-architecture', compareLabel: 'Architecture',
      docs: [
        { label: 'Snowflake: Key concepts', url: 'https://docs.snowflake.com/en/user-guide/intro-key-concepts' },
        { label: 'AWS: What is a data warehouse', url: 'https://docs.aws.amazon.com/redshift/latest/mgmt/welcome.html' },
        { label: 'Fabric: Data warehousing', url: 'https://learn.microsoft.com/en-us/fabric/data-warehouse/data-warehousing' },
      ],
    },

    /* ──────────────── MPP & decoupled compute/storage ──────────────── */
    'fund-architecture': {
      eyebrow: '🏛️ Foundations',
      title: 'MPP & decoupling compute from storage',
      lead: 'Two architectural ideas make a cloud warehouse fast and elastic: <strong>massively parallel processing (MPP)</strong> — split one query across many workers — and <strong>separating storage from compute</strong> so you can grow, shrink, or pause the workers without touching the data.',
      sections: [
        { h: 'MPP: divide and conquer', p:
          '<p>A single machine can only scan so fast. MPP splits a table into pieces and gives each piece to its own worker (a node, slice, or thread). All workers scan, filter, and partially aggregate <strong>in parallel</strong>, then the results are combined. Double the workers and a big scan runs roughly twice as fast.</p>' +
          '<p>The catch is <strong>data movement</strong>: joins and aggregations sometimes need rows that live on different workers, forcing a network shuffle. Good physical design (how data is distributed) is mostly about avoiding that shuffle.</p>' },
        { h: 'The old coupling problem', p:
          '<p>Classic warehouses bolted CPU and disk together in one cluster. You couldn\'t add compute for a busy hour without also paying for more storage, and two teams competed for the same fixed machine. Scaling was slow and expensive.</p>' },
        { h: 'Decoupling: storage below, compute above', p:
          '<p>Cloud warehouses put the data in cheap, durable object storage (S3, ADLS, GCS) as the single source of truth, and run <strong>independent, elastic compute</strong> on top of it. Now you can spin up a big engine for a heavy job, run many engines against the same data without copying it, and <strong>pause compute</strong> entirely while the data sits safely in storage. You pay for compute and storage separately.</p>' },
      ],
      diagramTitle: '🎬 One query, many workers, shared storage',
      stage: { caption: 'Decoupled architecture: elastic compute over a single storage copy',
        groups: [
          { id: 'compute', label: 'Elastic compute (MPP)', sub: 'add / remove / pause independently', nodes: [
            { id: 'w1', label: 'Worker 1' }, { id: 'w2', label: 'Worker 2' }, { id: 'w3', label: 'Worker 3' }, { id: 'w4', label: 'Worker 4' } ], connectorAfter: 'read / write the same data' },
          { id: 'storage', label: 'Shared storage (source of truth)', sub: 'object storage · durable · cheap', nodes: [ { id: 'data', label: 'Table data', sub: 'columnar files' } ] },
        ] },
      steps: [
        { label: 'Storage', title: 'Data lives in shared storage', on: { spot: ['storage'], flow: ['data'] },
          body: 'The table is one copy in durable object storage. It persists whether or not any compute is running, and many engines can read it at once.',
          facts: ['Single source of truth', 'Durable + cheap object storage', 'Independent of any running compute'] },
        { label: 'Parallelize', title: 'A query fans out across workers', on: { spot: ['compute'], flow: ['w1', 'w2', 'w3', 'w4'], conn: ['compute'] },
          body: 'The engine splits the scan into chunks and hands one to each worker. They all read their slice of the data from shared storage <strong>at the same time</strong>.',
          facts: ['Work divided across all workers', 'Each scans a different chunk in parallel', 'Throughput scales with worker count'] },
        { label: 'Combine', title: 'Partial results merge', on: { spot: ['compute'], flow: ['w1', 'w3'], dim: ['w2', 'w4'] },
          body: 'Each worker returns a partial aggregate; the engine combines them into the final answer. Sometimes rows must be shuffled between workers for a join — the cost good data layout tries to avoid.',
          facts: ['Partial aggregates combined centrally', 'Joins may trigger a network shuffle', 'Minimizing shuffle = faster queries'] },
        { label: 'Scale', title: 'Resize without touching data', on: { spot: ['compute'], flow: ['w1', 'w2', 'w3', 'w4'] },
          body: 'Need more speed? Add workers. Quiet period? Shrink or pause compute — the data is safe in storage and costs nothing to keep idle.',
          facts: ['Scale compute up/out on demand', 'Pause compute, keep the data', 'Pay compute and storage separately'] },
        { label: 'Isolate', title: 'Many engines, one copy', on: { spot: ['compute', 'storage'], flow: ['w1', 'w4', 'data'], conn: ['compute'] },
          body: 'Because storage is shared, each team or workload can run its own compute against the same data — no copies, no contention between them.',
          facts: ['Workload isolation by separate compute', 'No data duplication', 'One consistent copy for everyone'] },
      ],
      map: {
        intro: 'Every platform here separates storage from compute — the real difference is the unit of compute you provision and pay for.',
        sf: { term: 'Virtual warehouses', points: ['Independent MPP clusters over shared storage', 'Size XS→6XL; each workload gets its own', 'Multi-cluster warehouses add clusters for concurrency', 'Per-second credits; auto-suspend / auto-resume'] },
        rs: { term: 'Nodes & slices / RPUs', points: ['Leader node + compute nodes split into slices', 'RA3 separates compute from Redshift Managed Storage', 'Serverless provisions capacity in RPUs automatically', 'Slice count is fixed by the node type'] },
        fb: { term: 'Capacity (CUs)', points: ['Distributed engine over OneLake storage', 'One shared capacity (Capacity Units) powers all workloads', 'Bursting + smoothing instead of sizing clusters', 'Pause the capacity to stop compute cost'] },
      },
      takeaway: 'Speed comes from <b>MPP</b> (many workers on one query) and flexibility comes from <b>decoupling</b> (elastic compute over shared storage). The platforms agree on both — they just package compute differently: independent <b>virtual warehouses</b>, <b>nodes/RPUs</b>, or one shared <b>capacity</b>.',
      compare: 'cmp-architecture', compareLabel: 'Architecture',
      docs: [
        { label: 'Snowflake: Architecture', url: 'https://docs.snowflake.com/en/user-guide/intro-key-concepts' },
        { label: 'AWS: Redshift architecture', url: 'https://docs.aws.amazon.com/redshift/latest/dg/c_high_level_system_architecture.html' },
        { label: 'Fabric: OneLake & compute', url: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-overview' },
      ],
    },

    /* ───────────────────── Columnar storage ───────────────────────── */
    'fund-columnar': {
      eyebrow: '🏛️ Foundations',
      title: 'Columnar storage & compression',
      lead: 'The single biggest reason warehouses are fast at analytics is that they store each <strong>column</strong> together instead of each row. That one choice slashes the amount of data a query reads and lets the engine compress data far more aggressively.',
      sections: [
        { h: 'Row layout vs column layout', p:
          '<p>A row store keeps all of a record\'s fields next to each other on disk — great when you want the whole record. A <strong>column store</strong> keeps all values of one column together. An analytics query like <code>SELECT country, SUM(minutes)</code> then reads only the <em>country</em> and <em>minutes</em> columns and skips everything else.</p>' +
          '<p>On a wide table, that can mean reading 2 columns instead of 50 — a 25× reduction in I/O before any other optimization.</p>' },
        { h: 'Why columns compress so well', p:
          '<p>Values in one column are the same type and often very similar — many repeated country codes, dates in a narrow range, a handful of device types. That lets the engine use cheap, powerful encodings: <strong>run-length</strong> (store "US ×10,000" once), <strong>dictionary</strong> (map each distinct value to a small integer), and <strong>delta</strong> encoding for sorted numbers. Less data on disk means less data to read, so compression is a speed feature, not just a cost one.</p>' },
        { h: 'The trade-off', p:
          '<p>Columnar is poor at single-row writes and point lookups — assembling or updating one full record touches every column file. That is exactly why warehouses are OLAP tools and leave transactional work to OLTP systems, and why they prefer <strong>bulk</strong> loads over row-at-a-time inserts.</p>' },
      ],
      diagramTitle: '🎬 Reading only what you need',
      stage: { caption: 'SELECT country, SUM(minutes) — a columnar engine skips the rest',
        groups: [
          { id: 'table', label: 'A wide table, stored by column', nodes: [
            { id: 'c_country', label: 'country', sub: 'needed' }, { id: 'c_minutes', label: 'minutes', sub: 'needed' },
            { id: 'c_device', label: 'device' }, { id: 'c_title', label: 'title' }, { id: 'c_more', label: '…46 more cols' } ], connectorAfter: 'read only the needed columns' },
          { id: 'encode', label: 'Each column compressed', sub: 'run-length · dictionary · delta', nodes: [ { id: 'enc', label: 'Encoded column blocks' } ], connectorAfter: 'scan' },
          { id: 'result', label: 'Result', nodes: [ { id: 'agg', label: 'Minutes per country' } ] },
        ] },
      steps: [
        { label: 'The query', title: 'Two columns out of fifty', on: { spot: ['table'], flow: ['c_country', 'c_minutes'], dim: ['c_device', 'c_title', 'c_more'] },
          body: 'The query only references <strong>country</strong> and <strong>minutes</strong>. In a row store the engine would still read all 50 columns of every row. A column store reads just these two.',
          facts: ['Columns stored separately on disk', 'Unused columns are never touched', 'Massive I/O reduction on wide tables'] },
        { label: 'Compression', title: 'Similar values compress hard', on: { spot: ['encode'], flow: ['enc'], conn: ['table'] },
          body: 'Because a column holds one data type with lots of repetition, encodings like run-length and dictionary shrink it dramatically — so there is even less to read.',
          facts: ['Run-length: "US ×10,000" stored once', 'Dictionary: values → small integers', 'Less disk = fewer bytes scanned'] },
        { label: 'Scan', title: 'Scan the compressed columns', on: { spot: ['encode'], flow: ['enc'] },
          body: 'The engine scans only the two compressed columns, decoding on the fly, and computes a running sum per country across all workers in parallel.',
          facts: ['Decode happens in-stream', 'Parallel partial aggregation', 'Cache-friendly, vectorized execution'] },
        { label: 'Result', title: 'The answer, cheaply', on: { spot: ['result'], flow: ['agg'], conn: ['encode'] },
          body: 'Minutes-per-country comes back having touched a tiny fraction of the raw bytes — the combined payoff of columnar layout plus compression.',
          facts: ['Fraction of the data actually read', 'Foundation for pruning & skipping', 'The core OLAP speed advantage'] },
      ],
      map: {
        intro: 'All three are columnar and compress automatically. They differ in the chunk size and how open the on-disk format is.',
        sf: { term: 'Micro-partitions (~16 MB)', points: ['Auto-created columnar micro-partitions', 'Automatic compression, no tuning needed', 'Proprietary format (also reads/writes open Iceberg)'] },
        rs: { term: 'Columnar 1 MB blocks', points: ['Column data stored in 1 MB blocks', 'Per-column encodings: AZ64, ZSTD, and more', 'COPY can pick encodings automatically'] },
        fb: { term: 'Open Delta / Parquet', points: ['Columnar Parquet in open Delta Lake format', 'V-Order write-time optimization speeds reads', 'One open copy read by SQL, Spark & Power BI'] },
      },
      takeaway: 'Storing data <b>by column</b> plus heavy <b>compression</b> is why warehouses read a fraction of the bytes a row store would. Snowflake uses ~16 MB micro-partitions, Redshift 1 MB blocks, and Fabric open Delta/Parquet — same idea, different packaging, and the base that all data-skipping builds on.',
      compare: 'cmp-storage', compareLabel: 'Storage & Skipping',
      docs: [
        { label: 'Snowflake: Micro-partitions', url: 'https://docs.snowflake.com/en/user-guide/tables-clustering-micropartitions' },
        { label: 'AWS: Columnar storage', url: 'https://docs.aws.amazon.com/redshift/latest/dg/c_columnar_storage_disk_mem_mgmnt.html' },
        { label: 'Fabric: Delta & V-Order', url: 'https://learn.microsoft.com/en-us/fabric/data-engineering/delta-optimization-and-v-order' },
      ],
    },

  });
})();
