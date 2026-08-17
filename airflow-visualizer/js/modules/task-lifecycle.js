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
      desc: "The scheduler has decided this task instance should run and hands the command to the executor. Nothing is executing yet." },
    { label: "2 · Executor launches the command", nodes: ["executor", "ltj"], edges: [["executor", "ltj"]],
      desc: "The executor runs <code>airflow tasks run &lt;dag&gt; &lt;task&gt; &lt;run_id&gt;</code>, which starts a <b>LocalTaskJob</b> — a small supervisor process." },
    { label: "3 · LocalTaskJob forks the task", nodes: ["ltj", "proc"], edges: [["ltj", "proc"]],
      desc: "LocalTaskJob spawns the actual task process and watches it. It's the layer between \"the executor said go\" and your operator's code." },
    { label: "4 · The task runs execute()", nodes: ["proc"], edges: [],
      desc: "Your operator's <code>execute()</code> runs. State is <span class='state-chip running'>running</span> and <b>try_number</b> reflects this attempt." },
    { label: "5 · Heartbeats prove it's alive", nodes: ["ltj", "db"], edges: [["ltj", "db"]],
      desc: "LocalTaskJob writes a <b>heartbeat</b> to the DB every <code>job_heartbeat_sec</code> (default 5&nbsp;s). This is how Airflow knows the task is still alive." },
    { label: "6 · Finish & record", nodes: ["proc", "ltj", "db"], edges: [["proc", "ltj"], ["ltj", "db"]],
      desc: "The process exits; LocalTaskJob records the final <span class='state-chip success'>success</span>/<span class='state-chip failed'>failed</span> state and flushes logs." },
    { label: "7 · Zombie detection", nodes: ["scheduler", "db"], edges: [["scheduler", "db"]],
      desc: "If heartbeats stop (OOM kill, node death), the scheduler notices the stale heartbeat and marks the task <b>failed</b> as a <b>zombie</b> — then applies retries.", warn: true }
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
        detail.innerHTML = '<div class="arch-detail-title">' + s.label + "</div><p>" + s.desc + "</p>" +
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
