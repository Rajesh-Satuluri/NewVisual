/* content/functional-dependencies.js — "Functional Dependencies", as DATA.
   Same shape as the other Data Modeling lessons: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/functional-dependencies-scene.js.

   This is the THEORY lesson that normalization rests on: an FD X → Y says X
   determines Y, a key is just an attribute set that determines everything, and
   every normal form turns out to be one rule about which FDs are allowed. */

export const functionalDependenciesLesson = {
  id: 'functional-dependencies',
  title: 'Functional Dependencies',
  group: 'ER & Relational Design',
  summary: 'A functional dependency X → Y means X determines Y: fix the value of X and the value of Y is settled. FDs are the theory normalization rests on, and a key is simply an attribute set that determines every other attribute.',
  minutes: 9,
  level: 'advanced',
  metrics: ['attributes', 'columns', 'constraints', 'relations'],
  legend: [],
  goals: [
    { text: 'A functional dependency X → Y means X determines Y', step: 0 },
    { text: 'A key is an attribute set that determines every attribute', step: 1 },
    { text: 'Partial and transitive dependencies are the villains of 2NF and 3NF', step: 2 },
    { text: 'Attribute closure finds the candidate keys', step: 3 },
    { text: 'Every normal form is a rule about which FDs are allowed', step: 4 },
    { text: 'FDs are the grammar the whole ladder is written in', step: 5 },
  ],

  steps: [
    { // 0 — X → Y
      chapter: 'setup', short: 'X → Y',
      title: 'X determines Y',
      body: [
        `Normalization is usually taught as a checklist of "normal forms", but underneath it is one precise idea. A <span class="term">functional dependency</span>, written <code>X → Y</code>, says that <b>X determines Y</b>: any two rows that agree on <code>X</code> must also agree on <code>Y</code>. Fix the value on the left and the value on the right is settled — there is no freedom left.`,
        `In a <code>Customer</code> table, <code>customer_id → {name, email}</code>: once you know the id, the name and email are decided. The arrow is not about this one table of rows — it is a <em>rule about the data for all time</em>, a statement of how the real world works. Every later rung of the ladder is just a constraint on which arrows are allowed to exist.`,
      ],
      callout: { kind: 'insight', text: 'X → Y: rows that share X must share Y. It is a rule about every possible row, not an accident of the rows you happen to have today.' },
      metrics: { attributes: 3, columns: 3, constraints: 1, relations: 1 },
      scene: { view: 'fd', note: 'customer_id → {name, email} — the determinant on the left settles the attributes on the right.' },
    },
    { // 1 — KEYS ARE FDS
      chapter: 'technique', short: 'Keys are FDs',
      title: 'A key determines every attribute',
      body: [
        `A <span class="term">key</span> is nothing more exotic than a functional dependency with a special right-hand side. An attribute set <code>K</code> is a <b>superkey</b> when <code>K →</code> <em>every</em> other attribute of the table — knowing <code>K</code> settles the entire row. A <span class="term">candidate key</span> is a superkey with nothing to spare: drop any attribute and it stops determining the rest.`,
        `So <code>customer_id → {name, email, signup_date}</code> is exactly the statement "<code>customer_id</code> is a key". This is the hinge of the whole topic: once you see keys as FDs, the normal forms stop being arbitrary and become statements about how the <em>other</em> FDs line up against the key.`,
      ],
      callout: { kind: 'tip', text: 'Superkey: determines the whole row. Candidate key: a minimal superkey. The primary key is just the candidate key you chose to name.' },
      changes: ['~ customer_id → all attributes', '+ superkey · candidate key'],
      metrics: { attributes: 4, columns: 4, constraints: 1, relations: 1 },
      scene: { view: 'key-fd', note: 'customer_id fans out to every attribute — that is what "key" means.' },
    },
    { // 2 — PARTIAL & TRANSITIVE
      chapter: 'technique', short: 'Partial & transitive',
      title: 'Partial and transitive dependencies',
      body: [
        `Two shapes of FD cause all the trouble, and both appear the moment a table has more structure than a single-column key. A <span class="term">partial dependency</span> is when a non-key attribute depends on only <em>part</em> of a composite key: in <code>enrollments(student_id, course_id)</code>, <code>course_title</code> depends on <code>course_id</code> alone, not on the pair.`,
        `A <span class="term">transitive dependency</span> is when a non-key attribute depends on the key only <em>through another non-key attribute</em>: the key gives you <code>instructor</code>, and <code>instructor</code> gives you <code>instructor_email</code>, so <code>key → instructor → instructor_email</code>. Each shape means a fact is stored against the wrong thing, which is why the same fact ends up copied across many rows. These two villains are precisely what <b>2NF</b> and <b>3NF</b> exist to kill.`,
      ],
      callout: { kind: 'warn', text: 'Partial: depends on part of a composite key. Transitive: depends via a non-key attribute. Every redundancy you will ever remove is one of these two.' },
      changes: ['! course_title ← course_id only (partial)', '! instructor_email ← instructor (transitive)'],
      metrics: { attributes: 6, columns: 6, constraints: 3, relations: 1 },
      scene: { view: 'partial-transitive', note: 'course_title depends on part of the key; instructor_email depends via a non-key — the two villains.' },
    },
    { // 3 — CLOSURE
      chapter: 'technique', short: 'Closure',
      title: 'Closure and candidate keys',
      body: [
        `How do you actually <em>find</em> the keys of a table, given a set of FDs? You compute an <span class="term">attribute closure</span>. Start with the attributes you hold, then repeatedly apply any FD whose left side you already have, adding its right side — until nothing new appears. The result, written <code>{X}<sup>+</sup></code>, is everything <code>X</code> can determine.`,
        `If <code>{X}<sup>+</sup></code> is the whole set of attributes, then <code>X</code> is a superkey; if no proper subset of <code>X</code> has that property, <code>X</code> is a <span class="term">candidate key</span>. Given <code>A → B</code>, <code>B → C</code>, <code>C → D</code>, the closure <code>{A}<sup>+</sup> = {A, B, C, D}</code> reaches every attribute, so <code>A</code> alone is a candidate key. Closure is the one mechanical procedure the whole theory runs on.`,
      ],
      callout: { kind: 'tip', text: 'Closure algorithm: seed with X, keep applying FDs whose left side you already own. If you reach every attribute, X is a key.' },
      changes: ['+ compute {A}⁺ = {A, B, C, D}', '~ A is a candidate key'],
      metrics: { attributes: 6, columns: 6, constraints: 3, relations: 1 },
      scene: { view: 'closure', note: 'Apply A→B, B→C, C→D in turn: {A}⁺ grows to cover everything, so A is a candidate key.' },
    },
    { // 4 — WHY THEY MATTER
      chapter: 'tradeoff', short: 'Why they matter',
      title: 'Every normal form is an FD rule',
      body: [
        `Here is the payoff that makes the next lessons easy. Each normal form in the ladder is a single, crisp statement about functional dependencies — nothing more. <b>2NF</b>: no non-key attribute depends on part of a key (no partial dependencies). <b>3NF</b>: no non-key attribute depends on the key through another non-key attribute (no transitive dependencies).`,
        `<b>BCNF</b> is the clean limit: for <em>every</em> functional dependency <code>X → Y</code> that holds, <code>X</code> must be a superkey — every determinant is a key. Read that way, normalizing a table is just chasing down FDs whose left side is not a key and splitting them out until only key-determined FDs remain. The forms are not a ritual; they are four tightenings of one rule.`,
      ],
      callout: { kind: 'insight', text: 'BCNF in one line: the left side of every FD must be a key. 2NF and 3NF are weaker, more forgiving versions of that same demand.' },
      metrics: { attributes: 6, columns: 6, constraints: 3, relations: 1 },
      scene: { view: 'why', note: '2NF = no partial · 3NF = no transitive · BCNF = every determinant is a key.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'FDs are the grammar of normalization',
      body: [
        `Four ideas carry the rest of the ladder. An FD <code>X → Y</code> is a rule that <code>X</code> determines <code>Y</code>. A <b>key</b> is an attribute set that determines the whole row. <b>Partial</b> and <b>transitive</b> dependencies are the two ways a fact ends up stored against the wrong thing. And <b>closure</b> is the procedure that tells you what determines what.`,
        `Keep this grammar in hand and 1NF, 2NF, 3NF and BCNF stop being a list to memorize and become a single question asked with rising strictness: <em>does every attribute depend on the key, the whole key, and nothing but the key?</em> Each lesson that follows answers one clause of it.`,
      ],
      callout: { kind: 'insight', text: 'Determines · key · partial · transitive · closure — learn the grammar once and every normal form reads as one short sentence in it.' },
      metrics: { attributes: 6, columns: 6, constraints: 3, relations: 1 },
      scene: { view: 'recap', note: 'The four pieces — determines, keys, the two villains, closure — that the whole ladder is written from.' },
    },
  ],
};
