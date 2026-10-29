// ── Glossary ──────────────────────────────────────────────────────────────────
// Every key system-design term in one line, grouped by theme. `see` optionally
// links to a built concept id (rendered as a chip that routes to #c:<id>).

export const GLOSSARY_GROUPS = [
  'Scaling & distribution',
  'Data & storage',
  'Caching & performance',
  'Consistency & transactions',
  'Reliability & failure',
  'Messaging & streaming',
  'APIs & delivery',
];

export const GLOSSARY = [
  // ── Scaling & distribution ──────────────────────────────────────────────────
  { term: 'Horizontal scaling', group: 'Scaling & distribution', def: 'Add more machines to share load (scale out), rather than making one machine bigger. The default path to large scale because it has no single ceiling.', see: 'scaling-zero-to-millions' },
  { term: 'Vertical scaling', group: 'Scaling & distribution', def: 'Make a single machine more powerful (more CPU/RAM). Simple but hits a hardware ceiling and leaves a single point of failure.', see: 'scaling-zero-to-millions' },
  { term: 'Load balancer', group: 'Scaling & distribution', def: 'Spreads incoming requests across a pool of servers, removes dead ones, and hides individual instances behind one address.', see: 'scaling-zero-to-millions' },
  { term: 'Stateless service', group: 'Scaling & distribution', def: 'A service that keeps no per-client state in memory, so any instance can handle any request — the prerequisite for easy horizontal scaling.', see: 'scaling-zero-to-millions' },
  { term: 'Sharding', group: 'Scaling & distribution', def: 'Partitioning data across multiple databases/nodes by a shard key so each holds only a slice of the whole.', see: 'key-value-store' },
  { term: 'Consistent hashing', group: 'Scaling & distribution', def: 'A hashing scheme that maps keys and nodes onto a ring so adding/removing a node moves only a small fraction of keys.', see: 'consistent-hashing' },
  { term: 'Hot partition / hotspot', group: 'Scaling & distribution', def: 'One shard or key that receives a disproportionate share of traffic, becoming a bottleneck. Caused by a skewed shard key.', see: 'consistent-hashing' },
  { term: 'Back-of-envelope estimation', group: 'Scaling & distribution', def: 'Quickly turning assumptions into QPS, storage and bandwidth numbers to size a system and justify design choices.', see: 'back-of-envelope-estimation' },
  { term: 'CDN', group: 'Scaling & distribution', def: 'Content Delivery Network — geographically distributed edge caches that serve static (and some dynamic) content close to users.', see: 'youtube' },

  // ── Data & storage ──────────────────────────────────────────────────────────
  { term: 'Replication', group: 'Data & storage', def: 'Keeping copies of data on multiple nodes for durability and read scaling. Leader-follower or leaderless (quorum).', see: 'key-value-store' },
  { term: 'Quorum (W + R > N)', group: 'Data & storage', def: 'Requiring a majority of replicas to acknowledge reads/writes so read and write sets overlap, guaranteeing fresh reads.', see: 'key-value-store' },
  { term: 'Primary / replica (leader / follower)', group: 'Data & storage', def: 'One node accepts writes (leader) and streams them to read-only copies (followers). Failover promotes a follower.', see: 'key-value-store' },
  { term: 'LSM tree', group: 'Data & storage', def: 'Log-Structured Merge tree — buffers writes in memory then flushes sorted files to disk; write-optimized, used by many NoSQL stores.', see: 'key-value-store' },
  { term: 'B-tree', group: 'Data & storage', def: 'Balanced on-disk index keeping data sorted for fast reads and range scans; the backbone of relational database indexes.' },
  { term: 'Write-ahead log (WAL)', group: 'Data & storage', def: 'An append-only log written before applying a change, so the system can recover exactly by replaying it after a crash.' },
  { term: 'Erasure coding', group: 'Data & storage', def: 'Splits data into fragments plus parity so it survives lost fragments with far less storage overhead than full replication.', see: 'object-storage' },
  { term: 'Snowflake ID', group: 'Data & storage', def: 'A 64-bit, roughly time-sortable unique ID built from timestamp + machine id + sequence, generated without coordination.', see: 'unique-id-generator' },
  { term: 'Geohash / quadtree', group: 'Data & storage', def: 'Spatial indexes that encode 2-D location into a searchable key/tree so you can find nearby points efficiently.', see: 'proximity-service' },
  { term: 'Inverted index', group: 'Data & storage', def: 'Maps each term to the list of documents containing it — the core structure behind full-text search and autocomplete ranking.', see: 'search-autocomplete' },

  // ── Caching & performance ────────────────────────────────────────────────────
  { term: 'Cache hit ratio', group: 'Caching & performance', def: 'Fraction of reads served from cache. The single metric that says whether a cache is actually earning its keep.', see: 'scaling-zero-to-millions' },
  { term: 'Cache-aside (lazy loading)', group: 'Caching & performance', def: 'App checks the cache; on a miss it reads the DB and populates the cache. The most common caching pattern.' },
  { term: 'Write-through / write-back', group: 'Caching & performance', def: 'Write-through updates cache and DB together (safe, slower writes); write-back updates cache first and DB later (fast, risk of loss).' },
  { term: 'Cache stampede', group: 'Caching & performance', def: 'A popular key expires and thousands of requests simultaneously miss and hit the DB. Mitigated by locks, early refresh, or jittered TTLs.' },
  { term: 'TTL', group: 'Caching & performance', def: 'Time To Live — how long a cached entry stays valid before it must be refreshed.' },
  { term: 'Tail latency (p99)', group: 'Caching & performance', def: 'The latency of the slowest requests (99th percentile). What users actually feel; averages hide it.' },
  { term: 'Bloom filter', group: 'Caching & performance', def: 'A compact probabilistic set that answers "definitely not present" or "maybe present" — used to skip expensive lookups.' },

  // ── Consistency & transactions ───────────────────────────────────────────────
  { term: 'CAP theorem', group: 'Consistency & transactions', def: 'Under a network partition you must choose between consistency and availability; you cannot have both at once.', see: 'key-value-store' },
  { term: 'Strong consistency', group: 'Consistency & transactions', def: 'Every read reflects the most recent write. Simpler to reason about, costs latency and availability.' },
  { term: 'Eventual consistency', group: 'Consistency & transactions', def: 'Replicas converge to the same value given no new writes; reads may be briefly stale. Buys availability and scale.' },
  { term: 'Read-your-own-writes', group: 'Consistency & transactions', def: 'A consistency guarantee that a user always sees their own latest update, even if others see it later.' },
  { term: 'ACID', group: 'Consistency & transactions', def: 'Atomicity, Consistency, Isolation, Durability — the guarantees of a classic relational transaction.', see: 'digital-wallet' },
  { term: 'Two-phase commit (2PC)', group: 'Consistency & transactions', def: 'A coordinator asks all participants to prepare, then commit. Correct but blocking, with a coordinator single point of failure.', see: 'digital-wallet' },
  { term: 'Saga', group: 'Consistency & transactions', def: 'A long-running transaction split into local steps, each with a compensating action to undo it on failure. The scalable alternative to 2PC.', see: 'digital-wallet' },
  { term: 'Double-entry ledger', group: 'Consistency & transactions', def: 'Records every money movement as balanced, immutable debit + credit entries so the books always sum to zero and are auditable.', see: 'payment-system' },
  { term: 'Optimistic / pessimistic locking', group: 'Consistency & transactions', def: 'Pessimistic locks a row before acting; optimistic checks a version at commit and retries on conflict. Trade contention for retries.', see: 'hotel-reservation' },

  // ── Reliability & failure ─────────────────────────────────────────────────────
  { term: 'Idempotency', group: 'Reliability & failure', def: 'An operation that can be applied many times with the same effect as once — the key to safe retries. Keyed by an idempotency token.', see: 'payment-system' },
  { term: 'Exactly-once (effectively-once)', group: 'Reliability & failure', def: 'The practical goal of at-least-once delivery + idempotent processing, so duplicates have no visible effect.', see: 'ad-click-aggregation' },
  { term: 'Circuit breaker', group: 'Reliability & failure', def: 'Stops calling a failing dependency after a threshold, fails fast, and periodically probes to recover — prevents cascading failure.' },
  { term: 'Bulkhead', group: 'Reliability & failure', def: 'Isolates resources (thread pools, connections) per dependency so one overloaded component cannot sink the whole service.' },
  { term: 'Backpressure', group: 'Reliability & failure', def: 'Signaling upstream to slow down when a system is overloaded, instead of silently dropping work or collapsing.' },
  { term: 'Exponential backoff + jitter', group: 'Reliability & failure', def: 'Retrying with geometrically increasing, randomized delays so clients do not synchronize into a retry storm.' },
  { term: 'Dead-letter queue (DLQ)', group: 'Reliability & failure', def: 'A side queue for messages that repeatedly fail processing, so they are parked for inspection instead of blocking the pipeline.' },
  { term: 'Graceful degradation', group: 'Reliability & failure', def: 'Shedding non-essential features under stress to keep the core working, rather than failing completely.' },
  { term: 'Health check / heartbeat', group: 'Reliability & failure', def: 'Periodic signals that let a load balancer or controller detect and route around dead instances.' },
  { term: 'SLO / SLA / SLI', group: 'Reliability & failure', def: 'SLI is the measured signal, SLO the internal target, SLA the external promise with consequences. Error budget = 1 − SLO.' },

  // ── Messaging & streaming ─────────────────────────────────────────────────────
  { term: 'Message queue', group: 'Messaging & streaming', def: 'A buffer that decouples producers from consumers, absorbs spikes, and enables async processing and retries.', see: 'distributed-message-queue' },
  { term: 'Pub/sub', group: 'Messaging & streaming', def: 'Publishers emit events to topics; many independent subscribers receive them. Decouples who produces from who consumes.', see: 'nearby-friends' },
  { term: 'Partitioned log', group: 'Messaging & streaming', def: 'An append-only, ordered log split into partitions for parallelism; the model behind Kafka-style queues and streams.', see: 'distributed-message-queue' },
  { term: 'Consumer group', group: 'Messaging & streaming', def: 'A set of consumers that divide a topic’s partitions among themselves; parallelism is capped by partition count.', see: 'distributed-message-queue' },
  { term: 'Fan-out on write vs read', group: 'Messaging & streaming', def: 'Precompute per-recipient feeds at write time (fast reads, heavy writes) vs assemble at read time (cheap writes, slow reads).', see: 'news-feed-system' },
  { term: 'Outbox pattern', group: 'Messaging & streaming', def: 'Write a state change and its event into one local transaction, then publish from the outbox table — solving the dual-write problem.', see: 'digital-wallet' },
  { term: 'Watermark / windowing', group: 'Messaging & streaming', def: 'Stream-processing tools for handling time: windows group events by time; watermarks decide when a window is "complete" despite late data.', see: 'ad-click-aggregation' },

  // ── APIs & delivery ───────────────────────────────────────────────────────────
  { term: 'API gateway', group: 'APIs & delivery', def: 'A single entry point that handles routing, auth, rate limiting and aggregation in front of many backend services.', see: 'rate-limiter' },
  { term: 'Rate limiter', group: 'APIs & delivery', def: 'Caps how many requests a client may make in a window (token bucket, sliding window) to protect capacity and fairness.', see: 'rate-limiter' },
  { term: 'Token bucket', group: 'APIs & delivery', def: 'Rate-limiting algorithm: a bucket refills at a steady rate and each request spends a token; allows bursts up to bucket size.', see: 'rate-limiter' },
  { term: 'WebSocket', group: 'APIs & delivery', def: 'A persistent, bidirectional connection used for real-time push (chat, presence, live updates) instead of polling.', see: 'chat-system' },
  { term: 'Long polling', group: 'APIs & delivery', def: 'The client holds a request open until the server has data, approximating push over plain HTTP.', see: 'chat-system' },
  { term: 'Backward compatibility', group: 'APIs & delivery', def: 'Changing an API or schema so existing clients keep working — additive changes, versioning, and tolerant readers.' },
  { term: '429 Too Many Requests', group: 'APIs & delivery', def: 'The HTTP status a rate limiter returns, ideally with Retry-After so well-behaved clients self-throttle.', see: 'rate-limiter' },
];
