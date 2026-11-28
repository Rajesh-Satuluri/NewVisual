/* content/role-playing-dimensions.js — the "Role-Playing Dimensions" lesson, as
   DATA. Same shape as content/third-normal-form.js: each step is { chapter,
   short, title, body[], callout, changes?, metrics, scene }. `scene` is a
   view-snapshot consumed by db/role-playing-dimensions-scene.js.

   A dimensional-modeling lesson: ONE physical dimension referenced several times
   from a single fact, each reference playing a different ROLE, surfaced through
   views/aliases so queries and BI tools can label them distinctly. */

export const rolePlayingDimensionsLesson = {
  id: 'role-playing-dimensions',
  title: 'Role-Playing Dimensions',
  group: 'Dimensional Modeling',
  summary: 'A single physical dimension table is referenced many times from one fact, each foreign key playing a different role. One dim_date serves as order date, ship date and due date — surfaced through views so each reads distinctly.',
  minutes: 7,
  level: 'intermediate',
  metrics: ['dimensions', 'facts', 'fks', 'joins'],
  legend: [],
  goals: [
    { text: 'A fact often carries several dates — each a different event', step: 0 },
    { text: 'Three copies of a calendar is three tables to maintain and drift', step: 1 },
    { text: 'One dim_date, referenced by three foreign keys, each a role', step: 2 },
    { text: 'Views alias the one dimension so each join reads distinctly', step: 3 },
    { text: 'A query joins dim_date three times, once per role', step: 4 },
    { text: 'One physical dimension, many roles — no duplicated calendars', step: 5 },
  ],

  steps: [
    { // 0 — SETUP
      chapter: 'setup', short: 'Many dates',
      title: 'One fact, several dates',
      body: [
        `A <span class="term">fact table</span> rarely names just one moment. Here is <code>fct_orders</code>, and a single order row carries three distinct dates: <code>order_date</code> (when it was placed), <code>ship_date</code> (when it left the warehouse) and <code>due_date</code> (when it is promised). Each is a real calendar date the business wants to slice by — by month, by weekday, by fiscal quarter.`,
        `Every one of those dates deserves the <em>same</em> rich calendar attributes: day name, week, month, quarter, holiday flag, fiscal period. The question is not <b>what</b> to attach to each date, but <b>how many times</b> you store that calendar. Attach a full dimension to each, or share one?`,
      ],
      callout: { kind: 'insight', text: 'Three date columns on one fact are three different events in an order’s life — not three different kinds of calendar.' },
      metrics: { dimensions: 3, facts: 1, fks: 3, joins: 0 },
      scene: { view: 'three-dates', note: 'fct_orders carries order_date, ship_date and due_date — three moments, each a real calendar date.' },
    },
    { // 1 — PROBLEM
      chapter: 'problem', short: 'Three calendars',
      title: 'Don’t clone the calendar three times',
      body: [
        `The naive fix is to build three dimension tables — <code>dim_order_date</code>, <code>dim_ship_date</code>, <code>dim_due_date</code> — each a full copy of the same calendar rows. Now the fact’s three foreign keys point at three physically separate tables that happen to hold identical data.`,
        `That is pure redundancy, and it rots. Add a new fiscal-period column, or correct a holiday flag, and you must apply the change in <em>three places</em> and keep them byte-for-byte identical. Miss one and “Q1” means something different depending on which date you grouped by. You have tripled your storage and tripled your maintenance to store the same 3,650 rows three times.`,
      ],
      callout: { kind: 'warn', text: 'Three calendar tables holding the same rows is a correctness trap: the moment they drift, the same day answers to two different quarters.' },
      changes: ['~ dim_order_date / dim_ship_date / dim_due_date all hold the same rows', '! one calendar fix → three tables to keep in sync'],
      metrics: { dimensions: 3, facts: 1, fks: 3, joins: 0 },
      scene: { view: 'one-dim', note: 'Three identical calendar tables — same rows, tripled storage, three places to drift.' },
    },
    { // 2 — TECHNIQUE
      chapter: 'technique', short: 'One dim, three FKs',
      title: 'One dim_date, referenced three times',
      body: [
        `Build the calendar <em>once</em>. A single <code>dim_date</code> holds every day with its full set of attributes. The fact’s three foreign keys — <code>order_date_key</code>, <code>ship_date_key</code>, <code>due_date_key</code> — all point at that one table’s <code>date_key</code>.`,
        `Each foreign key is the dimension playing a different <span class="term">role</span>. The same <code>dim_date</code> row for “2026-03-14” is an order date for one fact row, a ship date for another, a due date for a third. The calendar is stored once; the <b>meaning</b> of the reference comes entirely from which foreign-key column points at it.`,
      ],
      callout: { kind: 'tip', text: 'A role-playing dimension is one physical table reached through several foreign keys — the role lives in the key, not in a copy of the data.' },
      changes: ['+ dim_date (one calendar, built once)', '~ order_date_key · ship_date_key · due_date_key all → dim_date.date_key'],
      metrics: { dimensions: 1, facts: 1, fks: 3, joins: 0 },
      scene: { view: 'aliases', note: 'One dim_date, three foreign keys — the same calendar referenced in three roles.' },
    },
    { // 3 — TECHNIQUE (views)
      chapter: 'technique', short: 'Alias views',
      title: 'Surface each role as its own view',
      body: [
        `One physical table is efficient, but a report that says “<code>date_month</code>” for both order and ship dates is ambiguous, and BI tools dislike joining the same table to itself three times. The idiom is to expose <span class="term">aliased views</span>: <code>dim_order_date</code>, <code>dim_ship_date</code> and <code>dim_due_date</code> are each a thin <code>SELECT * FROM dim_date</code>, renamed.`,
        `These views are <b>zero-copy</b> — no data is duplicated, they are just labels over the one table. Now each role shows up in the semantic layer with its own name and its own columns (<code>order_month</code>, <code>ship_month</code>), so a user dragging “Ship Month” onto a chart gets exactly what they expect, while storage still holds a single calendar.`,
      ],
      callout: { kind: 'insight', text: 'Views give each role a distinct name without a distinct table — the labels are many, the physical calendar is one.' },
      changes: ['+ dim_order_date / dim_ship_date / dim_due_date as VIEWS over dim_date', '~ zero extra storage — aliases only'],
      metrics: { dimensions: 1, facts: 1, fks: 3, joins: 3 },
      scene: { view: 'query', note: 'Three views alias the one dim_date — distinct names in the BI layer, one physical table.' },
    },
    { // 4 — TRADEOFF
      chapter: 'tradeoff', short: 'Three joins',
      title: 'The query joins dim_date three times',
      body: [
        `The cost shows up in the query: to label all three dates, the fact joins <code>dim_date</code> <em>three separate times</em>, each under a different alias. “Orders placed in Q1 but due in Q2” is a perfectly natural question, and it needs two independent joins to the same calendar — one aliased <code>o</code>, one aliased <code>d</code>.`,
        `That is the right trade. The joins are on an indexed surrogate key and the dimension is tiny (a few thousand rows), so each is cheap. In exchange you keep one source of calendar truth, a fraction of the storage, and the guarantee that every role grades a date against the <em>same</em> definition of month, quarter and holiday.`,
      ],
      callout: { kind: 'tip', text: 'Self-joining one small, indexed dimension a few times is far cheaper than keeping three full calendars honest.' },
      metrics: { dimensions: 1, facts: 1, fks: 3, joins: 3 },
      scene: { view: 'recap-join', note: 'One SELECT joins dim_date three times — aliased order / ship / due — against a single calendar.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'One dimension, many roles',
      body: [
        `A role-playing dimension is one physical table referenced several times from a single fact, each reference a distinct role. Build the calendar once as <code>dim_date</code>; let <code>order_date_key</code>, <code>ship_date_key</code> and <code>due_date_key</code> all point at it; surface each role through a zero-copy aliased view so the semantic layer reads cleanly.`,
        `You store the calendar once, maintain it in one place, and still give every date its own name in reports. The pattern generalizes beyond dates — an airline fact uses one <code>dim_airport</code> as both origin and destination; an org fact uses one <code>dim_employee</code> as both worker and manager. <b>One table, many roles.</b>`,
      ],
      callout: { kind: 'insight', text: 'Store the dimension once, reference it many times, alias each role in a view. One calendar, three honest labels.' },
      metrics: { dimensions: 1, facts: 1, fks: 3, joins: 3 },
      scene: { view: 'recap', note: 'fct_orders → one dim_date in three roles — built once, aliased per role, joined per query.' },
    },
  ],
};
