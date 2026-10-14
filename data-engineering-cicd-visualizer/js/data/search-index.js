/* ============================================================
   search-index.js — curated entries for global search.
   Module and tool entries are generated at runtime from the route
   registry and tool registry (see js/core/search.js); this file adds
   the things those don't cover: common errors, commands, and
   cross-cutting concepts, each pointing at the module that explains
   it. Keep entries short — they are matched on title + keywords.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.SearchIndex = [
    // ── Common errors / symptoms → where they're taught ──────
    { kind: "error", title: "CrashLoopBackOff", route: "kubernetes", keywords: "pod oomkilled restart memory limit probe readiness" },
    { kind: "error", title: "ImagePullBackOff / ErrImagePull", route: "kubernetes", keywords: "registry auth secret tag digest pull" },
    { kind: "error", title: "ResolutionImpossible (pip)", route: "docker", keywords: "dependency version conflict requirements build" },
    { kind: "error", title: "Terraform: destroy and recreate", route: "terraform", keywords: "moved import prevent_destroy stateful plan drift" },
    { kind: "error", title: "Terraform drift / plan shows changes", route: "terraform", keywords: "state console manual change reconcile" },
    { kind: "error", title: "dbt uniqueness test failed", route: "dbt-cicd", keywords: "duplicate order_id grain join fan out data test" },
    { kind: "error", title: "DagBag import error", route: "airflow-cicd", keywords: "parse top-level scheduler poison dag timeout" },
    { kind: "error", title: "Secret leaked / high-entropy string", route: "secrets", keywords: "scanning rotate oidc env gitignore credential" },
    { kind: "error", title: "Databricks: cluster policy not found", route: "databricks-bundles", keywords: "target bundle deploy prod permission service principal" },
    { kind: "error", title: "Helm template error", route: "helm", keywords: "render dry-run values chart manifest kubeconform" },
    { kind: "error", title: "Argo CD OutOfSync / keeps reverting", route: "argo-cd", keywords: "gitops reconcile drift manual change desired state" },
    { kind: "error", title: "Pipeline green but data wrong", route: "data-quality", keywords: "freshness anomaly silently incorrect validation gate" },
    { kind: "error", title: "Rerun doubled the revenue", route: "rollback", keywords: "idempotency partition overwrite reprocess backfill" },

    // ── Commands worth finding fast ──────────────────────────
    { kind: "command", title: "dbt build --select state:modified+", route: "dbt-cicd", keywords: "slim ci manifest state defer selector" },
    { kind: "command", title: "terraform plan / apply", route: "terraform", keywords: "validate policy review infrastructure" },
    { kind: "command", title: "docker build / pin by digest", route: "docker", keywords: "image layer cache multi-stage buildkit" },
    { kind: "command", title: "databricks bundle deploy -t <target>", route: "databricks-bundles", keywords: "asset bundle dev staging prod" },
    { kind: "command", title: "helm rollback", route: "helm", keywords: "release revision history previous" },
    { kind: "command", title: "git rebase vs merge", route: "branching", keywords: "history linear conflict public branch" },
    { kind: "command", title: "pytest -q", route: "pytest", keywords: "fixtures parametrize mock spark unit test" },

    // ── Cross-cutting concepts ───────────────────────────────
    { kind: "concept", title: "Build once, promote everywhere", route: "artifact-lifecycle", keywords: "immutable artifact environment promotion digest" },
    { kind: "concept", title: "Quality gate", route: "testing-pyramid", keywords: "required status check block promotion coverage" },
    { kind: "concept", title: "OIDC vs stored cloud keys", route: "security", keywords: "short-lived credentials identity least privilege" },
    { kind: "concept", title: "Blue/green & canary for data", route: "deployment-strategies", keywords: "shadow schema swap view progressive delivery" },
    { kind: "concept", title: "Idempotency", route: "rollback", keywords: "rerun partition overwrite safe retry" },
    { kind: "concept", title: "Code rollback vs data rollback", route: "rollback", keywords: "reprocess restore medallion snapshot" },
    { kind: "concept", title: "Expand and contract schema change", route: "dbt-cicd", keywords: "contract backfill migrate column rename" },
    { kind: "concept", title: "DORA metrics", route: "observability", keywords: "deploy frequency lead time change fail mttr" },
    { kind: "concept", title: "Medallion architecture (bronze/silver/gold)", route: "data-quality", keywords: "layers recompute reprocess source of truth" },
    { kind: "concept", title: "Deploying code vs running a pipeline", route: "airflow-cicd", keywords: "execution separation dag deploy schedule" },

    // ── Hands-on labs ────────────────────────────────────────
    { kind: "concept", title: "Hands-on labs (fix broken config)", route: "labs", keywords: "lab exercise editor validate practice" },
    { kind: "command", title: "Lab: make the test gate the deploy", route: "labs/gate-the-test", keywords: "needs github actions required check" },
    { kind: "command", title: "Lab: stop leaking a secret in CI", route: "labs/secret-exposure", keywords: "secrets echo env mask" },
    { kind: "command", title: "Lab: fix an insecure Dockerfile", route: "labs/dockerfile-fix", keywords: "docker pin non-root cache layer" },
    { kind: "command", title: "Lab: prevent a Terraform destroy", route: "labs/terraform-guard", keywords: "prevent_destroy lifecycle stateful" },
    { kind: "command", title: "Lab: fix a late-arriving dbt incremental", route: "labs/dbt-incremental", keywords: "lookback window merge watermark" },
    { kind: "command", title: "Lab: fix a DAG import error", route: "labs/airflow-import", keywords: "dagbag top-level parse scheduler" },
    { kind: "command", title: "Lab: fix a CrashLoopBackOff (OOM)", route: "labs/k8s-oom", keywords: "memory limit readiness probe oomkilled" },
    { kind: "command", title: "Lab: fix a flaky freshness check", route: "labs/freshness-check", keywords: "current_date interval deterministic sql" }
  ];
})();
