/* ============================================================
   modules/pools.js — pools & concurrency slots
   Inline slot-grid animated by the engine: tasks claim slots,
   the pool fills, extras queue, a freed slot admits the queue head.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // Each step is a full snapshot (idx-driven → prev/goto/reset correct).
  var STEPS = [
    { slots: [null, null, null, null], queue: [], label: "1 · An empty pool",
      what: "A <b>pool</b> is a named bucket of <b>slots</b> that caps how many tasks run at once. ShopKart's <code>db_pool</code> has <b>4 slots</b>, so at most four tasks may touch the warehouse simultaneously — <i>across every DAG</i>, not just one.",
      why: "Pools protect a fragile shared resource. The warehouse survives four concurrent writers but not forty, and a per-DAG limit can't help when ten DAGs each launch a couple of writers at the same moment — only a global cap can.",
      how: "Create the pool (UI, CLI, or API) with a slot count, then assign tasks with <code>pool='db_pool'</code>. Every slot-holding task counts against the cap regardless of which DAG it belongs to.",
      when: "Any time many tasks share one downstream system — a database, a rate-limited API, a licensed connector.",
      mistake: "Assuming <code>max_active_tasks</code> (a per-DAG cap) protects the warehouse. It doesn't — ten DAGs each at their own cap still overwhelm it. Pools are the cross-DAG throttle.",
      interview: "“How do you stop Airflow from overwhelming a shared database?” A <b>pool</b> — it caps concurrency across all DAGs, unlike per-DAG knobs. Naming that distinction is the point.",
      example: "ShopKart's warehouse buckles above four concurrent ETL writers, so every write task gets <code>pool='db_pool'</code> (4 slots) and the fifth waits its turn." },
    { slots: ["A", null, null, null], queue: [], label: "2 · Task A claims a slot",
      what: "A runnable task with a free slot claims <b>one</b> slot and moves to <span class='state-chip running'>running</span>. By default a task takes <code>pool_slots=1</code>, so three of <code>db_pool</code>'s four slots remain.",
      why: "One slot per task is the simple default, but a genuinely heavy task can reserve more — so slots measure a task's <i>cost</i> to the resource, not just a head-count.",
      how: "Set <code>pool_slots=2</code> on an unusually expensive task and it consumes two of the pool's slots while it runs, leaving fewer for everyone else.",
      when: "Whenever a task's real load on the shared resource differs from its neighbours'.",
      mistake: "Forgetting <code>pool_slots</code> exists and giving a giant bulk-load the same weight as a tiny lookup, so the pool under-protects the warehouse.",
      interview: "“Can one task count as more than one slot?” Yes — <code>pool_slots</code>. Mentioning it shows you know pools measure resource cost, not a raw task count.",
      example: "ShopKart's nightly full-reload sets <code>pool_slots=2</code> because it hammers the warehouse twice as hard as an incremental sync." },
    { slots: ["A", "B", "C", null], queue: [], label: "3 · B and C join",
      what: "More runnable tasks each claim a free slot. With A, B, and C running, three slots are used and <b>one</b> is still free — so a fourth <code>db_pool</code> task may start immediately.",
      why: "A pool doesn't serialize work; it lets tasks run <i>up to</i> the cap. Below the cap there's no throttling at all — latency only appears once slots run out.",
      how: "The scheduler admits any slot-eligible task while free slots remain, in <code>priority_weight</code> order, until the pool is full.",
      when: "Under normal load, where concurrent demand sits at or below the pool size.",
      mistake: "Sizing the pool so tight it throttles even normal load, adding latency you never needed. Size to the resource's real ceiling.",
      interview: "“Does a pool slow every task down?” No — only when demand exceeds the cap. Below it, tasks run fully in parallel.",
      example: "ShopKart's three morning extracts all run at once — the pool only bites in the evening when a fourth and fifth arrive together." },
    { slots: ["A", "B", "C", "D"], queue: [], label: "4 · Pool is full",
      what: "All four slots are occupied. The pool is <b>saturated</b> — no additional <code>db_pool</code> task can start until a running one finishes and frees its slot.",
      why: "Saturation is the pool doing its job: the hard ceiling that keeps the warehouse inside its safe concurrency envelope no matter how much work piles up behind it.",
      how: "The scheduler sees zero free slots and stops admitting <code>db_pool</code> tasks, even when worker capacity and other pools are wide open.",
      when: "At peak, when concurrent demand for the shared resource meets or exceeds the cap.",
      mistake: "Reading a saturated pool as “Airflow is broken.” Queued-on-pool is expected backpressure, not a failure — it's the design working.",
      interview: "“A task is ready and workers are idle but it won't start — why?” Its pool is full. Pool exhaustion is a top cause of “stuck in queued.”",
      example: "During ShopKart's 6pm crunch all four warehouse slots fill, and the reporting reload waits rather than piling more load onto the DB." },
    { slots: ["A", "B", "C", "D"], queue: ["E"], label: "5 · Task E must wait",
      what: "Task E is runnable and its dependencies are met, but the pool is full — so it sits <span class='state-chip queued'>queued</span>. Pools <b>throttle</b> work; they never drop it.",
      why: "The guarantee is that excess work waits rather than failing or overrunning the resource. Backpressure, not loss — the fifth writer is delayed, never discarded.",
      how: "E stays queued and slot-eligible; the moment a slot frees the scheduler evaluates the waiters and admits one. Nothing about E's state is lost while it waits.",
      when: "Any time demand briefly exceeds the pool size — the normal overflow case.",
      mistake: "Fearing that pool-queued tasks get skipped or time out. They wait for a slot (subject to any <code>execution_timeout</code> you set), then run.",
      interview: "“What happens to tasks that exceed a full pool?” They queue and wait for a free slot — throttled, not dropped. That word choice matters.",
      example: "ShopKart's fifth evening writer, E, waits <span class='state-chip queued'>queued</span> until a slot frees — the report is a minute late, never lost." },
    { slots: [null, "B", "C", "D"], queue: ["E"], label: "6 · A finishes",
      what: "Task A completes and <b>releases</b> its slot. One slot is now free, and the scheduler picks the highest-<code>priority_weight</code> waiter to fill it.",
      why: "Freeing on completion is what makes a pool a revolving door rather than a one-time gate — capacity recycles continuously as work drains through.",
      how: "On A's success (or failure) its slot returns to the pool. The scheduler re-evaluates queued, slot-eligible tasks and admits the top-priority one.",
      when: "Every time a slot-holding task finishes while others wait.",
      mistake: "Assuming FIFO admission. Order is by <code>priority_weight</code>, not arrival — a late high-priority task can jump the queue.",
      interview: "“When a pool slot frees, which waiting task gets it?” The highest <code>priority_weight</code>, arrival order as tiebreaker — not simply first-in.",
      example: "When ShopKart's extract finishes, the freed warehouse slot goes to the high-<code>priority_weight</code> revenue report ahead of a low-priority backfill." },
    { slots: ["E", "B", "C", "D"], queue: [], label: "7 · E is admitted",
      what: "E claims the freed slot and starts. Throughout, the pool never exceeded its <b>cap of 4</b> — exactly the invariant a pool exists to hold.",
      why: "That ceiling is the whole point. No matter how bursty the arrivals, the warehouse never saw more than four concurrent writers — the resource stayed safe.",
      how: "Admission is continuous: finish → free slot → admit next waiter, holding the cap steady as work flows through over time.",
      when: "Continuously, for the life of the pool — it's a steady-state throttle, not a one-shot limit.",
      mistake: "Thinking a pool caps <i>total</i> tasks. It caps <i>concurrent</i> tasks — any number can pass through over time, just never more than N at once.",
      interview: "“What does a pool actually guarantee?” A ceiling on <i>concurrent</i> slot-holders, held continuously as tasks enter and leave — not a limit on total runs.",
      example: "ShopKart pushed a hundred writes through <code>db_pool</code> that evening; the warehouse never saw more than four at any instant." }
  ];

  var LIMITS = [
    ["pool / pool_slots", "Cap concurrent tasks across all DAGs; a task may take >1 slot."],
    ["default_pool", "Every task is in it unless assigned another (128 slots by default)."],
    ["priority_weight", "Orders which queued task grabs a freed slot first."],
    ["max_active_tasks", "Per-DAG cap on running tasks (was concurrency)."],
    ["max_active_runs", "Per-DAG cap on concurrent DAG runs."]
  ];

  var CLI = "# Create / resize a pool\nairflow pools set db_pool 4 \"warehouse write throttle\"";

  var module = {
    id: "pools",
    title: "Pools & Slots",
    fullWidth: true,
    _engine: null, _controls: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Execution</div>' +
          '<h1 class="module-title">Pools: throttling concurrency</h1>' +
          '<p class="module-subtitle">A <b>pool</b> is a bucket of slots that caps how many tasks run at once — perfect for ' +
          "protecting a fragile downstream system like a database or an API.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="pl-canvas"><div class="pool-viz" id="pl-viz"></div></div>' +
          '<aside class="arch-detail" id="pl-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="pl-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">Create a pool</h2>' +
          '<div id="pl-cli"></div>' +
        "</section>" +
        '<section class="section">' +
          '<h2 class="section-title">The concurrency knobs</h2>' +
          '<div class="table-wrap"><table class="cmp-table" id="pl-table"></table></div>' +
        "</section>";

      var viz = container.querySelector("#pl-viz");
      var detail = container.querySelector("#pl-detail");

      function renderViz(step) {
        var slots = step ? step.slots : [null, null, null, null];
        var queue = step ? step.queue : [];
        var used = slots.filter(Boolean).length;
        var slotHtml = slots.map(function (t) {
          return '<div class="pool-slot ' + (t ? "filled" : "") + '">' +
            (t ? '<span class="task-chip">' + t + "</span>" : '<span class="slot-empty">free</span>') + "</div>";
        }).join("");
        var queueHtml = queue.length
          ? queue.map(function (t) { return '<span class="task-chip queued">' + t + "</span>"; }).join("")
          : '<span class="slot-empty">empty</span>';
        viz.innerHTML =
          '<div class="pool-head"><span class="pool-name">db_pool</span>' +
            '<span class="pool-count">' + used + " / 4 slots</span></div>" +
          '<div class="pool-slots">' + slotHtml + "</div>" +
          '<div class="pool-queue-lane"><span class="pool-queue-label">queue</span>' +
            '<div class="pool-queue">' + queueHtml + "</div></div>";
      }

      function showStep(idx) {
        if (idx < 0) {
          renderViz(null);
          detail.innerHTML = '<div class="arch-detail-title">4 slots, many tasks</div>' +
            "<p>Press play to watch tasks claim slots, saturate the pool, queue up, and get admitted as slots free.</p>" +
            '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">🎚️</span>' +
            '<div class="callout-body">A pool caps concurrency <b>across all DAGs</b> — the classic way to protect a shared database.</div></div>';
          return;
        }
        renderViz(STEPS[idx]);
        detail.innerHTML = AV.Explain.render(STEPS[idx]);
      }

      container.querySelector("#pl-cli").appendChild(AV.CodeViewer.create({ title: "airflow CLI", lang: "bash", code: CLI }));
      var head = "<thead><tr><th>Setting</th><th>What it limits</th></tr></thead>";
      container.querySelector("#pl-table").innerHTML = head + "<tbody>" +
        LIMITS.map(function (r) { return "<tr><td class='cmp-dim'><code>" + r[0] + "</code></td><td>" + r[1] + "</td></tr>"; }).join("") +
        "</tbody>";

      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1 });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) { showStep(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#pl-controls").appendChild(controls.el);
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
