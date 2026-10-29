export default {
  id: "distributed-message-queue",
  title: "Design a distributed message queue",
  icon: "📨",
  chapter: 19,
  group: "Data & infra systems",
  summary: "Build a Kafka-style queue: producers publish messages, consumers read them, decoupled and durable at massive throughput. The core ideas are the partitioned append-only log, consumer groups with offsets, replication, and the ordering/delivery guarantees that fall out of them.",
  widget: "idempotency-race",
  widgetIntro: "A queue delivers **at-least-once** by default: if a consumer crashes after processing a message but before committing its offset, the message is redelivered and processed twice. True exactly-once is hard, so the practical answer is **idempotent consumers** — make processing a message twice have the same effect as processing it once, keyed on a unique message/operation id.\n\nFire two deliveries of the same message id and watch the idempotency check let the first through and dedupe the second. This is the same key-based guard that turns at-least-once delivery into an exactly-once *effect*.",
  sections: [
    {
      title: "Requirements",
      body: "Reliably move high volumes of messages between producers and consumers, decoupling them in time and scale.",
      bullets: [
        "High throughput, horizontal scale, durable storage of messages.",
        "Decouple producers from consumers (different rates, availability).",
        "Configurable ordering and delivery guarantees.",
        "Allow replay/re-processing of past messages.",
      ],
    },
    {
      title: "The partitioned log",
      body: "A **topic** is split into **partitions**, each an **append-only log** on disk. Producers append; each message gets a monotonically increasing **offset** within its partition. Partitions are the unit of parallelism and are spread across broker machines, so throughput scales by adding partitions and brokers.",
      rules: ["Topic = many partitions; each partition = an ordered, append-only log with per-message offsets."],
      flow: ["Producer", "Pick partition (key hash / round-robin)", "Append to partition log (offset++)", "Broker persists"],
    },
    {
      title: "Consumers, groups & offsets",
      body: "Consumers read sequentially from partitions and track their position with a stored **offset** — so nothing is lost on restart; they resume where they left off (and can rewind to replay). A **consumer group** splits partitions among its members: each partition is consumed by exactly one member of the group, so adding consumers (up to the partition count) scales processing.",
      bullets: [
        "Offset = the consumer's bookmark; committed so progress survives restarts.",
        "Within a group, one consumer per partition → parallel, non-overlapping consumption.",
        "Different groups read the same topic independently (pub/sub fan-out).",
      ],
    },
    {
      title: "Ordering",
      body: "Order is guaranteed **only within a partition**, not across the whole topic (since partitions are consumed in parallel). To keep related messages ordered, give them the same partition key (e.g. all events for a user_id hash to one partition). There's an inherent trade-off: more partitions = more parallelism but weaker global ordering.",
      rules: ["Order holds within a partition. Same key → same partition → ordered. Global order sacrifices parallelism."],
    },
    {
      title: "Durability & replication",
      body: "Each partition is **replicated** across brokers: one leader handles reads/writes, followers replicate the log. If the leader fails, a follower is promoted. Producers choose how many replicas must acknowledge a write (acks) — trading latency for durability. Messages are retained on disk for a configured time/size, enabling replay.",
      flow: ["Producer append", "Leader writes log", "Followers replicate", "Ack per acks setting", "Leader fails → follower promoted"],
    },
    {
      title: "Delivery semantics",
      body: "The three guarantees and where they come from:",
      table: {
        head: ["Guarantee", "How", "Cost"],
        rows: [
          ["At-most-once", "Commit offset before processing", "May lose messages on crash"],
          ["At-least-once", "Process, then commit offset", "May reprocess (needs idempotent consumers)"],
          ["Exactly-once", "Transactions / idempotent producer + dedup", "Complex, some overhead"],
        ],
      },
      body2: "Most systems use at-least-once + idempotent consumers — simpler than true exactly-once and safe if processing is idempotent.",
    },
  ],
  qa: [
    {
      q: "How does a partitioned log give you both scale and ordering?",
      a: "A topic is divided into partitions, each an append-only log with per-message offsets, spread across brokers. Partitions are the unit of parallelism — more partitions and brokers = more throughput, and within a consumer group each partition is read by one consumer so processing scales out. Ordering is guaranteed within a partition (offsets are sequential) but not across partitions; to keep related messages ordered you route them to the same partition via a partition key. So you dial the scale-vs-ordering trade-off with partition count and keys.",
      tip: "The crux: ordering is per-partition, parallelism is per-partition — same mechanism, so you trade them against each other via keys/partition count.",
    },
    {
      q: "What are offsets and consumer groups, and why do they matter?",
      a: "An offset is a consumer's bookmark — its position in a partition's log — committed durably so that on restart it resumes exactly where it left off (and can rewind to replay history). A consumer group divides a topic's partitions among its members, with each partition consumed by exactly one member, giving parallel, non-overlapping consumption that scales up to the partition count. Different groups consume the same topic independently, which is how one topic fans out to many downstream systems.",
      tip: "Offsets = durable resumable position + replay; consumer groups = parallelism + independent pub/sub fan-out. Both are Kafka's defining features.",
    },
    {
      q: "Explain at-most-once, at-least-once, and exactly-once — which do you use?",
      a: "They differ by when you commit the offset relative to processing. At-most-once commits before processing (fast, but a crash loses the message). At-least-once commits after processing (never loses, but a crash before commit causes reprocessing). Exactly-once uses transactions or an idempotent producer plus consumer-side dedup to avoid both — powerful but complex and slightly slower. In practice most teams choose at-least-once and make consumers idempotent, which achieves effectively-once at much lower complexity.",
      tip: "'At-least-once + idempotent consumers' is the pragmatic default — say that rather than reaching for true exactly-once.",
    },
    {
      q: "How is the queue durable and available if a broker dies?",
      a: "Each partition is replicated across brokers with one leader and several followers that replicate the leader's log. Producers choose how many replicas must acknowledge a write (the acks setting) — more acks = more durability, higher latency. If the leader broker fails, an in-sync follower is promoted to leader so the partition stays available, and committed messages aren't lost. Messages are retained on disk for a configured window, enabling replay and recovery.",
      tip: "Leader/follower replication + acks tuning + in-sync-replica promotion is the durability/availability story.",
    },
  ],
  related: [
    "when-should-i-use-a-queue-vs-direct-rpc",
    "how-do-i-handle-ordering-of-events-when-it-matters",
    "how-do-i-handle-exactly-once-vs-at-least-once-semantics-in-p",
    "how-do-i-design-dead-letter-queues-and-retry-policies",
    "how-do-i-design-an-outbox-inbox-pattern-for-reliable-events",
  ],
};
