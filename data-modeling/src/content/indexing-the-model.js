/* content/indexing-the-model.js — the "Indexing the Model" lesson, as DATA.
   Same shape as the other Data Modeling lessons: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/indexing-the-model-scene.js and rendered through the shared
   course shell. Indexes are the physical-model decision the logical model and
   the real query workload drive. */

export const indexingTheModelLesson = {
  id: 'indexing-the-model',
  title: 'Indexing the Model',
  group: 'ER & Relational Design',
  summary: 'Indexes are a physical-model decision driven by the logical model and the queries — what to index, what it costs, and how access patterns feed back into the design.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['indexes', 'scanRows', 'rows', 'columns'],
  legend: [],
  goals: [
    { text: 'Without an index, a filter scans every row', step: 0 },
    { text: 'A B-tree index turns a scan into a lookup', step: 1 },
    { text: 'Index PKs, FKs, frequent filters, joins and sorts', step: 2 },
    { text: 'Composite and covering indexes serve multi-column access', step: 3 },
    { text: 'Every index taxes writes and storage', step: 4 },
    { text: 'Index for the queries you actually run', step: 5 },
  ],

  steps: [
    { // 0 — THE SCAN
      chapter: 'setup', short: 'The scan',
      title: 'Find without scanning',
      body: [
        `The logical model says <em>what</em> a <code>Customer</code> is; it says nothing about how fast you can <em>find</em> one. Run <code>SELECT * FROM customer WHERE email = ?</code> on a bare table and the engine has no choice but a <span class="term">sequential scan</span> — it reads every row, one after another, comparing each <code>email</code> until it has checked them all.`,
        `On fifty thousand rows that is fifty thousand reads to return a single match, and the cost grows linearly with the table. The data is modelled correctly; it is simply <b>not organised for retrieval</b>. That gap between a sound logical model and a fast physical one is exactly what an index closes.`,
      ],
      callout: { kind: 'warn', text: 'A query with no supporting index scans the whole table. Correct results, but a cost that climbs with every row you add.' },
      metrics: { indexes: 0, scanRows: 50000, rows: 50000, columns: 5 },
      scene: { view: 'scan', note: 'No index on email — the filter reads all 50,000 rows to find one.' },
    },
    { // 1 — THE INDEX
      chapter: 'technique', short: 'B-tree index',
      title: 'A B-tree index',
      body: [
        `An <span class="term">index</span> is a separate, sorted structure that maps column values to the rows that hold them — most often a <b>B-tree</b>, which stays balanced and lets the engine binary-search its way to a value in a handful of steps. Declare <code>CREATE INDEX ON customer(email)</code> and the lookup <code>WHERE email = ?</code> jumps straight to the match.`,
        `The same query that read fifty thousand rows now touches roughly one. Nothing about the logical model changed — the entity, its attributes and its key are identical — but the physical model now carries a structure tuned to one <span class="term">access pattern</span>. An index is the first and most common way the physical layer answers the questions the logical layer only described.`,
      ],
      callout: { kind: 'insight', text: 'A B-tree index converts a linear scan into a logarithmic lookup. The table is unchanged; a sorted side-structure makes finding cheap.' },
      changes: ['+ CREATE INDEX idx_customer_email ON customer(email)', '~ WHERE email = ? → index lookup, ~1 row'],
      metrics: { indexes: 1, scanRows: 1, rows: 50000, columns: 5 },
      scene: { view: 'index', note: 'idx(email) — the filter becomes a direct lookup of roughly one row.' },
    },
    { // 2 — WHAT TO INDEX
      chapter: 'technique', short: 'What to index',
      title: 'What to index',
      body: [
        `You index the <em>work</em>, not the schema. Five kinds of column repay an index: the <b>primary key</b> (indexed for you), every <b>foreign key</b> (so joins and cascade checks don't scan), the columns in frequent <b>WHERE filters</b>, the columns you <b>JOIN</b> on, and the columns you <b>ORDER BY</b> or <code>GROUP BY</code>, since a sorted index can skip the sort entirely.`,
        `The common thread is the <span class="term">access pattern</span>: look at the queries the application actually runs, and index the columns those queries touch to find, connect and order rows. A column no query filters, joins or sorts on gains nothing from an index — indexing it just adds cost for no return.`,
      ],
      callout: { kind: 'tip', text: 'Index foreign keys, frequent filters, join keys and sort columns. Let the real query workload — not a hunch — pick the list.' },
      changes: ['+ index each FK and hot filter column', '+ index ORDER BY / GROUP BY columns', '~ driven by observed access patterns'],
      metrics: { indexes: 4, scanRows: 1, rows: 50000, columns: 5 },
      scene: { view: 'what', note: 'Good candidates: primary key, foreign keys, filters, join keys, sort columns.' },
    },
    { // 3 — COMPOSITE & COVERING
      chapter: 'technique', short: 'Composite & covering',
      title: 'Composite & covering',
      body: [
        `When a query filters or sorts on several columns at once, a <span class="term">composite index</span> over them — <code>CREATE INDEX ON orders(status, created_at)</code> — serves it in one structure. <b>Column order matters</b>: the index is sorted by <code>status</code> first, so it helps queries that constrain <code>status</code> (the leftmost prefix) but not ones that filter on <code>created_at</code> alone.`,
        `Push it further and the index can answer the query by itself. A <span class="term">covering index</span> includes every column the query needs, so the engine reads only the index and never visits the table — an <em>index-only scan</em>. The reward is real, but each extra column widens the index and its upkeep, so you cover the few queries that matter, not all of them.`,
      ],
      callout: { kind: 'insight', text: 'A composite index is ordered left to right — design it for the query\'s leading columns. A covering index answers the query without touching the table.' },
      changes: ['+ CREATE INDEX ON orders(status, created_at)', '+ covering columns → index-only scan', '~ leftmost-prefix rule governs reuse'],
      metrics: { indexes: 5, scanRows: 1, rows: 50000, columns: 5 },
      scene: { view: 'composite', note: 'idx(status, created_at): multi-column, left-to-right; a covering index skips the table.' },
    },
    { // 4 — NOT FREE
      chapter: 'tradeoff', short: 'Not free',
      title: 'Not free',
      body: [
        `An index is a second copy of its columns, kept sorted. That has two standing costs. It takes <b>storage</b>, and — more sharply — it taxes <b>writes</b>: every <code>INSERT</code>, <code>UPDATE</code> or <code>DELETE</code> that touches an indexed column must also update each index on it. A table with six indexes turns one row write into seven structures to maintain, the effect called <span class="term">write amplification</span>.`,
        `So <span class="term">over-indexing</span> is its own failure mode: a wall of indexes built "just in case" slows every write, bloats storage and still leaves the queries that matter unserved. The physical model is a budget — you spend indexes on the reads that need them and no more, and you drop the ones no query uses.`,
      ],
      callout: { kind: 'warn', text: 'Every index you add is paid on every write. Six indexes make one row-write into seven updates — index for reads you have, not reads you imagine.' },
      changes: ['~ each write updates every index on the row', '+ storage + write-amplification cost', '− drop indexes no query uses'],
      metrics: { indexes: 6, scanRows: 1, rows: 50000, columns: 5 },
      scene: { view: 'cost', note: 'Six indexes: one row-write becomes seven structure updates, plus storage.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Index the workload',
      title: 'Index for the queries you run',
      body: [
        `Indexing is where the logical model meets the real workload. Start from the queries, not the tables: index <b>primary and foreign keys</b>, the columns you <b>filter, join and sort</b> on, and reach for <b>composite</b> or <b>covering</b> indexes when a query touches several columns at once. Each one trades cheaper reads for dearer writes and more storage.`,
        `That trade is the feedback loop between the logical and physical models. Access patterns you discover in production feed back as index decisions — and sometimes back into the logical design itself. Index the queries you actually run, measure, and keep only what earns its keep.`,
      ],
      callout: { kind: 'insight', text: 'Indexes are a physical-model choice the query workload drives: index the reads you have, pay for them on writes, and prune what nothing uses.' },
      metrics: { indexes: 3, scanRows: 1, rows: 50000, columns: 5 },
      scene: { view: 'recap', note: 'A right-sized set of indexes — chosen for the queries the system actually runs.' },
    },
  ],
};
