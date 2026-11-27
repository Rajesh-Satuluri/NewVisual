/* content/read-write-quorum.js — the "Read/Write Quorum" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/read-write-quorum-scene.js. Rendered through the shared course shell. */

export const readWriteQuorumLesson = {
  id: 'read-write-quorum',
  title: 'Read/Write Quorum',
  group: 'Distributed Systems',
  summary: 'With N copies of your data, how many must you write to, and read from, to never see stale data? The simple inequality — W + R > N — that tunes a replicated store between fast and fresh.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['replicas', 'latency', 'availability', 'nodes2'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why writing to — and reading from — one replica returns stale data', step: 0 },
    { text: 'A write quorum W: how many acks a write waits for', step: 1 },
    { text: 'A read quorum R: query several, keep the newest version', step: 2 },
    { text: 'W + R > N forces the read set to overlap the write set', step: 3 },
    { text: 'Tuning W and R to favour read or write latency', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Stale read',
      title: 'Write here, read there — stale',
      body: [
        `You keep <b>N = 3</b> copies of every row for durability. A client writes the new value <code>v5</code> to <em>one</em> replica and moves on; the other two still hold the old <code>v4</code>.`,
        `Moments later a different client reads — and happens to ask a replica that never saw the write. It gets <code>v4</code>. The data is replicated, yet the reader is looking at the <span class="term">past</span>.`,
      ],
      callout: { kind: 'warn', text: 'Touching a single replica per operation is fast, but a read and a write can land on disjoint copies — so a successful write can be invisible to the very next read.' },
      metrics: { replicas: 3, latency: 6, availability: 100, nodes2: 3 },
      scene: { view: 'problem', note: 'Write v5 → R1; read ← R3 still holds v4. A stale read slips through.' },
    },
    { // 1 — TECHNIQUE: write quorum
      chapter: 'technique', short: 'Write W',
      title: 'A write waits for W acks',
      body: [
        `Fix the write side first. Define a <span class="term">write quorum</span> <b>W</b>: the write is not “done” until <b>W</b> of the N replicas have acknowledged it. Here <b>W = 2</b>.`,
        `The client sends <code>v5</code> to all three but only waits for two acks before returning success. Now at least two of the three copies are guaranteed current.`,
      ],
      callout: { kind: 'insight', text: 'W is the durability/latency dial for writes: a bigger W means more copies are current before you call it done — at the cost of waiting for more replicas.' },
      changes: ['+ write fans out to all replicas', '~ success after W = 2 acks', '+ ≥ 2 copies now current'],
      metrics: { replicas: 3, latency: 14, availability: 100, nodes2: 3 },
      scene: { view: 'write', note: 'W = 2: the write returns once two replicas have acknowledged v5.' },
    },
    { // 2 — TECHNIQUE: read quorum
      chapter: 'technique', short: 'Read R',
      title: 'A read asks R, keeps the newest',
      body: [
        `Now the read side. A <span class="term">read quorum</span> <b>R</b> queries <b>R</b> replicas instead of one, compares their versions, and returns the <em>newest</em>. Here <b>R = 2</b>.`,
        `Each row carries a version (or timestamp); the client simply picks the highest it sees among the R answers. Querying more replicas costs a little latency but sharply narrows the chance of missing a recent write.`,
      ],
      callout: { kind: 'tip', text: 'A quorum read does not trust one replica — it gathers R answers and keeps the freshest. Version stamps make “freshest” unambiguous.' },
      changes: ['+ read fans out to R = 2 replicas', '~ compare versions, keep newest', '− slightly higher read latency'],
      metrics: { replicas: 3, latency: 16, availability: 100, nodes2: 3 },
      scene: { view: 'read', note: 'R = 2: the read gathers two answers and keeps the highest version.' },
    },
    { // 3 — SOLUTION: overlap
      chapter: 'solution', short: 'W + R > N',
      title: 'Make the two sets overlap',
      body: [
        `Here is the magic. If <b>W + R &gt; N</b>, the set of replicas a write touched and the set a read queries <em>cannot be disjoint</em> — they must share at least one replica. With W = 2, R = 2, N = 3: <b>2 + 2 &gt; 3</b>.`,
        `That shared replica is the guarantee: it acked the latest write <em>and</em> answers the read, so the read is certain to see the newest version. Overlap, not luck, delivers freshness.`,
      ],
      callout: { kind: 'insight', text: 'W + R > N is the whole idea: the write set and read set are forced to intersect, so every quorum read observes the most recent quorum write.' },
      changes: ['+ W + R > N ⇒ sets intersect', '+ read always sees latest write', '~ consistency bought with quorum size'],
      metrics: { replicas: 3, latency: 18, availability: 100, nodes2: 3 },
      scene: { view: 'overlap', note: 'W={R1,R2}, R={R2,R3} — they must share R2, and R2 has v5.' },
    },
    { // 4 — TRADEOFF
      chapter: 'tradeoff', short: 'Tune W/R',
      title: 'Slide the dial for your workload',
      body: [
        `W and R are knobs, not constants. As long as W + R &gt; N you stay consistent — but <em>where</em> you set them shapes latency and resilience.`,
        `Push <b>W = N, R = 1</b> for blazing reads (any one replica is authoritative) at the cost of writes that stall if a single replica is down. Flip to <b>W = 1, R = N</b> for fast, always-available writes but slow reads. The balanced <b>W = R = ⌈(N+1)/2⌉</b> splits the difference.`,
      ],
      callout: { kind: 'tip', text: 'Read-heavy? Lower R, raise W. Write-heavy? Lower W, raise R. The inequality fixes correctness; the split picks which operation pays.' },
      metrics: { replicas: 3, latency: 9, availability: 67, nodes2: 3 },
      scene: { view: 'tune', note: 'W=N,R=1 → fast reads, fragile writes · W=1,R=N → the reverse.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'One inequality, a tunable store',
      body: [
        `Quorums turn “many copies” into a guarantee. Write to <b>W</b>, read from <b>R</b>, keep <b>W + R &gt; N</b>, and every read is forced to overlap the latest write — no coordination leader required.`,
        `This is the heart of Dynamo-style stores (Cassandra, Riak): a single knob that dials the same cluster between fast-and-eventually-consistent and slower-and-strongly-consistent, per query.`,
      ],
      callout: { kind: 'insight', text: 'Write W · Read R · require W + R > N. Overlap guarantees freshness; the split between W and R picks whether reads or writes stay cheap.' },
      metrics: { replicas: 3, latency: 18, availability: 100, nodes2: 3 },
      scene: { view: 'recap', note: 'W + R > N — overlap buys consistency; the split tunes latency.' },
    },
  ],
};
