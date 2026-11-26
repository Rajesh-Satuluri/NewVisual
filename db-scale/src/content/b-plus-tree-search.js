/* content/b-plus-tree-search.js — the "B+ Tree Search" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/b-plus-tree-search-scene.js. */

export const bPlusTreeSearchLesson = {
  id: 'b-plus-tree-search',
  title: 'B+ Tree Search',
  group: 'Storage Engine',
  summary: 'How a B+ tree answers a query — a point lookup walks one root-to-leaf path, and a range scan descends once then walks the linked leaves. Both stay fast no matter how big the table grows.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['height', 'seeks', 'pages', 'rows'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why scanning every leaf is hopeless at scale', step: 0 },
    { text: 'Binary-search the separators at the root to pick a child', step: 1 },
    { text: 'Repeat down each internal level until a leaf', step: 2 },
    { text: 'A point lookup costs about one read per tree level', step: 3 },
    { text: 'A range scan descends once, then walks the leaf chain', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'The target',
      title: 'Find one row among millions',
      body: [
        `Here is a B+ tree index on <code>id</code>: a shallow <b>root</b>, a layer of <b>internal</b> nodes holding only separator keys, and a bottom layer of <b>leaves</b> that hold every key in sorted order, chained left to right.`,
        `The query is <code>WHERE id = 42</code>. The slow way is to read leaf after leaf until 42 turns up — that is <span class="term">O(n)</span>, millions of page reads. The tree exists so we never have to.`,
      ],
      callout: { kind: 'warn', text: 'A full leaf scan is linear in table size. On a billion-row table that is a non-starter — the whole point of the index is to avoid it.' },
      metrics: { height: 3, seeks: 0, pages: 0, rows: 2000000 },
      scene: { view: 'tree', note: 'A 3-level B+ tree. We want id = 42, hidden in one leaf.' },
    },
    { // 1 — TECHNIQUE
      chapter: 'technique', short: 'At the root',
      title: 'Start at the root, pick a child',
      body: [
        `Read the root page — the first and only node at the top. Its separator keys are <code>30</code> and <code>60</code>, splitting the key space into three ranges. Binary-search them: <code>42</code> falls in <code>[30, 60)</code>, so we follow the <b>middle</b> child pointer.`,
        `That is one page read, and it has already eliminated two-thirds of the tree.`,
      ],
      callout: { kind: 'tip', text: 'Internal nodes store keys only, no rows. Their sole job is to route you to the right child in one comparison.' },
      changes: ['read root page', '42 ∈ [30, 60) → middle child'],
      metrics: { height: 3, seeks: 1, pages: 1, rows: 2000000 },
      scene: { view: 'root', note: 'Binary-search the root separators → middle child.' },
    },
    { // 2 — TECHNIQUE
      chapter: 'technique', short: 'Descend',
      title: 'Repeat at the internal level',
      body: [
        `Follow the pointer and read the internal node. Same move: its separators are <code>42</code> and <code>54</code>, and <code>42 ≥ 42</code>, so we take the pointer toward the leaf that covers keys from 42 up.`,
        `Each level we descend is exactly <b>one more page read</b>, and each read narrows the search by the tree's <span class="term">fan-out</span> — hundreds of keys per node — so the number of levels stays tiny.`,
      ],
      callout: { kind: 'insight', text: 'High fan-out means a 3–4 level tree indexes millions to billions of rows. Height, not row count, sets the cost.' },
      changes: ['read internal page', '42 ≥ 42 → right pointer', 'seeks = 2'],
      metrics: { height: 3, seeks: 2, pages: 2, rows: 2000000 },
      scene: { view: 'descend', note: 'One more comparison selects the leaf.' },
    },
    { // 3 — TECHNIQUE
      chapter: 'technique', short: 'The leaf',
      title: 'Reach the leaf, read the row',
      body: [
        `The pointer lands on a <b>leaf</b> page. Binary-search inside it, find <code>42</code>, and follow its row pointer to the actual tuple. Done — in <b>three page reads</b> on a tree that could index millions of rows.`,
        `That is the whole promise of the index: a point lookup costs about one read per level, i.e. <code>O(log n)</code> with a huge base, instead of a linear scan.`,
      ],
      callout: { kind: 'insight', text: '3 seeks versus millions. The depth of the tree — not the size of the table — is what you pay.' },
      changes: ['read leaf page', 'find id = 42 → row pointer', 'seeks = height = 3'],
      metrics: { height: 3, seeks: 3, pages: 3, rows: 1 },
      scene: { view: 'leaf', note: 'Found id = 42 in the leaf — 3 reads, not millions.' },
    },
    { // 4 — TECHNIQUE
      chapter: 'technique', short: 'Range scan',
      title: 'Ranges walk the leaf chain',
      body: [
        `Now <code>WHERE id BETWEEN 42 AND 60</code>. Descend once, exactly as before, to the leaf holding the first matching key. Then — because every leaf is <b>linked to its right sibling</b> — just walk the chain, emitting rows, until a key exceeds 60.`,
        `No re-descending the tree for each row. One <code>O(log n)</code> descent plus a cheap sequential sweep of adjacent leaves.`,
      ],
      callout: { kind: 'tip', text: 'The linked leaf chain is exactly why it is a B+ tree, not a plain B-tree: range and ORDER BY scans become sequential leaf walks.' },
      changes: ['descend once to first leaf', 'walk siblings → 42, 48, 54, 60', 'stop at 72 > 60'],
      metrics: { height: 3, seeks: 3, pages: 5, rows: 14 },
      scene: { view: 'range', note: 'Descend once, then stream the linked leaves until past 60.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Two queries, one shallow tree',
      body: [
        `A <b>point lookup</b> is a single root-to-leaf path: roughly one page read per level, a handful of reads total. A <b>range scan</b> is one descent followed by a walk along the sorted, linked leaves.`,
        `Because internal nodes are pure routers and leaves are sorted and chained, the B+ tree serves equality, range and ordered reads — all while the tree stays only a few levels deep.`,
      ],
      callout: { kind: 'insight', text: 'Point = descend. Range = descend once + walk. Both ride the same shallow, sorted structure — that is why B+ trees are the default database index.' },
      metrics: { height: 3, seeks: 3, pages: 5, rows: 14 },
      scene: { view: 'recap', note: 'One structure, two fast access patterns.' },
    },
  ],
};
