/* content/secondary-indexes-nosql.js — "Secondary Indexes (GSI/LSI)", how NoSQL adds
   access patterns the primary key cannot serve, as DATA. Its scene lives on the NoSQL
   canvas: base items reprojected under a different key, with every base write fanning
   out to each index. */

export const secondaryIndexesNosqlLesson = {
  id: 'secondary-indexes-nosql',
  title: 'Secondary Indexes (GSI/LSI)',
  group: 'NoSQL & Access-Pattern Modeling',
  summary: 'A secondary index is a reprojection of the data under a different key, so you can query by attributes the primary key cannot serve. A GSI is a whole new partition+sort key with its own partitioning and eventual consistency; an LSI keeps the partition key and adds a sort key, strongly consistent — and every base write fans out to maintain them.',
  minutes: 7,
  level: 'intermediate',
  metrics: ['indexes', 'accessPatterns', 'copies', 'writeAmp'],
  legend: [],
  goals: [
    { text: 'The primary key serves one access pattern; others need another path', step: 0 },
    { text: 'A secondary index is the same data reprojected under a different key', step: 1 },
    { text: 'A GSI is a new partition+sort key, its own partitioning, eventually consistent', step: 2 },
    { text: 'An LSI keeps the partition key, adds a sort key, strongly consistent', step: 3 },
    { text: 'Every base write fans out to each index — write amplification', step: 4 },
    { text: 'Add an index per access pattern the base key cannot serve, and pay the write cost', step: 5 },
  ],

  steps: [
    { // 0 PROBLEM / a pattern the PK can't serve
      chapter: 'problem', short: 'A pattern the PK can’t serve',
      title: 'The primary key serves one shape',
      body: [
        `A table keyed by <code>(user_id, ts)</code> answers "this user's items, by time" in one seek. But the application also needs "all orders with <code>status = shipped</code>" — a query on a non-key attribute, across <em>every</em> user. The primary key cannot serve it: there is no partition to seek to, so the only option is a full <b>scan of the whole table</b>, the one read a distributed store is built to avoid.`,
        `This is the recurring NoSQL bind. The base key is chosen to make the <em>primary</em> access pattern a single-partition read, which is exactly why it cannot also serve a query shaped around a different attribute. You need a second physical path into the same data — a path keyed by the attribute you are now filtering on.`,
      ],
      callout: { kind: 'warn', text: 'A query on a non-key attribute has no partition to seek to, so it scans the whole table. The base key serves one shape; the rest need another access path.' },
      changes: ['! query by status → full table scan', '~ base key only serves (user_id, ts)'],
      metrics: { indexes: 0, accessPatterns: 1, copies: 1, writeAmp: 1 },
      scene: { view: 'gap', note: 'A query by a non-key attribute has no partition to seek to — the base key cannot serve it without a full scan.' },
    },
    { // 1 TECHNIQUE / the index as reprojection
      chapter: 'technique', short: 'A reprojection',
      title: 'An index reprojects the data',
      body: [
        `A <span class="term">secondary index</span> is the same items <b>reprojected under a different key</b>. The store re-buckets your base items by a new attribute — <code>status</code> — so the rows that shared no partition in the base table now sit together in the index, keyed and sorted the way the new query needs. "All shipped orders" becomes a single-partition read against the index.`,
        `Crucially, an index is itself a <b>derived table you query</b>, not a side pointer. It is a second copy of (part of) the data, materialized under its own key and kept in step by the database. You do not query the base and then consult the index — you query the <em>index</em> directly, and it returns items the way it is keyed.`,
      ],
      callout: { kind: 'insight', text: 'An index is a derived table: the same items re-bucketed under a new key. You query the index directly — it is a second, differently-keyed copy of the data.' },
      changes: ['+ index re-buckets items by status', '~ query the index as its own table'],
      metrics: { indexes: 1, accessPatterns: 2, copies: 2, writeAmp: 2 },
      scene: { view: 'reproject', note: 'Base items re-bucketed under a new key — the same rows reprojected into an index keyed by status.' },
    },
    { // 2 TECHNIQUE / GSI
      chapter: 'technique', short: 'GSI',
      title: 'A GSI: a whole new key',
      body: [
        `A <span class="term">Global Secondary Index</span> defines an entirely new <b>partition key and sort key</b> over the base items, with its <em>own</em> partitioning across the cluster — independent of how the base table is partitioned. It can serve any attribute as its partition key, which is what makes it "global": the query need not mention the base partition key at all.`,
        `The price of that freedom is <b>eventual consistency</b>. Because the index is partitioned separately, it is maintained <em>asynchronously</em> — a base write returns before the GSI reflects it, so a read against the GSI can briefly miss the latest change. GSIs are the general tool: any new access pattern, at the cost of a small, bounded staleness.`,
      ],
      callout: { kind: 'tip', text: 'GSI = new partition + sort key with its own partitioning, so it serves any attribute — but it is maintained async, so reads are eventually consistent.' },
      changes: ['+ GSI: partition=status, sort=ts', '! separately partitioned → eventually consistent'],
      metrics: { indexes: 1, accessPatterns: 2, copies: 2, writeAmp: 2 },
      scene: { view: 'gsi', note: 'A global secondary index: a new partition+sort key with its own partitioning, maintained asynchronously.' },
    },
    { // 3 TECHNIQUE / LSI
      chapter: 'technique', short: 'LSI',
      title: 'An LSI: same partition, new sort',
      body: [
        `A <span class="term">Local Secondary Index</span> keeps the base <b>partition key</b> and only adds an <b>alternate sort key</b>. It serves "this user's items, ordered by <em>amount</em> instead of time" — a different ordering <em>within the same partition</em>. Because it lives alongside the base items on the same node, it can be maintained synchronously and read with <b>strong consistency</b>.`,
        `The trade is reach: an LSI cannot change the partition key, so it only ever re-sorts <em>within</em> a partition, never re-buckets across the table. Use an LSI when you need an alternate ordering of one partition's items read consistently; reach for a GSI when the new access pattern needs a different partitioning entirely.`,
      ],
      callout: { kind: 'insight', text: 'LSI = same partition key, alternate sort key — a strongly-consistent re-ordering within a partition. It cannot cross partitions; that is a GSI’s job.' },
      changes: ['+ LSI: same PK, sort=amount', '~ strongly consistent, within-partition only'],
      metrics: { indexes: 2, accessPatterns: 3, copies: 3, writeAmp: 3 },
      scene: { view: 'lsi', note: 'A local secondary index: same partition key, an alternate sort key — strongly consistent, within one partition.' },
    },
    { // 4 TRADEOFF / write cost
      chapter: 'tradeoff', short: 'The write cost',
      title: 'Every base write fans out',
      body: [
        `Indexes are not free reads — they are <b>paid writes</b>. Every write to the base table must also update each index that projects the changed item, so the physical write <b>fans out</b>: one logical write becomes one base write plus one write per index. Three indexes turn a single <code>PutItem</code> into four writes — <span class="term">write amplification</span> of 4×.`,
        `This flips the usual tradeoff. Indexes make reads cheap by making writes expensive and by <em>duplicating</em> data — each index is another full copy to store and keep current. On a write-heavy table, a pile of indexes can cost more than the scans they replace. Index deliberately: one index per access pattern you truly need, and no more.`,
      ],
      callout: { kind: 'warn', text: 'Each index is another copy and another write on every change — N indexes mean (N+1)× write amplification. Reads get cheap by making writes and storage expensive.' },
      changes: ['! one write → base + one per index', '! each index duplicates the data'],
      metrics: { indexes: 3, accessPatterns: 4, copies: 4, writeAmp: 4 },
      scene: { view: 'writecost', note: 'One base write fanning out to three indexes — 4× write amplification, each index a full copy.' },
    },
    { // 5 RECAP
      chapter: 'recap', short: 'Index per pattern',
      title: 'An index per access pattern',
      body: [
        `Secondary indexes are how a NoSQL table escapes the one-shape limit of its primary key: each index is a reprojection of the data under a new key that serves one more access pattern. The base table serves the patterns its key was designed for; indexes serve the rest. A <b>GSI</b> gives you any new partitioning at the cost of eventual consistency; an <b>LSI</b> gives you a strongly-consistent alternate ordering within a partition.`,
        `But every index is a duplicated, separately-maintained copy, and every base write fans out to all of them. So model indexes the way you model keys — from the access patterns — and add exactly the ones your queries require. Index for the reads you must serve; pay the write amplification knowingly, not by accident.`,
      ],
      callout: { kind: 'insight', text: 'Base key for its pattern, an index per pattern it can’t serve — GSI for new partitioning, LSI for a consistent re-sort — each paid for in writes and storage.' },
      metrics: { indexes: 3, accessPatterns: 4, copies: 4, writeAmp: 4 },
      scene: { view: 'recap', note: 'The base table plus its indexes: each a reprojection serving one access pattern, each maintained by write fan-out.' },
    },
  ],
};
