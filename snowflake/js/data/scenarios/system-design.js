/* System Design Simulator — seed bank (design renderer) */
(function () {
  'use strict';
  const S = [
    {
      id: 'sd-ecommerce-rt', area: 'design', category: 'Streaming', difficulty: 'advanced',
      title: 'Near-real-time e-commerce events platform',
      requirements: 'A retailer streams clickstream and order events from apps through Kafka. Analysts need dashboards within ~1–2 minutes of events, transformations must be incremental, and BI must not be slowed by ingestion.',
      steps: [
        {
          prompt: 'How do you ingest the Kafka events?',
          choices: [
            { text: 'Snowpipe Streaming from a Kafka connector into RAW', correct: true, why: 'Row-level, sub-minute ingestion straight from Kafka into RAW tables — no file staging, matching the latency requirement.' },
            { text: 'Batch COPY every hour', correct: false, why: 'Hourly batch cannot meet a 1–2 minute freshness SLA.' },
            { text: 'Snowpipe auto-ingest on exported files', correct: false, why: 'Adds a file-export hop and per-file latency; Streaming is the direct path from Kafka.' },
          ],
          insight: 'Match ingestion latency to the SLA: files → Snowpipe; rows/Kafka with sub-minute needs → Snowpipe Streaming.',
        },
        {
          prompt: 'How do you transform RAW → analytics incrementally?',
          choices: [
            { text: 'Dynamic Tables with a short TARGET_LAG', correct: true, why: 'Declarative incremental refresh keeps the analytics layer fresh to a target lag with minimal plumbing.' },
            { text: 'Hourly full-rebuild CTAS', correct: false, why: 'Full rebuilds are expensive and miss the freshness target.' },
            { text: 'BI tool does the transforms', correct: false, why: 'Pushing heavy transforms into BI recomputes per dashboard and does not scale.' },
          ],
          insight: 'Layer RAW → staging → analytics as chained Dynamic Tables for a self-managing incremental pipeline.',
        },
        {
          prompt: 'How do you keep ingestion from slowing BI?',
          choices: [
            { text: 'Separate warehouses for ingestion/transform vs BI over the same storage', correct: true, why: 'Workload isolation: independent warehouses on shared storage so ingestion spikes never queue BI.' },
            { text: 'One large shared warehouse', correct: false, why: 'Mixed workloads on one warehouse cause contention and unpredictable cost.' },
            { text: 'Throttle BI users at peak', correct: false, why: 'Degrades the experience instead of isolating the cause.' },
          ],
        },
      ],
      architecture: 'Apps → Kafka → Snowpipe Streaming → RAW → chained Dynamic Tables (staging → analytics) → BI. Ingestion/transform run on their own warehouse; BI queries a separate warehouse over the same shared storage.',
      tradeoffs: 'Streaming + Dynamic Tables minimize latency and code but cost continuous refresh compute; watch for DT full-refresh fallback that would blow the lag.',
      failureModes: 'Kafka connector lag/backpressure, DT falling back to full refresh, and duplicate/out-of-order events — handle dedup on a natural key and design for at-least-once delivery.',
      cost: 'Right-size the ingestion warehouse, use short auto-suspend on BI, and keep DTs incremental so refresh cost tracks change volume.',
      interviewAnswer: 'I would stream Kafka events via Snowpipe Streaming into RAW, transform incrementally with chained Dynamic Tables to hit the 1–2 minute SLA, and isolate ingestion and BI on separate warehouses over shared storage so they never contend. I would dedup on a natural key for at-least-once delivery and monitor DT refresh_mode to keep it incremental.',
    },
    {
      id: 'sd-batch-lake', area: 'design', category: 'Batch', difficulty: 'intermediate',
      title: 'Batch data platform from cloud storage',
      requirements: 'Thousands of files land in S3 each day. Build RAW → STAGING → ANALYTICS with reliable, idempotent loading and basic schema-evolution handling.',
      steps: [
        {
          prompt: 'How do you load the daily files?',
          choices: [
            { text: 'Snowpipe auto-ingest (or scheduled COPY) into RAW', correct: true, why: 'Continuous serverless loading of files as they land, with load history for idempotent retries.' },
            { text: 'Snowpipe Streaming', correct: false, why: 'Streaming is for row-level sources; the source here is files in storage.' },
            { text: 'Manual COPY runs', correct: false, why: 'Not reliable or continuous at thousands of files/day.' },
          ],
          insight: 'File sources → COPY/Snowpipe; batch backfills → scheduled COPY.',
        },
        {
          prompt: 'How do you make loading idempotent against duplicate files?',
          choices: [
            { text: 'Rely on COPY load history (no FORCE) + MERGE on a natural key downstream', correct: true, why: 'Load history skips already-loaded files; MERGE gives exactly-once semantics into targets.' },
            { text: 'Always COPY with FORCE=TRUE', correct: false, why: 'FORCE bypasses dedup and re-ingests files, creating duplicates.' },
            { text: 'Truncate and reload everything nightly', correct: false, why: 'Expensive and destroys incremental history.' },
          ],
        },
        {
          prompt: 'How do you handle schema changes in incoming files?',
          choices: [
            { text: 'Land into a VARIANT/typed-hybrid RAW and evolve typed columns in STAGING', correct: true, why: 'A flexible RAW absorbs new fields; controlled promotion to typed columns in STAGING handles evolution safely.' },
            { text: 'Hard-fail on any new column forever', correct: false, why: 'Too brittle for evolving sources.' },
            { text: 'Ignore schema entirely', correct: false, why: 'Loses type safety and pruning where it matters.' },
          ],
        },
      ],
      architecture: 'S3 → Snowpipe/COPY → RAW (flexible/VARIANT) → STAGING (typed, deduped via MERGE) → ANALYTICS. Idempotency via load history + MERGE on natural keys.',
      tradeoffs: 'Flexible RAW eases evolution but defers typing; MERGE-based dedup adds transform cost vs naive appends.',
      failureModes: 'Duplicate/late files, malformed records, and schema drift — validate in STAGING and route bad records to a quarantine table.',
      cost: 'Batch on a right-sized warehouse with short auto-suspend; avoid full reloads.',
      interviewAnswer: 'I would load files with Snowpipe/COPY into a flexible RAW layer, rely on load history plus MERGE on natural keys for idempotency, and evolve schema by promoting typed columns in STAGING while quarantining bad records. This gives reliable, incremental, evolution-tolerant batch loading.',
    },
    {
      id: 'sd-enterprise-multiteam', area: 'design', category: 'Enterprise', difficulty: 'advanced',
      title: 'Multi-team enterprise platform',
      requirements: 'Data Engineering, Analytics, Data Science, Finance, and Marketing share one Snowflake account. You must isolate workloads, prevent any team from starving compute, and enforce least-privilege access.',
      steps: [
        {
          prompt: 'How do you isolate compute across teams?',
          choices: [
            { text: 'A dedicated (multi-cluster where needed) warehouse per team/workload over shared storage', correct: true, why: 'Separate warehouses isolate performance and make cost attributable per team without copying data.' },
            { text: 'One giant shared warehouse for everyone', correct: false, why: 'Guarantees contention and unattributable cost.' },
            { text: 'A separate account per team', correct: false, why: 'Overkill; fragments shared data and governance unnecessarily.' },
          ],
          insight: 'Storage/compute separation means many warehouses read the same data — isolation without duplication.',
        },
        {
          prompt: 'How do you stop one team from consuming all compute/budget?',
          choices: [
            { text: 'Resource monitors with per-warehouse credit quotas and alerts', correct: true, why: 'Quotas cap and alert per warehouse, bounding each team\'s spend automatically.' },
            { text: 'Ask teams to self-limit', correct: false, why: 'Unenforced; the first incident blows the budget.' },
            { text: 'Downsize all warehouses', correct: false, why: 'Blunt; hurts legitimate heavy workloads.' },
          ],
        },
        {
          prompt: 'How do you design access?',
          choices: [
            { text: 'Two-tier RBAC (access roles + business roles) with future grants and least privilege', correct: true, why: 'Access roles hold object privileges; business roles compose them per team; future grants cover new objects; least privilege throughout.' },
            { text: 'Give every team ACCOUNTADMIN', correct: false, why: 'Catastrophic over-privilege.' },
            { text: 'One shared role for all', correct: false, why: 'No isolation or least privilege.' },
          ],
        },
      ],
      architecture: 'Shared storage; per-team warehouses (multi-cluster where concurrency demands). Resource monitors cap each team. Two-tier RBAC with future grants; sensitive data protected by masking/row-access policies.',
      tradeoffs: 'More warehouses and roles to manage — the cost of real isolation and governance.',
      failureModes: 'Role sprawl and scattered ownership; standardize creation with managed-access schemas.',
      cost: 'Per-team attribution via metering; monitors enforce budgets; independent auto-suspend per warehouse.',
      interviewAnswer: 'I isolate each team on its own warehouse over shared storage, bound spend with per-warehouse resource monitors, and enforce least privilege with a two-tier RBAC model plus future grants. Sensitive data gets masking and row-access policies, and I keep ownership predictable with managed-access schemas.',
    },
    {
      id: 'sd-partner-share', area: 'design', category: 'Data Sharing', difficulty: 'intermediate',
      title: 'Secure external data sharing with a partner',
      requirements: 'Share a governed slice of your data live with an external partner. No copies, no nightly exports, and the partner must only see permitted rows/columns.',
      steps: [
        {
          prompt: 'Same region as the partner — how do you share?',
          choices: [
            { text: 'Secure Data Sharing via a share of secure views', correct: true, why: 'Live, no-copy, read-only access; the partner queries your data and pays their own compute.' },
            { text: 'Nightly export to their bucket', correct: false, why: 'Stale, duplicative, and operationally heavy.' },
            { text: 'Replicate your database to them', correct: false, why: 'Copies storage and is aimed at cross-region/DR, not live single-region sharing.' },
          ],
          insight: 'No-copy live sharing is a direct benefit of storage/compute separation.',
        },
        {
          prompt: 'How do you restrict what the partner sees?',
          choices: [
            { text: 'Share secure views + row-access/masking policies', correct: true, why: 'Secure views and policies expose exactly the permitted rows/columns.' },
            { text: 'Share the raw base tables', correct: false, why: 'Over-exposes data and internal structure.' },
            { text: 'Trust the partner to query only their rows', correct: false, why: 'Governance cannot rely on trust.' },
          ],
        },
        {
          prompt: 'The partner is in a different cloud region. Now what?',
          choices: [
            { text: 'Use replication or a Marketplace/private listing to reach their region', correct: true, why: 'Cross-region sharing requires replicating the share data or publishing a listing.' },
            { text: 'Direct share still works cross-region', correct: false, why: 'Direct shares are same-region; cross-region needs replication/listings.' },
            { text: 'Email them extracts', correct: false, why: 'Defeats the no-copy, governed requirement.' },
          ],
        },
      ],
      architecture: 'Provider secure views + policies → Share → consumer read-only database (same region). Cross-region via replication or Marketplace/private listing.',
      tradeoffs: 'Same-region is instant and free of extra storage; cross-region adds replication cost/latency.',
      failureModes: 'Over-exposure through non-secure views; always share secure views with policies.',
      cost: 'No extra storage for you same-region; consumer pays their compute. Cross-region adds replication storage/transfer.',
      interviewAnswer: 'Same region, I use Secure Data Sharing of secure views with row-access and masking policies so the partner queries live data with no copies and sees only permitted rows/columns. Cross-region, I replicate the share data or publish a private listing, since direct shares are same-region.',
    },
    {
      id: 'sd-medallion', area: 'design', category: 'Modeling', difficulty: 'intermediate',
      title: 'Medallion (RAW/STAGING/ANALYTICS) with quality gates',
      requirements: 'Design a layered warehouse with data-quality checks and clear ownership between raw ingestion and curated analytics.',
      steps: [
        {
          prompt: 'What table types per layer?',
          choices: [
            { text: 'Transient for RAW/STAGING (regenerable), permanent for ANALYTICS', correct: true, why: 'Regenerable intermediate layers avoid Fail-safe cost; curated analytics gets full protection.' },
            { text: 'Permanent everywhere', correct: false, why: 'Pays Fail-safe on regenerable staging data unnecessarily.' },
            { text: 'Temporary everywhere', correct: false, why: 'Temporary tables vanish at session end — unusable for shared pipelines.' },
          ],
          insight: 'Match durability to value: regenerable → transient; business-critical → permanent.',
        },
        {
          prompt: 'Where do quality checks live?',
          choices: [
            { text: 'Between STAGING and ANALYTICS, quarantining bad rows', correct: true, why: 'Gate promotion to curated analytics; route failures to a quarantine table for triage.' },
            { text: 'Only at the BI layer', correct: false, why: 'Too late; bad data already spread.' },
            { text: 'No checks — trust the source', correct: false, why: 'Guarantees silent data-quality incidents.' },
          ],
        },
      ],
      architecture: 'RAW (transient) → STAGING (transient, typed + dedup) → quality gate (quarantine bad rows) → ANALYTICS (permanent). Ownership: engineering owns RAW/STAGING, analytics owns curated marts.',
      tradeoffs: 'Transient layers save Fail-safe cost but lose 7-day recovery — acceptable because they are regenerable.',
      failureModes: 'Bad rows leaking downstream; enforce the quality gate and monitor quarantine volume.',
      cost: 'Transient storage savings on big raw layers; incremental transforms keep compute proportional.',
      interviewAnswer: 'I use transient tables for regenerable RAW and STAGING to avoid Fail-safe cost, gate promotion to a permanent ANALYTICS layer with quality checks that quarantine bad rows, and split ownership so engineering owns raw/staging and analytics owns the curated marts.',
    },
    {
      id: 'sd-dr', area: 'design', category: 'Resilience', difficulty: 'advanced',
      title: 'Cross-region disaster recovery',
      requirements: 'The business needs the platform to survive a regional outage with a defined RPO/RTO, and to fail over cleanly.',
      steps: [
        {
          prompt: 'What provides cross-region resilience?',
          choices: [
            { text: 'Database replication to a secondary region + failover', correct: true, why: 'Replication maintains a secondary copy in another region; failover promotes it — the actual DR mechanism.' },
            { text: 'Time Travel', correct: false, why: 'Time Travel is in-region operational recovery, not cross-region DR.' },
            { text: 'Fail-safe', correct: false, why: 'Fail-safe is a 7-day, support-only last resort in the same region.' },
          ],
          insight: 'Time Travel/clone = operational mistakes; replication + failover = disaster recovery.',
        },
        {
          prompt: 'How do you meet a tight RPO?',
          choices: [
            { text: 'Increase replication frequency and monitor replication lag', correct: true, why: 'RPO is bounded by how current the secondary is; frequent replication and lag monitoring keep it tight.' },
            { text: 'Rely on daily manual exports', correct: false, why: 'Coarse RPO and error-prone.' },
            { text: 'Assume the primary never fails', correct: false, why: 'Not a plan.' },
          ],
        },
      ],
      architecture: 'Primary region DB → scheduled replication → secondary region replica; Client Redirect / failover promotes the replica on outage. Runbooks + periodic failover drills.',
      tradeoffs: 'Replication adds storage/transfer cost and some lag; tighter RPO costs more.',
      failureModes: 'Untested failover, replication lag exceeding RPO — drill regularly and alert on lag.',
      cost: 'Duplicated storage in the secondary region plus transfer; size to the RPO/RTO the business will pay for.',
      interviewAnswer: 'True DR uses cross-region database replication plus failover (with Client Redirect), sized so replication lag meets the RPO and drilled to meet the RTO. Time Travel and Fail-safe are in-region recovery, not DR, so I would not rely on them for a regional outage.',
    },
    {
      id: 'sd-ml-features', area: 'design', category: 'ML', difficulty: 'advanced',
      title: 'Feature engineering platform for ML',
      requirements: 'Data scientists need reproducible, reusable features computed from large tables, served consistently to training and inference, without exporting data out of Snowflake.',
      steps: [
        {
          prompt: 'Where do feature transformations run?',
          choices: [
            { text: 'Snowpark (pushdown DataFrames) inside Snowflake', correct: true, why: 'Snowpark runs feature logic on Snowflake compute next to the data — no export, full scale and governance.' },
            { text: 'Export to an external Spark cluster', correct: false, why: 'Moves large data out, adding cost, latency, and governance risk.' },
            { text: 'Compute features ad hoc in notebooks per person', correct: false, why: 'Not reproducible or reusable across the team.' },
          ],
          insight: 'Snowpark keeps programmatic/ML logic in-platform via pushdown.',
        },
        {
          prompt: 'How do you keep features consistent and reusable?',
          choices: [
            { text: 'Materialize curated features as Dynamic Tables/feature tables shared via RBAC', correct: true, why: 'A governed, incrementally maintained feature layer gives training and inference the same definitions.' },
            { text: 'Recompute features differently in each job', correct: false, why: 'Causes training/serving skew.' },
            { text: 'Copy feature CSVs around', correct: false, why: 'Duplicative and drift-prone.' },
          ],
        },
      ],
      architecture: 'Source tables → Snowpark feature transforms → materialized feature tables (Dynamic Tables) → consumed by training and inference; access governed by RBAC.',
      tradeoffs: 'In-platform compute is simpler and governed; some specialized ML tooling may still live outside and read via Snowpark/connectors.',
      failureModes: 'Training/serving skew from divergent definitions — centralize feature logic and materialization.',
      cost: 'Incremental feature refresh keeps compute proportional; avoid recomputing shared features per job.',
      interviewAnswer: 'I compute features with Snowpark so the logic runs on Snowflake compute next to the data with no export, materialize a governed feature layer as Dynamic Tables so training and inference share identical definitions, and control access with RBAC — eliminating training/serving skew and data-movement cost.',
    },
    {
      id: 'sd-lakehouse-iceberg', area: 'design', category: 'Interop', difficulty: 'advanced',
      title: 'Open lakehouse with multi-engine access',
      requirements: 'Your org wants Snowflake plus Spark/Trino to read the same tables without duplicating data or locking into one engine\'s proprietary format.',
      steps: [
        {
          prompt: 'What table format enables multi-engine access?',
          choices: [
            { text: 'Iceberg tables on your own cloud storage', correct: true, why: 'Open Apache Iceberg format lets Snowflake and external engines read the same data with no copies or lock-in.' },
            { text: 'Standard Snowflake proprietary tables', correct: false, why: 'Only Snowflake can read them — fails the multi-engine requirement.' },
            { text: 'Nightly export to Parquet for Spark', correct: false, why: 'Duplicates data and goes stale.' },
          ],
          insight: 'Iceberg trades some native performance for open interoperability.',
        },
        {
          prompt: 'Snowflake will be the primary writer with full DML. Which mode?',
          choices: [
            { text: 'Snowflake-managed Iceberg', correct: true, why: 'Snowflake as catalog/writer gives full DML and strong performance while emitting open Iceberg metadata other engines read.' },
            { text: 'Externally-managed Iceberg', correct: false, why: 'Best when another system owns writes; here Snowflake is the writer.' },
            { text: 'Read-only external tables', correct: false, why: 'No DML; does not meet the write requirement.' },
          ],
        },
      ],
      architecture: 'Snowflake-managed Iceberg tables in your object storage; Snowflake writes with full DML; Spark/Trino read the same Iceberg tables via the catalog. No duplication.',
      tradeoffs: 'Open format may trail native Snowflake tables on some optimizations; you accept that for interoperability and no lock-in.',
      failureModes: 'Catalog/metadata mismatches between engines; standardize the catalog and Iceberg version.',
      cost: 'Single copy of data serves all engines; no export/duplication cost.',
      interviewAnswer: 'I would use Snowflake-managed Iceberg tables on our own storage so Snowflake writes with full DML while Spark and Trino read the same open-format data with no duplication or lock-in. The trade-off is slightly less native optimization than proprietary tables, which is worth it for multi-engine interoperability.',
    },
  ];
  window.SnowflakeViz.ScenarioEngine.register('design', S);
})();
