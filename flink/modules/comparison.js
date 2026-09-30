// Comparison — Flink vs Spark Structured Streaming vs Kafka Streams.
// The single most-asked streaming interview topic, consolidated.
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';

const C = '<span class="cell-check">✔</span>';
const X = '<span class="cell-cross">✘</span>';
const P = '<span class="cell-partial">◐</span>';

const ROWS = [
  ['Processing model', 'True record-at-a-time streaming', 'Micro-batch (+ continuous, experimental)', 'Record-at-a-time (library)'],
  ['Latency', 'Milliseconds', '~100ms–seconds (batch interval)', 'Milliseconds'],
  ['Deployment', 'Standalone / YARN / K8s cluster', 'Runs on a Spark cluster', 'Just a JVM library in your app'],
  ['State backend', 'Heap or RocksDB (huge state)', 'HDFS/S3 state store', 'RocksDB + Kafka changelog topics'],
  ['Exactly-once', 'Yes — checkpoints + 2PC sinks', 'Yes — idempotent/txn sinks', 'Yes — Kafka transactions'],
  ['Event-time & watermarks', 'First-class, most mature', 'Supported', 'Supported'],
  ['Windowing', 'Tumbling/sliding/session/global', 'Tumbling/sliding/session', 'Tumbling/sliding/session/hopping'],
  ['SQL support', 'Flink SQL / Table API (rich)', 'Spark SQL (very rich)', 'ksqlDB (separate product)'],
  ['Batch + stream unified', 'Yes (same runtime)', 'Yes (Spark core)', 'No — streaming only'],
  ['Backpressure', 'Built-in, credit-based', 'Handled via batch scheduling', 'Bounded by consumer poll'],
  ['Best when', 'Low-latency, large state, complex event-time', 'Already on Spark; batch+stream ETL', 'Kafka-native microservice, no cluster'],
];

const HIGHLIGHT = new Set([0, 1, 4, 5]); // rows where Flink is the standout

