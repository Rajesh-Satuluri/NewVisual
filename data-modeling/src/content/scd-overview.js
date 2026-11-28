/* content/scd-overview.js — the "Slowly-Changing Dimensions" lesson, as DATA.
   Same shape as content/third-normal-form.js: each step is { chapter, short,
   title, body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/scd-overview-scene.js and rendered through the shared course
   shell.

   This is the SETUP lesson for the SCD family: it frames the core problem —
   dimension attributes drift over time, and the modeler must decide whether to
   overwrite (lose history) or preserve it. The Types 0–6 that answer the
   question are detailed in the next lesson. */

export const scdOverviewLesson = {
  id: 'scd-overview',
  title: 'Slowly-Changing Dimensions',
  group: 'Dimensional Modeling',
  summary: 'Dimension attributes drift over time — a customer moves city, a product is recategorized. The SCD problem is whether to overwrite that change or preserve what was true when past facts were recorded.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['scdVersions', 'dimensions', 'redundancy'],
  legend: [],
  goals: [
    { text: 'Dimension attributes are not static — they change slowly over time', step: 0 },
    { text: 'Facts were recorded against the value that was true THEN', step: 1 },
    { text: 'Overwriting silently rewrites history and corrupts past totals', step: 2 },
    { text: 'The SCD question: overwrite the current truth, or preserve the old one?', step: 3 },
    { text: 'The answers form a spectrum — SCD Types 0 through 6', step: 4 },
    { text: 'Choosing an SCD type per attribute is a core dimensional decision', step: 5 },
  ],

  steps: [
    { // 0 — SETUP
      chapter: 'setup', short: 'Dimensions drift',
      title: 'A dimension attribute changes',
      body: [
        `A <span class="term">dimension</span> table holds the descriptive context a fact is measured against — who the customer is, what the product is, where the store is. We like to imagine those descriptions are fixed, but they are not: a customer <b>moves from the East region to the West</b>, a product gets <b>recategorized</b>, a sales rep changes territory.`,
        `Here is a <code>dim_customer</code> row: customer 42 lives in the <b>East</b> region. The source system reports that the same customer now lives in the <b>West</b>. The natural key <code>customer_id = 42</code> has not changed — but one of its attributes has. These changes arrive slowly and unpredictably, which is exactly why they are called <span class="term">slowly-changing dimensions</span>.`,
      ],
      callout: { kind: 'insight', text: 'A dimension is a description of the world, and the world changes. The question is not whether attributes drift, but what you do with the old value when they do.' },
      metrics: { scdVersions: 1, dimensions: 1, redundancy: 0 },
      scene: { view: 'change', note: 'dim_customer 42 — region East in the source becomes West. Same natural key, a changed attribute.' },
    },
    { // 1 — PROBLEM (facts tie to the old value)
      chapter: 'problem', short: 'Facts point back',
      title: 'Facts were recorded against the old value',
      body: [
        `A dimension never stands alone. The whole point of <code>dim_customer</code> is that <span class="term">facts</span> point at it — every order, every shipment, every payment carries <code>customer_id = 42</code> so it can be sliced by region. Those facts were recorded <em>months ago</em>, when customer 42 genuinely lived in the <b>East</b>.`,
        `So the dimension row and the facts disagree about time. The fact says "this $900 of revenue happened"; the dimension, if we change it, now says "customer 42 is West." Join them and the past revenue silently reattributes itself to a region it never came from. The <b>fact's truth is historical</b>; the question is whether the dimension still remembers the history the fact depends on.`,
      ],
      callout: { kind: 'warn', text: 'Facts are timestamped; a naive dimension is not. When the two disagree about what was true "then", your history is only as honest as your dimension.' },
      changes: ['~ fact_sales rows still carry customer_id = 42', '! those facts were booked while region = East'],
      metrics: { scdVersions: 1, dimensions: 1, redundancy: 0 },
      scene: { view: 'history', note: 'fact_sales → dim_customer: old orders were booked when customer 42 was East, and still point at that row.' },
    },
    { // 2 — PROBLEM (overwrite destroys history)
      chapter: 'problem', short: 'Overwrite lies',
      title: 'Overwrite silently rewrites the past',
      body: [
        `The simplest reaction is to <b>overwrite</b>: set <code>region = 'West'</code> in place and move on. The dimension now reflects reality — customer 42 really does live in the West today. But every historical fact still joins to that one row, so every past order customer 42 ever placed is now reported as <b>West revenue</b>.`,
        `Ask the obvious analytical question — <em>"did last quarter's revenue come from the East or the West?"</em> — and you get the wrong answer, with no error, no warning, no trace. The old value is simply gone. This is the heart of the <span class="term">SCD problem</span>: an in-place update is not a correction, it is a <b>retroactive rewrite</b> of everything that ever pointed at the row.`,
      ],
      callout: { kind: 'warn', text: 'Overwriting is lossy by construction. You did not update one row — you changed the answer to every historical question that touched it, and kept no record of having done so.' },
      changes: ['~ region: East → West (in place)', '! all past East revenue now reports as West'],
      metrics: { scdVersions: 1, dimensions: 1, redundancy: 0 },
      scene: { view: 'overwrite-problem', note: 'Overwrite region in place: the row is current, but every past fact now attributes to West. History is gone.' },
    },
    { // 3 — SOLUTION framing (preserve vs overwrite)
      chapter: 'solution', short: 'Preserve or not',
      title: 'The choice: current truth or preserved history',
      body: [
        `Every SCD technique is an answer to one question asked per attribute: <b>when the source value changes, do we keep the history or not?</b> Preserving it means a fact booked in the East stays attributed to the East, forever. Overwriting means the dimension always tells you where the customer is <em>now</em>.`,
        `Neither is universally right. For a shipping address you usually want <em>current</em> truth — mail goes to where they live today. For region-of-sale you usually want <em>history</em> — last year's numbers must stay last year's. The craft is deciding, column by column, which behaviour each attribute needs. To preserve history you generally keep <b>more than one version</b> of the row, which is where <span class="term">surrogate keys</span> and effective-date columns enter.`,
      ],
      callout: { kind: 'insight', text: 'The SCD decision is made per attribute, not per table: the same dimension can overwrite one column and version another.' },
      metrics: { scdVersions: 2, dimensions: 1, redundancy: 1 },
      scene: { view: 'spectrum', note: 'One question per attribute: overwrite for current truth, or add a version to preserve history.' },
    },
    { // 4 — TECHNIQUE (the spectrum of types)
      chapter: 'technique', short: 'A spectrum',
      title: 'The answers form a spectrum: Types 0–6',
      body: [
        `The named <span class="term">SCD types</span> are the standard answers, ordered roughly by how much history they keep. <b>Type 0</b> never changes the value at all. <b>Type 1</b> overwrites — the lossy case we just saw. <b>Type 2</b> adds a new versioned row per change, keeping full history — the workhorse. <b>Type 3</b> adds a column for the previous value — one step of history. <b>Type 4</b> moves history to a separate table. <b>Type 6</b> is a hybrid of 1, 2 and 3.`,
        `You do not have to memorise them yet — the next lesson builds each one concretely. The point here is the <b>shape</b> of the space: from "keep nothing new" (Type 0) through "keep only the current value" (Type 1) to "keep every value that was ever true" (Type 2), with Types 3, 4 and 6 as considered compromises in between.`,
      ],
      callout: { kind: 'tip', text: 'Think of the types as a dial from "no history" to "full history". Most real dimensions use Type 1 for some columns and Type 2 for the ones analysts slice time by.' },
      metrics: { scdVersions: 2, dimensions: 1, redundancy: 1 },
      scene: { view: 'types', note: 'Types 0 · 1 · 2 · 3 · 4 · 6 — a spectrum from keeping no history to keeping all of it.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'The SCD problem, in one line',
      body: [
        `Dimension attributes change slowly, and facts were recorded against the values that were true when they happened. Overwrite in place and you rewrite history silently — past totals reattribute themselves and no one is told. Preserve the old value and history stays answerable, at the cost of extra rows and keys.`,
        `That trade — <b>current truth versus preserved history</b>, decided per attribute — is the entire slowly-changing-dimension problem. The next lesson, <b>SCD Types 0–6</b>, turns the spectrum into concrete table designs: when to overwrite, when to version a new row with effective dates and an <code>is_current</code> flag, and the hybrids in between.`,
      ],
      callout: { kind: 'insight', text: 'Overwrite = lose history; version = keep it. Choose per attribute. Everything in the SCD types is just how you implement that one choice.' },
      metrics: { scdVersions: 2, dimensions: 1, redundancy: 1 },
      scene: { view: 'recap', note: 'fact_sales → dim_customer with two versions: the past fact keeps East, today reads West. History preserved.' },
    },
  ],
};
