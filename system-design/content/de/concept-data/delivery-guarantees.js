export default {
  id: "delivery-guarantees",
  title: "Delivery guarantees & exactly-once",
  icon: "🎯",
  chapter: 19,
  group: "Streaming systems",
  summary: "Networks and processes fail, so every message pipeline chooses a guarantee: at-most-once may lose messages, at-least-once may deliver duplicates, exactly-once has no loss and no duplicates. True end-to-end exactly-once is hard — in practice it's achieved as at-least-once delivery plus an idempotent sink.",
  widget: "de-delivery",
  widgetIntro: "The whole problem is the lost acknowledgment. A consumer processes a message and sends an ack; if that ack is lost, the producer can't tell whether the message was handled. **Retry and you risk a duplicate; don't retry and you risk a loss.** That fork defines the three guarantees — and 'exactly-once' resolves it not by a magic network, but by making the sink **idempotent** so a re-delivered message changes nothing.\n\nSwitch modes and watch messages cross an unreliable channel: at-most-once loses some, at-least-once duplicates some, exactly-once dedupes them away.",
  sections: [
    {
      title: "The three guarantees",
      body: "Each is a different answer to 'what happens when an ack might be lost?'",
      table: {
        head: ["Guarantee", "On failure", "Result"],
        rows: [
          ["At-most-once", "Send, never retry", "May lose messages; never duplicates"],
          ["At-least-once", "Retry until acked", "Never loses; may duplicate"],
          ["Exactly-once", "Retry + dedupe/commit", "No loss, no duplicates (effectively)"],
        ],
      },
      body2: "At-least-once is the common default because losing data is usually worse than duplicating it — and duplicates can be made harmless.",
    },
    {
      title: "Why exactly-once is hard",
      body: "The consumer must do two things — process the message AND record that it did (commit the offset) — and these aren't a single atomic action across a network. If it processes then crashes before committing, the message is re-delivered and processed again (duplicate). If it commits then crashes before processing, the message is lost. You can't eliminate the gap; you can only make re-processing harmless.",
      rules: ["Process-and-commit isn't atomic across systems, so re-delivery (or loss) is always possible — plan for it."],
    },
    {
      title: "The practical answer: at-least-once + idempotency",
      body: "Accept at-least-once delivery (never lose), then make the sink idempotent so duplicates have no effect: dedupe by a message id, UPSERT/MERGE by key, or overwrite the output partition. Re-delivering a message then produces the same state — 'effectively-once'. This is how most real pipelines get exactly-once semantics without a magical network.",
      flow: ["at-least-once delivery", "+ idempotent sink (dedupe / upsert)", "= effectively exactly-once"],
      rules: ["Exactly-once in practice = at-least-once + an idempotent sink — not a special transport."],
    },
    {
      title: "Transactional / end-to-end variants",
      body: "Some systems offer stronger exactly-once within their boundary: Kafka transactions commit the read offset and the write atomically, and table-format sinks commit output and progress together. These give real exactly-once inside one system, but crossing into an external store usually still reduces to at-least-once + idempotency. Know where the transactional boundary ends.",
      rules: ["True exactly-once holds only inside a transactional boundary; crossing it, fall back to idempotency."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "The guarantee you need is a product decision; the mechanism is almost always idempotency.",
  deepDive: [
    {
      title: "Pick the guarantee from the cost of error",
      body: "At-most-once suits high-volume, loss-tolerant data (some metrics/logs) where duplicates would skew counts and the occasional drop is fine. At-least-once suits almost everything else — you must not lose data. Exactly-once (via idempotency) is required when duplicates are visible or dangerous: billing, inventory, dedup-sensitive counts.",
      stats: [
        { value: "at-most", label: "loss ok, no dupes (metrics)", tone: "amber" },
        { value: "at-least", label: "no loss, dupes ok (default)", tone: "green" },
        { value: "idempotent sink", label: "dupes become harmless", tone: "accent" },
        { value: "offset commit", label: "resume without loss", tone: "blue" },
      ],
    },
    {
      title: "Offsets are the loss/duplicate dial",
      body: "When you commit the consumer offset decides the behavior: commit after processing → at-least-once (crash before commit re-delivers); commit before processing → at-most-once (crash after commit loses it). So you commit after processing and rely on an idempotent sink to absorb the re-deliveries. The offset commit point is literally where you choose loss vs duplication.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Default to at-least-once: commit offsets after processing so nothing is lost, and make the sink idempotent (dedupe by id, MERGE by key, or overwrite the partition) so re-deliveries are harmless — effectively exactly-once. Use real transactional exactly-once only within a system that supports it.\"" },
    },
  ],
  qa: [
    {
      q: "Explain at-most-once, at-least-once, and exactly-once.",
      a: "They differ in how they handle a possible lost acknowledgment. At-most-once sends without retrying, so it never duplicates but may lose messages. At-least-once retries until acknowledged, so it never loses but may deliver duplicates. Exactly-once means no loss and no duplicates — but true end-to-end exactly-once is hard, so in practice it's achieved as at-least-once delivery plus an idempotent sink that makes duplicates harmless. At-least-once is the usual default because losing data is typically worse than duplicating it.",
      tip: "Frame all three as answers to 'what if the ack is lost?'; note exactly-once is usually at-least-once + idempotency.",
    },
    {
      q: "Why is true exactly-once delivery so hard?",
      a: "Because a consumer must both process a message and durably record that it did (commit its offset), and those two steps aren't atomic across a network and separate systems. If it processes then crashes before committing, the message is redelivered and processed twice. If it commits then crashes before processing, the message is lost. You can't close that gap in general, so instead of eliminating re-delivery you make re-processing produce no change — an idempotent sink — which is why 'exactly-once' in practice means at-least-once plus idempotency.",
      tip: "The non-atomicity of process-and-commit is the core reason; you make re-processing harmless rather than impossible.",
    },
    {
      q: "How do you actually achieve exactly-once semantics in a pipeline?",
      a: "Deliver at-least-once — commit consumer offsets only after processing, so a crash redelivers rather than loses — and make the sink idempotent so duplicates don't change the result: dedupe by a message/event id, UPSERT or MERGE by primary key, or overwrite the target partition. Re-delivering then yields the same state, which is effectively exactly-once. Within a single transactional system (e.g. Kafka transactions, or a table-format commit that ties output and offset together) you can get real exactly-once, but crossing into an external store you fall back to at-least-once plus idempotency.",
      tip: "'Commit offset after processing + idempotent sink' is the recipe; mention transactions as the in-boundary alternative.",
    },
  ],
  related: [],
};
