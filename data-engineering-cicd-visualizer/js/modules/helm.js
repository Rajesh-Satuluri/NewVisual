/* modules/helm.js — Tier 2 · Helm (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "helm",
    title: "Helm",
    tool: "--tool-helm",
    icon: "⎈",
    eyebrow: "Tier 2 · Data Engineering CI/CD",
    subtitle: "A package manager for Kubernetes — one templated chart that deploys RetailFlow's Airflow workers to dev and prod from the same source, only the values change.",
    mentalImage: "DEPLOYMENT TEMPLATE",

    flowTitle: "A release moving through Helm",
    flow: ["Chart", "values.yaml", "templates/", "helm upgrade --install", "Rendered manifests", "Kubernetes", "Release"],

    why: "Writing raw Kubernetes YAML by hand means copy-pasting near-identical manifests for dev and prod — one hand-edited replica count or wrong image tag and the environments silently drift apart.",
    what: "Helm is the <b>package manager for Kubernetes</b>: a <b>chart</b> bundles templated manifests, and a <b>values file</b> fills in the per-environment blanks to produce a versioned, upgradeable <b>release</b>.",
    how: "<code>helm upgrade --install</code> renders the <code>templates/</code> using <code>values.yaml</code> (overridden by <code>values-prod.yaml</code>), applies the result to the cluster, and records a revision you can <code>rollback</code> to.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "Helm is like a fill-in-the-blank form for Kubernetes. The <b>chart</b> is the form with blanks (<code>{{ .Values.replicas }}</code>); the <b>values file</b> fills the blanks. Same form, different answers per environment." },
        { h: "What's in a chart", body: "<ul><li><b>Chart.yaml</b> — the chart's name and version.</li><li><b>values.yaml</b> — default settings you can override.</li><li><b>templates/</b> — Kubernetes manifests with <code>{{ }}</code> placeholders.</li></ul>" },
        { h: "RetailFlow example", body: "RetailFlow packages its Airflow worker deployment as one chart. Dev gets 1 replica on a small image tag; prod gets 4 replicas — from the <i>same</i> chart, just a different values file." }
      ],
      intermediate: [
        { h: "Install vs upgrade", body: "<code>helm upgrade --install airflow-workers ./chart</code> creates the release if it's missing and upgrades it otherwise — the idempotent one-liner CI runs every deploy. Each run bumps the <b>revision</b> number." },
        { h: "Per-environment values", body: "Keep <code>values.yaml</code> as safe defaults, then layer <code>values-dev.yaml</code> and <code>values-prod.yaml</code> with <code>-f</code>. Only environment differences (replicas, resources, image tag) live in the override — no duplicated manifests." },
        { h: "Rollback", body: "A bad release? <code>helm rollback airflow-workers 3</code> restores revision 3's exact rendered manifests. Helm keeps release history in the cluster, so recovery is one command, not a scramble to reconstruct old YAML." }
      ],
      proficient: [
        { h: "Templating internals", body: "Helm renders Go templates with <code>.Values</code>, <code>.Release</code>, and <code>.Chart</code> objects, plus helpers in <code>_helpers.tpl</code>. <code>helm template</code> renders locally without touching the cluster — wire it into CI to diff and lint manifests before apply." },
        { h: "Values precedence", body: "Later <code>-f</code> files and <code>--set</code> flags override earlier ones over the chart's <code>values.yaml</code>. RetailFlow injects the image digest at deploy time with <code>--set image.tag=$SHA</code> so the promoted build is pinned, not <code>latest</code>." },
        { h: "Trade-offs vs raw YAML / Kustomize", body: "Helm shines for packaging + release lifecycle (versioning, rollback, sharing charts). Kustomize's overlay model avoids templating-language complexity. Heavy <code>{{ }}</code> logic becomes unreadable — keep templates simple and push variation into values." }
      ]
    },

    micro: ["chart", "Chart.yaml", "values.yaml", "templates/", "release", "revision", "values override",
      "helm template", "helm install", "helm upgrade --install", "helm rollback", "_helpers.tpl",
      "values-dev.yaml", "values-prod.yaml", "--set", "helm lint", "helm repo"],

    before: ["hand-edited YAML per env", "copy-paste drift", "wrong replica count", "no version history", "rollback = guesswork"],
    after: ["one templated chart", "values per environment", "versioned releases", "one-command upgrade", "one-command rollback"],

    failure: {
      title: "Prod values missing — dev config leaks to production",
      steps: ["Deploy chart", "forgot -f values-prod.yaml", "defaults to 1 replica", "prod Airflow overwhelmed", "revenue pipeline queues back up"],
      explain: "The deploy applied <code>values.yaml</code> defaults (dev-sized) to prod because the prod override file was never passed. Making <code>-f values-prod.yaml</code> a required, checked-in CI argument — and <code>helm template</code> diffing the result — catches the mismatch <b>before</b> apply."
    },

    whenNot: "Don't reach for Helm to deploy a <b>single trivial manifest</b> you never re-parameterize — plain <code>kubectl apply</code> or Kustomize is simpler. And don't bury business logic in template conditionals; if a chart needs dozens of <code>{{ if }}</code> branches, the variation belongs in values or separate charts.",

    story: {
      situation: "RetailFlow runs Airflow on Kubernetes and needs the same worker deployment in dev and prod, sized differently.",
      problem: "Hand-maintaining two sets of Kubernetes manifests caused drift — dev and prod quietly diverged on image tags and resources.",
      decision: "The team packages the workers as one Helm chart with <code>values-dev.yaml</code> and <code>values-prod.yaml</code>, deployed via <code>helm upgrade --install</code>.",
      tool: "Helm charts + per-environment values.",
      result: "One reviewed chart, two value files. Promotion is a values swap, and a bad release rolls back with <code>helm rollback</code> in seconds.",
      remember: "The chart is the same everywhere; only the values change between environments."
    },

    code: [
      {
        title: "values-prod.yaml — production overrides for the Airflow workers",
        lang: "yaml",
        code: "# values-prod.yaml (overrides values.yaml defaults)\n" +
              "replicaCount: 4\n" +
              "image:\n" +
              "  repository: ghcr.io/retailflow/airflow-worker\n" +
              "  tag: \"2.9.1\"          # pinned, never 'latest'\n" +
              "resources:\n" +
              "  requests:\n" +
              "    cpu: \"1\"\n" +
              "    memory: 2Gi\n" +
              "env:\n" +
              "  AIRFLOW__CELERY__WORKER_CONCURRENCY: \"16\"",
        highlights: [2, 5]
      },
      {
        title: "Deploy prod from the same chart in CI",
        lang: "bash",
        code: "helm upgrade --install airflow-workers ./charts/airflow-worker \\\n" +
              "  --namespace airflow --create-namespace \\\n" +
              "  -f values.yaml \\\n" +
              "  -f values-prod.yaml \\\n" +
              "  --set image.tag=$GIT_SHA\n" +
              "# roll back the last release if the smoke test fails\n" +
              "# helm rollback airflow-workers 0",
        highlights: [4, 5]
      }
    ],

    remember: "One chart, many values files — Helm templates the manifests once and fills the environment-specific blanks, with versioned releases you can roll back in a single command.",

    retention: {
      question: "RetailFlow needs the same Airflow worker deployment in dev (1 replica) and prod (4 replicas) without maintaining two copies of the YAML. How does Helm solve this?",
      answer: "One <b>chart</b> holds templated manifests (<code>templates/</code>) with <code>{{ .Values.* }}</code> placeholders; <code>values-dev.yaml</code> and <code>values-prod.yaml</code> fill them per environment. <code>helm upgrade --install</code> renders and applies the right values, and <code>helm rollback</code> reverts a bad release."
    }
  }));
})();
