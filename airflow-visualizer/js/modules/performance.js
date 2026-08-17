/* ============================================================
   modules/performance.js — performance tuning
   Animated tuning-knob category grid (reuses metrics-grid layout).
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var CATEGORIES = [
    {
      id: "parser", icon: "📖", title: "DAG parsing",
      metrics: [
        { name: "[dag_processor] parsing_processes", desc: "Parallel DAG-file parsers. Raise on many DAGs; watch CPU." },
        { name: "min_file_process_interval",         desc: "Min seconds between re-parses of a file (default 30). Raise to cut parse load." },
        { name: "dag_dir_list_interval",             desc: "How often the DAG folder is scanned for new files (default 300 s)." }
      ]
    },
    {
      id: "scheduler", icon: "📅", title: "Scheduler loop",
      metrics: [
        { name: "max_dagruns_to_create_per_loop",  desc: "How many new DAG runs the scheduler creates per loop." },
        { name: "max_tis_per_query",               desc: "Batch size when the scheduler examines task instances." },
        { name: "scheduler_idle_sleep_time",       desc: "Pause between loops when idle — lower = snappier, higher = less DB load." }
      ]
    },
    {
      id: "concurrency", icon: "🚦", title: "Concurrency limits",
      metrics: [
        { name: "[core] parallelism",              desc: "Cluster-wide cap on running task instances." },
        { name: "max_active_tasks_per_dag",        desc: "Running tasks allowed per DAG (was dag_concurrency)." },
        { name: "max_active_runs_per_dag",         desc: "Concurrent runs of the same DAG — key for backfills." }
      ]
    },
    {
      id: "db", icon: "🗄️", title: "Database & workers",
      metrics: [
        { name: "sql_alchemy_pool_size",           desc: "DB connections per component. Pair with PgBouncer." },
        { name: "worker_concurrency (Celery)",     desc: "Tasks a single Celery worker runs at once." },
        { name: "worker_refresh_interval",         desc: "How often gunicorn workers recycle — bounds memory growth." }
      ]
    }
  ];

  var STEPS = [
    { active: null, label: "1 · Where time actually goes",
      desc: "Airflow throughput is bounded by four things in sequence: how fast DAGs <b>parse</b>, how fast the <b>scheduler</b> loops, how many tasks may run <b>concurrently</b>, and how much the <b>metadata DB</b> can take. Tune them in that order — a slow parser starves everything downstream." },
    { active: "parser", label: "2 · Make parsing cheap",
      desc: "The #1 real-world bottleneck is expensive DAG parsing. Raise <code>min_file_process_interval</code> so files aren't re-parsed constantly, and increase <code>parsing_processes</code> to parallelize. The real fix: keep top-level DAG code trivial — no imports of heavy libraries or network calls at module scope." },
    { active: "scheduler", label: "3 · Widen the scheduler loop",
      desc: "<code>max_dagruns_to_create_per_loop</code> and <code>max_tis_per_query</code> control how much work each scheduler loop does. On a busy cluster, larger batches mean fewer, fatter DB round-trips. Add <b>more scheduler replicas</b> (active-active) for near-linear throughput gains." },
    { active: "concurrency", label: "4 · Set the throttle deliberately",
      desc: "<code>parallelism</code> is the global ceiling; <code>max_active_tasks_per_dag</code> and <code>max_active_runs_per_dag</code> prevent one greedy DAG from starving the rest. During backfills, cap <code>max_active_runs</code> so you don't stampede a downstream database." },
    { active: "db", label: "5 · Protect the metadata DB",
      desc: "Every component and task opens DB sessions. Size <code>sql_alchemy_pool_size</code> and front Postgres with <b>PgBouncer</b>. For Celery, <code>worker_concurrency</code> multiplies load — 16 workers × 16 concurrency = 256 simultaneous DB clients. Run <code>airflow db clean</code> to keep tables small." },
    { active: null, label: "6 · Measure, then tune",
      desc: "Never tune blind. Watch <code>dag_processing.last_duration</code>, <code>scheduler.tasks.starving</code>, <code>pool.open_slots</code>, and DB connection counts. Change <b>one</b> knob, observe a full day of load, then decide. Most clusters need only 3–4 well-chosen changes." }
  ];

  var CODE_CFG =
    "# airflow.cfg — high-throughput cluster\n" +
    "[core]\n" +
    "parallelism                 = 256\n" +
    "max_active_tasks_per_dag    = 64\n" +
    "max_active_runs_per_dag     = 8\n" +
    "\n" +
    "[scheduler]\n" +
    "min_file_process_interval   = 60\n" +
    "parsing_processes           = 4\n" +
    "max_dagruns_to_create_per_loop = 20\n" +
    "\n" +
    "[database]\n" +
    "sql_alchemy_pool_size       = 10\n" +
    "sql_alchemy_max_overflow    = 20";

  var CODE_DIAG =
    "# Diagnose before you tune\n" +
    "\n" +
    "# Which metric is the bottleneck?\n" +
    "#   dag_processing.last_duration  -> parsing slow\n" +
    "#   scheduler.tasks.starving      -> not enough slots\n" +
    "#   pool.open_slots == 0          -> pool too small\n" +
    "#   DB connections near max       -> add PgBouncer\n" +
    "\n" +
    "# Keep the metadata DB lean\n" +
    "airflow db clean \\\n" +
    "  --clean-before-timestamp \"$(date -d '30 days ago' -Iseconds)\" --yes";

  var module = {
    id: "performance",
    title: "Performance Tuning",
    fullWidth: true,
    _engine: null, _controls: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Operations</div>' +
          '<h1 class="module-title">Performance tuning: parsing, scheduling, concurrency, and the DB</h1>' +
          '<p class="module-subtitle">Airflow throughput is a pipeline of four bottlenecks. Tune them in order — cheap parsing, a wide scheduler loop, ' +
          "deliberate concurrency caps, and a protected metadata DB — and measure one change at a time.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="pf-canvas"><div class="metrics-grid" id="pf-grid"></div></div>' +
          '<aside class="arch-detail" id="pf-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="pf-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<div class="two-col-code" id="pf-codes"></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout warn"><span class="callout-icon">📏</span><div class="callout-body">' +
          "<b>Change one knob at a time.</b> Airflow's subsystems interact — bumping <code>parallelism</code> without sizing the DB pool just moves the bottleneck to Postgres. Adjust, observe a full day, then iterate.</div></div>" +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<b>Dedicated DAG processor:</b> Airflow 3 runs DAG parsing in a separate <code>dag-processor</code> component by default, isolating parse load from the scheduler loop — a large scalability win for big DAG fleets.</div></div>" +
        "</section>";

      var grid = container.querySelector("#pf-grid");
      var detail = container.querySelector("#pf-detail");

      function buildGrid(activeId) {
        grid.innerHTML = CATEGORIES.map(function (cat) {
          var isActive = cat.id === activeId;
          return '<div class="metric-card' + (isActive ? " metric-card-active" : "") + '">' +
            '<div class="metric-card-head"><span class="metric-icon">' + cat.icon + "</span>" +
              '<span class="metric-card-title">' + cat.title + "</span></div>" +
            cat.metrics.map(function (m) {
              return '<div class="metric-entry"><div class="metric-name">' + m.name + "</div>" +
                '<div class="metric-desc">' + m.desc + "</div></div>";
            }).join("") + "</div>";
        }).join("");
      }

      function showStep(idx) {
        if (idx < 0) {
          buildGrid(null);
          detail.innerHTML =
            '<div class="arch-detail-title">Four bottlenecks, in order</div>' +
            "<p>Press play to walk the throughput pipeline — parsing, scheduling, concurrency, and the database — and which knob moves each.</p>" +
            '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">⚡</span>' +
            '<div class="callout-body">80% of Airflow slowness is expensive DAG parsing. Fix that before touching anything else.</div></div>';
          return;
        }
        var s = STEPS[idx];
        buildGrid(s.active);
        detail.innerHTML = '<div class="arch-detail-title">' + s.label + "</div><p>" + s.desc + "</p>";
      }

      var codes = container.querySelector("#pf-codes");
      var a = document.createElement("div"); a.className = "two-col-code-item";
      a.appendChild(AV.CodeViewer.create({ title: "airflow.cfg — throughput knobs", lang: "bash", code: CODE_CFG }));
      var b = document.createElement("div"); b.className = "two-col-code-item";
      b.appendChild(AV.CodeViewer.create({ title: "diagnose the bottleneck first", lang: "bash", code: CODE_DIAG }));
      codes.appendChild(a); codes.appendChild(b);

      var engine = new AV.AnimationEngine({
        steps: STEPS.map(function (s) { return { label: s.label, duration: 2800 }; }), speed: 1
      });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) { showStep(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#pf-controls").appendChild(controls.el);
      this._controls = controls;
      showStep(-1);
    },

    destroy: function () {
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
    }
  };

  AV.registerModule(module);
})();
