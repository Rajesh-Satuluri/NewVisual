// ── Concept registry (Concepts layer) ───────────────────────────────────────
// 28 system-design concepts (foundations → building blocks → product designs),
// each a data-only module under content/concept-data/<id>.js rendered by the
// generic concept renderer (tabs: Concept · Interview Q&A · Related questions).
//
// `built: true` means the data file exists and has a loader below. Unbuilt
// concepts still show in the nav / home grid with a "soon" badge so the
// roadmap is visible and fills in wave by wave.

// Nav / home grouping (display order).
export const CONCEPT_GROUPS = [
  "Foundations",
  "Core building blocks",
  "Classic designs",
  "Scale & media",
  "Data & infra systems",
  "Money & real-time",
];

// All 28 concepts. chapter = Xu book chapter; wave = our build wave.
export const CONCEPTS = [
  // ── Foundations ───────────────────────────────────────────────────────────
  { id: "scaling-zero-to-millions", title: "Scaling from zero to millions of users", icon: "📈", chapter: 1, wave: 1, group: "Foundations", summary: "How one server grows into a replicated, cached, load-balanced, multi-tier system.", built: true },
  { id: "back-of-envelope-estimation", title: "Back-of-the-envelope estimation", icon: "🧮", chapter: 2, wave: 1, group: "Foundations", summary: "Turn assumptions into QPS, storage and bandwidth — the numbers interviewers want.", built: true },
  { id: "interview-framework", title: "A framework for system design interviews", icon: "🗺️", chapter: 3, wave: 1, group: "Foundations", summary: "A repeatable 4-step method: scope, high-level design, deep dive, wrap-up.", built: true },

  // ── Core building blocks ──────────────────────────────────────────────────
  { id: "rate-limiter", title: "Design a rate limiter", icon: "🚦", chapter: 4, wave: 1, group: "Core building blocks", summary: "Token bucket vs sliding window, where to enforce, and doing it across many servers.", built: true },
  { id: "consistent-hashing", title: "Consistent hashing", icon: "💍", chapter: 5, wave: 2, group: "Core building blocks", summary: "Distribute keys across nodes so adding/removing one moves as few keys as possible.", built: false },
  { id: "key-value-store", title: "Design a key-value store", icon: "🗄️", chapter: 6, wave: 2, group: "Core building blocks", summary: "Replication, quorums, versioning and the CAP trade-offs behind a distributed KV store.", built: false },
  { id: "unique-id-generator", title: "Unique ID generator in distributed systems", icon: "🆔", chapter: 7, wave: 2, group: "Core building blocks", summary: "Snowflake-style IDs: roughly sortable, unique, and generated without coordination.", built: false },

  // ── Classic designs ───────────────────────────────────────────────────────
  { id: "url-shortener", title: "Design a URL shortener", icon: "🔗", chapter: 8, wave: 2, group: "Classic designs", summary: "Hashing vs counter encoding, redirect path, and read-heavy caching.", built: false },
  { id: "web-crawler", title: "Design a web crawler", icon: "🕷️", chapter: 9, wave: 3, group: "Classic designs", summary: "BFS frontier, politeness, dedup, and crawling the web at scale.", built: false },
  { id: "notification-system", title: "Design a notification system", icon: "🔔", chapter: 10, wave: 3, group: "Classic designs", summary: "Fan-out across push/SMS/email with queues, retries and dedup.", built: false },
  { id: "news-feed-system", title: "Design a news feed system", icon: "📰", chapter: 11, wave: 3, group: "Classic designs", summary: "Fan-out on write vs on read, and the hybrid that handles celebrities.", built: false },
  { id: "chat-system", title: "Design a chat system", icon: "💬", chapter: 12, wave: 3, group: "Classic designs", summary: "WebSocket presence, message delivery, ordering and 1:1 vs group chat.", built: false },
  { id: "search-autocomplete", title: "Design search autocomplete", icon: "🔎", chapter: 13, wave: 4, group: "Classic designs", summary: "Trie-backed prefix suggestions, ranking, and keeping it fast.", built: false },

  // ── Scale & media ─────────────────────────────────────────────────────────
  { id: "youtube", title: "Design YouTube", icon: "▶️", chapter: 14, wave: 4, group: "Scale & media", summary: "Upload + transcode pipeline, CDN delivery, and blob storage at scale.", built: false },
  { id: "google-drive", title: "Design Google Drive", icon: "📁", chapter: 15, wave: 4, group: "Scale & media", summary: "Chunked upload, sync, dedup, and metadata vs block storage.", built: false },
  { id: "proximity-service", title: "Design a proximity service", icon: "📍", chapter: 16, wave: 4, group: "Scale & media", summary: "Geohash / quadtree indexing to find nearby businesses fast.", built: false },
  { id: "nearby-friends", title: "Design nearby friends", icon: "👥", chapter: 17, wave: 5, group: "Scale & media", summary: "Live location updates, pub/sub fan-out, and ephemeral geo state.", built: false },
  { id: "google-maps", title: "Design Google Maps", icon: "🛰️", chapter: 18, wave: 5, group: "Scale & media", summary: "Map tiles, routing/ETA, and serving navigation at planet scale.", built: false },

  // ── Data & infra systems ──────────────────────────────────────────────────
  { id: "distributed-message-queue", title: "Design a distributed message queue", icon: "📨", chapter: 19, wave: 5, group: "Data & infra systems", summary: "Partitioned logs, consumer groups, ordering and delivery guarantees.", built: false },
  { id: "metrics-monitoring", title: "Design metrics monitoring & alerting", icon: "📊", chapter: 20, wave: 5, group: "Data & infra systems", summary: "Time-series ingestion, downsampling, and alerting on the right signals.", built: false },
  { id: "ad-click-aggregation", title: "Design ad click event aggregation", icon: "🖱️", chapter: 21, wave: 6, group: "Data & infra systems", summary: "Streaming aggregation, exactly-once counting, and late/duplicate events.", built: false },
  { id: "hotel-reservation", title: "Design a hotel reservation system", icon: "🏨", chapter: 22, wave: 6, group: "Data & infra systems", summary: "Inventory, overbooking, concurrency control and idempotent booking.", built: false },
  { id: "distributed-email", title: "Design a distributed email service", icon: "📧", chapter: 23, wave: 6, group: "Data & infra systems", summary: "Mail storage, search, and reliable send/receive at scale.", built: false },
  { id: "object-storage", title: "Design an S3-like object storage", icon: "🪣", chapter: 24, wave: 6, group: "Data & infra systems", summary: "Buckets, durability via replication/erasure coding, and metadata.", built: false },

  // ── Money & real-time ─────────────────────────────────────────────────────
  { id: "realtime-leaderboard", title: "Design a real-time gaming leaderboard", icon: "🏆", chapter: 25, wave: 7, group: "Money & real-time", summary: "Sorted sets, top-K at scale, and real-time rank updates.", built: false },
  { id: "payment-system", title: "Design a payment system", icon: "💳", chapter: 26, wave: 7, group: "Money & real-time", summary: "Payment flow, idempotency, reconciliation and exactly-once money movement.", built: false },
  { id: "digital-wallet", title: "Design a digital wallet", icon: "👛", chapter: 27, wave: 7, group: "Money & real-time", summary: "Balance transfers, double-entry ledger, and distributed transactions.", built: false },
  { id: "stock-exchange", title: "Design a stock exchange", icon: "🏦", chapter: 28, wave: 7, group: "Money & real-time", summary: "Matching engine, order book, sequencing and ultra-low latency.", built: false },
];

// Lazy loaders — only for built concepts.
export const CONCEPT_LOADERS = {
  "scaling-zero-to-millions": () => import("./concept-data/scaling-zero-to-millions.js"),
  "back-of-envelope-estimation": () => import("./concept-data/back-of-envelope-estimation.js"),
  "interview-framework": () => import("./concept-data/interview-framework.js"),
  "rate-limiter": () => import("./concept-data/rate-limiter.js"),
};

export const CONCEPT_PREFIX = "c:";   // hash routing: #c:<id>

export function conceptMeta(id) {
  return CONCEPTS.find(c => c.id === id) || null;
}
export function builtConceptCount() {
  return CONCEPTS.filter(c => c.built).length;
}
