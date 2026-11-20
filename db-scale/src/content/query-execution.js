/* content/query-execution.js — the "Query Execution" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/query-execution-scene.js. Rendered through the shared course shell. */

export const queryExecutionLesson = {
  id: 'query-execution',
  title: 'Query Execution',
  group: 'Query Engine',
  summary: 'The last stage: the executor runs the chosen physical plan as a pull-based tree of iterators, streaming result rows up from the leaves.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['rows', 'pages', 'latency'],
  legend: ['read', 'write'],
  goals: [
    { text: 'How the executor walks the physical plan tree', step: 0 },
    { text: 'The iterator model: open / next / close', step: 1 },
    { text: 'Pipelining rows up the tree with no intermediates', step: 2 },
    { text: 'Blocking operators that break the pipeline', step: 3 },
    { text: 'Why modern engines execute in vectorized batches', step: 4 },
  ],

  steps: [
    { // 0 — OVERVIEW
      chapter: 'technique', short: 'The executor',
      title: 'The executor walks the plan',
      body: [
        `The optimizer handed us a <span class="term">physical plan</span> — a tree of concrete operators. The <b>executor</b> brings it to life. It asks the <em>root</em> for a row; the root asks its children; the request travels all the way down to the leaf <b>scans</b>, which read pages off disk.`,
        `Execution is <b>demand-driven</b>: nothing happens until the row above it is asked for. The tree is pulled, not pushed — control flows down, rows flow up.`,
      ],
      callout: { kind: 'insight', text: 'A query plan is a tree of operators. The executor pulls rows from the root down to the leaves and streams them back up.' },
      metrics: { rows: 0, pages: 0, latency: 0 },
      scene: { view: 'overview', note: 'One plan tree; the executor pulls result rows from the root.' },
    },
    { // 1 — ITERATOR MODEL
      chapter: 'technique', short: 'Iterator model',
      title: 'Every operator is an iterator',
      body: [
        `Each operator exposes three calls: <code>open()</code> to set up, <code>next()</code> to produce the <em>next</em> row, and <code>close()</code> to tear down. This is the classic <span class="term">Volcano</span> (iterator) model.`,
        `A parent's <code>next()</code> simply calls its children's <code>next()</code>. A <code>Filter</code> pulls rows from below and returns only those that pass; a <code>Join</code> pulls from both sides. The same uniform interface composes any plan.`,
      ],
      callout: { kind: 'tip', text: 'open / next / close — one interface every operator implements. next() pulls one row from the children on demand.' },
      changes: ['+ open() — set up state', '+ next() — pull one row', '+ close() — release resources'],
      metrics: { rows: 1, pages: 2, latency: 1 },
      scene: { view: 'iterator', note: 'next() cascades down the tree; one row comes back up.' },
    },
    { // 2 — PIPELINING
      chapter: 'technique', short: 'Pipelining',
      title: 'Rows flow up one at a time',
      body: [
        `Because every <code>next()</code> returns a single row, rows <span class="term">pipeline</span> up the tree: a scanned row is filtered, joined and projected on the fly, then handed to the client — all without ever writing a full intermediate table.`,
        `Pipelining keeps memory small and latency low: the first result row can appear before the last input row has even been read.`,
      ],
      callout: { kind: 'insight', text: 'Pipelining streams rows through the operators with no intermediate materialization — low memory, fast first row.' },
      changes: ['~ no intermediate tables', '+ first row returns early', '- minimal memory'],
      metrics: { rows: 142, pages: 24, latency: 3 },
      scene: { view: 'pipeline', note: 'Scan → Filter → Join → Project, one row streaming through.' },
    },
    { // 3 — BLOCKING
      chapter: 'tradeoff', short: 'Blocking ops',
      title: 'Some operators break the pipeline',
      body: [
        `Not everything can stream. A <b>sort</b> can't emit its first row until it has seen them all; a <b>hash join's build side</b> must be fully consumed before probing begins. These are <span class="term">blocking</span> operators — <em>pipeline breakers</em>.`,
        `They force the rows below them to <b>materialize</b> (in memory, or spilled to disk), adding latency and memory before the pipeline above can resume.`,
      ],
      callout: { kind: 'warn', text: 'Sort and hash-build are blocking: they must consume all their input before producing any output. They split the plan into pipeline stages.' },
      metrics: { rows: 142, pages: 48, latency: 9 },
      scene: { view: 'blocking', note: 'The hash-build side must read every row before the join emits one.' },
    },
    { // 4 — VECTORIZED
      chapter: 'technique', short: 'Vectorized',
      title: 'Pull batches, not single rows',
      body: [
        `One row per <code>next()</code> is simple but costly: a function call and a branch for <em>every</em> row. Modern engines go <span class="term">vectorized</span> — each <code>next()</code> returns a <b>batch</b> (a vector) of hundreds of rows.`,
        `Processing a column of values in a tight loop is cache-friendly and lets the CPU use SIMD, cutting per-row overhead dramatically. Same tree shape, far fewer calls.`,
      ],
      callout: { kind: 'tip', text: 'Vectorized execution amortizes per-row overhead by pushing batches of rows through each operator — big speedups on analytical queries.' },
      changes: ['~ next() returns a batch', '+ cache-friendly column loops', '+ SIMD-friendly'],
      metrics: { rows: 142, pages: 48, latency: 2 },
      scene: { view: 'vectorized', note: 'A batch of rows moves up the tree together, not one at a time.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'From plan tree to result rows',
      body: [
        `Execution is where the whole pipeline pays off: parse, bind, plan and optimize all exist to hand the executor a good tree. It walks that tree with a uniform <b>iterator</b> interface, <b>pipelines</b> rows where it can, <b>materializes</b> where it must, and increasingly works in <b>vectorized batches</b>.`,
        `Out the top come the rows the client asked for — the answer to the query that started as a flat string many lessons ago.`,
      ],
      callout: { kind: 'insight', text: 'Executor = a pull-based tree of iterators. Pipeline when you can, block when you must, batch for speed.' },
      metrics: { rows: 142, pages: 48, latency: 2 },
      scene: { view: 'recap', note: 'Plan tree in, result rows out — the query is answered.' },
    },
  ],
};
