/* ============================================================
   modules/dag-coding.js — reading & writing DAG code
   Two parts:
   A) "Read a DAG file faster" — an engine walkthrough that
      highlights parts of a canonical ShopKart DAG and explains,
      via AV.Explain, the fast-read order (header → schedule →
      default_args → imports → tasks → templates → dependencies).
   B) "Code DAGs faster" — a grid of practical writing idioms,
      each a snippet + why (filled in Iter 32).
   BusinessLens + TestYourself (quiz bank) are auto-appended by
   the router from the `dag-coding` id.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // Canonical ShopKart DAG the reading walkthrough steps through.
  var DAG_CODE =
    "from datetime import datetime, timedelta\n" +
    "from airflow import DAG\n" +
    "from airflow.operators.python import PythonOperator\n" +
    "from airflow.providers.amazon.aws.transfers.sql_to_s3 import SqlToS3Operator\n" +
    "\n" +
    "default_args = {\n" +
    "    \"owner\": \"data-eng\",\n" +
    "    \"retries\": 3,\n" +
    "    \"retry_delay\": timedelta(minutes=5),\n" +
    "    \"on_failure_callback\": alert_oncall,\n" +
    "}\n" +
    "\n" +
    "with DAG(\n" +
    "    dag_id=\"ecommerce_daily_ops\",\n" +
    "    schedule=\"0 2 * * *\",\n" +
    "    start_date=datetime(2024, 1, 1),\n" +
    "    catchup=False,\n" +
    "    default_args=default_args,\n" +
    "    tags=[\"shopkart\", \"daily\"],\n" +
    ") as dag:\n" +
    "\n" +
    "    extract_orders = PythonOperator(\n" +
    "        task_id=\"extract_orders\",\n" +
    "        python_callable=pull_orders,\n" +
    "        op_kwargs={\"day\": \"{{ ds }}\"},\n" +
    "        pool=\"warehouse_db\",\n" +
    "    )\n" +
    "\n" +
    "    load_orders = SqlToS3Operator(\n" +
    "        task_id=\"load_orders\",\n" +
    "        query=\"SELECT * FROM orders WHERE date = '{{ ds }}'\",\n" +
    "        s3_bucket=\"shopkart-data-prod\",\n" +
    "        s3_key=\"orders/{{ ds_nodash }}/data.parquet\",\n" +
    "    )\n" +
    "\n" +
    "    extract_orders >> load_orders";

  // Each step highlights 1-based lines of DAG_CODE + explains the read.
  var STEPS = [
    {
      lines: [13, 14, 20], label: "1 · Start at the DAG(...) header",
      what: "Opening an unfamiliar DAG file, jump straight to the <code>with DAG(...)</code> call. Its arguments — <code>dag_id</code>, <code>schedule</code>, <code>catchup</code> — tell you the pipeline's identity and behaviour before you read a single task.",
      why: "The header is the highest-signal part of the file. Reading top-to-bottom wastes time on imports; the <code>DAG()</code> call answers “what is this and how does it run?” in five lines.",
      how: "Find <code>dag_id</code> (its name in the UI), then note it's a context manager (<code>as dag:</code>) so every task indented under it belongs to this DAG.",
      when: "Every time you open a DAG file you didn't write — code review, on-call, onboarding.",
      mistake: "Reading imports first. They're the least informative lines; the <code>DAG()</code> arguments are where the meaning is.",
      interview: "“How do you quickly understand an unfamiliar DAG?” Read the <code>DAG()</code> header first — id, schedule, catchup — then dependencies, then task internals. Show a reading strategy, not line-by-line.",
      example: "One glance at ShopKart's header — <code>ecommerce_daily_ops</code>, <code>schedule=\"0 2 * * *\"</code> — and you know it's the nightly ops pipeline."
    },
    {
      lines: [15, 16, 17], label: "2 · schedule + start_date + catchup",
      what: "These three arguments answer the two questions that matter most: <b>when does it run</b> (<code>schedule</code>, <code>start_date</code>) and <b>will it backfill</b> (<code>catchup</code>)?",
      why: "Cadence and catchup determine the DAG's blast radius. A misread here — thinking it's daily when it's hourly, or missing <code>catchup=True</code> — is how people get surprised by run volume.",
      how: "Read <code>schedule</code> as cron/preset, <code>start_date</code> as the first interval, and confirm <code>catchup=False</code> unless historical backfill is genuinely intended.",
      when: "Immediately after the dag_id, on every DAG read.",
      mistake: "Skipping <code>catchup</code>. An old <code>start_date</code> with <code>catchup=True</code> queues a run for every missed interval the moment it's unpaused.",
      interview: "“Which DAG arguments do you check first for safety?” <code>schedule</code>, <code>start_date</code>, and <code>catchup</code> — together they tell you cadence and whether unpausing floods the scheduler.",
      example: "ShopKart's <code>catchup=False</code> plus a 2 AM cron means one clean run per night — no backfill stampede when it's redeployed."
    },
    {
      lines: [6, 7, 8, 9, 10, 11], label: "3 · Scan default_args for the safety net",
      what: "<code>default_args</code> is a dict applied to <b>every task</b> in the DAG — <code>retries</code>, <code>retry_delay</code>, <code>owner</code>, <code>on_failure_callback</code>. It tells you the DAG's reliability posture at a glance.",
      why: "Reading it once tells you how all the tasks behave on failure, so you don't inspect each operator to learn “does this retry? who gets paged?”",
      how: "Check <code>retries</code>/<code>retry_delay</code> (recovery), <code>on_failure_callback</code> (alerting), and <code>owner</code> (who to ask). Individual tasks can override any of these.",
      when: "Right after the header, to gauge how defensive the DAG is.",
      mistake: "Assuming a task has no retries because its operator doesn't set them — the retry usually lives in <code>default_args</code>, not on the task.",
      interview: "“Where are retries usually configured?” Commonly in <code>default_args</code> so every task inherits them, overridable per task. Knowing inheritance shows real-world familiarity.",
      example: "ShopKart's <code>default_args</code> gives every task 3 retries and an on-call page on final failure — the whole DAG's safety net in four lines."
    },
    {
      lines: [1, 2, 3, 4], label: "4 · Imports name the systems touched",
      what: "The <code>import</code> lines list the operators the DAG uses — <code>PythonOperator</code>, <code>SqlToS3Operator</code> — which tells you <b>what systems it talks to</b> before you read any task.",
      why: "Operators are typed by the system they integrate with. Scanning imports gives you the DAG's external surface (a DB, S3, an API) in seconds.",
      how: "Map each imported operator to a system: <code>SqlToS3Operator</code> → SQL source + S3 sink; a provider path like <code>providers.amazon.aws</code> → AWS.",
      when: "As a quick second pass, to know which integrations are involved.",
      mistake: "Ignoring the provider path in the import — <code>airflow.providers.amazon.aws…</code> immediately tells you this task touches AWS.",
      interview: "“How do you tell what external systems a DAG uses?” Read the operator imports — the provider packages name the integrations (AWS, GCP, Snowflake) without running anything.",
      example: "ShopKart's imports reveal it moves data from SQL to S3 and runs Python logic — its whole integration footprint, from four lines."
    },
    {
      lines: [22, 23, 24, 25, 26, 27], label: "5 · Each operator is one unit of work",
      what: "Every operator instance is one task. Read <code>task_id</code> and the operator <i>type</i> first; the arguments (<code>op_kwargs</code>, <code>pool</code>) are detail you only need when debugging that task.",
      why: "Skimming task_ids and types gives you the DAG's steps quickly; diving into every argument up front is how a five-minute read becomes an hour.",
      how: "For each task, note its <code>task_id</code>, the operator type, and any <code>pool</code>/<code>queue</code> (resource routing). Save the arg details for the task you actually care about.",
      when: "Once you've grasped the DAG's shape and want the individual steps.",
      mistake: "Reading every argument of every task on the first pass. Get the task_ids and order first; drill into args only where needed.",
      interview: "“How do you read the tasks in a large DAG efficiently?” Skim task_ids and operator types for the shape, then drill into a specific task's args — don't linearly read every kwarg.",
      example: "ShopKart's <code>extract_orders</code> (PythonOperator) → <code>load_orders</code> (SqlToS3Operator): two IDs tell the story before any argument does."
    },
    {
      lines: [25, 31, 33], label: "6 · Spot the templated fields",
      what: "<code>{{ ds }}</code>, <code>{{ ds_nodash }}</code> and friends mark the <b>runtime-dynamic</b> parts — the values Airflow fills in per run, usually the date driving reads and writes.",
      why: "Templated fields are where a DAG becomes backfill-safe. Spotting them tells you what changes per run and whether the task is properly date-driven rather than pinned to <code>now()</code>.",
      how: "Scan for <code>{{ }}</code> in operator arguments; each is rendered just before the task executes, using that run's context.",
      when: "When you need to know whether a task is idempotent and backfillable.",
      mistake: "Missing a hard-coded date or <code>now()</code> where a <code>{{ ds }}</code> belongs — the tell that a task will break on backfill.",
      interview: "“How can you tell a task is backfill-safe by reading it?” Its date-driven fields are templated on <code>{{ ds }}</code>, not <code>datetime.now()</code> — the <code>{{ }}</code> markers are the giveaway.",
      example: "ShopKart's <code>load_orders</code> keys both its SQL filter and its S3 path to <code>{{ ds }}</code> — visibly safe to rerun for any date."
    },
    {
      lines: [36], label: "7 · The dependency line is the graph",
      what: "The <code>&gt;&gt;</code> chain (or TaskFlow function calls) at the bottom is the DAG's actual <b>shape</b>. Read it last to see how the tasks connect — here, <code>extract_orders &gt;&gt; load_orders</code>.",
      why: "Task definitions tell you the pieces; the dependency lines tell you the flow. The graph is the whole point of a DAG, so it's what ties your reading together.",
      how: "Trace <code>&gt;&gt;</code> (and lists for fan-out/in, or <code>chain()</code>). In TaskFlow, follow which task's output feeds another's input — that call <i>is</i> the dependency.",
      when: "Last in the read — once you know the tasks, the arrows show the order.",
      mistake: "Assuming file order equals execution order. Tasks run per the dependency graph, not top-to-bottom; only <code>&gt;&gt;</code>/calls define order.",
      interview: "“How do you determine task execution order from DAG code?” Read the dependency operators (<code>&gt;&gt;</code>, <code>chain()</code>) or the TaskFlow call graph — never assume it matches definition order.",
      example: "ShopKart's one dependency line makes the flow unambiguous: extract must finish before load — the read is complete in under a minute."
    }
  ];

  var module = {
    id: "dag-coding",
    title: "Reading & Writing DAGs",
    fullWidth: true,
    _engine: null, _controls: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Coding</div>' +
          '<h1 class="module-title">Reading &amp; writing DAG code</h1>' +
          '<p class="module-subtitle">Two skills every Airflow engineer needs: <b>reading</b> an unfamiliar DAG fast, and <b>writing</b> ' +
          "one without boilerplate. Walk a real ShopKart DAG in the order an expert reads it, then keep the writing idioms handy.</p>" +
        "</div>" +
        '<section class="section">' +
          '<h2 class="section-title">Read a DAG file faster</h2>' +
          '<div class="arch-layout">' +
            '<div class="arch-canvas" id="dc-canvas"></div>' +
            '<aside class="arch-detail" id="dc-detail"></aside>' +
          "</div>" +
          '<div class="arch-controls" id="dc-controls"></div>' +
        "</section>" +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">Code DAGs faster — patterns</h2>' +
          '<div class="cheat-grid" id="dc-patterns"></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout tip"><span class="callout-icon">🧭</span><div class="callout-body">' +
          "<b>Read in this order:</b> header → schedule/catchup → default_args → imports → task_ids → templated fields → dependencies. " +
          "That sequence orients you in about a minute, whatever the DAG's size.</div></div>" +
        "</section>";

      var canvas = container.querySelector("#dc-canvas");
      var detail = container.querySelector("#dc-detail");

      function renderCode(step) {
        canvas.innerHTML = "";
        canvas.appendChild(AV.CodeViewer.create({
          title: "ecommerce_daily_ops.py",
          lang: "python",
          code: DAG_CODE,
          highlights: step ? step.lines : []
        }));
      }

      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">The expert read order</div>' +
          "<p>Press play to walk this DAG the way an experienced engineer reads a new one — not top-to-bottom, but highest-signal first.</p>" +
          '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">⚡</span>' +
          '<div class="callout-body">Most DAGs answer “what, when, how reliable, and in what order” from just a handful of lines.</div></div>';
      }

      function showStep(idx) {
        if (idx < 0) { renderCode(null); defaultDetail(); return; }
        renderCode(STEPS[idx]);
        detail.innerHTML = AV.Explain.render(STEPS[idx]);
      }

      // ── Section B: writing patterns ──────────────────────────
      var patterns = container.querySelector("#dc-patterns");
      PATTERNS.forEach(function (p) {
        var card = document.createElement("section");
        card.className = "cheat-card";
        var h = document.createElement("h3");
        h.className = "cheat-card-title";
        h.innerHTML = p.title;
        card.appendChild(h);
        card.appendChild(AV.CodeViewer.create({ title: p.tag, lang: "python", code: p.code }));
        var why = document.createElement("p");
        why.style.cssText = "margin-top:var(--space-3);font-size:var(--text-sm);color:var(--text-secondary);line-height:1.5";
        why.innerHTML = p.why;
        card.appendChild(why);
        patterns.appendChild(card);
      });

      // ── Section A: engine wiring ─────────────────────────────
      var engine = new AV.AnimationEngine({
        steps: STEPS.map(function (s) { return { label: s.label, duration: 3000 }; }), speed: 1
      });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) { showStep(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#dc-controls").appendChild(controls.el);
      this._controls = controls;
      showStep(-1);
    },

    destroy: function () {
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
    }
  };

  // Writing idioms (Section B). tag → CodeViewer header label.
  var PATTERNS = [
    {
      title: "TaskFlow <code>@task</code>",
      tag: "taskflow",
      code:
        "@task\n" +
        "def transform(orders: list) -> dict:\n" +
        "    return summarize(orders)\n" +
        "\n" +
        "# calling it wires data + deps\n" +
        "summary = transform(extract())",
      why: "The <code>@task</code> decorator turns a function into a task; calling it passes data via XCom <i>and</i> sets the dependency — far less boilerplate than classic operators."
    },
    {
      title: "Shared config with <code>default_args</code>",
      tag: "default_args",
      code:
        "default_args = {\n" +
        "    \"owner\": \"data-eng\",\n" +
        "    \"retries\": 3,\n" +
        "    \"retry_delay\": timedelta(minutes=5),\n" +
        "}\n" +
        "with DAG(..., default_args=default_args):\n" +
        "    ...",
      why: "Set retries, owner, and callbacks once on the DAG and every task inherits them — override per-task only where one genuinely differs."
    },
    {
      title: "Dependencies: <code>&gt;&gt;</code> and <code>chain()</code>",
      tag: "dependencies",
      code:
        "a >> b >> c            # linear\n" +
        "a >> [b, c] >> d       # fan-out / fan-in\n" +
        "\n" +
        "from airflow.models.baseoperator import chain\n" +
        "chain(a, [b, c], d)    # readable for long graphs",
      why: "<code>&gt;&gt;</code> sets order and a list fans out or in; <code>chain()</code> keeps long pipelines readable instead of nested-bracket soup."
    },
    {
      title: "Dynamic fan-out with <code>.expand()</code>",
      tag: "dynamic mapping",
      code:
        "@task\n" +
        "def process(key): ...\n" +
        "\n" +
        "# one task instance per runtime item\n" +
        "process.expand(key=list_files())",
      why: "<code>.expand()</code> builds one task instance per input <i>at runtime</i> — no hard-coded loop, and it sizes itself to today's data."
    },
    {
      title: "Idempotent, date-driven work",
      tag: "templating",
      code:
        "# templated on the run date, never now()\n" +
        "BashOperator(\n" +
        "    task_id=\"export\",\n" +
        "    bash_command=\"aws s3 cp out/ s3://b/{{ ds }}/\",\n" +
        ")",
      why: "Key every read and write to <code>{{ ds }}</code> so a rerun or backfill hits the right day. Idempotency is what makes retries and backfills safe."
    },
    {
      title: "Keep DAG files import-safe",
      tag: "parse-safety",
      code:
        "# BAD - runs on every parse loop\n" +
        "rows = db.query(\"SELECT ...\")\n" +
        "\n" +
        "# GOOD - deferred into a task\n" +
        "@task\n" +
        "def load():\n" +
        "    return db.query(\"SELECT ...\")",
      why: "Top-level I/O runs on <i>every</i> parse and can stall the scheduler. Keep DAG files import-safe: put real work inside tasks, not at module level."
    }
  ];

  AV.registerModule(module);
})();
