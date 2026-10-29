export default {
  id: "file-formats",
  title: "File formats (Parquet, ORC, Avro)",
  icon: "🗜️",
  chapter: 6,
  group: "Storage & table formats",
  summary: "The file format decides how fast and cheap your lake queries are. Columnar formats like Parquet and ORC store each column together, so analytical queries read only the columns they need, skip irrelevant chunks via embedded statistics, and compress hard. Avro is the row-based choice for streaming and schema evolution.",
  widget: "de-columnar",
  widgetIntro: "A Parquet file is organized into **row groups**, and inside each, data is stored **by column** (column chunks) with **min/max statistics** per chunk. Two optimizations fall out of this layout: **projection** (read only the columns a query selects) and **predicate push-down** (skip whole row groups whose stats can't match the filter).\n\nRun a query that selects two columns with a filter, and watch it read only those column chunks in only the row groups that could match — a fraction of the file. That's why columnar formats make lake analytics cheap.",
  sections: [
    {
      title: "Row-based vs columnar on disk",
      body: "A row-based format (CSV, JSON, Avro) stores all of a record's fields together. A columnar format (Parquet, ORC) stores all values of one column together. For analytics — which reads a few columns across many rows — columnar is dramatically more efficient.",
      table: {
        head: ["", "Row-based (Avro/JSON)", "Columnar (Parquet/ORC)"],
        rows: [
          ["Layout", "Record fields together", "Column values together"],
          ["Best for", "Writes, whole-record reads, streaming", "Analytical scans over few columns"],
          ["Projection", "Must read whole rows", "Reads only needed columns"],
          ["Compression", "Modest", "Excellent (similar values adjacent)"],
        ],
      },
    },
    {
      title: "Why columnar wins analytics",
      body: "Three effects stack up. **Projection:** a query touching 3 of 50 columns reads only those 3. **Compression:** a column of similar values packs tightly with dictionary/run-length encoding, so there's less to read. **Push-down:** each chunk stores min/max (and sometimes bloom filters), so the engine skips chunks that can't satisfy the `WHERE` clause without decoding them.",
      bullets: [
        "**Column projection** — read only the selected columns.",
        "**Predicate push-down** — skip row groups by min/max stats.",
        "**Encoding + compression** — dictionary, RLE, then codec (Snappy/Zstd).",
      ],
      rules: ["Columnar scan cost ≈ (selected columns) × (non-skipped row groups), not the whole file."],
    },
    {
      title: "Where Avro fits",
      body: "Avro is row-based and compact, with a schema stored alongside the data and strong, well-defined **schema evolution** rules. That makes it the natural format for streaming ingestion and message payloads (e.g. Kafka), and for the raw landing layer — where you write whole records fast and don't scan columns. A common pattern: land as Avro, then convert to Parquet for the query layer.",
      flow: ["Stream / land: Avro (row)", "convert", "Query layer: Parquet (columnar)"],
    },
    {
      title: "Picking one",
      body: "For a query/analytics layer, use Parquet (or ORC) — it's the lake default and what engines optimize for. For streaming, message payloads, and write-heavy raw capture with evolving schemas, use Avro. Don't query raw CSV/JSON at scale; convert to columnar first.",
      rules: ["Parquet/ORC for the read layer; Avro for streaming + schema evolution; convert raw text to columnar early."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "The interesting mechanics are row groups, the statistics that enable skipping, and how encoding interacts with query speed.",
  deepDive: [
    {
      title: "Row groups and statistics",
      body: "Parquet splits a file into row groups (e.g. ~128MB), each holding a chunk of every column plus per-chunk min/max statistics. The engine reads footer metadata, uses the stats to eliminate row groups that can't match the predicate, then reads only the required column chunks from the survivors. More selective filters + sorted data = more skipping.",
      stats: [
        { value: "projection", label: "columns read = columns selected", tone: "green" },
        { value: "min/max", label: "skip row groups by stats", tone: "blue" },
        { value: "dictionary/RLE", label: "encode before compress", tone: "accent" },
        { value: "footer", label: "metadata read first", tone: "amber" },
      ],
    },
    {
      title: "Sorting amplifies push-down",
      body: "Push-down only helps if the data isn't spread uniformly. If you sort or cluster files by the common filter column, each row group's min/max range gets narrow and non-overlapping, so a filter eliminates most row groups. Sorting on write is one of the cheapest ways to speed up reads later — the same idea as partitioning, at file granularity.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Parquet for the query layer: projection + min/max push-down + compression. Sort by the common predicate so row groups prune hard. Avro for streaming and evolving schemas; convert to Parquet for analytics.\"" },
    },
  ],
  qa: [
    {
      q: "Why is Parquet faster than CSV or JSON for analytics?",
      a: "Parquet is columnar: it stores each column's values together, so a query reads only the columns it selects (projection) instead of parsing whole rows, those columns compress far better because adjacent values are similar, and per-chunk min/max statistics let the engine skip row groups that can't match the filter (predicate push-down). CSV/JSON are row-based and untyped, so every query must read and parse everything. Columnar typically cuts analytical scan cost by 10× or more.",
      tip: "Projection + push-down + compression is the three-part answer; contrast with 'row-based must read everything'.",
    },
    {
      q: "When would you use Avro instead of Parquet?",
      a: "Avro is row-based with a compact binary encoding and strong schema-evolution support, which suits write-heavy and streaming workloads: Kafka message payloads, event ingestion, and the raw landing layer where you append whole records fast and don't do column scans. Parquet is for the read/analytics layer. A very common pattern is to land data as Avro and convert it to Parquet for querying.",
      tip: "Map it to the workload: Avro = streaming/write/evolution, Parquet = analytical reads.",
    },
    {
      q: "What is predicate push-down and what makes it effective?",
      a: "Predicate push-down uses the min/max statistics Parquet stores per column chunk/row group to skip chunks that can't satisfy a query's filter, without decoding them. It's effective when the data is laid out so those ranges are narrow and non-overlapping — i.e. when files are sorted or clustered by the filter column. If the filter column is scattered uniformly, every row group's range overlaps the predicate and nothing can be skipped, so sorting on write is what makes push-down pay off.",
      tip: "Mention that sorting/clustering by the predicate column is what turns push-down from theoretical into real savings.",
    },
  ],
  related: [],
};
