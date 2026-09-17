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
      what: "The metadata DB (Postgres or MySQL) holds <b>every piece of Airflow state</b>: serialized DAGs, run records, task states, XComs, Variables, Connections, and pool configs.",
      why: "Centralizing state in one durable store is what makes every other component <i>stateless</i> — and therefore restartable, replaceable, and scalable.",
      how: "Components don't talk to each other directly; they read and write rows in this DB. State lives in tables, not in any process's memory, so a crash loses nothing that was committed.",
      when: "Constantly — every scheduler loop, task transition, and UI query touches it.",
      mistake: "Treating the DB as a passive log. It is the live system of record — if it's slow or unavailable, the <i>whole</i> cluster stalls, not just one feature.",
      interview: "A favorite opener: “what makes Airflow fault-tolerant?” The DB-as-source-of-truth, with stateless components around it, is the answer to lead with.",
      example: "If ShopKart's scheduler pod dies at 02:15, a fresh scheduler reads the DB and resumes the nightly run — no orders reprocessed, nothing lost."
    },
    {
      nodes: ["proc", "db"], edges: [["proc", "db"]],
      label: "2 · DAG Processor → serialized_dag",
      what: "The DAG processor imports each <code>.py</code>, serializes its structure to JSON, and writes it into the <code>serialized_dag</code> table.",
      why: "Writing the serialized form to the DB is what lets the scheduler and UI read DAGs <i>without</i> importing user code — the key to speed and isolation.",
      how: "On each parse the processor upserts one row per DAG, keyed by <code>dag_id</code> and updated only when the file changes. Everyone else reads that row; the file itself is only re-touched by workers.",
      when: "On every parse cycle where a DAG's content changed.",
      mistake: "Thinking the scheduler re-reads your file when it schedules. It reads <code>serialized_dag</code> — the file was already turned into JSON by the processor.",
      interview: "Interviewers connect this table to the “stale DAG” puzzle. Knowing the processor owns writes and the scheduler only reads shows real internals fluency.",
      example: "When ShopKart adds <code>extract_tiktok_ads</code>, the processor rewrites the serialized row within seconds and the scheduler sees the new task on its next loop."
    },
    {
      nodes: ["sched", "db"], edges: [["sched", "db"], ["db", "sched"]],
      label: "3 · Scheduler reads + writes",
      what: "The scheduler is the busiest client: each loop it <b>reads</b> serialized DAGs and current states, then <b>writes</b> new <code>dag_run</code> and <code>task_instance</code> rows.",
      why: "Turning schedules into concrete work means recording that work durably. Writing runs and task instances to the DB is how a decision survives a crash.",
      how: "It reads <code>serialized_dag</code>, checks timetables, inserts run and TI rows in <span class='state-chip scheduled'>scheduled</span>, then updates them as tasks move to queued and beyond — all under row locks so multiple schedulers don't collide.",
      when: "Every loop (default heartbeat 5&nbsp;s), continuously.",
      mistake: "Assuming a single scheduler is a single point of failure. Multiple active schedulers share this DB safely via <code>SELECT … FOR UPDATE SKIP LOCKED</code>.",
      interview: "Expect “how do multiple schedulers not double-schedule?” The answer is row-level DB locks — no leader election, the database is the arbiter.",
      example: "ShopKart runs two schedulers against one DB; each grabs different task-instance rows via skip-locked reads, so nothing is scheduled twice."
    },
    {
      nodes: ["worker", "db"], edges: [["worker", "db"], ["db", "worker"]],
      label: "4 · Worker reads params, writes results",
      what: "Workers read what they need to run a task from the DB, execute it, then write back the final <code>task_instance</code> state, any <code>xcom</code> return value, and timing metrics.",
      why: "A worker's results must outlive the worker. Persisting state and XComs to the DB means a downstream task on a different worker can still find them.",
      how: "The worker looks up the TI and its params, runs <code>execute()</code>, then writes <span class='state-chip success'>success</span>/<span class='state-chip failed'>failed</span>, the XCom row, and duration. In 3.x this write goes through the API server, not a direct DB connection.",
      when: "Once per task attempt, at start and finish.",
      mistake: "Using XCom to move large data. It's stored as a DB row meant for small values (IDs, counts, paths) — not DataFrames or files.",
      interview: "“How do tasks pass data?” Small values via XCom (a DB row); big data via external storage (S3/GCS) with only the <i>path</i> in XCom.",
      example: "ShopKart's <code>extract_orders</code> writes the S3 path of a 2&nbsp;GB dump to XCom; <code>transform_sales</code> reads that path — the DB never holds the data itself."
    },
    {
      nodes: ["ui", "db"], edges: [["db", "ui"]],
      label: "5 · API Server / UI is read-only",
      what: "The web UI and REST API mostly <b>read</b> from <code>dag_run</code>, <code>task_instance</code>, <code>xcom</code>, <code>log</code>, and friends. Everything you see is a query against the metadata DB.",
      why: "Keeping the UI a thin reader means it can't corrupt state and can be scaled or restarted freely — the DB, not the webserver, is authoritative.",
      how: "Rendering the Grid pulls task-instance rows; opening logs resolves a path from the <code>log</code> table. Manual actions (trigger, clear, mark success) are the exception — they write a request the scheduler then acts on.",
      when: "On every dashboard load and API call.",
      mistake: "Believing the UI “does” things directly. Clicking <i>clear</i> doesn't rerun a task — it writes state that the <b>scheduler</b> later honors.",
      interview: "A clean way to show the pattern: the UI reflects state and requests changes; the scheduler enacts them. Read and act are separated.",
      example: "At 07:00 ShopKart's COO opens the dashboard; the API server answers “did last night succeed?” with a task-instance query — no pipeline is touched."
    },
    {
      nodes: ["db", "proc", "sched", "worker", "ui"], edges: EDGES,
      label: "6 · Why this design matters",
      what: "The payoff of the hub-and-spoke design: <b>every component is stateless except the DB</b>, so any of them can restart, scale out, or be replaced without losing progress.",
      why: "Statelessness is what makes Airflow operable in production — you can roll pods, add workers, and survive crashes because the truth lives in one durable place.",
      how: "Schedulers run active-active off the same DB; workers scale horizontally, pulling from a shared queue and writing to shared tables. Restart anything and it rehydrates from the DB.",
      when: "Always — it's the architectural property everything else depends on.",
      mistake: "Under-provisioning the DB. Because it's the shared hub, a slow or undersized database becomes the ceiling on the entire cluster's throughput.",
      interview: "Strong closers mention the trade-off: the DB is both the source of resilience <i>and</i> the central bottleneck, so you protect it (connection pooling, <code>db clean</code>, fast storage).",
      example: "On Black Friday ShopKart triples its workers to clear the load; the scheduler and DB are untouched, because workers are stateless and just need more hands."
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
        detail.innerHTML = AV.Explain.render(STEPS[idx]);
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
