/* content/data-types-domains.js — the "Data Types & Domains" lesson, as DATA.
   Same shape as the other Modeling Foundations lessons: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/data-types-domains-scene.js and
   rendered through the shared course shell on the flat schema canvas. */

export const dataTypesDomainsLesson = {
  id: 'data-types-domains',
  title: 'Data Types & Domains',
  group: 'Modeling Foundations',
  summary: 'Every attribute draws from a domain — a type plus the set of legal values — and constraints narrow that domain so the database rejects bad data at the door instead of trusting the application to behave.',
  minutes: 8,
  level: 'beginner',
  metrics: ['attributes', 'columns', 'constraints', 'integrity'],
  legend: [],
  goals: [
    { text: 'A domain is a type together with its set of legal values', step: 0 },
    { text: 'Pick the narrowest primitive type the fact allows', step: 1 },
    { text: 'Constraints narrow a broad type to the exact legal set', step: 2 },
    { text: 'An enumeration is a small controlled vocabulary', step: 3 },
    { text: 'Loose typing is data the model can no longer trust', step: 4 },
    { text: 'Type early, type narrow, and enforce it', step: 5 },
  ],

  steps: [
    { // 0 — DOMAINS
      chapter: 'setup', short: 'Domains',
      title: 'A domain is a set of legal values',
      body: [
        `When we say an attribute is an integer, we are really saying something sharper: its values are drawn from the <span class="term">domain</span> of integers — a named <em>set</em> of values a column is allowed to hold. A <code>Product</code> has a <code>price</code>, a <code>name</code>, a <code>created</code> date; each draws from its own domain.`,
        `The <b>type</b> is the first and broadest cut at that domain. <code>int</code>, <code>text</code>, <code>date</code>, <code>bool</code>, <code>decimal</code> each name a distinct set of legal values, and fixing the type is the first thing the model does to stop a column from holding nonsense — a <code>date</code> column can never store <code>"banana"</code>, because that value is not in the domain.`,
      ],
      callout: { kind: 'insight', text: 'A type is not decoration — it is a membership test. Declaring a domain tells the database which values to accept and, just as importantly, which to reject.' },
      metrics: { attributes: 5, columns: 5, constraints: 0, integrity: 60 },
      scene: { view: 'domain', note: 'Every Product attribute draws its legal values from a domain — its type.' },
    },
    { // 1 — PRIMITIVES
      chapter: 'technique', short: 'Primitives',
      title: 'Primitive types',
      body: [
        `Every engine ships a core set of <span class="term">primitive types</span>: <code>int</code> for whole numbers, <code>varchar(n)</code> for bounded text, <code>date</code> and <code>timestamp</code> for points in time, <code>boolean</code> for true/false, and <code>numeric</code>/<code>decimal</code> for exact fractional money. Each is a ready-made domain you attach to a column.`,
        `The craft is choosing the <b>narrowest</b> type the fact allows. A quantity that is always a small whole number does not need a <code>decimal</code>; a status that is yes-or-no is a <code>boolean</code>, not <code>varchar</code>. A narrow type is self-documenting and lets the database store, index and validate the column more cheaply — every value it rejects is a bug caught for free.`,
      ],
      callout: { kind: 'tip', text: 'Money is decimal, never float: binary floating point cannot represent 0.10 exactly. The type you choose is a promise about what the value means.' },
      changes: ['~ price → decimal', '~ in_stock → boolean', '~ name → varchar(120)'],
      metrics: { attributes: 5, columns: 5, constraints: 0, integrity: 65 },
      scene: { view: 'primitives', note: 'Product columns, each given the narrowest primitive type its fact allows.' },
    },
    { // 2 — CONSTRAINTS
      chapter: 'technique', short: 'Constraints',
      title: 'Constraints narrow the domain',
      body: [
        `A type is a broad domain — <code>int</code> admits every whole number, including negatives and zero. Real facts are narrower. A <span class="term">constraint</span> shrinks the type’s domain to the exact set of legal values: <code>NOT NULL</code> forbids absence, <code>CHECK (price &gt; 0)</code> forbids non-positive prices, a length limit caps text.`,
        `Each constraint moves a rule out of the application and into the <b>schema</b>, where the database enforces it on every write, from every client, forever. The domain of <code>price</code> is no longer "any decimal" but "a decimal greater than zero" — and a negative price is now impossible to store, not merely discouraged.`,
      ],
      callout: { kind: 'insight', text: 'type + constraints = the true domain. A constraint in the schema is enforced once by the database; the same rule in application code must be re-enforced everywhere and is one forgotten path from failing.' },
      changes: ['+ NOT NULL on name, price', '+ CHECK (price > 0)', '+ varchar(120) length cap'],
      metrics: { attributes: 5, columns: 5, constraints: 3, integrity: 80 },
      scene: { view: 'constraints', note: 'NOT NULL and CHECK constraints narrow Product’s types to their legal values.' },
    },
    { // 3 — ENUMERATIONS
      chapter: 'technique', short: 'Enumerations',
      title: 'Enumerated domains',
      body: [
        `Some domains are simply a short, fixed list. An order’s <code>status</code> is one of <code>{new, paid, shipped}</code> and nothing else — a <span class="term">controlled vocabulary</span>. An enumerated domain names that list explicitly, so the column accepts only a value drawn from it.`,
        `This beats a free-text <code>varchar</code>, which would cheerfully store <code>"Shippd"</code>, <code>"SHIPPED"</code> and <code>"done"</code> as three distinct statuses. Whether you model it as a native <code>enum</code>, a <code>CHECK (status IN (...))</code>, or a small reference table, the effect is the same: the set of legal values is closed, and typos become storage errors instead of silent data corruption.`,
      ],
      callout: { kind: 'tip', text: 'An enumeration turns "any string" into a closed set. Choose a reference table over a native enum when the list changes often — adding a value should not mean altering a type.' },
      changes: ['+ Order entity', '~ status ∈ {new, paid, shipped}', '+ CHECK status IN (...)'],
      metrics: { attributes: 6, columns: 6, constraints: 4, integrity: 85 },
      scene: { view: 'enum', note: 'Order.status draws from the enumerated domain {new, paid, shipped}.' },
    },
    { // 4 — MISMATCH
      chapter: 'tradeoff', short: 'Mismatch',
      title: 'The cost of loose typing',
      body: [
        `Skip the discipline and the costs arrive later, disguised as ordinary bugs. A date stored as <code>text</code> sorts <code>"10/02"</code> before <code>"9/30"</code> and cannot answer "orders in the last week". Money stored as <code>float</code> drifts by fractions of a cent until the ledger no longer balances. The column still accepts the value — it just stops meaning what you think.`,
        `Loose typing is data the model can no longer <b>trust</b>. Every query that touches a mistyped column must defensively parse, cast and second-guess it, and the database can no longer reject bad input because the domain was never narrowed in the first place. The fix — a real <code>date</code>, a real <code>decimal</code> — is cheap on day one and a painful migration on day one thousand.`,
      ],
      callout: { kind: 'warn', text: 'A loose type does not fail loudly; it fails quietly, as wrong answers to correct queries. The database can only protect data whose domain you told it.' },
      changes: ['✗ created stored as text', '✗ price stored as float', '✓ created date · price decimal'],
      metrics: { attributes: 6, columns: 6, constraints: 4, integrity: 72 },
      scene: { view: 'mismatch', note: 'A text date and a float price — the correctly-typed columns beside them.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Type early, type narrow',
      body: [
        `A domain is a <b>type</b> plus the set of <b>legal values</b> within it, and the model builds that domain in layers: pick the narrowest primitive, add constraints to forbid absence and illegal values, and close open-ended lists with an enumeration. Each layer hands the database another rule it will enforce for you.`,
        `Do this at design time and bad data is rejected at the door, where it is cheap to refuse. Skip it and the same bad data settles into the tables, where it is expensive to find and dangerous to trust. Type early, type narrow, and let the schema — not the application — be the guardian of what is allowed.`,
      ],
      callout: { kind: 'insight', text: 'domain = type + legal values; constraints and enumerations enforce it. The schema is the one place a rule holds for every writer, forever.' },
      metrics: { attributes: 6, columns: 6, constraints: 5, integrity: 92 },
      scene: { view: 'recap', note: 'Type, constraint and enumeration — the three layers that define a domain.' },
    },
  ],
};
