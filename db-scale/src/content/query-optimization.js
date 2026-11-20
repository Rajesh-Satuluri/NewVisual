/* content/query-optimization.js — the "Query Optimization" lesson, as DATA.
   Same shape as content/dbms.js. Rendered through the shared course shell;
   `scene` is a view-snapshot consumed by db/query-optimization-scene.js. */

export const queryOptimizationLesson = {
  id: 'query-optimization',
  title: 'Query Optimization',
  group: 'Query Engine',
  summary: 'The same query can be answered by thousands of equivalent plans whose costs differ by orders of magnitude — optimization is the search for a cheap one that returns the exact same rows.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['plans', 'cost', 'rows'],
  legend: ['read', 'write'],
  goals: [
    { text: 'One query has many equivalent plans with very different cost', step: 0 },
    { text: 'Equivalence rules rewrite a plan without changing its result', step: 1 },
    { text: 'Predicate pushdown filters early, before the expensive join', step: 2 },
    { text: 'Join order dominates cost by keeping intermediates small', step: 3 },
    { text: 'The optimizer searches the plan space for the cheapest plan', step: 4 },
  ],

  steps: [
    { // 0
      chapter: 'technique', short: 'Many plans',
      title: 'One query, thousands of plans',
      body: [
        `The logical plan says <em>what</em> you want. But there are many ways to actually compute it — which table to read first, which join algorithm, where to apply the filter. Each of those choices is a different <span class="term">physical plan</span>, and they all return the <b>same rows</b>.`,
        `What they do <em>not</em> share is cost. For a query like <code>SELECT name FROM users JOIN orders ON users.id = orders.user_id WHERE orders.total &gt; 100</code>, the gap between the best and worst plan is routinely 1000×. The optimizer's whole job is to avoid the bad ones.`,
      ],
      callout: { kind: 'insight', text: 'Every plan the optimizer considers is correct. They differ only in how much work they do to produce the identical answer.' },
      metrics: { plans: 3, cost: 9000, rows: 142 },
      scene: { view: 'space', note: 'Three equivalent plans — same answer, cost from 9,000 down to 260.' },
    },
    { // 1
      chapter: 'technique', short: 'Rewrite rules',
      title: 'Equivalence rules reshape the plan',
      body: [
        `Optimizers transform plans using <span class="term">equivalence rules</span> — rewrites guaranteed to preserve the result. Selections can move past joins, projections can be pushed toward the leaves, and joins can be reordered or re-associated.`,
        `Because each rule is provably result-preserving, the optimizer can apply them freely, chaining rewrites to walk from the plan you wrote to a far cheaper equivalent.`,
      ],
      callout: { kind: 'tip', text: 'Predicate pushdown · projection pushdown · join reordering — the three rewrites that pay for themselves most often.' },
      changes: ['+ predicate pushdown', '+ projection pushdown', '+ join reordering'],
      metrics: { plans: 12, cost: 4200, rows: 142 },
      scene: { view: 'rewrite', note: 'A toolbox of result-preserving rewrites the optimizer can apply.' },
    },
    { // 2
      chapter: 'technique', short: 'Pushdown',
      title: 'Push the filter below the join',
      body: [
        `The single biggest win is usually <span class="term">predicate pushdown</span>. Written naively, the plan joins <code>users</code> and <code>orders</code> in full and only then applies <code>total &gt; 100</code> — the join churns through every order.`,
        `Push that <b>σ</b> down onto the <code>orders</code> leaf and you filter <em>before</em> joining. The expensive <b>⋈</b> now sees a fraction of the rows, and the result is byte-for-byte identical.`,
      ],
      callout: { kind: 'insight', text: 'Filter early. Every row you discard before a join is a row the join never has to process.' },
      changes: ['~ σ moved below ⋈', '- rows into the join', '~ same result'],
      metrics: { plans: 12, cost: 1200, rows: 142 },
      scene: { view: 'pushdown', note: 'σ pushed onto the orders leaf — the join sees far fewer rows.' },
    },
    { // 3
      chapter: 'technique', short: 'Join order',
      title: 'Join order decides everything',
      body: [
        `When several tables join, the <em>order</em> you join them in sets the size of every intermediate result — and intermediates are what you pay for. Joining the two most selective tables first keeps the running result tiny; joining a huge pair first explodes it.`,
        `The join order <code>(A ⋈ B) ⋈ C</code> and <code>A ⋈ (B ⋈ C)</code> give the same rows, yet one can be thousands of times cheaper than the other.`,
      ],
      callout: { kind: 'tip', text: 'Keep intermediate results small. A good join order is worth more than any single clever algorithm.' },
      metrics: { plans: 48, cost: 620, rows: 142 },
      scene: { view: 'joinorder', note: 'Same three tables, two join orders — wildly different intermediate sizes.' },
    },
    { // 4
      chapter: 'technique', short: 'Search',
      title: 'Searching the plan space',
      body: [
        `Rules tell the optimizer which moves are legal; now it must actually <em>choose</em>. It enumerates candidate plans — applying rewrites, trying access methods and join orders — and keeps the cheapest, pruning branches that can't beat the best found so far.`,
        `The space is huge, so optimizers bound it: dynamic programming over join orders, heuristics, and a time budget. The goal is not the theoretically perfect plan but a good one, found fast.`,
      ],
      callout: { kind: 'insight', text: 'Optimization is a search problem: explore equivalent plans, estimate each cost, and commit to the cheapest within budget.' },
      changes: ['+ enumerate candidates', '+ prune by cost', '+ keep the cheapest'],
      metrics: { plans: 180, cost: 260, rows: 142 },
      scene: { view: 'search', note: 'Many candidate plans explored; the cheapest survives.' },
    },
    { // 5
      chapter: 'recap', short: 'Recap',
      title: 'Same answer, a fraction of the work',
      body: [
        `Optimization never changes <em>what</em> a query returns — only how much work it takes. Starting from the plan you wrote, the optimizer applies result-preserving rewrites, reorders joins, and searches for the combination with the lowest estimated cost.`,
        `But "estimated" is doing heavy lifting here: every choice rests on a <b>cost estimate</b>. Where those numbers come from — statistics and cardinality estimation — is the next lesson.`,
      ],
      callout: { kind: 'insight', text: 'Query optimization = correctness-preserving rewrites + a search for minimum estimated cost. Results never change; cost collapses.' },
      metrics: { plans: 180, cost: 260, rows: 142 },
      scene: { view: 'recap', note: 'The chosen plan: same rows as the naive one, a fraction of the cost.' },
    },
  ],
};
