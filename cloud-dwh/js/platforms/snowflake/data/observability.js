/* ============================================================
   Observability & Diagnosis — content model.
   How you FIND a problem in Snowflake (not just fix a named one):
   where the truth lives, the view cookbook, reading a Query
   Profile, and the guardrails that stop problems recurring.

   Rendered by CDWH.InterviewModule. Exposes:
     window.CDWH.P.snowflake.observability
   ============================================================ */
(function () {
  'use strict';
  const P = (window.CDWH = window.CDWH || {}).P.snowflake;

  const sql = (text, label) => ({ text: text, lang: 'sql', label: label });

  P.observability = {
    hero: {
      eyebrow: 'Operate · Interview Masterclass',
      title: 'Observability & Diagnosis',
      subtitle: 'The skill that separates "I read the docs" from "I ran this in production": knowing where the truth lives, writing the query that FINDS the expensive warehouse or the spilling query, and reading a Query Profile. Every recipe here is a query you can actually run.',
    },

    tabs: [
      /* ---------------- Tab 1: where to look ---------------- */
      {
        label: '🧭 Where to look',
        kind: 'blocks',
        blocks: [
          { t: 'callout', tag: '🧭 Three places truth lives', html: 'Snowflake gives you three observability surfaces. Interviewers probe whether you know **which one answers which question** — and the latency trade-off between them. Answer that cleanly and you sound like an operator.' },
          {
            t: 'table',
            title: 'ACCOUNT_USAGE vs INFORMATION_SCHEMA vs Snowsight',
            head: ['Surface', 'What it is', 'Latency / history'],
            rows: [
              ['`SNOWFLAKE.ACCOUNT_USAGE`', 'Account-wide views (QUERY_HISTORY, WAREHOUSE_METERING_HISTORY, ACCESS_HISTORY, STORAGE…). The system of record for audit, chargeback and trend analysis.', '**Latency up to ~45 min–3 h** (QUERY_HISTORY ~45 min; most views ~2 h). Retains **365 days**. Includes dropped objects.'],
              ['`INFORMATION_SCHEMA` table functions', 'Per-database, real-time functions: `QUERY_HISTORY()`, `WAREHOUSE_METERING_HISTORY()`, `COPY_HISTORY()`, `TASK_HISTORY()`. Use for "what is happening right now".', '**No latency.** Bounded window (e.g. QUERY_HISTORY() ~7 days / 10k rows). Current objects only.'],
              ['Snowsight UI', 'Query History, Query Profile, Warehouse activity, Cost Management dashboards — the same data, visualized.', 'Query Profile is near-real-time for a running/finished query; dashboards aggregate ACCOUNT_USAGE.'],
            ],
            note: 'The one-liner that lands: *"ACCOUNT_USAGE for audit and cost — but it lags up to 45 minutes, so for a live incident I use the INFORMATION_SCHEMA table functions or the Query Profile."*',
          },
          {
            t: 'table',
            title: 'Which view answers which question',
            head: ['The question', 'Where to look', 'Key columns'],
            rows: [
              ['Who/what is burning credits?', '`WAREHOUSE_METERING_HISTORY`, `QUERY_ATTRIBUTION_HISTORY`', '`credits_used`, `credits_attributed_compute`'],
              ['Which query was slow / spilled / scanned too much?', '`QUERY_HISTORY`', '`total_elapsed_time`, `bytes_spilled_to_*`, `partitions_scanned/total`'],
              ['Why is a warehouse queuing?', '`QUERY_HISTORY`', '`queued_overload_time`, `queued_provisioning_time`'],
              ['Did a COPY silently skip rows?', '`COPY_HISTORY`', '`status`, `row_count`, `error_count`, `first_error_message`'],
              ['Is my pipeline fresh / did a task fail?', '`TASK_HISTORY`, `DYNAMIC_TABLE_REFRESH_HISTORY`, `PIPE_USAGE_HISTORY`', '`state`, `error_message`, `refresh` action/state'],
              ['Who touched this (PII) table?', '`ACCESS_HISTORY`', '`base_objects_accessed`, `objects_modified`'],
              ['Where is storage / Time-Travel cost hiding?', '`TABLE_STORAGE_METRICS`', '`active_bytes`, `time_travel_bytes`, `failsafe_bytes`'],
            ],
          },
          { t: 'callout', tag: '🔑 The tagging habit', html: 'Set a `QUERY_TAG` (per session or per dbt model/Airflow task) so every query is attributable back to a job in `QUERY_HISTORY`. Teams that do this can answer "which pipeline caused the spike?" in one query; teams that do not are guessing. Mentioning this unprompted is a strong hands-on signal.' },
        ],
      },

      /* ---------------- Tab 2: find the problem ---------------- */
      {
        label: '🔎 Find the problem',
        kind: 'blocks',
        blocks: [
          { t: 'callout', tag: '📘 Recipes, not theory', html: 'Each card is a diagnostic you run. Interviewers love "walk me through how you’d *find* X" — these are the answers. Swap in your real thresholds.' },
          {
            t: 'card', icon: '💸', title: 'Find the top credit spenders', tag: 'cost',
            when: 'the monthly bill jumped and you need the culprit warehouse — fast.',
            body: ['Start at the warehouse level (cheap, aggregated), then drill into the queries on the worst offender.'],
            points: [
              'Compute credits double per size, so one oversized or never-suspending warehouse dominates the bill.',
              '`QUERY_ATTRIBUTION_HISTORY` attributes compute credits down to individual queries — the modern way to find the expensive *query*, not just the warehouse.',
            ],
            gotchas: ['`WAREHOUSE_METERING_HISTORY` is hourly and lags ~2 h — fine for trends, not for "is it running right now".'],
            code: sql(
`-- Credits by warehouse, last 14 days
SELECT warehouse_name,
       ROUND(SUM(credits_used), 1)          AS credits,
       ROUND(SUM(credits_used_compute), 1)  AS compute,
       ROUND(SUM(credits_used_cloud_services), 1) AS cloud_svcs
FROM   snowflake.account_usage.warehouse_metering_history
WHERE  start_time >= DATEADD('day', -14, CURRENT_TIMESTAMP())
GROUP  BY 1
ORDER  BY credits DESC;

-- Then: most expensive queries on the worst warehouse
SELECT query_id, user_name, query_tag,
       ROUND(credits_attributed_compute, 3) AS credits,
       total_elapsed_time/1000 AS secs
FROM   snowflake.account_usage.query_attribution_history
WHERE  warehouse_name = 'ETL_WH'
  AND  start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())
ORDER  BY credits DESC
LIMIT  20;`, 'Top spenders — warehouse then query'),
            interview: 'The tell is the *order*: aggregate at the warehouse first (cheap), then attribute to queries. Candidates who jump straight to QUERY_HISTORY scanning everything reveal they have not done this at scale.',
          },
          {
            t: 'card', icon: '🗑️', title: 'Find idle & oversized warehouses', tag: 'cost',
            when: 'you suspect money is leaking from warehouses that run hot but do little work.',
            body: ['Two classic wastes: a warehouse with a long AUTO_SUSPEND sitting idle, and a warehouse sized XL doing XS-sized work.'],
            points: [
              'Compare credits consumed against query count / busy-time to spot "paying for idle".',
              'If a warehouse never spills and never queues, it is probably **too big** — size down and re-measure.',
            ],
            gotchas: ['Very aggressive AUTO_SUSPEND (e.g. 5 s) can *cost* more by killing the warehouse cache and forcing cold re-reads — and every resume bills a 60 s minimum.'],
            code: sql(
`-- Warehouses billing credits with very few queries = likely idle/oversized
SELECT w.warehouse_name,
       ROUND(SUM(w.credits_used),1) AS credits,
       COUNT(q.query_id)            AS queries
FROM   snowflake.account_usage.warehouse_metering_history w
LEFT JOIN snowflake.account_usage.query_history q
       ON q.warehouse_name = w.warehouse_name
      AND q.start_time BETWEEN w.start_time AND w.end_time
WHERE  w.start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())
GROUP  BY 1
HAVING credits > 10 AND queries < 50
ORDER  BY credits DESC;`, 'Idle / oversized warehouse hunt'),
            interview: 'Tie it to a decision: "we found a BI warehouse billing 400 credits/week for ~30 queries, dropped it from L to S and set AUTO_SUSPEND to 120 s — cost fell ~70% with no latency complaints."',
          },
          {
            t: 'card', icon: '💧', title: 'Find spilling & poorly-pruned queries', tag: 'performance',
            when: 'queries are slow and you need to prove whether it is a sizing problem or a query problem.',
            body: ['Spilling to local SSD is tolerable; spilling to **remote** storage means the warehouse ran out of memory and disk — the #1 "size up or fix the query" signal.'],
            points: [
              'Bad pruning shows as `partitions_scanned` ≈ `partitions_total` — the filter is not landing on clustering.',
              '`bytes_spilled_to_remote_storage > 0` → either scale up (memory-bound sort) or fix an exploding join (grain bug).',
            ],
            gotchas: ['A high `bytes_scanned` with low `rows_produced` is often `SELECT *` on a wide table — projection, not compute, is the cost.'],
            code: sql(
`SELECT query_id, LEFT(query_text, 80) AS qry,
       warehouse_size,
       total_elapsed_time/1000               AS secs,
       partitions_scanned, partitions_total,
       bytes_spilled_to_local_storage        AS spill_local,
       bytes_spilled_to_remote_storage       AS spill_remote
FROM   snowflake.account_usage.query_history
WHERE  start_time >= DATEADD('day', -2, CURRENT_TIMESTAMP())
  AND  bytes_spilled_to_remote_storage > 0
ORDER  BY spill_remote DESC
LIMIT  20;`, 'Remote-spill offenders'),
            interview: 'Know the fix branches: memory-bound *sort/aggregate* spill → scale the warehouse up; spill caused by a *join explosion* (rows out ≫ rows in) → fix the join grain, because a bigger warehouse just spills more slowly.',
          },
          {
            t: 'card', icon: '🚦', title: 'Find warehouse queuing (concurrency)', tag: 'performance',
            when: 'dashboards are slow at 9am but the SQL itself is fast in isolation.',
            body: ['Queuing is a concurrency problem, not a query problem. The fix is a multi-cluster warehouse (scale OUT), not a bigger one (scale UP).'],
            points: ['`queued_overload_time` > 0 means queries waited for a slot; `queued_provisioning_time` means clusters were still spinning up.'],
            gotchas: ['Scaling *up* a single warehouse does nothing for queuing — it just makes each query faster while they still wait in line.'],
            code: sql(
`SELECT warehouse_name,
       COUNT(*) AS queries,
       ROUND(AVG(queued_overload_time)/1000, 2)     AS avg_queued_s,
       ROUND(AVG(queued_provisioning_time)/1000, 2) AS avg_provision_s
FROM   snowflake.account_usage.query_history
WHERE  start_time >= DATEADD('day', -3, CURRENT_TIMESTAMP())
  AND  queued_overload_time > 0
GROUP  BY 1
ORDER  BY avg_queued_s DESC;`, 'Queuing by warehouse'),
            interview: 'The crisp distinction: "slow *one* query → scale up; slow *because many* queries → scale out (multi-cluster)." Then mention STANDARD vs ECONOMY scaling policy as the next lever.',
          },
          {
            t: 'card', icon: '📥', title: 'Find silently-skipped COPY rows', tag: 'loading',
            when: 'a load "succeeded" but downstream numbers are too low.',
            body: ['With `ON_ERROR = CONTINUE`, COPY loads the good rows and *skips* the bad ones — the statement still returns success. COPY_HISTORY is where the truth is.'],
            points: ['`row_count` vs `row_parsed` vs `error_count` tells you exactly how many rows were dropped and why.'],
            gotchas: ['COPY tracks loaded files for ~64 days, so a re-run skips already-loaded files — good for idempotency, but it will *not* re-load a file to pick up rows it skipped the first time.'],
            code: sql(
`SELECT file_name, status, row_count, row_parsed, error_count,
       first_error_message
FROM   snowflake.account_usage.copy_history
WHERE  table_name = 'RAW_ORDERS'
  AND  last_load_time >= DATEADD('day', -1, CURRENT_TIMESTAMP())
  AND  error_count > 0
ORDER  BY last_load_time DESC;`, 'COPY rows dropped'),
            interview: 'This is a great "tell me about a time it broke" seed: silent skip → found it in COPY_HISTORY → switched prod loads to `ON_ERROR = ABORT_STATEMENT` (or a strict error threshold) so a bad file fails loudly instead of under-loading.',
          },
          {
            t: 'card', icon: '🕵️', title: 'Find who accessed sensitive data', tag: 'governance',
            when: 'audit/compliance asks "who read the PII table last quarter?"',
            body: ['ACCESS_HISTORY records read and write lineage per query — the object actually touched, even through views.'],
            points: ['`base_objects_accessed` resolves through views to the underlying table — FLATTEN it to filter by object name.'],
            gotchas: ['ACCESS_HISTORY is an **Enterprise+** feature and lags up to ~3 h — do not expect an audit row the instant a query runs.'],
            code: sql(
`SELECT query_id, user_name, query_start_time,
       f.value:objectName::string AS object_read
FROM   snowflake.account_usage.access_history,
       LATERAL FLATTEN(input => base_objects_accessed) f
WHERE  f.value:objectName::string = 'PROD.CORE.CUSTOMERS'
  AND  query_start_time >= DATEADD('day', -90, CURRENT_TIMESTAMP())
ORDER  BY query_start_time DESC;`, 'PII access audit'),
            interview: 'Pair it with governance: tag the column as PII, apply a masking policy, and use ACCESS_HISTORY to prove the control works. That triad = "I’ve run a real governance program."',
          },
        ],
      },

      /* ---------------- Tab 3: read the query profile ---------------- */
      {
        label: '🧪 Read the Query Profile',
        kind: 'blocks',
        blocks: [
          { t: 'callout', tag: '🧪 The single clearest "have you operated this" question', html: '*"Walk me through how you’d diagnose a slow query."* The answer is the **Query Profile**. Open it in Snowsight (Query History → click the query → Query Profile), or pull operator stats programmatically with `GET_QUERY_OPERATOR_STATS(\'<query_id>\')`.' },
          {
            t: 'card', icon: '🌳', title: 'What the profile shows', tag: 'read it top-down',
            body: ['The profile is an operator tree executed bottom-up (TableScan at the leaves, Result at the top). You read it top-down for % of time, then jump to the most expensive node.'],
            points: [
              '**Most Expensive Nodes** — start here; it ranks operators by share of execution time.',
              '**Partitions scanned / total** on a TableScan — your pruning efficiency. 96,000 / 96,000 = no pruning.',
              '**Bytes spilled to local / remote storage** — memory pressure; remote spill is the loud alarm.',
              '**Rows** on each side of a Join vs rows out — rows out ≫ rows in is an exploding/mis-keyed join.',
              '**Pruning**, **Spilling** and **Network** in the stats pane quantify the three usual suspects.',
            ],
            code: sql(
`-- Operator-level stats without the UI (great for scripting/alerts)
SELECT *
FROM   TABLE(GET_QUERY_OPERATOR_STATS('01abc...query_id'));
-- look at: operator_type, operator_statistics:pruning,
--          operator_statistics:spilling, execution_time_breakdown`, 'Operator stats, programmatically'),
            interview: 'Naming the exact panels — "Most Expensive Nodes, partitions scanned/total, bytes spilled to remote" — is what proves you have actually opened the profile, not just read that one exists.',
          },
          {
            t: 'table',
            title: 'Symptom → cause → fix (from the profile)',
            head: ['What you see in the profile', 'Likely cause', 'Fix'],
            rows: [
              ['TableScan: partitions scanned ≈ total', 'Filter not aligned to natural/clustering order; or predicate on a transformed column (`WHERE func(col)`)', 'Cluster on the filtered column; avoid wrapping the column in a function; consider Search Optimization for point lookups'],
              ['Join: output rows ≫ input rows', 'Duplicate keys on one side → fan-out; or missing join predicate (near-Cartesian)', 'Dedup the dimension to one row per key; fix the ON clause; check grain'],
              ['Bytes spilled to **remote** storage', 'Warehouse out of memory for a sort/aggregate', 'Scale the warehouse up (memory-bound), or reduce the data via earlier filtering/aggregation'],
              ['Large `queued_overload_time`', 'Too many concurrent queries for the cluster count', 'Multi-cluster (scale out), isolate noisy workloads to their own warehouse'],
              ['TableScan bytes huge, rows out tiny', '`SELECT *` / wide projection on a columnar store', 'Select only needed columns so Snowflake prunes columns, not just rows'],
              ['A single operator = most of the time, cache 0%', 'Repeated heavy aggregation recomputed every run', 'Materialize (MV / Dynamic Table) or pre-aggregate upstream'],
            ],
          },
          { t: 'callout', tag: '⏱️ Anchor it with before/after', html: 'The most credible version attaches numbers: *"the profile showed 410 GB spilled to remote and a 9-billion-row join explosion; I fixed the grain and added a cluster key — spill went to 0, runtime 50 min → 4 min, credits down ~80%."* Real numbers are the strongest signal; swap in your own.' },
        ],
      },

      /* ---------------- Tab 4: guardrails ---------------- */
      {
        label: '🛠️ Guardrails',
        kind: 'blocks',
        blocks: [
          { t: 'callout', tag: '🛠️ Stop it recurring', html: 'Finding problems is half the job; preventing the next one is what seniors get asked about. These are the controls you put in place after the incident.' },
          {
            t: 'card', icon: '📉', title: 'Resource monitors', tag: 'cost cap',
            when: 'you need a hard ceiling so a runaway job cannot burn the month’s budget overnight.',
            body: ['A resource monitor tracks credit usage against a quota and can notify, suspend-after-queries-finish, or suspend-immediately.'],
            points: ['Attach at account level for a global cap, or per-warehouse for team budgets.'],
            gotchas: ['`SUSPEND_IMMEDIATE` kills running queries — use it as a true emergency stop, with NOTIFY thresholds below it as early warnings.'],
            code: sql(
`CREATE RESOURCE MONITOR etl_guard WITH
  CREDIT_QUOTA = 500
  FREQUENCY = MONTHLY
  START_TIMESTAMP = IMMEDIATELY
  TRIGGERS ON 75 PERCENT DO NOTIFY
           ON 90 PERCENT DO SUSPEND
           ON 100 PERCENT DO SUSPEND_IMMEDIATE;
ALTER WAREHOUSE etl_wh SET RESOURCE_MONITOR = etl_guard;`, 'Resource monitor with tiered triggers'),
            interview: 'Frame it as defense-in-depth: NOTIFY at 75% (a human reacts), SUSPEND at 90% (graceful), SUSPEND_IMMEDIATE at 100% (last resort). Shows you balance safety against killing production work.',
          },
          {
            t: 'card', icon: '⏳', title: 'Statement timeout & query tags', tag: 'containment',
            when: 'one pathological query should not run for 6 hours, and every query should be attributable.',
            body: ['`STATEMENT_TIMEOUT_IN_SECONDS` bounds how long any single statement can run; `QUERY_TAG` labels queries so you can group them in QUERY_HISTORY.'],
            points: ['Set timeout per-warehouse (ETL can be generous; BI should be short) rather than one global value.', 'Have dbt/Airflow set a QUERY_TAG per model/task — attribution becomes trivial.'],
            code: sql(
`ALTER WAREHOUSE bi_wh SET STATEMENT_TIMEOUT_IN_SECONDS = 900;  -- 15 min
ALTER SESSION SET QUERY_TAG = 'dbt:model=fct_sales:run=2026-11-18';

-- later, group cost/time by job
SELECT SPLIT_PART(query_tag, ':', 2) AS model,
       COUNT(*), ROUND(SUM(total_elapsed_time)/1000,0) AS secs
FROM   snowflake.account_usage.query_history
WHERE  query_tag ILIKE 'dbt:%'
  AND  start_time >= DATEADD('day',-1,CURRENT_TIMESTAMP())
GROUP  BY 1 ORDER BY secs DESC;`, 'Timeout + attributable tags'),
            interview: 'Mentioning per-warehouse timeouts and per-model query tags unprompted is a senior tell — it shows you think about containment and chargeback, not just making one query fast.',
          },
          {
            t: 'card', icon: '🔔', title: 'Alerting on pipeline health', tag: 'proactive',
            when: 'you want to hear about a failed task or stale data before a stakeholder does.',
            body: ['A serverless ALERT (or a monitoring Task) runs a check query on a schedule and notifies when a condition trips — e.g. a task failed, or a table has not refreshed.'],
            points: ['Check TASK_HISTORY / DYNAMIC_TABLE_REFRESH_HISTORY for failures or staleness and fire a notification integration.'],
            gotchas: ['Alerts built on ACCOUNT_USAGE inherit its latency — for truly timely alerts, query INFORMATION_SCHEMA table functions or the object directly.'],
            code: sql(
`CREATE ALERT stale_sales_alert
  WAREHOUSE = monitor_wh
  SCHEDULE = '10 MINUTE'
  IF (EXISTS (
    SELECT 1 FROM TABLE(information_schema.task_history(
                 scheduled_time_range_start => DATEADD('hour',-1,CURRENT_TIMESTAMP())))
    WHERE state = 'FAILED'))
  THEN CALL SYSTEM$SEND_EMAIL('pager_int','oncall@co','Task failed','Check task_history');`, 'Alert on a failed task'),
            interview: 'The senior framing: "I’d rather page myself on a failed refresh than have the business tell me the dashboard is stale." Proactive monitoring is an on-call maturity signal.',
          },
        ],
      },

      /* ---------------- Tab 5: Q&A ---------------- */
      {
        label: '💬 Interview Q&A',
        kind: 'qa',
        editKey: 'sf-obs',
        groups: [
          {
            group: 'Where the truth lives',
            items: [
              { q: 'ACCOUNT_USAGE vs INFORMATION_SCHEMA — when do you use each?', a: 'ACCOUNT_USAGE = account-wide, 365-day history, includes dropped objects, but lags up to ~45 min (QUERY_HISTORY) to ~3 h. Use it for audit, cost and trends. INFORMATION_SCHEMA table functions are real-time but with a short window and current objects only — use them during a live incident. Snowsight Query Profile is the real-time view of a single query.', difficulty: 'core' },
              { q: 'A dashboard is slow *right now*. Why not just query ACCOUNT_USAGE.QUERY_HISTORY?', a: 'Because it lags up to ~45 minutes — the slow query may not be there yet. For a live incident use INFORMATION_SCHEMA.QUERY_HISTORY() (no latency) or open the Query Profile directly from Snowsight.', difficulty: 'intermediate' },
              { q: 'How do you make every query attributable to a job?', a: 'Set QUERY_TAG per session (dbt/Airflow set it per model/task). Then group QUERY_HISTORY / QUERY_ATTRIBUTION_HISTORY by tag to answer "which pipeline caused the spike?" without guessing.', difficulty: 'intermediate' },
            ],
          },
          {
            group: 'Finding cost & performance problems',
            items: [
              { q: 'The bill spiked. Walk me through finding the cause.', a: 'Aggregate credits by warehouse in WAREHOUSE_METERING_HISTORY (cheap, hourly). Identify the worst warehouse, then use QUERY_ATTRIBUTION_HISTORY to attribute compute credits down to individual queries on it. Order by credits. Fix the specific query or right-size/suspend the warehouse — then re-measure.', difficulty: 'core' },
              { q: 'How do you tell an oversized warehouse from a right-sized one?', a: 'If it never spills and never queues, it is probably too big — size down and re-measure. If it spills to remote storage, it is too small for that workload. Also compare credits billed against actual query count/busy time to catch "paying for idle".', difficulty: 'intermediate' },
              { q: 'Query spills to remote storage. Scale up or fix the query?', a: 'Depends on the cause in the profile. Memory-bound sort/aggregate spill → scale up. Spill caused by a join explosion (rows out ≫ rows in from a grain/dup-key bug) → fix the join; a bigger warehouse just spills more slowly.', difficulty: 'advanced' },
              { q: 'Queries are fast alone but slow at 9am. What is happening and the fix?', a: 'Concurrency queuing — queued_overload_time > 0. Fix with a multi-cluster warehouse (scale OUT) and/or isolating the workload; scaling UP a single warehouse does not help queuing. Tune the scaling policy (STANDARD for responsiveness vs ECONOMY for savings).', difficulty: 'intermediate' },
            ],
          },
          {
            group: 'Reading the Query Profile',
            items: [
              { q: 'Which numbers in the Query Profile do you look at first?', a: 'Most Expensive Nodes (where the time went), then on the TableScan: partitions scanned / total (pruning), bytes spilled to local/remote (memory), and rows in vs rows out on joins (explosion). Those three — pruning, spilling, join fan-out — cover the vast majority of slow queries.', difficulty: 'core' },
              { q: 'Partitions scanned equals partitions total. What does that mean?', a: 'No pruning happened — the whole table was read. Usually the filter is not aligned to clustering, or the predicate wraps the column in a function so metadata cannot prune. Fix: cluster on the filtered column, avoid func(col) in the predicate, or use Search Optimization for selective point lookups.', difficulty: 'intermediate' },
              { q: 'How do you read a profile without the UI?', a: 'GET_QUERY_OPERATOR_STATS(query_id) returns per-operator statistics (pruning, spilling, execution-time breakdown) — useful for scripting checks or alerting on bad patterns across many queries.', difficulty: 'advanced' },
            ],
          },
          {
            group: 'Guardrails & prevention',
            items: [
              { q: 'How do you cap spend so a runaway job cannot blow the budget?', a: 'Resource monitors with tiered triggers: NOTIFY at ~75%, SUSPEND at ~90% (lets running queries finish), SUSPEND_IMMEDIATE at 100% (emergency). Attach per-warehouse for team budgets and account-level for a global cap. Add STATEMENT_TIMEOUT_IN_SECONDS so one query cannot run for hours.', difficulty: 'core' },
              { q: 'How would you get alerted before a stakeholder notices stale data?', a: 'A serverless ALERT or monitoring task on a short schedule that checks TASK_HISTORY / DYNAMIC_TABLE_REFRESH_HISTORY for failures or staleness and fires a notification integration. Prefer real-time sources for the check since ACCOUNT_USAGE lags.', difficulty: 'advanced' },
            ],
          },
        ],
      },
    ],
  };
})();
