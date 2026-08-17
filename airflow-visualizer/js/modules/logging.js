/* ============================================================
   modules/logging.js — task logging pipeline
   Arch diagram: Worker → local file → remote storage → UI.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var NODES = [
    { id: "worker",  label: "Worker / Task",    sub: "Python logging + stdout",  x: 40,  y: 30,  w: 185, h: 60, color: "airflow" },
    { id: "local",   label: "Local Log File",   sub: "worker filesystem",        x: 40,  y: 170, w: 185, h: 60, color: "yellow"  },
    { id: "remote",  label: "Remote Storage",   sub: "S3 / GCS / Azure Blob",   x: 465, y: 170, w: 185, h: 60, color: "purple"  },
    { id: "api",     label: "API Server",       sub: "fetches & serves logs",   x: 200, y: 310, w: 185, h: 60, color: "cyan"    },
    { id: "ui",      label: "Web UI / CLI",     sub: "live tail during run",    x: 465, y: 310, w: 185, h: 60, color: "green"   }
  ];

  var EDGES = [
    ["worker", "local"], ["local", "remote"], ["remote", "api"], ["api", "ui"]
  ];

  var STEPS = [
    {
      nodes: ["worker"], edges: [],
      label: "1 · Task captures logs",
      desc: "When a task runs, all Python <code>logging</code> output, STDOUT, and STDERR are captured by Airflow's <code>FileTaskHandler</code>. Each log line is timestamped and includes the task's <code>dag_id</code>, <code>task_id</code>, <code>run_id</code>, and <code>try_number</code>."
    },
    {
      nodes: ["worker", "local"], edges: [["worker", "local"]],
      label: "2 · Written to local file",
      desc: "Logs are written to a file at <code>BASE_LOG_FOLDER/dag_id/task_id/run_id/try_number.log</code> on the worker's filesystem. During an active run, the UI tails this file via the worker's log-serve endpoint."
    },
    {
      nodes: ["local", "remote"], edges: [["local", "remote"]],
      label: "3 · Remote handler uploads to S3/GCS",
      desc: "If remote logging is configured, the handler uploads the completed log file to remote storage after the task finishes. The path mirrors the local structure. This is the recommended production pattern — logs survive worker restarts and container termination."
    },
    {
      nodes: ["remote", "api", "ui"], edges: [["remote", "api"], ["api", "ui"]],
      label: "4 · UI reads from remote",
      desc: "Once the task is done, the API Server fetches the log from remote storage and returns it to the UI or CLI. If remote storage is not configured, the API falls back to the worker's log endpoint or the local file (if the worker is still alive)."
    },
    {
      nodes: ["worker", "local", "remote", "api", "ui"], edges: EDGES,
      label: "5 · Per-try_number files",
      desc: "Each retry creates its own log file (<code>1.log</code>, <code>2.log</code>, <code>3.log</code>). The UI shows a dropdown to switch between attempts. This means you can always inspect exactly what happened on each try — even for tasks with many retries."
    },
    {
      nodes: ["worker", "local", "remote", "api", "ui"], edges: EDGES,
      label: "6 · Airflow 3: structured JSON logs",
      desc: "Airflow 3 emits structured JSON log lines by default, with <code>dag_id</code>, <code>task_id</code>, <code>run_id</code>, <code>try_number</code>, and <code>level</code> as top-level fields. This makes logs easily queryable in Elasticsearch, CloudWatch Logs Insights, and Grafana Loki — no regex parsing needed."
    }
  ];

  var CODE_CONFIG =
    "# airflow.cfg or environment variables\n" +
    "[logging]\n" +
    "base_log_folder    = /opt/airflow/logs\n" +
    "remote_logging     = True\n" +
    "remote_log_conn_id = aws_s3\n" +
    "remote_base_log_folder = s3://shopkart-logs/airflow/\n" +
    "\n" +
    "# Log filename template (default):\n" +
    "# {{ ti.dag_id }}/{{ ti.task_id }}/{{ ts }}/{{ try_number }}.log";

  var CODE_TASK =
    "import logging\n" +
    "log = logging.getLogger(__name__)\n" +
    "\n" +
    "def extract_orders(**context):\n" +
    "    log.info('Starting extract for %s', context['ds'])\n" +
    "    rows = query_warehouse(context['ds'])\n" +
    "    log.info('Fetched %d rows', len(rows))\n" +
    "    if len(rows) == 0:\n" +
    "        log.warning('Zero rows returned — upstream data may be missing')\n" +
    "    return rows\n" +
    "\n" +
    "# CLI: stream live logs\n" +
    "# airflow tasks logs daily_sales_etl extract_orders 2024-01-15 --try-number 1";

  var HANDLERS = [
    ["FileTaskHandler",         "Default. Writes to BASE_LOG_FOLDER on the worker FS."],
    ["S3TaskHandler",           "airflow.providers.amazon.aws.log.s3_task_handler"],
    ["GCSTaskHandler",          "airflow.providers.google.cloud.log.gcs_task_handler"],
    ["AzureBlobStorageTaskHandler","airflow.providers.microsoft.azure.log.wasb_task_handler"],
    ["ElasticsearchTaskHandler","airflow.providers.elasticsearch.log.es_task_handler"],
    ["OpenSearchTaskHandler",   "airflow.providers.opensearch.log.os_task_handler"]
  ];

  var module = {
    id: "logging",
    title: "Logging",
    fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Operations</div>' +
          '<h1 class="module-title">Logging: from worker to your log platform</h1>' +
          '<p class="module-subtitle">Airflow captures every task\'s STDOUT, STDERR, and Python <code>logging</code> output and routes it through a ' +
          "pluggable handler. In production, logs flow from the worker to remote storage so they survive container restarts.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="lg-canvas"></div>' +
          '<aside class="arch-detail" id="lg-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="lg-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<div class="two-col-code" id="lg-codes"></div>' +
        "</section>" +
        '<section class="section">' +
          '<h2 class="section-title">Available log handlers</h2>' +
          '<div class="table-wrap"><table class="cmp-table" id="lg-table"></table></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout warn"><span class="callout-icon">📁</span><div class="callout-body">' +
          "<b>Local logs don't survive container restarts.</b> On Kubernetes, worker pods are ephemeral — if the pod dies mid-task, the log file disappears. Always configure remote logging for Kubernetes Executor deployments.</div></div>" +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<b>Structured logging:</b> Airflow 3 sets <code>AIRFLOW__LOGGING__LOGGING_CONFIG_CLASS</code> to emit JSON by default. Every line includes <code>dag_id</code>, <code>task_id</code>, <code>run_id</code>, and <code>try_number</code> as queryable fields.</div></div>" +
        "</section>";

      var diagram = AV.ArchDiagram.create({
        nodes: NODES, edges: EDGES, viewBox: "0 0 700 410", onSelect: function () {}
      });
      container.querySelector("#lg-canvas").appendChild(diagram.el);
      this._diagram = diagram;

      var detail = container.querySelector("#lg-detail");
      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">Log pipeline</div>' +
          "<p>Press play to trace a task log from the worker filesystem to your UI — and see how remote storage makes logs durable.</p>" +
          '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">📋</span>' +
          '<div class="callout-body">Use <code>log = logging.getLogger(__name__)</code> in your callables — not <code>print()</code>. The logging system attaches metadata and respects log level filters.</div></div>';
      }
      function showStep(idx) {
        if (idx < 0) { defaultDetail(); return; }
        var s = STEPS[idx];
        detail.innerHTML = '<div class="arch-detail-title">' + s.label + "</div><p>" + s.desc + "</p>";
      }

      var codes = container.querySelector("#lg-codes");
      var cfgDiv = document.createElement("div");
      cfgDiv.className = "two-col-code-item";
      cfgDiv.appendChild(AV.CodeViewer.create({ title: "airflow.cfg — remote logging", lang: "bash", code: CODE_CONFIG }));
      var taskDiv = document.createElement("div");
      taskDiv.className = "two-col-code-item";
      taskDiv.appendChild(AV.CodeViewer.create({ title: "task callable — logging usage", lang: "python", code: CODE_TASK }));
      codes.appendChild(cfgDiv);
      codes.appendChild(taskDiv);

      var thead = "<thead><tr><th>Handler</th><th>Provider module</th></tr></thead>";
      container.querySelector("#lg-table").innerHTML = thead + "<tbody>" +
        HANDLERS.map(function (r) {
          return "<tr><td class='cmp-dim'><code>" + r[0] + "</code></td><td><code style='font-size:.78rem'>" + r[1] + "</code></td></tr>";
        }).join("") + "</tbody>";

      var engine = new AV.AnimationEngine({
        steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1
      });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) {
        if (idx < 0) { diagram.clear(); showStep(-1); return; }
        diagram.setActive(STEPS[idx].nodes, STEPS[idx].edges);
        showStep(idx);
      });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#lg-controls").appendChild(controls.el);
      this._controls = controls;
      defaultDetail();
    },

    destroy: function () {
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      if (this._diagram) { this._diagram.destroy(); this._diagram = null; }
    }
  };

  AV.registerModule(module);
})();
