/* content/index-scan.js — "Seq Scan vs Index Scan" lesson, as DATA.
   Same shape as content/dbms.js; rendered through the shared course shell.
   Scene snapshots are consumed by db/index-scan-scene.js. */

export const indexScanLesson = {
  id: 'index-scan',
  title: 'Seq Scan vs Index Scan',
  group: 'Query Engine',
  summary: 'To find the rows a query wants, the engine can read the whole table or jump straight to them through an index — and the right choice depends entirely on how many rows match.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['rows', 'pages', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'The two access paths: sequential scan vs index scan', step: 0 },
    { text: 'What an index actually is — a sorted key → location map', step: 1 },
    { text: 'How an index scan fetches only the pages it needs', step: 2 },
    { text: 'Selectivity: why an index can be the wrong choice', step: 3 },
    { text: 'How the optimizer picks between them by cost', step: 4 },
  ],

  steps: [
    { // 0 — two ways in
      chapter: 'technique', short: 'Two ways in',
      title: 'Two ways to reach the same rows',
      body: [
        `Our query filters <code>orders.total &gt; 100</code>. To find those rows the engine has a choice. A <span class="term">sequential scan</span> walks the whole <code>orders</code> table, page by page, and checks every row. An <span class="term">index scan</span> instead jumps through a pre-built index straight to the matching rows.`,
        `Both return exactly the same answer. They differ only in <b>how much they read</b> to get there — and that difference can be a thousandfold.`,
      ],
      callout: { kind: 'insight', text: 'Access path = how a table is read. Same rows out, wildly different work in. Choosing the path is one of the optimizer’s biggest jobs.' },
      metrics: { rows: 1, pages: 8, latency: 40 },
      scene: { view: 'twoways', note: 'One filter, two ways to answer it: scan everything, or jump via an index.' },
    },
    { // 1 — the index
      chapter: 'technique', short: 'The index',
      title: 'An index is a sorted map',
      body: [
        `An <span class="term">index</span> on <code>orders.total</code> is a separate, <b>sorted</b> structure — usually a B+Tree — that maps each key value to the <em>location</em> of its row (which page it lives on).`,
        `Because it is kept in sorted order, you can descend it like a phone book: a handful of pointer hops takes you from the root to exactly the keys you want, without ever touching the table itself.`,
      ],
      callout: { kind: 'tip', text: 'An index trades space and write cost for order. Sorted keys turn “find the matching rows” from a search of the whole table into a few guided hops.' },
      metrics: { rows: 1, pages: 8, latency: 40 },
      scene: { view: 'index', note: 'The index: a sorted B+Tree mapping key values to row locations.' },
    },
    { // 2 — index scan
      chapter: 'technique', short: 'Index scan',
      title: 'Fetch only the pages you need',
      body: [
        `An index scan descends the tree to the first matching key, then follows the index to each qualifying row and fetches <b>only those pages</b> from disk. For a selective filter that might be two pages instead of eight — or two out of ten million.`,
        `The table itself is never fully read. Most pages are skipped entirely, so the I/O cost tracks the number of <em>matching</em> rows, not the table’s size.`,
      ],
      callout: { kind: 'insight', text: 'Index scan cost scales with rows matched, not rows stored. That is the whole reason indexes exist.' },
      changes: ['~ descend index to matching keys', '+ fetch only qualifying pages', '- skip the rest of the table'],
      metrics: { rows: 1, pages: 2, latency: 4 },
      scene: { view: 'indexscan', note: 'Descend the index, fetch two pages, skip the other six.' },
    },
    { // 3 — selectivity
      chapter: 'technique', short: 'Selectivity',
      title: 'When the index is the wrong choice',
      body: [
        `Indexes are not always a win. <span class="term">Selectivity</span> is the fraction of rows a filter keeps. When <em>few</em> rows match, the index’s guided hops crush a full scan. But when <em>most</em> rows match, the index visits nearly every page anyway — in <b>random</b> order, which is far slower than reading the table <b>sequentially</b>.`,
        `Past a crossover point (often around 5–10% of rows) a plain sequential scan actually wins, because sequential I/O is cheap and skipping nothing beats jumping everywhere.`,
      ],
      callout: { kind: 'warn', text: 'Low selectivity (most rows match) favours a seq scan; high selectivity (few rows match) favours an index. An index on a column everyone matches is dead weight.' },
      metrics: { rows: 1, pages: 2, latency: 4 },
      scene: { view: 'selectivity', note: 'Few rows match → index wins. Most rows match → sequential scan wins.' },
    },
    { // 4 — the optimizer chooses
      chapter: 'technique', short: 'Optimizer picks',
      title: 'The optimizer picks by cost',
      body: [
        `You don’t choose the access path — the optimizer does, per query. Using table statistics it <b>estimates</b> how many rows the filter will keep, then prices both plans: the index scan’s guided page fetches versus the seq scan’s full sweep.`,
        `Whichever estimated cost is lower wins. The same query against the same table can pick an index one day and a scan the next, as the data — and the statistics — change.`,
      ],
      callout: { kind: 'tip', text: 'Give the optimizer good statistics and it routes each query to the cheaper path automatically. Stale statistics are how you end up with an accidental full scan.' },
      metrics: { rows: 1, pages: 2, latency: 4 },
      scene: { view: 'choose', note: 'Estimate both costs, take the cheaper path.' },
    },
    { // 5 — recap
      chapter: 'recap', short: 'Recap',
      title: 'Pay for the index, save on reads',
      body: [
        `A sequential scan is simple and reads everything; an index scan is guided and reads almost nothing — <em>when</em> the filter is selective. An index costs extra space and slows every write that must keep it up to date, in exchange for turning selective reads from table-sized work into a few hops.`,
        `Every access-method decision in the engine is this same trade, and it is why the next lessons dig into how indexes are built, costed, and chosen.`,
      ],
      callout: { kind: 'insight', text: 'Seq scan: cheap per page, reads all. Index scan: cheap per match, needs selectivity. The optimizer trades between them on every query.' },
      metrics: { rows: 1, pages: 2, latency: 4 },
      scene: { view: 'recap', note: 'Index = fast selective reads, paid for in space and write cost.' },
    },
  ],
};
