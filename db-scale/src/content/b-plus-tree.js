/* content/b-plus-tree.js — the "B+ Tree" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/b-plus-tree-scene.js. Rendered through the shared course shell. */

export const bPlusTreeLesson = {
  id: 'b-plus-tree',
  title: 'B+ Tree',
  group: 'Storage Engine',
  summary: 'The one refinement that turns a B-Tree into the index every relational database actually ships: push all the values down to the leaves and chain the leaves together.',
  minutes: 10,
  level: 'intermediate',
  metrics: ['fanout', 'height', 'pages', 'seeks'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a plain B-Tree is clumsy for ordered scans', step: 0 },
    { text: 'The B+ split: keys route, leaves hold the data', step: 1 },
    { text: 'Keys-only internal nodes buy a higher fan-out', step: 2 },
    { text: 'Linked leaves turn a tree into an ordered list', step: 3 },
    { text: 'One descent, then a sequential walk — fast ranges', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Scattered values',
      title: 'A B-Tree hides values everywhere',
      body: [
        `The plain B-Tree you just met stores a <b>value next to every key</b> — in the root, in the internal nodes, in the leaves. Point lookups are fast, but two things suffer.`,
        `First, a <span class="term">range scan</span> (<code>WHERE age BETWEEN 18 AND 44</code>) has to zig-zag up and down the tree to visit keys in order. Second, every value sitting in an internal node is payload that <em>isn't</em> a key — so each page holds fewer keys, and the tree is taller than it needs to be.`,
      ],
      callout: { kind: 'warn', text: 'Values in internal nodes steal space from keys (lower fan-out) and force ordered scans to wander the whole tree.' },
      metrics: { fanout: 128, height: 4, pages: 4, seeks: 4 },
      scene: { view: 'btree-recap', note: 'Plain B-Tree: values live in every node, so ordered scans zig-zag.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Values → leaves',
      title: 'Push every value down to the leaves',
      body: [
        `A <span class="term">B+ Tree</span> makes one clean split of responsibility. <b>Internal nodes become pure routers</b>: they hold only keys (separators) and child pointers — no values at all. <b>Every value lives in a leaf.</b>`,
        `The internal levels are now just a thin index <em>over</em> the leaves. To find a row you still descend from the root, but the data is guaranteed to be at the bottom — the search always ends in a leaf.`,
      ],
      callout: { kind: 'insight', text: 'Internal nodes route; leaves store. All data sits at the same depth, at the bottom of the tree.' },
      changes: ['~ internal nodes = keys only', '+ all values moved to leaves', '= uniform leaf depth'],
      metrics: { fanout: 256, height: 3, pages: 3, seeks: 3 },
      scene: { view: 'separation', note: 'Routers on top hold keys only; leaves at the bottom hold every value.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Higher fan-out',
      title: 'Keys-only nodes pack more keys',
      body: [
        `Here is the payoff. Because an internal node no longer carries values, the <em>same</em> fixed-size page can hold far more keys and child pointers — the <span class="term">fan-out</span> roughly doubles.`,
        `Higher fan-out means a shorter tree: with a fan-out of a few hundred, three levels already index tens of millions of rows. The tree gets <b>wider and flatter</b>, so any row is still a handful of page reads away.`,
      ],
      callout: { kind: 'tip', text: 'Same 8 KB page, no payload to carry ⇒ ~2× the keys ⇒ higher fan-out ⇒ a shallower tree.' },
      metrics: { fanout: 256, height: 3, pages: 3, seeks: 3 },
      scene: { view: 'fanout', note: 'Drop the values and a page holds roughly twice the keys.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Linked leaves',
      title: 'Chain the leaves into a list',
      body: [
        `Now the signature B+ move: each leaf keeps a <b>sibling pointer</b> to the next leaf in key order. Read the leaves left to right and you read <em>every</em> row in sorted order, never touching an internal node again.`,
        `The leaf level is, in effect, a sorted linked list of all the data — with the tree sitting on top purely to jump into the right place quickly.`,
      ],
      callout: { kind: 'insight', text: 'Leaves linked left→right = the whole table in sorted order, walkable without re-descending the tree.' },
      changes: ['+ sibling pointer per leaf', '= leaves form a sorted list', '+ sequential leaf scan'],
      metrics: { fanout: 256, height: 3, pages: 3, seeks: 3 },
      scene: { view: 'linked', note: 'Sibling pointers turn the leaf level into one ordered chain.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Range scans',
      title: 'Descend once, then walk',
      body: [
        `Put it together on a range query. The tree descends <b>once</b> to the first matching leaf — a few page reads — and then simply <span class="term">walks the leaf chain</span> sequentially until the range ends. No bouncing back up the tree, and the walk is sequential I/O, which disks love.`,
        `That is why <code>ORDER BY</code>, <code>BETWEEN</code> and prefix scans are so cheap on a B+ Tree index, while point lookups stay as fast as ever.`,
      ],
      callout: { kind: 'tip', text: 'Range = one descent + a sequential leaf walk. Point lookup = one descent. Both ride the same structure.' },
      metrics: { fanout: 256, height: 3, pages: 5, seeks: 3 },
      scene: { view: 'range', note: 'One descent to the first leaf, then a sequential walk along the chain.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The index every RDBMS ships',
      body: [
        `Three changes, one great index. <b>Keys-only internal nodes</b> raise the fan-out and flatten the tree. <b>All values in the leaves</b> put the data at a uniform depth. <b>Linked leaves</b> make ordered scans a straight walk.`,
        `The result does point lookups <em>and</em> range scans well, stays balanced, and maps cleanly onto disk pages — which is why PostgreSQL, MySQL/InnoDB, SQLite and friends all reach for the B+ Tree by default.`,
      ],
      callout: { kind: 'insight', text: 'Keys route · leaves store · leaves link. Point lookups and ranges, both fast — the default database index.' },
      metrics: { fanout: 256, height: 3, pages: 3, seeks: 3 },
      scene: { view: 'recap', note: 'Keys-only routers, all-value leaves, linked for ordered scans.' },
    },
  ],
};
