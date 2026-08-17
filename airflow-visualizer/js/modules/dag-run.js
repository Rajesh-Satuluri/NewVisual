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
      desc: "A scheduled DAG run covers a <b>data interval</b> — a window of time, not an instant. Here: all of <b>Jan 1</b>." },
    { label: "2 · The run fires at the END", item: "d0", marker: "r0",
      desc: "Airflow waits until the interval is <b>complete</b>, then fires the run at <b>data_interval_end</b> (start of Jan 2). This is why a <code>@daily</code> DAG for Jan 1 runs on Jan 2." },
    { label: "3 · logical_date", item: "d0", marker: "r0",
      desc: "The run's <b>logical_date</b> (formerly <code>execution_date</code>) equals <b>data_interval_start</b> — Jan 1 — even though wall-clock time is Jan 2. Templating uses these, e.g. <code>{{ data_interval_start }}</code>." },
    { label: "4 · The next interval", item: "d1", marker: "r1",
      desc: "Interval 2 (Jan 2) completes and its run fires on Jan 3. Runs march forward one interval at a time." },
    { label: "5 · Today is still running", item: "d2", marker: "r2",
      desc: "Interval 3 (Jan 3) is in flight — its run is <span class='state-chip running'>running</span>. There is no run for the current, not-yet-closed interval." }
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
        detail.innerHTML = '<div class="arch-detail-title">' + STEPS[idx].label + "</div><p>" + STEPS[idx].desc + "</p>";
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
