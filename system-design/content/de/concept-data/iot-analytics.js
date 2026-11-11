export default {
  id: "iot-analytics",
  title: "Design an IoT analytics platform",
  icon: "📡",
  chapter: 31,
  group: "End-to-end platforms",
  summary: "Ingest high-frequency telemetry from millions of devices, then serve real-time monitoring/alerting and long-term trend analysis. The defining problems are enormous write volume, time-series data that must be downsampled to stay affordable, and devices that are intermittent, late, and out of order.",
  widget: "de-iot",
  widgetIntro: "Millions of devices each emit readings every few seconds — a colossal, relentless write load of **time-series** data. You can't keep every raw reading forever at full resolution, so the platform **downsamples**: raw data is kept briefly, then rolled up into 1-minute, 1-hour, and 1-day aggregates, each cheaper and coarser. Queries hit the resolution they need; old raw data expires.\n\nWatch devices stream readings into the time-series store, then roll up into coarser aggregates as data ages — the rollup pyramid that keeps IoT storage and queries affordable.",
  sections: [
    {
      title: "Requirements",
      body: "Handle massive append-only write volume, alert in real time on anomalies, and answer historical trend queries over months — all without storing every raw reading forever.",
      bullets: [
        "Ingest millions of readings/sec; writes vastly outnumber reads.",
        "Real-time: detect threshold breaches / anomalies within seconds.",
        "Historical: trends and aggregates over long windows.",
        "Tolerate intermittent, late, out-of-order, and duplicate readings.",
      ],
    },
    {
      title: "Edge and ingestion",
      body: "Push work to the **edge**: devices (or gateways) pre-aggregate, filter, and batch readings before sending, cutting network and ingest volume dramatically. Readings flow through a lightweight protocol (MQTT) to a gateway, then into a durable log and a **time-series database** optimized for high-cardinality, append-heavy, timestamped data.",
      flow: ["devices", "edge aggregate/batch", "gateway (MQTT)", "log + time-series store"],
      rules: ["Aggregate at the edge — the cheapest reading to ingest is the one the device already summarized."],
    },
    {
      title: "Downsampling: the rollup pyramid",
      body: "Full-resolution data is huge and rarely queried at full detail for old periods. So you roll it up: keep raw for a short retention, continuously aggregate into coarser buckets (1-min, 1-hour, 1-day avg/min/max/count), and expire the finer resolutions as they age. A query picks the coarsest resolution that answers it, reading far less data.",
      table: {
        head: ["Resolution", "Retention", "Use"],
        rows: [
          ["Raw (per reading)", "Days", "Live debugging, recent detail"],
          ["1-minute rollup", "Weeks", "Recent dashboards"],
          ["1-hour rollup", "Months", "Trend analysis"],
          ["1-day rollup", "Years", "Long-term history"],
        ],
      },
    },
    {
      title: "Serving real-time + historical",
      body: "A streaming path evaluates incoming readings against alert rules (threshold, anomaly) with windows and watermarks for late data, firing alerts in seconds. A query path serves dashboards and analysis from the appropriate rollup. The same ingestion feeds both — stream for now, rolled-up store for history.",
      bullets: [
        "Real-time alerting: windowed stream processing on the live feed.",
        "Dashboards/analysis: query the rollup matching the time range.",
        "Late/out-of-order readings handled by event-time windows + watermarks.",
      ],
    },
    {
      title: "The hard parts",
      body: "Write throughput (partition by device + time; the time-series DB and log absorb the firehose), cardinality (millions of device/metric series), downsampling correctness (roll up incrementally and idempotently), and cost (raw data is the expensive part — short raw retention + aggressive rollup + tiering). Out-of-order and duplicate readings need event-time handling and dedup.",
      rules: ["Edge aggregation + downsampling + short raw retention are what make IoT volume survivable and affordable."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "IoT is the write-volume and time-series extreme — downsampling and edge work are what make it tractable.",
  deepDive: [
    {
      title: "Downsampling is the core economic lever",
      body: "Raw IoT data grows without bound and is mostly never read at full resolution once it's old. Downsampling trades precision you don't need for cost you can't afford: a year of 1-day rollups is thousands of times smaller than a year of raw readings, and answers trend queries just as well. Short raw retention plus a rollup pyramid is what keeps the platform's storage and query cost sane.",
      stats: [
        { value: "edge aggregate", label: "cut volume before ingest", tone: "green" },
        { value: "time-series DB", label: "append-heavy, timestamped", tone: "blue" },
        { value: "rollup pyramid", label: "raw → min → hour → day", tone: "accent" },
        { value: "short raw TTL", label: "expire fine resolution fast", tone: "amber" },
      ],
    },
    {
      title: "Event-time everywhere",
      body: "Devices have clock skew, intermittent connectivity, and buffering, so readings arrive late and out of order routinely. Everything downstream must use event time: alert windows and rollups bucket by the reading's timestamp (not arrival), watermarks decide when a bucket is complete, and dedup by (device, timestamp) absorbs retransmissions. Processing-time logic would scatter readings into wrong buckets and produce wrong trends.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Aggregate at the edge to cut volume, ingest through a log into a time-series store partitioned by device+time, and downsample into a rollup pyramid with short raw retention to control cost. Stream the live feed for windowed alerting, and query the right rollup for history — all event-time with watermarks and dedup, since devices are late and lossy.\"" },
    },
  ],
  qa: [
    {
      q: "How do you handle the write volume of millions of IoT devices?",
      a: "Cut volume early and absorb the rest. At the edge, have devices or gateways pre-aggregate, filter, and batch readings before sending, so you ingest summaries instead of every raw sample. Send through a lightweight protocol (MQTT) into a durable log that buffers spikes, and store in a time-series database optimized for append-heavy, timestamped, high-cardinality data, partitioned by device and time so writes spread across nodes. The combination of edge aggregation, a buffering log, and a purpose-built time-series store is what makes the firehose survivable.",
      tip: "Edge aggregation + buffering log + time-series DB partitioned by device+time; reduce before ingest, then absorb.",
    },
    {
      q: "Why and how do you downsample time-series data?",
      a: "Because keeping every raw reading at full resolution forever is unaffordable and old data is rarely queried at full detail. You downsample into a rollup pyramid: keep raw for a short retention, then continuously aggregate into 1-minute, 1-hour, and 1-day buckets (avg/min/max/count), expiring finer resolutions as they age. A query reads the coarsest resolution that answers it — a yearly trend hits 1-day rollups, thousands of times smaller than raw. Roll up incrementally and idempotently so re-runs don't double-count. Short raw retention plus aggressive rollup is the main cost lever.",
      tip: "Rollup pyramid (raw→min→hour→day) with short raw TTL; queries read the coarsest sufficient resolution.",
    },
    {
      q: "Devices are late, intermittent, and out of order — how do you cope?",
      a: "Use event time everywhere. Bucket alert windows and rollups by the reading's own timestamp rather than arrival time, so a batch of buffered readings from a reconnecting device lands in the correct periods. Use watermarks to decide when a time bucket is complete enough to emit, with an allowed-lateness margin sized to real device delay, and dedupe by (device_id, timestamp) to absorb retransmissions from at-least-once delivery. Processing-time logic would scatter late readings into wrong buckets and corrupt both alerts and trends, so event-time handling is non-negotiable for IoT.",
      tip: "Event-time windows + watermarks + dedup by (device, timestamp); never bucket IoT data by arrival time.",
    },
  ],
  related: [],
};
