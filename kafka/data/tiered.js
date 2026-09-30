// Tiered answers — one interview question, the same answer at three depths:
// Weak (what a junior says), Good (a solid mid-level answer), Senior (what
// actually impresses), plus why the senior answer wins. The goal is to show
// not just the right answer but how depth and framing level up.
//
// Shape: { id, question, topic, moduleId,
//          tiers: [ { label: 'Weak'|'Good'|'Senior', body } ], whySenior }
// Trusted in-repo HTML.

export const TIERED = [
  {
    id: 'what-is-kafka',
    topic: 'Fundamentals',
    moduleId: 'm01',
    question: `What is Kafka, and why would you use it instead of a traditional message queue?`,
    tiers: [
      { label: 'Weak', body: `"Kafka is a message queue. Producers send messages and consumers read them. You use it because it's fast and scalable."` },
      { label: 'Good', body: `"Kafka is a distributed event streaming platform. Unlike a traditional queue that deletes a message once it's consumed, Kafka stores events in an append-only log that's retained for a configured time, so multiple independent consumers can read the same stream and you can replay history. It scales by partitioning topics across brokers."` },
      { label: 'Senior', body: `"Kafka is a distributed, replicated commit log. The key mental shift from a queue is that <b>consumption doesn't destroy data</b> — the log is the source of truth, retained by time or size, and each consumer group tracks its own offset. That unlocks things a queue can't: fan-out to many independent consumers, replay/reprocessing after a bug, and using the log as an integration backbone between systems. It trades per-message routing flexibility (like RabbitMQ) for throughput, durability, and ordered, replayable streams — so I reach for it for event sourcing, stream processing, and decoupling services at scale, not for simple task queues where a broker like RabbitMQ or SQS fits better."` },
    ],
    whySenior: `The senior answer names the core abstraction (a replicated log), explains <i>why</i> the log model matters (non-destructive reads → fan-out + replay), and — crucially — says when <b>not</b> to use Kafka. Knowing the trade-off and the boundary is what separates someone who's used Kafka from someone who understands it.`,
  },
  {
    id: 'exactly-once',
    topic: 'Delivery guarantees',
    moduleId: 'm11',
    question: `Does Kafka support exactly-once delivery?`,
    tiers: [
      { label: 'Weak', body: `"Yes, you just turn on exactly-once and Kafka handles it."` },
      { label: 'Good', body: `"Kafka supports exactly-once semantics using idempotent producers and transactions. The idempotent producer stops duplicate writes on retries, and transactions let you write to multiple partitions atomically. You enable it with <code>enable.idempotence=true</code> and a <code>transactional.id</code>."` },
      { label: 'Senior', body: `"Kafka offers exactly-once <i>semantics</i>, but it's important to be precise about scope. It's exactly-once for <b>Kafka-to-Kafka read-process-write</b>: idempotent producers dedupe retries with a producer ID + sequence number, and transactions commit the output records and the consumer offsets atomically so a batch is all-or-nothing. What it does <b>not</b> do is extend that guarantee to an external system — if my consumer writes to a database or calls an API, Kafka's transaction doesn't cover that side effect. There I'd keep at-least-once and make the write idempotent (upsert on an event ID). So my answer is: yes within Kafka, and for external sinks I get effective exactly-once through idempotency, not Kafka transactions."` },
    ],
    whySenior: `"Yes" is a trap answer. The senior response draws the boundary exactly-once semantics actually has — Kafka-to-Kafka — and shows the correct pattern for the far more common case of an external sink. Interviewers ask this specifically to see if you know that limit.`,
  },
  {
    id: 'ordering',
    topic: 'Partitions & ordering',
    moduleId: 'm06',
    question: `How does Kafka guarantee message ordering?`,
    tiers: [
      { label: 'Weak', body: `"Kafka keeps messages in order because it's a queue — they come out in the order they went in."` },
      { label: 'Good', body: `"Kafka guarantees ordering within a partition, not across a whole topic. Records with the same key go to the same partition (hash of the key), so all events for that key stay ordered. Across partitions there's no global order."` },
      { label: 'Senior', body: `"Ordering is a <b>per-partition</b> guarantee — a partition is an ordered, immutable log, and offsets increase monotonically within it. There's no total order across a topic, by design, because that's what allows parallelism. So 'ordering' is really a design decision about your key: same-key records share a partition and stay ordered, so you key by whatever entity needs sequential processing (order ID, account ID). Two caveats I'd mention: with retries, ordering can break unless you use the idempotent producer or set <code>max.in.flight.requests</code> appropriately; and increasing partitions later re-maps keys, so events for a key can split across old and new partitions — which is why I size partitions with ordering in mind up front."` },
    ],
    whySenior: `The good answer is correct; the senior answer connects the guarantee to real design consequences — key choice, the retry/in-flight caveat, and why repartitioning threatens ordering. It shows they've been bitten by the edge cases, not just read the docs.`,
  },
  {
    id: 'consumer-lag',
    topic: 'Operations',
    moduleId: 'm09',
    question: `A consumer group's lag is growing. How do you diagnose it?`,
    tiers: [
      { label: 'Weak', body: `"Add more consumers so it can keep up."` },
      { label: 'Good', body: `"First I'd check whether production spiked or consumption slowed. If consumers are the bottleneck, I'd look at whether the group has fewer consumers than partitions and scale up to the partition count. I'd also check for errors or slow processing in the consumer."` },
      { label: 'Senior', body: `"I'd treat lag as 'produced minus consumed' and localize which side moved before changing anything. If production is steady, it's consumer-side: I'd split lag <b>per partition/member</b> — even lag across all members points to genuine under-capacity (scale consumers up to, but not beyond, the partition count), while lag concentrated on one partition points to a hot key or one slow member. I'd check group state for a rebalance loop (often processing exceeding <code>max.poll.interval.ms</code> after a deploy), and look downstream — a slow DB or API call in the record path is a common hidden cause. Only once I've found the actual bottleneck do I pick the lever: more consumers, smaller poll batches, a better key, or fixing the downstream. Adding consumers blindly does nothing for a hot partition or a rebalance storm."` },
    ],
    whySenior: `The weak answer jumps to a fix; the senior answer is a <i>diagnosis method</i> — localize the cause, split by partition, rule out rebalance and downstream, then choose the matching lever. Interviewers want the reasoning process, and the explicit "adding consumers won't help a hot partition" shows real operational depth.`,
  },
  {
    id: 'acks-durability',
    topic: 'Producer durability',
    moduleId: 'm04',
    question: `How do you make sure a produced message is never lost?`,
    tiers: [
      { label: 'Weak', body: `"Set acks=all so it waits for confirmation."` },
      { label: 'Good', body: `"Use <code>acks=all</code> so the producer waits for all in-sync replicas, with a replication factor of 3. Also enable retries and the idempotent producer so retries don't create duplicates."` },
      { label: 'Senior', body: `"Durability is a chain, and every link has to hold. On the producer: <code>acks=all</code>, <code>enable.idempotence=true</code>, and retries, so acknowledged writes are replicated and retries don't duplicate. On the topic: replication factor 3 <b>and</b> <code>min.insync.replicas=2</code> — this pairing is the real guarantee, because <code>acks=all</code> alone will happily accept a write when the ISR has shrunk to a single replica; min.insync.replicas=2 forces at least two copies or the write is rejected. And I'd make sure <code>unclean.leader.election=false</code> so an out-of-sync replica can't be elected leader and silently drop data. Then the consumer side has to commit offsets only after processing, or the message is 'not lost' in Kafka but lost in effect."` },
    ],
    whySenior: `Everyone says <code>acks=all</code>. The senior answer knows the famous gotcha — acks=all without <code>min.insync.replicas</code> can still leave one copy — and treats durability end-to-end (producer, topic config, unclean election, consumer commit). That completeness is exactly what the question is probing for.`,
  },
];
