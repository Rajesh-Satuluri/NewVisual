/* Interview Follow-Up Chains — seed bank (chain renderer) */
(function () {
  'use strict';
  const S = [
    {
      id: 'ch-micropart', area: 'chains', category: 'Architecture', difficulty: 'intermediate',
      title: 'Micro-partitions → pruning → clustering',
      intro: 'The interviewer starts simple and drills into how storage actually makes queries fast.',
      steps: [
        { q: 'What is a Snowflake micro-partition?', a: 'An immutable ~50–500 MB (compressed) columnar storage unit created automatically as data is loaded. Snowflake stores per-partition metadata (min/max values, distinct counts) that the optimizer uses to skip partitions.' },
        { q: 'How does partition pruning use that metadata?', a: 'For a filter, the optimizer checks each partition\'s min/max range and skips partitions that cannot contain matching rows — so a selective filter reads far fewer partitions than the whole table.' },
        { q: 'When does pruning become ineffective?', a: 'When the filter column is not correlated with storage order, so its values span the full min/max range in most partitions. Then nearly every partition qualifies and you scan the whole table.' },
        { q: 'How would you diagnose that in production?', a: 'Open the Query Profile and compare "partitions scanned" to "partitions total". A ratio near 1.0 on a selective filter means pruning failed.' },
        { q: 'Would you introduce clustering, and what are the trade-offs?', a: 'Yes, if the table is large and frequently filtered on that column. A clustering key co-locates rows so pruning works, but automatic reclustering consumes credits, so it pays off only for large tables with selective, frequent range filters — not small or churny tables.' },
      ],
    },
    {
      id: 'ch-storage-compute', area: 'chains', category: 'Architecture', difficulty: 'intermediate',
      title: 'Storage/compute separation → concurrency',
      intro: 'From the three-layer architecture down to why it enables workload isolation.',
      steps: [
        { q: 'Describe Snowflake\'s three-layer architecture.', a: 'Cloud Services (brain: optimizer, metadata, security, transactions), Compute (virtual warehouses that execute queries), and centralized Storage (columnar micro-partitions in cloud object storage). Compute and storage scale independently.' },
        { q: 'Why does separating storage and compute matter?', a: 'Multiple warehouses can read the same data simultaneously without copying it, and you can scale compute up/down or on/off without touching storage — you pay for each independently.' },
        { q: 'How do you isolate workloads with this?', a: 'Give each workload (ETL, BI, data science) its own virtual warehouse over the same shared storage, so one workload\'s spike cannot starve another.' },
        { q: 'How do you handle a concurrency spike within one workload?', a: 'Use a multi-cluster warehouse that scales out (adds clusters) under queuing and scales back in when it subsides.' },
        { q: 'What does Cloud Services do while all this runs?', a: 'It parses/optimizes queries, manages metadata and pruning, enforces security/RBAC, coordinates transactions, and serves the result cache — independent of whether any warehouse is running.' },
      ],
    },
    {
      id: 'ch-slowquery', area: 'chains', category: 'Performance', difficulty: 'advanced',
      title: 'Slow query → profile → the right lever',
      intro: 'A senior interviewer wants to see a diagnostic method, not a reflex to resize.',
      steps: [
        { q: 'A query is suddenly slow. What do you do first?', a: 'Open the Query Profile for a slow run and find where time and bytes go, before changing anything.' },
        { q: 'What signals do you look for?', a: 'Partitions scanned vs total (pruning), row-count growth across joins (explosion), bytes spilled to local/remote (memory pressure), and queued vs execution time (concurrency).' },
        { q: 'The profile shows near-full table scan. Next step?', a: 'Pruning failed — check whether the filter column correlates with storage order and consider a clustering key or a sorted reload.' },
        { q: 'Instead it shows 300 GB spilled. Now what?', a: 'If the row count is correct, scale the warehouse up so the sort/aggregation fits in memory, and reduce data entering the operator by filtering/projecting earlier.' },
        { q: 'Instead it shows high queued time. Now what?', a: 'That is concurrency, not per-query speed — scale out with a multi-cluster warehouse rather than scaling up.' },
        { q: 'How do you summarize your approach to the interviewer?', a: 'Diagnose with the profile, then match the lever to the bottleneck: pruning → clustering, memory → scale up, concurrency → scale out. Never resize blindly.' },
      ],
    },
    {
      id: 'ch-loading', area: 'chains', category: 'Data Loading', difficulty: 'advanced',
      title: 'COPY → Snowpipe → Streaming → idempotency',
      intro: 'Ingestion depth: from batch to streaming to exactly-once.',
      steps: [
        { q: 'How does COPY INTO avoid re-loading files?', a: 'It keeps load history per file for 64 days and skips files it already loaded, making retries idempotent by default (unless FORCE=TRUE or the path changes).' },
        { q: 'When would you move from COPY to Snowpipe?', a: 'When files arrive continuously and you want serverless, near-real-time loading without running a warehouse on a schedule.' },
        { q: 'When would you move to Snowpipe Streaming?', a: 'When data arrives as rows from an application or Kafka and you need sub-second latency without staging files at all.' },
        { q: 'How do duplicates still arise, and how do you prevent them?', a: 'At-least-once sources, FORCE loads, or retries outside load history can duplicate. Prevent with stable file paths, no blanket FORCE, and a MERGE on a business key for exactly-once semantics.' },
        { q: 'How do you make the whole pipeline idempotent?', a: 'Deduplicate on a natural key (QUALIFY ROW_NUMBER()), MERGE into targets keyed on that natural key, and ensure retries converge to the same final state regardless of how many times they run.' },
      ],
    },
    {
      id: 'ch-variant', area: 'chains', category: 'Semi-Structured', difficulty: 'intermediate',
      title: 'VARIANT → FLATTEN → performance',
      intro: 'Semi-structured handling and where it hurts performance.',
      steps: [
        { q: 'What is the VARIANT type?', a: 'A universal semi-structured type that stores JSON/Avro/XML-like data, letting you query nested fields with path notation (col:field.subfield) without predefining a schema.' },
        { q: 'How do you access nested arrays?', a: 'Use LATERAL FLATTEN to explode array elements into rows, then reference each element\'s fields.' },
        { q: 'What are the performance considerations?', a: 'Repeated path extraction from VARIANT is less efficient than typed columns, and you lose typed pruning/statistics. Heavy filters on VARIANT paths can hurt at scale.' },
        { q: 'How do you optimize a hot VARIANT workload?', a: 'Promote the hot, stable fields to typed columns (or a materialized/dynamic table) while keeping rare/evolving fields in VARIANT — a hybrid model.' },
        { q: 'When is pure VARIANT still the right choice?', a: 'For exploratory or highly variable schemas that are queried infrequently, where flexibility matters more than scan efficiency.' },
      ],
    },
    {
      id: 'ch-rbac', area: 'chains', category: 'Security', difficulty: 'advanced',
      title: 'RBAC → hierarchy → future grants',
      intro: 'Access control, from roles to why a user still gets denied.',
      steps: [
        { q: 'How does Snowflake RBAC work at a high level?', a: 'Privileges are granted to roles, roles are granted to users (and to other roles), and access flows through the role currently active in the session plus roles it inherits.' },
        { q: 'What is a role hierarchy?', a: 'Roles granted to other roles form a hierarchy; a higher role inherits the privileges of the roles beneath it, which is how you build least-privilege structures that roll up to admin roles.' },
        { q: 'A user has the right role but gets "insufficient privileges" — why?', a: 'The role may not be active/inherited in the session, or the privilege may be missing at a specific level (database/schema/object), or the object was created after the grant.' },
        { q: 'How do you cover objects created in the future?', a: 'Use future grants: GRANT ... ON FUTURE TABLES IN SCHEMA so newly created objects are automatically covered, then backfill existing objects once.' },
        { q: 'How does ownership complicate this?', a: 'The owning role has full control; if objects are created by different roles, ownership scatters. Standardize the creating role (or use MANAGED ACCESS schemas) so ownership and grants stay predictable.' },
      ],
    },
    {
      id: 'ch-recovery', area: 'chains', category: 'Recovery', difficulty: 'intermediate',
      title: 'Time Travel → Clone → Fail-safe',
      intro: 'Data protection layers and how they differ.',
      steps: [
        { q: 'What is Time Travel?', a: 'The ability to query or restore data as it existed at a past point within the retention window (up to 1 day on Standard, up to 90 on Enterprise) using AT/BEFORE or UNDROP.' },
        { q: 'Someone ran a bad DELETE. How do you recover?', a: 'Query the table AT(OFFSET/TIMESTAMP) before the delete and restore, or CREATE TABLE ... CLONE ... AT(...) to recover the pre-delete state without waiting.' },
        { q: 'How does zero-copy clone help in recovery?', a: 'You can instantly clone a table/schema/database at a past timestamp to inspect or restore without duplicating storage.' },
        { q: 'What is Fail-safe and how is it different from Time Travel?', a: 'Fail-safe is a non-configurable 7-day period (permanent objects only) after Time Travel expires, recoverable only by Snowflake support — a last resort, not self-service.' },
        { q: 'How does this inform a DR strategy?', a: 'Time Travel/clone handle operational mistakes; Fail-safe is a safety net; true DR across regions/accounts uses replication and failover, which Time Travel does not provide.' },
      ],
    },
    {
      id: 'ch-cost', area: 'chains', category: 'Cost', difficulty: 'advanced',
      title: 'Credits spiked → isolate → optimize',
      intro: 'A cost investigation the way a lead would run it.',
      steps: [
        { q: 'Monthly credits jumped 40%. Where do you start?', a: 'Attribute the spend: query ACCOUNT_USAGE / WAREHOUSE_METERING_HISTORY to find which warehouses and workloads drove the increase.' },
        { q: 'One warehouse dominates. What next?', a: 'Check whether it is idle-but-running (auto-suspend), running oversized, serving too many concurrent queries, or running newly inefficient queries.' },
        { q: 'It is idle much of the day. Fix?', a: 'Shorten AUTO_SUSPEND and enable AUTO_RESUME; running-while-idle is the most common silent leak.' },
        { q: 'It is genuinely busy with slow queries. Fix?', a: 'Use the Query Profile to fix the worst offenders — pruning/clustering, join grain, spilling — rather than upsizing the warehouse to run inefficiency faster.' },
        { q: 'How do you prevent recurrence?', a: 'Resource monitors with alerts/quotas, workload isolation per warehouse, right-sized auto-suspend, and periodic review of top-cost queries.' },
      ],
    },
    {
      id: 'ch-caching', area: 'chains', category: 'Performance', difficulty: 'intermediate',
      title: 'The three caches → what each proves',
      intro: 'Caching is a favorite trap; the interviewer checks you know which cache is which.',
      steps: [
        { q: 'What caches exist in Snowflake?', a: 'The result cache (Cloud Services, 24h, exact-query reuse), the warehouse/local disk cache (data cached on warehouse SSD), and the metadata cache used for pruning and simple metadata queries.' },
        { q: 'A repeat query returns instantly. What does that prove?', a: 'Likely a result-cache hit — served by Cloud Services with no warehouse compute — which does NOT mean warehouse performance improved.' },
        { q: 'When is the result cache NOT used?', a: 'When the query is non-deterministic, the underlying data changed, or certain session settings differ — then it recomputes.' },
        { q: 'What does the warehouse cache do?', a: 'It keeps recently read micro-partitions on local SSD so subsequent queries on the same warehouse re-read them faster — lost when the warehouse suspends/resizes.' },
        { q: 'Why does auto-suspend interact with caching?', a: 'Suspending clears the warehouse cache, so very aggressive auto-suspend can hurt latency for repeated workloads — a cost-vs-latency trade-off.' },
      ],
    },
    {
      id: 'ch-dt-pipeline', area: 'chains', category: 'Pipelines', difficulty: 'advanced',
      title: 'Streams/Tasks vs Dynamic Tables in a pipeline',
      intro: 'Choosing the incremental pattern and defending it.',
      steps: [
        { q: 'What problem do Streams and Tasks solve together?', a: 'Streams capture row-level changes (CDC) on a table; Tasks schedule SQL/procedures to consume those changes, so together they build incremental pipelines.' },
        { q: 'What do Dynamic Tables change about that?', a: 'Dynamic Tables let you declare the target as a SELECT and have Snowflake manage incremental refresh and dependencies to a target lag — replacing much of the manual stream+task+MERGE plumbing.' },
        { q: 'Do they solve exactly the same problem?', a: 'No. Dynamic Tables are declarative data materialization; Streams/Tasks give imperative control and can call procedures, do side effects, and express arbitrary logic. They overlap but are not interchangeable.' },
        { q: 'When would you still choose Streams + Tasks?', a: 'When you need custom procedural logic, external function calls, precise control of merge timing, or side-effecting steps a Dynamic Table cannot express.' },
        { q: 'How do you decide in an interview one-liner?', a: '"Dynamic Table by default for declarative incremental transforms; Stream + Task when I need procedural control or side effects."' },
      ],
    },
  ];
  window.SnowflakeViz.ScenarioEngine.register('chains', S);
})();
