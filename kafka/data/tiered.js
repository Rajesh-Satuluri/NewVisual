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
  {
    id: 'replication-isr',
    topic: 'Replication & availability',
    moduleId: 'm07',
    question: `What is the ISR, and what happens to it when a broker fails?`,
    tiers: [
      { label: 'Weak', body: `"ISR is the replicas. If a broker fails, another replica takes over."` },
      { label: 'Good', body: `"The ISR (in-sync replica set) is the replicas that are caught up to the leader. If the leader's broker fails, the controller elects a new leader from the ISR, so no acknowledged data is lost. A follower that falls behind is dropped from the ISR until it catches up."` },
      { label: 'Senior', body: `"The ISR is the set of replicas caught up to the leader's log — specifically within <code>replica.lag.time.max.ms</code>. It matters because two guarantees hang off it: consumers can only read up to the <b>high-water mark</b> (the max offset all ISR members have), and with <code>acks=all</code> a write isn't acknowledged until the ISR has it. On leader failure, the controller elects a new leader <i>from the ISR</i>, so the new leader already holds every acknowledged record — <b>provided</b> <code>unclean.leader.election=false</code>. The subtle part is the interaction with <code>min.insync.replicas</code>: if enough followers drop out that the ISR falls below that floor, <code>acks=all</code> producers start getting <code>NOT_ENOUGH_REPLICAS</code> — availability is sacrificed to keep durability. So the ISR is really the knob where the CAP trade-off lives."` },
    ],
    whySenior: `The senior answer ties the ISR to the three things that actually depend on it — high-water mark, acks=all, and leader election — and surfaces the min.insync.replicas interaction that turns a replication question into an availability-vs-durability trade-off. That's the depth interviewers are probing for.`,
  },
  {
    id: 'rebalance-storm',
    topic: 'Consumer groups',
    moduleId: 'm08',
    question: `What is a consumer group rebalance, and why can it hurt you in production?`,
    tiers: [
      { label: 'Weak', body: `"A rebalance is when Kafka moves partitions between consumers. It happens automatically."` },
      { label: 'Good', body: `"A rebalance reassigns a topic's partitions across the consumers in a group — triggered when a consumer joins, leaves, or is considered dead. With the old eager protocol it's stop-the-world: all consumers pause while partitions are redistributed. Cooperative rebalancing reduces that by only moving the partitions that need to move."` },
      { label: 'Senior', body: `"A rebalance redistributes partitions when group membership changes. The production pain is twofold. First, the <b>eager</b> protocol is stop-the-world — every consumer revokes all partitions and the whole group pauses — so even a single pod restart stalls the group. Cooperative (incremental) rebalancing, the default since 3.1, only revokes partitions that must move. Second, and worse, is a <b>rebalance storm</b>: if per-batch processing exceeds <code>max.poll.interval.ms</code>, the coordinator evicts the 'stuck' consumer, which triggers a rebalance, which slows everyone, which trips the next consumer — a loop where the group spends all its time rebalancing and almost none consuming. I defend against it with <code>CooperativeStickyAssignor</code>, <code>static membership</code> (<code>group.instance.id</code>) so rolling restarts don't trigger reassignment, a right-sized <code>max.poll.records</code>, and alerting on rebalance rate, not just lag."` },
    ],
    whySenior: `The good answer defines a rebalance; the senior answer names the failure mode that actually pages you — the rebalance storm driven by max.poll.interval.ms — and lists the concrete defenses (cooperative sticky, static membership, poll sizing). It's the difference between knowing the concept and having operated it.`,
  },
  {
    id: 'compaction-vs-retention',
    topic: 'Retention & compaction',
    moduleId: 'm10',
    question: `When would you use log compaction instead of time-based retention?`,
    tiers: [
      { label: 'Weak', body: `"Compaction saves disk space by removing old messages."` },
      { label: 'Good', body: `"Time retention deletes messages older than a threshold. Compaction instead keeps the latest value for each key and removes older values for that key. You use compaction when the topic represents state — like the current value per entity — so consumers can rebuild it."` },
      { label: 'Senior', body: `"They answer different questions. <code>delete</code> retention treats the topic as an <b>event stream</b> and ages out whole segments by time/size — right for page views, metrics, logs, where old events are simply irrelevant. <code>compact</code> treats the topic as a <b>changelog / table</b>: it guarantees at least the latest record per key survives forever, so a brand-new consumer can replay from offset 0 and reconstruct current state per key — this is the backbone of Kafka Streams state stores and CDC topics. Two details I'd mention: deletes are expressed as <b>tombstones</b> (null value for a key), retained for <code>delete.retention.ms</code> so consumers can observe the delete before it's compacted away; and you can combine <code>compact,delete</code> when you want latest-per-key <i>and</i> a hard time bound. The mental model is log-vs-table: events age out, state compacts."` },
    ],
    whySenior: `The senior answer frames it as log-vs-table rather than a disk-space trick, names the real use cases (Streams state, CDC), and knows the mechanics that trip people up — tombstones and the combined policy. That framing shows conceptual command, not just a definition.`,
  },
  {
    id: 'schema-evolution',
    topic: 'Schema Registry',
    moduleId: 'm14',
    question: `How do you evolve a message schema without breaking consumers?`,
    tiers: [
      { label: 'Weak', body: `"Just add the new field and redeploy everything at the same time."` },
      { label: 'Good', body: `"Use the Schema Registry with a compatibility mode. If you add an optional field with a default, that's a backward/forward-compatible change, so old and new consumers both keep working. The registry rejects an incompatible schema before the producer can use it."` },
      { label: 'Senior', body: `"I'd let the <b>compatibility contract</b> do the enforcing and design changes to fit it. The registry stores schemas per subject and embeds only a schema ID in each record; before a new version is accepted it checks the configured mode. <b>Backward</b> compatibility (new schema can read old data) lets me upgrade consumers first; <b>forward</b> (old schema can read new data) lets me upgrade producers first; <b>full</b> enforces both. So the safe menu is: add optional fields with defaults, don't remove required fields, don't change types or rename without an alias. Concretely, if I must make a breaking change I version it — a new subject/topic or a union type — and migrate, rather than force a lockstep deploy. The whole point of the registry is that producers and consumers roll out <i>independently</i>; a big-bang redeploy means I've thrown that away."` },
    ],
    whySenior: `The weak answer's lockstep redeploy defeats the purpose of a registry. The senior answer uses the compatibility direction to decide deploy order, lists which changes are safe vs breaking, and has a plan for genuinely breaking changes — showing they understand the registry as a contract enabling independent deploys.`,
  },
  {
    id: 'exactly-once-sink',
    topic: 'Delivery into external systems',
    moduleId: 'm11',
    question: `Your consumer writes to a database. How do you avoid double-processing on redelivery?`,
    tiers: [
      { label: 'Weak', body: `"Turn on exactly-once in Kafka and it won't happen."` },
      { label: 'Good', body: `"Kafka is at-least-once by default, so a restart can redeliver records. I'd make the database write idempotent — an upsert keyed by the event ID — so reprocessing the same event doesn't create a duplicate row."` },
      { label: 'Senior', body: `"The key realization is that Kafka's exactly-once semantics are <b>Kafka-to-Kafka</b> and don't extend to a database, so I don't reach for transactions here. Kafka guarantees at-least-once, meaning a crash between processing and offset commit redelivers records. I make the <i>effect</i> idempotent instead: write via an <b>upsert</b> or <code>INSERT … ON CONFLICT</code> keyed by a stable <code>event_id</code>, or keep a processed-IDs table — so a redelivered event lands on the same row to the same value and double-counting is impossible. I'd also tighten the redelivery window with a manual offset commit <i>after</i> the DB write. If I needed the write and the offset commit to be truly atomic I'd use the transactional outbox pattern, not Kafka transactions. Net: keep at-least-once (no loss), make the sink idempotent (no duplicates)."` },
    ],
    whySenior: `This is the question that catches people who think "exactly-once" is a switch. The senior answer draws the Kafka-to-Kafka boundary, gives the real pattern (idempotent upsert keyed by event ID), and even names the outbox pattern for atomic needs — exactly the operational maturity being tested.`,
  },
  {
    id: 'kraft-why',
    topic: 'Architecture',
    moduleId: 'm03',
    question: `Why did Kafka replace ZooKeeper with KRaft?`,
    tiers: [
      { label: 'Weak', body: `"ZooKeeper was old, so they removed it to simplify things."` },
      { label: 'Good', body: `"ZooKeeper was a separate system Kafka depended on for metadata — the controller, topic configs, ISR, etc. KRaft moves that metadata into Kafka itself using a Raft-based controller quorum, so there's one system to operate instead of two, and failover and scaling improve."` },
      { label: 'Senior', body: `"ZooKeeper was both an <b>operational</b> and a <b>scalability</b> bottleneck. Operationally it was a second distributed system to deploy, secure, and tune. Technically, cluster metadata lived in ZooKeeper and the controller cached it, so on controller failover the new controller had to <i>reload</i> all metadata from ZooKeeper — a process that grew with partition count and capped practical cluster size (tens of thousands of partitions). <b>KRaft</b> makes metadata a Raft-replicated <i>log</i> internal to Kafka: controllers are a quorum that already hold the metadata log, so failover is near-instant (just elect a new leader of an already-replicated log), and the design scales to millions of partitions. It also unifies the security and tooling story. The trade-off was a long migration path, but for new clusters KRaft is the default and ZooKeeper is deprecated."` },
    ],
    whySenior: `The senior answer explains the actual mechanism — metadata as a Raft log vs. a ZooKeeper reload on failover — and connects it to the real limits it removed (failover time, partition ceiling). That's understanding why the change happened, not just that it did.`,
  },
  {
    id: 'partition-sizing',
    topic: 'Capacity planning',
    moduleId: 'm06',
    question: `How many partitions should a new topic have?`,
    tiers: [
      { label: 'Weak', body: `"Pick a big number like 100 so you never run out."` },
      { label: 'Good', body: `"Partition count is the ceiling on consumer parallelism, since one partition is read by one consumer in a group. I'd size it from target throughput divided by what one consumer can handle, with some headroom, because you can increase partitions later but not decrease them."` },
      { label: 'Senior', body: `"I size from <b>both</b> the producer and consumer sides and take the max, then add headroom. Consumer side: partitions ≥ target throughput ÷ single-consumer throughput, because parallelism in a group is capped by partition count. Producer side: enough partitions to spread load across brokers without a hot partition. Then I temper it, because partitions aren't free — each adds open file handles, memory, and, critically, <b>longer leader-election/recovery time</b> on broker failure and more end-to-end latency. The asymmetry drives the decision: you can add partitions but never remove them, and adding them <b>re-maps keys</b> and breaks per-key ordering, so for keyed/ordered topics I'd rather provision a sensible higher number up front than migrate later. A rough starting heuristic is low-tens for a serious topic, validated against measured per-partition throughput — not 1 and not 1000."` },
    ],
    whySenior: `The senior answer sizes from both producer and consumer sides, quantifies the cost of over-partitioning (recovery time, latency), and leans on the real asymmetry — can't decrease, and increasing breaks key ordering. That turns a guess into an engineering decision.`,
  },
];
