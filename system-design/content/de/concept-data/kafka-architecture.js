export default {
  id: "kafka-architecture",
  title: "Kafka architecture",
  icon: "📬",
  chapter: 15,
  group: "Streaming systems",
  summary: "Kafka is a distributed, append-only commit log. Producers write messages to a topic split into partitions; each partition is an ordered, replayable sequence. Consumers in a group divide the partitions among themselves and track their position with offsets. That design gives durable, ordered, replayable, horizontally-scalable streaming.",
  widget: "de-kafka",
  widgetIntro: "The core abstraction is the **partitioned log**. A topic is split into **partitions**, each an ordered append-only sequence of messages. A message's **key** decides its partition (so all events for one key stay ordered), and a **consumer group** shares the partitions out — one partition per consumer at a time — so throughput scales with partition count.\n\nWatch producers append keyed messages to partitions and consumers advance their **offsets** as they read. Add a consumer and see a rebalance hand it a partition; the log stays put, so consumers can replay from any offset.",
  sections: [
    {
      title: "The log is the primitive",
      body: "A Kafka topic is an append-only log, split into partitions for scale. Writes go to the end; each message gets a monotonically increasing **offset** within its partition. Nothing is deleted on read — messages persist for a retention period — so many independent consumers can read the same log and replay it from any point.",
      bullets: [
        "**Append-only:** producers write to the tail; immutable once written.",
        "**Offsets:** each message has a position; consumers track where they are.",
        "**Retention + replay:** data stays for a window; re-read from any offset.",
      ],
      rules: ["Kafka is a durable, replayable log — not a queue that deletes on consume."],
    },
    {
      title: "Partitions: order + parallelism",
      body: "Partitioning is how Kafka scales and how it bounds ordering. Order is guaranteed **within** a partition, not across them. A message's key is hashed to pick a partition, so all messages for the same key (e.g. a user) land in the same partition and stay ordered. More partitions = more parallelism, but ordering only holds per key/partition.",
      flow: ["message key", "hash → partition", "append to partition log", "ordered within partition"],
      rules: ["Order holds within a partition only — key by what you need ordered (e.g. user_id)."],
    },
    {
      title: "Producers and consumers",
      body: "Producers publish to a topic, choosing a partition by key (or round-robin). Consumers belong to a **consumer group**: Kafka assigns each partition to exactly one consumer in the group, so the group collectively reads the whole topic with each message processed once per group. Different groups each get the full stream independently — that's how one topic feeds many systems.",
      bullets: [
        "**Consumer group:** partitions split across members; add members to scale (up to partition count).",
        "**Multiple groups:** each independent group reads the entire topic — fan-out to many consumers.",
        "**Offsets committed per group:** restart resumes where the group left off.",
      ],
    },
    {
      title: "Durability: replication",
      body: "Each partition is replicated across brokers — a leader plus followers. Producers can require acknowledgment from the in-sync replicas (`acks=all`) before a write is considered committed, so a broker failure doesn't lose data; a follower is promoted to leader. Replication factor and `acks` trade durability against latency.",
      rules: ["Replication + acks=all = no data loss on broker failure; it's the durability knob."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Kafka's power comes from a few choices: the log, partition-level ordering, consumer-group rebalancing, and pull-based consumption.",
  deepDive: [
    {
      title: "Why 'log' changes everything",
      body: "Because consumption doesn't delete data and offsets are client-tracked, the same stream can feed a real-time service, a warehouse loader, and a reprocessing job at once — each at its own pace, each able to rewind. That decoupling (one durable log, many independent readers) is why Kafka became the backbone of event-driven and streaming data platforms.",
      stats: [
        { value: "per-partition", label: "ordering guarantee", tone: "green" },
        { value: "offset", label: "client-tracked position", tone: "blue" },
        { value: "N groups", label: "each reads the whole topic", tone: "accent" },
        { value: "replicated", label: "durable across brokers", tone: "amber" },
      ],
    },
    {
      title: "Rebalancing and hot partitions",
      body: "When a consumer joins or leaves, the group rebalances partition assignments; parallelism is capped at the partition count, so you size partitions for peak throughput up front. Watch for hot partitions: a skewed key (one huge user) overloads its partition since all its messages are ordered there. Choose a key with good distribution, or add a salt, just as with database partitioning.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Kafka is a replicated, partitioned, append-only log. Key messages so related events share a partition and stay ordered; size partitions for peak parallelism; use consumer groups to scale reads and separate groups to fan out; acks=all + replication for durability; and exploit replay for reprocessing.\"" },
    },
  ],
  qa: [
    {
      q: "What is a Kafka topic, partition, and offset?",
      a: "A topic is a named stream implemented as an append-only log, split into partitions for scalability. Each partition is an ordered, immutable sequence of messages, and each message has an offset — its monotonically increasing position within that partition. Producers append to the tail; consumers read forward and track their offset, so nothing is deleted on consume and consumers can replay from any offset within the retention window. Partitions give parallelism; offsets give replayable, resumable consumption.",
      tip: "Topic = log, partition = ordered shard, offset = position; stress append-only + replayable, not a delete-on-read queue.",
    },
    {
      q: "How does Kafka guarantee ordering, and what are the limits?",
      a: "Ordering is guaranteed within a single partition, not across partitions. A message's key is hashed to select its partition, so all messages for the same key land in the same partition and are consumed in order. If you need per-entity ordering (e.g. all events for a user), key by that entity. The trade-off is that ordering is bounded to a partition, so you can't have both total ordering across the whole topic and parallelism — you choose the key to get the ordering scope you actually need.",
      tip: "Per-partition ordering + key-based partitioning is the answer; note total ordering vs parallelism is a trade-off.",
    },
    {
      q: "How do consumer groups scale consumption and fan out to many systems?",
      a: "Within a consumer group, Kafka assigns each partition to exactly one consumer, so the group collectively processes the whole topic with each message handled once, and you scale by adding consumers up to the partition count. Different consumer groups are independent — each receives the entire stream and tracks its own offsets — so one topic can feed a real-time service, a warehouse loader, and a reprocessing job simultaneously, each at its own pace and able to rewind. That's the one-log-many-readers decoupling.",
      tip: "One group = split partitions to scale; multiple groups = each gets the full stream (fan-out). Mention per-group offsets.",
    },
  ],
  related: [],
};
