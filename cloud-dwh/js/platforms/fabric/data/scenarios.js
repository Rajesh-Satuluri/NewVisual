/* ============================================================
   Fabric — scenario banks for the practice/interview labs.
   Registered under distinct fb-* areas (no collision with other
   platforms). Authentic and aligned with Microsoft Learn.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const SE = viz.ScenarioEngine;
  if (!SE) return;

  /* investigation: Troubleshooting */
  SE.register('fb-troubleshooting', [
    {
      id: 'fb-ts-stale-endpoint', area: 'fb-troubleshooting', category: 'Metadata', difficulty: 'intermediate',
      title: 'New Lakehouse tables don\'t show in the SQL endpoint',
      symptom: 'A Spark notebook wrote new Delta tables to a Lakehouse, but they are missing (or stale) when queried from the SQL analytics endpoint and Direct Lake reports.',
      steps: [
        { prompt: 'What is the most likely cause?', choices: [
            { text: 'The SQL endpoint metadata hasn\'t synced the new Delta tables yet', correct: true, why: 'The read-only SQL endpoint maintains its own metadata over the Lakehouse; after Spark writes, there can be a short sync delay (or it needs a refresh) before new tables/columns appear.' },
            { text: 'OneLake lost the data', correct: false, why: 'The Delta files exist in OneLake; this is a metadata-visibility issue, not data loss.' },
            { text: 'You must COPY the data into the endpoint', correct: false, why: 'The endpoint reads Delta in place — there is nothing to copy.' } ],
          evidence: 'The tables are visible in the Lakehouse (Spark) view but not yet in the SQL endpoint object list.',
          insight: 'The SQL analytics endpoint is a read-only projection with its own metadata sync.',
          wrongAssumption: 'That Spark writes are instantly visible to every surface.' },
        { prompt: 'How do you resolve and prevent it?', choices: [
            { text: 'Refresh the SQL endpoint metadata (and only expose Delta tables)', correct: true, why: 'Refreshing the endpoint metadata surfaces the new Delta tables; remember only Delta tables appear (not raw parquet/csv).' },
            { text: 'Recreate the Lakehouse', correct: false, why: 'Destructive and unnecessary.' },
            { text: 'Switch the report to Import', correct: false, why: 'Masks the issue and gives up Direct Lake freshness.' } ],
          evidence: 'After a metadata refresh, the tables appear and Direct Lake reports update.',
          insight: 'Only Delta tables (not loose files) surface in the SQL endpoint.',
          wrongAssumption: 'That CSV/Parquet files appear automatically in the SQL endpoint.' },
      ],
      rootCause: 'The SQL analytics endpoint had not yet synced metadata for the newly written Delta tables, so they were invisible to T-SQL and Direct Lake.',
      resolution: 'Refresh the SQL endpoint metadata; ensure outputs are Delta tables (not raw files), which are what the endpoint exposes.',
      prevention: 'Write Delta tables (not loose files) for anything that must be queryable; account for endpoint metadata sync in orchestration ordering.',
      interviewAnswer: 'The SQL analytics endpoint is a read-only projection over the Lakehouse with its own metadata, and only Delta tables appear in it. New Spark-written tables can lag until the endpoint syncs; I refresh its metadata and make sure outputs are Delta tables — I would not switch to Import and lose Direct Lake freshness.' },
  ]);

  /* investigation: Fabric + Data Eng */
  SE.register('fb-de', [
    {
      id: 'fb-de-dq-fallback', area: 'fb-de', category: 'BI', difficulty: 'advanced',
      title: 'Direct Lake report suddenly slows down',
      symptom: 'A Direct Lake report that was fast starts responding slowly after the underlying table grew substantially.',
      steps: [
        { prompt: 'What likely happened?', choices: [
            { text: 'The model exceeded capacity guardrails and fell back to DirectQuery', correct: true, why: 'Direct Lake guardrails (rows, Parquet files, model size) scale with the SKU; exceeding them triggers DirectQuery fallback, which is slower.' },
            { text: 'OneLake went offline', correct: false, why: 'Nothing indicates an outage; behavior tracks data growth.' },
            { text: 'The semantic model was deleted', correct: false, why: 'The report still works, just slower — consistent with fallback.' } ],
          evidence: 'Capacity metrics show DirectQuery fallback on the model after the row/file counts crossed the SKU guardrail.',
          insight: 'Direct Lake silently falls back to DirectQuery when guardrails are exceeded.',
          wrongAssumption: 'That Direct Lake performance is independent of capacity size.' },
      ],
      rootCause: 'Table growth pushed the model past the Direct Lake guardrails for the current F-SKU, causing DirectQuery fallback and slower queries.',
      resolution: 'Reduce model footprint (V-Order/compaction, partition, trim columns) or move to a larger capacity so the guardrails lift (e.g. model-size cap is removed at F64+).',
      prevention: 'Monitor capacity metrics for fallback, keep files compacted/V-Ordered, and size the SKU to the model.',
      interviewAnswer: 'Direct Lake has per-SKU guardrails; when a growing table exceeds them it falls back to DirectQuery, which is slower. I would confirm fallback in the capacity metrics, then either shrink the model (compaction, V-Order, fewer columns, partitioning) or move to a larger SKU where the guardrails lift.' },
  ]);

  /* chain: Architecture failure */
  SE.register('fb-failure', [
    {
      id: 'fb-fail-throttle', area: 'fb-failure', category: 'Capacity', difficulty: 'advanced',
      title: 'Everything slows when one big job runs',
      intro: 'Trace how a shared capacity can make unrelated workloads slow at the same time.',
      steps: [
        { q: 'Symptom: reports, pipelines, and a Spark job all slow down together. Why?', a: 'All Fabric workloads draw from one shared capacity (CUs). A heavy Spark/ETL job can consume most of the capacity, so unrelated workloads contend for what\'s left.' },
        { q: 'Why doesn\'t Fabric just fail the extra work?', a: 'Fabric smooths usage and can throttle rather than hard-fail; bursting lets short spikes finish faster, but sustained overuse leads to throttling across the capacity.' },
        { q: 'How do you confirm it?', a: 'The Fabric Capacity Metrics app shows CU consumption by item and any throttling/overage, pinpointing the workload consuming the capacity.' },
        { q: 'How do you remediate?', a: 'Scale the capacity up (or to a separate capacity for that workload), schedule the heavy job off-peak, or optimize it; isolate critical BI on its own capacity if needed.' },
        { q: 'How do you prevent recurrence?', a: 'Monitor the Capacity Metrics app, separate noisy workloads onto their own capacities, and right-size the F-SKU to peak concurrent demand.' },
      ] },
  ]);

  /* decision: Performance optimization */
  SE.register('fb-perf-opt', [
    {
      id: 'fb-po-directlake', area: 'fb-perf-opt', category: 'BI', difficulty: 'intermediate',
      title: 'Make a Power BI report fast and fresh', tag: '🔎 Optimize',
      scenario: 'A report on a large OneLake table must be both fast and always current, without a refresh schedule.',
      question: 'Best approach?',
      choices: [
        { text: 'Import mode with hourly refresh', correct: false },
        { text: 'Direct Lake with V-Ordered, compacted Delta', correct: true },
        { text: 'DirectQuery to the source', correct: false } ],
      rationale: {
        fit: 'Direct Lake reads Delta in OneLake directly — import-like speed and DirectQuery-like freshness with no copy. V-Order + compaction keep the Parquet reads fast and inside guardrails.',
        alternatives: [
          { name: 'Import + refresh', why: 'Duplicates data and is only as fresh as the last refresh.' },
          { name: 'DirectQuery', why: 'Always fresh but slower per query than Direct Lake.' } ],
        performance: 'V-Ordered, compacted Delta maximizes Direct Lake speed.',
        cost: 'No refresh compute or duplicate storage.',
        tradeoffs: 'Needs a Fabric capacity; watch guardrails or it falls back to DirectQuery.',
        whenAltApplies: 'Import can still suit tiny, rarely changing models on non-capacity licenses.' },
      interviewAnswer: 'Direct Lake gives fast + fresh with no copy, so I\'d use it, keeping the Delta V-Ordered and compacted to stay within guardrails. Import duplicates and goes stale between refreshes; DirectQuery is fresh but slower.' },
  ]);

  /* decision: Cost */
  SE.register('fb-cost', [
    {
      id: 'fb-co-sku', area: 'fb-cost', category: 'Capacity', difficulty: 'intermediate',
      title: 'Spiky workload on an idle capacity', tag: '💰 Cost decision',
      scenario: 'Heavy processing runs a few hours a day; the capacity sits mostly idle otherwise, and finance wants lower cost.',
      question: 'Best cost lever?',
      choices: [
        { text: 'Keep a large capacity running 24/7', correct: false },
        { text: 'Pause/resume the capacity (and rely on bursting/smoothing) or right-size the F-SKU', correct: true },
        { text: 'Move everything to Import mode', correct: false } ],
      rationale: {
        fit: 'Fabric capacities can be paused when idle and resumed when needed, and bursting/smoothing absorb short spikes — so you size for typical load, not peak, and stop paying while paused.',
        alternatives: [
          { name: '24/7 large capacity', why: 'Pays for peak capacity around the clock.' },
          { name: 'All Import', why: 'Shifts the problem; refreshes still consume capacity and duplicate data.' } ],
        performance: 'Bursting still finishes spikes quickly.',
        cost: 'Pause = no charge while idle; right-sizing avoids overpaying.',
        tradeoffs: 'Paused capacity means content is unavailable; schedule around it.',
        whenAltApplies: 'Steady, high utilization justifies a larger always-on SKU.' },
      interviewAnswer: 'For a spiky, mostly-idle workload I\'d right-size the F-SKU and pause the capacity when idle, letting bursting/smoothing handle short peaks — rather than paying for a large capacity 24/7.' },
  ]);

  /* decision: Feature decisions */
  SE.register('fb-decisions', [
    {
      id: 'fb-dec-wh-vs-lh', area: 'fb-decisions', category: 'Architecture', difficulty: 'intermediate',
      title: 'Team needs T-SQL writes + transactions', tag: '⚖️ Decision',
      scenario: 'A SQL-centric team needs full read/write T-SQL with multi-table transactions over structured data.',
      question: 'Which Fabric item?',
      choices: [
        { text: 'Lakehouse (SQL analytics endpoint)', correct: false },
        { text: 'Warehouse', correct: true },
        { text: 'A Power BI dataset only', correct: false } ],
      rationale: {
        fit: 'The Warehouse offers full T-SQL read/write and multi-table transactions; the Lakehouse SQL endpoint is read-only. Both share OneLake Delta storage.',
        alternatives: [
          { name: 'Lakehouse endpoint', why: 'Read-only — cannot do the required writes/transactions.' },
          { name: 'Power BI dataset', why: 'A model, not a transactional store.' } ],
        performance: 'Both share the same engine/storage; choice is about capability.',
        cost: 'Same capacity model.',
        tradeoffs: 'Use a Lakehouse alongside for Spark/unstructured needs.',
        whenAltApplies: 'Choose the Lakehouse when the team is Spark-first or needs unstructured data.' },
      interviewAnswer: 'Full T-SQL read/write with multi-table transactions means a Warehouse; the Lakehouse SQL endpoint is read-only. They share OneLake storage, so you can still pair a Lakehouse for Spark/unstructured work.' },
  ]);

  /* sql */
  SE.register('fb-sql', [
    {
      id: 'fb-sql-dedup', area: 'fb-sql', category: 'Deduplication', difficulty: 'intermediate',
      title: 'Keep the latest row per key (T-SQL)',
      scenario: 'A staging table in the Warehouse has duplicates per user_id; keep only the latest by updated_at.',
      steps: [
        { q: 'Write T-SQL to keep the latest row per user_id.',
          sql: "SELECT user_id, plan, updated_at\nFROM (\n  SELECT *,\n         ROW_NUMBER() OVER (PARTITION BY user_id\n                            ORDER BY updated_at DESC) AS rn\n  FROM stg_users\n) t\nWHERE rn = 1;",
          a: 'Fabric Warehouse is T-SQL (no QUALIFY), so wrap ROW_NUMBER() in a derived table and filter rn = 1.' },
        { q: 'How do you upsert into the clean table?',
          sql: "MERGE dbo.users_clean AS tgt\nUSING stg_latest AS src\n  ON tgt.user_id = src.user_id\nWHEN MATCHED AND src.updated_at > tgt.updated_at\n  THEN UPDATE SET tgt.plan = src.plan, tgt.updated_at = src.updated_at\nWHEN NOT MATCHED THEN\n  INSERT (user_id, plan, updated_at)\n  VALUES (src.user_id, src.plan, src.updated_at);",
          a: 'The Warehouse supports T-SQL MERGE with multi-table transactions, giving an idempotent upsert that converges on every run.' },
      ] },
  ]);

  /* traps */
  (function () {
    const mk = (id, category, difficulty, title, myth, whyWrong, correct, interviewSafe) =>
      ({ id, area: 'fb-traps', category, difficulty, title, myth, whyWrong, correct, interviewSafe });
    SE.register('fb-traps', [
      mk('fb-tr-copy', 'Architecture', 'beginner', 'Warehouse and Lakehouse keep separate copies',
        'Using both a Warehouse and a Lakehouse means duplicating data.',
        'It assumes each engine has its own store, like older stacks.',
        'Both store Delta in the same OneLake and share the SQL engine — one copy, two development experiences (T-SQL vs Spark).',
        '"They share OneLake storage and the SQL engine — it\'s one copy of Delta, just two front doors (T-SQL vs Spark)."'),
      mk('fb-tr-dl-free', 'BI', 'intermediate', 'Direct Lake works on any license',
        'Direct Lake is just a Power BI setting you can use anywhere.',
        'It ignores that Direct Lake needs a Fabric capacity and has guardrails.',
        'Direct Lake requires a Fabric capacity; guardrails scale with the SKU and queries fall back to DirectQuery if exceeded.',
        '"Direct Lake needs a Fabric capacity, and it falls back to DirectQuery past the SKU guardrails — so capacity sizing matters."'),
      mk('fb-tr-endpoint-write', 'Warehouse', 'beginner', 'You can write via the SQL endpoint',
        'The Lakehouse SQL analytics endpoint supports inserts/updates.',
        'It conflates the read-only endpoint with the Warehouse.',
        'The SQL analytics endpoint is read-only (SELECT/views). For writes and transactions use a Warehouse.',
        '"The Lakehouse SQL endpoint is read-only; for writes and multi-table transactions I use a Warehouse."'),
      mk('fb-tr-mask', 'Security', 'intermediate', 'Masking fully protects sensitive data',
        'Dynamic data masking is enough to secure PII.',
        'Masking only changes how values display in results.',
        'Masking hides values in query results but not stored data, and users with UNMASK see originals — layer it with CLS/RLS.',
        '"Masking changes result display, not storage, and UNMASK reveals originals — so I pair it with column- and row-level security."'),
      mk('fb-tr-shortcut-copy', 'OneLake', 'beginner', 'Shortcuts copy data in',
        'Creating a shortcut imports the external data into OneLake.',
        'A shortcut is a reference, not a copy.',
        'Shortcuts virtualize external data (S3/ADLS/GCS/OneLake) by reference — queried in place, no duplication.',
        '"Shortcuts are pointers — they virtualize external data in place with no copy, so no extra storage or drift."'),
    ]);
  })();

  /* chain: follow-up chains */
  SE.register('fb-chains', [
    {
      id: 'fb-ch-onelake', area: 'fb-chains', category: 'Architecture', difficulty: 'intermediate',
      title: 'OneLake → one copy → Direct Lake',
      intro: 'From storage foundations up to how BI stays fast and fresh.',
      steps: [
        { q: 'What is OneLake?', a: 'A single, tenant-wide logical lake on ADLS Gen2 — one per tenant — where all Fabric items store data as open Delta/Parquet.' },
        { q: 'Why does "one copy" matter?', a: 'Spark, T-SQL, and Power BI all read the same Delta files, so there\'s no copying/ETL between engines and no drift.' },
        { q: 'How does Power BI read it without importing?', a: 'Direct Lake loads Delta columns from OneLake directly into the engine on demand — import speed, DirectQuery freshness, no duplicate copy.' },
        { q: 'What keeps those reads fast?', a: 'V-Order (write-time Parquet optimization) plus file compaction, and staying within the capacity guardrails.' },
        { q: 'What happens if the model exceeds guardrails?', a: 'Direct Lake falls back to DirectQuery (slower). You reduce the model footprint or move to a larger SKU where guardrails lift.' },
      ] },
  ]);

  /* chain: case study */
  SE.register('fb-case', [
    {
      id: 'fb-case-netflix', area: 'fb-case', category: 'Case Study', difficulty: 'advanced',
      title: 'Design Netflix-style analytics on Fabric (illustrative)',
      intro: 'An end-to-end case on Fabric — raw events to governed, fast dashboards. (Illustrative; Netflix is not a Fabric customer.)',
      steps: [
        { q: 'Events stream in and some data lives in S3 already. How do you land it in Fabric?', a: 'Ingest streams/batches with Data Factory pipelines into a Lakehouse (Bronze); for existing S3 data, create a shortcut so it appears in OneLake without copying.' },
        { q: 'How do you organize transformations?', a: 'Medallion: Bronze (raw) → Silver (cleaned/conformed via notebooks or Dataflows Gen2) → Gold (curated star-schema marts) — all Delta in OneLake.' },
        { q: 'Operational CRM is in Azure SQL. How do you include it?', a: 'Mirror it into OneLake (near-real-time Delta via CDC), then join it with warehouse/lake data using cross-database queries.' },
        { q: 'How do dashboards stay fast and fresh?', a: 'Build a semantic model on the Gold layer bound via Direct Lake; keep Delta V-Ordered/compacted and size the capacity so it stays within guardrails.' },
        { q: 'How do you govern and promote it?', a: 'RLS/CLS/masking on sensitive data, Purview for catalog/lineage/labels, workspaces grouped under a domain, and Git + deployment pipelines (Dev→Test→Prod) for ALM.' },
      ] },
  ]);

  /* chain: cert → interview */
  SE.register('fb-cert-interview', [
    {
      id: 'fb-ci-directlake', area: 'fb-cert-interview', category: 'BI', difficulty: 'intermediate',
      title: 'From "Direct Lake" to the interview',
      intro: 'Turn a cert fact into an interview-quality explanation with follow-ups.',
      steps: [
        { q: 'Cert fact: what are Power BI\'s storage modes in Fabric?', a: 'Import, DirectQuery, and Direct Lake.' },
        { q: 'Interview turn: why is Direct Lake special?', a: 'It reads Delta in OneLake directly into the engine — import speed with DirectQuery freshness and no duplicate copy or scheduled refresh.' },
        { q: 'Follow-up: what are its requirements/limits?', a: 'It needs a Fabric capacity; guardrails (rows, files, model size) scale with the SKU, and it falls back to DirectQuery when exceeded. The model must be in the same region as its data.' },
        { q: 'Follow-up: how do you keep it performing?', a: 'V-Order and compact the Delta, trim columns/partition, and right-size the SKU so you stay within guardrails.' },
      ] },
  ]);

  /* tiered: bad→good→senior */
  SE.register('fb-answers', [
    {
      id: 'fb-ans-wh-lh', area: 'fb-answers', category: 'Architecture', difficulty: 'intermediate',
      title: 'Warehouse vs Lakehouse',
      question: 'What\'s the difference between a Fabric Warehouse and a Lakehouse?',
      bad: 'One is for SQL and one is for Spark.',
      good: 'Both store Delta in OneLake and share the SQL engine; the Warehouse is T-SQL read/write with transactions, the Lakehouse is Spark-first with a read-only SQL endpoint.',
      senior: 'They sit on the same OneLake Delta storage and share the SQL engine, so it\'s one copy of data with two experiences. The Warehouse is the T-SQL experience with full read/write and multi-table transactions over structured data; the Lakehouse is Spark/notebook-first, handles structured and unstructured data, and exposes an auto-generated read-only SQL analytics endpoint. I pick based on the team\'s skills and whether I need transactional writes (Warehouse) or Spark/unstructured processing (Lakehouse) — and I often use both together.',
      why: 'The senior answer stresses the shared storage/engine (one copy), names the concrete capability differences (transactions, read-only endpoint, data types), and gives a selection heuristic.',
      sec30: 'Same OneLake Delta storage and SQL engine; Warehouse = T-SQL read/write + transactions, Lakehouse = Spark-first with a read-only SQL endpoint.',
      sec90: 'Both store Delta in OneLake and share the engine — one copy, two front doors. Warehouse: full T-SQL, read/write, multi-table transactions, structured data. Lakehouse: Spark/notebooks, structured + unstructured, read-only SQL analytics endpoint. Choose by team skillset and whether you need transactional writes vs Spark processing; you can use both.',
      min3: 'In Fabric the Warehouse and Lakehouse are two experiences over the same foundation: both persist data as Delta in OneLake and share the same SQL engine, so there is a single copy of data rather than duplicated stores. The Warehouse is the T-SQL experience — full read and write, multi-table ACID transactions, best for structured, SQL-centric teams and classic data-warehouse patterns. The Lakehouse is Spark-first — notebooks, both structured and unstructured data, and an automatically generated SQL analytics endpoint that is read-only. Because they share storage, a common pattern is to engineer data in the Lakehouse with Spark (medallion Bronze/Silver), then serve it through a Warehouse or straight to Direct Lake semantic models. I choose based on team skills and whether transactional writes or Spark/unstructured processing dominates — and frequently combine both.',
    },
  ]);

  /* design: system design */
  SE.register('fb-design', [
    {
      id: 'fb-design-platform', area: 'fb-design', category: 'Platform', difficulty: 'advanced',
      title: 'Design a Fabric analytics platform',
      requirements: 'Streaming + batch sources (some already in S3, an operational Azure SQL DB), near-real-time dashboards, strong governance, and controlled cost.',
      steps: [
        { prompt: 'How do you bring the varied sources into Fabric?', choices: [
            { text: 'Pipelines for ingest, shortcuts for existing S3, mirroring for the operational DB', correct: true, why: 'Pipelines ingest streams/batches; shortcuts expose S3 with no copy; mirroring replicates the operational DB as Delta in near real time.' },
            { text: 'COPY everything into one Warehouse', correct: false, why: 'Duplicates data and ignores Fabric\'s no-copy options (shortcuts/mirroring).' },
            { text: 'Rebuild sources inside Fabric', correct: false, why: 'Unnecessary and costly.' } ],
          insight: 'Match the mechanism to the source: pipelines (ingest), shortcuts (reference), mirroring (replicate).' },
        { prompt: 'How do you structure transformation?', choices: [
            { text: 'Medallion (Bronze→Silver→Gold) as Delta in OneLake', correct: true, why: 'Progressive refinement gives reliable, governed, business-ready Gold marts.' },
            { text: 'One giant table', correct: false, why: 'No separation of raw vs curated; hard to govern.' },
            { text: 'Transform only in Power BI', correct: false, why: 'Pushes heavy transforms into BI; doesn\'t scale.' } ],
          insight: 'Medallion layers raw → cleaned → business-ready.' },
        { prompt: 'How do you serve fast, fresh, governed BI?', choices: [
            { text: 'Direct Lake semantic model on Gold + RLS/CLS + Purview', correct: true, why: 'Direct Lake gives fast+fresh BI; RLS/CLS/masking secure it; Purview governs catalog/lineage/labels.' },
            { text: 'Import mode nightly refresh', correct: false, why: 'Stale between refreshes and duplicates data.' },
            { text: 'Give everyone admin', correct: false, why: 'Violates least privilege.' } ],
          insight: 'Direct Lake + fine-grained security + Purview governance.' },
      ],
      architecture: 'Pipelines ingest → Lakehouse Bronze; shortcuts expose S3; mirroring replicates Azure SQL. Medallion Bronze→Silver→Gold (Delta in OneLake). Gold feeds a Direct Lake semantic model. Workspaces grouped under a domain; RLS/CLS/masking + Purview; Git + deployment pipelines for ALM; right-sized F-SKU with pause/resume.',
      tradeoffs: 'Direct Lake guardrails vs model size; single shared capacity vs isolating noisy workloads; mirroring freshness vs source load.',
      failureModes: 'Direct Lake fallback to DirectQuery, capacity throttling from a heavy job, and SQL endpoint metadata lag — monitor the Capacity Metrics app.',
      cost: 'Right-size the F-SKU, pause when idle, rely on bursting/smoothing, and keep Delta compacted/V-Ordered to stay within guardrails.' },
  ]);

  /* design: security design */
  SE.register('fb-security', [
    {
      id: 'fb-sec-model', area: 'fb-security', category: 'Security', difficulty: 'intermediate',
      title: 'Secure a Fabric warehouse for mixed audiences',
      requirements: 'Analysts (no PII), regional managers (only their region), and external auditors (read two tables). Enforce least privilege.',
      steps: [
        { prompt: 'Regional managers must see only their rows. How?', choices: [
            { text: 'Row-level security (security predicate by region)', correct: true, why: 'RLS filters rows per user identity/role transparently on every query.' },
            { text: 'Separate copies per region', correct: false, why: 'Duplicates data and drifts.' },
            { text: 'Ask them to filter manually', correct: false, why: 'Not enforcement.' } ],
          insight: 'RLS = which rows, enforced automatically.' },
        { prompt: 'Analysts must not see PII columns, but values should still partly show for support staff. How?', choices: [
            { text: 'Column-level security to block PII; dynamic data masking for partial display', correct: true, why: 'CLS blocks columns entirely; masking shows partial values (UNMASK reveals originals) — layer them.' },
            { text: 'Dynamic data masking alone', correct: false, why: 'Masking isn\'t full protection; users could still infer or UNMASK.' },
            { text: 'Drop the PII columns', correct: false, why: 'Other roles need them.' } ],
          insight: 'Combine CLS (hide) + masking (obscure) — masking alone is insufficient.' },
        { prompt: 'External auditors need read access to two tables only. How?', choices: [
            { text: 'Grant least-privilege read on those tables (and govern with Purview)', correct: true, why: 'Scope access to exactly what\'s needed; Purview labels/lineage support audit.' },
            { text: 'Make them workspace Admins', correct: false, why: 'Massively over-privileged.' },
            { text: 'Email CSV extracts', correct: false, why: 'Ungoverned and stale.' } ],
          insight: 'Least-privilege grants + Purview governance for auditability.' },
      ],
      architecture: 'RLS by region, CLS to block PII, dynamic data masking for partial display (UNMASK for support), least-privilege grants for auditors, and Purview for classification/labels/lineage. OneLake security + workspace roles underpin it.',
      tradeoffs: 'Masking convenience vs true protection (pair with CLS/RLS); granularity vs management overhead.',
      failureModes: 'Relying on masking alone, privilege creep, and forgotten PII columns — audit grants and labels regularly.',
      cost: 'Security features add governance effort, not compute cost.' },
  ]);

  /* design: data loading */
  SE.register('fb-loading', [
    {
      id: 'fb-load-strategy', area: 'fb-loading', category: 'Ingestion', difficulty: 'intermediate',
      title: 'Design ingestion for mixed sources',
      requirements: 'Daily batch files, a streaming feed, existing S3 data, and an operational database — minimize copies and keep BI fresh.',
      steps: [
        { prompt: 'Existing data already sits in Amazon S3. Best way to use it?', choices: [
            { text: 'Create a shortcut to S3 (no copy)', correct: true, why: 'Shortcuts virtualize S3 into OneLake without copying — query in place.' },
            { text: 'Nightly copy job from S3', correct: false, why: 'Duplicates storage and adds latency/cost.' },
            { text: 'Export to CSV and re-import', correct: false, why: 'Slow and lossy.' } ],
          insight: 'Use shortcuts for data that already lives elsewhere.' },
        { prompt: 'The operational Azure SQL DB must be analyzable with low latency. How?', choices: [
            { text: 'Mirror it into OneLake (near-real-time Delta)', correct: true, why: 'Mirroring replicates via CDC with no pipelines and no CU cost for sync.' },
            { text: 'Query production directly from BI', correct: false, why: 'Risks the operational system.' },
            { text: 'Nightly full export', correct: false, why: 'Stale and heavy.' } ],
          insight: 'Mirroring gives fresh operational data without ETL.' },
        { prompt: 'Batch + streaming files need transformation into curated tables. How?', choices: [
            { text: 'Pipelines + Dataflows Gen2/notebooks into a medallion Lakehouse', correct: true, why: 'Pipelines orchestrate; dataflows/notebooks transform Bronze→Silver→Gold as Delta.' },
            { text: 'Transform in Power BI only', correct: false, why: 'Doesn\'t scale and recomputes per report.' },
            { text: 'Load raw straight to Gold', correct: false, why: 'Skips cleaning/conforming.' } ],
          insight: 'Pipelines orchestrate; dataflows/notebooks do the medallion transforms.' },
      ],
      architecture: 'Shortcuts for S3, mirroring for the operational DB, pipelines + Dataflows Gen2/notebooks for batch/stream into a medallion Lakehouse (Delta in OneLake), Gold served via Direct Lake.',
      tradeoffs: 'No-copy (shortcut/mirror) vs materialized (COPY-like) performance; dataflow low-code vs notebook flexibility.',
      failureModes: 'Over-copying data, SQL endpoint metadata lag, and mirroring source load — monitor and order orchestration correctly.',
      cost: 'Prefer no-copy options (shortcuts/mirroring) to avoid duplicate storage; mirroring sync doesn\'t consume CUs.' },
  ]);

  /* mock: chain across topics */
  SE.register('fb-mock', [
    {
      id: 'fb-mock-1', area: 'fb-mock', category: 'Mock', difficulty: 'intermediate',
      title: 'Fabric mock interview (rapid round)',
      intro: 'A rapid mixed round across OneLake, storage, BI, and governance. Answer each, then reveal a strong response.',
      steps: [
        { q: 'What is OneLake and why does it matter?', a: 'One tenant-wide logical lake on ADLS Gen2 storing everything as open Delta. It means one copy of data for all engines (Spark, T-SQL, Direct Lake) — no copying or drift.' },
        { q: 'Warehouse vs Lakehouse?', a: 'Same OneLake Delta storage and SQL engine; Warehouse is T-SQL read/write with transactions, Lakehouse is Spark-first with a read-only SQL endpoint.' },
        { q: 'How does Power BI stay fast and fresh?', a: 'Direct Lake reads Delta in OneLake directly — import speed, DirectQuery freshness, no copy — with V-Order keeping reads fast and guardrails tied to the SKU.' },
        { q: 'How do you bring in S3 data and an operational DB?', a: 'Shortcut the S3 data (no copy) and mirror the operational DB into OneLake as near-real-time Delta; then join via cross-database queries.' },
        { q: 'How is compute bought and shared?', a: 'A capacity (F-SKU) measured in CUs, shared by all workloads, with bursting/smoothing and pause/resume to control cost.' },
        { q: 'How do you secure and govern it?', a: 'RLS/CLS/dynamic data masking on the warehouse, Purview for catalog/lineage/sensitivity labels, workspaces under domains, and Git + deployment pipelines for ALM.' },
      ] },
  ]);
})();
