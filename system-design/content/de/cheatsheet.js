// ── DE Cheat sheet ────────────────────────────────────────────────────────────
// The numbers, pickers and one-liners worth knowing before a data-engineering
// interview. Rendered by components/cheatsheet.js. Each section: { title, icon, ...blocks }.

export const CHEATSHEET = [
  {
    title: 'File & table format picker',
    icon: '🗄️',
    compareNote: true,
    table: {
      head: ['Reach for', 'When'],
      rows: [
        ['Parquet / ORC (columnar)', 'Analytical scans, aggregations, big compression — the lake default'],
        ['Avro (row)', 'Streaming/serialization, schema evolution, whole-record reads'],
        ['JSON / CSV', 'Small data, interchange, human-readable — not for scale'],
        ['Delta / Iceberg / Hudi', 'ACID, time travel, updates/deletes & schema evolution on the lake'],
      ],
    },
    rules: ['Columnar for reads, row for writes/streaming. A table format turns a lake into a lakehouse — pick by engine support, not brand.'],
  },
  {
    title: 'Partition & file sizing',
    icon: '🗂️',
    stats: [
      { value: '128MB–1GB', label: 'target file size (avoid tiny files)', tone: 'accent' },
      { value: 'low card.', label: 'partition column (date-like)', tone: 'blue' },
      { value: 'in WHERE', label: 'partition column must be filtered to prune', tone: 'amber' },
    ],
    bullets: [
      '**Partition** on the column queries filter by (usually date) — no filter, no pruning, full scan.',
      '**Avoid over-partitioning**: millions of partitions → millions of tiny files → slower than none.',
      '**Two partition dims multiply**: 365 days × 50 regions = 18k folders — check the product.',
      '**Cluster / Z-order** inside a partition for secondary filters instead of adding partition columns.',
      '**Verify** pruning via the scanned-bytes metric, not the folder layout.',
    ],
  },
  {
    title: 'Slowly changing dimensions (SCD)',
    icon: '🧱',
    table: {
      head: ['Type', 'Behavior', 'Use when'],
      rows: [
        ['Type 0', 'Never changes', 'Immutable attributes (birth date)'],
        ['Type 1', 'Overwrite, no history', 'Corrections; history not needed'],
        ['Type 2', 'New row + validity dates', 'Must query attribute as of a past time'],
        ['Type 3', 'Previous-value column', 'Track just the prior value'],
      ],
    },
    rules: ['Type 2 is the workhorse for history. Use a surrogate key so a changing business key doesn’t break joins or versions.'],
  },
  {
    title: 'Delivery semantics — pick on cost of a duplicate',
    icon: '🎯',
    table: {
      head: ['Guarantee', 'Failure behavior', 'Use when'],
      rows: [
        ['At-most-once', 'May lose events', 'Disposable signals; a gap is cheaper than a dup'],
        ['At-least-once', 'May duplicate', 'Default — safe, simple, universally supported'],
        ['Exactly-once effect', 'At-least-once + idempotent sink', 'Analytics/most pipelines — cheap correctness'],
        ['Exactly-once (txn)', 'Atomic offset+write', 'Money/inventory with no idempotency key'],
      ],
    },
    rules: ['Default to at-least-once + an idempotent/dedup sink. Reserve true transactional exactly-once for when a duplicate is unacceptable and there’s no natural key.'],
  },
  {
    title: 'Windowing & time',
    icon: '🌊',
    table: {
      head: ['Window', 'Shape', 'Answers'],
      rows: [
        ['Tumbling', 'Fixed, non-overlapping', '“per 5-minute bucket”'],
        ['Sliding', 'Fixed size, moving', '“last 1h, updated each minute”'],
        ['Session', 'Gaps separate activity', '“per user visit/burst”'],
      ],
    },
    rules: [
      'Window on **event time**, not processing time, for correct results.',
      'A **watermark** decides when a window is done; allow a grace period for late events, then drop or side-output them.',
    ],
  },
  {
    title: 'Join strategy (Spark)',
    icon: '🔗',
    table: {
      head: ['One side small?', 'Reach for'],
      rows: [
        ['Yes — fits in memory', 'Broadcast join (no shuffle)'],
        ['No — both large', 'Shuffle-sort-merge join'],
        ['One key is huge (skew)', 'Salt / split the hot key, or skew join / AQE'],
      ],
    },
    rules: ['Spill = too much data per task: fix skew, right-size partitions, broadcast the small side, cache reused data.'],
  },
  {
    title: 'Batch vs streaming',
    icon: '⚙️',
    compareNote: true,
    table: {
      head: ['Choose batch when', 'Choose streaming when'],
      rows: [
        ['Hourly/daily freshness is fine', 'Latency changes a decision (seconds/minutes)'],
        ['Simplicity and low cost matter', 'Continuous, unbounded input'],
        ['Reprocessing is easy', 'Real-time alerting / enrichment'],
        ['Most reporting', 'Fraud, monitoring, live features'],
      ],
    },
    rules: ['Streaming costs complexity — don’t pay it for daily reports. Many “real-time” needs are really “fresh enough” micro-batches.'],
  },
  {
    title: 'Cost levers (biggest first)',
    icon: '💰',
    stats: [
      { value: 'layout', label: 'partition/file/cluster — cut bytes scanned', tone: 'accent' },
      { value: 'tiering', label: 'hot→cold storage by access', tone: 'blue' },
      { value: 'auto-suspend', label: 'idle compute is wasted spend', tone: 'amber' },
    ],
    bullets: [
      '**Fix layout before adding compute** — pruning cuts work permanently; more compute just brute-forces it.',
      '**Materialize** hot aggregates so dashboards read summaries, not raw facts.',
      '**Limit ad-hoc blast radius**: query timeouts, budgets, required partition filters.',
      '**Separate storage & compute** so each scales (and is paid for) independently.',
      '**Tag & charge back** so teams see and own what they spend.',
    ],
  },
  {
    title: 'The DE design framework (5 steps)',
    icon: '🗺️',
    steps: [
      { title: 'Requirements & SLAs', detail: 'Freshness (batch vs streaming?), volume, consumers (BI/ML/ops), and the cost/latency budget. State them out loud.' },
      { title: 'Ingestion', detail: 'Sources, CDC vs batch pulls, how raw data lands immutably and replayably, and how schema changes are handled.' },
      { title: 'Storage & modeling', detail: 'Lake/warehouse/lakehouse, file & table format, partition layout, and the dimensional model (facts, dims, SCD).' },
      { title: 'Processing', detail: 'ETL vs ELT, incremental vs full, idempotent transforms, and the orchestration DAG with retries and dependencies.' },
      { title: 'Quality, governance & cost', detail: 'Data quality checks, reconciliation, lineage/catalog, access control & PII, monitoring, and the cost levers you’ll pull.' },
    ],
  },
  {
    title: 'Problem → reach for it',
    icon: '🧰',
    table: {
      head: ['Problem', 'Reach for'],
      rows: [
        ['Sync a DB into the lake', 'Log-based CDC + MERGE on key'],
        ['Re-run / backfill safely', 'Idempotent overwrite-by-partition'],
        ['Query scans whole table', 'Partition on the filter column + prune'],
        ['Thousands of tiny files', 'Compaction + fewer partitions'],
        ['Updates/deletes on a lake', 'Table format (Delta/Iceberg/Hudi)'],
        ['Duplicates from a stream', 'Dedup on event key within a window'],
        ['Late / out-of-order events', 'Event-time windows + watermarks'],
        ['Skewed join', 'Salt the hot key / broadcast small side'],
        ['Silent data loss', 'Source↔target reconciliation checks'],
        ['Right to be forgotten', 'Table-format deletes or crypto-shredding'],
      ],
    },
  },
];
