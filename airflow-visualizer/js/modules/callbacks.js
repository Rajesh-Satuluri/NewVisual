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
      what: "Callbacks are plain Python callables you attach to a <b>task</b> (or the <b>DAG</b>) that fire automatically at lifecycle events. Each receives the same <code>context</code> dict — <code>ti</code>, <code>dag_run</code>, <code>ds</code>, <code>params</code>, <code>exception</code>, and more.",
      why: "They separate <i>what a task does</i> from <i>what happens around it</i>. Alerting, cleanup, and external notifications live in callbacks, so the task body stays focused on its actual work.",
      how: "Pass a function to <code>on_success_callback</code>, <code>on_failure_callback</code>, and friends. Airflow invokes it with the context at the matching moment in the task's life.",
      when: "Any cross-cutting reaction to a task's outcome — notify, log, page, clean up.",
      mistake: "Putting alerting logic <i>inside</i> the task body, so it never fires when the task fails before reaching that line. Callbacks fire on the lifecycle event regardless.",
      interview: "“Where do you put failure alerting in Airflow?” In <code>on_failure_callback</code> (task- or DAG-level), not the task body — so it fires even when the body raises early.",
      example: "ShopKart wires every task to the same context-aware callbacks, so alerts carry the run_id and exception with no per-task boilerplate."
    },
    {
      from: "queued", to: "running", cb: "on_execute_callback", cbCls: "airflow",
      label: "2 · on_execute_callback",
      what: "Fires <b>before</b> the task body runs — the task has started but your callable hasn't executed yet. Use it to emit a “task started” event, acquire an external lock, or record metadata to an observability platform.",
      why: "Some side effects must happen at the <i>boundary</i> of execution — claiming a resource, marking a run in-flight — before any work begins, and this is the only hook at that point.",
      how: "Set <code>on_execute_callback=fn</code> on the operator. Airflow calls <code>fn(context)</code> right as the task transitions into running, before the operator's <code>execute()</code>.",
      when: "Pre-flight side effects: locks, “started” pings, timing spans.",
      mistake: "Assuming it fires at <i>queue</i> time. It fires at the start of <i>execution</i>, after the task has left the queue and a worker picks it up.",
      interview: "“Which callback fires before the task actually does its work?” <code>on_execute_callback</code> — useful for locks and start events. It's newer than the others, so worth naming.",
      example: "ShopKart's <code>on_execute_callback</code> opens a distributed lock so two runs of the warehouse-load task can never overlap."
    },
    {
      from: "running", to: "success", cb: "on_success_callback", cbCls: "green",
      label: "3 · on_success_callback",
      what: "Fires when the task returns without raising. The canonical hook for notifying stakeholders — posting metrics to Datadog, sending a Slack message, or updating a data-catalog entry.",
      why: "Success is worth announcing too: downstream teams, dashboards, and catalogs often need to know a dataset is fresh, not just hear when something broke.",
      how: "Set <code>on_success_callback=fn</code>. Airflow calls it with the context after the operator's <code>execute()</code> returns cleanly.",
      when: "“Data is ready” notifications, freshness metrics, success audit trails.",
      mistake: "Doing heavy work in a success callback. It runs on the worker in the task's slot — a slow callback delays freeing that slot and can itself fail the run.",
      interview: "“How would you notify a team that a dataset finished loading?” <code>on_success_callback</code> posting to Slack/catalog — keep it lightweight so it doesn't hold the slot.",
      example: "ShopKart's load task fires an <code>on_success_callback</code> that stamps the catalog “orders refreshed at {{ ts }}” so analysts trust the data is current."
    },
    {
      from: "running", to: "up-for-retry", cb: "on_retry_callback", cbCls: "orange",
      label: "4 · on_retry_callback",
      what: "Fires each time a task fails <i>with retries remaining</i>. Use it to log the attempt count, annotate an incident, or do partial cleanup before the next attempt. <code>context['exception']</code> carries the caught error.",
      why: "A retry is a soft failure worth observing — repeated retries are an early warning even when the task eventually succeeds. Silent retries hide a degrading dependency.",
      how: "Set <code>on_retry_callback=fn</code>. Airflow calls it on each failed attempt that still has budget left under the task's <code>retries</code>.",
      when: "Tracking flakiness, cleaning up partial state between attempts, annotating incidents.",
      mistake: "Confusing it with <code>on_failure_callback</code>. Retry fires while attempts remain; failure fires only when they're exhausted. Wiring paging here floods on-call.",
      interview: "“What's the difference between on_retry_callback and on_failure_callback?” Retry fires per failed attempt with budget left; failure fires once, when retries are exhausted.",
      example: "ShopKart's <code>on_retry_callback</code> bumps a “flaky API” metric each attempt, surfacing a degrading vendor before it fully fails the pipeline."
    },
    {
      from: "running", to: "failed", cb: "on_failure_callback", cbCls: "red",
      label: "5 · on_failure_callback",
      what: "Fires when the task fails <b>with no retries left</b>. This is where you page on-call, open a ticket, or roll back partial side effects. It can also be set at the <b>DAG level</b> to catch any task's final failure.",
      why: "The terminal failure is the moment that demands human attention or compensating action — the one event you never want to miss, so it gets first-class alerting.",
      how: "Set <code>on_failure_callback</code> on the task, or on the <code>DAG()</code> to cover every task. Airflow calls it once, after the last retry is exhausted.",
      when: "Paging, incident creation, rollback of partial writes.",
      mistake: "Setting it per-task everywhere and forgetting the DAG-level fallback — a newly added task without the callback then fails silently.",
      interview: "“How do you ensure every task in a DAG alerts on final failure?” Set <code>on_failure_callback</code> on the DAG, not just per task — one place covers them all.",
      example: "ShopKart sets a DAG-level <code>on_failure_callback</code> that pages on-call with the failing task_id and exception, so no failure slips through."
    },
    {
      from: null, to: null, cb: "sla_miss_callback", cbCls: "yellow",
      label: "6 · sla_miss_callback (DAG-level)",
      what: "Fires when a task's <code>sla</code> timedelta is exceeded. Defined on the <b>DAG object</b>, not individual tasks, and receives the full list of missed SLAs so you can batch-alert instead of flooding the channel.",
      why: "An SLA miss is about <i>lateness</i>, not failure — a task can succeed but too late to matter. This hook catches the “it finished, but after the deadline” case the others don't.",
      how: "Set <code>sla_miss_callback</code> on the DAG and <code>sla=timedelta(...)</code> on tasks. When a task blows its SLA, Airflow batches the misses and calls the handler with all of them.",
      when: "Deadline monitoring — “the report must be ready by 8am” style guarantees.",
      mistake: "Treating SLA misses like failures. The task may be <span class='state-chip success'>success</span>; it just ran late. Wiring the failure pager here misclassifies the incident.",
      interview: "“How do you alert when a task runs but misses its deadline?” Task-level <code>sla</code> + DAG-level <code>sla_miss_callback</code> — distinct from failure callbacks, which fire only on error.",
      example: "ShopKart's revenue report has an 8am <code>sla</code>; if it's late the DAG's <code>sla_miss_callback</code> warns the analytics lead before the stale dashboard is noticed."
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
        detail.innerHTML = AV.Explain.render(s);
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
