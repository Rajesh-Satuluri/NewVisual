/* ============================================================
   modules/interview.js — interview Q&A
   Interactive: category filter + expandable question cards.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var QA = [
    ["fundamentals", "What is the difference between an Operator, a Task, and a Task Instance?",
     "An <b>Operator</b> is a template for a unit of work (e.g. <code>PythonOperator</code>). Instantiating it inside a DAG creates a <b>Task</b> — a node in the graph. When a DAG runs for a specific logical date, each task produces a <b>Task Instance</b> — the concrete, stateful execution that moves through the state machine and gets a <code>try_number</code>."],
    ["fundamentals", "What does it mean that a DAG file must be \"import-safe\"?",
     "The scheduler re-imports every DAG file on each parse loop. Any code at the <i>top level</i> of the file runs every time — so a network call, a heavy computation, or a slow import at module scope stalls parsing for all DAGs. Keep top-level code trivial; put real work inside task callables."],
    ["scheduling", "Explain logical_date vs the actual run time.",
     "<code>logical_date</code> (formerly <code>execution_date</code>) is the timestamp the run <i>represents</i> — the start of the data interval. A daily DAG for Jan 15 has <code>logical_date=2024-01-15</code> but actually executes at the <i>end</i> of that interval (early Jan 16). This is why Airflow is ideal for batch: it processes a completed interval."],
    ["scheduling", "What is catchup and why is it often disabled?",
     "With <code>catchup=True</code>, when a DAG is unpaused the scheduler creates a run for <i>every</i> missed interval from <code>start_date</code> to now. A DAG dormant for a year could spawn 365 runs at once — a stampede. Most teams set <code>catchup=False</code> and use explicit backfills for history."],
    ["scheduling", "How does data-aware (Asset/Dataset) scheduling work?",
     "Instead of a cron, a DAG can be scheduled on <b>Assets</b>. When an upstream task updates an asset it produces, Airflow triggers the downstream DAGs that consume it. This builds event-driven pipelines where a run happens because data is ready, not because a clock ticked."],
    ["execution", "Compare the Celery and Kubernetes executors.",
     "<b>Celery</b>: a warm pool of long-lived workers pulling tasks from a broker (Redis/RabbitMQ) by queue. Near-zero startup latency; idle workers cost money; weaker isolation. <b>Kubernetes</b>: one fresh pod per task instance — perfect isolation and per-task resources, native autoscaling, but seconds of pod-startup latency per task. Combine both with the CeleryKubernetesExecutor."],
    ["execution", "What problem do deferrable operators and the triggerer solve?",
     "A classic sensor holds a worker slot the entire time it polls — 100 waiting sensors block 100 slots. A <b>deferrable</b> operator instead yields its slot and hands an async <b>trigger</b> to the <b>triggerer</b> process, which watches thousands of conditions on one event loop. When the condition fires, the task is rescheduled onto a worker."],
    ["execution", "How do tasks pass data, and what's the anti-pattern?",
     "Via <b>XCom</b> — a small key-value stored in the metadata DB, returned from one task and pulled by another. The anti-pattern is pushing <i>large</i> data (a DataFrame, a file) through XCom: it bloats the DB and is slow. Pass a pointer instead (an S3 path, a table name) and let the downstream task fetch it."],
    ["reliability", "How do retries with exponential backoff behave?",
     "With <code>retries=3</code> and <code>retry_exponential_backoff=True</code>, a failed task waits <code>retry_delay × 2^(try-1)</code> before each retry (5m, 10m, 20m …), capped by <code>max_retry_delay</code>. It stays <span class='state-chip up-for-retry'>up-for-retry</span> between attempts and only becomes <span class='state-chip failed'>failed</span> after exhausting all retries."],
    ["reliability", "What is a zombie task and how is it handled?",
     "A task instance that shows <span class='state-chip running'>running</span> but whose worker has died (OOM, eviction) without reporting back. Its heartbeat goes stale; the scheduler's zombie detection reaps it after <code>scheduler_zombie_task_threshold</code>, marking it up-for-retry so <code>retries</code> can recover it."],
    ["ops", "How do you make an Airflow deployment highly available?",
     "Run <b>2+ active-active schedulers</b> (they coordinate via DB row-locking — no leader election), stateless <b>API servers behind a load balancer</b>, an autoscaled <b>worker fleet</b>, redundant <b>triggerers</b>, and an <b>HA metadata DB</b> fronted by <b>PgBouncer</b>. The metadata DB is the one true stateful dependency — protect and back it up."],
    ["ops", "The scheduler stopped creating tasks. How do you debug it?",
     "Check <code>scheduler.heartbeat</code> — if stale, the scheduler is down or blocked. A common cause is a slow DAG-parse loop from an expensive top-level import stalling the whole cycle. Also verify DB connectivity and that pools/parallelism aren't exhausted. Running multiple schedulers prevents a single failure from halting scheduling entirely."]
  ];

  var CATS = [
    ["all", "All"], ["fundamentals", "Fundamentals"], ["scheduling", "Scheduling"],
    ["execution", "Execution"], ["reliability", "Reliability"], ["ops", "Operations"]
  ];

  var module = {
    id: "interview",
    title: "Interview Q&A",
    fullWidth: true,
    _root: null, _handler: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Interview Prep</div>' +
          '<h1 class="module-title">Interview Q&amp;A: the questions you\'ll actually be asked</h1>' +
          '<p class="module-subtitle">Senior data-engineering interviews probe how Airflow behaves under the hood. ' +
          "Filter by topic, then click a question to reveal a complete, precise answer.</p>" +
        "</div>" +
        '<div class="qa-filters" id="qa-filters">' +
          CATS.map(function (c, i) {
            return '<button class="qa-chip' + (i === 0 ? " active" : "") + '" data-cat="' + c[0] + '">' + c[1] + "</button>";
          }).join("") +
        "</div>" +
        '<div class="qa-list" id="qa-list">' +
          QA.map(function (q, i) {
            return '<div class="qa-item" data-cat="' + q[0] + '">' +
              '<button class="qa-q" aria-expanded="false" data-idx="' + i + '">' +
                '<span class="qa-q-text">' + q[1] + "</span>" +
                '<span class="qa-toggle">+</span>' +
              "</button>" +
              '<div class="qa-a" hidden><p>' + q[2] + "</p></div>" +
            "</div>";
          }).join("") +
        "</div>";

      var root = container.querySelector("#qa-list");
      var filters = container.querySelector("#qa-filters");
      this._root = container;

      function onClick(e) {
        var q = e.target.closest(".qa-q");
        if (q) {
          var item = q.parentNode;
          var ans = item.querySelector(".qa-a");
          var open = q.getAttribute("aria-expanded") === "true";
          q.setAttribute("aria-expanded", open ? "false" : "true");
          ans.hidden = open;
          q.querySelector(".qa-toggle").textContent = open ? "+" : "−";
          item.classList.toggle("qa-open", !open);
          return;
        }
        var chip = e.target.closest(".qa-chip");
        if (chip) {
          filters.querySelectorAll(".qa-chip").forEach(function (c) { c.classList.remove("active"); });
          chip.classList.add("active");
          var cat = chip.getAttribute("data-cat");
          root.querySelectorAll(".qa-item").forEach(function (it) {
            it.hidden = cat !== "all" && it.getAttribute("data-cat") !== cat;
          });
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
