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
      what: "When a task runs, all Python <code>logging</code> output, STDOUT, and STDERR are captured by Airflow's <code>FileTaskHandler</code>. Each line is timestamped and tagged with <code>dag_id</code>, <code>task_id</code>, <code>run_id</code>, and <code>try_number</code>.",
      why: "Automatic capture with identity metadata means every log line is traceable to exactly which task, run, and attempt produced it — essential for debugging at scale.",
      how: "Airflow installs a logging handler around task execution that intercepts stdout/stderr and the Python logging framework, attaching context before writing.",
      when: "For the full duration of every task attempt.",
      mistake: "Using <code>print()</code> and expecting rich metadata — it's captured, but you lose the levels and structured fields the <code>logging</code> module gives you.",
      interview: "“How does Airflow know which task a log line belongs to?” The handler tags each line with dag/task/run/try context automatically — simple, but it shows you know the mechanism.",
      example: "ShopKart's <code>extract_orders</code> logs are stamped with its <code>run_id</code> and <code>try_number</code>, so attempt 2's lines never mix with attempt 1's."
    },
    {
      nodes: ["worker", "local"], edges: [["worker", "local"]],
      label: "2 · Written to local file",
      what: "Logs are written to <code>BASE_LOG_FOLDER/dag_id/task_id/run_id/try_number.log</code> on the worker's filesystem. During an active run, the UI tails this file via the worker's log-serve endpoint.",
      why: "A local file is the fast, always-available first destination — it lets you watch a running task live before the log is ever shipped anywhere.",
      how: "The <code>FileTaskHandler</code> writes to the structured path; while the task runs, the API server proxies to the worker's log endpoint so you see output in near real time.",
      when: "Throughout the run, and until the log is uploaded or the worker is recycled.",
      mistake: "Relying on the local file as the permanent store — on Kubernetes the pod is ephemeral and the file vanishes when it dies.",
      interview: "“How does the UI show live logs mid-run?” It tails the worker's local file via a log-serve endpoint. Knowing it's the worker (not remote storage) during a run is the detail.",
      example: "ShopKart's on-call watches <code>extract_orders</code> stream live in the UI while it runs, served straight from the worker's local <code>1.log</code>."
    },
    {
      nodes: ["local", "remote"], edges: [["local", "remote"]],
      label: "3 · Remote handler uploads to S3/GCS",
      what: "If remote logging is configured, the handler uploads the completed log file to remote storage after the task finishes; the remote path mirrors the local structure.",
      why: "This is the production pattern — logs survive worker restarts and container termination, so you can always read them even after the pod that produced them is gone.",
      how: "Set <code>remote_logging=True</code>, a <code>remote_log_conn_id</code>, and a <code>remote_base_log_folder</code> (S3/GCS/Azure). On task completion the handler copies the local file to that bucket.",
      when: "After each task attempt finishes, once the file is complete.",
      mistake: "Skipping remote logging on Kubernetes, so any post-mortem after a pod dies has no logs to read.",
      interview: "“What's the recommended prod logging setup?” Remote logging to object storage so logs outlive ephemeral workers. It's the answer that shows production experience.",
      example: "ShopKart uploads every finished log to <code>s3://shopkart-logs/airflow/</code>, so a failure investigation next week still has the full output."
    },
    {
      nodes: ["remote", "api", "ui"], edges: [["remote", "api"], ["api", "ui"]],
      label: "4 · UI reads from remote",
      what: "Once the task is done, the API Server fetches the log from remote storage and returns it to the UI or CLI. If remote isn't configured, it falls back to the worker's endpoint or local file.",
      why: "Reading finished logs from durable storage means they're always available, regardless of whether the worker still exists — the UI doesn't depend on ephemeral infrastructure.",
      how: "On a log request for a completed task, the API server resolves the remote path, streams the object back, and renders it; the fallback chain covers unconfigured or in-flight cases.",
      when: "Whenever you open the log of a completed task.",
      mistake: "Expecting to see logs for a finished K8s task with no remote logging — the pod (and its file) is gone, so the UI shows nothing.",
      interview: "“Why can't I see logs for an old task run?” Likely no remote logging, and the worker/pod that held the file is gone. A common real-world debugging question.",
      example: "A week later, ShopKart opens a failed run's log and the API server streams it straight from S3 — the original worker is long gone."
    },
    {
      nodes: ["worker", "local", "remote", "api", "ui"], edges: EDGES,
      label: "5 · Per-try_number files",
      what: "Each retry creates its own log file (<code>1.log</code>, <code>2.log</code>, <code>3.log</code>), and the UI shows a dropdown to switch between attempts.",
      why: "Separate per-attempt logs let you compare exactly what changed between a failing try and a succeeding one — invaluable for diagnosing intermittent failures.",
      how: "The handler keys the filename on <code>try_number</code>, so every attempt writes independently and the UI exposes an attempt selector to view each.",
      when: "Any time a task retries.",
      mistake: "Looking only at the latest attempt's log and missing why the earlier ones failed — the history is right there in the dropdown.",
      interview: "“A task passed only on retry 3 — where do you look?” The per-attempt logs via <code>try_number</code>. It's the operational habit interviewers like to see.",
      example: "ShopKart compares <code>extract_orders</code>' attempt-1 timeout log with attempt-3's clean run to confirm it was a transient API issue."
    },
    {
      nodes: ["worker", "local", "remote", "api", "ui"], edges: EDGES,
      label: "6 · Airflow 3: structured JSON logs",
      what: "Airflow 3 emits structured JSON log lines by default, with <code>dag_id</code>, <code>task_id</code>, <code>run_id</code>, <code>try_number</code>, and <code>level</code> as top-level fields.",
      why: "Structured logs are directly queryable in Elasticsearch, CloudWatch Logs Insights, and Grafana Loki — no brittle regex parsing to extract which task or level a line belongs to.",
      how: "Airflow 3 ships a JSON logging config by default; each line is a JSON object your log platform can index on those fields for filtering and dashboards.",
      when: "In Airflow 3+ deployments that ship logs to a searchable backend.",
      mistake: "Building regex parsers for plaintext logs on 3.x when structured JSON already gives you clean, indexed fields for free.",
      interview: "“How would you make Airflow logs searchable by task and level?” Structured JSON logging (default in 3.x) into Elasticsearch/Loki. Naming the queryable fields is the senior touch.",
      example: "ShopKart queries Loki for <code>level=\"ERROR\" AND task_id=\"reconcile_payments\"</code> across all runs, because every line is structured JSON."
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
        detail.innerHTML = AV.Explain.render(s);
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
