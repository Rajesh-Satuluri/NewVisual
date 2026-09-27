/* ============================================================
   data/prep/pipeline-design.js — "Design an Airflow Pipeline"
   ------------------------------------------------------------
   Business briefs → guided design decisions → a reference
   architecture. Rendered by js/components/design-flow.js and
   js/modules/pipeline-design.js.

   Shape:
     { id, title, category, brief, requirements:[…],
       decisions: [ { q, options:[{label,verdict,why}] } ],
       reference: { summary, stages:[{name,detail}], notes:[…] } }

   Content is trusted HTML (authored in-repo). ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  AV.data.pipelineDesign = [
    {
      id: "ecommerce-daily", title: "Daily e-commerce data pipeline", category: "Batch ETL",
      brief: "ShopKart drops yesterday's orders, events and inventory as files into object storage each night. Build a daily pipeline that validates, transforms, loads the warehouse, runs data-quality checks and alerts on failure — resilient to retries, backfills, late files and duplicates.",
      requirements: ["Files land in object storage (S3/ADLS)", "Validate inputs before processing", "Transform and load the warehouse", "Data-quality checks before publish", "Alert on failure; support retries & backfill", "Handle late files; never double-load on retry"],
      decisions: [
        { q: "Files should be ready by 2am but sometimes arrive late. How do you schedule the start?",
          options: [
            { label: "Schedule daily, but gate the start on the files with a deferrable sensor / Asset", verdict: "best", why: "Decouples \"time to run\" from \"data is ready\" — it waits efficiently for late files instead of running on missing data." },
            { label: "Hard-code a 2am cron and assume the files are there", verdict: "wrong", why: "Late files mean the run processes missing or partial data. Time is not readiness." },
            { label: "Poll every 5 minutes all night with a poke sensor", verdict: "viable", why: "Works, but a poke sensor holds a worker slot the whole time; deferrable/Asset is the efficient version." }
          ] },
        { q: "Each stage produces large intermediate datasets. How do stages pass data?",
          options: [
            { label: "Write intermediates to object storage / warehouse staging; pass paths via XCom", verdict: "best", why: "Keeps large data out of the metadata DB; XCom carries only references." },
            { label: "Push the DataFrames through XCom", verdict: "wrong", why: "Bloats the metadata DB and hits serialization limits." },
            { label: "Recompute upstream data inside each task", verdict: "wrong", why: "Wasteful and fragile; stage outputs should be persisted once." }
          ] },
        { q: "How do you make the warehouse load safe to re-run (retries, backfill)?",
          options: [
            { label: "Overwrite the partition for the run's logical date (delete-insert / MERGE on {{ ds }})", verdict: "best", why: "Re-runs converge to one correct result — no duplicates across retries or backfills." },
            { label: "INSERT / append the rows", verdict: "wrong", why: "A retry after a partial write duplicates rows." },
            { label: "Add a UNIQUE index and ignore conflicts", verdict: "viable", why: "Helps, but partition overwrite / MERGE is the deterministic pattern and won't abort batches." }
          ] },
        { q: "How do you stop bad data from reaching dashboards?",
          options: [
            { label: "Run DQ checks as tasks that fail the run (or block publish) before the swap", verdict: "best", why: "Makes \"success\" mean \"valid data\"; a breach halts publication." },
            { label: "Load first, check later out of band", verdict: "wrong", why: "Bad data is already live before anyone notices." },
            { label: "Skip DQ and trust upstream", verdict: "wrong", why: "Upstream breaks; success then means \"code ran\", not \"data is right\"." }
          ] },
        { q: "How should the pipeline handle task failure and notify the team?",
          options: [
            { label: "retries with backoff for transient errors + an on_failure alert for real failures", verdict: "best", why: "Transient blips self-heal; genuine failures page a human with context." },
            { label: "No retries; page on every error", verdict: "viable", why: "Noisy — transient blips wake people unnecessarily; add retries for those." },
            { label: "Infinite retries, no alerting", verdict: "wrong", why: "Masks real failures forever; nobody learns the pipeline is broken." }
          ] },
        { q: "You must reprocess last month after a fix. How, without a storm?",
          options: [
            { label: "Backfill the date range with max_active_runs capped (loads are idempotent)", verdict: "best", why: "Controlled replay; idempotent writes make it safe; capped concurrency protects sources." },
            { label: "Set catchup=True with an old start_date", verdict: "wrong", why: "Floods every missed interval at once on deploy." },
            { label: "Manually trigger each day", verdict: "wrong", why: "Error-prone; backfill is the built-in tool for a range." }
          ] }
      ],
      reference: {
        summary: "A readiness-gated daily DAG that stages data in object storage, loads the warehouse idempotently by partition, gates publish behind data-quality checks, retries transient errors, and alerts on real failures — safe to backfill.",
        stages: [
          { name: "Wait for inputs", detail: "Deferrable sensor or Asset gate on the day's files landing — waits for late files without holding a worker slot." },
          { name: "Validate", detail: "Schema / row-count / freshness checks on the raw files; fail fast if inputs are malformed." },
          { name: "Transform (staging)", detail: "Transform into staging tables/paths; pass references (not data) via XCom; heavy compute pushed to the warehouse/Spark." },
          { name: "Load warehouse (idempotent)", detail: "Delete-insert or MERGE the partition for {{ ds }} so retries and backfills converge — never append." },
          { name: "Data-quality gate", detail: "Row counts, null/uniqueness, referential and range checks; a breach fails the run before publish." },
          { name: "Publish + notify", detail: "Swap the validated partition into place; on_failure callback alerts with run context; retries+backoff cover transient errors." }
        ],
        notes: ["Scheduling gated on data readiness, not just the clock", "Idempotent partition writes keyed to the logical date", "DQ checks make \"success\" mean \"valid data\"", "max_active_runs caps backfill concurrency", "Large data stays in object storage; XCom carries references"]
      }
    },

    {
      id: "event-driven-ingest", title: "Event-driven ingestion from object storage", category: "Event-driven",
      brief: "Vendor files arrive in S3 at unpredictable times throughout the day (zero to many). Each must be ingested exactly once, transformed, and merged into a curated table — and downstream analytics should run when new curated data lands.",
      requirements: ["Files arrive at unpredictable times", "Process each file exactly once", "Trigger downstream when curated data updates", "Handle bursts and retries", "No duplicate ingestion"],
      decisions: [
        { q: "Files can arrive any time. How do you kick off ingestion?",
          options: [
            { label: "A deferrable file sensor / Asset watcher that fires on arrival", verdict: "best", why: "Event-driven; no wasted polling slots; it reacts as files land." },
            { label: "A cron every 15 minutes scanning the bucket", verdict: "viable", why: "Works but adds latency and constant scans; event-driven is cleaner." },
            { label: "Manual trigger when someone notices files", verdict: "wrong", why: "Not scalable or reliable." }
          ] },
        { q: "How do you ensure each file is processed exactly once despite retries?",
          options: [
            { label: "Track processed keys in an idempotency ledger and MERGE on a natural key", verdict: "best", why: "Re-processing the same file becomes a no-op / overwrite — an exactly-once effect." },
            { label: "Assume the sensor only fires once", verdict: "wrong", why: "Retries and re-scans re-fire; you need explicit dedup." },
            { label: "Delete files after processing", verdict: "viable", why: "Helps, but risks data loss on failure; a ledger + idempotent load is safer." }
          ] },
        { q: "A burst drops 500 files at once. How do you process them?",
          options: [
            { label: "Dynamic Task Mapping over the file list, with a pool capping concurrency", verdict: "best", why: "Parallel per-file tasks with bounded load on the downstream store." },
            { label: "One task looping over all 500 files", verdict: "viable", why: "Loses per-file retries and visibility; mapping is better." },
            { label: "Generate 500 separate DAGs", verdict: "wrong", why: "DAG explosion — wrong tool for \"same task, many inputs\"." }
          ] },
        { q: "How do downstream analytics know new curated data is ready?",
          options: [
            { label: "Emit an Asset/Dataset update; schedule analytics DAGs on it", verdict: "best", why: "Event-driven coupling — analytics run exactly when curated data updates." },
            { label: "An ExternalTaskSensor polling the ingest DAG", verdict: "viable", why: "Works but needs date alignment and polls." },
            { label: "A fixed cron a few hours later", verdict: "wrong", why: "Decoupled from actual data readiness." }
          ] }
      ],
      reference: {
        summary: "An event-driven ingestion DAG triggered per arrival, deduping via a ledger and MERGE load, fanning out bursts with mapped tasks under a pool, and emitting an Asset to trigger downstream analytics.",
        stages: [
          { name: "Detect arrival", detail: "Deferrable sensor / Asset watcher fires when files land — no polling slots held." },
          { name: "List & dedup", detail: "List new keys, skip any already in the processed-files ledger (exactly-once guard)." },
          { name: "Map per file", detail: "Dynamic Task Mapping fans out one task per file; a pool caps concurrent load on the store." },
          { name: "Idempotent load", detail: "MERGE / upsert on a natural key so a re-processed file overwrites rather than duplicates." },
          { name: "Emit Asset", detail: "Update the curated Asset/Dataset; downstream analytics DAGs are scheduled on it." }
        ],
        notes: ["Event-driven, not clock-driven", "Exactly-once via ledger + idempotent MERGE", "Bursts handled by mapping + a concurrency pool", "Downstream coupled by Assets, not timing"]
      }
    },

    {
      id: "databricks-orchestration", title: "Orchestrating a Databricks / Spark job", category: "Compute orchestration",
      brief: "A daily transformation is too big for the worker and runs on Databricks/Spark. Airflow must trigger the job, wait for it efficiently, handle failure and long runtimes, avoid duplicate output, and publish only on success.",
      requirements: ["Heavy compute runs on Spark, not the worker", "Trigger the job and wait for completion", "Handle failure and 40–90 min runtimes", "Idempotent output on retry", "Publish/notify only on success"],
      decisions: [
        { q: "Where should the heavy join actually run?",
          options: [
            { label: "On Databricks/Spark; Airflow only orchestrates", verdict: "best", why: "Airflow is an orchestrator, not a big-data engine — push compute down." },
            { label: "In a PythonOperator on the worker with pandas", verdict: "wrong", why: "OOM territory; workers aren't for TB-scale compute." },
            { label: "Split across many small worker tasks", verdict: "wrong", why: "Reinvents a distributed engine, badly." }
          ] },
        { q: "The job runs 40–90 minutes. How does Airflow wait?",
          options: [
            { label: "A deferrable operator that polls the job via the triggerer", verdict: "best", why: "No worker slot held for the whole run; scales to many concurrent jobs." },
            { label: "A poke sensor polling the job", verdict: "viable", why: "Works but holds a worker slot for the full 90 minutes." },
            { label: "time.sleep(5400) in a task", verdict: "wrong", why: "Blocks a slot and is brittle." }
          ] },
        { q: "The Spark job fails at minute 40. How do you design for it?",
          options: [
            { label: "The task fails; retries re-submit an idempotent job; alert on final failure", verdict: "best", why: "Retries recover transient job failures; idempotent output keeps re-runs safe." },
            { label: "Mark the task success regardless", verdict: "wrong", why: "Downstream then runs on missing / partial output." },
            { label: "Retry forever with no alert", verdict: "wrong", why: "Hides real breakage." }
          ] },
        { q: "A retry re-runs the Spark job. How do you avoid duplicate output?",
          options: [
            { label: "The job overwrites the partition for the logical date", verdict: "best", why: "Re-submission overwrites its own slice — no duplicates." },
            { label: "The job appends to the table", verdict: "wrong", why: "A retry duplicates rows." },
            { label: "Dedup downstream later", verdict: "viable", why: "Possible, but pushes the problem downstream; overwrite at source is cleaner." }
          ] }
      ],
      reference: {
        summary: "Airflow triggers an idempotent Databricks/Spark job, waits via a deferrable operator (no slot held), retries transient failures, and publishes downstream only on success.",
        stages: [
          { name: "Submit job", detail: "Trigger the Databricks/Spark job via its operator/API. Airflow orchestrates; compute runs on the cluster." },
          { name: "Await (deferred)", detail: "A deferrable operator polls job status via the triggerer — no worker slot held for the long runtime." },
          { name: "Handle result", detail: "The task fails if the job fails; retries re-submit; on_failure alerts on final failure." },
          { name: "Idempotent output", detail: "The job overwrites the {{ ds }} partition, so retries and backfills don't duplicate." },
          { name: "Publish downstream", detail: "On success, emit an Asset / trigger downstream; nothing publishes on failure." }
        ],
        notes: ["Airflow orchestrates; Spark/Databricks computes", "Deferrable wait frees worker slots", "Idempotent partition output survives retries", "Publish only on success"]
      }
    },

    {
      id: "multi-source-sla", title: "SLA-critical multi-source daily load", category: "Batch ETL",
      brief: "Three sources (orders DB, an events export, vendor CSVs) must be combined into a curated mart by 6am under an SLA. Sources finish at different times; one is often late. The mart must be correct and on time, with clear alerting.",
      requirements: ["Combine 3 sources into one mart", "Meet a 6am SLA", "Sources finish at different, sometimes late, times", "Correctness gated by DQ", "Alert on SLA risk and failure", "Idempotent + backfillable"],
      decisions: [
        { q: "How do you wait for three sources that finish at different times?",
          options: [
            { label: "Per-source readiness gates (Assets / deferrable sensors), then fan-in", verdict: "best", why: "Each branch proceeds as its source lands; the join waits for all — efficient and correct." },
            { label: "One fixed start time after the latest expected", verdict: "viable", why: "Simple, but wastes time and breaks when a source is late." },
            { label: "Start when the first source is ready", verdict: "wrong", why: "Joins on incomplete data." }
          ] },
        { q: "The vendor CSV is usually late and on the critical path. How do you protect the SLA?",
          options: [
            { label: "Dedicated pool/queue + higher priority_weight for critical tasks; parallelize the rest", verdict: "best", why: "The bottleneck gets resources; independent branches run in parallel." },
            { label: "Raise global parallelism", verdict: "wrong", why: "A cluster-wide change that doesn't target the critical path." },
            { label: "Nothing — hope it's on time", verdict: "wrong", why: "SLA misses become routine." }
          ] },
        { q: "How do you get warned before you miss the 6am SLA?",
          options: [
            { label: "Monitor duration trends and alert as the run approaches the SLA", verdict: "best", why: "Warns before the breach so you can intervene." },
            { label: "Only alert after the run fails", verdict: "wrong", why: "Too late — the SLA is already missed." },
            { label: "Check the UI manually each morning", verdict: "wrong", why: "Not reliable or timely." }
          ] },
        { q: "How do you guarantee the mart is correct before 6am consumers read it?",
          options: [
            { label: "A DQ gate + atomic build-then-swap so consumers only ever see a validated mart", verdict: "best", why: "Either the validated mart is published or the old one stays — never a half-built one." },
            { label: "Build in place and check afterwards", verdict: "wrong", why: "Consumers can read partial / invalid data." },
            { label: "Trust the sources", verdict: "wrong", why: "One bad source corrupts the mart silently." }
          ] }
      ],
      reference: {
        summary: "Per-source readiness gates feed parallel branches into a fan-in join; the critical path gets a dedicated pool and priority; a DQ gate plus build-then-swap guarantees correctness; SLA-trend alerts warn before 6am.",
        stages: [
          { name: "Per-source gates", detail: "Each source has its own Asset / deferrable-sensor readiness gate; branches start independently as data lands." },
          { name: "Parallel prep", detail: "Independent per-source transforms run in parallel; the late vendor branch gets a dedicated pool/queue and higher priority_weight." },
          { name: "Fan-in join", detail: "A join task (trigger_rule all_success) combines the three prepared sources into the mart in staging." },
          { name: "DQ gate", detail: "Row counts, referential and freshness checks fail the run before publish if anything is off." },
          { name: "Atomic publish", detail: "Swap the validated staging mart into place so 6am consumers only ever see complete, valid data." },
          { name: "SLA monitoring", detail: "Duration-trend / SLA alerts fire before the deadline; on_failure pages with context." }
        ],
        notes: ["Readiness gates per source, then fan-in", "Critical path protected with a pool + priority_weight", "Build-then-swap: consumers never see partial data", "Alert on SLA trend, not just breach", "Idempotent + backfillable by logical date"]
      }
    }
  ];
})();
