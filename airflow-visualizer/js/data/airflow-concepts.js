/* ============================================================
   airflow-concepts.js — declarative content for the visualizer
   The architecture graph (nodes + edges), the animated flow steps,
   and per-component detail copy with Airflow 2.x vs 3.x callouts.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  AV.data.architecture = {
    viewBox: "0 0 960 500",

    // id, label, sub, x, y, w, h, color (token name)
    nodes: [
      { id: "dag",        label: "DAG File",      sub: "@dag · operators",   x: 40,  y: 30,  w: 170, h: 60, color: "airflow" },
      { id: "processor",  label: "DAG Processor", sub: "parse → serialize",  x: 40,  y: 150, w: 170, h: 60, color: "cyan" },
      { id: "api",        label: "API Server",    sub: "UI · REST (3.x)",    x: 40,  y: 390, w: 170, h: 60, color: "cyan" },
      { id: "scheduler",  label: "Scheduler",     sub: "SchedulerJob loop",  x: 395, y: 30,  w: 175, h: 64, color: "airflow" },
      { id: "executor",   label: "Executor",      sub: "queues task work",   x: 395, y: 150, w: 175, h: 60, color: "green" },
      { id: "queue",      label: "Queue / Broker",sub: "Celery · Kubernetes",x: 395, y: 258, w: 175, h: 54, color: "yellow" },
      { id: "metadb",     label: "Metadata DB",   sub: "source of truth",    x: 395, y: 388, w: 175, h: 72, color: "purple" },
      { id: "logs",       label: "Logs",          sub: "task output",        x: 755, y: 30,  w: 170, h: 54, color: "muted" },
      { id: "worker",     label: "Worker",        sub: "runs task process",  x: 755, y: 150, w: 170, h: 60, color: "green" },
      { id: "task",       label: "Task Instance", sub: "execute()",          x: 755, y: 258, w: 170, h: 60, color: "airflow" },
      { id: "triggerer",  label: "Triggerer",     sub: "async deferrable",   x: 755, y: 388, w: 170, h: 60, color: "purple" }
    ],

    // [fromId, toId, meta?] — meta: { dir:"both", label, curve }.
    // Direction reflects data flow; "both" = read+write (double-headed).
    edges: [
      ["dag", "processor", { label: "parse" }],
      ["processor", "metadb", { label: "serialize" }],
      // Two-way, split into directed lanes so each direction reads clearly:
      ["metadb", "scheduler", { label: "reads serialized DAGs", curve: -340, labelT: 0.34 }],
      ["scheduler", "metadb", { label: "writes runs & TIs", curve: 230, labelT: 0.30 }],
      ["scheduler", "executor", { label: "hand off" }],
      ["executor", "queue", { label: "enqueue" }],
      ["queue", "worker", { label: "pull" }],
      ["worker", "task", { label: "execute" }],
      ["task", "metadb", { label: "report" }],
      ["task", "logs", { label: "write", curve: 235 }],
      ["api", "metadb", { dir: "both", label: "read / write" }],
      ["triggerer", "metadb", { dir: "both", label: "poll / resume" }]
    ],

    // The narrated request/scheduling flow. Driven by the AnimationEngine;
    // each step lights up nodes + edges and updates the detail panel.
    steps: [
      { label: "1 · Author a DAG", nodes: ["dag"], edges: [], code: true,
        what: "An engineer writes a DAG file using the TaskFlow API (<code>@dag</code>/<code>@task</code>) or classic operators. It's just Python — a declarative graph of tasks and dependencies. Nothing runs yet.",
        why: "Describing work separately from running it is Airflow's founding idea: the same definition can be scheduled, retried, backfilled, and visualized without you re-issuing commands.",
        how: "The file defines a <code>DAG</code> object with tasks and wires their order (<code>extract &gt;&gt; transform &gt;&gt; load</code>). Saving it does nothing on its own — it's inert until Airflow parses it.",
        when: "Authored once (and edited over time); everything downstream keys off this definition.",
        mistake: "Expecting a task to run the moment you write it. The DAG file is a <i>plan</i>; execution only begins after parsing, scheduling, and a worker picking it up.",
        interview: "A grounding question: “what <i>is</i> a DAG?” A declarative, acyclic graph of tasks — code that describes work, not code that does the work inline.",
        example: "A ShopKart engineer writes <code>ecommerce_daily_ops.py</code> declaring 13 nightly steps and the rule that <code>extract_orders</code> precedes <code>reconcile_payments</code>." },

      { label: "2 · Parse the file", nodes: ["processor"], edges: [["dag", "processor"]],
        what: "The <b>DAG Processor</b> (a standalone process in Airflow 3.x) imports the file on a schedule, running the Python top-level code to build the DAG object in memory.",
        why: "Airflow has to turn your file into a structure it can schedule, and it must do so without the scheduler ever importing risky user code. A dedicated processor is that firewall.",
        how: "On each cycle the processor imports the module, collects the DAG objects it defines, and captures any import errors per file so one bad DAG doesn't break the rest.",
        when: "Repeatedly, on the parse interval (<code>min_file_process_interval</code>), for as long as the file exists.",
        mistake: "Putting heavy work at the top level — it re-runs on <i>every</i> parse and quietly throttles the whole processor.",
        interview: "The perennial performance question. Keep top-level code cheap and defer I/O into tasks. Interviewers ask this to see if you've felt real parsing pain.",
        example: "ShopKart's processor imports <code>ecommerce_daily_ops.py</code> every parse cycle, rebuilding the 13-task graph in milliseconds because the top level is trivial." },

      { label: "3 · Serialize to the DB", nodes: ["processor", "metadb"], edges: [["processor", "metadb"]],
        what: "The parsed DAG is <b>serialized to JSON</b> and stored in the metadata DB. The scheduler and UI read this serialized form — they never import your Python file directly.",
        why: "A JSON snapshot in the DB decouples every reader from your code, which is what keeps scheduling fast and the UI safe from slow or broken imports.",
        how: "The processor writes one <code>serialized_dag</code> row per DAG, rewriting it only when the file changes. Values that aren't JSON-serializable fail here, at serialize time.",
        when: "After each parse where the DAG's content changed.",
        mistake: "Expecting an edit to take effect instantly. Until this row is rewritten, the scheduler and UI keep using the previous serialized version.",
        interview: "Interviewers use this to test the parse-vs-serve split — and the “why won't my change apply?” puzzle traces straight back to this row.",
        example: "ShopKart's DAG lands as ~8&nbsp;KB of JSON in <code>serialized_dag</code>; that's the copy the scheduler reads all night, not the <code>.py</code>." },

      { label: "4 · Scheduler evaluates", nodes: ["scheduler", "metadb"], edges: [["metadb", "scheduler"], ["scheduler", "metadb"]],
        what: "The <b>Scheduler</b> loop <b>reads</b> serialized DAGs and task states from the DB, checks timetables, then <b>writes</b> a new DAG run plus task instances in <span class='state-chip scheduled'>scheduled</span>.",
        why: "This is where time becomes work. The timetable — not a wall clock — decides when an interval closes, which is what makes Airflow's batch model precise and backfillable.",
        how: "For each active DAG it compares the last interval to now; if a fresh interval has closed it inserts the run and task-instance rows, bounded by <code>max_active_runs_per_dag</code>. Those two directions are the read and write on its DB link.",
        when: "Every loop (default heartbeat 5&nbsp;s), continuously.",
        mistake: "Confusing the timetable firing with tasks starting. Creating the run only makes task instances <i>eligible</i> — later gates still decide when they run.",
        interview: "A classic: “when does a daily DAG for Jan 15 run?” At the <i>end</i> of the interval (early Jan 16), because a run represents a completed interval.",
        example: "At 02:00 ShopKart's scheduler sees the daily interval has closed and writes the run with all 13 tasks in <span class='state-chip scheduled'>scheduled</span>." },

      { label: "5 · Hand off to the executor", nodes: ["scheduler", "executor"], edges: [["scheduler", "executor"]],
        what: "For tasks whose dependencies are met, the scheduler asks the <b>Executor</b> to run them, and the task instance moves to <span class='state-chip queued'>queued</span>.",
        why: "Separating the decision (scheduler) from the placement (executor) is what lets Airflow swap execution backends and scale workers without touching scheduling logic.",
        how: "The scheduler passes runnable TIs to the configured executor — Local, Celery, or Kubernetes — which is responsible for finding them compute. The scheduler's job for that task ends here.",
        when: "Each loop, right after the examine phase selects runnable tasks.",
        mistake: "Believing the scheduler runs tasks. A slow task never slows the scheduler; if work isn't starting, look at the executor and workers.",
        interview: "Know the boundary: scheduler = <i>what/when</i>, executor + workers = <i>where/how</i>. Interviewers probe it to check you understand why Airflow scales.",
        example: "ShopKart's three extract tasks clear their (empty) dependencies immediately and move to <span class='state-chip queued'>queued</span> as the scheduler hands them to Celery." },

      { label: "6 · Enqueue the work", nodes: ["executor", "queue"], edges: [["executor", "queue"]],
        what: "Distributed executors (Celery, Kubernetes) push the run command onto a <b>broker/queue</b>. The LocalExecutor skips this and forks a subprocess directly.",
        why: "A queue decouples “work exists” from “a worker is free,” letting you scale workers independently and route different work to different pools.",
        how: "Celery enqueues onto Redis/RabbitMQ; Kubernetes asks the API to schedule a pod. Named queues let you send heavy tasks to beefy workers and light tasks elsewhere.",
        when: "Immediately after the executor accepts a task — for distributed executors only.",
        mistake: "Assuming every setup has a broker. LocalExecutor has none, so “check the broker” advice is meaningless there.",
        interview: "“Walk the path from scheduled to running.” Mentioning the broker step (and that Local skips it) shows you know the executors differ concretely.",
        example: "ShopKart routes the memory-heavy <code>transform_sales</code> to a <code>high_mem</code> queue while the light extracts wait in <code>default</code>." },

      { label: "7 · Worker picks it up", nodes: ["queue", "worker"], edges: [["queue", "worker"]],
        what: "A <b>Worker</b> pulls the task from the queue and prepares to run it in an isolated process.",
        why: "Isolating each task in its own process means one task's crash, hang, or memory blow-up can't take down the worker or its neighbors.",
        how: "The worker (a Celery process or a fresh K8s pod) claims the message, then launches a supervised task process — it doesn't run your code inline.",
        when: "As soon as a worker has a free slot and the task is at the head of its queue.",
        mistake: "A task stuck in <span class='state-chip queued'>queued</span> means no free worker slots or a broker issue — not a bug in the DAG.",
        interview: "“Why is my task queued but not running?” Workers are saturated or the broker is unreachable — an operations answer, not a code one.",
        example: "A free ShopKart Celery worker on the <code>high_mem</code> queue claims <code>transform_sales</code> and spins up its task process." },

      { label: "8 · Task executes", nodes: ["worker", "task"], edges: [["worker", "task"]],
        what: "The worker runs the <b>task instance</b> — your operator's <code>execute()</code>. State becomes <span class='state-chip running'>running</span> and stays alive via heartbeats.",
        why: "This is the one moment your actual code runs. Everything before it existed to get exactly this code to the right place, at the right time, exactly once.",
        how: "The supervised process imports your file, reconstructs the operator, calls <code>execute(context)</code>, and heartbeats to the DB so Airflow knows it's alive. The return value becomes an XCom.",
        when: "For the full duration of a single task attempt.",
        mistake: "Non-idempotent task code (appending rows, using <code>now()</code>) that corrupts data when a retry runs it twice.",
        interview: "“Where does your DAG code actually execute?” On the worker, at runtime, in a supervised process — never on the scheduler.",
        example: "ShopKart's <code>transform_sales</code> reads the extracts, computes daily totals, and returns the output path — heartbeating throughout its 8-minute run." },

      { label: "9 · Report state, logs & XCom", nodes: ["task", "metadb", "logs"], edges: [["task", "metadb"], ["task", "logs"]],
        what: "On completion the task records <span class='state-chip success'>success</span>/<span class='state-chip failed'>failed</span>, writes its logs, and pushes any XCom.",
        why: "Results and logs must be durable and visible or downstream scheduling and debugging break. Persisting them lets the pipeline move forward and lets you diagnose failures later.",
        how: "The supervisor writes the final <code>task_instance</code> state, flushes logs to their store (often S3/GCS), and saves XCom. <b>Airflow 3.x:</b> tasks report through the <b>API server</b> (Task Execution API), not a direct DB connection.",
        when: "The moment the attempt finishes, for that <code>try_number</code>.",
        mistake: "Pushing large data through XCom. It's a small-value channel (IDs, counts, paths) — big payloads belong in external storage.",
        interview: "The 3.x change is a strong signal: tasks no longer touch the DB directly; they go through the API server, tightening security and isolation.",
        example: "ShopKart's transform writes <span class='state-chip success'>success</span>, ships its log to S3, and pushes the output path as XCom for the load task." },

      { label: "10 · Deferred? Triggerer", nodes: ["triggerer", "metadb"], edges: [["triggerer", "metadb"]],
        what: "A deferrable task releases its worker slot and hands a trigger to the <b>Triggerer</b>, which watches the condition asynchronously and resumes the task when it fires.",
        why: "Waiting shouldn't cost a whole worker. Offloading the wait to one async process lets thousands of “wait for X” tasks share a single triggerer instead of each pinning a slot.",
        how: "The task calls <code>self.defer()</code> with a trigger and frees its slot. The triggerer runs those triggers on an asyncio loop; when one fires, the task is rescheduled to finish on a worker.",
        when: "Whenever a deferrable operator or sensor is waiting on an external condition.",
        mistake: "Using a classic <code>poke</code>-mode sensor that holds a worker slot for hours, instead of a deferrable one that frees it.",
        interview: "“How do you wait for a file without wasting a worker?” Deferrable operators + the triggerer — the modern, slot-efficient answer.",
        example: "ShopKart's inventory sensor defers until a warehouse file lands anytime between 2–6&nbsp;AM; the triggerer watches while no worker sits idle." },

      { label: "11 · Observe in the UI", nodes: ["api", "metadb"], edges: [["api", "metadb"]],
        what: "The <b>API Server</b> (the 3.x successor to the webserver) reads state from the metadata DB so the Grid, Graph, and logs reflect exactly what happened.",
        why: "A single source of truth means the UI never guesses — everything you see is a faithful query of recorded state, and the UI can't corrupt it.",
        how: "Opening a DAG queries <code>serialized_dag</code> for structure and <code>task_instance</code>/<code>dag_run</code> for state; logs resolve from their store. Manual actions write requests the scheduler later enacts.",
        when: "On every dashboard load and API call.",
        mistake: "Thinking the UI “does” the work. Clicking <i>clear</i> or <i>mark success</i> writes state the scheduler acts on — the UI reflects and requests, it doesn't execute.",
        interview: "A tidy closer: the whole architecture is readers and writers around one DB. The API server is a reader that also brokers task access in 3.x.",
        example: "At 07:00 ShopKart's COO opens the Grid and sees every task green — the API server answered purely from the metadata DB." }
    ],

    // Per-node detail shown when a node is clicked. Each has a plain-language
    // explanation, a "what it does / checks" list, and a ShopKart business tie-in.
    detail: {
      dag: {
        title: "DAG File",
        plain: "A plain Python file that describes <b>what</b> work to do and in what order — the recipe, not the cooking. Writing it doesn't run anything; it just defines the plan.",
        checksLabel: "What it defines",
        checks: [
          "Which tasks exist (extract, validate, load…)",
          "The order and dependencies between them",
          "The schedule — e.g. every day at 2 AM",
          "Defaults: retries, timeouts, owner, alerts"
        ],
        business: "ShopKart's <code>ecommerce_daily_ops.py</code> declares the 13 steps of the nightly pipeline and the rule that <code>extract_orders</code> must finish before <code>reconcile_payments</code> may start."
      },
      processor: {
        title: "DAG Processor",
        plain: "Reads your DAG files on a loop, runs the Python to build the task graph, and saves a tidy JSON copy to the database — so nothing else ever has to re-read your code.",
        checksLabel: "What it constantly does",
        checks: [
          "Scan the DAG folder for new or changed files",
          "Import each file and build its task graph",
          "Serialize that graph to JSON",
          "Write it to the metadata DB",
          "Surface any import errors in the UI"
        ],
        business: "When a ShopKart engineer adds an <code>extract_tiktok_ads</code> task and pushes it, the processor notices the changed file within seconds and makes the new step visible to the scheduler and UI — no restart needed.",
        note: { v: "3.x", text: "Runs as its own process, isolated from the scheduler. In 2.x this was a subprocess of the scheduler." }
      },
      api: {
        title: "API Server",
        plain: "The window humans and tools use to <b>see and control</b> Airflow — the web UI and REST API. It only reads and writes the database; it never runs your tasks itself.",
        checksLabel: "What it serves",
        checks: [
          "The Grid / Graph views of every run",
          "Task logs on demand",
          "Manual actions: trigger, pause, clear, mark success",
          "The REST API for scripts and CI",
          "(3.x) the Task Execution API workers report through"
        ],
        business: "At 7 AM the ShopKart COO opens the dashboard; behind it the API Server answers “did last night's run succeed?” by querying the metadata DB. If an analyst clicks “clear task”, it records that request for the scheduler to act on.",
        note: { v: "3.x", text: "Replaces the 2.x 'webserver'. It also brokers task-to-DB access so task code never touches the DB directly." }
      },
      scheduler: {
        title: "Scheduler",
        plain: "The always-running <b>brain</b>. Every few seconds it looks at what's due and pushes work forward — deciding what runs next and handing it to the executor. It does no task work itself.",
        checksLabel: "What it constantly checks",
        checks: [
          "Is a schedule due — should a new DAG run be created?",
          "Which tasks are ready to run?",
          "Are each task's upstream dependencies satisfied?",
          "Did running tasks finish — success or failed?",
          "Are any failed tasks due for a retry?",
          "Are pool / concurrency slots free?"
        ],
        business: "For ShopKart, at 02:00 the scheduler sees the daily schedule is due and creates the run. The moment <code>extract_orders</code>, <code>extract_payments</code> and <code>extract_marketing</code> finish, it notices <code>validate_data</code>'s dependencies are met and queues it — no human touches anything.",
        note: { v: "HA", text: "Can run active-active (multiple schedulers) so one crash never stalls the 2 AM run — they coordinate via row-level DB locks." }
      },
      executor: {
        title: "Executor",
        plain: "The <b>dispatcher</b>. When the scheduler says “run this task”, the executor decides <b>where</b> it runs and sends it there — a local process, a Celery worker, or a Kubernetes pod.",
        checksLabel: "What it does",
        checks: [
          "Take queued tasks from the scheduler",
          "Place each on the right worker or queue",
          "Track how many run vs. how many slots are free",
          "Report finished / failed back to the scheduler"
        ],
        business: "On a heavy ShopKart night the executor fans the four extract tasks out to four workers at once, so extraction finishes in ~6 minutes instead of ~24 — keeping the run on track for the 7 AM deadline.",
        note: { v: "3.x", text: "Multiple executors can run side by side in one deployment (e.g. Celery for light tasks, Kubernetes for heavy ones)." }
      },
      queue: {
        title: "Queue / Broker",
        plain: "A <b>waiting line</b> (Redis or RabbitMQ) that holds tasks until a worker is free to pick them up. Used by the Celery and Kubernetes executors; the Local executor skips it entirely.",
        checksLabel: "What it holds",
        checks: [
          "Tasks waiting for a free worker",
          "Which named queue each task belongs to (default, gpu…)",
          "The order and priority of pending work"
        ],
        business: "ShopKart routes the memory-heavy <code>transform_sales</code> task to a <code>high_mem</code> queue so only big-memory workers pick it up, while the light extracts wait in the <code>default</code> queue."
      },
      metadb: {
        title: "Metadata Database",
        plain: "The <b>single source of truth</b> (Postgres/MySQL). Every run, task state, XCom, connection, variable and pool lives here. If any component restarts, it reads the DB and continues exactly where it left off.",
        checksLabel: "What it stores",
        checks: [
          "Every DAG run and its status",
          "Every task instance's state, tries, and timing",
          "XComs, Connections, Variables, Pools",
          "The serialized DAG JSON the scheduler reads"
        ],
        business: "If ShopKart's scheduler pod crashes mid-run at 2:15 AM, a fresh scheduler reads the metadata DB and resumes — no orders are double-processed and nothing is lost."
      },
      logs: {
        title: "Task Logs",
        plain: "The <b>per-attempt record</b> of what each task printed — stdout, errors, and your <code>logging</code> calls. Written on the worker and usually shipped to S3/GCS so it survives.",
        checksLabel: "What it captures",
        checks: [
          "Everything a task printed, per <code>try_number</code>",
          "Timestamps and the task's identity",
          "A separate log file for each retry"
        ],
        business: "When ShopKart's <code>reconcile_payments</code> flags 12 unmatched orders, an engineer opens that task's log for the exact IDs — and because logs go to S3, they're still there after the worker pod is gone."
      },
      worker: {
        title: "Worker",
        plain: "The <b>muscle</b> — the process that actually runs your task's code and talks to the real systems (databases, APIs). Workers scale out horizontally for more throughput.",
        checksLabel: "What it does",
        checks: [
          "Pull a task from the queue",
          "Run the task's code in an isolated process",
          "Send heartbeats so it's known to be alive",
          "Write results and final state back"
        ],
        business: "A ShopKart worker is what actually connects to the payment platform, downloads yesterday's transactions, and writes them out. The scheduler only decided it should happen — the worker did the work."
      },
      task: {
        title: "Task Instance",
        plain: "One specific task, for one specific run, on one specific date — the <b>atomic unit</b> Airflow tracks. It walks a state machine and owns its own logs and retries.",
        checksLabel: "What it tracks",
        checks: [
          "Its state: scheduled → queued → running → success/failed",
          "Which <code>try_number</code> it is on",
          "Start / end time and duration",
          "The XCom value it returned"
        ],
        business: "<code>extract_orders</code> for 2024-01-15 is one task instance; the same task for Jan 16 is a different one. If Jan 15's fails, only that instance retries — Jan 16 is untouched."
      },
      triggerer: {
        title: "Triggerer",
        plain: "The <b>efficient waiter</b>. When a task just needs to <i>wait</i> for something (a file to land, a time to pass), the triggerer watches thousands of those waits on one async process so workers aren't tied up doing nothing.",
        checksLabel: "What it does",
        checks: [
          "Take over 'deferred' waits from workers",
          "Watch many conditions at once, asynchronously",
          "Wake the task the moment its condition is met",
          "Free the worker slot during the whole wait"
        ],
        business: "ShopKart's inventory sensor waits for a warehouse file that can arrive anytime between 2 and 6 AM. Instead of a worker sitting idle for hours, the triggerer watches for it and releases the task the instant it lands."
      }
    }
  };
})();
