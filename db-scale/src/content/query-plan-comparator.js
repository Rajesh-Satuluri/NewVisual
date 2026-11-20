/* content/query-plan-comparator.js — "Query Plan Comparator" lesson, as DATA.
   Same shape as content/dbms.js; scene consumed by db/query-plan-comparator-scene.js. */

export const queryPlanComparatorLesson = {
  id: 'query-plan-comparator',
  title: 'Query Plan Comparator',
  group: 'Query Engine',
  summary: 'Put two plans for the same query side by side and read, node by node, why the optimizer prefers one over the other — and when it gets it wrong.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['plans', 'cost', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Two valid plans for one query, side by side', step: 0 },
    { text: 'Row estimates flowing up each plan tree', step: 1 },
    { text: 'Per-operator cost and the total at the root', step: 2 },
    { text: 'Estimated vs actual — where plans go wrong', step: 3 },
    { text: 'Why the optimizer kept the plan it did', step: 4 },
  ],

  steps: [
    { // 0
      chapter: 'technique', short: 'Two plans',
      title: 'One query, two ways to run it',
      body: [
        `The same query — <code>users ⋈ orders</code> filtered on <code>total > 100</code> — can be executed by very different physical plans. Here a <span class="term">Nested-Loop</span> plan (left) sits beside a <span class="term">Hash-Join</span> plan (right).`,
        `Both return <em>exactly</em> the same rows. They differ only in <b>how</b> they get there — and that difference can be a thousandfold in time. A comparator lines them up so you can see it.`,
      ],
      callout: { kind: 'insight', text: 'Two plans are equivalent when they always return the same result. Comparing them is comparing cost, not correctness.' },
      metrics: { plans: 2, cost: 9000, latency: 120 },
      scene: { view: 'two', note: 'Plan A (Nested Loop) vs Plan B (Hash Join) for one query.' },
    },
    { // 1
      chapter: 'technique', short: 'Row estimates',
      title: 'Follow the row estimates up each tree',
      body: [
        `Every operator estimates how many <b>rows</b> it emits. Those estimates flow upward: a leaf scan feeds a join, the join feeds a filter, and so on to the root.`,
        `Both plans end with the same ~1.4k rows, but they move very different volumes <em>through the join</em> — and that intermediate size is what the cost model cares about.`,
      ],
      callout: { kind: 'tip', text: 'Read a plan bottom-up. The row count on each node is the optimizer’s guess at that operator’s output size.' },
      metrics: { plans: 2, cost: 9000, latency: 120 },
      scene: { view: 'rowest', note: 'Same rows out — but very different work inside the join.' },
    },
    { // 2
      chapter: 'technique', short: 'Cost',
      title: 'Cost per operator, summed at the root',
      body: [
        `Each node carries an estimated <span class="term">cost</span>; the root’s cost is the whole plan’s cost. The Nested-Loop join re-scans <code>orders</code> for every outer row, so its join node dominates at <b>~9,000</b>.`,
        `The Hash-Join builds a table once and probes it in one pass, landing near <b>~1,200</b>. Same answer, roughly <b>7×</b> cheaper.`,
      ],
      callout: { kind: 'insight', text: 'The root cost is what the optimizer compares. Walk down to find which operator is spending it.' },
      metrics: { plans: 2, cost: 1200, latency: 40 },
      scene: { view: 'cost', note: 'Nested Loop ~9,000 vs Hash Join ~1,200 at the root.' },
    },
    { // 3
      chapter: 'technique', short: 'Est vs actual',
      title: 'When the estimate is a lie',
      body: [
        `Estimates come from <b>statistics</b>, and statistics go stale. Here the Hash-Join plan estimated <code>1.4k</code> rows out of the join but <em>actually</em> produced <code>48k</code> — the stats under-counted a skewed key.`,
        `A large gap between <b>estimated</b> and <b>actual</b> is the classic fingerprint of a bad plan: the optimizer chose on numbers that were wrong.`,
      ],
      callout: { kind: 'warn', text: 'A big estimated-vs-actual gap means the optimizer was flying blind. Refresh statistics before blaming the plan.' },
      metrics: { plans: 2, cost: 1200, latency: 95 },
      scene: { view: 'estVsAct', note: 'Estimated 1.4k, actually 48k — stale stats mislead the model.' },
    },
    { // 4
      chapter: 'technique', short: 'The choice',
      title: 'Why the optimizer kept this plan',
      body: [
        `Given its estimates, the optimizer keeps the plan with the lowest <b>estimated</b> total cost — here the Hash-Join. The Nested-Loop plan is discarded.`,
        `That choice is only as good as the numbers behind it: right when stats are fresh, wrong when they aren’t. Reading the comparison tells you <em>which</em>.`,
      ],
      callout: { kind: 'tip', text: 'The optimizer is a cost minimizer, not an oracle. It picks the cheapest estimate — correct or not.' },
      metrics: { plans: 2, cost: 1200, latency: 40 },
      scene: { view: 'choice', note: 'The cheaper estimated plan wins; the other is pruned.' },
    },
    { // 5
      chapter: 'recap', short: 'Recap',
      title: 'How to read a plan comparison',
      body: [
        `Three things to compare between any two plans: their <b>shape</b> (which algorithms), the <b>rows</b> flowing through each node, and the <b>cost</b> that rolls up to the root.`,
        `When a query is slow, pull up its plan next to a cheaper alternative and look for the node where rows — or cost — explode. That node is the bug.`,
      ],
      callout: { kind: 'insight', text: 'Shape · rows · cost. Compare those three and the slow operator reveals itself.' },
      metrics: { plans: 2, cost: 1200, latency: 40 },
      scene: { view: 'recap', note: 'Compare shape, rows and cost — the slow node stands out.' },
    },
  ],
};
