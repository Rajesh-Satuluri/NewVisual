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
      what: "The scheduler has created the task instance, but it isn't eligible to run yet — its state is <span class='state-chip' style='background:var(--bg-3)'>none</span>.",
      why: "A task instance must <i>exist</i> before Airflow can track it, but existing isn't the same as being ready. This starting state is the placeholder before any scheduling decision.",
      how: "When a DAG run is created, Airflow inserts one <code>task_instance</code> row per task in state <code>none</code>. Nothing about dependencies or slots has been evaluated yet.",
      when: "The instant a DAG run is created, before the scheduler's examine phase looks at it.",
      mistake: "Confusing “the run exists” with “the tasks are running.” Creating the run only <i>materializes</i> the instances; they still have to earn their way to running.",
      interview: "Sets up the whole state machine. Naming every state a TI passes through — and why — is a common “do you really know Airflow?” check.",
      example: "At 00:05 ShopKart's Jan-1 run is created; all 13 task instances briefly exist in <code>none</code> before the scheduler evaluates them." },

    { label: "2 · Scheduled", state: "scheduled", from: "none", to: "scheduled",
      what: "Dependencies are met and a run is due, so the scheduler marks the task <span class='state-chip scheduled'>scheduled</span> — it's now a candidate for the executor.",
      why: "<span class='state-chip scheduled'>scheduled</span> means “Airflow has decided this <i>should</i> run.” Separating that decision from actually running is what lets pools and concurrency gate work safely.",
      how: "In its examine phase the scheduler checks upstream trigger rules and marks eligible TIs <code>scheduled</code>. They wait here until there's capacity to hand them off.",
      when: "Once a task's dependencies are satisfied and its run is active.",
      mistake: "Reading <span class='state-chip scheduled'>scheduled</span> as “stuck.” It often just means the task is <i>gated</i> — waiting on a free pool slot or concurrency headroom.",
      interview: "“What does scheduled mean, exactly?” The scheduler's decision — not yet accepted by the executor. The scheduled-vs-queued distinction is the follow-up.",
      example: "ShopKart's <code>validate_data</code> flips to <span class='state-chip scheduled'>scheduled</span> the moment its three upstream extracts succeed." },

    { label: "3 · Queued", state: "queued", from: "scheduled", to: "queued",
      what: "The scheduler hands the task to the executor, and it sits in the queue as <span class='state-chip queued'>queued</span>, waiting for a worker.",
      why: "<span class='state-chip queued'>queued</span> marks the boundary between deciding and doing: the scheduler is done, the executor has taken ownership. That handoff is what lets execution scale independently.",
      how: "The scheduler enqueues the command; a Celery/K8s executor puts it on a broker or spins a pod. The TI stays <code>queued</code> until a worker actually picks it up.",
      when: "Immediately after selection, for every runnable TI, each loop.",
      mistake: "A task stuck in <span class='state-chip queued'>queued</span> usually means <b>no free workers</b> or a broker problem — not a code bug. People debug the DAG when they should check the executor.",
      interview: "The classic: <b>scheduled vs queued</b>? Scheduled = scheduler's decision; queued = executor has accepted it and it's awaiting a worker. Nail this distinction.",
      example: "On a busy ShopKart night, extracts queue behind each other because the Celery pool is saturated; they start as workers free up." },

    { label: "4 · Running", state: "running", from: "queued", to: "running",
      what: "A worker picks the task up and starts your operator's <code>execute()</code>; it heartbeats as <span class='state-chip running'>running</span>.",
      why: "Running is the only state where your actual code executes. Everything before it was orchestration; this is where the real I/O and compute happen.",
      how: "The worker launches a task process (supervised by LocalTaskJob), sets state to <code>running</code>, and writes a heartbeat every few seconds so Airflow knows it's alive.",
      when: "As soon as a worker accepts the queued task, for the duration of the attempt.",
      mistake: "Assuming a missing heartbeat means “still working.” If heartbeats stop past the threshold, Airflow declares the task a <b>zombie</b> and fails it.",
      interview: "Expect “how does Airflow know a task is still alive?” Heartbeats, not process-watching — because the worker and scheduler are usually on different machines.",
      example: "ShopKart's <code>transform_sales</code> runs for 8&nbsp;minutes, heartbeating throughout; the scheduler sees those beats and leaves it alone." },

    { label: "5 · Fails", state: "failed", from: "running", to: "failed",
      what: "The task raises an exception, so it moves to <span class='state-chip failed'>failed</span>. If <code>retries</code> remain, it won't stay here for long.",
      why: "Failure is a first-class, expected outcome in data pipelines — networks blip, APIs rate-limit. Modeling it as a state lets Airflow react (retry, alert) instead of just crashing.",
      how: "When <code>execute()</code> raises, the worker records <code>failed</code> and fires <code>on_failure_callback</code>. The scheduler then checks whether retries are configured before deciding what's next.",
      when: "The moment an attempt raises an uncaught exception.",
      mistake: "Treating every failure as terminal. With retries set, <span class='state-chip failed'>failed</span> is transient — the task will get another attempt after a delay.",
      interview: "“What happens when a task fails?” A senior answer covers the fork: callbacks fire, and if retries remain it goes to up_for_retry rather than staying failed.",
      example: "ShopKart's <code>extract_payments</code> hits a payment-API timeout and fails; because <code>retries=3</code>, it's headed for a retry, not a page." },

    { label: "6 · Up for retry", state: "up_for_retry", from: "failed", to: "up_for_retry",
      what: "Because retries remain, the task becomes <span class='state-chip up-for-retry'>up_for_retry</span> and waits out its <code>retry_delay</code>.",
      why: "Most failures are transient, so pausing before another attempt (ideally with backoff) gives the flaky dependency time to recover instead of hammering it.",
      how: "The scheduler sets <code>up_for_retry</code>, records the next eligible time as <code>now + retry_delay</code>, and increments the attempt counter. With <code>retry_exponential_backoff</code>, the delay grows each time.",
      when: "After a failure, whenever the used attempts are still below <code>retries</code>.",
      mistake: "Setting <code>retries</code> high with no backoff on a rate-limited API — you just retry into the same wall faster. Pair retries with exponential backoff.",
      interview: "“How would you make a flaky API task resilient?” Retries + <code>retry_delay</code> + exponential backoff, plus idempotent task logic so a retry is safe.",
      example: "ShopKart's payment extract waits 5&nbsp;minutes (then 10, then 20) between attempts, riding out a brief provider outage without manual help." },

    { label: "7 · Rescheduled", state: "scheduled", from: "up_for_retry", to: "scheduled",
      what: "After the delay elapses, the task returns to <span class='state-chip scheduled'>scheduled</span> — the run/queue cycle begins again for a fresh attempt.",
      why: "A retry isn't special-cased; it simply re-enters the normal scheduling path. Reusing the same gates keeps the state machine simple and predictable.",
      how: "When wall-clock time passes the recorded retry time, the scheduler flips <code>up_for_retry</code> back to <code>scheduled</code>. From here it's treated like any other eligible task.",
      when: "The moment the <code>retry_delay</code> has fully elapsed.",
      mistake: "Expecting an instant retry. The task won't move until the delay is up and the scheduler's next loop picks it back into <code>scheduled</code>.",
      interview: "A good place to show you grasp the loop: a retry re-uses scheduled → queued → running, it doesn't jump straight back to running.",
      example: "At 02:20 ShopKart's payment task returns to <span class='state-chip scheduled'>scheduled</span>, ready to be queued again exactly like the first attempt." },

    { label: "8 · Queued again", state: "queued", from: "scheduled", to: "queued",
      what: "The retry is handed to the executor and sits as <span class='state-chip queued'>queued</span> again, awaiting a worker.",
      why: "Every attempt goes through the same handoff so pools, priorities, and concurrency apply identically — attempt two doesn't get to skip the line.",
      how: "Just like the first time, the scheduler enqueues the command and the executor places it on compute; the TI waits in <code>queued</code> for a free worker.",
      when: "Right after the retry re-enters <code>scheduled</code> and is selected.",
      mistake: "Assuming a retry runs on the <i>same</i> worker or reuses prior state. It's a clean new attempt, possibly on a different worker entirely.",
      interview: "Reinforces the “retries are just re-runs through the machine” idea — a concrete way to show the state model clicks for you.",
      example: "ShopKart's second payment attempt queues on the Celery <code>default</code> pool and is picked up by whichever worker frees first." },

    { label: "9 · Running again", state: "running", from: "queued", to: "running",
      what: "The retry attempt runs; note that <code>try_number</code> has incremented — each attempt gets its <b>own log file</b>.",
      why: "Separate logs per attempt are essential for debugging: you can compare attempt 1's error with attempt 2's success without them overwriting each other.",
      how: "The worker runs <code>execute()</code> again with an incremented <code>try_number</code>; Airflow writes a distinct log for this attempt, which the UI exposes via the attempt selector.",
      when: "When a worker picks up the re-queued retry.",
      mistake: "Looking at only the latest log and missing why earlier attempts failed. The per-attempt history is right there in the UI's try selector.",
      interview: "“Where do you look when a task passed only on retry 3?” Point to per-attempt logs and <code>try_number</code> — it shows real operational habits.",
      example: "ShopKart opens attempt 2 of the payment task and sees it connect cleanly, while attempt 1's log still shows the timeout — both preserved." },

    { label: "10 · Success", state: "success", from: "running", to: "success",
      what: "The attempt exits cleanly, so the task lands in <span class='state-chip success'>success</span>. Downstream tasks whose dependencies are now satisfied become eligible.",
      why: "Success isn't just an end state — it's a <i>trigger</i>. Completing a task is what unblocks the next layer of the DAG, propagating work forward.",
      how: "The worker records <code>success</code> and any XCom; on its next loop the scheduler re-evaluates downstream trigger rules and moves newly-eligible tasks to <code>scheduled</code>.",
      when: "When an attempt returns without raising.",
      mistake: "Expecting downstream tasks to start the same instant. They wait for the scheduler's next examine phase to notice their deps are met.",
      interview: "Ties the machine together: success cascades. A strong candidate connects one task's success to the scheduler re-checking trigger rules for the rest.",
      example: "ShopKart's <code>extract_payments</code> finally succeeds on attempt 2; on the next loop <code>reconcile_payments</code> becomes eligible and the pipeline moves on." }
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
        detail.innerHTML = AV.Explain.render(STEPS[idx]);
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
