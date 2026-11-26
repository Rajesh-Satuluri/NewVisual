// R2 · Engine Comparison — Spark Structured Streaming vs Flink vs Kafka Streams vs DStreams
import { createModuleShell, initTabs } from '../components/module-shell.js';
import { injectModStyles } from './_mod-ui.js';

const ENGINES = ['Structured Streaming', 'Flink', 'Kafka Streams', 'Spark DStreams'];

// Each row: dimension + one cell per engine (html allowed). highlight marks the SS cell tone.
const ROWS = [
  ['Processing model', 'Micro-batch (default) + continuous (experimental)', 'True record-at-a-time streaming', 'Record-at-a-time (per-partition)', 'Micro-batch (RDD-based, legacy)'],
  ['Latency', 'Sub-second → seconds (batch interval); ~1 ms in continuous', 'Milliseconds (native streaming)', 'Milliseconds', 'Seconds (coarser batches)'],
  ['API level', 'Declarative DataFrame/SQL — same as batch', 'Layered: DataStream (low) + Table/SQL (high)', 'DSL + Processor API (JVM, embedded library)', 'Low-level RDD transformations'],
  ['State management', 'Built-in state store (HDFS/RocksDB), watermark-driven eviction', 'Rich keyed state + timers, RocksDB, savepoints', 'Local RocksDB state + changelog topics', 'updateStateByKey / mapWithState (manual)'],
  ['Event-time & watermarks', 'First-class: <code>withWatermark</code>, one global (min) watermark', 'First-class, per-operator watermarks, allowed lateness', 'Event-time via timestamps; windowing + grace', 'Weak — mostly processing-time'],
  ['Exactly-once', 'End-to-end with replayable source + idempotent/transactional sink', 'End-to-end via checkpoint barriers + 2-phase commit sinks', 'Exactly-once within Kafka (transactions)', 'At-least-once in practice'],
  ['Windows', 'Tumbling, sliding, session', 'Tumbling, sliding, session, global + custom triggers', 'Tumbling, hopping, sliding, session', 'Tumbling, sliding (window on DStream)'],
  ['Joins', 'Stream-static, stream-stream (time-bounded)', 'Stream-stream, interval, temporal/versioned table joins', 'KStream-KStream / KStream-KTable / KTable-KTable', 'Basic RDD joins (manual)'],
  ['Deployment', 'On a Spark cluster (YARN/K8s/Databricks)', 'Own cluster (standalone/YARN/K8s)', 'Just a JVM app + Kafka — no cluster', 'On a Spark cluster'],
  ['Scaling unit', 'Spark partitions / executors', 'Parallel subtasks / slots', 'Kafka partitions (one task per partition)', 'Spark partitions'],
  ['Backpressure', 'Automatic (<code>maxOffsetsPerTrigger</code> / rate limits)', 'Native credit-based backpressure', 'Pull-based from Kafka (natural)', 'Configurable, coarse'],
  ['Best fit', 'Unified batch+stream analytics on a lakehouse (Delta)', 'Low-latency, complex event-driven apps & CEP', 'Lightweight per-event microservices on Kafka', 'Legacy — migrate to Structured Streaming'],
];

// Which column index is SS (for tinting).
const SS = 0;

export function mount(container) {
  injectModStyles();

  const chooser = `
  <div class="ss-prose">
    <p>All four process unbounded data, but they trade off <b>latency</b>, <b>API altitude</b>, and <b>operational footprint</b> differently. Use this to answer "why Structured Streaming here?" in an interview.</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>Pick Structured Streaming when…</h4><p>You already run Spark/Databricks, want <b>one API for batch and stream</b>, write to a <b>lakehouse</b> (Delta/Iceberg), and second-ish latency is fine. Analytics, ETL, windowed aggregations, ML feature pipelines.</p></div>
      <div class="ss-card"><h4>Pick Flink when…</h4><p>You need <b>true millisecond latency</b>, rich per-key <b>timers</b>, complex event processing (CEP), or temporal joins — and you're willing to run a dedicated streaming cluster.</p></div>
      <div class="ss-card"><h4>Pick Kafka Streams when…</h4><p>Your data already lives in <b>Kafka</b>, you want a <b>library inside a microservice</b> (no cluster to run), and per-event latency with Kafka-native exactly-once.</p></div>
      <div class="ss-card"><h4>Avoid DStreams</h4><p>The <b>legacy</b> RDD API — no first-class event time, weaker guarantees. New work should use Structured Streaming; migrate old DStream jobs.</p></div>
    </div>
    <div class="ss-callout"><b>The one-liner:</b> Structured Streaming is "<b>batch code that happens to run forever</b>" on your existing Spark/lakehouse stack; Flink is the specialist for ultra-low-latency event-driven systems; Kafka Streams is the embeddable library for Kafka-centric microservices.</div>
  </div>`;

  const table = `
  <div class="ss-prose"><p>Side-by-side across the dimensions interviewers probe. The <b style="color:var(--accent)">tinted</b> column is Structured Streaming.</p></div>
  <div style="overflow-x:auto">
  <table class="ss-tbl" style="font-size:12px">
    <thead><tr><th>Dimension</th>${ENGINES.map((e, i) => `<th${i === SS ? ' style="color:var(--accent)"' : ''}>${e}</th>`).join('')}</tr></thead>
    <tbody>
      ${ROWS.map((r) => `<tr><td style="color:var(--text-muted);font-weight:600">${r[0]}</td>${r.slice(1).map((c, i) => `<td${i === SS ? ' style="background:color-mix(in srgb,var(--accent) 10%,transparent)"' : ''}>${c}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>
  </div>`;

  container.innerHTML = createModuleShell({
    tag: 'Reference · R2',
    title: '⚖️ Engine Comparison',
    subtitle: 'Structured Streaming vs Flink vs Kafka Streams vs legacy DStreams',
    tabs: [
      { id: 'choose', label: '🧭 Which to pick', content: chooser },
      { id: 'table', label: '📊 Side-by-side', content: table },
    ],
  });
  initTabs(container);
  return null;
}

export default { mount };
