// Module 16 — Connectors
// Connector ecosystem explorer: click a connector card to see
// config, code, delivery guarantee, and Uber use case.

import { rideSpine, initRideSpine, rideCallout, scenarioList } from '../components/story-ui.js';
import { casesByModule } from '../data/interview-cases.js';

const CONNECTORS = [
  {
    id:'kafka',     label:'Apache Kafka',   icon:'📨', badge:'Source + Sink', color:'#6366f1',
    guarantee:'Exactly-Once',
    desc:'Flink\'s primary streaming connector. KafkaSource uses the new unified Source API with SplitEnumerator. KafkaSink uses a two-phase commit (2PC) protocol for exactly-once output.',
    uber:'1M GPS events/sec from "driver-locations" topic. 1024 partitions, 256 source subtasks (4 partitions each). Fraud alerts written to "fraud-alerts" with exactly-once.',
    config:`'connector'   = 'kafka'
'topic'       = 'driver-locations'
'properties.bootstrap.servers' = 'kafka:9092'
'format'      = 'json'
'scan.startup.mode' = 'latest-offset'`,
    code:`from pyflink.datastream.connectors.kafka import (
    KafkaSource, KafkaOffsetsInitializer)
from pyflink.common.serialization import SimpleStringSchema

source = (KafkaSource.builder()
    .set_bootstrap_servers("kafka:9092")
    .set_topics("driver-locations")
    .set_group_id("flink-fraud")
    .set_starting_offsets(KafkaOffsetsInitializer.committed_offsets())
    .set_value_only_deserializer(SimpleStringSchema())
    .build())`,
  },
  {
    id:'filesystem', label:'FileSystem / S3', icon:'🗂️', badge:'Source + Sink', color:'#10b981',
    guarantee:'Exactly-Once',
    desc:'FileSink writes in rolling part-files (in-progress → pending → finished) tied to checkpoints. Supports Parquet, Avro, ORC, CSV. FileSource reads bounded or continuous files.',
    uber:'Raw GPS events written to S3 in Parquet format, hourly partitioned. Consumed by Spark/Presto for data lake analytics. Only "finished" files are visible to readers.',
    config:`'connector'  = 'filesystem'
'path'       = 's3://uber-datalake/gps/'
'format'     = 'parquet'
'sink.rolling-policy.rollover-interval' = '1h'`,
    code:`from pyflink.datastream.connectors.file_system import (
    FileSink, RollingPolicy)
from pyflink.common.serialization import Encoder

sink = (FileSink
    .for_row_format("s3://uber-datalake/gps/",
                    Encoder.simple_string_encoder())
    .with_rolling_policy(RollingPolicy.on_checkpoint_rolling_policy())
    .build())
stream.sink_to(sink)
# Parquet bulk: FileSink.for_bulk_format(path, writer_factory)`,
  },
  {
    id:'jdbc',       label:'JDBC (PostgreSQL)', icon:'🗄️', badge:'Source + Sink', color:'#8b5cf6',
    guarantee:'At-Least-Once (Exactly-Once w/ upsert)',
    desc:'JdbcSink writes in batches using JDBC PreparedStatements. At-least-once by default; use ON CONFLICT DO UPDATE for idempotent upserts. JdbcSource reads from tables for batch lookups.',
    uber:'Aggregated hourly driver stats (trip count, earnings) upserted into PostgreSQL for the Ops Dashboard. Batch size 1000, flush interval 1s.',
    config:`url      = 'jdbc:postgresql://pg:5432/trips'
driver   = 'org.postgresql.Driver'
username = 'flink'
password = '***'
table-name = 'driver_stats'`,
    code:`from pyflink.datastream.connectors.jdbc import (
    JdbcSink, JdbcConnectionOptions, JdbcExecutionOptions)

sink = JdbcSink.sink(
    "INSERT INTO driver_stats(driver_id, trips, updated_at) "
    "VALUES (?, ?, ?) ON CONFLICT (driver_id) "
    "DO UPDATE SET trips = EXCLUDED.trips, "
    "updated_at = EXCLUDED.updated_at",
    row_type_info,                       # Types.ROW_NAMED([...])
    JdbcExecutionOptions.builder().with_batch_size(1000).build(),
    JdbcConnectionOptions.JdbcConnectionOptionsBuilder()
        .with_url("jdbc:postgresql://pg:5432/trips")
        .with_driver_name("org.postgresql.Driver")
        .build())
stream.add_sink(sink)`,
  },
  {
    id:'hudi',       label:'Apache Hudi (S3)', icon:'🏔️', badge:'Sink',         color:'#f59e0b',
    guarantee:'Exactly-Once (UPSERT)',
    desc:'Hudi enables UPSERT semantics on the data lake — Flink writes change streams and Hudi merges them with snapshot data. Enables near-real-time analytics with compaction.',
    uber:'Driver profile change events (CDC from MySQL) written to Hudi on S3. Presto can query the latest snapshot; historical time-travel queries also supported.',
    config:`'connector'       = 'hudi'
'path'           = 's3://uber-hudi/driver_profiles/'
'table.type'     = 'MERGE_ON_READ'
'write.operation' = 'upsert'
'hoodie.datasource.write.recordkey.field' = 'driver_id'`,
    code:`// Flink SQL DDL:
CREATE TABLE driver_profiles_hudi (
  driver_id STRING PRIMARY KEY NOT ENFORCED,
  tier      STRING,
  updated   TIMESTAMP(3)
) WITH (
  'connector'  = 'hudi',
  'path'       = 's3://uber-hudi/driver_profiles/',
  'table.type' = 'MERGE_ON_READ',
  'write.operation' = 'upsert'
);
INSERT INTO driver_profiles_hudi
SELECT driver_id, tier, NOW() FROM cdc_stream;`,
  },
  {
    id:'iceberg',    label:'Apache Iceberg',   icon:'🧊', badge:'Source + Sink', color:'#3b82f6',
    guarantee:'Exactly-Once',
    desc:'Iceberg is a high-performance table format for huge analytic datasets. Flink writes to Iceberg tables atomically; commits are tied to checkpoints. Supports schema evolution and time travel.',
    uber:'GPS event aggregations written to Iceberg tables on S3. Schema evolution (adding new fields) happens without downtime. Spark reads the same tables for ML training.',
    config:`'connector'       = 'iceberg'
'catalog-name'   = 'uber_catalog'
'catalog-type'   = 'hadoop'
'warehouse'      = 's3://uber-iceberg/'
'format-version' = '2'`,
    code:`# PyFlink Table API — Flink-Iceberg catalog integration:
t_env.execute_sql("""
  CREATE CATALOG uber_catalog WITH (
    'type'         = 'iceberg',
    'catalog-type' = 'hadoop',
    'warehouse'    = 's3://uber-iceberg/'
  )
""")
t_env.execute_sql("""
  INSERT INTO uber_catalog.gps_db.gps_agg
  SELECT driver_id, window_start, avg_speed FROM ...
""")`,
  },
  {
    id:'datagen',    label:'DataGen (Testing)', icon:'🎲', badge:'Source',       color:'#ec4899',
    guarantee:'N/A',
    desc:'DataGen creates a bounded or unbounded synthetic stream for testing and development — no external system needed. Configurable throughput, field ranges, and patterns.',
    uber:'Used in Flink local-mode unit tests and load testing. Generates 1M synthetic GPS events/sec to test FraudDetector throughput before production deploy.',
    config:`'connector'      = 'datagen'
'rows-per-second' = '1000000'
'fields.driver_id.kind'   = 'random'
'fields.driver_id.length' = '8'
'fields.speed_kmh.kind'   = 'random'
'fields.speed_kmh.min'    = '0'
'fields.speed_kmh.max'    = '200'`,
    code:`// Flink SQL DDL for load testing:
CREATE TABLE gps_events_gen (
  driver_id  STRING,
  speed_kmh  INT,
  lat        DOUBLE,
  lon        DOUBLE,
  event_time TIMESTAMP(3),
  WATERMARK FOR event_time AS event_time
) WITH (
  'connector'       = 'datagen',
  'rows-per-second' = '1000000',
  'fields.speed_kmh.min' = '0',
  'fields.speed_kmh.max' = '200'
);`,
  },
];

