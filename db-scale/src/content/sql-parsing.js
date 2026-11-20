/* content/sql-parsing.js — the "SQL Parsing" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/sql-parsing-scene.js. Rendered through the shared course shell. */

export const sqlParsingLesson = {
  id: 'sql-parsing',
  title: 'SQL Parsing',
  group: 'Query Engine',
  summary: 'The query engine’s first stage: turning a flat query string into a structured tree it can actually reason about.',
  minutes: 8,
  level: 'beginner',
  metrics: ['tokens', 'nodes', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a raw query string can’t be executed directly', step: 0 },
    { text: 'Tokenizing: splitting characters into meaningful tokens', step: 1 },
    { text: 'A grammar defines which token sequences are valid SQL', step: 2 },
    { text: 'Parsing: matching tokens to rules to build a tree', step: 3 },
    { text: 'Syntax errors are caught here, before any data is touched', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Raw text',
      title: 'A query arrives as plain text',
      body: [
        `When you send <code>SELECT name FROM users WHERE total &gt; 100</code>, the database receives exactly that — a single flat <span class="term">string</span> of characters. Nothing about those bytes tells it where a keyword ends, which word is a table, or what the query <em>means</em>.`,
        `A computer cannot execute characters. Before anything else can happen, the engine has to discover the <b>structure</b> hidden in that line of text.`,
      ],
      callout: { kind: 'warn', text: 'To the engine, a query starts life as an undifferentiated string. Every later stage depends on first giving it shape.' },
      metrics: { tokens: 0, nodes: 0, latency: 2 },
      scene: { view: 'text', note: 'One flat string of characters — no structure yet.' },
    },
    { // 1 — TOKENIZE
      chapter: 'technique', short: 'Tokenize',
      title: 'The lexer splits text into tokens',
      body: [
        `The first pass is the <span class="term">lexer</span> (or tokenizer). It scans the string left to right and groups characters into <b>tokens</b>: keywords (<code>SELECT</code>, <code>FROM</code>), identifiers (<code>users</code>, <code>name</code>), literals (<code>100</code>), and operators (<code>&gt;</code>).`,
        `Whitespace and comments are discarded. The messy string becomes a clean, ordered stream of labelled pieces — the raw material the parser works on.`,
      ],
      callout: { kind: 'tip', text: 'Tokenizing is pure classification: it decides what each chunk of text is, not yet how the chunks fit together.' },
      changes: ['+ lexer scans the string', '+ tokens: keyword / identifier / literal / operator', '~ whitespace discarded'],
      metrics: { tokens: 12, nodes: 0, latency: 3 },
      scene: { view: 'tokens', note: 'The lexer emits an ordered stream of classified tokens.' },
    },
    { // 2 — GRAMMAR
      chapter: 'technique', short: 'Grammar',
      title: 'A grammar says what’s legal',
      body: [
        `How does the engine know <code>SELECT name FROM users</code> is valid but <code>FROM SELECT users name</code> is not? A <span class="term">grammar</span> — a set of rules — defines exactly which sequences of tokens form a well-formed statement.`,
        `Each rule expands into sub-rules and tokens: a <code>query</code> is a <code>SELECT</code> followed by a column list, a <code>FROM</code>, a table, and an optional predicate. SQL’s whole syntax is a few dozen such rules.`,
      ],
      callout: { kind: 'insight', text: 'The grammar is the contract between the token stream and a valid query — the yardstick the parser measures against.' },
      metrics: { tokens: 12, nodes: 0, latency: 3 },
      scene: { view: 'grammar', note: 'Grammar rules define the legal shapes a token stream may take.' },
    },
    { // 3 — PARSE
      chapter: 'technique', short: 'Parse',
      title: 'The parser builds a tree',
      body: [
        `The <span class="term">parser</span> consumes the token stream and tries to match it against the grammar. As each rule matches, it creates a <b>node</b>; as rules nest, nodes gain children — and the result is a <b>tree</b> that captures the query’s structure.`,
        `Now the shape is explicit: a <code>SELECT</code> at the root, a projection, a source, a predicate. The engine finally has something it can walk, analyse, and plan.`,
      ],
      callout: { kind: 'insight', text: 'Parsing is where linear text becomes a tree. Every downstream stage — analysis, planning, optimization — operates on that tree.' },
      changes: ['+ parser matches tokens to grammar rules', '+ each match becomes a tree node', '+ structure is now explicit'],
      metrics: { tokens: 12, nodes: 7, latency: 4 },
      scene: { view: 'parse', note: 'Tokens matched against rules assemble into a tree.' },
    },
    { // 4 — ERROR
      chapter: 'technique', short: 'Syntax error',
      title: 'Bad syntax stops here',
      body: [
        `If the token stream can’t be matched to any grammar rule — a misspelled <code>SELCT</code>, a missing <code>FROM</code>, an unbalanced parenthesis — the parser fails and raises a <span class="term">syntax error</span>.`,
        `This is a feature: the query is rejected immediately, at the cheapest possible stage, before the engine has looked at a single row of data. Nothing downstream ever sees a malformed query.`,
      ],
      callout: { kind: 'warn', text: 'Syntax errors are caught by the parser alone — no catalog, no data, no I/O. The cheapest place to fail is first.' },
      metrics: { tokens: 5, nodes: 0, latency: 1 },
      scene: { view: 'error', note: 'A query that breaks the grammar is rejected before any data is touched.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Text → structure',
      title: 'From characters to a tree',
      body: [
        `Parsing is a two-step hand-off: the <b>lexer</b> turns characters into tokens, and the <b>parser</b> turns tokens into a tree — validating the syntax along the way.`,
        `That tree is the starting point for everything that follows. Next we look at the tree itself: the verbose <span class="term">parse tree</span>, and the leaner <span class="term">AST</span> the engine distills from it.`,
      ],
      callout: { kind: 'insight', text: 'Lexer: characters → tokens. Parser: tokens → tree. The query is now structured, valid, and ready to analyse.' },
      metrics: { tokens: 12, nodes: 7, latency: 4 },
      scene: { view: 'recap', note: 'Characters became tokens became a tree — ready for the next stage.' },
    },
  ],
};
