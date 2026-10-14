/* ============================================================
   Redshift — scenario banks for the practice/interview labs.
   Registered into the shared ScenarioEngine under distinct rs-*
   areas so they never collide with Snowflake's scenarios.
   Content is authentic and aligned with AWS documentation.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const SE = viz.ScenarioEngine;
  if (!SE) return;

  /* ── investigation: Troubleshooting ─────────────────────── */
  SE.register('rs-troubleshooting', [
    {
      id: 'rs-ts-disk-full', area: 'rs-troubleshooting', category: 'Storage', difficulty: 'intermediate',
      title: 'Queries fail with "Disk Full" during a big join',
      symptom: 'A nightly join between two large tables started failing with disk-full errors on a cluster that used to have plenty of headroom.',
      steps: [
        { prompt: 'What do you check first?', choices: [
            { text: 'Immediately add nodes (resize up)', correct: false, why: 'Resizing before diagnosis is guessing and costs money. Disk-full during a join is usually intermediate spill from a bad plan, not raw capacity.' },
            { text: 'Check SVL_QUERY_SUMMARY / the plan for large intermediate results and redistribution', correct: true, why: 'System views show steps that spill and whether rows are being redistributed (DS_DIST_BOTH). That pinpoints the cause before you spend on hardware.' },
            { text: 'Run VACUUM', correct: false, why: 'VACUUM reclaims deleted-row space; it does not fix an intermediate spill caused by redistribution during a join.' } ],
          evidence: 'The step detail shows a hash join redistributing both sides (DS_DIST_BOTH) and producing a huge intermediate set.',
          insight: 'Disk-full during joins is usually intermediate spill from redistribution, not table size.',
          wrongAssumption: 'That disk-full always means "add storage/nodes".' },
        { prompt: 'Both tables redistribute on the join. What fixes it?', choices: [
            { text: 'Distribute both tables on the join key (or DISTSTYLE ALL the small one)', correct: true, why: 'Co-locating join partners on the same slice (DS_DIST_NONE) eliminates redistribution and the intermediate spill. Small dimensions can be ALL.' },
            { text: 'Add a sort key on an unrelated column', correct: false, why: 'Sort keys help scan pruning, not join redistribution.' },
            { text: 'Disable result caching', correct: false, why: 'Unrelated to spill.' } ],
          evidence: 'After setting DISTKEY on the shared join column, EXPLAIN shows DS_DIST_NONE and the join no longer spills.',
          insight: 'Co-located joins (matching DISTKEY) avoid network redistribution and the spill that follows.',
          wrongAssumption: 'That sort keys influence join data movement.' },
      ],
      rootCause: 'The two tables were distributed differently, so the join redistributed both sides across the network, creating a large intermediate result that spilled to disk.',
      resolution: 'Distribute both large tables on the join key (DISTSTYLE KEY / DISTKEY), or replicate the small dimension with DISTSTYLE ALL. Confirm EXPLAIN shows DS_DIST_NONE.',
      prevention: 'Design distribution keys around your biggest joins; review EXPLAIN for DS_DIST_BOTH in code review; keep statistics fresh with ANALYZE so the planner estimates correctly.',
      interviewAnswer: 'Disk-full during a join is almost always intermediate spill from redistribution, not raw capacity. I would read the plan/SVL views, see DS_DIST_BOTH, and fix it by distributing both tables on the join key (or ALL for the small side) so the join co-locates and stops spilling — rather than resizing the cluster.' },
    {
      id: 'rs-ts-slow-after-load', area: 'rs-troubleshooting', category: 'Performance', difficulty: 'intermediate',
      title: 'A fast query gets slow after heavy loads/deletes',
      symptom: 'A dashboard query degraded over a week of frequent COPY loads and deletes, even though data volume barely changed.',
      steps: [
        { prompt: 'Likely cause?', choices: [
            { text: 'Unsorted rows and dead space from deletes weaken zone-map pruning', correct: true, why: 'New rows land unsorted and deleted rows linger until vacuumed, so per-block min/max ranges widen and fewer blocks can be skipped.' },
            { text: 'The leader node is overloaded', correct: false, why: 'Nothing indicates leader contention; the regression tracks load/delete activity.' },
            { text: 'Result cache is full', correct: false, why: 'The cache does not degrade scan efficiency.' } ],
          evidence: 'SVV_TABLE_INFO shows high unsorted % and stale stats on the table.',
          insight: 'Load order and dead rows directly affect zone-map effectiveness.',
          wrongAssumption: 'That Redshift keeps tables perfectly sorted automatically in all cases.' },
      ],
      rootCause: 'Frequent loads left rows unsorted and deletes left dead space, so zone maps pruned fewer blocks and the planner used stale statistics.',
      resolution: 'Run VACUUM (FULL or SORT ONLY) to restore sort order and reclaim space, and ANALYZE to refresh statistics. Rely on auto-maintenance plus scheduled runs after big batches.',
      prevention: 'Load pre-sorted by the sort key where possible, batch deletes, and let auto-vacuum/auto-analyze run — supplement with manual VACUUM/ANALYZE after large operations.',
      interviewAnswer: 'Frequent loads and deletes leave rows unsorted and dead space behind, so zone maps prune fewer 1 MB blocks and stats go stale. I would confirm with SVV_TABLE_INFO, then VACUUM to restore sort order and ANALYZE to refresh stats — and load pre-sorted going forward.' },
  ]);

  /* ── investigation: Redshift + Data Engineering ─────────── */
  SE.register('rs-de', [
    {
      id: 'rs-de-copy-slow', area: 'rs-de', category: 'Ingestion', difficulty: 'intermediate',
      title: 'COPY from S3 is far slower than expected',
      symptom: 'A nightly COPY of a large dataset from S3 takes hours and only seems to use part of the cluster.',
      steps: [
        { prompt: 'The data is one giant gzip file. Why is COPY slow?', choices: [
            { text: 'A single file cannot be split across slices, so only one slice loads it', correct: true, why: 'COPY parallelizes by file across slices. One file = one slice doing the work while the rest idle.' },
            { text: 'gzip is unsupported', correct: false, why: 'gzip is supported; the problem is file count, not compression.' },
            { text: 'The table needs an index', correct: false, why: 'Redshift has no user indexes; that is not the issue.' } ],
          evidence: 'Load metrics show one slice saturated and the others idle.',
          insight: 'COPY parallelism scales with the number of files, ideally a multiple of the total slice count.',
          wrongAssumption: 'That one big file loads as fast as many small ones.' },
      ],
      rootCause: 'The source was a single large file, so COPY could not distribute the load across slices.',
      resolution: 'Split the input into multiple files (ideally a multiple of the slice count), keep them similarly sized, and COPY the prefix so all slices load in parallel.',
      prevention: 'Produce slice-aligned, evenly sized, compressed files from upstream; use columnar formats (Parquet) where possible.',
      interviewAnswer: 'COPY parallelizes by file across slices, so a single big file pins the load to one slice. I would split the source into many evenly sized files — ideally a multiple of the slice count — and COPY the prefix so every slice loads in parallel.' },
  ]);

  /* ── decision: Query Optimization ───────────────────────── */
  SE.register('rs-query-opt', [
    {
      id: 'rs-qo-fulltablescan', area: 'rs-query-opt', category: 'Pruning', difficulty: 'intermediate',
      title: 'A date-filtered query scans the whole table', tag: '🔎 Optimize',
      scenario: 'SELECT ... WHERE watch_date >= current_date - 7 scans every block even though it needs one week of a multi-year table.',
      question: 'Best first fix?',
      choices: [
        { text: 'Add more nodes', correct: false },
        { text: 'Make watch_date the sort key so zone maps can skip old blocks', correct: true },
        { text: 'Switch to DISTSTYLE ALL', correct: false } ],
      rationale: {
        fit: 'The filter is a range on a date column. If the table is sorted on that column, each 1 MB block holds a tight date range and zone maps skip everything outside the last 7 days.',
        alternatives: [
          { name: 'Add nodes', why: 'Scans the same data faster and costs more — it does not reduce blocks read.' },
          { name: 'DISTSTYLE ALL', why: 'Replication is about join locality, not range-scan pruning.' } ],
        performance: 'A sort key on the filter column turns a full scan into a tiny block range.',
        cost: 'Sorting is a one-time/maintenance cost; the per-query savings recur forever.',
        tradeoffs: 'Pick the sort key to match your dominant range filter; maintain with VACUUM.',
        whenAltApplies: 'More nodes help only when the workload is genuinely compute/concurrency-bound.' },
      interviewAnswer: 'A range filter scanning everything is a pruning problem. I would sort the table on watch_date so zone maps skip blocks outside the window — not add nodes, which just scans the same blocks faster.' },
    {
      id: 'rs-qo-redistribution', area: 'rs-query-opt', category: 'Joins', difficulty: 'advanced',
      title: 'EXPLAIN shows DS_DIST_BOTH on the main join', tag: '🔎 Optimize',
      scenario: 'A fact-to-dimension join redistributes both sides every run, dominating query time.',
      question: 'Most effective change?',
      choices: [
        { text: 'Co-locate the join: DISTKEY both on the join column (or ALL the dimension)', correct: true },
        { text: 'Add an interleaved sort key', correct: false },
        { text: 'Enable concurrency scaling', correct: false } ],
      rationale: {
        fit: 'DS_DIST_BOTH means neither side is co-located. Distributing both on the join key (DS_DIST_NONE) — or replicating the small dimension with ALL — removes the network shuffle.',
        alternatives: [
          { name: 'Interleaved sort key', why: 'Affects scan pruning, not join redistribution.' },
          { name: 'Concurrency scaling', why: 'Adds capacity for many queries; it does not fix one query\'s shuffle.' } ],
        performance: 'Co-located joins avoid moving data across the network — often the single biggest win.',
        cost: 'Free beyond a redesign of distribution; no extra compute.',
        tradeoffs: 'A table has one DISTKEY — optimize it for the dominant/largest join.',
        whenAltApplies: 'Concurrency scaling is right when many queries queue, not for one slow join.' },
      interviewAnswer: 'DS_DIST_BOTH means the join is not co-located. I would distribute both tables on the join key (or ALL the small dimension) to get DS_DIST_NONE and eliminate the network shuffle, which usually dominates the runtime.' },
  ]);

  /* ── decision: Cost ─────────────────────────────────────── */
  SE.register('rs-cost', [
    {
      id: 'rs-co-spiky', area: 'rs-cost', category: 'Sizing', difficulty: 'intermediate',
      title: 'Unpredictable, spiky analytics workload', tag: '💰 Cost decision',
      scenario: 'A team runs heavy analytics for a few hours a day and nothing overnight. A fixed provisioned cluster sits idle most of the time.',
      question: 'Most cost-effective choice?',
      choices: [
        { text: 'Keep a large provisioned cluster running 24/7', correct: false },
        { text: 'Use Redshift Serverless (pay per second while active)', correct: true },
        { text: 'Use the smallest provisioned cluster and never resize', correct: false } ],
      rationale: {
        fit: 'Spiky, intermittent workloads fit Serverless: capacity auto-scales and you pay per-second only while queries run, with nothing charged when idle.',
        alternatives: [
          { name: '24/7 provisioned', why: 'Pays for compute during long idle periods.' },
          { name: 'Tiny fixed cluster', why: 'Cheap but too slow during the daily spike.' } ],
        performance: 'Serverless scales up for the spike and down after.',
        cost: 'Per-second billing on active RPU-hours only; no idle compute charge.',
        tradeoffs: 'For steady, predictable load, provisioned RA3 (optionally reserved) can be cheaper.',
        whenAltApplies: 'Choose provisioned when utilization is high and predictable.' },
      interviewAnswer: 'A spiky, mostly-idle workload is the textbook case for Serverless: it auto-scales for the daily spike and bills per second only while active, so you stop paying for idle compute. Steady high utilization would favor provisioned RA3 with reserved pricing instead.' },
    {
      id: 'rs-co-concurrency', area: 'rs-cost', category: 'Concurrency', difficulty: 'intermediate',
      title: '200 users at 9am, fast queries but long queues', tag: '💰 Cost decision',
      scenario: 'Each query is quick, but at peak everyone waits in a queue on the provisioned cluster.',
      question: 'Best fix?',
      choices: [
        { text: 'Resize the cluster to a much larger node count permanently', correct: false },
        { text: 'Turn on concurrency scaling for the queue', correct: true },
        { text: 'Rewrite every query', correct: false } ],
      rationale: {
        fit: 'The bottleneck is concurrency, not per-query speed. Concurrency scaling adds transient clusters during the burst and removes them after — and daily free credits often cover it.',
        alternatives: [
          { name: 'Permanent big cluster', why: 'Pays for peak capacity all day for a short burst.' },
          { name: 'Rewrite queries', why: 'Queries are already fast; the issue is queueing.' } ],
        performance: 'Extra clusters clear the queue during the spike.',
        cost: 'Free credits accrue daily; only overflow beyond credits is billed per second.',
        tradeoffs: 'Mostly benefits read queries; not for temp-table workloads.',
        whenAltApplies: 'Permanent resize makes sense only if the cluster is consistently saturated.' },
      interviewAnswer: 'Fast queries but long queues is a concurrency problem, so I would enable concurrency scaling on the queue — transient clusters absorb the 9am burst and go away after, with daily free credits often covering it. A permanent larger cluster would pay for peak capacity all day.' },
  ]);

  /* ── decision: Feature Decisions ────────────────────────── */
  SE.register('rs-decisions', [
    {
      id: 'rs-dec-spectrum-vs-copy', area: 'rs-decisions', category: 'Architecture', difficulty: 'intermediate',
      title: 'Query 5 years of cold history occasionally', tag: '⚖️ Decision',
      scenario: 'Analysts rarely query 5 years of raw event history already sitting in S3 as Parquet; hot data is the last 90 days.',
      question: 'How should the cold history be accessed?',
      choices: [
        { text: 'COPY all 5 years into Redshift', correct: false },
        { text: 'Query it in place with Redshift Spectrum external tables', correct: true },
        { text: 'Export it to CSV first', correct: false } ],
      rationale: {
        fit: 'Rarely queried cold data in S3 is ideal for Spectrum: no loading or storage duplication, billed only for data scanned, and it joins with hot local tables.',
        alternatives: [
          { name: 'COPY everything', why: 'Pays to store/maintain rarely used data in the warehouse.' },
          { name: 'Export to CSV', why: 'Adds a slow, lossy hop; Parquet is already query-ready.' } ],
        performance: 'Partition + columnar Parquet keep Spectrum scans small.',
        cost: 'Pay per TB scanned, not to store it twice.',
        tradeoffs: 'Hot, frequently joined data still belongs local for best speed.',
        whenAltApplies: 'Load into Redshift when data becomes hot and frequently queried.' },
      interviewAnswer: 'Cold, rarely queried history already in S3 is a Spectrum case: query it in place via external tables, pay only for data scanned, and join it with hot local tables — rather than paying to COPY and store 5 years you seldom touch.' },
  ]);

  /* ── sql: SQL scenarios ─────────────────────────────────── */
  SE.register('rs-sql', [
    {
      id: 'rs-sql-dedup', area: 'rs-sql', category: 'Deduplication', difficulty: 'intermediate',
      title: 'Keep the latest row per key',
      scenario: 'A staging table has duplicate rows per user_id from an at-least-once source. Keep only the latest by updated_at.',
      steps: [
        { q: 'Write SQL to keep the latest row per user_id.',
          sql: "SELECT *\nFROM (\n  SELECT *,\n         ROW_NUMBER() OVER (PARTITION BY user_id\n                            ORDER BY updated_at DESC) AS rn\n  FROM staging_users\n) WHERE rn = 1;",
          a: 'Redshift supports window functions but not QUALIFY, so wrap ROW_NUMBER() in a subquery and filter rn = 1 to keep the newest row per key.' },
        { q: 'How do you load it idempotently into the clean table?',
          sql: "BEGIN;\nDELETE FROM users_clean\nUSING stg_latest s\nWHERE users_clean.user_id = s.user_id;\nINSERT INTO users_clean SELECT * FROM stg_latest;\nCOMMIT;",
          a: 'Redshift\'s idiomatic upsert is a staging table + DELETE-then-INSERT inside a transaction (the documented MERGE/upsert pattern). Re-running converges to the same final state.' },
      ] },
    {
      id: 'rs-sql-topn', area: 'rs-sql', category: 'Windowing', difficulty: 'intermediate',
      title: 'Top 3 titles per country by minutes',
      scenario: 'Rank titles within each country and keep the top 3 by total minutes watched.',
      steps: [
        { q: 'Write the ranking query.',
          sql: "SELECT country, title_id, total_minutes\nFROM (\n  SELECT country, title_id,\n         SUM(minutes) AS total_minutes,\n         RANK() OVER (PARTITION BY country\n                      ORDER BY SUM(minutes) DESC) AS rnk\n  FROM watch_events\n  GROUP BY country, title_id\n) WHERE rnk <= 3;",
          a: 'Aggregate per (country, title), then RANK() within each country by the aggregate, and filter in an outer query since Redshift lacks QUALIFY.' },
      ] },
  ]);

  /* ── traps: Interview traps ─────────────────────────────── */
  (function () {
    const mk = (id, category, difficulty, title, myth, whyWrong, correct, interviewSafe) =>
      ({ id, area: 'rs-traps', category, difficulty, title, myth, whyWrong, correct, interviewSafe });
    SE.register('rs-traps', [
      mk('rs-tr-indexes', 'Architecture', 'beginner', 'Redshift uses B-tree indexes',
        'You speed up Redshift queries by adding indexes like in PostgreSQL.',
        'Although Redshift speaks PostgreSQL, it has no user B-tree indexes. People map OLTP habits onto an MPP columnar engine.',
        'Redshift skips data using zone maps (per-1 MB-block min/max) plus sort keys and distribution keys — not indexes.',
        '"Redshift has no indexes — performance comes from sort keys driving zone-map block-skipping and distribution keys avoiding redistribution."'),
      mk('rs-tr-bignode', 'Performance', 'intermediate', 'More nodes always = faster',
        'Adding nodes always makes a slow query faster.',
        'It assumes every slow query is compute-bound. Often it is poor pruning or join redistribution.',
        'More nodes add parallelism/capacity, but a full-table scan or DS_DIST_BOTH join just runs the same inefficiency faster. Diagnose the plan first.',
        '"More nodes help compute/concurrency-bound work, but if the plan shows a full scan or redistribution, I fix sort/dist keys first — nodes just scan the same data faster."'),
      mk('rs-tr-sortall', 'Modeling', 'intermediate', 'Sort key = index on any column',
        'A sort key works like an index, so filtering any sort column is fast.',
        'Compound sort keys only prune well on a leading prefix; a filter on a non-leading column alone helps little.',
        'Use compound sort keys matching your dominant filter prefix; use interleaved (≤8 cols) only when queries filter varied secondary columns — and maintain it with VACUUM REINDEX.',
        '"Compound sort keys prune on a prefix; for varied secondary filters I\'d consider interleaved, knowing it needs VACUUM REINDEX."'),
      mk('rs-tr-vacuum', 'Maintenance', 'beginner', 'VACUUM and ANALYZE are the same',
        'VACUUM and ANALYZE do roughly the same housekeeping.',
        'They solve different problems and are often conflated.',
        'VACUUM reclaims deleted space and restores sort order; ANALYZE refreshes the planner statistics. You usually need both after big changes.',
        '"VACUUM reclaims space and re-sorts; ANALYZE refreshes stats for the planner — different jobs, both needed after large loads/deletes."'),
      mk('rs-tr-serverless-free', 'Cost', 'beginner', 'Serverless is always cheaper',
        'Redshift Serverless is always cheaper than provisioned.',
        'It ignores utilization. Serverless shines for spiky/idle workloads, not steady high load.',
        'Serverless bills per second while active (great for intermittent use). Steady, high-utilization workloads are often cheaper on provisioned RA3 with reserved pricing.',
        '"Serverless wins for spiky, idle-heavy workloads; steady high utilization is usually cheaper on reserved provisioned RA3."'),
    ]);
  })();

  /* ── chain: Follow-up chains ────────────────────────────── */
  SE.register('rs-chains', [
    {
      id: 'rs-ch-dist', area: 'rs-chains', category: 'Architecture', difficulty: 'intermediate',
      title: 'Distribution → joins → skew',
      intro: 'The interviewer starts simple and drills into how distribution governs join performance.',
      steps: [
        { q: 'What does a table\'s distribution style control?', a: 'Which slice stores each row. KEY places by a column hash, EVEN spreads round-robin, ALL replicates to every node, and AUTO lets Redshift choose and adapt as the table grows.' },
        { q: 'Why does it matter for joins?', a: 'If two tables share a DISTKEY on the join column, matching rows are co-located on the same slice and the join needs no data movement (DS_DIST_NONE). Otherwise Redshift redistributes rows across the network (DS_DIST_BOTH), which is expensive.' },
        { q: 'How do you spot a redistribution problem?', a: 'EXPLAIN shows DS_DIST_BOTH or DS_DIST_INNER/OUTER on the join, and system views show large intermediate results or spill.' },
        { q: 'What is distribution skew and why is it bad?', a: 'When a KEY column\'s values are uneven, one slice holds disproportionately many rows and becomes the bottleneck for the whole query, since steps finish only when the slowest slice does.' },
        { q: 'How do you choose a good DISTKEY?', a: 'Pick the column used in the largest/most frequent join, with high cardinality and even distribution. Replicate small dimensions with ALL; use AUTO/EVEN when no single join key dominates.' },
      ] },
  ]);

  /* ── chain: Architecture failure walkthrough ────────────── */
  SE.register('rs-failure', [
    {
      id: 'rs-fail-skew', area: 'rs-failure', category: 'Failure Modes', difficulty: 'advanced',
      title: 'One slice at 100%, the rest idle',
      intro: 'Walk through how a distribution choice can make a cluster behave as if it were tiny.',
      steps: [
        { q: 'Symptom: a query is slow and monitoring shows one slice pinned at 100% while others idle. What is happening?', a: 'Distribution skew — the DISTKEY column is lopsided, so one slice holds most of the rows and does most of the work. The query can only finish when that slice does.' },
        { q: 'Why does MPP make this especially damaging?', a: 'MPP performance depends on balanced parallelism; a single hot slice removes the parallelism advantage, so a large cluster performs like a single node for that query.' },
        { q: 'How do you confirm it?', a: 'Check per-slice row counts (e.g. SVV_TABLE_INFO skew metrics / system tables) — a high skew ratio on the table confirms uneven distribution.' },
        { q: 'How do you remediate?', a: 'Re-distribute on a higher-cardinality, evenly spread column, or use EVEN/AUTO if no good join key exists; replicate small dimensions with ALL.' },
        { q: 'How do you prevent recurrence?', a: 'Review distribution during data modeling, monitor skew on large tables, and prefer AUTO distribution when unsure so Redshift adapts.' },
      ] },
  ]);

  /* ── chain: E2E case study ──────────────────────────────── */
  SE.register('rs-case', [
    {
      id: 'rs-case-netflix', area: 'rs-case', category: 'Case Study', difficulty: 'advanced',
      title: 'Design Netflix-style playback analytics on Redshift',
      intro: 'A full end-to-end case: from raw events to fast dashboards, defended step by step.',
      steps: [
        { q: 'Events arrive continuously in S3 as Parquet. How do you ingest?', a: 'Batch with COPY from S3 into staging, splitting files to a multiple of the slice count for parallelism; for very cold history, leave it in S3 and read via Spectrum instead of loading.' },
        { q: 'How do you model the fact table for performance?', a: 'Distribute the large fact (watch_events) on the main join key (e.g. user_id or title_id), sort on the dominant range filter (watch_date), and replicate small dimensions with DISTSTYLE ALL.' },
        { q: 'Dashboards re-run the same heavy aggregates all morning. How do you keep them fast?', a: 'Create materialized views for the common aggregates with AUTO REFRESH; result caching serves identical repeats instantly; concurrency scaling absorbs the 9am burst.' },
        { q: 'Finance (another account) needs read access to curated tables. How?', a: 'Publish a datashare from the producer; Finance queries it live and read-only with their own compute — no copies, no ETL, isolated from the producer.' },
        { q: 'How do you govern access and cost?', a: 'IAM role for S3/Glue access, database RBAC with least-privilege roles (column/row-level where needed), Lake Formation for lake permissions, and right-sized compute (RA3 reserved for steady load, Serverless for spiky teams).' },
      ] },
  ]);

  /* ── chain: Cert → interview bridge ─────────────────────── */
  SE.register('rs-cert-interview', [
    {
      id: 'rs-ci-storage', area: 'rs-cert-interview', category: 'Storage', difficulty: 'intermediate',
      title: 'From "columnar + zone maps" to the interview',
      intro: 'Turn a certification fact into an interview-quality explanation with follow-ups.',
      steps: [
        { q: 'Cert fact: how does Redshift store data physically?', a: 'Column-by-column in 1 MB immutable blocks, with per-block min/max metadata (zone maps).' },
        { q: 'Interview turn: why does that make analytics fast?', a: 'Queries read only the referenced columns, and zone maps let range-restricted predicates skip blocks that cannot match — far less I/O than a row store.' },
        { q: 'Follow-up: how do you make zone maps more effective?', a: 'Sort the table on the dominant filter column so each block holds a tight value range, maximizing skipping; maintain with VACUUM.' },
        { q: 'Follow-up: what if filters vary across many columns?', a: 'Consider an interleaved sort key (up to 8 columns, equal weight), accepting that it needs VACUUM REINDEX as it skews.' },
      ] },
  ]);

  /* ── tiered: bad → good → senior ────────────────────────── */
  SE.register('rs-answers', [
    {
      id: 'rs-ans-slow', area: 'rs-answers', category: 'Performance', difficulty: 'intermediate',
      title: 'Optimizing a slow Redshift query',
      question: 'How do you optimize a slow Redshift query?',
      bad: 'Add more nodes.',
      good: 'Look at EXPLAIN and the system views to find the bottleneck, then fix that specific thing.',
      senior: 'I diagnose before acting. I read EXPLAIN and SVL/SVV views for four signals: pruning (is it scanning far more blocks than needed → sort key / sorted load), join redistribution (DS_DIST_BOTH → co-locate on the join key or ALL the small dimension), spill (intermediate results spilling → fix join grain/distribution, or add memory), and concurrency (queue time → concurrency scaling). Only if a correct plan is genuinely compute-bound do I add capacity.',
      why: 'The senior answer leads with a diagnostic method and maps each symptom to a specific lever, explicitly rejecting a blind resize.',
      sec30: 'Read EXPLAIN/system views, find the bottleneck — pruning, redistribution, spill, or concurrency — and fix that, not resize blindly.',
      sec90: 'Diagnose first: pruning problems → sort key/sorted load; DS_DIST_BOTH joins → co-locate on the join key or ALL the dimension; spill → fix grain/distribution; queueing → concurrency scaling. Resize only a correct-but-compute-bound plan.',
      min3: 'Query tuning in Redshift is diagnosis before action. I open EXPLAIN and the SVL/SVV views and read four things. Pruning: if a range filter scans most blocks, the table is not sorted on that column, so I set the sort key or load sorted. Join distribution: DS_DIST_BOTH means the join is not co-located, so I distribute both tables on the join key or replicate the small dimension with ALL. Spill: large intermediate results spilling usually mean a redistribution or grain problem, which I fix rather than masking with hardware. Concurrency: high queue time means I enable concurrency scaling. Only a correct plan that is truly compute-bound justifies more nodes, because resizing an inefficient query just runs the inefficiency faster and costs more.' },
  ]);

  /* ── design: System design simulators ───────────────────── */
  SE.register('rs-design', [
    {
      id: 'rs-design-platform', area: 'rs-design', category: 'Platform', difficulty: 'advanced',
      title: 'Design a Redshift analytics platform for streaming + BI',
      requirements: 'Clickstream/playback events land in S3 as Parquet; analysts need daily/near-daily dashboards; a separate team needs read access; keep BI responsive during loads and control cost.',
      steps: [
        { prompt: 'How do you store hot vs cold data?', choices: [
            { text: 'Load hot (90 days) into RA3; keep cold history in S3 and read via Spectrum', correct: true, why: 'Hot data local for speed, cold data in S3 queried in place — pay to store once and scan cold data only when needed.' },
            { text: 'COPY all history into Redshift', correct: false, why: 'Pays to store and maintain rarely used data.' },
            { text: 'Keep everything in S3 and always use Spectrum', correct: false, why: 'Hot, frequently joined data is faster and cheaper local.' } ],
          insight: 'Tier storage: hot in RA3/RMS, cold in S3 via Spectrum.' },
        { prompt: 'How do you model the big fact table?', choices: [
            { text: 'DISTKEY on the main join column, SORTKEY on watch_date, ALL for small dims', correct: true, why: 'Co-locates the dominant join, enables zone-map pruning on the date filter, and avoids redistributing small dimensions.' },
            { text: 'EVEN distribution, no sort key', correct: false, why: 'Balanced load but joins redistribute and range filters scan everything.' },
            { text: 'DISTSTYLE ALL on the fact', correct: false, why: 'Replicating a huge fact to every node is wasteful and slow.' } ],
          insight: 'Distribute for the biggest join, sort for the dominant filter, replicate small dims.' },
        { prompt: 'How do you keep BI responsive during ingestion and bursts?', choices: [
            { text: 'Separate WLM queues + concurrency scaling; materialized views + result cache for dashboards', correct: true, why: 'Queues isolate ETL from BI, concurrency scaling absorbs bursts, and MVs/result cache cut repeated work.' },
            { text: 'One queue for everything', correct: false, why: 'ETL and BI contend, so dashboards wait behind loads.' },
            { text: 'Throttle analysts at peak', correct: false, why: 'Degrades the experience instead of isolating workloads.' } ],
          insight: 'Isolate with WLM, absorb bursts with concurrency scaling, precompute with MVs.' },
      ],
      architecture: 'S3 (Parquet) → COPY hot 90 days into RA3; cold history via Spectrum. Fact DISTKEY on join column, SORTKEY on watch_date, dims ALL. WLM queues isolate ETL vs BI; concurrency scaling for bursts; materialized views + result cache for dashboards. Cross-team access via a datashare.',
      tradeoffs: 'RA3 reserved for steady load vs Serverless for spiky teams; MV refresh cost vs dashboard speed; Spectrum scan cost vs local storage cost.',
      failureModes: 'Distribution skew on the fact, DS_DIST_BOTH joins, MV refresh falling behind, and Spectrum scanning unpartitioned data — partition the lake and monitor skew.',
      cost: 'Reserved RA3 for the steady core, Serverless for bursty teams, concurrency-scaling credits for peaks, and partitioned Parquet to minimize Spectrum bytes scanned.' },
  ]);

  /* ── design: RBAC design lab ────────────────────────────── */
  SE.register('rs-rbac', [
    {
      id: 'rs-rbac-model', area: 'rs-rbac', category: 'Security', difficulty: 'intermediate',
      title: 'Model least-privilege access for three teams',
      requirements: 'Analysts (read curated marts), engineers (build/load), and an external finance account (read two tables). Enforce least privilege and keep it maintainable.',
      steps: [
        { prompt: 'How do you structure in-database access?', choices: [
            { text: 'Create database roles per persona and GRANT roles to users', correct: true, why: 'RBAC roles bundle privileges so you manage access by persona, not per user — maintainable and auditable.' },
            { text: 'Grant privileges directly to each user', correct: false, why: 'Per-user grants sprawl and drift; roles are the maintainable unit.' },
            { text: 'Give everyone superuser', correct: false, why: 'Violates least privilege.' } ],
          insight: 'Roles per persona, granted to users; hierarchies for shared baseline privileges.' },
        { prompt: 'Analysts must not see a PII column. How?', choices: [
            { text: 'Column-level GRANT (exclude the PII column) or a masking view', correct: true, why: 'Column-level security / restricted views expose only permitted columns.' },
            { text: 'Tell analysts not to select it', correct: false, why: 'Not enforcement.' },
            { text: 'Drop the column', correct: false, why: 'Other roles legitimately need it.' } ],
          insight: 'Use column-level grants / row-level security for fine-grained control.' },
        { prompt: 'How does the external finance account get read access to two tables?', choices: [
            { text: 'A datashare scoped to those two tables (cross-account)', correct: true, why: 'Datashares give live, read-only, cross-account access to exactly the objects you add — no copies.' },
            { text: 'Email them a CSV extract', correct: false, why: 'Stale, ungoverned, and insecure.' },
            { text: 'Give them a login to your cluster', correct: false, why: 'Over-broad and breaks isolation.' } ],
          insight: 'Datashares scope cross-account access to specific objects, read-only.' },
      ],
      architecture: 'Database roles: analyst (SELECT on marts, minus PII columns), engineer (load/DDL on raw/staging), plus a cross-account datashare exposing exactly two tables to finance. IAM role authorizes S3/Glue for loads.',
      tradeoffs: 'Role granularity vs simplicity; column/row-level security adds management overhead but is required for PII.',
      failureModes: 'Privilege creep, over-broad roles, and PII exposure via forgotten columns — audit grants regularly.',
      cost: 'RBAC itself is free; the cost is governance discipline. Datashares avoid duplicate storage.' },
  ]);

  /* ── design: Data loading lab ───────────────────────────── */
  SE.register('rs-loading', [
    {
      id: 'rs-load-strategy', area: 'rs-loading', category: 'Ingestion', difficulty: 'intermediate',
      title: 'Design a high-throughput ingestion strategy',
      requirements: 'Hundreds of GB of daily Parquet in S3 must load fast and reliably, with the warehouse staying query-able, and occasional live operational lookups needed.',
      steps: [
        { prompt: 'How do you make COPY fast?', choices: [
            { text: 'Split into many evenly sized files (multiple of slice count) and COPY the prefix', correct: true, why: 'COPY parallelizes by file across slices; slice-aligned, even files maximize parallel throughput.' },
            { text: 'COPY one giant file', correct: false, why: 'One file pins the load to a single slice.' },
            { text: 'INSERT row by row', correct: false, why: 'Row-by-row INSERT is dramatically slower than bulk COPY.' } ],
          insight: 'COPY throughput scales with the number of evenly sized, slice-aligned files.' },
        { prompt: 'How do you apply upserts idempotently?', choices: [
            { text: 'Load to a staging table, then DELETE-then-INSERT (merge) in a transaction', correct: true, why: 'The documented Redshift upsert pattern converges to the same state on every run.' },
            { text: 'DELETE the whole table and reload each time', correct: false, why: 'Wasteful and disrupts queries.' },
            { text: 'Trust the source to never duplicate', correct: false, why: 'At-least-once sources duplicate; design for idempotency.' } ],
          insight: 'Staging + DELETE/INSERT (merge) gives idempotent upserts.' },
        { prompt: 'Occasional live lookups against the operational DB — how?', choices: [
            { text: 'Federated query to Aurora/RDS PostgreSQL/MySQL', correct: true, why: 'Reads live rows directly with predicate pushdown — no ETL for small, fresh lookups.' },
            { text: 'Replicate the whole OLTP DB nightly', correct: false, why: 'Heavy and stale for occasional lookups.' },
            { text: 'Query production OLTP from BI directly', correct: false, why: 'Risks the operational system and bypasses the warehouse.' } ],
          insight: 'Federated query blends live operational data without ETL.' },
      ],
      architecture: 'S3 Parquet → split files → COPY to staging → DELETE/INSERT merge into targets (transactional). Automatic compression on first COPY. Federated query for occasional live lookups. Loads run on their own WLM queue so BI stays responsive.',
      tradeoffs: 'Batch COPY throughput vs freshness; federated pushdown is great for small lookups but not bulk.',
      failureModes: 'Single-file loads (no parallelism), non-idempotent loads creating duplicates, and loads starving BI — isolate with queues.',
      cost: 'Bulk COPY is efficient; keep files compressed/columnar, and size the load queue to avoid over-provisioning.' },
  ]);

  /* ── decision reused for Snowflake+DE area already above ── */
})();
