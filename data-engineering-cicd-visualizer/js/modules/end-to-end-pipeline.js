/* modules/end-to-end-pipeline.js — clickable end-to-end CI/CD map.
   Every node opens a detail card: purpose, input, output, tool,
   example command, failure mode, and B/I/P explanations. */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  var NODES = [
    { id: "commit", icon: "🔩", title: "Git commit", tool: "Git",
      purpose: "Record the revenue-fix change as a reviewable save point.",
      input: "Edited transforms/revenue.py", output: "A commit on feature/fix-net-revenue",
      cmd: "git commit -m \"Fix net revenue\"", fail: "Committing secrets or huge data files.",
      b: "A checkpoint you can return to.", i: "Lives on a feature branch, isolated from main.",
      p: "Immutable content-addressed snapshot; basis for review and revert." },
    { id: "pr", icon: "🐙", title: "Pull Request", tool: "GitHub",
      purpose: "Let a teammate review the change and gate the merge on CI.",
      input: "Pushed branch", output: "PR with required checks",
      cmd: "gh pr create --fill", fail: "Merging without review or green checks.",
      b: "A request to add your change to the main road.", i: "Branch protection blocks merge until checks pass.",
      p: "CODEOWNERS + required checks enforce policy as code." },
    { id: "ci", icon: "🔄", title: "GitHub Actions", tool: "CI",
      purpose: "Run every validation automatically on each push.",
      input: "PR event", output: "Pass/fail checks + artifact",
      cmd: "on: [pull_request]", fail: "No caching → slow, flaky runs.",
      b: "A robot that checks your work.", i: "Jobs run on runners in parallel; artifacts pass between them.",
      p: "Reusable workflows, matrices, OIDC to cloud, environment approvals." },
    { id: "pytest", icon: "🧪", title: "pytest", tool: "Testing",
      purpose: "Prove the Python/PySpark logic is correct.",
      input: "Source + tests", output: "Test report",
      cmd: "pytest -q", fail: "gross+refund instead of gross-refund → assertion fails, PR blocked.",
      b: "Automatic checks that the math is right.", i: "Fixtures + parametrization; mock external systems.",
      p: "Test pyramid; deterministic Spark-local tests; CI parallelization." },
    { id: "dbt", icon: "🔶", title: "dbt build", tool: "dbt",
      purpose: "Build and test the SQL transformations.",
      input: "Models + sources", output: "Built models + test results",
      cmd: "dbt build --select state:modified+", fail: "Duplicate orders → unique test fails.",
      b: "Checks the data transforms.", i: "Slim CI builds only changed models + downstream.",
      p: "State comparison, contracts, exposures, lineage-aware CI." },
    { id: "sql", icon: "🧮", title: "SQL tests", tool: "SQL",
      purpose: "Assert business rules on the resulting data.",
      input: "Transformed tables", output: "Data assertions pass/fail",
      cmd: "not_null · unique · relationships", fail: "Orphan order with no customer/payment.",
      b: "Rules like 'every order has one customer'.", i: "Null/unique/referential/row-count checks.",
      p: "Reconciliation and freshness as gates before promotion." },
    { id: "quality-gate", icon: "🚦", title: "Quality Gate", tool: "CI",
      purpose: "Block promotion unless every check passed.",
      input: "All check results", output: "Go / no-go decision",
      cmd: "required status checks", fail: "Bypassing the gate for a 'quick fix'.",
      b: "The green light before shipping.", i: "Aggregates tests + review + scans.",
      p: "Policy gate: coverage, security, approvals all required." },
    { id: "docker", icon: "🐳", title: "Docker build", tool: "Docker",
      purpose: "Package the app so it runs identically everywhere.",
      input: "Validated source", output: "Immutable image (SHA tag)",
      cmd: "docker build -t retailflow/processor:$SHA .", fail: "Works locally, fails in CI (dep mismatch).",
      b: "A sealed box with the app + its environment.", i: "Multi-stage builds; pin dependencies.",
      p: "Immutable, scanned, non-root, promoted by digest." },
    { id: "registry", icon: "📦", title: "Container Registry", tool: "Registry",
      purpose: "Store the image and promote the same artifact.",
      input: "Built image", output: "Pullable, versioned image",
      cmd: "docker push ghcr.io/retailflow/processor:$SHA", fail: "Relying on mutable :latest in prod.",
      b: "A warehouse for packaged software.", i: "Tags vs digests; per-env promotion.",
      p: "Immutable digests; provenance; signed artifacts." },
    { id: "terraform", icon: "🏗️", title: "Terraform", tool: "Terraform",
      purpose: "Provision/adjust cloud + Databricks infra as code.",
      input: "HCL config", output: "Applied infrastructure",
      cmd: "terraform plan && terraform apply", fail: "Silent drift from manual portal clicks.",
      b: "A blueprint for the cloud.", i: "Plan in PR, apply after approval; remote state + locking.",
      p: "Modules, workspaces, state security, drift detection." },
    { id: "databricks", icon: "🧱", title: "Databricks Bundle", tool: "Databricks",
      purpose: "Deploy the Databricks job/config for the environment.",
      input: "Bundle + target", output: "Deployed job in prod",
      cmd: "databricks bundle deploy --target prod", fail: "Notebook works in dev, missing prod config.",
      b: "Ships the Databricks job safely.", i: "Targets (dev/test/prod) with per-env variables.",
      p: "Bundle validate in CI; approvals between targets." },
    { id: "airflow", icon: "🌀", title: "Airflow / dbt", tool: "Airflow",
      purpose: "Orchestrate the production run in the right order.",
      input: "Deployed DAG + models", output: "Scheduled production pipeline",
      cmd: "airflow dags reserialize", fail: "A DAG import error breaks the scheduler.",
      b: "The conductor of the nightly run.", i: "DAG import tests + unit tests gate deploys.",
      p: "Versioned DAGs, dependency isolation, rollback." },
    { id: "production", icon: "🏭", title: "Production", tool: "Warehouse",
      purpose: "Produce the Gold tables behind the dashboard.",
      input: "Orchestrated run", output: "Fresh revenue tables",
      cmd: "— (runs on schedule)", fail: "Runs late → dashboard empty at 7 AM.",
      b: "Where the real numbers are produced.", i: "Medallion Bronze→Silver→Gold.",
      p: "SLAs, backfills, idempotent writes." },
    { id: "data-quality", icon: "✅", title: "Data Quality", tool: "Data Quality",
      purpose: "Verify the produced data is actually correct.",
      input: "Gold tables", output: "Pass/fail data checks",
      cmd: "freshness · completeness · uniqueness", fail: "Green deploy but stale data → incident.",
      b: "An inspector for the data itself.", i: "Runs after deploy; separate from code tests.",
      p: "Distribution/anomaly checks; quarantine + alert." },
    { id: "monitoring", icon: "📈", title: "Monitoring", tool: "Observability",
      purpose: "Watch pipeline health and raise alerts.",
      input: "Logs, metrics, DQ results", output: "Dashboards + alerts",
      cmd: "duration · failure rate · freshness", fail: "No alerting → nobody notices the miss.",
      b: "The health monitor for production.", i: "Track duration, failures, freshness, row counts.",
      p: "SLOs, on-call, incident response loop." }
  ];

  var module = {
    id: "end-to-end-pipeline",
    title: "End-to-End Pipeline",
    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">🗺️ Real-World Scenario · RetailFlow</div>' +
          '<h1 class="module-title gradient-text">End-to-End Pipeline</h1>' +
          '<p class="module-subtitle">The whole journey, one map. Click any stage to see what it does, ' +
          "what goes in and out, the tool, an example command, how it can fail, and how to explain it at three levels.</p>" +
        "</div>";

      var layout = document.createElement("div");
      layout.className = "e2e-layout";
      var graph = document.createElement("div");
      graph.className = "e2e-graph";
      graph.innerHTML = NODES.map(function (n, i) {
        var arrow = i ? '<span class="e2e-arrow">↓</span>' : "";
        return arrow + '<button type="button" class="e2e-node" data-id="' + n.id + '" tabindex="0">' +
          '<span class="e2e-node-icon">' + n.icon + "</span>" +
          '<span class="e2e-node-title">' + n.title + "</span>" +
          '<span class="e2e-node-tool">' + n.tool + "</span></button>";
      }).join("");
      var detail = document.createElement("div");
      detail.className = "e2e-detail";
      detail.innerHTML = '<div class="e2e-detail-empty">← Select a stage to inspect it.</div>';
      layout.appendChild(graph);
      layout.appendChild(detail);
      container.appendChild(layout);

      function show(id) {
        var n = NODES.filter(function (x) { return x.id === id; })[0];
        if (!n) return;
        graph.querySelectorAll(".e2e-node").forEach(function (el) {
          el.classList.toggle("active", el.getAttribute("data-id") === id);
        });
        function row(k, v) { return '<div class="e2e-row"><span class="e2e-k">' + k + '</span><span class="e2e-v">' + v + "</span></div>"; }
        detail.innerHTML =
          '<div class="e2e-detail-head"><span class="e2e-detail-icon">' + n.icon + "</span>" +
            '<div><div class="e2e-detail-title">' + n.title + '</div><div class="e2e-detail-tool">' + n.tool + "</div></div></div>" +
          "<p class=\"e2e-purpose\">" + n.purpose + "</p>" +
          row("Input", n.input) + row("Output", n.output) +
          row("Example", '<code>' + n.cmd.replace(/</g, "&lt;") + "</code>") +
          '<div class="e2e-fail">💥 <b>Failure mode:</b> ' + n.fail + "</div>" +
          '<div class="e2e-levels">' +
            '<div class="e2e-lvl"><span class="e2e-lvl-b">Beginner</span>' + n.b + "</div>" +
            '<div class="e2e-lvl"><span class="e2e-lvl-i">Intermediate</span>' + n.i + "</div>" +
            '<div class="e2e-lvl"><span class="e2e-lvl-p">Proficient</span>' + n.p + "</div>" +
          "</div>";
      }

      graph.addEventListener("click", function (e) {
        var b = e.target.closest(".e2e-node");
        if (b) show(b.getAttribute("data-id"));
      });
      graph.addEventListener("keydown", function (e) {
        var b = e.target.closest(".e2e-node");
        if (b && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); show(b.getAttribute("data-id")); }
      });
      show("commit");
    },
    destroy: function () {}
  };

  NS.registerModule(module);
})();
