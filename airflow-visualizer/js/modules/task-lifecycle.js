/* ============================================================
   modules/task-lifecycle.js — what happens when one task runs
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var NODES = [
    { id: "scheduler", label: "Scheduler", sub: "queues the TI", x: 30, y: 40, w: 165, h: 60, color: "airflow" },
    { id: "executor", label: "Executor", sub: "launches command", x: 250, y: 40, w: 165, h: 60, color: "green" },
    { id: "ltj", label: "LocalTaskJob", sub: "supervises", x: 470, y: 40, w: 175, h: 60, color: "cyan" },
    { id: "proc", label: "Task process", sub: "runs execute()", x: 700, y: 40, w: 170, h: 60, color: "airflow" },
    { id: "db", label: "Metadata DB", sub: "heartbeats + state", x: 470, y: 210, w: 175, h: 60, color: "purple" }
  ];
  var EDGES = [
    ["scheduler", "executor"], ["executor", "ltj"], ["ltj", "proc"],
    ["proc", "ltj"], ["ltj", "db"], ["scheduler", "db"]
  ];

  var STEPS = [
    { label: "1 · Scheduler queues it", nodes: ["scheduler"], edges: [["scheduler", "executor"]],
      what: "The scheduler has decided this task instance should run and hands the command to the <b>executor</b>. Nothing is executing yet — this is pure orchestration.",
      why: "Separating “decide” from “run” is the whole reason Airflow scales: the scheduler stays lightweight while execution happens elsewhere, on swappable backends.",
      how: "The scheduler writes the TI to <span class='state-chip queued'>queued</span> and passes the run command to the configured executor (Local, Celery, or Kubernetes). It then moves on to other tasks.",
      when: "Once a task clears its dependency and concurrency gates.",
      mistake: "Thinking the scheduler runs the task. It never does — if tasks aren't <i>starting</i>, the executor/workers are the suspect, not the loop.",
      interview: "“Walk me through what happens after a task is scheduled.” Starting with the scheduler→executor handoff shows you know where the boundary is.",
      example: "ShopKart's scheduler queues <code>transform_sales</code> and immediately moves on to evaluate the next task — it doesn't wait around." },

    { label: "2 · Executor launches the command", nodes: ["executor", "ltj"], edges: [["executor", "ltj"]],
      what: "The executor runs <code>airflow tasks run &lt;dag&gt; &lt;task&gt; &lt;run_id&gt;</code>, which starts a <b>LocalTaskJob</b> — a small supervisor process.",
      why: "A supervisor sits between “the executor said go” and your code so someone can enforce timeouts, write heartbeats, and record the final state even if your task misbehaves.",
      how: "Depending on the executor the command runs as a local subprocess, a Celery task on a worker, or a fresh Kubernetes pod. Either way it launches a LocalTaskJob, not your code directly.",
      when: "As soon as a worker (or the local machine) accepts the queued task.",
      mistake: "Picturing the executor running <code>execute()</code> itself. It launches a supervisor process; your operator runs one layer deeper.",
      interview: "Bonus points for naming <b>LocalTaskJob</b> as the supervisor — most candidates stop at “the worker runs it” and miss this layer.",
      example: "On ShopKart's Celery setup, a worker receives the command and spins up a LocalTaskJob to babysit the transform task." },

    { label: "3 · LocalTaskJob forks the task", nodes: ["ltj", "proc"], edges: [["ltj", "proc"]],
      what: "LocalTaskJob spawns the <b>actual task process</b> and watches it. This is the layer between “the executor said go” and your operator's code.",
      why: "Running your code in a separate, supervised process means a crash, hang, or OOM in the task can't take down the worker or the supervisor tracking it.",
      how: "LocalTaskJob forks a child process that will call your operator's <code>execute()</code>, then monitors that child — ready to record its exit and keep the heartbeat flowing.",
      when: "Immediately after the LocalTaskJob starts, for a single attempt.",
      mistake: "Assuming your task and the supervisor share a process. They don't — which is exactly why the supervisor can still report a task that was hard-killed.",
      interview: "Shows depth: the supervisor/child split is how Airflow can mark an OOM-killed task <b>failed</b> instead of losing it silently.",
      example: "ShopKart's transform task runs in its own forked process; when it later gets OOM-killed, the LocalTaskJob is still alive to record the failure." },

    { label: "4 · The task runs execute()", nodes: ["proc"], edges: [],
      what: "Your operator's <code>execute()</code> finally runs — this is your real code. State is <span class='state-chip running'>running</span> and <code>try_number</code> reflects the current attempt.",
      why: "This is the payload the whole machine exists to deliver. Everything upstream was about getting exactly this code to run, once, in the right place, at the right time.",
      how: "The forked process imports your DAG file, reconstructs the operator, and calls <code>execute(context)</code>, where the task does its I/O and compute. Its return value becomes an XCom.",
      when: "For the full duration of a single task attempt.",
      mistake: "Doing non-idempotent work here (appending rows, <code>datetime.now()</code>), which makes a retry corrupt data. Task code should be safe to run twice.",
      interview: "“What actually runs your DAG code?” The forked task process under LocalTaskJob, on a worker — at execution time, not parse time.",
      example: "ShopKart's transform reads the extracted orders, computes daily sales, and returns the output path as XCom for the load task downstream." },

    { label: "5 · Heartbeats prove it's alive", nodes: ["ltj", "db"], edges: [["ltj", "db"]],
      what: "LocalTaskJob writes a <b>heartbeat</b> to the DB every <code>job_heartbeat_sec</code> (default <b>5&nbsp;s</b>). This is how Airflow knows the task is still alive.",
      why: "The scheduler and worker usually live on different machines, so Airflow can't just “watch the process.” A periodic heartbeat is the liveness signal it trusts instead.",
      how: "While the child runs, the supervisor updates a timestamp in the DB each interval. The scheduler reads those timestamps to distinguish live tasks from dead ones.",
      when: "Continuously, every heartbeat interval, for the whole time the task runs.",
      mistake: "Confusing heartbeat with progress. A heartbeat says “still alive,” not “making progress” — a task can heartbeat happily while stuck in an infinite loop.",
      interview: "“How does Airflow detect a dead task?” Missed heartbeats past a threshold — which sets up the zombie-detection answer in the next step.",
      example: "During ShopKart's 8-minute transform, the supervisor beats every 5&nbsp;s; the scheduler sees a fresh timestamp and knows the task is healthy." },

    { label: "6 · Finish & record", nodes: ["proc", "ltj", "db"], edges: [["proc", "ltj"], ["ltj", "db"]],
      what: "The task process exits; LocalTaskJob records the final <span class='state-chip success'>success</span>/<span class='state-chip failed'>failed</span> state and flushes the logs.",
      why: "The result has to be durable and the logs complete, or downstream scheduling and debugging break. The supervisor owns this bookkeeping so it happens even on failure.",
      how: "On exit, LocalTaskJob reads the child's exit code, writes the final <code>task_instance</code> state (and any XCom), flushes buffered logs to their destination, and fires success/failure callbacks.",
      when: "The moment the task process terminates, for that attempt.",
      mistake: "Assuming logs are written live and always complete. They're flushed at the end — a hard-killed process can leave the last lines missing.",
      interview: "A neat detail: the <i>supervisor</i>, not your task, records the final state — which is why Airflow can still mark a crashed task failed.",
      example: "ShopKart's transform exits 0; LocalTaskJob writes <span class='state-chip success'>success</span>, ships the log to S3, and the load task becomes eligible." },

    { label: "7 · Zombie detection", nodes: ["scheduler", "db"], edges: [["scheduler", "db"]], warn: true,
      what: "If heartbeats stop — an OOM kill, a node death — the scheduler notices the <b>stale heartbeat</b> and marks the task <b>failed</b> as a <b>zombie</b>, then applies retries.",
      why: "Without this, a task whose machine vanished would sit <span class='state-chip running'>running</span> forever, holding a slot and blocking downstream work. Zombie detection is Airflow's safety net for lost tasks.",
      how: "Each loop the scheduler scans for TIs whose last heartbeat is older than <code>scheduler_zombie_task_threshold</code>. It force-fails those, runs failure callbacks, and schedules a retry if attempts remain.",
      when: "Every scheduler loop, catching any task that went silent.",
      mistake: "Setting the zombie threshold below your longest legitimate task, so a slow-but-healthy task gets killed as a false zombie.",
      interview: "“What happens if a worker dies mid-task?” Name the stale heartbeat, the zombie reaper, and that retries still apply — a complete, senior-level answer.",
      example: "A ShopKart worker is OOM-killed mid-transform; heartbeats stop, the scheduler reaps the zombie after the threshold, and retry #2 starts on a healthy worker." }
  ];

  var CLI =
    "# What the executor actually invokes under the hood\n" +
    "airflow tasks run daily_sales_etl transform_sales \\\n" +
    "  manual__2024-01-01T00:00:00+00:00 --local";

  var module = {
    id: "task-lifecycle",
    title: "Task Lifecycle",
    fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Execution</div>' +
          '<h1 class="module-title">The life of a single task run</h1>' +
          '<p class="module-subtitle">The <a href="#task-instance">state machine</a> shows <i>what</i> states a task moves ' +
          "through. This shows the <i>machinery</i> underneath one attempt — the supervisor, the heartbeat, and the zombie reaper.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="tlc-canvas"></div>' +
          '<aside class="arch-detail" id="tlc-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="tlc-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">Under the hood</h2>' +
          '<div id="tlc-cli"></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout warn"><span class="callout-icon">🧟</span><div class="callout-body">' +
          "<b>Zombies vs orphans:</b> a <b>zombie</b> is a task whose process died without reporting (stale heartbeat) — the " +
          "scheduler fails it. An <b>orphan</b> is a task the scheduler lost track of after a restart; it gets adopted or cleared. " +
          "Tune with <code>scheduler_zombie_task_threshold</code>.</div></div>" +
          '<div class="callout tip"><span class="callout-icon">🔁</span><div class="callout-body">' +
          "Each attempt increments <b>try_number</b> and writes a <b>separate log file</b>, which is why the UI lets you view logs per attempt.</div></div>" +
        "</section>";

      var diagram = AV.ArchDiagram.create({ nodes: NODES, edges: EDGES, viewBox: "0 0 960 300", onSelect: function () {} });
      container.querySelector("#tlc-canvas").appendChild(diagram.el);
      this._diagram = diagram;

      var detail = container.querySelector("#tlc-detail");
      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">One attempt, end to end</div>' +
          "<p>Press play to follow a single task attempt from the scheduler's queue to a recorded result — including what happens when it dies.</p>" +
          '<div class="callout info" style="margin-top:var(--space-4)"><span class="callout-icon">💓</span>' +
          '<div class="callout-body">The <b>heartbeat</b> is the key idea: Airflow tracks liveness by heartbeat, not by watching the process directly.</div></div>';
      }
      function showStep(idx) {
        if (idx < 0) { defaultDetail(); return; }
        var s = STEPS[idx];
        detail.innerHTML = AV.Explain.render(s) +
          (s.warn ? '<div class="callout danger" style="margin-top:var(--space-3)"><span class="callout-icon">⚠️</span><div class="callout-body">A hung task holds its slot until the zombie threshold elapses — size it against your longest legitimate task.</div></div>' : "");
      }

      container.querySelector("#tlc-cli").appendChild(AV.CodeViewer.create({ title: "executor → task", lang: "bash", code: CLI }));

      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1 });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) {
        if (idx < 0) { diagram.clear(); showStep(-1); return; }
        var s = STEPS[idx];
        diagram.setActive(s.nodes, s.edges);
        showStep(idx);
      });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#tlc-controls").appendChild(controls.el);
      this._controls = controls;
      defaultDetail();
    },

    destroy: function () {
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      if (this._diagram) { this._diagram.destroy(); this._diagram = null; }
    }
  };

  AV.registerModule(module);
})();
