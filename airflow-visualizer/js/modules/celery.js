/* ============================================================
   modules/celery.js — Celery Executor
   Arch diagram: scheduler → CeleryExecutor → broker → workers
   → result backend.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var NODES = [
    { id: "sched",  label: "Scheduler",       sub: "CeleryExecutor inside",   x: 30,  y: 30,  w: 190, h: 60, color: "airflow" },
    { id: "broker", label: "Message Broker",  sub: "Redis / RabbitMQ",       x: 255, y: 30,  w: 190, h: 60, color: "purple"  },
    { id: "queues", label: "Named Queues",    sub: "default · gpu · high_mem", x: 255, y: 165, w: 190, h: 60, color: "cyan"    },
    { id: "w1",     label: "Worker A",        sub: "-Q default",             x: 480, y: 30,  w: 185, h: 55, color: "yellow"  },
    { id: "w2",     label: "Worker B",        sub: "-Q gpu,high_mem",        x: 480, y: 135, w: 185, h: 55, color: "yellow"  },
    { id: "result", label: "Result Backend",  sub: "task state → DB",        x: 255, y: 300, w: 190, h: 60, color: "green"   },
    { id: "flower", label: "Flower",          sub: "worker monitoring UI",   x: 480, y: 300, w: 185, h: 55, color: "orange"  }
  ];

  var EDGES = [
    ["sched", "broker"], ["broker", "queues"],
    ["queues", "w1"], ["queues", "w2"],
    ["w1", "result"], ["w2", "result"], ["result", "sched"], ["w2", "flower"]
  ];

  var STEPS = [
    {
      nodes: ["sched", "broker"], edges: [["sched", "broker"]],
      label: "1 · Scheduler enqueues to the broker",
      desc: "The <b>CeleryExecutor</b> runs inside the scheduler. When a task is ready, it serializes a command and pushes it onto the <b>message broker</b> (Redis or RabbitMQ). Unlike Kubernetes, workers are long-lived and pull work — no pod is created per task."
    },
    {
      nodes: ["broker", "queues"], edges: [["broker", "queues"]],
      label: "2 · Tasks land in named queues",
      desc: "The broker holds tasks in <b>queues</b>. A task's <code>queue</code> attribute routes it: put GPU jobs on a <code>gpu</code> queue, memory-heavy ETL on <code>high_mem</code>, everything else on <code>default</code>. Queues are how you steer work to the right hardware."
    },
    {
      nodes: ["queues", "w1", "w2"], edges: [["queues", "w1"], ["queues", "w2"]],
      label: "3 · Workers subscribe and pull",
      desc: "Each <b>Celery worker</b> subscribes to one or more queues with <code>-Q</code>. Worker A drains <code>default</code>; Worker B drains <code>gpu</code> and <code>high_mem</code>. A worker's <code>worker_concurrency</code> sets how many tasks it runs in parallel (prefork processes)."
    },
    {
      nodes: ["w1", "w2"], edges: [],
      label: "4 · Tasks execute on the worker",
      desc: "The worker forks a child process, runs <code>airflow tasks run</code>, and streams logs (uploaded to remote storage on finish). Because workers are already warm, there's <b>no per-task startup latency</b> — Celery's key advantage for high volumes of short tasks."
    },
    {
      nodes: ["w1", "w2", "result", "sched"], edges: [["w1", "result"], ["w2", "result"], ["result", "sched"]],
      label: "5 · Result backend records state",
      desc: "When a task finishes, its outcome is written to the <b>result backend</b> (typically the same metadata DB). The scheduler reads it to advance the DAG. In Airflow, the source of truth for task state is the metadata DB, not Celery's own backend."
    },
    {
      nodes: ["w1", "w2", "flower"], edges: [["w2", "flower"]],
      label: "6 · Monitor with Flower + autoscale",
      desc: "<b>Flower</b> is a web UI for live worker/queue monitoring — task rates, active workers, queue depth. Scale horizontally by adding workers; autoscale on broker queue depth. <b>Trade-off vs Kubernetes:</b> lower latency, but idle workers cost money and lack per-task isolation."
    }
  ];

  var CODE_CONFIG =
    "# airflow.cfg\n" +
    "[core]\n" +
    "executor = CeleryExecutor\n" +
    "\n" +
    "[celery]\n" +
    "broker_url         = redis://redis:6379/0\n" +
    "result_backend     = db+postgresql://airflow@pg/airflow\n" +
    "worker_concurrency = 16\n" +
    "flower_port        = 5555";

  var CODE_ROUTE =
    "# Route a heavy task to a dedicated queue\n" +
    "train_model = PythonOperator(\n" +
    "    task_id='train_model',\n" +
    "    python_callable=train,\n" +
    "    queue='gpu',            # only gpu workers pick it up\n" +
    ")\n" +
    "\n" +
    "# Start workers bound to specific queues:\n" +
    "#   worker A:  airflow celery worker -Q default\n" +
    "#   worker B:  airflow celery worker -Q gpu,high_mem\n" +
    "#   monitor :  airflow celery flower";

  var module = {
    id: "celery",
    title: "Celery Executor",
    fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Executors</div>' +
          '<h1 class="module-title">Celery Executor: a warm pool of workers pulling from a broker</h1>' +
          '<p class="module-subtitle">CeleryExecutor pushes tasks onto a message broker where long-lived workers pull them by queue. ' +
          "No per-task pod startup — the trade for idle-worker cost and weaker isolation than Kubernetes.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="ce-canvas"></div>' +
          '<aside class="arch-detail" id="ce-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="ce-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<div class="two-col-code" id="ce-codes"></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout tip"><span class="callout-icon">🐝</span><div class="callout-body">' +
          "<b>Queues are your routing layer.</b> Bind expensive hardware (GPU, high-memory nodes) to dedicated queues and set each task's <code>queue</code>. This keeps a runaway ML job from starving the workers your hourly ETL depends on.</div></div>" +
          '<div class="callout info"><span class="badge badge-v2">2.x</span><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<b>Celery vs Kubernetes:</b> Celery wins on latency and high task volume; Kubernetes wins on isolation and per-task resources. Many teams run both via the <code>CeleryKubernetesExecutor</code>, routing by queue name.</div></div>" +
        "</section>";

      var diagram = AV.ArchDiagram.create({
        nodes: NODES, edges: EDGES, viewBox: "0 0 700 380", onSelect: function () {}
      });
      container.querySelector("#ce-canvas").appendChild(diagram.el);
      this._diagram = diagram;

      var detail = container.querySelector("#ce-detail");
      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">Broker + worker pool</div>' +
          "<p>Press play to trace a task from the scheduler onto the broker, into a named queue, out to a subscribed worker, and back as recorded state.</p>" +
          '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">⚡</span>' +
          '<div class="callout-body">Warm workers mean near-zero task startup latency — Celery\'s edge over KubernetesExecutor for many small tasks.</div></div>';
      }
      function showStep(idx) {
        if (idx < 0) { defaultDetail(); return; }
        var s = STEPS[idx];
        detail.innerHTML = '<div class="arch-detail-title">' + s.label + "</div><p>" + s.desc + "</p>";
      }

      var codes = container.querySelector("#ce-codes");
      var a = document.createElement("div"); a.className = "two-col-code-item";
      a.appendChild(AV.CodeViewer.create({ title: "airflow.cfg — CeleryExecutor", lang: "bash", code: CODE_CONFIG }));
      var b = document.createElement("div"); b.className = "two-col-code-item";
      b.appendChild(AV.CodeViewer.create({ title: "queue routing", lang: "python", code: CODE_ROUTE }));
      codes.appendChild(a); codes.appendChild(b);

      var engine = new AV.AnimationEngine({
        steps: STEPS.map(function (s) { return { label: s.label, duration: 2900 }; }), speed: 1
      });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) {
        if (idx < 0) { diagram.clear(); showStep(-1); return; }
        diagram.setActive(STEPS[idx].nodes, STEPS[idx].edges);
        showStep(idx);
      });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#ce-controls").appendChild(controls.el);
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
