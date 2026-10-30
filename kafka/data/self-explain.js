// Self-explanation prompts — shown after a module's content, before moving on.
// The learner writes the idea in their own words, then reveals a model answer
// to compare. Generate-then-compare is one of the best-evidenced study methods.
//
// Keyed by module id; a card auto-appears on any module with an entry.
// Each prompt: { prompt, answer }.

export const SELF_EXPLAIN = {
  m01: [
    {
      prompt: `In your own words: why can several independent teams read the same Kafka topic without interfering with each other — something a traditional queue can't do?`,
      answer: `Kafka is a durable, append-only <strong>log</strong>, not a destructive queue. Messages are retained for a configured time rather than deleted on read, and each consumer group tracks its <em>own</em> offset. So every group reads the same partitions independently, from any position, at its own pace — fan-out with no copies and no risk of one team consuming another's messages.`,
    },
  ],
  m02: [
    {
      prompt: `Explain the difference between pub/sub fan-out and a work queue, and how Kafka's consumer groups give you both.`,
      answer: `A <strong>work queue</strong> shares load: each message goes to exactly one worker. <strong>Pub/sub</strong> fans out: every subscriber gets every message. Kafka does both with one mechanism. <em>Within</em> a consumer group, each partition goes to one consumer — that's the work-queue behaviour (load sharing, bounded by partition count). <em>Across</em> groups, every group independently reads all messages — that's fan-out. So one topic feeds a load-balanced processing group and a dozen other independent consumers at the same time.`,
    },
  ],
  m03: [
    {
      prompt: `A producer wants to write to a topic but only knows one "bootstrap" broker. Walk through how it ends up sending to the correct broker for its partition.`,
      answer: `The producer connects to a <strong>bootstrap</strong> broker just to fetch <em>metadata</em> — the full list of brokers and, for each partition, which broker is currently its <strong>leader</strong>. It then computes the target partition (key hash or sticky), looks up that partition's leader in the metadata, and connects <em>directly</em> to that broker to produce. All reads and writes for a partition go through its leader; followers only replicate. If leadership moves, the producer gets a NOT_LEADER error, refreshes metadata, and retries against the new leader.`,
    },
  ],
  m04: [
    {
      prompt: `Explain the journey of a record inside the producer, from send() to an acknowledged write — name the stages.`,
      answer: `<strong>Serialize</strong> the key/value to bytes → the <strong>partitioner</strong> picks a partition (key hash, or sticky for null keys) → the record is appended to an in-memory <strong>batch</strong> for that partition → the batch waits up to <code>linger.ms</code> or until <code>batch.size</code>, optionally <strong>compressed</strong> → the sender thread ships it to the partition <strong>leader</strong> → the broker writes it and, with <code>acks=all</code>, waits for the in-sync replicas → an ack returns. With the idempotent producer, each batch carries a producer ID + sequence number so a retry can't create a duplicate.`,
    },
  ],
  m05: [
    {
      prompt: `Kafka writes every message to disk, yet is extremely fast. Explain the mechanisms that make disk-backed Kafka fast.`,
      answer: `Four things. <strong>Sequential appends</strong>: records are appended to the end of a log segment, which is fast even on spinning disks and friendly to SSDs. <strong>OS page cache</strong>: recent data stays in RAM managed by the OS, so most reads never touch the disk. <strong>Zero-copy</strong>: the <code>sendfile()</code> syscall streams bytes from the page cache straight to the network card, skipping a user-space copy. <strong>Batching + compression</strong>: fewer, larger I/Os. Kafka doesn't fight the hardware — it uses disks and the kernel the way they're already fast.`,
    },
  ],
  m06: [
    {
      prompt: `Explain why routing all events for order #12345 to the same partition keeps them in order, while spreading them across partitions does not.`,
      answer: `Each partition is a single append-only log owned by one leader broker, so records <em>within</em> a partition have a total order. There is no global ordering across partitions — that would require a distributed coordinator on every write. Using <code>order_id</code> as the key hashes all of that order's events to the same partition, so a single consumer reads them back in the exact sequence they were produced. The cost is that ordering is scoped to the key, not the whole topic.`,
    },
  ],
  m07: [
    {
      prompt: `A broker holding a partition's leader was just killed. Explain why producers and consumers kept working within seconds — and what guaranteed no committed data was lost.`,
      answer: `Every partition is replicated to followers, and the <strong>in-sync replicas (ISR)</strong> are caught up to the leader's high-water mark. When the controller detects the dead broker, it elects a new leader <em>from the ISR</em> — so the new leader already has every record that was acknowledged to producers (with <code>acks=all</code>), guaranteeing no committed data loss. Clients refresh their metadata, discover the new leader, and reconnect; only requests that were in flight to the old leader are retried. Uncommitted, unreplicated writes beyond the high-water mark are the only thing that can be dropped.`,
    },
  ],
  m08: [
    {
      prompt: `One consumer in a 10-consumer group crashes. Explain why all 10 might briefly stop consuming — and how cooperative rebalancing reduces that.`,
      answer: `With the older <strong>eager</strong> protocol, any membership change triggers a stop-the-world rebalance: every consumer revokes <em>all</em> of its partitions, then the group reassigns from scratch. So a single crash pauses all 10 consumers until reassignment completes (1–30s). <strong>Cooperative (incremental)</strong> rebalancing — the default since Kafka 3.1 — only revokes the specific partitions that must move to rebalance load, letting the other consumers keep processing throughout. The crashed consumer's partitions are redistributed; everyone else barely notices.`,
    },
  ],
  m09: [
    {
      prompt: `Explain what a "committed offset" is, where it lives, and why it's what makes a consumer resumable after a restart.`,
      answer: `A committed offset is the position a consumer group has durably recorded as "processed up to here" for a partition. It's stored in the internal compacted topic <code>__consumer_offsets</code>, keyed by group/topic/partition — not on the consumer's local disk. So when a consumer restarts or a partition is reassigned to a different group member, the new owner reads the last committed offset and resumes exactly there. <strong>Lag</strong> is then just the log-end offset minus that committed offset: how far behind the group is.`,
    },
  ],
  m10: [
    {
      prompt: `Explain the difference between delete retention and log compaction, and when you'd choose each.`,
      answer: `<strong>Delete retention</strong> (<code>cleanup.policy=delete</code>) ages out whole segments past a time or size bound — it doesn't care about keys. Right for <em>event streams</em> (page views, logs) where old events simply expire. <strong>Compaction</strong> (<code>compact</code>) keeps at least the latest value per key and garbage-collects superseded ones, turning the topic into a changelog/<em>table</em> — right when the topic represents current state (a user profile per user ID) that a new consumer must be able to rebuild. Rule of thumb: events age out → delete; keyed state that must stay rebuildable → compact.`,
    },
  ],
  m11: [
    {
      prompt: `Explain why at-least-once delivery can produce duplicates but never loses data, while at-most-once is the opposite.`,
      answer: `It comes down to <em>when</em> the offset is committed relative to processing. <strong>At-least-once</strong> commits the offset <em>after</em> processing: if the consumer crashes before committing, it reprocesses that record on restart → possible duplicate, but nothing is lost. <strong>At-most-once</strong> commits <em>before</em> processing: if it crashes mid-processing, the offset already moved on, so the record is never retried → no duplicate, but the record is lost. Neither is "better" — you pick the failure mode your domain tolerates (duplicates vs. loss), which is why payments use exactly-once and telemetry often uses at-most-once.`,
    },
  ],
  m12: [
    {
      prompt: `Explain why you'd reach for Kafka Connect instead of writing your own producer/consumer to move data in and out of Kafka.`,
      answer: `Connect turns integration into <em>configuration</em>. Instead of writing, testing, and operating bespoke producer/consumer code for every system, you deploy a reusable <strong>source</strong> or <strong>sink</strong> connector and configure it. The framework handles the hard parts: distributed <strong>scaling</strong> across workers, <strong>offset/position tracking</strong> for restart-safety, <strong>retries</strong>, <strong>dead-letter queues</strong> for poison records, and simple in-flight <strong>transforms (SMTs)</strong>. You only write custom code when no connector exists — otherwise it's less code, and far less to maintain.`,
    },
  ],
  m13: [
    {
      prompt: `Explain the difference between a KStream and a KTable, and why Kafka Streams keeps a local state store.`,
      answer: `A <strong>KStream</strong> is an append-only sequence of events — each record is independent, like a log of INSERTs. A <strong>KTable</strong> is a changelog where only the latest value per key is current — like a materialized table of UPDATEs. Stateful operations (aggregations, joins, windows) need memory of past records, so Streams keeps a <strong>local RocksDB state store</strong> on each instance, backed by a compacted <em>changelog topic</em>. That changelog makes state durable: on restart or failover the store is restored by replaying it — no external database required.`,
    },
  ],
  m14: [
    {
      prompt: `Explain how the Schema Registry lets producers and consumers evolve independently without breaking each other.`,
      answer: `Producers register a schema under a <strong>subject</strong>; the serializer embeds only a small <strong>schema ID</strong> in each record (not the full schema). Before accepting a new schema version, the registry enforces a <strong>compatibility</strong> rule — backward (new schema reads old data), forward (old schema reads new data), or full. So a producer can add an optional field with a default (a compatible change) and deploy without waiting for every consumer to upgrade: old consumers keep reading via their cached schema, new ones get the new field. The registry is the contract that keeps independent deploys safe.`,
    },
  ],
  m15: [
    {
      prompt: `Explain the difference between authentication and authorization in Kafka, and which mechanisms provide each.`,
      answer: `<strong>Authentication</strong> proves <em>who</em> a client is — provided by <strong>SASL</strong> (SCRAM, Kerberos/GSSAPI, OAUTHBEARER, PLAIN) or <strong>mutual TLS</strong> (client certificates). <strong>Authorization</strong> decides <em>what</em> that authenticated principal may do — provided by <strong>ACLs</strong> on resources (produce to this topic, read this group). They're separate layers: TLS on its own only <em>encrypts</em> the channel; it doesn't identify the client. A fully secured cluster uses all three — TLS to encrypt, SASL/mTLS to authenticate, ACLs to authorize — so "authenticated but not authorized" is a normal, expected state you fix with an ACL.`,
    },
  ],
  m16: [
    {
      prompt: `You can only watch a handful of Kafka metrics. Explain which you'd pick and what each one tells you.`,
      answer: `<strong>Consumer group lag</strong> — the earliest sign consumers can't keep up (produced minus consumed). <strong>UnderReplicatedPartitions</strong> — your durability margin; above zero means a broker/replica is down or lagging. <strong>ISR shrink/expand rate</strong> — replicas flapping in and out of sync, a sign of broker or disk stress. <strong>Request latency</strong> (produce/fetch) and <strong>throughput</strong> — client-facing health. <strong>Disk usage</strong> — a full log disk takes a broker offline. Metrics come over <strong>JMX</strong>, usually scraped by a Prometheus exporter into Grafana. Lag and under-replicated partitions are the two you alert on first.`,
    },
  ],
  m17: [
    {
      prompt: `Explain the throughput-vs-latency trade-off a producer makes, and the main levers you'd tune for a high-throughput pipeline.`,
      answer: `Every record can be sent immediately (low latency, many small requests) or buffered into larger batches (higher latency, far better throughput). The levers: raise <code>batch.size</code> and add a little <code>linger.ms</code> so batches fill before sending; enable <strong>compression</strong> (lz4/zstd) to shrink bytes on the wire; ensure enough <strong>partitions</strong> for consumer parallelism downstream. Durability is a <em>separate</em> axis — <code>acks</code> and <code>min.insync.replicas</code> — so you tune throughput and durability independently: big compressed batches with <code>acks=all</code> is a perfectly normal high-throughput, high-durability setup.`,
    },
  ],
  m18: [
    {
      prompt: `Explain why, during a broker failure with acks=all / RF=3 / min.insync.replicas=2, some produces may be rejected — and why that's the system working correctly.`,
      answer: `When a broker dies, its partitions lose a replica and may fall below the in-sync count. For partitions now down to a single in-sync replica, <code>min.insync.replicas=2</code> can't be satisfied, so the broker <strong>rejects</strong> <code>acks=all</code> writes with <code>NOT_ENOUGH_REPLICAS</code>. That's deliberate: Kafka would rather refuse a write than accept data it can only store once and might lose. Meanwhile the controller promotes in-sync replicas to leader for the other partitions, so most traffic continues. The rejections are the durability guarantee in action — you chose safety over availability with that config.`,
    },
  ],
  m19: [
    {
      prompt: `Walk through why Kafka is a good backbone for an order pipeline where one order event must feed eight different services.`,
      answer: `Produce each order event <em>once</em> to an <code>orders</code> topic, keyed by <code>order_id</code> so each order's state changes stay ordered in one partition. The eight services each use their <strong>own consumer group</strong>, so every service independently reads the full stream at its own pace and offset — fan-out with no duplicated producers. A slow or restarted service just resumes from its committed offset without affecting the others, and a new service can <strong>replay</strong> history from the retained log. Analytics sinks (warehouse, search) attach via <strong>Kafka Connect</strong> instead of custom consumers. One durable, replayable log; many independent readers.`,
    },
  ],
  m20: [
    {
      prompt: `An interviewer asks "why not just use RabbitMQ / SQS?" Explain how you'd decide between a log like Kafka and a traditional queue.`,
      answer: `Ask what the workload needs. Choose a <strong>log (Kafka)</strong> when you need high-throughput, <em>retained and replayable</em> streams, ordered per key, consumed by <em>many independent</em> groups — event sourcing, stream processing, an integration backbone. Choose a <strong>queue (RabbitMQ/SQS)</strong> when you need flexible per-message routing, per-message acknowledgement, and simple task distribution where consuming <em>destroys</em> the message and you don't need replay. The deciding question is usually: do I need to replay history and fan out to many consumers (Kafka), or route individual tasks to workers and delete on completion (queue)?`,
    },
  ],
  m21: [
    {
      prompt: `Explain what MirrorMaker 2 replicates across clusters and why offset translation is necessary for failover.`,
      answer: `MM2 (built on Kafka Connect) copies <strong>topics</strong> from a source cluster to a target, along with their <strong>consumer offsets</strong> and configs — for DR, migration, or geo-distribution. The catch: a replicated record gets a <em>new</em> offset in the target cluster, so a consumer's source offset is meaningless there. MM2 maintains an <strong>offset mapping</strong> so that when a consumer group fails over, it resumes near the <em>corresponding</em> target position instead of re-reading everything or skipping data. In active-active topologies, mirrored topics are prefixed by source alias (e.g. <code>us-east.orders</code>) so a cluster never re-replicates its own mirrors, preventing loops.`,
    },
  ],
  m22: [
    {
      prompt: `You add two brokers to a cluster to relieve load, but nothing rebalances. Explain what you must do and why you'd throttle it.`,
      answer: `New brokers start <strong>empty</strong> — Kafka never auto-moves existing partition data. To use them you generate and execute a <strong>partition reassignment</strong> plan (e.g. with the tool's <code>--generate</code>) that relocates some replicas onto the new brokers and rebalances leadership. Because moving replicas copies large amounts of data (the follower backfills from the leader), you apply a <strong>replication throttle</strong> so that migration traffic doesn't saturate network/disk and starve live produce/consume. Reassignment changes <em>where</em> replicas live, not the partition count — so it doesn't affect key→partition mapping or ordering.`,
    },
  ],
  m23: [
    {
      prompt: `Explain why you can always rebuild a table's current state from its CDC change stream, but never rebuild the stream from the current state — and why that asymmetry matters.`,
      answer: `The change stream is the <strong>ordered history</strong> of everything that happened to each row — every insert, every update, and the delete. Fold it by primary key (apply each event in order) and you land on exactly the <strong>current state</strong>; that fold is how a CDC "Silver" table is materialised. Going the other way is impossible: the current state is a single value per key <em>right now</em>, so it has thrown away the intermediate versions and — fatally — it has no record that a deleted row ever existed. So the log is strictly richer than the snapshot. Anything that needs order or deletes — replication, audit, event-driven microservices, precise cache invalidation — needs the stream, which is why CDC reads the log instead of querying the table.`,
    },
  ],
  m24: [
    {
      prompt: `A replication slot is both what makes CDC resumable after a restart and what can take the source database down. Explain the single mechanism behind both.`,
      answer: `A slot stores the consumer's confirmed position (<code>confirmed_flush_lsn</code>) and <strong>guarantees the WAL after that position is retained until the consumer confirms it</strong>. That one guarantee is the good news: if the connector restarts, its changes are still in the WAL, so it resumes with no data loss. It is also the bad news: if the connector stalls, lags, or all the write activity is on tables you're <em>not</em> capturing (so the slot never advances), Postgres cannot recycle that WAL and it grows without bound until the primary's disk fills. The fixes all keep the slot moving or bound its damage: monitor slot lag, enable <strong>heartbeats</strong> (so it advances even when captured tables are idle), set <code>max_slot_wal_keep_size</code> as a safety cap, and drop slots you no longer use.`,
    },
  ],
};
