/* ============================================================
   modules/metadata-db.js — Airflow metadata database
   Hub-spoke arch diagram: DB center, 4 components around it.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var NODES = [
    { id: "db",     label: "Metadata DB",     sub: "PostgreSQL / MySQL",       x: 235, y: 165, w: 210, h: 70,  color: "purple"  },
    { id: "proc",   label: "DAG Processor",   sub: "serializes .py → JSON",    x: 40,  y: 25,  w: 170, h: 60,  color: "cyan"    },
    { id: "sched",  label: "Scheduler",       sub: "creates runs & TIs",       x: 490, y: 25,  w: 170, h: 60,  color: "airflow" },
    { id: "worker", label: "Worker",          sub: "runs tasks, writes XCom",  x: 490, y: 315, w: 170, h: 60,  color: "yellow"  },
    { id: "ui",     label: "API Server / UI", sub: "reads all tables",         x: 40,  y: 315, w: 170, h: 60,  color: "green"   }
  ];

  var EDGES = [
    ["proc", "db"], ["sched", "db"], ["db", "sched"],
    ["worker", "db"], ["db", "worker"], ["db", "ui"]
  ];

  var STEPS = [
    {
      nodes: ["db"], edges: [],
      label: "1 · Single source of truth",
      desc: "Every piece of Airflow state lives in the metadata DB — DAG definitions, run records, task states, XCom values, Variables, Connections, pool configs. If the scheduler restarts, it reads the DB and picks up exactly where it left off."
    },
    {
      nodes: ["proc", "db"], edges: [["proc", "db"]],
      label: "2 · DAG Processor → serialized_dag",
      desc: "The DAG Processor imports your <code>.py</code>, serializes the DAG structure to JSON, and writes it to the <code>serialized_dag</code> table. The scheduler then reads <i>that JSON</i> — it never imports your file."
    },
    {
      nodes: ["sched", "db"], edges: [["sched", "db"], ["db", "sched"]],
      label: "3 · Scheduler reads + writes",
      desc: "Each scheduler loop reads <code>serialized_dag</code>, decides which runs to create, and writes new <code>dag_run</code> and <code>task_instance</code> rows — then polls <code>task_instance</code> to transition scheduled tasks to queued."
    },
    {
      nodes: ["worker", "db"], edges: [["worker", "db"], ["db", "worker"]],
      label: "4 · Worker reads params, writes results",
      desc: "Workers fetch task params from the DB, execute the task, then write the final <code>task_instance</code> state (success/failed), <code>xcom</code> return values, and duration metrics."
    },
    {
      nodes: ["ui", "db"], edges: [["db", "ui"]],
      label: "5 · API Server / UI is read-only",
      desc: "The web UI and REST API read from <code>dag_run</code>, <code>task_instance</code>, <code>xcom</code>, <code>log</code>, and friends. They own <i>no state</i> — everything you see in the UI is a query against the metadata DB."
    },
    {
      nodes: ["db", "proc", "sched", "worker", "ui"], edges: EDGES,
      label: "6 · Why this design matters",
      desc: "Every component is stateless except the DB, so you can restart any of them without losing progress. Active/passive HA schedulers read the same DB. Workers scale horizontally — they pull from the same task queue and write to the same DB."
    }
  ];

  var TABLES = [
    ["dag",            "One row per DAG ID; tracks active/paused state, schedule, tags"],
    ["serialized_dag", "Serialized JSON of the DAG structure — what the scheduler reads"],
    ["dag_run",        "One row per DAG run: run_id, state, logical_date, start/end"],
    ["task_instance",  "One row per task per run: state, tries, start/end, hostname"],
    ["xcom",           "Task return values: key, value (pickled), dag_id, task_id, run_id"],
    ["variable",       "Key-value config pairs; values can be encrypted at rest"],
    ["connection",     "Named credentials: type, host, port, login, password, extras"],
    ["slot_pool",      "Pool definitions: name, slots, open_slots, running_slots"],
    ["log",            "Task log metadata (file path or remote URI)"],
    ["import_error",   "Exceptions from importing DAG files — shown as UI banners"]
  ];

  var module = {
    id: "metadata-db",
    title: "Metadata DB",
    fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Internals</div>' +
          '<h1 class="module-title">Metadata DB: Airflow\'s single source of truth</h1>' +
          '<p class="module-subtitle">Every Airflow component — scheduler, worker, UI — reads from and writes to one central database. ' +
          "That's what makes Airflow restart-tolerant, horizontally scalable, and easy to observe.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="md-canvas"></div>' +
          '<aside class="arch-detail" id="md-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="md-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">Key tables</h2>' +
          '<div class="table-wrap"><table class="cmp-table" id="md-table"></table></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout warn"><span class="callout-icon">📈</span><div class="callout-body">' +
          "<b>task_instance grows fast.</b> Each backfill or high-frequency DAG adds rows that are never deleted by default. " +
          "Monitor table size and run <code>airflow db clean</code> (2.4+) to prune old records.</div></div>" +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<b>DAG versioning:</b> Airflow 3 adds a <code>dag_version</code> table that links each run to the exact serialized DAG it executed with, " +
          "so the UI shows the correct historical graph even after the DAG is edited.</div></div>" +
        "</section>";

      var diagram = AV.ArchDiagram.create({
        nodes: NODES, edges: EDGES, viewBox: "0 0 700 420", onSelect: function () {}
      });
      container.querySelector("#md-canvas").appendChild(diagram.el);
      this._diagram = diagram;

      var detail = container.querySelector("#md-detail");
      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">The hub of Airflow</div>' +
          "<p>Press play to see how each component interacts with the metadata DB — and why the stateless-component design makes Airflow resilient.</p>" +
          '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">🗄️</span>' +
          '<div class="callout-body">PostgreSQL is recommended for production. SQLite works only for single-machine dev — it doesn\'t support concurrent writers.</div></div>';
      }
      function showStep(idx) {
        if (idx < 0) { defaultDetail(); return; }
        var s = STEPS[idx];
        detail.innerHTML = '<div class="arch-detail-title">' + s.label + "</div><p>" + s.desc + "</p>";
      }

      var head = "<thead><tr><th>Table</th><th>Contents</th></tr></thead>";
      container.querySelector("#md-table").innerHTML = head + "<tbody>" +
        TABLES.map(function (r) {
          return "<tr><td class='cmp-dim'><code>" + r[0] + "</code></td><td>" + r[1] + "</td></tr>";
        }).join("") + "</tbody>";

      var engine = new AV.AnimationEngine({
        steps: STEPS.map(function (s) { return { label: s.label, duration: 2800 }; }), speed: 1
      });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) {
        if (idx < 0) { diagram.clear(); showStep(-1); return; }
        diagram.setActive(STEPS[idx].nodes, STEPS[idx].edges);
        showStep(idx);
      });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#md-controls").appendChild(controls.el);
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
