/* content/b-plus-tree-root-split.js — the "B+ Tree Split" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/b-plus-tree-root-split-scene.js. Rendered through the shared course shell.

   Focus: the CASCADING split that propagates up a B+ tree and — when it reaches
   a full root — splits the root and grows the tree by one level. A root split is
   the only event that ever increases a B+ tree's height. */

export const bPlusTreeRootSplitLesson = {
  id: 'b-plus-tree-root-split',
  title: 'B+ Tree Split',
  group: 'Storage Engine',
  summary: 'How a single insert can ripple all the way up a B+ tree — and why splitting the root is the one and only way the tree ever gets taller.',
  minutes: 10,
  level: 'advanced',
  metrics: ['height', 'splits', 'pages', 'fanout'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why an insert into a full path cannot simply be absorbed', step: 0 },
    { text: 'A leaf split copies its separator key up to the parent', step: 1 },
    { text: 'When the parent is also full, the split must cascade upward', step: 2 },
    { text: 'An internal split moves its middle key up — it is not copied', step: 3 },
    { text: 'Splitting the root mints a new root and adds a level', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Full path',
      title: 'An insert with nowhere to go',
      body: [
        `We are inserting key <code>49</code> into a B+ tree. It belongs in one particular leaf — but that leaf is already <span class="term">full</span>. Worse, so is its parent, and so is the <b>root</b> above that. Every node on the path from root to leaf is packed.`,
        `A B+ tree node is a fixed-size page: once its keys fill the page, nothing more fits. When the whole path is full, the tree cannot absorb the new key by shuffling a few bytes. Something structural has to give.`,
      ],
      callout: { kind: 'warn', text: 'A node is a page of fixed capacity. When every node on the insert path is full, the insert cannot be done in place — the tree must reshape itself.' },
      metrics: { height: 3, splits: 0, pages: 7, fanout: 4 },
      scene: { view: 'full-path', note: 'Insert 49 — but the leaf, its parent, and the root are all full.' },
    },
    { // 1 — TECHNIQUE
      chapter: 'technique', short: 'Leaf split',
      title: 'The leaf splits and copies a key up',
      body: [
        `The overflowing leaf splits into two half-full leaves, and the new key lands in whichever half it belongs to. The two leaves stay chained together, so range scans are unaffected.`,
        `To tell the two leaves apart, the parent needs a divider. The first key of the <em>right</em> leaf is <b>copied</b> up into the parent as a separator. “Copied”, not moved: the key still physically lives in the leaf — a B+ tree keeps every real key down in the leaves.`,
      ],
      callout: { kind: 'insight', text: 'Leaf split: one full leaf becomes two half-full leaves, and the right leaf’s first key is COPIED up as a separator. The key stays in the leaf too.' },
      changes: ['+ leaf splits into two', '~ new key placed in a half', '+ separator key copied up'],
      metrics: { height: 3, splits: 1, pages: 8, fanout: 4 },
      scene: { view: 'leaf-split', note: 'The full leaf splits; its separator key is copied up to the parent.' },
    },
    { // 2 — PROBLEM
      chapter: 'problem', short: 'Parent full',
      title: 'But the parent has no room either',
      body: [
        `The separator has to be inserted into the parent — an internal node. But in our tree that parent is <span class="term">already full</span>. The push-up that fixed the leaf has just moved the overflow up one level.`,
        `This is the key insight about splits: they are <b>recursive</b>. A split at one level can force a split at the level above it. The problem walks upward, parent by parent, until it finds a node with free space — or runs out of tree.`,
      ],
      callout: { kind: 'warn', text: 'Inserting the separator overflows the parent. A split does not stop at one node — it can cascade up the tree, level by level.' },
      metrics: { height: 3, splits: 1, pages: 8, fanout: 4 },
      scene: { view: 'parent-full', note: 'The separator overflows the parent — the split cascades upward.' },
    },
    { // 3 — TECHNIQUE
      chapter: 'technique', short: 'Internal split',
      title: 'An internal node splits — and moves its middle key up',
      body: [
        `The full internal node splits into two internal nodes. But here the rule is different from a leaf. The <b>middle</b> key does not stay — it <span class="term">moves</span> up into the grandparent to separate the two new halves.`,
        `That difference matters. Leaves hold the real data, so a separator is <em>copied</em> and the key is kept below. Internal nodes hold only routing keys, so the promoted key <em>moves</em> and is removed from both halves — there is no reason to keep a duplicate in a signpost.`,
      ],
      callout: { kind: 'tip', text: 'Internal split: the middle key MOVES up (removed from both halves). Compare leaf split, where the separator is COPIED up and kept.' },
      changes: ['+ internal node splits in two', '~ middle key promoted upward', '− middle key removed from halves'],
      metrics: { height: 3, splits: 2, pages: 9, fanout: 4 },
      scene: { view: 'internal-split', note: 'Internal split: the middle key moves up — it is not copied.' },
    },
    { // 4 — SOLUTION
      chapter: 'solution', short: 'Root split',
      title: 'The root splits — and the tree grows a level',
      body: [
        `The cascade reaches the top. The <b>root</b> itself is full, so it splits in two — and now there is no parent to receive the promoted middle key. So the tree creates one: a <span class="term">brand-new root</span> with a single separator and two children, sitting above everything that was there before.`,
        `This is the whole point. A root split is the <em>only</em> operation that increases a B+ tree's <b>height</b>. The tree grew from three levels to four — and it grew at the <b>top</b>, not the bottom. Every leaf is still exactly the same distance from the root, so the tree stays perfectly balanced.`,
      ],
      callout: { kind: 'insight', text: 'Splitting the root mints a new root above the old one. This is the sole way a B+ tree gets taller — and because it grows at the top, every leaf stays equidistant from the root.' },
      changes: ['+ root splits in two', '+ a new root is created above', '~ height 3 → 4, still balanced'],
      metrics: { height: 4, splits: 3, pages: 11, fanout: 4 },
      scene: { view: 'root-split', note: 'A new root is born above the old one — the tree gains a level.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Why B+ trees grow from the top',
      body: [
        `Put the rules together. An insert that overflows a leaf triggers a split; the split cascades upward only as far as the first node with free space. A <b>leaf</b> split <em>copies</em> its separator up; an <b>internal</b> split <em>moves</em> its middle key up; a <b>root</b> split creates a new root and adds a level.`,
        `Because new levels are only ever added at the very top, all leaves move down together and remain at equal depth. That is how a B+ tree guarantees the same short, balanced path to every row — no matter how many inserts it absorbs.`,
      ],
      callout: { kind: 'insight', text: 'Copy up at leaves · move up at internals · split the root to add a level. Growth happens at the top, so the tree is always balanced.' },
      metrics: { height: 4, splits: 3, pages: 11, fanout: 4 },
      scene: { view: 'recap', note: 'Splits cascade up; only a root split adds height; every leaf stays equidistant.' },
    },
  ],
};
