/* content/degenerate-junk-dimensions.js — the "Degenerate & Junk Dimensions"
   lesson, as DATA. Same shape as content/third-normal-form.js. `scene` is a
   view-snapshot consumed by db/degenerate-junk-dimensions-scene.js.

   Two tidy-up patterns for the fact table: a degenerate dimension (a
   dimension-like key with no table to join to) and a junk dimension (many
   low-cardinality flags collapsed into one small dimension of distinct
   combinations). */

export const degenerateJunkDimensionsLesson = {
  id: 'degenerate-junk-dimensions',
  title: 'Degenerate & Junk Dimensions',
  group: 'Dimensional Modeling',
  summary: 'A degenerate dimension is a dimension key that lives in the fact with no table to join to, like an order number. A junk dimension folds many scattered low-cardinality flags into one small dimension of distinct combinations.',
  minutes: 7,
  level: 'intermediate',
  metrics: ['dimensions', 'facts', 'cardinality', 'columns'],
  legend: [],
  goals: [
    { text: 'A degenerate dimension is a dimension key with no dimension table', step: 0 },
    { text: 'It groups a fact\'s line items and needs no attributes of its own', step: 1 },
    { text: 'Low-cardinality flags scattered across the fact clutter and bloat it', step: 2 },
    { text: 'A junk dimension collects the distinct flag combinations into one table', step: 3 },
    { text: 'The fact keeps one small FK instead of many flag columns', step: 4 },
    { text: 'Both patterns tidy the fact table without inventing needless dimensions', step: 5 },
  ],

  steps: [
    { // 0 — SETUP degenerate
      chapter: 'setup', short: 'A key, no table',
      title: 'A dimension key with nothing to join to',
      body: [
        `In a sales fact at the line-item grain, every row carries an <code>order_number</code>. It <em>looks</em> like a foreign key to a dimension — it identifies something, it groups rows — but build the <code>dim_order</code> table it would point at and you find it has <b>no attributes</b>. The order's date is already a date dimension, its customer is already a customer dimension; everything descriptive has been factored out elsewhere.`,
        `What's left is just the identifier itself. Rather than keep a pointless one-column dimension table (a surrogate key joining to the same natural key and nothing else), you leave the <code>order_number</code> <b>in the fact table</b> as a dimension in its own right. This is a <span class="term">degenerate dimension</span>: a dimension that has degenerated to nothing but its key.`,
      ],
      callout: { kind: 'insight', text: 'A degenerate dimension is a dimension key stripped of all its attributes. The identifier still earns its place in the fact; the empty table it would join to does not.' },
      metrics: { dimensions: 0, facts: 1, cardinality: 'high', columns: 1 },
      scene: { view: 'degenerate', note: 'fact_sales carries order_number — a dimension key with no dim_order table behind it.' },
    },
    { // 1 — why it's useful
      chapter: 'solution', short: 'Groups line items',
      title: 'It groups the fact without a join',
      body: [
        `The degenerate <code>order_number</code> still does real work: it <b>ties a fact's line items together</b>. "How many lines on this order?", "what was this basket's total?", "which orders contained both A and B?" — all answered by grouping the fact on <code>order_number</code>, with no join at all. The same pattern covers <code>invoice_number</code>, <code>ticket_id</code>, <code>transaction_id</code>, <code>shipment_id</code>.`,
        `Because it is high-cardinality (one value per order) and carries no describable attributes, inventing a dimension for it would only add a join that returns nothing useful. Keeping it in the fact is both cheaper and clearer: the fact table is the natural home for the operational identifier that generated its rows.`,
      ],
      callout: { kind: 'tip', text: 'Group on the degenerate key for order/basket/ticket-level rollups. No dimension table means no join — the identifier lives where the grain was set.' },
      changes: ['~ order_number stays in fact_sales', '+ GROUP BY order_number — basket rollups, no join'],
      metrics: { dimensions: 0, facts: 1, cardinality: 'high', columns: 1 },
      scene: { view: 'degenerate', note: 'GROUP BY order_number rolls line items up to the order — a degenerate dimension, no join.' },
    },
    { // 2 — PROBLEM scattered flags
      chapter: 'problem', short: 'Scattered flags',
      title: 'Low-cardinality flags scattered everywhere',
      body: [
        `Now the mess. The same fact accumulates a drift of small <span class="term">flags</span> and indicators: <code>is_gift</code> (Y/N), <code>payment_type</code> (card / cash / voucher), <code>order_channel</code> (web / app / store), <code>is_promo</code> (Y/N). Each has only a handful of distinct values, yet each lands as its own fact column — or worse, each gets its own tiny one-or-two-row dimension.`,
        `Both options are bad. Scattered across the fact, these columns <b>bloat its width</b> and offer no tidy place to attach labels or groupings. Scattered as separate mini-dimensions, you get a clutter of trivial tables and a fistful of foreign keys on the fact. Neither has enough substance to deserve a dimension of its own, but together they still need a home.`,
      ],
      callout: { kind: 'warn', text: 'A pile of two-value flags is too thin for its own dimension and too messy left loose in the fact. Individually they are noise; collectively they are a dimension.' },
      changes: ['~ is_gift, payment_type, order_channel, is_promo in the fact', '! four thin columns / four trivial dims'],
      metrics: { dimensions: 4, facts: 1, cardinality: 'low', columns: 4 },
      scene: { view: 'flags-scattered', note: 'Four low-cardinality flags loose in the fact (or as four trivial dims) — clutter with no good home.' },
    },
    { // 3 — TECHNIQUE junk dimension
      chapter: 'technique', short: 'Fold them up',
      title: 'Fold the flags into one junk dimension',
      body: [
        `The fix is a <span class="term">junk dimension</span>: a single small table that holds the <b>distinct combinations</b> of those flags. Enumerate the realistic combinations of <code>is_gift × payment_type × order_channel × is_promo</code> — a few dozen rows at most — give each a surrogate key <code>junk_sk</code>, and you have one compact dimension covering all of them.`,
        `The fact now carries <b>one foreign key</b>, <code>junk_sk</code>, in place of four flag columns. The Cartesian product is bounded because real cardinalities are tiny (2 × 3 × 3 × 2 = 36 rows), and you only store combinations that actually occur. "Junk" is affectionate, not pejorative — it is a deliberate, tidy home for the odds and ends that would otherwise litter the fact.`,
      ],
      callout: { kind: 'insight', text: 'A junk dimension is the garbage-collection of flags: many low-cardinality indicators become one small dimension of their distinct combinations, reached by a single FK.' },
      changes: ['+ dim_junk(junk_sk, is_gift, payment_type, order_channel, is_promo)', '~ fact keeps only junk_sk'],
      metrics: { dimensions: 1, facts: 1, cardinality: 'low', columns: 1 },
      scene: { view: 'junk', note: 'dim_junk holds the distinct flag combinations; each gets a junk_sk surrogate key.' },
    },
    { // 4 — the combined result
      chapter: 'tradeoff', short: 'The clean fact',
      title: 'Two slim keys, one tidy fact',
      body: [
        `Put both patterns together and the fact table is clean. It keeps its measures, its real dimension FKs (date, customer, product), the <b>degenerate</b> <code>order_number</code> it needs no table for, and <b>one</b> junk FK standing in for the whole flag collection. Width drops; meaning rises.`,
        `The judgement call is when a flag has grown up. If <code>payment_type</code> starts needing its own attributes — a processor name, a settlement delay, a fee schedule — it has outgrown the junk dimension and deserves a real one. Until then, folding it in keeps the model honest: dimensions exist for things worth describing, not for every column that happens to hold a code.`,
      ],
      callout: { kind: 'tip', text: 'Promote a flag out of the junk dimension the moment it earns real attributes. Degenerate keys and junk dimensions keep you from minting dimensions that describe nothing.' },
      changes: ['+ fact: order_number (degenerate) + junk_sk (junk)', '~ four flag columns → one FK'],
      metrics: { dimensions: 1, facts: 1, cardinality: 'low', columns: 1 },
      scene: { view: 'combined', note: 'fact_sales with a degenerate order_number and a single junk_sk — both tidy-ups applied.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Two ways to keep a fact tidy',
      body: [
        `Two patterns, one goal — stop the fact table from sprouting needless structure. A <b>degenerate dimension</b> is a dimension key with no table behind it: keep the <code>order_number</code> / <code>invoice_number</code> / <code>ticket_id</code> in the fact to group its line items, because the dimension it would point at has no attributes. A <b>junk dimension</b> collapses many low-cardinality flags into one small table of distinct combinations, replacing a scatter of flag columns with a single FK.`,
        `Both are restraint, not laziness: they refuse to create dimensions that describe nothing. Use the degenerate key when the identifier is all that's left, and the junk dimension when a handful of flags are each too thin to stand alone but too useful to leave loose.`,
      ],
      callout: { kind: 'insight', text: 'Degenerate = a key with no table; junk = many thin flags in one small table. Both keep dimensions meaningful and the fact lean.' },
      metrics: { dimensions: 1, facts: 1, cardinality: 'low', columns: 1 },
      scene: { view: 'recap', note: 'Degenerate order_number + a single junk_sk — the fact stays lean, dimensions stay meaningful.' },
    },
  ],
};
