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
    },

    prerequisites: [
      { id: "data-quality", label: "Data quality" },
      "rollback",
      "deployment-strategies"
    ],

    production: [
      { h: "Instrument software and data", body: "Runtime health has two halves — the <b>software</b> ran (duration, failure rate, traces) <i>and</i> the <b>data</b> is right (freshness, row counts, null/duplicate rate); a run can succeed while emitting stale numbers." },
      { h: "Alert on SLA-threatening signals", body: "RetailFlow pages on duration > 1.4× baseline and freshness nearing the 7 AM deadline, so on-call is woken at 2 AM with time to act — not surfaced to a CFO at 7." },
      { h: "Route by severity to avoid fatigue", body: "Page only on actionable, SLA-impacting conditions; send lower-severity signals to a dashboard/channel, and delete alerts nobody acts on." },
      { h: "Track SLOs and error budgets", body: "Turn 'is it healthy?' into a number — an SLI (% of days revenue lands before 7 AM), an SLO target, and the remaining error budget that tells you when to invest in reliability." },
      { h: "Close the loop to CI/CD", body: "A duration/SLA alert can trigger a <b>rollback</b>, and recurring failures should become new pre-deploy tests and data-quality checks — production signal is how you know a release was actually good." }
    ],

    misconceptions: [
      { myth: "A successful deploy proves the data is correct.", truth: "A green deploy proves the code shipped; it says nothing about freshness, row counts, or whether the 2 AM run produced right numbers — that needs runtime data-quality signals." },
      { myth: "A job that finished successfully produced good data.", truth: "A run can exit 0 while emitting stale, incomplete, or malformed rows, so success status and data correctness are separate checks." },
      { myth: "More alerts means better coverage.", truth: "Non-actionable pages cause <b>alert fatigue</b> and real incidents get ignored; instrument what maps to SLA/user impact and route the rest to a dashboard." },
      { myth: "Monitoring and observability are the same thing.", truth: "<b>Monitoring</b> watches predefined failure modes; <b>observability</b> is having enough signal (logs + metrics + traces + data quality) to debug the <i>unknown</i> ones after the fact — you need both." }
    ],

    troubleshooting: [
      { symptom: "Pipeline deployed green but missed the 7 AM SLA.", cause: "CI can't see runtime behavior on real data — a slow source/heavier volume made the run 40% slower.", fix: "Add a duration-vs-baseline and freshness/SLA alert that pages on-call pre-deadline, scale the job or defer the slow source, and verify the run lands before 7 AM." },
      { symptom: "On-call is drowning in pages and ignores them.", cause: "Alerts fire on non-actionable, non-SLA conditions.", fix: "Keep only alerts tied to SLA/user impact at <code>severity: page</code>, route the rest to a channel, delete the dead ones, and confirm page volume drops to actionable incidents." },
      { symptom: "Run succeeded but the dashboard shows old numbers.", cause: "The job exited 0 while the output data was stale — no freshness check.", fix: "Add a freshness alert (newest row age vs deadline), investigate the upstream staleness, and verify the dashboard reads current data." },
      { symptom: "Revenue totals look wrong but no infra alert fired.", cause: "Only software metrics are instrumented, not data-quality metrics.", fix: "Add row-count/null/duplicate-rate checks to the same dashboards, backfill if needed, and verify the data-quality suite passes." },
      { symptom: "An alert fires every night at the same time but nothing is wrong.", cause: "The threshold is static and doesn't track the real baseline.", fix: "Base the rule on a rolling baseline (e.g. 1.4× the 30-day duration) with a <code>for:</code> window, then confirm it only fires on genuine deviations." }
    ],

    interview: [
      { q: "Why can't CI/CD catch a pipeline that deploys green but runs 40% slower on real data?", a: "CI/CD validates the code <b>builds and passes tests</b> in a controlled environment; it never observes the run on production-scale data at 2 AM. A slowdown with no failure is invisible to it. <b>Observability</b> catches it with a duration-vs-baseline metric and a freshness/SLA alert that pages on-call before the 7 AM deadline — deployment is the start of production engineering, not the end." },
      { q: "What's the difference between monitoring and observability?", a: "<b>Monitoring</b> watches known failure modes you predefined — this metric, this threshold. <b>Observability</b> is having enough rich signal (logs + metrics + traces + data quality) to debug the <i>unknown</i> failures after the fact. You need both: dashboards and alerts for the known, deep signal for the surprises." },
      { q: "Which metrics would you put on a data pipeline's health dashboard, and why both software and data?", a: "Software: <b>pipeline duration</b> (vs baseline), <b>task failure rate</b>, traces. Data: <b>freshness</b>, <b>row counts</b> (vs history), <b>null/duplicate rate</b>, and <b>SLA</b> (finished by 7 AM). Both halves matter because a run can succeed while the data is stale or malformed — infra-green does not mean data-correct, so data-quality signals belong on the same dashboard." },
      { q: "How do SLIs, SLOs, and error budgets help you decide what to work on?", a: "An <b>SLI</b> measures a user-facing property (e.g. % of days revenue lands before 7 AM); the <b>SLO</b> is the target (say 99.5%); the <b>error budget</b> is the allowed shortfall. When the budget is being burned, you slow feature work and invest in reliability; when it's healthy, you can ship faster. It turns 'is it healthy?' into an objective, trade-off-driving number." }
    ],

    related: ["data-quality", "rollback", "deployment-strategies", "airflow-cicd"]
  }));
})();
