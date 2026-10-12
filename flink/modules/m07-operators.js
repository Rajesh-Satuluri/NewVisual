// Module 7 — Sources & Sinks
// Interactive Kafka source deep-dive: partition assignment, offset tracking,
// exactly-once semantics, and Uber GPS pipeline wiring.

import { rideSpine, initRideSpine, rideCallout } from '../components/story-ui.js';

const KAFKA_PARTITIONS = [0, 1, 2, 3];
const DRIVER_GROUPS = ['D-001..D-250K', 'D-250K..D-500K', 'D-500K..D-750K', 'D-750K..D-1M'];
const TM_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6'];

const CONNECTORS = [
  {
    id: 'kafka-src',
    label: 'Apache Kafka Source',
    icon: '📥',
    type: 'Source',
    color: '#6366f1',
    desc: 'Flink\'s KafkaSource (v2 unified connector) uses the new Source API: a SplitEnumerator divides Kafka partitions into splits; SourceReaders consume them in parallel. Offsets are committed back to Kafka only on successful checkpoints — enabling exactly-once.',
    uber: 'Uber\'s GPS topic "driver-locations" has 1024 partitions. At parallelism=256, each Flink source subtask reads 4 partitions, ingesting ~4K events/sec each (1M/sec total).',
    props: [
      { k: 'bootstrap.servers', v: 'kafka-prod:9092' },
      { k: 'group.id', v: 'flink-fraud-consumer' },
      { k: 'topic', v: 'driver-locations' },
      { k: 'startingOffsets', v: 'COMMITTED / EARLIEST' },
      { k: 'boundedness', v: 'CONTINUOUS_UNBOUNDED' },
    ],
    code: `from pyflink.datastream.connectors.kafka import (
    KafkaSource, KafkaOffsetsInitializer)
from pyflink.common.serialization import SimpleStringSchema

source = (KafkaSource.builder()
    .set_bootstrap_servers("kafka-prod:9092")
    .set_topics("driver-locations")
    .set_group_id("flink-fraud-consumer")
    .set_starting_offsets(KafkaOffsetsInitializer.committed_offsets())
    .set_value_only_deserializer(SimpleStringSchema())
    .build())

env.from_source(source, ride_watermarks, "GPS Source")`,
    exactly: [
      'On each checkpoint, Flink snapshots Kafka offsets as part of operator state.',
      'Offsets are committed to Kafka only after the checkpoint completes (two-phase).',
      'On failure, Flink restores source state → seeks Kafka to checkpointed offsets.',
      'No event is skipped or double-processed — exactly-once end-to-end.',
    ],
  },
  {
    id: 'kafka-sink',
    label: 'Apache Kafka Sink',
    icon: '📤',
    type: 'Sink',
    color: '#FF6B35',
    desc: 'KafkaSink uses a two-phase commit (2PC) protocol tied to Flink checkpoints. Records are written to Kafka as part of an open transaction; the transaction is committed only when the checkpoint completes. Requires Kafka transactions (exactly-once) or at-least-once mode.',
    uber: 'Fraud alerts are written to "fraud-alerts" topic via KafkaSink with exactly-once. If a TaskManager crashes after writing but before checkpoint commit, the open Kafka transaction is aborted on restart and events are re-processed and re-written.',
    props: [
      { k: 'bootstrap.servers', v: 'kafka-prod:9092' },
      { k: 'topic', v: 'fraud-alerts' },
      { k: 'transactional.id.prefix', v: 'flink-fraud-sink' },
      { k: 'delivery.guarantee', v: 'EXACTLY_ONCE' },
    ],
    code: `from pyflink.datastream.connectors.kafka import (
    KafkaSink, KafkaRecordSerializationSchema, DeliveryGuarantee)

sink = (KafkaSink.builder()
    .set_bootstrap_servers("kafka-prod:9092")
    .set_record_serializer(
        KafkaRecordSerializationSchema.builder()
            .set_topic("fraud-alerts")
            .set_value_serialization_schema(SimpleStringSchema())
            .build())
    .set_delivery_guarantee(DeliveryGuarantee.EXACTLY_ONCE)
    .set_transactional_id_prefix("flink-fraud-sink")
    .set_property("transaction.timeout.ms", "900000")
    .build())

stream.sink_to(sink)`,
    exactly: [
      'KafkaSink opens a Kafka transaction at checkpoint start.',
      'Records are written inside the transaction (pre-committed).',
      'On checkpoint complete → commitTransaction(); on failure → abortTransaction().',
      'Downstream consumers must use isolation.level=read_committed to see only finalized data.',
    ],
  },
  {
    id: 'fs-sink',
    label: 'FileSink (S3 / HDFS)',
    icon: '🗂️',
    type: 'Sink',
    color: '#10b981',
    desc: 'FileSink writes to a distributed filesystem in rolling part-files. Files move through states: In-Progress → Pending → Finished. Only checkpoint-completed files are moved to Finished — safe for downstream readers.',
    uber: 'Uber writes raw GPS data to S3 for data lake analytics. FileSink with Parquet format, 1-hour rolling policy, checkpointed every 60s. Only files in "Finished" state are picked up by Spark/Presto jobs.',
    props: [
      { k: 'path', v: 's3://uber-datalake/gps-events/' },
      { k: 'format', v: 'ParquetAvroWriters' },
      { k: 'rollingPolicy', v: 'OnCheckpointRollingPolicy' },
      { k: 'bucketAssigner', v: 'DateTimeBucketAssigner (hourly)' },
    ],
    code: `from pyflink.datastream.connectors.file_system import (
    FileSink, RollingPolicy)
from pyflink.common.serialization import Encoder

file_sink = (FileSink
    .for_row_format("s3://uber-datalake/gps-events/",
                    Encoder.simple_string_encoder())
    .with_rolling_policy(RollingPolicy.on_checkpoint_rolling_policy())
    .build())

stream.sink_to(file_sink)
# Bulk/Parquet: FileSink.for_bulk_format(path, writer_factory)`,
    exactly: [
      'In-Progress files live in a .inprogress/ prefix, invisible to readers.',
      'On checkpoint → file becomes Pending (.pending/).',
      'On checkpoint complete notification → file moves to Finished (final path).',
      'On failure → restore: in-progress files are discarded, pending files re-checked.',
    ],
  },
  {
    id: 'jdbc-sink',
    label: 'JDBC Sink (PostgreSQL)',
    icon: '🗄️',
    type: 'Sink',
    color: '#8b5cf6',
    desc: 'JdbcSink writes records to any JDBC-compatible database using upsert or insert statements. At-least-once by default (exactly-once requires idempotent writes or a dedup key).',
    uber: 'Uber writes aggregated hourly trip counts per driver to PostgreSQL for the operations dashboard. JDBC sink with upsert-on-conflict, making writes idempotent.',
    props: [
      { k: 'url', v: 'jdbc:postgresql://pg-ops:5432/trips' },
      { k: 'driver', v: 'org.postgresql.Driver' },
      { k: 'statement', v: 'INSERT ... ON CONFLICT DO UPDATE' },
      { k: 'batchSize', v: '1000' },
    ],
    code: `from pyflink.datastream.connectors.jdbc import (
    JdbcSink, JdbcConnectionOptions, JdbcExecutionOptions)

jdbc_sink = JdbcSink.sink(
    "INSERT INTO driver_stats(driver_id, trip_count, updated_at) "
    "VALUES (?, ?, ?) ON CONFLICT (driver_id) "
    "DO UPDATE SET trip_count = EXCLUDED.trip_count, "
    "updated_at = EXCLUDED.updated_at",
    row_type_info,                       # Types.ROW_NAMED([...])
    JdbcExecutionOptions.builder().with_batch_size(1000).build(),
    JdbcConnectionOptions.JdbcConnectionOptionsBuilder()
        .with_url("jdbc:postgresql://pg-ops:5432/trips")
        .with_driver_name("org.postgresql.Driver")
        .build())

stream.add_sink(jdbc_sink)`,
    exactly: [
      'JdbcSink is at-least-once by default — retry on failure may duplicate inserts.',
      'Use ON CONFLICT DO UPDATE (upsert) with a natural key for idempotent exactly-once.',
      'Batch writes (batchSize=1000) amortize JDBC round-trip cost.',
      'For true exactly-once: use JdbcXaSink with XA transactions (requires DB support).',
    ],
  },
];

