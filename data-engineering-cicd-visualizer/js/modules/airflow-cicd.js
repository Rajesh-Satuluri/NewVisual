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
    }
  }));
})();
