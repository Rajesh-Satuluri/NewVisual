/* ============================================================
   data/prep/answers-timed.js — 30-second / 90-second / 3-minute answers
   ------------------------------------------------------------
   The same topic answered at three depths, for whatever the moment
   calls for. Rendered by js/components/tiered-answer.js via
   js/modules/timed-answers.js.

   Shape: { id, question, category, tiers: [ { label, body } ] }
   Content is trusted HTML (authored in-repo). ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  function item(id, question, category, s30, s90, s180) {
    return { id: id, question: question, category: category, tiers: [
      { label: "30 seconds", body: "<p>" + s30 + "</p>" },
      { label: "90 seconds", body: "<p>" + s90 + "</p>" },
      { label: "3 minutes", body: "<p>" + s180 + "</p>" }
    ] };
  }

  AV.data.answersTimed = [
    item("architecture", "Explain Airflow's architecture.", "Architecture",
      "A scheduler decides what runs, an executor and workers run tasks, the metadata DB is the source of truth, and a webserver serves the UI. You author DAGs in Python.",
      "The scheduler parses DAGs, creates DAG runs and task instances, and hands ready tasks to the executor, which runs them on workers. All state lives in the metadata DB; the webserver reads it for the UI. A triggerer handles async waits for deferrable tasks.",
      "Full flow: author → the DAG processor parses files into serialized DAGs → the scheduler evaluates schedules and dependencies and enqueues task instances → the executor (Local/Celery/Kubernetes) dispatches to workers → workers execute and write state back to the metadata DB → the webserver renders it. Deferrable tasks offload their waits to the triggerer. The metadata DB is the shared source of truth and the scaling bottleneck, so HA means multiple schedulers plus pooled DB connections. Airflow 3 separates the API server and DAG processor for isolation and security."),
    item("scheduler", "What does the scheduler do?", "Scheduler",
      "It decides which tasks are ready and sends them to the executor to run.",
      "On a loop it parses DAGs, creates DAG runs for due intervals, checks dependencies and pools, and enqueues ready task instances to the executor. It also detects zombies and honours concurrency limits.",
      "The scheduler runs the parse loop and the scheduling loop: it turns schedules into DAG runs, evaluates each task's upstream state, trigger rules, pool and concurrency ceilings, and enqueues what's runnable. It heartbeats and reaps zombies. Its two failure modes are crashing and stalling on slow DAG parsing (heavy top-level code), so you keep DAG files import-safe and run active-active HA schedulers. Watch scheduler heartbeat and parse time as leading health signals."),
    item("executors", "What are the executor types?", "Executors",
      "Local runs tasks on one host, Celery distributes to a worker pool, Kubernetes runs one pod per task.",
      "LocalExecutor runs subprocesses on the scheduler host — simple, single-node. CeleryExecutor distributes tasks to workers via a broker — good for steady throughput. KubernetesExecutor launches a pod per task — isolation and elastic scale.",
      "Local is single-node and ops-light; Celery gives a warm worker pool ideal for many steady, short tasks but needs a broker and result backend; Kubernetes gives per-task isolation and elasticity for heavy or bursty workloads at the cost of pod-startup latency. Celery routes by queue (workers subscribe via --queues); Kubernetes needs cluster capacity/autoscaling. Airflow 3 can even run multiple executors and route work per task. Whichever you pick, the metadata DB is the shared ceiling."),
    item("xcom", "What is XCom and when do you use it?", "Execution",
      "It passes small values between tasks, stored in the metadata DB.",
      "XCom lets a task push a value that downstream tasks pull, by key, via the metadata DB. It's for small values — ids, paths, counts — not large data, which would bloat the DB.",
      "XCom is the cross-task value channel backed by the metadata DB. Use it for small control values; for anything data-sized, write to object storage and pass a reference, or configure a custom XCom backend that offloads transparently. The reasons matter: large XCom bloats the shared metadata DB, slows every scheduler/UI query, and can exceed serialization limits — and on retries the referenced object must be deterministic per logical date to stay safe."),
    item("sensors", "How do sensors work, and what's deferrable?", "Sensors",
      "A sensor waits for a condition. Deferrable sensors wait without holding a worker slot.",
      "In poke mode a sensor holds a worker slot for the whole wait; in reschedule mode it frees the slot between checks. A deferrable sensor suspends and hands the wait to the async triggerer, using no worker slot.",
      "Sensors gate downstream work on a condition. Poke holds a slot the whole time (fine for seconds); reschedule frees the slot between checks (good for medium waits); deferrable suspends the task and offloads the wait to the triggerer, an asyncio process that can watch thousands of conditions with zero worker slots — the scalable choice for long or numerous waits. The trade-off is operating a triggerer. A fleet of poke sensors starving the worker pool is the classic failure this fixes."),
    item("pools-concurrency", "How do pools and concurrency limits differ?", "Concurrency",
      "parallelism is the cluster cap; a pool caps tasks sharing a resource; per-DAG limits cap a DAG.",
      "parallelism bounds running tasks cluster-wide. A pool caps concurrent tasks that share a resource, across DAGs. max_active_tasks bounds tasks within a DAG run; max_active_runs bounds concurrent runs of a DAG.",
      "Think of a stack of ceilings: global parallelism, per-DAG max_active_tasks (width) and max_active_runs (depth), and pools for shared resources across DAGs. A task stuck in queued is hitting one of them. Use a pool to protect a downstream API/DB (\"no more than 5 at once\") independent of total parallelism; use max_active_runs to stop a backfill stampede; use priority_weight to reorder who gets the next slot under contention — it doesn't add capacity."),
    item("dag-parsing", "How does DAG parsing work and why does it matter?", "Scheduler",
      "Airflow parses your DAG files on a loop to build DAG objects; slow parsing slows scheduling.",
      "The DAG processor imports each DAG file periodically and serializes the DAGs into the metadata DB. Because it runs on every parse, heavy top-level code (imports, network, DB calls) inflates parse time and can stall scheduling.",
      "Parsing turns .py files into serialized DAGs the scheduler reads. It's periodic, so any top-level work runs repeatedly — a module-level API call can balloon parse time and starve the scheduling loop, and if it throws, the DAG vanishes with an import error. The rules: keep DAG files import-safe (defer real work into tasks), tune parsing intervals, split large DAG-generating files, and in Airflow 3 lean on the separated DAG processor. Monitor parse time as a first-class metric."),
    item("dynamic-mapping", "What is Dynamic Task Mapping?", "DAG design",
      "It fans one task into N parallel instances at runtime, one per input.",
      "Using .expand(), a task maps over a runtime list to produce N task instances — \"same task, many inputs.\" It's different from generating N DAGs, which creates whole separate pipelines.",
      "Dynamic Task Mapping expands a single task into N instances at runtime from a list produced upstream — ideal for \"process each of today's files.\" It's not dynamic DAG generation (many different pipelines) and it's not a Python loop inside one task (which loses per-item retries and visibility). At large N it creates many task instances and metadata rows, so you cap concurrency with a pool and, for extreme fan-out, batch inputs so each mapped task handles a chunk."),
    item("catchup-backfill", "Catchup vs backfill?", "Scheduling",
      "Catchup is automatic gap-filling from start_date; backfill is a manual CLI run over a date range.",
      "When enabled, catchup makes the scheduler run every missed interval between start_date and now. Backfill is you deliberately running a DAG over a past range. Both replay history, but one is automatic and one is on demand.",
      "Catchup is a scheduling policy: on deploy with an old start_date and catchup=True, Airflow schedules a run for every missed interval — a flood. So new DAGs usually set catchup=False and start go-forward. Backfill is the deliberate tool for replaying a specific range, and you cap it with max_active_runs so it doesn't stampede sources. Both rely on idempotent, logical-date-keyed writes to be safe — otherwise replaying history duplicates data."),
    item("idempotency", "Why is idempotency important in Airflow?", "Reliability",
      "So retries and backfills don't create duplicate or wrong data.",
      "Airflow is at-least-once: retries, backfills and reruns re-execute tasks. If writes aren't idempotent, that produces duplicates or corruption. You make loads overwrite a partition or MERGE on a key.",
      "Because Airflow re-executes tasks (retries, backfills, manual reruns), every write must converge to one correct result no matter how many times it runs. In practice: key the write to the run's logical date, overwrite the partition (delete-insert) or MERGE on a natural key rather than appending, and write atomically so a mid-way failure leaves no half-state. Derive targets from {{ ds }}, never now(). The acceptance test is literally running the task twice and confirming identical output.")
  ];
})();
