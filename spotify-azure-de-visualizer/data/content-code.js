/* ============================================================
   Code Explorer data (Iteration 7).
   Representative code with the 8-question treatment.
   All snippets are labelled "Illustrative" — they show the
   handbook's shape, not verbatim project source.
   ============================================================ */
window.CODE_SAMPLES = [
  {
    id: "adf_copy_expr", title: "ADF incremental Copy — source query",
    lang: "sql", tag: "handbook", source: "Module 3 — CPY_SQL_TO_BRONZE",
    code: `SELECT *\nFROM dbo.@{item().table_name}\nWHERE updated_at > '@{item().last_load_time}'\n  AND updated_at <= '@{variables('current_run_ts')}';`,
    does: "Reads only rows changed since the last successful watermark, bounded above by the timestamp captured at run start.",
    easy: "It asks the source for just the new/changed rows in a fixed time window — not the whole table.",
    tech: "A parameterized incremental predicate. <span class='k'>@{item().last_load_time}</span> is the lower boundary (stored watermark); <span class='k'>current_run_ts</span> is the upper boundary captured before the copy.",
    lines: [
      "<b>WHERE updated_at &gt; last_load_time</b> — skip already-loaded rows (lower bound).",
      "<b>AND updated_at &lt;= current_run_ts</b> — don't grab rows newer than this run's snapshot (upper bound), so mid-run inserts aren't lost."
    ],
    internal: "ADF pushes this predicate to Azure SQL, so only the delta is scanned and transferred — not a full table read.",
    why: "Both boundaries make each run an exact, repeatable window; the upper bound is the subtle correctness piece.",
    wrong: "Omit the upper bound and rows written during a long copy can be skipped forever; use >= instead of > and you reprocess the boundary row.",
    interview: "Why both a lower and an upper boundary on the incremental query?"
  },
  {
    id: "autoloader", title: "Auto Loader — cloudFiles stream",
    lang: "python", tag: "handbook", source: "Module 5 — Auto Loader",
    code: `df = (spark.readStream\n  .format("cloudFiles")\n  .option("cloudFiles.format", "parquet")\n  .option("cloudFiles.schemaLocation", checkpoint + "/schema")\n  .load(bronze_path))\n\n(df.writeStream\n  .option("checkpointLocation", checkpoint)\n  .trigger(availableNow=True)\n  .toTable("silver.stream_events"))`,
    does: "Incrementally reads only new Bronze files and writes them once to a Silver Delta table, then stops.",
    easy: "Watch the Bronze folder, pick up only files not seen before, write them to Silver, and shut down.",
    tech: "<span class='k'>cloudFiles</span> is the Auto Loader source; <span class='k'>schemaLocation</span> and <span class='k'>checkpointLocation</span> persist schema + processed-file/offset state; <span class='k'>availableNow=True</span> drains available data then terminates.",
    lines: [
      "<b>format('cloudFiles')</b> — the Auto Loader incremental source.",
      "<b>schemaLocation</b> — where inferred/evolved schema is tracked.",
      "<b>checkpointLocation</b> — offsets/commits/sources state → exactly-once.",
      "<b>trigger(availableNow=True)</b> — incremental batch, not always-on streaming."
    ],
    internal: "New files are recorded in the checkpoint's sources/ state; on restart the stream resumes from the last commit and skips processed files.",
    why: "Gives exactly-once + schema evolution with batch economics — compute terminates after draining the backlog.",
    wrong: "Sharing one checkpoint across two streams corrupts state; deleting the checkpoint causes full reprocessing.",
    interview: "Why availableNow instead of a continuous trigger here?"
  },
  {
    id: "merge_scd", title: "Idempotent upsert / SCD via MERGE",
    lang: "sql", tag: "handbook", source: "Module 8 — Delta MERGE / SCD",
    code: `MERGE INTO silver.users AS t\nUSING updates AS s\nON t.user_id = s.user_id\nWHEN MATCHED AND s.updated_at > t.updated_at\n  THEN UPDATE SET *\nWHEN NOT MATCHED\n  THEN INSERT *;`,
    does: "Upserts the latest version of each user by business key, keeping the newest record.",
    easy: "If the user already exists and the incoming row is newer, update it; otherwise insert it.",
    tech: "A Delta <span class='k'>MERGE</span> keyed on <span class='k'>user_id</span> with an <span class='k'>updated_at</span> recency guard — the basis of idempotent writes and SCD1. SCD2 extends this by closing the old row and inserting a new version.",
    lines: [
      "<b>ON t.user_id = s.user_id</b> — match by business key.",
      "<b>MATCHED AND s.updated_at &gt; t.updated_at</b> — only overwrite with a strictly newer row (idempotent on re-runs).",
      "<b>NOT MATCHED → INSERT</b> — brand new users are added."
    ],
    internal: "Delta MERGE is atomic via the transaction log; re-running the same batch converges to the same result — this is how duplicate Bronze rows (from a watermark failure) get absorbed.",
    why: "Makes the sink idempotent, so exactly-once at the source isn't required for correctness.",
    wrong: "Drop the updated_at guard and out-of-order batches can overwrite newer data with older.",
    interview: "How does MERGE make reprocessing safe after a duplicate load?"
  },
  {
    id: "dlt_expect", title: "DLT expectation (data quality)",
    lang: "python", tag: "handbook", source: "Module 9 — DLT Expectations",
    code: `@dlt.table(name="silver_users")\n@dlt.expect_or_drop("valid_id", "user_id IS NOT NULL")\n@dlt.expect_or_warn("known_plan", "plan IN ('free','premium','family','student')")\ndef silver_users():\n    return dlt.read_stream("bronze_users")`,
    does: "Builds a Silver table that drops rows with a NULL id and warns on unknown plan values.",
    easy: "Quietly throw away rows missing a key; log (but keep) rows with an odd plan value.",
    tech: "DLT <span class='k'>expect_or_drop</span> quarantines violating rows; <span class='k'>expect_or_warn</span> allows them but records a violation metric. <span class='k'>expect_or_fail</span> (not shown) would abort the update.",
    lines: [
      "<b>expect_or_drop('valid_id', ...)</b> — a NULL user_id is dropped (protect the key).",
      "<b>expect_or_warn('known_plan', ...)</b> — unexpected plan values pass but are counted."
    ],
    internal: "Each expectation emits pass/fail counts to the DLT event log, so quality is observable and alertable over time.",
    why: "Choose the mode per rule by severity: drop junk, warn on soft signals, fail to protect a critical table.",
    wrong: "expect_or_fail on a noisy soft rule causes needless outages; warn on a critical rule lets bad data through.",
    interview: "When would you pick drop vs fail for an expectation?"
  }
];
