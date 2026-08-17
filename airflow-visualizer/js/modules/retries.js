/* ============================================================
   modules/retries.js — retries, exponential backoff, and SLAs
   Animated attempt timeline: each step is a full snapshot.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // idx-driven: each step is a complete snapshot of the attempt history.
  var STEPS = [
    {
      attempts: [{n:1,state:"idle"},{n:2,state:"idle"},{n:3,state:"idle"}],
      delays: [], sla: false,
      label: "1 · Configured: retries=3, retry_delay=5 min",
      desc: "ShopKart's <code>extract_orders</code> task is configured with <code>retries=3</code> and <code>retry_delay=timedelta(minutes=5)</code>. If it fails, Airflow will retry up to three times with growing delays (exponential backoff enabled)."
    },
    {
      attempts: [{n:1,state:"running"},{n:2,state:"idle"},{n:3,state:"idle"}],
      delays: [], sla: false,
      label: "2 · Attempt 1 starts",
      desc: "The first attempt starts running. <code>try_number=1</code>. The task callable is invoked on the worker."
    },
    {
      attempts: [{n:1,state:"failed"},{n:2,state:"idle"},{n:3,state:"idle"}],
      delays: [{after:1, label:"5 min (retry_delay)"}], sla: false,
      label: "3 · Attempt 1 fails → up_for_retry",
      desc: "The callable raises an exception. Since <code>try_number(1) ≤ retries(3)</code>, the task transitions to <span class='state-chip up-for-retry'>up‑for‑retry</span>. <code>on_retry_callback</code> fires. The scheduler waits <code>retry_delay</code> before scheduling attempt 2."
    },
    {
      attempts: [{n:1,state:"failed"},{n:2,state:"running"},{n:3,state:"idle"}],
      delays: [{after:1, label:"5 min (retry_delay)"}], sla: false,
      label: "4 · Attempt 2 — after 5 min delay",
      desc: "After 5 minutes, attempt 2 starts. <code>try_number=2</code>. With <code>retry_exponential_backoff=True</code>, the delay after this attempt will double: 5 × 2¹ = 10 minutes."
    },
    {
      attempts: [{n:1,state:"failed"},{n:2,state:"failed"},{n:3,state:"idle"}],
      delays: [{after:1, label:"5 min"},{after:2, label:"10 min (5 × 2¹, exponential)"}], sla: false,
      label: "5 · Attempt 2 fails — 10 min backoff",
      desc: "Attempt 2 also fails. <code>try_number(2) ≤ retries(3)</code>, so a third retry is scheduled with a 10-minute wait. Exponential backoff reduces thundering-herd pressure on flaky dependencies like rate-limited APIs."
    },
    {
      attempts: [{n:1,state:"failed"},{n:2,state:"failed"},{n:3,state:"success"}],
      delays: [{after:1, label:"5 min"},{after:2, label:"10 min (×2)"}], sla: false,
      label: "6 · Attempt 3 succeeds",
      desc: "The third attempt returns without raising. Task state becomes <span class='state-chip success'>success</span>. <code>on_success_callback</code> fires. Downstream tasks can now start."
    },
    {
      attempts: [{n:1,state:"failed"},{n:2,state:"failed"},{n:3,state:"failed"}],
      delays: [{after:1, label:"5 min"},{after:2, label:"10 min (×2)"}], sla: true,
      label: "7 · All retries exhausted + SLA miss",
      desc: "If <code>try_number</code> exceeds <code>retries</code>, the task becomes <span class='state-chip failed'>failed</span> — no more retries. <code>on_failure_callback</code> fires. Separately, if the total elapsed time (from the DAG's <code>logical_date</code>) exceeds the task's <code>sla</code> timedelta, <code>sla_miss_callback</code> fires — even if the task <i>eventually</i> succeeds."
    }
  ];

  var CODE =
    "from datetime import timedelta\n" +
    "\n" +
    "with DAG('daily_sales_etl', ...) as dag:\n" +
    "    extract_orders = PythonOperator(\n" +
    "        task_id='extract_orders',\n" +
    "        python_callable=extract_fn,\n" +
    "        retries=3,\n" +
    "        retry_delay=timedelta(minutes=5),\n" +
    "        retry_exponential_backoff=True,\n" +
    "        max_retry_delay=timedelta(hours=1),  # cap the doubling\n" +
    "        sla=timedelta(hours=2),              # must finish within 2h of logical_date\n" +
    "        on_retry_callback=on_retry,\n" +
    "        on_failure_callback=on_fail,\n" +
    "    )";

  var REF = [
    ["retries",                   "Number of retry attempts (default 0)"],
    ["retry_delay",               "Fixed delay between attempts (timedelta). Default 5 min."],
    ["retry_exponential_backoff", "If True, delay doubles each retry: retry_delay × 2^(try-1)"],
    ["max_retry_delay",           "Cap on exponential delay — prevents unbounded waits"],
    ["sla",                       "Max timedelta from DAG logical_date to task completion; triggers sla_miss_callback if exceeded"],
    ["sla_miss_callback",         "Fires on the DAG when any task's SLA is breached; receives list of all missed SLAs"]
  ];

  var module = {
    id: "retries",
    title: "Retries & SLAs",
    fullWidth: true,
    _engine: null, _controls: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Operations</div>' +
          '<h1 class="module-title">Retries & SLAs: resilience and time contracts</h1>' +
          '<p class="module-subtitle"><b>Retries</b> give a task multiple attempts with growing delays before marking it failed. ' +
          "<b>SLAs</b> set a wall-clock deadline from the run's logical date — if a task takes too long, an alert fires even if it eventually succeeds.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="rt-canvas"><div class="retry-viz" id="rt-viz"></div></div>' +
          '<aside class="arch-detail" id="rt-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="rt-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">Configuring retries & SLAs</h2>' +
          '<div id="rt-code"></div>' +
        "</section>" +
        '<section class="section">' +
          '<h2 class="section-title">Reference</h2>' +
          '<div class="table-wrap"><table class="cmp-table" id="rt-table"></table></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout tip"><span class="callout-icon">🔁</span><div class="callout-body">' +
          "<b>Retry on specific exceptions only:</b> pass <code>retry_on_exception=lambda e: isinstance(e, RateLimitError)</code> to avoid wasting retries on bugs that won't self-heal.</div></div>" +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<b>DAG-level SLAs:</b> Airflow 3 deprecates task-level <code>sla</code> in favour of DAG-level SLA checks via the alerting framework, giving more flexibility in what triggers the alert.</div></div>" +
        "</section>";

      var viz = container.querySelector("#rt-viz");
      var detail = container.querySelector("#rt-detail");

      function renderViz(step) {
        if (!step) {
          viz.innerHTML =
            '<div class="retry-intro">' +
              '<p>Press play to watch ShopKart\'s <code>extract_orders</code> retry three times with exponential backoff.</p>' +
            "</div>";
          return;
        }
        var html = '<div class="retry-attempts">';
        for (var i = 0; i < step.attempts.length; i++) {
          var a = step.attempts[i];
          var isRunning = a.state === "running";
          var cls = "retry-attempt" +
            (a.state === "success" ? " success" : "") +
            (a.state === "failed"  ? " failed"  : "") +
            (a.state === "running" ? " running" : "") +
            (a.state === "idle"    ? " idle"    : "");
          var chipCls = a.state === "idle" ? "queued" : a.state;
          var chipLabel = a.state === "idle" ? "pending" : a.state;
          html +=
            '<div class="' + cls + '">' +
              '<div class="retry-num">#' + a.n + '</div>' +
              '<div class="retry-info">' +
                '<div class="retry-task-name">extract_orders</div>' +
                '<span class="state-chip ' + chipCls + '">' + chipLabel + "</span>" +
                (isRunning ? '<span class="retry-running-dot"></span>' : "") +
              "</div>" +
            "</div>";
          // Show delay after this attempt if defined
          var delay = null;
          for (var d = 0; d < step.delays.length; d++) {
            if (step.delays[d].after === a.n) { delay = step.delays[d]; break; }
          }
          if (delay) {
            html +=
              '<div class="retry-delay-row">' +
                '<div class="retry-delay-line"></div>' +
                '<span class="retry-delay-label">⏱ ' + delay.label + '</span>' +
                '<div class="retry-delay-line"></div>' +
              "</div>";
          } else if (i < step.attempts.length - 1) {
            html += '<div class="retry-sep"></div>';
          }
        }
        html += "</div>";
        if (step.sla) {
          html +=
            '<div class="retry-sla-marker">' +
              '<span class="retry-sla-icon">⏰</span>' +
              "<b>SLA breach</b> — elapsed time &gt; <code>sla</code> timedelta. <code>sla_miss_callback</code> fires on the DAG." +
            "</div>";
        }
        viz.innerHTML = html;
      }

      function showStep(idx) {
        if (idx < 0) {
          renderViz(null);
          detail.innerHTML =
            '<div class="arch-detail-title">Resilience by default</div>' +
            "<p>Press play to watch the retry lifecycle — three attempts with exponential backoff, followed by the SLA breach scenario.</p>" +
            '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">⚡</span>' +
            '<div class="callout-body">Setting <code>retries=0</code> (the default) means a single failure marks the task as failed immediately. Always set retries for tasks that touch flaky external systems.</div></div>';
          return;
        }
        renderViz(STEPS[idx]);
        detail.innerHTML = '<div class="arch-detail-title">' + STEPS[idx].label + "</div><p>" + STEPS[idx].desc + "</p>";
      }

      container.querySelector("#rt-code").appendChild(AV.CodeViewer.create({
        title: "extract_orders — retries + SLA", lang: "python", code: CODE, highlights: [7, 8, 9, 10, 11]
      }));

      var thead = "<thead><tr><th>Parameter</th><th>What it does</th></tr></thead>";
      container.querySelector("#rt-table").innerHTML = thead + "<tbody>" +
        REF.map(function (r) {
          return "<tr><td class='cmp-dim'><code>" + r[0] + "</code></td><td>" + r[1] + "</td></tr>";
        }).join("") + "</tbody>";

      var engine = new AV.AnimationEngine({
        steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1
      });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) { showStep(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#rt-controls").appendChild(controls.el);
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
