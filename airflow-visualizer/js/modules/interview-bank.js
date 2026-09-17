/* ============================================================
   modules/interview-bank.js — the interview question bank
   Complements the concept-focused "Interview Q&A" module with
   two rehearsal sets, switched by a tab:
     • Scenario-based — "how would you…" design/debug/ops prompts,
       each with what's being tested + how to answer.
     • Community-sourced — the questions people actually report
       being asked, tagged by where they commonly appear.
   Framed as rehearsal (vs the Study Deck's recall self-test),
   with cross-links to both.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // Scenario / system-design prompts: { q, testing, answer }.
  var SCENARIOS = [
    {
      q: "Design a daily pipeline that loads yesterday's orders into the warehouse — and is safe to re-run.",
      testing: "Whether you build for idempotency and backfills, not just the happy path.",
      answer: "Schedule <code>@daily</code> with <code>catchup=False</code>; template every read and write on <code>{{ ds }}</code> so each run owns one clean interval. Make the load <b>idempotent</b> — delete-then-insert, or <code>MERGE</code> keyed on the date — so a retry or backfill can't double-count. Add <code>retries</code> with backoff for the flaky source, wire <code>extract &gt;&gt; transform &gt;&gt; load</code>, and put alerting in <code>on_failure_callback</code>. Say “idempotency” and “<code>{{ ds }}</code>” out loud — that's what they're listening for."
    },
    {
      q: "A task shows running in the UI but nothing is happening. Walk me through debugging it.",
      testing: "A systematic diagnosis, not guesswork — do you know the failure modes?",
      answer: "Separate the two classic cases. If the worker died, it's a <b>zombie</b>: the heartbeat goes stale and the scheduler reaps it after <code>scheduler_zombie_task_threshold</code> — check worker/pod health and OOM kills. If it never actually started, it's <b>stuck in queued</b>: check executor and pool <code>open_slots</code>, <code>parallelism</code>, and (Celery) that a worker subscribes to the task's queue. Read the task log per <code>try_number</code> and the scheduler heartbeat. Naming “zombie vs stuck-in-queued” explicitly is what scores."
    },
    {
      q: "You must process a number of files that isn't known until runtime. How do you build it?",
      testing: "Whether you reach for dynamic task mapping instead of a parse-time loop.",
      answer: "Use <b>dynamic task mapping</b>: an upstream task returns the file list, and a mapped task <code>process.expand(key=list_files())</code> creates one instance per file <i>at runtime</i> — each with its own <code>map_index</code>, log, and retries. A downstream task reduces the results. The key point: a parse-time <code>for</code> loop can't do this because the count isn't known until the run — and <code>max_map_length</code> caps the fan-out."
    },
    {
      q: "Your DAG must not open more than 5 concurrent connections to a fragile source DB. How?",
      testing: "Knowing pools are the cross-DAG concurrency throttle.",
      answer: "Create a <b>pool</b> with 5 slots and give the DB-touching tasks <code>pool='source_db'</code>. The scheduler then runs at most 5 at once and queues the rest — across <i>every</i> DAG, which per-DAG knobs like <code>max_active_tasks</code> can't guarantee. Mention that pools protect a shared resource, and that <code>pool_slots</code> lets one heavy task count as more than one slot."
    },
    {
      q: "You fixed a transform bug and must reprocess 3 months of history — without melting the cluster. How?",
      testing: "Controlled backfill: bounded scope + throttled concurrency + idempotency.",
      answer: "Run a bounded <code>airflow dags backfill -s START -e END</code> (add <code>--reset-dagruns</code> to redo existing runs). Throttle it with <code>max_active_runs</code> and pool slots so it processes a few days at a time, not hundreds at once. It only works because tasks are idempotent and templated on <code>{{ ds }}</code>, so each historical run recomputes its own day. Contrast with catchup, which is all-or-nothing from <code>start_date</code>."
    },
    {
      q: "DAG B should run only after DAG A produces its data. How do you wire cross-DAG dependencies?",
      testing: "Do you know the modern data-aware approach and its alternatives?",
      answer: "Preferred: <b>data-aware scheduling</b> — DAG A's task produces an <b>Asset/Dataset</b> and DAG B is scheduled on it, so B runs when the data is actually ready, not on a guessed clock offset. Alternatives: an <code>ExternalTaskSensor</code> in B waiting on A's task (brittle — it couples the two schedules), or a <code>TriggerDagRunOperator</code> at the end of A. Lead with Assets and explain why sensor-on-schedule coupling is fragile."
    },
    {
      q: "A 'send status report' task must run whether the pipeline succeeded or failed. How?",
      testing: "Trigger rules — most candidates only know the default all_success.",
      answer: "Set <code>trigger_rule='all_done'</code> on the report task so it fires once every upstream finishes, regardless of outcome. For a failure-only alert use <code>one_failed</code>; for “continue unless everything failed” use <code>none_failed_min_one_success</code>. Explain that the default <code>all_success</code> would <i>skip</i> the report exactly when you need it most — on failure."
    },
    {
      q: "How would you set up alerting so on-call hears about failures immediately?",
      testing: "Where alerting belongs, and failure vs lateness.",
      answer: "Put alerting in <code>on_failure_callback</code> (task- or DAG-level) so it fires even when the task body raises unexpectedly — never bury it inside the task. Route to Slack/PagerDuty from the callback using the run context (task_id, run_id, exception). Add a task-level <code>sla</code> plus a DAG-level <code>sla_miss_callback</code> to catch <i>lateness</i> (a task that succeeds but too late). Set the failure callback at DAG level so new tasks are covered by default."
    }
  ];

  // Community-sourced questions: { q, a, src }. src = where it's commonly asked.
  var COMMUNITY = [
    {
      q: "What is Apache Airflow and what problem does it solve?", src: "DataCamp",
      a: "An open-source platform to author, schedule, and monitor workflows <i>as code</i>. You define pipelines as <b>DAGs</b> of tasks with dependencies; Airflow schedules them, runs them on workers, retries failures, and gives you a UI plus history. It orchestrates <i>other</i> systems — a conductor, not a data-processing engine."
    },
    {
      q: "Explain Operator vs Task vs Task Instance.", src: "ProjectPro",
      a: "An <b>Operator</b> is a template for one unit of work (e.g. <code>PythonOperator</code>). Placed in a DAG it becomes a <b>Task</b> (a graph node). When the DAG runs for a specific <code>logical_date</code>, that task becomes a <b>Task Instance</b> — the concrete, stateful execution with a <code>try_number</code>."
    },
    {
      q: "How do tasks share data, and what's the limit?", src: "GitHub · OBenner",
      a: "Via <b>XCom</b> — small key/values in the metadata DB, returned by one task and pulled by another (implicitly in TaskFlow). The limit: it's for <i>small</i> values. Don't push a DataFrame or file through XCom; pass a pointer (an S3 key, a table name) and let the next task fetch it."
    },
    {
      q: "What is logical_date (execution_date), and why does a run look 'a day behind'?", src: "MindMajix",
      a: "<code>logical_date</code> is the start of the data interval a run represents, not wall-clock time. A daily run for Jan 15 fires at the <i>end</i> of the interval (early Jan 16) so the day's data is complete. Template on <code>{{ ds }}</code> so tasks process the interval they represent — the basis of safe backfills."
    },
    {
      q: "How does Airflow handle task failures and retries?", src: "Datavidhya",
      a: "Set <code>retries</code> and <code>retry_delay</code> (optionally <code>retry_exponential_backoff</code>, capped by <code>max_retry_delay</code>). A failed-but-retryable task sits <span class='state-chip up-for-retry'>up_for_retry</span> and only becomes <span class='state-chip failed'>failed</span> after exhausting retries. Pair with idempotency so re-runs are safe, and <code>on_failure_callback</code> for alerting."
    },
    {
      q: "What executor types are there and how do they differ?", src: "DataCamp",
      a: "<b>Local</b> (subprocesses on one host — dev/small), <b>Celery</b> (warm worker pool + broker — low latency, scales out, idle cost), and <b>Kubernetes</b> (one pod per task — isolation and per-task resources, pod-startup latency). The scheduler is identical; only the executor changes where tasks run."
    },
    {
      q: "How do you schedule a DAG, and what does catchup do?", src: "ProjectPro",
      a: "Set <code>schedule</code> to a cron string, a preset (<code>@daily</code>), a <code>timedelta</code>, or an Asset. <code>catchup=True</code> makes unpausing create a run for every missed interval since <code>start_date</code> — a stampede risk — so most teams use <code>catchup=False</code> plus explicit backfills."
    },
    {
      q: "What is a Sensor? Compare poke, reschedule, and deferrable.", src: "Medium",
      a: "A <b>sensor</b> waits for a condition (a file, a partition, a time). <b>poke</b> holds a worker slot the whole wait; <b>reschedule</b> frees the slot between checks; <b>deferrable</b> hands the wait to the async <b>triggerer</b> and frees the slot entirely — best for long or numerous waits."
    },
    {
      q: "How do you manage secrets and connections securely?", src: "GitHub · OBenner",
      a: "Never hard-code them. Store them as <b>Connections</b>/<b>Variables</b> (Fernet-encrypted at rest); better still, configure a <b>secrets backend</b> (AWS/GCP Secret Manager, Vault) so Airflow fetches them at runtime and they never sit in the DB. Reference by <code>conn_id</code> in hooks and operators."
    },
    {
      q: "How do you monitor Airflow in production?", src: "MindMajix",
      a: "Alert first on the <b>scheduler heartbeat</b> (stale = nothing schedules) and the <b>task failure rate</b>. Also watch DAG-parse time, pool <code>open_slots</code>/queued backlog, task duration vs baseline (SLA drift), and metadata-DB connections. Export metrics via StatsD/OpenTelemetry to Prometheus/Grafana."
    }
  ];

  var TABS = [
    ["scenario", "🧩 Scenario-based", "Design, debug, and ops prompts from senior / system-design rounds — each with what's being tested and how to answer."],
    ["community", "🌐 Community-sourced", "The questions candidates actually report being asked in screening rounds, tagged by where they commonly appear."]
  ];

  function scenarioCard(s, i) {
    return '<div class="qa-item">' +
      '<button class="qa-q" aria-expanded="false" data-idx="s' + i + '">' +
        '<span class="qa-q-text">' + s.q + "</span>" +
        '<span class="qa-toggle">+</span>' +
      "</button>" +
      '<div class="qa-a" hidden>' +
        '<div class="arch-detail-sub">What they\'re testing</div><p>' + s.testing + "</p>" +
        '<div class="arch-detail-sub">How to answer</div><p>' + s.answer + "</p>" +
      "</div>" +
    "</div>";
  }

  function communityCard(c, i) {
    return '<div class="qa-item">' +
      '<button class="qa-q" aria-expanded="false" data-idx="c' + i + '">' +
        '<span class="qa-q-text">' + c.q + ' <span class="badge ib-src">' + c.src + "</span></span>" +
        '<span class="qa-toggle">+</span>' +
      "</button>" +
      '<div class="qa-a" hidden><p>' + c.a + "</p></div>" +
    "</div>";
  }

  var module = {
    id: "interview-bank",
    title: "Interview Question Bank",
    fullWidth: true,
    _root: null, _handler: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Interview Prep</div>' +
          '<h1 class="module-title">Interview question bank</h1>' +
          '<p class="module-subtitle">' + (SCENARIOS.length + COMMUNITY.length) + " prompts to <b>rehearse</b> with — scenario and system-design questions plus the ones candidates actually report being asked. " +
          "Click any question to reveal how to answer it.</p>" +
        "</div>" +
        '<div class="callout tip"><span class="callout-icon">🎯</span><div class="callout-body">' +
          "<b>Study Deck vs Interview Bank.</b> The <a href=\"#study\">Study Deck</a> is for <i>recall</i> — self-test that you know each concept. This bank is for <i>rehearsal</i> — practising how a real prompt is phrased and what a strong spoken answer sounds like. For crisp concept explanations, see the <a href=\"#interview\">Interview Q&amp;A</a>." +
        "</div></div>" +
        '<div class="exec-toggle" id="ib-toggle" role="tablist">' +
          TABS.map(function (t, i) {
            return '<button class="exec-tab' + (i === 0 ? " active" : "") + '" role="tab" data-tab="' + t[0] + '">' + t[1] + "</button>";
          }).join("") +
        "</div>" +
        '<p class="ib-tabnote" id="ib-tabnote" style="color:var(--text-secondary);font-size:var(--text-sm);margin:var(--space-3) 0">' + TABS[0][2] + "</p>" +
        '<div class="qa-list" id="ib-scenario">' + SCENARIOS.map(scenarioCard).join("") + "</div>" +
        '<div class="qa-list" id="ib-community" style="display:none">' + COMMUNITY.map(communityCard).join("") + "</div>" +
        '<section class="section" style="margin-top:var(--space-8)">' +
          '<div class="callout info"><span class="callout-icon">📚</span><div class="callout-body">' +
          "Rehearsed these? Reinforce the fundamentals in the <a href=\"#study\">Study Deck</a>, or read the concept-by-concept <a href=\"#interview\">Interview Q&amp;A</a>. Community questions are tagged by the sources that commonly publish them.</div></div>" +
        "</section>";

      var tabnote = container.querySelector("#ib-tabnote");
      var panels = {
        scenario: container.querySelector("#ib-scenario"),
        community: container.querySelector("#ib-community")
      };
      this._root = container;

      function onClick(e) {
        var tab = e.target.closest(".exec-tab");
        if (tab) {
          var key = tab.getAttribute("data-tab");
          container.querySelectorAll(".exec-tab").forEach(function (b) {
            b.classList.toggle("active", b === tab);
          });
          panels.scenario.style.display = key === "scenario" ? "flex" : "none";
          panels.community.style.display = key === "community" ? "flex" : "none";
          TABS.forEach(function (t) { if (t[0] === key) tabnote.innerHTML = t[2]; });
          return;
        }
        var q = e.target.closest(".qa-q");
        if (q) {
          var item = q.parentNode;
          var ans = item.querySelector(".qa-a");
          var open = q.getAttribute("aria-expanded") === "true";
          q.setAttribute("aria-expanded", open ? "false" : "true");
          ans.hidden = open;
          q.querySelector(".qa-toggle").textContent = open ? "+" : "−";
          item.classList.toggle("qa-open", !open);
        }
      }

      this._handler = onClick;
      container.addEventListener("click", onClick);
    },

    destroy: function () {
      if (this._root && this._handler) this._root.removeEventListener("click", this._handler);
      this._root = null; this._handler = null;
    }
  };

  AV.registerModule(module);
})();
