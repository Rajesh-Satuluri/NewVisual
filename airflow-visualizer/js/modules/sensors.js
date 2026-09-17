/* ============================================================
   modules/sensors.js — sensors & deferrable operators
   Toggle poke / reschedule / deferrable; timeline shows how each
   uses (or frees) a worker slot while waiting.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var TICKS = [0, 3, 6, 9, 12].map(function (t) { return { t: t, label: t + "m" }; });

  var MODES = {
    poke: {
      label: "poke",
      what: "The default sensor mode. The sensor <b>holds a worker slot</b> for the entire wait and re-checks (“pokes”) its condition every <code>poke_interval</code> seconds.",
      why: "It's the simplest possible implementation — a plain loop that keeps checking — which makes it perfectly fine for short waits where holding a slot briefly costs nothing.",
      how: "The task occupies a worker slot and sleeps between pokes. Each poke calls the sensor's <code>poke()</code>; the slot stays claimed until it returns true or the sensor times out.",
      when: "Short waits — seconds to a couple of minutes — where a blocked slot is cheap.",
      mistake: "Using <code>poke</code> for long waits. A sensor idling for hours ties up a worker slot the whole time, and many at once can exhaust the pool.",
      interview: "“What's the downside of a poke-mode sensor?” It holds a worker slot for the entire wait — fine briefly, dangerous at scale or for long waits.",
      example: "ShopKart's sensor waiting ~30 s for a small file to land uses <code>poke</code> — the held slot is trivial at that duration.",
      items: [{ id: "held", label: "worker slot HELD", t0: 0, t1: 11, state: "running" }],
      markers: [{ id: "p1", t: 3, label: "poke" }, { id: "p2", t: 6, label: "poke" }, { id: "p3", t: 9, label: "poke" }, { id: "met", t: 11, label: "met ✔" }],
      code: 'S3KeySensor(task_id="wait", bucket_key="...", mode="poke")'
    },
    reschedule: {
      label: "reschedule",
      what: "Between checks the sensor <b>releases its slot</b> and is re-scheduled to run again at the next <code>poke_interval</code>. The slot is free during the gaps.",
      why: "For minute-scale waits, holding a slot the whole time is wasteful. Releasing it between checks frees capacity for real work while the sensor still waits.",
      how: "After each failed check the task exits and Airflow schedules the next attempt <code>poke_interval</code> later. Set <code>mode='reschedule'</code> and a sane interval.",
      when: "Minute-scale waits — a partition that lands every few minutes, a job that finishes in ~10–30 min.",
      mistake: "Setting a tiny <code>poke_interval</code> in reschedule mode, so the task re-queues constantly and adds scheduler churn instead of saving resources.",
      interview: "“How do you wait 20 minutes without hogging a worker slot?” <code>mode='reschedule'</code> — the slot is released between checks, at the cost of re-queue overhead each interval.",
      example: "ShopKart's sensor waiting for a vendor's hourly drop uses <code>reschedule</code> with a 5-minute interval, freeing the slot 55 minutes an hour.",
      items: [
        { id: "c0", label: "", t0: 0, t1: 0.6, state: "running" },
        { id: "c1", label: "", t0: 3, t1: 3.6, state: "running" },
        { id: "c2", label: "", t0: 6, t1: 6.6, state: "running" },
        { id: "c3", label: "", t0: 9, t1: 9.6, state: "running" },
        { id: "c4", label: "", t0: 11, t1: 11.6, state: "success" }
      ],
      markers: [{ id: "met", t: 11, label: "met ✔" }],
      code: 'S3KeySensor(task_id="wait", bucket_key="...", mode="reschedule", poke_interval=180)'
    },
    deferrable: {
      label: "deferrable",
      what: "The slot is <b>freed entirely</b>. The wait is handed to the async <b>Triggerer</b>, which watches thousands of conditions on one event loop and resumes the task when its trigger fires.",
      why: "At scale even re-queueing costs add up. A deferrable operator uses <i>no</i> worker slot while waiting — the Triggerer monitors everything asynchronously at near-zero per-wait cost.",
      how: "Set <code>deferrable=True</code>. The task defers and releases its slot; a <code>Trigger</code> runs on the Triggerer's asyncio loop and, when the condition holds, the scheduler resumes the task on a worker.",
      when: "Long or numerous waits — hours-long conditions, or thousands of concurrent sensors.",
      mistake: "Enabling <code>deferrable=True</code> without running a <b>Triggerer</b> process. With no triggerer, deferred tasks simply never resume.",
      interview: "“How do you wait on 10,000 conditions cheaply?” Deferrable operators + the Triggerer — one asyncio process handles them all, freeing every worker slot. Name the required triggerer.",
      example: "ShopKart's thousands of cross-DAG sensors go <code>deferrable=True</code>, so a single triggerer handles them and no worker slots sit tied up waiting.",
      items: [{ id: "defer", label: "defer", t0: 0, t1: 0.8, state: "deferred" }],
      markers: [{ id: "t1", t: 3, label: "async" }, { id: "t2", t: 6, label: "async" }, { id: "t3", t: 9, label: "async" }, { id: "met", t: 11, label: "resume ✔" }],
      code: 'S3KeySensor(task_id="wait", bucket_key="...", deferrable=True)'
    }
  };

  var TABLE = [
    ["Worker slot while waiting", "Held the whole time", "Freed between checks", "Freed entirely"],
    ["Mechanism", "Re-poke each interval", "Re-scheduled each interval", "Async trigger on triggerer"],
    ["Overhead", "A slot blocked", "Re-queue each check", "One triggerer, many waits"],
    ["Best for", "Short waits", "Minute-scale waits", "Long waits (hours)"]
  ];

  var module = {
    id: "sensors",
    title: "Sensors & Deferrable",
    fullWidth: true,
    _tl: null,
    _current: "poke",

    render: function (container) {
      var self = this;
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Execution</div>' +
          '<h1 class="module-title">Sensors &amp; deferrable operators</h1>' +
          '<p class="module-subtitle">A <b>sensor</b> waits for something to become true — a file, a partition, a time. ' +
          "How it waits decides whether it wastes a worker slot. Toggle the three strategies.</p>" +
        "</div>" +
        '<div class="exec-toggle" id="sn-toggle" role="tablist"></div>' +
        '<div class="arch-layout" style="margin-top:var(--space-4)">' +
          '<div class="arch-canvas" id="sn-canvas"></div>' +
          '<aside class="arch-detail" id="sn-detail"></aside>' +
        "</div>" +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">poke vs reschedule vs deferrable</h2>' +
          '<div class="table-wrap"><table class="cmp-table" id="sn-table"></table></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout danger"><span class="callout-icon">🕳️</span><div class="callout-body">' +
          "<b>Sensor deadlock:</b> many <code>poke</code> sensors waiting at once can consume every worker slot, so nothing " +
          "downstream can run to satisfy them. <code>reschedule</code> or <code>deferrable</code> avoids this.</div></div>" +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "Deferrable operators need a running <b>Triggerer</b> process. One triggerer handles thousands of concurrent " +
          "waits on a single asyncio event loop — near-zero cost per wait.</div></div>" +
        "</section>";

      var toggle = container.querySelector("#sn-toggle");
      toggle.innerHTML = Object.keys(MODES).map(function (k) {
        return '<button class="exec-tab" role="tab" data-mode="' + k + '">' + MODES[k].label + "</button>";
      }).join("");
      toggle.addEventListener("click", function (e) {
        var b = e.target.closest("[data-mode]");
        if (b) self.select(container, b.getAttribute("data-mode"));
      });

      var head = "<thead><tr><th>Dimension</th><th>poke</th><th>reschedule</th><th>deferrable</th></tr></thead>";
      container.querySelector("#sn-table").innerHTML = head + "<tbody>" +
        TABLE.map(function (r) { return "<tr><td class='cmp-dim'>" + r[0] + "</td><td>" + r[1] + "</td><td>" + r[2] + "</td><td>" + r[3] + "</td></tr>"; }).join("") +
        "</tbody>";

      this.select(container, "poke");
    },

    select: function (container, key) {
      this._current = key;
      var m = MODES[key];
      container.querySelectorAll(".exec-tab").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-mode") === key);
      });
      if (this._tl) { this._tl.destroy(); this._tl = null; }
      var canvas = container.querySelector("#sn-canvas");
      canvas.innerHTML = "";
      var tl = AV.Timeline.create({ items: m.items, markers: m.markers, ticks: TICKS, span: [0, 12], viewBox: "0 0 960 200" });
      canvas.appendChild(tl.el);
      this._tl = tl;
      var detail = container.querySelector("#sn-detail");
      detail.innerHTML = AV.Explain.render({
        label: "mode = " + m.label,
        what: m.what, why: m.why, how: m.how,
        when: m.when, mistake: m.mistake, interview: m.interview, example: m.example
      });
      var cv = AV.CodeViewer.create({ title: "declare it", lang: "python", code: m.code });
      cv.style.marginTop = "var(--space-3)";
      detail.appendChild(cv);
    },

    destroy: function () {
      if (this._tl) { this._tl.destroy(); this._tl = null; }
    }
  };

  AV.registerModule(module);
})();
