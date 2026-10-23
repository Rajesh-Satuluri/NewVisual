/* modules/pytest.js — Tier 2 · pytest for Data Engineers (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "pytest",
    title: "pytest",
    tool: "--tool-testing",
    icon: "🧪",
    eyebrow: "Tier 2 · Data Engineering CI/CD",
    subtitle: "Automated proof that RetailFlow's revenue code does what it claims — the test that turns 'I think it's right' into 'the pipeline verified it'.",
    mentalImage: "PROOF THE CODE IS RIGHT",

    flowTitle: "A revenue function under test in CI",
    flow: ["push code", "pytest collects", "fixtures set up", "assertions run", "pass / FAIL", "gate merge"],

    why: "RetailFlow's net-revenue calc is a few lines of Python, but everyone downstream trusts it. A one-character slip (<code>+</code> instead of <code>-</code>) inflates revenue and nobody notices until finance does.",
    what: "pytest is Python's <b>testing framework</b>: you write small functions that call your code and <code>assert</code> the result, and pytest discovers and runs them, reporting pass or fail.",
    how: "In CI, every push runs the test suite. If any <code>assert</code> fails, pytest exits non-zero and the merge is blocked — bad logic can't reach production.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "A test calls your function with known inputs and checks the answer. If <code>calculate_net_revenue(100, 20)</code> should be <code>80</code>, the test <b>asserts</b> exactly that." },
        { h: "Your first test", body: "Any function named <code>test_*</code> is auto-discovered. Inside, an <code>assert</code> that's false makes the test fail: <code>assert calculate_net_revenue(100, 20) == 80</code>. Run it with <code>pytest</code>." },
        { h: "Why it matters here", body: "This one test permanently locks in the rule <i>net = gross − refund</i>. If anyone ever changes the formula to add refunds, the test goes red instantly — the mistake never ships." }
      ],
      intermediate: [
        { h: "Fixtures & parametrization", body: "A <b>fixture</b> builds reusable test setup (a sample DataFrame, a local Spark session) and passes it in as an argument. <b>Parametrize</b> runs the same test over many input/output pairs with <code>@pytest.mark.parametrize</code> — one test, dozens of cases." },
        { h: "Mocking external systems", body: "Unit tests must not hit the warehouse, S3, or an API — that's slow and flaky. <b>Mock</b> those boundaries (<code>unittest.mock</code> / <code>monkeypatch</code>) so you test <i>your</i> logic, not the network. Real integration checks live in their own slower suite." },
        { h: "Test isolation & determinism", body: "Each test must pass alone and in any order — no shared mutable state, no reliance on today's date or a live table. Freeze time, seed randomness, build fixtures fresh. A <b>deterministic</b> test gives the same answer every run, so a red build means a real bug." }
      ],
      proficient: [
        { h: "The test pyramid", body: "Many fast <b>unit</b> tests (pure functions like the revenue calc), fewer <b>integration</b> tests (a real Spark transform on sample data), very few slow <b>end-to-end</b> tests. Data teams that invert this get a slow, flaky suite nobody trusts." },
        { h: "Testing PySpark", body: "Spin up a <b>local Spark session</b> fixture (<code>local[*]</code>), build a small input DataFrame, run the real transformation, and <code>collect()</code> the result to assert on it. Compare sorted rows so partition order doesn't cause false failures." },
        { h: "CI parallelization & interview angle", body: "<code>pytest -n auto</code> (pytest-xdist) shards tests across cores to keep CI fast — which only works because tests are isolated. Senior signal: test the transformation logic, not Spark itself; assert on business rules; keep the unit suite under a minute so people actually run it." }
      ]
    },

    micro: ["unit test", "assertion", "fixture", "parametrization", "mock", "monkeypatch", "test isolation",
      "test pyramid", "conftest.py", "local Spark session", "deterministic test", "coverage", "pytest -n (xdist)", "integration test"],

    before: ["'looks right to me'", "bugs found in prod", "no regression safety", "fear of refactoring", "manual spot-checks"],
    after: ["logic proven by tests", "bugs caught pre-merge", "safe to refactor", "green build = trust", "runs on every push"],

    failure: {
      title: "The sign flip in the revenue formula",
      steps: ["dev writes gross + refund", "pytest runs in CI", "assert == 80 gets 120", "test FAILED", "merge BLOCKED"],
      explain: "A developer wrote <code>gross_revenue + refund_amount</code> instead of <code>-</code>. The test <code>assert calculate_net_revenue(100, 20) == 80</code> got <code>120</code> and failed, so pytest exited non-zero and CI <b>blocked the merge</b>. This is the pipeline working exactly as designed — the bad code was stopped before it could inflate the 7 AM dashboard."
    },

    whenNot: "Unit tests prove <b>logic</b>, not that yesterday's production data is correct — that's the job of data tests (dbt/SQL checks). Don't mock so heavily that you only test the mocks, and don't chase 100% coverage on trivial glue code; test the parts where a bug costs money, like the revenue math.",

    story: {
      situation: "RetailFlow moves the net-revenue formula into a shared Python helper used by both the batch job and an API.",
      problem: "If that one function is ever wrong, every consumer is wrong at once — and it's exactly the kind of code a rushed edit breaks.",
      decision: "The engineer writes a unit test asserting <code>calculate_net_revenue(100, 20) == 80</code> plus a PySpark test that runs the real transform on sample orders.",
      tool: "pytest with fixtures + a local Spark session.",
      result: "When a later change flips the sign, the test goes red in CI and the merge is blocked — the formula is validated automatically on every push forever after.",
      remember: "A test written once guards a rule forever; the revenue calc is now proven, not assumed."
    },

    code: [{
      title: "test_revenue.py — unit test + PySpark transform test",
      lang: "python",
      code: "import pytest\n" +
            "from revenue import calculate_net_revenue, add_net_revenue\n\n" +
            "def test_net_revenue():\n" +
            "    assert calculate_net_revenue(100, 20) == 80\n\n" +
            "@pytest.mark.parametrize('gross,refund,expected', [\n" +
            "    (100, 0, 100), (100, 100, 0), (250, 50, 200),\n" +
            "])\n" +
            "def test_net_revenue_cases(gross, refund, expected):\n" +
            "    assert calculate_net_revenue(gross, refund) == expected\n\n" +
            "def test_spark_transform(spark):  # spark fixture from conftest.py\n" +
            "    df = spark.createDataFrame([(1, 100, 20)], ['order_id', 'gross', 'refund'])\n" +
            "    out = add_net_revenue(df).collect()\n" +
            "    assert out[0]['net_revenue'] == 80",
      highlights: [4, 5, 14]
    }, {
      title: "conftest.py — a reusable local Spark fixture",
      lang: "python",
      code: "import pytest\n" +
            "from pyspark.sql import SparkSession\n\n" +
            "@pytest.fixture(scope='session')\n" +
            "def spark():\n" +
            "    session = SparkSession.builder.master('local[*]') \\\n" +
            "        .appName('tests').getOrCreate()\n" +
            "    yield session\n" +
            "    session.stop()",
      highlights: [4, 6]
    }],

    remember: "pytest turns 'I think the revenue math is right' into a red-or-green fact the pipeline checks on every push — a failing test blocking a merge is the system working, not breaking.",

    retention: {
      question: "A RetailFlow dev accidentally writes <code>gross + refund</code> in the revenue helper. How does pytest stop it from reaching the dashboard?",
      answer: "The unit test <code>assert calculate_net_revenue(100, 20) == 80</code> gets <code>120</code>, fails, and pytest exits non-zero in CI — which <b>blocks the merge</b>. The bad logic never ships."
    },

    prerequisites: ["git", "testing-pyramid", "github-actions"],

    production: [
      { h: "Isolation enables parallelism", body: "<code>pytest -n auto</code> (pytest-xdist) only speeds CI if tests share no mutable state or ordering — one test writing a temp table another reads will fail nondeterministically under sharding." },
      { h: "Determinism: freeze time and seed", body: "A test on RetailFlow's net_revenue must not depend on today's date or a live table. Freeze the clock, seed randomness, and build fixtures fresh so a red build always means a real bug, not a flaky one." },
      { h: "Mock the boundary, not the logic", body: "Mock the warehouse/S3/API edge so unit tests stay fast and offline — but if you mock the function under test you only test the mock. Real wiring belongs in a slower integration suite." },
      { h: "Reuse a session-scoped Spark fixture", body: "Spinning a new <code>SparkSession</code> per test is slow; a <code>scope='session'</code> fixture shares one local session — just keep each test's data independent so sharing the session doesn't leak state." },
      { h: "Tests as the merge gate", body: "pytest only guards prod when CI runs it and the merge is conditioned on a zero exit code — a suite that exists but isn't wired as a required check protects nothing." }
    ],

    misconceptions: [
      { myth: "Passing unit tests mean the data on the dashboard is correct.", truth: "Unit tests prove the <i>logic</i> on known inputs. Correct code on incomplete or stale data still ships wrong numbers — that's the job of dbt/SQL data tests." },
      { myth: "More mocking makes a test better.", truth: "Over-mocking tests the mocks, not your code. Mock only external boundaries (warehouse, network); keep the logic under test real." },
      { myth: "100% coverage means well-tested.", truth: "Coverage counts executed lines, not asserted behaviour — you can run every line and assert nothing meaningful. Prioritize the revenue math where a bug costs money over trivial glue." },
      { myth: "A test that sometimes fails is still useful.", truth: "A flaky test erodes trust until people ignore red builds. Fix the nondeterminism (time, ordering, shared state) or the suite stops being a gate." }
    ],

    troubleshooting: [
      { symptom: "Tests pass alone but fail when run together.", cause: "Shared mutable state or ordering dependence between tests.", fix: "Isolate state with fresh fixtures and <code>tmp_path</code>, remove cross-test coupling, then run <code>pytest -p no:randomly</code> off and <code>pytest -n auto</code> to confirm order-independence." },
      { symptom: "A revenue test is flaky — green most runs, red some.", cause: "Dependence on current date, unseeded randomness, or a live table.", fix: "Freeze time, seed the RNG, and build input data in-fixture; re-run many times (<code>pytest --count</code>) and confirm it is stable." },
      { symptom: "PySpark test fails on row order mismatch.", cause: "Spark partitions return rows in nondeterministic order.", fix: "Sort before asserting (or use <code>chispa.assert_df_equality(..., ignore_row_order=True)</code>) and verify the comparison passes regardless of partitioning." },
      { symptom: "Unit suite takes minutes and hits the network.", cause: "Tests call the real warehouse/API instead of mocking the boundary.", fix: "Mock those calls with <code>monkeypatch</code>/<code>unittest.mock</code>, move true integration checks to a separate suite, and confirm the unit run is offline and under a minute." }
    ],

    interview: [
      { q: "What's the difference between a unit test and a data test, and why do you need both?", a: "A unit test proves a function (like <code>calculate_net_revenue</code>) is correct on known inputs; a data test asserts the actual rows are complete, unique, and in-range. Perfect code on broken data still lands wrong numbers — so you test the logic <i>and</i> the data." },
      { q: "How do you test a PySpark transformation reliably?", a: "Use a session-scoped local Spark fixture (<code>local[*]</code>), build a tiny input DataFrame, run the real transform, <code>collect()</code>, and assert on business rules — comparing sorted rows (or <code>ignore_row_order</code>) so partition order never causes a false failure." },
      { q: "Why must tests be isolated and deterministic?", a: "Isolation lets you shard with <code>pytest -n auto</code> for fast CI and makes a failure point at one cause; determinism (frozen time, seeded randomness, fresh fixtures) means a red build is always a real bug. Shared state or reliance on 'today' breeds flakiness that erodes trust in the gate." },
      { q: "When is chasing coverage the wrong goal?", a: "Coverage measures executed lines, not meaningful assertions — 100% can still assert nothing. Spend effort where a bug is expensive, like the net_revenue math, rather than on trivial glue, and don't over-mock to the point you only test the mocks." }
    ],

    problem: {
      before: "Developers 'tested' a transform by running it and eyeballing the printout, or by scattering <code>print()</code> and <code>assert</code> statements they later deleted.",
      insufficient: "Manual eyeballing doesn't run in CI, doesn't cover edge cases, and isn't repeatable. A pipeline that computes money needs automated, deterministic checks that fail loudly on a wrong result.",
      failureModes: [
        "A sign-flip in net_revenue passes an eyeball test because the number 'looks plausible'.",
        "A test depends on a live cluster and fails randomly, so it's ignored.",
        "Edge cases (zero refunds, nulls) are never exercised."
      ]
    },
    definition: {
      formal: "pytest is a Python testing framework. A <b>test</b> is a function whose name starts with <code>test_</code> containing <code>assert</code> statements; pytest discovers and runs them, rewriting assertions to show rich failure detail. <b>Fixtures</b> provide reusable setup/teardown; <b>parametrize</b> runs one test across many inputs.",
      distinguish: [
        { from: "Fixture vs plain setup", note: "A fixture is a managed, composable dependency with a scope (function/module/session); ad-hoc setup in the test body isn't reusable or scoped." },
        { from: "Testing logic vs a live cluster", note: "A good PySpark unit test checks transform logic on small local data; it does not require a running production cluster." },
        { from: "Deterministic vs flaky", note: "A deterministic test gives the same result every run; flakiness (time, randomness, external state) must be removed, not retried away." }
      ]
    },
    mechanics: [
      { h: "Collection", body: "pytest discovers <code>test_*.py</code> files and <code>test_*</code> functions, builds a test tree, and runs them, reporting pass/fail/error and a non-zero exit code if any fail — which is what turns a CI check red." },
      { h: "Assertion rewriting", body: "pytest rewrites <code>assert</code> expressions so a failure shows the actual and expected values, not just 'AssertionError' — so <code>assert net_revenue(100,20)==80</code> prints the offending 120." },
      { h: "Fixtures & scope", body: "A fixture runs setup, yields a value, then tears down; its <b>scope</b> controls how often (per test, module, or session). Parametrized fixtures and <code>@pytest.mark.parametrize</code> fan one test across inputs." }
    ],
    knowledgeChecks: [
      { level: "Recall", q: "How does pytest know a function is a test?",
        options: [
          { label: "Its name starts with test_", ok: true, why: "pytest discovers test_-prefixed functions in test_ files." },
          { label: "It imports pytest", ok: false, why: "Importing isn't required for discovery." },
          { label: "It has a @test decorator", ok: false, why: "pytest uses naming conventions, not a @test decorator." }
        ], revisit: "pytest" },
      { level: "Apply", q: "You want one test to run across several (input, expected) pairs. What do you use?",
        options: [
          { label: "@pytest.mark.parametrize", ok: true, why: "Parametrize fans a single test across many cases." },
          { label: "A for-loop with one assert", ok: false, why: "A loop stops at the first failure and reports poorly; parametrize reports each case." },
          { label: "Copy the test many times", ok: false, why: "Duplication; parametrize is the idiom." }
        ], revisit: "pytest" },
      { level: "Troubleshoot", q: "A PySpark test fails randomly on CI. Most likely cause?",
        options: [
          { label: "It depends on external/live state (non-determinism)", ok: true, why: "Flakiness comes from time, randomness, ordering, or live systems — remove the dependency." },
          { label: "pytest is broken", ok: false, why: "Far more likely the test isn't deterministic." },
          { label: "Too many assertions", ok: false, why: "Assertion count doesn't cause flakiness." }
        ], revisit: "pytest" }
    ],
    mastery: {
      task: "Write a pytest that proves <code>net_revenue(gross, refunds)</code> subtracts refunds, covering a normal case, zero refunds, and a refunds-greater-than-gross edge case — all deterministic.",
      acceptance: [
        "At least three cases, ideally via parametrize.",
        "No dependency on a live cluster or external state.",
        "A failing implementation (addition instead of subtraction) makes the test fail with a clear message."
      ]
    },
    furtherReading: [
      { title: "pytest — How-to guides", publisher: "pytest", url: "https://docs.pytest.org/", why: "Authoritative guidance on assertions, fixtures, and parametrize.", read: "How-to guides → fixtures; parametrizing tests.", reviewed: "2026-10-20" }
    ],

    related: ["testing-pyramid", "sql-testing", "github-actions", "dbt-cicd"]
  }));
})();
