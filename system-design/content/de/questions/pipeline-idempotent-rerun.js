export default {
  id: "pipeline-idempotent-rerun",
  question: "How do I make a data pipeline idempotent and safe to re-run?",
  icon: "♻️",
  difficulty: "Advanced",
  category: "Orchestration & Scheduling",
  tags: ["Orchestration", "Idempotency", "Reliability"],
  tldr: "Make re-running a task produce the same result as running it once: overwrite a partition instead of appending to it, MERGE on a key instead of INSERT, and publish atomically from staging. Then a retry, a backfill, or an overlapping run can never duplicate or corrupt data.",
  intro: "Pipelines fail halfway, get retried, and get backfilled — so every task will run more than once on the same input. Idempotency means that's safe: the second run leaves the data exactly as the first would have. Without it, a retry appends duplicate rows and a backfill double-counts. The core move is to make each run define the final state of its output, not add to whatever was there before.",
  steps: [
    {
      title: "Overwrite the partition, don't append to it",
      body: "The classic bug: a daily task does `INSERT INTO sales` for its date. Re-run it and that day's rows exist twice. The fix is to make the task own its output partition completely — delete-and-replace (or `INSERT OVERWRITE`) the `dt=…` partition it's responsible for. Running it once or five times yields identical data.",
      rules: ["A task should own and overwrite its output partition, not append to a shared table", "Re-running must replace, never accumulate"],
      body2: "This is why partitioning by the run's grain (usually date) and idempotency go hand in hand."
    },
    {
      title: "Upsert with MERGE instead of blind INSERT",
      body: "When output isn't cleanly partitioned by run, key it. MERGE (upsert) on the primary key: insert new keys, update existing ones. Applying the same rows again just rewrites them to the same values — a no-op. A plain INSERT of the same rows duplicates them.",
      bullets: [
        "MERGE on the business/primary key — insert-or-update.",
        "Re-applying identical rows becomes a no-op.",
        "Use a table format (Delta/Iceberg/Hudi) so MERGE is ACID on the lake."
      ]
    },
    {
      title: "Publish atomically from staging",
      body: "A task that crashes mid-write can leave half its output visible — partial, corrupt state. Write to a staging/temp location, then atomically swap it in (rename, partition swap, or a transactional commit) only when the whole run succeeded. Readers see either the old complete data or the new complete data, never a half-written mix.",
      rules: ["Write to staging, publish atomically — no partial output is ever visible", "A failed run should leave the previous good output intact"]
    },
    {
      title: "Key the run by its logical date, not wall-clock time",
      body: "Parameterize every task by the logical execution date it's processing, not `now()`. Then backfilling 2023-06-01 reprocesses exactly that partition, and a re-run of today redoes today — deterministically. Reading `now()` inside the task makes the output depend on when it ran, which breaks re-runs and backfills.",
      bullets: [
        "Pass the execution/logical date in; derive all windows from it.",
        "Backfill = run the same task with past dates — same code path.",
        "Avoid `now()`, random ids, and non-deterministic ordering in the logic."
      ]
    },
    {
      title: "Guard shared state and concurrency",
      body: "If two runs of the same task can overlap (a slow run and the next schedule), they can fight over the same partition. Bound concurrency or take a lock so only one run writes a given partition at a time — and because each run overwrites rather than appends, even an accidental overlap heals on the next clean run.",
      rules: ["Prevent overlapping runs from writing the same partition", "Idempotent overwrite means a bad run self-corrects on rerun"]
    }
  ],
  flow: [
    "Parameterize task by logical date",
    "Write output to staging",
    "Overwrite partition / MERGE on key",
    "Atomically publish on full success",
    "Rerun or backfill → identical result"
  ],
  checklist: [
    "Does re-running a task replace its partition rather than append?",
    "Where not partitioned, does it MERGE on a key so reapply is a no-op?",
    "Is output written to staging and published atomically?",
    "Is the task keyed by logical date, with no hidden now()/random dependence?",
    "Are overlapping runs prevented from writing the same partition?"
  ],
  widget: "de-idempotent",
  draft: false
};
