/* ============================================================
   labs.js — DECICDViz.Labs
   Hands-on lab definitions. Each lab ships a starter, a reference
   solution, progressive hints, and a deterministic validate(code)
   that STATICALLY inspects the learner's text (regex/structure) or
   returns a scripted simulated log. No learner code is executed.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  function idx(s, re) { var m = re.exec(s); return m ? m.index : -1; }
  // Does `memory:` appear inside a `limits:` block (before the next
  // same-or-lower-indent key)? Cheap heuristic: a limits: whose next
  // ~160 chars contain memory:.
  function limitsHasMemory(s) {
    var m = /limits:/.exec(s);
    if (!m) return false;
    return /memory\s*:/.test(s.slice(m.index, m.index + 200));
  }

  NS.Labs = [
    {
      id: "gate-the-test",
      title: "Make the test actually gate the deploy",
      tool: "--tool-ci", lang: "yaml", file: ".github/workflows/cicd.yml",
      difficulty: "Beginner", kind: "Simulated execution",
      scenario: "RetailFlow's workflow runs tests AND deploys — but the deploy job isn't waiting for the test job, so a failing test still ships to prod.",
      objective: "Wire the <code>deploy</code> job so it only runs after <code>test</code> succeeds.",
      instructions: [
        "Find the <code>deploy</code> job.",
        "Add a <code>needs:</code> dependency on <code>test</code>.",
        "Run the checks and read the simulated pipeline log."
      ],
      hints: [
        "In GitHub Actions, job order and gating come from <code>needs:</code>, not file order — jobs run in parallel by default.",
        "Add <code>needs: test</code> (or <code>needs: [test]</code>) as a key on the <code>deploy</code> job, at the same indent as <code>runs-on:</code>.",
        "If <code>test</code> fails, a gated <code>deploy</code> is skipped entirely — it never starts."
      ],
      takeaway: "A passing test only protects production if the deploy is <b>wired</b> to it. Gating is explicit (<code>needs:</code> + required status checks), never implied by order in the file.",
      interview: [
        { q: "Two jobs, test and deploy, both defined — why might deploy run even when tests fail?", a: "Jobs run in <b>parallel</b> by default; without <code>needs:</code>, deploy doesn't wait for test, so a red test can't stop it. You also mark the check <b>required</b> in branch protection so the merge itself is gated." }
      ],
      starter:
        "name: CI/CD\n" +
        "on: [push]\n" +
        "jobs:\n" +
        "  test:\n" +
        "    runs-on: ubuntu-latest\n" +
        "    steps:\n" +
        "      - uses: actions/checkout@v4\n" +
        "      - run: pytest -q\n" +
        "  deploy:\n" +
        "    runs-on: ubuntu-latest\n" +
        "    steps:\n" +
        "      - run: databricks bundle deploy -t prod\n",
      solution:
        "name: CI/CD\n" +
        "on: [push]\n" +
        "jobs:\n" +
        "  test:\n" +
        "    runs-on: ubuntu-latest\n" +
        "    steps:\n" +
        "      - uses: actions/checkout@v4\n" +
        "      - run: pytest -q\n" +
        "  deploy:\n" +
        "    needs: test\n" +
        "    runs-on: ubuntu-latest\n" +
        "    steps:\n" +
        "      - run: databricks bundle deploy -t prod\n",
      validate: function (code) {
        var hasTest = /\n\s{2}test:/.test(code);
        var hasDeploy = /\n\s{2}deploy:/.test(code);
        var dep = code.slice(code.search(/\n\s{2}deploy:/));
        var gated = /needs:\s*(\[\s*)?['"]?test/.test(dep);
        var checks = [
          { label: "A test job exists", pass: hasTest },
          { label: "A deploy job exists", pass: hasDeploy },
          { label: "deploy waits for test (needs: test)", pass: gated,
            detail: gated ? "" : "Add needs: test to the deploy job." }
        ];
        var logs = gated
          ? ["▶ test     … running pytest -q", "✓ test     passed", "▶ deploy   needs: test satisfied → deploying", "✓ deploy   bundle deployed to prod"]
          : ["▶ test     … running pytest -q", "✗ test     FAILED (1 test)", "▶ deploy   no needs: → started anyway", "✗ deploy   shipped a broken build to prod"];
        return { pass: hasTest && hasDeploy && gated, checks: checks, logs: logs };
      }
    },

    {
      id: "secret-exposure",
      title: "Stop leaking a secret into the build log",
      tool: "--tool-secrets", lang: "yaml", file: ".github/workflows/deploy.yml",
      difficulty: "Beginner", kind: "Simulated execution",
      scenario: "A deploy step echoes RetailFlow's warehouse token into the job log — anyone with read access to Actions logs can read it.",
      objective: "Provide the secret to the command <b>without printing it</b> — inject it as an environment variable instead of echoing it.",
      instructions: [
        "Remove the line that echoes the secret.",
        "Pass the secret to the step via <code>env:</code> so the command can use it.",
        "Keep actually using the secret — don't just delete it."
      ],
      hints: [
        "Anything you <code>echo</code> lands in the plain-text log. GitHub masks known secret values, but printing them is still a bad habit and masking can miss transformed values.",
        "Add an <code>env:</code> block to the step mapping an env var to <code>${{ secrets.DATABRICKS_TOKEN }}</code>.",
        "The CLI reads <code>DATABRICKS_TOKEN</code> from the environment — you never need to print it."
      ],
      takeaway: "Secrets are <b>injected at runtime</b> (env/with), never echoed, never baked into an image layer or a build ARG. Treat every log line as public.",
      interview: [
        { q: "Why is passing a secret as a Docker build ARG unsafe?", a: "Build ARGs are recorded in the image history/layers, so anyone who pulls the image can recover the value. Use BuildKit secret mounts or inject at <b>run</b> time instead." }
      ],
      starter:
        "jobs:\n" +
        "  deploy:\n" +
        "    runs-on: ubuntu-latest\n" +
        "    steps:\n" +
        "      - name: Deploy\n" +
        "        run: |\n" +
        "          echo \"Using token ${{ secrets.DATABRICKS_TOKEN }}\"\n" +
        "          databricks bundle deploy -t prod\n",
      solution:
        "jobs:\n" +
        "  deploy:\n" +
        "    runs-on: ubuntu-latest\n" +
        "    steps:\n" +
        "      - name: Deploy\n" +
        "        env:\n" +
        "          DATABRICKS_TOKEN: ${{ secrets.DATABRICKS_TOKEN }}\n" +
        "        run: databricks bundle deploy -t prod\n",
      validate: function (code) {
        var echoed = /(echo|print|cat)[^\n]*\$\{\{\s*secrets\./i.test(code);
        var stillUsed = /\$\{\{\s*secrets\./.test(code);
        var viaEnv = /env:[\s\S]*secrets\./.test(code) || /with:[\s\S]*secrets\./.test(code);
        var checks = [
          { label: "Secret is not echoed/printed to the log", pass: !echoed,
            detail: echoed ? "An echo/print still exposes the secret." : "" },
          { label: "Secret is still supplied to the step", pass: stillUsed,
            detail: stillUsed ? "" : "Don't just delete it — the deploy needs it." },
          { label: "Secret is injected via env/with", pass: viaEnv,
            detail: viaEnv ? "" : "Add an env: block mapping the secret." }
        ];
        var logs = echoed
          ? ["Run echo \"Using token ***\"", "Using token dapi1234…  ← leaked into the log", "deploying…"]
          : ["Run databricks bundle deploy -t prod", "Auth via env DATABRICKS_TOKEN (masked)", "deploy complete"];
        return { pass: !echoed && stillUsed && viaEnv, checks: checks, logs: logs };
      }
    },

    {
      id: "dockerfile-fix",
      title: "Fix an insecure, slow Dockerfile",
      tool: "--tool-docker", lang: "dockerfile", file: "docker/Dockerfile",
      difficulty: "Intermediate", kind: "Static validation",
      scenario: "RetailFlow's image uses a floating base tag, busts its layer cache on every code change, and runs as root.",
      objective: "Pin the base image, copy dependencies before app code (so the install layer caches), and run as a non-root user.",
      instructions: [
        "Replace <code>python:latest</code> with a pinned version tag.",
        "Copy <code>requirements.txt</code> and install BEFORE copying the rest of the source.",
        "Create and switch to a non-root <code>USER</code>."
      ],
      hints: [
        "<code>latest</code> is a moving tag — two builds can get different Python. Pin something like <code>python:3.12-slim</code>.",
        "Docker caches layers top-to-bottom; if you <code>COPY . .</code> before installing, any code change invalidates the (expensive) install layer.",
        "Add <code>RUN useradd -m appuser</code> then <code>USER appuser</code> before CMD so the container doesn't run as root."
      ],
      takeaway: "A good Dockerfile is <b>reproducible</b> (pinned base), <b>cache-friendly</b> (deps before code), and <b>least-privilege</b> (non-root). A tag is not immutable — pin, and in prod pull by digest.",
      interview: [
        { q: "Why copy requirements.txt and install before copying application code?", a: "Layer caching: the dependency-install layer only rebuilds when requirements change, so ordinary code edits reuse the cached install — much faster CI. Copying everything first invalidates that layer on every change." }
      ],
      starter:
        "FROM python:latest\n" +
        "WORKDIR /app\n" +
        "COPY . .\n" +
        "RUN pip install -r requirements.txt\n" +
        "CMD [\"python\", \"-m\", \"revenue\"]\n",
      solution:
        "FROM python:3.12-slim\n" +
        "WORKDIR /app\n" +
        "COPY requirements.txt .\n" +
        "RUN pip install --no-cache-dir -r requirements.txt\n" +
        "COPY . .\n" +
        "RUN useradd -m appuser\n" +
        "USER appuser\n" +
        "CMD [\"python\", \"-m\", \"revenue\"]\n",
      validate: function (code) {
        var pinned = /^FROM\s+\S+:(?!latest\b)[\w.\-]+/m.test(code) && !/:latest\b/.test(code);
        var reqIdx = idx(code, /COPY\s+requirements/i);
        var allIdx = idx(code, /COPY\s+\.\s+\.?/);
        var depsFirst = reqIdx !== -1 && allIdx !== -1 && reqIdx < allIdx;
        var nonRoot = /^USER\s+(?!root\b)\S+/m.test(code);
        return {
          pass: pinned && depsFirst && nonRoot,
          checks: [
            { label: "Base image pinned (not :latest)", pass: pinned, detail: pinned ? "" : "Use a version tag like python:3.12-slim." },
            { label: "Dependencies copied/installed before app code", pass: depsFirst, detail: depsFirst ? "" : "COPY requirements.txt + install, then COPY . ." },
            { label: "Runs as a non-root user", pass: nonRoot, detail: nonRoot ? "" : "Add a USER that isn't root." }
          ],
          logs: []
        };
      }
    },

    {
      id: "terraform-guard",
      title: "Stop Terraform from destroying the warehouse",
      tool: "--tool-terraform", lang: "hcl", file: "infrastructure/warehouse.tf",
      difficulty: "Intermediate", kind: "Simulated execution",
      scenario: "A harmless-looking rename makes Terraform's plan show <code>destroy</code> and <code>recreate</code> of RetailFlow's SQL warehouse — which would wipe its state.",
      objective: "Add a lifecycle guard so a destructive plan on this stateful resource is refused.",
      instructions: [
        "Add a <code>lifecycle</code> block to the resource.",
        "Set <code>prevent_destroy = true</code>.",
        "Run the checks to see the simulated plan outcome."
      ],
      hints: [
        "Some attribute changes force replacement; Terraform will happily destroy+recreate unless you tell it not to.",
        "Add <code>lifecycle { prevent_destroy = true }</code> inside the resource block.",
        "With the guard, a destroy-causing plan errors out instead of running — you then use a <code>moved</code> block or <code>import</code> to preserve the resource."
      ],
      takeaway: "<code>prevent_destroy</code> turns an accidental data-losing plan into a loud error. Reverting a <code>.tf</code> file does <b>not</b> safely reverse infra on its own — you plan/apply forward, and guard stateful resources.",
      interview: [
        { q: "A plan shows destroy+recreate of a database after a rename. What do you do?", a: "Don't apply. Use a <code>moved</code> block (or <code>terraform state mv</code>/<code>import</code>) so Terraform treats it as the same resource, and keep <code>prevent_destroy = true</code> as a backstop. Snapshot first." }
      ],
      starter:
        "resource \"databricks_sql_warehouse\" \"revenue\" {\n" +
        "  name         = \"retailflow-revenue\"\n" +
        "  cluster_size = \"Medium\"\n" +
        "}\n",
      solution:
        "resource \"databricks_sql_warehouse\" \"revenue\" {\n" +
        "  name         = \"retailflow-revenue\"\n" +
        "  cluster_size = \"Medium\"\n" +
        "\n" +
        "  lifecycle {\n" +
        "    prevent_destroy = true\n" +
        "  }\n" +
        "}\n",
      validate: function (code) {
        var hasLifecycle = /lifecycle\s*\{/.test(code);
        var guarded = /prevent_destroy\s*=\s*true/.test(code);
        return {
          pass: hasLifecycle && guarded,
          checks: [
            { label: "lifecycle block present", pass: hasLifecycle },
            { label: "prevent_destroy = true", pass: guarded, detail: guarded ? "" : "This is what refuses the destructive plan." }
          ],
          logs: guarded
            ? ["terraform plan", "Error: Instance cannot be destroyed", "  prevent_destroy is set — plan refused ✓"]
            : ["terraform plan", "  # databricks_sql_warehouse.revenue must be replaced", "-/+ destroy and then create replacement", "⚠ apply would wipe the warehouse"]
        };
      }
    },

    {
      id: "dbt-incremental",
      title: "Fix an incremental model that drops late data",
      tool: "--tool-dbt", lang: "sql", file: "dbt/models/daily_revenue.sql",
      difficulty: "Advanced", kind: "Static validation",
      scenario: "RetailFlow's incremental model only pulls rows newer than the current max timestamp — so refunds that arrive late (with an older <code>updated_at</code>) are silently never picked up.",
      objective: "Keep the incremental filter but add a <b>lookback window</b> so late-arriving rows within the window are reprocessed.",
      instructions: [
        "Keep the <code>is_incremental()</code> guard and <code>unique_key</code>.",
        "Subtract a lookback interval from the max-timestamp cutoff.",
        "This re-reads a trailing window each run; the unique key merges updates."
      ],
      hints: [
        "<code>updated_at > max(updated_at)</code> assumes rows always arrive in order — refunds don't.",
        "Change the cutoff to something like <code>(select max(updated_at) from {{ this }}) - interval '3 days'</code>.",
        "Because <code>unique_key='order_id'</code>, re-read rows upsert rather than duplicate — a lookback is safe and idempotent."
      ],
      takeaway: "Simple max-timestamp incrementals miss late-arriving data. A <b>lookback window</b> (or merge/watermark + periodic reconciliation) trades a little recompute for correctness.",
      interview: [
        { q: "Why can a max(updated_at) incremental silently lose data, and how do you fix it?", a: "Late-arriving rows carry a timestamp below the current max, so the <code>&gt;</code> filter skips them forever. Fix with a lookback window, merge on a unique key, or a periodic full reconciliation of recent partitions." }
      ],
      starter:
        "{{ config(materialized='incremental', unique_key='order_id') }}\n" +
        "\n" +
        "select *\n" +
        "from {{ ref('stg_orders') }}\n" +
        "{% if is_incremental() %}\n" +
        "where updated_at > (select max(updated_at) from {{ this }})\n" +
        "{% endif %}\n",
      solution:
        "{{ config(materialized='incremental', unique_key='order_id') }}\n" +
        "\n" +
        "select *\n" +
        "from {{ ref('stg_orders') }}\n" +
        "{% if is_incremental() %}\n" +
        "where updated_at > (select max(updated_at) from {{ this }}) - interval '3 days'\n" +
        "{% endif %}\n",
      validate: function (code) {
        var incGuard = /is_incremental\(\)/.test(code);
        var uniqueKey = /unique_key\s*=/.test(code);
        var lookback = /(-\s*interval\s+'?\d+)|dateadd\s*\(|-\s*\d+\s*\)?\s*(day|days)/i.test(code);
        var hasMax = /max\s*\(/i.test(code);
        return {
          pass: incGuard && uniqueKey && lookback && hasMax,
          checks: [
            { label: "is_incremental() guard kept", pass: incGuard },
            { label: "unique_key set (so re-reads merge)", pass: uniqueKey },
            { label: "Lookback window subtracted from the cutoff", pass: lookback && hasMax,
              detail: (lookback && hasMax) ? "" : "Subtract an interval from max(updated_at)." }
          ],
          logs: []
        };
      }
    },

    {
      id: "airflow-import",
      title: "Fix a DAG that fails at parse time",
      tool: "--tool-airflow", lang: "python", file: "airflow/dags/daily_revenue.py",
      difficulty: "Advanced", kind: "Static validation",
      scenario: "RetailFlow's DAG calls the warehouse connection at the top level — so every scheduler heartbeat re-opens it, and a connection blip breaks DAG parsing for the whole scheduler.",
      objective: "Move the connection lookup out of module scope and into the task function, so import stays fast and side-effect-free.",
      instructions: [
        "Find the top-level <code>BaseHook.get_connection(...)</code> call.",
        "Move it inside the <code>load</code> function (task body).",
        "Leave the DAG and task definitions intact."
      ],
      hints: [
        "Top-level code runs on every DAG parse — keep it import-light: no network, no connections, no Variable.get at module scope.",
        "Cut the <code>conn = BaseHook.get_connection(...)</code> line and paste it as the first line inside <code>def load(...)</code>.",
        "A CI DagBag import test catches exactly this class of bug before deploy."
      ],
      takeaway: "DAG files are imported constantly by the scheduler. Heavy or failure-prone work at parse time (connections, API calls, <code>Variable.get</code>) can stall or crash scheduling — keep it inside tasks.",
      interview: [
        { q: "How does a single DAG file take down scheduling for everything, and how do you prevent it?", a: "A parse-time exception means the DagBag import fails, which can block the scheduler/processor. Prevent it by keeping top-level code trivial and running a <b>DagBag import test</b> in CI; a standalone DAG processor also limits blast radius." }
      ],
      starter:
        "from airflow import DAG\n" +
        "from airflow.operators.python import PythonOperator\n" +
        "from airflow.hooks.base import BaseHook\n" +
        "from datetime import datetime\n" +
        "\n" +
        "conn = BaseHook.get_connection(\"warehouse\")\n" +
        "\n" +
        "def load(**context):\n" +
        "    print(\"loading from\", conn.host)\n" +
        "\n" +
        "with DAG(\"daily_revenue\", start_date=datetime(2024, 1, 1), schedule=\"@daily\", catchup=False) as dag:\n" +
        "    PythonOperator(task_id=\"load\", python_callable=load)\n",
      solution:
        "from airflow import DAG\n" +
        "from airflow.operators.python import PythonOperator\n" +
        "from airflow.hooks.base import BaseHook\n" +
        "from datetime import datetime\n" +
        "\n" +
        "def load(**context):\n" +
        "    conn = BaseHook.get_connection(\"warehouse\")\n" +
        "    print(\"loading from\", conn.host)\n" +
        "\n" +
        "with DAG(\"daily_revenue\", start_date=datetime(2024, 1, 1), schedule=\"@daily\", catchup=False) as dag:\n" +
        "    PythonOperator(task_id=\"load\", python_callable=load)\n",
      validate: function (code) {
        var lines = code.split("\n");
        var topLevelCall = lines.some(function (ln) {
          return /^\S/.test(ln) && /(get_connection|Variable\.get|requests\.\w+\s*\()/.test(ln);
        });
        var hasDag = /DAG\s*\(/.test(code);
        var hasTask = /PythonOperator\s*\(|@task/.test(code);
        return {
          pass: !topLevelCall && hasDag && hasTask,
          checks: [
            { label: "No connection/Variable/network call at import time", pass: !topLevelCall,
              detail: topLevelCall ? "Something heavy still runs at module scope." : "" },
            { label: "DAG is still defined", pass: hasDag },
            { label: "Task is still defined", pass: hasTask }
          ],
          logs: []
        };
      }
    },

    {
      id: "k8s-oom",
      title: "Fix a CrashLoopBackOff from OOMKilled",
      tool: "--tool-kubernetes", lang: "yaml", file: "k8s/revenue-processor.yaml",
      difficulty: "Intermediate", kind: "Simulated execution",
      scenario: "RetailFlow's revenue processor pod keeps restarting — <code>kubectl describe</code> shows <code>OOMKilled</code>, and traffic hits it before it's ready.",
      objective: "Give the container a memory limit sized for the job, and add a readiness probe so it only receives work when it's up.",
      instructions: [
        "Add a <code>limits.memory</code> under <code>resources</code>.",
        "Add a <code>readinessProbe</code> to the container.",
        "Run the checks to see the simulated rollout."
      ],
      hints: [
        "OOMKilled means the container exceeded its memory limit (or the node's). Set a <code>limits.memory</code> that fits the join's working set.",
        "Under <code>resources:</code> add a <code>limits:</code> block with <code>memory: \"1Gi\"</code> (keep requests too).",
        "A <code>readinessProbe</code> keeps the pod out of the Service endpoints until it passes — no traffic to a booting pod."
      ],
      takeaway: "Requests schedule the pod; <b>limits</b> cap it (exceed → OOMKilled). <b>Readiness</b> gates traffic, <b>liveness</b> restarts a hung pod — they're different probes with different jobs.",
      interview: [
        { q: "A pod is in CrashLoopBackOff with OOMKilled — walk the fix.", a: "Confirm via <code>kubectl describe</code>/events, raise <code>resources.limits.memory</code> (and check node capacity/requests), redeploy, and watch it reach Ready. If it still grows, profile the workload for a memory leak or data skew rather than just raising the ceiling." }
      ],
      starter:
        "apiVersion: apps/v1\n" +
        "kind: Deployment\n" +
        "metadata:\n" +
        "  name: revenue-processor\n" +
        "spec:\n" +
        "  replicas: 2\n" +
        "  template:\n" +
        "    spec:\n" +
        "      containers:\n" +
        "        - name: processor\n" +
        "          image: ghcr.io/retailflow/revenue@sha256:abc123\n" +
        "          resources:\n" +
        "            requests:\n" +
        "              memory: \"256Mi\"\n",
      solution:
        "apiVersion: apps/v1\n" +
        "kind: Deployment\n" +
        "metadata:\n" +
        "  name: revenue-processor\n" +
        "spec:\n" +
        "  replicas: 2\n" +
        "  template:\n" +
        "    spec:\n" +
        "      containers:\n" +
        "        - name: processor\n" +
        "          image: ghcr.io/retailflow/revenue@sha256:abc123\n" +
        "          resources:\n" +
        "            requests:\n" +
        "              memory: \"512Mi\"\n" +
        "            limits:\n" +
        "              memory: \"1Gi\"\n" +
        "          readinessProbe:\n" +
        "            httpGet:\n" +
        "              path: /healthz\n" +
        "              port: 8080\n",
      validate: function (code) {
        var hasLimit = limitsHasMemory(code);
        var hasReadiness = /readinessProbe\s*:/.test(code);
        return {
          pass: hasLimit && hasReadiness,
          checks: [
            { label: "Memory limit set under resources.limits", pass: hasLimit, detail: hasLimit ? "" : "Add a limits.memory value." },
            { label: "readinessProbe present", pass: hasReadiness, detail: hasReadiness ? "" : "Gate traffic until the pod is ready." }
          ],
          logs: (hasLimit && hasReadiness)
            ? ["kubectl rollout status deploy/revenue-processor", "Waiting for 2 pods to be ready…", "✓ 2/2 pods Ready — rollout complete"]
            : ["kubectl get pod revenue-processor-…", "STATUS: CrashLoopBackOff (OOMKilled)", "⚠ restarts: 7"]
        };
      }
    },

    {
      id: "freshness-check",
      title: "Make a flaky data-quality check deterministic",
      tool: "--tool-dataquality", lang: "sql", file: "sql/checks/revenue_freshness.sql",
      difficulty: "Intermediate", kind: "Static validation",
      scenario: "RetailFlow's freshness check compares <code>order_date = current_date</code>. It passes mid-afternoon but fails just after midnight and across timezones — a classic flaky check.",
      objective: "Rewrite the check to assert <b>freshness via a relative time window</b> instead of exact date equality.",
      instructions: [
        "Remove the brittle <code>= current_date</code> equality.",
        "Assert the newest row is within an acceptable age (e.g. 26 hours).",
        "Compare a timestamp to <code>current_timestamp - interval</code>."
      ],
      hints: [
        "Equality on <code>current_date</code> depends on wall-clock time and timezone — the same data flips pass/fail depending on when the job runs.",
        "Assert on age: <code>max(order_ts) &lt; current_timestamp - interval '26 hours'</code> means stale.",
        "A relative window tolerates normal schedule jitter; equality does not."
      ],
      takeaway: "Freshness is a <b>relative</b> property — compare to an age window, not an exact calendar date. Deterministic checks don't change verdict just because the clock moved.",
      interview: [
        { q: "A data-quality check passes in the afternoon and fails at 00:30. Why, and how do you fix it?", a: "It likely keys off <code>current_date</code>/timezone, so the 'today' boundary shifts under it. Replace exact-date equality with a relative freshness window (max timestamp age) and pin the timezone so the verdict depends on the data, not the clock." }
      ],
      starter:
        "-- Fails intermittently depending on when the job runs\n" +
        "select count(*) as fresh_rows\n" +
        "from gold.daily_revenue\n" +
        "where order_date = current_date\n",
      solution:
        "-- Stale if the newest row is older than our SLA window\n" +
        "select count(*) as stale\n" +
        "from gold.daily_revenue\n" +
        "having max(order_ts) < current_timestamp - interval '26 hours'\n",
      validate: function (code) {
        var brittle = /=\s*current_date/i.test(code);
        var relative = /(current_timestamp|now\s*\(\s*\))\s*-\s*interval|interval\s+'?\d+\s*hour/i.test(code);
        return {
          pass: !brittle && relative,
          checks: [
            { label: "No exact equality on current_date", pass: !brittle, detail: brittle ? "= current_date is timezone/time dependent." : "" },
            { label: "Uses a relative freshness window", pass: relative, detail: relative ? "" : "Compare a timestamp to current_timestamp - interval." }
          ],
          logs: []
        };
      }
    }
  ];
})();
