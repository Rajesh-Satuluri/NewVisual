/* ============================================================
   Cloud DE Visualizer — AWS service catalogue.
   Interview-critical AWS data services, each with six depth
   levels (What / Why / How / DE Use Case / Integrations /
   Runtime) plus key facts and interview Q&A. Consumed by
   _service-detail.js (renderer) and formats/aws.js (nav).

   Build progress:
     S1 ✅ S3, Glue Data Catalog
     S2 ✅ Glue ETL, Lake Formation
     S3 ✅ EMR, Athena
     S4 ✅ Redshift, Redshift Spectrum
     S5 ✅ Kinesis, MSK
     S6 ✅ Step Functions, MWAA, Lambda, DMS
   [AWS service catalogue complete: 14 services]
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  const AWS_SERVICES = [
    /* ── STORAGE ─────────────────────────────────────────── */
    {
      id: 's3', name: 'Amazon S3', category: 'storage',
      aka: 'Simple Storage Service — the object store the whole AWS lake sits on',
      tagline: 'The default data lake on AWS: virtually unlimited object storage with eleven 9s of durability, where nearly every analytics engine reads and writes its data.',
      keyFacts: [
        { k: 'Model', v: 'Flat object store (key = prefix)' },
        { k: 'Durability', v: '99.999999999% (11 nines)' },
        { k: 'Consistency', v: 'Strong read-after-write' },
        { k: 'Classes', v: 'Standard / IA / Glacier / Intelligent-Tiering' },
      ],
      what: {
        lead: 'S3 stores objects (bytes + metadata) inside buckets under a flat key namespace. There are no real folders — a "path" like orders/2024/01/file.parquet is just a slash-delimited object key, and the console fakes folders from those prefixes.',
        bullets: [
          { h: 'Buckets and keys', d: 'A bucket is a globally-named container; every object is addressed by its key. Analytics layouts encode partitions into the key (e.g. dt=2024-01-01/) so engines can prune by prefix.' },
          { h: 'Storage classes', d: 'Standard for hot data, Standard-IA / One Zone-IA for infrequent access, Glacier / Glacier Deep Archive for cold history, and Intelligent-Tiering to move objects automatically based on access.' },
          { h: 'Strong consistency', d: 'Since 2020 S3 is strongly read-after-write consistent for all operations — a written or overwritten object is immediately readable, which removed a whole class of eventual-consistency bugs in Spark commit.' },
        ],
      },
      why: {
        lead: 'Analytics needs a place to keep enormous volumes of raw and refined data cheaply, durably, and decoupled from compute. S3 gives object-storage economics with the durability and throughput to be the single source of truth that every engine — EMR, Athena, Redshift Spectrum, Glue, and external Spark — reads from.',
        bullets: [
          { h: 'Decoupled storage & compute', d: 'Clusters are ephemeral; the data lives on S3 and outlives any one engine, so you spin compute up and down without moving data.' },
          { h: 'Cheap and elastic', d: 'Pennies per GB with no capacity planning, plus lifecycle rules and tiering to push cold data down automatically.' },
          { h: 'Durable by design', d: 'Objects are redundantly stored across multiple Availability Zones (for the multi-AZ classes), giving eleven 9s of durability without any effort.' },
        ],
      },
      how: {
        lead: 'Clients address data as s3://bucket/key (or the s3a:// scheme from Spark). Access is granted through IAM policies, bucket policies, and optionally S3 Access Points; encryption is applied server-side with SSE-S3 or SSE-KMS keys.',
        bullets: [
          { h: 'Partitioned key layout', d: 'Writing Hive-style partitions (col=value/) into the key lets Athena, Glue, and Spark prune scans to only the prefixes they need — the single biggest cost lever on S3-backed queries.' },
          { h: 'Event notifications', d: 'S3 can fire events on object creation to Lambda, SQS, SNS, or EventBridge — the trigger that kicks off event-driven ingestion the moment a file lands.' },
          { h: 'Lifecycle & tiering', d: 'Lifecycle rules transition objects Standard → IA → Glacier after N days and expire old versions, cutting storage cost without any code.' },
        ],
        code: {
          lang: 'spark (s3a path)',
          text: "df = spark.read.parquet(\n  \"s3a://shopkart-lake/bronze/orders/\"\n)\ndf.write.mode(\"overwrite\").partitionBy(\"dt\").parquet(\n  \"s3a://shopkart-lake/silver/orders/\"\n)",
        },
      },
      deUseCase: {
        lead: 'S3 is the storage foundation under essentially every AWS pipeline — the landing zone for ingestion and the physical home of the Bronze/Silver/Gold (raw/clean/curated) tables.',
        bullets: [
          { h: 'Landing + medallion lake', d: 'Kinesis Firehose, DMS, or Glue land raw files in a Bronze prefix; Glue/EMR Spark refine into Silver and Gold on the same bucket.' },
          { h: 'Query-in-place tables', d: 'Athena, Redshift Spectrum, and EMR read S3 directly through Glue Data Catalog table definitions — no load step, you query the files where they sit.' },
        ],
      },
      integrations: [
        { id: 'glue-catalog', label: 'Glue Data Catalog', note: 'catalogs S3 tables' },
        { id: 'glue-etl', label: 'Glue ETL', note: 'reads / writes lake data' },
        { id: 'lake-formation', label: 'Lake Formation', note: 'governs access to S3 data' },
        { label: 'Athena', note: 'serverless SQL over S3' },
        { label: 'EMR / external Spark', note: 'reads via s3a://' },
      ],
      runtime: {
        lead: 'At runtime S3 delivers massive parallel throughput — thousands of requests per second per prefix — so readers fan out across many objects at once. Because it is object storage, there is no folder rename: Spark job commit copies objects, which is why committers (and table formats like Iceberg/Delta) matter for performance.',
        bullets: [
          { h: 'Throughput scales with prefixes', d: 'Request rate scales per prefix, so spreading data across many key prefixes (partitions) increases parallel read/write throughput.' },
          { h: 'No atomic directory rename', d: 'Unlike a filesystem, "renaming" a prefix means copy-then-delete of every object — the reason S3-optimized committers and manifest-based table formats exist.' },
          { h: 'Strong consistency', d: 'Read-after-write and list-after-write are strongly consistent, so pipelines no longer need the eventual-consistency workarounds older tooling carried.' },
        ],
      },
      architecture: {
        lead: 'S3 is a regional, massively-distributed object store. An object is bytes + metadata addressed by bucket + key; there is no block device and no directory tree. Objects in the multi-AZ classes are redundantly stored across ≥3 Availability Zones, which is where the eleven-9s durability comes from. The flat key namespace — not a filesystem — explains almost every S3 performance and correctness nuance for data engineering.',
        bullets: [
          { h: 'Flat namespace, prefix sharding', d: 'Keys are strings; the console fakes folders from slashes. Request throughput scales per prefix, so partitioned layouts (dt=…/) both prune scans and spread load across prefixes.' },
          { h: 'No atomic rename', d: 'A "rename" is copy-then-delete of every object. Spark/Hadoop commit protocols that rename a staging dir are slow and historically non-atomic on S3 — hence S3-optimized committers and manifest-based table formats (Iceberg/Delta/Hudi).' },
          { h: 'Strong consistency', d: 'Since Dec 2020, read-after-write and list-after-write are strongly consistent for all operations, removing the eventual-consistency workarounds older tooling carried.' },
          { h: 'Access Points & Multi-Region', d: 'S3 Access Points give per-application named endpoints with their own policies; Multi-Region Access Points route to the nearest copy across regions for global reads.' },
        ],
      },
      security: {
        lead: 'S3 security is layered: identity (IAM), resource (bucket) policies, Block Public Access as a safety net, encryption at rest (SSE), and encryption in transit (TLS). The default posture is private — public exposure is almost always a misconfiguration, and Block Public Access exists to stop it account-wide.',
        bullets: [
          { h: 'IAM + bucket policies', d: 'Identity-based IAM policies and resource-based bucket policies together decide access; an explicit Deny always wins. Access Points let you attach narrower policies per workload.' },
          { h: 'Block Public Access', d: 'Account- and bucket-level settings that override any policy/ACL that would make data public — the single most important guardrail against leaks.' },
          { h: 'Encryption', d: 'All new objects are encrypted at rest by default (SSE-S3). SSE-KMS adds customer-controlled keys with audit + rotation; DSSE-KMS adds dual-layer for regulated workloads. Enforce TLS with a policy condition (aws:SecureTransport).' },
          { h: 'Lake Formation / governance', d: 'For analytics, fine-grained (column/row) access is enforced via Lake Formation on the Glue Catalog tables that point at S3, not on S3 keys directly.' },
          { h: 'VPC endpoints', d: 'Gateway VPC endpoints keep S3 traffic off the public internet; bucket policies can require access only via a specific VPC endpoint.' },
        ],
      },
      operations: {
        lead: 'S3 is fully managed — no capacity planning — so operations centers on observability, data protection (versioning + replication), and lifecycle automation. Durability is 11 nines; availability varies by storage class and is covered by an SLA.',
        bullets: [
          { h: 'Versioning + MFA Delete', d: 'Versioning keeps every overwrite/delete as a prior version (protects against accidental or malicious deletion); MFA Delete hardens permanent removal. Pair with lifecycle rules to expire old versions.' },
          { h: 'Replication', d: 'Cross-Region (CRR) and Same-Region (SRR) replication asynchronously copy objects for DR, latency or compliance; replication time control (RTC) adds an SLA on replication lag.' },
          { h: 'Monitoring', d: 'CloudWatch metrics (requests, errors, bytes), S3 Storage Lens for estate-wide analytics, server access logs / CloudTrail data events for audit, and S3 Inventory for large-scale object reporting.' },
          { h: 'Integrity', d: 'Checksums on upload/download detect corruption; Object Lock (WORM) enforces retention for compliance.' },
        ],
      },
      cost: {
        lead: 'S3 bills on several independent dimensions: storage (per GB-month, by class), requests (per 1,000 GET/PUT/LIST), data transfer out, and management features (replication, Storage Lens advanced, inventory). For analytics, request cost and cross-AZ/region transfer often surprise teams more than raw storage. (Rates vary by region/class — price against the official S3 pricing page.)',
        bullets: [
          { h: 'Storage classes', d: 'Standard (hot) → Standard-IA / One Zone-IA (lower storage, retrieval fee) → Glacier Instant/Flexible/Deep Archive (cheapest storage, retrieval latency+fee). Intelligent-Tiering auto-moves objects when access patterns are unknown.' },
          { h: 'Request & retrieval', d: 'Millions of small files mean millions of GET/LIST requests — the small-files problem is a cost problem as well as a performance one. IA/Glacier add per-GB retrieval charges.' },
          { h: 'Data transfer', d: 'Out to the internet and cross-region is billed; keeping compute in the same region and using VPC/gateway endpoints avoids needless transfer cost.' },
          { h: 'Cost levers', d: 'Compact small files, lifecycle to colder tiers, expire old versions/incomplete multipart uploads, and partition/columnar-format data so engines scan (and bill) less.' },
        ],
      },
      walkthrough: {
        lead: 'What actually happens when a Spark job writes a partitioned Parquet dataset to S3 and commits it — the operation most people get wrong about object storage.',
        steps: [
          { h: 'Task writes to a staging key', d: 'Each Spark task writes its output objects under a job/task-attempt prefix (e.g. _temporary/0/task_…/ with the default FileOutputCommitter, or directly to the final prefix with the S3A/EMRFS optimized committer). Objects are uploaded via PUT or multipart upload for large parts.' },
          { h: 'Task commit', d: 'On task success the committer makes the task output visible. The classic v1/v2 committers do this by "renaming" the task dir to the job dir — on S3 that rename is a server-side COPY of every object followed by a DELETE, because there is no atomic directory rename.' },
          { h: 'Job commit', d: 'The driver runs job commit, promoting all task outputs to the final location. With the default committer this is another round of copy+delete and is the slow, failure-prone phase on large jobs. S3-optimized committers (EMRFS S3-optimized, S3A magic/directory) instead finalize staged multipart uploads with a single POST, avoiding the rename entirely.' },
          { h: 'Strong read-after-write', d: 'Because S3 has been strongly consistent since Dec 2020, a reader listing the prefix immediately afterward sees exactly the committed objects — no eventual-consistency guard (S3Guard/EMRFS consistent view) is needed anymore.' },
          { h: 'Catalog / manifest update', d: 'For a Hive table the new partitions are registered in Glue Data Catalog (MSCK / partition projection / addPartition). For Delta/Iceberg/Hudi the engine appends a commit to the table log/manifest, so readers switch to the new snapshot atomically instead of relying on listing the prefix.' },
        ],
        note: 'Simplified teaching model of the Hadoop/Spark commit protocol on S3; exact behavior depends on the committer in use. The takeaway interviewers probe: "rename" on S3 is copy+delete, which is why committers and table formats exist.',
      },
      examples: [{
        title: 'Partitioned Silver table with event-driven refresh and lifecycle tiering',
        requirement: 'Land raw order events as they arrive, expose an efficient partitioned Silver table for Athena, and tier cold data down automatically — without a running cluster waiting for files.',
        input: 'Newline-delimited JSON order events landing in s3://shopkart-lake/bronze/orders/ (a few hundred MB/day across many small files).',
        architecture: 'S3 (bronze) → S3 event notification → EventBridge → Glue job → S3 (silver, Parquet, partitioned by dt) → Glue Catalog → Athena. Lifecycle rule tiers bronze to Glacier after 90 days.',
        code: {
          lang: 'bash + sql (illustrative)',
          text: "# 1) Lifecycle: tier raw JSON to Glacier after 90d, expire after 1y\naws s3api put-bucket-lifecycle-configuration \\\n  --bucket shopkart-lake \\\n  --lifecycle-configuration file://lifecycle.json\n\n# 2) In the Glue/Spark job: write compacted, partitioned Parquet\n(df.repartition(\"dt\")\n   .write.mode(\"append\").partitionBy(\"dt\")\n   .parquet(\"s3a://shopkart-lake/silver/orders/\"))\n\n-- 3) Register the table once; use projection to skip MSCK\nALTER TABLE silver_orders SET TBLPROPERTIES (\n  'projection.enabled'='true',\n  'projection.dt.type'='date',\n  'projection.dt.range'='2023-01-01,NOW',\n  'projection.dt.format'='yyyy-MM-dd');",
        },
        steps: [
          'Create the lifecycle rule so raw data tiers to Glacier automatically.',
          'Wire S3 object-created events through EventBridge to start the Glue job (no idle cluster).',
          'In the job, compact to reasonably-sized Parquet files and partition by dt.',
          'Use Athena partition projection so new partitions are queryable without a crawler/MSCK.',
        ],
        output: 'A Silver table in Parquet, partitioned by dt, queryable in Athena with partition pruning; raw JSON aging to Glacier.',
        validation: 'Compare Athena row counts against source event counts for a day; confirm EXPLAIN shows partition pruning; check object sizes are tens–hundreds of MB, not KB.',
        errorHandling: 'Glue job retries with bookmarks to avoid reprocessing; a DLQ on the EventBridge target captures failed triggers; idempotent partition writes (overwrite the dt partition) make re-runs safe.',
        production: 'Budget for request cost if files are tiny — compaction is both a performance and a cost lever. Keep compute in the same region as the bucket and use a gateway VPC endpoint to avoid transfer charges.',
        cleanup: 'Delete the Glue job and table, remove the lifecycle rule, and empty/delete the bucket (including old versions and incomplete multipart uploads) to stop storage charges.',
      }],
      troubleshooting: [
        {
          symptom: 'A large Spark write to S3 takes far longer in job commit than in compute, and occasionally fails with duplicate/partial output after a retry.',
          evidence: 'Stage timeline shows tasks finishing quickly but the job hanging at the end; driver logs show thousands of COPY/DELETE calls during commit; output prefix briefly contains _temporary artifacts.',
          causes: ['Default FileOutputCommitter doing copy-then-delete "renames" on S3', 'Very many output files multiplying rename operations', 'Non-atomic job commit leaving partial output on failure'],
          investigation: ['Check which committer is configured (fs.s3a.committer.name / EMRFS consistent-committer settings)', 'Count output objects and partitions — rename cost scales with object count', 'Inspect driver logs for the commit phase duration vs. compute duration'],
          rootCause: 'The job is using a rename-based commit protocol on an object store that has no atomic rename, so commit degrades to O(objects) copy+delete and is not atomic on failure.',
          remediation: ['Switch to an S3-optimized committer (EMRFS S3-optimized committer, or S3A magic/directory committer)', 'Or write through a table format (Delta/Iceberg/Hudi) that commits via a manifest instead of a rename', 'Reduce output file count by compacting (coalesce/repartition) before write'],
          validation: 'Re-run the job: commit time drops to near-constant, no _temporary churn, and a killed-then-retried job produces exactly one correct copy of the output.',
          prevention: 'Standardize on an optimized committer or a table format across jobs; make writes idempotent at the partition level so retries are safe.',
        },
        {
          symptom: 'Intermittent HTTP 503 "SlowDown" errors from S3 during a burst of reads/writes at the start of a big job.',
          evidence: 'Client logs show 503 SlowDown on GET/PUT; errors cluster on a small set of key prefixes; they subside after a minute or on retry.',
          causes: ['Request rate on a single prefix exceeding the per-prefix scaling (≈3,500 write / 5,500 read req/s) before S3 auto-scales', 'All objects sharing one hot prefix (e.g. a single date)', 'No jittered retry/backoff on the client'],
          investigation: ['Map the failing requests to their key prefixes', 'Check whether the layout concentrates load on one prefix', 'Confirm the SDK retry policy uses exponential backoff with jitter'],
          rootCause: 'Request throughput scales per prefix and ramps gradually; a layout that funnels a burst through one prefix exceeds that prefix\u2019s current limit until S3 scales it up.',
          remediation: ['Spread load across more prefixes (finer partitioning / high-cardinality key component)', 'Enable and tune SDK exponential backoff with jitter', 'Pre-warm or stagger the burst where possible'],
          validation: '503 rate falls to ~0 under the same workload; throughput rises because reads/writes fan out across prefixes.',
          prevention: 'Design key layouts that distribute request load across prefixes from the start; keep backoff-with-jitter on by default.',
        },
      ],
      certMapping: {
        lead: 'S3 is foundational across AWS data certifications — the storage layer under nearly every scenario.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Data store selection & storage classes', 'Partitioning & file formats', 'Encryption, access control & lifecycle'] },
        ],
      },
      interview: [
        { q: 'Is S3 a filesystem? Why does that matter for Spark?', a: 'No — S3 is a flat object store where keys only look like paths. There are no real directories, so there is no atomic folder rename. Spark commits output by writing to a temp location then "renaming" it, which on S3 is a copy-then-delete of every object. That is slow and historically non-atomic, which is why S3-optimized committers and table formats (Iceberg/Delta/Hudi) that commit via a manifest instead of a rename are important.' },
        { q: 'How do you make S3-backed queries cheap and fast?', a: 'Partition the data by encoding partition columns into the key (dt=2024-01-01/), store it in a columnar format (Parquet/ORC) with compression, and keep file sizes reasonable (avoid the small-files problem). Engines like Athena then prune to only the relevant prefixes and read only the needed columns, so you scan far less data — and on Athena you literally pay per byte scanned.' },
        { q: 'How would you trigger a pipeline when a file lands in S3?', a: 'Enable S3 event notifications on object-created events and route them to Lambda, SQS, SNS, or EventBridge. EventBridge is the most flexible target — it can filter and fan out to Step Functions, Glue, or a Lambda that starts the ingestion job the moment the object appears.' },
        { q: 'What storage classes would you use across a data lake lifecycle?', a: 'Standard for hot working data, Standard-IA for data accessed occasionally, and Glacier / Glacier Deep Archive for cold history you rarely read. Intelligent-Tiering is the safe default when access patterns are unknown — it moves objects between tiers automatically. Lifecycle rules automate the transitions and expire old object versions.' },
      ],
    },

    /* ── GOVERNANCE / CATALOG ────────────────────────────── */
    {
      id: 'glue-catalog', name: 'AWS Glue Data Catalog', category: 'governance',
      aka: 'The Hive-compatible metastore for the whole AWS analytics stack',
      tagline: 'The central metadata repository that turns files on S3 into queryable tables — one schema definition shared by Athena, Redshift Spectrum, EMR, and Glue.',
      keyFacts: [
        { k: 'Role', v: 'Central Hive-compatible metastore' },
        { k: 'Holds', v: 'Databases, tables, schemas, partitions' },
        { k: 'Populated by', v: 'Crawlers, DDL, or the API' },
        { k: 'Consumed by', v: 'Athena, Redshift Spectrum, EMR, Glue' },
      ],
      what: {
        lead: 'The Glue Data Catalog is a managed, Hive-metastore-compatible repository of table metadata. It stores where the data lives (the S3 location), its schema (columns and types), its format (Parquet/CSV/JSON), and its partitions — but never the data itself, which stays on S3.',
        bullets: [
          { h: 'Databases and tables', d: 'Metadata is organized into databases (logical groupings) containing tables, each pointing at an S3 prefix with a defined schema and SerDe.' },
          { h: 'Crawlers', d: 'A crawler scans an S3 path, infers the schema and partitions, and creates/updates the table definition automatically — the usual way tables appear in the catalog.' },
          { h: 'Partitions', d: 'The catalog tracks each partition (dt=2024-01-01/) and its location, so query engines can prune to the partitions they need without listing S3.' },
        ],
      },
      why: {
        lead: 'Without a shared catalog, every engine would need its own copy of "what tables exist and what shape they are." The Glue Data Catalog gives the whole stack a single source of schema truth, so a table defined once is instantly queryable by Athena, Redshift Spectrum, and EMR — and governed centrally by Lake Formation.',
        bullets: [
          { h: 'One schema, many engines', d: 'Define orders once; Athena, Spectrum, and Spark all read the same definition — no schema drift between tools.' },
          { h: 'Schema-on-read over the lake', d: 'It layers table semantics on top of raw S3 files, so you get SQL tables without loading data into a warehouse.' },
          { h: 'The governance anchor', d: 'Lake Formation permissions are expressed against catalog databases/tables/columns, so the catalog is where fine-grained access control attaches.' },
        ],
      },
      how: {
        lead: 'Tables get into the catalog three ways: a crawler that infers schema from S3, DDL run through Athena (CREATE EXTERNAL TABLE), or direct API/IaC calls. Once registered, engines resolve a table name to its S3 location, format, and partition list at query time.',
        bullets: [
          { h: 'Crawler-driven', d: 'Point a crawler at s3://.../orders/, schedule it, and it keeps the schema and partition list current as new data arrives.' },
          { h: 'Partition management', d: 'New partitions are registered by re-crawling, by MSCK REPAIR TABLE / ALTER TABLE ADD PARTITION, or via partition projection (Athena computes partitions from a pattern, skipping the catalog entirely for high-cardinality cases).' },
          { h: 'Schema evolution', d: 'Crawlers can be configured to add new columns while preserving existing ones, so appended data with extra fields does not break existing tables.' },
        ],
        code: {
          lang: 'sql (Athena DDL)',
          text: "CREATE EXTERNAL TABLE orders (\n  order_id string, amount double\n)\nPARTITIONED BY (dt string)\nSTORED AS PARQUET\nLOCATION 's3://shopkart-lake/silver/orders/';\n\nMSCK REPAIR TABLE orders;  -- discover partitions",
        },
      },
      deUseCase: {
        lead: 'The Data Catalog is the metadata backbone of an AWS lakehouse — the layer that makes S3 files behave like a database and the point where governance and discovery live.',
        bullets: [
          { h: 'Unified lake metastore', d: 'Bronze/Silver/Gold tables are all registered here, so analysts query them by name in Athena and engineers read the same tables from Glue/EMR jobs.' },
          { h: 'Feeds serverless SQL', d: 'Athena has no storage of its own — it reads table definitions straight from the catalog, making the catalog a hard dependency for serverless querying.' },
        ],
      },
      integrations: [
        { id: 's3', label: 'Amazon S3', note: 'tables point at S3 paths' },
        { id: 'glue-etl', label: 'Glue ETL', note: 'reads/writes catalog tables' },
        { id: 'lake-formation', label: 'Lake Formation', note: 'governs catalog objects' },
        { label: 'Athena', note: 'query engine over the catalog' },
        { label: 'Redshift Spectrum / EMR', note: 'read catalog tables' },
      ],
      runtime: {
        lead: 'At query time an engine calls the catalog to resolve the table to its S3 location and prune partitions before it reads a single byte. The catalog itself is a metadata service, so it is fast and cheap — the heavy lifting is the S3 scan it directs.',
        bullets: [
          { h: 'Partition pruning', d: 'The engine asks the catalog only for partitions matching the WHERE clause, so it lists and scans a fraction of the lake.' },
          { h: 'Metadata scale', d: 'Tables with millions of partitions strain metastore lookups; partition projection sidesteps this by computing partitions from a pattern instead of storing them.' },
        ],
      },
      architecture: {
        lead: 'The Glue Data Catalog is a managed, Hive-metastore-compatible metadata service. It stores databases → tables (schema, SerDe/format, S3 location, partition list) and nothing else — the data stays on S3. Every engine resolves table names against it, and Lake Formation attaches governance to its objects.',
        bullets: [
          { h: 'Metadata, not data', d: 'A table record points at an S3 prefix with a schema, format and partition list; engines read the files from S3 after resolving the table here.' },
          { h: 'Population paths', d: 'Crawlers (infer schema/partitions from S3), DDL (CREATE EXTERNAL TABLE via Athena), or direct API/IaC calls create and update table definitions.' },
          { h: 'Partition handling', d: 'The catalog tracks every partition and its location; partition indexes speed lookups on tables with huge partition counts, and partition projection avoids storing them at all.' },
          { h: 'Schema registry & sharing', d: 'The Glue Schema Registry governs streaming message schemas separately; resource links (with Lake Formation) share catalog objects cross-account.' },
        ],
      },
      security: {
        lead: 'Catalog access is controlled by IAM on the Glue APIs and, for fine-grained data governance, by Lake Formation permissions on catalog databases/tables/columns/rows. Metadata can be encrypted and shared cross-account via resource policies/links.',
        bullets: [
          { h: 'IAM + Lake Formation', d: 'IAM gates who can call catalog APIs; Lake Formation expresses table/column/row-level access against catalog objects — the modern fine-grained model that Athena/Redshift/EMR honor.' },
          { h: 'Encryption', d: 'Catalog metadata (and connection passwords) can be encrypted with KMS; enforce it account-wide.' },
          { h: 'Cross-account', d: 'Catalog resource policies and Lake Formation resource links share databases/tables to other accounts without copying data.' },
          { h: 'Least privilege', d: 'Scope crawler and job roles to the specific databases/paths they manage, not the whole catalog.' },
        ],
      },
      operations: {
        lead: 'Operating the catalog is crawler/partition management, keeping schema evolution safe, and controlling partition-metadata scale.',
        bullets: [
          { h: 'Crawlers', d: 'Schedule crawlers (or incremental crawls) to keep schema/partitions current; configure how they handle schema changes and whether they combine compatible schemas vs create separate tables.' },
          { h: 'Partition maintenance', d: 'Register new partitions via crawler, MSCK/ALTER, or partition projection; add partition indexes for tables with very many partitions.' },
          { h: 'Schema evolution', d: 'Configure crawlers to add new columns while preserving existing ones so appended data with extra fields does not break tables.' },
          { h: 'Scale', d: 'Millions of partitions strain metastore lookups — use partition indexes or projection to keep query planning fast.' },
        ],
      },
      cost: {
        lead: 'The catalog bills for stored objects above a free tier, per-request access, and crawler run time (DPU-hours). It is cheap relative to the S3 scans it directs, but millions of partitions and over-frequent crawlers add up. (Rates vary — price against the official Glue pricing page.)',
        bullets: [
          { h: 'Objects + requests', d: 'Stored tables/partitions above the free tier and metadata requests are billed; huge partition counts increase both.' },
          { h: 'Crawler time', d: 'Crawlers bill DPU-hours — schedule them to data arrival, use incremental crawls, or skip them with projection where possible.' },
          { h: 'Projection saves metadata', d: 'Partition projection avoids storing/scanning millions of partitions, cutting both metadata cost and planning time.' },
        ],
      },
      walkthrough: {
        lead: 'How a query engine uses the catalog to read a partitioned table.',
        steps: [
          { h: 'Resolve the table', d: 'The engine (Athena/Spectrum/EMR) calls GetTable to get the schema, format and S3 location for the named table.' },
          { h: 'Get matching partitions', d: 'It calls GetPartitions filtered by the query’s partition predicate (or uses a partition index / projection) to find only the relevant S3 prefixes.' },
          { h: 'Prune before reading', d: 'With the partition list narrowed, the engine reads only those S3 prefixes — the catalog has pruned the scan before any data is read.' },
          { h: 'Apply governance', d: 'Lake Formation checks the principal’s access to the table/columns/rows and filters/denies accordingly.' },
          { h: 'Scan S3', d: 'The engine reads the selected files from S3; the catalog did the metadata work, S3 does the I/O.' },
        ],
        note: 'Simplified; projection replaces GetPartitions with a computed pattern.',
      },
      examples: [{
        title: 'Crawler-driven table with a partition index for a many-partition dataset',
        requirement: 'Register a large, date+region-partitioned S3 dataset as a catalog table and keep partition lookups fast as partitions grow into the millions.',
        input: 'Parquet in s3://shopkart-lake/silver/events/dt=…/region=…/.',
        architecture: 'S3 → Glue crawler (schema + partitions) → Glue Catalog table + partition index → Athena/Spectrum query with pruning.',
        code: {
          lang: 'sql / cli (illustrative)',
          text: "-- after the crawler creates the table, add a partition index\nALTER TABLE events ADD PARTITION INDEX (dt, region);\n-- or avoid the catalog entirely for high-cardinality dt via projection\nALTER TABLE events SET TBLPROPERTIES (\n  'projection.enabled'='true','projection.dt.type'='date',\n  'projection.dt.range'='2023-01-01,NOW','projection.dt.format'='yyyy-MM-dd');",
        },
        steps: [
          'Point a crawler at the partitioned S3 path to infer schema/partitions.',
          'Add a partition index (or switch to projection) for fast pruning at scale.',
          'Govern the table/columns with Lake Formation.',
          'Query via Athena/Spectrum with partition predicates.',
        ],
        output: 'A governed, partition-pruned catalog table whose queries stay fast even with very many partitions.',
        validation: 'Confirm partition pruning in query stats; verify the partition index/projection is used; check Lake Formation grants restrict as intended.',
        errorHandling: 'If the crawler mis-infers mixed schemas, configure its schema-change/grouping behavior or define the table via DDL; projection avoids partition-scan slowness.',
        production: 'Schedule crawlers to data arrival (or use projection); encrypt the catalog; least-privilege crawler/job roles; govern via Lake Formation.',
        cleanup: 'Drop the table/partition index; delete the crawler; remove the S3 data if decommissioning.',
      }],
      troubleshooting: [
        {
          symptom: 'A crawler creates unexpected duplicate tables, or a table’s schema becomes wrong/merged after new data lands.',
          evidence: 'Multiple tables for one dataset; columns change types or disappear; the crawler combined incompatible schemas (or split one dataset into many).',
          causes: ['Crawler grouping/schema-change behavior not configured for the data layout', 'Incompatible file schemas under one path confusing inference', 'Mixed formats/locations under the crawled prefix'],
          investigation: ['Review the crawler’s schema-change and table-grouping settings', 'Inspect the files for schema/format consistency', 'Check whether one logical table spans incompatible subfolders'],
          rootCause: 'The crawler’s inference/grouping does not match the actual S3 layout, so it mis-models the table(s).',
          remediation: ['Configure crawler grouping (create a single schema) / schema-change policy', 'Or define the table explicitly via DDL and stop crawling it', 'Standardize file schema/format under the path'],
          validation: 'One correct table per dataset with a stable schema as new data lands.',
          prevention: 'Keep consistent schema/format per prefix, configure crawler behavior deliberately, or manage critical tables with DDL/IaC.',
        },
        {
          symptom: 'Query planning is slow and metadata-heavy on a table with a very large number of partitions.',
          evidence: 'GetPartitions calls dominate query latency; the table has hundreds of thousands to millions of partitions; no partition index.',
          causes: ['Huge partition count with no partition index', 'Over-partitioning (too fine a partition scheme)', 'Catalog-stored partitions where projection would fit'],
          investigation: ['Count partitions and measure planning vs scan time', 'Check for a partition index', 'Assess whether partitions follow a predictable pattern (projection-friendly)'],
          rootCause: 'Resolving millions of catalog-stored partitions is expensive; without an index or projection, planning dominates.',
          remediation: ['Add partition indexes on the common filter columns', 'Adopt partition projection for predictable date/high-cardinality partitions', 'Coarsen over-fine partitioning'],
          validation: 'Query planning time drops sharply; GetPartitions overhead disappears.',
          prevention: 'Design partition granularity sensibly and use indexes/projection for high-cardinality partitioning from the start.',
        },
      ],
      certMapping: {
        lead: 'The Glue Data Catalog is the metadata/governance anchor in the AWS Data Engineer exam’s cataloging and access domains.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Cataloging S3 data (crawlers, DDL, schema)', 'Partition management (indexes, projection, MSCK)', 'Governance via Lake Formation on catalog objects'] },
        ],
      },
      interview: [
        { q: 'What is the Glue Data Catalog and what does it store?', a: 'It is a managed, Hive-metastore-compatible metadata repository. It stores databases, table definitions (schema, columns, types), the data format/SerDe, the S3 location, and the partition list — but not the data itself, which stays on S3. It gives the whole AWS analytics stack (Athena, Redshift Spectrum, EMR, Glue) a single shared source of schema truth.' },
        { q: 'How do new partitions become visible to Athena?', a: 'Several ways: re-run the crawler, run MSCK REPAIR TABLE (or ALTER TABLE ADD PARTITION for a specific one), or use partition projection. Projection is best for high-cardinality/date partitions — you describe the partition pattern in table properties and Athena computes the partitions at query time instead of reading them from the catalog, avoiding both the metadata bloat and the repair step.' },
        { q: 'What is the difference between the Data Catalog and Lake Formation?', a: 'The Data Catalog holds the metadata — what tables exist and their schema. Lake Formation is the governance layer on top: it defines who can access which databases, tables, columns, and rows in that catalog. The catalog answers "what is here"; Lake Formation answers "who is allowed to see it."' },
      ],
    },

    /* ── INGESTION & ETL ─────────────────────────────────── */
    {
      id: 'glue-etl', name: 'AWS Glue ETL', category: 'ingest-etl',
      aka: 'Serverless Spark for extract-transform-load jobs',
      tagline: 'Fully managed, serverless Apache Spark for ETL — you write the transform, AWS provisions and tears down the cluster, and you pay only for the DPU-seconds the job runs.',
      keyFacts: [
        { k: 'Engine', v: 'Managed Apache Spark (serverless)' },
        { k: 'Billing unit', v: 'DPU-hour (4 vCPU + 16 GB)' },
        { k: 'Languages', v: 'PySpark, Scala' },
        { k: 'Key feature', v: 'Job bookmarks (incremental)' },
      ],
      what: {
        lead: 'Glue ETL runs Apache Spark jobs without any cluster to manage. You supply a PySpark or Scala script; Glue spins up workers, runs the job, and shuts them down. It adds a Glue-specific layer — DynamicFrames, job bookmarks, and native Data Catalog integration — on top of ordinary Spark.',
        bullets: [
          { h: 'Serverless Spark', d: 'No cluster provisioning, patching, or scaling to manage — you choose a worker type and number, and Glue handles the rest.' },
          { h: 'DynamicFrame vs DataFrame', d: 'A DynamicFrame is Glue’s schema-flexible wrapper that tolerates inconsistent/semi-structured data (it can hold multiple types per field via a choice type); you convert to a Spark DataFrame with toDF() when you want full Spark SQL.' },
          { h: 'Job bookmarks', d: 'Glue tracks what data a job has already processed, so a scheduled run picks up only new files/rows — built-in incremental processing without you managing watermarks.' },
        ],
      },
      why: {
        lead: 'Teams want Spark ETL without operating Spark. Glue removes the cluster lifecycle entirely and bills per second of DPU usage, so intermittent or bursty ETL is cheap and there is nothing idle to pay for. Its catalog integration and bookmarks solve two chores — schema management and incrementality — that you would otherwise hand-build.',
        bullets: [
          { h: 'No cluster ops', d: 'No sizing, patching, or idle clusters; ideal for scheduled and event-driven jobs that do not run continuously.' },
          { h: 'Pay per use', d: 'Billed in DPU-seconds (with a short minimum), so you pay only while the job actually runs.' },
          { h: 'Batteries included', d: 'Native Data Catalog reads/writes, bookmarks for incrementality, and Glue Studio’s visual authoring cut the boilerplate of a raw Spark setup.' },
        ],
      },
      how: {
        lead: 'You define a job with a script, a worker type (Standard, G.1X, G.2X, or G.025X for streaming), and a worker count; Glue translates that into DPUs and runs it. Sources and sinks are typically Data Catalog tables or S3 paths, and bookmarks make reruns incremental.',
        bullets: [
          { h: 'Worker types → DPUs', d: 'G.1X = 1 DPU (4 vCPU/16 GB) per worker, G.2X = 2 DPU; more/bigger workers = more parallelism and memory. This is the main tuning knob.' },
          { h: 'Read the catalog, write the lake', d: 'Jobs commonly read a catalog table (create_dynamic_frame.from_catalog), transform, and write Parquet back to S3, updating the catalog.' },
          { h: 'Glue Studio & triggers', d: 'Studio provides a visual DAG that generates the script; jobs are started on a schedule, by a Glue trigger/workflow, or from EventBridge/Step Functions.' },
        ],
        code: {
          lang: 'python (Glue PySpark)',
          text: "dyf = glueContext.create_dynamic_frame.from_catalog(\n    database=\"lake\", table_name=\"orders\",\n    transformation_ctx=\"orders\")   # ctx enables bookmarks\n\ndf = dyf.toDF().filter(\"amount > 0\")\n\ndf.write.mode(\"append\").partitionBy(\"dt\") \\\n  .parquet(\"s3://shopkart-lake/silver/orders/\")",
        },
      },
      deUseCase: {
        lead: 'Glue ETL is the workhorse transform layer of a serverless AWS pipeline — the Bronze→Silver→Gold refinement engine that reads raw lake files, cleans and conforms them, and writes curated tables back.',
        bullets: [
          { h: 'Medallion refinement', d: 'Scheduled jobs read raw Bronze files, apply cleaning/joins/aggregations, and land Silver/Gold Parquet — with bookmarks ensuring each run processes only new data.' },
          { h: 'Catalog-driven ELT', d: 'Jobs read and write Data Catalog tables so the output is immediately queryable in Athena and Redshift Spectrum.' },
        ],
      },
      integrations: [
        { id: 's3', label: 'Amazon S3', note: 'source and sink' },
        { id: 'glue-catalog', label: 'Glue Data Catalog', note: 'table metadata' },
        { id: 'lake-formation', label: 'Lake Formation', note: 'enforces access in jobs' },
        { label: 'Step Functions / EventBridge', note: 'orchestrate & trigger' },
        { label: 'Redshift / RDS (JDBC)', note: 'read/write via connections' },
      ],
      runtime: {
        lead: 'At runtime a Glue job is a real Spark application: a driver plans the DAG and executors run tasks across the DPUs you allocated. Performance and cost come down to right-sizing workers, avoiding shuffle-heavy skew, and controlling output file sizes — the same tuning as any Spark job.',
        bullets: [
          { h: 'Parallelism = workers × cores', d: 'More/bigger workers give more executor cores and memory; too few causes spills and OOM, too many wastes DPU-seconds.' },
          { h: 'Cold start', d: 'Serverless jobs carry a provisioning delay per run; Glue offers a warm-pool/streaming path (G.025X) for latency-sensitive work.' },
          { h: 'Small files & shuffle', d: 'Repartition/coalesce before writing to avoid thousands of tiny S3 objects, and watch skewed joins that stall on one executor.' },
        ],
      },
      architecture: {
        lead: 'A Glue ETL job is a managed Apache Spark application. You hand Glue a script (PySpark/Scala) plus a worker type and count; Glue provisions DPUs (Data Processing Units — 4 vCPU + 16 GB each), runs a Spark driver + executors, then tears everything down. The DynamicFrame layer sits on top of Spark to tolerate dirty, schema-drifting data.',
        bullets: [
          { h: 'DPUs & worker types', d: 'G.1X = 1 DPU/worker, G.2X = 2 DPU, G.025X = ¼ DPU for streaming. Workers × cores set parallelism; this is the primary tuning (and cost) knob.' },
          { h: 'DynamicFrame vs DataFrame', d: 'DynamicFrame needs no fixed schema and carries a "choice" type for ambiguous fields (resolveChoice); toDF() converts to a Spark DataFrame for the full SQL/optimizer API. Read dirty → DynamicFrame; transform heavy → DataFrame.' },
          { h: 'Bookmarks', d: 'Job bookmarks persist processed-state (files/row ranges) keyed by transformation_ctx, giving built-in incrementality across runs with no manual watermark.' },
          { h: 'Glue versions', d: 'The Glue version pins the Spark/Python runtime; newer versions bring faster startup and Spark upgrades. Streaming jobs run a micro-batch Structured Streaming app.' },
        ],
      },
      security: {
        lead: 'Glue jobs assume an IAM role and inherit lake governance from Lake Formation. Secrets go in Secrets Manager (referenced by JDBC connections), and network reach to private sources is via Glue Connections bound to a VPC.',
        bullets: [
          { h: 'Job IAM role', d: 'The role grants exactly the S3 prefixes, catalog databases and KMS keys the job needs — least privilege per job, not a shared power role.' },
          { h: 'Lake Formation enforcement', d: 'When tables are LF-governed, the job only sees the columns/rows its principal is granted — fine-grained access is enforced inside the job, not bypassed.' },
          { h: 'Connections & VPC', d: 'A Glue Connection pins JDBC credentials (via Secrets Manager) and the VPC/subnet/security group, so jobs reach RDS/Redshift privately.' },
          { h: 'Encryption', d: 'A security configuration encrypts S3 output, CloudWatch logs and job bookmarks with KMS; enforce TLS to data stores.' },
        ],
      },
      operations: {
        lead: 'Glue is serverless, so operations is about observability, retries, and orchestration rather than cluster care. Jobs emit Spark UI, metrics and logs; triggers/workflows (or Step Functions/EventBridge) coordinate multi-job pipelines.',
        bullets: [
          { h: 'Monitoring', d: 'CloudWatch metrics (DPU usage, executors, shuffle), job run logs, and the Spark UI / Glue job run insights pinpoint skew, spills and OOM.' },
          { h: 'Retries & timeouts', d: 'Each job has a retry count, timeout and max-concurrency; failed runs can rerun, and bookmarks mean a rerun resumes from unprocessed data.' },
          { h: 'Orchestration', d: 'Glue triggers/workflows chain jobs + crawlers; for cross-service flows, Step Functions or EventBridge start jobs on schedule or on an S3 event.' },
          { h: 'Data quality', d: 'Glue Data Quality (DQDL rules) can gate a pipeline — fail or quarantine when rows violate expectations.' },
        ],
      },
      cost: {
        lead: 'Glue ETL bills per DPU-hour, metered by the second with a short per-run minimum — you pay only while a job runs, which is what makes it cheaper than an idle EMR cluster for bursty/scheduled ETL. (Rates vary by region — price against the official Glue pricing page.)',
        bullets: [
          { h: 'DPU-hours', d: 'Cost = DPUs × run-seconds. Fewer, right-sized workers that finish faster beat a huge cluster that idles; over-provisioning wastes DPU-seconds.' },
          { h: 'Startup overhead', d: 'Every run pays provisioning time; very frequent tiny jobs amortize startup poorly — batch them or use the streaming/warm path.' },
          { h: 'When EMR wins', d: 'For long-running, very large or highly-customized Spark, EMR (especially on Spot) is usually cheaper at steady state; Glue wins on low-ops and bursty schedules.' },
          { h: 'Cost levers', d: 'Push down partition predicates (read less S3), compact output files, enable bookmarks (process only new data), and right-size worker type/count.' },
        ],
      },
      walkthrough: {
        lead: 'What happens when a scheduled Glue job runs incrementally with bookmarks — from trigger to catalog update.',
        steps: [
          { h: 'Trigger & provision', d: 'A schedule, Glue trigger/workflow or EventBridge rule starts the job run. Glue allocates the requested workers (DPUs) and starts a Spark application — this carries a per-run provisioning delay (cold start).' },
          { h: 'Resolve the bookmark', d: 'For each source with a transformation_ctx, Glue loads the persisted bookmark state (which S3 files / JDBC row ranges were already processed) so the run reads only new data.' },
          { h: 'Read as DynamicFrame', d: 'create_dynamic_frame.from_catalog reads the new partitions/files; a push-down predicate on the date partition further limits the scan to just the latest dt=… partitions.' },
          { h: 'Transform', d: 'Resolve messy types (resolveChoice) if needed, convert toDF() for heavy Spark SQL, and apply cleaning/joins/aggregations across the executors.' },
          { h: 'Write + control file size', d: 'Repartition/coalesce to avoid tiny files, then write partitioned Parquet to S3. Commit uses Spark’s committer on an object store, so file layout matters.' },
          { h: 'Update catalog & bookmark', d: 'New partitions are registered in the Glue Data Catalog (so Athena/Spectrum see them), and the job commits its updated bookmark state so the next run resumes from here.' },
        ],
        note: 'Simplified run model; exact bookmark/commit behavior depends on source types and whether bookmarks are enabled with a transformation context.',
      },
      examples: [{
        title: 'Incremental Bronze→Silver refinement with bookmarks and partition pruning',
        requirement: 'Clean and conform newly-landed order files each hour into a partitioned Silver table, processing only new data and keeping output queryable in Athena — with no cluster to manage.',
        input: 'Semi-structured JSON order files landing in s3://shopkart-lake/bronze/orders/ cataloged as lake.orders.',
        architecture: 'EventBridge schedule → Glue job (G.1X workers, bookmarks on) → S3 Silver Parquet partitioned by dt → Glue Catalog → Athena.',
        code: {
          lang: 'python (glue pyspark, illustrative)',
          text: "dyf = glueContext.create_dynamic_frame.from_catalog(\n    database=\"lake\", table_name=\"orders\",\n    push_down_predicate=\"dt >= date_format(now(), 'yyyy-MM-dd')\",\n    transformation_ctx=\"orders\")        # ctx = bookmarked\n\ndf = dyf.resolveChoice(specs=[('amount','cast:double')]).toDF() \\\n        .filter(\"amount > 0\").dropDuplicates([\"order_id\"])\n\n(df.repartition(\"dt\")\n   .write.mode(\"append\").partitionBy(\"dt\")\n   .parquet(\"s3://shopkart-lake/silver/orders/\"))\n\njob.commit()   # persists the bookmark",
        },
        steps: [
          'Enable job bookmarks and give the source a transformation_ctx.',
          'Push a predicate on the dt partition so only new partitions are scanned.',
          'Resolve dirty types, dedup on the key, then write partitioned Parquet.',
          'Call job.commit() so the next run resumes incrementally.',
        ],
        output: 'An hourly-updated Silver Parquet table, partitioned by dt, queryable in Athena; each run processes only new data.',
        validation: 'Confirm a second run with no new files processes ~0 rows (bookmark works); compare Silver counts vs Bronze for a day; check output file sizes are not tiny.',
        errorHandling: 'resolveChoice tolerates inconsistent types; dedup guards against duplicate ingestion; a failed run can be retried safely because bookmarks only advance on commit.',
        production: 'Right-size worker type/count to avoid spill vs idle DPUs; alarm on job failures and DPU-hour anomalies; use Lake Formation for least-privilege access from the job role.',
        cleanup: 'Delete the job and schedule, reset/remove bookmarks, and drop the Silver table/partitions if decommissioning.',
      }],
      troubleshooting: [
        {
          symptom: 'A bookmarked Glue job starts reprocessing data it already handled, inflating runtime and creating duplicate output.',
          evidence: 'Run metrics show input rows jump back up with no new source data; duplicates appear in the Silver table; the job was recently edited or job.commit() is missing.',
          causes: ['job.commit() not called (or an exception before it), so the bookmark never advanced', 'A source read without a transformation_ctx, so it is not bookmarked', 'Bookmark reset/disabled, or the script/source signature changed'],
          investigation: ['Confirm job.commit() runs on every successful path', 'Check each source has a unique transformation_ctx', 'Review whether bookmarks are enabled and were recently reset'],
          rootCause: 'The bookmark did not advance (no commit) or the source was never bookmarked, so Glue has no record of what was processed and re-reads everything.',
          remediation: ['Ensure job.commit() executes on success', 'Add transformation_ctx to every bookmarked source', 'Make writes idempotent (dedup/overwrite partition) so a reprocess cannot duplicate rows'],
          validation: 'A re-run with no new input processes ~0 rows and adds no duplicates.',
          prevention: 'Always pair bookmarks with a transformation context and a guaranteed commit; keep partition writes idempotent as a backstop.',
        },
        {
          symptom: 'A Glue job fails with executor OOM / "No space left on device" during a shuffle-heavy join, or runs far slower than expected.',
          evidence: 'Spark/Glue metrics show heavy disk spill and one or two straggler tasks; a single executor processes far more data than the rest (skew).',
          causes: ['Under-provisioned workers for the data volume', 'Data skew concentrating a huge partition on one task', 'Too few partitions causing large per-task footprints and spill'],
          investigation: ['Check Glue metrics/Spark UI for spill and skewed task input', 'Review worker type/count vs data size', 'Inspect join keys for skew'],
          rootCause: 'The job is memory/shuffle-bound due to skew or under-partitioning — not simply short of DPUs — so one task spills and stalls the stage.',
          remediation: ['Address skew (salting, broadcast the small side, AQE) before scaling', 'Repartition the heavy stage; right-size worker type (G.2X for memory-heavy)', 'Reduce shuffle by filtering/pruning earlier'],
          validation: 'Spill drops, straggler tasks even out, runtime and DPU-hours fall for the same job.',
          prevention: 'Design joins to avoid skew, size workers to data, and prune/push-down early so less data shuffles.',
        },
      ],
      certMapping: {
        lead: 'Glue ETL is central to the AWS Data Engineer exam’s ingestion/transformation domain.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Data ingestion & transformation', 'Glue vs EMR service selection', 'Incremental processing with bookmarks', 'Orchestration & data quality'] },
        ],
      },
      interview: [
        { q: 'What is the difference between a DynamicFrame and a DataFrame in Glue?', a: 'A DynamicFrame is Glue’s own abstraction built for messy, semi-structured data: it does not require a fixed schema up front and can hold multiple types for a field via a "choice" type, with resolveChoice() to reconcile them. A Spark DataFrame requires a settled schema and gives you the full Spark SQL API and optimizer. In practice you often read as a DynamicFrame to tolerate dirty input, then toDF() to a DataFrame for the heavy transformations.' },
        { q: 'How do Glue job bookmarks work and why are they useful?', a: 'Bookmarks persist state about what a job has already processed — which S3 files or which JDBC row ranges — keyed by a transformation_ctx. On the next run the job reads only new data, giving built-in incremental processing without you tracking watermarks or last-modified timestamps yourself. They must be enabled on the job and each source needs a transformation context to be bookmarked.' },
        { q: 'How is Glue ETL billed and when is it the right choice?', a: 'It bills per DPU-hour (a DPU is 4 vCPU + 16 GB), metered in seconds with a short minimum, so you pay only while the job runs. That makes it ideal for scheduled, bursty, or event-driven ETL where a persistent cluster would sit idle. For long-running, very large, or highly custom Spark workloads where you want full cluster control and cheaper steady-state compute, EMR is often more cost-effective.' },
        { q: 'How would you make a Glue job process only new data each run?', a: 'Enable job bookmarks and give each source a transformation_ctx so Glue tracks processed files/rows. Alternatively, drive incrementality from partitions — push down a predicate on the date partition (push_down_predicate) so the job reads only the latest dt=… partitions from the catalog, which also cuts S3 scan cost.' },
      ],
    },

    /* ── GOVERNANCE / SECURITY ───────────────────────────── */
    {
      id: 'lake-formation', name: 'AWS Lake Formation', category: 'governance',
      aka: 'Centralized, fine-grained permissions for the S3 data lake',
      tagline: 'The governance layer over the lake: define who can access which databases, tables, columns, and rows once — and have Athena, Redshift Spectrum, EMR, and Glue all enforce it.',
      keyFacts: [
        { k: 'Purpose', v: 'Fine-grained lake access control' },
        { k: 'Granularity', v: 'DB / table / column / row / cell' },
        { k: 'Model', v: 'Grant/revoke on catalog objects' },
        { k: 'Enforced by', v: 'Athena, Spectrum, EMR, Glue' },
      ],
      what: {
        lead: 'Lake Formation is a governance service that centralizes permissions for data registered in the Glue Data Catalog. Instead of hand-crafting IAM and S3 bucket policies for every consumer, you grant SQL-like permissions (SELECT, DESCRIBE, ALTER) on catalog databases, tables, and columns — and Lake Formation enforces them across the integrated engines.',
        bullets: [
          { h: 'Grant/revoke model', d: 'Permissions read like database GRANTs: grant SELECT on lake.orders (specific columns) to an IAM principal, and revoke to remove it.' },
          { h: 'Column, row, and cell security', d: 'Beyond table-level, it supports column filtering, row-level filters (data filters), and cell-level masking so different teams see different slices of the same table.' },
          { h: 'Centralized location registration', d: 'You register S3 locations with Lake Formation, which then brokers access to that data on behalf of the query engines.' },
        ],
      },
      why: {
        lead: 'Securing a lake with raw IAM/S3 policies does not scale: object-level policies cannot express "team A sees these columns, team B sees these rows," and every new engine needs its own grants. Lake Formation moves access control up to the catalog so it is defined once, expressed in business terms, and enforced consistently everywhere.',
        bullets: [
          { h: 'Fine-grained without IAM sprawl', d: 'Column/row/cell rules are impossible with bucket policies alone; Lake Formation makes them declarative and central.' },
          { h: 'One policy, all engines', d: 'The same grant is honored by Athena, Redshift Spectrum, EMR, and Glue — no per-tool re-implementation.' },
          { h: 'Auditable governance', d: 'Central permissions plus tag-based access control (LF-Tags) make it feasible to govern hundreds of tables and prove who can see what.' },
        ],
      },
      how: {
        lead: 'You register S3 data locations with Lake Formation, define permissions on catalog objects (directly or via LF-Tags), and consumers query through the integrated engines. At query time the engine asks Lake Formation to authorize and it returns only the permitted columns/rows via temporary, scoped credentials.',
        bullets: [
          { h: 'LF-Tags (tag-based access)', d: 'Attach tags like sensitivity=pii to databases/tables/columns and grant on the tag; new objects that inherit the tag are governed automatically — the scalable model for large catalogs.' },
          { h: 'Data filters', d: 'Row-level and column-level filters are named objects you attach to a grant, so "region = EU only" or "hide the ssn column" becomes reusable policy.' },
          { h: 'Credential vending', d: 'When enforcement is on, engines receive short-lived credentials scoped to exactly the permitted data instead of broad S3 access.' },
        ],
        code: {
          lang: 'sql-like (LF grant)',
          text: "-- Column-restricted grant to an analyst role\nGRANT SELECT (order_id, amount, dt)\n  ON TABLE lake.orders\n  TO ROLE 'analyst';\n\n-- Row filter: EU rows only\nCREATE DATA FILTER eu_only\n  ON lake.orders  ROW FILTER region = 'EU';",
        },
      },
      deUseCase: {
        lead: 'Lake Formation is how a data platform enforces least-privilege on a shared lake — the control plane that lets many teams query the same catalog while each sees only what it is entitled to.',
        bullets: [
          { h: 'PII column protection', d: 'Grant analysts SELECT on all columns except the PII ones, while a compliance role sees them — enforced identically in Athena and Spectrum.' },
          { h: 'Cross-account data sharing', d: 'Share governed catalog tables to other AWS accounts without copying data, with permissions still enforced by Lake Formation.' },
        ],
      },
      integrations: [
        { id: 'glue-catalog', label: 'Glue Data Catalog', note: 'objects it governs' },
        { id: 's3', label: 'Amazon S3', note: 'registered lake locations' },
        { id: 'glue-etl', label: 'Glue ETL', note: 'jobs honor grants' },
        { label: 'Athena / Redshift Spectrum', note: 'enforce column/row rules' },
        { label: 'IAM / Identity Center', note: 'principals grants apply to' },
      ],
      runtime: {
        lead: 'At runtime Lake Formation sits in the authorization path: the query engine submits the principal and requested table, Lake Formation evaluates grants (including LF-Tags and data filters) and returns scoped, temporary credentials plus the allowed column/row set. Only the permitted data is read from S3.',
        bullets: [
          { h: 'Enforcement point', d: 'Column and row filtering is applied before results leave the engine, so a filtered column is never returned to an unauthorized user.' },
          { h: 'Hybrid access mode', d: 'Lake Formation and IAM permissions can coexist during migration; you move tables to LF enforcement incrementally rather than all at once.' },
        ],
      },
      architecture: {
        lead: 'Lake Formation is an authorization layer over the Glue Data Catalog and S3. You register S3 locations with it, grant SQL-style permissions on catalog objects (directly or via LF-Tags), and at query time it authorizes the principal and vends short-lived, scoped credentials plus the allowed column/row set to the integrated engine.',
        bullets: [
          { h: 'Registered locations', d: 'You register S3 paths with Lake Formation (via a service-linked role); LF then brokers access to that data, so engines get scoped credentials instead of broad S3 access.' },
          { h: 'Grants + LF-Tags', d: 'Permissions are granted per object or, at scale, via LF-Tags (tag-based access control): tag objects sensitivity=pii and grant on the tag so new tagged objects are governed automatically.' },
          { h: 'Data filters', d: 'Named column projections and row-filter expressions attach to a grant to deliver column/row/cell security — applied before results leave the engine.' },
          { h: 'Credential vending', d: 'On authorization LF returns temporary credentials scoped to exactly the permitted data and a row predicate/column list the engine enforces.' },
        ],
      },
      security: {
        lead: 'Lake Formation IS the security service, so its own model is the key: data lake administrators, the grant/revoke model, LF-Tags, and the legacy IAMAllowedPrincipals setting that must be understood when onboarding tables.',
        bullets: [
          { h: 'Data lake admins', d: 'A small set of admin principals manage LF settings, register locations, and grant permissions; keep this set tight — admins can govern the whole catalog.' },
          { h: 'IAMAllowedPrincipals (legacy)', d: 'By default existing catalog tables carry the IAMAllowedPrincipals grant, meaning IAM alone controls them (LF not enforcing). Removing it switches a table to true LF fine-grained enforcement — forgetting this is the top onboarding gotcha.' },
          { h: 'DATA_LOCATION_ACCESS', d: 'To create tables pointing at a registered location, a principal needs the data-location permission in addition to database grants.' },
          { h: 'Cross-account', d: 'Grants to other accounts are shared via AWS RAM and consumed through resource links; the recipient still queries under LF enforcement.' },
        ],
      },
      operations: {
        lead: 'Operating Lake Formation is onboarding tables to enforcement (carefully), managing LF-Tags at scale, migrating from IAM via hybrid mode, and auditing grants.',
        bullets: [
          { h: 'Onboarding / hybrid mode', d: 'Hybrid access mode lets LF and IAM permissions coexist so you move tables to LF enforcement incrementally rather than breaking everything at once.' },
          { h: 'Tag governance at scale', d: 'Manage a handful of LF-Tag policies instead of thousands of per-table grants; define a tag ontology (sensitivity/domain) up front.' },
          { h: 'Auditing', d: 'CloudTrail logs grants and data-access events; review who can see what and reconcile against intent periodically.' },
          { h: 'Engine enablement', d: 'EMR needs runtime roles / LF integration enabled to honor fine-grained grants; Athena/Redshift/Glue honor them natively once tables are enforced.' },
        ],
      },
      cost: {
        lead: 'Lake Formation’s core governance (permissions, LF-Tags, data filters, credential vending) has no additional charge — you pay for the query engines (Athena/Redshift/EMR/Glue) and S3 they drive. The "cost" is operational: getting the model right so access is correct. (Confirm any feature-specific charges against the official Lake Formation pricing page.)',
        bullets: [
          { h: 'No core governance fee', d: 'Granting/enforcing permissions itself is not separately billed; the compute/storage underneath is.' },
          { h: 'Operational cost', d: 'The real investment is designing LF-Tags and migrating tables correctly; mistakes cost outages or over-exposure, not dollars.' },
        ],
      },
      walkthrough: {
        lead: 'How a governed query is authorized and filtered end to end.',
        steps: [
          { h: 'Query submitted', d: 'A principal runs a query in an integrated engine (e.g. Athena) against a governed catalog table.' },
          { h: 'Engine asks Lake Formation', d: 'The engine calls LF with the principal and requested table; LF evaluates grants (direct + LF-Tag) and any attached data filters.' },
          { h: 'Scoped credentials + filters returned', d: 'LF returns short-lived credentials scoped to the permitted S3 data, plus the allowed column list and row predicate.' },
          { h: 'Engine enforces', d: 'The engine reads only the permitted S3 data and applies the column projection / row filter before returning results — unauthorized columns/rows never leave it.' },
          { h: 'Audit', d: 'The access is logged (CloudTrail) for governance and review.' },
        ],
        note: 'Simplified; exact flow depends on the engine and whether the table is under LF enforcement vs IAMAllowedPrincipals.',
      },
      examples: [{
        title: 'PII-column protection + EU row filter, shared cross-account',
        requirement: 'Let analysts query orders but hide PII columns and restrict them to EU rows, and share the governed table to another account without copying data.',
        input: 'A Glue-cataloged lake.orders table on registered S3; an analyst role; a second AWS account.',
        architecture: 'S3 (registered) → Glue Catalog table → Lake Formation grants + data filter (EU rows, non-PII columns) → Athena; RAM share → other account resource link.',
        code: {
          lang: 'sql-like (lf, illustrative)',
          text: "-- remove legacy IAMAllowedPrincipals so LF enforces, then:\nCREATE DATA FILTER eu_nonpii ON lake.orders\n  ROW FILTER region = 'EU'\n  COLUMNS (order_id, amount, dt, region);   -- excludes PII cols\nGRANT SELECT ON lake.orders DATA FILTER eu_nonpii TO ROLE 'analyst';\n\n-- cross-account: grant to account B (consumed via RAM + resource link)\nGRANT SELECT ON lake.orders TO EXTERNAL ACCOUNT '111122223333';",
        },
        steps: [
          'Register the S3 location and remove IAMAllowedPrincipals so LF enforces.',
          'Create a data filter for EU rows + non-PII columns.',
          'Grant SELECT with the filter to the analyst role.',
          'Share cross-account via RAM; the other account queries through a resource link.',
        ],
        output: 'Analysts see only EU rows and non-PII columns in Athena; account B queries the same governed table with no data copy.',
        validation: 'Confirm an analyst query hides PII columns and non-EU rows; verify account B sees the table and the same restrictions apply.',
        errorHandling: 'If queries suddenly return nothing after enforcement, a missing grant or DATA_LOCATION_ACCESS is usually the cause; hybrid mode eases migration.',
        production: 'Keep data-lake admins minimal; govern with LF-Tags for scale; audit grants via CloudTrail; enable EMR runtime roles if EMR must honor grants.',
        cleanup: 'Revoke grants, delete the data filter and RAM share/resource link; deregister the location if decommissioning.',
      }],
      troubleshooting: [
        {
          symptom: 'After enabling Lake Formation on a table, previously-working queries fail with access denied or return no rows/columns.',
          evidence: 'The table had IAMAllowedPrincipals removed (now LF-enforced) but no LF grants exist for the principal; or the principal lacks DATA_LOCATION_ACCESS.',
          causes: ['Switched to LF enforcement without granting the principals that need access', 'Missing DATA_LOCATION_ACCESS for table creation', 'Engine (e.g. EMR) not enabled for LF fine-grained access'],
          investigation: ['Check whether IAMAllowedPrincipals was removed (table now LF-enforced)', 'List LF grants for the failing principal', 'Confirm DATA_LOCATION_ACCESS and engine LF integration'],
          rootCause: 'Enforcement is now on but the required LF grants/location permissions were not created, so LF denies access that IAM used to allow.',
          remediation: ['Grant the needed SELECT/DESCRIBE (and data filters) to the principals', 'Grant DATA_LOCATION_ACCESS where tables are created', 'Use hybrid access mode to migrate incrementally; enable EMR runtime roles'],
          validation: 'Authorized principals query successfully with the intended column/row restrictions; unauthorized access is denied.',
          prevention: 'Plan grants before removing IAMAllowedPrincipals; migrate via hybrid mode; template LF-Tag grants.',
        },
        {
          symptom: 'A cross-account consumer cannot see or query a table you granted to their account.',
          evidence: 'The grant exists but the other account sees nothing; no RAM resource share accepted; no resource link created on the consumer side.',
          causes: ['RAM resource share not accepted by the consumer account', 'No resource link created in the consumer catalog', 'Consumer principals not granted on the shared resource link'],
          investigation: ['Check the RAM share status (pending/accepted)', 'Confirm a resource link exists in the consumer account', 'Verify consumer-side LF grants on the link'],
          rootCause: 'Cross-account LF sharing requires the RAM share to be accepted and a resource link + consumer-side grants — the producer grant alone is not enough.',
          remediation: ['Accept the RAM resource share in the consumer account', 'Create a resource link to the shared database/table', 'Grant consumer principals on the resource link'],
          validation: 'The consumer account queries the shared table under LF enforcement with no data copy.',
          prevention: 'Document the full cross-account flow (grant → RAM accept → resource link → consumer grant) and automate it.',
        },
      ],
      certMapping: {
        lead: 'Lake Formation is the fine-grained lake-governance service in the AWS Data Engineer exam’s security/access domain.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Fine-grained access (column/row/cell) on the lake', 'LF-Tags / tag-based access control at scale', 'Cross-account sharing & migration from IAM'] },
        ],
      },
      interview: [
        { q: 'What problem does Lake Formation solve that IAM and S3 policies cannot?', a: 'IAM and bucket policies control access at the object/prefix level — they cannot express column-, row-, or cell-level security, and they force you to re-grant for every engine. Lake Formation moves access control up to the Glue Data Catalog so you grant SQL-style permissions (including specific columns and row filters) once, in business terms, and every integrated engine (Athena, Spectrum, EMR, Glue) enforces them consistently.' },
        { q: 'What are LF-Tags and why do they matter at scale?', a: 'LF-Tags are tag-based access control: you attach tags like sensitivity=pii or domain=finance to databases, tables, or columns, then grant permissions on the tag rather than on each object. New or changed objects that carry the tag are governed automatically, so you manage a handful of tag policies instead of thousands of per-table grants — the only practical model for a large, growing catalog.' },
        { q: 'How does Lake Formation enforce row- and column-level security at query time?', a: 'You define data filters (named column projections and row-filter expressions) and attach them to a grant. When a governed engine runs a query, it authorizes with Lake Formation, which returns short-lived scoped credentials plus the allowed columns and a row predicate. The engine applies the column projection and row filter before returning results, so unauthorized columns/rows never reach the user.' },
      ],
    },
    /* ── COMPUTE & RUNTIME ───────────────────────────────── */
    {
      id: 'emr', name: 'Amazon EMR', category: 'compute',
      aka: 'Elastic MapReduce — managed Spark / Hadoop clusters',
      tagline: 'Managed big-data clusters for Spark, Hive, Presto and Hadoop — full control over the engine and instances, with S3 as the storage layer instead of HDFS.',
      keyFacts: [
        { k: 'Engines', v: 'Spark, Hive, Presto/Trino, Flink, Hadoop' },
        { k: 'Storage', v: 'EMRFS (S3) — decoupled from compute' },
        { k: 'Forms', v: 'EC2 clusters, EMR on EKS, EMR Serverless' },
        { k: 'Cost lever', v: 'Spot instances + transient clusters' },
      ],
      what: {
        lead: 'EMR is AWS’s managed platform for running open-source big-data frameworks on a cluster. You pick the applications (Spark, Hive, Presto, Flink), the instance types, and the cluster shape; EMR provisions the nodes, installs the stack, and manages the cluster lifecycle.',
        bullets: [
          { h: 'Open-source engines', d: 'Runs real Apache Spark/Hive/Presto — you get the full framework and version control, not a proprietary fork.' },
          { h: 'EMRFS over S3', d: 'Instead of HDFS on local disk, EMR reads/writes S3 through EMRFS, so storage is decoupled and clusters can be transient.' },
          { h: 'Three deployment models', d: 'Classic EC2 clusters (max control), EMR on EKS (share a Kubernetes cluster), and EMR Serverless (no cluster to size at all).' },
        ],
      },
      why: {
        lead: 'When you need full control over the Spark/Hadoop stack, custom libraries, or the cheapest possible large-scale compute, EMR beats fully-managed services. Decoupling compute from S3 storage lets you run transient clusters — spin up, process, terminate — and lean heavily on Spot instances to cut cost.',
        bullets: [
          { h: 'Engine control', d: 'Choose exact framework versions, tune configs, install custom JARs/packages — impossible on a locked-down serverless service.' },
          { h: 'Cost at scale', d: 'Transient clusters plus Spot instances make very large batch jobs dramatically cheaper than always-on compute.' },
          { h: 'Portability', d: 'It is standard Spark/Hive, so workloads move on/off EMR (to Databricks, on-prem, etc.) with little rewrite.' },
        ],
      },
      how: {
        lead: 'A cluster has a primary (master) node, core nodes (compute + HDFS), and optional task nodes (compute only, ideal for Spot). You submit work as steps, or interactively via notebooks; data is read from and written back to S3 via EMRFS.',
        bullets: [
          { h: 'Node roles', d: 'Primary coordinates; core nodes run tasks and hold HDFS; task nodes add burst compute and are the safe place for Spot since losing one does not lose data.' },
          { h: 'Instance fleets + Spot', d: 'Instance fleets mix on-demand and Spot across types/AZs to hit a target capacity cheaply and survive Spot reclamation.' },
          { h: 'Transient vs long-running', d: 'Transient clusters auto-terminate after their steps finish (cheapest for batch); long-running clusters stay up for interactive/ad-hoc use.' },
        ],
        code: {
          lang: 'bash (submit a step)',
          text: "aws emr add-steps --cluster-id j-XXXX \\\n  --steps Type=Spark,Name=refine,\\\nArgs=[--deploy-mode,cluster,\\\ns3://shopkart-code/refine.py]",
        },
      },
      deUseCase: {
        lead: 'EMR is the heavy-batch and custom-Spark engine of an AWS platform — large medallion refinements, migrations of existing Hadoop/Spark workloads, and cost-sensitive jobs where transient Spot clusters win.',
        bullets: [
          { h: 'Large-scale batch ETL', d: 'Transient clusters read raw S3, run big Spark transforms, write curated Parquet/Iceberg back, then terminate — paying only for the run.' },
          { h: 'Lift-and-shift Hadoop', d: 'Existing Hive/Spark/Oozie workloads move to EMR with minimal change, swapping HDFS for S3.' },
        ],
      },
      integrations: [
        { id: 's3', label: 'Amazon S3', note: 'storage via EMRFS' },
        { id: 'glue-catalog', label: 'Glue Data Catalog', note: 'shared metastore' },
        { id: 'lake-formation', label: 'Lake Formation', note: 'fine-grained access' },
        { label: 'Step Functions / MWAA', note: 'orchestrate clusters & steps' },
        { label: 'EC2 Spot', note: 'low-cost task capacity' },
      ],
      runtime: {
        lead: 'At runtime EMR is standard Spark on YARN (or Kubernetes on EMR on EKS): a driver plans the DAG and executors run tasks across core/task nodes. Because storage is S3, shuffle and commit behavior — and Spot interruptions on task nodes — are the main things to tune around.',
        bullets: [
          { h: 'Scaling', d: 'Managed scaling adds/removes task nodes based on YARN load; sizing core vs task nodes balances stability against Spot savings.' },
          { h: 'Spot resilience', d: 'Keep HDFS/shuffle-critical work on core nodes and use task nodes for Spot, so a reclaimed instance retries tasks without data loss.' },
        ],
      },
      architecture: {
        lead: 'An EMR cluster is a set of EC2 instances in three roles, running a YARN-managed Hadoop/Spark stack with S3 (via EMRFS) as the durable storage layer instead of HDFS. The same workload can run three ways: classic EC2 clusters (full control), EMR on EKS (Spark pods on a shared Kubernetes cluster), and EMR Serverless (no cluster to size).',
        bullets: [
          { h: 'Node roles', d: 'The primary (master) node runs YARN ResourceManager and the Spark driver (in cluster mode it runs in an application container); core nodes run NodeManagers/executors and hold HDFS + shuffle data; task nodes add executors only — no HDFS — which is why they are the safe home for Spot.' },
          { h: 'Instance fleets vs groups', d: 'Instance fleets target a capacity across multiple instance types/AZs (best for Spot diversification and reclamation resilience); instance groups fix one type per role.' },
          { h: 'Storage decoupling', d: 'EMRFS reads/writes S3 so data outlives the cluster — enabling transient clusters and letting Athena/Spectrum/other clusters share the same data through the Glue Catalog.' },
          { h: 'Three runtimes', d: 'EC2 clusters for maximum control and long-running/interactive use; EMR on EKS to consolidate onto Kubernetes; EMR Serverless to pay only for the vCPU/memory a job consumes with no cluster management.' },
        ],
      },
      security: {
        lead: 'EMR security spans IAM roles (not one role but several), encryption via security configurations, authentication for the Hadoop stack, fine-grained data access through Lake Formation, and VPC network isolation. The multiple IAM roles are the part people miss.',
        bullets: [
          { h: 'The IAM roles', d: 'A service role (EMR manages cluster resources), an EC2 instance profile (what the cluster’s nodes assume to reach S3/Glue), and an auto-scaling role. Least-privilege the instance profile, since every job on the cluster inherits it — or use runtime roles to scope per-job.' },
          { h: 'Encryption', d: 'Security configurations enable at-rest encryption (EBS volumes via LUKS, S3 via SSE-S3/SSE-KMS through EMRFS) and in-transit encryption (TLS between nodes); apply one configuration across clusters for consistency.' },
          { h: 'Authentication', d: 'Kerberos authenticates the Hadoop/Spark stack on multi-tenant clusters; integrate with an enterprise KDC/AD for user identity.' },
          { h: 'Fine-grained data access', d: 'Lake Formation + EMR runtime roles enforce column/row/table permissions on Glue-cataloged S3 data, instead of the cluster’s broad instance-profile access.' },
          { h: 'Network', d: 'Launch clusters in private subnets, control traffic with security groups, and use Block Public Access + VPC endpoints to keep S3 traffic private.' },
        ],
      },
      operations: {
        lead: 'Operating EMR is cluster-lifecycle management: bootstrap/config, submitting steps, scaling, logging/monitoring, and recovering from node (especially Spot) loss. Transient clusters minimize the always-on surface; long-running clusters need more day-2 care.',
        bullets: [
          { h: 'Lifecycle & steps', d: 'Bootstrap actions install packages before apps start; work is submitted as ordered steps (or interactively); transient clusters auto-terminate when steps finish. Enable termination protection for long-running/interactive clusters.' },
          { h: 'Scaling', d: 'EMR managed scaling resizes task capacity to YARN demand within min/max bounds; tune so scale-in does not kill nodes holding active shuffle.' },
          { h: 'Monitoring & debugging', d: 'Logs archive to S3; CloudWatch carries cluster metrics; the Spark History Server and YARN ResourceManager UIs (and Persistent App UIs after termination) are where you diagnose stages, skew and OOM.' },
          { h: 'Resilience', d: 'Instance-fleet diversification across types/AZs survives Spot reclamation; keep critical shuffle/HDFS on core (on-demand) nodes so task-node loss only costs retries.' },
        ],
      },
      cost: {
        lead: 'EMR on EC2 bills the underlying EC2 instance-seconds plus a per-instance EMR uplift, plus EBS. The big levers are transient clusters (pay only during the run), Spot on task nodes (large discounts), and right-sizing. EMR Serverless bills per vCPU-second and GB-second of actual job usage; EMR on EKS bills the EKS/EC2 you run on. (Rates vary by instance/region — price against the official EMR pricing page.)',
        bullets: [
          { h: 'Transient + Spot', d: 'Auto-terminating clusters pay nothing when idle; Spot task nodes cut large-batch cost substantially — the single biggest EMR saving when jobs tolerate retries.' },
          { h: 'Right-size & decouple', d: 'Because storage is S3, you size compute to the job and discard it; avoid oversized long-running clusters sitting idle.' },
          { h: 'Serverless vs cluster', d: 'EMR Serverless removes idle and sizing waste for bursty/unpredictable jobs; a tuned transient cluster can still be cheaper for very large, steady batch.' },
          { h: 'Efficiency levers', d: 'Columnar formats, partition pruning, avoiding small files and shuffle skew all cut run time — which is the real bill on pay-per-use compute.' },
        ],
      },
      walkthrough: {
        lead: 'Lifecycle of a nightly transient EMR batch job on Spot — from launch to self-termination.',
        steps: [
          { h: 'Launch (RunJobFlow)', d: 'An orchestrator (Step Functions/MWAA) calls RunJobFlow with the release label, applications, instance fleets (on-demand core + Spot task), and a steps list, with auto-termination enabled.' },
          { h: 'Provision & bootstrap', d: 'EMR provisions EC2 instances, installs the chosen stack, and runs bootstrap actions (custom libs/config) before applications start.' },
          { h: 'Run steps on YARN', d: 'Each Spark step submits to YARN: the driver plans the DAG and requests executors; tasks run across core and Spot task nodes, reading input from S3 via EMRFS.' },
          { h: 'Handle Spot interruption', d: 'If a Spot task node is reclaimed, YARN reschedules its tasks on remaining capacity; because task nodes hold no HDFS/durable shuffle, no data is lost — only the in-flight tasks retry.' },
          { h: 'Commit output', d: 'Spark commits results to S3. Use an S3-optimized committer (or write a table format) so commit is fast and atomic rather than rename-based copy+delete.' },
          { h: 'Auto-terminate', d: 'When the last step completes, the transient cluster terminates automatically, so billing stops; logs and the persistent Spark UI remain available in S3 for later debugging.' },
        ],
        note: 'Simplified lifecycle; exact behavior depends on cluster config, committer and managed-scaling settings.',
      },
      examples: [{
        title: 'Nightly medallion refinement on a transient Spot cluster',
        requirement: 'Run a large nightly Spark transform over raw S3 data cheaply, with no always-on cluster and resilience to Spot reclamation.',
        input: 'Partitioned raw Parquet in s3://shopkart-lake/bronze/ (hundreds of GB/night).',
        architecture: 'Step Functions → EMR RunJobFlow (on-demand core + Spot task fleets) → Spark steps read Bronze, write Silver/Gold to S3 → cluster auto-terminates; Glue Catalog shared.',
        code: {
          lang: 'bash (aws cli, illustrative)',
          text: "aws emr create-cluster \\\n  --release-label emr-7.x \\\n  --applications Name=Spark \\\n  --use-default-roles \\\n  --instance-fleets \\\n    InstanceFleetType=MASTER,TargetOnDemandCapacity=1,InstanceTypeConfigs=[{InstanceType=m6g.xlarge}] \\\n    InstanceFleetType=CORE,TargetOnDemandCapacity=2,InstanceTypeConfigs=[{InstanceType=m6g.2xlarge}] \\\n    InstanceFleetType=TASK,TargetSpotCapacity=8,InstanceTypeConfigs=[{InstanceType=m6g.2xlarge},{InstanceType=m5.2xlarge}] \\\n  --steps Type=Spark,Name=refine,Args=[--deploy-mode,cluster,s3://shopkart-code/refine.py] \\\n  --auto-terminate \\\n  --configurations file://spark-committer.json   # enable S3-optimized committer",
        },
        steps: [
          'Launch a transient cluster with on-demand core + diversified Spot task fleet.',
          'Run the Spark refine step; enable the EMRFS S3-optimized committer.',
          'Write Silver/Gold Parquet partitioned by date; update the Glue Catalog.',
          'Let the cluster auto-terminate when the step finishes.',
        ],
        output: 'Curated Silver/Gold tables in S3, queryable by Athena/Spectrum via the Glue Catalog; the cluster no longer exists after the run.',
        validation: 'Check step status SUCCEEDED; compare output row counts vs source; confirm the cluster terminated and logs landed in S3.',
        errorHandling: 'Diversify the Spot fleet across types/AZs so one capacity pool draining does not stall the job; keep shuffle-heavy work tolerant to task retries; alarm on step FAILED.',
        production: 'Keep core nodes on-demand for stability; cap managed scaling; use runtime roles + Lake Formation for least-privilege data access; archive logs and persistent Spark UI for post-mortems.',
        cleanup: 'Transient clusters self-terminate; also expire old logs in S3 and remove the Step Functions state machine if decommissioning.',
      }],
      troubleshooting: [
        {
          symptom: 'A large Spark job on EMR intermittently fails or stalls near the end, with lost-executor / fetch-failed errors clustering around the same time.',
          evidence: 'Spark UI shows FetchFailedException and lost executors; the EMR console shows task instances being reclaimed; failures coincide with Spot interruption notices.',
          causes: ['Shuffle-heavy work running on Spot task nodes whose reclamation drops shuffle blocks', 'Too little Spot diversification so a whole capacity pool drains at once', 'Critical/HDFS work placed on Spot instead of on-demand core'],
          investigation: ['Correlate failures with Spot interruption events in the EMR/EC2 console', 'Check which node types hold shuffle data', 'Review instance-fleet diversification (types/AZs)'],
          rootCause: 'Reclaimed Spot task nodes took in-progress shuffle output with them, forcing expensive recomputation (fetch failures) that cascades on large stages.',
          remediation: ['Diversify the Spot task fleet across more instance types and AZs', 'Keep shuffle-critical capacity on on-demand core nodes; consider shuffle service tuning', 'Reduce shuffle (better partitioning, broadcast joins) so retries are cheaper'],
          validation: 'The same job completes reliably; fetch-failure/lost-executor rate drops; cost stays low because most capacity is still Spot.',
          prevention: 'Default to on-demand core + diversified Spot task fleets; design jobs to tolerate task-node loss; alarm on repeated fetch failures.',
        },
        {
          symptom: 'Spark executors on EMR are killed with "Container killed by YARN for exceeding memory limits" and the job repeatedly retries stages.',
          evidence: 'YARN/Spark logs show containers killed for exceeding physical memory; GC time is high; one or two tasks process far more data than the rest (skew).',
          causes: ['Executor memory / memoryOverhead too low for the data per task', 'Data skew concentrating a huge partition on one task', 'Too few partitions so each task holds too much'],
          investigation: ['Inspect the Spark UI for skewed task input sizes and GC time', 'Check executor memory and spark.executor.memoryOverhead settings', 'Look at partition counts for the heavy stage'],
          rootCause: 'Tasks need more memory than the container allows — usually skew or coarse partitioning putting too much data in one task, not a lack of total cluster capacity.',
          remediation: ['Fix skew (salting, AQE skew-join handling) rather than blindly adding memory', 'Increase partitions / repartition the heavy stage', 'Raise executor memory/overhead only after establishing the per-task footprint'],
          validation: 'Containers are no longer killed; task input sizes even out; stage runtime and GC drop.',
          prevention: 'Enable Adaptive Query Execution, watch for skew in design, and size partitions to data volume — add memory only when the bottleneck is proven.',
        },
      ],
      certMapping: {
        lead: 'EMR is the controllable big-data compute option in AWS data certifications — chosen against Glue/serverless on control and large-scale cost.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Compute selection for transformation (EMR vs Glue)', 'Spark on managed clusters; transient + Spot cost optimization', 'Security: IAM roles, encryption, Lake Formation access'] },
        ],
      },
      interview: [
        { q: 'When would you choose EMR over Glue ETL?', a: 'Choose EMR when you need control the serverless service does not give: specific Spark/Hive versions, custom libraries or configs, interactive/long-running clusters, or the lowest cost on very large steady batch via transient Spot clusters. Glue wins for short, bursty, event-driven ETL where you want zero cluster management and per-second billing. Rule of thumb: Glue for serverless convenience, EMR for control and large-scale cost efficiency.' },
        { q: 'What is the difference between core nodes and task nodes?', a: 'Core nodes run compute (executors) and also store HDFS data and shuffle blocks, so losing one can lose data. Task nodes run compute only — no HDFS — so they are the safe place for Spot instances: if a task node is reclaimed, Spark just retries its tasks elsewhere without data loss. A common pattern is on-demand core nodes for stability plus Spot task nodes for cheap burst.' },
        { q: 'How does EMR decouple storage from compute, and why does it matter?', a: 'EMR uses EMRFS to read and write directly to S3 instead of relying on HDFS on local disk. That means the data outlives the cluster, so you can run transient clusters — spin up, process, terminate — and pay nothing when idle, while multiple clusters and other engines (Athena, Spectrum) share the same S3 data through the Glue Catalog.' },
      ],
    },

    /* ── ANALYTICS & WAREHOUSE ───────────────────────────── */
    {
      id: 'athena', name: 'Amazon Athena', category: 'analytics',
      aka: 'Serverless SQL (Trino/Presto) directly over S3',
      tagline: 'Serverless interactive SQL over data in S3 — no cluster, no loading; you point at Glue Catalog tables and pay per terabyte scanned.',
      keyFacts: [
        { k: 'Engine', v: 'Trino / Presto (SQL), serverless' },
        { k: 'Reads', v: 'S3 via Glue Data Catalog' },
        { k: 'Billing', v: '$ per TB scanned (query cost)' },
        { k: 'Also', v: 'Spark engine, federated queries' },
      ],
      what: {
        lead: 'Athena runs standard SQL directly against files in S3, with no infrastructure to manage. It resolves tables through the Glue Data Catalog, reads the underlying Parquet/ORC/CSV/JSON, and returns results — you never load data into it.',
        bullets: [
          { h: 'Serverless & instant', d: 'No cluster to start; submit SQL and it runs, scaling automatically under the hood.' },
          { h: 'Catalog-driven', d: 'Tables come from the Glue Data Catalog, so anything registered there (by a crawler or DDL) is instantly queryable.' },
          { h: 'Beyond basic SQL', d: 'Supports CTAS (create table as select), views, federated queries to other stores, and an Athena Spark engine for notebooks.' },
        ],
      },
      why: {
        lead: 'Athena makes the S3 data lake queryable with zero setup and pay-per-query pricing — ideal for ad-hoc analysis, occasional reporting, and BI over the lake without standing up or paying for a warehouse. Because you pay per byte scanned, good data layout directly controls both speed and cost.',
        bullets: [
          { h: 'No infrastructure', d: 'Nothing to provision, patch, or keep warm; perfect for intermittent and exploratory querying.' },
          { h: 'Pay only for queries', d: 'Cost is per TB scanned — no idle compute charge, unlike a running warehouse.' },
          { h: 'Query in place', d: 'Analyze lake data where it sits; no ETL to load it into a separate system first.' },
        ],
      },
      how: {
        lead: 'You write ANSI SQL against catalog tables; Athena reads only the columns and partitions the query needs. Cost and latency are governed by how much data is scanned, so partitioning, columnar formats, and compression are the primary levers.',
        bullets: [
          { h: 'Scan reduction', d: 'Partition pruning + columnar Parquet/ORC + compression can cut scanned bytes (and cost) by 10–100×.' },
          { h: 'CTAS & partition projection', d: 'CTAS materializes optimized Parquet outputs; partition projection computes partitions from a pattern to avoid catalog bloat on date-partitioned tables.' },
          { h: 'Workgroups & limits', d: 'Workgroups isolate teams, set per-query data-scan limits, and route result locations for cost control and governance.' },
        ],
        code: {
          lang: 'sql (Athena)',
          text: "SELECT dt, count(*) AS orders, sum(amount) AS gmv\nFROM lake.orders\nWHERE dt BETWEEN '2024-01-01' AND '2024-01-31'\nGROUP BY dt\nORDER BY dt;   -- scans only Jan partitions",
        },
      },
      deUseCase: {
        lead: 'Athena is the serverless query and BI layer over an AWS lake — the tool analysts use for ad-hoc SQL and the engine behind dashboards that read curated Gold tables.',
        bullets: [
          { h: 'Ad-hoc & BI over the lake', d: 'Analysts query Silver/Gold tables directly; QuickSight and other BI tools connect to Athena for dashboards.' },
          { h: 'Lightweight transforms', d: 'CTAS/INSERT INTO builds derived tables without a Spark cluster for modest data sizes.' },
        ],
      },
      integrations: [
        { id: 's3', label: 'Amazon S3', note: 'data it queries' },
        { id: 'glue-catalog', label: 'Glue Data Catalog', note: 'table definitions' },
        { id: 'lake-formation', label: 'Lake Formation', note: 'column/row enforcement' },
        { label: 'QuickSight / BI', note: 'dashboards over Athena' },
        { label: 'Federated connectors', note: 'query RDS/DynamoDB/etc.' },
      ],
      runtime: {
        lead: 'At runtime Athena spins up serverless Trino workers per query, reads the needed data from S3 in parallel, and streams results to your S3 result location. There is no persistent state — every query is independent and priced by data scanned.',
        bullets: [
          { h: 'Cost = bytes scanned', d: 'A poorly-laid-out table (uncompressed CSV, no partitions) scans everything and costs the most; Parquet + partitions scan a fraction.' },
          { h: 'Concurrency', d: 'Queries run independently and scale automatically, subject to service/workgroup limits; heavy concurrent BI may favor a warehouse.' },
        ],
      },
      architecture: {
        lead: 'Athena is serverless SQL built on Trino/Presto (SQL engine v3) with a separate Spark engine for notebooks. It has no storage or metastore of its own: it resolves tables from the Glue Data Catalog and reads the files from S3, spinning up ephemeral workers per query and streaming results to an S3 result location.',
        bullets: [
          { h: 'Catalog + S3, no storage', d: 'Table schema/location/partitions come from Glue; data is read from S3. A table must exist in the catalog (crawler/DDL/API) before Athena can query it.' },
          { h: 'Per-query serverless workers', d: 'Each query gets ephemeral Trino workers that read only the needed columns/partitions in parallel — there is no persistent cluster or state between queries.' },
          { h: 'Scan-bound execution', d: 'Latency and cost are governed by bytes scanned, so partition pruning + columnar Parquet/ORC + compression are the primary design levers.' },
          { h: 'Beyond SELECT', d: 'CTAS/INSERT INTO materialize optimized Parquet; partition projection computes partitions from a pattern; federated connectors (via Lambda) query external stores; Iceberg tables add ACID DML.' },
        ],
      },
      security: {
        lead: 'Athena authorizes via IAM (who can run queries / reach which workgroup and result location) combined with the data-access controls on the underlying lake — Lake Formation for fine-grained table/column/row access on Glue-cataloged S3 data.',
        bullets: [
          { h: 'IAM + workgroups', d: 'IAM policies gate query execution, workgroup membership, and access to the S3 result location; workgroups isolate teams and enforce guardrails.' },
          { h: 'Lake Formation', d: 'Column/row-level and table access to the S3 data is enforced through Lake Formation on the Glue Catalog, not by Athena itself.' },
          { h: 'Result protection', d: 'Encrypt query results in the S3 result location (SSE-S3/KMS); restrict who can read that bucket since results materialize there.' },
          { h: 'Underlying S3 access', d: 'Athena reads S3 via the caller’s permissions/Lake Formation — least-privilege the data and result buckets.' },
        ],
      },
      operations: {
        lead: 'Athena is fully serverless, so operations is governance and cost control via workgroups, plus keeping table metadata healthy and watching service limits.',
        bullets: [
          { h: 'Workgroups as guardrails', d: 'Per-query/per-workgroup data-scan limits cap cost; workgroups route result locations, enforce encryption, and separate teams/environments.' },
          { h: 'Result reuse', d: 'Query result reuse returns cached results for identical queries within a window, cutting cost and latency for repeated dashboards.' },
          { h: 'Metadata hygiene', d: 'Keep partitions current (crawler, MSCK, or partition projection); projection avoids catalog bloat and slow partition listing on date tables.' },
          { h: 'Limits & monitoring', d: 'Concurrency/DML quotas apply; CloudWatch metrics and query history expose scanned bytes, runtime and failures for tuning.' },
        ],
      },
      cost: {
        lead: 'Athena bills per terabyte scanned (with a small per-query minimum) and nothing when idle — the opposite of a provisioned warehouse. For predictable heavy use, provisioned capacity (DPU reservations) offers fixed-cost compute. The entire cost lever is scanning less. (Rates vary by region — price against the official Athena pricing page.)',
        bullets: [
          { h: 'Per-TB scanned', d: 'Cost is driven by bytes read; uncompressed CSV with no partitions scans everything, while partitioned columnar Parquet scans a fraction.' },
          { h: 'Scan-reduction levers', d: 'Partition pruning, columnar + compression, selecting only needed columns, and CTAS to reformat raw data are the standard savings.' },
          { h: 'Guardrails & reuse', d: 'Workgroup scan limits prevent runaway queries; result reuse avoids re-scanning for repeated identical queries.' },
          { h: 'Provisioned capacity', d: 'For steady high volume, capacity reservations give predictable cost instead of per-query billing.' },
        ],
      },
      walkthrough: {
        lead: 'How a partitioned query executes and why layout controls the bill.',
        steps: [
          { h: 'Resolve the table', d: 'Athena looks up the table’s schema, S3 location and partitions in the Glue Catalog (or computes them via partition projection).' },
          { h: 'Prune partitions', d: 'The WHERE clause is matched against partition columns so only the relevant S3 prefixes are considered — the first and biggest scan reduction.' },
          { h: 'Plan columnar reads', d: 'For Parquet/ORC, Athena reads only the projected columns and uses file statistics to skip row groups.' },
          { h: 'Parallel scan on ephemeral workers', d: 'Serverless Trino workers read the selected data from S3 in parallel; bytes scanned here are what you pay for.' },
          { h: 'Aggregate & write results', d: 'Workers compute the result, which streams to the workgroup’s S3 result location (and may be served from reuse next time).' },
        ],
        note: 'Simplified; actual pruning depends on partitioning/projection and file format.',
      },
      examples: [{
        title: 'CTAS raw CSV into partitioned Parquet, then query cheaply with projection',
        requirement: 'Make a large raw CSV dataset fast and cheap to query in Athena, and keep new date partitions queryable without crawlers.',
        input: 'Raw gzip CSV order files in s3://shopkart-lake/raw/orders/ cataloged as raw.orders.',
        architecture: 'Athena CTAS (CSV → partitioned Parquet in S3) → optimized table with partition projection → cheap analyst queries.',
        code: {
          lang: 'sql (athena, illustrative)',
          text: "-- 1) Reformat to partitioned Parquet once\nCREATE TABLE lake.orders_parq\n  WITH (format='PARQUET', partitioned_by=ARRAY['dt'],\n        external_location='s3://shopkart-lake/silver/orders_parq/')\nAS SELECT order_id, customer_id, amount, dt FROM raw.orders;\n\n-- 2) Projection: no crawler/MSCK for new dates\nALTER TABLE lake.orders_parq SET TBLPROPERTIES (\n  'projection.enabled'='true','projection.dt.type'='date',\n  'projection.dt.range'='2023-01-01,NOW','projection.dt.format'='yyyy-MM-dd');\n\n-- 3) Cheap, pruned query\nSELECT dt, sum(amount) FROM lake.orders_parq\nWHERE dt BETWEEN '2024-01-01' AND '2024-01-31' GROUP BY dt;",
        },
        steps: [
          'CTAS the raw CSV into partitioned, compressed Parquet.',
          'Enable partition projection so new dates are queryable automatically.',
          'Query with a partition filter and only needed columns.',
          'Set a workgroup scan limit as a cost guardrail.',
        ],
        output: 'A columnar, partitioned table whose date-filtered queries scan a fraction of the data at a fraction of the cost.',
        validation: 'Compare bytes scanned (query stats) before vs after; confirm new dates are queryable without a crawler; results match the raw table.',
        errorHandling: 'If projection ranges are wrong, queries miss partitions — verify the range/format; CTAS failures surface in the query result.',
        production: 'Encrypt the result location; set workgroup scan limits; schedule periodic CTAS/compaction for ongoing ingestion.',
        cleanup: 'DROP the tables and delete the generated Parquet/result S3 prefixes to stop storage charges.',
      }],
      troubleshooting: [
        {
          symptom: 'Athena queries are slow and expensive — the scanned-bytes figure is enormous for a small result.',
          evidence: 'Query stats show TBs scanned; the table is CSV/JSON and uncompressed; queries use SELECT * and have no partition filter.',
          causes: ['Row-based uncompressed format (CSV/JSON) forcing full-file reads', 'No partitioning, so every query scans the whole table', 'SELECT * reading all columns'],
          investigation: ['Check the data-scanned stat per query', 'Inspect the table format and partition scheme', 'Review whether queries filter on partition columns and select only needed columns'],
          rootCause: 'The query scans far more data than it needs because the layout (format/partitioning/columns) does not let Athena prune — and Athena bills per byte scanned.',
          remediation: ['CTAS the data into partitioned, compressed Parquet/ORC', 'Filter on partition columns and select only needed columns', 'Set a workgroup scan limit as a guardrail'],
          validation: 'Scanned bytes drop by 10–100×; query latency and cost fall correspondingly.',
          prevention: 'Store lake data as partitioned columnar Parquet from the start and teach partition-aware querying.',
        },
        {
          symptom: 'A date-partitioned table is slow to plan or queries return no/incomplete data after new files land.',
          evidence: 'Huge partition counts slow query planning; new partitions are not visible until a crawler/MSCK runs; or a HIVE_PARTITION_SCHEMA mismatch appears.',
          causes: ['Partitions not registered (crawler/MSCK not run) so new data is invisible', 'Catalog bloat from millions of partitions slowing planning', 'Schema/partition mismatch between catalog and files'],
          investigation: ['Check whether new partitions are registered in the catalog', 'Count partitions and assess planning overhead', 'Compare catalog schema to the actual file layout'],
          rootCause: 'Partition metadata is stale or unwieldy — Athena cannot see or efficiently plan over partitions managed purely through the catalog.',
          remediation: ['Use partition projection to compute partitions from a pattern (no crawler/MSCK, no catalog bloat)', 'Or automate MSCK/partition registration on ingest', 'Fix schema/partition definitions to match the files'],
          validation: 'New dates are queryable immediately; planning is fast; no schema-mismatch errors.',
          prevention: 'Adopt partition projection for high-cardinality date tables and keep catalog schema aligned with file layout.',
        },
      ],
      certMapping: {
        lead: 'Athena is the serverless lake-query engine in the AWS Data Engineer exam’s analysis and cost domains.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Serverless SQL over S3 (Athena vs Redshift)', 'Partitioning, columnar formats & cost control', 'CTAS, partition projection, workgroups; Lake Formation access'] },
        ],
      },
      interview: [
        { q: 'How is Athena priced and how do you reduce cost?', a: 'Athena charges per terabyte of data scanned by a query. You reduce cost by scanning less: partition tables (so WHERE prunes to relevant prefixes), store data as compressed columnar Parquet/ORC (reads only needed columns), and avoid SELECT *. CTAS to reformat raw CSV into partitioned Parquet, and partition projection for date tables, are the standard optimizations. Workgroup data-scan limits act as a cost guardrail.' },
        { q: 'When would you use Athena versus Redshift?', a: 'Athena is serverless, pay-per-query, and best for ad-hoc/intermittent SQL directly over the S3 lake with no infrastructure. Redshift is a provisioned MPP warehouse (or Serverless) better for high-concurrency BI, complex joins, and consistently fast dashboards on modeled data. A common pattern is Athena for exploration and lake queries, Redshift for the curated, high-traffic serving layer — with Spectrum bridging the two.' },
        { q: 'Athena depends on which service for table definitions?', a: 'The Glue Data Catalog. Athena has no storage or metastore of its own — it reads table schemas, locations, and partitions from the catalog and the data from S3. So a table must exist in the catalog (via a crawler, DDL, or the API) before Athena can query it.' },
      ],
    },

    {
      id: 'redshift', name: 'Amazon Redshift', category: 'analytics',
      aka: 'Petabyte-scale MPP cloud data warehouse',
      tagline: 'AWS’s columnar MPP data warehouse — data distributed across nodes for parallel query, with Serverless and RA3 (compute/storage separation) options and Spectrum to reach the lake.',
      keyFacts: [
        { k: 'Architecture', v: 'MPP, columnar, leader + compute nodes' },
        { k: 'Node types', v: 'RA3 (managed storage) / Serverless' },
        { k: 'Distribution', v: 'DISTKEY + SORTKEY tuning' },
        { k: 'Lake reach', v: 'Redshift Spectrum over S3' },
      ],
      what: {
        lead: 'Redshift is a massively parallel processing (MPP) columnar warehouse. Data is split across compute nodes and their slices; a leader node plans queries and distributes work so each slice scans its portion in parallel. Columnar storage plus compression makes analytical scans fast.',
        bullets: [
          { h: 'MPP + columnar', d: 'Queries fan out across node slices; columnar layout + compression means a query reads only the needed columns, compressed.' },
          { h: 'RA3 & managed storage', d: 'RA3 nodes separate compute from storage (data in Redshift Managed Storage on S3), so you scale compute independently and pay for storage separately.' },
          { h: 'Serverless option', d: 'Redshift Serverless auto-provisions capacity (RPUs) per workload, removing cluster sizing for spiky or intermittent use.' },
        ],
      },
      why: {
        lead: 'When you need consistently fast SQL for high-concurrency BI and complex joins over modeled data, a warehouse beats query-in-place. Redshift’s MPP design, columnar storage, and distribution/sort tuning deliver low-latency analytics at scale, while Spectrum and RA3 keep it connected to the S3 lake.',
        bullets: [
          { h: 'Predictable BI performance', d: 'Provisioned MPP gives stable, fast response for dashboards and many concurrent users.' },
          { h: 'Tunable data layout', d: 'DISTKEY/SORTKEY let you co-locate join keys and skip blocks, cutting shuffle and I/O for known query patterns.' },
          { h: 'Lake + warehouse', d: 'Spectrum queries S3 directly and RA3 uses S3-backed storage, so the warehouse and lake are not silos.' },
        ],
      },
      how: {
        lead: 'Tables are distributed across slices by a distribution style and physically ordered by a sort key. The optimizer minimizes data movement when join keys are co-located and skips blocks using sort-key zone maps. COPY loads data in parallel from S3; UNLOAD writes results back.',
        bullets: [
          { h: 'Distribution styles', d: 'KEY (co-locate rows sharing a join key), ALL (replicate small dimensions to every node), EVEN (round-robin) — chosen to minimize redistribution during joins.' },
          { h: 'Sort keys + zone maps', d: 'Sorting by frequently-filtered columns lets Redshift skip whole blocks via min/max zone maps, slashing I/O.' },
          { h: 'COPY / UNLOAD', d: 'COPY ingests from S3 in parallel across slices (the fast bulk-load path); UNLOAD exports query results to S3 as Parquet/CSV.' },
        ],
        code: {
          lang: 'sql (Redshift)',
          text: "CREATE TABLE orders (\n  order_id bigint, customer_id bigint, amount numeric, dt date\n)\nDISTKEY(customer_id)   -- co-locate with customers\nSORTKEY(dt);           -- prune by date\n\nCOPY orders FROM 's3://shopkart-lake/silver/orders/'\nIAM_ROLE default FORMAT AS PARQUET;",
        },
      },
      deUseCase: {
        lead: 'Redshift is the curated serving layer of an AWS platform — the high-concurrency warehouse behind BI dashboards and the target of the final Gold-layer load.',
        bullets: [
          { h: 'Gold-layer warehouse', d: 'Curated dimensional/aggregate tables land here via COPY for fast, concurrent BI access.' },
          { h: 'Lake-adjacent queries', d: 'Spectrum lets Redshift join warehouse tables against cold history still in S3 without loading it.' },
        ],
      },
      integrations: [
        { id: 's3', label: 'Amazon S3', note: 'COPY/UNLOAD + RA3 storage' },
        { id: 'redshift-spectrum', label: 'Redshift Spectrum', note: 'query S3 from Redshift' },
        { id: 'glue-catalog', label: 'Glue Data Catalog', note: 'external schema for Spectrum' },
        { label: 'QuickSight / BI', note: 'dashboards' },
        { label: 'Glue / EMR', note: 'load curated data' },
      ],
      runtime: {
        lead: 'At runtime the leader node compiles and distributes a query plan; each slice scans its local data in parallel, and the plan is fastest when joins need little data redistribution. Poor distribution (skew) or missing sort keys cause broadcast/shuffle and block scans that dominate runtime.',
        bullets: [
          { h: 'Distribution skew', d: 'A bad DISTKEY concentrates rows on few slices, so those slices bottleneck the whole query — the classic Redshift performance trap.' },
          { h: 'Concurrency scaling & WLM', d: 'Workload management queues and concurrency scaling add transient clusters to absorb bursts of concurrent queries.' },
        ],
      },
      architecture: {
        lead: 'Redshift is a columnar MPP warehouse. A leader node parses/plans/optimizes queries and aggregates results; compute nodes are divided into slices that each own a partition of every table and scan it in parallel. RA3 separates compute from storage (Redshift Managed Storage on S3 with local SSD cache); Serverless abstracts nodes into RPUs.',
        bullets: [
          { h: 'Leader + compute slices', d: 'The leader compiles the plan and distributes it; each slice scans its local data in parallel. Query speed is governed by how evenly data and work spread across slices.' },
          { h: 'Distribution + sort', d: 'Distribution style (KEY/ALL/EVEN/AUTO) decides which slice a row lives on — KEY on the join column co-locates joins; sort keys physically order rows so zone maps (block min/max) skip blocks on filtered columns.' },
          { h: 'RA3 managed storage', d: 'RA3 stores data in RMS (S3-backed) with local SSD as cache, so compute scales independently of data size and enables data sharing across clusters.' },
          { h: 'Serverless', d: 'Redshift Serverless auto-scales capacity in RPUs per workload, removing cluster sizing for spiky/intermittent use.' },
        ],
      },
      security: {
        lead: 'Redshift layers network isolation, IAM for AWS-side actions (COPY/UNLOAD/Spectrum), database-level authorization (users, groups, RBAC roles, column/row-level security), and encryption. Spectrum access to the lake can be governed by Lake Formation.',
        bullets: [
          { h: 'IAM roles for data movement', d: 'COPY/UNLOAD and Spectrum assume an IAM role to reach S3/Glue; attach least-privilege roles to the cluster/namespace rather than embedding keys.' },
          { h: 'In-database authorization', d: 'Users/groups and RBAC roles grant privileges; column-level grants and row-level security policies restrict what each principal sees.' },
          { h: 'Lake governance for Spectrum', d: 'External (Spectrum) tables on the Glue Catalog can be governed by Lake Formation for fine-grained access to S3 data.' },
          { h: 'Encryption & network', d: 'KMS encrypts the cluster/RMS and snapshots; run in a VPC with security groups; enforce SSL for connections.' },
        ],
      },
      operations: {
        lead: 'Operating Redshift centers on workload management (concurrency), table maintenance (now largely automatic), snapshots/DR, and performance monitoring via system tables.',
        bullets: [
          { h: 'WLM & concurrency scaling', d: 'Auto WLM manages query queues and memory; concurrency scaling spins transient clusters to absorb bursts of concurrent queries so dashboards do not queue.' },
          { h: 'Maintenance', d: 'Auto VACUUM (reclaim/ re-sort) and ANALYZE (stats) keep tables healthy; for heavy delete/update patterns, confirm they are keeping up.' },
          { h: 'Snapshots & resize', d: 'Automated + manual snapshots (cross-region copy for DR); elastic resize adds/removes nodes quickly, classic resize for big topology changes.' },
          { h: 'Monitoring', d: 'STL/SVL/SYS system views and CloudWatch expose query plans, skew, spill and queue waits; query monitoring rules abort/log runaway queries.' },
        ],
      },
      cost: {
        lead: 'Provisioned RA3 bills node-hours plus RMS storage; Spectrum bills per TB scanned in S3; concurrency scaling bills in credits beyond a free allowance; Serverless bills RPU-hours for actual usage. The levers are right compute sizing, scan reduction, and pausing idle clusters. (Rates vary by region/node — price against the official Redshift pricing page.)',
        bullets: [
          { h: 'Compute vs storage', d: 'RA3 decouples them: pay node-hours for compute and RMS per-GB for storage; pause/stop or use Serverless for intermittent workloads to avoid idle cost.' },
          { h: 'Spectrum scan cost', d: 'Spectrum charges per TB scanned — partition and use columnar Parquet in S3 to scan (and pay) less.' },
          { h: 'Concurrency scaling', d: 'Earns some free credits; heavy sustained bursts beyond them bill — tune WLM so only genuine bursts scale out.' },
          { h: 'Scan reduction', d: 'Good DISTKEY/SORTKEY, compression, and result caching cut I/O and compute — the biggest steady-state savings.' },
        ],
      },
      walkthrough: {
        lead: 'How a join query executes across the MPP cluster.',
        steps: [
          { h: 'Leader plans', d: 'The leader parses the SQL, optimizes using table stats, and produces a distributed plan; a cached identical result may short-circuit here.' },
          { h: 'Distribute to slices', d: 'The plan is compiled and sent to every slice; each slice will operate on its local partition of the tables.' },
          { h: 'Scan with zone maps', d: 'Slices scan only the needed columns and skip blocks whose zone-map min/max cannot match the filter (effective when sorted on the filtered column).' },
          { h: 'Join locally or redistribute', d: 'If both tables are DISTKEYd on the join column, the join is local; otherwise rows are redistributed (DS_DIST) or a small table is broadcast (DS_BCAST) across the network — the usual performance cost.' },
          { h: 'Aggregate & return', d: 'Slices compute partial aggregates, the leader merges them, and the result returns (and may be cached).' },
        ],
        note: 'Simplified MPP execution; EXPLAIN shows the actual distribution/broadcast steps.',
      },
      examples: [{
        title: 'Load a Gold star schema with the right DISTKEY/SORTKEY and join cold data via Spectrum',
        requirement: 'Serve fast BI over a curated fact/dimension model, loaded in bulk from S3, while still joining to cold history left in the lake.',
        input: 'Curated Parquet for a fact table and dimensions in s3://shopkart-lake/gold/; cold history in S3 cataloged in Glue.',
        architecture: 'S3 Gold → COPY → Redshift fact (DISTKEY join col, SORTKEY date) + dims (DISTSTYLE ALL) → Spectrum external schema for cold S3 → BI.',
        code: {
          lang: 'sql (redshift, illustrative)',
          text: "CREATE TABLE f_sales (sale_id bigint, customer_id bigint, dt date, amount numeric)\n  DISTKEY(customer_id) SORTKEY(dt);\nCREATE TABLE d_customer (customer_id bigint, segment varchar) DISTSTYLE ALL;\n\nCOPY f_sales FROM 's3://shopkart-lake/gold/sales/'\n  IAM_ROLE default FORMAT AS PARQUET;\n\n-- cold history stays in S3, joined via Spectrum\nCREATE EXTERNAL SCHEMA lake FROM DATA CATALOG DATABASE 'lake' IAM_ROLE default;\nSELECT * FROM f_sales s JOIN lake.sales_archive a USING (customer_id);",
        },
        steps: [
          'DISTKEY the fact on the main join column; DISTSTYLE ALL small dims.',
          'SORTKEY the fact on the common filter (date) for zone-map pruning.',
          'COPY Parquet in parallel from S3.',
          'Add a Spectrum external schema to join cold S3 history without loading it.',
        ],
        output: 'Fast, high-concurrency BI over the star schema, with on-demand access to cold lake data via Spectrum.',
        validation: 'EXPLAIN shows local joins (no DS_BCAST/DS_DIST on the hot path); check for distribution skew in system views; Spectrum queries prune partitions.',
        errorHandling: 'If EXPLAIN shows redistribution, revisit DISTKEY; if dims are large, reconsider DISTSTYLE ALL; COPY errors surface in STL_LOAD_ERRORS.',
        production: 'Least-privilege the COPY/Spectrum IAM role; enable concurrency scaling for BI bursts; partition the Spectrum data to limit TB scanned.',
        cleanup: 'DROP the tables/external schema; delete snapshots and pause/stop the cluster (or use Serverless) to stop charges.',
      }],
      troubleshooting: [
        {
          symptom: 'A join query is far slower than expected and gets worse as data grows, even on a healthy cluster.',
          evidence: 'EXPLAIN shows DS_BCAST_INNER or DS_DIST_BOTH (redistribution/broadcast); system views show a few slices holding most rows (distribution skew).',
          causes: ['Join columns not co-located (wrong/AUTO DISTKEY) forcing redistribution', 'A skewed DISTKEY concentrating rows on few slices', 'A large dimension set to DISTSTYLE ALL or EVEN where KEY was needed'],
          investigation: ['Read EXPLAIN for DS_DIST/DS_BCAST steps on the join', 'Check per-slice row counts for skew in system views', 'Review DISTKEY/DISTSTYLE vs the actual join pattern'],
          rootCause: 'Rows that join are not on the same slice, so Redshift redistributes/broadcasts data across the network each query — or skew makes a few slices the bottleneck.',
          remediation: ['Set DISTKEY to the join column on both large tables so joins are local', 'DISTSTYLE ALL only for genuinely small dimensions', 'Pick a high-cardinality, evenly-distributed DISTKEY to avoid skew'],
          validation: 'EXPLAIN shows local joins (no broadcast/redistribution); per-slice rows even out; query time drops and scales.',
          prevention: 'Design distribution around the dominant join pattern; monitor skew; let AUTO manage only where patterns are unclear.',
        },
        {
          symptom: 'Dashboards slow down or queue during busy periods, and queries spill to disk.',
          evidence: 'System views show queue wait time and disk-based (spilled) query steps; WLM queue is saturated; concurrency scaling is off or capped.',
          causes: ['WLM queue/memory too small for the concurrency', 'Concurrency scaling disabled so bursts queue', 'Queries needing more memory than their WLM slot, so they spill to disk'],
          investigation: ['Check queue wait and disk-based steps in system views', 'Review WLM/auto-WLM configuration and memory per slot', 'Confirm whether concurrency scaling is enabled'],
          rootCause: 'Concurrent demand exceeds the WLM memory/slots, so queries queue and spill — a workload-management/sizing issue, not slow SQL per se.',
          remediation: ['Enable concurrency scaling to absorb bursts', 'Tune auto-WLM / memory so large queries get enough memory to stay in-memory', 'Reduce scanned data (sort keys, pruning) so queries need less memory'],
          validation: 'Queue waits fall, disk-based steps disappear, and dashboard latency stabilizes under peak concurrency.',
          prevention: 'Right-size WLM, keep concurrency scaling on for bursts, and cut scan/memory footprint with good table design.',
        },
      ],
      certMapping: {
        lead: 'Redshift is the MPP warehouse in the AWS Data Engineer exam’s data-store and performance domains.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Warehouse vs lake store selection', 'Distribution/sort design & query performance', 'COPY/UNLOAD, Spectrum, RA3/Serverless; security & cost'] },
        ],
      },
      interview: [
        { q: 'What are distribution keys and sort keys, and why do they matter?', a: 'A distribution key controls how rows are spread across node slices. Choosing the join key as DISTKEY co-locates matching rows so joins happen locally with no redistribution; ALL replicates small dimension tables everywhere; EVEN spreads round-robin when there is no good key. A sort key physically orders the table so Redshift can skip blocks via zone maps when you filter on it. Together they minimize data movement and I/O — the two biggest performance levers in Redshift. A bad DISTKEY causes skew, where a few slices hold most rows and bottleneck every query.' },
        { q: 'What is the difference between RA3 nodes and older node types?', a: 'RA3 nodes separate compute from storage: data lives in Redshift Managed Storage backed by S3, and the node’s local SSD acts as a cache. That lets you scale compute independently of data volume and pay for storage separately, instead of older DC/DS nodes where storage was fixed to the node size. RA3 (and Serverless) also underpin features like data sharing across clusters.' },
        { q: 'How does Redshift relate to the S3 data lake?', a: 'Three ways. COPY bulk-loads S3 data into Redshift in parallel across slices. Redshift Spectrum queries data left in S3 directly (via an external schema on the Glue Catalog), so you can join warehouse tables to lake data without loading it. And RA3 managed storage itself is S3-backed. So Redshift acts as the fast serving layer while staying connected to the lake for cold or bulk data.' },
      ],
    },

    {
      id: 'redshift-spectrum', name: 'Amazon Redshift Spectrum', category: 'analytics',
      aka: 'Query S3 lake data directly from Redshift',
      tagline: 'A Redshift feature that runs SQL over external tables in S3 — join lake data to warehouse tables without loading it, using a scale-out fleet that pushes work down to S3.',
      keyFacts: [
        { k: 'What', v: 'External tables in S3 from Redshift' },
        { k: 'Metadata', v: 'Glue Data Catalog (external schema)' },
        { k: 'Billing', v: '$ per TB scanned in S3' },
        { k: 'Value', v: 'Warehouse + lake in one query' },
      ],
      what: {
        lead: 'Redshift Spectrum lets a Redshift cluster query data that stays in S3, as external tables, and join it seamlessly to local warehouse tables. Spectrum uses a separate, elastic fleet of nodes to read and filter S3 data, then hands results back to the Redshift compute nodes.',
        bullets: [
          { h: 'External schema', d: 'You create an external schema mapped to a Glue Catalog database; its tables point at S3 and are queried like any Redshift table.' },
          { h: 'Elastic Spectrum fleet', d: 'Scans and predicate/aggregation pushdown run on a large managed fleet, independent of your cluster size, then feed the cluster.' },
          { h: 'Join lake + warehouse', d: 'A single query can join local dimensions to years of history sitting in S3.' },
        ],
      },
      why: {
        lead: 'Loading every byte into the warehouse is expensive and slow when much of the data is cold or rarely queried. Spectrum lets you keep bulk/history in cheap S3 yet still query and join it from Redshift on demand, extending the warehouse over the lake without duplicating storage.',
        bullets: [
          { h: 'Avoid loading cold data', d: 'Keep history in S3 at object-storage cost; query it only when needed instead of paying warehouse storage for it.' },
          { h: 'One SQL surface', d: 'Analysts write ordinary Redshift SQL; whether a table is local or in S3 is transparent.' },
          { h: 'Elastic scan power', d: 'The Spectrum fleet scales scanning independently, so big S3 scans do not consume all your cluster compute.' },
        ],
      },
      how: {
        lead: 'You register an external schema on the Glue Catalog and query its tables. The optimizer pushes filters, projections, and some aggregations down to the Spectrum fleet, which reads only the needed S3 partitions/columns; results stream back to the cluster to finish the join and aggregation.',
        bullets: [
          { h: 'Pushdown to S3', d: 'Partition pruning and column projection happen in the Spectrum layer, so like Athena the cost/latency depend on Parquet + partitioning.' },
          { h: 'Cost model', d: 'Billed per TB scanned in S3 (same lever as Athena), on top of your Redshift compute.' },
          { h: 'Same catalog', d: 'Because it uses the Glue Catalog, Spectrum and Athena see the very same external tables.' },
        ],
        code: {
          lang: 'sql (Spectrum)',
          text: "CREATE EXTERNAL SCHEMA lake\n  FROM DATA CATALOG DATABASE 'lake'\n  IAM_ROLE default;\n\nSELECT c.segment, sum(o.amount)\nFROM public.customers c            -- local table\nJOIN lake.orders_history o          -- S3 via Spectrum\n  ON c.customer_id = o.customer_id\nGROUP BY c.segment;",
        },
      },
      deUseCase: {
        lead: 'Spectrum is the bridge between the Redshift serving layer and the S3 lake — it keeps the warehouse lean by leaving cold/bulk data in S3 while still making it joinable.',
        bullets: [
          { h: 'Hot/cold tiering', d: 'Recent data lives in Redshift for speed; older history stays in S3 and is reached via Spectrum only when a query needs it.' },
          { h: 'Lake enrichment', d: 'Enrich warehouse queries with large raw datasets in S3 without an ETL load step.' },
        ],
      },
      integrations: [
        { id: 'redshift', label: 'Amazon Redshift', note: 'the host warehouse' },
        { id: 's3', label: 'Amazon S3', note: 'external table data' },
        { id: 'glue-catalog', label: 'Glue Data Catalog', note: 'external schema source' },
        { id: 'lake-formation', label: 'Lake Formation', note: 'governs external tables' },
        { label: 'Athena', note: 'shares the same catalog tables' },
      ],
      runtime: {
        lead: 'At runtime the Redshift optimizer decides what to push to the Spectrum fleet. Well-laid-out S3 data (Parquet, partitioned) means Spectrum scans little and returns filtered/aggregated results fast; unpartitioned CSV forces huge scans and slow joins.',
        bullets: [
          { h: 'Pushdown quality', d: 'The more filtering/aggregation pushed to Spectrum, the less data crosses back to the cluster — so layout drives performance.' },
          { h: 'Cost awareness', d: 'Because scans are billed per TB, a query over poorly-formatted S3 data can be both slow and costly.' },
        ],
      },
      architecture: {
        lead: 'Spectrum is a Redshift feature, not a standalone service: a Redshift query referencing an external (S3) table triggers the optimizer to push scan/filter/aggregation down to a separate, managed Spectrum fleet that reads S3 in parallel. Filtered results stream back to the cluster, which finishes the join/aggregation with local tables.',
        bullets: [
          { h: 'External schema on Glue', d: 'An external schema maps to a Glue Catalog database; its tables point at S3 and are queried like local tables (and are the same tables Athena sees).' },
          { h: 'Separate scan fleet', d: 'Spectrum scanning runs on a large managed fleet independent of your cluster size, so big S3 scans do not consume all cluster compute; the cluster does the final steps.' },
          { h: 'Pushdown', d: 'Partition pruning, column projection and some aggregation push down to the fleet — the less data returned to the cluster, the faster/cheaper the query.' },
          { h: 'Scan-bound like Athena', d: 'Cost/latency depend on S3 layout (Parquet + partitioning); billed per TB scanned on top of Redshift compute.' },
        ],
      },
      security: {
        lead: 'Spectrum inherits Redshift’s auth for the query and uses an IAM role to reach S3/Glue; fine-grained access to the external tables is governed by Lake Formation.',
        bullets: [
          { h: 'IAM role for S3/Glue', d: 'The external schema is created with an IAM role that grants Spectrum read on the S3 data and the Glue Catalog — least-privilege it.' },
          { h: 'Lake Formation governance', d: 'Column/row-level access on the external tables is enforced via Lake Formation on the Glue Catalog, consistently with Athena.' },
          { h: 'Redshift-side authz', d: 'Who can query the external schema is controlled by Redshift GRANTs like any schema.' },
          { h: 'Encryption', d: 'The underlying S3 data is encrypted by the object store; results flow back over the cluster’s secured connections.' },
        ],
      },
      operations: {
        lead: 'Operating Spectrum is keeping external-table metadata current and the S3 layout query-friendly, plus watching scan volume.',
        bullets: [
          { h: 'Partition currency', d: 'New S3 partitions must be registered (crawler / ALTER TABLE ADD PARTITION / partition projection via the catalog) or queries miss data.' },
          { h: 'Layout for pushdown', d: 'Parquet + partitioning maximizes pruning/pushdown; unpartitioned CSV forces full scans and heavy data return.' },
          { h: 'Monitoring', d: 'SVL_S3QUERY_SUMMARY and query plans show bytes scanned and how much filtering happened in Spectrum vs the cluster.' },
          { h: 'Shared catalog', d: 'Because it uses the Glue Catalog, Spectrum and Athena stay consistent — fix metadata once.' },
        ],
      },
      cost: {
        lead: 'Spectrum bills per TB scanned in S3 (same lever as Athena) on top of your Redshift cluster cost. The entire lever is scanning less: partition, use columnar Parquet, and push filters down. (Rates vary — price against the official Redshift/Spectrum pricing page.)',
        bullets: [
          { h: 'Per-TB scanned', d: 'Poorly-formatted S3 data scans more and costs more; Parquet + partitioning cut it sharply.' },
          { h: 'Avoid-load savings', d: 'Keeping cold/bulk history in S3 (vs loading into Redshift) saves warehouse storage and load compute — Spectrum reaches it only on demand.' },
          { h: 'Pushdown reduces transfer', d: 'More filtering in the fleet means less data returned to the cluster, lowering latency and cluster work.' },
        ],
      },
      walkthrough: {
        lead: 'How a warehouse+lake join query executes via Spectrum.',
        steps: [
          { h: 'Parse & plan', d: 'Redshift parses the query, recognizes the external (S3) table, and plans which operations to push to the Spectrum fleet.' },
          { h: 'Push scan to the fleet', d: 'The managed Spectrum fleet reads the external table from S3, pruning partitions and projecting only needed columns (and applying pushed-down filters/aggregations).' },
          { h: 'Return filtered rows', d: 'The fleet streams the reduced result set back to the Redshift compute nodes — far less data than the raw S3 table.' },
          { h: 'Finish locally', d: 'The cluster joins the returned lake rows to local warehouse tables and completes aggregation.' },
          { h: 'Return result', d: 'The combined result is returned; bytes scanned in S3 are what Spectrum bills.' },
        ],
        note: 'Simplified; how much pushes down depends on S3 layout and the query.',
      },
      examples: [{
        title: 'Hot/cold tiering: recent data in Redshift, history in S3 via Spectrum',
        requirement: 'Keep the warehouse lean by storing only recent data locally while still joining to years of history left in S3 — in one SQL query.',
        input: 'Recent sales in a local Redshift table; archived history as partitioned Parquet in S3 (cataloged in Glue).',
        architecture: 'Redshift local f_sales_recent + external schema lake (Glue) → Spectrum over s3 history → unioned/joined query.',
        code: {
          lang: 'sql (illustrative)',
          text: "CREATE EXTERNAL SCHEMA lake FROM DATA CATALOG DATABASE 'lake' IAM_ROLE default;\n\n-- query spans hot (local) + cold (S3 via Spectrum)\nSELECT dt, sum(amount) FROM (\n  SELECT dt, amount FROM public.f_sales_recent\n  UNION ALL\n  SELECT dt, amount FROM lake.sales_history   -- S3, partitioned Parquet\n  WHERE dt >= '2022-01-01')\nGROUP BY dt;",
        },
        steps: [
          'Create an external schema on the Glue database with an IAM role.',
          'Keep history as partitioned Parquet in S3 (not loaded into Redshift).',
          'Query local + external tables together; filter on partitions.',
          'Check the plan/SVL for partition pruning and pushdown.',
        ],
        output: 'A lean warehouse plus on-demand access to full history, joined in one query, without loading cold data.',
        validation: 'Confirm SVL_S3QUERY_SUMMARY shows pruned scans; results match a full-load baseline; cost tracks bytes scanned.',
        errorHandling: 'If history rows are missing, partitions are unregistered; if access denied, fix the external-schema IAM role / Lake Formation grants.',
        production: 'Partition + Parquet the S3 history; least-privilege the Spectrum IAM role; govern external tables with Lake Formation.',
        cleanup: 'Drop the external schema; the S3 data is untouched (remove it separately if decommissioning).',
      }],
      troubleshooting: [
        {
          symptom: 'A Spectrum query over S3 is slow and scans terabytes for a small result.',
          evidence: 'SVL_S3QUERY_SUMMARY shows huge bytes scanned; the external table is CSV/unpartitioned; little filtering pushed down.',
          causes: ['Row-based/uncompressed S3 data (CSV) forcing full reads', 'No partitioning so no pruning', 'Query shape preventing pushdown'],
          investigation: ['Check SVL_S3QUERY_SUMMARY bytes scanned and the plan', 'Inspect the external table format/partitioning', 'See whether filters push to Spectrum'],
          rootCause: 'The external data layout prevents pruning/pushdown, so Spectrum scans far more S3 than needed (billed per TB).',
          remediation: ['Convert to partitioned, compressed Parquet/ORC', 'Filter on partition columns; select only needed columns', 'Restructure the query so filters/aggregations push down'],
          validation: 'Bytes scanned drop sharply; query latency and cost fall.',
          prevention: 'Keep Spectrum/lake data as partitioned columnar Parquet and query partition-aware.',
        },
        {
          symptom: 'A Spectrum external table returns no rows or stale data after new files land, or fails with access denied.',
          evidence: 'New S3 partitions are not registered in the catalog; or the external-schema IAM role / Lake Formation grant is missing.',
          causes: ['Partitions not registered (crawler/ALTER/projection not run)', 'IAM role lacks S3/Glue read', 'Lake Formation not granting the external table'],
          investigation: ['Check whether the new partitions exist in the Glue Catalog', 'Verify the external-schema IAM role permissions', 'Review Lake Formation grants on the table'],
          rootCause: 'Spectrum can only see registered partitions it is authorized to read; missing metadata or grants hide data or deny access.',
          remediation: ['Register partitions (crawler/ALTER TABLE ADD PARTITION/projection)', 'Grant the IAM role S3 + Glue read', 'Grant the table via Lake Formation'],
          validation: 'Queries return current, complete data with no access errors.',
          prevention: 'Automate partition registration and template the IAM/Lake Formation grants.',
        },
      ],
      certMapping: {
        lead: 'Redshift Spectrum is the warehouse-over-lake bridge in the AWS Data Engineer exam’s analysis/store domains.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Query S3 from Redshift (Spectrum vs load vs Athena)', 'External schemas, partitioning & pushdown', 'Cost (TB scanned) & governance via Lake Formation'] },
        ],
      },
      interview: [
        { q: 'What is Redshift Spectrum and how does it differ from Athena?', a: 'Spectrum is a Redshift feature that queries external tables in S3 and joins them to local Redshift tables, using an elastic fleet that pushes scans down to S3. Athena is a standalone serverless SQL service over S3. Both read the same Glue Catalog tables and both bill per TB scanned, but Spectrum runs inside a Redshift query (so you can join lake data to warehouse tables in one statement and reuse Redshift’s compute for the final steps), while Athena needs no Redshift cluster at all. Use Spectrum when the query centers on the warehouse and reaches into the lake; use Athena for pure lake querying.' },
        { q: 'Why use Spectrum instead of loading the data into Redshift?', a: 'To avoid paying warehouse storage and load time for data that is cold, huge, or rarely queried. You keep history in cheap S3 and query it on demand, joining it to hot warehouse tables only when needed. It keeps the cluster lean and lets you tier data — recent in Redshift for speed, older in S3 reached via Spectrum.' },
        { q: 'What makes a Spectrum query fast and cheap?', a: 'The same things as Athena: store S3 data as compressed columnar Parquet/ORC and partition it so the optimizer can prune partitions and project only needed columns. That maximizes predicate/aggregation pushdown to the Spectrum fleet, minimizing both the bytes scanned (cost) and the data returned to the cluster (latency).' },
      ],
    },

    /* ── STREAMING ───────────────────────────────────────── */
    {
      id: 'kinesis', name: 'Amazon Kinesis', category: 'streaming',
      aka: 'Data Streams / Firehose / Managed Flink for real-time data',
      tagline: 'AWS’s family of streaming services — Data Streams for durable low-latency ingestion, Firehose for zero-code delivery to S3/Redshift, and Managed Flink for stream processing.',
      keyFacts: [
        { k: 'Data Streams', v: 'Sharded, ordered, replayable stream' },
        { k: 'Firehose', v: 'Managed delivery to S3/Redshift/OpenSearch' },
        { k: 'Managed Flink', v: 'SQL/Flink stream processing' },
        { k: 'Ordering', v: 'Per-shard, by partition key' },
      ],
      what: {
        lead: 'Kinesis is a family, not one product. Data Streams is a durable, replayable, sharded stream for low-latency ingestion. Firehose is a fully-managed delivery pipe that buffers and writes streaming data to destinations with no code. Managed Service for Apache Flink processes streams in real time.',
        bullets: [
          { h: 'Data Streams', d: 'Records are distributed across shards by partition key; consumers read with ordering per shard, and data is retained (up to 365 days) so it can be re-read/replayed.' },
          { h: 'Firehose', d: 'Point producers at a Firehose delivery stream and it batches, optionally transforms/converts to Parquet, and delivers to S3, Redshift, or OpenSearch — no consumers to run.' },
          { h: 'Managed Flink', d: 'Run Apache Flink (or Flink SQL) for windowed aggregations, joins, and enrichment on the stream.' },
        ],
      },
      why: {
        lead: 'Different streaming jobs need different tools. Data Streams gives you control, low latency, ordering, and replay when you run your own consumers. Firehose removes all of that operational work when you just need streaming data landed in S3/Redshift reliably. Managed Flink adds real-time computation without operating a Flink cluster.',
        bullets: [
          { h: 'Streams = control + replay', d: 'When you need custom consumers, exactly-once processing, or to re-read history, Data Streams’ shards and retention deliver it.' },
          { h: 'Firehose = zero-ops delivery', d: 'For "just get events into the lake," Firehose auto-buffers, converts, and writes with no code or consumers to manage.' },
          { h: 'Flink = real-time compute', d: 'Windowed aggregations and stream joins without standing up your own processing cluster.' },
        ],
      },
      how: {
        lead: 'Producers put records with a partition key; the key hashes to a shard, and ordering is guaranteed within a shard. Consumers read per shard (or fan out to many consumers via enhanced fan-out). Firehose instead manages consumption and delivery based on buffer size/time.',
        bullets: [
          { h: 'Shards & throughput', d: 'Each shard supports ~1 MB/s or 1000 records/s in and ~2 MB/s out; you scale by adding shards, or use on-demand mode to auto-scale.' },
          { h: 'Partition key & ordering', d: 'Records with the same partition key land on the same shard and stay ordered — so choose a key that both spreads load and preserves the ordering you need.' },
          { h: 'Firehose buffering', d: 'Firehose flushes on a buffer size (MB) or interval (seconds), so it trades a little latency for efficient, larger S3 objects.' },
        ],
        code: {
          lang: 'python (boto3 put)',
          text: "kinesis.put_record(\n  StreamName='orders',\n  Data=json.dumps(event),\n  PartitionKey=str(event['customer_id'])  # ordering per customer\n)",
        },
      },
      deUseCase: {
        lead: 'Kinesis is the real-time ingestion front door of an AWS platform — Firehose lands event streams as Parquet in the Bronze lake, while Data Streams + Flink (or Lambda) power low-latency processing.',
        bullets: [
          { h: 'Streaming to the lake', d: 'Firehose buffers clickstream/IoT events, converts to Parquet, and writes partitioned files to S3 for downstream batch/ELT.' },
          { h: 'Real-time pipelines', d: 'Data Streams feeds Managed Flink or Lambda for live aggregations, alerting, and enrichment before landing curated output.' },
        ],
      },
      integrations: [
        { id: 's3', label: 'Amazon S3', note: 'Firehose delivery target' },
        { id: 'redshift', label: 'Amazon Redshift', note: 'Firehose delivery target' },
        { id: 'glue-catalog', label: 'Glue Data Catalog', note: 'Firehose Parquet conversion schema' },
        { label: 'Lambda', note: 'transform records / consume' },
        { label: 'Managed Flink', note: 'stream processing' },
      ],
      runtime: {
        lead: 'At runtime throughput and ordering are governed by shards. Hot partition keys create a "hot shard" that throttles while others sit idle; scaling means resharding or on-demand mode. Consumers checkpoint their position so they resume and can replay from retained data.',
        bullets: [
          { h: 'Hot shards', d: 'A skewed partition key overloads one shard and throttles producers/consumers — choosing a well-distributed key is the key design decision.' },
          { h: 'Replay & checkpointing', d: 'Retention lets consumers re-read after a bug; the KCL (or Flink) checkpoints shard positions for fault-tolerant, resumable processing.' },
        ],
      },
      architecture: {
        lead: 'Kinesis is a family. Data Streams is a sharded, ordered, replayable log; Firehose is a managed buffer-and-deliver pipe with no consumers; Managed Service for Apache Flink is stream compute. The shard model (partition key → shard, ordering per shard, fixed per-shard throughput) governs almost every Data Streams design and failure.',
        bullets: [
          { h: 'Shards & partition key', d: 'A record’s partition key hashes to a shard; ordering holds only within a shard. Each shard takes ~1 MB/s or 1000 records/s in and ~2 MB/s out — so the key must both preserve needed ordering and spread load.' },
          { h: 'Provisioned vs on-demand', d: 'Provisioned mode fixes shard count (you reshard to scale); on-demand auto-scales shard capacity to traffic for a higher per-GB price.' },
          { h: 'Consumers: polling vs EFO', d: 'Standard consumers share the shard’s 2 MB/s read; enhanced fan-out (EFO) gives each consumer its own 2 MB/s dedicated pipe with push delivery. The KCL checkpoints shard position in a DynamoDB lease table for resumable, parallel consumption.' },
          { h: 'Firehose delivery', d: 'Firehose buffers by size/interval, optionally runs a Lambda transform and converts to Parquet (via a Glue schema) with dynamic partitioning, then delivers to S3/Redshift/OpenSearch — failed records go to an error prefix.' },
        ],
      },
      security: {
        lead: 'Kinesis security is IAM for producer/consumer/delivery permissions, KMS encryption at rest, TLS in transit, and (for Firehose) an IAM delivery role scoped to the destination.',
        bullets: [
          { h: 'IAM', d: 'Producers need PutRecord(s); consumers need Get/Describe (and EFO subscribe); Firehose assumes a delivery role to write the destination and read the Glue schema — least-privilege each.' },
          { h: 'Encryption', d: 'Server-side KMS encryption at rest and TLS in transit; use a CMK for audit/rotation on sensitive streams.' },
          { h: 'Network', d: 'Interface VPC endpoints keep producer/consumer traffic off the public internet.' },
          { h: 'Error visibility', d: 'Firehose routes undeliverable/failed-transform records to an S3 error prefix so nothing is silently dropped.' },
        ],
      },
      operations: {
        lead: 'Operating Data Streams is capacity (shards) and consumer-lag management; Firehose is nearly ops-free. The IteratorAge metric is the single most important health signal for stream consumers.',
        bullets: [
          { h: 'Scaling', d: 'Provisioned mode scales by resharding (UpdateShardCount / split-merge); on-demand auto-scales. Hot keys need a better partition key, not just more shards.' },
          { h: 'Consumer lag', d: 'GetRecords.IteratorAgeMilliseconds rising means consumers are falling behind — add consumers/shards, use EFO, or speed up processing.' },
          { h: 'Throttling signals', d: 'WriteProvisionedThroughputExceeded flags producers exceeding a shard; ReadProvisionedThroughputExceeded flags consumers — act on the right side.' },
          { h: 'Checkpoint store', d: 'The KCL lease/checkpoint table (DynamoDB) must be healthy; a throttled lease table stalls consumption.' },
        ],
      },
      cost: {
        lead: 'Data Streams (provisioned) bills shard-hours + PUT payload units (+ EFO + extended retention); on-demand bills per GB ingested/retrieved at a premium. Firehose bills per GB ingested (+ conversion/transform). The levers are right shard count, on-demand only when bursty, and buffering for efficient delivery. (Rates vary — price against the official Kinesis pricing page.)',
        bullets: [
          { h: 'Shards vs on-demand', d: 'Steady predictable load is cheaper provisioned; spiky/unknown load suits on-demand despite the per-GB premium.' },
          { h: 'EFO & retention', d: 'Enhanced fan-out and extended retention add cost — use them only where dedicated throughput / long replay is needed.' },
          { h: 'Firehose efficiency', d: 'Larger buffer sizes produce bigger S3 objects (fewer requests, better downstream scans) at a little more latency.' },
        ],
      },
      walkthrough: {
        lead: 'How a record flows through Data Streams from producer to a resumable consumer.',
        steps: [
          { h: 'Producer puts a record', d: 'The producer calls PutRecord(s) with a partition key; the key is hashed to decide the target shard.' },
          { h: 'Stored durably on a shard', d: 'The record is appended to that shard and replicated; it is retained (default 24h, up to 365 days) so it can be re-read.' },
          { h: 'Consumer reads per shard', d: 'A KCL consumer leases shards and reads records in order per shard (or an EFO consumer gets pushed its own 2 MB/s pipe).' },
          { h: 'Process & checkpoint', d: 'After processing a batch, the consumer checkpoints the shard position in its DynamoDB lease table, so a restart resumes from there.' },
          { h: 'Replay if needed', d: 'Because data is retained, a consumer can reset to an earlier position and re-read after a bug — ordering per shard is preserved throughout.' },
        ],
        note: 'Simplified; exact throughput/fan-out behavior depends on provisioned vs on-demand and standard vs EFO consumers.',
      },
      examples: [{
        title: 'Clickstream to the lake with Firehose: Parquet, dynamic partitioning, Lambda transform',
        requirement: 'Land a high-volume clickstream as partitioned Parquet in S3 with minimal operations and analytics-friendly file sizes.',
        input: 'JSON click events from web/mobile producers.',
        architecture: 'Producers → Firehose delivery stream (Lambda transform → Parquet via Glue schema, dynamic partitioning by event_date) → S3 Bronze → Athena/Glue.',
        code: {
          lang: 'json (firehose config sketch, illustrative)',
          text: "{\n  \"DataFormatConversion\": {\"enabled\": true, \"schema\": \"glue: lake.clicks\"},\n  \"DynamicPartitioning\": {\"enabled\": true},\n  \"Prefix\": \"bronze/clicks/dt=!{partitionKeyFromQuery:dt}/\",\n  \"BufferingHints\": {\"SizeInMBs\": 128, \"IntervalInSeconds\": 300},\n  \"ProcessingConfiguration\": {\"Lambda\": \"arn:...:function:enrich-clicks\"},\n  \"S3BackupMode\": \"FailedDataOnly\"\n}",
        },
        steps: [
          'Point producers at a Firehose delivery stream (no consumers to run).',
          'Enable a Lambda transform + Parquet conversion via a Glue schema.',
          'Use dynamic partitioning to write dt=…/ prefixes.',
          'Tune buffer size/interval for file size vs latency.',
        ],
        output: 'Partitioned Parquet clickstream in S3, queryable in Athena, with failed records isolated — no consumer fleet to operate.',
        validation: 'Confirm Parquet lands under dt=…/ with reasonable file sizes; check the error prefix is empty; query counts in Athena match producer volume.',
        errorHandling: 'Failed transforms/deliveries go to the S3 error prefix (S3BackupMode); a bad Lambda does not drop data silently.',
        production: 'Least-privilege the Firehose delivery role; size buffers for good file sizes; monitor delivery freshness and error-record volume.',
        cleanup: 'Delete the delivery stream and Lambda; expire the S3 data/error prefixes.',
      }],
      troubleshooting: [
        {
          symptom: 'Producers get throttled (ProvisionedThroughputExceeded) and one shard is far busier than others, even though total traffic is within the stream’s capacity.',
          evidence: 'WriteProvisionedThroughputExceeded on specific shards; one shard near its 1 MB/s / 1000 rec/s limit while others idle; a low-cardinality partition key.',
          causes: ['Skewed partition key concentrating records on one shard (hot shard)', 'Too few shards for the aggregate rate', 'A single key (e.g. a tenant) dominating volume'],
          investigation: ['Check per-shard incoming metrics for a hot shard', 'Review the partition key cardinality/distribution', 'Compare aggregate rate to total shard capacity'],
          rootCause: 'The partition key does not spread records evenly, so one shard saturates while the stream as a whole is under capacity — adding shards alone will not fix a single hot key.',
          remediation: ['Choose a higher-cardinality / better-distributed partition key (preserving required ordering)', 'Add shards (or on-demand) for genuine aggregate growth', 'Sub-shard a dominant key (e.g. key + bucket) if its ordering granularity allows'],
          validation: 'Per-shard load evens out and write throttling stops under the same traffic.',
          prevention: 'Design the partition key for even distribution and the ordering granularity you actually need; monitor per-shard metrics.',
        },
        {
          symptom: 'Downstream data is increasingly stale; consumers are hours behind the stream.',
          evidence: 'GetRecords.IteratorAgeMilliseconds climbs steadily; consumers cannot keep up; standard consumers contend for shard read throughput.',
          causes: ['Too few consumers/shards for the volume', 'Slow per-record processing in the consumer', 'Many consumers sharing the standard 2 MB/s per-shard read'],
          investigation: ['Track IteratorAge trend per shard', 'Profile consumer processing time per batch', 'Check how many consumers share each shard’s read throughput'],
          rootCause: 'Consumption throughput is below ingestion, so unread records age — a consumer-capacity/processing problem, not a producer one.',
          remediation: ['Add shards + consumer instances (KCL scales with shards)', 'Use enhanced fan-out so each consumer gets a dedicated 2 MB/s pipe', 'Speed up per-record processing / batch writes downstream'],
          validation: 'IteratorAge falls back to near-real-time and stays flat under load.',
          prevention: 'Size shards/consumers to peak ingestion, use EFO for multiple consumers, and alarm on IteratorAge.',
        },
      ],
      certMapping: {
        lead: 'Kinesis is the streaming-ingestion family in the AWS Data Engineer exam’s ingestion/real-time domain.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Streaming ingestion selection (Data Streams vs Firehose)', 'Shards, partition keys, ordering & scaling', 'Delivery to the lake (Parquet, partitioning); monitoring lag'] },
        ],
      },
      interview: [
        { q: 'What is the difference between Kinesis Data Streams and Firehose?', a: 'Data Streams is a durable, low-latency, sharded stream you consume with your own applications — it supports ordering per shard, retention/replay (up to 365 days), and multiple consumers, but you manage the consumers and scaling. Firehose is a fully-managed delivery service: you point producers at it and it buffers, optionally transforms and converts to Parquet, and writes to S3/Redshift/OpenSearch with no consumers or code to run. Use Streams when you need control, low latency, or replay; use Firehose when you just need streaming data reliably landed in a destination.' },
        { q: 'How does ordering and scaling work with shards and partition keys?', a: 'A stream is split into shards, and each record’s partition key hashes to a shard. Ordering is guaranteed only within a shard, so records that must stay ordered (e.g. events for one customer) should share a partition key. Each shard has fixed throughput (~1 MB/s in), so you scale by adding shards or using on-demand mode. The trap is a hot key: too many records with the same key overload one shard while others idle — you want a key that both preserves needed ordering and spreads load evenly.' },
        { q: 'How would you land a real-time event stream into the data lake with minimal operations?', a: 'Use Kinesis Data Firehose. Point producers at a Firehose delivery stream, enable record format conversion to Parquet (using a Glue Catalog schema), set a buffer size/interval to control file size vs latency, and deliver to a partitioned S3 prefix. It requires no consumers, auto-scales, and produces analytics-friendly Parquet in the Bronze layer — optionally running a Lambda transform on records in flight.' },
      ],
    },

    {
      id: 'msk', name: 'Amazon MSK', category: 'streaming',
      aka: 'Managed Streaming for Apache Kafka',
      tagline: 'Fully-managed Apache Kafka — the open-source streaming standard, run by AWS, for teams that want Kafka’s ecosystem and portability rather than a proprietary stream.',
      keyFacts: [
        { k: 'What', v: 'Managed Apache Kafka clusters' },
        { k: 'Model', v: 'Topics → partitions, consumer groups' },
        { k: 'Options', v: 'Provisioned or MSK Serverless' },
        { k: 'Why', v: 'Open Kafka API + ecosystem, portable' },
      ],
      what: {
        lead: 'MSK runs Apache Kafka as a managed service — AWS provisions the brokers, handles patching, and keeps the cluster healthy, while you use the standard Kafka APIs. It is real Kafka, so the entire Kafka ecosystem (Connect, Streams, Schema Registry, existing clients) works unchanged.',
        bullets: [
          { h: 'Topics & partitions', d: 'Data is organized into topics split into partitions; ordering is per partition and consumers scale via consumer groups.' },
          { h: 'Managed brokers', d: 'AWS handles broker provisioning, patching, and recovery; you focus on topics, producers, and consumers.' },
          { h: 'Provisioned vs Serverless', d: 'Provisioned gives broker-level control and sizing; MSK Serverless auto-scales capacity and removes broker management.' },
        ],
      },
      why: {
        lead: 'Teams already invested in Kafka — its API, Connect connectors, Streams library, and multi-cloud portability — want that exact ecosystem without operating brokers, ZooKeeper/KRaft, and upgrades. MSK gives Kafka compatibility and portability with managed operations, where Kinesis would lock them to an AWS-proprietary API.',
        bullets: [
          { h: 'Open ecosystem', d: 'Kafka Connect, Kafka Streams, Schema Registry, and existing Kafka apps run as-is.' },
          { h: 'Portability', d: 'Standard Kafka means workloads move between on-prem, other clouds, and AWS with minimal change.' },
          { h: 'Managed ops', d: 'No broker patching or cluster babysitting; Serverless removes even capacity planning.' },
        ],
      },
      how: {
        lead: 'Producers write to topic partitions; consumers in a consumer group each own a subset of partitions for parallel, ordered-per-partition consumption. Retention is time/size based, and replication across brokers/AZs provides durability. Integration with the lake is usually via Kafka Connect or a consuming job.',
        bullets: [
          { h: 'Partitions = parallelism', d: 'A topic’s partition count caps consumer parallelism within a group and defines the ordering boundary.' },
          { h: 'Replication & durability', d: 'Partitions are replicated across brokers/AZs; the replication factor and acks setting trade durability against latency.' },
          { h: 'Connect to the lake', d: 'Kafka Connect sink connectors (e.g. S3 sink) or a Spark/Flink consumer land topic data into S3 for analytics.' },
        ],
        code: {
          lang: 'text (concept)',
          text: "topic: orders  (12 partitions, RF=3)\n  producer --key=customer_id--> partition (ordered per key)\n  consumer-group=etl: 12 consumers, 1 partition each\n  S3 sink connector --> s3://lake/bronze/orders/",
        },
      },
      deUseCase: {
        lead: 'MSK is the streaming backbone for Kafka-centric platforms — the durable event bus that microservices publish to and that data pipelines consume into the lake and real-time systems.',
        bullets: [
          { h: 'Event backbone → lake', d: 'Services publish events to Kafka topics; a Connect S3 sink or Spark Structured Streaming job lands them in the Bronze lake.' },
          { h: 'Multi-consumer fan-out', d: 'The same topic feeds many independent consumers (analytics, search indexing, alerting) without re-ingesting.' },
        ],
      },
      integrations: [
        { id: 's3', label: 'Amazon S3', note: 'via Kafka Connect S3 sink' },
        { label: 'Kafka Connect', note: 'source/sink connectors' },
        { label: 'Managed Flink / Spark', note: 'stream processing' },
        { label: 'Lambda', note: 'event-source consumer' },
        { id: 'glue-catalog', label: 'Glue Schema Registry', note: 'schema governance' },
      ],
      runtime: {
        lead: 'At runtime throughput and ordering hinge on partition count and key choice, exactly as with Kafka anywhere. Consumer groups rebalance partitions as consumers join/leave; a skewed key or too-few partitions limits parallelism and creates lag.',
        bullets: [
          { h: 'Partition sizing', d: 'Too few partitions caps consumer parallelism and causes lag under load; too many adds overhead — sizing is the core tuning decision.' },
          { h: 'Consumer lag', d: 'Monitoring lag (records behind the head) is how you tell if consumers keep up; scale consumers up to the partition count to reduce it.' },
        ],
      },
      architecture: {
        lead: 'MSK runs real Apache Kafka: topics split into partitions replicated across brokers/AZs, consumed by consumer groups. AWS manages brokers, patching and recovery; you own topic design (partition count, replication, keys). Provisioned gives broker-level control; Serverless abstracts brokers and scales capacity.',
        bullets: [
          { h: 'Topics, partitions, groups', d: 'Ordering holds per partition; within a consumer group each partition is read by exactly one consumer, so partition count caps consumer parallelism. Records needing order share a key mapping to one partition.' },
          { h: 'Replication & durability', d: 'Each partition has a replication factor across brokers/AZs; acks + min.insync.replicas trade durability against latency (acks=all + ISR≥2 for no-loss).' },
          { h: 'Provisioned vs Serverless', d: 'Provisioned: choose broker type/count, storage autoscaling, and tiered storage for cheap long retention. Serverless: per-partition capacity, no broker sizing.' },
          { h: 'Ecosystem', d: 'Standard Kafka APIs mean Kafka Connect (MSK Connect), Kafka Streams, Schema Registry (Glue or Confluent) and existing clients work unchanged — the portability/lock-in difference vs Kinesis.' },
        ],
      },
      security: {
        lead: 'MSK supports multiple client auth modes (IAM, SASL/SCRAM, mTLS), KMS encryption at rest, TLS in transit, and VPC isolation, plus schema governance via a registry.',
        bullets: [
          { h: 'Authentication', d: 'IAM access control (AWS-native, policy-based topic/group permissions), SASL/SCRAM (secrets), or mTLS with ACLs — pick one and scope topic/group access least-privilege.' },
          { h: 'Encryption', d: 'KMS encryption at rest and TLS in transit (including between brokers); a CMK adds control/rotation.' },
          { h: 'Network', d: 'The cluster lives in your VPC; clients connect over private networking, with security groups controlling access.' },
          { h: 'Schema governance', d: 'A schema registry (Glue/Confluent) enforces compatible evolution so producers cannot break consumers.' },
        ],
      },
      operations: {
        lead: 'Operating MSK is Kafka operations with brokers managed: partition sizing, consumer-lag and ISR monitoring, scaling storage/brokers, and keeping rebalances rare.',
        bullets: [
          { h: 'Partition sizing', d: 'Too few partitions caps consumer parallelism and builds lag; too many add overhead. Size to peak throughput and desired consumer count.' },
          { h: 'Lag & ISR monitoring', d: 'Track consumer-group lag (records behind head) and under-replicated/offline partitions and ISR shrink — the core health signals.' },
          { h: 'Scaling & storage', d: 'Add brokers / enable storage autoscaling; tiered storage offloads old segments to cheap storage for long retention without big broker disks.' },
          { h: 'Stable consumers', d: 'Frequent consumer group rebalances (from timeouts/crashes) stall consumption — tune session/heartbeat and keep processing within poll intervals.' },
        ],
      },
      cost: {
        lead: 'Provisioned MSK bills broker-hours + storage (tiered storage cheaper for cold); MSK Serverless bills per-partition-hour + throughput + storage. The levers are right broker/partition sizing, tiered storage for retention, and Serverless for spiky/unknown load. (Rates vary — price against the official MSK pricing page.)',
        bullets: [
          { h: 'Brokers + storage', d: 'Provisioned cost is driven by broker type/count and retained data; tiered storage cuts the cost of long retention.' },
          { h: 'Serverless', d: 'Removes broker sizing and suits spiky/unpredictable load, billing per partition + throughput.' },
          { h: 'Right-size partitions', d: 'Over-partitioning adds overhead (and, on Serverless, cost); size to real parallelism/throughput needs.' },
        ],
      },
      walkthrough: {
        lead: 'How a record is produced, replicated, and consumed with offset commits.',
        steps: [
          { h: 'Produce to a partition', d: 'The producer sends a record; its key hashes to a partition (or round-robins if no key). The partition leader broker receives it.' },
          { h: 'Replicate per acks/ISR', d: 'The leader replicates to follower replicas; with acks=all the write is acknowledged only once min.insync.replicas have it — the durability guarantee.' },
          { h: 'Consumer group assignment', d: 'Consumers in a group are each assigned a subset of partitions; each partition is consumed by exactly one member, preserving per-partition order.' },
          { h: 'Process & commit offsets', d: 'A consumer processes records and commits its offset (to the __consumer_offsets topic); a restart resumes from the committed offset.' },
          { h: 'Rebalance on change', d: 'If a consumer joins/leaves, the group rebalances partition ownership; frequent rebalances stall progress, so stability matters.' },
        ],
        note: 'Simplified Kafka semantics; exact durability depends on acks, replication factor and min.insync.replicas.',
      },
      examples: [{
        title: 'Event backbone to the lake: MSK topic → Spark Structured Streaming → Delta',
        requirement: 'Land a durable Kafka event stream into the lake as a table-format Bronze with exactly-once, while other consumers use the same topic.',
        input: 'Microservices producing order events to an MSK topic (keyed by customer_id).',
        architecture: 'Producers → MSK topic (RF=3, acks=all) → Spark Structured Streaming (Kafka source) → Delta Bronze on S3; other consumers read the same topic.',
        code: {
          lang: 'pyspark (illustrative)',
          text: "df = (spark.readStream.format('kafka')\n  .option('kafka.bootstrap.servers', BROKERS)\n  .option('kafka.security.protocol','SASL_SSL')  # or AWS IAM\n  .option('subscribe','orders')\n  .option('startingOffsets','latest').load())\n\n(df.selectExpr(\"CAST(value AS STRING) AS json\")\n   .writeStream.format('delta')\n   .option('checkpointLocation','/chk/bronze_orders')\n   .toTable('bronze.orders'))",
        },
        steps: [
          'Create the topic with RF=3 and acks=all for durability.',
          'Consume with Spark Structured Streaming (Kafka source).',
          'Write to a Delta Bronze table with a checkpoint for exactly-once.',
          'Let independent consumers read the same topic in their own groups.',
        ],
        output: 'A durable Bronze Delta table fed exactly-once from Kafka, with the topic still available to other consumers (fan-out).',
        validation: 'Confirm Bronze counts match produced records; kill/restart the stream and verify no loss/dups; check consumer lag stays low.',
        errorHandling: 'The Spark checkpoint gives exactly-once on restart; acks=all + ISR prevent producer-side loss; schema registry guards against breaking changes.',
        production: 'Use IAM/SASL auth least-privilege; size partitions to consumer parallelism; monitor lag and under-replicated partitions; tiered storage for long retention.',
        cleanup: 'Delete the topic/connectors, drop the Bronze table, and remove the checkpoint.',
      }],
      troubleshooting: [
        {
          symptom: 'A consumer group falls behind (growing lag) and keeps rebalancing, so throughput is erratic.',
          evidence: 'Consumer-group lag climbs; logs show frequent rebalances; partition count ≤ consumer count (some consumers idle) or processing exceeds the poll interval.',
          causes: ['Too few partitions capping parallelism', 'Slow per-record processing exceeding max.poll.interval, triggering rebalances', 'Unstable consumers (timeouts/crashes) causing churn'],
          investigation: ['Check lag per partition and partition vs consumer counts', 'Measure processing time vs poll interval / session timeout', 'Look for repeated rebalance events in consumer logs'],
          rootCause: 'Consumption cannot keep up and/or the group is unstable — too few partitions or processing that overruns poll intervals forces rebalances and lag.',
          remediation: ['Add partitions and consumers (up to the partition count) for parallelism', 'Speed up processing or raise max.poll.interval / reduce batch size', 'Stabilize consumers (tune session/heartbeat; fix crashes)'],
          validation: 'Lag drains to near-zero and stays flat; rebalances stop; throughput is steady.',
          prevention: 'Size partitions to peak consumer parallelism, keep per-batch processing within poll limits, and monitor lag + rebalance frequency.',
        },
        {
          symptom: 'Under-replicated partitions appear and there is risk (or an incident) of message loss.',
          evidence: 'UnderReplicatedPartitions > 0; ISR shrinking; producers configured with acks=1; or broker storage near full.',
          causes: ['acks=1 (or min.insync.replicas=1) acknowledging before replicas have the data', 'A broker down / disk full shrinking ISR', 'Replication factor too low for the AZ-failure tolerance needed'],
          investigation: ['Check UnderReplicatedPartitions / ISR metrics', 'Review producer acks and topic min.insync.replicas', 'Check broker health and storage headroom'],
          rootCause: 'Durability settings or broker health do not guarantee replicated writes, so a broker failure can lose unreplicated messages.',
          remediation: ['Set acks=all with min.insync.replicas≥2 and RF≥3 across AZs', 'Restore/replace the unhealthy broker; enable storage autoscaling / tiered storage to avoid full disks', 'Alarm on UnderReplicatedPartitions'],
          validation: 'UnderReplicatedPartitions returns to 0, ISR is full, and acknowledged writes survive a broker loss.',
          prevention: 'Default to acks=all + RF≥3 + min.insync.replicas≥2 across AZs; monitor ISR and broker storage.',
        },
      ],
      certMapping: {
        lead: 'MSK is the open-Kafka streaming option in the AWS Data Engineer exam’s ingestion/real-time domain.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Kafka vs Kinesis selection (portability/ecosystem)', 'Partitions, consumer groups, ordering & durability (acks/RF/ISR)', 'Landing to the lake (Connect/Spark); lag monitoring'] },
        ],
      },
      interview: [
        { q: 'When would you choose MSK over Kinesis Data Streams?', a: 'Choose MSK when you want the open Apache Kafka API and ecosystem — Kafka Connect, Kafka Streams, Schema Registry, existing Kafka applications — or portability across on-prem/other clouds. Kinesis is simpler and more deeply AWS-integrated but uses a proprietary API that locks you in. If your team already runs Kafka or values avoiding lock-in, MSK; if you want the least operational overhead and tight AWS integration and don’t need Kafka specifically, Kinesis (especially Firehose for delivery).' },
        { q: 'How do partitions and consumer groups determine throughput and ordering in Kafka/MSK?', a: 'A topic is split into partitions; ordering is guaranteed only within a partition, so records needing order share a key that maps to one partition. Within a consumer group, each partition is consumed by exactly one consumer, so the partition count is the ceiling on consumer parallelism — adding consumers beyond the partition count leaves some idle. To increase throughput you add partitions (and consumers up to that count); a skewed key overloads one partition and creates lag on it.' },
        { q: 'How do you get MSK topic data into the S3 data lake?', a: 'The common patterns are a Kafka Connect S3 sink connector (config-driven, lands topic data as files with no custom code) or a stream-processing consumer — Spark Structured Streaming or Managed Flink reading the topic and writing partitioned Parquet/Delta/Iceberg to S3. Connect is simplest for raw landing; a processing job is better when you need transformation, exactly-once semantics, or a table format on write.' },
      ],
    },

    /* ── ORCHESTRATION ───────────────────────────────────── */
    {
      id: 'step-functions', name: 'AWS Step Functions', category: 'orchestration',
      aka: 'Serverless state-machine workflow orchestration',
      tagline: 'Serverless orchestration that coordinates AWS services as a visual state machine — with built-in retries, error handling, branching and parallelism, defined in JSON.',
      keyFacts: [
        { k: 'Model', v: 'State machine (Amazon States Language)' },
        { k: 'Strength', v: 'Native AWS service integrations' },
        { k: 'Types', v: 'Standard (durable) / Express (high-volume)' },
        { k: 'Built-in', v: 'Retries, catch, Map/Parallel branches' },
      ],
      what: {
        lead: 'Step Functions coordinates work as a state machine: each state does a task (call a service, run a Lambda), makes a choice, waits, or runs branches in parallel. Workflows are defined in the Amazon States Language (JSON) and visualized as a graph, with the service tracking every execution’s state.',
        bullets: [
          { h: 'States & transitions', d: 'Task, Choice, Wait, Parallel, Map, Pass, Succeed/Fail states compose into a directed workflow with explicit transitions.' },
          { h: 'Native integrations', d: 'Directly invokes Lambda, Glue, EMR, ECS, SNS/SQS, and more — often without glue code — and can wait for their completion.' },
          { h: 'Standard vs Express', d: 'Standard workflows are durable and long-running (up to a year) with exactly-once semantics; Express are cheap and fast for very high-volume, short workflows.' },
        ],
      },
      why: {
        lead: 'Chaining Lambdas and service calls with hand-rolled retry/error logic becomes brittle fast. Step Functions externalizes the control flow — retries, timeouts, catch/fallback, branching, and parallel fan-out — into a declarative, observable state machine, so orchestration logic is visible and reliable instead of buried in code.',
        bullets: [
          { h: 'Built-in resilience', d: 'Per-state retry with backoff and catch/fallback handling means you don’t reimplement error logic in every function.' },
          { h: 'Observability', d: 'Each execution shows exactly which state ran, its input/output, and where it failed — invaluable for debugging pipelines.' },
          { h: 'Serverless & event-driven', d: 'No orchestrator to run; start executions from EventBridge, S3 events, API, or a schedule.' },
        ],
      },
      how: {
        lead: 'You define states in JSON; an execution moves through them, passing JSON state between them. Task states can run synchronously (wait for a Glue/EMR job to finish via the .sync integration) or fire-and-forget. Map states fan out over a collection for parallel processing.',
        bullets: [
          { h: '.sync job control', d: 'The .sync integration pattern makes Step Functions start a Glue/EMR job and wait for it to complete before the next state — ideal for ETL orchestration.' },
          { h: 'Map for fan-out', d: 'A Map state runs the same sub-workflow across every item in an array (e.g. per-file or per-partition processing) with a concurrency limit.' },
          { h: 'Error handling', d: 'Retry (with interval/backoff/maxAttempts) and Catch (route to a handler state) are declared per task, not coded.' },
        ],
        code: {
          lang: 'json (ASL snippet)',
          text: "\"RunGlueJob\": {\n  \"Type\": \"Task\",\n  \"Resource\": \"arn:aws:states:::glue:startJobRun.sync\",\n  \"Parameters\": { \"JobName\": \"refine_orders\" },\n  \"Retry\": [{ \"ErrorEquals\": [\"States.ALL\"],\n              \"IntervalSeconds\": 30, \"MaxAttempts\": 2,\n              \"BackoffRate\": 2.0 }],\n  \"Next\": \"Publish\"\n}",
        },
      },
      deUseCase: {
        lead: 'Step Functions is the native orchestrator for serverless AWS pipelines — the state machine that sequences ingestion, Glue/EMR transforms, quality checks, and load, with retries and alerting built in.',
        bullets: [
          { h: 'ETL pipeline control', d: 'Orchestrate Glue/EMR jobs with .sync, branch on results, run parallel branches, and notify on failure — all without a running scheduler.' },
          { h: 'Event-driven workflows', d: 'An S3 landing event (via EventBridge) starts an execution that validates, transforms, and loads the new data.' },
        ],
      },
      integrations: [
        { id: 'glue-etl', label: 'Glue ETL', note: 'startJobRun.sync' },
        { id: 'emr', label: 'Amazon EMR', note: 'run steps / clusters' },
        { label: 'Lambda', note: 'task functions' },
        { label: 'EventBridge / S3', note: 'triggers executions' },
        { label: 'SNS / SQS', note: 'notify & queue' },
      ],
      runtime: {
        lead: 'At runtime each execution is tracked state-by-state; Standard workflows persist every transition (durable, replayable history) while Express trade that durability for throughput and lower cost. Retries and catches fire automatically per the definition.',
        bullets: [
          { h: 'Standard = durability', d: 'Full execution history and exactly-once state transitions; best for critical, long-running ETL orchestration.' },
          { h: 'Express = volume', d: 'Very high event rates and short durations at low cost, with at-least-once semantics and less history.' },
        ],
      },
      architecture: {
        lead: 'A Step Functions workflow is a state machine defined in Amazon States Language (JSON). The service durably tracks each execution’s current state and the JSON passed between states, applying retries/catches declaratively. Two workflow types trade durability for throughput.',
        bullets: [
          { h: 'States & data flow', d: 'Task, Choice, Wait, Parallel, Map, Pass, Succeed/Fail states form a directed graph; each state receives JSON input and emits JSON output, filtered by InputPath/ResultPath/OutputPath.' },
          { h: 'Service integration patterns', d: 'Request-response (fire and continue), .sync (start a Glue/EMR job and block until it completes), and waitForTaskToken (pause until an external system calls back with the token) — the three ways a Task waits (or not) on work.' },
          { h: 'Standard vs Express', d: 'Standard persists full execution history with exactly-once state transitions (up to a year) — for critical, auditable orchestration. Express is for very high-volume, short (≤5 min) workflows with at-least-once semantics and minimal history.' },
          { h: 'Scale with Map', d: 'Inline Map fans out over an array in-execution; Distributed Map processes massive datasets (e.g. millions of S3 objects) as child executions with high concurrency.' },
        ],
      },
      security: {
        lead: 'Step Functions executes under an IAM execution role; what the workflow can do is exactly what that role allows, including passing roles to the services it starts. Encryption and VPC reach come from the integrated services and optional logging config.',
        bullets: [
          { h: 'Execution role + PassRole', d: 'The state machine assumes an IAM role to call services; to start a Glue/EMR job under a job role it needs iam:PassRole for that role — a common source of "not authorized" failures.' },
          { h: 'Least privilege per integration', d: 'Grant only the specific actions each Task needs (e.g. glue:StartJobRun + glue:GetJobRun for .sync), not broad wildcards.' },
          { h: 'Data protection', d: 'State data can be large JSON — avoid putting secrets in it; pull secrets from Secrets Manager/SSM in the task. CloudWatch Logs for Express/Standard can be encrypted with KMS.' },
          { h: 'Auditability', d: 'Standard workflows’ full execution history plus CloudTrail give a tamper-evident record of what ran and with what input/output.' },
        ],
      },
      operations: {
        lead: 'Operations is mostly observability and the retry/catch policy: Step Functions removes the scheduler to run, so day-2 is watching executions, handling failures gracefully, and respecting service/state limits.',
        bullets: [
          { h: 'Declarative resilience', d: 'Per-Task Retry (interval/backoff/maxAttempts) and Catch (route to a handler) mean failures are handled in the definition, not re-coded per function.' },
          { h: 'Observability', d: 'The visual execution view shows each state’s input/output and failure point; CloudWatch metrics/alarms and X-Ray tracing cover latency and errors.' },
          { h: 'Long-running work', d: '.sync waits on Glue/EMR completion; waitForTaskToken pauses for arbitrary async/human steps until a callback — both avoid polling loops.' },
          { h: 'Limits to design around', d: 'State output payload size is capped (offload large data to S3 and pass a pointer); Standard has execution-history limits — keep per-execution state lean.' },
        ],
      },
      cost: {
        lead: 'Standard workflows bill per state transition; Express bill per request plus duration/memory. The cost model is the main reason to pick the right type: chatty, high-frequency workflows get expensive on Standard’s per-transition pricing, while Express is cheap at volume. (Rates vary by region — price against the official Step Functions pricing page.)',
        bullets: [
          { h: 'Standard = per transition', d: 'Every state transition is billed, so very high-volume or many-state workflows add up — great for durable, lower-frequency orchestration.' },
          { h: 'Express = per request + duration', d: 'Optimized for high event rates and short runs; far cheaper for per-event processing at scale.' },
          { h: 'Design levers', d: 'Collapse unnecessary states, use Map/Parallel instead of many sequential executions, and pick Express for high-frequency short flows.' },
        ],
      },
      walkthrough: {
        lead: 'How an event-driven ETL state machine executes, including retry/catch.',
        steps: [
          { h: 'Start execution', d: 'An S3 object-created event (via EventBridge) starts a Standard execution, passing the object key as input JSON.' },
          { h: 'Validate (Task → Lambda)', d: 'A Task state invokes a validation Lambda; a Retry block retries transient errors with backoff, a Catch routes hard failures to a notify-and-fail state.' },
          { h: 'Transform (.sync)', d: 'A Task uses glue:startJobRun.sync to start the Glue job and block until it finishes — the next state runs only on success.' },
          { h: 'Branch (Choice)', d: 'A Choice state inspects the job’s output (e.g. quality metric) and routes to load vs quarantine.' },
          { h: 'Fan out (Map/Parallel)', d: 'A Map state loads partitions in parallel with a concurrency limit; a Parallel state could run independent loads at once.' },
          { h: 'Finish & notify', d: 'On success it reaches a Succeed state; any uncaught failure hits a Catch that publishes to SNS. The full state-by-state history is retained for debugging.' },
        ],
        note: 'Simplified orchestration; exact states and integration patterns depend on the pipeline.',
      },
      examples: [{
        title: 'Event-driven ETL orchestration with .sync Glue and catch-to-SNS',
        requirement: 'When a file lands in S3, validate it, run a Glue transform, branch on data quality, and alert on any failure — with no scheduler to operate.',
        input: 'S3 object-created events for new files in a landing prefix.',
        architecture: 'S3 → EventBridge → Step Functions (Standard): Validate(Lambda) → Refine(Glue .sync) → Choice(quality) → Load / Quarantine; Catch → SNS.',
        code: {
          lang: 'json (asl, illustrative)',
          text: "\"Refine\": {\n  \"Type\": \"Task\",\n  \"Resource\": \"arn:aws:states:::glue:startJobRun.sync\",\n  \"Parameters\": { \"JobName\": \"refine_orders\" },\n  \"Retry\": [{\"ErrorEquals\":[\"States.ALL\"],\"IntervalSeconds\":30,\"BackoffRate\":2,\"MaxAttempts\":2}],\n  \"Catch\": [{\"ErrorEquals\":[\"States.ALL\"],\"Next\":\"NotifyFailure\"}],\n  \"Next\": \"QualityCheck\"\n}",
        },
        steps: [
          'Route S3 events through EventBridge to start the execution.',
          'Validate with a Lambda Task (retry transient errors).',
          'Run Glue via .sync so the workflow waits for completion.',
          'Branch on quality; catch failures to an SNS notification.',
        ],
        output: 'Files are validated, transformed, and loaded (or quarantined) automatically, with alerts on failure and a full execution trace.',
        validation: 'Trigger with a good and a bad file; confirm the good one loads and the bad one quarantines + alerts; inspect the execution graph for the path taken.',
        errorHandling: 'Retry handles transient errors with backoff; Catch guarantees failures notify rather than disappear; .sync ensures downstream runs only after the job truly succeeds.',
        production: 'Grant least-privilege + iam:PassRole for the Glue job role; alarm on execution failures; offload large payloads to S3 and pass pointers to stay under state-size limits.',
        cleanup: 'Delete the state machine, the EventBridge rule, and the SNS topic if decommissioning.',
      }],
      troubleshooting: [
        {
          symptom: 'A Task that starts a Glue/EMR job via .sync fails immediately with an authorization error, or never progresses past the job step.',
          evidence: 'The execution errors with "not authorized to perform iam:PassRole" or lacks glue:GetJobRun; the state stays in-progress while the job actually runs/fails independently.',
          causes: ['Execution role missing iam:PassRole for the job role', 'Missing the monitoring action (.sync needs GetJobRun/DescribeStep) so it cannot track completion', 'Job role itself lacks permissions, so the job fails while the state waits'],
          investigation: ['Read the execution error and the state input/output', 'Check the execution role for StartJobRun + GetJobRun + iam:PassRole on the job role', 'Check the Glue/EMR job’s own run status independently'],
          rootCause: 'The .sync pattern needs permission both to start the job and to pass/monitor its role; a missing PassRole or monitoring action breaks start or completion tracking.',
          remediation: ['Add iam:PassRole for the specific job role and the start+monitor actions to the execution role', 'Fix the job role’s own permissions', 'Scope permissions to the specific resources, not wildcards'],
          validation: 'The Task starts the job and blocks until it completes, then transitions on success; no authorization errors.',
          prevention: 'Template execution roles with the exact start/monitor/PassRole actions each integration needs; test with least privilege.',
        },
        {
          symptom: 'A workflow switched to Express for cost/scale now occasionally produces duplicate side effects (double writes, duplicate notifications).',
          evidence: 'The same input appears processed twice; Express workflow chosen for a flow with non-idempotent side effects.',
          causes: ['Express at-least-once semantics replaying a step', 'Non-idempotent task side effects', 'Assuming Express has Standard’s exactly-once transitions'],
          investigation: ['Confirm the workflow type (Express vs Standard)', 'Identify non-idempotent steps (writes, notifications)', 'Check whether duplicates align with retries/replays'],
          rootCause: 'Express workflows are at-least-once, so a step can run more than once; non-idempotent side effects then duplicate.',
          remediation: ['Make side effects idempotent (dedup keys, conditional writes)', 'Or use Standard for exactly-once state transitions where duplicates are unacceptable', 'Isolate non-idempotent work behind idempotency guards'],
          validation: 'Replays no longer cause duplicate effects; outputs are consistent under retry.',
          prevention: 'Match workflow type to semantics: Express for idempotent high-volume flows, Standard when exactly-once matters.',
        },
      ],
      certMapping: {
        lead: 'Step Functions is the serverless orchestration option in the AWS Data Engineer exam’s pipeline/orchestration domain.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Orchestration service selection (Step Functions vs MWAA)', 'Error handling, retries & .sync job control', 'Event-driven pipeline design'] },
        ],
      },
      interview: [
        { q: 'When would you use Step Functions versus MWAA (Airflow)?', a: 'Step Functions is serverless, event-driven, and excels at coordinating AWS services with built-in retries/error handling and no infrastructure — ideal for AWS-native, event-triggered pipelines. MWAA (managed Airflow) is better when you want Python-defined DAGs, a rich operator/connector ecosystem, complex scheduling and backfills, cross-cloud/hybrid tasks, or your team already knows Airflow. Rule of thumb: Step Functions for lightweight, AWS-centric, event-driven orchestration; Airflow for complex, code-first, schedule-heavy data pipelines.' },
        { q: 'How does Step Functions handle errors and long-running jobs?', a: 'Error handling is declarative per task: Retry blocks specify which errors to retry, with interval, backoff rate, and max attempts, and Catch blocks route failures to a handler state instead of failing the whole workflow. For long-running work it uses the .sync integration pattern — it starts a Glue/EMR job (or waits on a task token for arbitrary async work) and blocks that state until the job completes, so the next state only runs on success.' },
        { q: 'What is the difference between Standard and Express workflows?', a: 'Standard workflows are durable and can run up to a year, persisting full execution history with exactly-once state transitions — use them for critical, long-running orchestration like ETL pipelines. Express workflows are optimized for very high-volume, short-duration workloads (like per-event processing) at much lower cost, with at-least-once semantics and limited history. Choose Standard for reliability/auditability, Express for scale and cost on high-frequency events.' },
      ],
    },

    {
      id: 'mwaa', name: 'Amazon MWAA', category: 'orchestration',
      aka: 'Managed Workflows for Apache Airflow',
      tagline: 'Fully-managed Apache Airflow — Python-defined DAGs with Airflow’s vast operator ecosystem, run by AWS, for complex, schedule-heavy, code-first data pipelines.',
      keyFacts: [
        { k: 'What', v: 'Managed Apache Airflow' },
        { k: 'Pipelines', v: 'Python DAGs, operators, sensors' },
        { k: 'Strength', v: 'Scheduling, backfills, rich connectors' },
        { k: 'Scaling', v: 'Managed workers auto-scale' },
      ],
      what: {
        lead: 'MWAA runs Apache Airflow as a managed service. You author pipelines as Python DAGs (directed acyclic graphs of tasks) and drop them in an S3 bucket; AWS runs the scheduler, web server, and workers, scaling workers with load. It is standard Airflow, so the whole operator/provider ecosystem applies.',
        bullets: [
          { h: 'Python DAGs', d: 'Workflows are code: tasks, dependencies, schedules, and parameters expressed in Python, enabling dynamic and reusable pipelines.' },
          { h: 'Operators & sensors', d: 'A huge library of operators (Glue, EMR, Redshift, Spark, plus non-AWS systems) and sensors (wait for a file/partition/condition) reduces custom code.' },
          { h: 'Managed components', d: 'AWS runs and patches the scheduler, metadata DB, web UI, and auto-scaling workers.' },
        ],
      },
      why: {
        lead: 'For complex data engineering — many interdependent tasks, sophisticated scheduling, backfills, dynamic DAGs, and connectors to systems beyond AWS — Airflow is the industry standard, but self-hosting it is heavy ops. MWAA gives you Airflow’s expressiveness and ecosystem while AWS handles the infrastructure.',
        bullets: [
          { h: 'Code-first expressiveness', d: 'Dynamic DAGs, branching, parameters, and reuse are natural in Python — beyond what JSON state machines express cleanly.' },
          { h: 'Scheduling & backfills', d: 'Cron-like schedules, catchup/backfill of historical runs, and dependency management are Airflow’s core strengths.' },
          { h: 'Ecosystem & portability', d: 'Thousands of community operators and provider packages, and DAGs portable to any Airflow (on-prem/other cloud).' },
        ],
      },
      how: {
        lead: 'You upload DAG files (and a requirements.txt for extra packages) to S3; MWAA syncs them, the scheduler triggers tasks per their schedule/dependencies, and workers execute them. Tasks typically call AWS services via operators (e.g. trigger a Glue job and wait via a sensor).',
        bullets: [
          { h: 'DAGs from S3', d: 'The DAGs folder lives in S3; adding/updating a file deploys the workflow, and requirements.txt installs extra Python deps.' },
          { h: 'Operators trigger AWS work', d: 'GlueJobOperator/EmrOperator/RedshiftDataOperator etc. launch jobs; sensors poll for completion or for data arrival.' },
          { h: 'Environment sizing', d: 'You pick an environment class and min/max workers; MWAA auto-scales workers between those bounds under load.' },
        ],
        code: {
          lang: 'python (Airflow DAG)',
          text: "with DAG('daily_orders', schedule='0 2 * * *',\n         catchup=False) as dag:\n    ingest = GlueJobOperator(task_id='ingest',\n        job_name='ingest_orders')\n    refine = GlueJobOperator(task_id='refine',\n        job_name='refine_orders')\n    ingest >> refine   # dependency",
        },
      },
      deUseCase: {
        lead: 'MWAA is the code-first orchestrator for complex AWS (and hybrid) data platforms — the scheduler behind multi-stage medallion pipelines, backfills, and cross-system dependencies.',
        bullets: [
          { h: 'Complex DAG orchestration', d: 'Sequence and parallelize dozens of Glue/EMR/Redshift tasks with dependencies, retries, and SLAs in one Python DAG.' },
          { h: 'Backfills & reprocessing', d: 'Airflow’s catchup/backfill reruns historical intervals cleanly when logic changes or data is late.' },
        ],
      },
      integrations: [
        { id: 's3', label: 'Amazon S3', note: 'DAGs + data' },
        { id: 'glue-etl', label: 'Glue ETL', note: 'GlueJobOperator' },
        { id: 'emr', label: 'Amazon EMR', note: 'EMR operators' },
        { id: 'redshift', label: 'Amazon Redshift', note: 'load/transform tasks' },
        { label: 'Non-AWS systems', note: 'community operators' },
      ],
      runtime: {
        lead: 'At runtime the scheduler evaluates DAG schedules and dependencies and queues tasks to workers, which scale between your min/max bounds. Performance issues usually come from under-sized workers, heavy DAG parsing, or tasks doing work on the worker instead of pushing it to a service.',
        bullets: [
          { h: 'Push work down', d: 'Best practice is that operators trigger AWS jobs (Glue/EMR) and sensors wait — the worker orchestrates, it does not crunch the data itself.' },
          { h: 'Scaling & concurrency', d: 'Worker count, DAG/task concurrency, and pool settings control throughput; too many heavy concurrent tasks starve the environment.' },
        ],
      },
      architecture: {
        lead: 'MWAA runs the standard Apache Airflow components as a managed, VPC-deployed service: a scheduler, a web server (UI), auto-scaling workers (Celery executor on Fargate), and a managed metadata database (Aurora PostgreSQL). DAGs and dependencies live in S3; AWS patches and scales the rest.',
        bullets: [
          { h: 'Components', d: 'The scheduler evaluates DAG schedules/dependencies and queues tasks; workers execute them; the metadata DB holds DAG/task state; the web server serves the UI. MWAA runs all of these for you.' },
          { h: 'DAGs & deps from S3', d: 'DAG .py files, a requirements.txt (extra PyPI packages), and plugins.zip (custom operators) are read from an S3 bucket — pushing a file is the deploy.' },
          { h: 'VPC-native', d: 'The environment runs in your VPC; the web server can be private (VPC-only) or public, and tasks reach data sources over VPC networking.' },
          { h: 'Autoscaling workers', d: 'You pick an environment class and min/max workers; MWAA scales workers between those bounds with queue load, within the class’s task concurrency.' },
        ],
      },
      security: {
        lead: 'MWAA security combines an IAM execution role (what DAG tasks can do in AWS), VPC isolation, encryption, and a secrets backend for Airflow connections/variables so credentials are not stored in the metadata DB.',
        bullets: [
          { h: 'Execution role', d: 'Tasks assume the environment’s IAM execution role to call AWS services; least-privilege it and add iam:PassRole where operators launch jobs under other roles.' },
          { h: 'Secrets backend', d: 'Configure Secrets Manager (or SSM Parameter Store) as the Airflow secrets backend so connections/variables resolve at runtime instead of living in plaintext in the metadata DB.' },
          { h: 'Network isolation', d: 'Run in private subnets with a private web-server access mode; control egress with security groups and reach S3/services via VPC endpoints.' },
          { h: 'Encryption & audit', d: 'KMS encrypts the metadata DB, S3 and logs; CloudWatch Logs per component (scheduler/worker/web/DAG-processing) plus CloudTrail give audit and debugging.' },
        ],
      },
      operations: {
        lead: 'Operating MWAA is Airflow operations minus the infrastructure: manage DAG health, concurrency/sizing, dependency installs, and version upgrades, while watching the per-component CloudWatch logs.',
        bullets: [
          { h: 'Sizing & concurrency', d: 'Environment class + min/max workers + Airflow concurrency settings (parallelism, dag_concurrency, pools) govern throughput; undersizing leaves tasks queued, oversizing wastes cost.' },
          { h: 'Dependency management', d: 'requirements.txt installs PyPI packages — pin versions and test, since a bad/conflicting requirement can break the whole environment’s DAG parsing.' },
          { h: 'DAG hygiene', d: 'Keep top-level DAG code cheap (it runs on every parse); push heavy work to services; use sensors with timeouts to avoid stuck tasks.' },
          { h: 'Monitoring & upgrades', d: 'Watch scheduler/worker/DAG-processing logs and queue depth; plan Airflow version upgrades (MWAA offers specific versions) and test DAG compatibility.' },
        ],
      },
      cost: {
        lead: 'MWAA bills for the environment (by class) running continuously, plus per-worker costs as it autoscales, plus the metadata DB and storage. Unlike Step Functions it is not pay-per-execution — an idle environment still costs — so sizing and consolidation are the levers. (Rates vary by region/class — price against the official MWAA pricing page.)',
        bullets: [
          { h: 'Always-on base', d: 'The scheduler/web/metadata run continuously; a lightly-used environment still incurs the base class cost — consolidate low-volume DAGs rather than running many environments.' },
          { h: 'Worker autoscaling', d: 'Additional workers cost while scaled out; tune min/max and concurrency so bursts scale but idle shrinks to the minimum.' },
          { h: 'Right class', d: 'Pick the smallest environment class that holds your DAG count/parse load and task concurrency; scale up only when the scheduler/workers are the bottleneck.' },
        ],
      },
      walkthrough: {
        lead: 'How a scheduled DAG goes from an S3 upload to executed tasks.',
        steps: [
          { h: 'Deploy the DAG', d: 'You upload the DAG .py (and any requirements.txt/plugins.zip) to the environment’s S3 bucket; MWAA syncs it and the DAG-processor parses it.' },
          { h: 'Schedule evaluation', d: 'The scheduler evaluates the DAG’s schedule and upstream dependencies, creating a DAG run for the due interval (catchup/backfill if enabled).' },
          { h: 'Queue tasks', d: 'As each task’s dependencies are met, the scheduler queues it to the Celery executor; MWAA scales workers up if the queue grows.' },
          { h: 'Execute via operators', d: 'A worker runs the task — typically an operator that triggers a Glue/EMR/Redshift job; a sensor then waits for completion rather than crunching data on the worker.' },
          { h: 'Record state & retry', d: 'Task results/state are written to the metadata DB; failures retry per the task’s retry policy, and logs stream to CloudWatch.' },
          { h: 'Complete the run', d: 'When all tasks finish, the DAG run is marked success/failed; SLAs/alerts fire as configured.' },
        ],
        note: 'Simplified; exact executor/scaling behavior depends on environment class and Airflow version.',
      },
      examples: [{
        title: 'Daily medallion DAG orchestrating Glue with dependencies and backfill',
        requirement: 'Run a multi-stage daily pipeline (ingest → refine → publish) on AWS services, with dependencies, retries, and the ability to backfill missed days — code-first.',
        input: 'Source data arriving daily; Glue jobs for each stage; a schedule of 02:00 UTC.',
        architecture: 'S3 (DAGs) → MWAA scheduler → workers → GlueJobOperator tasks (ingest >> refine >> publish) → CloudWatch logs; catchup for backfill.',
        code: {
          lang: 'python (airflow dag, illustrative)',
          text: "with DAG('daily_orders', schedule='0 2 * * *',\n         start_date=datetime(2026,1,1), catchup=True,\n         default_args={'retries':2,'retry_delay':timedelta(minutes=5)}) as dag:\n    ingest  = GlueJobOperator(task_id='ingest',  job_name='ingest_orders')\n    refine  = GlueJobOperator(task_id='refine',  job_name='refine_orders')\n    publish = GlueJobOperator(task_id='publish', job_name='publish_gold')\n    ingest >> refine >> publish",
        },
        steps: [
          'Upload the DAG to the MWAA S3 DAGs folder.',
          'Let the scheduler create runs on the 02:00 schedule.',
          'Operators trigger each Glue job in dependency order with retries.',
          'Use catchup/backfill to reprocess missed or corrected days.',
        ],
        output: 'A daily, dependency-ordered pipeline with automatic retries and the ability to backfill historical intervals cleanly.',
        validation: 'Confirm the DAG appears in the UI without import errors; trigger a manual run; backfill a past date and verify it reprocesses that interval only.',
        errorHandling: 'Task retries handle transient failures; sensors with timeouts avoid stuck waits; keep tasks idempotent so backfills/retries do not duplicate.',
        production: 'Least-privilege the execution role (+PassRole for Glue roles); pin requirements; size workers/concurrency to the DAG; alert on failed runs and SLA misses.',
        cleanup: 'Remove the DAG file from S3, and delete the MWAA environment if decommissioning (it bills while running).',
      }],
      troubleshooting: [
        {
          symptom: 'DAG tasks sit in the "queued" state and do not run, or runs fall behind their schedule.',
          evidence: 'The Airflow UI shows many queued tasks and few running; worker utilization is pegged; parallelism/dag_concurrency limits are low or the environment is at max workers.',
          causes: ['Worker capacity or concurrency limits too low for the task volume', 'Max workers set too low to scale into the burst', 'Too many heavy concurrent tasks (or work done on the worker) saturating capacity'],
          investigation: ['Check queued vs running counts and worker CPU in CloudWatch', 'Review parallelism / dag_concurrency / pool settings and min/max workers', 'Confirm tasks push work to services rather than computing on the worker'],
          rootCause: 'The scheduler can queue more tasks than the workers/concurrency settings can execute, so tasks wait — a sizing/concurrency mismatch, not a scheduler fault.',
          remediation: ['Raise max workers and/or the concurrency settings (parallelism, dag_concurrency, pools)', 'Move heavy computation off the worker to Glue/EMR', 'Size the environment class up if the scheduler/DB is the bottleneck'],
          validation: 'Queued tasks drain promptly and runs keep to schedule under the same load.',
          prevention: 'Size workers/concurrency to peak DAG load, keep tasks orchestration-only, and alert on growing queue depth.',
        },
        {
          symptom: 'A newly-uploaded DAG does not appear in the UI, or the whole environment’s DAGs break after a dependency change.',
          evidence: 'DAG-processing logs show an ImportError or dependency conflict; a bad requirements.txt was deployed; heavy top-level imports slow parsing.',
          causes: ['requirements.txt with a conflicting/unavailable package version', 'Import error or exception in top-level DAG code', 'Expensive top-level code slowing or failing DAG parsing'],
          investigation: ['Read the DAG-processing/scheduler CloudWatch logs for the import error', 'Diff the recent requirements.txt change', 'Check for heavy work or failing imports at module top level'],
          rootCause: 'DAGs are parsed on every cycle; a failing import or a broken dependency install prevents parsing, so the DAG never registers (and can affect others).',
          remediation: ['Pin and test requirements before deploying; roll back a bad requirements.txt', 'Fix the import/top-level error; move heavy imports/work inside task functions', 'Validate DAGs locally against the MWAA Airflow version before upload'],
          validation: 'The DAG parses and appears in the UI; other DAGs are unaffected; parse time is healthy.',
          prevention: 'Pin dependencies, keep top-level code cheap, and test DAGs against the target Airflow version in CI before pushing to S3.',
        },
      ],
      certMapping: {
        lead: 'MWAA is the code-first (Airflow) orchestration option in the AWS Data Engineer exam’s orchestration domain.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Orchestration selection (MWAA vs Step Functions)', 'DAG scheduling, dependencies, backfills', 'Operational sizing & secure connections'] },
        ],
      },
      interview: [
        { q: 'Why choose MWAA over Step Functions for a data platform?', a: 'MWAA (Airflow) is code-first and shines for complex, schedule-heavy pipelines: Python DAGs with dynamic generation and reuse, rich scheduling with backfills/catchup, a massive operator ecosystem (including non-AWS systems), and dependency management across many tasks. It’s also portable and familiar to data teams. Step Functions is better for lightweight, serverless, event-driven AWS orchestration with no infrastructure. So: Airflow for complex, cross-system, schedule-driven data pipelines; Step Functions for event-triggered, AWS-native workflows.' },
        { q: 'How do you deploy and manage DAGs in MWAA?', a: 'DAGs are Python files stored in an S3 bucket that MWAA syncs automatically — adding or updating a file deploys the workflow, and a requirements.txt (also in S3) installs extra Python dependencies, with a plugins.zip for custom operators. AWS manages the scheduler, web server, metadata database, and worker auto-scaling; you choose the environment size and min/max workers. This means CI/CD for pipelines is essentially "push DAG files to S3."' },
        { q: 'What is a common anti-pattern in Airflow/MWAA data pipelines?', a: 'Doing the heavy data processing on the Airflow worker itself — e.g. loading a large dataset into pandas inside a task. Workers are for orchestration, not computation; that pattern OOMs workers and doesn’t scale. The correct approach is to have operators trigger scalable services (Glue, EMR, Redshift) and use sensors to wait for completion, so Airflow coordinates while the data crunching happens on the right engine. Other anti-patterns: expensive top-level code that runs on every DAG parse, and top-of-file imports of heavy libraries.' },
      ],
    },

    /* ── COMPUTE (serverless) ────────────────────────────── */
    {
      id: 'lambda', name: 'AWS Lambda', category: 'compute',
      aka: 'Serverless functions — event-driven glue for data pipelines',
      tagline: 'Run code without servers, triggered by events — the lightweight, event-driven glue that reacts to S3 uploads, stream records and API calls in a data platform.',
      keyFacts: [
        { k: 'Model', v: 'Event-driven functions, no servers' },
        { k: 'Billing', v: 'Per request + GB-second of runtime' },
        { k: 'Triggers', v: 'S3, Kinesis, EventBridge, API GW, SQS' },
        { k: 'Limits', v: '15-min max, memory-bound (up to 10 GB)' },
      ],
      what: {
        lead: 'Lambda runs your function code in response to events, with no servers to manage. AWS provisions the runtime, scales it to the event rate automatically, and bills only for actual execution time. It is designed for short, event-driven tasks — not long-running heavy compute.',
        bullets: [
          { h: 'Event sources', d: 'Functions are invoked by S3 object events, Kinesis/DynamoDB streams, EventBridge schedules/rules, SQS, API Gateway, and many more.' },
          { h: 'Auto-scaling', d: 'Concurrency scales with incoming events automatically — from zero to thousands — with no capacity planning.' },
          { h: 'Constrained by design', d: 'A 15-minute max duration and memory-tied CPU make it ideal for glue/coordination, not big-data crunching.' },
        ],
      },
      why: {
        lead: 'Much of a data platform is small, reactive work: kick off a job when a file lands, transform a stream record, validate input, call an API, send a notification. Lambda handles these with zero infrastructure and true pay-per-use, so there is nothing idle to run or pay for between events.',
        bullets: [
          { h: 'Event-driven glue', d: 'React instantly to S3/stream/schedule events without a running server or poller.' },
          { h: 'Pay per use', d: 'Billed per request and GB-second; idle costs nothing, ideal for spiky or infrequent triggers.' },
          { h: 'Scales itself', d: 'Concurrency grows with load automatically — no scaling policies to tune for bursty event rates.' },
        ],
      },
      how: {
        lead: 'You deploy a function (zip or container image) with a handler, memory size, and timeout; an event source mapping or trigger invokes it. Memory allocation also scales CPU, so tuning memory tunes performance. Cold starts add latency on the first invoke after idle.',
        bullets: [
          { h: 'Memory = CPU', d: 'CPU (and network) scale with the memory you allocate, so raising memory can make a function both faster and, sometimes, cheaper.' },
          { h: 'Stream batching', d: 'For Kinesis/DynamoDB/SQS sources, Lambda pulls records in configurable batches, so one invocation processes many events efficiently.' },
          { h: 'Cold starts', d: 'The first call after idle initializes the runtime (higher latency); provisioned concurrency keeps instances warm for latency-sensitive paths.' },
        ],
        code: {
          lang: 'python (S3-triggered)',
          text: "def handler(event, context):\n    for rec in event['Records']:\n        bucket = rec['s3']['bucket']['name']\n        key = rec['s3']['object']['key']\n        # e.g. start a Glue job for the new file\n        glue.start_job_run(JobName='ingest',\n            Arguments={'--input': f's3://{bucket}/{key}'})",
        },
      },
      deUseCase: {
        lead: 'Lambda is the event-driven connective tissue of an AWS pipeline — it triggers and coordinates heavier services rather than doing the heavy lifting itself.',
        bullets: [
          { h: 'Trigger ingestion', d: 'An S3 landing event invokes a Lambda that starts a Glue/EMR job or a Step Functions execution to process the new data.' },
          { h: 'Lightweight stream transforms', d: 'As a Kinesis/Firehose consumer, Lambda enriches, filters, or reformats records in flight.' },
        ],
      },
      integrations: [
        { id: 's3', label: 'Amazon S3', note: 'object-event trigger' },
        { id: 'kinesis', label: 'Kinesis / Firehose', note: 'record consumer/transform' },
        { id: 'step-functions', label: 'Step Functions', note: 'task functions' },
        { id: 'glue-etl', label: 'Glue ETL', note: 'kicks off jobs' },
        { label: 'EventBridge / SQS', note: 'schedules & queues' },
      ],
      runtime: {
        lead: 'At runtime each concurrent event gets its own function instance; AWS scales instances with the event rate. The two things to manage are cold-start latency and the fit of the workload to the 15-minute/memory limits — big or long jobs belong on Glue/EMR, not Lambda.',
        bullets: [
          { h: 'Concurrency & throttling', d: 'Scales automatically up to account/reserved limits; beyond that, invocations throttle — reserved/provisioned concurrency manages critical paths.' },
          { h: 'Right tool boundary', d: 'If a task risks the 15-minute timeout or needs lots of memory/parallelism, it should trigger a Glue/EMR job instead of doing the work in Lambda.' },
        ],
      },
      architecture: {
        lead: 'Lambda runs function code in managed, isolated execution environments that AWS scales with the event rate. Invocation model (synchronous, asynchronous, or poll-based event source mapping) determines retry/ordering behavior; memory sizing scales CPU; cold starts occur when a new environment initializes.',
        bullets: [
          { h: 'Invocation models', d: 'Synchronous (caller waits, e.g. API Gateway), asynchronous (event queued, Lambda retries ~2x then DLQ/destination), and event source mappings (Lambda polls Kinesis/DynamoDB/SQS in batches) — each has different retry/ordering semantics.' },
          { h: 'Concurrency', d: 'Each concurrent event gets its own environment; scaling is automatic up to account/reserved limits. Reserved concurrency caps/guarantees a function’s share; provisioned concurrency keeps environments warm.' },
          { h: 'Memory = CPU', d: 'CPU and network scale with allocated memory (up to 10 GB), so memory is the main performance dial; /tmp gives 512 MB–10 GB ephemeral storage.' },
          { h: 'Packaging', d: 'Deploy as a zip or container image; layers share dependencies. VPC attachment uses Hyperplane ENIs so VPC cold-start penalty is small now.' },
        ],
      },
      security: {
        lead: 'Lambda security is the IAM execution role (what the function can do), resource policies (who can invoke it), encrypted configuration, and network placement.',
        bullets: [
          { h: 'Execution role', d: 'The function assumes an IAM role for its AWS calls — least-privilege it to exactly the services it touches (e.g. start a specific Glue job, read one bucket).' },
          { h: 'Invoke permissions', d: 'Resource-based policies control which services/accounts can invoke the function; event sources need permission to trigger it.' },
          { h: 'Secrets & env encryption', d: 'Environment variables are encrypted with KMS; pull real secrets from Secrets Manager/SSM at runtime rather than baking them in.' },
          { h: 'Network', d: 'Attach to a VPC to reach private resources; otherwise it runs in the Lambda-managed network. Egress controls apply when VPC-attached.' },
        ],
      },
      operations: {
        lead: 'Operating Lambda is concurrency management, failure handling (retries/DLQ/destinations), and monitoring the key metrics — plus respecting the limits.',
        bullets: [
          { h: 'Concurrency & throttling', d: 'Watch ConcurrentExecutions and Throttles; use reserved concurrency to protect downstreams (and the function’s own share) and provisioned concurrency for latency-sensitive paths.' },
          { h: 'Failure handling', d: 'Async invokes retry then go to a DLQ / on-failure destination; stream sources retry a batch (configurable) with bisect-on-error and can route failures to a destination — otherwise a poison record blocks the shard.' },
          { h: 'Monitoring', d: 'CloudWatch Errors/Throttles/Duration/ConcurrentExecutions and (for streams) IteratorAge are the core signals; X-Ray traces latency across the call chain.' },
          { h: 'Right-tool boundary', d: 'If work risks the 15-min timeout or needs big memory/parallelism, trigger Glue/EMR/Step Functions instead of doing it in Lambda.' },
        ],
      },
      cost: {
        lead: 'Lambda bills per request + GB-seconds (memory × duration), with provisioned concurrency billed for kept-warm capacity. Idle costs nothing. Because memory scales CPU, right-sizing memory often lowers both latency and cost. (Rates vary — price against the official Lambda pricing page.)',
        bullets: [
          { h: 'Requests + GB-seconds', d: 'You pay per invocation and for memory×time; faster execution (more memory on CPU-bound work) can be cheaper despite the higher per-ms rate.' },
          { h: 'Provisioned concurrency', d: 'Removes cold starts but bills for kept-warm instances — use only on latency-sensitive paths.' },
          { h: 'Pay-per-use fit', d: 'Ideal for spiky/infrequent glue; a constantly-busy heavy workload may be cheaper on provisioned compute.' },
        ],
      },
      walkthrough: {
        lead: 'What happens when an S3 upload asynchronously triggers a function, including failure handling.',
        steps: [
          { h: 'Event delivered', d: 'S3 emits an object-created event; Lambda queues it (asynchronous invocation) and returns to S3 immediately.' },
          { h: 'Environment assigned', d: 'Lambda routes the event to a warm environment, or cold-starts a new one (init runtime + your init code) if none is free.' },
          { h: 'Handler runs', d: 'The handler executes (e.g. starts a Glue job for the new file); code outside the handler (clients/connections) is reused across invokes.' },
          { h: 'Retry on failure', d: 'If the handler errors, async invocation retries (~2x with backoff); persistent failures go to the configured DLQ / on-failure destination instead of being lost.' },
          { h: 'Scale with load', d: 'If many objects land at once, Lambda spins up concurrent environments up to the limit; excess invocations throttle.' },
        ],
        note: 'Simplified; retry/ordering differ for synchronous and stream (event-source-mapping) invocations.',
      },
      examples: [{
        title: 'S3-triggered orchestration: start a Glue job on new files with safe failure handling',
        requirement: 'When a file lands in S3, kick off downstream processing reliably, with retries and a dead-letter path — no polling server.',
        input: 'New objects under an S3 landing prefix.',
        architecture: 'S3 event → Lambda (async) → start Glue job; on-failure destination → SQS DLQ; CloudWatch alarms.',
        code: {
          lang: 'python (illustrative)',
          text: "import boto3\nglue = boto3.client('glue')\n\ndef handler(event, context):\n    for rec in event['Records']:\n        key = rec['s3']['object']['key']\n        glue.start_job_run(JobName='ingest',\n            Arguments={'--input': key})  # idempotent per key\n    return {'started': len(event['Records'])}",
        },
        steps: [
          'Add the S3 trigger (async invocation).',
          'Least-privilege the execution role to start that Glue job.',
          'Configure an on-failure destination (SQS/SNS) as a DLQ.',
          'Alarm on Errors/Throttles in CloudWatch.',
        ],
        output: 'New files reliably start downstream processing, with failures captured in a DLQ rather than lost.',
        validation: 'Drop a test file and confirm the Glue job starts; force an error and confirm the event lands in the DLQ; check metrics.',
        errorHandling: 'Async retries + DLQ prevent silent loss; make the start idempotent per key so retries do not double-process.',
        production: 'Set reserved concurrency so bursts do not overwhelm Glue; keep the function small/fast; monitor Throttles.',
        cleanup: 'Remove the S3 trigger and function; delete the DLQ and alarms.',
      }],
      troubleshooting: [
        {
          symptom: 'During a burst, many invocations fail with throttling (429 TooManyRequestsException) and events are delayed or dropped.',
          evidence: 'CloudWatch Throttles spike; ConcurrentExecutions hits the account/reserved limit; a downstream (e.g. a database) is also saturated.',
          causes: ['Concurrency ceiling (account or reserved) hit by the burst', 'A downstream resource (DB/API) limiting effective throughput', 'No batching, so each event is a separate invoke'],
          investigation: ['Check Throttles and ConcurrentExecutions vs the limit', 'Identify whether a downstream is the real bottleneck', 'Review batch settings for stream/queue sources'],
          rootCause: 'The event rate exceeds the available concurrency (or a downstream’s capacity), so Lambda throttles excess invocations.',
          remediation: ['Raise the account/reserved concurrency (or request a limit increase)', 'Protect/scale the downstream, or add reserved concurrency to throttle to its capacity deliberately', 'Batch stream/queue events to reduce invokes'],
          validation: 'Throttles return to ~0 under the same burst and events process within SLA.',
          prevention: 'Size concurrency to peak and downstream capacity; batch where possible; alarm on Throttles.',
        },
        {
          symptom: 'A Kinesis/DynamoDB-stream Lambda stops making progress on a shard and IteratorAge climbs.',
          evidence: 'IteratorAge rises steadily; the same batch keeps erroring (a poison record); the shard is blocked because stream sources retry in order.',
          causes: ['A poison record causing the batch to fail repeatedly, blocking the shard', 'No bisect-on-error / failure destination configured', 'Per-record processing too slow for the arrival rate'],
          investigation: ['Watch IteratorAge per shard', 'Inspect the failing batch/record', 'Check the event source mapping’s error-handling settings'],
          rootCause: 'Stream event sources preserve order and retry a failing batch, so a poison record (or too-slow processing) blocks the whole shard.',
          remediation: ['Enable bisect-on-error and an on-failure destination so bad records are isolated, not retried forever', 'Fix/validate the record handling to tolerate bad input', 'Increase parallelization factor / speed up processing for throughput'],
          validation: 'IteratorAge drains to near-real-time; bad records go to the failure destination instead of blocking.',
          prevention: 'Always configure bisect + failure destination on stream sources and make record processing resilient to bad input.',
        },
      ],
      certMapping: {
        lead: 'Lambda is the serverless event-glue compute in the AWS Data Engineer exam’s ingestion/orchestration domain.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Event-driven triggering & lightweight transforms', 'Concurrency, retries & failure handling (DLQ)', 'When to offload to Glue/EMR/Step Functions'] },
        ],
      },
      interview: [
        { q: 'What is Lambda’s role in a data pipeline, and what are its limits?', a: 'Lambda is event-driven glue: it reacts to S3 uploads, stream records, schedules, and API calls to trigger and coordinate work — for example, starting a Glue job when a file lands, or transforming Kinesis records in flight. Its limits shape that role: a 15-minute max duration, memory-tied CPU (up to 10 GB), and per-invocation scaling. So it’s ideal for short, reactive tasks and orchestration, but not for large or long-running data processing — that work should run on Glue, EMR, or a Step Functions-coordinated job.' },
        { q: 'What are cold starts and how do you mitigate them?', a: 'A cold start is the extra latency when Lambda has to initialize a new execution environment (runtime + your init code) for the first invoke after idle or when scaling up. You mitigate it with provisioned concurrency (keeps a set number of instances warm), keeping the package small and init code light, choosing a fast runtime, and reusing connections/clients declared outside the handler. For most asynchronous data-pipeline glue, cold starts don’t matter; they matter for latency-sensitive synchronous APIs.' },
        { q: 'How does memory allocation affect a Lambda function?', a: 'Memory is the main performance dial: CPU and network throughput scale proportionally with allocated memory. So a CPU-bound function given more memory runs faster, and because you’re billed per GB-second, faster execution can offset the higher per-ms cost — sometimes making more memory both faster and cheaper. You tune it by testing the function at different memory sizes and picking the best cost/latency point.' },
      ],
    },

    /* ── INGESTION & ETL (migration/CDC) ─────────────────── */
    {
      id: 'dms', name: 'AWS DMS', category: 'ingest-etl',
      aka: 'Database Migration Service — bulk load + CDC replication',
      tagline: 'Moves data from databases into AWS with minimal downtime — full-load plus ongoing change data capture (CDC) to keep a target continuously in sync with a source.',
      keyFacts: [
        { k: 'What', v: 'DB migration + continuous replication' },
        { k: 'Modes', v: 'Full load, CDC, or full load + CDC' },
        { k: 'Sources', v: 'Oracle, SQL Server, MySQL, Postgres, etc.' },
        { k: 'Targets', v: 'RDS, Redshift, S3, and more' },
      ],
      what: {
        lead: 'DMS replicates data from a source database to a target with little disruption. It can do a one-time full load, capture ongoing changes via CDC (reading the source’s transaction log), or both — first bulk-loading, then streaming subsequent changes so the target stays current.',
        bullets: [
          { h: 'Full load + CDC', d: 'Full load copies existing data; CDC then reads the source redo/binlog and applies inserts/updates/deletes continuously.' },
          { h: 'Heterogeneous & homogeneous', d: 'Migrate like-to-like (Oracle→Oracle) or across engines (Oracle→PostgreSQL), often paired with the Schema Conversion Tool for the latter.' },
          { h: 'Lake-friendly targets', d: 'A target can be S3 (as Parquet/CSV) or Redshift, making DMS a way to land operational data into the analytics platform.' },
        ],
      },
      why: {
        lead: 'Getting operational database data into the lake/warehouse — and keeping it fresh — is a core DE need. DMS handles both the initial bulk copy and the continuous change stream with minimal source downtime, so analytics reflects the operational system without hand-built CDC pipelines or heavy source impact.',
        bullets: [
          { h: 'Minimal downtime', d: 'Full-load-plus-CDC lets you migrate/replicate while the source stays online and in use.' },
          { h: 'Continuous freshness', d: 'CDC keeps the analytics target in near-real-time sync instead of nightly full reloads.' },
          { h: 'Low source impact', d: 'CDC reads the transaction log rather than repeatedly querying tables, sparing the source database.' },
        ],
      },
      how: {
        lead: 'You provision a replication instance, define source and target endpoints, and create a task with table mappings and a migration type. The task does the full load and/or tails the source transaction log for CDC, applying changes to the target.',
        bullets: [
          { h: 'Replication instance + endpoints', d: 'A compute instance runs the task; endpoints hold the source/target connection and credentials.' },
          { h: 'CDC from the log', d: 'CDC requires the source to expose its transaction log (e.g. binlog, redo, logical replication) and captures row-level changes from it.' },
          { h: 'S3 target for the lake', d: 'Writing to S3 lands full-load and CDC changes as files (often used to build a raw/CDC layer that Glue/Spark then merges).' },
        ],
        code: {
          lang: 'text (task shape)',
          text: "source endpoint: prod-mysql (binlog enabled)\ntarget endpoint: s3://lake/cdc/orders/  (Parquet)\ntask: full-load-and-cdc\n  -> initial snapshot, then streamed inserts/updates/deletes",
        },
      },
      deUseCase: {
        lead: 'DMS is the operational-data ingestion path of an AWS platform — the service that brings OLTP database data into the lake/warehouse and keeps it in sync via CDC.',
        bullets: [
          { h: 'CDC into the lake', d: 'Stream changes from production databases to S3, then MERGE them into Silver Delta/Iceberg tables for up-to-date analytics.' },
          { h: 'Warehouse hydration', d: 'Continuously replicate operational tables into Redshift so dashboards reflect near-current state.' },
        ],
      },
      integrations: [
        { id: 's3', label: 'Amazon S3', note: 'lake target (Parquet/CSV)' },
        { id: 'redshift', label: 'Amazon Redshift', note: 'warehouse target' },
        { id: 'glue-etl', label: 'Glue ETL', note: 'merge CDC into tables' },
        { label: 'RDS / on-prem DBs', note: 'sources & targets' },
        { label: 'Schema Conversion Tool', note: 'heterogeneous migrations' },
      ],
      runtime: {
        lead: 'At runtime the replication instance sizing, source log throughput, and target write speed govern lag. CDC latency (how far the target trails the source) is the key metric; large transactions, LOBs, and an undersized instance are the usual causes of growing lag.',
        bullets: [
          { h: 'CDC latency', d: 'Monitor source and target latency — if the target falls behind, scale the replication instance or tune the task (LOB handling, parallel apply).' },
          { h: 'Full-load tuning', d: 'Parallel table loading speeds the initial snapshot; CDC then takes over for ongoing changes.' },
        ],
      },
      architecture: {
        lead: 'DMS runs a task on a replication instance (or DMS Serverless capacity) that connects a source endpoint to a target endpoint. A task does a parallel full load and/or CDC: full-load bulk-copies existing rows while caching changes, then CDC reads the source transaction log and applies row-level changes to the target continuously.',
        bullets: [
          { h: 'Instance + endpoints + task', d: 'The replication instance provides compute; endpoints hold source/target connection + credentials; the task defines migration type, table mappings and transformation rules.' },
          { h: 'Full load → CDC handoff', d: 'Full load copies current data (parallelized per table) while changes during the load are cached; the task then transitions to CDC and applies cached + ongoing log changes so nothing is missed.' },
          { h: 'CDC from the log', d: 'CDC reads the source’s transaction log (MySQL binlog, Oracle redo + supplemental logging, Postgres logical replication) — low source impact vs table scans.' },
          { h: 'Targets & serverless', d: 'Targets include RDS, Redshift, and S3 (Parquet/CSV with a CDC op flag per row). DMS Serverless auto-scales capacity instead of a fixed instance.' },
        ],
      },
      security: {
        lead: 'DMS security is endpoint credentials (ideally from Secrets Manager), encryption at rest/in transit, network placement, and a target IAM role for S3/Redshift.',
        bullets: [
          { h: 'Endpoint credentials', d: 'Source/target credentials should come from Secrets Manager rather than inline; the source CDC user needs log-read privileges.' },
          { h: 'Encryption', d: 'KMS encrypts the replication storage and S3/Redshift targets; use SSL/TLS to the source and target endpoints.' },
          { h: 'Network', d: 'Run the replication instance in a VPC with routes/security groups to reach the source (on-prem via VPN/DX) and target privately.' },
          { h: 'Target access', d: 'An IAM role grants the task write access to an S3 (or Redshift) target — least-privilege it.' },
        ],
      },
      operations: {
        lead: 'Operating DMS is instance/capacity sizing, CDC latency monitoring, LOB and validation handling, and resilience.',
        bullets: [
          { h: 'Latency monitoring', d: 'CDCLatencySource/CDCLatencyTarget are the key metrics — rising latency means the target trails the source; act before it compounds.' },
          { h: 'LOB handling', d: 'Large objects need a LOB mode (full/limited/inline); limited LOB truncates beyond a size — choose deliberately to avoid data loss or slowness.' },
          { h: 'Validation', d: 'DMS data validation compares source and target row-by-row to catch replication drift.' },
          { h: 'Resilience', d: 'Multi-AZ replication instances survive AZ failure; tasks can resume from the last checkpoint; a premigration assessment flags unsupported constructs.' },
        ],
      },
      cost: {
        lead: 'DMS bills replication instance-hours (by instance size) plus storage and data transfer; DMS Serverless bills capacity units (DCUs) for actual usage. The levers are right instance/capacity sizing and not over-provisioning for steady CDC. (Rates vary — price against the official DMS pricing page.)',
        bullets: [
          { h: 'Instance-hours', d: 'A running replication instance bills continuously; size it to the change volume, not the peak-of-peaks.' },
          { h: 'Serverless', d: 'DMS Serverless scales capacity to the workload, avoiding idle instance cost for variable replication.' },
          { h: 'Transfer/storage', d: 'Cross-region/on-prem transfer and target storage add cost; keep source, instance and target close.' },
        ],
      },
      walkthrough: {
        lead: 'Lifecycle of a full-load-and-CDC task into an S3 lake target.',
        steps: [
          { h: 'Connect & assess', d: 'The task connects to source/target endpoints; a premigration assessment flags unsupported types/constructs.' },
          { h: 'Full load (parallel)', d: 'DMS bulk-copies existing rows table-by-table in parallel, while caching source changes that occur during the load.' },
          { h: 'Apply cached changes', d: 'After full load, DMS applies the changes cached during the load so the target matches the source as of the switchover.' },
          { h: 'CDC streaming', d: 'The task tails the source transaction log and writes ongoing inserts/updates/deletes to S3 as Parquet, each row carrying a CDC operation flag.' },
          { h: 'Downstream MERGE', d: 'A Glue/Spark job MERGEs the CDC files into Silver Delta/Iceberg so the analytics table reflects current state.' },
        ],
        note: 'Simplified; exact handoff/LOB behavior depends on task settings and source engine.',
      },
      examples: [{
        title: 'CDC from MySQL to S3, merged into a Silver Delta table',
        requirement: 'Continuously replicate an operational MySQL table into the lake with minimal source impact, and keep a Silver table current.',
        input: 'A production MySQL database with binlog enabled.',
        architecture: 'MySQL (binlog) → DMS full-load+CDC task → S3 CDC prefix (Parquet + op flag) → Glue/Spark MERGE → Silver Delta.',
        code: {
          lang: 'text / sql (illustrative)',
          text: "# DMS task: full-load-and-cdc, source=prod-mysql, target=s3://lake/cdc/orders/\n# S3 rows carry Op = I/U/D\n\n# downstream MERGE (Spark) keyed on PK, applying Op\nMERGE INTO silver.orders t USING cdc s ON t.id=s.id\n  WHEN MATCHED AND s.Op='D' THEN DELETE\n  WHEN MATCHED AND s.Op='U' THEN UPDATE SET *\n  WHEN NOT MATCHED AND s.Op<>'D' THEN INSERT *",
        },
        steps: [
          'Enable binlog + a CDC user on the source; create endpoints (creds from Secrets Manager).',
          'Run a full-load-and-CDC task writing Parquet + op flag to S3.',
          'MERGE the CDC files into the Silver Delta table by primary key.',
          'Monitor CDCLatencyTarget and validate row counts.',
        ],
        output: 'A continuously-updated Silver table reflecting the operational database, with low source impact.',
        validation: 'Use DMS data validation and compare counts; apply a source change and confirm it flows to Silver; watch latency metrics.',
        errorHandling: 'Choose a LOB mode that does not truncate needed data; resume the task from checkpoint on failure; the MERGE is idempotent per key.',
        production: 'Right-size the instance / use Serverless; Multi-AZ for resilience; secrets from Secrets Manager; alarm on CDC latency.',
        cleanup: 'Stop/delete the task and endpoints, delete the replication instance, and remove S3 CDC data if decommissioning.',
      }],
      troubleshooting: [
        {
          symptom: 'CDC latency grows steadily — the target falls further behind the source over time.',
          evidence: 'CDCLatencyTarget/Source climb; high change volume or large/long transactions; an undersized replication instance or slow target.',
          causes: ['Replication instance undersized for the change rate', 'Large/long transactions or heavy LOB handling', 'Slow target apply (e.g. Redshift single-row applies, or small S3 files)'],
          investigation: ['Watch CDCLatencySource vs CDCLatencyTarget to localize the bottleneck (read vs apply)', 'Check change volume and transaction sizes', 'Review instance size and target write performance'],
          rootCause: 'Apply (or capture) throughput is below the source change rate — usually sizing, big transactions/LOBs, or a slow target.',
          remediation: ['Scale the replication instance (or use Serverless); enable parallel apply where supported', 'Tune LOB handling; batch target writes (e.g. larger S3 files)', 'Optimize the target for bulk apply'],
          validation: 'CDC latency stabilizes near real-time under the same change rate.',
          prevention: 'Size to peak change volume, tune LOB/parallel-apply, and alarm on CDC latency.',
        },
        {
          symptom: 'CDC captures no changes (or misses some), though full load worked.',
          evidence: 'Full load completed but CDC shows zero/partial changes; source logging (binlog/supplemental logging/logical replication) is not enabled, or the DMS user lacks log-read permission.',
          causes: ['Source transaction logging not enabled/retained adequately', 'Oracle supplemental logging off / insufficient', 'CDC user missing log-read privileges'],
          investigation: ['Verify source logging is enabled with sufficient retention', 'Check engine-specific CDC prerequisites (supplemental logging, binlog format=ROW)', 'Confirm the DMS user’s privileges'],
          rootCause: 'CDC depends on the source exposing its transaction log with the right settings and permissions; without them, changes cannot be captured.',
          remediation: ['Enable the required logging (binlog ROW, Oracle supplemental logging, Postgres logical replication) with adequate retention', 'Grant the CDC user log-read privileges', 'Re-run the task from a fresh full load if a gap occurred'],
          validation: 'Ongoing source changes appear at the target; data validation reconciles source and target.',
          prevention: 'Confirm CDC prerequisites via a premigration assessment before starting the task.',
        },
      ],
      certMapping: {
        lead: 'DMS is the database-migration/CDC ingestion service in the AWS Data Engineer exam’s ingestion domain.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Full load vs CDC; minimal-downtime migration', 'CDC-to-lake pattern (S3 + MERGE)', 'Latency, LOB handling & validation'] },
        ],
      },
      interview: [
        { q: 'What is the difference between full load and CDC in DMS?', a: 'Full load is a one-time bulk copy of the existing data from source to target. CDC (change data capture) continuously reads the source’s transaction log and applies subsequent inserts, updates, and deletes to keep the target in sync. The common mode is "full load and CDC": DMS first snapshots the current data, then streams ongoing changes — enabling migrations and continuous replication with minimal source downtime. CDC is also lighter on the source than repeated queries because it reads the log rather than scanning tables.' },
        { q: 'How would you use DMS to feed a data lake with change data?', a: 'Configure a full-load-and-CDC task with the operational database as source and S3 as target, writing changes as Parquet (with the CDC operation flag per row). DMS lands the initial snapshot plus a continuous stream of change records into a raw/CDC prefix. A Glue or Spark job then MERGEs those change records into Silver Delta/Iceberg tables, applying inserts/updates/deletes so the analytics table stays current. This is a standard CDC-to-lakehouse pattern.' },
        { q: 'What does DMS need from the source database for CDC, and what causes replication lag?', a: 'CDC requires access to the source’s transaction log with the right settings — e.g. binary logging on MySQL, supplemental logging/redo on Oracle, logical replication on PostgreSQL — plus a user with permission to read it. Lag (the target trailing the source) typically grows from an undersized replication instance, high change volume or large/long transactions, LOB handling overhead, or a slow target. You address it by scaling the replication instance, tuning LOB and parallel-apply settings, and monitoring the source/target latency metrics.' },
      ],
    },

    /* ── GOVERNANCE & SECURITY (cert primitives) ───────────── */
    {
      id: 'iam', name: 'AWS IAM', category: 'governance',
      aka: 'Identity & Access Management — who can do what, on which resource',
      tagline: 'The identity backbone of every AWS service: roles, policies and least-privilege permissions that decide whether a principal may touch S3, Glue, Redshift or anything else.',
      keyFacts: [
        { k: 'Primitives', v: 'Users, Groups, Roles, Policies' },
        { k: 'Model', v: 'Deny-by-default; explicit allow' },
        { k: 'DE pattern', v: 'Assume a role, not long-lived keys' },
        { k: 'Scope', v: 'Identity-based + resource-based policies' },
      ],
      what: {
        lead: 'IAM governs authentication (who you are) and authorization (what you may do). Permissions are JSON policies — lists of Allow/Deny statements over Actions and Resources — attached to identities (users/groups/roles) or to resources (e.g. an S3 bucket policy).',
        bullets: [
          { h: 'Roles over keys', d: 'A role is a set of permissions a trusted principal temporarily assumes; Glue jobs, EMR clusters and Lambda all run as roles so no long-lived credentials sit in code.' },
          { h: 'Policy evaluation', d: 'Everything is denied unless explicitly allowed, and an explicit Deny always wins — the mental model behind every "access denied" you will debug.' },
          { h: 'Least privilege', d: 'Grant only the actions a job needs on only the resources it touches (e.g. s3:GetObject on one bucket prefix), not wildcard admin.' },
        ],
      },
      why: {
        lead: 'A data platform is only as safe as the permissions around it. IAM is how you stop a pipeline from reading tables it should not, keep tenants isolated, and pass an audit — without it, every service would be all-or-nothing.',
        bullets: [
          { h: 'Blast-radius control', d: 'Scoped roles mean a compromised job can touch only its own data, not the whole lake.' },
          { h: 'Cross-account sharing', d: 'Roles + trust policies let one account grant another tightly-scoped access without copying data or sharing keys.' },
        ],
      },
      how: {
        lead: 'You attach identity-based policies to roles that services assume, and resource-based policies (bucket/KMS key policies) to the data itself; the effective permission is the intersection, minus any explicit Deny. Lake Formation layers table/column grants on top for the catalog.',
        bullets: [
          { h: 'Service role', d: 'Give a Glue job a role with exactly s3:Get/Put on its prefixes and glue:* on its catalog — nothing more.' },
          { h: 'IAM Identity Center', d: 'Central workforce SSO and permission sets, replacing per-account IAM users for humans.' },
          { h: 'Conditions', d: 'Policy conditions (e.g. aws:SourceVpc, encryption-required) tighten access beyond action+resource.' },
        ],
        code: { lang: 'json (policy statement)', text: '{\n  "Effect": "Allow",\n  "Action": ["s3:GetObject", "s3:PutObject"],\n  "Resource": "arn:aws:s3:::shopkart-lake/silver/*"\n}' },
      },
      deUseCase: {
        lead: 'Every AWS DE pipeline runs under an IAM role: the exam and the job both expect least-privilege roles for Glue/EMR/Lambda, resource policies on S3, and cross-account roles for sharing — authentication vs authorization is a core DEA-C01 security objective.',
        bullets: [
          { h: 'Pipeline identity', d: 'Glue/EMR/Lambda assume scoped roles; no access keys in code.' },
          { h: 'Pairs with Lake Formation', d: 'IAM grants the coarse service access; Lake Formation adds fine-grained table/column/row grants.' },
        ],
      },
      integrations: [
        { id: 's3', label: 'Amazon S3', note: 'bucket policies + access' },
        { id: 'lake-formation', label: 'Lake Formation', note: 'fine-grained grants on top' },
        { id: 'glue-etl', label: 'Glue ETL', note: 'jobs run as IAM roles' },
        { id: 'kms', label: 'AWS KMS', note: 'key policies gate decryption' },
      ],
      runtime: {
        lead: 'At runtime every API call is authorized against the caller\'s effective policy; a missing action or an explicit Deny surfaces as AccessDenied. Temporary role credentials auto-rotate, so the usual failures are over-broad trust policies or a role missing one action.',
        bullets: [
          { h: 'Debugging denies', d: 'Read the error\'s action + resource, then check identity policy, resource policy and any Deny/SCP in that order.' },
          { h: 'Credential hygiene', d: 'Prefer short-lived role credentials; rotate or eliminate long-lived access keys.' },
        ],
      },
      architecture: {
        lead: 'IAM authorizes every AWS API call. A request is evaluated against the union of applicable policies: identity-based (on the user/role), resource-based (on the bucket/key), permission boundaries, Organizations SCPs, and session policies. The rule is deny-by-default, an explicit Deny (or a boundary/SCP that does not allow) always wins.',
        bullets: [
          { h: 'Policy types', d: 'Identity-based (what a principal can do), resource-based (who can act on a resource), permission boundaries (a ceiling on a role’s max permissions), SCPs (org-wide guardrails), and session policies (scope at assume time).' },
          { h: 'Roles + STS', d: 'A role has a trust policy (who may assume it) and permission policies (what it can do). sts:AssumeRole vends short-lived credentials — services (Glue/EMR/Lambda) and cross-account principals run as roles, so no static keys.' },
          { h: 'Evaluation order', d: 'Explicit Deny > SCP boundary > permission boundary > resource/identity Allow. A denied request anywhere in that chain fails, which is the mental model for debugging AccessDenied.' },
          { h: 'Guardrails & review', d: 'IAM Access Analyzer flags resources shared externally and over-broad access; Identity Center provides workforce SSO + permission sets instead of per-account users.' },
        ],
      },
      security: {
        lead: 'IAM is the security service; its own best practices are the content: least privilege, roles over keys, boundaries/SCPs for guardrails, MFA for humans, and continuous review.',
        bullets: [
          { h: 'Least privilege + boundaries', d: 'Scope policies to exact actions/resources; use permission boundaries so even a role’s own admins cannot exceed a ceiling, and SCPs for org-wide guardrails (e.g. deny public S3).' },
          { h: 'Roles, not long-lived keys', d: 'Services and humans assume roles for short-lived credentials; eliminate static access keys and rotate any that remain.' },
          { h: 'MFA + conditions', d: 'Require MFA for sensitive actions; tighten with conditions (aws:SourceVpc, aws:SecureTransport, encryption-required).' },
          { h: 'Review', d: 'Access Analyzer + access advisor (last-used) prune unused permissions; CloudTrail records who did what for audit.' },
        ],
      },
      operations: {
        lead: 'Operating IAM is policy hygiene, debugging denials methodically, and keeping guardrails current as the platform grows.',
        bullets: [
          { h: 'Debugging denies', d: 'Read the error’s action+resource, then check (in order) explicit Deny, SCPs, permission boundary, resource policy, identity policy — the first blocker is the cause.' },
          { h: 'Policy hygiene', d: 'Prefer managed policies for common roles; prune with access advisor; avoid wildcards that drift into over-permission.' },
          { h: 'Credential hygiene', d: 'Short-lived role credentials auto-rotate; alarm on long-lived key usage and root-account activity.' },
          { h: 'Guardrails', d: 'Maintain SCPs and boundaries so new roles cannot exceed policy even by mistake.' },
        ],
      },
      cost: {
        lead: 'IAM itself has no charge — you pay nothing for users, roles, or policies. The "cost" is operational and risk: over-broad permissions cause breaches/outages, not dollars; IAM Access Analyzer (and most features) are free.',
        bullets: [
          { h: 'Free service', d: 'IAM, roles, policies, boundaries and SCPs incur no direct charge.' },
          { h: 'Risk cost', d: 'Over-permission is the real cost — a compromised over-scoped role can touch far more than it should.' },
        ],
      },
      walkthrough: {
        lead: 'How a Glue job’s API call is authorized via an assumed role.',
        steps: [
          { h: 'Assume the role', d: 'The Glue service calls sts:AssumeRole on the job’s role; the role’s trust policy must allow the Glue service principal, or assumption fails.' },
          { h: 'Receive short-lived creds', d: 'STS returns temporary credentials scoped to the role’s permissions (and any session policy).' },
          { h: 'Make the API call', d: 'The job calls, say, s3:GetObject on a prefix using those credentials.' },
          { h: 'Evaluate policies', d: 'AWS checks the chain: any explicit Deny, SCPs, the role’s permission boundary, the bucket’s resource policy, and the identity policy — all must permit it.' },
          { h: 'Allow or deny', d: 'If every layer allows and nothing denies, the call succeeds; otherwise AccessDenied names the action/resource.' },
        ],
        note: 'Simplified evaluation; the full logic is in the IAM policy-evaluation documentation.',
      },
      examples: [{
        title: 'Least-privilege cross-account role for sharing lake data',
        requirement: 'Let a partner account read one S3 prefix without copying data or sharing keys, scoped tightly.',
        input: 'A producer account with lake data; a consumer account that needs read on silver/shared/.',
        architecture: 'Consumer principal → sts:AssumeRole → producer cross-account role (trust policy) → scoped S3 read.',
        code: {
          lang: 'json (trust + permission, illustrative)',
          text: "// trust policy: who may assume\n{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"arn:aws:iam::CONSUMER:root\"},\"Action\":\"sts:AssumeRole\",\n \"Condition\":{\"StringEquals\":{\"sts:ExternalId\":\"shopkart-2026\"}}}\n// permission policy: what it can do\n{\"Effect\":\"Allow\",\"Action\":[\"s3:GetObject\",\"s3:ListBucket\"],\n \"Resource\":[\"arn:aws:s3:::shopkart-lake\",\"arn:aws:s3:::shopkart-lake/silver/shared/*\"]}",
        },
        steps: [
          'Create a role in the producer account with a trust policy for the consumer (+ ExternalId).',
          'Scope its permission policy to the exact prefix.',
          'The consumer assumes the role and reads only that prefix.',
          'Audit usage via CloudTrail.',
        ],
        output: 'The partner reads only the shared prefix via short-lived credentials — no data copy, no shared keys.',
        validation: 'Confirm the consumer can read silver/shared/ but not other prefixes; check CloudTrail for the AssumeRole + S3 calls.',
        errorHandling: 'AssumeRole failures point to the trust policy / ExternalId; read failures to the permission policy or a bucket policy/SCP Deny.',
        production: 'Use ExternalId for third parties, scope to exact prefixes, and review with Access Analyzer.',
        cleanup: 'Delete the role and any bucket-policy grants when the share ends.',
      }],
      troubleshooting: [
        {
          symptom: 'An action fails with AccessDenied even though the role’s identity policy clearly allows it.',
          evidence: 'The identity policy has the Allow, but the call still fails; an explicit Deny, an SCP, a permission boundary, or a resource policy is blocking it.',
          causes: ['An explicit Deny somewhere (identity/resource/SCP)', 'An Organizations SCP not permitting the action', 'A permission boundary capping the role below the identity policy', 'The resource policy (bucket/KMS key) not allowing the principal'],
          investigation: ['Read the exact action+resource in the error', 'Check for explicit Deny, then SCPs, then permission boundary, then resource policy, then identity policy', 'Use the IAM policy simulator / Access Analyzer'],
          rootCause: 'Authorization is the whole chain, not just the identity policy; the first blocker (Deny/SCP/boundary/resource policy) wins over an identity Allow.',
          remediation: ['Remove/narrow the explicit Deny, or adjust the SCP/boundary', 'Grant the principal in the resource policy (e.g. KMS key policy for kms:Decrypt)', 'Align all layers to the intended least-privilege'],
          validation: 'The call succeeds with least privilege and no layer denies it.',
          prevention: 'Design boundaries/SCPs deliberately and debug denies in evaluation order; use the simulator before shipping roles.',
        },
        {
          symptom: 'A service or account cannot assume a role (AssumeRole fails).',
          evidence: 'sts:AssumeRole returns access denied; the role’s trust policy does not allow the principal, or the caller lacks sts:AssumeRole, or an ExternalId mismatch.',
          causes: ['Trust policy does not list the assuming principal/service', 'Caller’s identity policy lacks sts:AssumeRole on the role', 'ExternalId / condition mismatch'],
          investigation: ['Inspect the role’s trust policy for the principal', 'Check the caller has sts:AssumeRole permission on the role ARN', 'Verify ExternalId/conditions match'],
          rootCause: 'Role assumption requires both the trust policy to allow the principal and the caller to be permitted to assume — plus any conditions.',
          remediation: ['Add the principal/service to the trust policy', 'Grant the caller sts:AssumeRole on the role', 'Fix the ExternalId/condition'],
          validation: 'The principal assumes the role and receives temporary credentials.',
          prevention: 'Template trust policies per use (service vs cross-account), require ExternalId for third parties, and test assumption.',
        },
      ],
      certMapping: {
        lead: 'IAM is the identity/authorization foundation in the AWS Data Engineer exam’s security domain.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Authentication vs authorization; roles vs users', 'Least-privilege policies for pipelines', 'Policy evaluation, boundaries/SCPs & cross-account access'] },
        ],
      },
      interview: [
        { q: 'What is the difference between an IAM role and an IAM user?', a: 'A user is a persistent identity with long-lived credentials, meant for a specific person or app. A role has no long-lived credentials — a trusted principal (a service like Glue/EMR/Lambda, another account, or a federated user) temporarily assumes it and receives short-lived credentials. For data pipelines you almost always use roles so there are no static keys to leak, and permissions auto-expire.' },
        { q: 'Explain least privilege for a Glue job.', a: 'Give the job a dedicated role whose policy allows only the exact actions on the exact resources it needs — e.g. s3:GetObject/PutObject on its input/output prefixes, glue:GetTable/BatchCreatePartition on its databases, and kms:Decrypt on the specific key — rather than s3:* on all buckets. That way a bug or compromise in the job can only touch its own data.' },
      ],
    },
    {
      id: 'kms', name: 'AWS KMS', category: 'governance',
      aka: 'Key Management Service — encryption keys you control and audit',
      tagline: 'Managed encryption keys that protect data at rest across S3, Redshift, Glue and more — with key policies that decide who can decrypt, and CloudTrail records of every use.',
      keyFacts: [
        { k: 'Keys', v: 'AWS-managed, customer-managed (CMK)' },
        { k: 'Gate', v: 'Key policy + grants control decrypt' },
        { k: 'Pattern', v: 'Envelope encryption (data key)' },
        { k: 'Audit', v: 'Every key use logged to CloudTrail' },
      ],
      what: {
        lead: 'KMS creates and controls encryption keys. Services call KMS to encrypt/decrypt data keys (envelope encryption): the small data key encrypts the data, and KMS encrypts the data key with a key that never leaves the service.',
        bullets: [
          { h: 'Customer-managed keys', d: 'A CMK gives you a key policy, rotation, and the ability to revoke access — stronger control than the default AWS-managed key.' },
          { h: 'Key policy = the real gate', d: 'Even with S3 permissions, a principal that is not allowed kms:Decrypt on the key cannot read the (encrypted) object.' },
          { h: 'SSE-KMS', d: 'S3/Redshift/Glue reference a KMS key for server-side encryption; decryption is transparent to authorized callers.' },
        ],
      },
      why: {
        lead: 'Compliance and least-privilege demand that sensitive data be encrypted and that access to the keys be separately controlled and audited. KMS makes encryption the default while keeping a tight, logged perimeter around who can actually decrypt.',
        bullets: [
          { h: 'Separation of duties', d: 'A team can hold data in S3 yet be unable to read it without a decrypt grant on the key.' },
          { h: 'Revocable + auditable', d: 'Revoke a grant or disable a key to cut access instantly; CloudTrail shows every decrypt.' },
        ],
      },
      how: {
        lead: 'You create a CMK, write a key policy (and optional grants) listing which principals may encrypt/decrypt, and point services at it. For masking/PII you combine KMS encryption with column-level handling or tokenization.',
        bullets: [
          { h: 'Envelope encryption', d: 'KMS returns a plaintext + encrypted data key; the service encrypts bulk data with the plaintext key and stores the encrypted one alongside it.' },
          { h: 'Encryption in transit', d: 'TLS protects data on the wire; KMS protects it at rest — the exam tests both halves.' },
          { h: 'Rotation', d: 'Enable automatic annual key rotation on CMKs without re-encrypting existing data.' },
        ],
        code: { lang: 'text (S3 SSE-KMS)', text: 'PutObject ... \n  x-amz-server-side-encryption: aws:kms\n  x-amz-server-side-encryption-aws-kms-key-id: <cmk-arn>\n→ reader must also have kms:Decrypt on <cmk-arn>' },
      },
      deUseCase: {
        lead: 'DEA-C01\'s "ensure data encryption and masking" objective is exactly this: encrypt lake/warehouse data at rest with KMS, control decrypt via key policies, and understand at-rest vs in-transit — plus column masking for PII.',
        bullets: [
          { h: 'Encrypt the lake', d: 'SSE-KMS on S3 buckets; scoped kms:Decrypt grants to the pipeline roles that need the data.' },
          { h: 'PII handling', d: 'Pair KMS at-rest encryption with column masking / tokenization for sensitive fields.' },
        ],
      },
      integrations: [
        { id: 's3', label: 'Amazon S3', note: 'SSE-KMS at rest' },
        { id: 'redshift', label: 'Amazon Redshift', note: 'cluster/database encryption' },
        { id: 'iam', label: 'AWS IAM', note: 'key policy principals' },
        { id: 'glue-etl', label: 'Glue ETL', note: 'decrypts to process' },
      ],
      runtime: {
        lead: 'Each read of encrypted data triggers a KMS decrypt call authorized by the key policy; a role with S3 access but no kms:Decrypt fails with AccessDenied on the key, not the object — a classic troubleshooting trap.',
        bullets: [
          { h: 'Two permissions, not one', d: 'Reading SSE-KMS data needs both the S3 action and kms:Decrypt on the key.' },
          { h: 'Throttling', d: 'Very high-throughput jobs can hit KMS request limits; data-key caching reduces calls.' },
        ],
      },
      architecture: {
        lead: 'KMS manages encryption keys and performs cryptographic operations, with the key policy as the primary authorization gate. Bulk data uses envelope encryption: KMS vends a data key that the service uses locally, so the KMS key (CMK) never leaves KMS and large data scales without round-tripping bytes through KMS.',
        bullets: [
          { h: 'Key types', d: 'Customer-managed keys (CMK — you control policy/rotation), AWS-managed keys (per-service, auto), and AWS-owned keys. Mostly symmetric; asymmetric keys exist for sign/verify.' },
          { h: 'Envelope encryption', d: 'The service calls GenerateDataKey, encrypts data with the plaintext data key locally, and stores the KMS-encrypted data key with the data; decryption asks KMS to decrypt the data key, then decrypts locally.' },
          { h: 'Authorization', d: 'The key policy is the root of trust; IAM policies and grants add access. Using SSE-KMS data needs both the service action (e.g. s3:GetObject) AND kms:Decrypt on the key.' },
          { h: 'Rotation & scope', d: 'Automatic annual key rotation keeps the key id stable; multi-region keys replicate for cross-region workloads; a CloudHSM custom key store backs keys with dedicated HSMs.' },
        ],
      },
      security: {
        lead: 'KMS is the encryption-control service: the key policy and grants decide who can encrypt/decrypt, separately from data access — enabling separation of duties and auditable key use.',
        bullets: [
          { h: 'Key policy first', d: 'Every CMK has a key policy; without an allow there (or a grant), no IAM policy can use the key — a deliberate independent gate.' },
          { h: 'Separation of duties', d: 'A team can have S3 access but not kms:Decrypt, so they cannot read encrypted objects — the key owner controls decryption independently.' },
          { h: 'Grants for services', d: 'Grants give services temporary, scoped key use without broad key-policy edits.' },
          { h: 'Audit', d: 'Every KMS operation is logged in CloudTrail — who decrypted what, when — for compliance.' },
        ],
      },
      operations: {
        lead: 'Operating KMS is rotation, key-policy hygiene, and avoiding request throttling on high-throughput data jobs.',
        bullets: [
          { h: 'Rotation', d: 'Enable automatic rotation on CMKs; old key material is retained to decrypt existing data, and the key id/ARN stays constant.' },
          { h: 'Key-policy hygiene', d: 'Grant kms:Decrypt/Encrypt to exactly the roles that need it; avoid a wide-open key policy.' },
          { h: 'Throttling', d: 'KMS has per-key/account request limits; high-throughput jobs that decrypt per object can hit them — use data-key caching to cut calls.' },
          { h: 'Monitoring', d: 'CloudTrail + CloudWatch surface key usage and throttling (KMSThrottling).' },
        ],
      },
      cost: {
        lead: 'KMS bills per CMK per month plus per cryptographic request; AWS-managed keys and the free-tier requests cover light use, but high-throughput decryption (per-object) can run up request cost — data-key caching is the main lever. (Rates vary — price against the official KMS pricing page.)',
        bullets: [
          { h: 'Keys + requests', d: 'Each CMK has a monthly charge; Encrypt/Decrypt/GenerateDataKey calls are billed per request.' },
          { h: 'Data-key caching', d: 'Caching data keys (e.g. in the Encryption SDK) drastically cuts KMS calls on large/high-throughput jobs — both cost and throttling.' },
          { h: 'Managed vs CMK', d: 'AWS-managed keys avoid the per-key charge but give less control; use CMKs where policy/rotation/audit control matters.' },
        ],
      },
      walkthrough: {
        lead: 'How an SSE-KMS-encrypted S3 object is read — the two-permission path.',
        steps: [
          { h: 'Request the object', d: 'The role calls s3:GetObject on an SSE-KMS-encrypted object; S3 retrieves the ciphertext and the encrypted data key stored with it.' },
          { h: 'S3 asks KMS to decrypt the data key', d: 'S3 calls kms:Decrypt on the data key using the caller’s context; KMS checks the key policy + the caller’s permission.' },
          { h: 'Authorize', d: 'If the role has kms:Decrypt on that key (via key policy/IAM/grant), KMS returns the plaintext data key; otherwise AccessDenied — on the key, not the object.' },
          { h: 'Decrypt locally', d: 'S3 decrypts the object with the data key and returns plaintext to the caller; the CMK never left KMS.' },
          { h: 'Audit', d: 'The kms:Decrypt call is recorded in CloudTrail.' },
        ],
        note: 'Simplified envelope-encryption flow; the CMK stays inside KMS throughout.',
      },
      examples: [{
        title: 'Encrypt a lake bucket with SSE-KMS and grant a Glue role decrypt',
        requirement: 'Encrypt lake data with a customer-managed key and let only specific pipeline roles read it — separating data access from decryption rights.',
        input: 'An S3 lake bucket; a Glue job role; a CMK.',
        architecture: 'CMK (key policy) → S3 default SSE-KMS on the bucket → Glue role granted kms:Decrypt + s3:GetObject.',
        code: {
          lang: 'json (key policy stmt, illustrative)',
          text: "{\"Sid\":\"AllowGlueDecrypt\",\"Effect\":\"Allow\",\n \"Principal\":{\"AWS\":\"arn:aws:iam::ACCT:role/glue-ingest\"},\n \"Action\":[\"kms:Decrypt\",\"kms:GenerateDataKey\"],\n \"Resource\":\"*\"}\n// + bucket default encryption = aws:kms with this CMK\n// + the role's IAM policy grants s3:GetObject on the prefix",
        },
        steps: [
          'Create a CMK and set default SSE-KMS on the bucket.',
          'Grant the Glue role kms:Decrypt/GenerateDataKey in the key policy.',
          'Grant the role s3:GetObject/PutObject in IAM.',
          'Verify reads work only for authorized roles.',
        ],
        output: 'Lake data is encrypted at rest; only roles with both S3 and KMS permission can read it, with every decrypt audited.',
        validation: 'Confirm an authorized role reads objects; a role with S3 but no kms:Decrypt gets AccessDenied on the key; check CloudTrail.',
        errorHandling: 'AccessDenied on KMS (not S3) means the key policy/role lacks kms:Decrypt; enable data-key caching if KMS throttles.',
        production: 'Enable rotation; scope the key policy to needed roles; use data-key caching on high-throughput jobs; audit via CloudTrail.',
        cleanup: 'Remove the key-policy grants; schedule key deletion (with a waiting period) only when no data needs it.',
      }],
      troubleshooting: [
        {
          symptom: 'A role with full S3 access gets AccessDenied reading SSE-KMS objects.',
          evidence: 'The error references the KMS key (kms:Decrypt), not S3; the role lacks decrypt permission on the CMK.',
          causes: ['Role not granted kms:Decrypt in the key policy / IAM', 'Wrong CMK (object encrypted with a different key)', 'Cross-account key use without a grant'],
          investigation: ['Read whether the denied action is kms:Decrypt', 'Check the key policy + the role’s IAM for decrypt on that key', 'Confirm which CMK encrypted the object'],
          rootCause: 'SSE-KMS requires both S3 access and kms:Decrypt on the key; the key is an independent authorization gate.',
          remediation: ['Grant the role kms:Decrypt on the specific CMK (key policy and/or IAM)', 'For cross-account, add a grant/key-policy entry for the external principal', 'Point to the correct CMK'],
          validation: 'The role reads the objects; unauthorized roles still cannot decrypt.',
          prevention: 'Template key-policy grants alongside S3 grants for pipeline roles.',
        },
        {
          symptom: 'A high-throughput job slows or errors with KMS throttling (ThrottlingException).',
          evidence: 'KMSThrottling metrics spike; the job decrypts per object/record, hitting the per-key request limit.',
          causes: ['Per-object/per-record KMS calls exceeding the request limit', 'No data-key caching', 'Many parallel workers all calling KMS'],
          investigation: ['Check KMS request/throttle metrics', 'Count KMS calls per unit of data', 'Confirm whether caching is enabled'],
          rootCause: 'The job calls KMS far more often than needed because it does not cache data keys, exceeding the request limit.',
          remediation: ['Enable data-key caching (reuse a data key across many objects within policy limits)', 'Batch work to reduce distinct KMS calls', 'Request a limit increase for genuine high scale'],
          validation: 'KMS throttling stops and the job throughput recovers.',
          prevention: 'Use data-key caching on bulk/high-throughput encryption workloads by default.',
        },
      ],
      certMapping: {
        lead: 'KMS is the encryption-at-rest control in the AWS Data Engineer exam’s security domain.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Encryption at rest (SSE-KMS) for the lake/warehouse', 'Key policies & separation of duties', 'Envelope encryption & the S3+KMS two-permission model'] },
        ],
      },
      interview: [
        { q: 'Why might a role with full S3 read access still get AccessDenied on an object?', a: 'Because the object is encrypted with SSE-KMS and the role lacks kms:Decrypt on that key. S3 permissions let you fetch the ciphertext, but KMS separately authorizes decryption via the key policy. You fix it by granting the role kms:Decrypt on the specific CMK — which is also the point: the key policy is an independent gate for separation of duties.' },
        { q: 'What is envelope encryption?', a: 'Instead of sending bulk data to KMS, the service asks KMS for a data key, uses that key to encrypt the data locally, and stores the KMS-encrypted copy of the data key with the data. To read, it asks KMS to decrypt the data key, then decrypts the data. This keeps the master key inside KMS, scales to large data, and still centralizes control and auditing of access.' },
      ],
    },

    /* ── MONITORING & OPS (cert primitives) ─────────────────── */
    {
      id: 'cloudwatch', name: 'Amazon CloudWatch', category: 'ops',
      aka: 'Metrics, logs and alarms for every AWS pipeline',
      tagline: 'The observability layer for data pipelines: collect metrics and logs from Glue, EMR, Lambda and Step Functions, alarm on failures or latency, and trigger automated responses.',
      keyFacts: [
        { k: 'Signals', v: 'Metrics, Logs, Alarms, Events' },
        { k: 'DE use', v: 'Job failures, latency, cost signals' },
        { k: 'Action', v: 'Alarm → SNS / auto-remediation' },
        { k: 'Logs', v: 'Centralized Log Groups + Insights' },
      ],
      what: {
        lead: 'CloudWatch ingests metrics (numeric time series), logs (text streams in Log Groups), and fires alarms when a metric crosses a threshold. EventBridge (its event bus) routes service events to targets for event-driven automation.',
        bullets: [
          { h: 'Metrics & alarms', d: 'Track Glue job run time, Lambda errors, Kinesis iterator age; alarm and notify (SNS) or auto-remediate when they breach.' },
          { h: 'Logs & Insights', d: 'Pipeline logs land in Log Groups; Logs Insights queries them to find the failing stage or stack trace.' },
          { h: 'Dashboards', d: 'Compose metrics into a single operational view of pipeline health.' },
        ],
      },
      why: {
        lead: 'Pipelines fail quietly — a job slows, a stream backs up, a Lambda errors — and without metrics, logs and alarms you learn only when a dashboard is stale. CloudWatch is how you detect, diagnose and get paged on data-pipeline problems.',
        bullets: [
          { h: 'Detect before users do', d: 'Alarm on failure/latency/backlog so you act before the data is wrong downstream.' },
          { h: 'Diagnose fast', d: 'Centralized logs + Logs Insights turn "the job failed" into the exact cause.' },
        ],
      },
      how: {
        lead: 'Services publish metrics and logs automatically; you add alarms on the metrics that matter and wire alarm state changes to SNS or EventBridge for notification and automated response. For slow Glue/EMR jobs you pair CloudWatch metrics with the engine\'s own UI.',
        bullets: [
          { h: 'Iterator age', d: 'A rising Kinesis GetRecords.IteratorAge means consumers are falling behind — the canonical streaming-lag alarm.' },
          { h: 'EventBridge rules', d: 'Route "job failed" / "object created" events to Lambda, Step Functions or SNS for event-driven ops.' },
          { h: 'Retention & cost', d: 'Set Log Group retention so logs do not accumulate cost forever.' },
        ],
        code: { lang: 'text (alarm)', text: 'ALARM  GlueJobFailures >= 1 over 5 min\n   → SNS topic "data-oncall"\nALARM  Kinesis IteratorAge > 60s\n   → scale consumers / page' },
      },
      deUseCase: {
        lead: 'DEA-C01\'s "maintain and monitor data pipelines" objective: emit metrics/logs/alarms, handle failures and retries, and troubleshoot slow Glue/EMR jobs — CloudWatch is the service the exam means by "monitoring".',
        bullets: [
          { h: 'Pipeline health', d: 'Alarm on Step Functions/Glue failures → SNS to on-call.' },
          { h: 'Troubleshoot slow jobs', d: 'Correlate CloudWatch metrics with the Spark/EMR UI to find the bottleneck stage.' },
        ],
      },
      integrations: [
        { id: 'glue-etl', label: 'Glue ETL', note: 'job metrics + logs' },
        { id: 'step-functions', label: 'Step Functions', note: 'execution events + alarms' },
        { id: 'lambda', label: 'AWS Lambda', note: 'errors, duration, throttles' },
        { id: 'cloudtrail', label: 'CloudTrail', note: 'audit events into Logs' },
      ],
      runtime: {
        lead: 'Metrics arrive at 1-minute (or high-resolution) granularity; alarms evaluate over configurable periods, so overly tight windows cause false pages and overly loose ones delay detection. Log ingestion and storage carry cost, so retention matters.',
        bullets: [
          { h: 'Alarm tuning', d: 'Pick evaluation periods and datapoints-to-alarm that balance noise vs latency.' },
          { h: 'Cost control', d: 'Retention policies + metric filters keep logging spend in check.' },
        ],
      },
      architecture: {
        lead: 'CloudWatch collects metrics (numeric time series in namespaces/dimensions), logs (text in Log Groups/Streams), and fires alarms on metrics; EventBridge routes service events for automation. Most AWS services publish metrics/logs automatically; you add custom metrics, alarms, filters and dashboards on top.',
        bullets: [
          { h: 'Metrics', d: 'Standard (1-min) or high-resolution; custom metrics via PutMetricData or the Embedded Metric Format (EMF) from logs; namespaces + dimensions organize them.' },
          { h: 'Logs & filters', d: 'Log Groups hold pipeline logs; metric filters turn log patterns into metrics, subscription filters stream logs elsewhere, and Logs Insights queries them for the failing stage.' },
          { h: 'Alarms', d: 'Static-threshold, anomaly-detection, or composite alarms; alarm state changes trigger actions (SNS, EventBridge, auto scaling).' },
          { h: 'Events (EventBridge)', d: 'Service events (job failed, object created) route to Lambda/Step Functions/SNS for event-driven ops and remediation.' },
        ],
      },
      security: {
        lead: 'CloudWatch access is IAM-controlled for publishing/reading metrics and logs; log groups can be KMS-encrypted; cross-account observability centralizes monitoring.',
        bullets: [
          { h: 'IAM', d: 'Scope who can PutMetricData, read logs, and change alarms; services publish under their own roles.' },
          { h: 'Log encryption', d: 'Encrypt Log Groups with KMS; restrict read access since logs can contain sensitive data.' },
          { h: 'Cross-account', d: 'Cross-account observability aggregates metrics/logs into a monitoring account without copying credentials.' },
          { h: 'Least exposure', d: 'Avoid logging secrets/PII; use metric filters rather than retaining verbose sensitive logs.' },
        ],
      },
      operations: {
        lead: 'Operating CloudWatch is choosing the right signals/alarms, wiring actions, and controlling log retention/cost.',
        bullets: [
          { h: 'Right signals', d: 'Alarm on what matters per service: Glue/Step Functions failures, Lambda Errors/Throttles, Kinesis IteratorAge, job duration for slow-detection.' },
          { h: 'Alarm actions & missing data', d: 'Route alarms to SNS/EventBridge; set the treat-missing-data behavior so a metric that stops emitting does not silently hide a failure.' },
          { h: 'Retention & cost', d: 'Set Log Group retention (logs default to never-expire) and avoid over-verbose logging to control ingestion/storage cost.' },
          { h: 'Diagnosis', d: 'Logs Insights turns "the job failed" into the exact stack trace/step; pair metrics with the Spark/EMR UI for slow jobs.' },
        ],
      },
      cost: {
        lead: 'CloudWatch bills for custom metrics, alarms, dashboards, logs ingestion + storage, and Logs Insights queries. Logs ingestion and never-expiring retention are the usual surprises. (Rates vary — price against the official CloudWatch pricing page.)',
        bullets: [
          { h: 'Logs', d: 'Ingestion (per GB) + storage (retention) dominate; set retention and trim verbose logs.' },
          { h: 'Metrics & alarms', d: 'Custom metrics and alarms are billed per unit; high-resolution metrics cost more — use them only where needed.' },
          { h: 'Insights queries', d: 'Logs Insights bills by data scanned — scope time ranges and filters.' },
        ],
      },
      walkthrough: {
        lead: 'How a pipeline failure becomes a page and a diagnosis.',
        steps: [
          { h: 'Metric emitted', d: 'Glue/Step Functions publishes a failure metric (and duration) to CloudWatch automatically.' },
          { h: 'Alarm evaluates', d: 'A CloudWatch alarm on the failure metric breaches its threshold (with treat-missing-data configured so a stalled metric is not ignored).' },
          { h: 'Action fires', d: 'The alarm state change notifies an SNS topic (pages on-call) and/or triggers an EventBridge rule to a remediation Lambda.' },
          { h: 'Diagnose via logs', d: 'On-call opens the Log Group and runs a Logs Insights query to find the failing step/stack trace.' },
          { h: 'Resolve & confirm', d: 'After the fix, the metric recovers and the alarm returns to OK.' },
        ],
        note: 'Simplified; exact metrics/events depend on the services in the pipeline.',
      },
      examples: [{
        title: 'Alarm on Glue + Step Functions failures with Logs Insights diagnosis',
        requirement: 'Get paged when the pipeline fails and quickly find the cause, without over-retaining logs.',
        input: 'Glue jobs and a Step Functions state machine emitting metrics/logs.',
        architecture: 'Glue/SFN metrics → CloudWatch alarms → SNS (on-call); logs → Log Group (retention set) → Logs Insights.',
        code: {
          lang: 'text / logs-insights (illustrative)',
          text: "ALARM glue_failures >= 1 (5m), treat-missing-data=breaching -> SNS data-oncall\nALARM sfn_ExecutionsFailed >= 1 (5m) -> SNS data-oncall\n\n-- Logs Insights: find the failing step\nfields @timestamp, @message\n| filter @message like /ERROR|Exception/\n| sort @timestamp desc | limit 20",
        },
        steps: [
          'Create alarms on Glue/Step Functions failure metrics → SNS.',
          'Set treat-missing-data so a stalled metric still alerts.',
          'Set Log Group retention to a sensible window.',
          'Use a saved Logs Insights query to find failures fast.',
        ],
        output: 'On-call is paged on failures and can pinpoint the cause in seconds, with bounded log cost.',
        validation: 'Force a failure and confirm the page fires and the Insights query surfaces the error; verify retention is applied.',
        errorHandling: 'treat-missing-data=breaching prevents a stopped metric from hiding an outage; composite alarms reduce noise.',
        production: 'Encrypt log groups; avoid logging secrets; tune retention; use composite alarms to cut alert fatigue.',
        cleanup: 'Delete alarms, dashboards, and Log Groups when decommissioning.',
      }],
      troubleshooting: [
        {
          symptom: 'The CloudWatch Logs bill grows steadily and surprises the team.',
          evidence: 'Log Groups have no retention (never-expire) and/or very verbose logging; ingestion GB is high.',
          causes: ['Default never-expire retention accumulating logs forever', 'Over-verbose DEBUG logging in production', 'Insights queries over huge unfiltered ranges'],
          investigation: ['Check Log Group retention settings and stored bytes', 'Review log verbosity', 'Look at Insights query scan volume'],
          rootCause: 'Logs ingestion + indefinite retention accumulate cost; CloudWatch does not expire logs unless you set retention.',
          remediation: ['Set retention on all Log Groups', 'Reduce log verbosity / sample in prod', 'Scope Insights queries by time/filter'],
          validation: 'Stored bytes and ingestion stabilize; the bill flattens.',
          prevention: 'Set retention at Log Group creation (IaC) and keep prod logging at the right level.',
        },
        {
          symptom: 'A real failure happened but no alarm fired.',
          evidence: 'The alarm is on the wrong metric/statistic, or the metric stopped emitting and treat-missing-data=notBreaching hid it.',
          causes: ['Alarm on an unsuitable metric/statistic/period', 'Metric not emitted (job did not run) with treat-missing-data=missing/notBreaching', 'Threshold set so it never triggers'],
          investigation: ['Verify which metric/statistic/period the alarm uses', 'Check the treat-missing-data setting', 'Confirm the metric is actually published when the failure occurs'],
          rootCause: 'The alarm did not reflect the failure condition — wrong metric, or missing-data handling that treats "no data" as healthy.',
          remediation: ['Alarm on the correct failure metric/statistic', 'Set treat-missing-data=breaching for "job must run" metrics', 'Add a composite/heartbeat alarm for absence of runs'],
          validation: 'A simulated failure (including a missed run) now triggers the alarm.',
          prevention: 'Review alarm metric + missing-data semantics; alert on absence as well as failure.',
        },
      ],
      certMapping: {
        lead: 'CloudWatch is the monitoring/observability service in the AWS Data Engineer exam’s maintain-and-monitor domain.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Monitor pipelines (metrics/logs/alarms)', 'Failure alerting & event-driven remediation', 'Troubleshoot slow jobs; control log cost'] },
        ],
      },
      interview: [
        { q: 'How would you monitor a Glue/Step Functions pipeline and get alerted on failures?', a: 'Glue and Step Functions publish metrics and logs to CloudWatch automatically. I create CloudWatch alarms on the failure metrics (and on duration/latency for slow-job detection), wire alarm state changes to an SNS topic for paging, and optionally use an EventBridge rule on the "execution failed" event to trigger an automated retry or remediation Lambda. Logs go to a Log Group that I query with Logs Insights to find the failing step.' },
        { q: 'A streaming consumer is falling behind — which CloudWatch signal tells you, and what do you do?', a: 'The Kinesis GetRecords.IteratorAge metric rising means consumers are lagging the stream. I alarm on it, then scale out consumers (more shards/parallelism), check for a slow downstream write or a poison record, and confirm the lag drops. It is the standard streaming back-pressure signal.' },
      ],
    },
    {
      id: 'cloudtrail', name: 'AWS CloudTrail', category: 'governance',
      aka: 'The audit log of who did what in your AWS account',
      tagline: 'Records every API call across AWS — the governance and audit trail the DE exam expects for data access, compliance, and forensic "who touched this?" questions.',
      keyFacts: [
        { k: 'Captures', v: 'API calls (management + data events)' },
        { k: 'Answers', v: 'Who, what, when, from where' },
        { k: 'Target', v: 'S3 (+ CloudWatch Logs) for analysis' },
        { k: 'DE use', v: 'Audit, compliance, forensics' },
      ],
      what: {
        lead: 'CloudTrail logs API activity in the account: management events (control-plane actions like creating a role or bucket) and optional data events (object-level S3 reads/writes, Lambda invokes). Each record has the identity, action, time, source IP and parameters.',
        bullets: [
          { h: 'Management vs data events', d: 'Management events are on by default; S3 object-level data events are opt-in because they are high-volume.' },
          { h: 'Durable trail', d: 'Deliver events to an S3 bucket (and CloudWatch Logs) for long-term retention and querying.' },
          { h: 'Account-wide', d: 'An organization trail captures every account from one place.' },
        ],
      },
      why: {
        lead: 'Governance and compliance require a tamper-evident answer to "who accessed this data, and when?". CloudTrail is that record — distinct from CloudWatch (operational health): CloudTrail is for audit and forensics, CloudWatch is for metrics and alarms.',
        bullets: [
          { h: 'Audit & compliance', d: 'Prove access controls work and produce evidence for auditors.' },
          { h: 'Forensics', d: 'Reconstruct exactly which principal read or changed a dataset during an incident.' },
        ],
      },
      how: {
        lead: 'Enable a trail that delivers to a locked-down S3 bucket; turn on S3 data events for sensitive prefixes; query the logs with Athena, or stream to CloudWatch Logs to alarm on specific actions. Pair with Lake Formation/Macie for governance.',
        bullets: [
          { h: 'Query with Athena', d: 'CloudTrail logs in S3 become a queryable table — "show every GetObject on the PII prefix last week".' },
          { h: 'Alert on sensitive actions', d: 'Send to CloudWatch Logs and alarm on, e.g., policy changes or access to a restricted bucket.' },
          { h: 'Protect the trail', d: 'Lock the log bucket (least privilege + object lock) so the audit record cannot be altered.' },
        ],
        code: { lang: 'text (event shape)', text: 'eventTime, userIdentity.arn, eventName=GetObject,\n  requestParameters.bucketName, sourceIPAddress\n→ delivered to s3://audit-logs/  → queried in Athena' },
      },
      deUseCase: {
        lead: 'DEA-C01\'s "prepare logs for audit and ensure governance" objective: audit logging, lineage/compliance, and PII access tracking. CloudTrail is the audit source; CloudWatch handles operational monitoring.',
        bullets: [
          { h: 'Data access audit', d: 'S3 data events + Athena to answer who read which dataset.' },
          { h: 'Governance stack', d: 'CloudTrail (audit) + Lake Formation (grants) + Macie (PII discovery).' },
        ],
      },
      integrations: [
        { id: 's3', label: 'Amazon S3', note: 'trail destination + data events' },
        { id: 'athena', label: 'Amazon Athena', note: 'query the audit logs' },
        { id: 'cloudwatch', label: 'CloudWatch', note: 'alarm on sensitive actions' },
        { id: 'lake-formation', label: 'Lake Formation', note: 'governance partner' },
      ],
      runtime: {
        lead: 'Management events are low-volume and near-free; S3 data events can be very high-volume, so enable them selectively on sensitive prefixes to control cost. Delivery to S3 has a short lag, so CloudTrail is for audit, not real-time alerting.',
        bullets: [
          { h: 'Scope data events', d: 'Turn object-level logging on only where you need it to avoid cost blow-ups.' },
          { h: 'Not real-time', d: 'Use CloudWatch for immediate alarms; CloudTrail for the durable record.' },
        ],
      },
      architecture: {
        lead: 'CloudTrail records AWS API activity as events. Management events (control-plane calls) are captured by default and the first copy is free; data events (object-level, e.g. S3 GetObject) are high-volume and opt-in; Insights events flag unusual activity. A trail delivers events durably to S3 (and optionally CloudWatch Logs); CloudTrail Lake offers a queryable event store.',
        bullets: [
          { h: 'Event types', d: 'Management (who changed what configuration), data (who read/wrote which object/row — opt-in, high volume), and Insights (anomalous call-rate detection).' },
          { h: 'Trails & scope', d: 'Multi-region and organization trails capture across regions/accounts; delivery goes to a (locked-down) S3 bucket, optionally mirrored to CloudWatch Logs for alarms.' },
          { h: 'Integrity', d: 'Log-file integrity validation (digest files) proves the audit log was not tampered with — important for compliance.' },
          { h: 'Querying', d: 'Query delivered logs with Athena, or use CloudTrail Lake (an immutable, SQL-queryable event store) for investigations.' },
        ],
      },
      security: {
        lead: 'CloudTrail is an audit service, so protecting the trail itself is the point: a locked-down, encrypted destination, integrity validation, and broad-but-least-exposed coverage.',
        bullets: [
          { h: 'Protect the trail bucket', d: 'Deliver to a dedicated, access-restricted S3 bucket (ideally a separate security account) with a bucket policy that blocks tampering; enable SSE-KMS.' },
          { h: 'Integrity validation', d: 'Enable log-file validation so you can prove events were not altered or deleted.' },
          { h: 'Org-wide coverage', d: 'An organization multi-region trail ensures no account/region escapes auditing.' },
          { h: 'Least exposure', d: 'Restrict who can read the audit logs and who can stop/modify trails.' },
        ],
      },
      operations: {
        lead: 'Operating CloudTrail is scoping data events for cost, ensuring full coverage, querying for investigations, and remembering it is not real-time.',
        bullets: [
          { h: 'Scope data events', d: 'Object-level logging is high-volume — enable it selectively on sensitive buckets/prefixes to avoid cost blow-ups.' },
          { h: 'Coverage', d: 'Use a multi-region org trail so new regions/accounts are covered automatically; verify delivery is healthy.' },
          { h: 'Querying', d: 'Athena over the trail bucket (or CloudTrail Lake) answers "who did/read X, when"; event history gives the last 90 days without a trail.' },
          { h: 'Not real-time', d: 'Delivery has a short lag — use CloudWatch for immediate alarms; CloudTrail is the durable record (you can also route to CW Logs to alarm on sensitive actions).' },
        ],
      },
      cost: {
        lead: 'Management events’ first copy is free; additional copies, data events, and Insights events are billed per event, and CloudTrail Lake bills ingestion/storage/query. Data events on everything are the classic cost blow-up. (Rates vary — price against the official CloudTrail pricing page.)',
        bullets: [
          { h: 'Management ~free', d: 'The first trail’s management events are free; extra trails/copies add cost.' },
          { h: 'Data events', d: 'Object-level events are billed per event and can be enormous — scope them to sensitive resources only.' },
          { h: 'Lake & storage', d: 'CloudTrail Lake and S3 storage of logs add cost; set S3 lifecycle on the trail bucket.' },
        ],
      },
      walkthrough: {
        lead: 'How an audit question ("who read this dataset?") is answered end to end.',
        steps: [
          { h: 'Enable data events', d: 'Turn on S3 data events for the sensitive bucket/prefix on a multi-region trail (management events are already on).' },
          { h: 'Events recorded', d: 'Each GetObject/PutObject on that prefix is recorded with principal, time, source IP, and resource.' },
          { h: 'Deliver durably', d: 'Events are delivered to the locked-down, encrypted trail S3 bucket (integrity-validated).' },
          { h: 'Query', d: 'Run Athena over the trail (or CloudTrail Lake SQL) filtering on the resource + time range to list who accessed it.' },
          { h: 'Act / report', d: 'Produce the access report for compliance, or alarm on sensitive actions via CloudWatch Logs.' },
        ],
        note: 'Simplified; delivery has a short lag, so this is audit/forensics, not real-time alerting.',
      },
      examples: [{
        title: 'Answer "who read this sensitive dataset last month?" with S3 data events',
        requirement: 'Prove exactly which principals read a sensitive S3 prefix over a time range, for a compliance request.',
        input: 'A sensitive S3 prefix; a multi-region CloudTrail trail delivering to a secure bucket.',
        architecture: 'S3 data events (sensitive prefix) → CloudTrail → secure S3 trail bucket → Athena query.',
        code: {
          lang: 'sql (athena over cloudtrail, illustrative)',
          text: "SELECT useridentity.arn AS who, sourceipaddress, eventtime,\n       requestparameters\nFROM cloudtrail_logs\nWHERE eventname = 'GetObject'\n  AND requestparameters LIKE '%shopkart-lake/silver/pii/%'\n  AND eventtime BETWEEN '2026-09-01' AND '2026-10-01'\nORDER BY eventtime;",
        },
        steps: [
          'Enable S3 data events on the sensitive prefix (multi-region trail).',
          'Deliver to a locked-down, encrypted trail bucket with integrity validation.',
          'Query with Athena filtering resource + time range.',
          'Produce the principal/IP/time access report.',
        ],
        output: 'A precise list of who read the dataset, when, and from where — defensible for audit.',
        validation: 'Confirm a test read appears in the query results; verify log-file integrity validation passes.',
        errorHandling: 'If reads are missing, data events were not enabled for that prefix (or before the read); scope events to control cost.',
        production: 'Keep the trail bucket in a separate security account, SSE-KMS encrypted, with validation on; scope data events to sensitive resources.',
        cleanup: 'Disable the data events and lifecycle-expire old trail logs when no longer required.',
      }],
      troubleshooting: [
        {
          symptom: 'CloudTrail costs spike unexpectedly.',
          evidence: 'Billing shows a surge in data events; object-level logging was enabled broadly (e.g. all S3 buckets) on a high-traffic lake.',
          causes: ['S3 data events enabled on everything, not just sensitive prefixes', 'Multiple redundant trails copying the same events', 'Insights events on very high call volumes'],
          investigation: ['Check which resources have data events enabled', 'Count trails and overlap', 'Review data-event volume by resource'],
          rootCause: 'Data events are billed per event and are enormous on busy buckets; blanket object-level logging drives the cost.',
          remediation: ['Scope data events to sensitive buckets/prefixes only', 'Consolidate to one org multi-region trail', 'Limit Insights events to where needed'],
          validation: 'Data-event volume and cost drop while sensitive resources stay audited.',
          prevention: 'Enable data events selectively by design; one org trail; monitor data-event volume.',
        },
        {
          symptom: 'An investigation finds no audit record of an access that definitely happened.',
          evidence: 'Management events exist but the object-level read is absent; data events were not enabled for that resource, or the trail did not cover that region/account, or you only used 90-day event history.',
          causes: ['Data events not enabled for that resource (reads are not in management events)', 'Trail not multi-region/org, missing that region/account', 'Relying on 90-day event history for an older period with no trail'],
          investigation: ['Check whether data events were enabled for the resource/time', 'Verify trail region/account coverage', 'Confirm whether a durable trail (vs event history) existed then'],
          rootCause: 'The event was never captured — object-level reads need data events, and coverage/retention must include the time/region.',
          remediation: ['Enable data events on sensitive resources going forward', 'Use an org multi-region trail for full coverage', 'Retain trail logs in S3 beyond the 90-day event-history window'],
          validation: 'New accesses to the resource are recorded and queryable for the required retention.',
          prevention: 'Stand up an org multi-region trail with scoped data events and long retention before you need it.',
        },
      ],
      certMapping: {
        lead: 'CloudTrail is the audit/governance service in the AWS Data Engineer exam’s security/compliance domain.',
        items: [
          { label: 'AWS DEA-C01 (Data Engineer Associate)', certId: 'aws-dea-c01', objectives: ['Audit data/API access (CloudTrail vs CloudWatch)', 'Data events for sensitive-data access', 'Querying audit logs & protecting the trail'] },
        ],
      },
      interview: [
        { q: 'CloudTrail vs CloudWatch — when do you use each?', a: 'CloudTrail is the audit log of API activity: who called what, when, from where — used for governance, compliance and forensics. CloudWatch is operational observability: metrics, logs and alarms about how your pipelines are performing and whether they failed. In a data platform you use CloudTrail to prove and investigate data access, and CloudWatch to detect and get paged on pipeline health issues. They are complementary, not interchangeable.' },
        { q: 'How would you answer "who read this sensitive dataset last month?"', a: 'Enable CloudTrail S3 data events on that bucket/prefix so object-level GetObject calls are recorded, deliver the trail to a locked-down S3 bucket, and query it with Athena filtering on the resource and time range to list the principals and source IPs. For ongoing governance I would combine that with Lake Formation grants and Macie for PII discovery.' },
      ],
    },
  ];

  TV.AwsServices = AWS_SERVICES;
})();
