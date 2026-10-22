// Advanced topics — the senior/staff-level theory that rounds out the core
// modules: topics that are commonly asked but easy to leave thin. Each is
// written at interview depth and cross-links to the module it extends.
// Trusted in-repo HTML.
//
// Shape: { id, icon, title, tag, relatesTo, body, interview }

export const ADVANCED_TOPICS = [
  {
    id: 'tiered-storage',
    icon: '🧊',
    title: 'Tiered Storage (KIP-405)',
    tag: 'Storage',
    relatesTo: 'm10',
    body: `
      <p>Traditionally every byte of a partition lives on the <strong>broker's local disk</strong> for its whole retention. That forces a painful trade: keep long history and buy huge, expensive broker disks, or keep disks small and throw history away. <strong>Tiered storage</strong> breaks that trade by splitting the log into two tiers.</p>
      <ul>
        <li><strong>Local tier</strong> — recent segments stay on the broker's fast disk, serving low-latency reads for live consumers and replication.</li>
        <li><strong>Remote tier</strong> — older, closed segments are offloaded to cheap object storage (S3, GCS, HDFS). The broker keeps an index so it can fetch them on demand for a consumer reading old data.</li>
      </ul>
      <p>The payoff: <strong>retention is decoupled from broker disk</strong>. You can keep weeks or months of history at object-storage prices, broker disks stay small, and — a subtle operational win — <strong>rebalancing and recovery get faster</strong> because a broker only has to move the small local tier, not the entire history, when a partition is reassigned.</p>
      <p>Trade-off: reads that fall through to the remote tier have higher latency than local reads, so tiered storage suits long-retention/replay workloads rather than ultra-low-latency tail reads. Enabled with <code>remote.storage.enable=true</code> on the topic plus a configured remote store.</p>`,
    interview: `"Tiered storage offloads old log segments to object storage, so retention no longer costs broker disk. It lets me keep long history cheaply and makes rebalances faster because brokers only move the hot local tier. The cost is higher latency for reads that reach the remote tier — fine for replay, not for latency-critical tail reads."`,
  },
  {
    id: 'static-membership',
    icon: '🪪',
    title: 'Static Membership',
    tag: 'Consumer groups',
    relatesTo: 'm08',
    body: `
      <p>Normally a consumer gets a <em>dynamic</em> member ID each time it joins a group. So when you do a rolling restart — every pod leaves and rejoins — the coordinator sees new members and triggers a <strong>rebalance for each one</strong>, even though the end state is identical. For large or stateful groups (Kafka Streams especially) that's wasted churn and, worse, state-store restoration on every bounce.</p>
      <p><strong>Static membership</strong> gives each consumer a stable <code>group.instance.id</code> that survives restarts. Now when a member disconnects and reconnects <em>within</em> <code>session.timeout.ms</code>, the coordinator recognizes it and hands back <strong>the same partitions without a rebalance</strong>. A rolling restart becomes a sequence of quiet reconnects instead of a storm of reassignments.</p>
      <p>The trade-off is the flip side: because a known member is allowed to disappear briefly, a genuinely dead static member isn't detected until <code>session.timeout.ms</code> elapses — so you tune that timeout to balance fast failure detection against tolerating restarts. Static membership pairs naturally with the cooperative-sticky assignor.</p>`,
    interview: `"Static membership gives each consumer a stable group.instance.id so a restart within the session timeout reclaims the same partitions instead of triggering a rebalance. It's the standard fix for rebalance churn on rolling deploys of large or stateful groups — the trade is slower detection of a truly dead member, bounded by session.timeout.ms."`,
  },
  {
    id: 'quotas',
    icon: '🚦',
    title: 'Quotas & Throttling',
    tag: 'Multi-tenancy',
    relatesTo: 'm17',
    body: `
      <p>A shared cluster has a classic failure mode: one misbehaving client — a runaway backfill, a tight retry loop — saturates broker network or I/O and <strong>starves every other tenant</strong>. Quotas are Kafka's defense.</p>
      <ul>
        <li><strong>Network bandwidth quotas</strong> cap produce and fetch <em>byte-rate</em> per client-id, user, or (user, client-id) pair.</li>
        <li><strong>Request-rate quotas</strong> cap the <em>percentage of broker request-handler time</em> a client may use — protecting against high-rate small requests that aren't many bytes but still overload the broker's threads.</li>
      </ul>
      <p>Enforcement is graceful rather than a hard reject: when a client exceeds its quota, the broker <strong>delays its responses</strong> (adds throttle-time) so the client's own backpressure slows it down, instead of erroring. The client sees increased latency and a <code>produce/fetch-throttle-time</code> metric — a signal to look at, not a crash.</p>
      <p>Quotas are the mechanism that makes a multi-tenant Kafka cluster safe: capacity is shared fairly, and no single team can take the cluster down by accident.</p>`,
    interview: `"Quotas protect a shared cluster from a noisy tenant. You cap byte-rate (network quota) and request-handler time (request quota) per user/client-id, and the broker enforces by adding throttle delay to responses rather than rejecting — so the client backpressures itself. It's how you guarantee fairness and prevent one client from starving the cluster."`,
  },
  {
    id: 'high-watermark-epoch',
    icon: '📏',
    title: 'High-Water Mark & Leader Epoch',
    tag: 'Replication internals',
    relatesTo: 'm07',
    body: `
      <p>Two mechanisms make replication correct under failover. The first, the <strong>high-water mark (HWM)</strong>, is the highest offset that <em>all</em> in-sync replicas have. Consumers can only read <em>up to</em> the HWM — never beyond — so they never see a record that could vanish if the leader died before that record was fully replicated. The gap between the leader's log-end offset and the HWM is "written but not yet safely replicated."</p>
      <p>The second solves a subtler problem. When a leader fails and a follower takes over, the new leader may have a slightly different log tail than the old one. The old mechanism truncated based on the HWM alone, which — in rare multi-failure sequences — could cause replicas to <strong>silently diverge or lose/duplicate records</strong>. The <strong>leader epoch</strong> fixes this: every leadership change bumps an epoch number, and each replica records the offset where each epoch began. On recovery, a follower asks the leader "what's the end offset of my last epoch?" and truncates to <em>exactly</em> the right point — no guessing from the HWM.</p>
      <p>Together: the HWM bounds what consumers can see (durability), and the leader epoch guarantees logs reconcile <em>correctly</em> after a leadership change (consistency). It's the detail that makes "elect a new leader from the ISR" actually safe.</p>`,
    interview: `"The high-water mark is the highest offset all ISR replicas have, and consumers can only read up to it — so they never see a record that isn't safely replicated. Leader epochs make failover truncation correct: each leadership change bumps an epoch, replicas remember where each epoch started, and on recovery a follower truncates to its last epoch's real end offset instead of guessing from the HWM — which prevents the log divergence the old HWM-only approach could cause."`,
  },
  {
    id: 'record-batch',
    icon: '📦',
    title: 'The Record Batch Format',
    tag: 'Producer internals',
    relatesTo: 'm04',
    body: `
      <p>Kafka doesn't send records one at a time — the unit on the wire and on disk is the <strong>record batch</strong>, and understanding its shape explains several behaviors at once. A batch has a header (base offset, a CRC, the producer id and base sequence, attributes) followed by the records, where each record stores its fields as <strong>deltas</strong> — offset delta and timestamp delta from the batch base — so they compress to very few bytes.</p>
      <ul>
        <li><strong>Compression is per batch</strong>, not per record — which is why larger batches (via <code>linger.ms</code>/<code>batch.size</code>) compress dramatically better: more redundancy to exploit. A whole compressed batch is stored and replicated as one opaque blob.</li>
        <li><strong>Idempotence/EOS lives in the batch header</strong>: the producer id + base sequence let the broker dedupe retried batches and order them.</li>
        <li><strong>The broker often doesn't decompress.</strong> With zero-copy, a compressed batch is written to the log and later streamed to consumers untouched — the consumer decompresses. That's a big reason broker CPU stays low at high throughput.</li>
      </ul>
      <p>So "batching," "compression ratio improves with batch size," "idempotent producer," and "zero-copy" aren't separate facts — they all fall out of the batch being the fundamental unit.</p>`,
    interview: `"Kafka's unit is the record batch, not the individual record. Records are stored as deltas off the batch, compression is applied per batch (so bigger batches compress far better), and the idempotent producer's id/sequence live in the batch header. The broker usually stores and serves the compressed batch untouched via zero-copy, which is why broker CPU stays low — batching, compression, idempotence and zero-copy all come from the batch being the fundamental unit."`,
  },
  {
    id: 'rack-awareness',
    icon: '🗄️',
    title: 'Rack Awareness & Replica Placement',
    tag: 'Availability',
    relatesTo: 'm07',
    body: `
      <p>Replication factor 3 only protects you if the three replicas are in three <em>different</em> failure domains. Without guidance, Kafka might place all three replicas of a partition on brokers that happen to share a rack or an availability zone — so a single AZ outage takes the whole partition offline despite RF=3. <strong>Rack awareness</strong> prevents that.</p>
      <p>You tag each broker with <code>broker.rack</code> (set to its rack or AZ). Kafka then <strong>spreads a partition's replicas across distinct racks</strong> when assigning them, so losing an entire rack/AZ costs at most one replica per partition — the partition stays available and above its <code>min.insync.replicas</code> floor.</p>
      <p>There's a read-path companion too: <strong>follower fetching</strong> (rack-aware consumers) lets a consumer read from a <em>local</em> replica in its own AZ instead of always the leader, cutting cross-AZ network cost and latency — the leader still owns writes, but reads can be served closer.</p>
      <p>Rack awareness is the difference between "three copies" and "three copies that actually survive the failure you're most likely to have."</p>`,
    interview: `"RF=3 only helps if the replicas are in three failure domains. I set broker.rack to the AZ so Kafka spreads each partition's replicas across racks — then losing a whole AZ costs one replica per partition, not the partition. I'd also mention follower fetching so rack-aware consumers read from a local replica to cut cross-AZ cost. Durability has to map to the real failure domain, not just a replica count."`,
  },
];
