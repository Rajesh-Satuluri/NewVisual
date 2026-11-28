/* content/single-table-design.js — "Single-Table Design", the DynamoDB-style
   pattern, as DATA. Its scene lives on the NoSQL canvas: heterogeneous items share
   one key-space, grouped into item collections a single query sweeps in one read. */

export const singleTableDesignLesson = {
  id: 'single-table-design',
  title: 'Single-Table Design',
  group: 'NoSQL & Access-Pattern Modeling',
  summary: 'One table holds many item types under an overloaded partition/sort key, so the items you read together share a partition and come back in a single query — the NoSQL answer to the join.',
  minutes: 9,
  level: 'advanced',
  metrics: ['collections', 'requests', 'itemsRead', 'joins'],
  legend: [],
  goals: [
    { text: 'One table stores heterogeneous item types under a generic PK/SK', step: 0 },
    { text: 'NoSQL has no join, so related data must be pre-grouped, not linked', step: 1 },
    { text: 'Items sharing a partition key form an item collection, sorted by sort key', step: 2 },
    { text: 'One query sweeps the whole collection — the join, done at write time', step: 3 },
    { text: 'The cost: opaque keys, access patterns fixed up front, hard to evolve', step: 4 },
    { text: 'Model every access pattern into the key design before you build', step: 5 },
  ],

  steps: [
    { // 0 SETUP
      chapter: 'setup', short: 'One table, many types',
      title: 'One table, many item types',
      body: [
        `In a relational schema each entity gets its own table. In <span class="term">single-table design</span> — the idiomatic DynamoDB pattern — a <b>single</b> table holds every entity type at once: users, orders, and order items all live together, told apart only by a generic <code>PK</code> (partition key) and <code>SK</code> (sort key) whose meaning is <em>overloaded</em> per item.`,
        `A user is <code>PK=USER#42, SK=PROFILE</code>; that user’s orders are <code>PK=USER#42, SK=ORDER#1001</code>. The keys carry structure as encoded strings, not as foreign keys. The schema looks almost empty — two key columns and a bag of attributes — because the design lives in the <b>key values</b>, not the columns.`,
      ],
      callout: { kind: 'insight', text: 'The table has no fixed columns beyond PK and SK. Entity type, relationships and hierarchy are all encoded into the key strings.' },
      metrics: { collections: 1, requests: 1, itemsRead: 3, joins: 0 },
      scene: { view: 'items', note: 'One table holding user, order and order-item records, distinguished only by overloaded PK/SK values.' },
    },
    { // 1 PROBLEM (no joins)
      chapter: 'problem', short: 'There is no join',
      title: 'NoSQL has no join to lean on',
      body: [
        `The relational design is three tables and a query that joins them: <code>users ⋈ orders ⋈ order_items</code>. A document or wide-column store offers <b>no join operator at all</b> — and at scale that is deliberate, because a distributed join means fanning a query across many partitions and nodes, the exact pattern that does not scale.`,
        `So the join cannot happen at read time. If the application needs a user <em>with</em> their orders in one fast request, those items must already be <b>sitting next to each other on disk</b> before the request arrives. You pre-compute the join by where you <em>place</em> the data.`,
      ],
      callout: { kind: 'warn', text: 'A distributed join scatters a query across partitions — the one thing a scalable store refuses to do. Placement replaces the join.' },
      changes: ['~ no join operator', '! related items must be co-located at write time'],
      metrics: { collections: 3, requests: 3, itemsRead: 7, joins: 2 },
      scene: { view: 'nojoin', note: 'Three relational tables joined at read time — the access the single-table design must reproduce without a join.' },
    },
    { // 2 TECHNIQUE (item collection)
      chapter: 'technique', short: 'Item collections',
      title: 'Share a partition key, share a home',
      body: [
        `The mechanism is the <span class="term">item collection</span>: every item with the same partition key is stored together in one partition, physically contiguous, sorted by sort key. Give the user profile and all of the user’s orders the same <code>PK=USER#42</code>, and the database lays them out side by side on a single node.`,
        `The sort key then imposes order and enables range scans: <code>SK=PROFILE</code> sorts before <code>SK=ORDER#1001 &lt; ORDER#1002</code>, so the profile and the orders form one tidy, ordered run. The relationship is not a pointer to follow — it is <b>adjacency</b>.`,
      ],
      callout: { kind: 'tip', text: 'Same partition key = same partition = physically together. The sort key orders the collection and powers range reads.' },
      changes: ['+ PK=USER#42 shared by profile + orders', '~ sorted by SK into one contiguous run'],
      metrics: { collections: 1, requests: 1, itemsRead: 3, joins: 0 },
      scene: { view: 'collection', note: 'All USER#42 items in one partition, sorted by SK — profile first, then each order, physically adjacent.' },
    },
    { // 3 TECHNIQUE (one query sweeps it)
      chapter: 'technique', short: 'One query, one read',
      title: 'One query returns the whole collection',
      body: [
        `Because the collection is contiguous, a single query — <code>PK = USER#42</code> with an optional sort-key range — returns the user <em>and</em> every order in <b>one read</b>, no join, no second round-trip. The work a relational engine does per-query (joining three tables) was done once, at write time, by choosing the keys.`,
        `This is the trade at the heart of NoSQL modeling: you move effort from read time to write/design time. Each access pattern the app needs is satisfied by one key lookup or one range sweep, which is what lets these stores hold single-digit-millisecond latency at any scale.`,
      ],
      callout: { kind: 'insight', text: 'The join happened when you chose the partition key. The query just sweeps a run that is already sitting together.' },
      metrics: { collections: 1, requests: 1, itemsRead: 3, joins: 0 },
      scene: { view: 'query', note: 'Query PK=USER#42 sweeps the whole item collection in one read — the pre-computed join.' },
    },
    { // 4 TRADEOFF
      chapter: 'tradeoff', short: 'The price',
      title: 'Keys are opaque and hard to change',
      body: [
        `Single-table design pays for its speed with <b>rigidity</b>. The key strings are cryptic (<code>USER#42 / ORDER#1001</code>), the table is unreadable without a data dictionary, and because every access pattern is baked into the key layout, a <em>new</em> query the design did not anticipate may require a secondary index or a full migration of the keys.`,
        `It also demands that you know your <b>access patterns up front</b> — the exact inversion of relational modeling, where a normalized schema answers questions you had not thought of yet via ad-hoc joins. Single-table design is fastest when the access patterns are known and stable, and most painful when they churn.`,
      ],
      callout: { kind: 'warn', text: 'You trade query flexibility for latency. Unanticipated access patterns are expensive; normalize instead when the questions keep changing.' },
      changes: ['! opaque keys, no ad-hoc queries', '! a new access pattern → new index or migration'],
      metrics: { collections: 1, requests: 1, itemsRead: 3, joins: 0 },
      scene: { view: 'tradeoff', note: 'Flexibility traded for latency: known patterns are instant, but an unplanned query needs a new index or key migration.' },
    },
    { // 5 RECAP
      chapter: 'recap', short: 'Design the keys',
      title: 'Model the access patterns into the keys',
      body: [
        `Single-table design is the purest expression of query-first modeling. List every access pattern the application needs, then design partition and sort keys so that each pattern is one lookup or one range sweep over an item collection that is already co-located. The join is replaced by <b>placement</b>, computed once when you write.`,
        `The result is a table that looks strange to a relational eye — heterogeneous items, encoded keys, no visible relationships — but answers each known query in a single millisecond-scale read. Secondary indexes (the next lesson) add the access patterns a single key layout cannot cover on its own.`,
      ],
      callout: { kind: 'insight', text: 'One table, overloaded keys, co-located collections: the join moved to design time so every read is a single sweep.' },
      metrics: { collections: 1, requests: 1, itemsRead: 3, joins: 0 },
      scene: { view: 'recap', note: 'The access patterns, encoded into PK/SK: each is one read over a pre-grouped item collection.' },
    },
  ],
};
