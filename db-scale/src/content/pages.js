/* content/pages.js — the "Pages" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/pages-scene.js. Rendered through the shared course shell. */

export const pagesLesson = {
  id: 'pages',
  title: 'Pages',
  group: 'Storage Engine',
  summary: 'The fixed-size block the storage engine actually reads and writes — why databases never move one byte at a time, and what lives inside a page.',
  minutes: 8,
  level: 'beginner',
  metrics: ['pageSize', 'pages', 'ioOps', 'throughput'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a single byte still costs a whole disk trip', step: 0 },
    { text: 'The page: one fixed-size unit of storage and I/O', step: 1 },
    { text: 'What lives inside a page — header, records, free space', step: 2 },
    { text: 'Whole-page reads and writes between disk and RAM', step: 3 },
    { text: 'Choosing a page size, and the page as an address', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'One byte, one trip',
      title: 'You can never read just one byte',
      body: [
        `A row lives somewhere in a big data file on disk. You want one small field from it — a single integer. But disks and the operating system underneath don't deal in bytes; they hand out data in fixed-size <span class="term">blocks</span>.`,
        `So even to read four bytes, the engine must fetch the entire block they sit in. If records were packed at arbitrary byte offsets, every read would be an awkward, unaligned trip — and one record could straddle two blocks at once.`,
      ],
      callout: { kind: 'warn', text: 'Disk and OS move data in fixed blocks, not bytes. Reading one field means reading its whole block — so the real unit of cost is the block, not the byte.' },
      metrics: { pageSize: 8, pages: 1, ioOps: 1, throughput: 95 },
      scene: { view: 'unit', note: 'One field is wanted — but the whole block it lives in must be read.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Fixed pages',
      title: 'Cut the file into fixed-size pages',
      body: [
        `The storage engine gives the block a name of its own: the <span class="term">page</span>. It divides every data file into equal pages — classically 8&nbsp;KB each — and makes the page the one unit it ever reads, writes, or caches.`,
        `Fixed size is the whole trick. Page <b>N</b> always begins at offset <code>N × page_size</code>, so finding any page is a single multiplication — no scanning, no bookkeeping about where things start.`,
      ],
      callout: { kind: 'insight', text: 'A page is a fixed-size slice of a file. Fixed size turns "where is page N?" into one multiply — the foundation every index and buffer builds on.' },
      changes: ['+ file split into equal pages', '~ page = unit of I/O', '+ page N at offset N × size'],
      metrics: { pageSize: 8, pages: 64, ioOps: 1, throughput: 95 },
      scene: { view: 'grid', note: 'One file, a tidy grid of equal 8 KB pages.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Inside a page',
      title: 'What lives inside one page',
      body: [
        `Open a page up and it has a shape. A small <b>header</b> at the front holds bookkeeping — how many records are here, where the free space begins, a checksum. Then comes the <b>records area</b> packed with actual row data, and whatever is left over is <b>free space</b> waiting for the next insert.`,
        `This internal layout is a contract: every page in the file is organised the same way, so the engine can open any one of them and immediately know where everything is.`,
      ],
      callout: { kind: 'tip', text: 'Header (bookkeeping) · records (your data) · free space (room to grow). Every page follows the same template, so any page is self-describing.' },
      changes: ['+ header', '+ records area', '+ free space'],
      metrics: { pageSize: 8, pages: 64, ioOps: 1, throughput: 95 },
      scene: { view: 'anatomy', note: 'One page, three zones: header, records, free space.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Atomic I/O',
      title: 'Pages move whole, in and out of RAM',
      body: [
        `To touch a row, the engine reads its <em>entire</em> page off disk into a frame of memory. Changes are made there, in RAM. Later the whole page is written back — never a partial record, always the complete page.`,
        `That is why the page is called the unit of I/O: one read pulls a whole page up, one write pushes a whole page down. Batching a block's worth of rows into a single trip is exactly what makes disk access affordable.`,
      ],
      callout: { kind: 'insight', text: 'Read a page → whole page into RAM. Write a page → whole page to disk. The page is atomic for I/O: you never move half of one.' },
      changes: ['~ read pulls full page to RAM', '~ edits happen in memory', '~ write flushes full page'],
      metrics: { pageSize: 8, pages: 64, ioOps: 2, throughput: 110 },
      scene: { view: 'io', note: 'A whole page travels disk → RAM to be read, and back to be written.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Page size',
      title: 'How big should a page be?',
      body: [
        `The page size is a real choice. <b>Small</b> pages (4&nbsp;KB) waste little when you only need one row — a random read drags less along with it. <b>Large</b> pages (16&nbsp;KB) carry more rows per trip, so a big sequential scan finishes in fewer, fatter reads.`,
        `Small favours pinpoint lookups; large favours throughput. Most engines settle near 8&nbsp;KB as the compromise — big enough to amortise a disk trip, small enough not to haul data nobody asked for.`,
      ],
      callout: { kind: 'tip', text: 'Small pages = less waste per random read. Large pages = more throughput per scan. 8 KB is the common middle ground.' },
      metrics: { pageSize: 16, pages: 32, ioOps: 1, throughput: 180 },
      scene: { view: 'sizes', note: 'Smaller pages waste less per lookup; larger pages scan faster.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The page is the currency of storage',
      body: [
        `Everything above the disk speaks in pages. A row is addressed as <em>(page id, slot)</em>; an index points at page ids; the buffer pool caches pages; a write-ahead log records page changes. The page id times the page size is simply a file offset — that is the whole addressing scheme.`,
        `Hold onto this unit. The next lessons — records, slotted pages, the buffer pool, B-Trees — are all just different things to <em>do</em> with pages.`,
      ],
      callout: { kind: 'insight', text: 'Fixed-size page = unit of I/O, caching, addressing and logging. page_id × page_size = offset. Every storage lesson from here is built on it.' },
      metrics: { pageSize: 8, pages: 64, ioOps: 1, throughput: 95 },
      scene: { view: 'addressing', note: 'page_id × page_size = offset — the page is how storage counts.' },
    },
  ],
};
