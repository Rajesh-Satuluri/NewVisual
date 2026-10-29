export default {
  id: "key-value-store",
  title: "Design a key-value store",
  icon: "🗄️",
  chapter: 6,
  group: "Core building blocks",
  summary: "A distributed hash table: get(key) / put(key, value) spread across many nodes with replication for durability and availability. The design is a tour of the CAP theorem, quorums, versioning, and failure handling — the core ideas behind Dynamo, Cassandra and Riak.",
  sections: [
    {
      title: "Requirements",
      body: "A production KV store must stay available and low-latency while holding more data than one machine can and surviving node failures.",
      bullets: [
        "Simple API: `get(key)` and `put(key, value)`.",
        "Scale horizontally beyond a single node's capacity.",
        "High availability and durability despite node/network failures.",
        "Tunable consistency: callers trade latency for freshness.",
      ],
    },
    {
      title: "Partitioning — spread the data",
      body: "No single node can hold everything, so partition the keyspace across nodes using **consistent hashing**. Each key hashes to a point on the ring and is owned by the next node clockwise; virtual nodes keep the load even and make adding/removing capacity cheap (only a small fraction of keys move).",
      flow: ["key", "consistent-hash ring", "owner node (+ next R−1 for replicas)"],
    },
    {
      title: "Replication — survive failures",
      body: "Store each key on **N** nodes: the owner plus the next N−1 nodes clockwise on the ring (skipping virtual duplicates of the same physical node). If one replica is down, others still serve the key. Replicas should also span failure domains (racks, availability zones) so one outage doesn't take all N.",
      rules: ["Replication factor N (often 3): each key lives on N distinct physical nodes."],
    },
    {
      title: "Consistency — quorums (N, R, W)",
      body: "Rather than forcing strong or eventual consistency globally, Dynamo-style stores let you tune it per operation with three numbers: **N** replicas, **W** acks required for a write, **R** replicas read for a read.",
      table: {
        head: ["Rule", "Meaning"],
        rows: [
          ["W + R > N", "Read and write sets overlap → a read sees the latest write (strong-ish)"],
          ["W = N", "Slow, durable writes; any read can be R=1"],
          ["R = 1, W = 1", "Fastest, most available, but may read stale data"],
          ["W + R ≤ N", "Eventual consistency — reads may miss recent writes"],
        ],
      },
      body2: "A common balanced choice is N=3, W=2, R=2: survives one node down, and reads see the latest write.",
    },
    {
      title: "CAP trade-off",
      body: "During a network partition you must choose: refuse the operation to stay consistent (CP), or keep serving and reconcile later (AP). Dynamo-style stores lean **AP** — stay available, accept that replicas may temporarily diverge, and resolve conflicts afterward. That choice is what makes them 'always writable'.",
    },
    {
      title: "Versioning & conflict resolution",
      body: "If two clients write the same key during a partition, you get conflicting versions. **Vector clocks** (or version vectors) track causality so the system can tell 'this version descends from that one' (safe to drop the older) from 'these two conflict' (a real divergence). True conflicts are resolved by last-write-wins (simple, can lose data) or by handing both versions to the application to merge (e.g. merging a shopping cart).",
      bullets: [
        "Vector clock = map of (node → counter) attached to each version.",
        "Descendant versions are auto-resolved; concurrent ones are surfaced as conflicts.",
        "Resolution: last-write-wins, or application-level merge.",
      ],
    },
    {
      title: "Failure handling",
      body: "Detect failures with gossip (nodes exchange membership/heartbeat info) rather than a central monitor. Handle temporary failures with **hinted handoff**: if a replica is down, another node accepts the write and a 'hint' to forward it later. Handle permanent failures and silent drift with **anti-entropy** using Merkle trees to find and repair differing ranges between replicas efficiently.",
      bullets: [
        "**Gossip** for decentralized membership/failure detection.",
        "**Hinted handoff** for transient node failures (temporary stand-in).",
        "**Merkle trees** to sync replicas without comparing every key.",
      ],
    },
  ],
  qa: [
    {
      q: "Explain the N, W, R quorum model and how you'd tune it.",
      a: "N is the replication factor, W is the number of replica acknowledgements required to call a write successful, and R is the number of replicas consulted for a read.",
      bullets: [
        "If **W + R > N**, the write set and read set must overlap, so every read sees the most recent acknowledged write — effectively strong consistency.",
        "**Write-heavy, need fast reads:** small R (even 1), larger W.",
        "**Read-heavy, want availability:** small R and W, accept eventual consistency (W + R ≤ N).",
        "Balanced default: N=3, W=2, R=2 — tolerates one node down and still overlaps.",
      ],
      tip: "The key insight interviewers want: W+R>N is the dial that buys read-your-write freshness at the cost of latency/availability.",
    },
    {
      q: "Two clients write the same key during a partition. What happens?",
      a: "An AP store accepts both writes on the reachable replicas, producing two versions. Vector clocks attached to each version record causality: if one version is a descendant of the other, the system keeps the newer one automatically. If the versions are concurrent (neither descends from the other), it's a genuine conflict — resolved by last-write-wins (simple but can silently drop a write) or by returning both versions for the application to merge (e.g. union the items in a shopping cart).",
      tip: "Name vector clocks specifically, and the shopping-cart merge example — it's the canonical Dynamo illustration of why LWW isn't always safe.",
    },
    {
      q: "How does the store detect and recover from node failures?",
      a: "Detection is decentralized via **gossip** — nodes periodically exchange heartbeat/membership info, so there's no single monitor to fail. For transient failures, **hinted handoff** lets a healthy node temporarily accept writes meant for the down node and replay them when it returns. For permanent failures or slow drift between replicas, **anti-entropy with Merkle trees** lets two replicas compare hashes of key ranges and sync only the ranges that differ, instead of scanning everything.",
      tip: "Gossip + hinted handoff + Merkle trees is the three-part answer. Each maps to a different failure timescale (detect / transient / permanent).",
    },
    {
      q: "Where does consistent hashing fit in a KV store?",
      a: "It's the partitioning layer: it maps each key to an owner node and, by taking the next N−1 nodes clockwise, naturally defines where the replicas live. Because it only moves ~K/N keys when a node joins or leaves, you can grow or shrink the cluster without a full data reshuffle. Virtual nodes keep per-node load even and spread a failed node's data across many peers.",
      tip: "Tie the two concepts together: consistent hashing decides placement; N/W/R decides consistency on top of that placement.",
    },
  ],
  related: [
    "how-do-i-decide-between-sql-nosql-and-search-engines",
    "when-do-i-accept-eventual-consistency-vs-strict-consistency",
    "how-do-i-reason-about-cap-trade-offs-for-a-given-product-req",
    "how-do-raft-paxos-gossip-and-quorum-based-replication-actual",
    "how-do-i-shard-data-by-user-tenant-region-or-something-else",
  ],
};
