/* content/cost-model.js — the "Cost Model" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/cost-model-scene.js. Rendered through the shared course shell. */

export const costModelLesson = {
  id: 'cost-model',
  title: 'Cost Model',
  group: 'Query Engine',
  summary: 'How the optimizer turns a whole plan into one comparable number — a weighted sum of I/O and CPU, driven by estimated row counts.',
  minutes: 9,
  level: 'advanced',
  metrics: ['cost', 'pages', 'rows'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why every plan is reduced to a single scalar cost', step: 0 },
    { text: 'I/O cost: pages read, sequential vs random', step: 1 },
    { text: 'CPU cost: rows processed per operator', step: 2 },
    { text: 'How node costs combine and roll up to the root', step: 3 },
    { text: 'Why row estimates drive — and distort — the whole cost', step: 4 },
  ],

  steps: [
    { // 0 — WHY
      chapter: 'technique', short: 'One number',
      title: 'Why reduce a plan to one number',
      body: [
        `The optimizer may hold dozens of valid plans for a single query. To choose, it needs to <em>compare</em> them — and you can only compare numbers. So every plan is boiled down to a single scalar: its <span class="term">estimated cost</span>.`,
        `Cost is an abstract, unit-less currency. It doesn't predict milliseconds; it just has to <b>rank</b> plans so the cheapest estimate usually is the fastest in practice.`,
      ],
      callout: { kind: 'insight', text: 'Cost exists to rank plans, not to predict wall-clock time. A good model orders plans correctly even when its absolute numbers are off.' },
      metrics: { cost: 0, pages: 0, rows: 0 },
      scene: { view: 'why', note: 'Every candidate plan collapses to one comparable number.' },
    },
    { // 1 — I/O
      chapter: 'technique', short: 'I/O cost',
      title: 'I/O cost: counting pages',
      body: [
        `The dominant term is almost always disk I/O. The model estimates how many <span class="term">pages</span> each operator reads and multiplies by a per-page weight.`,
        `Crucially, not all reads are equal: a <b>sequential</b> scan streams pages in order (cheap), while <b>random</b> access — an index chasing scattered rows — pays a much higher per-page weight.`,
      ],
      callout: { kind: 'tip', text: 'io_cost = pages × page_weight. Sequential pages are weighted far below random ones — which is why a scan can beat an index.' },
      changes: ['+ pages read × page weight', '~ sequential cheaper than random'],
      metrics: { cost: 120, pages: 240, rows: 0 },
      scene: { view: 'io', note: 'Pages read drive the I/O term; sequential beats random.' },
    },
    { // 2 — CPU
      chapter: 'technique', short: 'CPU cost',
      title: 'CPU cost: counting rows',
      body: [
        `On top of I/O, every operator burns CPU per row it touches: comparing a predicate, hashing a key, copying a projected column. The model multiplies estimated <span class="term">rows</span> by a per-row weight.`,
        `A hash join that probes 1.4M rows, or a filter evaluated on every scanned row, adds CPU cost proportional to those row counts.`,
      ],
      callout: { kind: 'tip', text: 'cpu_cost = rows × row_weight. Operators that touch more rows cost more CPU, independent of how many pages they read.' },
      changes: ['+ rows processed × row weight'],
      metrics: { cost: 180, pages: 240, rows: 1400 },
      scene: { view: 'cpu', note: 'Each operator adds CPU cost for every row it processes.' },
    },
    { // 3 — COMBINE
      chapter: 'technique', short: 'Combine',
      title: 'Combine and roll up the tree',
      body: [
        `Each node's cost is its own I/O + CPU <b>plus the cost of its children</b>. The executor pulls rows up the tree, so cost accumulates the same way: leaves first, then joins, then the final projection.`,
        `The number attached to the <b>root</b> is the plan's total cost — the one figure the optimizer compares against every rival plan.`,
      ],
      callout: { kind: 'insight', text: 'Plan cost is recursive: cost(node) = io(node) + cpu(node) + Σ cost(children). The root holds the grand total.' },
      changes: ['+ child costs roll into parents', '+ root = total plan cost'],
      metrics: { cost: 260, pages: 240, rows: 1400 },
      scene: { view: 'combine', note: 'Leaf → join → filter → project: costs sum to the root.' },
    },
    { // 4 — CARDINALITY
      chapter: 'technique', short: 'Cardinality',
      title: 'Row estimates drive everything',
      body: [
        `Both terms hinge on one guess: how many rows each operator emits — its <span class="term">cardinality</span>. Get a leaf's row estimate wrong and every node above it inherits the error.`,
        `A single under-estimate low in the tree can make a disastrous plan look cheap. This is why bad statistics are the number-one cause of a slow query: the cost model faithfully computes the wrong answer.`,
      ],
      callout: { kind: 'warn', text: 'Estimate errors compound upward. A 10× mistake at a leaf can become a 1000× mistake at the root — and the optimizer trusts it completely.' },
      changes: ['~ every node depends on row estimates', '- errors compound up the tree'],
      metrics: { cost: 9000, pages: 240, rows: 1400 },
      scene: { view: 'cardinality', note: 'A bad row estimate low in the tree distorts the whole cost.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'cost = f(I/O, CPU, rows)',
      body: [
        `A cost model is a deliberately simple formula — pages weighted for I/O, rows weighted for CPU, summed up the tree — whose only job is to <b>order plans correctly</b>.`,
        `It is only as good as its row estimates, which is why the next lessons on statistics and estimation matter so much: better inputs, better plans.`,
      ],
      callout: { kind: 'insight', text: 'Durable takeaway: cost = I/O + CPU, weighted by estimated rows, rolled up to the root. Good stats in, good plans out.' },
      metrics: { cost: 260, pages: 240, rows: 1400 },
      scene: { view: 'recap', note: 'One number per plan — only as trustworthy as its estimates.' },
    },
  ],
};
