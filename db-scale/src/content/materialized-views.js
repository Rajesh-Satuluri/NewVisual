/* content/materialized-views.js — the "Materialized Views" lesson, as DATA.
   Same shape as the other db-scale lessons: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a
   view-snapshot consumed by db/materialized-views-scene.js. */

export const materializedViewsLesson = {
  id: 'materialized-views',
  title: 'Materialized Views',
  group: 'Data-Intensive (DDIA)',
  summary: 'Precompute an expensive query once and store its result like a table, so reads are instant — then keep it current by full refresh or by incrementally applying each source change.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['latency', 'freshness', 'throughput', 'events'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a plain view re-pays the query cost on every read', step: 0 },
    { text: 'Materialize: compute once, store the result on disk', step: 1 },
    { text: 'Reads hit the stored result directly — milliseconds, not seconds', step: 2 },
    { text: 'Keep it fresh: full refresh vs incremental maintenance', step: 3 },
    { text: 'The trade: storage + write-time work buys fast reads', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Slow dashboard',
      title: 'A plain view re-runs the query every time',
      body: [
        `Your dashboard shows “revenue by region.” Behind it is a query that <b>joins</b> orders to customers and <b>aggregates</b> millions of rows. On every page load it runs again from scratch — seconds of CPU and I/O for a number that barely changes.`,
        `A regular <span class="term">VIEW</span> doesn't help: it's just a saved query, expanded and re-executed on each read. The work is real, and you pay it <em>per request</em>.`,
      ],
      callout: { kind: 'warn', text: 'A plain view is only a named query. Every read re-scans, re-joins and re-aggregates the base tables — the cost repeats on each request.' },
      metrics: { latency: 2400, freshness: 0, throughput: 20, events: 0 },
      scene: { view: 'slowquery', note: 'Each read drags the full join-and-aggregate across millions of base rows.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Materialize',
      title: 'Compute once, store the result',
      body: [
        `A <span class="term">materialized view</span> runs that expensive query <b>once</b> and saves its output to disk as real, queryable rows — a small summary table that lives alongside your data.`,
        `Now the heavy join and aggregate happen a single time, not on every visit. The dashboard's thousands of rows collapse into a handful of precomputed totals, ready to serve.`,
      ],
      callout: { kind: 'insight', text: 'Materializing turns a repeated computation into stored data: pay the query cost once at build time, not on every read.' },
      changes: ['+ run the join + aggregate once', '+ store the result on disk', '~ a small summary table, not millions of rows'],
      metrics: { latency: 2400, freshness: 50, throughput: 60, events: 0 },
      scene: { view: 'materialize', note: 'The costly query is evaluated once; its result is written out as a compact stored table.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Fast reads',
      title: 'Reads hit the stored result directly',
      body: [
        `A query against the materialized view no longer touches the base tables at all — it reads the precomputed rows, like reading any small table. Milliseconds, not seconds.`,
        `Unlike an in-memory cache, this result is <b>durable</b> and <b>queryable</b>: you can filter it, index it, join it. It's a first-class dataset derived from your source.`,
      ],
      callout: { kind: 'tip', text: 'A materialized view is like a cache that is durable and queryable — reads scan a small stored result instead of recomputing from the base tables.' },
      metrics: { latency: 8, freshness: 50, throughput: 9000, events: 0 },
      scene: { view: 'fastread', note: 'Many readers hit the compact stored result; the base tables sit untouched.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Keep it fresh',
      title: 'Full refresh vs incremental maintenance',
      body: [
        `The catch: the stored result goes <span class="term">stale</span> as the source changes. Two ways to keep it current. <b>Full refresh</b> recomputes the whole view on a schedule — simple, but stale between runs and expensive to rebuild.`,
        `<b>Incremental maintenance</b> treats each source insert/update/delete as an <span class="term">event</span> and applies just that delta to the view — like a stream processor maintaining a running total. Always fresh, far less work per change.`,
      ],
      callout: { kind: 'insight', text: 'A materialized view is derived data maintained from the source’s change stream. Full refresh rebuilds periodically; incremental maintenance applies each change as it arrives.' },
      changes: ['+ full refresh: recompute on a schedule', '+ incremental: apply each change event', '~ freshness vs rebuild cost'],
      metrics: { latency: 8, freshness: 200, throughput: 9000, events: 1 },
      scene: { view: 'refresh', note: 'Source changes stream in as events; the view updates in place instead of rebuilding.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'The cost',
      title: 'Fast reads, paid for at write time',
      body: [
        `Materialized views are a classic <b>space-and-write for time</b> trade. You spend extra storage for the stored result, and extra work on every write (or every refresh) to keep it in sync.`,
        `And there's a <span class="term">staleness window</span>: unless you maintain it incrementally, readers see data as old as the last refresh. Materialize the queries that are read far more than they're written — not the ones that churn constantly.`,
      ],
      callout: { kind: 'warn', text: 'You trade storage and write/refresh cost for read speed, and accept a staleness window. Best for read-heavy, slowly-changing results — not write-churned data.' },
      metrics: { latency: 8, freshness: 200, throughput: 9000, events: 1 },
      scene: { view: 'tradeoff', note: 'Read cost plummets; storage and write/maintenance cost rise to pay for it.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Precomputed reads, maintained from change',
      body: [
        `A materialized view precomputes an expensive query and stores the answer, so reads are instant. It stays correct by being maintained from the source's stream of changes — on a schedule, or event by event.`,
        `This is the heart of <b>derived data</b>: the same idea powers search indexes, caches, data warehouses and read-optimized replicas. Pick a refresh strategy to set where you sit on the freshness-versus-cost line.`,
      ],
      callout: { kind: 'insight', text: 'Materialize to trade storage + maintenance cost for fast reads; the refresh strategy (full vs incremental) sets the freshness/cost balance. The pattern behind indexes, caches and warehouses.' },
      metrics: { latency: 8, freshness: 60, throughput: 9000, events: 1 },
      scene: { view: 'recap', note: 'Compute once, read many — a derived result kept current from the source.' },
    },
  ],
};
