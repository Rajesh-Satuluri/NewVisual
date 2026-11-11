export default {
  id: "clickstream-analytics",
  title: "Design a clickstream analytics platform",
  icon: "🖱️",
  chapter: 29,
  group: "End-to-end platforms",
  summary: "Capture every click/page-view/app event from millions of users and serve both real-time dashboards (what's happening now) and historical analysis (trends over months). The defining tension is one pipeline feeding two very different consumers — low-latency streaming and complete, cheap batch — which is the classic speed-layer + batch-layer design.",
  widget: "de-clickstream",
  widgetIntro: "A clickstream platform ingests a firehose of events and fans it to **two paths** with opposite priorities. The **speed path** streams events through Kafka to a stream processor and a live dashboard — seconds of latency, approximate, for 'what's happening now'. The **batch path** lands the same events in the lake, builds curated warehouse tables, and powers deep historical analysis — minutes-to-hours latency, complete and cheap.\n\nWatch events fan into both paths and note the latency difference — the real-time lane updates instantly while the batch lane accumulates and processes in bulk.",
  sections: [
    {
      title: "Requirements",
      body: "Collect high-volume behavioral events reliably and serve two audiences: operational (real-time monitoring, alerting, live funnels) and analytical (retention, attribution, cohort analysis over history).",
      bullets: [
        "Ingest millions of events/sec from web + mobile, losslessly.",
        "Real-time: live metrics and dashboards within seconds.",
        "Historical: complete, queryable event history for months/years.",
        "Handle late/duplicate events and evolving event schemas.",
      ],
    },
    {
      title: "Collection & ingestion",
      body: "Client SDKs batch events and POST them to a collection endpoint behind a load balancer; the collector validates and publishes to a durable log (Kafka). The log is the backbone: it buffers spikes, decouples producers from consumers, and lets both the speed and batch paths read the same stream independently at their own pace.",
      flow: ["client SDK", "collector (validate)", "Kafka (durable log)", "→ speed + batch paths"],
      rules: ["A durable log (Kafka) as the ingestion backbone decouples collection from every downstream consumer."],
    },
    {
      title: "The two paths",
      body: "From the log, two consumer paths diverge — the heart of the design.",
      table: {
        head: ["", "Speed path", "Batch path"],
        rows: [
          ["Consumer", "Stream processor → live dashboard", "Lake → warehouse → BI"],
          ["Latency", "Seconds", "Minutes to hours"],
          ["Result", "Approximate, windowed", "Complete, exact"],
          ["Use", "Live monitoring, alerting", "Retention, attribution, cohorts"],
        ],
      },
      body2: "Modern stacks lean 'Kappa': one streaming pipeline writes to a lakehouse table, and historical queries read the same table — avoiding two separate codebases (Lambda).",
    },
    {
      title: "Processing the events",
      body: "Streaming aggregation uses event-time windows and watermarks for live counts (events/min, active users), tolerating late data. The batch/lakehouse side lands raw events (Bronze), cleans and sessionizes them (Silver), and builds aggregate/funnel tables (Gold) — the medallion flow — partitioned by date for cheap time-range queries.",
      bullets: [
        "Speed: windowed aggregates with watermarks; dedupe by event id.",
        "Batch: Bronze raw → Silver sessionized → Gold funnels/cohorts.",
        "Partition by date; columnar + compaction for fast historical scans.",
      ],
    },
    {
      title: "Scale & correctness",
      body: "At this volume the hard parts are backpressure (the log absorbs spikes), exactly-once-effective counting (at-least-once + idempotent/dedup sinks), schema evolution (events change — use a registry), and cost (partition + columnar + lifecycle-tier old events). Sessionization — grouping a user's events into sessions by inactivity gap — is the signature transformation.",
      rules: ["The log buffers spikes, idempotent sinks make counts correct, and date-partitioned columnar storage keeps history cheap."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "A clickstream platform is a showcase of the streaming + lakehouse concepts composed into one system.",
  deepDive: [
    {
      title: "Why one log, two paths",
      body: "The durable log is what makes serving both audiences possible without coupling them. The speed path trades completeness for latency; the batch path trades latency for completeness and cost. Because both read the same immutable log, they never diverge at the source, and the batch path can always reprocess history to correct the speed path's approximations.",
      stats: [
        { value: "Kafka log", label: "buffer + decouple + replay", tone: "blue" },
        { value: "speed path", label: "seconds, approximate", tone: "green" },
        { value: "batch path", label: "complete, cheap history", tone: "amber" },
        { value: "sessionize", label: "signature transformation", tone: "accent" },
      ],
    },
    {
      title: "The composition",
      body: "Clickstream reuses nearly every DE concept: a durable log (Kafka) for ingestion, windowing + watermarks for live aggregates, delivery guarantees + idempotency for correct counts, the medallion flow for refinement, partitioning + columnar + compaction for cheap history, and lifecycle tiering for cost. It's the canonical 'put it all together' data platform.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Collect behind a durable log, then fan to a speed path (windowed streaming with watermarks → live dashboard) and a batch/lakehouse path (medallion: raw → sessionized → funnels, date-partitioned). Idempotent sinks for correct counts, a schema registry for evolution, lifecycle tiering for cost. Prefer one streaming pipeline into a lakehouse table (Kappa) over two codebases.\"" },
    },
  ],
  qa: [
    {
      q: "How do you serve both real-time dashboards and historical analysis from clickstream?",
      a: "Ingest all events into a durable log (Kafka), then fan to two paths. The speed path has a stream processor consume the log and compute windowed aggregates (with watermarks for late data) into a live dashboard — seconds of latency, approximate. The batch path lands the same events in the lake and builds curated warehouse tables via the medallion flow for complete, cheap historical queries. Both read the same immutable log so they don't diverge, and the batch path can reprocess to correct the speed path. Modern stacks often collapse this into one streaming pipeline writing a lakehouse table (Kappa) to avoid maintaining two codebases.",
      tip: "One durable log → speed path (streaming/approx) + batch path (lakehouse/complete); mention Kappa as the modern simplification.",
    },
    {
      q: "How do you keep clickstream counts correct under duplicates and late events?",
      a: "Events arrive at-least-once (retries, redelivery) and out of order, so you make the counting idempotent and event-time-aware. Dedupe by a unique event id at the sink (or UPSERT/overwrite-by-partition) so redeliveries don't double-count, and use event-time windows with watermarks so late-but-valid events land in the right window while stragglers past the watermark are dropped or side-outputted. The batch path, reading the complete log, produces the exact numbers that reconcile against the speed path's approximations.",
      tip: "Idempotent/dedup sink for duplicates + event-time windows & watermarks for late data; batch reconciles the exact count.",
    },
    {
      q: "How do you keep years of clickstream history queryable and affordable?",
      a: "Store events in the lake in a columnar format (Parquet) partitioned by date, so time-range queries prune to the relevant partitions and read only needed columns, and compact small files from streaming so scans aren't dominated by per-file overhead. Refine via medallion (raw → sessionized → aggregate funnel/cohort tables) so most queries hit small Gold tables rather than the raw firehose. Then lifecycle-tier old raw events to cold storage and expire past retention. Partitioning + columnar + compaction + tiering is what makes multi-year history both fast and cheap.",
      tip: "Date-partitioned columnar + compaction + medallion Gold tables + lifecycle tiering = fast and cheap history.",
    },
  ],
  related: [],
};
