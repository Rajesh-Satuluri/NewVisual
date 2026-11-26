/* content/memtable-wal.js — the "MemTable & WAL" lesson, as DATA.
   Same shape as content/lsm.js / content/dbms.js: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/memtable-wal-scene.js. */

export const memtableWalLesson = {
  id: 'memtable-wal',
  title: 'MemTable & WAL',
  group: 'Storage Engine',
  summary: 'How an LSM storage engine makes a write both fast and crash-proof at the same time: buffer it in a sorted in-memory MemTable, but append it to a durable Write-Ahead Log first.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['memtable', 'writeAmp', 'flushes', 'latency'],
  legend: ['read', 'write', 'flush'],
  goals: [
    { text: 'Why durable-and-fast writes seem to pull in opposite directions', step: 0 },
    { text: 'The MemTable: a sorted in-RAM buffer that absorbs writes cheaply', step: 1 },
    { text: 'Why an in-memory-only buffer is unacceptable on its own', step: 2 },
    { text: 'The Write-Ahead Log: append once to disk, durable before ack', step: 3 },
    { text: 'Recovery by replay, and flushing a full MemTable to an SSTable', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'The dilemma',
      title: 'Fast or durable — pick one?',
      body: [
        `Every write has to satisfy two demands that seem to fight each other. It must be <b>durable</b> — once you acknowledge it, a crash a millisecond later must not lose it — and it must be <b>fast</b>, because the database may take hundreds of thousands of writes a second.`,
        `Write each row straight into a sorted structure on disk and every write becomes a <span class="term">random</span> seek-and-update: safe, but painfully slow. Buffer writes only in memory and they fly — until the power blinks and they are simply <em>gone</em>.`,
      ],
      callout: { kind: 'warn', text: 'Random writes to disk are durable but slow. A pure RAM buffer is fast but vanishes on a crash. Neither option is acceptable alone.' },
      metrics: { memtable: 0, writeAmp: 11.0, flushes: 0, latency: 9 },
      scene: { view: 'dilemma', note: 'Two tempting options — each fails one of the two requirements.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'MemTable',
      title: 'Absorb writes in a sorted MemTable',
      body: [
        `The first half of the trick is the <span class="term">MemTable</span>: an in-RAM, <b>sorted</b> structure — a balanced tree or a skip list — that every write lands in. Inserting a key is an <code>O(log n)</code> pointer shuffle in memory, with <em>no</em> disk I/O on the hot path.`,
        `Because it is kept in key order, the MemTable can also serve reads and, later, be written out to disk in one clean sorted sweep. Writes are now cheap and fast.`,
      ],
      callout: { kind: 'insight', text: 'The MemTable turns a random on-disk update into a cheap in-memory insert. Writes stop touching the disk one row at a time.' },
      changes: ['+ in-RAM sorted MemTable', '~ writes buffered in memory', '- no per-write random disk I/O'],
      metrics: { memtable: 38, writeAmp: 1.0, flushes: 0, latency: 1 },
      scene: { view: 'memtable', note: 'Writes flow into a sorted in-memory structure — no disk seek per write.' },
    },
    { // 2 — PROBLEM
      chapter: 'problem', short: 'Volatile',
      title: 'But RAM forgets everything',
      body: [
        `Speed bought with memory has a brutal catch: RAM is <span class="term">volatile</span>. A crash, a power loss, a killed process — and the entire MemTable, every write you accepted since the last flush to disk, evaporates.`,
        `A database that can lose acknowledged writes is not a database. So the MemTable alone can never be the whole answer; something on disk has to remember what the MemTable is holding.`,
      ],
      callout: { kind: 'warn', text: 'Anything that lives only in the MemTable is one crash away from gone. We have speed, but we have thrown away durability.' },
      metrics: { memtable: 64, writeAmp: 1.0, flushes: 0, latency: 1 },
      scene: { view: 'volatile', note: 'A crash wipes RAM — and with it every un-flushed write.' },
    },
    { // 3 — SOLUTION
      chapter: 'solution', short: 'WAL',
      title: 'Write it to the log first',
      body: [
        `The second half is the <span class="term">Write-Ahead Log</span> (WAL). Before a write is allowed to touch the MemTable, it is <b>appended</b> to a log file on disk. Appending is pure <span class="term">sequential</span> I/O — no seeking — so it is almost as fast as the memory write itself.`,
        `The rule is in the name: the change goes to the log <em>ahead</em> of everything else. The moment the append is durable, the write can be acknowledged; the MemTable is updated for speed, the WAL stands behind it for safety.`,
      ],
      callout: { kind: 'insight', text: 'WAL first, MemTable second. One sequential append makes the write durable; the in-memory update makes it fast. You get both.' },
      changes: ['+ append-only WAL on disk', '~ log before MemTable', '+ durable at acknowledge time'],
      metrics: { memtable: 96, writeAmp: 1.1, flushes: 0, latency: 1 },
      scene: { view: 'wal', note: 'Each write is appended to the WAL, then placed in the MemTable.' },
    },
    { // 4 — HOW IT WORKS
      chapter: 'technique', short: 'Recover & flush',
      title: 'Replay to recover, flush when full',
      body: [
        `Now a crash is survivable. On restart the engine <b>replays</b> the WAL from the last checkpoint, re-inserting every logged write to rebuild the MemTable exactly as it was. Nothing acknowledged is ever lost.`,
        `And the MemTable does not grow forever: once it fills, it is <span class="term">flushed</span> in one sequential sweep to an immutable on-disk <span class="term">SSTable</span>. After the flush, the WAL segment covering those writes is no longer needed and can be discarded.`,
      ],
      callout: { kind: 'tip', text: 'Recovery = replay the WAL. Flush = write a full MemTable out as a sorted SSTable, then retire the covered log. The MemTable stays small and fast.' },
      changes: ['+ WAL replay on restart', '+ flush full MemTable → SSTable', '~ retire covered WAL segment'],
      metrics: { memtable: 9, writeAmp: 1.2, flushes: 1, latency: 1 },
      scene: { view: 'recovery', note: 'Replay rebuilds the MemTable; a full MemTable flushes to an SSTable.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Fast and durable, together',
      body: [
        `The write path is a pair working in concert: the <b>WAL</b> gives durability with a single sequential append, and the <b>MemTable</b> gives speed with a sorted in-memory insert. Acknowledge after the log; serve from memory; recover by replay; flush when full.`,
        `This is the engine that lets log-structured stores (LevelDB, RocksDB, Cassandra and friends) accept writes at enormous rates without ever risking an acknowledged change — the foundation the SSTable and compaction lessons build on next.`,
      ],
      callout: { kind: 'insight', text: 'WAL (sequential, durable) + MemTable (in-RAM, sorted, fast) = high-throughput writes that survive crashes. That is the heart of LSM write performance.' },
      metrics: { memtable: 41, writeAmp: 1.1, flushes: 3, latency: 1 },
      scene: { view: 'recap', note: 'One write, logged for safety and buffered for speed, flushed when full.' },
    },
  ],
};
