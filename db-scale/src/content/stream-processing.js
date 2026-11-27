/* content/stream-processing.js — the "Stream Processing" lesson, as DATA.
   Same shape as every db-scale lesson: each step is { chapter, short, title,
   body[], callout, changes?, metrics, scene }. `scene` is a view-snapshot
   consumed by db/stream-processing-scene.js. */

export const streamProcessingLesson = {
  id: 'stream-processing',
  title: 'Stream Processing',
  group: 'Data-Intensive (DDIA)',
  summary: 'Process an endless river of events the moment each one arrives — windowed, stateful operators that turn an unbounded stream into answers that are seconds, not hours, old.',
  minutes: 9,
  level: 'advanced',
  metrics: ['events', 'latency', 'backlog', 'freshness'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why a batch job’s answer is always stale', step: 0 },
    { text: 'Process each event the instant it arrives', step: 1 },
    { text: 'Chain stateful operators over a durable log', step: 2 },
    { text: 'Group unbounded events by time with windows', step: 3 },
    { text: 'Event time vs processing time — and watermarks', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Always late',
      title: 'A batch job’s answer is old the moment it lands',
      body: [
        `A batch pipeline waits for a <b>fixed window</b> — an hour, a day — then grinds over the whole chunk. By the time the report appears, the world has already moved on. Events pile up in a <span class="term">backlog</span> while the job sleeps between runs.`,
        `For a dashboard, a fraud alert, or a trading signal, “correct but an hour late” is simply <em>wrong</em>. These needs want an answer <b>seconds</b> after the event, not after the next batch.`,
      ],
      callout: { kind: 'warn', text: 'Batch jobs run on fixed windows, so their output is always as stale as the window is long. Many workloads need results within seconds of each event.' },
      metrics: { events: 0, latency: 60000, backlog: 9200, freshness: 60000 },
      scene: { view: 'stale', note: 'Events queue up while the batch job sleeps — the report is a full window behind reality.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'On arrival',
      title: 'Process every event the instant it arrives',
      body: [
        `Flip the model: don’t wait for a window to fill — handle each <span class="term">event</span> as it streams in. A <b>log-based broker</b> (think Kafka) carries the events: durable, replayable, partitioned, and strictly ordered <em>within</em> each partition.`,
        `Consumers read the log at their own pace and emit results continuously. The backlog drains, latency falls from an hour to milliseconds, and output is always <b>fresh</b>.`,
      ],
      callout: { kind: 'insight', text: 'An unbounded stream is just a batch of infinite size. Reading a durable, replayable log event-by-event turns hour-old reports into second-old ones.' },
      changes: ['+ log-based broker (durable, replayable)', '~ consume event-by-event, not window-by-window', '− backlog drains, freshness collapses'],
      metrics: { events: 8400, latency: 220, backlog: 180, freshness: 300 },
      scene: { view: 'stream', note: 'A durable event log feeds a processor that emits a live, always-fresh result.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Operators',
      title: 'Chain stateful operators over the log',
      body: [
        `Real work is a <b>pipeline of operators</b>: <span class="term">filter</span> drops noise, <span class="term">aggregate</span> rolls up counts and sums, <span class="term">join</span> enriches events against another stream or a table. Each operator reads its input stream and produces an output stream.`,
        `Aggregates and joins are <b>stateful</b> — they keep local state (running totals, join buffers) that must survive crashes. Operators checkpoint that state so a failure replays from the last offset without <em>double-counting</em>: exactly-once.`,
      ],
      callout: { kind: 'tip', text: 'Stream operators (filter, aggregate, join) chain like Unix pipes. Stateful ones checkpoint their local state so a crash replays from an offset without double-counting.' },
      changes: ['+ filter → aggregate → join pipeline', '+ local state per stateful operator', '+ checkpoints → exactly-once on replay'],
      metrics: { events: 8600, latency: 180, backlog: 120, freshness: 240 },
      scene: { view: 'operators', note: 'Filter, aggregate and join operators chain over the log; stateful ones keep checkpointed local state.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Windows',
      title: 'Group an endless stream by time',
      body: [
        `You can’t “sum all events” when events never stop — so you cut time into <span class="term">windows</span>. A <b>tumbling</b> window chops the stream into fixed, non-overlapping buckets (every 5 seconds); <b>sliding</b> and <b>session</b> windows overlap or follow activity.`,
        `Each completed window emits one aggregate — a count, an average, a top-N. The unbounded stream becomes a steady drip of bounded results, one per window.`,
      ],
      callout: { kind: 'insight', text: 'Windows turn an unbounded stream into a sequence of bounded aggregates. Tumbling windows are fixed and non-overlapping; sliding and session windows overlap or track bursts of activity.' },
      metrics: { events: 8800, latency: 200, backlog: 90, freshness: 260 },
      scene: { view: 'windowing', note: 'Tumbling windows bucket events by time; each window emits one aggregate.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'When?',
      title: 'Event time, processing time, and late arrivals',
      body: [
        `Here is the hard part. An event’s <span class="term">event time</span> (when it happened) is not its <span class="term">processing time</span> (when you saw it). A phone goes offline and uploads an hour later — that event belongs in a window you already closed.`,
        `So how long do you wait before declaring a window “done”? A <span class="term">watermark</span> is the system’s bet that no earlier event remains. Wait too long and latency climbs; close too early and late events are dropped or must trigger a costly correction.`,
      ],
      callout: { kind: 'warn', text: 'Events arrive out of order, so event time ≠ processing time. A watermark decides when a window is complete — a direct trade of latency against the risk of dropping late data.' },
      changes: ['+ watermark: “probably no earlier events”', '~ wait longer → higher latency', '~ close sooner → risk dropping late events'],
      metrics: { events: 8900, latency: 350, backlog: 140, freshness: 800 },
      scene: { view: 'latetime', note: 'A late event lands after its window closed; the watermark decides who waits and who gets dropped.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Unbounded events, windowed and stateful',
      body: [
        `Stream processing trades the comfort of a finite dataset for <b>freshness</b>: a durable log of events, stateful operators that filter, aggregate and join, and windows that carve time into answers.`,
        `Master three things and the rest follows — <b>windowing</b>, <b>event-time correctness</b> (watermarks), and <b>exactly-once</b> state via checkpoints. The same operators that run a stream can replay it as a batch: a stream is just a batch that never ends.`,
      ],
      callout: { kind: 'insight', text: 'A durable event log + windowed stateful operators + watermarks give answers seconds old instead of hours. Stream and batch are the same computation at different sizes.' },
      metrics: { events: 9000, latency: 200, backlog: 60, freshness: 250 },
      scene: { view: 'recap', note: 'Log in, windowed stateful operators, fresh results out — the shape of every streaming system.' },
    },
  ],
};
