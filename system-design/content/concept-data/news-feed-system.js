export default {
  id: "news-feed-system",
  title: "Design a news feed system",
  icon: "📰",
  chapter: 11,
  group: "Classic designs",
  summary: "Build the home timeline (Facebook/Twitter style): when a user opens the app, show recent posts from everyone they follow. The central decision is fan-out on write vs on read — and the hybrid that handles celebrities.",
  widget: "feed-fanout",
  widgetIntro: "The defining choice for a feed is **where the fan-out happens**. With **push (fan-out on write)** a new post is copied into every follower's inbox the moment it's posted — reads are then trivially fast, but each post costs one write per follower. With **pull (fan-out on read)** the post is stored once and each follower's timeline is assembled when they open the app — writes are cheap, but every read fans out across everyone they follow.\n\nPost in each model and watch the packets. Then tick **Celebrity author** and see push explode into millions of inbox writes per post — the \"celebrity problem\" that pushes real systems to a **hybrid**: push for ordinary users, pull for the handful of accounts with enormous followings.",
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
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "The news feed is where the fan-out trade-off becomes concrete. Follow one celebrity post through the system and you'll see exactly why neither pure strategy works — and what the hybrid actually does.",
  deepDive: [
    {
      title: "Two ways to build a feed",
      compare: {
        title: "Fan-out on write vs on read",
        cols: [
          { title: "Fan-out on WRITE (push)", tone: "accent", body: "When you post, copy it into every follower's precomputed feed.", points: [
            "Reads are instant — the feed is already assembled.",
            "Writes are expensive: one post = N feed inserts.",
            "Wastes work on inactive followers.",
          ] },
          { title: "Fan-out on READ (pull)", tone: "accent", body: "Assemble the feed at read time from who you follow.", points: [
            "Writes are cheap — just store the post once.",
            "Reads are expensive: scatter-gather across all followees.",
            "Slow p99 for the common feed load.",
          ] },
        ],
      },
    },
    {
      title: "The celebrity problem, by the numbers",
      body: "Most users have a few hundred followers — fan-out on write is cheap and reads are instant. But a celebrity with 50M followers turns one post into **50 million feed writes**: a fan-out storm that saturates the write path and mostly lands in feeds nobody will read soon.",
      stats: [
        { value: "~300", label: "followers for a normal user", tone: "green" },
        { value: "50M", label: "followers for a celebrity", tone: "red" },
        { value: "50M writes", label: "one celebrity post, push model", tone: "red" },
        { value: "O(followees)", label: "celebrity pulled in at read instead", tone: "green" },
      ],
    },
    {
      title: "A celebrity post, step by step (hybrid)",
      timeline: [
        { t: "write", icon: "📝", tone: "accent", title: "Celebrity posts", detail: "The post is stored once. Because this author is flagged high-fan-out, we do NOT push it to 50M feeds." },
        { t: "write", icon: "⚡", tone: "good", title: "Normal authors still push", detail: "A regular user's post fans out on write to their few hundred followers' feeds — cheap, and their followers get instant reads." },
        { t: "read", icon: "📥", tone: "accent", title: "Follower opens their feed", detail: "We read their precomputed feed (fast) AND pull recent posts from the handful of celebrities they follow." },
        { t: "read", icon: "🔀", tone: "good", title: "Merge + rank", detail: "Merge the pushed feed with the pulled celebrity posts, rank, and return. The expensive fan-out never happened." },
      ],
    },
    {
      title: "Why the hybrid is the real answer",
      body: "Push for the many (normal users) so the common read is instant; pull for the few (celebrities) so a viral post never triggers a write storm. The threshold (how many followers makes you a \"celebrity\") is a tuned number, not a constant.",
      callouts: [
        { tone: "key", label: "The principle:", body: "Optimize the common case, special-case the heavy tail. A single uniform strategy loses whenever the workload is skewed." },
        { tone: "tip", label: "Follow-ups to expect:", body: "Feed ranking (chronological vs ML), pagination over a changing feed, and caching the assembled feed with a short TTL." },
      ],
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
