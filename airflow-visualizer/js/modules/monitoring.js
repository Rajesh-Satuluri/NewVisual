/* ============================================================
   modules/monitoring.js — monitoring, metrics, and health checks
   Animated metric-category grid + config + alert reference.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var CATEGORIES = [
    {
      id: "health",
      icon: "🏥",
      title: "Health Endpoints",
      metrics: [
        { name: "/health",   desc: "JSON: scheduler / triggerer / dag-processor heartbeat state" },
        { name: "/metrics",  desc: "Prometheus-format counters and gauges (if StatsD + exporter configured)" }
      ]
    },
    {
      id: "scheduler",
      icon: "📅",
      title: "Scheduler",
      metrics: [
        { name: "airflow.scheduler.heartbeat",         desc: "Seconds since last heartbeat (alert if > 30)" },
        { name: "airflow.dag_processing.last_duration",desc: "Most recent DAG parse time in seconds" },
        { name: "airflow.scheduler.tasks.starving",    desc: "Tasks waiting for a pool/executor slot" }
      ]
    },
    {
      id: "tasks",
      icon: "⚙️",
      title: "Tasks & DAG Runs",
      metrics: [
        { name: "airflow.task.duration",              desc: "Execution wall-clock time per task (tag: dag_id, task_id)" },
        { name: "airflow.task.success",               desc: "Counter: successful task instances" },
        { name: "airflow.task.failed",                desc: "Counter: failed task instances (alert on non-zero spike)" },
        { name: "airflow.dagrun.duration.success",    desc: "End-to-end DAG run wall-clock time" }
      ]
    },
    {
      id: "pools",
      icon: "🎚️",
      title: "Pools & Executor",
      metrics: [
        { name: "airflow.pool.open_slots",            desc: "Free slots per pool (low = throttled)" },
        { name: "airflow.pool.running_slots",         desc: "Currently occupied pool slots" },
        { name: "airflow.executor.open_slots",        desc: "Executor headroom — zero means all workers busy" },
        { name: "airflow.executor.queued_tasks",      desc: "Tasks waiting for an executor slot" }
      ]
    }
  ];

  var STEPS = [
    {
      active: null,
      label: "1 · How Airflow emits metrics",
      desc: "Airflow emits metrics via <b>StatsD</b> (UDP datagrams) or <b>OpenTelemetry</b> (2.7+). A StatsD → Prometheus exporter converts them to a scrape target for Grafana. Key tags (<code>dag_id</code>, <code>task_id</code>) are added automatically."
    },
    {
      active: "health",
      label: "2 · Health endpoints",
      desc: "The <code>/health</code> endpoint returns a JSON summary of component health: scheduler last-heartbeat age, triggerer status, and DB connectivity. Kubernetes liveness probes should check this. <code>/metrics</code> exposes Prometheus-format counters."
    },
    {
      active: "scheduler",
      label: "3 · Scheduler metrics",
      desc: "<b>scheduler.heartbeat</b> is the most critical metric — if it goes stale, no new tasks will start. <b>dag_processing.last_duration</b> tells you how long the parse loop takes; spikes here mean a DAG is expensive to import."
    },
    {
      active: "tasks",
      label: "4 · Task & DAG run metrics",
      desc: "<b>task.duration</b> (with <code>dag_id</code>/<code>task_id</code> tags) powers p95 latency alerts. <b>task.failed</b> should alert immediately at any non-zero value in a prod pipeline. <b>dagrun.duration.success</b> tracks overall pipeline SLA."
    },
    {
      active: "pools",
      label: "5 · Pool & executor metrics",
      desc: "<b>pool.open_slots → 0</b> means your pool is saturated and tasks are queuing. <b>executor.open_slots → 0</b> means all your workers are busy. Both are leading indicators — alerts here let you scale before tasks start failing."
    },
    {
      active: null,
      label: "6 · StatsD → OpenTelemetry",
      desc: "Configure StatsD in <code>airflow.cfg [metrics]</code>: point <code>statsd_host</code> at a StatsD server or sidecar. From Airflow 2.7+, set <code>otel_on=True</code> to emit directly in OTLP format for Grafana Alloy, Datadog, or Honeycomb — no exporter needed."
    }
  ];

  var CODE_STATSD =
    "# airflow.cfg\n" +
    "[metrics]\n" +
    "statsd_on     = True\n" +
    "statsd_host   = statsd.shopkart.internal\n" +
    "statsd_port   = 8125\n" +
    "statsd_prefix = airflow\n" +
    "\n" +
    "# OpenTelemetry (Airflow 2.7+)\n" +
    "[metrics]\n" +
    "otel_on         = True\n" +
    "otel_host       = otel-collector.shopkart.internal\n" +
    "otel_port       = 4318\n" +
    "otel_ssl_active = False";

  var CODE_ALERTS =
    "# Prometheus alerting rules (example)\n" +
    "groups:\n" +
    "  - name: airflow\n" +
    "    rules:\n" +
    "      - alert: SchedulerHeartbeatStale\n" +
    "        expr: time() - airflow_scheduler_heartbeat > 30\n" +
    "        for: 1m\n" +
    "        severity: critical\n" +
    "\n" +
    "      - alert: TaskFailureSpike\n" +
    "        expr: increase(airflow_task_failed[5m]) > 3\n" +
    "        severity: warning\n" +
    "\n" +
    "      - alert: PoolStarved\n" +
    "        expr: airflow_pool_open_slots{pool='db_pool'} == 0\n" +
    "        for: 5m\n" +
    "        severity: warning";

  var module = {
    id: "monitoring",
    title: "Monitoring & Metrics",
    fullWidth: true,
    _engine: null, _controls: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Operations</div>' +
          '<h1 class="module-title">Monitoring & Metrics: knowing your pipeline\'s health</h1>' +
          '<p class="module-subtitle">Airflow emits hundreds of metrics via StatsD or OpenTelemetry. A handful of them — scheduler heartbeat, ' +
          "task failure rate, pool saturation — are the ones that actually save you from pager fatigue.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="mn-canvas"><div class="metrics-grid" id="mn-grid"></div></div>' +
          '<aside class="arch-detail" id="mn-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="mn-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<div class="two-col-code" id="mn-codes"></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout tip"><span class="callout-icon">📊</span><div class="callout-body">' +
          "<b>Start with three alerts:</b> (1) scheduler heartbeat stale > 30 s, (2) task failure count spike, (3) pool open_slots → 0 for 5+ minutes. These three cover the majority of actionable production failures.</div></div>" +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<b>Asset-based metrics:</b> Airflow 3 adds metrics around Dataset/Asset events — how many assets were materialized, how many triggers fired, and asset freshness lag — giving data-quality visibility alongside task health.</div></div>" +
        "</section>";

      var grid = container.querySelector("#mn-grid");
      var detail = container.querySelector("#mn-detail");

      function buildGrid(activeId) {
        grid.innerHTML = CATEGORIES.map(function (cat) {
          var isActive = cat.id === activeId;
          return '<div class="metric-card' + (isActive ? " metric-card-active" : "") + '">' +
            '<div class="metric-card-head">' +
              '<span class="metric-icon">' + cat.icon + "</span>" +
              '<span class="metric-card-title">' + cat.title + "</span>" +
            "</div>" +
            cat.metrics.map(function (m) {
              return '<div class="metric-entry">' +
                '<div class="metric-name">' + m.name + "</div>" +
                '<div class="metric-desc">' + m.desc + "</div>" +
              "</div>";
            }).join("") +
          "</div>";
        }).join("");
      }

      function showStep(idx) {
        if (idx < 0) {
          buildGrid(null);
          detail.innerHTML =
            '<div class="arch-detail-title">Four metric families</div>' +
            "<p>Press play to walk through the key metric categories — and which ones to alert on first.</p>" +
            '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">📡</span>' +
            '<div class="callout-body">The Airflow community maintains a <b>Grafana dashboard template</b> (dashboard ID 11461) that covers all standard StatsD metrics out of the box.</div></div>';
          return;
        }
        var s = STEPS[idx];
        buildGrid(s.active);
        detail.innerHTML = '<div class="arch-detail-title">' + s.label + "</div><p>" + s.desc + "</p>";
      }

      var codes = container.querySelector("#mn-codes");
      var cfgDiv = document.createElement("div");
      cfgDiv.className = "two-col-code-item";
      cfgDiv.appendChild(AV.CodeViewer.create({ title: "metrics config — StatsD & OTel", lang: "bash", code: CODE_STATSD }));
      var alertDiv = document.createElement("div");
      alertDiv.className = "two-col-code-item";
      alertDiv.appendChild(AV.CodeViewer.create({ title: "Prometheus alert rules", lang: "bash", code: CODE_ALERTS }));
      codes.appendChild(cfgDiv);
      codes.appendChild(alertDiv);

      var engine = new AV.AnimationEngine({
        steps: STEPS.map(function (s) { return { label: s.label, duration: 2800 }; }), speed: 1
      });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) { showStep(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#mn-controls").appendChild(controls.el);
      this._controls = controls;
      showStep(-1);
    },

    destroy: function () {
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
    }
  };

  AV.registerModule(module);
})();
