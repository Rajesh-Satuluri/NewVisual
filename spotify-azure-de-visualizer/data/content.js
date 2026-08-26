/* ============================================================
   Spotify Azure DE Visualizer — CONTENT SPINE (Iteration 0)
   ------------------------------------------------------------
   Single source of truth for every explanation in the app.
   Every record obeys the 9-layer explanation contract and
   carries source traceability + a classification tag.

   tag values:
     "handbook" -> sourced from the project handbook
     "general"  -> General DE Context (not project-specific)
     "hypo"     -> Architecture Evolution / Hypothetical
     "unspec"   -> Not specified in the project handbook

   Layer keys (contract):
     simple, technical, internals, implementation,
     why, tradeoffs, failure, interview[], followup[]
   ============================================================ */

const HB = "Spotify Azure DE — Ultimate Interview Handbook";

/* Shared helper markup uses:  <span class="k">code</span> for inline code */

window.CONTENT = {

  /* ---------------- AZURE SQL (SOURCE) ---------------- */
  azuresql: {
    id: "azuresql", title: "Azure SQL Database", icon: "🗄️",
    tech: "OLTP source · CDC via updated_at", tag: "handbook",
    source: { module: "Module 1 & 3", section: "Business Understanding; Bronze Ingestion" },
    why: "It is the existing operational store where Spotify's transactional data already lives — songs, albums, artists, users, stream events, subscriptions. Analytics must not run against it directly because that would impact production performance.",
    layers: {
      simple: "<p>This is the <strong>original database</strong> where Spotify's app writes its live data — every song, user, and play event. Think of it as the busy front-desk ledger of the business.</p><p>We don't run analytics here, because heavy reporting queries would slow down the app for real users.</p>",
      technical: "<p>Azure SQL Database is a managed <strong>OLTP</strong> (transactional) relational store. The project treats it as the <em>system of record</em> for six domain entities. Rows carry an <span class='k'>updated_at</span> column that acts as a <strong>change-tracking timestamp</strong> — this is what makes incremental extraction possible without full table scans.</p>",
      internals: "<p>Each source table maintains an <span class='k'>updated_at</span> value that advances whenever a row is inserted or modified. This is a lightweight, application-maintained form of CDC (change data capture by timestamp). The extraction layer never needs row-versioning or the SQL Server CDC feature — it simply asks <em>“give me rows where updated_at is greater than the last time I looked.”</em></p>",
      implementation: "<p>The handbook models these entities and their change behaviour:</p><ul><li><strong>Songs, Albums, Subscriptions</strong> → SCD Type 1 (overwrite)</li><li><strong>Artists, Users</strong> → SCD Type 2 (history tracked)</li><li><strong>Stream Events</strong> → append-only, high volume</li></ul><p>ADF connects to it through a linked service <span class='k'>LS_AZURESQL_SPOTIFY</span> using <strong>Managed Identity</strong> — no password is stored anywhere.</p>",
      why: "<p>The business problem (Module 1): raw data lives in operational databases that are not optimized for analytics, and business teams cannot query them without impacting production. So the source stays as-is, and a separate governed lake platform is built alongside it.</p>",
      tradeoffs: "<p><strong>Gain:</strong> reuse the existing trustworthy source; no change to production apps. <strong>Cost:</strong> we depend on <span class='k'>updated_at</span> being reliably maintained. If the app forgets to bump it on an update, that change is invisible to incremental extraction.</p>",
      failure: "<p><strong>SQL unavailable / auth failure →</strong> ADF Copy activity fails, the watermark is <em>not</em> advanced, the Logic App alert fires, and the next scheduled run simply resumes from the last successful watermark. No data is lost because the watermark only moves forward on success.</p>",
      interview: [
        { q: "Why not run analytics directly on Azure SQL?", a: "Because it is an OLTP store tuned for many small transactional writes/reads. Analytical scans compete for the same resources and degrade production latency, and it lacks columnar storage, time-travel, and cheap history retention." },
        { q: "How does ADF know which rows are new?", a: "By comparing each row's <span class='k'>updated_at</span> against the last successful watermark stored in the metadata table — a timestamp-based CDC pattern." }
      ],
      followup: [
        "What if the source has no reliable updated_at column? → fall back to full load, or enable SQL Server native CDC (General DE Context).",
        "What happens to deletes? → timestamp CDC does not capture hard deletes; that is a known limitation to raise proactively."
      ]
    },
    whatif: [
      { q: "What if Azure SQL is unavailable for 2 hours?", a: "The pipeline's scheduled runs fail and alert, but because the watermark only advances on success, once SQL recovers the very next run extracts everything with <span class='k'>updated_at</span> beyond the last committed watermark. No manual backfill is needed for a short outage." },
      { q: "What if a row is updated but updated_at isn't bumped?", a: "That change becomes invisible to incremental extraction. Detection is hard; prevention is a source-side contract (triggers/app logic) guaranteeing the timestamp always moves. This is a classic senior-level correctness gap to call out." }
    ],
    related: ["adf", "watermark", "bronze"]
  },

  /* ---------------- AZURE DATA FACTORY ---------------- */
  adf: {
    id: "adf", title: "Azure Data Factory", icon: "🏭",
    tech: "PL_SPOTIFY_INCREMENTAL_LOAD · metadata-driven", tag: "handbook",
    source: { module: "Module 3", section: "Bronze Layer — ADF Incremental Ingestion Pipeline" },
    why: "ADF orchestrates incremental, metadata-driven extraction from Azure SQL into the Bronze lake. One parameterized pipeline serves many tables, so onboarding a new table is a metadata row, not new code.",
    layers: {
      simple: "<p>ADF is the <strong>mover and scheduler</strong>. On a schedule it wakes up, asks the source for only the new/changed rows since last time, and drops them into the lake. One reusable pipeline handles <em>all</em> tables.</p>",
      technical: "<p>A single <strong>metadata-driven, parameterized</strong> pipeline — <span class='k'>PL_SPOTIFY_INCREMENTAL_LOAD</span> — reads a control table, loops over active tables, extracts rows newer than each table's watermark, writes Parquet to Bronze, then advances the watermark. Parallelism comes from a <span class='k'>ForEach</span> with <span class='k'>batchCount = 5</span>.</p>",
      internals: "<p>The pipeline is an activity DAG:</p><pre>[1] LKP_GET_TABLE_METADATA   Lookup: SELECT * FROM metadata.watermark_table WHERE is_active=1\n[2] FE_PROCESS_ALL_TABLES    ForEach (batchCount=5)\n     ├─[3] SCR_GET_CURRENT_TIMESTAMP  Script: SELECT GETUTCDATE()\n     ├─[4] CPY_SQL_TO_BRONZE          Copy: WHERE updated_at > @{item().last_load_time}\n     └─[5] SCR_UPDATE_WATERMARK       Script: UPDATE watermark_table SET last_load_time=...\n[On Failure] WEB_TRIGGER_LOGIC_APP   Web: POST error to Logic App</pre><p>Capturing <span class='k'>GETUTCDATE()</span> <em>before</em> the copy defines the upper boundary of the extraction window, so rows arriving mid-run aren't skipped next time.</p>",
      implementation: "<p><strong>Linked service</strong> <span class='k'>LS_AZURESQL_SPOTIFY</span> authenticates with system-assigned <strong>Managed Identity</strong> (OAuth2 token from Azure AD → SQL validates → grants connection). <strong>Sink</strong> path is partitioned: <span class='k'>bronze/{folder_path}/dt=.../file.parquet</span>. Adding a table = insert one row in <span class='k'>watermark_table</span>; no pipeline edit.</p>",
      why: "<p><strong>Metadata-driven</strong> → scales to many tables without pipeline sprawl. <strong>Idempotent</strong> → the watermark advances only on success, so a failed run never loses or skips data. <strong>Self-healing</strong> → the next run resumes from the last good watermark.</p>",
      tradeoffs: "<p><strong>Gain:</strong> one pipeline, cheap onboarding, safe restarts. <strong>Cost:</strong> control-table becomes a critical dependency; a bug in the metadata row (wrong folder, wrong watermark) affects that table's correctness. Timestamp CDC also can't see hard deletes.</p>",
      failure: "<p><strong>Copy succeeds but watermark update fails</strong> → next run re-reads the same window → duplicate rows land in Bronze. This is the canonical failure the app's Watermark Failure Simulator (Iteration 2) will model. Recovery relies on downstream dedup / MERGE keys.</p>",
      interview: [
        { q: "Why one metadata-driven pipeline instead of one pipeline per table?", a: "Maintainability and scale. New tables become configuration, not code. It also centralizes retry, logging, and watermark logic in a single tested place." },
        { q: "Why capture the current timestamp before the copy, not after?", a: "To fix the upper boundary of the window. If you stamped the watermark with 'now' after a long copy, rows written during the copy could fall between the copy's snapshot and the new watermark and be lost." }
      ],
      followup: [
        "How does batchCount=5 affect the source? → 5 concurrent connections; must be balanced against source DTU/connection limits.",
        "How would you extend this to 1,000 tables? → same pattern, tune batchCount, partition the metadata, consider throttling (System Design mode)."
      ]
    },
    whatif: [
      { q: "What if 1,000 source tables need ingestion?", a: "The metadata-driven design already scales — you add 1,000 rows to the control table. The real work becomes tuning <span class='k'>batchCount</span>, respecting source connection limits, and possibly sharding the ForEach across pipeline runs to avoid overwhelming Azure SQL." },
      { q: "What if a Copy activity fails midway?", a: "Because the watermark is updated in a separate downstream Script activity, a failed copy leaves the watermark untouched. The On-Failure path POSTs to the Logic App to alert an engineer, and the next run re-attempts the same window safely." }
    ],
    related: ["azuresql", "watermark", "bronze", "monitoring"]
  },

  /* ---------------- ADLS BRONZE ---------------- */
  bronze: {
    id: "bronze", title: "ADLS Gen2 — Bronze", icon: "🥉",
    tech: "Raw Parquet · partitioned by dt", tag: "handbook",
    source: { module: "Module 3", section: "Bronze Layer sink" },
    why: "Bronze is the raw landing zone: an immutable, cheap, append-style copy of source data exactly as extracted, so we always have the original to reprocess from.",
    layers: {
      simple: "<p>Bronze is the <strong>raw storage shelf</strong>. ADF drops the extracted data here as files, untouched. If anything downstream goes wrong, we can always rebuild from these originals.</p>",
      technical: "<p>The Bronze container in <strong>Azure Data Lake Storage Gen2</strong> holds source data as <strong>Parquet</strong> files, partitioned by ingestion date (<span class='k'>dt=YYYY-MM-DD</span>). It is the first tier of the <strong>Medallion architecture</strong> (Bronze → Silver → Gold).</p>",
      internals: "<p>ADLS Gen2 is Blob storage plus a <strong>hierarchical namespace</strong>, giving real directories and atomic folder operations. Parquet stores data <strong>columnar + compressed</strong>, so downstream Spark reads only the columns it needs. Files here are written once and treated as immutable.</p>",
      implementation: "<p>Sink path pattern from the ADF Copy activity: <span class='k'>bronze/{folder_path}/dt=@{formatDateTime(...)}/file.parquet</span>. Each incremental run appends a new dated folder; the raw history accumulates.</p>",
      why: "<p><strong>Raw + immutable</strong> means Silver/Gold logic can be re-run at any time from a trustworthy source without re-hitting Azure SQL. <strong>Parquet</strong> is chosen over CSV/JSON for columnar scan performance and compression.</p>",
      tradeoffs: "<p><strong>Gain:</strong> replayability, cheap object storage, decoupling from the source. <strong>Cost:</strong> Bronze grows continuously and needs lifecycle/retention management; raw data still contains duplicates and quality issues (that's Silver's job).</p>",
      failure: "<p><strong>Bronze deletion →</strong> if raw files are lost you can re-extract from Azure SQL via backfill/full-load, but only for data the source still retains. This is why Bronze retention and source availability together define your recovery window (Disaster Recovery mode, later iteration).</p>",
      interview: [
        { q: "Why Parquet instead of CSV in Bronze?", a: "Columnar storage + compression → far less I/O and cost for Spark, plus embedded schema. CSV is row-based, uncompressed, and schema-less." },
        { q: "Why keep a raw Bronze layer at all — why not transform on the way in?", a: "Separation of concerns and replayability. Raw immutable data lets you fix transformation bugs and reprocess without another expensive extraction from the source." }
      ],
      followup: [
        "How do you stop Bronze growing forever? → storage lifecycle/retention policies (General DE Context).",
        "How is Bronze read downstream? → Databricks Auto Loader incrementally picks up new files."
      ]
    },
    whatif: [
      { q: "What if Bronze volume grows 20x?", a: "Storage is cheap and scales, but you'd add lifecycle tiering (hot→cool→archive), tighten partitioning, and ensure Auto Loader's file-listing stays efficient (file-notification mode over directory listing at very high file counts)." },
      { q: "What if the same file arrives twice?", a: "Bronze itself is dumb storage and would keep both. Deduplication is handled downstream — Auto Loader's checkpoint prevents re-processing the same file, and Silver dedup logic removes duplicate business rows." }
    ],
    related: ["adf", "autoloader", "silver"]
  },

  /* ---------------- DATABRICKS / AUTO LOADER ---------------- */
  databricks: {
    id: "databricks", title: "Databricks — Auto Loader & Streaming", icon: "🧱",
    tech: "cloudFiles · Structured Streaming · availableNow", tag: "handbook",
    source: { module: "Module 5", section: "Silver Layer — Unity Catalog, Auto Loader & Streaming" },
    why: "Databricks incrementally ingests new Bronze files with Auto Loader and processes them with Spark Structured Streaming, using checkpoints for exactly-once file handling.",
    layers: {
      simple: "<p>Databricks is the <strong>processing engine</strong>. Auto Loader watches the Bronze folder and, whenever new files appear, feeds only those into Spark — never re-reading files it has already handled.</p>",
      technical: "<p><strong>Auto Loader</strong> (<span class='k'>cloudFiles</span> source) provides incremental file ingestion on top of <strong>Spark Structured Streaming</strong>. A <strong>checkpoint</strong> tracks which files are already processed, giving exactly-once file handling. The project runs it with <span class='k'>availableNow=True</span>.</p>",
      internals: "<p>Auto Loader discovers new files (directory listing or file-notification mode), records processed-file state in the checkpoint's <span class='k'>sources/</span> area, and Structured Streaming records stream progress in <span class='k'>offsets/</span> and <span class='k'>commits/</span>. On restart it reads the checkpoint and resumes from the last committed position instead of reprocessing everything.</p>",
      implementation: "<p>The project uses <span class='k'>.trigger(availableNow=True)</span>: process all <em>currently available</em> files, then the job/cluster can terminate. This is <strong>incremental batch</strong>, not always-on real-time streaming — an important distinction the app enforces everywhere.</p><p class='k' style='display:block'>Illustrative shape (see Code Explorer, later iteration).</p>",
      why: "<p><span class='k'>availableNow=True</span> gives streaming's exactly-once + schema handling <em>with</em> batch economics: compute spins up, drains the backlog, and shuts down — cheaper than a long-running cluster for data that arrives periodically.</p>",
      tradeoffs: "<p><strong>Gain:</strong> incremental, exactly-once, lower cost (compute terminates). <strong>Trade-off:</strong> freshness is bounded by the job schedule — it is <em>not</em> continuous. For true real-time you'd switch to <span class='k'>processingTime</span> + a long-running cluster (Architecture Evolution / Hypothetical).</p>",
      failure: "<p><strong>Checkpoint corruption/loss →</strong> Auto Loader loses its record of processed files and may reprocess everything, risking duplicates. Recovery leans on idempotent downstream writes (MERGE) and, worst case, rebuilding target tables. Detection: sudden reprocessing volume spike.</p>",
      interview: [
        { q: "Is Structured Streaming here real-time?", a: "No. With <span class='k'>availableNow=True</span> it processes currently available data and stops — incremental batch. Calling it real-time is a common and costly mistake." },
        { q: "How does Auto Loader know which files are new?", a: "It persists processed-file state in the checkpoint's source directory; on each run it lists/receives notifications and skips files already recorded." }
      ],
      followup: [
        "Where exactly is that state stored? → the checkpoint directory (offsets, commits, sources, schema).",
        "How would you make this truly real-time? → processingTime trigger + long-running cluster + event-driven file notification (Hypothetical).",
        "Why Auto Loader over COPY INTO? → incremental state, schema evolution, scales to many files (Decision Engine, later iteration)."
      ]
    },
    whatif: [
      { q: "What if freshness must be 1 minute?", a: "Switch from <span class='k'>availableNow=True</span> to <span class='k'>trigger(processingTime='1 minute')</span> on a long-running cluster, and ideally move to file-notification mode. This trades higher, continuous compute cost for lower latency — label it Architecture Evolution vs the current chosen design." },
      { q: "What if a duplicate file arrives?", a: "Auto Loader's checkpoint recognizes already-processed files and skips them, so a re-delivered file won't be reprocessed. Duplicate business rows (same data, different file) are handled by Silver dedup / MERGE keys." }
    ],
    related: ["bronze", "autoloader", "checkpoint", "silver"]
  },

  /* ---------------- SILVER ---------------- */
  silver: {
    id: "silver", title: "Silver Delta Tables", icon: "🥈",
    tech: "Cleaned · deduplicated · typed · Delta", tag: "handbook",
    source: { module: "Module 5 & 6", section: "Silver Layer; Python Utility Framework" },
    why: "Silver turns raw Bronze into clean, typed, deduplicated, validated Delta tables — the trustworthy foundation the Gold analytical layer is built on.",
    layers: {
      simple: "<p>Silver is the <strong>cleaned-up version</strong> of the data: correct types, no duplicates, validated values. It's the data you'd actually trust to build reports on.</p>",
      technical: "<p>Bronze Parquet → <strong>type casting → cleaning → validation → deduplication → metadata columns → Silver Delta tables</strong>. Written as <strong>Delta Lake</strong> tables (ACID, schema enforcement), often via a reusable <strong>Python utility framework</strong> so every table follows the same steps.</p>",
      internals: "<p>Delta wraps Parquet data files with a <span class='k'>_delta_log</span> transaction log (add/remove file actions) giving ACID writes and schema enforcement. Deduplication typically keys on business identifiers keeping the latest <span class='k'>updated_at</span>. Metadata columns (load time, source) support lineage and debugging.</p>",
      implementation: "<p>The Python utility framework centralizes read/cast/clean/dedup/write so transformations are consistent and testable across entities rather than copy-pasted per table.</p>",
      why: "<p>Cleaning once in Silver means every Gold consumer inherits the same quality guarantees. Delta gives ACID + schema enforcement so concurrent/failed writes don't corrupt the table.</p>",
      tradeoffs: "<p><strong>Gain:</strong> one trusted, query-ready layer; consistent quality. <strong>Cost:</strong> an extra hop of compute and storage; transformation logic must be maintained and versioned.</p>",
      failure: "<p><strong>Silver corruption →</strong> because Silver is derived, you recover by reprocessing from immutable Bronze. Delta time-travel also lets you roll back to a prior version. Data-quality regressions are caught by validation rules before they reach Gold.</p>",
      interview: [
        { q: "Why cast and dedup in Silver rather than Gold?", a: "So the cleaning happens once and all Gold models share the same clean base; Gold then focuses on business modelling (facts/dimensions), not data hygiene." },
        { q: "What does Delta give Silver that plain Parquet doesn't?", a: "ACID transactions, schema enforcement/evolution, time travel, and safe concurrent writes via the transaction log." }
      ],
      followup: [
        "How do you dedup deterministically? → window by business key, order by updated_at, keep latest.",
        "How is Silver consumed? → DLT/Lakeflow builds Gold facts & dimensions from it."
      ]
    },
    whatif: [
      { q: "What if source schema changes weekly?", a: "Delta schema evolution + Auto Loader schema handling absorb additive changes; the Python framework centralizes casting so a change is fixed in one place. Breaking changes still need a reviewed migration — surface this as a governance concern." },
      { q: "What if duplicates slip through?", a: "The dedup step (window by business key, keep latest updated_at) is the guard; if duplicates still appear, it usually means the key or ordering column is wrong — a debugging exercise for Failure mode." }
    ],
    related: ["databricks", "delta", "gold", "dlt"]
  },

  /* ---------------- DLT / LAKEFLOW ---------------- */
  dlt: {
    id: "dlt", title: "DLT / Lakeflow", icon: "🔀",
    tech: "Declarative pipelines · Auto CDC · SCD 1/2", tag: "handbook",
    source: { module: "Module 8 & 9", section: "Gold Layer — DLT/Lakeflow & SCD; Data Quality" },
    why: "Delta Live Tables (Lakeflow Declarative Pipelines) builds Gold declaratively, resolving dependencies, enforcing data-quality expectations, and applying SCD Type 1/2 via Auto CDC.",
    layers: {
      simple: "<p>DLT is a <strong>declarative pipeline builder</strong>: you describe the tables you want and the quality rules, and it figures out the order to build them, checks quality, and tracks history for you.</p>",
      technical: "<p><strong>Delta Live Tables / Lakeflow Declarative Pipelines</strong> take Silver as input and produce Gold. It provides automatic <strong>dependency resolution</strong>, <strong>data-quality expectations</strong> (warn/drop/fail), <strong>Auto CDC</strong> for <strong>SCD Type 1 &amp; Type 2</strong>, plus built-in lineage and observability.</p>",
      internals: "<p>You declare tables and their sources; DLT builds a dependency DAG and runs them in order. Expectations attach quality constraints to each table. Auto CDC compares incoming rows against the target and applies inserts/updates — for SCD2 it closes the old version (effective-end/current-flag) and inserts a new current version.</p>",
      implementation: "<p>Handbook mapping: <strong>Artists, Users → SCD Type 2</strong> (history retained); <strong>Songs, Albums, Subscriptions → SCD Type 1</strong> (overwrite). Data-quality uses DLT <strong>Expectations</strong> in warn / drop / fail modes (Module 9).</p>",
      why: "<p>Declarative pipelines remove hand-written orchestration, MERGE, and quality plumbing — less code, fewer bugs, automatic lineage. Auto CDC makes correct SCD2 history practical instead of error-prone bespoke MERGE statements.</p>",
      tradeoffs: "<p><strong>Gain:</strong> less code, built-in DQ/lineage/CDC, easier maintenance. <strong>Cost:</strong> a managed framework with its own execution model and conventions; less low-level control than hand-rolled Spark, and a learning curve. Compare Plain Spark vs DLT in the Decision Engine.</p>",
      failure: "<p><strong>DLT failure / DQ breach →</strong> expectations decide behaviour: <em>warn</em> logs & counts, <em>drop</em> filters bad rows, <em>fail</em> stops the pipeline. Observability surfaces which expectation fired and where, so root-causing is guided rather than blind.</p>",
      interview: [
        { q: "When SCD Type 1 vs Type 2?", a: "Type 1 when only the current value matters (song genre correction) — overwrite. Type 2 when history matters (a user's country over time) — keep old + new versions with effective dates/flags." },
        { q: "Why DLT instead of plain Spark for Gold?", a: "Automatic dependency resolution, declarative data-quality expectations, Auto CDC for SCD, and free lineage/observability — you'd otherwise build all of that by hand." }
      ],
      followup: [
        "What does SCD2 cost downstream? → consumers must filter is_current or a date to avoid double counting.",
        "What are the three expectation modes? → warn, drop, fail (Data Quality mode)."
      ]
    },
    whatif: [
      { q: "What if a bad batch violates data quality?", a: "It depends on the expectation mode: <span class='k'>expect_or_warn</span> lets rows through but records the violation metric, <span class='k'>expect_or_drop</span> quarantines bad rows, and <span class='k'>expect_or_fail</span> halts the pipeline to protect Gold. The choice is a per-rule trade-off between availability and strictness." },
      { q: "What if you need history you didn't keep (SCD1)?", a: "You can't recover overwritten history from an SCD1 table. If a dimension turns out to need history, you convert it to SCD Type 2 going forward — but the past is gone. This is why the Type 1/2 decision is made deliberately up front." }
    ],
    related: ["silver", "gold", "scd", "dataquality"]
  },

  /* ---------------- GOLD ---------------- */
  gold: {
    id: "gold", title: "Gold Delta Tables", icon: "🥇",
    tech: "Facts · dimensions · business metrics", tag: "handbook",
    source: { module: "Module 8", section: "Gold Layer" },
    why: "Gold is the business-ready analytical layer — fact and dimension tables and metrics that BI tools and analysts consume directly.",
    layers: {
      simple: "<p>Gold is the <strong>final, business-ready data</strong>: neat fact and dimension tables that answer questions like “how many streams per artist per month”. This is what dashboards read.</p>",
      technical: "<p>Gold holds <strong>fact tables</strong> (measurable events like stream plays) and <strong>dimension tables</strong> (descriptive entities like artists, users), modelled with defined <strong>grain</strong>, keys, and relationships, with SCD-tracked dimensions and pre-built aggregations.</p>",
      internals: "<p>Facts store measures at a declared grain (e.g. one row per play event) with foreign keys to dimensions. Dimensions carry SCD1/SCD2 attributes. Delta storage keeps it ACID and time-travelable; aggregations may be materialized for BI speed.</p>",
      implementation: "<p>Built by DLT/Lakeflow from Silver. SCD2 dimensions (Artists, Users) expose current-flag/effective dates so queries can pick point-in-time or current views.</p>",
      why: "<p>A modelled Gold layer gives consumers fast, consistent, well-defined metrics without each team re-deriving business logic — one governed definition of 'a stream' or 'an active user'.</p>",
      tradeoffs: "<p><strong>Gain:</strong> query-ready, consistent metrics, BI performance. <strong>Cost:</strong> modelling effort and storage duplication; SCD2 dimensions require consumers to filter correctly to avoid double counting.</p>",
      failure: "<p><strong>Gold corruption →</strong> rebuild from Silver (which rebuilds from Bronze) via DLT, or roll back with Delta time-travel. Because Gold is fully derived, RPO/RTO are driven by reprocessing time, not data loss (Disaster Recovery mode).</p>",
      interview: [
        { q: "What is the grain of a fact table and why does it matter?", a: "The grain is what one row represents (e.g. one stream event). Defining it precisely prevents double counting and makes aggregations unambiguous." },
        { q: "How do SCD2 dimensions affect Gold queries?", a: "Joins must filter to the correct version (is_current or an as-of date), otherwise a fact can match multiple historical dimension rows and inflate metrics." }
      ],
      followup: [
        "How do you avoid double counting with SCD2? → join on the version valid at the fact's timestamp.",
        "Who consumes Gold? → BI/analytics via Unity Catalog governance."
      ]
    },
    whatif: [
      { q: "What if Gold becomes corrupted?", a: "Gold is fully derived, so recovery is a rebuild: replay DLT from Silver (itself rebuildable from immutable Bronze) or use Delta time-travel to roll back to a healthy version. Data loss risk is minimal; the cost is reprocessing time (RTO)." },
      { q: "What if analysts need a new metric?", a: "Add it in Gold modelling / DLT so the definition is centralized and governed, rather than each team computing it differently — preserving one source of truth for business metrics." }
    ],
    related: ["dlt", "scd", "unity"]
  },

  /* ---------------- UNITY CATALOG ---------------- */
  unity: {
    id: "unity", title: "Unity Catalog", icon: "🛡️",
    tech: "Catalog → Schema → Table → Column", tag: "handbook",
    source: { module: "Module 5 & 12", section: "Governance; Production Standards" },
    why: "Unity Catalog is the governance layer: centralized access control, lineage, auditing, and discovery across all Databricks data assets.",
    layers: {
      simple: "<p>Unity Catalog is the <strong>security guard and card catalog</strong>: it decides who can see or query which tables, records where data came from, and helps people find the right dataset.</p>",
      technical: "<p>A centralized <strong>governance</strong> layer with a three-level namespace <span class='k'>catalog.schema.table</span> (down to column). It provides <strong>RBAC/access control</strong>, <strong>data lineage</strong>, <strong>auditing</strong>, and <strong>discovery</strong> across workspaces.</p>",
      internals: "<p>Grants are defined on securable objects (catalog → schema → table → column) and enforced centrally regardless of cluster. Lineage is captured automatically from reads/writes; audit logs record access for compliance.</p>",
      implementation: "<p>The project governs Bronze/Silver/Gold assets through Unity Catalog so BI consumers get least-privilege access, and engineers get lineage from source to Gold for debugging and impact analysis.</p>",
      why: "<p>Centralized governance replaces per-workspace, manual permission sprawl — one consistent, auditable model, which is essential once multiple teams need different access to shared data.</p>",
      tradeoffs: "<p><strong>Gain:</strong> consistent security, lineage, auditability, discoverability. <strong>Cost:</strong> setup and administration overhead; teams must adopt its object model and metastore conventions.</p>",
      failure: "<p><strong>Permission failure →</strong> a job or user lacking a grant fails with an access error. Detection is immediate (authorization error + audit log). Fix by correcting the grant under least-privilege — never by broadening access blindly.</p>",
      interview: [
        { q: "Why Unity Catalog over manually managing permissions per workspace?", a: "Centralized, consistent RBAC + automatic lineage + audit across workspaces; manual permissions drift, are hard to audit, and don't give lineage." },
        { q: "How does lineage help in production?", a: "When Gold looks wrong, lineage shows the exact upstream tables/columns feeding it, so you can trace the defect to its source quickly." }
      ],
      followup: [
        "What is the three-level namespace? → catalog.schema.table (with column-level control).",
        "How does this support multi-team access? → grants per securable under least privilege (System Design mode)."
      ]
    },
    whatif: [
      { q: "What if multiple teams need different permissions?", a: "Unity Catalog handles this natively: grant each team least-privilege access at the catalog/schema/table (or column) level from one central model, with audit logs proving who accessed what — far safer than per-workspace manual ACLs." },
      { q: "What if you need to prove compliance/audit?", a: "Unity Catalog's audit logs and automatic lineage let you show who accessed which data and how each Gold table was derived from source — a governance requirement it satisfies out of the box." }
    ],
    related: ["gold", "databricks", "security"]
  },

  /* ---------------- CONSUMERS ---------------- */
  consumers: {
    id: "consumers", title: "Analytics / BI / Consumers", icon: "📊",
    tech: "Dashboards · analysts · downstream", tag: "handbook",
    source: { module: "Module 1", section: "End-to-End Architecture — consumption" },
    why: "The whole platform exists to serve governed, trustworthy analytical data to BI tools, analysts, and downstream consumers.",
    layers: {
      simple: "<p>These are the <strong>people and tools that use the data</strong> — dashboards, analysts, business teams — reading the clean Gold tables to make decisions.</p>",
      technical: "<p>Consumption tier: BI dashboards and analytical queries read <strong>Gold Delta tables</strong> through <strong>Unity Catalog</strong> governance, getting consistent, access-controlled metrics.</p>",
      internals: "<p>Consumers query governed tables; Unity Catalog enforces access and records the read for lineage/audit. Because Gold is modelled and pre-aggregated, queries are fast and semantically consistent.</p>",
      implementation: "<p>Cross-functional analytics that previously couldn't run against Azure SQL now run safely against Gold — solving the original Module 1 business problem.</p>",
      why: "<p>Delivering to governed Gold (not raw source) means every consumer sees the same trusted numbers without impacting production OLTP.</p>",
      tradeoffs: "<p><strong>Gain:</strong> fast, consistent, safe analytics decoupled from production. <strong>Cost:</strong> consumers depend on pipeline freshness — data is only as current as the last successful run.</p>",
      failure: "<p><strong>Stale/failed upstream →</strong> consumers see older data until the pipeline recovers; monitoring/alerting (Module 4) ensures engineers fix ingestion before staleness becomes a business problem.</p>",
      interview: [
        { q: "How does this platform solve the original business problem?", a: "It gives business teams a governed, performant analytical layer (Gold via Unity Catalog) so they get history, quality, and cross-functional analytics without querying — and slowing — the production OLTP source." }
      ],
      followup: [
        "How fresh is the data consumers see? → bounded by the incremental job schedule (availableNow batch).",
        "How is access controlled? → Unity Catalog RBAC."
      ]
    },
    whatif: [
      { q: "What if consumers need near-real-time dashboards?", a: "You'd move upstream ingestion toward continuous processing (processingTime trigger, event-driven detection) — an Architecture Evolution that trades cost for freshness. The current design deliberately favours cost-efficient scheduled batch." }
    ],
    related: ["gold", "unity"]
  },

  /* ============ CONCEPT RECORDS (schema proof for later modes) ============ */

  watermark: {
    id: "watermark", title: "Watermark (Incremental Boundary)", icon: "🔖",
    tech: "metadata.watermark_table · last_load_time", tag: "handbook",
    source: { module: "Module 3", section: "Incremental extraction & watermark" },
    why: "The watermark is the saved timestamp that marks where the last successful extraction stopped, so each run only pulls new/changed rows.",
    layers: {
      simple: "<p>A watermark is the pipeline's <strong>bookmark</strong>. It remembers the moment the last successful load finished, so next time we only grab what changed since then.</p>",
      technical: "<p>It defines the <strong>lower boundary</strong> of the incremental extraction window. The Copy activity filters <span class='k'>WHERE updated_at &gt; last_load_time</span>; <span class='k'>GETUTCDATE()</span> captured at run start defines the <strong>upper boundary</strong>.</p>",
      internals: "<p>Stored per table in <span class='k'>metadata.watermark_table</span>. Read by the Lookup activity at the start; updated by a Script activity only after a successful copy. Because update happens post-copy, a mid-run failure leaves the old watermark intact.</p>",
      implementation: "<p><span class='k'>LKP_GET_TABLE_METADATA</span> reads it; <span class='k'>SCR_UPDATE_WATERMARK</span> writes <span class='k'>last_load_time = current_run_ts</span> on success only.</p>",
      why: "<p>Lower+upper boundaries make each run a bounded, repeatable window. Updating only on success gives idempotency and self-healing restarts.</p>",
      tradeoffs: "<p><strong>Gain:</strong> tiny, cheap incremental loads; safe restarts. <strong>Cost:</strong> if the watermark update fails after a successful copy, the next run reprocesses the window → duplicates (handled downstream).</p>",
      failure: "<p><strong>Copy OK, watermark update fails →</strong> old watermark stays → next run re-reads same rows → duplicates. Prevention: keep update idempotent and dedup downstream; the Watermark Failure Simulator (Iteration 2) walks this end to end.</p>",
      interview: [
        { q: "Why use both a lower and an upper boundary?", a: "The lower boundary (stored watermark) skips already-loaded rows; the upper boundary (timestamp captured at start) prevents skipping rows that arrive during the run — together they make the window exact and repeatable." },
        { q: "Why update the watermark only on success?", a: "So a failed run never advances past unprocessed data — the next run safely re-reads the same window (idempotency / self-healing)." }
      ],
      followup: [
        "What if the update fails after copy? → duplicates next run; rely on downstream dedup/MERGE.",
        "How do you backfill a date range? → parameterized full/incremental load resetting the effective window (Backfill Simulator)."
      ]
    },
    whatif: [
      { q: "What if the watermark is set too far back?", a: "The next run re-extracts a large window — heavy but not incorrect, since downstream dedup/MERGE keys absorb the overlap. Setting it too far forward is the dangerous case: it would skip data." }
    ],
    related: ["adf", "azuresql", "bronze"]
  },

  checkpoint: {
    id: "checkpoint", title: "Checkpoint (Streaming State)", icon: "📍",
    tech: "offsets/ · commits/ · sources/ · schema/", tag: "handbook",
    source: { module: "Module 5", section: "Auto Loader & Structured Streaming state" },
    why: "The checkpoint is the streaming job's memory — it records what has been processed so restarts resume correctly instead of reprocessing everything.",
    layers: {
      simple: "<p>A checkpoint is the streaming pipeline's <strong>memory</strong>. It records enough state to know exactly where it left off, so after a restart it continues instead of starting over.</p>",
      technical: "<p>Spark Structured Streaming persists <strong>offsets</strong> and <strong>commit</strong> state in the checkpoint directory; Auto Loader additionally stores <strong>source state</strong> so already-processed files aren't treated as new input.</p>",
      internals: "<p>Conceptual layout:</p><pre>checkpoint/\n  offsets/   -> planned progress per micro-batch\n  commits/   -> which batches finished\n  sources/   -> Auto Loader processed-file state\n  schema/    -> tracked/evolved schema</pre><p>On restart Spark reads the last <em>committed</em> offset and reconstructs position; unfinished batches replay for exactly-once.</p>",
      implementation: "<p>Each Auto Loader stream points at its own checkpoint path. It's what lets <span class='k'>availableNow=True</span> runs pick up only files added since the last run.</p>",
      why: "<p>Without durable state, a restart would reprocess all Bronze files (duplicates) or skip files (loss). The checkpoint is what makes exactly-once file handling possible.</p>",
      tradeoffs: "<p><strong>Gain:</strong> exactly-once, cheap incremental restarts. <strong>Cost:</strong> the checkpoint becomes critical state — lose it and you lose the processed-file memory.</p>",
      failure: "<p><strong>Checkpoint lost/corrupted →</strong> stream may reprocess everything → duplicates. Recovery relies on idempotent MERGE writes so reprocessing converges, or rebuilding the target. Detection: unexpected reprocessing volume.</p>",
      interview: [
        { q: "How does checkpointing prevent duplicate processing?", a: "It durably records processed offsets/commits and Auto Loader's processed-file state; on restart the job resumes from the last committed position and skips already-handled files." },
        { q: "What's in a checkpoint?", a: "offsets (planned progress), commits (completed batches), sources (Auto Loader file state), and schema — together the full resume point." }
      ],
      followup: [
        "What if the checkpoint is deleted? → reprocessing risk; mitigate with idempotent writes.",
        "How is this different from an ADF watermark? → same idea (durable progress) but for streaming file ingestion vs SQL timestamp extraction."
      ]
    },
    whatif: [
      { q: "What if the checkpoint is corrupted?", a: "Auto Loader loses its processed-file memory and may reprocess the whole Bronze folder, creating duplicates downstream. The safety net is idempotent MERGE writes in Silver so reprocessing converges to the same result rather than duplicating rows." }
    ],
    related: ["databricks", "autoloader", "delta"]
  },

  autoloader: {
    id: "autoloader", title: "Auto Loader", icon: "📥",
    tech: "cloudFiles · incremental file ingestion", tag: "handbook",
    source: { module: "Module 5", section: "Auto Loader" },
    why: "Auto Loader incrementally ingests only newly arrived Bronze files, with schema inference/evolution and exactly-once semantics via checkpointing.",
    layers: {
      simple: "<p>Auto Loader <strong>watches a folder and picks up only new files</strong>. It never re-reads files it has already processed, and it can adapt when the file's columns change.</p>",
      technical: "<p>The <span class='k'>cloudFiles</span> source on Structured Streaming. It performs incremental <strong>file detection</strong> (directory listing or file-notification), <strong>schema inference &amp; evolution</strong>, and <strong>exactly-once</strong> ingestion backed by a checkpoint.</p>",
      internals: "<p>New file → detected → recorded in checkpoint <span class='k'>sources/</span> → schema inferred/merged → loaded into a Spark DataFrame → written to Delta. Already-recorded files are skipped on subsequent runs.</p>",
      implementation: "<p>Reads Bronze Parquet, feeds Silver processing, and (in this project) runs with <span class='k'>availableNow=True</span> — drain currently available files, then stop.</p>",
      why: "<p>Incremental state + schema evolution + exactly-once, scaling to large numbers of files — far less operational burden than manually tracking processed files or re-scanning everything.</p>",
      tradeoffs: "<p><strong>Gain:</strong> incremental, evolution-tolerant, scales to many files. <strong>Cost:</strong> depends on checkpoint integrity; directory-listing mode gets expensive at extreme file counts (switch to file-notification).</p>",
      failure: "<p><strong>Checkpoint loss →</strong> reprocessing/duplicates; <strong>unexpected schema drift →</strong> handled by evolution or quarantined, depending on config. See Auto Loader Visualizer (Iteration 3).</p>",
      interview: [
        { q: "Why Auto Loader instead of COPY INTO or manual file tracking?", a: "Auto Loader keeps durable incremental state (which files are processed), supports schema evolution, and scales to huge file counts — COPY INTO and manual tracking don't give exactly-once incremental state at scale." },
        { q: "How does it achieve exactly-once?", a: "Processed-file state in the checkpoint plus Structured Streaming's offset/commit protocol means each file is ingested once even across restarts." }
      ],
      followup: [
        "Directory listing vs file notification? → listing is simple; notification scales better at high volume.",
        "What makes it not real-time here? → the availableNow trigger (incremental batch)."
      ]
    },
    whatif: [
      { q: "What if you need to design for billions of files?", a: "Switch from directory-listing to file-notification mode (event-driven), partition the input, and ensure checkpoint/source-state storage scales. This is the standard senior follow-up to 'why Auto Loader'." }
    ],
    related: ["databricks", "checkpoint", "bronze", "silver"]
  }
};
