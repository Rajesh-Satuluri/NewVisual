/* ============================================================
   Cloud DE Visualizer — Cross-Cloud Design Challenges (X3.10).

   Scenario-based system-design drills. Each challenge gives a
   business scenario + hard requirements, then a series of
   service-selection decision points. Each decision has exactly
   one best option (correct:true) with a rationale on EVERY
   option (why it is or isn't the right pick), plus trade-off
   notes and a reference architecture. These mirror the
   open-ended "design a data platform for X" interview round.

   Shape:
     { id, title, difficulty, clouds:[...], scenario, requirements:[...],
       decisions:[{ id, question, options:[{id,label,correct,rationale}] }],
       tradeoffs:[...], reference:[...], refs:[{label,url}] }

   Registered into the Cross-Cloud format. Scored by
   TV.DesignChallengeEngine (fraction of best options chosen).
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  const CHALLENGES = [
    {
      id: 'realtime-clickstream',
      title: 'Real-time clickstream analytics',
      difficulty: 'Intermediate',
      clouds: ['aws', 'azure', 'databricks'],
      scenario: 'A retailer wants a live dashboard of site activity (page views, add-to-cart, checkout) updating within seconds, plus the same events retained cheaply for later batch modeling. Peak is ~200k events/sec during sales.',
      requirements: [
        'Ingest a high-volume event stream with replay and multiple independent consumers',
        'Serve a near-real-time dashboard (seconds of latency)',
        'Also land every event durably for cheap long-term batch analytics',
        'Minimize operational overhead where reasonable',
      ],
      decisions: [
        {
          id: 'ingest',
          question: 'What should receive the raw event stream?',
          options: [
            { id: 'a', label: 'A partitioned streaming log (Kinesis Data Streams / Event Hubs / Kafka)', correct: true, rationale: 'A partitioned append log decouples bursty producers from consumers, supports replay by offset, and lets several consumer groups read independently — exactly the requirement.' },
            { id: 'b', label: 'Write events directly into the data warehouse as they arrive', correct: false, rationale: 'Row-by-row writes into an MPP warehouse at 200k/sec will throttle and cost heavily; warehouses load best in micro-batches, not per-event.' },
            { id: 'c', label: 'POST each event to a REST API backed by a relational DB', correct: false, rationale: 'A transactional DB cannot absorb 200k/sec of appends and gives no replay or fan-out; it becomes the bottleneck.' },
            { id: 'd', label: 'Drop events into object storage one file per event', correct: false, rationale: 'One tiny object per event creates a catastrophic small-files problem and no low-latency consumption path.' },
          ],
        },
        {
          id: 'serve',
          question: 'How do you power the seconds-fresh dashboard?',
          options: [
            { id: 'a', label: 'A stream processor (Flink/Structured Streaming/Stream Analytics) writing aggregates to a fast store', correct: true, rationale: 'Continuous stream processing computes rolling aggregates and pushes them to a low-latency serving store — the standard pattern for live dashboards.' },
            { id: 'b', label: 'Hourly batch job over the raw files', correct: false, rationale: 'Hourly batch cannot meet a seconds-latency SLA; it is right for the cold path, not the dashboard.' },
            { id: 'c', label: 'Let BI query the raw event log directly on every refresh', correct: false, rationale: 'Re-scanning the full event stream per refresh is slow and expensive and does not scale to many viewers.' },
            { id: 'd', label: 'Trigger a Lambda per event to update the dashboard', correct: false, rationale: 'Per-event function invocations at 200k/sec is an anti-pattern — no windowing, huge invocation cost, and race conditions on aggregates.' },
          ],
        },
        {
          id: 'archive',
          question: 'How do you retain every event cheaply for batch?',
          options: [
            { id: 'a', label: 'Auto-deliver the stream to object storage as compacted Parquet (Firehose / Event Hubs Capture / sink connector)', correct: true, rationale: 'A managed capture/delivery sink writes the stream to the lake as columnar files on a size/time window — cheap, durable, and immediately query-able by batch engines.' },
            { id: 'b', label: 'Keep everything in the streaming log forever', correct: false, rationale: 'Stream logs are priced for a short retention window; they are not a cheap long-term store.' },
            { id: 'c', label: 'Store all events in the real-time serving DB', correct: false, rationale: 'The hot serving store is optimized for low-latency reads, not cheap petabyte retention.' },
            { id: 'd', label: 'Email a daily CSV dump to the data team', correct: false, rationale: 'Not durable, not query-able, not scalable — obviously unfit.' },
          ],
        },
      ],
      tradeoffs: [
        'This is the classic Lambda-style split: a hot path (stream processor → fast store) for latency and a cold path (capture → lake) for cheap, complete history.',
        'Partition count on the log bounds consumer parallelism — size it for peak, not average.',
        'Exactly-once vs at-least-once: dashboards tolerate approximate counts; the batch lake should be deduplicated downstream for correctness.',
      ],
      reference: [
        'Producers → partitioned streaming log (Kinesis / Event Hubs / Kafka)',
        'Hot path: stream processor → low-latency store → BI dashboard',
        'Cold path: managed capture → Parquet on the lake → batch / ML',
      ],
      refs: [
        { label: 'AWS: streaming data solutions', url: 'https://docs.aws.amazon.com/streams/latest/dev/introduction.html' },
        { label: 'Azure: Event Hubs Capture', url: 'https://learn.microsoft.com/azure/event-hubs/event-hubs-capture-overview' },
      ],
    },

    {
      id: 'onprem-to-lakehouse',
      title: 'Migrate an on-prem warehouse to a lakehouse',
      difficulty: 'Intermediate',
      clouds: ['azure', 'databricks', 'aws'],
      scenario: 'A company runs nightly ETL from on-prem SQL Server into an on-prem warehouse. They want to move to a cloud lakehouse with a medallion architecture, keeping the nightly cadence initially, and reaching data behind their firewall.',
      requirements: [
        'Extract from on-prem SQL Server behind a corporate firewall',
        'Land raw data in a lake, then refine Bronze → Silver → Gold',
        'ACID tables with upserts and time travel',
        'Governed, auditable access to the curated tables',
      ],
      decisions: [
        {
          id: 'extract',
          question: 'How do you reach the on-prem SQL Server?',
          options: [
            { id: 'a', label: 'A self-hosted / VNet integration runtime or agent that connects outbound from on-prem', correct: true, rationale: 'A self-hosted integration runtime (ADF SHIR) or equivalent agent runs inside the network and makes an outbound connection, so no inbound firewall hole is needed — the standard hybrid-connectivity pattern.' },
            { id: 'b', label: 'Expose SQL Server to the public internet with a firewall rule', correct: false, rationale: 'Opening a database to the internet is a serious security risk and usually violates policy.' },
            { id: 'c', label: 'Manually export CSVs and upload them each night', correct: false, rationale: 'Manual steps are not reliable, auditable, or scalable for production ETL.' },
            { id: 'd', label: 'Query the on-prem DB directly from cloud Spark over the internet', correct: false, rationale: 'Still requires inbound access through the firewall and couples cloud compute to an on-prem OLTP system.' },
          ],
        },
        {
          id: 'format',
          question: 'What table format backs the medallion layers?',
          options: [
            { id: 'a', label: 'An open ACID table format (Delta / Iceberg) on object storage', correct: true, rationale: 'An ACID lake format gives transactions, MERGE upserts, schema enforcement and time travel over cheap object storage — the definition of a lakehouse.' },
            { id: 'b', label: 'Plain CSV files per layer', correct: false, rationale: 'CSV has no schema enforcement, no ACID, no upserts, and is slow to scan — unusable for reliable Silver/Gold.' },
            { id: 'c', label: 'Load everything straight into a classic MPP warehouse, skip the lake', correct: false, rationale: 'That abandons the lakehouse goal and the cheap raw-retention + open-format benefits; also no raw replay if logic changes.' },
            { id: 'd', label: 'Plain Parquet with no transaction log', correct: false, rationale: 'Parquet is columnar and fast but has no atomic commits or upserts, so concurrent writes and MERGE/GDPR deletes are unsafe.' },
          ],
        },
        {
          id: 'incremental',
          question: 'How do you load only changed rows each night?',
          options: [
            { id: 'a', label: 'Watermark/high-water-mark on a modified-date or id, tracked in a control table', correct: true, rationale: 'Reading rows newer than the last watermark and advancing it is the canonical incremental-batch pattern; CDC is the upgrade when you need deletes/true change capture.' },
            { id: 'b', label: 'Truncate and full-reload every table nightly', correct: false, rationale: 'Full reloads waste compute and network and do not scale as tables grow; acceptable only for tiny dimensions.' },
            { id: 'c', label: 'Guess which rows changed by random sampling', correct: false, rationale: 'Non-deterministic and incorrect — you will miss or duplicate data.' },
            { id: 'd', label: 'Rely on the warehouse to figure it out automatically', correct: false, rationale: 'There is no magic auto-incremental; you must define the change-tracking strategy.' },
          ],
        },
        {
          id: 'govern',
          question: 'How is access to curated tables governed?',
          options: [
            { id: 'a', label: 'A central catalog with fine-grained grants, lineage and audit (Unity Catalog / Lake Formation / Purview)', correct: true, rationale: 'A governance catalog gives table/column/row access control, lineage and audit once, enforced across engines — the auditable-access requirement.' },
            { id: 'b', label: 'Give every analyst full admin on the storage account', correct: false, rationale: 'Blanket admin violates least privilege and makes auditing meaningless.' },
            { id: 'c', label: 'Share a single service-account key with the whole team', correct: false, rationale: 'Shared secrets cannot be attributed to a person and cannot express fine-grained access.' },
            { id: 'd', label: 'No access control — trust everyone internally', correct: false, rationale: 'Fails compliance and the explicit auditable-access requirement.' },
          ],
        },
      ],
      tradeoffs: [
        'Watermark incremental is simplest but cannot capture hard deletes — move to CDC (log-based) when deletes/updates must be tracked exactly.',
        'Keep raw Bronze immutable so you can reprocess Silver/Gold when business logic changes without re-extracting from source.',
        'Run the self-hosted runtime with 2+ nodes for high availability; it is your responsibility, unlike the managed cloud runtime.',
      ],
      reference: [
        'On-prem SQL Server → self-hosted IR (outbound) → raw files in the lake (Bronze)',
        'Spark/declarative pipeline: Bronze → Silver (clean, MERGE) → Gold (aggregate), all ACID',
        'Central catalog governs the curated tables with grants + lineage + audit',
      ],
      refs: [
        { label: 'Azure: self-hosted integration runtime', url: 'https://learn.microsoft.com/azure/data-factory/create-self-hosted-integration-runtime' },
        { label: 'Databricks: medallion architecture', url: 'https://docs.databricks.com/lakehouse/medallion.html' },
      ],
    },

    {
      id: 'cdc-to-analytics',
      title: 'Near-real-time CDC into analytics',
      difficulty: 'Advanced',
      clouds: ['azure', 'databricks', 'aws'],
      scenario: 'An operational Postgres database powers the app. Analysts need the analytics copy to reflect inserts, updates AND deletes within a few minutes, without hammering the production database.',
      requirements: [
        'Capture inserts, updates and deletes from the operational DB',
        'Avoid heavy query load on the production OLTP system',
        'Apply changes to an analytics table within minutes',
        'Keep the analytics table correct (no duplicate or stale rows)',
      ],
      decisions: [
        {
          id: 'capture',
          question: 'How do you capture changes including deletes?',
          options: [
            { id: 'a', label: 'Log-based CDC that reads the database transaction log (WAL)', correct: true, rationale: 'Reading the write-ahead log captures every insert/update/delete with minimal load on the source — unlike query-based polling, it sees deletes and does not scan tables.' },
            { id: 'b', label: 'Poll the table every minute with SELECT * WHERE updated_at > watermark', correct: false, rationale: 'Query-based polling misses hard deletes (the row is just gone) and adds repeated scan load to the OLTP system.' },
            { id: 'c', label: 'Nightly full dump of the whole database', correct: false, rationale: 'Nightly cannot meet a few-minutes SLA and is heavy on the source.' },
            { id: 'd', label: 'Add application code to double-write to analytics', correct: false, rationale: 'Dual writes are fragile (partial failures cause drift) and couple the app to analytics; CDC decouples cleanly.' },
          ],
        },
        {
          id: 'transport',
          question: 'How do the change events travel to the lake?',
          options: [
            { id: 'a', label: 'Stream CDC events through a log/connector, or use a managed mirroring/replication service', correct: true, rationale: 'A streaming log (or a managed mirroring service like Fabric Mirroring / DMS) reliably ships change events with ordering and replay to the analytics side.' },
            { id: 'b', label: 'Write each change to a shared spreadsheet', correct: false, rationale: 'Not durable, ordered, or scalable.' },
            { id: 'c', label: 'Have analysts refresh manually when they notice staleness', correct: false, rationale: 'Manual and unreliable; fails the few-minutes SLA.' },
            { id: 'd', label: 'Store changes only in the OLTP DB and query it live', correct: false, rationale: 'That is exactly the production load you were told to avoid.' },
          ],
        },
        {
          id: 'apply',
          question: 'How do you apply changes to keep the analytics table correct?',
          options: [
            { id: 'a', label: 'MERGE / APPLY CHANGES (upsert + delete) into an ACID table, ordered by commit sequence', correct: true, rationale: 'MERGE (or declarative APPLY CHANGES INTO) applies inserts/updates/deletes idempotently in commit order, keeping the table a correct current image — the purpose of an ACID lake format.' },
            { id: 'b', label: 'Append every change event and let analysts sort it out', correct: false, rationale: 'An append-only change log is not a current-state table; every query would need complex latest-version logic.' },
            { id: 'c', label: 'Overwrite the whole table on each micro-batch', correct: false, rationale: 'Full overwrite per batch does not scale and throws away the efficiency CDC gives you.' },
            { id: 'd', label: 'Apply updates but ignore deletes', correct: false, rationale: 'Ignoring deletes leaves ghost rows and violates the correctness requirement (and often compliance).' },
          ],
        },
      ],
      tradeoffs: [
        'Order matters: apply changes in commit/LSN order or an out-of-order update can resurrect a deleted row.',
        'Log-based CDC needs the right source configuration (logical replication / WAL level) and permissions — a common setup gotcha.',
        'Managed mirroring trades flexibility for near-zero ops; hand-rolled CDC + MERGE gives more control over transformations in-flight.',
      ],
      reference: [
        'Operational DB WAL → log-based CDC → streaming log / managed mirroring',
        'Change events land in the lake (Bronze change feed)',
        'MERGE / APPLY CHANGES INTO an ACID Silver table in commit order → current-state analytics table',
      ],
      refs: [
        { label: 'Databricks: APPLY CHANGES INTO (CDC)', url: 'https://docs.databricks.com/delta-live-tables/cdc.html' },
        { label: 'Azure: Fabric database mirroring', url: 'https://learn.microsoft.com/fabric/database/mirrored-database/overview' },
      ],
    },

    {
      id: 'cost-runaway-pipeline',
      title: 'Rescue a runaway-cost pipeline',
      difficulty: 'Advanced',
      clouds: ['databricks', 'aws', 'azure'],
      scenario: 'A daily Spark job that builds Gold tables has quietly tripled in cost. It reads a huge partitioned lake, does several joins, and writes thousands of tiny output files. Runtime and bill are both climbing.',
      requirements: [
        'Cut compute cost without breaking correctness',
        'Keep (or improve) the daily SLA',
        'Address the small-files problem it creates',
        'Make the fix durable, not a one-off tweak',
      ],
      decisions: [
        {
          id: 'scan',
          question: 'Cost is dominated by how much data each run scans. First lever?',
          options: [
            { id: 'a', label: 'Partition pruning + column pruning — read only needed partitions/columns', correct: true, rationale: 'Pushing predicates so the job reads only the relevant date partitions and columns is the single biggest, safest cost lever on a lake-backed Spark job.' },
            { id: 'b', label: 'Increase the cluster size so it finishes faster', correct: false, rationale: 'A bigger cluster processes the same wasted scan faster but usually costs the same or more; it treats the symptom, not the cause.' },
            { id: 'c', label: 'Cache the entire lake in memory', correct: false, rationale: 'Caching a huge lake needs enormous memory and still reads everything first — it does not reduce the scan.' },
            { id: 'd', label: 'Rewrite the job in pure Python without Spark', correct: false, rationale: 'Abandoning Spark for a large distributed join is a step backwards and will be slower, not cheaper.' },
          ],
        },
        {
          id: 'smallfiles',
          question: 'The output is thousands of tiny files. Fix?',
          options: [
            { id: 'a', label: 'Compact output (OPTIMIZE / repartition / coalesce to right-sized files)', correct: true, rationale: 'Right-sizing output files (compaction or repartition/coalesce before write) fixes the small-files problem, speeding every downstream reader and cutting request cost.' },
            { id: 'b', label: 'Leave it — small files are fine', correct: false, rationale: 'Thousands of tiny files slow every reader and inflate list/open requests; this is a real, compounding problem.' },
            { id: 'c', label: 'Write one single giant file', correct: false, rationale: 'One huge file removes write parallelism and read pruning; the goal is right-sized files, not one file.' },
            { id: 'd', label: 'Switch output to CSV', correct: false, rationale: 'CSV is larger, uncompressed and non-columnar — strictly worse for cost and speed.' },
          ],
        },
        {
          id: 'join',
          question: 'A join against a small lookup dimension shuffles the huge fact table. Fix?',
          options: [
            { id: 'a', label: 'Broadcast the small dimension so the large table is not shuffled', correct: true, rationale: 'A broadcast (map-side) join ships the small table to every executor, avoiding a full shuffle of the large fact table — a major speed/cost win when one side is small.' },
            { id: 'b', label: 'Cross join then filter', correct: false, rationale: 'A cross join explodes rows catastrophically — the opposite of what you want.' },
            { id: 'c', label: 'Disable the optimizer so Spark "just runs"', correct: false, rationale: 'Disabling the Catalyst/adaptive optimizer removes the very optimizations (like adaptive broadcast) that help.' },
            { id: 'd', label: 'Collect the fact table to the driver and join in Python', correct: false, rationale: 'Collecting a huge table to the driver causes OOM and defeats distributed processing.' },
          ],
        },
        {
          id: 'durable',
          question: 'How do you keep the fix from silently regressing?',
          options: [
            { id: 'a', label: 'Enforce file-layout/maintenance in the pipeline + monitor runtime & cost over time', correct: true, rationale: 'Baking compaction/optimized-writes into the pipeline and alerting on runtime/cost drift makes the fix durable and catches the next regression early.' },
            { id: 'b', label: 'Fix it manually this once and move on', correct: false, rationale: 'The requirement is a durable fix; a one-off tweak will drift back as data grows.' },
            { id: 'c', label: 'Add a comment in the code saying "please keep it fast"', correct: false, rationale: 'A comment does not enforce anything or detect regressions.' },
            { id: 'd', label: 'Delete old data so the job has less to read', correct: false, rationale: 'Deleting needed data to cut cost breaks correctness and likely compliance — not acceptable.' },
          ],
        },
      ],
      tradeoffs: [
        'Partition/column pruning and broadcast joins are correctness-neutral — they change how, not what, is computed.',
        'Compaction costs some compute now to save far more on every future read; schedule it, do not skip it.',
        'Right-sizing beats both extremes: too many tiny files and one giant file are both bad. Aim for ~100MB–1GB files.',
        'Monitoring closes the loop — cost rescue is a process, not a single edit.',
      ],
      reference: [
        'Push predicates → prune partitions + columns (read less)',
        'Broadcast small dimensions → avoid shuffling the fact table',
        'Compact/right-size output files in-pipeline (OPTIMIZE / repartition)',
        'Monitor runtime + cost; alert on drift',
      ],
      refs: [
        { label: 'Spark: performance tuning', url: 'https://spark.apache.org/docs/latest/sql-performance-tuning.html' },
        { label: 'Databricks: optimize performance', url: 'https://docs.databricks.com/optimizations/index.html' },
      ],
    },
  ];

  const byId = {};
  CHALLENGES.forEach(c => { byId[c.id] = c; });

  TV.DesignChallenges = {
    all() { return CHALLENGES.slice(); },
    byId(id) { return byId[id] || null; },
    ids() { return CHALLENGES.map(c => c.id); },
    count() { return CHALLENGES.length; },
  };
})();
