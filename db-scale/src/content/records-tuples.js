/* content/records-tuples.js — the "Records & Tuples" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/records-tuples-scene.js. Rendered through the shared course shell. */

export const recordsTuplesLesson = {
  id: 'records-tuples',
  title: 'Records & Tuples',
  group: 'Storage Engine',
  summary: 'How a logical row — an idea with named columns — becomes a precise sequence of bytes the storage engine can write to, and find again inside, a page.',
  minutes: 8,
  level: 'beginner',
  metrics: ['rows', 'columns', 'pageSize', 'pages'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a tuple must be encoded as a fixed byte layout', step: 0 },
    { text: 'The anatomy of a record: header, bitmap, fixed, variable', step: 1 },
    { text: 'Fixed-length fields sit at known offsets; variable ones trail', step: 2 },
    { text: 'A null bitmap makes NULL columns almost free', step: 3 },
    { text: 'A row id = (page, slot) addresses any record on disk', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'An idea',
      title: 'A row is an idea; disk stores bytes',
      body: [
        `You think of a row as a tidy little fact: <code>users(id=42, name='Ada', email='ada@x.io')</code> — three named columns, each with a type. That is the <span class="term">logical</span> picture.`,
        `Disk knows nothing about columns. It stores a flat run of bytes. So the storage engine needs a <b>record format</b>: a rule for turning the tuple into an exact byte sequence, and for reading the columns back out of it — unambiguously, every time.`,
      ],
      callout: { kind: 'warn', text: 'Columns, types and NULLs are logical. The disk only sees bytes. Something has to encode one into the other — and decode it back without guessing.' },
      metrics: { rows: 1, columns: 3, pageSize: 8, pages: 1 },
      scene: { view: 'row', note: 'One logical tuple — how does it become bytes on a page?' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Record layout',
      title: 'The anatomy of a record',
      body: [
        `A record is laid out as a few contiguous sections. First a small <b>header</b> (total length, a transaction id, flags). Then a <b>null bitmap</b> — one bit per column. Then the <b>fixed-length fields</b> packed back-to-back. Finally the <b>variable-length data</b> at the tail.`,
        `That order is deliberate: everything the reader needs to find a column is near the front, and the sprawling, unpredictable stuff is pushed to the end where it can grow.`,
      ],
      callout: { kind: 'insight', text: 'header · null bitmap · fixed-length fields · variable-length data. One record, four sections, always in that order.' },
      changes: ['+ record header', '+ null bitmap', '+ fixed fields', '+ variable tail'],
      metrics: { rows: 1, columns: 3, pageSize: 8, pages: 1 },
      scene: { view: 'layout', note: 'Four sections, laid out front to back inside one record.' },
    },
    { // 2 — TECHNIQUE
      chapter: 'technique', short: 'Fixed vs variable',
      title: 'Fixed fields get offsets; variable fields trail',
      body: [
        `An <code>INT</code> is always 4 bytes, a <code>BOOL</code> one — so a fixed-length field lives at a <b>known offset</b> from the record's start. Reading it is pure arithmetic: jump to the offset, read N bytes. No scanning.`,
        `A <code>VARCHAR</code> has no fixed size, so it cannot sit among the fixed fields without wrecking every offset after it. Instead the fixed area holds a small <b>(offset, length)</b> pointer, and the actual text lives in the variable tail.`,
      ],
      callout: { kind: 'tip', text: 'Fixed-length → stored inline at a computed offset. Variable-length → a length-prefixed blob in the tail, reached by a pointer. Offsets stay stable either way.' },
      changes: ['~ int/bool at fixed offsets', '~ varchar → (offset, len) + tail blob'],
      metrics: { rows: 1, columns: 3, pageSize: 8, pages: 1 },
      scene: { view: 'fixed-var', note: 'Fixed fields have stable offsets; variable data is pushed to the tail.' },
    },
    { // 3 — TECHNIQUE
      chapter: 'technique', short: 'Null bitmap',
      title: 'A bitmap makes NULLs almost free',
      body: [
        `What about a missing value? Storing a special "null" marker inside each field would waste space and blur real data. Instead the header carries a <span class="term">null bitmap</span>: one bit per column, set to 1 when that column is NULL.`,
        `A null column then stores <em>no bytes at all</em> in the fixed or variable area — the reader checks the bit first and skips it. A row that is mostly NULLs costs almost nothing.`,
      ],
      callout: { kind: 'insight', text: 'One bit per column in the header says "this one is NULL." Null values occupy zero payload bytes — the bitmap alone records them.' },
      changes: ['+ 1 bit per column', '~ NULL columns store 0 payload bytes'],
      metrics: { rows: 1, columns: 3, pageSize: 8, pages: 1 },
      scene: { view: 'header', note: 'The null bitmap: one bit per column, read before the payload.' },
    },
    { // 4 — TECHNIQUE
      chapter: 'technique', short: 'Row id',
      title: 'Packed in a page, found by row id',
      body: [
        `Records don't float free — many are packed into one fixed-size <b>page</b> (often 8 KB). To point at a specific record, the engine uses a <span class="term">row id</span>: a pair <code>(page number, slot)</code>.`,
        `The page number finds the right page on disk; the slot finds the record inside it. Every index entry, every internal pointer, ultimately resolves to a row id — the storage engine's physical address for a tuple.`,
      ],
      callout: { kind: 'tip', text: 'row id = (page, slot). The page locates the block on disk; the slot locates the record within it. That pair is a tuple’s physical address.' },
      changes: ['+ many records per page', '+ row id = (page, slot)'],
      metrics: { rows: 24, columns: 3, pageSize: 8, pages: 1 },
      scene: { view: 'rowid', note: 'A row id (page, slot) addresses one record among many in a page.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'From tuple to bytes and back',
      body: [
        `A record is a tuple, encoded: a <b>header</b> with a null bitmap, the <b>fixed-length</b> fields at stable offsets, and the <b>variable-length</b> data trailing behind them. NULLs cost only a bit.`,
        `Many records pack into a page, and each is addressed by a <b>row id</b> of <code>(page, slot)</code>. Next we'll see how the page itself tracks those slots — the slotted-page layout.`,
      ],
      callout: { kind: 'insight', text: 'header + bitmap + fixed + variable, packed into pages, addressed by (page, slot). That is the bridge between a logical row and the bytes on disk.' },
      metrics: { rows: 24, columns: 3, pageSize: 8, pages: 1 },
      scene: { view: 'recap', note: 'One record format — the foundation under every table on disk.' },
    },
  ],
};
