/* content/weak-strong-entities.js — the "Weak & Strong Entities" lesson, as
   DATA. Same shape as every Modeling Foundations lesson: each step is { chapter,
   short, title, body[], callout, changes?, metrics, scene }. `scene` is a
   view-snapshot consumed by db/weak-strong-entities-scene.js on the flat schema
   canvas (engine/schema2d.js). The lesson contrasts strong entities — which
   stand alone with their own key — against weak entities, which depend on an
   owner and are identified by an identifying relationship plus a partial key. */

export const weakStrongEntitiesLesson = {
  id: 'weak-strong-entities',
  title: 'Weak & Strong Entities',
  group: 'Modeling Foundations',
  summary: 'Strong entities stand alone with their own key; weak entities depend on an owner and are identified by an identifying relationship plus a partial key.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['entities', 'attributes', 'relations', 'fks'],
  legend: [],
  goals: [
    { text: 'A strong entity has its own key and exists independently', step: 0 },
    { text: 'A weak entity has no standalone identity of its own', step: 1 },
    { text: 'An identifying relationship borrows the owner’s key', step: 2 },
    { text: 'A partial key is unique only within the owner', step: 3 },
    { text: 'A surrogate key is the modern alternative to a weak entity', step: 4 },
    { text: 'Weak entities depend on an owner for their identity', step: 5 },
  ],

  steps: [
    { // 0 — STRONG ENTITY
      chapter: 'setup', short: 'Strong entity',
      title: 'Strong entities stand alone',
      body: [
        `Most entities are <span class="term">strong</span>: they have their own <b>primary key</b> and exist on their own terms. An <code>Order</code> is identified by <code>order_id</code> and nothing else — you can point at an order, store it, and talk about it without reference to any other entity.`,
        `That independence is what makes a strong entity the stable anchor of a model. Its key is minted from within — a sequence, a UUID, a natural business number — and it never borrows identity from a neighbour. Every relationship an order takes part in hangs off this self-sufficient key.`,
      ],
      callout: { kind: 'insight', text: 'A strong entity owns its identity: one primary key, minted from within, no dependence on any other entity to exist.' },
      metrics: { entities: 1, attributes: 4, relations: 0, fks: 0 },
      scene: { view: 'strong', note: 'Order is a strong entity — its own primary key, standing alone.' },
    },
    { // 1 — WEAK ENTITY
      chapter: 'problem', short: 'Weak entity',
      title: 'Some things cannot stand alone',
      body: [
        `Now consider an <code>OrderLine</code> — one line on an order: a product, a quantity, a price. What identifies it? There is no natural, standalone id. "Line 2" means nothing on its own; "line 2 <em>of order 5003</em>" means something. An order line is meaningless without its order.`,
        `This is a <span class="term">weak entity</span>: an entity with no primary key of its own, whose very existence depends on an <b>owner</b> entity. Delete the order and its lines cease to have meaning — they exist only <em>within</em> the order. The model marks this dependence explicitly, because it changes how the entity is keyed and how it is deleted.`,
      ],
      callout: { kind: 'warn', text: 'A weak entity has no key of its own and cannot exist without its owner. Spotting one is the signal that identity must be borrowed.' },
      changes: ['+ OrderLine entity', '~ no standalone primary key', '~ existence depends on Order'],
      metrics: { entities: 2, attributes: 7, relations: 0, fks: 0 },
      scene: { view: 'weak', note: 'OrderLine is weak — no key of its own, meaningless without an Order.' },
    },
    { // 2 — IDENTIFYING RELATIONSHIP
      chapter: 'technique', short: 'Identifying rel',
      title: 'The identifying relationship',
      body: [
        `A weak entity is tied to its owner by an <span class="term">identifying relationship</span>: a relationship that does more than connect — it <em>supplies identity</em>. The owner's key is pulled into the weak entity as a foreign key, and that borrowed key becomes part of the weak entity's own identity.`,
        `Here <code>Order</code> identifies <code>OrderLine</code> in a <b>1:N</b> relationship: one order, many lines. <code>order_id</code> flows down into every line. This is stronger than an ordinary foreign key — it is not just a reference, it is a piece of <em>who the line is</em>. Databases often enforce it with <code>ON DELETE CASCADE</code>: remove the order, remove its lines.`,
      ],
      callout: { kind: 'tip', text: 'An identifying relationship carries the owner’s key into the weak entity. The reference is not optional decoration — it is part of identity.' },
      changes: ['+ Order 1:N OrderLine (identifying)', '+ FK orderline.order_id → order.order_id'],
      metrics: { entities: 2, attributes: 7, relations: 1, fks: 1 },
      scene: { view: 'identifying', note: 'Order identifies OrderLine — the owner’s key flows down, 1:N.' },
    },
    { // 3 — PARTIAL KEY
      chapter: 'technique', short: 'Partial key',
      title: 'Partial key (discriminator)',
      body: [
        `The borrowed key alone is not enough — one order has many lines, so <code>order_id</code> cannot tell them apart. The weak entity adds a <span class="term">partial key</span> (or discriminator): an attribute unique only <em>within</em> the owner. <code>line_no</code> is 1, 2, 3 within an order, and repeats across different orders.`,
        `The full primary key is the owner's key plus the partial key together: <b>(order_id, line_no)</b>. Neither half identifies a line on its own; combined, they are unique across the whole table. This composite key is the hallmark of a weak entity — identity assembled from a borrowed part and a local part.`,
      ],
      callout: { kind: 'insight', text: 'Weak-entity PK = owner key + partial key. line_no is unique only within an order; (order_id, line_no) is unique everywhere.' },
      changes: ['+ partial key line_no (unique within order)', '~ PRIMARY KEY (order_id, line_no)'],
      metrics: { entities: 2, attributes: 8, relations: 1, fks: 1 },
      scene: { view: 'partialkey', note: 'The full key is composite — (order_id, line_no), borrowed part plus local part.' },
    },
    { // 4 — OR A SURROGATE
      chapter: 'tradeoff', short: 'Or a surrogate',
      title: 'Weak entity or surrogate key?',
      body: [
        `The textbook weak entity, with its composite natural key, is correct — but composite keys ripple. Every table that references a line must carry <em>both</em> <code>order_id</code> and <code>line_no</code>, and joins grow wider with each borrowed column. So modern practice often takes a different road.`,
        `Instead of a partial key, give the former weak entity its own <b>surrogate</b> id — a meaningless <code>order_line_id</code> — making it a strong entity in its own right, with <code>order_id</code> demoted to an ordinary (non-identifying) foreign key. You trade the conceptual purity of the weak entity for simpler keys and narrower joins. Both designs are valid; the choice is about keys, not correctness.`,
      ],
      callout: { kind: 'tip', text: 'Composite natural key vs single surrogate id: one is conceptually faithful, the other keeps keys and joins narrow. Decide deliberately.' },
      changes: ['~ option A: natural PK (order_id, line_no)', '~ option B: surrogate PK order_line_id + FK order_id'],
      metrics: { entities: 2, attributes: 8, relations: 1, fks: 1 },
      scene: { view: 'example', note: 'Two designs side by side — composite natural key versus a surrogate id.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Depends on an owner',
      body: [
        `A <b>strong</b> entity owns its identity; a <b>weak</b> entity borrows it. The weak entity has no standalone key, is bound to an <b>owner</b> by an <b>identifying relationship</b> that supplies the owner's key, and completes its identity with a <b>partial key</b> that is unique only within that owner — making its full key composite.`,
        `Recognising weak entities matters because it drives three concrete decisions: how to key the table (composite, or surrogate), how to delete it (cascade from the owner), and how to relate to it (through both key parts). Whether you keep the natural weak-entity form or promote it with a surrogate, naming the dependence is what keeps the model honest about what can exist on its own.`,
      ],
      callout: { kind: 'insight', text: 'Weak = no key of its own, identified via an owner and a partial key. Strong = self-sufficient identity. Name the dependence; then choose the keys.' },
      metrics: { entities: 2, attributes: 8, relations: 1, fks: 1 },
      scene: { view: 'recap', note: 'Order owns OrderLine — identifying relationship plus a partial key.' },
    },
  ],
};
