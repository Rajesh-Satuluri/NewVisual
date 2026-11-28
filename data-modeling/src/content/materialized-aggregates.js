/* content/materialized-aggregates.js — "Materialized Aggregates", as DATA.
   NoSQL has no GROUP BY / aggregate-on-read at scale, so you PRE-COMPUTE and STORE
   aggregates and maintain them ON WRITE. Its scene lives on the NoSQL canvas: a
   partition full of raw events versus one maintained counter item, O(1) on read. */

export const materializedAggregatesLesson = {
  id: 'materialized-aggregates',
  title: 'Materialized Aggregates',
  group: 'NoSQL & Access-Pattern Modeling',
  summary: 'NoSQL has no GROUP BY you can run over a whole partition at read time, so you pre-compute totals and keep them in a counter or summary item, updated on every write. The read becomes O(1) at the price of write-time work and the risk of drift.',
  minutes: 7,
  level: 'intermediate',
  metrics: ['itemsRead', 'requests', 'writeAmp', 'staleness'],
  legend: [],
  goals: [
    { text: 'A common read wants a total — a count, a sum, a "top N"', step: 0 },
    { text: 'There is no aggregate-on-read at scale: COUNT(*) would scan the partition', step: 1 },
    { text: 'Pre-compute the aggregate and update it incrementally on every write', step: 2 },
    { text: 'The read is now a single O(1) lookup of the maintained counter', step: 3 },
    { text: 'The counter can drift from the truth — atomicity and reconciliation', step: 4 },
    { text: 'Materialize the aggregate the reads need; pay the cost on write', step: 5 },
  ],

  steps: [
    { // 0 SETUP
      chapter: 'setup', short: 'The read wants a total',
      title: 'The read wants a total',
      body: [
        `Half the queries an application runs are not "fetch this record" but "how many?" — the <span class="term">like count</span> on a post, the number of items in a cart, a running total of revenue, the top-ten trending tags. Each of these is an <b>aggregate</b>: one number computed from many underlying rows.`,
        `Here the access pattern is dead simple to state — <code>show the like count for post#9</code> — and it is read constantly, on every render of the feed. The raw truth lives as one <code>LIKE</code> item per user who liked the post, piling up in the post's partition. The question is how the read gets a single number out of that pile.`,
      ],
      callout: { kind: 'insight', text: 'Many of your hottest reads are aggregates — a count or a sum over many items — not single-record lookups. Model them deliberately.' },
      metrics: { itemsRead: 1, requests: 1, writeAmp: 1, staleness: 0 },
      scene: { view: 'want-total', note: 'The feed render asks for one number — the like count on post#9 — backed by one LIKE item per user.' },
    },
    { // 1 PROBLEM
      chapter: 'problem', short: 'No aggregate-on-read',
      title: 'No GROUP BY over a hot partition',
      body: [
        `In SQL you would write <code>SELECT COUNT(*) FROM likes WHERE post_id = 9</code> and let the engine scan. A document or wide-column store at scale offers <b>no aggregate-on-read operator</b> you can afford here: to answer the count it must <b>read every LIKE item in the partition</b> and tally them in the application.`,
        `For a viral post that is millions of items read, and consumed read capacity, for every single feed render — a per-request cost that grows without bound as the post gets more popular. The one thing you must never do on the hot read path is scan an unbounded partition. The aggregate-on-read does not scale, so it cannot live on the read.`,
      ],
      callout: { kind: 'warn', text: 'Counting items at read time scans the whole partition. On a viral post that is millions of reads for one number, on every render.' },
      changes: ['~ COUNT(*) must scan every LIKE item', '! read cost grows with popularity, unbounded'],
      metrics: { itemsRead: 9, requests: 1, writeAmp: 1, staleness: 0 },
      scene: { view: 'scanproblem', note: 'Answering the count by scanning every LIKE item in the partition — unbounded read cost on every render.' },
    },
    { // 2 TECHNIQUE
      chapter: 'technique', short: 'Maintain it on write',
      title: 'Pre-compute, then update on write',
      body: [
        `Move the work to write time. Keep a single <span class="term">summary item</span> — <code>PK=POST#9, SK=META</code> with a <code>likes_count</code> attribute — and treat it as a <b>materialized aggregate</b>: the NoSQL equivalent of a materialized view. When a like arrives you do two things in the same write path: store the raw <code>LIKE</code> item <em>and</em> <b>increment the counter</b>.`,
        `The increment is incremental, not recomputed: <code>likes_count += 1</code>, never "re-scan and re-total". Each write now does a little more work — that is the <span class="term">write amplification</span> you are buying — but the number is always sitting there, finished, waiting for the read. You pay once per event instead of once per render.`,
      ],
      callout: { kind: 'tip', text: 'Maintain the aggregate incrementally on write: +1 per event. Never recompute from scratch — that just moves the scan.' },
      changes: ['+ summary item POST#9 / META { likes_count }', '~ each like also does likes_count += 1'],
      metrics: { itemsRead: 1, requests: 1, writeAmp: 2, staleness: 0 },
      scene: { view: 'maintain', note: 'A new like writes the raw LIKE item and atomically increments the maintained likes_count on the summary item.' },
    },
    { // 3 TECHNIQUE
      chapter: 'technique', short: 'O(1) read',
      title: 'The read is now one lookup',
      body: [
        `With the aggregate materialized, the read collapses to a <b>single key lookup</b>: <code>GET POST#9 / META</code> returns <code>likes_count</code> directly. No scan, no tally, no partition fan-out — one item read, constant time, no matter whether the post has nine likes or nine million.`,
        `This is the same inversion single-table design makes for joins, applied to aggregation: the expensive work happens once per write, so every read is O(1). A feed rendering a thousand posts does a thousand point reads, each cheap and predictable, rather than a thousand unbounded scans.`,
      ],
      callout: { kind: 'insight', text: 'The materialized counter turns an O(n) partition scan into an O(1) point read — constant cost regardless of popularity.' },
      metrics: { itemsRead: 1, requests: 1, writeAmp: 2, staleness: 0 },
      scene: { view: 'fastread', note: 'The feed reads likes_count with one point lookup of the summary item — O(1), independent of how many likes exist.' },
    },
    { // 4 TRADEOFF
      chapter: 'tradeoff', short: 'Drift & consistency',
      title: 'The counter can drift from the truth',
      body: [
        `The maintained number is a <em>derived copy</em>, and any copy can fall out of sync. A write that stores the <code>LIKE</code> item but fails before the increment, two concurrent likes that both read-modify-write the same counter, a retry that double-counts — each leaves <code>likes_count</code> <b>drifting</b> from the real number of LIKE items.`,
        `The defences are two. First, make the increment <b>atomic</b> — a native <code>ADD</code>/counter update, not a read-then-write — so concurrent events can't clobber each other. Second, accept that drift still creeps in and run <b>periodic reconciliation</b>: a background job that re-counts the ground-truth items and heals the summary. You are trading exactness-on-read for speed, and buying back correctness in the background.`,
      ],
      callout: { kind: 'warn', text: 'A materialized aggregate is a copy that can drift. Use atomic increments against races, and reconcile periodically against the raw items.' },
      changes: ['! non-atomic increment → lost updates under concurrency', '~ reconcile: re-count raw items to heal the counter'],
      metrics: { itemsRead: 1, requests: 1, writeAmp: 2, staleness: 3 },
      scene: { view: 'drift', note: 'The counter says 7 but the raw items total 9 — drift from a lost update, healed by periodic reconciliation.' },
    },
    { // 5 RECAP
      chapter: 'recap', short: 'Materialize the total',
      title: 'Materialize the aggregate the reads need',
      body: [
        `When a hot read wants a total that would otherwise scan many items, don't compute it on the read — <b>materialize it</b>. Keep a counter or summary item beside the raw data and maintain it incrementally on every write: likes, running sums, rollups, "top N", cart totals. The read becomes a single O(1) lookup.`,
        `The ledger is explicit. You pay <span class="term">write amplification</span> (each event updates both the fact and its aggregate) and you take on <span class="term">staleness</span> risk (the copy can drift), which you manage with atomic increments and background reconciliation. In NoSQL you precompute on write what SQL would GROUP BY on read — one more place where modeling means choosing where to pay.`,
      ],
      callout: { kind: 'insight', text: 'Precompute on write what SQL would aggregate on read. Pay in write amplification and reconciliation; collect in O(1) reads.' },
      metrics: { itemsRead: 1, requests: 1, writeAmp: 2, staleness: 1 },
      scene: { view: 'recap', note: 'Raw events plus one maintained summary item: the aggregate computed on write, served to every read in O(1).' },
    },
  ],
};
