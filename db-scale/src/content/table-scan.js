/* content/table-scan.js — the "Table Scan" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/table-scan-scene.js. Rendered through the shared course shell. */

export const tableScanLesson = {
  id: 'table-scan',
  title: 'Table Scan',
  group: 'Query Engine',
  summary: 'The simplest access method of all — read every page of the table, top to bottom, and filter the rows as you go. Sometimes it is exactly the right plan; sometimes it is the worst one.',
  minutes: 8,
  level: 'beginner',
  metrics: ['rows', 'pages', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'A sequential scan reads the whole table, page by page', step: 0 },
    { text: 'Disk I/O happens in pages, not single rows', step: 1 },
    { text: 'The filter runs <em>after</em> each row is read', step: 2 },
    { text: 'When a full scan is the optimal plan', step: 3 },
    { text: 'When a full scan is disastrously wasteful', step: 4 },
  ],

  steps: [
    { // 0 — read everything
      chapter: 'technique', short: 'Read everything',
      title: 'Read the whole table, in order',
      body: [
        `The most basic way to answer <code>WHERE total &gt; 100</code> is to look at <em>every</em> row. A <span class="term">sequential scan</span> (a “seq scan” or full table scan) walks the <code>orders</code> table from its first page to its last, handing every row up to the query.`,
        `There is no cleverness here and nothing to maintain — the engine just reads the table front to back. That simplicity is exactly why every database can always fall back to a scan.`,
      ],
      callout: { kind: 'tip', text: 'A sequential scan is the universal access method: no index required, always available, cost proportional to the size of the table.' },
      metrics: { rows: 2000, pages: 8, latency: 40 },
      scene: { view: 'seq', note: 'The scan sweeps every page of the table, left to right.' },
    },
    { // 1 — pages not rows
      chapter: 'technique', short: 'Pages, not rows',
      title: 'The unit of I/O is a page',
      body: [
        `Disks and SSDs do not hand back one row at a time. Storage is divided into fixed-size <span class="term">pages</span> (commonly 8&nbsp;KB), and the engine reads a <em>whole page</em> into the <b>buffer pool</b>, then iterates the rows packed inside it.`,
        `So the real cost of a scan is the number of <b>pages</b> it touches, not the number of rows. A thousand tiny rows on one page is one read; a thousand fat rows across a thousand pages is a thousand reads.`,
      ],
      callout: { kind: 'insight', text: 'Count pages, not rows. The whole of storage-engine design is about reading fewer pages to answer the same question.' },
      metrics: { rows: 2000, pages: 8, latency: 40 },
      scene: { view: 'pages', note: 'Whole pages are read into the buffer pool; rows live inside them.' },
    },
    { // 2 — filter after read
      chapter: 'technique', short: 'Filter after',
      title: 'Every row is read, then filtered',
      body: [
        `The <code>WHERE</code> clause becomes a <span class="term">σ</span> (selection) that runs <em>after</em> a row has already been read off its page. The scan pays the full read cost for every row and only then decides whether to keep it.`,
        `If the predicate matches almost everything, little is wasted. If it matches almost nothing, the engine has read the entire table only to throw nearly all of it away.`,
      ],
      callout: { kind: 'warn', text: 'A scan reads first and filters second. Rows that fail the predicate still cost a read — the filter saves CPU on later operators, not I/O here.' },
      metrics: { rows: 2000, pages: 8, latency: 44 },
      scene: { view: 'filter', note: 'σ is applied to every row — most are read, then discarded.' },
    },
    { // 3 — when it's fine
      chapter: 'technique', short: 'When it fits',
      title: 'When a scan is the right plan',
      body: [
        `Scanning is not a mistake — often it is <em>optimal</em>. If the table is small, it fits in a handful of pages and an index would only add overhead. If the query touches most of the rows anyway (a report, an aggregate over the whole table), you were going to read every page regardless.`,
        `In those cases a sequential scan is also the <b>fastest</b> plan, because it reads pages in physical order — the cheapest possible disk access pattern.`,
      ],
      callout: { kind: 'tip', text: 'Small table, or a query that reads most of it → a sequential scan wins. Sequential I/O is far cheaper per page than the random I/O an index incurs.' },
      metrics: { rows: 2000, pages: 8, latency: 38 },
      scene: { view: 'whenok', note: 'Most rows match — reading every page in order is optimal.' },
    },
    { // 4 — when it hurts
      chapter: 'technique', short: 'When it hurts',
      title: 'When a scan is disastrous',
      body: [
        `Now ask for a single customer out of ten million: <code>WHERE id = 42</code>. A sequential scan still reads <em>the entire table</em> — every page, every row — to return one record. The work is proportional to the data size, not the answer size.`,
        `This is the classic “why is my query slow?” — a full scan on a huge, highly selective lookup. It is the problem that indexes exist to solve, which is the very next lesson.`,
      ],
      callout: { kind: 'warn', text: 'Finding a needle by reading the whole haystack. When few rows match a large table, a full scan is the wrong plan — you need an index.' },
      metrics: { rows: 10000000, pages: 40000, latency: 9200 },
      scene: { view: 'whenbad', note: 'Forty thousand pages read to return a single row.' },
    },
    { // 5 — recap
      chapter: 'recap', short: 'Recap',
      title: 'Simple, and sometimes right',
      body: [
        `A sequential scan is the engine’s baseline: read every page in order, filter as you go. Its cost is the size of the table, so it shines when you need most of the table and sequential I/O is cheap — and it collapses when you need almost none of it.`,
        `The optimizer’s job is to know which case it is in. To give it a better option for the selective case, the database can build an <b>index</b> — exactly where we go next.`,
      ],
      callout: { kind: 'insight', text: 'Scan cost ∝ table size. Great for big, unselective reads; terrible for needle-in-haystack lookups. The index is the alternative.' },
      metrics: { rows: 2000, pages: 8, latency: 40 },
      scene: { view: 'recap', note: 'Read it all, filter as you go — the universal fallback plan.' },
    },
  ],
};
