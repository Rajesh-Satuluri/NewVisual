/* modules/quiz.js — Learning · interactive quiz across the CI/CD stack */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  var DATA = [
    { q: "RetailFlow's pipeline passes all unit tests but the dbt uniqueness test fails. Should Terraform still deploy infrastructure?", options: ["Yes, infra is separate", "No — the quality gate should block promotion", "Only in prod", "Skip the dbt test"], answer: 1, explain: "The quality gate blocks promotion because a data-transformation check failed; deploying anyway risks bad data in production." },
    { q: "An engineer needs to change net_revenue while the nightly pipeline runs in prod. What lets them work safely?", options: ["Edit main directly", "A feature branch", "Delete the pipeline", "A hotfix in the console"], answer: 1, explain: "A feature branch isolates the risky change from main until it's reviewed and CI-tested." },
    { q: "What is the correct order a change moves through in Git locally?", options: ["Commit → stage → working dir", "Working dir → staging → commit", "Push → commit → add", "Staging → push → commit"], answer: 1, explain: "You edit in the working directory, stage with git add, then snapshot with git commit." },
    { q: "Which best distinguishes a Docker image from a container?", options: ["Image runs, container is the blueprint", "They're identical", "Image is the immutable blueprint, container is a running instance", "Container is stored in Git"], answer: 2, explain: "An image is the immutable blueprint; a container is a running, writable instance of it." },
    { q: "RetailFlow wants prod to run exactly what CI tested. Which practice guarantees it?", options: ["Rebuild per environment", "Build once, promote the same artifact", "Use the latest tag everywhere", "Edit prod by hand"], answer: 1, explain: "Building one immutable artifact and promoting it unchanged ensures prod matches what was validated." },
    { q: "Terraform's plan shows it will destroy and recreate the warehouse after a rename. Best response?", options: ["Auto-apply, it's fine", "Use a moved block or import to avoid recreation", "Delete the state file", "Ignore the plan"], answer: 1, explain: "A moved block (or state import) preserves the existing resource instead of destroying stateful data." },
    { q: "What is Terraform state?", options: ["The cloud console UI", "A record mapping config to real managed resources", "A Git branch", "A Docker layer"], answer: 1, explain: "State records which real resources Terraform manages and their attributes, enabling accurate diffs." },
    { q: "Someone changed the cluster size in the console. Terraform now reports a diff. This is called?", options: ["A merge conflict", "Configuration drift", "A canary", "A rollback"], answer: 1, explain: "Drift is when real infrastructure diverges from the code; terraform plan surfaces it." },
    { q: "RetailFlow's CI should run dbt tests on which event to protect main?", options: ["Only nightly", "On every pull request", "After deploying to prod", "Never automatically"], answer: 1, explain: "Running data tests on each PR catches a broken transform before it can be merged." },
    { q: "The revenue job reran and doubled the day's revenue. Which property was missing?", options: ["Idempotency", "Encryption", "Compression", "Sharding"], answer: 0, explain: "An idempotent job overwrites the day's partition so a rerun never double-counts." },
    { q: "Which is the safest way for CI to authenticate to the cloud?", options: ["A long-lived stored key", "OIDC short-lived credentials", "Hardcoded in the workflow", "A shared admin password"], answer: 1, explain: "OIDC issues ephemeral, scoped credentials so there's no long-lived secret to leak." },
    { q: "A dbt test fails after deploy but the job succeeded. What does this reveal?", options: ["Nothing, job success is enough", "A green pipeline can still produce wrong data", "The test is broken", "Prod is fine"], answer: 1, explain: "Job success only means it ran; data-quality tests catch silently wrong numbers." },
    { q: "Rolling back the code artifact after a bad revenue release will...", options: ["Also fix the wrong rows already written", "Not fix the incorrect data already in tables", "Delete the warehouse", "Rotate secrets"], answer: 1, explain: "Code rollback restores the logic; the bad data already written must be reprocessed or restored separately." },
    { q: "Which describes CI vs CD most accurately?", options: ["CI deploys, CD tests", "CI builds/tests changes, CD delivers/deploys them", "They're the same", "CD runs before CI"], answer: 1, explain: "Continuous Integration builds and tests; Continuous Delivery/Deployment promotes the validated result." },
    { q: "RetailFlow uses one warehouse and wants blue/green. Where do they isolate?", options: ["Separate physical servers only", "At the schema/view layer, swapping consumers", "By deleting prod", "In Git branches"], answer: 1, explain: "With a shared warehouse you build into a green schema and atomically repoint views to cut over." },
    { q: "What best defines a canary release for a data transformation?", options: ["Deploy to everyone at once", "Run new logic on a sample/shadow and compare before widening", "Skip testing", "Only run in dev forever"], answer: 1, explain: "A data canary validates output correctness on a subset or in shadow mode before full rollout." },
    { q: "500 Airflow DAGs — how should CI scale testing?", options: ["Re-test every DAG on every change", "Test only changed DAGs plus import checks", "Never test DAGs", "Test only in prod"], answer: 1, explain: "Testing only affected DAGs keeps CI fast; import/lint checks catch parse errors cheaply." },
    { q: "A single DAG with an import error can...", options: ["Only affect itself", "Halt scheduling for all DAGs", "Improve performance", "Roll back automatically"], answer: 1, explain: "A parse-time error can block the scheduler, so CI should run a DagBag import test." },
    { q: "Which tool watches a Git repo and reconciles a Kubernetes cluster to match it?", options: ["Jenkins", "Argo CD", "pytest", "Terraform"], answer: 1, explain: "Argo CD is a GitOps controller that pulls the cluster into the state declared in Git." },
    { q: "What is a Helm chart?", options: ["A running container", "A versioned, parameterized package of Kubernetes templates", "A Git commit", "A dbt model"], answer: 1, explain: "A chart bundles templated manifests with default values; an install of it is a release." },
    { q: "You need to roll back a bad Airflow Helm upgrade fast. Best option?", options: ["Rebuild the cluster", "helm rollback to the previous revision", "Edit live pods by hand", "Delete the namespace"], answer: 1, explain: "Helm tracks release revisions, so helm rollback restores the previous known-good state." },
    { q: "Where should RetailFlow's warehouse password live?", options: ["In the repo", "In a build ARG in the image", "In a secret store, injected at runtime", "In the DAG file"], answer: 2, explain: "Secrets belong in a vault/secret store and are injected at runtime, never baked into code or images." },
    { q: "Why avoid passing a secret as a Docker build ARG?", options: ["It's faster but insecure", "It persists in image layers and can be extracted", "ARGs don't exist", "It encrypts automatically"], answer: 1, explain: "Build ARGs are recorded in image history, exposing the secret to anyone who pulls the image." },
    { q: "What does RBAC enforce for a CI deploy identity?", options: ["Maximum permissions", "Least-privilege, role-scoped access", "No permissions at all", "Only human access"], answer: 1, explain: "RBAC grants only the permissions the role needs — the deploy identity can ship the job but not read PII." },
    { q: "Which artifact does dbt Slim CI compare against to run only affected models?", options: ["The Git branch", "The production manifest (state)", "The Dockerfile", "Terraform state"], answer: 1, explain: "Slim CI diffs against the stored prod manifest to select state:modified+ models." },
    { q: "RetailFlow renames refund_amount in one PR and the revenue model breaks instantly. Better approach?", options: ["Rename and hope", "Expand-and-contract with a contract and backfill", "Never change schemas", "Rename in prod only"], answer: 1, explain: "Expand/contract adds the new column, migrates readers, then drops the old — avoiding a hard break." },
    { q: "A pytest suite for a PySpark transform should ideally run against...", options: ["The full production warehouse", "Small local DataFrame fixtures", "No data", "Only prod on Fridays"], answer: 1, explain: "Small local fixtures make Spark unit tests fast and deterministic while still catching logic bugs." },
    { q: "What is a quality gate?", options: ["A network firewall", "A pass/fail checkpoint that must be green before promotion", "A Git remote", "A Docker registry"], answer: 1, explain: "A quality gate aggregates checks (tests, coverage, data quality) and blocks promotion on failure." },
    { q: "Which correctly pairs the tool with its role?", options: ["Docker orchestrates clusters", "Kubernetes builds images", "Docker builds/runs containers; Kubernetes orchestrates them", "Both do the same thing"], answer: 2, explain: "Docker builds and runs individual containers; Kubernetes schedules and manages many across a cluster." },
    { q: "When is Kubernetes likely overkill for RetailFlow?", options: ["Thousands of bursty multi-tenant jobs", "A handful of nightly batch jobs on managed services", "Global elastic workloads", "Complex custom orchestration"], answer: 1, explain: "For a few nightly jobs, managed services avoid Kubernetes' significant operational overhead." },
    { q: "GitOps rollback is performed by...", options: ["SSHing into nodes", "Reverting the commit in Git so the controller reconciles back", "Deleting the cluster", "Editing pods manually"], answer: 1, explain: "In GitOps, Git is the source of truth — reverting the commit makes Argo CD sync back to the good state." },
    { q: "Which registry practice ensures every environment runs identical software?", options: ["Pull by the latest tag", "Pull by immutable digest/SHA tag", "Rebuild per environment", "Skip the registry"], answer: 1, explain: "Pinning by digest guarantees the exact same image bytes run everywhere, unlike the moving latest tag." },
    { q: "SonarQube primarily adds which capability to a pipeline?", options: ["Container orchestration", "Static analysis and an enforceable quality gate", "Secret rotation", "DAG scheduling"], answer: 1, explain: "SonarQube scans for bugs, smells, coverage, and vulnerabilities and can fail the build on its gate." },
    { q: "A change spans infra, code, and data. Safest deploy order?", options: ["Data, then code, then infra", "Infra + backward-compatible code first, then data models, flag last", "All at once", "Random order"], answer: 1, explain: "Deploying infra and compatible code before dependent data models keeps every step independently revertible." },
    { q: "Which is a valid reason to choose Continuous Delivery over Deployment?", options: ["You never want to deploy", "You want a manual approval gate before prod", "Tests are optional", "You dislike automation"], answer: 1, explain: "Delivery keeps a human approval step before production; deployment auto-ships every green build." },
    { q: "RetailFlow's revenue deviates from forecast but the job 'succeeded'. What should have alerted?", options: ["Only job-failure monitoring", "A data-quality/anomaly check on the output", "Nothing", "A Git hook"], answer: 1, explain: "Monitoring correctness (anomaly/range checks), not just job success, catches silently wrong numbers." },
    { q: "Why pin third-party GitHub Actions to a commit SHA?", options: ["It's shorter", "A tag can be moved to malicious code; a SHA is immutable", "SHAs run faster", "Tags don't work"], answer: 1, explain: "A mutable tag could be repointed to compromised code; pinning by SHA locks the exact reviewed version." },
    { q: "How should RetailFlow promote a data model between environments?", options: ["Copy the prod table to staging", "Promote the transformation SQL and rebuild each env's tables", "Email the CSV", "Never promote"], answer: 1, explain: "You promote the versioned transformation and let each environment build its own tables from its own data." },
    { q: "What makes reprocessing three bad days cheap in a medallion architecture?", options: ["Mutating gold in place", "Immutable bronze that silver/gold can be recomputed from", "Deleting bronze", "No partitioning"], answer: 1, explain: "Immutable, partitioned bronze lets you deterministically rebuild curated layers for any affected day." },
    { q: "Zero-downtime dbt deploy on a live warehouse is best done by...", options: ["dbt run directly on prod tables", "Building into a shadow schema and atomically swapping views", "Dropping tables first", "Running at 7 AM"], answer: 1, explain: "Building in a shadow schema and swapping views keeps consumers from ever seeing half-built tables." },
    { q: "A Databricks Asset Bundle target lets you...", options: ["Rename Git branches", "Override workspace, cluster, and schedule per environment", "Encrypt the repo", "Replace Terraform"], answer: 1, explain: "Targets (dev/staging/prod) swap environment-specific settings while deploying the same bundle definition." },
    { q: "Which metric set best reflects delivery health (DORA)?", options: ["CPU and RAM only", "Deploy frequency, lead time, change-fail rate, MTTR", "Lines of code", "Number of branches"], answer: 1, explain: "The four DORA metrics measure delivery performance — though data pipelines also need data-correctness signals." },
    { q: "A merge conflict occurs when...", options: ["You push too often", "Two branches change the same lines", "A test fails", "The registry is down"], answer: 1, explain: "Git can't auto-merge overlapping edits to the same lines, so you resolve them manually." },
    { q: "Rebase is inappropriate when...", options: ["Cleaning up your local branch", "The branch is already shared and others have pulled it", "Before opening a PR", "On an unpushed commit"], answer: 1, explain: "Rebasing rewrites history; doing it on a shared branch breaks everyone else's copy." },
    { q: "Which best secures an ephemeral CI runner?", options: ["Reuse it for many jobs with cached secrets", "Fresh isolated runner per job, no persistent state", "Give it admin rights", "Store keys on disk"], answer: 1, explain: "Ephemeral, isolated runners limit blast radius so one compromised job can't taint others." },
    { q: "To validate a Helm/Argo change before it hits the cluster, you should...", options: ["Apply straight to prod", "Template, dry-run, and diff the rendered manifests in the PR", "Delete the chart", "Skip review"], answer: 1, explain: "Rendering and diffing manifests catches mistakes before the controller applies them to the cluster." },
    { q: "What does 'promote the same immutable artifact' prevent?", options: ["Faster deploys", "Prod running untested bits from a per-environment rebuild", "Any testing", "Using a registry"], answer: 1, explain: "Reusing one artifact means what reached prod is byte-for-byte what CI validated." }
  ];

  NS.registerModule({
    id: "quiz",
    title: "Quiz",

    render: function (container) {
      var self = this;
      var idx = 0;
      var score = 0;
      var answered = false;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Learning · Check Yourself</div>' +
          '<h1 class="module-title gradient-text">Quiz</h1>' +
          '<p class="module-subtitle">Scenario, debugging, and architecture questions across the whole ' +
          'RetailFlow CI/CD stack. Answer, see why, and get your score at the end.</p>' +
        '</div>' +
        '<div class="quiz-shell"></div>';

      var shell = container.querySelector(".quiz-shell");

      function letter(i) { return String.fromCharCode(65 + i); }

      function drawQuestion() {
        answered = false;
        var item = DATA[idx];
        var pct = Math.round((idx / DATA.length) * 100);
        shell.innerHTML =
          '<div class="quiz-progress">' +
            '<span class="quiz-counter">Q ' + (idx + 1) + ' / ' + DATA.length + '</span>' +
            '<div class="quiz-bar"><div class="quiz-bar-fill" style="width:' + pct + '%;"></div></div>' +
            '<span class="quiz-score">Score: ' + score + '</span>' +
          '</div>' +
          '<div class="quiz-card">' +
            '<div class="quiz-q">' + item.q + '</div>' +
            '<div class="quiz-options">' +
              item.options.map(function (opt, i) {
                return '<button class="quiz-option" data-i="' + i + '">' +
                  '<span class="quiz-opt-key">' + letter(i) + '</span>' +
                  '<span class="quiz-opt-text">' + opt + '</span>' +
                '</button>';
              }).join("") +
            '</div>' +
            '<div class="quiz-fb-mount"></div>' +
          '</div>';

        var opts = shell.querySelectorAll(".quiz-option");
        opts.forEach(function (btn) {
          btn.addEventListener("click", function () {
            if (answered) return;
            answered = true;
            var chosen = parseInt(btn.getAttribute("data-i"), 10);
            var correct = DATA[idx].answer;
            if (chosen === correct) score++;
            opts.forEach(function (b) {
              b.disabled = true;
              var bi = parseInt(b.getAttribute("data-i"), 10);
              if (bi === correct) b.classList.add("quiz-correct");
              else if (bi === chosen) b.classList.add("quiz-wrong");
            });
            var right = chosen === correct;
            var mount = shell.querySelector(".quiz-fb-mount");
            var last = idx === DATA.length - 1;
            mount.innerHTML =
              '<div class="quiz-feedback ' + (right ? 'quiz-fb-right' : 'quiz-fb-wrong') + '">' +
                '<div class="quiz-fb-head">' + (right ? '✓ Correct' : '✗ Not quite') + '</div>' +
                '<p>' + DATA[idx].explain + '</p>' +
                '<button class="btn btn-primary quiz-next">' + (last ? 'See results' : 'Next question') + '</button>' +
              '</div>';
            var scoreEl = shell.querySelector(".quiz-score");
            if (scoreEl) scoreEl.textContent = 'Score: ' + score;
            var next = shell.querySelector(".quiz-next");
            next.addEventListener("click", function () {
              if (last) drawResult();
              else { idx++; drawQuestion(); }
            });
          });
        });
      }

      function drawResult() {
        var pct = Math.round((score / DATA.length) * 100);
        var verdict;
        if (pct >= 90) verdict = "Outstanding — you could deploy RetailFlow's pipeline blindfolded.";
        else if (pct >= 70) verdict = "Strong — solid grasp of the CI/CD stack, a few edges to sharpen.";
        else if (pct >= 50) verdict = "Getting there — revisit the modules on the ones you missed.";
        else verdict = "Early days — walk through the concept modules, then try again.";

        shell.innerHTML =
          '<div class="quiz-card quiz-result">' +
            '<div class="quiz-result-score">' + score + ' / ' + DATA.length + '</div>' +
            '<div class="quiz-result-pct">' + pct + '%</div>' +
            '<div class="quiz-result-verdict">' + verdict + '</div>' +
            '<button class="btn btn-primary quiz-restart">Restart quiz</button>' +
          '</div>';
        shell.querySelector(".quiz-restart").addEventListener("click", function () {
          idx = 0; score = 0; answered = false; drawQuestion();
        });
      }

      self._reset = function () { idx = 0; score = 0; answered = false; };
      drawQuestion();
    },

    destroy: function () {
      // Listeners live on DOM inside the module container, which the router
      // clears on teardown; nothing global to remove.
    }
  });
})();
