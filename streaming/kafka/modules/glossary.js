// Glossary — searchable, category-filterable Kafka terminology reference.
// Pure data + a tiny filter UI. Deep-links terms to their home module.

const TERMS = [
  // ── Core concepts ─────────────────────────────────────────────────────────
  { t: 'Event / Record', c: 'Core', m: 'm02', d: 'The unit of data in Kafka — an immutable key/value pair with a timestamp and optional headers. Also called a message.' },
  { t: 'Topic', c: 'Core', m: 'm02', d: 'A named, append-only log of events. Producers write to topics; consumers read from them. Split into partitions for scale.' },
  { t: 'Partition', c: 'Core', m: 'm06', d: 'An ordered, immutable sequence of records within a topic. The unit of parallelism and ordering — order is guaranteed only within a partition.' },
  { t: 'Offset', c: 'Core', m: 'm09', d: 'A monotonically increasing integer that uniquely identifies each record within a partition. Consumers track progress by offset.' },
  { t: 'Producer', c: 'Core', m: 'm04', d: 'A client that publishes (writes) records to Kafka topics, choosing the partition via key hashing or a custom partitioner.' },
  { t: 'Consumer', c: 'Core', m: 'm08', d: 'A client that subscribes to topics and reads records in order, committing offsets to track what it has processed.' },
  { t: 'Broker', c: 'Core', m: 'm05', d: 'A single Kafka server. It stores partition data, serves produce/fetch requests, and participates in replication. A cluster is many brokers.' },
  { t: 'Cluster', c: 'Core', m: 'm03', d: 'A group of brokers working together, coordinated by a controller, that collectively host all topics and partitions.' },

  // ── Producer side ─────────────────────────────────────────────────────────
  { t: 'acks', c: 'Producer', m: 'm04', d: 'Producer durability setting: 0 (fire-and-forget), 1 (leader ack), all/-1 (all in-sync replicas ack). Higher = safer, slower.' },
  { t: 'Partitioner', c: 'Producer', m: 'm04', d: 'Logic that maps a record to a partition. Default: hash(key) % partitions; null key → sticky/round-robin batching.' },
  { t: 'Batch / linger.ms', c: 'Producer', m: 'm04', d: 'Producers group records into batches per partition. linger.ms adds a small delay to fill batches, trading latency for throughput.' },
  { t: 'Idempotent Producer', c: 'Producer', m: 'm11', d: 'enable.idempotence=true — the broker de-duplicates retried records using a producer ID + sequence number, preventing duplicates on retry.' },

  // ── Storage & retention ───────────────────────────────────────────────────
  { t: 'Log Segment', c: 'Storage', m: 'm05', d: 'A partition\'s log is split into segment files. Only the active segment is written; older segments are candidates for deletion/compaction.' },
  { t: 'Page Cache', c: 'Storage', m: 'm05', d: 'Kafka relies on the OS page cache rather than an in-JVM cache, enabling zero-copy sends and very high throughput.' },
  { t: 'Retention', c: 'Storage', m: 'm10', d: 'How long (retention.ms) or how much (retention.bytes) data is kept before deletion. Independent of whether it was consumed.' },
  { t: 'Log Compaction', c: 'Storage', m: 'm10', d: 'A cleanup policy that keeps only the latest value per key, so the log becomes a changelog. Deleted keys are marked with tombstones.' },
  { t: 'Tombstone', c: 'Storage', m: 'm10', d: 'A record with a key and a null value in a compacted topic — signals deletion of that key after delete.retention.ms.' },
  { t: 'Zero-Copy', c: 'Storage', m: 'm05', d: 'sendfile() moves bytes from page cache straight to the network socket, skipping user-space copies — a key throughput win.' },

  // ── Replication & availability ────────────────────────────────────────────
  { t: 'Leader', c: 'Replication', m: 'm07', d: 'The single replica of a partition that handles all reads and writes. Followers replicate from it.' },
  { t: 'Follower', c: 'Replication', m: 'm07', d: 'A replica that passively fetches records from the leader to stay in sync. Can be elected leader on failure.' },
  { t: 'Replication Factor', c: 'Replication', m: 'm07', d: 'The number of copies of each partition across brokers. RF=3 tolerates 2 broker failures (with min.insync.replicas tuned).' },
  { t: 'ISR (In-Sync Replicas)', c: 'Replication', m: 'm07', d: 'The set of replicas caught up with the leader within replica.lag.time.max.ms. Only ISR members are eligible to become leader (by default).' },
  { t: 'min.insync.replicas', c: 'Replication', m: 'm07', d: 'With acks=all, the minimum ISR size required to accept a write. If ISR shrinks below it, produces fail — durability over availability.' },
  { t: 'High Watermark (HWM)', c: 'Replication', m: 'm07', d: 'The highest offset replicated to all ISR members. Consumers can only read up to the HWM — guarantees they never see un-replicated data.' },
  { t: 'Leader Epoch', c: 'Replication', m: 'm07', d: 'A version number for leadership, incremented on each election. Used to detect and truncate divergent logs safely after failover.' },
  { t: 'Unclean Leader Election', c: 'Replication', m: 'm07', d: 'Allowing an out-of-sync replica to become leader when no ISR member is available — restores availability at the cost of data loss.' },

  // ── Consumer side ─────────────────────────────────────────────────────────
  { t: 'Consumer Group', c: 'Consumer', m: 'm08', d: 'A set of consumers sharing a group.id that cooperatively divide a topic\'s partitions — each partition is read by exactly one member.' },
  { t: 'Rebalance', c: 'Consumer', m: 'm08', d: 'Re-assignment of partitions across group members when membership changes. "Stop-the-world" (eager) vs cooperative (incremental).' },
  { t: 'Group Coordinator', c: 'Consumer', m: 'm08', d: 'A broker that manages group membership, heartbeats, and offset commits for a consumer group.' },
  { t: 'Consumer Lag', c: 'Consumer', m: 'm09', d: 'log-end-offset minus committed offset — how far behind a consumer is. The single most important health metric to alert on.' },
  { t: 'Committed Offset', c: 'Consumer', m: 'm09', d: 'The last offset a consumer group has durably recorded (in __consumer_offsets) as processed. Reads resume here after restart.' },
  { t: 'Rewind / Seek', c: 'Consumer', m: 'm09', d: 'Repositioning a consumer to an earlier (or later) offset to replay or skip records — enabled by Kafka\'s durable log.' },

  // ── Delivery semantics ────────────────────────────────────────────────────
  { t: 'At-Most-Once', c: 'Delivery', m: 'm11', d: 'Commit offset before processing — records may be lost on failure but never duplicated.' },
  { t: 'At-Least-Once', c: 'Delivery', m: 'm11', d: 'Commit offset after processing — records are never lost but may be reprocessed (duplicates). The common default.' },
  { t: 'Exactly-Once (EOS)', c: 'Delivery', m: 'm11', d: 'No loss, no duplicates end-to-end — achieved with idempotent producers + transactions (read-process-write atomically).' },
  { t: 'Transaction', c: 'Delivery', m: 'm11', d: 'Atomically write to multiple partitions and commit consumer offsets together, via transactional.id and a transaction coordinator.' },

  // ── Ecosystem ─────────────────────────────────────────────────────────────
  { t: 'Kafka Connect', c: 'Ecosystem', m: 'm12', d: 'A framework for scalable, fault-tolerant integration — source connectors pull data in, sink connectors push it out, no custom code.' },
  { t: 'SMT', c: 'Ecosystem', m: 'm12', d: 'Single Message Transform — lightweight per-record modifications (rename, mask, route) applied inside a Connect pipeline.' },
  { t: 'Kafka Streams', c: 'Ecosystem', m: 'm13', d: 'A Java library for stateful stream processing directly on Kafka — map/filter/aggregate/join with local state stores and changelogs.' },
  { t: 'KTable / KStream', c: 'Ecosystem', m: 'm13', d: 'Streams abstractions: a KStream is an unbounded event stream; a KTable is a changelog interpreted as the latest value per key.' },
  { t: 'Schema Registry', c: 'Ecosystem', m: 'm14', d: 'A service storing Avro/Protobuf/JSON schemas by subject, enforcing compatibility so producers and consumers evolve safely.' },
  { t: 'Compatibility (BACKWARD/FORWARD/FULL)', c: 'Ecosystem', m: 'm14', d: 'Rules governing safe schema evolution — whether new consumers can read old data, old consumers new data, or both.' },

  // ── Operations ────────────────────────────────────────────────────────────
  { t: 'KRaft', c: 'Operations', m: 'm03', d: 'Kafka Raft metadata mode (KIP-500) — the controller quorum replaces ZooKeeper, simplifying ops and scaling to millions of partitions.' },
  { t: 'Controller', c: 'Operations', m: 'm03', d: 'The broker (or KRaft quorum) responsible for cluster metadata: leader elections, partition assignment, and broker membership.' },
  { t: 'MirrorMaker 2', c: 'Operations', m: 'm21', d: 'Cross-cluster replication built on Connect — mirrors topics, offsets, and consumer group state for DR and geo-distribution.' },
  { t: 'Partition Reassignment', c: 'Operations', m: 'm22', d: 'Moving partition replicas between brokers to rebalance load or decommission a node, via kafka-reassign-partitions.' },
  { t: 'SASL', c: 'Security', m: 'm15', d: 'Authentication framework for Kafka clients — mechanisms include PLAIN, SCRAM, GSSAPI (Kerberos), and OAUTHBEARER.' },
  { t: 'ACL', c: 'Security', m: 'm15', d: 'Access Control List — per-principal permissions on resources (topic, group, cluster) for operations like Read, Write, Describe.' },
];

