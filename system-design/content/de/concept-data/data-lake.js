export default {
  id: "data-lake",
  title: "Data lake architecture",
  icon: "🏞️",
  chapter: 1,
  group: "Foundations",
  summary: "A data lake stores any data — structured, semi-structured, or unstructured — as-is on cheap object storage in open file formats, applying structure only when you read it (schema-on-read). It is the universal landing zone that every warehouse, notebook, and ML job reads from.",
  widget: "de-datalake",
  widgetIntro: "The defining property of a lake is that it **never rejects data for not fitting a schema**. A relational table, a pile of JSON logs, images, and a Kafka stream all land in the same cheap object store, in their raw shape. Structure is applied **on read**, not on write — so you can store first and decide how to model later.\n\nWatch heterogeneous sources land as objects, then queries pull curated data back out to BI, SQL and ML. The lake decouples cheap, format-agnostic storage from the many engines that compute over it.",
  sections: [
    {
      title: "What a data lake is",
      body: "A data lake is a centralized repository that holds **raw data at any scale** on commodity object storage (S3, ADLS, GCS), typically in open columnar formats like Parquet. Unlike a warehouse, it imposes no schema at write time — you dump data in its native form and interpret it later.",
      bullets: [
        "**Any format:** tables, JSON/Avro logs, CSV, images, audio, clickstream events.",
        "**Cheap & elastic:** object storage is pennies per GB and effectively infinite.",
        "**Open formats:** Parquet/ORC/Avro, readable by many engines — no vendor lock-in.",
        "**Schema-on-read:** structure is applied by the query engine, not enforced on ingest.",
      ],
      rules: ["Store everything cheaply now; decide how to model it when you query it."],
    },
    {
      title: "Why not just a warehouse?",
      body: "A warehouse demands a schema up front and stores data in a proprietary format optimized for SQL. That is perfect for curated business tables but a poor fit for raw, high-volume, or unstructured data where you don't yet know the questions. The lake complements the warehouse: cheap raw capture in the lake, refined serving in the warehouse (or directly on the lake via a table format).",
      table: {
        head: ["", "Data lake", "Data warehouse"],
        rows: [
          ["Schema", "On read (flexible)", "On write (strict)"],
          ["Data", "Raw, any format", "Curated, structured"],
          ["Cost", "Very low (object storage)", "Higher (managed compute+storage)"],
          ["Best for", "Capture, ML, exploration", "BI, governed analytics"],
        ],
      },
      body2: "The modern answer is usually **both** — a *lakehouse* that keeps lake economics while adding warehouse-grade tables on top.",
    },
    {
      title: "Zones: raw → cleansed → curated",
      body: "A lake without structure becomes a 'data swamp'. The fix is logical **zones** (often implemented as the medallion Bronze/Silver/Gold layers): raw landing, a cleansed/conformed zone, and a curated zone of business-ready datasets. Each zone is a quality and trust checkpoint.",
      flow: ["Sources", "Raw / landing zone", "Cleansed zone", "Curated zone", "BI · SQL · ML"],
    },
    {
      title: "Ingestion: batch and streaming",
      body: "Data arrives two ways and the lake accepts both into the same storage. **Batch** ingestion lands files on a schedule (nightly table dumps, hourly log drops). **Streaming** ingestion lands events continuously (Kafka → object storage, or a streaming sink), usually as many small files that are later compacted.",
      bullets: [
        "**Batch:** bulk loads, CDC snapshots, periodic extracts.",
        "**Streaming:** event streams, change feeds, IoT telemetry.",
      ],
    },
    {
      title: "Governance: keeping it a lake, not a swamp",
      body: "Open, schema-less storage is powerful and dangerous. Without a catalog, lineage, and access control, nobody can find or trust the data. A real lake needs a **metadata catalog** (what tables/partitions exist and their schemas), **access control** (who can read what), and a **table format** (Delta/Iceberg/Hudi) to add ACID guarantees over the files.",
      rules: ["A lake is only as useful as its catalog — discoverability and trust are the hard part, not storage."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "The lake looks like 'just put files in a bucket', but the design decisions that matter are the layout, the catalog, and how you add transactions over immutable files.",
  deepDive: [
    {
      title: "Object storage is the foundation",
      body: "The whole architecture rests on one shift: separating storage from compute. Object storage is cheap, durable (11 nines), and infinitely scalable, and any number of compute engines can read the same files concurrently.",
      stats: [
        { value: "~$0.02/GB", label: "object storage, per month", tone: "green" },
        { value: "11 nines", label: "durability via replication", tone: "blue" },
        { value: "N engines", label: "Spark, Trino, warehouses — same files", tone: "accent" },
        { value: "Parquet", label: "open columnar default", tone: "amber" },
      ],
    },
    {
      title: "Lay the data out for pruning",
      body: "A lake query is only fast if the engine can skip most of the data. That comes from columnar formats (read only needed columns) plus partitioning (skip whole directories by a predicate like date), and from not drowning in tiny files.",
      steps: [
        { title: "Store in a columnar format (Parquet)", detail: "Column projection + compression + predicate push-down." },
        { title: "Partition by a common filter (e.g. event_date)", detail: "A query for one day scans one directory, not the table." },
        { title: "Keep files right-sized (~128MB–1GB)", detail: "Millions of tiny files wreck listing and scheduling — compact them." },
      ],
      callout: { tone: "key", label: "The swamp failure mode:", body: "An un-partitioned lake of millions of small JSON files with no catalog is slower and harder to use than the database it replaced. Layout and metadata are the real engineering." },
    },
    {
      title: "Add ACID with a table format",
      body: "Raw object storage has no transactions — a half-written job leaves garbage, and concurrent writers clash. Open table formats (Delta Lake, Apache Iceberg, Apache Hudi) add a transaction log over the Parquet files, giving atomic commits, snapshot isolation, schema evolution, and time travel — warehouse semantics at lake cost. This is what turns a lake into a *lakehouse*.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Cheap open storage for capture, a table format for ACID + time travel, and a catalog for discovery — so one copy of data serves BI, SQL and ML without lock-in.\"" },
    },
  ],
  qa: [
    {
      q: "What's the difference between a data lake and a data warehouse?",
      a: "A warehouse enforces a schema on write and stores data in a proprietary, SQL-optimized format — great for curated, governed BI. A lake stores raw data of any format on cheap object storage and applies schema on read — great for capture, exploration, and ML. The practical answer today is a lakehouse that combines both: lake storage economics plus warehouse-grade ACID tables via a table format.",
      tip: "Lead with schema-on-write vs schema-on-read and cost/format, then land on 'lakehouse = both' — that shows current practice.",
    },
    {
      q: "How do you stop a data lake from becoming a 'data swamp'?",
      a: "Add the structure that object storage lacks: logical zones (raw → cleansed → curated), a metadata catalog so datasets are discoverable with known schemas, partitioning and columnar formats so queries prune efficiently, compaction so you don't drown in small files, and access control + lineage so data is trustworthy. The storage is trivial; governance and layout are the real work.",
      tip: "Name the catalog and zones explicitly — 'swamp' is a governance/discoverability failure, not a storage one.",
    },
    {
      q: "Why store data in open formats like Parquet instead of a database?",
      a: "Open columnar formats decouple the data from any single engine: Spark, Trino, a warehouse, and ML frameworks can all read the same Parquet files, so there's no lock-in and no re-copying per tool. Columnar layout also gives compression and column projection, which make analytical scans far cheaper than row storage. You keep one copy of data and point many compute engines at it.",
      tip: "The 'one copy, many engines, no lock-in' point is the key architectural win of open formats.",
    },
    {
      q: "How does a table format (Delta/Iceberg/Hudi) change a lake?",
      a: "Plain object storage has no transactions, so partial writes corrupt data and concurrent writers conflict. A table format adds a transaction log over the files, providing atomic commits, snapshot isolation, schema evolution, and time travel. That gives warehouse-like correctness at lake cost — the basis of the lakehouse — so you can safely run updates, deletes (e.g. GDPR), and concurrent pipelines on lake data.",
      tip: "Frame it as 'ACID + time travel over immutable files' — that's the one-line value of a table format.",
    },
  ],
  related: [],
};
