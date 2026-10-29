export default {
  id: "warehouse-tuning",
  title: "Warehouse tuning (dist & sort keys)",
  icon: "⚙️",
  chapter: 22,
  group: "Performance & quality",
  summary: "In an MPP warehouse (Redshift-style), two physical-layout choices dominate performance: the distribution key decides which node a row lives on — matching it to the join key co-locates joins and avoids redistribution — and the sort key orders data so range filters skip blocks via zone maps. Get these right and big joins and scans get dramatically cheaper.",
  widget: "de-distkey",
  widgetIntro: "A massively-parallel warehouse spreads a table's rows across many nodes. A join is cheap only when the matching rows already sit on the **same node** — otherwise the engine must **redistribute** data across the network first. The **distribution key** controls placement: distribute both tables on the join key and the join is local. The **sort key** orders rows so a filtered query can **skip blocks** whose min/max can't match (zone maps).\n\nToggle a matching vs mismatched distribution key and watch rows redistribute — then toggle the sort key and watch the scan prune.",
  sections: [
    {
      title: "Distribution: where a row lives",
      body: "An MPP warehouse hashes each row to a node based on its distribution key. When you join two tables, rows only combine cheaply if the matching keys are already co-located on the same node. So distributing both tables on the **join key** means the join happens locally on each node — no data crosses the network.",
      bullets: [
        "**KEY distribution on the join key:** co-locates joins → no redistribution.",
        "**EVEN distribution:** spreads rows evenly but joins must redistribute.",
        "**ALL distribution:** a full copy on every node — like a broadcast, for small dimensions.",
      ],
      rules: ["Distribute large fact + dimension on the shared join key → the join runs node-local."],
    },
    {
      title: "The cost of a mismatch",
      body: "If the tables are distributed on different keys (or EVEN), the engine must redistribute one or both across the network at query time so matching keys meet — the warehouse equivalent of a shuffle. On big tables that network movement dominates the query. Matching distribution keys is how you avoid it entirely.",
      flow: ["mismatched keys", "redistribute over network", "then join"],
    },
    {
      title: "Sort keys: skip what you don't need",
      body: "The sort key physically orders rows on disk. The warehouse keeps per-block min/max metadata (zone maps), so a query filtering on the sort key skips every block whose range can't contain matching rows — reading a fraction of the table. It's the same idea as Parquet predicate push-down and partition pruning, at block granularity.",
      rules: ["Sort by the common filter/range column → zone maps skip non-matching blocks on scan."],
    },
    {
      title: "Choosing the keys",
      body: "Distribute on the dominant join key (usually the fact's foreign key to the biggest dimension), use ALL for small dimensions, and EVEN when there's no clear join key or to avoid skew. Sort on the column queries filter or range-scan most — typically a date. Watch distribution **skew**: a skewed dist key piles rows on one node, making it a bottleneck, so the key needs good cardinality and even spread.",
      bullets: [
        "Dist key = dominant join key; ALL for small dims; EVEN to avoid skew.",
        "Sort key = the common filter/range column (often date).",
        "Avoid a skewed distribution key — it overloads one node.",
      ],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Warehouse tuning is the same two ideas as lake tuning — co-locate to avoid movement, order to skip data — expressed as dist and sort keys.",
  deepDive: [
    {
      title: "Distribution = shuffle avoidance",
      body: "A matching distribution key is a persistent, pre-computed partitioning on the join key: the 'shuffle' is done once at load time, so every join reuses it for free. A mismatch forces that redistribution on every query. It's exactly the bucketing/broadcast idea from Spark, baked into how the warehouse stores the table.",
      stats: [
        { value: "KEY (matched)", label: "join is node-local", tone: "green" },
        { value: "EVEN / mismatch", label: "redistribute per query", tone: "red" },
        { value: "ALL", label: "copy on every node (small dims)", tone: "blue" },
        { value: "zone maps", label: "sort key → skip blocks", tone: "amber" },
      ],
    },
    {
      title: "Dist + sort together",
      body: "They're complementary: the distribution key minimizes data movement for joins, the sort key minimizes data scanned for filters. A well-tuned fact table is distributed on its main join key and sorted on its date/filter column, so star-join queries are both node-local and block-pruned. Modern cloud warehouses automate some of this (auto dist/sort, clustering), but the mental model is unchanged.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Distribute fact and dimension on the shared join key so joins are node-local (no redistribution), use ALL for small dims, and sort on the common date/filter column so zone maps skip blocks. Co-locate to avoid movement; order to avoid scanning.\"" },
    },
  ],
  qa: [
    {
      q: "What does the distribution key do and how do you choose it?",
      a: "The distribution key decides which node each row is hashed to. Its purpose is co-locating joins: if two tables are distributed on their shared join key, matching rows already sit on the same node and the join runs locally with no network movement. Choose it as the dominant join key — typically the fact table's foreign key to its biggest dimension. Use ALL distribution (a full copy per node) for small dimensions, and EVEN when there's no clear join key or you need to avoid skew. A mismatched or skewed dist key forces per-query redistribution or overloads one node.",
      tip: "Dist key = placement for join co-location; pick the dominant join key, ALL for small dims, EVEN to avoid skew.",
    },
    {
      q: "What does the sort key do?",
      a: "The sort key physically orders the table's rows on disk, and the warehouse stores per-block min/max metadata (zone maps). A query that filters or range-scans on the sort key can then skip every block whose min/max range can't contain matching rows, reading only the relevant blocks instead of the whole table. It's the warehouse version of Parquet predicate push-down and partition pruning, at block granularity — so you sort on the column queries filter most, usually a date.",
      tip: "Sort key → ordered data + zone maps → block skipping on range filters; sort on the common filter/date column.",
    },
    {
      q: "Why does a mismatched distribution key hurt, and how is it like a shuffle?",
      a: "If two joined tables are distributed on different keys (or EVEN), their matching rows live on different nodes, so the engine must redistribute one or both across the network at query time to bring equal keys together before joining — the warehouse equivalent of a Spark shuffle. On large tables that network movement dominates the query. A matching distribution key does that partitioning once, at load time, so every join reuses it for free — just like pre-bucketing on the join key avoids repeated shuffles.",
      tip: "Mismatch = per-query redistribution (a shuffle); matching dist key is a persistent pre-shuffle done at load.",
    },
  ],
  related: [],
};
