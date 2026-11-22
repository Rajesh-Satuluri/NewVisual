// Per-module interview question bank (content/rendering split).
// The Study Hub aggregates every key here. Seeded from the modules' real
// interview content; add more `mXX: [...]` entries over time.

export const IQ_BANK = {
  m01: [
    { difficulty: 'medium', q: `What problem does Databricks solve that vanilla Apache Spark on EMR does not?`,
      a: `Databricks adds the managed control plane on top of Spark: collaborative notebooks, one-click cluster management, built-in Delta Lake (ACID + schema enforcement), Unity Catalog (governance), MLflow (experiment tracking), and Photon (C++ vectorized runtime). On raw EMR you manage all of this yourself — patching Spark versions, writing custom job schedulers, implementing your own governance. The platform dramatically reduces operational overhead and adds reliability guarantees that Spark alone cannot provide.` },
    { difficulty: 'easy', q: `Why is the Lakehouse better than a separate data lake + data warehouse?`,
      a: `A two-system architecture requires ETL pipelines to move data from lake to warehouse — creating staleness, duplication, and a new failure surface. The Lakehouse stores one copy of data as Delta Lake tables on object storage. All workloads (SQL analytics, ML training, streaming) read the same files through a unified compute layer. This eliminates the ETL step, cuts storage costs (object storage is 10× cheaper than warehouse storage), and ensures everyone works with the same version of truth.` },
    { difficulty: 'medium', q: `What is a Databricks Unit (DBU) and how is cost controlled?`,
      a: `A DBU is Databricks' billing unit — a normalized measure of processing capacity per hour. Cost = DBUs consumed × price per DBU (varies by cloud, cluster type, and tier). Key cost controls: (1) auto-termination — idle clusters shut down automatically; (2) spot instances for batch jobs reduce cost 60–80%; (3) SQL Warehouses auto-suspend when idle; (4) cluster policies enforce max node counts; (5) job clusters (ephemeral) vs all-purpose clusters (shared but billed per use). Photon reduces job duration, indirectly reducing total DBUs consumed.` },
    { difficulty: 'hard', q: `How does Databricks ensure ACID guarantees on object storage (S3)?`,
      a: `Delta Lake implements ACID via a transaction log — a directory of JSON commit files at _delta_log/. Every write (INSERT, UPDATE, DELETE, MERGE) appends a new commit file describing the operation atomically. Readers always check the log to determine which Parquet data files are valid for their snapshot. Conflicts between concurrent writers are detected via optimistic concurrency control — if two writers both try to modify overlapping files, one gets a ConcurrentModificationException and must retry. S3's strong read-after-write consistency (since 2020) makes this reliable without external locking.` },
  ],
  m02: [
    { difficulty: 'medium', q: `How does the Lakehouse differ from a traditional Kappa or Lambda architecture?`,
      a: `Lambda has a separate batch layer and speed layer — two codepaths, two sets of business logic to keep in sync. Kappa unifies them with streaming-only but requires reprocessing from a log for historical queries. The Lakehouse unifies by storing all data in Delta Lake tables that support both batch and streaming reads/writes via a single engine (Databricks), with no reprocessing required — historical data is already in the same format. Time travel gives you point-in-time queries without a separate batch layer.` },
    { difficulty: 'easy', q: `What is the role of the Delta transaction log?`,
      a: `The _delta_log directory contains JSON files, one per commit, that record every change to the table (which Parquet files were added/removed, schema changes, statistics). Readers reconstruct the current table state by replaying the log. After 10 commits, a Parquet checkpoint file is written to speed up log replay. This log is the source of ACID guarantees, time travel, and audit history — it's what turns a directory of Parquet files into a managed table.` },
    { difficulty: 'easy', q: `Why does the Lakehouse architecture reduce total cost compared to a two-tier lake+warehouse approach?`,
      a: `Two-tier architecture requires: (1) data stored twice — once in the lake, once loaded into the warehouse; (2) ETL pipelines to move and transform between layers; (3) compute for both the ETL and the warehouse query engine; (4) separate governance and cataloging tools for each tier. The Lakehouse eliminates ETL by serving all workloads from Delta tables directly. Storage is S3-priced. Compute is on-demand clusters that auto-terminate. Unity Catalog covers all assets. Result: 50–80% lower TCO for organizations that previously ran both a Redshift/BigQuery cluster and an S3 data lake.` },
  ],
  m03: [
    { difficulty: 'hard', q: `Walk me through what happens internally when you run MERGE INTO on a Delta table.`,
      a: `MERGE INTO target USING source ON condition WHEN MATCHED THEN UPDATE WHEN NOT MATCHED THEN INSERT: (1) Spark reads the Delta log to determine the current snapshot — which Parquet files are active. (2) Source is computed (broadcast if small, otherwise hash-partitioned). (3) Delta finds candidate files by checking min/max statistics in the log — files whose ranges overlap the join condition. Only candidate files are read. (4) For each candidate file: rows matching the WHEN MATCHED condition are updated (written to a new Parquet file); rows not in source are passed through; new rows from source are appended. (5) Old candidate files are marked as "remove" in the new commit file; new files are marked "add". (6) Delta writes the commit atomically to _delta_log. If another writer commits concurrently on overlapping files, this MERGE gets a conflict exception and retries from step 1.` },
    { difficulty: 'medium', q: `How does Delta Lake's time travel work at the file level?`,
      a: `Every Delta commit adds a JSON file to _delta_log/ listing "add" (new Parquet files) and "remove" (obsoleted Parquet files with deletionTimestamp). Time travel (VERSION AS OF 5 or TIMESTAMP AS OF '2024-01-15') reconstructs the snapshot at that point by replaying the log up to the target version/timestamp: only "add" entries that were not "removed" before the target time are included. The underlying Parquet files are never deleted — only the log entry changes. VACUUM removes Parquet files whose deletionTimestamp is older than the retention period (default 7 days). After VACUUM, time travel to before the vacuum period fails with FileNotFoundException. Key: the transaction log is the source of truth; Parquet files are immutable data that multiple snapshot versions can reference simultaneously.` },
    { difficulty: 'hard', q: `What is optimistic concurrency control in Delta and when does it fail?`,
      a: `Delta uses optimistic concurrency: writers assume there's no conflict, write their data files, then attempt to atomically commit their JSON log file as the next version. If two writers try to commit version N simultaneously, S3's put-if-absent semantics ensure only one succeeds. The losing writer re-reads the log from the last version it saw, checks whether the winning commit overlaps with its own changes (same file ranges → conflict; different partitions → compatible), and either retries successfully or throws ConcurrentModificationException. Operations that always conflict: two concurrent DELETE/UPDATE on overlapping rows. Operations that are compatible: two INSERT-only writers appending to different partitions.` },
  ],
  m04: [
    { difficulty: 'easy', q: `When should you use a Job Cluster vs an All-Purpose Cluster for a nightly ETL job?`,
      a: `Always use a Job Cluster for nightly ETL. An all-purpose cluster is billed continuously even when idle — if your ETL takes 30 minutes and runs at midnight, an all-purpose cluster would bill 23.5 hours of idle DBUs. A job cluster is created when the job starts, runs the workload, and is terminated on completion — you pay only for the 30 minutes of actual compute. Job clusters also use isolated environments (no shared state from interactive notebook sessions), which reduces subtle bugs. The only trade-off is a 2–5 minute cold start time, which is acceptable for nightly jobs.` },
    { difficulty: 'hard', q: `A Databricks job that used to run in 30 minutes now takes 3 hours. What do you check first?`,
      a: `1. Spark UI → Stages: find the longest stage. 2. Check for a data skew: one task takes 10× longer than others — add salting or repartition by a better key. 3. Check for spill: if tasks are spilling to disk (Spark UI → Summary Metrics → Spill), the executor memory is too small — increase driver/executor memory or switch to a memory-optimized instance type. 4. Check for new small-file explosion: if input has grown from 100 files to 100,000, OPTIMIZE the source table. 5. Check shuffle size: a large SortMergeJoin with a skewed key can cause OOM; switch to a broadcast join if one side is <10GB (spark.sql.autoBroadcastJoinThreshold). 6. Check for added Python UDFs — replace with Spark SQL built-ins or Pandas UDFs.` },
    { difficulty: 'easy', q: `What is the difference between Databricks Runtime (DBR) and DBR ML?`,
      a: `Standard DBR includes Apache Spark, Delta Lake, Python 3, PySpark, pandas, and Databricks-specific optimizations (Photon is included separately via SQL Warehouse or Photon-enabled clusters). DBR ML adds: pre-installed ML libraries (scikit-learn, TensorFlow, PyTorch, Keras, XGBoost, LightGBM, Hugging Face Transformers), MLflow pre-configured with the workspace tracking server, GPU driver support pre-configured. Use standard DBR for data engineering. Use DBR ML for any ML/AI training workload — installing these libraries manually on standard DBR is error-prone and slower than the optimized pre-built versions.` },
  ],

  // ── m05 · Photon Engine ────────────────────────────────────────────────
  m05: [
    { difficulty: 'medium', q: `What is Photon and why can't you get the same speedup by just adding more Spark executors?`,
      a: `<p><b>Photon is Databricks' native, vectorized query engine written in C++</b> that runs <i>underneath</i> the Spark API — same SQL/DataFrame code, a faster execution layer.</p>
        <ul>
          <li><b>Vectorized, not row-at-a-time</b> — it processes columnar batches (~1,024 values) in tight loops that the CPU can SIMD-vectorize, instead of the JVM's one-row-at-a-time object dispatch.</li>
          <li><b>No JVM tax</b> — no per-row boxing/unboxing, no garbage-collection pauses, cache-line-aligned data structures that keep hot data in L1/L2.</li>
          <li><b>Why more executors won't match it</b> — adding executors scales <i>horizontally</i> but each core still runs the slow JVM path; you pay more DBUs for the same per-core inefficiency. Photon makes each core faster, so you often finish quicker <i>and</i> cheaper.</li>
        </ul>`,
      tip: `Frame it as "vectorized C++ engine under the Spark API." The killer line: Photon speeds up a <b>single core</b>; adding executors only buys more slow cores.` },
    { difficulty: 'hard', q: `A query is 80% a Python UDF and 20% aggregation. Will Photon help, and what does the Spark UI show?`,
      a: `<p><b>Photon will barely help here.</b> Photon only accelerates operators it has a native implementation for — scans, filters, joins, aggregations, many built-in SQL functions. A Python UDF runs in a separate Python worker, so Photon can't touch it.</p>
        <ul>
          <li><b>Partial coverage</b> — Photon executes the 20% aggregation natively but <i>falls back</i> to Spark/JVM for the UDF portion. In the Spark UI's SQL/DAG view, Photon operators are marked; non-Photon ones (the UDF) are plain — that boundary is where the row-based data transfer (and cost) happens.</li>
          <li><b>The fix</b> — rewrite the UDF as a built-in expression or a SQL function so the whole plan stays in Photon; only then do you see the 3–8× speedup.</li>
          <li><b>Rule of thumb</b> — Photon shines on BI/ETL SQL; it does nothing for code it can't see inside (arbitrary Python).</li>
        </ul>`,
      tip: `Interviewers love this: Photon has <b>limited operator coverage</b> and <b>falls back</b> for anything unsupported (Python UDFs, some complex types). Check the query plan for "Photon" labels to see what's actually accelerated.` },
    { difficulty: 'easy', q: `Where does Photon run by default, and how do you turn it on for a cluster?`,
      a: `<p><b>Photon is on by default on SQL Warehouses</b> (every query benefits) and on serverless compute. For a classic all-purpose or job cluster you opt in.</p>
        <ul>
          <li><b>SQL Warehouse / serverless</b> — Photon is always on; nothing to configure.</li>
          <li><b>Classic clusters</b> — pick a <i>Photon-enabled</i> runtime when creating the cluster; it then bills at a higher DBU rate per hour but usually shortens the run.</li>
          <li><b>Cost lens</b> — higher DBU/hour × fewer hours often nets lower total cost for scan/aggregation-heavy work; measure both, don't assume.</li>
        </ul>`,
      tip: `Don't say "Photon is free." It costs more <b>per DBU-hour</b> but can reduce <b>total</b> DBUs by finishing faster — the win is workload-dependent.` },
  ],

  // ── m06 · Structured Streaming (Databricks surface) ────────────────────
  m06: [
    { difficulty: 'medium', q: `What is Auto Loader and why use it instead of a plain readStream on a directory?`,
      a: `<p><b>Auto Loader (<code>cloudFiles</code>) is Databricks' incremental file-ingestion source</b> that efficiently discovers and loads new files landing in cloud storage, exactly once.</p>
        <ul>
          <li><b>Scalable discovery</b> — instead of relisting the whole directory each micro-batch (O(files), brutal at millions of files), it can use cloud <b>notification queues</b> (SQS/SNS, Event Grid, Pub/Sub) to learn about new files as they arrive.</li>
          <li><b>Exactly-once &amp; durable</b> — it tracks which files it has already ingested in a RocksDB-backed checkpoint, so restarts never re-ingest or skip.</li>
          <li><b>Schema inference &amp; evolution</b> — infers schema, stores it, and can auto-evolve when new columns appear (<code>cloudFiles.schemaEvolutionMode</code>), parking bad records in a rescued-data column.</li>
        </ul>`,
      tip: `The one-liner: "plain directory listing is O(files) per batch; Auto Loader uses file-notification mode so discovery is O(new files)." That scaling argument is what they want.` },
    { difficulty: 'hard', q: `Trigger.AvailableNow vs a continuous streaming trigger — when and why?`,
      a: `<p><b><code>Trigger.AvailableNow</code> runs a stream like an incremental batch job:</b> process everything available right now in multiple micro-batches, then stop — while still using the streaming checkpoint for exactly-once bookkeeping.</p>
        <ul>
          <li><b>Use AvailableNow</b> for scheduled "catch up every hour/night" pipelines — you get streaming's checkpoint/idempotency guarantees without paying for an always-on cluster. It supersedes the older <code>Trigger.Once</code> because it respects rate limits (<code>maxBytesPerTrigger</code>) across many batches.</li>
          <li><b>Use a fixed-interval / continuous trigger</b> when you need low end-to-end latency (seconds) and the cost of a running cluster is justified.</li>
          <li><b>Cost framing</b> — AvailableNow turns streaming semantics into a cheap cron-driven job; continuous trades money for freshness.</li>
        </ul>`,
      tip: `Name the checkpoint: AvailableNow is "batch economics with streaming's exactly-once checkpoint." That's the phrase that signals you actually understand it.` },
    { difficulty: 'medium', q: `A streaming job restarted and reprocessed old data / produced duplicates. What's the usual cause on Databricks?`,
      a: `<p><b>Almost always a checkpoint problem.</b> The checkpoint location is the stream's memory of what it has committed; break it and you lose exactly-once.</p>
        <ul>
          <li><b>Checkpoint deleted or path changed</b> — the stream has no record of prior progress, so it restarts from the beginning (or the source's earliest offset).</li>
          <li><b>Two streams sharing one checkpoint dir</b> — they corrupt each other's offsets; every query needs its own location.</li>
          <li><b>Non-idempotent sink</b> — if you write to a non-Delta sink without <code>foreachBatch</code> + an idempotent upsert, a retried batch double-writes. Writing to Delta with a MERGE keyed on an event id is the standard dedupe.</li>
        </ul>`,
      tip: `First question to ask back: "Is the checkpoint intact and unique to this stream?" 90% of streaming duplicate/reprocess incidents are checkpoint mistakes.` },
  ],

  // ── m07 · Unity Catalog ────────────────────────────────────────────────
  m07: [
    { difficulty: 'easy', q: `What is Unity Catalog's three-level namespace and why does it matter?`,
      a: `<p><b>Unity Catalog governs data as <code>catalog.schema.table</code></b> — one metastore spanning all workspaces in a region, instead of the old per-workspace Hive metastore and two-level <code>schema.table</code>.</p>
        <ul>
          <li><b>Catalog</b> — top isolation boundary (e.g. <code>prod</code>, <code>dev</code>, a business unit). <b>Schema</b> groups tables. <b>Table/View/Volume/Model</b> is the object.</li>
          <li><b>Why it matters</b> — central governance: one place to grant permissions, see lineage, and share data across every workspace; no more copying tables or re-granting per workspace.</li>
          <li><b>Identity-based</b> — grants are to users/groups/service principals synced from your IdP, not tied to a cluster's instance profile.</li>
        </ul>`,
      tip: `Contrast with legacy Hive metastore: it was <b>per-workspace</b> and two-level. UC is <b>account-level, three-level</b>, with grants to identities, not clusters.` },
    { difficulty: 'hard', q: `How does Unity Catalog enforce fine-grained access (row/column security) when the actual files sit in S3 the user could read directly?`,
      a: `<p><b>Users don't get raw storage credentials — UC brokers access.</b> The cluster/warehouse asks UC for data; UC checks the grant, then hands back a short-lived, down-scoped credential for only the files the query is allowed to touch.</p>
        <ul>
          <li><b>Credential vending</b> — storage access goes through UC via storage credentials + external locations, so there is no standing IAM path from a user to the bucket.</li>
          <li><b>Row/column enforcement</b> — dynamic views or row filters &amp; column masks apply predicates/masking at query time based on the caller's group membership (<code>is_account_group_member(...)</code>).</li>
          <li><b>Requires compliant compute</b> — enforcement only holds on UC-enabled access modes (shared/single-user); a legacy no-isolation cluster can't be trusted with vended creds.</li>
        </ul>`,
      tip: `The key idea is <b>credential vending</b>: UC never gives the user the bucket, it gives the query a scoped, expiring token. That's how governance holds even though files live in object storage.` },
    { difficulty: 'medium', q: `What is Delta Sharing and how is it different from just granting someone access to your table?`,
      a: `<p><b>Delta Sharing is an open protocol for sharing live Delta data across organizations and platforms</b> — the recipient doesn't need a Databricks account or a copy of your data.</p>
        <ul>
          <li><b>No data movement</b> — you share a table/schema; the recipient reads the current Parquet files via short-lived pre-signed URLs. They always see fresh data, no nightly export.</li>
          <li><b>Cross-platform</b> — recipients can read from pandas, Spark, Power BI, etc. via the open protocol, not just Databricks.</li>
          <li><b>vs a grant</b> — a UC <code>GRANT</code> works <i>inside</i> your account/metastore; Delta Sharing reaches <i>external</i> parties with governance, auditing, and revocation you control.</li>
        </ul>`,
      tip: `"Share, don't copy" is the pitch. Emphasize it's an <b>open protocol</b> (recipients needn't be on Databricks) — that's what separates it from a normal cross-workspace grant.` },
  ],

  // ── m08 · Medallion Architecture ───────────────────────────────────────
  m08: [
    { difficulty: 'easy', q: `Describe Bronze / Silver / Gold and what actually changes between each layer.`,
      a: `<p><b>Medallion is a progressive-refinement pattern:</b> raw → cleaned/conformed → business-ready, each a set of Delta tables.</p>
        <ul>
          <li><b>Bronze</b> — raw, append-only, schema-as-received (plus ingest metadata). It's your replayable system of record; never transform in place here.</li>
          <li><b>Silver</b> — cleaned, deduplicated, type-cast, joined to conformed dimensions. One row per real-world entity/event; the trustworthy layer analysts and ML read.</li>
          <li><b>Gold</b> — aggregated, business-level tables/marts (KPIs, features) shaped for a specific consumer and optimized (ZORDER/clustering) for their query pattern.</li>
        </ul>`,
      tip: `The value: each layer is <b>recomputable from the one before it</b>. Keep Bronze immutable so you can always rebuild Silver/Gold after a logic bug — that replayability is the whole point.` },
    { difficulty: 'medium', q: `Why keep Bronze at all if Silver is the clean data everyone uses?`,
      a: `<p><b>Bronze is your insurance policy and audit trail.</b> It's cheap object storage and it's the only place the untouched source lives.</p>
        <ul>
          <li><b>Replay after bugs</b> — if a Silver transformation was wrong for a month, you reprocess from Bronze; without it the raw data may be gone from the source.</li>
          <li><b>Schema/requirements change</b> — new fields you ignored at first are still in Bronze, so you can backfill.</li>
          <li><b>Lineage &amp; compliance</b> — Bronze proves what you actually received, byte for byte, which auditors and debugging both need.</li>
        </ul>`,
      tip: `Say "Bronze is immutable raw capture." The interviewer is checking that you won't transform-in-place and lose the ability to reprocess history.` },
  ],

  // ── m09 · Delta Optimizations ──────────────────────────────────────────
  m09: [
    { difficulty: 'medium', q: `OPTIMIZE and ZORDER — what problem does each solve, and why not just partition?`,
      a: `<p><b>OPTIMIZE fixes the small-file problem; ZORDER improves data skipping on high-cardinality filters.</b></p>
        <ul>
          <li><b>OPTIMIZE</b> — compacts many small Parquet files into fewer ~1 GB files. Streaming/MERGE workloads produce lots of tiny files that wreck read performance; compaction restores it.</li>
          <li><b>ZORDER BY (col...)</b> — co-locates rows with similar values in the same files using a space-filling curve, so min/max stats let Delta skip files for filters on those columns. Great for columns you filter on that have too many distinct values to partition by.</li>
          <li><b>vs partitioning</b> — partitioning physically splits by a <i>low</i>-cardinality column (date); over-partitioning on high-cardinality columns creates the tiny-file disaster. ZORDER is the high-cardinality answer.</li>
        </ul>`,
      tip: `Partition on low-cardinality, ZORDER on high-cardinality filter columns. The classic mistake they probe for is <b>partitioning by a high-cardinality key</b> (e.g. user_id) → millions of tiny files.` },
    { difficulty: 'hard', q: `What is Liquid Clustering and why did Databricks introduce it over partitioning + ZORDER?`,
      a: `<p><b>Liquid Clustering replaces both partitioning and ZORDER with a single, evolvable clustering scheme</b> (<code>CLUSTER BY</code>) that incrementally keeps data well-organized without rewriting everything.</p>
        <ul>
          <li><b>No partition commitment</b> — you don't bake a physical partition layout into the directory structure, so you avoid the small-file and skew problems a bad partition key causes.</li>
          <li><b>Changeable keys</b> — you can alter clustering columns later; with partitioning, changing the key means rewriting the whole table.</li>
          <li><b>Incremental</b> — clustering is applied to new/affected data over time (and with predictive optimization, automatically), not as one giant ZORDER rewrite.</li>
        </ul>`,
      tip: `Pitch: "one <code>CLUSTER BY</code> that you can change without a full rewrite, and that avoids the partition-key trap." That trade — flexibility + no small-file risk — is why it exists.` },
    { difficulty: 'easy', q: `What does VACUUM do, and what's the risk of running it with a very short retention?`,
      a: `<p><b>VACUUM physically deletes data files no longer referenced by the current table version</b> and older than the retention threshold (default 7 days), reclaiming storage.</p>
        <ul>
          <li><b>It's about tombstoned files</b> — files that MERGE/DELETE/OPTIMEZE marked "removed" but left on disk for time travel.</li>
          <li><b>Short retention risk</b> — <code>VACUUM ... RETAIN 0 HOURS</code> can delete files a concurrent long-running reader or streaming query is still using, and it destroys time travel/rollback for that window.</li>
          <li><b>Guardrail</b> — Databricks blocks sub-7-day retention unless you explicitly disable the safety check; keep enough retention to cover your longest-running query and your rollback needs.</li>
        </ul>`,
      tip: `Connect it to time travel: VACUUM is the thing that <b>ends</b> your ability to time-travel before the retention window. Don't set it shorter than your longest reader.` },
  ],

  // ── m10 · Workflows & Jobs ─────────────────────────────────────────────
  m10: [
    { difficulty: 'medium', q: `How do you pass data/state between tasks in a Databricks Workflow?`,
      a: `<p><b>Use task values and job parameters — not shared global variables</b>, because each task can run on its own cluster/process.</p>
        <ul>
          <li><b>Task values</b> — <code>dbutils.jobs.taskValues.set(key, value)</code> in an upstream task, read with <code>get(taskKey, key)</code> downstream. Small control data (a row count, a path, a flag), not big datasets.</li>
          <li><b>Big data between tasks</b> — write to a Delta table; the next task reads it. Never try to hand a DataFrame between tasks.</li>
          <li><b>Parameters</b> — job-level parameters and <code>{{job.parameters.x}}</code> templating let one job run be configured at trigger time (e.g. a backfill date).</li>
        </ul>`,
      tip: `The trap answer is "a global variable." Correct answer: <b>task values</b> for small control flow, a <b>Delta table</b> for actual data — because tasks don't share memory.` },
    { difficulty: 'hard', q: `A multi-task job fails on task 4 of 6. How do retries, repair-run, and idempotency interact?`,
      a: `<p><b>You want to re-run only the failed subtree, and each task must be safe to re-run.</b></p>
        <ul>
          <li><b>Repair run</b> — re-executes only failed/downstream tasks from the same run, reusing successful upstream outputs, instead of restarting the whole job. Saves time and DBUs on long pipelines.</li>
          <li><b>Task-level retries</b> — configurable retry count/interval handles transient failures (a flaky API) automatically before the task is marked failed.</li>
          <li><b>Idempotency is on you</b> — a retried/repaired task that appends will double-write. Make writes idempotent: MERGE/overwrite a partition keyed on the batch, so re-running task 4 yields the same result.</li>
        </ul>`,
      tip: `Three words: <b>retries, repair-run, idempotent writes</b>. The senior point is that repair-run only helps if your tasks are idempotent — otherwise re-running corrupts data.` },
  ],

  // ── m11 · MLflow & Model Serving ───────────────────────────────────────
  m11: [
    { difficulty: 'medium', q: `What are the four MLflow components and which one solves "it worked in the notebook but not in prod"?`,
      a: `<p><b>MLflow = Tracking, Models, Model Registry, Projects/Recipes.</b> Reproducibility across environments is mainly <b>Tracking + Models</b>.</p>
        <ul>
          <li><b>Tracking</b> — logs params, metrics, and artifacts per run, so you can compare experiments and know exactly what produced a model.</li>
          <li><b>Models</b> — a standard packaging <i>flavor</i> that captures the model plus its environment (conda/requirements), so it loads the same way anywhere — that's the "works in prod" fix.</li>
          <li><b>Model Registry</b> — versioning + stage/alias transitions (Staging→Production) with governance; <b>Projects</b> package reproducible training runs.</li>
        </ul>`,
      tip: `Pin the "works in my notebook" problem to the <b>logged environment</b> in the MLflow Model flavor — captured deps are what make loads reproducible. In UC, the registry is now catalog-governed via model aliases.` },
    { difficulty: 'hard', q: `You need to serve a model at low latency for an app. Batch scoring vs Model Serving endpoints — how do you choose?`,
      a: `<p><b>Match the serving mode to the consumption pattern, not the model.</b></p>
        <ul>
          <li><b>Batch / streaming scoring</b> — load the model as a Spark UDF and score a Delta table on a schedule. Best when predictions are consumed later (daily recommendations, risk scores) — cheapest, highest throughput.</li>
          <li><b>Model Serving endpoint</b> — a managed, autoscaling REST endpoint (serverless) for real-time, per-request inference an app calls synchronously. Scales to zero when idle; pay for request compute.</li>
          <li><b>Decision</b> — need a prediction <i>in the moment a user acts</i> → endpoint. Need predictions <i>precomputed for later lookup</i> → batch, then serve from a table/online store.</li>
        </ul>`,
      tip: `Reframe "low latency" as "synchronous per-request." If the app blocks on the prediction → Serving endpoint. If you can precompute → batch is far cheaper. Mention scale-to-zero for cost.` },
  ],

  // ── m12 · Cost & Performance ───────────────────────────────────────────
  m12: [
    { difficulty: 'medium', q: `Your monthly Databricks bill doubled. How do you find out why — what do you actually query?`,
      a: `<p><b>Use system tables (<code>system.billing.usage</code>) and tagging — don't guess from the clusters page.</b></p>
        <ul>
          <li><b>system.billing.usage</b> — per-DBU usage records you can group by workspace, SKU, cluster, job, and <b>custom tags</b> to see exactly what grew.</li>
          <li><b>Tag everything</b> — cluster/job/warehouse tags (team, project, env) are what let you attribute cost; untagged compute is the usual blind spot.</li>
          <li><b>Common culprits</b> — an all-purpose cluster left running, auto-termination disabled, a SQL Warehouse not auto-suspending, a runaway job retrying, or serverless usage spiking.</li>
        </ul>`,
      tip: `Lead with "<b>system tables + tags</b>, grouped by job and SKU." Naming <code>system.billing.usage</code> specifically signals you've done real cost work, not just looked at the UI.` },
    { difficulty: 'easy', q: `Spot/preemptible instances cut cost 60–80%. When is it safe to use them and when not?`,
      a: `<p><b>Use spot for fault-tolerant workloads; keep the driver on-demand.</b></p>
        <ul>
          <li><b>Safe</b> — batch ETL/transform jobs where Spark can recompute lost tasks via lineage; a reclaimed worker just reruns its partitions.</li>
          <li><b>Keep on-demand</b> — the <b>driver</b> (losing it kills the whole job) and latency-sensitive/interactive or SLA-critical streaming where a reclaim storm causes missed deadlines.</li>
          <li><b>Pattern</b> — hybrid pool: on-demand driver + a few on-demand workers for stability, spot for the elastic bulk, with fallback-to-on-demand configured.</li>
        </ul>`,
      tip: `The specific win: "spot workers, on-demand driver." Losing a spot worker is recoverable (recompute); losing the driver is fatal — that asymmetry is the whole answer.` },
  ],

  // ── m13 · Interview / System Design ────────────────────────────────────
  m13: [
    { difficulty: 'hard', q: `Design a near-real-time order analytics pipeline on Databricks (end to end).`,
      a: `<p><b>Auto Loader → Medallion Delta → SQL Warehouse, with streaming where freshness matters and batch where it doesn't.</b></p>
        <ul>
          <li><b>Ingest</b> — orders land in S3; Auto Loader (file-notification mode) streams them into <b>Bronze</b> (append-only, raw) within seconds.</li>
          <li><b>Silver</b> — a Structured Streaming job (or DLT) MERGEs into <code>orders_silver</code> on <code>order_id</code> to dedupe and enrich from UC dimension tables; this is the trusted layer.</li>
          <li><b>Gold</b> — a scheduled Workflow aggregates to <code>orders_gold_hourly</code>, OPTIMIZE + cluster on the dashboard's filter columns.</li>
          <li><b>Serve &amp; govern</b> — a Photon SQL Warehouse (auto-suspend) serves BI; Unity Catalog grants + lineage; job alerts + Delta <code>EXPECT</code>/constraints for data quality.</li>
        </ul>`,
      tip: `Always state latency SLAs per layer (Bronze &lt;1 min, Silver &lt;5 min, Gold hourly) and name the data-quality mechanism (DLT expectations / Delta constraints). That's what turns a diagram into a design.` },
    { difficulty: 'hard', q: `Delta vs Iceberg vs Hudi — how do you choose, and what's the honest Databricks-biased answer?`,
      a: `<p><b>All three are open table formats giving ACID + time travel on object storage; pick by engine mix and workload.</b></p>
        <ul>
          <li><b>Delta</b> — first-class on Databricks (Photon, Unity Catalog, DLT, Liquid Clustering). Best when Databricks/Spark is your primary engine. Open since Delta 2.0; UniForm even exposes Iceberg-compatible metadata.</li>
          <li><b>Iceberg</b> — strongest multi-engine story (Trino, Flink, Snowflake, Spark all native), cleaner hidden partitioning/partition evolution. Choose when engines are heterogeneous.</li>
          <li><b>Hudi</b> — built for record-level incremental upserts (CDC from DB binlogs), copy-on-write vs merge-on-read tuning.</li>
        </ul>`,
      tip: `Show you know the boundary: "on Databricks → Delta; Trino/Flink-centric lake → Iceberg; sub-minute CDC upserts → Hudi." Mentioning <b>UniForm</b> (Delta exposing Iceberg metadata) signals current knowledge.` },
  ],
};
