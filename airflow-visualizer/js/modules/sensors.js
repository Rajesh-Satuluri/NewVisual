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
      body: "The default. The sensor <b>holds a worker slot</b> the entire time and re-checks (\"pokes\") every <code>poke_interval</code>. Simple, but a slot is blocked for the whole wait.",
      items: [{ id: "held", label: "worker slot HELD", t0: 0, t1: 11, state: "running" }],
      markers: [{ id: "p1", t: 3, label: "poke" }, { id: "p2", t: 6, label: "poke" }, { id: "p3", t: 9, label: "poke" }, { id: "met", t: 11, label: "met ✔" }],
      code: 'S3KeySensor(task_id="wait", bucket_key="...", mode="poke")'
    },
    reschedule: {
      label: "reschedule",
      body: "Between checks the task <b>releases its slot</b> and is re-scheduled for the next check. Far kinder to your worker pool for minute-scale waits.",
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
      body: "The slot is <b>freed entirely</b>. The wait is handed to the async <b>Triggerer</b>, which watches thousands of conditions in one process and resumes the task when it fires.",
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
      detail.innerHTML =
        '<div class="arch-detail-title">mode = ' + m.label + "</div><p>" + m.body + "</p>";
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
