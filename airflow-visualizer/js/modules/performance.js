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
      what: "Airflow throughput is bounded by four things <b>in sequence</b>: how fast DAGs <b>parse</b>, how fast the <b>scheduler</b> loops, how many tasks may run <b>concurrently</b>, and how much the <b>metadata DB</b> can take.",
      why: "These four form a pipeline — the slowest stage caps the rest. Tuning out of order (raising concurrency before fixing parsing) just moves the queue, it doesn't shorten it.",
      how: "Diagnose which stage is the ceiling, fix it, then re-measure. A slow parser starves the scheduler, which starves the executor, which leaves workers idle no matter how many you add.",
      when: "Any time throughput feels low or tasks start late — begin the investigation here, not at the workers.",
      mistake: "Adding workers first. If parsing or the scheduler loop is the bottleneck, extra workers sit idle and cost money while nothing speeds up.",
      interview: "A great systems answer names the pipeline order and says “I'd find the binding constraint before touching any knob.” That separates tuning from guessing.",
      example: "ShopKart's nightly run was late; the cause was a 40&nbsp;s parse loop, so adding workers did nothing until parsing was fixed first." },

    { active: "parser", label: "2 · Make parsing cheap",
      what: "The #1 real-world bottleneck is expensive DAG <b>parsing</b>. Because every file is re-imported on a loop, slow top-level code taxes the whole system continuously.",
      why: "The scheduler can only act on DAGs the processor has parsed. If parsing is slow, freshly-created runs appear late and the entire cluster feels sluggish — no downstream knob fixes it.",
      how: "Raise <code>min_file_process_interval</code> so files aren't re-parsed constantly, and increase <code>parsing_processes</code> to parallelize. The real fix: keep top-level DAG code trivial — no heavy imports or network calls at module scope.",
      when: "When <code>dag_processing.last_duration</code> is high, or new DAGs and edits take minutes to appear.",
      mistake: "Doing I/O at the top level — <code>Variable.get()</code>, an API call, a big import — so it re-runs every parse for every file and compounds across the fleet.",
      interview: "Interviewers love “my Airflow feels slow, where do you look?” Leading with DAG parsing (and cheap top-level code) signals real production experience.",
      example: "ShopKart cut its parse loop from 40&nbsp;s to 2&nbsp;s by moving a top-level config fetch into a task and raising the process interval to 60&nbsp;s." },

    { active: "scheduler", label: "3 · Widen the scheduler loop",
      what: "Two knobs set how much the scheduler does per loop: <code>max_dagruns_to_create_per_loop</code> and <code>max_tis_per_query</code> (the batch size when examining task instances).",
      why: "Bigger batches mean fewer, fatter DB round-trips per loop — more efficient on a busy cluster. And because scheduling is DB-coordinated, you can add scheduler replicas for near-linear throughput.",
      how: "Raise the batch knobs on high-volume clusters and run <b>multiple active-active schedulers</b>. They coordinate through row locks, so 2–3 schedulers roughly multiply scheduling throughput.",
      when: "When tasks are eligible but slow to move from <span class='state-chip scheduled'>scheduled</span> to <span class='state-chip queued'>queued</span> despite free workers.",
      mistake: "Adding schedulers while the metadata DB is already the bottleneck — more schedulers just pound a saturated database harder.",
      interview: "Know that Airflow scales the scheduler horizontally with no leader election. Naming <code>SKIP LOCKED</code> row locks as the coordination mechanism is a senior signal.",
      example: "ShopKart added a second scheduler and doubled <code>max_tis_per_query</code>, and its huge fan-out DAG stopped lagging at the top of each hour." },

    { active: "concurrency", label: "4 · Set the throttle deliberately",
      what: "Three caps govern how much runs at once: <code>parallelism</code> (cluster-wide ceiling), <code>max_active_tasks_per_dag</code>, and <code>max_active_runs_per_dag</code>.",
      why: "Without deliberate caps, one greedy DAG or a backfill can consume every slot and starve everything else — or stampede a downstream database into the ground.",
      how: "Set <code>parallelism</code> as the global ceiling, then bound per-DAG task and run concurrency. During backfills especially, cap <code>max_active_runs_per_dag</code> so dozens of intervals don't hit a source at once.",
      when: "When one DAG monopolises capacity, or a backfill overwhelms a downstream system.",
      mistake: "Leaving <code>max_active_runs</code> high on a catchup/backfill, so 50 historical runs launch together and melt the warehouse.",
      interview: "Expect “how do you stop one DAG starving the cluster?” The layered caps — global, per-DAG tasks, per-DAG runs — plus pools are the complete answer.",
      example: "ShopKart caps its reconciliation DAG at <code>max_active_runs=2</code> so a month-long backfill trickles through instead of opening 30 concurrent warehouse connections." },

    { active: "db", label: "5 · Protect the metadata DB",
      what: "Every component and task opens DB sessions, so the metadata database is the shared ceiling on the whole cluster's throughput.",
      why: "Because it's the hub, a saturated DB slows scheduling, task starts, and the UI all at once. Protecting it is often the highest-leverage tuning you can do.",
      how: "Size <code>sql_alchemy_pool_size</code>, front Postgres with <b>PgBouncer</b> to multiplex connections, and remember Celery multiplies load — 16 workers × 16 concurrency = 256 clients. Run <code>airflow db clean</code> to keep tables small.",
      when: "When DB connections approach <code>max_connections</code>, or query latency climbs as <code>task_instance</code> grows.",
      mistake: "Raising <code>parallelism</code> without sizing the DB pool or adding PgBouncer — you just relocate the bottleneck onto Postgres.",
      interview: "A strong answer treats the DB as the crown jewel: connection pooling, PgBouncer, periodic <code>db clean</code>. It shows you've run Airflow at scale, not just written DAGs.",
      example: "ShopKart put PgBouncer in front of Postgres and its “too many connections” errors during the 2&nbsp;AM peak vanished, with no app changes." },

    { active: null, label: "6 · Measure, then tune",
      what: "Never tune blind — change <b>one</b> knob, watch the right metrics for a full load cycle, then decide whether it helped.",
      why: "Airflow's subsystems interact, so changing several knobs at once makes cause impossible to attribute. Disciplined, single-variable changes are how you actually converge.",
      how: "Watch <code>dag_processing.last_duration</code>, <code>scheduler.tasks.starving</code>, <code>pool.open_slots</code>, and DB connection counts. Adjust one thing, observe a day of real load, iterate. Most clusters need only 3–4 well-chosen changes.",
      when: "Continuously, as a discipline — and especially before and after every configuration change.",
      mistake: "Bulk-editing <code>airflow.cfg</code> with a dozen “best practice” values at once, then being unable to tell which change fixed or broke things.",
      interview: "Interviewers value method over trivia: “measure, change one variable, observe a full cycle” is the answer that shows engineering maturity.",
      example: "ShopKart fixed its throughput with exactly three changes — cheaper parsing, a second scheduler, and PgBouncer — each validated over a night before the next." }
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
        detail.innerHTML = AV.Explain.render(s);
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
