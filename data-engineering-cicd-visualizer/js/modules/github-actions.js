/* modules/github-actions.js — Tier 2 · GitHub Actions (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "github-actions",
    title: "GitHub Actions",
    tool: "--tool-ci",
    icon: "🔄",
    eyebrow: "Tier 2 · Data Engineering CI/CD",
    subtitle: "The robot that runs on every push — lint, test, and dbt-check RetailFlow's revenue pipeline automatically, so a broken change is caught in minutes, not at 7 AM.",
    mentalImage: "ROBOT ON EVERY PUSH",

    flowTitle: "The CI workflow on each push",
    flow: ["push", "checkout", "setup Python", "install deps", "lint", "pytest", "dbt test", "docker build", "artifact"],

    why: "Manual testing doesn't scale: humans forget to run the suite, run it on the wrong branch, or skip it under deadline. Every unchecked push is a chance for the refund bug to reach production.",
    what: "GitHub Actions is <b>CI/CD automation built into GitHub</b>: you describe workflows in YAML, and GitHub runs them on real machines whenever an event (push, PR, schedule) fires.",
    how: "An <b>event</b> triggers a <b>workflow</b>; the workflow runs <b>jobs</b> on <b>runners</b>; each job runs <b>steps</b> (shell commands or reusable <b>actions</b>) and can produce <b>artifacts</b> and gate deploys behind <b>approval</b>.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "GitHub Actions is a <b>tireless robot teammate</b>. Every time someone pushes code, it checks out the repo, installs everything, and runs the tests — reporting green or red right on the pull request." },
        { h: "Workflow = a recipe file", body: "You put a YAML file in <code>.github/workflows/</code>. It lists <b>on</b> (when to run), and <b>jobs</b> → <b>steps</b> (what to do). GitHub reads it and does the work on a fresh virtual machine called a <b>runner</b>." },
        { h: "RetailFlow example", body: "When the engineer pushes the net-revenue fix, the workflow runs <code>pytest</code> automatically. If <code>test_net_revenue</code> fails, the PR shows a red X and the merge stays blocked." }
      ],
      intermediate: [
        { h: "Jobs, steps & actions", body: "A <b>job</b> is a group of <b>steps</b> on one runner. A <b>step</b> is either a shell command (<code>run:</code>) or an <b>action</b> — a reusable package like <code>actions/checkout@v4</code> or <code>actions/setup-python@v5</code>. Jobs run in parallel unless you add <code>needs:</code>." },
        { h: "Matrix, cache & artifacts", body: "A <b>matrix</b> runs the same job across versions (Python 3.10/3.11/3.12) in parallel. <b>Cache</b> (<code>actions/cache</code>) speeds up repeated pip installs. <b>Artifacts</b> (<code>upload-artifact</code>) save build outputs — the test report, the coverage file, the Docker image tag." },
        { h: "Secrets & environments", body: "Reference credentials as <code>${{ secrets.DATABRICKS_TOKEN }}</code> — encrypted and masked in logs. Tie a deploy job to an <b>environment</b> (prod) that requires manual <b>approval</b> before it runs, giving a human the final say on production." }
      ],
      proficient: [
        { h: "Reusable & composite workflows", body: "Factor shared CI into a <b>reusable workflow</b> (<code>on: workflow_call</code>) that every RetailFlow repo calls — one place to fix the test setup. Composite actions bundle repeated steps. DRY beats copy-pasting YAML across 20 repos." },
        { h: "Status checks as merge gates", body: "Each job publishes a <b>status check</b>. Mark <code>test</code> and <code>lint</code> as <b>required</b> in branch protection — now the merge button is literally wired to the robot's verdict, not a promise that someone ran tests locally." },
        { h: "Runners, cost & security", body: "GitHub-hosted runners are convenient; <b>self-hosted</b> runners reach private VPC data warehouses but must be hardened. Pin actions to a commit SHA (not a moving tag), use OIDC instead of stored cloud keys, and scope <code>permissions:</code> to least privilege." }
      ]
    },

    micro: ["workflow", "event", "trigger", "job", "runner", "step", "action", "uses", "run", "matrix",
      "artifact", "cache", "secret", "variable", "environment", "approval", "needs", "reusable workflow",
      "status check", "concurrency", "permissions", "OIDC"],

    before: ["\"did you run the tests?\"", "tests skipped under deadline", "broken merge to main", "found broken at 7 AM", "manual deploys"],
    after: ["tests run on every push", "red X blocks merge", "matrix across versions", "artifacts saved", "gated prod deploy"],

    failure: {
      title: "The refund bug caught by CI before merge",
      steps: ["push net-revenue change", "checkout + setup-python", "pip install", "pytest runs", "test_net_revenue fails ❌", "PR merge blocked"],
      explain: "The engineer's own unit test asserts <code>net_revenue == gross - refunds</code>. On push, Actions runs it automatically; the failing assertion turns the required status check red, and branch protection refuses the merge — the pipeline caught its own bug in ~90 seconds."
    },

    whenNot: "Actions isn't a general-purpose job scheduler or an orchestrator for long data pipelines — use Airflow/Databricks for that. It's for CI/CD around your code: build, test, and deploy triggered by repository events, not for running your nightly 3-hour Spark job.",

    story: {
      situation: "RetailFlow opens PR #482 with the corrected net-revenue formula.",
      problem: "Nobody wants to trust that the author remembered to run every test on the right branch and Python version.",
      decision: "A <code>ci.yml</code> workflow runs on every push: checkout, setup Python, install, lint, pytest, and dbt test.",
      tool: "GitHub Actions CI workflow wired as a required status check.",
      result: "Every push re-runs the full suite automatically; the PR shows a green check only when it's genuinely safe to merge.",
      remember: "CI isn't about running tests once — it's about running them <i>every single time</i>, automatically, so \"it works on my machine\" stops being the standard."
    },

    code: [{
      title: ".github/workflows/ci.yml — run tests on every push",
      lang: "yaml",
      code: "name: CI\n" +
            "on:\n" +
            "  push:\n" +
            "  pull_request:\n" +
            "    branches: [main]\n" +
            "jobs:\n" +
            "  test:\n" +
            "    runs-on: ubuntu-latest\n" +
            "    strategy:\n" +
            "      matrix:\n" +
            "        python-version: [\"3.11\", \"3.12\"]\n" +
            "    steps:\n" +
            "      - uses: actions/checkout@v4\n" +
            "      - uses: actions/setup-python@v5\n" +
            "        with:\n" +
            "          python-version: ${{ matrix.python-version }}\n" +
            "      - name: Install deps\n" +
            "        run: pip install -r requirements.txt\n" +
            "      - name: Lint\n" +
            "        run: ruff check .\n" +
            "      - name: Run tests\n" +
            "        run: pytest -q\n" +
            "      - name: dbt tests\n" +
            "        run: dbt test --select revenue",
      highlights: [13, 14, 22]
    }],

    remember: "One YAML file in <code>.github/workflows/</code> turns every push into checkout → install → lint → test → build — the same steps, every time, gating the merge on a green result.",

    retention: {
      question: "RetailFlow wants the revenue test suite to run automatically on every push and block the merge if it fails. Which GitHub Actions pieces make that happen?",
      answer: "A <b>workflow</b> triggered by the <code>push</code>/<code>pull_request</code> <b>event</b>, with a <b>job</b> whose <b>steps</b> checkout, install, and run <code>pytest</code>. Marking that job's <b>status check</b> as <b>required</b> in branch protection wires the green result to the merge button."
    }
  }));
})();
