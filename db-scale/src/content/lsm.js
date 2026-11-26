/* content/lsm.js — the LSM-Tree lesson, as DATA.
   Each step: { chapter, short, title, body[], callout, metrics, scene }
   `scene` is a snapshot-shaped object (see lsm-scene.js) OR { lab:true } for the
   live kernel lab. Content is adapted from the db-lab deep-dive (ShopKart story),
   re-packaged into the Designed-to-Scale narrative arc. */

const K = (key, value, tomb = false) => ({ key, value, tomb });
const SS = (id, level, entries) => ({
  id, level, entries, min: entries[0].key, max: entries[entries.length - 1].key, bloom: entries.map(e => e.key),
});
const mem = (...pairs) => Object.fromEntries(pairs.map(([k, v, t]) => [k, { value: t ? null : v, tomb: !!t }]));

export const lsmLesson = {
  id: 'lsm-tree',
  title: 'LSM-Tree',
  group: 'Storage Engine',
  summary: 'How write-optimized stores turn random writes into sequential ones — and what that costs on reads.',
  minutes: 12,
  level: 'intermediate',
  metrics: ['memtable', 'sstables', 'readAmp', 'writeAmp'],
  legend: ['write', 'flush', 'compact', 'read'],
  goals: [
    { text: 'Why in-place updates punish write-heavy workloads', step: 0 },
    { text: 'The write path: WAL + MemTable', step: 1 },
    { text: 'Flushing a MemTable into an immutable SSTable', step: 2 },
    { text: 'Read amplification across stacked SSTables', step: 4 },
    { text: 'Compaction, and the write/space amplification it costs', step: 5 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Random writes',
      title: 'In-place updates thrash the disk',
      body: [
        `ShopKart's clickstream pours in millions of writes a minute. A classic B+Tree index updates data <em>in place</em>: find the page, read it, modify it, write it back — a <span class="term">random</span> disk write per update.`,
        `Random I/O is the slowest thing a disk does. Under a write-heavy load, the index becomes the bottleneck. We need writes that are <b>sequential</b>.`,
      ],
      callout: { kind: 'warn', text: 'Every in-place update is a read-modify-write of a page — random I/O that collapses under write-heavy load.' },
      metrics: { memtable: 0, sstables: 0, readAmp: 0, writeAmp: 0 },
      scene: { mem: {}, wal: 0, levels: [[]], note: 'A write-heavy workload is about to hit the store.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'WAL + MemTable',
      title: 'Append to a log, remember in RAM',
      body: [
        `An LSM-Tree makes every write cheap: append one record to a <span class="term">WAL</span> (durability), then insert into the <span class="term">MemTable</span> — a sorted in-memory structure. No page lookup, no random write.`,
        `The WAL append is sequential; the MemTable keeps keys sorted so it can later be written out as one sorted file.`,
      ],
      callout: { kind: 'insight', text: 'A write = one sequential WAL append + one in-memory insert. That is why LSM ingest throughput is enormous.' },
      changes: ['+ WAL append per write', '+ MemTable insert'],
      metrics: { memtable: 3, sstables: 0, readAmp: 0, writeAmp: 1.0 },
      scene: { mem: mem([12, 100], [42, 7], [88, 3]), wal: 3, levels: [[]], note: 'PUT 12=100, 42=7, 88=3 → WAL + MemTable.' },
    },
    { // 2 — TECHNIQUE
      chapter: 'technique', short: 'Flush → L0',
      title: 'A full MemTable flushes to an SSTable',
      body: [
        `When the MemTable hits its size limit, it is flushed: written out, already sorted, as an immutable <span class="term">SSTable</span> at level 0. The WAL for that MemTable can then be discarded.`,
        `SSTables are never modified. New data always arrives as <em>new</em> files — that immutability is what keeps writes sequential.`,
      ],
      callout: { kind: 'tip', text: 'An SSTable (Sorted String Table) is a sorted, immutable file of key→value entries. Flushing is one big sequential write.' },
      changes: ['~ MemTable → SSTable #1 at L0', '~ WAL cleared'],
      metrics: { memtable: 0, sstables: 1, readAmp: 1, writeAmp: 1.0 },
      scene: { mem: {}, wal: 0, levels: [[SS(1, 0, [K(12, 100), K(42, 7), K(88, 3)])]], note: 'Flushed MemTable → SSTable #1 (L0).' },
    },
    { // 3 — TECHNIQUE
      chapter: 'technique', short: 'L0 stacks',
      title: 'More flushes stack up at L0',
      body: [
        `Keep writing and you keep flushing. L0 accumulates several SSTables whose key ranges <b>overlap</b> — the same key can exist in more than one of them, newest wins.`,
        `Each SSTable is cheap to produce, but they are piling up.`,
      ],
      callout: { kind: 'insight', text: 'At L0, SSTables overlap: a key may appear in several, so a read cannot stop at the first table it checks.' },
      changes: ['+ SSTable #2, #3 at L0'],
      metrics: { memtable: 1, sstables: 3, readAmp: 3, writeAmp: 1.0 },
      scene: {
        mem: mem([51, 9]), wal: 1,
        levels: [[SS(1, 0, [K(12, 100), K(42, 7), K(88, 3)]), SS(2, 0, [K(7, 1), K(42, 70), K(60, 5)]), SS(3, 0, [K(12, 101), K(99, 2)])]],
        note: '3 SSTables at L0 with overlapping ranges.',
      },
    },
    { // 4 — PROBLEM
      chapter: 'problem', short: 'Read amp',
      title: 'Reads must probe every overlapping table',
      body: [
        `To GET key 42, the store checks the MemTable, then <em>every</em> L0 SSTable whose range covers 42, newest first, until it finds the key. More SSTables ⇒ more probes per read — <span class="term">read amplification</span>.`,
        `Bloom filters skip tables that definitely lack the key, but overlapping L0 tables still force real work.`,
      ],
      callout: { kind: 'warn', text: 'Write-optimization has a price: a read may touch many files. Read amplification grows with the number of SSTables.' },
      metrics: { memtable: 1, sstables: 3, readAmp: 3, writeAmp: 1.0 },
      scene: {
        mem: mem([51, 9]), wal: 1, hiKey: 42,
        levels: [[SS(1, 0, [K(12, 100), K(42, 7), K(88, 3)]), SS(2, 0, [K(7, 1), K(42, 70), K(60, 5)]), SS(3, 0, [K(12, 101), K(99, 2)])]],
        note: 'GET 42 probes MemTable + two L0 tables.',
      },
      probe: [1, 2],
    },
    { // 5 — SOLUTION / TECHNIQUE
      chapter: 'technique', short: 'Compaction',
      title: 'Compaction merges tables downward',
      body: [
        `<span class="term">Compaction</span> merge-sorts the overlapping L0 tables into a single, non-overlapping run at L1, keeping only the newest value per key and <b>dropping tombstones</b> (deletions).`,
        `Now most keys live in one sorted place: reads probe far fewer files.`,
      ],
      callout: { kind: 'insight', text: 'Compaction trades background write work for cheaper reads and reclaimed space — the core LSM balancing act.' },
      changes: ['~ L0 #1,#2,#3 → one L1 run', '- tombstones dropped', '~ Read amp 3 → 1'],
      metrics: { memtable: 1, sstables: 1, readAmp: 1, writeAmp: 2.0 },
      scene: {
        mem: mem([51, 9]), wal: 1, pulse: 'compact',
        levels: [[], [SS(4, 1, [K(7, 1), K(12, 101), K(42, 70), K(60, 5), K(88, 3), K(99, 2)])]],
        note: 'Compacted L0 → one sorted L1 run.',
      },
    },
    { // 6 — TRADEOFF
      chapter: 'tradeoff', short: 'The costs',
      title: 'Write & space amplification',
      body: [
        `Nothing is free. Every key is rewritten each time it is compacted to a deeper level — <span class="term">write amplification</span>. And until compaction runs, old versions and tombstones linger — <span class="term">space amplification</span>.`,
        `Tuning an LSM store is choosing where on the write-amp / read-amp / space-amp triangle you want to sit.`,
      ],
      callout: { kind: 'warn', text: 'Write amp ↑ with compaction; read amp ↑ without it; space amp ↑ while dead versions wait. You trade among the three — you do not escape them.' },
      metrics: { memtable: 1, sstables: 1, readAmp: 1, writeAmp: 2.0 },
      scene: {
        mem: mem([51, 9]), wal: 1,
        levels: [[], [SS(4, 1, [K(7, 1), K(12, 101), K(42, 70), K(60, 5), K(88, 3), K(99, 2)])]],
        note: 'One run at L1 — but it took rewrites to get here.',
      },
    },
    { // 7 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'LSM-Tree in one breath',
      body: [
        `Writes: <b>WAL append + MemTable insert</b> → flush to an immutable L0 SSTable. Reads: probe MemTable → L0 → deeper levels (Bloom filters prune). Background <b>compaction</b> merges tables, drops tombstones, and tames read & space amplification at the cost of write amplification.`,
        `This is the engine behind RocksDB, Cassandra, LevelDB, ScyllaDB and HBase — write-optimized stores for ingest-heavy workloads.`,
      ],
      callout: { kind: 'tip', text: 'B+Tree = read-optimized, update in place. LSM = write-optimized, append + compact. Pick by workload.' },
      metrics: { memtable: 1, sstables: 1, readAmp: 1, writeAmp: 2.0 },
      scene: {
        mem: mem([51, 9]), wal: 1,
        levels: [[], [SS(4, 1, [K(7, 1), K(12, 101), K(42, 70), K(60, 5), K(88, 3), K(99, 2)])]],
        note: 'The whole write path, start to finish.',
      },
    },
    { // 8 — LIVE LAB
      chapter: 'technique', short: '⚡ Live lab',
      title: 'Drive a real LSM-Tree',
      body: [
        `Everything above was the <em>same</em> renderer fed hand-authored states. Now it is fed a real, deterministic LSM kernel — the one from db-lab, unit-tested, invariant-checked. Put keys, delete them, force flushes and compactions, and watch its true state.`,
      ],
      callout: { kind: 'insight', text: 'Guided scenes and this live lab share one renderer. That is the superset: narrative polish over a runnable engine.' },
      metrics: null,
      scene: { lab: true },
    },
  ],
};
