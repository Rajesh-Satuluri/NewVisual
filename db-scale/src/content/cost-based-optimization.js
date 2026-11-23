/* content/cost-based-optimization.js — the "Cost-Based Optimization" lesson, as
   DATA. Same shape as content/dbms.js; the `scene` snapshots drive
   db/cost-based-optimization-scene.js. Part of the Query Engine module. */

export const costBasedOptimizationLesson = {
  id: 'cost-based-optimization',
  title: 'Cost-Based Optimization',
  group: 'Query Engine',
  summary: 'Rewrite rules produce many correct plans but can’t say which is fastest. A cost-based optimizer estimates each plan’s cost from statistics and picks the cheapest.',
  minutes: 9,
  level: 'advanced',
  metrics: ['plans', 'cost', 'pages'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why rules alone can’t choose a plan — you need numbers', step: 0 },
    { text: 'The statistics the catalog keeps about your data', step: 1 },
    { text: 'Cardinality estimation: rows out of each operator', step: 2 },
    { text: 'A cost model that scores every plan', step: 3 },
    { text: 'Picking the cheapest — and why stale stats hurt', step: 4 },
  ],

  steps: [
    { // 0 — WHY
      chapter: 'technique', short: 'Why cost',
      title: 'Many correct plans, wildly different speed',
      body: [
        `The rewrite rules from the last lesson are <em>sound</em> — every plan they produce returns the same rows. But “same answer” says nothing about <em>speed</em>: one plan might read 48 pages, an equivalent one 9,000.`,
        `To choose, the optimizer needs a way to <span class="term">compare</span> plans — a single number per plan it can minimize. That number is <b>estimated cost</b>.`,
      ],
      callout: { kind: 'insight', text: 'Rules tell you which plans are legal. Cost tells you which plan to actually run. You need both.' },
      metrics: { plans: 3, cost: 9000, pages: 0 },
      scene: { view: 'why', note: 'Three legal plans for one query — which one is cheapest?' },
    },
    { // 1 — STATISTICS
      chapter: 'technique', short: 'Statistics',
      title: 'The optimizer reads statistics, not data',
      body: [
        `Estimating cost without running the query means guessing how much data each step touches. Those guesses come from <span class="term">statistics</span> the database keeps in its catalog: row counts per table, <b>histograms</b> of value distribution, number of distinct values, null fractions, and min/max per column.`,
        `Stats are gathered by <code>ANALYZE</code> (or automatically) and refreshed as tables change — cheaply, by sampling, not by scanning everything.`,
      ],
      callout: { kind: 'tip', text: 'Row counts, histograms, distinct values, null fraction, min/max — a compact summary of your data the planner can read in microseconds.' },
      changes: ['+ per-table row counts', '+ per-column histograms', '+ distinct-value counts'],
      metrics: { plans: 3, cost: 9000, pages: 0 },
      scene: { view: 'stats', note: 'The catalog summarises every table so the planner never has to look at rows.' },
    },
    { // 2 — CARDINALITY
      chapter: 'technique', short: 'Cardinality',
      title: 'Estimate the rows out of every operator',
      body: [
        `The key estimate is <span class="term">cardinality</span>: how many rows each operator emits. A scan of <code>orders</code> emits ~142k rows; the histogram says <code>total &gt; 100</code> keeps ~1% of them, so σ emits ~1.4k; the join with <code>users</code> on a key emits ~1.4k.`,
        `These numbers propagate up the tree. Get them right and the cost is trustworthy; get them wrong — correlated columns, skew — and every cost above is wrong too.`,
      ],
      callout: { kind: 'warn', text: 'Cardinality errors compound up the plan tree. A bad estimate at a leaf can make the optimizer pick a plan that is 100× too slow.' },
      metrics: { plans: 3, cost: 4200, pages: 0 },
      scene: { view: 'cardinality', note: 'Row estimates flow up the tree, one operator at a time.' },
    },
    { // 3 — COST MODEL
      chapter: 'technique', short: 'Cost model',
      title: 'Turn rows into a single cost number',
      body: [
        `The <span class="term">cost model</span> converts estimated work into one comparable number. It charges for <b>I/O</b> — pages read from disk, weighting random reads above sequential — and for <b>CPU</b> — tuples processed, comparisons, hashing.`,
        `Each operator reports its own cost plus the cost of its inputs, so the root node’s cost is the whole plan’s cost. Different plans → different totals.`,
      ],
      callout: { kind: 'insight', text: 'cost = I/O (pages, random vs sequential) + CPU (tuples × per-row work). One formula, applied bottom-up, scores an entire plan.' },
      changes: ['+ I/O cost per operator', '+ CPU cost per operator', '~ summed bottom-up to the root'],
      metrics: { plans: 3, cost: 1200, pages: 0 },
      scene: { view: 'costmodel', note: 'Every operator adds its estimated I/O + CPU; the root holds the plan’s total.' },
    },
    { // 4 — PICK
      chapter: 'technique', short: 'Pick',
      title: 'Compare the totals, take the minimum',
      body: [
        `Now it is simple arithmetic: score each candidate plan and keep the cheapest. Here the three legal plans cost 9,000, 1,200 and 260 — the optimizer picks the last and discards the rest.`,
        `Real optimizers can’t score <em>every</em> plan (there are too many), so they search cleverly — dynamic programming over join orders, pruning branches that already cost more than the best plan found. But the decision rule is always: minimize estimated cost.`,
      ],
      callout: { kind: 'insight', text: 'The chosen plan is just argmin(cost) over the candidates the search explored. Everything else — stats, cardinality, the cost model — exists to make that number trustworthy.' },
      metrics: { plans: 3, cost: 260, pages: 48 },
      scene: { view: 'pick', note: 'Three costs: 9,000 · 1,200 · 260. The cheapest wins.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Good estimates, good plans',
      body: [
        `Cost-based optimization is the chain <b>statistics → cardinality → cost → argmin</b>. When the stats match reality, the optimizer’s cheapest plan really is the fastest.`,
        `When they don’t — a table grew 100× since the last <code>ANALYZE</code>, or two filtered columns are correlated — the estimates lie and a bad plan gets chosen. That mismatch is the single most common cause of a query that “suddenly got slow.”`,
      ],
      callout: { kind: 'warn', text: 'Stale or misleading statistics are the #1 cause of bad plans. When a query regresses, re-run ANALYZE before anything else.' },
      metrics: { plans: 3, cost: 260, pages: 48 },
      scene: { view: 'recap', note: 'Fresh stats → the cheapest plan is the fastest plan.' },
    },
  ],
};
