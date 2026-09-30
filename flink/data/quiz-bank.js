// Per-module quiz bank. A "Test Yourself" section auto-appears on any module
// whose id has an entry here. Add `mXX: [...]` as modules are built.
// Each: { q, options:[...], answer:<0-based index>, explanation }

export const QUIZ_BANK = {
  m01: [
    {
      q: 'What is the core reason Flink achieves lower latency than Spark Streaming?',
      options: [
        'Flink runs on faster hardware',
        'Flink processes each event on arrival, while Spark Streaming uses micro-batches',
        'Flink compresses events before processing',
        'Flink skips fault tolerance to go faster',
      ],
      answer: 1,
      explanation: 'Spark Streaming buffers events into micro-batches (≥ ~100ms), adding inherent latency. Flink is a true streaming engine — operators receive one event at a time, so latency is bounded only by processing time (sub-10ms).',
    },
    {
      q: 'Which mechanism gives Flink exactly-once state consistency?',
      options: [
        'ACK/NACK message tracking',
        'External Redis writes on every event',
        'Chandy-Lamport distributed snapshots (checkpoint barriers)',
        'Two-phase locking on the source',
      ],
      answer: 2,
      explanation: 'Flink periodically injects checkpoint barriers into the sources. When an operator receives the barrier on all inputs it snapshots its state to durable storage. On failure, all operators restore to the last complete checkpoint — exactly-once without idempotent sinks.',
    },
    {
      q: 'What was Apache Storm\'s most significant weakness for enterprise use?',
      options: [
        'It was too slow (minutes of latency)',
        'It had no built-in state management',
        'It could only read from Kafka',
        'It had no programming API at all',
      ],
      answer: 1,
      explanation: 'Storm was genuinely low-latency but had no built-in state — every stateful operation required an external call (Redis/Cassandra), adding latency and failure points. It also offered only at-most-once semantics and no event time.',
    },
    {
      q: 'In micro-batch processing, what is the unit of processing?',
      options: [
        'A single event',
        'A time window (small batch of events)',
        'One partition per second',
        'A full day of data',
      ],
      answer: 1,
      explanation: 'In micro-batch the unit of processing is a time window; operators never see individual events. In true streaming the unit of processing is a single event — the key conceptual contrast to make in an interview.',
    },
    {
      q: 'When did Uber adopt Apache Flink in production?',
      options: ['2011', '2013', '2016', '2020'],
      answer: 2,
      explanation: 'Uber adopted Flink in 2016 for real-time fraud detection and ETA calculation, catching fraud within ~10ms per event. 100+ Flink jobs run at Uber today.',
    },
  ],
};
