/* content/higher-normal-forms.js — the "4NF & 5NF" lesson, as DATA.
   Same shape as content/data-model-basics.js: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/higher-normal-forms-scene.js and rendered through the shared
   course shell.

   CONCEPTUAL lesson — the final rung of the normalization ladder
   (…2NF → 3NF → BCNF → 4NF/5NF). Where 3NF/BCNF assume one functional
   dependency per column, these forms address MULTIPLE independent many-to-many
   facts crammed into a single table. */

export const higherNormalFormsLesson = {
  id: 'higher-normal-forms',
  title: '4NF & 5NF',
  group: 'ER & Relational Design',
  summary: '4NF removes multivalued dependencies and 5NF removes join dependencies — the forms for independent many-to-many facts crammed into one table.',
  minutes: 8,
  level: 'advanced',
  metrics: ['normalForm', 'redundancy', 'anomalies', 'relations'],
  legend: [],
  goals: [
    { text: 'Two independent many-to-many facts in one table multiply each other', step: 0 },
    { text: 'A multivalued dependency forces a spurious cartesian product', step: 1 },
    { text: '4NF separates independent multivalued facts into their own tables', step: 2 },
    { text: '5NF decomposes a join dependency three binary tables can rebuild', step: 3 },
    { text: 'These forms are rare — most schemas stop at 3NF or BCNF', step: 4 },
    { text: '4NF and 5NF are the forms for independent M:N facts', step: 5 },
  ],

  steps: [
    { // 0 — SETUP
      chapter: 'setup', short: 'Independent multi-values',
      title: 'Two independent facts in one table',
      body: [
        `3NF and BCNF each assume a column is governed by one functional dependency. But what if a key owns <em>two</em> independent lists? Here is <code>person_skills_languages</code>: for each <code>person</code> it records both the <span class="term">skills</span> they have and the <span class="term">languages</span> they speak. Both are genuine many-to-many facts — one person has many skills <b>and</b> many languages.`,
        `Crucially, the two are <em>unrelated</em>: knowing someone is fluent in French tells you nothing about whether they can weld. Yet to store them in one flat table you are forced to pair <b>every</b> skill against <b>every</b> language. A welder who speaks French and German and also does plumbing already needs <code>2 × 2 = 4</code> rows to say four independent things.`,
      ],
      callout: { kind: 'insight', text: 'One key, two independent multivalued facts. A flat table cannot hold them side by side without inventing pairings that were never real.' },
      metrics: { normalForm: 'BCNF', redundancy: 68, anomalies: 3, relations: 1 },
      scene: { view: 'table', note: 'person_skills_languages: two independent M:N facts — skills and languages — in one table.' },
    },
    { // 1 — PROBLEM
      chapter: 'problem', short: 'Multivalued dependency',
      title: 'A spurious cartesian product',
      body: [
        `This is a <span class="term">multivalued dependency</span>, written <code>person &#8674;&#8674; skill</code> and <code>person &#8674;&#8674; language</code>: the person determines a <em>set</em> of skills independently of a set of languages. Forced into one table, the row count explodes to the <b>cartesian product</b> — skills × languages — and each real fact is duplicated across the opposing dimension.`,
        `The anomalies are brutal. Add one new language and you must insert a row for <em>every</em> skill the person has, or the table quietly implies that skill does not apply to that language. Delete carelessly and you wipe out an unrelated fact. The redundancy is not a repeated value this time — it is a repeated <em>combination</em> that never meant anything.`,
      ],
      callout: { kind: 'warn', text: 'The row count is skills × languages, but the information is only skills + languages. Every extra row is a pairing the business never asserted.' },
      changes: ['~ rows = skills × languages (cartesian)', '! add 1 language → insert a row per skill'],
      metrics: { normalForm: 'BCNF', redundancy: 82, anomalies: 3, relations: 1 },
      scene: { view: 'mvd', note: 'Every skill paired with every language — the row count explodes to the cartesian product.' },
    },
    { // 2 — TECHNIQUE (4NF)
      chapter: 'technique', short: '4NF',
      title: 'Separate independent multivalued facts',
      body: [
        `Fourth normal form says it plainly: a table may carry at most <b>one</b> non-trivial multivalued dependency about its key. The cure is to split the two lists into their own tables — <code>person_skills(person, skill)</code> and <code>person_languages(person, language)</code> — each a clean many-to-many <span class="term">relation</span> on its own.`,
        `Now adding a language is <em>one</em> row in <code>person_languages</code>, untouched by how many skills the person has; the cartesian explosion is gone and the row count drops to skills <b>+</b> languages. The two tables share only the <code>person</code> key and are rejoined through it when a query genuinely needs both — which, being independent facts, it rarely does. This is <span class="term">fourth normal form</span>.`,
      ],
      callout: { kind: 'tip', text: '4NF: one multivalued fact per table. Independent lists get independent tables, joined back only through the shared key.' },
      changes: ['+ person_skills(person, skill)', '+ person_languages(person, language)', '~ rows: skills + languages, not ×'],
      metrics: { normalForm: '4NF', redundancy: 7, anomalies: 0, relations: 2 },
      scene: { view: '4nf', note: 'Split into person_skills and person_languages — two independent M:N relations.' },
    },
    { // 3 — TECHNIQUE (5NF)
      chapter: 'technique', short: '5NF',
      title: 'Join dependencies (PJ/NF)',
      body: [
        `Fifth normal form — also called <span class="term">project-join normal form</span> — handles the rarest case: a <span class="term">join dependency</span> that no single two-way split can express. Picture a three-way rule among <code>supplier</code>, <code>part</code> and <code>project</code>: a supplier supplies certain parts, works certain projects, and projects use certain parts — three independent binary facts.`,
        `Store all three in one <code>(supplier, part, project)</code> table and re-joining any two of its projections can manufacture <b>phantom rows</b> — combinations that satisfy each pair yet were never true together. 5NF decomposes it into the <em>three</em> binary tables — <code>supplier_part</code>, <code>supplier_project</code>, <code>part_project</code> — chosen so their natural join rebuilds exactly the original rows and <b>no spurious ones</b>. That is a <span class="term">lossless join</span>.`,
      ],
      callout: { kind: 'insight', text: 'A join dependency means the whole is the join of its parts. 5NF finds the set of binary tables whose join is lossless — reconstructing the original with no phantom rows.' },
      changes: ['+ supplier_part · supplier_project · part_project', '~ natural join rebuilds the original losslessly'],
      metrics: { normalForm: '5NF', redundancy: 3, anomalies: 0, relations: 3 },
      scene: { view: '5nf', note: 'A three-way relationship decomposed into three binary tables — a lossless join, no phantom rows.' },
    },
    { // 4 — TRADEOFF
      chapter: 'tradeoff', short: 'Rare in practice',
      title: 'Most schemas stop at 3NF/BCNF',
      body: [
        `These forms are real and occasionally decisive, but genuine 4NF and 5NF violations are <b>uncommon</b>. A table in BCNF breaks 4NF only when it crams two truly independent multivalued facts together — and a good entity-relationship design usually gives each many-to-many relationship its own join table from the start, landing you in 4NF without ever naming it.`,
        `5NF violations are rarer still, hinging on three-way join dependencies that most schemas never produce. So the working rule stands: <b>normalize to 3NF, verify BCNF, and reach for 4NF/5NF only when a specific anomaly demands it</b>. Knowing they exist is what lets you recognise the pathology — the cartesian blow-up, the phantom join — when it finally appears.`,
      ],
      callout: { kind: 'tip', text: 'Model each many-to-many relationship as its own table and you usually get 4NF for free. Treat 5NF as a diagnosis, not a routine step.' },
      metrics: { normalForm: '5NF', redundancy: 3, anomalies: 0, relations: 3 },
      scene: { view: 'rare', note: 'The ladder: UNF → 1NF → 2NF → 3NF → BCNF → 4NF → 5NF. Most schemas stop at 3NF/BCNF.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'The forms for independent M:N facts',
      body: [
        `Where 3NF and BCNF police functional dependencies — one value per determinant — 4NF and 5NF police <em>set-valued</em> ones. <b>4NF</b> removes the multivalued dependency: independent many-to-many lists get separate tables, so the row count becomes a sum, not a product. <b>5NF</b> removes the join dependency: a three-way relationship splits into the binary tables whose lossless join rebuilds it exactly.`,
        `Together they complete the ladder — <code>UNF → 1NF → 2NF → 3NF → BCNF → 4NF → 5NF</code> — each rung removing one more kind of redundancy. In day-to-day design you will live at 3NF and BCNF, but when a flat table starts multiplying unrelated facts into a cartesian mess, you now know the names of the forms that take it apart.`,
      ],
      callout: { kind: 'insight', text: 'Functional dependencies end at BCNF; 4NF and 5NF handle the independent many-to-many facts that a flat table can only store as a product.' },
      metrics: { normalForm: '5NF', redundancy: 3, anomalies: 0, relations: 3 },
      scene: { view: 'recap', note: 'Independent M:N facts, each in its own relation — 4NF and 5NF complete the ladder.' },
    },
  ],
};
