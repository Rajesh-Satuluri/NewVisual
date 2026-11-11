export default {
  id: "migrate-huge-table",
  question: "How do I design a migration strategy for a huge table?",
  icon: "🧱",
  difficulty: "Advanced",
  category: "Data Modeling Storage & Indexing",
  tags: ["Databases", "Reliability", "Storage"],
  tldr: "Change the schema or move the data without downtime or corruption — in phases, not one heroic query.",
  intro: "For a huge table, the goal is simple: change the schema or move the data without taking the system down or corrupting it. You do that in phases, not in one big heroic query.",
  steps: [
    {
      title: "Get clear on what is changing",
      body: "Write down exactly what is changing: are you adding columns, splitting one table into two, or moving to a new DB? Are keys or constraints changing? Does any application logic need to change with it? This decides whether you can do an in-place migration or need a full online migration with dual writes."
    },
    {
      title: "Pick the migration style",
      body: "For very large tables you almost never want a single big lock and rewrite.",
      table: {
        head: ["Approach", "Description", "When to use"],
        rows: [
          ["Big bang", "One long blocking migration", "Small data, low traffic"],
          ["Online phased", "Backfill in background, then cut over", "Large tables, live production"]
        ]
      },
      body2: "For a huge table in production, you pick online phased almost every time."
    },
    {
      title: "Backfill in small, safe batches",
      body: "If you are creating a new table or new columns, add the new schema first with code still using the old path. Then write a backfill job that processes rows in small batches (by primary-key range or by time), marks progress in a checkpoint so it can resume, and runs rate-limited so it does not kill the database.",
      rules: [
        "Never update all rows in one transaction",
        "Prefer many small, idempotent transactions",
        "Log how many rows are pending, done, and failed"
      ]
    },
    {
      title: "Use dual writes and dual reads for a while",
      body: "Backfill fixes historical data; dual writes keep new data in sync while the backfill runs. Dual writes come two ways. (1) Application-level: every change writes to both old and new — wherever you wrote once, you now write twice. (2) Via CDC: the app writes only to the primary store, and Change Data Capture streams changes from the transaction log into the new structure. Both converge old and new as soon as new data is written.",
      body2: "Dual reads: prefer the new structure when the record is present and marked migrated; fall back to the old structure otherwise. Optionally write-through into the new source on a fallback so future reads skip the old path. Verify with sampled row comparisons, count/checksum jobs, and metrics like read-fallback rate and mismatched-value count. Exit once backfill is complete, dual writes work, and new reads match old reads."
    },
    {
      title: "Cut over, monitor, and clean up",
      body: "Flip a feature flag so all reads use the new table/schema, watch errors, latency, and key metrics closely, and keep a quick rollback (config flip back to old reads) ready. After a steady period with no issues, stop writing to the old structure, take a backup, drop old columns/tables, and remove old code paths, flags, and jobs.",
      body2: "Before you call it done: Can any writer still write the old table/shape by mistake? Do any background jobs or scripts still depend on the old schema? Is monitoring in place for the new path?"
    }
  ],
  flow: [
    "Add new schema (old path still live)",
    "Backfill old rows in batches",
    "Dual write + dual read (keep in sync)",
    "Verify old vs new match",
    "Cut over reads (feature flag)",
    "Stop old writes, drop old, clean up"
  ],
  checklist: [
    "Can any writer still write the old table/shape by mistake?",
    "Do any background jobs or scripts still depend on the old schema?",
    "Is monitoring in place for the new path?",
    "Is there a tested rollback (flip reads back to old)?"
  ],
  draft: false
};
