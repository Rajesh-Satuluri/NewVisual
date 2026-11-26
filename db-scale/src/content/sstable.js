/* content/sstable.js — the "SSTable" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/sstable-scene.js. Rendered through the shared course shell. */

export const sstableLesson = {
  id: 'sstable',
  title: 'SSTable',
  group: 'Storage Engine',
  summary: 'The Sorted String Table — the immutable, sorted file a MemTable flush leaves on disk, and the block + sparse-index layout that makes it fast to read back.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['sstables', 'blocks', 'pages', 'readAmp'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a raw flushed dump is slow to read back', step: 0 },
    { text: 'Sorted + immutable: the two defining properties', step: 1 },
    { text: 'Entries grouped into fixed-size data blocks', step: 2 },
    { text: 'A sparse index turns a scan into one block read', step: 3 },
    { text: 'Many SSTables → read amplification', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Flushed dump',
      title: 'A flush has to land as something readable',
      body: [
        `When the in-memory <span class="term">MemTable</span> fills up, the engine writes it out to a file on disk. But if it just dumped the keys in arrival order, finding one key later would mean <em>reading the whole file</em> — every page, top to bottom.`,
        `The file has to be written once, fast and sequentially, yet still support quick point lookups <b>and</b> ordered range scans forever after. A flat, unstructured dump gives you none of that.`,
      ],
      callout: { kind: 'warn', text: 'An unindexed flush is write-once but read-terrible: every lookup degrades to a full O(n) scan of the file.' },
      metrics: { sstables: 1, blocks: 1, pages: 512, readAmp: 1 },
      scene: { view: 'flush-in', note: 'MemTable flushes to disk — but an unstructured dump must be scanned end to end.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Sorted & frozen',
      title: 'Sorted on the way out, then frozen',
      body: [
        `The fix is to write the entries <span class="term">sorted by key</span> as they stream to disk — cheap, because the MemTable already holds them in order. The result is a <b>Sorted String Table</b>: key→value pairs in ascending key order.`,
        `And it is <span class="term">immutable</span>: once written, an SSTable is never modified in place — only created and, much later, deleted. No updates means no locks on readers and no torn pages; a reader can trust the bytes completely.`,
      ],
      callout: { kind: 'insight', text: 'Sorted + immutable is the whole trick. Order enables binary search and range scans; immutability makes reads lock-free and safe.' },
      changes: ['+ entries sorted by key', '+ file is write-once, read-only', '~ updates land in newer tables, not here'],
      metrics: { sstables: 1, blocks: 1, pages: 512, readAmp: 1 },
      scene: { view: 'sorted', note: 'Keys ascend; the file is frozen the moment it is written.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Data blocks',
      title: 'Grouped into fixed-size blocks',
      body: [
        `The sorted entries are packed into fixed-size <span class="term">data blocks</span> — typically 4 KB, matching the disk's I/O unit. A block is the smallest thing the engine reads: you never fetch one key, you fetch the block that contains it.`,
        `Because keys are sorted, each block covers a contiguous <b>key range</b>. Block 0 holds the lowest keys, block 1 the next range, and so on up the file.`,
      ],
      callout: { kind: 'tip', text: 'The data block is the read unit. Fixed size + sorted ranges let the engine reason about “which block holds this key” with pure arithmetic.' },
      changes: ['+ entries packed into 4 KB blocks', '+ each block = one contiguous key range'],
      metrics: { sstables: 1, blocks: 128, pages: 512, readAmp: 1 },
      scene: { view: 'blocks', note: 'One SSTable, many fixed-size data blocks — the unit of disk I/O.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Sparse index',
      title: 'A sparse index finds the block',
      body: [
        `At the end of the file sits a <span class="term">sparse index</span>: just the <b>first key of every block</b> paired with that block's offset. It is tiny — one entry per block, not per key — so it fits in memory easily.`,
        `A lookup binary-searches the sparse index to the one block whose range covers the key, seeks straight to its offset, and reads that <em>single</em> block. A 512-page scan collapses to one block read.`,
      ],
      callout: { kind: 'insight', text: 'Sparse index = one key per block. Binary-search it in RAM, then do exactly one targeted block read. Point lookups go from O(n) to O(1) I/O.' },
      changes: ['+ sparse index: first key → block offset', '~ lookup = search index, read one block', '− pages read: 512 → ~2'],
      metrics: { sstables: 1, blocks: 128, pages: 2, readAmp: 1 },
      scene: { view: 'index', note: 'Binary-search the sparse index, then read exactly one block.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Many tables',
      title: 'But flushes keep making more',
      body: [
        `Every MemTable flush writes a <em>new</em> SSTable; none is ever edited. So over time the key you want could live in any one of several SSTables — the newest copy wins, but you may have to look in each.`,
        `That is <span class="term">read amplification</span>: one logical read fanning out across many files. The next lessons tackle it two ways — <b>bloom filters</b> to skip files that can't hold the key, and <b>compaction</b> to merge tables back together.`,
      ],
      callout: { kind: 'warn', text: 'Immutability is bought with multiplication: more flushes, more SSTables, more files to probe per read. Compaction and bloom filters pay it back.' },
      changes: ['+ each flush = a new SSTable', '− a read may probe every table', '→ bloom filters & compaction (next)'],
      metrics: { sstables: 4, blocks: 512, pages: 8, readAmp: 4 },
      scene: { view: 'levels', note: 'Four SSTables; one read may have to probe them all.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'What an SSTable guarantees',
      body: [
        `An SSTable is <b>sorted</b> (binary search + range scans), <b>immutable</b> (lock-free, crash-safe reads), <b>block-structured</b> (reads align to disk I/O units), and <b>sparse-indexed</b> (any key in one targeted block read).`,
        `Together those four properties make a single flush a genuinely good read structure — and set up the merge-and-filter machinery that keeps a whole LSM-tree fast as the tables pile up.`,
      ],
      callout: { kind: 'insight', text: 'Sorted · Immutable · Block-structured · Sparse-indexed. The SSTable is the on-disk backbone of every LSM storage engine.' },
      metrics: { sstables: 4, blocks: 512, pages: 2, readAmp: 4 },
      scene: { view: 'recap', note: 'One durable, sorted, block-indexed file — the LSM-tree’s building block.' },
    },
  ],
};
