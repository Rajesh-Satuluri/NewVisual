/* ============================================================
   modules/scheduling.js — schedules & timetables
   A schedule-type selector swaps a timeline of when runs fire.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var SCHEDULES = {
    daily: {
      label: "@daily",
      cron: "0 0 * * *",
      what: "<code>@daily</code> (cron <code>0 0 * * *</code>) runs once per day. Each run covers a full day's <b>data interval</b> and fires at midnight <b>after</b> the day it represents.",
      why: "Airflow schedules on <i>completed</i> intervals: it waits until a period is over before running, so the data for that period is actually complete when the job starts.",
      how: "The run's <code>logical_date</code> is the start of the interval; it fires at the interval's end. So the Jan 1 run executes just after midnight on Jan 2.",
      when: "Daily batch ETL — the most common schedule in practice.",
      mistake: "Expecting the Jan 1 run to fire at the start of Jan 1. It fires at the <i>end</i> — the interval-end trigger trips up nearly every Airflow beginner.",
      interview: "“Why does a @daily run appear a day ‘late’?” Airflow runs at the end of the data interval, so a full day's data is ready. It's by design, not lag.",
      example: "ShopKart's daily sales roll-up for Jan 1 fires just after midnight on Jan 2, once every Jan 1 order has landed.",
      code: '@dag(schedule="@daily", start_date=datetime(2024,1,1), catchup=False)',
      span: [0, 3],
      ticks: [{ t: 0, label: "Jan 1" }, { t: 1, label: "Jan 2" }, { t: 2, label: "Jan 3" }, { t: 3, label: "Jan 4" }],
      items: [
        { id: "a", label: "Jan 1", t0: 0, t1: 1, state: "success" },
        { id: "b", label: "Jan 2", t0: 1, t1: 2, state: "success" },
        { id: "c", label: "Jan 3", t0: 2, t1: 3, state: "running" }
      ],
      markers: [{ id: "m0", t: 1, label: "run" }, { id: "m1", t: 2, label: "run" }, { id: "m2", t: 3, label: "run" }]
    },
    hourly: {
      label: "@hourly",
      cron: "0 * * * *",
      what: "<code>@hourly</code> (cron <code>0 * * * *</code>) runs once per hour, each run covering the hour just elapsed. Good for near-real-time pipelines.",
      why: "Hourly cadence trades freshness for volume: you get data updated every hour, at the cost of 24× the runs (and logs, and metadata rows) of a daily DAG.",
      how: "Each hour boundary triggers a run whose interval is the previous hour — the same interval-end semantics as @daily, just at hour granularity.",
      when: "Near-real-time needs — hourly rollups, frequent syncs — where daily is too stale.",
      mistake: "Running hourly “to be safe” when the data only changes daily — you 24× the run volume and metadata bloat for no benefit.",
      interview: "“What's the cost of an hourly schedule vs daily?” 24× the DAG runs, task instances, and logs — mind metadata-DB growth and scheduler load before choosing it.",
      example: "ShopKart runs its clickstream aggregation <code>@hourly</code> so dashboards refresh through the day, accepting the extra run volume.",
      code: '@dag(schedule="@hourly", start_date=datetime(2024,1,1), catchup=False)',
      span: [0, 6],
      ticks: [0, 1, 2, 3, 4, 5, 6].map(function (h) { return { t: h, label: (h < 10 ? "0" + h : h) + ":00" }; }),
      items: [0, 1, 2, 3, 4].map(function (h) {
        return { id: "h" + h, label: h + "→" + (h + 1), t0: h, t1: h + 1, state: "success" };
      }).concat([{ id: "h5", label: "5→6", t0: 5, t1: 6, state: "running" }]),
      markers: [1, 2, 3, 4, 5, 6].map(function (h) { return { id: "mh" + h, t: h, label: "" }; })
    },
    cron: {
      label: "cron · every 6h",
      cron: "0 */6 * * *",
      what: "A raw <b>cron</b> expression gives full control over timing. <code>0 */6 * * *</code> fires at 00:00, 06:00, 12:00, and 18:00 — every six hours.",
      why: "Presets cover the common cases; cron covers everything else — specific hours, weekdays only, several times a day — without writing custom code.",
      how: "Pass a 5-field cron string to <code>schedule</code>. Airflow computes intervals from it and applies the same interval-end firing rule as the presets.",
      when: "Any cadence the <code>@</code> presets can't express — “weekdays at 9am”, “every 6 hours”.",
      mistake: "Reaching for cron when you need <i>calendar</i> logic (skip holidays, last business day) — cron can't express those; a <b>Timetable</b> can.",
      interview: "“How do you schedule weekdays at 9am?” <code>schedule='0 9 * * 1-5'</code>. And know the limit: cron can't do “last business day” — that needs a custom Timetable.",
      example: "ShopKart refreshes inventory every six hours with <code>0 */6 * * *</code>, keeping stock counts current without a full hourly cadence.",
      code: '@dag(schedule="0 */6 * * *", start_date=datetime(2024,1,1), catchup=False)',
      span: [0, 24],
      ticks: [0, 6, 12, 18, 24].map(function (h) { return { t: h, label: (h < 10 ? "0" + h : h) + ":00" }; }),
      items: [
        { id: "c0", label: "00–06", t0: 0, t1: 6, state: "success" },
        { id: "c1", label: "06–12", t0: 6, t1: 12, state: "success" },
        { id: "c2", label: "12–18", t0: 12, t1: 18, state: "success" },
        { id: "c3", label: "18–24", t0: 18, t1: 24, state: "running" }
      ],
      markers: [6, 12, 18, 24].map(function (h) { return { id: "mc" + h, t: h, label: "run" }; })
    }
  };

  var PRESETS = [
    ["@once", "Run exactly one time, then never again."],
    ["@hourly / @daily / @weekly", "Convenience aliases for common crons."],
    ["cron string", "e.g. 0 9 * * 1-5 — 9am on weekdays."],
    ["timedelta(...)", "Relative interval, e.g. every 6 hours from start_date."],
    ["Timetable", "A Python class for logic cron can't express (business days, etc.)."],
    ["None", "Never scheduled — triggered manually or by a dataset/asset."]
  ];

  var module = {
    id: "scheduling",
    title: "Scheduling & Timetables",
    fullWidth: true,
    _tl: null,
    _current: "daily",

    render: function (container) {
      var self = this;
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Scheduling</div>' +
          '<h1 class="module-title">Schedules &amp; timetables</h1>' +
          '<p class="module-subtitle">A DAG\'s <code>schedule</code> decides when runs are created. Presets, cron, and ' +
          "timedeltas cover most needs; a custom <b>Timetable</b> handles the rest. Toggle to see the runs each produces.</p>" +
        "</div>" +
        '<div class="exec-toggle" id="sch-toggle" role="tablist"></div>' +
        '<div class="arch-layout" style="margin-top:var(--space-4)">' +
          '<div class="arch-canvas" id="sch-canvas"></div>' +
          '<aside class="arch-detail" id="sch-detail"></aside>' +
        "</div>" +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">Ways to schedule</h2>' +
          '<div class="table-wrap"><table class="cmp-table" id="sch-table"></table></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<b>Data-aware scheduling:</b> a DAG can be scheduled by <b>Assets</b> (called <b>Datasets</b> in 2.x) instead of " +
          "a clock — <code>schedule=[Asset(\"s3://bucket/table\")]</code> runs it whenever an upstream task updates that asset.</div></div>" +
          '<div class="callout tip"><span class="callout-icon">💡</span><div class="callout-body">' +
          "Prefer a <b>Timetable</b> over cron hacks when the logic is calendar-aware (skip holidays, last business day). " +
          "Cron can't express \"the last weekday of the month\"; a timetable can.</div></div>" +
        "</section>";

      var toggle = container.querySelector("#sch-toggle");
      toggle.innerHTML = Object.keys(SCHEDULES).map(function (k) {
        return '<button class="exec-tab" role="tab" data-sch="' + k + '">' + SCHEDULES[k].label + "</button>";
      }).join("");
      toggle.addEventListener("click", function (e) {
        var b = e.target.closest("[data-sch]");
        if (b) self.select(container, b.getAttribute("data-sch"));
      });

      var head = "<thead><tr><th>Option</th><th>What it does</th></tr></thead>";
      container.querySelector("#sch-table").innerHTML = head + "<tbody>" +
        PRESETS.map(function (r) { return "<tr><td class='cmp-dim'><code>" + r[0] + "</code></td><td>" + r[1] + "</td></tr>"; }).join("") +
        "</tbody>";

      this.select(container, "daily");
    },

    select: function (container, key) {
      this._current = key;
      var s = SCHEDULES[key];
      container.querySelectorAll(".exec-tab").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-sch") === key);
      });
      if (this._tl) { this._tl.destroy(); this._tl = null; }
      var canvas = container.querySelector("#sch-canvas");
      canvas.innerHTML = "";
      var tl = AV.Timeline.create({ items: s.items, markers: s.markers, ticks: s.ticks, span: s.span, viewBox: "0 0 960 200" });
      canvas.appendChild(tl.el);
      this._tl = tl;
      var detail = container.querySelector("#sch-detail");
      detail.innerHTML = AV.Explain.render({
        label: s.label,
        what: s.what, why: s.why, how: s.how,
        when: s.when, mistake: s.mistake, interview: s.interview, example: s.example
      });
      var cv = AV.CodeViewer.create({ title: "declare it", lang: "python", code: s.code });
      cv.style.marginTop = "var(--space-3)";
      detail.appendChild(cv);
    },

    destroy: function () {
      if (this._tl) { this._tl.destroy(); this._tl = null; }
    }
  };

  AV.registerModule(module);
})();
