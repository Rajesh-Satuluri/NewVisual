/* content/relational-algebra.js — the "Relational Algebra" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/relational-algebra-scene.js. Rendered through the shared course shell. */

export const relationalAlgebraLesson = {
  id: 'relational-algebra',
  title: 'Relational Algebra',
  group: 'Foundations',
  summary: 'The handful of operators underneath SQL — each one takes relations in and gives a relation back, so they snap together into whole queries.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['relations', 'rows', 'ops'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Operators are <b>closed</b>: relation(s) in → one relation out', step: 0 },
    { text: 'Select <b>σ</b> filters rows by a condition', step: 1 },
    { text: 'Project <b>π</b> keeps chosen columns (and dedupes)', step: 2 },
    { text: 'Join <b>⋈</b> stitches two relations on a match', step: 3 },
    { text: 'Set ops <b>∪ −</b> combine union-compatible relations', step: 4 },
  ],

  steps: [
    { // 0 — the idea
      chapter: 'technique', short: 'Algebra',
      title: 'An algebra whose values are tables',
      body: [
        `In ordinary algebra you combine <em>numbers</em> with <code>+</code> and <code>×</code>. In <span class="term">relational algebra</span> you combine <em>relations</em> — tables of rows — with a small set of operators: select <b>σ</b>, project <b>π</b>, join <b>⋈</b>, union <b>∪</b>, difference <b>−</b>.`,
        `The key property is that every operator is <span class="term">closed</span>: it takes one or two relations and returns <em>another relation</em>. So the output of one operator is a legal input to the next, and complex questions become a short chain of simple steps.`,
      ],
      callout: { kind: 'insight', text: 'relation(s) in → relation out. Because the result is itself a relation, operators compose without limit — that is the whole trick.' },
      metrics: { relations: 1, rows: 8, ops: 0 },
      scene: { view: 'intro', note: 'A relation goes in, an operator runs, a relation comes out.' },
    },
    { // 1 — select
      chapter: 'technique', short: 'Select σ',
      title: 'σ — keep the rows you want',
      body: [
        `<span class="term">Selection</span> <b>σ<sub>condition</sub>(R)</b> scans relation <code>R</code> and keeps only the rows where the condition is true. Same columns, fewer rows.`,
        `<code>σ<sub>country = 'IN'</sub>(users)</code> throws away everyone outside India and hands back a narrower <em>users</em> relation. This is the algebra behind SQL's <code>WHERE</code>.`,
      ],
      callout: { kind: 'tip', text: 'σ is a row filter. It never changes the shape of a row — it only decides which rows survive.' },
      changes: ['~ rows filtered by condition', '+ same columns', '- non-matching rows dropped'],
      metrics: { relations: 1, rows: 3, ops: 1 },
      scene: { view: 'select', note: 'σ lets only matching rows through.' },
    },
    { // 2 — project
      chapter: 'technique', short: 'Project π',
      title: 'π — keep the columns you want',
      body: [
        `<span class="term">Projection</span> <b>π<sub>cols</sub>(R)</b> keeps only the listed columns and discards the rest. Because a relation is a <em>set</em>, any duplicate rows that result are collapsed to one.`,
        `<code>π<sub>name, email</sub>(users)</code> returns just those two columns. This is the algebra behind the <code>SELECT col, …</code> list.`,
      ],
      callout: { kind: 'tip', text: 'π is a column filter — vertical where σ is horizontal. It can shrink a row to a handful of fields and silently remove duplicates.' },
      changes: ['~ keep listed columns', '- other columns dropped', '~ duplicate rows collapsed'],
      metrics: { relations: 1, rows: 3, ops: 2 },
      scene: { view: 'project', note: 'π slices columns away, leaving a narrower relation.' },
    },
    { // 3 — join
      chapter: 'technique', short: 'Join ⋈',
      title: '⋈ — stitch two relations together',
      body: [
        `<span class="term">Join</span> <b>R ⋈<sub>cond</sub> S</b> pairs each row of <code>R</code> with the rows of <code>S</code> that satisfy the condition, producing one <em>wider</em> relation with the columns of both.`,
        `<code>users ⋈<sub>users.id = orders.user_id</sub> orders</code> glues every order onto its customer. Joins are how the relational model follows a <span class="term">foreign key</span> without you writing a loop.`,
      ],
      callout: { kind: 'insight', text: 'A join is a filtered cross-product: match rows on a condition, concatenate the matches. It is the most expensive — and most powerful — operator.' },
      changes: ['+ two relations combined', '+ wider rows (both column sets)', '~ matched on the join condition'],
      metrics: { relations: 2, rows: 5, ops: 3 },
      scene: { view: 'join', note: 'Two relations meet at ⋈ and leave as one.' },
    },
    { // 4 — set ops
      chapter: 'technique', short: 'Set ops',
      title: '∪ and − — relations are sets',
      body: [
        `Because relations are sets of rows, the classic set operators apply directly. <b>R ∪ S</b> is every row in either; <b>R − S</b> is the rows in <code>R</code> that are <em>not</em> in <code>S</code>; intersection falls out as <code>R − (R − S)</code>.`,
        `The one rule: both sides must be <span class="term">union-compatible</span> — the same columns, in the same order, with the same types. You cannot union <em>users</em> with <em>orders</em>.`,
      ],
      callout: { kind: 'tip', text: '∪ merges and de-duplicates; − subtracts. Both demand identical column shapes on the left and the right.' },
      changes: ['+ combine two union-compatible relations', '~ ∪ merges, − subtracts', '+ result is still a set'],
      metrics: { relations: 2, rows: 6, ops: 4 },
      scene: { view: 'setops', note: 'Same-shaped relations combine with ∪ and −.' },
    },
    { // 5 — recap
      chapter: 'recap', short: 'Compose',
      title: 'A query is a tree of operators',
      body: [
        `Stack the operators and a real query appears. <code>π<sub>name</sub>( σ<sub>total &gt; 100</sub>( users ⋈ orders ) )</code> reads bottom-up: join the two tables, filter the big orders, keep just the name.`,
        `This tree is exactly what a database builds from your SQL — and exactly what the <b>query optimizer</b> rewrites (pushing σ below ⋈, reordering joins) to find a cheaper tree that returns the same relation.`,
      ],
      callout: { kind: 'insight', text: 'σ π ⋈ ∪ −. Every SQL statement compiles to a tree of these, and every optimization is an equivalent re-shaping of that tree.' },
      metrics: { relations: 2, rows: 2, ops: 3 },
      scene: { view: 'recap', note: 'Operators compose bottom-up into one query tree.' },
    },
  ],
};
