/* content/write-vs-read-optimization.js — "Write vs Read Optimization", as DATA.
   The fundamental NoSQL dial: optimize for cheap reads OR cheap writes, rarely both.
   Its scene contrasts fan-out-on-write (a write copied to many feeds) against
   fan-out-on-read (a read gathering from many sources). */

export const writeVsReadOptimizationLesson = {
  id: 'write-vs-read-optimization',
  title: 'Write vs Read Optimization',
  group: 'NoSQL & Access-Pattern Modeling',
  summary: 'You can make reads cheap or writes cheap, rarely both — modeling is choosing where to pay. Read-optimized designs fan out on write so reads are single lookups; write-optimized designs store once and assemble on read; the ratio of reads to writes decides which wins.',
  minutes: 8,
  level: 'advanced',
  metrics: ['writeAmp', 'readAmp', 'copies', 'latency'],
  legend: [],
  goals: [
    { text: 'Every model trades read cost against write cost — you pick where to pay', step: 0 },
    { text: 'Read-optimized: fan out on write, so each read is a single lookup', step: 1 },
    { text: 'Write-optimized: store once, assemble on read from many sources', step: 2 },
    { text: 'The read:write ratio and fan-out decide which side to optimize', step: 3 },
    { text: 'A celebrity with millions of followers breaks fan-out-on-write', step: 4 },
    { text: 'Choose the cheap side for the dominant operation; hybrids for the tail', step: 5 },
  ],

  steps: [
    { // 0 SETUP
      chapter: 'setup', short: 'The read/write dial',
      title: 'Cheap reads or cheap writes — pick one',
      body: [
        `Underneath every NoSQL modeling decision is one dial. The same data can be laid out so that <b>reads are cheap</b> (one lookup returns the answer) or so that <b>writes are cheap</b> (one write touches one place) — but almost never both at once. Making the read cheaper means doing more work, and storing more copies, at write time; making the write cheaper means doing more work at read time.`,
        `Take a social <span class="term">timeline</span>: a user opens the app and wants the latest posts from everyone they follow. There is no neutral storage for this — wherever you put the posts, you are choosing which operation pays. Modeling is deciding, deliberately, which side of the dial your workload should sit on.`,
      ],
      callout: { kind: 'insight', text: 'Read cost and write cost trade against each other. You rarely minimize both — modeling is choosing which one to make cheap.' },
      metrics: { writeAmp: 1, readAmp: 1, copies: 1, latency: 1 },
      scene: { view: 'dial', note: 'The dial between read-optimized and write-optimized: making one cheap makes the other dear.' },
    },
    { // 1 TECHNIQUE (read-optimized)
      chapter: 'technique', short: 'Fan-out on write',
      title: 'Read-optimized: fan out on write',
      body: [
        `To make the timeline read O(1), <b>precompute it</b>. When a user posts, <span class="term">fan out on write</span>: copy that post into a materialized feed for <em>every one of their followers</em>. Now opening the app is a single sequential read of your own feed — no gather, no join, the lowest possible read latency.`,
        `The bill arrives at write time. One post with a thousand followers is a <b>thousand writes</b> and a thousand stored copies: heavy <span class="term">write amplification</span>, more storage, and a consistency burden (a deleted or edited post must be chased across every copy). You duplicate and denormalize on purpose so the read never has to work.`,
      ],
      callout: { kind: 'tip', text: 'Fan-out-on-write makes reads single lookups by paying up front: one post becomes one write per follower, plus a stored copy each.' },
      changes: ['+ each post copied into every follower feed', '! 1 post, N followers → N writes, N copies'],
      metrics: { writeAmp: 8, readAmp: 1, copies: 8, latency: 1 },
      scene: { view: 'fanout-write', note: 'A post fans out on write into every follower feed — one write per follower, each read then a single lookup.' },
    },
    { // 2 TECHNIQUE (write-optimized)
      chapter: 'technique', short: 'Fan-out on read',
      title: 'Write-optimized: assemble on read',
      body: [
        `Flip the dial. Store each post <b>once</b>, in its author's own partition, and do nothing extra on write — a single cheap append. The timeline is then built at read time by <span class="term">fan-out on read</span>: when the user opens the app, query each account they follow, merge the results, and sort.`,
        `Writes are now minimal (one post, one write, no copies), but the read does the gathering: following 500 accounts means <b>500 queries</b> fanned out and merged for one timeline render — high <span class="term">read amplification</span> and higher, less predictable read latency. You store once and pay to assemble whenever someone looks.`,
      ],
      callout: { kind: 'insight', text: 'Fan-out-on-read keeps writes to one append and gathers at read time — cheap writes, but the read fans across every followee.' },
      changes: ['+ post stored once in author partition', '! read gathers from every followed account'],
      metrics: { writeAmp: 1, readAmp: 8, copies: 1, latency: 8 },
      scene: { view: 'fanout-read', note: 'The timeline is assembled on read by querying every followed account and merging — cheap writes, gather-heavy reads.' },
    },
    { // 3 TRADEOFF (the deciding ratio)
      chapter: 'tradeoff', short: 'The deciding ratio',
      title: 'The read:write ratio decides',
      body: [
        `Which side wins is not a matter of taste — it is set by two numbers: the <b>read:write ratio</b> and the <b>fan-out</b>. A timeline is read far more often than it is written (you scroll constantly, post rarely), so paying once per write to make the common read free usually comes out ahead: fan-out-on-write is the default for feeds.`,
        `Invert the ratio and the answer inverts. Data that is written constantly and read seldom — audit logs, telemetry, event streams — should be write-optimized, because precomputing a read view nobody looks at is wasted work. The rule: <b>make the dominant operation the cheap one</b>, and let the rare operation pay.`,
      ],
      callout: { kind: 'tip', text: 'Optimize for whichever operation dominates. High read:write ratio → precompute on write; write-heavy → assemble on read.' },
      changes: ['~ read-heavy → fan-out-on-write wins', '~ write-heavy → fan-out-on-read wins'],
      metrics: { writeAmp: 8, readAmp: 1, copies: 8, latency: 1 },
      scene: { view: 'ratio', note: 'The read:write ratio and fan-out decide the dial: read-heavy workloads precompute, write-heavy ones assemble.' },
    },
    { // 4 TRADEOFF (celebrity problem)
      chapter: 'tradeoff', short: 'The celebrity problem',
      title: 'Huge fan-out breaks the write side',
      body: [
        `Fan-out-on-write has a failure mode: the <span class="term">celebrity problem</span>. When a single account has <b>ten million followers</b>, one post becomes ten million writes — a thundering burst that saturates write capacity, lags the feed, and may never finish before the next post lands. The very fan-out that made normal reads free becomes a write catastrophe at the tail.`,
        `The industry answer is a <b>hybrid</b>: fan out on write for ordinary users, but for celebrities store the post once and fan out <em>on read</em>, pulling their recent posts in at timeline-assembly time and merging them with the precomputed feed. You split the strategy by fan-out, paying write cost where it's bounded and read cost where it isn't.`,
      ],
      callout: { kind: 'warn', text: 'Huge fan-out turns one write into millions. Hybrids fan out on write for normal users and on read for celebrities.' },
      changes: ['! celebrity post → millions of writes in a burst', '+ hybrid: pull celebrities in on read, merge'],
      metrics: { writeAmp: 99, readAmp: 2, copies: 99, latency: 2 },
      scene: { view: 'celebrity', note: 'A celebrity post explodes fan-out-on-write into millions of writes — handled by pulling them in on read instead.' },
    },
    { // 5 RECAP
      chapter: 'recap', short: 'Choose the cheap side',
      title: 'Model is choosing where to pay',
      body: [
        `Read-optimized and write-optimized are the two ends of one dial, and a data model is a position on it. Fan-out-on-write duplicates and denormalizes so reads are single lookups — cheap reads, heavy writes, more storage, a consistency burden. Fan-out-on-read stores once and gathers at read time — cheap writes, expensive reads. Neither is "correct"; each is correct for a workload.`,
        `Read the workload before you model it: the <b>read:write ratio</b> points at the cheap side to optimize, and the <b>fan-out distribution</b> warns you where a single strategy breaks and a hybrid is needed. In NoSQL you cannot refuse the trade — there is no free layout — so choose, deliberately, which operation gets to be cheap.`,
      ],
      callout: { kind: 'insight', text: 'There is no layout that is cheap on both sides. Pick the dominant operation, make it O(1), and let the rare one pay.' },
      metrics: { writeAmp: 8, readAmp: 1, copies: 8, latency: 1 },
      scene: { view: 'recap', note: 'Fan-out-on-write and fan-out-on-read side by side — the dial a model chooses a position on.' },
    },
  ],
};
