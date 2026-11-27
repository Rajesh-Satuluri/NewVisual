/* content/lsm-lab.js — the "LSM Lab" interactive lesson, as DATA. A guided
   walkthrough that drives an LSM-tree through writes, flushes, reads and
   compaction, tying together WAL + MemTable, SSTables, bloom filters and
   compaction. Same shape as the other db-scale lessons: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/lsm-lab-scene.js. */

export const lsmLabLesson = {
  id: 'lsm-lab',
  title: 'LSM Lab',
  group: 'Interactive Labs',
  summary: 'Drive a log-structured merge-tree end to end: append writes to the WAL and MemTable, flush to immutable SSTables, read through bloom filters, and watch compaction tidy up — seeing the write/read/space trade-offs as they happen.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['memtable', 'sstables', 'writeAmp', 'readAmp'],
  legend: ['read', 'write', 'flush', 'compact'],
  goals: [
    { text: 'Why LSM-trees turn random writes into sequential ones', step: 0 },
    { text: 'The write path: WAL append + MemTable insert', step: 1 },
    { text: 'Flushing a full MemTable to an immutable SSTable', step: 2 },
    { text: 'The read path and how bloom filters cut work', step: 3 },
    { text: 'How compaction trades write-amp for read- and space-amp', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM / SETUP
      chapter: 'problem', short: 'Fast writes',
      title: 'The goal: swallow writes as fast as they arrive',
      body: [
        `We want a store that can absorb a <b>firehose of writes</b> — logs, metrics, feeds — without slowing down. A B+ tree updates records <em>in place</em>, so a burst of writes scatters into random page updates all over the disk, and random I/O is slow.`,
        `The <span class="term">log-structured merge-tree</span> (LSM) takes a different bet: never update in place. Only ever <b>append</b>, and sort things out later. We start with an empty store and follow a key through its whole life.`,
      ],
      callout: { kind: 'insight', text: 'An LSM-tree trades in-place updates for append-only writes: every write is sequential, and the mess of overlapping versions is cleaned up in the background by compaction.' },
      metrics: { memtable: 0, sstables: 0, writeAmp: 1, readAmp: 1 },
      scene: { view: 'empty', note: 'An empty LSM-tree: a WAL and MemTable in memory, disk levels waiting below.' },
    },
    { // 1 — WRITE PATH
      chapter: 'technique', short: 'Write path',
      title: 'Every write: append the WAL, insert the MemTable',
      body: [
        `A write does exactly two cheap things. First it <b>appends to the WAL</b> — the write-ahead log on disk — so the change is durable even if the machine crashes a microsecond later. That append is purely sequential: the disk head never seeks.`,
        `Second it inserts the key into the <span class="term">MemTable</span>, an in-memory sorted structure (a skip-list or balanced tree). RAM is fast and the data stays sorted, so the write returns almost instantly. No random disk writes happen at all.`,
      ],
      callout: { kind: 'tip', text: 'A durable write costs one sequential WAL append plus one in-memory insert. That is why LSM write throughput is so high — nothing touches disk randomly.' },
      changes: ['+ WAL append (sequential, durable)', '+ MemTable insert (in RAM, sorted)', '~ write acknowledged immediately'],
      metrics: { memtable: 3, sstables: 0, writeAmp: 1, readAmp: 1 },
      scene: { view: 'write', note: 'Writes stream into the WAL and the sorted MemTable — sequential and in-memory.' },
    },
    { // 2 — FLUSH
      chapter: 'technique', short: 'Flush',
      title: 'When the MemTable fills, flush it to an SSTable',
      body: [
        `The MemTable can't grow forever. Once it crosses a size threshold it is <span class="term">frozen</span> and <b>flushed</b> to disk in one sequential pass as a <span class="term">Sorted String Table</span> (SSTable) — an immutable file of key/value pairs in sorted order.`,
        `Because the MemTable was already sorted, the flush is a single streaming write. Once the SSTable is safely on disk, the WAL segment that backed that MemTable can be dropped, and a fresh empty MemTable starts taking writes. Flushing never blocks new writes for long.`,
      ],
      callout: { kind: 'insight', text: 'SSTables are immutable: once written, a file is never modified. Updates and deletes become new entries in newer SSTables — the old value just gets superseded.' },
      changes: ['+ MemTable frozen → flushed as SSTable', '− WAL segment for it dropped', '+ new empty MemTable started'],
      metrics: { memtable: 1, sstables: 1, writeAmp: 2, readAmp: 2 },
      scene: { view: 'flush', note: 'A full MemTable streams to disk as one immutable, sorted SSTable.' },
    },
    { // 3 — READ PATH
      chapter: 'technique', short: 'Read path',
      title: 'Reads walk newest → oldest, skipping with bloom filters',
      body: [
        `A key's latest value might be anywhere. So a read checks the <b>MemTable first</b> (newest data), then each SSTable from <b>newest to oldest</b>, stopping at the first hit. With many SSTables that could mean many disk lookups — this is <span class="term">read amplification</span>.`,
        `Each SSTable carries a <span class="term">bloom filter</span>: a tiny in-memory bitmap that answers "could this key be in here?" If it says <em>no</em>, the read skips that file entirely without touching disk. Bloom filters turn "check every SSTable" into "check only the one or two that might hold the key."`,
      ],
      callout: { kind: 'tip', text: 'A bloom filter never misses a present key (no false negatives) but may occasionally say "maybe" when the key is absent. That rare false positive costs one wasted lookup — a cheap price for skipping most files.' },
      metrics: { memtable: 1, sstables: 3, writeAmp: 2, readAmp: 3 },
      scene: { view: 'read', note: 'A read probes MemTable then SSTables newest→oldest; bloom filters skip the misses.' },
    },
    { // 4 — COMPACTION / TRADE-OFF
      chapter: 'tradeoff', short: 'Compaction',
      title: 'Compaction trades write-amp for read- and space-amp',
      body: [
        `Keep flushing and SSTables pile up. Reads get slower (more files to probe) and disk fills with <b>stale data</b> — overwritten values and <span class="term">tombstones</span> (delete markers) that nothing has cleaned up yet. That's read amplification and <span class="term">space amplification</span>.`,
        `<span class="term">Compaction</span> runs in the background: it merges several SSTables into fewer, larger ones, keeping only the newest value for each key and dropping tombstones. The cost is <span class="term">write amplification</span> — the same data gets rewritten several times over its life. Tuning compaction is choosing where to sit on the write- vs read- vs space-amp triangle.`,
      ],
      callout: { kind: 'warn', text: 'You cannot minimize write, read and space amplification at once. Aggressive compaction gives fast reads and compact storage but rewrites data often; lazy compaction saves writes but bloats reads and disk.' },
      changes: ['~ many SSTables merged into fewer', '− stale versions & tombstones dropped', '+ write-amp rises, read- & space-amp fall'],
      metrics: { memtable: 1, sstables: 1, writeAmp: 4, readAmp: 1 },
      scene: { view: 'compact', note: 'Compaction merges SSTables, drops obsolete keys, and keeps the levels tidy.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The whole LSM loop, in one picture',
      body: [
        `You just drove the full cycle: writes <b>append</b> to the WAL and a sorted <b>MemTable</b>; a full MemTable <b>flushes</b> to an immutable <b>SSTable</b>; reads walk newest→oldest, <b>bloom-filtered</b>; and <b>compaction</b> merges files in the background to keep reads fast and disk tidy.`,
        `This is why LSM-trees (RocksDB, Cassandra, LevelDB, ScyllaDB) dominate write-heavy workloads: sequential writes, cheap durability, and all the housekeeping deferred to compaction — where you choose the trade-off that fits your read/write/space budget.`,
      ],
      callout: { kind: 'insight', text: 'LSM = append-only writes → immutable sorted files → bloom-filtered reads → background compaction. Brilliant write throughput, with read and space cost managed by how hard you compact.' },
      metrics: { memtable: 1, sstables: 2, writeAmp: 3, readAmp: 2 },
      scene: { view: 'recap', note: 'Write → flush → read → compact: one loop that keeps absorbing writes forever.' },
    },
  ],
};
