/* ============================================================
   data/prep/choose.js — "Choose the Right Primitive" decisions
   ------------------------------------------------------------
   Requirement-driven trade-off scenarios rendered by
   js/components/choose-approach.js and js/modules/choose-primitive.js.

   Shape:
     { id, title, category, difficulty, requirement,
       options: [ { label, verdict: "best"|"viable"|"wrong", why } ],
       whatIfChanged, interview? }

   Content is trusted HTML (authored in-repo). ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  AV.data.choose = [
    {
      id: "xcom-vs-storage", title: "XCom vs Object Storage", category: "Data passing", difficulty: "med",
      requirement: "A task produces a 2 GB cleaned dataset that the next task must consume. How do you pass it between the two tasks?",
      options: [
        { label: "Write it to object storage (S3/ADLS/GCS) and pass the path via XCom", verdict: "best",
          why: "The bytes live in a store built for them; XCom carries only a tiny reference, keeping the metadata DB lean." },
        { label: "Push the DataFrame through XCom directly", verdict: "wrong",
          why: "XCom serializes into the metadata DB; 2 GB would bloat it, slow every scheduler/UI query, and likely exceed limits." },
        { label: "Store it in an Airflow Variable", verdict: "wrong",
          why: "Variables are also metadata-DB rows meant for small config — not multi-GB payloads." }
      ],
      whatIfChanged: "If it were a 200-byte summary — a row count or a status — plain XCom is perfectly fine. Size is the deciding factor.",
      interview: "Rule of thumb: pass <b>references</b> through XCom, never large <b>payloads</b>."
    },
    {
      id: "sensor-vs-deferrable", title: "Sensor vs Deferrable Sensor", category: "Sensors", difficulty: "med",
      requirement: "Thousands of DAGs each wait up to several hours for a file to land. How should they wait?",
      options: [
        { label: "Deferrable sensors backed by the triggerer", verdict: "best",
          why: "Deferred tasks free the worker slot entirely; one async triggerer watches thousands of waits — the scalable pattern for many long waits." },
        { label: "Poke-mode sensors", verdict: "wrong",
          why: "Each poke sensor holds a worker slot for the whole wait; thousands would starve the pool." },
        { label: "Reschedule-mode sensors", verdict: "viable",
          why: "Better than poke — it frees the slot between checks — but at this scale and frequency deferrable is more efficient and lower-latency." }
      ],
      whatIfChanged: "For a single, short (seconds) wait, a plain poke sensor is simplest — the triggerer's overhead isn't worth it.",
      interview: "Match the mode to the wait: poke for seconds, reschedule for medium, deferrable for long/numerous."
    },
    {
      id: "sensor-vs-asset", title: "Sensor vs Asset (Dataset)", category: "Dependencies", difficulty: "hard",
      requirement: "Downstream DAG B should run whenever upstream DAG A finishes producing a table. How do you wire the dependency?",
      options: [
        { label: "Make DAG A produce an Asset/Dataset and schedule DAG B on that Asset", verdict: "best",
          why: "Event-driven: B triggers exactly when A updates the dataset — no polling, no schedule guessing, no wasted slots." },
        { label: "Put a sensor in B that waits for A's output", verdict: "viable",
          why: "Works, but it polls and (in poke) holds a slot; it's the pre-Assets pattern and more brittle across schedules." },
        { label: "Schedule B a few hours after A and hope A finishes", verdict: "wrong",
          why: "Time-coupling is fragile — if A runs long or late, B runs on missing or stale data." }
      ],
      whatIfChanged: "If the producer is external to Airflow (a third-party file drop), a deferrable sensor — or an Asset updated by a small watcher task — fits better than a pure cross-DAG Asset.",
      interview: "In Airflow 3, Assets/Datasets are the first-class way to couple DAGs by data, not time."
    },
    {
      id: "pool-vs-concurrency", title: "Pool vs task concurrency", category: "Concurrency", difficulty: "med",
      requirement: "A shared external API must never receive more than 5 concurrent calls, but those calls come from tasks across several different DAGs. How do you enforce the limit?",
      options: [
        { label: "Put all those tasks in a Pool with 5 slots", verdict: "best",
          why: "Pools cap concurrency for a shared resource across DAGs — exactly this case." },
        { label: "Set max_active_tasks on each DAG", verdict: "wrong",
          why: "That limits tasks within a single DAG; it can't coordinate a global limit across multiple DAGs hitting one API." },
        { label: "Lower global parallelism to 5", verdict: "wrong",
          why: "That throttles the whole cluster, not just the API callers — collateral damage everywhere." }
      ],
      whatIfChanged: "If the limit were \"no more than 5 tasks in this one DAG run,\" then max_active_tasks on that DAG would be the right tool.",
      interview: "Pools protect a shared <i>resource</i>; concurrency knobs protect a <i>DAG</i> or the cluster."
    },
    {
      id: "runs-vs-tasks", title: "max_active_runs vs task concurrency", category: "Concurrency", difficulty: "med",
      requirement: "A backfill of a daily DAG is stampeding your source DB because many days run at once. You still want each day's tasks to run normally. What do you limit?",
      options: [
        { label: "Set max_active_runs to cap how many DAG runs execute at once", verdict: "best",
          why: "That bounds concurrent runs (days) while leaving within-run task concurrency intact." },
        { label: "Lower max_active_tasks", verdict: "viable",
          why: "It reduces load, but it throttles tasks within each run too — a blunter cut than limiting the number of concurrent days." },
        { label: "Reduce retries", verdict: "wrong",
          why: "Retries don't govern how many runs execute in parallel; this won't address the stampede." }
      ],
      whatIfChanged: "If instead a single run fanned out too wide (one day with 500 parallel tasks hammering the DB), max_active_tasks — or a pool — would be the right limit.",
      interview: "Runs vs tasks: one bounds <i>depth</i> (concurrent runs), the other <i>width</i> (tasks per run)."
    },
    {
      id: "branch-vs-triggerrule", title: "Branching vs trigger rules", category: "DAG design", difficulty: "med",
      requirement: "Based on a check, you must run EITHER the \"full reload\" path OR the \"incremental\" path, never both. How do you model it?",
      options: [
        { label: "A BranchPythonOperator that returns the task_id of the path to take", verdict: "best",
          why: "Branching is designed to choose one path and skip the other(s) at runtime." },
        { label: "Run both paths and use trigger rules to sort it out", verdict: "wrong",
          why: "Trigger rules control when a task runs based on upstream states; they don't make a clean either/or choice — both paths would start." },
        { label: "Two separate DAGs and a manual decision", verdict: "wrong",
          why: "Unnecessary; the choice is data-driven and belongs inside one DAG." }
      ],
      whatIfChanged: "Trigger rules shine for the <i>join</i> after a branch — e.g. a downstream task with trigger_rule='none_failed_min_one_success' that runs whichever path was taken.",
      interview: "Branch to <i>choose</i> a path; trigger rules to <i>rejoin</i> after skips."
    },
    {
      id: "ets-vs-asset", title: "ExternalTaskSensor vs Asset", category: "Dependencies", difficulty: "hard",
      requirement: "You're designing a NEW cross-DAG dependency in Airflow 3: DAG B needs DAG A's daily output. What's the cleanest mechanism?",
      options: [
        { label: "Asset/Dataset-driven scheduling (A produces, B consumes)", verdict: "best",
          why: "In Airflow 3 this is the first-class, event-driven way to couple DAGs — no date matching, no polling." },
        { label: "ExternalTaskSensor in B keyed to A", verdict: "viable",
          why: "Works and is well understood, but you must align logical dates (execution_delta) and it polls — more moving parts." },
        { label: "Cron B to start after A", verdict: "wrong",
          why: "Time-coupling breaks the moment A runs late or long." }
      ],
      whatIfChanged: "On older Airflow 2.x without Assets, ExternalTaskSensor (with correct execution_delta and allowed_states) is the standard choice.",
      interview: "Prefer data-driven Assets for new designs; ExternalTaskSensor is the classic fallback."
    },
    {
      id: "tdro-vs-asset", title: "TriggerDagRunOperator vs Asset", category: "Dependencies", difficulty: "hard",
      requirement: "DAG A should cause DAG B to run. You want loose coupling, and B should also be able to run on its own schedule sometimes. Best mechanism?",
      options: [
        { label: "Have A update an Asset that B is scheduled on", verdict: "best",
          why: "Loose coupling — B declares \"I run when this dataset updates\" and can also keep its own schedule; A needn't know B exists." },
        { label: "TriggerDagRunOperator in A that fires B", verdict: "viable",
          why: "Direct and explicit, but it hard-wires A→B (A must name B) — tighter coupling, and fan-out gets awkward." },
        { label: "Merge A and B into one DAG", verdict: "wrong",
          why: "That removes the independence you explicitly want (B running on its own schedule)." }
      ],
      whatIfChanged: "If you must pass a specific run payload/conf and want imperative control (\"run B now with these params\"), TriggerDagRunOperator is the better fit.",
      interview: "Assets = loose, data-driven coupling; TriggerDagRunOperator = explicit, imperative triggering."
    },
    {
      id: "taskflow-vs-python", title: "TaskFlow vs PythonOperator", category: "Authoring", difficulty: "easy",
      requirement: "You're writing a new Python-based DAG that passes small values between steps. Which authoring style?",
      options: [
        { label: "TaskFlow API (@task decorators)", verdict: "best",
          why: "Less boilerplate, automatic XCom wiring between functions, cleaner dependencies — the modern default for Python DAGs." },
        { label: "Classic PythonOperator with explicit XCom push/pull", verdict: "viable",
          why: "Perfectly valid and sometimes needed for operator-level control, but more boilerplate for the common case." },
        { label: "One Bash script that runs everything", verdict: "wrong",
          why: "Throws away Airflow's task-level visibility, retries, and XCom — you lose the orchestration benefits." }
      ],
      whatIfChanged: "For non-Python work or existing operators (SQL, Spark submit, sensors), you still use the matching operator — TaskFlow is for Python callables.",
      interview: "TaskFlow is syntactic sugar over the same task/XCom machinery — reach for it by default in new Python DAGs."
    },
    {
      id: "celery-vs-k8s", title: "CeleryExecutor vs KubernetesExecutor", category: "Executors", difficulty: "hard",
      requirement: "Your workload is thousands of small, short, homogeneous tasks per hour at steady volume. Which executor?",
      options: [
        { label: "CeleryExecutor with a warm worker pool", verdict: "best",
          why: "Warm workers avoid per-task pod-startup latency; steady homogeneous load is exactly Celery's sweet spot." },
        { label: "KubernetesExecutor (pod per task)", verdict: "viable",
          why: "Gives isolation and elasticity, but paying pod startup + image pull per tiny task adds latency and overhead at this volume." },
        { label: "LocalExecutor", verdict: "wrong",
          why: "Single-host; it can't handle thousands of tasks per hour across a cluster." }
      ],
      whatIfChanged: "If tasks were heavy, heterogeneous in resources, or bursty, KubernetesExecutor's per-task isolation and elastic scale would win.",
      interview: "Celery for steady throughput on warm workers; Kubernetes for isolation and bursty, variable workloads."
    },
    {
      id: "local-vs-celery", title: "LocalExecutor vs CeleryExecutor", category: "Executors", difficulty: "easy",
      requirement: "A small team runs ~30 lightweight tasks a day on a single VM and wants minimal ops overhead. Which executor?",
      options: [
        { label: "LocalExecutor", verdict: "best",
          why: "Runs tasks as subprocesses on one host — simple, no broker or worker fleet to operate; ideal for small single-node setups." },
        { label: "CeleryExecutor", verdict: "wrong",
          why: "Adds a broker, a result backend, and a worker fleet — real ops overhead unjustified at this tiny scale." },
        { label: "KubernetesExecutor", verdict: "wrong",
          why: "Requires a cluster; massive overkill for 30 lightweight tasks on one VM." }
      ],
      whatIfChanged: "Once you outgrow one machine (need horizontal scale or HA), CeleryExecutor — or Kubernetes — becomes the right move.",
      interview: "Start simple (Local); adopt a distributed executor only when scale or HA demands it."
    },
    {
      id: "catchup-vs-backfill", title: "Catchup vs Backfill", category: "Scheduling", difficulty: "med",
      requirement: "You just built a DAG and want to process the last 90 days of history once, in a controlled way, then run daily going forward. How?",
      options: [
        { label: "Deploy with catchup=False, then run a manual backfill for the 90-day range with max_active_runs capped", verdict: "best",
          why: "catchup=False prevents an automatic flood; a deliberate backfill processes history at a controlled rate." },
        { label: "Set start_date 90 days back with catchup=True", verdict: "wrong",
          why: "That backfills automatically all at once on deploy — a storm on your sources with no rate control." },
        { label: "Manually trigger 90 runs by hand", verdict: "wrong",
          why: "Error-prone and tedious; backfill is the built-in tool for a date range." }
      ],
      whatIfChanged: "If you never needed history and only wanted go-forward runs, catchup=False alone (no backfill) is all you need.",
      interview: "Catchup is automatic gap-filling; backfill is a deliberate, rate-controllable replay."
    },
    {
      id: "cron-vs-timetable", title: "Cron vs Timetable", category: "Scheduling", difficulty: "med",
      requirement: "A DAG must run at 6pm on business days only, skipping company holidays. How do you schedule it?",
      options: [
        { label: "A custom Timetable encoding the business/holiday calendar", verdict: "best",
          why: "Holiday-aware, calendar-driven logic can't be expressed in cron — Timetables exist for exactly this." },
        { label: "A cron expression like '0 18 * * 1-5'", verdict: "viable",
          why: "Gets weekdays, but cron can't skip holidays — you'd still fire on holidays and need extra guarding." },
        { label: "Run daily and short-circuit on non-business days", verdict: "wrong",
          why: "Wastes runs and clutters history; the schedule itself should encode the calendar." }
      ],
      whatIfChanged: "For a plain \"every day at 6pm\" with no calendar logic, a simple cron string is the right, lighter choice.",
      interview: "Cron for regular cadences; a Timetable when the interval needs real logic (calendars, data-driven windows)."
    },
    {
      id: "dyndag-vs-mapping", title: "Dynamic DAG generation vs Dynamic Task Mapping", category: "DAG design", difficulty: "hard",
      requirement: "At runtime you get a list of N files (N varies daily) and must run the SAME processing task once per file. What do you use?",
      options: [
        { label: "Dynamic Task Mapping (.expand()) over the file list", verdict: "best",
          why: "Mapping fans one task into N parallel instances at runtime within a single DAG — built for \"same task, varying inputs.\"" },
        { label: "Generate N DAGs, one per file", verdict: "wrong",
          why: "That's dynamic DAG generation — wrong tool here; it explodes DAG count and reparsing for what is really one task over many inputs." },
        { label: "A loop that calls the function N times inside one task", verdict: "viable",
          why: "Works, but loses per-file parallelism, retries, and visibility — each file isn't its own task instance." }
      ],
      whatIfChanged: "Dynamic DAG generation fits when you need genuinely different pipelines per tenant/config (different structures) — not the same task over a variable list.",
      interview: "Mapping = same task, many inputs; DAG generation = many different pipelines."
    }
  ];
})();
