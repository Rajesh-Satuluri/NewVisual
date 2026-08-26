/* ============================================================
   Content records for Iteration 2 (batch/incremental) and
   Iteration 3 (streaming/internals). Extends window.CONTENT.
   Same 9-layer contract + source traceability + tags.
   ============================================================ */
(function () {
  const add = (obj) => Object.assign(window.CONTENT, obj);

  add({
    /* ---- ADF pipeline activities (Module 3) ---- */
    act_lookup: {
      id: "act_lookup", title: "Lookup — LKP_GET_TABLE_METADATA", icon: "🔎",
      tech: "Lookup activity · reads control table", tag: "handbook",
      source: { module: "Module 3", section: "Pipeline flow — activity [1]" },
      layers: {
        simple: "<p>The first step reads the <strong>list of tables to load</strong> from a control table, so the pipeline knows what work to do.</p>",
        technical: "<p><span class='k'>SELECT * FROM metadata.watermark_table WHERE is_active=1</span> → returns an array of <span class='k'>{table_name, last_load_time, container_name, folder_path}</span> that the ForEach iterates over.</p>",
        internals: "<p>A Lookup activity runs the query once and holds the whole result set in pipeline memory as an array, exposed to downstream activities via <span class='k'>@activity('LKP_GET_TABLE_METADATA').output.value</span>.</p>",
        implementation: "<p>This is what makes the pipeline <strong>metadata-driven</strong>: adding a table = one row here, no pipeline change.</p>",
        failure: "<p>If the control table is unreachable the whole run fails fast (nothing to iterate) and the On-Failure alert fires — safe, because no watermark advances.</p>",
        interview: [{ q: "Why a Lookup instead of hardcoding tables?", a: "So table onboarding is configuration, not code — the core metadata-driven benefit." }]
      },
      related: ["adf", "watermark"]
    },
    act_foreach: {
      id: "act_foreach", title: "ForEach — FE_PROCESS_ALL_TABLES", icon: "🔁",
      tech: "ForEach · batchCount = 5", tag: "handbook",
      source: { module: "Module 3", section: "Pipeline flow — activity [2]" },
      layers: {
        simple: "<p>Loops over each table from the Lookup and runs the copy steps — <strong>5 tables at a time</strong>.</p>",
        technical: "<p>ForEach with <span class='k'>batchCount=5</span> gives bounded parallelism: up to 5 iterations execute concurrently, each carrying one <span class='k'>@item()</span> (one table's metadata).</p>",
        internals: "<p>ADF schedules iterations across its integration runtime; <span class='k'>@item().folder_path</span>, <span class='k'>@item().last_load_time</span> etc. parameterize the inner activities per table.</p>",
        why: "<p>Parallelism cuts wall-clock time; capping at 5 protects the source from too many concurrent connections.</p>",
        tradeoffs: "<p><strong>Gain:</strong> faster loads. <strong>Cost:</strong> more concurrent source load; the batch count must respect Azure SQL connection/DTU limits.</p>",
        failure: "<p>One iteration failing doesn't stop the others; each table's watermark advances independently, so partial success is well-defined.</p>",
        interview: [{ q: "What does batchCount control and how would you tune it for 1,000 tables?", a: "Concurrent iterations. For 1,000 tables you'd raise it cautiously against source limits, or shard the metadata across runs — it's the main scaling knob." }]
      },
      related: ["adf", "act_copy"]
    },
    act_scriptTs: {
      id: "act_scriptTs", title: "Script — SCR_GET_CURRENT_TIMESTAMP", icon: "🕐",
      tech: "Script · SELECT GETUTCDATE()", tag: "handbook",
      source: { module: "Module 3", section: "Pipeline flow — activity [3]" },
      layers: {
        simple: "<p>Grabs 'now' <strong>before</strong> copying, and remembers it — this becomes the new bookmark if the copy succeeds.</p>",
        technical: "<p><span class='k'>SELECT GETUTCDATE() AS current_ts</span> stored into pipeline variable <span class='k'>current_run_ts</span>. It fixes the <strong>upper boundary</strong> of the extraction window.</p>",
        internals: "<p>Capturing the timestamp up front (not after the copy) means any rows written to the source <em>during</em> the copy fall after <span class='k'>current_ts</span> and are picked up next run — never skipped.</p>",
        why: "<p>Correctness: without a fixed upper boundary, a long-running copy could leave a gap of rows that are newer than the copy snapshot but older than a post-copy 'now'.</p>",
        interview: [{ q: "Why capture the timestamp before the copy?", a: "To bound the window's top edge so mid-run inserts aren't lost — they're simply beyond current_ts and handled next run." }]
      },
      related: ["watermark", "adf"]
    },
    act_copy: {
      id: "act_copy", title: "Copy — CPY_SQL_TO_BRONZE", icon: "📤",
      tech: "Copy · SQL → Bronze Parquet", tag: "handbook",
      source: { module: "Module 3", section: "Pipeline flow — activity [4]" },
      layers: {
        simple: "<p>Copies only the new/changed rows from SQL into the Bronze lake as Parquet.</p>",
        technical: "<p>Source query filters <span class='k'>WHERE updated_at &gt; @{item().last_load_time}</span>; sink writes <span class='k'>bronze/{folder_path}/dt=.../file.parquet</span>.</p>",
        internals: "<p>ADF streams rows through its integration runtime SQL→Parquet, applying the incremental predicate at the source so only the delta crosses the wire.</p>",
        why: "<p>Incremental copy keeps each run tiny and cheap versus full extraction.</p>",
        failure: "<p>If the copy fails, the downstream watermark update never runs, so the window is safely retried next time. If the copy <em>succeeds</em> but the watermark update later fails → duplicates (see the Watermark Failure Simulator).</p>",
        interview: [{ q: "Where is the incremental filter applied — source or sink?", a: "At the source, so only changed rows are read and transferred; applying it later would waste I/O." }]
      },
      related: ["watermark", "bronze", "act_scriptWm"]
    },
    act_scriptWm: {
      id: "act_scriptWm", title: "Script — SCR_UPDATE_WATERMARK", icon: "✅",
      tech: "Script · UPDATE watermark_table", tag: "handbook",
      source: { module: "Module 3", section: "Pipeline flow — activity [5]" },
      layers: {
        simple: "<p>Only after a successful copy, moves the bookmark forward to the timestamp captured earlier.</p>",
        technical: "<p><span class='k'>UPDATE watermark_table SET last_load_time = @{variables(current_run_ts)}</span> for this table.</p>",
        internals: "<p>Runs as a distinct activity <em>after</em> the copy, so success/failure of the copy gates whether the watermark advances — the source of the pipeline's idempotency.</p>",
        why: "<p>Update-on-success only gives self-healing restarts: a failed run leaves the old watermark, so the next run re-reads the same safe window.</p>",
        failure: "<p>If this update fails after a good copy, the old watermark remains → next run reprocesses → duplicates. Prevention: keep it idempotent + dedup downstream.</p>",
        interview: [{ q: "Why update the watermark in a separate step after copy?", a: "So the advance is conditional on copy success — never lose or skip data on failure." }]
      },
      related: ["watermark", "act_copy"]
    },
    act_web: {
      id: "act_web", title: "On Failure — WEB_TRIGGER_LOGIC_APP", icon: "🚨",
      tech: "Web activity · POST to Logic App", tag: "handbook",
      source: { module: "Module 3 & 4", section: "On-Failure path; Monitoring" },
      layers: {
        simple: "<p>If anything fails, this posts an alert so an engineer gets an email.</p>",
        technical: "<p>Web activity <span class='k'>POST</span>s to an Azure Logic App HTTP trigger with the pipeline name, error message, and run ID.</p>",
        internals: "<p>The Logic App receives the JSON payload and sends a notification (email), turning a silent failure into an actionable alert with a Run ID to investigate.</p>",
        why: "<p>Unmonitored pipelines fail silently; wiring failure → alert → engineer is basic production hygiene (Module 4).</p>",
        interview: [{ q: "How would you design production monitoring for this pipeline?", a: "On-failure Web activity → Logic App → email, carrying the Run ID so the on-call can open ADF Monitor and root-cause quickly." }]
      },
      related: ["monitoring", "adf"]
    },

    /* ---- Delta Lake internals (Module 5/8) ---- */
    delta: {
      id: "delta", title: "Delta Lake", icon: "🔺",
      tech: "Parquet + _delta_log · ACID", tag: "handbook",
      source: { module: "Module 5 & 8", section: "Delta tables (Silver/Gold)" },
      why: "Delta gives the lake ACID transactions, schema enforcement, time travel and safe concurrent writes on top of plain Parquet.",
      layers: {
        simple: "<p>Delta is <strong>Parquet files plus a logbook</strong>. The logbook records every change so the table behaves like a reliable database — you can undo, time-travel, and never see half-written data.</p>",
        technical: "<p>A Delta table = data <strong>Parquet files</strong> + a <span class='k'>_delta_log</span> transaction log of JSON commits. Each commit lists <strong>add</strong>/<strong>remove</strong> file actions, giving <strong>ACID</strong>, schema enforcement/evolution, time travel, and optimistic concurrency.</p>",
        internals: "<p>A write creates new Parquet files and appends a commit (e.g. <span class='k'>000001.json</span>) with <span class='k'>add</span> actions (and <span class='k'>remove</span> for files it supersedes). Readers compute the current snapshot by replaying the log. Concurrent writers use optimistic concurrency — conflicts abort and retry.</p>",
        implementation: "<p>Silver and Gold are Delta tables. <span class='k'>MERGE</span> powers idempotent upserts (dedup, SCD), and time travel (<span class='k'>VERSION AS OF</span>) supports rollback/recovery.</p>",
        why: "<p>Plain Parquet has no transactions — a failed job can leave partial files and readers can see garbage. Delta's log makes writes atomic and recoverable.</p>",
        tradeoffs: "<p><strong>Gain:</strong> ACID, rollback, evolution, MERGE. <strong>Cost:</strong> small-file/log growth needs maintenance (OPTIMIZE/VACUUM); slightly more write overhead than raw Parquet.</p>",
        failure: "<p><strong>Corruption / bad write →</strong> roll back via time travel to the last good version; because the log is append-only, prior versions remain readable until vacuumed.</p>",
        interview: [
          { q: "What does the _delta_log contain?", a: "Ordered JSON commits of add/remove file actions plus metadata/schema — replaying them yields the current table snapshot." },
          { q: "How does Delta give exactly-once with streaming?", a: "Commits are atomic and idempotent by version; combined with checkpoint offsets, a retried micro-batch commits once." }
        ],
        followup: ["How are concurrent writes handled? → optimistic concurrency, conflict → abort/retry.", "How do you reclaim space? → OPTIMIZE (compaction) + VACUUM (remove old files)."]
      },
      whatif: [{ q: "What if two jobs write the same Delta table at once?", a: "Optimistic concurrency: each reads a snapshot version, and the second committer detects the version changed under it, aborts, and retries against the new snapshot — no corruption, at the cost of a retry." }],
      related: ["silver", "checkpoint", "gold"]
    },

    /* ---- Structured Streaming triggers (Module 5) ---- */
    streaming: {
      id: "streaming", title: "Structured Streaming — Triggers", icon: "🌊",
      tech: "availableNow · processingTime · continuous", tag: "handbook",
      source: { module: "Module 5", section: "Auto Loader & Structured Streaming" },
      why: "The trigger mode decides the cost/latency profile. The project uses availableNow=True — incremental batch, not always-on streaming.",
      layers: {
        simple: "<p>The <strong>trigger</strong> decides how often the stream runs: once-through-and-stop, every N minutes, or truly continuous. This project runs it <strong>once through the available files, then stops</strong>.</p>",
        technical: "<p>Micro-batch pipeline: <span class='k'>Trigger → Input → Micro-batch → Transform → Write → Commit → Checkpoint</span>. Trigger options: <span class='k'>availableNow=True</span> (drain available data, terminate), <span class='k'>processingTime='1 minute'</span> (continuous micro-batches), and continuous streaming (a different architecture).</p>",
        internals: "<p>Each micro-batch plans an offset range, processes it, writes output, then commits — checkpoint records offsets/commits so the next trigger resumes exactly where it stopped.</p>",
        implementation: "<p>Project = <span class='k'>availableNow=True</span> → <strong>incremental batch</strong>. Compute spins up, processes the backlog, and can terminate — cheaper than a long-running cluster.</p>",
        why: "<p>Data arrives periodically from scheduled ADF loads, so paying for an always-on cluster buys freshness the business doesn't need. availableNow matches cost to the arrival pattern.</p>",
        tradeoffs: "<p><span class='k'>availableNow</span>: low cost, freshness bounded by schedule. <span class='k'>processingTime</span>: low latency, continuous compute cost. Continuous: lowest latency, most operational complexity — <em>Architecture Evolution / Hypothetical</em> here.</p>",
        failure: "<p>Restart after failure resumes from the last committed offset via the checkpoint — no reprocessing of committed batches, no skipped data.</p>",
        interview: [
          { q: "Is availableNow=True real-time?", a: "No — it processes currently available data and stops. It's incremental batch with streaming semantics (exactly-once, schema handling)." },
          { q: "When would you switch to processingTime?", a: "When latency requirements tighten (e.g. 1-minute freshness) and you accept a long-running cluster's continuous cost." }
        ],
        followup: ["What makes it exactly-once? → offsets/commits in the checkpoint + idempotent Delta commits.", "How to reach true real-time? → event-driven file notification + processingTime + long-running cluster (Hypothetical)."]
      },
      whatif: [{ q: "What if freshness must drop to seconds?", a: "That's beyond micro-batch tuning — you'd move to continuous processing or an event-streaming architecture (Kafka + streaming compute). Label it Architecture Evolution; the current design deliberately favours cost-efficient incremental batch." }],
      related: ["databricks", "autoloader", "checkpoint", "delta"]
    },

    schemaevo: {
      id: "schemaevo", title: "Schema Inference & Evolution", icon: "🧬",
      tech: "Auto Loader cloudFiles schema", tag: "handbook",
      source: { module: "Module 5", section: "Auto Loader schema handling" },
      layers: {
        simple: "<p>Auto Loader can <strong>figure out the columns</strong> of incoming files and <strong>adapt when new columns appear</strong>, instead of breaking.</p>",
        technical: "<p>Auto Loader infers schema on first read and tracks it in the checkpoint <span class='k'>schema/</span> location; when new columns arrive it can evolve the schema (add columns) rather than fail.</p>",
        internals: "<p>The tracked schema is versioned in the checkpoint. On drift, depending on <span class='k'>schemaEvolutionMode</span>, it adds new columns (and may restart the stream to pick up the new schema) or routes unexpected data to a rescued-data column.</p>",
        why: "<p>Source schemas change over time; hard-failing on every new column would make the pipeline brittle and high-maintenance.</p>",
        tradeoffs: "<p><strong>Gain:</strong> resilience to additive change. <strong>Cost:</strong> evolution can trigger a stream restart; breaking changes (type changes/removals) still need a reviewed migration.</p>",
        failure: "<p>Unexpected/malformed fields land in a rescued-data column rather than being silently dropped, so nothing is lost while you investigate.</p>",
        interview: [{ q: "What happens when a new column appears mid-stream?", a: "Auto Loader evolves the tracked schema (adds the column), often restarting the stream to apply it; data isn't lost." }]
      },
      related: ["autoloader", "checkpoint", "silver"]
    }
  });
})();
