// Tiered answers — one interview question, the same answer at three depths:
// Weak (what a junior says), Good (a solid mid-level answer), Senior (what
// actually impresses), plus why the senior answer wins. Shows not just the
// right answer but how depth and framing level up.
//
// Shape: { id, question, topic, moduleId,
//          tiers: [ { label: 'Weak'|'Good'|'Senior', body } ], whySenior }
// Trusted in-repo HTML.

export const TIERED = [
  {
    id: 'what-is-databricks',
    topic: 'Fundamentals',
    moduleId: 'm01',
    question: `What is Databricks, and why would a team use it instead of running Spark themselves on EMR?`,
    tiers: [
      { label: 'Weak', body: `"Databricks is a cloud platform for running Spark. It has notebooks and it's managed, so it's easier than setting up your own cluster."` },
      { label: 'Good', body: `"Databricks is a managed Lakehouse platform built around Spark. On top of raw Spark it adds Delta Lake for ACID tables, Unity Catalog for governance, MLflow for ML, and the Photon engine, plus managed clusters and collaborative notebooks. On EMR you'd build and operate all of that yourself."` },
      { label: 'Senior', body: `"Databricks is the company that created Spark, Delta Lake, and MLflow, packaged as a managed <b>Lakehouse</b>. The real pitch isn't 'managed Spark' — it's that it collapses the two-system lake+warehouse architecture into one: a single copy of data as Delta tables on object storage, served to SQL, ML, and streaming through one governed, optimized engine (Photon + Unity Catalog). Versus EMR you're not just saving ops toil — you're getting ACID guarantees, lineage, fine-grained governance, and time travel that raw Spark-on-S3 simply doesn't provide. The trade-off is cost and lock-in to the platform's DBU model, which I'd weigh against a team's willingness to operate open infrastructure themselves."` },
    ],
    whySenior: `The senior answer names the core abstraction (the Lakehouse collapsing lake+warehouse), explains <i>what you actually gain</i> over EMR beyond convenience (ACID, governance, time travel), and — crucially — states the trade-off (cost/lock-in). Knowing the boundary separates "I've used Databricks" from "I understand why it exists."`,
  },
  {
    id: 'what-is-lakehouse',
    topic: 'Architecture',
    moduleId: 'm02',
    question: `What is a Lakehouse?`,
    tiers: [
      { label: 'Weak', body: `"It's a mix of a data lake and a data warehouse — the best of both."` },
      { label: 'Good', body: `"A Lakehouse stores data as open-format tables (Delta/Parquet) on cheap object storage, but adds warehouse features on top: ACID transactions, schema enforcement, and SQL performance. So you get the low-cost, flexible storage of a lake with the reliability and BI performance of a warehouse, without copying data between two systems."` },
      { label: 'Senior', body: `"A Lakehouse is a <b>transaction layer over object storage</b> — the key enabler is a table format like Delta whose transaction log turns a directory of Parquet files into an ACID table with time travel. That one idea removes the reason you needed a separate warehouse: you keep a single copy of data on S3-priced storage and serve batch, streaming, SQL, and ML from it through one engine. Architecturally it replaces Lambda's two codepaths and the lake→warehouse ETL hop, which were the real sources of staleness, duplication, and drift. The catch is that performance depends on <i>maintaining</i> that layout — compaction, clustering, stats — so a Lakehouse isn't 'free warehouse performance', it's warehouse performance you have to tend."` },
    ],
    whySenior: `"Best of both worlds" is a slogan. The senior answer names the mechanism (a transaction log over Parquet), explains what it <i>eliminates</i> (two-tier ETL, Lambda's dual codepaths), and admits the cost (you must maintain the layout). That's understanding versus marketing.`,
  },
  {
    id: 'delta-acid-on-s3',
    topic: 'Delta Lake',
    moduleId: 'm03',
    question: `How does Delta Lake give you ACID transactions on object storage that has no locks?`,
    tiers: [
      { label: 'Weak', body: `"Delta has a transaction log that keeps everything consistent."` },
      { label: 'Good', body: `"Delta keeps a transaction log — JSON commit files in <code>_delta_log</code>. Every write appends a commit listing which Parquet files were added and removed. Readers replay the log to know which files are valid, and that gives atomicity and consistency. Concurrent writers use optimistic concurrency, so if two conflict, one retries."` },
      { label: 'Senior', body: `"The log is the table. Each write stages new Parquet files, then atomically commits a numbered JSON entry describing adds/removes — atomicity comes from the commit being a single all-or-nothing file write. Isolation is <b>optimistic concurrency</b>: writers don't lock; they attempt to commit version N, and only one can win that version because the underlying store gives <i>put-if-absent</i> semantics. The loser re-reads the log, checks whether the winner's changed files overlap its own, and either retries cleanly (disjoint files) or throws a conflict (overlapping DELETE/UPDATE). Durability is object storage itself. So 'ACID without locks' is really 'atomic log append + optimistic concurrency + a store that guarantees only-one-writer-wins-a-version' — which is why it works on S3 since read-after-write and conditional-put consistency landed, and why conflicts are file-overlap-based, not row-based."` },
    ],
    whySenior: `The good answer lists the pieces; the senior answer explains <i>why each ACID property holds</i> and ties isolation to the storage primitive (conditional put) that makes a lock-free design safe. It also predicts behavior — conflicts are file-overlap, not row-level — which is the follow-up interviewers ask next.`,
  },
  {
    id: 'photon-speedup',
    topic: 'Photon',
    moduleId: 'm05',
    question: `Why is Photon faster than regular Spark?`,
    tiers: [
      { label: 'Weak', body: `"Photon is written in C++ so it's faster than the JVM."` },
      { label: 'Good', body: `"Photon is a vectorized engine in native C++ that runs under the Spark API. Instead of processing one row at a time on the JVM, it processes columnar batches, which the CPU can vectorize (SIMD), and it avoids JVM overhead like garbage collection and object boxing. That gives big speedups on scans, filters, joins, and aggregations."` },
      { label: 'Senior', body: `"It's vectorized, columnar execution: Photon works on batches of ~1,024 values in tight C++ loops that map to SIMD instructions, with cache-aligned data structures, no per-row JVM dispatch, no boxing, and no GC pauses. The important nuances: it only accelerates operators it has <b>native coverage</b> for — a Python UDF drops out of Photon back to the JVM, with a row-based handoff you can see in the query plan — so a UDF-heavy job barely benefits. And it's not 'free': Photon bills a higher DBU/<i>hour</i>, but by shortening runtime it often lowers total DBUs on scan/aggregation workloads. So the honest answer is 'faster per core via vectorization, where the operators are supported, and usually cheaper overall for the SQL/ETL it covers.'"` },
    ],
    whySenior: `"C++ is faster" is a one-liner anyone can say. The senior answer explains the mechanism (vectorized batches + SIMD + no JVM tax) <i>and</i> the two things interviewers probe: Photon's limited operator coverage (UDF fallback) and the DBU-per-hour-vs-total-cost nuance.`,
  },
  {
    id: 'exactly-once-streaming',
    topic: 'Streaming',
    moduleId: 'm06',
    question: `How do you get exactly-once processing in a Databricks streaming pipeline?`,
    tiers: [
      { label: 'Weak', body: `"You turn on exactly-once and Spark handles it."` },
      { label: 'Good', body: `"Structured Streaming gives exactly-once using checkpoints: it records the offsets it has processed, so after a restart it resumes from the right place instead of reprocessing. Writing to Delta keeps the output transactional, so a batch commits atomically."` },
      { label: 'Senior', body: `"Exactly-once comes from two cooperating pieces. First, the <b>checkpoint</b>: the stream durably records source offsets and write progress, so on recovery it replays only uncommitted data — that's replayable sources plus idempotent commit. Second, the <b>sink</b>: Delta's write is atomic and the engine tracks a batch id, so re-attempting a batch doesn't double-write. The catch is scope — this holds cleanly for <b>Delta-to-Delta</b>. The moment you write to an <i>external</i> system in <code>foreachBatch</code> (a database, an API), Kafka/Delta's guarantee doesn't extend there, so I make that write idempotent myself — a MERGE/upsert on a unique event id — turning at-least-once delivery into effective exactly-once at the sink. In practice most 'duplicate' incidents are a broken or shared checkpoint, not an engine failure."` },
    ],
    whySenior: `"Just turn it on" is the trap. The senior answer names both mechanisms (checkpoint + atomic sink), draws the <b>boundary</b> (Delta-to-Delta vs external sinks), gives the correct pattern for the common external-sink case (idempotent MERGE), and adds the operational reality (duplicates usually = checkpoint mistake).`,
  },
  {
    id: 'unity-catalog-value',
    topic: 'Governance',
    moduleId: 'm07',
    question: `What does Unity Catalog actually do for you?`,
    tiers: [
      { label: 'Weak', body: `"It's a catalog for your tables so you can find them and set permissions."` },
      { label: 'Good', body: `"Unity Catalog is Databricks' governance layer: a single account-level metastore with a three-level <code>catalog.schema.table</code> namespace shared across workspaces. You grant permissions to users and groups, it tracks data lineage automatically, and it supports Delta Sharing for sharing data externally."` },
      { label: 'Senior', body: `"Unity Catalog centralizes governance across every workspace in one metastore, but the part that matters technically is <b>how it enforces</b> access. Grants are to <i>identities</i> (users/groups/service principals from the IdP), not to a cluster's cloud credentials, and UC enforces by <b>credential vending</b>: the compute asks UC for data, UC checks the grant and hands back a short-lived, down-scoped storage token for only the allowed files — so there's no standing IAM path from a user to the bucket. On top of that sit row filters, column masks, and dynamic views for fine-grained security, plus automatic lineage and auditing. The operational implication is real: enforcement only holds on UC-compliant access modes, so migrating off the Hive metastore is as much about re-granting identities and moving to compliant compute as it is about moving the tables."` },
    ],
    whySenior: `The good answer describes <i>what</i> UC is; the senior answer explains <i>how</i> it enforces (identity-based grants + credential vending), which is the real differentiator from the old Hive metastore, and surfaces the migration gotcha (compliant access modes) that trips teams up in production.`,
  },
  {
    id: 'optimize-layout',
    topic: 'Performance',
    moduleId: 'm09',
    question: `My Delta queries are slow. How do you make them faster?`,
    tiers: [
      { label: 'Weak', body: `"Add more partitions and give the cluster more memory."` },
      { label: 'Good', body: `"First I'd check for small files and run OPTIMIZE to compact them. Then, for columns I filter on a lot, I'd ZORDER so Delta can skip files. I'd partition on a low-cardinality column like date, and avoid partitioning on high-cardinality columns because that makes tons of tiny files."` },
      { label: 'Senior', body: `"I'd diagnose before tuning — open the Spark UI, find whether it's small files, skew, spill, or just data volume. The layout toolkit, matched to cause: <b>OPTIMIZE</b> for small-file compaction (classic with streaming/MERGE sinks), <b>partitioning on low-cardinality</b> columns for coarse pruning, and <b>ZORDER / Liquid Clustering on high-cardinality</b> filter columns so per-file min/max stats drive data skipping — the single biggest trap being partitioning on a high-cardinality key and exploding into tiny files. On Databricks I'd lean toward <b>Liquid Clustering</b> on new tables since the keys are changeable without a full rewrite, and let <b>predictive optimization</b> maintain it. And I'd make sure stats exist and Photon is on for the scan/aggregation work. The meta-point: layout tuning only matters once you've confirmed the bottleneck <i>is</i> I/O, not a skewed join or a UDF."` },
    ],
    whySenior: `The weak answer is actively wrong (more partitions can hurt). The senior answer leads with <b>diagnosis</b>, matches each tool to the cause it fixes, names the high-cardinality-partition trap, and brings in current features (Liquid Clustering, predictive optimization) while reminding that layout only helps an I/O-bound query.`,
  },
  {
    id: 'cut-databricks-cost',
    topic: 'Cost',
    moduleId: 'm12',
    question: `How would you reduce a team's Databricks cost?`,
    tiers: [
      { label: 'Weak', body: `"Use smaller clusters and turn them off when not in use."` },
      { label: 'Good', body: `"Enable auto-termination so idle clusters shut down, use job clusters for scheduled work instead of all-purpose, let SQL Warehouses auto-suspend, and use spot instances for batch jobs. Those cover the biggest sources of waste."` },
      { label: 'Senior', body: `"First measure, then cut. I'd query <code>system.billing.usage</code> grouped by SKU, job, and tags to find <i>where</i> the money goes — most 'cost problems' are one or two culprits, not death by a thousand cuts. The usual wins, in order of impact: kill always-on all-purpose clusters by enforcing auto-termination via <b>cluster policy</b> (so it can't be disabled) and moving recurring work to ephemeral job clusters; put <b>spot workers with an on-demand driver</b> on fault-tolerant batch; let SQL Warehouses auto-suspend and right-size them; and consider Photon where it shortens scan/aggregation runs enough to lower total DBUs. Underpinning all of it is <b>tagging</b> — without tags you can't attribute or alert on cost. So my answer is a loop: tag everything, attribute with system tables, fix the top drivers with policy (not goodwill), and monitor DBU trends so it doesn't regress."` },
    ],
    whySenior: `The good answer is a correct checklist; the senior answer turns it into a <b>method</b> — measure with system tables, enforce with policy rather than hope, and close the loop with monitoring — and gets the spot nuance right (on-demand driver). It shows you'd find the real driver instead of applying every lever blindly.`,
  },
];
