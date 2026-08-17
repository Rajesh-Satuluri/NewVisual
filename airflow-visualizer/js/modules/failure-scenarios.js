/* ============================================================
   modules/failure-scenarios.js — production failure playbook
   Idx-driven: each step is one scenario (symptom → cause → fix).
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var SCENARIOS = [
    {
      icon: "🧟", sev: "failed", sevLabel: "stuck",
      title: "Zombie tasks",
      symptom: "A task shows <span class='state-chip running'>running</span> in the UI, but the process is dead. It never completes and blocks downstream tasks.",
      cause: "The worker running the task died (OOM kill, pod eviction, node reboot) without reporting back. The scheduler's heartbeat for that task instance goes stale.",
      fix: "The scheduler's <b>zombie detection</b> reaps it after <code>scheduler_zombie_task_threshold</code> (default 300 s), marking it <span class='state-chip up-for-retry'>up-for-retry</span>. Set <code>retries</code> so it recovers automatically. Root-cause the worker death via memory limits."
    },
    {
      icon: "💤", sev: "queued", sevLabel: "not starting",
      title: "Tasks stuck in queued",
      symptom: "Tasks sit in <span class='state-chip queued'>queued</span> forever and never move to <span class='state-chip running'>running</span>.",
      cause: "No executor slot is free: <code>parallelism</code> reached, the task's <b>pool</b> is exhausted, or (Celery) no worker is subscribed to the task's queue. Sometimes a stale <code>celery</code> result backend.",
      fix: "Check <code>airflow.executor.open_slots</code> and pool <code>open_slots</code>. Scale workers or raise <code>parallelism</code> / pool size. For Celery, confirm workers listen on the right <code>--queues</code>. Clear genuinely orphaned tasks."
    },
    {
      icon: "🧨", sev: "failed", sevLabel: "OOM",
      title: "Worker out-of-memory",
      symptom: "Tasks fail with <code>SIGKILL</code> / exit code 137, or Kubernetes worker pods are <code>OOMKilled</code>.",
      cause: "A task loaded too much data into memory (e.g. <code>pandas.read_sql</code> of a huge table) and exceeded the worker/pod memory limit.",
      fix: "Process data in chunks or push it down to the warehouse instead of pulling into the worker. For KubernetesExecutor, raise the pod's memory <code>resources.limits</code> via <code>executor_config</code>. Never move large payloads through XCom."
    },
    {
      icon: "🔌", sev: "failed", sevLabel: "DB saturated",
      title: "Metadata DB connection exhaustion",
      symptom: "Errors like <code>QueuePool limit of size N overflow reached</code>; the UI is slow and the scheduler lags.",
      cause: "Too many components/tasks opening DB sessions at once, exceeding <code>sql_alchemy_pool_size</code> + <code>max_overflow</code>, or Postgres <code>max_connections</code>.",
      fix: "Tune <code>sql_alchemy_pool_size</code> and add a <b>PgBouncer</b> connection pooler in front of Postgres — the standard HA pattern. Run <code>airflow db clean</code> regularly so the DB stays fast under load."
    },
    {
      icon: "📴", sev: "failed", sevLabel: "no scheduling",
      title: "Scheduler stopped scheduling",
      symptom: "No new task instances are created; existing runs sit idle. <code>scheduler.heartbeat</code> is stale.",
      cause: "The scheduler crashed, is blocked on a slow DAG-parse loop, or lost its DB connection. A single expensive DAG import can stall the whole parse loop.",
      fix: "Run <b>multiple active-active schedulers</b> (HA) so one failure doesn't halt scheduling. Alert on <code>scheduler.heartbeat &gt; 30 s</code>. Move heavy imports out of the top level of DAG files to keep parse time low."
    },
    {
      icon: "🚫", sev: "failed", sevLabel: "import error",
      title: "DAG import errors",
      symptom: "A DAG vanishes from the UI, or the top banner shows a red <b>Import Errors</b> count.",
      cause: "The DAG file raised an exception at parse time — a syntax error, a missing dependency, or a top-level call to an external service that timed out.",
      fix: "Check the <b>Import Errors</b> view or run <code>python your_dag.py</code> / <code>airflow dags list-import-errors</code>. Keep DAG files import-safe: no network calls or heavy compute at module top level — defer everything into task callables."
    }
  ];

  var module = {
    id: "failure-scenarios",
    title: "Failure Scenarios",
    fullWidth: true,
    _engine: null, _controls: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Operations</div>' +
          '<h1 class="module-title">Failure scenarios: a production incident playbook</h1>' +
          '<p class="module-subtitle">Six failures every Airflow operator meets eventually — zombies, stuck queues, OOM kills, DB saturation, ' +
          "a dead scheduler, and DAG import errors. For each: the symptom you see, the underlying cause, and the fix.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="fs-canvas"><div class="fail-viz" id="fs-viz"></div></div>' +
          '<aside class="arch-detail" id="fs-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="fs-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<div class="callout warn"><span class="callout-icon">🩺</span><div class="callout-body">' +
          "<b>The universal first move:</b> check the <b>task log</b> (per <code>try_number</code>) and the <b>scheduler heartbeat</b>. Nearly every incident above announces itself in one of those two places before it cascades.</div></div>" +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<b>Better observability:</b> Airflow 3's structured JSON logs and richer health endpoints make it faster to distinguish a worker death from a scheduler stall — the two most commonly confused incidents.</div></div>" +
        "</section>";

      var viz = container.querySelector("#fs-viz");
      var detail = container.querySelector("#fs-detail");

      function renderViz(s) {
        if (!s) {
          viz.innerHTML =
            '<div class="fail-intro"><p>Press play to walk the incident playbook — one failure at a time, ' +
            "each with its tell-tale symptom, root cause, and remediation.</p></div>";
          return;
        }
        viz.innerHTML =
          '<div class="fail-card">' +
            '<div class="fail-head">' +
              '<span class="fail-icon">' + s.icon + "</span>" +
              '<span class="fail-title">' + s.title + "</span>" +
              '<span class="state-chip ' + s.sev + ' fail-sev">' + s.sevLabel + "</span>" +
            "</div>" +
            '<div class="fail-row"><span class="fail-tag fail-tag-symptom">Symptom</span><div class="fail-text">' + s.symptom + "</div></div>" +
            '<div class="fail-row"><span class="fail-tag fail-tag-cause">Cause</span><div class="fail-text">' + s.cause + "</div></div>" +
            '<div class="fail-row"><span class="fail-tag fail-tag-fix">Fix</span><div class="fail-text">' + s.fix + "</div></div>" +
          "</div>";
      }

      function showStep(idx) {
        if (idx < 0) {
          renderViz(null);
          detail.innerHTML =
            '<div class="arch-detail-title">Know the failure, know the fix</div>' +
            "<p>Six recurring production failures. Each step isolates one — read the symptom the way you'd see it in the UI, then the cause and the remediation.</p>" +
            '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">📟</span>' +
            '<div class="callout-body">Most of these are preventable with three habits: set <code>retries</code>, run HA schedulers, and keep DAG files import-safe.</div></div>';
          return;
        }
        renderViz(SCENARIOS[idx]);
        detail.innerHTML = '<div class="arch-detail-title">' + (idx + 1) + " · " + SCENARIOS[idx].title +
          "</div><p>Watch how the symptom maps to a concrete cause — and why the fix addresses the root, not just the symptom.</p>";
      }

      var engine = new AV.AnimationEngine({
        steps: SCENARIOS.map(function (s) { return { label: s.title, duration: 3000 }; }), speed: 1
      });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) { showStep(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#fs-controls").appendChild(controls.el);
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
