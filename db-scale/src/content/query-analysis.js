/* content/query-analysis.js — the "Query Analysis" lesson (semantic analysis /
   binding), as DATA. Same shape as content/dbms.js; rendered through the shared
   course shell, scene drawn by db/query-analysis-scene.js. */

export const queryAnalysisLesson = {
  id: 'query-analysis',
  title: 'Query Analysis',
  group: 'Query Engine',
  summary: 'Semantic analysis — binding every name in the parsed query to a real object in the catalog, type-checking it, and rejecting nonsense, before a single plan is considered.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['tables', 'columns', 'constraints'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Binding: turning names into real catalog objects', step: 0 },
    { text: 'How the catalog resolves tables, columns and types', step: 1 },
    { text: 'Type-checking a query before it ever runs', step: 2 },
    { text: 'The errors analysis catches cheaply', step: 3 },
    { text: 'Rewrites: expanding <code>*</code> and inlining views', step: 4 },
  ],

  steps: [
    { // 0 — bind
      chapter: 'technique', short: 'Names → things',
      title: 'From names to real objects',
      body: [
        `The parser gave us a tree, but it is still just <em>text</em>: the token <code>users</code> is a string, not a table. <span class="term">Semantic analysis</span> — also called <span class="term">binding</span> — walks the tree and attaches every name to the actual object it refers to.`,
        `<code>users</code> becomes a pointer to the users relation; <code>name</code> becomes a reference to a specific column with a known type and position. After binding, no name in the tree is ambiguous.`,
      ],
      callout: { kind: 'insight', text: 'Parsing proves the query is well-formed. Analysis proves it is meaningful — that the things it names actually exist.' },
      metrics: { tables: 2, columns: 2, constraints: 0 },
      scene: { view: 'bind', note: 'Each table and column name is bound to a real catalog object.' },
    },
    { // 1 — catalog
      chapter: 'technique', short: 'Catalog',
      title: 'The catalog is the source of truth',
      body: [
        `To resolve a name, the analyzer consults the <span class="term">catalog</span> (also called the system catalog or data dictionary): the database's own record of every table, column, type, index and constraint.`,
        `When it sees <code>FROM users</code>, it looks <code>users</code> up in the catalog, finds its columns and their types, and uses that to check everything the query does with them. The catalog is why the engine knows <code>email</code> is text and <code>total</code> is a number.`,
      ],
      callout: { kind: 'tip', text: 'The catalog is itself stored as tables. The database describes its own schema in the same relational model it serves to you.' },
      metrics: { tables: 2, columns: 6, constraints: 0 },
      scene: { view: 'catalog', note: 'The analyzer reads schemas and types straight from the catalog.' },
    },
    { // 2 — types
      chapter: 'technique', short: 'Type check',
      title: 'Does this even make sense?',
      body: [
        `With every reference bound, the analyzer <span class="term">type-checks</span> the query. <code>orders.total &gt; 100</code> is only valid because <code>total</code> is numeric; comparing a date to a string, or summing a text column, is caught here.`,
        `Join conditions are checked too: <code>users.id = orders.user_id</code> needs two compatible key types. The result is a guarantee that the operations the query asks for are actually defined on the data it names.`,
      ],
      callout: { kind: 'insight', text: 'Type errors are found once, at analysis time — not row by row during execution. Catching them early is both correctness and speed.' },
      metrics: { tables: 2, columns: 6, constraints: 1 },
      scene: { view: 'types', note: '`total > 100` type-checks: total is numeric.' },
    },
    { // 3 — error
      chapter: 'tradeoff', short: 'Errors',
      title: 'Where bad queries die cheaply',
      body: [
        `If a name does not resolve — a misspelled column <code>emial</code>, a table that was dropped, a column that is ambiguous across two joined tables — analysis <b>rejects the query immediately</b>, with a precise error.`,
        `This is the cheapest possible place to fail: no plan has been built, no page has been read, no lock has been taken. The whole phase exists to turn a class of mistakes into instant, free errors.`,
      ],
      callout: { kind: 'warn', text: '“column does not exist”, “ambiguous column”, “operator does not exist for these types” — all semantic-analysis errors, raised before execution begins.' },
      metrics: { tables: 2, columns: 6, constraints: 1 },
      scene: { view: 'error', note: 'An unknown column fails analysis — before any work is done.' },
    },
    { // 4 — expand
      chapter: 'technique', short: 'Rewrite',
      title: 'Expanding and normalising',
      body: [
        `Analysis also <span class="term">rewrites</span> the tree into a canonical form. <code>SELECT *</code> is expanded into the real list of columns, so later phases never have to think about <code>*</code>. References to views are inlined to the queries that define them.`,
        `Qualified names are filled in, default schemas applied, implicit casts inserted. Downstream, the planner sees one clean, fully-specified tree — never the shorthand you typed.`,
      ],
      callout: { kind: 'tip', text: 'By the end of analysis the query is bound, type-checked and normalised. Everything after this works on real objects, not strings.' },
      metrics: { tables: 2, columns: 3, constraints: 1 },
      scene: { view: 'expand', note: '`SELECT *` becomes an explicit column list; views are inlined.' },
    },
    { // 5 — recap
      chapter: 'recap', short: 'Recap',
      title: 'A bound, validated tree',
      body: [
        `Semantic analysis takes the parser's purely-syntactic tree and makes it <b>mean something</b>: every table and column bound to a catalog object, every operation type-checked, every shorthand expanded, every impossible query already rejected.`,
        `What comes out is the input the planner has been waiting for — a tree it can trust completely. Next we turn that trusted tree into a <span class="term">logical plan</span>.`,
      ],
      callout: { kind: 'insight', text: 'Parse → analyse → plan. Analysis is the bridge: it is where a well-formed query becomes a correct, fully-resolved one.' },
      metrics: { tables: 2, columns: 3, constraints: 1 },
      scene: { view: 'recap', note: 'Bound and type-checked — ready to be planned.' },
    },
  ],
};
