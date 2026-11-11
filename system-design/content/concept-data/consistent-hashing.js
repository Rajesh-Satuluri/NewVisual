export default {
  id: "consistent-hashing",
  title: "Consistent hashing",
  icon: "💍",
  chapter: 5,
  group: "Core building blocks",
  summary: "A way to map keys to a changing set of servers so that adding or removing a server moves only a small fraction of keys — not almost all of them, as plain `hash % N` would. The foundation of distributed caches and databases like Dynamo and Cassandra.",
  widget: "consistent-hash",
  sections: [
    {
      title: "The problem with hash % N",
      body: "The naive way to spread keys across N servers is `server = hash(key) % N`. It's balanced — until N changes. Add or remove one server and N changes, so almost **every** key now maps to a different server. For a cache that means a near-total miss storm; for a database it means moving nearly all the data. That's unacceptable when nodes come and go routinely.",
      rules: ["Add one server to a modulo scheme → ~all keys remap → cache cold / huge data shuffle."],
    },
    {
      title: "The ring",
      body: "Consistent hashing places both servers and keys on the same circular hash space (a ring, e.g. 0 … 2³²−1). You hash each server (by name/IP) to a point on the ring, and each key to a point too. A key is owned by the **first server you meet going clockwise** from the key's position.",
      flow: ["hash(key) → point on ring", "walk clockwise", "first server = owner"],
    },
    {
      title: "Why adding/removing a node moves few keys",
      body: "When a server is removed, only the keys that it owned (the arc between it and the previous server) move — to the next server clockwise. Everyone else is untouched. When a server is added, it takes over only the arc of keys between it and the next server. On average just **K/N keys move** (K keys, N servers), instead of nearly all of them.",
      rules: ["Add/remove a node → only ~K/N keys move, not ~all of them."],
    },
    {
      title: "Virtual nodes fix uneven distribution",
      body: "With few servers, the arcs between them are uneven, so some servers get far more keys than others (and losing one server dumps its whole load onto a single neighbor). The fix: give each physical server many **virtual nodes** — hash it to many points on the ring. Load averages out, and when a server dies its keys scatter across many others instead of one.",
      bullets: [
        "Each physical server = many points on the ring (e.g. 100–200 vnodes).",
        "Smoother load distribution and finer rebalancing.",
        "A failed node's load spreads across many peers, not one neighbor.",
      ],
    },
    {
      title: "Where it's used",
      body: "Consistent hashing underpins distributed systems where the node set changes: Amazon Dynamo and Cassandra for data partitioning, many distributed caches (and Memcached client libraries), CDN edge selection, and shard routing layers. Anywhere you need stable key→node mapping under churn.",
      body2: "Use the interactive ring on this page: add and remove nodes and watch how few keys change owner.",
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Why consistent hashing exists, made concrete: a cache cluster grows from 4 nodes to 5 under load. With naive `hash % N` that one change is a near-total cache wipe; with a hash ring it barely registers.",
  deepDive: [
    {
      title: "The blast radius of adding one node",
      body: "You run a 4-node cache holding 1,000,000 hot keys. Traffic grows, so you add a 5th node. How many keys end up on a different node than before?",
      stats: [
        { value: "~80%", label: "keys remapped with hash % N (4→5)", tone: "red" },
        { value: "~20%", label: "keys remapped with a hash ring", tone: "green" },
        { value: "1/N", label: "the ring's guarantee per node change", tone: "accent" },
      ],
    },
    {
      title: "Why `hash % N` is a trap",
      body: "`server = hash(key) % N` looks fine until **N** changes. Change the modulus and almost every key maps somewhere new — because the remainder of a number mod 4 tells you nothing about its remainder mod 5. Every remapped key is now a **cache miss**, so the moment you add a node the whole fleet stampedes the database it was shielding.",
      compare: {
        title: "Adding the 5th node",
        cols: [
          { title: "hash % N", tone: "bad", body: "The modulus changes from 4 to 5.", points: [
            "~80% of keys map to a new node → mass cache miss.",
            "All those misses hit the database at once — a stampede.",
            "Scaling up briefly makes things *slower*, not faster.",
          ] },
          { title: "Hash ring", tone: "good", body: "Keys and nodes share one hash space.", points: [
            "Only keys between the new node and its predecessor move.",
            "~1/N of keys relocate; the other ~80% stay put and warm.",
            "Scaling is smooth and safe under load.",
          ] },
        ],
      },
    },
    {
      title: "How the ring places keys",
      body: "Hash both **nodes** and **keys** onto the same circular space (0 … 2³²−1). A key is owned by the first node found walking clockwise. Add or remove a node and only the arc between it and its predecessor is affected — everything else is untouched.",
      svg: `<svg viewBox="0 0 440 240" width="440" role="img" aria-label="Hash ring" style="font-family:system-ui">
        <circle cx="140" cy="120" r="88" fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-width="2"/>
        <!-- nodes -->
        <circle cx="140" cy="32" r="9" fill="#4F46E5"/><text x="140" y="24" text-anchor="middle" fill="currentColor" font-size="11" font-weight="700">N1</text>
        <circle cx="228" cy="120" r="9" fill="#4F46E5"/><text x="246" y="124" text-anchor="middle" fill="currentColor" font-size="11" font-weight="700">N2</text>
        <circle cx="140" cy="208" r="9" fill="#4F46E5"/><text x="140" y="228" text-anchor="middle" fill="currentColor" font-size="11" font-weight="700">N3</text>
        <circle cx="52" cy="120" r="9" fill="#4F46E5"/><text x="30" y="124" text-anchor="middle" fill="currentColor" font-size="11" font-weight="700">N4</text>
        <!-- a key -->
        <circle cx="200" cy="56" r="6" fill="#10B981"/>
        <text x="214" y="52" fill="#10B981" font-size="10" font-weight="700">key k</text>
        <path d="M205 61 Q222 90 228 111" fill="none" stroke="#10B981" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#chArr)"/>
        <text x="250" y="96" fill="#10B981" font-size="9">clockwise → owned by N2</text>
        <!-- legend -->
        <text x="330" y="150" fill="currentColor" font-size="10" opacity="0.75">Add N5 between N1 and N2:</text>
        <text x="330" y="166" fill="currentColor" font-size="10" opacity="0.75">only keys on that arc move.</text>
        <defs><marker id="chArr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#10B981"/></marker></defs>
      </svg>`,
      caption: "A key is owned by the first node clockwise from its hash position.",
    },
    {
      title: "Virtual nodes — the detail that makes it work",
      body: "With only a few real nodes, random placement leaves big uneven gaps, so load is lopsided and removing a node dumps its entire share onto a single neighbor. The fix: give each physical node many **virtual nodes** (e.g. 100–200 points) scattered around the ring.",
      callouts: [
        { tone: "key", label: "Even load:", body: "Many small arcs per node average out, so each physical node carries a near-equal share instead of whatever one random arc happened to be." },
        { tone: "good", label: "Graceful failure:", body: "When a node dies, its many arcs are absorbed by many *different* neighbors — load spreads out instead of crushing one node." },
        { tone: "tip", label: "Interview line:", body: "\"Consistent hashing bounds key movement to ~1/N per node change; virtual nodes make that movement *even*.\" That one sentence is the whole answer." },
      ],
    },
  ],
  qa: [
    {
      q: "Why not just use hash(key) % N to distribute keys across servers?",
      a: "Because it's catastrophic under change. `% N` is balanced while N is fixed, but the moment you add or remove a server, N changes and nearly every key maps somewhere new. For a cache that's a near-total miss storm that can overload the backing database; for a sharded datastore it's a near-total data reshuffle. Consistent hashing exists precisely to make the mapping stable as nodes come and go.",
      tip: "The one-liner: modulo rebalances ~all keys on any membership change; consistent hashing rebalances only ~K/N.",
    },
    {
      q: "How does consistent hashing decide which node owns a key?",
      a: "Both nodes and keys are hashed onto the same circular space. A key is owned by the first node encountered walking clockwise from the key's position on the ring. Add a node and it claims only the arc of keys between itself and the next node clockwise; remove a node and its arc passes to the next node clockwise — everything else is untouched.",
      tip: "Draw the ring in the interview. It makes the 'only the neighboring arc moves' argument obvious.",
    },
    {
      q: "What problem do virtual nodes solve?",
      a: "Two problems. (1) **Uneven load:** with only a handful of real nodes, the random arcs between them vary a lot, so some nodes own much more of the ring than others. (2) **Hot failover:** when a node dies, its entire arc dumps onto its single clockwise neighbor. Giving each physical node many virtual points on the ring smooths the distribution and spreads a failed node's load across many peers.",
      tip: "Rule of thumb: ~100–200 vnodes per physical node is a common starting point; more vnodes = smoother but more metadata.",
    },
    {
      q: "What are the limitations of consistent hashing?",
      a: "It balances by key count, not by key *weight* — a few hot keys can still overload one node (the 'hot partition' problem) regardless of how evenly keys are spread. It also doesn't by itself give you replication or consistency; real systems layer those on top (e.g. store each key on the next R nodes clockwise for replication). And virtual-node metadata and ring state must be distributed to all participants (often via gossip).",
      tip: "Mentioning hot keys as the residual problem — and 'replicate to the next R nodes clockwise' — shows you know how Dynamo-style systems actually build on the ring.",
    },
  ],
  related: [
    "how-do-i-shard-data-by-user-tenant-region-or-something-else",
    "what-does-a-good-partition-key-look-like-in-a-distributed-st",
    "how-do-i-avoid-hot-partitions-and-skew",
    "how-do-i-design-id-generation-that-works-across-regions",
  ],
};
