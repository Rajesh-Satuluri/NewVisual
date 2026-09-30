/* End-to-End Interview Case Study — seed bank (chain renderer) */
(function () {
  'use strict';
  const S = [
    {
      id: 'cs-streaming', area: 'case-study', category: 'Streaming platform', difficulty: 'advanced',
      title: 'Netflix-style streaming analytics platform',
      intro: 'One architecture, end to end: Sources → Kafka → Snowflake ingestion → RAW → transformations → analytics → BI/ML. The interviewer drills each decision.',
      steps: [
        { q: 'Why this architecture (Kafka → Snowflake → layered model → BI/ML)?', a: 'Kafka decouples producers from the warehouse and buffers bursts; Snowflake gives elastic, decoupled storage/compute so ingestion, transformation, BI, and ML can run isolated over shared data; a layered RAW→staging→analytics model preserves an immutable source of truth and enables reprocessing. It scales each concern independently and keeps cost proportional to use.' },
        { q: 'Which ingestion method from Kafka, and why?', a: 'Snowpipe Streaming for row-level, sub-minute ingestion straight from a Kafka connector into RAW — no file staging. Snowpipe auto-ingest would fit if the source were files in storage; batch COPY cannot meet streaming freshness.' },
        { q: 'How do you handle duplicate events?', a: 'Treat delivery as at-least-once and enforce exactly-once in the table with a MERGE keyed on a business/event id, deduping to the latest per key. Never rely on the producer not to duplicate.' },
        { q: 'How do you handle late-arriving data?', a: 'Order by event_time (not arrival), guard merges to update only when newer, and keep a rolling reprocessing window for daily aggregates so late events self-correct the totals.' },
        { q: 'How do you handle schema changes from producers?', a: 'Land into a flexible RAW (VARIANT / schema-evolution) so new fields are captured without breaking ingestion, then promote hot fields to typed columns in staging deliberately.' },
        { q: 'How do you transform RAW → analytics?', a: 'Chained Dynamic Tables with a short target lag for declarative incremental refresh, so the analytics layer stays fresh with minimal plumbing; watch refresh_mode to keep it incremental.' },
        { q: 'How do you optimize the heaviest analytics queries?', a: 'Diagnose with the Query Profile: restore pruning with clustering where filters are selective, fix join grain to avoid explosions, cut spilling by scaling up or reducing data into sorts, and materialize repeated heavy aggregations.' },
        { q: 'How do you control compute cost?', a: 'Isolate workloads on separate warehouses, short auto-suspend to kill idle time, multi-cluster only where concurrency demands it, resource monitors for budgets, and fix top-cost queries rather than upsizing.' },
        { q: 'How do you isolate workloads and design RBAC?', a: 'A warehouse per workload (ingestion/transform/BI/ML) over shared storage; two-tier RBAC (access roles + business roles) with future grants and least privilege, plus masking/row-access policies on sensitive data.' },
        { q: 'How do you recover from an accidental delete?', a: 'Time Travel AT/BEFORE to query and restore (or clone AT a past point); Fail-safe is the support-only last resort. For a regional outage, cross-region replication + failover — Time Travel is not DR.' },
        { q: 'How do you monitor failures and freshness?', a: 'Alert on connector lag/backpressure, Dynamic Table refresh_mode and lag, stream staleness, task failures, and cost via resource monitors; quarantine bad records and monitor quarantine volume.' },
        { q: 'What happens if ingestion stops, or BI load suddenly spikes?', a: 'If ingestion stops, RAW simply stops advancing — stored data is safe (storage is independent of compute) and I alert on freshness lag. A BI spike is concurrency: the isolated BI warehouse scales out via multi-cluster so it never contends with ingestion or transform.' },
      ],
    },
    {
      id: 'cs-batch-enterprise', area: 'case-study', category: 'Enterprise batch', difficulty: 'advanced',
      title: 'Enterprise batch data platform',
      intro: 'One architecture: S3 → COPY/Snowpipe → RAW → STAGING → ANALYTICS serving multiple teams. Defend each choice.',
      steps: [
        { q: 'Why a layered medallion model with an immutable RAW?', a: 'RAW is the source of truth, enabling reprocessing when logic changes without re-ingesting; STAGING types and dedups; ANALYTICS serves curated marts. It separates ownership (engineering vs analytics) and makes the pipeline auditable and re-derivable.' },
        { q: 'Which ingestion method and table types per layer?', a: 'Snowpipe/COPY from S3 into a flexible RAW; transient tables for regenerable RAW/STAGING (no Fail-safe cost) and permanent for curated ANALYTICS that needs full protection.' },
        { q: 'How do you make loading idempotent and dedup?', a: 'Rely on COPY load history (no blanket FORCE), and MERGE on a business key into targets so retries and duplicate files converge to exactly-once results.' },
        { q: 'How do you handle schema evolution and bad records?', a: 'Absorb drift in a VARIANT-friendly RAW and promote typed columns in STAGING; set ON_ERROR to continue with sensible thresholds and route rejects to a quarantine table for triage.' },
        { q: 'How do you isolate five teams and prevent compute starvation?', a: 'A dedicated warehouse per team over shared storage (multi-cluster where concurrency demands), with per-warehouse resource monitors capping each team\'s credits and enabling cost attribution.' },
        { q: 'How do you design access across teams?', a: 'Two-tier RBAC: access roles hold object privileges, business roles per team compose them, rolling up to SYSADMIN; future grants for new objects; masking/row-access policies for PII; ACCOUNTADMIN minimal and audited.' },
        { q: 'How do you keep costs predictable?', a: 'Right-size warehouses, short auto-suspend, resource monitors with alerts and caps, workload isolation for attribution, and periodic top-cost query reviews with pruning/materialization fixes.' },
        { q: 'How do you recover from mistakes and disasters?', a: 'Time Travel/clone for operational errors within retention, Fail-safe as last resort for permanent objects, and cross-region replication + failover for regional disaster recovery, sized to the RPO/RTO the business will fund.' },
        { q: 'How do you handle a nightly job that suddenly doubles in cost?', a: 'Attribute via ACCOUNT_USAGE metering/query history, find the driver (a new backfill or a pruning regression as a table grew), fix pruning/filters and schedule the backfill off-peak — rather than upsizing to run inefficiency faster.' },
        { q: 'What happens if a downstream mart is wrong after a logic change?', a: 'Because RAW is immutable, I re-derive the affected layers from RAW with the corrected logic and idempotently MERGE — no re-ingestion needed, and history is preserved.' },
      ],
    },
  ];
  window.SnowflakeViz.ScenarioEngine.register('case-study', S);
})();
