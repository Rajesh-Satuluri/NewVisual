/* content/database-files.js — the "Database Files" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/database-files-scene.js. Rendered through the shared course shell. */

export const databaseFilesLesson = {
  id: 'database-files',
  title: 'Database Files',
  group: 'Storage Engine',
  summary: 'Where a table actually lives: how a DBMS lays rows out on disk as files, pages and records — the unit of allocation, the unit of I/O, and the unit of data.',
  minutes: 8,
  level: 'beginner',
  metrics: ['tables', 'pages', 'rows', 'throughput'],
  legend: ['read', 'write'],
  goals: [
    { text: 'A table is physically just one (or more) files on disk', step: 0 },
    { text: 'The File → Page → Record hierarchy', step: 1 },
    { text: 'How files are organised: heap, sorted, hashed', step: 2 },
    { text: 'Segments & extents — grouping related pages', step: 3 },
    { text: 'Files grow by extents, not row-by-row', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Where it lives',
      title: 'Where does a table actually live?',
      body: [
        `You write <code>CREATE TABLE users (…)</code> and insert a million rows. But <em>where</em> are those rows? A table is a logical idea; on the machine it has to become <span class="term">bytes on a disk</span>, sitting inside an ordinary operating-system file.`,
        `The storage engine owns that file. Open <code>users.dat</code> and you do not find rows neatly printed — you find a long sequence of fixed-size <b>pages</b>, each packed with records. The file <em>is</em> the table's physical home.`,
      ],
      callout: { kind: 'insight', text: 'A table maps to one or more files on disk. Everything the storage engine does is bookkeeping over the bytes inside those files.' },
      metrics: { tables: 1, pages: 8, rows: 240, throughput: 60 },
      scene: { view: 'heap', note: 'One table → one data file → a stack of fixed-size pages.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Hierarchy',
      title: 'File → Page → Record',
      body: [
        `The engine never reads a single row from disk. It reads a whole <span class="term">page</span> — a fixed block, typically 4–16&nbsp;KB — because disks and the OS move data in blocks, not bytes.`,
        `So there are three nested units. A <b>file</b> is the unit of <em>allocation</em> (the OS hands out space here). A <b>page</b> is the unit of <em>I/O</em> (what crosses the disk boundary). A <b>record</b> is the unit of <em>data</em> (one row, living inside a page).`,
      ],
      callout: { kind: 'tip', text: 'File = unit of allocation · Page = unit of I/O · Record = unit of data. Keep these three straight and storage engines make sense.' },
      changes: ['+ file holds many pages', '+ page holds many records', '~ I/O is per-page, never per-row'],
      metrics: { tables: 1, pages: 8, rows: 240, throughput: 80 },
      scene: { view: 'hierarchy', note: 'Zoom in: the file contains pages; each page contains records.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Organisation',
      title: 'Three ways to arrange a file',
      body: [
        `How are records placed inside the file? A <b>heap file</b> just appends rows wherever there is room — fast to write, but any lookup means scanning everything. A <b>sorted file</b> keeps records ordered by a key, so lookups can binary-search, but every insert must find its slot.`,
        `A <b>hashed file</b> sends each key through a hash function to a bucket, giving near-constant point lookups at the cost of range scans. Each layout trades write cost against the kind of read it makes cheap.`,
      ],
      callout: { kind: 'insight', text: 'Heap: cheap writes, costly scans. Sorted: cheap ranges, costly inserts. Hashed: cheap point lookups, no ranges. The access pattern picks the file.' },
      changes: ['+ heap · sorted · hashed layouts', '~ each optimises a different read'],
      metrics: { tables: 3, pages: 24, rows: 720, throughput: 80 },
      scene: { view: 'organization', note: 'Same rows, three physical layouts — each cheap for a different query.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Segments',
      title: 'Segments & extents',
      body: [
        `A real table is rarely one flat run of pages. The engine groups pages into <span class="term">segments</span> by purpose: a <b>data segment</b> for the rows, an <b>index segment</b> for the lookup structures, an <b>overflow segment</b> for rows that no longer fit where they started.`,
        `And it does not allocate a page at a time — it grabs an <span class="term">extent</span>: a run of contiguous pages. Contiguity is the whole point, because adjacent pages can be read in one fast sequential sweep instead of scattered seeks.`,
      ],
      callout: { kind: 'tip', text: 'Segments group pages by role; extents are the contiguous chunks the engine allocates. Contiguity is what makes big reads fast.' },
      changes: ['+ data / index / overflow segments', '+ extent = contiguous page run'],
      metrics: { tables: 3, pages: 48, rows: 1440, throughput: 110 },
      scene: { view: 'segments', note: 'One table splits into data, index and overflow segments.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Growth',
      title: 'Files grow by extents, not rows',
      body: [
        `When the data segment fills, the engine does not stretch the file one row at a time — it appends a whole new <span class="term">extent</span> at the end. Growing in big contiguous chunks keeps pages that belong together physically together.`,
        `The trade-off: an extent is allocated before it is full, so a freshly grown file carries some slack space. That wasted tail is the price of keeping reads sequential — and sequential reads are worth it, as the throughput climbing on the right shows.`,
      ],
      callout: { kind: 'warn', text: 'Extent-at-a-time growth wastes a little space at the tail in exchange for contiguity. Trading space for sequential I/O is a bet storage engines make everywhere.' },
      changes: ['+ append new extents on growth', '~ slack space for contiguity', '↑ sequential throughput'],
      metrics: { tables: 3, pages: 72, rows: 2160, throughput: 180 },
      scene: { view: 'growth', note: 'The file grows by appending contiguous extents at the end.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Bytes, all the way down',
      body: [
        `A table is a logical name for a pile of bytes the storage engine manages inside files. Those files are carved into fixed-size <b>pages</b> — the unit every disk read and write moves — and each page is packed with <b>records</b>, the rows themselves.`,
        `From here the course zooms in one level at a time: what a <em>page</em> looks like inside, how <em>records</em> are encoded, and how clever page layouts and trees make finding a row fast. It all sits on top of this one idea: a table is files, files are pages, pages are records.`,
      ],
      callout: { kind: 'insight', text: 'File = allocation · Page = I/O · Record = data. Every storage structure in this module is built on those three units.' },
      metrics: { tables: 3, pages: 72, rows: 2160, throughput: 180 },
      scene: { view: 'recap', note: 'File → Page → Record: the foundation of the storage engine.' },
    },
  ],
};
