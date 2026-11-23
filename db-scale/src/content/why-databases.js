/* content/why-databases.js — the "Why Databases?" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/why-databases-scene.js. Rendered through the shared course shell. */

export const whyDatabasesLesson = {
  id: 'why-databases',
  title: 'Why Databases?',
  group: 'Foundations',
  summary: 'The moment data is shared by more than one person and has to be trusted, a shared file or spreadsheet quietly falls apart — and a database is what you reach for instead.',
  minutes: 7,
  level: 'beginner',
  metrics: ['clients', 'rows', 'latency', 'integrity'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a shared spreadsheet breaks once several people edit it', step: 0 },
    { text: 'Persistence: data that survives crashes and restarts', step: 1 },
    { text: 'Concurrency: many writers at once, with no lost updates', step: 2 },
    { text: 'Querying: ask precise questions fast instead of scrolling', step: 3 },
    { text: 'Integrity: constraints keep every row valid', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Shared sheet',
      title: 'The spreadsheet that outgrew itself',
      body: [
        `It starts innocently: one shared spreadsheet, a few columns, a handful of rows. Then four people open it at once. Two of them edit the same cell, hit save, and one change silently <em>vanishes</em> — a <span class="term">lost update</span>.`,
        `There is no record of who changed what, no way to undo last Tuesday, and once it crosses a few thousand rows every scroll and formula starts to crawl. A file was never built to be <b>shared</b>, <b>trusted</b>, or <b>large</b> all at once.`,
      ],
      callout: { kind: 'warn', text: 'A shared file gives you no safe concurrency, no history, no validation and no fast lookup. Past a certain point, every one of those gaps turns into a bug.' },
      metrics: { clients: 4, rows: 2000, latency: 400, integrity: 60 },
      scene: { view: 'sheet', note: 'Four people, one shared sheet, and no one coordinating the writes.' },
    },
    { // 1 — PERSISTENCE
      chapter: 'technique', short: 'Persistence',
      title: 'Data that survives the power going out',
      body: [
        `The first promise a database makes is <span class="term">persistence</span>: what you commit is written to durable storage and stays there. Close the app, reboot the machine, pull the plug mid-write — the committed data is still there when you come back.`,
        `No more “I hope someone has a recent copy.” There is <b>one</b> authoritative store, and it is designed from the ground up to not lose what it promised to keep.`,
      ],
      callout: { kind: 'insight', text: 'Durability means a committed write is a promise the database will honour even across a crash. That single guarantee is why ledgers, orders and accounts live in databases.' },
      changes: ['+ one durable store', '~ committed data survives crashes', '- no more scattered copies'],
      metrics: { clients: 4, rows: 2400, latency: 180, integrity: 80 },
      scene: { view: 'persist', dbmsSub: 'durable store', note: 'Apps commit once, to one store that is built to never lose it.' },
    },
    { // 2 — CONCURRENCY
      chapter: 'technique', short: 'Concurrency',
      title: 'Many writers, zero lost updates',
      body: [
        `Now let everyone write at the same time. A database serialises conflicting changes with <b>locks</b> and <b>versions</b>, so two people editing the same record no longer clobber each other — each change is applied in a well-defined order and none disappears.`,
        `Readers see a <span class="term">consistent</span> snapshot while writers work, so nobody ever reads a half-finished update. This is the exact failure that broke the spreadsheet, solved.`,
      ],
      callout: { kind: 'insight', text: 'Concurrency control turns “whoever saved last wins” into “every change is accounted for.” It is the reason a database can back a busy website.' },
      changes: ['+ concurrent writers', '~ changes serialised safely', '+ consistent reads'],
      metrics: { clients: 24, rows: 2400, latency: 120, integrity: 90 },
      scene: { view: 'concurrent', dbmsSub: 'one writer', note: 'Two dozen clients, interleaved into one coherent store — no lost updates.' },
    },
    { // 3 — QUERYING
      chapter: 'technique', short: 'Querying',
      title: 'Ask a question, get an answer — fast',
      body: [
        `With a file you can only really do one thing: read the whole thing and sift. A database lets you <em>describe</em> what you want — <code>orders WHERE total &gt; 100 AND status = 'paid'</code> — and it finds those rows using an <span class="term">index</span> instead of scanning everything.`,
        `The difference is not small. A lookup that was linear in the size of the data becomes near-instant, even as the table grows into the millions.`,
      ],
      callout: { kind: 'tip', text: 'A query language + indexes means answers scale with the size of the result, not the size of the data. Scrolling does not.' },
      changes: ['+ query language', '+ indexes', '~ lookups go from scan to seek'],
      metrics: { clients: 24, rows: 48000, latency: 18, integrity: 92 },
      scene: { view: 'query', dbmsSub: 'indexed', note: 'Describe the rows you want; the index jumps straight to them.' },
    },
    { // 4 — INTEGRITY
      chapter: 'technique', short: 'Integrity',
      title: 'Bad data never gets in',
      body: [
        `A spreadsheet will happily accept “banana” in the price column. A database won't. You declare the rules once — this column is a number, this one can't be empty, this id must be unique — and the database <b>rejects</b> anything that breaks them, every time, no matter which app is writing.`,
        `That turns “we <em>hope</em> the data is clean” into “the data <em>cannot</em> be dirty.” Integrity stops being a convention and becomes a guarantee.`,
      ],
      callout: { kind: 'insight', text: 'Constraints live with the data, not in the app. So the rule holds even when a new script, a migration or a 2 a.m. hotfix forgets about it.' },
      changes: ['+ typed columns', '+ required & unique rules', '~ invalid writes bounced'],
      metrics: { clients: 24, rows: 48000, latency: 18, integrity: 100 },
      scene: { view: 'integrity', dbmsSub: 'rules enforced', note: 'A write that breaks a rule is refused at the door.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'When you need one',
      title: 'When a file is fine — and when it isn\'t',
      body: [
        `A file or a sheet is perfectly good for something small, private and disposable. You reach for a <span class="term">database</span> the moment data is <b>shared</b> by several writers, has to <b>persist</b> reliably, must stay <b>correct</b> under rules, and needs to be <b>queried</b> quickly.`,
        `Those four needs — persistent, concurrent, correct, queryable — are exactly what the rest of this course builds, one mechanism at a time.`,
      ],
      callout: { kind: 'insight', text: 'Persistent · Concurrent · Correct · Queryable. If your data needs even two of these, you have outgrown the spreadsheet.' },
      metrics: { clients: 24, rows: 48000, latency: 18, integrity: 100 },
      scene: { view: 'recap', dbmsSub: 'the contract', note: 'Four needs a file can\'t meet, and the one thing that meets all four.' },
    },
  ],
};
