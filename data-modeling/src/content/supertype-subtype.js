/* content/supertype-subtype.js — the "Supertype / Subtype" lesson, as DATA.
   Same shape as every db-scale lesson: each step is { chapter, short, title,
   body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/supertype-subtype-scene.js and rendered through the shared
   course shell. This lesson covers generalization/specialization and the three
   standard ways to map a type hierarchy to tables. */

export const supertypeSubtypeLesson = {
  id: 'supertype-subtype',
  title: 'Supertype / Subtype',
  group: 'ER & Relational Design',
  summary: 'Generalization and specialization — a supertype holds the shared attributes, subtypes add their own — and the three ways to map the hierarchy to tables.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['entities', 'attributes', 'tables', 'relations'],
  legend: [],
  goals: [
    { text: 'A supertype holds shared attributes; subtypes add their own', step: 0 },
    { text: 'Generalization is bottom-up; specialization is top-down', step: 1 },
    { text: 'Map 1: one table with a type discriminator and NULLs', step: 2 },
    { text: 'Map 2: a table per subtype, each with an FK to the supertype', step: 3 },
    { text: 'The mappings trade NULLs against joins', step: 4 },
    { text: 'Shared attributes go up, specific ones go down', step: 5 },
  ],

  steps: [
    { // 0 — HIERARCHY
      chapter: 'setup', short: 'Shared + specific',
      title: 'A type hierarchy',
      body: [
        `Some entities are kinds of a more general thing. A <code>Payment</code> has an <code>amount</code> and a <code>paid_at</code> no matter how it was made. But a card payment also has a <code>card_last4</code>, and a bank transfer has an <code>iban</code> — attributes that make no sense on the other.`,
        `This is a <span class="term">type hierarchy</span>. <code>Payment</code> is the <span class="term">supertype</span>, holding what every payment shares. <code>CardPayment</code> and <code>BankTransfer</code> are <span class="term">subtypes</span>, each adding what only it needs. Every subtype instance <em>is a</em> payment — the relationship is "is-a", not "has-a".`,
      ],
      callout: { kind: 'insight', text: 'Supertype = the shared attributes. Subtype = the shared attributes plus its own. Every subtype instance is-a supertype instance.' },
      metrics: { entities: 3, attributes: 4, tables: 0, relations: 2 },
      scene: { view: 'hierarchy', note: 'Payment supertype over CardPayment and BankTransfer subtypes.' },
    },
    { // 1 — GENERALIZATION / SPECIALIZATION
      chapter: 'technique', short: 'Generalize/specialize',
      title: 'Generalization vs specialization',
      body: [
        `A hierarchy can be discovered from either direction. <span class="term">Generalization</span> is bottom-up: you already have <code>CardPayment</code> and <code>BankTransfer</code>, notice the attributes they share, and lift those into a new <code>Payment</code> supertype. You are factoring out what is common.`,
        `<span class="term">Specialization</span> is top-down: you start with <code>Payment</code> and realise it splits into cases that each need their own attributes, so you push those specifics down into subtypes. Same hierarchy, opposite motions — and knowing which you are doing keeps the shared attributes in the supertype and the specific ones in the subtypes.`,
      ],
      callout: { kind: 'tip', text: 'Generalization lifts shared attributes up into a new supertype; specialization pushes specific attributes down into new subtypes.' },
      changes: ['~ bottom-up: factor shared attributes up', '~ top-down: push specific attributes down'],
      metrics: { entities: 3, attributes: 4, tables: 0, relations: 2 },
      scene: { view: 'generalization', note: 'Bottom-up generalization and top-down specialization reach the same hierarchy.' },
    },
    { // 2 — SINGLE TABLE
      chapter: 'technique', short: 'Single-table',
      title: 'Map 1: single table + discriminator',
      body: [
        `The first mapping flattens the whole hierarchy into <b>one table</b>. <code>payments</code> holds every column from the supertype and every subtype, plus a <span class="term">discriminator</span> column — <code>type</code> — that says which kind each row is.`,
        `The cost is <b>NULLs</b>. A card-payment row fills <code>card_last4</code> but leaves <code>iban</code> empty; a transfer row does the reverse. The more subtypes, the more type-specific columns, and the sparser the table. In return you get the simplest schema possible: no joins, and every payment in one place.`,
      ],
      callout: { kind: 'warn', text: 'One wide table is simple and join-free, but every type-specific column is NULL for every row of the other types.' },
      changes: ['+ payments table (all columns)', '+ type discriminator column', '~ type-specific columns go NULL off-type'],
      metrics: { entities: 3, attributes: 6, tables: 1, relations: 0 },
      scene: { view: 'single-table', note: 'One payments table, a type column, and NULL-prone type-specific columns.' },
    },
    { // 3 — TABLE PER TYPE
      chapter: 'technique', short: 'Per-subtype',
      title: 'Map 2: a table per subtype',
      body: [
        `The second mapping keeps the hierarchy as separate tables. A <code>payments</code> supertype table holds the shared columns; <code>card_payments</code> and <code>bank_transfers</code> each hold only their own, plus a <span class="term">foreign key</span> back to <code>payments</code> that is also their primary key.`,
        `Now no column is ever wasted — every table is dense, and a type-specific attribute lives in exactly one place. The cost is <b>joins</b>: to see a full card payment you read <code>payments</code> and <code>card_payments</code> together. You have traded the NULLs of the single table for a join on every read.`,
      ],
      callout: { kind: 'tip', text: 'Table-per-type has no NULLs — each table is dense — but reading a full instance needs a join back to the supertype.' },
      changes: ['+ payments supertype table', '+ card_payments · bank_transfers', '~ each subtype PK is an FK to payments'],
      metrics: { entities: 3, attributes: 6, tables: 3, relations: 2 },
      scene: { view: 'table-per-type', note: 'A payments table plus one dense table per subtype, each keyed to the supertype.' },
    },
    { // 4 — WHICH MAPPING
      chapter: 'tradeoff', short: 'Which mapping',
      title: 'NULLs vs joins',
      body: [
        `The two main mappings pull in opposite directions. <b>Single-table</b> optimises reads — one row, no joins — at the price of a sparse, NULL-filled table and weaker constraints (the database cannot easily insist a card row has a <code>card_last4</code>). <b>Table-per-type</b> optimises integrity and density at the price of a join per read.`,
        `A third option, <b>table-per-concrete-class</b>, drops the supertype table entirely and copies the shared columns into each subtype table — no joins and no NULLs, but the common attributes are duplicated and a "list all payments" query must union every table. Choose by what you do most: read whole instances fast, enforce tidy per-type constraints, or query each type alone.`,
      ],
      callout: { kind: 'insight', text: 'Single-table trades NULLs for speed; table-per-type trades a join for density; per-concrete trades a UNION for independence.' },
      changes: ['~ single-table: NULLs, no joins', '~ table-per-type: joins, no NULLs', '~ per-concrete: duplication, UNIONs'],
      metrics: { entities: 3, attributes: 6, tables: 3, relations: 2 },
      scene: { view: 'compare', note: 'Single-table (NULLs) vs table-per-type (joins) vs per-concrete (UNIONs).' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Shared up, specific down',
      body: [
        `The modelling move is always the same: put <b>shared attributes up</b> in the supertype and <b>specific attributes down</b> in the subtypes, linked by an is-a relationship. The physical question — one table, a table per type, or a table per concrete class — is a separate choice made per workload.`,
        `Reach for the hierarchy whenever entities share a solid common core but diverge in the details: payment methods, account types, product categories, user roles. Model the commonality once, specialise where it matters, and pick the mapping that fits how the data is read and constrained.`,
      ],
      callout: { kind: 'insight', text: 'Shared attributes up, specific attributes down — then map to single-table, table-per-type, or table-per-concrete by workload.' },
      metrics: { entities: 3, attributes: 6, tables: 3, relations: 2 },
      scene: { view: 'recap', note: 'The hierarchy, with the two main mappings checked off.' },
    },
  ],
};
