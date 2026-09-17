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
      what: "The <b>CeleryExecutor</b> runs inside the scheduler. When a task is ready, it serializes a command and pushes it onto the <b>message broker</b> (Redis or RabbitMQ).",
      why: "A broker decouples producing work from consuming it. Long-lived workers pull when free, so there's no per-task infrastructure to create — the opposite of Kubernetes' pod-per-task.",
      how: "The executor publishes the task command to the broker; workers subscribed to that queue pick it up. No pod is created; the work waits in the broker until a worker is available.",
      when: "On every task launch under the CeleryExecutor.",
      mistake: "Treating the broker as the source of truth for task state — it isn't; the metadata DB is. The broker only carries the “please run this” message.",
      interview: "“What sits between the scheduler and workers in Celery?” The message broker (Redis/RabbitMQ). Contrast with K8s (no broker) to show you understand both.",
      example: "ShopKart's scheduler serializes <code>transform_sales</code> and pushes it to Redis, where a warm worker will grab it — no pod spin-up."
    },
    {
      nodes: ["broker", "queues"], edges: [["broker", "queues"]],
      label: "2 · Tasks land in named queues",
      what: "The broker holds tasks in <b>queues</b>. A task's <code>queue</code> attribute routes it: GPU jobs to a <code>gpu</code> queue, heavy ETL to <code>high_mem</code>, everything else to <code>default</code>.",
      why: "Queues are your routing layer — they steer work to the right hardware and keep a runaway job on one queue from starving the workers another workload depends on.",
      how: "Set <code>queue='gpu'</code> on the task; start workers bound to queues with <code>-Q</code>. The broker keeps per-queue ordering, and only workers subscribed to a queue can drain it.",
      when: "Whenever different tasks need different hardware or isolation within one Celery cluster.",
      mistake: "Putting everything on <code>default</code>, so a memory-hungry job and your hourly ETL fight for the same workers and the ETL starves.",
      interview: "“How do you send GPU work to GPU machines in Celery?” Named queues + workers bound with <code>-Q</code>. It's the routing question that separates users from operators.",
      example: "ShopKart routes <code>transform_sales</code> to <code>high_mem</code> so only big-memory workers run it, while light extracts stay on <code>default</code>."
    },
    {
      nodes: ["queues", "w1", "w2"], edges: [["queues", "w1"], ["queues", "w2"]],
      label: "3 · Workers subscribe and pull",
      what: "Each <b>Celery worker</b> subscribes to one or more queues with <code>-Q</code> and pulls tasks from them. A worker's <code>worker_concurrency</code> sets how many it runs in parallel.",
      why: "Pull-based, long-lived workers are what give Celery near-zero task-startup latency — the workers are already warm and just grab the next message.",
      how: "Worker A runs <code>-Q default</code>; Worker B runs <code>-Q gpu,high_mem</code>. Each forks <code>worker_concurrency</code> child processes (prefork), so one worker can run many tasks at once.",
      when: "Continuously — workers long-poll their queues for as long as they're up.",
      mistake: "Setting <code>worker_concurrency</code> too high for the box, so tasks contend for CPU/memory — or too high for the DB, exhausting connections.",
      interview: "“What controls how many tasks a Celery worker runs at once?” <code>worker_concurrency</code> (prefork processes). Bonus: note it multiplies DB connection load.",
      example: "ShopKart runs Worker B with <code>-Q gpu,high_mem</code> and concurrency 4, so it handles up to four heavy jobs while Worker A drains the light queue."
    },
    {
      nodes: ["w1", "w2"], edges: [],
      label: "4 · Tasks execute on the worker",
      what: "The worker forks a child process, runs <code>airflow tasks run</code>, and streams logs (uploaded to remote storage on finish). Because workers are already warm, there's <b>no per-task startup latency</b>.",
      why: "Warm workers are Celery's key advantage for high volumes of short tasks — you skip the seconds of pod creation that KubernetesExecutor pays every time.",
      how: "The prefork child executes the task's operator, heartbeats, and writes results. The worker process persists across tasks, so the next task starts immediately with no cold start.",
      when: "For each task a worker picks up, back-to-back.",
      mistake: "Assuming warm workers give per-task isolation. They don't — tasks share the worker's image and resources, so one leaky task can affect its neighbors.",
      interview: "“Why is Celery faster than the K8s executor for many small tasks?” No per-task pod startup — warm workers execute immediately. The isolation trade-off is the counterpoint.",
      example: "ShopKart's thousands of tiny hourly API pulls fly through warm Celery workers with no cold-start penalty per task."
    },
    {
      nodes: ["w1", "w2", "result", "sched"], edges: [["w1", "result"], ["w2", "result"], ["result", "sched"]],
      label: "5 · Result backend records state",
      what: "When a task finishes, its outcome is written to the <b>result backend</b> (typically the same metadata DB), and the scheduler reads it to advance the DAG.",
      why: "The DAG can only move forward once outcomes are durable. Airflow deliberately treats the metadata DB — not Celery's own bookkeeping — as the source of truth for task state.",
      how: "The worker writes the final task-instance state to the DB; the scheduler polls it and unblocks downstream tasks. Celery's result backend and Airflow's state can be the same Postgres.",
      when: "At the end of each task, feeding the next scheduler loop.",
      mistake: "Confusing Celery's result backend with Airflow's source of truth. Task state lives in the metadata DB; don't rely on Celery internals to know what happened.",
      interview: "“Where does Airflow record Celery task results?” The metadata DB (as the result backend). Clarifying that the DB, not Celery, is authoritative is the precise answer.",
      example: "ShopKart's worker writes <span class='state-chip success'>success</span> for <code>transform_sales</code> to Postgres, and the next scheduler loop starts the load task."
    },
    {
      nodes: ["w1", "w2", "flower"], edges: [["w2", "flower"]],
      label: "6 · Monitor with Flower + autoscale",
      what: "<b>Flower</b> is a web UI for live worker/queue monitoring — task rates, active workers, queue depth. You scale horizontally by adding workers and autoscale on queue depth.",
      why: "Because workers are long-lived, you need visibility into their health and backlog, and a way to add capacity when queues grow — that's Flower plus an autoscaler.",
      how: "Run <code>airflow celery flower</code> for the dashboard; autoscale worker replicas on broker queue depth. Idle workers still cost money and lack per-task isolation — the trade vs Kubernetes.",
      when: "In any production Celery deployment, for monitoring and elastic capacity.",
      mistake: "Provisioning for peak and never scaling down, so a fleet sized for Black Friday burns money idle for the other 364 days.",
      interview: "“How do you monitor and scale Celery workers?” Flower for visibility, queue-depth autoscaling for capacity — and acknowledge idle-worker cost as the Celery downside.",
      example: "ShopKart watches queue depth in Flower and autoscales workers up for the evening peak, then back down overnight to save cost."
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
        detail.innerHTML = AV.Explain.render(s);
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
