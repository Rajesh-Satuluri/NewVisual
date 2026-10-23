// Decision drills — "Choose the Right Approach".
// Each scenario gives a real requirement and a few candidate approaches. The
// learner picks one, then sees WHY each option is best / viable / wrong, in
// plain language with enough detail to actually learn the trade-off — plus how
// the answer flips if the requirement changes, and how to say it in an
// interview.
//
// Shape:
//   { id, title, difficulty, topic, moduleId, requirement,
//     options: [ { label, verdict: 'best'|'viable'|'wrong', why } ],
//     whatIfChanged, interviewNote }
//
// `why` is written so the reader understands not just THAT an option is
// right/wrong but the mechanism behind it. Content is trusted in-repo HTML.

export const DECISIONS = [
  {
    id: 'acks-durability',
    title: 'Payment events must never be lost',
    difficulty: 'medium',
    topic: 'Producer durability',
    moduleId: 'm04',
    requirement: `You're producing <b>payment confirmation</b> events. Losing even one is unacceptable — the money moved, so the event has to survive a broker crash. Throughput is modest. Which producer setting?`,
    options: [
      {
        label: 'acks=all + min.insync.replicas=2 (RF=3)',
        verdict: 'best',
        why: `With <code>acks=all</code> the producer waits until <b>every in-sync replica</b> has written the record before it's considered sent. Setting <code>min.insync.replicas=2</code> means the write is only accepted if at least 2 replicas are in sync — so even if one broker dies right after the ack, a second copy already exists. This is the standard "don't lose data" recipe: one broker failure can never cost you an acknowledged event.`,
      },
      {
        label: 'acks=1',
        verdict: 'wrong',
        why: `<code>acks=1</code> waits only for the <b>leader</b> to write the record — not the followers. If the leader crashes after acking but before a follower copied the record, that event is gone forever. For money, that's a real data-loss window. Fine for logs, not for payments.`,
      },
      {
        label: 'acks=0',
        verdict: 'wrong',
        why: `<code>acks=0</code> is fire-and-forget: the producer doesn't wait for any confirmation at all. It's the fastest option and the least safe — a dropped network packet loses the event silently. Never use it when the data matters.`,
      },
    ],
    whatIfChanged: `If these were <b>click-tracking</b> events instead of payments, you'd happily drop to <code>acks=1</code> (or even <code>acks=0</code>): losing a few clicks in a crash is cheap, and you'd rather have the throughput and lower latency.`,
    interviewNote: `Name the pair, not just acks: "<code>acks=all</code> <b>with</b> <code>min.insync.replicas=2</code>." acks=all alone on a topic where the ISR has shrunk to 1 still only guarantees one copy — the min.insync.replicas is what forces a second.`,
  },

  {
    id: 'partition-count',
    title: 'Sizing partitions for a new topic',
    difficulty: 'medium',
    topic: 'Partitions & parallelism',
    moduleId: 'm06',
    requirement: `A new topic needs to handle about <b>10× today's traffic</b> within a year, and you want room for consumers to scale out. How many partitions?`,
    options: [
      {
        label: 'Over-provision moderately (e.g. 30) based on peak throughput ÷ per-partition capacity',
        verdict: 'best',
        why: `Partition count is the <b>ceiling on consumer parallelism</b> — a partition is read by exactly one consumer in a group, so N partitions means at most N active consumers. You size it from your target peak throughput divided by what one partition/consumer can handle, with headroom for growth. You can add partitions later, but it's disruptive (it changes key→partition mapping and breaks ordering for keyed data), so picking a sensible higher number up front is the pragmatic choice.`,
      },
      {
        label: 'Start with 3 and add partitions when you need them',
        verdict: 'viable',
        why: `Works, and keeps per-topic overhead low — but adding partitions later <b>re-hashes keys to different partitions</b>, so records with the same key can land in a new partition and lose their ordering guarantee. If ordering per key matters, this "grow later" plan causes a painful migration. Acceptable only if you don't depend on key ordering.`,
      },
      {
        label: 'Use 1000 partitions to be safe',
        verdict: 'wrong',
        why: `Every partition costs real resources: open file handles, memory for the leader/replica bookkeeping, and — critically — more partitions mean <b>longer leader-election and recovery times</b> when a broker fails, plus more end-to-end latency. Massively over-partitioning hurts availability and latency for no benefit. More is not free.`,
      },
    ],
    whatIfChanged: `If the topic carried <b>no keys and no ordering requirement</b> (pure load spreading), "start small and grow" becomes the best answer — you lose nothing by adding partitions later.`,
    interviewNote: `The one-liner: "Partitions cap consumer parallelism and are hard to increase without breaking key ordering, so I size from target throughput with headroom rather than guessing low or padding huge."`,
  },

  {
    id: 'key-choice',
    title: 'Do these events need a key?',
    difficulty: 'easy',
    topic: 'Partitioning & ordering',
    moduleId: 'm06',
    requirement: `You're publishing <b>order-status updates</b> (created → paid → shipped) for many orders. Consumers must process each order's updates <b>in order</b>. What do you use as the record key?`,
    options: [
      {
        label: 'Key by order ID',
        verdict: 'best',
        why: `Kafka only guarantees ordering <b>within a partition</b>, and the default partitioner sends all records with the same key to the same partition (<code>hash(key) % partitions</code>). Keying by <code>order_id</code> means every update for one order lands in one partition, in send order — so "created → paid → shipped" is never reordered. Different orders spread across partitions for parallelism.`,
      },
      {
        label: 'No key (round-robin)',
        verdict: 'wrong',
        why: `With a null key, records are spread across all partitions for balance — which means two updates for the same order can land in <b>different partitions</b> and be consumed out of order. "shipped" could be processed before "paid." Breaks the requirement.`,
      },
      {
        label: 'Key by customer ID',
        verdict: 'viable',
        why: `This <i>does</i> keep a given customer's events ordered and in one partition — but it's coarser than needed. All of one big customer's orders funnel into a single partition, which can create a <b>hot partition</b>. It satisfies per-order ordering (a customer's orders are a superset) but sacrifices balance. Order ID is the cleaner match.`,
      },
    ],
    whatIfChanged: `If order updates were <b>independent</b> and ordering didn't matter, no key (round-robin) becomes best — you'd want the even load spread and wouldn't care about sequence.`,
    interviewNote: `Tie the key directly to the ordering unit: "Ordering is per-partition, and same-key records share a partition, so the key should be whatever entity needs ordered processing — here, the order ID."`,
  },

  {
    id: 'retention-policy',
    title: 'Retention vs compaction for a topic',
    difficulty: 'medium',
    topic: 'Retention & compaction',
    moduleId: 'm10',
    requirement: `A topic holds the <b>current state of each user's profile</b> — one record per change, keyed by user ID. New consumers must be able to rebuild the full latest state by reading the topic. What cleanup policy?`,
    options: [
      {
        label: 'Log compaction (cleanup.policy=compact)',
        verdict: 'best',
        why: `Compaction keeps the <b>latest value for each key</b> and garbage-collects older values — so the topic becomes a changelog that always retains at least the most recent state per user, no matter how old. A brand-new consumer can replay from the start and reconstruct every user's current profile. This is exactly the "table as a log" use case.`,
      },
      {
        label: 'Time retention of 7 days (cleanup.policy=delete)',
        verdict: 'wrong',
        why: `Time-based deletion drops records older than 7 days <b>regardless of key</b>. A user whose profile hasn't changed in 8 days would have their last record deleted — so a new consumer reading the topic could never learn that user's state. It loses exactly the data you need to keep.`,
      },
      {
        label: 'Compaction + a long delete retention (compact,delete)',
        verdict: 'viable',
        why: `The combined policy compacts <i>and</i> still deletes segments past a time bound. Useful when you want the latest-per-key behavior but also a hard cap on how far back tombstoned/deleted keys linger. Slightly more to reason about than pure compaction; reach for it only if you genuinely need the time bound too.`,
      },
    ],
    whatIfChanged: `If the topic were an <b>append-only event stream</b> (e.g. page views) rather than per-key state, plain time/size retention (<code>delete</code>) is correct — there's no "latest value per key" to preserve, you just age out old events.`,
    interviewNote: `Frame it as log-vs-table: "Events that age out → delete retention. State keyed by an entity that must be rebuildable → compaction, because it guarantees the latest value per key survives."`,
  },

  {
    id: 'consumer-scaling',
    title: 'Consumers can\'t keep up — lag is growing',
    difficulty: 'medium',
    topic: 'Consumer groups & scaling',
    moduleId: 'm08',
    requirement: `A topic has <b>6 partitions</b>. Its consumer group currently has 4 consumers and lag is climbing. You need more processing throughput. What do you do?`,
    options: [
      {
        label: 'Add 2 more consumers (up to 6 total)',
        verdict: 'best',
        why: `Each partition is handled by exactly one consumer in the group, so with 6 partitions you can run up to <b>6 consumers in parallel</b>. Going from 4 to 6 puts every partition on its own consumer — the maximum parallelism this topic allows — and a rebalance redistributes the load. Cheapest, safest fix that directly raises throughput.`,
      },
      {
        label: 'Add a 7th and 8th consumer (8 total)',
        verdict: 'wrong',
        why: `You only have 6 partitions, so at most 6 consumers can be active. Consumers 7 and 8 would sit <b>completely idle</b>, assigned no partitions. They add rebalance overhead and cost without processing anything. Parallelism is capped by partition count, not consumer count.`,
      },
      {
        label: 'Increase partitions to 12, then add consumers',
        verdict: 'viable',
        why: `This genuinely raises the parallelism ceiling and is the right move if 6 consumers <i>still</i> can't keep up. But increasing partitions <b>re-maps keys</b> (breaking per-key ordering during/after the change) and is more disruptive than just adding consumers. Do it as a second step, only once you've maxed out consumers at 6.`,
      },
    ],
    whatIfChanged: `If lag were caused by <b>one slow consumer instance</b> (not overall capacity), scaling out won't help — you'd profile that consumer's processing, check for a poison record or a slow downstream call, rather than add members.`,
    interviewNote: `Lead with the ceiling: "Consumers in a group can't exceed partitions, so first I'd scale consumers up to the partition count; only if that's still not enough do I add partitions, knowing it disturbs key ordering."`,
  },

  {
    id: 'eos-need',
    title: 'Is exactly-once worth it here?',
    difficulty: 'hard',
    topic: 'Delivery guarantees',
    moduleId: 'm11',
    requirement: `A consumer reads events, updates a <b>running total in a database</b>, and commits. A duplicate would double-count and corrupt the total. What delivery approach?`,
    options: [
      {
        label: 'At-least-once + idempotent writes (upsert / dedupe key)',
        verdict: 'best',
        why: `The simplest robust answer: keep Kafka at at-least-once (commit offset <b>after</b> processing), but make the database write idempotent — e.g. an upsert keyed by event ID, or tracking processed IDs. Then a redelivered event updates the same row to the same value instead of adding again. You get correctness without the cost and complexity of Kafka transactions, and it works even though the DB is outside Kafka.`,
      },
      {
        label: 'Kafka exactly-once semantics (transactions)',
        verdict: 'viable',
        why: `EOS with transactional producers gives atomic read-process-write <b>within Kafka</b> (Kafka topics in, Kafka topics out). But here the side effect is an <b>external database</b> — Kafka transactions don't extend to it, so you'd still need idempotency on the DB write. More moving parts (transactional.id, coordinator, throughput cost) for a guarantee that doesn't fully cover your actual sink.`,
      },
      {
        label: 'At-most-once (commit offset before processing)',
        verdict: 'wrong',
        why: `Committing before processing means a crash mid-update <b>loses</b> that event entirely — the total is now permanently too low. You traded double-counting for under-counting. Wrong direction for a running total that must be accurate.`,
      },
    ],
    whatIfChanged: `If the output were <b>another Kafka topic</b> instead of a database, Kafka's exactly-once (read-process-write in one transaction) becomes the clean best answer — the guarantee then actually spans the whole path.`,
    interviewNote: `The senior move is spotting the boundary: "Exactly-once is a Kafka-to-Kafka guarantee. My sink is a database, so I get correctness more cheaply with at-least-once plus an idempotent upsert than by reaching for transactions that don't cover the DB anyway."`,
  },

  {
    id: 'replication-factor',
    title: 'Replication factor for a production topic',
    difficulty: 'easy',
    topic: 'Replication & durability',
    moduleId: 'm07',
    requirement: `You're creating a topic for <b>business-critical</b> data on a multi-broker cluster and must survive a single broker failure with no data loss and no downtime. What replication factor?`,
    options: [
      {
        label: 'RF=3 with min.insync.replicas=2',
        verdict: 'best',
        why: `RF=3 keeps three copies on three brokers. With <code>min.insync.replicas=2</code> and <code>acks=all</code>, a write needs two in-sync copies to be accepted — so losing <b>one</b> broker still leaves a valid, writable partition (2 copies, meets the floor). It's the standard production default: tolerates one failure for both reads and writes, with room to lose a broker during maintenance.`,
      },
      {
        label: 'RF=2 with min.insync.replicas=2',
        verdict: 'wrong',
        why: `Two copies sounds enough, but with <code>min.insync.replicas=2</code> the loss of <b>either</b> broker drops you to one in-sync replica — below the floor — so <code>acks=all</code> writes immediately start failing. You've made the topic unavailable the moment a single broker hiccups. RF=2 leaves no headroom.`,
      },
      {
        label: 'RF=1',
        verdict: 'wrong',
        why: `One copy means a single broker failure loses the data outright and takes the partition offline. Fine for throwaway/dev topics, never for business-critical data.`,
      },
    ],
    whatIfChanged: `For <b>transient, reproducible</b> data (e.g. a cache-warming or dev topic) RF=1 or RF=2 is a reasonable cost saving — you accept that a broker loss means rebuild-from-source rather than seamless failover.`,
    interviewNote: `Say the pair and the reason: "RF=3 with min.insync.replicas=2 — three copies so I can lose one broker and still meet the two-in-sync floor that acks=all needs, so writes keep succeeding through a single failure."`,
  },

  {
    id: 'commit-strategy',
    title: 'Auto-commit or manual commit?',
    difficulty: 'medium',
    topic: 'Offsets & delivery',
    moduleId: 'm09',
    requirement: `A consumer reads events and writes each to a database. You must not <b>lose</b> an event if the consumer crashes mid-batch. How should it commit offsets?`,
    options: [
      {
        label: 'Manual commit AFTER the database write succeeds',
        verdict: 'best',
        why: `Committing only after the side effect is durable gives clean at-least-once semantics: if the consumer crashes before the commit, those records are redelivered and reprocessed — no loss. You control the exact commit point, so "processed" and "committed" can't drift apart in a way that drops data.`,
      },
      {
        label: 'Default auto-commit (enable.auto.commit=true)',
        verdict: 'viable',
        why: `Auto-commit periodically commits the <i>last polled</i> offset on a timer (every <code>auto.commit.interval.ms</code>), <b>regardless of whether processing finished</b>. That can commit past records you haven't durably written yet — a crash then loses them. It's convenient and fine for tolerant workloads, but it doesn't meet a strict no-loss requirement.`,
      },
      {
        label: 'Manual commit BEFORE processing',
        verdict: 'wrong',
        why: `Committing first is at-most-once: a crash during the DB write leaves the offset already advanced, so the event is never retried and is lost. That's the exact failure mode the requirement forbids.`,
      },
    ],
    whatIfChanged: `For <b>loss-tolerant</b> telemetry where throughput matters more than every record, default auto-commit is the pragmatic choice — simpler code, and the occasional lost record on crash is acceptable.`,
    interviewNote: `"Commit after the effect is durable. Auto-commit commits on a timer irrespective of processing, so it can advance past records I haven't written — I use manual commit after the DB write to guarantee at-least-once with no loss."`,
  },

  {
    id: 'compression-codec',
    title: 'Choosing a producer compression codec',
    difficulty: 'easy',
    topic: 'Performance tuning',
    moduleId: 'm17',
    requirement: `A high-volume topic is saturating <b>network bandwidth</b> and growing storage fast. CPU headroom on producers and brokers is moderate. What compression do you set?`,
    options: [
      {
        label: 'compression.type=zstd',
        verdict: 'best',
        why: `zstd gives a strong compression ratio at reasonable CPU cost, directly cutting bytes on the wire and on disk — exactly the bandwidth/storage problem here. On modern clusters it's the usual recommendation when you have some CPU to spend for a big size win, and it compresses whole batches so larger batches help further.`,
      },
      {
        label: 'compression.type=lz4',
        verdict: 'viable',
        why: `lz4 is very fast with a decent ratio — the right pick if CPU were tight or latency were ultra-sensitive. Here you have moderate CPU and a bandwidth/storage problem, so zstd's better ratio is worth the extra CPU; but lz4 is a perfectly defensible, safe choice.`,
      },
      {
        label: 'compression.type=none',
        verdict: 'wrong',
        why: `Leaving it uncompressed ignores the actual problem — you're paying full bandwidth and storage for every message. Compression is nearly free value for high-volume topics; "none" only makes sense for tiny or already-compressed payloads.`,
      },
    ],
    whatIfChanged: `If producers were <b>CPU-bound</b> or the pipeline were latency-critical (every millisecond counts), you'd prefer <code>lz4</code> (or snappy) for speed over zstd's higher ratio.`,
    interviewNote: `"I'd match codec to the binding constraint: bandwidth/storage-bound with CPU to spare → zstd for the ratio; CPU- or latency-bound → lz4/snappy for speed. Compression applies per batch, so I'd also give batches room with linger.ms."`,
  },

  {
    id: 'schema-compat',
    title: 'Picking a schema compatibility mode',
    difficulty: 'medium',
    topic: 'Schema Registry',
    moduleId: 'm14',
    requirement: `Many independent services consume a topic and you <b>can't coordinate a lockstep upgrade</b>. You need to add fields over time and upgrade consumers before producers. Which compatibility setting?`,
    options: [
      {
        label: 'BACKWARD compatibility',
        verdict: 'best',
        why: `Backward means a <b>new</b> schema can read data written with the <b>old</b> schema — so you can upgrade <i>consumers first</i> (they understand both), then roll producers. That matches "upgrade consumers before producers" exactly, and it permits the common safe change of adding an optional field with a default. It's the most widely used default for this reason.`,
      },
      {
        label: 'FULL compatibility',
        verdict: 'viable',
        why: `Full = both backward and forward, so either side can be upgraded first — maximum safety. The cost is it's the most restrictive (a change must satisfy both directions), so you lose some evolution freedom. Great when you genuinely can't control deploy order at all; here backward is enough and less constraining.`,
      },
      {
        label: 'NONE',
        verdict: 'wrong',
        why: `Disabling compatibility checks lets an incompatible schema through, which can break consumers at deserialize time in production. With many independent consumers and no lockstep upgrade, that's exactly the outage you're trying to prevent.`,
      },
    ],
    whatIfChanged: `If you needed to upgrade <b>producers first</b> (new data written before all consumers understand it), you'd want <b>FORWARD</b> compatibility instead — old consumers can still read the new data.`,
    interviewNote: `"Compatibility direction sets deploy order. Backward (new reads old) → upgrade consumers first; forward (old reads new) → upgrade producers first; full → either. With uncoordinated consumers I default to backward, and add only optional-with-default fields."`,
  },

  {
    id: 'integration-approach',
    title: 'Getting topic data into a data warehouse',
    difficulty: 'easy',
    topic: 'Kafka Connect & ecosystem',
    moduleId: 'm12',
    requirement: `Order events in Kafka need to land in <b>Snowflake</b> for analytics, continuously and reliably, with minimal ongoing maintenance. What do you build?`,
    options: [
      {
        label: 'A Kafka Connect sink connector (with a dead-letter queue)',
        verdict: 'best',
        why: `A managed sink connector moves data to the warehouse by <b>configuration</b>, with scaling across workers, offset tracking for restart-safety, retries, and a dead-letter queue for bad records — all built in. It's the least code to write and, crucially, the least to operate for a standard "topic → warehouse" flow.`,
      },
      {
        label: 'A hand-written consumer that batches and loads to Snowflake',
        verdict: 'viable',
        why: `This works and gives full control, but now you own all the hard parts a connector already solves: scaling, offset management, retries, poison-record handling, monitoring. Justified only if you need custom logic no connector offers — otherwise it's maintenance you volunteered for.`,
      },
      {
        label: 'Use Kafka Streams to write to Snowflake',
        verdict: 'wrong',
        why: `Kafka Streams is for stream <i>processing</i> (transform, join, aggregate between Kafka topics), not for sinking to an external store — it has no native warehouse sink. Forcing it into an integration role is the wrong tool; Connect is purpose-built for moving data in and out.`,
      },
    ],
    whatIfChanged: `If the events needed real <b>transformation/enrichment/aggregation</b> before landing (not just a move), you'd put <b>Kafka Streams</b> (or ksqlDB) in front to process, then still use a <b>Connect sink</b> to load the result.`,
    interviewNote: `"Moving data in/out of Kafka → Connect (config, scaling, DLQ for free). Processing data within Kafka → Streams. For topic-to-warehouse I reach for a sink connector and only hand-roll a consumer if I need logic no connector provides."`,
  },

  {
    id: 'security-mechanism',
    title: 'Securing a cluster for external service clients',
    difficulty: 'medium',
    topic: 'Security',
    moduleId: 'm15',
    requirement: `Services outside the cluster's trusted network must connect. You need the traffic <b>encrypted</b>, each service <b>authenticated</b>, and each limited to <b>only its own</b> topics. What do you configure?`,
    options: [
      {
        label: 'TLS for encryption + SASL (SCRAM/mTLS) for auth + ACLs for authorization',
        verdict: 'best',
        why: `These are three distinct layers and the requirement names all three. <b>TLS</b> encrypts data in transit; <b>SASL</b> (SCRAM or OAuth) or <b>mutual TLS</b> authenticates <i>who</i> each service is; <b>ACLs</b> restrict each authenticated principal to its own topics. Only the full stack satisfies "encrypted, authenticated, and least-privilege."`,
      },
      {
        label: 'TLS encryption only',
        verdict: 'wrong',
        why: `One-way TLS encrypts the channel but doesn't identify the client — any service that can reach the port can produce/consume anything. It covers encryption and none of authentication or authorization, so it fails two of the three requirements.`,
      },
      {
        label: 'ACLs only',
        verdict: 'wrong',
        why: `ACLs authorize a <i>principal</i>, but a principal only exists once the client is authenticated — and without TLS the traffic is in the clear. ACLs on their own have nothing to act on and leave data unencrypted. Authorization is the last layer, not the only one.`,
      },
    ],
    whatIfChanged: `For <b>internal</b> clients already on a trusted, isolated network, teams sometimes run SASL + ACLs without full TLS (or TLS between brokers only) to save CPU — a weaker posture that's only acceptable when the network itself is the trust boundary.`,
    interviewNote: `"I separate the three concerns: TLS encrypts, SASL/mTLS authenticates the principal, ACLs authorize that principal to specific resources. 'Authenticated but not authorized' is normal — you fix it with an ACL, not by weakening auth."`,
  },

  {
    id: 'dr-strategy',
    title: 'Surviving a full region outage',
    difficulty: 'hard',
    topic: 'Multi-cluster & DR',
    moduleId: 'm21',
    requirement: `A critical pipeline must keep running if an entire <b>region</b> goes down. Consumers should be able to fail over to a second region and resume near where they left off. What's the approach?`,
    options: [
      {
        label: 'A second cluster in another region, replicated by MirrorMaker 2 with offset translation',
        verdict: 'best',
        why: `Cross-region durability needs a <b>separate cluster</b> in a second region — a single stretched cluster still shares a failure domain for a regional outage. MirrorMaker 2 replicates topics <i>and</i> translates consumer offsets, so on failover a group resumes near the corresponding position in the target cluster instead of re-reading everything or skipping data. That directly meets "fail over and resume near where they left off."`,
      },
      {
        label: 'Increase replication factor to 6 within the single cluster',
        verdict: 'wrong',
        why: `More replicas in <b>one</b> cluster/region doesn't survive that region failing — all copies share the same regional failure domain. You'd also pay heavy replication cost for zero cross-region protection. RF protects against broker loss, not region loss.`,
      },
      {
        label: 'Rely on consumers re-reading from the source cluster once the region recovers',
        verdict: 'viable',
        why: `Acceptable only if the business can tolerate the pipeline being <b>down for the entire outage</b> and catching up afterward. It's the cheapest option, but it provides no continuity during the outage — which contradicts "must keep running." Fine for non-critical flows, not this one.`,
      },
    ],
    whatIfChanged: `If only <b>broker</b> failures (not a whole region) were in scope, a single cluster with <b>RF=3 across racks/AZs</b> is the right, far cheaper answer — you don't need a second cluster or MM2 at all.`,
    interviewNote: `"Match the replication scope to the failure domain: broker loss → RF across racks in one cluster; region loss → a second cluster replicated by MirrorMaker 2, and I'd call out offset translation so failed-over consumers resume at the right position rather than from scratch."`,
  },
];
