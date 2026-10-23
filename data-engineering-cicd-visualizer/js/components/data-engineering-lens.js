/* ============================================================
   data-engineering-lens.js — the recurring RetailFlow example
   Appended below every concept module by the router, so the same
   RetailFlow "Daily Revenue Pipeline" illustrates each CI/CD
   concept in one continuous business story (prompt §27).
   DECICDViz.BusinessLens.append(container, moduleId)

   Keys cover every concept module; an id with no entry appends
   nothing (safe no-op), which is correct for the custom modules
   (home, interview, quiz, etc.) that aren't single concepts.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  // Each entry ties one CI/CD concept to a concrete step in getting
  // RetailFlow's revenue change safely from a laptop to production.
  // Keys are module route ids.
  var DATA = {
    git: {
      artifact: "feature/fix-net-revenue", system: "Local + GitHub repo",
      meaning: "Isolate a risky change from production code.",
      point: "RetailFlow's nightly revenue pipeline already runs every night. To change the net-revenue formula, an engineer cuts a <code>feature/fix-net-revenue</code> branch instead of editing production directly — a safe parallel workspace where the change can be tested before it ever reaches <code>main</code>."
    },
    github: {
      artifact: "Pull Request #482", system: "GitHub",
      meaning: "Let a second engineer review before merge.",
      point: "The revenue fix opens as a Pull Request so a teammate reviews the diff, required CI checks run, and branch protection blocks a merge until both pass — no single person can push a revenue change straight into RetailFlow production."
    },
    "github-actions": {
      artifact: ".github/workflows/ci.yml", system: "GitHub Actions runner",
      meaning: "Validate the change automatically on every push.",
      point: "The moment the branch is pushed, RetailFlow's CI workflow runs lint → pytest → dbt tests → docker build on a fresh runner. The revenue change is proven safe by machines on every commit, not by someone remembering to test locally."
    },
    terraform: {
      artifact: "azurerm_databricks_workspace", system: "Azure / Databricks",
      meaning: "Change infrastructure through reviewed code.",
      point: "When the fix needs a bigger Databricks cluster, RetailFlow doesn't click in the portal — a Terraform change runs <code>plan</code> in the PR so engineers see exactly which resources change and approve before <code>apply</code> touches production infrastructure."
    },
    docker: {
      artifact: "retailflow/processor:sha-9f2c", system: "Container Registry",
      meaning: "Package the code so it runs identically everywhere.",
      point: "RetailFlow packages its PySpark processing job into an immutable image tagged by commit SHA. The exact image that passed CI is the one promoted to production — 'works on my laptop' can't happen because every environment runs the same packaged software."
    },
    "ci-vs-cd": {
      artifact: "PR #482 → staging → prod", system: "GitHub Actions pipeline",
      meaning: "Separate 'is it correct?' from 'ship it'.",
      point: "For RetailFlow, CI proves the net-revenue change is correct (lint, pytest, dbt tests on every push); CD takes that one validated artifact and promotes it to staging automatically, then to prod behind an approval. Different jobs, different failure meanings."
    },
    branching: {
      artifact: "feature/fix-net-revenue", system: "Git",
      meaning: "Isolate risky work from the nightly run.",
      point: "RetailFlow cuts a short-lived branch for the fix; the nightly revenue pipeline keeps running off <code>main</code> untouched until the change is reviewed, tested, and merged."
    },
    "azure-devops": {
      artifact: "azure-pipelines.yml", system: "Azure DevOps",
      meaning: "The same flow in a Microsoft-native suite.",
      point: "A RetailFlow sister team on Azure runs the identical revenue flow as a multi-stage YAML pipeline — stages, variable groups, service connections, and environment approvals map one-to-one onto the GitHub Actions version."
    },
    jenkins: {
      artifact: "Jenkinsfile", system: "Jenkins controller + agents",
      meaning: "Self-hosted CI that reaches private systems.",
      point: "Where RetailFlow needs a runner inside its private VPC to reach the warehouse, a Jenkins declarative pipeline runs the same stages — at the cost of maintaining the controller, agents, and plugins themselves."
    },
    "container-registry": {
      artifact: "revenue-pipeline@sha256:…", system: "Container Registry (ACR/ECR/GHCR)",
      meaning: "One image, pulled identically everywhere.",
      point: "CI pushes RetailFlow's revenue image once; every environment pulls the same image by immutable digest. Pinning by digest (not <code>latest</code>) guarantees prod runs the exact bytes that passed CI."
    },
    "artifact-lifecycle": {
      artifact: "revenue-pipeline:sha-abc123", system: "CI → registry → environments",
      meaning: "Build once, promote the same thing.",
      point: "RetailFlow builds the revenue artifact a single time and promotes that identical artifact dev → staging → prod, swapping only config and secrets — so nothing untested can appear in production."
    },
    "databricks-bundles": {
      artifact: "databricks.yml (target: prod)", system: "Databricks Asset Bundles",
      meaning: "Promote the revenue job across workspaces.",
      point: "RetailFlow defines the revenue job once in a bundle and deploys it with <code>databricks bundle deploy -t prod</code>; the target swaps workspace, cluster, and schedule so dev/staging/prod stay consistent and version-controlled."
    },
    "dbt-cicd": {
      artifact: "models/daily_revenue.sql", system: "dbt + warehouse",
      meaning: "Transform data with tests and lineage.",
      point: "The net-revenue logic lives in a dbt model with a uniqueness test on <code>order_id</code>; Slim CI builds only the changed model and its downstream on each PR, and a failing test blocks promotion when the pipeline enforces it as a gate."
    },
    pytest: {
      artifact: "tests/test_net_revenue.py", system: "pytest in CI",
      meaning: "Prove the Python/PySpark logic is correct.",
      point: "RetailFlow's own unit test asserts <code>net_revenue(100,20)==80</code>; the sign-flip bug (gross + refund) fails that assertion on push, turning the required check red before the change can merge."
    },
    "sql-testing": {
      artifact: "not_null · unique · relationships", system: "dbt/SQL assertions",
      meaning: "Assert business rules on the data itself.",
      point: "Beyond 'the job ran', RetailFlow asserts every order maps to one customer and <code>net_revenue</code> is never negative — data-correctness checks that catch silently-wrong numbers a green pipeline would miss."
    },
    "testing-pyramid": {
      artifact: "unit → integration → e2e", system: "CI test stages",
      meaning: "Fast cheap tests first, few slow ones last.",
      point: "RetailFlow runs many fast unit tests on the revenue functions, fewer integration tests against a seeded schema, and a small end-to-end run — so feedback stays quick while still covering the whole path."
    },
    "airflow-cicd": {
      artifact: "dags/daily_revenue.py", system: "Airflow scheduler",
      meaning: "Validate and deploy DAGs; separate from running them.",
      point: "CI runs a DagBag import test so a parse error can't halt RetailFlow's scheduler; deploying the DAG code is distinct from the nightly execution that actually computes revenue."
    },
    kubernetes: {
      artifact: "Deployment: revenue-processor", system: "Kubernetes cluster",
      meaning: "Run containers at scale with self-healing.",
      point: "RetailFlow runs elastic PySpark workers as a Deployment with resource limits and probes; when a new image needs more memory, the right fix is raising <code>resources.limits.memory</code>, not restarting blindly."
    },
    helm: {
      artifact: "airflow chart release", system: "Helm + Kubernetes",
      meaning: "Templated, versioned, rollback-able deploys.",
      point: "RetailFlow installs Airflow as a Helm release; a bad upgrade is undone with <code>helm rollback</code> to the previous revision, because Helm tracks each release's resolved manifests."
    },
    "argo-cd": {
      artifact: "Git repo of k8s manifests", system: "Argo CD (GitOps)",
      meaning: "Cluster is continuously reconciled to Git.",
      point: "RetailFlow's Airflow manifests live in Git; Argo CD pulls the cluster to match <code>main</code>, so a manual <code>kubectl edit</code> is reverted on the next sync — Git is the single source of truth."
    },
    secrets: {
      artifact: "WAREHOUSE_PASSWORD (Key Vault)", system: "Vault + OIDC",
      meaning: "Keep credentials out of code and logs.",
      point: "RetailFlow's warehouse credential lives in a vault and is injected at runtime, never baked into the image or committed; CI authenticates to the cloud via OIDC so there's no long-lived key to leak."
    },
    security: {
      artifact: "scoped deploy identity", system: "RBAC + OIDC + SHA-pinned actions",
      meaning: "A pipeline holds the keys to everything.",
      point: "RetailFlow scopes its deploy identity to just the revenue job (not customer PII), pins third-party actions by commit SHA, and uses ephemeral runners — because a compromised workflow could otherwise reach all of production."
    },
    sonarqube: {
      artifact: "Sonar quality gate", system: "SonarQube in CI",
      meaning: "Static analysis gate for bugs and coverage.",
      point: "RetailFlow's PR fails Sonar's gate when the new transform code drops below the coverage threshold or introduces a vulnerability — catching maintainability issues automated tests alone miss."
    },
    "data-quality": {
      artifact: "freshness + anomaly checks", system: "Great Expectations / Soda",
      meaning: "Validate the data, not just the job.",
      point: "After deploy, RetailFlow checks that <code>net_revenue</code> is within a sane band versus yesterday and that the orders feed is fresh — a green job that produced wrong numbers still fails the gate."
    },
    "deployment-strategies": {
      artifact: "green revenue schema", system: "Warehouse views",
      meaning: "Cut over safely on a shared warehouse.",
      point: "RetailFlow builds the new revenue logic into a green schema, compares its totals to blue, then atomically repoints the dashboard view — a schema-level blue/green, since the warehouse is shared."
    },
    rollback: {
      artifact: "v42 image + repaired partition", system: "Registry + warehouse",
      meaning: "Code rollback ≠ data rollback.",
      point: "When v43 writes bad revenue, RetailFlow redeploys v42 by digest to fix the logic — but the wrong rows already written must be separately reprocessed from immutable bronze; reverting code alone doesn't correct them."
    },
    observability: {
      artifact: "DORA + data SLAs", system: "Metrics + alerting",
      meaning: "Watch delivery and data correctness.",
      point: "RetailFlow tracks deploy frequency, lead time, change-fail rate, and MTTR, plus revenue freshness and anomaly bands — so it's alerted when the 7 AM number is late or implausible, not just when a job errors."
    },
    "environment-promotion": {
      artifact: "dev → staging → prod", system: "Immutable artifact + per-env config",
      meaning: "The same artifact moves up the stages.",
      point: "RetailFlow promotes one revenue artifact through three identically-shaped environments, injecting environment-specific config and secrets at each stage and gating each promotion on tests, data quality, and approvals."
    }
  };

  function row(k, v, mono) {
    return '<div class="lens-row"><span class="lens-k">' + k + "</span>" +
      (mono ? '<code class="lens-v-mono">' + v + "</code>" : '<span class="lens-v">' + v + "</span>") +
      "</div>";
  }

  function create(id) {
    var d = DATA[id];
    if (!d) return null;
    var sec = document.createElement("section");
    sec.className = "section lens-section animate-fade-in";
    sec.innerHTML =
      '<div class="lens-card">' +
        '<div class="lens-head">' +
          '<span class="lens-badge">🏬 How this appears at RetailFlow</span>' +
          '<span class="lens-head-title">One change to the revenue pipeline, seen through this concept</span>' +
        "</div>" +
        '<div class="lens-grid">' +
          '<div class="lens-meta">' +
            row("Artifact", d.artifact, true) +
            row("Business meaning", d.meaning, false) +
            row("System", d.system, false) +
          "</div>" +
          '<div class="lens-point">' +
            "<p>" + d.point + "</p>" +
            '<a class="lens-link" href="#business-scenario">See the full laptop → 7 AM dashboard journey →</a>' +
          "</div>" +
        "</div>" +
      "</div>";
    return sec;
  }

  function append(container, id) {
    if (!container) return;
    var el = create(id);
    if (el) container.appendChild(el);
  }

  var api = { create: create, append: append, has: function (id) { return !!DATA[id]; } };
  // Router calls NS.BusinessLens.append(...); keep that hook name, and
  // expose a semantic alias too.
  NS.BusinessLens = api;
  NS.DataEngLens = api;
})();
