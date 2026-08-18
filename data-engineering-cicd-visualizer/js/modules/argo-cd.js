/* modules/argo-cd.js — Tier 3 · Argo CD (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "argo-cd",
    title: "Argo CD",
    tool: "--tool-argocd",
    icon: "🐙",
    eyebrow: "Tier 3 · GitOps for Kubernetes",
    subtitle: "GitOps for Kubernetes: RetailFlow declares what its k8s data workloads should look like in Git, and Argo CD continuously makes the cluster match — reverting any drift automatically.",
    mentalImage: "GIT = DESIRED PRODUCTION STATE",

    flowTitle: "How Argo CD keeps the cluster in sync",
    flow: ["Git (desired state)", "Argo CD", "Compare", "Kubernetes", "Actual state", "Reconcile / Sync"],

    why: "Deploying to Kubernetes by running <code>kubectl apply</code> from laptops means the live cluster and the repo silently diverge — no one can answer 'what is <i>actually</i> running in prod, and does it match what we reviewed?'",
    what: "Argo CD is a <b>GitOps controller</b>: Git holds the <b>desired state</b> (Kubernetes manifests), Argo CD watches the cluster's <b>actual state</b>, and continuously <b>reconciles</b> the two so the cluster always matches the reviewed Git commit.",
    how: "You define an <b>Application</b> pointing at a Git path. Argo CD compares desired (Git) vs actual (cluster), reports <b>Synced/OutOfSync</b> and <b>Healthy/Degraded</b>, and — depending on the <b>sync policy</b> — applies changes automatically or on demand, correcting drift.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "Git becomes the single source of truth for what should run in Kubernetes. Argo CD is a robot that constantly checks the cluster against Git and fixes any difference." },
        { h: "Desired vs actual", body: "<ul><li><b>Desired state</b> — the Kubernetes YAML in your Git repo (what you <i>want</i>).</li><li><b>Actual state</b> — what's really running in the cluster right now.</li><li><b>Reconciliation</b> — Argo CD closing the gap between them.</li></ul>" },
        { h: "RetailFlow example", body: "RetailFlow's revenue-processor runs as a Kubernetes job. Its manifests live in Git. When the net-revenue fix merges, Argo CD sees Git changed, syncs the cluster, and the new version rolls out — no one runs <code>kubectl</code> by hand." }
      ],
      intermediate: [
        { h: "Drift & self-heal", body: "If someone hot-fixes the live cluster with <code>kubectl edit</code>, the cluster now differs from Git — that's <b>drift</b>. Argo CD marks the Application <b>OutOfSync</b>; with <b>self-heal</b> enabled it reverts the manual change back to the Git-declared state." },
        { h: "Sync policies", body: "<b>Manual sync</b> requires a human to click Sync (safe, gated). <b>Automated sync</b> applies on every Git change; add <code>prune: true</code> to delete resources removed from Git and <code>selfHeal: true</code> to undo out-of-band edits. Health checks report Healthy/Progressing/Degraded per resource." },
        { h: "Rollback = git revert", body: "Because Git is the source of truth, rolling back is a <b>git revert</b> to the previous good commit — Argo CD reconciles the cluster back. Argo CD also keeps deployment history so you can roll back to a prior synced revision from the UI." }
      ],
      proficient: [
        { h: "Applications & app-of-apps", body: "An <b>Application</b> is a CRD mapping a Git path to a cluster/namespace. The <b>app-of-apps</b> pattern uses one parent Application whose Git path contains child Application manifests — so a single repo bootstraps and manages dozens of workloads (ingestion, transform, serving) declaratively." },
        { h: "Reconciliation internals", body: "Argo CD renders manifests (plain YAML, Helm, or Kustomize), diffs the rendered desired state against the live cluster objects, and reports the delta. The controller reconciles on a polling interval and on webhook events, applying changes when policy allows. Health is computed from resource-specific checks (e.g. a Deployment is Healthy when replicas are available)." },
        { h: "Security & trade-offs", body: "GitOps means the cluster pulls from Git rather than CI pushing credentials in — cluster access stays inside the cluster. Git becomes the audit log and access-control point. The cost: it only pays off <b>when Kubernetes is your platform</b> — Argo CD manages k8s objects, not bare VMs or serverless functions." }
      ]
    },

    micro: ["desired state", "actual state", "reconciliation", "sync", "OutOfSync", "drift", "self-heal", "prune",
      "rollback", "Application (CRD)", "app-of-apps", "sync policy", "health check", "Kustomize", "Helm source", "GitOps"],

    before: ["kubectl apply from laptops", "cluster drifts from repo", "no source of truth", "manual rollbacks", "'what is actually running?'"],
    after: ["Git = desired state", "auto-reconcile", "drift reverted", "rollback = git revert", "cluster always matches review"],

    failure: {
      title: "Manual hotfix drifts the cluster",
      steps: ["On-call runs kubectl edit", "cluster now differs from Git", "next deploy overwrites or clashes", "revenue job config lost", "silent inconsistency"],
      explain: "With Argo CD's <b>self-heal</b>, the out-of-band <code>kubectl edit</code> is detected as <b>drift</b> and reverted to the Git-declared state — so the reviewed configuration in Git always wins, and nothing survives that wasn't committed."
    },

    whenNot: "Don't introduce Argo CD unless <b>Kubernetes and GitOps are actually part of your platform</b>. It reconciles k8s objects — if RetailFlow's data workloads run on managed services, serverless, or plain VMs, Argo CD has nothing to manage and only adds a cluster, a CRD model, and operational overhead you don't need.",

    story: {
      situation: "RetailFlow runs its revenue-processing data workloads on Kubernetes, and hand-deploys via kubectl have caused prod to quietly diverge from the reviewed manifests.",
      problem: "No one can prove what's actually running matches what was approved, and manual hotfixes vanish on the next deploy.",
      decision: "The team declares every k8s workload in Git and points an Argo CD <b>Application</b> at it with automated sync + self-heal.",
      tool: "Argo CD (GitOps controller).",
      result: "Git is now the desired state; Argo CD reconciles drift automatically, rollbacks are a git revert, and prod provably matches the reviewed commit.",
      remember: "In GitOps, Git is the desired production state — Argo CD's whole job is to make the cluster match it, forever."
    },

    code: [{
      title: "Argo CD Application — declare desired state + auto-sync",
      lang: "yaml",
      code: "apiVersion: argoproj.io/v1alpha1\n" +
            "kind: Application\n" +
            "metadata:\n" +
            "  name: revenue-pipeline\n" +
            "  namespace: argocd\n" +
            "spec:\n" +
            "  project: default\n" +
            "  source:\n" +
            "    repoURL: https://github.com/retailflow/k8s-workloads.git\n" +
            "    targetRevision: main\n" +
            "    path: revenue-pipeline/overlays/prod\n" +
            "  destination:\n" +
            "    server: https://kubernetes.default.svc\n" +
            "    namespace: revenue\n" +
            "  syncPolicy:\n" +
            "    automated:\n" +
            "      prune: true      # delete resources removed from Git\n" +
            "      selfHeal: true   # revert manual drift back to Git",
      highlights: [11, 17, 18, 19]
    }],

    remember: "Git = desired production state; Argo CD continuously reconciles Kubernetes to match it — drift gets reverted, rollback is a git revert.",

    retention: {
      question: "Someone runs <code>kubectl edit</code> on RetailFlow's prod cluster, changing the revenue job. With Argo CD self-heal on, what happens?",
      answer: "Argo CD detects the cluster no longer matches Git (<b>drift</b>, Application goes <b>OutOfSync</b>) and <b>reverts the manual change</b> back to the Git-declared desired state. Git remains the source of truth."
    }
  }));
})();
