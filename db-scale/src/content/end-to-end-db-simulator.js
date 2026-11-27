/* content/end-to-end-db-simulator.js — the "End-to-End DB Simulator" capstone
   Interactive Lab, as DATA. A grand tour that follows ONE request through the
   entire stack built across the whole course: client → connection → parser →
   planner/optimizer → executor → buffer pool → storage → WAL → commit →
   replication → response. Ties every module together. Same step shape as every
   other db-scale lesson. `scene` is a view-snapshot consumed by
   db/end-to-end-db-simulator-scene.js. */

export const endToEndDbSimulatorLesson = {
  id: 'end-to-end-db-simulator',
  title: 'End-to-End DB Simulator',
  group: 'Interactive Labs',
  summary: 'Follow one request through the whole stack you built across the course: pooled connection, parser, optimizer, executor, buffer pool, pages on disk, the WAL, commit, and replication — then back to the client.',
  minutes: 11,
  level: 'advanced',
  metrics: ['latency', 'queries', 'pages', 'txns'],
  legend: ['read', 'write'],
  goals: [
    { text: 'See every module the course built as one pipeline', step: 0 },
    { text: 'SQL is parsed, then planned and optimized from statistics', step: 1 },
    { text: 'The executor runs operators; the buffer pool serves pages', step: 2 },
    { text: 'A write hits the WAL first, then dirties a page in RAM', step: 3 },
    { text: 'fsync of the log makes the commit durable', step: 4 },
    { text: 'The committed log ships to replicas, then the client replies', step: 5 },
  ],

  steps: [
    { // 0 — SETUP / submit
      chapter: 'setup', short: 'Submit',
      title: 'One request enters the stack',
      body: [
        `A client opens a <span class="term">pooled connection</span> and sends a single statement over it. From the application’s side it is one round trip; inside the server it is about to pass through <b>every</b> component this course built.`,
        `The connection pool hands the request to an idle backend — no fork, no new TCP handshake. That backend will parse, plan, execute, log, commit and reply. Follow the one request the whole way down and back up.`,
      ],
      callout: { kind: 'tip', text: 'A database is a pipeline of modules, not a black box: connection → parser → planner → executor → buffer pool → storage → WAL → commit → replication → response. Each hands its output to the next.' },
      metrics: { latency: 0, queries: 0, pages: 0, txns: 0 },
      scene: { view: 'submit', note: 'A client sends one statement over a pooled connection into the server.' },
    },
    { // 1 — TECHNIQUE / parse + plan
      chapter: 'technique', short: 'Parse & plan',
      title: 'Parse, then plan and optimize',
      body: [
        `The backend <span class="term">parses</span> the SQL into an AST, validating names and types against the catalog. Then the <span class="term">planner</span> builds a logical plan and the <span class="term">cost-based optimizer</span> turns it into a concrete physical plan.`,
        `Using table <b>statistics</b> it prices the candidates — index scan vs sequential, hash vs nested-loop join, where to push the filter — and keeps the cheapest. No data has been read yet; this is all compilation.`,
      ],
      callout: { kind: 'insight', text: 'Parsing checks grammar and meaning; the optimizer prices physical plans from statistics and keeps the cheapest. The query is compiled before a single page is touched.' },
      changes: ['+ SQL → validated AST', '+ logical plan built', '~ optimizer picks the cheapest physical plan'],
      metrics: { latency: 1, queries: 1, pages: 0, txns: 1 },
      scene: { view: 'parseplan', note: 'SQL → AST → logical plan → optimizer prices candidates → physical plan.' },
    },
    { // 2 — TECHNIQUE / execute
      chapter: 'technique', short: 'Execute',
      title: 'Execute: the buffer pool serves pages',
      body: [
        `The <span class="term">executor</span> runs the physical plan as a chain of pull iterators. Each operator that needs data asks the <span class="term">buffer pool</span> for a page by id.`,
        `A <b>hit</b> is served straight from RAM. A <b>miss</b> reads the 8&nbsp;KB page from disk, evicts a victim if the pool is full, and caches it — so the next access to that page is free. Watch <b>pages read</b> climb only on misses.`,
      ],
      callout: { kind: 'insight', text: 'The executor never touches disk directly — it asks the buffer pool. Hits are RAM-speed; only a miss pays a disk read. The cache is what makes the hot working set fast.' },
      changes: ['+ pull iterators drive the plan', '+ buffer pool hit → served from RAM', '~ miss → read page from disk, cache it'],
      metrics: { latency: 4, queries: 1, pages: 18, txns: 1 },
      scene: { view: 'execute', note: 'Operators ask the buffer pool for pages; a miss falls through to disk.' },
    },
    { // 3 — PROBLEM / write + WAL
      chapter: 'problem', short: 'Write-ahead log',
      title: 'An UPDATE writes to the WAL first',
      body: [
        `This request is an <code>UPDATE</code>. Before the change touches the actual data page, the backend appends a <span class="term">WAL record</span> describing it to the log — <span class="term">write-ahead logging</span>.`,
        `Only after the log record is queued does it modify the page <em>in the buffer pool</em>, marking it <b>dirty</b>. The dirty page can be flushed to disk lazily later; the log is the source of truth. If we crash now, the log can redo the change.`,
      ],
      callout: { kind: 'warn', text: 'The rule is log-before-data: the WAL record is written before the page is modified. The data page stays dirty in RAM and is flushed lazily — durability rides on the log, not the page.' },
      changes: ['+ WAL record appended', '~ page modified in buffer pool → dirty', '− data page not yet flushed to disk'],
      metrics: { latency: 5, queries: 1, pages: 19, txns: 1 },
      scene: { view: 'writewal', note: 'WAL record appended first, then the page is dirtied in the buffer pool.' },
    },
    { // 4 — SOLUTION / commit
      chapter: 'solution', short: 'Commit',
      title: 'fsync the log — the commit is durable',
      body: [
        `On <code>COMMIT</code> the backend writes a commit record and calls <span class="term">fsync</span>, forcing the WAL to stable storage. The moment that returns, the transaction is <b>durable</b> — it will survive a crash even though its data page is still only dirty in RAM.`,
        `This is the one unavoidable disk write on the hot path, and why group commit batches many transactions into a single fsync. The commit is acknowledged; the <b>D</b> in ACID is now guaranteed.`,
      ],
      callout: { kind: 'tip', text: 'Commit = fsync the log. A transaction is durable once its commit record is on stable storage, regardless of when the dirty page is flushed. Group commit amortizes the fsync across many txns.' },
      changes: ['+ commit record written', '+ fsync → WAL on stable storage', '✓ transaction durable'],
      metrics: { latency: 8, queries: 1, pages: 19, txns: 1 },
      scene: { view: 'commit', note: 'fsync forces the WAL to disk; the commit is durable and acknowledged.' },
    },
    { // 5 — TECHNIQUE / replicate
      chapter: 'technique', short: 'Replicate',
      title: 'Ship the log to the replicas',
      body: [
        `The same committed WAL is <span class="term">streamed</span> to replica nodes, which replay it to stay byte-for-byte in sync with the leader. With <b>synchronous</b> replication the commit waits for a replica to acknowledge; with <b>asynchronous</b> it does not, trading a little durability for lower latency.`,
        `Once the request is done, the sorted result rows travel back <b>up</b> the stack — executor → backend → connection → client. One round trip for the application; a full tour of the system for the request.`,
      ],
      callout: { kind: 'insight', text: 'Replication ships the log, not the pages: replicas replay the WAL to track the leader. Sync vs async is a durability-vs-latency dial — the same trade you met in the replication module.' },
      changes: ['+ WAL streamed to replicas', '~ replicas replay the log', '+ result rows returned to the client'],
      metrics: { latency: 10, queries: 1, pages: 19, txns: 1 },
      scene: { view: 'replicate', note: 'The committed log ships to replicas; result rows return to the client.' },
    },
    { // 6 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The whole stack, as one pipeline',
      body: [
        `One request, the entire system: <b>client → connection → parse → plan → execute → buffer pool → storage → WAL → commit → replicate → response</b>. Every box here was a lesson of its own, and here they ran together as the database you have been building all along.`,
        `That is the shape of every real DBMS. When a query is slow or a crash loses data, you now know exactly which stage to look at — and why each one exists.`,
      ],
      callout: { kind: 'tip', text: 'Query processing sits on storage; storage is made durable by the WAL; the WAL is what replication and recovery ship. The modules are not separate topics — they are one machine.' },
      metrics: { latency: 10, queries: 1, pages: 19, txns: 1 },
      scene: { view: 'recap', note: 'Client → parse → plan → execute → buffer pool → WAL → commit → replicate → response.' },
    },
  ],
};