const IQS = [
  { q: 'How does Flink achieve exactly-once with Kafka source and sink together?', a: 'It uses a two-phase commit spanning both. On checkpoint trigger: Kafka source snapshots its partition offsets into checkpoint state; Kafka sink starts/opens a Kafka producer transaction. When all operators confirm barrier alignment, the checkpoint completes: Kafka source commits offsets to Kafka broker; Kafka sink calls commitTransaction() on the producer. On failure: source restores to checkpointed offsets (rewinds Kafka); sink calls abortTransaction() on the open transaction. No duplicate or lost events end-to-end.' },
  { q: 'What is the difference between at-least-once and exactly-once in Flink?', a: 'at-least-once: checkpoints capture source offsets; on failure Flink rewinds and replays. If the sink is not idempotent, replayed records produce duplicates. exactly-once: the sink participates in the checkpoint protocol (2PC for Kafka, file-state-machine for FileSink) so that re-processed records either replace or are de-duplicated at the sink. Exactly-once adds latency proportional to checkpoint interval and requires compatible sinks.' },
  { q: 'Why does FileSink have In-Progress → Pending → Finished states?', a: 'Because Flink needs to tolerate failures between writing and committing. In-Progress files are partial and unsafe to read. When an operator takes a checkpoint, it transitions the file to Pending — it\'s complete but not confirmed. Only when the JobManager confirms the checkpoint (all operators snapshotted) does the file move to Finished. If the job fails between Pending and Finished, the file is left pending and resolved on restart. This prevents readers from seeing partial files.' },
  { q: 'How does Flink distribute Kafka partitions across source subtasks?', a: 'The SplitEnumerator (KafkaEnumerator) discovers all partitions for the subscribed topics, divides them into KafkaPartitionSplit objects, and assigns them round-robin to SourceReader subtasks. With parallelism=4 and 16 partitions, each subtask gets 4 partitions. If topics are added or partitions increased at runtime, the enumerator detects new splits on the next partition-discovery interval and assigns them to readers.' },
  { q: 'What happens to open Kafka transactions if the job is cancelled?', a: 'Cancelled jobs trigger the Flink shutdown sequence: operators receive a finish() signal. KafkaSink\'s abort() method is called, which invokes kafkaProducer.abortTransaction(). This releases the Kafka transaction without committing, so no partial data is visible to downstream read_committed consumers. If the JVM is killed without graceful shutdown (kill -9), the Kafka transaction remains open until the transactional.timeout.ms expires (default 1 min) and Kafka auto-aborts it.' },
];

