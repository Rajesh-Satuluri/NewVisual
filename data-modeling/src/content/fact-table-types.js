/* content/fact-table-types.js — the "Transaction · Periodic · Accumulating"
   lesson, as DATA. Same shape as content/third-normal-form.js: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.

   Kimball's three fact-table grains. A fact table can measure a business
   process in exactly one of three ways, and the choice decides how rows are
   inserted, whether they are ever updated, and which measures you may safely
   add up. Rendered by db/fact-table-types-scene.js. */

export const factTableTypesLesson = {
  id: 'fact-table-types',
  title: 'Transaction · Periodic · Accumulating',
  group: 'Dimensional Modeling',
  summary: 'Every fact table is one of three grains — transaction, periodic snapshot, or accumulating snapshot. The grain you pick decides how rows are written, whether they are updated, and which measures are safe to sum.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['facts', 'grain', 'rows', 'fks'],
  legend: [],
  goals: [
    { text: 'A transaction fact stores one immutable row per discrete event', step: 0 },
    { text: 'A periodic snapshot samples state at a regular interval', step: 1 },
    { text: 'An accumulating snapshot has one updatable row per process instance', step: 2 },
    { text: 'The three grains differ in write pattern, not just in shape', step: 3 },
    { text: 'The grain decides which measures are additive, semi-, or non-additive', step: 4 },
    { text: 'Pick the grain from the question the business is asking', step: 5 },
  ],

  steps: [
    { // 0 — SETUP · transaction
      chapter: 'setup', short: 'One row per event',
      title: 'The transaction fact: a row per discrete event',
      body: [
        `The <span class="term">transaction fact table</span> is the workhorse grain: it records <b>one row for each discrete event</b> as it happens — a single sale line, a payment, a click. <code>fact_sales</code> here is keyed by a surrogate <code>sale_id</code>, carries foreign keys to the product, store and date dimensions, and measures <code>quantity</code> and <code>net_amount</code>.`,
        `This is the <em>finest</em> grain a process can have, and its defining property is that rows are <b>inserted once and never updated</b>. Nothing about a completed sale line changes after the fact. Because every atomic event is preserved, you can roll these facts up any way a dimension allows — by day, by store, by category — without ever having pre-decided the answer.`,
      ],
      callout: { kind: 'insight', text: 'A transaction fact is an append-only ledger of events. Immutable rows at the finest grain give you the most analytic freedom you will ever have.' },
      metrics: { facts: 2, grain: 'event', rows: '120M', fks: 3 },
      scene: { view: 'transaction', note: 'fact_sales — one immutable row per sale line, keyed by sale_id, measures quantity and net_amount.' },
    },
    { // 1 — TECHNIQUE · periodic
      chapter: 'technique', short: 'Snapshot per period',
      title: 'The periodic snapshot: state sampled on a clock',
      body: [
        `Some questions are not about events but about <em>state</em> — “what was every account’s balance at the close of each day?” You cannot answer that from transactions cheaply: you would re-sum an entire ledger per account per day. The <span class="term">periodic snapshot</span> instead stores <b>one row per entity per regular period</b>. <code>fact_account_daily</code> has a row for each <code>account_key</code> on each <code>snapshot_date</code>, holding the <code>balance</code> as sampled at that instant.`,
        `Rows are still inserted and not updated, but they are dense and predictable: if you have 2M accounts, you add 2M rows every single day whether or not anything happened to each account. The snapshot trades the event detail away for a cheap, uniform answer to “what was the state at period N”.`,
      ],
      callout: { kind: 'insight', text: 'A periodic snapshot samples the world on a clock, not on an event. One row per entity per period, regular as a heartbeat — present even for a day of no activity.' },
      changes: ['+ snapshot_date — the period being sampled', '~ one row per account every period, event or not'],
      metrics: { facts: 2, grain: 'day', rows: '730M', fks: 2 },
      scene: { view: 'periodic', note: 'fact_account_daily — one row per account per day, carrying the balance sampled at period close.' },
    },
    { // 2 — TECHNIQUE · accumulating
      chapter: 'technique', short: 'Row per process',
      title: 'The accumulating snapshot: one updatable row per process',
      body: [
        `The third grain tracks a <em>process with milestones</em> — an order that is placed, then shipped, then delivered. The <span class="term">accumulating snapshot</span> stores <b>one row per process instance</b> and carries <b>several date foreign keys</b>, one per milestone: <code>order_date_key</code>, <code>ship_date_key</code>, <code>deliver_date_key</code>.`,
        `Here the rule inverts: this row <b>is updated</b> as the process advances. It is born when the order is placed, with the later date keys pointing at an “unknown/future” member; each milestone fills in its key and refreshes the lag measures — <code>order_to_ship_days</code>, <code>ship_to_deliver_days</code>. One row walks the whole pipeline, so you can ask “how long does the average order sit between shipped and delivered?” directly.`,
      ],
      callout: { kind: 'tip', text: 'An accumulating snapshot is a mutable row that follows one process to completion. Multiple date FKs plus lag columns turn a pipeline into a single, measurable line.' },
      changes: ['+ order_date / ship_date / deliver_date FKs', '! row UPDATED in place as milestones complete'],
      metrics: { facts: 2, grain: 'process', rows: '40M', fks: 3 },
      scene: { view: 'accumulating', note: 'fact_order_pipeline — one row per order, multiple date FKs updated as it ships and delivers; lag measured in place.' },
    },
    { // 3 — TECHNIQUE · compare
      chapter: 'technique', short: 'Three side by side',
      title: 'Three grains, three write patterns',
      body: [
        `Lined up, the three are easy to tell apart by <b>how rows behave over time</b>, not by how they look at rest. <span class="term">Transaction</span>: insert one row per event, never touch it again. <span class="term">Periodic</span>: insert one dense row per entity per period, never touch it again. <span class="term">Accumulating</span>: insert one row per process, then <em>update</em> it repeatedly until the process ends.`,
        `The accumulating grain is the only one that re-writes rows, which is exactly why it is the one you reach for when the measure you care about is the <b>lag between milestones</b>. The other two are append-only and scale to billions of rows precisely because nothing is ever revisited.`,
      ],
      callout: { kind: 'insight', text: 'Shape alone will not tell you the grain — ask whether a row, once written, is ever updated. Only the accumulating snapshot says yes.' },
      metrics: { facts: 2, grain: '3 types', rows: '890M', fks: 3 },
      scene: { view: 'compare', note: 'Transaction · Periodic · Accumulating — distinguished by write pattern: insert-only, insert-only, or insert-then-update.' },
    },
    { // 4 — TRADEOFF · additivity
      chapter: 'tradeoff', short: 'Additivity',
      title: 'The grain decides what you may add up',
      body: [
        `Each grain carries an <span class="term">additivity</span> contract. A transaction measure like <code>net_amount</code> is <b>fully additive</b> — sum it across any and every dimension and the total is meaningful. A periodic snapshot’s <code>balance</code> is <b>semi-additive</b>: you may add balances across accounts, but <em>never</em> across time, because summing Monday’s and Tuesday’s balance is nonsense — you want the latest, or an average.`,
        `Lags and ratios in the accumulating snapshot are often <b>non-additive</b>: you cannot sum “days to ship”, you average it. Getting this wrong produces reports that are confidently, invisibly false. The grain is therefore not a storage detail — it tells every downstream query which aggregations are legal.`,
      ],
      callout: { kind: 'warn', text: 'Summing a semi-additive balance across time is the classic silent error. The grain, not the column type, tells you which SUM is a lie.' },
      metrics: { facts: 2, grain: 'additivity', rows: '890M', fks: 3 },
      scene: { view: 'additivity', note: 'Additive · semi-additive · non-additive — the grain, not the data type, says which measures you may safely sum.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Choose the grain from the question',
      body: [
        `Three grains, chosen by the question the business asks. “What happened, and when?” → a <b>transaction</b> fact, append-only at the event grain. “What was the state at the end of each period?” → a <b>periodic snapshot</b>, one dense row per entity per period. “How long does this process take, and where does it stall?” → an <b>accumulating snapshot</b>, one row per instance updated through its milestones.`,
        `Match the grain to the measure, respect each one’s additivity, and the fact table answers its questions cheaply and honestly. The next lessons build the other half of the star — the <b>dimensions</b> these facts point at, and the discipline of <b>declaring the grain</b> before you choose either.`,
      ],
      callout: { kind: 'insight', text: 'Transaction for events, periodic for state, accumulating for pipelines. The question picks the grain; the grain picks everything else.' },
      metrics: { facts: 2, grain: '3 types', rows: '890M', fks: 3 },
      scene: { view: 'recap', note: 'Transaction · Periodic · Accumulating — one process, three possible fact grains, each answering a different question.' },
    },
  ],
};
