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
      what: "The <code>airflow</code> CLI is grouped into subcommands: <code>dags</code>, <code>tasks</code>, <code>db</code>, <code>users</code>, <code>connections</code>, <code>variables</code>, plus component launchers (<code>scheduler</code>, <code>api-server</code>, <code>triggerer</code>).",
      why: "One consistent CLI over every subsystem lets you operate, debug, and launch Airflow from a terminal or a script without clicking through the UI — essential for automation.",
      how: "Run <code>airflow &lt;group&gt; &lt;command&gt;</code>; <code>airflow --help</code> lists all groups. The same commands work locally and against a deployment (with the DB/API configured).",
      when: "Everywhere — local dev, CI, cron jobs, and incident response.",
      mistake: "Reaching for the UI for things the CLI does faster and scriptably (bulk connection import, DB cleanup, task debugging).",
      interview: "“How do you operate Airflow without the UI?” The <code>airflow</code> CLI, grouped by subsystem. Knowing the groups exist (and the launchers) frames the rest.",
      example: "A ShopKart runbook scripts <code>airflow</code> CLI calls to trigger, inspect, and clean up runs during an incident — no clicking required." },

    { active: "dags", label: "2 · Driving DAGs",
      what: "<code>airflow dags trigger</code> kicks off an on-demand run and accepts a <code>--conf</code> JSON payload readable via <code>{{ dag_run.conf }}</code>. <code>airflow dags test</code> executes the whole DAG in-process — no scheduler, no run-state writes.",
      why: "These cover the two most common needs: launch a real run with parameters, and dry-run a whole DAG locally to iterate fast without touching production state.",
      how: "<code>trigger</code> creates a real run (optionally with <code>--conf</code>); <code>test</code> runs the DAG end-to-end in your process for a given logical date, ideal for local development.",
      when: "<code>trigger</code> for ad-hoc/parameterized runs; <code>test</code> for local iteration.",
      mistake: "Using <code>trigger</code> when you meant <code>test</code> (or vice versa) — one writes real run state, the other is an in-process dry run.",
      interview: "“How do you run a whole DAG locally without the scheduler?” <code>airflow dags test &lt;id&gt; &lt;date&gt;</code>. Distinguishing it from <code>trigger</code> shows you know the dev loop.",
      example: "ShopKart devs run <code>airflow dags test daily_sales_etl 2024-01-15</code> to validate a change end-to-end before pushing." },

    { active: "tasks", label: "3 · Debugging a single task",
      what: "<code>airflow tasks test &lt;dag&gt; &lt;task&gt; &lt;date&gt;</code> is the single most useful command: it runs one task's callable directly with a real templated context, printing logs to your terminal, without touching task state in the DB.",
      why: "It gives the fastest possible feedback loop for a single task — real context, real logs, zero side effects on run state — which is exactly what you want while debugging.",
      how: "The command builds the task's context for the given logical date and calls <code>execute()</code> in-process; nothing is written to <code>task_instance</code>, so you can run it repeatedly.",
      when: "Whenever you're debugging or developing one task in isolation.",
      mistake: "Debugging by triggering full runs and reading the UI, when <code>tasks test</code> would give you the same answer in seconds locally.",
      interview: "“What's your go-to command for debugging one task?” <code>airflow tasks test</code> — real context, no state writes. It's the answer every hands-on Airflow dev gives.",
      example: "ShopKart debugs <code>reconcile_payments</code> with <code>airflow tasks test</code>, tweaking and rerunning against the same date until it's right." },

    { active: "db", label: "4 · Keeping the metadata DB healthy",
      what: "<code>airflow db migrate</code> applies Alembic migrations on upgrade. <code>airflow db clean</code> is essential ops hygiene — a busy scheduler generates millions of <code>task_instance</code> and <code>log</code> rows.",
      why: "The metadata DB is the cluster's shared ceiling; letting it grow unbounded degrades query latency for everything. Regular cleanup keeps scheduling and the UI fast.",
      how: "Run <code>airflow db migrate</code> as part of upgrades, and schedule <code>airflow db clean --clean-before-timestamp</code> to purge old runs/logs beyond a retention window.",
      when: "<code>migrate</code> on every version upgrade; <code>clean</code> on a recurring schedule.",
      mistake: "Never running <code>db clean</code>, so <code>task_instance</code> grows into millions of rows and scheduler queries crawl.",
      interview: "“How do you keep the metadata DB from degrading?” Scheduled <code>airflow db clean</code> with a retention window. A concrete ops habit that signals production experience.",
      example: "ShopKart runs <code>airflow db clean</code> nightly to purge rows older than 90 days, keeping scheduler query latency flat as volume grows." },

    { active: "admin", label: "5 · Managing config as code",
      what: "<code>airflow connections export conns.json</code> and <code>variables export</code> snapshot config for GitOps; re-import into a fresh environment with the matching <code>import</code> command.",
      why: "Treating connections and variables as exportable artifacts makes environments reproducible and auditable — you can rebuild or clone a deployment's config from version control.",
      how: "Export to JSON/YAML/env, commit (secrets redacted or sourced from a backend), and <code>import</code> into another environment. Config becomes a reproducible artifact, not manual UI clicks.",
      when: "When bootstrapping environments, migrating, or enforcing GitOps for config.",
      mistake: "Hand-entering connections/variables in each environment's UI, so dev/staging/prod drift and nobody can reproduce them.",
      interview: "“How do you make Airflow config reproducible across environments?” Export/import connections and variables as artifacts (GitOps). Shows you think beyond one-off UI setup.",
      example: "ShopKart exports connections to JSON in CI and imports them into a fresh staging environment so it matches prod exactly." },

    { active: null, label: "6 · Airflow 3 CLI changes",
      what: "Airflow 3 renames <code>webserver</code> → <code>api-server</code>; the standalone dev launcher is still <code>airflow standalone</code>. The <code>airflowctl</code> companion CLI targets the remote API without local DB access.",
      why: "The unified FastAPI service and remote-first tooling mean your scripts must target the new command names and can operate a deployment without direct database credentials.",
      how: "Update launchers from <code>airflow webserver</code> to <code>airflow api-server</code>; use <code>airflowctl</code> to script against a running deployment's API rather than needing a local DB connection.",
      when: "When upgrading scripts and automation to Airflow 3.",
      mistake: "Leaving <code>airflow webserver</code> in deploy scripts on 3.x, where it no longer exists — the service is now <code>api-server</code>.",
      interview: "“What CLI changes land in Airflow 3?” <code>webserver</code> → <code>api-server</code>, plus <code>airflowctl</code> for remote API scripting. A crisp current-events answer.",
      example: "ShopKart updates its Helm and deploy scripts from <code>airflow webserver</code> to <code>airflow api-server</code> as part of its 3.x upgrade." }
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
        detail.innerHTML = AV.Explain.render(s);
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