// ── "What & Why" foundations (additive) ──────────────────────────
const WHY_REASONS = [
  { icon: '🔌', title: 'Bridge two worlds', body: 'Flink computes in-memory, but data lives in Kafka, S3, databases. Connectors translate between Flink records and each system\'s wire format and API.' },
  { icon: '🧩', title: 'Split work in parallel', body: 'A <code>SplitEnumerator</code> divides Kafka\'s 1024 partitions into splits so 256 source subtasks each read ~4 — ingestion scales with parallelism.' },
  { icon: '🔖', title: 'Track position', body: 'A source remembers <em>where it stopped</em> (Kafka offsets) as part of checkpoint state, so a restart resumes exactly there — not from zero, not re-reading.' },
  { icon: '🔁', title: 'Replay on failure', body: 'Because the source can seek back to a checkpointed offset, Flink can re-process events after a crash — the foundation of fault tolerance.' },
  { icon: '🤝', title: 'Commit atomically', body: 'Sinks join the checkpoint via two-phase commit (Kafka) or a file state-machine (S3), so output is finalized only when the checkpoint does.' },
  { icon: '⏮️', title: 'Backpressure-aware', body: 'A slow sink naturally slows its source through Flink\'s credit-based flow — the connector never silently drops events to keep up.' },
];

const PROBLEMS = [
  { naive: 'Commit the Kafka offset as soon as an event is read.', fail: 'If the job crashes after committing but before the result is produced, that event is <b>lost</b> forever — the offset already moved past it.', fix: 'Commit offsets only <em>after</em> the checkpoint completes, so a restart rewinds to un-finalized events.' },
  { naive: 'Write each result straight to the output topic as it\'s computed.', fail: 'A replay after failure re-writes the same alerts — downstream sees <b>duplicates</b>.', fix: '<code>KafkaSink</code> writes inside a transaction committed with the checkpoint (exactly-once).' },
  { naive: 'Let readers see files the moment the sink opens them.', fail: 'Consumers read <b>half-written</b> part-files; a crash leaves corrupt partial data in the lake.', fix: '<code>FileSink</code> keeps files In-Progress → Pending → Finished; only checkpoint-committed files become visible.' },
  { naive: 'Insert every row into Postgres with a plain INSERT.', fail: 'At-least-once replay inserts the same row twice — <b>double-counted</b> dashboards.', fix: 'Upsert with <code>ON CONFLICT DO UPDATE</code> on a natural key makes writes idempotent.' },
];

