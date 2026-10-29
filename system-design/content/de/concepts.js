// ── DE concept registry (Data-Engineering track) ────────────────────────────
// 33 data-engineering system-design concepts across 7 groups, mirroring the
// SWE track's structure: each a data-only module under
// content/de/concept-data/<id>.js rendered by the shared concept renderer, and
// each leading with a live animated simulation.
//
// `built: true` means the data file + loader exist. Unbuilt concepts show in
// the nav / home grid with a "soon" badge so the roadmap fills in wave by wave.

export const CONCEPT_GROUPS = [
  'Foundations',
  'Storage & table formats',
  'Ingestion & pipelines',
  'Streaming systems',
  'Performance & quality',
  'Operations',
  'End-to-end platforms',
];

export const CONCEPTS = [
  // ── Foundations ───────────────────────────────────────────────────────────
  { id: 'data-lake', title: 'Data lake architecture', icon: '🏞️', chapter: 1, wave: 'A', group: 'Foundations', summary: 'Store any data cheaply in open formats on object storage, schema-on-read — the landing zone for every downstream system.', built: true },
  { id: 'medallion-architecture', title: 'Medallion architecture (Bronze/Silver/Gold)', icon: '🥉', chapter: 2, wave: 'A', group: 'Foundations', summary: 'Refine data in layers: raw Bronze → cleaned Silver → business-ready Gold, each a quality checkpoint.', built: true },
  { id: 'warehouse-design', title: 'Data warehouse design (star & snowflake)', icon: '🏢', chapter: 3, wave: 'B', group: 'Foundations', summary: 'Fact and dimension tables, star vs snowflake schemas, and modeling for analytical queries.', built: false },
  { id: 'oltp-vs-olap', title: 'OLTP vs OLAP & data modeling', icon: '🧱', chapter: 4, wave: 'B', group: 'Foundations', summary: 'Row vs columnar stores, normalization vs denormalization, and why analytics needs a different model.', built: false },
  { id: 'batch-vs-streaming', title: 'Batch vs streaming', icon: '🌊', chapter: 5, wave: 'B', group: 'Foundations', summary: 'Bounded batch jobs vs unbounded streams — latency, cost, and when each wins.', built: false },

  // ── Storage & table formats ───────────────────────────────────────────────
  { id: 'file-formats', title: 'File formats (Parquet, ORC, Avro)', icon: '🗜️', chapter: 6, wave: 'B', group: 'Storage & table formats', summary: 'Row vs columnar encoding, compression, and column projection that makes analytics fast.', built: false },
  { id: 'partitioning-bucketing', title: 'Partitioning & bucketing', icon: '🗂️', chapter: 7, wave: 'B', group: 'Storage & table formats', summary: 'Lay data out so queries prune to only the files they need — and avoid the skew traps.', built: false },
  { id: 'table-formats', title: 'Open table formats (Delta, Iceberg, Hudi)', icon: '🧊', chapter: 8, wave: 'B', group: 'Storage & table formats', summary: 'ACID transactions, snapshot isolation, and time travel over files in a lake.', built: false },
  { id: 'small-file-compaction', title: 'The small-file problem & compaction', icon: '🧩', chapter: 9, wave: 'B', group: 'Storage & table formats', summary: 'Why millions of tiny files kill performance, and how compaction fixes it.', built: false },

  // ── Ingestion & pipelines ─────────────────────────────────────────────────
  { id: 'etl-vs-elt', title: 'Batch ETL vs ELT', icon: '🔄', chapter: 10, wave: 'C', group: 'Ingestion & pipelines', summary: 'Transform-before-load vs load-then-transform, and why ELT won in the cloud warehouse era.', built: false },
  { id: 'incremental-vs-full', title: 'Incremental vs full loads', icon: '⏫', chapter: 11, wave: 'C', group: 'Ingestion & pipelines', summary: 'High-water marks and change windows that move only new data instead of reloading everything.', built: false },
  { id: 'cdc-pipeline', title: 'Change data capture (CDC)', icon: '📝', chapter: 12, wave: 'A', group: 'Ingestion & pipelines', summary: 'Tail the database log and stream inserts/updates/deletes to keep a target in sync — without full reloads.', built: true },
  { id: 'orchestration-dag', title: 'Orchestration (Airflow DAGs)', icon: '🧭', chapter: 13, wave: 'C', group: 'Ingestion & pipelines', summary: 'Model pipelines as DAGs: dependencies, scheduling, retries, and backfills.', built: false },
  { id: 'idempotent-pipelines', title: 'Idempotent & retriable pipelines', icon: '♻️', chapter: 14, wave: 'C', group: 'Ingestion & pipelines', summary: 'Design tasks so a re-run never double-writes — the backbone of reliable data pipelines.', built: false },

  // ── Streaming systems ─────────────────────────────────────────────────────
  { id: 'kafka-architecture', title: 'Kafka architecture', icon: '📬', chapter: 15, wave: 'C', group: 'Streaming systems', summary: 'Partitioned logs, producers, consumer groups and offsets — the backbone of streaming.', built: false },
  { id: 'event-driven', title: 'Event-driven architecture', icon: '⚡', chapter: 16, wave: 'C', group: 'Streaming systems', summary: 'Decouple producers and consumers with events and fan-out to many independent sinks.', built: false },
  { id: 'windowing', title: 'Windowing (tumbling, sliding, session)', icon: '🪟', chapter: 17, wave: 'C', group: 'Streaming systems', summary: 'Slice an unbounded stream into finite windows you can aggregate over.', built: false },
  { id: 'watermarking', title: 'Watermarking & late data', icon: '💧', chapter: 18, wave: 'C', group: 'Streaming systems', summary: 'Track event-time progress so you know when a window is complete — and handle stragglers.', built: false },
  { id: 'delivery-guarantees', title: 'Delivery guarantees & exactly-once', icon: '🎯', chapter: 19, wave: 'C', group: 'Streaming systems', summary: 'At-most / at-least / exactly-once, offset commits, and idempotent sinks.', built: false },

  // ── Performance & quality ─────────────────────────────────────────────────
  { id: 'spark-shuffle', title: 'Spark execution & the shuffle', icon: '🔀', chapter: 20, wave: 'D', group: 'Performance & quality', summary: 'Stages, tasks, and the shuffle boundary that dominates distributed job cost.', built: false },
  { id: 'join-strategies', title: 'Join strategies (broadcast vs shuffle)', icon: '🔗', chapter: 21, wave: 'D', group: 'Performance & quality', summary: 'Broadcast a small table to every executor vs shuffle both sides — the single biggest tuning lever.', built: false },
  { id: 'warehouse-tuning', title: 'Warehouse tuning (dist & sort keys)', icon: '⚙️', chapter: 22, wave: 'D', group: 'Performance & quality', summary: 'Distribution and sort keys that cut data movement and scan on big joins.', built: false },
  { id: 'data-quality', title: 'Data quality & validation', icon: '✅', chapter: 23, wave: 'D', group: 'Performance & quality', summary: 'Schema, null, range and uniqueness checks that stop bad data at the gate.', built: false },
  { id: 'reconciliation-dedup', title: 'Reconciliation & deduplication', icon: '🧮', chapter: 24, wave: 'D', group: 'Performance & quality', summary: 'Prove source and target agree, and collapse duplicates from retries and at-least-once delivery.', built: false },

  // ── Operations ────────────────────────────────────────────────────────────
  { id: 'pipeline-monitoring', title: 'Pipeline monitoring & SLAs', icon: '📟', chapter: 25, wave: 'D', group: 'Operations', summary: 'Freshness, volume and latency signals, and alerting when a pipeline misses its SLA.', built: false },
  { id: 'governance-lineage', title: 'Data governance & lineage', icon: '🧬', chapter: 26, wave: 'D', group: 'Operations', summary: 'Catalog, ownership and column-level lineage from source to report.', built: false },
  { id: 'security-iam', title: 'Security (IAM, RBAC, encryption)', icon: '🔐', chapter: 27, wave: 'D', group: 'Operations', summary: 'Least-privilege access, roles, and encryption in transit and at rest.', built: false },
  { id: 'cost-optimization', title: 'Cost optimization', icon: '💰', chapter: 28, wave: 'D', group: 'Operations', summary: 'Storage tiering, lifecycle policies, and right-sized compute that keep the bill sane.', built: false },

  // ── End-to-end platforms ──────────────────────────────────────────────────
  { id: 'clickstream-analytics', title: 'Design a clickstream analytics platform', icon: '🖱️', chapter: 29, wave: 'E', group: 'End-to-end platforms', summary: 'Ingest web/app events at scale, from real-time dashboards to historical analysis.', built: false },
  { id: 'ecommerce-analytics', title: 'Design an e-commerce analytics platform', icon: '🛒', chapter: 30, wave: 'E', group: 'End-to-end platforms', summary: 'Orders, inventory and behavior into a warehouse powering BI and recommendations.', built: false },
  { id: 'iot-analytics', title: 'Design an IoT analytics platform', icon: '📡', chapter: 31, wave: 'E', group: 'End-to-end platforms', summary: 'Millions of devices, time-series at the edge and in the cloud, and downsampling.', built: false },
  { id: 'banking-data-platform', title: 'Design a banking data platform', icon: '🏦', chapter: 32, wave: 'E', group: 'End-to-end platforms', summary: 'Correctness, auditability and regulation over transactional and risk data.', built: false },
  { id: 'multi-tenant-analytics', title: 'Design a multi-tenant analytics platform', icon: '🏘️', chapter: 33, wave: 'E', group: 'End-to-end platforms', summary: 'Isolate many customers’ data and compute in one platform without leaks or noisy neighbors.', built: false },
];

// Lazy loaders — only for built concepts.
export const CONCEPT_LOADERS = {
  'data-lake': () => import('./concept-data/data-lake.js'),
  'medallion-architecture': () => import('./concept-data/medallion-architecture.js'),
  'cdc-pipeline': () => import('./concept-data/cdc-pipeline.js'),
};

export const CONCEPT_PREFIX = 'c:';

export function conceptMeta(id) {
  return CONCEPTS.find(c => c.id === id) || null;
}
export function builtConceptCount() {
  return CONCEPTS.filter(c => c.built).length;
}
