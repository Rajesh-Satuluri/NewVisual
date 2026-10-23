/* ============================================================
   retailflow-data.js — the recurring RetailFlow business story
   Single source of truth for the fictional org and its "Daily
   Revenue Pipeline", reused by every module, the lens, the home
   dashboard, and the search index.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.RetailFlow = {
    org: {
      name: "RetailFlow",
      blurb: "A fictional global e-commerce & supply-chain company: 800+ stores, a large online platform, multi-region warehouses.",
      stack: ["Python", "PySpark", "SQL", "Databricks", "Airflow", "dbt", "Azure/AWS", "GitHub", "Terraform", "Docker", "Kubernetes"],
      teams: ["Revenue & Finance Data", "Inventory & Supply Chain", "Marketing Analytics", "Platform / DataOps"]
    },

    // The flagship scenario every module connects to.
    scenario: {
      title: "RetailFlow's Daily Revenue Pipeline",
      deadline: "7:00 AM executive dashboard",
      medallion: ["Sources", "Ingestion", "Bronze", "PySpark", "Silver", "dbt", "Gold", "BI Dashboard"],
      sources: ["E-commerce DB", "Payments API", "Inventory DB", "Product DB", "Marketing API"],
      // The change that drives the story: fixing net-revenue.
      change: "net_revenue = gross_revenue - refund_amount",
      bug: "A developer wrote gross_revenue + refund_amount, inflating revenue; CI's unit test catches the sign flip before merge.",
      pr: "PR #482 — Fix net revenue: subtract refunds, not add",
      branch: "feature/fix-net-revenue",
      imageTag: "revenue-pipeline:sha-abc123",
      environments: ["dev", "staging", "prod"]
    },

    // Example repository the platform teaches against (prompt §6).
    // Illustrative structure only — not generated on disk.
    repo: {
      name: "retailflow-data-platform",
      tree: [
        { path: "src/", note: "Python / PySpark transforms (revenue.py, ingestion, utils)" },
        { path: "tests/", note: "pytest unit + integration tests, deterministic fixtures" },
        { path: "sql/", note: "ad-hoc + assertion SQL, data-quality checks" },
        { path: "dbt/", note: "dbt project: models, schema tests, contracts, seeds, snapshots" },
        { path: "airflow/", note: "DAGs + DAG unit/import tests" },
        { path: "databricks/", note: "Databricks Asset Bundle (databricks.yml, resources, jobs)" },
        { path: "infrastructure/", note: "Terraform modules + per-env configs, remote state" },
        { path: "docker/", note: "Dockerfile(s), multi-stage builds, pinned deps" },
        { path: ".github/workflows/", note: "CI/CD: ci.yml, deploy.yml, reusable workflows" },
        { path: "scripts/", note: "helper scripts: promote, backfill, reconcile" },
        { path: "config/", note: "per-environment config, no secrets committed" },
        { path: "docs/", note: "architecture, ADRs, onboarding" },
        { path: "runbooks/", note: "incident + recovery runbooks per failure mode" }
      ]
    },

    // Recommended learning path (prompt §16). Stage → module ids.
    learningPath: [
      { stage: "1 · Foundations & Git", ids: ["ci-vs-cd", "git", "github", "branching"] },
      { stage: "2 · CI platforms", ids: ["github-actions", "azure-devops", "jenkins"] },
      { stage: "3 · Testing & artifacts", ids: ["testing-pyramid", "pytest", "sql-testing", "artifact-lifecycle"] },
      { stage: "4 · Build & infra", ids: ["docker", "container-registry", "terraform"] },
      { stage: "5 · Data CI/CD", ids: ["dbt-cicd", "data-quality"] },
      { stage: "6 · Orchestration deploy", ids: ["airflow-cicd", "databricks-bundles"] },
      { stage: "7 · GitOps & k8s", ids: ["kubernetes", "helm", "argo-cd"] },
      { stage: "8 · Safety & ops", ids: ["secrets", "security", "deployment-strategies", "rollback", "observability", "environment-promotion"] },
      { stage: "9 · End-to-end", ids: ["business-scenario", "end-to-end-pipeline", "failure-simulator"] },
      { stage: "10 · Interview prep", ids: ["interview", "quiz", "master-map", "glossary"] }
    ]
  };
})();
