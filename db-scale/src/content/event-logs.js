/* content/event-logs.js — the "Event Logs" lesson, as DATA. Each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/event-logs-scene.js. */

export const eventLogsLesson = {
  id: 'event-logs',
  title: 'Event Logs',
  group: 'Data-Intensive (DDIA)',
  summary: 'Why an immutable, append-only log of events — read by offset — beats a disposable queue: it gives you replay, many independent consumers, and a single source of truth.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['offset', 'events', 'partitions', 'lag'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a queue that deletes on consume is limiting', step: 0 },
    { text: 'An append-only log addresses events by offset', step: 1 },
    { text: 'Partitions scale the log; order holds within one', step: 2 },
    { text: 'Each consumer group reads at its own offset', step: 3 },
    { text: 'The log as source of truth — state is derived', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Queue',
      title: 'A queue forgets the moment you read',
      body: [
        `The classic message queue is simple: a producer puts a message in, a consumer takes it out, and once it is <span class="term">acknowledged</span> the broker <b>deletes</b> it. That works until you need the message twice.`,
        `Want to add a second consumer — say analytics alongside billing? Too late, the events are gone. Shipped a bug and need to reprocess last week? Also gone. A queue keeps <em>no history</em>, so every event is a one-time, one-reader affair.`,
      ],
      callout: { kind: 'warn', text: 'Consume-and-delete means no replay, no reprocessing, and no way to add a new consumer after the fact. The event’s history is thrown away as soon as it is read.' },
      metrics: { offset: 0, events: 0, partitions: 1, lag: 0 },
      scene: { view: 'queue', note: 'A message is read once, acked, and deleted — its history is gone.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'The log',
      title: 'Keep an append-only log of events',
      body: [
        `Flip the model: instead of removing events, <b>never remove them</b>. Model data as an immutable, ordered <span class="term">log</span> — producers only ever <em>append</em> to the end, and every event is stamped with a monotonically increasing <span class="term">offset</span>.`,
        `Reading no longer destroys anything. A consumer simply remembers “I am at offset N” and reads forward. The log is the record of <em>what happened</em>, in the order it happened — a replayable history rather than a disposable inbox.`,
      ],
      callout: { kind: 'insight', text: 'An append-only log + per-reader offsets decouples writing from reading: nothing is overwritten or deleted, so any reader can start anywhere and move at its own pace.' },
      changes: ['+ append-only: events are immutable', '+ each event gets a monotonic offset', '~ readers track a position, not a mailbox'],
      metrics: { offset: 8, events: 9, partitions: 1, lag: 0 },
      scene: { view: 'log', note: 'Producers append to the head; each event keeps a permanent offset.' },
    },
    { // 2 — TECHNIQUE
      chapter: 'technique', short: 'Partitions',
      title: 'Partition the log to scale it out',
      body: [
        `One log on one machine caps your throughput and storage. So split it into <span class="term">partitions</span>, each an independent append-only log on its own node. A key is hashed to pick a partition, and the total write rate is the sum across all of them.`,
        `The catch: ordering is guaranteed <b>only within a partition</b>. Events that must stay ordered relative to each other — all events for one user, say — should share a partition key so they land in the same log.`,
      ],
      callout: { kind: 'tip', text: 'Partitioning multiplies throughput, but order is per-partition only. Route events that must stay ordered to the same partition by choosing the key deliberately.' },
      changes: ['+ log split into N partitions', '+ hash(key) → partition', '~ global order traded for scale'],
      metrics: { offset: 100, events: 300, partitions: 3, lag: 0 },
      scene: { view: 'partitions', note: 'Each partition is its own ordered log; the producer fans events by key.' },
    },
    { // 3 — TECHNIQUE
      chapter: 'technique', short: 'Consumers',
      title: 'Many consumers, each at its own offset',
      body: [
        `Because reading does not consume, any number of <span class="term">consumer groups</span> can read the same log at once, each tracking its own offset. Billing can sit near the head while analytics trails behind — neither affects the other.`,
        `Retention keeps events around for days, so a lagging consumer can catch up, and a brand-new one can <span class="term">replay</span> from offset 0 to rebuild from scratch. The only rule: handle re-delivery <em>idempotently</em>, since a replay re-reads events you have seen.`,
      ],
      callout: { kind: 'insight', text: 'Independent offsets turn one log into a broadcast: add consumers freely, let them lag, and replay from any point. Consumers must be idempotent because replays repeat events.' },
      changes: ['+ many groups, independent offsets', '+ retention enables replay', '~ consumers must be idempotent'],
      metrics: { offset: 9, events: 10, partitions: 1, lag: 5 },
      scene: { view: 'consumers', note: 'Group A is caught up; group B lags and can still replay old events.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'Source of truth',
      title: 'The log is the truth; state is derived',
      body: [
        `Push the idea to its conclusion (event <span class="term">sourcing</span>): the log of events becomes the <b>source of truth</b>, and the current state — a database table, a search index, a cache — is just a <span class="term">derived view</span> you build by replaying the log.`,
        `That buys a lot: replay to rebuild a corrupted view, fan the same log out to many downstream systems, and keep a complete audit trail of <em>why</em> state changed. The cost: storage grows, ordering is only per-partition, and every consumer must tolerate replays.`,
      ],
      callout: { kind: 'tip', text: 'Treat the log as primary and every store as a derived, rebuildable view. You trade extra storage and idempotency discipline for replay, fan-out and auditability.' },
      metrics: { offset: 5, events: 6, partitions: 1, lag: 0 },
      scene: { view: 'source', note: 'A derived view is rebuilt by replaying the log — the log stays authoritative.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'An append-only log, read by offset',
      body: [
        `Swap the disposable queue for an immutable, append-only log and the whole picture changes: events are permanent, addressed by offset, partitioned for scale, and read by any number of consumers at their own pace.`,
        `This is the backbone of log-based brokers like Kafka and of event-sourced systems. It feeds directly into the next ideas — <b>change data capture</b>, <b>derived data</b> and <b>stream processing</b> all ride on top of an event log.`,
      ],
      callout: { kind: 'insight', text: 'Append-only log + per-consumer offsets = replay, fan-out and a single source of truth — the foundation for CDC, derived data and stream processing.' },
      metrics: { offset: 7, events: 8, partitions: 1, lag: 0 },
      scene: { view: 'recap', note: 'One immutable log, many offsets — replay, fan-out, and one source of truth.' },
    },
  ],
};
