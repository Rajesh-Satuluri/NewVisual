/* ============================================================
   modules/callbacks.js — task and DAG lifecycle callbacks
   Bespoke state-transition + callback pill visual.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var STEPS = [
    {
      from: null, to: null, cb: null, cbCls: null,
      label: "1 · What callbacks are",
      desc: "Airflow callbacks are plain Python callables attached to a <b>task</b> (or the <b>DAG</b>) that fire automatically at lifecycle events. Each callback receives the same <code>context</code> dict — <code>ti</code>, <code>dag_run</code>, <code>ds</code>, <code>ts</code>, <code>params</code>, <code>conf</code>, and more."
    },
    {
      from: "queued", to: "running", cb: "on_execute_callback", cbCls: "airflow",
      label: "2 · on_execute_callback",
      desc: "Fires <b>before</b> the task body runs — the task has started but the callable hasn't been called yet. Use it to emit a 'task started' event, acquire external locks, or log metadata to an observability platform."
    },
    {
      from: "running", to: "success", cb: "on_success_callback", cbCls: "green",
      label: "3 · on_success_callback",
      desc: "Fires when the task returns without raising. The canonical hook for notifying stakeholders, posting metrics to Datadog, sending Slack messages, or updating a data catalog entry."
    },
    {
      from: "running", to: "up-for-retry", cb: "on_retry_callback", cbCls: "orange",
      label: "4 · on_retry_callback",
      desc: "Fires each time a task fails <i>with retries remaining</i>. Use it to log attempt counts, annotate an incident, or do partial cleanup before the next attempt. <code>context['exception']</code> carries the caught exception."
    },
    {
      from: "running", to: "failed", cb: "on_failure_callback", cbCls: "red",
      label: "5 · on_failure_callback",
      desc: "Fires when the task fails <b>with no retries left</b>. This is where you page on-call, file JIRA tickets, or roll back partial side effects. Can also be set at the DAG level to catch <i>any</i> task failure in that DAG."
    },
    {
      from: null, to: null, cb: "sla_miss_callback", cbCls: "yellow",
      label: "6 · sla_miss_callback (DAG-level)",
      desc: "Fires when any task's <code>sla</code> timedelta is exceeded. Defined on the <b>DAG object</b>, not individual tasks. Receives the full list of missed SLAs so you can batch-alert rather than flood your incident channel."
    }
  ];

  var CODE =
    "def on_fail(context):\n" +
    "    ti      = context['ti']           # TaskInstance\n" +
    "    dag_run = context['dag_run']\n" +
    "    exc     = context.get('exception')\n" +
    "    send_slack(\n" +
    "        f\"{ti.task_id} failed on {dag_run.run_id}: {exc}\"\n" +
    "    )\n" +
    "\n" +
    "with DAG('daily_sales_etl', on_failure_callback=on_fail) as dag:\n" +
    "    extract = PythonOperator(\n" +
    "        task_id='extract_orders',\n" +
    "        python_callable=extract_fn,\n" +
    "        on_execute_callback=on_execute,   # fires before task body\n" +
    "        on_success_callback=on_success,\n" +
    "        on_retry_callback=on_retry,\n" +
    "        on_failure_callback=on_fail,      # overrides DAG-level\n" +
    "    )";

  var CTX = [
    ["ti",              "The current TaskInstance object"],
    ["dag_run",         "The current DagRun object"],
    ["dag",             "The DAG object"],
    ["ds",              "Execution date as YYYY-MM-DD string"],
    ["ts",              "Execution timestamp in ISO 8601"],
    ["next_ds / prev_ds", "Adjacent schedule-interval dates"],
    ["params",          "Dict of DAG/task parameters (rendered)"],
    ["conf",            "DagRun conf dict (from trigger)"],
    ["run_id",          "The dag_run.run_id string"],
    ["exception",       "Caught exception (failure / retry callbacks only)"]
  ];

  var module = {
    id: "callbacks",
    title: "Callbacks",
    fullWidth: true,
    _engine: null, _controls: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Internals</div>' +
          '<h1 class="module-title">Callbacks: lifecycle hooks for tasks and DAGs</h1>' +
          '<p class="module-subtitle">Callbacks let you run custom Python at each lifecycle event — on start, success, failure, retry, or SLA miss — ' +
          "without touching the task body itself. The canonical place for alerting, cleanup, and external integrations.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="cb-canvas"><div class="cb-viz" id="cb-viz"></div></div>' +
          '<aside class="arch-detail" id="cb-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="cb-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">Attaching callbacks</h2>' +
          '<div id="cb-code"></div>' +
        "</section>" +
        '<section class="section">' +
          '<h2 class="section-title">The context dict</h2>' +
          '<div class="table-wrap"><table class="cmp-table" id="cb-ctx"></table></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout tip"><span class="callout-icon">💡</span><div class="callout-body">' +
          "<b>DAG-level fallback:</b> setting <code>on_failure_callback</code> on the <code>DAG()</code> constructor catches failures from <i>every</i> task in that DAG, so you don't need to repeat it on every operator.</div></div>" +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<b>on_skipped_callback:</b> Airflow 3 adds a dedicated callback for skipped tasks, so you can react to conditional skips without overloading the failure path.</div></div>" +
        "</section>";

      var viz = container.querySelector("#cb-viz");
      var detail = container.querySelector("#cb-detail");

      function renderViz(step) {
        if (!step || !step.cb) {
          viz.innerHTML =
            '<div class="cb-intro">' +
              '<div class="cb-intro-icon">🔔</div>' +
              '<div class="cb-intro-text">Press play to walk through each callback type and when it fires.</div>' +
              '<div class="cb-ctx-keys">' +
                '<span class="cb-ctx-label">context dict — available in every callback:</span>' +
                '<code>ti</code> &middot; <code>dag_run</code> &middot; <code>dag</code> &middot; ' +
                '<code>ds</code> &middot; <code>ts</code> &middot; <code>params</code> &middot; <code>exception</code>' +
              "</div>" +
            "</div>";
          return;
        }
        var transition;
        if (step.from) {
          var fromLabel = step.from.replace(/-/g, "‑");
          var toLabel   = step.to.replace(/-/g, "‑");
          transition =
            '<span class="state-chip ' + step.from + '">' + fromLabel + "</span>" +
            '<span class="cb-arrow">&#8594;</span>' +
            '<span class="state-chip ' + step.to + '">' + toLabel + "</span>";
        } else {
          transition = '<span class="cb-dag-event">DAG-level event</span>';
        }
        viz.innerHTML =
          '<div class="cb-transition">' + transition + "</div>" +
          '<div class="cb-fires-row">' +
            '<div class="cb-fires-label">fires</div>' +
            '<div class="cb-pill cb-pill-' + step.cbCls + '">' + step.cb + "</div>" +
          "</div>";
      }

      function showStep(idx) {
        if (idx < 0) {
          renderViz(null);
          detail.innerHTML =
            '<div class="arch-detail-title">Six hooks, one pattern</div>' +
            "<p>Each callback is a plain Python function that receives the same <code>context</code> dict. Press play to see each one and when it fires.</p>";
          return;
        }
        var s = STEPS[idx];
        renderViz(s);
        detail.innerHTML = '<div class="arch-detail-title">' + s.label + "</div><p>" + s.desc + "</p>";
      }

      container.querySelector("#cb-code").appendChild(AV.CodeViewer.create({
        title: "daily_sales_etl — callbacks",
        lang: "python",
        code: CODE,
        highlights: [13, 14, 15, 16]
      }));

      var head = "<thead><tr><th>Key</th><th>What it contains</th></tr></thead>";
      container.querySelector("#cb-ctx").innerHTML = head + "<tbody>" +
        CTX.map(function (r) {
          return "<tr><td class='cmp-dim'><code>" + r[0] + "</code></td><td>" + r[1] + "</td></tr>";
        }).join("") + "</tbody>";

      var engine = new AV.AnimationEngine({
        steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1
      });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) { showStep(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#cb-controls").appendChild(controls.el);
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
