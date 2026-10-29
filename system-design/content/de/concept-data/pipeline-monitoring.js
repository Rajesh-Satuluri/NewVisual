export default {
  id: "pipeline-monitoring",
  title: "Pipeline monitoring & SLAs",
  icon: "📟",
  chapter: 25,
  group: "Operations",
  summary: "A green pipeline run doesn't mean the data is right. Data observability watches the signals that actually matter — freshness, volume, schema, distribution, and lineage — and ties them to SLAs so you're alerted when data is late, missing, or wrong before a stakeholder notices. The goal is to catch data incidents, not just job failures.",
  widget: "de-monitoring",
  widgetIntro: "The core metric is **freshness**: how long since the data was last successfully updated. Each pipeline has an **SLA** — a deadline by which fresh data must land — and the monitor compares actual completion against it. A run that finishes late, or doesn't run, breaches the SLA and fires an alert, ideally before anyone downstream sees stale numbers.\n\nWatch pipeline runs complete against their SLA deadline: on-time runs keep freshness green; a slow or missed run breaches the SLA and raises an alert.",
  sections: [
    {
      title: "Job success ≠ data correct",
      body: "A pipeline can succeed and still produce bad data: it ran, but an upstream source sent half the rows, or a schema changed, or yesterday's partition is missing. Traditional job monitoring (did the task exit 0?) misses all of these. Data observability monitors the data itself, not just the process that moved it.",
      rules: ["Monitor the data's health, not only whether the job exited successfully."],
    },
    {
      title: "The signals to watch",
      body: "Data observability centers on a few 'pillars' that reveal most data incidents.",
      table: {
        head: ["Signal", "Detects"],
        rows: [
          ["Freshness", "Data is late or hasn't updated"],
          ["Volume", "Row count spiked or dropped unexpectedly"],
          ["Schema", "Columns added/removed/retyped upstream"],
          ["Distribution", "Values drift out of expected ranges"],
          ["Lineage", "Which downstream tables an incident affects"],
        ],
      },
    },
    {
      title: "SLAs and SLOs for data",
      body: "An SLA sets the promise: 'the sales table is fresh by 6am daily.' You monitor completion against that deadline and the data's freshness timestamp, and alert on a breach. Good SLAs are tied to business need (when do people actually use the data?) and paired with an owner and a runbook, so a breach has a clear response, not just a noisy page.",
      flow: ["define SLA (fresh by 6am)", "measure freshness / completion", "breach → alert owner", "runbook response"],
    },
    {
      title: "Alerting that isn't noise",
      body: "Over-alerting trains people to ignore alerts. Tie alerts to real impact (an SLA breach, a volume anomaly beyond a threshold), route them to the data's owner, give each a runbook, and prefer anomaly detection over static thresholds where data is seasonal. The aim is high signal: every page is a real data incident worth acting on.",
      bullets: [
        "Alert on SLA breach and significant anomalies, not every wobble.",
        "Route to an owner with a runbook; make pages actionable.",
        "Use baselines/anomaly detection for seasonal metrics.",
      ],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Data observability is monitoring adapted to the fact that data can be silently wrong while every job is green.",
  deepDive: [
    {
      title: "Freshness is the heartbeat",
      body: "Most data incidents show up first as staleness: a source stopped, a job hung, an upstream was late. Tracking 'time since last successful update' per table, with an SLA threshold, catches a huge fraction of problems early. It's cheap to compute and maps directly to the user question 'is this data current?' — which is why it's the first signal to instrument.",
      stats: [
        { value: "freshness", label: "time since last good load", tone: "green" },
        { value: "SLA deadline", label: "promise to compare against", tone: "blue" },
        { value: "volume / schema", label: "row-count + structure drift", tone: "accent" },
        { value: "owner + runbook", label: "every alert is actionable", tone: "amber" },
      ],
    },
    {
      title: "Incident response needs lineage",
      body: "When a signal fires, the next question is 'what's affected?' Lineage answers it: trace the bad table downstream to the dashboards and models that consume it, so you can notify owners and quarantine affected outputs. Monitoring plus lineage turns a raw alert into a scoped incident with a blast radius — the difference between 'something's wrong' and 'these three reports are wrong, here's who to tell'.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Monitor the data, not just the job: freshness against an SLA as the heartbeat, plus volume, schema, and distribution checks. Route breaches to an owner with a runbook, use anomaly baselines for seasonal data, and lean on lineage to scope the blast radius when something fires.\"" },
    },
  ],
  qa: [
    {
      q: "Why isn't a successful pipeline run enough to trust the data?",
      a: "Because a job can exit successfully while the data is wrong: an upstream source sent only half its rows, a schema changed, a partition is missing, or values drifted out of range. Exit-code monitoring only tells you the process ran, not that the data it produced is correct, fresh, and complete. Data observability monitors the data itself — freshness, volume, schema, distribution — so you catch these silent data incidents that green jobs hide.",
      tip: "Job success tests the process; data observability tests the data. Give concrete 'green but wrong' examples.",
    },
    {
      q: "What signals do you monitor, and which matters most?",
      a: "The main pillars are freshness (is the data late or not updated?), volume (did row counts spike or drop unexpectedly?), schema (did columns change upstream?), distribution (did values drift out of range?), and lineage (what downstream is affected?). Freshness matters most and is the one to instrument first: most incidents surface as staleness, it's cheap to compute as 'time since last successful update,' and it maps directly to the user question 'is this data current?' You tie it to an SLA and alert on breaches.",
      tip: "Name the pillars, then single out freshness (tied to an SLA) as the highest-value, first-to-instrument signal.",
    },
    {
      q: "How do you set up alerting that people actually trust?",
      a: "Make every alert a real, actionable data incident. Tie alerts to business-relevant SLA breaches and significant anomalies rather than every small fluctuation, use baselines/anomaly detection instead of static thresholds for seasonal data, route each alert to the data's owner, and attach a runbook so the response is clear. Over-alerting trains people to ignore pages, so the design goal is high signal — if it fires, it's worth acting on — and lineage to scope what's affected when it does.",
      tip: "High signal: SLA/anomaly-based, owned, runbook-backed, seasonal-aware. Over-alerting destroys trust.",
    },
  ],
  related: [],
};