const IQS = [
  { q:'How does Flink\'s unified Source API differ from the old SourceFunction?', a:'The old SourceFunction was a single-threaded interface that mixed split discovery, record emission, and watermark generation. The new Source API (Flink 1.12+) separates concerns: SplitEnumerator runs on the JobManager and assigns splits (e.g., Kafka partitions) to SourceReaders; SourceReaders run on TaskManagers and consume their assigned splits. This makes split reassignment on failure cleaner and enables dynamic split discovery (new Kafka partitions appearing at runtime).' },
  { q:'What connectors support exactly-once semantics with Flink checkpoints?', a:'Exactly-once requires both source and sink to participate in the checkpoint protocol. Sources: KafkaSource (offsets snapshotted), FileSource (position snapshotted). Sinks: KafkaSink (2PC via Kafka transactions), FileSink (in-progress/pending/finished state machine), HudiSink (atomic commit on checkpoint), IcebergSink (atomic commit on checkpoint). JDBC requires upsert semantics for idempotent exactly-once. PrintSink, BlackholeSink, and most custom sinks are at-most-once.' },
  { q:'How do you handle schema evolution with Flink connectors?', a:'Different connectors handle this differently. Avro-based connectors (Kafka with Schema Registry) use schema compatibility rules (BACKWARD, FORWARD, FULL). Iceberg supports adding/renaming/widening columns without rewrite. Flink SQL DDL columns can be evolved by altering the table definition if the connector supports it. For Flink jobs, schema changes often require a savepoint → code change → restore workflow. Uber uses Protobuf with proto3 field defaults to make GPS event schemas forward-compatible.' },
  { q:'How would you connect Flink to a REST API for enrichment?', a:'Use AsyncDataStream with AsyncFunction — it issues non-blocking HTTP calls, typically 100–1000 concurrent requests in flight, with timeout handling. The async operator preserves watermarks and ordering. Example: enrich GPS pings with driver tier from an internal REST service. Alternatively, use a lookup join in Flink SQL against a JDBC or cached lookup connector — Flink batches and caches the lookup results with a configurable TTL.' },
  { q:'What is a CDC (Change Data Capture) source and how does Flink use it?', a:'CDC sources (Debezium, Maxwell) capture every INSERT/UPDATE/DELETE from a database changelog (MySQL binlog, PostgreSQL WAL) as a Flink ChangelogStream. Flink SQL treats this as a dynamic table with full changelog semantics. Flink-CDC (open source project) provides native Flink source connectors for MySQL, PostgreSQL, MongoDB, Oracle. Uber uses MySQL CDC to stream driver profile changes into Flink for enriching GPS events with up-to-date driver metadata.' },
];

