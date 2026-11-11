export default {
  id: "back-of-envelope-estimation",
  title: "Back-of-the-envelope estimation",
  icon: "🧮",
  chapter: 2,
  group: "Foundations",
  summary: "Rough math to size a system: turn user and usage assumptions into QPS, storage, and bandwidth. The goal is a defensible order-of-magnitude answer, not precision — and stating your assumptions out loud is half the point.",
  widget: "estimator",
  sections: [
    {
      title: "Why estimate at all",
      body: "Estimation tells you whether a design is even in the right ballpark: does this fit on one machine or a thousand? Do we need a cache, a CDN, sharding? Interviewers use it to see if you can reason quantitatively and justify your choices with numbers instead of hand-waving.",
      rules: ["You are aiming for the right power of ten, not the exact figure."],
    },
    {
      title: "The numbers worth memorizing",
      body: "A few constants make the arithmetic fast:",
      bullets: [
        "Seconds in a day ≈ **86,400** (round to ~100,000 to simplify).",
        "1 KB = 10³ bytes, 1 MB = 10⁶, 1 GB = 10⁹, 1 TB = 10¹², 1 PB = 10¹⁵.",
        "A char ≈ 1 byte (ASCII); a typical short record is hundreds of bytes to a few KB.",
      ],
      table: {
        head: ["Operation", "Rough latency"],
        rows: [
          ["Memory reference", "~100 ns"],
          ["Read 1 MB from memory", "~250 µs"],
          ["SSD random read", "~100 µs"],
          ["Round trip within a data center", "~500 µs"],
          ["Read 1 MB from SSD", "~1 ms"],
          ["Disk seek (spinning)", "~10 ms"],
          ["Round trip across continents", "~150 ms"],
        ],
      },
      body2: "The headline: **memory is ~100,000× faster than a cross-continent round trip**, and avoiding disk seeks and long network hops dominates latency. This is why we cache and why we keep data close to users.",
    },
    {
      title: "Estimating QPS (queries per second)",
      body: "Start from daily active users (DAU) and requests per user per day:",
      rules: [
        "Requests/day = DAU × requests per user per day",
        "Average QPS = requests/day ÷ 86,400",
        "Peak QPS = average QPS × peak factor (often 2–10×)",
      ],
      body2: "Example: 10M DAU × 20 requests/day = 200M requests/day ÷ 86,400 ≈ **~2,300 average QPS**. With a 5× peak factor, plan for **~11,500 peak QPS**. That number decides how many servers and how much caching you need.",
    },
    {
      title: "Estimating storage",
      body: "Multiply the write rate by the size of each item, then by the retention period — and don't forget replication and overhead (indexes, metadata).",
      rules: [
        "New data/day = writes/day × bytes per item",
        "Total = new data/day × retention days × replication factor",
      ],
      body2: "Example: 2M new posts/day × 1 KB each = 2 GB/day of raw text. Over 5 years with 3× replication: 2 GB × 365 × 5 × 3 ≈ **~11 TB**. Add media and it dwarfs the text.",
    },
    {
      title: "Estimating bandwidth",
      body: "Bandwidth is request rate × payload size. Convert to bits per second for network capacity, and remember reads usually dominate writes.",
      body2: "Example: 11,500 peak QPS × 2 KB per response ≈ 23 MB/s ≈ **~184 Mbps** of egress at peak — before images or video, which is where real bandwidth (and CDN need) comes from.",
      flow: ["Assumptions", "QPS", "Storage", "Bandwidth", "→ number of servers / need for cache & CDN"],
    },
    {
      title: "How to present it",
      body: "State every assumption first (\"assume 10M DAU, 20 requests each, read:write 100:1, 5× peak\"). Round aggressively. Then translate the numbers into design decisions: \"~11K peak QPS and a 100:1 read ratio means we need read replicas plus a cache; ~11 TB over five years means we'll shard.\"",
      rules: ["Assumptions → numbers → design implications. Always close the loop."],
    },
  ],
  qa: [
    {
      q: "Estimate the QPS and storage for a Twitter-like service.",
      a: "Lay out assumptions, then compute:",
      bullets: [
        "Assume **300M DAU**, each makes ~**30 read + a few write** requests/day.",
        "Reads/day ≈ 300M × 30 = 9B → ÷ 86,400 ≈ **~104K average read QPS**; at 5× peak ≈ **~520K peak**.",
        "Writes: say 2 tweets/user/day for 50% of users = ~300M tweets/day → ~3,500 write QPS average.",
        "Storage: 300M tweets/day × ~300 bytes ≈ 90 GB/day of text; × 365 × 5 years × 3 replicas ≈ **~0.5 PB** of text alone — media is far larger.",
      ],
      tip: "The exact numbers don't matter; the interviewer is checking that you pick assumptions, do clean powers-of-ten arithmetic, and reach a conclusion like \"this needs sharding + a cache + a CDN for media.\"",
    },
    {
      q: "What latency numbers should every engineer roughly know?",
      a: "The orders of magnitude, not exact values: memory reference ~100 ns, SSD read ~100 µs, intra-datacenter round trip ~0.5 ms, disk seek ~10 ms, cross-continent round trip ~150 ms.",
      bullets: [
        "Memory is ~100,000× faster than a cross-continent round trip — hence caching.",
        "A cross-region call (~150 ms) blows your latency budget — hence serving from the nearest region/CDN.",
        "Disk seeks (~10 ms) are why we favor sequential I/O and in-memory indexes.",
      ],
      tip: "You don't need the exact nanoseconds. Knowing memory ≪ SSD ≪ disk ≪ network-across-world, by orders of magnitude, is what drives real design choices.",
    },
    {
      q: "Why bother estimating if it's so imprecise?",
      a: "Because an order-of-magnitude answer changes the architecture. \"100 QPS\" fits on one box; \"100K QPS\" needs load balancing, caching, and probably sharding. Estimation catches an infeasible design in two minutes instead of two weeks, and it forces you to make your assumptions explicit so they can be challenged.",
      tip: "Frame it as risk reduction: cheap math up front prevents expensive architecture mistakes later.",
    },
  ],
  related: [
    "how-do-i-design-a-service-that-can-handle-10x-more-traffic-w",
    "how-do-i-design-pagination-for-massive-datasets-efficiently",
    "where-should-i-cache-client-edge-service-db-layer",
    "how-do-i-design-for-cost-visibility-and-optimization-from-da",
  ],
};
