/* modules/kubernetes.js — Tier 2 · Kubernetes for Data Engineers (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "kubernetes",
    title: "Kubernetes",
    tool: "--tool-kubernetes",
    icon: "☸️",
    eyebrow: "Tier 2 · Data Engineering CI/CD",
    subtitle: "The system that runs and keeps RetailFlow's containerized data-processing service alive — restarting it, scaling it, and capping its resources without a human watching.",
    mentalImage: "CONTAINER ORCHESTRATOR",

    flowTitle: "How your container becomes a running, healthy service",
    flow: ["Docker image", "kubectl apply", "Deployment", "scheduler picks node", "pods start", "probes pass", "Service routes traffic"],

    why: "RetailFlow ran its revenue-processing service on one VM. When the process crashed at 3 AM, nothing restarted it; when order volume spiked, nothing scaled it — and the 7 AM dashboard was late.",
    what: "Kubernetes is a <b>container orchestrator</b>: you declare the desired state (2 healthy copies of this container, with these limits) and it continuously makes reality match — restarting, rescheduling, and scaling.",
    how: "You submit YAML describing a <b>Deployment</b>. Kubernetes places <b>pods</b> on <b>nodes</b>, health-checks them with probes, and a <b>Service</b> gives them one stable address — self-healing without a human.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "You hand Kubernetes a container and say 'keep 2 healthy copies running'. It does — restarting crashes, replacing dead ones, moving them if a machine fails. You describe the goal; it maintains it." },
        { h: "The words you'll hear", body: "<ul><li><b>Cluster</b> — the whole pool of machines.</li><li><b>Node</b> — one machine in it.</li><li><b>Pod</b> — the smallest unit; wraps your container.</li><li><b>Deployment</b> — 'keep N pods of this running'.</li></ul>" },
        { h: "RetailFlow example", body: "The revenue-processing service is packaged as a Docker image. A Deployment runs 2 <b>replicas</b> so if one pod dies, the other keeps serving while Kubernetes starts a replacement." }
      ],
      intermediate: [
        { h: "Config, secrets & storage", body: "Keep settings out of the image: a <b>ConfigMap</b> holds non-secret config (batch size, log level); a <b>Secret</b> holds the warehouse password; a <b>Volume</b> attaches storage. A <b>Namespace</b> isolates RetailFlow's data services from other teams' workloads." },
        { h: "Resources & health probes", body: "<b>Requests</b> reserve CPU/memory so the scheduler can place the pod; <b>limits</b> cap it so one job can't starve the node. A <b>liveness</b> probe restarts a hung pod; a <b>readiness</b> probe holds traffic until the pod is actually ready to serve." },
        { h: "Services & rolling deploys", body: "Pods come and go with changing IPs, so a <b>Service</b> gives a stable name/address and load-balances across the replicas. Updating the image triggers a <b>rolling deployment</b>: new pods come up and pass readiness before old ones are removed — no downtime." }
      ],
      proficient: [
        { h: "Jobs, CronJobs & autoscaling", body: "For batch work use a <b>Job</b> (run to completion) or <b>CronJob</b> (scheduled) instead of a Deployment — perfect for a nightly transform. The <b>HorizontalPodAutoscaler</b> adds replicas when CPU/queue depth rises and removes them when it falls, so cost tracks load." },
        { h: "Why limits matter for data workloads", body: "Data jobs are memory-hungry and spiky. Without <code>limits</code>, one greedy pod triggers an OOM kill of its neighbors; without <code>requests</code>, the scheduler overpacks a node. Right-sizing requests/limits is the single biggest reliability lever for data services on k8s." },
        { h: "Interview angle", body: "Senior signal: know that Kubernetes reconciles <i>desired vs actual</i> state continuously; that a pod is ephemeral (never store state in it — use a Volume or external store); and that readiness vs liveness, requests vs limits, and Job vs Deployment are the choices that keep a data service healthy." }
      ]
    },

    micro: ["cluster", "node", "pod", "container", "deployment", "replica", "ReplicaSet", "service", "namespace",
      "configmap", "secret", "volume", "resource requests", "resource limits", "liveness probe", "readiness probe",
      "rolling deployment", "job", "cronjob", "HorizontalPodAutoscaler", "kubectl"],

    before: ["one VM, no restart on crash", "manual scaling", "3 AM outage unnoticed", "config baked in image", "downtime on every deploy"],
    after: ["self-healing pods", "declared replica count", "auto-restart + reschedule", "config/secrets injected", "zero-downtime rolling deploys"],

    failure: {
      title: "A memory-hungry pod with no limits",
      steps: ["deploy processor, no resource limits", "order spike, memory balloons", "pod consumes the whole node", "neighbor pods OOM-killed", "revenue service goes down"],
      explain: "The processing pod shipped without <code>resources.limits</code>. Under a spike it consumed all of a node's memory and Kubernetes OOM-killed the pods sharing that node. Setting <b>requests and limits</b> caps each pod so a spike scales out (via the autoscaler) instead of taking neighbors down — the fix is declaring the resource envelope, which is exactly what CI should enforce before a manifest ships."
    },

    whenNot: "Don't adopt Kubernetes just because it's popular. It brings real operational weight — YAML, networking, upgrades, on-call. If your workload is a handful of scheduled batch jobs, a managed service (Airflow, a serverless container, a warehouse job) is simpler and cheaper. Reach for k8s when you genuinely need self-healing, scaling, and many long-running services — not for a nightly script.",

    story: {
      situation: "RetailFlow's revenue-processing service must stay up through the day and survive traffic spikes as orders stream in.",
      problem: "On a single VM it had no restart-on-crash and no way to scale, so an overnight crash or a spike made the 7 AM dashboard late.",
      decision: "The team containerizes the service and writes a Deployment: 2 replicas, a ConfigMap for batch settings, a Secret for the warehouse credential, and CPU/memory requests + limits with liveness/readiness probes.",
      tool: "Kubernetes Deployment + Service + HPA.",
      result: "Crashed pods are restarted automatically, the Service load-balances across replicas, rolling updates deploy with no downtime, and the autoscaler adds pods under load — the pipeline stays healthy on its own.",
      remember: "You declare the desired state; Kubernetes keeps reality matching it — capped, health-checked, and self-healing."
    },

    code: [{
      title: "deployment.yaml — the RetailFlow processor, 2 replicas with limits",
      lang: "yaml",
      code: "apiVersion: apps/v1\n" +
            "kind: Deployment\n" +
            "metadata:\n" +
            "  name: retailflow-processor\n" +
            "  namespace: data-services\n" +
            "spec:\n" +
            "  replicas: 2\n" +
            "  selector:\n" +
            "    matchLabels: { app: retailflow-processor }\n" +
            "  template:\n" +
            "    metadata:\n" +
            "      labels: { app: retailflow-processor }\n" +
            "    spec:\n" +
            "      containers:\n" +
            "        - name: processor\n" +
            "          image: registry.internal/retailflow-processor:1.4.0\n" +
            "          envFrom:\n" +
            "            - configMapRef: { name: processor-config }\n" +
            "            - secretRef: { name: warehouse-credentials }\n" +
            "          resources:\n" +
            "            requests: { cpu: '500m', memory: '512Mi' }\n" +
            "            limits:   { cpu: '1',    memory: '1Gi' }\n" +
            "          readinessProbe:\n" +
            "            httpGet: { path: /healthz, port: 8080 }\n" +
            "            initialDelaySeconds: 5\n" +
            "          livenessProbe:\n" +
            "            httpGet: { path: /healthz, port: 8080 }\n" +
            "            periodSeconds: 15",
      highlights: [7, 20, 21, 22]
    }],

    remember: "Kubernetes is a container orchestrator: declare 'keep N healthy, resource-capped copies running' and it self-heals, load-balances, rolls out, and scales — no human at 3 AM.",

    retention: {
      question: "RetailFlow's processing pod once ate a whole node's memory and OOM-killed its neighbors. Which two settings prevent this, and what does each do?",
      answer: "<b>Resource requests</b> (reserve CPU/memory so the scheduler places the pod correctly) and <b>limits</b> (cap what the pod can consume so it can't starve neighbors). Together they give each pod a bounded, schedulable envelope."
    },

    prerequisites: [
      "docker",
      "container-registry",
      { id: "deployment-strategies", label: "Deployment strategies (rolling updates)" },
      "secrets"
    ],

    production: [
      { h: "Always set requests and limits", body: "Every data pod needs CPU/memory <b>requests</b> (for scheduling) and <b>limits</b> (to cap it) — without them one greedy RetailFlow processor can OOM-kill its node neighbors. Enforce this in CI before a manifest ships." },
      { h: "Liveness vs readiness probes", body: "A <b>readiness</b> probe holds traffic until the pod can serve; a <b>liveness</b> probe restarts a hung pod. Misusing liveness as readiness causes needless restart loops under load." },
      { h: "Secrets and config outside the image", body: "Mount the warehouse credential from a <b>Secret</b> and batch settings from a <b>ConfigMap</b>; never bake them into the image. Pair with RBAC so only the right service accounts read them." },
      { h: "Pods are ephemeral — externalize state", body: "A pod can be killed and rescheduled anytime; never store the revenue checkpoint in the pod's filesystem — use a Volume or external store so restarts don't lose data." },
      { h: "Autoscale and pin images by digest", body: "An HPA scales replicas to load so cost tracks demand; pin the container image by <code>@sha256</code> digest so a rescheduled pod can't pull different bytes." }
    ],

    misconceptions: [
      { myth: "A pod and a container are the same thing.", truth: "A <b>pod</b> is the smallest schedulable unit and can hold one or more containers sharing network/storage. Usually one app container, but the pod — not the container — is what Kubernetes schedules and reschedules." },
      { myth: "Setting a memory <b>limit</b> alone is enough.", truth: "Without a <b>request</b>, the scheduler can overpack a node; the request reserves capacity. Limit caps usage, request guarantees placement — you need both for data workloads." },
      { myth: "Data written inside a pod persists.", truth: "A pod's filesystem is ephemeral — it's gone when the pod is rescheduled or restarted. Durable state needs a <b>PersistentVolume</b> or an external store." },
      { myth: "A liveness probe failing just means 'not ready yet'.", truth: "A failed <b>liveness</b> probe <b>restarts</b> the container. Use <b>readiness</b> for 'not ready to serve' — confusing the two causes restart loops during slow startup or heavy load." }
    ],

    troubleshooting: [
      { symptom: "Pod stuck in <code>CrashLoopBackOff</code>.", cause: "The container exits/crashes on startup repeatedly (bad config, missing secret, failing liveness probe).", fix: "<code>kubectl logs --previous</code> and <code>kubectl describe pod</code> to find the exit reason; fix config/probe, redeploy, confirm the pod reaches <code>Running</code>/<code>Ready</code>." },
      { symptom: "Pod killed with reason <code>OOMKilled</code>.", cause: "The process exceeded its memory limit (or a spike with no limit starved the node).", fix: "Raise the memory limit to the real working set or shard the job, and set requests; verify with <code>kubectl top pod</code> that usage stays under the limit." },
      { symptom: "<code>ImagePullBackOff</code>.", cause: "Wrong image reference or missing registry pull secret.", fix: "Verify the digest/tag exists and attach a valid <code>imagePullSecret</code>; confirm the pod pulls and starts." },
      { symptom: "Pod is <code>Pending</code> and never schedules.", cause: "No node has enough free CPU/memory to satisfy the requests (or a taint/affinity blocks it).", fix: "Lower requests, add capacity, or fix node selectors/tolerations; <code>kubectl describe pod</code> shows the exact scheduling reason, then confirm it schedules." },
      { symptom: "Rolling update stalls, new pods never become ready.", cause: "Readiness probe failing on the new image (bad healthcheck path/port or startup too slow).", fix: "Fix the probe path/port or add <code>initialDelaySeconds</code>/startup probe; verify the rollout completes with <code>kubectl rollout status</code>." }
    ],

    interview: [
      { q: "Explain requests vs limits and why both matter for data workloads.", a: "<b>Requests</b> reserve CPU/memory so the scheduler places the pod on a node with capacity; <b>limits</b> cap consumption so a spiky, memory-hungry data job can't starve or OOM-kill neighbors. Without requests the scheduler overpacks; without limits one pod takes down the node — both together are the biggest reliability lever on k8s." },
      { q: "Liveness vs readiness probe — when does each fire?", a: "A <b>readiness</b> probe failing removes the pod from the Service's endpoints (no traffic) but leaves it running — used during startup or temporary overload. A <b>liveness</b> probe failing <b>restarts</b> the container — used for a hung/deadlocked process. Confusing them causes restart loops or traffic to unready pods." },
      { q: "Your processing pod is in CrashLoopBackOff — walk through debugging.", a: "Check <code>kubectl describe pod</code> for the reason and events, then <code>kubectl logs --previous</code> for the crashed container's output. Common causes: missing Secret/ConfigMap, bad image, failing liveness probe, or OOMKilled. Fix the root cause, redeploy, and confirm the pod reaches Ready." },
      { q: "When is Kubernetes the wrong tool for a data team?", a: "When the workload is a handful of scheduled batch jobs, k8s brings YAML, networking, upgrades, and on-call overhead that a managed Airflow, serverless container, or warehouse job avoids. Reach for k8s when you genuinely need self-healing, autoscaling, and many long-running services — not for a nightly script." }
    ],

    related: ["docker", "helm", "container-registry", "argo-cd"]
  }));
})();
