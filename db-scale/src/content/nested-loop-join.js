/* content/nested-loop-join.js — the "Nested Loop Join" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/nested-loop-join-scene.js. Rendered through the shared course shell. */

export const nestedLoopJoinLesson = {
  id: 'nested-loop-join',
  title: 'Nested Loop Join',
  group: 'Query Engine',
  summary: 'The simplest join algorithm — for every row of one table, look through the other for rows that match. Always correct, and with the right index, surprisingly fast.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['rows', 'pages', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'The core idea: for each outer row, scan the inner relation', step: 0 },
    { text: 'Why two nested loops cost |outer| × |inner|', step: 1 },
    { text: 'How an index on the inner side turns a scan into a lookup', step: 2 },
    { text: 'Where the cost really goes — the comparison count', step: 3 },
    { text: 'When a nested loop wins, and when it is a disaster', step: 4 },
  ],

  steps: [
    { // 0 — IDEA
      chapter: 'technique', short: 'The idea',
      title: 'For each outer row, scan the inner',
      body: [
        `A join stitches two tables together on a condition — here <code>users.id = orders.user_id</code>. The <span class="term">nested loop join</span> does the most obvious thing imaginable: take the first row of the <b>outer</b> table, walk every row of the <b>inner</b> table looking for a match, emit the pairs that match, then move to the next outer row.`,
        `No sorting, no hashing, no preparation — just two loops. That simplicity is its superpower: it works for <em>any</em> join condition, not only equality.`,
      ],
      callout: { kind: 'insight', text: 'Outer row → scan the whole inner relation → repeat. The join that always works, whatever the predicate.' },
      metrics: { rows: 9, pages: 9, latency: 20 },
      scene: { view: 'idea', note: 'One outer row, matched against every inner row.' },
    },
    { // 1 — LOOPS
      chapter: 'technique', short: 'Two loops',
      title: 'An outer loop around an inner loop',
      body: [
        `Written out, it is literally a loop inside a loop: <code>for each u in users: for each o in orders: if u.id == o.user_id → emit</code>. With <b>N</b> outer rows and <b>M</b> inner rows that is <b>N × M</b> comparisons.`,
        `For a 4-row and a 5-row table that is 20 comparisons — fine. For a million rows on each side it is a <em>trillion</em>. The quadratic blow-up is the whole story of why we need better joins.`,
      ],
      callout: { kind: 'warn', text: 'Cost grows as N × M. Double both inputs and the work quadruples — a naive nested loop over big tables never finishes.' },
      changes: ['~ inner relation re-scanned for every outer row', '+ N × M comparisons'],
      metrics: { rows: 20, pages: 9, latency: 60 },
      scene: { view: 'loops', note: 'Every outer row re-scans the entire inner table.' },
    },
    { // 2 — INDEXED
      chapter: 'technique', short: 'Index the inner',
      title: 'Put an index on the inner side',
      body: [
        `The waste is re-scanning the inner table N times. But if the inner side has an <span class="term">index</span> on the join key, the inner "scan" collapses into a cheap <b>lookup</b>: descend the B-Tree straight to the matching rows.`,
        `This is the <span class="term">index nested loop join</span>, and it is one of the most common plans in practice. Cost drops from <b>N × M</b> to roughly <b>N × log M</b> — for a small outer table driving an indexed inner, it is hard to beat.`,
      ],
      callout: { kind: 'tip', text: 'Index the inner join key and each inner scan becomes a logarithmic lookup. A small outer + indexed inner is the sweet spot.' },
      changes: ['+ index on inner join key', '~ inner scan → index lookup', '- comparisons: N·M → N·log M'],
      metrics: { rows: 8, pages: 3, latency: 12 },
      scene: { view: 'indexed', note: 'The index turns each inner scan into a direct lookup.' },
    },
    { // 3 — COST
      chapter: 'technique', short: 'Cost',
      title: 'The comparison count is the cost',
      body: [
        `Everything about a nested loop reduces to one number: how many inner probes it does. Plain nested loop: <b>|outer| × |inner|</b>. Indexed: <b>|outer| × log |inner|</b> plus the page fetches for the rows it actually finds.`,
        `That is why the optimizer cares so much about which table is the outer one — you want the <em>smaller</em> table on the outside, driving as few inner probes as possible.`,
      ],
      callout: { kind: 'insight', text: 'Put the smaller relation on the outside: fewer outer rows means fewer inner probes, and the inner probe is what costs.' },
      metrics: { rows: 20, pages: 9, latency: 60 },
      scene: { view: 'cost', note: 'Plain vs indexed: 20 comparisons versus 8.' },
    },
    { // 4 — WHEN
      chapter: 'tradeoff', short: 'When it wins',
      title: 'Brilliant small, hopeless big',
      body: [
        `A nested loop is the right call when the outer table is small and the inner is indexed — think "fetch the 3 orders for this one user." The engine reaches a handful of rows and stops.`,
        `It is the <em>wrong</em> call for two large tables with no useful index: the N × M blow-up turns a one-second query into an overnight job. There the optimizer reaches for a hash or sort-merge join instead.`,
      ],
      callout: { kind: 'warn', text: 'Great for small-outer + indexed-inner. For two big unindexed tables it is the slowest join there is — and a classic cause of a runaway query.' },
      metrics: { rows: 8, pages: 3, latency: 12 },
      scene: { view: 'when', note: 'Small + indexed: a win. Big + unindexed: a disaster.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Simple, general, often slow',
      body: [
        `The nested loop join is the join of last resort and first choice at once: it handles <em>any</em> predicate and needs no setup, so it is always available — and with an indexed inner it is genuinely optimal for selective, small-outer joins.`,
        `Its weakness, the quadratic cost on large unindexed inputs, is exactly the gap the next two algorithms fill: <b>hash join</b> and <b>sort-merge join</b>.`,
      ],
      callout: { kind: 'insight', text: 'Always correct, no setup, great when indexed and selective. For big equi-joins, hand off to hash or sort-merge.' },
      metrics: { rows: 8, pages: 3, latency: 12 },
      scene: { view: 'recap', note: 'One matched pair emitted — correct, and here, cheap.' },
    },
  ],
};
