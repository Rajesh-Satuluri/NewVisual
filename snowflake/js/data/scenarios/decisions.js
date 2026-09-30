/* Feature Decision Simulator — seed bank (decision renderer) */
(function () {
  'use strict';
  const S = [
    {
      id: 'dec-ingest', area: 'decisions', category: 'Ingestion', difficulty: 'intermediate',
      title: 'COPY vs Snowpipe vs Snowpipe Streaming',
      scenario: 'Files land in cloud storage continuously (every few minutes) and the business wants them queryable within ~1–2 minutes, without running a warehouse 24/7.',
      question: 'Which ingestion mechanism fits best?',
      choices: [
        { text: 'Scheduled COPY INTO on a warehouse', correct: false },
        { text: 'Snowpipe (auto-ingest)', correct: true },
        { text: 'Snowpipe Streaming', correct: false },
      ],
      rationale: {
        fit: 'Snowpipe auto-ingest reacts to storage notifications and loads files serverlessly within about a minute — continuous, no always-on warehouse, per-file billing.',
        alternatives: [
          { name: 'Scheduled COPY', why: 'Requires a running warehouse and adds schedule latency; wasteful for continuous small arrivals.' },
          { name: 'Snowpipe Streaming', why: 'Best for row-level, sub-second streaming from an app/Kafka — overkill and a different API when the source is files in storage.' },
        ],
        performance: 'Sub-minute file latency; scales with file arrival.',
        cost: 'Serverless per-file/credit-based; no idle warehouse cost.',
        tradeoffs: 'Per-file overhead means you still want reasonably sized files, not thousands of tiny ones.',
        whenAltApplies: 'Choose Snowpipe Streaming when data arrives as rows from an application/Kafka and you need sub-second latency; choose COPY for large scheduled batch backfills.',
      },
    },
    {
      id: 'dec-stream-dt', area: 'decisions', category: 'Pipelines', difficulty: 'advanced',
      title: 'Stream + Task vs Dynamic Table',
      scenario: 'You need an incrementally maintained transformation from raw to a cleaned table, refreshed every few minutes, with minimal operational code.',
      question: 'How do you build the incremental transform?',
      choices: [
        { text: 'Stream + Task with MERGE', correct: false },
        { text: 'Dynamic Table with TARGET_LAG', correct: true },
        { text: 'Materialized View', correct: false },
      ],
      rationale: {
        fit: 'A Dynamic Table declares the target state as a SELECT and lets Snowflake handle incremental refresh and scheduling to a target lag — least code, self-managing dependencies.',
        alternatives: [
          { name: 'Stream + Task', why: 'More control and works for arbitrary logic, but you own the MERGE, scheduling, and DAG plumbing.' },
          { name: 'Materialized View', why: 'Limited to single-table aggregations/projections; cannot express joins/multi-step transforms.' },
        ],
        performance: 'Incremental refresh keeps cost proportional to change volume.',
        cost: 'Pay for refresh compute; incremental keeps it low.',
        tradeoffs: 'Some SQL patterns fall back to full refresh; less imperative control than tasks.',
        whenAltApplies: 'Use Stream + Task when you need custom procedural logic, calls to external functions, or precise control over when/how the merge happens.',
      },
    },
    {
      id: 'dec-task-dt', area: 'decisions', category: 'Pipelines', difficulty: 'intermediate',
      title: 'Task vs Dynamic Table for orchestration',
      scenario: 'A multi-step pipeline needs to call a stored procedure, then send a notification, then load an external system.',
      question: 'What orchestrates this best inside Snowflake?',
      choices: [
        { text: 'Dynamic Tables', correct: false },
        { text: 'A Task DAG', correct: true },
        { text: 'A single large view', correct: false },
      ],
      rationale: {
        fit: 'Task DAGs express ordered, imperative steps (procedures, notifications, side effects) with dependencies — exactly what this workflow is.',
        alternatives: [
          { name: 'Dynamic Tables', why: 'Declarative data materialization only — they cannot call procedures or perform side-effecting steps.' },
          { name: 'One big view', why: 'Views compute on read and cannot orchestrate steps or side effects.' },
        ],
        performance: 'Runs steps only when triggered/scheduled.',
        cost: 'Warehouse or serverless task compute per run.',
        tradeoffs: 'You own dependency wiring and error handling.',
        whenAltApplies: 'Use Dynamic Tables when the goal is purely to keep a derived table fresh, not to run procedural workflow steps.',
      },
    },
    {
      id: 'dec-task-ext', area: 'decisions', category: 'Pipelines', difficulty: 'intermediate',
      title: 'Snowflake Tasks vs external orchestrator (Airflow)',
      scenario: 'Your pipeline spans Snowflake plus S3, a Spark job, and a downstream API, with complex cross-system retries and SLAs.',
      question: 'Where should orchestration live?',
      choices: [
        { text: 'Snowflake Task DAG only', correct: false },
        { text: 'An external orchestrator (e.g. Airflow) coordinating Snowflake', correct: true },
        { text: 'Dynamic Tables only', correct: false },
      ],
      rationale: {
        fit: 'When orchestration spans many systems with cross-system dependencies, retries, and SLAs, an external orchestrator gives you the DAG, observability, and integrations across all of them.',
        alternatives: [
          { name: 'Snowflake Tasks', why: 'Great for Snowflake-internal DAGs, but limited visibility/control over non-Snowflake systems like Spark or external APIs.' },
          { name: 'Dynamic Tables', why: 'Data-only; not an orchestrator.' },
        ],
        performance: 'Depends on the external scheduler; Snowflake steps still run on Snowflake compute.',
        cost: 'Orchestrator infra cost plus Snowflake compute.',
        tradeoffs: 'Another system to operate; more moving parts.',
        whenAltApplies: 'Keep it in Snowflake Tasks when the whole pipeline is Snowflake-internal — no external systems to coordinate.',
      },
    },
    {
      id: 'dec-table-type', area: 'decisions', category: 'Modeling', difficulty: 'beginner',
      title: 'Temporary vs Transient vs Permanent tables',
      scenario: 'A staging table holds intermediate ETL data that can always be regenerated and must not incur Fail-safe storage cost.',
      question: 'Which table type?',
      choices: [
        { text: 'Permanent', correct: false },
        { text: 'Transient', correct: true },
        { text: 'Temporary', correct: false },
      ],
      rationale: {
        fit: 'Transient tables persist across sessions but have no Fail-safe and minimal Time Travel — ideal for regenerable staging data where you want durability without Fail-safe cost.',
        alternatives: [
          { name: 'Permanent', why: 'Adds 7-day Fail-safe storage cost you do not need for regenerable data.' },
          { name: 'Temporary', why: 'Dropped at session end — unsuitable if other sessions/tasks must read the staging data.' },
        ],
        performance: 'Identical query performance to permanent.',
        cost: 'No Fail-safe; lower storage cost than permanent.',
        tradeoffs: 'No Fail-safe means no 7-day recovery after Time Travel — acceptable only for regenerable data.',
        whenAltApplies: 'Use Temporary for session-scoped scratch; Permanent for durable business data that needs Fail-safe protection.',
      },
    },
    {
      id: 'dec-view-mv', area: 'decisions', category: 'Modeling', difficulty: 'intermediate',
      title: 'View vs Materialized View',
      scenario: 'A dashboard repeatedly runs the same heavy aggregation over a large, slowly changing table.',
      question: 'How do you speed it up?',
      choices: [
        { text: 'Regular view', correct: false },
        { text: 'Materialized view', correct: true },
        { text: 'Copy the result into a static table nightly by hand', correct: false },
      ],
      rationale: {
        fit: 'A materialized view precomputes and auto-maintains the aggregation, and Snowflake can transparently reroute queries to it — fast reads on a slowly changing base.',
        alternatives: [
          { name: 'Regular view', why: 'Recomputes on every read; no speedup for a repeated heavy aggregation.' },
          { name: 'Manual nightly table', why: 'Reinvents materialization without auto-maintenance or freshness guarantees.' },
        ],
        performance: 'Reads hit precomputed results; large speedup for repeated aggregations.',
        cost: 'Background maintenance credits; worth it when reads ≫ writes.',
        tradeoffs: 'MVs are limited (single table, subset of SQL) and cost maintenance on churny data.',
        whenAltApplies: 'For multi-table transforms or higher churn, a Dynamic Table is usually the better fit than an MV.',
      },
    },
    {
      id: 'dec-mv-dt', area: 'decisions', category: 'Modeling', difficulty: 'advanced',
      title: 'Materialized View vs Dynamic Table',
      scenario: 'You need a maintained result that joins three tables and applies window functions, kept fresh automatically.',
      question: 'Which do you use?',
      choices: [
        { text: 'Materialized View', correct: false },
        { text: 'Dynamic Table', correct: true },
        { text: 'Regular view', correct: false },
      ],
      rationale: {
        fit: 'Dynamic Tables support multi-table joins and richer SQL with declarative incremental refresh — an MV cannot express joins across three tables.',
        alternatives: [
          { name: 'Materialized View', why: 'Restricted to single-table aggregations/projections; no joins.' },
          { name: 'Regular view', why: 'Recomputes on read; not "maintained".' },
        ],
        performance: 'Incremental refresh keeps multi-table results fresh cheaply.',
        cost: 'Refresh compute proportional to change volume.',
        tradeoffs: 'Certain constructs force full refresh; watch refresh_mode.',
        whenAltApplies: 'An MV still wins for a simple single-table aggregation that benefits from automatic query rewrite.',
      },
    },
    {
      id: 'dec-cluster-so', area: 'decisions', category: 'Performance', difficulty: 'advanced',
      title: 'Clustering vs Search Optimization',
      scenario: 'A huge table is queried two ways: analysts run wide date-range scans, and an app does high-frequency point lookups by a high-cardinality id.',
      question: 'Which optimization for the point-lookup workload?',
      choices: [
        { text: 'Add a clustering key on the id', correct: false },
        { text: 'Enable Search Optimization Service on the id', correct: true },
        { text: 'Resize the warehouse', correct: false },
      ],
      rationale: {
        fit: 'Search Optimization builds a persistent search structure that accelerates selective point lookups and equality/IN filters on high-cardinality columns — exactly the app workload.',
        alternatives: [
          { name: 'Clustering', why: 'Great for range scans on a correlated column (the analysts\' date ranges), but not optimized for random point lookups on a high-cardinality id.' },
          { name: 'Resize warehouse', why: 'Point lookups are a pruning/access-path problem, not a compute-size one.' },
        ],
        performance: 'Point lookups return with minimal scanning.',
        cost: 'Maintenance + storage for the search structure.',
        tradeoffs: 'Costs to maintain; justified only for genuinely selective lookups.',
        whenAltApplies: 'Use clustering for the analysts\' range scans on date — the two techniques can coexist for the two workloads.',
      },
    },
    {
      id: 'dec-scale', area: 'decisions', category: 'Warehouse', difficulty: 'intermediate',
      title: 'Resize (scale up) vs Multi-cluster (scale out)',
      scenario: 'Two problems on one warehouse: a nightly ETL query is individually slow, and a daytime BI crowd causes queuing.',
      question: 'For the daytime queuing specifically, what do you do?',
      choices: [
        { text: 'Scale the warehouse up to a bigger size', correct: false },
        { text: 'Enable multi-cluster (scale out)', correct: true },
        { text: 'Increase auto-suspend', correct: false },
      ],
      rationale: {
        fit: 'Queuing from many concurrent users is a concurrency problem; multi-cluster adds clusters under load and removes them after — the scale-out answer.',
        alternatives: [
          { name: 'Scale up', why: 'Makes a single query faster (right for the slow nightly ETL), but does not add concurrency slots for the crowd.' },
          { name: 'Auto-suspend', why: 'Only affects idle billing, not concurrency.' },
        ],
        performance: 'Eliminates queuing during peaks.',
        cost: 'Pay per active cluster; bounded by max cluster count.',
        tradeoffs: 'Does not speed up any single query.',
        whenAltApplies: 'Scale up (not out) for the slow nightly ETL — one heavy query needs more compute per cluster, not more clusters.',
      },
    },
    {
      id: 'dec-variant', area: 'decisions', category: 'Modeling', difficulty: 'intermediate',
      title: 'VARIANT vs typed columns',
      scenario: 'An event schema is stable and queried heavily on a handful of fields, but occasionally gains new optional attributes.',
      question: 'How do you model it for best query performance?',
      choices: [
        { text: 'Store everything as one VARIANT column', correct: false },
        { text: 'Promote hot/stable fields to typed columns, keep the rest in VARIANT', correct: true },
        { text: 'Flatten everything into hundreds of typed columns up front', correct: false },
      ],
      rationale: {
        fit: 'A hybrid model gives typed-column performance and pruning on the hot, stable fields while VARIANT preserves flexibility for rare/evolving attributes.',
        alternatives: [
          { name: 'All VARIANT', why: 'Flexible but you lose typed pruning/statistics on the hot fields, hurting performance at scale.' },
          { name: 'All typed', why: 'Rigid; every new optional attribute forces a schema change.' },
        ],
        performance: 'Typed columns prune and compress better than repeated VARIANT path extraction.',
        cost: 'Similar storage; better scan efficiency on hot fields.',
        tradeoffs: 'Slightly more modeling effort to pick which fields to promote.',
        whenAltApplies: 'Pure VARIANT is fine for truly exploratory or wildly variable schemas queried infrequently.',
      },
    },
    {
      id: 'dec-clone', area: 'decisions', category: 'Data Protection', difficulty: 'beginner',
      title: 'Zero-copy clone vs physical copy',
      scenario: 'QA needs a full copy of a 40 TB production database to test a migration, available in minutes, at low cost.',
      question: 'How do you provision it?',
      choices: [
        { text: 'CREATE DATABASE ... CLONE (zero-copy)', correct: true },
        { text: 'CTAS every table into a new database', correct: false },
        { text: 'Export to stage and reload', correct: false },
      ],
      rationale: {
        fit: 'Zero-copy clone creates instant metadata-only copies that share existing micro-partitions; QA gets 40 TB in seconds with storage cost only for subsequent changes.',
        alternatives: [
          { name: 'CTAS copy', why: 'Physically duplicates 40 TB — slow and doubles storage cost.' },
          { name: 'Export/reload', why: 'Even slower and more expensive; no reason to leave Snowflake.' },
        ],
        performance: 'Clone is near-instant regardless of size.',
        cost: 'Only diverged (changed) partitions incur new storage.',
        tradeoffs: 'Clones share partitions until modified; heavy divergence grows cost.',
        whenAltApplies: 'A physical copy makes sense only when you need the data in a separate account/region without sharing/replication.',
      },
    },
    {
      id: 'dec-share-repl', area: 'decisions', category: 'Data Sharing', difficulty: 'advanced',
      title: 'Secure Data Sharing vs Replication',
      scenario: 'A partner in the same cloud region must query your latest data live, without you shipping copies, and you want no storage duplication.',
      question: 'What do you use?',
      choices: [
        { text: 'Secure Data Sharing (a share)', correct: true },
        { text: 'Database replication to their account', correct: false },
        { text: 'Nightly export to their S3 bucket', correct: false },
      ],
      rationale: {
        fit: 'Secure Data Sharing gives the partner live, read-only access to your data with no copying and no storage duplication — they query your objects directly, paying their own compute.',
        alternatives: [
          { name: 'Replication', why: 'Copies data (storage duplication) and is aimed at cross-region/cross-account availability & DR, not live single-region sharing.' },
          { name: 'Nightly export', why: 'Stale, duplicative, and operationally heavy.' },
        ],
        performance: 'Consumer sees live data instantly; no sync lag.',
        cost: 'No extra storage for you; consumer pays their compute.',
        tradeoffs: 'Same-region (or requires listings/replication to cross regions); read-only.',
        whenAltApplies: 'Use replication when the consumer is in a different region/cloud or you need a DR/failover copy.',
      },
    },
  ];
  window.SnowflakeViz.ScenarioEngine.register('decisions', S);
})();
