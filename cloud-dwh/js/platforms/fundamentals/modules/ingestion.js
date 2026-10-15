/* Fundamentals · "How Data Gets In" group — the ingestion emphasis.
   Ingestion big picture, batch & bulk load, streaming, CDC & mirroring,
   ETL vs ELT. Authored for the shared FundKit. */
(function () {
  'use strict';
  const Kit = window.CDWH && window.CDWH.FundKit;
  if (!Kit) return;

  Kit.registerAll({

    /* ─────────────────── Ingestion big picture ─────────────────── */
    'fund-ingest-overview': {
      eyebrow: '🟡 How Data Gets In',
      title: 'The ingestion big picture',
      lead: 'Before a warehouse can answer anything, the data has to get in. Almost every pipeline — no matter the tool — follows the same four beats: <strong>source → stage → load → serve</strong>. Knowing that shape tells you where batch, streaming, and change-data-capture each belong.',
      sections: [
        { h: 'The four beats of every pipeline', p:
          '<p><strong>1 · Source</strong> — where data is born: operational databases, SaaS apps, clickstreams, logs, files from partners.</p>' +
          '<p><strong>2 · Stage</strong> — a landing zone (usually object storage) where raw data sits before loading. Staging decouples the source from the warehouse and makes loads retryable.</p>' +
          '<p><strong>3 · Load</strong> — bring the staged data into warehouse tables, as a bulk batch, a continuous stream, or a replicated change feed.</p>' +
          '<p><strong>4 · Serve</strong> — transform and model it (see <code>ETL vs ELT</code>) so BI and ML can read clean, query-ready tables.</p>' },
        { h: 'Three ways to do the "load" beat', p:
          '<p><strong>Batch / bulk</strong> — load large files on a schedule (hourly, nightly). Simplest and cheapest per row; freshness measured in minutes to hours.</p>' +
          '<p><strong>Streaming</strong> — ingest events continuously as they happen; freshness in seconds. More moving parts.</p>' +
          '<p><strong>CDC / mirroring</strong> — keep the warehouse in lock-step with a source database by replicating its inserts, updates, and deletes.</p>' },
        { h: 'How to choose', p:
          '<p>Match the method to the <strong>freshness</strong> the business actually needs. Most pipelines are mostly batch, with streaming reserved for the few things that truly need to be live. Over-engineering everything to real-time is a classic, expensive mistake.</p>' },
      ],
      diagramTitle: '🎬 Source → stage → load → serve',
      stage: { caption: 'The universal ingestion pipeline — and where each load mode fits',
        groups: [
          { id: 'source', label: '1 · Source', sub: 'where data is born', nodes: [
            { id: 'db', label: 'Operational DBs' }, { id: 'apps', label: 'SaaS apps' }, { id: 'stream', label: 'Clickstream / logs' } ], connectorAfter: 'land raw data' },
          { id: 'stage', label: '2 · Stage', sub: 'object-storage landing zone', nodes: [ { id: 'zone', label: 'Raw files / events' } ], connectorAfter: 'batch · stream · CDC' },
          { id: 'load', label: '3 · Load', sub: 'into warehouse tables', nodes: [
            { id: 'batch', label: 'Batch load' }, { id: 'strm', label: 'Streaming' }, { id: 'cdc', label: 'CDC / mirror' } ], connectorAfter: 'transform & model' },
          { id: 'serve', label: '4 · Serve', nodes: [ { id: 'model', label: 'Clean, query-ready tables' } ] },
        ] },
      steps: [
        { label: 'Source', title: 'Data is born in many systems', on: { spot: ['source'], flow: ['db', 'apps', 'stream'] },
          body: 'Operational databases, SaaS tools, and event streams each produce data in their own shape and pace. None of them is a good place to run analytics.',
          facts: ['Many heterogeneous sources', 'Different formats and velocities', 'Analytics must not run here'] },
        { label: 'Stage', title: 'Land it in a staging zone', on: { spot: ['stage'], flow: ['zone'], conn: ['source'] },
          body: 'Raw data is first written to a staging area — typically object storage. This decouples sources from the warehouse and makes loads <strong>retryable and auditable</strong>.',
          facts: ['Object storage landing zone', 'Decouples source from warehouse', 'Raw copy you can reload from'] },
        { label: 'Load', title: 'Choose a load mode', on: { spot: ['load'], flow: ['batch', 'strm', 'cdc'], conn: ['stage'] },
          body: 'Bring the staged data in: <strong>batch</strong> for scheduled bulk files, <strong>streaming</strong> for live events, or <strong>CDC</strong> to mirror a source database\'s changes. Match the mode to the freshness you need.',
          facts: ['Batch: cheap, minutes–hours fresh', 'Streaming: live, seconds fresh', 'CDC: keeps a DB in sync'] },
        { label: 'Serve', title: 'Transform, model, and serve', on: { spot: ['serve'], flow: ['model'], conn: ['load'] },
          body: 'Loaded data is cleaned and modeled (usually ELT — transform inside the warehouse) into tables BI and ML can trust.',
          facts: ['Raw → clean → modeled layers', 'Transformation runs in the warehouse', 'One query-ready source for consumers'] },
      ],
      map: {
        intro: 'Each platform provides the same four beats, with its own named services for staging and loading.',
        sf: { term: 'Stages → COPY / Snowpipe', points: ['Internal/external stages are the landing zone', 'COPY INTO for bulk; Snowpipe for continuous files', 'Streams & Tasks / Dynamic Tables model the serve layer'] },
        rs: { term: 'S3 → COPY / streaming', points: ['S3 is the staging zone', 'COPY for bulk; streaming ingestion for live', 'Zero-ETL pulls from Aurora/RDS with no pipeline'] },
        fb: { term: 'OneLake → pipelines', points: ['OneLake + shortcuts land data', 'Data pipelines, Dataflows Gen2, COPY INTO', 'Eventstreams for live; Mirroring for databases'] },
      },
      takeaway: 'Every pipeline is <b>source → stage → load → serve</b>. The only real decision is which load mode — <b>batch</b>, <b>streaming</b>, or <b>CDC</b> — each dataset needs, and that follows from the freshness the business requires. Default to batch; reach for streaming only where "live" truly matters.',
      compare: 'cmp-architecture', compareLabel: 'Architecture',
      docs: [
        { label: 'Snowflake: Data loading overview', url: 'https://docs.snowflake.com/en/user-guide/data-load-overview' },
        { label: 'AWS: Loading data', url: 'https://docs.aws.amazon.com/redshift/latest/dg/t_Loading_data.html' },
        { label: 'Fabric: Ingest data', url: 'https://learn.microsoft.com/en-us/fabric/data-warehouse/ingest-data' },
      ],
    },

    /* ─────────────────── Batch & bulk load ─────────────────── */
    'fund-ingest-batch': {
      eyebrow: '🟡 How Data Gets In',
      title: 'Batch & bulk load',
      lead: 'Bulk loading files is the workhorse of warehouse ingestion — the cheapest, simplest, highest-throughput way to get large volumes in. Get the file layout right and a warehouse will load billions of rows in parallel; get it wrong and you leave most of the engine idle.',
      sections: [
        { h: 'Stage the files, then copy them in', p:
          '<p>The pattern is universal: drop data files into a staging location in object storage, then run a <strong>bulk copy</strong> command that reads them in parallel into a table. The copy command handles parsing, type conversion, error handling, and compression.</p>' },
        { h: 'File sizing is the #1 performance lever', p:
          '<p>An MPP engine parallelizes a load across its workers by handing each worker <strong>whole files</strong>. One giant file can only be processed by one worker, wasting the rest. The fix is many <strong>medium-sized, compressed</strong> files — enough files to keep every worker busy. (Snowflake and Redshift both recommend roughly 100–250 MB compressed per file.)</p>' },
        { h: 'Formats and the rest', p:
          '<p>Columnar file formats like <strong>Parquet</strong> load efficiently because they already match the warehouse\'s shape; CSV/JSON work but are heavier to parse. Beyond that: load pre-compressed files, split big ones, and let the loader capture rejected rows so a few bad records don\'t fail the whole batch.</p>' },
      ],
      diagramTitle: '🎬 Why file sizing decides load speed',
      stage: { caption: 'One big file starves the engine; many files feed every worker',
        groups: [
          { id: 'bad', label: 'Anti-pattern: one huge file', nodes: [ { id: 'big', label: '1 × 10 GB file' }, { id: 'idle', label: '3 idle workers', sub: 'nothing to do' } ], connectorAfter: 'vs.' },
          { id: 'good', label: 'Best practice: many medium files', sub: '~100–250 MB each, compressed', nodes: [
            { id: 'f1', label: 'file 1' }, { id: 'f2', label: 'file 2' }, { id: 'f3', label: 'file 3' }, { id: 'f4', label: 'file 4' } ], connectorAfter: 'bulk COPY, in parallel' },
          { id: 'tbl', label: 'Warehouse table', nodes: [ { id: 'loaded', label: 'Loaded columnar data' } ] },
        ] },
      steps: [
        { label: 'Anti-pattern', title: 'One giant file = one busy worker', on: { spot: ['bad'], flow: ['big'], dim: ['idle'] },
          body: 'An MPP loader assigns whole files to workers. A single 10 GB file can only be read by <strong>one</strong> worker — the rest sit idle and the load crawls.',
          facts: ['Files are the unit of parallelism', 'One file → one worker', 'Most of the engine is wasted'] },
        { label: 'Split', title: 'Split into many medium files', on: { spot: ['good'], flow: ['f1', 'f2', 'f3', 'f4'] },
          body: 'Break the data into many compressed files of roughly 100–250 MB. Now there is a file for every worker, and more in the queue behind them.',
          facts: ['~100–250 MB compressed per file', 'Enough files to cover every worker', 'Pre-compress (gzip/zstd/Parquet)'] },
        { label: 'COPY', title: 'Bulk copy reads them in parallel', on: { spot: ['good'], flow: ['f1', 'f2', 'f3', 'f4'], conn: ['good'] },
          body: 'The copy command fans the files out across all workers, which parse and load simultaneously. Columnar formats like Parquet load fastest.',
          facts: ['All workers load at once', 'Parsing + type conversion handled', 'Rejected rows captured, not fatal'] },
        { label: 'Loaded', title: 'Data lands as columnar storage', on: { spot: ['tbl'], flow: ['loaded'], conn: ['good'] },
          body: 'Rows land in the table\'s columnar format, compressed and ready to query. The same staged files can be reloaded if anything goes wrong.',
          facts: ['Stored columnar + compressed', 'Idempotent, retryable from stage', 'Throughput scales with worker count'] },
      ],
      map: {
        intro: 'Every platform has a bulk-copy command plus a continuous-file option for when batches arrive often.',
        sf: { term: 'Stages + COPY INTO', points: ['Internal or external (S3/Azure/GCS) stages', 'COPY INTO bulk-loads; auto-parses many formats', 'Snowpipe auto-loads new files continuously'], code: 'COPY INTO watch_events\n  FROM @my_stage\n  FILE_FORMAT = (TYPE = PARQUET);' },
        rs: { term: 'COPY from S3', points: ['COPY is the high-throughput bulk loader', 'Loads split files across slices in parallel', 'Auto-compression analyzes and encodes columns'], code: "COPY watch_events\n  FROM 's3://bucket/events/'\n  IAM_ROLE default\n  FORMAT AS PARQUET;" },
        fb: { term: 'COPY INTO / pipelines', points: ['T-SQL COPY INTO for bulk from ADLS/S3', 'Data pipelines (Data Factory) orchestrate loads', 'Dataflows Gen2 for low-code transforms on load'], code: "COPY INTO watch_events\n  FROM 'https://.../events/'\n  WITH (FILE_TYPE = 'PARQUET');" },
      },
      takeaway: 'Bulk load is cheap and fast when you feed the engine <b>many medium, compressed files</b> instead of one giant one — files are the unit of parallelism everywhere. Snowflake\'s <b>COPY INTO</b>, Redshift\'s <b>COPY</b>, and Fabric\'s <b>COPY INTO</b> are the same tool with different syntax.',
      compare: 'cmp-storage', compareLabel: 'Storage & Skipping',
      docs: [
        { label: 'Snowflake: COPY INTO', url: 'https://docs.snowflake.com/en/sql-reference/sql/copy-into-table' },
        { label: 'AWS: COPY best practices', url: 'https://docs.aws.amazon.com/redshift/latest/dg/c_loading-data-best-practices.html' },
        { label: 'Fabric: COPY INTO', url: 'https://learn.microsoft.com/en-us/fabric/data-warehouse/ingest-data-copy' },
      ],
    },

    /* ─────────────────── Streaming / real-time ─────────────────── */
    'fund-ingest-streaming': {
      eyebrow: '🟡 How Data Gets In',
      title: 'Streaming & real-time ingestion',
      lead: 'Some data is only valuable while it is fresh — fraud signals, live operations, real-time dashboards. Streaming ingestion brings events in <strong>continuously, within seconds</strong>, instead of waiting for the next batch. It is more powerful and more complex, so you use it deliberately.',
      sections: [
        { h: 'Micro-batch vs true streaming', p:
          '<p><strong>Micro-batching</strong> collects events for a few seconds or minutes and loads them as tiny, frequent batches — most "near-real-time" pipelines work this way and it is far simpler. <strong>True streaming</strong> ingests each event (or small rowset) as it arrives through a streaming API, pushing latency down to seconds or less.</p>' },
        { h: 'The hard parts', p:
          '<p>Streaming forces you to think about things batch ignores: <strong>latency</strong> (how fresh?), <strong>throughput</strong> (events/second at peak), <strong>ordering</strong> (do late or out-of-order events matter?), and <strong>exactly-once</strong> delivery (no duplicates, no drops). A message bus like Kafka/Kinesis usually sits in front to buffer and absorb spikes.</p>' },
        { h: 'When it\'s worth it', p:
          '<p>Reach for streaming only when the <em>decision</em> depends on freshness measured in seconds. If a dashboard is reviewed hourly, a 5-minute micro-batch is cheaper, simpler, and indistinguishable to the user. Streaming everything "because real-time sounds good" is a costly habit.</p>' },
      ],
      diagramTitle: '🎬 From event to live dashboard in seconds',
      stage: { caption: 'Continuous events flow through a buffer into the warehouse, live',
        groups: [
          { id: 'producers', label: 'Producers', sub: 'emit events continuously', nodes: [
            { id: 'app', label: 'Playback app' }, { id: 'iot', label: 'Devices / logs' } ], connectorAfter: 'publish' },
          { id: 'bus', label: 'Streaming buffer', sub: 'Kafka · Kinesis · Event Hubs', nodes: [ { id: 'topic', label: 'Ordered, durable log' } ], connectorAfter: 'ingest continuously' },
          { id: 'wh', label: 'Warehouse / real-time store', nodes: [ { id: 'live', label: 'Live table', sub: 'seconds fresh' } ], connectorAfter: 'serve' },
          { id: 'serve', label: 'Consumers', nodes: [ { id: 'rt', label: 'Real-time dashboard' } ] },
        ] },
      steps: [
        { label: 'Produce', title: 'Events are emitted constantly', on: { spot: ['producers'], flow: ['app', 'iot'] },
          body: 'Apps and devices emit a continuous stream of events — plays, pauses, errors, sensor readings — thousands per second at peak.',
          facts: ['Unbounded, continuous data', 'High and spiky throughput', 'Each event valuable while fresh'] },
        { label: 'Buffer', title: 'A streaming log absorbs the flow', on: { spot: ['bus'], flow: ['topic'], conn: ['producers'] },
          body: 'A message bus (Kafka, Kinesis, Event Hubs) buffers events in an <strong>ordered, durable</strong> log. It decouples bursty producers from the warehouse and enables replay.',
          facts: ['Buffers spikes, smooths load', 'Preserves order; durable + replayable', 'Decouples producers from consumers'] },
        { label: 'Ingest', title: 'The warehouse ingests continuously', on: { spot: ['wh'], flow: ['live'], conn: ['bus'] },
          body: 'A streaming-ingestion feature pulls from the log and appends rows within seconds — via a true streaming API or frequent micro-batches — with exactly-once guarantees.',
          facts: ['Seconds-fresh, not hours', 'Micro-batch or true streaming', 'Exactly-once avoids dup/loss'] },
        { label: 'Serve', title: 'Dashboards update live', on: { spot: ['serve'], flow: ['rt'], conn: ['wh'] },
          body: 'Because rows arrive continuously, real-time dashboards and alerts reflect what is happening right now — the payoff that justifies the extra complexity.',
          facts: ['Live dashboards & alerting', 'Use only where freshness drives decisions', 'Otherwise a micro-batch is cheaper'] },
      ],
      map: {
        intro: 'Each cloud has a dedicated low-latency ingestion path, usually fed from its ecosystem\'s streaming service.',
        sf: { term: 'Snowpipe Streaming', points: ['Row-level streaming API, lower latency than file-based Snowpipe', 'Writes rows directly, no staged files', 'Kafka connector streams topics straight in'] },
        rs: { term: 'Streaming ingestion', points: ['Ingests from Kinesis Data Streams & Amazon MSK (Kafka)', 'Lands into a materialized view, refreshed continuously', 'No staging in S3 — straight from the stream'] },
        fb: { term: 'Eventstreams / RTI', points: ['Eventstreams route live events (no code)', 'Real-Time Intelligence + Eventhouse (KQL) for sub-second', 'Can land into OneLake for warehouse queries'] },
      },
      takeaway: 'Streaming buys <b>seconds-fresh</b> data at the cost of more moving parts (a buffer, ordering, exactly-once). Use it only where freshness changes a decision. The platforms each have a native path: <b>Snowpipe Streaming</b>, Redshift <b>streaming ingestion</b> from Kinesis/MSK, and Fabric <b>Eventstreams / Real-Time Intelligence</b>.',
      compare: 'cmp-scaling', compareLabel: 'Scaling & Concurrency',
      docs: [
        { label: 'Snowflake: Snowpipe Streaming', url: 'https://docs.snowflake.com/en/user-guide/data-load-snowpipe-streaming-overview' },
        { label: 'AWS: Streaming ingestion', url: 'https://docs.aws.amazon.com/redshift/latest/dg/materialized-view-streaming-ingestion.html' },
        { label: 'Fabric: Real-Time Intelligence', url: 'https://learn.microsoft.com/en-us/fabric/real-time-intelligence/overview' },
      ],
    },

    /* ─────────────────── CDC & mirroring ─────────────────── */
    'fund-ingest-cdc': {
      eyebrow: '🟡 How Data Gets In',
      title: 'CDC, replication & mirroring',
      lead: 'Much of the data you want to analyze already lives in operational databases — and it keeps changing. <strong>Change Data Capture (CDC)</strong> keeps the warehouse in sync by continuously carrying over every insert, update, and delete, instead of re-copying whole tables.',
      sections: [
        { h: 'Why not just reload the table?', p:
          '<p>Re-exporting a 500-million-row table every hour is slow, expensive, and still stale between runs. CDC instead captures <strong>only what changed</strong> — typically by reading the source database\'s transaction log — and applies those changes to the warehouse copy. Small, continuous, and near-real-time.</p>' },
        { h: 'Handling updates and deletes', p:
          '<p>Warehouses love appends and dislike row-level updates, so CDC usually lands changes as an <strong>append-only change feed</strong> (each row tagged insert/update/delete) and then <strong>merges</strong> them into the target table. This also enables history: keep every version (a slowly-changing dimension) or collapse to the latest state.</p>' },
        { h: 'CDC vs mirroring vs federation', p:
          '<p><strong>CDC</strong> is the general technique. <strong>Mirroring / zero-ETL</strong> are managed, near-real-time replicas that hide the plumbing — you point at a source and the platform keeps a synced copy. <strong>Federation</strong> is different: it queries the source <em>live, in place</em> without copying, good for small or rarely-needed data.</p>' },
      ],
      diagramTitle: '🎬 Capturing change from the source log',
      stage: { caption: 'Read the transaction log → change feed → merge into the warehouse',
        groups: [
          { id: 'src', label: 'Source OLTP database', sub: 'constantly changing', nodes: [ { id: 'rows', label: 'Live tables' }, { id: 'log', label: 'Transaction log', sub: 'every insert/update/delete' } ], connectorAfter: 'capture changes only' },
          { id: 'feed', label: 'Change feed', sub: 'append-only, tagged I/U/D', nodes: [ { id: 'changes', label: 'Change events' } ], connectorAfter: 'merge / apply' },
          { id: 'wh', label: 'Warehouse copy', nodes: [ { id: 'synced', label: 'Synced table', sub: 'near real-time' } ], connectorAfter: 'optionally keep history' },
          { id: 'hist', label: 'History', nodes: [ { id: 'scd', label: 'Latest state or full history' } ] },
        ] },
      steps: [
        { label: 'Change', title: 'The source keeps changing', on: { spot: ['src'], flow: ['rows'] },
          body: 'Profiles update, subscriptions change, rows get deleted. Re-copying the whole table constantly would be hopelessly expensive.',
          facts: ['Large tables, constant small changes', 'Full reloads are slow and stale', 'We only want what changed'] },
        { label: 'Capture', title: 'Read the transaction log', on: { spot: ['src'], flow: ['log'], dim: ['rows'] },
          body: 'CDC reads the database\'s transaction log — the authoritative record of every change — with little overhead on the source, and no missed rows.',
          facts: ['Log-based = low source impact', 'Captures inserts, updates, deletes', 'Nothing slips through'] },
        { label: 'Feed', title: 'Emit an append-only change feed', on: { spot: ['feed'], flow: ['changes'], conn: ['src'] },
          body: 'Changes become an append-only stream, each row tagged as insert, update, or delete — exactly the append-friendly shape a warehouse wants.',
          facts: ['Append-only, warehouse-friendly', 'Each row tagged I/U/D', 'Ordered and replayable'] },
        { label: 'Merge', title: 'Merge into the warehouse copy', on: { spot: ['wh'], flow: ['synced'], conn: ['feed'] },
          body: 'A MERGE applies the changes to the target table, bringing the warehouse copy to within seconds/minutes of the source — no full reload.',
          facts: ['MERGE applies the deltas', 'Near-real-time sync', 'Far cheaper than reloading'] },
        { label: 'History', title: 'Keep the latest — or all of it', on: { spot: ['hist'], flow: ['scd'], conn: ['wh'] },
          body: 'Choose to collapse to the current state, or retain every version as a slowly-changing dimension so you can ask "what did this look like back then?"',
          facts: ['Latest-state or full history', 'Enables slowly-changing dimensions', 'Point-in-time analysis'] },
      ],
      map: {
        intro: 'Each platform offers both a native change-tracking mechanism and a managed replication path from operational sources.',
        sf: { term: 'Streams & Tasks', points: ['Streams track row-level changes (CDC) on a table', 'Tasks schedule the MERGE that applies them', 'Dynamic Tables declaratively keep a target in sync'] },
        rs: { term: 'Zero-ETL & DMS', points: ['Zero-ETL replicates Aurora/RDS into Redshift, no pipeline', 'AWS DMS for broader CDC sources', 'Federated query reads live OLTP without copying'] },
        fb: { term: 'Database Mirroring', points: ['Mirroring continuously replicates a source DB into OneLake', 'Near-real-time, fully managed, no pipeline to build', 'Mirrored data is immediately queryable + in Power BI'] },
      },
      takeaway: 'CDC keeps the warehouse in sync by carrying <b>only the changes</b> (from the source\'s transaction log) and merging them — far cheaper than reloading. Snowflake does it with <b>Streams &amp; Tasks</b>, Redshift with <b>zero-ETL / DMS</b>, and Fabric with managed <b>Database Mirroring</b>.',
      compare: 'cmp-architecture', compareLabel: 'Architecture',
      docs: [
        { label: 'Snowflake: Streams (CDC)', url: 'https://docs.snowflake.com/en/user-guide/streams-intro' },
        { label: 'AWS: Zero-ETL integrations', url: 'https://docs.aws.amazon.com/redshift/latest/mgmt/zero-etl-using.html' },
        { label: 'Fabric: Mirroring', url: 'https://learn.microsoft.com/en-us/fabric/database/mirrored-database/overview' },
      ],
    },

    /* ─────────────────── ETL vs ELT ─────────────────── */
    'fund-elt': {
      eyebrow: '🟡 How Data Gets In',
      title: 'ETL vs ELT — where transformation runs',
      lead: 'Raw data is rarely query-ready; it has to be cleaned, joined, and reshaped. The question is <strong>when</strong> that transformation happens — before loading (ETL) or after, inside the warehouse (ELT). The cloud flipped the default from ETL to ELT, and it matters for cost, speed, and flexibility.',
      sections: [
        { h: 'ETL: transform first', p:
          '<p><strong>Extract → Transform → Load.</strong> Data is pulled out, reshaped on a separate processing server, and only the finished result is loaded. This was necessary when warehouse storage and compute were scarce and expensive — you didn\'t want raw junk taking up room.</p>' +
          '<p>Downsides: you need a separate transformation tier to scale and maintain, and you lose the raw data — if requirements change, you must re-extract.</p>' },
        { h: 'ELT: load first, transform in place', p:
          '<p><strong>Extract → Load → Transform.</strong> Load the raw data straight into the warehouse, then transform it there with SQL. Cloud warehouses have cheap storage and massive elastic compute, so it\'s fine to keep the raw layer and let the warehouse do the heavy lifting.</p>' +
          '<p>Benefits: no separate compute tier, transformations are just version-controlled SQL, and because the raw data stays, you can always rebuild or add new models later. This is the modern default (dbt, Dynamic Tables, etc.).</p>' },
        { h: 'The medallion pattern', p:
          '<p>ELT pipelines usually layer the data: <strong>Bronze</strong> (raw, as-landed) → <strong>Silver</strong> (cleaned, conformed) → <strong>Gold</strong> (business-ready marts). Each layer is built from the one below with SQL, so the whole chain is reproducible and testable.</p>' },
      ],
      diagramTitle: '🎬 ELT: load raw, then refine in layers',
      stage: { caption: 'Extract → Load raw → Transform in the warehouse (Bronze → Silver → Gold)',
        groups: [
          { id: 'extract', label: 'Extract', nodes: [ { id: 'raw', label: 'Raw source data' } ], connectorAfter: 'load as-is' },
          { id: 'bronze', label: 'Bronze — raw landed', sub: 'kept, never discarded', nodes: [ { id: 'b', label: 'Raw tables' } ], connectorAfter: 'transform with SQL' },
          { id: 'silver', label: 'Silver — cleaned', sub: 'deduped, typed, conformed', nodes: [ { id: 's', label: 'Clean tables' } ], connectorAfter: 'transform with SQL' },
          { id: 'gold', label: 'Gold — business-ready', nodes: [ { id: 'g', label: 'Marts / star schemas' } ] },
        ] },
      steps: [
        { label: 'Extract', title: 'Pull data from the source', on: { spot: ['extract'], flow: ['raw'] },
          body: 'Data is extracted from operational systems — but unlike ETL, it is <strong>not</strong> transformed yet. It heads into the warehouse exactly as it is.',
          facts: ['No transform tier needed', 'Move data as-is', 'Fast, simple extract'] },
        { label: 'Load raw', title: 'Land the raw data (Bronze)', on: { spot: ['bronze'], flow: ['b'], conn: ['extract'] },
          body: 'The raw data is loaded straight into a Bronze layer and <strong>kept</strong>. Because storage is cheap, you never throw it away — it is your replayable source of truth.',
          facts: ['Cheap storage keeps raw data', 'Replay / rebuild anytime', 'Requirements can change later'] },
        { label: 'Clean', title: 'Transform to Silver with SQL', on: { spot: ['silver'], flow: ['s'], conn: ['bronze'] },
          body: 'Inside the warehouse, SQL dedupes, types, and conforms the data into a clean Silver layer — using the same elastic compute that runs your queries.',
          facts: ['Transform = version-controlled SQL', 'Warehouse compute does the work', 'No separate ETL servers'] },
        { label: 'Model', title: 'Build Gold business marts', on: { spot: ['gold'], flow: ['g'], conn: ['silver'] },
          body: 'Silver feeds Gold: star schemas and aggregates tailored to the business questions. Each layer is reproducible from the one below.',
          facts: ['Business-ready star schemas', 'Reproducible, testable chain', 'BI & ML read from Gold'] },
      ],
      map: {
        intro: 'All three are built for ELT — they give you elastic SQL compute plus declarative ways to keep transformed tables fresh.',
        sf: { term: 'SQL · Snowpark · Dynamic Tables', points: ['ELT in SQL; Snowpark for Python/Java/Scala', 'Dynamic Tables declaratively materialize transforms', 'Streams & Tasks orchestrate incremental ELT'] },
        rs: { term: 'SQL · stored procs · dbt', points: ['ELT in SQL; stored procedures for logic', 'Materialized views for incremental models', 'dbt is a common transformation framework'] },
        fb: { term: 'Pipelines · notebooks · T-SQL', points: ['Data pipelines & Dataflows Gen2 orchestrate', 'Spark notebooks or T-SQL for transforms', 'Medallion (Bronze/Silver/Gold) in OneLake'] },
      },
      takeaway: 'The cloud made <b>ELT</b> the default: load raw into cheap storage, then transform with the warehouse\'s own elastic SQL — no separate ETL tier, raw data kept for replay. All three support it, typically layered <b>Bronze → Silver → Gold</b>, via SQL plus a declarative refresh tool (Dynamic Tables, materialized views, or pipelines).',
      compare: 'cmp-ecosystem', compareLabel: 'Ecosystem & Cost',
      docs: [
        { label: 'Snowflake: Dynamic Tables', url: 'https://docs.snowflake.com/en/user-guide/dynamic-tables-about' },
        { label: 'AWS: Transforming data (ELT)', url: 'https://docs.aws.amazon.com/redshift/latest/dg/t_Transforming_data.html' },
        { label: 'Fabric: Medallion architecture', url: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-medallion-lakehouse-architecture' },
      ],
    },

  });
})();
