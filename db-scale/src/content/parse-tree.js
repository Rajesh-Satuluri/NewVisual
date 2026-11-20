/* content/parse-tree.js — the "Parse Tree" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/parse-tree-scene.js. Rendered through the shared course shell. */

export const parseTreeLesson = {
  id: 'parse-tree',
  title: 'Parse Tree',
  group: 'Query Engine',
  summary: 'The tree the parser hands back — a faithful, verbose mirror of the grammar, where every rule and every token becomes a node.',
  minutes: 7,
  level: 'beginner',
  metrics: ['tokens', 'nodes', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why the parse tree mirrors the grammar one-to-one', step: 0 },
    { text: 'Interior nodes are rules; leaves are tokens', step: 1 },
    { text: 'Keywords and punctuation are leaves too', step: 2 },
    { text: 'It is precise but verbose — full of noise', step: 3 },
    { text: 'The engine walks it to read the query’s shape', step: 4 },
  ],

  steps: [
    { // 0
      chapter: 'technique', short: 'Concrete tree',
      title: 'A tree shaped like the grammar',
      body: [
        `Once the parser has matched your query against the SQL grammar, it hands back a <span class="term">parse tree</span> — also called the <em>concrete syntax tree</em>. Its shape is the grammar’s shape: every rule the parser applied becomes a branch, every token it consumed becomes a leaf.`,
        `Read top-down, the root is the whole <code>query</code>; under it sit the clauses — <code>selectList</code>, <code>fromClause</code>, <code>whereClause</code> — and under those, the actual words you typed.`,
      ],
      callout: { kind: 'insight', text: 'The parse tree is a structural record of exactly how the grammar derived your query. Nothing is interpreted yet — it is pure shape.' },
      metrics: { tokens: 14, nodes: 28, latency: 2 },
      scene: { view: 'concrete', note: 'One query, derived by the grammar into a tree.' },
    },
    { // 1
      chapter: 'technique', short: 'Rules = nodes',
      title: 'Interior nodes are grammar rules',
      body: [
        `Every <b>interior node</b> is a <span class="term">rule application</span>: the parser decided “here a <code>selectList</code> begins,” or “this is a <code>predicate</code>,” and recorded that choice as a node with children.`,
        `Walk from any interior node to its children and you are reading the grammar production that built it. The tree is, quite literally, the derivation written down.`,
      ],
      callout: { kind: 'tip', text: 'Interior node ⇄ grammar rule. The branching structure IS the sequence of parsing decisions.' },
      metrics: { tokens: 14, nodes: 28, latency: 2 },
      scene: { view: 'rules', note: 'Each interior node records one grammar rule.' },
    },
    { // 2
      chapter: 'technique', short: 'Tokens = leaves',
      title: 'Leaves are the literal tokens',
      body: [
        `The <b>leaves</b> are the tokens the lexer produced — and <em>all</em> of them survive, not just the interesting ones. Identifiers like <code>name</code> and <code>users</code> are leaves, but so are the keywords <code>SELECT</code>, <code>FROM</code>, <code>WHERE</code> and every stray comma and parenthesis.`,
        `Nothing has been thrown away. The parse tree is a complete, lossless record of the input.`,
      ],
      callout: { kind: 'insight', text: 'A leaf for every token — keywords and punctuation included. The tree can be printed back out as the original query, verbatim.' },
      metrics: { tokens: 14, nodes: 28, latency: 2 },
      scene: { view: 'leaves', note: 'Every token — keyword, name, symbol — is a leaf.' },
    },
    { // 3
      chapter: 'tradeoff', short: 'Verbose',
      title: 'Faithful means bulky',
      body: [
        `That faithfulness is also the problem. The later stages — analysis, planning, optimization — don’t care that you wrote the word <code>SELECT</code> or where the commas fell. They care about <em>meaning</em>: which columns, which tables, which condition.`,
        `A parse tree drags all that syntactic noise along. It is precise, but far too detailed to plan a query against directly.`,
      ],
      callout: { kind: 'warn', text: 'Keywords, separators and nesting that only existed to satisfy the grammar are dead weight downstream. The next step strips them out.' },
      changes: ['~ keeps every keyword & symbol', '- no meaning extracted yet', '+ 100% faithful to the input'],
      metrics: { tokens: 14, nodes: 28, latency: 2 },
      scene: { view: 'verbose', note: 'Greyed leaves are pure syntax — noise the AST will drop.' },
    },
    { // 4
      chapter: 'technique', short: 'Walk it',
      title: 'The engine walks the tree',
      body: [
        `To make sense of the query, the engine <span class="term">traverses</span> the parse tree — descending from the root into each clause, visiting nodes in order to discover the query’s structure.`,
        `This walk is where the raw tree starts turning into something useful: as it visits nodes, the engine builds the leaner <b>abstract syntax tree</b> you’ll meet next.`,
      ],
      callout: { kind: 'tip', text: 'A tree is only useful if you can walk it. Traversal order is how the engine reads structure out of shape.' },
      metrics: { tokens: 14, nodes: 28, latency: 3 },
      scene: { view: 'walk', note: 'A traversal threads the whole tree, root to leaves.' },
    },
    { // 5
      chapter: 'recap', short: 'Recap',
      title: 'Precise, but not the working form',
      body: [
        `The parse tree is the parser’s honest output: a complete, grammar-shaped record of your query, with a node for every rule and a leaf for every token.`,
        `Its strength — total fidelity — is also why nothing plans against it directly. In the next lesson we distill it into the <span class="term">abstract syntax tree</span>: same meaning, a fraction of the nodes.`,
      ],
      callout: { kind: 'insight', text: 'Parse tree = faithful & verbose. AST = compact & semantic. The walk from one to the other is where syntax becomes meaning.' },
      metrics: { tokens: 14, nodes: 28, latency: 2 },
      scene: { view: 'recap', note: 'A faithful tree — ready to be distilled into an AST.' },
    },
  ],
};
