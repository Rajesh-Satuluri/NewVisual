/* content/associative-entities.js — the "Associative Entities" lesson, as DATA.
   Same shape as every db-scale lesson: each step is { chapter, short, title,
   body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/associative-entities-scene.js and rendered through the shared
   course shell. This lesson covers the moment a many-to-many relationship grows
   attributes and becomes an entity of its own. */

export const associativeEntitiesLesson = {
  id: 'associative-entities',
  title: 'Associative Entities',
  group: 'ER & Relational Design',
  summary: 'When a many-to-many relationship carries its own attributes it becomes an entity in its own right — an associative (junction) entity.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['entities', 'relations', 'fks', 'attributes'],
  legend: [],
  goals: [
    { text: 'A many-to-many relationship can carry its own data', step: 0 },
    { text: 'Promote the relationship to an entity to hold that data', step: 1 },
    { text: 'The pair of foreign keys is its identifying key', step: 2 },
    { text: 'An associative entity can have relationships of its own', step: 3 },
    { text: 'Model it fully when it has its own identity and lifecycle', step: 4 },
    { text: 'M:N plus attributes equals an entity', step: 5 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'setup', short: 'M:N with data',
      title: 'A relationship that carries data',
      body: [
        `A <code>Student</code> enrols in many <code>Course</code>s and a <code>Course</code> holds many students — a plain <span class="term">many-to-many</span> relationship. So far the join needs only the two keys that pair them. But enrolment has facts of its own: the <code>grade</code> earned and the <code>enrolled_at</code> date.`,
        `Where do those facts live? Not on <code>Student</code> — a student has many grades, one per course. Not on <code>Course</code> — a course issues many grades, one per student. The grade belongs to the <em>pairing</em>, not to either side. A relationship line has nowhere to put an attribute, and that is the problem this lesson solves.`,
      ],
      callout: { kind: 'warn', text: 'A fact that depends on both sides at once — like a grade — cannot live on either entity. The relationship itself needs somewhere to store it.' },
      metrics: { entities: 2, relations: 1, fks: 0, attributes: 0 },
      scene: { view: 'problem', note: 'Student N:M Course — but the grade and date belong to neither side.' },
    },
    { // 1 — PROMOTE
      chapter: 'technique', short: 'Promote it',
      title: 'Promote the relationship to an entity',
      body: [
        `The fix is to make the relationship a thing. An <span class="term">associative entity</span> — also called a junction or link entity — is a relationship promoted to an entity so it can carry attributes. The <code>Student</code>–<code>Course</code> line becomes an <code>Enrollment</code> box sitting between them.`,
        `<code>Enrollment</code> now holds <code>grade</code> and <code>enrolled_at</code> as ordinary attributes, and connects to both originals. The single many-to-many line splits into two one-to-many relationships: one <code>Student</code> has many enrolments, one <code>Course</code> has many enrolments. The data finally has a home.`,
      ],
      callout: { kind: 'insight', text: 'An associative entity is a relationship with attributes. Promote the line to a box and the M:N becomes two 1:N edges.' },
      changes: ['+ Enrollment entity', '+ attributes grade · enrolled_at', '~ M:N becomes two 1:N relationships'],
      metrics: { entities: 3, relations: 2, fks: 2, attributes: 2 },
      scene: { view: 'promote', note: 'Enrollment appears between Student and Course, holding grade and enrolled_at.' },
    },
    { // 2 — COMPOSITE KEY
      chapter: 'technique', short: 'Composite key',
      title: 'Its key identifies the pairing',
      body: [
        `What identifies one enrolment? The pair of foreign keys it carries: <code>(student_id, course_id)</code>. Together they are a <span class="term">composite primary key</span>, and that choice has meaning — it says a given student may enrol in a given course exactly once.`,
        `The alternative is a <span class="term">surrogate key</span>: a fresh <code>enrollment_id</code> as the primary key, with a separate <code>UNIQUE(student_id, course_id)</code> constraint to keep the no-duplicates rule. Prefer the composite key when the pairing truly is unique; reach for a surrogate when the row needs a stable single-column identity for other tables to reference.`,
      ],
      callout: { kind: 'tip', text: 'Composite PK (student_id, course_id) enforces one enrolment per pair. A surrogate id keeps the same rule as a UNIQUE constraint.' },
      changes: ['~ PRIMARY KEY (student_id, course_id)', '~ or surrogate enrollment_id + UNIQUE pair'],
      metrics: { entities: 3, relations: 2, fks: 2, attributes: 2 },
      scene: { view: 'key', note: 'The pair (student_id, course_id) is the composite key — one enrolment per pairing.' },
    },
    { // 3 — OWN RELATIONSHIPS
      chapter: 'technique', short: 'Own relationships',
      title: 'An associative entity has its own relationships',
      body: [
        `Once it is a real entity, an associative entity is not limited to the two it joins. It can take part in further relationships, exactly like any other box. An <code>Enrollment</code> might generate <code>Payment</code>s, or accumulate a <code>GradeHistory</code> of every change to the mark.`,
        `This is the signal that the promotion was the right call. A plain junction table that will only ever hold two keys could almost be an implementation detail; one that sprouts its own relationships, attributes and rules is unmistakably an entity, and treating it as one keeps the model honest.`,
      ],
      callout: { kind: 'insight', text: 'When the junction starts pointing outward — to payments, to history — it has stopped being a link and become an entity.' },
      changes: ['+ Payment entity', '+ FK payment.enrollment_id → enrollment', '~ the junction now has edges of its own'],
      metrics: { entities: 4, relations: 3, fks: 3, attributes: 3 },
      scene: { view: 'relates', note: 'Enrollment grows a relationship of its own — out to Payment.' },
    },
    { // 4 — ENTITY OR LINK?
      chapter: 'tradeoff', short: 'Entity or link?',
      title: 'When it is truly an entity',
      body: [
        `Not every many-to-many needs promoting. If the junction holds nothing but two foreign keys and never will, a bare link table is enough — modelling it as a full entity adds ceremony for no gain. The test is whether the pairing has an <em>identity</em> and a <em>lifecycle</em> of its own.`,
        `An enrolment is created, graded, perhaps withdrawn, and it generates payments along the way — it clearly lives and changes independently of the student and the course. That is a genuine associative entity. A plain tags-on-posts link, which only exists or does not, is not. Model fully what has a life; keep thin what is only a connection.`,
      ],
      callout: { kind: 'tip', text: 'Ask: does the pairing have its own identity and lifecycle? Yes → a full associative entity. No → a thin link table is enough.' },
      changes: ['~ lifecycle: created → graded → withdrawn', '~ identity test decides entity vs link'],
      metrics: { entities: 4, relations: 3, fks: 3, attributes: 3 },
      scene: { view: 'lifecycle', note: 'Enrollment has its own lifecycle — that is what makes it an entity.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'M:N + attributes = an entity',
      body: [
        `The rule compresses to an equation. A <b>many-to-many relationship</b> plus <b>attributes of its own</b> equals an <b>associative entity</b>: a box between the two originals, carrying the shared facts, keyed by the pair of foreign keys, and free to form relationships of its own.`,
        `Spot it whenever a join needs to remember something — a grade, a quantity, a role, a start date. Promote the line to a box, give it the composite key, and the model can hold facts that belong to a pairing rather than to either end. It is one of the most common moves in real schema design.`,
      ],
      callout: { kind: 'insight', text: 'M:N + attributes → associative entity: a keyed box between the two sides that carries what the pairing owns.' },
      metrics: { entities: 3, relations: 2, fks: 2, attributes: 2 },
      scene: { view: 'recap', note: 'Student–Enrollment–Course — the associative entity, checked off.' },
    },
  ],
};
