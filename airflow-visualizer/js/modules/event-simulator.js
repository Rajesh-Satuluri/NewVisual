/* ============================================================
   modules/event-simulator.js — interactive scenario player
   Pick a scenario; step through the lifecycle as an event log.
   Idx-driven: each step renders the full event history.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // Each event: { t, actor, msg, state } — state is the task's chip after this event.
  var SCENARIOS = {
    happy: {
      icon: "✅", title: "Happy path",
      blurb: "A task is scheduled, queued, runs, and succeeds — the flow you want every night.",
      events: [
        { t: "00:00", actor: "scheduler", msg: "DAG run created for logical_date 2024-01-15", state: "scheduled" },
        { t: "00:00", actor: "scheduler", msg: "Dependencies met — task instance queued", state: "queued" },
        { t: "00:01", actor: "executor",  msg: "Slot free — dispatched to worker", state: "running" },
        { t: "00:03", actor: "worker",    msg: "Callable returned; logs uploaded", state: "running" },
        { t: "00:03", actor: "scheduler", msg: "State recorded → success; downstream unblocked", state: "success" }
      ]
    },
    retry: {
      icon: "🔁", title: "Failure → retry → success",
      blurb: "A flaky API call fails once, waits out the retry delay, and succeeds on the second attempt.",
      events: [
        { t: "00:00", actor: "executor",  msg: "Attempt 1 dispatched (try_number=1)", state: "running" },
        { t: "00:02", actor: "worker",    msg: "RateLimitError raised", state: "failed" },
        { t: "00:02", actor: "scheduler", msg: "try_number(1) ≤ retries(3) → up_for_retry; on_retry_callback fires", state: "up-for-retry" },
        { t: "00:07", actor: "scheduler", msg: "retry_delay elapsed — attempt 2 queued (try_number=2)", state: "queued" },
        { t: "00:07", actor: "executor",  msg: "Attempt 2 dispatched", state: "running" },
        { t: "00:09", actor: "worker",    msg: "Callable returned successfully", state: "success" }
      ]
    },
    zombie: {
      icon: "🧟", title: "Worker dies mid-task",
      blurb: "A worker is OOMKilled while a task runs. Zombie detection reaps it so retries can recover.",
      events: [
        { t: "00:00", actor: "executor",  msg: "Task dispatched to worker pod", state: "running" },
        { t: "00:01", actor: "worker",    msg: "Loading 6 GB into memory…", state: "running" },
        { t: "00:02", actor: "k8s",       msg: "Pod OOMKilled (exit 137) — no report back", state: "running" },
        { t: "00:07", actor: "scheduler", msg: "Heartbeat stale > threshold → detected as zombie", state: "up-for-retry" },
        { t: "00:07", actor: "scheduler", msg: "Marked up_for_retry; will re-dispatch on next loop", state: "queued" },
        { t: "00:08", actor: "executor",  msg: "Re-dispatched with more memory (executor_config)", state: "running" }
      ]
    },
    deferred: {
      icon: "⏳", title: "Deferrable sensor wait",
      blurb: "A sensor yields its worker slot to the triggerer while waiting for an S3 file.",
      events: [
        { t: "00:00", actor: "executor",  msg: "Deferrable S3 sensor starts on a worker", state: "running" },
        { t: "00:00", actor: "worker",    msg: "File not present — task defers, releases slot", state: "deferred" },
        { t: "00:00", actor: "triggerer", msg: "Trigger registered on async event loop", state: "deferred" },
        { t: "02:14", actor: "triggerer", msg: "S3 object appeared — trigger fires", state: "queued" },
        { t: "02:14", actor: "executor",  msg: "Task rescheduled onto a worker to finish", state: "running" },
        { t: "02:15", actor: "scheduler", msg: "Sensor satisfied → success; downstream starts", state: "success" }
      ]
    },
    backfill: {
      icon: "⏮️", title: "Backfill a date range",
      blurb: "Three historical intervals are filled, throttled by max_active_runs so the DB isn't stampeded.",
      events: [
        { t: "run", actor: "operator",  msg: "airflow dags backfill -s 2024-01-01 -e 2024-01-03", state: "scheduled" },
        { t: "run", actor: "scheduler", msg: "3 runs created; max_active_runs=1 throttles them", state: "queued" },
        { t: "+1",  actor: "executor",  msg: "Jan 01 run executes to success", state: "success" },
        { t: "+2",  actor: "executor",  msg: "Jan 02 run executes to success", state: "success" },
        { t: "+3",  actor: "executor",  msg: "Jan 03 run executes to success — history filled", state: "success" }
      ]
    }
  };

  var ORDER = ["happy", "retry", "zombie", "deferred", "backfill"];

  var module = {
    id: "event-simulator",
    title: "Event Simulator",
    fullWidth: true,
    _engine: null, _controls: null, _off: null, _root: null, _pickHandler: null,

    render: function (container) {
      var self = this;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Interactive</div>' +
          '<h1 class="module-title">Event simulator: watch a task instance react</h1>' +
          '<p class="module-subtitle">Pick a scenario and press play to step through the exact sequence of events — ' +
          "who does what, and how the task's state changes — for the situations Airflow handles every day.</p>" +
        "</div>" +
        '<div class="sim-picker" id="sim-picker">' +
          ORDER.map(function (k, i) {
            var s = SCENARIOS[k];
            return '<button class="sim-scenario' + (i === 0 ? " active" : "") + '" data-key="' + k + '">' +
              '<span class="sim-scenario-icon">' + s.icon + "</span>" +
              '<span class="sim-scenario-title">' + s.title + "</span></button>";
          }).join("") +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas"><div class="sim-log" id="sim-log"></div></div>' +
          '<aside class="arch-detail" id="sim-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="sim-controls"></div>';

      this._root = container;
      var logEl = container.querySelector("#sim-log");
      var detail = container.querySelector("#sim-detail");
      var controlsHost = container.querySelector("#sim-controls");
      var picker = container.querySelector("#sim-picker");
      var current = "happy";

      function renderLog(upto) {
        var sc = SCENARIOS[current];
        if (upto < 0) {
          logEl.innerHTML = '<div class="sim-empty"><span class="sim-scenario-icon">' + sc.icon +
            "</span><p>" + sc.blurb + "</p><p class='sim-hint'>Press play to run the scenario.</p></div>";
          return;
        }
        var rows = "";
        for (var i = 0; i <= upto; i++) {
          var e = sc.events[i];
          var isLast = i === upto;
          rows +=
            '<div class="sim-event' + (isLast ? " sim-event-new" : "") + '">' +
              '<span class="sim-time">' + e.t + "</span>" +
              '<span class="badge badge-airflow sim-actor">' + e.actor + "</span>" +
              '<span class="sim-msg">' + e.msg + "</span>" +
              '<span class="state-chip ' + e.state + ' sim-state">' + e.state + "</span>" +
            "</div>";
        }
        logEl.innerHTML = '<div class="sim-events">' + rows + "</div>";
      }

      function showDetail(idx) {
        var sc = SCENARIOS[current];
        if (idx < 0) {
          detail.innerHTML =
            '<div class="arch-detail-title">' + sc.icon + " " + sc.title + "</div><p>" + sc.blurb + "</p>" +
            '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">🎬</span>' +
            '<div class="callout-body">Each event names the <b>actor</b> responsible — scheduler, executor, worker, triggerer — and the task\'s <b>state</b> after it.</div></div>';
          return;
        }
        var e = sc.events[idx];
        detail.innerHTML =
          '<div class="arch-detail-title">' + (idx + 1) + " / " + sc.events.length + " · " + e.actor + "</div>" +
          "<p>" + e.msg + '</p><p style="margin-top:var(--space-3)">Task state is now ' +
          '<span class="state-chip ' + e.state + '">' + e.state + "</span>.</p>";
      }

      function buildEngine() {
        if (self._off) { self._off(); self._off = null; }
        if (self._controls) { self._controls.destroy(); self._controls = null; }
        if (self._engine) { self._engine.destroy(); self._engine = null; }
        controlsHost.innerHTML = "";
        var sc = SCENARIOS[current];
        var engine = new AV.AnimationEngine({
          steps: sc.events.map(function (e) { return { label: e.actor + ": " + e.msg, duration: 2400 }; }), speed: 1
        });
        self._engine = engine;
        self._off = engine.on("stepchange", function (idx) { renderLog(idx); showDetail(idx); });
        var controls = AV.AnimationControls.create(engine, { title: sc.icon + " " + sc.title });
        controlsHost.appendChild(controls.el);
        self._controls = controls;
        renderLog(-1); showDetail(-1);
      }

      function onPick(e) {
        var btn = e.target.closest(".sim-scenario");
        if (!btn) return;
        picker.querySelectorAll(".sim-scenario").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        current = btn.getAttribute("data-key");
        buildEngine();
      }
      this._pickHandler = onPick;
      picker.addEventListener("click", onPick);

      buildEngine();
    },

    destroy: function () {
      if (this._root && this._pickHandler) {
        var p = this._root.querySelector("#sim-picker");
        if (p) p.removeEventListener("click", this._pickHandler);
      }
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      this._root = null; this._pickHandler = null;
    }
  };

  AV.registerModule(module);
})();
