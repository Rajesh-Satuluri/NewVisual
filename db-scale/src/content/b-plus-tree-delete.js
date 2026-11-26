/* content/b-plus-tree-delete.js — the "B+ Tree Delete" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/b-plus-tree-delete-scene.js. */

export const bPlusTreeDeleteLesson = {
  id: 'b-plus-tree-delete',
  title: 'B+ Tree Delete',
  group: 'Storage Engine',
  summary: 'Removing a key is the easy part — keeping the tree balanced is the real work. How a B+ tree borrows from a neighbour or merges two nodes when a leaf runs too empty.',
  minutes: 10,
  level: 'advanced',
  metrics: ['height', 'fillFactor', 'pages', 'fanout'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Delete begins with the same root-to-leaf search', step: 0 },
    { text: 'If the leaf stays at least half full, just remove the key', step: 1 },
    { text: 'Dropping below the minimum fill is an underflow', step: 2 },
    { text: 'Borrow a key from a sibling that has one to spare', step: 3 },
    { text: 'Otherwise merge two nodes and pull the separator down', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Find it',
      title: 'Deletion starts as a search',
      body: [
        `Every key lives in a <b>leaf</b> of a B+ tree, so a delete begins exactly like a lookup: descend from the root, following separator keys down to the one leaf that could hold the target. Here we remove <code>37</code>, which lives in the leaf <code>[30, 37]</code>.`,
        `The removal itself is trivial — strike the key from the leaf. The danger is what it leaves behind: a B+ tree promises every node (except the root) is at least <span class="term">half full</span>, and that every leaf sits at the <em>same</em> depth. Delete carelessly and you break both.`,
      ],
      callout: { kind: 'insight', text: 'Keys only ever live in leaves, so a delete always targets a leaf. The hard part is repairing the balance invariant afterwards.' },
      metrics: { height: 3, fillFactor: 72, pages: 3, fanout: 4 },
      scene: { view: 'find', note: 'Descend root → leaf to locate the key marked for removal.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Simple delete',
      title: 'When the leaf stays healthy',
      body: [
        `Take an easier case first: delete <code>19</code> from the leaf <code>[11, 14, 19]</code>. After removal the leaf is <code>[11, 14]</code> — still at or above the minimum fill. Nothing else has to change.`,
        `Even if the removed value also appears as a <b>separator</b> higher up, that copy is only a <em>router</em>: it still steers searches to the correct side, so it can be left in place. A delete that keeps every node half full is the common, cheap path.`,
      ],
      callout: { kind: 'tip', text: 'If the leaf is still ≥ half full after removal, you are done. Separator copies above are routers — they need not match a live key.' },
      changes: ['− key 19 removed from leaf', '~ leaf still ≥ min fill', '= no restructuring'],
      metrics: { height: 3, fillFactor: 70, pages: 1, fanout: 4 },
      scene: { view: 'simple', note: 'Leaf stays at least half full — remove the key in place and stop.' },
    },
    { // 2 — PROBLEM
      chapter: 'problem', short: 'Underflow',
      title: 'Falling below the minimum',
      body: [
        `Now the hard case. Delete <code>37</code> from <code>[30, 37]</code> and the leaf becomes <code>[30]</code> — a single key, <b>below</b> the minimum fill for this order. That is an <span class="term">underflow</span>.`,
        `An under-full node wastes space, and left unchecked the tree degrades toward a thin, deep, unbalanced shape — the very thing the B+ tree exists to prevent. The node cannot simply stay as it is; the structure has to borrow or merge to restore the invariant.`,
      ],
      callout: { kind: 'warn', text: 'A leaf with fewer than ⌈order/2⌉ keys violates the B+ invariant. Underflow must be repaired before the operation completes.' },
      changes: ['− key 37 removed', '! leaf now below min fill', '→ must rebalance'],
      metrics: { height: 3, fillFactor: 40, pages: 1, fanout: 4 },
      scene: { view: 'underflow', note: 'One key left — the leaf is under-full and breaks the invariant.' },
    },
    { // 3 — TECHNIQUE
      chapter: 'technique', short: 'Borrow',
      title: 'Borrow from a richer sibling',
      body: [
        `First choice: <b>redistribution</b>. If an immediate sibling has more than the minimum, the under-full leaf can <span class="term">borrow</span> one of its keys. The left sibling <code>[11, 14, 19]</code> has three — it can spare <code>19</code>.`,
        `Move <code>19</code> across into the under-full leaf, then <b>update the parent's separator</b> so it still marks the boundary between the two leaves. Both leaves are now legal, and the fix touched just three nodes — no merging, no change in height.`,
      ],
      callout: { kind: 'insight', text: 'Borrowing rebalances two siblings and rewrites one separator. It is the cheapest repair and leaves tree height untouched.' },
      changes: ['→ borrow key 19 from left sibling', '~ parent separator updated', '+ both leaves ≥ min fill'],
      metrics: { height: 3, fillFactor: 60, pages: 3, fanout: 4 },
      scene: { view: 'borrow', note: 'Sibling has a key to spare — move it over and fix the separator.' },
    },
    { // 4 — TECHNIQUE
      chapter: 'technique', short: 'Merge',
      title: 'Merge when nobody can spare',
      body: [
        `If <em>no</em> neighbour has a key to spare — each sibling sits exactly at the minimum — borrowing is impossible. Instead the under-full leaf is <span class="term">merged</span> with a sibling into a single node, and the now-redundant <b>separator in the parent is pulled down</b> and discarded.`,
        `Merging removes a key from the parent, which can push the <em>parent</em> below its minimum — so the same borrow-or-merge repair may cascade upward. If it reaches the root and empties it, the tree's <b>height shrinks by one</b>: the mirror image of a root split.`,
      ],
      callout: { kind: 'tip', text: 'Merge = coalesce two nodes + drop the parent separator. Underflow can propagate up the tree, and a merge at the root lowers the height.' },
      changes: ['→ merge leaf with sibling', '− parent separator removed', '↑ underflow may cascade', '~ height can drop by 1'],
      metrics: { height: 2, fillFactor: 75, pages: 3, fanout: 4 },
      scene: { view: 'merge', note: 'No spare keys — coalesce two leaves and drop the separator; height can fall.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Delete, then rebalance',
      body: [
        `The whole algorithm: <b>search</b> to the leaf, <b>remove</b> the key, and if that causes an underflow, <b>borrow</b> from a sibling when one can spare a key, otherwise <b>merge</b> two nodes and drop a separator — repeating up the tree as needed.`,
        `Because every repair is local and bounded by the height, a delete costs <code>O(log n)</code> page writes, all leaves stay at the same depth, and no node is ever left wastefully empty. The B+ tree heals itself after every removal.`,
      ],
      callout: { kind: 'insight', text: 'Remove → (borrow | merge) → maybe cascade. Balanced, same-depth leaves, half-full nodes — preserved on every delete in O(log n).' },
      metrics: { height: 3, fillFactor: 71, pages: 3, fanout: 4 },
      scene: { view: 'recap', note: 'Remove the key, borrow or merge to rebalance — the tree stays balanced.' },
    },
  ],
};
