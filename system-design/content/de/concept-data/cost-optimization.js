export default {
  id: "cost-optimization",
  title: "Cost optimization",
  icon: "💰",
  chapter: 28,
  group: "Operations",
  summary: "Cloud data platforms bill for storage and compute separately, and both grow silently. Cost optimization means tiering storage by access frequency with lifecycle policies, right-sizing and auto-scaling compute, cutting data scanned (partitioning, columnar, compaction), and making spend visible per team. The theme: pay for what you actually use, and stop paying for what you don't.",
  widget: "de-cost",
  widgetIntro: "Most data costs fall into two buckets: **storage** (cheap per GB but endless, since data is rarely deleted) and **compute** (expensive, billed per query or per cluster-hour). The biggest lever on storage is **lifecycle tiering** — hot data on fast, pricey storage; old, rarely-read data automatically moved to cheap cold tiers. On compute, the lever is scanning less and right-sizing clusters.\n\nWatch data age from hot to warm to cold under a lifecycle policy, and the monthly spend meter drop versus keeping everything hot.",
  sections: [
    {
      title: "Storage: tier by access frequency",
      body: "Not all data is accessed equally: recent data is queried constantly, old data almost never. Storage tiers price that — hot (standard) is fast and pricey, cold/archive (e.g. Glacier) is cheap but slow to retrieve. A **lifecycle policy** automatically transitions objects to colder tiers as they age, and expires truly dead data, so you stop paying hot prices for cold data.",
      flow: ["hot (recent, standard)", "→ warm (infrequent)", "→ cold / archive", "→ expire"],
      rules: ["Lifecycle-tier data by age/access; expire what's past retention. Don't store cold data at hot prices."],
    },
    {
      title: "Compute: right-size and scan less",
      body: "Compute is usually the bigger bill. Cut it two ways. **Scan less:** partitioning, columnar formats, compaction, and good dist/sort keys mean queries read a fraction of the data (and warehouses often bill by bytes scanned). **Right-size:** auto-scale clusters to load, auto-suspend idle warehouses, use spot/preemptible instances for fault-tolerant batch, and separate workloads so a heavy job doesn't force everyone onto a big cluster.",
      bullets: [
        "**Scan less:** partition pruning + columnar + compaction → fewer bytes read.",
        "**Auto-scale / auto-suspend:** pay for compute only while it's working.",
        "**Spot instances:** cheap compute for retriable batch jobs.",
      ],
    },
    {
      title: "Make cost visible (FinOps)",
      body: "You can't optimize what you can't see. Tag resources and queries by team/project, attribute spend back to owners, and alert on anomalies (a runaway query, a cluster left running). When teams see their own bill, they optimize it; when cost is a central mystery, it only grows. Cost visibility from day one is the cheapest optimization there is.",
      rules: ["Attribute spend to teams and alert on anomalies — visibility is what actually drives optimization."],
    },
    {
      title: "Delete and archive deliberately",
      body: "The cheapest byte is the one you don't store. Set retention policies so data is expired or archived when it's no longer needed, dedupe and compact to shrink footprint, and resist 'keep everything forever just in case' as a default. Deliberate retention — matched to legal and analytical need — keeps storage from compounding indefinitely.",
      bullets: [
        "Retention policies: archive or delete past the useful/legal window.",
        "Dedupe + compact to shrink the footprint.",
        "Challenge 'keep everything forever' — it compounds.",
      ],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Cost is an architecture property: the same layout and scaling choices that make queries fast usually make them cheap.",
  deepDive: [
    {
      title: "Performance and cost are the same lever",
      body: "In the cloud, reading less data and running compute for less time is both faster and cheaper. Partition pruning, columnar projection, compaction, broadcast joins, and right-sized clusters all reduce bytes scanned and cluster-hours — so most performance tuning is cost tuning. That's why warehouses that bill per byte scanned make layout decisions directly visible on the invoice.",
      stats: [
        { value: "tier by age", label: "lifecycle: hot → cold → expire", tone: "green" },
        { value: "scan less", label: "partition + columnar + compact", tone: "blue" },
        { value: "auto-suspend", label: "no pay for idle compute", tone: "accent" },
        { value: "attribute", label: "spend visible per team (FinOps)", tone: "amber" },
      ],
    },
    {
      title: "Where the money actually goes",
      body: "The common surprises: huge scans from un-partitioned tables (full-table reads billed per byte), idle warehouses left running overnight, mountains of cold data on hot storage, and small-file overhead inflating job time. Fix the layout (partition, compact), automate suspension and lifecycle tiering, and attribute spend so owners see it. The biggest wins are usually boring hygiene, not clever tricks.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Storage: lifecycle-tier by access and expire past retention. Compute: scan less (partition, columnar, compaction) and right-size with auto-suspend and spot. Make spend visible per team and alert on anomalies. Performance tuning is cost tuning — fewer bytes scanned and fewer cluster-hours.\"" },
    },
  ],
  qa: [
    {
      q: "How do you control storage costs on a data platform?",
      a: "Tier storage by how often data is accessed and automate the transitions. Keep recent, frequently-queried data on hot/standard storage; use lifecycle policies to move aging, rarely-read data to warm then cold/archive tiers (much cheaper per GB, slower to retrieve); and expire data past its retention window entirely. Combine with deduplication and compaction to shrink the footprint. The principle is to stop paying hot-tier prices for cold data and to delete/archive deliberately rather than keeping everything forever.",
      tip: "Lifecycle tiering by access frequency + retention/expiry + dedupe/compact; don't store cold data at hot prices.",
    },
    {
      q: "How do you reduce compute cost, and why is it often performance tuning?",
      a: "Two levers: scan less and run less. Scanning less — via partition pruning, columnar formats, compaction, and good dist/sort keys — means queries read a fraction of the data, which matters doubly when the warehouse bills by bytes scanned. Running less — auto-scaling to load, auto-suspending idle warehouses, using spot/preemptible instances for retriable batch, and isolating workloads — means paying for compute only while it works. These are the same optimizations that make queries fast, so most performance tuning is directly cost tuning in the cloud.",
      tip: "Scan less (layout) + run less (auto-scale/suspend/spot); note bytes-scanned billing makes layout a cost lever.",
    },
    {
      q: "Why is cost visibility (FinOps) important, and how do you implement it?",
      a: "Because you can't optimize what you can't see, and cloud data spend grows silently — a runaway query or a warehouse left running overnight is invisible until the bill arrives. Implement it by tagging resources and queries by team/project, attributing spend back to the owning teams, dashboarding it, and alerting on anomalies (sudden scan spikes, idle-but-running clusters). When teams see their own costs they optimize them; when cost is a central mystery it only compounds. Building this in from day one is the cheapest optimization you can make.",
      tip: "Tag + attribute spend to owners + anomaly alerts; visibility is what actually changes behavior.",
    },
  ],
  related: [],
};
