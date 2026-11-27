/* content/batch-processing.js — the "Batch Processing" lesson, as DATA (DDIA
   ch.10). Each step is { chapter, short, title, body[], callout, changes?,
   metrics, scene }. `scene` is a view-snapshot consumed by
   db/batch-processing-scene.js. */

export const batchProcessingLesson = {
  id: 'batch-processing',
  title: 'Batch Processing',
  group: 'Data-Intensive (DDIA)',
  summary: 'Chew through a huge, bounded dataset in parallel to build derived output: MapReduce-style map → shuffle → reduce, trading latency for raw throughput on immutable, re-runnable jobs.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['throughput', 'workers', 'events', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why online, row-by-row processing can’t build big aggregates', step: 0 },
    { text: 'Read immutable input in bulk, write brand-new output', step: 1 },
    { text: 'Map → shuffle → reduce runs across many workers', step: 2 },
    { text: 'Immutable inputs make failed tasks safe to re-run', step: 3 },
    { text: 'High throughput, but results are minutes-to-hours old', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Mountain of data',
      title: 'A mountain of data, one row at a time',
      body: [
        `You’ve accumulated <b>terabytes</b> of logs, orders and events, and the business wants aggregates: daily revenue per region, a rebuilt search index, a recommendation model. Asking the live database to compute this row-by-row, online, would <span class="term">crawl</span> — and hammer the same system serving users.`,
        `Worse, each report wires itself into production data, so one slow query drags everything down. You need a way to process <em>all</em> the data at once, off to the side, without touching the systems of record.`,
      ],
      callout: { kind: 'warn', text: 'Computing big aggregates inside the online system couples reporting to serving: it is slow, competes for the same resources, and scales badly as data grows.' },
      metrics: { throughput: 2, workers: 1, events: 0, latency: 900 },
      scene: { view: 'pileup', note: 'One worker, a huge bounded input — far too slow to grind alone.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Bulk + immutable',
      title: 'Read it all, write something new',
      body: [
        `The batch model: treat the input as a <span class="term">bounded, immutable</span> dataset sitting in a distributed file store. A job <b>reads it in bulk</b>, transforms it, and writes a <b>brand-new output</b> dataset — it never mutates the input.`,
        `Because nothing in-place is changed, the job is just a pure function of its input. Run it, and you get a fresh derived dataset: a search index, a report, a trained model — built independently of the online database.`,
      ],
      callout: { kind: 'insight', text: 'Batch jobs read an immutable input and emit a new output. No in-place mutation means a job is a deterministic function you can re-run at will.' },
      changes: ['+ input treated as read-only', '+ output is a new dataset', '~ reporting decoupled from serving'],
      metrics: { throughput: 10, workers: 1, events: 0, latency: 600 },
      scene: { view: 'pipeline', note: 'Immutable input in, a new derived dataset out — a pure transformation.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Map · shuffle · reduce',
      title: 'Map in parallel, shuffle, then reduce',
      body: [
        `Split the input into partitions and run a <span class="term">map</span> task on each, in parallel — every mapper emits <code>key → value</code> pairs. Then the <span class="term">shuffle</span> moves pairs across the network so that <b>all values for one key</b> land on the same reducer.`,
        `Each <span class="term">reduce</span> task aggregates its keys (sum, count, join) and writes a slice of the output. Chain jobs together and you get a <b>dataflow DAG</b> — the model Spark and Flink keep in memory to avoid re-reading disk between steps.`,
      ],
      callout: { kind: 'insight', text: 'Map runs per-partition in parallel; shuffle groups by key across the network; reduce aggregates each key. More workers ⇒ more throughput.' },
      changes: ['+ N mappers run in parallel', '+ shuffle groups pairs by key', '+ reducers write the output'],
      metrics: { throughput: 95, workers: 6, events: 1200, latency: 240 },
      scene: { view: 'mapreduce', note: 'Partitions fan into mappers, shuffle by key, then reducers emit output.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Re-runnable',
      title: 'A failed task just runs again',
      body: [
        `Since inputs are immutable and tasks are deterministic, failure handling is almost free. If a mapper or reducer dies — a crashed node, a lost disk — the scheduler simply <b>re-runs that one task</b> on another machine. Its inputs haven’t changed, so the retry produces identical output.`,
        `No partial state to unwind, no corruption to repair. This is why batch frameworks tolerate cheap, flaky hardware at huge scale: the whole job is idempotent by construction.`,
      ],
      callout: { kind: 'tip', text: 'Immutable input + deterministic tasks = safe retries. A failed task re-runs with the same input and yields the same result — no cleanup needed.' },
      changes: ['~ worker 4 crashes mid-task', '+ task re-scheduled elsewhere', '✓ output identical, job completes'],
      metrics: { throughput: 88, workers: 5, events: 1200, latency: 300 },
      scene: { view: 'retry', note: 'One worker dies; its task reruns on another — same input, same output.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Throughput vs latency',
      title: 'Fast overall, but never fresh',
      body: [
        `Batch wins on <b>throughput</b> — it saturates every disk and core to process the whole dataset efficiently. What it can’t give you is <span class="term">freshness</span>: a job that runs hourly means your output is, on average, <b>30+ minutes stale</b>, and materializing intermediate data between stages costs real IO.`,
        `For dashboards refreshed overnight that’s perfect. For a fraud check that must fire in milliseconds, it’s useless — the input never <em>ends</em>. That unbounded, always-fresh case is exactly what <b>stream processing</b> is for.`,
      ],
      callout: { kind: 'warn', text: 'Batch optimizes throughput at the cost of latency: results are as stale as your schedule. Real-time needs point you to stream processing over unbounded input.' },
      metrics: { throughput: 95, workers: 6, events: 1200, latency: 1800 },
      scene: { view: 'latency', note: 'Great throughput, but output lands long after the events happened.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Bounded input, parallel output',
      body: [
        `Batch processing turns a <b>bounded, immutable</b> input into a fresh derived dataset: map across partitions, shuffle by key, reduce to the answer — scaled by adding workers and made robust by re-running any task that fails.`,
        `It’s the engine behind nightly reports, index rebuilds and model training. Its one limit — staleness — is where the next chapter picks up: <span class="term">stream processing</span> for data that never stops arriving.`,
      ],
      callout: { kind: 'insight', text: 'Map/shuffle/reduce over immutable input gives scalable, retry-safe throughput. Trade: results are only as fresh as the job schedule.' },
      metrics: { throughput: 95, workers: 6, events: 1200, latency: 240 },
      scene: { view: 'recap', note: 'Immutable in, derived out — the retry-safe workhorse of data systems.' },
    },
  ],
};
