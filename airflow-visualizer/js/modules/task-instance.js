/* ============================================================
   modules/task-instance.js — the task instance state machine
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var STATES = [
    { id: "none",            label: "none",            x: 30,  y: 206, kind: "none" },
    { id: "scheduled",       label: "scheduled",       x: 185, y: 206, kind: "scheduled" },
    { id: "queued",          label: "queued",          x: 345, y: 206, kind: "queued" },
    { id: "running",         label: "running",         x: 525, y: 206, kind: "running" },
    { id: "success",         label: "success",         x: 795, y: 120, kind: "success" },
    { id: "failed",          label: "failed",          x: 795, y: 292, kind: "failed" },
    { id: "up_for_retry",    label: "up_for_retry",    x: 525, y: 372, kind: "up_for_retry" },
    { id: "deferred",        label: "deferred",        x: 525, y: 44,  kind: "deferred" },
    { id: "skipped",         label: "skipped",         x: 185, y: 58,  kind: "skipped" },
    { id: "upstream_failed", label: "upstream_failed", x: 175, y: 352, w: 150, kind: "upstream_failed" }
  ];
  var TRANSITIONS = [
    { from: "none", to: "scheduled", label: "deps ok" },
    { from: "scheduled", to: "queued", label: "slot free" },
    { from: "scheduled", to: "skipped", label: "branch" },
    { from: "scheduled", to: "upstream_failed", label: "upstream failed" },
    { from: "queued", to: "running", label: "worker starts" },
    { from: "running", to: "success", label: "exit 0" },
    { from: "running", to: "failed", label: "raises" },
    { from: "running", to: "deferred", label: "self.defer()" },
    { from: "deferred", to: "running", label: "trigger fires" },
    { from: "failed", to: "up_for_retry", label: "retries left" },
    { from: "up_for_retry", to: "scheduled", label: "after delay" }
  ];

  // Narrated scenario: run → fail → retry → success.
  var STEPS = [
    { label: "1 · Created", state: "none",
      desc: "The scheduler has created the task instance but it isn't eligible to run yet — state is <span class='state-chip' style='background:var(--bg-3)'>none</span>." },
    { label: "2 · Scheduled", state: "scheduled", from: "none", to: "scheduled",
      desc: "Dependencies are met and a run is due, so the scheduler marks it <span class='state-chip scheduled'>scheduled</span>. It's now a candidate for the executor." },
    { label: "3 · Queued", state: "queued", from: "scheduled", to: "queued",
      desc: "The scheduler hands it to the executor; it sits in the queue as <span class='state-chip queued'>queued</span>. <b>scheduled vs queued</b> is a classic interview question — scheduled = scheduler's decision, queued = executor has accepted it." },
    { label: "4 · Running", state: "running", from: "queued", to: "running",
      desc: "A worker picks it up and starts <code>execute()</code>; it heartbeats as <span class='state-chip running'>running</span>." },
    { label: "5 · Fails", state: "failed", from: "running", to: "failed",
      desc: "The task raises an exception → <span class='state-chip failed'>failed</span>. If <code>retries</code> remain, it won't stay here." },
    { label: "6 · Up for retry", state: "up_for_retry", from: "failed", to: "up_for_retry",
      desc: "Because retries are left, it becomes <span class='state-chip up-for-retry'>up_for_retry</span> and waits for <code>retry_delay</code>." },
    { label: "7 · Rescheduled", state: "scheduled", from: "up_for_retry", to: "scheduled",
      desc: "After the delay it returns to <span class='state-chip scheduled'>scheduled</span> — the cycle begins again." },
    { label: "8 · Queued again", state: "queued", from: "scheduled", to: "queued",
      desc: "Back into the executor queue as <span class='state-chip queued'>queued</span>." },
    { label: "9 · Running again", state: "running", from: "queued", to: "running",
      desc: "The retry attempt runs. Note the <b>try_number</b> has incremented — each attempt has its own log." },
    { label: "10 · Success", state: "success", from: "running", to: "success",
      desc: "It exits cleanly → <span class='state-chip success'>success</span>. Downstream tasks whose deps are now satisfied become eligible." }
  ];

  var LEGEND = [
    ["scheduled", "scheduler decided it should run"],
    ["queued", "executor accepted it"],
    ["running", "worker is executing it"],
    ["success", "finished cleanly"],
    ["failed", "raised, no retries left"],
    ["up-for-retry", "will retry after a delay"],
    ["skipped", "branch / short-circuit skipped it"],
    ["deferred", "waiting async via the triggerer"]
  ];

  var module = {
    id: "task-instance",
    title: "Task Instance",
    fullWidth: true,
    _engine: null, _controls: null, _sm: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Core</div>' +
          '<h1 class="module-title">The task instance state machine</h1>' +
          '<p class="module-subtitle">A task instance is one run of one task for one logical date. Everything Airflow ' +
          "does to it is a transition between these states. Play the run-fail-retry-succeed scenario below.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="ti-canvas"></div>' +
          '<aside class="arch-detail" id="ti-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="ti-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">State cheat-sheet</h2>' +
          '<div class="sm-legend" id="ti-legend"></div>' +
        "</section>";

      var sm = AV.StateMachine.create({
        states: STATES, transitions: TRANSITIONS, viewBox: "0 0 960 450",
        onSelect: function (id) { showState(id); }
      });
      container.querySelector("#ti-canvas").appendChild(sm.el);
      this._sm = sm;

      var detail = container.querySelector("#ti-detail");
      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">Run → fail → retry → success</div>' +
          "<p>Press play to walk a task through a realistic lifecycle including one retry. Click any state to read what it means.</p>" +
          '<div class="callout info" style="margin-top:var(--space-4)"><span class="callout-icon">🔁</span>' +
          '<div class="callout-body">The retry loop (<b>failed → up_for_retry → scheduled</b>) is the single most ' +
          "common transition to explain in interviews.</div></div>";
      }
      function showStep(idx) {
        if (idx < 0) { defaultDetail(); return; }
        var s = STEPS[idx];
        detail.innerHTML = '<div class="arch-detail-title">' + s.label + "</div><p>" + s.desc + "</p>";
      }
      var NOTES = {
        none: "Created but not yet eligible — no scheduling decision made.",
        scheduled: "The scheduler has decided this TI should run and there's capacity to consider it.",
        queued: "Handed to the executor and waiting for a worker. Stuck here usually means no free slots or a broker problem.",
        running: "A worker is executing the task and heartbeating. A missed heartbeat past the timeout marks it failed (zombie).",
        success: "Task exited cleanly. Downstream tasks are re-evaluated.",
        failed: "Task raised and no retries remain. Triggers on_failure callbacks / alerts.",
        up_for_retry: "Failed but retries remain; waits retry_delay then returns to scheduled.",
        deferred: "Released its worker slot and is waiting on an async trigger via the triggerer.",
        skipped: "A branch or short-circuit decided this task shouldn't run.",
        upstream_failed: "An upstream task failed, so this one can never run under the default trigger rule."
      };
      function showState(id) {
        if (NOTES[id]) detail.innerHTML = '<div class="arch-detail-title"><code>' + id + "</code></div><p>" + NOTES[id] + "</p>";
      }

      container.querySelector("#ti-legend").innerHTML = LEGEND.map(function (row) {
        return '<div class="legend-item"><span class="state-chip ' + row[0] + '">' + row[0].replace(/-/g, "_") +
          "</span><span class='text-sm text-secondary'>" + row[1] + "</span></div>";
      }).join("");

      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2400 }; }), speed: 1 });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) {
        if (idx < 0) { sm.clear(); showStep(-1); return; }
        var s = STEPS[idx];
        sm.clear();
        sm.setActive(s.state);
        if (s.from && s.to) sm.flow(s.from, s.to);
        showStep(idx);
      });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#ti-controls").appendChild(controls.el);
      this._controls = controls;
      defaultDetail();
    },

    destroy: function () {
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      if (this._sm) { this._sm.destroy(); this._sm = null; }
    }
  };

  AV.registerModule(module);
})();
