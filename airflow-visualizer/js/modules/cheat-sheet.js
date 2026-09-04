/* ============================================================
   modules/cheat-sheet.js — one-page printable reference
   Dense reference cards + a Print / Save-PDF button. Print-only
   CSS (in enhancements.css) strips the app chrome for a clean sheet.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var CARDS = [
    { title: "Core objects", rows: [
      ["DAG", "The pipeline: tasks + dependencies, no cycles."],
      ["Operator", "A template for one unit of work (PythonOperator…)."],
      ["Task", "An operator placed in a DAG (a graph node)."],
      ["Task Instance", "A task for one run/date — the atomic tracked unit."],
      ["DAG Run", "One execution of a DAG for a logical_date."],
      ["Hook", "Reusable interface to an external system; resolves a Connection."]
    ] },
    { title: "Task states", rows: [
      ["scheduled", "Deps met, waiting for a slot."],
      ["queued", "Handed to the executor."],
      ["running", "Executing on a worker."],
      ["success / failed", "Terminal outcomes."],
      ["up_for_retry", "Failed but attempts remain."],
      ["up_for_reschedule / deferred", "Waiting (sensor / triggerer)."],
      ["skipped / upstream_failed", "Branch not taken / blocked."]
    ] },
    { title: "Scheduling", rows: [
      ["schedule", "cron, timedelta, or an Asset/Dataset."],
      ["logical_date", "Start of the data interval a run represents."],
      ["catchup", "False (usual) skips missed intervals."],
      ["Runs fire", "At the END of the interval."],
      ["backfill", "airflow dags backfill -s <start> -e <end>."]
    ] },
    { title: "Retries & SLAs", rows: [
      ["retries", "Attempts before failure (default 0)."],
      ["retry_delay", "Wait between attempts (timedelta)."],
      ["retry_exponential_backoff", "delay × 2^(try-1), capped by max_retry_delay."],
      ["sla", "Deadline from logical_date → sla_miss_callback."],
      ["on_failure_callback", "Fires on final failure — alert the team."]
    ] },
    { title: "Executors", rows: [
      ["Local", "Forks subprocesses; no broker."],
      ["Celery", "Warm worker pool + Redis/RabbitMQ; route via queue."],
      ["Kubernetes", "One pod per task; per-task resources; startup latency."],
      ["parallelism", "Cluster-wide cap on running tasks."],
      ["pool", "Cap concurrency against a shared resource."]
    ] },
    { title: "Essential CLI", rows: [
      ["airflow tasks test <dag> <task> <date>", "Run one task, real context, no state."],
      ["airflow dags test <dag> <date>", "Run a whole DAG locally."],
      ["airflow dags trigger <dag> -c '{...}'", "Trigger with a conf payload."],
      ["airflow db migrate", "Apply schema migrations."],
      ["airflow db clean", "Purge old run/log rows."],
      ["airflow api-server", "UI + REST (3.x; was 'webserver')."]
    ] },
    { title: "Data passing & config", rows: [
      ["XCom", "Small values via the DB — pass pointers, not big data."],
      ["Connection (conn_id)", "Encrypted creds + endpoint for a system."],
      ["Variable", "Global key/value config."],
      ["Param", "Per-run input to a DAG."],
      ["{{ ds }} / {{ ti }} / {{ var.value.x }}", "Templated at runtime."]
    ] },
    { title: "Production checklist", rows: [
      ["HA", "2+ active-active schedulers (DB row locks)."],
      ["PgBouncer", "Pool DB connections at scale."],
      ["Remote logging", "S3/GCS so logs survive pods."],
      ["Alert on", "Scheduler heartbeat, task.failed, pool.open_slots."],
      ["Back up", "The metadata DB — the source of truth."]
    ] }
  ];

  var module = {
    id: "cheat-sheet",
    title: "Cheat Sheet",
    fullWidth: true,
    _btn: null, _handler: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up cheat-noprint">' +
          '<div class="module-eyebrow">Apache Airflow · Reference</div>' +
          '<h1 class="module-title">Airflow Cheat Sheet</h1>' +
          '<p class="module-subtitle">The whole mental model on one page — objects, states, scheduling, retries, executors, CLI, and a production checklist. ' +
          '<button class="btn btn-primary cheat-print" id="cheat-print">🖨️ Print / Save PDF</button></p>' +
        "</div>" +
        '<div class="cheat-grid">' +
          CARDS.map(function (c) {
            return '<section class="cheat-card"><h2 class="cheat-card-title">' + c.title + '</h2><dl class="cheat-dl">' +
              c.rows.map(function (r) {
                return "<dt><code>" + r[0] + "</code></dt><dd>" + r[1] + "</dd>";
              }).join("") + "</dl></section>";
          }).join("") +
        "</div>";

      var btn = container.querySelector("#cheat-print");
      this._btn = btn;
      this._handler = function () { window.print(); };
      if (btn) btn.addEventListener("click", this._handler);
    },

    destroy: function () {
      if (this._btn && this._handler) this._btn.removeEventListener("click", this._handler);
      this._btn = null; this._handler = null;
    }
  };

  AV.registerModule(module);
})();
