/* ============================================================
   modules/dag-run.js — DAG runs & the data interval model
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // Three daily intervals; each run fires at the END of its interval.
  var ITEMS = [
    { id: "d0", label: "interval 1", sub: "Jan 1 00:00 → Jan 2 00:00", t0: 0, t1: 1, state: "success" },
    { id: "d1", label: "interval 2", sub: "Jan 2 00:00 → Jan 3 00:00", t0: 1, t1: 2, state: "success" },
    { id: "d2", label: "interval 3", sub: "Jan 3 00:00 → Jan 4 00:00", t0: 2, t1: 3, state: "running" }
  ];
  var MARKERS = [
    { id: "r0", t: 1, label: "run 1 fires" },
    { id: "r1", t: 2, label: "run 2 fires" },
    { id: "r2", t: 3, label: "run 3 fires" }
  ];
  var TICKS = [
    { t: 0, label: "Jan 1" }, { t: 1, label: "Jan 2" }, { t: 2, label: "Jan 3" }, { t: 3, label: "Jan 4" }
  ];

  var STEPS = [
    { label: "1 · A data interval", item: "d0",
      what: "A scheduled DAG run covers a <b>data interval</b> — a window of time, not a single instant. This run represents all of <b>Jan 1</b>.",
      why: "Batch pipelines process <i>periods</i> of data (“yesterday's orders”), so Airflow's unit of work is an interval, not a clock tick. That's what makes runs precise and backfillable.",
      how: "The DAG's timetable defines interval boundaries (<code>data_interval_start</code> and <code>_end</code>). A <code>@daily</code> DAG's intervals run midnight-to-midnight; each run is bound to exactly one of them.",
      when: "Defined the moment the schedule is set; every scheduled run inherits an interval.",
      mistake: "Picturing a run as “the job at 2&nbsp;AM” instead of “the job <i>for</i> a day.” The interval, not the trigger time, is what your SQL should filter on.",
      interview: "The #1 Airflow scheduling question. Framing a run as “a completed interval of data” separates people who've operated Airflow from those who've only read about it.",
      example: "ShopKart's daily sales run for the Jan-1 interval aggregates every order timestamped within Jan&nbsp;1 — the interval bounds <i>are</i> the <code>WHERE</code> clause." },

    { label: "2 · The run fires at the END", item: "d0", marker: "r0",
      what: "Airflow waits until the interval is <b>complete</b>, then fires the run at <code>data_interval_end</code> — the start of Jan&nbsp;2 for the Jan&nbsp;1 interval.",
      why: "You can't process a day's data until the day is over. Firing at the end guarantees all the data for the interval actually exists before the run touches it.",
      how: "The timetable computes the interval's end; the scheduler creates the run only once wall-clock time has passed that end. So the Jan-1 run starts just after midnight on Jan&nbsp;2.",
      when: "At the close of each interval, for every scheduled DAG.",
      mistake: "Expecting a <code>@daily</code> DAG to run <i>on</i> the date it's “for.” It runs the following period — the classic “my Monday run appeared Tuesday” confusion.",
      interview: "A guaranteed probe: “when does a daily DAG for Jan 15 run?” The right answer — just after midnight Jan 16 — with the reason: the interval must close first.",
      example: "ShopKart's Jan-1 sales run appears at 00:05 on Jan&nbsp;2, after the day's final orders have landed — never mid-day on Jan&nbsp;1." },

    { label: "3 · logical_date", item: "d0", marker: "r0",
      what: "The run's <code>logical_date</code> (formerly <code>execution_date</code>) equals <code>data_interval_start</code> — <b>Jan&nbsp;1</b> — even though the wall clock says Jan&nbsp;2.",
      why: "Your queries need the date the data belongs to, not the date the job happens to run. <code>logical_date</code> gives every run a stable, meaningful stamp you can template against.",
      how: "Airflow injects <code>logical_date</code>, <code>data_interval_start</code>, and <code>data_interval_end</code> into the task context. Reference them in templates like <code>{{ data_interval_start }}</code> so a rerun for the same date processes the same window.",
      when: "Fixed for the life of the run; identical on every retry and manual rerun of that run.",
      mistake: "Using <code>datetime.now()</code> in a task instead of the logical date. That breaks idempotency — a backfill would process “today's” data for every historical run.",
      interview: "Interviewers test idempotency here: “how do you make a task safe to re-run?” Answer: drive it off <code>logical_date</code>/interval, never wall-clock time.",
      example: "ShopKart's extract templates <code>WHERE order_date = '{{ ds }}'</code>; rerunning the Jan-1 run months later still pulls exactly Jan-1 orders." },

    { label: "4 · The next interval", item: "d1", marker: "r1",
      what: "Interval 2 (Jan&nbsp;2) completes and its run fires on Jan&nbsp;3. Runs march forward one interval at a time.",
      why: "Sequential intervals give you a complete, gap-free history — every period gets exactly one run, which is what makes backfills and audits reliable.",
      how: "After each interval closes the scheduler advances to the next, creating the run at that interval's end. With <code>catchup=True</code> it fills every missed interval in order; with <code>catchup=False</code> it jumps to the latest.",
      when: "Each time an interval closes, one after another, for as long as the DAG is active.",
      mistake: "Leaving <code>catchup=True</code> on a DAG with an old <code>start_date</code> — Airflow schedules a run for <i>every</i> missed interval and stampedes your sources.",
      interview: "Common trap: “what happens if you deploy a DAG with a start_date six months ago?” Name catchup and the flood of backfilled runs it triggers.",
      example: "ShopKart sets <code>catchup=False</code> on a new DAG so it starts from today, not 180 back-runs hammering the orders API at once." },

    { label: "5 · Today is still running", item: "d2", marker: "r2",
      what: "Interval 3 (Jan&nbsp;3) is in flight — its run is <span class='state-chip running'>running</span>. There is <b>no</b> run yet for the current, not-yet-closed interval.",
      why: "Since a run needs a <i>completed</i> interval, the period you're living in can't have one until it ends. The “missing” latest run is correct, not a bug.",
      how: "The scheduler only creates the next run once today's interval closes at midnight. Until then, the most recent run is the previous, already-closed interval.",
      when: "For the entire duration of the current interval, right up to its boundary.",
      mistake: "Filing a “today's run is missing!” ticket. There's simply no run for an interval that hasn't finished — you need a manual run or a wait until midnight.",
      interview: "A subtle check: “why don't I see a run for today?” The interval-must-close rule is the answer, and it catches people who memorized cron instead of the interval model.",
      example: "At 15:00 on Jan&nbsp;3, ShopKart's latest scheduled run is still the Jan-2 interval; the Jan-3 run won't exist until just after midnight." }
  ];

  var RUN_TYPES = [
    { k: "scheduled", d: "Created by the timetable when an interval closes." },
    { k: "manual", d: "Triggered from the UI/CLI/API — data interval is a single point." },
    { k: "backfill", d: "Fills historical intervals via `airflow dags backfill`." },
    { k: "asset / dataset", d: "Triggered when an upstream dataset (asset) updates, not by a clock." }
  ];

  var module = {
    id: "dag-run",
    title: "DAG Run Lifecycle",
    fullWidth: true,
    _engine: null, _controls: null, _tl: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Scheduling</div>' +
          '<h1 class="module-title">DAG runs & the data interval</h1>' +
          '<p class="module-subtitle">The single most misunderstood thing in Airflow: a scheduled run covers an ' +
          "<i>interval of time</i> and fires at its <b>end</b>. Step through three daily runs.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="dr-canvas"></div>' +
          '<aside class="arch-detail" id="dr-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="dr-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">Run types</h2>' +
          '<div class="card-grid" id="dr-types"></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout warn"><span class="callout-icon">⚠️</span><div class="callout-body">' +
          "<b>catchup:</b> if a DAG's <code>start_date</code> is in the past and <code>catchup=True</code> (the old default), " +
          "Airflow schedules a run for <b>every missed interval</b>. Set <code>catchup=False</code> unless you truly want backfilled history.</div></div>" +
          '<div class="callout info"><span class="badge badge-v2">2.x</span><div class="callout-body">' +
          "<code>execution_date</code> was renamed to <b>logical_date</b>, and the data-interval model " +
          "(<code>data_interval_start</code>/<code>_end</code>) replaced the old \"execution date = previous run\" mental gymnastics.</div></div>" +
        "</section>";

      var tl = AV.Timeline.create({ items: ITEMS, markers: MARKERS, ticks: TICKS, span: [0, 3], viewBox: "0 0 960 200" });
      container.querySelector("#dr-canvas").appendChild(tl.el);
      this._tl = tl;

      var detail = container.querySelector("#dr-detail");
      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">Intervals, not instants</div>' +
          "<p>Press play to watch three daily runs. Notice each run fires at the <b>end</b> of the interval it covers.</p>" +
          '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">🕒</span>' +
          '<div class="callout-body">Rule of thumb: <b>a @daily run for date D executes just after midnight on D+1.</b></div></div>';
      }
      function showStep(idx) {
        if (idx < 0) { defaultDetail(); return; }
        detail.innerHTML = AV.Explain.render(STEPS[idx]);
      }

      container.querySelector("#dr-types").innerHTML = RUN_TYPES.map(function (r) {
        return '<div class="card"><div class="card-title"><span class="badge badge-airflow">' + r.k + "</span></div><p>" +
          r.d.replace(/`([^`]+)`/g, "<code>$1</code>") + "</p></div>";
      }).join("");

      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2800 }; }), speed: 1 });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) {
        tl.clear();
        if (idx < 0) { showStep(-1); return; }
        var s = STEPS[idx];
        tl.setActive(s.item);
        if (s.marker) tl.setMarker(s.marker);
        showStep(idx);
      });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#dr-controls").appendChild(controls.el);
      this._controls = controls;
      defaultDetail();
    },

    destroy: function () {
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      if (this._tl) { this._tl.destroy(); this._tl = null; }
    }
  };

  AV.registerModule(module);
})();
