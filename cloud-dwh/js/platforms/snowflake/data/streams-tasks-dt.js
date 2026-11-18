/* ============================================================
   Streams · Tasks · Dynamic Tables — deep mechanics.
   The three objects every Snowflake pipeline question circles back
   to, with the gotchas only operators know. Rendered by
   CDWH.InterviewModule. Exposes:
     window.CDWH.P.snowflake.streamsTasksDt
   ============================================================ */
(function () {
  'use strict';
  const P = (window.CDWH = window.CDWH || {}).P.snowflake;
  const sql = (text, label) => ({ text: text, lang: 'sql', label: label });

  P.streamsTasksDt = {
    hero: {
      eyebrow: 'Transform & Automate · Interview Masterclass',
      title: 'Streams · Tasks · Dynamic Tables',
      subtitle: 'The automation core of Snowflake pipelines. The imperative path (Streams capture change, Tasks apply it) versus the declarative path (Dynamic Tables maintain a target to a freshness goal) — plus the mechanics that trip people up: stream offsets and staleness, task DAGs and failure handling, and the incremental-vs-full refresh trap.',
    },

    tabs: [
      /* ---------------- Tab 1: pick the tool ---------------- */
      {
        label: '🧭 Pick the right tool',
        kind: 'blocks',
        blocks: [
          { t: 'callout', tag: '🧭 Two philosophies', html: 'Interviewers test whether you can *choose*, not just configure. **Streams + Tasks** is imperative — you capture the delta and write the MERGE. **Dynamic Tables** is declarative — you write the final SELECT and a `TARGET_LAG`, and Snowflake maintains it. Knowing when each wins is the senior answer.' },
          {
            t: 'table',
            title: 'Streams + Tasks vs Dynamic Tables',
            head: ['Dimension', 'Streams + Tasks', 'Dynamic Tables'],
            rows: [
              ['Model', 'Imperative — you write the MERGE/INSERT logic', 'Declarative — you write the target SELECT; Snowflake maintains it'],
              ['Change capture', 'Explicit `STREAM` you consume', 'Automatic — engine tracks upstream changes'],
              ['Scheduling', 'You set the task SCHEDULE / trigger', 'You set `TARGET_LAG`; engine decides when to refresh'],
              ['Custom logic', 'Anything — procedural, multi-step, calls', 'Limited to what a SELECT (and incremental refresh) supports'],
              ['Delete handling', 'You branch on the op (delete-aware MERGE)', 'Handled by the declared query automatically'],
              ['Best for', 'Complex/stateful logic, SCD2, side effects, calling procedures', 'Straight transform/aggregation chains (medallion) you want low-maintenance'],
            ],
            note: 'The one-liner: *"Dynamic Tables for declarative transform chains where I just want a freshness SLA; Streams + Tasks when I need custom procedural logic or stateful handling the DT query can’t express."*',
          },
          {
            t: 'card', icon: '⚖️', title: 'How I actually choose', tag: 'decision',
            body: ['Default to Dynamic Tables for medallion transform layers — less code, auto-managed dependency refresh, one freshness knob. Reach for Streams + Tasks when the logic is procedural, needs to call a stored procedure, implements SCD2 with history, or must do something a single SELECT cannot.'],
            points: [
              'Dynamic Tables remove the "did the task run in the right order?" problem — they refresh in dependency order automatically.',
              'Streams + Tasks give you an escape hatch for anything declarative refresh does not support.',
              'They compose: a Task can MERGE from a Stream into a base table that a Dynamic Table then reads.',
            ],
            interview: 'Candidates who say "always use Dynamic Tables now" reveal they have not hit the incremental-refresh limits. The mature answer names the trade-off and the escape hatch.',
          },
        ],
      },

      /* ---------------- Tab 2: streams ---------------- */
      {
        label: '🌊 Streams',
        kind: 'blocks',
        blocks: [
          { t: 'callout', tag: '🌊 A stream is a bookmark, not a copy', html: 'A stream stores an **offset** (a point in table history) plus metadata columns — it holds no data itself. Reading it returns the change set *between its offset and now*. This model is the source of every stream gotcha below.' },
          {
            t: 'card', icon: '📌', title: 'The offset only advances on committed DML', tag: 'the #1 gotcha',
            when: 'always — this is the single most-asked "have you used streams?" check.',
            body: ['Querying a stream (SELECT) does NOT move its offset. The offset advances only when the stream is consumed inside a DML statement (INSERT/MERGE/CTAS) that **commits**. If the transaction rolls back, the offset stays put.'],
            points: [
              'This is what makes streams safe: a failed MERGE does not lose the changes — re-run and they are still there.',
              'A common consume-without-moving-data trick: `CREATE TABLE x AS SELECT * FROM my_stream WHERE 1=0` advances the offset while writing nothing.',
            ],
            gotchas: ['If two processes consume the same stream, the first committed DML advances the offset and the second sees nothing. For fan-out, create multiple streams on the same table — each has its own offset.'],
            code: sql(
`-- SELECT does NOT advance the offset:
SELECT * FROM orders_stream;              -- peek, offset unchanged

-- DML that commits DOES advance it:
MERGE INTO curated.orders t
USING orders_stream s ON t.id = s.id
WHEN MATCHED AND s.metadata$action='DELETE' THEN DELETE
WHEN MATCHED THEN UPDATE SET ...
WHEN NOT MATCHED THEN INSERT ...;         -- commit advances the offset

-- consume without moving data (reset-style):
CREATE TABLE _drain AS SELECT * FROM orders_stream WHERE 1=0;`, 'Offset advances on committed DML only'),
            interview: 'Say it precisely: "Selecting a stream is a non-destructive peek; the offset only moves when a committing DML consumes it — so a failed load never loses changes." That one sentence signals real use.',
          },
          {
            t: 'card', icon: '⌛', title: 'Staleness & MAX_DATA_EXTENSION_TIME_IN_DAYS', tag: 'don’t let it go stale',
            when: 'a stream has not been consumed for a while and you worry about losing changes.',
            body: ['A stream reads change data from the source table’s Time-Travel history. If its offset falls outside retention, the stream goes STALE and becomes unreadable — you lose the ability to get those changes incrementally.'],
            points: [
              'An unconsumed stream extends the source’s retention up to `MAX_DATA_EXTENSION_TIME_IN_DAYS` (**default 14 days**) to protect its offset — regardless of edition.',
              'STALE_AFTER ≈ last-consumed time + MAX(DATA_RETENTION_TIME_IN_DAYS, MAX_DATA_EXTENSION_TIME_IN_DAYS). Check it with `DESCRIBE STREAM` / `SHOW STREAMS`.',
              'Consuming the stream resets the extension back to normal retention.',
            ],
            gotchas: [
              'The data-retention extension holds extra Time-Travel storage (and cost) on the source while the stream is unconsumed — a stuck consumer silently inflates storage.',
              '`CREATE OR REPLACE TABLE` on the source makes its streams stale immediately (new object = new history). Use `ALTER` where possible.',
            ],
            code: sql(
`SHOW STREAMS LIKE 'orders_stream';   -- STALE, STALE_AFTER columns
DESCRIBE STREAM orders_stream;
SELECT SYSTEM$STREAM_HAS_DATA('orders_stream');  -- TRUE/FALSE: anything to process?`, 'Check staleness & pending data'),
            interview: 'The gotcha that lands: "a stream that is not consumed within MAX_DATA_EXTENSION (default 14 days) goes stale and you lose incremental capture — so I alert on SYSTEM$STREAM_HAS_DATA and on STALE_AFTER approaching, and I never CREATE OR REPLACE the source."',
          },
          {
            t: 'card', icon: '🔀', title: 'Standard vs append-only vs insert-only', tag: 'stream types',
            when: 'choosing the right stream type for the workload — append-only is much cheaper when you do not need updates/deletes.',
            body: ['The type controls which changes the stream surfaces and how expensive it is to compute.'],
            points: [
              '**Standard** — inserts, updates and deletes; returns the *net* change between offsets, with `METADATA$ISUPDATE` distinguishing an update from an insert/delete pair.',
              '**Append-only** — inserts only; cheaper and ideal for immutable event/log tables and streaming ingestion.',
              '**Insert-only** — for external tables / directory tables (new files), surfaces inserts only.',
            ],
            gotchas: ['Standard streams compute net change, so an insert-then-delete of the same row between consumptions can net to nothing — correct, but surprising if you expected to see both events.'],
            code: sql(
`CREATE STREAM orders_stream   ON TABLE raw.orders;                  -- standard (I/U/D)
CREATE STREAM events_stream   ON TABLE raw.events  APPEND_ONLY=TRUE; -- inserts only
CREATE STREAM files_stream    ON EXTERNAL TABLE raw.ext_files INSERT_ONLY=TRUE;

-- metadata columns you branch on:
--   METADATA$ACTION   = INSERT | DELETE
--   METADATA$ISUPDATE = TRUE when the row is part of an UPDATE
--   METADATA$ROW_ID   = stable row identity`, 'Three stream types + metadata columns'),
            interview: 'For a CDC MERGE you read `METADATA$ACTION` and `METADATA$ISUPDATE` to turn net change into insert/update/delete branches. For an append-only event feed, append-only streams are cheaper and simpler — pick deliberately.',
          },
        ],
      },

      /* ---------------- Tab 3: tasks ---------------- */
      {
        label: '⏱️ Tasks',
        kind: 'blocks',
        blocks: [
          { t: 'callout', tag: '⏱️ Tasks run SQL on a schedule — or on a trigger', html: 'A Task executes one SQL statement (or calls a procedure) on a schedule, when a predecessor finishes (a DAG), or when a stream has data (triggered). The depth is in compute choice, DAGs and failure handling.' },
          {
            t: 'card', icon: '🖥️', title: 'Serverless vs warehouse tasks', tag: 'compute choice',
            when: 'deciding how a task is powered — this is a direct cost/latency trade-off.',
            body: ['A warehouse task runs on a virtual warehouse you name (billed while it runs, 60 s minimum per resume). A serverless task omits WAREHOUSE and runs on Snowflake-managed compute, billed per-second for exactly what it uses.'],
            points: [
              'Serverless suits small/frequent tasks where a warehouse’s 60 s minimum and spin-up would dominate.',
              'Warehouse tasks suit heavy jobs, or when you want them to share a warehouse’s cache with other work.',
            ],
            gotchas: ['Serverless is not automatically cheaper — a large, long task can cost more serverless than on a right-sized warehouse. Measure.'],
            code: sql(
`-- Warehouse task
CREATE TASK load_orders WAREHOUSE = etl_wh
  SCHEDULE = '5 MINUTE' AS MERGE ...;

-- Serverless task (no WAREHOUSE) — Snowflake-managed compute
CREATE TASK load_orders
  SCHEDULE = '1 MINUTE'
  USER_TASK_MANAGED_INITIAL_WAREHOUSE_SIZE = 'XSMALL'
  AS MERGE ...;`, 'Serverless vs warehouse task'),
            interview: 'The crisp trade-off: "small, frequent → serverless (no 60 s-minimum waste); large or cache-sharing → a named warehouse." Saying serverless is "always cheaper" is the wrong answer.',
          },
          {
            t: 'card', icon: '⚡', title: 'Triggered tasks (stream-driven)', tag: 'event-ish',
            when: 'you want a task to run only when there is actually new data, not every N minutes burning compute on empty runs.',
            body: ['A triggered task omits SCHEDULE and runs when its stream has data, bounded by a target interval — you stop paying for empty polling cycles.'],
            points: ['Combine `WHEN SYSTEM$STREAM_HAS_DATA(...)` with a triggered configuration so the task fires on arrival, not on the clock.'],
            gotchas: ['Even a scheduled task with a `WHEN` predicate is cheap on empty runs — the predicate is evaluated and the body skipped — but it still wakes on schedule; triggered tasks remove even that.'],
            code: sql(
`-- Only do work when the stream has changes
CREATE TASK apply_changes WAREHOUSE = etl_wh
  SCHEDULE = '1 MINUTE'
  WHEN SYSTEM$STREAM_HAS_DATA('orders_stream')
  AS MERGE INTO curated.orders ... USING orders_stream ...;`, 'Skip empty runs with a WHEN predicate'),
            interview: 'Know the pairing: a Stream tells you *if* there is work (SYSTEM$STREAM_HAS_DATA), a Task does the work, and the WHEN/triggered pattern avoids paying for empty cycles. That trio is the canonical Snowflake CDC loop.',
          },
          {
            t: 'card', icon: '🌳', title: 'Task graphs (DAGs), finalizers & dependencies', tag: 'orchestration',
            when: 'a multi-step pipeline where step B must run after step A, C after B, etc.',
            body: ['Tasks form a DAG: a root task runs on a schedule/trigger; child tasks declare `AFTER <predecessor>`. A finalizer task runs after the whole graph completes (even on failure) for cleanup/notification.'],
            points: [
              'Only the root task has a schedule; children fire when predecessors succeed.',
              '`SYSTEM$TASK_DEPENDENTS(...)` inspects the graph; resume children before the root, and `RESUME` the root last to activate the graph.',
              'A finalizer (FINALIZE) is attached to the root, one per graph, and cannot have children.',
            ],
            gotchas: [
              'A newly created task is **suspended** — you must `ALTER TASK ... RESUME` it, or the graph never runs. Classic "my task isn’t firing" bug.',
              'A task runs with the privileges of its **owner role** — if that role loses a grant (or is dropped), the task fails silently from a permissions angle.',
            ],
            code: sql(
`CREATE TASK root_load  WAREHOUSE=etl_wh SCHEDULE='10 MINUTE' AS CALL extract();
CREATE TASK t_transform WAREHOUSE=etl_wh AFTER root_load      AS CALL transform();
CREATE TASK t_publish   WAREHOUSE=etl_wh AFTER t_transform    AS CALL publish();
CREATE TASK t_finalize  WAREHOUSE=etl_wh FINALIZE = root_load AS CALL cleanup();

-- resume children first, root LAST to arm the graph
ALTER TASK t_publish RESUME; ALTER TASK t_transform RESUME; ALTER TASK root_load RESUME;`, 'A task DAG with a finalizer'),
            interview: 'Two gotchas prove hands-on use: "new tasks start suspended, and you resume the root last" and "a task runs as its owner role, so a revoked grant breaks it quietly." Dropping those unprompted is gold.',
          },
          {
            t: 'card', icon: '🔁', title: 'Failure handling: retries vs suspend', tag: 'reliability',
            when: 'making a pipeline resilient to transient failures without masking a real bug.',
            body: ['Two independent levers: TASK_AUTO_RETRY_ATTEMPTS retries a failed graph run; SUSPEND_TASK_AFTER_NUM_FAILURES suspends the task after N consecutive failures so a broken job stops burning compute and pages you.'],
            points: [
              'Set these on the standalone or root task; the suspend counter covers the whole graph.',
              'Only genuine failures (user error or timeout) count toward the suspend threshold; skipped/cancelled/system-error runs are treated as indeterminate.',
              'USER_TASK_TIMEOUT_MS bounds a runaway run; an overlap policy controls whether a new run can start while the previous is still going.',
            ],
            gotchas: ['SUSPEND_TASK_AFTER_NUM_FAILURES defaults to a non-zero value (commonly cited as 10), so a persistently failing task auto-suspends — good, but if you did not expect it, the pipeline "just stopped". Monitor TASK_HISTORY.'],
            code: sql(
`ALTER TASK root_load SET
  TASK_AUTO_RETRY_ATTEMPTS = 2
  SUSPEND_TASK_AFTER_NUM_FAILURES = 5
  USER_TASK_TIMEOUT_MS = 3600000;

-- did it fail? (real-time)
SELECT name, state, error_code, error_message, scheduled_time
FROM TABLE(information_schema.task_history(
       scheduled_time_range_start => DATEADD('hour',-6,CURRENT_TIMESTAMP())))
WHERE state = 'FAILED' ORDER BY scheduled_time DESC;`, 'Retries, auto-suspend, timeout + check'),
            interview: 'The mature framing: "retries absorb transient blips; suspend-after-N stops a truly broken job from silently burning credits and forces a human look. I monitor TASK_HISTORY so an auto-suspend pages me rather than going unnoticed."',
          },
        ],
      },

      /* ---------------- Tab 4: dynamic tables ---------------- */
      {
        label: '🔄 Dynamic Tables',
        kind: 'blocks',
        blocks: [
          { t: 'callout', tag: '🔄 Declare the result, not the pipeline', html: 'A Dynamic Table is defined by a SELECT and a `TARGET_LAG`. Snowflake figures out the dependency graph and refreshes each table to keep it within its freshness goal — incrementally when it can. You stop writing MERGEs and orchestration.' },
          {
            t: 'card', icon: '🎯', title: 'TARGET_LAG and the refresh engine', tag: 'freshness knob',
            when: 'you want a transform layer maintained to a freshness SLA with minimal code.',
            body: ['TARGET_LAG is how stale the data may get (e.g. "5 minutes" or "1 hour"). Snowflake refreshes as needed to stay within it. A downstream DT can set `TARGET_LAG = DOWNSTREAM` to refresh only when something that depends on it needs fresh data.'],
            points: [
              'Chained DTs form a graph; Snowflake refreshes in dependency order automatically — no task ordering to manage.',
              'Tighter lag = more frequent refresh = more compute. The lag is your cost/freshness dial.',
            ],
            gotchas: ['A very tight TARGET_LAG on an expensive query can be costly — the engine will do whatever it takes to hit the lag.'],
            code: sql(
`CREATE DYNAMIC TABLE sales_silver
  TARGET_LAG = '5 minutes'
  WAREHOUSE  = transform_wh
  REFRESH_MODE = INCREMENTAL      -- be explicit in prod (see next card)
AS
SELECT order_id, customer_id, net_amount, updated_at
FROM   raw.orders WHERE status <> 'cancelled';

-- downstream table refreshes only when its consumers need it
CREATE DYNAMIC TABLE sales_gold TARGET_LAG = DOWNSTREAM WAREHOUSE = transform_wh
AS SELECT customer_id, SUM(net_amount) rev FROM sales_silver GROUP BY 1;`, 'Dynamic Tables with TARGET_LAG'),
            interview: 'The declarative pitch: "I write the final SELECT and a freshness target; Snowflake maintains the whole dependency graph incrementally. It replaced a hand-written Streams-and-Tasks DAG and a lot of MERGE code."',
          },
          {
            t: 'card', icon: '🪤', title: 'The INCREMENTAL-vs-FULL refresh trap', tag: 'the senior gotcha',
            when: 'your Dynamic Table costs far more than expected, or its refresh time balloons.',
            body: ['There are four refresh modes: AUTO (default), INCREMENTAL, FULL and ADAPTIVE. The trap: AUTO resolves the mode **once, at creation**, based on whether your query supports incremental refresh. If it does not, AUTO silently resolves to FULL — a complete rebuild every refresh.'],
            points: [
              'Incremental refresh only supports certain constructs. Non-deterministic functions (e.g. CURRENT_TIMESTAMP), some joins, and certain window/aggregate patterns force FULL.',
              'Set `REFRESH_MODE = INCREMENTAL` explicitly in production: if the query cannot support it, creation surfaces the reason instead of silently degrading to FULL.',
              'ADAPTIVE refreshes incrementally but reinitializes (full) when a large change makes a rebuild cheaper, then returns to incremental.',
            ],
            gotchas: ['Because AUTO decides at creation, adding a non-incremental construct later may not re-resolve as you expect — check the resolved mode and reason, do not assume.'],
            code: sql(
`-- See the RESOLVED mode and WHY (refresh_mode_reason explains an AUTO->FULL)
SHOW DYNAMIC TABLES LIKE 'sales_silver';
SELECT name, refresh_mode, refresh_mode_reason
FROM TABLE(information_schema.dynamic_tables(name => 'SALES_SILVER'));

-- Did a refresh run incrementally or rebuild fully?
SELECT name, state, refresh_action, data_timestamp, refresh_start_time
FROM TABLE(information_schema.dynamic_table_refresh_history())
WHERE name = 'SALES_SILVER' ORDER BY refresh_start_time DESC;`, 'Detect a silent full-refresh fallback'),
            interview: 'This is the #1 question separating DT readers from DT operators: "AUTO can silently resolve to FULL, so I set REFRESH_MODE=INCREMENTAL explicitly and check refresh_mode_reason / DYNAMIC_TABLE_REFRESH_HISTORY to confirm it is actually refreshing incrementally."',
          },
          {
            t: 'card', icon: '📊', title: 'Monitoring & limits', tag: 'operate',
            when: 'running Dynamic Tables in production.',
            body: ['DYNAMIC_TABLE_REFRESH_HISTORY gives one row per refresh (outcome, duration, incremental vs full, errors). The INFORMATION_SCHEMA function keeps ~7 days; the ACCOUNT_USAGE view keeps 365 days.'],
            points: [
              'You cannot run DML directly against a Dynamic Table — it is maintained by its query. Need manual writes? Use a regular table + Streams/Tasks.',
              'Watch for refreshes repeatedly running FULL, growing refresh durations, or lag you are not meeting.',
            ],
            gotchas: ['Changing the query generally means recreating the DT; plan for a backfill/bootstrap on first refresh of a large source.'],
            code: sql(
`-- Health: anything failing or silently going full?
SELECT name, state, refresh_action,
       DATEDIFF('second', refresh_start_time, refresh_end_time) AS secs
FROM   snowflake.account_usage.dynamic_table_refresh_history
WHERE  refresh_start_time >= DATEADD('day',-1,CURRENT_TIMESTAMP())
ORDER  BY secs DESC;`, 'Dynamic Table refresh health'),
            interview: 'Mention the constraint unprompted: "you can’t DML a Dynamic Table — it’s declaratively maintained — so for anything needing manual correction or stateful logic I keep a base table with Streams + Tasks."',
          },
        ],
      },

      /* ---------------- Tab 5: patterns ---------------- */
      {
        label: '🧩 Patterns',
        kind: 'blocks',
        blocks: [
          { t: 'callout', tag: '🧩 Putting it together', html: 'End-to-end patterns that combine the three objects — the shapes you describe when asked "how would you build X?"' },
          {
            t: 'card', icon: '🧬', title: 'CDC apply loop (Streams + Task + MERGE)', tag: 'imperative',
            body: ['The canonical delete-aware CDC loop: a stream captures change on the raw landing table; a triggered/scheduled task MERGEs it into the curated table, branching on the op and deduping to the latest version per key.'],
            points: ['Dedup the source to one row per key (latest LSN/sequence) before the MERGE, or the MERGE is non-deterministic.', 'Branch on METADATA$ACTION / op so deletes become DELETEs, not lingering rows.'],
            code: sql(
`CREATE TASK cdc_apply WAREHOUSE=etl_wh SCHEDULE='1 MINUTE'
  WHEN SYSTEM$STREAM_HAS_DATA('orders_stream') AS
MERGE INTO curated.orders t
USING (
  SELECT * FROM orders_stream
  QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY lsn DESC)=1
) s ON t.order_id = s.order_id
WHEN MATCHED AND s.metadata$action='DELETE' THEN DELETE
WHEN MATCHED THEN UPDATE SET status=s.status, amount=s.amount
WHEN NOT MATCHED AND s.metadata$action='INSERT' THEN INSERT (...) VALUES (...);`, 'Delete-aware CDC MERGE from a stream'),
            interview: 'Reach for this when logic is stateful or procedural (SCD2, side effects). For a plain transform chain, a Dynamic Table is less code.',
          },
          {
            t: 'card', icon: '🥉', title: 'Medallion with Dynamic Tables', tag: 'declarative',
            body: ['Bronze (raw) → Silver (cleaned/typed) → Gold (aggregated) as chained Dynamic Tables. Set the business freshness SLA on Gold and `TARGET_LAG = DOWNSTREAM` on Silver so it refreshes only as needed.'],
            points: ['The engine refreshes in dependency order — no DAG wiring.', 'Keep each layer incremental-friendly (deterministic, supported constructs) so none silently falls back to FULL.'],
            interview: 'Great answer to "how would you cut orchestration overhead?": "I moved the medallion transforms to Dynamic Tables — one freshness knob on gold, the dependency graph maintained automatically, and far less MERGE/Task code to own."',
          },
          {
            t: 'card', icon: '🔗', title: 'Mixing both', tag: 'real pipelines',
            body: ['Real systems blend them: a Task+Stream MERGE lands and corrects a base table (where you need procedural control or SCD2), and Dynamic Tables build the analytical layers on top of that base table.'],
            points: ['Use Streams + Tasks at the boundary where you need custom logic; use Dynamic Tables for the declarative transform layers above it.'],
            interview: 'Showing you would mix — not dogmatically pick one — is the senior signal. The objects compose on purpose.',
          },
        ],
      },

      /* ---------------- Tab 6: Q&A ---------------- */
      {
        label: '💬 Interview Q&A',
        kind: 'qa',
        editKey: 'sf-stdt',
        groups: [
          {
            group: 'Choosing & composing',
            items: [
              { q: 'Streams + Tasks or Dynamic Tables — how do you choose?', a: 'Dynamic Tables for declarative transform chains where I just want a freshness SLA and minimal code — the engine maintains the dependency graph incrementally. Streams + Tasks when the logic is procedural/stateful (SCD2, calling procedures, side effects) or uses constructs incremental refresh does not support. They compose: a Task+Stream MERGE can feed a base table that Dynamic Tables build on.', difficulty: 'core' },
              { q: 'Why not just use Dynamic Tables for everything?', a: 'Because incremental refresh only supports certain constructs — non-deterministic functions, some joins and window patterns force a full rebuild — and you cannot run DML against a DT. Anything stateful or procedural still needs Streams + Tasks.', difficulty: 'intermediate' },
            ],
          },
          {
            group: 'Streams',
            items: [
              { q: 'When does a stream’s offset advance?', a: 'Only when the stream is consumed inside a DML statement (INSERT/MERGE/CTAS) that commits. A plain SELECT is a non-destructive peek and does not move it. If the DML rolls back, the offset stays — so a failed load never loses changes.', difficulty: 'core' },
              { q: 'What makes a stream go stale and how do you prevent it?', a: 'If its offset falls outside the source table’s retention it goes STALE and unreadable. An unconsumed stream extends retention up to MAX_DATA_EXTENSION_TIME_IN_DAYS (default 14) to protect the offset. Prevent it by consuming regularly, alerting on SYSTEM$STREAM_HAS_DATA and STALE_AFTER, and never CREATE OR REPLACE-ing the source (that makes streams stale instantly).', difficulty: 'intermediate' },
              { q: 'Standard vs append-only stream?', a: 'Standard tracks inserts, updates and deletes and returns net change (with METADATA$ISUPDATE). Append-only tracks inserts only — cheaper, ideal for immutable event/log tables and streaming ingestion. Insert-only is the external/directory-table variant.', difficulty: 'intermediate' },
              { q: 'Two jobs need the same changes from one table. How?', a: 'Create two separate streams on the same table — each keeps its own offset. A single stream consumed by one committing DML would advance the offset and the other reader would see nothing.', difficulty: 'advanced' },
            ],
          },
          {
            group: 'Tasks',
            items: [
              { q: 'Serverless vs warehouse task — trade-off?', a: 'Warehouse task runs on a named warehouse (billed while running, 60 s minimum per resume) and can share that warehouse’s cache. Serverless omits WAREHOUSE and runs on Snowflake-managed compute billed per-second — better for small/frequent tasks where the 60 s minimum would dominate. Serverless is not automatically cheaper for large jobs; measure.', difficulty: 'core' },
              { q: 'My task is not firing. What is the first thing you check?', a: 'Whether it is resumed — new tasks start SUSPENDED. For a DAG, resume children first and the root last to arm the graph. Then check TASK_HISTORY for failures and whether a WHEN predicate (e.g. SYSTEM$STREAM_HAS_DATA) is skipping the body.', difficulty: 'intermediate' },
              { q: 'How do you build a multi-step pipeline with Tasks?', a: 'A DAG: a root task on a schedule/trigger, child tasks with AFTER <predecessor>. Add a finalizer (FINALIZE) for cleanup/notification that runs after the graph completes. Inspect with SYSTEM$TASK_DEPENDENTS. Remember the task runs as its owner role.', difficulty: 'intermediate' },
              { q: 'How do you make tasks resilient without hiding bugs?', a: 'TASK_AUTO_RETRY_ATTEMPTS absorbs transient failures; SUSPEND_TASK_AFTER_NUM_FAILURES (default ~10) stops a genuinely broken task from burning credits and forces a human look. Only real failures (user error/timeout) count. Set USER_TASK_TIMEOUT_MS for runaways and monitor TASK_HISTORY so an auto-suspend pages you.', difficulty: 'advanced' },
            ],
          },
          {
            group: 'Dynamic Tables',
            items: [
              { q: 'What is TARGET_LAG and how does refresh work?', a: 'TARGET_LAG is the maximum staleness allowed; Snowflake refreshes to stay within it, incrementally when possible, in dependency order across chained DTs. TARGET_LAG = DOWNSTREAM makes a table refresh only when its consumers need fresh data. Tighter lag = more compute.', difficulty: 'core' },
              { q: 'Explain the incremental-vs-full refresh trap.', a: 'Modes are AUTO (default), INCREMENTAL, FULL, ADAPTIVE. AUTO resolves once at creation; if the query does not support incremental refresh (non-deterministic funcs, some joins/windows), it silently resolves to FULL — a full rebuild every refresh, expensive. Fix: set REFRESH_MODE=INCREMENTAL explicitly so creation surfaces the reason, and check refresh_mode_reason / DYNAMIC_TABLE_REFRESH_HISTORY to confirm actual behavior.', difficulty: 'advanced' },
              { q: 'Can you update rows in a Dynamic Table?', a: 'No — a DT is maintained by its defining query; you cannot DML it directly. If you need manual writes or stateful correction, use a regular table with Streams + Tasks and build DTs on top.', difficulty: 'intermediate' },
              { q: 'How do you monitor Dynamic Tables?', a: 'DYNAMIC_TABLE_REFRESH_HISTORY — one row per refresh with outcome, duration and whether it ran incremental or full. INFORMATION_SCHEMA keeps ~7 days, ACCOUNT_USAGE 365. Watch for repeated full refreshes, growing durations, or missed lag.', difficulty: 'intermediate' },
            ],
          },
        ],
      },
    ],
  };
})();