function matrix() {
  return `
    <div class="section-header">
      <div class="section-title">Feature matrix</div>
      <div class="section-desc">Highlighted rows are where the choice matters most in interviews.</div>
    </div>
    <div class="card" style="padding:0; overflow-x:auto;">
      <table class="compare-table">
        <thead>
          <tr>
            <th style="min-width:150px">Dimension</th>
            <th>⚡ Apache Flink</th>
            <th>🔥 Spark Structured Streaming</th>
            <th>📨 Kafka Streams</th>
          </tr>
        </thead>
        <tbody>
          ${ROWS.map((r, i) => `
            <tr class="${HIGHLIGHT.has(i) ? 'highlight' : ''}">
              <td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function whenToUse() {
  const cards = [
    { icon: '⚡', name: 'Choose Flink', color: 'accent', points: [
      'You need true millisecond latency, not micro-batches.',
      'State is large (GBs–TBs per key space) — RocksDB backend shines.',
      'Complex event-time logic: out-of-order data, session windows, CEP.',
      'You want one engine for both batch and streaming.',
      'Uber-style: 1M GPS events/sec, sub-100ms fraud detection.',
    ]},
    { icon: '🔥', name: 'Choose Spark Structured Streaming', color: 'accent-yellow', points: [
      'Your team and infra are already Spark-based.',
      'Workload is ETL where second-level latency is fine.',
      'You want the richest SQL + DataFrame ecosystem.',
      'Unified batch + stream on shared Spark clusters.',
    ]},
    { icon: '📨', name: 'Choose Kafka Streams', color: 'accent-blue', points: [
      'You want streaming logic inside a microservice — no cluster to run.',
      'Everything already flows through Kafka.',
      'Simpler ops: it is a library, scaled like any Kafka consumer group.',
      'Moderate state and latency needs.',
    ]},
  ];
  return `
    <div class="section-header">
      <div class="section-title">When to reach for each</div>
      <div class="section-desc">The honest decision guide — there's no universal winner.</div>
    </div>
    <div class="grid-3">
      ${cards.map(c => `
        <div class="card ${c.color}">
          <div style="font-size:28px;margin-bottom:8px">${c.icon}</div>
          <h3 style="margin:0 0 12px;font-size:16px">${c.name}</h3>
          <ul style="margin:0;padding-left:18px;color:var(--text-secondary);font-size:13px;line-height:1.7">
            ${c.points.map(p => `<li>${p}</li>`).join('')}
          </ul>
        </div>`).join('')}
    </div>
    <div class="card" style="margin-top:20px">
      <h3 style="margin:0 0 10px;font-size:15px">🎯 The one-liner for interviews</h3>
      <p style="color:var(--text-secondary);line-height:1.7;margin:0">
        <strong>Flink</strong> is a dedicated streaming-first engine — lowest latency, best event-time and
        state story, batch as a special case of streaming. <strong>Spark Structured Streaming</strong> is
        batch-first, bolting streaming onto a mature batch engine via micro-batches. <strong>Kafka Streams</strong>
        is a client library, not a cluster — perfect when your app already lives on Kafka and you don't want to
        operate separate infrastructure.
      </p>
    </div>`;
}

const IQS = [
  { q: 'What is the fundamental difference between Flink and Spark Structured Streaming?',
    a: 'Flink is a <strong>true streaming</strong> engine — it processes each record as it arrives, giving millisecond latency. Spark Structured Streaming is fundamentally <strong>micro-batch</strong>: it collects records over a small interval and runs a mini batch job (its Continuous Processing mode is still experimental). Flink treats batch as a bounded special case of streaming; Spark treats streaming as repeated small batches.',
    tip: 'Say "record-at-a-time vs micro-batch" early — it signals you understand the core architectural split.' },
  { q: 'When would you pick Kafka Streams over Flink?',
    a: 'When you want stream processing <strong>embedded in a microservice</strong> with no separate cluster to operate, and your data already flows through Kafka. Kafka Streams is a JVM library scaled like a consumer group; Flink is a distributed system with a JobManager and TaskManagers you must run and tune. For moderate state/latency inside an existing Kafka-centric app, Kafka Streams is simpler ops.',
    tip: 'Frame it as an operational trade-off (library vs cluster), not a capability gap.' },
  { q: 'How does each system achieve exactly-once semantics?',
    a: 'Flink uses <strong>asynchronous barrier snapshotting (Chandy-Lamport)</strong> for state plus <strong>two-phase-commit</strong> sinks for end-to-end exactly-once. Spark uses checkpoint offsets with idempotent or transactional sinks. Kafka Streams leans on <strong>Kafka transactions</strong> (read-process-write atomically) and changelog topics for state recovery.',
    tip: 'Mention that exactly-once always requires cooperation from the sink, not just the engine.' },
  { q: 'Why is Flink often preferred for large-state, event-time-heavy workloads?',
    a: "Flink's RocksDB state backend spills to local disk, so state can far exceed memory (TBs). Its watermark and event-time support is the most mature — bounded out-of-orderness, allowed lateness, side outputs, and incremental checkpoints. That combination handles out-of-order data at scale better than the alternatives.",
    tip: 'Tie it to a concrete case: Uber keeping per-driver state for millions of drivers with out-of-order GPS.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: '⚖️ Reference · Engine Comparison',
    title: 'Flink vs Spark vs Kafka Streams',
    subtitle: 'The most-asked streaming interview question, settled: how the three engines differ and when to choose each.',
    tabs: [
      { id: 'matrix', label: 'Feature Matrix', content: matrix() },
      { id: 'when', label: 'When to Use', content: whenToUse() },
      { id: 'iq', label: 'Interview Q&A', content: createIQSection(IQS) },
    ],
  });
  initTabs(container);
  initIQ(container);
  return () => {};
}