const CATS = ['All', ...Array.from(new Set(TERMS.map(t => t.c)))];

export function mount(container) {
  const state = { cat: 'All', query: '' };

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">📖 · Reference · Amazon Edition</div>
        <h1 class="module-title">Glossary</h1>
        <p class="module-subtitle">Every term in the course, defined in one line and linked to the module where it lives. Search by name or definition, or filter by area.</p>
      </div>

      <div class="study-stats">
        <div class="stat-box"><span class="stat-val">${TERMS.length}</span><span class="stat-label">Terms</span></div>
        <div class="stat-box"><span class="stat-val">${CATS.length - 1}</span><span class="stat-label">Categories</span></div>
      </div>

      <div class="study-controls">
        <input class="study-search" type="search" placeholder="🔍 Search terms & definitions…" aria-label="Search glossary" />
        <div class="study-chips" data-filter="cat">
          ${CATS.map(c => `<button class="study-chip ${c === 'All' ? 'active' : ''}" data-val="${c}">${c}</button>`).join('')}
        </div>
      </div>

      <div class="glossary-results" id="gl-results"></div>
    </div>`;

  const resultsEl = container.querySelector('#gl-results');
  const searchEl = container.querySelector('.study-search');

  function apply() {
    const q = state.query.trim().toLowerCase();
    const rows = TERMS.filter(x =>
      (state.cat === 'All' || x.c === state.cat) &&
      (!q || (x.t + ' ' + x.d).toLowerCase().includes(q))
    ).sort((a, b) => a.t.localeCompare(b.t));

    if (!rows.length) { resultsEl.innerHTML = `<div class="study-empty">No terms match your filters.</div>`; return; }

    resultsEl.innerHTML = `
      <div class="study-count">${rows.length} term${rows.length > 1 ? 's' : ''}</div>
      <div class="glossary-grid">
        ${rows.map(x => `
          <div class="glossary-card">
            <div class="glossary-head">
              <span class="glossary-term">${x.t}</span>
              <span class="glossary-cat">${x.c}</span>
            </div>
            <p class="glossary-def">${x.d}</p>
            <a class="glossary-link" href="#${x.m}">Go to module →</a>
          </div>`).join('')}
      </div>`;
  }

  searchEl.addEventListener('input', () => { state.query = searchEl.value; apply(); });
  container.querySelector('.study-chips').addEventListener('click', e => {
    const chip = e.target.closest('.study-chip');
    if (!chip) return;
    state.cat = chip.dataset.val;
    container.querySelectorAll('.study-chip').forEach(c => c.classList.toggle('active', c === chip));
    apply();
  });

  apply();
  return () => {};
}
