// Production incident library — shared by the interactive Troubleshooting Lab
// (investigation-flow) and the static Incident Bank (playbook for revision).
// One source of truth, no duplication.
//
// Shape:
//   { id, difficulty, icon, title, symptom,
//     steps: [ { prompt, checks: [
//        { label, correct:true,  evidence, reasoning } |
//        { label, correct:false, why } ] } ],
//     rootCause, resolution, prevention, interviewAnswer }
//
// Each step is a "what would you check next?" decision. A correct check
// reveals the evidence it surfaces and why it was the right next move; a wrong
// check explains the misconception without advancing. Explanations are written
// to teach the reasoning, not just mark right/wrong. Trusted in-repo HTML.

export const INCIDENTS = [
  {
    id: 'consumer-lag',
    difficulty: 'medium',
    icon: '📈',
    title: 'Consumer lag is climbing and won\'t recover',
    symptom: `An alert fires: consumer group <code>orders-processor</code> lag has grown from near-zero to <b>2 million and rising</b> over the last hour. Messages are still being produced at the normal rate. Downstream dashboards are going stale.`,
    steps: [
      {
        prompt: `Lag is rising. What do you check first?`,
        checks: [
          {
            label: `Compare the produce rate to the consumer\'s consume rate`,
            correct: true,
            evidence: `Producers are steady at ~5k msg/s. The group is consuming only ~1k msg/s — it's falling behind by ~4k every second.`,
            reasoning: `Lag is simply "produced minus consumed." Before guessing, confirm which side moved. Here production is normal and consumption has dropped, so the problem is on the <b>consumer side</b>, not a traffic spike.`,
          },
          {
            label: `Immediately add more partitions to the topic`,
            correct: false,
            why: `You don't yet know the cause. Adding partitions is disruptive (it re-maps keys and breaks per-key ordering) and won't help if the bottleneck is a single stuck consumer or a slow downstream call. Diagnose before changing topology.`,
          },
          {
            label: `Restart all the brokers`,
            correct: false,
            why: `Nothing points at the brokers — production is healthy. Restarting brokers is a heavy, risky action that triggers leader elections and would likely make things worse. Never start with the biggest hammer.`,
          },
        ],
      },
      {
        prompt: `Consumption has slowed. How do you narrow down why?`,
        checks: [
          {
            label: `Check per-consumer lag and whether the group is rebalancing`,
            correct: true,
            evidence: `The group is stuck in a <b>continuous rebalance loop</b> — members keep joining and leaving every few seconds, so almost no time is spent actually processing.`,
            reasoning: `Splitting lag by member (and checking group state) tells you whether it's one slow consumer or the whole group. A group that's constantly rebalancing spends its time re-assigning partitions instead of consuming — a classic cause of collapsing throughput.`,
          },
          {
            label: `Assume the consumers are just under-scaled and add 10 more`,
            correct: false,
            why: `If the group is rebalancing, adding members makes the rebalance storm <i>worse</i> — every join triggers another rebalance. More consumers is the right lever for genuine under-capacity, but only once the group is stable.`,
          },
        ],
      },
      {
        prompt: `The group is rebalancing constantly. What's the likely trigger?`,
        checks: [
          {
            label: `A consumer's processing time exceeds max.poll.interval.ms, so the coordinator evicts it`,
            correct: true,
            evidence: `Logs show consumers being kicked out with "leaving group because poll timeout expired." A recent deploy made per-record processing slower (a new synchronous API call), pushing each poll batch over <code>max.poll.interval.ms</code>.`,
            reasoning: `If processing a batch takes longer than <code>max.poll.interval.ms</code>, the consumer misses its next <code>poll()</code>, the coordinator assumes it died and rebalances — then the same thing happens to the next consumer. That's the loop.`,
          },
          {
            label: `The network to the brokers is flaky`,
            correct: false,
            why: `Possible in theory, but the eviction reason in the logs is a <i>poll</i> timeout, not a session/heartbeat/network timeout. The evidence points at slow processing, not connectivity. Follow the specific error, not a generic guess.`,
          },
        ],
      },
    ],
    rootCause: `A deploy added a slow synchronous call to the per-record path. Processing a full poll batch now takes longer than <code>max.poll.interval.ms</code>, so the group coordinator repeatedly evicts "stuck" consumers, triggering an endless rebalance loop in which almost no records get processed — so lag grows without bound.`,
    resolution: `Reduce <code>max.poll.records</code> so each batch finishes within the interval (and/or raise <code>max.poll.interval.ms</code> to fit the new processing time). Better still, move the slow call off the hot path (batch it, cache it, or make it async). Once batches fit the interval, the group stops rebalancing and burns down the backlog.`,
    prevention: `Load-test processing latency before deploying changes to the record path; alert on <b>rebalance rate</b> and <b>poll latency</b>, not just lag; keep the work done per record bounded and predictable.`,
    interviewAnswer: `"Rising lag with steady production means the consumer side slowed down. I'd split lag per member and check group state — here it was a rebalance storm. The trigger was processing exceeding <code>max.poll.interval.ms</code> after a deploy, so the coordinator kept evicting consumers. Fix: shrink <code>max.poll.records</code> or raise the interval, and get the slow call off the per-record path."`,
  },

  {
    id: 'under-replicated',
    difficulty: 'hard',
    icon: '🔁',
    title: 'Under-replicated partitions and producers failing',
    symptom: `Monitoring shows <b>under-replicated partitions</b> jumped from 0 to 340. At the same time, producers using <code>acks=all</code> are getting <code>NOT_ENOUGH_REPLICAS</code> errors and their writes are failing. Consumers are mostly fine.`,
    steps: [
      {
        prompt: `Under-replicated partitions spiked. What do you look at first?`,
        checks: [
          {
            label: `Check whether a broker is down or has dropped out of the ISR`,
            correct: true,
            evidence: `Broker 3 (of 3) is unreachable — it stopped sending heartbeats 4 minutes ago. Every partition that had a replica on broker 3 is now under-replicated.`,
            reasoning: `"Under-replicated" means a partition's replicas aren't all caught up — usually because a broker holding replicas is down or lagging. Confirming which broker left the ISR immediately explains the spike and points at the blast radius.`,
          },
          {
            label: `Increase the replication factor of the affected topics`,
            correct: false,
            why: `You can't raise durability by adding replicas while a broker is already missing — there's nowhere healthy to put them, and reassignment adds load during an incident. First find why replicas fell behind.`,
          },
        ],
      },
      {
        prompt: `Broker 3 is down. Why are the acks=all producers failing?`,
        checks: [
          {
            label: `min.insync.replicas can no longer be met on the affected partitions`,
            correct: true,
            evidence: `Topics are RF=3 with <code>min.insync.replicas=2</code>. With broker 3 gone, some partitions have only 1 in-sync replica — below the minimum — so <code>acks=all</code> writes are rejected to protect durability.`,
            reasoning: `<code>acks=all</code> + <code>min.insync.replicas=2</code> is a deliberate trade: if fewer than 2 replicas are in sync, Kafka would rather <b>reject the write</b> than accept data it can't safely replicate. The producer errors are the safety mechanism working, not a separate bug.`,
          },
          {
            label: `The producers must have a misconfiguration`,
            correct: false,
            why: `The producers are behaving exactly as designed. <code>NOT_ENOUGH_REPLICAS</code> is Kafka refusing an unsafe write, not a client misconfig. Chasing the producer config wastes time — the cause is upstream, on the broker.`,
          },
        ],
      },
      {
        prompt: `Why did broker 3 go down? What do you check on it?`,
        checks: [
          {
            label: `Disk usage and broker logs on broker 3`,
            correct: true,
            evidence: `Broker 3's log directory hit <b>100% disk</b>. Kafka took the log dir offline, which knocked its replicas out of every partition at once.`,
            reasoning: `A broker that fills its disk can't append to logs and will take the log directory (or itself) offline — explaining why many partitions lost a replica simultaneously. Disk is one of the first things to check on a dead broker.`,
          },
          {
            label: `Assume hardware failure and replace the node`,
            correct: false,
            why: `Jumping to "replace the box" skips the actual evidence. If it's a full disk (very common), replacing hardware is slow and unnecessary — you'd free space or expand the volume. Read the logs before swapping hardware.`,
          },
        ],
      },
    ],
    rootCause: `Broker 3's log disk filled to 100% (retention wasn't keeping up with ingest growth). Kafka took the log directory offline, so broker 3 dropped out of the ISR for every partition it hosted. With RF=3 and <code>min.insync.replicas=2</code>, partitions that fell to a single in-sync replica correctly rejected <code>acks=all</code> writes with <code>NOT_ENOUGH_REPLICAS</code>.`,
    resolution: `Free disk on broker 3 (expand the volume or delete/relocate old segments), bring the log directory back online, and let followers re-sync into the ISR. As replicas catch up, under-replicated count returns to 0 and <code>acks=all</code> writes succeed again. If broker 3 can't be recovered quickly, reassign its replicas to a healthy broker.`,
    prevention: `Alert on disk usage well before 100% (e.g. 75%); size retention to real ingest and review it as traffic grows; spread replicas so a single broker's loss never drops many partitions below <code>min.insync.replicas</code>; consider RF=3 with capacity headroom.`,
    interviewAnswer: `"Under-replicated partitions plus <code>NOT_ENOUGH_REPLICAS</code> on <code>acks=all</code> means a broker left the ISR and some partitions fell below <code>min.insync.replicas</code> — that error is Kafka refusing unsafe writes, by design. I traced the dead broker to a full log disk; fix is to free/expand disk and let replicas re-sync, and prevent it with disk alerting and retention sized to ingest."`,
  },

  {
    id: 'hot-partition',
    difficulty: 'medium',
    icon: '🌶️',
    title: 'One partition is far slower than the rest',
    symptom: `Overall lag looks moderate, but one consumer in the group is <b>permanently behind</b> while its peers are caught up. Latency for a subset of keys is terrible; the rest of the topic is fine.`,
    steps: [
      {
        prompt: `Lag is uneven across the group. What do you check first?`,
        checks: [
          {
            label: `Per-partition message rate and size distribution`,
            correct: true,
            evidence: `Partition 7 is receiving <b>10× the traffic</b> of any other partition. One consumer owns it and simply can't keep up, while the others are idle-ish.`,
            reasoning: `Uneven lag across a group almost always means uneven <i>partition</i> load, since each partition maps to one consumer. Checking per-partition rates immediately reveals a skewed, "hot" partition.`,
          },
          {
            label: `Add more consumers to the group`,
            correct: false,
            why: `More consumers can't help a single hot partition — a partition is still read by exactly one consumer. Extra members would just sit idle. The imbalance is in how records are distributed, not how many consumers you have.`,
          },
        ],
      },
      {
        prompt: `Partition 7 is hot. Why is all that traffic landing on one partition?`,
        checks: [
          {
            label: `Inspect the record keys hashing to partition 7`,
            correct: true,
            evidence: `A single high-volume tenant (<code>customer_id=ACME</code>) accounts for most traffic, and keying is by <code>customer_id</code> — so every ACME record hashes to the same partition.`,
            reasoning: `The default partitioner is <code>hash(key) % partitions</code>. If one key value dominates volume, all its records pile onto one partition regardless of how many partitions exist. The key choice is the root of the skew.`,
          },
          {
            label: `Conclude the partitioner is buggy`,
            correct: false,
            why: `The partitioner is working correctly — same key, same partition is the guarantee you asked for. The skew comes from a low-cardinality / unbalanced key, not a bug. Blaming the partitioner points you away from the real fix.`,
          },
        ],
      },
    ],
    rootCause: `Records are keyed by <code>customer_id</code>, but traffic is heavily skewed toward one large customer. Because same-key records always hash to the same partition, that customer's volume concentrates on a single partition, overwhelming the one consumer that owns it — a classic hot partition.`,
    resolution: `Change the keying so load spreads without losing the ordering you actually need: e.g. a composite key (<code>customer_id + sub-entity</code>), salting the hot key into a few sub-keys, or removing the key for that stream if strict per-customer ordering isn't required. If ordering per customer is essential, isolate the whale onto its own topic/partitions sized for its volume.`,
    prevention: `Choose keys with high cardinality and balanced volume; monitor per-partition throughput (not just total); load-test with realistic skew rather than uniform synthetic data.`,
    interviewAnswer: `"Uneven lag across a group points at a hot partition, since each partition is owned by one consumer. I'd check per-partition rates, find the skewed partition, then inspect the keys — usually one dominant key value hashing to one partition. The partitioner isn't broken; the key is too skewed. Fix is a higher-cardinality or salted key, or isolating the heavy tenant."`,
  },

  {
    id: 'duplicate-processing',
    difficulty: 'hard',
    icon: '👯',
    title: 'Downstream records are being processed twice',
    symptom: `A finance report shows some transactions <b>counted twice</b>. The consumer reads from Kafka and writes to a database. No records are missing — some are just duplicated. It seems to correlate with consumer restarts and deploys.`,
    steps: [
      {
        prompt: `Duplicates appear around restarts. What's the first thing to examine?`,
        checks: [
          {
            label: `How and when the consumer commits offsets relative to processing`,
            correct: true,
            evidence: `The consumer processes a batch, writes to the DB, and commits offsets <b>only periodically</b> (auto-commit every 5s). On restart it resumes from the last committed offset — re-reading anything processed since that commit.`,
            reasoning: `Duplicates around restarts are almost always an offset-commit timing issue. If you commit after processing (at-least-once), a crash between "processed" and "committed" means those records are re-delivered and re-processed on restart.`,
          },
          {
            label: `Assume Kafka delivered the same record twice due to a broker bug`,
            correct: false,
            why: `Kafka's normal guarantee is at-least-once, so re-delivery on restart is <i>expected</i>, not a broker bug. The duplication is happening because the consumer's processing isn't idempotent — look at your commit/processing logic, not the broker.`,
          },
        ],
      },
      {
        prompt: `It's at-least-once re-delivery. Why does that corrupt the report?`,
        checks: [
          {
            label: `The DB write is a plain INSERT, so re-processed records insert again`,
            correct: true,
            evidence: `The sink does <code>INSERT INTO transactions …</code> with no dedupe. A re-delivered record inserts a second row, double-counting the transaction.`,
            reasoning: `At-least-once delivery is fine <i>if</i> the effect is idempotent. A blind INSERT is not idempotent — the same event applied twice produces two rows. The delivery model and the sink's non-idempotency together cause the corruption.`,
          },
          {
            label: `Switch everything to at-most-once to avoid duplicates`,
            correct: false,
            why: `At-most-once (commit before processing) trades duplicates for <b>lost</b> records on crash — unacceptable for financial data. You want no loss <i>and</i> no double-counting, which idempotency gives you, not at-most-once.`,
          },
        ],
      },
      {
        prompt: `How do you make it correct without risking data loss?`,
        checks: [
          {
            label: `Make the DB write idempotent (upsert / unique key on event ID)`,
            correct: true,
            evidence: `Adding a unique constraint on <code>event_id</code> and switching to an upsert makes re-processing a no-op: the second apply hits the same row instead of inserting a duplicate.`,
            reasoning: `Keep Kafka at at-least-once (no loss) and make the side effect idempotent so re-delivery is harmless. This is the standard, robust pattern when the sink is an external system Kafka transactions can't cover.`,
          },
          {
            label: `Rely on Kafka exactly-once semantics (transactions) alone`,
            correct: false,
            why: `Kafka EOS covers Kafka-to-Kafka read-process-write. Here the sink is an external database, which Kafka transactions don't reach — you'd still need idempotency on the DB write. For this topology, idempotent upsert is the real fix.`,
          },
        ],
      },
    ],
    rootCause: `The pipeline is at-least-once (offsets auto-commit periodically, after processing), so a restart re-delivers records processed since the last commit. Because the database sink uses a non-idempotent INSERT, each re-delivered record creates a duplicate row — double-counting transactions.`,
    resolution: `Make the sink idempotent: add a unique key on the event/transaction ID and use an upsert (or a processed-IDs table). Optionally commit offsets more tightly (manual commit after the DB write) to shrink the re-delivery window. Result: no loss, and re-processing is harmless.`,
    prevention: `Design consumers as idempotent from the start when writing to external systems; carry a stable unique ID on every event; understand that Kafka is at-least-once by default and that exactly-once is a Kafka-to-Kafka guarantee, not end-to-end into a database.`,
    interviewAnswer: `"Duplicates around restarts are at-least-once re-delivery meeting a non-idempotent sink — not a broker bug. Kafka re-reads from the last committed offset; a plain INSERT then double-inserts. The fix isn't at-most-once (that loses data) — it's an idempotent upsert keyed by event ID, keeping no-loss delivery while making re-processing a no-op. EOS wouldn't help here because the sink is an external DB."`,
  },
];
