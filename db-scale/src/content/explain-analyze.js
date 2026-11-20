/* content/explain-analyze.js — the "EXPLAIN ANALYZE" lesson, as DATA.
   Same shape as content/dbms.js. Rendered through the shared course shell;
   the scene is a view-snapshot consumed by db/explain-analyze-scene.js. */

export const explainAnalyzeLesson = {
  id: 'explain-analyze',
  title: 'EXPLAIN ANALYZE',
  group: 'Query Engine',
  summary: 'The command that shows you the plan the optimizer chose — and, with ANALYZE, exactly how many rows and how much time each step really cost.',
  minutes: 8,
  level: 'beginner',
  metrics: ['rows', 'cost', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'EXPLAIN prints the chosen plan without running it', step: 0 },
    { text: 'ANALYZE runs it and measures real rows and time', step: 1 },
    { text: 'A big estimate-vs-actual gap means bad statistics', step: 2 },
    { text: 'Find the one node that dominates the time', step: 3 },
    { text: 'Read an execution plan from the bottom up', step: 4 },
  ],

  steps: [
    { // 0 — EXPLAIN
      chapter: 'technique', short: 'EXPLAIN',
      title: 'EXPLAIN: show me the plan',
      body: [
        `You can't fix a slow query until you can <em>see</em> what the database is doing with it. <code>EXPLAIN &lt;query&gt;</code> asks the engine for the <span class="term">physical plan</span> the optimizer picked — the tree of operators it <em>would</em> run — without actually running it.`,
        `Each node prints the optimizer's <b>estimates</b>: how many rows it expects to flow out, and the <b>cost</b> it assigned. This is a prediction, built entirely from statistics — no data has been touched yet.`,
      ],
      callout: { kind: 'tip', text: 'EXPLAIN is free and instant: it only asks the optimizer what it decided, it does not execute the query.' },
      metrics: { rows: 1400, cost: 1200, latency: 0 },
      scene: { view: 'explain', note: 'EXPLAIN prints the plan tree with estimated rows and cost — no execution.' },
    },
    { // 1 — ANALYZE
      chapter: 'technique', short: 'ANALYZE',
      title: 'ANALYZE: now actually run it',
      body: [
        `Add <code>ANALYZE</code> and the engine <em>executes</em> the query, timing every operator as rows pass through it. Now each node carries two numbers: the <b>estimate</b> from before, and the <b>actual</b> rows and milliseconds measured during the real run.`,
        `This is the difference between a weather forecast and looking out the window. ANALYZE is where guesses meet reality.`,
      ],
      callout: { kind: 'warn', text: 'ANALYZE really runs the query — including its writes. Wrap it in a transaction you roll back when testing an INSERT/UPDATE/DELETE.' },
      changes: ['+ actual rows per node', '+ actual time per node', '~ query is really executed'],
      metrics: { rows: 1500, cost: 1200, latency: 12 },
      scene: { view: 'analyze', note: 'ANALYZE runs the query and adds the real rows and time measured at each node.' },
    },
    { // 2 — ESTIMATE vs ACTUAL
      chapter: 'technique', short: 'Est vs actual',
      title: 'Where estimate meets actual',
      body: [
        `The first thing to read is the <span class="term">gap</span> between estimated and actual rows. When the optimizer thinks a node will emit 1,400 rows and it actually emits 48,000, every cost above that node was computed on a lie — and the plan it chose is probably wrong.`,
        `A large row mis-estimate almost always traces back to <b>stale or missing statistics</b>. The fix is usually to re-run the stats, not to rewrite the query.`,
      ],
      callout: { kind: 'insight', text: 'estimated ≈ actual → trust the plan. estimated ≫ actual (or ≪) → suspect the statistics first.' },
      metrics: { rows: 48000, cost: 1200, latency: 210 },
      scene: { view: 'gap', note: 'Estimated 1.4k vs actual 48k — the optimizer was flying blind here.' },
    },
    { // 3 — BOTTLENECK
      chapter: 'technique', short: 'Bottleneck',
      title: 'Find the node that costs you',
      body: [
        `A plan can have a dozen nodes, but the total time is usually dominated by <em>one</em>. Scan the <b>actual time</b> column and find the worst offender — here the join that re-reads a huge, unfiltered input.`,
        `That node is your target. Everything else is noise until it's fixed: add an index, refresh stats, or rewrite so the optimizer picks a cheaper operator there.`,
      ],
      callout: { kind: 'tip', text: 'Optimize the single most expensive node first. Shaving 10ms off a 2ms node is wasted effort.' },
      metrics: { rows: 48000, cost: 1200, latency: 220 },
      scene: { view: 'bottleneck', note: 'One node holds almost all the time — that is where tuning pays off.' },
    },
    { // 4 — READ BOTTOM-UP
      chapter: 'technique', short: 'Read it',
      title: 'Read the tree from the bottom',
      body: [
        `Execution plans run <b>leaves first</b>: the scans at the bottom pull rows off disk, feed the joins above them, which feed the filters, which feed the projection at the root. To follow the data, read the tree <span class="term">bottom-up</span>.`,
        `Indentation is the tree: deeper (more indented) nodes are children that run first. The top line is the last thing to happen and what the client receives.`,
      ],
      callout: { kind: 'tip', text: 'Bottom-up = execution order. The outermost / top node produces the final result last.' },
      metrics: { rows: 1500, cost: 1200, latency: 12 },
      scene: { view: 'readup', note: 'Scans first, projection last — follow the arrows up the tree.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Your main tuning tool',
      body: [
        `<code>EXPLAIN</code> shows the plan; <code>EXPLAIN ANALYZE</code> shows the plan <em>and</em> the truth. Compare estimated to actual rows to catch bad stats, find the node that owns the time, and read bottom-up to understand the flow.`,
        `Almost every real-world query-tuning session starts here. Master this one command and most "the database is slow" problems become readable.`,
      ],
      callout: { kind: 'insight', text: 'Plan + estimates + real measurements in one command. It is the first thing to reach for when a query is slow.' },
      metrics: { rows: 1500, cost: 1200, latency: 12 },
      scene: { view: 'recap', note: 'EXPLAIN ANALYZE — read the plan, compare estimate to actual, fix the hot node.' },
    },
  ],
};
