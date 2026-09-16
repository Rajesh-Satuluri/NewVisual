/* ============================================================
   modules/scheduler.js — the scheduler loop
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // Five nodes arranged around a loop (pentagon).
  var NODES = [
    { id: "parse",   label: "Parse DAGs",   sub: "read serialized bag", x: 285, y: 24,  w: 150, h: 58, color: "cyan" },
    { id: "create",  label: "Create runs",  sub: "timetable due?",      x: 500, y: 150, w: 150, h: 58, color: "airflow" },
    { id: "examine", label: "Examine TIs",  sub: "deps satisfied?",     x: 415, y: 372, w: 150, h: 58, color: "airflow" },
    { id: "enqueue", label: "Enqueue",      sub: "hand to executor",    x: 155, y: 372, w: 150, h: 58, color: "green" },
    { id: "collect", label: "Collect state",sub: "executor events",     x: 70,  y: 150, w: 150, h: 58, color: "purple" }
  ];
  var EDGES = [["parse", "create"], ["create", "examine"], ["examine", "enqueue"], ["enqueue", "collect"], ["collect", "parse"]];

  var STEPS = [
    { label: "1 · Parse serialized DAGs", nodes: ["parse"], edges: [["collect", "parse"]],
      what: "At the top of every loop the scheduler loads the latest <b>serialized DAGs</b> — compact JSON snapshots of your pipelines — from the metadata DB.",
      why: "The scheduler must never import your raw Python: a heavy import or a syntax error could stall or crash the loop for <i>every</i> DAG. Reading a pre-built serialized copy keeps the loop fast and insulated from user code.",
      how: "A separate <b>DAG processor</b> parses the <code>.py</code> files in the background and writes their serialized form to the DB. The scheduler simply reads that table each loop — it never opens your files directly.",
      when: "Every loop; the serialized copy is refreshed only when the DAG processor re-parses a changed file, governed by <code>min_file_process_interval</code>.",
      mistake: "Expecting a code change to take effect instantly. The scheduler sees it only <i>after</i> the DAG processor re-parses and re-serializes — there is a deliberate lag.",
      interview: "If asked “does the scheduler run your DAG file?” — no. It reads the serialized JSON; parsing is a separate concern (its own process in 3.x). Naming that isolation is what a senior answer sounds like.",
      example: "ShopKart edits <code>daily_sales.py</code> at 09:00; the change appears to the scheduler a parse-interval later, not the same second." },

    { label: "2 · Create DAG runs", nodes: ["create"], edges: [["parse", "create"]],
      what: "The scheduler asks each DAG's <b>timetable</b> whether a new data interval is due, and if so creates a <b>DAG run</b> plus one task instance per task, all in <span class='state-chip scheduled'>scheduled</span>.",
      why: "This is where time turns into work. The <i>timetable</i> — not a wall clock — decides when an interval has closed, which is exactly what makes Airflow's batch model precise and backfillable.",
      how: "For each active DAG it compares the last interval to now. If a fresh interval has closed it inserts a DAG-run row and the task-instance rows, capped by <code>max_active_runs_per_dag</code> so it can't stampede a source system.",
      when: "Every loop, but bounded by <code>max_dagruns_to_create_per_loop</code> so one busy DAG can't monopolise run-creation.",
      mistake: "Confusing the timetable firing with tasks starting. Creating the run only makes task instances <i>eligible</i> — they don't run until the later gates pass.",
      interview: "A classic: “when does a daily DAG for Jan 15 actually run?” — at the <i>end</i> of the interval (early Jan 16), because a run represents a completed interval.",
      example: "ShopKart's <code>@daily</code> sales DAG for the Jan-15 interval is created just after midnight on Jan 16, with all 13 tasks in <span class='state-chip scheduled'>scheduled</span>." },

    { label: "3 · Examine task instances", nodes: ["examine"], edges: [["create", "examine"]],
      what: "The scheduler walks every task instance sitting in <span class='state-chip scheduled'>scheduled</span> and decides which are actually <b>runnable right now</b>.",
      why: "Not every scheduled task can run — it may be waiting on upstreams, or the pool/cluster may be full. This gate stops Airflow from launching work that isn't ready or that would blow past its limits.",
      how: "For each TI it checks three things: are all <b>upstream dependencies</b> met (per the trigger rule), is there a <b>free slot</b> in the task's pool, and is <b>concurrency</b> under the DAG and cluster caps? TIs that pass all three are selected this loop.",
      when: "Every loop, for every scheduled TI — the hot path, batched by <code>max_tis_per_query</code>.",
      mistake: "Assuming a task stuck in <span class='state-chip scheduled'>scheduled</span> is broken, when it is simply <b>gated</b> — an exhausted pool or <code>max_active_tasks_per_dag</code> holds it there silently.",
      interview: "“Why is my task stuck in scheduled?” A strong answer names the three gates — dependencies, pool slot, concurrency — instead of guessing at bugs.",
      example: "ShopKart's nightly reconcile waits in <span class='state-chip scheduled'>scheduled</span> because the <code>warehouse</code> pool (5 slots) is full with load tasks; it starts the instant a slot frees." },

    { label: "4 · Enqueue to the executor", nodes: ["enqueue"], edges: [["examine", "enqueue"]],
      what: "Selected task instances are handed to the <b>executor</b> and move to <span class='state-chip queued'>queued</span>. The scheduler's job ends here — it <b>never runs your task code</b>.",
      why: "Separating “decide” from “run” is what lets Airflow swap execution backends (Local, Celery, Kubernetes) without changing scheduling logic, and lets you scale workers independently of the scheduler.",
      how: "The scheduler sends the TI to the configured executor, which places it on compute: a Celery queue, a fresh Kubernetes pod, or a local subprocess. The worker then runs it and reports back.",
      when: "Immediately after selection, each loop, for every runnable TI.",
      mistake: "Thinking the scheduler executes tasks. A slow task does <i>not</i> slow the scheduler — if tasks aren't starting, look at the workers/executor, not the loop.",
      interview: "Know the boundary: scheduler = <i>what/when</i>, executor + workers = <i>where/how</i>. Interviewers probe this to check you understand why Airflow scales.",
      example: "ShopKart routes heavy warehouse loads to a Celery <code>etl</code> queue and light API pulls to <code>default</code> — same scheduler, different workers." },

    { label: "5 · Collect state & repeat", nodes: ["collect"], edges: [["enqueue", "collect"]],
      what: "The scheduler collects results from the executor, writes each task's final <span class='state-chip success'>success</span> or <span class='state-chip failed'>failed</span> state to the DB, then sleeps briefly and loops again.",
      why: "The metadata DB is the single source of truth. Persisting outcomes every loop is what makes the system crash-safe and lets multiple schedulers cooperate without stepping on each other.",
      how: "It reads executor events, updates the task-instance rows, cascades any resulting changes (schedule a retry, unblock downstream tasks), then waits <code>scheduler_heartbeat_sec</code> (default 5&nbsp;s) before the next revolution.",
      when: "Continuously, forever — this is the loop's closing edge.",
      mistake: "Blaming a “slow scheduler” for slow tasks. A stale scheduler <b>heartbeat</b>, not task duration, is the real red flag — it means scheduling itself has stalled.",
      interview: "Mention HA here: multiple active schedulers coordinate through <code>SELECT … FOR UPDATE SKIP LOCKED</code> row locks on the DB — no leader election. It's a favourite follow-up.",
      example: "ShopKart runs two schedulers; if one pod dies mid-loop the other keeps writing state, and no run is lost." }
  ];

  var KNOBS = [
    { k: "scheduler_heartbeat_sec", v: "5 s", d: "How often the scheduler loop runs." },
    { k: "max_dagruns_to_create_per_loop", v: "10", d: "Cap on new DAG runs created per loop." },
    { k: "max_tis_per_query", v: "16", d: "Batch size when examining task instances." },
    { k: "parsing_processes", v: "2", d: "Processes dedicated to DAG parsing." }
  ];

  var CLI =
    "# Run the scheduler (one or many — it's HA-safe)\n" +
    "airflow scheduler\n" +
    "\n" +
    "# Airflow 3.x: parsing is its own process\n" +
    "airflow dag-processor";

  var module = {
    id: "scheduler",
    title: "Scheduler Internals",
    fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · The Heart</div>' +
          '<h1 class="module-title">The scheduler loop</h1>' +
          '<p class="module-subtitle">The scheduler never runs your tasks — it decides <i>what</i> should run and hands ' +
          "it off. It spins this loop continuously; step through one full revolution below.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="sc-canvas"></div>' +
          '<aside class="arch-detail" id="sc-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="sc-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">High availability</h2>' +
          '<div class="callout tip"><span class="callout-icon">💡</span><div class="callout-body">' +
          "Since Airflow 2.0 you can run <b>multiple active schedulers</b>. They coordinate through " +
          "<b>row-level locks</b> (<code>SELECT ... FOR UPDATE SKIP LOCKED</code>) on the metadata DB — no leader election, " +
          "just the database as the arbiter. More schedulers → higher task throughput.</div></div>" +
          '<div class="two-col" id="sc-code" style="margin-top:var(--space-4)"></div>' +
        "</section>" +
        '<section class="section">' +
          '<h2 class="section-title">Loop knobs</h2>' +
          '<div class="card-grid" id="sc-knobs"></div>' +
        "</section>";

      var diagram = AV.ArchDiagram.create({
        nodes: NODES, edges: EDGES, viewBox: "0 0 720 470",
        onSelect: function () {}
      });
      container.querySelector("#sc-canvas").appendChild(diagram.el);
      this._diagram = diagram;

      var detail = container.querySelector("#sc-detail");
      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">One revolution</div>' +
          "<p>The scheduler repeats this five-stage loop forever. Press play to walk it once; " +
          "each stage lights up in the diagram.</p>" +
          '<div class="callout info" style="margin-top:var(--space-4)"><span class="callout-icon">🔒</span>' +
          '<div class="callout-body">Everything is coordinated through the metadata DB, which is why a slow DB is the ' +
          "#1 scheduler bottleneck.</div></div>";
      }
      function showStep(idx) {
        if (idx < 0) { defaultDetail(); return; }
        detail.innerHTML = AV.Explain.render(STEPS[idx]);
      }

      var code = AV.CodeViewer.create({ title: "start the scheduler", lang: "bash", code: CLI });
      var knobNote = AV.CodeViewer.create({
        title: "check it's alive", lang: "bash",
        code: "airflow jobs check --job-type SchedulerJob --hostname \"$(hostname)\""
      });
      var cc = container.querySelector("#sc-code");
      cc.appendChild(code);
      cc.appendChild(knobNote);

      container.querySelector("#sc-knobs").innerHTML = KNOBS.map(function (n) {
        return '<div class="card"><div class="card-title"><code>' + n.k + "</code></div>" +
          '<div class="knob-default">default <b>' + n.v + "</b></div><p>" + n.d + "</p></div>";
      }).join("");

      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1 });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) {
        if (idx < 0) { diagram.clear(); showStep(-1); return; }
        var s = STEPS[idx];
        diagram.setActive(s.nodes, s.edges);
        showStep(idx);
      });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#sc-controls").appendChild(controls.el);
      this._controls = controls;
      defaultDetail();
    },

    destroy: function () {
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      if (this._diagram) { this._diagram.destroy(); this._diagram = null; }
    }
  };

  AV.registerModule(module);
})();
