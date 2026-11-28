/* content/null-semantics.js — the "Null Semantics" lesson, as DATA.
   Same shape as the other Modeling Foundations lessons: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/null-semantics-scene.js and
   rendered through the shared course shell on the flat schema canvas. */

export const nullSemanticsLesson = {
  id: 'null-semantics',
  title: 'Null Semantics',
  group: 'Modeling Foundations',
  summary: 'NULL means "unknown or not applicable", not zero. It drives three-valued logic and has sharp edges in keys, comparisons and aggregates — so every column needs a deliberate decision about whether absence is allowed.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['attributes', 'columns', 'constraints', 'integrity'],
  legend: [],
  goals: [
    { text: 'NULL marks a value that is unknown or not applicable', step: 0 },
    { text: 'Comparisons with NULL yield UNKNOWN, not true or false', step: 1 },
    { text: 'A primary key can never be NULL; a NULL foreign key means no link', step: 2 },
    { text: 'NULL has sharp edges in =, NOT IN and aggregates', step: 3 },
    { text: 'IS NULL, COALESCE and NOT NULL are how you handle it', step: 4 },
    { text: 'Decide per column whether NULL is allowed and what it means', step: 5 },
  ],

  steps: [
    { // 0 — WHAT NULL IS
      chapter: 'setup', short: 'What NULL is',
      title: 'NULL is absence, not zero',
      body: [
        `A cell can hold a value — or it can hold <span class="term">NULL</span>, the marker for a value that is <b>unknown</b> or <b>not applicable</b>. A customer who gave no phone number has <code>phone = NULL</code>: we are not recording that their phone is blank, we are recording that we do not know it.`,
        `The crucial point is what NULL is <em>not</em>. It is not <code>0</code>, which is a known quantity. It is not the empty string <code>''</code>, which is a known, present value of length zero. NULL is the absence of any value at all — and treating it as if it were zero or empty is the root of most null-related bugs.`,
      ],
      callout: { kind: 'insight', text: 'NULL is not a value; it is the absence of one. "Unknown" and "not applicable" are both NULL, and neither equals zero or the empty string.' },
      metrics: { attributes: 5, columns: 5, constraints: 0, integrity: 70 },
      scene: { view: 'null', note: 'phone is NULL — unknown, not blank and not zero.' },
    },
    { // 1 — THREE-VALUED LOGIC
      chapter: 'technique', short: 'Three-valued logic',
      title: 'Three-valued logic',
      body: [
        `Ordinary logic has two outcomes: a condition is <b>TRUE</b> or <b>FALSE</b>. Introduce NULL and a third appears — <b>UNKNOWN</b>. Any comparison involving NULL returns UNKNOWN, because you cannot judge a condition about a value you do not have. Even <code>NULL = NULL</code> is UNKNOWN: two unknowns might or might not be equal.`,
        `This <span class="term">three-valued logic</span> ripples through every query. A <code>WHERE</code> clause keeps only rows where the condition is TRUE, so rows that evaluate to UNKNOWN are silently dropped — just as if they had been FALSE. The row is not wrong; the logic simply could not confirm it, and "could not confirm" is treated as "do not include".`,
      ],
      callout: { kind: 'tip', text: 'TRUE, FALSE, UNKNOWN. A WHERE clause returns a row only when its condition is TRUE — UNKNOWN is excluded exactly like FALSE, which is why NULLs quietly vanish from results.' },
      changes: ['~ comparisons → TRUE / FALSE / UNKNOWN', '~ NULL = NULL is UNKNOWN', '~ WHERE keeps only TRUE'],
      metrics: { attributes: 5, columns: 5, constraints: 0, integrity: 70 },
      scene: { view: 'three-valued', note: 'A comparison with NULL yields UNKNOWN — the third truth value.' },
    },
    { // 2 — NULL & KEYS
      chapter: 'technique', short: 'NULL & keys',
      title: 'NULL in keys',
      body: [
        `Keys and NULL have a strict relationship. A primary key can <b>never</b> be NULL — this is <span class="term">entity integrity</span>: an identifier that might be unknown could not reliably name a row, so <code>customer_id</code> must always be present. The primary key is the one place absence is forbidden outright.`,
        `A foreign key is the opposite — it <em>may</em> be NULL, and when it is, it means "no relationship". An <code>order.customer_id</code> of NULL is an order not yet attached to any customer, a draft in the cart. The modeler decides per foreign key whether that is meaningful: make it <code>NOT NULL</code> to demand a link, leave it nullable to allow an orphan.`,
      ],
      callout: { kind: 'insight', text: 'Entity integrity: a primary key is never NULL. A nullable foreign key is a deliberate "optional relationship" — a NULL there means "related to nothing, on purpose".' },
      changes: ['~ PK customer_id → NOT NULL (entity integrity)', '~ FK order.customer_id → nullable = optional link'],
      metrics: { attributes: 6, columns: 6, constraints: 1, integrity: 75 },
      scene: { view: 'keys', note: 'A primary key is never NULL; a NULL foreign key means no relationship yet.' },
    },
    { // 3 — PITFALLS
      chapter: 'tradeoff', short: 'Pitfalls',
      title: 'The sharp edges',
      body: [
        `Three-valued logic produces results that surprise everyone at least once. Writing <code>WHERE phone = NULL</code> matches <b>nothing</b> — the comparison is UNKNOWN for every row, including the NULL ones you meant to find. <code>NOT IN (1, 2, NULL)</code> returns no rows at all, because "not equal to NULL" is itself UNKNOWN and poisons the whole list.`,
        `Aggregates have their own rule: <code>COUNT(col)</code> skips NULLs, so it can be smaller than <code>COUNT(*)</code>, and <code>AVG</code>, <code>SUM</code> and <code>MIN</code> all ignore them too. None of these are bugs in the database — they are the consistent, documented behaviour of NULL — but each is a trap if you assume NULL behaves like an ordinary value.`,
      ],
      callout: { kind: 'warn', text: '= NULL never matches, NOT IN (…NULL…) returns nothing, and COUNT(col) skips NULLs. Each follows from "a comparison with NULL is UNKNOWN".' },
      changes: ['✗ WHERE x = NULL — matches nothing', '✗ NOT IN (…, NULL) — returns nothing', '✗ COUNT(col) — silently skips NULLs'],
      metrics: { attributes: 6, columns: 6, constraints: 1, integrity: 68 },
      scene: { view: 'pitfalls', note: 'Three classic NULL traps: = NULL, NOT IN, and COUNT(col).' },
    },
    { // 4 — HANDLING
      chapter: 'technique', short: 'Handling',
      title: 'Handling NULLs',
      body: [
        `The tools are small and precise. To test for absence you use <code>IS NULL</code> and <code>IS NOT NULL</code>, the operators built for three-valued logic — never <code>=</code>. To substitute a fallback you use <code>COALESCE(col, default)</code>, which returns the first non-NULL argument, turning an unknown into a concrete value exactly where you want one.`,
        `The strongest tool is prevention. A <code>NOT NULL</code> constraint forbids absence in a column where it would be meaningless, and a sensible <b>DEFAULT</b> fills a value at insert time so the NULL never appears. Deciding, column by column, between "absence is allowed and means X" and "absence is forbidden" is the real work of modelling with NULL.`,
      ],
      callout: { kind: 'tip', text: 'IS NULL to test, COALESCE to substitute, NOT NULL + DEFAULT to prevent. Reach for a constraint before a workaround — the cleanest NULL is the one that can never occur.' },
      changes: ['+ NOT NULL on required columns', '+ DEFAULT for insert-time values', '~ IS NULL / COALESCE in queries'],
      metrics: { attributes: 6, columns: 6, constraints: 3, integrity: 88 },
      scene: { view: 'handling', note: 'NOT NULL and DEFAULT constraints keep absence out where it has no meaning.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Model absence deliberately',
      body: [
        `NULL is the model’s word for <b>unknown or not applicable</b>. It brings a third truth value — <b>UNKNOWN</b> — so comparisons against it never match, keys treat it strictly, and aggregates quietly pass it by. None of this is avoidable; all of it is predictable once you stop reading NULL as zero.`,
        `So the modeller decides, for every column, two things: is NULL <em>allowed</em> here, and if so, what does it <em>mean</em>? Forbid it with <code>NOT NULL</code> where absence is nonsense; allow it deliberately where "we don’t know yet" is a real state; and query it with <code>IS NULL</code> and <code>COALESCE</code> rather than operators that will silently lie.`,
      ],
      callout: { kind: 'insight', text: 'Decide per column: is absence allowed, and what does it mean? NULL handled deliberately is a feature; NULL by accident is a bug waiting in every query.' },
      metrics: { attributes: 6, columns: 6, constraints: 3, integrity: 92 },
      scene: { view: 'recap', note: 'Unknown values, three-valued logic, and IS NULL — absence, modelled on purpose.' },
    },
  ],
};
