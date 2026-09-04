/* ============================================================
   quiz-banks.js — per-module "Test Yourself" question banks
   AirflowViz.data.quizBanks[routeId] = [{ q, options, answer, why, diff }]
   Consumed by the TestYourself component (per module) and the
   aggregate Study view. diff: "easy" | "med" | "hard".
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  function q(question, options, answer, why, diff) {
    return { q: question, options: options, answer: answer, why: why, diff: diff || "med" };
  }

  AV.data.quizBanks = {
    architecture: [
      q("Airflow separates three concerns. Which trio?",
        ["Parse, cache, render", "Describe (DAG), schedule (scheduler+DB), run (executor+workers)", "Extract, transform, load", "Auth, route, log"],
        1, "A DAG file <i>describes</i> work; the scheduler + metadata DB <i>schedule</i> it; the executor + workers <i>run</i> it.", "easy"),
      q("In Airflow 3.x, how does task code reach the metadata DB?",
        ["Direct psycopg2 connection", "Through the API server (Task Execution API)", "Via the Celery broker", "It cannot read the DB"],
        1, "3.x routes task↔DB access through the API server, so worker code no longer needs DB credentials.", "med"),
      q("What does the scheduler read to evaluate DAGs?",
        ["The raw .py file each loop", "The serialized DAG (JSON) in the DB", "The Git repo", "The worker logs"],
        1, "The DAG processor serializes DAGs to JSON; the scheduler and UI read that, never importing your Python.", "med")
    ],
    "dag-parsing": [
      q("When does top-level DAG-file code execute?",
        ["Once at deploy", "On every parse loop", "Only when triggered", "Never"],
        1, "The DAG processor re-imports files continually, so module-level code runs every parse — keep it cheap.", "easy"),
      q("Which component builds and serializes the DAG?",
        ["Worker", "DAG Processor", "Triggerer", "API server"],
        1, "The DAG Processor imports files, builds the graph, and writes serialized JSON to the DB.", "easy"),
      q("A heavy API call at the top of a DAG file mainly hurts…",
        ["Task runtime", "Parse time for the whole scheduler loop", "Log storage", "XCom size"],
        1, "Expensive import-time work stalls the parse loop, delaying scheduling for every DAG.", "med")
    ],
    "dag-run": [
      q("What does logical_date represent?",
        ["Wall-clock start", "The start of the data interval the run covers", "The deploy time", "The end of the retry window"],
        1, "logical_date (formerly execution_date) is the interval's start — the data period the run processes.", "med"),
      q("A daily DAG for Jan 15 actually executes…",
        ["At 00:00 Jan 15", "At the end of the interval, early Jan 16", "Whenever unpaused", "At noon Jan 15"],
        1, "Runs fire at the end of their interval so the full day's data is complete before processing.", "med"),
      q("catchup=True on a long-paused DAG will…",
        ["Skip all missed runs", "Create a run for every missed interval", "Run once", "Raise an error"],
        1, "Catchup backfills every interval from start_date to now — often a surprise stampede, so many disable it.", "hard")
    ],
    "task-instance": [
      q("Instantiating an Operator inside a DAG creates a…",
        ["Task Instance", "Task (graph node)", "DAG run", "Hook"],
        1, "An Operator is a template; placed in a DAG it becomes a Task; a run makes it a Task Instance.", "easy"),
      q("try_number increments on…",
        ["Every parse", "Each retry attempt", "Each XCom push", "Each heartbeat"],
        1, "Each attempt gets its own try_number and its own log file.", "easy"),
      q("Which order is correct?",
        ["running → queued → scheduled", "scheduled → queued → running → success", "queued → success → running", "success → running → queued"],
        1, "A task instance walks scheduled → queued → running → success/failed.", "med")
    ],
    scheduler: [
      q("How do multiple active schedulers avoid double-scheduling?",
        ["ZooKeeper election", "DB row locks (SELECT … FOR UPDATE SKIP LOCKED)", "A Redis lock", "Only one is ever active"],
        1, "They coordinate purely through the metadata DB with row-level locking — no external coordinator.", "hard"),
      q("Which does the scheduler NOT do?",
        ["Create DAG runs", "Queue runnable tasks", "Execute your task code", "Check dependencies"],
        2, "The scheduler decides what runs and hands it to the executor; it never runs task code itself.", "med"),
      q("A stale scheduler heartbeat means…",
        ["Logs are lost", "No new tasks get scheduled", "The DB is down", "Workers crash"],
        1, "If the heartbeat goes stale the scheduler isn't looping, so nothing new is queued — alert on it.", "med")
    ],
    scheduling: [
      q("A Timetable defines…",
        ["Where tasks run", "When a DAG runs and each run's data interval", "Retry policy", "Log location"],
        1, "The timetable controls run timing and the interval each run represents; cron and asset schedules are timetables.", "med"),
      q("An Asset/Dataset schedule triggers a DAG when…",
        ["A cron fires", "An upstream task updates the asset it consumes", "A sensor pokes", "The DB restarts"],
        1, "Data-aware scheduling runs the DAG because upstream data is ready, not because a clock ticked.", "hard"),
      q("schedule='0 2 * * *' means…",
        ["Every 2 hours", "Daily at 02:00", "Twice a day", "Every 2 minutes"],
        1, "Minute 0, hour 2, every day.", "easy")
    ],
    backfill: [
      q("Backfill is used to…",
        ["Speed up parsing", "Run a DAG for historical dates it never ran", "Purge old logs", "Scale workers"],
        1, "Backfill fills gaps in a pipeline's history over a chosen date range.", "easy"),
      q("To avoid stampeding a downstream DB during a backfill, cap…",
        ["parsing_processes", "max_active_runs", "fernet_key", "log level"],
        1, "Limiting max_active_runs throttles concurrent historical runs.", "med"),
      q("catchup differs from backfill in that catchup is…",
        ["Manual", "Automatic on unpause", "For logs only", "Faster"],
        1, "Catchup happens automatically when a DAG is unpaused; backfill is an explicit command.", "med")
    ],
    executors: [
      q("Which executor uses no broker/queue?",
        ["CeleryExecutor", "LocalExecutor", "KubernetesExecutor", "CeleryKubernetes"],
        1, "LocalExecutor forks subprocesses directly — no broker involved.", "easy"),
      q("Celery vs Kubernetes executor, the core tradeoff is…",
        ["Cost vs color", "Low latency (warm workers) vs isolation/per-task resources", "SQL vs NoSQL", "Push vs pull only"],
        1, "Celery wins on latency and volume; Kubernetes wins on isolation and per-task resources.", "med"),
      q("The executor's job is to…",
        ["Write logs", "Decide where queued tasks run and dispatch them", "Parse DAGs", "Serve the UI"],
        1, "It bridges the scheduler and the workers/pods that run tasks.", "easy")
    ],
    "task-lifecycle": [
      q("A task moves to up_for_retry when it fails and…",
        ["try_number > retries", "try_number ≤ retries", "retries = 0", "it has no owner"],
        1, "While attempts remain, a failed task becomes up_for_retry; only after exhausting retries is it failed.", "med"),
      q("The deferred state means the task is…",
        ["Running on a worker", "Waiting via the triggerer, worker slot released", "Cancelled", "Skipped"],
        1, "Deferrable operators hand the wait to the triggerer and free their worker slot.", "hard"),
      q("queued → running happens when…",
        ["The scheduler loops", "A worker picks up and starts the task", "The DAG is parsed", "An XCom is pushed"],
        1, "A worker pulling the task and starting execution flips it to running (via heartbeat).", "med")
    ],
    xcoms: [
      q("Where do XCom values live?",
        ["On the worker disk", "In the metadata DB", "In Redis", "In the DAG file"],
        1, "XComs are small key-values stored in the metadata DB.", "easy"),
      q("The XCom anti-pattern is…",
        ["Passing a small string", "Pushing a large DataFrame/file through it", "Returning None", "Using a custom key"],
        1, "Large payloads bloat the DB; pass a pointer (S3 path/table) instead.", "med"),
      q("Downstream reads an XCom by…",
        ["File path", "task_ids (and key)", "Line number", "Pod name"],
        1, "xcom_pull(task_ids=…, key=…) fetches a specific upstream value.", "med")
    ],
    sensors: [
      q("A deferrable sensor's key benefit is…",
        ["Faster CPU", "It releases its worker slot while waiting", "Smaller logs", "No retries needed"],
        1, "It hands the wait to the triggerer, so 100 waits don't occupy 100 workers.", "med"),
      q("reschedule mode differs from poke in that it…",
        ["Never times out", "Frees the slot between checks", "Uses XCom", "Runs on the scheduler"],
        1, "reschedule releases the worker between pokes (good for long, infrequent checks).", "hard"),
      q("The triggerer runs…",
        ["Sync pokes", "Async triggers for many deferred tasks at once", "The web UI", "DAG parsing"],
        1, "It watches thousands of conditions on one async event loop.", "med")
    ],
    pools: [
      q("A pool limits…",
        ["Log size", "Concurrent slots against a shared resource", "Parse time", "Retry count"],
        1, "Pools cap how many tasks hit a resource (e.g. a DB) at once.", "easy"),
      q("When a task's pool is exhausted, it stays…",
        ["running", "queued", "success", "skipped"],
        1, "No free slot means it waits in queued until one frees up.", "med"),
      q("Tasks with no pool set use…",
        ["no pool", "default_pool", "the DB pool", "a random pool"],
        1, "Everything falls into default_pool unless assigned otherwise.", "easy")
    ],
    "task-mapping": [
      q("Dynamic task mapping creates…",
        ["One DAG per file", "One task per input, decided at runtime", "A new pool", "A sensor"],
        1, "expand() fans a task out over a runtime-computed list.", "med"),
      q("In mapping, partial() supplies…",
        ["The mapped values", "The constant (non-mapped) arguments", "The pool", "The schedule"],
        1, "partial() sets fixed args; expand() provides the varying ones.", "hard"),
      q("A good use case for mapping is…",
        ["A fixed 3-step ETL", "One task per marketing channel that changes over time", "A single sensor", "Parsing"],
        1, "Per-item fan-out where the item count varies is exactly what mapping is for.", "med")
    ],
    serialization: [
      q("The parsed DAG is stored as…",
        ["Pickled bytes on disk", "Serialized JSON in the metadata DB", "A YAML file", "An XCom"],
        1, "Serialized JSON in the DB lets the scheduler/UI read DAGs without importing Python.", "med"),
      q("Serialization mainly enables…",
        ["Faster tasks", "Scheduler/UI to avoid importing your code", "Encryption", "Retries"],
        1, "It decouples reading a DAG from importing its (possibly heavy) module.", "med"),
      q("Which table holds the serialized DAG?",
        ["dag_run", "serialized_dag", "task_instance", "xcom"],
        1, "The serialized_dag table stores the JSON the scheduler reads.", "hard")
    ],
    "metadata-db": [
      q("The metadata DB is best described as…",
        ["A cache", "The single source of truth for all state", "A log store", "A message broker"],
        1, "Runs, task states, XComs, connections, variables, pools — all live here.", "easy"),
      q("If the scheduler restarts mid-run…",
        ["The run is lost", "It reads the DB and resumes where it left off", "All tasks retry", "The DAG re-parses only"],
        1, "Because state is in the DB, components are stateless and resume cleanly.", "med"),
      q("The web UI / API server relative to the DB is mostly…",
        ["Write-only", "A reader of state", "A broker", "A parser"],
        1, "The UI queries the DB to show runs, states, and logs; it owns no state itself.", "med")
    ],
    callbacks: [
      q("on_failure_callback fires when a task…",
        ["Starts", "Fails after exhausting retries", "Is queued", "Is parsed"],
        1, "It runs on final failure — commonly to alert the owning team.", "easy"),
      q("sla_miss_callback fires…",
        ["On the task", "On the DAG when a task misses its SLA", "On the worker", "On parse"],
        1, "SLA misses are reported at the DAG level with the list of missed tasks.", "hard"),
      q("Callbacks are most often used for…",
        ["Parsing", "Alerting / reacting to state changes", "Scheduling", "Encryption"],
        1, "They hook state transitions to notifications or cleanup.", "easy")
    ],
    templating: [
      q("{{ ds }} renders to…",
        ["A random id", "The logical date as YYYY-MM-DD", "The pod name", "The pool"],
        1, "ds is the run's logical date, templated in at runtime.", "easy"),
      q("Jinja in operator fields is rendered…",
        ["At parse time", "At task runtime", "At deploy", "Never"],
        1, "Templated fields render when the task runs, with the run context.", "med"),
      q("template_fields on an operator declares…",
        ["Its retries", "Which attributes get Jinja-rendered", "Its pool", "Its queue"],
        1, "Only fields listed in template_fields are treated as templates.", "hard")
    ],
    priority: [
      q("A higher priority_weight means the task…",
        ["Runs later", "Is picked first when slots are contended", "Retries more", "Skips validation"],
        1, "Under contention, higher weight wins the next free slot.", "med"),
      q("The default weight_rule is…",
        ["upstream", "downstream", "absolute", "random"],
        1, "By default a task's weight includes its downstream tasks (downstream rule).", "hard"),
      q("priority_weight only matters when…",
        ["The DAG parses", "Tasks compete for limited slots", "Logs are written", "A sensor pokes"],
        1, "With free capacity everything runs; weight decides order only under contention.", "med")
    ],
    connections: [
      q("A conn_id resolves to…",
        ["A pool", "Stored credentials + endpoint for a system", "A DAG", "A log path"],
        1, "Operators/hooks look up a Connection by conn_id to reach external systems.", "easy"),
      q("A typical secrets lookup order is…",
        ["DB → env → backend", "Secrets backend → env var → metadata DB", "Env only", "Random"],
        1, "A configured secrets backend is checked first, then env vars, then the DB.", "hard"),
      q("Connection passwords are stored…",
        ["In plaintext", "Fernet-encrypted at rest", "In the DAG file", "In logs"],
        1, "The Fernet key encrypts sensitive connection fields in the DB.", "med")
    ],
    variables: [
      q("Variables vs Params differ in scope: Variables are…",
        ["Per-run", "Global (deployment-wide)", "Per-task only", "Encrypted always"],
        1, "Variables are global config; Params are per-DAG-run inputs.", "med"),
      q("In a template, a Variable is read as…",
        ["{{ ds }}", "{{ var.value.my_key }}", "{{ ti.xcom }}", "{{ pool }}"],
        1, "{{ var.value.<key> }} (or var.json) pulls a Variable at runtime.", "hard"),
      q("Variables marked sensitive are…",
        ["Logged", "Encrypted and masked", "Ignored", "Shared to XCom"],
        1, "Sensitive Variables are Fernet-encrypted and masked in the UI/logs.", "med")
    ],
    retries: [
      q("With exponential backoff, the delay before a retry is…",
        ["Always retry_delay", "retry_delay × 2^(try-1)", "retry_delay ÷ try", "Random"],
        1, "Backoff doubles each attempt, capped by max_retry_delay.", "med"),
      q("Between attempts a failed-but-retryable task is…",
        ["failed", "up_for_retry", "skipped", "success"],
        1, "It sits up_for_retry until the delay elapses and it's rescheduled.", "easy"),
      q("max_retry_delay exists to…",
        ["Add retries", "Cap the exponential delay so waits don't grow unbounded", "Disable retries", "Set the pool"],
        1, "It bounds the doubling so a task doesn't wait hours between tries.", "hard")
    ],
    logging: [
      q("Each retry's log is separated by…",
        ["dag_id", "try_number", "pool", "queue"],
        1, "Every attempt writes its own file (1.log, 2.log, …).", "easy"),
      q("Remote logging (S3/GCS) matters because…",
        ["It's faster to write", "Logs survive worker/pod termination", "It encrypts tasks", "It reduces retries"],
        1, "On Kubernetes especially, local logs vanish with the pod — remote storage keeps them.", "med"),
      q("The default handler writes logs to…",
        ["The DB", "BASE_LOG_FOLDER on the worker filesystem", "Redis", "The API server"],
        1, "FileTaskHandler writes under BASE_LOG_FOLDER before optional remote upload.", "med")
    ],
    monitoring: [
      q("The single most critical metric to alert on is…",
        ["log size", "scheduler heartbeat staleness", "number of DAGs", "pod count"],
        1, "If the scheduler heartbeat goes stale, nothing new is scheduled.", "med"),
      q("airflow.task.failed should alert at…",
        ["100+", "Any non-zero spike in prod", "Only at 0", "Never"],
        1, "Task failures in a production pipeline warrant an immediate look.", "easy"),
      q("Airflow emits metrics via…",
        ["Only logs", "StatsD or OpenTelemetry", "XCom", "The DAG file"],
        1, "StatsD (or OTel from 2.7+) feeds Prometheus/Grafana.", "med")
    ],
    security: [
      q("The Fernet key encrypts…",
        ["Logs", "Connection passwords and sensitive variables", "DAG code", "Pool names"],
        1, "Fernet secures sensitive fields at rest in the metadata DB.", "med"),
      q("Which is NOT a built-in RBAC role?",
        ["Admin", "Viewer", "Op", "Deployer"],
        3, "The built-ins are Admin, Op, User, Viewer, Public — there is no 'Deployer'.", "hard"),
      q("Airflow 3's Auth Manager owns…",
        ["Only login", "Both authentication and authorization", "Logging", "Scheduling"],
        1, "The pluggable Auth Manager handles who you are and what you may do.", "med")
    ],
    cli: [
      q("To debug a single task with real context, run…",
        ["airflow dags list", "airflow tasks test <dag> <task> <date>", "airflow db reset", "airflow info"],
        1, "tasks test runs one task in-process without recording state.", "easy"),
      q("airflow db migrate does…",
        ["Deletes the DB", "Applies schema migrations on upgrade", "Backs up logs", "Adds users"],
        1, "It runs Alembic migrations (replacing 2.x db upgrade).", "med"),
      q("In Airflow 3 the command is…",
        ["airflow webserver", "airflow api-server", "airflow ui", "airflow serve"],
        1, "3.x unifies UI + REST behind api-server.", "med")
    ],
    performance: [
      q("The most common real-world bottleneck is…",
        ["Log writing", "Expensive DAG parsing", "XCom size", "UI rendering"],
        1, "Slow parsing starves everything downstream; fix it first.", "med"),
      q("PgBouncer is added to…",
        ["Cache DAGs", "Pool DB connections so Postgres isn't overwhelmed", "Store logs", "Run tasks"],
        1, "It multiplexes many client connections onto a small server pool.", "hard"),
      q("[core] parallelism sets…",
        ["Parse threads", "The cluster-wide cap on running task instances", "Retry count", "Pool size"],
        1, "It's the global ceiling on concurrently running tasks.", "med")
    ],
    "ha-setup": [
      q("To run schedulers HA you must…",
        ["Configure a leader election", "Just run 2+ — DB row locks coordinate them", "Add a load balancer", "Disable catchup"],
        1, "Active-active schedulers need no special config beyond running more than one.", "med"),
      q("The one truly stateful thing to protect/back up is…",
        ["The workers", "The metadata database", "The triggerer", "The logs"],
        1, "Everything else is recreatable; the DB holds all operational state.", "easy"),
      q("PgBouncer in HA primarily prevents…",
        ["Slow parsing", "Database connection exhaustion", "XCom bloat", "Pod eviction"],
        1, "At scale, many components exhaust Postgres connections without pooling.", "hard")
    ],
    kubernetes: [
      q("The KubernetesExecutor launches…",
        ["One pod per DAG", "One fresh pod per task instance", "A shared worker pool", "No pods"],
        1, "Each task gets its own isolated pod.", "easy"),
      q("Its main downside is…",
        ["No isolation", "Per-task pod startup latency", "Shared memory", "No autoscaling"],
        1, "Seconds of pod startup per task hurt for many tiny tasks.", "med"),
      q("executor_config with pod_override lets one task…",
        ["Skip retries", "Request more memory/CPU or a different image", "Change the schedule", "Disable logging"],
        1, "It overrides the pod spec for that single task instance.", "hard")
    ],
    celery: [
      q("Common Celery brokers are…",
        ["Postgres/MySQL", "Redis/RabbitMQ", "S3/GCS", "Kafka only"],
        1, "Celery distributes tasks via a Redis or RabbitMQ broker.", "easy"),
      q("You steer a task to specific hardware via its…",
        ["pool", "queue", "priority_weight", "owner"],
        1, "Workers subscribe to queues (-Q); set a task's queue to route it.", "med"),
      q("Warm Celery workers give you…",
        ["Perfect isolation", "Near-zero per-task startup latency", "Per-task images", "No idle cost"],
        1, "Long-lived workers pick up tasks instantly — Celery's edge over K8s for volume.", "med")
    ]
  };
})();
