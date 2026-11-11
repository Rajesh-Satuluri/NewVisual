export default {
  id: "ad-click-aggregation",
  title: "Design ad click event aggregation",
  icon: "🖱️",
  chapter: 21,
  group: "Data & infra systems",
  summary: "Count ad clicks in near-real-time for billing and dashboards, at firehose scale. It's a streaming aggregation problem where correctness (you're billing advertisers) collides with late, duplicate, and out-of-order events.",
  widget: "click-aggregation",
  widgetIntro: "You can't bill advertisers by storing and counting every click individually at firehose scale — you **aggregate into fixed time windows**. Each click lands in the currently-open window; when the window's timer expires it **closes**, emits its total downstream, and a fresh window opens (a *tumbling window*). Because a click can fire twice, a **dedup** step drops repeats so an impression is never double-counted.\n\nWatch clicks stream into the open window and the countdown close it. Toggle dedup off and inject a duplicate to see why exactly-once counting matters when real money is attached to the number.",
  sections: [
    {
      title: "Requirements",
      body: "Ingest a massive stream of click events and produce accurate aggregated counts (per ad, per minute/hour) for billing and analytics, with low latency.",
      bullets: [
        "Huge write volume: billions of click events per day.",
        "Aggregate by ad_id over time windows (per-minute, per-hour).",
        "Accuracy matters — these counts bill advertisers and catch fraud.",
        "Near-real-time dashboards + correct end-of-day totals.",
      ],
    },
    {
      title: "Ingestion: log to a stream",
      body: "Click events are first written to a durable, replayable log (**Kafka**). This decouples the firehose of producers from the aggregation layer, absorbs spikes, and — crucially for correctness — lets you **replay** events to recompute if the aggregation layer has a bug or outage.",
      flow: ["Ad click", "Event (ad_id, user, timestamp)", "Kafka (durable, replayable)", "Stream aggregators"],
      rules: ["A durable, replayable log up front = backpressure buffer + the ability to recompute."],
    },
    {
      title: "Aggregation: stream processing with windows",
      body: "A stream processor (Flink/Spark Streaming) consumes events and maintains running counts per ad per **time window** (e.g. tumbling 1-minute windows). Partition the stream by ad_id so each aggregator owns a slice and counts scale horizontally. Results are written to a queryable store (a time-series or OLAP store) for dashboards and billing.",
      flow: ["Partition by ad_id", "Windowed aggregation (per-minute counts)", "Write aggregated results", "Dashboards / billing read"],
    },
    {
      title: "Event time vs processing time (late data)",
      body: "Events arrive late and out of order (mobile offline, network delays). You must aggregate by **event time** (when the click happened), not processing time (when it arrived), or your per-minute buckets are wrong. Use **watermarks** to decide when a window is 'done enough' to emit, and an **allowed-lateness** grace period to still fold in stragglers before finalizing.",
      rules: ["Aggregate by event time + watermarks + allowed lateness — so late/out-of-order clicks land in the right bucket."],
    },
    {
      title: "Exactly-once / deduplication",
      body: "Because this bills advertisers, double-counting is real money. Achieve effectively-once by: assigning each click a unique event ID and **deduplicating** on it, using the stream processor's exactly-once/checkpointing support, and making writes to the result store **idempotent** (upsert a window's count, don't blindly increment). At-least-once ingestion + dedup is the practical recipe.",
      bullets: [
        "Unique event ID per click → dedup downstream.",
        "Checkpointed stream processing for exactly-once state.",
        "Idempotent result writes (upsert window totals, not +1).",
      ],
    },
    {
      title: "Reconciliation & fraud",
      body: "Run a slower **batch** job (lambda-style) over the raw log to recompute authoritative totals and reconcile against the fast streaming numbers — the fast path gives real-time estimates, the batch path gives billing-grade accuracy. Fraud detection (bots, click farms) also runs over the raw event log.",
    },
  ],
  qa: [
    {
      q: "How do you count clicks accurately when events arrive late and out of order?",
      a: "Aggregate by event time (when the click actually happened), not by arrival time, so each click lands in the correct time bucket. Use watermarks to estimate how far event time has progressed and decide when a window can be emitted, plus an allowed-lateness grace period so stragglers still update the window before it's finalized. Truly late events after that can be sent to a correction/late path. A batch reconciliation job over the raw log fixes anything the stream missed.",
      tip: "Event-time + watermarks + allowed-lateness is the exact streaming vocabulary this question is testing.",
    },
    {
      q: "How do you avoid double-counting clicks (which would mis-bill advertisers)?",
      a: "Treat ingestion as at-least-once and make everything downstream idempotent/deduplicated. Give each click a unique event ID and dedup on it; use a stream processor with checkpointing/exactly-once state so a replay after failure doesn't recount; and make writes to the aggregate store idempotent (upsert the window's total rather than blindly incrementing). For billing-grade numbers, reconcile the streaming totals against a batch recomputation from the raw log.",
      tip: "Unique event IDs + idempotent upserts + batch reconciliation is the money-safe answer. Pure 'increment a counter' fails under retries.",
    },
    {
      q: "Why put Kafka (a log) in front of the aggregators?",
      a: "It decouples the massive, bursty producer firehose from the aggregation layer, buffering spikes so you don't drop events. More importantly, a durable, replayable log means you can reprocess the raw event stream to recompute counts after a bug or outage — essential when the output bills customers. It also lets multiple consumers (streaming aggregation, batch reconciliation, fraud detection) read the same events independently.",
      tip: "Replayability for recompute is the standout reason here — it's what makes correctness recoverable.",
    },
    {
      q: "How do you get both real-time dashboards and accurate billing totals?",
      a: "Use a two-path (lambda-style) design: a fast streaming path produces low-latency approximate counts for dashboards, and a slower batch path recomputes authoritative totals from the raw log for billing, reconciling against the streaming numbers. The stream gives timeliness; the batch gives correctness. Over time, teams sometimes converge on a single robust streaming path (kappa) with strong exactly-once guarantees, but the two-path split cleanly separates 'fast' from 'exact'.",
      tip: "Naming the lambda (fast + batch) architecture and why — timeliness vs correctness — is the senior framing.",
    },
  ],
  related: [
    "how-do-i-handle-exactly-once-vs-at-least-once-semantics-in-p",
    "how-do-i-design-a-fan-out-fan-in-pipeline-for-heavy-computat",
    "how-do-i-handle-ordering-of-events-when-it-matters",
    "how-do-i-avoid-hot-partitions-and-skew",
    "how-do-i-avoid-processing-the-same-event-forever-due-to-pois",
  ],
};
