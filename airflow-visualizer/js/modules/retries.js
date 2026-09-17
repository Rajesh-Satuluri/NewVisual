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
      what: "ShopKart's <code>extract_orders</code> task is configured with <code>retries=3</code> and <code>retry_delay=timedelta(minutes=5)</code>, with exponential backoff enabled.",
      why: "External systems fail transiently — an API rate-limits, a network blips. Retries turn a single flake into an automatic recovery instead of a 3&nbsp;AM page.",
      how: "Set <code>retries</code>, <code>retry_delay</code>, and optionally <code>retry_exponential_backoff=True</code> on the operator. Airflow re-runs the task up to <code>retries</code> times, waiting between attempts.",
      when: "On any task that touches a flaky external dependency.",
      mistake: "Leaving <code>retries=0</code> (the default) on a task that hits an API, so one transient blip fails the whole run.",
      interview: "“How do you make a task resilient to a flaky API?” Retries + delay + exponential backoff, plus idempotent logic. This module walks exactly that scenario.",
      example: "ShopKart configures its order-extract with 3 retries and a 5-minute base delay because the upstream orders API occasionally rate-limits at peak."
    },
    {
      attempts: [{n:1,state:"running"},{n:2,state:"idle"},{n:3,state:"idle"}],
      delays: [], sla: false,
      label: "2 · Attempt 1 starts",
      what: "The first attempt starts running with <code>try_number=1</code>; the task callable is invoked on the worker.",
      why: "Every attempt is a full, independent execution — which is exactly why task code must be idempotent, so re-running it is always safe.",
      how: "The worker runs the operator's <code>execute()</code>; <code>try_number</code> identifies this attempt and gives it its own log file.",
      when: "The moment a worker picks up the task for its first try.",
      mistake: "Assuming attempt 1 is somehow special. It isn't — it's just <code>try_number=1</code>, and it can fail and retry like any other.",
      interview: "Know that <code>try_number</code> increments per attempt and each has its own log — it's how you debug a task that only fails intermittently.",
      example: "ShopKart's <code>extract_orders</code> begins attempt 1, connecting to the orders API to pull the day's transactions."
    },
    {
      attempts: [{n:1,state:"failed"},{n:2,state:"idle"},{n:3,state:"idle"}],
      delays: [{after:1, label:"5 min (retry_delay)"}], sla: false,
      label: "3 · Attempt 1 fails → up_for_retry",
      what: "The callable raises. Since <code>try_number(1) ≤ retries(3)</code>, the task goes to <span class='state-chip up-for-retry'>up_for_retry</span>, <code>on_retry_callback</code> fires, and the scheduler waits <code>retry_delay</code>.",
      why: "A transient failure shouldn't be terminal. Moving to up_for_retry (with a callback hook) lets Airflow recover automatically and lets you alert or clean up between tries.",
      how: "On the exception, Airflow compares attempts used against <code>retries</code>; if attempts remain it sets up_for_retry and records the next-eligible time as <code>now + retry_delay</code>.",
      when: "Immediately after an attempt raises, when retries remain.",
      mistake: "Putting heavy cleanup in <code>on_retry_callback</code> that itself fails — a flaky callback can mask the real retry behavior.",
      interview: "“What state does a task enter between retries?” <span class='state-chip up-for-retry'>up_for_retry</span>, after <code>on_retry_callback</code> — not <code>failed</code>. Precise state names matter here.",
      example: "ShopKart's attempt 1 hits an API timeout; the task goes up_for_retry and a Slack <code>on_retry_callback</code> notes the transient failure."
    },
    {
      attempts: [{n:1,state:"failed"},{n:2,state:"running"},{n:3,state:"idle"}],
      delays: [{after:1, label:"5 min (retry_delay)"}], sla: false,
      label: "4 · Attempt 2 — after 5 min delay",
      what: "After 5 minutes, attempt 2 starts with <code>try_number=2</code>. With <code>retry_exponential_backoff=True</code>, the delay after <i>this</i> attempt doubles: 5 × 2¹ = 10 minutes.",
      why: "Backoff spaces out retries so you don't hammer a struggling dependency — the first retry is quick, later ones give the system more room to recover.",
      how: "Airflow computes each wait as <code>retry_delay × 2^(try_number-1)</code>, capped by <code>max_retry_delay</code>. Attempt 2 runs after the base 5&nbsp;min; the next wait grows.",
      when: "After the first retry_delay elapses, for the second attempt.",
      mistake: "Enabling backoff without <code>max_retry_delay</code>, so a task with many retries eventually waits hours between attempts.",
      interview: "“How does exponential backoff compute its delays?” <code>retry_delay × 2^(try−1)</code>, capped by <code>max_retry_delay</code>. Reciting the formula shows you've actually used it.",
      example: "ShopKart's attempt 2 runs 5 minutes after the first failure; because backoff is on, the next wait will be 10 minutes."
    },
    {
      attempts: [{n:1,state:"failed"},{n:2,state:"failed"},{n:3,state:"idle"}],
      delays: [{after:1, label:"5 min"},{after:2, label:"10 min (5 × 2¹, exponential)"}], sla: false,
      label: "5 · Attempt 2 fails — 10 min backoff",
      what: "Attempt 2 also fails. Since <code>try_number(2) ≤ retries(3)</code>, a third retry is scheduled with a <b>10-minute</b> wait (5 × 2¹).",
      why: "Exponential backoff reduces thundering-herd pressure on flaky dependencies like rate-limited APIs — the growing gap gives them time to recover before you try again.",
      how: "Airflow again checks attempts against <code>retries</code>, sets up_for_retry, and schedules attempt 3 after the doubled delay. Each failure widens the next gap.",
      when: "After the second attempt raises, with one retry still remaining.",
      mistake: "Setting <code>retries</code> very high on a genuinely broken dependency, so the task limps through many long backoffs instead of failing fast and paging someone.",
      interview: "“When is backoff the wrong tool?” When the failure is permanent (a bug, bad credentials) — backoff just delays the inevitable. Knowing when <i>not</i> to retry is senior-level.",
      example: "ShopKart's attempt 2 fails again; a third attempt is queued for 10 minutes later as the API continues to rate-limit."
    },
    {
      attempts: [{n:1,state:"failed"},{n:2,state:"failed"},{n:3,state:"success"}],
      delays: [{after:1, label:"5 min"},{after:2, label:"10 min (×2)"}], sla: false,
      label: "6 · Attempt 3 succeeds",
      what: "The third attempt returns without raising. Task state becomes <span class='state-chip success'>success</span>, <code>on_success_callback</code> fires, and downstream tasks can start.",
      why: "This is the happy path retries exist for: a transient problem cleared, and the pipeline recovered on its own with no human involved.",
      how: "The worker records <code>success</code>, writes any XCom, and the scheduler re-evaluates downstream trigger rules to unblock the next tasks.",
      when: "When a retry attempt finally completes cleanly.",
      mistake: "Not making the task idempotent, so three attempts that each partially wrote data leave duplicates when the third finally succeeds.",
      interview: "“Why must a retried task be idempotent?” Because attempts 1–2 may have partially run — only idempotent logic guarantees the successful attempt leaves correct state.",
      example: "ShopKart's attempt 3 connects cleanly, extracts the orders, and the reconcile task downstream becomes eligible — no page was ever sent."
    },
    {
      attempts: [{n:1,state:"failed"},{n:2,state:"failed"},{n:3,state:"failed"}],
      delays: [{after:1, label:"5 min"},{after:2, label:"10 min (×2)"}], sla: true,
      label: "7 · All retries exhausted + SLA miss",
      what: "If <code>try_number</code> exceeds <code>retries</code>, the task becomes <span class='state-chip failed'>failed</span> and <code>on_failure_callback</code> fires. Separately, if elapsed time from <code>logical_date</code> exceeds the task's <code>sla</code>, <code>sla_miss_callback</code> fires — even if the task <i>eventually</i> succeeds.",
      why: "Retries handle <i>failure</i>; SLAs handle <i>lateness</i>. They're independent — a task can succeed on retry 3 yet still breach its time contract, and you want to know about both.",
      how: "On the final failure Airflow marks <code>failed</code> and runs the failure callback. The SLA check compares wall-clock elapsed since <code>logical_date</code> against the <code>sla</code> timedelta and fires <code>sla_miss_callback</code> independently.",
      when: "When retries run out (failure), and/or when the SLA deadline passes (lateness).",
      mistake: "Conflating retries and SLAs — thinking a passing task can't miss its SLA. It can: three slow retries can blow the deadline even on eventual success.",
      interview: "“Retries vs SLAs — how do they differ?” Retries re-run on failure; SLAs alert on lateness, independently. That distinction is a common interview probe.",
      example: "ShopKart's task succeeds on retry 3 but took 2.5 hours; because its <code>sla</code> is 2 hours, the <code>sla_miss_callback</code> still pages the on-call about the delay."
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
        detail.innerHTML = AV.Explain.render(STEPS[idx]);
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
