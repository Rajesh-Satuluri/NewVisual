export default {
  id: "partition-layout-avoid-full-scans",
  question: "How do I choose a partition layout that avoids full-table scans?",
  icon: "🗂️",
  difficulty: "Intermediate",
  category: "Storage & Formats",
  tags: ["Partitioning", "Storage", "Performance"],
  tldr: "Partition on the low-cardinality column your queries filter by — almost always a date — so the engine reads only matching partitions. Partition on something queries don't filter by, or on something with millions of values, and every query scans everything.",
  intro: "Partitioning physically splits a table's files into folders by a column's value (e.g. `dt=2024-01-01/`). When a query filters on that column the engine can skip every non-matching folder — partition pruning. Get the partition column right and a query touches 1 of 365 days of data; get it wrong and it reads the whole table no matter what you filter by.",
  steps: [
    {
      title: "Partition on what your queries filter by",
      body: "Pruning only happens when the query's WHERE clause references the partition column. Look at how the table is actually queried: if 90% of queries filter by date, partition by date. If they filter by region, consider region. A partition column no query filters on buys you nothing — the engine still reads every partition.",
      rules: ["No filter on the partition column → no pruning → full scan", "Partition by the dominant filter, not by what's convenient to write"]
    },
    {
      title: "Choose low cardinality — avoid over-partitioning",
      body: "Each distinct partition value becomes its own folder of files. Partition by `day` (365/year) and you get healthy partitions; partition by `user_id` (millions) and you get millions of folders each holding one tiny file — the small-files problem, which makes queries and metadata operations slower than no partitioning at all.",
      bullets: [
        "Good: date, month, region, event-type — tens to thousands of values.",
        "Bad: user_id, order_id, timestamp-to-the-second — explodes partition count.",
        "Aim for partitions large enough to hold files of ~128MB–1GB."
      ],
      body2: "If you need fine-grained skipping within a partition, cluster/Z-order or bucket inside it — don't make it a partition column."
    },
    {
      title: "Match partition granularity to query range",
      body: "The granularity should fit the typical query window. If queries scan a day, partition by day. If they scan a month, daily partitions are fine (prune to 30) but hourly would create 720 folders for no benefit. Too fine wastes metadata; too coarse forces queries to read more than they need.",
      rules: ["Granularity ≈ the smallest range queries routinely filter to"]
    },
    {
      title: "Consider a second partition dimension carefully",
      body: "You can partition by two columns (e.g. `dt` then `region`), but partitions multiply: 365 days × 50 regions = 18,250 folders. Only add a second dimension if queries frequently filter on both and the combined count stays reasonable — otherwise you recreate the over-partitioning problem.",
      bullets: [
        "Two dimensions multiply partition count — check the product.",
        "Add the second only if queries filter on it too.",
        "Otherwise keep one partition column and cluster by the rest."
      ]
    },
    {
      title: "Verify pruning actually happens",
      body: "Read the query plan / scanned-bytes metric. If a dated query still reports scanning the whole table, the filter isn't aligning with the partition column — a function wrapped around it (`CAST`, `DATE(ts)`), a type mismatch, or a filter on a different column. Partitioning is only working if the bytes-scanned number drops.",
      rules: ["Trust the scanned-bytes metric, not the folder layout", "Avoid functions on the partition column in WHERE — they can disable pruning"]
    }
  ],
  flow: [
    "How is the table queried?",
    "Partition by the dominant filter column",
    "Keep cardinality low (date-like)",
    "Granularity ≈ typical query range",
    "Verify scanned-bytes drops"
  ],
  checklist: [
    "Does the partition column appear in most queries' WHERE clause?",
    "Is its cardinality low enough to avoid millions of tiny files?",
    "Does granularity match the typical query window?",
    "If two partition dimensions, is their product still reasonable?",
    "Have you confirmed pruning via scanned-bytes, not assumption?"
  ],
  widget: "de-partition-prune",
  draft: false
};
