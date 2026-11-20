/* content/dbms.js — the "What is a DBMS?" lesson, as DATA.
   Same shape as content/lsm.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/dbms-scene.js. Rendered through the shared course shell. */

export const dbmsLesson = {
  id: 'what-is-dbms',
  title: 'What is a DBMS?',
  group: 'Foundations',
  summary: 'Why a database management system exists at all — the layer that sits between your apps and your bytes, and everything it takes off your hands.',
  minutes: 8,
  level: 'beginner',
  metrics: ['clients', 'tables', 'rows', 'queries'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why raw files break down as soon as data is shared', step: 0 },
    { text: 'The DBMS as a single manager between apps and data', step: 1 },
    { text: 'The engines inside: query, transactions, storage, buffering', step: 2 },
    { text: 'Many clients, one consistent source of truth', step: 3 },
    { text: 'Data independence: logical schema vs physical bytes', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Raw files',
      title: 'Every app wrestling raw files',
      body: [
        `Picture a small shop. The web app, the billing script and the nightly report each open the <em>same</em> data files directly — each with its own idea of the format, each reading and writing whenever it likes.`,
        `Nothing coordinates them. Two writers clobber each other, a crash leaves a half-written record, the same customer is stored three different ways, and there is no way to ask a question more interesting than “read the whole file.” Raw files simply do not <span class="term">share</span>.`,
      ],
      callout: { kind: 'warn', text: 'Flat files give you no concurrency, no integrity, no crash safety and no query language. Every app has to reinvent all four — badly.' },
      metrics: { clients: 3, tables: 0, rows: 0, queries: 0 },
      scene: { view: 'files', apps: 3, note: 'Three programs, one pile of files, zero coordination.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'One manager',
      title: 'Put one manager in the middle',
      body: [
        `A <span class="term">DBMS</span> — database management system — is a dedicated program that sits between every app and the data. Apps no longer touch files; they send <b>requests</b> to the DBMS, and it is the only thing that ever reads or writes the bytes.`,
        `One gatekeeper means one place to enforce the rules: who may write, what counts as valid, and what happens on a crash. The apps get simpler and the data gets safer at the same time.`,
      ],
      callout: { kind: 'insight', text: 'A DBMS is the single process that owns the data. Apps ask; the DBMS decides and performs. That indirection is the whole idea.' },
      changes: ['+ DBMS owns all reads & writes', '~ apps send requests, not file I/O', '+ one shared store'],
      metrics: { clients: 3, tables: 1, rows: 24, queries: 1 },
      scene: { view: 'layer', apps: 3, dbmsSub: 'one manager', flow: 'query', note: 'Apps → DBMS → one store. The DBMS is the only writer.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Inside',
      title: 'Four engines inside the box',
      body: [
        `That “manager” is really a stack of cooperating engines. The <b>query engine</b> parses your request and plans the fastest way to answer it. The <b>transaction manager</b> makes a group of changes all-or-nothing. The <b>storage engine</b> lays records out on disk, and the <b>buffer pool</b> keeps hot pages in RAM so most reads never touch the disk.`,
        `The rest of this course is a tour of these boxes — this lesson is the map.`,
      ],
      callout: { kind: 'tip', text: 'Query engine → plans. Transaction manager → protects. Storage engine → persists. Buffer pool → caches. Together they are “the database.”' },
      changes: ['+ query engine', '+ transaction manager', '+ storage engine', '+ buffer pool'],
      metrics: { clients: 3, tables: 3, rows: 142, queries: 8 },
      scene: { view: 'internals', apps: 3, note: 'One request flows through four engines and down to disk.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Concurrency',
      title: 'Many clients, one source of truth',
      body: [
        `Now point a dozen clients at it at once — web requests, a mobile app, a background job. The DBMS interleaves their reads and writes so each one sees a <span class="term">consistent</span> view, as if it had the database to itself.`,
        `Locks and versions keep them from corrupting each other; the transaction manager makes sure a crash mid-way never leaves a half-finished change behind. This is the job raw files could never do.`,
      ],
      callout: { kind: 'insight', text: 'Concurrency control + transactions = many writers, no corruption, one agreed-upon truth. It is the reason databases exist.' },
      changes: ['+ concurrent clients', '~ interleaved safely', '+ consistent reads'],
      metrics: { clients: 12, tables: 3, rows: 142, queries: 240 },
      scene: { view: 'concurrency', apps: 5, pulse: 'dbms', flow: 'query', note: 'Twelve clients, interleaved into one consistent store.' },
    },
    { // 4 — CONCEPT
      chapter: 'technique', short: 'Independence',
      title: 'You describe data; it stores bytes',
      body: [
        `Apps talk to the DBMS in terms of a <span class="term">schema</span> — tables, columns, rows: <code>users(id, name, email)</code>. They never say <em>where</em> a row lives or <em>how</em> it is encoded.`,
        `Underneath, the DBMS is free to change the page layout, add an index, or move files to a new disk — and not one line of app code changes. That separation of the <b>logical</b> model from the <b>physical</b> storage is called <span class="term">data independence</span>.`,
      ],
      callout: { kind: 'tip', text: 'Logical schema (what the data means) is decoupled from physical storage (how the bytes sit). Change one without touching the other.' },
      metrics: { clients: 12, tables: 4, rows: 1680, queries: 240 },
      scene: { view: 'schema', apps: 3, dbmsSub: 'logical view', note: 'Apps see tables & rows; the DBMS owns the bytes.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'What a DBMS buys you',
      body: [
        `A DBMS is the one program that owns your data and hands apps a clean contract in return for four hard guarantees: data is <b>durable</b> (survives crashes), access is <b>concurrent</b> (many clients, safely), state stays <b>consistent</b> (rules always hold), and it is <b>queryable</b> (ask rich questions, fast).`,
        `Every lesson that follows — storage engines, indexes, transactions, replication — is a zoom-in on how one of these guarantees is actually delivered.`,
      ],
      callout: { kind: 'insight', text: 'Durable · Concurrent · Consistent · Queryable. Hold these four in mind; the rest of the course is how a database keeps each promise.' },
      metrics: { clients: 12, tables: 4, rows: 1680, queries: 240 },
      scene: { view: 'recap', apps: 3, dbmsSub: 'the contract', note: 'One manager, four guarantees — the foundation for everything next.' },
    },
  ],
};
