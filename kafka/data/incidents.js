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

  {
    id: 'producer-timeouts',
    difficulty: 'medium',
    icon: '⏳',
    title: 'Producers failing with TimeoutException and buffer-full errors',
    symptom: `A service's producers are throwing <code>TimeoutException: Expiring N record(s)</code> and occasionally <code>BufferExhaustedException</code>. Send latency has spiked. The brokers look up, and consumers on other topics are fine.`,
    steps: [
      {
        prompt: `Produces are timing out. What do you check first?`,
        checks: [
          {
            label: `Whether one target partition's leader is slow or unavailable`,
            correct: true,
            evidence: `Metadata shows the leader for several of this topic's partitions is on broker 2, whose request latency has jumped 20×. Producers' in-flight batches to those partitions aren't being acknowledged, so they expire.`,
            reasoning: `A producer buffers per-partition. If the leader for a partition is slow, batches for that partition back up and eventually hit <code>delivery.timeout.ms</code>, surfacing as TimeoutException — while unrelated topics (on healthy leaders) are unaffected. Localizing to a slow leader explains the selective failure.`,
          },
          {
            label: `Immediately raise delivery.timeout.ms and retries very high`,
            correct: false,
            why: `That just hides the symptom and lets batches pile up longer, making <code>BufferExhaustedException</code> worse. You haven't found why one leader is slow. Tune timeouts only after you understand the bottleneck.`,
          },
          {
            label: `Assume the producer's network is down`,
            correct: false,
            why: `If the network were fully down, <i>all</i> partitions/topics would fail, not a subset. The selective failure points at a specific broker/leader, not the producer's connectivity.`,
          },
        ],
      },
      {
        prompt: `Why does a slow leader cause BufferExhaustedException too?`,
        checks: [
          {
            label: `Unacked batches occupy buffer.memory until they succeed or expire, starving new sends`,
            correct: true,
            evidence: `The producer's <code>buffer.memory</code> is full of batches waiting on broker 2. With no room, new <code>send()</code> calls block up to <code>max.block.ms</code> and then fail.`,
            reasoning: `The producer's memory buffer holds records until they're acknowledged. A slow leader means batches linger, the buffer fills, and new sends have nowhere to go — the timeout and buffer-full errors are two symptoms of the same backpressure.`,
          },
          {
            label: `The producer has a memory leak`,
            correct: false,
            why: `Buffer pressure here is expected backpressure from unacked batches, not a leak. The memory frees as soon as the slow leader recovers or batches expire. Chasing a leak misreads normal producer flow control.`,
          },
        ],
      },
      {
        prompt: `Why is broker 2 slow? What do you look at?`,
        checks: [
          {
            label: `Broker 2's disk I/O, request-handler saturation, and GC/CPU`,
            correct: true,
            evidence: `Broker 2's request-handler idle ratio is near 0 and disk writes are maxed — it's hosting a disproportionate share of partition leaders after a recent restart that didn't rebalance leadership.`,
            reasoning: `A broker becomes a slow leader when it's resource-saturated — disk I/O, request handlers, or GC. Here leadership skewed onto broker 2, overloading it. Checking per-broker load and leader counts finds the imbalance.`,
          },
          {
            label: `Conclude the topic needs more partitions`,
            correct: false,
            why: `More partitions won't help if the problem is uneven leadership on one overloaded broker — it could even add load. The fix is rebalancing leaders, not changing partition count.`,
          },
        ],
      },
    ],
    rootCause: `After a rolling restart, partition leadership concentrated on broker 2 (preferred-leader election didn't run), saturating its disk and request handlers. As a slow leader, it stopped acking batches in time, so producers' per-partition batches expired (TimeoutException) and the unacked batches filled <code>buffer.memory</code>, blocking new sends (BufferExhausted).`,
    resolution: `Rebalance leadership off broker 2 (trigger preferred-leader election / <code>kafka-leader-election</code>), which immediately relieves its load and restores ack latency. Short-term, producers recover as batches drain. Verify leader distribution is even across brokers afterward.`,
    prevention: `Enable <code>auto.leader.rebalance.enable</code> or run preferred-leader election after restarts; alert on per-broker leader-count skew and request-handler idle ratio; size <code>buffer.memory</code>/<code>delivery.timeout.ms</code> deliberately but treat them as limits, not fixes.`,
    interviewAnswer: `"Producer timeouts plus buffer-full on a subset of topics point at a slow or unavailable <i>leader</i>, not the producer. I'd localize the slow broker, and here it was leadership skew after a rolling restart overloading one broker's disk/handlers. Fix is to rebalance leaders (preferred-leader election); prevent it with auto leader rebalance and skew alerting. Raising timeouts would've only masked it."`,
  },

  {
    id: 'offset-reset',
    difficulty: 'medium',
    icon: '⏮️',
    title: 'A consumer group suddenly reprocesses from the beginning',
    symptom: `After being down over a long weekend, a consumer group came back and started reprocessing <b>millions of old records from offset 0</b>, flooding downstream systems. It had been committing offsets normally before.`,
    steps: [
      {
        prompt: `The group restarted from the beginning. What do you check first?`,
        checks: [
          {
            label: `Whether the committed offsets still exist, and the group's auto.offset.reset policy`,
            correct: true,
            evidence: `The group's committed offsets are <b>gone</b> from <code>__consumer_offsets</code>, and the consumer is configured with <code>auto.offset.reset=earliest</code>. With no valid committed offset to resume from, it reset to the earliest available record.`,
            reasoning: `When a consumer finds no valid committed offset for a partition, it falls back to <code>auto.offset.reset</code> — <code>earliest</code> (from the start) or <code>latest</code> (only new records). Confirming the offsets vanished and the reset policy explains the full-replay behavior.`,
          },
          {
            label: `Assume someone manually reset the offsets`,
            correct: false,
            why: `Possible, but check the mechanism first. The evidence (missing committed offsets + earliest policy) explains it without assuming human action. Jumping to "someone did it" skips the actual cause.`,
          },
        ],
      },
      {
        prompt: `Why did the committed offsets disappear over a long idle period?`,
        checks: [
          {
            label: `offsets.retention.minutes elapsed for the inactive group`,
            correct: true,
            evidence: `The cluster's <code>offsets.retention.minutes</code> is 7 days. The group was inactive longer than that, so its offsets in <code>__consumer_offsets</code> were eligible for deletion and compacted away.`,
            reasoning: `Committed offsets aren't kept forever for inactive groups — after <code>offsets.retention.minutes</code> of no commits, they're removed. A group idle beyond that window loses its position, so on return it has nothing to resume from.`,
          },
          {
            label: `The topic's data was deleted by retention`,
            correct: false,
            why: `The <i>topic</i> data is clearly still there — the group is reprocessing it from offset 0. What expired was the group's <i>committed offsets</i>, a different retention (<code>offsets.retention.minutes</code>), not the topic's log retention.`,
          },
        ],
      },
      {
        prompt: `How do you stop the flood and prevent recurrence?`,
        checks: [
          {
            label: `Seek the group to a sensible offset (e.g. by timestamp), then raise offsets.retention and avoid long idle gaps`,
            correct: true,
            evidence: `Resetting the group to the weekend's start timestamp (via <code>offsetsForTimes</code>) skips the full-history replay. Increasing <code>offsets.retention.minutes</code> (or keeping the group active) prevents offsets from expiring again.`,
            reasoning: `Immediate fix: reposition the group to where it should actually resume instead of offset 0. Durable fix: extend offset retention beyond expected idle periods, or keep the group committing. <code>latest</code> is an option too, but only if skipping the gap is acceptable.`,
          },
          {
            label: `Set auto.offset.reset=none going forward`,
            correct: false,
            why: `<code>none</code> throws an exception instead of resetting when offsets are missing — it turns a silent replay into a hard failure, which surfaces the problem but doesn't let the group recover on its own. Useful as a guard, but not a fix for the retention cause, and risky if you want graceful restarts.`,
          },
        ],
      },
    ],
    rootCause: `The consumer group was idle longer than the cluster's <code>offsets.retention.minutes</code>, so its committed offsets were removed from <code>__consumer_offsets</code>. On restart, with no valid offset and <code>auto.offset.reset=earliest</code>, it fell back to the start of the log and replayed the entire history.`,
    resolution: `Reposition the group to the intended resume point (by timestamp) to stop the full replay, and either raise <code>offsets.retention.minutes</code> above the group's expected idle time or keep the group committing periodically. Add backpressure/rate-limits downstream so an unexpected replay can't overwhelm sinks.`,
    prevention: `Set <code>offsets.retention.minutes</code> with planned downtime in mind; monitor for groups approaching offset expiry; make downstream consumers idempotent and rate-limited so a replay is survivable rather than catastrophic.`,
    interviewAnswer: `"Full replay from zero after idle time is classic offset expiry: inactive-group offsets aged out of <code>__consumer_offsets</code> past <code>offsets.retention.minutes</code>, and with <code>auto.offset.reset=earliest</code> the group restarted from the beginning. Fix is to seek to the right position and extend offset retention, and I'd make sinks idempotent so a replay never corrupts data."`,
  },

  {
    id: 'schema-break',
    difficulty: 'medium',
    icon: '📋',
    title: 'Producers failing after a schema change',
    symptom: `Right after a new producer release, that service can't publish — it's erroring at serialization with a Schema Registry rejection. Other producers on the same topic are unaffected. No broker errors.`,
    steps: [
      {
        prompt: `A single producer can't serialize after a release. What do you check first?`,
        checks: [
          {
            label: `The exact Schema Registry error and the subject's compatibility setting`,
            correct: true,
            evidence: `The registry returned <code>409 Conflict: Schema being registered is incompatible with an earlier schema</code>. The subject is set to <code>BACKWARD</code> compatibility, and the new release removed a field and changed another's type.`,
            reasoning: `A serialization failure localized to one new release is almost always a schema-registration rejection. Reading the specific error (and the subject's compatibility mode) tells you exactly which rule was violated instead of guessing.`,
          },
          {
            label: `Assume the registry is down`,
            correct: false,
            why: `If the registry were down, <i>all</i> producers using it would fail, not just the new release — and you'd see connection errors, not a 409 compatibility conflict. The selective, specific error rules out an outage.`,
          },
        ],
      },
      {
        prompt: `The change was rejected as incompatible. Why do the OTHER producers still work?`,
        checks: [
          {
            label: `They use the already-registered compatible schema; only the new, rejected schema fails`,
            correct: true,
            evidence: `The existing producers keep serializing with the previously registered schema ID, which is valid. Only the new release tried to register an incompatible schema and got blocked before it could produce.`,
            reasoning: `Compatibility is enforced at <i>registration</i>. A producer with an already-valid schema is unaffected; the one introducing a breaking change is stopped at the gate. That's the registry protecting consumers exactly as designed.`,
          },
          {
            label: `The other producers must be bypassing the registry`,
            correct: false,
            why: `No — they're using a valid, already-registered schema, which is the normal path. Nothing is being bypassed. The registry only rejected the new incompatible schema, not the existing one.`,
          },
        ],
      },
      {
        prompt: `How do you fix it correctly (not just unblock the deploy)?`,
        checks: [
          {
            label: `Rework the change to be compatible (add optional-with-default instead of removing/retyping), or version it`,
            correct: true,
            evidence: `Re-expressing the change as an <i>additive</i>, optional field with a default passes BACKWARD compatibility. The removed/retyped fields are handled via a new version or deprecation path instead of a breaking edit.`,
            reasoning: `The registry is telling you the change would break consumers. The right fix is to make the evolution compatible (additive, defaulted) or to version the schema/topic — not to defeat the safety check.`,
          },
          {
            label: `Set the subject's compatibility to NONE to let it through`,
            correct: false,
            why: `Disabling compatibility ships the breaking schema straight to consumers, trading a caught build-time failure for a production deserialize outage across every consumer. That's defeating the guardrail that just saved you.`,
          },
        ],
      },
    ],
    rootCause: `A new producer release registered a schema that removed a field and changed a type — a breaking change under the subject's <code>BACKWARD</code> compatibility mode. The Schema Registry rejected the registration (409), so that producer couldn't serialize/publish, while producers using the existing valid schema kept working.`,
    resolution: `Make the schema change compatible: add fields as optional with defaults, avoid removals/type changes, or introduce a new schema version/subject with a migration path. Redeploy the producer with the compatible schema. Keep compatibility enforcement on.`,
    prevention: `Run schema-compatibility checks in CI (maven/gradle registry plugins) so breaking changes fail the build, not the deploy; document the allowed evolution rules; treat schemas as versioned contracts between teams.`,
    interviewAnswer: `"A lone producer failing at serialization after a release, with a 409 from the registry, means it tried to register an incompatible schema — here a field removal/type change under BACKWARD mode. Others kept working because they use the already-valid schema. The fix is to make the change additive/optional or version it, and catch it in CI — not to set compatibility to NONE, which just moves the break to consumers in prod."`,
  },

  {
    id: 'disk-filling',
    difficulty: 'hard',
    icon: '💽',
    title: 'Broker disks filling up fast toward an outage',
    symptom: `Disk usage on all brokers is climbing steadily and will hit 100% within hours. Traffic hasn't materially increased. The last change was a config tweak during an incident two weeks ago. No broker is down yet.`,
    steps: [
      {
        prompt: `Disks are filling with steady traffic. What do you examine first?`,
        checks: [
          {
            label: `Per-topic log size growth and effective retention settings`,
            correct: true,
            evidence: `One high-volume topic has grown far beyond its usual footprint. Its <code>retention.ms</code> was set to <code>-1</code> (infinite) — a leftover from a debugging session two weeks ago — so nothing is being deleted.`,
            reasoning: `When disk fills without a traffic spike, the usual cause is data not being <i>removed</i> — a retention/compaction problem. Checking which topics are growing and their actual retention config finds a misconfiguration fast.`,
          },
          {
            label: `Add disk to every broker immediately`,
            correct: false,
            why: `Expanding disk buys time but, with infinite retention, it fills again — you'd just postpone the outage. Find why data isn't being deleted before scaling hardware around the leak.`,
          },
        ],
      },
      {
        prompt: `Retention was left at infinite. How do you recover without causing a different incident?`,
        checks: [
          {
            label: `Restore a sane retention; let old segments age out — and watch the delete load`,
            correct: true,
            evidence: `Setting <code>retention.ms</code> back to the intended value makes the broker schedule deletion of now-expired segments. Done gradually (or by stepping retention down), it reclaims space without a disruptive burst of deletes.`,
            reasoning: `Fixing the config lets normal retention resume. Only <i>closed</i> segments past the bound are deleted, and a sudden huge delete can add I/O load — so on a nearly-full cluster you step retention down rather than dropping it to a tiny value at once.`,
          },
          {
            label: `Manually delete log segment files on disk to free space now`,
            correct: false,
            why: `Deleting segment files by hand underneath a running broker corrupts its view of the log and can lose committed data or crash the broker. Let Kafka's retention delete segments; never touch log files directly.`,
          },
        ],
      },
      {
        prompt: `A broker is now at 98%. What protects it before retention catches up?`,
        checks: [
          {
            label: `Expand the volume as a stopgap while retention reclaims space; keep acks=all durability intact`,
            correct: true,
            evidence: `Temporarily growing the volume keeps the broker from hitting 100% (which would take its log dir offline) while the corrected retention deletes expired segments and usage falls.`,
            reasoning: `At 100% a broker can't append and takes its log directory offline — dropping it from ISRs (the earlier incident!). A temporary volume expansion is a safe stopgap <i>combined with</i> the real retention fix, not instead of it.`,
          },
          {
            label: `Lower replication factor to free space`,
            correct: false,
            why: `Dropping RF deletes replicas — reducing durability during an incident and risking data loss if another broker fails. You never trade away durability to reclaim disk; fix retention and expand the volume instead.`,
          },
        ],
      },
    ],
    rootCause: `During an earlier incident, a high-volume topic's <code>retention.ms</code> was set to infinite for debugging and never reverted. With deletion effectively disabled, its log grew unbounded, steadily consuming broker disk toward 100% — which would take log directories offline and cascade into under-replication and rejected writes.`,
    resolution: `Restore the intended retention so expired segments are deleted (stepping it down gradually on a near-full cluster to avoid a delete I/O storm), and temporarily expand volumes to stay under 100% while space is reclaimed. Never hand-delete segment files or drop replication factor.`,
    prevention: `Alert on disk usage at 75%/85%, not just 95%; alert on per-topic log-size growth and on retention set to -1; review/audit temporary incident changes so debugging configs get reverted; track retention against real ingest as traffic grows.`,
    interviewAnswer: `"Disks filling with flat traffic means data isn't being removed — a retention problem. I'd find the growing topic and its config; here retention was left infinite after an incident. Fix is to restore sane retention (stepped down to avoid a delete storm) and expand volumes as a stopgap, never hand-delete segments or cut RF. Prevent with earlier disk alerts and auditing temporary changes."`,
  },

  {
    id: 'unclean-loss',
    difficulty: 'hard',
    icon: '🩸',
    title: 'Acknowledged records vanished after a double broker failure',
    symptom: `Following a power event that briefly took down two of three brokers, a few consumers report <b>gaps</b> — records that were definitely acknowledged to producers are missing. The cluster is healthy again now. Durability was assumed to be guaranteed.`,
    steps: [
      {
        prompt: `Acknowledged records are missing after a multi-broker outage. What do you check first?`,
        checks: [
          {
            label: `unclean.leader.election.enable and which replica became leader during the outage`,
            correct: true,
            evidence: `<code>unclean.leader.election.enable=true</code> on the cluster. During the outage, for some partitions every ISR member was down, and an <b>out-of-sync</b> replica was elected leader to keep the partition available.`,
            reasoning: `Lost <i>acknowledged</i> data almost always means an out-of-sync replica became leader. Checking the unclean-election setting and the election history tells you whether Kafka chose availability over durability at the critical moment.`,
          },
          {
            label: `Assume consumers skipped the records due to a bug`,
            correct: false,
            why: `The records are genuinely gone from the log, not skipped — consumers report gaps because the data isn't there. A consumer bug wouldn't remove committed records from the partition. The cause is upstream, in leader election.`,
          },
        ],
      },
      {
        prompt: `An out-of-sync replica became leader. Why does that lose acknowledged data?`,
        checks: [
          {
            label: `It lacked records past its last-synced offset; becoming leader truncated everything ahead of it`,
            correct: true,
            evidence: `The elected replica had fallen behind before the outage. Records acknowledged (<code>acks=all</code>) by the old leader after that point existed only on the now-dead brokers. When the stale replica took over, followers truncated to its log — permanently dropping those records.`,
            reasoning: `A leader defines the partition's truth. If a replica that's missing recent records becomes leader, those records are gone and everyone truncates to match. <code>acks=all</code> protected the data only while an in-sync replica survived — unclean election discards that guarantee.`,
          },
          {
            label: `acks=all must not have been set`,
            correct: false,
            why: `Even with <code>acks=all</code>, unclean election can lose data: acks=all guarantees the record was on all <i>then</i>-in-sync replicas, but if all of those die and a stale replica is promoted, the guarantee is voided. The setting isn't the hole — unclean election is.`,
          },
        ],
      },
      {
        prompt: `How do you prevent this recurring, and what's the trade-off?`,
        checks: [
          {
            label: `Set unclean.leader.election.enable=false and RF=3 with min.insync.replicas=2 — accept unavailability when no ISR survives`,
            correct: true,
            evidence: `With unclean election disabled, a partition whose entire ISR is down stays <b>offline</b> until an in-sync replica returns, rather than promoting a stale one — so no acknowledged record is ever discarded. RF=3 + min.insync.replicas=2 makes a total ISR loss much rarer.`,
            reasoning: `This is the explicit durability-vs-availability knob. Disabling unclean election means some partitions can become temporarily unavailable in a severe outage — but acknowledged data is never lost. For financial/critical data that's the correct trade.`,
          },
          {
            label: `Keep unclean election on for maximum uptime`,
            correct: false,
            why: `That re-chooses availability over correctness — the exact setting that just lost committed records. For data that must not be lost, the temporary unavailability of disabling it is the price of the guarantee.`,
          },
        ],
      },
    ],
    rootCause: `With <code>unclean.leader.election.enable=true</code>, the dual broker failure left some partitions with no surviving in-sync replica. To stay available, Kafka promoted out-of-sync replicas to leader; those replicas were missing records that had been acknowledged with <code>acks=all</code>, and once they led, followers truncated to match — permanently dropping acknowledged data.`,
    resolution: `Set <code>unclean.leader.election.enable=false</code> so a partition with no in-sync replica stays offline until one recovers instead of promoting a stale replica. Pair with RF=3 and <code>min.insync.replicas=2</code>, and spread replicas across racks/AZs so a correlated failure is less likely to take the whole ISR.`,
    prevention: `Default critical clusters to no unclean election; choose durability over availability explicitly per topic; distribute replicas across failure domains; test failover (chaos drills) so the trade-offs are understood before a real outage forces them.`,
    interviewAnswer: `"Losing <i>acknowledged</i> data points straight at unclean leader election: in the outage every ISR member for some partitions was down, so a stale replica was promoted and acked records ahead of its log were truncated away. acks=all can't save you once the whole ISR is lost. The fix is unclean.leader.election.enable=false with RF=3/min.insync.replicas=2 and rack-aware placement — accepting brief unavailability to never lose committed data."`,
  },
];
