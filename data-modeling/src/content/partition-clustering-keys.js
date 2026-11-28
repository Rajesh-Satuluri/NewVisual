/* content/partition-clustering-keys.js — "Partition & Clustering Keys", the two-part
   key that decides physical layout in a distributed store (Cassandra / DynamoDB), as
   DATA. Its scene lives on the NoSQL canvas: rows route into partition bins by a hash
   of the partition key, then sort within by the clustering key. */

export const partitionClusteringKeysLesson = {
  id: 'partition-clustering-keys',
  title: 'Partition & Clustering Keys',
  group: 'NoSQL & Access-Pattern Modeling',
  summary: 'A compound key has two jobs: the partition key hashes a row onto a node to spread load and decide what is read together, and the clustering key orders rows within a partition to power range reads. Choosing the key is choosing your access patterns and your load distribution.',
  minutes: 7,
  level: 'intermediate',
  metrics: ['partitions', 'skew', 'itemsRead', 'accessPatterns'],
  legend: [],
  goals: [
    { text: 'A compound key splits into a partition key and a clustering key', step: 0 },
    { text: 'The partition key is hashed to decide which node holds the row', step: 1 },
    { text: 'The clustering key sorts rows within a partition for range reads', step: 2 },
    { text: 'A query is one partition plus a clustering-key range', step: 3 },
    { text: 'A low-cardinality partition key skews load onto one node', step: 4 },
    { text: 'Choose keys from the access patterns and the load you want spread', step: 5 },
  ],

  steps: [
    { // 0 SETUP
      chapter: 'setup', short: 'The two-part key',
      title: 'One key with two jobs',
      body: [
        `In a distributed store — <span class="term">Cassandra</span>, DynamoDB — the primary key is <b>compound</b>, and its two parts do two different jobs. The <span class="term">partition key</span> decides <em>where</em> a row lives: which node, which partition. The <span class="term">clustering key</span> (DynamoDB's sort key) decides the <em>order</em> of rows <em>within</em> that partition.`,
        `So a key like <code>(user_id, ts)</code> reads as: "group all rows by <code>user_id</code> onto one node, and inside each group keep them sorted by <code>ts</code>". The key is not just an identifier — it is a <b>physical layout instruction</b>. Get it right and every important read is a single node seek; get it wrong and you cannot fix it without rewriting the data.`,
      ],
      callout: { kind: 'insight', text: 'Partition key = which node (placement). Clustering key = order within the node (range reads). The key is a layout decision, not just an id.' },
      metrics: { partitions: 3, skew: 0, itemsRead: 0, accessPatterns: 0 },
      scene: { view: 'twopart', note: 'A compound key split into its two parts — partition key places the row, clustering key orders it within.' },
    },
    { // 1 TECHNIQUE / partition key routes by hash
      chapter: 'technique', short: 'Partition key routes',
      title: 'The partition key hashes to a node',
      body: [
        `The store <b>hashes</b> the partition key and uses the hash to assign the row to a partition, and that partition to a node. Two rows with the same partition key always land <em>together</em>; rows with different partition keys scatter across the ring. This is how the cluster spreads load — and it is why <b>what you can read in one request is exactly one partition key's worth of data</b>.`,
        `That makes the partition key the single most consequential modeling choice. It simultaneously fixes your <em>unit of distribution</em> (how evenly work spreads across nodes) and your <em>unit of co-location</em> (what comes back together). A good partition key names the thing you query by and read together — a user, a device, a tenant.`,
      ],
      callout: { kind: 'tip', text: 'hash(partition key) → node. Same key co-locates; different keys scatter. The partition key is both your load spreader and your “read these together” boundary.' },
      changes: ['~ hash(user_id) assigns the node', '+ same partition key → same node, read together'],
      metrics: { partitions: 3, skew: 0, itemsRead: 1, accessPatterns: 1 },
      scene: { view: 'route', note: 'Rows routing into partition bins by hash of the partition key — same key co-locates, different keys scatter.' },
    },
    { // 2 TECHNIQUE / clustering key sorts within
      chapter: 'technique', short: 'Clustering sorts',
      title: 'The clustering key sorts within',
      body: [
        `Inside a partition, rows are stored physically <b>sorted</b> by the clustering key. For <code>(user_id, ts)</code> the user's rows sit newest-to-oldest on disk, so "this user's last 20 events" is a contiguous slice, read in order with no sort step. The clustering key turns a partition into an <b>ordered sequence</b> you can seek into and range-scan.`,
        `You can stack several clustering columns — <code>(user_id, ts, event_id)</code> — to sort by one then the next, and choose each column's direction up front. Whatever ordering your range reads need, you bake it into the clustering key, because the disk order is decided once at design time and cannot be changed by a query.`,
      ],
      callout: { kind: 'insight', text: 'Clustering columns are the on-disk sort order. Design them to match the range and ordering your reads ask for — the query cannot re-sort a partition.' },
      changes: ['~ rows sorted by ts within the partition', '+ last-N = an ordered contiguous slice'],
      metrics: { partitions: 1, skew: 0, itemsRead: 20, accessPatterns: 1 },
      scene: { view: 'sort', note: 'Rows within one partition sorted by the clustering key — an ordered run ready for a range read.' },
    },
    { // 3 TECHNIQUE / query = partition + range
      chapter: 'technique', short: 'Partition + range',
      title: 'A query is a partition plus a range',
      body: [
        `Put the two parts together and the canonical query falls out: <b>fix one partition key, slice a range of clustering keys</b>. <code>WHERE user_id = 42 AND ts &gt; last_week</code> seeks to one node and sweeps a contiguous run — a single-partition, single-seek read that stays fast at any cluster size.`,
        `The flip side is the constraint: you can efficiently query <em>only</em> by partition key (equality) plus a clustering-key range. A query that filters by a non-key column, or spans many partition keys, forces a scatter-gather across the whole ring. The shape of your efficient queries <b>is</b> the shape of your compound key — so you model the key from the access patterns, not the other way around.`,
      ],
      callout: { kind: 'tip', text: 'Efficient read = partition key equality + clustering range. Anything else scatters across the ring. Model the key from the queries you must serve.' },
      changes: ['+ WHERE user_id=42 AND ts>… → one seek', '! filter off the key → scatter-gather'],
      metrics: { partitions: 1, skew: 0, itemsRead: 12, accessPatterns: 1 },
      scene: { view: 'query', note: 'One partition selected, a clustering-key range swept — the efficient single-seek read.' },
    },
    { // 4 TRADEOFF / bad partition key → skew
      chapter: 'tradeoff', short: 'Skew',
      title: 'A bad partition key skews the load',
      body: [
        `The partition key must have <b>high cardinality</b> and spread work evenly. Choose a low-cardinality key — <code>country</code>, <code>status</code>, a boolean, a single hot customer id — and the hash sends a huge share of rows and traffic to <em>one</em> partition. That node becomes a <span class="term">hot partition</span>: it saturates while its peers idle, and the cluster's throughput collapses to what one machine can do.`,
        `Worse, the partition is also the unbounded-growth unit. A key like <code>country = US</code> keeps accreting rows forever into a single partition that eventually exceeds its size limit. The fix is to pick a naturally even, high-cardinality key — or to <em>synthesize</em> one (add a bucket suffix, <code>country#shard</code>) to split the load. The next lesson, hot keys, is this failure in full.`,
      ],
      callout: { kind: 'warn', text: 'Low-cardinality or uneven partition keys concentrate load on one node — a hot partition that caps the whole cluster. Need high cardinality and even spread, or synthesize a shard suffix.' },
      changes: ['! partition key = country → one giant hot bin', '+ add a shard suffix to spread the load'],
      metrics: { partitions: 3, skew: 82, itemsRead: 0, accessPatterns: 1 },
      scene: { view: 'skew', note: 'A low-cardinality partition key piles most rows onto one hot bin while the others sit nearly empty.' },
    },
    { // 5 RECAP
      chapter: 'recap', short: 'Choose the keys',
      title: 'The key is the access pattern',
      body: [
        `Partition and clustering keys are the lever that sets both your <b>load distribution</b> and your <b>query shape</b> at once. The partition key decides what co-locates and how evenly work spreads; the clustering key decides the order you can range over. Choosing them well means listing the reads you must serve and the load you must spread, then naming the key so each read is one partition plus a range.`,
        `A good partition key is high-cardinality, evenly distributed, and matches "read these together". A good clustering key is the range or ordering you query by. Choose from the access patterns, never from the entity's natural identifier out of habit — because in a distributed store the key is physical, and physical layout is the one thing you cannot re-decide after the data lands.`,
      ],
      callout: { kind: 'insight', text: 'High-cardinality, even partition key for spread and co-location; clustering key for the range you read. Model the compound key straight from the access patterns.' },
      metrics: { partitions: 3, skew: 4, itemsRead: 12, accessPatterns: 3 },
      scene: { view: 'recap', note: 'A well-chosen compound key: rows spread evenly across partitions and sorted within for range reads.' },
    },
  ],
};
