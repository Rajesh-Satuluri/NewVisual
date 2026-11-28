/* content/wide-column-modeling.js — "Wide-Column Modeling", the Cassandra / HBase /
   Bigtable column-family model, as DATA. Its scene lives on the NoSQL canvas: a row is
   a map of maps — a partition key over a wide, sparse, dynamic set of sorted columns. */

export const wideColumnModelingLesson = {
  id: 'wide-column-modeling',
  title: 'Wide-Column Modeling',
  group: 'NoSQL & Access-Pattern Modeling',
  summary: 'A wide-column row is keyed by a partition key and holds a wide, sparse, dynamic set of columns — a map of maps, not a relational table. Columns are created per write, sorted, and cost nothing when absent, which is what makes the model fit time-series and per-entity event streams.',
  minutes: 7,
  level: 'intermediate',
  metrics: ['columns', 'partitions', 'items', 'scanRows'],
  legend: [],
  goals: [
    { text: 'A wide-column row is a map of maps, not a fixed relational table', step: 0 },
    { text: 'One row can hold thousands of columns, created per write', step: 1 },
    { text: 'Columns are dynamic: each write names its own columns, no schema change', step: 2 },
    { text: 'Columns are stored sorted, so a column-range read is contiguous', step: 3 },
    { text: 'Absent columns are free — sparse rows beat a grid of relational nulls', step: 4 },
    { text: 'Model the row as a partition whose columns are the query you run', step: 5 },
  ],

  steps: [
    { // 0 SETUP
      chapter: 'setup', short: 'A map of maps',
      title: 'A row is a map of maps, not a table',
      body: [
        `In a wide-column store — <span class="term">Cassandra</span>, HBase, Bigtable — the unit is not a row in a rigid table but a <b>partition keyed by a partition key</b> that holds a map of <code>column → value</code>. Picture it as a <span class="term">map of maps</span>: <code>partition key → ( column key → value )</code>. The outer map locates the row; the inner map is the row's own columns.`,
        `This is the first thing to unlearn from relational modeling: there is no fixed set of columns that every row must fill. Row <code>user#42</code> and row <code>user#43</code> can carry entirely <b>different</b> columns, because each row's columns are whatever that row's writes created. The "table" is just the shared key-space, not a shared shape.`,
      ],
      callout: { kind: 'insight', text: 'Think map of maps: partition key → (column key → value). The outer key finds the row; the inner map is this row’s own columns, which no other row has to match.' },
      metrics: { columns: 4, partitions: 2, items: 2, scanRows: 0 },
      scene: { view: 'maps', note: 'Two partitions keyed by partition key, each holding its own column→value map — different columns per row.' },
    },
    { // 1 PROBLEM / the wide sparse row
      chapter: 'problem', short: 'The wide sparse row',
      title: 'One row, thousands of columns',
      body: [
        `Because a row's columns are open-ended, a single partition can grow <b>wide</b> — hundreds or thousands of columns in one row. A per-user event stream stores each event as its own column under one <code>user#42</code> partition; a sensor stores a reading per timestamp. The row is not a tuple, it is a growing, ordered collection of cells that all share a home.`,
        `A relational table cannot absorb this. Adding a column is a schema migration, and a table with thousands of columns is pathological. The wide-column row treats "many columns" as the <em>normal case</em> — the columns <b>are</b> the data, and reading one partition hands you the whole wide run in a single seek.`,
      ],
      callout: { kind: 'warn', text: 'A relational table fixes its columns at design time; a wide row grows them at write time. Modeling a per-entity stream as columns is native here and a migration treadmill in SQL.' },
      changes: ['+ each event becomes a column under one partition', '~ one row holds thousands of sorted columns'],
      metrics: { columns: 2400, partitions: 1, items: 1, scanRows: 2400 },
      scene: { view: 'widerow', note: 'One user#42 partition holding thousands of event columns — a wide row read in a single seek.' },
    },
    { // 2 TECHNIQUE / dynamic columns per write
      chapter: 'technique', short: 'Dynamic columns',
      title: 'Each write names its own columns',
      body: [
        `Columns are <span class="term">dynamic</span>: a write supplies the column keys it wants, and they spring into existence for that row only. There is no <code>ALTER TABLE</code>, no central schema to coordinate. Write <code>ts#0931 = "login"</code> and that column now exists on <code>user#42</code>; it never exists on any row that did not write it.`,
        `This is why the model is called "schema-flexible at the row level". The partition key is fixed and planned, but the inner column keys are <b>data you choose per write</b> — often an encoded value like a timestamp or an event id. The column name carries meaning, exactly the inversion single-table design does with sort keys.`,
      ],
      callout: { kind: 'tip', text: 'A column is created by writing it, not by declaring it. The column key itself is modeled data — a timestamp, an event id — so the write defines the shape.' },
      changes: ['+ write ts#0931 = "login" → column appears', '~ no ALTER TABLE, no shared schema'],
      metrics: { columns: 3, partitions: 1, items: 1, scanRows: 0 },
      scene: { view: 'dynamic', note: 'Two writes add two differently-named columns to the same partition — columns created per write.' },
    },
    { // 3 TECHNIQUE / sorted clustering columns
      chapter: 'technique', short: 'Sorted columns',
      title: 'Columns are stored sorted',
      body: [
        `Within a partition the columns are kept in <b>sorted order</b> by their column key — in Cassandra these are the <span class="term">clustering columns</span>. Because a timestamp-keyed event stream is physically ordered newest-to-oldest (or oldest-to-newest), "the last 50 events for <code>user#42</code>" is a <b>column-range read</b> over one contiguous run, not a scan and sort.`,
        `This is the access pattern the model exists to serve: pick the partition, then slice a range of its sorted columns. Ordering is decided by the clustering column's type and direction, chosen up front, so the read you care about is always a single sequential sweep inside one partition.`,
      ],
      callout: { kind: 'insight', text: 'Sorted columns turn “the most recent N” into a range slice over a contiguous run — the same single-sweep read that single-table design gets from the sort key.' },
      changes: ['~ columns sorted by clustering key (ts)', '+ last-N = one contiguous column-range read'],
      metrics: { columns: 5, partitions: 1, items: 1, scanRows: 5 },
      scene: { view: 'sorted', note: 'Columns under one partition, sorted by timestamp — a range slice reads the most recent run contiguously.' },
    },
    { // 4 TRADEOFF / sparse vs relational nulls
      chapter: 'tradeoff', short: 'Sparse vs nulls',
      title: 'Absent columns cost nothing',
      body: [
        `A wide-column row is <span class="term">sparse</span>: a column that a row never wrote simply is not stored, and it costs zero bytes. Contrast the relational way to model heterogeneous attributes — one wide table where every row carries every column and fills the ones it lacks with <code>NULL</code>. Those nulls are stored, indexed, and scanned; the grid is mostly empty but fully materialized.`,
        `The tradeoff is real on both sides. Sparse columns make heterogeneous, evolving entities cheap and let a row hold what it actually has — but you lose the fixed shape that makes ad-hoc queries, cross-row aggregation and joins easy. Wide-column wins when rows differ and you read by partition; the relational grid wins when the shape is uniform and the questions keep changing.`,
      ],
      callout: { kind: 'warn', text: 'Sparse rows beat a null-filled grid for storage and heterogeneity, but you give up the uniform shape that ad-hoc queries and cross-row aggregation rely on.' },
      changes: ['+ absent columns are not stored (sparse)', '! no fixed shape → no easy ad-hoc cross-row query'],
      metrics: { columns: 3, partitions: 2, items: 2, scanRows: 0 },
      scene: { view: 'sparse', note: 'Two sparse rows storing only their own columns, beside a relational grid padded with NULLs.' },
    },
    { // 5 RECAP
      chapter: 'recap', short: 'Model the row',
      title: 'Model the partition around the read',
      body: [
        `Wide-column modeling is query-first at the level of the row. Choose a partition key that groups what you read together, then let each write add the sorted, sparse columns that answer the query — the last N events, the readings in a window, the fields this particular entity happens to have. A row is a map of maps, and you design the inner map to <em>be</em> the slice you will read.`,
        `The payoff is a model that stays fast as rows grow wide and diverge: time-series, per-user feeds, and wide sparse entities that a fixed table would force into migrations and nulls. The cost is the same one every NoSQL model pays — the access patterns are baked into the key and column design, so an unplanned query means a second table written in parallel.`,
      ],
      callout: { kind: 'insight', text: 'Partition key groups the read; dynamic sorted columns are the slice. Map of maps, shaped so one partition read is the query.' },
      metrics: { columns: 2400, partitions: 1, items: 1, scanRows: 50 },
      scene: { view: 'recap', note: 'The wide row as a designed partition: a sorted, sparse column map read by one partition-plus-range query.' },
    },
  ],
};
