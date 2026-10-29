export default {
  id: "news-feed-system",
  title: "Design a news feed system",
  icon: "📰",
  chapter: 11,
  group: "Classic designs",
  summary: "Build the home timeline (Facebook/Twitter style): when a user opens the app, show recent posts from everyone they follow. The central decision is fan-out on write vs on read — and the hybrid that handles celebrities.",
  sections: [
    {
      title: "Two operations, two paths",
      body: "A feed system has a **write path** (publishing a post) and a **read path** (building a user's feed). The whole design hinges on which path does the expensive work of combining posts from many followees.",
      bullets: [
        "**Publish:** user creates a post; it must reach their followers' feeds.",
        "**Read:** user opens the app; show a merged, ranked list of recent posts from everyone they follow.",
      ],
    },
    {
      title: "Fan-out on write (push model)",
      body: "When a user posts, immediately push that post ID into the precomputed feed cache of **each follower**. Reads are then trivially fast — just read your ready-made feed list.",
      table: {
        head: ["", "Fan-out on write"],
        rows: [
          ["Read latency", "Very fast — feed is precomputed"],
          ["Write cost", "Expensive — one post → N follower feeds"],
          ["Problem", "Celebrities: a 50M-follower post = 50M writes ('fan-out storm')"],
          ["Wasted work", "Precomputes feeds for inactive users"],
        ],
      },
    },
    {
      title: "Fan-out on read (pull model)",
      body: "Do nothing special on write. When a user opens the app, fetch recent posts from everyone they follow and merge them on the fly.",
      table: {
        head: ["", "Fan-out on read"],
        rows: [
          ["Write cost", "Cheap — just store the post once"],
          ["Read latency", "Slow — merge many followees at read time"],
          ["Scales with", "Great for users who follow many / celebrities"],
          ["Problem", "Hot reads for active users repeatedly recompute"],
        ],
      },
    },
    {
      title: "The hybrid (what real systems do)",
      body: "Use fan-out on write for ordinary users (fast reads, affordable writes) but **fan-out on read for celebrities**. When a user with millions of followers posts, don't push to everyone; instead, at read time, merge the celebrity's recent posts into the follower's precomputed feed. Best of both: fast reads for most, no fan-out storm for celebrities.",
      rules: ["Ordinary users → push (fan-out on write).", "Celebrities → pull at read time (fan-out on read).", "Merge both when building the feed."],
      flow: ["Post", "Author a celebrity? pull at read : push to followers", "Reader merges precomputed feed + celebrity posts", "Rank"],
    },
    {
      title: "Storage & caching",
      body: "Posts live in a post store (and media in blob storage + CDN). Each user's feed is a cached list of post IDs (e.g. in Redis), not full posts — you hydrate the actual content from cache/DB when rendering. The social graph (who follows whom) is its own store, queried to know where to fan out.",
    },
    {
      title: "Ranking & freshness",
      body: "A simple feed is reverse-chronological. Ranked feeds score posts by recency, affinity, and engagement — usually as a separate ranking step over the merged candidate set. Cap feed length (store the most recent N IDs) and paginate with cursors for infinite scroll.",
    },
  ],
  qa: [
    {
      q: "Fan-out on write vs on read — explain the trade-off and what you'd actually build.",
      a: "Fan-out on **write** precomputes each follower's feed when a post is made: reads are instant, but a post costs N writes (one per follower), which explodes for celebrities. Fan-out on **read** stores the post once and merges a user's followees' posts at read time: writes are cheap, but reads are slow and repeated.",
      bullets: [
        "Most users: fan-out on write — their follower counts are small, reads are the common case.",
        "Celebrities: fan-out on read — avoid the millions-of-writes storm.",
        "Hybrid: build the feed by merging the precomputed list with celebrities' recent posts at read time.",
      ],
      tip: "Leading straight to the hybrid, and naming the celebrity fan-out storm as the reason, is exactly what this classic question is testing.",
    },
    {
      q: "How do you handle a celebrity with 50 million followers posting?",
      a: "Don't fan out on write for them — that's 50M writes per post and will saturate the system. Flag high-follower accounts and handle their posts with fan-out on read: store the post once, and when each follower loads their feed, merge the celebrity's recent posts into their precomputed feed at read time. The follower's own non-celebrity followees still use the fast push path.",
      tip: "The threshold ('accounts above X followers switch to pull') is a nice concrete detail to mention.",
    },
    {
      q: "What exactly do you store in a user's cached feed?",
      a: "A bounded list of post IDs (plus maybe a score/timestamp), not the full post content — typically in Redis. Storing IDs keeps the per-user feed small and lets many feeds share one copy of each post. At render time you hydrate the IDs into full posts from a post cache/DB, and media from a CDN. Cap the list to the most recent N and paginate older content with cursors.",
      tip: "Storing IDs, not content, is the memory-efficiency point interviewers look for.",
    },
    {
      q: "How do you keep feeds consistent when follows/unfollows change?",
      a: "Treat the social graph as the source of truth and the cached feed as derived. On unfollow, you can lazily filter that author out at read time rather than rewriting every feed. On new follow, backfill recent posts into the feed or just let them appear via the read-time merge. Precomputed feeds are best-effort caches — correctness comes from reconciling against the graph and post store at read time.",
      tip: "'Feed cache is derived; graph is source of truth' is the principle that resolves most consistency questions here.",
    },
  ],
  related: [
    "how-do-i-design-a-fan-out-fan-in-pipeline-for-heavy-computat",
    "where-should-i-cache-client-edge-service-db-layer",
    "how-do-i-avoid-hot-partitions-and-skew",
    "how-do-i-design-pagination-for-massive-datasets-efficiently",
    "when-do-i-accept-eventual-consistency-vs-strict-consistency",
  ],
};
