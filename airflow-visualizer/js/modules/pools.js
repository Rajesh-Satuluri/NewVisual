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
      desc: "ShopKart's <code>db_pool</code> has <b>4 slots</b>, capping how many tasks can hit the warehouse at once — across every DAG." },
    { slots: ["A", null, null, null], queue: [], label: "2 · Task A claims a slot",
      desc: "A running task takes one slot (its <code>pool_slots</code>, default 1). 3 slots remain." },
    { slots: ["A", "B", "C", null], queue: [], label: "3 · B and C join",
      desc: "Three tasks now run concurrently. One slot is still free, so a fourth may start." },
    { slots: ["A", "B", "C", "D"], queue: [], label: "4 · Pool is full",
      desc: "All 4 slots are occupied. The pool is saturated — no more <code>db_pool</code> tasks can start." },
    { slots: ["A", "B", "C", "D"], queue: ["E"], label: "5 · Task E must wait",
      desc: "E is runnable and its deps are met, but the pool is full — so it sits <span class='state-chip queued'>queued</span>. Pools throttle, they don't drop." },
    { slots: [null, "B", "C", "D"], queue: ["E"], label: "6 · A finishes",
      desc: "A completes and releases its slot. A slot is now free for the highest-<b>priority_weight</b> waiter." },
    { slots: ["E", "B", "C", "D"], queue: [], label: "7 · E is admitted",
      desc: "E claims the freed slot and starts. The pool stayed at its cap of 4 the entire time — exactly the point of a pool." }
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
        detail.innerHTML = '<div class="arch-detail-title">' + STEPS[idx].label + "</div><p>" + STEPS[idx].desc + "</p>";
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
