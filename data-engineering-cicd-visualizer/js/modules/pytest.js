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
    }
  }));
})();
