/* ============================================================
   Redshift — Internals & Data (authentic, AWS-doc aligned)
   distribution-styles · sort-keys · compression · vacuum-analyze ·
   query-execution · result-caching · materialized-views
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const Kit = viz.RedshiftKit;

  const SPECS = {
    distributionStyles: {
      eyebrow: 'Internals', title: 'Distribution Styles',
      subtitle: 'A table\'s distribution style decides which slice stores each row — and that governs how much data must move across nodes during joins and aggregations. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/t_Distributing_data.html',
      stage: { caption: 'Placing rows across node slices',
        groups: [
          { id: 'styles', label: 'Four styles', nodes: [
            { id: 'key', label: 'KEY', sub: 'by column hash' },
            { id: 'even', label: 'EVEN', sub: 'round-robin' },
            { id: 'all', label: 'ALL', sub: 'full copy / node' },
            { id: 'auto', label: 'AUTO', sub: 'Redshift decides' } ], connectorAfter: 'rows → slices' },
          { id: 'slices', label: 'Node slices', nodes: [
            { id: 's0', label: 'slice 0' }, { id: 's1', label: 'slice 1' },
            { id: 's2', label: 'slice 2' }, { id: 's3', label: 'slice 3' } ] },
        ] },
      steps: [
        { label: 'KEY', title: 'KEY — co-locate join partners', on: { spot: ['key', 'slices'], flow: ['s0', 's1', 's2', 's3'] },
          body: 'Rows are placed by the hash of one column. Two tables distributed on the <strong>same join key</strong> land matching rows on the same slice — joins need no data movement.',
          facts: ['Best for large fact–dimension joins on the dist key', 'Watch for skew if the key has few/uneven values'] },
        { label: 'EVEN', title: 'EVEN — round-robin spread', on: { spot: ['even', 'slices'], flow: ['s0', 's1', 's2', 's3'] },
          body: 'Rows are spread evenly across slices regardless of value — balanced load, but joins may need redistribution.',
          facts: ['Even load, no skew', 'Default when no clear join/group key'] },
        { label: 'ALL', title: 'ALL — replicate small tables', on: { spot: ['all', 'slices'], flow: ['s0', 's1', 's2', 's3'] },
          body: 'A full copy of the table is stored on <strong>every node</strong>. Great for small dimension tables so joins never redistribute them.',
          facts: ['Eliminates redistribution for small dims', 'Costs storage × node count — small tables only'] },
        { label: 'AUTO', title: 'AUTO — let Redshift manage it', on: { spot: ['auto'] },
          body: 'With <strong>AUTO</strong> (the default), Redshift starts small tables as ALL and switches to EVEN/KEY as they grow, adjusting automatically.',
          facts: ['AUTO is the default distribution style', 'Redshift changes the style in the background as tables grow'] },
        { label: 'Skew', title: 'Avoid distribution skew', on: { spot: ['slices'], flow: ['s0'], dim: ['s1', 's2', 's3'] },
          body: 'If a KEY column is lopsided, one slice holds far more rows — <strong>skew</strong> — and that slice becomes the bottleneck for the whole query.',
          facts: ['Skew makes one slice do most of the work', 'Pick a high-cardinality, evenly-distributed join key'] },
      ],
      code: { title: 'Setting a distribution style', lang: 'sql', src:
`CREATE TABLE watch_events (
    event_id     BIGINT,
    user_id      BIGINT,
    title_id     INT,
    country      VARCHAR(2),
    minutes      INT,
    watch_date   DATE
)
DISTSTYLE KEY
DISTKEY (user_id);   -- co-locate with users on user_id

-- Small dimension replicated to every node:
CREATE TABLE dim_title (...) DISTSTYLE ALL;` },
      takeaways: [
        'KEY co-locates join partners; EVEN balances; ALL replicates small dims; AUTO adapts',
        'Distribute large fact & dimension tables on their common join key',
        'Choose a high-cardinality key to avoid slice skew',
      ],
    },

    sortKeys: {
      eyebrow: 'Internals', title: 'Sort Keys (Compound & Interleaved)',
      subtitle: 'Sort keys control the physical order of rows on disk, which makes zone maps far more effective at skipping blocks. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/t_Sorting_data.html',
      stage: { caption: 'Physical row order → block skipping',
        groups: [
          { id: 'types', label: 'Two styles', nodes: [
            { id: 'compound', label: 'Compound', sub: 'prefix order (default)' },
            { id: 'interleaved', label: 'Interleaved', sub: 'equal weight · ≤ 8 cols' } ], connectorAfter: 'ordered blocks' },
          { id: 'blocks', label: '1 MB blocks (sorted)', nodes: [
            { id: 'bk1', label: 'Jan–Mar' }, { id: 'bk2', label: 'Apr–Jun' },
            { id: 'bk3', label: 'Jul–Sep' }, { id: 'bk4', label: 'Oct–Dec' } ] },
        ] },
      steps: [
        { label: 'Why', title: 'Sort order powers zone maps', on: { spot: ['blocks'], flow: ['bk1', 'bk2', 'bk3', 'bk4'] },
          body: 'When rows are sorted by a column, each block\'s min/max range is tight — so range filters skip most blocks. Unsorted data has overlapping ranges and skips little.',
          facts: ['Sort order tightens per-block min/max', 'Pair the sort key with your most common range filter'] },
        { label: 'Compound', title: 'Compound — prefix matters', on: { spot: ['compound'], flow: ['bk1'] },
          body: 'The default. Sorts by the listed columns <strong>in order</strong>; most effective when predicates use a <strong>prefix</strong> of the key (first column, then second, …).',
          facts: ['COMPOUND is the default sort style', 'Recommended for tables updated regularly with INSERT/UPDATE/DELETE', 'Filtering on a non-leading column alone helps little'] },
        { label: 'Interleaved', title: 'Interleaved — equal weight', on: { spot: ['interleaved'], flow: ['bk2', 'bk3'] },
          body: 'Gives <strong>equal weight</strong> to each sort column, so filters on secondary columns still skip blocks. Up to 8 columns.',
          facts: ['Up to 8 columns, each weighted equally', 'Helps when queries filter different columns', 'More effective on large tables'] },
        { label: 'Maintenance', title: 'Interleaved needs REINDEX', on: { spot: ['interleaved'] },
          body: 'As data grows, interleaved keys <strong>skew</strong> (especially on date/timestamp). Restore performance with <code>VACUUM REINDEX</code> — which is slower than a normal vacuum.',
          facts: ['VACUUM REINDEX re-analyzes interleaved keys (extra pass, slower)', 'Skew builds up on date/timestamp columns', 'Prefer compound unless secondary-column filtering truly matters'] },
      ],
      code: { title: 'Defining sort keys', lang: 'sql', src:
`-- Compound (default): great for prefix range filters
CREATE TABLE watch_events (...)
  COMPOUND SORTKEY (watch_date, country);

-- Interleaved: equal weight across columns
CREATE TABLE watch_events (...)
  INTERLEAVED SORTKEY (watch_date, country, title_id);

-- Restore an interleaved table's performance:
VACUUM REINDEX watch_events;` },
      takeaways: [
        'Sort keys set physical order so zone maps skip more blocks',
        'Compound (default) favors prefix filters; interleaved weights columns equally (≤ 8)',
        'Interleaved tables need VACUUM REINDEX as they skew',
      ],
    },

    compression: {
      eyebrow: 'Internals', title: 'Compression & Column Encoding',
      subtitle: 'Column encodings shrink data on disk, cutting I/O and speeding scans. Redshift can pick encodings automatically. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/c_Compression_encodings.html',
      stage: { caption: 'Per-column encodings reduce I/O',
        groups: [
          { id: 'enc', label: 'Common encodings', nodes: [
            { id: 'az64', label: 'AZ64', sub: 'numeric/date default' },
            { id: 'zstd', label: 'ZSTD', sub: 'strings, high ratio' },
            { id: 'bytedict', label: 'BYTEDICT', sub: 'low-cardinality' },
            { id: 'raw', label: 'RAW', sub: 'no compression' } ], connectorAfter: 'smaller blocks' },
          { id: 'io', label: 'Result', nodes: [{ id: 'less', label: 'Fewer blocks read' }, { id: 'fast', label: 'Faster scans' }] },
        ] },
      steps: [
        { label: 'Why', title: 'Less data on disk = faster scans', on: { spot: ['io'], flow: ['less', 'fast'] },
          body: 'Compression reduces the number of 1 MB blocks a scan must read. Because data is columnar, like-typed values compress very well.',
          facts: ['Less I/O is the main performance win', 'Columnar data compresses better than rows'] },
        { label: 'AZ64', title: 'AZ64 — numeric & date default', on: { spot: ['az64'] },
          body: 'An Amazon-proprietary encoding for numeric, date, and timestamp types — strong compression with fast decode.',
          facts: ['Great default for INT/BIGINT/DECIMAL/DATE/TIMESTAMP', 'Balances ratio and query speed'] },
        { label: 'ZSTD', title: 'ZSTD — great for text', on: { spot: ['zstd'] },
          body: 'A high-ratio general encoding that works across many types, especially variable-length strings (VARCHAR).',
          facts: ['Strong on VARCHAR / free text', 'Works across most column types'] },
        { label: 'Auto', title: 'Automatic compression on COPY', on: { spot: ['enc'], flow: ['az64', 'zstd', 'bytedict'] },
          body: 'Load an empty table with <strong>COPY</strong> and Redshift samples the data and applies the best encoding per column automatically.',
          facts: ['COPY into an empty table applies automatic compression', 'ANALYZE COMPRESSION recommends encodings for existing tables', 'RAW (no compression) is best left to sort-key columns where helpful'] },
      ],
      code: { title: 'Encodings & recommendations', lang: 'sql', src:
`-- Explicit encoding
CREATE TABLE watch_events (
    minutes   INT      ENCODE az64,
    country   VARCHAR(2) ENCODE bytedict,
    title     VARCHAR(400) ENCODE zstd
);

-- Ask Redshift what to use for an existing table:
ANALYZE COMPRESSION watch_events;` },
      takeaways: [
        'Encodings cut block count → less I/O → faster scans',
        'AZ64 for numeric/date, ZSTD for text, BYTEDICT for low-cardinality',
        'COPY into an empty table auto-applies encodings; ANALYZE COMPRESSION advises existing ones',
      ],
    },

    vacuumAnalyze: {
      eyebrow: 'Internals', title: 'VACUUM & ANALYZE',
      subtitle: 'VACUUM reclaims space and re-sorts rows; ANALYZE refreshes the statistics the planner relies on. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/t_Reclaiming_storage_space202.html',
      stage: { caption: 'Housekeeping that keeps queries fast',
        groups: [
          { id: 'vac', label: 'VACUUM', sub: 'space + sort order', nodes: [
            { id: 'full', label: 'FULL', sub: 'sort + reclaim' },
            { id: 'sortonly', label: 'SORT ONLY' },
            { id: 'delonly', label: 'DELETE ONLY' },
            { id: 'reindex', label: 'REINDEX', sub: 'interleaved' } ] },
          { id: 'ana', label: 'ANALYZE', sub: 'planner statistics', nodes: [{ id: 'stats', label: 'Table statistics' }] },
        ] },
      steps: [
        { label: 'Problem', title: 'Deletes & loads degrade tables', on: { spot: ['vac'] },
          body: 'Deleted rows are only marked for removal, and newly loaded rows land unsorted. Over time this wastes space and weakens zone-map pruning.',
          facts: ['Deleted rows occupy space until vacuumed', 'New rows are unsorted until vacuumed'] },
        { label: 'VACUUM', title: 'VACUUM reclaims & re-sorts', on: { spot: ['vac'], flow: ['full', 'sortonly', 'delonly'] },
          body: '<code>VACUUM FULL</code> reclaims deleted space <em>and</em> restores sort order. SORT ONLY and DELETE ONLY do one job each.',
          facts: ['FULL = reclaim + re-sort', 'Redshift also auto-vacuums in the background', 'Run manually after large loads/deletes for predictability'] },
        { label: 'REINDEX', title: 'VACUUM REINDEX for interleaved', on: { spot: ['reindex'] },
          body: 'Interleaved sort keys need <code>VACUUM REINDEX</code> — an extra analysis pass that makes it slower than VACUUM FULL.',
          facts: ['Required to restore interleaved-key performance', 'Slower than FULL due to the reindex pass'] },
        { label: 'ANALYZE', title: 'ANALYZE refreshes statistics', on: { spot: ['ana'], flow: ['stats'] },
          body: '<code>ANALYZE</code> updates table statistics (row counts, value distribution) so the query planner picks good join orders and methods.',
          facts: ['Stale stats → bad plans', 'COPY can analyze automatically; Redshift also auto-analyzes', 'Run ANALYZE after big data changes'] },
      ],
      code: { title: 'Maintenance commands', lang: 'sql', src:
`VACUUM FULL watch_events;        -- reclaim + re-sort
VACUUM REINDEX watch_events;     -- interleaved sort keys
VACUUM DELETE ONLY watch_events; -- just reclaim space
ANALYZE watch_events;            -- refresh planner stats` },
      takeaways: [
        'VACUUM reclaims deleted space and restores sort order (FULL / SORT ONLY / DELETE ONLY)',
        'Interleaved sort keys need VACUUM REINDEX (slower, extra pass)',
        'ANALYZE keeps planner statistics fresh; auto-maintenance helps but run manually after big changes',
      ],
    },

    queryExecution: {
      eyebrow: 'Internals', title: 'Query Execution',
      subtitle: 'A query flows parse → plan → compile → distribute → execute in parallel → aggregate. Compiled code is cached for reuse. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/c-query-planning.html',
      stage: { caption: 'The query lifecycle',
        groups: [
          { id: 'lead', label: 'Leader node', nodes: [
            { id: 'parse', label: 'Parse' }, { id: 'plan', label: 'Plan' },
            { id: 'comp', label: 'Compile → C++' }, { id: 'merge', label: 'Aggregate' } ], connectorAfter: 'segments ↓' },
          { id: 'exec', label: 'Compute nodes', sub: 'segments → steps → slices', nodes: [
            { id: 'seg1', label: 'Scan' }, { id: 'seg2', label: 'Join' }, { id: 'seg3', label: 'Aggregate' } ] },
        ] },
      steps: [
        { label: 'Parse & plan', title: 'Parse and build a plan', on: { spot: ['lead'], flow: ['parse', 'plan'] },
          body: 'The leader parses SQL and the optimizer builds an execution plan, using table statistics to choose join order and methods.',
          facts: ['Optimizer uses ANALYZE statistics', 'EXPLAIN shows the chosen plan'] },
        { label: 'Compile', title: 'Compile to native code', on: { spot: ['lead'], flow: ['comp'] },
          body: 'The plan is compiled to C++ <strong>segments</strong>. Compiled code is cached, so repeat queries skip compilation.',
          facts: ['Compiled segments are cached and reused', 'First run of a new query pays a one-time compile cost'] },
        { label: 'Execute', title: 'Segments run on slices in parallel', on: { spot: ['exec'], conn: ['lead'], flow: ['seg1', 'seg2', 'seg3'] },
          body: 'Segments break into steps (scan, join, aggregate) and run across all slices simultaneously. Minimizing data redistribution between steps is the key tuning lever.',
          facts: ['Each slice runs its shard of every step', 'DS_DIST_* operators in EXPLAIN reveal redistribution'] },
        { label: 'Return', title: 'Leader merges and returns', on: { spot: ['lead'], flow: ['merge'] },
          body: 'Intermediate results flow back to the leader for final aggregation/sort, then rows are returned to the client.',
          facts: ['Final merge happens on the leader', 'Good dist/sort keys reduce what must be shuffled'] },
      ],
      code: { title: 'Inspecting a plan', lang: 'sql', src:
`EXPLAIN
SELECT country, SUM(minutes)
FROM   watch_events
WHERE  watch_date >= '2024-01-01'
GROUP  BY country;
-- Look for DS_DIST_NONE (good) vs DS_DIST_BOTH (redistribution).` },
      takeaways: [
        'Lifecycle: parse → plan → compile (C++) → execute on slices → aggregate on leader',
        'Compiled code is cached; first-run compile is a one-time cost',
        'EXPLAIN reveals redistribution (DS_DIST_*) — minimize it with good dist/sort keys',
      ],
    },

    resultCaching: {
      eyebrow: 'Internals', title: 'Result Caching',
      subtitle: 'Redshift caches query results on the leader node and returns them instantly for identical queries when the underlying data hasn\'t changed. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/c-query-performance.html',
      stage: { caption: 'Repeat queries skip compute entirely',
        groups: [
          { id: 'q', label: 'Incoming query', nodes: [{ id: 'sql', label: 'SELECT …' }], connectorAfter: 'cache check' },
          { id: 'cache', label: 'Leader result cache', nodes: [{ id: 'hit', label: 'Cache hit', sub: 'instant' }, { id: 'miss', label: 'Cache miss', sub: 'execute' }], connectorAfter: '↓ on miss' },
          { id: 'cluster', label: 'Compute', nodes: [{ id: 'run', label: 'Run on slices' }] },
        ] },
      steps: [
        { label: 'Check', title: 'Check the cache first', on: { spot: ['q', 'cache'], conn: ['q'] },
          body: 'When a query arrives, the leader checks whether a valid cached result already exists for that exact query.',
          facts: ['Cache lives on the leader node', 'Matching requires the same query and permissions'] },
        { label: 'Hit', title: 'Cache hit → instant result', on: { spot: ['hit'] },
          body: 'On a hit, Redshift returns the cached result <strong>without touching compute</strong> — no slices run, no blocks read.',
          facts: ['Zero compute on a hit', 'Ideal for repeated dashboards'] },
        { label: 'Miss', title: 'Cache miss → execute', on: { spot: ['cluster'], conn: ['cache'], flow: ['run'] },
          body: 'On a miss, the query runs normally on the compute nodes and its result is cached for next time.',
          facts: ['New/changed queries execute and populate the cache'] },
        { label: 'Invalidate', title: 'Invalidated when data changes', on: { spot: ['cache'], dim: ['hit'] },
          body: 'If the underlying data changes, the cached result is invalidated so you never see stale answers. Caching can be toggled with <code>enable_result_cache_for_session</code>.',
          facts: ['Cache invalidates on underlying data change', 'Session parameter can disable it for benchmarking'] },
      ],
      takeaways: [
        'Result cache on the leader returns identical queries instantly, using no compute',
        'Misses execute normally and populate the cache',
        'Cache invalidates when underlying data changes — results are never stale',
      ],
    },

    materializedViews: {
      eyebrow: 'Internals', title: 'Materialized Views',
      subtitle: 'Materialized views precompute and store query results; Redshift can refresh them automatically and even rewrite queries to use them. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/materialized-view-overview.html',
      stage: { caption: 'Precompute once, serve many',
        groups: [
          { id: 'base', label: 'Base tables', nodes: [{ id: 'we', label: 'watch_events', sub: 'billions of rows' }], connectorAfter: 'precompute' },
          { id: 'mv', label: 'Materialized view', sub: 'stored result', nodes: [{ id: 'daily', label: 'daily_country_minutes' }], connectorAfter: 'auto query rewrite' },
          { id: 'users', label: 'Dashboards', nodes: [{ id: 'dash', label: 'BI queries' }] },
        ] },
      steps: [
        { label: 'Create', title: 'Precompute an expensive aggregate', on: { spot: ['base', 'mv'], conn: ['base'], flow: ['daily'] },
          body: 'A materialized view stores the result of a heavy join/aggregate so dashboards read the small precomputed table instead of scanning billions of rows.',
          facts: ['Stores actual results, not just a definition', 'Ideal for repeated BI aggregations'] },
        { label: 'Refresh', title: 'Automatic or incremental refresh', on: { spot: ['mv'] },
          body: 'With <code>AUTO REFRESH YES</code>, Redshift refreshes the MV as base data changes — <strong>incrementally</strong> when possible, so only changed data is reprocessed.',
          facts: ['AUTO REFRESH keeps the MV current automatically', 'Incremental refresh reprocesses only changes', 'REFRESH MATERIALIZED VIEW runs it on demand'] },
        { label: 'Rewrite', title: 'Automatic query rewrite', on: { spot: ['users', 'mv'], conn: ['mv'], flow: ['dash'] },
          body: 'Redshift can <strong>automatically rewrite</strong> queries against the base tables to use a matching MV — speeding up queries that never named the view.',
          facts: ['Queries can benefit without referencing the MV', 'Also works over Spectrum external tables'] },
      ],
      code: { title: 'Materialized view with auto refresh', lang: 'sql', src:
`CREATE MATERIALIZED VIEW daily_country_minutes
AUTO REFRESH YES
AS
SELECT watch_date, country, SUM(minutes) AS total_minutes
FROM   watch_events
GROUP  BY watch_date, country;

-- Manual refresh when needed:
REFRESH MATERIALIZED VIEW daily_country_minutes;` },
      takeaways: [
        'MVs store precomputed results so dashboards skip heavy recomputation',
        'AUTO REFRESH keeps them current, incrementally when possible',
        'Automatic query rewrite lets base-table queries use a matching MV',
      ],
    },
  };

  Kit.registerAll('redshift', SPECS);
})();
