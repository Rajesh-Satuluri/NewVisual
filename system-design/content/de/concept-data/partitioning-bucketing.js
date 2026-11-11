export default {
  id: "partitioning-bucketing",
  title: "Partitioning & bucketing",
  icon: "🗂️",
  chapter: 7,
  group: "Storage & table formats",
  summary: "Partitioning splits a table into directories by a column (usually date) so a filtered query scans only the matching partitions instead of the whole table — partition pruning. Bucketing hashes rows into a fixed number of files to make joins and aggregations cheaper. Both are about reading less.",
  widget: "de-partition-prune",
  widgetIntro: "Partitioning lays a table out as **directories keyed by a column** — `/event_date=2024-01-01/`, `/event_date=2024-01-02/`, and so on. When a query filters on that column, the engine skips every directory that can't match and scans only the rest. That's **partition pruning**, and it's the single biggest layout lever on a lake.\n\nDrag the date filter and watch the engine prune the table to just the matching partitions. Then see the failure mode: filter on a non-partitioned column, or choose a high-cardinality partition key, and pruning stops helping.",
  sections: [
    {
      title: "Partitioning = pruning",
      body: "A partitioned table physically separates rows into folders by the partition column's value. A query with a predicate on that column reads only the folders whose value matches — the engine never opens the rest. On a table partitioned by date, `WHERE event_date = '2024-01-01'` scans one day's files, not years of history.",
      flow: ["WHERE event_date = '2024-01-01'", "prune to /event_date=2024-01-01/", "scan one partition"],
      rules: ["Pruning only works when the query filters on the partition column — match the key to your common filter."],
    },
    {
      title: "Choosing a partition key",
      body: "Partition by the column your queries filter on most — overwhelmingly that's a date/time column, because analytics is usually time-ranged. The key must be **low-ish cardinality**: you want partitions big enough to be efficient files, not millions of tiny ones.",
      bullets: [
        "**Good:** date/hour, region, category — low cardinality, commonly filtered.",
        "**Bad:** user_id, uuid — millions of tiny partitions (the small-file problem).",
        "**Rule of thumb:** aim for partitions of roughly hundreds of MB, not KB.",
      ],
    },
    {
      title: "Over-partitioning hurts",
      body: "Partition on too high-cardinality a key (or too many columns) and you get an explosion of tiny files and directories. Listing them dominates query planning, each file is too small to read efficiently, and pruning savings are swamped by metadata overhead. Over-partitioning is one of the most common lake performance mistakes.",
      callout: { tone: "warn", label: "The classic mistake:", body: "Partitioning by `user_id` or by `date` *and* `hour` *and* `country` creates millions of near-empty directories — slower than not partitioning at all." },
    },
    {
      title: "Bucketing: the complement",
      body: "Bucketing (a.k.a. clustering) hashes a column into a **fixed number of buckets**, writing each bucket as a file. Unlike partitioning it doesn't create directories per value, so it suits high-cardinality join keys. Two tables bucketed the same way on the join key can be joined bucket-to-bucket without a shuffle, and bucketing caps the file count so it doesn't explode.",
      table: {
        head: ["", "Partitioning", "Bucketing"],
        rows: [
          ["Mechanism", "Directory per value", "Hash into N files"],
          ["Enables", "Pruning by filter", "Shuffle-free joins, bounded files"],
          ["Key cardinality", "Low", "High (e.g. user_id)"],
          ["Filter column", "Yes, prune", "Not pruned, but co-located"],
        ],
      },
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Layout is the cheapest performance you can buy: get the partition key and granularity right and queries read a fraction of the data.",
  deepDive: [
    {
      title: "Pruning vs push-down vs bucketing",
      body: "These stack. Partition pruning skips whole directories by the partition column. Within a partition, columnar push-down skips row groups by min/max stats. Bucketing co-locates rows by a hash key so joins avoid shuffles. A well-laid-out table uses all three: partition by date, sort within for push-down, bucket the join key.",
      stats: [
        { value: "directories", label: "partition pruning granularity", tone: "green" },
        { value: "row groups", label: "push-down granularity", tone: "blue" },
        { value: "hash buckets", label: "join co-location", tone: "accent" },
        { value: "100s of MB", label: "target partition size", tone: "amber" },
      ],
    },
    {
      title: "Partition evolution and skew",
      body: "Partition schemes are hard to change once data is written (directories are physical) — a reason open table formats added 'hidden partitioning' that can evolve. Watch for skew too: a date partition for a launch day may be 100× larger than others, becoming a straggler. Sub-partition or salt hot partitions when one value dominates.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Partition by the common time filter at a granularity that keeps partitions ~hundreds of MB; bucket high-cardinality join keys; never partition by user_id. Pruning + push-down + bucketing together mean reading a fraction of the table.\"" },
    },
  ],
  qa: [
    {
      q: "What is partition pruning and how do you enable it?",
      a: "Partitioning stores a table as directories keyed by a column's value; partition pruning is the engine skipping every directory that can't match a query's filter, so it scans only the relevant partitions. You enable it by partitioning on the column your queries actually filter on — almost always a date/time column — and making sure queries include a predicate on that column. No predicate on the partition key means no pruning and a full scan.",
      tip: "Stress 'partition by the common filter column, and the query must filter on it' — pruning is useless otherwise.",
    },
    {
      q: "How do you choose a partition key, and what goes wrong?",
      a: "Pick a low-cardinality column that queries commonly filter on — typically date, sometimes plus region or category. The failure mode is high cardinality: partitioning by user_id or by date+hour+country creates millions of tiny directories, so file listing dominates planning, reads are inefficient, and metadata overhead swamps any pruning benefit. Aim for partitions of roughly hundreds of MB; if a key would create tiny partitions, it's the wrong key.",
      tip: "Name the over-partitioning anti-pattern (user_id, too many columns) and the ~hundreds-of-MB target.",
    },
    {
      q: "When do you use bucketing instead of (or with) partitioning?",
      a: "Use bucketing for high-cardinality columns you join or aggregate on, like user_id, where partitioning would explode into tiny directories. Bucketing hashes the column into a fixed number of files, so the file count is bounded and two tables bucketed identically on the join key can be joined bucket-to-bucket without a shuffle. Often you combine them: partition by date for pruning, bucket by the join key for shuffle-free joins.",
      tip: "Bucketing = bounded files + shuffle-free joins on high-cardinality keys; it complements partitioning, not replaces it.",
    },
  ],
  related: [],
};
