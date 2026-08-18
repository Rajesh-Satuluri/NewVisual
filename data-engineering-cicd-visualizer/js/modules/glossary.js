/* modules/glossary.js — Learning · Reference · searchable glossary */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  // Each term ties back to RetailFlow's Daily Revenue Pipeline where natural.
  var DATA = [
    { term: "Git", def: "A distributed <b>version-control system</b> that records the full history of every change, so RetailFlow can trace exactly when <code>net_revenue</code> stopped adding refunds and started subtracting them." },
    { term: "Repository", def: "The project's home — all source, config, and history in one place; RetailFlow's <code>daily-revenue-pipeline</code> repo holds the transforms, tests, and CI workflows together." },
    { term: "Commit", def: "A save point recording a set of staged changes with a message; the revenue fix lives in a single reviewable commit like <code>Fix net revenue: subtract refunds</code>." },
    { term: "Branch", def: "An independent line of work; <code>feature/fix-net-revenue</code> lets an engineer change the formula while <code>main</code> keeps feeding the 7 AM dashboard untouched." },
    { term: "Merge", def: "Combining a branch back into another, creating a merge commit when histories diverge; RetailFlow merges the fix into <code>main</code> only after review and CI pass." },
    { term: "Rebase", def: "Replaying your commits on top of the latest base branch for a linear history, instead of a merge commit — useful to keep the revenue-fix branch current with <code>main</code>." },
    { term: "Pull request", def: "A proposal to merge one branch into another, bundling the diff, discussion, reviews, and CI checks; the revenue fix reaches <code>main</code> only through an approved PR." },
    { term: "CI (Continuous Integration)", def: "Automatically building and testing every change as it's pushed, so RetailFlow catches a broken revenue transform in minutes rather than at 7 AM." },
    { term: "CD (Continuous Delivery/Deployment)", def: "Automatically promoting a validated build toward (delivery) or all the way into (deployment) production, moving the revenue fix from a green PR to the live pipeline safely." },
    { term: "Pipeline", def: "An automated sequence of stages — build, test, package, deploy — that a change travels through; also RetailFlow's data pipeline that produces daily revenue." },
    { term: "Runner", def: "The machine or container that executes CI/CD jobs; a GitHub Actions runner spins up, installs dbt, runs RetailFlow's tests, then disappears." },
    { term: "Artifact", def: "A versioned, immutable output of a build (a Docker image, a wheel, a compiled dbt manifest) that gets promoted unchanged from staging to prod — build once, deploy everywhere." },
    { term: "Registry", def: "A store for versioned artifacts, most often a container registry holding Docker images; RetailFlow pushes <code>revenue-pipeline:sha-abc123</code> there for every environment to pull." },
    { term: "Docker image", def: "An immutable, layered blueprint bundling code plus its exact dependencies; RetailFlow bakes Python, dbt, and the revenue transforms into one image so every environment runs identical software." },
    { term: "Container", def: "A running, isolated instance of an image; the RetailFlow revenue job runs in a container that behaves the same on a laptop and in production." },
    { term: "Terraform", def: "An infrastructure-as-code tool that declares cloud resources in files and reconciles reality to match; RetailFlow uses it to provision the warehouse, storage, and job clusters reproducibly." },
    { term: "State (Terraform)", def: "Terraform's record of which real resources it manages and their current attributes; the remote state file is what lets Terraform know the RetailFlow warehouse already exists." },
    { term: "Drift", def: "When real infrastructure no longer matches the Terraform code (someone clicked in the console); <code>terraform plan</code> surfaces the drift before it silently breaks the pipeline." },
    { term: "Provider (Terraform)", def: "A plugin that teaches Terraform to manage a specific platform's API — the Azure, Databricks, or Snowflake provider translates RetailFlow's resource blocks into API calls." },
    { term: "Module (Terraform)", def: "A reusable, parameterized bundle of Terraform resources; RetailFlow wraps its 'analytics warehouse + job cluster' pattern in one module reused across dev, staging, and prod." },
    { term: "Databricks Asset Bundle", def: "A YAML-defined package of Databricks jobs, notebooks, and config deployed as a unit; RetailFlow's bundle ships the revenue job and its schedule together, per target." },
    { term: "Target (DAB)", def: "A named deployment environment in a Databricks Asset Bundle (e.g. <code>dev</code>, <code>staging</code>, <code>prod</code>) that swaps in the right workspace, cluster size, and schedule for that stage." },
    { term: "dbt", def: "A transformation framework that turns SQL <code>SELECT</code>s into managed, tested, documented tables; RetailFlow's <code>net_revenue</code> lives as a version-controlled dbt model, not a hand-run query." },
    { term: "Model (dbt)", def: "A single <code>.sql</code> file defining one table or view as a <code>SELECT</code>; the <code>daily_revenue</code> model computes <code>gross_revenue - refund_amount</code> and dbt builds it in dependency order." },
    { term: "Test (dbt)", def: "An assertion about data — unique, not-null, accepted values, or custom SQL — that fails the build when violated; RetailFlow tests that <code>order_id</code> is unique before revenue is trusted." },
    { term: "DAG", def: "A directed acyclic graph of tasks with no cycles; both dbt (model dependencies) and Airflow (pipeline steps) model RetailFlow's revenue flow as a DAG so order and parallelism are explicit." },
    { term: "Kubernetes", def: "A container orchestrator that schedules, scales, heals, and networks containers across a cluster; RetailFlow can run its Airflow workers and jobs on Kubernetes for elastic capacity." },
    { term: "Pod", def: "The smallest deployable unit in Kubernetes — one or more containers sharing network and storage; each RetailFlow task runs in its own pod that's created and torn down on demand." },
    { term: "Deployment (Kubernetes)", def: "A controller that keeps a declared number of identical pods running and rolls out new versions gradually; it replaces RetailFlow's API pods with the new image without downtime." },
    { term: "Service (Kubernetes)", def: "A stable network endpoint and load balancer in front of a changing set of pods, so callers reach RetailFlow's scheduler by name even as pods come and go." },
    { term: "Helm", def: "A package manager for Kubernetes that templates and versions groups of manifests as installable charts; RetailFlow deploys Airflow to the cluster with one Helm release." },
    { term: "Chart (Helm)", def: "A versioned, parameterized package of Kubernetes templates plus default values; the same Airflow chart deploys to RetailFlow's dev and prod clusters with different value files." },
    { term: "Release (Helm)", def: "A specific installed instance of a chart with its resolved values and revision history, so RetailFlow can <code>helm rollback</code> a bad Airflow upgrade in one command." },
    { term: "GitOps", def: "An operating model where Git is the single source of truth for infrastructure, and an agent continuously reconciles the cluster to match the repo — merge to deploy, revert to roll back." },
    { term: "Argo CD", def: "A GitOps controller for Kubernetes that watches a Git repo and syncs the cluster to the declared state, showing RetailFlow whether prod matches <code>main</code> and self-healing drift." },
    { term: "Jenkins", def: "A veteran, self-hosted, plugin-driven automation server that runs CI/CD pipelines defined in a <code>Jenkinsfile</code>; still common where RetailFlow needs full control of build agents." },
    { term: "Secret", def: "A sensitive value — password, token, key — kept out of source and injected at runtime from a vault or CI secret store, so RetailFlow's warehouse credentials never live in Git." },
    { term: "OIDC", def: "OpenID Connect — lets a CI job prove its identity to the cloud and receive short-lived credentials, so RetailFlow's GitHub Actions deploy without any long-lived stored secret." },
    { term: "RBAC", def: "Role-Based Access Control — permissions granted to roles, not individuals, so RetailFlow's CI service principal can deploy the revenue job but not read customer PII." },
    { term: "Quality gate", def: "A pass/fail checkpoint (coverage, vulnerabilities, data tests) that must be green before a change may promote; RetailFlow's gate blocks any PR where the revenue tests fail." },
    { term: "Data quality", def: "The measured fitness of data — accuracy, completeness, uniqueness, freshness, validity — checked in the pipeline so a wrong <code>net_revenue</code> is caught before the dashboard, not by finance." },
    { term: "Rollback", def: "Returning to a known-good previous version after a bad deploy; RetailFlow rolls back <i>code</i> by redeploying the prior image, and <i>data</i> by restoring or reprocessing affected partitions." },
    { term: "Blue/green", def: "Running two identical environments (blue live, green idle), deploying to the idle one, then switching traffic instantly — RetailFlow can flip back to blue the moment green misbehaves." },
    { term: "Canary", def: "Releasing a change to a small slice of traffic or data first, watching metrics, then widening; RetailFlow could route 5% of revenue processing to the new logic before full rollout." },
    { term: "GitHub", def: "A hosted platform for Git repositories adding pull requests, reviews, Actions, and access control; the shared home where RetailFlow's revenue fix is reviewed and CI runs." },
    { term: "GitHub Actions", def: "GitHub's built-in CI/CD, defined as YAML workflows triggered by repo events; RetailFlow's <code>on: pull_request</code> workflow runs dbt tests before anyone can merge." },
    { term: "Azure DevOps", def: "Microsoft's integrated suite of Repos, Pipelines, Boards, and Artifacts; RetailFlow teams on Azure often run their build-test-deploy pipeline here instead of GitHub Actions." },
    { term: "SonarQube", def: "A static-analysis platform that scores code quality, coverage, and security and enforces a quality gate; it can block RetailFlow's PR when the new transform drops below thresholds." },
    { term: "pytest", def: "Python's dominant testing framework; RetailFlow uses it to unit-test the revenue transform logic (including PySpark functions) so a broken calculation fails CI." },
    { term: "Airflow", def: "A workflow orchestrator that schedules and monitors pipelines as Python-defined DAGs; RetailFlow's nightly revenue run is an Airflow DAG deployed through CI/CD." },
    { term: "Container Registry", def: "A dedicated store (ACR, ECR, GHCR, Docker Hub) for pushing and pulling versioned images; every RetailFlow environment pulls the same immutable revenue-pipeline image from it." },
    { term: "Environment", def: "A named, isolated stage — dev, staging, prod — with its own data, secrets, and approvals, so RetailFlow validates the revenue change in staging before it touches real dashboards." },
    { term: "Environment promotion", def: "Moving the <i>same</i> validated artifact through dev → staging → prod with config swapped per stage, never rebuilding, so what shipped is exactly what was tested." },
    { term: "Staging area (Git)", def: "The set of changes marked with <code>git add</code> to include in the next commit — a preview of the commit before you make it, separating what you edited from what you'll save." },
    { term: "Remote", def: "A shared copy of the repository (usually <code>origin</code> on GitHub) that the team pushes to and pulls from to stay in sync on the revenue pipeline." },
    { term: "Immutable artifact", def: "A build output that is never modified after creation — only replaced by a new version — so RetailFlow's prod always runs a byte-for-byte copy of what CI tested." },
    { term: "Idempotency", def: "An operation that yields the same result whether run once or many times; a rerun of RetailFlow's revenue job for a given day must not double-count the revenue." },
    { term: "Schema change", def: "An alteration to a table's columns or types (like renaming <code>refund_amount</code>) that can silently break the revenue model — handled with contracts, migrations, and CI checks." },
    { term: "Manifest (dbt)", def: "The compiled JSON graph dbt emits describing every model, test, and dependency; RetailFlow's CI diffs it to run only the models affected by a change (Slim CI)." },
    { term: "Workflow", def: "A defined, automated process in a CI/CD tool (a GitHub Actions <code>.yml</code>, an Azure pipeline) triggered by events, encoding how RetailFlow builds, tests, and ships changes." }
  ];

  function passes(item, q) {
    return item.term.toLowerCase().indexOf(q) !== -1 ||
           item.def.toLowerCase().indexOf(q) !== -1;
  }

  NS.registerModule({
    id: "glossary",
    title: "Glossary",

    render: function (container) {
      var itemsHtml = DATA.map(function (it) {
        return '<div class="gloss-item">' +
          '<div class="gloss-item-head"><div class="gloss-term">' + it.term + '</div></div>' +
          '<div class="gloss-def">' + it.def + '</div>' +
        '</div>';
      }).join("");

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Learning · Reference</div>' +
          '<h1 class="module-title gradient-text">Glossary</h1>' +
          '<p class="module-subtitle">Every core term behind RetailFlow’s Daily Revenue Pipeline, from ' +
          '<code>git commit</code> to canary release. Filter to jump straight to what you need.</p>' +
        '</div>' +
        '<div class="gloss-toolbar">' +
          '<input type="text" class="gloss-search" placeholder="Filter terms…" aria-label="Filter glossary terms" />' +
          '<span class="gloss-count"></span>' +
        '</div>' +
        '<div class="gloss-list">' + itemsHtml + '</div>' +
        '<div class="gloss-empty" style="display:none;">No terms match your filter.</div>';

      var input = container.querySelector(".gloss-search");
      var items = container.querySelectorAll(".gloss-item");
      var count = container.querySelector(".gloss-count");
      var empty = container.querySelector(".gloss-empty");

      function update() {
        var q = input.value.trim().toLowerCase();
        var shown = 0;
        for (var i = 0; i < items.length; i++) {
          var match = !q || passes(DATA[i], q);
          items[i].style.display = match ? "" : "none";
          if (match) shown++;
        }
        count.textContent = shown + " of " + DATA.length + " terms";
        empty.style.display = shown === 0 ? "" : "none";
      }

      this._input = input;
      this._handler = update;
      input.addEventListener("input", update);
      update();
    },

    destroy: function () {
      if (this._input && this._handler) {
        this._input.removeEventListener("input", this._handler);
      }
      this._input = null;
      this._handler = null;
    }
  });
})();
