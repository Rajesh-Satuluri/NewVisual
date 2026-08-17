/* ============================================================
   business-lens.js — the recurring e-commerce business example
   Appended below every concept module by the router, so the same
   ShopKart "Daily Sales & Operations" pipeline illustrates each
   Airflow concept in a real business context.
   AirflowViz.BusinessLens.append(container, moduleId)
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // Each entry ties one concept to a concrete task in the nightly
  // ecommerce_daily_ops pipeline. Keys are module route ids.
  var DATA = {
    architecture: {
      task: "ecommerce_daily_ops (whole DAG)", system: "All 7 systems",
      meaning: "Deliver yesterday's complete business picture by 7 AM.",
      point: "ShopKart's morning dashboard depends on data from the e-commerce DB, payment platform, warehouse, CRM, marketing APIs, and the data warehouse. Airflow is the <b>conductor</b> that runs each extract, transform, and load in the right order across all of them — it doesn't hold the data, it coordinates the systems that do."
    },
    "dag-parsing": {
      task: "ecommerce_daily_ops.py", system: "Airflow DAG processor",
      meaning: "Turn the pipeline definition into a runnable DAG.",
      point: "The file that defines ShopKart's nightly run is re-parsed continuously. Keeping its top level import-safe — no live calls to the payment API at parse time — is what lets the 2 AM run start on schedule instead of stalling the whole scheduler."
    },
    "dag-run": {
      task: "run for logical_date = yesterday", system: "Scheduler + metadata DB",
      meaning: "One execution representing one business day.",
      point: "Each night creates exactly one DAG run standing for the <i>previous</i> day's completed sales. When the COO looks at Jan 15's numbers, they're looking at the <code>2024-01-15</code> DAG run — a single, auditable execution of the whole pipeline."
    },
    "task-instance": {
      task: "extract_orders (2024-01-15)", system: "E-commerce DB",
      meaning: "One task, for one day, with its own state.",
      point: "\"Pull yesterday's orders\" isn't abstract — it's a specific task instance for a specific date that moves through the state machine, gets a try_number, and writes its own log. That's the atomic unit Airflow schedules, retries, and tracks."
    },
    scheduler: {
      task: "2:00 AM daily trigger", system: "Airflow scheduler",
      meaning: "Start the pipeline when yesterday is complete.",
      point: "The scheduler creates ShopKart's DAG run at 02:00, then queues the four extract tasks the moment their dependencies are satisfied. Nobody presses a button — the scheduler turns the schedule into running work every single night."
    },
    scheduling: {
      task: "schedule = '0 2 * * *'", system: "Timetable",
      meaning: "Run daily, over yesterday's data interval.",
      point: "ShopKart runs at 2 AM with <code>catchup=False</code>. The logical date is yesterday's interval, so <code>extract_orders</code> always pulls exactly one clean day — no gaps, no overlaps, no double-counted revenue."
    },
    backfill: {
      task: "backfill 2024-01-01 → 01-07", system: "Data warehouse",
      meaning: "Recompute history after a data fix.",
      point: "When finance discovers last week's refunds were mis-categorized, ShopKart backfills that date range — Airflow re-runs the pipeline for each historical day so the restated numbers flow all the way to the dashboard, without touching unaffected days."
    },
    executors: {
      task: "extract_orders / _payments / …", system: "Worker fleet",
      meaning: "Decide where each task actually runs.",
      point: "The four extracts can run in parallel on separate workers. The executor is what dispatches them — on a busy night ShopKart's Celery/Kubernetes workers pick up the extracts simultaneously so the whole run still finishes before 7 AM."
    },
    "task-lifecycle": {
      task: "reconcile_payments", system: "Payment platform",
      meaning: "Watch a task move scheduled → running → success.",
      point: "\"Match every order to a payment\" walks the full state machine each night: scheduled, queued, running, then success — or up_for_retry if the payment API hiccups. The dashboard only trusts the number once this task reaches success."
    },
    xcoms: {
      task: "extract_orders → reconcile_payments", system: "Metadata DB",
      meaning: "Pass a pointer between tasks, not the data.",
      point: "<code>extract_orders</code> hands downstream tasks the order count and the S3 path where the day's orders landed — small values via XCom. The 2 GB of order rows themselves go to object storage, not through XCom, keeping the metadata DB fast."
    },
    sensors: {
      task: "wait_for_inventory_feed", system: "Warehouse export",
      meaning: "Wait for late data without wasting a worker.",
      point: "The warehouse drops its stock export at an unpredictable time. A deferrable sensor waits for that file and releases its worker slot while waiting — so ShopKart isn't burning a worker doing nothing until the inventory data actually arrives."
    },
    pools: {
      task: "load_warehouse (pool=warehouse_db)", system: "Data warehouse",
      meaning: "Cap concurrent load on a shared system.",
      point: "Many tasks want to write to the analytics warehouse at once. A <code>warehouse_db</code> pool with limited slots ensures ShopKart never opens more concurrent connections than the warehouse can handle — protecting the very system the dashboard reads from."
    },
    "task-mapping": {
      task: "extract_marketing per channel", system: "Marketing APIs",
      meaning: "Fan out one task per campaign at runtime.",
      point: "ShopKart advertises on Google, Meta, TikTok, and more — and the list changes. Dynamic task mapping creates one <code>extract_marketing</code> task per active channel at runtime, so adding a new ad platform needs no DAG rewrite."
    },
    serialization: {
      task: "serialized ecommerce_daily_ops", system: "Metadata DB",
      meaning: "Store the DAG as JSON for fast, safe reads.",
      point: "The ops team watches the nightly run in the UI without Airflow re-importing the Python each time. The serialized DAG in the DB is what the scheduler and UI read — so a heavy import in the pipeline file never slows down viewing its status."
    },
    "metadata-db": {
      task: "task states for the nightly run", system: "Metadata DB",
      meaning: "The source of truth for what happened last night.",
      point: "Did last night's run succeed? Which task failed and retried? The metadata DB holds every task instance's state, timing, and try_number for ShopKart's pipeline — it's what on-call checks first when the 7 AM dashboard looks wrong."
    },
    callbacks: {
      task: "on_failure_callback on extract_payments", system: "Alerting",
      meaning: "React automatically when a task fails.",
      point: "When the payment extract fails its last retry, an <code>on_failure_callback</code> pages the payments team on PagerDuty and posts to Slack — the failure routes itself to the people who own that system, without a human noticing the red task first."
    },
    templating: {
      task: "extract_orders SQL with {{ ds }}", system: "E-commerce DB",
      meaning: "Inject the run's date into each query.",
      point: "ShopKart's extract query is <code>WHERE order_date = '{{ ds }}'</code>. Airflow templates yesterday's date in at runtime, so the same task pulls the correct day whether it runs tonight or is backfilled for last month."
    },
    priority: {
      task: "finance close vs. routine load", system: "Executor slots",
      meaning: "Run the most business-critical task first.",
      point: "At quarter-end the finance-close tasks carry a higher <code>priority_weight</code>. When workers are contended, Airflow runs ShopKart's revenue-critical tasks ahead of routine ones — the numbers leadership needs land first."
    },
    connections: {
      task: "conn_id: ecommerce_db, payment_api", system: "All source systems",
      meaning: "Reach each system with stored, encrypted creds.",
      point: "Every system ShopKart touches — the orders DB, the payment API, the warehouse — is reached through a named Connection. Credentials live encrypted in Airflow, not in the DAG code, so rotating the payment API key never means editing a pipeline."
    },
    variables: {
      task: "refund_threshold, low_stock_level", system: "Airflow Variables",
      meaning: "Tune business rules without code changes.",
      point: "The thresholds that trigger alerts — a revenue-drop percentage, a low-stock level — live as Airflow Variables/Params. Finance can raise the refund-rate alert threshold without a code deploy, because it's config, not logic."
    },
    retries: {
      task: "extract_payments", system: "Payment platform API",
      meaning: "Survive a flaky external API automatically.",
      point: "The payment API occasionally returns a 503. With <code>retries=3</code> and exponential backoff, ShopKart's extract quietly waits and retries instead of failing the whole pipeline — most nights nobody even knows the API blipped."
    },
    logging: {
      task: "reconcile_payments", system: "Log storage (S3)",
      meaning: "Keep a per-attempt record for debugging.",
      point: "When reconciliation finds 12 orders without a matching payment, the details are in <code>reconcile_payments</code>'s log for that try. Because each retry writes its own log to remote storage, on-call can see exactly what the failing attempt saw."
    },
    monitoring: {
      task: "scheduler heartbeat before 2 AM", system: "Metrics / Grafana",
      meaning: "Make sure the nightly run can even start.",
      point: "If the scheduler heartbeat goes stale, ShopKart's 2 AM run never fires and the 7 AM dashboard is empty. Alerting on scheduler and task-failure metrics catches that at 2:05 AM — hours before the COO would have noticed."
    },
    security: {
      task: "RBAC + encrypted payment creds", system: "Auth / metadata DB",
      meaning: "Let teams see only what they should.",
      point: "Finance sees the finance DAGs; marketing sees theirs. Payment credentials are Fernet-encrypted at rest. ShopKart's sensitive revenue and customer data stays protected even though many teams share one Airflow."
    },
    cli: {
      task: "airflow tasks test … reconcile_payments", system: "Terminal",
      meaning: "Debug one task without a full run.",
      point: "When reconciliation misbehaves, an engineer runs <code>airflow tasks test ecommerce_daily_ops reconcile_payments 2024-01-15</code> to execute just that task with real templated context — reproducing the problem in seconds without waiting for 2 AM."
    },
    performance: {
      task: "parallel extracts + tuned pools", system: "Scheduler / workers",
      meaning: "Finish the whole run before the 7 AM deadline.",
      point: "The pipeline has a hard business deadline: 7 AM. Running the four extracts in parallel, sizing pools, and keeping DAG parsing cheap is what keeps ShopKart's end-to-end run comfortably under that window even as data volume grows."
    },
    "ha-setup": {
      task: "active-active schedulers", system: "Airflow control plane",
      meaning: "Never miss the nightly run to one failure.",
      point: "If ShopKart ran a single scheduler and it crashed at 1:55 AM, the whole business would start the day blind. Two active-active schedulers mean the 2 AM run fires even if one node dies — no single point of failure for the morning numbers."
    },
    kubernetes: {
      task: "transform_sales in its own pod", system: "Kubernetes",
      meaning: "Give a heavy task dedicated resources.",
      point: "The big join across sales, CRM, and marketing is memory-hungry. On the Kubernetes executor it runs in its own pod with a raised memory limit via <code>executor_config</code> — so ShopKart's heaviest task can't starve the lighter ones."
    },
    celery: {
      task: "extract_* pulled by warm workers", system: "Celery + Redis",
      meaning: "Dispatch the nightly extracts with no cold start.",
      point: "ShopKart's warm Celery worker pool picks up the four extracts from the broker the instant they're queued — no per-task pod startup — so the parallel extraction phase begins immediately at 2 AM."
    }
  };

  function row(k, v, mono) {
    return '<div class="lens-row"><span class="lens-k">' + k + "</span>" +
      (mono ? '<code class="lens-v-mono">' + v + "</code>" : '<span class="lens-v">' + v + "</span>") +
      "</div>";
  }

  function create(id) {
    var d = DATA[id];
    if (!d) return null;
    var sec = document.createElement("section");
    sec.className = "section lens-section animate-fade-in";
    sec.innerHTML =
      '<div class="lens-card">' +
        '<div class="lens-head">' +
          '<span class="lens-badge">🛒 Real business example</span>' +
          '<span class="lens-head-title">How this shows up in ShopKart\'s daily sales pipeline</span>' +
        "</div>" +
        '<div class="lens-grid">' +
          '<div class="lens-meta">' +
            row("Task", d.task, true) +
            row("Business meaning", d.meaning, false) +
            row("System", d.system, false) +
          "</div>" +
          '<div class="lens-point">' +
            "<p>" + d.point + "</p>" +
            '<a class="lens-link" href="#business-scenario">See the full 2 AM → 7 AM pipeline →</a>' +
          "</div>" +
        "</div>" +
      "</div>";
    return sec;
  }

  function append(container, id) {
    if (!container) return;
    var el = create(id);
    if (el) container.appendChild(el);
  }

  AV.BusinessLens = { create: create, append: append, has: function (id) { return !!DATA[id]; } };
})();
