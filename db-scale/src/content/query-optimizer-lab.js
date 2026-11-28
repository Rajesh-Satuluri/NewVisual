/* content/query-optimizer-lab.js — the "Query Optimizer Lab" lesson, as DATA.
   An Interactive Lab: optimize one query end-to-end by exploring alternative
   plans and picking the cheapest. Each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/query-optimizer-lab-scene.js. */

export const queryOptimizerLabLesson = {
  id: 'query-optimizer-lab',
  title: 'Query Optimizer Lab',
  group: 'Interactive Labs',
  summary: 'Walk one three-table join through a cost-based optimizer: estimate cardinalities from statistics, cost every access path and join plan, and keep the cheapest — the way EXPLAIN picks its winner.',
  minutes: 9,
  level: 'advanced',
  metrics: ['cost', 'plans', 'rows', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why one query has a huge space of equivalent plans', step: 0 },
    { text: 'Statistics turn into cardinality estimates', step: 1 },
    { text: 'Cost a seq scan against an index scan', step: 2 },
    { text: 'Join order and algorithm shrink the intermediate', step: 3 },
    { text: 'The cheapest costed plan wins', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'The query',
      title: 'One query, a mountain of plans',
      body: [
        `Here is the task: run <code>SELECT … FROM A JOIN B JOIN C WHERE A.k = ?</code>. It looks like one query, but the engine can execute it in <b>dozens</b> of equivalent ways — every join order, times every join algorithm, times every way to read each table.`,
        `All of them return the same rows. They do <em>not</em> all take the same time: the fastest and slowest can differ by thousands of times. The optimizer must pick the winner <span class="term">before</span> running anything.`,
      ],
      callout: { kind: 'warn', text: 'A single SQL query maps to a large space of equivalent physical plans. Choosing well — without executing them — is the optimizer’s whole job.' },
      metrics: { cost: 0, plans: 0, rows: 1050200, latency: 0 },
      scene: { view: 'setup', note: 'One query → join order × algorithm × access path = many candidate plans.' },
    },
    { // 1 — TECHNIQUE: statistics
      chapter: 'technique', short: 'Statistics',
      title: 'Statistics become estimates',
      body: [
        `The optimizer can’t afford to run each plan, so it <b>estimates</b>. It keeps <span class="term">statistics</span> on every table — row counts, histograms of column values, number of distinct values — gathered by ANALYZE.`,
        `From those it predicts how many rows each operator emits. A filter <code>status='new'</code> that matches 2% of a million-row table is estimated at <b>20,000 rows</b>. These <span class="term">cardinality estimates</span> feed every cost that follows.`,
      ],
      callout: { kind: 'insight', text: 'Cardinality estimation — predicting rows out of each operator from table statistics — is the foundation every cost downstream is built on.' },
      metrics: { cost: 0, plans: 0, rows: 20000, latency: 0 },
      scene: { view: 'stats', note: 'Row counts and selectivity give an estimate for every operator’s output.' },
    },
    { // 2 — TECHNIQUE: access paths
      chapter: 'technique', short: 'Access path',
      title: 'Seq scan or index scan?',
      body: [
        `First decision per table: how to read it. A <span class="term">sequential scan</span> reads every page — cheap per row, but you pay for all million. An <span class="term">index scan</span> seeks only matching rows — cheap when few match, expensive when many do.`,
        `Our filter keeps 2%, and <code>A.k</code> is indexed, so the index scan costs ≈300 against the seq scan’s ≈10,000. The optimizer costs both and takes the index. Flip the selectivity to 80% and the seq scan would win instead.`,
      ],
      callout: { kind: 'tip', text: 'A selective filter on an indexed column favors the index scan; a broad filter favors the seq scan. The optimizer costs both and keeps the cheaper.' },
      changes: ['+ cost seq scan ≈ 10,000', '+ cost index scan ≈ 300', '✓ index scan chosen for A'],
      metrics: { cost: 300, plans: 2, rows: 20000, latency: 40 },
      scene: { view: 'access', note: 'Two access paths costed; the selective index scan wins for table A.' },
    },
    { // 3 — TECHNIQUE: join order & algorithm
      chapter: 'technique', short: 'Join plan',
      title: 'Order and algorithm shrink the middle',
      body: [
        `Now the joins. Join order matters enormously: joining the two <b>big</b> tables first builds a giant intermediate result that the next join must chew through. Join the <b>selective</b> pair first and the intermediate stays tiny.`,
        `Each join also picks an algorithm — <span class="term">nested loop</span> for a tiny input, <span class="term">hash join</span> for large unsorted inputs, <span class="term">merge join</span> for pre-sorted ones. The search space is large, so the optimizer prunes it with dynamic programming and heuristics.`,
      ],
      callout: { kind: 'insight', text: 'Push the most selective join first to keep intermediate cardinalities small, then choose loop / hash / merge to match each input’s size and order.' },
      changes: ['~ reorder: join B⋈C first (≈400 rows)', '+ hash join A ⋈ (B⋈C)', '− avoid the 1M-row intermediate'],
      metrics: { cost: 1900, plans: 14, rows: 400, latency: 18 },
      scene: { view: 'joins', note: 'Bad order builds a 1M-row intermediate; the selective order keeps it near 400.' },
    },
    { // 4 — SOLUTION: pick cheapest
      chapter: 'solution', short: 'Pick cheapest',
      title: 'The cheapest costed plan wins',
      body: [
        `Every surviving candidate gets a single number from the <span class="term">cost model</span> — an estimate of IO plus CPU built from all those cardinalities. Plan #1 (seq scan, nested loop, bad order) costs <b>48,200</b>. Plan #2 (index scan, hash join, selective order) costs <b>1,900</b>.`,
        `The optimizer keeps the minimum and discards the rest. That is <span class="term">cost-based optimization</span>. Its Achilles heel: if the statistics are stale, the estimates are wrong, and a confident optimizer can pick a terrible plan.`,
      ],
      callout: { kind: 'warn', text: 'The plan with the lowest estimated cost is chosen. Garbage in, garbage out: stale statistics give wrong estimates and the optimizer picks a bad plan with full confidence.' },
      changes: ['plan #1 cost 48,200', 'plan #2 cost 1,900 ✓', '+ keep the minimum-cost plan'],
      metrics: { cost: 1900, plans: 18, rows: 400, latency: 16 },
      scene: { view: 'pick', note: 'Two fully-costed plans side by side; the optimizer keeps the cheaper.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'How the optimizer chooses',
      body: [
        `The loop you just ran is the whole game: <b>enumerate</b> equivalent plans, <b>estimate</b> cardinalities from statistics, <b>cost</b> each with the model, and <b>keep</b> the cheapest. Run <code>EXPLAIN</code> and you are reading the winner of exactly this contest.`,
        `When a query is slow, this lab is your checklist: are the statistics fresh, is the right access path available, and did the optimizer find a good join order? Fix the inputs and the optimizer finds the fast plan on its own.`,
      ],
      callout: { kind: 'insight', text: 'Cost-based optimization = enumerate → estimate → cost → keep the cheapest. EXPLAIN shows the winner; fresh stats and useful indexes are what let it win.' },
      metrics: { cost: 1900, plans: 18, rows: 400, latency: 16 },
      scene: { view: 'recap', note: 'Enumerate, estimate, cost, keep the cheapest — the winner EXPLAIN reports.' },
    },
  ],
};
