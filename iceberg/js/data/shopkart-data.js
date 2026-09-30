/* ============================================================
   ShopKart Data — primary source of truth from the handbook
   All metadata structures, JSON, SQL, and examples are
   drawn directly from the Apache Iceberg Engineering Handbook.
   ============================================================ */

window.IcebergViz = window.IcebergViz || {};

window.IcebergViz.Data = {

  // ── ShopKart Business Context ─────────────────────────────
  shopkart: {
    company: 'ShopKart Global E-Commerce',
    stats: {
      customers: '50 million',
      ordersPerDay: '20 million',
      dataPerDay: '8 TB',
      historicalData: '6 PB',
      countries: 30,
      sources: 15,
    },
    description: 'Multinational e-commerce company operating in 30 countries. All data volumes are representative of Tier-1 production systems.',
    incidents: [
      {
        id: 'SK-2022-1847',
        title: 'Black Friday Data Corruption',
        problem: 'No ACID Transactions',
        description: 'Two Spark jobs writing simultaneously corrupted the table. ShopKart lost 4 hours of Black Friday order data because two pipeline jobs both wrote to the same partition.',
        date: '2022-11-25',
        severity: 'critical',
        resolution: 'Iceberg snapshot isolation prevents this — each writer creates an independent snapshot that is committed atomically.',
      },
      {
        id: 'SK-2023-0412',
        title: 'Schema Change Outage (11 hours)',
        problem: 'No Schema Evolution',
        description: 'Adding the "fulfilment_status" column required rewriting 847 files. The rewrite job ran for 11 hours and the table was unreadable during that time.',
        date: '2023-02-08',
        severity: 'high',
        resolution: 'Iceberg ALTER TABLE ADD COLUMN completes in milliseconds — no data rewrite required.',
      },
      {
        id: 'SK-2023-0908',
        title: 'Query Planning 23-Minute Delay',
        problem: 'O(n) Partition Discovery',
        description: 'Listing 6 PB across 40 million S3 objects took 23 minutes before a query could even start. Every query began with a full metadata scan.',
        date: '2023-04-15',
        severity: 'high',
        resolution: 'Iceberg metadata pruning: planning reads manifest list statistics, skipping irrelevant manifests in a single metadata read.',
      },
      {
        id: 'SK-2022-2201',
        title: 'Unrecoverable Analyst Mistake',
        problem: 'No Time Travel',
        description: 'When an analyst accidentally overwrote the Germany orders partition, the data was unrecoverable. There was no snapshot history.',
        date: '2022-08-03',
        severity: 'critical',
        resolution: 'Iceberg rollback_to_snapshot completes in seconds — just a metadata pointer change.',
      },
      {
        id: 'SK-2024-0115',
        title: 'Wrong Athena Aggregates',
        problem: 'Reader-Writer Conflicts',
        description: 'Spark streaming writes new files while Athena reads. Athena reads a partial commit and returns wrong aggregates. No isolation guarantees.',
        date: '2024-01-15',
        severity: 'medium',
        resolution: 'Iceberg readers always read a committed snapshot, never partial writes.',
      },
    ],
  },

  // ── S3 Layout ─────────────────────────────────────────────
  s3Layout: {
    bucket: 's3://shopkart-lakehouse',
    warehousePath: '/warehouse/prod/orders',
    metadataFiles: [
      { name: 'v1-a1b2c3.metadata.json', label: 'v1 (empty table)', type: 'metadata', active: false, size: '2.1 KB' },
      { name: 'v2-d4e5f6.metadata.json', label: 'v2 (first INSERT)', type: 'metadata', active: false, size: '18.4 KB' },
      { name: 'v3-e5f6g7.metadata.json', label: 'v3 (schema change)', type: 'metadata', active: false, size: '24.2 KB' },
      { name: 'v4-f6g7h8.metadata.json', label: 'v4 (partition evolution)', type: 'metadata', active: false, size: '31.7 KB' },
      { name: 'v12-a3f8bc.metadata.json', label: 'v12 (current)', type: 'metadata', active: true, size: '142.8 KB' },
      { name: 'snap-8922019143787970520-1-a3f8bc.avro', label: 'manifest-list (current)', type: 'manifest-list', active: true, size: '10.3 KB' },
      { name: 'snap-3051729675574597004-1-b4c9de.avro', label: 'manifest-list (previous)', type: 'manifest-list', active: false, size: '9.8 KB' },
      { name: 'a1b2c3d4-manifest.avro', label: 'manifest: BR 2024-11-29', type: 'manifest', active: true, size: '4.2 MB' },
      { name: 'e5f6g7h8-manifest.avro', label: 'manifest: US 2024-11-29', type: 'manifest', active: true, size: '18.7 MB' },
      { name: 'i9j0k1l2-manifest.avro', label: 'manifest: DE 2024-11-29', type: 'manifest', active: true, size: '2.1 MB' },
    ],
    dataPartitions: [
      {
        name: 'order_date_day=2024-11-29',
        children: [
          { name: 'country_code=BR', files: 3, totalSize: '403 MB' },
          { name: 'country_code=US', files: 389, totalSize: '48.2 GB' },
          { name: 'country_code=DE', files: 47, totalSize: '5.9 GB' },
        ],
      },
      {
        name: 'order_date_day=2024-11-28',
        children: [
          { name: 'country_code=BR', files: 2, totalSize: '281 MB' },
          { name: 'country_code=US', files: 412, totalSize: '51.1 GB' },
        ],
      },
    ],
  },

  // ── metadata.json (current v12) ───────────────────────────
  metadataJson: {
    filename: 'v12-a3f8bc.metadata.json',
    content: {
      "format-version": 2,
      "table-uuid": "b55d9dda-6561-423a-8bfc-8be6f4b0cf9e",
      "location": "s3://shopkart-lakehouse/warehouse/prod/orders",
      "last-sequence-number": 47,
      "last-updated-ms": 1701388800000,
      "last-column-id": 18,
      "current-schema-id": 3,
      "schemas": [
        {
          "schema-id": 0,
          "type": "struct",
          "fields": [
            { "id": 1, "name": "order_id", "type": "long", "required": true },
            { "id": 2, "name": "customer_id", "type": "long", "required": true },
            { "id": 3, "name": "order_date", "type": "date", "required": true },
            { "id": 4, "name": "total_amount", "type": "double", "required": false }
          ]
        },
        {
          "schema-id": 3,
          "type": "struct",
          "fields": [
            { "id": 1,  "name": "order_id",          "type": "long",        "required": true },
            { "id": 2,  "name": "customer_id",       "type": "long",        "required": true },
            { "id": 3,  "name": "order_date",        "type": "date",        "required": true },
            { "id": 4,  "name": "order_timestamp",   "type": "timestamptz", "required": true },
            { "id": 5,  "name": "country_code",      "type": "string",      "required": true },
            { "id": 6,  "name": "total_amount",      "type": "decimal(12,2)","required": false },
            { "id": 7,  "name": "currency_code",     "type": "string",      "required": false },
            { "id": 8,  "name": "payment_method",    "type": "string",      "required": false },
            { "id": 9,  "name": "fulfilment_status", "type": "string",      "required": false },
            { "id": 10, "name": "warehouse_id",      "type": "int",         "required": false },
            { "id": 11, "name": "is_express",        "type": "boolean",     "required": false },
            { "id": 12, "name": "last_updated_ts",   "type": "timestamptz", "required": false }
          ]
        }
      ],
      "current-partition-spec": 1,
      "partition-specs": [
        {
          "spec-id": 0,
          "fields": [
            { "source-id": 3, "field-id": 1000, "transform": "year",  "name": "order_date_year" },
            { "source-id": 3, "field-id": 1001, "transform": "month", "name": "order_date_month" }
          ]
        },
        {
          "spec-id": 1,
          "fields": [
            { "source-id": 3, "field-id": 1002, "transform": "day",      "name": "order_date_day" },
            { "source-id": 5, "field-id": 1003, "transform": "identity", "name": "country_code" }
          ]
        }
      ],
      "current-snapshot-id": 8922019143787970520,
      "refs": {
        "main": {
          "snapshot-id": 8922019143787970520,
          "type": "branch"
        },
        "q4_2024_close": {
          "snapshot-id": 3051729675574597004,
          "type": "tag",
          "max-ref-age-ms": 220752000000
        }
      },
      "snapshots": [
        {
          "snapshot-id": 3051729675574597004,
          "sequence-number": 43,
          "timestamp-ms": 1701302400000,
          "summary": {
            "operation": "append",
            "added-data-files": "1847",
            "added-records": "18473921",
            "total-records": "84581894048"
          },
          "manifest-list": "s3://shopkart-lakehouse/warehouse/prod/orders/metadata/snap-3051729675574597004-1-b4c9de.avro"
        },
        {
          "snapshot-id": 8922019143787970520,
          "parent-snapshot-id": 3051729675574597004,
          "sequence-number": 47,
          "timestamp-ms": 1701388800000,
          "summary": {
            "operation": "append",
            "added-data-files": "384",
            "added-records": "1847293",
            "added-files-size": "12847362918",
            "changed-partition-count": "28",
            "total-records": "86429187341",
            "total-files-size": "6291456000000"
          },
          "manifest-list": "s3://shopkart-lakehouse/warehouse/prod/orders/metadata/snap-8922019143787970520-1-a3f8bc.avro"
        }
      ],
      "properties": {
        "table.comment": "ShopKart production orders table",
        "write.target-file-size-bytes": "134217728",
        "write.distribution-mode": "hash",
        "write.parquet.compression-codec": "zstd",
        "history.expire.max-snapshot-age-ms": "604800000",
        "history.expire.min-snapshots-to-keep": "5"
      }
    }
  },

  // ── Manifest List Entry ───────────────────────────────────
  manifestListEntry: {
    filename: 'snap-8922019143787970520-1-a3f8bc.avro',
    description: 'Lists all manifest files for snapshot 8922019143787970520.',
    entries: [
      {
        "manifest-path": "s3://shopkart-lakehouse/warehouse/prod/orders/metadata/a1b2c3d4-manifest.avro",
        "manifest-length": 4392518,
        "partition-spec-id": 1,
        "added-snapshot-id": 8922019143787970520,
        "added-data-files-count": 3,
        "existing-data-files-count": 0,
        "deleted-data-files-count": 0,
        "partitions": [
          { "contains-null": false, "lower-bound": "2024-11-29", "upper-bound": "2024-11-29" },
          { "contains-null": false, "lower-bound": "BR",         "upper-bound": "BR" }
        ]
      },
      {
        "manifest-path": "s3://shopkart-lakehouse/warehouse/prod/orders/metadata/e5f6g7h8-manifest.avro",
        "manifest-length": 19660800,
        "partition-spec-id": 1,
        "added-snapshot-id": 8922019143787970520,
        "added-data-files-count": 389,
        "existing-data-files-count": 0,
        "deleted-data-files-count": 0,
        "partitions": [
          { "contains-null": false, "lower-bound": "2024-11-29", "upper-bound": "2024-11-29" },
          { "contains-null": false, "lower-bound": "US",         "upper-bound": "US" }
        ]
      },
      {
        "manifest-path": "s3://shopkart-lakehouse/warehouse/prod/orders/metadata/i9j0k1l2-manifest.avro",
        "manifest-length": 2201600,
        "partition-spec-id": 1,
        "added-snapshot-id": 8922019143787970520,
        "added-data-files-count": 47,
        "existing-data-files-count": 0,
        "deleted-data-files-count": 0,
        "partitions": [
          { "contains-null": false, "lower-bound": "2024-11-29", "upper-bound": "2024-11-29" },
          { "contains-null": false, "lower-bound": "DE",         "upper-bound": "DE" }
        ]
      }
    ]
  },

  // ── Manifest File Entry ───────────────────────────────────
  manifestFileEntry: {
    filename: 'a1b2c3d4-manifest.avro',
    description: 'Lists data files for BR partition, 2024-11-29.',
    entries: [
      {
        "status": 1,
        "snapshot-id": 8922019143787970520,
        "sequence-number": 47,
        "data-file": {
          "content": 0,
          "file-path": "s3://shopkart-lakehouse/warehouse/prod/orders/data/order_date_day=2024-11-29/country_code=BR/part-00000-a1b2.parquet",
          "file-format": "PARQUET",
          "partition": { "order_date_day": 20058, "country_code": "BR" },
          "record-count": 47293,
          "file-size-in-bytes": 134217728,
          "null-value-counts": { "4": 0, "6": 1203, "8": 891 },
          "lower-bounds": {
            "1": "10000001", "3": "2024-11-29", "4": "12.50", "5": "BR"
          },
          "upper-bounds": {
            "1": "10047293", "3": "2024-11-29", "4": "4999.99", "5": "BR"
          }
        }
      },
      {
        "status": 1,
        "snapshot-id": 8922019143787970520,
        "sequence-number": 47,
        "data-file": {
          "content": 0,
          "file-path": "s3://shopkart-lakehouse/warehouse/prod/orders/data/order_date_day=2024-11-29/country_code=BR/part-00001-c3d4.parquet",
          "file-format": "PARQUET",
          "partition": { "order_date_day": 20058, "country_code": "BR" },
          "record-count": 51847,
          "file-size-in-bytes": 128974848,
          "null-value-counts": { "4": 0, "6": 987, "8": 1104 },
          "lower-bounds": {
            "1": "10047294", "3": "2024-11-29", "4": "8.99", "5": "BR"
          },
          "upper-bounds": {
            "1": "10099141", "3": "2024-11-29", "4": "3499.00", "5": "BR"
          }
        }
      }
    ]
  },

  // ── SQL Examples ──────────────────────────────────────────
  sql: {
    createTable: `CREATE TABLE shopkart.prod.orders (
  order_id          BIGINT        NOT NULL COMMENT 'Unique order identifier',
  customer_id       BIGINT        NOT NULL COMMENT 'FK to customers table',
  order_date        DATE          NOT NULL COMMENT 'Date order was placed',
  order_timestamp   TIMESTAMP     NOT NULL COMMENT 'Exact time (UTC)',
  country_code      STRING        NOT NULL COMMENT 'ISO 3166-1 alpha-2',
  total_amount      DECIMAL(12,2)          COMMENT 'Order total in USD',
  currency_code     STRING                 COMMENT 'ISO 4217 currency',
  payment_method    STRING                 COMMENT 'CARD, WALLET, COD, BNPL',
  fulfilment_status STRING                 COMMENT 'PENDING, PICKED, SHIPPED, DELIVERED',
  warehouse_id      INT                    COMMENT 'Dispatch warehouse',
  is_express        BOOLEAN                COMMENT 'Express delivery flag',
  last_updated_ts   TIMESTAMP              COMMENT 'CDC update timestamp'
)
USING iceberg
PARTITIONED BY (days(order_date), country_code)
LOCATION 's3://shopkart-lakehouse/warehouse/prod/orders'
TBLPROPERTIES (
  'write.target-file-size-bytes'    = '134217728',
  'write.distribution-mode'         = 'hash',
  'write.parquet.compression-codec' = 'zstd',
  'history.expire.max-snapshot-age-ms' = '604800000'
);`,

    insert: `INSERT INTO shopkart.prod.orders
SELECT
  order_id,
  customer_id,
  CAST(order_timestamp AS DATE) AS order_date,
  order_timestamp,
  country_code,
  total_amount,
  currency_code,
  payment_method,
  fulfilment_status,
  warehouse_id,
  is_express,
  CURRENT_TIMESTAMP AS last_updated_ts
FROM hive.legacy.orders
WHERE order_date >= '2024-01-01';`,

    timeTravel: `-- Time travel by snapshot ID
SELECT COUNT(*) FROM shopkart.prod.orders
VERSION AS OF 8922019143787970520;

-- Time travel by timestamp (before data corruption)
SELECT COUNT(*) FROM shopkart.prod.orders
TIMESTAMP AS OF '2024-01-19 09:55:00 UTC';`,

    rollback: `-- Rollback to a specific snapshot
CALL shopkart.system.rollback_to_snapshot(
  'prod.orders',
  8922019143787970520
);

-- Rollback to a timestamp
CALL shopkart.system.rollback_to_timestamp(
  'prod.orders',
  TIMESTAMP '2024-01-19 09:55:00 UTC'
);`,

    schemaEvolution: `-- Week 2: Add new column (zero downtime)
ALTER TABLE shopkart.prod.orders
ADD COLUMN delivery_partner_id BIGINT
COMMENT 'FK to logistics.partners';

-- Week 8: Rename column
ALTER TABLE shopkart.prod.orders
RENAME COLUMN payment_method TO payment_type;

-- Week 12: Drop obsolete column
ALTER TABLE shopkart.prod.orders
DROP COLUMN legacy_platform;

-- Week 16: Add nested struct
ALTER TABLE shopkart.prod.orders
ADD COLUMN delivery_address STRUCT<
  street: STRING, city: STRING,
  zip: STRING, country: STRING
>;`,

    partitionEvolution: `-- Check current partition spec
SELECT spec_id, partition_columns
FROM shopkart.prod.orders.specs;
-- spec-id 0: [year(order_date), month(order_date)]

-- Evolve to day + country partitioning (no data rewrite!)
ALTER TABLE shopkart.prod.orders
REPLACE PARTITION FIELD year(order_date) WITH day(order_date);

ALTER TABLE shopkart.prod.orders
ADD PARTITION FIELD country_code;
-- spec-id 1: [day(order_date), country_code]  ← current`,

    expireSnapshots: `-- Expire snapshots older than 7 days
CALL shopkart.system.expire_snapshots(
  table          => 'prod.orders',
  older_than     => TIMESTAMP '2024-01-12 00:00:00',
  retain_last    => 10,
  max_concurrent_deletes => 50
);`,

    createBranch: `-- Create experimental branch
CALL shopkart.system.create_branch('prod.orders', 'dev_q4_experiment');

-- Write to branch without affecting main
INSERT INTO shopkart.prod.orders.branch_dev_q4_experiment
SELECT *, experimental_score(total_amount) AS risk_score
FROM shopkart.staging.orders;

-- Fast-forward main if experiment succeeds
CALL shopkart.system.fast_forward(
  'prod.orders', 'main', 'dev_q4_experiment'
);`,

    queryPruning: `-- This query scans only 384 MB out of 6 PB:
-- Iceberg prunes all manifests except country=BR, date=2024-11-29
SELECT
  payment_method,
  COUNT(*) AS order_count,
  SUM(total_amount) AS revenue
FROM shopkart.prod.orders
WHERE
  order_date = '2024-11-29'
  AND country_code = 'BR'
GROUP BY payment_method;
-- Without Iceberg (Hive): 6 PB scanned
-- With Iceberg:           384 MB scanned  (speedup: ~16,000x)`,
  },

  // ── PySpark Examples ─────────────────────────────────────
  pyspark: {
    sessionConfig: `from pyspark.sql import SparkSession

spark = SparkSession.builder \\
    .appName("ShopKart-Iceberg") \\
    .config("spark.sql.extensions",
            "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \\
    .config("spark.sql.catalog.shopkart",
            "org.apache.iceberg.spark.SparkCatalog") \\
    .config("spark.sql.catalog.shopkart.catalog-impl",
            "org.apache.iceberg.aws.glue.GlueCatalog") \\
    .config("spark.sql.catalog.shopkart.warehouse",
            "s3://shopkart-lakehouse/warehouse") \\
    .config("spark.sql.defaultCatalog", "shopkart") \\
    .getOrCreate()`,

    timeTravel: `# Read historical snapshot
df = spark.read \\
    .option("snapshot-id", "8922019143787970520") \\
    .table("shopkart.prod.orders")

# Or read as of timestamp
df_before = spark.read \\
    .option("as-of-timestamp", "1705657800000") \\
    .table("shopkart.prod.orders")`,
  },

  // ── Comparison Data ───────────────────────────────────────
  formatComparison: [
    {
      feature: 'ACID Transactions',
      hive: false, deltaLake: true, hudi: true, iceberg: true,
      notes: 'Iceberg uses snapshot isolation; Delta uses optimistic concurrency with a transaction log.'
    },
    {
      feature: 'Schema Evolution',
      hive: 'limited', deltaLake: true, hudi: 'limited', iceberg: true,
      notes: 'Iceberg uses column IDs, enabling safe rename/drop/add without rewrite.'
    },
    {
      feature: 'Partition Evolution',
      hive: false, deltaLake: false, hudi: false, iceberg: true,
      notes: 'Only Iceberg supports changing partition strategy without full table rewrite.'
    },
    {
      feature: 'Hidden Partitioning',
      hive: false, deltaLake: false, hudi: false, iceberg: true,
      notes: 'Users filter on business columns; Iceberg applies partition transforms automatically.'
    },
    {
      feature: 'Time Travel',
      hive: false, deltaLake: true, hudi: true, iceberg: true,
      notes: 'All three support time travel; Iceberg and Delta have the richest query syntax.'
    },
    {
      feature: 'Engine Agnosticism',
      hive: true, deltaLake: 'partial', hudi: 'partial', iceberg: true,
      notes: 'Delta format is proprietary to Databricks. Iceberg is a fully open spec.'
    },
    {
      feature: 'Incremental Reads',
      hive: false, deltaLake: true, hudi: true, iceberg: true,
      notes: 'All three support reading only new/changed data since a checkpoint.'
    },
    {
      feature: 'Row-level Deletes',
      hive: false, deltaLake: true, hudi: true, iceberg: true,
      notes: 'Iceberg v2 supports positional and equality delete files.'
    },
    {
      feature: 'Open Specification',
      hive: true, deltaLake: false, hudi: 'partial', iceberg: true,
      notes: 'Iceberg Table Spec is a public Apache standard. Delta is Databricks-controlled.'
    },
    {
      feature: 'Metadata Scalability',
      hive: 'poor', deltaLake: 'good', hudi: 'good', iceberg: 'excellent',
      notes: 'Iceberg\'s hierarchical metadata scales to billions of files without a central service.'
    },
  ],

  // ── Snapshot Chain ────────────────────────────────────────
  snapshotChain: [
    {
      id: 'snap-1001',
      snapshotId: 1001729675574597001,
      operation: 'append',
      label: 'Initial Migration',
      timestamp: '2024-01-15 02:00 UTC',
      addedFiles: 12847,
      totalRecords: '62.1 B',
      description: 'Historical data migration from Hive (Jan–Oct 2024)',
      status: 'expired',
    },
    {
      id: 'snap-2002',
      snapshotId: 2002019143787970520,
      operation: 'append',
      label: 'Streaming: Day 1',
      timestamp: '2024-01-16 00:00 UTC',
      addedFiles: 384,
      totalRecords: '63.9 B',
      description: 'First day of Flink streaming writes',
      status: 'active',
    },
    {
      id: 'snap-3003',
      snapshotId: 3051729675574597004,
      operation: 'append',
      label: 'Q4 Close ← tagged',
      timestamp: '2023-12-31 23:59 UTC',
      addedFiles: 1847,
      totalRecords: '84.6 B',
      description: 'Quarter-end snapshot tagged for compliance (7-year retention)',
      status: 'tagged',
      tag: 'q4_2024_close',
    },
    {
      id: 'snap-4004',
      snapshotId: 4004019143787970520,
      operation: 'overwrite',
      label: 'BAD DATA ⚠',
      timestamp: '2024-01-19 14:03 UTC',
      addedFiles: 847,
      totalRecords: '84.2 B',
      description: 'Accidental overwrite with corrupted staging data. Rolled back in 8 minutes.',
      status: 'rolled-back',
    },
    {
      id: 'snap-current',
      snapshotId: 8922019143787970520,
      operation: 'append',
      label: 'Current',
      timestamp: '2024-11-29 14:22 UTC',
      addedFiles: 384,
      totalRecords: '86.4 B',
      description: 'Latest Black Friday 2024 streaming append',
      status: 'current',
    },
  ],

  // ── Partition Pruning Example ─────────────────────────────
  pruningExample: {
    query: "SELECT COUNT(*) FROM orders WHERE order_date = '2024-11-29' AND country_code = 'BR'",
    manifestCount: 2000,
    manifests: [
      { id: 'A', partition: "day=2024-11-29, country=BR", result: 'INCLUDE', reason: 'Matches both predicates' },
      { id: 'B', partition: "day=2024-11-29, country=US", result: 'SKIP',    reason: 'country_code ≠ BR' },
      { id: 'C', partition: "day=2024-11-28, country=BR", result: 'SKIP',    reason: 'order_date ≠ 2024-11-29' },
      { id: 'D', partition: "day=2024-11-27, country=DE", result: 'SKIP',    reason: 'Neither predicate matches' },
      { id: 'E', partition: "day=2024-11-30, country=BR", result: 'SKIP',    reason: 'order_date ≠ 2024-11-29' },
    ],
    beforeIceberg: '6 PB',
    afterIceberg: '384 MB',
    speedup: '~16,000x',
  },
};
