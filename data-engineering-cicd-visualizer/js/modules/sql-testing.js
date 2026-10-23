/* modules/sql-testing.js — Tier 2 · SQL / Data Testing (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "sql-testing",
    title: "SQL / Data Testing",
    tool: "--tool-sql",
    icon: "🧮",
    eyebrow: "Tier 2 · Data Engineering CI/CD",
    subtitle: "Testing the data itself, not the code — proving that RetailFlow's revenue table is complete, unique, and business-correct before anyone reads it.",
    mentalImage: "PROOF THE DATA IS RIGHT",

    flowTitle: "A data test suite over the revenue table",
    flow: ["transform runs", "schema check", "null / unique checks", "referential integrity", "row-count / reconcile", "freshness", "pass / FAIL"],

    why: "RetailFlow's Python was tested and green, yet the dashboard still looked wrong: an upstream loader had dropped 4% of orders. Correct code on incomplete data still produces wrong numbers.",
    what: "SQL / data testing runs <b>assertions against the actual rows</b> — nulls, duplicates, orphaned keys, negative revenue, stale loads — each a query that must return zero bad rows.",
    how: "After the transform writes the table, the test suite runs a set of validation queries. Any query that returns rows is a violation and fails the pipeline before the data is published.",

    levels: {
      beginner: [
        { h: "Code tests vs data tests", body: "A pytest checks <i>the function</i> is right. A data test checks <i>the rows</i> are right. You need both: perfect code on broken data still lands wrong numbers on the dashboard." },
        { h: "The four everyday checks", body: "<ul><li><b>Not-null:</b> <code>order_id</code> is never missing.</li><li><b>Unique:</b> no duplicate <code>order_id</code>.</li><li><b>Range:</b> <code>net_revenue >= 0</code>.</li><li><b>Referential:</b> every <code>customer_id</code> exists in <code>dim_customers</code>.</li></ul>" },
        { h: "How a test 'fails'", body: "Each check is a SQL query that selects the <i>bad</i> rows. If it returns anything, the test failed. A duplicate-detecting query that returns zero rows means the data is clean." }
      ],
      intermediate: [
        { h: "Schema & freshness", body: "<b>Schema validation</b> confirms expected columns and types exist (a renamed upstream column breaks joins silently). <b>Freshness</b> asserts the newest <code>order_completed_at</code> is recent — a stale load means yesterday's revenue is being served as today's." },
        { h: "Row-count & reconciliation", body: "<b>Row-count</b> checks catch silent drops (today's orders shouldn't be 4% below the trailing average). <b>Reconciliation</b> compares an aggregate against a trusted source: <code>SUM(net_revenue)</code> in the mart should tie to the finance ledger within tolerance." },
        { h: "The RetailFlow business rule", body: "Every completed order must have <b>exactly one customer and exactly one payment</b>. That's not a code rule — it's a data-integrity rule, expressed as SQL that finds any order with zero or many matches and returns them as failures." }
      ],
      proficient: [
        { h: "Where these tests live", body: "In practice via dbt tests, Great Expectations, Soda, or hand-written assertion SQL wired into CI. The pattern is identical: a query returning offending rows, a threshold, and a non-zero exit that gates the run — in CI on a PR and as a runtime gate before publishing." },
        { h: "Uniqueness & integrity at scale", body: "<code>GROUP BY key HAVING COUNT(*) > 1</code> finds duplicates; a <code>LEFT JOIN ... WHERE parent IS NULL</code> (anti-join) finds orphaned foreign keys. On huge tables, sample or partition by load date so checks stay cheap while still catching the day's bad data." },
        { h: "Interview angle", body: "Senior signal: test at the boundary where data enters your control, distinguish <b>hard</b> failures (block the pipeline) from <b>soft</b> warnings (alert but continue), and reconcile to an external source of truth. 'The tests are green' must mean the numbers are trustworthy, not just that the job ran." }
      ]
    },

    micro: ["schema validation", "not-null check", "uniqueness check", "referential integrity", "row-count check",
      "reconciliation", "freshness check", "range / accepted values", "anti-join", "GROUP BY HAVING", "hard vs soft failure", "threshold / tolerance"],

    before: ["green code, wrong numbers", "silent dropped rows", "duplicate orders", "orphaned customer_ids", "stale data served fresh"],
    after: ["rows proven complete", "uniqueness enforced", "integrity guaranteed", "freshness gated", "reconciled to finance"],

    failure: {
      title: "An order with no matching customer",
      steps: ["loader drops a customer row", "fct_orders keeps the order", "customer_id now orphaned", "referential test returns 1 row", "publish BLOCKED"],
      explain: "A completed order pointed at a <code>customer_id</code> that no longer existed in <code>dim_customers</code>, violating RetailFlow's rule that every order has exactly one customer. The anti-join integrity test returned that offending row, so the suite failed and the pipeline <b>blocked publishing</b> — the dashboard was never fed a revenue row it couldn't attribute to a real customer."
    },

    whenNot: "Data tests validate <b>data</b>, not logic — they won't catch a wrong-but-plausible formula that produces clean-looking rows (that's pytest's job). Don't run heavy full-table scans on every micro-batch when a partition or sample suffices, and don't hard-fail on soft signals that only warrant an alert.",

    story: {
      situation: "RetailFlow's revenue table passed every Python unit test, but finance says Tuesday's total looks low.",
      problem: "The transformation code was correct; the data feeding it was incomplete and partly unattributable — something code tests can't see.",
      decision: "The team adds data tests: <code>order_id</code> not-null and unique, <code>net_revenue >= 0</code>, and every <code>customer_id</code> must exist in <code>dim_customers</code>, plus a row-count-vs-average freshness gate.",
      tool: "SQL assertion tests wired into CI and the pre-publish gate.",
      result: "The next incomplete load trips the row-count and referential checks and is blocked before it reaches the dashboard — the numbers are validated for business correctness, not just for clean syntax.",
      remember: "Correct code on broken data is still wrong; data tests prove the rows, not the logic."
    },

    code: [{
      title: "revenue transform, then the tests that validate its output",
      lang: "sql",
      code: "-- transform: build the business-ready revenue rows\n" +
            "create or replace table analytics.fct_orders as\n" +
            "select\n" +
            "    o.order_id,\n" +
            "    o.customer_id,\n" +
            "    o.gross_revenue - o.refund_amount as net_revenue,\n" +
            "    o.order_completed_at\n" +
            "from staging.stg_orders o\n" +
            "where o.status = 'completed';",
      highlights: [6]
    }, {
      title: "data tests — each query must return ZERO rows",
      lang: "sql",
      code: "-- 1. order_id must never be null\n" +
            "select count(*) as failures from analytics.fct_orders where order_id is null;\n\n" +
            "-- 2. order_id must be unique\n" +
            "select order_id, count(*) from analytics.fct_orders\n" +
            "group by order_id having count(*) > 1;\n\n" +
            "-- 3. net_revenue must never be negative\n" +
            "select count(*) from analytics.fct_orders where net_revenue < 0;\n\n" +
            "-- 4. every customer_id must exist in dim_customers (referential integrity)\n" +
            "select f.order_id\n" +
            "from analytics.fct_orders f\n" +
            "left join analytics.dim_customers c on f.customer_id = c.customer_id\n" +
            "where c.customer_id is null;",
      highlights: [5, 6, 12, 13, 14]
    }],

    remember: "SQL testing proves the data, not the code: not-null, unique, in-range, and referentially-sound rows — a check that returns any bad row blocks the publish.",

    retention: {
      question: "RetailFlow's rule is that every completed order has exactly one customer. Which data test enforces it, and what does a 'pass' look like?",
      answer: "A <b>referential-integrity (anti-join) test</b>: <code>LEFT JOIN dim_customers ... WHERE customer_id IS NULL</code>. A pass is <b>zero rows returned</b> — every order matched exactly one existing customer."
    },

    prerequisites: ["testing-pyramid", "dbt-cicd", "data-quality"],

    production: [
      { h: "Hard vs soft failures", body: "Decide per check whether a violation <b>blocks</b> the publish or merely <b>warns</b> — RetailFlow's <code>order_id</code> uniqueness is a hard gate, while a small row-count dip may be a soft alert. Wiring every check as hard-fail causes alert fatigue and 3 AM pages." },
      { h: "Reconcile to an external source", body: "<code>SUM(net_revenue)</code> in the mart should tie to the finance ledger within tolerance; schema and null checks pass while a join still silently loses rows, so reconciliation is what proves business correctness." },
      { h: "Keep checks cheap on big tables", body: "Full-table scans every micro-batch get expensive — partition the uniqueness/anti-join checks by load date so they still catch the day's bad rows without re-scanning history." },
      { h: "Freshness as a gate before 7 AM", body: "Assert the newest <code>order_completed_at</code> is recent; a stale load serves yesterday's revenue as today's on the dashboard, and only a freshness check catches a silently stopped feed." },
      { h: "Schema evolution", body: "A renamed or retyped upstream column breaks joins quietly — add a schema/column-presence check so an upstream change fails loud instead of producing plausible-but-wrong rows." }
    ],

    misconceptions: [
      { myth: "Green data tests mean the numbers are correct.", truth: "Not-null/unique/in-range checks prove structural properties, not business truth — a wrong-but-plausible formula produces clean rows that pass. Only reconciliation to a trusted source catches that." },
      { myth: "A uniqueness check is just <code>SELECT DISTINCT</code>.", truth: "You detect duplicates with <code>GROUP BY key HAVING COUNT(*) > 1</code> (which <i>returns</i> the offending keys); <code>DISTINCT</code> hides duplicates rather than reporting them, so it can't gate a pipeline." },
      { myth: "Row-count checks should hard-fail on any change.", truth: "Volumes fluctuate; a rigid exact-count gate is flaky. Compare against a trailing average with a tolerance, and reserve hard-fail for clear drops (e.g. 4% below baseline)." },
      { myth: "If dbt tests pass, you don't need freshness checks.", truth: "Standard dbt generic tests don't assert recency — a stale but internally-consistent table passes unique/not_null while serving yesterday's data. Freshness is a separate assertion." }
    ],

    troubleshooting: [
      { symptom: "Uniqueness check returns duplicate order_ids after a transform change.", cause: "A join fanned out one-to-many (e.g. multiple refund rows per order).", fix: "Pre-aggregate the child table to one row per <code>order_id</code> before joining; re-run <code>GROUP BY order_id HAVING COUNT(*) > 1</code> and confirm zero rows." },
      { symptom: "Referential-integrity anti-join suddenly returns rows.", cause: "An upstream loader dropped parent rows (a deleted/late customer), orphaning the foreign key.", fix: "Backfill the missing <code>dim_customers</code> rows or quarantine orphaned orders; re-run the <code>LEFT JOIN ... WHERE c.customer_id IS NULL</code> check to confirm it returns zero." },
      { symptom: "A data check flaps green/red between runs.", cause: "It depends on wall-clock time or an exact row count on fluctuating volume.", fix: "Anchor freshness to a fixed SLA window and switch count checks to a trailing-average tolerance; re-run across several loads to confirm stability." },
      { symptom: "All checks pass but finance says the total is low.", cause: "No reconciliation — a silent row drop produces structurally-valid but incomplete data.", fix: "Add a reconciliation check comparing <code>SUM(net_revenue)</code> to the ledger within tolerance and a row-count-vs-average gate; verify it trips on the incomplete load." }
    ],

    interview: [
      { q: "How does a SQL data test actually 'fail'?", a: "Each check is a query that selects the <i>bad</i> rows — a null <code>order_id</code>, a duplicate key, an orphaned <code>customer_id</code>, a negative net_revenue. If it returns any rows the test fails and the runner exits non-zero to gate the pipeline; zero rows means the invariant holds." },
      { q: "Why can every data test be green and the revenue still be wrong?", a: "Structural checks (unique, not_null, range) don't assert business meaning — a plausible-but-wrong formula emits clean rows. You need <b>reconciliation</b> to a trusted source (the finance ledger) and anomaly/row-count checks to catch silent completeness problems." },
      { q: "When should a data check block the pipeline vs just alert?", a: "Hard-fail (block) on integrity invariants that make the numbers meaningless — uniqueness of <code>order_id</code>, referential integrity, negative revenue. Soft-warn on signals that need a human look but not a halt, like a minor row-count dip. Making everything blocking causes alert fatigue." },
      { q: "How do you keep uniqueness and integrity checks cheap at scale?", a: "Use <code>GROUP BY key HAVING COUNT(*) > 1</code> for duplicates and a <code>LEFT JOIN ... WHERE parent IS NULL</code> anti-join for orphans, and partition them by load date so each run scans only the new partition instead of the full history, while still catching the day's bad rows." }
    ],

    problem: {
      before: "Teams trusted that if a SQL query ran without error, the result was correct — a successful run and a correct result were treated as the same thing.",
      insufficient: "SQL that executes can still be wrong: a bad join duplicates rows, a filter drops data, a type coercion silently changes a total. 'It ran' says nothing about whether the number is right.",
      failureModes: [
        "A fan-out join doubles revenue; the query succeeds and the dashboard is wrong.",
        "A LEFT JOIN that should be INNER lets nulls inflate a count.",
        "A late-arriving partition makes today's total silently incomplete."
      ]
    },
    definition: {
      formal: "SQL testing verifies the <i>correctness</i> of data and transformations using assertion queries — queries written to return rows (or a count) only when something is wrong. Common classes: uniqueness, not-null, referential integrity, accepted-values, row-count/reconciliation, and freshness.",
      distinguish: [
        { from: "Schema test vs data test", note: "A schema/structural test checks shape (columns, types, not-null); a data test checks values and relationships (reconciliation, distributions)." },
        { from: "Query runs vs query correct", note: "Execution success is not correctness — an assertion query is what proves correctness." },
        { from: "SQL test vs unit test", note: "A unit test checks transform logic on fixed inputs; a SQL/data test checks the actual table the transform produced." }
      ]
    },
    comparisons: [
      { title: "Structural (schema) vs data (value) tests", aLabel: "Structural", bLabel: "Data/value",
        rows: [
          { dim: "Checks", a: "Columns, types, not-null, uniqueness", b: "Reconciliation, distributions, referential integrity" },
          { dim: "Catches", a: "Shape drift / contract breaks", b: "Wrong numbers / bad joins" },
          { dim: "Example", a: "order_id is unique & not null", b: "sum(net_revenue) ties to the ledger" }
        ],
        verdict: "You need both: structure guards the contract, value tests guard the number." }
    ],
    knowledgeChecks: [
      { level: "Explain", q: "A query runs without error. What does that prove about correctness?",
        options: [
          { label: "Nothing — execution success isn't correctness", ok: true, why: "A bad join or filter runs fine and still produces wrong data." },
          { label: "The data is correct", ok: false, why: "That's the exact misconception SQL testing exists to fix." },
          { label: "The schema is wrong", ok: false, why: "Running says nothing either way about schema or values." }
        ], revisit: "sql-testing" },
      { level: "Apply", q: "How do you catch a fan-out join that duplicates orders?",
        options: [
          { label: "A uniqueness assertion on order_id", ok: true, why: "Duplicates fail a unique test immediately." },
          { label: "Re-run the query", ok: false, why: "It'll reproduce the same duplicates." },
          { label: "Check it compiled", ok: false, why: "It compiles fine; you need a value assertion." }
        ], revisit: "sql-testing" },
      { level: "Decide", q: "A daily total looks low. Which check pinpoints a missing feed?",
        options: [
          { label: "A freshness/completeness check on the source partition", ok: true, why: "Freshness/completeness catches late or missing data directly." },
          { label: "A type check", ok: false, why: "Types are fine; the data is incomplete." },
          { label: "A uniqueness check", ok: false, why: "Uniqueness doesn't detect missing rows." }
        ], revisit: "data-quality" }
    ],
    mastery: {
      task: "Write three assertion queries for RetailFlow's revenue table: order_id is unique, net_revenue is never negative, and daily revenue reconciles to the payments ledger within tolerance.",
      acceptance: [
        "Each query returns rows (or a non-zero count) only when the rule is violated.",
        "Includes a reconciliation check against an independent source.",
        "You can explain the lifecycle point where each should run."
      ]
    },
    furtherReading: [
      { title: "dbt — Tests", publisher: "dbt Labs", url: "https://docs.getdbt.com/", why: "Generic and singular tests, the standard way to express SQL assertions in a project.", read: "Build → Tests; data tests vs unit tests.", reviewed: "2026-10-20" },
      { title: "Great Expectations — Expectations", publisher: "Great Expectations", url: "https://docs.greatexpectations.io/", why: "A rich vocabulary of data assertions beyond basic SQL.", read: "Core concepts → Expectations & Checkpoints.", reviewed: "2026-10-20" }
    ],

    related: ["dbt-cicd", "data-quality", "testing-pyramid", "pytest"]
  }));
})();
