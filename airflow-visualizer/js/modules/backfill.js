/* ============================================================
   modules/backfill.js — catchup & manual backfill
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var ITEMS = [
    { id: "d0", label: "Jan 1", t0: 0, t1: 1, state: "none" },
    { id: "d1", label: "Jan 2", t0: 1, t1: 2, state: "none" },
    { id: "d2", label: "Jan 3", t0: 2, t1: 3, state: "none" },
    { id: "d3", label: "Jan 4", t0: 3, t1: 4, state: "none" },
    { id: "d4", label: "Jan 5", t0: 4, t1: 5, state: "none" }
  ];
  var MARKERS = [1, 2, 3, 4, 5].map(function (t, i) { return { id: "r" + i, t: t, label: "run " + (i + 1) }; });
  var TICKS = [0, 1, 2, 3, 4, 5].map(function (t) { return { t: t, label: "Jan " + (t + 1) }; });

  var STEPS = [
    { label: "1 · A DAG with history", item: null, marker: null,
      desc: "ShopKart adds a DAG on Jan 5 with <code>start_date = Jan 1</code>. There are <b>four missed intervals</b> (Jan 1–4) it never ran." },
    { label: "2 · catchup fills interval 1", item: "d0", marker: "r0",
      desc: "With <code>catchup=True</code>, unpausing the DAG makes the scheduler create a run for the first missed interval." },
    { label: "3 · … interval 2", item: "d1", marker: "r1",
      desc: "It keeps creating runs for each missed interval, oldest first, honoring <b>max_active_runs</b> so it doesn't stampede." },
    { label: "4 · … interval 3", item: "d2", marker: "r2",
      desc: "Each historical run gets its own <b>logical_date</b>, so templated dates render correctly for that day." },
    { label: "5 · … interval 4", item: "d3", marker: "r3",
      desc: "Four missed runs are now backfilled. The DAG has \"caught up\" to the present." },
    { label: "6 · Current interval", item: "d4", marker: "r4",
      desc: "From here it runs normally on schedule. <b>Manual backfill</b> (the CLI below) does the same thing on demand for any date range." }
  ];

  var CLI =
    "# Fill a specific historical range on demand\n" +
    "airflow dags backfill \\\n" +
    "  --start-date 2024-01-01 \\\n" +
    "  --end-date   2024-01-04 \\\n" +
    "  --reset-dagruns \\\n" +
    "  daily_sales_etl";

  var module = {
    id: "backfill",
    title: "Backfill",
    fullWidth: true,
    _engine: null, _controls: null, _tl: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Scheduling</div>' +
          '<h1 class="module-title">Catchup &amp; backfill</h1>' +
          '<p class="module-subtitle">When a DAG\'s <code>start_date</code> is in the past, Airflow can run every interval ' +
          "it \"missed\". That's powerful for reprocessing — and a classic way to accidentally melt your scheduler.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="bf-canvas"></div>' +
          '<aside class="arch-detail" id="bf-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="bf-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">Manual backfill</h2>' +
          '<div id="bf-cli"></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout danger"><span class="callout-icon">🔥</span><div class="callout-body">' +
          "<b>The catchup trap:</b> unpausing a DAG with an old <code>start_date</code> and <code>catchup=True</code> " +
          "creates a run for <b>every</b> missed interval at once. A daily DAG dated a year back = 365 runs queued instantly. " +
          "Default to <code>catchup=False</code>.</div></div>" +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<code>catchup_by_default</code> is <b>False</b> from Airflow 3.0 on (it was True in 2.x). Backfill is also now " +
          "tracked as a first-class object you can trigger and monitor from the UI.</div></div>" +
        "</section>";

      var tl = AV.Timeline.create({ items: ITEMS.map(function (i) { return Object.assign({}, i); }), markers: MARKERS, ticks: TICKS, span: [0, 5], viewBox: "0 0 960 200" });
      container.querySelector("#bf-canvas").appendChild(tl.el);
      this._tl = tl;

      var detail = container.querySelector("#bf-detail");
      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">Filling the past</div>' +
          "<p>Press play to watch catchup create runs for four missed intervals, one at a time.</p>" +
          '<div class="callout warn" style="margin-top:var(--space-4)"><span class="callout-icon">⚠️</span>' +
          '<div class="callout-body"><b>catchup</b> and <b>backfill</b> do the same thing — fill missed intervals. ' +
          "catchup is automatic on unpause; backfill is the manual CLI.</div></div>";
      }
      function showStep(idx) {
        if (idx < 0) { defaultDetail(); return; }
        detail.innerHTML = '<div class="arch-detail-title">' + STEPS[idx].label + "</div><p>" + STEPS[idx].desc + "</p>";
      }

      container.querySelector("#bf-cli").appendChild(AV.CodeViewer.create({ title: "airflow CLI", lang: "bash", code: CLI }));

      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1 });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) {
        // Recompute fill state from scratch so prev/goto/reset stay correct.
        ITEMS.forEach(function (it) { tl.setItemState(it.id, "none"); });
        tl.clear();
        if (idx < 0) { showStep(-1); return; }
        for (var k = 1; k <= idx; k++) { if (STEPS[k].item) tl.setItemState(STEPS[k].item, "success"); }
        var s = STEPS[idx];
        if (s.item) tl.setActive(s.item);
        if (s.marker) tl.setMarker(s.marker);
        showStep(idx);
      });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#bf-controls").appendChild(controls.el);
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
