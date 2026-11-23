/* content/ast.js — the "AST" lesson (Query Engine), as DATA. Same shape as
   content/dbms.js: each step is { chapter, short, title, body[], callout,
   changes?, metrics, scene }. `scene` is consumed by db/ast-scene.js. */

export const astLesson = {
  id: 'ast',
  title: 'AST',
  group: 'Query Engine',
  summary: 'The Abstract Syntax Tree — the parse tree distilled to pure meaning, with every keyword and comma thrown away so the rest of the engine has one clean shape to work on.',
  minutes: 7,
  level: 'beginner',
  metrics: ['nodes', 'ops', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why the verbose parse tree is distilled into an AST', step: 0 },
    { text: 'What gets dropped: keywords, punctuation, pure noise', step: 1 },
    { text: 'AST nodes as operations and operands', step: 2 },
    { text: 'Why a compact tree is cheaper to analyze and transform', step: 3 },
    { text: 'One canonical AST feeds every later stage', step: 4 },
  ],

  steps: [
    { // 0 — DISTILL
      chapter: 'technique', short: 'Distill',
      title: 'From parse tree to AST',
      body: [
        `The parser hands back a <span class="term">parse tree</span> that mirrors the grammar exactly — every rule and every token is a node, keywords and commas included. It is faithful, but far too bulky to work with.`,
        `So the engine distills it into an <span class="term">Abstract Syntax Tree</span>: the same query, stripped down to the handful of nodes that actually carry meaning. The verbose tree on the left collapses into the compact tree on the right.`,
      ],
      callout: { kind: 'insight', text: 'The AST is the parse tree with the syntactic noise boiled off. Same meaning, a fraction of the nodes.' },
      metrics: { nodes: 22, ops: 3, latency: 6 },
      scene: { view: 'distill', note: 'A ~20-node parse tree distils into a ~5-node AST.' },
    },
    { // 1 — DROP THE NOISE
      chapter: 'technique', short: 'Drop noise',
      title: 'Throw away the syntax',
      body: [
        `What disappears? Everything that was only there to <em>spell</em> the query: the words <code>SELECT</code>, <code>FROM</code>, <code>WHERE</code>, the commas, the parentheses. They told the parser how to read the text; they carry no information once the structure is known.`,
        `What survives is the <b>shape</b> — which operation sits above which, and what each one refers to.`,
      ],
      callout: { kind: 'tip', text: 'Keywords and punctuation are scaffolding. Once the tree is built, the scaffolding comes down.' },
      changes: ['- SELECT / FROM / WHERE tokens', '- commas & parentheses', '~ keep only structure'],
      metrics: { nodes: 12, ops: 3, latency: 5 },
      scene: { view: 'noise', note: 'Keyword and punctuation nodes are dropped; structure remains.' },
    },
    { // 2 — SEMANTIC NODES
      chapter: 'technique', short: 'Semantic',
      title: 'Nodes are operations and operands',
      body: [
        `Each AST node now means something concrete. A <b>Select</b> (projection) node sits on top, holding the column list. Below it a <b>Filter</b> node carries the <code>WHERE</code> predicate, and under that a <b>Join</b> node ties the two tables together on their key.`,
        `The leaves are the operands — the base tables <code>users</code> and <code>orders</code>. Read top-to-bottom, the tree already describes <em>what</em> the query means.`,
      ],
      callout: { kind: 'insight', text: 'Interior nodes = operations (project, filter, join). Leaves = operands (tables, columns, literals).' },
      metrics: { nodes: 5, ops: 3, latency: 4 },
      scene: { view: 'semantic', note: 'Select → Filter → Join over the two base tables.' },
    },
    { // 3 — COMPACT
      chapter: 'technique', short: 'Compact',
      title: 'Small is cheap to work with',
      body: [
        `The payoff is size. A parse tree for this one query is roughly twenty nodes; its AST is about five. Every later stage — name resolution, type checking, planning, optimization — has to <em>walk</em> this tree, often many times.`,
        `A tree that is four times smaller is four times cheaper to traverse and transform. Compactness here pays off through the whole rest of the pipeline.`,
      ],
      callout: { kind: 'tip', text: 'The AST is walked again and again downstream. Shrinking it once makes every later pass faster.' },
      metrics: { nodes: 5, ops: 3, latency: 3 },
      scene: { view: 'compact', note: 'About five meaningful nodes instead of twenty.' },
    },
    { // 4 — UNIFORM INPUT
      chapter: 'technique', short: 'Uniform',
      title: 'One shape everything downstream speaks',
      body: [
        `Crucially, the AST is a <span class="term">canonical</span> form. The analyzer, the logical planner and the optimizer are all written against this one data structure — they don't care whether the query came from a REPL, a prepared statement, or an ORM.`,
        `Define the AST once, and every stage after parsing shares a single, well-understood input.`,
      ],
      callout: { kind: 'insight', text: 'The AST is the contract between the front-end (parsing) and the back-end (planning). One shape, many consumers.' },
      changes: ['+ analyzer reads the AST', '+ planner reads the AST', '+ optimizer reads the AST'],
      metrics: { nodes: 5, ops: 3, latency: 3 },
      scene: { view: 'uniform', note: 'Analyzer, planner and optimizer all consume the same AST.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The query’s working form',
      body: [
        `The AST is the query as the database actually thinks about it: a small tree of operations over operands, free of the text it was written in. Parsing produced it; everything interesting happens to it next.`,
        `From here the engine resolves names against the catalog, turns the tree into a logical plan, and lets the optimizer reshape that plan for speed — all on top of this one canonical structure.`,
      ],
      callout: { kind: 'insight', text: 'Text → tokens → parse tree → AST. The AST is where parsing ends and query planning begins.' },
      metrics: { nodes: 5, ops: 3, latency: 3 },
      scene: { view: 'recap', note: 'The canonical AST — the handoff from parsing to planning.' },
    },
  ],
};
