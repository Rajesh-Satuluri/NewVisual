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
      what: "Three ShopKart tasks — <code>extract_A</code>, <code>extract_C</code>, <code>extract_B</code> — are all runnable and share <code>db_pool</code> (cap = 1). They became runnable in the order A → C → B. With one free slot, which starts first?",
      why: "When more tasks are slot-eligible than there are slots, Airflow needs a deterministic tie-breaker. Arrival time is the obvious guess — and it's the wrong one.",
      how: "Every task carries a <code>priority_weight</code> (default 1). The scheduler uses that integer, not wall-clock arrival, to decide who claims a freed slot.",
      when: "Whenever demand for a pool exceeds its slots and the scheduler must pick an order.",
      mistake: "Expecting first-runnable-first-served. Arrival order is only the <i>tiebreaker</i>; weight decides first.",
      interview: "“Two tasks are ready for one slot — which runs?” The higher <code>priority_weight</code>; equal weights fall back to insertion order. Don't answer “whichever was ready first.”",
      example: "ShopKart's three extracts queue for one warehouse slot — the order they run is about to be decided by weight, not by who was ready first."
    },
    {
      queue: [{id:"extract_B",pw:5},{id:"extract_C",pw:3},{id:"extract_A",pw:1}],
      slot: null, done: [],
      label: "2 · Scheduler sorts by priority_weight",
      what: "The scheduler ranks all slot-eligible tasks by <code>priority_weight</code> <b>descending</b>: B(5) &gt; C(3) &gt; A(1). The order they became runnable is irrelevant to the ranking.",
      why: "Sorting by an explicit integer gives you deliberate control over what matters most when capacity is scarce — revenue jobs ahead of nice-to-haves.",
      how: "Set <code>priority_weight</code> per task (or a DAG-wide default). Each scheduling pass orders eligible tasks by weight and the top one takes the next slot.",
      when: "On every scheduling loop where a contended pool has waiters.",
      mistake: "Setting weights on tasks that never contend — priority only matters when tasks compete for a limited pool. It does nothing on an uncontended queue.",
      interview: "“Is priority_weight a global, OS-style priority?” No — it orders <i>slot-eligible</i> tasks competing for the same capacity, not everything cluster-wide. That nuance scores points.",
      example: "ShopKart weights the revenue-critical <code>extract_B</code> at 5 so it always beats the low-value <code>extract_A</code> when the warehouse pool is contended."
    },
    {
      queue: [{id:"extract_C",pw:3},{id:"extract_A",pw:1}],
      slot: {id:"extract_B",pw:5}, done: [],
      label: "3 · extract_B admitted (pw=5)",
      what: "B grabs the free slot and moves to <span class='state-chip running'>running</span>. C and A stay <span class='state-chip queued'>queued</span> — the pool is saturated at its cap of 1.",
      why: "Highest weight goes first so the most important work starts soonest under contention. Everything below it waits, in weight order, for the next opening.",
      how: "The scheduler admits B, drops the pool's free slots to zero, and leaves C and A eligible-but-waiting for the next freed slot.",
      when: "The moment the top-ranked waiter is admitted and the pool fills.",
      mistake: "Thinking a high weight lets B <i>preempt</i> a running task. It doesn't — weight only orders <i>admission</i>; it never evicts something already running.",
      interview: "“Does priority_weight preempt running tasks?” No — Airflow priority is non-preemptive. It orders who starts next, never who gets killed.",
      example: "ShopKart's <code>extract_B</code> starts first and holds the single slot; the report it feeds is never delayed by a lower-value extract sneaking ahead."
    },
    {
      queue: [{id:"extract_C",pw:3},{id:"extract_A",pw:1}],
      slot: null, done: ["extract_B"],
      label: "4 · B finishes, slot freed",
      what: "B completes and <b>releases</b> its slot. The scheduler immediately re-evaluates the queue and picks the next-highest-priority waiter: C (pw = 3).",
      why: "Re-ranking on every freed slot means priorities are honoured continuously, not just once at the start — the queue is always sorted when a slot opens.",
      how: "On B's completion the slot returns to <code>db_pool</code>; the scheduler sorts the remaining eligible tasks (C &gt; A) and admits C.",
      when: "Each time a slot frees while multiple tasks wait.",
      mistake: "Assuming admission order is frozen after the first pick. New eligible tasks can arrive and re-sort the queue between slot openings.",
      interview: "“If a higher-priority task becomes ready while others wait, does it jump ahead?” Yes — the queue is re-sorted by weight each pass, so a late arrival can leapfrog.",
      example: "As soon as ShopKart's <code>extract_B</code> finishes, the freed slot goes to <code>extract_C</code> (pw 3), not to whichever task had waited longest."
    },
    {
      queue: [{id:"extract_A",pw:1}],
      slot: {id:"extract_C",pw:3}, done: ["extract_B"],
      label: "5 · C runs, A still waits",
      what: "C starts running. A (pw = 1) still waits — even with no competition left, its position was set by weight back when the queue held several candidates.",
      why: "Low weight simply means A yields to anything more important; with the slot taken by C it waits its turn, exactly as intended for the least-urgent job.",
      how: "A stays slot-eligible and queued; it will be admitted when C frees the slot, since it is now the only waiter.",
      when: "Whenever the lowest-priority task is the last one standing in a contended pool.",
      mistake: "Reading A's wait as a stall. It's correctly deprioritised — low weight is a choice to run <i>last</i> under contention, not a bug.",
      interview: "“Can a low-priority task starve forever?” Not on a draining pool — once contention clears it runs. Starvation only risks a <i>permanently</i> saturated pool.",
      example: "ShopKart's throwaway <code>extract_A</code> patiently waits out the important extracts every evening, then runs once the warehouse frees up."
    },
    {
      queue: [],
      slot: {id:"extract_A",pw:1}, done: ["extract_B","extract_C"],
      label: "6 · All tasks ran in weight order",
      what: "A runs last. <code>priority_weight</code> guaranteed the execution order B → C → A regardless of when each task became runnable. <b>Higher weight = more urgent.</b>",
      why: "The payoff is predictable ordering under scarcity: you decide, with one integer per task, what runs first when there isn't capacity for everything.",
      how: "Pair <code>priority_weight</code> with <code>weight_rule</code> ('downstream' by default, so tasks that unblock many others bubble up) to tune the whole DAG's ordering.",
      when: "Any pipeline where some outputs matter more than others and capacity is finite.",
      mistake: "Leaving every task at the default weight 1, then wondering why a critical report waits behind bulk backfills. Weight the things that matter.",
      interview: "“How do you ensure the revenue pipeline runs before backfills when both are queued?” Higher <code>priority_weight</code> on the revenue tasks — and know <code>weight_rule</code>'s downstream-sum default.",
      example: "ShopKart tags its revenue DAG's tasks with high weights so month-end backfills never delay the numbers the CFO is waiting on."
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
        detail.innerHTML = AV.Explain.render(STEPS[idx]);
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
