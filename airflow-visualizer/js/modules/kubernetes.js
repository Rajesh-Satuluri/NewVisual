/* ============================================================
   modules/kubernetes.js — Kubernetes Executor
   Arch diagram: scheduler → K8s executor → K8s API → per-task pods.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var NODES = [
    { id: "sched", label: "Scheduler",        sub: "queues a task instance",     x: 40,  y: 30,  w: 190, h: 60, color: "airflow" },
    { id: "exec",  label: "K8s Executor",     sub: "in-scheduler process",       x: 40,  y: 175, w: 190, h: 60, color: "cyan"    },
    { id: "api",   label: "Kubernetes API",   sub: "creates & watches pods",     x: 265, y: 175, w: 185, h: 60, color: "purple"  },
    { id: "tmpl",  label: "pod_template_file", sub: "base spec + executor_config", x: 265, y: 30,  w: 185, h: 60, color: "green"   },
    { id: "pod",   label: "Worker Pod",       sub: "one pod per task instance",  x: 485, y: 120, w: 180, h: 65, color: "yellow"  },
    { id: "done",  label: "Pod Completes",    sub: "state → DB, pod cleaned up", x: 485, y: 265, w: 180, h: 60, color: "red"     }
  ];

  var EDGES = [
    ["sched", "exec"], ["tmpl", "api"], ["exec", "api"], ["api", "pod"], ["pod", "done"], ["done", "sched"]
  ];

  var STEPS = [
    {
      nodes: ["sched", "exec"], edges: [["sched", "exec"]],
      label: "1 · Scheduler hands a task to the executor",
      desc: "When a task is ready to run, the scheduler passes it to the <b>KubernetesExecutor</b>, which runs inside the scheduler process. Unlike Celery, there's no standing worker pool and no message broker — the executor talks directly to Kubernetes."
    },
    {
      nodes: ["tmpl", "exec"], edges: [],
      label: "2 · Build the pod spec",
      desc: "The executor starts from a base <code>pod_template_file</code> (image, service account, volumes, resource defaults) and layers the task's per-task <code>executor_config</code> on top — letting a single memory-hungry task request more RAM without changing any other task."
    },
    {
      nodes: ["exec", "api", "pod"], edges: [["exec", "api"], ["api", "pod"]],
      label: "3 · One pod per task instance",
      desc: "The executor calls the <b>Kubernetes API</b> to launch a brand-new pod dedicated to this single task instance. Full isolation: each task gets its own container, its own resources, and can even use a different image. No noisy-neighbor contention."
    },
    {
      nodes: ["pod"], edges: [],
      label: "4 · The task runs to completion",
      desc: "The pod runs <code>airflow tasks run</code> for exactly one task instance, streaming logs (uploaded to remote storage on finish). Kubernetes handles scheduling the pod onto a node, respecting requests/limits, node selectors, and tolerations from the spec."
    },
    {
      nodes: ["pod", "done", "sched"], edges: [["pod", "done"], ["done", "sched"]],
      label: "5 · Pod terminates, state recorded",
      desc: "When the task finishes, the pod exits. The executor watches the K8s API for the pod's phase, records the final task state in the metadata DB, and (by default) deletes the pod. Failed pods can be kept for debugging via <code>delete_worker_pods=False</code>."
    },
    {
      nodes: ["sched", "exec", "api", "tmpl", "pod", "done"], edges: EDGES,
      label: "6 · Trade-offs vs Celery",
      desc: "<b>Pros:</b> perfect isolation, per-task resources, no idle workers, native autoscaling. <b>Cons:</b> ~seconds of pod startup latency per task — costly for thousands of tiny tasks. The hybrid answer is a <b>KubernetesExecutor + CeleryExecutor</b> combo, routing per task via the queue."
    }
  ];

  var CODE_CONFIG =
    "# airflow.cfg\n" +
    "[core]\n" +
    "executor = KubernetesExecutor\n" +
    "\n" +
    "[kubernetes_executor]\n" +
    "namespace              = airflow\n" +
    "pod_template_file      = /opt/airflow/pod_template.yaml\n" +
    "delete_worker_pods     = True\n" +
    "delete_worker_pods_on_failure = False   # keep for debugging\n" +
    "worker_pods_creation_batch_size = 16";

  var CODE_TASK =
    "from kubernetes.client import models as k8s\n" +
    "\n" +
    "# Give ONE heavy task more memory + a GPU node\n" +
    "extract_ml = PythonOperator(\n" +
    "    task_id='extract_ml_features',\n" +
    "    python_callable=featurize,\n" +
    "    executor_config={\n" +
    "        'pod_override': k8s.V1Pod(\n" +
    "            spec=k8s.V1PodSpec(containers=[\n" +
    "                k8s.V1Container(\n" +
    "                    name='base',\n" +
    "                    resources=k8s.V1ResourceRequirements(\n" +
    "                        limits={'memory': '8Gi', 'cpu': '2'}))]))\n" +
    "    },\n" +
    ")";

  var module = {
    id: "kubernetes",
    title: "Kubernetes Executor",
    fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Executors</div>' +
          '<h1 class="module-title">Kubernetes Executor: one pod per task</h1>' +
          '<p class="module-subtitle">The KubernetesExecutor launches a fresh, isolated pod for every task instance — no standing worker pool, ' +
          "per-task resources, and native autoscaling. The cost is pod-startup latency, which shapes when to use it.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="k8-canvas"></div>' +
          '<aside class="arch-detail" id="k8-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="k8-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<div class="two-col-code" id="k8-codes"></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout warn"><span class="callout-icon">⏱️</span><div class="callout-body">' +
          "<b>Pod startup latency is real.</b> Each task waits seconds for a pod to schedule and pull its image. For DAGs with thousands of sub-second tasks, that overhead dominates — use CeleryExecutor, or route only heavy tasks to Kubernetes.</div></div>" +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<b>Cleaner isolation:</b> with Airflow 3's Task Execution API, worker pods talk to the API server instead of the metadata DB directly — pods no longer carry database credentials, tightening the security boundary.</div></div>" +
        "</section>";

      var diagram = AV.ArchDiagram.create({
        nodes: NODES, edges: EDGES, viewBox: "0 0 700 355", onSelect: function () {}
      });
      container.querySelector("#k8-canvas").appendChild(diagram.el);
      this._diagram = diagram;

      var detail = container.querySelector("#k8-detail");
      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">Pod-per-task lifecycle</div>' +
          "<p>Press play to follow one task from the scheduler through pod creation, execution, and cleanup — and see where the KubernetesExecutor beats (and loses to) Celery.</p>" +
          '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">🎛️</span>' +
          '<div class="callout-body"><code>executor_config</code> with a <code>pod_override</code> lets a single task request more memory, a GPU, or a different image — without affecting any other task.</div></div>';
      }
      function showStep(idx) {
        if (idx < 0) { defaultDetail(); return; }
        var s = STEPS[idx];
        detail.innerHTML = '<div class="arch-detail-title">' + s.label + "</div><p>" + s.desc + "</p>";
      }

      var codes = container.querySelector("#k8-codes");
      var a = document.createElement("div"); a.className = "two-col-code-item";
      a.appendChild(AV.CodeViewer.create({ title: "airflow.cfg — KubernetesExecutor", lang: "bash", code: CODE_CONFIG }));
      var b = document.createElement("div"); b.className = "two-col-code-item";
      b.appendChild(AV.CodeViewer.create({ title: "per-task pod_override", lang: "python", code: CODE_TASK }));
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
      container.querySelector("#k8-controls").appendChild(controls.el);
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
