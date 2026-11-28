/* content/bcnf.js — the "Boyce–Codd Normal Form" lesson, as DATA.
   Same shape as content/data-model-basics.js: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/bcnf-scene.js and rendered through the shared course shell.

   CONCEPTUAL lesson — the third rung of the normalization ladder
   (…2NF → 3NF → BCNF → 4NF/5NF). It closes the one edge case 3NF leaves open:
   overlapping candidate keys with a non-key determinant. */

export const bcnfLesson = {
  id: 'bcnf',
  title: 'Boyce–Codd Normal Form',
  group: 'ER & Relational Design',
  summary: 'BCNF is a stricter 3NF — every determinant must be a candidate key — closing an edge case that 3NF leaves open when candidate keys overlap.',
  minutes: 8,
  level: 'advanced',
  metrics: ['normalForm', 'redundancy', 'anomalies', 'constraints'],
  legend: [],
  goals: [
    { text: 'A 3NF table can still carry redundancy when candidate keys overlap', step: 0 },
    { text: 'The flaw is a determinant that is not itself a candidate key', step: 1 },
    { text: 'The BCNF rule: every determinant must be a candidate key', step: 2 },
    { text: 'Decompose so the offending determinant becomes a table key', step: 3 },
    { text: 'BCNF can cost dependency preservation — a real tradeoff', step: 4 },
    { text: 'Every determinant is a key; the last anomaly is gone', step: 5 },
  ],

  steps: [
    { // 0 — SETUP
      chapter: 'setup', short: '3NF can still hurt',
      title: 'When 3NF is not enough',
      body: [
        `3NF handles almost everything, but it leaves one door ajar. Consider a <code>teaching</code> table of <code>(student, course, instructor)</code> under two rules: a student takes a course from exactly one instructor, and — the twist — <b>each instructor teaches exactly one course</b>. So <code>instructor → course</code>.`,
        `Find the <span class="term">candidate keys</span>. Since one instructor means one course, <code>(student, instructor)</code> is unique. And since a student’s course fixes their instructor, <code>(student, course)</code> is unique too. The table has <em>two overlapping candidate keys</em> that share <code>student</code>. Every attribute is part of some key, so technically — surprisingly — this table is already in 3NF.`,
      ],
      callout: { kind: 'insight', text: 'When candidate keys overlap, 3NF’s “depend on nothing but the key” can be satisfied while a smaller determinant still rules a column. That gap is where BCNF lives.' },
      metrics: { normalForm: '3NF', redundancy: 46, anomalies: 2, constraints: 2 },
      scene: { view: 'table', note: 'teaching(student, course, instructor): overlapping candidate keys (student,course) and (student,instructor).' },
    },
    { // 1 — PROBLEM
      chapter: 'problem', short: 'A non-key determinant',
      title: 'A determinant that is not a candidate key',
      body: [
        `The functional dependency <code>instructor → course</code> is the trouble. <code>instructor</code> <em>determines</em> <code>course</code>, yet <code>instructor</code> on its own is <b>not a candidate key</b> — it cannot identify a row, because the same instructor appears against many students. A non-key determinant has slipped past 3NF.`,
        `The consequence is familiar: the pair “Prof. Lang teaches Databases” is re-stored on <em>every student row</em> she teaches. Reassign her to a different course and you must rewrite all of them (<span class="term">update anomaly</span>); you cannot record which course a new instructor will teach until a student enrols (<em>insert anomaly</em>); drop the last student and the fact vanishes (<em>delete anomaly</em>). 3NF called this table clean — it is not.`,
      ],
      callout: { kind: 'warn', text: 'instructor → course, but instructor is not a candidate key. The determinant on the left of the arrow does not identify the row, so its fact repeats and can drift.' },
      changes: ['~ (instructor, course) pair repeated per student', '! instructor determines course but is no key'],
      metrics: { normalForm: '3NF', redundancy: 58, anomalies: 3, constraints: 2 },
      scene: { view: 'problem', note: 'instructor → course, but instructor is not a candidate key — the determinant is the defect.' },
    },
    { // 2 — TECHNIQUE (the rule)
      chapter: 'technique', short: 'The BCNF rule',
      title: 'Every determinant is a candidate key',
      body: [
        `Boyce–Codd Normal Form states the rule 3NF almost reaches: for <em>every</em> non-trivial functional dependency <code>X → Y</code> in the table, <code>X</code> must be a <span class="term">superkey</span> — it must be able to identify a row on its own. Put plainly: <b>every determinant must be a candidate key</b>.`,
        `Test our table against it. <code>(student, course) →</code> everything — fine, that is a key. But <code>instructor → course</code> — and <code>instructor</code> is <em>not</em> a key. One dependency fails, so the table fails BCNF. BCNF is strictly stronger than 3NF: every BCNF table is in 3NF, but not the reverse. The two diverge only in exactly this situation — a determinant that is not a key.`,
      ],
      callout: { kind: 'tip', text: 'BCNF has no exceptions for prime attributes. If the left side of any dependency is not a candidate key, the table is not in BCNF — full stop.' },
      metrics: { normalForm: '3NF', redundancy: 58, anomalies: 3, constraints: 2 },
      scene: { view: 'rule', note: 'BCNF: for every X → Y, X must be a candidate key. (student,course) passes; instructor fails.' },
    },
    { // 3 — TECHNIQUE (decompose)
      chapter: 'technique', short: 'Decompose',
      title: 'Split so the determinant becomes a key',
      body: [
        `Decompose on the offending dependency. Give <code>instructor → course</code> its own table — <code>teaches(instructor, course)</code> keyed on <code>instructor</code>, so the determinant is now a <b>candidate key</b> exactly as BCNF demands. What remains is <code>enrolment(student, instructor)</code>, recording who learns from whom.`,
        `Each instructor’s course is now stored once, in <code>teaches</code>; reassigning it is a single-row update, and no student row can contradict it. The two tables rejoin on <code>instructor</code>, a <b>foreign key</b> from <code>enrolment</code> into <code>teaches</code>. Both tables are now in BCNF: every determinant in each is a candidate key.`,
      ],
      callout: { kind: 'insight', text: 'Decomposition is lossless — the join on instructor rebuilds every original (student, course, instructor) row — so the split costs nothing but the redundancy.' },
      changes: ['+ teaches(instructor PK, course)', '+ enrolment(student, instructor) — FK → teaches', '~ instructor is now a key'],
      metrics: { normalForm: 'BCNF', redundancy: 6, anomalies: 0, constraints: 3 },
      scene: { view: 'bcnf', note: 'teaches(instructor → course) and enrolment(student, instructor), joined by the FK on instructor.' },
    },
    { // 4 — TRADEOFF
      chapter: 'tradeoff', short: 'BCNF vs 3NF',
      title: 'The dependency-preservation tradeoff',
      body: [
        `BCNF is not free. Our split lost the ability to <em>enforce</em> one original constraint with a single table: the rule that <code>(student, course)</code> determines <code>instructor</code> now spans <b>both</b> tables, so a plain foreign key can no longer guarantee it — you would need a cross-table assertion or application check. This is the famous <span class="term">dependency-preservation</span> problem.`,
        `The theorem behind it: a lossless, dependency-preserving decomposition into 3NF <em>always</em> exists, but into BCNF it sometimes does <b>not</b>. When those two goals collide, many designers deliberately <b>stop at 3NF</b>, accepting a little redundancy to keep every functional dependency checkable inside one table. BCNF is the stricter ideal; 3NF is often the practical compromise.`,
      ],
      callout: { kind: 'warn', text: 'Full normalization is not always achievable and checkable at once. Choosing 3NF over BCNF to preserve a dependency is a deliberate, defensible engineering call.' },
      metrics: { normalForm: 'BCNF', redundancy: 6, anomalies: 0, constraints: 3 },
      scene: { view: 'tradeoff', note: 'BCNF removes the last redundancy but may not preserve every dependency — sometimes 3NF is kept on purpose.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Determinants must be keys',
      body: [
        `Boyce–Codd Normal Form sharpens 3NF to a single clean test: <b>every determinant is a candidate key</b>. It matters only in the narrow case where candidate keys overlap and a smaller, non-key determinant sneaks a repeated fact into the table. Spot that determinant, give it its own table where it becomes the key, and the last update, insert and delete anomalies disappear.`,
        `Weigh it against dependency preservation: BCNF is strictly stronger, but a 3NF design that keeps every constraint checkable in one table is sometimes the wiser stop. Either way, 3NF and BCNF both assume one clean functional dependency per column. The next lesson, <b>4NF &amp; 5NF</b>, turns to a different beast — <em>multiple independent</em> many-to-many facts crammed into a single table.`,
      ],
      callout: { kind: 'insight', text: 'Every determinant a key — BCNF in three words. Stronger than 3NF, and worth it unless it costs you a dependency you must enforce.' },
      metrics: { normalForm: 'BCNF', redundancy: 6, anomalies: 0, constraints: 3 },
      scene: { view: 'recap', note: 'teaches and enrolment, every determinant now a candidate key — BCNF reached.' },
    },
  ],
};
