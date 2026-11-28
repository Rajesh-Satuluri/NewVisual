/* content/modeling-notations.js — the "Modeling Notations" lesson, as DATA.
   Same shape as the other Data Modeling lessons: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/modeling-notations-scene.js and rendered through the shared
   course shell. One Customer–Order model, drawn three ways. */

export const modelingNotationsLesson = {
  id: 'modeling-notations',
  title: 'Modeling Notations',
  group: 'Modeling Foundations',
  summary: 'The same Customer–Order model drawn in different notations — Chen, crow’s-foot (IE) and UML class — and how to read each. The notation is the pen; the entities, relationships and cardinality are the drawing.',
  minutes: 8,
  level: 'beginner',
  metrics: ['entities', 'relations', 'attributes', 'fks'],
  legend: [],
  goals: [
    { text: 'A model is an idea; a notation is only how you draw it', step: 0 },
    { text: 'Chen notation uses boxes, diamonds and ovals', step: 1 },
    { text: 'Crow’s-foot (IE) notation uses tables with cardinality feet', step: 2 },
    { text: 'UML class notation uses classes with multiplicities', step: 3 },
    { text: 'Each notation fits a different audience', step: 4 },
    { text: 'Entities, relationships and cardinality are the substance', step: 5 },
  ],

  steps: [
    { // 0 — WHY NOTATIONS
      chapter: 'setup', short: 'Why notations',
      title: 'A model is an idea; notation is how you draw it',
      body: [
        `A <span class="term">data model</span> is an idea: a <code>Customer</code> places many <code>Order</code>s, each order belongs to exactly one customer. That idea is independent of how you sketch it. A <span class="term">notation</span> is just the visual language — the shapes and marks — you use to put the idea on a page.`,
        `The same model can be drawn in several notations, and they all say the same thing. In this lesson we take one tiny model — Customer and Order — and redraw it in three common languages: <b>Chen</b>, <b>crow’s-foot</b> and <b>UML class</b>. Learn to read all three and you can read almost any diagram you will meet.`,
      ],
      callout: { kind: 'insight', text: 'Pick the notation for your reader, not for yourself. The underlying entities and relationships never change — only the marks you draw them with.' },
      metrics: { entities: 2, relations: 1, attributes: 6, fks: 1 },
      scene: { view: 'overview', note: 'One model — Customer places Order — before we choose a pen.' },
    },
    { // 1 — CHEN
      chapter: 'technique', short: 'Chen',
      title: 'Chen notation',
      body: [
        `<span class="term">Chen notation</span>, the original ER notation, draws each piece as a distinct shape. <b>Entities are rectangles</b>, <b>relationships are diamonds</b>, and <b>attributes are ovals</b> hung off their owner. Cardinality is written as a number on the edge — <code>1</code> on the customer side, <code>N</code> on the order side.`,
        `Our canvas uses flat cards, so here we <em>approximate</em> Chen: two plain entity boxes with a diamond-shaped <code>places</code> chip between them standing in for the relationship, and <code>1</code> / <code>N</code> on the connecting edges. It is wordy for real databases, but its explicit shapes make it the clearest notation for <b>teaching</b> what each part of a model is.`,
      ],
      callout: { kind: 'tip', text: 'Read a Chen diagram shape by shape: box = entity, diamond = relationship, oval = attribute, number on the line = cardinality.' },
      changes: ['Customer □ places ◇ Order □', '1 on the customer edge, N on the order edge'],
      metrics: { entities: 2, relations: 1, attributes: 6, fks: 1 },
      scene: { view: 'chen', note: 'Chen: rectangles for entities, a diamond for the relationship, 1 and N on the edges.' },
    },
    { // 2 — CROW'S-FOOT
      chapter: 'technique', short: 'Crow’s-foot',
      title: 'Crow’s-foot (IE) notation',
      body: [
        `<span class="term">Crow’s-foot notation</span> — also called Information Engineering (IE) — draws each entity as a <b>table listing its columns</b>, with the primary key marked and foreign keys shown as columns. Cardinality lives at the <em>ends</em> of the line: a single bar means “one”, a splayed <b>crow’s foot</b> means “many”.`,
        `This is the notation <b>this course uses</b>. Here Customer joins to Order with a single bar on the customer end and a crow’s foot on the order end — a clean <code>1:N</code>. Because it shows columns and keys directly, it maps almost one-to-one onto a relational schema, which is exactly why database people reach for it.`,
      ],
      callout: { kind: 'insight', text: 'Crow’s-foot reads at the line ends: bar = one, foot = many. The whole relationship’s cardinality is right there where the line meets each table.' },
      changes: ['Customer |— tables with columns —< Order', 'bar = one · crow’s foot = many'],
      metrics: { entities: 2, relations: 1, attributes: 6, fks: 1 },
      scene: { view: 'crowsfoot', note: 'Crow’s-foot: tables with columns, a 1:N foot joining Customer to Order.' },
    },
    { // 3 — UML
      chapter: 'technique', short: 'UML',
      title: 'UML class notation',
      body: [
        `<span class="term">UML class notation</span> comes from software design, where an entity is a <b>class</b>: a box with its attributes (and, in code, its methods). A relationship is a plain line, and cardinality is written as a <b>multiplicity</b> at each end — <code>1</code>, <code>0..*</code>, <code>1..*</code> — where <code>*</code> means “many”.`,
        `Drawn in UML, our model is a <code>Customer</code> class and an <code>Order</code> class joined by a line carrying <code>1</code> on the customer end and <code>0..*</code> on the order end: a customer has zero or more orders. UML is the natural choice when the model will live beside application code, because developers already think in classes.`,
      ],
      callout: { kind: 'tip', text: 'A UML multiplicity like 0..* packs both bounds into one label: minimum 0, maximum many. Crow’s-foot splits the same information across two marks.' },
      changes: ['Customer class —— Order class', 'multiplicity 1 on Customer, 0..* on Order'],
      metrics: { entities: 2, relations: 1, attributes: 6, fks: 1 },
      scene: { view: 'uml', note: 'UML: classes joined by a line with multiplicities 1 and 0..*.' },
    },
    { // 4 — WHICH TO USE
      chapter: 'tradeoff', short: 'Which to use',
      title: 'Choosing a notation',
      body: [
        `No notation is “correct” — each fits an audience. <b>Chen</b> is verbose but explicit, so it is best for <em>teaching</em> and for whiteboards where you want every entity, relationship and attribute to be its own obvious shape. <b>Crow’s-foot</b> is compact and shows columns and keys, so it is the default for <em>database</em> design and documentation.`,
        `<b>UML</b> speaks the language of <em>software design</em>, so it wins when the model sits inside an object-oriented codebase. The three mini-sketches here show the very same Customer–Order relationship in each notation; the marks differ, the relationship does not. Being fluent in all three means a diagram never slows you down.`,
      ],
      callout: { kind: 'warn', text: 'Mixing notations in one diagram confuses readers fast. Pick one language per diagram and use its marks consistently throughout.' },
      changes: ['Chen → teaching', 'Crow’s-foot → databases', 'UML → software design'],
      metrics: { entities: 2, relations: 1, attributes: 6, fks: 1 },
      scene: { view: 'compare', note: 'One relationship, three notations side by side — Chen, crow’s-foot, UML.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Same model, many pens',
      body: [
        `A notation is cosmetic. Whether you draw a diamond, a crow’s foot or a multiplicity label, you are recording the same three things: the <b>entities</b> that exist, the <b>relationships</b> between them, and the <b>cardinality</b> of each relationship. Those are the substance; the shapes are just ink.`,
        `When you read any diagram, translate it back to that substance: which boxes are entities, which marks are relationships, and what the cardinality is at each end. Do that and Chen, crow’s-foot and UML all collapse into the single model they were always describing. For the rest of this course we draw in crow’s-foot — but the ideas are notation-free.`,
      ],
      callout: { kind: 'insight', text: 'Entities, relationships, cardinality — the three things every notation encodes. Learn to see them under the marks and no diagram can confuse you.' },
      metrics: { entities: 2, relations: 1, attributes: 6, fks: 1 },
      scene: { view: 'recap', note: 'Crow’s-foot Customer 1:N Order — one model every notation agrees on.' },
    },
  ],
};
