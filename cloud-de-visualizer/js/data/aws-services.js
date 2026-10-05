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
      interview: [
        { q: 'What is the difference between full load and CDC in DMS?', a: 'Full load is a one-time bulk copy of the existing data from source to target. CDC (change data capture) continuously reads the source’s transaction log and applies subsequent inserts, updates, and deletes to keep the target in sync. The common mode is "full load and CDC": DMS first snapshots the current data, then streams ongoing changes — enabling migrations and continuous replication with minimal source downtime. CDC is also lighter on the source than repeated queries because it reads the log rather than scanning tables.' },
        { q: 'How would you use DMS to feed a data lake with change data?', a: 'Configure a full-load-and-CDC task with the operational database as source and S3 as target, writing changes as Parquet (with the CDC operation flag per row). DMS lands the initial snapshot plus a continuous stream of change records into a raw/CDC prefix. A Glue or Spark job then MERGEs those change records into Silver Delta/Iceberg tables, applying inserts/updates/deletes so the analytics table stays current. This is a standard CDC-to-lakehouse pattern.' },
        { q: 'What does DMS need from the source database for CDC, and what causes replication lag?', a: 'CDC requires access to the source’s transaction log with the right settings — e.g. binary logging on MySQL, supplemental logging/redo on Oracle, logical replication on PostgreSQL — plus a user with permission to read it. Lag (the target trailing the source) typically grows from an undersized replication instance, high change volume or large/long transactions, LOB handling overhead, or a slow target. You address it by scaling the replication instance, tuning LOB and parallel-apply settings, and monitoring the source/target latency metrics.' },
      ],
    },
  ];

  TV.AwsServices = AWS_SERVICES;
})();
