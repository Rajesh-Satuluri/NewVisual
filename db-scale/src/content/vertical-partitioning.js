/* content/vertical-partitioning.js — the "Vertical Partitioning" lesson, as
   DATA. Same shape as the other db-scale lessons: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/vertical-partitioning-scene.js. */

export const verticalPartitioningLesson = {
  id: 'vertical-partitioning',
  title: 'Vertical Partitioning',
  group: 'Distributed Systems',
  summary: 'Split a table by its columns, not its rows: keep the hot, tiny fields together and bank the cold, bulky ones elsewhere, so a read only ever touches what it needs.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['columns', 'partitions', 'latency', 'throughput'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a wide table makes every read pay for columns it ignores', step: 0 },
    { text: 'Split columns into groups by how they are accessed', step: 1 },
    { text: 'Each group shares the primary key — a query touches only what it needs', step: 2 },
    { text: 'Columnar storage pushes this idea to the limit', step: 3 },
    { text: 'The cost: cross-group queries must stitch back by key', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Wide table',
      title: 'One wide row, and every read hauls the lot',
      body: [
        `A <code>users</code> table starts lean, then grows sideways: <span class="term">id</span>, <span class="term">name</span>, <span class="term">email</span> — but also an <span class="term">avatar</span> blob, a long <span class="term">bio</span>, a cached <span class="term">settings</span> JSON. Most pages only want the name and email.`,
        `But the row is <b>one physical unit</b>. To read a name the engine pulls the whole row off disk — avatar and all — so a few hot columns drag a pile of cold bytes through the cache on every single query.`,
      ],
      callout: { kind: 'warn', text: 'A row is stored as one unit. A handful of hot columns next to large cold ones means every read pays to move bytes it will never look at.' },
      metrics: { columns: 9, partitions: 1, latency: 120, throughput: 40 },
      scene: { view: 'wide', note: 'One table, nine columns — the hot three sit beside bulky cold ones.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Split by column',
      title: 'Cut the table down its columns',
      body: [
        `Horizontal partitioning slices a table into groups of <em>rows</em>. Vertical partitioning does the opposite: it slices into groups of <b>columns</b>. Sort columns by access pattern and store each group apart.`,
        `Put the small, constantly-read fields — id, name, email — in a <span class="term">hot</span> partition. Bank the rarely-touched avatar, bio and settings in a <span class="term">cold</span> partition, maybe on cheaper storage. Same rows, split down the middle.`,
      ],
      callout: { kind: 'insight', text: 'Vertical partitioning splits a table by columns. Group fields by how often they are read, not by what they mean.' },
      changes: ['+ hot partition: id · name · email', '+ cold partition: avatar · bio · settings', '~ same rows, two column groups'],
      metrics: { columns: 9, partitions: 2, latency: 55, throughput: 95 },
      scene: { view: 'split', note: 'Nine columns fan into a hot group of three and a cold group of six.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Shared key',
      title: 'Each group keeps the key — read only what you need',
      body: [
        `The trick that holds it together: every column group carries the <b>primary key</b>. The hot partition and the cold partition both key on <code>user_id</code>, so any row can be reassembled by matching keys.`,
        `Now a profile-list query reads <b>only</b> the hot partition — three slim columns, densely packed, cache-friendly. The cold partition sits untouched until something actually asks for an avatar.`,
      ],
      callout: { kind: 'tip', text: 'Give every column group the primary key. A query then reads only the groups it needs and rejoins them by key when it must.' },
      metrics: { columns: 3, partitions: 2, latency: 30, throughput: 150 },
      scene: { view: 'readhot', note: 'The read lands on the hot partition only; cold stays on disk, idle.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Columnar',
      title: 'Columnar storage takes it all the way',
      body: [
        `Push the idea to its limit and you get a <span class="term">column store</span>: every column is its own partition. An analytics scan over one column reads a tight, contiguous run of same-typed values — perfect for compression and vectorised reads.`,
        `This is why OLAP engines (Parquet, ClickHouse, Redshift) are columnar: a <code>SUM(amount)</code> over a billion rows touches one column, not the whole table. Vertical partitioning is the same lever, turned to eleven.`,
      ],
      callout: { kind: 'insight', text: 'A column store is vertical partitioning per column. Scanning one field reads one contiguous, compressible run — the heart of analytical speed.' },
      changes: ['+ one partition per column', '+ contiguous same-typed runs compress hard', '✓ analytical scans touch one column'],
      metrics: { columns: 1, partitions: 9, latency: 18, throughput: 260 },
      scene: { view: 'columnar', note: 'Every column becomes its own stack — a scan sweeps a single run.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Stitch cost',
      title: 'The bill: queries that span groups must rejoin',
      body: [
        `Separating columns is free only while a query stays inside one group. Ask for a name <em>and</em> an avatar and the engine must read <b>both</b> partitions and stitch them back together by key — an extra join on every such request.`,
        `So vertical partitioning shines when access patterns are <span class="term">separable</span>: hot fields almost always read together, cold fields almost always read alone. Mix them in every query and you have added work, not removed it.`,
      ],
      callout: { kind: 'warn', text: 'A query that needs columns from several groups must read each group and rejoin by key. Split only where access patterns truly diverge.' },
      metrics: { columns: 9, partitions: 2, latency: 70, throughput: 85 },
      scene: { view: 'stitch', note: 'A cross-group query reads both partitions and joins them back on the key.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Columns by access, rows left whole',
      body: [
        `Vertical partitioning asks a simple question of each column — <em>how often is this read, and with what?</em> — and groups by the answer. Hot stays fast and dense; cold moves out of the way; every row is still recoverable by key.`,
        `It is the column-wise cousin of the row-wise splits coming next. <b>Horizontal partitioning</b>, <b>hash</b> and <b>range</b> partitioning cut the <em>rows</em> instead — the other axis of making a big table manageable.`,
      ],
      callout: { kind: 'insight', text: 'Vertical splits columns by access pattern; horizontal splits rows by key. Together they are the two axes of partitioning a table at scale.' },
      metrics: { columns: 3, partitions: 2, latency: 30, throughput: 150 },
      scene: { view: 'recap', note: 'Two axes: vertical cuts columns, horizontal cuts rows.' },
    },
  ],
};
