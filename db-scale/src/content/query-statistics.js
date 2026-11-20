/* content/query-statistics.js — "Query Statistics" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/query-statistics-scene.js. Rendered through the shared course shell. */

export const queryStatisticsLesson = {
  id: 'query-statistics',
  title: 'Query Statistics',
  group: 'Query Engine',
  summary: 'The per-column numbers a database keeps about its own data — counts, distinct values, histograms — that let the optimizer estimate how many rows a query will touch before it runs.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['rows', 'cost', 'plans'],
  legend: ['read', 'write'],
  goals: [
    { text: 'What the DB records about each column', step: 0 },
    { text: 'How a histogram captures value distribution', step: 1 },
    { text: 'Estimating a predicate’s selectivity from it', step: 2 },
    { text: 'Why stale statistics wreck query plans', step: 3 },
    { text: 'How ANALYZE rebuilds the numbers', step: 4 },
  ],

  steps: [
    { // 0
      chapter: 'technique', short: 'What it knows',
      title: 'What the database knows about your data',
      body: [
        `The optimizer never looks at every row to plan a query — that would cost as much as running it. Instead it leans on a compact <span class="term">summary</span> the database keeps for each column.`,
        `For every column it records the <b>row count</b>, the <b>number of distinct values</b> (NDV), the <b>null fraction</b>, and the <b>min/max</b>. A few numbers per column stand in for millions of rows.`,
      ],
      callout: { kind: 'insight', text: 'Statistics are a tiny, cheap model of a huge table. The optimizer reasons about the model, not the data.' },
      metrics: { rows: 142000, cost: 0, plans: 0 },
      scene: { view: 'what', note: 'A handful of numbers per column summarize the whole table.' },
    },
    { // 1
      chapter: 'technique', short: 'Histograms',
      title: 'Histograms capture the shape of the data',
      body: [
        `Counts alone can’t tell <em>where</em> values cluster. A <span class="term">histogram</span> splits a column’s range into buckets and records how many rows fall in each.`,
        `Now the optimizer knows that most orders are small and only a few are large — the exact shape it needs to predict how a filter like <code>total &gt; 100</code> will behave.`,
      ],
      callout: { kind: 'tip', text: 'A histogram turns “average total is 80” into a full distribution — which bucket your predicate lands in changes everything.' },
      changes: ['+ per-bucket row counts', '~ distribution, not just an average'],
      metrics: { rows: 142000, cost: 0, plans: 0 },
      scene: { view: 'histogram', note: 'Each bar is a value bucket; its height is how many rows land there.' },
    },
    { // 2
      chapter: 'technique', short: 'Selectivity',
      title: 'Estimating how many rows survive',
      body: [
        `<span class="term">Selectivity</span> is the fraction of rows a predicate keeps. Drop the threshold onto the histogram and sum the buckets on the matching side.`,
        `For <code>total &gt; 100</code> only the right-hand buckets qualify. That estimated row count feeds every cost calculation above it — pick the wrong fraction and every plan cost is wrong.`,
      ],
      callout: { kind: 'insight', text: 'Selectivity × row count = estimated rows out. This single number drives join order, access-method choice, and memory sizing.' },
      metrics: { rows: 142000, cost: 260, plans: 1 },
      scene: { view: 'selectivity', note: 'The threshold cuts the histogram; the surviving buckets are the estimate.' },
    },
    { // 3
      chapter: 'tradeoff', short: 'Stale stats',
      title: 'When the numbers lie',
      body: [
        `Statistics are a <em>snapshot</em>. The table keeps changing — a marketing push triples large orders — but the stored histogram still describes last month’s data.`,
        `Now the optimizer estimates “a few rows” where millions match. It picks a nested-loop over an index that should have been a hash join, and the query crawls. <b>Stale statistics are the single most common cause of a suddenly-slow query.</b>`,
      ],
      callout: { kind: 'warn', text: 'A plan is only as good as its row estimates. When stats drift from reality, the optimizer confidently chooses the wrong plan.' },
      changes: ['~ data shifted', '- estimate now wrong', '- optimizer mis-plans'],
      metrics: { rows: 142000, cost: 9000, plans: 1 },
      scene: { view: 'stale', note: 'Reality moved; the stored distribution did not. Estimates go wrong.' },
    },
    { // 4
      chapter: 'technique', short: 'Refresh',
      title: 'ANALYZE rebuilds the picture',
      body: [
        `The fix is to resample. <code>ANALYZE</code> reads a random sample of the table and rebuilds the counts and histograms; most databases run an <b>auto-analyze</b> in the background after enough rows change.`,
        `It samples rather than scans everything, so refreshing stats is cheap — a tiny price for keeping every future plan honest.`,
      ],
      callout: { kind: 'tip', text: 'ANALYZE samples, not scans — fast enough to run often. Fresh stats are the cheapest query tuning there is.' },
      changes: ['+ sample the table', '+ rebuild histogram', '~ estimates accurate again'],
      metrics: { rows: 142000, cost: 260, plans: 3 },
      scene: { view: 'refresh', note: 'A quick sample rebuilds the stats, and estimates line up again.' },
    },
    { // 5
      chapter: 'recap', short: 'Recap',
      title: 'Good stats, good plans',
      body: [
        `Everything the optimizer decides — join order, scan vs index, how much memory to give a hash table — rests on estimated row counts, and those come from statistics.`,
        `Keep them fresh and the optimizer reasons about the data you actually have. Let them rot and even a brilliant cost model draws the wrong conclusion.`,
      ],
      callout: { kind: 'insight', text: 'Statistics in → estimates → costs → plan. Good statistics are the foundation the whole optimizer stands on.' },
      metrics: { rows: 142000, cost: 260, plans: 3 },
      scene: { view: 'recap', note: 'Counts, distribution, selectivity — the optimizer’s model of your data.' },
    },
  ],
};
