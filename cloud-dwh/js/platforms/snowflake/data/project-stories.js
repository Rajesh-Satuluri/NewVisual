/* ============================================================
   Project Stories (STAR) — turn the hands-on projects into spoken,
   first-person interview narratives: résumé bullet -> 30s -> 2-min
   -> senior deep-dive, anchored with concrete numbers, plus the
   speakable reference architecture and follow-up landmines.

   Numbers are ILLUSTRATIVE templates to adapt to your real work.
   Rendered by CDWH.InterviewModule. Exposes:
     window.CDWH.P.snowflake.projectStories
   ============================================================ */
(function () {
  'use strict';
  const P = (window.CDWH = window.CDWH || {}).P.snowflake;
  const sql = (text, label) => ({ text: text, lang: 'sql', label: label });

  P.projectStories = {
    hero: {
      eyebrow: 'Interview · Masterclass',
      title: 'Project Stories (STAR)',
      subtitle: 'The difference between "I know Snowflake" and "I built this." Three end-to-end projects turned into first-person narratives you can speak — Situation, Task, Action, Result — with a résumé-bullet → 30-second → 2-minute → senior-deep-dive ladder, anchored by concrete numbers, and the follow-up landmines an interviewer will drop.',
    },

    tabs: [
      /* ---------------- Tab 1: how to tell it ---------------- */
      {
        label: '🧭 How to tell it',
        kind: 'blocks',
        blocks: [
          { t: 'callout', tag: '⚠️ Honesty first', html: 'These are **worked-example templates** built from the hands-on projects in this app. Adapt them to work *you actually did* and swap in *your real numbers*. Never claim a project you did not build — a good interviewer unravels a fabricated story in two follow-ups. Use these to learn the *shape* of a credible answer.' },
          { t: 'callout', tag: '🎤 What an interviewer is actually testing', html: 'Not "do you know the feature" — they know you can read docs. They are testing whether you made *decisions*: why this design, what broke, what you measured, what you’d change. Decisions + numbers + a failure you fixed = "this person operated it."' },
          {
            t: 'card', icon: '🪜', title: 'The answer ladder', tag: 'structure every story',
            body: ['Have four depths ready for every project and let the interviewer pull you down the ladder. Start shallow; go deep only when they probe.'],
            points: [
              '**Résumé bullet** — one line, outcome-first, with a number. The hook.',
              '**30 seconds** — Situation + what you built + the headline result. Your default opener.',
              '**2 minutes** — the full STAR: the problem, your key decisions, the result with metrics.',
              '**Senior deep-dive** — the trade-offs, the thing that broke, what you monitored, what you’d do differently. This is where offers are won.',
            ],
            interview: 'Candidates who dump the 2-minute version on "tell me about yourself" bury the signal. Lead with the 30-second hook and let them ask for depth — it shows judgement.',
          },
          {
            t: 'card', icon: '🔢', title: 'The numbers that make it believable', tag: 'anchor everything',
            body: ['Vague stories sound studied; specific ones sound lived. Keep a few real numbers per project in your head.'],
            points: [
              'Volume: rows/day, file sizes, table sizes (e.g. "~40M order lines/day, ~1.2 GB compressed files").',
              'Compute: warehouse size and why (e.g. "M warehouse — it spilled on L... wait, it spilled on S, so M").',
              'Freshness/SLA: "15-minute freshness target", "hourly batch", "sub-minute streaming".',
              'Before/after: "runtime 50 min → 4 min", "cost down ~35% after auto-suspend + clustering".',
            ],
            gotchas: ['Do not invent precise numbers you cannot defend — if pressed "how did you measure that?" you must have an answer (QUERY_HISTORY, the Query Profile, the bill).'],
            interview: 'A number you can explain the *source* of ("I pulled it from WAREHOUSE_METERING_HISTORY") beats a rounder, bigger number you cannot.',
          },
          {
            t: 'card', icon: '🧩', title: 'STAR, tuned for data engineering', tag: 'the template',
            body: ['Situation = the business problem and constraints. Task = what you specifically owned. Action = the design decisions and how you built it. Result = the measured outcome, plus what you learned.'],
            points: [
              'Spend most of the time on **Action** (decisions) and **Result** (numbers) — that is the signal.',
              'Always include one "and then it broke / we found an issue, here is how I handled it" — resilience is what seniors are hired for.',
            ],
            interview: 'End a story on a result and a reflection ("if I rebuilt it today I’d use Dynamic Tables for the silver layer") — it shows you keep thinking after shipping.',
          },
        ],
      },

      /* ---------------- Tab 2: reference architecture ---------------- */
      {
        label: '🏛️ Reference architecture',
        kind: 'blocks',
        blocks: [
          { t: 'callout', tag: '🏛️ One architecture you can draw on a whiteboard', html: 'Most "design a Snowflake pipeline" questions want this medallion shape. Learn to draw and narrate it end-to-end; every project below is an instance of it.' },
          {
            t: 'chain',
            nodes: [
              { role: 'SOURCE', icon: '🗃️', name: 'Source systems', one: 'OLTP, SaaS, events', what: 'Postgres/MySQL, APIs, Kafka, files in S3/GCS/Azure.' },
              { role: 'LAND', icon: '📥', name: 'Stage → RAW', one: 'bronze', what: 'External stage + COPY / Snowpipe / Streaming into untouched raw tables.' },
              { role: 'CLEAN', icon: '🧼', name: 'STAGING', one: 'silver', what: 'Typed, deduped, conformed. dbt models or Dynamic Tables.' },
              { role: 'MODEL', icon: '⭐', name: 'MARTS', one: 'gold', what: 'Dimensional star / aggregates the business queries.' },
              { role: 'SERVE', icon: '📊', name: 'BI / ML', one: 'consume', what: 'Dashboards, reverse-ETL, feature tables.' },
            ],
          },
          {
            t: 'card', icon: '🗂️', title: 'Layers & why each exists', tag: 'narrate the medallion',
            body: ['RAW is an immutable landing zone — load once, never transform in place, so you can always replay. STAGING cleans/types/dedups. MARTS is the modeled layer BI hits. Separating them makes failures recoverable and logic testable.'],
            points: [
              'RAW = append/replace, full fidelity, the replay source of truth.',
              'STAGING = business keys, dedup, type casting, light conformance.',
              'MARTS = dimensions + facts (or wide aggregates), the query surface.',
            ],
            interview: 'Being able to say *why* three layers (replayability, testability, separation of concerns) — not just "because medallion" — is the senior framing.',
          },
          {
            t: 'card', icon: '🎛️', title: 'Orchestration', tag: 'how it runs',
            body: ['Name your options and when each fits: native Streams + Tasks (no extra infra), Dynamic Tables (declarative transforms), dbt (transform + tests + lineage), Airflow/dbt Cloud (cross-system scheduling).'],
            points: [
              'All-Snowflake, simple → Streams + Tasks or Dynamic Tables.',
              'SQL transforms with testing/lineage/version control → dbt (dbt runs the SQL *in* Snowflake).',
              'Orchestrating beyond Snowflake (extracts, multiple systems) → Airflow / dbt Cloud triggering the Snowflake work.',
            ],
            interview: 'The trap question is "Tasks or Airflow?" — answer by scope: Tasks for in-Snowflake dependencies, Airflow when you must coordinate systems outside Snowflake.',
          },
          {
            t: 'card', icon: '🌱', title: 'Environments, git & CI/CD', tag: 'the strongest "we operated this" tell',
            body: ['Dev/test/prod separation, git-backed SQL/dbt, and a deploy pipeline are what most "studied-only" candidates cannot speak to. Zero-copy clone is the Snowflake-native dev-environment trick.'],
            points: [
              'Spin a dev environment by `CREATE DATABASE dev CLONE prod` — instant, storage-free point-in-time copy to develop/test against real data, then throw away.',
              'SQL/dbt models in git; CI runs `dbt build` + tests against a clone on each PR; merge deploys to prod.',
              'Note the clone caveat: a clone copies data at a point in time but does **not** copy the running state of pipes/tasks — you resume those in the new environment.',
            ],
            code: sql(
`-- instant, storage-free dev environment from prod
CREATE DATABASE analytics_dev CLONE analytics_prod;
-- develop + run dbt tests against real-shaped data, then:
DROP DATABASE analytics_dev;   -- zero leftover cost`, 'Zero-copy clone for dev/test'),
            interview: 'Dropping "we developed against zero-copy clones of prod and gated merges on dbt tests in CI" is one of the clearest signals you have shipped in a real team.',
          },
          {
            t: 'card', icon: '✅', title: 'Data quality & monitoring', tag: 'trust the data',
            body: ['Tests and reconciliation turn "it ran" into "it is correct". Pair dbt tests (or Great Expectations) with source-vs-target reconciliation and freshness monitoring.'],
            points: [
              'dbt tests: `unique`, `not_null`, `relationships`, accepted-values — run in CI and on every build.',
              'Reconciliation: compare source vs target control totals (counts/checksums) after each load.',
              'Freshness/health: alert on failed tasks and stale Dynamic Tables (see the Observability module).',
            ],
            interview: 'Saying "I gate the load on a row-count reconciliation and fail loudly if ERRORS_SEEN > 0" shows you have been burned by silent-bad-data before — which only happens if you have run pipelines.',
          },
        ],
      },

      /* ---------------- Tab 3: Story 1 ---------------- */
      {
        label: '📦 Story 1 · Batch DW',
        kind: 'blocks',
        blocks: [
          { t: 'callout', tag: '📦 Archetype: batch ingestion → star schema', html: 'The "I built our first real warehouse" story. Maps to the *DW from Raw Files* project. Adapt the specifics to your own build.' },
          {
            t: 'story',
            title: 'Raw files → dimensional warehouse',
            stack: 'COPY · Streams+Tasks · star schema',
            oneLiner: 'Stood up a DTC retailer’s first Snowflake warehouse: daily CSV/JSON drops → RAW → staging → a sales star feeding BI.',
            resumeBullet: 'Built a Snowflake data warehouse ingesting ~40M order lines/day from S3 into a dimensional model, cutting finance reporting latency from next-day to ~15 minutes.',
            situation: 'A direct-to-consumer retailer had order/customer/product data landing as daily file drops in S3 and analysts stitching it in spreadsheets — numbers were a day late and often disagreed.',
            task: 'I owned building the ingestion + modeling layer: load the files reliably, model a sales star, and give finance a trustworthy same-day view.',
            actions: [
              'Created an external stage over the S3 bucket with a storage integration (no keys in SQL) and a reusable file format.',
              'Loaded into immutable RAW tables with COPY, using `ON_ERROR = ABORT_STATEMENT` in prod so a malformed file fails loudly instead of under-loading.',
              'Built staging models (dedup, type-cast, business keys), then a `dim_customer` / `dim_product` + line-grain `fact_sales` star.',
              'Automated incremental loads with a Stream on RAW + a Task running a delete-aware MERGE into the marts.',
              'Right-sized the warehouse by watching the Query Profile — started S, saw remote spill on the fact build, moved to M.',
            ],
            results: [
              'Finance reporting went from next-day to a ~15-minute freshness SLA.',
              'A reconciliation check (source rows vs loaded rows) catches partial loads before they reach dashboards.',
              'Idempotent re-runs: replaying a day’s files does not duplicate rows (keyed MERGE + COPY file tracking).',
            ],
            numbers: [
              ['Volume', '~40M order lines/day, ~1.2 GB compressed/file'],
              ['Warehouse', 'M (sized up from S after remote spill on the fact build)'],
              ['Freshness', 'next-day → ~15 min'],
              ['Load safety', 'ON_ERROR=ABORT_STATEMENT + row-count reconciliation'],
            ],
            code: sql(
`COPY INTO raw.orders
FROM @s3_stage/orders/
FILE_FORMAT = (FORMAT_NAME = ff_csv)
ON_ERROR = 'ABORT_STATEMENT';            -- fail loudly in prod

-- reconcile before publishing
SELECT (SELECT COUNT(*) FROM raw.orders)      AS loaded,
       (SELECT SUM(row_count) FROM snowflake.account_usage.copy_history
        WHERE table_name='ORDERS' AND last_load_time>=DATEADD('day',-1,CURRENT_TIMESTAMP())) AS expected;`, 'Load + reconcile'),
            thirty: 'I built a DTC retailer’s first Snowflake warehouse — daily S3 file drops loaded with COPY into immutable RAW, cleaned in staging, modeled as a sales star, and kept fresh with a Stream + Task MERGE. Finance went from next-day numbers to about 15-minute freshness.',
            two: 'The retailer had order data landing as daily files in S3 and analysts reconciling it by hand — a day late and inconsistent. I owned ingestion and modeling. I set up an external stage with a storage integration so no credentials lived in SQL, loaded into immutable RAW tables with COPY using ON_ERROR=ABORT_STATEMENT so a bad file fails loudly, then built staging (dedup, typing, business keys) and a line-grain sales star. I automated incremental loads with a Stream on RAW and a Task running a delete-aware MERGE, and I added a row-count reconciliation so partial loads never reach dashboards. I right-sized the warehouse from the Query Profile — it spilled to remote on S, so I moved to M. Result: finance got a ~15-minute freshness SLA instead of next-day, with idempotent re-runs.',
            senior: 'The key decisions: immutable RAW so I can always replay; ABORT_STATEMENT over CONTINUE because silent skips had already burned the team; keyed MERGE + COPY file tracking for idempotency. What broke early: a timestamp-format drift in one feed meant COPY with ON_ERROR=CONTINUE had been silently skipping ~2% of rows — I found it in COPY_HISTORY (error_count > 0), fixed the file format, and switched prod to ABORT. If I rebuilt it today I’d move the staging layer to Dynamic Tables to drop the Task/MERGE maintenance, keeping Streams + Tasks only where I need procedural control.',
            landmines: [
              '"How do you know you didn’t drop rows?" → COPY_HISTORY error_count + source/target reconciliation.',
              '"Why ABORT not CONTINUE?" → silent under-loading is worse than a failed run you can re-drive.',
              '"How is it idempotent?" → keyed MERGE (dedup to latest per key) + COPY’s ~64-day file tracking; FORCE would duplicate.',
              '"Why size M?" → remote spill in the Query Profile on S; M removed it without over-provisioning.',
            ],
          },
        ],
      },

      /* ---------------- Tab 4: Story 2 ---------------- */
      {
        label: '🕰️ Story 2 · SCD2 / CDC',
        kind: 'blocks',
        blocks: [
          { t: 'callout', tag: '🕰️ Archetype: change data capture → versioned history', html: 'The "I handle history correctly" story. Maps to the *SCD2 End-to-End* project. This is where correctness depth shows.' },
          {
            t: 'story',
            title: 'CDC feed → SCD Type 2 dimension',
            stack: 'CDC · Streams · MERGE · SCD2',
            oneLiner: 'Turned a noisy change feed into a correct, queryable history of customer state with valid-from/valid-to versioning.',
            resumeBullet: 'Implemented SCD Type 2 on a CDC feed in Snowflake, giving the business point-in-time customer history and eliminating double-counting from a prior one-row-per-customer model.',
            situation: 'A CDC feed (Debezium → Kafka → Snowflake) carried customer changes, but the warehouse only kept the latest row — so "what tier was this customer when they ordered?" was unanswerable, and some reports double-counted.',
            task: 'Design and build a Type 2 dimension that versions every change with valid-from/valid-to and a current flag, correctly and idempotently.',
            actions: [
              'Landed change events in a RAW table and put a Stream on it to capture new changes incrementally.',
              'Deduped the source to one row per key per batch (latest by LSN) — a MERGE on duplicate keys is non-deterministic otherwise.',
              'Used a `row_hash` over the tracked columns to detect real changes and skip no-op updates.',
              'Implemented the two-step SCD2 apply: expire the current row (set valid_to, is_current=FALSE) and insert the new version — not a single MERGE.',
              'Backfilled history from the change log using LEAD() to derive valid_to windows.',
            ],
            results: [
              'Point-in-time ("as-of") queries now return the correct historical attribute.',
              'Eliminated the double-counting that came from overlapping/duplicate current rows.',
              'Idempotent: re-processing a batch does not create duplicate versions.',
            ],
            numbers: [
              ['Grain', '1 version row per customer per change'],
              ['Change detection', 'row_hash over tracked columns (skips no-ops)'],
              ['Dedup', 'latest-per-key by LSN before apply'],
              ['Correctness', 'exactly one is_current=TRUE per key'],
            ],
            code: sql(
`-- expire current, then insert new version (the SCD2 two-step)
UPDATE dim_customer t
SET valid_to = s.change_ts, is_current = FALSE
FROM (SELECT * FROM cust_stream
      QUALIFY ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY lsn DESC)=1) s
WHERE t.customer_id = s.customer_id AND t.is_current
  AND t.row_hash <> s.row_hash;

INSERT INTO dim_customer (customer_id, tier, ..., valid_from, valid_to, is_current, row_hash)
SELECT customer_id, tier, ..., change_ts, NULL, TRUE, row_hash
FROM   (/* same deduped source, changed rows only */);`, 'SCD2 expire + insert'),
            thirty: 'I implemented SCD Type 2 on a Debezium/Kafka CDC feed in Snowflake — landing changes in RAW, capturing them with a Stream, and versioning each customer with valid-from/valid-to and a current flag using a hash to detect real changes. It gave the business correct point-in-time history and killed the double-counting from the old latest-only model.',
            two: 'A CDC feed carried customer changes but we only stored the latest state, so point-in-time questions were impossible and some reports double-counted. I designed a Type 2 dimension. Changes land in RAW; a Stream captures them incrementally. I dedup the source to one row per key per batch by latest LSN, because a MERGE on duplicate keys is non-deterministic. I compute a row_hash over the tracked columns to skip no-op updates, then do the SCD2 two-step: expire the current row (set valid_to and is_current=FALSE) and insert the new version — a single MERGE can’t do both correctly. I backfilled history from the change log with LEAD() to build the valid_to windows. The result was correct as-of queries and no more double-counting, and the apply is idempotent so replaying a batch is safe.',
            senior: 'The subtle parts: you cannot do SCD2 in one MERGE because you need to both close the old row and open a new one for the same key; dedup-by-latest-LSN is essential or the MERGE is non-deterministic; and the row_hash avoids writing a new version when nothing tracked actually changed. The classic bug I guard against is ending with two is_current=TRUE rows for a key — I assert exactly one current row per key as a data-quality test. If the volume grew I’d consider whether a Dynamic Table could maintain the current view while keeping the history table from Streams + Tasks.',
            landmines: [
              '"Why not one MERGE?" → SCD2 must close the old version and open a new one for the same key — two operations.',
              '"What if the feed has duplicate keys in a batch?" → dedup to latest-per-key by LSN first, or the MERGE is non-deterministic.',
              '"How do you avoid writing no-op versions?" → row_hash over tracked columns; only version when it changes.',
              '"How do you test it?" → assert exactly one is_current per key; reconcile version counts.',
            ],
          },
        ],
      },

      /* ---------------- Tab 5: Story 3 ---------------- */
      {
        label: '⚡ Story 3 · Near-real-time',
        kind: 'blocks',
        blocks: [
          { t: 'callout', tag: '⚡ Archetype: streaming ingestion → declarative marts', html: 'The "I built low-latency, cost-aware" story. Combines Snowpipe Streaming + Dynamic Tables. Adapt to whatever real-time work you have done.' },
          {
            t: 'story',
            title: 'Streaming events → Dynamic Table marts',
            stack: 'Snowpipe Streaming · Dynamic Tables · cost tuning',
            oneLiner: 'Delivered sub-minute clickstream analytics by streaming events straight into Snowflake and maintaining the marts declaratively with Dynamic Tables.',
            resumeBullet: 'Built a near-real-time clickstream pipeline (Snowpipe Streaming → Dynamic Tables) serving sub-minute dashboards, and cut transform cost ~40% by tuning TARGET_LAG and fixing a silent full-refresh.',
            situation: 'Product wanted near-live engagement dashboards; the existing hourly batch was too stale, and naive "refresh every minute" approaches were burning compute.',
            task: 'Stand up a low-latency ingestion + transform path with a freshness SLA the business set, without runaway cost.',
            actions: [
              'Ingested events with Snowpipe Streaming (row-level, no files) into a RAW events table for sub-second landing.',
              'Built the silver/gold layers as chained Dynamic Tables so the transforms are declarative and refresh in dependency order.',
              'Set the business freshness SLA as TARGET_LAG on gold and TARGET_LAG = DOWNSTREAM on silver so it refreshes only when needed.',
              'Set REFRESH_MODE = INCREMENTAL explicitly and verified via DYNAMIC_TABLE_REFRESH_HISTORY that refreshes ran incremental, not full.',
              'Isolated the transform warehouse from BI so the two workloads don’t contend.',
            ],
            results: [
              'Dashboards went from hourly to sub-minute freshness.',
              'Cut transform compute ~40% after loosening an over-tight lag and fixing a silent full-refresh fallback.',
              'Far less orchestration code than the equivalent Streams + Tasks DAG.',
            ],
            numbers: [
              ['Latency', 'hourly batch → sub-minute'],
              ['Transform', 'chained Dynamic Tables (silver → gold)'],
              ['Cost', '~40% lower after TARGET_LAG + refresh-mode fix'],
              ['Isolation', 'separate transform vs BI warehouses'],
            ],
            code: sql(
`CREATE DYNAMIC TABLE events_gold
  TARGET_LAG = '1 minute'
  WAREHOUSE  = transform_wh
  REFRESH_MODE = INCREMENTAL           -- explicit: no silent FULL
AS SELECT session_id, COUNT(*) events, MAX(ts) last_seen
   FROM events_silver GROUP BY session_id;

-- prove it's actually incremental
SELECT name, refresh_action, refresh_mode_reason
FROM TABLE(information_schema.dynamic_table_refresh_history())
WHERE name='EVENTS_GOLD' ORDER BY refresh_start_time DESC;`, 'Declarative mart + refresh check'),
            thirty: 'I built a near-real-time clickstream pipeline: Snowpipe Streaming lands events row-by-row into RAW, and chained Dynamic Tables maintain the silver and gold marts to a one-minute freshness target. It took dashboards from hourly to sub-minute, and I cut transform cost about 40% by tuning TARGET_LAG and fixing a Dynamic Table that had silently fallen back to full refresh.',
            two: 'Product needed near-live engagement dashboards; hourly batch was too stale and a naive per-minute refresh was expensive. I ingested events with Snowpipe Streaming — row-level, no files — into a RAW table landing in sub-second, then built silver and gold as chained Dynamic Tables so the transforms are declarative and refresh in dependency order automatically. I put the business freshness SLA as TARGET_LAG on gold and DOWNSTREAM on silver so it only refreshes when consumers need it. Crucially I set REFRESH_MODE=INCREMENTAL explicitly and checked DYNAMIC_TABLE_REFRESH_HISTORY — one table had been silently doing full rebuilds because of a non-deterministic function, which I removed. I also isolated the transform warehouse from BI. Net: sub-minute freshness and ~40% lower transform cost, with far less orchestration code than a Streams + Tasks DAG.',
            senior: 'The cost win came from two things people miss: an over-tight TARGET_LAG forces constant refresh, and AUTO refresh mode can silently resolve to FULL at creation if the query isn’t incremental-friendly — so I set the mode explicitly and verified the refresh_action was incremental in the history view. I also kept a base table + Streams/Tasks at the boundary where I needed logic a DT SELECT couldn’t express. The trade-off I’d flag: Dynamic Tables are lovely for declarative chains but you can’t DML them and debugging a bad incremental refresh means reading the refresh history — so for stateful correction I still reach for Streams + Tasks.',
            landmines: [
              '"How did you cut cost 40%?" → loosened an over-tight TARGET_LAG + fixed a silent AUTO→FULL refresh (removed a non-deterministic function).',
              '"How do you know the DT refreshes incrementally?" → REFRESH_MODE=INCREMENTAL explicitly + refresh_action in DYNAMIC_TABLE_REFRESH_HISTORY.',
              '"Why Dynamic Tables over Streams+Tasks here?" → declarative transform chain, auto dependency refresh, far less code; kept S+T only where DML/logic needed.',
              '"Streaming vs Snowpipe (files)?" → Snowpipe Streaming is row-level sub-second with no files/stage; file-based Snowpipe is micro-batch on file arrival.',
            ],
          },
        ],
      },

      /* ---------------- Tab 6: Q&A ---------------- */
      {
        label: '💬 Interview Q&A',
        kind: 'qa',
        editKey: 'sf-stories',
        groups: [
          {
            group: 'Telling the story',
            items: [
              { q: '"Tell me about a data pipeline you built."', a: 'Lead with the 30-second hook: the business problem, what you built (source → RAW → staging → marts, how it’s orchestrated), and the headline result with a number. Then let them pull you deeper. Spend your time on decisions (why this design) and results (measured outcomes), and include one thing that broke and how you handled it.', difficulty: 'core' },
              { q: 'How do you make a project answer sound hands-on, not studied?', a: 'Decisions + numbers + a failure. Name the choices you made and why (ABORT vs CONTINUE, size M because it spilled on S), anchor with real numbers whose source you can explain (QUERY_HISTORY, the Query Profile, the bill), and tell one incident you diagnosed and fixed.', difficulty: 'intermediate' },
              { q: 'What if they ask about something you didn’t do?', a: 'Be honest — say what you did and didn’t own, then show you understand the part you didn’t do. Fabricating unravels under follow-ups; demonstrating sound judgement about the gap is itself a good signal.', difficulty: 'core' },
            ],
          },
          {
            group: 'Architecture decisions',
            items: [
              { q: 'Why separate RAW / staging / marts?', a: 'Replayability (immutable RAW is the source of truth you can re-run from), testability (clean, typed staging), and separation of concerns (marts are the stable query surface). It makes failures recoverable and logic testable, instead of one brittle transform.', difficulty: 'core' },
              { q: 'Tasks, dbt, or Airflow?', a: 'By scope. Streams + Tasks or Dynamic Tables for in-Snowflake dependencies with no extra infra. dbt when you want SQL transforms with tests, lineage and version control (dbt runs the SQL in Snowflake). Airflow/dbt Cloud when orchestrating beyond Snowflake across multiple systems.', difficulty: 'intermediate' },
              { q: 'How do you run dev/test/prod in Snowflake?', a: 'Zero-copy clone: CREATE DATABASE dev CLONE prod gives an instant, storage-free point-in-time copy to develop and run dbt tests against real-shaped data, then drop it. SQL/dbt in git; CI runs dbt build + tests against a clone on each PR; merge deploys to prod. Caveat: a clone doesn’t carry running pipe/task state — resume those.', difficulty: 'advanced' },
            ],
          },
          {
            group: 'Correctness & operations',
            items: [
              { q: 'How do you guarantee you didn’t silently drop rows on load?', a: 'Use ON_ERROR=ABORT_STATEMENT (or a strict error threshold) in prod so a bad file fails rather than under-loads, check COPY_HISTORY for error_count, and reconcile source vs target row counts before publishing.', difficulty: 'core' },
              { q: 'How is your incremental load idempotent?', a: 'A keyed MERGE that dedups the source to the latest row per key, plus COPY’s ~64-day file tracking so a re-run skips already-loaded files. FORCE=TRUE or blind append would duplicate — those are the anti-patterns.', difficulty: 'intermediate' },
              { q: 'Tell me about a time a pipeline broke.', a: 'Good template: a feed’s timestamp-format drift made COPY (ON_ERROR=CONTINUE) silently skip ~2% of rows; revenue looked low; found it via COPY_HISTORY error_count > 0; fixed the file format, reloaded idempotently, and switched prod to ABORT so it fails loudly next time. Shows diagnosis + a durable fix.', difficulty: 'advanced' },
            ],
          },
        ],
      },
    ],
  };
})();
