/* content/lsm-compaction.js — the "LSM Compaction" lesson, as DATA.
   Same shape as content/lsm.js and content/dbms.js: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/lsm-compaction-scene.js. */

export const lsmCompactionLesson = {
  id: 'lsm-compaction',
  title: 'LSM Compaction',
  group: 'Storage Engine',
  summary: 'The background process that keeps a log-structured store healthy: merging piles of sorted files to hold down read and space amplification — and the write-amplification price it pays to do it.',
  minutes: 10,
  level: 'advanced',
  metrics: ['sstables', 'writeAmp', 'spaceAmp', 'readAmp'],
  legend: ['read', 'write', 'compact'],
  goals: [
    { text: 'Why unmerged SSTables wreck read and space amplification', step: 0 },
    { text: 'Compaction as a k-way merge of already-sorted files', step: 1 },
    { text: 'How merges drop overwritten keys and tombstoned deletes', step: 2 },
    { text: 'Size-tiered compaction: cheap writes, costly reads', step: 3 },
    { text: 'Leveled compaction: cheap reads, costly writes', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'The pile-up',
      title: 'Every flush leaves another file behind',
      body: [
        `An LSM-tree turns writes into speed by never updating in place: each time the MemTable fills, it is flushed to a new immutable <span class="term">SSTable</span> on disk. Fast to write — but the files just keep <em>accumulating</em>.`,
        `Now a single <code>GET</code> may have to probe <b>every</b> file, newest to oldest, until it finds the key — that is <span class="term">read amplification</span>. And because an overwrite or a delete only appends a newer record, old and dead versions of a key sit on disk forever: <span class="term">space amplification</span>.`,
      ],
      callout: { kind: 'warn', text: 'Left alone, an LSM-tree degrades into dozens of overlapping files: reads touch all of them, and disk fills with stale, overwritten and deleted rows.' },
      metrics: { sstables: 9, writeAmp: 1.0, spaceAmp: 2.8, readAmp: 9 },
      scene: { view: 'pileup', note: 'Nine unmerged SSTables — every read probes all of them.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Merge runs',
      title: 'Merge the sorted runs',
      body: [
        `<span class="term">Compaction</span> is a background job that reads several SSTables and writes out <b>fewer, larger</b> ones. The trick: every SSTable is already sorted by key, so combining them is a <span class="term">k-way merge</span> — walk all inputs in lock-step, emit keys in order, in one linear sweep.`,
        `Ten files become one. A read that used to probe nine now probes a handful, and the merged file holds each key exactly once.`,
      ],
      callout: { kind: 'insight', text: 'Because the inputs are sorted, compaction is a streaming merge — sequential reads in, one sequential file out. No random I/O, no sort.' },
      changes: ['~ k sorted inputs → 1 sorted output', '− read amplification', '+ one sequential write'],
      metrics: { sstables: 3, writeAmp: 1.6, spaceAmp: 1.6, readAmp: 3 },
      scene: { view: 'merge', note: 'Four sorted inputs stream through a k-way merge into one output.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Dedup',
      title: 'Drop the overwrites and the dead',
      body: [
        `The merge is where garbage actually gets collected. When the same key appears in several inputs, compaction keeps only the <b>newest</b> version and discards the rest — overwritten values vanish.`,
        `A delete is just a <span class="term">tombstone</span> — a marker that cancels every older value of its key. Once that tombstone has been merged down past the lowest level (so no older version can possibly survive below it), the tombstone itself is dropped. Only then is the row truly gone.`,
      ],
      callout: { kind: 'tip', text: 'Newest-wins per key reclaims overwrites; tombstones cancel old values and are then themselves removed. Space amplification falls back toward 1×.' },
      changes: ['~ keep newest version per key', '− overwritten values', '− tombstones (past bottom level)'],
      metrics: { sstables: 2, writeAmp: 1.6, spaceAmp: 1.1, readAmp: 2 },
      scene: { view: 'dedup', note: 'Duplicate keys collapse to the newest; a tombstone cancels, then is dropped.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Size-tiered',
      title: 'Size-tiered: wait for a crowd',
      body: [
        `<em>When</em> should compaction run, and on <em>which</em> files? <span class="term">Size-tiered</span> compaction waits until several SSTables of roughly the <b>same size</b> have piled up, then merges that whole tier into one bigger file — which then waits to join the next tier up.`,
        `Each row is rewritten only a few times on its way down, so <span class="term">write amplification</span> stays low and write throughput stays high. The cost: at any moment many same-key versions live across tiers, so reads and disk space both suffer.`,
      ],
      callout: { kind: 'tip', text: 'Size-tiered — few, big merges. Low write amplification (great for write-heavy loads) at the price of higher read and space amplification.' },
      metrics: { sstables: 4, writeAmp: 1.4, spaceAmp: 2.0, readAmp: 4 },
      scene: { view: 'tiered', note: 'Several similar-size tables merge into one larger table.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Leveled',
      title: 'Leveled: a place for everything',
      body: [
        `<span class="term">Leveled</span> compaction keeps each level as a set of <b>non-overlapping</b> SSTables that together cover the whole key range exactly once, with each level about <b>10×</b> the size of the one above. A new file at L0 is merged into the handful of L1 files whose ranges it touches, which cascades into L2, and so on.`,
        `Because ranges don't overlap within a level, a read checks at most one file per level, and no key is stored twice in a level — so read and space amplification are low. But every row is rewritten once per level it passes through, so <b>write amplification is high</b>.`,
      ],
      callout: { kind: 'tip', text: 'Leveled — many small merges. Low read and space amplification (great for read-heavy loads) at the price of high write amplification.' },
      metrics: { sstables: 3, writeAmp: 3.2, spaceAmp: 1.1, readAmp: 2 },
      scene: { view: 'leveled', note: 'L0 → L1 → L2, each ~10× larger and non-overlapping within a level.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The knob that sets the personality',
      body: [
        `Compaction is the price an LSM-tree pays for cheap writes: it spends <b>write amplification</b> in the background to buy back the <b>read</b> and <b>space amplification</b> that unmerged files would otherwise run up.`,
        `Which strategy you pick <em>is</em> the engine's personality. <span class="term">Size-tiered</span> leans into write throughput; <span class="term">leveled</span> leans into read latency and tight disk use. The same storage engine becomes a different database depending on this one choice.`,
      ],
      callout: { kind: 'insight', text: 'Read amp · Write amp · Space amp — you cannot minimize all three. Compaction strategy is how you choose which two to favour.' },
      metrics: { sstables: 3, writeAmp: 2.0, spaceAmp: 1.2, readAmp: 2 },
      scene: { view: 'recap', note: 'Compaction trades write amplification for lower read and space amplification.' },
    },
  ],
};
