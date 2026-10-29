export default {
  id: "rate-limiter",
  title: "Design a rate limiter",
  icon: "🚦",
  chapter: 4,
  group: "Core building blocks",
  summary: "A rate limiter caps how many requests a client can make in a window — protecting services from abuse, accidental floods, and cascading overload. The core choices: which algorithm, where to enforce it, and how to make it work consistently across many servers.",
  sections: [
    {
      title: "Why rate-limit",
      body: "Without limits, one misbehaving client (a bug, a scraper, a DDoS) can exhaust capacity for everyone. Rate limiting protects availability, enforces fairness across tenants, and controls cost (especially for expensive or third-party-backed endpoints).",
      bullets: [
        "Prevent resource starvation from abuse or runaway clients.",
        "Enforce per-user / per-tenant fairness and quotas.",
        "Shield fragile downstreams and cap cost.",
      ],
    },
    {
      title: "Where to enforce it",
      body: "Rate limiting can live at several layers; most real systems put it at the edge/gateway so bad traffic is rejected before it touches application servers.",
      table: {
        head: ["Location", "Pros", "Cons"],
        rows: [
          ["Client-side", "Cheap, instant feedback", "Trivially bypassed — never trust it alone"],
          ["API gateway / edge", "Central, blocks early, language-agnostic", "Less app-specific context"],
          ["Service / middleware", "Rich per-endpoint logic", "Load already reached your servers"],
        ],
      },
      body2: "A common design: coarse limits at the gateway, finer per-endpoint limits in the service.",
    },
    {
      title: "Algorithm: token bucket",
      body: "A bucket holds up to **N** tokens and refills at a steady rate (e.g. 10/sec). Each request consumes one token; if the bucket is empty, the request is rejected. The bucket size allows short **bursts** while the refill rate caps the sustained average.",
      rules: ["Two parameters: bucket size (burst) and refill rate (sustained rate).", "Simple, memory-efficient, allows bursts — the most popular choice."],
    },
    {
      title: "Algorithm: leaking bucket",
      body: "Requests enter a fixed-size FIFO queue and are processed (leak out) at a constant rate. It **smooths** traffic into a steady outflow, which is ideal when the downstream needs a stable rate — but it offers no burst allowance and can add latency as requests wait in the queue.",
    },
    {
      title: "Algorithms: fixed window, sliding log, sliding window counter",
      body: "Window-based approaches count requests per time window.",
      table: {
        head: ["Algorithm", "Idea", "Trade-off"],
        rows: [
          ["Fixed window counter", "Count per fixed interval (e.g. per minute)", "Cheap, but allows 2× burst at window edges"],
          ["Sliding window log", "Store a timestamp per request", "Perfectly accurate, but memory-heavy"],
          ["Sliding window counter", "Weighted blend of current + previous window", "Accurate enough, low memory — great default"],
        ],
      },
      body2: "The **fixed-window edge problem**: a client can send a full window's worth at 0:59 and again at 1:00 — 2× the intended rate in two seconds. Sliding approaches fix this.",
    },
    {
      title: "Distributed rate limiting",
      body: "With many app servers, a per-server in-memory counter lets a client exceed the global limit by hitting different servers. Keep the counter in a shared store (usually **Redis**) so all servers see one count.",
      bullets: [
        "Use Redis counters with atomic increments and TTLs, or a Lua script for check-and-decrement.",
        "Watch for **race conditions**: read-then-write without atomicity under-counts — use atomic ops.",
        "Trade latency for accuracy: a tiny bit of slack (local token caching) reduces Redis round-trips at the cost of occasional minor over-admission.",
      ],
    },
    {
      title: "What to return when limited",
      body: "Reject with HTTP **429 Too Many Requests**, and tell the client how to behave: a `Retry-After` header, plus rate-limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`). Good clients then back off instead of hammering you.",
      rules: ["429 + Retry-After + limit/remaining/reset headers = clients can self-regulate."],
      flow: ["Request", "Check counter (Redis)", "Under limit? serve : 429 + Retry-After"],
    },
  ],
  qa: [
    {
      q: "Compare token bucket and sliding window — which would you pick?",
      a: "Both cap a rate; they differ in burst behavior and accuracy:",
      bullets: [
        "**Token bucket:** allows controlled bursts (up to bucket size), refills at a steady rate, tiny memory. Great general-purpose default — it's what most APIs use.",
        "**Sliding window counter:** smooths the fixed-window edge problem with low memory by blending the current and previous window counts. Pick it when you need accurate per-window limits without the 2×-at-the-edge loophole.",
        "**Sliding window log** is the most accurate but stores a timestamp per request — too memory-heavy at scale.",
      ],
      tip: "Default to token bucket for its simplicity and burst handling; reach for sliding window counter when the fixed-window edge burst is unacceptable.",
    },
    {
      q: "How do you rate-limit across a fleet of servers?",
      a: "Move the counter out of per-server memory into a shared store, typically Redis, so every server enforces one global count. Use atomic operations (INCR with TTL, or a Lua script for atomic check-and-decrement) to avoid race conditions where two servers both read a stale count and both admit a request. If Redis round-trips become a latency concern, allow each server a small local token allowance and reconcile periodically — trading a little accuracy for speed.",
      tip: "The thing to call out is the race condition: naive read-modify-write under-counts. Atomicity (Lua/INCR) is the fix.",
    },
    {
      q: "What's the fixed-window edge problem?",
      a: "A fixed-window counter resets at interval boundaries. A client can send a full quota at the very end of one window (say 0:59) and another full quota at the start of the next (1:00), delivering up to 2× the intended rate across that boundary. Sliding window counter fixes it by weighting the previous window's count into the current one, so the limit holds across the boundary.",
      tip: "This is the classic 'gotcha' that shows you understand the algorithms' failure modes, not just their names.",
    },
    {
      q: "What should the API return when a client is rate-limited?",
      a: "HTTP 429 Too Many Requests, with a `Retry-After` header telling the client when to try again, plus `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` so well-behaved clients can self-throttle. Never silently drop — clients that don't know they're limited will retry aggressively and make it worse.",
      tip: "Pair this with exponential backoff + jitter on the client side; a 429 without client backoff just becomes a retry storm.",
    },
  ],
  related: [
    "how-do-i-design-rate-limiting-that-doesn-t-break-good-users",
    "how-do-i-design-tenant-level-rate-limits-and-quotas",
    "how-do-i-protect-downstream-services-from-traffic-spikes",
    "how-do-i-implement-retries-without-causing-storms-and-loops",
    "how-do-i-design-for-backpressure-in-a-high-traffic-system",
  ],
};
