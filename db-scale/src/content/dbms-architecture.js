/* content/dbms-architecture.js — the "DBMS Architecture" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/dbms-architecture-scene.js. Rendered through the shared course shell. */

export const dbmsArchitectureLesson = {
  id: 'dbms-architecture',
  title: 'DBMS Architecture',
  group: 'Foundations',
  summary: 'The layered internals a single query passes through — from the connection at the front door, down through the query processor and storage manager to the disk, and all the way back.',
  minutes: 9,
  level: 'beginner',
  metrics: ['clients', 'queries', 'tables', 'rows'],
  legend: ['read', 'write'],
  goals: [
    { text: 'The three layers: query processor, storage manager, disk', step: 0 },
    { text: 'The front door: connections & sessions', step: 1 },
    { text: 'Inside the processor: parse → optimize → execute', step: 2 },
    { text: 'The storage manager: buffer pool & access methods', step: 3 },
    { text: 'Cross-cutting: transactions, recovery and the catalog', step: 4 },
  ],

  steps: [
    { // 0 — OVERVIEW
      chapter: 'technique', short: 'Layers',
      title: 'A database is a stack of layers',
      body: [
        `Zoom inside the DBMS and you find not one box but a <b>stack of layers</b>, each with a single job. At the top the <span class="term">query processor</span> is the brain: it decides <em>how</em> to answer a request. Beneath it the <span class="term">storage manager</span> is the hands: it actually moves bytes between RAM and disk. At the bottom sits the <b>disk</b> — the long-term memory.`,
        `A request falls <em>down</em> the stack — SQL in at the top, pages read at the bottom — and the answer rises back <em>up</em>. Every lesson in this course lives inside one of these layers.`,
      ],
      callout: { kind: 'insight', text: 'Query processor plans. Storage manager fetches. Disk remembers. One query flows down all three and the result flows back up.' },
      metrics: { clients: 8, queries: 120, tables: 6, rows: 4200 },
      scene: { view: 'overview', apps: 3, note: 'Three layers: a request flows down, a result flows up.' },
    },
    { // 1 — FRONT DOOR
      chapter: 'technique', short: 'Front door',
      title: 'The front door: connections & sessions',
      body: [
        `Before a query runs, a client must <b>get in</b>. It opens a connection, the DBMS <span class="term">authenticates</span> it, and a <span class="term">session</span> is created to hold that client's state — its current transaction, temporary tables, settings.`,
        `Opening a connection is surprisingly expensive, which is why real systems keep a <b>pool</b> of them ready. Only once a session exists does the query get handed to the processor.`,
      ],
      callout: { kind: 'tip', text: 'A connection is the pipe; a session is the context that travels through it. Pool connections — you rarely want to pay to open one per request.' },
      changes: ['+ authenticate client', '+ open a session', '~ hand query to the processor'],
      metrics: { clients: 8, queries: 120, tables: 6, rows: 4200 },
      scene: { view: 'frontdoor', apps: 3, note: 'Authenticate, open a session, then pass the query inward.' },
    },
    { // 2 — PROCESSOR
      chapter: 'technique', short: 'Processor',
      title: 'Inside the query processor',
      body: [
        `The processor turns a string of SQL into results in three moves. The <b>parser</b> checks the syntax and builds a tree. The <b>optimizer</b> considers many equivalent plans and picks the cheapest. The <b>executor</b> runs that chosen plan, pulling rows through it operator by operator.`,
        `This is where a query stops being text and becomes a concrete sequence of reads and joins.`,
      ],
      callout: { kind: 'insight', text: 'Parse → plan → run. The optimizer is the clever part: the same query can run a thousand ways, and it hunts for the fast one.' },
      changes: ['+ parser builds a tree', '+ optimizer picks a plan', '+ executor runs it'],
      metrics: { clients: 8, queries: 132, tables: 6, rows: 4200 },
      scene: { view: 'processor', apps: 3, pulse: 'processor', note: 'Parse → plan → run: SQL becomes a chosen execution plan.' },
    },
    { // 3 — STORAGE MANAGER
      chapter: 'technique', short: 'Storage mgr',
      title: 'The storage manager does the I/O',
      body: [
        `The executor never touches the disk directly. It asks the <span class="term">storage manager</span>, whose <b>access methods</b> — table scans, index lookups — know how to find rows inside files. Each needed page is pulled through the <span class="term">buffer pool</span>, a slab of RAM that caches hot pages so most reads never hit the disk at all.`,
        `Writes go the other way: changed pages sit in the buffer pool and are flushed back down to the files.`,
      ],
      callout: { kind: 'tip', text: 'Buffer pool = cache hot pages in RAM. Access methods = how to locate rows. Together they turn "find this row" into the fewest possible disk reads.' },
      changes: ['+ buffer pool caches pages', '+ access methods locate rows', '~ read/write files on disk'],
      metrics: { clients: 8, queries: 132, tables: 6, rows: 4200 },
      scene: { view: 'storage', apps: 3, pulse: 'storage', note: 'Cache hot pages in RAM; read and write the files beneath.' },
    },
    { // 4 — CROSS-CUTTING
      chapter: 'technique', short: 'Cross-cutting',
      title: 'Three managers that span every layer',
      body: [
        `Some jobs cannot live in one layer. The <b>transaction manager</b> makes a group of changes all-or-nothing. The <b>recovery manager</b>, backed by the <span class="term">write-ahead log</span>, guarantees that a crash never loses a committed change. The <b>catalog</b> stores the schema — what tables and columns exist — which every layer consults.`,
        `Draw them as a column beside the stack: they reach into all of it.`,
      ],
      callout: { kind: 'insight', text: 'Transactions, recovery/WAL and the catalog are cross-cutting: they touch the processor, the storage manager and the disk alike.' },
      changes: ['+ transaction manager', '+ recovery / WAL', '+ catalog (the schema)'],
      metrics: { clients: 8, queries: 140, tables: 6, rows: 4200 },
      scene: { view: 'crosscutting', apps: 3, note: 'Transactions, recovery and the catalog cut across every layer.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Full stack',
      title: 'One query, end to end',
      body: [
        `Follow a single <code>SELECT</code> all the way down: in through the <b>connection</b>, parsed and planned by the <b>query processor</b>, executed against pages served by the <b>storage manager</b> and <b>buffer pool</b>, reading <b>files</b> on disk — while the <b>transaction manager</b> and <b>WAL</b> keep it safe and the <b>catalog</b> tells everyone what the data means.`,
        `That is the whole machine. Every remaining lesson zooms into one of these boxes.`,
      ],
      callout: { kind: 'insight', text: 'Connection → processor → storage manager → disk, with transactions, recovery and catalog alongside. Hold this map; the course fills it in.' },
      metrics: { clients: 8, queries: 140, tables: 6, rows: 4200 },
      scene: { view: 'recap', apps: 3, note: 'The full stack: one query in, one answer out.' },
    },
  ],
};
