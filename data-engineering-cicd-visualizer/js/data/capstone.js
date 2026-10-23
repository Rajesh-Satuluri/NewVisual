/* ============================================================
   capstone.js — DECICDViz.Capstone
   The RetailFlow capstone: one coherent reference project that ties
   the whole curriculum together as 14 progressive milestones. Each
   milestone has a goal, what you build, the lessons/labs it draws on,
   objective acceptance criteria, and a reproducible reference snippet.

   HONESTY: the repository structure and snippets are an ILLUSTRATIVE
   reference — they are not generated on disk here and nothing is
   executed in the browser. They are the exact files/commands you would
   run locally to reproduce the supported workflow.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  var MILESTONES = [
    { n: 1, title: "Fix the net-revenue calculation",
      goal: "Correct the revenue formula and prove it with a test.",
      builds: "A corrected <code>transforms/revenue.py</code> and a failing-then-passing unit test.",
      lessons: ["git", "pytest"], labs: [],
      acceptance: [
        "net_revenue subtracts refunds (not adds).",
        "A pytest asserts net_revenue(100,20)==80 and fails on the old code.",
        "The fix is on a branch, not committed directly to main."
      ],
      snippet: { lang: "python", code: "# transforms/revenue.py\ndf = df.withColumn(\"net_revenue\",\n    F.col(\"gross_revenue\") - F.col(\"refund_amount\"))\n\n# tests/test_revenue.py\ndef test_net_revenue():\n    assert net_revenue(100, 20) == 80" } },
    { n: 2, title: "Git history, a feature branch, and a PR",
      goal: "Put the change through version control and review.",
      builds: "A feature branch, focused commits, and a pull request.",
      lessons: ["git", "github", "branching"], labs: [],
      acceptance: [
        "Work is on feature/fix-net-revenue, not main.",
        "Commits are focused with clear messages.",
        "A PR is opened targeting main."
      ],
      snippet: { lang: "bash", code: "git checkout -b feature/fix-net-revenue\ngit add transforms/revenue.py tests/test_revenue.py\ngit commit -m \"Fix net revenue: subtract refunds, not add\"\ngit push -u origin feature/fix-net-revenue\n# open PR #482 → main" } },
    { n: 3, title: "Automated Python and SQL validation",
      goal: "Add tests that run in the project, not just locally.",
      builds: "pytest unit tests + SQL assertion queries for the revenue table.",
      lessons: ["pytest", "sql-testing", "testing-pyramid"], labs: ["gate-the-test"],
      acceptance: [
        "Unit tests cover the transform logic and edge cases.",
        "A SQL assertion checks order_id uniqueness and non-negative revenue.",
        "Tests fail on a deliberately broken formula."
      ],
      snippet: { lang: "sql", code: "-- sql/assert_revenue.sql (fails => returns rows)\nselect order_id, count(*) c\nfrom gold.daily_revenue group by order_id having count(*) > 1;" } },
    { n: 4, title: "A working CI workflow",
      goal: "Run install → lint → test on every push, gating the merge.",
      builds: "<code>.github/workflows/ci.yml</code> with caching and a required check.",
      lessons: ["github-actions", "cli-yaml-deps", "ci-vs-cd"], labs: ["cache-deps-guided", "gate-the-test"],
      acceptance: [
        "CI triggers on push and pull_request to main.",
        "Steps: checkout → setup-python(cache) → install → lint → pytest.",
        "The test job is a required status check in branch protection."
      ],
      snippet: { lang: "yaml", code: "on: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-python@v5\n        with: { python-version: \"3.11\", cache: pip }\n      - run: pip install -r requirements.lock\n      - run: ruff check . && pytest -q" } },
    { n: 5, title: "Data-quality checks and dbt tests",
      goal: "Validate the data, not just the code.",
      builds: "dbt tests + freshness/completeness gates before publish.",
      lessons: ["data-quality", "dbt-cicd", "sql-testing"], labs: ["freshness-check", "dbt-incremental"],
      acceptance: [
        "dbt schema tests (unique, not_null) on key columns.",
        "A freshness gate blocks publish if the source is stale/incomplete.",
        "A reconciliation check ties revenue to the payments ledger."
      ],
      snippet: { lang: "yaml", code: "# dbt models/schema.yml\nmodels:\n  - name: daily_revenue\n    columns:\n      - name: order_id\n        tests: [unique, not_null]\n      - name: net_revenue\n        tests:\n          - dbt_utils.accepted_range: { min_value: 0 }" } },
    { n: 6, title: "Validate Airflow DAGs and dependencies",
      goal: "Catch DAG import/parse errors in CI before the scheduler does.",
      builds: "A DAG import test and structure assertions.",
      lessons: ["airflow-cicd"], labs: ["airflow-import"],
      acceptance: [
        "A test imports every DAG and asserts no import errors.",
        "Task dependencies and schedule are asserted.",
        "CI runs the DAG tests."
      ],
      snippet: { lang: "python", code: "# tests/test_dags.py\nfrom airflow.models import DagBag\ndef test_no_import_errors():\n    assert DagBag().import_errors == {}" } },
    { n: 7, title: "Package and identify a versioned release",
      goal: "Build one immutable artifact with a traceable identity.",
      builds: "A Docker image pinned by digest, tagged to the source SHA.",
      lessons: ["artifact-lifecycle", "docker", "container-registry"], labs: ["dockerfile-fix"],
      acceptance: [
        "A multi-stage Dockerfile with pinned base and deps.",
        "The image is tagged with the source commit SHA.",
        "The deployable reference is the digest, not a moving tag."
      ],
      snippet: { lang: "bash", code: "docker build -t registry/revenue-processor:sha-9f3c1 .\ndocker push registry/revenue-processor:sha-9f3c1\n# record the digest for promotion\ndocker inspect --format '{{index .RepoDigests 0}}' registry/revenue-processor:sha-9f3c1" } },
    { n: 8, title: "Deploy to development and staging",
      goal: "Promote the same artifact through non-prod environments.",
      builds: "Environment-specific config + a Databricks bundle target per env.",
      lessons: ["environment-promotion", "databricks-bundles"], labs: [],
      acceptance: [
        "The same artifact digest is deployed to dev then staging.",
        "Configuration differs per environment; the artifact does not.",
        "A post-deploy smoke test runs in each environment."
      ],
      snippet: { lang: "bash", code: "databricks bundle deploy -t dev\n./scripts/smoke_test.sh dev\ndatabricks bundle deploy -t staging   # SAME artifact, env config overrides" } },
    { n: 9, title: "Production approval and protected permissions",
      goal: "Gate prod behind a human and least-privilege access.",
      builds: "A protected prod environment with required reviewers.",
      lessons: ["environment-promotion", "security", "github"], labs: [],
      acceptance: [
        "The prod deploy job declares environment: prod.",
        "The environment requires a named reviewer's approval.",
        "Workflow permissions are least-privilege (contents: read)."
      ],
      snippet: { lang: "yaml", code: "permissions:\n  contents: read\njobs:\n  deploy-prod:\n    environment: prod   # required reviewers approve here\n    needs: [test, deploy-staging]" } },
    { n: 10, title: "Secrets management and secure authentication",
      goal: "Remove standing credentials; authenticate with OIDC.",
      builds: "OIDC-based cloud auth, no long-lived keys in secrets.",
      lessons: ["secrets", "security"], labs: ["secret-exposure", "secure-deploy-challenge"],
      acceptance: [
        "No cloud key is stored in secrets or printed in logs.",
        "The deploy assumes a role via OIDC (id-token: write).",
        "Third-party actions are pinned to a commit SHA."
      ],
      snippet: { lang: "yaml", code: "permissions:\n  id-token: write\n  contents: read\n# step: assume a cloud role via OIDC — no stored key" } },
    { n: 11, title: "Introduce a failed release and diagnose it",
      goal: "Practise incident response on a green-but-wrong release.",
      builds: "An investigation from symptom → evidence → root cause.",
      lessons: ["failure-simulator", "observability"], labs: ["stale-revenue-incident"],
      acceptance: [
        "You separate 'job healthy' from 'data correct'.",
        "You identify the true root cause from the evidence.",
        "You write a short incident timeline."
      ],
      snippet: { lang: "text", code: "Symptom: 7 AM revenue ~18% low, pipeline green.\nEvidence: source freshness gap + low row count; no recent deploy.\nRoot cause: ingestion outage → incomplete input." } },
    { n: 12, title: "Recover from incorrect or stale production data",
      goal: "Repair the data, not just the code.",
      builds: "A backfill/reconcile recovery and a prevention gate.",
      lessons: ["rollback", "data-quality"], labs: ["stale-revenue-incident"],
      acceptance: [
        "You distinguish code rollback from data recovery.",
        "You re-ingest/backfill the affected partitions and reconcile.",
        "You add a freshness+completeness gate to prevent recurrence."
      ],
      snippet: { lang: "bash", code: "./scripts/reingest.sh --window '03:00-05:00'\n./scripts/backfill.sh --date today\n./scripts/reconcile.sh --against payments_ledger   # verify before republish" } },
    { n: 13, title: "Infrastructure validation and deployment governance",
      goal: "Version and validate infra with guardrails.",
      builds: "Terraform plan/apply in CI with a destroy guard.",
      lessons: ["terraform", "security"], labs: ["terraform-guard"],
      acceptance: [
        "terraform fmt + validate + plan run in CI.",
        "Destructive changes require explicit approval (no silent destroy).",
        "Provider versions and remote state with locking are configured."
      ],
      snippet: { lang: "hcl", code: "terraform {\n  required_providers { aws = { version = \"~> 5.0\" } }\n  backend \"s3\" { /* remote state + DynamoDB lock */ }\n}" } },
    { n: 14, title: "Independent end-to-end release challenge",
      goal: "Ship one change through the whole pipeline on your own.",
      builds: "A complete change: branch → CI → tests → artifact → promote → verify.",
      lessons: ["ci-vs-cd", "environment-promotion", "end-to-end-pipeline"], labs: ["secure-deploy-challenge"],
      acceptance: [
        "A change travels branch → PR → CI → artifact → dev → staging → prod.",
        "Every gate (tests, data quality, approval) is enforced, not bypassed.",
        "Production is verified (reconciliation) and the release is traceable to a commit + digest."
      ],
      snippet: { lang: "text", code: "No walkthrough — design and defend the full release yourself,\nusing milestones 1–13 as your toolkit. Acceptance criteria above." } }
  ];

  NS.Capstone = {
    project: "retailflow-data-platform",
    note: "This is an illustrative reference project. The structure and snippets are the files/commands you would run locally — nothing is generated on disk or executed in the browser.",
    setup: [
      "git clone https://github.com/retailflow/retailflow-data-platform.git",
      "cd retailflow-data-platform",
      "python -m venv .venv && source .venv/bin/activate",
      "pip install -r requirements.lock",
      "pytest -q   # the test suite you extend across the milestones"
    ],
    milestones: MILESTONES
  };
})();
