/* ============================================================
   Content for Iterations 4–6.
   - concept records (SCD, data quality, security, monitoring)
   - DECISIONS (Architecture Decision Engine)
   - INTERVIEW_BANK (Interview Mode)
   - QUIZ (Quiz Mode)
   - LINEAGE / TRACE data
   Same 9-layer contract + source traceability + tags.
   ============================================================ */
(function () {
  Object.assign(window.CONTENT, {
    scd: {
      id: "scd", title: "SCD Type 1 & Type 2", icon: "🕰️",
      tech: "Auto CDC · effective dates · current flag", tag: "handbook",
      source: { module: "Module 8", section: "Gold — DLT/Lakeflow & SCD" },
      why: "Dimensions change over time. SCD Type 1 overwrites (keep only current); Type 2 preserves history as versioned rows.",
      layers: {
        simple: "<p><b>Type 1 replaces history</b> — you only ever see the latest value. <b>Type 2 preserves history</b> — the old value is kept and a new version is added.</p>",
        technical: "<p>Type 1 = in-place update (overwrite). Type 2 = close the old row (set <span class='k'>effective_end</span> / <span class='k'>is_current=false</span>) and insert a new row with <span class='k'>effective_start</span> / <span class='k'>is_current=true</span>. DLT <b>Auto CDC</b> applies both declaratively.</p>",
        internals: "<p>Auto CDC compares incoming keys to the target. Type 2: on a changed attribute it versions the row; each version carries validity dates so you can query the state 'as of' any point in time.</p>",
        implementation: "<p>Handbook mapping: <b>Songs, Albums, Subscriptions → Type 1</b>; <b>Artists, Users → Type 2</b> (history tracked). E.g. a user's country changing from India → USA keeps both versions.</p>",
        why: "<p>Type 2 where the business needs history (a user's country over time for cohort analysis); Type 1 where only the current corrected value matters (a song's genre fix).</p>",
        tradeoffs: "<p><b>Type 1:</b> simple, small, but history is lost forever. <b>Type 2:</b> full history, but tables grow and every consumer must filter to the right version or risk double counting.</p>",
        failure: "<p>Choosing Type 1 when you later need history is unrecoverable — the past was overwritten. This is why the choice is deliberate up front.</p>",
        interview: [
          { q: "When Type 1 vs Type 2?", a: "Type 1 when only the current value matters; Type 2 when history matters (point-in-time / change tracking)." },
          { q: "How does SCD2 affect downstream fact joins?", a: "Facts must join to the dimension version valid at the fact's timestamp (is_current or as-of date), else metrics inflate." }
        ],
        followup: ["What columns implement SCD2? → effective_start/end + is_current (or a version number).", "How avoid double counting? → point-in-time join."]
      },
      whatif: [{ q: "What if a Type 1 dimension suddenly needs history?", a: "You can convert it to Type 2 going forward, but the historical changes already overwritten are gone. The lesson: model the SCD type from the business requirement, not after the fact." }],
      related: ["dlt", "gold", "delta"]
    },

    dataquality: {
      id: "dataquality", title: "Data Quality — DLT Expectations", icon: "✔️",
      tech: "expect_or_warn / drop / fail", tag: "handbook",
      source: { module: "Module 9", section: "Data Quality — DLT Expectations" },
      why: "DLT Expectations enforce quality rules on incoming data, choosing per rule whether to warn, drop, or fail.",
      layers: {
        simple: "<p>Quality rules act like a <b>bouncer</b> at each table: a bad row can be logged (warn), turned away (drop), or shut the whole pipeline (fail).</p>",
        technical: "<p>DLT <b>Expectations</b> attach constraints to a table. Three modes: <span class='k'>expect_or_warn</span> (allow + count violations), <span class='k'>expect_or_drop</span> (filter bad rows), <span class='k'>expect_or_fail</span> (abort the update).</p>",
        internals: "<p>Each expectation produces a metric (pass/fail counts) surfaced in the DLT event log/observability, so you can trend quality and alert on regressions.</p>",
        implementation: "<p>Applied to Silver/Gold DLT tables to catch NULL primary keys, duplicates, invalid types/values, and schema drift before they reach consumers.</p>",
        why: "<p>Choose the mode per rule by how dangerous the violation is: warn for soft signals, drop to quarantine junk, fail to protect a critical Gold table.</p>",
        tradeoffs: "<p><b>warn:</b> nothing blocked (max availability, least protection). <b>drop:</b> clean output but silent data loss unless monitored. <b>fail:</b> maximum protection but a bad batch halts the pipeline.</p>",
        failure: "<p>Wrong mode choice is the risk: fail on a noisy soft rule causes needless outages; warn on a critical rule lets bad data through. Tune per rule.</p>",
        interview: [
          { q: "What are the three expectation modes and when use each?", a: "warn (log+count), drop (quarantine bad rows), fail (abort) — pick by violation severity and downstream blast radius." },
          { q: "How do you monitor data quality over time?", a: "Expectations emit pass/fail metrics to the DLT event log; trend them and alert on regressions." }
        ],
        followup: ["What gets injected to test DQ? → NULL PK, duplicates, bad type/value, schema drift.", "Where do dropped rows go? → filtered out; quarantine + alert to avoid silent loss."]
      },
      whatif: [{ q: "What if a whole batch is bad?", a: "expect_or_fail stops the pipeline so Gold stays clean; expect_or_drop would quietly quarantine most of it — the right choice depends on whether stale-but-clean or fresh-but-partial is safer for that table." }],
      related: ["dlt", "silver", "monitoring"]
    },

    security: {
      id: "security", title: "Security — Managed Identity & Key Vault", icon: "🔐",
      tech: "Managed Identity · RBAC · Key Vault · Unity Catalog", tag: "handbook",
      source: { module: "Module 2 & 12", section: "Infrastructure; Production Standards" },
      why: "No hardcoded credentials: ADF/Databricks authenticate with Managed Identity, secrets live in Key Vault, and access is least-privilege via RBAC + Unity Catalog.",
      layers: {
        simple: "<p>Instead of storing passwords in the pipeline, each service uses its own <b>Azure identity badge</b> to prove who it is. Secrets that are needed live in a locked <b>vault</b>.</p>",
        technical: "<p><b>Managed Identity</b> (system-assigned) lets ADF get an Azure AD token to connect to SQL — no password stored. <b>Key Vault</b> holds secrets; <b>RBAC</b> + <b>Unity Catalog</b> enforce least-privilege access.</p>",
        internals: "<p>ADF requests a token for <span class='k'>https://database.windows.net/</span>; Azure AD validates its managed identity and issues a JWT; SQL validates the Bearer token and grants the connection. No credential ever sits in config.</p>",
        implementation: "<p>Linked service <span class='k'>LS_AZURESQL_SPOTIFY</span> uses system-assigned Managed Identity with encrypted connections; governance via Unity Catalog.</p>",
        why: "<p>Hardcoded credentials leak, can't be rotated safely, and grant broad access. Identity + vault + least privilege is the secure baseline.</p>",
        tradeoffs: "<p><b>Gain:</b> no secrets to leak, central rotation, auditability. <b>Cost:</b> more setup (identities, role assignments, vault policies).</p>",
        failure: "<p>Auth failure (missing role/expired) fails the connection with a clear authorization error and audit trail — fix the grant, never widen access blindly.</p>",
        interview: [
          { q: "How does ADF authenticate to SQL without a password?", a: "System-assigned Managed Identity: Azure AD issues a token, SQL validates it — the OAuth2 flow, no stored secret." },
          { q: "Insecure vs secure connectivity here?", a: "Insecure = hardcoded creds in the pipeline. Secure = Managed Identity + Key Vault + least-privilege RBAC/Unity Catalog." }
        ],
        followup: ["Where do secrets live? → Key Vault, referenced not embedded.", "How is data access controlled? → Unity Catalog RBAC, least privilege."]
      },
      whatif: [{ q: "What if a credential is compromised?", a: "With Managed Identity there is no static credential to steal; you revoke/rotate the identity's role assignments centrally. With hardcoded secrets you'd be scrambling to find every copy — exactly why the project avoids them." }],
      related: ["azuresql", "adf", "unity"]
    },

    monitoring: {
      id: "monitoring", title: "Monitoring — Logic Apps & Alerting", icon: "📟",
      tech: "ADF → Web → Logic App → alert", tag: "handbook",
      source: { module: "Module 4", section: "Monitoring — Azure Logic Apps & Alerting" },
      why: "Pipeline failures must page a human. An on-failure Web activity posts to a Logic App that emails the on-call engineer with the Run ID.",
      layers: {
        simple: "<p>When a pipeline breaks, it automatically <b>sends an email</b> so an engineer knows immediately — with an ID to look up exactly what failed.</p>",
        technical: "<p>Flow: <span class='k'>ADF (on failure) → Web Activity → Logic App (HTTP trigger) → email alert → engineer → ADF Monitor → Run ID → root cause</span>.</p>",
        internals: "<p>The Web activity POSTs JSON (pipeline name, error message, Run ID) to the Logic App's HTTP trigger; the Logic App formats and sends the notification. The Run ID is the key to open ADF Monitor and drill into the failed activity.</p>",
        implementation: "<p>Wired as the pipeline's On-Failure path (<span class='k'>WEB_TRIGGER_LOGIC_APP</span>), so any activity failure alerts without manual watching.</p>",
        why: "<p>Silent failures are the worst production outcome. Cheap, reliable alerting turns failures into actionable pages.</p>",
        tradeoffs: "<p><b>Gain:</b> fast detection, clear ownership. <b>Cost:</b> alert tuning to avoid noise; Logic App is another component to maintain.</p>",
        failure: "<p>If the Logic App itself fails, failures could go unnoticed — so critical alerting paths are kept simple and independently monitored.</p>",
        interview: [
          { q: "How would you design production monitoring for this pipeline?", a: "On-failure Web activity → Logic App → email with Run ID; engineer opens ADF Monitor, finds the failed activity, root-causes." },
          { q: "How does an on-call engineer investigate?", a: "Use the Run ID from the alert to open ADF Monitor, inspect the failed activity's error and inputs, then trace root cause." }
        ],
        followup: ["What's in the alert payload? → pipeline name, error, Run ID.", "How to reduce alert fatigue? → severity routing, dedup, only actionable alerts."]
      },
      whatif: [{ q: "What if failures spike overnight?", a: "Alert routing/dedup prevents a storm of emails; the engineer triages by Run ID in ADF Monitor. A recurring failure signals a systemic issue (source outage, schema change) rather than a one-off." }],
      related: ["adf", "act_web"]
    }
  });

  /* ---------------- Architecture Decision Engine ---------------- */
  window.DECISIONS = [
    { id: "d_ingest", title: "Ingestion orchestration", chosen: "Azure Data Factory",
      options: ["Azure Data Factory", "Azure Synapse Pipelines", "Custom Python"],
      problem: "Move incremental data from Azure SQL to the lake for many tables, on a schedule, with monitoring.",
      techReason: "ADF gives managed connectors, parameterized metadata-driven pipelines, ForEach parallelism, and built-in monitoring/retry without writing orchestration code.",
      bizReason: "Low-code, low-maintenance, cheap to onboard new tables (a metadata row), and easy for a team to operate.",
      tradeoffs: "Less flexible than custom code for exotic logic; another Azure service to manage.",
      whenAlt: "Custom Python wins when transformations are highly bespoke; Synapse pipelines when you're already all-in on Synapse for warehousing.",
      tag: "handbook" },
    { id: "d_autoloader", title: "Incremental file ingestion", chosen: "Auto Loader (cloudFiles)",
      options: ["Auto Loader", "COPY INTO", "Manual file tracking"],
      problem: "Ingest only newly arrived Bronze files, exactly once, tolerating schema change, at scale.",
      techReason: "Auto Loader keeps durable processed-file state in a checkpoint, supports schema inference/evolution, and scales to huge file counts.",
      bizReason: "Less operational burden and fewer bugs than hand-rolled file tracking; reliable exactly-once.",
      tradeoffs: "Depends on checkpoint integrity; directory-listing mode gets costly at extreme file counts (switch to file notification).",
      whenAlt: "COPY INTO for simple one-off/bulk loads without incremental state; manual tracking almost never.",
      tag: "handbook" },
    { id: "d_delta", title: "Table storage format", chosen: "Delta Lake",
      options: ["Delta Lake", "Plain Parquet"],
      problem: "Reliable, updatable, queryable tables on the lake with history and concurrency.",
      techReason: "Delta adds a transaction log over Parquet → ACID, schema enforcement/evolution, time travel, MERGE, safe concurrent writes.",
      bizReason: "Trustworthy data (no half-written reads), easy rollback/recovery, and upserts for SCD.",
      tradeoffs: "Small-file/log growth needs OPTIMIZE/VACUUM; slightly more write overhead than raw Parquet.",
      whenAlt: "Plain Parquet only for immutable, append-only, read-once staging where transactions add no value.",
      tag: "handbook" },
    { id: "d_dlt", title: "Gold pipeline framework", chosen: "DLT / Lakeflow",
      options: ["DLT / Lakeflow", "Plain Spark jobs"],
      problem: "Build Gold with dependencies, data quality, CDC/SCD, lineage and observability.",
      techReason: "DLT resolves dependencies, provides declarative expectations, Auto CDC for SCD, and free lineage/observability.",
      bizReason: "Much less code and fewer bugs than hand-writing orchestration + MERGE + quality plumbing.",
      tradeoffs: "A managed framework with its own model and conventions; less low-level control than raw Spark.",
      whenAlt: "Plain Spark when you need full control or highly custom logic DLT doesn't express well.",
      tag: "handbook" },
    { id: "d_unity", title: "Governance", chosen: "Unity Catalog",
      options: ["Unity Catalog", "Manual per-workspace permissions"],
      problem: "Consistent access control, lineage, and audit across shared data and teams.",
      techReason: "Central RBAC over catalog.schema.table(.column), automatic lineage, and audit logs across workspaces.",
      bizReason: "One governed, auditable model instead of drifting manual ACLs; safer multi-team access.",
      tradeoffs: "Setup/administration overhead; teams must adopt its object model.",
      whenAlt: "Manual permissions only for a tiny single-team setup where governance overhead isn't justified.",
      tag: "handbook" },
    { id: "d_trigger", title: "Streaming trigger", chosen: "availableNow=True",
      options: ["availableNow=True", "processingTime (continuous)", "Continuous streaming"],
      problem: "Process periodically-arriving Bronze files cost-effectively with exactly-once semantics.",
      techReason: "availableNow drains available data as micro-batches then terminates — exactly-once via checkpoint, no always-on cluster.",
      bizReason: "Matches cost to the scheduled arrival pattern; freshness the business needs without paying for idle compute.",
      tradeoffs: "Freshness bounded by schedule — not real-time.",
      whenAlt: "processingTime/continuous when latency must drop to minutes/seconds — Architecture Evolution, higher continuous cost.",
      tag: "handbook" }
  ];

  /* ---------------- Interview Bank ---------------- */
  window.INTERVIEW_BANK = [
    { level: 1, comp: "Auto Loader", q: "What is Auto Loader?",
      strong: "Databricks' cloudFiles source for incremental file ingestion on Structured Streaming — it processes only new files.",
      senior: "It's incremental file ingestion with durable processed-file state in a checkpoint, schema inference/evolution, and exactly-once semantics, scaling from directory listing to file-notification at high volume.",
      mistakes: "Calling it real-time; forgetting it needs a checkpoint.", followups: ["How does it know which files are new?", "Where is that state stored?"] },
    { level: 2, comp: "ADF", q: "How did you implement incremental ingestion?",
      strong: "A metadata-driven ADF pipeline (PL_SPOTIFY_INCREMENTAL_LOAD): Lookup a control table, ForEach over tables (batch 5), capture current timestamp, copy rows where updated_at > watermark, then update the watermark on success.",
      senior: "Same, plus: the timestamp is captured before the copy to fix the upper boundary; the watermark advances only on success for idempotent self-healing restarts; onboarding a table is a metadata row, not new code.",
      mistakes: "Updating the watermark before the copy; hardcoding per-table pipelines.", followups: ["Why capture the timestamp first?", "How would you scale to 1000 tables?"] },
    { level: 3, comp: "Checkpoint", q: "How does checkpointing prevent duplicate processing?",
      strong: "It durably stores stream offsets/commits and Auto Loader's processed-file state, so a restart resumes from the last committed position and skips handled files.",
      senior: "On restart, Structured Streaming reads the last committed offset and reconstructs position; unfinished batches replay idempotently, and Auto Loader's sources/ state ensures processed files aren't re-read — together giving exactly-once.",
      mistakes: "Thinking the checkpoint stores the data; ignoring the duplicate risk if it's lost.", followups: ["What's inside a checkpoint?", "What if it's deleted?"] },
    { level: 4, comp: "Streaming", q: "Why availableNow instead of COPY INTO or continuous streaming?",
      strong: "availableNow gives streaming's exactly-once + schema handling but processes available data then terminates — cheaper than an always-on cluster and safer than COPY INTO's lack of incremental state.",
      senior: "It's a deliberate cost/latency trade: incremental batch matches the scheduled arrival pattern; continuous (processingTime) is an architecture evolution for lower latency at continuous compute cost.",
      mistakes: "Conflating Structured Streaming with real-time.", followups: ["How would you make it real-time?", "Why not Kafka?"] },
    { level: 5, comp: "Watermark", q: "A run copied rows but the watermark didn't advance — what happens and how do you prevent it?",
      strong: "The next run re-reads the same window and creates duplicates in Bronze. Downstream MERGE/dedup on business key absorbs them; prevention is idempotent writes.",
      senior: "Root cause is the non-atomic copy-then-update; because the update is a separate step, a post-copy failure leaves the old watermark. Mitigate with idempotent MERGE keyed by business id, alerting on the failure, and dedup logic — accept that exactly-once at the sink, not the source, is the guarantee.",
      mistakes: "Assuming no duplicates are possible; advancing the watermark blindly.", followups: ["Why not update watermark inside the copy?", "How do you detect the duplicates?"] },
    { level: 6, comp: "System Design", q: "Design this for 10x volume and 1-minute freshness.",
      strong: "Raise ForEach parallelism within source limits, partition Bronze well, switch Auto Loader to file-notification mode, and move from availableNow to processingTime on a right-sized long-running cluster.",
      senior: "Separate the two asks: 10x volume is a throughput/partitioning/cluster-sizing problem (notification mode, Z-order, autoscaling); 1-minute freshness is a latency architecture change (continuous micro-batch or event-driven), which raises continuous compute cost — quantify the cost/latency trade and stage it as an evolution, not a rewrite.",
      mistakes: "Solving latency by just scaling compute; ignoring source connection limits.", followups: ["What breaks first at 10x?", "Where does cost grow fastest?"] }
  ];

  /* ---------------- Quiz ---------------- */
  window.QUIZ = [
    { type: "MCQ", q: "Why is the current timestamp captured BEFORE the Copy activity?",
      options: ["To speed up the copy", "To fix the upper boundary so mid-run inserts aren't skipped", "Because ADF requires it", "To reduce cost"],
      answer: 1, explain: "Capturing it first fixes the window's top edge; rows written during the copy fall beyond it and are picked up next run — never lost.",
      wrong: "Speed/cost/ADF-requirement are unrelated — it's purely a correctness boundary." },
    { type: "MCQ", q: "availableNow=True means…",
      options: ["Continuous real-time streaming", "Process currently available data, then terminate", "Only full loads", "A Kafka consumer"],
      answer: 1, explain: "It's incremental batch with streaming semantics — drain available files then stop. Not real-time.",
      wrong: "Calling it real-time/continuous is the classic mistake; it is not tied to Kafka or full loads." },
    { type: "TF", q: "SCD Type 1 preserves full history of changes.",
      options: ["True", "False"], answer: 1,
      explain: "Type 1 overwrites (current value only). Type 2 preserves history via versioned rows.",
      wrong: "History-preserving is Type 2, not Type 1." },
    { type: "Scenario", q: "ADF completed successfully but copied 0 records. Most likely cause?",
      options: ["Source is down", "Watermark is already at/ahead of the newest updated_at (no new rows)", "Delta corruption", "Unity Catalog permission error"],
      answer: 1, explain: "A clean success with 0 rows usually means the incremental predicate matched nothing — the watermark is already current. Not a failure at all.",
      wrong: "A source outage or permission error would fail the run, not succeed with 0 rows." },
    { type: "MCQ", q: "Which DLT expectation mode quarantines bad rows but keeps the pipeline running?",
      options: ["expect_or_warn", "expect_or_drop", "expect_or_fail", "expect_or_retry"],
      answer: 1, explain: "drop filters out violating rows (quarantine) while the pipeline continues; warn keeps them, fail aborts.",
      wrong: "warn keeps bad rows; fail halts the pipeline; expect_or_retry isn't a mode." },
    { type: "Ordering", q: "Correct medallion order?",
      options: ["Bronze → Silver → Gold", "Gold → Silver → Bronze", "Silver → Bronze → Gold", "Bronze → Gold → Silver"],
      answer: 0, explain: "Raw (Bronze) → cleaned (Silver) → business-ready (Gold).",
      wrong: "Any other order breaks the raw→clean→modelled progression." },
    { type: "MCQ", q: "What makes the ADF pipeline 'metadata-driven'?",
      options: ["It uses Spark", "A control table lists tables to load, so onboarding is config not code", "It runs continuously", "It hardcodes each table"],
      answer: 1, explain: "The Lookup reads a watermark/control table; adding a table is a row, not a new pipeline.",
      wrong: "Hardcoding tables is the opposite; Spark/continuous are unrelated." },
    { type: "TF", q: "Losing the streaming checkpoint can cause duplicate processing.",
      options: ["True", "False"], answer: 0,
      explain: "Without the checkpoint, Auto Loader loses processed-file state and may reprocess everything — idempotent MERGE is the safety net.",
      wrong: "It's true — the checkpoint is exactly what prevents reprocessing." }
  ];

  /* ---------------- Lineage & Trace data ---------------- */
  window.LINEAGE = [
    { target: "gold.dim_users (SCD2)", chain: ["azuresql", "adf", "bronze", "databricks", "silver", "dlt", "gold", "unity"] },
    { target: "gold.fct_streams", chain: ["azuresql", "adf", "bronze", "databricks", "silver", "dlt", "gold", "unity"] },
    { target: "gold.dim_artists (SCD2)", chain: ["azuresql", "adf", "bronze", "databricks", "silver", "dlt", "gold", "unity"] }
  ];
})();
