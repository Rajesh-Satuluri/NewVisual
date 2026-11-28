/* content/surrogate-natural-keys.js — the "Surrogate vs Natural Keys" lesson, as
   DATA. Same shape as the other ER & Relational Design lessons: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }. `scene`
   is a view-snapshot consumed by db/surrogate-natural-keys-scene.js. This is the
   FULL treatment of the surrogate/natural choice — stability, performance,
   distributed id generation and meaning — not the one-line mention elsewhere. */

export const surrogateNaturalKeysLesson = {
  id: 'surrogate-natural-keys',
  title: 'Surrogate vs Natural Keys',
  group: 'ER & Relational Design',
  summary: 'The full case for surrogate versus natural primary keys — stability under change, index and storage performance, distributed id generation, and the meaning you keep or lose.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['entities', 'attributes', 'constraints', 'fks'],
  legend: [],
  goals: [
    { text: 'Every table needs a primary key — natural or surrogate', step: 0 },
    { text: 'Natural keys carry meaning but change and leak into every FK', step: 1 },
    { text: 'A surrogate key is stable and compact, with a UNIQUE on the natural key', step: 2 },
    { text: 'Auto-increment, UUID and ULID/snowflake trade locality for distribution', step: 3 },
    { text: 'OLTP usually means a surrogate PK plus a unique natural key', step: 4 },
    { text: 'The choice is stability versus meaning', step: 5 },
  ],

  steps: [
    { // 0 — TWO CHOICES
      chapter: 'setup', short: 'Two choices',
      title: 'Natural or surrogate?',
      body: [
        `Every table needs a primary key, and there are only two kinds to choose from. A <span class="term">natural key</span> is a column that already exists and means something in the world — a customer's <code>email</code>, a book's ISBN, a country's ISO code. A <span class="term">surrogate key</span> is an invented identifier — a bare <code>customer_id</code> — that means nothing outside the database.`,
        `The choice looks small and decides a lot. It fixes what every row is named by, what every foreign key carries, how the primary index is laid out on disk, and how much a reference costs to store and to change. The same <code>Customer</code> keyed on <code>email</code> versus on <code>customer_id</code> behaves very differently once data starts moving.`,
      ],
      callout: { kind: 'insight', text: 'Natural key = a meaningful value that already exists. Surrogate key = a meaningless value you invent. The whole lesson is which one to make primary.' },
      metrics: { entities: 1, attributes: 4, constraints: 1, fks: 0 },
      scene: { view: 'two', note: 'One Customer, two choices of primary key — the natural email or a surrogate customer_id.' },
    },
    { // 1 — NATURAL KEYS
      chapter: 'technique', short: 'Natural keys',
      title: 'Meaningful, but they move',
      body: [
        `A natural key is attractive: it adds no extra column, a human can read it, and it is already unique. Make <code>email</code> the primary key of <code>Customer</code> and every order references the customer by email — no join needed just to know who placed it, because the key <em>is</em> the information.`,
        `The trouble is that meaningful values <em>change</em>. A customer switches email and now the primary key must change — and because it is a foreign key in <code>Order</code>, <code>Invoice</code> and everywhere else, the change <span class="term">cascades</span> through every table that pointed at it. Worse, the key <b>leaks business data</b>: the email sits in every child row and every index, visible wherever the key travels. A wide text key also makes every foreign key and index larger.`,
      ],
      callout: { kind: 'warn', text: 'A natural primary key means every real-world change to that value rewrites every foreign key pointing at it — and spreads that value everywhere the key goes.' },
      changes: ['~ email as PRIMARY KEY', '+ Order.customer_email → Customer.email', '~ email changes cascade to every FK'],
      metrics: { entities: 2, attributes: 7, constraints: 1, fks: 1 },
      scene: { view: 'natural', note: 'email as primary key: no extra column, but it changes and leaks into every foreign key.' },
    },
    { // 2 — SURROGATE KEYS
      chapter: 'technique', short: 'Surrogate keys',
      title: 'Stable and compact',
      body: [
        `A <span class="term">surrogate key</span> fixes the stability problem by having no meaning to change. Add a <code>customer_id</code> that nothing in the business depends on, make it the primary key, and it <em>never</em> changes — so the foreign keys that reference it never have to either. The email can change freely; it is now just an attribute.`,
        `The surrogate is also <b>compact</b>: a small integer or 16-byte id makes every foreign key and index narrower than a long text natural key would. And you do not lose the natural key's guarantee — you keep it as a <code>UNIQUE</code> constraint on <code>email</code>, so one address still names at most one customer. You get stability and uniqueness together.`,
      ],
      callout: { kind: 'tip', text: 'Surrogate primary key for stable, small references; a UNIQUE on the natural key so its real-world uniqueness still holds. Keep both — they do different jobs.' },
      changes: ['+ customer_id surrogate PRIMARY KEY', '+ UNIQUE(email) — natural key kept', '~ FKs now reference a stable id'],
      metrics: { entities: 2, attributes: 9, constraints: 3, fks: 1 },
      scene: { view: 'surrogate', note: 'A surrogate customer_id is PK; email stays UNIQUE. Foreign keys are small and never move.' },
    },
    { // 3 — SURROGATE FLAVORS
      chapter: 'technique', short: 'Surrogate flavors',
      title: 'Auto-increment vs UUID/ULID',
      body: [
        `Not all surrogates behave alike, and the difference is performance. A <span class="term">sequential id</span> — an auto-increment or sequence — is compact and <b>index-local</b>: each new row appends to the right edge of the B-tree, so inserts stay cheap. Its weaknesses are that it needs a central allocator and it is guessable (id 41 implies 40 rows before it).`,
        `A <span class="term">UUID</span> needs no coordination — any node generates one independently, ideal for <em>distributed</em> id generation — but a random v4 UUID scatters inserts across the whole index, causing <span class="term">page splits</span> and poor cache locality, and it is 16 bytes. The fix is a time-ordered id: a <span class="term">ULID</span> or a <span class="term">snowflake id</span> prefixes a timestamp, so ids are generated anywhere yet still sort to the right edge — distributed like a UUID, index-local like a sequence.`,
      ],
      callout: { kind: 'insight', text: 'Sequence: local but centralized. Random UUID: distributed but splits pages. ULID/snowflake: a timestamp prefix buys you both — distributed generation and index locality.' },
      changes: ['~ sequence: local, centralized, guessable', '~ UUIDv4: distributed, random, page splits', '~ ULID/snowflake: time-sortable, both'],
      metrics: { entities: 2, attributes: 9, constraints: 3, fks: 1 },
      scene: { view: 'flavors', note: 'Three surrogate flavors: sequence, random UUID, and time-sortable ULID/snowflake.' },
    },
    { // 4 — CHOOSING
      chapter: 'tradeoff', short: 'Choosing',
      title: 'OLTP usually surrogate + unique natural',
      body: [
        `For most transactional (OLTP) tables the default is clear: a <b>surrogate primary key</b> for stable, compact references, with the natural key preserved as a <code>UNIQUE</code> constraint so its real-world meaning and uniqueness are still enforced. Pick the surrogate flavor by deployment — a sequence on a single primary, a ULID or snowflake once ids are minted on many nodes.`,
        `A pure natural key earns its place only when the value is genuinely <em>immutable</em> and already compact — an ISO country code, a fixed standard identifier — and even then a surrogate often wins for consistency across the schema. The one habit to avoid is a natural primary key on anything a human might one day want to edit.`,
      ],
      callout: { kind: 'tip', text: 'OLTP default: surrogate PK + UNIQUE natural key. Natural-only keys are for small, truly immutable codes — not for emails, names, or anything editable.' },
      changes: ['~ OLTP: surrogate PK + UNIQUE natural', '~ natural-only: immutable codes only', '~ flavor chosen by deployment'],
      metrics: { entities: 2, attributes: 9, constraints: 3, fks: 1 },
      scene: { view: 'choose', note: 'The OLTP default: surrogate primary key plus a UNIQUE constraint on the natural key.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Stability vs meaning',
      body: [
        `The surrogate/natural choice is one tension: <b>stability</b> against <b>meaning</b>. A natural key carries meaning but moves, leaks business data, and is usually wider; a surrogate is stable, compact and private but tells a reader nothing. The standard resolution keeps both — surrogate for identity and references, natural kept <code>UNIQUE</code> for its guarantee.`,
        `Then let performance pick the surrogate's form: a sequence for index locality on one writer, a ULID or snowflake id when generation must be distributed without surrendering that locality, a raw random UUID only when page splits truly do not matter. Get identity stable and compact and every join, index and migration built on it stays cheap and correct.`,
      ],
      callout: { kind: 'insight', text: 'Surrogate for stability, natural kept UNIQUE for meaning; sequence, ULID or UUID chosen for how and where ids are generated. Stable identity is the foundation everything else rests on.' },
      metrics: { entities: 2, attributes: 9, constraints: 3, fks: 1 },
      scene: { view: 'recap', note: 'Surrogate PK for stability, UNIQUE natural key for meaning — the durable compromise.' },
    },
  ],
};
