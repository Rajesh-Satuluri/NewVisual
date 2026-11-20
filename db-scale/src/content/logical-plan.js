/* content/logical-plan.js — the "Logical Plan" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/logical-plan-scene.js. Rendered through the shared course shell. */

export const logicalPlanLesson = {
  id: 'logical-plan',
  title: 'Logical Plan',
  group: 'Query Engine',
  summary: 'Once the query is parsed and validated, the engine turns the bound AST into a relational-algebra tree — a precise statement of what result is wanted that still says nothing about how to compute it.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['ops', 'nodes', 'rows'],
  legend: ['read', 'write'],
  goals: [
    { text: 'How a bound AST becomes a relational-algebra tree', step: 0 },
    { text: 'The operator nodes σ, π, ⋈ and their table leaves', step: 1 },
    { text: 'Why the logical plan is declarative — <em>what</em>, not <em>how</em>', step: 2 },
    { text: 'Equivalent plans: many tree shapes, one answer', step: 3 },
    { text: 'Why no access method or join algorithm is chosen yet', step: 4 },
  ],

  steps: [
    { // 0 — AST → algebra
      chapter: 'technique', short: 'AST → algebra',
      title: 'From a validated tree to an algebra tree',
      body: [
        `The analyzer handed us an <span class="term">AST</span> whose every name is resolved and type-checked. The planner now rewrites it into a <span class="term">logical plan</span>: a tree of <b>relational-algebra operators</b>.`,
        `Each SQL idea maps to an operator — a join clause becomes <code>⋈</code>, a <code>WHERE</code> becomes a selection <code>σ</code>, a <code>SELECT</code> list becomes a projection <code>π</code>. The messy, keyword-laden AST collapses into a handful of clean nodes.`,
      ],
      callout: { kind: 'insight', text: 'The logical plan is relational algebra: a small, exact set of operators that take relations in and give a relation out — so they compose into a tree.' },
      changes: ['+ relational-algebra tree', '~ AST nodes → operator nodes', '- SQL keywords & punctuation'],
      metrics: { ops: 0, nodes: 9, rows: 142 },
      scene: { view: 'convert', note: 'The bound AST on the left is rewritten into the algebra tree on the right.' },
    },
    { // 1 — operators
      chapter: 'technique', short: 'Operators',
      title: 'Three operators, two table leaves',
      body: [
        `Read the tree bottom-up. The <b>leaves</b> are the base tables, <code>users</code> and <code>orders</code>. Above them, <code>⋈</code> <b>joins</b> the two relations on <code>users.id = orders.user_id</code>.`,
        `The selection <code>σ</code> keeps only rows where <code>total > 100</code>, and the projection <code>π</code> keeps only the <code>name</code> column. The result of each operator feeds straight into the one above it.`,
      ],
      callout: { kind: 'tip', text: 'σ selects rows · π projects columns · ⋈ joins relations. Every node consumes relations and produces a relation — that closure is what lets them stack.' },
      changes: ['+ ⋈ join leaves', '+ σ selection', '+ π projection'],
      metrics: { ops: 3, nodes: 5, rows: 142 },
      scene: { view: 'operators', note: 'A tree of σ, π and ⋈ over the users and orders leaves.' },
    },
    { // 2 — declarative
      chapter: 'technique', short: 'What, not how',
      title: 'The logical plan is declarative',
      body: [
        `Notice what the tree does <em>not</em> say. It does not say whether <code>users</code> is read by a sequential scan or an index. It does not say whether <code>⋈</code> is a hash join, a nested-loop join, or a merge join.`,
        `A logical plan describes the <b>result</b>, not the procedure. It is still algebra: a specification of <em>what</em> relation to produce, leaving every <em>how</em> decision to the next stage.`,
      ],
      callout: { kind: 'insight', text: 'Logical = declarative. The plan pins down the answer and nothing else, which is exactly why the optimizer has room to be clever.' },
      metrics: { ops: 3, nodes: 5, rows: 142 },
      scene: { view: 'declarative', note: 'Same tree — a statement of what, with every how still open.' },
    },
    { // 3 — equivalences
      chapter: 'technique', short: 'Equivalent trees',
      title: 'Many trees, one answer',
      body: [
        `Because the operators obey algebraic laws, the same query has <b>many equivalent logical plans</b>. You can push the selection <code>σ</code> <em>below</em> the join so rows are filtered <em>before</em> they are joined, and the final result is identical.`,
        `These rewrites can change the cost by orders of magnitude while leaving the answer untouched. Filtering early here cuts the rows entering the join from 142 down to 38.`,
      ],
      callout: { kind: 'tip', text: 'Equivalence rules (predicate pushdown, projection pushdown, join reordering) rewrite the tree without changing its result. This freedom is the optimizer’s whole playground.' },
      changes: ['~ push σ below ⋈', '= same result', '- rows into the join'],
      metrics: { ops: 3, nodes: 5, rows: 38 },
      scene: { view: 'equiv', note: 'Push σ down: filter first, join fewer rows — identical answer.' },
    },
    { // 4 — no algorithms yet
      chapter: 'technique', short: 'No algorithms',
      title: 'Still no access methods chosen',
      body: [
        `The leaves say <code>users</code> and <code>orders</code> — not <em>seq-scan users</em> or <em>index-scan orders</em>. The join says <code>⋈</code> — not <em>hash join</em>. Nothing about <em>how</em> to touch the data has been decided.`,
        `That is deliberate. Turning each logical operator into a concrete algorithm is the job of the <span class="term">physical plan</span>, the very next lesson. The logical plan is the shared starting point every physical plan is built from.`,
      ],
      callout: { kind: 'warn', text: 'A logical plan is not runnable. It names relations and operators, never files, scans or iterators. The executor cannot run it until the physical plan fills those in.' },
      metrics: { ops: 3, nodes: 5, rows: 38 },
      scene: { view: 'noalgo', note: 'Leaves are tables, not methods — the "how" comes next.' },
    },
    { // 5 — recap
      chapter: 'recap', short: 'Recap',
      title: 'The optimizer’s clay',
      body: [
        `The logical plan is the query expressed as pure relational algebra: a compact tree of <code>σ</code>, <code>π</code> and <code>⋈</code> over table leaves, saying exactly what result is wanted and nothing about how to get it.`,
        `Because many equivalent trees produce that same result, the logical plan is the <b>clay</b> the optimizer reshapes — pushing predicates down, reordering joins — before handing a chosen shape to the physical planner.`,
      ],
      callout: { kind: 'insight', text: 'Parse → bind → logical plan. You now hold an algebra tree: declarative, equivalence-rich, and ready for the optimizer to reshape and the physical planner to make runnable.' },
      metrics: { ops: 3, nodes: 5, rows: 38 },
      scene: { view: 'recap', note: 'A clean algebra tree — ready for the optimizer.' },
    },
  ],
};
