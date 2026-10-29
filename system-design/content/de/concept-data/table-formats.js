export default {
  id: "table-formats",
  title: "Open table formats (Delta, Iceberg, Hudi)",
  icon: "🧊",
  chapter: 8,
  group: "Storage & table formats",
  summary: "Open table formats add a transaction log over the data files in a lake, turning a pile of Parquet into a real table: atomic commits, snapshot isolation, schema evolution, and time travel. They're what make a lake behave like a warehouse — the heart of the lakehouse.",
  widget: "de-table-format",
  widgetIntro: "Raw object storage has no transactions — a half-finished write leaves garbage and two writers clobber each other. A table format fixes this with a **commit log**: each change (append, overwrite, delete) is recorded as an atomic commit that points at a consistent set of data files, producing a new **snapshot** of the table.\n\nMake commits and watch the log grow; each one flips the table to a new version atomically. Then **time travel** to an earlier version and see the reader pinned to that snapshot while new writes land — snapshot isolation in action.",
  sections: [
    {
      title: "The problem: files aren't a table",
      body: "A directory of Parquet files has no notion of a transaction. If a job writing 100 files dies at file 60, readers see a corrupt half-table. Two concurrent writers can overwrite each other's files. There's no way to update or delete a row, or to ask 'what did this table look like yesterday'. Table formats add the missing layer.",
      rules: ["A table format = a transaction log over data files that makes the file set behave like an ACID table."],
    },
    {
      title: "How it works: a commit log over files",
      body: "The format keeps a metadata log alongside the Parquet files. Each commit atomically records which files are added and removed, producing a new immutable **snapshot** (version). Readers read a snapshot — a fixed list of files — so they always see a consistent table and never a partial write.",
      flow: ["data files (Parquet)", "+ transaction log", "= versioned, ACID table"],
      body2: "Because every version is just a pointer to a set of files, old snapshots remain readable until cleaned up — that's what enables time travel and safe rollback.",
    },
    {
      title: "What you get",
      body: "The log unlocks warehouse semantics on lake storage:",
      bullets: [
        "**ACID commits:** a write is all-or-nothing; readers never see a partial result.",
        "**Snapshot isolation:** readers see a consistent version while writers commit new ones.",
        "**Time travel:** query the table as of an old version or timestamp; roll back a bad write.",
        "**Row-level UPDATE/DELETE/MERGE:** essential for CDC apply and GDPR deletes.",
        "**Schema evolution:** add/rename/retype columns without rewriting data.",
      ],
    },
    {
      title: "Delta vs Iceberg vs Hudi",
      body: "The three open formats solve the same problem with different emphases. All give ACID + time travel; the differences are ecosystem and write patterns.",
      table: {
        head: ["Format", "Origin / strength"],
        rows: [
          ["Delta Lake", "Databricks/Spark-centric; simple, widely used"],
          ["Apache Iceberg", "Engine-neutral, hidden partitioning, strong catalog spec; broad adoption"],
          ["Apache Hudi", "Upsert/streaming-first; good for CDC and incremental"],
        ],
      },
      body2: "The choice is increasingly about your engine/catalog ecosystem rather than core capability — all three deliver the lakehouse basics.",
    },
    {
      title: "The maintenance cost",
      body: "The log and snapshots need upkeep: **compaction** merges small files, **expiring snapshots** and **vacuuming** remove old data files so storage and metadata don't grow forever, and clustering/sorting keeps reads fast. A neglected table format table gets slow and expensive just like a raw lake.",
      rules: ["Budget for table maintenance — compaction, snapshot expiry, vacuum — or the table degrades over time."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "The subtle parts are how commits stay atomic on object storage and how concurrent writers are reconciled.",
  deepDive: [
    {
      title: "Atomic commits on eventually-consistent storage",
      body: "A commit becomes visible by atomically writing or swapping a single metadata pointer to the new snapshot — so the switch from version N to N+1 is instant and all-or-nothing, even though it references many data files. Writers stage their data files first (invisible), then commit the metadata; a crash mid-write leaves orphaned files that vacuum cleans, never a visible partial table.",
      stats: [
        { value: "atomic", label: "one metadata swap = new version", tone: "green" },
        { value: "snapshot", label: "readers pin a file list", tone: "blue" },
        { value: "optimistic", label: "concurrency control on commit", tone: "accent" },
        { value: "vacuum", label: "reclaim orphaned/old files", tone: "amber" },
      ],
    },
    {
      title: "Concurrent writers",
      body: "Writers use optimistic concurrency: each prepares a commit against the snapshot it read, and at commit time checks nothing conflicting changed. If another writer committed first, it retries against the new snapshot (or fails for a true conflict). This gives serializable-ish behavior without locking the whole table — essential for streaming + batch writing the same table.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"A table format is a transaction log over Parquet: atomic metadata commits for ACID, immutable snapshots for isolation and time travel, optimistic concurrency for multi-writer, plus MERGE for CDC and GDPR. That's the lakehouse — warehouse semantics at lake cost — if you keep up compaction and vacuum.\"" },
    },
  ],
  qa: [
    {
      q: "What problem do open table formats solve?",
      a: "They add transactions to a lake. Raw object storage is just files, so a failed write leaves a corrupt partial table, concurrent writers clobber each other, and there's no UPDATE/DELETE or history. A table format (Delta, Iceberg, Hudi) keeps a transaction log over the Parquet files, giving atomic commits, snapshot isolation, time travel, row-level updates/deletes, and schema evolution — warehouse-grade correctness on cheap lake storage, which is the foundation of the lakehouse.",
      tip: "Lead with 'adds a transaction log over files → ACID + time travel + row-level ops'; that's the whole value.",
    },
    {
      q: "How does a table format keep commits atomic and isolate readers?",
      a: "Each change is recorded as a commit that atomically swaps a single metadata pointer to a new immutable snapshot — a fixed list of data files. Writers stage data files invisibly, then flip the pointer, so readers either see the old snapshot or the new one, never a half-written state. Readers pin a snapshot for the duration of their query (snapshot isolation), so concurrent writes committing new versions don't affect them. Old snapshots stay readable, which is what enables time travel and rollback.",
      tip: "The 'atomic metadata pointer swap + immutable snapshots' mechanism is the key; connect it to isolation and time travel.",
    },
    {
      q: "Why are table formats essential for CDC and GDPR?",
      a: "Both need row-level mutation, which raw Parquet can't do. CDC must apply inserts, updates, and deletes to keep a target in sync — a MERGE into a table-format table does exactly that idempotently. GDPR 'right to be forgotten' requires deleting specific users' rows, which again needs row-level DELETE. Table formats provide UPDATE/DELETE/MERGE over immutable files (via copy-on-write or merge-on-read), making these operations correct and tractable on a lake.",
      tip: "MERGE for CDC apply and DELETE for GDPR are the two concrete drivers — mention merge-on-read vs copy-on-write.",
    },
    {
      q: "What maintenance do table-format tables need?",
      a: "They aren't free. Streaming and frequent commits create many small files, so you run compaction to merge them into right-sized files. Old snapshots and the data files they reference accumulate, so you expire snapshots and vacuum to reclaim storage and keep metadata small — while retaining enough history for your time-travel needs. You may also re-cluster/sort for read performance. Skip this upkeep and the table slowly degrades into the same small-file, slow-metadata mess as a raw lake.",
      tip: "Compaction + snapshot expiry + vacuum is the maintenance triad — note it trades against time-travel retention.",
    },
  ],
  related: [],
};
