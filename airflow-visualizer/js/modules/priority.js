/* ============================================================
   modules/priority.js — priority_weight & concurrency knobs
   Animated priority queue: tasks sorted by pw claim pool slots.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // ShopKart: 3 extract tasks contend for 1 db_pool slot.
  var STEPS = [
    {
      queue: [{id:"extract_A",pw:1},{id:"extract_C",pw:3},{id:"extract_B",pw:5}],
      slot: null, done: [],
      label: "1 · Three tasks, one pool slot",
      desc: "extract_A, extract_C, and extract_B are all runnable and assigned to db_pool (cap=1). They became runnable in this order: A → C → B. The slot is free — which task starts first?"
    },
    {
      queue: [{id:"extract_B",pw:5},{id:"extract_C",pw:3},{id:"extract_A",pw:1}],
      slot: null, done: [],
      label: "2 · Scheduler sorts by priority_weight",
      desc: "The scheduler ranks all slot-eligible tasks by <code>priority_weight</code> descending. B(5) > C(3) > A(1). Arrival order is irrelevant — weight determines position."
    },
    {
      queue: [{id:"extract_C",pw:3},{id:"extract_A",pw:1}],
      slot: {id:"extract_B",pw:5}, done: [],
      label: "3 · extract_B admitted (pw=5)",
      desc: "B grabs the free slot and moves to <span class='state-chip running'>running</span>. C and A remain queued — the pool is saturated at its cap of 1."
    },
    {
      queue: [{id:"extract_C",pw:3},{id:"extract_A",pw:1}],
      slot: null, done: ["extract_B"],
      label: "4 · B finishes, slot freed",
      desc: "B completes and releases its slot. The scheduler re-evaluates the queue immediately and picks the next-highest priority task: C(pw=3)."
    },
    {
      queue: [{id:"extract_A",pw:1}],
      slot: {id:"extract_C",pw:3}, done: ["extract_B"],
      label: "5 · C runs, A still waits",
      desc: "C starts running. A(pw=1) waits — it has no competition now, but priority_weight already determined its position when the queue had multiple candidates."
    },
    {
      queue: [],
      slot: {id:"extract_A",pw:1}, done: ["extract_B","extract_C"],
      label: "6 · All tasks ran in weight order",
      desc: "A runs last. <code>priority_weight</code> guaranteed the order B→C→A, regardless of when each task became runnable. <b>Higher weight = more urgent.</b>"
    }
  ];

  var KNOBS = [
    ["priority_weight",    "Integer (default 1). Higher = picked sooner from the queue."],
    ["weight_rule",        "'downstream' (default) — weight = own + sum of all downstream weights. 'upstream' sums upstream. 'absolute' uses the raw value."],
    ["pool",               "A task runs only when its pool has a free slot. priority_weight decides which queued task claims the next free one."],
    ["max_active_tasks",   "Per-DAG cap on concurrently running tasks (renamed from concurrency in 2.2)."],
    ["max_active_runs",    "Per-DAG cap on concurrent DAG runs. New runs don't start until a slot opens; in-progress runs are not cancelled."],
    ["max_active_tis_per_dag", "Per-task cap: limits how many instances of one task_id run across all DAG runs at once."]
  ];

  var CODE =
    "with DAG(\n" +
    "    'daily_sales_etl',\n" +
    "    max_active_tasks=4,      # cap concurrent running tasks across this DAG\n" +
    "    max_active_runs=2,       # cap concurrent DAG runs\n" +
    ") as dag:\n" +
    "\n" +
    "    extract_orders = PythonOperator(\n" +
    "        task_id='extract_orders',\n" +
    "        python_callable=extract_fn,\n" +
    "        pool='db_pool',\n" +
    "        priority_weight=5,        # runs before lower-priority siblings\n" +
    "        weight_rule='absolute',   # don't add downstream weights\n" +
    "    )\n" +
    "\n" +
    "    transform = PythonOperator(\n" +
    "        task_id='transform_sales',\n" +
    "        python_callable=transform_fn,\n" +
    "        pool='db_pool',\n" +
    "        priority_weight=3,\n" +
    "    )";

  var module = {
    id: "priority",
    title: "Priority & Concurrency",
    fullWidth: true,
    _engine: null, _controls: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Internals</div>' +
          '<h1 class="module-title">Priority & Concurrency: controlling task order</h1>' +
          '<p class="module-subtitle"><code>priority_weight</code> determines which queued task claims the next free pool slot. ' +
          "Pair it with <code>max_active_tasks</code>, <code>max_active_runs</code>, and pool caps to tune ShopKart's pipeline throughput.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="pq-canvas"><div class="pq-viz" id="pq-viz"></div></div>' +
          '<aside class="arch-detail" id="pq-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="pq-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">Setting the knobs</h2>' +
          '<div id="pq-code"></div>' +
        "</section>" +
        '<section class="section">' +
          '<h2 class="section-title">Concurrency knobs reference</h2>' +
          '<div class="table-wrap"><table class="cmp-table" id="pq-table"></table></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout tip"><span class="callout-icon">⚖️</span><div class="callout-body">' +
          "<b>weight_rule='downstream' (default)</b> means leaf tasks — tasks with nothing depending on them — have low weight. " +
          "Tasks that unlock many downstream tasks naturally bubble up. Use <code>weight_rule='absolute'</code> when you want explicit control.</div></div>" +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<b>DAG-level priority:</b> Airflow 3 lets you set a priority class on a DAG, so the scheduler can deprioritise entire pipelines during resource contention, not just individual tasks.</div></div>" +
        "</section>";

      var viz = container.querySelector("#pq-viz");
      var detail = container.querySelector("#pq-detail");

      function taskEl(t, stateClass) {
        return '<div class="pq-task' + (stateClass ? " " + stateClass : "") + '">' +
          '<span class="pq-task-id">' + t.id + "</span>" +
          '<span class="pq-pw">pw=' + t.pw + "</span>" +
          "</div>";
      }

      function renderViz(step) {
        if (!step) {
          viz.innerHTML =
            '<div class="pq-intro">' +
              '<div class="pq-intro-text">Press play to watch three tasks compete for a single db_pool slot — and see priority_weight decide the order.</div>' +
            "</div>";
          return;
        }

        var queueHtml = step.queue.length
          ? step.queue.map(function (t) { return taskEl(t, ""); }).join("")
          : '<span class="pq-empty">empty</span>';

        var slotInner = step.slot
          ? taskEl(step.slot, "running")
          : '<span class="pq-empty">free</span>';

        var doneHtml = step.done.length
          ? step.done.map(function (id) {
              return '<div class="pq-task done">' + id + " <span>✓</span></div>";
            }).join("")
          : '<span class="pq-empty">—</span>';

        viz.innerHTML =
          '<div class="pq-section">' +
            '<div class="pq-label">Waiting (sorted ↓ by priority_weight)</div>' +
            '<div class="pq-queue">' + queueHtml + "</div>" +
          "</div>" +
          '<div class="pq-arrow">↓ next free slot</div>' +
          '<div class="pq-section">' +
            '<div class="pq-label">db_pool — slot (cap=1)</div>' +
            '<div class="pq-slot' + (step.slot ? " filled" : "") + '">' + slotInner + "</div>" +
          "</div>" +
          '<div class="pq-section">' +
            '<div class="pq-label">Completed</div>' +
            '<div class="pq-done">' + doneHtml + "</div>" +
          "</div>";
      }

      function showStep(idx) {
        if (idx < 0) {
          renderViz(null);
          detail.innerHTML =
            '<div class="arch-detail-title">Weight determines order</div>' +
            "<p>Press play to see three ShopKart tasks compete for a single db_pool slot — sorted by <code>priority_weight</code>.</p>" +
            '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">🏆</span>' +
            '<div class="callout-body">The default <code>priority_weight=1</code> means all tasks are equal and Airflow uses insertion order as a tiebreaker.</div></div>';
          return;
        }
        renderViz(STEPS[idx]);
        detail.innerHTML = '<div class="arch-detail-title">' + STEPS[idx].label + "</div><p>" + STEPS[idx].desc + "</p>";
      }

      container.querySelector("#pq-code").appendChild(AV.CodeViewer.create({
        title: "daily_sales_etl — priority & concurrency",
        lang: "python",
        code: CODE,
        highlights: [3, 4, 11, 12]
      }));

      var head = "<thead><tr><th>Setting</th><th>What it controls</th></tr></thead>";
      container.querySelector("#pq-table").innerHTML = head + "<tbody>" +
        KNOBS.map(function (r) {
          return "<tr><td class='cmp-dim'><code>" + r[0] + "</code></td><td>" + r[1] + "</td></tr>";
        }).join("") + "</tbody>";

      var engine = new AV.AnimationEngine({
        steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1
      });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) { showStep(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#pq-controls").appendChild(controls.el);
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
