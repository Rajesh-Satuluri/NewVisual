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
];
