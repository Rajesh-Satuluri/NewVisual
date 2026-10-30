export default {
  id: "cdc-sync-database-into-lake",
  question: "How do I design a CDC pipeline to sync a database into the lake?",
  icon: "🔄",
  difficulty: "Advanced",
  category: "Ingestion & CDC",
  tags: ["CDC", "Ingestion", "Streaming"],
  tldr: "Read the database's own change log, land an initial snapshot at a known log position, then stream inserts/updates/deletes from that exact offset and MERGE them into the lake — so you move only what changed, never miss a row, and never apply one twice.",
  intro: "Change Data Capture (CDC) keeps a copy of a source database in the lake by capturing row-level changes — inserts, updates, deletes — instead of re-exporting the whole table every run. The trick is doing it without gaps or duplicates: the stream of changes must line up exactly with a one-time snapshot, and applying a change twice must land you in the same place as applying it once.",
  steps: [
    {
      title: "Capture changes from the log, not by polling",
      body: "The cheapest, most complete source of changes is the database's own write-ahead log (Postgres WAL, MySQL binlog, Oracle redo). A log reader (Debezium and friends) emits an ordered event per committed row change with its before/after image. This beats polling `updated_at`, which misses hard deletes and any row that changed without touching the timestamp.",
      rules: ["Log-based CDC captures deletes; timestamp polling does not", "Events are ordered per table/partition — preserve that order downstream"],
      body2: "Where there is genuinely no log access, fall back to periodic snapshot-diffing, accepting coarser latency and no true delete capture."
    },
    {
      title: "Take the initial snapshot at a known log position",
      body: "Before streaming, you need the whole table once. Record the current log offset (LSN/SCN/binlog position), take a consistent snapshot as of that offset, then start the change stream from exactly that point. This is the seam where gaps and duplicates are born.",
      bullets: [
        "Snapshot and remember the log offset it corresponds to.",
        "Start streaming changes from that same offset (overlap slightly rather than risk a gap).",
        "Because apply is idempotent (next step), a little overlap is harmless — a missed range is not."
      ]
    },
    {
      title: "Land raw changes immutably, then MERGE into the target",
      body: "Write the raw change events to an append-only landing zone first (replayable source of truth), then apply them to the curated table. Applying means an upsert: MERGE on the primary key — insert new keys, update changed keys, and turn deletes into tombstones (soft delete) so downstream consumers can see that a row went away.",
      rules: ["MERGE on the primary key makes re-applying a change a no-op", "Model deletes as tombstones, not silent row removal"],
      body2: "Use a table format (Delta/Iceberg/Hudi) so these row-level upserts and deletes are ACID on the lake instead of partition rewrites by hand."
    },
    {
      title: "Order and collapse changes per key",
      body: "Several changes to the same row can arrive in one batch. Apply only the latest version per key (order by the log sequence number / commit timestamp), so an insert-then-update-then-delete collapses to a single delete rather than fighting each other. Out-of-order application corrupts the row.",
      bullets: [
        "Rank events per key by log position; keep the last.",
        "Respect per-key ordering — the same key must not be applied out of sequence.",
        "A tombstone must win over an earlier update for the same key."
      ]
    },
    {
      title: "Handle schema changes and failures",
      body: "Sources add and drop columns. Propagate additive changes automatically (new column → new column downstream) and quarantine breaking ones rather than crashing the pipeline. Checkpoint the committed log offset after each batch so a crash resumes from the last applied position — exactly where idempotent MERGE makes a safe overlap possible.",
      rules: ["Checkpoint the log offset so restarts resume, not restart", "Evolve additively; quarantine breaking schema changes"]
    }
  ],
  flow: [
    "Snapshot table @ log offset X",
    "Stream changes from offset X",
    "Land raw changes (append-only)",
    "Collapse to latest version per key",
    "MERGE into curated table (upsert + tombstone)",
    "Checkpoint offset"
  ],
  checklist: [
    "Is the snapshot pinned to a known log offset the stream continues from?",
    "Does apply MERGE on the primary key so re-applying a change is a no-op?",
    "Are deletes captured and modeled as tombstones?",
    "Are changes ordered per key so the latest version wins?",
    "Is the committed log offset checkpointed for safe restart?"
  ],
  widget: "de-cdc",
  draft: false
};
