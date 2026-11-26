/* content/b-plus-tree-insert.js — the "B+ Tree Insert" lesson, as DATA.
   Same shape as the other lessons: each step is { chapter, short, title,
   body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/b-plus-tree-insert-scene.js. */

export const bPlusTreeInsertLesson = {
  id: 'b-plus-tree-insert',
  title: 'B+ Tree Insert',
  group: 'Storage Engine',
  summary: 'How a new key finds its place in a B+ tree — and how a full leaf splits in two so the tree stays perfectly balanced, without ever growing taller than it must.',
  minutes: 10,
  level: 'intermediate',
  metrics: ['height', 'splits', 'pages', 'fanout'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Every insert begins with the same search: descend to a leaf', step: 0 },
    { text: 'When the leaf has room, the key just slots into sorted order', step: 1 },
    { text: 'A full leaf cannot grow — it overflows and must split', step: 2 },
    { text: 'Splitting makes two half-full leaves and copies a separator up', step: 3 },
    { text: 'The parent absorbs the separator; the tree stays balanced', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Descend',
      title: 'Every insert starts as a search',
      body: [
        `Inserting into a B+ tree is never a guess about <em>where</em> a key goes — the structure decides. You run the ordinary search: start at the root, follow the child pointer whose key range contains your new key, and keep descending until you reach the one <span class="term">leaf</span> that should hold it.`,
        `Here we want to add <code>24</code>. The search lands on the middle leaf — the only place <code>24</code> belongs in sorted order. But that leaf is already <b>full</b>: three keys in three slots, with nowhere to put a fourth.`,
      ],
      callout: { kind: 'tip', text: 'An insert is a search that ends in a write. The tree, not the caller, chooses the target leaf — that is what keeps every key globally in order.' },
      metrics: { height: 2, splits: 0, pages: 2, fanout: 4 },
      scene: { view: 'find', note: 'Descend to the leaf that must hold 24 — and find it already full.' },
    },
    { // 1 — SOLUTION (the easy case)
      chapter: 'solution', short: 'Room to spare',
      title: 'The easy case: the leaf has room',
      body: [
        `Most inserts are uneventful. If the target leaf still has a free slot, the key simply drops into its sorted position and the larger neighbours shift one place to the right inside the page. No pointers move, no parent is touched, nothing splits.`,
        `A leaf that holds up to three keys but currently holds two can absorb <code>24</code> directly, becoming <code>20 · 24 · 26</code>. One page write, and we are done.`,
      ],
      callout: { kind: 'insight', text: 'The common path is cheap: one page read to find the leaf, one page write to store the key. Splits are the exception, not the rule.' },
      changes: ['~ shift neighbours right', '+ key stored in place', '= no split'],
      metrics: { height: 2, splits: 0, pages: 1, fanout: 4 },
      scene: { view: 'simple', note: 'A leaf with a free slot just takes the key — neighbours shift right.' },
    },
    { // 2 — PROBLEM (overflow)
      chapter: 'problem', short: 'Overflow',
      title: 'A full page cannot simply grow',
      body: [
        `Back to the hard case. The target leaf already holds <code>20 · 26 · 31</code>, and <code>24</code> belongs right in the middle. Logically there are now four keys — but a leaf <em>is</em> a single fixed-size page, and a page cannot stretch to hold a fourth.`,
        `This is the moment that defines the whole algorithm. We can't overflow onto a neighbour (that would scramble the sorted order), and we can't make the page bigger. The leaf has to be <span class="term">split</span> into two.`,
      ],
      callout: { kind: 'warn', text: 'A leaf is one page of a fixed size. “Insert into a full leaf” has exactly one answer: split it, and push the tree’s shape to adjust.' },
      metrics: { height: 2, splits: 0, pages: 1, fanout: 4 },
      scene: { view: 'overflow', note: 'Four keys, three slots — the page overflows and must split.' },
    },
    { // 3 — TECHNIQUE (the split)
      chapter: 'technique', short: 'Split',
      title: 'Split the leaf, copy a separator up',
      body: [
        `Take the four sorted keys <code>20 · 24 · 26 · 31</code> and divide them down the middle into two half-full leaves: <code>20 · 24</code> on the left and <code>26 · 31</code> on the right. Both new leaves stay in the <b>leaf chain</b> — the sibling pointer is re-linked so a range scan still walks left-to-right across them.`,
        `Now the parent needs a way to tell the two apart. We take the first key of the right leaf, <code>26</code>, and <b>copy</b> it up into the parent as a new <span class="term">separator</span>. Note <em>copy</em>, not move: in a B+ tree every real key lives in a leaf, so <code>26</code> remains in the right leaf and also appears upstairs purely as a signpost.`,
      ],
      callout: { kind: 'insight', text: 'Leaf split = two half-full leaves + one separator key copied up. The copy (not move) is the defining difference from a classic B-tree, where the key would move up and leave the leaf.' },
      changes: ['+ split into 2 leaves', '~ re-link leaf chain', '+ separator 26 copied up'],
      metrics: { height: 2, splits: 1, pages: 3, fanout: 4 },
      scene: { view: 'split', note: 'Four keys become two leaves of two; 26 is copied up as the separator.' },
    },
    { // 4 — TECHNIQUE (parent absorbs)
      chapter: 'technique', short: 'Parent absorbs',
      title: 'The parent takes the separator in',
      body: [
        `The parent gains one entry: the separator <code>26</code> and the pointer to the new right leaf. It had a free slot, so it simply accepts them — <code>17 · 33</code> becomes <code>17 · 26 · 33</code>, now pointing at four leaves instead of three. Crucially, the tree is <b>still two levels tall</b>. A leaf split does not, by itself, make the tree deeper.`,
        `That is the elegance of the design: growth is absorbed sideways, by widening a level, far more often than downward. Only when a split reaches a parent that is <em>also</em> full does the split cascade upward — and if it cascades all the way to a full root, the tree finally gains a level. That root split is its own story.`,
      ],
      callout: { kind: 'tip', text: 'A split pushes one separator up one level. Usually the parent has room and height is unchanged; a cascade to a full root is the only thing that ever makes a B+ tree taller.' },
      changes: ['+ parent gains separator + pointer', '= height unchanged', '→ cascades only if parent full'],
      metrics: { height: 2, splits: 1, pages: 3, fanout: 5 },
      scene: { view: 'parent', note: 'The root absorbs 26 with room to spare — still two levels tall.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Insert, in one breath',
      body: [
        `The whole algorithm: <b>descend</b> to the leaf, <b>insert</b> the key in sorted order; if the leaf is full, <b>split</b> it into two half-full leaves, re-link the chain, and <b>copy</b> the middle separator up into the parent — cascading only if the parent is full too.`,
        `Because splitting always produces two leaves at the same depth, every leaf in the tree stays on the same level. The B+ tree repairs its own balance on the way up from every insert, which is exactly why lookups stay a fixed, tiny number of page reads no matter how much data you pour in.`,
      ],
      callout: { kind: 'insight', text: 'Inserts keep the tree balanced automatically: same-depth leaves in, same-depth leaves out. You never rebalance a B+ tree by hand.' },
      metrics: { height: 2, splits: 1, pages: 3, fanout: 5 },
      scene: { view: 'recap', note: 'Descend · insert sorted · split if full · copy separator up — always balanced.' },
    },
  ],
};
