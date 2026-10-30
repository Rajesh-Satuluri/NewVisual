export default {
  id: "exactly-once-vs-at-least-once-streaming",
  question: "How do I choose exactly-once vs at-least-once for a streaming pipeline?",
  icon: "🎯",
  difficulty: "Advanced",
  category: "Streaming & Windowing",
  tags: ["Streaming", "Delivery", "Reliability"],
  tldr: "At-least-once never loses an event but can duplicate it; exactly-once adds dedup/transactions so each event affects the result once. Default to at-least-once plus an idempotent sink — that gives effectively-once results far more cheaply than true end-to-end exactly-once.",
  intro: "Delivery semantics describe what happens when things fail and retry. At-most-once may drop events (fire and forget). At-least-once guarantees delivery but may redeliver on retry — so you can double-count. Exactly-once guarantees each event is reflected in the output exactly one time. The honest framing: true exactly-once is expensive and bounded; what you usually want is at-least-once delivery combined with an idempotent or transactional sink, which produces exactly-once *results*.",
  steps: [
    {
      title: "Decide what one duplicate actually costs",
      body: "The semantic you need is set by the consequence of a double. A duplicated ad impression skews a dashboard by a rounding error — at-least-once is fine. A duplicated payment or balance update is a bug that reaches a customer — you need exactly-once-effect. Name the cost of a duplicate before choosing the machinery.",
      rules: ["Match the guarantee to the cost of a duplicate, not to ambition", "Most analytics tolerate at-least-once; money and inventory do not"]
    },
    {
      title: "Start from at-least-once — it's the safe default",
      body: "At-least-once means: process, then acknowledge the offset only after the result is durably written. If you crash between processing and ack, you reprocess — that's the duplicate. It never loses data, it's simple, and every broker/engine supports it. The only thing left is to neutralize the duplicates.",
      bullets: [
        "Commit the source offset only after the output is durably written.",
        "A crash in that window causes reprocessing, never loss.",
        "This is cheap and universally supported — begin here."
      ]
    },
    {
      title: "Make the sink idempotent to get exactly-once effect",
      body: "If applying the same event twice lands you in the same state as applying it once, duplicates stop mattering. Upsert on a primary key, dedupe on an event id within a window, or write to a keyed store. At-least-once delivery + idempotent sink = exactly-once *results*, which is what the business actually cares about — usually far cheaper than transactional exactly-once.",
      rules: ["Idempotent sink turns harmless redelivery into correct results", "Dedup needs a stable event key and bounded state (a time window)"]
    },
    {
      title: "Use true exactly-once only where you must",
      body: "End-to-end exactly-once (Kafka transactions, Flink checkpoints with transactional sinks) ties offset commits and output writes into one atomic transaction. It works, but costs throughput and latency, requires every hop to participate, and only holds inside systems that support it. Reach for it when there is no natural idempotency key and a duplicate is unacceptable.",
      bullets: [
        "Transactional offset-commit + output write, checkpoint-aligned.",
        "Lower throughput, higher latency, all hops must cooperate.",
        "Justified when no idempotency key exists and doubles are intolerable."
      ]
    },
    {
      title: "Never silently choose at-most-once",
      body: "At-most-once (ack before processing, no retry) is fast but loses events on failure. It's acceptable only for truly disposable signals where a gap is cheaper than a duplicate — rare in data engineering. Make it a conscious choice, never an accident of acking too early.",
      rules: ["At-most-once loses data on failure — choose it deliberately or not at all"]
    }
  ],
  flow: [
    "What does a duplicate cost?",
    "Default: at-least-once (ack after write)",
    "Add idempotent/dedup sink → exactly-once effect",
    "No idempotency key + zero tolerance? → transactional exactly-once",
    "Disposable signal? → at-most-once (deliberately)"
  ],
  checklist: [
    "Have you priced the cost of one duplicate for this data?",
    "Do you commit the source offset only after the output is durable?",
    "Can the sink dedupe/upsert on a stable key within a bounded window?",
    "Is true exactly-once reserved for the cases with no idempotency key?",
    "Is at-most-once (lossy) only used where a gap is genuinely acceptable?"
  ],
  widget: "de-delivery",
  draft: false
};
