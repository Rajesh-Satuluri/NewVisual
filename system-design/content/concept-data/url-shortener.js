export default {
  id: "url-shortener",
  title: "Design a URL shortener",
  icon: "🔗",
  chapter: 8,
  group: "Classic designs",
  summary: "Turn a long URL into a short one (bit.ly style) and redirect. A deceptively deep problem that covers ID generation, base-62 encoding, a read-heavy workload, caching, and the redirect itself.",
  sections: [
    {
      title: "Requirements & scale",
      body: "Two operations: create a short URL, and redirect a short URL to the original. The defining characteristic is that it's **extremely read-heavy** — reads (redirects) outnumber writes (shortenings) by ~100:1 or more.",
      bullets: [
        "`POST /shorten` → create and return a short URL.",
        "`GET /{shortcode}` → 301/302 redirect to the long URL.",
        "Short, unique codes; low-latency redirects; very high read volume.",
      ],
      body2: "Quick math: 100M new URLs/day ≈ ~1,160 writes/sec; with 100:1 reads that's ~116K redirects/sec — so caching and read scaling dominate the design.",
    },
    {
      title: "How long is the short code?",
      body: "Short codes use **base-62** characters (a–z, A–Z, 0–9). The code length sets the address space:",
      table: {
        head: ["Length", "Combinations (62^n)", "Rough capacity"],
        rows: [
          ["6", "62⁶ ≈ 56.8 billion", "Enough for years at 100M/day"],
          ["7", "62⁷ ≈ 3.5 trillion", "Comfortable long-term headroom"],
        ],
      },
      body2: "Seven characters is a safe default. The question becomes: how do you turn a URL into one of these codes?",
    },
    {
      title: "Approach A — hash the URL",
      body: "Hash the long URL (e.g. MD5/SHA) and take the first few base-62 characters. Simple, and identical URLs naturally collapse to the same code. The catch: **collisions** — two different URLs can map to the same prefix. You must check for a collision on write and, if found, rehash (append a salt and retry) until the code is free.",
      rules: ["Hash + take prefix. Must detect collisions and retry on write."],
    },
    {
      title: "Approach B — counter + base-62 encode (preferred)",
      body: "Keep a global counter; each new URL gets the next integer, which you **base-62 encode** into the short code. Collision-free by construction and produces short codes. The problem is the counter being a central bottleneck — solve it with a distributed ID generator (Snowflake) or by handing each app server a pre-allocated **range** of IDs to use locally.",
      bullets: [
        "Counter → base-62 encode → short code. No collisions.",
        "Distribute the counter with Snowflake, or allocate ID ranges per server.",
        "Downside: sequential codes are guessable/enumerable — add randomness if that matters.",
      ],
      flow: ["next id (counter)", "base-62 encode", "short code", "store code → long URL"],
    },
    {
      title: "Storage & the read path",
      body: "The mapping (`short_code → long_url`, plus owner, created_at, expiry, click count) is a simple KV/table keyed by short_code — easily sharded by code since lookups are single-key. The workload is read-heavy, so put a **cache** (Redis) in front: the vast majority of redirects are served from cache, and the database handles writes and cache misses.",
      flow: ["GET /{code}", "check cache", "hit → redirect : miss → DB → fill cache → redirect"],
    },
    {
      title: "The redirect: 301 vs 302",
      body: "On lookup, return an HTTP redirect to the long URL. **301 (permanent)** lets browsers and intermediaries cache the redirect — fewer hits to your service, but you lose per-click analytics because repeat clicks skip your server. **302 (temporary / found)** is not cached, so every click reaches you — better for analytics and for the ability to change the target, at the cost of more traffic.",
      rules: ["301 = cacheable, less load, no repeat-click analytics.", "302 = every click hits you → analytics + changeable target."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "A URL shortener looks trivial, but it's a clinic in read-heavy design and ID encoding. Here's the sizing, the redirect hot path, and the counter-vs-hash decision that interviewers actually probe.",
  deepDive: [
    {
      title: "Size it first",
      body: "Say 100M new URLs/month and a 100:1 read:write ratio. The numbers drive every choice that follows.",
      stats: [
        { value: "~40/s", label: "writes (100M ÷ month)", tone: "blue" },
        { value: "~4,000/s", label: "reads (redirects) at 100:1", tone: "accent" },
        { value: "7 chars", label: "base62 → 62⁷ ≈ 3.5 trillion keys", tone: "green" },
        { value: "100:1", label: "read:write → cache + replicas", tone: "amber" },
      ],
    },
    {
      title: "The redirect is the hot path",
      body: "Reads outnumber writes 100:1, and each read is a single lookup: short code → long URL → redirect. This path must be fast and cheap, so it lives almost entirely in cache.",
      steps: [
        { title: "Request hits `GET /abc1234`", detail: "Served at the edge / app tier, not the database tier." },
        { title: "Look up the code in cache (Redis)", detail: "~95%+ hit ratio — popular links dominate, exactly the Pareto a cache loves." },
        { title: "On a miss, read the DB and backfill the cache", detail: "A key-value or indexed lookup on the short code; then populate Redis so the next read is a hit." },
        { title: "Return 301/302 with the long URL", detail: "The browser follows the redirect; your service is done in one round trip." },
      ],
      callout: { tone: "key", label: "301 vs 302:", body: "A 301 (permanent) lets browsers and proxies cache the redirect — fewer hits reach you, but you lose per-click analytics and can never repoint the link. A 302 (temporary) keeps every click flowing through you (good for analytics, editable links) at higher load. Name the trade-off; it's a classic follow-up." },
    },
    {
      title: "Generating the short code: two camps",
      compare: {
        title: "How do you turn a URL into `abc1234`?",
        cols: [
          { title: "Hash the URL (e.g. MD5 → base62, take 7 chars)", tone: "bad", body: "Deterministic and stateless, but…", points: [
            "Truncating a hash creates collisions you must detect and resolve (rehash / append) — extra reads on the write path.",
            "Same URL → same code can be a feature or a privacy leak.",
          ] },
          { title: "Counter + base62 encode", tone: "good", body: "Encode a globally unique incrementing id.", points: [
            "No collisions by construction — every id is unique.",
            "Shortest possible codes; grows only as needed.",
            "Needs a distributed counter (ranges/Snowflake) so it's not a single bottleneck.",
          ] },
        ],
      },
    },
    {
      title: "Why a plain auto-increment won't do",
      body: "A single database `AUTO_INCREMENT` is a coordination bottleneck and a single point of failure, and it leaks how many URLs exist. Instead, hand each app server a **range** of ids to encode (e.g. a counter service doling out blocks of 1,000), or use **Snowflake-style** ids. Each server then base62-encodes locally with zero per-request coordination.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Reads are 100:1, so I optimize the redirect with cache + replicas; writes just need collision-free short codes, so I encode a distributed counter in base62 rather than hashing.\" That connects the sizing to both design choices." },
    },
  ],
  qa: [
    {
      q: "How do you generate the short code — hashing or a counter?",
      a: "Two main approaches with a clear trade-off:",
      bullets: [
        "**Hash + prefix:** hash the URL, take the first N base-62 chars. Simple and dedups identical URLs, but collisions are possible — you must check and rehash on write.",
        "**Counter + base-62 (usually preferred):** assign the next integer and encode it in base-62. Collision-free and compact; the only issue is the central counter, solved with Snowflake IDs or per-server ID ranges.",
        "Sequential codes are enumerable; if guessability is a concern, mix in randomness or use a non-sequential ID scheme.",
      ],
      tip: "Lead with base-62 encoding of a distributed counter, and name the counter bottleneck + its fix (ranges / Snowflake) — that's the senior answer.",
    },
    {
      q: "How long should the short code be?",
      a: "Pick the length from the required address space using base-62. 62⁶ ≈ 57 billion and 62⁷ ≈ 3.5 trillion. At, say, 100M new URLs/day, six characters lasts years and seven gives comfortable long-term headroom. Seven base-62 characters is a safe default.",
      tip: "Showing the 62^n arithmetic tied to the write rate is exactly the back-of-envelope reasoning they want here.",
    },
    {
      q: "How do you make redirects fast under a read-heavy load?",
      a: "The workload is ~100:1 reads:writes, so optimize the read path. Front the code→URL lookup with a cache (Redis) — most redirects hit cache and never touch the database. The mapping is a single-key lookup, so it shards cleanly by short_code. Optionally use a 301 for high-traffic links so browsers cache the redirect and skip your service entirely (trading away repeat-click analytics).",
      tip: "Caching + single-key sharding + the 301/302 analytics trade-off is the complete read-path answer.",
    },
    {
      q: "301 vs 302 for the redirect — which and why?",
      a: "301 (permanent) is cached by browsers and proxies, which cuts load but means repeat clicks never reach you — so you lose analytics and can't change the destination later. 302 (temporary) isn't cached, so every click hits your service: more load, but you get full click analytics and can repoint the link. Choose based on whether analytics/changeability (302) or minimizing load (301) matters more.",
      tip: "The analytics implication is the real discriminator — many candidates miss that 301 silently kills repeat-click tracking.",
    },
  ],
  related: [
    "how-do-i-design-id-generation-that-works-across-regions",
    "where-should-i-cache-client-edge-service-db-layer",
    "how-do-i-design-a-service-that-can-handle-10x-more-traffic-w",
    "how-do-i-design-soft-delete-archival-and-retention",
  ],
};
