/* content/b-tree.js — the "B-Tree" lesson, as DATA.
   Same shape as content/lsm.js and content/dbms.js: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/b-tree-scene.js. */

export const bTreeLesson = {
  id: 'b-tree',
  title: 'B-Tree',
  group: 'Storage Engine',
  summary: 'The disk-oriented search tree behind almost every database index: fat nodes, enormous fan-out, and a tree so shallow any row is a handful of page reads away.',
  minutes: 10,
  level: 'intermediate',
  metrics: ['fanout', 'height', 'pages', 'seeks'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a binary tree is a disaster on disk: too tall', step: 0 },
    { text: 'The fix — one fat node per page, with hundreds of keys', step: 1 },
    { text: 'High fan-out makes the whole tree only 3–4 levels deep', step: 2 },
    { text: 'A lookup descends the tree in a few page reads', step: 3 },
    { text: 'Always balanced, always sorted — point lookups and ranges', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Too tall',
      title: 'A binary tree is too tall for disk',
      body: [
        `A balanced <span class="term">binary search tree</span> is lovely in memory: each node holds one key and two children, and a lookup halves the search at every step. For a million rows that is about 20 steps; for a billion, about 30.`,
        `But a database index lives on <b>disk</b>, and every node you visit is a <em>separate</em> place on the platter — one random <span class="term">seek</span>. Thirty seeks to find one row, at ~10&nbsp;ms each, is a third of a second. The tree's great height is the whole problem.`,
      ],
      callout: { kind: 'warn', text: 'One key per node means a deep tree, and depth on disk means one random seek per level. Binary trees do not belong on spinning platters.' },
      metrics: { fanout: 2, height: 20, pages: 20, seeks: 20 },
      scene: { view: 'binary', note: 'One key per node → ~20 levels → ~20 random seeks for a single row.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Fat node',
      title: 'Make each node a whole page',
      body: [
        `The disk doesn't read one key at a time — it reads a whole <span class="term">page</span> (say 8&nbsp;KB) in one go. So stop wasting it. A <span class="term">B-Tree</span> node fills an entire page with <b>many</b> sorted keys and <b>many</b> child pointers — not two, but hundreds.`,
        `The number of children a node can hold is its <span class="term">fan-out</span>. With 8&nbsp;KB pages and small keys, fan-out is easily 256 or more. Each disk read you pay for now does hundreds of times more work.`,
      ],
      callout: { kind: 'insight', text: 'A B-Tree node is one page. Pack it with hundreds of keys and pointers so a single seek branches hundreds of ways, not two.' },
      changes: ['~ node = one full page', '+ hundreds of keys per node', '+ fan-out 2 → 256'],
      metrics: { fanout: 256, height: 3, pages: 3, seeks: 3 },
      scene: { view: 'node', keys: 9, note: 'One page = one node holding hundreds of sorted keys and child pointers.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Shallow',
      title: 'Huge fan-out ⇒ a shallow tree',
      body: [
        `Stack these fat nodes and the arithmetic flips in your favour. A root with fan-out 256 points at 256 children; those point at 256² ≈ 65&nbsp;000 nodes; one more level reaches 256³ ≈ <b>16 million</b>.`,
        `So three levels of nodes index millions of rows. The tree is enormously <b>wide</b> and barely <b>tall</b> — a root, a thin layer of internal nodes, and the leaves that hold the data. Height grows like log<sub>256</sub>(rows), which almost never moves.`,
      ],
      callout: { kind: 'tip', text: 'Root → internal → leaf. Fan-out of a few hundred means 3–4 levels cover from thousands to billions of rows.' },
      changes: ['+ root · internal · leaf levels', '~ height stays 3–4', '+ millions of rows indexed'],
      metrics: { fanout: 256, height: 3, pages: 3, seeks: 3 },
      scene: { view: 'tree', note: 'Three levels — root, internal, leaves — index millions of rows.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Descend',
      title: 'A lookup is a short descent',
      body: [
        `To find a key, start at the root and compare: the sorted keys split the space into ranges, and each range points at one child. Follow that pointer, read that page, compare again, descend. You reach the leaf holding your row in as many reads as the tree is tall.`,
        `That's <b>3 or 4 page reads</b> for a row among millions — versus thirty seeks for the binary tree. Same idea (halve the search), vastly fewer trips to disk, because each step branches hundreds of ways.`,
      ],
      callout: { kind: 'insight', text: 'Seeks ≈ tree height. A few hundred-way branches collapse a 30-seek binary descent into 3–4 page reads.' },
      changes: ['+ root → internal → leaf path', '~ 3 page reads, not 30 seeks'],
      metrics: { fanout: 256, height: 3, pages: 3, seeks: 3 },
      scene: { view: 'search', target: '42', note: 'Pick the child by key range, read its page, repeat — three reads to the row.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Balanced',
      title: 'Always balanced, always sorted',
      body: [
        `A B-Tree keeps every leaf at the <b>same depth</b> — it is self-balancing, splitting and merging nodes on insert and delete so it never grows a long skinny branch. And because keys stay <span class="term">sorted</span> within and across nodes, it serves both <em>point lookups</em> and <em>range scans</em> (<code>WHERE age BETWEEN 20 AND 30</code>) from the same structure.`,
        `The cost is bookkeeping on writes and some wasted space in half-full pages — but height grows only logarithmically, so ten times the rows adds <b>at most one</b> level.`,
      ],
      callout: { kind: 'tip', text: 'Balanced + sorted = predictable reads and free range scans. 10× the rows costs you one more level, not ten.' },
      changes: ['+ all leaves at equal depth', '+ range scans for free', '~ 10× rows → +1 level'],
      metrics: { fanout: 256, height: 4, pages: 4, seeks: 4 },
      scene: { view: 'balance', note: 'All leaves share one depth; 10× the rows lifts the height by just one.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The workhorse index',
      body: [
        `The B-Tree earns its place with one trick repeated: make each node a full page, pack it with hundreds of keys, and the tree turns broad and shallow. Any row is three or four page reads away, balance is automatic, and sorted order gives range scans for nothing.`,
        `This is the default index in Postgres, MySQL, SQLite and nearly everyone else. The next lessons sharpen it into the <b>B+Tree</b> — linked leaves and even better scans — and walk through search, insert, delete and split.`,
      ],
      callout: { kind: 'insight', text: 'Node = page · huge fan-out · shallow balanced sorted tree ⇒ any row in a handful of reads. The index every database reaches for first.' },
      metrics: { fanout: 256, height: 4, pages: 4, seeks: 4 },
      scene: { view: 'recap', note: 'Fat nodes, huge fan-out, a handful of reads to any row — the default index.' },
    },
  ],
};
