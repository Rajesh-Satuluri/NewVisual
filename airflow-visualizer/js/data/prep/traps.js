/* ============================================================
   data/prep/traps.js — Interview Traps (myth vs fact)
   ------------------------------------------------------------
   Common claims that sound right; the learner guesses myth or fact,
   then sees the reality. Rendered by js/modules/traps.js.

   Shape: { id, claim, isMyth (bool), category, reality }
   Content is trusted HTML (authored in-repo). ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  AV.data.traps = [
    { id: "orchestrator", claim: "Airflow is a distributed data-processing engine.", isMyth: true, category: "Architecture",
      reality: "Airflow is an <b>orchestrator</b>, not a processing engine. It coordinates work; the heavy compute belongs on Spark, a warehouse, or similar. Using it to crunch big data leads to OOMs." },
    { id: "xcom-big", claim: "XCom is a good way to pass a large DataFrame between tasks.", isMyth: true, category: "Execution",
      reality: "XCom is for <b>small</b> values stored in the metadata DB. Large payloads bloat the DB and hit serialization limits — write to object storage and pass a reference instead." },
    { id: "backfill-catchup", claim: "Backfill and catchup are the same thing.", isMyth: true, category: "Scheduling",
      reality: "Catchup is the scheduler <i>automatically</i> filling missed intervals; backfill is a <i>manual</i> CLI run over a date range. Related, but not the same." },
    { id: "mapping-vs-gen", claim: "Dynamic Task Mapping is the same as generating DAGs dynamically.", isMyth: true, category: "DAG design",
      reality: "Mapping fans <i>one task</i> into N instances at runtime; dynamic DAG generation creates <i>many separate DAGs</i>. Different tools for different problems." },
    { id: "sensor-slot", claim: "A sensor must occupy a worker slot the whole time it waits.", isMyth: true, category: "Sensors",
      reality: "Only in poke mode. Reschedule mode frees the slot between checks, and deferrable sensors use no worker slot at all — the triggerer handles the wait." },
    { id: "queued-worker", claim: "A task stuck in 'queued' means a worker has failed.", isMyth: true, category: "Execution",
      reality: "Queued means the scheduler enqueued it but it hasn't been dispatched — usually no free slot, an exhausted pool, or (Celery) a queue with no subscribed worker. Not necessarily a worker failure." },
    { id: "running-progress", claim: "A task shown as 'running' is definitely making progress.", isMyth: true, category: "Execution",
      reality: "Not necessarily — it may be a <b>zombie</b> whose worker died silently. The scheduler reaps it once its heartbeat goes stale." },
    { id: "task-vs-run-conc", claim: "Task concurrency and DAG-run concurrency are the same knob.", isMyth: true, category: "Concurrency",
      reality: "<code>max_active_tasks</code> bounds tasks <i>within a run</i>; <code>max_active_runs</code> bounds concurrent <i>runs of the DAG</i>. Different axes." },
    { id: "retries-idempotent", claim: "Turning on retries makes a pipeline idempotent.", isMyth: true, category: "Reliability",
      reality: "Retries just re-run the task. If the write isn't idempotent, a retry duplicates or corrupts data. Idempotency is a property of the <i>write</i>, not of retries." },
    { id: "success-correct", claim: "If the Airflow task succeeds, the data is correct.", isMyth: true, category: "Operations",
      reality: "Success means the code ran without error — not that the data is valid. You need explicit data-quality checks to make success mean correctness." },
    { id: "logical-date", claim: "logical_date (execution_date) is the wall-clock time the run starts.", isMyth: true, category: "Scheduling",
      reality: "It's the <i>start of the data interval</i> the run covers; the run typically executes at the <i>end</i> of that interval. Idempotent logic keys off it, not off <code>now()</code>." },
    { id: "more-nodes", claim: "More schedulers and workers always make Airflow faster.", isMyth: true, category: "Performance",
      reality: "Beyond a point, more components add <b>metadata-DB connections</b> and pressure — the DB is the shared ceiling. You often need PgBouncer and tuning, not just more nodes." },
    { id: "ha-schedulers", claim: "You can run multiple schedulers at once for high availability.", isMyth: false, category: "Architecture",
      reality: "True — since Airflow 2.0 schedulers are active-active, so you run several for HA and throughput. They share the metadata DB, so pool the connections (PgBouncer)." },
    { id: "deferrable-noslot", claim: "A deferrable task consumes no worker slot while it waits.", isMyth: false, category: "Sensors",
      reality: "True — a deferred task is suspended and its wait is handled by the triggerer, freeing the worker slot entirely. That's the whole point of deferrable operators." }
  ];
})();
