export default {
  id: "rate-limiter",
  title: "Design a rate limiter",
  icon: "🚦",
  chapter: 4,
  group: "Core building blocks",
  summary: "A rate limiter caps how many requests a client can make in a window — protecting services from abuse, accidental floods, and cascading overload. The core choices: which algorithm, where to enforce it, and how to make it work consistently across many servers.",
  widget: "token-bucket",
  widgetIntro: "The **token bucket** is the algorithm most production rate limiters use, because it absorbs short bursts while still capping the sustained rate. Tokens drip into a bucket at a fixed **refill rate** up to a **capacity**; every request spends one token, and a request that finds the bucket empty is rejected with **HTTP 429**.\n\nStart on **Steady** traffic and watch almost everything pass. Switch to **Spike** and the bucket drains faster than it refills — excess requests start bouncing red. That is exactly the property you want: a burst up to the bucket size is allowed through, but no client can exceed the refill rate for long.",
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
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "A concrete walk-through: a public API takes a 10× traffic surge from one abusive client. Watch exactly how a token-bucket limiter at the edge absorbs it — and how you'd build the same thing correctly across a fleet.",
  deepDive: [
    {
      title: "The numbers at a glance",
      body: "A single tenant is allowed **100 requests/second** with a burst capacity of **200**. During the incident one client tries to push **1,000 req/s**.",
      stats: [
        { value: "100/s", label: "Sustained limit (refill rate)", tone: "accent" },
        { value: "200", label: "Burst capacity (bucket size)", tone: "blue" },
        { value: "1,000/s", label: "Attempted by abuser", tone: "red" },
        { value: "900/s", label: "Rejected with 429", tone: "green" },
      ],
    },
    {
      title: "How a token bucket decides",
      body: "The bucket refills at the sustained rate and holds at most *capacity* tokens. Every request spends one token; an empty bucket means an instant **429** — the request never reaches your servers.",
      svg: `<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Token bucket flow diagram" style="font-family:system-ui">
        <!-- refill -->
        <text x="90" y="30" text-anchor="middle" fill="#4F46E5" font-size="12" font-weight="700">refill 100 tokens/s</text>
        <path d="M90 38 L90 70" stroke="#4F46E5" stroke-width="2" marker-end="url(#rlArrow)"/>
        <!-- bucket -->
        <rect x="40" y="72" width="100" height="96" rx="10" fill="none" stroke="#4F46E5" stroke-width="2"/>
        <text x="90" y="100" text-anchor="middle" fill="currentColor" font-size="11" font-weight="700">Bucket</text>
        <text x="90" y="118" text-anchor="middle" fill="currentColor" font-size="10" opacity="0.7">cap 200</text>
        <circle cx="68" cy="140" r="7" fill="#4F46E5"/><circle cx="90" cy="140" r="7" fill="#4F46E5"/><circle cx="112" cy="140" r="7" fill="#4F46E5"/>
        <circle cx="79" cy="156" r="7" fill="#4F46E5" opacity="0.5"/><circle cx="101" cy="156" r="7" fill="#4F46E5" opacity="0.5"/>
        <!-- incoming -->
        <rect x="230" y="96" width="120" height="48" rx="8" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.8"/>
        <text x="290" y="117" text-anchor="middle" fill="currentColor" font-size="11" font-weight="700">Incoming</text>
        <text x="290" y="133" text-anchor="middle" fill="currentColor" font-size="10" opacity="0.7">1,000 req/s</text>
        <path d="M230 120 L148 120" stroke="currentColor" stroke-width="2" opacity="0.6" marker-end="url(#rlArrowN)"/>
        <text x="190" y="112" text-anchor="middle" fill="currentColor" font-size="9" opacity="0.6">take 1</text>
        <!-- decision -->
        <path d="M350 112 L430 86" stroke="#10B981" stroke-width="2" marker-end="url(#rlArrowG)"/>
        <path d="M350 128 L430 168" stroke="#EF4444" stroke-width="2" marker-end="url(#rlArrowR)"/>
        <rect x="432" y="64" width="176" height="44" rx="8" fill="none" stroke="#10B981" stroke-width="1.5"/>
        <text x="520" y="82" text-anchor="middle" fill="#10B981" font-size="11" font-weight="700">Token available → 200 served</text>
        <text x="520" y="98" text-anchor="middle" fill="currentColor" font-size="10" opacity="0.7">forwarded to the service</text>
        <rect x="432" y="148" width="176" height="44" rx="8" fill="none" stroke="#EF4444" stroke-width="1.5"/>
        <text x="520" y="166" text-anchor="middle" fill="#EF4444" font-size="11" font-weight="700">Empty → 800 get 429</text>
        <text x="520" y="182" text-anchor="middle" fill="currentColor" font-size="10" opacity="0.7">rejected at the edge</text>
        <defs>
          <marker id="rlArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#4F46E5"/></marker>
          <marker id="rlArrowN" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="currentColor"/></marker>
          <marker id="rlArrowG" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#10B981"/></marker>
          <marker id="rlArrowR" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#EF4444"/></marker>
        </defs>
      </svg>`,
      caption: "One empty-bucket check is O(1) and happens before any application work — the surge is absorbed at the gateway.",
    },
    {
      title: "The surge, second by second",
      timeline: [
        { t: "t+0.0s", icon: "🌊", tone: "warn", title: "Surge begins", detail: "The abuser jumps from 50 req/s to 1,000 req/s. The bucket has ~200 tokens banked from being under-used." },
        { t: "t+0.2s", icon: "⚡", tone: "accent", title: "Burst absorbed", detail: "The first ~200 requests each find a token and are served — this is the burst allowance doing its job. The bucket drains to empty." },
        { t: "t+0.3s", icon: "⛔", tone: "bad", title: "429s kick in", detail: "With the bucket empty and refill at only 100/s, ~900 of every 1,000 requests get an instant 429 + Retry-After. Your service never sees them." },
        { t: "t+1.0s", icon: "🛡️", tone: "good", title: "Steady state", detail: "The service receives a flat 100 req/s from this tenant — exactly the limit. Other tenants are unaffected; their buckets are independent." },
        { t: "t+5.0s", icon: "✅", tone: "good", title: "Client backs off", detail: "A well-behaved client reads Retry-After and slows down. CPU on the service stays flat the entire time — no cascading overload." },
      ],
    },
    {
      title: "Where you enforce it changes everything",
      compare: {
        title: "Same limit, two placements",
        cols: [
          { title: "At the edge / gateway", tone: "good", body: "Reject before the request touches an app server.", points: [
            "Bad traffic costs ~one Redis op, not a DB query.",
            "One place to configure, language-agnostic.",
            "Protects every downstream at once.",
          ] },
          { title: "Only inside the service", tone: "bad", body: "The request already consumed a connection and app CPU.", points: [
            "The surge still lands on your servers.",
            "Each service must re-implement the logic.",
            "A shared downstream can still be overwhelmed.",
          ] },
        ],
      },
    },
    {
      title: "Building it correctly across a fleet",
      body: "Per-server memory counters let a client beat the global limit by spreading requests across servers. The fix is one shared, atomic counter — here's the shape of it:",
      steps: [
        { title: "Key per tenant + window", detail: "Use a Redis key like `rl:{tenant}` holding the current token count and a last-refill timestamp." },
        { title: "Atomic check-and-decrement", detail: "Run a Lua script that refills based on elapsed time, then decrements if ≥1 token — all in one atomic round-trip, so two servers can't both admit on a stale read." },
        { title: "Return the decision + headers", detail: "On success, serve and send `X-RateLimit-Remaining`; on failure, return 429 with `Retry-After` computed from the refill rate." },
        { title: "Shed Redis latency where it hurts", detail: "For ultra-hot paths, give each server a small local token lease and reconcile — trading a sliver of accuracy for fewer round-trips." },
      ],
      callouts: [
        { tone: "key", label: "The race to name:", body: "A naive read-modify-write under-counts under concurrency — two servers read `5`, both admit, both write `4`. Atomicity (Lua or `INCR`) is the fix, and interviewers listen for it." },
        { tone: "tip", label: "Pair with the client:", body: "A 429 without client-side exponential backoff + jitter just becomes a retry storm. The limiter and the client's backoff are two halves of one contract." },
      ],
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
