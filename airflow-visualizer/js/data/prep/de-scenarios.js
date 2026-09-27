/* ============================================================
   data/prep/de-scenarios.js — Airflow + Data Engineering scenarios
   ------------------------------------------------------------
   Airflow orchestrating real DE stacks (Databricks, Spark, S3,
   Snowflake, warehouses, CDC). Read the scenario, predict, then
   reveal what happens, why, and how to say it. Rendered by
   js/modules/de-scenarios.js.

   Shape: { id, title, category, scenario, whatHappens, reasoning, interview }
   Content is trusted HTML (authored in-repo). ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  AV.data.deScenarios = [
    { id: "databricks-fail", title: "Databricks job fails after 40 minutes", category: "Databricks",
      scenario: "Airflow triggers a Databricks job that fails after 40 minutes. What happens in Airflow, and how should it be designed?",
      whatHappens: "The Airflow task that submitted and awaited the job fails. If retries are set it re-submits the job; downstream tasks stay blocked (or are handled per their trigger rules).",
      reasoning: "Airflow reflects the remote job's failure. With a deferrable operator the 40-minute wait held no worker slot. Retries help only if the failure is transient, and the re-submitted job must be idempotent (overwrite its output partition) so a re-run doesn't duplicate data.",
      interview: "I await it with a deferrable operator, set retries for transient cluster failures, make the job overwrite its {{ ds }} partition, and alert on final failure — never mark success on a failed job." },
    { id: "spark-dup", title: "Retried Spark job creates duplicate records", category: "Spark",
      scenario: "Airflow retries a failed Spark job and duplicate records appear downstream. Why, and how do you fix it?",
      whatHappens: "The first (failed) run wrote some output; the retry appended more, producing duplicates.",
      reasoning: "The Spark write wasn't idempotent. Retries re-execute the whole job, so a non-idempotent append duplicates. The fix is to overwrite the partition for the logical date (or MERGE on a key) so re-runs converge.",
      interview: "Duplicates after a retry mean the write isn't idempotent — I make Spark overwrite the {{ ds }} partition (or MERGE), not append, so any number of retries produce the same output." },
    { id: "s3-late", title: "S3 file arrives six hours late", category: "S3",
      scenario: "A daily pipeline depends on an S3 file that today arrives six hours late. How do you handle it?",
      whatHappens: "With a fixed cron the run either fails on the missing file or processes partial data. With a readiness gate it waits, then runs when the file lands.",
      reasoning: "Time-based scheduling assumes readiness; late data breaks it. A deferrable S3 sensor, or an Asset-triggered DAG, waits for the actual arrival without holding a worker slot, then proceeds.",
      interview: "I decouple 'time to run' from 'data is ready' — a deferrable S3 sensor or Asset trigger waits for the file, so a six-hour delay just delays the run instead of corrupting it." },
    { id: "incomplete-table", title: "Task succeeds but the target table is incomplete", category: "Warehouse",
      scenario: "An Airflow task reports success but the target table has only half the expected rows. How is this possible, and what do you add?",
      whatHappens: "The task's code ran without raising, so Airflow marks it success — even though the load was partial (e.g. an incomplete source).",
      reasoning: "Airflow success means 'no exception', not 'data correct'. You need data-quality checks — row counts, freshness, referential — as gating tasks that fail the run when the data is wrong.",
      interview: "Success only means the code ran. I add DQ checks as tasks that fail the DAG before publish, so green actually means valid, complete data." },
    { id: "spark-slow", title: "Spark job is slow but Airflow shows RUNNING", category: "Spark",
      scenario: "A Spark job is running very slowly; Airflow just shows the task as running for hours. Is that normal, and what do you do?",
      whatHappens: "Airflow shows the task running as long as the remote job is alive; it doesn't know the job is slow, only that it hasn't finished or failed.",
      reasoning: "Airflow tracks task state, not job internals. For 'slow' you need Spark-side metrics/SLAs; in Airflow you set execution_timeout so a pathologically slow job fails instead of hanging, and you watch duration trends.",
      interview: "Airflow only knows running vs done/failed, not 'slow'. I set an execution_timeout so a stuck job fails rather than hanging forever, watch duration trends for SLA risk, and use the Spark UI/metrics for the actual slowdown." },
    { id: "stale-dashboard", title: "Pipeline completes but the dashboard is stale", category: "BI",
      scenario: "The Airflow pipeline finishes green, but the downstream dashboard still shows yesterday's data. Where do you look?",
      whatHappens: "The warehouse was updated, but a BI cache/extract or a separate refresh step didn't run — or the publish step didn't actually swap the data consumers read.",
      reasoning: "'Pipeline done' and 'consumers see new data' are different things. Check the publish/swap step, any BI refresh/cache, and whether consumers read the partition you wrote.",
      interview: "Green means my DAG finished, not that consumers see fresh data. I make the BI refresh a downstream step (or Asset-triggered) so completion and visibility are coupled, and check the publish/swap and cache." },
    { id: "snowflake-contention", title: "Concurrent loads overwhelm Snowflake", category: "Snowflake",
      scenario: "Many mapped tasks load Snowflake at once and you hit contention and timeouts. How do you fix it in Airflow?",
      whatHappens: "Too many concurrent connections/loads overwhelm the warehouse, causing queueing and timeouts.",
      reasoning: "Cap concurrency with a pool sized to what the warehouse tolerates, so all tasks still run but only N hit Snowflake at once. Right-size the warehouse and batch loads rather than many tiny ones.",
      interview: "I put the Snowflake-loading tasks in a pool sized to the warehouse's comfortable concurrency — all the work still processes, just fewer at a time — and batch loads instead of row-by-row." },
    { id: "external-etl", title: "Orchestrating an external ETL service (ADF / Glue)", category: "Cloud ETL",
      scenario: "Airflow must trigger an Azure Data Factory or AWS Glue job and continue only when it finishes. How?",
      whatHappens: "Airflow submits the job, then must wait for completion before downstream runs.",
      reasoning: "Use the service's operator to submit and a deferrable operator/sensor to await completion without holding a slot; propagate the external job's failure to the task; keep outputs idempotent.",
      interview: "Submit via the service operator, await with a deferrable sensor so the wait costs no worker slot, fail the task if the external job fails, and make the job idempotent so retries are safe." },
    { id: "late-dimension", title: "Fact loads before its dimension arrives", category: "Warehouse",
      scenario: "A fact table loads before a late-arriving dimension, creating orphan rows. How do you prevent it in the pipeline?",
      whatHappens: "Without a dependency, the fact load runs on time and references dimension keys that don't exist yet.",
      reasoning: "Model the dependency: gate the fact load on the dimension's readiness (Asset or sensor), or design explicit late-arriving-dimension handling — and add a referential-integrity DQ check.",
      interview: "I make the dimension a real dependency so the fact never loads first, add a referential-integrity check, and if late dims are expected I handle them explicitly rather than by luck." },
    { id: "cdc-exactly-once", title: "CDC events get applied more than once", category: "CDC",
      scenario: "A change-data-capture batch is reprocessed on retry and applies the same changes twice. How do you make it safe?",
      whatHappens: "Re-applying change events — especially inserts/updates — double-applies them, corrupting the target.",
      reasoning: "Make application idempotent: MERGE/upsert keyed on the primary key and change sequence, and checkpoint the last processed offset/LSN so a retry resumes rather than re-applying from scratch.",
      interview: "CDC has to be idempotent — I MERGE on the primary key using the change's sequence/LSN and checkpoint the processed offset, so a retry re-applies nothing it already did." }
  ];
})();
