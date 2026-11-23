/* content/physical-plan.js — the "Physical Plan" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/physical-plan-scene.js. Rendered through the shared course shell. */

export const physicalPlanLesson = {
  id: 'physical-plan',
  title: 'Physical Plan',
  group: 'Query Engine',
  summary: 'The logical plan made runnable: every logical operator is assigned a concrete algorithm, turning the query into a tree of executable iterators the engine can actually run.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['ops', 'cost', 'pages'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Each logical operator is assigned a physical algorithm', step: 0 },
    { text: 'Table leaves become Seq Scans or Index Scans', step: 1 },
    { text: 'A join becomes Hash / Nested-Loop / Merge Join', step: 2 },
    { text: 'The plan is a tree of iterators that pull rows up', step: 3 },
    { text: 'Every operator is annotated with an estimated cost', step: 4 },
  ],

  steps: [
    { // 0
      chapter: 'technique', short: 'Logical → physical',
      title: 'Give every operator an algorithm',
      body: [
        `The <span class="term">logical plan</span> says <em>what</em> result you want — join these, filter those, project that. It never says <em>how</em>. The <span class="term">physical plan</span> fills in the “how”: it walks the logical tree and assigns each node a concrete <b>algorithm</b>.`,
        `A logical <code>σ</code> becomes a filter operator; a logical <code>⋈</code> becomes a specific join algorithm; a table leaf becomes a specific way of reading the bytes. The shape is the same tree — now every node is runnable.`,
      ],
      callout: { kind: 'insight', text: 'Logical plan = what. Physical plan = how. Same tree, but each operator now names the exact algorithm the executor will run.' },
      metrics: { ops: 4, cost: 420, pages: 0 },
      scene: { view: 'convert', note: 'The logical tree on the left is rewritten into a runnable physical tree on the right.' },
    },
    { // 1
      chapter: 'technique', short: 'Access methods',
      title: 'How to read each table',
      body: [
        `The leaves of the plan are tables, and the first physical choice is the <span class="term">access method</span> — how to pull rows off disk. The two basics: a <b>Sequential Scan</b> reads every page of the table in order, and an <b>Index Scan</b> descends an index to fetch only the pages that can match.`,
        `Here <code>users</code> is read with a Seq Scan and <code>orders</code> with an Index Scan on <code>user_id</code>. Which is cheaper depends on how many rows actually qualify — the next lessons measure exactly that.`,
      ],
      callout: { kind: 'tip', text: 'Every table leaf resolves to an access method: Seq Scan (read it all) or Index Scan (jump to the matches). The optimizer picks per table, per query.' },
      metrics: { ops: 4, cost: 300, pages: 0 },
      scene: { view: 'access', note: 'Each table leaf becomes a concrete scan: sequential or index.' },
    },
    { // 2
      chapter: 'technique', short: 'Join algorithms',
      title: 'How to combine two inputs',
      body: [
        `A logical join only states the condition (<code>users.id = orders.user_id</code>). The physical plan must pick an <span class="term">algorithm</span>. <b>Hash Join</b> builds a hash table on one side and probes it with the other — great for equality joins. <b>Nested-Loop Join</b> scans the inner side for every outer row — fine when one side is tiny. <b>Merge Join</b> walks two already-sorted inputs in lockstep.`,
        `Each has a different cost curve, so the choice is query-specific. For this join the planner picks a <b>Hash Join</b>.`,
      ],
      callout: { kind: 'insight', text: 'One logical ⋈ → three candidate physical operators. Hash, Nested-Loop and Merge Join each win in a different regime; cost decides.' },
      metrics: { ops: 4, cost: 260, pages: 0 },
      scene: { view: 'join', note: 'The logical join resolves to one of three join algorithms.' },
    },
    { // 3
      chapter: 'technique', short: 'Iterators',
      title: 'A tree of pull-based iterators',
      body: [
        `The physical plan is executed as a tree of <span class="term">iterators</span>. Each operator exposes the same tiny interface — <code>open</code>, <code>next</code>, <code>close</code> — and pulls rows from its children one at a time. This is the classic <b>Volcano</b> (iterator) model.`,
        `The root is asked for a row; it asks its child, which asks <em>its</em> child, all the way down to the scans. Rows flow <b>up</b> the tree on demand, so the engine never has to materialize the whole intermediate result at once.`,
      ],
      callout: { kind: 'tip', text: 'open / next / close on every operator. The root pulls; each node pulls from its children. Rows stream up the tree, one at a time.' },
      metrics: { ops: 5, cost: 260, pages: 4 },
      scene: { view: 'iterators', note: 'Each operator pulls rows from its children — rows stream up the tree.' },
    },
    { // 4
      chapter: 'technique', short: 'Cost',
      title: 'Annotate every node with a cost',
      body: [
        `Before it commits, the planner tags each physical operator with an <span class="term">estimated cost</span> — a number blending the disk pages it will read and the CPU it will burn. A node’s cost includes the cost of its children, so the <b>root’s cost is the whole plan’s cost</b>.`,
        `These numbers are how two candidate plans get compared. Change an access method or a join algorithm and the costs shift — which is exactly the lever query optimization pulls in the next lessons.`,
      ],
      callout: { kind: 'insight', text: 'Cost rolls up the tree: each operator’s estimate includes its children, so the root carries the total. That single number is what the optimizer minimizes.' },
      metrics: { ops: 5, cost: 260, pages: 12 },
      scene: { view: 'cost', note: 'Each operator carries an estimated cost; the root’s cost is the plan’s cost.' },
    },
    { // 5
      chapter: 'recap', short: 'Recap',
      title: 'The plan the executor runs',
      body: [
        `The physical plan is the end of planning and the start of execution. It is a concrete, cost-annotated tree of iterators: scans at the leaves, join and filter and project algorithms above, a single root that yields the answer.`,
        `Everything downstream — the executor, <code>EXPLAIN ANALYZE</code>, parallelism — operates on this tree. Everything upstream — optimization, cost-based search — exists to choose a <em>good</em> one.`,
      ],
      callout: { kind: 'insight', text: 'Scans → joins → filter → project, each an iterator with a cost. The physical plan is literally what runs; the optimizer’s whole job is to pick a cheap one.' },
      metrics: { ops: 5, cost: 260, pages: 12 },
      scene: { view: 'recap', note: 'A runnable, cost-annotated tree of iterators — ready for the executor.' },
    },
  ],
};
