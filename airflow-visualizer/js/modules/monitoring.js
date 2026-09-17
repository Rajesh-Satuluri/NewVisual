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
      what: "Airflow emits metrics via <b>StatsD</b> (UDP datagrams) or <b>OpenTelemetry</b> (2.7+). A StatsD → Prometheus exporter converts them into a scrape target for Grafana.",
      why: "You can't operate what you can't see. A metrics pipeline turns Airflow's internal counters and timers into dashboards and alerts you can actually act on.",
      how: "Airflow pushes metrics to a StatsD server (or emits OTLP directly); an exporter or collector forwards them to Prometheus/your APM. Key tags like <code>dag_id</code>/<code>task_id</code> are added automatically.",
      when: "In any deployment you intend to run seriously — set it up before you need it.",
      mistake: "Running production Airflow with no metrics pipeline, so the first sign of trouble is a user complaint instead of an alert.",
      interview: "“How does Airflow expose metrics?” StatsD or OpenTelemetry, typically into Prometheus/Grafana. Naming both transports (and that OTel is 2.7+) shows current knowledge.",
      example: "ShopKart pipes Airflow StatsD metrics through an exporter into Prometheus, then visualizes them in a shared Grafana dashboard."
    },
    {
      active: "health",
      label: "2 · Health endpoints",
      what: "The <code>/health</code> endpoint returns a JSON summary of component health — scheduler last-heartbeat age, triggerer status, DB connectivity. <code>/metrics</code> exposes Prometheus-format counters.",
      why: "Health endpoints give orchestrators (Kubernetes) and load balancers a simple, standard signal to decide whether an instance is alive and should receive traffic.",
      how: "Point Kubernetes liveness/readiness probes at <code>/health</code>; scrape <code>/metrics</code> with Prometheus. An unhealthy component (stale scheduler heartbeat) shows up immediately in the JSON.",
      when: "Wired into every deployment's probes and scrape config from day one.",
      mistake: "Not probing <code>/health</code>, so a wedged scheduler keeps “running” to Kubernetes while no tasks actually start.",
      interview: "“What should a K8s liveness probe check for the scheduler?” The <code>/health</code> endpoint's heartbeat status. A concrete, practical detail interviewers appreciate.",
      example: "ShopKart's scheduler pod has a liveness probe on <code>/health</code>; when a heartbeat goes stale, Kubernetes restarts the pod automatically."
    },
    {
      active: "scheduler",
      label: "3 · Scheduler metrics",
      what: "<b>scheduler.heartbeat</b> is the most critical metric — if it goes stale, no new tasks start. <b>dag_processing.last_duration</b> tracks how long the parse loop takes.",
      why: "The scheduler is the heart; a stale heartbeat means scheduling has stopped for the entire cluster. Parse duration is your early warning that a DAG has become expensive to import.",
      how: "Alert if <code>time() - scheduler.heartbeat &gt; 30s</code>; watch <code>dag_processing.last_duration</code> for spikes that point to a heavy DAG. Both are leading indicators of cluster-wide slowdowns.",
      when: "Continuously — these are the first two metrics to put on a dashboard and alert.",
      mistake: "Alerting on task failures but not on scheduler heartbeat — you'd miss the worst outage (nothing scheduling at all) because no task is even failing.",
      interview: "“What's the single most important Airflow metric?” Scheduler heartbeat — stale means nothing runs. Leading with that shows you know what actually pages you at 3&nbsp;AM.",
      example: "ShopKart pages on a scheduler heartbeat older than 30&nbsp;s; a spike in <code>dag_processing.last_duration</code> once caught a DAG doing a slow import."
    },
    {
      active: "tasks",
      label: "4 · Task & DAG run metrics",
      what: "<b>task.duration</b> (tagged by <code>dag_id</code>/<code>task_id</code>) powers p95 latency alerts. <b>task.failed</b> should alert immediately on any non-zero value in prod. <b>dagrun.duration.success</b> tracks the overall pipeline SLA.",
      why: "These connect infrastructure health to business outcomes — is the pipeline finishing on time, and are tasks failing? They're what stakeholders actually care about.",
      how: "Build p95 latency panels from <code>task.duration</code>, alert on increases in <code>task.failed</code>, and track end-to-end runtime with <code>dagrun.duration.success</code> against your SLA.",
      when: "On every business-critical pipeline.",
      mistake: "Alerting on averages instead of p95/p99, so a few very slow tasks hide behind a healthy-looking mean.",
      interview: "“How would you alert on pipeline latency?” p95 of <code>task.duration</code> and <code>dagrun.duration.success</code> against the SLA. Choosing percentiles over averages is the senior instinct.",
      example: "ShopKart alerts the moment <code>task.failed</code> goes non-zero on <code>reconcile_payments</code>, and dashboards p95 duration to catch creeping slowdowns."
    },
    {
      active: "pools",
      label: "5 · Pool & executor metrics",
      what: "<b>pool.open_slots → 0</b> means your pool is saturated and tasks are queuing. <b>executor.open_slots → 0</b> means all workers are busy. Both are leading indicators.",
      why: "These tell you you're out of capacity <i>before</i> tasks start failing or missing SLAs — they let you scale proactively instead of reactively.",
      how: "Alert when <code>pool.open_slots</code> for a critical pool stays at 0 for several minutes, and when <code>executor.open_slots</code> hits 0. Both point at where to add capacity.",
      when: "On clusters where capacity is a real constraint (backfills, peak load).",
      mistake: "Waiting for tasks to miss SLAs instead of watching slot metrics — by the time tasks fail, you're already behind.",
      interview: "“How do you know you need more workers before things break?” <code>executor.open_slots</code>/<code>pool.open_slots</code> trending to 0 — capacity alerts that lead failures. That's proactive ops.",
      example: "ShopKart alerts when the <code>db_pool</code> sits at 0 open slots for 5&nbsp;minutes, catching saturation before the nightly run slips."
    },
    {
      active: null,
      label: "6 · StatsD → OpenTelemetry",
      what: "Configure StatsD in <code>airflow.cfg [metrics]</code> (point <code>statsd_host</code> at a server or sidecar). From 2.7+, set <code>otel_on=True</code> to emit OTLP directly for Grafana Alloy, Datadog, or Honeycomb — no exporter needed.",
      why: "OpenTelemetry is the emerging standard; emitting OTLP natively removes the StatsD-exporter hop and plugs Airflow straight into modern observability stacks.",
      how: "Keep StatsD for classic Prometheus setups, or switch to <code>otel_on=True</code> with an OTLP endpoint to send metrics directly to a collector/APM. Both live under <code>[metrics]</code>.",
      when: "StatsD for existing Prometheus pipelines; OTel when standardizing on an OpenTelemetry collector.",
      mistake: "Enabling both transports at once without intent, doubling metric volume and muddying which pipeline is authoritative.",
      interview: "“StatsD or OpenTelemetry for Airflow metrics?” StatsD is the classic path; OTel (2.7+) is native and exporter-free. Knowing the trajectory toward OTel is a nice forward-looking note.",
      example: "ShopKart is migrating from StatsD-to-Prometheus toward <code>otel_on=True</code> so its Airflow metrics flow straight into the same OTel collector as its services."
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
        detail.innerHTML = AV.Explain.render(s);
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
