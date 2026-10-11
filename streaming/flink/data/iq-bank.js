// Per-module interview question bank (content/rendering split).
// Modules render from here; the Study Hub aggregates across all keys.
// Add a `mXX: [...]` entry as each module is built.

export const IQ_BANK = {
  m01: [
    {
      q: 'Why did Uber choose Apache Flink over Spark Streaming?',
      difficulty: 'medium',
      a: `Spark Streaming uses <strong>micro-batch processing</strong> — it buffers events into small time windows (minimum ~100ms) and processes them as mini-batches. This introduces inherent latency and jitter. Flink processes events <strong>one at a time as they arrive</strong> (true streaming), achieving sub-10ms latency.
    <br><br>Additionally, Flink has <strong>first-class event time support with watermarks</strong>, which Spark Streaming lacked at the time. For GPS event processing where events arrive out-of-order from tunnels/buildings, this was critical.
    <br><br>Flink also provides <strong>exactly-once state consistency</strong> via asynchronous checkpointing with Chandy-Lamport barriers, while early Spark Streaming offered only at-least-once guarantees.`,
      tip: 'Mention: micro-batch vs true streaming, event time watermarks, and exactly-once via checkpointing. These three points cover 80% of Uber\'s decision criteria.',
    },
    {
      q: 'What fundamental problem does Flink solve that Hadoop cannot?',
      difficulty: 'easy',
      a: `Hadoop MapReduce is <strong>fundamentally batch-oriented</strong>. It reads all input data, processes it, writes output — then stops. This works for historical analytics but fails for real-time needs because:
    <br><br>1. <strong>Latency</strong>: A Hadoop job takes minutes to hours. Fraud detection requiring < 100ms is impossible.
    <br><br>2. <strong>Unbounded data</strong>: Hadoop reads a finite dataset. Uber's GPS stream never ends — you can't process "all GPS data" in batch.
    <br><br>3. <strong>State across time</strong>: Hadoop has no concept of time-series state. Tracking "driver moved 50mph average over last 5 minutes" requires complex workarounds.
    <br><br>Flink treats data as an <strong>infinite, continuously arriving stream</strong> and maintains state across time natively.`,
      tip: 'Key phrase to use: "bounded vs unbounded datasets" and "event-driven vs scheduled processing".',
    },
    {
      q: 'What is the difference between micro-batch and true streaming?',
      difficulty: 'easy',
      a: `<strong>Micro-batch</strong> (Spark Streaming, early Kafka Streams): Events are buffered into small time windows, then processed as a batch. Even with a 100ms window, you have 100ms of minimum latency + processing time. The processing model is fundamentally batch — operators don't see individual events.
    <br><br><strong>True streaming</strong> (Flink, Storm): Each event is processed immediately upon arrival. No buffering. Operators receive one event at a time. State is updated per-event. Latency is bounded only by processing time (typically < 10ms).
    <br><br>For Uber, the difference matters for ETA: a micro-batch approach updates ETA every 100ms+ while Flink updates it every GPS ping (~1s real-world interval but processed immediately).`,
      tip: 'Draw the contrast clearly: "In micro-batch, the unit of processing is a time window. In true streaming, the unit of processing is a single event."',
    },
    {
      q: 'Why did Apache Storm fail to gain widespread adoption despite being the first true streaming engine?',
      difficulty: 'medium',
      a: `Storm had four critical weaknesses that prevented enterprise adoption:
    <br><br>1. <strong>No state management</strong>: Storm had no built-in state. Every stateful operation required an external call (Redis, Cassandra), adding network latency and failure points.
    <br><br>2. <strong>At-most-once semantics</strong>: Messages could be lost. No replay on failure. This was unacceptable for financial calculations.
    <br><br>3. <strong>No event time</strong>: Storm only knew processing time — when it received an event, not when the event occurred. Out-of-order events produced wrong results.
    <br><br>4. <strong>Complex programming model</strong>: Bolts and spouts required significant boilerplate. No high-level SQL or Table API.
    <br><br>Flink addressed all four: built-in RocksDB state, exactly-once via checkpoints, native event time + watermarks, and a rich DataStream/SQL API.`,
      tip: 'Mention these four by name: state, semantics, event time, and developer experience.',
    },
    {
      q: 'How does Flink\'s approach to fault tolerance differ from Storm\'s?',
      difficulty: 'hard',
      a: `Storm used an <strong>ACK/NACK mechanism</strong> — each message was tracked with a 20-byte token. If a bolt failed to ACK within a timeout, Storm replayed the message. This gave at-most-once or at-least-once semantics but required careful user-side idempotency.
    <br><br>Flink uses <strong>Chandy-Lamport distributed snapshots</strong> (checkpoint barriers). Periodically, the JobManager injects a barrier into every source. Barriers flow through the DAG. When an operator receives a barrier on all inputs, it saves its state to durable storage (HDFS/S3). On failure, Flink restores all operators to the last complete checkpoint and replays from that point.
    <br><br>This gives <strong>exactly-once end-to-end</strong> without requiring idempotent sinks. The cost is slightly increased memory/disk usage and periodic latency spikes during checkpointing.`,
      tip: 'Use the term "Chandy-Lamport distributed snapshots" — it signals deep knowledge. Follow up with "the barrier aligns all inputs before snapshotting" if asked for more detail.',
    },
  ],
};