// ── "What & Why" foundations (additive) ──────────────────────────
const WHY_REASONS = [
  { icon: '🔌', title: 'Flink stores nothing', body: 'Flink is a compute engine — all data lives elsewhere. Connectors are the <em>only</em> way events get in and results get out.' },
  { icon: '🧩', title: 'One API, many systems', body: 'The unified Source/Sink API means Kafka, S3, JDBC, Hudi, and Iceberg all plug in the same way — learn once, swap freely.' },
  { icon: '🎖️', title: 'Delivery guarantees', body: 'Each connector declares exactly-once, at-least-once, or at-most-once — the guarantee is a property of the connector, not a wish.' },
  { icon: '🧬', title: 'Format & schema handling', body: 'Connectors (de)serialize JSON, Avro, Parquet, Protobuf and apply schema-evolution rules so the stream stays readable as fields change.' },
  { icon: '🪝', title: 'CDC & lookups', body: 'CDC connectors turn a database binlog into a changelog stream; lookup connectors enrich events against a table — no custom glue code.' },
  { icon: '🧪', title: 'Test without infra', body: 'The DataGen connector synthesizes a stream so you can load-test FraudDetector at 1M/s with no real Kafka.' },
];

const PROBLEMS = [
  { naive: 'Hand-write a Kafka consumer loop inside an operator.', fail: 'You re-implement offset tracking, parallelism, and failure replay — <b>badly</b>, and break exactly-once.', fix: 'The Kafka connector snapshots offsets into checkpoints and rewinds on restart, for free.' },
  { naive: 'Pick any sink and assume output is correct.', fail: 'A non-transactional sink <b>duplicates</b> rows on replay — silent data corruption downstream.', fix: 'Choose a connector whose declared guarantee (2PC, upsert) matches your correctness need.' },
  { naive: 'Parse the raw bytes yourself in a map().', fail: 'A schema change (new field) <b>breaks parsing</b> across the whole job at once.', fix: 'Format-aware connectors apply compatibility rules (Avro/Protobuf, Iceberg evolution).' },
  { naive: 'Poll a database per event for enrichment.', fail: 'Synchronous per-event lookups <b>throttle throughput</b> to the DB\'s latency.', fix: 'Lookup/CDC connectors batch, cache, or stream the dimension data efficiently.' },
];

