/* content/aggregation.js — the "Aggregation" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/aggregation-scene.js. Rendered through the shared course shell. */

export const aggregationLesson = {
  id: 'aggregation',
  title: 'Aggregation',
  group: 'Query Engine',
  summary: 'How the engine collapses many rows into a few — GROUP BY and the aggregate functions, and the two algorithms that make them fast.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['rows', 'groups', 'memory'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why <code>GROUP BY</code> collapses many rows into few', step: 0 },
    { text: 'Hash aggregation: one bucket per group key', step: 1 },
    { text: 'Sort aggregation: a single pass over sorted rows', step: 2 },
    { text: 'Why aggregation can run out of memory', step: 3 },
    { text: 'Partial aggregation — the key to parallel GROUP BY', step: 4 },
  ],

  steps: [
    { // 0
      chapter: 'technique', short: 'Collapse',
      title: 'Many rows in, one row per group out',
      body: [
        `Most reporting queries don't want rows — they want <em>summaries</em>. <code>SELECT user_id, COUNT(*), SUM(total) FROM orders GROUP BY user_id</code> turns a million order rows into one row per customer.`,
        `An <span class="term">aggregation</span> operator reads a stream of input rows, buckets them by their <b>group key</b>, and maintains a running accumulator — a count, a sum, a max — for each bucket. When the input is exhausted, it emits one output row per group.`,
      ],
      callout: { kind: 'insight', text: 'GROUP BY splits rows into groups; the aggregate functions reduce each group to a single value. Many in, few out.' },
      metrics: { rows: 240000, groups: 3, memory: 0 },
      scene: { view: 'idea', note: 'Eight orders, three customers → three summary rows.' },
    },
    { // 1
      chapter: 'technique', short: 'Hash agg',
      title: 'Hash aggregation: a bucket per key',
      body: [
        `The default strategy is a <span class="term">hash aggregation</span>. The engine keeps a hash table keyed by the group key; each incoming row is hashed to its bucket, where its accumulators are updated in place.`,
        `It needs no sorted input and makes a single pass over the data — <b>O(N)</b> — but the whole hash table of groups has to live in memory while it runs.`,
      ],
      callout: { kind: 'tip', text: 'Hash aggregation: hash each row to its group bucket, update the accumulator. One pass, no sorting — but it holds every group in RAM.' },
      changes: ['+ hash table keyed by group key', '~ one pass over input', '+ accumulators per bucket'],
      metrics: { rows: 240000, groups: 3, memory: 4 },
      scene: { view: 'hash', note: 'Each row hashes to its bucket; the bucket keeps the running total.' },
    },
    { // 2
      chapter: 'technique', short: 'Sort agg',
      title: 'Sort aggregation: one pass over sorted rows',
      body: [
        `The alternative is a <span class="term">sort aggregation</span>: sort the input by the group key, then sweep through it once. Because equal keys are now adjacent, a single cursor can finish one group the moment the key changes and start the next.`,
        `It needs almost no extra memory — just the accumulators for the <em>current</em> group — but it pays the cost of sorting up front (unless the rows already arrive sorted, say from an index).`,
      ],
      callout: { kind: 'tip', text: 'Sort aggregation: sort by key, then one linear pass. Cheap on memory, but you pay to sort first — free if the input is already ordered.' },
      changes: ['+ sort input by group key', '~ single sweep, groups adjacent', '- only current group in memory'],
      metrics: { rows: 240000, groups: 3, memory: 2 },
      scene: { view: 'sort', note: 'Sorted rows let one cursor close each group at the boundary.' },
    },
    { // 3
      chapter: 'tradeoff', short: 'Memory',
      title: 'When the groups don’t fit',
      body: [
        `Hash aggregation is fast until the number of <em>distinct</em> groups is large. A <code>GROUP BY user_id</code> over ten million users means ten million live buckets — more than fits in the memory budget.`,
        `When that happens the engine <span class="term">spills</span> partitions of the hash table to disk and finishes them in a later pass. Correct, but much slower — the classic reason a GROUP BY query suddenly crawls.`,
      ],
      callout: { kind: 'warn', text: 'Hash aggregation is memory-bound: one entry per distinct group. Too many groups → spill to disk → a steep slowdown.' },
      metrics: { rows: 240000, groups: 3, memory: 64 },
      scene: { view: 'memory', note: 'More groups than memory → buckets spill to disk.' },
    },
    { // 4
      chapter: 'technique', short: 'Partial',
      title: 'Partial aggregation unlocks parallelism',
      body: [
        `Aggregation parallelizes beautifully. Each worker <span class="term">pre-aggregates</span> its own slice of the input into partial groups; a final step then combines the partials — summing the sums, adding the counts.`,
        `Because <code>SUM</code>, <code>COUNT</code>, <code>MIN</code> and <code>MAX</code> are <em>associative</em>, a partial-then-final split gives exactly the same answer while cutting the data each stage touches. (<code>AVG</code> works too, by carrying sum and count separately.)`,
      ],
      callout: { kind: 'insight', text: 'Partial aggregation: every worker summarizes its slice, then one step merges the partials. Associativity makes parallel GROUP BY exact.' },
      changes: ['+ per-worker partial aggregates', '+ final combine step', '~ scales across cores'],
      metrics: { rows: 240000, groups: 3, memory: 8 },
      scene: { view: 'partial', note: 'Two workers pre-aggregate; the leader merges the partials.' },
    },
    { // 5
      chapter: 'recap', short: 'Recap',
      title: 'Aggregation, in one picture',
      body: [
        `Aggregation collapses a wide stream of rows into one row per group. <b>Hash aggregation</b> is the one-pass default but memory-bound; <b>sort aggregation</b> trades a sort for near-zero memory and ordered output; <b>partial aggregation</b> splits the work across cores.`,
        `The optimizer picks between them on cost — number of groups, available memory, and whether the input is already sorted.`,
      ],
      callout: { kind: 'insight', text: 'Hash (fast, memory-hungry) · Sort (cheap memory, needs order) · Partial (parallel). Same result, chosen by cost.' },
      metrics: { rows: 240000, groups: 3, memory: 4 },
      scene: { view: 'recap', note: 'Eight rows in, three groups out — the shape of every GROUP BY.' },
    },
  ],
};
