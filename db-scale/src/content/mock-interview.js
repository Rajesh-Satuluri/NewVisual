/* content/mock-interview.js — the "Mock Interview" lesson, as DATA.
   Same shape as every other db-scale lesson: each step is
   { chapter, short, title, body[], callout, changes?, scene }.
   `scene` is a view-snapshot consumed by db/mock-interview-scene.js.

   One realistic prompt — "Design the storage engine for a write-heavy
   time-series database" — walked turn by turn: clarify, choose a structure,
   handle reads, add durability, scale out, and field the probes. Each step is
   one interview turn: the interviewer's question and a model answer. */

export const mockInterviewLesson = {
  id: 'mock-interview',
  title: 'Mock Interview',
  group: 'Mastery & Review',
  summary: 'A full mock interview on one prompt — design a write-heavy time-series storage engine — walked turn by turn: clarify, choose LSM and justify, tame reads, add durability, partition, and field the trade-off probes.',
  minutes: 12,
  level: 'advanced',
  metrics: [],
  goals: [
    { text: 'Open by clarifying the prompt before designing', step: 0 },
    { text: 'Turn requirements into design implications', step: 1 },
    { text: 'Choose LSM over B+Tree and justify it out loud', step: 2 },
    { text: 'Tame read amplification with bloom filters + compaction', step: 3 },
    { text: 'Add durability and availability: WAL, fsync, replication', step: 4 },
    { text: 'Partition by series + time and handle hot shards', step: 5 },
  ],

  steps: [
    { // 0 — SETUP / the prompt
      chapter: 'setup', short: 'Prompt',
      title: 'Turn 1 — the prompt',
      body: [
        `<b>Interviewer:</b> <em>"Design the storage engine for a write-heavy time-series database — think metrics and sensor readings."</em>`,
        `Do <b>not</b> start designing. A strong candidate first <span class="term">clarifies</span>. What's the write rate and the read rate? How are reads shaped — recent dashboards or long historical scans? What's the retention? Is data appended in roughly time order? Each answer narrows the design, and asking shows you solve the real problem, not an imagined one.`,
      ],
      callout: { kind: 'tip', text: 'Open every design turn with clarifying questions. Thirty seconds of scoping saves you from confidently designing the wrong system.' },
      changes: [
        'Q: Write rate vs read rate?',
        'Q: Reads: recent dashboards or historical scans?',
        'Q: Retention window — days or years?',
        'Q: Do points arrive roughly in time order?',
      ],
      scene: { view: 'prompt', note: 'Clarify before designing: rate, read shape, retention, ordering.' },
    },
    { // 1 — PROBLEM / requirements
      chapter: 'problem', short: 'Requirements',
      title: 'Turn 2 — requirements → implications',
      body: [
        `<b>Interviewer:</b> <em>"Say 1,000,000 points/sec ingest, reads are ~1% of traffic and mostly the last hour, 30-day retention, points arrive near-time-order."</em>`,
        `Now convert each number into an <span class="term">implication</span>. A million writes/sec means writes must be <b>sequential</b> — no random in-place updates. Reads being 1% and recent means we optimize the write path hard and lean on caching for the read path. 30-day retention plus time ordering means <b>expiry is a range delete</b> — drop whole old segments, never per-row deletes.`,
      ],
      callout: { kind: 'insight', text: 'Each requirement should move a design lever. Write rate → sequential writes. Read shape → cache recent. Retention → drop old segments whole. State the mapping explicitly.' },
      changes: [
        'write-heavy → sequential writes only',
        'reads 1%, recent → cache hot, defer the rest',
        'retention → expire by dropping old segments',
        'near-ordered → appends, not scattered inserts',
      ],
      scene: { view: 'requirements', note: '1M writes/s · 1% recent reads · 30d retention → design levers.' },
    },
    { // 2 — SOLUTION / choose structure
      chapter: 'solution', short: 'Storage',
      title: 'Turn 3 — choose the structure',
      body: [
        `<b>Interviewer:</b> <em>"So what's the on-disk structure?"</em>`,
        `<b>Model answer:</b> an <span class="term">LSM-tree</span>. Writes land in an in-memory <b>memtable</b> (a sorted structure) and are appended to a log; when it fills, it flushes as an immutable sorted <b>SSTable</b>. Every write is sequential — exactly what a million writes/sec needs. A <span class="term">B+Tree</span> would do a random page write per insert and thrash the disk. The LSM's cost is read and space amplification, which I'll address next — a deliberate trade I'm making <em>because</em> the workload is write-heavy.`,
      ],
      callout: { kind: 'tip', text: 'Pick decisively and name what you are trading. "LSM, because sequential writes match the workload; I accept read amplification and will mitigate it." That sentence is the whole answer.' },
      changes: [
        'memtable (RAM, sorted) absorbs writes',
        'flush → immutable sorted SSTable on disk',
        '+ every write is sequential',
        'B+Tree rejected: random writes thrash disk',
      ],
      scene: { view: 'storage', note: 'LSM: memtable → flush → SSTable; sequential writes win.' },
    },
    { // 3 — TECHNIQUE / reads
      chapter: 'technique', short: 'Reads',
      title: 'Turn 4 — tame the reads',
      body: [
        `<b>Interviewer:</b> <em>"A point read now has to check many SSTables. Isn't that slow?"</em>`,
        `Yes — that's <span class="term">read amplification</span>, and I tame it two ways. A <span class="term">bloom filter</span> per SSTable answers "key definitely not here" in memory, so most files are skipped without a disk touch. And <span class="term">leveled compaction</span> continuously merges SSTables into fewer, non-overlapping files, bounding how many a read must inspect. For this workload most reads hit the last hour, which lives in the memtable and L0 — already in cache.`,
      ],
      callout: { kind: 'insight', text: 'Read amplification is the LSM\'s weakness; bloom filters skip files cheaply and compaction keeps their count bounded. Name the problem before you solve it — it shows you understood the trade.' },
      changes: [
        'bloom filter: "not here" without a disk read',
        'leveled compaction: fewer, non-overlapping files',
        'recent reads hit memtable/L0 (cached)',
        '~ read amp bounded, not eliminated',
      ],
      scene: { view: 'reads', note: 'Bloom filters skip SSTables; compaction bounds how many to probe.' },
    },
    { // 4 — TECHNIQUE / durability
      chapter: 'technique', short: 'Durability',
      title: 'Turn 5 — durability & availability',
      body: [
        `<b>Interviewer:</b> <em>"The memtable is in RAM. What happens on a crash?"</em>`,
        `Before any write touches the memtable, I append it to a <span class="term">write-ahead log</span> and <b>fsync</b> — so a committed write survives a crash and replays on restart. I can batch the fsync (group commit) to keep throughput high. For machine failure, I <span class="term">replicate</span> the WAL to followers; with the writes already sequential, streaming the log is cheap, and a follower can be promoted on failure. Sync replication costs latency; async risks losing the tail — I'd pick per the durability SLA.`,
      ],
      callout: { kind: 'tip', text: 'Durability = WAL + fsync for crash survival; availability = replicate the log for machine survival. Mention group commit so throughput doesn\'t die to fsync latency.' },
      changes: [
        '+ WAL append + fsync before memtable',
        'group commit: batch fsyncs for throughput',
        'replicate the WAL → promotable followers',
        'sync vs async: durability SLA decides',
      ],
      scene: { view: 'durability', note: 'WAL + fsync survives crashes; replicated log survives machines.' },
    },
    { // 5 — TRADEOFF / scale
      chapter: 'tradeoff', short: 'Scale',
      title: 'Turn 6 — partition & hot shards',
      body: [
        `<b>Interviewer:</b> <em>"One machine can't hold a month at a million points a second. How do you scale out?"</em>`,
        `I <span class="term">partition</span> on <b>series id</b> so each series' points are co-located for fast scans, and I segment each partition by <b>time window</b> so retention is a cheap whole-segment drop. The risk is a <span class="term">hot series</span> — one metric far busier than the rest overloading its shard. I'd detect skew and split that series further (sub-key by a bucket), or route its writes across several shards. Consistent hashing keeps rebalancing cheap when I add nodes.`,
      ],
      callout: { kind: 'insight', text: 'Partition by series for scan locality, segment by time for cheap expiry — then volunteer the failure mode (hot series) and its fix before the interviewer asks. That is senior behavior.' },
      changes: [
        'partition by series id → scan locality',
        'segment by time → drop old segments whole',
        'hot series → sub-key split / spread writes',
        'consistent hashing → cheap rebalance on add',
      ],
      scene: { view: 'scale', note: 'Partition by series, segment by time; split hot series.' },
    },
    { // 6 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'How the answer was built',
      body: [
        `Replay the shape, not the content. <b>Clarify</b> → <b>map requirements to levers</b> → <b>choose and justify</b> (LSM) → <b>address the weakness</b> (reads) → <b>durability + availability</b> (WAL, replication) → <b>scale and name the failure mode</b> (partitioning, hot shards). Every turn named a trade-off out loud.`,
        `That arc works on any storage prompt. The interviewer was grading your reasoning, not your recall — a clear structure with stated assumptions beats a pile of memorized facts every time.`,
      ],
      callout: { kind: 'insight', text: 'Clarify → requirements → structure → reads → durability → scale, trading off at each turn. Reusable on any "design the storage for X" prompt.' },
      scene: { view: 'recap', note: 'Clarify → requirements → structure → reads → durability → scale.' },
    },
  ],
};