const WHY_HTML = `
  <div class="sm-wrap">
    <div class="sm-def card">
      <div class="sm-def-ic">🔗</div>
      <div>
        <div class="sm-def-eyebrow">What are sources &amp; sinks?</div>
        <p class="sm-def-lead">A <b>source</b> reads events <em>into</em> a Flink job from the outside world; a <b>sink</b> writes results <em>out</em>. Together they're the <b>connectors</b> at the job's edges — and they're exactly where end-to-end <b>exactly-once</b> is won or lost. On ride <b>R-4471</b>, the source is Kafka topic <code>ride-events</code> and the sink is <code>fraud-alerts</code>.</p>
      </div>
    </div>

    <div class="sm-def card" style="margin:18px 0 6px;border-left:3px solid #6366f1">
      <div class="sm-def-ic">🧭</div>
      <div>
        <div class="sm-def-eyebrow">Scope &amp; related module</div>
        <p class="sm-def-lead" style="font-size:0.95rem">This module is the <b>source/sink contract</b> — how a source rewinds, how a sink commits, and how the two cooperate for exactly-once. For the full <b>connector catalog</b> (Kafka, S3/FileSystem, JDBC, Elasticsearch…) and how to <b>choose one by delivery guarantee</b>, see <a href="#m16" style="color:#6366f1;font-weight:600">Module 16 — Connectors →</a>.</p>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Source vs. Sink</div>
      <div class="section-desc">Two ends of the job, with mirror-image guarantees.</div>
    </div>
    <div class="sm-vs">
      <div class="sm-vs-card stateless">
        <div class="sm-vs-head">📥 Source</div>
        <p class="sm-vs-sub">Ingests an unbounded stream and tracks its read position.</p>
        <ul>
          <li>Splits partitions across subtasks</li>
          <li>Snapshots offsets into checkpoints</li>
          <li>On restart, <b>seeks back</b> and replays</li>
        </ul>
        <div class="sm-vs-note">Guarantee: no event is skipped — the source can always rewind.</div>
      </div>
      <div class="sm-vs-card stateful">
        <div class="sm-vs-head">📤 Sink</div>
        <p class="sm-vs-sub">Emits results and finalizes them atomically with the checkpoint.</p>
        <ul>
          <li>Two-phase commit (Kafka transactions)</li>
          <li>File state-machine (S3/HDFS)</li>
          <li>Idempotent upserts (JDBC)</li>
        </ul>
        <div class="sm-vs-note">Guarantee: output appears once — committed only when the checkpoint does.</div>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Why connectors are the hard part</div>
      <div class="section-desc">Six jobs a connector must do that a plain read/write loop can't.</div>
    </div>
    <div class="sm-why-grid">
      ${WHY_REASONS.map(r => `
        <div class="sm-why">
          <div class="sm-why-ic">${r.icon}</div>
          <div class="sm-why-title">${r.title}</div>
          <p>${r.body}</p>
        </div>
      `).join('')}
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">The problem connectors solve</div>
      <div class="section-desc">Four ways a naïve read/write loop loses or duplicates data — and the connector fix.</div>
    </div>
    <div class="sm-prob-list">
      ${PROBLEMS.map((p, i) => `
        <div class="sm-prob">
          <div class="sm-prob-no">${i + 1}</div>
          <div class="sm-prob-body">
            <div class="sm-prob-naive"><span class="sm-tag naive">Naïve</span>${p.naive}</div>
            <div class="sm-prob-fail"><span class="sm-tag fail">Breaks</span>${p.fail}</div>
            <div class="sm-prob-fix"><span class="sm-tag fix">Connector</span>${p.fix}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Exactly-once = source rewind + sink commit</div>
    </div>
    <div class="sm-keyed card">
      <p>Exactly-once isn't one feature — it's the source and sink <b>cooperating around the checkpoint</b>. Neither alone is enough.</p>
      <ul>
        <li><b>Source side</b> — offsets live in checkpoint state, so a restart rewinds Kafka to the last consistent point.</li>
        <li><b>Sink side</b> — results sit in an open transaction (or .pending file) until the checkpoint confirms, then commit atomically.</li>
        <li><b>Together</b> — replayed events either replace or dedupe at the sink, so downstream sees each result once.</li>
      </ul>
      <div class="sm-keyed-flow">
        <b>checkpoint start</b> <span class="sm-arrow">→</span> source snapshots offsets + sink opens txn <span class="sm-arrow">→</span> <code>barriers align</code> <span class="sm-arrow">→</span> <b>checkpoint complete</b> <span class="sm-arrow">→</span> commit offsets + commit txn
      </div>
    </div>

    <div class="sm-bridge" style="margin-top:26px">
      <div class="sm-bridge-txt">
        <div class="sm-bridge-k">Now wire up the real connectors</div>
        <p>You know <b>why</b> connectors are special — explore Kafka, FileSink, and JDBC with their config, PyFlink code, and the exactly-once protocol.</p>
      </div>
      <button class="sm-bridge-btn" data-jump="connectors">Open the Source/Sink Explorer →</button>
    </div>
  </div>
