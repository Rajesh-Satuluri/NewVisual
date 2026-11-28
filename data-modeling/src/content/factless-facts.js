/* content/factless-facts.js — the "Factless Fact Tables" lesson, as DATA. Same
   shape as content/third-normal-form.js. `scene` is a view-snapshot consumed by
   db/factless-facts-scene.js.

   A dimensional-modeling lesson: a fact table with NO measures — just foreign keys.
   Two kinds: event tracking (count the rows) and coverage/condition (what could
   happen, used to answer "what did NOT happen"). */

export const factlessFactsLesson = {
  id: 'factless-facts',
  title: 'Factless Fact Tables',
  group: 'Dimensional Modeling',
  summary: 'A factless fact table has no measures — only foreign keys. One kind records that an event happened (count the rows); the other records what could happen, so you can ask what did NOT happen by comparing coverage against events.',
  minutes: 7,
  level: 'intermediate',
  metrics: ['facts', 'dimensions', 'grain', 'rows'],
  legend: [],
  goals: [
    { text: 'A fact table can hold foreign keys and no measures at all', step: 0 },
    { text: 'An event fact records that something happened — the row is the fact', step: 1 },
    { text: 'The implied measure is COUNT(*) = 1 per row', step: 2 },
    { text: 'A coverage fact records what could happen, not what did', step: 3 },
    { text: 'Compare coverage against events to find what did NOT happen', step: 4 },
    { text: 'No measures, just keys — count rows, or count the gap', step: 5 },
  ],

  steps: [
    { // 0 — SETUP
      chapter: 'setup', short: 'No measures',
      title: 'A fact table with no measures',
      body: [
        `Most fact tables have measures — amounts, quantities, prices — numeric columns you sum and average. A <span class="term">factless fact table</span> has <b>none</b>. It is a fact table made entirely of foreign keys: it records a relationship between dimensions at a moment, and carries no numeric column at all.`,
        `Here is <code>fct_attendance</code>: a row says <em>student S attended class C on date D</em>. There is no “how much” to store — the row either exists or it doesn’t. That absence of a measure is not a design flaw; it is the whole idea.`,
      ],
      callout: { kind: 'insight', text: 'A factless fact has no numeric column — the foreign keys alone record that a combination of dimensions came together.' },
      metrics: { facts: 1, dimensions: 3, grain: 'event', rows: '1 per attendance' },
      scene: { view: 'no-measures', note: 'fct_attendance — only foreign keys, no measure column. The row itself is the fact.' },
    },
    { // 1 — TECHNIQUE (event)
      chapter: 'technique', short: 'Event fact',
      title: 'The row’s existence is the event',
      body: [
        `The first kind is <span class="term">event tracking</span>. Each row records that an event <em>occurred</em>: a student attended, a customer clicked an ad, a patient saw a doctor. The event has no natural magnitude — attending a class isn’t “worth” 3 or 7 of anything — so there is nothing to measure except that it happened.`,
        `The grain is one row per event, and the foreign keys pin down <b>who, what, and when</b>. You answer questions by filtering and <em>counting rows</em>: attendance by student, by class, by week all fall out of counting the rows that match.`,
      ],
      callout: { kind: 'tip', text: 'For an event fact, the existence of the row is the measurement. You never sum a column — you count rows.' },
      changes: ['+ fct_attendance(student_key, class_key, date_key)', '~ grain: one row per attendance event'],
      metrics: { facts: 1, dimensions: 3, grain: 'event', rows: 'count them' },
      scene: { view: 'event', note: 'Each row = one attendance event. Who, what, when — and nothing else to store.' },
    },
    { // 2 — TECHNIQUE (count)
      chapter: 'technique', short: 'COUNT(*)=1',
      title: 'The implied measure is COUNT(*)',
      body: [
        `Though the table has no measure column, every query behaves as if it has one: an implied measure of <b>1</b> on every row. “How many students attended this class?” is <code>COUNT(*)</code> filtered to that class. The measure you never stored is reconstructed, one per row, at query time.`,
        `Some modelers even add a literal <code>attendance_count</code> column hard-coded to 1 so BI tools that insist on a numeric measure have something to point at. It changes nothing semantically — <code>SUM(attendance_count)</code> equals <code>COUNT(*)</code> — but it makes the “measure” explicit for tools that expect one.`,
      ],
      callout: { kind: 'insight', text: 'The measure is COUNT(*) = 1 — implicit on every row. Counting rows is the only aggregation a factless event table needs.' },
      metrics: { facts: 1, dimensions: 3, grain: 'event', rows: 'COUNT(*)' },
      scene: { view: 'count', note: 'No measure column — so the measure is COUNT(*), an implied 1 on every row.' },
    },
    { // 3 — TECHNIQUE (coverage)
      chapter: 'technique', short: 'Coverage fact',
      title: 'Coverage: what could have happened',
      body: [
        `The second kind is the <span class="term">coverage</span> (or condition) fact. Instead of recording what <em>did</em> happen, it records what <em>could</em> — the eligible combinations. <code>fct_promo_coverage</code> holds one row per <b>product on promotion, per store, per week</b>, regardless of whether that product sold a single unit.`,
        `This too is factless — just the keys that define eligibility. On its own it looks pointless: a list of things that were <em>possible</em>. Its power only appears when you set it beside the event fact that records what actually occurred.`,
      ],
      callout: { kind: 'tip', text: 'A coverage fact records the eligible combinations — what was possible — so you have a denominator to compare events against.' },
      changes: ['+ fct_promo_coverage(product_key, store_key, week_key)', '~ one row per eligible promotion, sold or not'],
      metrics: { facts: 2, dimensions: 3, grain: 'condition', rows: 'eligible set' },
      scene: { view: 'coverage', note: 'fct_promo_coverage — one row per product-on-promotion, whether it sold or not.' },
    },
    { // 4 — SOLUTION (what didn't happen)
      chapter: 'technique', short: 'The gap',
      title: 'Answer “what did NOT happen”',
      body: [
        `An event fact can only tell you about rows that exist — it is silent about non-events. “Which promoted products sold <em>nothing</em> this week?” cannot be answered from the sales fact alone, because a product that sold nothing has <b>no row there</b>.`,
        `With both tables, it becomes a set difference: take <code>fct_promo_coverage</code> (everything eligible) and subtract the products that appear in <code>fct_sales</code> (everything that sold). What’s left — coverage minus events — is exactly the promotions that drew <b>zero</b> sales. The coverage fact supplies the universe; the gap between it and the events is the answer.`,
      ],
      callout: { kind: 'insight', text: 'Coverage minus events = what did not happen. The non-event is invisible until a coverage fact gives it a row to be missing from.' },
      metrics: { facts: 2, dimensions: 3, grain: 'condition', rows: 'coverage − events' },
      scene: { view: 'what-didnt-happen', note: 'Coverage (eligible) minus events (sold) = promotions that sold nothing.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'No measures, just keys',
      body: [
        `A factless fact table carries foreign keys and no measures. The <b>event</b> kind records that something happened — the row is the fact, and you count rows, an implied <code>COUNT(*) = 1</code>. The <b>coverage</b> kind records what was eligible, and set against an event fact it answers the question events alone cannot: what did <em>not</em> happen.`,
        `Both are first-class members of a dimensional model. When you find yourself storing a relationship with nothing to sum — an attendance, an eligibility, an exposure — don’t invent a fake measure. Build a factless fact, and let counting rows, or counting the gap, do the work.`,
      ],
      callout: { kind: 'insight', text: 'Keys, no measures: count the rows for what happened, count coverage minus events for what didn’t.' },
      metrics: { facts: 2, dimensions: 3, grain: 'event', rows: 'count / gap' },
      scene: { view: 'recap', note: 'Two factless facts — events you count, coverage you subtract from — both just keys, no measures.' },
    },
  ],
};
