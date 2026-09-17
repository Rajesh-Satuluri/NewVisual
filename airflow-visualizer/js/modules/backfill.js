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
      what: "ShopKart adds a DAG on Jan 5 with <code>start_date = Jan 1</code>. That leaves <b>four missed intervals</b> (Jan 1–4) the DAG was never around to run.",
      why: "Airflow schedules by <i>interval</i>, and a past start_date implies intervals that already elapsed. Whether those run is the whole catchup question.",
      how: "On unpause, the scheduler compares the DAG's start_date and schedule against now and finds every interval that has no DAG run yet.",
      when: "Any DAG whose start_date is earlier than the moment you deploy or unpause it.",
      mistake: "Setting <code>start_date</code> to a far-past date “to be safe”, not realising every elapsed interval becomes a candidate run.",
      interview: "“What decides how many historical runs a new DAG creates?” The gap between <code>start_date</code> and now, divided by the schedule — plus the <code>catchup</code> flag.",
      example: "ShopKart's analyst backdates <code>start_date</code> to Jan 1 for a Jan 5 deploy, quietly queuing four days of history." },
    { label: "2 · catchup fills interval 1", item: "d0", marker: "r0",
      what: "With <code>catchup=True</code>, unpausing the DAG makes the scheduler create a run for the <b>first</b> missed interval (Jan 1) and begin working forward.",
      why: "Catchup exists so a pipeline can reprocess history automatically — stand up a DAG today and have it compute every day it should have covered.",
      how: "The scheduler enqueues missed intervals oldest-first, each as a normal DAG run with its own logical date, then proceeds chronologically.",
      when: "When you genuinely want historical intervals reprocessed on deploy.",
      mistake: "Leaving <code>catchup=True</code> (the 2.x default) by accident, so a long-backdated DAG floods the scheduler on unpause.",
      interview: "“What does catchup=True do on unpause?” Creates a run for every missed interval since start_date, oldest first — powerful, and a classic foot-gun.",
      example: "ShopKart's reprocessing DAG is deliberately <code>catchup=True</code> so it rebuilds Jan 1 onward the moment it's unpaused." },
    { label: "3 · … interval 2", item: "d1", marker: "r1",
      what: "It keeps creating runs for each missed interval, <b>oldest first</b>, while honouring <code>max_active_runs</code> so it doesn't launch them all at once.",
      why: "Chronological order matters because a day's run often depends on the prior day's output; <code>max_active_runs</code> caps concurrency so catchup doesn't stampede the executor.",
      how: "The scheduler holds no more than <code>max_active_runs</code> catchup runs in flight; as each finishes, the next-oldest interval starts.",
      when: "Throughout a catchup, and any time you want to throttle historical reprocessing.",
      mistake: "Leaving <code>max_active_runs</code> high during a big catchup, so hundreds of runs hit the warehouse simultaneously.",
      interview: "“How do you stop a year-long backfill from overwhelming the cluster?” Cap <code>max_active_runs</code> (and pool slots) so intervals process a few at a time, in order.",
      example: "ShopKart sets <code>max_active_runs=2</code> so its multi-week catchup rebuilds two days at a time instead of melting the warehouse." },
    { label: "4 · … interval 3", item: "d2", marker: "r2",
      what: "Each historical run gets its own <b><code>logical_date</code></b>, so templated dates like <code>{{ ds }}</code> render for <i>that</i> interval — not for today.",
      why: "This is what makes catchup correct rather than dangerous: run N reprocesses day N's data because its date macros resolve to day N.",
      how: "Airflow stamps each backfilled run with the interval's logical date; every <code>{{ ds }}</code>, partition path, and SQL filter renders against it.",
      when: "Every catchup or backfill of a date-partitioned pipeline.",
      mistake: "Writing tasks against <code>datetime.now()</code> instead of <code>{{ ds }}</code> — then every backfilled run processes today's data and the catchup is worthless.",
      interview: "“Why must backfill tasks be idempotent and date-templated?” Each run carries its interval's <code>logical_date</code>; only date-templated, idempotent tasks reprocess the right day repeatably.",
      example: "ShopKart's Jan 3 catchup run renders <code>WHERE date = '2024-01-03'</code>, rebuilding exactly that day's sales." },
    { label: "5 · … interval 4", item: "d3", marker: "r3",
      what: "Four missed runs are now backfilled. The DAG has <b>caught up</b> to the present and the historical gap is closed.",
      why: "Once history is filled, the DAG's state matches reality — every interval since start_date has a run — and normal scheduling can take over seamlessly.",
      how: "With no earlier interval left un-run, the scheduler stops creating catchup runs and waits for the next real interval boundary.",
      when: "At the end of any catchup, when the backlog is drained.",
      mistake: "Assuming catchup will re-run intervals that already succeeded. It fills <i>missing</i> runs only — it won't duplicate ones that exist.",
      interview: "“Does catchup re-run intervals that already ran?” No — only intervals with no existing DAG run. To redo completed ones you clear them or backfill with <code>--reset-dagruns</code>.",
      example: "By Jan 5 ShopKart's DAG has runs for Jan 1–4 in the metadata DB and simply proceeds normally from here." },
    { label: "6 · Current interval", item: "d4", marker: "r4",
      what: "From here the DAG runs normally on schedule. <b>Manual backfill</b> (the CLI below) does the same interval-filling on demand for any date range you name.",
      why: "Sometimes you need to reprocess a <i>specific</i> historical window — a bug fix, a late-arriving source — without changing start_date or toggling catchup. That's manual backfill.",
      how: "Run <code>airflow dags backfill --start-date … --end-date … dag_id</code>; add <code>--reset-dagruns</code> to redo intervals that already ran.",
      when: "Targeted reprocessing of a known date range after a code fix or data correction.",
      mistake: "Reaching for catchup (all-or-nothing from start_date) when you only need three days re-run — manual backfill scopes it to exactly that window.",
      interview: "“How do you reprocess just last week after fixing a bug?” <code>airflow dags backfill</code> with that <code>--start-date</code>/<code>--end-date</code> and <code>--reset-dagruns</code> — no start_date surgery.",
      example: "After patching a transform, ShopKart backfills only Jan 8–14 with <code>--reset-dagruns</code>, leaving every other run untouched." }
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
        detail.innerHTML = AV.Explain.render(STEPS[idx]);
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