`;

export function mount(container) {
  let selectedConnector = CONNECTORS[0];
  let animRunning = false;
  let animOffset = 0;
  let animRaf = null;

  container.innerHTML = `
    ${rideSpine({ active: ['RIDE_REQUESTED', 'RIDE_COMPLETED', 'PAYMENT_COMPLETED'] })}
    <div class="module-hero">
      <div class="module-hero-content">
        <span class="module-badge">Module 7</span>
        <h1 class="module-title">Sources &amp; Sinks</h1>
        <p class="module-subtitle">How Flink connects to the outside world — Kafka exactly-once, FileSink state machine, and Uber's 1M events/sec ingestion pipeline.</p>
      </div>
    </div>
    <div class="module-tabs">
      <button class="tab-btn active" data-tab="why">What &amp; Why</button>
      <button class="tab-btn" data-tab="connectors">Source/Sink Explorer</button>
      <button class="tab-btn" data-tab="kafka-anim">Kafka Source Animation</button>
      <button class="tab-btn" data-tab="iq">Interview Q&amp;A</button>
    </div>

    <div class="tab-content active" data-tab="why">
      ${WHY_HTML}
    </div>

    <div class="tab-content" data-tab="connectors">
      ${rideCallout('RIDE_REQUESTED', { openEvent: false })}
      <div class="conn-picker" id="conn-picker"></div>
      <div id="conn-detail"></div>
    </div>

    <div class="tab-content" data-tab="kafka-anim">
      <div class="card" style="padding:24px;margin-bottom:20px">
        <h3 style="margin:0 0 8px">Kafka Source — Partition Assignment</h3>
        <p style="color:var(--text-secondary);margin:0 0 20px;font-size:14px">Each Flink source subtask owns a set of Kafka partitions. Events within a partition arrive in order; across partitions, watermarks align the streams.</p>
        <div class="scroll-x" id="kafka-svg-wrap"></div>
        <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap" id="kafka-anim-controls">
          <button class="btn btn-primary" id="kafka-play">▶ Animate Events</button>
          <button class="btn btn-secondary" id="kafka-reset">↺ Reset</button>
        </div>
      </div>
      <div class="card p-24">
        <h3 class="mb-12">Exactly-Once Offset Protocol</h3>
        <div class="timeline-steps" id="eo-steps"></div>
      </div>
    </div>

    <div class="tab-content" data-tab="iq">
      <div class="iq-section" id="iq7-section"></div>
    </div>
  `;

  initRideSpine(container);

  // Tabs
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`.tab-content[data-tab="${btn.dataset.tab}"]`).classList.add('active');
      if (btn.dataset.tab === 'kafka-anim') buildKafkaAnim(container);
    });
  });

  // Bridge button: jump from "What & Why" into the Connector Explorer tab.
  const jumpBtn = container.querySelector('[data-jump]');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      const target = jumpBtn.dataset.jump;
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === target));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === target));
      container.querySelector('.module-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // IQ
  const iqSection = container.querySelector('#iq7-section');
  iqSection.innerHTML = IQS.map((item, i) => `
    <div class="iq-item" id="iq7-${i}">
      <div class="iq-question" data-idx="${i}"><span>${item.q}</span><span class="iq-chevron">›</span></div>
      <div class="iq-answer">${item.a}</div>
    </div>
  `).join('');
  iqSection.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = iqSection.querySelector(`#iq7-${q.dataset.idx}`);
      const open = item.classList.contains('open');
      iqSection.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });

  // Connector picker
  const picker = container.querySelector('#conn-picker');
  picker.innerHTML = CONNECTORS.map(c => `
    <button class="op-pill${c.id === selectedConnector.id ? ' active' : ''}" data-cid="${c.id}" style="${c.id === selectedConnector.id ? `background:${c.color};border-color:${c.color}` : ''}">
      ${c.icon} ${c.label}
      <span class="op-pill-cat">${c.type}</span>
    </button>
  `).join('');

  function renderConnector(c) {
    container.querySelector('#conn-detail').innerHTML = `
      <div class="conn-card">
        <div class="conn-card-header" style="border-color:${c.color}">
          <span style="font-size:32px">${c.icon}</span>
          <div>
            <div style="font-size:20px;font-weight:700;color:${c.color}">${c.label}</div>
            <span class="badge" style="background:${c.color}22;color:${c.color};border:1px solid ${c.color}44">${c.type}</span>
          </div>
        </div>
        <div class="grid-2" style="gap:20px;margin-top:20px">
          <div>
            <p style="color:var(--text-secondary);line-height:1.7;margin:0 0 16px">${c.desc}</p>
            <div class="lc-uber-box">
              <div class="lc-uber-label">🚗 Uber Example</div>
              <p style="font-size:13px">${c.uber}</p>
            </div>
            <div class="mt-16">
              <div class="section-eyebrow">Exactly-Once Protocol</div>
              ${c.exactly.map((s, i) => `<div style="display:flex;gap:10px;margin-bottom:8px;font-size:13px;color:var(--text-secondary)"><span style="color:${c.color};font-weight:700;flex-shrink:0">${i + 1}.</span><span>${s}</span></div>`).join('')}
            </div>
          </div>
          <div>
            <div class="section-eyebrow">Configuration</div>
            <div class="conn-props-table">
              ${c.props.map(p => `
                <div class="conn-prop-row">
                  <span class="conn-prop-key">${p.k}</span>
                  <span class="conn-prop-val">${p.v}</span>
                </div>
              `).join('')}
            </div>
            <div class="code-block" style="margin-top:16px;font-size:11px;max-height:300px;overflow-y:auto"><span class="lang-tag">PyFlink</span><pre>${c.code}</pre></div>
          </div>
        </div>
      </div>
    `;
  }

  picker.querySelectorAll('.op-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedConnector = CONNECTORS.find(c => c.id === btn.dataset.cid);
      picker.querySelectorAll('.op-pill').forEach(b => {
        b.classList.remove('active');
        b.style.background = '';
        b.style.borderColor = '';
        b.style.color = '';
      });
      btn.classList.add('active');
      btn.style.background = selectedConnector.color;
      btn.style.borderColor = selectedConnector.color;
      btn.style.color = '#fff';
      renderConnector(selectedConnector);
    });
  });

  renderConnector(selectedConnector);
  buildKafkaAnim(container);
}

