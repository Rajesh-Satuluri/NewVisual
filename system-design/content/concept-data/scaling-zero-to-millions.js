export default {
  id: "scaling-zero-to-millions",
  title: "Scaling from zero to millions of users",
  icon: "📈",
  chapter: 1,
  group: "Foundations",
  summary: "A single server is fine for the first users. Growth forces a predictable sequence of moves: separate the database, add a load balancer and replicas, cache, push static assets to a CDN, make the web tier stateless, go multi-data-center, then shard. Each step removes the next bottleneck.",
  widget: "cache-strategy",
  widgetIntro: "One of the biggest scaling levers is a **cache** in front of the database — but *how* you keep it consistent with the database changes the failure modes. **Write-through** writes cache and DB together (simple, always consistent, slower writes). **Write-back** writes the cache and flushes to the DB later (fast, but a crash can lose data). **Write-around** writes only the DB and lets the cache fill on reads (avoids cache churn, but the first read is a miss).\n\nRun a write under each strategy and watch where the data lands and when — the trade-off between write latency, consistency, and durability that every scaling story eventually confronts.",
  sections: [
    {
      title: "Start: everything on one server",
      body: "The simplest setup is one box running the web server, application code, and database together. A user's browser resolves your domain via DNS, gets an IP, and sends HTTP requests the server answers directly. This is perfectly fine for a prototype or the first handful of users.",
      body2: "It breaks the moment traffic or data outgrows that one machine — and it has no redundancy, so the box going down means the whole product is down.",
    },
    {
      title: "Separate the database from the web tier",
      body: "The first split: move the database onto its own server. Now the web/app tier and the data tier can be sized, scaled, and reasoned about independently. You can add more web servers without touching the database, and vice-versa.",
      rules: [
        "Web tier: stateless request handling — scale it horizontally",
        "Data tier: stateful storage — scale it carefully",
      ],
    },
    {
      title: "Vertical vs horizontal scaling",
      body: "**Vertical scaling** (scale up) means a bigger machine — more CPU, RAM, disk. Simple, but it has a hard ceiling and no failover: when that one powerful box dies, you are down.",
      body2: "**Horizontal scaling** (scale out) means more machines behind a load balancer. It is the basis of every large system because it has no single ceiling and tolerates individual failures.",
      table: {
        head: ["", "Vertical (scale up)", "Horizontal (scale out)"],
        rows: [
          ["How", "Bigger single machine", "More machines"],
          ["Ceiling", "Hard hardware limit", "Effectively none"],
          ["Failover", "None — single point of failure", "Survives node loss"],
          ["Complexity", "Low", "Higher (LB, state, consistency)"],
        ],
      },
    },
    {
      title: "Add a load balancer",
      body: "Put a load balancer in front of multiple web servers. Clients talk only to the load balancer's public IP; it spreads requests across a pool of servers on a private network. This gives you both horizontal scale and high availability — if one web server fails, traffic shifts to the others.",
      flow: ["Client", "Load balancer", "Web server 1 / 2 / N"],
    },
    {
      title: "Replicate the database",
      body: "A common pattern is one **primary** (handles writes) with several **read replicas** (handle reads). Most applications read far more than they write, so replicas absorb the bulk of the load and add redundancy.",
      bullets: [
        "Writes go to the primary; reads are spread across replicas.",
        "If a replica dies, reads shift to the others.",
        "If the primary dies, a replica is promoted to primary.",
        "Trade-off: replication is asynchronous, so a replica can briefly serve slightly stale data (replication lag).",
      ],
    },
    {
      title: "Cache the hot reads",
      body: "A cache (e.g. Redis/Memcached) stores the results of expensive or frequent reads in memory. The app checks the cache first; on a miss it reads the database and populates the cache (cache-aside). This cuts database load and latency dramatically for read-heavy workloads.",
      body2: "Watch for: stale data (set a TTL), and cache failure modes (stampedes when a hot key expires).",
    },
    {
      title: "Serve static content from a CDN",
      body: "A CDN is a network of edge servers that cache static assets (images, JS, CSS, video) close to users geographically. The browser fetches static files from the nearest edge instead of your origin, cutting latency and offloading huge amounts of traffic from your servers.",
    },
    {
      title: "Make the web tier stateless",
      body: "If a web server stores session state locally, a user's requests must always return to that same server (sticky sessions) — which breaks clean load balancing and failover. Instead, move state out of the web tier into a shared store (Redis, a database). Now any server can handle any request, and you can add or remove web servers freely.",
      rules: ["Stateless web tier = any server handles any request = free horizontal scale"],
    },
    {
      title: "Go multi-data-center",
      body: "For global users and disaster resilience, run in multiple data centers / regions. Users are routed (via geo-DNS) to the nearest healthy region; if a region fails, traffic fails over to another. The hard part is data: you must replicate across regions and decide how to handle consistency and conflicts.",
    },
    {
      title: "Decouple with message queues, then shard",
      body: "A **message queue** lets producers hand off work (emails, image processing, analytics) to be consumed asynchronously, so the web tier stays fast and components scale independently.",
      body2: "Finally, when a single database can no longer hold the data or the write load, **shard** it: split data horizontally across many databases by a shard key (e.g. user_id). This is the most complex step — it complicates joins, re-sharding, and hot keys — so it comes last.",
      flow: ["Web tier", "Message queue", "Workers", "Sharded DB"],
    },
  ],
  qa: [
    {
      q: "Walk me through how you'd scale a web app from one user to millions.",
      a: "Hit the bottlenecks in order, adding complexity only when evidence demands it:",
      bullets: [
        "**Separate** the database from the web server so each scales independently.",
        "**Load balancer** + multiple stateless web servers → horizontal scale and failover.",
        "**Read replicas** to absorb read-heavy traffic and add DB redundancy.",
        "**Cache** hot reads (cache-aside) to cut DB load and latency.",
        "**CDN** for static assets, served from the edge near users.",
        "**Message queues** to decouple slow/async work from the request path.",
        "**Multiple data centers** for geo-latency and disaster recovery.",
        "**Shard** the database last, when one node can't hold the data or writes.",
      ],
      tip: "Interviewers love that you add each piece in response to a specific bottleneck, not all at once. Naming the trade-off each step introduces (replication lag, cache staleness, sharding complexity) is what signals seniority.",
    },
    {
      q: "Vertical or horizontal scaling — which and why?",
      a: "Vertical (a bigger box) is simplest and great early on, but it has a hard hardware ceiling and is a single point of failure. Horizontal (more boxes behind a load balancer) has no real ceiling and tolerates node failures, which is why every large system is built on it. The cost is complexity: you now need a load balancer, a stateless tier, and a story for shared state and data consistency.",
      tip: "Real answer in practice: scale vertically until it hurts (it's cheap and simple), then scale horizontally. They're not mutually exclusive.",
    },
    {
      q: "Why must the web tier be stateless to scale well?",
      a: "If each web server keeps session state in its own memory, requests from a user must keep going back to that exact server (sticky sessions). That undermines load balancing and means a server crash loses that user's session. Moving state to a shared store (Redis/DB) makes every server interchangeable, so the load balancer can route freely and you can add/remove servers at will.",
      tip: "\"Push state out of the web tier\" is the one-line principle. It's what makes autoscaling and zero-downtime deploys possible.",
    },
    {
      q: "What's the trade-off of using read replicas?",
      a: "Replicas scale reads and add redundancy, but replication is typically asynchronous — a replica can lag the primary by milliseconds to seconds. A user who writes and immediately reads from a replica may not see their own change (the \"read-your-own-writes\" problem). Mitigations: route a user's reads to the primary for a short window after they write, or read from the primary for that specific flow.",
      tip: "Knowing replication lag exists — and naming read-your-own-writes as the concrete symptom — is a strong signal.",
    },
  ],
  related: [
    "what-are-the-trade-offs-between-vertical-and-horizontal-scal",
    "how-do-i-design-a-service-that-can-handle-10x-more-traffic-w",
    "how-does-a-request-flow-end-to-end-through-a-production-syst",
    "how-do-i-decide-when-to-split-a-monolith-into-services",
    "how-do-i-handle-read-your-own-writes-in-a-distributed-system",
  ],
};
