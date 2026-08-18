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
    }
  }));
})();
