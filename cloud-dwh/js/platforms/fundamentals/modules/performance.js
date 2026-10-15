/* Fundamentals · Performance Mechanics group — distribution &
   partitioning, data skipping & pruning, elastic scaling & concurrency,
   caching & result reuse. Authored for the shared FundKit. */
(function () {
  'use strict';
  const Kit = window.CDWH && window.CDWH.FundKit;
  if (!Kit) return;

  Kit.registerAll({

    /* ─────────────────── Distribution & partitioning ─────────────────── */
    'fund-distribution': {
      eyebrow: '⚡ Performance Mechanics',
      title: 'Distribution & partitioning',
      lead: 'In an MPP engine, <strong>where each row physically lives</strong> decides how fast joins and aggregations run. Good distribution keeps related rows together so workers rarely have to ship data to each other; bad distribution forces expensive network shuffles.',
      sections: [
        { h: 'Distribution: spreading rows across workers', p:
          '<p>A table is split into pieces, one per worker, so scans run in parallel. <em>How</em> you split matters. Spread rows <strong>evenly</strong> and every worker shares the load. But when you join two tables, the engine needs matching rows on the <em>same</em> worker — if they aren\'t, it must <strong>shuffle</strong> rows across the network first, the single most common cause of slow MPP queries.</p>' },
        { h: 'Co-location: the goal', p:
          '<p>If both tables are distributed on their <strong>join key</strong>, matching rows already sit together on the same worker and the join happens locally — no shuffle. Small lookup tables can instead be <strong>replicated</strong> to every worker so any join against them is local. The art is choosing a key that both spreads data evenly <em>and</em> co-locates your big joins.</p>' },
        { h: 'Partitioning & clustering', p:
          '<p>Separately from distribution, data is organized so queries can <strong>skip</strong> chunks (next topic). Clustering/sorting by a commonly-filtered column (like date) groups similar values together, which both improves skipping and keeps scans sequential. Some engines do this automatically; others expose explicit keys.</p>' },
      ],
      diagramTitle: '🎬 Co-located join vs costly shuffle',
      stage: { caption: 'Join on the distribution key → local; join on anything else → shuffle',
        groups: [
          { id: 'good', label: 'Distributed on the join key', sub: 'matching rows co-located', nodes: [
            { id: 'w1', label: 'Worker 1', sub: 'users+events for key A' }, { id: 'w2', label: 'Worker 2', sub: 'users+events for key B' } ], connectorAfter: 'join locally — no network' },
          { id: 'localres', label: 'Fast result', nodes: [ { id: 'fast', label: 'Local join, minimal I/O' } ] },
          { id: 'bad', label: 'Distributed on something else', sub: 'matching rows scattered', nodes: [
            { id: 'b1', label: 'Worker 1' }, { id: 'b2', label: 'Worker 2' } ], connectorAfter: 'shuffle rows across the network' },
          { id: 'slowres', label: 'Slow result', nodes: [ { id: 'slow', label: 'Network shuffle before join' } ] },
        ] },
      steps: [
        { label: 'Spread', title: 'Rows are split across workers', on: { spot: ['good'], flow: ['w1', 'w2'] },
          body: 'A table is divided so each worker owns a slice and scans run in parallel. Even spread keeps every worker equally busy.',
          facts: ['Parallel scans across workers', 'Even spread avoids hot workers', 'Distribution = which worker owns a row'] },
        { label: 'Co-locate', title: 'Join key → matching rows together', on: { spot: ['good'], flow: ['w1', 'w2'], conn: ['good'] },
          body: 'Distribute both tables on their join key and the rows that need to meet already live on the same worker. The join runs <strong>locally</strong>.',
          facts: ['Same key → same worker', 'Join without network traffic', 'The fast path'] },
        { label: 'Win', title: 'Local join = fast', on: { spot: ['localres'], flow: ['fast'], conn: ['good'] },
          body: 'No data moves between workers, so the join is limited only by local scan speed. This is what good distribution buys you.',
          facts: ['No shuffle', 'Scales cleanly with workers', 'Predictable performance'] },
        { label: 'Mismatch', title: 'Wrong key → rows scattered', on: { spot: ['bad'], flow: ['b1', 'b2'], dim: [] },
          body: 'If the tables are distributed on something other than the join key, matching rows are spread across different workers.',
          facts: ['Matching rows not co-located', 'Engine must relocate them first', 'Common cause of slow MPP joins'] },
        { label: 'Shuffle', title: 'The network shuffle tax', on: { spot: ['slowres'], flow: ['slow'], conn: ['bad'] },
          body: 'The engine shuffles rows across the network so they can be joined — extra I/O, memory, and time. Pick distribution to avoid this.',
          facts: ['Network + memory overhead', 'Gets worse with data size', 'Avoid with key / replicated distribution'] },
      ],
      map: {
        intro: 'They range from fully automatic to fully explicit. More control means more tuning responsibility.',
        sf: { term: 'Automatic + clustering keys', points: ['Micro-partitions assigned automatically (no dist key)', 'Clustering keys co-locate & improve pruning on big tables', 'Automatic clustering maintains it in the background'] },
        rs: { term: 'Distribution styles', points: ['KEY: distribute on a column to co-locate joins', 'ALL: replicate small tables to every node', 'EVEN / AUTO: spread evenly or let Redshift decide'] },
        fb: { term: 'Engine-managed', points: ['Distribution handled by the engine over Parquet', 'No manual dist keys to set', 'Table layout + V-Order optimize reads'] },
      },
      takeaway: 'The enemy in MPP is the <b>network shuffle</b>; the cure is <b>co-locating</b> joined rows. Redshift makes this explicit (<b>distribution styles</b>), Snowflake and Fabric manage it automatically (with <b>clustering keys</b> as Snowflake\'s tuning lever). Either way, physical layout — not just hardware — decides query speed.',
      compare: 'cmp-storage', compareLabel: 'Storage & Skipping',
      docs: [
        { label: 'Snowflake: Clustering keys', url: 'https://docs.snowflake.com/en/user-guide/tables-clustering-keys' },
        { label: 'AWS: Distribution styles', url: 'https://docs.aws.amazon.com/redshift/latest/dg/c_choosing_dist_sort.html' },
        { label: 'Fabric: Tables in the warehouse', url: 'https://learn.microsoft.com/en-us/fabric/data-warehouse/tables' },
      ],
    },

    /* ─────────────────── Data skipping & pruning ─────────────────── */
    'fund-pruning': {
      eyebrow: '⚡ Performance Mechanics',
      title: 'Data skipping & pruning',
      lead: 'The fastest scan is the one you never run. Warehouses keep tiny bits of <strong>metadata</strong> (like the min and max value) for every chunk of data, so a filtered query can prove a chunk can\'t contain any matching rows and <strong>skip it entirely</strong> — often reading a few percent of the table.',
      sections: [
        { h: 'Min/max metadata (zone maps)', p:
          '<p>When data is written, the engine records summary stats for each block/partition — most importantly the <strong>minimum and maximum</strong> value of each column in that chunk. These are tiny and live in memory. For a query like <code>WHERE watch_date >= \'2024-01-01\'</code>, the engine checks each chunk\'s max date; if it\'s before 2024, that chunk <strong>cannot</strong> match and is skipped without being read.</p>' },
        { h: 'Why ordering makes or breaks it', p:
          '<p>Skipping only helps if similar values are grouped together. If dates are scattered randomly across chunks, every chunk\'s min–max spans the whole range and nothing can be skipped. <strong>Sorting/clustering</strong> on the column you filter by gives each chunk a tight range, so the engine can eliminate most of them. This is why sort keys and clustering keys matter so much.</p>' },
        { h: 'It compounds with columnar', p:
          '<p>Pruning decides <em>which chunks</em> to read; columnar storage decides <em>which columns</em>. Together they can turn a full-table scan into reading two columns of a handful of blocks — the one-two punch behind warehouse speed.</p>' },
      ],
      diagramTitle: '🎬 Skipping blocks with min/max metadata',
      stage: { caption: "WHERE watch_date >= '2024-01-01' — skip blocks that can't match",
        groups: [
          { id: 'meta', label: 'Per-block min/max metadata', sub: 'checked in memory first', nodes: [ { id: 'zmap', label: 'Zone map / stats' } ], connectorAfter: 'decide what to read' },
          { id: 'blocks', label: 'Table blocks (sorted by date)', nodes: [
            { id: 'b2022', label: '2022 block', sub: 'max < 2024 — skip' }, { id: 'b2023', label: '2023 block', sub: 'max < 2024 — skip' },
            { id: 'b2024', label: '2024 block', sub: 'in range — read' }, { id: 'b2025', label: '2025 block', sub: 'in range — read' } ], connectorAfter: 'scan only the survivors' },
          { id: 'res', label: 'Result', nodes: [ { id: 'out', label: 'Answer, fraction of data read' } ] },
        ] },
      steps: [
        { label: 'Metadata', title: 'Every block carries min/max', on: { spot: ['meta'], flow: ['zmap'] },
          body: 'At write time the engine records each block\'s min and max per column. This metadata is tiny and checked <strong>before</strong> any data is read.',
          facts: ['Min/max per block, per column', 'Lives in memory', 'Checked first, costs almost nothing'] },
        { label: 'Filter', title: 'The query has a range filter', on: { spot: ['meta'], flow: ['zmap'] },
          body: 'The query wants dates on/after 2024-01-01. The engine will compare that predicate against every block\'s max date.',
          facts: ['Predicate on watch_date', 'Compared to each block\'s range', 'No scanning yet'] },
        { label: 'Prune', title: 'Skip blocks that can\'t match', on: { spot: ['blocks'], flow: ['b2024', 'b2025'], dim: ['b2022', 'b2023'], conn: ['meta'] },
          body: 'The 2022 and 2023 blocks have a max date before 2024 — they <strong>cannot</strong> contain a match, so they are skipped untouched. Only 2024/2025 blocks are read.',
          facts: ['Provably-empty blocks skipped', 'Only matching blocks scanned', 'Works because data is sorted by date'] },
        { label: 'Result', title: 'A fraction of the table read', on: { spot: ['res'], flow: ['out'], conn: ['blocks'] },
          body: 'The answer comes back having read a small fraction of the data. Scatter the dates randomly and nothing could be skipped — ordering is everything.',
          facts: ['Reads a few % of the table', 'Pruning × columnar = big win', 'Tuning = cluster/sort on filters'] },
      ],
      map: {
        intro: 'All three skip data via per-chunk metadata; the lever you pull to make it effective differs.',
        sf: { term: 'Micro-partition pruning', points: ['Per-micro-partition min/max metadata', 'Automatic; clustering keys tighten ranges', 'Query profile shows partitions pruned'] },
        rs: { term: 'Zone maps + sort keys', points: ['Per-1MB-block min/max (zone maps)', 'Sort key (compound/interleaved) groups values', 'Tight blocks → aggressive block skipping'] },
        fb: { term: 'Parquet / Delta stats', points: ['Parquet row-group + Delta file statistics', 'V-Order improves data locality for skipping', 'Compaction keeps files skip-friendly'] },
      },
      takeaway: 'Pruning lets a query <b>skip chunks that provably can\'t match</b> using min/max metadata — but only works if data is <b>sorted/clustered</b> on the columns you filter by. Snowflake prunes micro-partitions, Redshift skips blocks via <b>zone maps + sort keys</b>, Fabric uses Parquet/Delta stats + V-Order. Same idea, different knob.',
      compare: 'cmp-storage', compareLabel: 'Storage & Skipping',
      docs: [
        { label: 'Snowflake: Micro-partitions & pruning', url: 'https://docs.snowflake.com/en/user-guide/tables-clustering-micropartitions' },
        { label: 'AWS: Sort keys & zone maps', url: 'https://docs.aws.amazon.com/redshift/latest/dg/t_Sorting_data.html' },
        { label: 'Fabric: Delta optimization & V-Order', url: 'https://learn.microsoft.com/en-us/fabric/data-engineering/delta-optimization-and-v-order' },
      ],
    },

    /* ─────────────────── Elastic scaling & concurrency ─────────────────── */
    'fund-scaling': {
      eyebrow: '⚡ Performance Mechanics',
      title: 'Elastic compute, concurrency & isolation',
      lead: 'Two different performance problems need two different fixes. One heavy query running slowly needs a <strong>bigger</strong> engine (scale up). A hundred users competing at 9am needs <strong>more</strong> engines (scale out). Decoupled compute makes both cheap — and lets you isolate workloads so they stop fighting.',
      sections: [
        { h: 'Scale up vs scale out', p:
          '<p><strong>Scale up</strong> = give one engine more power (more nodes/size) so a single big query finishes faster. <strong>Scale out</strong> = add more engines so many queries can run at once without queuing. They solve opposite problems; using the wrong one wastes money — a bigger engine doesn\'t help a concurrency jam, and more small engines don\'t speed up one giant query.</p>' },
        { h: 'The concurrency problem', p:
          '<p>A fixed engine has limited slots. When more queries arrive than there are slots, the extras <strong>queue</strong> and users see it as "the warehouse is slow." Scaling out — spinning up additional transient compute during the burst and retiring it after — keeps latency flat under load, and you only pay for the burst.</p>' },
        { h: 'Workload isolation', p:
          '<p>Decoupling also lets each workload run on its <em>own</em> compute over the <em>same</em> data. ELT jobs, BI dashboards, and ad-hoc data science can each get a right-sized engine so a runaway query in one never starves the others — no copies, no contention.</p>' },
      ],
      diagramTitle: '🎬 Scale up for size, out for concurrency',
      stage: { caption: 'One big query → scale up; a burst of many → scale out',
        groups: [
          { id: 'up', label: 'Scale UP (size)', sub: 'one heavy query', nodes: [ { id: 'small', label: 'Small engine', sub: 'slow' }, { id: 'big', label: 'Bigger engine', sub: 'fast' } ], connectorAfter: 'different problem ↓' },
          { id: 'out', label: 'Scale OUT (concurrency)', sub: 'many queries at once', nodes: [
            { id: 'e1', label: 'Engine' }, { id: 'e2', label: '+ burst engine' }, { id: 'e3', label: '+ burst engine' } ], connectorAfter: 'isolate workloads' },
          { id: 'iso', label: 'Workload isolation', nodes: [ { id: 'elt', label: 'ELT engine' }, { id: 'bi', label: 'BI engine' }, { id: 'ds', label: 'Data-science engine' } ] },
        ] },
      steps: [
        { label: 'Slow query', title: 'One big query is slow', on: { spot: ['up'], flow: ['small'] },
          body: 'A huge aggregation crawls on a small engine. Adding more <em>separate</em> engines wouldn\'t help — this single query needs more horsepower.',
          facts: ['Single heavy query', 'Bottlenecked on engine size', 'Concurrency isn\'t the issue'] },
        { label: 'Scale up', title: 'Give it a bigger engine', on: { spot: ['up'], flow: ['big'], dim: ['small'] },
          body: 'Resize to a larger engine with more parallel workers. The one query now spreads across more compute and finishes far faster.',
          facts: ['More workers on one query', 'Resize up/down on demand', 'Pay more only while it runs'] },
        { label: 'Rush hour', title: 'Now a hundred queries at once', on: { spot: ['out'], flow: ['e1'] },
          body: 'At 9am every dashboard refreshes. A single engine\'s slots fill and the rest <strong>queue</strong> — users experience it as slowness even though each query is small.',
          facts: ['Limited concurrent slots', 'Extra queries queue up', 'Bigger engine won\'t fix queuing'] },
        { label: 'Scale out', title: 'Add transient engines for the burst', on: { spot: ['out'], flow: ['e2', 'e3'], conn: ['out'] },
          body: 'The platform spins up additional compute to absorb the concurrency, then retires it when the rush passes. Latency stays flat; you pay only for the burst.',
          facts: ['More engines = more concurrency', 'Auto add/remove with load', 'Flat latency under spikes'] },
        { label: 'Isolate', title: 'Each workload on its own engine', on: { spot: ['iso'], flow: ['elt', 'bi', 'ds'], conn: ['out'] },
          body: 'ELT, BI, and data science each run on a right-sized engine over the same data. A runaway job in one never slows the others.',
          facts: ['No cross-workload contention', 'Right-size per workload', 'Same data, separate compute'] },
      ],
      map: {
        intro: 'Each platform offers scale-up and a distinct scale-out mechanism for concurrency.',
        sf: { term: 'Multi-cluster warehouses', points: ['Resize warehouse (XS→6XL) to scale up', 'Multi-cluster adds clusters automatically for concurrency', 'A warehouse per workload = isolation; auto-suspend idle'] },
        rs: { term: 'Concurrency scaling + WLM', points: ['Elastic resize to scale up', 'Concurrency scaling adds transient clusters on bursts', 'WLM queues isolate workloads; Serverless auto-scales RPUs'] },
        fb: { term: 'Capacity burst & smooth', points: ['One capacity (CUs) autoscales via bursting', 'Smoothing spreads spikes to avoid throttling', 'All workloads share capacity — watch contention'] },
      },
      takeaway: 'Scale <b>up</b> for a single heavy query, <b>out</b> for concurrency — two different fixes. Snowflake uses <b>multi-cluster warehouses</b>, Redshift <b>concurrency scaling + WLM</b> (or Serverless), Fabric <b>capacity bursting/smoothing</b>. Decoupled compute also lets you isolate each workload on its own engine over shared data.',
      compare: 'cmp-scaling', compareLabel: 'Scaling & Concurrency',
      docs: [
        { label: 'Snowflake: Multi-cluster warehouses', url: 'https://docs.snowflake.com/en/user-guide/warehouses-multicluster' },
        { label: 'AWS: Concurrency scaling', url: 'https://docs.aws.amazon.com/redshift/latest/dg/concurrency-scaling.html' },
        { label: 'Fabric: Capacity & smoothing', url: 'https://learn.microsoft.com/en-us/fabric/enterprise/throttling' },
      ],
    },

    /* ─────────────────── Caching & result reuse ─────────────────── */
    'fund-caching': {
      eyebrow: '⚡ Performance Mechanics',
      title: 'Caching & result reuse',
      lead: 'The cheapest query is one the warehouse has effectively already answered. Warehouses cache at several levels — from reusing an identical query\'s <strong>result</strong> instantly, to keeping recently-read <strong>data</strong> hot in local storage — so repeated and similar queries get dramatically faster and cheaper.',
      sections: [
        { h: 'Result cache: answer without computing', p:
          '<p>If the exact same query runs again and the underlying data hasn\'t changed, the engine can return the <strong>stored result</strong> instantly — often without spinning up any compute at all. This is a huge win for dashboards, where many users run identical queries. The cache is automatically <strong>invalidated</strong> the moment the underlying tables change, so you never see stale answers.</p>' },
        { h: 'Data / local cache: keep bytes hot', p:
          '<p>Separately, when an engine reads data from remote storage it keeps a copy on <strong>fast local disk/SSD</strong>. A later query over the same data reads it locally instead of fetching from object storage again — the second run of a similar (not identical) query is faster even without a result-cache hit. This cache warms up as an engine runs and is lost when it\'s suspended.</p>' },
        { h: 'When reuse is safe', p:
          '<p>A result-cache hit requires the <em>same</em> query text (semantically) and <em>unchanged</em> data; anything non-deterministic (like <code>CURRENT_TIMESTAMP</code>) or any write to the inputs busts it. Understanding this tells you why a dashboard is sometimes instant and sometimes not — and why keeping an engine briefly alive preserves its warm data cache.</p>' },
      ],
      diagramTitle: '🎬 Three outcomes for a repeated query',
      stage: { caption: 'Same query again? Result cache → data cache → full compute',
        groups: [
          { id: 'q', label: 'A query arrives', nodes: [ { id: 'ask', label: 'Run the dashboard query' } ], connectorAfter: 'check caches in order' },
          { id: 'rc', label: '1 · Result cache', sub: 'same query + unchanged data', nodes: [ { id: 'hit', label: 'Instant stored result', sub: 'no compute' } ], connectorAfter: 'miss? →' },
          { id: 'dc', label: '2 · Data (local) cache', sub: 'bytes already read', nodes: [ { id: 'warm', label: 'Read from local SSD', sub: 'skip remote fetch' } ], connectorAfter: 'miss? →' },
          { id: 'full', label: '3 · Full compute', nodes: [ { id: 'scan', label: 'Fetch + scan from storage' } ] },
        ] },
      steps: [
        { label: 'Query', title: 'A repeated query arrives', on: { spot: ['q'], flow: ['ask'] },
          body: 'A dashboard panel runs the same query many users have already run. Before computing anything, the engine checks its caches.',
          facts: ['Dashboards = lots of repeats', 'Caches checked cheapest-first', 'Avoid work when possible'] },
        { label: 'Result cache', title: 'Best case: instant result', on: { spot: ['rc'], flow: ['hit'], conn: ['q'] },
          body: 'If the identical query ran recently and the data is unchanged, the stored result is returned <strong>immediately</strong> — often with no compute spun up at all.',
          facts: ['Same query + unchanged data', 'Near-zero latency & cost', 'Auto-invalidated on any write'] },
        { label: 'Data cache', title: 'Next best: warm local data', on: { spot: ['dc'], flow: ['warm'], conn: ['rc'] },
          body: 'No result-cache hit (maybe the query changed slightly), but the engine already has the needed data on local SSD from an earlier scan — so it skips the slow remote fetch.',
          facts: ['Reuse recently-read bytes', 'Local SSD ≫ object storage', 'Warms as the engine runs'] },
        { label: 'Full compute', title: 'Worst case: scan from storage', on: { spot: ['full'], flow: ['scan'], conn: ['dc'] },
          body: 'Cold caches mean the engine fetches data from object storage and computes from scratch — then populates the caches so the <em>next</em> run is fast.',
          facts: ['Cold = fetch + full scan', 'Populates caches for next time', 'Why keeping an engine warm helps'] },
      ],
      map: {
        intro: 'Each platform has a result cache plus a form of local data caching; details and scope differ.',
        sf: { term: 'Result + warehouse cache', points: ['Result cache serves identical queries for 24h (data unchanged)', 'Warehouse local SSD cache warms as it runs', 'Metadata cache answers some queries with no compute'] },
        rs: { term: 'Leader result cache', points: ['Leader-node result cache for repeated queries', 'Compiled-query cache avoids recompilation', 'Local disk caches hot blocks on compute nodes'] },
        fb: { term: 'Result-set + Direct Lake cache', points: ['SQL result-set caching for repeated queries', 'In-memory caching across the engine', 'Direct Lake caches hot Delta segments for Power BI'] },
      },
      takeaway: 'Warehouses reuse work at two main levels: an instant <b>result cache</b> (same query + unchanged data, auto-invalidated) and a <b>local data cache</b> that keeps recently-read bytes hot. All three do both — which is why dashboards are often instant, and why briefly keeping an engine alive preserves its warm cache.',
      compare: 'cmp-scaling', compareLabel: 'Scaling & Concurrency',
      docs: [
        { label: 'Snowflake: Query result cache', url: 'https://docs.snowflake.com/en/user-guide/querying-persisted-results' },
        { label: 'AWS: Result caching', url: 'https://docs.aws.amazon.com/redshift/latest/dg/c-results-caching.html' },
        { label: 'Fabric: Direct Lake', url: 'https://learn.microsoft.com/en-us/fabric/fundamentals/direct-lake-overview' },
      ],
    },

  });
})();
