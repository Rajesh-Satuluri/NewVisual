export default {
  id: "object-storage",
  title: "Design an S3-like object storage",
  icon: "🪣",
  chapter: 24,
  group: "Data & infra systems",
  summary: "Store arbitrary blobs (objects) in flat namespaces (buckets) with extreme durability and virtually unlimited scale. The key ideas: separate metadata from data, achieve 11-nines durability via replication or erasure coding, and expose a simple key→object API.",
  sections: [
    {
      title: "Requirements",
      body: "Put, get, and delete objects of any size, grouped into buckets, with very high durability, availability, and scale.",
      bullets: [
        "Simple API: PUT/GET/DELETE object by key within a bucket.",
        "Objects are immutable blobs from bytes to terabytes.",
        "Extreme durability (e.g. 99.999999999%) and high availability.",
        "Effectively unlimited capacity; pay for what you use.",
      ],
    },
    {
      title: "Buckets, keys, objects",
      body: "The namespace is flat: a **bucket** contains **objects**, each addressed by a **key** (the '/'-containing key just looks like a path; there are no real directories). An object is its data plus metadata (size, content-type, checksum, user metadata). This simplicity is what makes it scale — no directory tree to maintain.",
      rules: ["Flat namespace: bucket + key → object. 'Folders' are a UI illusion over key prefixes."],
    },
    {
      title: "Separate metadata from data",
      body: "Two services. A **metadata service** maps bucket+key → where the object's bytes live (which storage nodes/shards, size, checksum, version) — a database optimized for fast key lookups and sharded by bucket/key. A **data service** stores the actual bytes across many storage nodes. Reads/writes consult metadata, then stream bytes to/from the data nodes.",
      flow: ["PUT bucket/key", "Metadata: record location + checksum", "Data: write bytes to storage nodes", "GET: metadata lookup → stream bytes"],
    },
    {
      title: "Durability: replication vs erasure coding",
      body: "To never lose data, store redundant copies across failure domains (disks, racks, availability zones).",
      table: {
        head: ["", "Replication", "Erasure coding"],
        rows: [
          ["Idea", "Keep N full copies (e.g. 3×)", "Split into k data + m parity fragments"],
          ["Storage overhead", "High (200% for 3×)", "Low (e.g. 50% for 10+4)"],
          ["Recovery", "Simple — copy a replica", "Reconstruct from any k of k+m fragments"],
          ["Best for", "Hot/small objects, low latency", "Cold/large objects, cost efficiency"],
        ],
      },
      body2: "Erasure coding gives the same or better durability as 3× replication at far less storage cost, at the price of more CPU and complexity on recovery — so large/cold data uses erasure coding, hot data often uses replication.",
    },
    {
      title: "Writes, integrity & versioning",
      body: "Objects are **immutable** — updating means writing a new version, which makes caching and replication simpler and enables versioning. Store a **checksum** per object (and per fragment) to detect corruption, and run background **scrubbing** to find and repair bit-rot by comparing checksums and rebuilding from replicas/parity. For very large uploads, support multipart upload (upload parts in parallel, then assemble).",
      bullets: [
        "Immutable objects + versioning; delete is a marker, not an in-place edit.",
        "Per-object/-fragment checksums; background scrub repairs corruption.",
        "Multipart upload for huge objects.",
      ],
    },
    {
      title: "Scale & consistency",
      body: "Metadata is sharded across many nodes by key; data is spread across a huge fleet. Modern object stores offer **strong read-after-write consistency** for new objects (a GET right after a PUT returns the data). Serve hot objects via CDN. Background processes handle rebalancing, re-replication after node loss, and lifecycle transitions (hot → cold tiers).",
    },
  ],
  qa: [
    {
      q: "How do you achieve eleven nines of durability?",
      a: "Store redundant data across independent failure domains (different disks, racks, and availability zones) so no single failure — or even several — loses an object. Two mechanisms: replication (keep N full copies, e.g. 3×) or erasure coding (split an object into k data + m parity fragments, reconstructable from any k of the k+m). Add per-object/fragment checksums and background scrubbing to detect and repair silent corruption (bit-rot), and automatic re-replication/reconstruction when a node or disk dies. Durability comes from redundancy across failure domains plus continuous verification and repair.",
      tip: "Redundancy across failure domains + checksums/scrubbing + auto-repair is the full durability story — not just 'keep 3 copies'.",
    },
    {
      q: "Replication vs erasure coding — when do you use each?",
      a: "Replication keeps N full copies: simple, fast recovery and low read latency, but high storage overhead (3× = 200% extra). Erasure coding splits data into k data + m parity fragments reconstructable from any k, giving equal-or-better durability at much lower overhead (e.g. 10+4 ≈ 40% extra) but costing CPU and more complex, slower recovery. Use replication for hot, small, latency-sensitive objects and erasure coding for large, cold, cost-sensitive data. Many systems tier: replicate hot, erasure-code cold.",
      tip: "Low overhead + more CPU (erasure) vs simple + high overhead (replication); map to cold-large vs hot-small.",
    },
    {
      q: "Why separate metadata from object data?",
      a: "They have opposite access patterns. Metadata (bucket+key → location, size, checksum, version) is small, structured, and hit on every request for fast key lookups — a sharded database job. Object bytes are large immutable blobs needing cheap, durable, high-throughput storage across a big fleet. Splitting them lets the metadata layer scale for lookups and the data layer scale for capacity/throughput independently, and keeps the key→location indirection flexible (you can move/rebalance bytes without changing keys).",
      tip: "Same metadata/blob split as Drive/email/YouTube — the indirection also enables transparent rebalancing.",
    },
    {
      q: "Why are objects immutable, and how does that help?",
      a: "Treating objects as immutable (an update writes a new version rather than editing in place) massively simplifies the system: replicas and caches never go stale mid-object, there's no read-modify-write race across copies, versioning falls out naturally, and corruption is detectable because an object's bytes and checksum never change after write. Deletes become markers. The cost is that 'modifying' rewrites the object, which is fine for the blob workloads object storage targets.",
      tip: "Immutability → simpler replication/caching + free versioning + easy integrity checking. That's why S3-likes are append/replace only.",
    },
  ],
  related: [
    "how-do-i-make-rebuild-from-scratch-possible-if-everything-is",
    "how-do-i-decide-between-sql-nosql-and-search-engines",
    "where-should-i-cache-client-edge-service-db-layer",
    "how-do-i-design-soft-delete-archival-and-retention",
    "when-do-i-accept-eventual-consistency-vs-strict-consistency",
  ],
};
