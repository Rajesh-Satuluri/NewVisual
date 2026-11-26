/* content/index-types.js — the "Index Types" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/index-types-scene.js. Rendered through the shared course shell. */

export const indexTypesLesson = {
  id: 'index-types',
  title: 'Index Types',
  group: 'Storage Engine',
  summary: 'A field guide to the indexes a database offers — clustered, secondary, covering, composite and the specialized hash and bitmap forms — and when each one earns its keep.',
  minutes: 10,
  level: 'intermediate',
  metrics: ['indexes', 'pages', 'rows', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why an index exists: turn a full scan into a few page reads', step: 0 },
    { text: 'Clustered index — the leaf IS the row, one per table', step: 1 },
    { text: 'Secondary index — key → locator, with a hop back to the row', step: 2 },
    { text: 'Covering & composite indexes cut the hop and key on many columns', step: 3 },
    { text: 'Hash & bitmap specialists, and the write-cost every index charges', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Full scan',
      title: 'Finding a few rows by reading them all',
      body: [
        `A table is just rows sitting in pages. Ask for <code>WHERE email = ?</code> with no index and the engine has exactly one move: read <em>every</em> page, top to bottom, and check each row. A million rows to return three.`,
        `An <span class="term">index</span> is a second structure, kept in sync with the table, that lets the engine jump straight to the rows it wants. The rest of this lesson is the menu of shapes that jump takes.`,
      ],
      callout: { kind: 'warn', text: 'No index means a full table scan: cost grows with the whole table, not with the size of the answer. The classic reason a query "suddenly" gets slow.' },
      metrics: { indexes: 0, pages: 1280, rows: 1000000, latency: 820 },
      scene: { view: 'scan', note: 'No index: scan every page to find a handful of rows.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Clustered',
      title: 'Clustered index: the leaf is the row',
      body: [
        `A <span class="term">clustered index</span> stores the table's rows <em>themselves</em> in key order, as the leaves of a sorted tree. Reach the leaf and you already hold the full row — there is nothing more to fetch.`,
        `Because the rows can only be laid out in one physical order, a table has at most <b>one</b> clustered index — usually on its primary key. Range queries and ordered scans on that key become a single sweep along the leaves.`,
      ],
      callout: { kind: 'insight', text: 'Clustered = the table, sorted. One per table, because it defines the physical row order. Lookups and ranges on the key are as cheap as it gets.' },
      changes: ['+ rows stored in key order', '+ leaf holds the whole row', '~ one clustered index per table'],
      metrics: { indexes: 1, pages: 4, rows: 1000000, latency: 9 },
      scene: { view: 'clustered', note: 'Rows live in the leaves, sorted by key — the leaf is the row.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Secondary',
      title: 'Secondary index: a pointer back to the row',
      body: [
        `You also want fast lookups by <code>email</code>, but the rows are already clustered by <code>id</code>. A <span class="term">secondary index</span> solves it: a slim tree keyed on <code>email</code> whose leaves hold only the <b>key → row locator</b> — a pointer back to the clustered row (or heap position).`,
        `A lookup now takes two steps: descend the secondary index to the locator, then <em>hop</em> to the table to read the actual row. You may have many secondary indexes per table — one for each column you query by.`,
      ],
      callout: { kind: 'tip', text: 'Secondary index = key → locator. Many allowed per table, but each lookup pays an extra hop to fetch the row the locator points at.' },
      changes: ['+ many secondary indexes allowed', '+ leaf holds a row locator', '~ one extra hop per lookup'],
      metrics: { indexes: 2, pages: 6, rows: 1000000, latency: 14 },
      scene: { view: 'secondary', note: 'Secondary index points back to the clustered row — one extra hop.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Covering',
      title: 'Covering & composite: skip the hop, key on many columns',
      body: [
        `If a secondary index <b>includes</b> every column a query needs, the engine answers straight from the index and never hops to the table — an <span class="term">index-only scan</span>. Such an index is said to <em>cover</em> the query.`,
        `A <span class="term">composite index</span> keys on several columns at once, <code>(a, b, c)</code>. It is usable left-to-right by the <b>leftmost-prefix</b> rule: great for <code>a</code> or <code>a, b</code>, useless for <code>b</code> alone. Order the columns to match your queries.`,
      ],
      callout: { kind: 'insight', text: 'Covering index → no table hop. Composite index → one structure serves many column combinations, but only left-to-right. Column order is a design decision.' },
      changes: ['+ payload columns carried in the index', '+ index-only scan, no hop', '+ composite key (a, b, c)'],
      metrics: { indexes: 3, pages: 3, rows: 1000000, latency: 5 },
      scene: { view: 'covering', note: 'A covering index answers from itself; a composite key spans columns left-to-right.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Specialists',
      title: 'Specialists — and the price every index charges',
      body: [
        `The B+ tree is the all-rounder, but two specialists exist. A <span class="term">hash index</span> gives O(1) equality lookups and nothing else — no ranges, no ordering. A <span class="term">bitmap index</span> stores one bitmap per distinct value, ideal for low-cardinality columns and cheap <code>AND</code>/<code>OR</code> combining.`,
        `Every index has the same hidden cost: it speeds reads but <b>slows writes</b>. Each insert, update or delete must maintain <em>every</em> index on the table, and each index consumes storage. Indexes are a bet that reads outnumber writes.`,
      ],
      callout: { kind: 'warn', text: 'Hash = equality only. Bitmap = low-cardinality. B+ tree = ranges + sorting. All of them: faster reads, slower writes, more space. Add them deliberately.' },
      changes: ['+ hash index (equality)', '+ bitmap index (low cardinality)', '− every write maintains every index'],
      metrics: { indexes: 5, pages: 3, rows: 1000000, latency: 4 },
      scene: { view: 'specialized', note: 'Hash, bitmap, B+ tree — each a tool; all of them tax writes.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Choosing an index with intent',
      body: [
        `One <b>clustered</b> index sets the table's physical order; many <b>secondary</b> indexes point back to it. A <b>covering</b> index removes the hop; a <b>composite</b> index serves column prefixes; <b>hash</b> and <b>bitmap</b> handle special access patterns.`,
        `Indexes are not free — they trade write throughput and disk for read speed. The craft is picking the few that pay for themselves, keyed and ordered to match the queries that actually matter.`,
      ],
      callout: { kind: 'insight', text: 'Clustered · secondary · covering · composite · hash · bitmap. Each read pattern has a matching shape — and every index is a read-vs-write trade you choose on purpose.' },
      metrics: { indexes: 5, pages: 3, rows: 1000000, latency: 4 },
      scene: { view: 'recap', note: 'Match the index shape to the access pattern — deliberately.' },
    },
  ],
};
