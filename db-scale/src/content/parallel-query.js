/* content/parallel-query.js — the "Parallel Query" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/parallel-query-scene.js. Rendered through the shared course shell. */

export const parallelQueryLesson = {
  id: 'parallel-query',
  title: 'Parallel Query',
  group: 'Query Engine',
  summary: 'Split one query across several worker processes so many CPU cores attack the data at once — and learn why the speed-up is never quite linear.',
  minutes: 9,
  level: 'advanced',
  metrics: ['workers', 'rows', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why one query can be split across worker processes', step: 0 },
    { text: 'Parallel scan: each worker takes a slice of the pages', step: 1 },
    { text: 'Gather: merging the workers’ partial streams', step: 2 },
    { text: 'Partial aggregation — pre-aggregate, then combine', step: 3 },
    { text: 'Why speed-up is sublinear (Amdahl, skew, coordination)', step: 4 },
  ],

  steps: [
    { // 0 — IDEA
      chapter: 'technique', short: 'Split work',
      title: 'One query, many workers',
      body: [
        `A single big query — <code>SELECT COUNT(*) FROM orders WHERE total &gt; 100</code> over millions of rows — doesn’t have to run on one CPU core. The planner can mark part of the plan <span class="term">parallel</span> and hand copies of it to several <b>worker</b> processes.`,
        `One <em>leader</em> coordinates; each worker runs the same operator on a different chunk of the data. The clock time to answer drops roughly in proportion to how many workers you can keep busy.`,
      ],
      callout: { kind: 'insight', text: 'Parallelism trades extra CPU cores and coordination for lower wall-clock latency on a single large query.' },
      metrics: { workers: 3, rows: 4000000, latency: 900 },
      scene: { view: 'idea', note: 'One query, handed to three workers under a leader.' },
    },
    { // 1 — PARALLEL SCAN
      chapter: 'technique', short: 'Parallel scan',
      title: 'Each worker scans a slice',
      body: [
        `The simplest thing to parallelise is the scan. The table’s pages are divided into disjoint <span class="term">slices</span>, and each worker sequentially scans only its own slice — reading, filtering (<code>total &gt; 100</code>), and emitting matching rows.`,
        `No page is read twice, and the workers never touch each other’s data, so no locking is needed between them. Three workers scan a third of the table each, so the scan finishes in roughly a third of the time.`,
      ],
      callout: { kind: 'tip', text: 'A parallel sequential scan partitions pages across workers. Disjoint slices → no coordination while scanning.' },
      changes: ['+ pages split into N disjoint slices', '~ each worker scans one slice', '− scan wall-time ÷ N'],
      metrics: { workers: 3, rows: 4000000, latency: 340 },
      scene: { view: 'scan', note: 'Eight pages, three workers — a slice each.' },
    },
    { // 2 — GATHER
      chapter: 'technique', short: 'Gather',
      title: 'Gather the partial streams',
      body: [
        `Each worker produces a <em>partial</em> result stream. A <span class="term">Gather</span> node sits at the top of the parallel part of the plan and merges those streams back into one, which the leader returns to the client.`,
        `Above the Gather the plan is serial again; below it, it is parallel. Where that boundary sits — how much work happens below the Gather — decides how much the query actually benefits.`,
      ],
      callout: { kind: 'insight', text: 'Gather is the seam between the parallel region (below) and the serial region (above). Push expensive work below it.' },
      changes: ['+ Gather node merges worker streams', '~ parallel below · serial above'],
      metrics: { workers: 3, rows: 4000000, latency: 340 },
      scene: { view: 'gather', note: 'Three partial streams merge at the Gather.' },
    },
    { // 3 — PARTIAL AGGREGATION
      chapter: 'technique', short: 'Partial agg',
      title: 'Pre-aggregate, then combine',
      body: [
        `For an aggregate like <code>COUNT(*)</code> you don’t want every matching row to cross the Gather — that would make the leader the bottleneck. Instead each worker does a <span class="term">partial aggregation</span>: it counts its own slice and emits a single partial count.`,
        `The leader then runs a tiny <b>finalise</b> step that just sums the three partials. A few rows cross the Gather instead of millions — the whole point of pushing aggregation below it.`,
      ],
      callout: { kind: 'tip', text: 'Partial aggregate below Gather, finalise above it. N partial results cross the seam instead of N million rows.' },
      changes: ['+ each worker emits a partial COUNT', '+ leader finalises (sums partials)', '− rows crossing Gather: millions → 3'],
      metrics: { workers: 3, rows: 3, latency: 310 },
      scene: { view: 'partial', note: 'Each worker counts its slice; the leader sums three partials.' },
    },
    { // 4 — LIMITS
      chapter: 'tradeoff', short: 'Limits',
      title: 'Why it is never N× faster',
      body: [
        `Doubling the workers does not halve the time. The <b>serial part</b> of the query (planning, the finalise step, returning rows) can’t be sped up — <span class="term">Amdahl’s law</span> caps the gain. Starting and coordinating workers costs time too.`,
        `Worst of all is <span class="term">skew</span>: if one worker’s slice happens to hold most of the matching rows, everyone else finishes early and waits for it. The query is only as fast as its slowest worker.`,
      ],
      callout: { kind: 'warn', text: 'Speed-up is sublinear: serial sections (Amdahl), startup and coordination overhead, and data skew all cap it.' },
      metrics: { workers: 4, rows: 4000000, latency: 300 },
      scene: { view: 'limits', note: 'A skewed slice leaves one worker doing most of the work.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'More cores, less wall-time',
      body: [
        `Parallel query splits a plan below a <b>Gather</b>: workers scan disjoint slices, optionally <b>pre-aggregate</b>, and the leader merges and finalises. It turns spare CPU cores into lower latency for one heavy query.`,
        `Use it for big scans, joins and aggregates; expect sublinear speed-up, and watch for skew. Next the module turns to the <span class="term">statistics</span> and <span class="term">cost model</span> that let the optimiser decide when parallelism — and every other choice — is worth it.`,
      ],
      callout: { kind: 'insight', text: 'Split below Gather, combine above it. Great for large scans/joins/aggregates; always sublinear, never free.' },
      metrics: { workers: 3, rows: 4000000, latency: 320 },
      scene: { view: 'recap', note: 'Table → workers → Gather → one answer.' },
    },
  ],
};