const WHY_HTML = `
  <div class="sm-wrap">
    <div class="sm-def card">
      <div class="sm-def-ic">🔗</div>
      <div>
        <div class="sm-def-eyebrow">What is a connector?</div>
        <p class="sm-def-lead">A <b>connector</b> is a pluggable integration that lets Flink read from or write to an external system — Kafka, S3, a database, a lake table. Because Flink <em>stores nothing itself</em>, connectors are the whole boundary between the compute engine and the data. Each one carries a <b>delivery guarantee</b> and knows how to (de)serialize a format. On ride <b>R-4471</b>, connectors move GPS events in from Kafka and push results out to alerts, dashboards, and the data lake.</p>
      </div>
    </div>

    <div class="sm-def card" style="margin:18px 0 6px;border-left:3px solid #FF6B35">
      <div class="sm-def-ic">🧭</div>
      <div>
        <div class="sm-def-eyebrow">Scope &amp; related module</div>
        <p class="sm-def-lead" style="font-size:0.95rem">This module is the <b>connector catalog</b> — the ecosystem of systems Flink reaches and how to <b>pick one by delivery guarantee</b>. For the deep <b>source/sink contract</b> (offset rewind, two-phase sink commit) and the Kafka source internals with a live animation, see <a href="#m07" style="color:#FF6B35;font-weight:600">Module 7 — Sources &amp; Sinks →</a>.</p>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Why the ecosystem matters</div>
      <div class="section-desc">A compute engine is only as useful as the systems it can reach.</div>
    </div>
    <div class="sm-vs">
      <div class="sm-vs-card stateless">
        <div class="sm-vs-head">❌ Custom glue per system</div>
        <p class="sm-vs-sub">Hand-roll each integration.</p>
        <ul>
          <li>Re-implement offsets, replay, batching</li>
          <li>Guarantees are accidental</li>
          <li>Every system is a new project</li>
        </ul>
        <div class="sm-vs-note">Most bugs live in the hand-written glue.</div>
      </div>
      <div class="sm-vs-card stateful">
        <div class="sm-vs-head">✅ Pluggable connectors</div>
        <p class="sm-vs-sub">One API, many battle-tested plugins.</p>
        <ul>
          <li>Offsets &amp; replay handled for you</li>
          <li>Declared delivery guarantee</li>
          <li>Swap Kafka↔Iceberg with config</li>
        </ul>
        <div class="sm-vs-note">Integration becomes configuration, not code.</div>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">What connectors give you</div>
      <div class="section-desc">Six jobs the connector layer handles so your job doesn't.</div>
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
      <div class="section-desc">Four ways rolling your own integration breaks — and the fix.</div>
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
      <div class="section-title">How to pick one: delivery guarantee</div>
    </div>
    <div class="sm-keyed card">
      <p>The first question for any connector is <b>what guarantee does it give</b> — it decides whether your output can be trusted after a failure.</p>
      <ul>
        <li><b>Exactly-once</b> — Kafka (2PC), FileSink, Hudi, Iceberg: each result appears once even through replay.</li>
        <li><b>At-least-once</b> — JDBC by default: results may duplicate unless you add an idempotent upsert.</li>
        <li><b>At-most-once</b> — Print/Blackhole and most custom sinks: fine for debugging, never for money.</li>
      </ul>
      <div class="sm-keyed-flow">
        need correctness? <span class="sm-arrow">→</span> <b>exactly-once</b> connector <span class="sm-arrow">→</span> or at-least-once <b>+ idempotent upsert</b> <span class="sm-arrow">→</span> match format &amp; schema rules <span class="sm-arrow">→</span> configure, don't code
      </div>
    </div>

    <div class="sm-bridge" style="margin-top:26px">
      <div class="sm-bridge-txt">
        <div class="sm-bridge-k">Now browse the ecosystem</div>
        <p>You know <b>why</b> connectors exist and how to pick one — explore Kafka, S3, JDBC, Hudi, Iceberg, and DataGen with their config, code, and guarantee.</p>
      </div>
      <button class="sm-bridge-btn" data-jump="explorer">Open the Connector Explorer →</button>
    </div>
  </div>
`;

