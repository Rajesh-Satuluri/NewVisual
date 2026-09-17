/* ============================================================
   modules/executors.js — Local vs Celery vs Kubernetes
   Interactive comparison: toggle swaps a per-executor flow diagram
   and detail; a comparison table sits below.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var EXECUTORS = {
    local: {
      label: "LocalExecutor",
      tagline: "Runs tasks as subprocesses on the scheduler host.",
      viewBox: "0 0 960 200",
      nodes: [
        { id: "scheduler", label: "Scheduler", sub: "SchedulerJob", x: 30, y: 70, w: 165, h: 62, color: "airflow" },
        { id: "exec", label: "LocalExecutor", sub: "in-process", x: 250, y: 70, w: 175, h: 62, color: "green" },
        { id: "sub", label: "Subprocess", sub: "fork per task", x: 480, y: 70, w: 165, h: 62, color: "cyan" },
        { id: "task", label: "Task", sub: "execute()", x: 700, y: 70, w: 150, h: 62, color: "airflow" }
      ],
      edges: [["scheduler", "exec"], ["exec", "sub"], ["sub", "task"]],
      what: "The simplest real executor. The scheduler runs each task as a <b>subprocess on its own host</b> — no broker, no workers, no extra services to operate.",
      why: "Zero extra infrastructure makes it fast to stand up and easy to reason about — ideal for dev, CI, and small single-node deployments where a distributed setup is overkill.",
      how: "Set <code>executor = LocalExecutor</code>; the scheduler forks one subprocess per task. <code>parallelism</code> caps how many run concurrently across the whole install.",
      when: "Small or single-node deployments, local development, and CI.",
      mistake: "Running it in production and expecting to scale. You're bounded by one host's CPU/RAM, and task work competes with the scheduler for that machine.",
      interview: "“When is LocalExecutor the right choice?” Dev, CI, small single-node setups — no broker needed. Its ceiling is one machine, which is exactly why you outgrow it.",
      example: "ShopKart runs LocalExecutor on a laptop for DAG development and in CI, then switches executor for the real cluster.",
      config: "executor = LocalExecutor\nparallelism = 32   # max running tasks cluster-wide"
    },
    celery: {
      label: "CeleryExecutor",
      tagline: "Distributes tasks to a pool of workers via a broker.",
      viewBox: "0 0 960 260",
      nodes: [
        { id: "scheduler", label: "Scheduler", sub: "SchedulerJob", x: 30, y: 100, w: 160, h: 60, color: "airflow" },
        { id: "exec", label: "CeleryExecutor", sub: "publishes", x: 235, y: 100, w: 170, h: 60, color: "green" },
        { id: "broker", label: "Broker", sub: "Redis / RabbitMQ", x: 450, y: 100, w: 160, h: 60, color: "yellow" },
        { id: "worker", label: "Celery Workers", sub: "pull & run", x: 660, y: 40, w: 175, h: 60, color: "cyan" },
        { id: "result", label: "Result Backend", sub: "task state", x: 660, y: 165, w: 175, h: 56, color: "purple" }
      ],
      edges: [["scheduler", "exec"], ["exec", "broker"], ["broker", "worker"], ["worker", "result"]],
      what: "Tasks are published to a <b>message broker</b> (Redis/RabbitMQ) where a fleet of long-lived <b>Celery workers</b> pulls and runs them. Scale out by adding workers.",
      why: "Warm, always-on workers give near-zero per-task startup and horizontal scale across many machines — the battle-tested choice for large, steady workloads.",
      how: "Set <code>executor = CeleryExecutor</code> with a <code>broker_url</code> and <code>result_backend</code>. Named queues route tasks to specific worker pools via <code>-Q</code>.",
      when: "Large, steady workloads spread across a worker fleet.",
      mistake: "Forgetting idle workers still cost money and share one image — you operate a broker + result backend, and weaker per-task isolation is the trade vs Kubernetes.",
      interview: "“Why pick Celery over Kubernetes?” Lower latency and high throughput for many small tasks via warm workers — accept idle-worker cost and weaker isolation as the trade.",
      example: "ShopKart runs its steady overnight ETL fleet on CeleryExecutor, routing heavy jobs to a <code>high_mem</code> queue.",
      config: "executor = CeleryExecutor\nbroker_url = redis://redis:6379/0\nresult_backend = db+postgresql://..."
    },
    kubernetes: {
      label: "KubernetesExecutor",
      tagline: "Launches one pod per task, then tears it down.",
      viewBox: "0 0 960 200",
      nodes: [
        { id: "scheduler", label: "Scheduler", sub: "SchedulerJob", x: 30, y: 70, w: 160, h: 62, color: "airflow" },
        { id: "exec", label: "K8sExecutor", sub: "requests pods", x: 240, y: 70, w: 165, h: 62, color: "green" },
        { id: "api", label: "Kubernetes API", sub: "schedules pod", x: 455, y: 70, w: 175, h: 62, color: "yellow" },
        { id: "pod", label: "Task Pod", sub: "one per task", x: 690, y: 70, w: 165, h: 62, color: "cyan" }
      ],
      edges: [["scheduler", "exec"], ["exec", "api"], ["api", "pod"]],
      what: "Every task instance gets its <b>own Kubernetes pod</b>, created on demand and destroyed on completion. No long-running workers, no idle fleet.",
      why: "Per-task pods give full isolation, per-task resources and images, and scale-to-zero — you pay only for pods that are actually running.",
      how: "Set <code>executor = KubernetesExecutor</code>; tune per-task CPU/memory and image via <code>executor_config</code> / <code>pod_override</code>. The scheduler asks the K8s API to launch each pod.",
      when: "Bursty or heterogeneous workloads already running on Kubernetes.",
      mistake: "Using it for thousands of very short tasks — pod-startup latency per task makes it chatty and slow where Celery's warm workers would fly.",
      interview: "“Trade-off of the Kubernetes executor?” Isolation, per-task resources, and scale-to-zero, paid for with pod-startup latency each task — great for bursty/mixed, poor for tiny high-volume tasks.",
      example: "ShopKart runs its occasional heavy ML training on KubernetesExecutor so each job gets a right-sized pod and nothing sits idle between runs.",
      config: "executor = KubernetesExecutor\n# per-task resources via executor_config / pod_override"
    }
  };

  var TABLE = [
    ["Extra infra", "None", "Broker + result backend", "Kubernetes cluster"],
    ["Scaling", "One host", "Add workers", "Pod per task (to zero)"],
    ["Isolation", "Process", "Process on worker", "Full pod"],
    ["Per-task overhead", "Very low", "Low", "Pod startup"],
    ["Idle cost", "n/a", "Workers stay up", "None"],
    ["Best for", "Dev / small", "Large steady load", "Bursty / mixed"]
  ];

  var module = {
    id: "executors",
    title: "Executors",
    fullWidth: true,
    _diagram: null,
    _current: "local",

    render: function (container) {
      var self = this;
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Execution</div>' +
          '<h1 class="module-title">Executors: where tasks actually run</h1>' +
          '<p class="module-subtitle">The executor is the bridge between the scheduler\'s decisions and real compute. ' +
          "The scheduler is identical in each case — only the executor changes. Toggle to compare.</p>" +
        "</div>" +
        '<div class="exec-toggle" id="exec-toggle" role="tablist"></div>' +
        '<div class="arch-layout" style="grid-template-columns:1fr 340px;margin-top:var(--space-4)">' +
          '<div class="arch-canvas" id="exec-canvas"></div>' +
          '<aside class="arch-detail" id="exec-detail"></aside>' +
        "</div>" +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">Side by side</h2>' +
          '<div class="table-wrap"><table class="cmp-table" id="exec-table"></table></div>' +
        "</section>";

      // Toggle buttons
      var toggle = container.querySelector("#exec-toggle");
      toggle.innerHTML = Object.keys(EXECUTORS).map(function (k) {
        return '<button class="exec-tab" role="tab" data-exec="' + k + '">' + EXECUTORS[k].label + "</button>";
      }).join("");
      toggle.addEventListener("click", function (e) {
        var b = e.target.closest("[data-exec]");
        if (b) self.select(container, b.getAttribute("data-exec"));
      });

      // Comparison table
      var head = "<thead><tr><th>Dimension</th><th>Local</th><th>Celery</th><th>Kubernetes</th></tr></thead>";
      var rows = TABLE.map(function (r) {
        return "<tr><td class='cmp-dim'>" + r[0] + "</td><td>" + r[1] + "</td><td>" + r[2] + "</td><td>" + r[3] + "</td></tr>";
      }).join("");
      container.querySelector("#exec-table").innerHTML = head + "<tbody>" + rows + "</tbody>";

      this.select(container, "local");
    },

    select: function (container, key) {
      this._current = key;
      var ex = EXECUTORS[key];
      // active tab
      container.querySelectorAll(".exec-tab").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-exec") === key);
      });
      // diagram
      if (this._diagram) { this._diagram.destroy(); this._diagram = null; }
      var canvas = container.querySelector("#exec-canvas");
      canvas.innerHTML = "";
      var diagram = AV.ArchDiagram.create({ nodes: ex.nodes, edges: ex.edges, viewBox: ex.viewBox, onSelect: function () {} });
      canvas.appendChild(diagram.el);
      // light the whole pipeline
      diagram.setActive(ex.nodes.map(function (n) { return n.id; }), ex.edges);
      this._diagram = diagram;
      // detail
      var detail = container.querySelector("#exec-detail");
      detail.innerHTML = AV.Explain.render({
        label: ex.label,
        what: ex.what, why: ex.why, how: ex.how,
        when: ex.when, mistake: ex.mistake, interview: ex.interview, example: ex.example
      });
      var cv = AV.CodeViewer.create({ title: "airflow.cfg", lang: "ini", code: ex.config });
      cv.style.marginTop = "var(--space-3)";
      detail.appendChild(cv);
    },

    destroy: function () {
      if (this._diagram) { this._diagram.destroy(); this._diagram = null; }
    }
  };

  AV.registerModule(module);
})();
