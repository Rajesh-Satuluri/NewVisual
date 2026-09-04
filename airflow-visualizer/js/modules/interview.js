/* ============================================================
   modules/interview.js — interview Q&A
   Interactive: category filter + expandable question cards.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var QA = [
    // ---- Fundamentals ----
    ["fundamentals", "What is the difference between an Operator, a Task, and a Task Instance?",
     "An <b>Operator</b> is a template for a unit of work (e.g. <code>PythonOperator</code>). Instantiating it inside a DAG creates a <b>Task</b> — a node in the graph. When a DAG runs for a specific logical date, each task produces a <b>Task Instance</b> — the concrete, stateful execution that moves through the state machine and gets a <code>try_number</code>."],
    ["fundamentals", "What does it mean that a DAG file must be \"import-safe\"?",
     "The scheduler re-imports every DAG file on each parse loop. Any code at the <i>top level</i> of the file runs every time — so a network call, a heavy computation, or a slow import at module scope stalls parsing for all DAGs. Keep top-level code trivial; put real work inside task callables."],
    ["fundamentals", "What exactly is a DAG, and why must it be acyclic?",
     "A <b>DAG</b> (Directed Acyclic Graph) is the pipeline definition — a set of tasks plus their dependency edges. <b>Directed</b>: edges point downstream. <b>Acyclic</b>: no task may depend, directly or transitively, on itself. The scheduler resolves execution order by walking the graph topologically; a cycle would have no valid starting point and could never complete, so Airflow rejects a cyclic DAG at parse time."],
    ["fundamentals", "TaskFlow API vs classic operators — when do you use each?",
     "The <b>TaskFlow API</b> (<code>@task</code>) lets you write plain Python functions; Airflow wires XComs automatically from return values and arguments, so the DAG reads like normal code. <b>Classic operators</b> (<code>BashOperator</code>, provider operators like <code>S3ToRedshiftOperator</code>) are explicit templates ideal for integrations with external systems. Real DAGs mix both: TaskFlow for Python glue, provider operators for system I/O."],
    ["fundamentals", "Why does Airflow require tasks to be idempotent?",
     "Tasks get retried, cleared, and backfilled — the same task instance can execute more than once. If re-running produces duplicate rows or corrupt state, retries become dangerous. An <b>idempotent</b> task yields the same result whether it runs once or five times — e.g. it deletes the target partition before inserting, or uses <code>MERGE</code>/upsert keyed on <code>logical_date</code>. Idempotency is what makes retries and backfills safe."],
    ["fundamentals", "What is the metadata database and what does it store?",
     "The <b>metadata DB</b> (Postgres/MySQL) is Airflow's single source of truth. It holds DAG-run and task-instance state, the serialized DAG structure, XComs, Connections, Variables, Pools, and the scheduler/triggerer heartbeats. Every component reads and writes it; lose it and you lose all run history and state. Everything else — schedulers, workers, API servers — is stateless and recreatable."],

    // ---- Architecture ----
    ["architecture", "Walk me through the components of an Airflow deployment.",
     "<b>Scheduler</b>: parses DAGs, creates runs, and decides which task instances are ready. <b>Executor</b>: hands ready tasks to compute (Local, Celery, or Kubernetes). <b>Workers</b>: actually run task code — a Celery pool or K8s pods. <b>Triggerer</b>: runs async triggers for deferrable tasks. <b>API server / webserver</b>: serves the UI and REST API. <b>Metadata DB</b>: the stateful source of truth. In Airflow 3 a separate <b>DAG processor</b> parses the files."],
    ["architecture", "What does the scheduler actually do on each loop?",
     "Every loop it asks the same questions against the metadata DB: <i>Are there new DAG runs to create</i> (has an interval elapsed)? <i>Which task instances have all upstream dependencies satisfied</i> and can move to <span class='state-chip scheduled'>scheduled</span>? <i>Are there free pool / parallelism slots</i> to enqueue them? <i>Did running tasks finish, fail, or time out</i>? <i>Are any retries due</i>? It never runs task code itself — it only changes state and hands ready tasks to the executor."],
    ["architecture", "What is the DAG processor and why was it separated from the scheduler?",
     "Parsing arbitrary user DAG code in the scheduler process is a reliability and security risk — a slow or broken file can stall all scheduling. Airflow isolates <b>DAG parsing</b> into a <b>DAG processor</b> that reads the files, serializes the DAG structure into the metadata DB, and lets the scheduler work purely from that serialized form. This shields the scheduler from user code and lets the UI render DAGs without importing them."],
    ["architecture", "Executor vs scheduler — what's the division of labour?",
     "The <b>scheduler</b> decides <i>what</i> should run and <i>when</i>: state transitions, dependency resolution, slot accounting. The <b>executor</b> decides <i>where</i> and <i>how</i> that work runs — it takes a queued task instance onto compute (a Celery worker, a K8s pod, a local subprocess) and reports the result back. Swapping executors changes the runtime substrate without touching your DAGs."],
    ["architecture", "How are task logs collected and shown in the UI?",
     "A task writes logs on whatever worker or pod runs it. The API server can't reach that local disk, so production uses <b>remote logging</b>: the worker ships logs to S3/GCS/ELK and the UI reads them back from there. Without remote logging, logs vanish when a Kubernetes pod is deleted. The log path is templated by DAG / run / <code>try_number</code>, so each attempt is separately retrievable."],

    // ---- Scheduling ----
    ["scheduling", "Explain logical_date vs the actual run time.",
     "<code>logical_date</code> (formerly <code>execution_date</code>) is the timestamp the run <i>represents</i> — the start of the data interval. A daily DAG for Jan 15 has <code>logical_date=2024-01-15</code> but actually executes at the <i>end</i> of that interval (early Jan 16). This is why Airflow is ideal for batch: it processes a completed interval."],
    ["scheduling", "What is catchup and why is it often disabled?",
     "With <code>catchup=True</code>, when a DAG is unpaused the scheduler creates a run for <i>every</i> missed interval from <code>start_date</code> to now. A DAG dormant for a year could spawn 365 runs at once — a stampede. Most teams set <code>catchup=False</code> and use explicit backfills for history."],
    ["scheduling", "catchup vs backfill — what's the difference?",
     "<b>catchup</b> is automatic: unpause a DAG with <code>catchup=True</code> and the scheduler creates runs for every missed interval since <code>start_date</code>. <b>backfill</b> is a deliberate, bounded CLI operation — <code>airflow dags backfill -s START -e END</code> — that you run to (re)process a specific historical window on demand. Most teams disable catchup and reach for explicit backfills."],
    ["scheduling", "How does data-aware (Asset/Dataset) scheduling work?",
     "Instead of a cron, a DAG can be scheduled on <b>Assets</b>. When an upstream task updates an asset it produces, Airflow triggers the downstream DAGs that consume it. This builds event-driven pipelines where a run happens because data is ready, not because a clock ticked."],
    ["scheduling", "What is a Timetable and when do you need a custom one?",
     "A <b>Timetable</b> is the object that decides a DAG's data intervals and next run; cron and <code>timedelta</code> schedules are built on timetables. You write a <b>custom timetable</b> when your cadence can't be expressed as cron — 'the last business day of each month', 'every weekday except holidays', or trading-session windows. It returns the <code>DataInterval</code> and the next scheduling boundary."],
    ["scheduling", "Explain depends_on_past and wait_for_downstream.",
     "<code>depends_on_past=True</code> holds a task instance until the <i>same task</i> in the <i>previous</i> DAG run succeeded — useful for stateful incremental loads that must run in order. <code>wait_for_downstream=True</code> is stronger: a task waits until the previous run's copy of it <i>and everything immediately downstream</i> has succeeded. Both serialize history and can stall a pipeline if an old run is stuck."],
    ["scheduling", "What does max_active_runs control, and why cap it?",
     "<code>max_active_runs</code> limits how many DAG runs of the same DAG can be <span class='state-chip running'>running</span> at once. During a catchup or manual backfill, without this cap dozens of runs could execute in parallel and overwhelm a shared source database or blow past API rate limits. Setting it to 1 forces runs to execute strictly one interval at a time."],

    // ---- Execution ----
    ["execution", "Compare the Celery and Kubernetes executors.",
     "<b>Celery</b>: a warm pool of long-lived workers pulling tasks from a broker (Redis/RabbitMQ) by queue. Near-zero startup latency; idle workers cost money; weaker isolation. <b>Kubernetes</b>: one fresh pod per task instance — perfect isolation and per-task resources, native autoscaling, but seconds of pod-startup latency per task. Combine both with the CeleryKubernetesExecutor."],
    ["execution", "What problem do deferrable operators and the triggerer solve?",
     "A classic sensor holds a worker slot the entire time it polls — 100 waiting sensors block 100 slots. A <b>deferrable</b> operator instead yields its slot and hands an async <b>trigger</b> to the <b>triggerer</b> process, which watches thousands of conditions on one event loop. When the condition fires, the task is rescheduled onto a worker."],
    ["execution", "How do tasks pass data, and what's the anti-pattern?",
     "Via <b>XCom</b> — a small key-value stored in the metadata DB, returned from one task and pulled by another. The anti-pattern is pushing <i>large</i> data (a DataFrame, a file) through XCom: it bloats the DB and is slow. Pass a pointer instead (an S3 path, a table name) and let the downstream task fetch it."],
    ["execution", "parallelism vs per-DAG concurrency vs max_active_runs — untangle them.",
     "Three different ceilings. <code>core.parallelism</code>: the cluster-wide cap on task instances running at once across <i>all</i> DAGs. <code>max_active_tasks_per_dag</code>: the cap for a <i>single</i> DAG. <code>max_active_runs</code>: how many <i>runs</i> of one DAG run concurrently. A task can be starved by any of the three, so when tasks sit in <span class='state-chip scheduled'>scheduled</span>, check all three — plus pools."],
    ["execution", "What is a Pool and when do you use one?",
     "A <b>Pool</b> caps concurrency against a <i>shared resource</i> rather than the whole cluster. If an external API tolerates only 5 concurrent calls, put its tasks in a pool with 5 slots; the scheduler queues the sixth until a slot frees. Pools cut across DAGs, so they're the right tool for protecting a fragile database, a licensed connector, or a rate-limited API."],
    ["execution", "How do you route tasks to specific workers?",
     "With the Celery executor each task has a <code>queue</code> and workers subscribe to queues (<code>airflow celery worker -q gpu,default</code>). Route heavy or specialised tasks (GPU jobs, high-memory ETL) to a dedicated queue served by appropriately-sized workers, and everyday tasks to a default queue. With the Kubernetes executor you instead attach a <code>pod_override</code> to request resources per task."],
    ["execution", "A Sensor can run in 'poke' or 'reschedule' mode — what's the difference?",
     "In <b>poke</b> mode (the default) the sensor holds its worker slot and re-checks on a fixed interval — low latency, but expensive on slots. In <b>reschedule</b> mode it releases the slot between checks and is re-queued each interval — freeing slots for long waits at the cost of scheduling overhead. For very long or numerous waits, prefer a <b>deferrable</b> sensor, which offloads the wait to the triggerer entirely."],

    // ---- Reliability ----
    ["reliability", "How do retries with exponential backoff behave?",
     "With <code>retries=3</code> and <code>retry_exponential_backoff=True</code>, a failed task waits <code>retry_delay × 2^(try-1)</code> before each retry (5m, 10m, 20m …), capped by <code>max_retry_delay</code>. It stays <span class='state-chip up-for-retry'>up-for-retry</span> between attempts and only becomes <span class='state-chip failed'>failed</span> after exhausting all retries."],
    ["reliability", "What is a zombie task and how is it handled?",
     "A task instance that shows <span class='state-chip running'>running</span> but whose worker has died (OOM, eviction) without reporting back. Its heartbeat goes stale; the scheduler's zombie detection reaps it after <code>scheduler_zombie_task_threshold</code>, marking it up-for-retry so <code>retries</code> can recover it."],
    ["reliability", "What is an SLA, and what happens on an SLA miss?",
     "An <b>SLA</b> is a deadline measured from the run's <code>logical_date</code>. If a task isn't done by then, Airflow records an <b>SLA miss</b> and fires <code>sla_miss_callback</code> (and can email). Crucially it does <i>not</i> fail or kill the task — it's an alerting signal that the pipeline is late, so on-call and downstream consumers can react. (SLA semantics have shifted across versions — know your target version.)"],
    ["reliability", "Walk through the task callbacks and when each fires.",
     "<code>on_execute_callback</code> when a task instance starts; <code>on_success_callback</code> when it succeeds; <code>on_retry_callback</code> on each retry; <code>on_failure_callback</code> when it fails <i>terminally</i> (after retries are exhausted); and at DAG level <code>sla_miss_callback</code> for lateness. Put alerting (Slack/PagerDuty) in <code>on_failure_callback</code>, not in the task body, so it fires even on unexpected errors."],
    ["reliability", "Explain trigger rules — the default and two useful non-defaults.",
     "A <b>trigger rule</b> decides when a task runs based on its upstreams' states. The default is <code>all_success</code>. <code>all_done</code> runs once every upstream finishes regardless of outcome — perfect for a cleanup or 'always send a report' task. <code>one_failed</code> fires the moment any upstream fails — ideal for an alert task. Others include <code>none_failed_min_one_success</code>, <code>all_failed</code>, and <code>always</code>."],
    ["reliability", "A task failed. How do you re-run just it and its downstream?",
     "Use <b>Clear</b> — in the UI select the failed task instance and clear it with 'Downstream' (and optionally 'Recursive') selected. Clearing resets those task instances to a cleared state and the scheduler re-runs them; upstream successes are untouched. From the CLI: <code>airflow tasks clear DAG -t TASK -d</code>. Because tasks are idempotent, re-running is safe."],
    ["reliability", "What's the difference between clearing a task and marking it success?",
     "<b>Clear</b> resets a task instance so the scheduler genuinely re-runs it, respecting dependencies — use it when the work must actually execute again. <b>Mark success</b> forces the state to <span class='state-chip success'>success</span> <i>without running anything</i> — use it to step past a task you've fixed by hand or that's known-good, so downstream tasks unblock. Marking success on a task that never ran can leave data gaps, so do it deliberately."],

    // ---- Operations ----
    ["ops", "How do you make an Airflow deployment highly available?",
     "Run <b>2+ active-active schedulers</b> (they coordinate via DB row-locking — no leader election), stateless <b>API servers behind a load balancer</b>, an autoscaled <b>worker fleet</b>, redundant <b>triggerers</b>, and an <b>HA metadata DB</b> fronted by <b>PgBouncer</b>. The metadata DB is the one true stateful dependency — protect and back it up."],
    ["ops", "The scheduler stopped creating tasks. How do you debug it?",
     "Check <code>scheduler.heartbeat</code> — if stale, the scheduler is down or blocked. A common cause is a slow DAG-parse loop from an expensive top-level import stalling the whole cycle. Also verify DB connectivity and that pools/parallelism aren't exhausted. Running multiple schedulers prevents a single failure from halting scheduling entirely."],
    ["ops", "DAG parsing is slow and the UI lags. How do you scale it?",
     "Move parsing off the scheduler with a dedicated <b>DAG processor</b>, raise <code>min_file_process_interval</code> so files aren't re-parsed too aggressively, and split giant DAG files (top-level cost is paid every parse). Keep top-level code import-cheap. For very large fleets, shard DAGs across multiple DAG processors and run <b>multiple schedulers</b> for throughput."],
    ["ops", "What is PgBouncer and why is it almost mandatory at scale?",
     "Every scheduler loop, worker, and triggerer opens DB connections; hundreds of workers can exhaust Postgres's connection limit and crush it. <b>PgBouncer</b> is a lightweight connection pooler that sits in front of the metadata DB and multiplexes many client connections onto a small pool of real ones. The official Helm chart ships it for exactly this reason."],
    ["ops", "How should secrets (DB passwords, API keys) be managed?",
     "Never hard-code them in DAGs. Store them as <b>Connections</b> and <b>Variables</b>, which Airflow encrypts at rest with a Fernet key. Better, configure a <b>secrets backend</b> (AWS Secrets Manager, GCP Secret Manager, Vault) so Airflow fetches secrets at runtime and they never live in the metadata DB at all. Scope access with the backend's IAM and rotate the Fernet key carefully."],
    ["ops", "How do you deploy DAG changes without downtime?",
     "DAGs are just files the scheduler picks up on its next parse, so deploys are rolling by nature: sync new files (git-sync sidecar, baked image, or shared volume) and the scheduler reloads them — no restart needed. Keep changes <b>backward-compatible</b> for in-flight runs, bump a DAG version rather than mutating history, and gate risky changes behind a paused DAG until validated with <code>airflow dags test</code>."],
    ["ops", "What do you monitor in a production Airflow?",
     "The <b>scheduler heartbeat</b> (stale = scheduling is dead), DAG-parse time, <b>task failure rate</b>, task duration vs baseline (SLA drift), pool <code>open_slots</code> and queued-task backlog, executor/worker health, the triggerer heartbeat, and metadata-DB connections/latency. Export via StatsD/Prometheus and alert on the heartbeat and failure-rate first — they catch the most damaging outages."],
    ["ops", "How do you upgrade Airflow safely?",
     "Read the release notes for breaking changes and provider bumps; upgrade in staging first; <b>back up the metadata DB</b>; then run <code>airflow db migrate</code> to apply schema migrations. Pause DAGs or drain in-flight runs during the migration window, upgrade schedulers/workers/API server to matching versions together, and validate with <code>airflow dags test</code> before unpausing."]
  ];

  var CATS = [
    ["all", "All"], ["fundamentals", "Fundamentals"], ["architecture", "Architecture"],
    ["scheduling", "Scheduling"], ["execution", "Execution"],
    ["reliability", "Reliability"], ["ops", "Operations"]
  ];

  var module = {
    id: "interview",
    title: "Interview Q&A",
    fullWidth: true,
    _root: null, _handler: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Interview Prep</div>' +
          '<h1 class="module-title">Interview Q&amp;A: the questions you\'ll actually be asked</h1>' +
          '<p class="module-subtitle">' + QA.length + " senior data-engineering questions across " + (CATS.length - 1) + " topics, probing how Airflow behaves under the hood. " +
          "Filter by topic, then click a question to reveal a complete, precise answer.</p>" +
        "</div>" +
        '<div class="qa-filters" id="qa-filters">' +
          CATS.map(function (c, i) {
            return '<button class="qa-chip' + (i === 0 ? " active" : "") + '" data-cat="' + c[0] + '">' + c[1] + "</button>";
          }).join("") +
        "</div>" +
        '<div class="qa-list" id="qa-list">' +
          QA.map(function (q, i) {
            return '<div class="qa-item" data-cat="' + q[0] + '">' +
              '<button class="qa-q" aria-expanded="false" data-idx="' + i + '">' +
                '<span class="qa-q-text">' + q[1] + "</span>" +
                '<span class="qa-toggle">+</span>' +
              "</button>" +
              '<div class="qa-a" hidden><p>' + q[2] + "</p></div>" +
            "</div>";
          }).join("") +
        "</div>";

      var root = container.querySelector("#qa-list");
      var filters = container.querySelector("#qa-filters");
      this._root = container;

      function onClick(e) {
        var q = e.target.closest(".qa-q");
        if (q) {
          var item = q.parentNode;
          var ans = item.querySelector(".qa-a");
          var open = q.getAttribute("aria-expanded") === "true";
          q.setAttribute("aria-expanded", open ? "false" : "true");
          ans.hidden = open;
          q.querySelector(".qa-toggle").textContent = open ? "+" : "−";
          item.classList.toggle("qa-open", !open);
          return;
        }
        var chip = e.target.closest(".qa-chip");
        if (chip) {
          filters.querySelectorAll(".qa-chip").forEach(function (c) { c.classList.remove("active"); });
          chip.classList.add("active");
          var cat = chip.getAttribute("data-cat");
          root.querySelectorAll(".qa-item").forEach(function (it) {
            it.hidden = cat !== "all" && it.getAttribute("data-cat") !== cat;
          });
        }
      }

      this._handler = onClick;
      container.addEventListener("click", onClick);
    },

    destroy: function () {
      if (this._root && this._handler) this._root.removeEventListener("click", this._handler);
      this._root = null; this._handler = null;
    }
  };

  AV.registerModule(module);
})();
