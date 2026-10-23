/* modules/airflow-cicd.js — Tier 2 · Airflow CI/CD (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "airflow-cicd",
    title: "Airflow CI/CD",
    tool: "--tool-airflow",
    icon: "🌀",
    eyebrow: "Tier 2 · Data Engineering CI/CD",
    subtitle: "Shipping DAG code safely — RetailFlow's revenue DAG is import-tested and unit-tested in CI before the Airflow scheduler ever sees it.",
    mentalImage: "TEST THE DAG BEFORE IT SCHEDULES",

    flowTitle: "A DAG change moving to production",
    flow: ["Git PR", "DAG import test", "pytest", "lint", "Docker build", "deploy", "Airflow scheduler"],

    why: "RetailFlow once dropped a DAG file straight onto the scheduler. It had an import error, so the whole DAG folder failed to parse — the revenue pipeline silently didn't run and the 7 AM dashboard was blank.",
    what: "Airflow CI/CD is the <b>pipeline that tests and deploys DAG code</b> — not Airflow's internals. It proves a DAG imports, its logic is correct, and its dependencies are pinned before release.",
    how: "On every PR: import-test each DAG (does it parse?), run unit tests on the task logic, lint, build a Docker image with pinned deps, then deploy the DAGs to the Airflow environment.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "A DAG is just a Python file that defines a workflow. Before it goes live, CI asks two questions: <b>does it import?</b> and <b>is the logic right?</b> — the same way you'd test any code." },
        { h: "Why the import test matters", body: "Airflow parses every file in the DAGs folder. One broken import can stop <i>other</i> DAGs from loading too. The <b>DAG import test</b> catches this in CI so a typo never reaches the scheduler." },
        { h: "RetailFlow example", body: "The daily revenue DAG orchestrates: extract orders → run dbt transform → run data tests → refresh dashboard. CI verifies the file parses and the helper functions work before deploying it." }
      ],
      intermediate: [
        { h: "The three test layers", body: "<ul><li><b>Import/validation test:</b> load every DAG, assert no import errors and no cycles.</li><li><b>Unit tests:</b> test the Python functions your tasks call (the revenue logic), mocking Airflow context.</li><li><b>Structure asserts:</b> the DAG has the expected task ids and dependencies.</li></ul>" },
        { h: "Dependencies & env config", body: "Pin dependencies (<code>requirements.txt</code> / a Docker image) so the CI environment matches production exactly. Keep config out of code: connection strings and tuning come from <b>environment variables</b> and Airflow <b>Variables/Connections</b>, per environment." },
        { h: "Secrets & deployment", body: "Never hard-code the warehouse password in a DAG — pull it from a <b>secrets backend</b> (Vault, AWS Secrets Manager) via an Airflow Connection. Deployment ships the DAG files + image to the environment; a bad release is undone by <b>rolling back</b> to the previous image/commit." }
      ],
      proficient: [
        { h: "Fast, reliable DAG tests", body: "Use <code>DagBag(include_examples=False)</code> and assert <code>import_errors == {}</code> to fail CI on any parse error. Keep DAG files import-light: no warehouse calls or heavy work at parse time, so import tests stay milliseconds-fast and the scheduler parses quickly too." },
        { h: "Deployment models & rollback", body: "DAGs reach the environment by git-sync, a baked Docker image, or object storage. Immutable image deploys make rollback a redeploy of the prior tag. Blue/green or canary on a staging Airflow catches DAGs that parse but misbehave before prod." },
        { h: "Interview angle", body: "Senior signal: separate <i>testing the DAG structure</i> from <i>testing the business logic in the tasks</i>; pin and reproduce the runtime; manage secrets and env config outside code; and treat a DAG deploy like any software release — reviewed, tested, versioned, and reversible." }
      ]
    },

    micro: ["DAG validation", "import test", "DagBag", "unit test", "task logic test", "dependency pinning",
      "environment variables", "Airflow Variables/Connections", "secrets backend", "Docker image", "deployment", "rollback", "lint"],

    before: ["DAG dropped on scheduler", "import error breaks parsing", "revenue DAG silently skipped", "unpinned deps", "secrets in code"],
    after: ["import-tested in CI", "task logic unit-tested", "pinned reproducible image", "secrets from a backend", "deploy + rollback"],

    failure: {
      title: "A broken DAG that won't import",
      steps: ["typo: bad import in the DAG", "PR opened", "CI runs DagBag import test", "import_errors is non-empty", "deploy BLOCKED"],
      explain: "An engineer refactored a helper and left a bad import in the revenue DAG. Dropped straight onto the scheduler it would have failed to parse and silently skipped the run. Instead the <b>DAG import test</b> loaded the file in CI, found a non-empty <code>import_errors</code>, and <b>blocked the deploy</b> — the scheduler only ever received a DAG proven to parse."
    },

    whenNot: "This is about <b>shipping DAG code</b>, not tuning Airflow's scheduler or writing operators for their own sake. Don't put heavy compute inside the DAG file (do work in tasks, not at parse time), and don't reach for a full DAG when a single cron-triggered script would do — orchestration earns its cost only with real dependencies and retries.",

    story: {
      situation: "RetailFlow's daily revenue DAG needs a change to call the corrected net-revenue transform.",
      problem: "Deploying DAG code directly to the scheduler is risky — a parse error or a logic bug takes down the whole pipeline and blanks the dashboard.",
      decision: "The engineer opens a PR; CI runs a <code>DagBag</code> import test, unit tests on the revenue helper, and a lint pass, then builds a pinned Docker image.",
      tool: "Airflow CI/CD: import test + pytest + Docker deploy.",
      result: "The import test and unit tests pass, the image deploys, and the scheduler receives a DAG already proven to parse and compute correctly.",
      remember: "Deploy the DAG only after CI proves it imports and its task logic is right — the scheduler is not the place to discover a typo."
    },

    code: [{
      title: "test_dags.py — validate every DAG imports and is well-formed",
      lang: "python",
      code: "from airflow.models import DagBag\n\n" +
            "def test_no_import_errors():\n" +
            "    dag_bag = DagBag(include_examples=False)\n" +
            "    assert dag_bag.import_errors == {}, dag_bag.import_errors\n\n" +
            "def test_revenue_dag_structure():\n" +
            "    dag = DagBag(include_examples=False).get_dag('daily_revenue')\n" +
            "    assert dag is not None\n" +
            "    task_ids = set(dag.task_ids)\n" +
            "    assert {'extract_orders', 'dbt_transform', 'data_tests', 'refresh_dashboard'} <= task_ids\n" +
            "    # dbt transform must run before the data tests\n" +
            "    assert 'dbt_transform' in dag.get_task('data_tests').upstream_task_ids",
      highlights: [4, 5, 13]
    }, {
      title: ".github/workflows/airflow-ci.yml — gate the deploy",
      lang: "yaml",
      code: "jobs:\n" +
            "  ci:\n" +
            "    runs-on: ubuntu-latest\n" +
            "    steps:\n" +
            "      - uses: actions/checkout@v4\n" +
            "      - run: pip install -r requirements.txt   # pinned deps\n" +
            "      - run: ruff check dags/                   # lint\n" +
            "      - run: pytest tests/ -q                   # import + unit tests\n" +
            "      - run: docker build -t retailflow-airflow:${{ github.sha }} .\n" +
            "      - run: ./deploy.sh retailflow-airflow:${{ github.sha }}\n" +
            "        if: github.ref == 'refs/heads/main'",
      highlights: [8, 9, 10]
    }],

    remember: "Airflow CI/CD tests the DAG before it schedules: import-test it, unit-test its task logic, pin and containerize it, then deploy — with rollback ready.",

    retention: {
      question: "A RetailFlow DAG has a typo in an import. Which CI check catches it before the scheduler does, and how?",
      answer: "The <b>DAG import test</b> — CI loads all DAGs with <code>DagBag(include_examples=False)</code> and asserts <code>import_errors == {}</code>. The bad import makes that non-empty, failing CI and <b>blocking the deploy</b>."
    },

    prerequisites: ["git", "github-actions", "docker", "pytest"],

    production: [
      { h: "Keep DAG files import-light", body: "Top-level code runs on every scheduler parse (every ~30s). A warehouse call or heavy import at module scope slows parsing and can time out the DagBag — build the revenue DAG's work inside tasks, not at import time." },
      { h: "Backfills and idempotent tasks", body: "RetailFlow re-runs <code>daily_revenue</code> for past dates via <code>catchup</code>/backfill, so each task must be idempotent — overwrite the day's partition or MERGE on <code>order_id</code>, never blind-append, or a backfill double-counts revenue." },
      { h: "Pin the runtime, image = prod", body: "Pin <code>requirements.txt</code> and ship the same Docker image CI tested; an unpinned provider upgrade can change operator behaviour between CI and the scheduler." },
      { h: "Secrets and connections per environment", body: "Pull the warehouse password from a secrets backend via an Airflow Connection, scoped per environment — never hard-code it in the DAG, and never let a dev connection point at prod data." },
      { h: "Import test as a real gate", body: "The DagBag import check only guards prod if CI fails the build on a non-empty <code>import_errors</code> and the deploy step is conditioned on that job passing — assert it explicitly." }
    ],

    misconceptions: [
      { myth: "A green pytest run means the DAG will schedule correctly.", truth: "Unit tests cover task logic; they don't prove the file imports in the Airflow runtime. A DagBag import test is a separate, required check." },
      { myth: "Top-level code in a DAG file runs once at deploy.", truth: "It runs on <i>every</i> scheduler parse of the file. Expensive top-level work (DB calls, big computations) repeatedly slows parsing and can break DAG loading." },
      { myth: "<code>catchup=True</code> is safe because Airflow handles re-runs.", truth: "Only if every task is idempotent. A non-idempotent append task will double-count rows across backfilled runs regardless of Airflow's scheduling." },
      { myth: "Rolling back a bad DAG means editing the file back.", truth: "With immutable image deploys, rollback is redeploying the previous image/commit tag — hand-editing on the scheduler leaves no reproducible version and invites drift." }
    ],

    troubleshooting: [
      { symptom: "The whole DAGs folder stops loading after one PR.", cause: "A top-level import error in one file fails DagBag parsing and blocks sibling DAGs.", fix: "Run <code>DagBag(include_examples=False)</code> locally, read <code>import_errors</code>, fix the import, and confirm <code>import_errors == {}</code> before deploy." },
      { symptom: "Scheduler is sluggish and heartbeats lag.", cause: "Heavy top-level code (warehouse queries, large imports) runs on every parse.", fix: "Move the work into task callables / operators, keep module scope cheap, and verify parse time drops in the scheduler logs." },
      { symptom: "A backfill of daily_revenue doubled some days' totals.", cause: "A task appends instead of overwriting, so re-running a date re-inserts rows.", fix: "Make the task idempotent (overwrite partition or MERGE on <code>order_id</code>), re-run the affected dates, and confirm counts match the single-run baseline." },
      { symptom: "DAG works in CI but fails in prod with a missing-connection error.", cause: "The Airflow Connection/secret isn't configured in the prod environment, or config is baked into code.", fix: "Register the connection in the prod secrets backend, reference it by conn_id, and verify the task resolves it at runtime." }
    ],

    interview: [
      { q: "Why is a DAG import test separate from your unit tests, and how do you write one?", a: "Unit tests exercise task logic in Python; they don't prove the file parses inside Airflow, where one bad import can break the whole DagBag. Load <code>DagBag(include_examples=False)</code> and <code>assert dag_bag.import_errors == {}</code> so any parse error fails CI before the scheduler sees it." },
      { q: "What belongs in a task vs at the top level of a DAG file?", a: "Only lightweight structure (operator wiring, dependencies) at module scope — it runs on every scheduler parse. All real work (queries, I/O, heavy computation) goes inside task callables/operators, so parsing stays fast and a slow import doesn't stall the scheduler." },
      { q: "How do you make a RetailFlow DAG safe to backfill?", a: "Make every task idempotent: overwrite the target date's partition or MERGE on <code>order_id</code> rather than appending, so re-running <code>daily_revenue</code> for a past date produces the same rows. Then <code>catchup</code>/backfill can replay history without double-counting net_revenue." },
      { q: "How do you deploy DAGs and roll back a bad release?", a: "Ship an immutable Docker image (or git-sync a pinned commit) so CI and prod run identical code. Rollback is redeploying the previous image tag/commit — reversible and reproducible — rather than hand-editing files on the scheduler." }
    ],

    related: ["pytest", "docker", "dbt-cicd", "rollback"]
  }));
})();
