/* content/bplus-tree-lab.js — the "B+ Tree Lab" interactive lesson, as DATA.
   A guided hands-on walkthrough: insert keys one at a time into a small-order
   B+ tree and watch leaves fill, split, and the root grow. Same step shape as
   the other db-scale lessons; `scene` is consumed by db/bplus-tree-lab-scene.js. */

export const bplusTreeLabLesson = {
  id: 'bplus-tree-lab',
  title: 'B+ Tree Lab',
  group: 'Interactive Labs',
  summary: 'Build a B+ tree by hand: insert keys one by one, watch a leaf fill and split, see a separator ride up to form a parent, and watch the root itself split as the tree stays perfectly balanced.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['height', 'fanout', 'splits', 'ioOps'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why an index is a shallow tree, not a sorted list', step: 0 },
    { text: 'Keys stay sorted inside every node', step: 1 },
    { text: 'A full leaf splits and pushes its middle key up', step: 2 },
    { text: 'Leaves link together for range scans', step: 3 },
    { text: 'When the root fills, the tree grows a new level', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM / setup
      chapter: 'problem', short: 'Empty tree',
      title: 'Start with one empty leaf',
      body: [
        `We will build a B+ tree the slow way — one key at a time — so every split is visible. Our tree has a tiny <span class="term">order</span>: each node holds at most <b>3 keys</b>. We'll insert <code>1, 2, 3, 4, 5, …</code> in order.`,
        `Why a tree at all? A sorted array lets you binary-search, but every insert shifts millions of rows. A B+ tree keeps data sorted <em>and</em> cheap to update, and its enormous <span class="term">fanout</span> keeps it <b>shallow</b> — so a lookup touches only a handful of disk pages.`,
      ],
      callout: { kind: 'tip', text: 'Each node = one disk page. Fewer levels means fewer page reads per lookup, so the whole game is keeping the tree short and wide.' },
      metrics: { height: 1, fanout: 3, splits: 0, ioOps: 0 },
      scene: { view: 'empty', note: 'One empty leaf, and a queue of keys waiting to go in.' },
    },
    { // 1 — fill a leaf
      chapter: 'technique', short: 'Fill a leaf',
      title: 'Insert until the leaf is full',
      body: [
        `Insert <code>1</code>, then <code>2</code>, then <code>3</code>. Each key drops into the single leaf, and the leaf keeps its keys in <b>sorted order</b>. After three inserts the leaf holds <code>[1 · 2 · 3]</code> — it is now <span class="term">full</span>.`,
        `So far the tree is just one node: height <b>1</b>, zero splits. A lookup for any key reads exactly one page. The next insert is where it gets interesting.`,
      ],
      callout: { kind: 'insight', text: 'A B+ tree never leaves keys unsorted inside a node — that ordering is what makes both point lookups and range scans fast.' },
      changes: ['+ inserted 1, 2, 3', '~ leaf sorted: [1 · 2 · 3]', '! leaf is now full'],
      metrics: { height: 1, fanout: 3, splits: 0, ioOps: 3 },
      scene: { view: 'leaf', note: 'The lone leaf fills to [1 · 2 · 3] — one more key will overflow it.' },
    },
    { // 2 — first split
      chapter: 'technique', short: 'First split',
      title: 'A full leaf splits — the middle key rides up',
      body: [
        `Insert <code>4</code>. The leaf would overflow, so it <span class="term">splits</span> in two: <code>[1 · 2]</code> on the left, <code>[3 · 4]</code> on the right. The <b>separator key <code>3</code></b> is copied up to a brand-new parent — and that parent becomes the <span class="term">root</span>.`,
        `The tree is now height <b>2</b>. The root holds just the separator <code>3</code>; follow left for keys <code>&lt; 3</code>, right for keys <code>≥ 3</code>. One split grew the tree a whole level — but it stayed perfectly balanced.`,
      ],
      callout: { kind: 'insight', text: 'Splits propagate UPWARD, never down. That is why every leaf always sits at the exact same depth — a B+ tree is self-balancing by construction.' },
      changes: ['+ inserted 4 → overflow', '✂ leaf splits: [1·2] | [3·4]', '↑ separator 3 pushed up → new root', '+ height 1 → 2'],
      metrics: { height: 2, fanout: 3, splits: 1, ioOps: 5 },
      scene: { view: 'split1', note: 'Inserting 4 splits the leaf; separator 3 climbs to form the root.' },
    },
    { // 3 — grow / linked leaves
      chapter: 'technique', short: 'Grow',
      title: 'Keep inserting — leaves link for range scans',
      body: [
        `Insert <code>5</code> and <code>6</code>. The right leaf fills and splits again, so now there are three leaves <code>[1·2]</code>, <code>[3·4]</code>, <code>[5·6]</code> under a root of <code>[3 · 5]</code>. Each split just adds a separator to the parent.`,
        `Notice the <b>dashed links</b> chaining the leaves left-to-right. In a B+ tree all real data lives in the leaves, and those leaves form a <span class="term">linked list</span> — so a range scan like <code>WHERE id BETWEEN 2 AND 6</code> finds the start, then walks sideways without climbing back up.`,
      ],
      callout: { kind: 'tip', text: 'Linked leaves are the B+ tree superpower over a plain B-tree: ordered range scans and full-table scans become a straight sequential walk.' },
      changes: ['+ inserted 5, 6', '✂ another leaf split', '~ root: [3 · 5], 3 leaves', '→ leaves linked for range scans'],
      metrics: { height: 2, fanout: 3, splits: 2, ioOps: 9 },
      scene: { view: 'grow', note: 'Three leaves under root [3 · 5], chained together for sideways scans.' },
    },
    { // 4 — root split
      chapter: 'technique', short: 'Root split',
      title: 'When the root fills, the tree gains a level',
      body: [
        `Keep going to <code>7</code> and <code>8</code>. More leaf splits push more separators up until the <b>root itself</b> fills and must split. Its middle key becomes a <em>new</em> root above two internal nodes — the tree is now height <b>3</b>.`,
        `This is the only way a B+ tree gets taller: a split at the very top. And it is rare — with real fanout in the hundreds, a 3-level tree already indexes millions of rows. Height grows like <code>log<sub>fanout</sub>(N)</code>, so even a billion keys is only ~4–5 pages deep.`,
      ],
      callout: { kind: 'warn', text: 'High fanout is everything: at 3 keys/node our toy tree is 3 levels for 8 keys, but at 400 keys/node a real tree is 3 levels for ~64 million keys.' },
      changes: ['+ inserted 7, 8', '✂ root overflows → root split', '↑ new root created', '+ height 2 → 3'],
      metrics: { height: 3, fanout: 3, splits: 4, ioOps: 15 },
      scene: { view: 'rootsplit', note: 'The root splits; a new root rises above two internals — height 3.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Balanced, sorted, and shallow — every time',
      body: [
        `We built the tree by hand and it enforced its own invariants at every step: keys <b>sorted</b> inside each node, every leaf at the <b>same depth</b>, each node at least <b>half full</b>, and all data in the linked leaves.`,
        `Those four rules are exactly why B+ trees power nearly every relational index (PostgreSQL, MySQL/InnoDB, SQLite): predictable <code>O(log N)</code> lookups, cheap inserts via local splits, and fast range scans along the leaf chain.`,
      ],
      callout: { kind: 'insight', text: 'Sorted + balanced + half-full + linked leaves → shallow trees, few page reads, and ordered scans. That is the whole reason B+ trees dominate on-disk indexing.' },
      metrics: { height: 3, fanout: 3, splits: 4, ioOps: 15 },
      scene: { view: 'recap', note: 'One balanced tree — the invariants held through every insert and split.' },
    },
  ],
};
