export default {
  id: "cdc-pipeline",
  title: "Change data capture (CDC)",
  icon: "📝",
  chapter: 12,
  group: "Ingestion & pipelines",
  summary: "Instead of re-copying a whole table every run, CDC tails the source database's commit log and streams only the row-level changes — inserts, updates, deletes — to a target that applies them and stays in sync. It's how you get near-real-time replication to a lake or warehouse cheaply.",
  widget: "de-cdc",
  widgetIntro: "The core idea: a database already writes every change to a durable **commit log** (the WAL/binlog) for its own recovery. CDC **reads that log** and turns each committed change into an event — `INSERT`, `UPDATE`, or `DELETE` — which a target applies to stay in sync.\n\nMutate the source and watch change events flow to the target, then hit **Full reload** to see the contrast: CDC moves a handful of changed rows while a reload re-copies the entire table. That difference is why CDC powers low-latency, low-cost replication.",
  sections: [
    {
      title: "The problem CDC solves",
      body: "You need a copy of an operational database in your lake or warehouse, kept fresh. The naive approach — periodically dump the whole table — is slow, expensive, loads the source, and is always stale between runs. CDC moves only what changed, continuously, so the target tracks the source in near-real-time at a fraction of the cost.",
      bullets: [
        "**Full reload:** re-copies everything every run — O(table size), high load, stale.",
        "**Query-based incremental:** `WHERE updated_at > last_run` — misses deletes, needs a reliable timestamp.",
        "**Log-based CDC:** reads the commit log — captures every change including deletes, low source impact.",
      ],
      rules: ["Log-based CDC moves O(changes), not O(table size) — the key efficiency win."],
    },
    {
      title: "How log-based CDC works",
      body: "Every transactional database writes a durable, ordered log of changes for crash recovery and replication — Postgres WAL, MySQL binlog, Oracle redo, Mongo oplog. CDC connects as a replication consumer, reads committed changes in commit order, and emits them as structured events with before/after images.",
      flow: ["Source DB", "commit log (WAL / binlog)", "CDC reader", "change events (I/U/D)", "target applies"],
      body2: "Because it reads the log rather than querying tables, CDC adds almost no load to the source and never misses a change — including deletes, which timestamp-based polling can't see.",
    },
    {
      title: "The shape of a change event",
      body: "Each event carries the operation, the primary key, and the row image(s) plus metadata (table, commit LSN/offset, timestamp). A common envelope (e.g. Debezium's) includes `op` (c/u/d), `before`, and `after`.",
      table: {
        head: ["Op", "Meaning", "Payload"],
        rows: [
          ["c (create)", "INSERT", "after = new row"],
          ["u (update)", "UPDATE", "before + after"],
          ["d (delete)", "DELETE", "before = removed row"],
        ],
      },
    },
    {
      title: "Applying changes at the target",
      body: "The target applies events in order. In a mutable store you UPSERT inserts/updates by primary key and delete on deletes. In an append-only lake you can't update in place, so you either append the change events and resolve the latest per key at read time, or periodically MERGE them into a table-format table (Delta/Iceberg) to materialize current state.",
      bullets: [
        "**Warehouse / OLTP target:** UPSERT by primary key; apply deletes directly.",
        "**Lake target:** append events, then MERGE into a table-format table for current state.",
      ],
    },
    {
      title: "Snapshot + stream",
      body: "The log only goes back so far, so CDC starts with an initial **snapshot** of the existing table, then switches to streaming the log from the snapshot's position. Getting the hand-off exactly right — no gaps, no duplicates across the snapshot/stream boundary — is the trickiest part of a CDC system.",
      rules: ["Initial snapshot → then stream from that log position: the boundary must not drop or duplicate rows."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "CDC is simple in principle and full of sharp edges in practice: ordering, exactly-once, deletes, and schema changes are where designs live or die.",
  deepDive: [
    {
      title: "Why log-based beats polling",
      body: "Query-based CDC (`WHERE updated_at > x`) seems simpler but has real holes: it can't see hard deletes, it misses intermediate states between polls, it needs a trustworthy monotonic column, and it scans the source. Log-based CDC captures every committed change in order with near-zero source load.",
      stats: [
        { value: "O(changes)", label: "data moved per run", tone: "green" },
        { value: "~0 load", label: "reads the log, not the tables", tone: "blue" },
        { value: "deletes ✓", label: "captured — polling can't", tone: "accent" },
        { value: "ordered", label: "commit-order stream", tone: "amber" },
      ],
    },
    {
      title: "Ordering and exactly-once",
      body: "Changes to the same key must be applied in commit order or the target ends up wrong (an update landing before its insert). Partition the change stream by primary key to preserve per-key order, and make the apply idempotent so re-delivered events don't corrupt state.",
      steps: [
        { title: "Preserve per-key order", detail: "Key the stream by PK so one key's changes stay ordered." },
        { title: "Idempotent apply (UPSERT / MERGE)", detail: "Re-applying the same event is a no-op, so at-least-once delivery is safe." },
        { title: "Track the log offset (LSN) you've applied", detail: "Resume exactly where you left off after a restart." },
      ],
      callout: { tone: "key", label: "At-least-once + idempotent = effectively-once:", body: "Most CDC stacks deliver at-least-once and rely on idempotent UPSERT/MERGE by primary key to make re-delivery harmless — that's how you get correct state without true exactly-once." },
    },
    {
      title: "Deletes and schema drift",
      body: "Hard deletes must propagate or the target keeps ghost rows — a key reason to prefer log-based CDC. Many teams apply them as soft deletes (a tombstone flag) downstream for auditability. Schema changes on the source (a new column, a type change) flow through the log too, and the pipeline must evolve the target schema without breaking — table formats with schema evolution make this manageable.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Log-based CDC keyed by primary key, at-least-once with idempotent MERGE into an Iceberg/Delta table, snapshot-then-stream for bootstrap, and deletes propagated as tombstones — near-real-time sync that moves only changes.\"" },
    },
  ],
  qa: [
    {
      q: "What is CDC and why use it instead of a full reload?",
      a: "Change data capture streams only the row-level changes (inserts, updates, deletes) from a source database to a target, rather than re-copying the whole table. Log-based CDC reads the database's own commit log (WAL/binlog), so it moves O(changes) instead of O(table size), adds almost no load to the source, captures deletes, and keeps the target fresh in near-real-time. Full reloads are expensive, stressful on the source, and stale between runs.",
      tip: "Lead with 'moves only what changed, by reading the commit log' — that one line captures the cost and freshness win.",
    },
    {
      q: "Log-based vs query-based (timestamp) CDC — what's the difference?",
      a: "Query-based CDC polls the source with something like `WHERE updated_at > last_run`. It's simple but can't detect hard deletes, misses intermediate changes between polls, requires a reliable monotonically-increasing column, and scans the source. Log-based CDC reads the commit log directly, capturing every committed change in order — including deletes — with negligible source load. Log-based is the robust choice; query-based is a pragmatic fallback when you can't access the log.",
      tip: "The 'can't see deletes / misses intermediate states' limitations of polling are the key discriminators.",
    },
    {
      q: "How do you guarantee the target ends up correct with at-least-once delivery?",
      a: "Preserve ordering and make the apply idempotent. Key the change stream by primary key so changes to one row stay in commit order, then apply via UPSERT (or MERGE into a table-format table) so re-delivering the same event is a no-op. Track the log offset (LSN) you've committed so you resume exactly where you left off. At-least-once delivery plus idempotent, ordered apply gives effectively-once correctness without needing true exactly-once.",
      tip: "'Idempotent UPSERT by PK + per-key ordering + offset tracking' is the complete correctness answer.",
    },
    {
      q: "How do you bootstrap CDC for a table that already has data?",
      a: "Take an initial consistent snapshot of the existing table, then switch to streaming the commit log from the exact position the snapshot was taken. The hard part is the hand-off: the boundary between snapshot and stream must neither drop changes that happened during the snapshot nor duplicate them. Mature frameworks (e.g. Debezium) handle this with careful watermarking; conceptually it's 'snapshot, record the log offset, then stream from there, de-duplicating by key'.",
      tip: "Name the snapshot-then-stream pattern and the boundary hazard — that's where real CDC systems get subtle.",
    },
  ],
  related: [],
};
