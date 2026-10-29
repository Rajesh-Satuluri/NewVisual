export default {
  id: "realtime-leaderboard",
  title: "Design a real-time gaming leaderboard",
  icon: "🏆",
  chapter: 25,
  group: "Money & real-time",
  summary: "Rank millions of players by score and serve the top-K plus 'my rank' in real time. The elegant core is a sorted set (Redis ZSET); the scaling challenges are rank queries over millions of entries and sharding a global ranking.",
  sections: [
    {
      title: "Requirements",
      body: "Update a player's score, fetch the top-K, and fetch a specific player's rank and neighbors — all fast and fresh.",
      bullets: [
        "Update score on game events (write).",
        "Top-K leaderboard (e.g. top 10/100).",
        "A player's own rank + surrounding players ('you are #4,214').",
        "Millions of players; real-time updates; frequent reads.",
      ],
    },
    {
      title: "Why a plain database struggles",
      body: "In SQL, the top-K is easy (`ORDER BY score DESC LIMIT K` with an index), but **'what is player X's rank?'** means counting how many players have a higher score — an O(N) COUNT on every query, which is brutal at millions of players and high QPS. You need a structure that maintains rank order incrementally.",
      rules: ["Top-K is easy; computing an arbitrary player's rank is the hard part."],
    },
    {
      title: "The core: a sorted set (Redis ZSET)",
      body: "A Redis **sorted set** keeps members (players) ordered by score and supports exactly the operations you need in O(log N):",
      table: {
        head: ["Operation", "Redis command", "Cost"],
        rows: [
          ["Update score", "ZADD / ZINCRBY", "O(log N)"],
          ["Top-K", "ZREVRANGE 0 K-1", "O(log N + K)"],
          ["Player's rank", "ZREVRANK player", "O(log N)"],
          ["Neighbors", "ZREVRANGE rank-2 rank+2", "O(log N + range)"],
        ],
      },
      body2: "The ZSET maintains order incrementally, so rank is O(log N) instead of an O(N) scan — this is the whole trick.",
    },
    {
      title: "Durability & the source of truth",
      body: "Redis is the fast serving layer, but scores should also be persisted in a durable database (the system of record), with the ZSET as a rebuildable index/cache. On a Redis failure you reconstruct the sorted set from the database. Score updates write to both (or to the DB, then update Redis).",
      flow: ["Game event", "Persist score (durable DB)", "Update ZSET (Redis)", "Reads served from ZSET"],
    },
    {
      title: "Scaling beyond one node",
      body: "A single ZSET works to surprisingly large sizes, but a global leaderboard of tens of millions needs sharding, which makes global rank hard (rank spans shards).",
      bullets: [
        "**Shard by score range** (buckets) so you can sum counts across shards for global rank.",
        "Or shard by region/game-mode so each leaderboard is independent (most real products do this).",
        "Time-bucketed leaderboards (daily/weekly) naturally cap size and reset.",
        "For approximate global rank at huge scale, use sampling/percentile estimates.",
      ],
    },
    {
      title: "Hot keys & write bursts",
      body: "Popular leaderboards and viral score updates create hot keys. Mitigate with replicas for reads, batching/coalescing frequent score updates, and accepting slight staleness for rank displays. Ties are broken deterministically (e.g. by timestamp of reaching the score) so rankings are stable.",
    },
  ],
  qa: [
    {
      q: "Why not just use a SQL table with ORDER BY for a leaderboard?",
      a: "Top-K is fine in SQL (indexed `ORDER BY score DESC LIMIT K`), but the killer query is a specific player's rank, which requires counting everyone with a higher score — an O(N) operation per request that collapses at millions of players and high read volume. A sorted set (Redis ZSET) maintains ranking order incrementally so both top-K and arbitrary rank are O(log N). The DB can still be the durable source of truth; the ZSET is the fast ranking index.",
      tip: "Pinpointing 'arbitrary rank = O(N) COUNT in SQL' as the real bottleneck, solved by a ZSET, is the crux.",
    },
    {
      q: "How does a Redis sorted set give you rank in O(log N)?",
      a: "A ZSET stores members ordered by score in a skip-list + hash, so it can find a member's position (ZREVRANK) and ranges around it (ZREVRANGE) in logarithmic time, and update a score (ZADD/ZINCRBY) in O(log N) while keeping order. So top-K, a player's rank, and their neighbors are all cheap and always consistent with the latest scores — no recount needed.",
      tip: "Name the exact commands (ZADD/ZINCRBY, ZREVRANGE, ZREVRANK) and their O(log N) cost — it shows hands-on knowledge.",
    },
    {
      q: "How do you scale to tens of millions of players and keep global rank?",
      a: "First, question whether you need a single global rank — most products shard by region, game mode, or time window (daily/weekly), giving independent, bounded leaderboards. If a true global rank is required, shard the ZSET by score range into buckets so you can compute a global rank by summing the sizes of higher-scoring buckets plus the within-bucket rank. For extreme scale, approximate rank via percentile/sampling is acceptable for display. Always back it with a durable store to rebuild shards.",
      tip: "Leading with 'do you actually need global rank?' then score-range sharding for when you do is the pragmatic senior answer.",
    },
    {
      q: "How do you keep Redis-based scores durable and handle hot keys?",
      a: "Treat Redis as a fast, rebuildable index and a durable database as the system of record — write scores to the DB and update the ZSET, so a Redis loss is recovered by rebuilding the sorted set from the DB. For hot keys (viral leaderboards, rapid score updates), serve reads from replicas, batch/coalesce frequent updates, and accept slightly stale rank displays. Break ties deterministically (e.g. earliest timestamp at a score) for stable ordering.",
      tip: "Redis-as-rebuildable-index + DB-as-truth, plus read replicas/batching for hot keys, covers durability and the burst problem.",
    },
  ],
  related: [
    "where-should-i-cache-client-edge-service-db-layer",
    "how-do-i-avoid-hot-partitions-and-skew",
    "how-do-i-shard-data-by-user-tenant-region-or-something-else",
    "how-should-i-index-for-read-heavy-vs-write-heavy-workloads",
  ],
};
