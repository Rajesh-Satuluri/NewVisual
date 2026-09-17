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
      what: "When a task is ready to run, the scheduler passes it to the <b>KubernetesExecutor</b>, which runs <i>inside</i> the scheduler process. There's no standing worker pool and no broker.",
      why: "The whole model is “compute on demand.” Instead of keeping warm workers, Kubernetes creates infrastructure per task, so idle capacity costs nothing.",
      how: "The executor talks directly to the Kubernetes API — no Celery, no Redis/RabbitMQ. It translates “run this task” into “create this pod.”",
      when: "On every task launch under the KubernetesExecutor.",
      mistake: "Expecting a broker or worker fleet to tune. There isn't one — the “worker” is a pod that's born and dies with the task.",
      interview: "“How does KubernetesExecutor differ from Celery at a high level?” No broker, no standing workers — the executor asks Kubernetes for a pod per task. That framing lands well.",
      example: "ShopKart's scheduler hands <code>extract_ml_features</code> to the K8s executor, which will request a dedicated pod rather than pushing to a queue."
    },
    {
      nodes: ["tmpl", "exec"], edges: [],
      label: "2 · Build the pod spec",
      what: "The executor starts from a base <code>pod_template_file</code> (image, service account, volumes, resource defaults) and layers the task's per-task <code>executor_config</code> on top.",
      why: "A shared template keeps every task consistent, while per-task overrides let one memory-hungry task request more RAM or a GPU without changing any other task.",
      how: "The base template defines the common pod; <code>executor_config={'pod_override': …}</code> merges task-specific resources, node selectors, or a different image over it before submission.",
      when: "Right before each pod is created, for every task instance.",
      mistake: "Baking per-task resources into the global template, so every trivial task requests 8&nbsp;GB — wasting cluster capacity and slowing scheduling.",
      interview: "“How do you give one heavy task more memory in the K8s executor?” <code>executor_config</code> with a <code>pod_override</code> — per-task, no impact on others.",
      example: "ShopKart's featurization task overrides the template to request 8&nbsp;GB and a GPU node, while its light API pulls use the default 512&nbsp;MB spec."
    },
    {
      nodes: ["exec", "api", "pod"], edges: [["exec", "api"], ["api", "pod"]],
      label: "3 · One pod per task instance",
      what: "The executor calls the <b>Kubernetes API</b> to launch a brand-new pod dedicated to this single task instance — full isolation.",
      why: "One pod per task means no noisy-neighbor contention: each task gets its own container, its own resource limits, and can even run a different image.",
      how: "The API schedules the pod onto a node honoring requests/limits, node selectors, and tolerations. The pod runs exactly one <code>airflow tasks run</code> and then exits.",
      when: "For every task instance the executor launches.",
      mistake: "Running thousands of tiny tasks this way and paying pod-startup latency on each — isolation you don't need at a cost you feel.",
      interview: "The core trade-off question. Per-task pods give isolation and per-task resources; the price is startup latency. Stating both sides is the senior answer.",
      example: "ShopKart's ML feature task gets its own 8&nbsp;GB pod that can't be starved by a simultaneous heavy transform running in a separate pod."
    },
    {
      nodes: ["pod"], edges: [],
      label: "4 · The task runs to completion",
      what: "The pod runs <code>airflow tasks run</code> for exactly one task instance, streaming logs (uploaded to remote storage when it finishes).",
      why: "Because the pod exists only for this task, its lifecycle <i>is</i> the task's lifecycle — start, run, ship logs, terminate — which makes resource accounting clean.",
      how: "Kubernetes schedules the pod onto a suitable node, the container executes the task, and logs stream out; on completion they're pushed to S3/GCS so they outlive the ephemeral pod.",
      when: "For the duration of a single task attempt.",
      mistake: "Forgetting remote logging, so when the pod is deleted its local logs vanish and you can't debug a failure after the fact.",
      interview: "“Where do K8s-executor logs go after the pod dies?” Remote storage — and if you skipped configuring it, they're gone. A practical gotcha interviewers probe.",
      example: "ShopKart's feature pod streams progress logs to S3; after the pod is cleaned up, engineers still read the full run log from the bucket."
    },
    {
      nodes: ["pod", "done", "sched"], edges: [["pod", "done"], ["done", "sched"]],
      label: "5 · Pod terminates, state recorded",
      what: "When the task finishes the pod exits; the executor watches the K8s API for the pod's phase, records the final task state in the metadata DB, and (by default) deletes the pod.",
      why: "Cleaning up finished pods reclaims cluster resources automatically, while recording state to the DB keeps the DAG moving — the pod was ephemeral, the state is durable.",
      how: "The executor observes the pod reaching <code>Succeeded</code>/<code>Failed</code>, writes the task state, and deletes the pod. Failed pods can be kept via <code>delete_worker_pods=False</code>.",
      when: "The moment the pod terminates, for each task.",
      mistake: "Leaving <code>delete_worker_pods=False</code> globally in production, so completed pods pile up and clutter the namespace until quotas are hit.",
      interview: "A nice ops detail: keep failed pods for debugging but delete successful ones. Knowing the exact flag names shows hands-on experience.",
      example: "ShopKart deletes successful feature pods automatically but retains failed ones for a day so on-call can <code>kubectl describe</code> the crash."
    },
    {
      nodes: ["sched", "exec", "api", "tmpl", "pod", "done"], edges: EDGES,
      label: "6 · Trade-offs vs Celery",
      what: "<b>Pros:</b> perfect isolation, per-task resources, no idle workers, native autoscaling. <b>Cons:</b> ~seconds of pod-startup latency per task.",
      why: "Creating infrastructure per task is clean and elastic, but that creation isn't free — for thousands of sub-second tasks, startup overhead dominates total runtime.",
      how: "Use KubernetesExecutor for heavy, spiky, or isolation-sensitive work; use Celery for high volumes of short tasks. The hybrid <b>CeleryKubernetesExecutor</b> routes per task by queue name, getting both.",
      when: "Choose per workload — and reach for the hybrid when you have both profiles in one deployment.",
      mistake: "Picking one executor dogmatically. Running thousands of tiny tasks on K8s (latency), or heavy isolated jobs on shared Celery workers (contention), are both avoidable.",
      interview: "“Celery or Kubernetes executor?” The best answer refuses the false choice: match executor to workload, and mention the hybrid that routes by queue.",
      example: "ShopKart runs light hourly ETL on Celery and routes its handful of GPU/high-memory ML tasks to Kubernetes via the hybrid executor."
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
        detail.innerHTML = AV.Explain.render(s);
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