function buildKafkaAnim(container) {
  const wrap = container.querySelector('#kafka-svg-wrap');
  if (!wrap) return;

  const W = 720, H = 280;
  const PART_X = [60, 60, 60, 60];
  const PART_Y = [40, 100, 160, 220];
  const SUB_X = [560, 560, 560, 560];
  const SUB_Y = PART_Y;
  const partColors = TM_COLORS;

  let dots = [];
  let animId = null;

  function drawStatic() {
    let s = `<svg id="kafka-svg" width="${W}" height="${H}" style="font-family:var(--font-sans,sans-serif);min-width:${W}px">`;
    // Kafka partitions
    s += `<text x="80" y="20" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-secondary)">Kafka Topic</text>`;
    KAFKA_PARTITIONS.forEach((p, i) => {
      s += `<rect x="30" y="${PART_Y[i] - 14}" width="100" height="24" rx="5" fill="${partColors[i]}22" stroke="${partColors[i]}" stroke-width="1.5"/>`;
      s += `<text x="80" y="${PART_Y[i] + 4}" text-anchor="middle" font-size="10.5" fill="${partColors[i]}">Partition ${p}</text>`;
    });

    // Flink source subtasks
    s += `<text x="620" y="20" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-secondary)">Flink Source Subtasks</text>`;
    KAFKA_PARTITIONS.forEach((p, i) => {
      s += `<rect x="570" y="${SUB_Y[i] - 14}" width="110" height="24" rx="5" fill="${partColors[i]}22" stroke="${partColors[i]}" stroke-width="1.5"/>`;
      s += `<text x="625" y="${SUB_Y[i] + 4}" text-anchor="middle" font-size="10" fill="${partColors[i]}">Subtask[${i}] • ${DRIVER_GROUPS[i]}</text>`;
    });

    // Connector lines (dashed static arrows)
    KAFKA_PARTITIONS.forEach((p, i) => {
      s += `<line x1="135" y1="${PART_Y[i]}" x2="565" y2="${SUB_Y[i]}" stroke="${partColors[i]}" stroke-width="1" stroke-dasharray="6,4" opacity="0.4"/>`;
    });

    // Animated dots group
    s += `<g id="kafka-dots"></g>`;
    s += `</svg>`;
    wrap.innerHTML = s;
  }

  drawStatic();

  // Exactly-once steps
  const eoSteps = container.querySelector('#eo-steps');
  if (eoSteps) {
    const steps = [
      { icon: '1', label: 'Checkpoint triggered', desc: 'CheckpointCoordinator injects barriers into Kafka source subtasks.' },
      { icon: '2', label: 'Offsets snapshotted', desc: 'Each source subtask records its current Kafka partition offsets into the checkpoint.' },
      { icon: '3', label: 'Barriers propagate', desc: 'Barriers flow downstream through operators; each operator snapshots state.' },
      { icon: '4', label: 'Checkpoint completes', desc: 'JobManager confirms all operators have checkpointed successfully.' },
      { icon: '5', label: 'Offsets committed', desc: 'Source subtasks commit offsets to Kafka broker. Sink commits open transactions.' },
      { icon: '↺', label: 'On failure', desc: 'Source restores to checkpointed offsets. Kafka seeks backward. Replayed events re-written within new transactions.' },
    ];
    eoSteps.innerHTML = steps.map(s => `
      <div style="display:flex;gap:14px;margin-bottom:16px">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${s.icon}</div>
        <div>
          <div style="font-weight:600;color:var(--text);margin-bottom:2px;font-size:13.5px">${s.label}</div>
          <div style="color:var(--text-secondary);font-size:13px">${s.desc}</div>
        </div>
      </div>
    `).join('');
  }

  // Animation
  const playBtn = container.querySelector('#kafka-play');
  const resetBtn = container.querySelector('#kafka-reset');
  if (!playBtn) return;

  let running = false;
  let t = 0;

  function step() {
    const svg = wrap.querySelector('#kafka-svg');
    if (!svg) return;
    const dotsG = svg.querySelector('#kafka-dots');
    if (!dotsG) return;

    t += 2;
    dotsG.innerHTML = KAFKA_PARTITIONS.map((p, i) => {
      const progress = ((t + i * 30) % 200) / 200;
      const x = 135 + (565 - 135) * progress;
      const y = PART_Y[i] + (SUB_Y[i] - PART_Y[i]) * progress;
      return `<circle cx="${x}" cy="${y}" r="5" fill="${partColors[i]}" opacity="${1 - progress * 0.3}"/>`;
    }).join('');

    if (running) animId = requestAnimationFrame(step);
  }

  playBtn.addEventListener('click', () => {
    if (running) {
      running = false;
      cancelAnimationFrame(animId);
      playBtn.textContent = '▶ Animate Events';
    } else {
      running = true;
      playBtn.textContent = '⏸ Pause';
      step();
    }
  });

  resetBtn.addEventListener('click', () => {
    running = false;
    cancelAnimationFrame(animId);
    playBtn.textContent = '▶ Animate Events';
    t = 0;
    const svg = wrap.querySelector('#kafka-svg');
    if (svg) { const g = svg.querySelector('#kafka-dots'); if (g) g.innerHTML = ''; }
  });
}
