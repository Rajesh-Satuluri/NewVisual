/* content/follow-the-query.js — the "Follow the Query" Interactive Lab, as
   DATA. A guided trace that walks ONE SELECT statement through the whole query
   engine — parse, plan, optimize, execute — tying together the Query-Engine
   lessons. Same step shape as every other db-scale lesson. `scene` is a
   view-snapshot consumed by db/follow-the-query-scene.js. */

export const followTheQueryLesson = {
  id: 'follow-the-query',
  title: 'Follow the Query',
  group: 'Interactive Labs',
  summary: 'Trace a single SELECT from raw text to result rows: parsing, the logical plan, the optimizer’s physical plan, and the operators that actually run.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['latency', 'rows', 'ioOps', 'cost'],
  legend: ['read', 'write'],
  goals: [
    { text: 'What a database does with your SQL text', step: 0 },
    { text: 'Text → tokens → parse tree → validated AST', step: 1 },
    { text: 'The logical plan is a relational-algebra tree', step: 2 },
    { text: 'The optimizer picks the cheapest physical plan', step: 3 },
    { text: 'Operators pull rows up the tree to the result', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM / intro
      chapter: 'problem', short: 'One query',
      title: 'You type SELECT — then what?',
      body: [
        `You run one statement:`,
        `<code>SELECT c.name, o.total FROM orders o JOIN customers c ON o.cust_id = c.id WHERE o.total &gt; 100 ORDER BY o.total DESC;</code>`,
        `To you it is a single line. Inside the database it becomes a <b>pipeline</b>: the text is parsed, turned into a plan, the plan is optimized into concrete operators, and only then does any data get read. This lab follows that one query the whole way through.`,
      ],
      callout: { kind: 'tip', text: 'A query is not “run” directly. It is compiled: SQL text → parse tree → logical plan → physical plan → executed operators. Each stage hands its output to the next.' },
      metrics: { latency: 0, rows: 0, ioOps: 0, cost: 0 },
      scene: { view: 'submit', note: 'One SELECT enters the engine. Four stages stand between it and the rows.' },
    },
    { // 1 — PARSE & ANALYZE
      chapter: 'technique', short: 'Parse',
      title: 'Parse & analyze: text becomes structure',
      body: [
        `First the raw characters are <span class="term">tokenized</span> — <code>SELECT</code>, <code>c.name</code>, <code>JOIN</code>, <code>&gt;</code>, <code>100</code> — then arranged into a <span class="term">parse tree</span> that matches SQL’s grammar.`,
        `<b>Analysis</b> then validates it against the catalog: do <code>orders</code> and <code>customers</code> exist? Is <code>cust_id</code> a real column? Types checked, names resolved, the tree becomes a clean <span class="term">AST</span> the planner can trust.`,
      ],
      callout: { kind: 'insight', text: 'Parsing checks grammar; analysis checks meaning against the catalog. A typo in a column name is caught here, long before any disk is touched.' },
      changes: ['+ tokens from raw text', '+ parse tree (grammar)', '+ validated AST (names & types resolved)'],
      metrics: { latency: 1, rows: 0, ioOps: 0, cost: 0 },
      scene: { view: 'parse', note: 'Characters → tokens → parse tree → AST. Nothing has been read yet.' },
    },
    { // 2 — LOGICAL PLAN
      chapter: 'technique', short: 'Logical plan',
      title: 'The logical plan: a tree of operators',
      body: [
        `The AST is rewritten as a <span class="term">relational-algebra tree</span> — <em>what</em> to compute, not yet <em>how</em>. Leaves scan the base tables; above them sit a <b>join</b>, a <b>filter</b> (the <code>WHERE</code>), and a <b>sort</b> (the <code>ORDER BY</code>), with the result at the root.`,
        `Rows conceptually flow <b>up</b> the tree: each operator consumes its children’s rows and produces its own. This logical shape is still abstract — many different physical strategies could realize it.`,
      ],
      callout: { kind: 'insight', text: 'The logical plan is an operator tree: scans at the leaves, join / filter / sort above, result at the root. It says what, not how.' },
      metrics: { latency: 1, rows: 0, ioOps: 0, cost: 0 },
      scene: { view: 'logical', note: 'Scan · scan → join → filter → sort → result. The query’s shape, made explicit.' },
    },
    { // 3 — OPTIMIZE → PHYSICAL PLAN
      chapter: 'technique', short: 'Optimize',
      title: 'Optimize: choose the cheapest physical plan',
      body: [
        `Now the <span class="term">cost-based optimizer</span> turns each logical operator into a concrete one and compares the bills. Scan <code>orders</code> sequentially, or use an index on <code>total</code>? Join by <b>hash</b> or <b>nested loop</b>? Push the <code>total &gt; 100</code> filter <em>down</em> into the scan so fewer rows ever climb the tree?`,
        `Using table statistics it estimates a <b>cost</b> for every candidate and keeps the cheapest: here, an index scan on the filtered table feeding a hash join — far less work than the naïve plan.`,
      ],
      callout: { kind: 'tip', text: 'Predicate pushdown, index vs seq scan, hash vs nested-loop join — the optimizer prices each option from statistics and keeps the plan with the lowest estimated cost.' },
      changes: ['~ seq scan → index scan on total', '~ nested loop → hash join', '+ filter pushed down into the scan'],
      metrics: { latency: 2, rows: 0, ioOps: 0, cost: 180 },
      scene: { view: 'physical', note: 'Two candidate plans priced; the cheaper physical plan wins.' },
    },
    { // 4 — EXECUTE
      chapter: 'solution', short: 'Execute',
      title: 'Execute: operators pull rows to the top',
      body: [
        `The executor runs the physical tree as a chain of <span class="term">pull iterators</span> (the volcano model): the root asks <code>sort</code> for a row, which asks <code>filter</code>, which asks the <b>join</b>, which asks the <b>scans</b> — rows are produced on demand and flow up.`,
        `The index scan reads only the pages it needs; the hash join builds a table from <code>customers</code> and probes it; the sort orders the survivors. Watch <b>rows</b>, <b>I/O</b> and <b>latency</b> accumulate as the real work finally happens.`,
      ],
      callout: { kind: 'insight', text: 'Execution is demand-driven: each operator pulls rows from its children. Only now is data read — and the pushed-down filter means far fewer rows move.' },
      changes: ['+ index scan reads matching pages', '+ hash join probes customers', '+ sorted rows returned to the client'],
      metrics: { latency: 7, rows: 42, ioOps: 36, cost: 180 },
      scene: { view: 'execute', note: 'Pull iterators drive rows up the tree; I/O and rows climb as operators run.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The whole journey, end to end',
      body: [
        `One statement, five stages: <b>SQL → parse → logical plan → optimize → execute → rows</b>. Each stage is a lesson of its own — parsing, the AST, logical and physical plans, cost-based optimization, the execution operators — and here they ran as one pipeline.`,
        `<code>EXPLAIN ANALYZE</code> is your window into all of it: it prints the chosen physical plan and, after running, the real rows and time per operator — exactly the numbers you watched climb.`,
      ],
      callout: { kind: 'tip', text: 'EXPLAIN shows the plan the optimizer chose; EXPLAIN ANALYZE adds the actual rows and timings per operator. It is how you see this whole pipeline for your own queries.' },
      metrics: { latency: 7, rows: 42, ioOps: 36, cost: 180 },
      scene: { view: 'recap', note: 'SQL → Parse → Plan → Optimize → Execute → Rows — one query, the full pipeline.' },
    },
  ],
};