export function mount(container) {
  let selected = CONNECTORS[0];

  container.innerHTML = `
    ${rideSpine({ active: ['RIDE_REQUESTED', 'PAYMENT_COMPLETED'], incidents: ['DEFECT-5'] })}
    <div class="module-hero">
      <div class="module-hero-content">
        <span class="module-badge">Module 16</span>
        <h1 class="module-title">Connectors</h1>
        <p class="module-subtitle">Kafka, S3, JDBC, Hudi, Iceberg — click any connector to see its config, code, delivery guarantee, and how Uber uses it at scale.</p>
      </div>
    </div>
    <div class="module-tabs">
      <button class="tab-btn active" data-tab="why">What &amp; Why</button>
      <button class="tab-btn" data-tab="explorer">Connector Explorer</button>
      <button class="tab-btn" data-tab="iq">Interview Q&amp;A</button>
    </div>

    <div class="tab-content active" data-tab="why">
      ${WHY_HTML}
    </div>

    <div class="tab-content" data-tab="explorer">
      ${rideCallout('PAYMENT_COMPLETED', { openEvent: false })}
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;padding:20px 28px 0" id="conn16-picker"></div>
      <div id="conn16-detail" style="padding:20px 28px 28px"></div>
    </div>

    <div class="tab-content" data-tab="iq">
      <div class="section-header" style="margin-bottom:8px">
        <div class="section-title">Interview corner cases — on ride R-4471</div>
        <div class="section-desc">Exactly-once sink &amp; offset-commit questions, anchored to the payment retry (DEFECT-5).</div>
      </div>
      <div id="conn-scenarios"></div>
      <div class="section-header" style="margin:22px 0 8px"><div class="section-title">More connector Q&amp;A</div></div>
      <div class="iq-section" id="iq16-section"></div>
    </div>
  `;

  initRideSpine(container);
  const connScen = container.querySelector('#conn-scenarios');
  if (connScen) connScen.innerHTML = scenarioList(casesByModule('m16'));

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`.tab-content[data-tab="${btn.dataset.tab}"]`).classList.add('active');
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

  const iqSec = container.querySelector('#iq16-section');
  iqSec.innerHTML = IQS.map((item, i) => `
    <div class="iq-item" id="iq16-${i}">
      <div class="iq-question" data-idx="${i}"><span>${item.q}</span><span class="iq-chevron">›</span></div>
      <div class="iq-answer">${item.a}</div>
    </div>
  `).join('');
  iqSec.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = iqSec.querySelector(`#iq16-${q.dataset.idx}`);
      const open = item.classList.contains('open');
      iqSec.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });

  const picker = container.querySelector('#conn16-picker');
  picker.innerHTML = CONNECTORS.map(c => `
    <button class="conn16-card${c.id === selected.id ? ' active' : ''}" data-cid="${c.id}" style="border-color:${c.id === selected.id ? c.color : 'var(--border)'}">
      <span class="fs-28">${c.icon}</span>
      <div style="font-size:12px;font-weight:600;color:var(--text);margin-top:6px">${c.label}</div>
      <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:${c.color}22;color:${c.color};margin-top:4px;display:inline-block">${c.badge}</span>
    </button>
  `).join('');

  function renderDetail(c) {
    container.querySelector('#conn16-detail').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card" style="padding:24px;border-left:4px solid ${c.color}">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
            <span class="fs-36">${c.icon}</span>
            <div>
              <div style="font-size:19px;font-weight:700;color:${c.color}">${c.label}</div>
              <div style="font-size:11px;margin-top:4px"><span class="badge" style="background:${c.color}22;color:${c.color};border:1px solid ${c.color}44">${c.badge}</span> &nbsp; <span class="badge" style="background:var(--surface2)">${c.guarantee}</span></div>
            </div>
          </div>
          <p style="color:var(--text-secondary);font-size:13.5px;line-height:1.7;margin:0 0 14px">${c.desc}</p>
          <div class="lc-uber-box">
            <div class="lc-uber-label">🚗 Uber Use Case</div>
            <p class="fs-125">${c.uber}</p>
          </div>
        </div>
        <div>
          <div class="eyebrow">SQL / DDL Config</div>
          <div class="code-block" style="font-size:11px;margin-bottom:16px"><pre>${c.config}</pre></div>
          <div class="eyebrow">Java / SQL Code</div>
          <div class="code-block" style="font-size:11px;max-height:280px;overflow-y:auto"><pre>${c.code}</pre></div>
        </div>
      </div>
    `;
  }

  picker.querySelectorAll('.conn16-card').forEach(btn => {
    btn.addEventListener('click', () => {
      selected = CONNECTORS.find(c => c.id === btn.dataset.cid);
      picker.querySelectorAll('.conn16-card').forEach(b => { b.classList.remove('active'); b.style.borderColor = 'var(--border)'; });
      btn.classList.add('active'); btn.style.borderColor = selected.color;
      renderDetail(selected);
    });
  });

  renderDetail(selected);
}
