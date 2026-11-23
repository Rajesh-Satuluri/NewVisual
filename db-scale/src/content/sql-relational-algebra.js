/* content/sql-relational-algebra.js — the "SQL → Relational Algebra" lesson, as
   DATA. Same shape as content/dbms.js: each step is { chapter, short, title,
   body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/sql-relational-algebra-scene.js. Rendered through the shared
   course shell. */

export const sqlRelationalAlgebraLesson = {
  id: 'sql-relational-algebra',
  title: 'SQL → Relational Algebra',
  group: 'Foundations',
  summary: 'SQL says what you want; the engine rewrites each clause into relational-algebra operators that say how to compute it — the same answer, a plan it can optimize.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['relations', 'rows', 'ops'],
  legend: ['read', 'write'],
  goals: [
    { text: 'SQL is declarative; algebra is the executable plan underneath', step: 0 },
    { text: 'FROM / JOIN becomes a join operator ⋈', step: 1 },
    { text: 'WHERE becomes a selection σ', step: 2 },
    { text: 'The SELECT list becomes a projection π', step: 3 },
    { text: 'Stacked, the clauses form one algebra tree', step: 4 },
  ],

  steps: [
    { // 0 — intro
      chapter: 'technique', short: 'Two languages',
      title: 'Two languages, one answer',
      body: [
        `You write <code>SELECT name FROM users JOIN orders ON users.id = orders.user_id WHERE orders.total &gt; 100</code> and the database just hands back the names. You said <em>what</em> you wanted, never <em>how</em> to get it.`,
        `Underneath, the engine turns that sentence into <span class="term">relational algebra</span>: a little tree of operators — <b>σ</b> (select rows), <b>π</b> (pick columns), <b>⋈</b> (join) — that it can actually execute. SQL is the request; algebra is the plan.`,
      ],
      callout: { kind: 'insight', text: 'SQL is declarative (the goal); relational algebra is operational (the steps). The optimizer is the translator between them.' },
      metrics: { relations: 2, rows: 0, ops: 0 },
      scene: { view: 'intro', note: 'Left: the SQL you wrote. Right: the operator tree it compiles to.' },
    },
    { // 1 — FROM/JOIN → ⋈
      chapter: 'technique', short: 'FROM → ⋈',
      title: 'FROM / JOIN becomes a join',
      body: [
        `Start at the bottom. <code>FROM users</code> and <code>JOIN orders</code> name the base relations to read, and the <code>ON users.id = orders.user_id</code> condition stitches them together.`,
        `That whole clause compiles to a single <span class="term">join</span> operator, written <b>users ⋈ orders</b>. It produces every matching (user, order) pair — the raw material the rest of the query filters down.`,
      ],
      callout: { kind: 'tip', text: 'FROM + JOIN … ON  →  the ⋈ operator. Base tables are its leaves; the join condition is its rule.' },
      changes: ['+ read users', '+ read orders', '+ users ⋈ orders'],
      metrics: { relations: 2, rows: 480, ops: 1 },
      scene: { view: 'from', pulse: 'join', note: 'FROM + JOIN → one ⋈ over the two base relations.' },
    },
    { // 2 — WHERE → σ
      chapter: 'technique', short: 'WHERE → σ',
      title: 'WHERE becomes a selection',
      body: [
        `The <code>WHERE orders.total &gt; 100</code> clause keeps only the rows that pass a test. In algebra that is <span class="term">selection</span>, written <b>σ</b> with the predicate as a subscript: <b>σ<sub>total &gt; 100</sub></b>.`,
        `It sits <em>above</em> the join, taking the joined rows in and letting only the qualifying ones through. Same number of columns, fewer rows.`,
      ],
      callout: { kind: 'tip', text: 'WHERE predicate  →  σ (sigma). It filters rows but never changes the columns.' },
      changes: ['+ σ(total > 100)', '~ rows filtered down'],
      metrics: { relations: 2, rows: 96, ops: 2 },
      scene: { view: 'where', pulse: 'sigma', note: 'WHERE → a σ that filters the joined rows.' },
    },
    { // 3 — SELECT → π
      chapter: 'technique', short: 'SELECT → π',
      title: 'The SELECT list becomes a projection',
      body: [
        `Finally the <code>SELECT name</code> list decides which <em>columns</em> survive. That is <span class="term">projection</span>, written <b>π</b>: <b>π<sub>name</sub></b> keeps the name column and drops the rest.`,
        `It sits at the very top, trimming each surviving row down to just the fields you asked for. Fewer columns, same rows.`,
      ],
      callout: { kind: 'tip', text: 'SELECT column-list  →  π (pi). It picks columns; it does not filter rows.' },
      changes: ['+ π(name)', '~ columns trimmed'],
      metrics: { relations: 2, rows: 96, ops: 3 },
      scene: { view: 'select', pulse: 'pi', note: 'SELECT → a π that keeps only the chosen columns.' },
    },
    { // 4 — the tree
      chapter: 'technique', short: 'The tree',
      title: 'Stacked into one algebra tree',
      body: [
        `Read the operators from the leaves up and the whole query is one expression: <b>π<sub>name</sub>( σ<sub>total &gt; 100</sub>( users ⋈ orders ) )</b>.`,
        `Data flows bottom-to-top: scan the two tables, join them, filter the rows, project the columns, emit the answer. Every SQL query you write is a tree like this, whether you see it or not.`,
      ],
      callout: { kind: 'insight', text: 'π( σ( users ⋈ orders ) ) — leaves read, the join combines, σ filters, π trims. One tree, evaluated bottom-up.' },
      metrics: { relations: 2, rows: 96, ops: 3 },
      scene: { view: 'tree', note: 'The full tree: π over σ over users ⋈ orders.' },
    },
    { // 5 — recap
      chapter: 'recap', short: 'Why it matters',
      title: 'Why the translation matters',
      body: [
        `Because the plan is <em>algebra</em>, the engine can rewrite it and prove the answer is unchanged. It can push the <b>σ</b> down below the <b>⋈</b> so the join sees far fewer rows, reorder which table it reads first, or swap in an index scan.`,
        `You keep writing plain SQL; the optimizer keeps reshaping the tree for speed. That equivalence — many plans, one answer — is the entire reason databases are built on relational algebra.`,
      ],
      callout: { kind: 'insight', text: 'Algebraic laws let the optimizer rewrite the tree (push σ down, reorder ⋈) for speed without ever changing the result.' },
      metrics: { relations: 2, rows: 96, ops: 3 },
      scene: { view: 'recap', note: 'Same answer, a cheaper tree — the optimizer pushes σ down toward the leaves.' },
    },
  ],
};
