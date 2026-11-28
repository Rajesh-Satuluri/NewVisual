/* content/three-schema-architecture.js — the "Three-Schema Architecture" lesson,
   as DATA. Same shape as the db-scale lessons: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }. `scene`
   is a view-snapshot consumed by db/three-schema-architecture-scene.js and
   rendered through the shared course shell on the flat schema canvas.

   This is the ANSI-SPARC *architecture* — many external views, one conceptual
   schema, one internal schema — and the data independence it buys. It is a
   different cut from "Conceptual · Logical · Physical", which is about design
   detail; here the three levels are about isolation between users and storage. */

export const threeSchemaArchitectureLesson = {
  id: 'three-schema-architecture',
  title: 'Three-Schema Architecture',
  group: 'Modeling Foundations',
  summary: 'The ANSI-SPARC three-schema architecture — many external views, one conceptual schema, and an internal schema — and the two kinds of data independence it buys.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['entities', 'relations', 'columns', 'constraints'],
  legend: [],
  goals: [
    { text: 'A database is described at three schema levels, not one', step: 0 },
    { text: 'External schemas give each user group its own tailored view', step: 1 },
    { text: 'One conceptual schema holds the whole community design', step: 2 },
    { text: 'The internal schema describes physical storage and access paths', step: 3 },
    { text: 'The split buys logical and physical data independence', step: 4 },
    { text: 'Each layer can change behind a stable interface', step: 5 },
  ],

  steps: [
    { // 0 — THREE SCHEMAS
      chapter: 'setup', short: 'Three schemas',
      title: 'External · Conceptual · Internal',
      body: [
        `In 1975 the ANSI-SPARC committee proposed that a database be described not at one level but at three, so that the people who use it and the machinery that stores it are never welded directly together. The three levels are the <span class="term">external</span> schemas, the single <span class="term">conceptual</span> schema, and the <span class="term">internal</span> schema.`,
        `The idea is a classic separation of concerns. Users look at the top and see only what concerns them; the system works at the bottom with files and pages; and one agreed description in the middle ties the two together. The reward for keeping them apart — <b>data independence</b> — is the whole point, and the rest of this lesson builds up to it.`,
      ],
      callout: { kind: 'insight', text: 'Three schema levels, one database. The point is not detail but insulation: users at the top, storage at the bottom, one shared design between.' },
      metrics: { entities: 3, relations: 2, columns: 9, constraints: 4 },
      scene: { view: 'overview', note: 'External, conceptual, internal — the three ANSI-SPARC levels.' },
    },
    { // 1 — EXTERNAL
      chapter: 'technique', short: 'External',
      title: 'External schemas (views)',
      body: [
        `At the top sit the <span class="term">external schemas</span>, one per user group. Each is a <b>view</b>: a tailored window onto the database that exposes just the subset of entities and columns that group needs, often renamed or recombined for its own convenience. The sales team sees a "customer" with contact details; billing sees the same customer as an account with a balance.`,
        `Crucially, every external schema is derived from the <em>one</em> schema beneath it. A view hides columns a group should not see, flattens a join into something simpler, and relabels fields in that group's own language — all without storing a single extra byte. Many views, one underlying truth.`,
      ],
      callout: { kind: 'tip', text: 'An external schema is a view: a named, possibly renamed subset of the conceptual schema for one audience. Multiple views, zero duplicated data.' },
      changes: ['+ Sales view (subset + renames)', '+ Billing view (subset + renames)', '~ both derived from one schema'],
      metrics: { entities: 3, relations: 2, columns: 5, constraints: 4 },
      scene: { view: 'external', note: 'Several external views, each a tailored window onto one schema.' },
    },
    { // 2 — CONCEPTUAL
      chapter: 'technique', short: 'Conceptual',
      title: 'The conceptual schema',
      body: [
        `In the middle is the <span class="term">conceptual schema</span>: the single <b>community</b> description of the entire database. It names every entity, every relationship and every integrity constraint for the whole organization — the complete logical design, agreed once and shared by all the external views above it.`,
        `What it deliberately leaves out is storage. The conceptual schema says <em>what</em> data exists and the rules it must obey — a customer has exactly one billing account, an order must reference a real customer — but never how any of it is laid out on disk. It is the stable centre that external views draw from and the internal schema implements.`,
      ],
      callout: { kind: 'insight', text: 'The conceptual schema is the one community design: all entities, relationships and constraints, and no storage detail at all.' },
      changes: ['+ all entities & relationships', '+ integrity constraints', '~ no storage detail'],
      metrics: { entities: 3, relations: 2, columns: 9, constraints: 4 },
      scene: { view: 'conceptual', note: 'One community schema — every entity, relationship and constraint.' },
    },
    { // 3 — INTERNAL
      chapter: 'technique', short: 'Internal',
      title: 'The internal schema',
      body: [
        `At the bottom is the <span class="term">internal schema</span>: how the conceptual design is actually stored. It describes the <b>files</b> that hold the rows, the <b>pages</b> they are packed into, the <b>indexes</b> and other access paths that make lookups fast, and the physical record formats the storage engine uses.`,
        `This is the only level that knows about bytes. Where the conceptual schema says "a customer has an id", the internal schema says "customers live in a heap file, clustered by region, with a B-tree index on customer_id spanning so many pages". It is the engine's private business — and keeping it private is what the next step pays off.`,
      ],
      callout: { kind: 'tip', text: 'The internal schema is the storage picture: files, pages, indexes and access paths. It is the only level that mentions physical bytes.' },
      changes: ['+ heap file for rows', '+ B-tree index on customer_id', '+ page & record layout'],
      metrics: { entities: 3, relations: 2, columns: 9, constraints: 4 },
      scene: { view: 'internal', note: 'Physical storage — files, pages, indexes and access paths.' },
    },
    { // 4 — DATA INDEPENDENCE
      chapter: 'tradeoff', short: 'Data independence',
      title: 'Logical & physical data independence',
      body: [
        `The split pays off as <span class="term">data independence</span>, and it comes in two flavours. <b>Physical data independence</b> lets you change the internal schema — add an index, repack pages, switch storage engines — without touching the conceptual schema or any external view above it. The queries run faster or slower, but they do not change.`,
        `<b>Logical data independence</b> is the harder, higher one: you can evolve the conceptual schema — add an entity, split a table, add a column — and, where the old views can still be expressed over the new design, applications keep working unchanged. Each boundary acts as an <em>insulating layer</em>, absorbing change so it does not propagate upward.`,
      ],
      callout: { kind: 'warn', text: 'Physical independence (change storage, keep the design) is routine. Logical independence (change the design, keep the apps) holds only where old views can still be derived — so evolve the conceptual schema with care.' },
      changes: ['~ change storage → views unaffected', '~ change design → apps often unaffected', '+ two insulating boundaries'],
      metrics: { entities: 3, relations: 2, columns: 9, constraints: 4 },
      scene: { view: 'independence', note: 'Each boundary shields the layer above from change below.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'The point',
      title: 'Why three levels',
      body: [
        `The three-schema architecture is really one idea wearing three hats: <b>isolation</b>. External views isolate each user group from everything it does not need; the conceptual schema isolates the shared design from any one view; the internal schema isolates physical storage from the design above it. Each layer offers a stable interface and is free to change behind it.`,
        `That is why the model has outlived the committee that named it. Modern systems rarely implement all three schemas literally, yet every production database still sells you views over tables over storage — so that storage can be re-tuned, designs can evolve, and users can keep their own familiar window, each without disturbing the others.`,
      ],
      callout: { kind: 'insight', text: 'Views over a shared design over storage — three layers, each changeable behind a stable interface. That isolation is the architecture’s whole value.' },
      metrics: { entities: 3, relations: 2, columns: 9, constraints: 4 },
      scene: { view: 'recap', note: 'Views, conceptual schema, storage — isolated layers behind stable interfaces.' },
    },
  ],
};
