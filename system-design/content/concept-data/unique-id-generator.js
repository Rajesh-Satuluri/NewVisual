export default {
  id: "unique-id-generator",
  title: "Unique ID generator in distributed systems",
  icon: "🆔",
  chapter: 7,
  group: "Core building blocks",
  summary: "Generate unique IDs across many machines without a central bottleneck — ideally IDs that are also roughly time-sortable and compact. The go-to answer is a Snowflake-style 64-bit ID built from timestamp + machine + sequence bits.",
  widget: "snowflake",
  widgetIntro: "A **Snowflake** ID packs three fields into one 64-bit integer: a **41-bit timestamp**, a **10-bit machine id**, and a **12-bit sequence**. No coordination is needed — the timestamp makes IDs roughly time-sortable, the machine bits keep two servers from ever colliding, and the sequence disambiguates up to 4096 IDs minted on one machine in the same millisecond.\n\nGenerate IDs and watch the bit fields fill. Hit **burst** to mint several within one millisecond and see the sequence counter increment to keep them unique — the mechanism that replaces a central auto-increment bottleneck.",
  sections: [
    {
      title: "Requirements",
      body: "What makes ID generation hard at scale is doing it fast, everywhere, at once, without collisions.",
      bullets: [
        "**Unique** across all nodes — no collisions, ever.",
        "**Scalable** — thousands of IDs per second per node, no central lock.",
        "**Roughly time-ordered** (sortable) — great for database indexing and pagination.",
        "**Compact** — ideally a 64-bit integer, not a bulky string.",
      ],
    },
    {
      title: "Option 1 — Database auto-increment",
      body: "A single database's auto-increment column gives unique, ordered IDs — but it's a single point of failure and a write bottleneck. Multi-master with different increment steps (server A: 1,3,5…; B: 2,4,6…) scales a little but is brittle, hard to add nodes to, and loses clean ordering.",
      rules: ["Simple and ordered, but a central bottleneck / SPOF. Doesn't scale horizontally."],
    },
    {
      title: "Option 2 — UUID",
      body: "Each node generates a 128-bit UUID independently — no coordination, effectively zero collision chance. The downsides: 128 bits is large, and random UUIDs (v4) are **not time-sortable**, which hurts database index locality (random inserts scatter across the B-tree). Good when you just need uniqueness with no coordination and don't care about ordering.",
      rules: ["No coordination, but 128-bit and unsortable → poor index locality."],
    },
    {
      title: "Option 3 — Ticket server",
      body: "A dedicated service (e.g. Flickr's approach) hands out IDs from a central auto-increment. Centralizes ordering and is simple, but reintroduces a single point of failure and a network hop per ID (mitigated by handing out ID ranges in batches).",
    },
    {
      title: "Option 4 — Snowflake (the usual answer)",
      body: "Twitter's Snowflake packs a 64-bit ID from several fields so each node generates sortable, unique IDs locally with no coordination:",
      table: {
        head: ["Bits", "Field", "Purpose"],
        rows: [
          ["1", "Sign bit", "Always 0 (keep it positive)"],
          ["41", "Timestamp (ms)", "Milliseconds since a custom epoch — gives ordering, ~69 years of range"],
          ["10", "Machine ID", "Up to 1024 nodes/workers"],
          ["12", "Sequence", "Per-ms counter → 4096 IDs per node per ms"],
        ],
      },
      body2: "Because the high bits are the timestamp, IDs sort by creation time. Each node just needs a unique machine ID and a per-millisecond counter — no lock, no central server.",
      flow: ["timestamp (41b)", "machine id (10b)", "sequence (12b)", "= 64-bit sortable ID"],
    },
    {
      title: "Snowflake's edge cases",
      body: "The design has two classic pitfalls to mention.",
      bullets: [
        "**Clock skew / backward jumps:** if a node's clock moves backward (NTP correction), it could reissue timestamps. Handle by refusing to go backward — wait until the clock catches up, or borrow from the sequence.",
        "**Machine ID assignment:** each node needs a unique 10-bit ID. Assign via config, ZooKeeper/etcd, or a startup registry — two nodes with the same ID will collide.",
        "**Sequence overflow:** more than 4096 IDs in one millisecond on one node → wait for the next millisecond.",
      ],
    },
  ],
  qa: [
    {
      q: "Walk me through a Snowflake-style 64-bit ID.",
      a: "Pack four fields into 64 bits: 1 sign bit (0), 41 timestamp bits (ms since a custom epoch), 10 machine-ID bits, and 12 sequence bits.",
      bullets: [
        "The timestamp occupies the high bits, so IDs are **roughly sortable by time** — great for indexing and cursor pagination.",
        "41 timestamp bits ≈ 69 years of milliseconds.",
        "10 machine bits = up to 1024 nodes; 12 sequence bits = 4096 IDs per node per millisecond.",
        "No coordination at generation time: each node needs only a unique machine ID and a local per-ms counter.",
      ],
      tip: "Being able to state the bit layout and what each field buys you (ordering, node count, per-ms throughput) is exactly what this question tests.",
    },
    {
      q: "Why might you avoid plain UUIDs for database primary keys?",
      a: "Random UUIDv4s are unique without coordination, but they're 128 bits (double a 64-bit int) and have no time ordering. Inserting randomly-ordered keys into a B-tree index scatters writes across the whole index, hurting cache locality and causing page splits — bad for write-heavy tables. Snowflake IDs (or UUIDv7, which is time-ordered) keep inserts appending near the end of the index.",
      tip: "Mentioning UUIDv7 / ULID as the 'time-sortable UUID' modern alternative is a nice signal.",
    },
    {
      q: "What breaks Snowflake, and how do you handle it?",
      a: "Mainly clock issues and ID assignment.",
      bullets: [
        "**Clock moving backward** (NTP correction): never emit an ID with a timestamp earlier than the last one — wait for the clock to catch up, or track the last timestamp and reject/pause.",
        "**Duplicate machine IDs:** collisions if two nodes share one. Assign uniquely via ZooKeeper/etcd or a config registry at startup.",
        "**Sequence exhaustion** (>4096 IDs in a single ms on one node): spin until the next millisecond.",
      ],
      tip: "Clock skew is the answer interviewers are fishing for — it's the subtle failure that makes 'just use the timestamp' not quite enough.",
    },
    {
      q: "When is a simple approach (DB auto-increment or a ticket server) actually fine?",
      a: "When throughput is modest and you value simplicity and strict ordering over horizontal scale. A single DB sequence or a ticket server (handing out batched ranges) is easy to reason about and gives perfect ordering. You only need Snowflake/UUID when a central allocator becomes a bottleneck or single point of failure — don't reach for distributed ID generation before you need it.",
      tip: "Showing you won't over-engineer — 'auto-increment is fine until it isn't' — is as valuable as knowing Snowflake.",
    },
  ],
  related: [
    "how-do-i-design-id-generation-that-works-across-regions",
    "how-do-i-handle-ordering-of-events-when-it-matters",
    "how-do-i-design-pagination-for-massive-datasets-efficiently",
    "how-should-i-index-for-read-heavy-vs-write-heavy-workloads",
  ],
};
