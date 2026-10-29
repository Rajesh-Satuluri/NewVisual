export default {
  id: "metrics-monitoring",
  title: "Design metrics monitoring & alerting",
  icon: "📊",
  chapter: 20,
  group: "Data & infra systems",
  summary: "Collect metrics from thousands of machines, store them as time series, visualize dashboards, and alert on problems. The defining constraints are a huge write rate of timestamped numbers, time-based queries, and keeping storage bounded via downsampling and retention.",
  sections: [
    {
      title: "Requirements",
      body: "Ingest metrics at scale, query them over time ranges for dashboards, and fire alerts when thresholds are crossed.",
      bullets: [
        "Very high write volume: many metrics × many hosts × frequent samples.",
        "Query by metric + tags over time ranges (last 1h, 7d…).",
        "Dashboards (read) and alerting (continuous evaluation).",
        "Bounded storage despite unbounded time — retention + downsampling.",
      ],
    },
    {
      title: "The data model: time series",
      body: "A **metric** is identified by a name plus a set of **tags/labels** (e.g. `cpu.usage{host=web1, region=us}`), and is a stream of (timestamp, value) points. Queries select series by name+tags and aggregate over time (avg, p99, rate). This is exactly what a **time-series database** (Prometheus, InfluxDB, OpenTSDB) is built for.",
      rules: ["Series = name + tags; data = (timestamp, value) points. Query by tag match + time range + aggregation."],
    },
    {
      title: "Collection: push vs pull",
      body: "Two models for getting metrics in: **push** (agents send metrics to the system, e.g. StatsD) and **pull** (the system scrapes metrics endpoints on hosts, e.g. Prometheus). Pull makes it easy to detect a dead target (scrape fails) and controls load centrally; push works better for short-lived jobs and across network boundaries. Many setups use both (a push gateway for batch jobs).",
      flow: ["Hosts expose/emit metrics", "Collector (scrape or receive)", "Buffer/queue", "Time-series storage"],
    },
    {
      title: "Ingestion at scale",
      body: "The write rate is enormous, so a queue/buffer (often Kafka) sits in front of storage to absorb spikes and decouple collection from writes. The TSDB is optimized for append-heavy writes of timestamped data and columnar/compressed storage. Partition/shard series across nodes (by metric or tag hash) to spread the write load.",
    },
    {
      title: "Keeping storage bounded: downsampling & retention",
      body: "You can't keep per-second data forever. **Downsample** older data to coarser resolution (per-second → per-minute → per-hour as it ages) and apply **retention** policies (drop raw data after N days, keep rollups longer). Recent data is high-resolution for debugging; old data is low-resolution for trends.",
      rules: ["Recent = fine resolution; old = downsampled rollups; very old = dropped. Keeps storage finite."],
      flow: ["Raw (seconds)", "Downsample → minutes", "Downsample → hours", "Expire by retention"],
    },
    {
      title: "Alerting",
      body: "An alerting engine continuously evaluates rules against the metrics (e.g. 'p99 latency > 500 ms for 5 min') and fires when conditions hold. Alerts flow to a notification/deduplication layer (like the notification system) that groups, de-dupes, routes, and silences them to avoid alert storms. Good alerts are actionable and symptom-based (user-facing impact), not noisy.",
      bullets: [
        "Rule engine evaluates thresholds over rolling windows.",
        "Dedup/group/route alerts; support silences and escalation.",
        "Alert on symptoms (latency, error rate) over causes to cut noise.",
      ],
    },
  ],
  qa: [
    {
      q: "Why use a time-series database instead of a regular SQL database?",
      a: "Metrics are an append-heavy stream of (timestamp, value) points identified by name+tags, almost always queried by tag match over a time range with aggregation (avg/p99/rate). TSDBs are purpose-built for this: they handle enormous append rates, compress timestamped numeric data extremely well (delta/columnar encoding), and make time-range + tag queries fast. A row-oriented RDBMS would struggle with the write volume and wouldn't compress or time-query nearly as efficiently.",
      tip: "The shape of the data (timestamped, tag-indexed, time-range queried, write-heavy) is what justifies a TSDB — say that explicitly.",
    },
    {
      q: "Push or pull for metric collection?",
      a: "Pull (the system scrapes each host's metrics endpoint, Prometheus-style) makes dead-target detection trivial — a failed scrape signals a down host — and centralizes rate control, but needs discoverable, reachable targets. Push (agents send metrics, StatsD-style) suits short-lived jobs and crossing network boundaries, but you can't tell 'no data' from 'host down' as easily. Many real systems do both: pull for long-running services, a push gateway for batch/ephemeral jobs.",
      tip: "Key discriminators: pull = easy liveness detection + central control; push = ephemeral jobs + network traversal.",
    },
    {
      q: "How do you keep storage bounded when time is unbounded?",
      a: "Downsampling plus retention. Keep recent data at full (e.g. per-second) resolution for debugging, then progressively roll it up to coarser resolution as it ages (per-minute, per-hour), and expire raw data after a retention window while keeping long-range rollups. You trade granularity you no longer need for finite, affordable storage — nobody debugs at per-second resolution on data from six months ago.",
      tip: "Downsample-as-it-ages + tiered retention is the exact answer; tie it to 'you don't need per-second data from months ago'.",
    },
    {
      q: "How do you design alerting that catches real problems without noise?",
      a: "A rule engine continuously evaluates conditions over rolling windows (e.g. error rate > X for 5 minutes) and fires alerts into a dedup/grouping/routing layer that collapses duplicates, groups related alerts, supports silences, and escalates. Reduce noise by alerting on user-facing symptoms (latency, error rate, availability) rather than every underlying cause, requiring a sustained duration to avoid flapping, and tuning thresholds against SLOs. Every alert should be actionable with a runbook.",
      tip: "Symptom-based alerting + dedup/grouping + sustained-duration thresholds is the recipe for low-noise, actionable alerts.",
    },
  ],
  related: [
    "how-do-i-design-metrics-that-actually-tell-me-system-health",
    "how-do-i-design-alerting-that-catches-real-issues-but-avoids",
    "what-should-i-log-at-each-layer-and-what-should-i-never-log",
    "how-do-i-define-slos-and-design-around-them",
    "how-do-i-design-dashboards-that-help-during-incidents",
  ],
};
