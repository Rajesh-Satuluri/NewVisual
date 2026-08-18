/* modules/testing-pyramid.js — The Testing Pyramid for Data Engineering (concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "testing-pyramid",
    title: "The Testing Pyramid",
    tool: "--tool-testing",
    icon: "🔺",
    eyebrow: "Engineering Concept · Testing Pyramid",
    subtitle: "Many fast, isolated tests at the base; a few slow, realistic tests at the top — how RetailFlow builds confidence in its revenue pipeline without a two-hour CI run.",
    mentalImage: "WIDE FAST BASE, NARROW SLOW TOP",

    flowTitle: "A change validated bottom → top",
    flow: ["Unit (many, ms)", "Data / SQL tests", "Integration", "End-to-End (few, min)", "Merge with confidence"],

    why: "Testing everything through slow end-to-end pipeline runs makes CI take an hour, so people stop running it — and testing nothing means a one-character revenue bug reaches the 7 AM dashboard. Neither extreme gives fast, trustworthy feedback.",
    what: "The <b>testing pyramid</b> is a shape for your test suite: a <b>wide base of many fast, isolated tests</b>, narrowing to a <b>few slow, end-to-end tests</b> at the top. For data engineering the layers are <b>Unit → Data/SQL → Integration → E2E</b>.",
    how: "Push as much coverage as low as possible: pure functions get unit tests (milliseconds), transformations get data/SQL assertions, component wiring gets integration tests, and only critical paths get full E2E runs. More isolated = faster and cheaper; more end-to-end = more realistic but slower.",

    levels: {
      beginner: [
        { h: "Why a pyramid, not a square", body: "Tests at the bottom are <b>fast and cheap</b>, so you can have thousands and run them on every save. Tests at the top are <b>slow and expensive</b>, so you keep only a few. A pyramid — wide base, narrow top — gets you fast feedback most of the time and realistic coverage where it matters." },
        { h: "The core trade-off", body: "The more <b>isolated</b> a test (a single function, no database), the <b>faster</b> it runs but the less of the real system it exercises. The more <b>end-to-end</b> (the whole pipeline against a warehouse), the <b>more realistic</b> but the slower and flakier. You want mostly fast tests and a few realistic ones." },
        { h: "RetailFlow in one line", body: "RetailFlow keeps a <b>wide base of fast unit + dbt tests</b> that run on every PR in under a minute, and only a <b>handful of slow end-to-end runs</b> against a staging warehouse before release." }
      ],
      intermediate: [
        { h: "Base — Unit tests", body: "Test one pure function in isolation, no I/O. <b>Python:</b> <code>pytest</code> on <code>net_revenue(gross, refund)</code>. <b>PySpark:</b> test a transform on a tiny in-memory DataFrame with <code>spark.createDataFrame([...])</code>. Milliseconds each, thousands of them — this is where most bugs (like adding refunds instead of subtracting) get caught first." },
        { h: "Next — Data / SQL tests", body: "Assert properties of data and query logic. <b>SQL:</b> a query that returns 0 rows when <code>net_revenue &lt; 0</code>. <b>dbt:</b> schema tests (<code>not_null</code>, <code>unique</code>, <code>accepted_values</code>) plus singular tests like <code>assert net_revenue = gross_revenue - refund_amount</code>. Fast, and specific to data correctness." },
        { h: "Then — Integration tests", body: "Verify components wire together: the extract step actually loads into a real (containerized) Postgres, the model reads it, the result is written. Run against a throwaday local warehouse (e.g. a Dockerized DB or DuckDB) — slower than unit tests, but no full production stack." },
        { h: "Top — End-to-End tests", body: "Run the <i>whole</i> pipeline as it runs in prod, against a staging warehouse with realistic data. <b>Airflow:</b> trigger the actual <code>daily_revenue</code> DAG and assert the final table totals. Minutes per run, a few key scenarios only." }
      ],
      proficient: [
        { h: "Examples by tool", body: "<ul><li><b>Python:</b> <code>pytest</code> unit tests on transform functions.</li><li><b>PySpark:</b> <code>chispa.assert_df_equality()</code> on small DataFrames for column logic.</li><li><b>SQL:</b> assertion queries that must return zero offending rows.</li><li><b>dbt:</b> <code>dbt test</code> — generic (<code>not_null</code>, <code>relationships</code>) + singular SQL tests.</li><li><b>Airflow:</b> DAG-integrity tests (import + no cycles) at the base, one full-DAG run at the top.</li></ul>" },
        { h: "Anti-pattern: the ice-cream cone", body: "Inverting the pyramid — mostly slow E2E tests, few unit tests — gives a CI run that's slow, flaky, and hard to debug (a red E2E tells you 'something broke' but not <i>where</i>). Keep the base wide: a failing unit test points at the exact broken function." },
        { h: "Fast base = fast feedback loop", body: "Because the wide base runs in seconds on every PR, engineers actually run it locally and catch bugs before pushing. The slow top runs less often (pre-merge or nightly). Optimizing the pyramid's shape is really optimizing how quickly a bad revenue calc gets caught." }
      ]
    },

    micro: [
      { name: "unit test", tip: "One function, isolated, no I/O — milliseconds." },
      { name: "data test", tip: "Assert a property of the data (no negative net_revenue)." },
      { name: "SQL test", tip: "A query that returns 0 rows when an invariant holds." },
      { name: "dbt test", tip: "Generic (not_null, unique) + singular SQL tests." },
      { name: "integration test", tip: "Components wired together against a real-ish DB." },
      { name: "end-to-end test", tip: "The whole pipeline against a staging warehouse." },
      { name: "fixture", tip: "Reusable known input data for a test." },
      { name: "mock / stub", tip: "Stand-in for an external dependency to stay isolated." },
      { name: "assertion query", tip: "SQL that fails the build if it returns rows." },
      { name: "flaky test", tip: "Non-deterministic pass/fail — common at the slow top." },
      { name: "coverage", tip: "How much code/logic the tests exercise." },
      { name: "ice-cream cone", tip: "The anti-pattern: too many slow tests, too few fast ones." }
    ],

    before: ["only slow full-pipeline tests", "CI takes an hour", "engineers skip running tests", "red build, no idea where", "bugs found in production"],
    after: ["wide base of fast unit + dbt tests", "CI base runs in under a minute", "run locally on every save", "a failing unit test names the bug", "few E2E runs guard release"],

    failure: {
      title: "Only end-to-end tests (inverted pyramid)",
      steps: ["skip unit + dbt tests", "one slow E2E run only", "refund sign bug slips in", "E2E goes red after 40 min", "'something's wrong' — but where?"],
      explain: "With no fast base, the only signal is a slow, all-or-nothing E2E run that says 'broken' without saying <i>where</i>. A wide base of unit + dbt tests would have failed in seconds and pointed straight at <code>net_revenue()</code> — the fast base is what makes a bug cheap to find and fix."
    },

    whenNot: "Don't force a rigid pyramid where it doesn't fit: a pure <b>data-quality</b> concern (a source feed that's sometimes late or malformed) is better guarded by <b>runtime data checks and monitoring</b> than by more unit tests, and a tiny one-off script may need only a couple of assertions, not four full layers.",

    story: {
      situation: "RetailFlow's revenue transform grows and every PR now triggers a full pipeline run against a warehouse, so CI takes 40+ minutes and people stop waiting for it.",
      problem: "Slow, top-heavy testing means feedback is too slow to be useful — and a subtle bug like adding <code>refund_amount</code> instead of subtracting it isn't caught until the whole run finishes red.",
      decision: "Rebuild the suite as a pyramid: a <b>wide base</b> of <code>pytest</code> unit tests on the transform functions and <code>dbt test</code> assertions on the models, an integration layer against a Dockerized warehouse, and just a <b>few E2E</b> full-DAG runs before release.",
      tool: "pytest + dbt tests (base) → integration tests → a few Airflow E2E runs (top).",
      result: "The base runs in under a minute on every PR and catches the refund-sign bug instantly by naming <code>net_revenue()</code>; the slow E2E runs happen only pre-merge, so feedback is fast <i>and</i> trustworthy.",
      remember: "Push coverage as low as it can go: many fast isolated tests at the base, a few slow realistic ones at the top."
    },

    code: [{
      title: "Base of the pyramid — a fast unit test on the revenue function",
      lang: "python",
      code: "# transforms/revenue.py\n" +
            "def net_revenue(gross_revenue, refund_amount):\n" +
            "    return gross_revenue - refund_amount\n\n" +
            "# tests/test_revenue.py  (pytest — runs in milliseconds)\n" +
            "from transforms.revenue import net_revenue\n\n" +
            "def test_refunds_are_subtracted():\n" +
            "    assert net_revenue(100.0, 30.0) == 70.0\n\n" +
            "def test_net_revenue_never_adds_refunds():\n" +
            "    assert net_revenue(100.0, 30.0) < 100.0",
      highlights: [3, 8]
    }, {
      title: "Data layer — a dbt singular test as an assertion query",
      lang: "sql",
      code: "-- tests/assert_net_revenue_formula.sql\n" +
            "-- dbt fails the build if this query returns ANY rows.\n" +
            "select order_id, gross_revenue, refund_amount, net_revenue\n" +
            "from {{ ref('daily_revenue') }}\n" +
            "where net_revenue <> gross_revenue - refund_amount\n" +
            "   or net_revenue < 0",
      highlights: [5, 6]
    }, {
      title: "Top of the pyramid — one Airflow end-to-end run in CI",
      lang: "bash",
      code: "# Run the WHOLE daily_revenue DAG against a staging warehouse (minutes).\n" +
            "airflow dags test daily_revenue 2026-08-18\n" +
            "# then assert the final table totals match the expected fixture\n" +
            "pytest tests/e2e/test_daily_revenue_totals.py",
      highlights: [2]
    }],

    remember: "Shape your tests like a pyramid: a wide base of many fast, isolated unit and dbt/SQL tests, narrowing to a few slow, realistic integration and end-to-end runs. More isolated = faster feedback; more end-to-end = more realism but more cost. RetailFlow leans on the wide fast base.",

    retention: {
      question: "RetailFlow's CI takes 40 minutes because it only runs full end-to-end pipeline tests. What does the testing pyramid say to do, and why does it catch the refund-sign bug faster?",
      answer: "Rebuild the suite with a <b>wide base of fast, isolated tests</b> (pytest unit tests + dbt/SQL assertions) and only a <b>few slow E2E runs</b> at the top. The base runs in seconds on every PR and a failing unit test names the exact broken function (<code>net_revenue()</code>) — whereas a slow E2E run only says 'something broke' after 40 minutes without pinpointing where."
    }
  }));
})();
