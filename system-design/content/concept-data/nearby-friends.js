export default {
  id: "nearby-friends",
  title: "Design nearby friends",
  icon: "👥",
  chapter: 17,
  group: "Scale & media",
  summary: "Show which of a user's friends are near them, updating in near-real-time as everyone moves. Unlike a proximity service over static places, here both the subjects and the query move constantly — so it's a high-write, pub/sub + ephemeral-location problem.",
  widget: "geo-pubsub",
  widgetIntro: "Because both you and your friends are constantly moving, this is a **geospatial publish/subscribe** problem: you subscribe to location updates only from friends inside a **radius** around you, and a friend who wanders out stops streaming to you automatically. The geo-index prunes a potentially huge friend list down to the local neighbourhood, so you aren't flooded with updates from people far away.\n\nWatch friends roam — those inside the radius ping you with live positions (green), those outside go quiet. Drag the radius and see subscriptions start and stop as friends cross the boundary.",
  sections: [
    {
      title: "Requirements & what makes it different",
      body: "Every user's phone reports its location periodically; each user sees friends within a radius, refreshed continuously. The twist vs. a proximity service: the data points (friends) are **moving**, and locations are **ephemeral** (only the latest matters).",
      bullets: [
        "Continuous location updates from millions of devices (write-heavy).",
        "Push nearby-friend updates to users in near-real-time.",
        "Only the latest location matters; history is usually not needed.",
        "Privacy: only share with friends who've opted in.",
      ],
    },
    {
      title: "High-level flow",
      body: "Clients hold a persistent connection (WebSocket) and send periodic location pings. A location service updates the user's current position and figures out which friends should be notified, pushing updates down their connections.",
      flow: ["Device sends location (every few s)", "WebSocket → location service", "Update current location", "Find subscribed friends nearby", "Push update to their devices"],
    },
    {
      title: "Storing ephemeral location",
      body: "Since only the latest location matters and updates are frequent, store current positions in an **in-memory store** (Redis) with a short TTL — not a durable database. A stale entry (no ping recently) simply expires, which also models 'went offline'. This absorbs the huge write rate that a disk-based DB couldn't.",
      rules: ["Current location = in-memory (Redis) with TTL. High write rate, latest-only, auto-expiring."],
    },
    {
      title: "Delivering updates: pub/sub",
      body: "When a user moves, their friends who are nearby and subscribed need the update. Model this with **pub/sub**: each user publishes location changes to a channel; interested friends subscribe. A redis pub/sub or a message bus fans the update out to the servers holding those friends' connections, which push to the devices.",
      flow: ["User publishes location", "Pub/sub channel (per user / per region)", "Friends' connection servers", "Push to friend devices"],
    },
    {
      title: "Scaling the write/fan-out",
      body: "The hard part is volume: millions of users pinging every few seconds, each update potentially fanning out to many friends. Techniques: shard users across location servers (by user ID or region), reduce ping frequency when a user is stationary, batch/throttle outgoing updates, and cap the friend fan-out. Reuse geospatial indexing (geohash) to quickly find who is near whom.",
      bullets: [
        "Shard by user/region; a routing layer maps user → their location server.",
        "Adaptive ping rate (less often when still) to cut write volume.",
        "Throttle/batch pushes; only send meaningful movements.",
      ],
    },
  ],
  qa: [
    {
      q: "How is this different from a proximity service for restaurants?",
      a: "In a proximity service the data points (businesses) are static and only the querying user moves, so you can precompute a geospatial index and it rarely changes. Here both the friends and the user are moving continuously, generating a massive stream of location writes, and the result must update in near-real-time. So the emphasis shifts from a read-optimized static index to a high-write, ephemeral-state + pub/sub push architecture.",
      tip: "Static-index-read-heavy vs moving-points-write-heavy-push is the core distinction interviewers want you to name.",
    },
    {
      q: "Where and how do you store user locations?",
      a: "In an in-memory store like Redis, keyed by user with a short TTL — because only the latest position matters, writes are extremely frequent, and a disk database can't absorb that rate cheaply. The TTL doubles as presence: if a user stops pinging, their entry expires and they're treated as offline. You don't need durable history for 'where are my friends now'.",
      tip: "In-memory + TTL (latest-only, expiry = offline) is the key storage insight — don't reach for a durable DB here.",
    },
    {
      q: "How do you push updates to the right friends efficiently?",
      a: "Use pub/sub. Each user publishes location updates to a channel; their friends subscribe, and the bus fans updates out to the servers holding those friends' WebSocket connections, which push to the devices. Combine with geospatial filtering (geohash) so you only notify friends who are actually within the radius, and throttle updates so small jitters don't spam everyone.",
      tip: "Pub/sub for fan-out + geohash to filter by proximity + throttling is the complete delivery answer.",
    },
    {
      q: "How do you handle the sheer write volume at scale?",
      a: "Shard users across many location servers (by user ID or geographic region) with a routing layer, so no single node handles all pings. Cut the volume at the source with adaptive ping rates — report less often when a user is stationary — and batch or throttle outgoing updates so you push only meaningful movement. Keep per-update work O(small) by using in-memory state and bounded friend fan-out.",
      tip: "Reducing writes at the source (adaptive ping rate) is as important as sharding — mention both.",
    },
  ],
  related: [
    "how-do-i-design-for-backpressure-in-a-high-traffic-system",
    "how-do-i-choose-between-synchronous-and-asynchronous-communi",
    "where-should-i-cache-client-edge-service-db-layer",
    "how-do-i-avoid-hot-partitions-and-skew",
    "when-do-i-choose-event-driven-over-request-response",
  ],
};
