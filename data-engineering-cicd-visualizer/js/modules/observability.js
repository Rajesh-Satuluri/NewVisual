/* modules/observability.js — Tier 3 · Observability (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "observability",
    title: "Observability",
    tool: "--tool-dataquality",
    icon: "📈",
    eyebrow: "Tier 3 · Production Engineering",
    subtitle: "CI/CD ends at deployment only on paper — production engineering keeps going. RetailFlow's dashboards and alerts catch that the revenue pipeline ran 40% slower and missed its 7 AM SLA, long after the deploy went green.",
    mentalImage: "DEPLOY IS THE START, NOT THE FINISH",

    flowTitle: "Signals flowing after a deploy",
    flow: ["Deployment", "Application / Pipeline", "Logs / Metrics / Traces / Data Quality", "Alerts"],

    why: "A green deploy proves the code shipped — it says nothing about how the pipeline <b>behaves at 2 AM on real data</b>. Runs get slower, sources go stale, row counts drift. Without observability, you find out from an executive at 7 AM, not from a page at 2 AM.",
    what: "Observability is the ability to <b>understand production from its outputs</b> — logs, metrics, traces, and data-quality signals — so you can answer 'is the pipeline healthy and on time?' without shipping new code to find out.",
    how: "The running pipeline emits signals; a monitoring system aggregates them into dashboards and evaluates <b>alert rules</b> (duration, freshness, row counts, SLA). When a signal crosses a threshold, on-call is paged before downstream consumers are affected.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "CI/CD gets your code to production; observability tells you what it does <i>once it's there</i>. Deployment is the starting line for production engineering, not the finish line — the pipeline still has to run correctly, on real data, every night." },
        { h: "The four kinds of signal", body: "<ul><li><b>Logs</b> — what happened, step by step.</li><li><b>Metrics</b> — numbers over time (duration, row counts).</li><li><b>Traces</b> — the path of one run across tasks.</li><li><b>Data quality</b> — is the <i>output data</i> fresh, complete, valid?</li></ul>" },
        { h: "RetailFlow example", body: "The revenue pipeline deploys green and runs. But a <b>duration metric</b> shows it took 40% longer than usual, and a <b>freshness/SLA alert</b> fires: it won't finish before 7 AM. On-call is paged at 2 AM — the deploy was fine; the runtime behavior was not." }
      ],
      intermediate: [
        { h: "The metrics a data pipeline actually watches", body: "<ul><li><b>Pipeline duration</b> — is a run slower than its baseline?</li><li><b>Task failure rate</b> — how often tasks retry/fail.</li><li><b>Data freshness</b> — how old is the newest row.</li><li><b>Row counts</b> — did volume drop or spike vs. history.</li><li><b>Null / duplicate rate</b> — completeness and uniqueness of the output.</li><li><b>SLA</b> — did it finish by the deadline (7 AM).</li></ul>" },
        { h: "From signal to alert", body: "Metrics become useful when they drive <b>alert rules</b>: duration > 1.4× baseline, freshness > 6h, null-rate > 1%. Alerts should be <b>actionable</b> and routed to on-call — page on SLA-threatening conditions, send lower-severity ones to a channel to avoid alert fatigue." },
        { h: "Monitoring vs observability", body: "<b>Monitoring</b> watches known failure modes you predefined (this metric, this threshold). <b>Observability</b> is having enough signal — logs + metrics + traces + data quality — to debug the <i>unknown</i> ones after the fact. You need both: dashboards for the known, rich signal for the surprise." }
      ],
      proficient: [
        { h: "SLIs, SLOs, and error budgets", body: "Pick <b>SLIs</b> (e.g. % of days revenue lands before 7 AM), set an <b>SLO</b> target (99.5%), and track the <b>error budget</b> you have left. This turns 'is it healthy?' into a number and tells you when to slow feature work and invest in reliability instead." },
        { h: "Data observability = software + data", body: "For data engineering, runtime health has two halves: the <b>software</b> ran (duration, failures, traces) <i>and</i> the <b>data</b> is right (freshness, row counts, null/duplicate rate, distribution). A run can succeed while emitting stale or malformed numbers — so data-quality signals belong on the same dashboards as infra metrics." },
        { h: "Close the loop back to CI/CD", body: "Observability feeds delivery: a bad deploy detected by a duration/SLA alert triggers a <b>rollback</b>; recurring failures become new pre-deploy tests and data-quality checks. Production signal is how you know whether a release was actually good — not the green checkmark." }
      ]
    },

    micro: ["logs", "metrics", "traces", "data quality", "pipeline duration", "task failure rate",
      "data freshness", "row counts", "null percentage", "duplicate rate", "SLA / SLO", "SLI",
      "error budget", "alert rule", "on-call paging", "dashboard", "monitoring vs observability"],

    before: ["deploy green = done", "no view into runtime", "slow run unnoticed", "SLA miss found by execs", "silent stale data"],
    after: ["production instrumented", "duration + freshness tracked", "SLA alerts page on-call", "issues caught at 2 AM", "signals drive rollback + new tests"],

    failure: {
      title: "Deploy green, pipeline 40% slower, 7 AM SLA missed",
      steps: ["Revenue pipeline deploys green", "runs on real data at 2 AM", "duration 40% over baseline", "SLA + freshness alert fires", "on-call paged before 7 AM", "root-caused, fixed, threshold added"],
      explain: "CI/CD proved the code <b>shipped</b> — it could not prove the pipeline would run <b>on time on real data</b>. A <b>duration metric</b> flagged the slowdown and an <b>SLA/freshness alert</b> paged on-call at 2 AM, hours before the 7 AM dashboard. CI/CD ends at deployment only conceptually; observability is how production engineering keeps verifying long after the deploy is green."
    },

    whenNot: "Observability is not a dumping ground for every metric. Don't alert on <b>everything</b> — non-actionable pages cause alert fatigue and real incidents get ignored. Instrument what maps to <b>user/SLA impact</b> (freshness, SLA, error rate), route low-severity signals to a dashboard or channel, and delete alerts nobody acts on. More noise is not more insight.",

    story: {
      situation: "RetailFlow's revenue pipeline is deployed and CI is green; it runs nightly to feed the 7 AM executive dashboard.",
      problem: "One night a slow upstream source and a heavier data volume make the run take 40% longer — nothing failed, so CI/CD had no way to know it would miss the 7 AM SLA.",
      decision: "Production observability tracks <b>pipeline duration</b> and <b>data freshness</b> against an <b>SLA</b>; an alert rule fires when the run trends toward missing 7 AM.",
      tool: "Metrics + SLA alerting (dashboards + on-call paging).",
      result: "On-call is paged at 2 AM, well before executives arrive. They scale the job / defer the slow source and the pipeline lands on time — the miss is caught by monitoring, not by a confused CFO.",
      remember: "The green deploy was the start of production engineering, not the end — observability is what watches the pipeline actually run."
    },

    code: [{
      title: "Alert when the revenue pipeline trends toward missing its 7 AM SLA",
      lang: "yaml",
      code: "# monitoring/revenue_pipeline_alerts.yml\n" +
            "groups:\n" +
            "  - name: revenue-pipeline\n" +
            "    rules:\n" +
            "      # DURATION: run is >40% slower than its 30-day baseline\n" +
            "      - alert: RevenuePipelineSlow\n" +
            "        expr: pipeline_duration_seconds\n" +
            "               > 1.4 * pipeline_duration_baseline_seconds\n" +
            "        for: 5m\n" +
            "        labels: { severity: page }\n" +
            "        annotations:\n" +
            "          summary: \"Revenue pipeline 40%+ slower — 7 AM SLA at risk\"\n" +
            "      # FRESHNESS / SLA: newest revenue row must exist and be < 6h old by 07:00\n" +
            "      - alert: RevenueDataStale\n" +
            "        expr: time() - revenue_max_event_timestamp > 6 * 3600\n" +
            "        for: 10m\n" +
            "        labels: { severity: page }\n" +
            "        annotations:\n" +
            "          summary: \"daily_revenue is stale — dashboard would show old numbers\"",
      highlights: [7, 8, 15]
    }],

    remember: "CI/CD ends at deployment only conceptually — production engineering continues with verification and observability. A running data pipeline is watched through logs, metrics, traces, and data-quality signals (duration, task failure rate, freshness, row counts, null/duplicate rate, SLA) so problems page on-call at 2 AM instead of surfacing to executives at 7 AM.",

    retention: {
      question: "RetailFlow's revenue pipeline deployed green, then one night ran 40% slower and nearly missed the 7 AM SLA — nothing errored. Why couldn't CI/CD catch this, and what does?",
      answer: "CI/CD validates that the code <b>ships and passes tests</b>; it can't observe how the pipeline behaves on real data at 2 AM, so a slowdown with no failure is invisible to it. <b>Observability</b> does: a <b>pipeline-duration metric</b> against a baseline and a <b>freshness/SLA alert rule</b> detect the run trending toward a 7 AM miss and page on-call while there's still time to act. Deployment is the start of production engineering, not the end."
    }
  }));
})();
