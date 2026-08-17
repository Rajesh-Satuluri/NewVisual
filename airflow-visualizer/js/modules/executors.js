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
      body: "The simplest real executor. The scheduler forks subprocesses on its own machine — no broker, no extra services.",
      pros: ["Zero extra infrastructure", "Fast, simple, great for small setups"],
      cons: ["Bounded by one host's CPU/RAM", "Scheduler and task work compete for resources"],
      bestFor: "Small / single-node deployments, dev, CI.",
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
      body: "Tasks are published to a broker; a fleet of long-running Celery workers pulls and executes them. Scales horizontally by adding workers.",
      pros: ["Horizontal scaling across many machines", "Battle-tested for large workloads", "Queues route tasks to worker pools"],
      cons: ["Operate a broker + result backend", "Idle workers still consume resources", "Worker env must have all deps"],
      bestFor: "Large, steady workloads across a worker fleet.",
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
      body: "Every task instance gets its own Kubernetes pod, created on demand and destroyed on completion. No idle workers.",
      pros: ["Per-task isolation & resources", "Scales to zero — no idle cost", "Per-task images / dependencies"],
      cons: ["Pod startup latency per task", "Needs a Kubernetes cluster", "Chatty for very short tasks"],
      bestFor: "Bursty or heterogeneous workloads on Kubernetes.",
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
      detail.innerHTML =
        '<div class="arch-detail-title">' + ex.label + "</div>" +
        "<p>" + ex.body + "</p>" +
        '<div class="pc-list"><div class="pc-col"><div class="pc-h pc-pro">Pros</div><ul>' +
          ex.pros.map(function (p) { return "<li>" + p + "</li>"; }).join("") +
        '</ul></div><div class="pc-col"><div class="pc-h pc-con">Cons</div><ul>' +
          ex.cons.map(function (c) { return "<li>" + c + "</li>"; }).join("") +
        "</ul></div></div>" +
        '<div class="callout tip" style="margin-top:var(--space-3)"><span class="callout-icon">✅</span>' +
        '<div class="callout-body"><b>Best for:</b> ' + ex.bestFor + "</div></div>";
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
