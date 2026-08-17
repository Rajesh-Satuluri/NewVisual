/* ============================================================
   modules/cli.js — CLI deep dive
   Animated command-category grid (reuses metrics-grid layout).
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var CATEGORIES = [
    {
      id: "dags", icon: "📋", title: "DAG operations",
      metrics: [
        { name: "airflow dags list",                  desc: "List all DAGs and their paused state" },
        { name: "airflow dags trigger <id> -c '{...}'", desc: "Trigger a run with an optional JSON conf" },
        { name: "airflow dags backfill <id> -s -e",   desc: "Backfill a date range (2.x; use `re-run` UX in 3.x)" },
        { name: "airflow dags test <id> <logical_date>", desc: "Run a whole DAG locally, no scheduler needed" }
      ]
    },
    {
      id: "tasks", icon: "⚙️", title: "Task operations",
      metrics: [
        { name: "airflow tasks test <dag> <task> <date>", desc: "Run one task in isolation — best debug tool" },
        { name: "airflow tasks states-for-dag-run",   desc: "Show every task's state for a given run" },
        { name: "airflow tasks clear <dag> -t <task>", desc: "Clear task instances to force a re-run" },
        { name: "airflow tasks logs <dag> <task> <date>", desc: "Stream the log for a specific try" }
      ]
    },
    {
      id: "db", icon: "🗄️", title: "Database & maintenance",
      metrics: [
        { name: "airflow db migrate",   desc: "Apply schema migrations (replaces 2.x `db upgrade`)" },
        { name: "airflow db clean --clean-before-timestamp", desc: "Purge old run/log rows to keep the DB lean" },
        { name: "airflow db check",     desc: "Verify DB connectivity before boot" },
        { name: "airflow db reset",     desc: "⚠️ Drop and recreate — dev only" }
      ]
    },
    {
      id: "admin", icon: "🔧", title: "Admin & config",
      metrics: [
        { name: "airflow users create / add-role", desc: "Manage users and their RBAC roles" },
        { name: "airflow connections add / export", desc: "Create or dump connections (JSON/YAML/env)" },
        { name: "airflow variables set / import",  desc: "Manage Variables individually or in bulk" },
        { name: "airflow config get-value core executor", desc: "Read the resolved effective config" }
      ]
    }
  ];

  var STEPS = [
    { active: null,   label: "1 · One CLI, every subsystem",
      desc: "The <code>airflow</code> CLI is grouped into subcommands: <code>dags</code>, <code>tasks</code>, <code>db</code>, <code>users</code>, <code>connections</code>, <code>variables</code>, plus the component launchers (<code>scheduler</code>, <code>api-server</code>, <code>triggerer</code>). Run <code>airflow --help</code> to see them all." },
    { active: "dags", label: "2 · Driving DAGs",
      desc: "<code>airflow dags trigger</code> kicks off an on-demand run and accepts a <code>--conf</code> JSON payload readable via <code>{{ dag_run.conf }}</code>. <code>airflow dags test</code> executes the entire DAG in-process — no scheduler, no DB writes for the run — perfect for local iteration." },
    { active: "tasks", label: "3 · Debugging a single task",
      desc: "<code>airflow tasks test &lt;dag&gt; &lt;task&gt; &lt;date&gt;</code> is the single most useful command: it runs one task's callable directly with a real templated context, printing logs to your terminal, without touching task state in the DB." },
    { active: "db", label: "4 · Keeping the metadata DB healthy",
      desc: "<code>airflow db migrate</code> applies Alembic migrations on upgrade. <code>airflow db clean</code> is essential ops hygiene — a busy scheduler generates millions of <code>task_instance</code> and <code>log</code> rows; purge them on a schedule or query latency degrades." },
    { active: "admin", label: "5 · Managing config as code",
      desc: "<code>airflow connections export conns.json</code> and <code>variables export</code> let you snapshot config for GitOps. Re-import into a fresh environment with the matching <code>import</code> command — your connections and variables become reproducible artifacts." },
    { active: null, label: "6 · Airflow 3 CLI changes",
      desc: "Airflow 3 renames <code>webserver</code> → <code>api-server</code>, and the standalone dev launcher is still <code>airflow standalone</code>. The <code>airflowctl</code> companion CLI (for the remote API) is the recommended way to script against a running deployment without local DB access." }
  ];

  var CODE_DEBUG =
    "# The debug loop every Airflow dev lives in:\n" +
    "\n" +
    "# 1. Run one task with a real templated context\n" +
    "airflow tasks test daily_sales_etl extract_orders 2024-01-15\n" +
    "\n" +
    "# 2. Run the whole DAG end-to-end, locally\n" +
    "airflow dags test daily_sales_etl 2024-01-15\n" +
    "\n" +
    "# 3. Inspect every task state for a run\n" +
    "airflow tasks states-for-dag-run daily_sales_etl \\\n" +
    "  manual__2024-01-15T00:00:00+00:00";

  var CODE_OPS =
    "# Production ops one-liners\n" +
    "\n" +
    "# Purge run/log rows older than 90 days\n" +
    "airflow db clean --clean-before-timestamp \\\n" +
    "  \"$(date -d '90 days ago' -Iseconds)\" --yes\n" +
    "\n" +
    "# Snapshot connections for GitOps\n" +
    "airflow connections export connections.json\n" +
    "\n" +
    "# Trigger with a conf payload\n" +
    "airflow dags trigger daily_sales_etl \\\n" +
    "  -c '{\"region\": \"us-west\", \"full_refresh\": true}'";

  var module = {
    id: "cli",
    title: "CLI Deep Dive",
    fullWidth: true,
    _engine: null, _controls: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Tooling</div>' +
          '<h1 class="module-title">CLI deep dive: operate Airflow from the terminal</h1>' +
          '<p class="module-subtitle">The <code>airflow</code> CLI controls every subsystem — triggering DAGs, debugging single tasks, migrating the ' +
          "database, and managing users. A handful of commands cover 90% of daily operator and developer work.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="cl-canvas"><div class="metrics-grid" id="cl-grid"></div></div>' +
          '<aside class="arch-detail" id="cl-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="cl-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<div class="two-col-code" id="cl-codes"></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout tip"><span class="callout-icon">🐚</span><div class="callout-body">' +
          "<b>Tab-completion:</b> run <code>airflow cheat-sheet</code> for a printed list of every command, and enable shell completion with <code>eval \"$(register-python-argcomplete airflow)\"</code> in your rc file.</div></div>" +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<b><code>webserver</code> → <code>api-server</code>:</b> Airflow 3 unifies the UI and REST API behind a single FastAPI service. Scripts that launched <code>airflow webserver</code> must switch to <code>airflow api-server</code>.</div></div>" +
        "</section>";

      var grid = container.querySelector("#cl-grid");
      var detail = container.querySelector("#cl-detail");

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
            '<div class="arch-detail-title">Four command families</div>' +
            "<p>Press play to tour the CLI groups you'll reach for daily — from triggering DAGs to purging the metadata DB.</p>" +
            '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">💡</span>' +
            '<div class="callout-body"><code>airflow tasks test</code> runs a task without recording state — your safest debugging command.</div></div>';
          return;
        }
        var s = STEPS[idx];
        buildGrid(s.active);
        detail.innerHTML = '<div class="arch-detail-title">' + s.label + "</div><p>" + s.desc + "</p>";
      }

      var codes = container.querySelector("#cl-codes");
      var a = document.createElement("div"); a.className = "two-col-code-item";
      a.appendChild(AV.CodeViewer.create({ title: "the local debug loop", lang: "bash", code: CODE_DEBUG }));
      var b = document.createElement("div"); b.className = "two-col-code-item";
      b.appendChild(AV.CodeViewer.create({ title: "production ops one-liners", lang: "bash", code: CODE_OPS }));
      codes.appendChild(a); codes.appendChild(b);

      var engine = new AV.AnimationEngine({
        steps: STEPS.map(function (s) { return { label: s.label, duration: 2700 }; }), speed: 1
      });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) { showStep(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#cl-controls").appendChild(controls.el);
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
