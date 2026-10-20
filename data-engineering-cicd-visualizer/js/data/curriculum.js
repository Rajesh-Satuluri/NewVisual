/* ============================================================
   curriculum.js — DECICDViz.Curriculum
   The single source of truth for lesson METADATA: the 11-level
   beginner→expert path, a prerequisite map, learning objectives,
   and authoritative source references for every concept lesson.

   This is deliberately DATA, separate from rendering. Both the
   Guided Academy and the Reference Lab read from here, so content
   is never duplicated between the two modes. The schema is
   versioned (schemaVersion) so saved progress and future lesson
   shapes can be migrated gracefully.

   Integrity: source URLs point at real, stable, official
   documentation roots (or well-known canonical references). We
   record the SECTION to read and a last-reviewed date rather than
   deep-linking into version-specific paths that move between
   releases. Nothing here is fabricated; where a figure or claim is
   company-specific it lives in casestudy-airbnb.js with its own
   evidence tier, not here.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  var REVIEWED = "2026-10-20";

  // ── The 11-level curriculum spine (prompt Levels 0–10) ──────
  var LEVELS = [
    { n: 0, key: "fundamentals", title: "Software & Deployment Fundamentals",
      summary: "What deployment is, why code breaks across machines, environments, and what CI/CD/DevOps/GitOps actually mean." },
    { n: 1, key: "git", title: "Git & Collaborative Development",
      summary: "Version history, branches, pull requests, review, and why source control underpins every reproducible deploy." },
    { n: 2, key: "cli-build", title: "Command Line, YAML, Dependencies & Builds",
      summary: "The terminal, environment variables, exit codes, dependency pinning, YAML, and repeatable build outputs." },
    { n: 3, key: "ci", title: "CI Fundamentals",
      summary: "Triggers, jobs, runners, steps, caching, artifacts, permissions — building a real CI workflow stage by stage." },
    { n: 4, key: "testing", title: "Data Engineering Testing",
      summary: "Unit, integration, contract, SQL, dbt, and data-quality checks mapped to the failures each one detects." },
    { n: 5, key: "cd", title: "CD & Environment Promotion",
      summary: "Build once, promote the same artifact, separate configuration, approval gates, rollback vs forward fix." },
    { n: 6, key: "workloads", title: "Workload Deployment",
      summary: "Platform-specific deployment for Python/PySpark, SQL, dbt, Airflow, and Databricks — not one identical process." },
    { n: 7, key: "iac-containers", title: "Infrastructure as Code & Containers",
      summary: "Terraform (plan/state/apply), Docker images and registries, and when Kubernetes/Helm/Argo CD are warranted." },
    { n: 8, key: "security", title: "Security & Supply-Chain Protection",
      summary: "Least privilege, secret stores, OIDC, dependency scanning, provenance, and safe handling of production data." },
    { n: 9, key: "observability", title: "Production Observability & Incident Response",
      summary: "Logs, metrics, freshness, SLOs, idempotency, incident triage, and code-vs-data recovery." },
    { n: 10, key: "platform", title: "Advanced Platform Engineering",
      summary: "Reusable workflows, policy as code, GitOps reconciliation, governance, and architecture decision records." }
  ];

  // ── Source registry (real, stable, official references) ─────
  // url = a canonical root/page known to exist; section = where to
  // read. reviewed defaults to REVIEWED unless overridden.
  var SOURCES = {
    gitscm:      { title: "Git Reference & Pro Git book", publisher: "git-scm.com", url: "https://git-scm.com/doc", section: "Reference manual + Pro Git ch. 2–3 (recording changes, branching)" },
    ghpr:        { title: "GitHub Docs — Pull requests", publisher: "GitHub", url: "https://docs.github.com/en/pull-requests", section: "Collaborating with pull requests → reviews, required status checks" },
    ghrepo:      { title: "GitHub Docs — Repositories", publisher: "GitHub", url: "https://docs.github.com/en/repositories", section: "Managing branches → branch protection rules" },
    gha:         { title: "GitHub Docs — GitHub Actions", publisher: "GitHub", url: "https://docs.github.com/en/actions", section: "Writing workflows → events, jobs, runners, steps" },
    ghaArtifacts:{ title: "GitHub Docs — Store & share build artifacts", publisher: "GitHub", url: "https://docs.github.com/en/actions", section: "Managing workflow runs → storing workflow artifacts; caching dependencies" },
    ghaSecrets:  { title: "GitHub Docs — Encrypted secrets", publisher: "GitHub", url: "https://docs.github.com/en/actions", section: "Security for GitHub Actions → using secrets in workflows" },
    ghaOidc:     { title: "GitHub Docs — OpenID Connect", publisher: "GitHub", url: "https://docs.github.com/en/actions", section: "Security for GitHub Actions → OpenID Connect (short-lived cloud credentials)" },
    ghaEnv:      { title: "GitHub Docs — Deployment environments", publisher: "GitHub", url: "https://docs.github.com/en/actions", section: "Managing deployments → using environments, required reviewers" },
    pytest:      { title: "pytest documentation", publisher: "pytest project", url: "https://docs.pytest.org/", section: "How-to guides → assertions, fixtures, parametrize" },
    dbt:         { title: "dbt Documentation", publisher: "dbt Labs", url: "https://docs.getdbt.com/", section: "Build → tests, contracts; Deploy → CI jobs, state (defer/slim CI)" },
    airflow:     { title: "Apache Airflow Documentation", publisher: "Apache Software Foundation", url: "https://airflow.apache.org/docs/", section: "Core concepts → DAGs; Best practices → testing DAGs" },
    tf:          { title: "Terraform Documentation", publisher: "HashiCorp", url: "https://developer.hashicorp.com/terraform/docs", section: "Language → state, providers; CLI → plan/apply; backends → remote state + locking" },
    docker:      { title: "Docker Documentation", publisher: "Docker, Inc.", url: "https://docs.docker.com/", section: "Build → Dockerfile, layers, multi-stage; Registry → pushing images" },
    k8s:         { title: "Kubernetes Documentation", publisher: "CNCF", url: "https://kubernetes.io/docs/", section: "Concepts → workloads (Pods, Deployments), configuration" },
    helm:        { title: "Helm Documentation", publisher: "CNCF", url: "https://helm.sh/docs/", section: "Chart template guide; Using Helm → releases, upgrades, rollback" },
    argocd:      { title: "Argo CD Documentation", publisher: "Argo project (CNCF)", url: "https://argo-cd.readthedocs.io/en/stable/", section: "Core concepts → application, sync; GitOps reconciliation" },
    databricks:  { title: "Databricks Documentation", publisher: "Databricks", url: "https://docs.databricks.com/", section: "Developer tools → Databricks Asset Bundles (bundle config, targets, deploy)" },
    azure:       { title: "Azure DevOps Documentation", publisher: "Microsoft", url: "https://learn.microsoft.com/en-us/azure/devops/", section: "Pipelines → YAML schema, stages, environments, approvals" },
    jenkins:     { title: "Jenkins User Documentation", publisher: "Jenkins project", url: "https://www.jenkins.io/doc/", section: "Pipeline → Jenkinsfile, declarative syntax, agents" },
    sonar:       { title: "SonarQube", publisher: "Sonar", url: "https://www.sonarsource.com/products/sonarqube/", section: "Docs → quality gates, pull request decoration" },
    ge:          { title: "Great Expectations Documentation", publisher: "Great Expectations", url: "https://docs.greatexpectations.io/", section: "Core concepts → Expectations, Checkpoints (data-quality assertions)" },
    ciFowler:    { title: "Continuous Integration", publisher: "Martin Fowler", url: "https://martinfowler.com/articles/continuousIntegration.html", section: "Full article — the canonical definition of CI", reviewed: "2024 revision" },
    cdSite:      { title: "Continuous Delivery", publisher: "Humble & Farley", url: "https://continuousdelivery.com/", section: "Principles → build once/promote; deployment pipeline" },
    bluegreen:   { title: "BlueGreenDeployment", publisher: "Martin Fowler (bliki)", url: "https://martinfowler.com/bliki/BlueGreenDeployment.html", section: "Full entry" },
    canary:      { title: "CanaryRelease", publisher: "Martin Fowler (bliki)", url: "https://martinfowler.com/bliki/CanaryRelease.html", section: "Full entry" },
    testpyramid: { title: "TestPyramid", publisher: "Martin Fowler (bliki)", url: "https://martinfowler.com/bliki/TestPyramid.html", section: "Full entry — unit vs integration vs end-to-end proportions" },
    sre:         { title: "Google SRE Books", publisher: "Google", url: "https://sre.google/books/", section: "SLOs chapter; Monitoring distributed systems; Postmortem culture" },
    airbnbeng:   { title: "Airbnb Engineering & Data Science", publisher: "Airbnb", url: "https://medium.com/airbnb-engineering", section: "Data Quality / Minerva posts (see case study for exact citations)" },
    pyvenv:      { title: "venv — Creation of virtual environments", publisher: "Python docs", url: "https://docs.python.org/3/library/venv.html", section: "The whole page — creating and activating a venv" },
    pip:         { title: "pip user guide", publisher: "pip / PyPA", url: "https://pip.pypa.io/en/stable/", section: "Requirements files; Secure installs (hash-checking mode)" },
    yamlspec:    { title: "YAML Specification", publisher: "yaml.org", url: "https://yaml.org/spec/", section: "Collections (mappings, sequences); indentation rules" },
    twelvefactor:{ title: "The Twelve-Factor App — Config", publisher: "12factor.net", url: "https://12factor.net/config", section: "Factor III — Config (store config in the environment)" }
  };

  // ── Lesson metadata, keyed by route id ──────────────────────
  // Each lesson: { level, estMinutes, prereqs:[ids], objectives:[..],
  // sourceIds:[..] }. prereqs and ids must be real routes.
  var LESSONS = {
    "ci-vs-cd": { level: 0, estMinutes: 15,
      prereqs: [],
      objectives: [
        "Explain what deployment means and why code that runs on a laptop can fail in production.",
        "Distinguish continuous integration, continuous delivery, and continuous deployment precisely.",
        "Describe how data-engineering deployment adds correctness, freshness, and schema concerns beyond availability."
      ],
      sourceIds: ["ciFowler", "cdSite"] },

    "business-scenario": { level: 0, estMinutes: 20,
      prereqs: [],
      objectives: [
        "Frame a wrong revenue number as a business-correctness incident, not just a software failure.",
        "Trace, at a high level, how one code change reaches an executive dashboard safely.",
        "Recognise why a 'green' job does not prove the data is correct."
      ],
      sourceIds: ["cdSite", "airbnbeng"] },

    "cli-yaml-deps": { level: 2, estMinutes: 25,
      prereqs: [],
      objectives: [
        "Read and predict shell commands, working directories, and exit codes the way a headless CI runner sees them.",
        "Isolate and pin dependencies with virtual environments and lockfiles for reproducible builds.",
        "Write valid YAML and separate ordinary configuration from secrets."
      ],
      sourceIds: ["pyvenv", "pip", "yamlspec", "twelvefactor"] },

    "git": { level: 1, estMinutes: 25,
      prereqs: ["ci-vs-cd"],
      objectives: [
        "Describe the working tree, staging area, commit, branch, and remote, and how a commit identifies a snapshot.",
        "Use feature branches and predict the result of common commands before running them.",
        "Choose revert over history rewriting when a change is already shared."
      ],
      sourceIds: ["gitscm"] },

    "github": { level: 1, estMinutes: 20,
      prereqs: ["git"],
      objectives: [
        "Open a pull request and explain what code review and required status checks protect against.",
        "Configure branch protection so unreviewed or failing code cannot merge.",
        "Relate repository organisation and release tags to reproducible deployments."
      ],
      sourceIds: ["ghpr", "ghrepo"] },

    "branching": { level: 1, estMinutes: 20,
      prereqs: ["git"],
      objectives: [
        "Compare trunk-based and feature-branch workflows and their trade-offs for data teams.",
        "Resolve a merge conflict and explain why it happened.",
        "Explain when to rebase versus merge, and the danger of rewriting shared history."
      ],
      sourceIds: ["gitscm"] },

    "github-actions": { level: 3, estMinutes: 30,
      prereqs: ["github", "ci-vs-cd"],
      objectives: [
        "Map events → workflow runs → jobs → runners → steps, and how exit codes propagate failure.",
        "Write a workflow that installs dependencies, lints, tests, and uploads an artifact.",
        "Apply least-privilege permissions, caching, and concurrency controls correctly."
      ],
      sourceIds: ["gha", "ghaArtifacts"] },

    "azure-devops": { level: 3, estMinutes: 20,
      prereqs: ["github-actions"],
      objectives: [
        "Map Azure Pipelines concepts (stages, jobs, environments, approvals) onto what you know from Actions.",
        "Explain when an enterprise chooses Azure DevOps over GitHub Actions.",
        "Identify the equivalents of secrets, artifacts, and environments in Azure Pipelines."
      ],
      sourceIds: ["azure"] },

    "jenkins": { level: 3, estMinutes: 20,
      prereqs: ["github-actions"],
      objectives: [
        "Read a declarative Jenkinsfile and identify agents, stages, and steps.",
        "Explain why Jenkins remains common and what operating it costs compared with hosted CI.",
        "Describe how credentials and artifacts are handled in a Jenkins pipeline."
      ],
      sourceIds: ["jenkins"] },

    "testing-pyramid": { level: 4, estMinutes: 20,
      prereqs: ["github-actions"],
      objectives: [
        "Explain the testing pyramid and why most tests should be fast and low-level.",
        "Place unit, integration, contract, and end-to-end tests at the right layer for a data pipeline.",
        "Reason about test speed, cost, and determinism trade-offs."
      ],
      sourceIds: ["testpyramid"] },

    "pytest": { level: 4, estMinutes: 25,
      prereqs: ["testing-pyramid"],
      objectives: [
        "Write deterministic pytest unit tests with fixtures and parametrisation.",
        "Test a PySpark transform's logic without depending on a live cluster.",
        "Distinguish a genuine failure from a flaky test and make tests reliable."
      ],
      sourceIds: ["pytest"] },

    "sql-testing": { level: 4, estMinutes: 25,
      prereqs: ["testing-pyramid"],
      objectives: [
        "Write assertion queries that fail when data is wrong (uniqueness, not-null, referential, reconciliation).",
        "Choose the right lifecycle point to run each SQL check.",
        "Explain the limits of SQL tests and what they cannot catch."
      ],
      sourceIds: ["dbt", "ge"] },

    "data-quality": { level: 4, estMinutes: 25,
      prereqs: ["sql-testing"],
      objectives: [
        "Differentiate software correctness from data correctness and why both need gates.",
        "Design freshness, completeness, and distribution checks for a daily pipeline.",
        "Decide when a data-quality failure should block a deploy versus raise an incident."
      ],
      sourceIds: ["dbt", "ge"] },

    "artifact-lifecycle": { level: 3, estMinutes: 20,
      prereqs: ["github-actions"],
      objectives: [
        "Define an artifact and distinguish it from a cache.",
        "Explain immutable artifact identity (version, source SHA, digest) and why it matters.",
        "Trace an artifact from build through storage to promotion."
      ],
      sourceIds: ["ghaArtifacts", "docker"] },

    "environment-promotion": { level: 5, estMinutes: 25,
      prereqs: ["artifact-lifecycle"],
      objectives: [
        "Explain build-once / promote-the-same-artifact and why rebuilding per environment is risky.",
        "Separate configuration and secrets from the artifact across dev/staging/prod.",
        "Apply approval gates and protected environments to production deploys."
      ],
      sourceIds: ["cdSite", "ghaEnv"] },

    "deployment-strategies": { level: 5, estMinutes: 25,
      prereqs: ["environment-promotion"],
      objectives: [
        "Compare recreate, blue-green, and canary deployments.",
        "Judge which strategies apply to data workloads and which do not translate cleanly.",
        "Weigh the cost and complexity each strategy introduces."
      ],
      sourceIds: ["bluegreen", "canary"] },

    "rollback": { level: 5, estMinutes: 20,
      prereqs: ["environment-promotion"],
      objectives: [
        "Distinguish application rollback, code rollback, configuration rollback, and data recovery.",
        "Decide between rollback and forward fix under time pressure.",
        "Explain why rolling back code rarely repairs already-written bad data."
      ],
      sourceIds: ["cdSite", "ghaEnv"] },

    "dbt-cicd": { level: 6, estMinutes: 30,
      prereqs: ["sql-testing", "github-actions"],
      objectives: [
        "Explain dbt model dependencies and how tests and contracts gate a build.",
        "Design a CI job that builds and tests only changed models (state-aware / slim CI).",
        "Promote a dbt project safely across environments with separate credentials."
      ],
      sourceIds: ["dbt"] },

    "airflow-cicd": { level: 6, estMinutes: 30,
      prereqs: ["pytest", "github-actions"],
      objectives: [
        "Catch DAG import/parse errors in CI before they reach the scheduler.",
        "Write tests for DAG structure, dependencies, and schedules.",
        "Explain deployment methods, connections/secrets, retries, and backfills."
      ],
      sourceIds: ["airflow"] },

    "databricks-bundles": { level: 6, estMinutes: 30,
      prereqs: ["github-actions", "environment-promotion"],
      objectives: [
        "Describe a Databricks Asset Bundle: resources, jobs, and per-target configuration.",
        "Deploy the same bundle to dev/staging/prod with overrides, not divergent definitions.",
        "Validate a bundle and set appropriate permissions before running jobs."
      ],
      sourceIds: ["databricks"] },

    "terraform": { level: 7, estMinutes: 30,
      prereqs: ["github-actions"],
      objectives: [
        "Explain providers, resources, variables, outputs, and state, and what plan vs apply do.",
        "Use remote state with locking and detect drift.",
        "Protect against destructive changes and pin provider versions."
      ],
      sourceIds: ["tf"] },

    "docker": { level: 7, estMinutes: 25,
      prereqs: ["github-actions"],
      objectives: [
        "Explain images, layers, containers, and registries, and how a Dockerfile builds an image.",
        "Write a reproducible, pinned, multi-stage build for a Python data job.",
        "Judge when a container helps a data workload and when a managed service is simpler."
      ],
      sourceIds: ["docker"] },

    "container-registry": { level: 7, estMinutes: 15,
      prereqs: ["docker"],
      objectives: [
        "Explain image tags versus immutable digests and why digests pin deployments.",
        "Describe how images are promoted across environments through a registry.",
        "Relate image scanning to supply-chain security."
      ],
      sourceIds: ["docker"] },

    "kubernetes": { level: 7, estMinutes: 25,
      prereqs: ["docker"],
      objectives: [
        "Explain Pods, Deployments, and Services at a working level.",
        "Describe how configuration and secrets reach a container at runtime.",
        "Decide when a data team actually needs Kubernetes."
      ],
      sourceIds: ["k8s"] },

    "helm": { level: 7, estMinutes: 20,
      prereqs: ["kubernetes"],
      objectives: [
        "Explain how a Helm chart templates Kubernetes manifests across environments.",
        "Describe a release, an upgrade, and a rollback in Helm.",
        "Weigh templating power against the complexity it adds."
      ],
      sourceIds: ["helm"] },

    "argo-cd": { level: 7, estMinutes: 25,
      prereqs: ["kubernetes", "github"],
      objectives: [
        "Explain GitOps: Git as the source of truth and continuous reconciliation.",
        "Contrast pull-based GitOps with push-based deployment.",
        "Describe how Argo CD detects and corrects drift."
      ],
      sourceIds: ["argocd"] },

    "secrets": { level: 8, estMinutes: 25,
      prereqs: ["github-actions"],
      objectives: [
        "Distinguish configuration from secrets and keep credentials out of Git.",
        "Use a secret store and short-lived credentials instead of long-lived keys.",
        "Explain how a leaked secret is exploited and how to rotate it."
      ],
      sourceIds: ["ghaSecrets"] },

    "security": { level: 8, estMinutes: 30,
      prereqs: ["secrets", "github-actions"],
      objectives: [
        "Apply least privilege to repository and workflow permissions.",
        "Use OIDC to assume cloud roles without storing long-lived credentials.",
        "Identify untrusted-PR execution risks, dependency pinning, and provenance (SBOM)."
      ],
      sourceIds: ["ghaOidc", "ghaSecrets"] },

    "sonarqube": { level: 4, estMinutes: 15,
      prereqs: ["github-actions"],
      objectives: [
        "Explain what static analysis and a quality gate add on top of tests.",
        "Describe how a quality gate blocks a pull request.",
        "Judge when static-analysis gates are worth their friction."
      ],
      sourceIds: ["sonar"] },

    "observability": { level: 9, estMinutes: 25,
      prereqs: ["environment-promotion"],
      objectives: [
        "Distinguish structured logs, metrics, and alerts and what each answers.",
        "Define SLAs/SLOs, freshness, and completeness for a pipeline.",
        "Explain idempotency, retries, timeouts, and partial-failure handling."
      ],
      sourceIds: ["sre", "airflow"] },

    "failure-simulator": { level: 9, estMinutes: 30,
      prereqs: ["observability", "rollback"],
      objectives: [
        "Run an incident investigation from symptom to evidence to root cause.",
        "Choose a recovery strategy and distinguish code rollback from data recovery.",
        "Write a post-incident review that prevents recurrence."
      ],
      sourceIds: ["sre"] },

    "end-to-end-pipeline": { level: 10, estMinutes: 25,
      prereqs: ["github-actions", "environment-promotion", "data-quality"],
      objectives: [
        "Trace a change across the whole lifecycle: data flow versus control flow.",
        "Map each stage to the technology and the module that teaches it.",
        "Explain where each class of failure is caught along the pipeline."
      ],
      sourceIds: ["cdSite", "gha"] }
  };

  // ── API ─────────────────────────────────────────────────────
  function meta(id) { return LESSONS[id] || null; }
  function has(id) { return !!LESSONS[id]; }
  function prereqs(id) { var m = LESSONS[id]; return (m && m.prereqs) || []; }
  function objectives(id) { var m = LESSONS[id]; return (m && m.objectives) || []; }
  function levelOf(id) { var m = LESSONS[id]; return m ? m.level : null; }
  function levelInfo(n) {
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].n === n) return LEVELS[i];
    return null;
  }
  function sourcesFor(id) {
    var m = LESSONS[id];
    if (!m) return [];
    return (m.sourceIds || []).map(function (sid) {
      var s = SOURCES[sid];
      if (!s) return null;
      return {
        id: sid, title: s.title, publisher: s.publisher,
        url: s.url, section: s.section, reviewed: s.reviewed || REVIEWED
      };
    }).filter(Boolean);
  }
  function lessonIds() { return Object.keys(LESSONS); }
  function byLevel() {
    var out = {};
    LEVELS.forEach(function (l) { out[l.n] = []; });
    Object.keys(LESSONS).forEach(function (id) {
      var n = LESSONS[id].level;
      (out[n] = out[n] || []).push(id);
    });
    return out;
  }

  NS.Curriculum = {
    schemaVersion: 1,
    reviewed: REVIEWED,
    levels: LEVELS,
    sources: SOURCES,
    lessons: LESSONS,
    meta: meta, has: has, prereqs: prereqs, objectives: objectives,
    levelOf: levelOf, levelInfo: levelInfo, sourcesFor: sourcesFor,
    lessonIds: lessonIds, byLevel: byLevel
  };
})();
