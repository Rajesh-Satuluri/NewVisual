/* modules/data-quality.js — Tier 2 · Data Quality (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "data-quality",
    title: "Data Quality",
    tool: "--tool-dataquality",
    icon: "✅",
    eyebrow: "Tier 2 · Data Engineering CI/CD",
    subtitle: "The layer that checks the data, not the code — a green deploy shipped RetailFlow's pipeline fine, but a freshness check caught that yesterday's revenue never actually arrived.",
    mentalImage: "DATA INSPECTOR",

    flowTitle: "A run passing through the data inspector",
    flow: ["Pipeline runs", "Pipeline SUCCESS", "Data quality checks", "PASS / FAIL", "Alert / block downstream"],

    why: "CI/CD proves the <b>software</b> is correct, but a perfectly healthy pipeline can still load stale, missing, or malformed data — a deploy can be green while the numbers are wrong.",
    what: "Data quality is a <b>separate validation layer</b> (Great Expectations, Soda) that inspects the <i>data</i> a pipeline produces — its freshness, completeness, and validity — independent of whether the code ran.",
    how: "After the pipeline reports success, the data-quality layer runs assertions against the output tables and returns PASS or FAIL — failing the run or alerting even when the software itself worked perfectly.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "Software quality asks 'did the code run correctly?' Data quality asks 'is the <i>data</i> it produced actually good?' A test suite can pass and the numbers can still be wrong — these are two different checks." },
        { h: "What it inspects", body: "<ul><li><b>Freshness</b> — is today's data actually here?</li><li><b>Completeness</b> — no missing rows or nulls?</li><li><b>Uniqueness</b> — no duplicate keys?</li><li><b>Validity</b> — values in the expected range/format?</li></ul>" },
        { h: "RetailFlow example", body: "RetailFlow's revenue pipeline deploys green — the code is fine. But a <b>freshness check</b> notices the latest revenue row is from yesterday, not today: the source feed silently stopped. The code was perfect; the data was stale." }
      ],
      intermediate: [
        { h: "Tools & expectations", body: "<b>Great Expectations</b> defines 'expectations' (e.g. <code>expect_column_values_to_not_be_null</code>); <b>Soda</b> uses SodaCL checks in YAML. Both run as a step after the pipeline and produce a pass/fail report with the rows that violated each rule." },
        { h: "The check categories a senior names", body: "<b>Freshness</b>, <b>completeness</b>, <b>uniqueness</b>, <b>validity</b>, <b>referential integrity</b> (every <code>order.customer_id</code> exists in <code>customers</code>), and <b>distribution anomalies</b> (today's revenue is 10x yesterday's — probably a bug, not a boom)." },
        { h: "Where it runs", body: "Data-quality checks sit <i>after</i> load, gating downstream consumers: pass → the 7 AM dashboard reads the table; fail → block the downstream refresh and page the on-call, so executives never see numbers built on bad data." }
      ],
      proficient: [
        { h: "Software quality ≠ data quality", body: "CI/CD (pytest, deploys) validates the code path; data quality validates the runtime <i>output</i>. You need both: a flawless deploy can still emit garbage if an upstream source changed. Treating a green pipeline as proof of good data is the core mistake." },
        { h: "Freshness & anomaly detection", body: "Freshness compares <code>max(event_time)</code> against SLA (e.g. within 6 hours). Distribution checks track row counts and metric ranges over time and flag outliers — catching silent upstream breakage that no unit test would ever see." },
        { h: "Fail loud, fail early", body: "Make critical checks <b>blocking</b> (halt the pipeline / downstream), and warnings non-blocking. Version the expectation suite in Git, run it in CI against sample data, and alert with the specific failing rows so triage is fast." }
      ]
    },

    micro: ["Great Expectations", "Soda / SodaCL", "expectation suite", "freshness", "completeness", "uniqueness",
      "validity", "referential integrity", "distribution anomaly", "null checks", "row-count SLA",
      "blocking vs warning", "pass/fail report", "data contract"],

    before: ["green deploy = trusted", "stale data unnoticed", "nulls flow downstream", "duplicates in revenue", "execs see wrong numbers"],
    after: ["data validated after load", "freshness enforced", "completeness checked", "anomalies flagged", "bad data blocked"],

    failure: {
      title: "Deploy SUCCESS, freshness check FAILED",
      steps: ["Pipeline deploys green", "code runs, no errors", "source feed silently stopped", "freshness check FAILS", "downstream blocked + on-call paged", "incident: stale revenue caught before 7 AM"],
      explain: "CI/CD proved the <b>software</b> was correct — and it was. The <b>data</b> was stale because an upstream feed stopped, something no code test could detect. The freshness check ran after success, failed, and blocked the dashboard: CI/CD deploys software, data quality validates the resulting data."
    },

    whenNot: "Don't bolt on a <b>separate framework</b> for checks your transformation layer already covers — if <b>dbt tests</b> (<code>not_null</code>, <code>unique</code>, <code>relationships</code>) already assert your models, adding Great Expectations on top duplicates effort and doubles maintenance. Reach for a dedicated tool when you need richer checks (freshness SLAs, distribution/anomaly detection) that dbt tests don't express.",

    story: {
      situation: "RetailFlow ships a change to the revenue pipeline; CI is green and the deploy succeeds cleanly.",
      problem: "That night, an upstream point-of-sale feed silently stopped — the pipeline ran fine but loaded no new revenue for the day.",
      decision: "A <b>freshness check</b> (Soda) runs after the load, asserting the newest revenue row is within the last 6 hours.",
      tool: "Data-quality layer (freshness check).",
      result: "The check FAILS, blocks the 7 AM dashboard refresh, and pages on-call — executives get a 'data delayed' notice instead of confidently reading yesterday's numbers as today's.",
      remember: "A green deploy proves the code ran; a data-quality check proves the data is right."
    },

    code: [{
      title: "Soda freshness + validity checks on the revenue table",
      lang: "yaml",
      code: "# checks/daily_revenue.yml (Soda / SodaCL)\n" +
            "checks for daily_revenue:\n" +
            "  # FRESHNESS: newest row must be within 6 hours\n" +
            "  - freshness(revenue_date) < 6h\n" +
            "  # COMPLETENESS: no missing revenue\n" +
            "  - missing_count(net_revenue) = 0\n" +
            "  # VALIDITY: net revenue can't be negative\n" +
            "  - invalid_count(net_revenue) = 0:\n" +
            "      valid min: 0\n" +
            "  # UNIQUENESS: one row per store per day\n" +
            "  - duplicate_count(store_id, revenue_date) = 0",
      highlights: [4, 6]
    }],

    remember: "CI/CD deploys the software; data quality validates the data it produced — a green pipeline can still ship stale or broken numbers, so check freshness, completeness, and validity separately.",

    retention: {
      question: "RetailFlow's revenue pipeline deployed successfully with a green CI run, yet the 7 AM dashboard would have shown yesterday's numbers. Why didn't CI catch it, and what does?",
      answer: "CI/CD validates the <b>software</b> — and the code ran fine. The data was stale because an upstream feed stopped, which no code test can see. A <b>data-quality freshness check</b> (Great Expectations / Soda) runs after load, asserts the newest row is recent, FAILS, and blocks the downstream refresh."
    }
  }));
})();
