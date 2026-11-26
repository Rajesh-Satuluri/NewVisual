/* content/sort-merge-join.js — the "Sort-Merge Join" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/sort-merge-join-scene.js. Rendered through the shared course shell. */

export const sortMergeJoinLesson = {
  id: 'sort-merge-join',
  title: 'Sort-Merge Join',
  group: 'Query Engine',
  summary: 'Join two relations by first sorting both on the join key, then walking them in lockstep with a pair of cursors — a single linear pass once they are ordered.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['rows', 'memory', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'The two phases: sort both inputs, then merge', step: 0 },
    { text: 'How the sort phase works (and spills)', step: 1 },
    { text: 'The lockstep merge that emits matches', step: 2 },
    { text: 'Why pre-sorted inputs make it nearly free', step: 3 },
    { text: 'When sort-merge is the right join', step: 4 },
  ],

  steps: [
    { // 0 — IDEA
      chapter: 'technique', short: 'Sort then merge',
      title: 'Two phases: sort, then merge',
      body: [
        `A <span class="term">sort-merge join</span> answers <code>users ⋈ orders ON users.id = orders.user_id</code> in two stages. First it <b>sorts</b> both inputs on the join key. Then it <b>merges</b> them — sweeping through both in one pass, like zipping two ordered lists together.`,
        `The insight: once two lists are sorted on the same key, finding every match takes a <em>single linear scan</em>, not a nested search. All the cost moves into the sort.`,
      ],
      callout: { kind: 'insight', text: 'Sort-merge trades an up-front sort for a cheap, linear merge. If the inputs are already sorted, you keep the merge and pay almost nothing.' },
      metrics: { rows: 2000, memory: 0, latency: 120 },
      scene: { view: 'idea', note: 'Both inputs unsorted — they must be ordered before they can be merged.' },
    },
    { // 1 — SORT PHASE
      chapter: 'technique', short: 'Sort phase',
      title: 'Order both inputs on the key',
      body: [
        `Each input is sorted by the join key. A small relation sorts in memory; a large one is split into sorted <span class="term">runs</span> that spill to disk and are merged back — an external sort.`,
        `This is the expensive half: sorting is <code>O(n log n)</code>, and big inputs pay extra I/O when runs spill. Everything after this is linear.`,
      ],
      callout: { kind: 'tip', text: 'The sort dominates the cost. Watch memory climb as sort buffers fill; when they overflow, sorted runs spill to disk and are merged in passes.' },
      changes: ['+ sort users by id', '+ sort orders by user_id', '~ large runs spill to disk'],
      metrics: { rows: 2000, memory: 64, latency: 90 },
      scene: { view: 'sort', note: 'Each side is sorted on the join key; oversized runs spill to disk.' },
    },
    { // 2 — MERGE PHASE
      chapter: 'technique', short: 'Merge phase',
      title: 'Walk both sides in lockstep',
      body: [
        `Two cursors start at the top of each sorted input. Compare the keys: if they are <b>equal</b>, emit the matched row and advance; if they differ, advance the cursor on the <em>smaller</em> key. Repeat to the end.`,
        `Because both sides only ever move forward, every row is read exactly once — the merge is <code>O(n + m)</code>, no matter how large the inputs.`,
      ],
      callout: { kind: 'insight', text: 'Advance the smaller key. Equal keys produce a match. Two forward-only cursors means one linear pass — that is the whole merge.' },
      changes: ['+ two cursors advance forward', '+ equal keys → emit match', '~ linear single pass'],
      metrics: { rows: 2000, memory: 64, latency: 40 },
      scene: { view: 'merge', note: 'Cursors advance in lockstep; equal keys emit a joined row.' },
    },
    { // 3 — PRE-SORTED
      chapter: 'technique', short: 'Already sorted',
      title: 'Skip the sort when input is ordered',
      body: [
        `The sort phase is optional. If an input already arrives sorted on the join key — say it is read through a <span class="term">B+Tree index</span> on <code>user_id</code>, or it is the sorted output of an earlier operator — the engine skips sorting that side entirely.`,
        `With both sides pre-sorted, a sort-merge join collapses to just the linear merge: one of the cheapest joins possible.`,
      ],
      callout: { kind: 'tip', text: 'An index that already orders rows on the join key turns sort-merge into merge-only. This is why the optimizer loves indexes that match join and ORDER BY keys.' },
      metrics: { rows: 2000, memory: 8, latency: 18 },
      scene: { view: 'presorted', note: 'An index delivers one side pre-sorted — no sort needed, straight to merge.' },
    },
    { // 4 — WHEN IT WINS
      chapter: 'tradeoff', short: 'When it wins',
      title: 'Where sort-merge shines',
      body: [
        `Sort-merge is the join of choice when inputs are <b>large</b>, when either side is <b>already sorted</b>, when the join is a <b>range</b> condition (hash join can't do <code>&lt;</code> or <code>&gt;</code>), or when the query's <code>ORDER BY</code> needs sorted output anyway — the sort does double duty.`,
        `Its weakness is the opposite case: two small, unsorted inputs, where a hash join skips the sort entirely and wins.`,
      ],
      callout: { kind: 'insight', text: 'Sort-merge: big inputs, pre-sorted data, range joins, or sorted output required. Hash join: unsorted equi-joins that fit in memory.' },
      metrics: { rows: 2000, memory: 64, latency: 40 },
      scene: { view: 'when', note: 'Range joins and sorted output favour sort-merge; small unsorted equi-joins favour hashing.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Sort once, merge linearly',
      body: [
        `A sort-merge join pays an up-front <code>O(n log n)</code> sort on each input, then zips them together in a single <code>O(n + m)</code> pass. Pre-sorted inputs skip the expensive half and leave only the cheap merge.`,
        `It is one of three core join algorithms — alongside nested-loop and hash join — and the optimizer's cost model picks between them per query.`,
      ],
      callout: { kind: 'insight', text: 'Cost = sort(each side) + linear merge. Remove the sort (via an index or an earlier sort) and sort-merge becomes nearly free.' },
      metrics: { rows: 2000, memory: 64, latency: 40 },
      scene: { view: 'recap', note: 'Sort-merge join: an up-front sort buys a linear merge.' },
    },
  ],
};
