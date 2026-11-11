// ── Cheat sheet ───────────────────────────────────────────────────────────────
// The numbers, formulas and one-liners worth memorizing before an interview.
// Rendered by components/cheatsheet.js. Each section: { title, icon, ...blocks }.

export const CHEATSHEET = [
  {
    title: 'Latency numbers every engineer should know',
    icon: '⏱️',
    note: 'Orders of magnitude matter more than exact values — know what is ns vs µs vs ms.',
    table: {
      head: ['Operation', 'Time', 'Intuition'],
      rows: [
        ['L1 cache reference', '~1 ns', 'baseline'],
        ['Main memory (RAM) reference', '~100 ns', '100× L1'],
        ['Read 1 MB sequentially from RAM', '~3 µs', ''],
        ['SSD random read', '~16–100 µs', '~1000× RAM'],
        ['Round trip within a data center', '~0.5 ms', ''],
        ['Read 1 MB sequentially from SSD', '~1 ms', ''],
        ['Disk (HDD) seek', '~10 ms', '~20× SSD'],
        ['Round trip CA ↔ Netherlands', '~150 ms', 'speed of light tax'],
      ],
    },
    rules: ['Memory is fast, disk is slow, the network is slower, and cross-continent is the slowest. Cache and co-locate accordingly.'],
  },
  {
    title: 'Powers of two & data sizes',
    icon: '🔢',
    table: {
      head: ['Power', 'Exact', 'Approx', 'Name'],
      rows: [
        ['2¹⁰', '1,024', '1 thousand', 'Kilo (KB)'],
        ['2²⁰', '1,048,576', '1 million', 'Mega (MB)'],
        ['2³⁰', '~1.07 billion', '1 billion', 'Giga (GB)'],
        ['2⁴⁰', '~1.1 trillion', '1 trillion', 'Tera (TB)'],
        ['2⁵⁰', '—', '1 quadrillion', 'Peta (PB)'],
      ],
    },
    rules: ['A char ≈ 1 byte (ASCII) / 2–4 (UTF-8). A UUID ≈ 16 bytes. A timestamp ≈ 8 bytes. A typical row ≈ 100 B – 1 KB.'],
  },
  {
    title: 'Availability — the nines',
    icon: '🟢',
    table: {
      head: ['Availability', 'Downtime / year', 'Downtime / day'],
      rows: [
        ['90% (one nine)', '36.5 days', '2.4 hours'],
        ['99% (two nines)', '3.65 days', '14 minutes'],
        ['99.9% (three nines)', '8.76 hours', '86 seconds'],
        ['99.99% (four nines)', '52.6 minutes', '8.6 seconds'],
        ['99.999% (five nines)', '5.26 minutes', '0.86 seconds'],
      ],
    },
    rules: [
      'Components in series multiply: two 99.9% services in a request path → ~99.8%.',
      'Redundancy adds nines; every extra nine costs roughly 10× the effort.',
    ],
  },
  {
    title: 'Capacity estimation formulas',
    icon: '🧮',
    stats: [
      { value: '~100k', label: 'seconds in a day (86,400 ≈ 10⁵)', tone: 'accent' },
      { value: '÷ 10⁵', label: 'daily count → average QPS', tone: 'blue' },
      { value: '× 2–10', label: 'average QPS → peak QPS', tone: 'amber' },
    ],
    bullets: [
      '**QPS** = daily requests ÷ 86,400. **Peak QPS** = average × (2 to 10).',
      '**Storage/day** = writes/day × bytes/write. **5-year storage** = storage/day × 365 × 5.',
      '**Bandwidth** = QPS × payload size. Split read vs write; reads usually dominate.',
      '**Read:write ratio** drives everything — a 100:1 read-heavy system screams "cache + replicas".',
      '**Cache size** ≈ 20% of data serves ~80% of requests (Pareto) — size the cache to the hot set.',
    ],
  },
  {
    title: 'Consistency models — fastest → safest',
    icon: '🔗',
    table: {
      head: ['Model', 'Guarantee', 'Use when'],
      rows: [
        ['Eventual', 'Converges eventually; reads may be stale', 'Likes, view counts, feeds'],
        ['Read-your-writes', 'You see your own updates', 'Profile edits, settings'],
        ['Monotonic reads', 'Never see time go backwards', 'Timelines, comments'],
        ['Causal', 'Cause is seen before effect', 'Chat, collaborative edits'],
        ['Strong / linearizable', 'Always the latest write', 'Balances, inventory, locks'],
      ],
    },
    rules: ['Default to the weakest model the product can tolerate — stronger consistency costs latency and availability.'],
  },
  {
    title: 'SQL vs NoSQL — pick on access pattern',
    icon: '🗃️',
    compareNote: true,
    table: {
      head: ['Choose SQL when', 'Choose NoSQL when'],
      rows: [
        ['Relationships, joins, ad-hoc queries', 'Massive scale, simple key access'],
        ['Transactions & strong consistency', 'Flexible / evolving schema'],
        ['Moderate, well-understood scale', 'Extreme write throughput'],
        ['Reporting / analytics flexibility', 'Known query patterns, denormalized'],
      ],
    },
    rules: ['"NoSQL" is many things: key-value (Redis/Dynamo), wide-column (Cassandra), document (Mongo), graph. Match the model to the access pattern.'],
  },
  {
    title: 'The interview framework (4 steps)',
    icon: '🗺️',
    steps: [
      { title: 'Scope & requirements', detail: 'Clarify functional + non-functional needs, estimate scale (QPS, storage), and state assumptions out loud.' },
      { title: 'High-level design', detail: 'Draw the boxes: clients, API, services, data stores, caches, queues. Get agreement before going deep.' },
      { title: 'Deep dive', detail: 'Pick the 1–2 hardest parts (the data model, the bottleneck, the consistency story) and go deep with trade-offs.' },
      { title: 'Wrap up', detail: 'Address failure modes, bottlenecks, and how it scales 10×. Name what you would monitor and what you deliberately left out.' },
    ],
  },
  {
    title: 'Pattern → when to reach for it',
    icon: '🧰',
    table: {
      head: ['Problem', 'Reach for'],
      rows: [
        ['Read-heavy, repeated reads', 'Cache (cache-aside) + read replicas'],
        ['Spiky or slow downstream', 'Queue + async workers + backpressure'],
        ['One client overwhelming you', 'Rate limiter at the gateway (token bucket)'],
        ['Data too big for one node', 'Shard by a high-cardinality key'],
        ['Safe retries on writes', 'Idempotency key + dedup store'],
        ['Cross-service "transaction"', 'Saga + outbox + compensation'],
        ['Cascading failure', 'Circuit breaker + bulkhead + timeouts'],
        ['Find nearby things', 'Geohash / quadtree spatial index'],
        ['Global unique IDs, no coordination', 'Snowflake-style IDs'],
        ['Top-K / ranking in real time', 'Redis sorted set (ZSET)'],
      ],
    },
  },
];
