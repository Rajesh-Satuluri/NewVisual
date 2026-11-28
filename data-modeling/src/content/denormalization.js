/* content/denormalization.js — the "Denormalization Tradeoffs" lesson, as DATA.
   Same shape as the other ER & Relational Design lessons: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }. `scene`
   is a view-snapshot consumed by db/denormalization-scene.js and rendered through
   the shared course shell on the flat schema canvas. Denormalization is the
   deliberate reverse of normalization: trade storage and consistency for reads. */

export const denormalizationLesson = {
  id: 'denormalization',
  title: 'Denormalization Tradeoffs',
  group: 'ER & Relational Design',
  summary: 'Deliberately reintroducing redundancy to speed reads — the reverse of normalization — and the narrow conditions under which that trade actually pays.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['redundancy', 'joins', 'normalForm', 'scanRows'],
  legend: [],
  goals: [
    { text: 'A fully normalized schema makes reads pay in joins', step: 0 },
    { text: 'Denormalization precomputes and duplicates to cut those joins', step: 1 },
    { text: 'Summary tables, derived columns and materialized views are the common patterns', step: 2 },
    { text: 'The update anomalies normalization removed come back as your problem', step: 3 },
    { text: 'Denormalize only when reads dominate, after measuring', step: 4 },
    { text: 'It is a deliberate, reversible trade — not a default', step: 5 },
  ],

  steps: [
    { // 0 — NORMALIZED IS SLOW TO READ
      chapter: 'setup', short: 'Normalized is slow',
      title: 'Clean schemas pay at read time',
      body: [
        `Normalization stores every fact in exactly one place: <code>Customer</code>, <code>Order</code>, <code>OrderLine</code> and <code>Product</code> each hold only what depends on their own key. That is ideal for <em>writing</em> — one update touches one row — and it is why a <span class="term">third normal form</span> schema has almost no <b>redundancy</b>.`,
        `The cost lands on <em>reads</em>. To show one order with its customer name and product details, the database must <span class="term">join</span> four tables back together on every request. Each join widens the rows scanned and the work done. When a page is read thousands of times for every write, that join tax is paid thousands of times too.`,
      ],
      callout: { kind: 'insight', text: 'Normalization optimizes writes; it quietly taxes reads. A perfectly normal schema can still be the wrong shape for a read-heavy workload.' },
      metrics: { redundancy: 2, joins: 5, normalForm: '3NF', scanRows: 48000 },
      scene: { view: 'normalized', note: 'Four normalized tables — one order view costs several joins to assemble.' },
    },
    { // 1 — PRECOMPUTE & DUPLICATE
      chapter: 'technique', short: 'Precompute',
      title: 'Trade storage for speed',
      body: [
        `<span class="term">Denormalization</span> is the deliberate reverse of normalization: copy a fact back into the table that reads it, so the read no longer has to go and fetch it. Fold the customer name and product details straight into a wide <code>OrderView</code> row and that four-table join collapses into a single sequential read.`,
        `Nothing comes free — the price is <b>redundancy</b>. The same customer name now lives on every one of their order rows, so the schema drops below third normal form and uses more storage. You are spending disk and write effort to buy read speed, on purpose. That is the whole trade in one sentence.`,
      ],
      callout: { kind: 'tip', text: 'Denormalization is redundancy you choose. Copy the fact next to the read, accept the extra storage, and the join disappears.' },
      changes: ['+ OrderView wide table', '~ customer + product facts copied in', '~ 3NF → below normal form'],
      metrics: { redundancy: 34, joins: 1, normalForm: '2NF', scanRows: 9000 },
      scene: { view: 'denorm', note: 'One wide OrderView folds the joined data together — a single read, no join tangle.' },
    },
    { // 2 — COMMON PATTERNS
      chapter: 'technique', short: 'Patterns',
      title: 'Summary tables, derived columns, materialized views',
      body: [
        `Denormalization has a handful of named shapes. A <span class="term">summary table</span> stores pre-aggregated counts and totals, refreshed on a schedule, so a dashboard reads one small row instead of scanning millions. A <span class="term">derived column</span> stores a computed value — <code>order_total</code> saved once rather than re-summed from the lines on every read.`,
        `A <span class="term">materialized view</span> persists the result of a join or aggregation on disk and refreshes it incrementally — a cache the database manages for you. The broadest pattern is simply a precomputed <b>wide table</b> that folds related rows into one. Each pattern trades a different amount of staleness and storage for a different amount of read speed.`,
      ],
      callout: { kind: 'insight', text: 'Summary table, derived column, materialized view, wide table — four ways to answer a read without doing the work at read time.' },
      changes: ['+ summary / rollup tables', '+ derived (computed) columns', '+ materialized views'],
      metrics: { redundancy: 40, joins: 0, normalForm: '1NF', scanRows: 1200 },
      scene: { view: 'patterns', note: 'Four denormalization patterns, each precomputing the work a read would otherwise do.' },
    },
    { // 3 — THE COST RETURNS
      chapter: 'tradeoff', short: 'Cost returns',
      title: 'You now own consistency',
      body: [
        `Normalization removed <span class="term">update anomalies</span> by keeping each fact in one place. Denormalize and they come straight back: a customer changes their email and now every order row that copied it is stale until you rewrite all of them. The database no longer guarantees the copies agree — that duty moves to you.`,
        `So every denormalized copy needs a keeper: a trigger, a scheduled refresh, or application code that updates all copies in lockstep. Forget one path and the copies <b>drift</b>, and a drifted copy is worse than a slow join — it is a confidently wrong answer. The read speed is real, but so is the new maintenance you have signed up for.`,
      ],
      callout: { kind: 'warn', text: 'Every duplicated fact is a consistency bug waiting to happen. If you cannot name exactly what keeps the copies in sync, do not denormalize it.' },
      changes: ['~ update anomalies return', '+ refresh / trigger to keep copies in sync', '~ drift risk on every copy'],
      metrics: { redundancy: 40, joins: 0, normalForm: '1NF', scanRows: 1200 },
      scene: { view: 'cost', note: 'The redundant copies can drift — the update anomalies normalization removed are back.' },
    },
    { // 4 — WHEN TO DO IT
      chapter: 'tradeoff', short: 'When to do it',
      title: 'Read-heavy, measured, controlled',
      body: [
        `Denormalization is a last resort, not a starting point. The signals are specific: reads vastly outnumber writes, a <em>measured</em> join is the proven bottleneck, and the copied facts change rarely. A reporting table read all day and rebuilt nightly is a textbook fit; a hot transactional row rewritten constantly is the opposite.`,
        `Keep it <b>controlled</b>. Denormalize the one query that hurts, not the whole schema, and keep the normalized tables as the source of truth so the copies can always be rebuilt from them. Done that way the change is <em>reversible</em> — drop the wide table and the normal model is still underneath, untouched.`,
      ],
      callout: { kind: 'tip', text: 'Normalize until it hurts, then denormalize until it works — and only the part that hurts. Measure first; never denormalize on a hunch.' },
      changes: ['~ reads ≫ writes, measured', '~ copied facts change rarely', '~ normalized tables stay the source of truth'],
      metrics: { redundancy: 40, joins: 0, normalForm: '1NF', scanRows: 1200 },
      scene: { view: 'when', note: 'Denormalize when reads dominate, the join is measured, and the trade stays controlled.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'A deliberate, reversible trade',
      body: [
        `Denormalization and normalization are not opposites to pick between once — they are two ends of a dial you set per workload. Normalize for correctness and cheap writes; denormalize a measured hotspot for fast reads, knowing you now own the consistency of every copy you made.`,
        `The discipline is to start normalized, keep those tables as the truth, and add redundancy only where reads prove it pays — with a named mechanism keeping the copies honest. Do that and the trade stays <b>reversible</b>: the fast path is a rebuildable layer on top of a model that is still, underneath, correct.`,
      ],
      callout: { kind: 'insight', text: 'Normalized for truth, denormalized for speed — chosen deliberately, kept reversible, and never without something keeping the copies in sync.' },
      metrics: { redundancy: 40, joins: 0, normalForm: '1NF', scanRows: 1200 },
      scene: { view: 'recap', note: 'Normalized source of truth and a denormalized read layer — a reversible trade.' },
    },
  ],
};
